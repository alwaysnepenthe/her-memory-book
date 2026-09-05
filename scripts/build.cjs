const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const asset=(file,ext)=>'data:'+(ext==='mp4'?'video/mp4':'image/png')+';base64,'+fs.readFileSync(path.join(root,'assets',file)).toString('base64');
let html=read('index.html');
const css=read('style.css').replace(/url\(["']?assets\/([\w-]+\.(png))["']?\)/g,(_,file,ext)=> 'url("'+asset(file,ext)+'")');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>');
for(const f of ['seed.js','core.js','journal.js','app.js']){
 let source=read(f);
 source=source.replace(/'assets\/([\w-]+\.(png|mp4))'/g,(_,file,ext)=>JSON.stringify(asset(file,ext)));
 html=html.replace('<script src="'+f+'"></script>',()=>'<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>');
}
if(/<script\s+src=|<link[^>]+stylesheet/.test(html))throw Error('A source dependency was not embedded.');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/paw-journal.html'),html);
console.log('Built dist/paw-journal.html (no personal browser data included).');
