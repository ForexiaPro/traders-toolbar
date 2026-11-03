// The service worker: refreshes the feeds every 30 minutes and moves the badge
// every minute. It wakes on alarms only; nothing runs in between.
import { paintBadge, readCache, refresh } from './data.js';

const TICK = 'tick';
const REFRESH = 'refresh';

async function schedule() {
  await chrome.alarms.create(TICK, { periodInMinutes: 1 });
  await chrome.alarms.create(REFRESH, { periodInMinutes: 30 });
  await paintBadge(await refresh());
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === REFRESH) return paintBadge(await refresh());
  if (alarm.name === TICK) {
    const cache = await readCache();
    // a decision just passed: fetch again so the badge moves to the next one
    if (!cache.next || Date.now() - cache.fetchedAt > 35 * 60 * 1000) return paintBadge(await refresh());
    return paintBadge(cache);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'refreshed') readCache().then(paintBadge).then(() => reply(true));
  return true;
});
