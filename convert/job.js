(() => {
  "use strict";

  const params = new URLSearchParams(window.location.hash.slice(1));
  const config = window.CAD_CONVERTER_CONFIG || {};
  const jobId = params.get("job") || "";
  const statusToken = params.get("token") || "";
  const endpointValue = params.get("endpoint") || "";
  const reference = document.querySelector("#jobReference");
  const statusBox = document.querySelector("#jobStatus");
  const target = document.querySelector("#jobTarget");
  const expiry = document.querySelector("#jobExpiry");
  const remaining = document.querySelector("#downloadRemaining");
  const downloadButton = document.querySelector("#downloadButton");
  const copyButton = document.querySelector("#copyLink");
  const progressBox = document.querySelector("#jobProgress");
  const progressTitle = document.querySelector("#progressTitle");
  const progressPercent = document.querySelector("#progressPercent");
  const progressTrack = progressBox.querySelector(".progress-track");
  const progressFill = document.querySelector("#progressFill");
  const progressElapsed = document.querySelector("#progressElapsed");
  const progressEta = document.querySelector("#progressEta");
  let statusEndpoint;
  let pollTimer;
  let clockTimer;
  let createdAtMs;
  let currentProgress;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function formatElapsed(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    if (safeSeconds < 60) return `${safeSeconds} 秒`;
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分鐘`;
  }

  function etaCopy(progress) {
    const eta = Number(progress?.estimated_remaining_seconds);
    const updatedAt = Date.parse(progress?.updated_at || "");
    if (!Number.isFinite(eta) || eta <= 0) return "即將完成";
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > eta * 1500) {
      return "此階段比平常久，仍持續驗證中";
    }
    if (eta >= 120) return "預估尚需約 2–3 分鐘";
    if (eta >= 60) return "預估尚需約 1–2 分鐘";
    return "預估尚需少於 1 分鐘";
  }

  function updateClock() {
    if (!currentProgress || !Number.isFinite(createdAtMs)) return;
    progressElapsed.textContent = `已等待 ${formatElapsed((Date.now() - createdAtMs) / 1000)}`;
    progressEta.textContent = etaCopy(currentProgress);
  }

  function renderProgress(data) {
    const active = ["PENDING", "RUNNING"].includes(data.state);
    const complete = data.state === "SUCCEEDED";
    if (!active && !complete) {
      progressBox.hidden = true;
      return;
    }
    const fallback = complete
      ? { percent: 100, label: "成果已準備完成", estimated_remaining_seconds: 0 }
      : { percent: data.state === "PENDING" ? 5 : 10, label: "正在準備安全處理", estimated_remaining_seconds: 180 };
    currentProgress = data.progress || fallback;
    createdAtMs = Date.parse(data.created_at || "");
    const percent = Math.max(0, Math.min(100, Number(currentProgress.percent) || 0));
    progressBox.hidden = false;
    progressBox.classList.toggle("is-active", active);
    progressBox.classList.toggle("is-complete", complete);
    progressTitle.textContent = currentProgress.label || "正在處理";
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    progressTrack.setAttribute("aria-valuenow", String(percent));
    if (complete) {
      const completedAtMs = Date.parse(data.state_updated_at || "");
      const duration = Number.isFinite(completedAtMs) && Number.isFinite(createdAtMs)
        ? (completedAtMs - createdAtMs) / 1000
        : 0;
      progressElapsed.textContent = `總處理時間 ${formatElapsed(duration)}`;
      progressEta.textContent = "已完成";
      if (clockTimer) window.clearInterval(clockTimer);
      clockTimer = undefined;
    } else {
      updateClock();
      if (!clockTimer) clockTimer = window.setInterval(updateClock, 1000);
    }
  }

  function friendlyError(error, fallback) {
    const message = String(error?.message || "");
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "目前無法連線到測試主機，請稍後重新整理頁面。";
    }
    const code = message.replace(/[^A-Z0-9_\-]/gi, "").toUpperCase().slice(0, 64);
    const messages = {
      JOB_NOT_FOUND: "私密連結無效、已到期，或工作不存在。",
      JOB_EXPIRED: "保存期限已到，原檔、成果與下載權限均已刪除。",
      DOWNLOAD_LIMIT_REACHED: "此工作的下載重新簽發次數已用完。",
      DOWNLOAD_DENIED: "下載票券無效或已使用，請重新取得一次性票券。",
      RESULT_NOT_READY: "成果仍在驗證中，請稍後再試。",
    };
    return messages[code] || fallback;
  }

  function endpointAllowed(url) {
    const configured = new Set(config.jobApiOrigins || []);
    return configured.has(url.origin)
      || (url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname));
  }

  function fail(title, detail) {
    statusBox.innerHTML = `<p class="status-label">無法查詢</p><h2>${title}</h2><p>${detail}</p>`;
    downloadButton.hidden = true;
    if (pollTimer) window.clearTimeout(pollTimer);
    progressBox.hidden = true;
    if (clockTimer) window.clearInterval(clockTimer);
    clockTimer = undefined;
  }

  function renderStatus(data) {
    reference.textContent = `CAD-${data.reference}`;
    target.textContent = data.target === "R2000_ACI"
      ? "DXF R2000（已同意 ACI 近似色）"
      : `DXF ${data.target}`;
    expiry.textContent = new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.expires_at));
    remaining.textContent = String(data.download?.remaining ?? 0);
    const failureDetails = {
      R2000_TRUECOLOR_OR_GRADIENT_UNSUPPORTED: "原圖含 R2000 無法無損保存的 True Color 或漸層填色；系統沒有擅自改色，因此停止交付。",
      BATCH_NOT_SUPPORTED: "這個壓縮包目前無法辨識主圖或必要依賴。",
      VALIDATION_NOT_PASSED: "圖面未通過其中一項安全、結構或視覺一致性驗證。",
      DECODER_FAILED: "DWG 解碼後的 DXF 控制結構不完整；系統未交付可能損壞的成果。",
      FAIL_CLOSED_LIBREDWG_DWGREAD_FAILED: "主要與備援 LibreDWG 解碼程序皆未能產生可用成果。",
      FAIL_CLOSED_LIBREDWG_DWGREAD_PARSE_FAILED: "備援 LibreDWG 已產生資料，但仍無法建立安全、完整的 DXF 結構。",
      DXF_STRUCTURE_BINARY_NUL: "解碼結果不是可安全解析的 ASCII DXF。",
      DXF_STRUCTURE_ODD_LINE_COUNT: "DXF group code 與資料列無法完整配對。",
      DXF_STRUCTURE_GROUP_CODE_INVALID: "DXF 含無法辨識的 group code。",
      DXF_STRUCTURE_EOF_INVALID: "DXF 結尾標記不完整或重複。",
      DXF_STRUCTURE_ACADVER_MISSING: "DXF 缺少版本宣告。",
      DXF_STRUCTURE_ENTITIES_MISSING: "DXF 缺少 ENTITIES 圖面內容區段。",
      AUTOCAD_VALIDATION_FAILED: "轉換檔未通過 AutoCAD 開啟、AUDIT、REGEN 或列印驗證。",
      VISUAL_VALIDATION_FAILED: "來源與成果的 Model Space 或 Paper Space 視覺比對未達安全門檻。",
      FINAL_ADJUDICATION_FAILED: "個別驗證已執行，但最終證據綁定或綜合判定未通過。",
      GREEN_PACKAGE_EVIDENCE_MISSING: "轉換完成後缺少必要的成果或驗證收據，因此沒有封裝交付。",
      GREEN_PACKAGE_BINDING_MISMATCH: "成果與驗證收據的雜湊或工作綁定不一致，因此停止交付。",
      FAIL_CLOSED_CONVERTER_MANIFEST_MISSING: "轉換程序沒有產生完整且可驗證的轉換清單。",
      FAIL_CLOSED_DYNAMIC_BLOCK_REQUIRES_AUTOCAD_CURRENT_STATE_STATICIZATION: "圖面含 Dynamic Block，但目前可見狀態未能完成可信的靜態化。",
      FAIL_CLOSED_UNEXPECTED_EXCEPTION: "轉換器發生內部例外；系統已停止交付並留下可比對的診斷指紋，技術人員可依此修復。",
      INPUT_PAYLOAD_MISSING: "工作開始時找不到完整的原始上傳內容。",
      XREF_MAIN_DWG_REQUIRED: "ZIP 必須在根目錄提供且只提供一個 main.dwg 主圖。",
      XREF_DEPENDENCY_REQUIRED: "此 ZIP 未包含主圖所需的 DWG 外部參照。",
    };
    const stageLabels = {
      PREPARING: "檔案與依賴準備",
      CONVERSION: "內容解析與版本轉換",
      CAD_VALIDATION: "AutoCAD 開啟／AUDIT／REGEN／列印",
      VISUAL_VALIDATION: "Model Space／Paper Space 視覺一致性",
      FINAL_ADJUDICATION: "最終證據綁定與綜合判定",
      PACKAGING: "成果封裝與完整性綁定",
      WORKER: "隔離 worker 執行",
    };
    const checkLabels = {
      manifest_schema: "轉換清單格式",
      case_binding: "工作編號綁定",
      target_binding: "輸出版本綁定",
      converter_completed: "轉換程序完成",
      runtime_within_30_minutes: "30 分鐘執行上限",
      source_hash_binding: "來源雜湊綁定",
      output_hash_binding: "成果雜湊綁定",
      ascii_dxf_structure: "DXF 結構與版本",
      nonempty_2d_content: "2D 內容非空",
      writer_readback: "writer 回讀",
      writer_audit: "writer 稽核",
      semantic_reconciliation: "語意指紋比對",
      second_parser: "獨立第二解析器",
      third_parser: "ACadSharp 第三解析器",
      autocad_open_audit_regen_plot: "AutoCAD 開啟／AUDIT／REGEN／列印",
      capture_policy_binding: "視覺擷取證據綁定",
      model_visual_parity: "Model Space 視覺一致性",
      paperspace_visual_parity: "Paper Space 各 Layout 視覺一致性",
      dynamic_state: "Dynamic Block 目前狀態靜態化",
      receipt_hashes_present: "驗證收據雜湊",
      converter_completed: "轉換程序完成",
    };
    const warningText = (data.warnings || []).map((warning) => {
      if (warning.code === "EXTERNAL_IMAGE_MISSING") {
        return `偵測到 ${Number(warning.count) || 1} 個外部圖片未隨圖檔提供；轉換成果可能缺少該底圖或照片。`;
      }
      if (warning.code === "R2000_MTEXT_DEFINED_HEIGHT_DEGRADED") {
        return `R2000 無法保存 ${Number(warning.count) || 1} 個 MTEXT 的 defined-height 欄位；文字內容與主要幾何驗證已通過，但版面仍可能有細微差異。`;
      }
      return "轉換成果包含需要留意的外部資源警示。";
    });
    const diagnostic = data.failure && typeof data.failure === "object" ? data.failure : null;
    const diagnosticMessage = diagnostic
      ? (failureDetails[diagnostic.code] || failureDetails[data.failure_reason] || failureDetails.VALIDATION_NOT_PASSED)
      : (failureDetails[data.failure_reason] || failureDetails.VALIDATION_NOT_PASSED);
    const states = {
      PENDING: ["已收件", "等待安全處理與轉換"],
      RUNNING: ["處理中", "正在隔離環境進行轉換與驗證"],
      SUCCEEDED: data.download?.available
        ? ["驗證完成", "成果已準備完成，可取得單次下載票券"]
        : ["準備交付", "轉換已完成，正在完成成果封裝與完整性核對"],
      DEAD: ["無法完成", diagnosticMessage],
      EXPIRED: ["已到期", "檔案與下載權限已依保存政策刪除"],
    };
    const copy = states[data.state] || ["狀態更新", "系統正在確認工作狀態"];
    const warnings = warningText.map((message) => `<p class="status-warning">${message}</p>`).join("");
    const failedChecks = diagnostic?.failed_checks instanceof Array ? diagnostic.failed_checks : [];
    const diagnosticHtml = diagnostic ? `<section class="failure-diagnostic" aria-label="失敗診斷">
      <p><strong>失敗階段：</strong>${escapeHtml(stageLabels[diagnostic.stage] || diagnostic.stage)}</p>
      <p><strong>追蹤代碼：</strong><code>${escapeHtml(diagnostic.code)}</code></p>
      ${diagnostic.exception_type ? `<p><strong>例外分類：</strong><code>${escapeHtml(diagnostic.exception_type)}</code></p>` : ""}
      ${diagnostic.fingerprint ? `<p><strong>診斷指紋：</strong><code>${escapeHtml(diagnostic.fingerprint.slice(0, 16))}</code></p>` : ""}
      ${failedChecks.length ? `<p><strong>未通過檢查：</strong>${failedChecks.map((check) => escapeHtml(checkLabels[check] || check)).join("、")}</p>` : ""}
    </section>` : "";
    statusBox.innerHTML = `<p class="status-label">${copy[0]}</p><h2>${copy[1]}</h2><p>工作編號 ${escapeHtml(data.reference)}</p>${diagnosticHtml}${warnings}`;
    renderProgress(data);
    downloadButton.hidden = !(data.state === "SUCCEEDED" && data.download?.available && data.download.remaining > 0);
    if (["PENDING", "RUNNING"].includes(data.state) || (data.state === "SUCCEEDED" && !data.download?.available)) {
      pollTimer = window.setTimeout(loadStatus, 5000);
    }
  }

  async function loadStatus() {
    try {
      const response = await fetch(statusEndpoint, {
        headers: { Authorization: `Bearer ${statusToken}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.code || "JOB_LOOKUP_FAILED");
      renderStatus(data);
    } catch (error) {
      fail("私密連結無效或服務暫時無法連線", friendlyError(error, "目前無法完成工作查詢，請稍後重新整理頁面。"));
    }
  }

  downloadButton.addEventListener("click", async () => {
    downloadButton.disabled = true;
    try {
      const grantResponse = await fetch(`${statusEndpoint}/download-grants`, {
        method: "POST",
        headers: { Authorization: `Bearer ${statusToken}` },
      });
      const grant = await grantResponse.json();
      if (!grantResponse.ok) throw new Error(grant.code || "DOWNLOAD_GRANT_FAILED");
      const downloadUrl = new URL(grant.download_path, statusEndpoint.origin);
      const response = await fetch(downloadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ download_token: grant.download_token }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.code || "DOWNLOAD_FAILED");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `CAD-${jobId.slice(0, 8).toUpperCase()}-result.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      await loadStatus();
    } catch (error) {
      fail("下載未完成", friendlyError(error, "下載暫時無法完成，請稍後重新整理頁面再試。"));
    } finally {
      downloadButton.disabled = false;
    }
  });

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyButton.textContent = "已複製";
    } catch {
      window.prompt("複製這條私密查詢連結", window.location.href);
    }
  });

  try {
    statusEndpoint = new URL(endpointValue);
    if (!/^[0-9a-f]{32}$/.test(jobId) || !/^[0-9a-f]{64}$/.test(statusToken) || !endpointAllowed(statusEndpoint)) {
      throw new Error("PRIVATE_LINK_INVALID");
    }
    if (!statusEndpoint.pathname.endsWith(`/v1/jobs/${jobId}`)) throw new Error("PRIVATE_LINK_INVALID");
    reference.textContent = `CAD-${jobId.slice(0, 8).toUpperCase()}`;
    loadStatus();
  } catch (error) {
    fail("私密查詢連結不完整", "請回到上傳完成頁，使用系統產生的完整連結。若連結遺失，僅憑工作編號無法取回檔案。");
  }
})();
