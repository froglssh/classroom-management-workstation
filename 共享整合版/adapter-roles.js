(()=>{'use strict';
 const W=Workspace,types=['officer','tutor'];
 const tasksFrom=roles=>Object.fromEntries(types.map(type=>[type,roles.filter(r=>r.type===type).map(r=>({...r}))]));
 W.roleImport={busy:false};
 W.adapter={apply(){
  state.students=W.scope.roster.map(s=>({id:s.studentId,no:s.no,name:s.name+(s.active?'':'（轉出）'),active:s.active}));
  if(W.scope.roles.length||state.tasks.officer.some(t=>t.studentId)||state.tasks.tutor.some(t=>t.studentId))state.tasks=tasksFrom(W.scope.roles);
  renderStudents();refreshTasksUI();refreshAssignUI();
  document.querySelectorAll('.btn-del-stu').forEach(b=>b.disabled=true);
  W.disable(['stuName','stuNo','stuBulk','btnAddStudent','btnBulkAddStudents','btnClearStudents','studentExcelFile','btnScanStudentClasses','btnImportStudentsExcel','btnReset','btnLoadLocal']);
 },capture(){if(W.roleImport.busy)return;workspaceStorage.setItem('cc-class-assign',JSON.stringify(state));W.queueRoles(state.tasks)}};
 deleteStudent=()=>toast('請到共用名冊將學生設為轉出；職務與歷史會保留。');

 const picker=document.getElementById('fileImport'),start=document.getElementById('btnImportJSON');
 const preview=document.createElement('section');preview.id='role-import-preview';preview.hidden=true;
 preview.style.cssText='margin-top:16px;background:#fff;color:#164e63;border-radius:12px;padding:16px;overflow-wrap:anywhere';
 const notice=document.createElement('p');notice.id='role-import-status';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.style.cssText='margin-top:12px;white-space:pre-wrap';
 start.after(notice,preview);let plan=null;
 const normalizedName=value=>String(value??'').normalize('NFKC').trim();
 const normalizedNo=value=>{const v=String(value??'').normalize('NFKC').trim();return /^\d+$/.test(v)?String(Number(v)):v;};
 const fingerprint=()=>JSON.stringify(state.tasks);
 const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
 function clear(){plan=null;preview.hidden=true;preview.replaceChildren();}
 picker.addEventListener('change',()=>{clear();notice.textContent='已選擇檔案，請按「開始匯入」檢查並預覽。';});
 function parse(raw,scope){
  const obj=JSON.parse(raw.replace(/^\uFEFF/,''));
  if(!obj||!Array.isArray(obj.students)||!obj.tasks||types.some(type=>!Array.isArray(obj.tasks[type])))throw new Error('檔案格式不正確：需要 students 與 tasks.officer、tasks.tutor。請選擇幹部小老師程式匯出的 JSON。');
  if(obj.students.length>5000||types.some(type=>obj.tasks[type].length>1000))throw new Error('檔案資料筆數過多，請檢查是否選錯檔案。');
  const students=new Map(),rows=[],rawIds=new Map();
  const validId=id=>(typeof id==='string'&&id.trim()!=='')||(typeof id==='number'&&Number.isSafeInteger(id));
  for(const s of obj.students){
   if(!s||!validId(s.id)||typeof s.name!=='string'||!s.name.trim()||students.has(String(s.id)))throw new Error('學生資料格式不正確或學生 ID 重複，未匯入任何資料。');
   students.set(String(s.id),s);
  }
  for(const type of types){const seen=new Set();for(const t of obj.tasks[type]){
   if(!t||!validId(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>200||seen.has(String(t.id)))throw new Error('職務資料格式不正確或同類職務 ID 重複，未匯入任何資料。');
   const id=String(t.id);seen.add(id);rawIds.set(id,(rawIds.get(id)||0)+1);
   let source=null,studentId=null,matched=false;
   if(t.studentId!==null&&t.studentId!==undefined&&t.studentId!==''){
    if(!validId(t.studentId)||!students.has(String(t.studentId)))throw new Error('職務「'+t.name+'」的學生參照不存在於檔案名冊，未匯入任何資料。');
    source=students.get(String(t.studentId));
    const exact=scope.roster.find(s=>s.studentId===String(t.studentId));
    const matches=exact?[exact]:scope.roster.filter(s=>normalizedNo(s.no)===normalizedNo(source.no??source.number)&&normalizedName(s.name)===normalizedName(source.name));
    if(matches.length===1){studentId=matches[0].studentId;matched=true;}
   }
   rows.push({id,type,name:t.name.trim(),studentId,source,matched});
  }}
  const finalIds=new Set();for(const row of rows){
   // Shared round trips keep role IDs; cross-type legacy collisions receive stable IDs.
   if(rawIds.get(row.id)>1||!/^[A-Za-z0-9_.:%-]+$/.test(row.id)||scope.roles.some(r=>r.id===row.id&&r.type!==row.type))row.id='json-'+row.type+'-'+encodeURIComponent(row.id).replace(/'/g,'%27');
   if(finalIds.has(row.id))throw new Error('職務 ID 衝突，請檢查匯入檔案。');finalIds.add(row.id);
  }
  return {rows,revision:scope.revision,fingerprint:fingerprint()};
 }
 function show(){
  const title=text('h4','匯入預覽');title.style.cssText='font-weight:700;font-size:18px';preview.append(title);
  preview.append(text('p','將取代目前學期的幹部與小老師職務；原指派歷史會保留，共用學生名冊與座位安排保持不變。'));
  const list=document.createElement('div');list.style.cssText='display:grid;gap:12px;margin:14px 0';preview.append(list);
  for(const row of plan.rows){
   const line=document.createElement('label');line.style.cssText='display:block;border-top:1px solid #cbd5e1;padding-top:10px';
   line.append(text('strong',(row.type==='officer'?'幹部':'小老師')+'｜'+row.name));
   line.append(text('p',row.source?'檔案指派：'+String(row.source.no??row.source.number??'')+' '+row.source.name+(row.matched?'（已對應共用學生）':'（尚未對應，請選擇）'):'檔案未指派學生'));
   const select=document.createElement('select');select.className='role-import-match';select.style.cssText='display:block;width:100%;max-width:100%;border:1px solid #94a3b8;border-radius:6px;padding:8px;background:white;color:#164e63';
   select.setAttribute('aria-label',row.name+'的共用學生');
   if(row.source&&!row.matched)select.append(new Option('請選擇共用學生，或明確選擇未指派','?'));
   select.append(new Option('未指派',''));
   for(const s of W.scope.roster)select.append(new Option(s.no+' '+s.name+(s.active?'':'（轉出）'),s.studentId));
   select.value=row.source&&!row.matched?'?':row.studentId||'';
   select.addEventListener('change',()=>{row.studentId=select.value==='?'?'?':select.value||null;check();});
   if(select.value==='?')row.studentId='?';line.append(select);list.append(line);
  }
  const check=()=>{const count=plan.rows.filter(r=>r.studentId==='?').length;commit.disabled=count>0;commit.style.opacity=count?'.5':'1';summary.textContent=plan.rows.length+' 項職務；'+(count?'尚有 '+count+' 項需要手動對應。':'學生對應完成，可以確認匯入。');};
  const summary=text('p','');summary.id='role-import-summary';preview.append(summary);
  const commit=text('button','確認匯入並同步');commit.id='btnConfirmRoleImport';commit.type='button';commit.style.cssText='background:#059669;color:white;padding:10px 14px;border-radius:8px;margin:10px 10px 0 0;font-weight:700';commit.addEventListener('click',confirm);preview.append(commit);
  const cancel=text('button','取消');cancel.type='button';cancel.style.cssText='padding:10px;border:1px solid #94a3b8;border-radius:8px';cancel.addEventListener('click',()=>{clear();notice.textContent='已取消匯入。';});preview.append(cancel);
  check();preview.hidden=false;
 }
 start.addEventListener('click',async()=>{
  if(W.roleImport.busy)return;clear();notice.textContent='';
  const file=picker.files[0];if(!file){notice.textContent='請先選擇 JSON 檔案。';return;}
  W.roleImport.busy=true;start.disabled=true;
  try{
   if(file.size>5*1024*1024)throw new Error('JSON 檔案超過 5 MB，請檢查是否選錯檔案。');
   await W.waitRoles();await W.flush();
   const scope=await ClassDB.scope(W.scope.id);if(!scope?.roster.length)throw new Error('請先在共用名冊建立學生，再匯入職務與指派。');
   plan=parse(await file.text(),scope);show();notice.textContent='已讀取「'+file.name+'」，請檢查下方預覽。';
  }catch(e){clear();notice.textContent='未匯入：'+e.message;}finally{W.roleImport.busy=false;start.disabled=false;}
 });
 async function confirm(){
  if(!plan||W.roleImport.busy||plan.rows.some(r=>r.studentId==='?'))return;
  const selected=plan;W.roleImport.busy=true;start.disabled=true;document.getElementById('btnConfirmRoleImport').disabled=true;let saved=false;
  try{
   await W.waitRoles();await W.flush();
   const current=await ClassDB.scope(W.scope.id);
   if(!current||current.revision!==selected.revision||fingerprint()!==selected.fingerprint)throw new Error('預覽後資料已有變更，請重新按「開始匯入」取得最新預覽。');
   const roles=selected.rows.map(({id,type,name,studentId})=>({id,type,name,studentId}));
   const data=JSON.stringify(current.roles)===JSON.stringify(roles)?null:await ClassDB.saveRoles(current.id,roles,selected.revision);
   saved=true;W.scope=data?ClassDB.scopeOf(data,current.id):current;state.tasks=tasksFrom(W.scope.roles);W.adapter.apply();
   workspaceStorage.setItem('cc-class-assign',JSON.stringify(state));await W.flush();clear();
   notice.textContent='匯入成功：'+roles.length+' 項職務已儲存並共享給座位與評語。';W.status('✓ JSON 職務已匯入共用資料庫');toast('匯入成功，職務已同步');
  }catch(e){clear();notice.textContent=(saved?'職務已匯入共用資料，但本頁工具草稿儲存失敗：':'未匯入：')+e.message;}finally{W.roleImport.busy=false;start.disabled=false;}
 }
})();
