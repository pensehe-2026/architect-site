from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAIRS = [
    ("data/site-content.json", "data/site-content.js", "SITE_CONTENT"),
    ("data/building-practice.json", "data/building-practice.js", "BUILDING_PRACTICE"),
]


def main() -> None:
    for json_path, js_path, global_name in PAIRS:
        source = ROOT / json_path
        target = ROOT / js_path
        data = json.loads(source.read_text(encoding="utf-8-sig"))
        text = json.dumps(data, ensure_ascii=False, indent=2)
        target.write_text(f"window.{global_name} = {text};\n", encoding="utf-8")
        print(f"synced {json_path} -> {js_path}")


if __name__ == "__main__":
    main()
