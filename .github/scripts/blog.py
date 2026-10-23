"""Write the Animal Loop dev diary's lists from the posts themselves.

Every post lives in animal-loop/blog/<slug>/index.html. Its headline, date and
author come from its BlogPosting JSON-LD, its read time from the "N min read"
in its byline, and its share image from og:image. Everything else a list shows
comes from <meta name="blog-..."> tags in the post's <head>:

    blog-summary        One or two sentences for the blog index and the feed.
    blog-card-image     Card image, site-absolute (/animal-loop/assets/blog/...).
    blog-card-size      Its pixel size, e.g. 880x440.
    blog-card-alt       Its alt text.
    blog-card-bg        Optional CSS background behind the card image.
    blog-card-fit       Optional "logo": show the image as a tilted logo, not a cover.
    blog-more           Optional link text on the index card (default "Read the story").
    blog-home-tag       Label on the Animal Loop home card (e.g. "Update").
    blog-home-title     Shorter title for the home card.
    blog-home-summary   One line for the home card.
    blog-categories     Comma-separated RSS categories.
    blog-llms-title     Link text in llms.txt.
    blog-llms           Description in llms.txt.

From those it writes, newest first by datePublished:

    animal-loop/blog/index.html   the post cards and the Blog JSON-LD's blogPost list
    animal-loop/blog/feed.xml     every <item> and lastBuildDate
    sitemap.xml                   one <url> per post
    llms.txt                      one line per post under the dev diary line
    animal-loop/index.html        the newest three posts, between <!-- diary-list --> markers

Run it after adding or changing a post:

    python3 .github/scripts/blog.py          # update every list
    python3 .github/scripts/blog.py --check  # exit 1 if a list is out of date
"""
import datetime
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = "https://www.wozy.co"
BLOG = ROOT / "animal-loop" / "blog"
BLOG_URL = SITE + "/animal-loop/blog/"
HOME_COUNT = 3
LIST_START, LIST_END = "<!-- diary-list -->", "<!-- /diary-list -->"
REQUIRED = ["summary", "card-image", "card-size", "card-alt", "home-tag", "home-title",
            "home-summary", "categories", "llms-title", "llms"]


def meta(text, name):
    m = re.search(r'<meta name="%s" content="([^"]*)">' % re.escape(name), text)
    return html.unescape(m.group(1)) if m else ""


def esc(s):
    return html.escape(s, quote=False).replace('"', "&quot;")


def posts():
    """Every post with blog meta tags, newest first."""
    out = []
    for p in sorted(BLOG.glob("*/index.html")):
        text = p.read_text(encoding="utf-8")
        if 'name="blog-summary"' not in text:
            continue
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', text, re.S).group(1))
        slug = p.parent.name
        post = {"slug": slug, "url": BLOG_URL + slug + "/", "headline": ld["headline"],
                "date": ld["datePublished"], "modified": ld.get("dateModified", ld["datePublished"]),
                "author": ld["author"]["name"]}
        missing = [n for n in REQUIRED if not meta(text, "blog-" + n)]
        if missing:
            sys.exit(f"{p.relative_to(ROOT)} is missing: " + ", ".join("blog-" + n for n in missing))
        for n in REQUIRED + ["card-bg", "card-fit", "more"]:
            post[n.replace("-", "_")] = meta(text, "blog-" + n)
        post["more"] = post["more"] or "Read the story"
        read = re.search(r"(\d+) min read", text)
        post["read"] = read.group(1) if read else "1"
        post["og_image"] = meta_property(text, "og:image")
        post["og_w"], post["og_h"] = meta_property(text, "og:image:width"), meta_property(text, "og:image:height")
        out.append(post)
    return sorted(out, key=lambda q: (q["date"], q["slug"]), reverse=True)


def meta_property(text, prop):
    m = re.search(r'<meta property="%s" content="([^"]*)">' % re.escape(prop), text)
    return m.group(1) if m else ""


def day(iso):
    return datetime.date.fromisoformat(iso)


def long_date(iso):
    d = day(iso)
    return f"{d:%B} {d.day}, {d.year}"


def rfc822(iso):
    return day(iso).strftime("%a, %d %b %Y 00:00:00 GMT")


def size(post):
    w, h = post["card_size"].split("x")
    return w, h


# ---------- blog index ----------

def index_cards(ps):
    rows = ["<!-- Written by .github/scripts/blog.py from each post's blog-* meta tags. To add a post,",
            "     put it in its own folder (blog/<slug>/index.html) with those tags and run the script. -->"]
    for p in ps:
        w, h = size(p)
        bg = f' style="background: {p["card_bg"]}"' if p["card_bg"] else ""
        img = "../" + p["card_image"].removeprefix("/animal-loop/")
        rows += [
            '  <article class="post">',
            f'    <a href="{p["slug"]}/">',
            f'      <div class="art"{bg}><img src="{img}" alt="{esc(p["card_alt"])}" width="{w}" height="{h}"></div>',
            '      <div class="body">',
            f'        <div class="meta"><time datetime="{p["date"]}">{long_date(p["date"])}</time> · {p["read"]} min read</div>',
            f'        <h2>{esc(p["headline"])}</h2>',
            f'        <p>{esc(p["summary"])}</p>',
            f'        <span class="more">{esc(p["more"])}</span>',
            '      </div>',
            '    </a>',
            '  </article>',
        ]
    return "\n".join(rows)


def update_index(text, ps):
    text = re.sub(r'(<main class="posts">\n).*?(\n</main>)', lambda m: m.group(1) + index_cards(ps) + m.group(2), text, count=1, flags=re.S)
    m = re.search(r'(<script type="application/ld\+json">\n)(.*?)(\n</script>)', text, re.S)
    ld = json.loads(m.group(2))
    ld["blogPost"] = [{"@type": "BlogPosting", "headline": p["headline"], "url": p["url"],
                       "datePublished": p["date"], "author": {"@type": "Person", "name": p["author"]}} for p in ps]
    return text[:m.start(2)] + json.dumps(ld, indent=2, ensure_ascii=False) + text[m.end(2):]


# ---------- feed ----------

def feed_items(ps):
    out = []
    for p in ps:
        cats = "".join(f"\n      <category>{esc(c.strip())}</category>" for c in p["categories"].split(","))
        img = (f'<p><img src="{p["og_image"]}" alt="{esc(p["headline"])}" width="{p["og_w"]}" height="{p["og_h"]}"></p>'
               if p["og_image"] else "")
        out.append(
            "    <item>\n"
            f"      <title>{esc(p['headline'])}</title>\n"
            f"      <link>{p['url']}</link>\n"
            f'      <guid isPermaLink="true">{p["url"]}</guid>\n'
            f"      <pubDate>{rfc822(p['date'])}</pubDate>\n"
            f"      <dc:creator>{esc(p['author'])}</dc:creator>{cats}\n"
            f"      <description><![CDATA[<p>{esc(p['summary'])}</p>{img}"
            f'<p><a href="{p["url"]}">Read the full post</a></p>]]></description>\n'
            "    </item>\n")
    return "\n".join(out)


def update_feed(text, ps):
    text = re.sub(r"<!--.*?-->", "<!-- Written by .github/scripts/blog.py: every <item> and lastBuildDate come from the posts. -->",
                  text, count=1, flags=re.S)
    newest = max((p["date"] for p in ps), default=None)
    if newest:
        text = re.sub(r"<lastBuildDate>.*?</lastBuildDate>", f"<lastBuildDate>{rfc822(newest)}</lastBuildDate>", text, count=1)
    start = text.find("    <item>")
    end = text.index("  </channel>")
    if start < 0 or start > end:
        start = end
    return text[:start] + feed_items(ps) + text[end:]


def managed(slug):
    """Whether blog/<slug>/ is the script's to list: a post, or a page that no longer exists.
    Other pages in the blog folder, like the subscribe page, are left alone."""
    page = BLOG / slug / "index.html"
    return not page.exists() or 'name="blog-summary"' in page.read_text(encoding="utf-8")


# ---------- sitemap ----------

def update_sitemap(text, ps):
    lines = text.split("\n")
    post_re = re.compile(r"\s*<url><loc>%s([^/<]+)/</loc>" % re.escape(BLOG_URL))
    kept = [l for l in lines if not ((m := post_re.match(l)) and managed(m.group(1)))]
    rows = [f"  <url><loc>{p['url']}</loc><lastmod>{p['modified']}</lastmod></url>" for p in ps]
    anchor = max((i for i, l in enumerate(kept) if f"<loc>{BLOG_URL}" in l), default=None)
    if anchor is None:
        anchor = next(i for i, l in enumerate(kept) if "</urlset>" in l) - 1
    return "\n".join(kept[:anchor + 1] + rows + kept[anchor + 1:])


# ---------- llms.txt ----------

def update_llms(text, ps):
    lines = text.split("\n")
    link_re = re.compile(r"- \[[^\]]*\]\(%s([^/)]+)/\)" % re.escape(BLOG_URL))
    kept = [l for l in lines if not ((m := link_re.match(l)) and managed(m.group(1)))]
    i = next(i for i, l in enumerate(kept) if f"]({BLOG_URL})" in l)
    rows = [f"- [{p['llms_title']}]({p['url']}): {p['llms']}" for p in ps]
    return "\n".join(kept[:i + 1] + rows + kept[i + 1:])


# ---------- Animal Loop home ----------

def home_list(ps):
    rows = [LIST_START, '  <ul class="diary-list">']
    for p in ps[:HOME_COUNT]:
        w, h = size(p)
        bg = f' style="background: {p["card_bg"]}"' if p["card_bg"] else ' style="background: linear-gradient(180deg, #8E80D8 0%, #E1A0C2 70%, #F8C6B6 100%)"'
        cls = ' class="logo"' if p["card_fit"] == "logo" else ""
        img = p["card_image"].removeprefix("/animal-loop/")
        rows += [
            f'    <li><a href="blog/{p["slug"]}/">',
            f'      <div class="art"{bg}><img{cls} src="{img}" width="{w}" height="{h}" alt="" loading="lazy"></div>',
            f'      <div class="body"><span class="tag">{esc(p["home_tag"])}</span><h3>{esc(p["home_title"])}</h3><p>{esc(p["home_summary"])}</p></div>',
            '    </a></li>',
        ]
    rows += ["  </ul>", "  " + LIST_END]
    return "\n".join(rows)


def update_home(text, ps):
    if LIST_START not in text:
        sys.exit(f"animal-loop/index.html has no {LIST_START} block")
    return re.sub(re.escape(LIST_START) + r".*?" + re.escape(LIST_END), lambda m: home_list(ps), text, count=1, flags=re.S)


def main():
    check = "--check" in sys.argv
    ps = posts()
    targets = [
        (BLOG / "index.html", update_index),
        (BLOG / "feed.xml", update_feed),
        (ROOT / "sitemap.xml", update_sitemap),
        (ROOT / "llms.txt", update_llms),
        (ROOT / "animal-loop" / "index.html", update_home),
    ]
    stale = []
    for path, fn in targets:
        old = path.read_text(encoding="utf-8")
        new = fn(old, ps)
        if new != old:
            stale.append(path.relative_to(ROOT).as_posix())
            if not check:
                path.write_text(new, encoding="utf-8")
    if check:
        if stale:
            print("Dev diary lists out of date in:\n  " + "\n  ".join(stale) + "\nRun: python3 .github/scripts/blog.py", file=sys.stderr)
            sys.exit(1)
        print(f"Dev diary lists up to date ({len(ps)} posts).")
    else:
        print(f"Updated {len(stale)} file(s) from {len(ps)} posts.")


if __name__ == "__main__":
    main()
