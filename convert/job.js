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
  let statusEndpoint;
  let pollTimer;

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
    const states = {
      PENDING: ["已收件", "等待安全處理與轉換"],
      RUNNING: ["處理中", "正在隔離環境進行轉換與驗證"],
      SUCCEEDED: data.download?.available
        ? ["驗證完成", "成果已準備完成，可取得單次下載票券"]
        : ["準備交付", "轉換已完成，正在完成成果封裝與完整性核對"],
      DEAD: ["無法完成", failureDetails[data.failure_reason] || "此工作未通過安全或轉換驗證，不會開放付款與下載"],
      EXPIRED: ["已到期", "檔案與下載權限已依保存政策刪除"],
    };
    const copy = states[data.state] || ["狀態更新", "系統正在確認工作狀態"];
    const warnings = warningText.map((message) => `<p class="status-warning">${message}</p>`).join("");
    statusBox.innerHTML = `<p class="status-label">${copy[0]}</p><h2>${copy[1]}</h2><p>工作編號 ${data.reference}</p>${warnings}`;
    downloadButton.hidden = !(data.state === "SUCCEEDED" && data.download?.available && data.download.remaining > 0);
    if (["PENDING", "RUNNING"].includes(data.state) || (data.state === "SUCCEEDED" && !data.download?.available)) {
      pollTimer = window.setTimeout(loadStatus, 10000);
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
