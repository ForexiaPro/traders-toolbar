import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  badgeText, bias, cotOf, countdown, isClean, lean, marketOpen, oddsFor, sessionOpen, sessions, SESSIONS, signalsOf, upcoming, withVia,
} from '../src/lib.js';

const next = JSON.parse(readFileSync(new URL('./next.fixture.json', import.meta.url), 'utf8'));
const S = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));

test('countdown and badge', () => {
  assert.equal(countdown(0), 'now');
  assert.equal(countdown(65_000), '1m 05s');
  assert.equal(countdown(3 * 3600_000 + 7 * 60_000), '3h 07m');
  assert.equal(countdown(2 * 86400_000 + 4 * 3600_000), '2d 4h');
  assert.equal(badgeText(59 * 60_000 + 1), '60m');
  assert.equal(badgeText(30 * 60_000), '30m');
  assert.equal(badgeText(5 * 3600_000), '5h');
  assert.equal(badgeText(47.9 * 3600_000), '47h');
  assert.equal(badgeText(3 * 86400_000), '3d');
  assert.equal(badgeText(-1), 'now');
  assert.equal(badgeText(null), '');
  for (const ms of [1, 6e4, 36e5, 864e5, 99 * 864e5]) assert.ok(badgeText(ms).length <= 4);
});

test('next decisions from the live next.json', () => {
  const first = Date.parse(next.decisions[0].t);
  const list = upcoming(next, first - 1000);
  assert.equal(list[0].bank, next.decisions[0].bank);
  assert.ok(list.every((d, i) => !i || d.at >= list[i - 1].at));
  assert.equal(upcoming(next, first + 1000)[0].at > first, true);
  assert.deepEqual(upcoming(null), []);
  assert.deepEqual(upcoming({ decisions: [{ bank: 'fed', t: 'nonsense' }] }), []);
});

test('odds: several shapes, percentages, and nothing when missing', () => {
  const t = Date.parse('2026-12-09T19:00:00Z');
  const shapes = [
    { banks: [{ bank: 'fed', meetings: [{ t: '2026-12-09T19:00:00Z', odds: { hike: 0.02, hold: 0.6, cut: 0.38 }, rule: 'consensus', page: 'https://interestratedecision.com/fed/rate-odds/' }] }] },
    { banks: { fed: { next: [{ date: '2026-12-09T19:00:00Z', hike: 2, hold: 60, cut: 38 }] } } },
    { fed: [{ t: '2026-12-09T19:00:00Z', odds: { hike: 0.02, hold: 0.6, cut: 0.38 } }] },
    { odds: [{ bank: 'fed', t: '2026-12-09T19:00:00Z', hike: 0.02, hold: 0.6, cut: 0.38 }] },
  ];
  for (const s of shapes) {
    const o = oddsFor(s, 'fed', t);
    assert.ok(o, JSON.stringify(s));
    assert.ok(Math.abs(o.hold - 0.6) < 1e-9);
    assert.equal(lean(o), 'hold');
  }
  assert.equal(oddsFor(shapes[0], 'ecb', t), null);
  assert.equal(oddsFor(shapes[0], 'fed', t + 40 * 86400_000), null, 'a different meeting');
  assert.equal(oddsFor(null, 'fed', t), null);
  assert.equal(oddsFor({ banks: [{ bank: 'fed', odds: { hike: 0.9, hold: 0.9, cut: 0.9 } }] }, 'fed', t), null, 'does not add up');
});

test('sessions follow daylight saving', () => {
  // Wednesday 2026-07-15: London is on BST (UTC+1), New York on EDT (UTC-4), Sydney on AEST (UTC+10)
  const jul = (h, m = 0) => Date.parse(`2026-07-15T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
  assert.equal(sessionOpen(S.london, jul(7)), true, '08:00 BST');
  assert.equal(sessionOpen(S.london, jul(6, 59)), false);
  assert.equal(sessionOpen(S.london, jul(16)), false, '17:00 BST');
  assert.equal(sessionOpen(S.newyork, jul(12)), true, '08:00 EDT');
  assert.equal(sessionOpen(S.newyork, jul(11, 30)), false);
  // Wednesday 2026-01-14: GMT and EST, Sydney on AEDT (UTC+11)
  const jan = (h) => Date.parse(`2026-01-14T${String(h).padStart(2, '0')}:00:00Z`);
  assert.equal(sessionOpen(S.london, jan(7)), false);
  assert.equal(sessionOpen(S.london, jan(8)), true);
  assert.equal(sessionOpen(S.newyork, jan(13)), true);
  assert.equal(sessionOpen(S.newyork, jan(12)), false);
  assert.equal(sessionOpen(S.sydney, jan(20)), true, '07:00 AEDT Thursday');
  assert.equal(sessionOpen(S.tokyo, jan(0)), true, '09:00 JST');
});

test('the weekend closes everything', () => {
  const sat = Date.parse('2026-07-18T12:00:00Z');
  assert.equal(marketOpen(sat), false);
  assert.ok(sessions(sat).every((s) => !s.open));
  assert.equal(marketOpen(Date.parse('2026-07-17T20:59:00Z')), true, 'Friday 16:59 New York');
  assert.equal(marketOpen(Date.parse('2026-07-17T21:00:00Z')), false, 'Friday 17:00 New York');
  assert.equal(marketOpen(Date.parse('2026-07-19T21:00:00Z')), true, 'Sunday 17:00 New York');
  const syd = sessions(sat).find((s) => s.id === 'sydney');
  assert.equal(new Date(syd.change).toISOString(), '2026-07-19T21:00:00.000Z', 'Sydney opens Monday 07:00 AEST');
});

test('COT: the cot-data shape, arrays, keyed objects, full CFTC names; positions only', () => {
  const live = cotOf({
    report_date: '2026-10-27',
    markets: [
      { id: 'EUR', name: 'Euro FX', code: '099741', open_interest: 868188, legacy: { noncommercial: { net: -143894, net_change_1w: -9370, net_pct_oi: -16.57 }, commercial: { net: 114484, net_change_1w: 9589, net_pct_oi: 13.19 } }, tff: { leveraged_funds: { net: 5 } } },
      { id: 'JPY', name: 'Japanese Yen', code: '097741', legacy: { noncommercial: { long: 50000, short: 20000, net: 30000 } } },
    ],
  });
  assert.equal(new Date(live.asOf).toISOString().slice(0, 10), '2026-10-27');
  assert.deepEqual(live.rows.EUR, { net: -143894, change: -9370, pctOi: -16.57, long: null, short: null, oi: 868188 });
  assert.equal(live.rows.JPY.long, 50000);
  assert.equal(live.rows.JPY.change, null);
  assert.deepEqual(bias(live.rows.EUR), { side: 'short', label: 'Net short' });
  assert.equal('index' in live.rows.EUR, false);
  const a = cotOf({ asOf: '2026-10-27', currencies: [{ currency: 'EUR', net: 12000 }, { currency: 'JPY', netNonCommercial: -40000 }] });
  assert.equal(a.rows.EUR.net, 12000);
  assert.deepEqual(bias(a.rows.EUR), { side: 'long', label: 'Net long' });
  assert.equal(bias(a.rows.JPY).label, 'Net short');
  const b = cotOf({ reportDate: '2026-10-27', markets: { GBP: { noncommercial: { net: -5000 } } } });
  assert.equal(b.rows.GBP.net, -5000);
  const c = cotOf({ data: [{ market: 'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE', net: '3000' }] });
  assert.equal(c.rows.CAD.net, 3000);
  assert.equal(cotOf({ markets: [{ id: 'EUR', index: 95 }] }), null, 'an index alone is not a position');
  assert.equal(cotOf({}), null);
  assert.equal(cotOf(null), null);
});

test('signals: latest first, only TSB images, no banned words', () => {
  const s = signalsOf({
    signals: [
      { pair: 'EUR/USD', side: 'BUY', entry: 1.08, sl: 1.075, tp: [1.085, 1.09], t: '2026-11-01T10:00:00Z', chart: 'https://tradingsignalbot.com/c/1.png', strategy: 'London breakout' },
      { symbol: 'GBPJPY', direction: 'short', entry: 190, stop: 191, targets: [{ price: 189 }], time: '2026-11-02T10:00:00Z', chart: 'https://evil.example/x.png', strategy: 'Silver Bullet' },
      { pair: 'x' },
    ],
  });
  assert.equal(s.length, 2);
  assert.equal(s[0].pair, 'GBPJPY');
  assert.equal(s[0].side, 'sell');
  assert.deepEqual(s[0].targets, [189]);
  assert.equal(s[0].chart, null);
  assert.equal(s[0].strategy, null);
  assert.equal(s[1].strategy, 'London breakout');
  assert.equal(s[1].chart, 'https://tradingsignalbot.com/c/1.png');
  assert.deepEqual(signalsOf(undefined), []);
});

test('links carry via, words stay clean', () => {
  assert.equal(withVia('https://interestratedecision.com/fed/'), 'https://interestratedecision.com/fed/?via=chrome-toolbar');
  assert.equal(withVia('https://forexiapro.com/cot-report/?a=1'), 'https://forexiapro.com/cot-report/?a=1&via=chrome-toolbar');
  assert.equal(withVia('javascript:alert(1)'), null);
  assert.equal(isClean('Break and retest'), true);
  assert.equal(isClean('Fair value gap'), false);
  assert.equal(isClean('ICT killzone'), false);
});

test('manifest stays within the store limits', () => {
  const m = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.equal(m.manifest_version, 3);
  assert.ok(m.name.length <= 75);
  assert.ok(m.description.length <= 132);
  assert.deepEqual(m.permissions.sort(), ['alarms', 'storage']);
  assert.ok(m.host_permissions.every((h) => /^https:\/\/(interestratedecision\.com|raw\.githubusercontent\.com\/ForexiaPro\/cot-data|tradingsignalbot\.com)\//.test(h)));
});
