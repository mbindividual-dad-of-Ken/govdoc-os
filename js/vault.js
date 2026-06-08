// ── vault.js ── 公文承辦 OS

function renderTemplates(){
  var root=g('templatesView');
  if(!root.querySelector('.vault')){
    root.innerHTML='<div class="vault"><div class="vsb"><div class="vsb-hd" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>例稿知識庫</span><button class="small-btn pri" style="font-size:10px;padding:3px 8px" onclick="startAddTplGlobal()">＋ 新增</button></div><div class=\"tpl-search-bar\"><input id=\"tplSearchInp\" placeholder=\"&#128269; 搜尋筆記…\" oninput=\"renderTplSearch()\"/></div><div id=\"tplSearchResults\"></div><div id=\"vaultTree\"></div></div><div class="vmain" id="vaultMain"><div class="vempty"><div><div style="font-size:32px;margin-bottom:8px">&#128194;</div><div>點選左側例稿開始編輯</div><div style="font-size:11px;margin-top:4px">支援 Markdown・[[雙向連結]]・SOP・迭代紀錄</div></div></div></div></div>';
  }
  renderVTree();
}


// ── Vault helpers ──
// key 格式：「例稿名稱」或「例稿名稱::樣態名稱」

function renderVTree(){
  var tree=g('vaultTree');if(!tree)return;
  tree.innerHTML=cats.map(function(cat){
    var color=catColor(cat),isOpen=vaultOpen.has(cat);
    // 此類別下的例稿
    var tpls=Object.keys(tplMap||{}).filter(function(t){return(tplMap[t]||[]).indexOf(cat)>=0;});
    var cs=cat.replace(/'/g,"\'");

    var files=tpls.map(function(base){
      var vkeys=variantKeysOf(base);
      var bIsOpen=vaultOpenTpls.has(base);
      var topTsc=tssClass(topTs2(base));
      var bs=base.replace(/'/g,"\'");

      var variantRows=vkeys.map(function(vk){
        var vn=tplDisplayName(vk),vtsc=tssClass(vkTopState(vk));
        var ia=vaultTpl===vk;
        var vks=vk.replace(/'/g,"\'");
        return '<button class="vfilebtn'+(ia?' on':'')+'" onclick="openVF(\''+vks+'\')">'  
          +'<div class="vdot '+vtsc+'"></div>'
          +'<span style="overflow:hidden;text-overflow:ellipsis">'+esc(vn)+'</span>'
          +'</button>';
      }).join('');

      var variantAdd='<div style="padding:2px 14px 4px 32px">'
        +'<button class="small-btn" style="font-size:10px;padding:2px 8px" onclick="startAddVariant(\''+bs+'\')">＋ 新增樣態</button>'
        +'</div>';

      var nameBtn='<div style="display:flex;align-items:center">'
        +'<button class="vfbtn'+(bIsOpen?' open':'')+'" style="flex:1;min-width:0" onclick="togTpl(\''+bs+'\')">'
          +'<span class="vfarr'+(bIsOpen?' open':'')+'">&#9654;</span>'
          +'<div class="vdot '+topTsc+'"></div>'
          +'<span style="flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(base)+'</span>'
          +'<span style="font-size:10px;color:var(--muted);flex-shrink:0">'+vkeys.length+'</span>'
        +'</button>'
        +'<button style="border:none;background:none;color:var(--muted);cursor:pointer;padding:0 8px;font-size:13px;flex-shrink:0" onclick="delTplName(\''+bs+'\',\''+cs+'\')" title="從此類別移除">&#215;</button>'
        +'</div>';

      return '<div style="margin-bottom:1px">'
        +nameBtn
        +'<div class="vflist'+(bIsOpen?' open':'')+'">'+variantRows+variantAdd+'</div>'
        +'</div>';
    }).join('');

    // 新增例稿按鈕
    var addTplBtn='<div style="padding:4px 14px 6px">'
      +'<button class="small-btn" style="font-size:10px;padding:2px 8px;width:100%" onclick="startAddTpl(\''+cs+'\')">＋ 新增例稿</button>'
      +'</div>';

    return '<div>'
      +'<button class="vfbtn'+(isOpen?' open':'')+'" onclick="togF(\''+cs+'\')">'
        +'<span class="vfarr'+(isOpen?' open':'')+'">&#9654;</span>'
        +'<div class="vfclr" style="background:'+color+'"></div>'
        +'<span style="flex:1">'+esc(cat)+'</span>'
        +'<span style="font-size:10px;color:var(--muted)">'+tpls.length+'</span>'
      +'</button>'
      +'<div class="vflist'+(isOpen?' open':'')+'">'
        +files
        +addTplBtn
      +'</div>'
      +'</div>';
  }).join('');
}

// 例稿整體狀態（取各 variant 中最嚴重的）

function togF(cat){if(vaultOpen.has(cat))vaultOpen.delete(cat);else vaultOpen.add(cat);renderVTree();}

function togTpl(base){if(vaultOpenTpls.has(base))vaultOpenTpls.delete(base);else{vaultOpenTpls.add(base);}renderVTree();}

function openVF(key){
  vaultTpl=key;
  var base=tplBase(key);
  vaultOpenTpls.add(base);
  // 確保業務類別展開
  cats.forEach(function(cat){if((DTPLS[cat]||[]).indexOf(base)>=0)vaultOpen.add(cat);});
  renderVTree();
  renderVMain(key);
}

function startAddVariant(base){
  var name=prompt('輸入新樣態名稱（例如：一般查復版、申訴案版）：');
  if(!name||!name.trim())return;
  name=name.trim();
  var newKey=base+'::'+name;
  // 確保三個欄位都有 key（即使是空值）
  if(!tpl.notes[newKey])tpl.notes[newKey]='';
  if(!tpl.sop[newKey])tpl.sop[newKey]=[];
  if(!tpl.changelog[newKey])tpl.changelog[newKey]=[];
  saveTpl();
  vaultOpenTpls.add(base);
  openVF(newKey);
  toast('已建立樣態：'+name);
}

function startAddTpl(cat){
  var name=prompt('輸入新例稿名稱：');
  if(!name||!name.trim())return;
  name=name.trim();
  if(!tplMap[name])tplMap[name]=[];
  if(tplMap[name].indexOf(cat)<0)tplMap[name].push(cat);
  saveTplMap();
  vaultOpen.add(cat);
  vaultOpenTpls.add(name);
  buildSel();renderVTree();
  openVF(name);
  toast('已新增例稿：'+name);
}

function startAddTplGlobal(){
  var name=prompt('輸入新例稿名稱：');
  if(!name||!name.trim())return;
  name=name.trim();
  var cat=cats[0];
  if(!tplMap[name])tplMap[name]=[];
  if(tplMap[name].indexOf(cat)<0)tplMap[name].push(cat);
  saveTplMap();vaultOpenTpls.add(name);vaultOpen.add(cat);
  buildSel();renderVTree();openVF(name);toast('已新增例稿：'+name);
}

load();
docs.forEach(normalizeDoc);
save();
buildSel();
if(localStorage.getItem(GK))dotS('ok');
setView('kanban');
checkAlerts();
checkBackup();

function delTplName(base,cat){
  // 從某個類別移除；若已無類別則整個刪除
  if(!tplMap[base])return;
  var cats2=tplMap[base];
  if(cats2.length<=1){
    if(!confirm('確定完全刪除例稿「'+base+'」？其所有樣態和筆記資料將一併刪除，且無法復原。'))return;
    delete tplMap[base];
    // 清除 tplData 所有相關 key
    Object.keys(tpl.notes||{}).forEach(function(k){if(tplBase(k)===base)delete tpl.notes[k];});
    Object.keys(tpl.sop||{}).forEach(function(k){if(tplBase(k)===base)delete tpl.sop[k];});
    Object.keys(tpl.changelog||{}).forEach(function(k){if(tplBase(k)===base)delete tpl.changelog[k];});
    saveTpl();
    if(vaultTpl&&tplBase(vaultTpl)===base){vaultTpl=null;g('vaultMain').innerHTML='<div class="vempty"><div><div style="font-size:32px;margin-bottom:8px">&#128194;</div><div>例稿已刪除</div></div></div>';}
  }else{
    if(!confirm('從「'+cat+'」移除例稿「'+base+'」？（例稿仍存在於其他類別）'))return;
    tplMap[base]=cats2.filter(function(c){return c!==cat;});
  }
  saveTplMap();buildSel();renderVTree();toast('已移除');
}

function delVariant(key){
  if(!tplVariant(key)){toast('預設不可刪除');return;}
  if(!confirm('確定刪除樣態「'+tplDisplayName(key)+'」？此操作不可復原。'))return;
  delete tpl.notes[key];delete tpl.sop[key];delete tpl.changelog[key];
  saveTpl();vaultTpl=tplBase(key);renderVTree();renderVMain(tplBase(key));toast('已刪除樣態');
}

function renderVMain(key){
  var main=g('vaultMain');if(!main)return;
  var base=tplBase(key),vname=tplDisplayName(key);
  var used=docs.filter(function(d){return d.template===base;});
  var ts=vkTopState(key),tsc=tssClass(ts);
  var cl=tpl.changelog[key]||[],sop=tpl.sop[key]||[];
  var li=cl.length?cl[cl.length-1].date:'尚未迭代';
  var tabLabels={note:'筆記',preview:'預覽',sop:'SOP',log:'迭代紀錄',related:'關聯案件'};
  var ks=key.replace(/'/g,"\\'");
  var tabs=['note','preview','sop','log','related'].map(function(tb){
    return '<button class="vt2'+(vaultTab===tb?' on':'')+'" onclick="swVT(\''+tb+'\',\''+ks+'\')">'+tabLabels[tb]+'</button>';
  }).join('');
  // 標題：例稿名稱 > 樣態名稱
  var titleHtml=tplVariant(key)
    ?'<span style="color:var(--muted);font-size:13px">'+esc(base)+'</span><span style="color:var(--muted);margin:0 4px">›</span><span>'+esc(vname)+'</span>'
    :'<span>'+esc(base)+'</span>';
  // 刪除樣態按鈕（預設 key 不能刪）
  var delBtn=tplVariant(key)
    ?'<button class="small-btn" style="color:var(--red);border-color:#f0c8c4;font-size:10px" onclick="delVariant(\''+ks+'\')">刪除此樣態</button>'
    :'';
  main.innerHTML='<div class="vtbar"><div class="vtitle">'+titleHtml+'</div><span class="tpl-state '+tsc+'">'+esc(ts)+'</span>'+delBtn+'<div class="vtabs2">'+tabs+'</div></div>'
    +'<div class="vbody">'
      +'<div class="fm">'
        +'<div class="fmi"><div class="fml">關聯案件</div><div>'+used.length+' 件（例稿）</div></div>'
        +'<div class="fmi"><div class="fml">SOP 步驟</div><div>'+sop.length+' 步</div></div>'
        +'<div class="fmi"><div class="fml">迭代版本</div><div>v'+cl.length+'</div></div>'
        +'<div class="fmi"><div class="fml">最後迭代</div><div>'+esc(li)+'</div></div>'
        +'<div class="fmi"><div class="fml">例稿狀態</div><div>'+esc(ts)+'</div></div>'
        +'<div class="fmi"><div class="fml">樣態</div><div>'+esc(vname)+'</div></div>'
      +'</div>'
      +'<div id="vtc"></div>'
    +'</div>';
  renderVTC(key);
}

function swVT(tb,key){vaultTab=tb;renderVMain(key);}

function renderVTC(key){
  var el=g('vtc');if(!el)return;
  var sop=tpl.sop[key]||[],cl=tpl.changelog[key]||[],note=tpl.notes[key]||'';
  var ks=key.replace(/'/g,"\\'");
  if(vaultTab==='note'){
    el.innerHTML='<textarea class="veditor" id="ved" placeholder="使用 Markdown 記錄…&#10;支援 [[例稿名稱]] 語法&#10;&#10;## 適用情境&#10;## 常用法規依據&#10;## 標準段落">'+esc(note)+'</textarea>'
      +'<div class="veacts">'
        +'<button class="small-btn pri" onclick="svNote(\''+ks+'\')">儲存</button>'
        +'<button class="small-btn" onclick="swVT(\'preview\',\''+ks+'\')">預覽</button>'
        +'<button class="small-btn" onclick="cpNote(\''+ks+'\')">複製</button>'
        +'<button class="small-btn" onclick="ftTpl(\''+ks+'\')">篩選案件</button>'
        +'<button class="small-btn" onclick="exMd(\''+ks+'\')">匯出 .md</button>'
      +'</div>';
  }else if(vaultTab==='preview'){
    el.innerHTML='<div class="mdp">'+renderMd(note,key)+'</div><div style="margin-top:12px"><button class="small-btn" onclick="swVT(\'note\',\''+ks+'\')">&#8592; 返回編輯</button></div>';
  }else if(vaultTab==='sop'){
    var sh=sop.map(function(s,i){
      return '<div class="sop-step"><div class="sopnum">'+(i+1)+'</div><div class="soptext">'+esc(s)+'</div><button class="sopdel" onclick="dSop(\''+ks+'\','+i+')">&#215;</button></div>';
    }).join('');
    el.innerHTML=(sh||'<div style="color:var(--muted);font-size:12px;padding:8px 0">尚未設定 SOP 步驟</div>')
      +'<div class="add-row"><input id="sopInp" placeholder="新增步驟…" onkeydown="if(event.key===\'Enter\')aSop(\''+ks+'\')"/><button class="small-btn pri" onclick="aSop(\''+ks+'\')">＋</button></div>';
  }else if(vaultTab==='log'){
    var lh=cl.length?cl.map(function(e){return '<div class="cle"><span class="clv">'+esc(e.ver)+'</span>'+esc(e.date)+'｜'+esc(e.note)+'</div>';}).join(''):'<div style="color:var(--muted);font-size:12px">尚無迭代紀錄</div>';
    el.innerHTML='<div class="cl">'+lh+'</div><div class="add-row" style="margin-top:10px"><input id="logInp" placeholder="本次修改摘要…"/><button class="small-btn pri" onclick="aLog(\''+ks+'\')">＋ 記錄</button></div>';
  }else if(vaultTab==='related'){
    var base=tplBase(key);
    var rel=docs.filter(function(d){return d.template===base;});
    el.innerHTML=rel.length?rel.map(function(d){
      var l=lightOf(d),color=catColor(d.cat||'');
      return '<div class="rdoc" onclick="openDoc('+d.id+')">'
        +'<span class="lt '+l.id+'">'+l.lb+'</span>'
        +'<div class="rdoc-t">'+esc(d.title)+'</div>'
        +'<span class="ctag" style="background:'+color+'18;color:'+color+'">'+esc(d.cat||'')+'</span>'
        +'<span style="font-size:10px;color:var(--muted)">'+esc(d.due||'')+'</span>'
        +'</div>';
    }).join(''):'<div style="color:var(--muted);font-size:12px;padding:8px 0">尚無使用此例稿的案件</div>';
  }
}

function renderMd(md,cur){
  if(!md)return '<span style="color:var(--muted)">尚無內容，切換到「筆記」分頁開始撰寫。</span>';
  var h=md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  h=h.replace(/\[\[([^\]]+)\]\]/g,function(m,n){return '<a class="wikilink" onclick="openVF(\''+n.replace(/'/g,"\\'")+'\')">[['+n+']]</a>';});
  h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');
  h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
  h=h.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>').replace(/^---$/gm,'<hr>');
  h=h.replace(/^[-*] (.+)$/gm,'<li>$1</li>').replace(/(<li>[^]*?<\/li>)/g,'<ul>$1</ul>');
  h=h.split(/\n\n+/).map(function(b){if(/^<(h[1-3]|ul|ol|blockquote|hr)/.test(b.trim()))return b;return '<p>'+b.replace(/\n/g,'<br>')+'</p>';}).join('\n');
  return h;
}

function svNote(key){tpl.notes[key]=g('ved')?g('ved').value:'';saveTpl();toast('已儲存筆記');}

function cpNote(key){navigator.clipboard.writeText(tpl.notes[key]||'').then(function(){toast('已複製');});}

function ftTpl(key){g('tplFilter').value=tplBase(key);setView('list');}

function aSop(key){var inp=g('sopInp'),text=inp?inp.value.trim():'';if(!text)return;if(!tpl.sop[key])tpl.sop[key]=[];tpl.sop[key].push(text);saveTpl();if(inp)inp.value='';renderVTC(key);}

function dSop(key,i){if(!tpl.sop[key])return;tpl.sop[key].splice(i,1);saveTpl();renderVTC(key);}

function aLog(key){var inp=g('logInp'),note=inp?inp.value.trim():'';if(!note)return;if(!tpl.changelog[key])tpl.changelog[key]=[];var ver='v'+(tpl.changelog[key].length+1);tpl.changelog[key].push({ver:ver,date:today(),note:note});saveTpl();if(inp)inp.value='';renderVTC(key);toast('已記錄迭代紀錄');}

function exMd(key){
  var base=tplBase(key),vname=tplDisplayName(key);
  var sop=tpl.sop[key]||[],cl=tpl.changelog[key]||[],note=tpl.notes[key]||'';
  var used=docs.filter(function(d){return d.template===base;});
  var fm='---\ntitle: '+base+(vname!=='（預設）'?'\nvariant: '+vname:'')+'\nstate: '+vkTopState(key)+'\nused: '+used.length+'\nexported: '+today()+'\n---\n\n';
  var ss=sop.length?'\n\n## SOP 步驟\n'+sop.map(function(s,i){return(i+1)+'. '+s;}).join('\n'):'';
  var ls=cl.length?'\n\n## 迭代紀錄\n'+cl.map(function(e){return '- **'+e.ver+'** '+e.date+'｜'+e.note;}).join('\n'):'';
  var full=fm+note+ss+ls;
  var fname=base+(vname!=='（預設）'?'_'+vname:'')+'.md';
  var url=URL.createObjectURL(new Blob([full],{type:'text/markdown;charset=utf-8'}));
  var a=document.createElement('a');a.href=url;a.download=fname;document.body.appendChild(a);a.click();setTimeout(function(){a.remove();URL.revokeObjectURL(url);},200);toast('已匯出 .md');
}

function searchTplNotes(q){
  if(!q||!q.trim())return [];
  q=q.trim().toLowerCase();
  var results=[];
  Object.keys(tpl.notes||{}).forEach(function(key){
    var note=tpl.notes[key]||'';
    if(note.toLowerCase().indexOf(q)>=0){
      var idx=note.toLowerCase().indexOf(q);
      var snippet=note.slice(Math.max(0,idx-25),idx+55).replace(/[\n\r]/g,' ');
      results.push({key:key,base:tplBase(key),variant:tplVariant(key),snippet:snippet});
    }
  });
  return results;
}

function renderTplSearch(){
  var q=g('tplSearchInp')?g('tplSearchInp').value:'';
  var el=g('tplSearchResults');if(!el)return;
  var res=searchTplNotes(q);
  if(!q.trim()){el.innerHTML='';return;}
  if(!res.length){el.innerHTML='<div style="color:var(--muted);font-size:12px;padding:6px 2px">找不到相關筆記</div>';return;}
  el.innerHTML=res.map(function(r){
    var ks=r.key.replace(/'/g,"\\'");
    return '<div class="rdoc" onclick="openVF(\''+ks+'\')">'  
      +'<div class="rdoc-t"><strong>'+esc(r.base)+'</strong>'+(r.variant?'<span style="color:var(--muted);margin-left:4px;font-size:10px">'+esc(r.variant)+'</span>':'')+'</div>'
      +'<div style="font-size:11px;color:var(--sub);margin-top:2px">…'+esc(r.snippet)+'…</div>'
      +'</div>';
  }).join('');
}

// ── 今日行動清單 ──────────────────────────────────
