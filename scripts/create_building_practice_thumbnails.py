from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA_JSON = ROOT / "data" / "building-practice.json"
THUMB_DIR = ROOT / "assets" / "regulations" / "building-practice" / "thumbs"


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/msjhbd.ttc" if bold else "C:/Windows/Fonts/msjh.ttc"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.ImageFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        test = current + char
        box = draw.textbbox((0, 0), test, font=face)
        if box[2] - box[0] > width and current:
            lines.append(current)
            current = char
        else:
            current = test
    if current:
        lines.append(current)
    return lines[:3]


def make_thumb(title: str, index: int, out: Path) -> None:
    image = Image.new("RGB", (960, 560), "#f7f9fc")
    draw = ImageDraw.Draw(image)
    blue = "#0f62fe"
    charcoal = "#20272f"
    silver = "#d9dfe8"
    accent = "#06c755"

    draw.rectangle((0, 0, 960, 560), fill="#f4f7fb")
    draw.rectangle((50, 46, 910, 514), fill="#ffffff", outline=silver, width=2)
    draw.rectangle((50, 46, 910, 118), fill="#111827")
    draw.text((84, 70), "建管實務", fill="#ffffff", font=font(24, True))
    draw.rounded_rectangle((760, 66, 850, 98), radius=6, fill="#d92d20")
    draw.text((789, 69), "PDF", fill="#ffffff", font=font(22, True))
    draw.text((84, 150), f"0{index}", fill=blue, font=font(46, True))

    title_face = font(42, True)
    y = 220
    for line in wrap_text(draw, title, title_face, 720):
        draw.text((84, y), line, fill=charcoal, font=title_face)
        y += 56

    draw.line((84, 430, 700, 430), fill=silver, width=2)
    draw.text((84, 454), "臺中市都市發展局 / 建管作業參考手冊", fill="#5f6b7a", font=font(22))
    draw.ellipse((790, 400, 875, 485), fill=accent)
    draw.text((812, 420), "DL", fill="#ffffff", font=font(30, True))
    image.save(out, quality=92)


def main() -> None:
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(DATA_JSON.read_text(encoding="utf-8-sig"))
    for post in data["posts"]:
        for index, file in enumerate(post["files"], start=1):
            out = THUMB_DIR / f"{file['id']}.jpg"
            make_thumb(file["title"], index, out)
            file["thumbnail"] = str(out.relative_to(ROOT)).replace("\\", "/")
        post["thumbnail"] = post["files"][0]["thumbnail"]

    text = json.dumps(data, ensure_ascii=False, indent=2)
    DATA_JSON.write_text(text + "\n", encoding="utf-8")
    (ROOT / "data" / "building-practice.js").write_text("window.BUILDING_PRACTICE = " + text + ";\n", encoding="utf-8")
    print(f"thumbnails={sum(len(post['files']) for post in data['posts'])}")


if __name__ == "__main__":
    main()
