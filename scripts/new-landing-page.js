#!/usr/bin/env node
/**
 * Generates a new lead-magnet landing page under lp/<slug>/index.html
 * from template/index.html, using a JSON config file.
 *
 * Usage:
 *   node scripts/new-landing-page.js content/<slug>.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function fail(msg) {
    console.error('Error: ' + msg);
    process.exit(1);
}

const configPath = process.argv[2];
if (!configPath) {
    fail('Usage: node scripts/new-landing-page.js content/<slug>.json');
}

const resolvedConfigPath = path.isAbsolute(configPath) ? configPath : path.join(ROOT, configPath);
if (!fs.existsSync(resolvedConfigPath)) {
    fail('Config file not found: ' + resolvedConfigPath);
}

const page = JSON.parse(fs.readFileSync(resolvedConfigPath, 'utf8'));

const required = ['slug', 'pageTitle', 'badgeText', 'headlineHtml', 'subheadline', 'leadMagnetName', 'leadMagnetUrl'];
for (const key of required) {
    if (!page[key]) fail('Missing required field in config: ' + key);
}

const ckConfigPath = path.join(ROOT, 'config', 'convertkit.json');
const ck = JSON.parse(fs.readFileSync(ckConfigPath, 'utf8'));
if (ck.formActionUrl.includes('REPLACE_FORM_ID')) {
    console.warn('Warning: config/convertkit.json still has placeholder values. The form on this page will not work until you fill in the real ConvertKit form details.');
}

const buttonText = page.buttonText || 'Unlock Now';
const successMessage = page.successMessage || 'Success! Check your email to get your free guide.';

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

const templatePath = path.join(ROOT, 'template', 'index.html');
let html = fs.readFileSync(templatePath, 'utf8');

const replacements = {
    '{{PAGE_TITLE}}': page.pageTitle,
    '{{BADGE_TEXT}}': page.badgeText,
    '{{HEADLINE_HTML}}': page.headlineHtml,
    '{{SUBHEADLINE}}': page.subheadline,
    '{{BUTTON_TEXT}}': buttonText,
    '{{SOCIAL_PROOF_HTML}}': socialProofHtml,
    '{{CK_FORM_ACTION_URL}}': ck.formActionUrl,
    '{{LEAD_MAGNET_NAME}}': page.leadMagnetName,
    '{{LEAD_MAGNET_URL}}': page.leadMagnetUrl,
    '{{SUCCESS_MESSAGE_JSON}}': JSON.stringify(successMessage)
};

for (const [token, value] of Object.entries(replacements)) {
    html = html.split(token).join(value);
}

const outDir = path.join(ROOT, 'lp', page.slug);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

console.log('Generated: lp/' + page.slug + '/index.html');
console.log('Local preview path once deployed: /lp/' + page.slug);
