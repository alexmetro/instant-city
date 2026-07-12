/* =====================================================================
   LAYER effects (slot 9) — OWNS weather/wet state visuals, smoke/fire glow, night lighting, sky/light rig,
   contact shadows, ghost overlay. NOTE: the Dec-1849 fire block still contains the structure-damage
   vertex work that layers-spec.md assigns to buildings — an interleave carried over verbatim by the
   Great Split (pure code motion); splitting it is a future declared-seam sprint. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 7 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 04 — sky dome + light rig (day/night cycle repaints these) */
/* =====================================================================
   SKY DOME
   ===================================================================== */
var SKY_R = 24000; // s46: encloses the camera at the raised 15km ceiling over the rect domain
var skyGeo = new THREE.SphereGeometry(SKY_R, 24, 16);
var skyColors = new Float32Array(skyGeo.attributes.position.count*3);
skyGeo.setAttribute("color", new THREE.BufferAttribute(skyColors,3));
var skyMat = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false });
var sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

function paintSky(zenith, horizon){
  var pos = skyGeo.attributes.position;
  var col = skyGeo.attributes.color;
  for(var i=0;i<pos.count;i++){
    var y = pos.getY(i)/SKY_R; // -1..1
    var t = smoothstep(-0.05, 0.55, y);
    var c = horizon.clone().lerp(zenith, t);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

/* =====================================================================
   LIGHTS
   ===================================================================== */
/* EARTH PALETTE LAW (s62, grounding.md §9): the old rig summed to a ~1.6x
   multiplier on flat noon ground (sun 1.1·0.96 + hemi 0.55·sky + amb 0.12),
   clipping any albedo above ~0.62 toward white — HALF of the user's
   "ground almost white" finding was over-lighting, not albedo. The day rig
   now sums to ~1.03x on sunlit flat ground (nothing clips; rendered value
   ≈ albedo), with slopes/shadow sides keeping real depth. */
var sun = new THREE.DirectionalLight(0xfff1d0, 0.72);
sun.position.set(500,800,300);
scene.add(sun);
var hemi = new THREE.HemisphereLight(0x9fb4d8, 0x6b5a3e, 0.30);
scene.add(hemi);
var ambient = new THREE.AmbientLight(0xffffff, 0.09);
scene.add(ambient);

/* @P1850-CHUNK 15 — chimney smoke */
/* =====================================================================
   CHIMNEY SMOKE (A6) — a handful of soft, drifting puffs per chimney
   (procedural canvas sprite, no external asset), animated by rewriting
   a small Points buffer each frame. Total point count is tiny (a few
   chimneys x a few puffs) so the per-frame JS cost is negligible; the
   whole system is one draw call.
   ===================================================================== */
var smokePuffs = [];
var smokeMesh = null;
if(chimneySpots.length>0){
  (function buildSmoke(){
    var cv = document.createElement("canvas"); cv.width=cv.height=64;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,"rgba(235,230,220,0.55)");
    g.addColorStop(0.5,"rgba(235,230,220,0.22)");
    g.addColorStop(1,"rgba(235,230,220,0)");
    ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
    var tex = new THREE.CanvasTexture(cv);

    var perChimney = 5;
    chimneySpots.forEach(function(spot){
      for(var i=0;i<perChimney;i++){
        smokePuffs.push({
          base:spot, t:i/perChimney, speed:0.09+rngBuild()*0.03,
          swayPhase:rngBuild()*Math.PI*2, swayAmp:0.4+rngBuild()*0.3
        });
      }
    });
    var n = smokePuffs.length;
    var positions = new Float32Array(n*3);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions,3));
    var mat = new THREE.PointsMaterial({ map:tex, size:2.6, color:0xe8e2d4, transparent:true, opacity:0.4,
      depthWrite:false, sizeAttenuation:true, fog:true });
    smokeMesh = new THREE.Points(geo, mat);
    scene.add(smokeMesh);
  })();
}
function updateSmoke(dt){
  if(!smokeMesh) return;
  var pos = smokeMesh.geometry.attributes.position;
  for(var i=0;i<smokePuffs.length;i++){
    var p = smokePuffs[i];
    p.t += dt*p.speed;
    if(p.t>1) p.t -= 1;
    var rise = p.t*4.2;
    var sway = Math.sin(p.t*Math.PI*2+p.swayPhase)*p.swayAmp*p.t;
    pos.setXYZ(i, p.base.x+sway, p.base.y+rise, p.base.z+sway*0.6);
  }
  pos.needsUpdate = true;
}

/* @P1850-CHUNK 25 — weather + seasons, rain, fog banks, wet tint */
/* =========================================================================
   5. WEATHER + SEASONS — Tennent's real rain-year series starts Aug 14,
   1849 (weather-climate.md §4); the one rain-year that overlaps this
   phase's July-1846-to-Dec-1849 window is 1849-50, the real "mud winter"
   (33.10", clearly wet vs. the ~21.5" long-run mean) — years before that
   have no instrumental record, so they get a normal placeholder per that
   chapter's own explicit suggestion. Rainy season Nov-Mar; summer fog/wind
   cycle May-Sep (also documented in that chapter).
   ========================================================================= */
function rainYearIntensity(day){
  var d = dateFromSimDay(day);
  var y = d.getUTCFullYear(), m = d.getUTCMonth();
  var rainYearStart = (m>=6) ? y : y-1; // a "rain year" runs Jul->Jun
  return (rainYearStart>=1849) ? 1.55 : 1.0; // 1849-50 mud winter vs. normal placeholder
}
function isRainySeasonMonth(m){ return m>=10 || m<=2; } // Nov(10)-Mar(2)
/* THE MUD WINTER (GAPS-2026-07-10 top-build #3; round-1 item 10; claims
   clm:env:30 / clm:env:31 / clm:timeline:77 / clm:timeline:172 / clm:econ:80).
   Documented, hard-dated: rains "commenced on the 2nd of November" 1849 and
   fell "almost daily"; mud to five feet; horses/mules/drays "literally
   swallowed up"; residents improvised crossings from planks, tobacco-boxes,
   barrels, packing cases (weather-climate.md §2, Annals via FoundSF "State
   of Streets 1849"). Era-gated STRICTLY to that documented window — ramps in
   from Nov 2 1849 as the daily rains accumulate, would ramp out toward the
   season's end (Mar 1850) if the sim ran past its current Dec-31-1849 end.
   Everything below (wet floor, deep-mud street tint, puddle decals, plank/
   crate crossing props) keys off this one factor. */
var MUD_WINTER_START = eventDateToSimDay("1849-11-02"); // timeline-spine.md 1849-11-02
var MUD_WINTER_END   = eventDateToSimDay("1850-03-01"); // rainy season tail (Nov-Mar)
function mudWinterFactor(day){
  if(day < MUD_WINTER_START || day > MUD_WINTER_END) return 0;
  var rampIn  = smoothstep(MUD_WINTER_START, MUD_WINTER_START+12, day); // ~2 weeks of daily rain to churn the streets
  var rampOut = 1 - smoothstep(MUD_WINTER_END-20, MUD_WINTER_END, day);
  return rampIn*rampOut;
}
var weatherState = { wet:0, summerFog:0, rainy:false, mud:0 };
function updateWeather(){
  var d = dateFromSimDay(simDay);
  var m = d.getUTCMonth();
  var rainy = isRainySeasonMonth(m);
  var noise = fbm(simDay*0.35, 7.3, 3);
  var wet = rainy ? clamp01((noise-0.30)*1.9)*rainYearIntensity(simDay) : 0;
  var mudF = mudWinterFactor(simDay);
  // "rains fell almost daily" (Annals): during the documented mud winter the
  // dice still vary intensity, but wetness never drops to a dry street.
  if(mudF>0) wet = Math.max(wet, mudF*(0.35 + 0.4*clamp01((noise-0.2)*1.6)));
  var summer = (!rainy && m>=4 && m<=8) ? clamp01((fbm(simDay*0.5,41.7,3)-0.32)*2.4) : 0;
  weatherState.wet = clamp01(wet);
  weatherState.summerFog = summer;
  weatherState.rainy = rainy;
  weatherState.mud = mudF;
}

/* rain streaks — a small world-space box of falling points that rides
   under the camera, same pattern as the A1 detail patch below */
var RAIN_COUNT = 480;
var rainGeo = new THREE.BufferGeometry();
(function(){
  var pos = new Float32Array(RAIN_COUNT*3);
  for(var i=0;i<RAIN_COUNT;i++){ pos[i*3]=(Math.random()-0.5)*460; pos[i*3+1]=Math.random()*200; pos[i*3+2]=(Math.random()-0.5)*460; }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(pos,3));
})();
var rainMat = new THREE.PointsMaterial({ color:0xc4d2d6, size:1.5, transparent:true, opacity:0, depthWrite:false, fog:true, sizeAttenuation:true });
var rainMesh = new THREE.Points(rainGeo, rainMat);
scene.add(rainMesh);
function updateRain(dt, camX, camZ, alt){
  var wet = weatherState.wet * (1-smoothstep(1300,2400,alt));
  rainMesh.visible = wet>0.03;
  rainMat.opacity = clamp01(wet*0.85);
  if(!rainMesh.visible) return;
  var pos = rainGeo.attributes.position;
  for(var i=0;i<RAIN_COUNT;i++){
    var y = pos.getY(i) - (55+((i*37)%20))*dt;
    if(y<0){ y = 180+Math.random()*20; pos.setX(i,(Math.random()-0.5)*460); pos.setZ(i,(Math.random()-0.5)*460); }
    pos.setY(i,y);
  }
  pos.needsUpdate = true;
  rainMesh.position.set(camX,0,camZ);
}

/* summer fog banks drifting through the Gate — reuses the chimney-smoke
   canvas-sprite technique, just bigger and softer */
function makeFogTexture(){
  var cv=document.createElement("canvas"); cv.width=cv.height=128;
  var ctx=cv.getContext("2d");
  var g=ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,"rgba(233,237,234,0.55)"); g.addColorStop(0.6,"rgba(228,231,226,0.22)"); g.addColorStop(1,"rgba(228,231,226,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(cv);
}
var fogBanks = [];
(function buildFogBanks(){
  var tex = makeFogTexture();
  for(var i=0;i<6;i++){
    var mat = new THREE.SpriteMaterial({ map:tex, transparent:true, opacity:0, depthWrite:false, fog:false });
    var spr = new THREE.Sprite(mat);
    spr.scale.set(1600+rngBuild()*700, 400+rngBuild()*180, 1);
    var baseX = -4200+rngBuild()*900;
    spr.position.set(baseX, 60+rngBuild()*70, -3500+(rngBuild()-0.5)*1400);
    scene.add(spr);
    fogBanks.push({ spr:spr, phase:rngBuild()*10, baseX:baseX });
  }
})();
function updateFogBanks(dt){
  var s = weatherState.summerFog;
  fogBanks.forEach(function(f){
    f.phase += dt*0.045;
    f.spr.position.x = f.baseX + Math.sin(f.phase)*480;
    f.spr.material.opacity = s*0.5*(0.6+0.4*Math.sin(f.phase*1.7));
  });
}

/* wet-darkened ground + mud-brown streets: these materials' colors are
   multiplied over their vertex colors / texture (left at white so far),
   so animating that color toward a wet/mud tint darkens everything
   cheaply with no new geometry. The ground splat's two overlay materials
   (splatWorldMat/splatTownMat, see GROUND SPLAT-MAP) get the same
   treatment the old streetsMesh/stubMesh materials did. */
var GROUND_DRY = new THREE.Color(0xffffff), GROUND_WET = new THREE.Color(0xc9c2ac);
var STREET_DRY = new THREE.Color(0xffffff), STREET_MUD = new THREE.Color(0x8a6f4a);
var STREET_MUD_DEEP = new THREE.Color(0x655039); // churned 1849-50 deep mud (clm:env:30 "mud to five feet" — depicted as tone, not geometry)
var _wetTint = new THREE.Color();
var WET_OVERRIDE = null; // s60 QA: __P1850.wetOverride forces the wet/mud state for closeup verification
function updateWetTint(){
  var wet = WET_OVERRIDE!=null ? WET_OVERRIDE : weatherState.wet;
  var mudF = WET_OVERRIDE!=null ? WET_OVERRIDE : weatherState.mud;
  terrainMat.color.copy(GROUND_DRY).lerp(GROUND_WET, Math.max(wet*0.4, mudF*0.5));
  _wetTint.copy(STREET_DRY).lerp(STREET_MUD, Math.max(wet*0.6, mudF*0.85));
  if(mudF>0) _wetTint.lerp(STREET_MUD_DEEP, mudF*0.55); // documented winter reads darker than an ordinary wet day
  splatWorldMat.color.copy(_wetTint);
  splatTownMat.color.copy(_wetTint);
  splatCloseMat.color.copy(_wetTint);
  // GROUND MATERIALITY (s52): the detail layer reads the SAME signal —
  // mud cracks fill/pool and town-dirt clods churn to mud micro-variance
  var _dWet = Math.max(wet*0.85, mudF);
  for(var di=0; di<DETAIL_UNIFORM_SETS.length; di++) DETAIL_UNIFORM_SETS[di].uDetailWet.value = _dWet;
}

/* @P1850-CHUNK 34 — grounding contact shadows */
/* =====================================================================
   GROUNDING CONTACT SHADOWS (close-range legibility fix, 2026-07-10):
   buildings and (later) people previously sat on the ground with no
   contact shading at all — floating on close-range screenshots. No real
   shadow-mapping (far too costly for this many instanced draws); instead
   one shared soft dark radial-gradient decal, dropped flat on the ground
   as a plain textured plane. Buildings get a STATIC InstancedMesh (one
   draw call, baked once here since VILLAGE_BUILDING_SPOTS never moves);
   people reuse the same texture on a small per-frame InstancedMesh set
   further down (personShadowMesh, updated inside updatePeople() since
   that loop already visits every active person once per frame for free).
   ===================================================================== */
function makeContactShadowTexture(){
  var cv = document.createElement("canvas"); cv.width=cv.height=64;
  var ctx = cv.getContext("2d");
  var g = ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,"rgba(18,14,9,0.55)"); g.addColorStop(0.55,"rgba(18,14,9,0.30)"); g.addColorStop(1,"rgba(18,14,9,0)");
  ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
var CONTACT_SHADOW_TEX = makeContactShadowTexture();
var buildingShadowMesh = (function(){
  var geo = new THREE.PlaneGeometry(1,1); geo.rotateX(-Math.PI/2);
  var mat = new THREE.MeshBasicMaterial({ map:CONTACT_SHADOW_TEX, transparent:true, depthWrite:false, opacity:0.9 });
  var mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, VILLAGE_BUILDING_SPOTS.length));
  var m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  VILLAGE_BUILDING_SPOTS.forEach(function(spot, i){
    var w = (spot.w||4)*1.3, d = (spot.d||4)*1.3; // a touch bigger than the footprint so it reads as a base shadow, not a floor tile
    q.setFromAxisAngle(new THREE.Vector3(0,1,0), spot.rot||0);
    m4.compose(new THREE.Vector3(spot.x, spot.y+0.04, spot.z), q, new THREE.Vector3(w,1,d));
    mesh.setMatrixAt(i, m4);
  });
  mesh.count = VILLAGE_BUILDING_SPOTS.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.renderOrder = -1; // paint before the streets/scatter/etc. it sits under so it never wins a coplanar depth tie
  scene.add(mesh);
  return mesh;
})();

/* @P1850-CHUNK 48 — mud-winter street props (puddles + planks) */
/* ---- 2. mud-winter street props (strictly gated on weatherState.mud) ---- */
function makePuddleTexture(){
  var cv=document.createElement("canvas"); cv.width=cv.height=64;
  var ctx=cv.getContext("2d");
  var g=ctx.createRadialGradient(32,32,2,32,32,32);
  g.addColorStop(0,"rgba(255,255,255,0.92)"); g.addColorStop(0.6,"rgba(255,255,255,0.7)"); g.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
var PUDDLE_CAP = 64;
var puddleMesh = (function(){
  var geo = new THREE.CircleGeometry(1,10); geo.rotateX(-Math.PI/2);
  var mat = new THREE.MeshBasicMaterial({ map:makePuddleTexture(), color:0x4e4a42, transparent:true, opacity:0, depthWrite:false });
  var mesh = new THREE.InstancedMesh(geo, mat, PUDDLE_CAP);
  var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), v=new THREE.Vector3(), s=new THREE.Vector3();
  var n=0;
  for(var i=0;i<STREET_GRAPH.nodes.length && n<PUDDLE_CAP;i++){
    var nd = STREET_GRAPH.nodes[i];
    if(nd.key.indexOf("camp_")===0 || nd.key.indexOf("mroad_")===0 || nd.key==="mission") continue;
    if(Math.hypot(nd.x-PLAZA_CENTER.x, nd.z-PLAZA_CENTER.z)>250) continue;
    for(var k=0;k<2 && n<PUDDLE_CAP;k++){
      var px = nd.x+(rngBuild()-0.5)*10, pz = nd.z+(rngBuild()-0.5)*10;
      var py = terrainHeight(px,pz);
      if(py<0.5) continue;
      var sx = 1.0+rngBuild()*1.5;
      q.setFromAxisAngle(_UP, rngBuild()*Math.PI);
      v.set(px, py+0.07, pz); s.set(sx, 1, sx*(0.5+rngBuild()*0.3));
      m4.compose(v,q,s);
      mesh.setMatrixAt(n++, m4);
    }
  }
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
})();
var mudPlankMesh = (function(){
  // "16 to 24 feet long" period planks (infrastructure.md, sidewalks/planking);
  // sunken crates/barrels = the documented improvised paving (clm:econ:80).
  var geoms = [];
  var crateC = new THREE.Color(0x8a6f4f), barrelC = new THREE.Color(0x74583c);
  var nodes = STREET_GRAPH.nodes.filter(function(nd){
    return /^[a-z]+_[a-z]+$/.test(nd.key) && nd.key.indexOf("camp_")!==0 &&
      Math.hypot(nd.x-PLAZA_CENTER.x, nd.z-PLAZA_CENTER.z)<230 && terrainHeight(nd.x,nd.z)>0.5;
  }).slice(0,12);
  nodes.forEach(function(nd){
    for(var k=0;k<2;k++){
      var px = nd.x+(rngBuild()-0.5)*8, pz = nd.z+(rngBuild()-0.5)*8;
      var yw = rngBuild()*Math.PI;
      var len = 4.9+rngBuild()*2.4; // 16-24 ft
      for(var pI=0;pI<2;pI++){
        var tone = new THREE.Color(0x9a835f).lerp(new THREE.Color(0x77664a), rngBuild());
        var plank = makeBoxLocal(0.34,0.07,len, tone);
        var ox = Math.cos(yw)*(pI*0.44), oz = -Math.sin(yw)*(pI*0.44);
        bake(plank, new THREE.Vector3(px+ox, terrainHeight(px+ox,pz+oz)+0.09, pz+oz), yw+(rngBuild()-0.5)*0.08);
        geoms.push(plank);
      }
    }
    if(rngBuild()<0.45){ // half-sunk packing case
      var cx2 = nd.x+(rngBuild()-0.5)*9, cz2 = nd.z+(rngBuild()-0.5)*9;
      var crate = makeBoxLocal(0.85,0.8,0.85, crateC);
      bake(crate, new THREE.Vector3(cx2, terrainHeight(cx2,cz2)-0.32, cz2), rngBuild()*Math.PI);
      geoms.push(crate);
    }
    if(rngBuild()<0.3){ // half-sunk barrel of spoiled provisions
      var bx = nd.x+(rngBuild()-0.5)*9, bz = nd.z+(rngBuild()-0.5)*9;
      var barrel = new THREE.CylinderGeometry(0.32,0.32,0.8,8).toNonIndexed();
      barrel.translate(0,0.4,0);
      colorizeUniform(barrel, barrelC);
      bake(barrel, new THREE.Vector3(bx, terrainHeight(bx,bz)-0.28, bz), 0);
      geoms.push(barrel);
    }
  });
  var m = new THREE.Mesh(mergeGeoms(geoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}));
  m.visible = false;
  scene.add(m);
  return m;
})();

/* @P1850-CHUNK 54 — then/now ghost overlay + the Dec 24 1849 Great Fire */
/* =====================================================================
   THEN/NOW GHOST OVERLAY  ('G' toggles; fades in above ~500m)
   ===================================================================== */
var ghostVisible = false;
var ghostGroup = new THREE.Group();
(function buildGhost(){
  var pts = [];
  for(var z=-1300; z<=1300; z+=25){
    pts.push(new THREE.Vector3(modernShorelineX(z), 6, z));
  }
  var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  var lineMat = new THREE.LineBasicMaterial({ color:0xbfe8ea, transparent:true, opacity:0, fog:false, linewidth:2 });
  var shoreLine = new THREE.Line(lineGeo, lineMat);
  ghostGroup.add(shoreLine);

  // a hint of the modern grid — a few long straight cross-lines over the filled land
  var gridMat = new THREE.LineBasicMaterial({ color:0xbfe8ea, transparent:true, opacity:0, fog:false });
  for(var gz=-1000; gz<=1000; gz+=250){
    var gx0 = shorelineX(gz)-60, gx1 = modernShorelineX(gz)+120;
    var gpts = [new THREE.Vector3(gx0,6,gz), new THREE.Vector3(gx1,6,gz)];
    ghostGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(gpts), gridMat));
  }
  ghostGroup.userData.mats = [lineMat, gridMat];
  scene.add(ghostGroup);
})();
/* s54: G and T are now named functions so the ☰ menu rows (the no-keyboard
   touch path) drive the exact same code as the keys. */
function setGhost(on){
  ghostVisible = on;
  document.getElementById("hud-ghost").classList.toggle("on", ghostVisible);
}
function skipToSunriseSunset(){
  // T FIX (fix sprint 2026-07-11 #2): advance the SIM clock to the next
  // sunrise or sunset — the lighting now derives from the sim clock, so
  // this is a real (small) time jump and round-trips cleanly:
  // pre-dawn -> sunrise -> sunset -> next sunrise -> ...
  var f = Math.floor(simDay), h = (simDay-f)*24;
  var sp = daylightSpanForDay(simDay);
  if(h < sp.sunrise-1/60)      simDay = clamp(f + sp.sunrise/24, 0, SIM_END_DAY);
  else if(h < sp.sunset-1/60)  simDay = clamp(f + sp.sunset/24, 0, SIM_END_DAY);
  else { var sp2 = daylightSpanForDay(f+1); simDay = clamp(f+1 + sp2.sunrise/24, 0, SIM_END_DAY); }
  updateHashDate();
}
window.addEventListener("keydown", function(e){
  if(e.key==="g"||e.key==="G") setGhost(!ghostVisible);
  if(e.key==="t"||e.key==="T") skipToSunriseSunset();
});

/* =========================================================================
   PHASE 5 — "THE FATES": THE FIRST GREAT FIRE (Dec 24, 1849)
   Everything below is driven by the spine record (data/events.jsonl,
   1849-12-24, confidence hard) and the Alta California's own report of
   Dec 26, 1849 (corpus DAC18491226, "APPALLING AND DESTRUCTIVE
   CONFLAGRATION!!"): fire discovered "at about one quarter before 6
   o'clock" at Dennison's Exchange; "the morning was still, scarcely a
   breath of air" (weather-climate.md confirms: NO wind — spread was
   building-to-building through flimsy wood-and-cloth structures); powder
   demolitions by order of the authorities (Ayres' store, the Merchants'
   Exchange, Geurschard & Van Beuren); "At about 12 M., the last burning
   building came down." Six hours, ~50 buildings, one block.
   ========================================================================= */
var FIRE = (function(){
  var kU=GEO.streetsU.kearny, mU=GEO.streetsU.montgomery;
  // CLAY/WASHINGTON SWAP FIX (2026-07-10): same fix as buildFireBlock()
  // above (and for the same reason) — nV/sV name the block's edges by
  // compass direction so inFootprint()'s range check stays a valid
  // (small,big) range regardless of which street now owns which value;
  // reading cV=clay/wV=washington directly and assuming cV<wV (the OLD,
  // buggy ordering) would make the range empty post-fix (clay>washington
  // now), silently zeroing out the fire entirely (0 buildings "in
  // footprint" — this is the Dec 24 1849 fire, the screening's own
  // highest-praised frame, so this bug would have been very visible).
  var nV = Math.min(GEO.streetsV.clay, GEO.streetsV.washington); // north edge = Washington St
  var sV = Math.max(GEO.streetsV.clay, GEO.streetsV.washington); // south edge = Clay St
  var igniteDay = eventDateToSimDay("1849-12-24") + 5.75/24;  // 5:45 a.m., per the Alta
  var endDay    = eventDateToSimDay("1849-12-24") + 12.1/24;  // "at about 12 M. ... at an end"
  var center = gridToWorld((kU+mU)/2, (nV+sV)/2);
  // demolition schedule, hours after ignition — the Alta's narrative order:
  // Ayres' store during the El Dorado's burning, the Merchants' Exchange
  // next, Geurschard & Van Beuren as the fire neared Montgomery St.
  var DEMO_HOURS = { "B. Ayres store":2.1, "Merchants' Exchange":3.3, "Geurschard & Van Beuren":4.6 };
  var SCORCH_NAMES = { "Verandah":1, "Miners' Bank":1, "Bella Union":1, "Haley House":1, "Delmonico's":1, "Burgoyne & Co. (brick, unfinished)":1 };
  function inFootprint(x,z,margin){
    var g = worldToGridApprox(x,z);
    var m = margin||6;
    return g.u>kU-m && g.u<mU+m && g.v>nV-m && g.v<sV+m;
  }
  var ignitionSpot = null;
  VILLAGE_BUILDING_SPOTS.forEach(function(s){ if(s.isIgnition) ignitionSpot = s; });
  if(!ignitionSpot) ignitionSpot = { x:gridToWorld(kU+8,nV+36).x, z:gridToWorld(kU+8,nV+36).z }; // matches Dennison's Exchange's corrected placement in buildFireBlock()

  var burn = [], scorch = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(s){
    if(s.vStart==null) return; // pre-Phase-5 record without a vertex slice (shouldn't happen)
    if(s.name && SCORCH_NAMES[s.name]){ scorch.push({ spot:s, scorchH: 1.2 + Math.hypot(s.x-ignitionSpot.x, s.z-ignitionSpot.z)/40 }); return; }
    if(!inFootprint(s.x,s.z,6) || s.fireproof) return;
    var dIgn = Math.hypot(s.x-ignitionSpot.x, s.z-ignitionSpot.z);
    var jit = hash2(s.x*0.117, s.z*0.117);
    var igniteH = s.isIgnition ? 0 : clamp(0.25 + dIgn/26 + jit*0.6, 0.2, 4.8); // ~26 m/h no-wind crawl across the block
    var demoH = s.name!=null ? DEMO_HOURS[s.name] : undefined;
    var burnDur = 0.8 + jit*0.7;
    var collapseH = (demoH!=null) ? demoH : Math.min(igniteH + burnDur, 6.1);
    if(demoH!=null) igniteH = Math.min(igniteH, demoH - 0.15);
    burn.push({ spot:s, igniteH:igniteH, collapseH:collapseH, demo:(demoH!=null), jit:jit, groundY:s.y });
  });
  burn.sort(function(a,b){ return a.igniteH-b.igniteH; });
  console.log("[verify] fire footprint:", burn.length, "buildings burn,", scorch.length, "scorched survivors (record: ~50 destroyed).");

  return {
    day0: igniteDay, day1: endDay,
    rebuildDay: eventDateToSimDay("1849-12-26"),  // "Rebuilding begins Dec 26" (spine)
    rebuildDur: 12,                                // sim-days to full re-raise; partially risen by the era's Dec 31 end — the town rebuilt fast
    cx: center.x, cz: center.z,
    burn: burn, scorch: scorch, inFootprint: inFootprint,
    spectatorSpots: [ // the documented crowd: "Portsmouth square ... was crowded with anxious spectators"
      gridToWorld(GEO.streetsU.dupont+22, sV-14), gridToWorld(GEO.streetsU.dupont+30, (nV+sV)/2),
      gridToWorld(GEO.streetsU.dupont+22, nV+14), gridToWorld(GEO.streetsU.dupont+48, (nV+sV)/2 - 8)
    ]
  };
})();
var fireGlow = 0;            // 0..1 — drives firelight, sky tint (read by updateDayNight)
var FIRE_RATE = (1/24)/3;    // sim-days per real second while the fire burns: 1 sim-hour / 3 s

function fireClockStep(step, dt){
  if(simDay < FIRE.day0-1e-4 && simDay + step > FIRE.day0){
    return (FIRE.day0 - simDay) + FIRE_RATE*dt*0.25; // never skip the fire: land on its opening
  }
  if(simDay >= FIRE.day0-1e-4 && simDay < FIRE.day1) return Math.min(step, FIRE_RATE*dt);
  return step;
}

/* ---- baseline snapshots of the burn/scorch buildings' vertex slices ---- */
(function snapshotFireSlices(){
  var bPos = buildingsMesh.geometry.attributes.position.array;
  var bCol = buildingsMesh.geometry.attributes.color.array;
  var wPos = windowsMesh.geometry.attributes.position.array;
  function snap(rec){
    var s = rec.spot;
    rec.basePos = bPos.slice(s.vStart*3, s.vEnd*3);
    rec.baseCol = bCol.slice(s.vStart*3, s.vEnd*3);
    rec.baseWin = (s.wEnd>s.wStart) ? wPos.slice(s.wStart*3, s.wEnd*3) : null;
  }
  FIRE.burn.forEach(snap);
  FIRE.scorch.forEach(snap);
})();

/* ---- charred-ground patch over the burned block ---- */
var charPatch = (function(){
  var kU=GEO.streetsU.kearny, mU=GEO.streetsU.montgomery, cV=GEO.streetsV.clay, wV=GEO.streetsV.washington;
  var g = new THREE.PlaneGeometry(Math.abs(mU-kU)-10, Math.abs(wV-cV)-8, 1, 1);
  // three.js rotateY(θ) maps x'=x·cosθ+z·sinθ — the INVERSE sense of
  // gridToWorld's (x = u·cos a − v·sin a) — so aligning this patch with the
  // fire block (post-survey, painted/built at GRID_ROT_BASE) needs -angle.
  // (The old rotateY(+VIOGET_SKEW) was silently 2·2.5° off; invisible at
  // 2.5° but visible at the corrected 9° base rotation.)
  g.rotateX(-Math.PI/2); g.rotateY(-GRID_ROT_BASE);
  var m = new THREE.MeshBasicMaterial({ color:0x191108, transparent:true, opacity:0, depthWrite:false });
  var mesh = new THREE.Mesh(g,m);
  mesh.position.set(FIRE.cx, terrainHeight(FIRE.cx,FIRE.cz)+0.28, FIRE.cz);
  scene.add(mesh);
  return mesh;
})();

/* ---- flame billboards: ONE InstancedMesh (QA-gate: instanced where >10) ---- */
var FLAME_CAP = IS_TOUCH ? 64 : 110;
var flameMesh = (function(){
  var cv = document.createElement("canvas"); cv.width=64; cv.height=96;
  var ctx = cv.getContext("2d");
  var grad = ctx.createRadialGradient(32,66,4, 32,58,54);
  grad.addColorStop(0,"rgba(255,244,190,0.95)");
  grad.addColorStop(0.25,"rgba(255,180,70,0.85)");
  grad.addColorStop(0.55,"rgba(240,90,20,0.5)");
  grad.addColorStop(1,"rgba(140,30,5,0)");
  ctx.fillStyle=grad; ctx.fillRect(0,0,64,96);
  var tex = new THREE.CanvasTexture(cv);
  var geo = new THREE.PlaneGeometry(3.0,5.2); geo.translate(0,2.2,0);
  var mat = new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false,
    blending:THREE.AdditiveBlending, side:THREE.DoubleSide, fog:false });
  var mesh = new THREE.InstancedMesh(geo, mat, FLAME_CAP);
  mesh.count = 0; mesh.frustumCulled = false; scene.add(mesh);
  return mesh;
})();

/* ---- embers + smoke: one Points system each, hard-capped ---- */
var EMBER_CAP = IS_TOUCH ? 140 : 260;
var emberPts = [], emberMesh = (function(){
  var pos = new Float32Array(EMBER_CAP*3);
  var geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
  for(var i=0;i<EMBER_CAP;i++){ pos[i*3+1]=-9999; emberPts.push({ life:0, ttl:0, x:0,y:0,z:0, vx:0,vy:0,vz:0 }); }
  var mat = new THREE.PointsMaterial({ color:0xffa24a, size:1.5, transparent:true, opacity:0.9,
    blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true });
  var m = new THREE.Points(geo, mat); m.visible=false; m.frustumCulled=false; scene.add(m);
  return m;
})();
var FSMOKE_CAP = IS_TOUCH ? 90 : 150;
var fsmokePts = [], fsmokeMesh = (function(){
  var cv = document.createElement("canvas"); cv.width=cv.height=64;
  var ctx=cv.getContext("2d");
  var g2=ctx.createRadialGradient(32,32,0,32,32,32);
  g2.addColorStop(0,"rgba(70,60,50,0.5)"); g2.addColorStop(0.6,"rgba(70,60,50,0.2)"); g2.addColorStop(1,"rgba(70,60,50,0)");
  ctx.fillStyle=g2; ctx.fillRect(0,0,64,64);
  var tex = new THREE.CanvasTexture(cv);
  var pos = new Float32Array(FSMOKE_CAP*3);
  var geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
  for(var i=0;i<FSMOKE_CAP;i++){ pos[i*3+1]=-9999; fsmokePts.push({ life:0, ttl:0, x:0,y:0,z:0, vx:0,vy:0,vz:0 }); }
  var mat = new THREE.PointsMaterial({ map:tex, color:0x574c40, size:11, transparent:true, opacity:0.55,
    depthWrite:false, sizeAttenuation:true, fog:true });
  var m = new THREE.Points(geo, mat); m.visible=false; m.frustumCulled=false; scene.add(m);
  return m;
})();

/* ---- firelight + gunpowder demolition puffs ---- */
var fireLight = new THREE.PointLight(0xff7a30, 0, 460, 2);
fireLight.visible = false; scene.add(fireLight);
var demoPuffs = FIRE.burn.filter(function(b){ return b.demo; }).map(function(b){
  var m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8),
    new THREE.MeshBasicMaterial({ color:0xd9c9a6, transparent:true, opacity:0, depthWrite:false, fog:false }));
  m.visible=false; scene.add(m);
  return { rec:b, mesh:m, fired:false, t:-1 };
});

/* ---- per-frame fire update ---- */
var _fireApplied = false;    // any vertex slice currently differs from baseline
var _fireBurningCount = 0;
function restoreFireSlices(){
  var bPos = buildingsMesh.geometry.attributes.position, bCol = buildingsMesh.geometry.attributes.color;
  var wPos = windowsMesh.geometry.attributes.position;
  FIRE.burn.concat(FIRE.scorch).forEach(function(rec){
    var s = rec.spot;
    bPos.array.set(rec.basePos, s.vStart*3);
    bCol.array.set(rec.baseCol, s.vStart*3);
    if(rec.baseWin) wPos.array.set(rec.baseWin, s.wStart*3);
  });
  bPos.needsUpdate = true; bCol.needsUpdate = true; wPos.needsUpdate = true;
  demoPuffs.forEach(function(p){ p.fired=false; p.t=-1; p.mesh.visible=false; });
  _fireApplied = false;
}
var _flameM4 = new THREE.Matrix4(), _flameQ = new THREE.Quaternion(), _flameV = new THREE.Vector3(), _flameS = new THREE.Vector3();
var _flameAxisY = new THREE.Vector3(0,1,0);
var _fireClock = 0, _fireWasActive = false;
function updateFire(dt){
  _fireClock += dt;
  var active = simDay>=FIRE.day0 && simDay<=FIRE.day1;
  // The fire broke out at a quarter before six on a December morning. The
  // old hand-pin of timeOfDay=0.185 is gone (fix sprint 2026-07-11 #1):
  // lighting now derives from the sim clock, and 5:45 a.m. against a
  // December ~7:15 sunrise IS the pre-dawn dark — dawn then breaks
  // naturally over the burn ("The morning was still...").
  _fireWasActive = active;
  var windowDays = simDay>=FIRE.day0-0.05 && simDay<=FIRE.rebuildDay+FIRE.rebuildDur+1;
  if(!windowDays){
    if(_fireApplied && simDay<FIRE.day0) restoreFireSlices(); // jumped back before the fire
    fireGlow = 0; flameMesh.count = 0; flameMesh.instanceMatrix.needsUpdate = true;
    emberMesh.visible = false; fsmokeMesh.visible = false; fireLight.visible = false;
    charPatch.material.opacity = (simDay>FIRE.day1) ? 0.35 : 0; // char stays through the era's end
    return;
  }
  var tH = (simDay-FIRE.day0)*24; // hours since ignition (negative before)
  var bPos = buildingsMesh.geometry.attributes.position, bCol = buildingsMesh.geometry.attributes.color;
  var wPos = windowsMesh.geometry.attributes.position;
  var burning = [];
  var rebuildT = simDay>=FIRE.rebuildDay ? (simDay-FIRE.rebuildDay) : -1;

  FIRE.burn.forEach(function(rec,bi){
    var s = rec.spot;
    var phase; // 0 normal, 1 burning, 2 collapsed, 3 rebuilding
    if(tH < rec.igniteH) phase = 0;
    else if(tH < rec.collapseH*1 && tH>=rec.igniteH) phase = 1;
    else phase = 2;
    var rise = 0;
    if(phase===2 && rebuildT>=0){
      var stagger = rec.jit*5; // lots re-raise over days, not in lockstep
      rise = smoothstep(stagger, stagger+FIRE.rebuildDur*0.7, rebuildT);
      if(rise>0.02) phase = 3;
    }
    if(phase===1) burning.push(rec);

    var n = s.vEnd - s.vStart;
    var i3, y0, k;
    if(phase===0){
      bPos.array.set(rec.basePos, s.vStart*3);
      bCol.array.set(rec.baseCol, s.vStart*3);
      if(rec.baseWin) wPos.array.set(rec.baseWin, s.wStart*3);
    } else if(phase===1){
      var f = 0.5+0.5*Math.sin(_fireClock*11 + rec.jit*40);
      var heat = clamp01((tH-rec.igniteH)/0.4);
      for(k=0;k<n;k++){
        i3 = k*3;
        bCol.array[s.vStart*3+i3]   = lerp(rec.baseCol[i3],   1.0, heat*(0.6+0.4*f));
        bCol.array[s.vStart*3+i3+1] = lerp(rec.baseCol[i3+1], 0.42, heat*(0.7+0.3*f));
        bCol.array[s.vStart*3+i3+2] = lerp(rec.baseCol[i3+2], 0.10, heat);
      }
      bPos.array.set(rec.basePos, s.vStart*3);
    } else {
      // collapsed char mound, optionally re-rising as fresh pine (phase 3)
      var ember = phase===2 ? Math.max(0, 1-(tH-rec.collapseH)/2) * (0.5+0.5*Math.sin(_fireClock*7+rec.jit*30)) : 0;
      var squash = 0.07 + 0.93*(phase===3 ? rise : 0);
      for(k=0;k<n;k++){
        i3 = k*3;
        y0 = rec.basePos[i3+1];
        bPos.array[s.vStart*3+i3]   = rec.basePos[i3];
        bPos.array[s.vStart*3+i3+1] = rec.groundY + (y0-rec.groundY)*squash;
        bPos.array[s.vStart*3+i3+2] = rec.basePos[i3+2];
        if(phase===3){
          bCol.array[s.vStart*3+i3]   = lerp(0.10, 0.86, rise);
          bCol.array[s.vStart*3+i3+1] = lerp(0.08, 0.77, rise);
          bCol.array[s.vStart*3+i3+2] = lerp(0.06, 0.55, rise);
        } else {
          bCol.array[s.vStart*3+i3]   = 0.10 + ember*0.55;
          bCol.array[s.vStart*3+i3+1] = 0.08 + ember*0.16;
          bCol.array[s.vStart*3+i3+2] = 0.06 + ember*0.03;
        }
      }
      if(rec.baseWin){
        var wn = s.wEnd - s.wStart;
        for(k=0;k<wn;k++){
          i3 = k*3;
          wPos.array[s.wStart*3+i3]   = rec.baseWin[i3];
          wPos.array[s.wStart*3+i3+1] = rec.groundY + (rec.baseWin[i3+1]-rec.groundY)*squash;
          wPos.array[s.wStart*3+i3+2] = rec.baseWin[i3+2];
        }
      }
    }
  });
  // scorched survivors: heat-darkened faces, never collapsed (the Alta:
  // blanket crews on the roofs kept them; Burgoyne's brick stopped the fire)
  FIRE.scorch.forEach(function(rec){
    var s = rec.spot, n = s.vEnd-s.vStart;
    var sc = clamp01((tH-rec.scorchH)/0.8)*0.45;
    for(var k=0;k<n;k++){
      var i3=k*3;
      bCol.array[s.vStart*3+i3]   = rec.baseCol[i3]*(1-sc) + 0.12*sc;
      bCol.array[s.vStart*3+i3+1] = rec.baseCol[i3+1]*(1-sc) + 0.10*sc;
      bCol.array[s.vStart*3+i3+2] = rec.baseCol[i3+2]*(1-sc) + 0.08*sc;
    }
  });
  bPos.needsUpdate = true; bCol.needsUpdate = true; wPos.needsUpdate = true;
  _fireApplied = true;
  _fireBurningCount = burning.length;

  // demolition puffs — "blown up by order of the city authorities"
  demoPuffs.forEach(function(p){
    if(!p.fired && tH >= p.rec.collapseH){ p.fired=true; p.t=0; p.mesh.visible=true;
      p.mesh.position.set(p.rec.spot.x, p.rec.groundY+3, p.rec.spot.z); }
    if(p.fired && p.t>=0){
      p.t += dt;
      var pt = p.t/1.2;
      if(pt>=1){ p.t=-1; p.mesh.visible=false; }
      else { var sc = lerp(3,26,pt); p.mesh.scale.set(sc,sc*0.8,sc); p.mesh.material.opacity = 0.8*(1-pt); }
    }
    if(p.fired && simDay<FIRE.day0){ p.fired=false; p.mesh.visible=false; } // rewind safety
  });

  // flames — up to 3 per burning building, biggest on the named landmarks
  var fi = 0;
  for(var b=0; b<burning.length && fi<FLAME_CAP; b++){
    var rec = burning[b], s = rec.spot;
    var nFl = s.name ? 3 : (s.w>6 ? 2 : 1);
    for(var q=0; q<nFl && fi<FLAME_CAP; q++, fi++){
      var jx = (hash2(s.x+q*7, s.z)-0.5)*s.w*0.8, jz = (hash2(s.x, s.z+q*5)-0.5)*s.d*0.8;
      var flick = 0.75 + 0.45*Math.sin(_fireClock*9 + q*2.4 + rec.jit*50) * (0.6+0.4*hash2(q,rec.jit*99));
      var scl = flick * (s.name ? 1.5 : 1.0) * (0.8 + s.h/5);
      _flameQ.setFromAxisAngle(_flameAxisY, Math.atan2(camera.position.x-(s.x+jx), camera.position.z-(s.z+jz)));
      _flameV.set(s.x+jx, rec.groundY + s.h*0.45, s.z+jz);
      _flameS.set(scl,scl,scl);
      _flameM4.compose(_flameV,_flameQ,_flameS);
      flameMesh.setMatrixAt(fi,_flameM4);
    }
  }
  flameMesh.count = fi;
  flameMesh.instanceMatrix.needsUpdate = true;

  // embers + smoke (real-time particles; smolder lingers ~12h after the end)
  var smolder = clamp01(1-(simDay-FIRE.day1)*24/12);
  var anySource = burning.length>0 || (tH>0 && smolder>0);
  emberMesh.visible = burning.length>0;
  fsmokeMesh.visible = anySource;
  if(burning.length>0){
    var ePos = emberMesh.geometry.attributes.position;
    for(var e=0;e<EMBER_CAP;e++){
      var em = emberPts[e];
      em.life -= dt;
      if(em.life<=0){
        var src = burning[Math.floor(Math.random()*burning.length)].spot;
        em.x = src.x+(Math.random()-0.5)*src.w; em.z = src.z+(Math.random()-0.5)*src.d;
        em.y = terrainHeight(src.x,src.z)+src.h*0.8;
        em.vx = (Math.random()-0.5)*2.5; em.vz = (Math.random()-0.5)*2.5; em.vy = 5+Math.random()*9;
        em.ttl = em.life = 1.5+Math.random()*2.5;
      }
      em.x += em.vx*dt; em.y += em.vy*dt; em.z += em.vz*dt; em.vy *= (1-0.25*dt);
      ePos.setXYZ(e, em.x, em.y, em.z);
    }
    ePos.needsUpdate = true;
  }
  if(anySource){
    var sources = burning.length>0 ? burning : FIRE.burn;
    var sPos = fsmokeMesh.geometry.attributes.position;
    fsmokeMesh.material.color.setHex(burning.length>0 ? 0x4a4038 : 0x8d857a);
    fsmokeMesh.material.opacity = burning.length>0 ? 0.55 : 0.3*smolder;
    for(var sm=0;sm<FSMOKE_CAP;sm++){
      var sp = fsmokePts[sm];
      sp.life -= dt;
      if(sp.life<=0){
        var ssrc = sources[Math.floor(Math.random()*sources.length)].spot;
        sp.x = ssrc.x; sp.z = ssrc.z; sp.y = terrainHeight(ssrc.x,ssrc.z)+ssrc.h;
        sp.vx = 1.2+Math.random()*1.4; sp.vz = (Math.random()-0.5)*1.6; sp.vy = 7+Math.random()*8;
        sp.ttl = sp.life = 4+Math.random()*4;
      }
      sp.x += sp.vx*dt; sp.y += sp.vy*dt; sp.z += sp.vz*dt;
      sPos.setXYZ(sm, sp.x, sp.y, sp.z);
    }
    sPos.needsUpdate = true;
  }

  // firelight + global glow (sky tint at night comes via updateDayNight)
  fireGlow = clamp01(burning.length/10);
  var demoFlash = 0;
  demoPuffs.forEach(function(p){ if(p.t>=0 && p.t<0.35) demoFlash = Math.max(demoFlash, 1-p.t/0.35); });
  fireLight.visible = fireGlow>0.01 || demoFlash>0;
  if(fireLight.visible){
    var cx=0, cz=0;
    if(burning.length){ burning.forEach(function(r){ cx+=r.spot.x; cz+=r.spot.z; }); cx/=burning.length; cz/=burning.length; }
    else { cx=FIRE.cx; cz=FIRE.cz; }
    fireLight.position.set(cx, terrainHeight(cx,cz)+26, cz);
    fireLight.intensity = (2.6*fireGlow*(0.8+0.2*Math.sin(_fireClock*13)) + demoFlash*5) * (0.55+0.45*nightFactor);
  }

  // charred ground fades in under the burn, stays as the scar
  var charT = clamp01(tH/5);
  charPatch.material.opacity = 0.5*charT * (rebuildT>0 ? lerp(1,0.7,clamp01(rebuildT/FIRE.rebuildDur)) : 1);
}

/* ---- the crowd: flee the fire zone via the street graph, then watch from
   the Plaza (the Alta: "Portsmouth square ... crowded with anxious
   spectators"). Called per-slot from updatePeople(); at most a few new
   graph routes are computed per frame so the exodus spreads naturally. ---- */
var _fleeBudget = 0;
function resetFleeBudget(){ _fleeBudget = 12; }
function applyFireCrowd(slot, day){
  if(day < FIRE.day0 || day > FIRE.day1 + 3/24){
    if(slot._spect){ slot._fleePoly=null; slot._spect=null; }
    return;
  }
  if(!slot._spect){
    var inZone = FIRE.inFootprint(slot._x, slot._z, 26);
    var near = Math.hypot(slot._x-FIRE.cx, slot._z-FIRE.cz) < 330;
    if((inZone || near) && _fleeBudget>0){
      _fleeBudget--;
      var spot = FIRE.spectatorSpots[slot.id % FIRE.spectatorSpots.length];
      slot._spect = spot;
      slot._fleePoly = buildRoutePoly(slot._x, slot._z, spot.x, spot.z, {day:day, who:slot.id});
      slot._fleeStart = peopleClock;
      slot._spOffX = (hash2(slot.id*0.37,1.7)-0.5)*14;
      slot._spOffZ = (hash2(slot.id*0.53,4.1)-0.5)*14;
    }
    if(!slot._spect) return;
  }
  var walked = (peopleClock - slot._fleeStart) * 7.0; // a run — people move in real time while the fire clock runs slow, so this is what reads as flight at the fire's 1h/3s pace
  if(slot._fleePoly && walked < slot._fleePoly.total){
    var p = pointOnPolyline(slot._fleePoly, walked);
    slot._x = p.x; slot._z = p.z; slot._dx = p.dx; slot._dz = p.dz;
    slot._pose = "walk"; slot._now = "fleeing the fire";
  } else {
    slot._x = slot._spect.x + slot._spOffX; slot._z = slot._spect.z + slot._spOffZ;
    slot._dx = FIRE.cx - slot._x; slot._dz = FIRE.cz - slot._z;
    slot._pose = "market"; slot._now = "watching the fire from the Plaza";
  }
}

/* @P1850-CHUNK 59 — day/night cycle (sun from the sim clock) */
/* =====================================================================
   DAY / NIGHT CYCLE — SUN FROM THE SIM CLOCK (fix sprint 2026-07-11, P0)
   The old system ran its own wall-clock cycle (DAY_CYCLE_SECONDS=420, a
   full day every 7 real minutes) with no relationship to the timeline —
   the rogue clock. Now sun/sky/lighting derive from the sim clock's
   hour-of-day, always, through the COMPRESSION POLICY:
   - LIVE / 2x follow / paused / any explicit jump: true sun position,
     continuously, from todFromSimDay() (seasonal daylight warp below).
   - day/s and faster (+ scrub drags): the true cycle would strobe (a
     full day every <=2s), so lighting blends (smoothed, never snapping)
     to a REPRESENTATIVE day — a soft midday-warm baseline, with a gentle
     dawn/dusk tint pulse as each day boundary passes at day/s only
     (week/s and month/s sweep 7-30 days per real second, so they hold
     the steady baseline — any per-day pulse would itself strobe).
   - the Great Fire window overrides back to the true sun even at
     timelapse: fireClockStep() already caps the clock at 1 sim-hour/3s
     there, slow enough to watch dawn break naturally over the burn.
   Scrub/jump landings default to noon (jumpToDate's +0.5) and the sun
   now correctly stands at noon there.
   ===================================================================== */
var timeOfDay = 0.32; // 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset — DERIVED each frame by updateTimeOfDay(); never advanced by its own clock
var nightFactor = 0; // 0=full day .. 1=full night; shared by windows, campfires, lantern-carriers

/* Seasonal daylight length (fill:true — approximate, SF ~37.8°N, no
   equation-of-time): winter dusk ~17:00, summer ~20:00 per user spec. */
function daylightSpanForDay(day){
  var d = dateFromSimDay(day);
  var doy = (d.getTime() - Date.UTC(d.getUTCFullYear(),0,1))/86400000;
  var s = Math.cos((doy-172)/365*Math.PI*2); // +1 at summer solstice, -1 at winter
  return { sunrise: 6.1 - 1.15*s, sunset: 18.5 + 1.5*s }; // winter ~7:15/17:00, summer ~4:57/20:00
}
/* Map the sim clock's hour-of-day onto the sun phase so sunrise always
   lands at 0.25 and sunset at 0.75 regardless of season. */
function todFromSimDay(day){
  var h = (day-Math.floor(day))*24;
  var sp = daylightSpanForDay(day);
  if(h>=sp.sunrise && h<=sp.sunset)
    return 0.25 + 0.5*(h-sp.sunrise)/(sp.sunset-sp.sunrise);
  var nightLen = 24-(sp.sunset-sp.sunrise);
  var hn = h>sp.sunset ? h-sp.sunset : h+24-sp.sunset;
  return (0.75 + 0.5*hn/nightLen) % 1;
}
/* shortest-path circular lerp on the 0..1 day phase */
function mixTod(a,b,t){
  var d = b-a; if(d>0.5) d-=1; else if(d<-0.5) d+=1;
  return ((a + d*t)%1+1)%1;
}
var REP_TOD = 0.45;       // representative timelapse light: soft near-noon warm
var REP_DUSK_TOD = 0.72;  // the gentle day-boundary pulse leans toward this golden-hour phase
var lightBlend = 0;       // 0 = true sun, 1 = representative day; smoothed so tier changes cross-fade
function updateTimeOfDay(dt){
  var fireWindow = simDay>=FIRE.day0 && simDay<=FIRE.day1; // fire clock is capped watchable — keep the true (pre-dawn -> morning) sun
  var wantRep = (timelapseActive()||SCRUBBING) && !fireWindow ? 1 : 0;
  lightBlend = chase(lightBlend, wantRep, dt, 2.5);
  var rep = REP_TOD;
  if(simSpeedKey==="day" && !SCRUBBING){
    // dawn/dusk tint pulse: one gentle golden swell per passing day (2s each)
    var f = simDay-Math.floor(simDay);
    var db = Math.min(f, 1-f); // distance to the nearest day boundary
    rep = mixTod(REP_TOD, REP_DUSK_TOD, Math.exp(-Math.pow(db/0.09,2))*0.8);
  }
  timeOfDay = mixTod(todFromSimDay(simDay), rep, lightBlend);
}

var WATER_DEEP_BASE = new THREE.Color(0x2a5570);
var WATER_SHALLOW_BASE = new THREE.Color(0x8fc2c9);

var cZenithDay = new THREE.Color(0x3d72a8), cHorizonDay = new THREE.Color(0xf3dfb0);
var cZenithNight = new THREE.Color(0x0a0e2a), cHorizonNight = new THREE.Color(0x241f3f);
var cSunDay = new THREE.Color(0xfff1d0), cSunDusk = new THREE.Color(0xff9c55), cSunNight = new THREE.Color(0x5a6fa8);
var cFogDay = new THREE.Color(0xa89b7c), cFogNight = new THREE.Color(0x1c2033); // s62: day fog retoned with the earth palette (was 0xcfc2a0 parchment)

function updateDayNight(){
  var phase = timeOfDay*Math.PI*2;
  var sunHeight = -Math.cos(phase); // -1 midnight .. +1 noon
  var sunAz = Math.sin(phase);

  sun.position.set(sunAz*900, Math.max(sunHeight,-0.15)*700+150, 260);

  var dayT = smoothstep(-0.05, 0.35, sunHeight);
  var duskGlow = Math.exp(-Math.pow(sunHeight*3.2,2));

  var zenith = cZenithNight.clone().lerp(cZenithDay, dayT);
  var horizon = cHorizonNight.clone().lerp(cHorizonDay, dayT);
  horizon.lerp(new THREE.Color(0xffa96a), duskGlow*0.55);
  // PHASE 2: overcast sky mix on rainy days (weatherState set by updateWeather())
  var overcast = weatherState.wet*0.6;
  zenith.lerp(new THREE.Color(0x767d7c), overcast);
  horizon.lerp(new THREE.Color(0x9aa09c), overcast);
  // PHASE 5: firelight tints the sky while the Great Fire burns — strongest
  // against the pre-dawn dark (the fire broke out at 5:45 a.m.)
  if(fireGlow>0.01){
    var fg = fireGlow*(0.3+0.7*(1-dayT));
    horizon.lerp(new THREE.Color(0xff6a28), fg*0.55);
    zenith.lerp(new THREE.Color(0x4a1e08), fg*0.3);
  }
  paintSky(zenith, horizon);

  var sunColor = cSunNight.clone().lerp(cSunDay, dayT);
  sunColor.lerp(cSunDusk, duskGlow*0.6);
  sun.color.copy(sunColor);
  /* s44 NIGHT READABILITY: raise the moonlit floor (blue-grey ambient via the
     hemi sky color, already 0x9fb4d8) so ground/buildings read at night —
     subtle, never daylight. FIRE GUARD: the Great Fire's pre-dawn darkness is
     intentional (the glow must dominate), so the raised floor stands down
     while fireGlow burns. */
  var moonFloor = 1 - clamp01(fireGlow)*0.8;
  // EARTH PALETTE LAW (s62): day endpoints retuned so flat noon ground sums
  // to ~1.03x (was ~1.6x — clipped to white). Night floors untouched (s44
  // night readability preserved); dusk glow term unchanged.
  sun.intensity = lerp(0.12+0.05*moonFloor, 0.72, dayT) + duskGlow*0.13;

  hemi.intensity = lerp(0.12+0.10*moonFloor, 0.30, dayT);
  ambient.intensity = lerp(0.05+0.055*moonFloor, 0.09, dayT);

  var fogCol = cFogNight.clone().lerp(cFogDay, dayT);
  scene.fog.color.copy(fogCol);
  skyMat.needsUpdate = false;

  nightFactor = 1-dayT;
  // s44: window/lantern glow comes up slightly earlier and slightly stronger
  // (wider-reading pools) — still period-dim, still off by day.
  windowsMesh.material.opacity = clamp01(nightFactor*1.45-0.12);
  if(window.buildingGlowAccentMesh) window.buildingGlowAccentMesh.material.opacity = clamp01(nightFactor*1.45-0.12);

  // dim the water toward indigo at night
  var wDim = lerp(0.18, 1, dayT);
  waterUniforms.uDeep.value.copy(WATER_DEEP_BASE).multiplyScalar(wDim);
  waterUniforms.uShallow.value.copy(WATER_SHALLOW_BASE).multiplyScalar(wDim);

  // A5: wave-glint sparkle, strongest at low sun angles (dawn/dusk), silent at night
  waterUniforms.uSunGlint.value = duskGlow*dayT*1.4;
}

