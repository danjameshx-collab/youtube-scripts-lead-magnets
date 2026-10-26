#!/usr/bin/env node
/**
 * Finds YouTube videos for script pages that don't have a thumbnail yet.
 *
 * Reads the channel's public feed (latest ~15 public videos). For every
 * content/*.json with no youtubeId, it compares the page's titles with each
 * video title. A close match fills in youtubeId, then the site is rebuilt.
 * Runs hourly from .github/workflows/fill-thumbnails.yml, so a video that goes
 * live gets its thumbnail on the site within about an hour.
 *
 * If a YouTube title is worded very differently from the page, add
 * "youtubeTitle": "<exact YouTube title>" to that page's JSON, or just set youtubeId.
 *
 * Usage: node scripts/fill-thumbnails.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHANNEL_ID = 'UCmYLTuPDV2gfP1WErd4dHxQ'; // youtube.com/@danjameshx
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
const MIN_SCORE = 0.7;

function words(s) {
    return String(s)
        .toLowerCase()
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/^lincko\s*::\s*/, '')
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9$]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);
}

// Share of the page title's words that appear in the video title (and vice versa), averaged.
function score(a, b) {
    const A = new Set(words(a));
    const B = new Set(words(b));
    if (!A.size || !B.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit++;
    return (hit / A.size + hit / B.size) / 2;
}

async function main() {
    const res = await fetch(FEED);
    if (!res.ok) throw new Error('Feed request failed: ' + res.status);
    const xml = await res.text();
    const videos = [...xml.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]*)<\/title>/g)]
        .map((m) => ({ id: m[1], title: m[2] }));
    console.log('Feed has ' + videos.length + ' videos.');

    const dir = path.join(ROOT, 'content');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const pages = files.map((f) => ({ f, page: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
    const usedIds = new Set(pages.map((p) => p.page.youtubeId).filter(Boolean));

    let changed = 0;
    for (const { f, page } of pages) {
        if (page.hidden || page.youtubeId) continue;
        const titles = [page.youtubeTitle, page.leadMagnetName, page.cardTitle, page.pageTitle].filter(Boolean);
        let best = null;
        for (const v of videos) {
            if (usedIds.has(v.id)) continue;
            const s = Math.max(...titles.map((t) => score(t, v.title)));
            if (!best || s > best.s) best = { v, s };
        }
        if (best && best.s >= MIN_SCORE) {
            console.log('Match: ' + page.slug + ' -> ' + best.v.id + ' "' + best.v.title + '" (score ' + best.s.toFixed(2) + ')');
            const out = {};
            for (const k of Object.keys(page)) {
                out[k] = page[k];
                if (k === 'slug') out.youtubeId = best.v.id;
            }
            if (!('youtubeId' in out)) out.youtubeId = best.v.id;
            fs.writeFileSync(path.join(dir, f), JSON.stringify(out, null, 2) + '\n');
            usedIds.add(best.v.id);
            changed++;
        } else {
            console.log('No live video yet for: ' + page.slug + (best ? ' (closest "' + best.v.title + '", score ' + best.s.toFixed(2) + ')' : ''));
        }
    }

    if (changed) {
        require('./build.js');
    }
    console.log(changed + ' thumbnail(s) added.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
