# Lincko Lead Magnets

One site, one landing page per YouTube video, at `lincko.<tld>/lp/<slug>`. Replaces the old pattern of a separate GitHub repo + hosting project per lead magnet.

## One-time setup (do this before the first real page goes live)

1. **ConvertKit**: follow [CONVERTKIT_SETUP.md](CONVERTKIT_SETUP.md), then fill in the real values in `config/convertkit.json`.
2. **GitHub**: create an empty repo (e.g. `lincko-lead-magnets`), then:
   ```
   git init
   git add .
   git commit -m "Initial scaffold"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. **Hosting**: import that repo once into Vercel or Netlify (either dashboard's "New Project/Site from Git"). Every push after that auto-deploys. No further setup needed.

## Generating a new landing page (per video, going forward)

1. Copy `content/example.json` to `content/<slug>.json` and fill it in: headline, subheadline, the Gamma doc link, `youtubeId` (the part after `watch?v=`, used for the thumbnail) and `published` (YYYY-MM-DD, sets the order in the library, newest first). Optional `cardTitle` overrides the title on library cards. `"hidden": true` keeps a page out of the library.
2. Run:
   ```
   node scripts/build.js
   ```
   This rebuilds every `lp/<slug>/index.html` and the library page `all/index.html` (every page lists every script, so the whole site is rebuilt).
3. Commit and push. It deploys automatically at `/lp/<slug>`, and `/scripts` picks it up.

## The script library

- `/scripts`: every script on one page. One signup unlocks all of them in place.
- Each `/lp/<slug>` page shows the video thumbnail, headline and form, then a "Get every script" box and cards for every other script.
- After someone signs up on any page, their browser remembers it, so every card opens its Gamma doc directly with no second signup.

## Structure

- `template/index.html`: the page template, styled to match the Lincko brand (dark background, green accent), used by the generator script
- `shared/`: logo/favicon reused by every page (not duplicated per page)
- `config/convertkit.json`: the one reusable ConvertKit form's action URL / IDs
- `content/*.json`: one config file per video's landing page
- `lp/<slug>/index.html`: generated output, one folder per video
- `scripts/build.js`: the generator (`scripts/new-landing-page.js` still works and does the same)
- `template/scripts.html` -> `all/index.html`: the library page, served at `/scripts`
- `shared/scripts-grid.css`, `shared/scripts.js`: card styles and unlock logic shared by every page
