# ConvertKit one-time setup

Do this once. After it's done, every future landing page needs zero further ConvertKit work — new videos just point to a different Gamma doc.

## How delivery actually works (updated)

We originally planned to have ConvertKit email people their guide. In practice, the simpler and more reliable approach is: **the landing page itself redirects the visitor straight to their Gamma doc** the moment they submit the form — no email, no waiting, no double opt-in confirmation click required. ConvertKit is just used to capture and store the subscriber (with which lead magnet they came from, via custom fields), for your own future outreach — it doesn't need to deliver anything itself.

## 1. Custom fields — done

`lead_magnet_name` and `lead_magnet_url` already exist as custom fields on your account. Every landing page fills these in automatically on submit, so you never touch this again.

## 2. Form — done

"Universal Lead Magnet Form" (id `9907083`) is created and wired into `config/convertkit.json`. Reused by every page.

## 3. Form settings — important

In the form's **Settings → Confirmation email** tab:

- Tick **"Auto-confirm new subscribers"**. This skips ConvertKit's double opt-in step (the "please confirm your subscription" email) — the subscriber is captured immediately when they submit, matching the instant redirect on our end. Without this, ConvertKit's confirmation email flow runs in parallel but doesn't block or matter, since delivery no longer depends on it.
- You can leave "Send confirmation email" on or off — it's now just an optional welcome touch, not part of delivery.

## Note on the submit mechanism

The landing pages don't use ConvertKit's official embed widget (`ck.5.js`) — it's replaced with a small `fetch()` POST straight to the form's action URL, styled to match the Lincko brand. After a successful submit, the page shows a brief confirmation message, then redirects the browser to that page's `leadMagnetUrl` (the Gamma doc) after ~1.2 seconds.
