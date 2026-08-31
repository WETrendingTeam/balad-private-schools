/* BALAD RESULT TEMPLATE RENDERER */
(function(){
  const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const payload = JSON.parse(sessionStorage.getItem("baladResultPayload") || "null");
  const section = document.body.dataset.resultSection || "senior";
  const root = document.querySelector(".sheet");
  if(!payload){
    if(root) root.innerHTML='<div style="padding:40px;text-align:center;font-family:Arial,sans-serif"><h2 style="color:#075c43">No result preview data</h2><p>Open this result from the BALAD Result Portal or Staff Result Review.</p></div>';
    return;
  }
  const student = payload.student || {};
  const results = Array.isArray(payload.results) ? payload.results : [];
  const term = String(payload.term || "").toLowerCase();
  const isFirst = /first|1st/.test(term);
  const isSecond = /second|2nd/.test(term);
  const isThird = /third|3rd/.test(term);

  function text(selector,value){ const el=document.querySelector(selector); if(el) el.textContent=value ?? "—"; }
  function findInfo(label){
    return [...document.querySelectorAll('.info-item')].find(x=>x.querySelector('b')?.textContent.trim().replace(':','').toLowerCase()===label.toLowerCase());
  }
  function setInfo(label,value){ const box=findInfo(label); if(box){ const s=box.querySelector('span'); if(s)s.textContent=value ?? "—"; } }

  const school = section === 'primary' ? 'BALAD NURSERY AND PRIMARY SCHOOLS' : 'BALAD COMPREHENSIVE COLLEGE';
  text('.school h1',school);
  text('.access span',payload.accessCode || student.resultAccessCode || '—');
  text('.title-main', section==='primary' ? 'PROGRESS REPORT SHEET FOR PRIMARY AND NURSERY' : 'PROGRESS REPORT SHEET FOR COLLEGE');
  text('.title-sub', section==='primary' ? '' : (section==='junior' ? 'JUNIOR SECONDARY SCHOOL' : 'SENIOR SECONDARY SCHOOL'));

  setInfo('SESSION', payload.session || student.session || '—');
  setInfo('TERM', payload.term || '—');
  setInfo('NAME OF STUDENT', student.studentName || student.name || '—');
  setInfo('ADMISSION NO.', student.admissionNumber || '—');
  setInfo('CLASS', student.className || '—');
  setInfo('GENDER', student.gender || '—');
  setInfo('AGE', student.age || '—');
  setInfo('ATTENDANCE', student.attendance || '—');
  setInfo('NO. IN CLASS', student.classNumber || '—');
  setInfo('NO. TIMES SCHOOL OPENED', student.timesSchoolOpened || student.schoolOpened || '—');
  setInfo('NO. TIMES PRESENT', student.timesPresent || '—');
  setInfo('NO. TIMES ABSENT', student.timesAbsent || '—');
  setInfo('NEXT TERM BEGINS', payload.nextTerm || '—');

  const photo = document.querySelector('.photo-box');
  if(photo && (student.passportUrl || student.passport)) photo.innerHTML='<img src="'+esc(student.passportUrl || student.passport)+'" alt="Student Photo">';

  const table=document.querySelector('.academic');
  if(table){
    const cols = [{k:'subject',label:'SUBJECT'},{k:'ca',label:'CA<br>40'},{k:'exam',label:'EXAM<br>60'},{k:'total',label:'TOTAL<br>100'},{k:'grade',label:'GRADE'},{k:'remark',label:'REMARK'}];
    if(isSecond || isThird) cols.push({k:'firstTerm',label:'1ST TERM<br>%'});
    if(isSecond || isThird) cols.push({k:'secondTerm',label:'2ND TERM<br>%'});
    if(isThird) cols.push({k:'thirdTerm',label:'3RD TERM<br>%'});
    if(!isFirst) cols.push({k:'cumulativeAverage',label:'CUMULATIVE<br>AVG %'});
    table.innerHTML='<thead><tr>'+cols.map(c=>'<th class="'+c.k+'">'+c.label+'</th>').join('')+'</tr></thead><tbody>'+results.map(x=>{
      const total=Number(x.total ?? ((Number(x.ca)||0)+(Number(x.exam)||0)));
      const cells=cols.map(c=>{
        let v=c.k==='subject'?x.subject:c.k==='total'?total:c.k==='remark'?(x.remark||''):x[c.k];
        return '<td class="'+(c.k==='subject'?'subject':'')+'">'+esc(v==null||v===''?'—':v)+'</td>';
      }).join('');
      return '<tr>'+cells+'</tr>';
    }).join('')+'</tbody>';
  }

  const currentTotal=results.reduce((s,x)=>s+Number(x.total ?? ((Number(x.ca)||0)+(Number(x.exam)||0))),0);
  const currentAvg=results.length?currentTotal/results.length:0;
  const cumulative=results.map(x=>Number(x.cumulativeAverage)).filter(Number.isFinite);
  const cumAvg=cumulative.length?cumulative.reduce((a,b)=>a+b,0)/cumulative.length:0;
  const summary=document.querySelectorAll('.summary-value');
  if(summary[0]) summary[0].textContent=currentTotal+' / '+(results.length*100);
  if(summary[1]) summary[1].textContent=results.length?currentAvg.toFixed(2)+'%':'—';
  if(summary[2]) summary[2].textContent=!isFirst && cumulative.length?cumAvg.toFixed(2)+'%':'—';

  const comments=document.querySelectorAll('.comment p');
  if(comments[0]) comments[0].textContent=payload.teacherRemark || '—';
  if(comments[1]) comments[1].textContent=payload.principalComment || '—';
  const resumption=document.querySelector('.resumption-box');
  if(resumption) resumption.innerHTML='<b>Resumption Date:</b> '+esc(payload.resumptionDate || '—');
  const principal=document.querySelector('.principal-name');
  if(principal && payload.principalName) principal.textContent='PRINCIPAL: '+payload.principalName;

  document.title=school+' Result';
  document.querySelectorAll('.toolbar strong').forEach(x=>x.textContent=section==='primary'?'BALAD PRIMARY RESULT':section==='junior'?'BALAD JUNIOR RESULT':'BALAD SENIOR RESULT');
})();
