# Odyz website (odyz.app)

A hand-built static rebuild of odyz.app. Plain HTML, CSS and vanilla JS — no build
step, no framework, no dependencies. Drop the folder on any static host and it works.

```
odyz.app/
├── index.html              the whole landing page
├── privacy.html            legal shell — paste your real policy in
├── terms.html              legal shell — paste your real terms in
├── 404.html
├── styles.css              all styling; design tokens at the top
├── main.js                 nav, scroll-spy, reveals, marquees, accordion
├── robots.txt / sitemap.xml
├── _headers                caching + security headers (Netlify / Cloudflare Pages)
├── assets/                 built from your master files (1.4 MB total)
│   ├── screens/            12 app screenshots as WebP + 3 phone-in-hand renders
│   ├── stamps/             12 city stamps for the marquee
│   ├── avatars/            the 3 testimonial avatars
│   ├── logo-stamp.png  favicon.png  og-image.png
│   ├── qr-appstore.png  flag-strip.png
```

## Run it locally

```bash
cd odyz.app
python3 -m http.server 8000
# → http://localhost:8000
```

## Where it lives and how it's published

This site sits in the `wozy-site` repo next to wozy.co, so both are edited and
pushed the same way:

```
wozy-site/
├── odyz.app/          the published Odyz site: everything in here goes to odyz.app
└── odyz.app-tools/    this README and the asset builder (not published to odyz.app)
```

**Cloudflare Pages** publishes `odyz.app/` to odyz.app on every push to `main`
(project settings: production branch `main`, no build command, build output
directory `odyz.app`). GitHub Pages keeps publishing the rest of the repo to
wozy.co; its robots.txt keeps these two folders out of search results there.

`_headers` is read by Cloudflare Pages. Cloudflare also serves `privacy.html` at
`/privacy` and `terms.html` at `/terms`.

## Rebuilding the assets

`assets/` is generated from your master files, so don't hand-edit it — edit the
source and re-run the builder:

```bash
python3 odyz.app-tools/build-assets.py "/path/to/Odyz Assets/Website"
# needs: pip install pillow numpy scipy
```

It re-encodes the 2–3 MB screenshot PNGs as WebP (72 KB and under), composites the
3D-map screenshots into `handphone.png` with the right perspective, keys the purple
background out of the flag strip, flattens the QR to black-on-white so it scans on
any background, and renders the 1200×630 social image.

### Where each source file ended up

| Slot | Source |
|---|---|
| Hero phones, left → right | `IMG_0490`, `Timeline.jpeg`, `IMG_1044`, `IMG_0492`, `IMG_0494` |
| 3D map — "relive your trips" | `IMG_1044` (Eiffel Tower) in `handphone.png` |
| 3D map — "right where it happened" | `IMG_1043` (Mona Lisa, the Louvre) |
| 3D map — "global adventures" | `IMG_1047` (San Francisco) |
| Passport card | `Pass/IMG_1061`, `Pass/IMG_1063` (light), `Pass/IMG_1064`, `IMG_0490` (dark) |
| Travel timeline card | `Timeline.jpeg` |
| World map card | `IMG_0494` (glowing pins over Europe) |
| Worldwide card | flag row cropped out of `IMG_0490` |
| Stamps marquee | all 12 of `Stamps/*.png` |
| Testimonials | `Testimonials/Avatar1–3.png` |
| Download card | `QRCode.png` + `IMG_0506` (world trips globe) |
| Logo, favicon | `OdyzCentered.png`, `favicon.png` |

To reassign a slot, change the mapping in `tools/build-assets.py` and re-run it.

**Unused from your folder:** `IMG_0493`, `IMG_0506` (except the download card),
`IMG_1045`, `IMG_1046`, `Background Stamps.png`, `Preview/*`, `world.png`,
`phone.avif` and the `.afphoto` originals.

## What still needs your input

### 1. FAQ answers
The four questions are the real ones from your site; the **answers are my drafts**
(the live accordion wouldn't open for scraping). Search `index.html` for
`TODO Sebastian` and paste your actual copy.

### 2. Privacy + Terms
Both pages are styled shells with `TODO Sebastian` markers. Paste your existing
legal text in — your App Store listing links to these, so they matter.

### 3. Links to check
- `hello@odyz.app` — used by the "Contact us" button and both legal pages
- `https://x.com/odyzapp` — footer social link, guessed from the original
- Canonical URLs in `index.html` and `sitemap.xml` if you host on a different domain
- The App Advice logo isn't in your assets folder, so the press quote runs without
  it (accent rule on the left instead). Drop the file in and add it back if you want.

## Fonts

The headings use **Satoshi**, loaded from Fontshare's CDN. To be fully self-hosted,
download it from [fontshare.com/fonts/satoshi](https://www.fontshare.com/fonts/satoshi),
put the `.woff2` files in `assets/fonts/`, delete the two Fontshare `<link>` tags in
each HTML file, and add this to the top of `styles.css`:

```css
@font-face {
  font-family: "Satoshi";
  src: url("assets/fonts/Satoshi-Variable.woff2") format("woff2-variations");
  font-weight: 400 900;
  font-display: swap;
}
```

## Changing the look

All colours, spacing and type live in the `:root` block at the top of `styles.css`:

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#121212` | page background |
| `--surface` | `#171717` | cards |
| `--accent` | `#bb73ff` | the purple, everywhere |
| `--highlight` | `#f1f58c` | the "Light" word in the Passport card |
| `--radius` | `28px` | card corners |

These are taken from the live site's computed styles, so they match.

## Differences from the Framer original

- The 3D-map section is a sticky phone with three text blocks that fade as you
  scroll, rather than Framer's frame-by-frame scroll animation.
- The hero phone row is static instead of parallaxing.
- Marquees are pure CSS keyframes.

Everything else — structure, copy, colours, type scale, section order — follows the
original. It's also a good deal lighter: the Framer page ships a React runtime, this
one ships about 30 KB of CSS and JS on top of 1.4 MB of images, most of it lazy-loaded.
