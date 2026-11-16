#!/usr/bin/env python3
"""Build the Hey Jude site pages.

Each file in src/pages/ holds only the main content of one page. This script
wraps it in the shared <head>, header and footer, so every page has the same
navigation and footer, and writes the finished page to the site root:

    src/pages/index.html  ->  index.html   (served at /)
    src/pages/menu.html   ->  menu.html    (served at /menu)
    ...

Run it after changing anything in src/:   python3 tools/build_pages.py
"""
import html
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORDER_URL = "https://smart-cafe-liard.vercel.app/menu"
# Contact email to show on the site. It isn't stored in this file: set it when you build, e.g.
#   CAFE_EMAIL=hello@example.com python3 tools/build_pages.py
# Left unset, the site sends people to the Contact page instead.
EMAIL = os.environ.get("CAFE_EMAIL", "").strip()
INSTAGRAM = "https://www.instagram.com/heyjudecafe_/"
SITE = "https://cafe-n2mj.vercel.app"

# The café's Spotify playlist, e.g. "https://open.spotify.com/playlist/37i9dQZF1DX..."
# Leave empty and the "What's playing" section stays off the home page.
PLAYLIST_URL = ""

# Real reviews only, copied word for word with the café's OK. Leave empty to hide the section.
# Example: {"quote": "Best eggs bene in Tauranga.", "who": "Sam", "source": "Google review", "link": "https://..."}
REVIEWS = []

# file, path, nav key, <title>, description, page script, social image
PAGES = [
    ("index", "/", None, "Hey Jude Cafe, Brookfield, Tauranga",
     "Hey Jude Cafe in Brookfield, Tauranga: breakfast, brunch and lunch, Sacred Grounds coffee and music on the walls. Open every day, 7am to 3pm.",
     "home.js", "/images/reserved.webp"),
    ("menu", "/menu", "menu", "Menu | Hey Jude Cafe",
     "Today’s breakfast, lunch, cabinet food and Sacred Grounds coffee at Hey Jude Cafe in Brookfield, Tauranga.",
     "menu.js", "/images/menu/eggs-benedict.webp"),
    ("about", "/about", "about", "About | Hey Jude Cafe",
     "How a morning cinnamon roll and flat white led to Hey Jude, the music-filled café in Brookfield, Tauranga.",
     "gallery.js", "/images/menu/bookshelf.webp"),
    ("visit", "/visit", "visit", "Visit | Hey Jude Cafe",
     "Find Hey Jude at 2 Jude Place, Brookfield, Tauranga. Open every day 7am to 3pm. Dogs welcome.",
     None, "/images/reserved.webp"),
    ("book", "/book", "book", "Book a table | Hey Jude Cafe",
     "Book a table at Hey Jude Cafe in Brookfield, Tauranga.",
     "book.js", "/images/reserved.webp"),
    ("contact", "/contact", "contact", "Contact | Hey Jude Cafe",
     "Get in touch with Hey Jude Cafe in Brookfield, Tauranga. Send a message, find us on Instagram, or visit at 2 Jude Place.",
     "contact.js", "/images/menu/wall-flowers.webp"),
    ("privacy", "/privacy", "privacy", "Your details | Hey Jude Cafe",
     "How Hey Jude Cafe handles the details you give when you book a table.",
     None, "/images/reserved.webp"),
    ("404", None, None, "Page not found | Hey Jude Cafe",
     "The page you’re looking for isn’t on the Hey Jude Cafe website. Find the menu, bookings and opening hours from here.", None, "/images/reserved.webp"),
]

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
           "%3Crect width='64' height='64' rx='14' fill='%23E2B33C'/%3E"
           "%3Cpath d='M16 24h26v14a11 11 0 0 1-11 11h-4a11 11 0 0 1-11-11z' fill='%232A1C14'/%3E"
           "%3Cpath d='M42 28h4a6 6 0 0 1 0 12h-4' stroke='%232A1C14' stroke-width='4' fill='none'/%3E%3C/svg%3E")

HEAD = """<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#E2B33C">
{canonical}<meta property="og:type" content="website">
<meta property="og:site_name" content="Hey Jude Cafe">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{site}{image}">
<link rel="icon" href="{favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&amp;family=Figtree:ital,wght@0,400;0,500;0,600;1,400&amp;display=swap">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/transitions.js"></script>
<script src="/assets/site.js" defer></script>
{page_script}{extra_head}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<aside class="proto" aria-label="About this website"><p>Student prototype for Hey Jude Cafe. Menu prices are placeholders, and bookings, messages and online orders don’t reach the café yet.</p></aside>
"""

NAV_LINKS = [("menu", "/menu", "Menu"), ("about", "/about", "About"), ("visit", "/visit", "Visit"), ("contact", "/contact", "Contact")]


def header(active):
    links = "\n".join(
        f'      <a href="{href}"{current(active, key)}>{label}</a>' for key, href, label in NAV_LINKS)
    return f"""<header class="site-header" id="siteHeader">
  <div class="wrap">
    <a class="brand" href="/"{current(active, "home")}>Hey Jude</a>
    <a class="now" href="/visit" data-status><span class="record" aria-hidden="true"></span><span class="now-text" data-status-text>Open every day, 7am to 3pm</span></a>
    <button class="menu-toggle" id="menuToggle" type="button" aria-expanded="false" aria-controls="siteNav">
      <span class="burger" aria-hidden="true"><span></span></span><span class="menu-label">Menu</span>
    </button>
    <nav class="nav" id="siteNav" aria-label="Main">
{links}
      <a href="{ORDER_URL}">Order online</a>
      <a class="btn btn-solid" href="/book"{current(active, "book")}>Book a table</a>
      <a class="now now-mobile" href="/visit" data-status><span class="record" aria-hidden="true"></span><span data-status-text>Open every day, 7am to 3pm</span></a>
    </nav>
  </div>
</header>
"""


def current(active, key):
    return ' aria-current="page"' if active == key else ""


def footer(active):
    def li(key, href, label, external=False):
        ext = ' target="_blank" rel="noopener"' if external else ""
        return f'<li><a href="{href}"{current(active, key)}{ext}>{label}</a></li>'

    return f"""<footer class="site-footer dark">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <p class="footer-brand">Hey Jude</p>
        <p>Coffee, food and the music greats on the walls. Brookfield, Tauranga.</p>
      </div>
      <div>
        <h2>Visit</h2>
        <p style="margin-top:0">2 Jude Place<br>Brookfield, Tauranga</p>
        <p>Every day<br>7am to 3pm</p>
      </div>
      <div>
        <h2>The café</h2>
        <ul>
          {li("menu", "/menu", "Menu")}
          {li("about", "/about", "About")}
          {li("visit", "/visit", "Visit")}
          {li("contact", "/contact", "Contact")}
          {li("book", "/book", "Book a table")}
          {li("order", ORDER_URL, "Order online")}
        </ul>
      </div>
      <div>
        <h2>Get in touch</h2>
        <ul>
          {li("ig", INSTAGRAM, "Instagram", external=True)}
          {li("mail", "mailto:" + EMAIL, "Email us") if EMAIL else ""}
          {li("privacy", "/privacy", "Your details")}
        </ul>
      </div>
    </div>
    <p class="footer-bottom">© 2026 Hey Jude Cafe. Website built by Manjil as a COMP.6207 student project at Toi Ohomai. Photos from <a href="{INSTAGRAM}" target="_blank" rel="noopener">Hey Jude Cafe’s Instagram</a>, used with permission.</p>
  </div>
</footer>
<button class="to-top" id="toTop" type="button" aria-label="Back to top" hidden>
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</body>
</html>
"""


def esc(text):
    return html.escape(text, quote=True)


def listen_section():
    if not PLAYLIST_URL:
        return ""
    match = re.search(r"open\.spotify\.com/(playlist|album)/([A-Za-z0-9]+)", PLAYLIST_URL)
    if not match:
        raise SystemExit("PLAYLIST_URL should be a Spotify playlist or album link")
    embed = f"https://open.spotify.com/embed/{match.group(1)}/{match.group(2)}"
    return f"""<section class="section dark" aria-labelledby="listenTitle">
  <div class="wrap">
    <div class="section-head reveal">
      <div>
        <h2 id="listenTitle">What’s playing at Hey Jude</h2>
        <p class="lede">The records we play in the café, so you can take them home.</p>
      </div>
      <a class="more" href="{esc(PLAYLIST_URL)}" target="_blank" rel="noopener">Open in Spotify</a>
    </div>
    <div class="embed-load listen-embed reveal">
      <button class="btn btn-solid" type="button" data-embed-src="{embed}" data-embed-title="Hey Jude’s café playlist on Spotify"
              data-embed-class="listen-embed" data-embed-allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture">Play the café playlist</button>
      <p>Loads Spotify’s player, which may set its own cookies.</p>
    </div>
  </div>
</section>"""


def reviews_section():
    if not REVIEWS:
        return ""
    items = []
    for r in REVIEWS:
        source = esc(r["source"])
        if r.get("link"):
            source = f'<a class="link" href="{esc(r["link"])}" target="_blank" rel="noopener">{source}</a>'
        who = f'{esc(r["who"])}, ' if r.get("who") else ""
        items.append(f"""      <figure class="review">
        <blockquote>“{esc(r["quote"])}”</blockquote>
        <figcaption>{who}{source}</figcaption>
      </figure>""")
    return f"""<section class="section plain" aria-labelledby="reviewsTitle">
  <div class="wrap">
    <h2 id="reviewsTitle" class="reveal">What people say</h2>
    <div class="reviews reveal">
{chr(10).join(items)}
    </div>
  </div>
</section>"""


# Home page only: load the hero photo early, and describe the café for search engines
# (schema.org structured data, shown in Google's business results).
HOME_HEAD = f"""<link rel="preload" as="image" href="/images/reserved.webp" imagesrcset="/images/reserved-sm.webp 600w, /images/reserved.webp 1200w" imagesizes="100vw">
<script type="application/ld+json">
{json.dumps({
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "name": "Hey Jude Cafe",
    "url": SITE + "/",
    "image": SITE + "/images/reserved.webp",
    "address": {"@type": "PostalAddress", "streetAddress": "2 Jude Place", "addressLocality": "Brookfield, Tauranga",
                "postalCode": "3110", "addressCountry": "NZ"},
    "openingHoursSpecification": [{"@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "07:00", "closes": "15:00"}],
    "servesCuisine": ["Cafe", "Brunch"],
    "menu": SITE + "/menu",
    "acceptsReservations": True,
    "sameAs": [INSTAGRAM],
}, ensure_ascii=False, indent=1)}
</script>
"""


def write_seo_files():
    """robots.txt and sitemap.xml so search engines find every page."""
    pages = [path for _, path, *_ in PAGES if path]
    urls = "\n".join(f"  <url><loc>{SITE}{path}</loc></url>" for path in pages)
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
        encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    print("built sitemap.xml and robots.txt")


def build():
    for name, path, active, title, description, script, image in PAGES:
        body = (ROOT / "src" / "pages" / f"{name}.html").read_text(encoding="utf-8")
        body = body.replace("{{ORDER_URL}}", ORDER_URL).replace("{{INSTAGRAM}}", INSTAGRAM)
        # Parts marked <!--email--> ... <!--/email--> only appear when an email is set
        if EMAIL:
            body = body.replace("<!--email-->", "").replace("<!--/email-->", "").replace("{{EMAIL}}", esc(EMAIL))
        else:
            body = re.sub(r"<!--email-->.*?<!--/email-->\n?", "", body, flags=re.S)
        body = body.replace("{{LISTEN}}", listen_section()).replace("{{REVIEWS}}", reviews_section())
        canonical = f'<link rel="canonical" href="{SITE}{path}">\n' if path else '<meta name="robots" content="noindex">\n'
        page_script = f'<script src="/assets/{script}" defer></script>\n' if script else ""
        html = HEAD.format(title=title, description=description, canonical=canonical, site=SITE,
                           image=image, favicon=FAVICON, page_script=page_script,
                           extra_head=HOME_HEAD if name == "index" else "")
        html += header(active if active else ("home" if name == "index" else None))
        html += f'<main id="main" tabindex="-1">\n{body.strip()}\n</main>\n'
        html += footer(active)
        (ROOT / f"{name}.html").write_text(html, encoding="utf-8")
        print(f"built {name}.html")
    write_seo_files()


if __name__ == "__main__":
    build()
