const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class LoadedImage {
  complete = true;
  naturalWidth = 941;
  naturalHeight = 1672;
  set src(value) { this.url = value; }
}

const scope = vm.createContext({Image: LoadedImage, Math});
vm.runInContext(fs.readFileSync('dist/v2-visuals.js', 'utf8'), scope);
const art = vm.runInContext('V2Art', scope);

function canvasSpy() {
  const images = [];
  const rectangles = [];
  const circles = [];
  const rotations = [];
  const fills = [];
  const noop = () => {};
  return {
    images, rectangles, circles, rotations, fills,
    ctx: {
      save: noop, restore: noop, fillRect: (...args) => rectangles.push(args), translate: noop,
      scale: noop, rotate: (angle) => rotations.push(angle), beginPath: noop, moveTo: noop,
      lineTo: noop, closePath: noop, clip: noop, rect: noop, ellipse: noop,
      fill: function() { fills.push(this.fillStyle); }, stroke: noop, strokeRect: noop,
      setLineDash: noop, fillText: noop,
      createRadialGradient: () => ({addColorStop: noop}),
      createLinearGradient: () => ({addColorStop: noop}),
      arc: (...args) => circles.push(args),
      drawImage: (...args) => images.push(args)
    }
  };
}
for (const map of ['offroad','delhi']) {
  const {ctx,images} = canvasSpy();
  assert.equal(art.drawWorld(ctx,map,500),true,`${map} uses a scenic illustration`);
  const panorama = images.filter(args=>args.length===9 && args[8]>1000);
  assert.equal(panorama.length,3,`${map} scenic strips fill the wide original road`);
  assert.deepEqual(panorama.map(args=>[args[5],args[7]]),[[0,100],[100,400],[500,100]],
    `${map} art matches original three-lane collision bounds`);
}
for(const map of ['mumbai','tamilnadu']) {
  const first=canvasSpy(),later=canvasSpy();
  assert.equal(art.drawWorld(first.ctx,map,1500),true);
  assert.equal(art.drawWorld(later.ctx,map,4800),true);
  assert.ok(first.images.length>=6,`${map} has continuously scrolling street panels`);
  assert.ok(first.images.some(args=>args[0]?.url?.includes(map==='tamilnadu'
    ? 'tamil-nadu-city-v3.webp' : 'mumbai-world.webp')),
  `${map} displays the new pixel-art region`);
  assert.notDeepEqual(first.images.slice(0,3).map(x=>x[6]),
    later.images.slice(0,3).map(x=>x[6]),`${map} doesn't freeze after the first kilometre`);
}
const cliffSpy=canvasSpy();
assert.equal(art.drawHillsBackdrop(cliffSpy.ctx,700),true,
  'Himalayan terrain loads beneath the curved hill road');
assert.equal(cliffSpy.images.length,1,'draw hills as one continuous valley image');

// Hyderabad now streams several pixel-art neighborhoods indefinitely; no
// clamp may leave the sidewalk buildings frozen while only lane dashes move.
for (const distance of [0, 900, 2000, 100000]) {
  const {ctx, images} = canvasSpy();
  assert.equal(art.drawWorld(ctx, 'hyderabad', distance), true);
  assert.ok(images.some(args=>args[0]?.url?.includes('hyd-')),
    `scrolling neighborhoods are painted at ${distance}`);
}
const worldBefore = canvasSpy(), worldAfter = canvasSpy();
art.drawWorld(worldBefore.ctx,'hyderabad',0);
art.drawWorld(worldAfter.ctx,'hyderabad',1500);
assert.notEqual(worldAfter.images[0][6],worldBefore.images[0][6],
  'moving forward must scroll scenery DOWN, not backwards');
const lateA = canvasSpy(), lateB = canvasSpy();
art.drawWorld(lateA.ctx,'hyderabad',12000);
art.drawWorld(lateB.ctx,'hyderabad',12180);
assert.notDeepEqual(lateA.images.slice(0,3).map(args=>args[6]),
  lateB.images.slice(0,3).map(args=>args[6]),
  'scenic panels keep moving even far beyond the old camera pan limit');
assert.equal(art.hyderabadZone(0).name,'GOWLIDODDY');
assert.equal(art.hyderabadZone(5600).name,'WIPRO CIRCLE');
assert.equal(art.hyderabadZone(9000).name,'ORR SERVICE ROAD');
assert.equal(art.hyderabadZone(9000, 'city').name,'GACHIBOWLI CITY',
  'route decision must change the road, not just a HUD label');
assert.equal(art.hyderabadZone(9000, 'orr').name,'ORR SERVICE ROAD');
assert.equal(art.curveShift(5000,650),0,
  'road and player share their world-space center at the rider');
assert.ok(Math.abs(art.curveShift(5000,0))>3,
  'road visibly bends in the distance instead of staying dead-straight');
const warped = canvasSpy();
art.drawCurvedScene(warped.ctx,{},5000);
assert.ok(warped.images.length>=200,'scenery warps smoothly in narrow strips');
const walkway = canvasSpy();
art.drawWorld(walkway.ctx,'hyderabad',500);
assert.ok(walkway.images.some(args=>args[0]?.url?.startsWith('assets/v2/sidewalk-walker-')),
  'sidewalk residents use the new rear-view walking artwork');
const foodNight = canvasSpy();
art.drawNightStreetFood(foodNight.ctx,500);
assert.ok(foodNight.images.some(args=>args[0]?.url==='assets/v2/night-golgappa-crowd.webp'),
  'a night market serves customers along hostel streets');
const cleanOffice = canvasSpy();
art.drawNightStreetFood(cleanOffice.ctx,4700);
assert.equal(cleanOffice.images.length,0,'no nighttime cart crowd in the IT office district');
const busStop=canvasSpy();
art.drawWorld(busStop.ctx,'hyderabad',3450);
assert.ok(busStop.images.some(args=>args[0]?.url==='assets/v2/traffic-sprites.png'),
  'Hyderabad bus stands have a visible parked bus');
const night = canvasSpy();
art.drawNightAtmosphere(night.ctx,5000,262,650);
assert.ok(night.rectangles.length >= 1,'night ride darkens background with lamp glows');

const sourceSprite = {};
for (const t of ['cow', 'buf', 'p', 'dog']) {
  const e = {t, x: 240, sx: -1};
  const {ctx, images} = canvasSpy();
  assert.equal(art.drawEntity(ctx, e, 520, {}), true, `${t} art loaded`);
  assert.equal(images.length, 1, `${t} sprite drawn exactly once`);
  assert.equal(e.x, 240, 'rendering does not mutate road position');
}
const walkerSpy = canvasSpy();
assert.equal(art.drawEntity(walkerSpy.ctx,
  {t:'p', x:205, sx:1, animT:450, waitT:0},500,{}),true);
assert.equal(walkerSpy.images.length,2,'walking pedestrian uses moving leg layer');
const femaleSpy = canvasSpy();
art.drawEntity(femaleSpy.ctx,
  {t:'p',x:448,sx:-1,gender:'woman',animT:500,sidewalkScale:.79},500,{});
assert.equal(femaleSpy.images[0][0].url,'assets/v2/pedestrian-woman.webp',
  'women pedestrians use a distinct recognizable sprite');
for(const [id,asset] of [
  ['hjonda','rider-commuter.webp'],['bullett','rider-cruiser.webp'],
  ['ninja','rider-ninja.webp'],['bmw1000rr','rider-superbike.webp']]) {
  const {ctx,images} = canvasSpy();
  art.drawPlayer(ctx,{id},262,650,0);
  assert.equal(images[0][0].url,`assets/v2/${asset}`,
    `selecting ${id} must change the actual vehicle in-game`);
  const garage=canvasSpy();
  art.drawGarageBike(garage.ctx,{id},200,150);
  assert.equal(garage.images[0][0].url,`assets/v2/${asset}`,
    `garage must preview selected ${id} rather than a generic black bike`);
}
for (const kind of ['motorcycle', 'auto', 'car', 'suv', 'lorry', 'bus']) {
  const {ctx, images, rotations} = canvasSpy();
  const e = {t: 'v', x: 300, logY: 700, sp: sourceSprite, v2VisualKind: kind};
  assert.equal(art.drawEntity(ctx, e, 320, {}), true);
  assert.equal(images.length, 1, `${kind} drawn exactly once`);
  assert.deepEqual(rotations, [], `${kind} must not be upside-down`);
  assert.equal(images[0][0].url, 'assets/v2/traffic-rear.png',
    `${kind} must use a true rear-view image`);
}
for(const isOpposite of [true,false]) {
  const van=canvasSpy();
  assert.equal(art.drawEntity(van.ctx,{t:'v',x:300,roadId:'hyderabad',
    v2VisualKind:'van',isOpposite},350,{}),true);
  assert.equal(van.images[0][0].url,'assets/v2/indian-delivery-van.webp',
    'vans use a dedicated front/rear pixel sprite');
}
const narrowSpy = canvasSpy();
art.drawEntity(narrowSpy.ctx,
  {t:'v',x:267,roadId:'hyderabad',v2VisualKind:'lorry'},600,{});
assert.ok(narrowSpy.images[0][7] < 58,'city lorry fits one lane visually');
const oncoming = {t:'v',x:380,logY:900,isOpposite:true,v2VisualKind:'car'};
const oncomingSpy = canvasSpy();
art.drawEntity(oncomingSpy.ctx,oncoming,350,{});
assert.deepEqual(oncomingSpy.rotations, [], 'oncoming vehicles face toward rider');
assert.equal(oncomingSpy.images[0][0].url, 'assets/v2/traffic-sprites.png',
  'oncoming traffic must use front-facing headlights');

for (const state of ['red', 'yellow', 'green']) {
  const {ctx, rectangles, circles, fills} = canvasSpy();
  const oppositeState = state === 'red' ? 'green' : 'red';
  art.drawTrafficSignal(ctx, 'hyderabad', 530, state, oppositeState);
  assert.ok(rectangles.some(r => r[1]===522 && r[3]===7),
    'rider stop line is on near side of crossing');
  assert.ok(rectangles.some(r => r[1]===421 && r[3]===7),
    'opposite-direction stop line is across the junction');
  assert.ok(rectangles.every((r) => r[2] < 400), 'no fullscreen black bar');
  assert.equal(circles.length, 6, 'two housings with three bulbs each');
  const lit = {red:'#fa4051',yellow:'#ffbe3a',green:'#48ed78'};
  assert.equal(fills[['red','yellow','green'].indexOf(state)],lit[state],
    'player-side light is in the actual player phase');
  assert.equal(fills[3+['red','yellow','green'].indexOf(oppositeState)],lit[oppositeState],
    'opposing-side light shows its independent phase');
}
console.log('Visual renderer checks passed.');
