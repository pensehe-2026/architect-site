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
    if (file.size > config.maxUploadBytes) return "檔案超過 100 MB 上限。";
    return "";
  }

  function renderFile(file) {
    const error = validateFile(file);
    fileError.hidden = !error;
    fileError.textContent = error;
    fileSummary.hidden = Boolean(error) || !file;
    if (!error && file) {
      fileSummary.innerHTML = `<span>${extensionOf(file.name).toUpperCase()}</span><div><b>${file.name.replace(/[<>]/g, "")}</b><small>${formatBytes(file.size)}｜尚未上傳</small></div>`;
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    const fileMessage = validateFile(file);
    const target = form.elements.target.value;
    fileError.hidden = !fileMessage;
    fileError.textContent = fileMessage;
    targetError.hidden = Boolean(target);
    targetError.textContent = target ? "" : "請選擇你的 CAD 年份或 CNC／雷切用途。";
    if (fileMessage || !target) return;
    if (!consent.checked) {
      statusPanel.innerHTML = '<p class="status-label">尚未完成</p><h2>請確認檔案處理權利</h2><p>勾選左側確認項目後才能建立檢查摘要。</p>';
      consent.focus();
      return;
    }

    if (!config.apiBase || config.serviceState !== "open") {
      statusPanel.innerHTML = `<p class="status-label">本機預檢通過</p><h2>${extensionOf(file.name).toUpperCase()}｜${target}</h2><p>${formatBytes(file.size)}，檔案類型與大小符合入口規則。目前轉檔主機尚未開放，檔案沒有離開你的裝置，也不會產生費用。</p>`;
      serviceNote.textContent = "安全預覽完成：未連線、未上傳、未付款。";
      return;
    }

    statusPanel.innerHTML = '<p class="status-label">暫停送出</p><h2>公開 API 尚未完成安全驗收</h2><p>為避免圖檔送往未驗證端點，本頁目前維持 Fail Closed。</p>';
  });
})();
