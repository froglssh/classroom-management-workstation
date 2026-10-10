(()=>{const W=Workspace;let lastLabels=new Map(W.scope.roster.map(s=>[s.studentId,W.label(s)]));
 const oldAdd=addPayment;addPayment=function(index){const before=new Set(paymentRecords.map(p=>p.id)),s=W.activeRoster()[index];oldAdd(index);const added=paymentRecords.find(p=>!before.has(p.id));if(added&&s){added.studentId=s.studentId;persistAccount()}};
 W.adapter={apply(){
  paymentRecords.forEach(p=>{const s=p.studentId?W.scope.roster.find(r=>r.studentId===p.studentId):W.scope.roster.find(r=>lastLabels.get(r.studentId)===p.student);if(s){p.studentId=s.studentId;p.student=W.label(s)}});
  students=W.activeRoster().map(W.label);lastLabels=new Map(W.scope.roster.map(s=>[s.studentId,W.label(s)]));document.getElementById('studentNames').value=students.join('\n');renderStudentPaymentForms();updatePaymentRecordsTable();updateOverallPaymentStatus();refreshAccount();
  W.disable(['studentNames','excelFile','importSheetBtn']);
  document.querySelectorAll('button[onclick="processStudentNames()"],button[onclick="importSelectedSheet()"]' ).forEach(b=>b.disabled=true);
 },capture(){if(JSON.stringify(students)!==JSON.stringify(W.activeRoster().map(W.label)))W.adapter.apply();const stable=x=>JSON.stringify(x,(k,v)=>k==='exportedAt'?undefined:v);const saved=JSON.parse(workspaceStorage.getItem(ACCOUNT_CURRENT_KEY)||'null');if(stable(saved?.data)!==stable(getCurrentData()))persistAccount()}};
})();
