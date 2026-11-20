const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({Math});
vm.runInContext(fs.readFileSync('dist/v2-traffic.js', 'utf8'), context);
const traffic = vm.runInContext('V2Traffic', context);
const gameSource = fs.readFileSync('dist/index.html','utf8');
assert.ok(!gameSource.includes('chaosTargetX = p.x'),
  'Delhi traffic must not target the rider like a homing missile');
assert.ok(!gameSource.includes('c2.logY = c1.logY'),
  'Delhi jam must not teleport one vehicle into another');

// City lanes: traffic ahead travels up on the left; opposing traffic down
// on the right. Never use sidewalk coordinates or pile cars in one lane.
for (const map of ['hyderabad', 'tamilnadu', 'delhi', 'mumbai', 'offroad']) {
  for (let i = 0; i < 25; i++) {
    const lane = traffic.chooseLane(map, [], 900, () => i / 25);
    assert.ok(lane && lane.x > 125 && lane.x < 475, `${map} lane on road`);
    if ((map === 'hyderabad' || map === 'tamilnadu') && lane.isOpposite) {
      assert.ok(lane.x > 300, `${map} oncoming traffic stays on right`);
    }
  }
}
const occupied = [{t:'v',x:211,logY:900,isOpposite:false},
  {t:'v',x:267,logY:900,isOpposite:false}];
assert.equal(traffic.chooseLane('hyderabad',occupied,900,()=>.9),null,
  'same-direction lanes blocked within safe spawn gap');
assert.ok(traffic.chooseLane('hyderabad',occupied,1150,()=>.9),
  'later traffic can spawn once road gap is clear');
assert.equal(traffic.chooseLane('hyderabad',[occupied[0]],900,()=>.9),null,
  'avoid a two-car wall that blocks both outbound Hyderabad lanes');
const staggered=traffic.chooseLane('hyderabad',[occupied[0]],1010,()=>.9);
assert.equal(staggered.x,267,
  'allow a safe, staggered second commuter lane rather than empty city roads');
assert.ok(traffic.chooseLane('tamilnadu',[],900,()=>.1).x>=360,
  'TN oncoming cars stay to the right of the painted divider');
assert.deepEqual([...traffic.roadEdges('tamilnadu',600)], [182,418],
  'Tamil Nadu artwork and collision road curbs have equal width');

const market=traffic.trafficProfile('hyderabad','gowlidoddy');
const office=traffic.trafficProfile('hyderabad','financial');
const service=traffic.trafficProfile('hyderabad','orr');
assert.ok(market.intervalMs<service.intervalMs,'hostel streets have heavier traffic');
assert.ok(market.maxVehicles>service.maxVehicles,'service road has fewer active cars');
assert.ok(traffic.trafficProfile('mumbai').maxVehicles>office.maxVehicles,
  'Mumbai commute is visibly more crowded than Hyderabad office roads');
assert.equal(traffic.vehicleKind('hyderabad','orr',.80),'bus',
  'service road has real buses');
assert.equal(traffic.vehicleKind('hyderabad','orr',.96),'lorry',
  'service road has lorries');
assert.equal(traffic.vehicleKind('hyderabad','gowlidoddy',.83),'van',
  'city streets have delivery vans');
assert.ok(gameSource.includes('seedInitialTraffic()'),
  'ride begins with visible commuters rather than an empty road');

const slowBike = traffic.cruisingSpeed(10,'hyderabad','car',()=>.5);
const fastBike = traffic.cruisingSpeed(28,'hyderabad','car',()=>.5);
assert.ok(slowBike > 6 && slowBike < 11, 'regular traffic matches a starter bike');
assert.ok(fastBike > 9 && fastBike < 13,
  'superbike unlock must not cause every NPC to drive at race speed');
assert.ok(fastBike < slowBike*1.2,
  'normal cars retain city driving speed across vehicle unlocks');
assert.ok(traffic.cruisingSpeed(28,'hyderabad','bike',()=>.5) >
  traffic.cruisingSpeed(28,'hyderabad','truck',()=>.5),
  'motorbikes cruise faster than heavy trucks');
assert.equal(traffic.overtakingLane('hyderabad',[],267,400),211,
  'passing traffic enters from behind in the adjacent outbound lane');
assert.equal(traffic.overtakingLane('hyderabad',[],211,400),267);
assert.equal(traffic.overtakingLane('tamilnadu',[],262,400),null,
  'do not conjure a second lane on narrow Tamil Nadu roads');
assert.equal(traffic.overtakingLane('hyderabad',[
  {t:'v',x:211,logY:440,isOpposite:false}],267,400),null,
  'no passing vehicle may spawn on an occupied lane');
assert.equal(traffic.opposingSignalState('green'),'red',
  'oncoming cars must stop when the rider has right of way');
assert.equal(traffic.opposingSignalState('red'),'green',
  'oncoming cars have their own green approach');
assert.equal(traffic.opposingSignalState('yellow'),'red',
  'both approaches must not be green during clearance');

// Animal odds: animals are rare, never a constant wall of cattle.
for (const map of ['hyderabad','tamilnadu','delhi','mumbai','offroad']) {
  const count = {v:0,p:0,dog:0,cow:0,buf:0,hole:0,breaker:0};
  for(let i=0;i<10000;i++) count[traffic.encounter(map,i/10000,false)]++;
  assert.ok(count.cow + count.buf < 350, `${map}: no cattle spam`);
  assert.ok(count.v > count.cow + count.buf + count.dog,
    `${map}: vehicles must dominate`);
  for(let i=0;i<10000;i++) {
    assert.ok(!['cow','buf'].includes(traffic.encounter(map,i/10000,true)),
      `${map}: cooldown prevents repeated livestock`);
  }
}

// Crossers start and end on asphalt curbs; no pedestrian in trees.
for (const map of ['hyderabad','tamilnadu','delhi']) {
  for (const sy of [0,250,600,800]) {
    const [left,right] = traffic.roadEdges(map,sy,500);
    for(const side of [-1,1]) {
      const pedestrian = {sx:side,crossProgress:0};
      const start = traffic.crossingPosition(pedestrian,sy,map,500);
      pedestrian.crossProgress=1;
      const end = traffic.crossingPosition(pedestrian,sy,map,500);
      assert.ok(start >= left && start <= right, `${map} start on road`);
      assert.ok(end >= left && end <= right, `${map} finish on road`);
      assert.ok(Math.abs(start-end) > 100, `${map} crosses whole road`);
    }
  }
}

console.log('Traffic staging checks passed.');
