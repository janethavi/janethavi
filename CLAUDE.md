# janethfernando.me — Claude Context

## What this is
Personal website for Janeth Fernando — a static **Astro** site, hosted **free on Cloudflare Pages**, replacing the old Hostinger/Zyro build. It lives in this repo (`github.com/janethavi/janethavi`, which is also Janeth's GitHub profile README repo — `README.md`, `Icons/`, `Images/` are the profile README and must be preserved).

- **Live URL**: https://janethfernando.me
- **Stack**: Astro 4 (`output: 'static'`), Tailwind CSS, Montserrat font. Builds to `dist/`.
- **Design goal**: exact visual replica of the old Hostinger site. Keep parity — verify changes against the live site / reference screenshots before shipping.

## Commands
```bash
npm install
npm run dev       # local dev at http://localhost:4321
npm run build     # static build to dist/
npm run preview   # serve the built dist/ (needed to test the real output)
```
Trailing slashes matter in preview (e.g. `/experiences/`, not `/experiences`).

## Deploy
Cloudflare Pages is git-connected to this repo — **every push to `main` auto-builds and deploys**. Config: Astro preset, build `npm run build`, output `dist`, root empty.
- Env vars (Pages → Settings → Environment variables, encrypted): `DISCORD_TOKEN`, `DISCORD_CHANNEL_ID` — used by the contact form. Never commit these.
- After changing a Pages Function you must let the new deploy finish before the endpoint updates.

## Structure
```
src/
  layouts/Layout.astro     # <head>/SEO/nav/footer shell + entrance-animation script
  components/PageHero.astro # the dark banner every page uses (title, subtitle, circle photo)
  pages/                    # one file per route: index, about, gallery, writings,
                            #   life-updates, experiences, sinharaja, bundala, [slug]
  content/blog/*.md         # blog posts (Markdown) — see below
  content/config.ts         # blog frontmatter schema
  data/x-posts.json         # generated X feed snapshot for Life Updates — see below
  assets/updates/           # generated photos for those posts (astro:assets optimises them)
  styles/global.css         # the only custom CSS (animations + .blog-prose)
scripts/sync-updates.mjs    # refreshes the two generated paths above
functions/api/contact.js    # Cloudflare Pages Function: contact form -> Discord
public/                     # static assets; _redirects, robots.txt, images/
.github/workflows/          # sync-updates.yml — runs the sync daily and commits
```

Tailwind custom colors (`tailwind.config.mjs`): `periwinkle #89b0f5` (buttons/links), `ink #0d131a` (button hover text), plus `gold`/`dark`. Font: Montserrat.

## Conventions (the user's explicit preferences)
- **Blogs are Markdown.** To add a post, drop a new `src/content/blog/<slug>.md` with the frontmatter below — it auto-appears on Writings (ordered by `order`) and gets its own route at `/<slug>`. Raw HTML (image grids, YouTube embeds) is allowed inside the Markdown body.
- **Keep it simple and easy to update.** Tailwind + minimal external CSS only. Don't add CSS unless Tailwind can't express it; new shared CSS goes in `src/styles/global.css`.
- **Internal links always end in a trailing slash** (`/about/`, `` `/${post.slug}/` ``), including `_redirects` targets. Cloudflare Pages 308-redirects the slash-less form, so omitting it costs an extra hop on every click and crawl.
- **Mobile-first / responsive.** Verify at 390px (headless Chrome `--window-size` has a ~500px floor — use CDP `Emulation.setDeviceMetricsOverride` for real mobile screenshots).
- **Top-notch SEO.** Every page sets a unique title + description (separator `|`, e.g. `About Me | Janeth Fernando`); canonical + hreflang x-default, OG/Twitter cards, `og:image:alt` (no hardcoded image dims — the photos are portrait), web manifest (`public/site.webmanifest`), JSON-LD (WebSite + Person in Layout, BlogPosting + BreadcrumbList per post), auto sitemap via `@astrojs/sitemap` (pinned **exactly 3.2.1** — 3.7.x breaks on Astro 4), robots.txt, 301 redirects in `public/_redirects`.
- **Entrance animations**: `Layout.astro` adds `.anim-pre`/`.anim-in` via IntersectionObserver (behind `prefers-reduced-motion`); JS-added so crawlers/no-JS still see content.

### Blog post frontmatter
```yaml
---
title: Kolkata
excerpt: One or two sentence summary shown on the card and as the meta description.
category: GENERAL            # shown uppercase on cards, e.g. GENERAL / ADVENTURE
date: 3/7/2026               # display format
isoDate: "2026-03-07"        # MUST be quoted (zod expects a string, not a Date)
readTime: 6 min read
cover: /images/blog/kolkata/cover.jpg   # path under public/
coverAlt: Alt text
coverFit: contain            # optional; default 'cover'. Use 'contain' for
                             # square/portrait covers that shouldn't be cropped.
order: 1                     # position on Writings page (1 = first)
---
```

## Life Updates (X mirror)
`/life-updates/` renders `src/data/x-posts.json` as static HTML — **no third-party widget**. It
used to be a SociableKIT embed: 69 KB of JS that tracked visitors and left the page blank if the
vendor was slow or blocked.

`npm run sync:updates` regenerates the snapshot. The script fetches the same feed the widget used
(`data.accentapi.com/feed/<embed-id>.json` — public, no auth), collapses the duplicate entries that
feed returns for each tweet, strips the markup it leaks into `tweet_text`, resolves the `t.co`
links, and downloads the photos into `src/assets/updates/`. **Both outputs are committed**, so the
build never touches the network and the page survives the vendor disappearing — only new posts
would stop arriving.

`.github/workflows/sync-updates.yml` runs it daily and commits any change, which triggers the Pages
rebuild. So posts appear within a day; run the script by hand to pull one in sooner. X's own API
can't replace this — its free tier is write-only, and reading a timeline starts at the paid tiers.

## Contact form → Discord
`functions/api/contact.js` receives the About-page form POST (`name`, `email`, `message`, honeypot `website`), validates, and posts a Discord embed. It uses `DISCORD_WEBHOOK_URL` if set, else falls back to the bot API (`DISCORD_TOKEN` + `DISCORD_CHANNEL_ID`, the same bot as Janeth's homelab). Then 303-redirects back to `/about?sent=1|0#contactme`. The form 404s on plain `astro preview` (Functions only run on the Cloudflare runtime or `npx wrangler pages dev dist`).

## Footer Instagram grid
Static 3×2 grid of 6 posts (no third-party widget — free widget tiers require branding, which the user does not want). Codes are in `instagramPosts` in `Layout.astro`; images at `public/images/instagram/<code>.webp`. To refresh, download new thumbnails and update the codes array.

## Response headers (`public/_headers`)
One file, two jobs. Cloudflare Pages applies every rule whose path pattern matches.

**Caching.** `/_astro/*` and `/images/*` get `max-age=31536000, immutable` (the default was four
hours, re-validated on every visit). `/_astro/` is content-hashed so this is always safe; photos
under `public/images/` are not — **give a photo a new filename when you replace it**, or returning
visitors keep the old one for a year.

**Security.** HSTS (apex only — `includeSubDomains` is deliberately absent until every subdomain is
HTTPS-only), `X-Frame-Options: DENY`, Permissions-Policy, COOP, and a CSP.

The CSP is strict because the site is almost entirely first-party: `script-src 'self'` with no
`'unsafe-inline'` (Astro bundles hoisted scripts to `/_astro/*.js`; JSON-LD blocks aren't executable
so CSP ignores them). The only external origins allowed are Google Fonts (`style-src`/`font-src`)
and `https://www.youtube.com` in `frame-src` for the blog embeds. `style-src` needs `'unsafe-inline'`
for the inline `style=""` attributes in `PageHero` and the blog image grids.

**Adding anything third-party means editing the CSP first**, or it will be silently blocked in
production while working fine in `astro preview` (which serves no headers). Cloudflare Web Analytics,
for example, needs `script-src https://static.cloudflareinsights.com` and
`connect-src https://cloudflareinsights.com`.

## Assets note
Old Hostinger/Zyro image files sometimes had shuffled contents vs. filenames — originals were re-downloaded from `assets.zyrosite.com`. When adding/replacing an image, confirm the file's actual contents match its name.
