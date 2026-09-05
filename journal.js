/* Shared journal UI. Demonstrations are never passed to the persistence layer. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s),host=$('#growthList');
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const placeholder=()=>window.HER_PLACEHOLDER||'assets/macaron-garden-v03.png';
  const photo=i=>window.HER_SEED[i]||{name:'花园配图（演示）',mime:'image/png',data:placeholder()};
  const video={name:'照片动态演示 · 非真实录像',mime:'video/mp4',data:'assets/demo-journal.mp4'};
  const demos=[
    {id:'demo-arrival',type:'growth',date:'2026-03-08',title:'到家的第一个下午',weight:1.2,notes:'小小的鼻子先探了出来，接着是一只试探的爪子。\n\n我们把毯子铺在窗边，让新朋友自己慢慢熟悉房间。今天不用着急，先好好认识彼此。',media:[photo(4),photo(3)]},
    {id:'demo-sunshine',type:'growth',date:'2026-04-12',title:'找到最喜欢的阳光',weight:1.55,notes:'下午三点，阳光刚好落在那块小垫子上。\n\n吃完饭，她就把自己团成一个小圆圈。耳朵偶尔动一下，大概连梦也是软软的。\n\n今日小发现：最喜欢被轻轻摸下巴。',media:[photo(0),photo(5)]},
    {id:'demo-video',type:'growth',date:'2026-05-20',title:'把今天，录成一小段',weight:1.9,notes:'在这一页试试看视频手账。点右侧的播放键，就可以直接在书页里观看。\n\n这里的片段由静态照片缓慢推近制作，仅用于展示视频播放效果，并不是小猫的真实录像。你上传的真实视频也会出现在这个位置。',media:[video]},
    {id:'demo-everyday',type:'growth',date:'2026-06-16',title:'普通的一天，也很可爱',weight:2.15,notes:'今天没有什么大事。一起吃饭、玩了一会儿，窗外的树影晃来晃去。\n\n但这些普通的日常，慢慢变成了我们一起长大的故事。\n\n下次再翻开，就从新的一页开始吧。',media:[photo(1),photo(2)]}
  ];
  let config={records:[],pet:{name:'她'},filters:{type:'growth',ascending:true}},rows=[],index=0,mode='auto',opened=false,turning=false,midTimer,endTimer;
  host.className='journal-stage';
  host.innerHTML=`<div class="journal-topline"><span class="journal-kicker">THE LITTLE PAW JOURNAL</span><label>正在翻阅 <select id="bookMode"><option value="real">我的记录</option><option value="demo">演示手账</option></select></label></div>
  <p id="demoNotice" class="demo-notice" hidden>演示手账：日期、体重与故事均为模拟内容，不会写入你的真实记录或备份。</p>
  <div id="bookCoverStage" class="book-cover-stage"><button id="openBook" class="book-cover" aria-label="打开成长手账"><span class="cover-spine" aria-hidden="true"></span><span class="cover-title">成长手账<small>OUR GROWING DAYS</small></span><span class="cover-photo"><img id="bookCoverPhoto" alt="成长手账封面的宠物照片"></span><span class="cover-pet" id="bookPetName"></span><span class="cover-invitation">轻轻翻开 · 从这一页开始</span></button><p class="cover-shadow-caption" id="coverCount"></p></div>
  <div id="bookReader" class="book-reader" hidden><div class="reader-tools"><button id="closeBook" class="text-button">↶ 合上手账</button><span>左边写日常，右边贴照片。</span><button id="bookAdd" class="text-button">＋ 写新的一页</button></div>
  <div id="bookSpread" class="book-spread" role="group" aria-label="成长手账书页"><section id="bookLeft" class="paper-page paper-left"></section><section id="bookRight" class="paper-page paper-right"></section><div class="book-binding" aria-hidden="true"></div><div id="turnLeaf" class="turn-leaf" aria-hidden="true" inert hidden><div class="turn-front"></div><div class="turn-back"></div></div></div>
  <nav class="book-navigation" aria-label="手账翻页"><button id="previousPage" class="page-arrow" aria-label="上一条记录">← 上一页</button><span id="bookPageStatus" role="status" aria-live="polite"></span><button id="nextPage" class="page-arrow" aria-label="下一条记录">下一页 →</button></nav><p class="reader-hint">也可以用键盘 ← → 翻页 · 图片可点开，视频可直接播放</p></div>`;
  function isDemo(){return mode==='demo'||mode==='auto'&&!config.records.some(r=>r.type==='growth');}
  function pauseVideos(){host.querySelectorAll('video').forEach(v=>v.pause());}
  function cancelTurn(){clearTimeout(midTimer);clearTimeout(endTimer);turning=false;$('#turnLeaf').hidden=true;$('#turnLeaf').classList.remove('flipping-next','flipping-prev');$('#bookSpread').classList.remove('is-turning');}
  function computeRows(){return BookCore.select(isDemo()?demos:config.records,config.filters);}
  function pageContent(record,n,side){
    const content=el('div','paper-content');
    const header=el('div','paper-heading');header.append(el('span','',side==='left'?'小爪日记 / GROWING':'把日常贴在这里'),el('span','',isDemo()?'演示':'日常'));content.append(header);
    if(!record){content.append(el('span','paper-flourish','❦'),el('h2','','这一页，等你来写'),el('p','paper-notes',config.filters.month||config.filters.query?'这个筛选条件下还没有记录，试试清除筛选。':'选一天，贴一张照片，再写一点关于今天的小事。'));const add=el('button','button primary','＋ 写下第一条记录');add.onclick=()=>config.onAdd?.();content.append(add);return content;}
    if(side==='left'){
      const date=el('time','journal-date',record.date.replaceAll('-',' / '));date.dateTime=record.date;content.append(date,el('h2','journal-entry-title',record.title));
      if(record.weight!==null)content.append(el('span','journal-weight','今日体重  '+record.weight+' kg'));
      content.append(el('div','journal-rule','❧'),el('div','paper-notes',record.notes||'这一天的故事，先交给照片。'));
      const foot=el('div','entry-actions');if(isDemo())foot.append(el('span','demo-entry-note','模拟日期 / 体重 / 文字 · 仅展示效果'));else{const edit=el('button','text-button','展开 / 编辑这一页 ↗');edit.onclick=()=>config.onOpen?.(record.id);foot.append(edit);}content.append(foot);
    }else{
      const media=el('div','journal-media');if(!record.media.length){media.append(el('div','journal-no-photo','❦'),el('p','','今天先写文字，下次再贴照片。'));}
      record.media.forEach((m,i)=>{const figure=el('figure','journal-photo');
        if(m.mime.startsWith('video/')){figure.classList.add('journal-video');const v=el('video');v.src=m.data;v.controls=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-label',m.name);v.poster=photo(3).data;figure.append(v);v.addEventListener('error',()=>{caption.textContent='当前浏览器不支持此视频编码，可下载原文件。';});const a=el('a','video-download','下载原视频');a.href=m.data;a.download=m.name+'.mp4';figure.append(a);}
        else{const b=el('button','journal-image-button');b.setAttribute('aria-label','查看照片 '+(i+1));const img=el('img');img.src=m.data;img.alt=m.name;img.loading='lazy';b.append(img);b.onclick=()=>{pauseVideos();if(isDemo())config.onPreview?.(m,record.title);else config.onOpen?.(record.id);};figure.append(b);}
        const caption=el('figcaption','',m.mime.startsWith('video/')?isDemo()?'动态演示 · 非真实录像':'这一刻，动了起来':record.date+'  ·  '+String(i+1).padStart(2,'0'));figure.append(caption);media.append(figure);
      });content.append(media);
    }
    content.append(el('span','paper-number',String(n*2+(side==='left'?1:2)).padStart(2,'0')));return content;
  }
  function draw(){
    pauseVideos();$('#bookLeft').replaceChildren(pageContent(rows[index],index,'left'));$('#bookRight').replaceChildren(pageContent(rows[index],index,'right'));
    $('#bookPageStatus').textContent=rows.length?(isDemo()?'演示 · ':'')+'第 '+(index+1)+' / '+rows.length+' 条记录':'尚无记录';
    $('#previousPage').disabled=turning||index<=0;$('#nextPage').disabled=turning||index>=rows.length-1;$('#closeBook').disabled=turning;
    $('#bookSpread').dataset.recordId=rows[index]?.id||'';
  }
  function cover(){const p=config.pet;$('#bookCoverPhoto').src=p.avatar||window.HER_SEED[p.portraitIndex??3]?.data||placeholder();$('#bookCoverPhoto').alt=(p.name||'宠物')+'的成长手账照片';$('#bookPetName').textContent=(p.name||'小伙伴')+'的小日子';$('#coverCount').textContent=isDemo()?'已准备 '+rows.length+' 条演示记录 · 点击封面试试翻页':'已写下 '+rows.length+' 条成长记录';$('#demoNotice').hidden=!isDemo();$('#bookMode').value=isDemo()?'demo':'real';}
  function setOpen(value){cancelTurn();opened=value;$('#bookCoverStage').hidden=value;$('#bookReader').hidden=!value;if(value)draw();else pauseVideos();}
  function snapshot(side){const copy=$(side).firstElementChild.cloneNode(true);copy.querySelectorAll('video').forEach(v=>{const still=el('div','journal-video-still','▶');v.replaceWith(still);});copy.querySelectorAll('button,a').forEach(n=>n.tabIndex=-1);return copy;}
  function turn(delta){const target=index+delta;if(turning||target<0||target>=rows.length||!opened)return;pauseVideos();if(reduced()){index=target;draw();return;}
    turning=true;const leaf=$('#turnLeaf');leaf.classList.remove('flipping-next','flipping-prev');leaf.hidden=false;leaf.style.left=delta>0?'50%':'0';leaf.style.transformOrigin=delta>0?'left center':'right center';
    leaf.querySelector('.turn-front').replaceChildren(snapshot(delta>0?'#bookRight':'#bookLeft'));leaf.querySelector('.turn-back').replaceChildren(pageContent(rows[target],target,delta>0?'left':'right'));
    $('#bookSpread').classList.add('is-turning');$('#previousPage').disabled=true;$('#nextPage').disabled=true;$('#closeBook').disabled=true;
    void leaf.offsetWidth;leaf.classList.add(delta>0?'flipping-next':'flipping-prev');
    midTimer=setTimeout(()=>{index=target;draw();},330);endTimer=setTimeout(()=>{cancelTurn();draw();},680);
  }
  $('#openBook').onclick=()=>setOpen(true);$('#closeBook').onclick=()=>setOpen(false);$('#previousPage').onclick=()=>turn(-1);$('#nextPage').onclick=()=>turn(1);$('#bookAdd').onclick=()=>config.onAdd?.();
  $('#bookMode').onchange=()=>{cancelTurn();mode=$('#bookMode').value;index=0;rows=computeRows();cover();if(opened)draw();};
  document.addEventListener('keydown',e=>{if(!opened||$('#growthView').hidden||$('dialog[open]')||e.target.closest?.('input,textarea,select,video,[contenteditable="true"]'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseVideos();cancelTurn();if(opened)draw();}});
  window.PawJournal={
    update(next){const oldId=rows[index]?.id;cancelTurn();config=next;rows=computeRows();const found=rows.findIndex(r=>r.id===oldId);index=found<0?0:found;cover();if(opened)draw();},
    close(){setOpen(false);},deactivate(){pauseVideos();cancelTurn();},
    reveal(id){mode='real';rows=computeRows();index=Math.max(0,rows.findIndex(r=>r.id===id));cover();setOpen(true);},
    getState(){return {open:opened,index,count:rows.length,demo:isDemo(),turning};}
  };
  // One row, gentle ping-pong movement. Pause on hover, focus, touch and hidden pages.
  const strip=$('#originalGrid'),toggle=$('#photoMotionToggle');let direction=1,userPause=reduced(),hover=false,focused=false,holdUntil=0,last=0;
  if(toggle){const label=()=>{toggle.textContent=userPause?'继续滚动 ▷':'暂停滚动 Ⅱ';toggle.setAttribute('aria-pressed',String(userPause));};label();toggle.onclick=()=>{userPause=!userPause;label();};}
  strip.addEventListener('pointerenter',()=>hover=true);strip.addEventListener('pointerleave',()=>hover=false);strip.addEventListener('focusin',()=>focused=true);strip.addEventListener('focusout',()=>focused=false);strip.addEventListener('pointerdown',()=>holdUntil=Date.now()+4000);strip.addEventListener('wheel',()=>holdUntil=Date.now()+4000,{passive:true});
  function glide(t){const dt=Math.min((t-last)||0,45);last=t;if(!userPause&&!hover&&!focused&&!document.hidden&&!$('#homeView').hidden&&!$('dialog[open]')&&Date.now()>holdUntil){const max=strip.scrollWidth-strip.clientWidth;if(max>1){const target=strip.scrollLeft+direction*dt*.029;strip.scrollLeft=Math.max(0,Math.min(max,target));if(target>=max)direction=-1;else if(target<=0)direction=1;}}window.requestAnimationFrame(glide);}
  window.requestAnimationFrame?.(glide);
})();
