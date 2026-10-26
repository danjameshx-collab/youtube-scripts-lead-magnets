#!/usr/bin/env node
/**
 * Builds the whole site from content/*.json:
 *   - lp/<slug>/index.html  one landing page per video (thumbnail, headline, form,
 *                           then every other script below the fold)
 *   - all/index.html        the "every script" library page, served at /scripts
 *                           (rewrite in vercel.json)
 *
 * Every page lists every script, so the whole site is rebuilt each time.
 *
 * Usage:
 *   node scripts/build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://lincko-youtube-scripts.vercel.app';

function fail(msg) {
    console.error('Error: ' + msg);
    process.exit(1);
}

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fill(html, replacements) {
    for (const [token, value] of Object.entries(replacements)) {
        html = html.split(token).join(value);
    }
    return html;
}

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';

function thumbImg(page, cls) {
    if (!page.youtubeId) return '';
    const src = 'https://i.ytimg.com/vi/' + page.youtubeId + '/maxresdefault.jpg';
    return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + src + '" alt="' + esc(cardTitle(page)) + '" loading="lazy"' +
        ' onerror="this.onerror=null;this.src=this.src.replace(\'maxresdefault\',\'hqdefault\')">';
}

function cardTitle(page) {
    return page.cardTitle || page.leadMagnetName;
}

const SORT_BAR = [
    '    <div class="sort-bar" role="group" aria-label="Sort scripts">',
    '        <span class="sort-label">Sort by</span>',
    '        <button type="button" class="sort-btn is-active" data-sort="date">Newest</button>',
    '        <button type="button" class="sort-btn" data-sort="views">Most popular</button>',
    '    </div>'
].join('\n');

function cardHtml(page, num) {
    const thumb = page.youtubeId
        ? thumbImg(page)
        : '<div class="thumb-fallback"><img src="/shared/Lincko-logo.png" alt=""><span>' + esc(cardTitle(page)) + '</span></div>';
    return [
        '        <a class="script-card" href="/lp/' + page.slug + '" data-gamma="' + esc(page.leadMagnetUrl) + '" data-date="' + esc(page.published || '') + '" data-views="' + (Number(page.views) || 0) + '">',
        '            <div class="card-thumb">' + thumb + '</div>',
        '            <div class="card-body">',
        '                <div class="card-top"><span class="card-num">' + String(num).padStart(2, '0') + '</span></div>',
        '                <h3 class="card-title">' + esc(cardTitle(page)) + '</h3>',
        '                <p class="card-desc">' + esc(page.subheadline) + '</p>',
        '                <span class="card-cta"><span class="card-cta-label">Get Script</span> ' + ARROW + '</span>',
        '            </div>',
        '        </a>'
    ].join('\n');
}

// ── Load every script config ──
const contentDir = path.join(ROOT, 'content');
const required = ['slug', 'pageTitle', 'badgeText', 'headlineHtml', 'subheadline', 'leadMagnetName', 'leadMagnetUrl'];
const pages = fs.readdirSync(contentDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
        const page = JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'));
        for (const key of required) {
            if (!page[key]) fail('Missing required field "' + key + '" in content/' + f);
        }
        return page;
    });

// Library order: newest first. Hidden configs (e.g. example.json) get a page but are never listed.
const listed = pages
    .filter((p) => !p.hidden)
    .sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')) || a.slug.localeCompare(b.slug));
const numberOf = new Map(listed.map((p, i) => [p.slug, i + 1]));

const ck = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'convertkit.json'), 'utf8'));
if (ck.formActionUrl.includes('REPLACE_FORM_ID')) {
    console.warn('Warning: config/convertkit.json still has placeholder values. Forms will not work until it is filled in.');
}

// ── Per-video landing pages ──
const lpTemplate = fs.readFileSync(path.join(ROOT, 'template', 'index.html'), 'utf8');

for (const page of pages) {
    const buttonText = page.buttonText || 'Unlock Now';
    const successMessage = page.successMessage || "You're in! Taking you to your guide now...";

    let socialProofHtml = '';
    if (Array.isArray(page.socialProof) && page.socialProof.length > 0) {
        const items = page.socialProof
            .map((src) => `            <div class="proof-item">\n                <img src="${src}" alt="Social proof">\n            </div>`)
            .join('\n');
        socialProofHtml =
            `    <div class="section-divider">\n` +
            `        <span>${page.socialProofLabel || 'What people are saying'}</span>\n` +
            `    </div>\n\n` +
            `    <section class="social-proof">\n` +
            `        <div class="proof-column">\n${items}\n        </div>\n` +
            `    </section>`;
    }

    const videoThumbHtml = page.youtubeId
        ? '        <div class="video-thumb">\n' +
          '            <div class="video-thumb-frame">' + thumbImg(page).replace(' loading="lazy"', '') + '</div>\n' +
          '            <div class="video-thumb-tag">' + PLAY + ' The script from this video</div>\n' +
          '        </div>\n'
        : '';

    const others = listed.filter((p) => p.slug !== page.slug);
    const libraryHtml = others.length === 0 ? '' : [
        '    <div class="section-label"><span>Want more?</span></div>',
        '',
        '    <div class="library-head">',
        '        <h2>Get <span class="green">Every Script</span> I\'ve Made</h2>',
        '        <p>This is one of ' + listed.length + ' scripts from my YouTube videos. Grab them all with one signup, or pick the ones you want below.</p>',
        '    </div>',
        '',
        '    <div class="all-box-wrap">',
        '        <div class="all-box">',
        '            <div>',
        '                <div class="all-kicker">All ' + listed.length + ' scripts, one signup</div>',
        '                <div class="all-title" data-unlocked-text="All ' + listed.length + ' Scripts Unlocked">Grab Every Script At Once</div>',
        '                <div class="all-text">Instant access to every video script in one place. No need to claim them one by one.</div>',
        '            </div>',
        '            <a class="all-btn" href="/scripts"><span data-unlocked-text="Open All Scripts">Get All Scripts</span> ' + ARROW + '</a>',
        '        </div>',
        '    </div>',
        '',
        '    <div class="section-label"><span>Or pick a script</span></div>',
        '',
        SORT_BAR,
        '',
        '    <section class="scripts-grid">',
        others.map((p) => cardHtml(p, numberOf.get(p.slug))).join('\n'),
        '    </section>'
    ].join('\n');

    const html = fill(lpTemplate, {
        '{{PAGE_TITLE}}': page.pageTitle,
        '{{HERO_CLASS}}': page.youtubeId ? ' has-thumb' : '',
        '{{VIDEO_THUMB_HTML}}': videoThumbHtml,
        '{{BADGE_TEXT}}': page.badgeText,
        '{{HEADLINE_HTML}}': page.headlineHtml,
        '{{SUBHEADLINE}}': page.subheadline,
        '{{BUTTON_TEXT}}': buttonText,
        '{{SOCIAL_PROOF_HTML}}': socialProofHtml,
        '{{LIBRARY_HTML}}': libraryHtml,
        '{{CK_FORM_ACTION_URL}}': ck.formActionUrl,
        '{{LEAD_MAGNET_NAME}}': page.leadMagnetName,
        '{{LEAD_MAGNET_URL}}': page.leadMagnetUrl,
        '{{SUCCESS_MESSAGE_JSON}}': JSON.stringify(successMessage)
    });

    const outDir = path.join(ROOT, 'lp', page.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    console.log('Built: /lp/' + page.slug);
}

// ── Library page: every script, one signup ──
const libTemplate = fs.readFileSync(path.join(ROOT, 'template', 'scripts.html'), 'utf8');
const libHtml = fill(libTemplate, {
    '{{SCRIPT_COUNT}}': String(listed.length),
    '{{SORT_BAR}}': SORT_BAR,
    '{{CARDS_HTML}}': listed.map((p) => cardHtml(p, numberOf.get(p.slug))).join('\n'),
    '{{CK_FORM_ACTION_URL}}': ck.formActionUrl,
    '{{SITE_URL}}': SITE_URL
});
fs.mkdirSync(path.join(ROOT, 'all'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'all', 'index.html'), libHtml, 'utf8');
console.log('Built: /scripts (' + listed.length + ' scripts)');
