(()=>{'use strict';if(window.WorkspaceEntry?.fileMode||window.WorkspaceEntry?.receiving)return;const $=id=>document.getElementById(id);let data,current,dirty=false,preview=[],restoreData,workbook,matrix=[],previewScope=null,importToken=0,importScope=null;
const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e};
function message(s,error=false){$('message').textContent=s;$('message').classList.toggle('error',error)}
function scopeLabel(c){return `${data.classes.find(x=>x.id===c.classId).name}｜${c.year}學年 ${c.semester==='1'?'上學期':c.semester==='2'?'下學期':'暑期'}`}
function row(s={no:'',name:'',studentNo:'',active:true}){const tr=document.createElement('tr');if(s.studentId)tr.dataset.id=s.studentId;for(const key of ['no','name','studentNo']){const td=document.createElement('td');td.className=key;const input=document.createElement('input');input.value=s[key]||'';input.dataset.field=key;input.setAttribute('aria-label',key==='no'?'座號':key==='name'?'姓名':'學號');input.maxLength=key==='name'?80:40;td.append(input);tr.append(td)}const td=document.createElement('td'),select=document.createElement('select');select.dataset.field='active';select.append(new Option('在籍','true'),new Option('轉出','false'));select.value=String(s.active!==false);td.append(select);tr.append(td);tr.append(text('td',current?.roles.filter(r=>r.studentId===s.studentId).map(r=>r.name).join('、')||'—'));const last=document.createElement('td');if(!s.studentId){const b=text('button','移除');b.onclick=()=>{tr.remove();dirty=true};last.append(b)}else last.textContent='已建檔';tr.append(last);$('rows').append(tr)}
function formRows(){return [...$('rows').rows].map(tr=>Object.fromEntries([['studentId',tr.dataset.id||undefined],...[...tr.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.dataset.field==='active'?el.value==='true':el.value.trim()])]))}
function updateCarry(){const id=$('class-select').value;$('class-name').disabled=id!=='new';$('carry').replaceChildren(new Option('建立空白名冊',''));if(data) data.contexts.filter(c=>c.classId===id).forEach(c=>$('carry').add(new Option(scopeLabel(c),c.id)))}
async function load(){data=await ClassDB.read();const pinned=new URLSearchParams(location.search).get('scope');const id=current?.id||(pinned&&data.contexts.some(c=>c.id===pinned)?pinned:data.activeScope);current=ClassDB.scopeOf(data,id);if(importScope!==current?.id){resetImport();importScope=current?.id;}$('scope-select').replaceChildren();if(!data.contexts.length)$('scope-select').add(new Option('尚未建立班級',''));data.contexts.forEach(c=>$('scope-select').add(new Option(scopeLabel(c),c.id)));$('scope-select').value=current?.id||'';$('class-select').replaceChildren(new Option('建立新班級','new'));data.classes.forEach(c=>$('class-select').add(new Option(c.name,c.id)));updateCarry();$('roster-box').hidden=!current;$('create-details').open=!current;$('rows').replaceChildren();if(current){current.roster.forEach(row);renderToolLinks();$('count').textContent=`${current.roster.filter(s=>s.active).length} 位在籍 / ${current.roster.length} 位建檔`;$('roles-link').href='roles.html?scope='+encodeURIComponent(current.id)+'&v=latest-tools-20261010';$('roles-link').target='_blank';$('roles-link').rel='noopener'}dirty=false;$('roster-status').textContent='';message(current?`目前：${scopeLabel(current)}。名冊與職務修改後，已開啟的整合版工具會同步更新。`:'請先建立班級與學期。')}
function download(obj,name){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
async function run(fn){try{await fn()}catch(e){message(e.message,true)}}
$('create-form').onsubmit=e=>{e.preventDefault();run(async()=>{if(dirty&&!confirm('名冊尚未儲存，建立班級會放棄表格修改。確定繼續？'))return;const id=$('class-select').value;const result=await ClassDB.createContext($('class-name').value,$('year').value,$('semester').value,id==='new'?null:id,$('carry').value||null,data.revision);current=null;history.replaceState(null,'',location.pathname);await load();message('已建立班級學期，可開始輸入共用名冊。')})};
$('class-select').onchange=updateCarry;
$('scope-select').onchange=()=>run(async()=>{const id=$('scope-select').value;if(dirty&&!confirm('尚未儲存名冊，確定放棄修改並切換？')){$('scope-select').value=current.id;return}await ClassDB.setActive(id,data.revision);current=null;history.replaceState(null,'',location.pathname);await load()});
const toolNames=[['roles','幹部與小老師'],['seats','班級座位'],['cleaning','打掃分配'],['account','班費收支'],['fair','園遊會分工'],['comments','導師評語']];let launchBusy=false;
function renderToolLinks(){
 $('tool-links').replaceChildren();for(const [module,name] of toolNames){const a=text('a',name+' →');a.className='button';a.href=module+'.html?scope='+encodeURIComponent(current.id)+(['roles','seats'].includes(module)?'&v=latest-tools-20261010':'');a.dataset.tool=module;a.onclick=e=>launchTool(e,a);$('tool-links').append(a)}
 $('roles-link').onclick=e=>launchTool(e,$('roles-link'));
}
async function launchTool(event,link){
 event.preventDefault();if(launchBusy)return;launchBusy=true;
 try{
  if(preview.length)throw new Error('名冊仍在預覽，請先按「加入編輯表格」，再開啟工具。');
  const rows=formRows().filter(s=>s.studentId||s.no||s.name||s.studentNo);
  if(!rows.some(s=>s.active))throw new Error('請先匯入或新增學生，才能使用班級工具。');
  if(dirty){$('launch-status').textContent='正在儲存名冊並開啟工具…';await ClassDB.saveRoster(current.id,rows,data.revision);await load()}
  location.assign(link.href);
 }catch(e){$('launch-status').textContent=e.message;message(e.message,true);if(preview.length){$('import-details').open=true;$('apply-import').scrollIntoView({block:'center'});$('apply-import').focus()}}
 finally{launchBusy=false}
}
$('rows').addEventListener('input',()=>dirty=true);$('rows').addEventListener('change',()=>dirty=true);$('add-row').onclick=()=>{row();dirty=true};
$('save-roster').onclick=()=>run(async()=>{if(!current)return;$('save-roster').disabled=true;try{await ClassDB.saveRoster(current.id,formRows(),data.revision);await load();message('共用名冊已儲存，所有整合版工具將使用這份名冊。')}finally{$('save-roster').disabled=false}});
$('reload').onclick=()=>run(async()=>{if(dirty&&!confirm('放棄未儲存修改並重新讀取？'))return;await load()});
function importStatus(value,error=false){$('import-status').textContent=value;$('import-status').classList.toggle('error',error)}
function clearPreview(){preview=[];previewScope=null;$('import-preview').hidden=true;$('apply-import').disabled=true;$('preview-content').replaceChildren()}
function resetImport(keepFile=false){importToken++;clearPreview();workbook=null;matrix=[];$('import-settings').hidden=true;$('sheet-label').hidden=true;if(!keepFile)$('roster-file').value='';importStatus('只需建立學生名冊；幹部與小老師由職務工具設定並自動分享。')}
function parseCSV(str){let rows=[],row=[],cell='',quoted=false;str=str.replace(/^\uFEFF/,'');const sep=str.includes('\t')?'\t':',';for(let i=0;i<str.length;i++){const c=str[i];if(c==='"'){if(quoted&&str[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(!quoted&&(c===sep||c==='\n'||c==='\r')){row.push(cell.trim());cell='';if(c!==sep){rows.push(row);row=[];if(c==='\r'&&str[i+1]==='\n')i++}}else cell+=c}if(quoted)throw new Error('CSV 引號未成對');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows.map(r=>{if(r.length!==1)return r;const m=r[0].normalize('NFKC').match(/^(\d{1,3})[.、\s]+(.+)$/);return m?[m[1],m[2]]:r})}
function showPreview(rows,skipped=0){
 RosterImport.validate(rows);if(!current)throw new Error('請先建立班級與學期');preview=rows;previewScope=current.id;
 $('preview-content').replaceChildren(text('p',`預覽 ${rows.length} 位學生${skipped?`；略過 ${skipped} 列非名冊內容`:''}。同座號且同姓名者略過；既有學生資料不會覆寫。`));
 const table=document.createElement('table'),head=document.createElement('thead'),hr=document.createElement('tr'),body=document.createElement('tbody');['座號','姓名','學號（選填）'].forEach(v=>hr.append(text('th',v)));head.append(hr);rows.forEach(s=>{const tr=document.createElement('tr');[s.no,s.name,s.studentNo||'—'].forEach(v=>tr.append(text('td',v)));body.append(tr)});table.append(head,body);$('preview-content').append(table);$('import-preview').hidden=false;$('apply-import').disabled=false;
 importStatus(`已讀取 ${rows.length} 位學生，請確認預覽，按「加入編輯表格」，最後按「儲存共用名冊」。`);
}
function fillColumns(mapping){
 const headerIndex=Number($('header-row').value)-1,width=matrix.reduce((n,r)=>Math.max(n,r.length),2);
 for(const [id,key] of [['no-column','no'],['name-column','name'],['id-column','studentNo']]){
  const el=$(id);el.replaceChildren();if(key==='studentNo')el.add(new Option('不匯入學號','-1'));
  for(let i=0;i<width;i++){let col='',n=i+1;while(n>0){n--;col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26)}const title=headerIndex>=0?RosterImport.cell(matrix[headerIndex]?.[i]):'';el.add(new Option(`${col} 欄${title?'｜'+title.slice(0,35):''}`,String(i)))}
  el.value=String(mapping[key]??(key==='studentNo'?-1:key==='no'?0:1));
 }
}
function previewMatrix(){clearPreview();try{const mapping={headerRow:Number($('header-row').value),no:Number($('no-column').value),name:Number($('name-column').value),studentNo:Number($('id-column').value)};const result=RosterImport.extract(matrix,mapping);showPreview(result.rows,result.skipped)}catch(e){importStatus(e.message,true)}}
function configureMatrix(values){
 matrix=values;if(!matrix.length)matrix=[[]];const mapping=RosterImport.detect(matrix);
 $('header-row').replaceChildren(new Option('沒有欄名，從第 1 列讀取','0'));
 matrix.forEach((r,i)=>{const summary=r.map(RosterImport.cell).filter(Boolean).slice(0,3).join(' / ').slice(0,55);$('header-row').add(new Option(`第 ${i+1} 列${summary?'｜'+summary:''}`,String(i+1)))});
 $('header-row').value=String(mapping.headerRow);fillColumns(mapping);$('import-settings').hidden=false;previewMatrix();
}
$('header-row').onchange=()=>{const mapping={no:Number($('no-column').value),name:Number($('name-column').value),studentNo:Number($('id-column').value)};const r=matrix[Number($('header-row').value)-1];if(r){const found=RosterImport.detect([r]);if(found.detected)Object.assign(mapping,found)}fillColumns(mapping);previewMatrix()};
for(const id of ['no-column','name-column','id-column'])$(id).onchange=previewMatrix;
$('preview-sheet').onclick=previewMatrix;
function sheetMatrix(sheet){if(!sheet['!ref'])return [];const range=XLSX.utils.decode_range(sheet['!ref']);range.s={r:0,c:0};return XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:true,range})}
$('sheet').onchange=()=>configureMatrix(sheetMatrix(workbook.Sheets[$('sheet').value]));
$('import-excel').onclick=()=>{$('import-details').open=true;$('roster-file').scrollIntoView({block:'center'});$('roster-file').click()};
$('preview-paste').onclick=()=>{resetImport();try{configureMatrix(parseCSV($('paste').value))}catch(e){clearPreview();importStatus(e.message,true)}};
$('apply-import').onclick=()=>{
 try{
  if(!preview.length||previewScope!==current?.id)throw new Error('請在目前班級重新預覽名冊');
  const existing=formRows(),added=preview.filter(s=>{const same=existing.find(e=>e.no&&Number(e.no)===Number(s.no));if(same&&same.name!==s.name)throw new Error(`座號 ${s.no} 已屬於 ${same.name}；請先在表格確認，不自動替換`);if(same&&s.studentNo&&same.studentNo!==s.studentNo)throw new Error(`座號 ${s.no} 的學號與現有資料不同，請直接編輯原列確認`);return !same});
  const seenIds=new Set(existing.map(s=>s.studentNo).filter(Boolean));for(const s of added){if(s.studentNo&&seenIds.has(s.studentNo))throw new Error(`學號 ${s.studentNo} 已存在，請確認名冊`);if(s.studentNo)seenIds.add(s.studentNo)}
  for(const tr of [...$('rows').rows])if(!tr.dataset.id&&[...tr.querySelectorAll('input')].every(input=>!input.value.trim()))tr.remove();
  added.forEach(row);if(added.length)dirty=true;resetImport();const msg=added.length?`已加入 ${added.length} 位學生；請按下方「儲存共用名冊」完成。`:'名冊中的學生都已在表格內，沒有新增或覆寫資料。';message(msg);importStatus(msg);$('roster-status').textContent=msg;
 }catch(e){importStatus(e.message,true)}
};
$('roster-file').onchange=async()=>{
 const f=$('roster-file').files[0];resetImport(true);if(!f)return;const token=importToken,scope=current?.id;const valid=()=>token===importToken&&scope===current?.id;
 importStatus(`正在讀取 ${f.name}…`);
 try{
  if(!scope)throw new Error('請先建立班級與學期');
  if(/\.xlsx?$/i.test(f.name)){
   if(!window.XLSX)throw new Error('本機 Excel 讀取套件未載入，請重新整理網頁後重試');
   const bytes=await f.arrayBuffer();if(!valid())return;workbook=XLSX.read(bytes,{type:'array'});
   if(!workbook.SheetNames.length)throw new Error('Excel 沒有可讀取的工作表');
   $('sheet').replaceChildren(...workbook.SheetNames.map(n=>new Option(n,n)));
   const chosen=workbook.SheetNames.find(n=>RosterImport.detect(sheetMatrix(workbook.Sheets[n])).detected)||workbook.SheetNames[0];
   $('sheet').value=chosen;$('sheet-label').hidden=false;$('sheet').onchange();return;
  }
  const content=await f.text();if(!valid())return;
  if(/\.json$/i.test(f.name)){const obj=JSON.parse(content);const students=Array.isArray(obj)?obj:obj.students;if(!Array.isArray(students))throw new Error('學生名冊 JSON 需有 students 陣列；完整備份請使用下方還原');showPreview(students.map(s=>({no:RosterImport.cell(s.no??s.number),name:RosterImport.cell(s.name),studentNo:RosterImport.cell(s.studentNo)})))}
  else configureMatrix(parseCSV(content));
 }catch(e){if(valid()){clearPreview();importStatus('匯入失敗：'+e.message,true)}}
};
$('backup').onclick=()=>run(async()=>download(await ClassDB.exportBackup(),'班級經營完整備份_'+new Date().toISOString().slice(0,10)+'.json'));
$('restore-file').onchange=()=>run(async()=>{restoreData=null;$('restore-preview').hidden=true;const f=$('restore-file').files[0];if(!f)return;restoreData=ClassDB.validateBackup(JSON.parse(await f.text()));$('restore-description').textContent=`將替換目前整合版資料：${restoreData.main.classes.length} 個班級、${restoreData.main.contexts.length} 個班級學期、${restoreData.main.students.length} 位學生、${restoreData.modules.length} 份工具資料。`;$('restore-preview').hidden=false});
$('restore').onclick=()=>run(async()=>{if(!restoreData||!confirm('確定以此備份替換整合版資料？原獨立工具資料不受影響。'))return;download(await ClassDB.exportBackup(),'還原前自動備份.json');await ClassDB.restoreBackup(restoreData,data.revision);current=null;history.replaceState(null,'',location.pathname);await load();$('restore-preview').hidden=true;message('整合版資料已還原。請重新開啟工具，使用還原後的版本。')});
ClassDB.subscribe(e=>{if(e.kind==='module')return;if(dirty){message('其他分頁已更新共用資料；表格修改仍保留，請先整理並重新讀取後再儲存。',true)}else run(load)});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
const now=new Date();$('year').value=String(now.getFullYear()-1911-(now.getMonth()<7?1:0));run(load);
})();
