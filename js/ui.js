// ── ui.js ── 公文承辦 OS

function setView(v){
  curView=v;
  document.querySelectorAll('.vt').forEach(function(b){b.classList.toggle('on',b.dataset.view===v);});
  g('kanbanView').style.display=v==='kanban'?'block':'none';
  g('listView').style.display=v==='list'?'block':'none';
  g('todoView').style.display=v==='todo'?'block':'none';
  g('projectsView').style.display=v==='projects'?'block':'none';
  g('templatesView').style.display=v==='templates'?'block':'none';
  render();
}

function render(){
  renderStats();
  if(curView==='kanban')renderKanban();
  else if(curView==='list')renderList();
  else if(curView==='todo')renderTodo();
  else if(curView==='projects')renderProjects();
  else if(curView==='templates')renderTemplates();
}

function renderStats(){
  var all=docs,lights=all.map(lightOf);
  g('stAll').textContent=all.length;
  g('stLate').textContent=lights.filter(function(l){return l.id==='red';}).length;
  g('stToday').textContent=lights.filter(function(l){return l.id==='orange';}).length;
  g('stSoon').textContent=lights.filter(function(l){return l.id==='yellow';}).length;
  g('stWait').textContent=lights.filter(function(l){return l.id==='blue';}).length;
  g('stIter').textContent=all.filter(function(d){return d.templateState==='需微調'||d.templateState==='需新建';}).length;
  var done=all.filter(function(d){return d.status==='done';}).length;
  g('prog').style.width=all.length?Math.round(done/all.length*100)+'%':'0%';
  g('pnote').textContent='已結案 '+done+'/'+all.length+' 件｜待例稿迭代 '+all.filter(function(d){return d.templateState==='需微調'||d.templateState==='需新建';}).length+' 件';
  bars('catBars',countBy(all,function(d){return d.cat;}));
  bars('iterBars',countBy(all,function(d){return d.templateState;}));
  bars('statusBars',countBy(all,function(d){return slb(d.status);}));
  bars('ownerBars',countBy(all,function(d){return d.owner||'我';}));
  // 卡住案件
  var stuck=docs.filter(isStuck);
  var sb=g('stuckBanner'),sl=g('stuckList');
  if(sb)sb.style.display=stuck.length?'block':'none';
  if(sl)sl.innerHTML=stuck.slice(0,6).map(function(d){
    var days=daysInStatus(d);
    var l=lightOf(d);
    return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer" onclick="openDoc('+d.id+')">'
      +'<span class="lt '+l.id+'">'+l.lb+'</span>'
      +'<span style="color:var(--orange);font-weight:700;font-size:11px">'+days+'天</span>'
      +'<span>'+esc(d.title.slice(0,25))+(d.title.length>25?'…':'')+'</span>'
      +'<span style="color:var(--muted);font-size:10px">（'+esc(slb(d.status))+'）</span>'
      +'</div>';
  }).join('');
}

function bars(id,data){
  var max=1;data.forEach(function(x){if(x[1]>max)max=x[1];});
  var el=g(id);if(!el)return;
  el.innerHTML=data.slice(0,5).map(function(kv){
    return '<div class="bl"><div class="bl-lbl">'+esc(kv[0])+'</div><div class="bl-bg"><div class="bl-fill" style="width:'+Math.round(kv[1]/max*100)+'%"></div></div><div class="bl-n">'+kv[1]+'</div></div>';
  }).join('')||'<div style="color:var(--muted);font-size:11px">尚無資料</div>';
}

function renderKanban(){
  var list=filtered();
  g('kanban').innerHTML=STS.map(function(s){
    var cards=list.filter(function(d){return d.status===s.id;});
    return '<section class="kbc" data-status="'+s.id+'" ondragover="colDO(event,this)" ondragleave="colDL(this)" ondrop="colDrop(event,this)">'
      +'<div class="kbh"><span class="kbn">'+s.lb+'</span><span class="kbcnt">'+cards.length+'</span></div>'
      +'<div class="drop-bar" id="db_'+s.id+'"></div>'
      +(cards.length?cards.map(cardHTML).join(''):'<div class="empty-col">拖曳至此</div>')
      +'</section>';
  }).join('');
}

function cardHTML(d){
  var l=lightOf(d),color=catColor(d.cat||'其他');
  var steps=d.steps||[],done=steps.filter(function(s){return s.done;}).length;
  var spEl=(d.speed&&d.speed!=='普通件')?'<span class="sptag '+spCls(d.speed)+'">'+esc(d.speed)+'</span>':'';
  var wfEl='';
  if(steps.length){
    var dots=steps.map(function(s){return '<div class="wfdot'+(s.done?' done':'')+'"></div>';}).join('');
    wfEl='<div class="wfmini">'+dots+'<span class="wfprog">'+done+'/'+steps.length+'</span></div>';
  }
  var si=STS.findIndex(function(s){return s.id===d.status;});
  var ns=(si>=0&&si<STS.length-1)?STS[si+1]:null;
  var nBtn=ns?'<button class="qb" onclick="qSt('+d.id+',\''+ns.id+'\')">&#8594; '+ns.lb+'</button>':'';
  var dBtn=(d.status!=='done')
    ?'<button class="qb g" onclick="qSt('+d.id+',\'done\')">&#10003; 結案</button>'
    :'<button class="qb" onclick="qSt('+d.id+',\'research\')">&#8617; 重開</button>';
  var wBtn=(d.waiting!=='yes')
    ?'<button class="qb b" onclick="qWt('+d.id+',1)">&#9646; 等回復</button>'
    :'<button class="qb" onclick="qWt('+d.id+',0)">&#9654; 繼續</button>';
  var quick='<div class="cquick" onclick="event.stopPropagation()">'+nBtn+dBtn+wBtn+'<button class="qb" onclick="openQEdit(event,'+d.id+')">&#9998;</button></div>';
  return '<article class="dc'+(d.status==='done'?' done':'')+'" style="border-left-color:'+color+'" draggable="true" ondragstart="cDS(event,'+d.id+')" ondragend="cDE(event)" onclick="openDoc('+d.id+')">'
    +'<div class="ctop"><span class="dno">'+esc(d.docNo||'#'+d.id)+'</span>'+(isIncomplete(d)&&d.status!=='done'?'<span class="incomplete-badge">待補</span>':'')+'<span class="lt '+l.id+'">'+l.lb+'</span></div>'   +'<div class="dtitle">'+esc(d.title)+'</div>'
    +'<div class="dtags"><span class="ctag" style="background:'+color+'18;color:'+color+'">'+esc(d.cat||'其他')+'</span>'+(d.source?'<span class="stag">'+esc(d.source)+'</span>':'')+(d.projectId?'<span class="project-tag">'+esc(d.projectId)+'</span>':'')+spEl+'</div>'
    +(d.next?'<div class="dnext">&#9654; '+esc(d.next)+'</div>':'')
    +wfEl
    +'<div class="dmeta"><span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.template||'')+'</span><span class="pill">'+esc(d.templateState||'未分類')+'</span></div>'
    +quick+'</article>';
}

function qSt(id,st){var d=docs.find(function(x){return x.id===id;});if(!d)return;d.status=st;save();render();toast('已更新：'+slb(st));}

function qWt(id,w){var d=docs.find(function(x){return x.id===id;});if(!d)return;d.waiting=w?'yes':'no';save();render();toast(w?'已標記等外部回復':'已繼續承辦');}

function cDS(e,id){dragId=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(id));setTimeout(function(){e.target.classList.add('dragging');},0);}

function cDE(e){e.target.classList.remove('dragging');document.querySelectorAll('.kbc').forEach(function(c){c.classList.remove('drag-over');});document.querySelectorAll('.drop-bar').forEach(function(b){b.classList.remove('show');});dragId=null;}

function colDO(e,col){e.preventDefault();col.classList.add('drag-over');var db=g('db_'+col.dataset.status);if(db)db.classList.add('show');}

function colDL(col){col.classList.remove('drag-over');var db=g('db_'+col.dataset.status);if(db)db.classList.remove('show');}

function colDrop(e,col){
  e.preventDefault();col.classList.remove('drag-over');var db=g('db_'+col.dataset.status);if(db)db.classList.remove('show');
  var id=parseInt(e.dataTransfer.getData('text/plain')||dragId,10);if(!id||!col.dataset.status)return;
  var d=docs.find(function(x){return x.id===id;});if(!d||d.status===col.dataset.status)return;
  d.status=col.dataset.status;save();render();toast(d.title.slice(0,15)+'… → '+slb(col.dataset.status));
}

function renderList(){
  g('tableBody').innerHTML=filtered().map(function(d){
    var l=lightOf(d),color=catColor(d.cat||''),steps=d.steps||[],ds=steps.filter(function(s){return s.done;}).length;
    return '<tr class="tr-c" onclick="openDoc('+d.id+')">'
      +'<td><span class="lt '+l.id+'">'+l.lb+'</span></td>'
      +'<td style="max-width:240px;font-weight:500">'+esc(d.title)+'</td>'
      +'<td>'+esc(d.docNo)+'</td>'
      +'<td><span class="ctag" style="background:'+color+'18;color:'+color+'">'+esc(d.cat||'')+'</span></td>'
      +'<td>'+esc(d.template)+'</td>'
      +'<td><span class="pill">'+esc(d.templateState)+'</span></td>'
      +'<td>'+esc(slb(d.status))+'</td>'
      +'<td>'+(d.speed&&d.speed!=='普通件'?'<span class="sptag '+spCls(d.speed)+'">'+esc(d.speed)+'</span>':esc(d.speed||''))+'</td>'
      +'<td>'+esc(d.due||'')+'</td>'
      +'<td>'+(steps.length?ds+'/'+steps.length:'-')+'</td>'
      +'<td style="max-width:160px;font-size:11px;color:var(--primary)">'+esc(d.next||'')+'</td>'
      +'<td>'+esc(d.owner||'')+'</td>'
      +'</tr>';
  }).join('');
}

function renderTodo(){
  var active=docs.filter(function(d){return d.status!=='done'&&d.waiting!=='yes';});
  function pri(d){var l=lightOf(d).id;var p={red:0,orange:1,yellow:3,green:6,blue:8,gray:9}[l]||7;if(d.speed==='最速件')p-=2;else if(d.speed==='速件')p-=1;return p;}
  active.sort(function(a,b){var pa=pri(a),pb=pri(b);if(pa!==pb)return pa-pb;return(a.due||'9999-99-99').localeCompare(b.due||'9999-99-99');});
  var groups=[
    {k:'red',lb:'&#9888; 已逾期',c:'var(--red)',items:active.filter(function(d){return lightOf(d).id==='red';})},
    {k:'orange',lb:'&#128293; 今日到期',c:'var(--orange)',items:active.filter(function(d){return lightOf(d).id==='orange';})},
    {k:'fast',lb:'&#9889; 速件 / 最速件',c:'var(--blue)',items:active.filter(function(d){return(d.speed==='速件'||d.speed==='最速件')&&['red','orange'].indexOf(lightOf(d).id)<0;})},
    {k:'yellow',lb:'&#8987; 3日內到期',c:'var(--yellow)',items:active.filter(function(d){return lightOf(d).id==='yellow'&&!(d.speed==='速件'||d.speed==='最速件');})},
    {k:'green',lb:'&#128203; 承辦中',c:'var(--primary)',items:active.filter(function(d){return lightOf(d).id==='green'&&!(d.speed==='速件'||d.speed==='最速件');})}
  ];
  var root=g('todoContent');
  var follow=followupsHTML()+todayActionsHTML();
  if(!active.length){root.innerHTML=follow+'<div class="todo-empty">&#127881; 目前沒有待辦案件</div>';return;}
  root.innerHTML=follow+'<div class="todo-wrap">'+groups.filter(function(gr){return gr.items.length;}).map(function(gr){
    return '<div class="tds">'
      +'<div class="tdsh"><span class="tdst" style="color:'+gr.c+'">'+gr.lb+'（'+gr.items.length+'）</span><div class="tddiv"></div></div>'
      +gr.items.map(function(d){
        var l=lightOf(d),color=catColor(d.cat||''),steps=d.steps||[],ds=steps.filter(function(s){return s.done;}).length;
        var si=STS.findIndex(function(s){return s.id===d.status;});
        var ns=(si>=0&&si<STS.length-1)?STS[si+1]:null;
        return '<div class="tdc" style="border-left-color:'+color+'">'
          +'<div class="tdc-l" onclick="openDoc('+d.id+')">'
            +'<div class="tdc-title">'+esc(d.title)+'</div>'
            +'<div class="tdc-meta"><span class="lt '+l.id+'">'+l.lb+'</span><span class="ctag" style="background:'+color+'18;color:'+color+'">'+esc(d.cat||'')+'</span>'+(d.source?'<span class="stag">'+esc(d.source)+'</span>':'')+(d.projectId?'<span class="project-tag">'+esc(d.projectId)+'</span>':'')+(d.speed&&d.speed!=='普通件'?'<span class="sptag '+spCls(d.speed)+'">'+esc(d.speed)+'</span>':'')+(d.due?'<span style="font-size:10px;color:var(--muted)">期限 '+esc(d.due)+'</span>':'')+'</div>'
            +(d.next?'<div class="tdc-next">&#9654; '+esc(d.next)+'</div>':'')
          +'</div>'
          +'<div class="tdc-r" onclick="event.stopPropagation()">'
            +'<span class="tdc-wf">'+(steps.length?'WF '+ds+'/'+steps.length:slb(d.status))+'</span>'
            +'<div class="tdc-btns">'
              +(ns?'<button class="qb" onclick="qSt('+d.id+',\''+ns.id+'\')">'+'&#8594; '+ns.lb+'</button>':'')
              +'<button class="qb g" onclick="qSt('+d.id+',\'done\')">✓ 結案</button>'
              +'<button class="qb b" onclick="qWt('+d.id+',1)">&#9646; 等回復</button>'
            +'</div>'
          +'</div>'
          +'</div>';
      }).join('')
      +'</div>';
  }).join('')+'</div>';
}

function followupsHTML(){
  var rows=[];
  docs.forEach(function(d){
    normalizeDoc(d);
    (d.log||[]).forEach(function(e){
      if(e.type==='followup'&&!e.done)rows.push({doc:d,entry:e});
    });
  });
  rows.sort(function(a,b){return(a.entry.followDate||'9999-99-99').localeCompare(b.entry.followDate||'9999-99-99');});
  if(!rows.length)return '';
  return '<section class="follow-table"><div class="follow-head"><b>&#9646; Waiting For 追蹤總表</b><span style="font-size:11px;color:var(--muted)">依追蹤日排序・點擊可開啟公文</span></div>'
    +rows.slice(0,12).map(function(r){
      var e=r.entry,d=r.doc;
      var diff=e.followDate?Math.ceil((new Date(e.followDate)-new Date(today()))/86400000):999;
      var l=diff<0?'red':diff<=3?'yellow':'gray';
      return '<div class="follow-row" onclick="openDoc('+d.id+')">'
        +'<div data-label="追蹤日"><span class="lt '+l+'">'+esc(e.followDate||'未設')+'</span></div>'
        +'<div data-label="公文"><strong>'+esc(d.projectId||d.title.slice(0,20))+'</strong><div class="muted">'+esc(d.title)+'</div></div>'
        +'<div data-label="等待對象">'+esc(e.who||'待確認')+'</div>'
        +'<div data-label="等待事項">'+esc(e.text||'')+'</div>'
        +'<div data-label="狀態"><span class="stag">'+esc(slb(d.status))+'</span></div>'
        +'</div>';
    }).join('')+'</section>';
}

function todayActionsHTML(){
  var items=[];
  docs.forEach(function(d){
    if(d.status==='done'||!d.next)return;
    items.push({docId:d.id,title:d.title,text:d.next,light:lightOf(d).id});
  });
  var order={red:0,orange:1,yellow:2,green:3,blue:4,gray:5};
  items.sort(function(a,b){return(order[a.light]||9)-(order[b.light]||9);});
  if(!items.length)return '';
  var lightLb={red:'逾期',orange:'今日',yellow:'3日內',green:'承辦中',blue:'等回復',gray:'結案'};
  return '<section class="follow-table" style="margin-bottom:14px">'
    +'<div class="follow-head"><b>&#9654; 今日行動清單</b><span style="font-size:11px;color:var(--muted)">來自各案件「下一步」欄位・點擊開啟</span></div>'
    +items.slice(0,10).map(function(it){
      return '<div class="follow-row" style="grid-template-columns:70px 1fr" onclick="openDoc('+it.docId+')">'
        +'<div><span class="lt '+it.light+'">'+(lightLb[it.light]||it.light)+'</span></div>'
        +'<div><div style="font-weight:600;font-size:12px">'+esc(it.text)+'</div>'
        +'<div class="muted" style="font-size:10px">'+esc(it.title)+'</div></div>'
        +'</div>';
    }).join('')
    +'</section>';
}

function openDoc(id){
  editId=id||0;
  var d=id?docs.find(function(x){return x.id===id;}):null;
  if(!d)d={title:'',docNo:autoDocNo(),source:'',received:today(),due:'',cat:cats[0],template:'',status:'new',templateState:'未分類',speed:'普通件',owner:'我',waiting:'no',next:'',link:'',note:'',steps:[],log:[],caseType:'single',projectId:''};
  normalizeDoc(d);
  g('docTitle').textContent=id?'編輯公文':'新增公文';
  g('delBtn').style.display=id?'inline-block':'none';
  ['Title','DocNo','Source','Received','Due','Next','Link','Note','Owner'].forEach(function(k){var el=g('f'+k);if(el)el.value=d[k.charAt(0).toLowerCase()+k.slice(1)]||'';});
  g('fCat').value=d.cat||cats[0];updateTplOpts();
  g('fTemplate').value=d.template||'';
  g('fStatus').value=d.status||'new';
  g('fTplState').value=d.templateState||'未分類';
  g('fSpeed').value=d.speed||'普通件';
  g('fWaiting').value=d.waiting||'no';
  wfSteps=(d.steps||[]).map(function(s){return{text:s.text,done:s.done};});
  renderWF();
  // 案件類型
  caseType=d.caseType||'single';
  setCaseType(caseType,true);
  // 日誌
  logState=(d.log||[]).map(function(e){return Object.assign({},e);});
  logFormType=null;
  var lf=g('logForm');if(lf)lf.classList.remove('show');
  renderLogList();
  // 議題標籤
  renderProjectPicker(d.projectId||'');
  // 快速/完整模式
  if(id&&d.projectId){setDocMode('full');}else{setDocMode(docMode);}
  g('docBg').classList.add('show');
}

function getDoc(){
  var pid=currentProjectValue();
  var ct=caseType;
  return{
    id:editId||Date.now(),
    title:g('fTitle').value.trim(),
    docNo:g('fDocNo').value.trim(),
    source:g('fSource').value.trim(),
    received:g('fReceived').value,
    due:g('fDue').value,
    cat:g('fCat').value,
    template:g('fTemplate').value,
    status:g('fStatus').value,
    templateState:g('fTplState').value,
    speed:g('fSpeed').value,
    owner:g('fOwner').value.trim()||'我',
    waiting:g('fWaiting').value,
    next:g('fNext').value.trim(),
    link:g('fLink').value.trim(),
    note:g('fNote').value.trim(),
    steps:wfSteps.map(function(s){return{text:s.text,done:s.done};}),
    caseType:ct,
    projectId:ct==='project'?pid:'',
    log:logState.map(function(e){return Object.assign({},e);})
  };
}
// ── 案件類型 ──────────────────────────────────────

function saveDoc(){
  var d=getDoc();if(!d.title){toast('請輸入主旨');return;}
  if(d.projectId&&projectTags.indexOf(d.projectId)<0){projectTags.push(d.projectId);saveProjectTags();}
  if(editId){
    var i=docs.findIndex(function(x){return x.id===editId;});
    if(i>=0){
      // 狀態變更時記錄時間
      if(docs[i].status!==d.status)d.statusChangedAt=today();
      else d.statusChangedAt=docs[i].statusChangedAt||today();
      docs[i]=d;
    }
  }else{
    d.statusChangedAt=today();
    docs.push(d);
  }
  save();closeM('docBg');toast('已儲存');render();
}

function deleteDoc(){
  if(!editId)return;
  if(!confirm('確定刪除此件公文？'))return;
  docs=docs.filter(function(d){return d.id!==editId;});
  save();closeM('docBg');toast('已刪除');render();
}

function copyBrief(){
  var d=getDoc();
  var sx=d.steps.length?'\nWorkflow：\n'+d.steps.map(function(s){return'  '+(s.done?'☑':'☐')+' '+s.text;}).join('\n'):'';
  var lx=d.log.length?'\n承辦日誌：\n'+d.log.slice(-3).map(function(e){return'  ['+e.date+'] '+e.text;}).join('\n'):'';
  navigator.clipboard.writeText(
    d.title+'\n文號：'+(d.docNo||'未填')+'\n業務：'+d.cat
    +'\n例稿：'+d.template+'（'+d.templateState+'）'
    +'\n狀態：'+slb(d.status)+'\n期限：'+(d.due||'未填')
    +'\n下一步：'+(d.next||'未填')+sx+lx
  ).then(function(){toast('已複製摘要');});
}

// ── Workflow ──────────────────────────────────────

function copyHandover(){
  var d=getDoc();
  var steps=d.steps||[];
  var done=steps.filter(function(s){return s.done;});
  var todo=steps.filter(function(s){return !s.done;});
  var logs=d.log||[];
  var followups=logs.filter(function(e){return e.type==='followup'&&!e.done;});
  var notes=logs.filter(function(e){return e.type==='note';}).slice(-3);
  var milestones=logs.filter(function(e){return e.type==='milestone';});
  var lastMilestone=milestones.length?milestones[milestones.length-1]:null;

  var lines=[
    '【交接摘要】'+d.title,
    '═'.repeat(40),
    '一、目前狀態：'+slb(d.status)+(d.statusChangedAt?' （'+daysInStatus(d)+'天）':''),
    '二、辦理期限：'+(d.due||'未設定'),
    '三、例稿分類：'+(d.template||'未設定')+'（'+d.templateState+'）',
    '',
    '四、已處理事項：',
  ];
  if(done.length){done.forEach(function(s){lines.push('  ☑ '+s.text);});}
  else{lines.push('  （尚無已完成步驟）');}
  lines.push('');
  lines.push('五、待辦事項：');
  if(todo.length){todo.forEach(function(s){lines.push('  ☐ '+s.text);});}
  else{lines.push('  （Workflow 已全部完成）');}
  lines.push('');
  lines.push('六、待跟進對象：');
  if(followups.length){
    followups.forEach(function(e){
      lines.push('  ・'+(e.who||'待確認')+'：'+e.text+(e.followDate?' → 追蹤日 '+e.followDate:''));
    });
  }else{lines.push('  （無待跟進事項）');}
  lines.push('');
  lines.push('七、目前卡點：'+(d.next||'無'));
  lines.push('');
  if(lastMilestone){lines.push('八、最近里程碑（'+lastMilestone.date+'）：'+lastMilestone.text);lines.push('');}
  if(notes.length){
    lines.push('九、近期承辦紀錄：');
    notes.forEach(function(e){lines.push('  ['+e.date+'] '+e.text.slice(0,60)+(e.text.length>60?'…':''));});
    lines.push('');
  }
  lines.push('十、參考連結：'+(d.link||'無'));
  lines.push('十一、備註：'+(d.note||'無'));
  lines.push('');
  lines.push('── 產出時間：'+today()+' ──');

  navigator.clipboard.writeText(lines.join('\n'))
    .then(function(){toast('✅ 交接摘要已複製到剪貼簿');});
}


function precipitateToVault(){
  var d=getDoc();
  var tplName=g('fTemplate')?g('fTemplate').value:'';
  if(!tplName){toast('請先選擇例稿分類');return;}
  // 收集備註文字
  var noteText=d.note?d.note.trim():'';
  var logNotes=(d.log||[]).filter(function(e){return e.type==='note';})
    .map(function(e){return '['+e.date+'] '+e.text;}).join('\n');
  var candidate=(noteText+(noteText&&logNotes?'\n\n---\n\n':'')+logNotes).trim();
  if(!candidate){toast('沒有可沉澱的備註或日誌紀錄');return;}

  // 選擇沉澱方式
  var choice=prompt(
    '沉澱到例稿「'+tplName+'」\n\n請選擇方式：\n1 加到筆記末尾\n2 覆蓋筆記\n3 加到 SOP\n\n輸入 1、2 或 3：'
  );
  if(!choice)return;
  var key=tplName; // 沉澱到例稿名稱層（非樣態）
  if(choice==='1'){
    var existing=tpl.notes[key]||'';
    tpl.notes[key]=(existing?existing+'\n\n---\n\n'+today()+'\n':today()+'\n')+candidate;
    saveTpl();toast('✅ 已附加到例稿筆記');
  }else if(choice==='2'){
    if(!confirm('確定覆蓋「'+tplName+'」的筆記？'))return;
    tpl.notes[key]=today()+'\n'+candidate;
    saveTpl();toast('✅ 已覆蓋例稿筆記');
  }else if(choice==='3'){
    var sopLines=candidate.split('\n').filter(function(l){return l.trim();});
    if(!tpl.sop)tpl.sop={};
    tpl.sop[key]=(tpl.sop[key]||[]).concat(sopLines.slice(0,5));
    saveTpl();toast('✅ 已加入例稿 SOP（最多 5 步）');
  }else{
    toast('輸入無效，請輸入 1、2 或 3');
  }
}

// ── 快速收件 ──────────────────────────────────
function openQuickIntake(){
  // 填充 select
  var catSel=g('qiCat'),tplSel=g('qiTemplate'),srcDl=g('qiSrcList');
  if(catSel){
    catSel.innerHTML=cats.map(function(c){return'<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('');
  }
  if(tplSel){
    var tpls=Object.keys(tplMap||{});
    tplSel.innerHTML='<option value="">（不指定）</option>'+tpls.map(function(t){return'<option value="'+esc(t)+'">'+esc(t)+'</option>';}).join('');
  }
  if(srcDl){
    srcDl.innerHTML=srcs.map(function(s){return'<option value="'+esc(s)+'">';}).join('');
  }
  // 清空欄位
  ['qiTitle','qiSource','qiDue'].forEach(function(id){var el=g(id);if(el)el.value='';});
  g('quickIntakeBg').classList.add('show');
  setTimeout(function(){var t=g('qiTitle');if(t)t.focus();},100);
}

function getQuickIntakeDoc(){
  var title=(g('qiTitle').value||'').trim();
  if(!title){toast('請輸入主旨');return null;}
  return {
    id: Date.now(),
    title: title,
    docNo: autoDocNo(),
    source: (g('qiSource').value||'').trim(),
    received: today(),
    due: g('qiDue').value||'',
    cat: g('qiCat').value||cats[0],
    template: g('qiTemplate').value||'',
    status: 'new',
    templateState: '未分類',
    speed: '普通件',
    owner: '我',
    waiting: 'no',
    next: '',link:'',note:'',
    steps:[],log:[],
    caseType:'single',projectId:'',
    statusChangedAt: today(),
    meta:{}
  };
}

function saveQuickIntake(){
  var d=getQuickIntakeDoc();if(!d)return;
  normalizeDoc(d);
  docs.push(d);save();
  closeM('quickIntakeBg');
  // 直接開啟完整編輯
  openDoc(d.id);
  toast('已收件，請補充完整資料');
}

function saveQuickIntakeOnly(){
  var d=getQuickIntakeDoc();if(!d)return;
  normalizeDoc(d);
  docs.push(d);save();render();
  closeM('quickIntakeBg');
  toast('✅ 已收件：'+d.title.slice(0,20)+(d.title.length>20?'…':''));
}

function setCaseType(ct, silent){
  caseType=ct;
  // radio 同步
  document.querySelectorAll('input[name="caseType"]').forEach(function(r){r.checked=(r.value===ct);});
  // 議題標籤區顯示
  var ps=g('projectSection');
  if(ps)ps.style.display=ct==='project'?'block':'none';
  // hint 文字
  var hint=g('caseTypeHint');
  if(hint)hint.textContent=ct==='project'?'議題型：可跨多件公文追蹤，歸屬議題標籤':'單次辦理，不需跨案件追蹤';
  // 議題型自動切完整模式
  if(ct==='project'&&!silent)setDocMode('full');
}

// ── 承辦日誌 ──────────────────────────────────────
var logFormType=null;

function setDocMode(mode){
  docMode=mode;
  var modal=document.querySelector('#docBg .modal');
  if(modal)modal.classList.toggle('quick-mode',mode==='quick');
  var qBtn=g('modeQuick'),fBtn=g('modeFull'),hint=g('modeHint');
  if(qBtn)qBtn.className='mode-pill '+(mode==='quick'?'active':'inactive');
  if(fBtn)fBtn.className='mode-pill '+(mode==='full'?'active':'inactive');
  if(hint)hint.textContent=mode==='quick'?'快速模式：只填必要欄位':'完整模式：填寫所有欄位';
}

// ── Export / Import ───────────────────────────────

function renderWF(){
  g('wfList').innerHTML=wfSteps.map(function(s,i){
    return '<div class="wf-step"><input type="checkbox" class="wf-chk"'+(s.done?' checked':'')+' onchange="wfSteps['+i+'].done=this.checked">'
      +'<span class="wf-stxt'+(s.done?' ck':'')+'">'+esc(s.text)+'</span>'
      +'<button class="wf-sdel" onclick="wfSteps.splice('+i+',1);renderWF()">&#215;</button></div>';
  }).join('');
}

function addWfStep(){
  var inp=g('wfInput'),text=inp?inp.value.trim():'';if(!text)return;
  wfSteps.push({text:text,done:false});if(inp)inp.value='';renderWF();
}

function loadSop(){
  var t=g('fTemplate').value,sop=tpl.sop[t]||[];
  if(!sop.length){toast('此例稿尚未設定 SOP 步驟');return;}
  if(wfSteps.length&&!confirm('套用 SOP 將覆蓋目前步驟，確定嗎？'))return;
  wfSteps=sop.map(function(s){return{text:s,done:false};});renderWF();toast('已套用例稿 SOP');
}

// ── setDocMode ────────────────────────────────────

function saveWfToSop(){
  var tplName=g('fTemplate')?g('fTemplate').value:'';
  if(!tplName){toast('請先選擇例稿分類');return;}
  if(!wfSteps.length){toast('目前沒有 Workflow 步驟');return;}
  if(!confirm('將目前 '+wfSteps.length+' 個步驟存回「'+tplName+'」SOP？（覆蓋原有）'))return;
  if(!tpl.sop)tpl.sop={};
  tpl.sop[tplName]=wfSteps.map(function(s){return s.text;});
  saveTpl();toast('已存回「'+tplName+'」SOP');
}

// ── 例稿筆記搜尋 ──────────────────────────────────

function showLogForm(type){
  logFormType=type;
  var form=g('logForm'),fields=g('logFormFields');
  if(!form||!fields)return;
  var html='';
  if(type==='note'){
    html='<div class="lf-row"><label>日期</label><input type="date" id="lfDate" value="'+today()+'"/></div>'
       +'<div class="lf-row"><label>內容</label></div>'
       +'<div class="lf-row"><textarea id="lfText" placeholder="記錄辦理過程、通話摘要、會議重點…" style="width:100%"></textarea></div>';
  }else if(type==='followup'){
    html='<div class="lf-row"><label>日期</label><input type="date" id="lfDate" value="'+today()+'"/></div>'
       +'<div class="lf-row"><label>等待對象</label><input id="lfWho" placeholder="教育部王科長、立院辦公室…"/></div>'
       +'<div class="lf-row"><label>等待事項</label><input id="lfText" placeholder="等回函、等核准、等資料…"/></div>'
       +'<div class="lf-row"><label>追蹤日</label><input type="date" id="lfFollowDate"/></div>';
  }else if(type==='milestone'){
    html='<div class="lf-row"><label>日期</label><input type="date" id="lfDate" value="'+today()+'"/></div>'
       +'<div class="lf-row"><label>里程碑</label><input id="lfText" placeholder="已陳核、已發文、已結案…"/></div>';
  }
  fields.innerHTML=html;
  form.classList.add('show');
  var firstInput=form.querySelector('input:not([type="date"]),textarea');
  if(firstInput)setTimeout(function(){firstInput.focus();},50);
}

function cancelLogForm(){
  var form=g('logForm');
  if(form)form.classList.remove('show');
  logFormType=null;
}

function submitLogEntry(){
  if(!logFormType)return;
  var date=g('lfDate')?g('lfDate').value:today();
  var text=(g('lfText')?g('lfText').value.trim():'');
  if(!text){toast('請填寫內容');return;}
  var entry={id:Date.now(),date:date,type:logFormType,text:text,done:false};
  if(logFormType==='followup'){
    entry.who=g('lfWho')?g('lfWho').value.trim():'';
    entry.followDate=g('lfFollowDate')?g('lfFollowDate').value:'';
  }
  logState.push(entry);
  if(editId){var d=docs.find(function(x){return x.id===editId;});if(d){d.log=logState.map(function(e){return Object.assign({},e);});save();}}
  cancelLogForm();
  renderLogList();
  toast('已新增'+({note:'紀錄',followup:'待跟進',milestone:'里程碑'}[logFormType]||'日誌')+'並自動儲存');
}

function renderLogList(){
  var el=g('logList'),cnt=g('logCount');
  if(!el)return;
  if(cnt)cnt.textContent=logState.length?logState.length+' 筆':'';
  if(!logState.length){el.innerHTML='<div style="color:var(--muted);font-size:12px;padding:6px 0">尚無日誌，點上方按鈕新增</div>';return;}
  var sorted=logState.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  el.innerHTML=sorted.map(function(e){
    var icon=e.type==='note'?'📝':e.type==='followup'?'⏸':'✅';
    var extra='';
    if(e.type==='followup'){
      var fdCls='ok';
      if(e.followDate&&!e.done){
        var diff=Math.ceil((new Date(e.followDate)-new Date(today()))/86400000);
        fdCls=diff<0?'overdue':diff<=3?'upcoming':'ok';
      }
      extra='<div class="log-followup">'
        +(e.who?'<span class="log-who">'+esc(e.who)+'</span>':'')
        +(e.followDate?'<span class="log-fdate '+fdCls+'">追蹤 '+esc(e.followDate)+'</span>':'')
        +(e.done?'<span class="log-done-badge">✓ 已完成</span>':'')
        +'</div>';
    }
    return '<div class="log-entry">'
      +'<span class="log-icon">'+icon+'</span>'
      +'<div class="log-body">'
        +'<div class="log-date">'+esc(e.date)+'</div>'
        +'<div class="log-text" style="'+(e.done?'opacity:.55;text-decoration:line-through':'')+'">'+esc(e.text)+'</div>'
        +extra
      +'</div>'
      +(e.type==='followup'?'<button class="log-del" onclick="toggleLogDone('+e.id+')" title="標記完成">'+( e.done?'↩':'✓')+'</button>':'')
      +'<button class="log-del" onclick="deleteLogEntry('+e.id+')">&#215;</button>'
      +'</div>';
  }).join('');
}

// ── 議題標籤（沿用）──────────────────────────────

function toggleLogDone(id){
  var e=logState.find(function(x){return x.id===id;});
  if(e)e.done=!e.done;
  renderLogList();
}

function deleteLogEntry(id){
  logState=logState.filter(function(x){return x.id!==id;});
  renderLogList();
}

function openQEdit(e,id){
  e.stopPropagation();qeditId=id;qeditLogType=null;
  var d=docs.find(function(x){return x.id===id;});if(!d)return;
  normalizeDoc(d);
  var pop=g('qeditPop'),ov=g('qeditOverlay');if(!pop||!ov)return;
  g('qeditTitle').textContent=d.title.slice(0,28)+(d.title.length>28?'…':'');
  g('qeditDue').value=d.due||'';g('qeditNext').value=d.next||'';
  var lf=g('qeditLogForm');if(lf)lf.classList.remove('show');
  var lt=g('qeditLogText');if(lt)lt.value='';
  var le=g('qeditLogExtra');if(le)le.innerHTML='';
  var rect=e.target.getBoundingClientRect();
  var top=rect.bottom+6,left=rect.left;
  if(top+320>window.innerHeight)top=Math.max(4,rect.top-326);
  if(left+290>window.innerWidth)left=Math.max(4,window.innerWidth-295);
  pop.style.top=top+'px';pop.style.left=left+'px';
  pop.classList.add('show');ov.classList.add('show');
}

function closeQEdit(){
  var pop=g('qeditPop'),ov=g('qeditOverlay');
  if(pop)pop.classList.remove('show');
  if(ov)ov.classList.remove('show');
  qeditId=null;qeditLogType=null;
}

function showQEditLog(type){
  qeditLogType=type;
  var form=g('qeditLogForm'),extra=g('qeditLogExtra'),inp=g('qeditLogText');
  if(!form||!extra||!inp)return;
  inp.placeholder={note:'紀錄內容',followup:'等待事項',milestone:'里程碑'}[type]||'內容…';
  inp.value='';
  extra.innerHTML=type==='followup'
    ?'<input class="qedit-log-inp" id="qeditWho" placeholder="等待對象…" style="margin-top:4px"/><input type="date" class="qedit-log-inp" id="qeditFollowDate" style="margin-top:4px"/>'
    :'';
  form.classList.add('show');
  setTimeout(function(){inp.focus();},50);
}

function saveQEdit(){
  if(!qeditId)return;
  var d=docs.find(function(x){return x.id===qeditId;});if(!d)return;
  normalizeDoc(d);
  d.due=g('qeditDue').value;
  d.next=(g('qeditNext')?g('qeditNext').value||'':'').trim();
  var logForm=g('qeditLogForm');
  if(logForm&&logForm.classList.contains('show')&&qeditLogType){
    var text=(g('qeditLogText')?g('qeditLogText').value||'':'').trim();
    if(text){
      var entry={id:Date.now(),date:today(),type:qeditLogType,text:text,done:false};
      if(qeditLogType==='followup'){
        entry.who=g('qeditWho')?g('qeditWho').value.trim():'';
        entry.followDate=g('qeditFollowDate')?g('qeditFollowDate').value:'';
      }
      d.log.push(entry);
    }
  }
  save();render();closeQEdit();
  toast('已更新：'+d.title.slice(0,15)+(d.title.length>15?'…':''));
}


// ── Workflow 存回 SOP ──────────────────────────────

function renderProjectPicker(cur){
  var box=g('projectChipbox'),cur2=g('pickerCurrent');
  if(!box)return;
  box.innerHTML=projectTags.length
    ?projectTags.map(function(pt){
      var on=pt===cur;
      return '<button class="project-chip'+(on?' on':'')+'" data-pid="'+esc(pt)+'" onclick="selectProject(\''+pt.replace(/'/g,"\\'")+'\')">'
        +esc(pt)+'</button>';
    }).join('')
    :'<div class="project-chip-empty">尚無議題標籤，輸入後新增</div>';
  if(cur2)cur2.textContent=cur||'無';
}

function selectProject(pt){
  document.querySelectorAll('#projectChipbox .project-chip').forEach(function(b){b.classList.toggle('on',b.dataset.pid===pt);});
  var cur=g('pickerCurrent');if(cur)cur.textContent=pt;
}

function clearProject(){
  document.querySelectorAll('#projectChipbox .project-chip').forEach(function(b){b.classList.remove('on');});
  var cur=g('pickerCurrent');if(cur)cur.textContent='無';
}

function addProjectTag(){
  var inp=g('newProjectInp'),val=inp?inp.value.trim():'';if(!val)return;
  if(projectTags.indexOf(val)<0){projectTags.push(val);saveProjectTags();}
  if(inp)inp.value='';
  renderProjectPicker(val);selectProject(val);
}

// ── Select / Filter ──────────────────────────────

function closeM(id){g(id).classList.remove('show');}

function currentProjectValue(){
  var chips=document.querySelectorAll('#projectChipbox .project-chip.on');
  return chips.length?chips[0].dataset.pid:'';
}

function toast(msg){
  var t=g('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show');},2300);
}

// ── startAddTplGlobal ─────────────────────────────
