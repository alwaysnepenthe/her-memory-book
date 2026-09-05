const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const art='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/macaron-garden-v03.png')).toString('base64');
let html=read('index.html');
const css=read('style.css').replace(/url\(["']?assets\/macaron-garden-v03\.png["']?\)/g,()=> 'url("'+art+'")');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>');
for(const f of ['seed.js','core.js','app.js']){
 let source=read(f);
 if(f==='seed.js')source=source.replace("'assets/macaron-garden-v03.png'",()=>JSON.stringify(art));
 html=html.replace('<script src="'+f+'"></script>',()=>'<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>');
}
if(/<script\s+src=|<link[^>]+stylesheet/.test(html))throw Error('A source dependency was not embedded.');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/her-memory-book.html'),html);
console.log('Built dist/her-memory-book.html (no personal browser data included).');
