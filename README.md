# Lincko Lead Magnets

One site, one landing page per YouTube video, at `lincko.<tld>/lp/<slug>`. Replaces the old pattern of a separate GitHub repo + hosting project per lead magnet.

## One-time setup (do this before the first real page goes live)

1. **ConvertKit** — follow [CONVERTKIT_SETUP.md](CONVERTKIT_SETUP.md), then fill in the real values in `config/convertkit.json`.
2. **GitHub** — create an empty repo (e.g. `lincko-lead-magnets`), then:
   ```
   git init
   git add .
   git commit -m "Initial scaffold"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. **Hosting** — import that repo once into Vercel or Netlify (either dashboard's "New Project/Site from Git"). Every push after that auto-deploys. No further setup needed.

## Generating a new landing page (per video, going forward)

1. Copy `content/example.json` to `content/<slug>.json` and fill it in — headline, subheadline, the Gamma doc link, etc.
2. Run:
   ```
   node scripts/new-landing-page.js content/<slug>.json
   ```
   This writes `lp/<slug>/index.html`.
3. Commit and push. It deploys automatically at `/lp/<slug>`.

## Structure

- `template/index.html` — the page template, styled to match the Lincko brand (dark background, green accent), used by the generator script
- `shared/` — logo/favicon reused by every page (not duplicated per page)
- `config/convertkit.json` — the one reusable ConvertKit form's action URL / IDs
- `content/*.json` — one config file per video's landing page
- `lp/<slug>/index.html` — generated output, one folder per video
- `scripts/new-landing-page.js` — the generator
