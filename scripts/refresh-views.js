#!/usr/bin/env node
/**
 * Updates each script's YouTube view count ("views" in content/*.json), used by
 * the "Most popular" sort.
 *
 * Views come from the channel feed (latest ~15 videos), or the video's own page
 * for older ones. To avoid publishing the site every hour just because a number
 * ticked up, files are only rewritten when the popularity ORDER changes, or a
 * script has no view count yet. The counts aren't shown on the page, only the order.
 *
 * Runs hourly from .github/workflows/fill-thumbnails.yml, after fill-thumbnails.js.
 *
 * Usage: node scripts/refresh-views.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCmYLTuPDV2gfP1WErd4dHxQ';

async function viewsFromWatchPage(id) {
    try {
        const res = await fetch('https://www.youtube.com/watch?v=' + id + '&hl=en', {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' }
        });
        const m = (await res.text()).match(/"viewCount":"(\d+)"/);
        return m ? Number(m[1]) : null;
    } catch (e) {
        return null;
    }
}

function ranking(list, key) {
    return list
        .slice()
        .sort((a, b) => (b[key] || 0) - (a[key] || 0) || String(b.page.published || '').localeCompare(String(a.page.published || '')))
        .map((x) => x.page.slug)
        .join(',');
}

async function main() {
    const feedViews = {};
    try {
        const xml = await (await fetch(FEED)).text();
        for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
            const id = (m[1].match(/<yt:videoId>([^<]+)</) || [])[1];
            const v = (m[1].match(/views="(\d+)"/) || [])[1];
            if (id && v) feedViews[id] = Number(v);
        }
    } catch (e) {
        console.warn('Feed unavailable, using video pages only.');
    }

    const files = fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json'));
    const items = [];
    for (const f of files) {
        const page = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
        if (page.hidden || !page.youtubeId) continue;
        let fresh = feedViews[page.youtubeId];
        if (fresh == null) fresh = await viewsFromWatchPage(page.youtubeId);
        items.push({ f, page, old: page.views, fresh: fresh == null ? page.views : fresh });
        console.log(page.slug + ': ' + (fresh == null ? 'unavailable' : fresh + ' views'));
    }

    const missing = items.some((x) => x.old == null && x.fresh != null);
    const reordered = ranking(items, 'old') !== ranking(items, 'fresh');
    if (!missing && !reordered) {
        console.log('Popularity order unchanged. Nothing to update.');
        return;
    }

    for (const x of items) {
        if (x.fresh == null) continue;
        x.page.views = x.fresh;
        fs.writeFileSync(path.join(CONTENT, x.f), JSON.stringify(x.page, null, 2) + '\n');
    }
    require('./build.js');
    console.log('View counts updated (' + (missing ? 'new script' : 'order changed') + ').');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
