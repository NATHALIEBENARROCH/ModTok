"""Builds the ModTok website into /docs (served by GitHub Pages).

Edit website/content/*.md or the settings below, then run:  python3 website/build.py
"""
import pathlib, shutil, markdown

SUPPORT_EMAIL = "{{SUPPORT_EMAIL}}"   # <- set the real support email here
SITE_URL = "https://nathaliebenarroch.github.io/ModTok/"

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs"
CONTENT = ROOT / "website" / "content"

PAGES = [  # (file, nav label, page title)
    ("privacy", "Privacy", "Privacy Policy"),
    ("terms", "Terms", "Terms of Use"),
    ("refunds", "Refunds", "Refund Policy"),
    ("support", "Support", "Support"),
]

CSS = """
:root{--coral:#E0706A;--coral-soft:#F6DCD8;--ink:#1A1A1A;--muted:#5E5854;--cream:#F5F0EB;--card:#FFFFFF;--line:#E6DDD5}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.65 Poppins,system-ui,-apple-system,Segoe UI,sans-serif}
a{color:var(--ink);text-decoration-color:var(--coral);text-underline-offset:3px}
a:hover{color:var(--coral)}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{background:#fff;border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px;flex-wrap:wrap}
.brand img{height:54px;display:block}
nav{display:flex;gap:18px;flex-wrap:wrap;font-size:15px;font-weight:500}
nav a{text-decoration:none}
nav a[aria-current]{color:var(--coral)}
.hero{padding:64px 0 40px;display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center}
.hero h1{font-size:clamp(34px,6vw,54px);line-height:1.08;margin:0 0 16px;letter-spacing:-.02em}
.hero h1 em{font-style:normal;color:var(--coral);white-space:nowrap}
.hero p{font-size:18px;color:var(--muted);margin:0 0 26px;max-width:34em}
.pill{display:inline-block;background:var(--ink);color:#fff;border-radius:999px;padding:12px 22px;font-weight:600;text-decoration:none}
.pill:hover{color:#fff;background:#333}
.hero-card{background:#fff;border-radius:28px;padding:28px;border:1px solid var(--line);text-align:center}
.hero-card img{width:100%;max-width:300px}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;padding:8px 0 56px}
.feature{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px}
.feature h3{margin:0 0 6px;font-size:18px}
.feature p{margin:0;color:var(--muted);font-size:15px}
.dot{width:10px;height:10px;border-radius:50%;background:var(--coral);display:inline-block;margin-right:8px}
.band{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:40px 0}
.band h2{margin:0 0 10px;font-size:26px}
.band p{margin:0;color:var(--muted);max-width:46em}
.doc{background:#fff;border:1px solid var(--line);border-radius:22px;padding:clamp(22px,4vw,48px);margin:36px auto 56px;max-width:820px}
.doc h1{font-size:clamp(28px,5vw,38px);line-height:1.15;margin:0 0 18px}
.doc h2{font-size:21px;margin:34px 0 8px}
.doc h3{font-size:17px;margin:24px 0 6px}
.doc table{width:100%;border-collapse:collapse;font-size:14.5px;margin:12px 0;display:block;overflow-x:auto}
.doc th,.doc td{border:1px solid var(--line);padding:9px 11px;text-align:left;vertical-align:top}
.doc th{background:var(--cream)}
.doc li{margin:4px 0}
footer{padding:28px 0 40px;color:var(--muted);font-size:14px}
footer .wrap{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media (max-width:760px){.hero{grid-template-columns:1fr;padding-top:40px}.hero-card{order:-1}}
"""

def page(title, body, current=None, description="ModTok: your smart wardrobe and pre-loved fashion marketplace."):
    cur = ' aria-current="page"'
    nav = "".join(
        f'<a href="{f}.html"{cur if f == current else ""}>{label}</a>'
        for f, label, _ in PAGES
    )
    year = 2026
    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="icon" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head><body>
<header><div class="wrap"><a class="brand" href="index.html" aria-label="ModTok home"><img src="logo.png" alt="ModTok"></a><nav>{nav}</nav></div></header>
<main>{body}</main>
<footer><div class="wrap"><span>© {year} Nathalie Benarroch · ModTok · Montréal, Québec, Canada</span><span><a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></span></div></footer>
</body></html>
"""

HOME = """
<section class="wrap hero">
  <div>
    <h1>Style it. Share it. <em>Sell it.</em></h1>
    <p>ModTok is your smart wardrobe. Photograph the clothes you own, build outfits in seconds, share your looks, and sell the pieces you no longer wear to other ModTok members.</p>
    <a class="pill" href="support.html">Contact support</a>
  </div>
  <div class="hero-card"><img src="logo.png" alt="ModTok logo"></div>
</section>
<section class="wrap features">
  <div class="feature"><h3><span class="dot"></span>Add your closet</h3><p>Photograph clothes or import them from your photos. Sort by category, season and colour.</p></div>
  <div class="feature"><h3><span class="dot"></span>Style outfits</h3><p>Swipe through tops, bottoms and shoes to build a look, then save it to your collections.</p></div>
  <div class="feature"><h3><span class="dot"></span>Share your style</h3><p>Post looks as stories and tag items you're selling so followers can shop them.</p></div>
  <div class="feature"><h3><span class="dot"></span>Buy &amp; sell pre-loved</h3><p>List an item in a few taps. Buyers pay securely by card through Stripe and follow the order to delivery.</p></div>
</section>
<section class="band"><div class="wrap">
  <h2>How payments work</h2>
  <p>ModTok is a peer-to-peer marketplace for physical clothing and accessories. Buyers pay by card in U.S. dollars through Stripe, and prices are shown in full before payment. Sellers are paid out by Stripe after the sale, and ModTok keeps a 10% fee on the item price. Sellers ship within three business days and add tracking in the app. Refunds are covered by our <a href="refunds.html">Refund Policy</a>. Marketplace buying and selling is currently available for U.S. shipping addresses.</p>
</div></section>
"""

def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    (OUT / "style.css").write_text(CSS.strip() + "\n")
    shutil.copy(ROOT / "assets" / "logo.png", OUT / "logo.png")
    shutil.copy(ROOT / "assets" / "favicon.png", OUT / "favicon.png")
    (OUT / ".nojekyll").write_text("")
    (OUT / "index.html").write_text(page("ModTok: Style, share, sell your closet", HOME))
    for f, _, title in PAGES:
        md = (CONTENT / f"{f}.md").read_text()
        md = md.replace("{{SUPPORT_EMAIL}}", SUPPORT_EMAIL).replace("{{SITE_URL}}", SITE_URL)
        html = markdown.markdown(md, extensions=["tables", "sane_lists"])
        (OUT / f"{f}.html").write_text(page(f"{title} · ModTok", f'<article class="wrap"><div class="doc">{html}</div></article>', f))
    print("Built", sorted(p.name for p in OUT.iterdir()))

if __name__ == "__main__":
    main()
