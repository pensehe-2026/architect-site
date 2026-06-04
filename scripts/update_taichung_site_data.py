from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE_JSON = ROOT / "data" / "site-content.json"
SITE_JS = ROOT / "data" / "site-content.js"
TAICHUNG_JSON = ROOT / "data" / "taichung-regulations.json"


def main() -> None:
    site = json.loads(SITE_JSON.read_text(encoding="utf-8-sig"))
    taichung = json.loads(TAICHUNG_JSON.read_text(encoding="utf-8-sig"))

    latest_updates = []
    for item in taichung["latestAnnouncements"][:2]:
        latest_updates.append(
            {
                "date": item.get("date") or "2026-06-02",
                "title": item["title"],
                "category": "台中公告",
                "summary": item.get("fields", {}).get("發文字號") or "臺中市政府主管法規查詢系統都市發展類公告。",
                "href": f"taichung-regulation-detail.html?id={item['id']}",
            }
        )

    existing_updates = [
        item
        for item in site.get("updates", [])
        if not (item.get("category") == "台中公告" and str(item.get("href", "")).startswith("taichung-regulation-detail.html?id="))
    ]
    site["updates"] = latest_updates + existing_updates

    for regulation in site.get("regulations", []):
        if regulation.get("title") == "台中市建築管理與地方自治規定":
            regulation["description"] = "依臺中市政府主管法規查詢系統都市發展類整理自治條例、自治規則、行政規則、公告與實質意義法規命令。"
            regulation["href"] = "taichung-regulations.html"

    site["version"] = "2026.06.02-taichung-laws"
    site["lastUpdated"] = "2026-06-02T17:30:00+08:00"

    text = json.dumps(site, ensure_ascii=False, indent=4)
    SITE_JSON.write_text(text + "\n", encoding="utf-8")
    SITE_JS.write_text("window.SITE_CONTENT = " + text + ";\n", encoding="utf-8")
    print(f"updates={len(site['updates'])}")
    for item in latest_updates:
        print(f"{item['date']} {item['title']}")


if __name__ == "__main__":
    main()
