from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from urllib.parse import quote
from xml.etree import ElementTree
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://bauhaus.com.tw"
TODAY = date.today().isoformat()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def url(path: str) -> str:
    return f"{SITE_URL.rstrip('/')}/{path.lstrip('/')}"


def read_sitemap_lastmods() -> dict[str, str]:
    path = ROOT / "sitemap.xml"
    if not path.exists():
        return {}
    try:
        root = ElementTree.fromstring(path.read_text(encoding="utf-8"))
    except ElementTree.ParseError:
        return {}

    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    lastmods: dict[str, str] = {}
    for node in root.findall("sm:url", namespace):
        loc = node.findtext("sm:loc", default="", namespaces=namespace)
        lastmod = node.findtext("sm:lastmod", default="", namespaces=namespace)
        if loc and lastmod:
            lastmods[loc] = lastmod
    return lastmods


def sitemap_entry(
    loc: str,
    priority: str = "0.6",
    changefreq: str = "monthly",
    lastmod: str = TODAY,
) -> str:
    return "\n".join(
        [
            "  <url>",
            f"    <loc>{escape(loc)}</loc>",
            f"    <lastmod>{lastmod}</lastmod>",
            f"    <changefreq>{changefreq}</changefreq>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ]
    )


def html_escape(value: object) -> str:
    return escape(str(value or ""), {'"': "&quot;"})


def link_item(href: str, title: str, text: str = "") -> str:
    summary = f"<p>{html_escape(text)}</p>" if text else ""
    return f'<li><a href="{html_escape(href)}">{html_escape(title)}</a>{summary}</li>'


def service_href(service: dict) -> str:
    if service.get("slug") == "old-house-life-extension":
        return "old-house-life-extension.html"
    if service.get("slug") == "urban-renewal-maintenance":
        return "urban-renewal-maintenance.html"
    return service.get("href") or f"service.html?item={quote(service.get('slug', ''))}"


def write_old_house_page(site: dict) -> None:
    service = next(
        (item for item in site.get("services", []) if item.get("slug") == "old-house-life-extension"),
        None,
    )
    if not service:
        return

    detail = service.get("detail", {})
    page_url = url("old-house-life-extension.html")
    title = "台中老屋延壽（老宅延壽）申請｜補助資格、流程與文件｜何中揚建築師事務所"
    description = service.get("seoDescription") or service.get("description", "")
    latest_date = max((item.get("date", "") for item in detail.get("news", [])), default=TODAY)

    highlights = "\n".join(
        f"""<article><span>{html_escape(item.get('label'))}</span><strong>{html_escape(item.get('value'))}</strong></article>"""
        for item in detail.get("highlights", [])
    )
    news = "\n".join(
        f"""<article class="service-news-item">
          <time datetime="{html_escape(item.get('date'))}">{html_escape(item.get('date'))}</time>
          <div><span>{html_escape(item.get('category'))}</span><h3><a href="{html_escape(item.get('href') or '#service-news')}">{html_escape(item.get('title'))}</a></h3><p>{html_escape(item.get('summary'))}</p></div>
        </article>"""
        for item in detail.get("news", [])
    )
    process = "\n".join(
        f"""<article class="process-step"><span>{html_escape(item.get('step'))}</span><div><h3>{html_escape(item.get('title'))}</h3><p>{html_escape(item.get('text'))}</p></div></article>"""
        for item in detail.get("process", [])
    )
    sections = "\n".join(
        f"""<article class="detail-info-card"><h2>{html_escape(section.get('title'))}</h2><ul>{''.join(f'<li>{html_escape(item)}</li>' for item in section.get('items', []))}</ul></article>"""
        for section in detail.get("sections", [])
    )
    documents = "\n".join(f"<li>{html_escape(item)}</li>" for item in detail.get("documents", []))
    resources = "\n".join(
        f'<a class="resource-link" href="{html_escape(item.get("href"))}" target="_blank" rel="noreferrer">{html_escape(item.get("title"))}</a>'
        for item in detail.get("resources", [])
    )
    faqs = [
        (
            "台中老屋延壽與老宅延壽是同一類服務嗎？",
            "民間常用老屋延壽描述老舊住宅安全與機能改善；臺中市政府目前以老宅延壽機能復新計畫為公告名稱。本頁同時使用兩種稱呼，協助屋主找到正確申請資訊。",
        ),
        (
            "哪些台中住宅可先評估老宅延壽補助？",
            "可先評估屋齡30年以上的合法建築物，包括4至6樓公寓及6樓以下透天住宅；仍須依住宅使用比例、建物狀況、重複補助及最新公告逐案確認。",
        ),
        (
            "申請老屋延壽前最先要準備什麼？",
            "建議先整理建物地址、樓層數、建物登記謄本、使用執照或合法建築物證明、現況照片、住戶共識與想改善的項目，再由建築師協助資格初判。",
        ),
        (
            "房屋拉皮可以和管線、防水、無障礙改善一起評估嗎？",
            "可以。外牆修繕只是整體改善的一部分，通常可一併檢討屋頂防水隔熱、公共管線、外部管線、居家安全與無障礙設施等項目。",
        ),
        (
            "何中揚建築師事務所可以協助哪些階段？",
            "本所可協助資格檢核、住戶與專業團隊協調、結構安全性能評估介面、圖說與申請文件整理、施工整合、完工備查及請款流程。",
        ),
    ]
    faq_html = "\n".join(
        f"<details class=\"faq-item\"><summary>{html_escape(question)}</summary><p>{html_escape(answer)}</p></details>"
        for question, answer in faqs
    )
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "@id": f"{page_url}#service",
                "name": "台中老屋延壽與老宅延壽申請服務",
                "description": description,
                "url": page_url,
                "serviceType": ["老屋延壽", "老宅延壽", "房屋拉皮", "整建維護", "建築物修繕補助"],
                "areaServed": {"@type": "City", "name": "台中市"},
                "provider": {
                    "@type": "Architect",
                    "name": "何中揚建築師事務所",
                    "url": url("index.html"),
                    "telephone": "+886-4-2229-1885",
                    "email": "Hodesign2013@gmail.com",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "自由路一段101號20樓202室",
                        "addressLocality": "台中市西區",
                        "addressCountry": "TW",
                    },
                },
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "首頁", "item": url("index.html")},
                    {"@type": "ListItem", "position": 2, "name": "服務項目", "item": url("index.html#services")},
                    {"@type": "ListItem", "position": 3, "name": "台中老屋延壽與老宅延壽", "item": page_url},
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": question,
                        "acceptedAnswer": {"@type": "Answer", "text": answer},
                    }
                    for question, answer in faqs
                ],
            },
        ],
    }

    html = f"""<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{html_escape(title)}</title>
    <meta name="description" content="{html_escape(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="keywords" content="台中老屋延壽, 台中老宅延壽, 老宅延壽機能復新計畫, 房屋拉皮, 整建維護, 建築物修繕補助, 何中揚建築師事務所" />
    <link rel="canonical" href="{page_url}" />
    <meta property="og:site_name" content="何中揚建築師事務所" />
    <meta property="og:title" content="{html_escape(title)}" />
    <meta property="og:description" content="{html_escape(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{page_url}" />
    <meta property="og:image" content="{url('assets/old-house-flow-source.png')}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="台中老屋延壽與老宅延壽申請｜何中揚建築師事務所" />
    <meta name="twitter:description" content="資格初判、住戶共識、結構安全性能評估、修繕項目、申請文件與施工請款流程。" />
    <link rel="stylesheet" href="styles.css?v=20260716-old-house-seo" />
    <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
  </head>
  <body class="detail-page old-house-page">
    <header class="site-header detail-header" aria-label="網站導覽">
      <a class="brand" href="index.html#top" aria-label="回到首頁"><span class="brand-mark">H</span><span class="brand-copy"><strong>何中揚建築師事務所</strong><span>HO CHUNG YANG Architecture firm + Yu-Yi Interior Design</span></span></a>
      <nav class="main-nav" aria-label="主要選單"><a href="about.html">關於我們</a><a href="projects.html">作品集</a><a href="index.html#updates">動態</a><a href="index.html#regulations">法規</a><a href="index.html#services" aria-current="page">服務</a><a href="index.html#contact">聯絡</a></nav>
    </header>
    <main class="detail-main">
      <nav class="breadcrumb" aria-label="麵包屑"><a href="index.html">首頁</a><span>/</span><a href="index.html#services">服務項目</a><span>/</span><span>老屋延壽</span></nav>
      <section class="detail-shell old-house-intro">
        <p class="eyebrow">Taichung Old House Life Extension</p>
        <h1>台中老屋延壽與老宅延壽申請</h1>
        <p>{html_escape(detail.get('lead') or service.get('description'))}</p>
        <div class="detail-highlights">{highlights}</div>
        <div class="detail-actions"><a class="button primary detail-button" href="index.html#contact">預約資格初判</a><a class="button secondary detail-button" href="#downloads">下載申請文件</a></div>
        <p class="source-stamp">資料依據：臺中市政府都市發展局老宅延壽專區及內政部公告；本頁最近整理日期 {html_escape(latest_date)}。</p>
      </section>
      <section class="expertise-note" aria-label="專業服務說明">
        <strong>由熟悉台中建管實務的建築師協助</strong>
        <p>主持建築師何中揚曾任台中市政府都市發展局建照管理科股長，可協助屋主、管委會與合作廠商釐清建物資格、申請路徑與執行介面。<a href="about.html#architectProfileTitle">查看建築師簡介</a></p>
      </section>
      <div class="service-detail-content">
        <section class="detail-section service-news-section" id="service-news"><div class="detail-section-heading"><div><p class="eyebrow">News</p><h2>台中老宅延壽最新消息</h2></div><a href="updates.html">更多動態</a></div><div class="service-news-list">{news}</div></section>
        <section class="detail-section" id="process"><div class="detail-section-heading"><div><p class="eyebrow">Process</p><h2>老屋延壽申請流程</h2></div></div><div class="process-grid">{process}</div></section>
        <section class="detail-section split-section"><div><p class="eyebrow">Official Flow</p><h2>主管機關申請流程圖</h2><p>可先用上方六個步驟掌握全貌，再開啟官方流程圖核對申請順序與文件。</p></div><a class="source-image-link" href="{html_escape(detail.get('sourceImage'))}" target="_blank" rel="noreferrer"><img src="{html_escape(detail.get('sourceImage'))}" alt="台中老宅延壽建築物修繕補助申請流程圖" /></a></section>
        <section class="detail-section detail-card-grid">{sections}</section>
        <section class="detail-section split-section"><div><p class="eyebrow">Checklist</p><h2>申請前可先準備</h2><ul class="document-list">{documents}</ul></div><div class="consult-box"><h2>先做資格初判</h2><p>可先提供建物地址、屋齡、樓層數、使用執照或建物登記資料、住戶共識與現況照片，由本所協助整理下一步。</p><a class="button primary detail-button" href="index.html#contact">聯絡何中揚建築師事務所</a></div></section>
        <section class="detail-section" id="faq"><div class="detail-section-heading"><div><p class="eyebrow">FAQ</p><h2>台中老屋延壽常見問題</h2></div></div><div class="faq-list">{faq_html}</div></section>
        <section class="detail-section" id="downloads"><div class="detail-section-heading"><div><p class="eyebrow">Official Resources</p><h2>公告、簡報與申請表下載</h2></div><p class="section-note">附件已整理於本站，點選後可直接開啟或下載。</p></div><div class="resource-grid">{resources}</div></section>
      </div>
    </main>
    <footer class="site-footer"><span>何中揚建築師事務所</span><span>台中市西區自由路一段101號20樓202室｜04-22291885</span></footer>
  </body>
</html>
"""
    (ROOT / "old-house-life-extension.html").write_text(html, encoding="utf-8")


def write_urban_renewal_page(site: dict) -> None:
    service = next(
        (item for item in site.get("services", []) if item.get("slug") == "urban-renewal-maintenance"),
        None,
    )
    if not service:
        return

    detail = service.get("detail", {})
    page_url = url("urban-renewal-maintenance.html")
    title = service.get("seoTitle") or "台中都市更新整建維護｜何中揚建築師事務所"
    description = service.get("seoDescription") or service.get("description", "")
    source_date = detail.get("sourceDate") or TODAY

    highlights = "\n".join(
        f"""<article><span>{html_escape(item.get('label'))}</span><strong>{html_escape(item.get('value'))}</strong></article>"""
        for item in detail.get("highlights", [])
    )
    presentation = detail.get("presentation", {})
    presentation_slides = presentation.get("slides", [])
    presentation_thumbnails = "\n".join(
        f"""<button class="deck-thumbnail{' is-active' if index == 0 else ''}" type="button" data-slide-index="{index}" aria-label="查看第 {index + 1} 頁：{html_escape(slide.get('title'))}">
          <img src="{html_escape(slide.get('thumbnail'))}" alt="" loading="lazy" decoding="async" />
          <span>{index + 1:02d}</span>
        </button>"""
        for index, slide in enumerate(presentation_slides)
    )
    presentation_html = ""
    presentation_script = ""
    if presentation_slides:
        first_slide = presentation_slides[0]
        presentation_payload = json.dumps(presentation_slides, ensure_ascii=False).replace("</", "<\\/")
        presentation_html = f"""<section class="detail-section presentation-section" id="presentation">
          <div class="detail-section-heading">
            <div><p class="eyebrow">Professional Briefing</p><h2>{html_escape(presentation.get('title'))}</h2></div>
            <a href="{html_escape(presentation.get('downloadHref'))}" download>下載原始簡報 PPTX</a>
          </div>
          <p class="section-note">{html_escape(presentation.get('description'))}</p>
          <div class="deck-viewer" data-presentation-viewer>
            <div class="deck-stage">
              <a href="{html_escape(first_slide.get('image'))}" id="deckStageLink" target="_blank" rel="noreferrer" aria-label="放大檢視目前投影片">
                <img src="{html_escape(first_slide.get('image'))}" id="deckStageImage" alt="第 1 頁：{html_escape(first_slide.get('title'))}" decoding="async" />
              </a>
              <button class="deck-nav deck-nav-prev" type="button" aria-label="上一張投影片" title="上一張投影片">&#8249;</button>
              <button class="deck-nav deck-nav-next" type="button" aria-label="下一張投影片" title="下一張投影片">&#8250;</button>
            </div>
            <div class="deck-meta"><span id="deckCounter">1 / {len(presentation_slides)}</span><strong id="deckTitle">{html_escape(first_slide.get('title'))}</strong></div>
            <div class="deck-thumbnails" role="list" aria-label="簡報投影片縮圖">{presentation_thumbnails}</div>
          </div>
        </section>"""
        presentation_script = f"""<script>
      (() => {{
        const slides = {presentation_payload};
        const viewer = document.querySelector("[data-presentation-viewer]");
        if (!viewer || !slides.length) return;
        const image = viewer.querySelector("#deckStageImage");
        const link = viewer.querySelector("#deckStageLink");
        const counter = viewer.querySelector("#deckCounter");
        const title = viewer.querySelector("#deckTitle");
        const thumbnails = [...viewer.querySelectorAll("[data-slide-index]")];
        let current = 0;

        const render = (index) => {{
          current = (index + slides.length) % slides.length;
          const slide = slides[current];
          image.src = slide.image;
          image.alt = `第 ${{current + 1}} 頁：${{slide.title}}`;
          link.href = slide.image;
          counter.textContent = `${{current + 1}} / ${{slides.length}}`;
          title.textContent = slide.title;
          thumbnails.forEach((button, buttonIndex) => {{
            const active = buttonIndex === current;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-current", active ? "true" : "false");
          }});
          thumbnails[current]?.scrollIntoView({{ behavior: "smooth", block: "nearest", inline: "center" }});
        }};

        viewer.querySelector(".deck-nav-prev")?.addEventListener("click", () => render(current - 1));
        viewer.querySelector(".deck-nav-next")?.addEventListener("click", () => render(current + 1));
        thumbnails.forEach((button) => button.addEventListener("click", () => render(Number(button.dataset.slideIndex))));
      }})();
    </script>"""
    process = "\n".join(
        f"""<article class="process-step"><span>{html_escape(item.get('step'))}</span><div><h3>{html_escape(item.get('title'))}</h3><p>{html_escape(item.get('text'))}</p></div></article>"""
        for item in detail.get("process", [])
    )
    sections = "\n".join(
        f"""<article class="detail-info-card"><h2>{html_escape(section.get('title'))}</h2><ul>{''.join(f'<li>{html_escape(item)}</li>' for item in section.get('items', []))}</ul></article>"""
        for section in detail.get("sections", [])
    )
    documents = "\n".join(f"<li>{html_escape(item)}</li>" for item in detail.get("documents", []))
    resources = "\n".join(
        f"""<article class="document-resource-card">
          <span class="document-type">PDF</span>
          <h3>{html_escape(item.get('title'))}</h3>
          <p>{html_escape(item.get('description'))}</p>
          <div class="document-actions">
            <a href="{html_escape(item.get('href'))}" target="_blank" rel="noreferrer">線上閱讀</a>
            <a href="{html_escape(item.get('href'))}" download>下載 PDF</a>
          </div>
        </article>"""
        for item in detail.get("resources", [])
    )
    faq_html = "\n".join(
        f"""<details class="faq-item"><summary>{html_escape(item.get('question'))}</summary><p>{html_escape(item.get('answer'))}</p></details>"""
        for item in detail.get("faqs", [])
    )
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "@id": f"{page_url}#service",
                "name": "台中都市更新整建維護服務",
                "description": description,
                "url": page_url,
                "serviceType": [
                    "都市更新整建維護",
                    "整建維護補助",
                    "自主更新補助",
                    "房屋拉皮",
                    "耐震補強",
                ],
                "areaServed": {"@type": "City", "name": "台中市"},
                "provider": {
                    "@type": "Architect",
                    "name": "何中揚建築師事務所",
                    "url": url("index.html"),
                    "telephone": "+886-4-2229-1885",
                    "email": "Hodesign2013@gmail.com",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "自由路一段101號20樓202室",
                        "addressLocality": "台中市西區",
                        "addressCountry": "TW",
                    },
                },
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "首頁", "item": url("index.html")},
                    {"@type": "ListItem", "position": 2, "name": "服務項目", "item": url("index.html#services")},
                    {"@type": "ListItem", "position": 3, "name": "都市更新整建維護", "item": page_url},
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item.get("question"),
                        "acceptedAnswer": {"@type": "Answer", "text": item.get("answer")},
                    }
                    for item in detail.get("faqs", [])
                ],
            },
        ],
    }

    html = f"""<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{html_escape(title)}</title>
    <meta name="description" content="{html_escape(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="keywords" content="台中都市更新, 都市更新整建維護, 整建維護補助, 自主更新補助, 房屋拉皮, 立面修繕, 耐震補強, 何中揚建築師事務所" />
    <link rel="canonical" href="{page_url}" />
    <meta property="og:site_name" content="何中揚建築師事務所" />
    <meta property="og:title" content="{html_escape(title)}" />
    <meta property="og:description" content="{html_escape(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{page_url}" />
    <meta property="og:image" content="{url('assets/projects/IMG_20260721_141855-clean.png')}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="台中都市更新整建維護｜何中揚建築師事務所" />
    <meta name="twitter:description" content="中央與臺中市補助比較、資格初判、住戶共識、事業計畫、審議、設計施工與文件下載。" />
    <link rel="stylesheet" href="styles.css?v=20260730-urban-renewal" />
    <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
  </head>
  <body class="detail-page urban-renewal-page">
    <header class="site-header detail-header" aria-label="網站導覽">
      <a class="brand" href="index.html#top" aria-label="回到首頁"><span class="brand-mark">H</span><span class="brand-copy"><strong>何中揚建築師事務所</strong><span>HO CHUNG YANG Architecture firm + Yu-Yi Interior Design</span></span></a>
      <nav class="main-nav" aria-label="主要選單"><a href="about.html">關於我們</a><a href="projects.html">作品集</a><a href="index.html#updates">動態</a><a href="index.html#regulations">法規</a><a href="index.html#services" aria-current="page">服務</a><a href="index.html#contact">聯絡</a></nav>
    </header>
    <main class="detail-main">
      <nav class="breadcrumb" aria-label="麵包屑"><a href="index.html">首頁</a><span>/</span><a href="index.html#services">服務項目</a><span>/</span><span>都市更新整建維護</span></nav>
      <section class="detail-shell urban-renewal-intro">
        <p class="eyebrow">Urban Renewal Renovation &amp; Maintenance</p>
        <h1>台中都市更新整建維護</h1>
        <p>{html_escape(detail.get('lead') or service.get('description'))}</p>
        <div class="detail-highlights">{highlights}</div>
        <div class="detail-actions"><a class="button primary detail-button" href="index.html#contact">預約資格初判</a><a class="button secondary detail-button" href="#downloads">閱讀與下載文件</a></div>
        <p class="source-stamp">內容依據：112 至 115 年中央都市更新基金作業須知、臺中市整建維護資料及使用者提供簡報；本頁最近整理日期 {html_escape(source_date)}。補助條件與額度以申請年度公告為準。</p>
      </section>
      <section class="expertise-note" aria-label="專業服務說明">
        <strong>從建管、都更審議到工程執行，一站式整合</strong>
        <p>主持建築師何中揚曾任台中市政府都市發展局建照管理科股長，可協助社區釐清合法建築物、權屬、違規項目、補助軌道與審議介面。<a href="about.html#architectProfileTitle">查看建築師簡介</a></p>
      </section>
      <div class="service-detail-content">
        <section class="detail-section" id="tracks">
          <div class="detail-section-heading"><div><p class="eyebrow">Two Tracks</p><h2>中央與臺中市補助怎麼選</h2></div><a href="https://twur.nlma.gov.tw/zh/urban/area/0" target="_blank" rel="noreferrer">查詢都市更新地區</a></div>
          <div class="subsidy-track-grid">
            <article><span>中央軌道</span><h3>都市更新基金</h3><p>著重單價與面積核算、大面積或完整性修繕，地方政府初審後送中央複審與核定。</p></article>
            <article><span>臺中市軌道</span><h3>地方年度專案</h3><p>依年度公告受理，須檢核區位、特定規模與優先地區；審議與核定留在地方。</p></article>
          </div>
        </section>
        {presentation_html}
        <section class="detail-section" id="process"><div class="detail-section-heading"><div><p class="eyebrow">Process</p><h2>都市更新整建維護申請流程</h2></div></div><div class="process-grid">{process}</div></section>
        <section class="detail-section detail-card-grid">{sections}</section>
        <section class="detail-section split-section"><div><p class="eyebrow">Checklist</p><h2>申請前可先準備</h2><ul class="document-list">{documents}</ul></div><div class="consult-box"><h2>先確認條件，再投入計畫成本</h2><p>可先提供建物地址、屋齡、使用執照或合法建築物證明、權屬資料、住戶共識與想改善項目，由本所協助比較中央及臺中市補助路徑。</p><a class="button primary detail-button" href="index.html#contact">聯絡何中揚建築師事務所</a></div></section>
        <section class="detail-section" id="faq"><div class="detail-section-heading"><div><p class="eyebrow">FAQ</p><h2>台中整建維護常見問題</h2></div></div><div class="faq-list">{faq_html}</div></section>
        <section class="detail-section" id="downloads"><div class="detail-section-heading"><div><p class="eyebrow">Documents</p><h2>計畫範例、補助摺頁與作業須知</h2></div><p class="section-note">每份文件均可直接線上閱讀，或下載 PDF 留存。</p></div><div class="document-resource-grid">{resources}</div></section>
      </div>
    </main>
    <footer class="site-footer"><span>何中揚建築師事務所</span><span>台中市西區自由路一段101號20樓202室｜04-22291885</span></footer>
    {presentation_script}
  </body>
</html>
"""
    (ROOT / "urban-renewal-maintenance.html").write_text(html, encoding="utf-8")


def write_search_index(site: dict, taichung: dict, nlma: dict) -> None:
    services = "\n".join(
        link_item(
            service_href(service),
            service.get("title", ""),
            service.get("seoDescription") or service.get("description", ""),
        )
        for service in site.get("services", [])
        if service.get("slug")
    )
    projects = "\n".join(
        link_item(
            project.get("href") or "projects.html",
            project.get("name", ""),
            " / ".join(filter(None, [project.get("category"), project.get("type"), project.get("location"), project.get("summary")])),
        )
        for project in site.get("projects", [])
    )
    updates = "\n".join(
        link_item(item.get("href") or "updates.html", item.get("title", ""), item.get("summary", ""))
        for item in site.get("updates", [])[:12]
    )
    nlma_items = "\n".join(
        link_item("nlma-regulations.html", category.get("name", ""), f"內政部國土管理署法規公告分類：{category.get('name', '')}")
        for category in nlma.get("categories", [])
    )
    taichung_items = "\n".join(
        link_item("taichung-regulations.html", category.get("name", ""), f"台中市建築管理與地方自治規定分類：{category.get('name', '')}")
        for category in taichung.get("categories", [])
    )

    html = f"""<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>網站搜尋索引｜台中市建築師、變更使用、老屋延壽｜何中揚建築師事務所</title>
    <meta name="description" content="何中揚建築師事務所網站搜尋索引，整理台中市建築師服務、變更使用、室內裝修、老屋延壽、房屋拉皮、整建維護、建案、共生宅、分戶、合併戶與法定空地分割等內容。" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{SITE_URL}/search-index.html" />
    <meta property="og:title" content="網站搜尋索引｜何中揚建築師事務所" />
    <meta property="og:description" content="給搜尋引擎與 AI 摘要使用的靜態索引，整理服務、作品、法規、建管實務與聯絡資訊。" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="{SITE_URL}/assets/ho-chung-yang-hero.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="網站搜尋索引｜何中揚建築師事務所" />
    <meta name="twitter:description" content="台中市建築師服務、變更使用、室內裝修、老屋延壽、房屋拉皮、整建維護與建管實務搜尋索引。" />
    <link rel="stylesheet" href="styles.css?v=20260702-search-aio" />
  </head>
  <body class="detail-page search-index-page">
    <header class="site-header detail-header" aria-label="網站導覽">
      <a class="brand" href="index.html#top" aria-label="回首頁">
        <span class="brand-mark">H</span>
        <span class="brand-copy">
          <strong>何中揚建築師事務所</strong>
          <span>HO CHUNG YANG Architecture firm + Yu-Yi Interior Design</span>
        </span>
      </a>
      <nav class="main-nav" aria-label="主要導覽">
        <a href="about.html">關於我們</a>
        <a href="projects.html">作品集</a>
        <a href="index.html#services">服務</a>
        <a href="index.html#regulations">法規</a>
        <a href="index.html#contact">聯絡</a>
      </nav>
    </header>
    <main class="detail-main">
      <section class="detail-shell">
        <p class="eyebrow">Search Index</p>
        <h1>台中市建築師服務與網站搜尋索引</h1>
        <p>本頁提供搜尋引擎與 AI 摘要工具可直接讀取的靜態索引，涵蓋變更使用、室內裝修、老屋延壽、房屋拉皮、整建維護、養生宅、共生宅、建案、分戶、合併戶、法定空地分割與建管實務。</p>
      </section>
      <section class="detail-section detail-card-grid">
        <article class="detail-info-card">
          <h2>服務項目</h2>
          <ul>{services}</ul>
        </article>
        <article class="detail-info-card">
          <h2>常見搜尋問答</h2>
          <ul>
            <li><strong>台中市變更使用或室內裝修許可可以找誰協助？</strong><p>可委託何中揚建築師事務所協助用途檢討、圖說整合、消防與建築法規檢核、申請文件準備與送審流程。</p></li>
            <li><strong>老屋延壽、房屋拉皮與整建維護要先做什麼？</strong><p>先確認屋齡、合法建築物證明、住戶共識、修繕需求與補助資格，再安排結構安全性能評估、修繕計畫與工程整合。</p></li>
            <li><strong>分戶、合併戶、法定空地分割或解除套繪可以協助嗎？</strong><p>可協助法定空地分割、解除套繪、農地解除套繪、分戶、合併戶、土地分割、使用執照影本與竣工圖說申請。</p></li>
          </ul>
        </article>
      </section>
      <section class="detail-section detail-info-card">
        <h2>作品集索引</h2>
        <ul>{projects}</ul>
      </section>
      <section class="detail-section detail-card-grid">
        <article class="detail-info-card">
          <h2>最新動態</h2>
          <ul>{updates}</ul>
        </article>
        <article class="detail-info-card">
          <h2>中央法規與解釋函令</h2>
          <ul>{nlma_items}</ul>
        </article>
        <article class="detail-info-card">
          <h2>台中市建築管理與地方法規</h2>
          <ul>{taichung_items}</ul>
        </article>
      </section>
      <section class="detail-section detail-info-card">
        <h2>聯絡資訊</h2>
        <p>何中揚建築師事務所，地址：台中市西區自由路一段101號20樓202室。電話：04-22291885 / 04-35091168。Email：Hodesign2013@gmail.com。</p>
      </section>
    </main>
  </body>
</html>
"""
    (ROOT / "search-index.html").write_text(html, encoding="utf-8")


def main() -> None:
    existing_lastmods = read_sitemap_lastmods()
    site = read_json(ROOT / "data" / "site-content.json")
    taichung = read_json(ROOT / "data" / "taichung-regulations.json")
    nlma = read_json(ROOT / "data" / "nlma-regulations.json")
    write_old_house_page(site)
    write_urban_renewal_page(site)
    write_search_index(site, taichung, nlma)

    urls: list[tuple[str, str, str]] = [
        (url("index.html"), "1.0", "weekly"),
        (url("search-index.html"), "0.9", "weekly"),
        (url("about.html"), "0.9", "monthly"),
        (url("projects.html"), "0.9", "monthly"),
        (url("central-interpretations.html"), "0.8", "monthly"),
        (url("nlma-regulations.html"), "0.8", "weekly"),
        (url("taichung-regulations.html"), "0.8", "weekly"),
        (url("building-practice.html"), "0.8", "monthly"),
        (url("llms.txt"), "0.5", "monthly"),
    ]

    for service in site.get("services", []):
        slug = service.get("slug")
        if slug:
            urls.append((url(service_href(service)), "0.9", "monthly" if slug != "old-house-life-extension" else "weekly"))

    for project in site.get("projects", []):
        href = project.get("href")
        if href and href.startswith("project.html"):
            urls.append((url(href), "0.8", "monthly"))

    for category in nlma.get("categories", []):
        urls.append((url(f"nlma-regulation-category.html?category={quote(category['slug'])}"), "0.7", "weekly"))
        for item in category.get("items", []):
            urls.append((url(f"nlma-regulation-detail.html?id={quote(item['id'])}"), "0.5", "monthly"))

    for category in taichung.get("categories", []):
        urls.append((url(f"taichung-regulation-category.html?category={quote(category['slug'])}"), "0.7", "weekly"))
        for item in category.get("items", []):
            urls.append((url(f"taichung-regulation-detail.html?id={quote(item['id'])}"), "0.5", "monthly"))

    updated_urls = {
        url("index.html"),
        url("search-index.html"),
        url("urban-renewal-maintenance.html"),
    }
    sitemap_rows = [
        sitemap_entry(
            *entry,
            lastmod=TODAY if entry[0] in updated_urls else existing_lastmods.get(entry[0], TODAY),
        )
        for entry in urls
    ]
    xml = "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            *sitemap_rows,
            "</urlset>",
            "",
        ]
    )
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")

    robots = "\n".join(
        [
            "User-agent: *",
            "Allow: /",
            "Allow: /llms.txt",
            "Disallow: /admin/",
            "Disallow: /building-practice-admin.html",
            f"Sitemap: {url('sitemap.xml')}",
            "",
        ]
    )
    (ROOT / "robots.txt").write_text(robots, encoding="utf-8")
    print(f"wrote {len(urls)} sitemap urls")


if __name__ == "__main__":
    main()
