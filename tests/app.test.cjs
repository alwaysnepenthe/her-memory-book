const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const root=path.resolve(__dirname,'..'),C=require('../core.js');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<250;i++){if(fn())return;await delay(10);}throw Error('UI operation did not finish');}
async function launch(factory,cleanup){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.invalid/',runScripts:'outside-only'}),w=dom.window;cleanup.push(()=>w.close());
 w.indexedDB=factory;w.structuredClone=structuredClone;w.scrollTo=()=>{};
 w.matchMedia=()=>({matches:false});w.requestAnimationFrame=fn=>{w.nextFrame=fn;return 1;};Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};w.HTMLMediaElement.prototype.pause=function(){};
 w.URL.createObjectURL=b=>{w.exported=b;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 const $=s=>w.document.querySelector(s),errors=[];w.addEventListener('error',e=>errors.push(e.error));
 for(const f of ['seed.js','core.js','journal.js','app.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 await until(()=>$('#saveState').textContent.includes('条记录'));
 return {w,$,errors,submit:s=>$(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true})),change:s=>$(s).dispatchEvent(new w.Event('change',{bubbles:true}))};
}
test('validation and backwards-compatible profiles',()=>{
 const r={id:'a',type:'growth',date:'2024-02-29',title:'记录',notes:'',weight:1.2,media:[]};
 assert.equal(C.validateRecord(r).weight,1.2);assert.throws(()=>C.validateRecord({...r,date:'2023-02-29'}));assert.throws(()=>C.validateRecord({...r,weight:-1}));
 assert.equal(C.profile({name:'她',subtitle:''}).avatar,'');assert.equal(C.profile({name:'她',subtitle:'',avatar:png}).avatar,png);
 assert.throws(()=>C.profile({name:'她',subtitle:'',avatar:'data:image/svg+xml;base64,AAAA'}));
 assert.throws(()=>C.profile({name:'她',subtitle:'',birthday:'2024-05-02',adoptedAt:'2024-05-01'}));
 for(const version of [1,2,3])assert.equal(C.backup({format:'her-memory-book',version,profile:{name:'她',subtitle:''},records:[]}).profile.birthPlace,'');
 assert.throws(()=>C.backup({format:'her-memory-book',version:3,profile:{name:'她',subtitle:''},records:[r,r]}));
});
test('empty public app, uploads, persistence, CRUD and full backup',async()=>{
 const cleanup=[];try{
 const factory=new IDBFactory(),a=await launch(factory,cleanup);
 assert.equal(a.w.HER_SEED.length,0);assert.equal(a.$('.originals').hidden,true);assert.equal(a.errors.length,0);
 const ids=[...a.w.document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
 a.$('[data-view="profile"]').click();a.$('#profileName').value='测试小猫';a.$('#profileBirthday').value='2022-05-10';a.$('#profileBirthPlace').value='测试地点';
 const f=new a.w.File([Buffer.from(png.split(',')[1],'base64')],'portrait.png',{type:'image/png'});
 Object.defineProperty(a.$('#avatarInput'),'files',{value:[f],configurable:true});a.change('#avatarInput');await until(()=>!a.$('#saveProfile').disabled && a.$('#avatarPreview').src.startsWith('data:'));
 a.submit('#profileForm');await until(()=>a.$('#passportName').textContent==='测试小猫');assert.equal(a.$('#profilePhoto').src,png);assert.equal(a.$('#diaryBrand').textContent,'测试小猫日记');assert.equal(a.$('#diaryFooter').textContent,'测试小猫日记');assert.equal(a.w.document.title,'测试小猫日记 · 宠物记录册');
 a.$('[data-add="growth"]').click();a.$('#recordDate').value='2023-06-01';a.$('#recordTitle').value='<b>长大一点</b>';a.$('#recordWeight').value='2.35';
 const media=new a.w.File(['sample'],'sample.mp4',{type:'video/mp4'});Object.defineProperty(a.$('#mediaInput'),'files',{value:[media],configurable:true});a.change('#mediaInput');await until(()=>a.$('#selectedMedia').children.length===1&&!a.$('#saveRecord').disabled);
 a.submit('#recordForm');await until(()=>!a.$('#editor').open);assert.equal(a.$('#growthList h2 b'),null);assert.ok(a.$('#growthList').textContent.includes('2.35'));
 a.$('[data-add="memory"]').click();a.$('#recordDate').value='2023-07-01';a.$('#recordTitle').value='一个午后';a.submit('#recordForm');await until(()=>!a.$('#editor').open);
 a.$('#memoryList .memory-cover').click();a.$('#editRecord').click();a.$('#recordTitle').value='一起晒太阳';a.submit('#recordForm');await until(()=>!a.$('#editor').open);
 a.$('#memoryMonth').value='2020-01';a.change('#memoryMonth');assert.ok(a.$('#memoryList').textContent.includes('没有找到'));a.$('#memoryClear').click();assert.ok(a.$('#memoryList').textContent.includes('一起晒太阳'));
 const reload=await launch(factory,cleanup);assert.equal(reload.$('#profilePhoto').src,png);assert.ok(reload.$('#saveState').textContent.includes('2 条'));assert.equal(reload.$('#profileBirthPlace').value,'测试地点');
 a.$('#exportButton').click();await until(()=>a.w.exported);const pack=await new Promise(resolve=>{const r=new a.w.FileReader();r.onload=()=>resolve(JSON.parse(r.result));r.readAsText(a.w.exported);});assert.equal(pack.version,3);assert.equal(pack.profile.avatar,png);assert.equal(pack.records.length,2);
 const b=await launch(new IDBFactory(),cleanup);
 async function restore(){Object.defineProperty(b.$('#importInput'),'files',{value:[{size:JSON.stringify(pack).length,text:async()=>JSON.stringify(pack)}],configurable:true});b.change('#importInput');await until(()=>!b.$('#importPreview').hidden);b.$('#restoreProfile').checked=true;b.$('#confirmImport').click();await until(()=>b.$('#importPreview').hidden);}
 await restore();assert.equal(b.$('#profilePhoto').src,png);assert.equal(b.$('#profileBirthPlace').value,'测试地点');b.$('#openBook').click();assert.ok(b.$('#growthList video').src.startsWith('data:video/mp4'));
 await restore();assert.ok(b.$('#backupStatus').textContent.includes('0 条新记录'));
 b.$('#memoryList .memory-cover').click();b.$('#deleteRecord').click();assert.equal(b.$('#confirmDialog').open,true);b.$('[data-close="confirmDialog"]').click();assert.ok(b.$('#saveState').textContent.includes('2 条'));b.$('#deleteRecord').click();b.$('#confirmDelete').click();await until(()=>b.$('#saveState').textContent.includes('1 条'));
 for(const app of [a,b,reload])assert.equal(app.errors.length,0);
 }finally{cleanup.forEach(f=>f());}
});
test('book cover, bidirectional page turns, demo isolation and photo-strip pause',async()=>{
 const cleanup=[];try{
 const a=await launch(new IDBFactory(),cleanup);a.$('[data-view="growth"]').click();
 assert.equal(a.$('#bookCoverStage').hidden,false);assert.equal(a.w.PawJournal.getState().count,8);assert.equal(a.$('#demoNotice'),null);
 a.$('#openBook').click();assert.equal(a.w.PawJournal.getState().opening,true);a.$('#openBook').click();await until(()=>!a.w.PawJournal.getState().opening);assert.equal(a.$('#bookReader').hidden,false);assert.equal(a.$('#previousPage').disabled,true);assert.ok(a.$('#bookLeft').textContent.includes('到家的第一个下午'));
 const stablePage=a.$('#bookLeft').firstElementChild;a.$('#nextPage').click();assert.equal(a.$('#turnLeaf').querySelectorAll('.curl-strip').length,0);assert.equal(a.$('#turnLeaf').querySelectorAll(':scope > .turn-front, :scope > .turn-back').length,2);a.$('#nextPage').click();await delay(600);assert.equal(a.$('#bookLeft').firstElementChild,stablePage,'no mid-turn page rebuild');await until(()=>!a.w.PawJournal.getState().turning);assert.equal(a.w.PawJournal.getState().index,1);
 a.$('#previousPage').click();await until(()=>!a.w.PawJournal.getState().turning);assert.equal(a.w.PawJournal.getState().index,0);
 for(let i=0;i<2;i++){a.$('#nextPage').click();await until(()=>!a.w.PawJournal.getState().turning);}
 assert.ok(a.$('#bookRight video').controls);assert.ok(a.$('#bookRight').textContent.includes('照片片段'));
 a.$('#bookMotion').value='off';a.change('#bookMotion');while(!a.$('#nextPage').disabled)a.$('#nextPage').click();assert.equal(a.w.PawJournal.getState().index,7);assert.equal(a.$('#nextPage').disabled,true);
 a.$('#exportButton').click();await until(()=>a.w.exported);const pack=await new Promise(resolve=>{const r=new a.w.FileReader();r.onload=()=>resolve(JSON.parse(r.result));r.readAsText(a.w.exported);});assert.equal(pack.records.length,0,'demos never enter backups');
 a.$('#bookMode').value='real';a.change('#bookMode');assert.equal(a.w.PawJournal.getState().count,0);assert.ok(a.$('#bookLeft').textContent.includes('等你来写'));
 a.$('[data-view="home"]').click();const strip=a.$('#originalGrid');Object.defineProperty(strip,'scrollWidth',{value:900,configurable:true});Object.defineProperty(strip,'clientWidth',{value:300,configurable:true});
 a.w.nextFrame(1000);a.w.nextFrame(1045);assert.ok(strip.scrollLeft>0);const current=strip.scrollLeft;a.$('#photoMotionToggle').click();a.w.nextFrame(1090);assert.equal(strip.scrollLeft,current);
 a.$('#photoMotionToggle').click();strip.scrollLeft=599.8;a.w.nextFrame(1135);assert.equal(strip.scrollLeft,600);a.w.nextFrame(1180);assert.ok(strip.scrollLeft<600,'reverses at end');
 strip.getBoundingClientRect=()=>({left:0,width:300});strip.scrollLeft=300;strip.dispatchEvent(new a.w.MouseEvent('pointermove',{clientX:20}));a.w.nextFrame(1225);assert.ok(strip.scrollLeft<300);const left=strip.scrollLeft;strip.dispatchEvent(new a.w.MouseEvent('pointermove',{clientX:280}));a.w.nextFrame(1270);assert.ok(strip.scrollLeft>left);a.$('#photoMotionToggle').click();const stopped=strip.scrollLeft;a.w.nextFrame(1315);assert.equal(strip.scrollLeft,stopped);assert.equal(a.errors.length,0);
 }finally{cleanup.forEach(f=>f());}
});

test('edit current preset deliberately creates one record; editing saved page keeps identity',async()=>{const cleanup=[];try{const a=await launch(new IDBFactory(),cleanup);a.$('[data-view="growth"]').click();a.$('#openBook').click();await until(()=>!a.w.PawJournal.getState().opening);a.$('#bookEdit').click();assert.equal(a.$('#editor').open,true);assert.equal(a.$('#recordTitle').value,'到家的第一个下午');a.$('#recordTitle').value='点点的第一天';a.submit('#recordForm');await until(()=>!a.$('#editor').open);assert.ok(a.$('#saveState').textContent.includes('1 条'));assert.ok(a.$('#bookLeft').textContent.includes('点点的第一天'));a.$('#bookEdit').click();a.$('#recordTitle').value='点点的新日常';a.$('#recordWeight').value='2.4';a.submit('#recordForm');await until(()=>!a.$('#editor').open);assert.ok(a.$('#saveState').textContent.includes('1 条'));assert.ok(a.$('#bookLeft').textContent.includes('点点的新日常'));assert.ok(a.$('#bookLeft').textContent.includes('2.4'));assert.equal(a.errors.length,0);}finally{cleanup.forEach(f=>f());}});

test('web layout shares records, edits the selected card and keeps layout after save',async()=>{const cleanup=[];try{const a=await launch(new IDBFactory(),cleanup);a.$('[data-view="growth"]').click();a.$('#showWeb').click();assert.equal(a.w.PawJournal.getState().layout,'web');assert.equal(a.$('#bookCoverStage').hidden,true);assert.equal(a.$('#growthWeb').hidden,false);assert.equal(a.$('#growthWeb').children.length,8);assert.ok(a.$('#growthWeb video').controls);assert.equal(a.w.localStorage.getItem('pet-journal-layout'),'web');a.$('#growthWeb article:nth-child(2) .entry-actions button').click();assert.equal(a.$('#recordTitle').value,'找到最喜欢的阳光');a.$('#recordTitle').value='网页里记录的成长';a.submit('#recordForm');await until(()=>!a.$('#editor').open);assert.equal(a.$('#growthWeb').hidden,false);assert.equal(a.$('#bookReader').hidden,true);assert.equal(a.$('#growthWeb').children.length,1);assert.ok(a.$('#growthWeb').textContent.includes('网页里记录的成长'));a.$('#showBook').click();assert.equal(a.$('#growthWeb').hidden,true);assert.equal(a.$('#bookCoverStage').hidden,false);a.$('#bookMotion').value='off';a.change('#bookMotion');a.$('#openBook').click();assert.equal(a.w.PawJournal.getState().opening,false);assert.equal(a.$('#bookReader').hidden,false);assert.ok(a.$('#bookLeft').textContent.includes('网页里记录的成长'));assert.equal(a.$('#bookLeft').querySelectorAll('.botanical-corner').length,4);a.$('#closeBook').click();a.$('#bookMotion').value='on';a.change('#bookMotion');a.$('#openBook').click();assert.equal(a.w.PawJournal.getState().opening,true);a.$('#showWeb').click();await delay(1500);assert.equal(a.$('#bookReader').hidden,true);assert.equal(a.w.PawJournal.getState().opening,false);assert.equal(a.errors.length,0);}finally{cleanup.forEach(f=>f());}});

test('styled menus support selection, keyboard escape and outside dismissal',async()=>{const cleanup=[];try{const a=await launch(new IDBFactory(),cleanup);a.$('#bookMotionTrigger').click();assert.equal(a.$('#bookMotionOptions').hidden,false);a.$('#bookMotionOptions [data-value="off"]').click();assert.equal(a.w.PawJournal.getState().motion,false);assert.equal(a.$('#bookMotionTrigger').textContent,'静态切换');assert.equal(a.$('#bookMotionOptions').hidden,true);a.$('#bookModeTrigger').click();a.$('#bookModeOptions [data-value="real"]').click();assert.equal(a.w.PawJournal.getState().demo,false);a.$('#bookModeTrigger').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(a.$('#bookModeOptions').hidden,false);a.w.document.activeElement.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(a.$('#bookModeOptions').hidden,true);assert.equal(a.w.document.activeElement,a.$('#bookModeTrigger'));a.$('#bookModeTrigger').click();a.w.document.body.dispatchEvent(new a.w.Event('pointerdown',{bubbles:true}));assert.equal(a.$('#bookModeOptions').hidden,true);assert.equal(a.errors.length,0);}finally{cleanup.forEach(f=>f());}});
