/* Student roster parsing only. No role assignments or personal profile fields are imported. */
((root) => {
  'use strict';
  const cell = value => String(value ?? '').normalize('NFKC').trim();
  const header = value => cell(value).toLowerCase().replace(/[\s_．.：:()（）\-]/g, '');
  const labels = {
    no: ['座號', '學生座號', '班級座號', 'no', 'number', 'seatno', 'seatnumber'],
    name: ['姓名', '學生姓名', '學生名字', 'name', 'studentname'],
    studentNo: ['學號', '學生學號', 'studentno', 'studentnumber', 'studentid']
  };
  function detect(matrix) {
    for (let i = 0; i < matrix.length; i++) {
      const values = matrix[i].map(header);
      const columns = Object.fromEntries(Object.entries(labels).map(([key, names]) => [key, values.findIndex(v => names.includes(v))]));
      if (columns.no >= 0 && columns.name >= 0) return { ...columns, headerRow: i + 1, detected: true };
    }
    return { no: 0, name: 1, studentNo: -1, headerRow: 0, detected: false };
  }
  function extract(matrix, mapping = detect(matrix)) {
    if (mapping.no === mapping.name || mapping.studentNo >= 0 && [mapping.no, mapping.name].includes(mapping.studentNo)) {
      throw new Error('座號、姓名與學號請選擇不同欄位');
    }
    const rows = []; let skipped = 0;
    for (let i = mapping.headerRow; i < matrix.length; i++) {
      const r = matrix[i], no = cell(r[mapping.no]), name = cell(r[mapping.name]);
      const studentNo = mapping.studentNo >= 0 ? cell(r[mapping.studentNo]) : '';
      if (!r.some(v => cell(v))) continue;
      if (!no && !name && !studentNo || /^(合計|總計|平均|備註|說明|班級|科目|列印日期)(?:\s|[:：]|$)/.test(no)) { skipped++; continue; }
      if (labels.no.includes(header(no)) && labels.name.includes(header(name))) { skipped++; continue; }
      if (!/^\d{1,3}$/.test(no) || Number(no) < 1 || !name) throw new Error(`第 ${i + 1} 列的座號或姓名不完整，請確認表頭列與欄位設定`);
      rows.push({ no, name, studentNo });
    }
    validate(rows);
    return { rows, skipped };
  }
  function validate(rows) {
    if (!rows.length) throw new Error('沒有學生資料，請選擇包含名冊的工作表或確認欄位');
    const seen = new Set(), ids = new Set();
    for (const s of rows) {
      if (!/^\d{1,3}$/.test(s.no) || Number(s.no) < 1 || !s.name.trim()) throw new Error('每位學生都需要有效座號（1–999）與姓名');
      if (seen.has(Number(s.no))) throw new Error(`座號 ${s.no} 重複；請確認只選取一個班級的名冊`);
      if (s.studentNo && ids.has(s.studentNo)) throw new Error(`學號 ${s.studentNo} 重複，請確認學號欄位`);
      seen.add(Number(s.no)); if (s.studentNo) ids.add(s.studentNo);
    }
    return rows;
  }
  root.RosterImport = { cell, detect, extract, validate };
})(typeof window === 'undefined' ? globalThis : window);
