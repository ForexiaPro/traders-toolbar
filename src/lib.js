// Trader's Toolbar: everything that is not the browser. Pure functions, shared
// by the popup and the service worker, and tested with node:test.
//
// The feeds are read defensively: a field that is missing hides its panel, it
// never breaks the popup. Nothing here is sent anywhere.

export const TOOL = 'chrome-toolbar';

export const URLS = {
  next: 'https://interestratedecision.com/data/next.json',
  odds: 'https://interestratedecision.com/data/odds.json',
  cot: 'https://raw.githubusercontent.com/ForexiaPro/cot-data/main/data/latest.json',
  signals: 'https://tradingsignalbot.com/data/signals.json',
};

export const PAGES = {
  ird: 'https://interestratedecision.com/',
  calendar: 'https://interestratedecision.com/calendar/',
  odds: (bank) => `https://interestratedecision.com/${bank}/rate-odds/`,
  sessions: 'https://forexiapro.com/forex-sessions/',
  cot: 'https://forexiapro.com/cot-report/',
  forexia: 'https://forexiapro.com/',
  tsb: 'https://tradingsignalbot.com/',
  signals: (pair) => `https://tradingsignalbot.com/forex-signals/${pair.toLowerCase()}/`,
  record: 'https://tradingsignalbot.com/record/',
  propsim: 'https://github.com/PropSim-Enterprise',
  opencharts: 'https://github.com/dylanpersonguy/OpenCharts',
  privacy: 'https://github.com/ForexiaPro/traders-toolbar/blob/main/docs/privacy-policy.md',
};

/** A link that says it came from the toolbar (the sites count `?via=`). */
export function withVia(url, via = TOOL) {
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) return null;
  if (/^https:\/\/github\.com\//.test(url)) return url;
  const u = new URL(url);
  u.searchParams.set('via', via);
  return u.toString();
}

/** The shared footer of every tool in the network, as [label, url] pairs. */
export const FOOTER = [
  ['InterestRateDecision.com', PAGES.ird],
  ['Forexia Academy', PAGES.forexia],
  ['TradingSignalBot', PAGES.tsb],
  ['PropSim', PAGES.propsim],
  ['OpenCharts', PAGES.opencharts],
];

// ------------------------------------------------------------- words

/** IRD's rule: nothing that links to it uses these. Applied to text from the signal feed. */
const BANNED = [
  'order block', 'fair value gap', 'fvg', 'kill ?zone', 'liquidity void', 'imbalance', 'buy[- ]side', 'sell[- ]side',
  'inducement', 'displacement', 'break of structure', 'bos', 'change of character', 'choch', 'premium', 'discount',
  'judas', 'silver bullet', 'smc', 'ict',
];
const BANNED_RE = new RegExp(`\\b(?:${BANNED.join('|')})\\b`, 'i');
export const isClean = (text) => typeof text === 'string' && !BANNED_RE.test(text);

// ------------------------------------------------------------- time

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : typeof x === 'string' && x.trim() !== '' && Number.isFinite(+x) ? +x : null);
const timeOf = (x) => {
  if (x == null || x === '') return null;
  const t = typeof x === 'number' ? (x < 1e12 ? x * 1000 : x) : Date.parse(x);
  return Number.isFinite(t) ? t : null;
};

/** "2d 4h", "4h 12m", "12m 05s", "now". */
export function countdown(ms) {
  if (!(ms > 0)) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

/** The toolbar badge: four characters at most. */
export function badgeText(ms) {
  if (ms == null) return '';
  if (ms <= 0) return 'now';
  const m = Math.ceil(ms / 60000);
  if (m <= 60) return `${m}m`;
  const h = Math.floor(ms / 3600000);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ------------------------------------------------------------- decisions

/** The decisions in next.json, soonest first, with t as a number. */
export function decisionsOf(next) {
  const list = Array.isArray(next?.decisions) ? next.decisions : [];
  return list
    .map((d) => ({ ...d, at: timeOf(d?.t) }))
    .filter((d) => d.at && typeof d.bank === 'string')
    .sort((a, b) => a.at - b.at);
}

/** The decisions still to come (one that started less than `grace` ago still counts). */
export function upcoming(next, now = Date.now(), grace = 0) {
  return decisionsOf(next).filter((d) => d.at > now - grace);
}

export const bankLabel = (d) => d.short || d.name || String(d.bank).toUpperCase();

// ------------------------------------------------------------- odds

/** Every meeting with odds in odds.json, whatever its exact shape: {bank, at, hike, hold, cut, rule, page}. */
export function oddsEntries(odds) {
  const out = [];
  const take = (o, bank) => {
    if (!o || typeof o !== 'object') return;
    const b = typeof o.bank === 'string' ? o.bank : bank;
    const p = o.odds && typeof o.odds === 'object' ? o.odds : o.probs && typeof o.probs === 'object' ? o.probs : o;
    let hike = num(p.hike), hold = num(p.hold), cut = num(p.cut);
    if (b && hike != null && hold != null && cut != null) {
      if (hike + hold + cut > 1.5) [hike, hold, cut] = [hike / 100, hold / 100, cut / 100];
      const sum = hike + hold + cut;
      if (sum > 0.9 && sum < 1.1 && hike >= 0 && hold >= 0 && cut >= 0) {
        out.push({ bank: b, at: timeOf(o.t ?? o.date ?? o.at ?? o.time), hike, hold, cut, rule: typeof o.rule === 'string' ? o.rule : null, page: typeof o.page === 'string' ? o.page : null });
      }
      return;
    }
    for (const key of ['meetings', 'next', 'decisions']) if (Array.isArray(o[key])) o[key].forEach((m) => take(m, b));
  };
  const root = odds && typeof odds === 'object' ? odds : {};
  for (const key of ['banks', 'odds', 'meetings', 'decisions']) {
    const v = root[key];
    if (Array.isArray(v)) v.forEach((x) => take(x));
    else if (v && typeof v === 'object') for (const [bank, x] of Object.entries(v)) Array.isArray(x) ? x.forEach((m) => take(m, bank)) : take(x, bank);
  }
  if (Array.isArray(odds)) odds.forEach((x) => take(x));
  if (!out.length) for (const [bank, x] of Object.entries(root)) if (/^[a-z]+$/.test(bank) && x && typeof x === 'object') Array.isArray(x) ? x.forEach((m) => take(m, bank)) : take(x, bank);
  return out;
}

/** The odds of one decision: the entry for its bank nearest its time (within three days), else the bank's first. */
export function oddsFor(odds, bank, at) {
  const mine = oddsEntries(odds).filter((e) => e.bank === bank);
  if (!mine.length) return null;
  if (at) {
    const near = mine.filter((e) => e.at && Math.abs(e.at - at) < 3 * 86400000).sort((a, b) => Math.abs(a.at - at) - Math.abs(b.at - at));
    if (near.length) return near[0];
    if (mine.some((e) => e.at)) return null;
  }
  return mine[0];
}

/** The most likely outcome, for the one-line summary. */
export function lean(o) {
  if (!o) return null;
  return ['hike', 'hold', 'cut'].reduce((a, b) => (o[b] > o[a] ? b : a), 'hold');
}

export const pct = (x) => `${Math.round(x * 100)}%`;

// ------------------------------------------------------------- sessions

export const SESSIONS = [
  { id: 'sydney', name: 'Sydney', zone: 'Australia/Sydney', open: 7, close: 16 },
  { id: 'tokyo', name: 'Tokyo', zone: 'Asia/Tokyo', open: 9, close: 18 },
  { id: 'london', name: 'London', zone: 'Europe/London', open: 8, close: 17 },
  { id: 'newyork', name: 'New York', zone: 'America/New_York', open: 8, close: 17 },
];
const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmtCache = new Map();
/** The weekday, hour and minute in a zone, daylight saving included (Intl does it). */
export function zoned(t, zone) {
  let f = fmtCache.get(zone);
  if (!f) fmtCache.set(zone, (f = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })));
  const p = Object.fromEntries(f.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return { day: DAYS[p.weekday], hour: +p.hour % 24, minute: +p.minute };
}

/** The forex week: Sunday 17:00 to Friday 17:00 in New York. */
export function marketOpen(t) {
  const { day, hour } = zoned(t, 'America/New_York');
  if (day === 6) return false;
  if (day === 5) return hour < 17;
  if (day === 0) return hour >= 17;
  return true;
}

export function sessionOpen(s, t) {
  if (!marketOpen(t)) return false;
  const { day, hour } = zoned(t, s.zone);
  return day >= 1 && day <= 5 && hour >= s.open && hour < s.close;
}

/** Each session now: open or not, and when that changes. */
export function sessions(t = Date.now()) {
  const H = 3600000;
  const first = Math.ceil((t + 1) / H) * H;
  return SESSIONS.map((s) => {
    const open = sessionOpen(s, t);
    let change = null;
    for (let k = first; k < t + 8 * 24 * H; k += H) {
      if (sessionOpen(s, k) !== open) {
        change = k;
        break;
      }
    }
    const { hour, minute } = zoned(t, s.zone);
    return { ...s, open, change, local: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
  });
}

/** The sessions that overlap now, e.g. "London and New York". */
export const overlap = (list) => {
  const open = list.filter((s) => s.open).map((s) => s.name);
  return open.length > 1 ? `${open.slice(0, -1).join(', ')} and ${open.at(-1)}` : null;
};

// ------------------------------------------------------------- COT

export const MAJORS = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const COT_NAMES = { 'EURO FX': 'EUR', 'BRITISH POUND': 'GBP', 'JAPANESE YEN': 'JPY', 'SWISS FRANC': 'CHF', 'CANADIAN DOLLAR': 'CAD', 'AUSTRALIAN DOLLAR': 'AUD', 'NZ DOLLAR': 'NZD', 'NEW ZEALAND DOLLAR': 'NZD', 'USD INDEX': 'USD', 'U.S. DOLLAR INDEX': 'USD', GOLD: 'XAU' };
const pick = (o, keys) => {
  for (const k of keys) {
    const v = k.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), o);
    if (num(v) != null) return num(v);
  }
  return null;
};
const codeOf = (x) => {
  if (typeof x !== 'string') return null;
  const u = x.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(u)) return u;
  for (const [name, code] of Object.entries(COT_NAMES)) if (u.startsWith(name)) return code;
  return null;
};

/**
 * The COT file as {asOf, rows: {EUR: {net, change, pctOi, long, short, oi}}}: the
 * large speculators (legacy non-commercial) of each market, or null when it says
 * nothing usable. Positions only: the file has no index and this adds none.
 */
export function cotOf(data) {
  if (!data || typeof data !== 'object') return null;
  const rows = {};
  const take = (o, key) => {
    if (!o || typeof o !== 'object') return;
    const code = [o.id, o.currency, o.symbol, o.asset, o.code, o.market, o.name, key].map(codeOf).find(Boolean);
    if (!code) return;
    const g = ['legacy.noncommercial', 'legacy.nonCommercial', 'noncommercial', 'nonCommercial', 'speculators'];
    const at = (fields, flat = []) => pick(o, [...g.flatMap((p) => fields.map((f) => `${p}.${f}`)), ...flat]);
    const net = at(['net'], ['net', 'netNonCommercial', 'nonCommercialNet', 'net_noncommercial', 'positions.net']);
    const change = at(['net_change_1w', 'change', 'netChange'], ['net_change_1w', 'change', 'netChange', 'weeklyChange', 'net_change']);
    const pctOi = at(['net_pct_oi', 'netPctOi'], ['net_pct_oi', 'netPctOi']);
    const long = at(['long', 'longs'], ['long']);
    const short = at(['short', 'shorts'], ['short']);
    const oi = pick(o, ['open_interest', 'openInterest', 'oi']);
    if (net == null) return;
    rows[code] = { net, change, pctOi, long, short, oi };
  };
  const lists = [data.currencies, data.markets, data.data, data.rows, data.latest, Array.isArray(data) ? data : null];
  for (const l of lists) {
    if (Array.isArray(l)) l.forEach((x) => take(x));
    else if (l && typeof l === 'object') Object.entries(l).forEach(([k, x]) => take(x, k));
  }
  if (!Object.keys(rows).length) Object.entries(data).forEach(([k, x]) => take(x, k));
  if (!Object.keys(rows).length) return null;
  return { asOf: timeOf(data.report_date ?? data.asOf ?? data.reportDate ?? data.date ?? data.week ?? data.updated), rows };
}

/** A currency's side in words, from the net position: net long or net short. */
export function bias(row) {
  if (!row || row.net == null) return null;
  const side = row.net >= 0 ? 'long' : 'short';
  return { side, label: `Net ${side}` };
}

// ------------------------------------------------------------- signals

const sideOf = (x) => {
  const s = String(x ?? '').toLowerCase();
  return /buy|long/.test(s) ? 'buy' : /sell|short/.test(s) ? 'sell' : null;
};

/** The signals in the feed, latest first: {pair, side, entry, stop, targets, status, at, chart, page, strategy}. */
export function signalsOf(feed) {
  const list = Array.isArray(feed) ? feed : Array.isArray(feed?.signals) ? feed.signals : Array.isArray(feed?.data) ? feed.data : [];
  return list
    .map((s) => {
      if (!s || typeof s !== 'object') return null;
      const pair = String(s.pair ?? s.symbol ?? s.instrument ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!/^[A-Z0-9]{6,8}$/.test(pair)) return null;
      const t = Array.isArray(s.targets) ? s.targets : Array.isArray(s.tp) ? s.tp : s.target ?? s.tp ?? s.takeProfit;
      const targets = (Array.isArray(t) ? t : t == null ? [] : [t]).map((x) => (x && typeof x === 'object' ? num(x.price ?? x.level) : num(x))).filter((x) => x != null);
      const chart = [s.chart, s.image, s.chartUrl, s.img].find((u) => typeof u === 'string' && /^https:\/\/(?:[a-z0-9-]+\.)?tradingsignalbot\.com\//.test(u)) ?? null;
      const page = [s.url, s.page, s.link].find((u) => typeof u === 'string' && /^https:\/\/(?:[a-z0-9-]+\.)?tradingsignalbot\.com\//.test(u)) ?? null;
      const strategy = typeof s.strategy === 'string' && isClean(s.strategy) ? s.strategy : null;
      return {
        pair,
        side: sideOf(s.side ?? s.direction ?? s.type ?? s.action),
        entry: num(s.entry ?? s.price ?? s.open),
        stop: num(s.stop ?? s.sl ?? s.stopLoss),
        targets,
        status: typeof s.status === 'string' && isClean(s.status) ? s.status : null,
        at: timeOf(s.t ?? s.time ?? s.opened ?? s.openedAt ?? s.createdAt ?? s.date),
        chart,
        page,
        strategy,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

export const pairLabel = (p) => (p.length === 6 ? `${p.slice(0, 3)}/${p.slice(3)}` : p);
