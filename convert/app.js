(() => {
  "use strict";

  const config = window.CAD_CONVERTER_CONFIG || {};
  const form = document.querySelector("#conversionForm");
  const fileInput = document.querySelector("#cadFile");
  const dropZone = document.querySelector("#dropZone");
  const fileSummary = document.querySelector("#fileSummary");
  const fileError = document.querySelector("#fileError");
  const targetError = document.querySelector("#targetError");
  const consent = document.querySelector("#rightsConsent");
  const statusPanel = document.querySelector("#statusPanel");
  const serviceNote = document.querySelector("#serviceNote");
  const submitButton = document.querySelector("#submitButton");
  const allowedExtensions = new Set(["dwg", "zip"]);

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function extensionOf(name) {
    return name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  }

  function validateFile(file) {
    if (!file) return "請先選擇一個 DWG 或 ZIP 檔案。";
    if (!allowedExtensions.has(extensionOf(file.name))) return "只接受 .dwg 或 .zip 檔案。";
    if (file.size === 0) return "檔案內容是空的。";
    const limit = config.maxUploadBytes;
    if (file.size > limit) return "檔案超過 200 MiB 上限。";
    return "";
  }

  function friendlyUploadError(error) {
    const message = String(error?.message || "");
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "目前無法連線到測試主機，請稍後再試。";
    }
    if (/headers|bytestring|iso-8859-1/i.test(message)) {
      return "瀏覽器無法建立安全上傳請求，請重新選擇檔案後再試。";
    }

    const code = message.replace(/[^A-Z0-9_-]/gi, "").toUpperCase().slice(0, 64);
    const messages = {
      TEST_SERVICE_UNAVAILABLE: "測試主機目前未連線，請稍後再試。",
      BODY_SIZE_INVALID: "檔案超過目前允許的大小。",
      INPUT_TYPE_MISMATCH: "檔案內容與副檔名不符。",
      TICKET_FAILED: "目前無法建立安全上傳通行證。",
      UPLOAD_FAILED: "檔案未能完成上傳，請重新嘗試。",
    };
    return messages[code] || `服務暫時無法收件（${code || "UNAVAILABLE"}）。`;
  }

  function renderFile(file) {
    const error = validateFile(file);
    fileError.hidden = !error;
    fileError.textContent = error;
    fileSummary.hidden = Boolean(error) || !file;
    if (!error && file) {
      const tier = extensionOf(file.name) === "dwg" && file.size <= config.freeDwgBytes ? "符合免費規格候選" : "完成預檢後顯示方案";
      fileSummary.innerHTML = `<span>${extensionOf(file.name).toUpperCase()}</span><div><b>${file.name.replace(/[<>]/g, "")}</b><small>${formatBytes(file.size)}｜${tier}｜尚未上傳</small></div>`;
    }
  }

  fileInput.addEventListener("change", () => renderFile(fileInput.files[0]));
  ["dragenter", "dragover"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  }));
  dropZone.addEventListener("drop", (event) => {
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      fileError.hidden = false;
      fileError.textContent = "一次只能選擇一個檔案。";
      return;
    }
    fileInput.files = files;
    renderFile(files[0]);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    const fileMessage = validateFile(file);
    const target = form.elements.target.value;
    fileError.hidden = !fileMessage;
    fileError.textContent = fileMessage;
    targetError.hidden = Boolean(target);
    targetError.textContent = target ? "" : "請選擇需要的輸出格式。";
    if (fileMessage || !target) return;
    if (!consent.checked) {
      statusPanel.innerHTML = '<p class="status-label">尚未完成</p><h2>請確認檔案處理權利</h2><p>勾選左側確認項目後才能建立檢查摘要。</p>';
      consent.focus();
      return;
    }

    if (!config.apiBase || !["test", "open"].includes(config.serviceState)) {
      const tier = extensionOf(file.name) === "dwg" && file.size <= config.freeDwgBytes ? "符合免費規格候選" : "需完成付費預檢";
      statusPanel.innerHTML = `<p class="status-label">本機預檢通過</p><h2>${extensionOf(file.name).toUpperCase()}｜${target}</h2><p>${formatBytes(file.size)}，${tier}。目前轉檔主機尚未開放，檔案沒有離開你的裝置，也不會產生費用。</p>`;
      serviceNote.textContent = "安全預覽完成：未連線、未上傳、未付款。";
      return;
    }

    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(4)).join("-")}`;
    submitButton.disabled = true;
    statusPanel.innerHTML = '<p class="status-label">建立短效通行證</p><h2>準備封閉測試上傳</h2><p>請保持此頁開啟；測試主機離線時會安全停止，不會產生費用。</p>';
    try {
      const ticketResponse = await fetch(`${config.apiBase}/cad-upload-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, target, idempotency_key: idempotencyKey }),
      });
      const ticket = await ticketResponse.json();
      if (!ticketResponse.ok) throw new Error(ticket.code || "TICKET_FAILED");

      statusPanel.innerHTML = '<p class="status-label">測試上傳中</p><h2>正在傳送到單一測試主機</h2><p>此階段不會收費；只有通過 GREEN_VERIFIED 的測試檔才提供成果下載。</p>';
      // Fetch request headers only accept byte-safe values. Keep the original
      // Unicode name in the ticket request and use a canonical transport name here.
      const transportFilename = `upload.${extensionOf(file.name)}`;
      const uploadResponse = await fetch(ticket.upload_url, {
        method: "POST",
        headers: {
          Authorization: `Upload ${ticket.upload_ticket}`,
          "Content-Type": "application/octet-stream",
          "X-CAD-Filename": transportFilename,
          "X-CAD-Target": target,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: file,
      });
      const result = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(result.code || "UPLOAD_FAILED");
      const tier = result.service_tier === "FREE_ELIGIBLE" ? "符合免費規格候選" : "完成轉換驗證後顯示付費方案";
      const uploadUrl = new URL(ticket.upload_url, window.location.href);
      const statusUrl = new URL(result.status_path, uploadUrl.origin);
      const lookupUrl = new URL("job.html", window.location.href);
      lookupUrl.hash = new URLSearchParams({
        job: result.job_id,
        token: result.status_token,
        endpoint: statusUrl.toString(),
      }).toString();
      statusPanel.innerHTML = `<p class="status-label">封閉測試已收件</p><h2>工作編號 CAD-${result.job_id.slice(0, 8).toUpperCase()}</h2><p>入口檢查已通過，${tier}。請保存私密查詢連結；尚未達 GREEN_VERIFIED 前不會顯示付款或下載。</p><a class="status-action" href="${lookupUrl.toString()}">開啟工作查詢頁</a>`;
      serviceNote.textContent = "封閉測試：已上傳至單一測試主機；不收費，通過 GREEN_VERIFIED 才提供下載，圖檔最長 24 小時刪除。";
      form.reset();
      fileSummary.hidden = true;
    } catch (error) {
      statusPanel.innerHTML = `<p class="status-label">安全停止</p><h2>測試主機目前無法收件</h2><p>檔案未取得成功收件確認，也不會產生費用。${friendlyUploadError(error)}</p>`;
      serviceNote.textContent = "測試主機離線或拒絕請求；請稍後再試，勿上傳機密圖檔。";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
