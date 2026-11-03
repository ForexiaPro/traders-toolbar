// The popup: drawn from the cache at once, then again after a refresh when the
// cache is older than STALE_MS. Text from the feeds goes in as text, never HTML.
import { STALE_MS, readCache, refresh } from './data.js';
import {
  FOOTER, MAJORS, PAGES, bankLabel, bias, cotOf, countdown, lean, oddsFor, overlap, pairLabel, pct, sessions, signalsOf, upcoming, withVia,
} from './lib.js';

const app = document.getElementById('app');

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
const link = (url, text) => {
  const href = withVia(url);
  return href ? h('a', { href, target: '_blank', rel: 'noopener' }, text) : null;
};
const local = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const localTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const short = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const reportDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtNum = (x) => (x == null ? '–' : String(+x.toFixed(5)));
const signed = (x) => (x == null ? '' : `${x > 0 ? '+' : ''}${x.toLocaleString()}`);
const compact = (x) => (x == null ? '' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x) >= 1000 ? `${(Math.abs(x) / 1000).toFixed(Math.abs(x) >= 100000 ? 0 : 1)}k` : Math.abs(x)}`);
const signedPct = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)}%`;

function decisionPanel(cache, now) {
  const list = upcoming(cache.next, now, 0);
  const d = list[0];
  if (!d) return h('section', { class: 'panel' }, h('h2', {}, 'Next central bank decision'), h('p', { class: 'empty' }, 'No decision in the calendar right now.'), h('div', { class: 'links' }, link(PAGES.calendar, 'Calendar')));
  const ms = d.at - now;
  const o = oddsFor(cache.odds, d.bank, d.at);
  const rateBefore = typeof d.rateBefore === 'number' ? ` · now ${d.rateBefore.toFixed(2)}%` : '';
  return h(
    'section',
    { class: 'panel hero' },
    h('h2', {}, 'Next central bank decision', link(PAGES.calendar, 'Calendar')),
    h('div', {}, h('span', { class: 'bank' }, bankLabel(d)), ' ', h('span', { class: 'what' }, `${d.rateName ?? 'rate decision'}${rateBefore}`)),
    h('div', { class: `clock${ms < 3600000 ? ' soon' : ''}`, 'data-at': d.at }, countdown(ms)),
    h('div', { class: 'when' }, `${local.format(d.at)} your time${d.tentative ? ' (tentative)' : ''}`),
    o &&
      h(
        'div',
        { class: 'odds' },
        h('div', { class: 'bar', role: 'img', 'aria-label': `Hike ${pct(o.hike)}, hold ${pct(o.hold)}, cut ${pct(o.cut)}` }, ['hike', 'hold', 'cut'].map((k) => h('span', { class: k, style: `width:${(o[k] * 100).toFixed(1)}%` }))),
        h('div', { class: 'legend' }, ['hike', 'hold', 'cut'].map((k) => h('span', {}, h('i', { class: `dot ${k}` }), `${k[0].toUpperCase()}${k.slice(1)} `, h('b', {}, pct(o[k]))))),
        h('div', { class: 'note' }, `Odds from the record, not market odds. Leans ${lean(o)}.`),
      ),
    h('div', { class: 'links' }, link(d.page, 'Decision page'), link(o?.page ?? PAGES.odds(d.bank), 'How the odds are counted')),
    list.length > 1 &&
      h(
        'div',
        { class: 'rows', style: 'margin-top:10px' },
        list.slice(1, 4).map((x) => h('div', { class: 'row' }, link(x.page, bankLabel(x)) ?? bankLabel(x), h('span', { class: 't' }, short.format(x.at)), h('span', { class: 's', 'data-at': x.at }, countdown(x.at - now)))),
      ),
  );
}

function sessionPanel(now) {
  const list = sessions(now);
  const both = overlap(list);
  return h(
    'section',
    { class: 'panel' },
    h('h2', {}, 'Sessions', link(PAGES.sessions, 'Session guide')),
    h(
      'div',
      { class: 'rows' },
      list.map((s) =>
        h(
          'div',
          { class: 'row' },
          h('span', {}, h('i', { class: `state${s.open ? ' on' : ''}` }), s.name),
          h('span', { class: 't' }, s.local),
          h('span', { class: 's' }, s.change ? `${s.open ? 'closes' : 'opens'} in ${countdown(s.change - now).replace(/ \d+s$/, '')}` : ''),
        ),
      ),
    ),
    h('div', { class: 'note' }, both ? `${both} overlap now. ` : '', `Local times in each city. Yours: ${localTime.format(now)}.`),
  );
}

function cotPanel(cache) {
  const cot = cotOf(cache.cot);
  if (!cot) return null;
  const codes = MAJORS.filter((c) => cot.rows[c]);
  if (!codes.length) return null;
  return h(
    'section',
    { class: 'panel' },
    h('h2', {}, `COT positioning${cot.asOf ? ` · ${reportDate.format(cot.asOf)}` : ''}`),
    h(
      'div',
      { class: 'cot' },
      codes.map((c) => {
        const r = cot.rows[c];
        const b = bias(r);
        const title = [
          `${c}: net ${signed(r.net)} contracts`,
          r.long != null && r.short != null ? `${r.long.toLocaleString()} long, ${r.short.toLocaleString()} short` : null,
          r.change != null ? `${signed(r.change)} on the week` : null,
          r.pctOi != null ? `${signedPct(r.pctOi)} of open interest` : null,
        ].filter(Boolean).join(', ');
        return h(
          'div',
          { title },
          h('div', { class: 'c' }, c, ' ', h('span', { class: `b ${b.side}` }, b.side === 'long' ? 'Long' : 'Short')),
          h('div', { class: 'n' }, compact(r.net)),
          h('div', { class: 's' }, r.change != null ? `${compact(r.change)} wk` : '', r.change != null && r.pctOi != null ? ' · ' : '', r.pctOi != null ? `${signedPct(r.pctOi)} OI` : ''),
        );
      }),
    ),
    h('div', { class: 'note' }, 'Large speculators (non-commercial), CFTC futures: net contracts, the change on the week and the net as a share of open interest.'),
    h('div', { class: 'links' }, link(PAGES.cot, 'COT index and weekly reading')),
  );
}

function signalPanel(cache) {
  const s = signalsOf(cache.signals)[0];
  if (!s) return null;
  const tg = s.targets.length ? s.targets.map(fmtNum).join(' · ') : '–';
  return h(
    'section',
    { class: 'panel sig' },
    h('h2', {}, 'Latest TradingSignalBot signal', link(PAGES.record, 'Full record')),
    h(
      'div',
      { class: 'head' },
      h('div', {}, h('span', { class: 'pair' }, pairLabel(s.pair)), s.side && h('span', { class: `side ${s.side}` }, s.side.toUpperCase())),
      h('span', { class: 'updated' }, [s.status, s.at && local.format(s.at)].filter(Boolean).join(' · ')),
    ),
    h('div', { class: 'lv' }, h('span', {}, 'Entry', h('b', {}, fmtNum(s.entry))), h('span', {}, 'Stop', h('b', {}, fmtNum(s.stop))), h('span', {}, 'Targets', h('b', {}, tg))),
    s.chart && h('img', { src: s.chart, alt: `${pairLabel(s.pair)} signal chart`, loading: 'lazy' }),
    h('div', { class: 'note' }, 'A signal is not advice. Every signal stays in the public record, losses included.'),
    h('div', { class: 'links' }, link(s.page ?? PAGES.signals(s.pair), `${pairLabel(s.pair)} signals`)),
  );
}

function footer(cache) {
  const version = globalThis.chrome?.runtime?.getManifest?.().version;
  const parts = [];
  FOOTER.forEach(([label, url], i) => parts.push(i ? ' · ' : '', link(url, label)));
  return h(
    'footer',
    { class: 'foot' },
    h('div', {}, 'Part of the Forexia network: ', parts),
    h('div', {}, link(PAGES.privacy, 'Privacy: collects nothing'), version ? ` · v${version}` : '', cache.fetchedAt ? ` · figures from ${localTime.format(cache.fetchedAt)}` : ''),
  );
}

function render(cache) {
  const now = Date.now();
  app.replaceChildren(
    h('header', { class: 'top' }, h('div', { class: 'brand' }, h('img', { src: '../icons/icon32.png', alt: '' }), "Trader's Toolbar")),
    decisionPanel(cache, now),
    sessionPanel(now),
    cotPanel(cache),
    signalPanel(cache),
    footer(cache),
  );
}

let cache = await readCache();
render(cache);
setInterval(() => {
  const now = Date.now();
  for (const el of app.querySelectorAll('[data-at]')) el.textContent = countdown(+el.dataset.at - now);
}, 1000);
setInterval(() => render(cache), 60000);
if (!cache.next || Date.now() - cache.fetchedAt > STALE_MS) {
  cache = await refresh();
  render(cache);
  chrome.runtime.sendMessage({ type: 'refreshed' }).catch(() => {});
}
