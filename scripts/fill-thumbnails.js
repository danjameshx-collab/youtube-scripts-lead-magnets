#!/usr/bin/env node
/**
 * Finds YouTube videos for script pages that don't have a thumbnail yet.
 *
 * Reads the channel's public feed (latest ~15 public videos). For every
 * content/*.json with no youtubeId:
 *   1. If a video's description links to /lp/<slug>, that video is the match.
 *      This is the reliable way: titles change, the link doesn't.
 *   2. Otherwise, fall back to a close title match.
 * A match fills in youtubeId, then the whole site is rebuilt.
 *
 * Runs hourly from .github/workflows/fill-thumbnails.yml, so a video that goes
 * live gets its thumbnail on the site within about an hour.
 *
 * Usage: node scripts/fill-thumbnails.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const CHANNEL_ID = 'UCmYLTuPDV2gfP1WErd4dHxQ'; // youtube.com/@danjameshx
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
const MIN_TITLE_SCORE = 0.7;

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

// Share of words the two titles have in common, averaged both ways (0 to 1).
function titleScore(a, b) {
    const A = new Set(words(a));
    const B = new Set(words(b));
    if (!A.size || !B.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit++;
    return (hit / A.size + hit / B.size) / 2;
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setId(file, page, id) {
    const out = {};
    for (const k of Object.keys(page)) {
        out[k] = page[k];
        if (k === 'slug') out.youtubeId = id;
    }
    if (!('youtubeId' in out)) out.youtubeId = id;
    fs.writeFileSync(path.join(CONTENT, file), JSON.stringify(out, null, 2) + '\n');
}

async function main() {
    const res = await fetch(FEED);
    if (!res.ok) throw new Error('Feed request failed: ' + res.status);
    const xml = await res.text();

    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
        const e = m[1];
        const pick = (re) => (e.match(re) || [])[1] || '';
        return {
            id: pick(/<yt:videoId>([^<]+)</),
            title: pick(/<title>([^<]*)</),
            description: pick(/<media:description>([\s\S]*?)<\/media:description>/)
        };
    });
    console.log('Feed has ' + videos.length + ' videos.');

    const files = fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json'));
    const pages = files.map((f) => ({ f, page: JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) }));
    const usedIds = new Set(pages.map((p) => p.page.youtubeId).filter(Boolean));

    let changed = 0;
    for (const { f, page } of pages) {
        if (page.hidden || page.youtubeId) continue;

        // 1. A video description links to this page
        const linkRe = new RegExp('/lp/' + escapeRegex(page.slug) + '(?![\\w-])');
        const linked = videos.find((v) => !usedIds.has(v.id) && linkRe.test(v.description));
        if (linked) {
            console.log('Match by description link: ' + page.slug + ' -> ' + linked.id + ' "' + linked.title + '"');
            setId(f, page, linked.id);
            usedIds.add(linked.id);
            changed++;
            continue;
        }

        // 2. Fall back to a close title match
        const titles = [page.leadMagnetName, page.cardTitle, page.pageTitle].filter(Boolean);
        let best = null;
        for (const v of videos) {
            if (usedIds.has(v.id)) continue;
            const s = Math.max(...titles.map((t) => titleScore(t, v.title)));
            if (!best || s > best.s) best = { v, s };
        }
        if (best && best.s >= MIN_TITLE_SCORE) {
            console.log('Match by title: ' + page.slug + ' -> ' + best.v.id + ' "' + best.v.title + '" (score ' + best.s.toFixed(2) + ')');
            setId(f, page, best.v.id);
            usedIds.add(best.v.id);
            changed++;
        } else {
            console.log('No live video yet for: ' + page.slug);
        }
    }

    if (changed) require('./build.js');
    console.log(changed + ' thumbnail(s) added.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
