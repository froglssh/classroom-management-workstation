/* 工作站長期儲存：IndexedDB 偏好設定 ＋ 指定資料夾正本（File System Access API）。
 * 需先載入 core.js（window.ClassDB）。
 * - 共用名冊與六項整合版工具資料仍存於 core.js 的 IndexedDB（lssh.classWorkspace.v1）。
 * - 本檔另用一個小資料庫（lssh.classWorkspace.hub）保存：資料夾授權、同步紀錄、常用工具、最近開啟。
 * - 連結資料夾後，資料一有變動就把「完整備份」寫入資料夾，並每天留一份歷史版本（保留 14 天）。
 * - 資料夾若被其他電腦更新，不會直接覆蓋，而是請老師選擇「載入資料夾版本」或「以本機覆蓋」。 */
(() => {
  'use strict';
  const HUB_DB = 'lssh.classWorkspace.hub', HUB_VERSION = 1;
  const FILE = '班級經營工作站資料.json';
  const HIST_DIR = '班級經營工作站_歷史';
  const HIST_RE = /^班級經營工作站資料_\d{8}\.json$/;
  const HIST_KEEP = 14;
  const APP = 'lssh.classWorkspace';
  const fsSupported = typeof window.showDirectoryPicker === 'function';
  const pad = n => String(n).padStart(2, '0');
  const day = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const minute = (d = new Date()) => `${day(d)}-${pad(d.getHours())}${pad(d.getMinutes())}`;

  // ---------- 小型 IndexedDB（key-value） ----------
  let dbp;
  function db() {
    return dbp ??= new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('瀏覽器停用了 IndexedDB'));
      const r = indexedDB.open(HUB_DB, HUB_VERSION);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
      r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); resolve(r.result); };
      r.onerror = () => reject(r.error);
    }).catch(e => { dbp = null; throw e; });
  }
  async function kv(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction('kv', mode), r = fn(tx.objectStore('kv'));
      let out; if (r) r.onsuccess = () => { out = r.result; };
      tx.oncomplete = () => resolve(out); tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  const get = k => kv('readonly', s => s.get(k));
  const put = (k, v) => kv('readwrite', s => s.put(v, k));
  const del = k => kv('readwrite', s => s.delete(k));

  // ---------- 偏好設定（常用、最近、裝置名稱） ----------
  const PREF_DEFAULT = { favorites: [], recent: [], deviceName: '' };
  let prefs = { ...PREF_DEFAULT }, prefsReady = false, idbOk = true;
  async function loadPrefs() {
    try { prefs = { ...PREF_DEFAULT, ...(await get('prefs') || {}) }; }
    catch { idbOk = false; }
    if (!prefs.recent.length) { // 由舊版首頁（localStorage）搬入最近開啟
      try { const old = JSON.parse(localStorage.getItem('lssh.classWorkspace.recent.v1') || '[]'); if (Array.isArray(old)) prefs.recent = old.slice(0, 6); } catch {}
    }
    prefsReady = true; return prefs;
  }
  async function savePrefs(patch) {
    prefs = { ...prefs, ...patch };
    try { await put('prefs', prefs); } catch { idbOk = false; }
    emit(); return prefs;
  }

  // ---------- 資料夾同步狀態 ----------
  const st = {
    supported: fsSupported, status: fsSupported ? 'none' : 'unsupported',
    folderName: '', lastSync: 0, histCount: 0, error: '', conflict: null, busy: false
  };
  let handle = null, known = null, syncedSig = '', timer = null, running = null;
  const listeners = new Set();
  function emit() { const snap = { ...st, prefs: { ...prefs }, idbOk }; listeners.forEach(fn => { try { fn(snap); } catch {} }); }
  function set(patch) { Object.assign(st, patch); emit(); }

  const sigOf = b => [b.main.revision, ...b.modules.map(m => `${m.scopeId}:${m.module}:${m.revision}`).sort()].join('|');
  function summary(b) {
    const m = b?.main; if (!m) return '無法讀取';
    const students = m.contexts.reduce((n, c) => n + c.roster.filter(e => e.active).length, 0);
    return `${m.contexts.length} 個班級學期、${students} 位在籍學生、${b.modules.length} 份工具資料`;
  }
  function deviceName() {
    if (prefs.deviceName) return prefs.deviceName;
    const ua = navigator.userAgent;
    return /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows 電腦' : /iPad|iPhone/.test(ua) ? 'iPad' : '這台電腦';
  }

  async function readMaster() {
    try {
      const f = await (await handle.getFileHandle(FILE)).getFile();
      const text = await f.text(); let obj = null; try { obj = JSON.parse(text); } catch {}
      return { exists: true, text, obj, lastModified: f.lastModified };
    } catch (e) { if (e?.name === 'NotFoundError') return { exists: false }; throw e; }
  }
  async function writeFile(dir, name, text) {
    const fh = await dir.getFileHandle(name, { create: true }), w = await fh.createWritable();
    try { await w.write(text); await w.close(); } catch (e) { try { await w.abort(); } catch {} throw e; }
    return (await fh.getFile()).lastModified;
  }
  async function keepDaily(cur) {
    const hist = await handle.getDirectoryHandle(HIST_DIR, { create: true });
    if (cur?.exists) {
      const name = `班級經營工作站資料_${day()}.json`;
      try { await hist.getFileHandle(name); } catch { await writeFile(hist, name, cur.text); }
    }
    const names = [];
    for await (const [n, h] of hist.entries()) if (h.kind === 'file' && HIST_RE.test(n)) names.push(n);
    names.sort().reverse();
    for (const n of names.slice(HIST_KEEP)) await hist.removeEntry(n);
    st.histCount = Math.min(names.length, HIST_KEEP);
  }
  async function saveAside(text, label) {
    const hist = await handle.getDirectoryHandle(HIST_DIR, { create: true });
    const name = `班級經營工作站資料_${label}_${minute()}.json`;
    await writeFile(hist, name, text); return `${HIST_DIR}/${name}`;
  }
  async function remember(k, sig) {
    known = k; if (sig !== undefined) syncedSig = sig;
    try { await put('folderSync', { known, syncedSig, lastSync: st.lastSync }); } catch {}
  }
  const changedOutside = cur => cur.exists && (!known || (cur.lastModified !== known.lastModified && cur.obj?.sig !== known.sig));

  async function permission(request) {
    if (!handle) return 'none';
    const opt = { mode: 'readwrite' };
    let p = await handle.queryPermission?.(opt) ?? 'granted';
    if (p !== 'granted' && request) p = await handle.requestPermission(opt);
    return p;
  }

  // 主要同步：force=true 代表即使資料夾被別處修改也以本機覆蓋（舊檔先另存）
  async function sync({ force = false } = {}) {
    if (!handle) return;
    if (running) { await running; if (!force) return; }
    running = (async () => {
      set({ busy: true, error: '' });
      try {
        if (await permission(false) !== 'granted') { set({ status: 'need-permission' }); return; }
        const backup = await ClassDB.exportBackup(), sig = sigOf(backup);
        const cur = await readMaster();
        if (!force && changedOutside(cur)) {
          if (cur.obj?.sig === sig) { await remember({ lastModified: cur.lastModified, sig }, sig); set({ status: 'ok', conflict: null }); return; }
          let valid = true; try { ClassDB.validateBackup(structuredClone(cur.obj)); } catch { valid = false; }
          set({ status: 'conflict', conflict: {
            kind: syncedSig === sig ? 'folder-newer' : (known ? 'both' : 'first'),
            savedAt: cur.obj?.savedAt || cur.lastModified, savedBy: cur.obj?.savedBy || '未知裝置',
            folderSummary: valid ? summary(cur.obj) : '檔案格式無法辨識', localSummary: summary(backup), valid
          } });
          return;
        }
        if (cur.exists && cur.obj?.sig === sig && !force) { await remember({ lastModified: cur.lastModified, sig }, sig); set({ status: 'ok', conflict: null }); return; }
        if (force && changedOutside(cur)) await saveAside(cur.text, '覆蓋前');
        await keepDaily(cur);
        const payload = { ...backup, savedAt: Date.now(), savedBy: deviceName(), sig, storage: 'folder' };
        const lm = await writeFile(handle, FILE, JSON.stringify(payload, null, 2));
        st.lastSync = Date.now();
        await remember({ lastModified: lm, sig }, sig);
        set({ status: 'ok', conflict: null });
      } catch (e) {
        set({ status: 'error', error: e?.name === 'NotAllowedError' ? '沒有資料夾寫入權限，請重新授權。' : (e?.message || String(e)) });
      } finally { set({ busy: false }); running = null; }
    })();
    return running;
  }
  function schedule() { if (!handle) return; clearTimeout(timer); timer = setTimeout(() => sync(), 1200); }

  async function adopt(h) {
    handle = h; known = null; syncedSig = '';
    await put('folderHandle', h); await del('folderSync');
    set({ folderName: h.name, status: 'ok', conflict: null, lastSync: 0, histCount: 0 });
    await sync();
  }

  // ---------- 對外 API ----------
  const API = {
    FILE, HIST_DIR,
    get state() { return { ...st, prefs: { ...prefs }, idbOk }; },
    subscribe(fn) { listeners.add(fn); fn(API.state); return () => listeners.delete(fn); },
    prefs: () => ({ ...prefs }), savePrefs,
    async toggleFavorite(id) { const f = new Set(prefs.favorites); f.has(id) ? f.delete(id) : f.add(id); return savePrefs({ favorites: [...f] }); },
    async touchRecent(id) { return savePrefs({ recent: [id, ...prefs.recent.filter(x => x !== id)].slice(0, 6) }); },
    async clearRecent() { try { localStorage.removeItem('lssh.classWorkspace.recent.v1'); } catch {} return savePrefs({ recent: [] }); },

    async chooseFolder() {
      if (!fsSupported) throw new Error('此瀏覽器不支援指定資料夾，請改用 Chrome 或 Edge。');
      let h;
      try { h = await window.showDirectoryPicker({ id: 'lssh-class-workspace', mode: 'readwrite' }); }
      catch (e) { if (e?.name === 'AbortError') return false; throw e; }
      await adopt(h); return true;
    },
    async reauthorize() {
      if (await permission(true) === 'granted') { set({ status: 'ok' }); await sync(); return true; }
      set({ status: 'need-permission' }); return false;
    },
    syncNow: () => sync(),
    async resolve(choice) {
      if (choice === 'overwrite') return sync({ force: true });
      if (choice !== 'load') { set({ status: 'paused' }); return; }
      const cur = await readMaster();
      if (!cur.exists) throw new Error('資料夾裡找不到資料檔');
      const incoming = ClassDB.validateBackup(structuredClone(cur.obj));
      await saveAside(JSON.stringify(await ClassDB.exportBackup(), null, 2), '載入前本機');
      await ClassDB.restoreBackup(incoming, (await ClassDB.read()).revision);
      known = { lastModified: cur.lastModified, sig: cur.obj.sig };
      await sync({ force: true }); // 還原後重寫一次，讓資料夾與本機簽章一致
    },
    async disconnect() {
      handle = null; known = null; syncedSig = ''; clearTimeout(timer);
      try { await del('folderHandle'); await del('folderSync'); } catch {}
      set({ status: fsSupported ? 'none' : 'unsupported', folderName: '', conflict: null, lastSync: 0, histCount: 0 });
    },
    async downloadBackup() {
      const b = await ClassDB.exportBackup(), a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }));
      a.href = url; a.download = `班級經營工作站完整備份_${minute()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    },
    async storageInfo() {
      const s = navigator.storage; if (!s) return { persisted: false, usage: 0, quota: 0 };
      const [persisted, est] = await Promise.all([s.persisted?.() ?? false, s.estimate?.() ?? {}]);
      return { persisted, usage: est.usage || 0, quota: est.quota || 0 };
    },
    async requestPersist() { return navigator.storage?.persist ? navigator.storage.persist() : false; },
    summary
  };
  window.WorkspaceStore = API;

  // ---------- 啟動 ----------
  API.ready = (async () => {
    await loadPrefs();
    if (fsSupported) {
      try {
        const h = await get('folderHandle');
        if (h) {
          handle = h; st.folderName = h.name;
          const saved = await get('folderSync');
          if (saved) { known = saved.known; syncedSig = saved.syncedSig || ''; st.lastSync = saved.lastSync || 0; }
          if (await permission(false) === 'granted') { st.status = 'ok'; sync(); }
          else st.status = 'need-permission';
        }
      } catch { /* 無法取得授權時維持未連結 */ }
    }
    emit();
    ClassDB.subscribe(() => schedule());
    document.addEventListener('visibilitychange', () => { if (!document.hidden && st.status === 'ok') sync(); });
    setInterval(() => { if (!document.hidden && st.status === 'ok') sync(); }, 60000);
  })();
})();
