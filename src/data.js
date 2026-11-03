// Fetching the four feeds and keeping the last good copy of each in
// chrome.storage.local. Used by the service worker and by the popup.
import { URLS, badgeText, bankLabel, countdown, upcoming } from './lib.js';

export const STALE_MS = 20 * 60 * 1000;
const KEY = 'cache';

async function getJson(url, timeout = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-cache', credentials: 'omit' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function readCache() {
  const got = await chrome.storage.local.get(KEY);
  return got[KEY] ?? { fetchedAt: 0 };
}

/**
 * Fetches every feed. A feed that fails keeps its last good copy, except the
 * optional ones (odds, COT, signals) after 8 days, so a panel never shows
 * week-old figures as this week's.
 */
export async function refresh() {
  const old = await readCache();
  const now = Date.now();
  const entries = await Promise.all(Object.entries(URLS).map(async ([k, url]) => [k, await getJson(url)]));
  const cache = { fetchedAt: now, at: { ...(old.at ?? {}) } };
  for (const [k, value] of entries) {
    if (value != null) {
      cache[k] = value;
      cache.at[k] = now;
    } else if (old[k] != null && (k === 'next' || now - (old.at?.[k] ?? 0) < 8 * 86400000)) {
      cache[k] = old[k];
    }
  }
  await chrome.storage.local.set({ [KEY]: cache });
  return cache;
}

/** Sets the toolbar badge and its tooltip from the cache. */
export async function paintBadge(cache) {
  const now = Date.now();
  const d = upcoming(cache?.next, now)[0];
  if (!d) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: "Trader's Toolbar" });
    return;
  }
  const ms = d.at - now;
  await chrome.action.setBadgeText({ text: badgeText(ms) });
  await chrome.action.setBadgeBackgroundColor({ color: ms < 3600000 ? '#f5a524' : '#3d5afe' });
  if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  await chrome.action.setTitle({ title: `Next: ${bankLabel(d)} ${d.rateName ?? 'decision'} in ${countdown(ms)}` });
}
