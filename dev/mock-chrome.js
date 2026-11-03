// The preview only (never packed): stands in for the chrome.* APIs so the popup
// runs in a normal tab, and sends the feeds through scripts/preview.mjs, which
// fetches them live and falls back to dev/samples/ for a feed that is not live yet.
(() => {
  const mem = {};
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/manifest.json', false);
  xhr.send();
  const manifest = JSON.parse(xhr.responseText);
  const samples = [];
  window.__samples = samples;
  window.chrome = {
    storage: { local: { get: async (k) => (k in mem ? { [k]: mem[k] } : {}), set: async (o) => Object.assign(mem, o) } },
    runtime: { getManifest: () => manifest, sendMessage: async () => true },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
  };
  const real = window.fetch.bind(window);
  window.fetch = async (url, init) => {
    const res = await real(`/proxy?u=${encodeURIComponent(url)}`, { signal: init?.signal });
    if (res.headers.get('x-sample')) {
      samples.push(res.headers.get('x-sample'));
      const el = document.getElementById('samples');
      if (el) el.textContent = `Preview: sample data for ${samples.join(', ')} (not live yet).`;
    }
    return res;
  };
})();
