/* 班級學生資料管理系統 v3.0 與共用名冊的轉接：
 * - 一個班級學期 = 一份學生資料；學生、姓名、座號、班級名稱一律來自工作站共用名冊。
 * - 學生以共用學生 ID 為本工具的學生 ID；改名、換座號仍保留資料。
 *   先前在獨立版建立的學生，第一次連結時依「座號＋姓名」（其次只比姓名）對應到共用學生。
 * - 轉出學生：沒有任何資料就不顯示；已有資料則保留。不在名冊、但已有資料的學生也保留，並提示老師確認。
 * - 「職位工作」顯示工作站「幹部與小老師」的本學期職務，老師按「帶入」才寫入（不自動改寫）。 */
(() => {
  'use strict';
  const W = Workspace;
  const pad = n => String(n).padStart(2, '0');
  const rosterIds = () => new Set(W.scope.roster.map(r => r.studentId));

  function sync() {
    let changed = false;
    const ids = rosterIds(), byId = new Map(state.students.map(s => [s.id, s])), used = new Set(), next = [];
    for (const r of W.scope.roster) {
      let s = byId.get(r.studentId);
      if (!s) {   // 獨立版建立的學生：依座號＋姓名，其次姓名，對應到共用學生
        const free = x => !used.has(x.id) && !ids.has(x.id);
        s = state.students.find(x => free(x) && Number(x.no) === Number(r.no) && x.name === r.name) ||
            state.students.find(x => free(x) && x.name === r.name);
        if (s) { if (state.ui.currentId === s.id) state.ui.currentId = r.studentId; s.id = r.studentId; changed = true; }
      }
      if (!s) { if (!r.active) continue; s = newStudent(pad(r.no), r.name, ''); s.id = r.studentId; changed = true; }
      used.add(s.id);
      if (s.no !== pad(r.no) || s.name !== r.name) { s.no = pad(r.no); s.name = r.name; changed = true; }
      if (!r.active && !hasAny(s.data)) continue;
      next.push(s);
    }
    const extra = state.students.filter(s => !used.has(s.id) && hasAny(s.data));
    if (next.length + extra.length !== state.students.length || next.some((s, i) => state.students[i] !== s)) changed = true;
    state.students = [...next, ...extra];
    if (state.meta.className !== W.scope.className) { state.meta.className = W.scope.className; changed = true; }
    const gone = W.scope.roster.filter(r => !r.active && used.has(r.studentId)).length;
    W.issues([
      extra.length ? `${extra.length} 位學生不在共用名冊（先前在獨立版建立），資料保留；確認不需要後可在「✎ 編輯學生」刪除。` : '',
      gone ? `${gone} 位轉出學生仍有資料，已保留。` : ''
    ].filter(Boolean).join(' '));
    return changed;
  }

  // 每次重新繪製前先對齊共用名冊；名冊有變動就存檔
  const origRender = render;
  render = function () {
    let changed = false;
    try { changed = sync(); } catch (e) { W.status('對齊共用名冊失敗：' + e.message, true); }
    origRender();
    if (changed) save();
  };

  wsLocked = st => !!st && rosterIds().has(st.id);

  const rolesOf = id => W.scope.roles.filter(r => r.studentId === id);
  const namesOf = (roles, type) => roles.filter(r => r.type === type).map(r => r.name);
  wsDutyHint = function (st) {
    const roles = rolesOf(st.id), sem = state.meta.curSem;
    const body = roles.length ? `幹部 ${namesOf(roles, 'officer').join('、') || '—'}；小老師 ${namesOf(roles, 'tutor').join('、') || '—'}` : '這位學生目前沒有職務';
    return `<div class="wsroles no-print">🔗 工作站「幹部與小老師」本學期：<b>${esc(body)}</b>
      ${sem ? `<button class="btn sm" onclick="wsApplyRoles(false)" ${roles.length ? '' : 'disabled'}>帶入這位到「${esc(sem)}」</button><button class="btn sm" onclick="wsApplyRoles(true)">全班帶入「${esc(sem)}」</button>`
            : '<span class="hint">（先設定「目前學期」才能帶入）</span>'}</div>`;
  };
  wsOverviewTools = function (sec) {
    const sem = state.meta.curSem;
    return sec === 'duty' && sem ? `<button class="btn sm" onclick="wsApplyRoles(true)" title="把工作站幹部與小老師的本學期職務，補進全班「${esc(sem)}」職位工作（不刪除原有內容）">🔗 全班帶入工作站職務（${esc(sem)}）</button>` : '';
  };
  window.wsApplyRoles = function (all) {
    const sem = state.meta.curSem; if (!sem) return;
    const list = all ? state.students : [curStudent()].filter(Boolean);
    let n = 0;
    undoable(all ? `已把工作站職務帶入全班「${sem}」` : `已帶入「${sem}」職務`, () => {
      for (const st of list) {
        const roles = rolesOf(st.id); if (!roles.length) continue;
        ensureStudentShape(st); st.data.duty[sem] = st.data.duty[sem] || {};
        for (const [type, col] of [['officer', '幹部'], ['tutor', '小老師']]) {
          const add = namesOf(roles, type); if (!add.length) continue;
          const old = String(st.data.duty[sem][col] || '').split(/[、,，\n]+/).map(x => x.trim()).filter(Boolean);
          st.data.duty[sem][col] = [...new Set([...old, ...add])].join('、');
        }
        n++;
      }
    });
    if (!n) toast('工作站本學期沒有可帶入的職務', { type: 'warn' });
  };

  W.adapter = {
    apply() { render(); W.disable(['m_class']); },
    capture() { wsWrite(); }
  };
})();
