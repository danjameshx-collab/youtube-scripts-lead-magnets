#!/usr/bin/env node
// Kept so the old command still works. Every page now lists every script,
// so adding one page means rebuilding the whole site.
//   node scripts/new-landing-page.js content/<slug>.json   (same as: node scripts/build.js)
require("./build.js");
