/* 打掃抽籤 v3.0 與共用名冊的轉接：學生、班級、學年學期一律來自工作站，工具資料存於本班本學期。 */
(()=>{const W=Workspace;
 const sem=()=>W.scope.semester==='1'?'上學期':W.scope.semester==='2'?'下學期':'暑期';
 const toStu=s=>({id:s.studentId,no:String(s.no).padStart(2,'0'),name:s.name});
 function sync(){
  state.students=W.activeRoster().map(toStu);
  state.info={...state.info,schoolYear:String(W.scope.year),semester:sem(),className:W.scope.className};
  const items=state.current?.assignments||[];
  items.forEach(a=>{if(!a.student)return;const s=W.match(a.student);if(s)a.student=toStu(s);});
  const retired=items.filter(a=>a.student&&(!W.match(a.student)||!W.match(a.student).active)).length;
  W.issues(retired?`${retired} 個打掃位置仍是轉出或未匹配的學生，請到「抽籤分配」手動調整。`:'');
 }
 const originalRender=renderAll;renderAll=function(opts){sync();originalRender(opts)};
 function lockRosterUI(){
  W.disable(['schoolYear','semester','className','studentsInput','btnLoadText','btnSample','btnClearStudents','excelFile','btnImportSheet','sheetSelect','nameColumn']);
  ['#srcSeg','#srcPaste','#srcExcel'].forEach(s=>document.querySelector(s)?.classList.add('hidden'));
  if(!document.getElementById('wsRosterNote')){
   const card=document.getElementById('srcPaste').parentElement;const p=document.createElement('div');p.id='wsRosterNote';p.className='card-body';
   p.innerHTML='<p style="margin:0">共享整合版的學生名單、班級與學年學期，統一由工作站的「共用名冊」管理，這裡會自動帶入。</p>';
   const a=document.createElement('a');a.className='btn btn-primary';a.style.marginTop='12px';a.textContent='開啟共用名冊';a.href=W.link('資料中心.html');a.target='_blank';a.rel='noopener';p.append(a);card.append(p);
  }
  const intro=document.querySelector('#page-students .page-title p');if(intro)intro.textContent='學生名單、班級與學年學期由工作站「共用名冊」自動帶入；導師姓名可在這裡填寫（列印用）。';
  const st=document.createElement('style');st.textContent='#roster .chip .x{display:none}';document.head.append(st);
 }
 W.adapter={apply(){sync();renderAll();lockRosterUI();},capture(){saveLocal()}};
})();
