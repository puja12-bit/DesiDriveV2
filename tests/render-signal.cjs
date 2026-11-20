const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {createCanvas, loadImage} = require('@napi-rs/canvas');

class LoadedImage {
  complete = false;
  naturalWidth = 0;
  set src(value) { this.url = value; }
}

async function main() {
  const canvas = createCanvas(600, 800);
  const ctx = canvas.getContext('2d');
  const art = await loadImage(path.resolve('dist/assets/v2/hyderabad-world.png'));
  ctx.drawImage(art, 0, 0, 600, 800);

  const context = vm.createContext({Image: LoadedImage, Math});
  vm.runInContext(fs.readFileSync('dist/v2-visuals.js', 'utf8'), context);
  const V2Art = vm.runInContext('V2Art', context);
  V2Art.drawTrafficSignal(ctx, 'hyderabad', 480, 'green');
  fs.writeFileSync(process.argv[2], canvas.toBuffer('image/png'));
}
main().catch(err => { console.error(err); process.exitCode = 1; });
