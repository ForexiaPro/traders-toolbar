# Microsoft Edge Add-ons

The same zip works: Edge runs Manifest V3 Chrome extensions unchanged (`chrome.*` APIs, module service worker, `chrome.action` badge).

1. `npm run pack`, then upload `dist/traders-toolbar-<version>.zip` at https://partner.microsoft.com/dashboard/microsoftedge (a Microsoft Partner Center account; free, unlike Chrome's $5).
2. Listing: reuse `store-listing.md`. Edge asks for a short description (up to 250 characters), the long description, a category (Productivity), and a privacy policy URL (the same).
3. Images: a 300×300 logo (upscale the 128 icon by redrawing: set the sizes in `scripts/icons.mjs` to include 300), 1280×800 screenshots, an optional 440×280 tile.
4. "Notes for certification": "No account or login is needed. The popup shows public data from interestratedecision.com, raw.githubusercontent.com/ForexiaPro/cot-data and tradingsignalbot.com. Panels whose feed is unavailable are hidden."
5. Review usually takes a few working days. Updates: bump `version` in `manifest.json` and upload the new zip to both stores.

Differences to check before submitting:

- The badge text colour (`setBadgeTextColor`) exists from Chrome 110 and Edge 110; the code calls it only when present.
- Edge shows the popup with a slightly different maximum height (600 px in both, with a scroll bar beyond it).
