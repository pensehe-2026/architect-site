from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LINE_GREEN = "#06c755"
ACCOUNTS = [
    {
        "out": ROOT / "assets" / "line-official-account-976udzzw.jpg",
        "url": "https://line.me/R/ti/p/@976udzzw",
        "name": "何中揚建築師事務所",
        "id": "@976udzzw",
    },
    {
        "out": ROOT / "assets" / "line-official-account.jpg",
        "url": "https://line.me/R/ti/p/@305brovc",
        "name": "何中揚建築師事務所（公安申報）",
        "id": "@305brovc",
    },
]


def font(size: int) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/msjh.ttc"),
        Path("C:/Windows/Fonts/mingliu.ttc"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def centered(draw: ImageDraw.ImageDraw, width: int, text: str, y: int, face: ImageFont.ImageFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=face)
    draw.text(((width - (box[2] - box[0])) / 2, y), text, font=face, fill=fill)


def main() -> None:
    for account in ACCOUNTS:
        url = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=" + quote(account["url"], safe="")
        with urlopen(url, timeout=30) as response:
            qr = Image.open(BytesIO(response.read())).convert("RGB")

        qr = qr.resize((300, 300), Image.Resampling.NEAREST)
        pixels = qr.load()
        for y in range(qr.height):
            for x in range(qr.width):
                r, g, b = pixels[x, y]
                if r < 80 and g < 80 and b < 80:
                    pixels[x, y] = tuple(int(LINE_GREEN[index : index + 2], 16) for index in (1, 3, 5))

        canvas = Image.new("RGB", (343, 384), "white")
        canvas.paste(qr, (22, 16))
        draw = ImageDraw.Draw(canvas)
        centered(draw, canvas.width, account["name"], 318, font(15), "#111827")
        centered(draw, canvas.width, f"LINE ID：{account['id']}", 344, font(16), "#111827")
        canvas.save(account["out"], quality=94)
        print(account["out"])


if __name__ == "__main__":
    main()
