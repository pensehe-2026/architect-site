from __future__ import annotations

import json
import re
import ssl
import time
from datetime import datetime, timezone, timedelta
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://www.ud.taichung.gov.tw/28928/29030/29033/349764"
OUT_DIR = ROOT / "assets" / "regulations" / "building-practice" / "taichung"
DATA_DIR = ROOT / "data"
TAIPEI = timezone(timedelta(hours=8))
MAX_ATTEMPTS = 3


class FileListParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.files: list[dict[str, str]] = []
        self._in_link = False
        self._href = ""
        self._text = ""
        self._last_file: dict[str, str] | None = None
        self._in_size = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {key: value or "" for key, value in attrs}
        if tag == "a" and attrs_dict.get("href", "").lower().endswith(".pdf"):
            self._in_link = True
            self._href = attrs_dict["href"]
            self._text = ""
        if tag == "span" and attrs_dict.get("class") == "fileSize":
            self._in_size = True

    def handle_data(self, data: str) -> None:
        if self._in_link:
            self._text += data
        elif self._in_size and self._last_file is not None:
            self._last_file["size"] = clean(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._in_link:
            item = {"title": clean(self._text), "href": self._href, "size": ""}
            self.files.append(item)
            self._last_file = item
            self._in_link = False
        elif tag == "span" and self._in_size:
            self._in_size = False


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def safe_name(value: str) -> str:
    value = re.sub(r'[\\/:*?"<>|]+', "-", clean(value))
    return value.strip(".- ")[:150] or "download.pdf"


def quote_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, quote(parts.path), parts.query, parts.fragment))


def fetch(url: str) -> bytes:
    request = Request(
        quote_url(url),
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.6",
        },
    )
    context = ssl.create_default_context()
    # Python 3.13+ enables OpenSSL strict-chain checks that reject this
    # government site's otherwise trusted certificate because an intermediate
    # certificate omits Subject Key Identifier. Keep certificate and hostname
    # verification enabled while relaxing only that extra strict-chain flag.
    if hasattr(ssl, "VERIFY_X509_STRICT"):
        context.verify_flags &= ~ssl.VERIFY_X509_STRICT

    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urlopen(request, timeout=90, context=context) as response:
                return response.read()
        except Exception as error:  # Network and upstream HTTP failures are retriable.
            last_error = error
            if attempt < MAX_ATTEMPTS:
                time.sleep(attempt * 3)
    assert last_error is not None
    raise last_error


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    html = fetch(SOURCE_URL).decode("utf-8", errors="replace")
    parser = FileListParser()
    parser.feed(html)
    if not parser.files:
        raise RuntimeError("The source page returned no PDF links; preserving the previous snapshot.")

    files = []
    warnings = []
    for index, file in enumerate(parser.files, start=1):
        official_url = urljoin(SOURCE_URL, file["href"])
        filename = safe_name(file["title"])
        target = OUT_DIR / filename
        item = {
            "id": f"taichung-{index:02d}",
            "city": "臺中市",
            "category": "作業流程",
            "title": file["title"].removesuffix(".pdf"),
            "fileName": filename,
            "size": file.get("size", ""),
            "officialUrl": official_url,
        }
        try:
            payload = fetch(official_url)
            if not payload.startswith(b"%PDF"):
                raise RuntimeError("response is not a PDF")
            temporary = target.with_suffix(target.suffix + ".tmp")
            temporary.write_bytes(payload)
            temporary.replace(target)
        except Exception as error:
            warnings.append(f"{filename}: {error}")
        if target.exists():
            item["localFile"] = str(target.relative_to(ROOT)).replace("\\", "/")
        files.append(item)

    data = {
        "title": "建管實務",
        "source": "臺中市政府都市發展局",
        "sourceUrl": SOURCE_URL,
        "updatedAt": datetime.now(TAIPEI).replace(microsecond=0).isoformat(),
        "categories": [
            {"slug": "taichung", "name": "臺中市", "count": len(files)},
            {"slug": "forms", "name": "圖說與表單", "count": 4},
            {"slug": "faq", "name": "常見問題", "count": 1},
        ],
        "posts": [
            {
                "id": "taichung-building-practice-manual",
                "city": "臺中市",
                "category": "作業流程",
                "title": "臺中市建管作業參考手冊",
                "date": "2024-10-08",
                "summary": "彙整臺中市建造執照、雜項執照、面積計算、地籍套繪與補照流程等建管實務文件，供申請前查核使用。",
                "sourceUrl": SOURCE_URL,
                "files": files,
            }
        ],
    }
    text = json.dumps(data, ensure_ascii=False, indent=2)
    (DATA_DIR / "building-practice.json").write_text(text + "\n", encoding="utf-8")
    (DATA_DIR / "building-practice.js").write_text("window.BUILDING_PRACTICE = " + text + ";\n", encoding="utf-8")
    print(f"downloaded={len(files)}")
    print(f"warnings={len(warnings)}")
    for file in files:
        print(file["fileName"])
    for warning in warnings:
        print(f"warning: {warning}")


if __name__ == "__main__":
    main()
