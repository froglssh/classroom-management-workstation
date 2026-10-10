(()=>{
 const W=Workspace;let restoring=false;
 function roster(){const previous=new Map(state.students.map(s=>[s.id,s]));state.students=W.activeRoster().map(s=>({id:s.studentId,number:s.no,name:s.name,note:previous.get(s.studentId)?.note||''}));$('#namesInput').value=studentsToInputText(state.students)}
 function synchronize(){roster();state.className=W.scope.className;$('#className').value=state.className;getAllSeats().forEach(seat=>{if(!seat.student)return;const s=W.match(seat.student);if(s)seat.student={...seat.student,id:s.studentId,number:s.no,name:s.name};});const retired=getAllSeats().filter(seat=>seat.student&&(!W.match(seat.student)||!W.match(seat.student).active)).length;W.issues(retired?`${retired} 個座位仍有轉出或未匹配學生，請手動調整；系統保留原位置。`:'');}
 const originalRender=renderAll;renderAll=function(){synchronize();originalRender()};
 parseStudents=roster;
 const saved=workspaceStorage.getItem('workspace-current');if(saved){restoring=true;applyLayoutData(JSON.parse(saved),{includeHistory:true});restoring=false}
 W.adapter={apply(){
  roster();state.className=W.scope.className;$('#className').value=state.className;
  getAllSeats().forEach(seat=>{if(!seat.student)return;const s=W.match(seat.student);if(s)seat.student={...seat.student,id:s.studentId,number:s.no,name:s.name};});
  renderAll();W.disable(['namesInput','excelFile','importSheetBtn','importExcelBtn','className','tagRoleSelect','roleSelect']);
  $('#studentTagInput').placeholder='個人備註（正式職務自動帶入）';
 },capture(){if(restoring)return;workspaceStorage.setItem('workspace-current',JSON.stringify({className:W.scope.className,roomName:state.roomName,rows:state.rows,cols:state.cols,seats:state.seats,students:state.students,mode:state.mode,view:state.view,history:state.history,currentPresetName:state.currentPresetName,currentRecordName:state.currentRecordName}));}};
 const refresh=document.getElementById('refreshSharedRolesBtn');
 if(refresh)refresh.onclick=async()=>{refresh.disabled=true;try{if(W.blocked)throw new Error('此頁已停止寫入，請先保留救援資料並重新開啟');const latest=await ClassDB.scope(W.scope.id);if(!latest)throw new Error('班級學期不存在');W.scope=latest;W.adapter.apply();W.capture();toast('已更新共用職務，既有座位與個人備註保留。')}catch(e){W.status(e.message,true)}finally{refresh.disabled=false}};
})();
