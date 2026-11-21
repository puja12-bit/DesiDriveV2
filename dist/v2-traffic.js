/* DesiDrive V2 traffic staging. World positions, not image positions.
 * City streets respect left-hand Indian traffic; pedestrians/animals cross
 * between the visible curbs. No scoring or collision rules live here.
 */
const V2Traffic = (() => {
  const lanes = {
    hyderabad: {away: [211, 267], toward: [334, 389]},
    // TN V3's road uses the same centered yellow divide as Hyderabad.
    tamilnadu: {away: [253], toward: [370]},
    offroad: {away: [167, 300, 433], toward: []},
    delhi: {away: [167, 300, 433], toward: []},
    mumbai: {away: [167, 300, 433], toward: []}
  };

  function roadEdges(mapId, sy, logY = 0) {
    if (mapId === 'hyderabad') return [182, 418];
    if (mapId === 'tamilnadu') return [182,418];
    return [110, 490];
  }

  function encounter(mapId, roll, animalOnCooldown) {
    if (mapId === 'hills') return 'v';
    if (mapId === 'offroad') {
      if (roll < .12) return roll < .06 ? 'hole' : 'breaker';
      if (roll < .83) return 'v';
      if (roll < .94) return 'p';
      if (roll < .976) return 'dog';
      if (!animalOnCooldown && roll < .994) return 'cow';
      if (!animalOnCooldown) return 'buf';
      return 'v';
    }
    const weight = mapId === 'mumbai'
      ? [.915, .978, .993, .998] // crowded with vehicles, almost no livestock
      : mapId === 'tamilnadu'
      ? [.76, .94, .981, .995]
      : mapId === 'delhi'
      ? [.86, .966, .99, .998]
      : [.83, .951, .98, .994];
    if (roll < weight[0]) return 'v';
    if (roll < weight[1]) return 'p';
    if (roll < weight[2]) return 'dog';
    if (!animalOnCooldown) return roll < weight[3] ? 'cow' : 'buf';
    return 'v';
  }

  function chooseLane(mapId, entities, logY, random = Math.random) {
    const layout = lanes[mapId];
    if (!layout) return null; // Hills have their own curved-road logic.
    const opposite = layout.toward.length && random() < .35;
    const choices = opposite ? layout.toward : layout.away;
    const safe = choices.filter(x => !entities.some(e =>
      e.t === 'v' && !!e.isOpposite === !!opposite &&
      Math.abs(e.x - x) < 32 && Math.abs(e.logY - logY) < 155
    ));
    if (!safe.length) return null; // No new overlapping traffic pile-up.
    // City congestion is staggered: cars may fill neighbouring lanes, but
    // must not spawn into a completely unavoidable bumper-to-bumper wall.
    const staggered = safe.filter(x => !entities.some(e => e.t === 'v' &&
      !!e.isOpposite === !!opposite && Math.abs(e.x-x) >= 32 &&
      Math.abs(e.logY-logY) < 76));
    if (!staggered.length) return null;
    return { x: staggered[Math.floor(random() * staggered.length)], isOpposite: !!opposite };
  }

  function dividerChallenge(mapId, wave) {
    const left = wave % 2 === 0;
    const dividers = left ? [233, 366] : [366, 233];
    if (mapId === 'offroad' || mapId === 'mumbai') {
      const kind = mapId === 'offroad' ? 'hole' : 'bus';
      // Alternate shoulders along the route so a fixed offset from the stripe
      // cannot clear the whole sequence. Keep the center of the road open.
      const sides = wave % 2 === 0 ? [-18, 18] : [18, -18];
      return sides.flatMap(offset => dividers.map(x => ({
        kind, x: x + (x < 300 ? offset : -offset)
      })));
    }
    if (mapId === 'delhi') {
      return dividers.map(x => ({
        kind: 'car',
        x: x < 300 ? x - 30 : x + 30,
        mergeX: x < 300 ? x - 10 : x + 10
      }));
    }
    return [];
  }

  function trafficProfile(mapId, zone='') {
    if(mapId==='hyderabad') {
      if(zone==='gowlidoddy')return {intervalMs:315,maxVehicles:15};
      if(zone==='wipro')return {intervalMs:270,maxVehicles:17};
      if(zone==='gachibowli')return {intervalMs:330,maxVehicles:16};
      if(zone==='orr')return {intervalMs:430,maxVehicles:13};
      return {intervalMs:390,maxVehicles:14};
    }
    if(mapId==='mumbai')return {intervalMs:250,maxVehicles:18};
    if(mapId==='tamilnadu')return {intervalMs:420,maxVehicles:12};
    if(mapId==='delhi')return {intervalMs:310,maxVehicles:16};
    if(mapId==='hills')return {intervalMs:1200,maxVehicles:7};
    return {intervalMs:520,maxVehicles:11};
  }

  function vehicleKind(mapId, zone, roll) {
    // Indian commuters need visible, distinct vehicle types. One green
    // generic rectangle for buses and trucks hides the city's identity.
    const regional = mapId==='hyderabad' && zone==='orr'
      ? [['motorcycle',.11],['auto',.22],['car',.44],['suv',.53],['van',.72],['bus',.86]]
      : mapId==='hyderabad' && zone==='gowlidoddy'
      ? [['motorcycle',.27],['auto',.53],['car',.70],['suv',.78],['van',.86],['bus',.96]]
      : mapId==='mumbai'
      ? [['motorcycle',.15],['auto',.35],['car',.55],['suv',.64],['van',.77],['bus',.92]]
      : mapId==='tamilnadu'
      ? [['motorcycle',.23],['auto',.46],['car',.65],['suv',.74],['van',.82],['bus',.94]]
      : [['motorcycle',.23],['auto',.41],['car',.64],['suv',.76],['van',.86],['bus',.95]];
    const match=regional.find(([,threshold])=>roll<threshold);
    return match ? match[0] : 'lorry';
  }

  function cruisingSpeed(playerTopSpeed, mapId, vehicleClass, random = Math.random) {
    // Road commuters have their OWN pace. Previously superbikes multiplied
    // the speed of every passing car: outbound cars vanished before players
    // could see them and only oncoming traffic occupied the screen.
    const cityPace = mapId === 'mumbai' ? 6.5
      : mapId === 'tamilnadu' ? 8.5 : mapId === 'delhi' ? 8
      : mapId === 'offroad' ? 7.3 : mapId === 'hills' ? 6 : 9;
    const speedBand = cityPace * (playerTopSpeed >= 22 ? 1.08 : 1);
    const classFactor = vehicleClass === 'bike' ? 1.22
      : vehicleClass === 'auto' ? .78 : vehicleClass === 'truck' ? .65
      : vehicleClass === 'van' ? .84 : 1;
    return Math.max(2.5, Math.min(19, speedBand * (.75 + random() * .55) * classFactor));
  }

  function opposingSignalState(playerState) {
    // In two-way Indian traffic, one approach stops while the other passes.
    // Treat amber as a clearance phase, never green for both directions.
    return playerState === 'red' ? 'green' : 'red';
  }

  function overtakingLane(mapId, entities, playerX, playerLogY) {
    const layout = lanes[mapId];
    if (!layout || layout.away.length < 2) return null;
    // A vehicle entering from behind must be in an adjacent lane, not
    // materialize directly behind the rider and rear-end them.
    const candidates = layout.away.filter(x =>
      Math.abs(x - playerX) >= 43 &&
      !entities.some(e => e.t === 'v' && !e.isOpposite &&
        Math.abs(e.x - x) < 38 && Math.abs(e.logY - playerLogY) < 235));
    return candidates.length ? candidates[0] : null;
  }

  function crossingPosition(e, sy, mapId, playerLogY) {
    const [left, right] = roadEdges(mapId, sy, playerLogY);
    const margin = 7;
    const progress = Math.max(0, Math.min(1, e.crossProgress || 0));
    return e.sx > 0
      ? left + margin + (right - left - margin * 2) * progress
      : right - margin - (right - left - margin * 2) * progress;
  }

  return { dividerChallenge, roadEdges, encounter, chooseLane, trafficProfile, vehicleKind,
    cruisingSpeed, overtakingLane, opposingSignalState, crossingPosition };
})();
