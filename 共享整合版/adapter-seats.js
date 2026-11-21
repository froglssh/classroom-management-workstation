/* 座位 2.0 與共用名冊的轉接：
 * - 學生名單來自工作站共用名冊（只列在籍），一個班級學期對應一個座位方案。
 * - 座位 2.0 以「座號::姓名」識別學生；這裡另存 key → 共用學生 ID 對照，改名或換座號時座位會跟著學生走。
 * - 有正式職務（幹部／小老師）的學生，標籤自動顯示職務；沒有職務者保留老師自訂的標籤。 */
(() => {
  'use strict';
  const W = Workspace, MAP_KEY = 'ws-seat-map';
  const num = no => String(no).padStart(2, '0');
  let ids = {}, auto = {};   // ids：學生 key → studentId；auto：studentId → 上次自動帶入的職務標籤
  try { const m = JSON.parse(workspaceStorage.getItem(MAP_KEY) || '{}'); ids = m.ids || {}; auto = m.auto || {}; } catch {}

  function findRoster(s) {
    if (!s) return null;
    const id = ids[keyOf(s)];
    if (id) { const r = W.scope.roster.find(x => x.studentId === id); if (r) return r; }
    const m = W.scope.roster.filter(x => Number(x.no) === Number(s.number) && x.name === s.name);
    return m.length === 1 ? m[0] : null;
  }

  function sync() {
    const C = cls();
    state.classes = [C]; state.activeId = C.id;
    C.name = W.scope.className; C.className = W.scope.className;
    // 先記下原本的標籤（以共用學生 ID 對應），再重建名單
    const prevNote = new Map();
    C.students.forEach(s => { const r = findRoster(s); if (r) prevNote.set(r.studentId, s.note || ''); });
    allSeats(C).forEach(seat => {
      if (!seat.student) return;
      const r = findRoster(seat.student);
      if (r) seat.student = { number: num(r.no), name: r.name };
    });
    const nextIds = {}, nextAuto = {};
    C.students = W.activeRoster().map(r => {
      const roles = W.rolesFor(r.studentId).join('、');
      let note = prevNote.get(r.studentId) || '';
      if (note && note === auto[r.studentId]) note = '';          // 上次自動帶入的職務，不當成個人標籤
      if (roles) { note = roles; nextAuto[r.studentId] = roles; }
      const s = { number: num(r.no), name: r.name, note };
      nextIds[keyOf(s)] = r.studentId;
      return s;
    });
    ids = nextIds; auto = nextAuto;
    // 座位上已不在籍或對應不到的學生：保留位置，提醒老師處理
    const active = new Set(C.students.map(keyOf));
    const retired = allSeats(C).filter(s => s.student && !active.has(keyOf(s.student))).length;
    W.issues(retired ? `${retired} 個座位仍是轉出或對應不到的學生，系統保留原位置，請手動調整。` : '');
    state.namesDirty = false;
  }

  function lockUI() {
    W.disable(['namesInput', 'btnApplyNames', 'btnRevertNames', 'excelFile', 'sheetSelect', 'btnImportSheet', 'roleJsonFile', 'className', 'presetName', 'classSelect']);
    document.querySelector('label:has(> #roleJsonFile)')?.classList.add('hidden');
    if (!document.getElementById('wsSeatNote')) {
      const box = document.getElementById('namesInput')?.closest('section') || document.getElementById('namesInput')?.parentElement;
      if (box) {
        const p = document.createElement('div'); p.id = 'wsSeatNote';
        p.style.cssText = 'margin:0 0 10px;padding:10px 12px;border-radius:10px;background:#ecfdf5;color:#065f46;font-size:13px;line-height:1.6';
        p.textContent = '共享整合版：學生名單來自工作站共用名冊；有幹部或小老師職務的學生，標籤會自動顯示職務。新增、改名或轉出學生請到共用名冊。';
        const a = document.createElement('a'); a.href = W.link('資料中心.html'); a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' 開啟共用名冊 ↗'; a.style.fontWeight = '700';
        p.append(a); box.prepend(p);
      }
    }
  }

  W.adapter = {
    apply() {
      sync();
      renderAll();
      const ta = document.getElementById('namesInput'); if (ta) ta.value = namesText(cls());
      lockUI();
      setTimeout(() => W.capture(), 0);   // 載入或名冊改名後立即保存整理過的資料，避免離開時才發現未儲存
    },
    capture() {
      workspaceStorage.setItem(LS_KEY, JSON.stringify(currentData()));
      workspaceStorage.setItem(MAP_KEY, JSON.stringify({ ids, auto }));
    }
  };
})();
