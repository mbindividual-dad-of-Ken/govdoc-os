// ── sync.js ── 公文承辦 OS

function dotS(s){
  var d=g('syncDot');
  d.className='sdot'+(s==='ok'?' ok':s==='err'?' err':s==='ing'?' ing':'');
}

async function syncPush(){
  var url=localStorage.getItem(GK);if(!url){openSetup();return;}
  // 第一層：空資料或全範例資料，禁止推送
  if(!isDataSafe()){
    toast('⚠ 本機資料是空的或全為範例資料，請先「☁ 讀取」再同步！');
    dotS('err');
    g('syncSt').textContent='⚠ 禁止推送：本機資料不安全，請先讀取雲端資料';
    return;
  }
  // 第二層：件數比較警告（先查雲端件數）
  if(!confirm('將本機 '+docs.length+' 件公文推送至 Google Sheet？\n\n⚠ 推送將覆蓋雲端資料（推送前會自動備份）'))return;
  dotS('ing');g('syncSt').textContent='同步中…';
  try{
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},
      body:JSON.stringify({action:'push',token:localStorage.getItem(TK)||'',data:docs,tplData:tpl,projectTags:projectTags,tplMap:tplMap})});
    var j=await r.json();
    if(j.ok){dotS('ok');g('syncSt').textContent='已同步至雲端 · '+new Date().toLocaleTimeString();toast('雲端同步完成');markBK();}
    else{dotS('err');toast('同步失敗：'+(j.error||'未知'));}
  }catch(e){dotS('err');toast('連線失敗');}
}

async function syncPull(){
  var url=localStorage.getItem(GK);if(!url){openSetup();return;}
  if(!confirm('從 Google Sheet 讀取並覆蓋本機資料？'))return;
  dotS('ing');g('syncSt').textContent='讀取中…';
  try{
    var u=new URL(url);u.searchParams.set('action','pull');u.searchParams.set('token',localStorage.getItem(TK)||'');
    var r=await fetch(u.toString()),j=await r.json();
    if(j.ok&&Array.isArray(j.data)){
      docs=j.data;docs.forEach(normalizeDoc);save();
      if(j.tplData){tpl=j.tplData;saveTpl();}
      if(j.projectTags&&Array.isArray(j.projectTags)){projectTags=j.projectTags;saveProjectTags();}
      if(j.tplMap&&typeof j.tplMap==='object'&&Object.keys(j.tplMap).length>0){tplMap=j.tplMap;saveTplMap();}
      dotS('ok');g('syncSt').textContent='已讀取雲端資料 · '+new Date().toLocaleTimeString();
      toast('已讀取 '+docs.length+' 筆公文');render();
      // 讀取後自動檢查資料安全性
      updateSyncSafetyUI();
    }else{dotS('err');toast('讀取失敗：'+(j.error||'格式不符'));}
  }catch(e){dotS('err');toast('連線失敗');}
}

// ── Alerts / Backup ───────────────────────────────

function openSetup(){
  g('gasUrl').value=localStorage.getItem(GK)||'';
  g('gasToken').value=localStorage.getItem(TK)||'';
  g('gasTest').textContent='';
  renderCap();runDiag();
  g('setupBg').classList.add('show');
}

function saveSetup(){
  localStorage.setItem(GK,g('gasUrl').value.trim());
  localStorage.setItem(TK,g('gasToken').value.trim());
  dotS('ok');g('syncSt').textContent='已儲存同步設定';toast('設定已儲存');
}

async function testGas(){
  var url=g('gasUrl').value.trim(),tok=g('gasToken').value.trim();
  if(!url){toast('請先輸入 GAS URL');return;}
  g('gasTest').textContent='連線測試中…';
  try{
    var u=new URL(url);u.searchParams.set('action','ping');u.searchParams.set('token',tok);
    var r=await fetch(u.toString()),j=await r.json();
    g('gasTest').textContent=j.ok?'✅ 連線成功！':'❌ 格式異常：'+JSON.stringify(j);
  }catch(e){g('gasTest').textContent='❌ 連線失敗：'+e.message;}
}

// ── 健診 ─────────────────────────────────────────

function buildSel(){
  fillS('catFilter',cats,'全部業務類別');
  fillS('tplFilter',allTpls(),'全部例稿分類');
  fillS('statusFilter',STS.map(function(s){return{v:s.id,t:s.lb};}),'全部狀態');
  fillS('fCat',cats,null);
  fillS('fStatus',STS.map(function(s){return{v:s.id,t:s.lb};}),null);
  fillS('fTplState',TSS,null);
  updateTplOpts();
  updateSrcDL();
}

function fillS(id,arr,first){
  var el=g(id);if(!el)return;
  var cur=el.value;
  el.innerHTML=(first?'<option value="all">'+first+'</option>':'')+arr.map(function(x){
    return typeof x==='string'?'<option value="'+esc(x)+'">'+esc(x)+'</option>':'<option value="'+esc(x.v)+'">'+esc(x.t)+'</option>';
  }).join('');
  if(cur&&el.querySelector('option[value="'+cur+'"]'))el.value=cur;
  else if(first)el.value='all';
}

function updateTplOpts(){
  var cat=g('fCat')?g('fCat').value:cats[0];
  var tpls=Object.keys(tplMap||{}).filter(function(t){
    return cat==='all'||(tplMap[t]&&tplMap[t].indexOf(cat)>=0);
  });
  if(!tpls.length)tpls=Object.keys(tplMap||{});
  fillS('fTemplate',tpls,null);
}

function updateSrcDL(){
  var dl=g('srcList');if(!dl)return;
  dl.innerHTML=srcs.map(function(s){return'<option value="'+esc(s)+'">';}).join('');
}

// ── Setup / Cap ───────────────────────────────────

function renderCap(){
  g('capCats').innerHTML=cats.map(function(c,i){return'<div class="cap-tag">'+esc(c)+'<button onclick="rmCap(\'cat\','+i+')">&#215;</button></div>';}).join('');
  g('capSrcs').innerHTML=srcs.map(function(s,i){return'<div class="cap-tag">'+esc(s)+'<button onclick="rmCap(\'src\','+i+')">&#215;</button></div>';}).join('');
}

function addCap(type){
  var inp=g(type==='cat'?'newCatInp':'newSrcInp'),val=inp?inp.value.trim():'';
  if(!val)return;
  if(type==='cat'){if(cats.indexOf(val)<0){cats.push(val);saveCats();}}
  else{if(srcs.indexOf(val)<0){srcs.push(val);saveSrcs();}}
  if(inp)inp.value='';
  renderCap();buildSel();
}

function rmCap(type,i){
  if(type==='cat'){cats.splice(i,1);saveCats();}
  else{srcs.splice(i,1);saveSrcs();}
  renderCap();buildSel();
}

function runDiag(){
  var total=0;
  [K,DK,CK,SK,PK,PTAG,AK,BK,BDK].forEach(function(k){
    total+=new Blob([localStorage.getItem(k)||'']).size;
  });
  var pct=Math.min(100,Math.round(total/(5*1024*1024)*100));
  var fill=g('storageFill'),note=g('storageNote');
  if(fill){fill.style.width=pct+'%';fill.style.background=pct>80?'var(--red)':pct>50?'var(--orange)':'var(--primary)';}
  if(note)note.textContent='已用約 '+Math.round(total/1024)+'KB / 5MB（'+pct+'%）';
  var items=[];
  var incomplete=docs.filter(function(d){return isIncomplete(d)&&d.status!=='done';});
  items.push(incomplete.length===0
    ?{ok:true,title:'公文欄位完整',detail:'所有進行中案件均已填寫必要欄位'}
    :{ok:false,warn:true,title:'有 '+incomplete.length+' 件公文資料不完整',
      detail:incomplete.slice(0,3).map(function(d){return d.title.slice(0,15);}).join('、')+(incomplete.length>3?'…等':'')});
  var orphans=Object.keys(docs.reduce(function(m,d){if(d.template)m[d.template]=1;return m;},{}))
    .filter(function(t){return !tplMap[t];});
  items.push(orphans.length===0
    ?{ok:true,title:'例稿分類一致',detail:'所有公文使用的例稿均已建立於例稿庫'}
    :{ok:false,warn:true,title:'有 '+orphans.length+' 個例稿名稱未建立',detail:orphans.slice(0,4).join('、')});
  // 檢查範例資料殘留
  var sampleDocs2=docs.filter(function(d){return d._isSample;});
  if(sampleDocs2.length>0){
    items.push({ok:false,warn:true,title:'有 '+sampleDocs2.length+' 筆範例資料尚未刪除',
      detail:'請刪除這些假資料（標題：'+sampleDocs2.slice(0,2).map(function(d){return d.title.slice(0,10);}).join('、')+'…），避免影響健診結果'});
  }
  var last=localStorage.getItem(BK);
  if(!last)items.push({ok:false,warn:true,title:'從未備份',detail:'建議設定 GAS 同步或定期匯出 CSV'});
  else{var days=Math.floor((new Date(today())-new Date(last))/86400000);
    items.push(days<=3?{ok:true,title:'備份狀態良好',detail:'最後備份：'+last+'（'+days+' 天前）'}
      :{ok:false,warn:true,title:'距上次備份已 '+days+' 天',detail:'最後備份：'+last});}
  var el=g('diagList');if(!el)return;
  el.innerHTML=items.map(function(it){
    return '<div class="diag-item"><span class="diag-icon">'+(it.ok?'✅':it.warn?'⚠️':'❌')+'</span>'
      +'<div class="diag-body"><div class="diag-title '+(it.ok?'diag-ok':it.warn?'diag-warn':'diag-err')+'">'+it.title+'</div>'
      +'<div class="diag-detail">'+it.detail+'</div></div></div>';
  }).join('');
}

// ── Modal helpers ─────────────────────────────────

// ── 快速編輯 popover ──────────────────────────────
var qeditId=null,qeditLogType=null;


// ── 第三層：還原上次備份 ──────────────────────
async function syncRestore(){
  var url=localStorage.getItem(GK);if(!url){openSetup();return;}
  if(!confirm('從 GAS 還原上次備份的公文資料？\n（例稿庫和設定不受影響）\n\n注意：這會覆蓋本機和雲端目前的公文資料'))return;
  dotS('ing');g('syncSt').textContent='還原中…';
  try{
    var u=new URL(url);
    u.searchParams.set('action','restore');
    u.searchParams.set('token',localStorage.getItem(TK)||'');
    var r=await fetch(u.toString()),j=await r.json();
    if(j.ok&&Array.isArray(j.data)&&j.data.length>0){
      docs=j.data;docs.forEach(normalizeDoc);save();
      dotS('ok');
      g('syncSt').textContent='已還原備份 '+docs.length+' 筆公文 · '+new Date().toLocaleTimeString();
      toast('✅ 已還原備份（'+docs.length+' 件）');
      render();updateSyncSafetyUI();
    }else if(j.ok&&(!j.data||j.data.length===0)){
      dotS('err');toast('備份是空的，無法還原');
    }else{
      dotS('err');toast('還原失敗：'+(j.error||'未知'));
    }
  }catch(e){dotS('err');toast('連線失敗');}
}

// ── 同步安全 UI 更新 ─────────────────────────
function updateSyncSafetyUI(){
  var safe=isDataSafe();
  var pushBtn=document.querySelector('.sbtn.push');
  var banner=g('syncDangerBanner');
  if(pushBtn){
    pushBtn.style.opacity=safe?'1':'0.4';
    pushBtn.title=safe?'':'⚠ 本機資料不安全，請先讀取';
  }
  if(banner){
    banner.style.display=safe?'none':'flex';
  }
}

function checkAlerts(){
  var dis=[];try{dis=JSON.parse(localStorage.getItem(AK)||'[]');}catch(e){}
  var urg=docs.filter(function(d){
    if(d.status==='done')return false;
    if(dis.indexOf(String(d.id))>=0)return false;
    var l=lightOf(d);return l.id==='red'||l.id==='orange';
  });
  var banner=g('alertBanner');if(!urg.length){banner.classList.remove('show');return;}
  var late=urg.filter(function(d){return lightOf(d).id==='red';}).length;
  var tod=urg.filter(function(d){return lightOf(d).id==='orange';}).length;
  g('alertTitle').textContent='⚠ 到期提醒：逾期 '+late+' 件、今日到期 '+tod+' 件';
  g('alertList').innerHTML=urg.slice(0,6).map(function(d){
    var l=lightOf(d);
    return'<div class="ab-item" onclick="openDoc('+d.id+')">'
      +'<span class="ab-badge '+l.id+'">'+l.lb+'</span><span>'+esc(d.title)+'</span></div>';
  }).join('');
  banner.classList.add('show');
}

function dismissAlert(){
  var urg=docs.filter(function(d){if(d.status==='done')return false;var l=lightOf(d);return l.id==='red'||l.id==='orange';});
  var ids=[];try{ids=JSON.parse(localStorage.getItem(AK)||'[]');}catch(e){}
  urg.forEach(function(d){if(ids.indexOf(String(d.id))<0)ids.push(String(d.id));});
  localStorage.setItem(AK,JSON.stringify(ids));
  g('alertBanner').classList.remove('show');
}

function checkBackup(){
  var dis=localStorage.getItem(BDK)||'';if(dis===today())return;
  var last=localStorage.getItem(BK),hasGas=!!localStorage.getItem(GK);
  var banner=g('backupBanner'),msg=g('backupMsg');
  if(!last&&docs.length>0){
    msg.innerHTML='⚠ <b>資料從未備份</b>——localStorage 清除後將全部遺失。';
    banner.classList.add('show');return;
  }
  if(last){
    var days=Math.floor((new Date(today())-new Date(last))/86400000);
    if(days>=3){
      msg.innerHTML='📦 <b>距上次備份已 '+days+' 天</b>（'+last+'）——建議'+(hasGas?'同步雲端或匯出 CSV':'匯出 CSV');
      banner.classList.add('show');
    }
  }
}

function dismissBackup(){localStorage.setItem(BDK,today());g('backupBanner').classList.remove('show');}

function markBK(){localStorage.setItem(BK,today());g('backupBanner').classList.remove('show');localStorage.setItem(BDK,today());}

// ── Toast ─────────────────────────────────────────


// ── JSON 完整備份/還原 ────────────────────────
function exportJSON(){
  var backup={
    version: SCHEMA_VERSION,
    exportedAt: today(),
    docs: docs,
    tpl: tpl,
    cats: cats,
    srcs: srcs,
    tplMap: tplMap,
    projectTags: projectTags
  };
  var json=JSON.stringify(backup, null, 2);
  var url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
  var a=document.createElement('a');
  a.href=url;
  a.download='公文承辦OS_備份_'+today()+'.json';
  document.body.appendChild(a);a.click();
  setTimeout(function(){a.remove();URL.revokeObjectURL(url);},200);
  markBK();
  toast('✅ JSON 完整備份已匯出');
}

function importJSON(){
  var inp=document.createElement('input');
  inp.type='file';inp.accept='.json';
  inp.onchange=function(e){
    var file=e.target.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var backup=JSON.parse(ev.target.result);
        if(!backup.docs||!Array.isArray(backup.docs)){
          toast('❌ 格式錯誤：找不到公文資料');return;
        }
        if(!confirm('確定從備份還原？\n備份日期：'+( backup.exportedAt||'未知')+'\n公文數量：'+backup.docs.length+' 件\n\n這會覆蓋目前所有資料。'))return;
        docs=backup.docs;docs.forEach(normalizeDoc);save();
        if(backup.tpl){tpl=backup.tpl;saveTpl();}
        if(backup.cats&&backup.cats.length){cats=backup.cats;saveCats();}
        if(backup.srcs&&backup.srcs.length){srcs=backup.srcs;saveSrcs();}
        if(backup.tplMap&&Object.keys(backup.tplMap).length){tplMap=backup.tplMap;saveTplMap();}
        if(backup.projectTags&&backup.projectTags.length){projectTags=backup.projectTags;saveProjectTags();}
        buildSel();render();updateSyncSafetyUI();
        toast('✅ 已從 JSON 備份還原（'+docs.length+' 件公文）');
        markBK();
      }catch(err){toast('❌ 解析失敗：'+err.message);}
    };
    reader.readAsText(file,'UTF-8');
  };
  document.body.appendChild(inp);inp.click();
  setTimeout(function(){inp.remove();},1000);
}

function exportCSV(){
  var rows=[['主旨','案件類型','議題','文號','來文單位','收文日期','辦理期限','業務類別','例稿分類','例稿狀態','流程狀態','速別','承辦人','等回復','下一步','連結','備註','WF進度','待跟進筆數']];
  docs.forEach(function(d){
    normalizeDoc(d);
    var steps=d.steps||[],ds=steps.filter(function(s){return s.done;}).length;
    var followups=(d.log||[]).filter(function(e){return e.type==='followup'&&!e.done;}).length;
    rows.push([d.title,d.caseType||'single',d.projectId||'',d.docNo,d.source,d.received,d.due,d.cat,d.template,d.templateState,slb(d.status),d.speed,d.owner,d.waiting==='yes'?'是':'否',d.next,d.link,d.note,steps.length?ds+'/'+steps.length:'',followups]);
  });
  var csv='\ufeff'+rows.map(function(r){return r.map(function(v){return'"'+String(v==null?'':v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  var a=document.createElement('a');a.href=url;a.download='公文承辦OS_'+today()+'.csv';
  document.body.appendChild(a);a.click();
  setTimeout(function(){a.remove();URL.revokeObjectURL(url);},200);
  toast('CSV 已匯出');markBK();
}

function importSample(){
  if(!confirm('載入範例資料會覆蓋目前本機資料，確定嗎？'))return;
  docs=sampleDocs();
  docs.forEach(normalizeDoc);
  save();toast('已載入範例資料');render();
}

// ── GAS Sync ──────────────────────────────────────
