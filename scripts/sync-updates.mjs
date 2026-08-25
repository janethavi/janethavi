/**
 * Life Updates sync — pulls the X (Twitter) feed into the repo so the page can
 * be rendered statically at build time.
 *
 *   npm run sync:updates
 *
 * What it does:
 *   1. fetches the feed JSON that the old SociableKIT widget used at runtime
 *   2. resolves the t.co short links so they survive the shortener
 *   3. downloads each photo into src/assets/updates/ (astro:assets optimises it)
 *   4. writes src/data/x-posts.json, which src/pages/life-updates.astro imports
 *
 * The JSON and the images are committed, so the build never touches the network
 * and the page keeps working even if the feed provider disappears — only new
 * posts would stop arriving. Re-run whenever you want to pick up new posts.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_DIR = path.join(ROOT, 'src/assets/updates');
const DATA_FILE = path.join(ROOT, 'src/data/x-posts.json');

const EMBED_ID = process.env.SK_EMBED_ID ?? '25590922';
const FEED_URL = `https://data.accentapi.com/feed/${EMBED_ID}.json`;
const HANDLE = 'JanethAvishka';
const MAX_POSTS = 30;

/** Run an async fn over items, `limit` at a time. */
async function pool(items, limit, fn) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const index = i++;
        results[index] = await fn(items[index], index);
      }
    })
  );
  return results;
}

/**
 * tweet_text is mostly plain text, but the feed sometimes leaks the markup it
 * scraped (<br /> for newlines, and stray <span class="css-…"> wrappers).
 */
const toPlainText = (s) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** t.co hides the real destination — follow it once, at sync time. */
async function resolveShortLink(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return res.url || url;
  } catch {
    return url;
  }
}

/** Strip the scheme and trailing slash so links read like links, not URLs. */
function displayUrl(url) {
  const bare = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return bare.length > 48 ? `${bare.slice(0, 45)}…` : bare;
}

/**
 * The feed's tweet_text is plain text with <br /> for newlines. Turn it into
 * safe HTML: escape everything first, then add the anchors we want.
 */
function toHtml(text, resolvedLinks, selfLinkPattern) {
  let out = escapeHtml(toPlainText(text));

  for (const [short, full] of Object.entries(resolvedLinks)) {
    // A tweet's own photo/video link is noise once the photo is on the page.
    if (selfLinkPattern.test(full)) {
      out = out.replace(short, '');
      continue;
    }
    out = out.replace(
      short,
      `<a href="${escapeHtml(full)}" target="_blank" rel="noopener nofollow" class="text-periwinkle underline hover:no-underline">${escapeHtml(displayUrl(full))}</a>`
    );
  }

  out = out
    .replace(
      /(^|\s)@(\w{1,15})\b/g,
      (_, pre, handle) =>
        `${pre}<a href="https://x.com/${handle}" target="_blank" rel="noopener nofollow" class="text-periwinkle hover:underline">@${handle}</a>`
    )
    .replace(
      /(^|\s)#(\w+)/g,
      (_, pre, tag) =>
        `${pre}<a href="https://x.com/hashtag/${tag}" target="_blank" rel="noopener nofollow" class="text-periwinkle hover:underline">#${tag}</a>`
    );

  return out.trim().replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br />');
}

async function downloadImage(url, file) {
  const dest = path.join(IMAGE_DIR, file);
  if (existsSync(dest)) return false;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function main() {
  await mkdir(IMAGE_DIR, { recursive: true });
  await mkdir(path.dirname(DATA_FILE), { recursive: true });

  process.stdout.write(`Fetching ${FEED_URL}\n`);
  const res = await fetch(`${FEED_URL}?nocache=${Date.now()}`);
  if (!res.ok) throw new Error(`Feed returned ${res.status}`);
  const feed = await res.json();

  // The feed lists some tweets twice — once clean, once with scraped markup
  // and a date that is a day off. Keep the best copy of each id.
  const quality = (p) =>
    (/<span/i.test(p.tweet_text) ? 0 : 4) +
    (p.images?.length ? 2 : 0) +
    (/[+-]\d{2}:\d{2}$/.test(p.created_at ?? '') ? 1 : 0);

  const byId = new Map();
  let duplicates = 0;
  for (const p of feed.posts ?? []) {
    if (p.retweet === '1' || !toPlainText(p.tweet_text ?? '')) continue;
    const seen = byId.get(p.id);
    if (!seen) {
      byId.set(p.id, p);
      continue;
    }
    duplicates++;
    const best = quality(p) > quality(seen) ? p : seen;
    // Never lose photos to a copy that happens to have cleaner text.
    if (!best.images?.length) best.images = p.images?.length ? p.images : seen.images;
    byId.set(p.id, best);
  }

  const raw = [...byId.values()]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, MAX_POSTS);
  process.stdout.write(`${raw.length} posts (${duplicates} duplicate entries collapsed)\n`);

  const shortLinks = [
    ...new Set(raw.flatMap((p) => (p.tweet_text.match(/https:\/\/t\.co\/\w+/g) ?? []))),
  ];
  const resolved = Object.fromEntries(
    await pool(shortLinks, 5, async (u) => [u, await resolveShortLink(u)])
  );
  process.stdout.write(`${shortLinks.length} links resolved\n`);

  let downloaded = 0;
  const posts = await pool(raw, 4, async (p) => {
    const permalink = `https://x.com/${p.screen_name || HANDLE}/status/${p.id}`;
    const selfLink = new RegExp(`(twitter|x)\\.com/[^/]+/status/${p.id}`, 'i');
    // card_img are link-preview thumbnails; they expire, so skip them.
    const sources = (p.images?.length ? p.images : (p.media_url_https ?? [])).filter(
      (u) => !u.includes('/card_img/')
    );

    const images = [];
    for (const [n, url] of sources.entries()) {
      const file = `${p.id}-${n + 1}${path.extname(new URL(url).pathname) || '.jpg'}`;
      try {
        if (await downloadImage(url, file)) downloaded++;
        images.push(file);
      } catch (err) {
        process.stderr.write(`  ! image ${file}: ${err.message}\n`);
      }
    }

    return {
      id: p.id,
      url: permalink,
      date: p.created_at,
      displayDate: p.formatted_date || p.created_date_time || '',
      text: toPlainText(p.tweet_text).replace(/https:\/\/t\.co\/\w+/g, '').trim(),
      html: toHtml(p.tweet_text, resolved, selfLink),
      images,
      hasVideo: Boolean(p.video_url),
    };
  });

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const payload = {
    // Generated by scripts/sync-updates.mjs — run `npm run sync:updates`.
    source: `https://x.com/${HANDLE}`,
    syncedAt: new Date().toISOString().slice(0, 10),
    posts,
  };
  await writeFile(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`);

  const kept = new Set(posts.flatMap((p) => p.images));
  const orphans = (await readdir(IMAGE_DIR)).filter((f) => f !== '.gitkeep' && !kept.has(f));

  process.stdout.write(
    `\nWrote ${path.relative(ROOT, DATA_FILE)} — ${posts.length} posts, ` +
      `${kept.size} images (${downloaded} new)\n`
  );
  if (orphans.length) {
    process.stdout.write(
      `${orphans.length} image(s) no longer referenced, safe to delete:\n  ${orphans.join('\n  ')}\n`
    );
  }
}

main().catch((err) => {
  process.stderr.write(`\nsync-updates failed: ${err.message}\n`);
  const stale = existsSync(DATA_FILE);
  process.stderr.write(
    stale
      ? 'The committed snapshot is unchanged, so the site still builds.\n'
      : 'No snapshot exists yet — the page will render empty until this succeeds.\n'
  );
  process.exit(1);
});
