const contentUrl = "data/site-content.json";
let currentContent = null;

const fallbackContent = {
  studioName: "何中揚建築師事務所",
  studioTagline: "HO CHUNG YANG Architecture firm + Yu-Yi Interior Design",
  heroEyebrow: "建築設計 / 室內設計 / 法規整合",
  heroTitle: "全方位的建築專家",
  heroText: "從土地開發、自宅設計、建案規畫到室內設計與公共安全檢查，提供完整的建築專業服務。",
  introTitle: "從基地評估、法規判斷到施工整合，提供一站式建築顧問。",
  studioIntro: "何中揚建築師事務所結合宇邑空間設計，服務範圍涵蓋土地開發評估、建築與室內設計、都市更新整建維護、老屋延壽、工程承攬及各類申請檢查。",
  contactTitle: "把基地條件、建物現況或申請需求寄來，我們會協助整理下一步。",
  version: "local-fallback",
  lastUpdated: new Date().toISOString(),
  metrics: [],
  projects: [],
  updates: [],
  services: [],
  regulations: [],
  usefulLinks: [],
  contact: {
    email: "Hodesign2013@gmail.com",
    phone: "04-22291885 / 04-35091168",
    fax: "04-22291868 / 04-35091169",
    address: "台中市西區自由路一段101號20樓202室",
    lineLabel: "LINE 公務帳號",
    lineUrl: "#contact",
  },
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const setText = (selector, value) => {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value ?? "";
  });
};

const escapeHTML = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderMetrics = (items = []) => {
  const target = document.querySelector("#metrics");
  target.innerHTML = items
    .map(
      (item) => `
        <article class="metric">
          <strong>${item.value}</strong>
          <span>${escapeHTML(item.label)}</span>
        </article>
      `,
    )
    .join("");
};

const renderProjects = (items = []) => {
  const target = document.querySelector("#projectGrid");
  const featured = items.filter((project) => project.image).slice(0, 6);
  target.innerHTML = `
    <section class="case-study-rail" aria-label="案例研究輪播">
      <div class="case-study-head">
        <div>
          <p class="eyebrow">Case Studies</p>
          <h3>可展開的專案案例研究</h3>
        </div>
        <div class="rail-controls" aria-label="案例輪播控制">
          <button type="button" data-rail="prev" aria-label="上一個案例">‹</button>
          <button type="button" data-rail="next" aria-label="下一個案例">›</button>
        </div>
      </div>
      <div class="case-study-track" id="caseStudyTrack">
        ${featured
          .map(
            (project, index) => `
              <article class="case-study-card">
                <div class="case-study-media">
                  <img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.name)}">
                </div>
                <div class="case-study-body">
                  <span>${escapeHTML(project.category || project.type)}</span>
                  <h3>${escapeHTML(project.name)}</h3>
                  <p>${escapeHTML(project.summary)}</p>
                  <button type="button" class="project-link case-open" data-project-index="${items.indexOf(project)}">
                    展開案例
                  </button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
      <a class="case-more-link" href="projects.html">更多案例，前往作品集</a>
    </section>
  `;
};

const renderUpdates = (items = []) => {
  const target = document.querySelector("#updatesList");
  const hiddenHomeUpdateTitles = new Set(["房地產動態區塊建立", "代表作品資料欄位建立"]);
  const visibleItems = [...items]
    .filter((item) => !hiddenHomeUpdateTitles.has(item.title))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);
  target.innerHTML = visibleItems
    .map(
      (item) => `
        <article class="update-item">
          <time datetime="${escapeHTML(item.date)}">${formatDate(item.date).split(" ")[0]}</time>
          <div>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.summary)}</p>
          </div>
          <a class="tag" href="${escapeHTML(item.href || "#updates")}">${escapeHTML(item.category)}</a>
        </article>
      `,
    )
    .join("");
};

const getServiceNews = (content = currentContent) =>
  (content?.services || []).flatMap((service) =>
    (service.detail?.news || []).map((item) => ({
      ...item,
      category: item.category || service.title,
      href: item.href || `${service.href || `service.html?item=${service.slug}`}#service-news`,
    })),
  );

const getAllUpdates = (content = currentContent) =>
  [...(content?.updates || []), ...getServiceNews(content)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

const renderServices = (items = []) => {
  const target = document.querySelector("#serviceList");
  target.innerHTML = items
    .map(
      (service, index) => `
        <article class="service-item">
          <span class="service-index">${String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3><a href="${escapeHTML(service.href || `service.html?item=${service.slug}`)}">${escapeHTML(service.title)}</a></h3>
            <p>${escapeHTML(service.description)}</p>
          </div>
        </article>
      `,
    )
    .join("");
};

const renderRegulations = (items = []) => {
  const target = document.querySelector("#regulationGrid");
  target.innerHTML = items
    .map(
      (item) => `
        <a class="regulation-card" href="${escapeHTML(item.href || "#regulations")}">
          <span>${escapeHTML(item.type)}</span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description)}</p>
        </a>
      `,
    )
    .join("");
};

const renderUsefulLinks = (items = []) => {
  const target = document.querySelector("#usefulLinks");
  target.innerHTML = items
    .map(
      (item) => `
        <a class="useful-link" href="${escapeHTML(item.href)}" target="${item.href?.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">
          <span>${escapeHTML(item.category)}</span>
          <strong>${escapeHTML(item.title)}</strong>
        </a>
      `,
    )
    .join("");
};

const renderContact = (contact = fallbackContent.contact) => {
  const emailLink = document.querySelector("#emailLink");
  const phoneLink = document.querySelector("#phoneLink");
  const faxText = document.querySelector("#faxText");
  const addressText = document.querySelector("#addressText");
  const lineQrImagePrimary = document.querySelector("#lineQrImagePrimary");
  const lineQrImageSecondary = document.querySelector("#lineQrImageSecondary");

  emailLink.textContent = contact.email;
  emailLink.href = `mailto:${contact.email}`;
  phoneLink.textContent = contact.phone;
  phoneLink.href = `tel:${contact.phone.split("/")[0].replaceAll(" ", "")}`;
  faxText.textContent = `傳真 ${contact.fax}`;
  addressText.textContent = contact.address;
  if (lineQrImagePrimary) {
    lineQrImagePrimary.src = contact.lineQrImagePrimary || "assets/line-official-account-976udzzw.jpg";
    lineQrImagePrimary.alt = `${contact.lineAccountName || "何中揚建築師事務所"} LINE QR code`;
  }
  if (lineQrImageSecondary) {
    lineQrImageSecondary.src = contact.lineQrImageSecondary || contact.lineQrImage || "assets/line-official-account.jpg";
    lineQrImageSecondary.alt = "公安申報 LINE QR code";
  }
};

const renderContent = (content) => {
  currentContent = content;
  setText('[data-field="studioName"]', content.studioName);
  setText('[data-field="studioTagline"]', content.studioTagline);
  setText('[data-field="heroEyebrow"]', content.heroEyebrow);
  setText('[data-field="heroTitle"]', content.heroTitle);
  setText('[data-field="heroText"]', content.heroText);
  setText('[data-field="introTitle"]', content.introTitle);
  setText('[data-field="studioIntro"]', content.studioIntro);
  setText('[data-field="contactTitle"]', content.contactTitle);
  setText("#footerLastUpdated", formatDate(content.lastUpdated));

  renderMetrics(content.metrics);
  renderProjects(content.projects);
  renderUpdates(getAllUpdates(content));
  renderRegulations(content.regulations);
  renderServices(content.services);
  renderUsefulLinks(content.usefulLinks);
  renderContact(content.contact);
  bindCaseStudyUI(content);
  renderSearchResults("");
};

const getProjectByIndex = (index) => currentContent?.projects?.[Number(index)];

const openCaseModal = (project) => {
  if (!project) return;
  const modal = document.querySelector("#caseModal");
  const media = document.querySelector("#caseModalMedia");
  const facts = document.querySelector("#caseModalFacts");
  const actions = document.querySelector("#caseModalActions");

  media.innerHTML = project.image ? `<img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.name)}">` : "";
  document.querySelector("#caseModalKicker").textContent = project.category || "Case Study";
  document.querySelector("#caseModalTitle").textContent = project.name;
  document.querySelector("#caseModalSummary").textContent = project.detail?.lead || project.summary;
  facts.innerHTML = [
    ["類型", project.type],
    ["地點", project.location],
    ["年份", project.year],
  ]
    .map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value || "整理中")}</dd></div>`)
    .join("");
  actions.innerHTML = `
    ${project.href ? `<a class="button primary detail-button" href="${escapeHTML(project.href)}">前往獨立頁</a>` : ""}
    <a class="button secondary detail-button" href="#contact">討論類似需求</a>
  `;
  modal.hidden = false;
  document.body.classList.add("modal-open");
};

const closeCaseModal = () => {
  document.querySelector("#caseModal").hidden = true;
  document.body.classList.remove("modal-open");
};

const bindCaseStudyUI = (content) => {
  document.querySelectorAll(".case-open").forEach((button) => {
    button.addEventListener("click", () => openCaseModal(getProjectByIndex(button.dataset.projectIndex)));
  });

  const track = document.querySelector("#caseStudyTrack");
  document.querySelector('[data-rail="prev"]')?.addEventListener("click", () => {
    track?.scrollBy({ left: -360, behavior: "smooth" });
  });
  document.querySelector('[data-rail="next"]')?.addEventListener("click", () => {
    track?.scrollBy({ left: 360, behavior: "smooth" });
  });
};

const buildSearchIndex = (content = currentContent) => {
  if (!content) return [];
  return [
    ...(content.projects || []).map((item) => ({
      type: "作品集",
      title: item.name,
      summary: item.summary,
      href: item.href || "projects.html",
      keywords: [item.category, item.type, item.location, item.year].join(" "),
    })),
    ...(content.services || []).map((item) => ({
      type: "服務",
      title: item.title,
      summary: item.description,
      href: item.href || "#services",
      keywords: item.slug,
    })),
    ...(content.regulations || []).map((item) => ({
      type: "法規",
      title: item.title,
      summary: item.description,
      href: item.href || "#regulations",
      keywords: item.type,
    })),
    ...getAllUpdates(content).map((item) => ({
      type: "動態",
      title: item.title,
      summary: item.summary,
      href: item.href || "#updates",
      keywords: item.category,
    })),
    ...(content.usefulLinks || []).map((item) => ({
      type: "連結",
      title: item.title,
      summary: item.href,
      href: item.href,
      keywords: item.category,
    })),
  ];
};

const renderSearchResults = (query = "") => {
  const target = document.querySelector("#globalSearchResults");
  if (!target) return;
  const normalized = query.trim().toLowerCase();
  const items = buildSearchIndex();
  const results = normalized
    ? items.filter((item) =>
        [item.type, item.title, item.summary, item.keywords].join(" ").toLowerCase().includes(normalized),
      )
    : items.slice(0, 8);

  target.innerHTML = results.length
    ? results
        .slice(0, 12)
        .map(
          (item) => `
            <a class="search-result" href="${escapeHTML(item.href)}" ${item.href?.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>
              <span>${escapeHTML(item.type)}</span>
              <strong>${escapeHTML(item.title)}</strong>
              <p>${escapeHTML(item.summary || "")}</p>
            </a>
          `,
        )
        .join("")
    : `<p class="empty-search">目前沒有符合的內容，請換一個關鍵字。</p>`;
};

const openSearchPanel = () => {
  const panel = document.querySelector("#searchPanel");
  const input = document.querySelector("#globalSearchInput");
  panel.hidden = false;
  document.body.classList.add("modal-open");
  renderSearchResults(input.value);
  requestAnimationFrame(() => input.focus());
};

const closeSearchPanel = () => {
  document.querySelector("#searchPanel").hidden = true;
  document.body.classList.remove("modal-open");
};

const optionalJsonCache = {};

const loadOptionalJson = async (path) => {
  if (optionalJsonCache[path]) return optionalJsonCache[path];
  try {
    const response = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Optional data request failed: ${response.status}`);
    optionalJsonCache[path] = await response.json();
    return optionalJsonCache[path];
  } catch (error) {
    console.warn(error);
    optionalJsonCache[path] = null;
    return null;
  }
};

const compactItems = (items = [], mapper, limit = 12) =>
  items
    .slice(0, limit)
    .map(mapper)
    .filter(Boolean)
    .join("\n");

const buildAiContext = async () => {
  const content = currentContent || {};
  const [nlma, taichung, practice] = await Promise.all([
    loadOptionalJson("data/nlma-regulations.json"),
    loadOptionalJson("data/taichung-regulations.json"),
    loadOptionalJson("data/building-practice.json"),
  ]);

  const sections = [
    `事務所：${content.studioName || ""} / ${content.studioTagline || ""}`,
    `服務項目：${compactItems(content.services, (item) => `- ${item.title}：${item.description}`, 16)}`,
    `最新動態：${compactItems(getAllUpdates(content), (item) => `- ${item.date || ""}｜${item.category || ""}｜${item.title}：${item.summary || ""}`, 10)}`,
    `首頁法規入口：${compactItems(content.regulations, (item) => `- ${item.type || ""}｜${item.title}：${item.description || ""}`, 10)}`,
    `好用連結：${compactItems(content.usefulLinks, (item) => `- ${item.category || ""}｜${item.title}｜${item.href}`, 8)}`,
  ];

  if (nlma?.categories) {
    sections.push(
      `中央法規公告分類：${compactItems(nlma.categories, (category) => `- ${category.name || category.title}：${category.count || category.items?.length || 0} 筆`, 10)}`,
    );
  }
  if (taichung?.latest) {
    sections.push(
      `台中市建築管理與地方自治最新公告：${compactItems(taichung.latest, (item) => `- ${item.date || ""}｜${item.title || ""}`, 10)}`,
    );
  }
  if (taichung?.categories) {
    sections.push(
      `台中市法規分類：${compactItems(taichung.categories, (category) => `- ${category.name || category.title}：${category.count || category.items?.length || 0} 筆`, 10)}`,
    );
  }
  if (practice?.posts) {
    sections.push(
      `建管實務文章：${compactItems(practice.posts, (post) => `- ${post.date || ""}｜${post.title || ""}：${post.summary || ""}`, 10)}`,
    );
  }

  return sections.join("\n\n").slice(0, 18000);
};

const appendAiMessage = (role, text) => {
  const target = document.querySelector("#aiChatMessages");
  if (!target) return null;
  const node = document.createElement("article");
  node.className = `ai-chat-message ${role}`;
  const normalizedText = String(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1：$2");
  const linkedText = escapeHTML(normalizedText)
    .replace(/\n/g, "<br>")
    .replace(
      /(^|[\s(（])((?:https?:\/\/[^\s<>()）]+)|(?:[A-Za-z0-9_-]+\.html(?:\?[^\s<>()）]+)?(?:#[^\s<>()）]+)?)|(?:index\.html#[^\s<>()）]+)|(?:#[A-Za-z0-9_-]+))/g,
      (match, prefix, url) => {
        const href = url.startsWith("#") ? `index.html${url}` : url;
        const external = href.startsWith("http");
        return `${prefix}<a href="${href}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${url}</a>`;
      },
    );
  node.innerHTML = `<p>${linkedText}</p>`;
  target.append(node);
  target.scrollTop = target.scrollHeight;
  return node;
};

const openAiChat = () => {
  const panel = document.querySelector("#aiChatPanel");
  const input = document.querySelector("#aiChatInput");
  if (!panel) return;
  panel.hidden = false;
  requestAnimationFrame(() => input?.focus());
};

const closeAiChat = () => {
  const panel = document.querySelector("#aiChatPanel");
  if (panel) panel.hidden = true;
};

const submitAiChat = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = document.querySelector("#aiChatInput");
  const question = input?.value.trim();
  if (!question) return;

  input.value = "";
  appendAiMessage("user", question);
  const pending = appendAiMessage("assistant", "整理站內資料中，請稍候...");
  form.querySelector("button").disabled = true;

  try {
    const context = await buildAiContext();
    const response = await fetch("/.netlify/functions/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "AI service unavailable");
    pending.querySelector("p").textContent = payload.answer || "目前沒有取得回覆。";
    pending.scrollIntoView({ block: "nearest" });
  } catch (error) {
    pending.querySelector("p").textContent =
      "AI 對話窗口已接好，但目前還沒有可用的 Gemini 後端回覆。請確認 Netlify 已設定 GEMINI_API_KEY，並重新部署網站。";
    pending.scrollIntoView({ block: "nearest" });
    console.warn(error);
  } finally {
    form.querySelector("button").disabled = false;
  }
};

const restoreHashPosition = () => {
  const id = window.location.hash.slice(1);
  if (!id || id === "top") return;

  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  });
};

const loadContent = async () => {
  if (window.location.protocol === "file:" && window.SITE_CONTENT) {
    return window.SITE_CONTENT;
  }

  const response = await fetch(`${contentUrl}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
  return response.json();
};

const refreshContent = async () => {
  const button = document.querySelector("#refreshContent");
  button.disabled = true;
  try {
    const content = await loadContent();
    renderContent(content);
    restoreHashPosition();
    if (window.location.protocol === "file:") {
      setText("#dataSource", "data/site-content.js");
    }
  } catch (error) {
    console.warn(error);
    renderContent(window.SITE_CONTENT || fallbackContent);
    setText("#dataSource", window.SITE_CONTENT ? "data/site-content.js" : "fallbackContent");
  } finally {
    button.disabled = false;
  }
};

document.querySelector("#refreshContent").addEventListener("click", refreshContent);
document.querySelector("#closeCaseModal")?.addEventListener("click", closeCaseModal);
document.querySelector("#caseModal")?.addEventListener("click", (event) => {
  if (event.target.id === "caseModal") closeCaseModal();
});
document.querySelector("#openSearch")?.addEventListener("click", openSearchPanel);
document.querySelector("#closeSearch")?.addEventListener("click", closeSearchPanel);
document.querySelector("#searchPanel")?.addEventListener("click", (event) => {
  if (event.target.id === "searchPanel") closeSearchPanel();
});
document.querySelector("#globalSearchInput")?.addEventListener("input", (event) => renderSearchResults(event.target.value));
document.querySelector("#openAiChat")?.addEventListener("click", openAiChat);
document.querySelector("#closeAiChat")?.addEventListener("click", closeAiChat);
document.querySelector("#aiChatForm")?.addEventListener("submit", submitAiChat);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCaseModal();
    closeSearchPanel();
    closeAiChat();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearchPanel();
  }
});
refreshContent();
