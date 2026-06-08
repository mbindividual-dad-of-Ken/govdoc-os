// ── core.js ── 常數、資料結構、工具函式

var DCATS=['勞動檢查','青少年勞動','一般行政','行政訴訟','政策研析','其他'];
var DSRCS=['勞動部','立法院','地方政府','教育部','衛福部','事業單位','民眾陳情','內部交辦','跨司處會辦'];
var DTPLS={'勞動檢查':['勞檢處理原則稿','勞檢行政處分書','高風險行業稽查說明稿','勞動條件說明稿'],'青少年勞動':['童工/兒少勞動權益稿','建教合作查復稿','申訴/1955管道說明稿','青少年職場安全說明稿'],'一般行政':['一般函復說明稿','跨部會協作回復稿','地方政府權責說明稿','存查/不予處理說明稿'],'行政訴訟':['行政訴訟答辯狀','準備書狀','訴願答辯書'],'政策研析':['政策精進說明稿','法規疑義函復稿','會議資料標準包'],'其他':['轉請權責機關處理稿','待建立新例稿']};
var STS=[{id:'new',lb:'收文待判'},{id:'research',lb:'查核/蒐資'},{id:'draft',lb:'擬稿中'},{id:'consult',lb:'會辦中'},{id:'revise',lb:'退修/補正'},{id:'approve',lb:'陳核中'},{id:'ready',lb:'待發/待存'},{id:'done',lb:'結案/追蹤'}];
var TSS=['未分類','可套用','需微調','需新建','已迭代'];
var TSSCLASS=['s0','s1','s2','s3','s4'];
var COLORS=['#9b6a1a','#4a4598','#1d5c8a','#8a3020','#2d7060','#5f5e5a','#7a5a20','#3a6080'];
var SCHEMA_VERSION=1; // 資料結構版本，migrate 時參考
var K='govdoc-os-v3',GK='govdoc-os-gas-url',TK='govdoc-os-gas-token';
var DK='govdoc-os-tpl',CK='govdoc-os-cats',SK='govdoc-os-sources',PK='govdoc-os-tplmap',PTAG='govdoc-os-ptags';
// log 欄位整合在 docs 裡（d.log 陣列），不需要額外 key
var AK='govdoc-alert-dismissed',BK='govdoc-last-backup',BDK='govdoc-backup-dismissed';

var docs,tpl,cats,srcs,tplMap,editId=0,curView='kanban',wfSteps=[];
var vaultOpen,vaultOpenTpls,vaultTpl=null,vaultTab='note',dragId=null;
var projectTags=[],activeProjectId=null,logState=[],logFormType=null;
var docMode='quick',caseType='single'; // docMode: quick|full, caseType: single|project
var qeditId=null,qeditLogType=null;

function today(){return new Date().toISOString().slice(0,10);}

function addDays(n){var d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}

function esc(s){if(s==null)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function sampleDocs(){
  return [
    {id:1,title:'建教合作機構過往違反勞動法令紀錄查復案',docNo:'2026-001',source:'教育部',received:addDays(-3),due:addDays(2),cat:'青少年勞動',template:'建教合作查復稿',status:'research',templateState:'需微調',speed:'速件',owner:'我',waiting:'no',next:'補上近三年違規紀錄查詢結果。',link:'',note:'',steps:[{text:'調閱近三年違規紀錄',done:true},{text:'確認跨部會協作權責',done:false},{text:'撰擬函復初稿',done:false}]},
    {id:2,title:'兒少勞動權益小組工作小組會議資料彙整案',docNo:'2026-002',source:'內部交辦',received:addDays(-5),due:addDays(0),cat:'青少年勞動',template:'會議資料標準包',status:'draft',templateState:'需新建',speed:'速件',owner:'我',waiting:'no',next:'整理三部會分工與攻防稿。',link:'',note:'',steps:[{text:'議程草擬',done:true},{text:'攻防稿初稿',done:false}]},
    {id:3,title:'地方政府查處疑義函復案',docNo:'2026-003',source:'臺北市政府',received:addDays(-10),due:addDays(-1),cat:'一般行政',template:'地方政府權責說明稿',status:'revise',templateState:'需微調',speed:'普通件',owner:'我',waiting:'no',next:'依最新法規用語修正。',link:'',note:'',steps:[]},
    {id:4,title:'1955申訴管道兒少友善話務說明案',docNo:'2026-004',source:'跨司處會辦',received:addDays(-2),due:addDays(5),cat:'政策研析',template:'申訴/1955管道說明稿',status:'consult',templateState:'可套用',speed:'普通件',owner:'我',waiting:'yes',next:'等待相關單位確認話務訓練內容。',link:'',note:'',steps:[]},
    {id:5,title:'勞動條件專案檢查計畫第三季執行情形說明',docNo:'2026-005',source:'勞動部',received:addDays(-4),due:addDays(7),cat:'勞動檢查',template:'勞檢處理原則稿',status:'approve',templateState:'已迭代',speed:'普通件',owner:'我',waiting:'no',next:'等科長核閱後補新聞稿口徑。',link:'',note:'',steps:[{text:'初稿完成',done:true},{text:'補統計數據',done:true},{text:'陳核',done:true},{text:'發文',done:false}]},
    {id:6,title:'民眾陳情工讀生加班費疑義案',docNo:'2026-006',source:'民眾陳情',received:addDays(-1),due:addDays(9),cat:'勞動檢查',template:'勞動條件說明稿',status:'new',templateState:'可套用',speed:'普通件',owner:'我',waiting:'no',next:'確認陳情內容是否具體。',link:'',note:'',steps:[]}
  ];
}

function tplBase(key){return key.split('::')[0];}

function tplVariant(key){var p=key.indexOf('::');return p>=0?key.slice(p+2):null;}

function tplDisplayName(key){var v=tplVariant(key);return v?v:'（預設）';}

// 取某例稿名稱下所有已存在的 key（包含預設＋各樣態）

function variantKeysOf(base){
  var keys=[];
  // 預設 key
  if(tpl.notes[base]!==undefined||tpl.sop[base]!==undefined||tpl.changelog[base]!==undefined) keys.push(base);
  // 樣態 key
  Object.keys(tpl.notes||{}).concat(Object.keys(tpl.sop||{})).concat(Object.keys(tpl.changelog||{})).forEach(function(k){
    if(tplBase(k)===base&&k!==base&&keys.indexOf(k)<0) keys.push(k);
  });
  // 至少回傳預設
  if(!keys.length) keys.push(base);
  return keys;
}

function topState(t){
  var arr=docs.filter(function(d){return d.template===t;}).map(function(d){return d.templateState;});
  if(!arr.length)return'未分類';
  if(arr.indexOf('需新建')>=0)return'需新建';
  if(arr.indexOf('需微調')>=0)return'需微調';
  if(arr.indexOf('已迭代')>=0)return'已迭代';
  if(arr.indexOf('可套用')>=0)return'可套用';
  return'未分類';
}

function topTs2(base){
  var vkeys=variantKeysOf(base);
  var states=vkeys.map(vkTopState);
  if(states.indexOf('需新建')>=0)return '需新建';
  if(states.indexOf('需微調')>=0)return '需微調';
  // 從關聯案件取
  var docStates=docs.filter(function(d){return d.template===base;}).map(function(d){return d.templateState;});
  if(docStates.indexOf('需新建')>=0)return '需新建';
  if(docStates.indexOf('需微調')>=0)return '需微調';
  if(states.indexOf('已迭代')>=0||docStates.indexOf('已迭代')>=0)return '已迭代';
  if(states.indexOf('可套用')>=0||docStates.indexOf('可套用')>=0)return '可套用';
  return '未分類';
}

function vkTopState(key){
  var cl=(tpl.changelog&&tpl.changelog[key])||[];
  var note=(tpl.notes&&tpl.notes[key])||'';
  var sop=(tpl.sop&&tpl.sop[key])||[];
  var base=tplBase(key);
  var docStates=docs.filter(function(d){return d.template===base;}).map(function(d){return d.templateState;});
  if(docStates.indexOf('需新建')>=0)return '需新建';
  if(docStates.indexOf('需微調')>=0)return '需微調';
  if(cl.length>0)return '已迭代';
  if(sop.length>0||note.trim().length>0)return '可套用';
  return '未分類';
}

function tssClass(s){var i=TSS.indexOf(s);return i<0?'s0':TSSCLASS[i];}

function catColor(c){var i=cats.indexOf(c);return COLORS[i<0?COLORS.length-1:i%COLORS.length];}

function slb(id){var s=STS.find(function(x){return x.id===id;});return s?s.lb:id;}

function allTpls(){return Object.keys(tplMap||{});}

function isIncomplete(d){
  return !d.due || !d.cat || !d.template || !d.source;
}

function lightOf(d){
  if(d.status==='done')return{id:'gray',lb:'結案'};
  if(d.waiting==='yes')return{id:'blue',lb:'等回復'};
  if(!d.due)return{id:'green',lb:'正常'};
  var diff=Math.ceil((new Date(d.due)-new Date(today()))/86400000);
  if(diff<0)return{id:'red',lb:'逾期'+Math.abs(diff)+'日'};
  if(diff===0)return{id:'orange',lb:'今日到期'};
  if(diff<=3)return{id:'yellow',lb:diff+'日後'};
  return{id:'green',lb:diff+'日後'};
}

function autoDocNo(){
  var yr=new Date().getFullYear();
  var nums=docs.map(function(d){return String(d.docNo||'');})
    .filter(function(n){return n.startsWith(yr+'-');})
    .map(function(n){return parseInt(n.split('-')[1]||0,10);})
    .filter(function(n){return !isNaN(n);});
  var next=nums.length?Math.max.apply(null,nums)+1:1;
  return yr+'-'+('00'+next).slice(-3);
}

// ── Save / Delete / Brief ─────────────────────────

function filtered(){
  var q=(g('search').value||'').trim();
  var cf=g('catFilter').value,tf=g('tplFilter').value,sf=g('statusFilter').value,lf=g('lightFilter').value;
  return docs.filter(function(d){
    var hay=[d.title,d.docNo,d.source,d.cat,d.template,d.next,d.note,d.owner].join(' ');
    var l=lightOf(d),iter=TSS.indexOf(d.templateState)>=2&&TSS.indexOf(d.templateState)<=3;
    return(!q||hay.indexOf(q)>=0)&&(cf==='all'||d.cat===cf)&&(tf==='all'||d.template===tf)&&(sf==='all'||d.status===sf)&&(lf==='all'||(lf==='iterate'?iter:l.id===lf));
  });
}

function filterStat(k){
  var lf=g('lightFilter'),sf=g('statusFilter');
  if(k==='all'){lf.value='all';sf.value='all';}else if(k==='iterate')lf.value='iterate';else lf.value=k;
  render();
}

function countBy(arr,fn){var m={};arr.forEach(function(x){var k=fn(x)||'未填';m[k]=(m[k]||0)+1;});return Object.keys(m).map(function(k){return[k,m[k]];}).sort(function(a,b){return b[1]-a[1];});}

function spCls(sp){if(sp==='最速件')return 'x-fastest';if(sp==='速件')return 'x-fast';return 'x-normal';}

function pri(d){var l=lightOf(d).id;var p={red:0,orange:1,yellow:3,green:6,blue:8,gray:9}[l]||7;if(d.speed==='最速件')p-=2;else if(d.speed==='速件')p-=1;return p;}

function load(){
  try{docs=JSON.parse(localStorage.getItem(K))||null;}catch(e){docs=null;}
  if(!docs||docs.length===0)docs=sampleDocs().map(function(d){d._isSample=true;return d;});
  try{tpl=JSON.parse(localStorage.getItem(DK))||null;}catch(e){tpl=null;}
  if(!tpl)tpl={notes:{},sop:{},changelog:{}};
  try{cats=JSON.parse(localStorage.getItem(CK))||null;}catch(e){cats=null;}
  if(!cats)cats=DCATS.slice();
  try{srcs=JSON.parse(localStorage.getItem(SK))||null;}catch(e){srcs=null;}
  if(!srcs)srcs=DSRCS.slice();
  try{tplMap=JSON.parse(localStorage.getItem(PK))||null;}catch(e){tplMap=null;}
  if(!tplMap||Object.keys(tplMap).length===0){
    // 清除 localStorage 裡的舊空值，確保 migrate 後能存入
    localStorage.removeItem(PK);
    // migrate 從 DTPLS 常數建立初始 tplMap
    tplMap={};
    Object.keys(DTPLS).forEach(function(cat){
      (DTPLS[cat]||[]).forEach(function(t){
        if(!tplMap[t])tplMap[t]=[];
        if(tplMap[t].indexOf(cat)<0)tplMap[t].push(cat);
      });
    });
  }
  try{projectTags=JSON.parse(localStorage.getItem(PTAG)||'null')||[];}catch(e){projectTags=[];}
  vaultOpen=new Set(cats.slice(0,2));vaultOpenTpls=new Set();
}

function save(){localStorage.setItem(K,JSON.stringify(docs));}

function saveTpl(){localStorage.setItem(DK,JSON.stringify(tpl));}

function saveCats(){localStorage.setItem(CK,JSON.stringify(cats));}

function saveSrcs(){localStorage.setItem(SK,JSON.stringify(srcs));}

function saveTplMap(){localStorage.setItem(PK,JSON.stringify(tplMap));}

function saveProjectTags(){localStorage.setItem(PTAG,JSON.stringify(projectTags));}

function normalizeDoc(d){
  // migrate 舊 gtd 結構 → log
  if(d.gtd&&typeof d.gtd==='object'&&!d.log){
    d.log=[];
    ((d.gtd&&d.gtd.next)||[]).forEach(function(x){if(x&&x.text)d.log.push({id:Date.now()+Math.random(),date:today(),type:'note',text:'[Next Action] '+x.text,done:!!x.done});});
    ((d.gtd&&d.gtd.waiting)||[]).forEach(function(x){if(x&&x.text)d.log.push({id:Date.now()+Math.random(),date:today(),type:'followup',text:x.text,who:x.who||'',followDate:x.followDate||'',done:!!x.done});});
    delete d.gtd;
  }
  if(!Array.isArray(d.log))d.log=[];
  if(!d.caseType)d.caseType=d.projectId?'project':'single';
  if(!d.meta)d.meta={}; // 保留擴充欄位
  if(!d.statusChangedAt)d.statusChangedAt=d.received||today(); // 狀態變更日
  d._sv=SCHEMA_VERSION; // 版本標記
}
// 向後相容別名

function normalizeGtd(d){normalizeDoc(d);}

function isDataSafe(){
  // 空資料
  if(!docs||docs.length===0)return false;
  // 全是範例資料
  var realDocs=docs.filter(function(d){return !d._isSample;});
  if(realDocs.length===0)return false;
  return true;
}

function isDataSuspicious(){
  // 件數明顯偏少（可能是重開機後空載入）
  if(!docs||docs.length===0)return true;
  var realDocs=docs.filter(function(d){return !d._isSample;});
  return realDocs.length===0;
}

function daysInStatus(d){
  var from=d.statusChangedAt||d.received||today();
  return Math.floor((new Date(today())-new Date(from))/86400000);
}

function isStuck(d){
  if(d.status==='done')return false;
  var days=daysInStatus(d);
  var limits={new:3,research:5,draft:7,consult:7,revise:5,approve:5,ready:3};
  var limit=limits[d.status]||7;
  return days>limit;
}

function g(id){return document.getElementById(id);}
