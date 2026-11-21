/* DesiDrive V2 illustration renderer.
 * Positions are supplied by the traffic simulation. This file is artwork only.
 */
const V2Art = (() => {
  const worlds = {
    hyderabad: new Image(),
    tamilnadu: new Image(),
    offroad: new Image(),
    delhi: new Image(),
    mumbai: new Image(),
    hills: new Image()
  };
  // Hyderabad is one continuous ride, not a new unlockable map for each area.
  const hydScenes = {
    pg: new Image(),
    offices: new Image(),
    orr: new Image()
  };
  hydScenes.pg.src = 'assets/v2/hyd-gowlidoddy.webp';
  hydScenes.offices.src = 'assets/v2/hyd-financial-district.webp';
  hydScenes.orr.src = 'assets/v2/hyd-orr-service-road.webp';
  // Pixels and gameplay-world units agree, so street landmarks never drift
  // away from vehicles or the signal stop lines as the camera advances.
  const HYD_PANEL_HEIGHT = 1066;
  const HYD_START_OFFSET = 450;
  const hydRoute = [
    {key:'gowlidoddy', name:'GOWLIDODDY', detail:'PGs · chai · street food', art:'pg'},
    {key:'gowlidoddy', name:'GOWLIDODDY', detail:'hostels · footpaths', art:'pg'},
    {key:'gowlidoddy', name:'GOWLIDODDY', detail:'food street', art:'pg'},
    {key:'financial', name:'FINANCIAL DISTRICT', detail:'IT offices · tech parks', art:'offices'},
    {key:'wipro', name:'WIPRO CIRCLE', detail:'four-way junction · office rush', art:'offices'},
    {key:'wipro', name:'WIPRO CIRCLE', detail:'four-way junction', art:'offices'},
    {key:'gachibowli', name:'GACHIBOWLI', detail:'IT corridor · flyovers', art:'offices'},
    {key:'gachibowli', name:'GACHIBOWLI', detail:'IT corridor · junction', art:'offices'},
    {key:'orr', name:'ORR SERVICE ROAD', detail:'bikes stay off expressway', art:'orr'}
  ];
  function hyderabadZone(distance, routeChoice = 'orr') {
    const index = Math.max(0, Math.floor((Math.max(0, distance)+HYD_START_OFFSET) / HYD_PANEL_HEIGHT));
    if (index >= 8 && routeChoice !== 'orr') {
      return {key:'gachibowli', name:'GACHIBOWLI CITY', detail:'local streets', art:'offices'};
    }
    return hydRoute[Math.min(index, hydRoute.length - 1)];
  }

  function cityRoadCenter(worldDistance) {
    // Broad urban S-curves mixed with straighter stretches. Easing in avoids
    // abruptly bending the road as soon as a new run begins.
    const d = Math.max(0, worldDistance);
    const ramp = Math.max(0, Math.min(1, (d - 450) / 700));
    const smooth = ramp * ramp * (3 - 2 * ramp);
    return smooth * (63 * Math.sin(d / 640) + 20 * Math.sin(d / 310 + 1.3));
  }

  function curveShift(logY, screenY) {
    return cityRoadCenter(logY + 650 - screenY) - cityRoadCenter(logY);
  }

  function drawCurvedScene(ctx, buffer, logY) {
    // The old unwarped full-frame backing bled through on outside bends,
    // creating doubled facades and apparent seams in the buildings.
    // Fill only exposed edge pixels from the matching sidewalk art.
    ctx.save();ctx.imageSmoothingEnabled=false;
    for (let y = 0; y < 800; y += 4) {
      const h = Math.min(4, 800 - y);
      const dx = Math.round(curveShift(logY, y + h / 2));
      if(dx>0) ctx.drawImage(buffer,0,y,Math.min(36,dx),h,0,y,dx,h);
      else if(dx<0) ctx.drawImage(buffer,600-Math.min(36,-dx),y,
        Math.min(36,-dx),h,600+dx,y,-dx,h);
      ctx.drawImage(buffer, 0, y, 600, h, dx, y, 600, h);
    }
    ctx.restore();
  }
  const rider = new Image();
  const bikeRiders = {
    hjonda: new Image(), bullett: new Image(), ninja: new Image(), bmw1000rr: new Image()
  };
  bikeRiders.hjonda.src = 'assets/v2/rider-commuter.webp';
  bikeRiders.bullett.src = 'assets/v2/rider-cruiser.webp';
  bikeRiders.ninja.src = 'assets/v2/rider-ninja.webp';
  bikeRiders.bmw1000rr.src = 'assets/v2/rider-superbike.webp';
  const trafficAtlas = new Image();
  const trafficRearAtlas = new Image();
  const indianVan = new Image();
  const regionalCanopy = new Image();
  const roadsideAtlas = new Image();
  const womanPedestrian = new Image();
  const sidewalkMan = new Image();
  const sidewalkWoman = new Image();
  const nightGolgappaCrowd = new Image();
  // WebP preserves the painted detail while avoiding a ~19 MB PNG preload.
  worlds.hyderabad.src = 'assets/v2/hyderabad-world.webp';
  worlds.tamilnadu.src = 'assets/v2/tamil-nadu-city-v3.webp';
  worlds.offroad.src = 'assets/v2/mp-world.webp';
  worlds.delhi.src = 'assets/v2/delhi-world.webp';
  worlds.mumbai.src = 'assets/v2/mumbai-world.webp';
  worlds.hills.src = 'assets/v2/hills-world.webp';
  rider.src = 'assets/v2/rider.png';
  const usableTrafficAtlases = new WeakSet();
  for (const atlas of [trafficAtlas, trafficRearAtlas]) {
    atlas.addEventListener('load', () => {
      if (hasCompleteTrafficArt(atlas)) usableTrafficAtlases.add(atlas);
    });
  }
  trafficAtlas.src = 'assets/v2/traffic-sprites.png';
  trafficRearAtlas.src = 'assets/v2/traffic-rear.png';
  indianVan.src = 'assets/v2/indian-delivery-van.webp';
  regionalCanopy.src = 'assets/v2/roadside-canopy-v3.webp';
  roadsideAtlas.src = 'assets/v2/road-crossers.png';
  womanPedestrian.src = 'assets/v2/pedestrian-woman.webp';
  sidewalkMan.src = 'assets/v2/sidewalk-walker-man.webp';
  sidewalkWoman.src = 'assets/v2/sidewalk-walker-woman.webp';
  nightGolgappaCrowd.src = 'assets/v2/night-golgappa-crowd.webp';

  const ready = (mapId) => !!worlds[mapId] && worlds[mapId].complete && worlds[mapId].naturalWidth > 0;
  const riderReady = () => rider.complete && rider.naturalWidth > 0;

  function roadBounds(mapId, sy, cameraY, sourceScale) {
    if (mapId === 'hyderabad') return [182, 418];
    if (mapId === 'offroad' || mapId === 'delhi' || mapId === 'mumbai') return [100,500];
    const originalY = Math.max(0, Math.min(1672, (sy + cameraY) / sourceScale));
    return [(425 - .175 * originalY) * sourceScale,
      (620 + .17 * originalY) * sourceScale];
  }

  function drawDirectionArrow(ctx, x, y, up) {
    ctx.save();
    ctx.fillStyle = 'rgba(244, 237, 214, .31)';
    ctx.fillRect(x - 2, y - 11, 4, 23);
    ctx.beginPath();
    if (up) {
      ctx.moveTo(x, y - 24); ctx.lineTo(x - 9, y - 7); ctx.lineTo(x + 9, y - 7);
    } else {
      ctx.moveTo(x, y + 25); ctx.lineTo(x - 9, y + 8); ctx.lineTo(x + 9, y + 8);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawMovingRoadDetails(ctx, world, mapId, logY, cameraY) {
    const scale = 600 / world.naturalWidth;
    const laneMarks = mapId === 'hyderabad' ? [242, 358]
      : mapId === 'tamilnadu' ? [339] : [233, 366];
    const dashLength = mapId === 'hyderabad' ? 34 : 23;
    const dashPeriod = mapId === 'hyderabad' ? 94 : 82;
    const motion = Math.max(0, logY);
    const phase = motion % dashPeriod;

    // Cover the painted STATIC lane dashes with a narrow strip of the SAME
    // textured asphalt, then draw dashes that actually travel downwards.
    // A plain black rectangle would look like a new lane or image seam.
    for (const markX of laneMarks) {
      if (mapId === 'hyderabad' || mapId === 'tamilnadu') {
        const cleanX = markX === 242 ? 263 : markX === 358 ? 336 : 357;
        ctx.drawImage(world, (cleanX - 5) / scale, cameraY / scale,
          10 / scale, 800 / scale, markX - 5, 0, 10, 800);
      } else {
        // The painted divider spacing varies slightly between generated
        // scenes. Erase ALL of each old marking from a 70px-wide asphalt
        // band before repainting at the real x=233/366 collision boundaries.
        ctx.drawImage(world, 420, cameraY / scale, 90, 800 / scale,
          markX - 35, 0, 70, 800);
      }
      ctx.fillStyle = mapId === 'tamilnadu' ? '#efbd39' : '#f3eddd';
      for (let y = -dashPeriod + phase; y < 830; y += dashPeriod) {
        ctx.fillRect(markX - 2, y, 4, dashLength);
      }
    }

    // Black-and-white Indian curbstones move past the bike. This provides an
    // endless speed cue after the one-piece scenic painting finishes panning.
    const curbPhase = motion % 46;
    const edgeYs = Array.from({length: 46}, (_,n) => -50 + n * 20);
    for (const side of [0, 1]) {
      ctx.strokeStyle = '#20222a'; ctx.lineWidth = 8;
      ctx.beginPath();
      edgeYs.forEach((y,i) => {
        const x = roadBounds(mapId,y,cameraY,scale)[side] + (side ? 3 : -3);
        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
      for (let y = -46 + curbPhase; y < 840; y += 46) {
        const x = roadBounds(mapId,y + 12,cameraY,scale)[side] + (side ? 3 : -3);
        ctx.fillStyle = '#ece6d7';
        ctx.fillRect(x - 3.5, y, 7, 23);
      }
    }

    // Sparse direction arrows make left-hand traffic legible without HUD
    // clutter: left half travels UP, right half comes DOWN toward the player.
    const arrowPhase = motion % 950;
    for (let y = -950 + arrowPhase; y < 890; y += 950) {
      if (mapId === 'hyderabad') {
        drawDirectionArrow(ctx, 267, y, true);
        drawDirectionArrow(ctx, 334, y, false);
      } else {
        if (mapId === 'tamilnadu') {
          drawDirectionArrow(ctx, 253, y, true);
          drawDirectionArrow(ctx, 370, y, false);
        } else {
          [167, 300, 433].forEach(x => drawDirectionArrow(ctx, x, y, true));
        }
      }
    }
  }

  function drawWorld(ctx, mapId, logY, routeChoice = 'orr') {
    if (mapId === 'hills' || !ready(mapId)) return false;
    if (mapId === 'hyderabad' && hydScenes.pg.complete && hydScenes.pg.naturalWidth > 0) {
      return drawHyderabadRoute(ctx, logY, routeChoice);
    }
    const world = worlds[mapId];
    if(mapId==='mumbai'||mapId==='tamilnadu')
      return drawRegionalStreet(ctx,world,mapId,logY);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    // Driving UP the screen means the roadside must pass DOWN the screen.
    // The previous negative pan made the rider appear to reverse; advance
    // all scenic tiles downwards as road-world distance increases.
    const h = world.naturalHeight * (600 / world.naturalWidth);
    const travel = Math.max(0, h - 800);
    // Mumbai, Tamil Nadu, Delhi and MP used to freeze after 780 world units:
    // the road dashes moved, but the city was permanently stationary.
    // Keep cycling the painted blocks behind road traffic for the whole run.
    const scroll = Math.max(0,logY)*.34;
    const firstTop=-travel+(scroll%h);
    for(let tile=-2;tile<=1;tile++) {
      const drawY=firstTop+tile*h;
      if(drawY>=800||drawY+h<=0)continue;
      if(mapId==='offroad'||mapId==='delhi'||mapId==='mumbai') {
        const iw=world.naturalWidth,ih=world.naturalHeight;
        const edgeL=275,edgeR=660;
        ctx.drawImage(world,0,0,edgeL,ih,0,drawY,100,h);
        ctx.drawImage(world,edgeL,0,edgeR-edgeL,ih,100,drawY,400,h);
        ctx.drawImage(world,edgeR,0,iw-edgeR,ih,500,drawY,100,h);
      } else ctx.drawImage(world,0,drawY,600,h);
    }
    // The moving art supplies the lane stripes and curbstones directly.
    ctx.restore();return true;
  }

  function drawRegionalStreet(ctx,world,mapId,logY) {
    const isMumbai=mapId==='mumbai';
    const left=isMumbai?100:182,right=isMumbai?500:418;
    const iw=world.naturalWidth,ih=world.naturalHeight;
    const h=ih*(600/iw),travel=h-800;
    const firstTop=-travel+(Math.max(0,logY)*.34%h);
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(let tile=-2;tile<=1;tile++) {
      const y=firstTop+tile*h;
      if(y>=800||y+h<=0)continue;
      const flip=Math.abs(tile)%2===1;
      // Both new regional scenes have constant-width road geometry. Never
      // invert temples or buildings: only seamless asphalt may mirror.
      const sourceLeft=isMumbai?275:285,sourceRight=isMumbai?660:653;
      ctx.drawImage(world,0,0,sourceLeft,ih,0,y,left,h);
      ctx.drawImage(world,sourceRight,0,iw-sourceRight,ih,right,y,600-right,h);
      ctx.save();
      if(flip){ctx.translate(0,y+h);ctx.scale(1,-1);}
      ctx.drawImage(world,sourceLeft,0,sourceRight-sourceLeft,ih,
        left,flip?0:y,right-left,h);
      ctx.restore();
      if(isMumbai) {
        // Bus shelters in the painting now have actual waiting commuters.
        for(const sourceY of [620,1100]) {
          const sy=y+sourceY*(h/ih);
          if(sy<-100||sy>900)continue;
          for(const [x,off,sprite] of [[534,-20,sidewalkWoman],
            [557,9,sidewalkMan],[580,29,sidewalkWoman]]) {
            if(sprite.complete&&sprite.naturalWidth)
              ctx.drawImage(sprite,x-12,sy+off-21,24,42);
          }
        }
        const busY=y+1100*(h/ih)-78;
        if(busY>-100&&busY<900)drawEntity(ctx,
          {t:'v',v2VisualKind:'bus',roadId:'mumbai',x:527,
            sidewalkScale:.50,isOpposite:false},busY,{},0);
      }
    }
    if(regionalCanopy.complete&&regionalCanopy.naturalWidth) {
      // A row of native roadside trees visually bridges the repeating
      // sidewalk panels; no black bridge strips or flipped-up buildings.
      for(let tile=-2;tile<=2;tile++) {
        const seamY=firstTop+tile*h;
        if(seamY<-110||seamY>910)continue;
        const canopyWidth=isMumbai?145:194,canopyHeight=isMumbai?128:158;
        for(const x of [isMumbai?-25:-16,isMumbai?480:420]) {
          ctx.drawImage(regionalCanopy,x,seamY-canopyHeight/2,
            canopyWidth,canopyHeight);
        }
      }
    }
    // A continuous curb in the correct collision-space location conceals
    // small source-art perspective differences at scenic panel boundaries.
    const phase=Math.max(0,logY)%46;
    for(const curbX of [left,right]) {
      ctx.fillStyle='#161b20';ctx.fillRect(curbX-4,0,8,800);
      for(let y=-46+phase;y<840;y+=46) {
        ctx.fillStyle='#efe9dc';ctx.fillRect(curbX-4,y,8,23);
      }
    }
    ctx.restore();return true;
  }

  function drawHyderabadRoute(ctx, logY, routeChoice = 'orr') {
    // No finite camera clamp. Every building, stall, tree and flyover moves
    // downwards with world travel instead of the asphalt moving alone.
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const startIndex = Math.floor((logY + HYD_START_OFFSET - 150) / HYD_PANEL_HEIGHT) - 1;
    const endIndex = Math.floor((logY + HYD_START_OFFSET + 650) / HYD_PANEL_HEIGHT) + 1;
    for (let index = startIndex; index <= endIndex; index++) {
      const segment = index >= 8 ? hyderabadZone(index * HYD_PANEL_HEIGHT, routeChoice)
        : hydRoute[Math.max(0, Math.min(index, hydRoute.length - 1))];
      const world = hydScenes[segment.art];
      if (!world.complete || !world.naturalWidth) continue;
      const panelTop = 650 + logY + HYD_START_OFFSET - (index + 1) * HYD_PANEL_HEIGHT;
      const iw = world.naturalWidth, ih = world.naturalHeight;
      // Left and right sides are individually aligned to original Hyderabad
      // curbs. This corrects small drift in AI-generated source dimensions.
      const sourceLeft = segment.art === 'pg' ? 291 : segment.art === 'orr' ? 289 : 292;
      const sourceRight = segment.art === 'pg' ? 660 : segment.art === 'orr' ? 633 : 655;
      ctx.drawImage(world, 0, 0, sourceLeft, ih,
        0, panelTop, 182, HYD_PANEL_HEIGHT);
      ctx.drawImage(world, sourceLeft, 0, sourceRight-sourceLeft, ih,
        182, panelTop, 236, HYD_PANEL_HEIGHT);
      ctx.drawImage(world, sourceRight, 0, iw-sourceRight, ih,
        418, panelTop, 182, HYD_PANEL_HEIGHT);
      // Architecturally varied city blocks are deliberately joined at their
      // sidewalks, not superimposed over a frozen single skyline.
    }
    drawSideStreetJoins(ctx, logY);
    drawHyderabadPavement(ctx, logY);
    drawNeighborhoodWear(ctx, logY, routeChoice);
    drawHyderabadJunctions(ctx, logY);
    drawHyderabadRoadSigns(ctx, logY, routeChoice);
    drawSidewalkPeople(ctx, logY, routeChoice);
    drawBusStopLife(ctx,logY);
    ctx.restore();
    return true;
  }

  function drawBusStopLife(ctx,logY) {
    // Static, off-carriageway bus-bay life: people wait, a bus is present,
    // and neither is an invisible collision trap for the player.
    for(const worldY of [3385,5350,6450]) {
      const sy=650-(worldY-logY);
      if(sy<-160||sy>970)continue;
      const bus={t:'v',roadId:'hyderabad',v2VisualKind:'bus',
        isOpposite:true,x:452,sidewalkScale:.70};
      drawEntity(ctx,bus,sy,{},0);
      const crowd=[
        [492,sy-38,sidewalkWoman],
        [520,sy+3,sidewalkMan],
        [545,sy+39,sidewalkWoman]
      ];
      for(const [x,y,sprite] of crowd) {
        if(!sprite.complete||!sprite.naturalWidth)continue;
        ctx.save();ctx.imageSmoothingEnabled=true;
        ctx.fillStyle='rgba(19,25,32,.3)';ctx.beginPath();
        ctx.ellipse(x,y+25,10,5,0,0,Math.PI*2);ctx.fill();
        ctx.drawImage(sprite,x-16,y-25,32,52);
        ctx.restore();
      }
    }
  }

  function drawNeighborhoodWear(ctx, logY, routeChoice) {
    // Persistent, world-anchored street dust and litter. Keep the clean IT
    // blocks clean; don't turn debris into road obstacles or fake potholes.
    const first = Math.floor((logY - 770) / 68);
    const last = Math.ceil((logY + 720) / 68);
    for (let i = first; i <= last; i++) {
      if (i < 0) continue;
      const worldY = i * 68 + 24;
      const zone = hyderabadZone(worldY, routeChoice).key;
      if (zone === 'financial' || zone === 'wipro' || zone === 'gachibowli') {
        if (i % 11 !== 0) continue;
      } else if (zone === 'orr' && i % 3 !== 0) continue;
      const y = 650 - (worldY - logY);
      if (y < -25 || y > 825) continue;
      const side = (i * 7) % 2;
      const x = side ? 429 + ((i * 37) % 18) : 156 - ((i * 17) % 18);
      ctx.save();
      ctx.fillStyle = 'rgba(151,101,62,.30)';
      ctx.beginPath(); ctx.ellipse(x, y, 15+(i%4)*3, 5+(i%3), .2, 0, Math.PI*2); ctx.fill();
      if (i % 4 === 0 && zone === 'gowlidoddy') {
        ctx.fillStyle = 'rgba(201,152,97,.34)';
        ctx.beginPath(); ctx.ellipse(x-8,y+8,20,3,-.08,0,Math.PI*2);ctx.fill();
      }
      if (i % 3 === 0) {
        ctx.fillStyle = i%2 ? '#f4d958' : '#d95843';
        ctx.fillRect(x+(i%9)-4, y-3, 5, 3);
        ctx.fillStyle = '#e4cbb0'; ctx.fillRect(x-8, y+2, 4, 2);
      }
      ctx.restore();
    }
  }

  function drawSideStreetJoins(ctx, logY) {
    // A scene-tile boundary is NOT a traffic junction. The former fake
    // 70px-wide black roads on each sidewalk were disconnected from traffic
    // and looked like floating bridges. Only the two signalized crossings
    // in drawHyderabadJunctions are real intersections.
    const first=Math.floor((logY+HYD_START_OFFSET-900)/HYD_PANEL_HEIGHT);
    const last=Math.ceil((logY+HYD_START_OFFSET+900)/HYD_PANEL_HEIGHT);
    for(let i=first;i<=last;i++) {
      if(i<=0) continue;
      const y=650+logY+HYD_START_OFFSET-i*HYD_PANEL_HEIGHT;
      if(y<-22||y>822) continue;
      for (const x0 of [0,418]) {
        // Small paving transition masks mismatched photo seams without
        // inventing a junction where there is no cross traffic.
        ctx.fillStyle='rgba(210,154,113,.74)';
        ctx.fillRect(x0,y-9,182,18);
        ctx.fillStyle='rgba(246,198,149,.65)';
        for(let x=x0+(i%2)*10;x<x0+182;x+=24)ctx.fillRect(x,y-8,10,6);
        ctx.fillStyle='rgba(117,77,68,.32)';
        for(let x=x0+8;x<x0+182;x+=24)ctx.fillRect(x,y+2,11,2);
      }
      if(regionalCanopy.complete&&regionalCanopy.naturalWidth) {
        // Scene panels can switch architecture abruptly. Tree crowns on the
        // OUTER edges hide the art join but leave the walking corridor open.
        ctx.drawImage(regionalCanopy,-15,y-74,160,148);
        ctx.drawImage(regionalCanopy,455,y-74,160,148);
      }
    }
  }

  function drawHyderabadPavement(ctx, logY) {
    // Cover baked-in markings with textured asphalt from the same painting;
    // then redraw correct, moving dashes at x=242/358 and curb stones.
    const base = hydScenes.pg;
    if (!base.complete || !base.naturalWidth) return;
    const sy = 430, sw = 22;
    for (const x of [242, 358]) {
      ctx.drawImage(base, sy, 0, sw, base.naturalHeight,
        x - 5, -((logY + 650) % HYD_PANEL_HEIGHT), 10, HYD_PANEL_HEIGHT);
      ctx.drawImage(base, sy, 0, sw, base.naturalHeight,
        x - 5, HYD_PANEL_HEIGHT - ((logY + 650) % HYD_PANEL_HEIGHT), 10, HYD_PANEL_HEIGHT);
      ctx.fillStyle = '#f3eadd';
      for (let y = -95 + (logY % 94); y < 825; y += 94) {
        ctx.fillRect(x - 2, y, 4, 32);
      }
    }
    // ORR's central yellow divider stays yellow, and all curbstones scroll.
    for (let y = -42 + (logY % 44); y < 824; y += 44) {
      for (const x of [179, 418]) {
        ctx.fillStyle = '#eee7d7'; ctx.fillRect(x, y, 7, 22);
        ctx.fillStyle = '#111820'; ctx.fillRect(x, y + 22, 7, 22);
      }
    }
    for (let y = -850 + (logY % 850); y < 950; y += 850) {
      drawDirectionArrow(ctx, 260, y, true);
      drawDirectionArrow(ctx, 356, y, false);
    }
  }

  function drawHyderabadJunctions(ctx, logY) {
    // Real four-way junctions occur at the SAME world-Y as the red-light
    // engine. Roads connect to the central carriageway; no dark bar covers
    // the central lanes. Traffic signals / penalties stay in GameEngine.
    for (const j of [4000, 8000]) {
      const stopY = 650 - (j - logY);
      if (stopY < -150 || stopY > 940) continue;
      const y = stopY - 110;
      ctx.fillStyle = '#45464c';
      ctx.fillRect(0,y,183,96);
      ctx.fillRect(417,y,183,96);
      ctx.fillStyle = '#4d4b4c';
      for (let xx=0; xx<182; xx+=39)ctx.fillRect(xx,y+10,26,4);
      for (let xx=424; xx<600; xx+=39)ctx.fillRect(xx,y+10,26,4);
      ctx.strokeStyle = '#f3e8da'; ctx.lineWidth = 3;
      ctx.setLineDash([14,18]);
      ctx.beginPath(); ctx.moveTo(0,y+49); ctx.lineTo(180,y+49);
      ctx.moveTo(420,y+49); ctx.lineTo(600,y+49); ctx.stroke();
      ctx.setLineDash([]);
      // Zebra crossings set back from the central road: the side-road car
      // must yield to pedestrians on the sidewalks at each corner.
      ctx.fillStyle='#f1eee2';
      for (const x of [15,148,420,553]) {
        for(let k=0;k<5;k++)ctx.fillRect(x,y+9+k*16,24,7);
      }
      // Only the actual corner gets curb blocks; the mouth of each arm is
      // open and clearly meets the north/south road.
      ctx.fillStyle='#e9dec9';
      ctx.fillRect(0,y-7,177,6); ctx.fillRect(0,y+96,177,6);
      ctx.fillRect(423,y-7,177,6); ctx.fillRect(423,y+96,177,6);
      ctx.fillStyle='#f0cc4c';
      ctx.fillRect(297,y+21,5,62);
    }
  }

  function drawHyderabadRoadSigns(ctx, logY, routeChoice) {
    const signs = [
      [160, 'SLOW · MARKET'], [3350, 'OFFICE ZONE'],
      [3820, '4-WAY AHEAD'], [7200, 'KEEP LEFT'],
      [8700, routeChoice === 'orr' ? 'SERVICE ROAD' : 'CITY ROAD']
    ];
    for (const [distance, main] of signs) {
      const y = 650 - (distance - logY);
      if (y < -35 || y > 820) continue;
      ctx.save();
      const x = 13, w = 145;
      ctx.fillStyle = '#606560'; ctx.fillRect(x+8,y+3,4,48);
      ctx.fillStyle = '#165342'; ctx.fillRect(x,y-23,w,28);
      ctx.strokeStyle = '#e7eccf'; ctx.lineWidth = 2; ctx.strokeRect(x+2,y-21,w-4,24);
      ctx.fillStyle = '#f6ffdb'; ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace'; ctx.fillText(main,x+w/2,y-5);
      ctx.restore();
    }
  }

  function drawSidewalkPeople(ctx, logY, routeChoice) {
    const first = Math.max(0, Math.floor((logY - 1400)/420));
    const last = Math.floor((logY + 900)/420);
    for(let i=first;i<=last;i++) {
      for (const side of [0,1]) {
        const worldY=i*420+120+(Date.now()/170+(i+side)*97)%280;
        const zone=hyderabadZone(worldY,routeChoice).key;
        if (zone==='orr' && (i+side)%2===0) continue;
        if (zone!=='gowlidoddy' && (i+side)%3===0) continue;
        const sy=650-(worldY-logY);
        if(sy<-90||sy>890)continue;
        // The game is vertical. WALKERS must be seen from BEHIND moving
        // up/down sidewalks, not side-view people striding horizontally.
        drawFootpathWalker(ctx,side===0?154:444,sy,
          (i+side)%2?'woman':'man',i+side);
      }
    }
  }

  function drawFootpathWalker(ctx, x, y, gender, phase) {
    const sprite=gender==='woman'?sidewalkWoman:sidewalkMan;
    if(!sprite.complete||!sprite.naturalWidth)return;
    const w=47,h=77,upper=.71;
    ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=true;
    // The upper body stays anchored while each leg takes the opposite step.
    // Moving both legs together looked like sliding or hopping in place.
    ctx.drawImage(sprite,0,0,sprite.naturalWidth,sprite.naturalHeight*upper,
      -w/2,-h/2,w,h*upper);
    const gait=Math.sin(Date.now()/205+phase*1.8)*3.1;
    for(const side of [0,1]) {
      ctx.save();ctx.beginPath();
      ctx.rect(side ? 0 : -w/2,-h/2+h*upper,w/2,h*(1-upper)+4);
      ctx.clip();
      ctx.drawImage(sprite,-w/2,-h/2+(side ? gait : -gait),w,h);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawNightStreetFood(ctx,logY,routeChoice='orr') {
    if(!nightGolgappaCrowd.complete||!nightGolgappaCrowd.naturalWidth)return;
    // Night-only pani puri bustle belongs by hostels, never in office parks.
    for(const [distance,side] of [[610,0],[1620,1],[2480,0]]) {
      if(hyderabadZone(distance,routeChoice).key!=='gowlidoddy')continue;
      const sy=650-(distance-logY);
      if(sy<-170||sy>960)continue;
      const x=side?424:7,w=166,h=220;
      ctx.save();ctx.translate(curveShift(logY,sy),0);
      const glow=ctx.createRadialGradient(x+w/2,sy-25,7,x+w/2,sy-25,123);
      glow.addColorStop(0,'rgba(255,190,75,.34)');
      glow.addColorStop(1,'rgba(255,169,54,0)');
      ctx.fillStyle=glow;ctx.fillRect(x-15,sy-140,w+30,260);
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(nightGolgappaCrowd,x,sy-113,w,h);
      ctx.restore();
    }
  }

  function drawNightAtmosphere(ctx, logY, playerX=262, playerY=650) {
    ctx.save();
    ctx.fillStyle='rgba(4, 12, 36, .59)';
    ctx.fillRect(0,0,600,800);
    const phase=Math.floor(logY/310);
    for(let i=phase-3;i<=phase+4;i++) {
      const y=650-(i*310-logY);
      if(y<-160||y>950) continue;
      for(const x of [162,439]) {
        const pool=ctx.createRadialGradient(x,y,7,x,y,165);
        pool.addColorStop(0,'rgba(255,205,104,.48)');
        pool.addColorStop(.22,'rgba(255,188,90,.20)');
        pool.addColorStop(1,'rgba(255,154,72,0)');
        ctx.fillStyle=pool;ctx.fillRect(x-165,y-165,330,330);
        ctx.fillStyle='#ffdc93';ctx.fillRect(x-5,y-8,10,5);
      }
    }
    // Player headlight beams illuminate the road ahead, not the HUD.
    const light=ctx.createLinearGradient(0,playerY,0,playerY-360);
    light.addColorStop(0,'rgba(255,245,181,.24)');
    light.addColorStop(1,'rgba(255,245,181,0)');
    ctx.beginPath();ctx.moveTo(playerX-8,playerY-40);
    ctx.lineTo(playerX-89,playerY-360);
    ctx.lineTo(playerX+89,playerY-360);
    ctx.lineTo(playerX+8,playerY-40);ctx.closePath();
    ctx.fillStyle=light;ctx.fill();
    ctx.restore();
  }

  function drawHillsBackdrop(ctx, logY) {
    if (!ready('hills')) return false;
    const world = worlds.hills;
    const h = world.naturalHeight * (600 / world.naturalWidth);
    const travel = Math.max(0, h - 800);
    const cameraY = travel - Math.min(travel, Math.max(0, logY) * .34);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(world, 0, -cameraY, 600, h);
    ctx.restore();
    return true;
  }

  function drawPlayer(ctx, vehicle, x, y, angle) {
    const chosen = bikeRiders[vehicle && vehicle.id];
    const sprite = chosen && chosen.complete && chosen.naturalWidth ? chosen : rider;
    if (!sprite.complete || !sprite.naturalWidth) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = true;
    // Keep the vehicle centre at the game's existing registration point.
    // Only the picture changes; physics and collision boxes are untouched.
    ctx.drawImage(sprite, -40, -65, 80, 130);
    ctx.restore();
    return true;
  }

  function drawGarageBike(ctx, vehicle, width, height) {
    const chosen = bikeRiders[vehicle && vehicle.id];
    const sprite = chosen && chosen.complete && chosen.naturalWidth ? chosen : rider;
    ctx.save();
    const grad = ctx.createLinearGradient(0,0,0,height);
    grad.addColorStop(0,'#19333f'); grad.addColorStop(1,'#0a1822');
    ctx.fillStyle = grad; ctx.fillRect(0,0,width,height);
    ctx.fillStyle = 'rgba(255,195,89,.16)';
    ctx.beginPath(); ctx.ellipse(width/2,height-12,64,12,0,0,Math.PI*2);ctx.fill();
    if (sprite.complete && sprite.naturalWidth) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sprite,width/2-49,4,98,height-12);
    } else {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(vehicle.sp, width/2-vehicle.w*3,height/2-vehicle.h*3,vehicle.w*6,vehicle.h*6);
      if (!sprite.complete) sprite.addEventListener('load', () => {
        drawGarageBike(ctx, vehicle, width, height);
      }, {once:true});
    }
    ctx.restore();
  }

  // One presentation kind per entity. Never changes the source object's
  // speed, collision box, rule evaluation or point value.
  function kindFor(e, originals) {
    if (e.t === 'cow' || e.t === 'buf' || e.t === 'dog' || e.t === 'p') {
      return ({cow:'cow',buf:'buffalo',dog:'dog',p:'pedestrian'})[e.t];
    }
    if (e.t !== 'v') return null;
    if (e.v2VisualKind) return e.v2VisualKind;
    if (e.sp === originals.bike) e.v2VisualKind = 'motorcycle';
    else if (e.sp === originals.auto) e.v2VisualKind = 'auto';
    else if (e.sp === originals.bus) {
      // Previously every large vehicle was an identical green rectangle.
      // Give that SAME gameplay class two recognizable visual variants.
      e.v2VisualKind = Math.floor(e.x + e.logY) % 2 ? 'lorry' : 'bus';
    } else if (e.sp === originals.bwm || e.sp === originals.bmwMSeries) {
      e.v2VisualKind = Math.floor(e.x + e.logY) % 2 ? 'car' : 'suv';
    } else e.v2VisualKind = 'car';
    return e.v2VisualKind;
  }

  const trafficCells = {
    motorcycle: [0, 0, 72, 98],
    auto:       [1, 0, 84, 98],
    car:        [2, 0, 86, 102],
    suv:        [0, 1, 88, 112],
    lorry:      [1, 1, 92, 158],
    bus:        [2, 1, 92, 154],
    van:        [0, 0, 85, 125]
  };
  const crossersCells = {
    cow: [0, 0, 68, 57],
    buffalo: [1, 0, 75, 58],
    pedestrian: [0, 1, 62, 75],
    dog: [1, 1, 67, 54]
  };

  function hasCompleteTrafficArt(atlas) {
    const canvas = document.createElement('canvas');
    // Sample the lower half of every cell. A partly decoded PNG can report
    // its original dimensions while returning transparent pixels below the break.
    canvas.width = 24;
    canvas.height = 16;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(atlas, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        let visiblePixels = 0;
        for (let y = row * 8 + 4; y < row * 8 + 8; y++) {
          for (let x = col * 8; x < col * 8 + 8; x++) {
            if (pixels[(y * canvas.width + x) * 4 + 3] > 64) visiblePixels++;
          }
        }
        if (visiblePixels < 2) return false;
      }
    }
    return true;
  }

  function trafficSilhouette(ctx, kind, dw, dh) {
    // Mask out the atlas's decorative export matte so a rectangle never
    // appears on the road. Coordinates are fractions of the draw rectangle.
    const p = kind === 'motorcycle'
      ? [[.40,.01],[.60,.01],[.72,.16],[.89,.25],[.87,.35],[.72,.34],[.64,.50],[.60,.97],[.40,.97],[.36,.50],[.28,.34],[.13,.35],[.11,.25],[.28,.16]]
      : kind === 'auto'
      ? [[.28,.02],[.72,.02],[.82,.13],[.87,.29],[.85,.70],[.70,.94],[.30,.94],[.15,.70],[.13,.29],[.18,.13]]
      : kind === 'lorry' || kind === 'bus'
      ? [[.30,.01],[.70,.01],[.82,.08],[.86,.27],[.86,.83],[.77,.99],[.23,.99],[.14,.83],[.14,.27],[.18,.08]]
      : [[.30,.02],[.70,.02],[.83,.11],[.89,.29],[.87,.82],[.78,.97],[.22,.97],[.13,.82],[.11,.29],[.17,.11]];
    ctx.beginPath();
    p.forEach(([nx,ny],i) => {
      const x = (nx - .5)*dw, y = (ny - .5)*dh;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.clip();
  }

  function drawEntity(ctx, e, sy, originalSprites, roadTilt = 0) {
    const kind = kindFor(e, originalSprites);
    if (!kind) return false;
    const isVehicle = e.t === 'v';
    // True rear-view artwork for vehicles riding away; simply flipping the
    // front-view atlas upside down made cars and bikes look like insects.
    const customVan = isVehicle && kind === 'van' && indianVan.complete && indianVan.naturalWidth;
    const atlas = customVan ? indianVan : isVehicle
      ? (e.isOpposite ? trafficAtlas : trafficRearAtlas)
      : roadsideAtlas;
    if (!atlas.complete || !atlas.naturalWidth) return false;
    if (isVehicle && !customVan && !usableTrafficAtlases.has(atlas)) return false;
    const cell = (isVehicle ? trafficCells : crossersCells)[kind];
    if (!cell) return false;
    const [col, row, cellW, cellH] = cell;
    const useWoman = kind === 'pedestrian' && e.gender === 'woman' &&
      womanPedestrian.complete && womanPedestrian.naturalWidth > 0;
    // Hyderabad/TN paintings have narrow ~56px lanes. Old sprites were as
    // wide as TWO lanes, which made cars overlap and seem to steer at us.
    const cityStreet = e.roadId === 'hyderabad' || e.roadId === 'tamilnadu';
    const visualScale = e.sidewalkScale || (isVehicle ? (cityStreet ? .62 : .82)
      : kind === 'pedestrian' ? .80 : .9);
    const drawW = cellW * visualScale;
    const drawH = cellH * visualScale;
    const sourceW = atlas.naturalWidth / (customVan || !isVehicle ? 2 : 3);
    const sourceH = customVan ? atlas.naturalHeight : atlas.naturalHeight / 2;
    ctx.save();
    ctx.translate(e.x, sy);
    if (isVehicle && roadTilt) ctx.rotate(roadTilt);
    // Objects in the distance should not be the same apparent size as objects
    // next to the rider. This is visual perspective only, not collision logic.
    const depthScale = Math.max(0.65, Math.min(1.08, 0.72 + sy / 1400));
    ctx.scale(depthScale, depthScale);
    ctx.imageSmoothingEnabled = true;
    ctx.shadowBlur = 0;
    // Shadow is fixed to the road before rotating the vehicle graphic.
    // A rotated shadow appears to slide in the air as vehicles pass.
    ctx.fillStyle = 'rgba(6, 9, 14, 0.53)';
    ctx.beginPath();
    ctx.ellipse(0, isVehicle ? drawH * .32 : drawH * .25,
      drawW * (isVehicle ? .33 : .39), isVehicle ? 8 : 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Both atlases have correct heading already: rear view faces away, while
    // oncoming front view faces toward us. No canvas flipping or teleporting.
    if (!isVehicle && e.sx > 0) ctx.scale(-1, 1);
    if (isVehicle && !customVan) trafficSilhouette(ctx, kind, drawW, drawH);
    const characterSheet = useWoman ? womanPedestrian : atlas;
    const charX = useWoman ? 0 : customVan ? (e.isOpposite ? 0 : sourceW) : col * sourceW;
    const charY = useWoman || customVan ? 0 : row * sourceH;
    const charW = useWoman ? womanPedestrian.naturalWidth : sourceW;
    const charH = useWoman ? womanPedestrian.naturalHeight : sourceH;
    if (kind === 'pedestrian' && e.animT > 0) {
      // The supplied sheet is a single walking pose. Animate the LOWER body
      // with a small horizontal stride while the head/torso stay grounded.
      // Never bob the entire person vertically: that reads as jumping.
      const upper = .64;
      ctx.drawImage(characterSheet, charX, charY, charW, charH*upper,
        -drawW/2, -drawH/2, drawW, drawH*upper);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-drawW/2, -drawH/2 + drawH*upper, drawW, drawH*(1-upper));
      ctx.clip();
      const footStep = Math.sin(e.animT / 150) * 2.8;
      ctx.drawImage(characterSheet, charX, charY, charW, charH,
        -drawW/2 + footStep, -drawH/2, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(characterSheet, charX, charY, charW, charH,
        -drawW/2, -drawH/2, drawW, drawH);
    }
    ctx.restore();
    return true;
  }

  function drawTrafficSignal(ctx, mapId, stopY, signalState, oppositeState = 'red') {
    // A painted road never gets an opaque 600px-wide block over it. Keep the
    // exact stop-line Y supplied by the existing rules engine.
    const road = mapId === 'hyderabad' ? [178, 422]
      : mapId === 'tamilnadu' ? [164, 436] : [102, 498];
    const [left, right] = road;
    const width = right - left;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.imageSmoothingEnabled = false;

    // Indian-style zebra crossing is on the far side of the stop line.
    ctx.fillStyle = 'rgba(14, 19, 25, .16)';
    ctx.fillRect(left + 3, stopY - 58, width - 6, 48);
    ctx.fillStyle = '#f6f1df';
    for (let x = left + 9; x + 13 < right - 7; x += 25) {
      ctx.fillRect(x, stopY - 50, 13, 30);
    }

    // Opposite flows stop on OPPOSITE sides of the crossing.  A single long
    // stop line gave the false impression both flows had identical signals.
    ctx.fillStyle = '#f7ebce';
    const twoWay = mapId === 'hyderabad' || mapId === 'tamilnadu';
    const dividerX = 300;
    if (twoWay) {
      ctx.fillRect(left + 5, stopY - 8, dividerX - left - 10, 7);
      ctx.fillRect(dividerX + 5, stopY - 109, right - dividerX - 10, 7);
    } else {
      ctx.fillRect(left + 5, stopY - 8, width - 10, 7);
    }

    const lit = {red:'#fa4051', yellow:'#ffbe3a', green:'#48ed78'};
    const dim = {red:'#4e3037', yellow:'#56472e', green:'#294c37'};
    const polePositions = [left - 17, right + 17];
    for (const [index, x] of polePositions.entries()) {
      const poleY = twoWay && index === 1 ? stopY - 100 : stopY;
      const directionState = twoWay && index === 1 ? oppositeState : signalState;
      // Raised roadside foundation, steel pole and yellow/black hazard bands.
      ctx.fillStyle = '#141e28'; ctx.fillRect(x - 9, poleY - 8, 18, 11);
      ctx.fillStyle = '#4c5563'; ctx.fillRect(x - 4, poleY - 104, 8, 97);
      for (let yy = poleY - 102; yy < poleY - 8; yy += 13) {
        ctx.fillStyle = '#f2bd35'; ctx.fillRect(x - 4, yy, 8, 6);
      }
      // Three distinct circular lights in a real vertical housing.
      ctx.fillStyle = '#05090e'; ctx.fillRect(x - 15, poleY - 180, 30, 78);
      ctx.fillStyle = '#34404a'; ctx.fillRect(x - 12, poleY - 177, 24, 72);
      ctx.fillStyle = '#0d141c'; ctx.fillRect(x - 10, poleY - 175, 20, 68);
      ['red','yellow','green'].forEach((color, index) => {
        const active = directionState === color;
        const cy = poleY - 163 + index * 22;
        ctx.beginPath(); ctx.arc(x, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = active ? lit[color] : dim[color];
        if (active) {
          ctx.shadowColor = lit[color]; ctx.shadowBlur = 10;
        }
        ctx.fill(); ctx.shadowBlur = 0;
        if (active) {
          ctx.fillStyle = 'rgba(255,255,255,.8)';
          ctx.fillRect(x - 3, cy - 4, 3, 3);
        }
      });
    }
    ctx.restore();
  }

  return { ready, riderReady, drawWorld, drawCurvedScene, curveShift,
    drawHillsBackdrop, drawPlayer, drawGarageBike, drawEntity,
    drawTrafficSignal, hyderabadZone, drawNightAtmosphere, drawNightStreetFood };
})();
