const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.mp4':'video/mp4'};
const allowed=new Set(['index.html','style.css','app.js','core.js','seed.js','journal.js','assets/macaron-garden-v03.png','assets/journal-cover.png','assets/demo-journal.mp4']);
const port=Number(process.env.PORT||4173);
http.createServer((req,res)=>{
 let file;try{file=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\//,'')||'index.html';}catch{res.writeHead(400);res.end();return;}
 if(!['GET','HEAD'].includes(req.method)||!allowed.has(file)){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(path.join(root,file),(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);});
}).listen(port,'127.0.0.1',()=>console.log('Open http://127.0.0.1:'+port));
