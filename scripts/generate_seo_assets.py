from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://www.hcy-architecture.com.tw"
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


def main() -> None:
    site = read_json(ROOT / "data" / "site-content.json")
    taichung = read_json(ROOT / "data" / "taichung-regulations.json")
    nlma = read_json(ROOT / "data" / "nlma-regulations.json")

    urls: list[tuple[str, str, str]] = [
        (url("index.html"), "1.0", "weekly"),
        (url("projects.html"), "0.9", "monthly"),
        (url("central-interpretations.html"), "0.8", "monthly"),
        (url("nlma-regulations.html"), "0.8", "weekly"),
        (url("taichung-regulations.html"), "0.8", "weekly"),
        (url("building-practice.html"), "0.8", "monthly"),
        (url("building-practice-admin.html"), "0.2", "yearly"),
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
            f"Sitemap: {url('sitemap.xml')}",
            "",
        ]
    )
    (ROOT / "robots.txt").write_text(robots, encoding="utf-8")
    print(f"wrote {len(urls)} sitemap urls")


if __name__ == "__main__":
    main()
