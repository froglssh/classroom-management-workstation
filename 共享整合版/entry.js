/* CLASSROOM_WORKSTATION_PORTABLE_V1: keep all shared tools on one HTTP origin. */
(() => {
  'use strict';
  const localFile = location.protocol === 'file:';
  const site = new URL('../', document.currentScript.src);
  const origin = localFile ? 'http://127.0.0.1:8766' : location.origin;
  const root = localFile ? origin + '/' : site.href;
  const home = root + 'index.html';
  const token = new URLSearchParams(location.search).get('fromFileToken');
  window.WorkspaceEntry = { fileMode: localFile, receiving: !!token };
  if (!localFile && !token) return;
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  const el = (tag, content) => { const n = document.createElement(tag); n.textContent = content; return n; };
  function panel(title, description) {
    let p = document.getElementById('workspace-entry');
    if (!p) { p = document.createElement('section'); p.id = 'workspace-entry'; p.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#f5f4ed;color:#244c3a;padding:30px;overflow:auto;font:16px/1.8 "PingFang TC",sans-serif'; document.body.append(p); }
    p.replaceChildren(); const box = document.createElement('div'); box.style.cssText = 'max-width:760px;margin:8vh auto;padding:24px;background:#fffefa;border:1px solid #c9d4c1;border-radius:12px'; p.append(box);
    box.append(el('h1', title), el('p', description)); return box;
  }
  function action(box, title, fn) { const b = el('button', title); b.style.cssText = 'font:inherit;cursor:pointer;padding:10px 16px;margin:10px 10px 0 0;background:#244c3a;color:white;border:0;border-radius:6px'; b.onclick = fn; box.append(b); return b; }
  function download(backup, name) { const a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'})); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
  function finish() { const url = new URL(location.href); url.searchParams.delete('fromFileToken'); location.replace(url.href); }
  if (!localFile) {
    ready(() => {
      const box = panel('連結原頁面的學生名冊', '正在接收檔案模式的資料，請保留原分頁。');
      if (!window.opener) { box.append(el('p', '原分頁已關閉，請從原檔案頁面重新按「帶著名冊開啟工作站」。')); action(box, '使用工作站既有資料', finish); return; }
      let received = false;
      window.addEventListener('message', async event => {
        if (received || event.source !== window.opener || event.origin !== 'null' || event.data?.type !== 'classroom-file-backup' || event.data.token !== token) return;
        received = true;
        try {
          const incoming = ClassDB.validateBackup(event.data.backup), current = await ClassDB.read();
          const commit = async () => { const latest = await ClassDB.read(); if (latest.revision !== current.revision) throw new Error('工作站資料剛被其他分頁修改，請重新開始轉入'); await ClassDB.restoreBackup(incoming, latest.revision); finish(); };
          if (!current.contexts.length) { await commit(); return; }
          const choice = panel('確認要使用哪份班級資料', `工作站已有 ${current.contexts.length} 個班級學期；檔案模式有 ${incoming.main.contexts.length} 個班級學期。請確認後選擇，避免覆蓋較新的工作。`);
          action(choice, '保留工作站既有資料', finish);
          const apply = action(choice, '備份工作站現況，再帶入檔案資料', async () => { apply.disabled = true; try { download(await ClassDB.exportBackup(), '轉入前工作站完整備份.json'); await commit(); } catch (e) { choice.append(el('p', e.message)); apply.disabled = false; } });
        } catch (e) { box.append(el('p', '轉入失敗：' + e.message)); action(box, '使用工作站既有資料', finish); }
      });
      window.opener.postMessage({type:'classroom-file-ready', token}, '*');
    });
    return;
  }
  ready(async () => {
    let backup;
    try { backup = await ClassDB.exportBackup(); } catch (_) { /* Some browsers do not allow file-origin databases. */ }
    const hasData = !!backup?.main.contexts.length;
    const box = panel('開啟班級經營共用工作站', hasData ? `找到檔案模式已儲存的 ${backup.main.contexts.length} 個班級學期。請帶著名冊開啟工作站，讓六項工具使用同一份資料。` : '正在轉到共用工作站；學生名冊與六項工具會使用同一個網址。');
    const openHome = () => location.assign(home);
    if (hasData) {
      action(box, '帶著名冊開啟工作站', () => {
        const id = crypto.randomUUID(), child = window.open(home + '?fromFileToken=' + encodeURIComponent(id), '_blank');
        if (!child) { box.append(el('p', '瀏覽器阻擋新分頁，請允許本頁開啟新分頁，或下載備份後於工作站還原。')); return; }
        const send = event => { if (event.source !== child || event.origin !== origin || event.data?.type !== 'classroom-file-ready' || event.data.token !== id) return; child.postMessage({type:'classroom-file-backup', token:id, backup}, origin); window.removeEventListener('message', send); };
        window.addEventListener('message', send);
      });
      action(box, '下載檔案模式完整備份', () => download(backup, '檔案模式班級經營完整備份.json'));
      action(box, '開啟工作站既有資料', openHome);
    } else action(box, '開啟共用工作站', openHome);
    const image = new Image();
    image.onload = () => { if (hasData) return; const path = decodeURIComponent(location.pathname), base = decodeURIComponent(site.pathname); const relative = path.startsWith(base) ? path.slice(base.length) : 'index.html'; location.replace(root + encodeURI(relative) + location.search + location.hash); };
    image.onerror = () => { box.append(el('p', '本機服務尚未啟動。請到工作站資料夾雙擊「啟動班級經營工作站.command」，再按上方按鈕。以後從此啟動器進入，就能共用名冊。')); };
    image.src = root + '共享整合版/entry-health.svg?check=' + Date.now();
  });
})();
