from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://bauhaus.com.tw"
TODAY = date.today().isoformat()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def url(path: str) -> str:
    return f"{SITE_URL.rstrip('/')}/{path.lstrip('/')}"


def sitemap_entry(loc: str, priority: str = "0.6", changefreq: str = "monthly") -> str:
    return "\n".join(
        [
            "  <url>",
            f"    <loc>{escape(loc)}</loc>",
            f"    <lastmod>{TODAY}</lastmod>",
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


def write_search_index(site: dict, taichung: dict, nlma: dict) -> None:
    services = "\n".join(
        link_item(
            f"service.html?item={quote(service.get('slug', ''))}",
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
    site = read_json(ROOT / "data" / "site-content.json")
    taichung = read_json(ROOT / "data" / "taichung-regulations.json")
    nlma = read_json(ROOT / "data" / "nlma-regulations.json")
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
            urls.append((url(f"service.html?item={quote(slug)}"), "0.9", "monthly"))

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

    xml = "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            *[sitemap_entry(*entry) for entry in urls],
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
