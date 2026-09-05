(function(root){
  'use strict';
  const MIME = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/;
  const MAX_FILE = 50 * 1024 * 1024;
  const MAX_TOTAL = 160 * 1024 * 1024;
  function dateOK(s) { if(typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s+'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0,10)===s; }
  function validateRecord(r) {
    if(!r || typeof r!=='object' || !['growth','memory'].includes(r.type)) throw Error('记录类型不正确。');
    if(typeof r.id!=='string' || !r.id || r.id.length>100) throw Error('记录编号不正确。');
    if(!dateOK(r.date)) throw Error('请选择有效日期。');
    if(typeof r.title!=='string' || !r.title.trim() || r.title.length>120) throw Error('请填写标题（最多 120 字）。');
    if(typeof r.notes!=='string' || r.notes.length>10000) throw Error('文字请控制在 10000 字以内。');
    if(r.weight!==null && (typeof r.weight!=='number' || !Number.isFinite(r.weight) || r.weight<=0 || r.weight>100)) throw Error('体重请填写大于 0、不超过 100 的数字，或留空。');
    if(!Array.isArray(r.media) || r.media.length>12) throw Error('每条记录最多添加 12 个照片或视频。');
    let total=0;
    for(const m of r.media) {
      if(!m || !MIME.test(m.mime) || typeof m.name!=='string' || m.name.length>500 || typeof m.data!=='string') throw Error('照片或视频格式不正确。');
      if(!m.data.startsWith('data:'+m.mime+';base64,') || !/^[A-Za-z0-9+/]*={0,2}$/.test(m.data.split(',')[1]||'')) throw Error('照片或视频内容不正确。');
      const bytes=m.data.split(',')[1].length*.75;
      if(bytes>MAX_FILE+3) throw Error('单个文件不能超过 50 MB。');
      total+=bytes;
    }
    if(total>MAX_TOTAL) throw Error('一条记录的附件合计不能超过 160 MB。');
    return {id:r.id,type:r.type,favorite:r.favorite===true,date:r.date,title:r.title.trim(),notes:r.notes,weight:r.weight,media:r.media.map(m=>({name:m.name,mime:m.mime,data:m.data})),createdAt:typeof r.createdAt==='string'?r.createdAt:new Date().toISOString(),updatedAt:typeof r.updatedAt==='string'?r.updatedAt:new Date().toISOString()};
  }
  function profile(p) {
    if(!p || typeof p.name!=='string' || p.name.trim().length<1 || p.name.length>40) throw Error('名字请填写 1–40 字。');
    if(typeof p.subtitle!=='string' || p.subtitle.length>150) throw Error('寄语请控制在 150 字以内。');
    const clean={name:p.name.trim(),subtitle:p.subtitle};
    const fields={nickname:40,species:40,breed:80,birthPlace:200,coatColor:100,personality:300,favoriteThings:300,notes:2000};
    for(const [key,max] of Object.entries(fields)) {
      const v=p[key]??'';
      if(typeof v!=='string'||v.length>max)throw Error('档案字段长度或格式不正确：'+key);
      clean[key]=v.trim();
    }
    for(const key of ['birthday','adoptedAt']) {
      const v=p[key]??'';
      if(v!==''&&!dateOK(v))throw Error(key==='birthday'?'请选择有效生日，或留空。':'请选择有效到家日期，或留空。');
      clean[key]=v;
    }
    if(clean.birthday&&clean.adoptedAt&&clean.adoptedAt<clean.birthday)throw Error('到家日期不能早于出生日期，请检查一下。');
    clean.sex=p.sex??'';
    if(!['','female','male','unknown'].includes(clean.sex))throw Error('请选择有效性别。');
    clean.portraitIndex=p.portraitIndex??3;
    if(!Number.isInteger(clean.portraitIndex)||clean.portraitIndex<0||clean.portraitIndex>5)throw Error('请选择有效档案照片。');
    clean.avatar=p.avatar??'';
    if(typeof clean.avatar!=='string')throw Error('档案照片格式不正确。');
    if(clean.avatar){
      const match=clean.avatar.match(/^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/);
      if(!match || match[2].length*.75>8*1024*1024+3)throw Error('档案照片需为 JPG、PNG、WebP 或 GIF，大小不超过 8 MB。');
    }
    return clean;
  }
  function backup(value) {
    if(!value || value.format!=='her-memory-book' || ![1,2,3].includes(value.version) || !Array.isArray(value.records) || value.records.length>10000) throw Error('这不是受支持的纪念册备份。');
    const ids=new Set();
    const records=value.records.map(r=>{const clean=validateRecord(r); if(ids.has(clean.id)) throw Error('备份中存在重复记录编号。'); ids.add(clean.id); return clean;});
    return {records,profile:profile(value.profile)};
  }
  function select(records,{type,month='',query='',ascending=false}) {
    const q=query.trim().toLocaleLowerCase();
    return records.filter(r=>(r.type===type || type==='memory'&&r.type==='growth'&&r.favorite===true) && (!month||r.date.slice(0,7)===month) && (!q||(r.title+' '+r.notes).toLocaleLowerCase().includes(q))).sort((a,b)=>ascending?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
  }
  const api={MIME,MAX_FILE,MAX_TOTAL,dateOK,validateRecord,profile,backup,select};
  if(typeof module==='object' && module.exports) module.exports=api; else root.BookCore=api;
})(typeof window!=='undefined'?window:globalThis);
