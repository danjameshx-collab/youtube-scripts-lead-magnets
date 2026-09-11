# ConvertKit one-time setup

Do this once. After it's done, every future landing page needs zero further ConvertKit work — new videos just point to a different Gamma doc.

## 1. Custom fields

Settings → Custom Fields → add two text fields:

- `lead_magnet_name`
- `lead_magnet_url`

## 2. Form

Forms → New Form → name it something like "Universal Lead Magnet Form". Inline style, First Name + Email fields. (Or reuse an existing form — just tell me its ID.)

Then: Forms → your form → **Embed** → **HTML**. Send me that snippet, or just pull out these three values and paste them into `config/convertkit.json`:

- `formActionUrl` — the `action="https://app.kit.com/forms/XXXXXXX/subscriptions"` value
- `formId` — the numeric ID in that URL
- `formUid` — the `data-uid="..."` value

## 3. Automation

Automations → New Automation:

- Trigger: **Form submitted** → the form from step 2
- Action: **Send Email**, with a generic body that pulls in the per-page merge fields, e.g.:

  > Hey {{ subscriber.first_name }},
  >
  > Here's your guide — **{{ subscriber.fields.lead_magnet_name }}**:
  > {{ subscriber.fields.lead_magnet_url }}

That's it. Every landing page this repo generates fills `lead_magnet_name` and `lead_magnet_url` as hidden form fields specific to that video, so the same automation and email correctly personalizes itself every time.

## Note on the submit mechanism

This repo's landing pages don't use ConvertKit's official embed widget (`ck.5.js`) — it's replaced with a small `fetch()` POST straight to the form's action URL, styled to match the Lincko brand instead of ConvertKit's default form CSS. This is the same endpoint their own widget posts to, so it should work identically, but **test one real submission** after you wire up the real form ID, and let me know if it doesn't show up in ConvertKit — the fallback is switching the template back to their official embed script.
