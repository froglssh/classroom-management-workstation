/* 導師評語生成系統（codex 優化版）與共用名冊的轉接：
 * - 一個班級學期 = 一個評語工作簿；班級、學年、學期由共用名冊帶入。
 * - 學生以共用學生 ID 為評語學生 ID；改名、換座號仍保留評語。轉出學生若已有評語內容則保留。
 * - 本學期任職歷史顯示在「擔任職務」區，老師點選後才加入素材（不自動改寫評語）。
 * - 舊整合版的逐生草稿（lssh.comment.draft.v1:<學生ID>）在第一次開啟時自動轉入。 */
(() => {
  'use strict';
  const W = Workspace, OLD = 'lssh.comment.draft.v1:';
  const pad = n => String(n).padStart(2, '0');
  const st = document.createElement('style');
  st.textContent = '[data-open="roster"],#btnDemo,#btnAddStudent,#btnClearRoster,#wbSelect{display:none!important}' +
    '#wsRoles{margin:0 0 8px;padding:8px 10px;border-radius:10px;background:#ecfdf5;font-size:13px}#wsRoles .lbl{color:#065f46;font-weight:700;margin-right:6px}';
  document.head.append(st);

  function migrateOld(wb) {
    if (wb.students.length) return 0;
    let n = 0;
    for (const r of W.scope.roster) {
      const raw = workspaceStorage.getItem(OLD + r.studentId); if (!raw) continue;
      try { const c = convertOldRecord(JSON.parse(raw)); if (c) { c.st.id = r.studentId; wb.students.push(c.st); n++; } } catch {}
    }
    return n;
  }

  function sync() {
    const wb = WB();
    store.workbooks = { [wb.id]: wb }; store.activeWb = wb.id;
    wb.meta.cls = W.scope.className; wb.meta.year = String(W.scope.year); wb.meta.sem = W.scope.semester === '2' ? '2' : '1';
    const migrated = migrateOld(wb);
    if (migrated) W.status(`✓ 已轉入舊整合版草稿 ${migrated} 份`);
    const rosterIds = new Set(W.scope.roster.map(r => r.studentId));
    const byId = new Map(wb.students.map(s => [s.id, s]));
    const used = new Set(), next = [];
    for (const r of W.scope.roster) {
      let s = byId.get(r.studentId);
      if (!s) {   // 先前以姓名＋座號建立（例如匯入），改用共用學生 ID
        s = wb.students.find(x => !used.has(x.id) && !rosterIds.has(x.id) && Number(x.seat) === Number(r.no) && x.name === r.name);
        if (s) { if (wb.activeId === s.id) wb.activeId = r.studentId; s.id = r.studentId; }
      }
      if (!s) { if (!r.active) continue; s = blankStudent({ id: r.studentId }); }
      used.add(s.id);
      s.seat = pad(r.no); s.name = r.name; if (r.studentNo) s.no = r.studentNo;
      if (!r.active && !s.final && !hasContent(s)) continue;
      next.push(s);
    }
    const extra = wb.students.filter(s => !used.has(s.id) && (s.final || hasContent(s)));
    wb.students = [...next, ...extra];
    sortStudents(wb);
    if (!CUR()) wb.activeId = wb.students[0]?.id || null;
    W.issues(extra.length ? `${extra.length} 位評語學生不在共用名冊（可能是匯入時建立），資料保留，請確認後自行刪除。` : '');
  }

  // 「擔任職務」區加上本學期共用職務，點選才加入（沿用工具原本的 data-quickrole 處理）
  const origRoles = renderRoles;
  renderRoles = function () {
    origRoles();
    const s = CUR(), q = document.getElementById('quickRoles');
    if (!s || !q) return;
    let box = document.getElementById('wsRoles');
    if (!box) { box = document.createElement('div'); box.id = 'wsRoles'; box.className = 'quick'; q.parentElement.insertBefore(box, q); }
    const hist = W.scope.roleHistory.filter(h => h.studentId === s.id);
    const names = [...new Set(hist.map(h => h.name))];
    const current = new Set(hist.filter(h => !h.endedAt).map(h => h.name));
    box.innerHTML = names.length
      ? '<span class="lbl">本學期職務（共用名冊）</span>' + names.map(n => `<button data-quickrole="${esc(n)}" ${s.cadres.some(c => c.role === n) ? 'disabled style="opacity:.4"' : ''} title="點選加入素材，表現請在下方確認">${esc(n)}${current.has(n) ? '' : '（曾任）'}</button>`).join('')
      : '<span class="lbl">本學期共用名冊尚無這位學生的職務紀錄</span>';
  };
  // 姓名、座號由共用名冊管理
  const origEditor = renderEditor;
  renderEditor = function () {
    origEditor();
    const s = CUR(), inRoster = !!s && W.scope.roster.some(r => r.studentId === s.id);
    if (inRoster) ['fName', 'fSeat'].forEach(id => { const el = document.getElementById(id); if (el) { el.readOnly = true; el.title = '姓名與座號請在工作站共用名冊修改'; } });
    // 共用名冊的學生不在這裡刪除（轉出請到共用名冊）；不在名冊的額外學生仍可刪除
    document.querySelectorAll('[data-act="delStudent"]').forEach(b => { b.hidden = inRoster; });
  };

  W.adapter = {
    apply() { sync(); renderAll(); setTimeout(() => W.capture(), 0); },   // 載入後立即保存整理過的資料
    capture() { if (store) workspaceStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  };
})();
