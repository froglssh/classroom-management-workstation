/* Compatibility bridge for the preserved classroom tools. */
(()=>{'use strict';
const W=window.Workspace={scope:null,module:document.documentElement.dataset.module,adapter:null,blocked:false,initializing:true,roleWriting:false,callbacks:[],onReady(fn){this.callbacks.push(fn)}};
let memory={},revision=0,pending=false,flushing=false,timer,roleTail=Promise.resolve(),rolePending=0,lastRoleDesired=null,session={};
const params=new URLSearchParams(location.search);let scopeId=params.get('scope');
const overlay=document.createElement('div');overlay.id='workspace-loading';overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#f5f4ed;color:#244c3a;display:grid;place-content:center;padding:30px;font:16px/1.7 "PingFang TC",sans-serif';overlay.textContent='正在連結共用名冊…';
const style=document.createElement('style');style.textContent='#workspace-banner{background:#244c3a!important;color:#fffefa!important;padding:15px 22px!important;font:14px/1.7 "PingFang TC",sans-serif!important;position:relative;z-index:1000;display:flex;gap:12px;align-items:center;flex-wrap:wrap}#workspace-banner a,#workspace-banner button{color:#244c3a!important;background:#f5f4ed!important;border:1px solid #b5c3aa;border-radius:5px;padding:5px 12px;font:13px/1.7 "PingFang TC",sans-serif;cursor:pointer;text-decoration:none}#workspace-save{flex-basis:100%;font-size:12px}#workspace-banner.error{background:#873b27!important}#workspace-materials{padding:16px 22px;background:#e7efdf;color:#244c3a;font:14px/1.7 "PingFang TC",sans-serif}#workspace-materials select,#workspace-materials button{font:inherit;border:1px solid #97aa89;padding:7px 10px;border-radius:5px;color:#244c3a;background:white;margin:4px;max-width:100%}#workspace-materials p{margin:5px 0}#workspace-materials label{display:inline-block;margin:5px 12px 5px 0}#workspace-materials input{margin-right:5px}@media print{#workspace-banner,#workspace-materials{display:none!important}}';document.head.append(style);
function status(text,error=false){const el=document.getElementById('workspace-save');if(el)el.textContent=text;document.getElementById('workspace-banner')?.classList.toggle('error',error)}W.status=status;
W.link=file=>file+'?scope='+encodeURIComponent(scopeId);
function mark(){if(W.initializing)return;if(W.blocked){status('未儲存：版本衝突。請下載本頁草稿，再重新載入。',true);return}pending=true;status('儲存中…請等候完成再關閉分頁');clearTimeout(timer);timer=setTimeout(flush,180)}
async function flush(){clearTimeout(timer);if(W.initializing||flushing||W.blocked||!pending)return;flushing=true;pending=false;const snapshot=structuredClone(memory);try{const result=await ClassDB.saveModule(scopeId,W.module,snapshot,revision);revision=result.revision;status('✓ 本班本學期工具資料已儲存；共用名冊與職務已連結')}catch(e){W.blocked=true;pending=true;status('未儲存：'+e.message+' 請用「下載本頁救援資料」保留目前內容。',true)}finally{flushing=false;if(pending&&!W.blocked)flush()}}
W.flush=async()=>{await flush();while(flushing)await new Promise(r=>setTimeout(r,20));if(W.blocked)throw new Error('版本衝突或儲存失敗');};
const isSecret=key=>/apikey|token|secret|password/i.test(key);
window.workspaceStorage={get length(){return Object.keys(memory).length},key(i){return Object.keys(memory)[i]??null},getItem(key){key=String(key);return isSecret(key)?localStorage.getItem(key):(Object.hasOwn(memory,key)?memory[key]:null)},setItem(key,value){key=String(key);if(isSecret(key)){localStorage.setItem(key,String(value));return}if(W.blocked)throw new Error('工具資料版本衝突，未儲存');if(memory[key]===String(value))return;memory[key]=String(value);mark()},removeItem(key){if(W.blocked)throw new Error('資料版本衝突');delete memory[key];mark()},clear(){throw new Error('整合版不允許清除共用資料')}};
window.workspaceSessionStorage={getItem:key=>session[key]??null,setItem:(key,value)=>session[key]=String(value),removeItem:key=>delete session[key]};
W.issues=text=>{let p=document.getElementById('workspace-issues');if(!p){p=document.createElement('span');p.id='workspace-issues';p.style.cssText='flex-basis:100%;color:#ffe4ab';document.getElementById('workspace-banner').append(p)}p.textContent=text};
W.activeRoster=()=>W.scope.roster.filter(s=>s.active);
W.label=s=>`${s.no} ${s.name}`;
W.rolesFor=id=>W.scope.roles.filter(r=>r.studentId===id).map(r=>r.name);
W.match=s=>{if(!s)return null;const id=s.studentId||s.id;if(id)return W.scope.roster.find(r=>r.studentId===id)||null;const no=String(s.number??s.no??'');const matches=W.scope.roster.filter(r=>Number(r.no)===Number(no)&&r.name===s.name);return matches.length===1?matches[0]:null};
W.queueRoles=tasks=>{
 if(W.initializing)return;const desired=['officer','tutor'].flatMap(type=>tasks[type].map(t=>({id:String(t.id),type,name:t.name,studentId:t.studentId||null})));
 const serialized=JSON.stringify(desired);if(rolePending?serialized===lastRoleDesired:serialized===JSON.stringify(W.scope.roles))return;lastRoleDesired=serialized;rolePending++;
 W.roleWriting=true;status('職務同步中…');
 roleTail=roleTail.then(async()=>{if(W.blocked)throw new Error('版本衝突');if(JSON.stringify(W.scope.roles)===JSON.stringify(desired))return;const d=await ClassDB.saveRoles(scopeId,desired,W.scope.revision);W.scope=ClassDB.scopeOf(d,scopeId)}).then(()=>{rolePending--;W.roleWriting=rolePending>0;status(W.roleWriting?'職務同步中…':'✓ 職務已同步，座位與評語資料已更新')}).catch(e=>{W.blocked=true;rolePending--;W.roleWriting=rolePending>0;status('職務未同步：'+e.message+' 請下載本頁救援資料。',true)});
};
W.waitRoles=async()=>{await roleTail;if(W.blocked)throw new Error('職務同步失敗，請重新載入後再匯入');};
W.disable=ids=>ids.forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=true;el.title='共用資料請至資料中心編輯'}});
W.capture=()=>{if(W.initializing||W.blocked)return;try{W.adapter?.capture?.()}catch(e){status('資料尚未儲存：'+e.message,true)}};
W.download=(object,name)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(object,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)};
async function boot(){if(window.WorkspaceEntry?.fileMode||window.WorkspaceEntry?.receiving)return;document.body.prepend(overlay);try{
 if(location.protocol==='file:')throw new Error('請由工作站的本機伺服器網址開啟，不能以 file:// 共用資料。');
 if(!scopeId)scopeId=(await ClassDB.read()).activeScope;
 W.scope=await ClassDB.scope(scopeId);if(!W.scope)throw new Error('請先從工作站建立並選擇班級學期。');
 const saved=await ClassDB.getModule(scopeId,W.module);memory=saved.data;revision=saved.revision;
 const banner=document.createElement('section');banner.id='workspace-banner';const heading=document.createElement('strong');heading.id='workspace-heading';heading.textContent=`共享整合版｜${W.scope.className}｜${W.scope.year}學年 ${W.scope.semester==='1'?'上':W.scope.semester==='2'?'下':'暑期'}｜${W.activeRoster().length} 位在籍`;
 banner.append(heading);for(const [name,file]of [['共用名冊','資料中心.html'],['幹部與小老師','roles.html'],['工作站首頁','../index.html']]){const a=document.createElement('a');a.textContent=name;a.href=W.link(file);a.target='_blank';a.rel='noopener';banner.append(a)}const rescue=document.createElement('button');rescue.textContent='下載本頁救援資料';rescue.onclick=()=>{W.capture();W.download({app:'lssh.workspace.rescue',scopeId,module:W.module,data:memory,scope:W.scope,exportedAt:new Date().toISOString()},'未儲存資料_'+W.module+'.json')};banner.append(rescue);const state=document.createElement('span');state.id='workspace-save';state.setAttribute('role','status');banner.append(state);document.body.prepend(banner);
 for(const inert of document.querySelectorAll('script[type="text/workspace"]')){const s=document.createElement('script');s.textContent=inert.textContent;document.body.append(s)}
 for(const fn of W.callbacks)fn();
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='adapter-'+W.module+'.js?v=role-json-20261010';s.onload=resolve;s.onerror=()=>reject(new Error('整合介面載入失敗'));document.body.append(s)});
 W.adapter.apply();W.initializing=false;overlay.remove();status('✓ 共用名冊與職務已載入；修改後儲存於本班本學期');
 for(const event of ['input','change','click','drop'])document.addEventListener(event,e=>{if(e.target.closest('#workspace-banner'))return;setTimeout(()=>W.capture(),0)});
 window.addEventListener('beforeunload',e=>{W.capture();if(pending||flushing||W.roleWriting||W.blocked){e.preventDefault();e.returnValue=''}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){W.capture();flush()}});
 ClassDB.subscribe(async event=>{try{
  if(event.kind==='module'&&event.scopeId===scopeId&&event.module===W.module&&!flushing){W.blocked=true;status('其他分頁已儲存此工具。此頁停止寫入，請下載救援資料後重新載入。',true);return}
  if(event.kind==='restore'){W.blocked=true;status('資料庫已還原，請先下載本頁救援資料，再重新開啟工具。',true);return}
  if(W.blocked)return;
  if(event.kind==='active'){const next=await ClassDB.scope(scopeId);if(next)W.scope.revision=next.revision;return}
  if(event.kind==='module'||W.roleWriting)return;
  const next=await ClassDB.scope(scopeId);if(!next)return;W.scope=next;W.adapter.apply();heading.textContent=`共享整合版｜${W.scope.className}｜${W.scope.year}學年 ${W.scope.semester==='1'?'上':W.scope.semester==='2'?'下':'暑期'}｜${W.activeRoster().length} 位在籍`;if(!W.blocked)status('✓ 共用名冊／職務已更新；既有安排與草稿保留');
 }catch(e){status('同步失敗：'+e.message,true)}});
 }catch(e){overlay.replaceChildren();const p=document.createElement('p');p.textContent=e.message;const a=document.createElement('a');a.href='資料中心.html';a.textContent='前往共用名冊與班級學期';overlay.append(p,a)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
