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
  styles/global.css         # the only custom CSS (animations + .blog-prose)
functions/api/contact.js    # Cloudflare Pages Function: contact form -> Discord
public/                     # static assets; _redirects, robots.txt, images/
```

Tailwind custom colors (`tailwind.config.mjs`): `periwinkle #89b0f5` (buttons/links), `ink #0d131a` (button hover text), plus `gold`/`dark`. Font: Montserrat.

## Conventions (the user's explicit preferences)
- **Blogs are Markdown.** To add a post, drop a new `src/content/blog/<slug>.md` with the frontmatter below — it auto-appears on Writings (ordered by `order`) and gets its own route at `/<slug>`. Raw HTML (image grids, YouTube embeds) is allowed inside the Markdown body.
- **Keep it simple and easy to update.** Tailwind + minimal external CSS only. Don't add CSS unless Tailwind can't express it; new shared CSS goes in `src/styles/global.css`.
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

## Contact form → Discord
`functions/api/contact.js` receives the About-page form POST (`name`, `email`, `message`, honeypot `website`), validates, and posts a Discord embed. It uses `DISCORD_WEBHOOK_URL` if set, else falls back to the bot API (`DISCORD_TOKEN` + `DISCORD_CHANNEL_ID`, the same bot as Janeth's homelab). Then 303-redirects back to `/about?sent=1|0#contactme`. The form 404s on plain `astro preview` (Functions only run on the Cloudflare runtime or `npx wrangler pages dev dist`).

## Footer Instagram grid
Static 3×2 grid of 6 posts (no third-party widget — free widget tiers require branding, which the user does not want). Codes are in `instagramPosts` in `Layout.astro`; images at `public/images/instagram/<code>.webp`. To refresh, download new thumbnails and update the codes array.

## Assets note
Old Hostinger/Zyro image files sometimes had shuffled contents vs. filenames — originals were re-downloaded from `assets.zyrosite.com`. When adding/replacing an image, confirm the file's actual contents match its name.
