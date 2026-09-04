from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "icon.png"

source = Image.open(SOURCE).convert("RGBA")

# Treat the source's near-white canvas as transparent so it can sit cleanly on brand backgrounds.
pixels = source.load()
for y in range(source.height):
    for x in range(source.width):
        red, green, blue, alpha = pixels[x, y]
        if red > 246 and green > 246 and blue > 246:
            pixels[x, y] = (255, 255, 255, 0)

resampling = Image.Resampling.LANCZOS

# Main iOS/Expo icon: opaque 1024px square with the complete logo centered.
main = Image.new("RGBA", (1024, 1024), "#F5F0EB")
logo = source.copy()
logo.thumbnail((880, 620), resampling)
main.alpha_composite(logo, ((1024 - logo.width) // 2, (1024 - logo.height) // 2))
main.convert("RGB").save(ASSETS / "icon.png", quality=95)

# Android adaptive foreground: transparent square with artwork inside the safe zone.
foreground = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
fg_logo = source.copy()
fg_logo.thumbnail((610, 610), resampling)
foreground.alpha_composite(fg_logo, ((1024 - fg_logo.width) // 2, (1024 - fg_logo.height) // 2))
foreground.save(ASSETS / "android-icon-foreground.png")

# Android monochrome layer: black silhouette with transparent background.
monochrome = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
alpha = fg_logo.getchannel("A")
black = Image.new("RGBA", fg_logo.size, (0, 0, 0, 255))
black.putalpha(alpha)
monochrome.alpha_composite(black, ((1024 - black.width) // 2, (1024 - black.height) // 2))
monochrome.save(ASSETS / "android-icon-monochrome.png")
