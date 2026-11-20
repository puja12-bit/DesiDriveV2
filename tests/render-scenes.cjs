/* Pixel-art QA: node tests/render-scenes.cjs /tmp/desidrive-scenes */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {loadImage, createCanvas} = require('@napi-rs/canvas');
const output = process.argv[2] || '/tmp/desidrive-scenes';
fs.mkdirSync(output,{recursive:true});
class LocalImage {
  static created=[];
  constructor(){this.complete=false;LocalImage.created.push(this);}
  set src(url){this.url=url;}
}
const sandbox = vm.createContext({Image:LocalImage, Date, Math});
vm.runInContext(fs.readFileSync('dist/v2-visuals.js','utf8'), sandbox);
const art = vm.runInContext('V2Art',sandbox);
async function main() {
const loaded=new Map();
await Promise.all(LocalImage.created.map(async img=>{
  const bitmap=await loadImage(path.resolve('dist',img.url));
  loaded.set(img.url,bitmap);
  img.naturalWidth=bitmap.width;img.naturalHeight=bitmap.height;
  img.complete=true;
}));
for (const [distance, isNight] of [[0,false],[2200,false],[3450,false],
  [500,true],[9400,true]]) {
  const canvas=createCanvas(600,800), originalCtx=canvas.getContext('2d');
  const buffer=createCanvas(600,800);
  const ctx=new Proxy(originalCtx, {
    get(target,key) {
      if(key==='drawImage') return (img,...args)=>target.drawImage(img.url?loaded.get(img.url):img,...args);
      const value=target[key];return typeof value==='function' ? value.bind(target) : value;
    },
    set(target,key,value){target[key]=value;return true;}
  });
  const bufferCtx=new Proxy(buffer.getContext('2d'),{
    get(target,key){
      if(key==='drawImage')return(img,...args)=>target.drawImage(img.url?loaded.get(img.url):img,...args);
      const value=target[key];return typeof value==='function'?value.bind(target):value;
    },
    set(target,key,value){target[key]=value;return true;}
  });
  art.drawWorld(bufferCtx,'hyderabad',distance);
  art.drawCurvedScene(ctx,buffer,distance);
  if (isNight) {
    art.drawNightAtmosphere(ctx,distance,262,650);
    art.drawNightStreetFood(ctx,distance);
  }
  art.drawPlayer(ctx,{},262,650,0);
  ctx.fillStyle='rgba(9,22,30,.88)';ctx.fillRect(5,5,590,52);
  ctx.font='bold 19px monospace';ctx.fillStyle='#ffe0a0';
  ctx.fillText(`${art.hyderabadZone(distance).name} / ${distance} ${isNight?'NIGHT':'DAY'}`,18,38);
  fs.writeFileSync(path.join(output,`hyd-${distance}-${isNight?'night':'day'}.png`), canvas.toBuffer('image/png'));
}
for(const mapId of ['tamilnadu','mumbai']) {
  for(const distance of [0,2900]) {
    const canvas=createCanvas(600,800),actual=canvas.getContext('2d');
    const ctx=new Proxy(actual,{
      get(target,key) {
        if(key==='drawImage')return(img,...args)=>target.drawImage(img.url?loaded.get(img.url):img,...args);
        const value=target[key];return typeof value==='function'?value.bind(target):value;
      },
      set(target,key,value){target[key]=value;return true;}
    });
    art.drawWorld(ctx,mapId,distance);
    const traffic=[
      {t:'v',roadId:mapId,v2VisualKind:'bus',isOpposite:mapId==='tamilnadu',x:mapId==='tamilnadu'?370:433},
      {t:'v',roadId:mapId,v2VisualKind:'van',isOpposite:false,x:mapId==='tamilnadu'?253:167}
    ];
    art.drawEntity(ctx,traffic[0],240,{},0);
    art.drawEntity(ctx,traffic[1],485,{},0);
    art.drawPlayer(ctx,{},mapId==='tamilnadu'?262:300,650,0);
    fs.writeFileSync(path.join(output,`${mapId}-${distance}-day.png`),canvas.toBuffer('image/png'));
  }
}
for (const id of ['hjonda','bullett','ninja','bmw1000rr']) {
  const canvas=createCanvas(200,150), originalCtx=canvas.getContext('2d');
  const ctx=new Proxy(originalCtx,{
    get(target,key){
      if(key==='drawImage')return(img,...args)=>target.drawImage(img.url?loaded.get(img.url):img,...args);
      const value=target[key];return typeof value==='function'?value.bind(target):value;
    },
    set(target,key,value){target[key]=value;return true;}
  });
  art.drawGarageBike(ctx,{id},200,150);
  fs.writeFileSync(path.join(output,`garage-${id}.png`),canvas.toBuffer('image/png'));
}
console.log(`Saved 9 street scenes and 4 bike previews to ${output}`);
}
main().catch(err=>{console.error(err);process.exitCode=1});
