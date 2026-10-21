#!/usr/bin/env python3
"""Write the shared site footer into every page of wozy.co.

The footer is the same on every page: the columns below, plus every help
page and comparison page found on the site (any page with a
<meta name="footer-label"> tag), plus the current year. Run it after adding
or renaming a page:

    python3 .github/scripts/site-footer.py          # update every page
    python3 .github/scripts/site-footer.py --check  # exit 1 if a page is out of date

A page gets the footer between <!-- site-footer --> and <!-- /site-footer -->.
A page that still has its own <footer> gets it replaced the first time.
The script also links /assets/site-footer.css from every page it touches,
fills any <!-- help-list --> block with the help pages, and warns about pages
missing from sitemap.xml.
"""
import datetime
import hashlib
import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = "https://www.wozy.co"
CSS = "assets/site-footer.css"

# Pages that never get the footer.
SKIP = {"404.html", "odyz/index.html"}

BRAND = {
    "name": "wOzy",
    "href": "/",
    "logo": "/assets/wozy-logo.png",
    "tagline": "Small apps, made with care, since 2010.",
}

# A column is (heading, links). A link is (label, href). "AUTO:help" and
# "AUTO:compare" expand to every page with a footer-label under */help/ or
# */compare/, in footer-order.
COLUMNS = [
    ("Apps", [
        ("Animal Loop", "/animal-loop/"),
        ("TicToe Fury", "/tictoefury/"),
        ("Odyz", "https://www.odyz.app/"),
        ("Dapply", "/dapply/"),
    ]),
    ("Help", [
        "AUTO:help",
        ("Odyz help center", "https://www.odyz.app/help/"),
    ]),
    ("Compare", [
        "AUTO:compare",
        ("Odyz vs other travel apps", "https://www.odyz.app/compare/"),
    ]),
    ("Company", [
        ("About wOzy", "/"),
        ("Animal Loop dev diary", "/animal-loop/blog/"),
        ("Animal Loop press kit", "/animal-loop/press/"),
        ("TicToe Fury press kit", "/tictoefury/press/"),
        ("Odyz press kit", "https://www.odyz.app/press/"),
        ("Contact us", "/contact/"),
    ]),
]

BOTTOM = [
    ("Animal Loop Privacy", "/animal-loop/privacy/"),
    ("Animal Loop Terms", "/animal-loop/terms/"),
    ("X", "https://x.com/wozyofficial"),
]
COPYRIGHT = "© {year} wOzy Technologies LLC. wOzy and the wOzy logo are trademarks of wOzy."

START, END = "<!-- site-footer -->", "<!-- /site-footer -->"
LIST_START, LIST_END = "<!-- help-list -->", "<!-- /help-list -->"


def meta(text, name):
    m = re.search(r'<meta\s+name="%s"\s+content="([^"]*)"' % re.escape(name), text)
    return html.unescape(m.group(1)) if m else None


def url_for(path):
    rel = path.relative_to(ROOT).as_posix()
    return "/" + rel[: -len("index.html")] if rel.endswith("index.html") else "/" + rel


def pages():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith((".", "_")) or "/." in rel or rel in SKIP or rel.startswith("google"):
            continue
        yield p


def labelled(kind):
    found = []
    for p in pages():
        rel = p.relative_to(ROOT).as_posix()
        if f"/{kind}/" not in "/" + rel:
            continue
        text = p.read_text(encoding="utf-8")
        label = meta(text, "footer-label")
        if label:
            order = float(meta(text, "footer-order") or 100)
            found.append((order, url_for(p), label, meta(text, "description") or ""))
    return [(label, href, desc) for _, href, label, desc in sorted(found)]


def footer_html():
    year = datetime.date.today().year
    esc = lambda s: html.escape(s, quote=True)
    cols = []
    for heading, links in COLUMNS:
        items = []
        for link in links:
            if isinstance(link, str) and link.startswith("AUTO:"):
                items += [(label, href) for label, href, _ in labelled(link[5:])]
            else:
                items.append(link)
        lis = "\n".join(f'          <li><a href="{esc(h)}">{esc(l)}</a></li>' for l, h in items)
        cols.append(
            f'      <nav class="sf-col" aria-label="{esc(heading)}">\n'
            f'        <h2 class="sf-h">{esc(heading)}</h2>\n'
            f"        <ul>\n{lis}\n        </ul>\n      </nav>"
        )
    bottom = " ".join(f'<a href="{esc(h)}">{esc(l)}</a>' for l, h in BOTTOM)
    return f"""{START}
<footer class="sf">
  <div class="sf-in">
    <div class="sf-grid">
      <div class="sf-brand">
        <a class="sf-logo" href="{BRAND['href']}"><img src="{BRAND['logo']}" alt="" width="36" height="36"><span>{esc(BRAND['name'])}</span></a>
        <p>{esc(BRAND['tagline'])}</p>
      </div>
{chr(10).join(cols)}
    </div>
    <div class="sf-bottom">
      <p>{esc(COPYRIGHT.format(year=year))}</p>
      <p class="sf-links">{bottom}</p>
    </div>
  </div>
</footer>
{END}"""


def help_list_html():
    esc = lambda s: html.escape(s, quote=True)
    items = "\n".join(
        f'  <li><a href="{esc(href)}">{esc(label)}</a><span>{esc(desc)}</span></li>'
        for label, href, desc in labelled("help")
    )
    return f'{LIST_START}\n<ul class="help-list">\n{items}\n</ul>\n{LIST_END}'


def css_link():
    digest = hashlib.md5((ROOT / CSS).read_bytes()).hexdigest()[:8]
    return f'<link rel="stylesheet" href="/{CSS}?v={digest}">'


def update(text):
    footer = footer_html()
    if START in text:
        text = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda m: footer, text, count=1, flags=re.S)
    elif "<footer" in text:
        text = re.sub(r"<footer\b.*?</footer>", lambda m: footer, text, count=1, flags=re.S)
    else:
        return text
    if not CSS:
        pass
    elif f'href="/{CSS}' in text:
        text = re.sub(r'<link rel="stylesheet" href="/%s\?v=[0-9a-f]+">' % re.escape(CSS), css_link(), text)
    else:
        text = text.replace("</head>", f"{css_link()}\n</head>", 1)
    if LIST_START in text:
        text = re.sub(re.escape(LIST_START) + r".*?" + re.escape(LIST_END), lambda m: help_list_html(), text, flags=re.S)
    return text


def main():
    check = "--check" in sys.argv
    stale = []
    for p in pages():
        old = p.read_text(encoding="utf-8")
        new = update(old)
        if new != old:
            stale.append(p.relative_to(ROOT).as_posix())
            if not check:
                p.write_text(new, encoding="utf-8")
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    missing = [url_for(p) for p in pages() if p.name == "index.html" and SITE + url_for(p) not in sitemap]
    for m in missing:
        print(f"warning: {m} is not in sitemap.xml", file=sys.stderr)
    if check:
        if stale:
            print("Footer out of date in:\n  " + "\n  ".join(stale) + "\nRun: python3 .github/scripts/site-footer.py", file=sys.stderr)
            sys.exit(1)
        print("Footer up to date on every page.")
    else:
        print(f"Updated {len(stale)} page(s).")


if __name__ == "__main__":
    main()
