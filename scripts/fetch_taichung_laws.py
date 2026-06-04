from __future__ import annotations

import json
import re
import time
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen


BASE_URL = "https://law.taichung.gov.tw/"
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "regulations" / "taichung"
PAGES_DIR = OUT_DIR / "pages"
FILES_DIR = OUT_DIR / "files"
DATA_DIR = ROOT / "data"

CATEGORIES = [
    {"id": "030801", "slug": "ordinances", "name": "自治條例"},
    {"id": "030802", "slug": "rules", "name": "自治規則"},
    {"id": "030803", "slug": "administrative-rules", "name": "行政規則"},
    {"id": "030804", "slug": "announcements", "name": "公告"},
    {"id": "030805", "slug": "substantive-regulations", "name": "實質意義法規命令"},
]


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[dict[str, str]]] = []
        self._row: list[dict[str, str]] | None = None
        self._cell: dict[str, str] | None = None
        self._capture_cell = False
        self._current_link = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {key: value or "" for key, value in attrs}
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._capture_cell = True
            self._cell = {"text": "", "href": ""}
        elif tag == "a" and self._cell is not None:
            self._current_link = attrs_dict.get("href", "")
            if self._current_link and not self._cell["href"]:
                self._cell["href"] = self._current_link

    def handle_data(self, data: str) -> None:
        if self._capture_cell and self._cell is not None:
            self._cell["text"] += data

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._row is not None and self._cell is not None:
            self._cell["text"] = clean_text(self._cell["text"])
            self._row.append(self._cell)
            self._cell = None
            self._capture_cell = False
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
            self._row = None


def fetch(url: str) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.5",
        },
    )
    with urlopen(request, timeout=30) as response:
        return response.read()


def decode_html(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "big5", "cp950"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value)
    value = unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def safe_name(value: str, fallback: str) -> str:
    value = clean_text(value)
    value = re.sub(r'[\\/:*?"<>|]+', "-", value)
    value = re.sub(r"\s+", "-", value).strip(".- ")
    return (value or fallback)[:120]


def roc_to_iso(value: str) -> str:
    simple = re.search(r"(\d{2,3})\.(\d{1,2})\.(\d{1,2})", value)
    verbose = re.search(r"民國\s*(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日", value)
    match = simple or verbose
    if not match:
        return ""
    year = int(match.group(1)) + 1911
    return f"{year:04d}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"


def parse_page_count(html: str) -> int:
    counts = [int(item) for item in re.findall(r"page=(\d+)", html)]
    return max(counts) if counts else 1


def parse_list_rows(html: str) -> list[dict[str, str]]:
    parser = TableParser()
    parser.feed(html)
    items: list[dict[str, str]] = []
    for row in parser.rows:
        if len(row) < 4:
            continue
        href = row[2].get("href", "")
        title = row[2].get("text", "")
        if "LawContent.aspx" not in href or not title:
            continue
        law_id_match = re.search(r"id=([^&]+)", href)
        law_id = law_id_match.group(1) if law_id_match else safe_name(title, "law")
        items.append(
            {
                "id": law_id,
                "dateRoc": row[1]["text"],
                "date": roc_to_iso(row[1]["text"]),
                "title": title,
                "type": row[3]["text"],
                "href": href,
                "officialUrl": urljoin(BASE_URL, href),
            }
        )
    return items


def parse_detail(html: str) -> dict[str, object]:
    fields: dict[str, str] = {}
    for th, td in re.findall(r"<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>", html, re.S):
        label = clean_text(th).rstrip("：:")
        text = clean_text(td)
        if label:
            fields[label] = text

    attachments = []
    for href, name in re.findall(r'href="(Download\.ashx\?[^"]+)".*?>(.*?)</a>', html, re.S):
        attachments.append({"href": urljoin(BASE_URL, unescape(href)), "name": clean_text(name)})

    paragraphs = [clean_text(part) for part in re.findall(r'class="law-paragraph"[^>]*>(.*?)</div>', html, re.S)]
    paragraphs = [part for part in paragraphs if part]
    if not paragraphs:
        content_match = re.search(r'id="ctl00_cp_content_divContent"[^>]*>(.*?)</div>\s*</div>\s*</div>', html, re.S)
        if content_match:
            paragraphs = [clean_text(content_match.group(1))]

    return {"fields": fields, "attachments": attachments, "paragraphs": paragraphs}


def download_attachment(item_id: str, attachment: dict[str, str]) -> dict[str, str]:
    target_dir = FILES_DIR / safe_name(item_id, "item")
    target_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(attachment["name"]).suffix or ".pdf"
    filename = safe_name(Path(attachment["name"]).stem, "attachment") + suffix
    target = target_dir / filename
    if not target.exists():
        target.write_bytes(fetch(attachment["href"]))
        time.sleep(0.15)
    return {
        "name": attachment["name"],
        "officialUrl": attachment["href"],
        "localFile": str(target.relative_to(ROOT)).replace("\\", "/"),
    }


def build() -> dict[str, object]:
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    categories = []
    all_items = []
    for category in CATEGORIES:
        first_url = urljoin(BASE_URL, f"LawCategoryContentList.aspx?CategoryID={category['id']}")
        first_html = decode_html(fetch(first_url))
        page_count = parse_page_count(first_html)
        rows = parse_list_rows(first_html)
        for page in range(2, page_count + 1):
            page_url = urljoin(BASE_URL, f"LawCategoryContentList.aspx?CategoryID={category['id']}&page={page}")
            rows.extend(parse_list_rows(decode_html(fetch(page_url))))
            time.sleep(0.15)

        seen = set()
        items = []
        for row in rows:
            if row["id"] in seen:
                continue
            seen.add(row["id"])
            raw = fetch(row["officialUrl"])
            html = decode_html(raw)
            local_page = PAGES_DIR / f"{safe_name(row['id'], 'law')}.html"
            local_page.write_text(html, encoding="utf-8")
            detail = parse_detail(html)
            attachments = [download_attachment(row["id"], item) for item in detail["attachments"]]  # type: ignore[index]
            item = {
                **row,
                "categoryId": category["id"],
                "categorySlug": category["slug"],
                "categoryName": category["name"],
                "localPage": str(local_page.relative_to(ROOT)).replace("\\", "/"),
                "fields": detail["fields"],
                "attachments": attachments,
                "paragraphs": detail["paragraphs"],
            }
            if not item["date"]:
                item["date"] = roc_to_iso(str(item["fields"].get("公發布日", "")))
            items.append(item)
            all_items.append(item)
            time.sleep(0.15)

        items.sort(key=lambda item: item.get("date") or "", reverse=True)
        categories.append({**category, "count": len(items), "items": items})

    announcements = next((cat["items"] for cat in categories if cat["id"] == "030804"), [])
    return {
        "source": "臺中市政府主管法規查詢系統",
        "sourceUrl": urljoin(BASE_URL, "LawCategoryMain.aspx?type=M&CategoryID=0308"),
        "generatedAt": "2026-06-02T00:00:00+08:00",
        "total": len(all_items),
        "categories": categories,
        "latestAnnouncements": announcements[:2],
    }


def main() -> None:
    data = build()
    json_path = DATA_DIR / "taichung-regulations.json"
    js_path = DATA_DIR / "taichung-regulations.js"
    json_text = json.dumps(data, ensure_ascii=False, indent=2)
    json_path.write_text(json_text + "\n", encoding="utf-8")
    js_path.write_text("window.TAICHUNG_REGULATIONS = " + json_text + ";\n", encoding="utf-8")
    print(f"categories={len(data['categories'])} total={data['total']}")
    for category in data["categories"]:
        print(f"{category['name']}: {category['count']}")
    for item in data["latestAnnouncements"]:
        print(f"announcement: {item['date']} {item['title']}")


if __name__ == "__main__":
    main()
