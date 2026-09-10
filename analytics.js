(function () {
  "use strict";

  const measurementId = "G-GNHQ4QE7JX";

  function sanitizedUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      return `${url.origin}${url.pathname}`;
    } catch (_) {
      return "";
    }
  }

  function ensurePrivacyLink() {
    const footer = document.querySelector(".site-footer");
    const existingLink = footer
      ? Array.from(footer.querySelectorAll("a[href]")).some(function (link) {
          return /\/privacy(?:\.html)?\/?$/.test(new URL(link.href, window.location.origin).pathname);
        })
      : false;
    if (!footer || existingLink) return;

    const link = document.createElement("a");
    link.href = "privacy.html";
    link.textContent = "隱私權政策";
    footer.appendChild(link);
  }

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
      send_page_view: false,
    });

    window.gtag("event", "page_view", {
      page_location: sanitizedUrl(window.location.href),
      page_path: window.location.pathname,
      page_title: document.title,
      page_referrer: sanitizedUrl(document.referrer),
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePrivacyLink, { once: true });
  } else {
    ensurePrivacyLink();
  }

  loadAnalytics();
})();
