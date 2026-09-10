(function () {
  "use strict";

  const measurementId = "G-GNHQ4QE7JX";
  const consentKey = "bauhaus_analytics_consent_v1";

  function loadAnalytics() {
    if (window.__bauhausAnalyticsLoaded) return;
    window.__bauhausAnalyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: "SameSite=Lax;Secure",
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    document.addEventListener("click", function (event) {
      const link = event.target.closest("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      let method = "";
      if (href.startsWith("tel:")) method = "phone";
      else if (href.startsWith("mailto:")) method = "email";
      else if (/line\.me|lin\.ee/i.test(href)) method = "line";

      if (method) {
        window.gtag("event", "contact_click", {
          contact_method: method,
          page_path: window.location.pathname,
        });
      }
    });
  }

  function saveConsent(value) {
    try {
      window.localStorage.setItem(consentKey, value);
    } catch (_) {
      // If storage is unavailable, respect the choice for the current page only.
    }
  }

  function showConsentBanner() {
    const style = document.createElement("style");
    style.textContent = `
      .analytics-consent {
        position: fixed;
        right: 18px;
        bottom: 18px;
        left: 18px;
        z-index: 10000;
        max-width: 760px;
        margin: 0 auto;
        padding: 16px 18px;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 12px;
        background: rgba(20,24,26,.97);
        box-shadow: 0 14px 45px rgba(0,0,0,.28);
        color: #f4f4f0;
        font: 14px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      .analytics-consent p { margin: 0 0 12px; }
      .analytics-consent__actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .analytics-consent button {
        min-height: 40px;
        padding: 8px 16px;
        border: 1px solid rgba(255,255,255,.42);
        border-radius: 999px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
      }
      .analytics-consent button[data-choice="accept"] {
        border-color: #d8ba70;
        background: #d8ba70;
        color: #151719;
        font-weight: 700;
      }
      .analytics-consent button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    `;
    document.head.appendChild(style);

    const banner = document.createElement("aside");
    banner.className = "analytics-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "網站分析 Cookie 設定");
    banner.innerHTML = `
      <p>我們使用 Google Analytics 的匿名彙總資料改善網站內容；不會傳送表單內容或其他個人識別資訊。你可以選擇是否同意分析用 Cookie。</p>
      <div class="analytics-consent__actions">
        <button type="button" data-choice="accept">同意分析</button>
        <button type="button" data-choice="decline">暫不同意</button>
      </div>
    `;

    banner.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-choice]");
      if (!button) return;
      const choice = button.dataset.choice;
      saveConsent(choice);
      banner.remove();
      style.remove();
      if (choice === "accept") loadAnalytics();
    });

    document.body.appendChild(banner);
  }

  let consent = "";
  try {
    consent = window.localStorage.getItem(consentKey) || "";
  } catch (_) {
    consent = "";
  }

  if (consent === "accept") {
    loadAnalytics();
  } else if (consent !== "decline") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showConsentBanner, { once: true });
    } else {
      showConsentBanner();
    }
  }
})();
