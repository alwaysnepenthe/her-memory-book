/* Shared journal UI. Demonstrations are never passed to the persistence layer. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s),host=$('#growthList');
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  let motion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches!==true;
  const reduced=()=>!motion;
  let layout='book';try{layout=localStorage.getItem('pet-journal-layout')==='web'?'web':'book';}catch{};
  const placeholder=()=>window.HER_PLACEHOLDER||'assets/macaron-garden-v03.png';
  const photo=i=>window.HER_SEED[i]||{name:'花园小景',mime:'image/png',data:placeholder()};
  const video={name:'照片片段',mime:'video/mp4',data:'assets/demo-journal.mp4'};
  const demos=[
    {id:'demo-arrival',type:'growth',date:'2026-03-08',title:'到家的第一个下午',weight:1.2,notes:'小小的鼻子先探了出来，接着是一只试探的爪子。\n\n我们把毯子铺在窗边，让新朋友自己慢慢熟悉房间。今天不用着急，先好好认识彼此。',media:[photo(4),photo(3)]},
    {id:'demo-sunshine',type:'growth',date:'2026-04-12',title:'找到最喜欢的阳光',weight:1.55,notes:'下午三点，阳光刚好落在那块小垫子上。\n\n吃完饭，她就把自己团成一个小圆圈。耳朵偶尔动一下，大概连梦也是软软的。\n\n今日小发现：最喜欢被轻轻摸下巴。',media:[photo(0),photo(5)]},
    {id:'demo-video',type:'growth',date:'2026-05-20',title:'把今天，录成一小段',weight:1.9,notes:'把今天的照片，连成一小段温柔的片刻。\n\n午后的光慢慢走过窗边。她抬起头，看了看我，又安心地待在原地。\n\n不用每一天都很特别，我们一起度过就很好。',media:[video]},
    {id:'demo-everyday',type:'growth',date:'2026-06-16',title:'普通的一天，也很可爱',weight:2.15,notes:'今天没有什么大事。一起吃饭、玩了一会儿，窗外的树影晃来晃去。\n\n但这些普通的日常，慢慢变成了我们一起长大的故事。\n\n下次再翻开，就从新的一页开始吧。',media:[photo(1),photo(2)]},
    {"id":"demo-window","type":"growth","date":"2026-07-02","title":"窗边的小小观察员","weight":2.3,"notes":"窗外有一片叶子晃了很久，她也认真看了很久。\n\n先坐得端端正正，再悄悄伸长脖子。最后回过头，像是想把刚刚发现的秘密告诉我。\n\n今天的照片只留一张，留给这个专注的小表情。",media:[photo(3)]},
    {"id":"demo-stretch","type":"growth","date":"2026-07-19","title":"一整天的小模样","weight":null,"notes":"醒来的时候，先伸一个很长很长的懒腰。\n\n玩累了就趴一会儿，听到一点动静又抬起头。等房间安静下来，就把尾巴收好，重新睡成一个小团子。\n\n把几个小模样贴在同一页，就像收藏了一整天。",media:[photo(1),photo(5),photo(0)]},
    {"id":"demo-letter","type":"growth","date":"2026-08-08","title":"写给今天的一封小信","weight":null,"notes":"亲爱的小伙伴：\n\n今天没有举起相机。\n\n你在旁边睡觉，我把手边的事情慢慢做完。偶尔低头看看你，发现你也正眯着眼睛看我。\n\n原来一起生活，就是这些不用特意安排的时刻。窗帘被风吹起来，屋子里有一点暖光，还有你平稳的呼吸。\n\n这一页不贴照片，只把今天的心情写下来。\n\n愿明天也有一个舒服的午觉。",media:[]},
    {"id":"demo-afternoon","type":"growth","date":"2026-08-23","title":"让这个午后慢一点","weight":2.65,"notes":"一张照片，和一小段流动的光。\n\n照片留下眼睛里的神气，小片段留下午后的节奏。翻到这里的时候，也把自己的脚步放慢一点。\n\n今天的小事：吃得很认真，玩得很投入，睡得很香。",media:[video,photo(4)]}
  ];
  let config={records:[],pet:{name:'点点'},filters:{type:'growth',ascending:true}},rows=[],index=0,mode='auto',opened=false,turning=false,opening=false,openTimer,midTimer,endTimer;
  host.className='journal-stage';
  host.innerHTML=`<div class="journal-topline"><div class="growth-view-switch" role="group" aria-label="成长记录展示方式"><button id="showBook" type="button">翻页手账</button><button id="showWeb" type="button">网页记录</button></div><div class="journal-choice motion-choice">翻页效果 <select id="bookMotion"><option value="on">柔和动画</option><option value="off">静态切换</option></select></div><div class="journal-choice">正在翻阅 <select id="bookMode"><option value="real">我的记录</option><option value="demo">示例手账</option></select></div></div>
  <div id="sampleContext" class="sample-context" hidden><span>示例手账 · 供你参考记录方式</span><button type="button" id="startOwnRecord" class="text-button">＋ 开始我的记录</button></div><div id="bookCoverStage" class="book-cover-stage"><button id="openBook" class="book-cover" aria-label="打开成长手账"><span class="cover-spine" aria-hidden="true"></span><span class="cover-title">成长手账<small>OUR GROWING DAYS</small></span><span class="cover-photo"><img id="bookCoverPhoto" alt="成长手账封面的宠物照片"></span><span class="cover-pet" id="bookPetName"></span><span class="cover-invitation">轻轻翻开 · 从这一页开始</span></button><p class="cover-shadow-caption" id="coverCount"></p></div>
  <div id="bookReader" class="book-reader" hidden><div class="reader-tools"><button id="closeBook" class="text-button">↶ 合上手账</button><span>左边写日常，右边贴照片。</span><div class="reader-edit-actions"><button id="bookEdit" class="text-button">✎ 编辑本页</button><button id="bookAdd" class="text-button">＋ 写新的一页</button></div></div>
  <div id="bookSpread" class="book-spread" role="group" aria-label="成长手账书页"><section id="bookLeft" class="paper-page paper-left"></section><section id="bookRight" class="paper-page paper-right"></section><div class="book-binding" aria-hidden="true"></div><div id="turnLeaf" class="turn-leaf" aria-hidden="true" inert hidden><div class="turn-front"></div><div class="turn-back"></div></div></div>
  <nav class="book-navigation" aria-label="手账翻页"><button id="previousPage" class="page-arrow" aria-label="上一条记录">← 上一页</button><span id="bookPageStatus" role="status" aria-live="polite"></span><button id="nextPage" class="page-arrow" aria-label="下一条记录">下一页 →</button></nav><p class="reader-hint">也可以用键盘 ← → 翻页 · 图片可点开，视频可直接播放</p></div><div id="growthWeb" class="growth-web" hidden></div>`;

  const journalMenus=[];
  function syncJournalMenus(){journalMenus.forEach(m=>m.sync());}
  function makeJournalMenu(id,label){
    const select=$('#'+id),wrap=el('div','journal-select'),trigger=el('button','journal-select-trigger'),list=el('div','journal-select-options');
    const fieldLabel=select.closest('label');if(fieldLabel)fieldLabel.htmlFor=id+'Trigger';select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.parentNode.insertBefore(wrap,select);wrap.append(select,trigger,list);
    trigger.type='button';trigger.id=id+'Trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id+'Options');list.id=id+'Options';list.role='listbox';list.setAttribute('aria-label',label);list.hidden=true;
    const choices=[...select.options].map(option=>{const button=el('button','journal-select-option',option.textContent);button.type='button';button.role='option';button.tabIndex=-1;button.dataset.value=option.value;button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close(true);};list.append(button);return button;});
    function sync(){trigger.disabled=select.disabled;trigger.textContent=select.selectedOptions[0]?.textContent||'';trigger.setAttribute('aria-label',label+'：'+trigger.textContent);choices.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===select.value)));}
    function close(focus=false){list.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
    function open(){if(select.disabled)return;journalMenus.forEach(m=>m.close());sync();list.hidden=false;trigger.setAttribute('aria-expanded','true');(choices.find(b=>b.dataset.value===select.value)||choices[0]).focus();}
    trigger.onclick=()=>list.hidden?open():close();trigger.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open();}};
    list.onkeydown=e=>{const n=choices.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?choices.length-1:(n+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length;choices[next].focus();}else if(e.key==='Tab')close();};
    wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))close();});document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))close();});select.addEventListener('change',sync);journalMenus.push({sync,close});sync();
  }
  const menuLabels={bookMotion:'翻页效果',bookMode:'正在翻阅',growthOrder:'成长记录排序',memoryOrder:'片刻排序',profileSex:'性别'};
  document.querySelectorAll('select').forEach(select=>makeJournalMenu(select.id,menuLabels[select.id]||select.getAttribute('aria-label')||select.closest('label')?.textContent.trim()||'请选择'));
  window.PetSelectMenus={sync:syncJournalMenus};
  document.addEventListener('reset',()=>setTimeout(syncJournalMenus,0));

  function isDemo(){return mode==='demo'||mode==='auto'&&!config.records.some(r=>r.type==='growth');}
  function pauseVideos(){host.querySelectorAll('video').forEach(v=>v.pause());}
  function cancelTurn(){clearTimeout(midTimer);clearTimeout(endTimer);turning=false;$('#turnLeaf').hidden=true;$('#turnLeaf').classList.remove('flipping-next','flipping-prev');$('#bookSpread').classList.remove('is-turning');}
  function computeRows(){return BookCore.select(isDemo()?demos:config.records,config.filters);}
  function pageContent(record,n,side){
    const content=el('div','paper-content');content.append(el('span','botanical-corner corner-nw'),el('span','botanical-corner corner-ne'),el('span','botanical-corner corner-sw'),el('span','botanical-corner corner-se'));content.querySelectorAll('.botanical-corner').forEach(n=>n.setAttribute('aria-hidden','true'));
    const header=el('div','paper-heading');header.append(el('span','',side==='left'?(config.pet.name||'点点')+'日记':'把日常贴在这里'),el('span','','日常'));content.append(header);
    if(!record){content.append(el('span','paper-flourish','❦'),el('h2','','这一页，等你来写'),el('p','paper-notes',config.filters.month||config.filters.query?'这个筛选条件下还没有记录，试试清除筛选。':'选一天，贴一张照片，再写一点关于今天的小事。'));const add=el('button','button primary','＋ 写下第一条记录');add.onclick=()=>config.onAdd?.();content.append(add);return content;}
    if(side==='left'){
      const date=el('time','journal-date',record.date.replaceAll('-',' / '));date.dateTime=record.date;content.append(date,el('h2','journal-entry-title',record.title));
      if(record.weight!==null)content.append(el('span','journal-weight','今日体重  '+record.weight+' kg'));
      content.append(el('div','journal-rule','❧'),el('div','paper-notes',record.notes||'这一天的故事，先交给照片。'));
      const foot=el('div','entry-actions'),edit=el('button','text-button','✎ 编辑本页');edit.onclick=()=>{if(turning||opening)return;pauseVideos();config.onEdit?.(record,isDemo());};foot.append(edit);content.append(foot);
    }else{
      const media=el('div','journal-media');if(record.media.length>=3)media.classList.add('photo-montage');if(record.media.length===1&&record.media[0].mime.startsWith('image/'))media.classList.add('single-portrait');if(!record.media.length){media.append(el('div','journal-no-photo','❦'),el('p','','今天先写文字，下次再贴照片。'));}
      record.media.forEach((m,i)=>{const figure=el('figure','journal-photo');
        if(m.mime.startsWith('video/')){figure.classList.add('journal-video');const v=el('video');v.src=m.data;v.controls=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-label',m.name);v.poster=photo(3).data;figure.append(v);v.addEventListener('error',()=>{caption.textContent='当前浏览器不支持此视频编码，可下载原文件。';});const a=el('a','video-download','下载原视频');a.href=m.data;a.download=m.name+'.mp4';figure.append(a);}
        else{const b=el('button','journal-image-button');b.setAttribute('aria-label','查看照片 '+(i+1));const img=el('img');img.src=m.data;img.alt=m.name;img.loading='lazy';b.append(img);b.onclick=()=>{pauseVideos();if(isDemo())config.onPreview?.(m,record.title);else config.onOpen?.(record.id);};figure.append(b);}
        const caption=el('figcaption','',m.mime.startsWith('video/')?isDemo()?'照片片段':'这一刻，动了起来':record.date+'  ·  '+String(i+1).padStart(2,'0'));figure.append(caption);media.append(figure);
      });content.append(media);
    }
    content.append(el('span','paper-number',String(n*2+(side==='left'?1:2)).padStart(2,'0')));return content;
  }
  function webDraw(){const web=$('#growthWeb');web.replaceChildren();const list=rows.length?rows:[null];list.forEach((r,n)=>{const card=el('article','growth-web-card');if(r)card.dataset.recordId=r.id;card.append(pageContent(r,n,'left'),pageContent(r,n,'right'));web.append(card);});}
  function syncLayout(){pauseVideos();$('#showBook').setAttribute('aria-pressed',String(layout==='book'));$('#showWeb').setAttribute('aria-pressed',String(layout==='web'));$('#growthWeb').hidden=layout!=='web';$('#bookCoverStage').hidden=layout!=='book'||opened;$('#bookReader').hidden=layout!=='book'||!opened;if(layout==='web')webDraw();else $('#growthWeb').replaceChildren();}
  function chooseLayout(value){setOpen(false);layout=value;try{localStorage.setItem('pet-journal-layout',value);}catch{}syncLayout();}
  $('#showBook').onclick=()=>chooseLayout('book');$('#showWeb').onclick=()=>chooseLayout('web');
  $('#bookMotion').value=motion?'on':'off';syncJournalMenus();host.classList.toggle('motion-enabled',motion);$('#bookMotion').onchange=()=>{motion=$('#bookMotion').value==='on';host.classList.toggle('motion-enabled',motion);if(opening)setOpen(true);cancelTurn();if(opened)draw();};
  function draw(){
    pauseVideos();$('#bookLeft').replaceChildren(pageContent(rows[index],index,'left'));$('#bookRight').replaceChildren(pageContent(rows[index],index,'right'));
    $('#bookPageStatus').textContent=rows.length?'第 '+(index+1)+' / '+rows.length+' 条记录':'尚无记录';
    $('#previousPage').disabled=turning||index<=0;$('#nextPage').disabled=turning||index>=rows.length-1;$('#closeBook').disabled=turning;$('#bookEdit').disabled=turning||!rows.length;
    $('#bookSpread').dataset.recordId=rows[index]?.id||'';
  }
  function cover(){$('#sampleContext').hidden=!isDemo();const p=config.pet;$('#bookCoverPhoto').src=p.avatar||window.HER_SEED[p.portraitIndex??3]?.data||placeholder();$('#bookCoverPhoto').alt=(p.name||'宠物')+'的成长手账照片';$('#bookPetName').textContent=(p.name||'小伙伴')+'的小日子';$('#coverCount').textContent='共 '+rows.length+' 页小日常 · 轻触封面，慢慢翻开';$('#bookMode').value=isDemo()?'demo':'real';syncJournalMenus();}
  function setOpen(value){clearTimeout(openTimer);opening=false;host.classList.remove('book-opening');cancelTurn();opened=value;$('#bookCoverStage').hidden=value;$('#bookReader').hidden=!value;if(value)draw();else pauseVideos();syncLayout();}
  function snapshot(side){const copy=$(side).firstElementChild.cloneNode(true);copy.querySelectorAll('video').forEach(v=>{const still=el('div','journal-video-still','▶');v.replaceWith(still);});copy.querySelectorAll('button,a').forEach(n=>n.tabIndex=-1);return copy;}
  function turn(delta){const target=index+delta;if(opening||turning||target<0||target>=rows.length||!opened)return;pauseVideos();if(reduced()){index=target;draw();return;}
    turning=true;const leaf=$('#turnLeaf');leaf.classList.remove('flipping-next','flipping-prev');leaf.hidden=false;leaf.style.left=delta>0?'50%':'7px';leaf.style.transformOrigin=delta>0?'left center':'right center';
    leaf.querySelector('.turn-front').replaceChildren(snapshot(delta>0?'#bookRight':'#bookLeft'));leaf.querySelector('.turn-back').replaceChildren(pageContent(rows[target],target,delta>0?'left':'right'));
    $('#bookSpread').classList.add('is-turning');$('#previousPage').disabled=true;$('#nextPage').disabled=true;$('#closeBook').disabled=true;
    $(delta>0?'#bookRight':'#bookLeft').replaceChildren(pageContent(rows[target],target,delta>0?'right':'left'));void leaf.offsetWidth;leaf.classList.add(delta>0?'flipping-next':'flipping-prev');
    midTimer=setTimeout(()=>{index=target;},520);endTimer=setTimeout(()=>{index=target;cancelTurn();draw();},1040);
  }
  function animateOpen(){if(opening||opened)return;if(reduced()){setOpen(true);return;}const coverRect=$('#openBook').getBoundingClientRect(),hostRect=host.getBoundingClientRect();host.style.setProperty('--open-top',(coverRect.top-hostRect.top)+'px');host.style.setProperty('--open-width',coverRect.width+'px');opening=true;draw();$('#bookReader').hidden=false;host.classList.add('book-opening');openTimer=setTimeout(()=>setOpen(true),1400);}
  function editCurrent(){if(turning||opening||!rows[index])return;pauseVideos();config.onEdit?.(rows[index],isDemo());}
  $('#bookEdit').onclick=editCurrent;$('#startOwnRecord').onclick=()=>config.onAdd?.();
  $('#openBook').onclick=animateOpen;$('#closeBook').onclick=()=>setOpen(false);$('#previousPage').onclick=()=>turn(-1);$('#nextPage').onclick=()=>turn(1);$('#bookAdd').onclick=()=>config.onAdd?.();
  $('#bookMode').onchange=()=>{if(opening)setOpen(false);cancelTurn();mode=$('#bookMode').value;index=0;rows=computeRows();cover();if(opened)draw();syncLayout();};
  document.addEventListener('keydown',e=>{if(layout!=='book'||!opened||$('#growthView').hidden||$('dialog[open]')||e.target.closest?.('input,textarea,select,video,[contenteditable="true"]'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseVideos();cancelTurn();if(opened)draw();}});
  window.PawJournal={
    update(next){if(opening)setOpen(false);const oldId=rows[index]?.id;cancelTurn();config=next;rows=computeRows();const found=rows.findIndex(r=>r.id===oldId);index=found<0?0:found;cover();if(opened)draw();syncLayout();},
    close(){setOpen(false);},deactivate(){if(opening)setOpen(false);pauseVideos();cancelTurn();},
    reveal(id){mode='real';rows=computeRows();index=Math.max(0,rows.findIndex(r=>r.id===id));cover();setOpen(true);},
    getState(){return {open:opened,index,count:rows.length,demo:isDemo(),turning,opening,layout,motion};}
  };
  // Automatic drift; hovering steers toward that half without exposing a scrollbar.
  const strip=$('#originalGrid'),toggle=$('#photoMotionToggle');let direction=1,userPause=reduced(),hoverDirection=0,focused=false,holdUntil=0,last=0;
  if(toggle){const label=()=>{toggle.textContent=userPause?'继续滚动 ▷':'暂停滚动 Ⅱ';toggle.setAttribute('aria-pressed',String(userPause));};label();toggle.onclick=()=>{userPause=!userPause;label();};}
  function steer(e){if(e.pointerType==='touch')return;const r=strip.getBoundingClientRect();hoverDirection=e.clientX<r.left+r.width/2?-1:1;strip.dataset.direction=hoverDirection<0?'left':'right';}
  strip.addEventListener('pointerenter',steer);strip.addEventListener('pointermove',steer);strip.addEventListener('pointerleave',()=>{hoverDirection=0;delete strip.dataset.direction;});strip.addEventListener('focusin',()=>focused=true);strip.addEventListener('focusout',()=>focused=false);strip.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')holdUntil=Date.now()+3000;});strip.addEventListener('wheel',()=>holdUntil=Date.now()+3000,{passive:true});
  function glide(t){const dt=Math.min((t-last)||0,45);last=t;if(!userPause&&(!focused||hoverDirection)&&!document.hidden&&!$('#homeView').hidden&&!$('dialog[open]')&&Date.now()>holdUntil){const max=strip.scrollWidth-strip.clientWidth;if(max>1){const d=hoverDirection||direction;const target=strip.scrollLeft+d*dt*(hoverDirection ? .072 : .022);strip.scrollLeft=Math.max(0,Math.min(max,target));if(!hoverDirection){if(target>=max)direction=-1;else if(target<=0)direction=1;}}}window.requestAnimationFrame(glide);}
  window.requestAnimationFrame?.(glide);
})();
