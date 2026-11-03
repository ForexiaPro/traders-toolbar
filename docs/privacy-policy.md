# Trader's Toolbar: privacy policy

Last updated: 2 November 2026

Trader's Toolbar collects nothing about you.

- **No data is collected or sent.** The extension has no account, no analytics, no cookies, no advertising and no tracking of any kind. It does not read the pages you visit, your tabs, your history or anything you type.
- **What it fetches.** Four public files, every 30 minutes and when you open the popup: `https://interestratedecision.com/data/next.json`, `https://interestratedecision.com/data/odds.json`, `https://raw.githubusercontent.com/ForexiaPro/cot-data/main/data/latest.json` and `https://tradingsignalbot.com/data/signals.json`. These are plain downloads, sent without cookies. As with any download, the server that answers sees the request's network address; the extension adds nothing to identify you.
- **What it keeps.** The last copy of those four files, in your browser's extension storage (`chrome.storage.local`), so the popup opens at once. It never leaves your browser. Removing the extension deletes it.
- **Links.** The popup's links open pages of InterestRateDecision.com, Forexia, TradingSignalBot and their partners in a new tab, with `?via=chrome-toolbar` in the address so those sites can count how many visits came from the extension. What those sites keep is said in their own privacy policies.
- **Permissions.** `alarms` (to refresh the figures and the badge on a schedule), `storage` (the cache above), and access to the three hosts above only.
- **No remote code.** Everything the extension runs is in the package you installed.

Questions: dylan@forexiapro.com.

The source is public: https://github.com/ForexiaPro/traders-toolbar
