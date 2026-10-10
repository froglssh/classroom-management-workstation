(()=>{const W=Workspace;
 function sync(){state.students=W.activeRoster().map(s=>({id:s.studentId,no:s.no,name:s.name}));state.info={schoolYear:W.scope.year,semester:W.scope.semester==='1'?'上學期':W.scope.semester==='2'?'下學期':'暑期',className:W.scope.className};(state.current?.assignments||[]).forEach(item=>{if(!item.student)return;const s=W.match(item.student);if(s)item.student={id:s.studentId,no:s.no,name:s.name}});const retired=(state.current?.assignments||[]).filter(item=>item.student&&(!W.match(item.student)||!W.match(item.student).active)).length;W.issues(retired?`${retired} 項打掃安排仍有轉出或未匹配學生，請手動調整。`:'');}
 const originalRender=renderAll;renderAll=function(){sync();originalRender()};
 const originalSave=saveLocal;saveLocal=function(){sync();syncInputsFromState();originalSave()};
 W.adapter={apply(){
  state.students=W.activeRoster().map(s=>({id:s.studentId,no:s.no,name:s.name}));
  state.info={schoolYear:W.scope.year,semester:W.scope.semester==='1'?'上學期':W.scope.semester==='2'?'下學期':'暑期',className:W.scope.className};
  (state.current?.assignments||[]).forEach(item=>{if(!item.student)return;const s=W.match(item.student);if(s)item.student={id:s.studentId,no:s.no,name:s.name}});
  renderAll();W.disable(['schoolYear','semester','className','studentsInput','loadStudentsBtn','sampleStudentsBtn','clearStudentsBtn','excelFile','importSheetBtn']);
 },capture(){saveLocal()}};
})();
