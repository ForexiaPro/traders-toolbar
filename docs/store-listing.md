# Chrome Web Store listing

## Name (75 max)

Trader's Toolbar: Central Bank Countdown, Sessions, COT

## Summary (132 max)

The next central bank decision with a countdown and its odds, a forex session clock, COT positioning and the latest signal.

## Category

Productivity (alternative: Tools)

## Language

English

## Description

Trader's Toolbar puts the four things a forex trader checks before a session in one click, with no account.

THE NEXT CENTRAL BANK DECISION
The Fed, ECB, Bank of England, Bank of Japan, Bank of Canada, RBA, RBNZ, SNB, Norges Bank and the Riksbank: which decides next, a live countdown, the time in your own time zone, and the rate going in. The next three decisions are listed below it. The toolbar badge counts down to the next one (3d, 14h, 45m) and turns amber in the last hour.

THE ODDS
Hike, hold or cut, from InterestRateDecision.com's own odds: counted from the record of past decisions, with the method and its full scorecard published. They are not market odds.

SESSION CLOCK
Sydney, Tokyo, London and New York: open or closed, the time in each city, when each opens or closes, and which sessions overlap now. Daylight saving is handled all year.

COT POSITIONING
This week's Commitments of Traders positioning for EUR, GBP, JPY, CHF, CAD, AUD and NZD: large speculators net long or short in contracts, the change on the week and the net as a share of open interest. From the CFTC's public data, with a link to Forexia's COT index and weekly reading.

LATEST SIGNAL
TradingSignalBot's latest signal: pair, side, entry, stop and targets, with its chart. A signal is not advice; every one stays in the public record, losses included.

PRIVATE BY DESIGN
No account, no key, no analytics, no tracking, no remote code. It reads four public data files and keeps the last copy in your browser. It cannot see the pages you visit.

Open source (MIT): github.com/ForexiaPro/traders-toolbar

Part of the Forexia network: InterestRateDecision.com · Forexia Academy · TradingSignalBot · PropSim · OpenCharts

## Single purpose (for the review form)

Shows forex market reference information in a toolbar popup and badge: the next central bank decision and its odds, trading session hours, COT positioning and the latest public signal.

## Permission justifications

- `alarms`: refreshes the data every 30 minutes and moves the badge countdown every minute.
- `storage`: keeps the last copy of the public data files so the popup opens at once and works offline.
- Host `https://interestratedecision.com/data/*`: the central bank decision calendar and odds (public JSON).
- Host `https://raw.githubusercontent.com/ForexiaPro/cot-data/*`: the weekly COT positioning file (public JSON).
- Host `https://tradingsignalbot.com/data/*`: the public signals feed (JSON).

Remote code: No. Everything that runs is in the package.

## Data usage (the privacy tab)

Collects none of the listed data types. Certify: not sold, not used for unrelated purposes, not used for credit. Privacy policy URL: https://github.com/ForexiaPro/traders-toolbar/blob/main/docs/privacy-policy.md (or the same text on a page of forexiapro.com).

## Images

- Icon: `icons/icon128.png`.
- Screenshots (1280×800 or 640×400): the popup from `node scripts/preview.mjs --shot`, placed on a dark 1280×800 canvas. Take them once odds.json, the COT file and the signals feed are live, so no sample data shows.
- Small promo tile (440×280): the icon and "Next decision, sessions, COT".

## Search phrases it should be found for

forex session clock, economic calendar extension, central bank calendar, fomc countdown, cot report, forex market hours
