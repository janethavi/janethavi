/**
 * Life Updates — adds X (Twitter) posts to the repo so the page can be
 * rendered statically at build time.
 *
 *   npm run add:update -- https://x.com/JanethAvishka/status/123…  [more links or ids]
 *
 * What it does:
 *   1. fetches each post from X's public embed endpoint (the one that powers
 *      embedded tweets on other sites — no account, key or third party)
 *   2. downloads its photos into src/assets/updates/ (astro:assets optimises them)
 *   3. adds it to src/data/x-posts.json, which src/pages/life-updates.astro imports
 *
 * Re-adding a post that is already there refreshes it (e.g. after an edit on X).
 * X offers no free way to list a timeline, so posts are added by link: either
 * here, or from the "Add life update" workflow in the GitHub Actions tab.
 *
 * The JSON and the images are committed, so the build never touches the network.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_DIR = path.join(ROOT, 'src/assets/updates');
const DATA_FILE = path.join(ROOT, 'src/data/x-posts.json');

const HANDLE = 'JanethAvishka';
const TIME_ZONE = 'Asia/Colombo';

/** The embed endpoint wants a token derived from the id (same formula X's widget uses). */
const tokenFor = (id) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** X's text arrives with &, < and > already entity-encoded. */
const decodeEntities = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Strip the scheme and trailing slash so links read like links, not URLs. */
function displayUrl(url) {
  const bare = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return bare.length > 48 ? `${bare.slice(0, 45)}…` : bare;
}

const link = (href, label, extra = 'hover:underline') =>
  `<a href="${escapeHtml(href)}" target="_blank" rel="noopener nofollow" class="text-periwinkle ${extra}">${escapeHtml(label)}</a>`;

/** "123…", "https://x.com/u/status/123…?s=20", "twitter.com/…" → "123…" */
function idFrom(arg) {
  const id = arg.match(/status(?:es)?\/(\d+)/)?.[1] ?? (/^\d+$/.test(arg) ? arg : null);
  if (!id) throw new Error(`Not a post link or id: ${arg}`);
  return id;
}

async function fetchTweet(id) {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${tokenFor(id)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (life-updates sync)' } });
  if (res.status === 404)
    throw new Error('not found — is the post deleted or the account private?');
  if (!res.ok) throw new Error(`X returned ${res.status}`);
  const tweet = await res.json();
  if (tweet.__typename !== 'Tweet')
    throw new Error(`unavailable (${tweet.__typename ?? 'empty response'})`);
  return tweet;
}

/**
 * Build the post body from X's entities: links get their real destination,
 * @mentions and #hashtags link back to X. Entity indices count code points, so
 * work on an array of characters rather than the UTF-16 string.
 */
function toHtml(tweet) {
  const chars = Array.from(tweet.text);
  const [start, end] = tweet.display_text_range ?? [0, chars.length];
  const e = tweet.entities ?? {};
  const spans = [
    ...(e.urls ?? []).map((u) => ({
      at: u.indices,
      html: link(u.expanded_url, displayUrl(u.expanded_url), 'underline hover:no-underline'),
    })),
    ...(e.user_mentions ?? []).map((m) => ({
      at: m.indices,
      html: link(`https://x.com/${m.screen_name}`, `@${m.screen_name}`),
    })),
    ...(e.hashtags ?? []).map((h) => ({
      at: h.indices,
      html: link(`https://x.com/hashtag/${h.text}`, `#${h.text}`),
    })),
  ]
    .filter((s) => s.at[0] >= start && s.at[1] <= end)
    .sort((a, b) => a.at[0] - b.at[0]);

  let out = '';
  let i = start;
  for (const s of spans) {
    out += escapeHtml(decodeEntities(chars.slice(i, s.at[0]).join('')));
    out += s.html;
    i = s.at[1];
  }
  out += escapeHtml(decodeEntities(chars.slice(i, end).join('')));

  return out
    .trim()
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n/g, '<br />');
}

/** Plain text (used for image alt text): the visible text, with real link destinations. */
function toText(tweet) {
  const chars = Array.from(tweet.text);
  const [start, end] = tweet.display_text_range ?? [0, chars.length];
  let text = chars.slice(start, end).join('');
  for (const u of tweet.entities?.urls ?? []) text = text.replace(u.url, u.expanded_url);
  return decodeEntities(text).trim();
}

const displayDate = (iso) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

async function downloadImage(url, file) {
  const dest = path.join(IMAGE_DIR, file);
  if (existsSync(dest)) return;
  // name=large is the full-resolution variant; the bare URL is capped smaller.
  const res = await fetch(`${url}?name=large`);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function toPost(tweet) {
  const id = tweet.id_str;
  // Photos, plus the still frame of a video/GIF so the card isn't blank.
  const media = tweet.mediaDetails ?? [];
  const images = [];
  for (const [n, m] of media.entries()) {
    const file = `${id}-${n + 1}${path.extname(new URL(m.media_url_https).pathname) || '.jpg'}`;
    await downloadImage(m.media_url_https, file);
    images.push(file);
  }

  return {
    id,
    url: `https://x.com/${tweet.user?.screen_name || HANDLE}/status/${id}`,
    date: tweet.created_at,
    displayDate: displayDate(tweet.created_at),
    text: toText(tweet),
    html: toHtml(tweet),
    images,
    hasVideo: media.some((m) => m.type !== 'photo'),
  };
}

async function main() {
  const args = process.argv
    .slice(2)
    .flatMap((a) => a.split(/[\s,]+/))
    .filter(Boolean);
  if (!args.length) {
    process.stderr.write('Usage: npm run add:update -- <post link or id> [more…]\n');
    process.exit(1);
  }
  const ids = [...new Set(args.map(idFrom))];

  await mkdir(IMAGE_DIR, { recursive: true });
  const feed = existsSync(DATA_FILE)
    ? JSON.parse(await readFile(DATA_FILE, 'utf8'))
    : { source: `https://x.com/${HANDLE}`, posts: [] };
  const byId = new Map(feed.posts.map((p) => [p.id, p]));

  let failed = 0;
  for (const id of ids) {
    try {
      const tweet = await fetchTweet(id);
      const handle = tweet.user?.screen_name;
      if (handle && handle.toLowerCase() !== HANDLE.toLowerCase()) {
        throw new Error(`posted by @${handle}, not @${HANDLE}`);
      }
      const post = await toPost(tweet);
      process.stdout.write(
        `${byId.has(id) ? 'Updated' : 'Added'} ${post.displayDate}: ${post.text.slice(0, 70)}…\n`,
      );
      byId.set(id, post);
    } catch (err) {
      failed++;
      process.stderr.write(`  ! ${id}: ${err.message}\n`);
    }
  }

  if (failed === ids.length) process.exit(1);

  const posts = [...byId.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
  await writeFile(
    DATA_FILE,
    `${JSON.stringify({ ...feed, syncedAt: new Date().toISOString().slice(0, 10), posts }, null, 2)}\n`,
  );

  const kept = new Set(posts.flatMap((p) => p.images));
  const orphans = (await readdir(IMAGE_DIR)).filter((f) => f !== '.gitkeep' && !kept.has(f));
  process.stdout.write(`\nWrote ${path.relative(ROOT, DATA_FILE)} — ${posts.length} posts\n`);
  if (orphans.length) {
    process.stdout.write(
      `${orphans.length} image(s) no longer referenced, safe to delete:\n  ${orphans.join('\n  ')}\n`,
    );
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`\nadd-update failed: ${err.message}\n`);
  process.exit(1);
});
