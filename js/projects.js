// ── projects.js ── 公文承辦 OS

function projectGroups(){
  var m={};docs.forEach(function(d){normalizeGtd(d);var pid=(d.projectId||'').trim();if(!pid)return;if(!m[pid])m[pid]=[];m[pid].push(d);});return m;
}

function renderProjects(){
  var groups=projectGroups(),ids=Object.keys(groups).sort();
  var root=g('projectsContent');
  if(!ids.length){root.innerHTML='<div class="vempty"><div><div style="font-size:32px;margin-bottom:8px">&#128193;</div><div>尚無議題型案件</div><div style="font-size:11px;margin-top:4px;color:var(--muted)">新增公文時點「議題模式」並填入議題標籤，就會在這裡出現。</div></div></div>';return;}
  if(!activeProjectId||!groups[activeProjectId])activeProjectId=ids[0];
  var side='<aside class="project-side"><div class="project-head">議題 / 專案</div>'
    +ids.map(function(pid){
      var arr=groups[pid],open=arr.filter(function(d){return d.status!=='done';}).length;
      var late=arr.filter(function(d){return lightOf(d).id==='red'||lightOf(d).id==='orange';}).length;
      var pids=pid.replace(/'/g,"\'");
      return '<div class="project-item'+(pid===activeProjectId?' on':'')+'" onclick="activeProjectId=\''+pids+'\';renderProjects()">'
        +'<div class="project-name">'+esc(pid)+'</div>'
        +'<div class="project-meta"><span>'+arr.length+' 件</span><span>'+open+' 未結</span>'+(late?'<span style="color:var(--red)">'+late+' 急</span>':'')+'</div>'
        +'</div>';
    }).join('')+'</aside>';
  var docsIn=groups[activeProjectId];
  root.innerHTML='<div class="project-layout">'+side+'<section class="project-main">'+projectDetailHTML(activeProjectId,docsIn)+'</section></div>';
}

function projectDetailHTML(pid,arr){
  if(!arr||!arr.length)return '<div class="vempty">尚無此議題資料</div>';
  arr.forEach(normalizeDoc);
  var open=arr.filter(function(d){return d.status!=='done';}).length;
  var allLogs=[];arr.forEach(function(d){(d.log||[]).forEach(function(e){allLogs.push({doc:d,entry:e});});});
  var followups=allLogs.filter(function(x){return x.entry.type==='followup'&&!x.entry.done;});
  var notes=allLogs.filter(function(x){return x.entry.type==='note';});
  var milestones=allLogs.filter(function(x){return x.entry.type==='milestone';});
  followups.sort(function(a,b){return(a.entry.followDate||'9999').localeCompare(b.entry.followDate||'9999');});
  allLogs.sort(function(a,b){return b.entry.date.localeCompare(a.entry.date);});
  var dueDocs=arr.filter(function(d){return d.status!=='done'&&d.due;}).sort(function(a,b){return a.due.localeCompare(b.due);});
  var nextDue=dueDocs[0];
  var nextFollowup=followups[0];
  var lastMilestone=milestones.slice().sort(function(a,b){return b.entry.date.localeCompare(a.entry.date);})[0];
  var blockPoint=nextFollowup?'等 '+(nextFollowup.entry.who||'對方')+'：'+nextFollowup.entry.text.slice(0,20):(nextDue&&lightOf(nextDue).id==='red'?'已逾期，需優先處理':'待我方辦理');
  var pids=pid.replace(/'/g,"\'");
  var hero='<div class="project-hero">'
    +'<div class="project-title">'+esc(pid)+'</div>'
    +'<div class="hero-sub">議題首頁：集中看承辦日誌、待跟進與關聯公文。</div>'
    +'<div class="project-summary">'
      +'<div class="project-stat"><b>'+arr.length+'</b><span>關聯公文</span></div>'
      +'<div class="project-stat"><b>'+open+'</b><span>未結案件</span></div>'
      +'<div class="project-stat"><b>'+followups.length+'</b><span>待跟進</span></div>'
      +'<div class="project-stat"><b>'+notes.length+'</b><span>紀錄筆數</span></div>'
      +'<div class="project-stat"><b>'+milestones.length+'</b><span>里程碑</span></div>'
    +'</div>'
    +'<div class="project-kv">'
      +'<div class="kv"><b>下一個期限</b><span>'+(nextDue?esc(nextDue.due)+'｜'+esc(nextDue.title):'目前無未結期限')+'</span></div>'
      +'<div class="kv"><b>目前卡點</b><span>'+esc(blockPoint)+'</span></div>'
      +'<div class="kv"><b>最近里程碑</b><span>'+(lastMilestone?esc(lastMilestone.entry.date)+'｜'+esc(lastMilestone.entry.text):'尚無里程碑')+'</span></div>'
      +'<div class="kv"><b>最新日誌</b><span>'+(allLogs[0]?esc(allLogs[0].entry.date)+'｜'+esc(allLogs[0].entry.text.slice(0,25)):'尚無日誌')+'</span></div>'
    +'</div>'
    +'<div class="project-actions">'
      +'<button class="small-btn pri" onclick="copyProjectSummary(\''+pids+'\')">複製議題辦理摘要</button>'
      +(nextDue?'<button class="small-btn" onclick="openDoc('+nextDue.id+')">開啟下一期限公文</button>':'')
      +(nextFollowup?'<button class="small-btn" onclick="openDoc('+nextFollowup.doc.id+')">開啟最近追蹤事項</button>':'')
    +'</div>'
    +'</div>';

  // 合併時間軸
  var timeline=allLogs.slice(0,20).map(function(x){
    var e=x.entry,d=x.doc;
    var icon=e.type==='note'?'📝':e.type==='followup'?'⏸':'✅';
    var extra=e.type==='followup'&&e.who?'<span style="color:var(--blue);font-weight:600;font-size:11px;margin-left:6px">'+esc(e.who)+'</span>'+(e.followDate?'<span style="font-size:10px;color:var(--muted);margin-left:4px">追蹤 '+esc(e.followDate)+'</span>':''):'';
    return '<div class="gtd-row'+(e.done?' done':'')+'">'+icon+' <strong>'+esc(e.date)+'</strong>｜'+esc(e.text)+(extra?extra:'')+'<br><span style="color:var(--muted);font-size:10px">來源：'+esc(d.title)+'</span></div>';
  }).join('');

  var followHtml=followups.map(function(x){
    var e=x.entry,d=x.doc;
    var diff=e.followDate?Math.ceil((new Date(e.followDate)-new Date(today()))/86400000):999;
    var l=diff<0?'red':diff<=3?'yellow':'green';
    return '<div class="gtd-row"><span class="lt '+l+'">'+(e.followDate||'未設')+'</span> <strong>'+esc(e.who||'待確認')+'</strong>｜'+esc(e.text)+'<br><span style="color:var(--muted);font-size:10px">'+esc(d.title)+'</span></div>';
  }).join('');

  return hero+'<div class="gtd-grid">'
    +gtdCard('⏸ 待跟進（Waiting For）',followHtml,false)
    +gtdCard('📋 承辦日誌時間軸',timeline||'<div class="gtd-empty">尚無日誌</div>',true)
    +gtdCard('關聯公文',arr.map(function(d){var l=lightOf(d);return '<div class="rdoc" onclick="openDoc('+d.id+')"><span class="lt '+l.id+'">'+l.lb+'</span><div class="rdoc-t">'+esc(d.title)+'</div><span class="stag">'+esc(slb(d.status))+'</span></div>';}).join(''),true)
    +'</div>';
}

function gtdCard(title,html,wide){
  return '<section class="gtd-card'+(wide?' wide':'')+'"><div class="gtd-title">'+title+'</div><div class="gtd-list">'+(html||'<div class="gtd-empty">尚無資料</div>')+'</div></section>';
}

function copyProjectSummary(pid){
  var groups=projectGroups(),arr=groups[pid]||[];
  arr.forEach(normalizeDoc);
  var open=arr.filter(function(d){return d.status!=='done';}).length;
  var allLogs=[];arr.forEach(function(d){(d.log||[]).forEach(function(e){allLogs.push({doc:d,entry:e});});});
  var followups=allLogs.filter(function(x){return x.entry.type==='followup'&&!x.entry.done;});
  var dueDocs=arr.filter(function(d){return d.status!=='done'&&d.due;}).sort(function(a,b){return a.due.localeCompare(b.due);});
  var lines=['【'+pid+'】議題辦理摘要 '+today(),'關聯公文：'+arr.length+' 件｜未結：'+open+' 件'];
  if(dueDocs[0])lines.push('最近期限：'+dueDocs[0].due+'｜'+dueDocs[0].title);
  if(followups.length){lines.push('');lines.push('⏸ 待跟進：');followups.forEach(function(x){var e=x.entry;lines.push('  ・'+(e.who||'待確認')+'：'+e.text+(e.followDate?'（追蹤 '+e.followDate+'）':'')+'（'+x.doc.title+'）');});}
  navigator.clipboard.writeText(lines.join('\n')).then(function(){toast('已複製議題辦理摘要');});
}

function flatGtd(arr,type){
  var out=[];
  arr.forEach(function(d){
    normalizeDoc(d);
    (d.log||[]).forEach(function(e){
      if(e.type===type)out.push({doc:d,item:e});
    });
  });
  return out;
}
