/* =====================================================================
   LAYER fauna (slot 8) — OWNS animal instancing/behaviors (hogs, gulls, horses, quail, cattle, sea lions,
   rats/cats/dogs, herons, pelicans). Era gates per receipts. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 2 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 58 — fauna tranche 1 + pastures/corrals/cattle */
/* =========================================================================
   TECHNIQUES §10 — FAUNA (polish tranche 1). Gated on data/catalog-fauna.json
   presence verdicts (CANON rider 2): every species below is documented or
   likely; NO elk (verdict: absent from the peninsula tip), NO whales
   (verdict: documented absence as a routine sight). Ambient wildlife is
   steering-behavior instances + spawn gates, never "AI":
   1. HOGS in the streets — documented (catalog feral_hog, rarity 1; the
      corpus holds the receipts: CS18470116.1.3 "keep them penned up",
      CS18470123.1.4 "ANY HOGS found in the streets... TAKEN UP... fined
      five dollars"). A town-street nuisance from the window's start; the
      herd THINS after Alcalde Hyde's Jan 24 1847 ordinance takes force —
      the sim reacting to a documented civic act (behavior-spec §6),
      approved fill per the CANON riders.
   2. GULLS — documented presence (catalog gulls, rarity 1); the specific
      trailing-ships behavior is flagged fill:true in the catalog and is
      used exactly as approved: a small flock whose target is
      shipPos + trailing offset, active only when ships are in range.
   3. HITCHING-POST HORSES — documented (catalog horse_mule_ox, rarity 1);
      static instances at the existing hitching rails, two-part sine
      (slow large head-nod + fast small tail-swish) in a vertex-shader
      patch — no per-frame JS beyond the time uniform.
   4. QUAIL COVEYS — documented (catalog california_quail, rarity 1, "the
      best-attested wild bird in the frame"); small ground flocks in the
      dune-scrub belt that flush when a walker/camera-focus approaches
      (peck-idle + startle-flee, the standard state pair).
   True scale: hogs ~1.2m, horses ~2.2m body. All instanced; no labels, no
   narration (voice rule).
   ========================================================================= */
var faunaClock = 0;
var faunaTimeUniform = { value: 0 };
var HOG_ORDINANCE_DAY = eventDateToSimDay("1847-01-24"); // CS18470123.1.4
function makeHogGeo(){
  var hide = new THREE.Color(0x8a6e55), dark = new THREE.Color(0x5d4a3a);
  var legs = makeBoxLocal(0.30,0.24,0.72, dark);
  var body = makeBoxLocal(0.42,0.44,1.0, hide); body.translate(0,0.20,0);
  var head = makeBoxLocal(0.28,0.30,0.28, hide); head.translate(0,0.26,0.58);
  var snout = makeBoxLocal(0.13,0.12,0.14, dark); snout.translate(0,0.24,0.74);
  return mergeGeoms([legs,body,head,snout]); // 4-box hog, ~1.2m nose-to-rump
}
var HOG_CAP = 8;
var hogMesh = tagInspect(new THREE.InstancedMesh(makeHogGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), HOG_CAP),
  "fauna", "Domestic hog", "Loose hogs scavenged the streets — the era's de facto garbage service (fauna-1846.md).");
hogMesh.count = 0; scene.add(hogMesh);
// street muck patches the hogs root between — jittered off real street-graph
// nodes within a couple blocks of the Plaza (seeded, stable per world seed)
var HOG_MUCK_PATCHES = (function(){
  var pts = [];
  for(var i=0;i<STREET_GRAPH.nodes.length && pts.length<7;i++){
    var n = STREET_GRAPH.nodes[i];
    if(n.key.indexOf("camp_")===0 || n.key==="mission" || n.key.indexOf("mroad_")===0 || n.key==="wharf") continue;
    var d = Math.hypot(n.x-PLAZA_CENTER.x, n.z-PLAZA_CENTER.z);
    if(d>35 && d<210 && rngBuild()<0.4 && terrainHeight(n.x,n.z)>1)
      pts.push({ x:n.x+(rngBuild()-0.5)*6, z:n.z+(rngBuild()-0.5)*6 });
  }
  while(pts.length<4){ // fallback if the node sweep came up short
    pts.push({ x:PLAZA_CENTER.x+(rngBuild()-0.5)*120, z:PLAZA_CENTER.z+(rngBuild()-0.5)*120 });
  }
  return pts;
})();
var HOGS = (function(){
  var out = [];
  for(var i=0;i<HOG_CAP;i++){
    var p0 = HOG_MUCK_PATCHES[i % HOG_MUCK_PATCHES.length];
    out.push({ x:p0.x+(rngBuild()-0.5)*4, z:p0.z+(rngBuild()-0.5)*4,
      tx:p0.x, tz:p0.z, phase:rngBuild()*Math.PI*2, speed:0.30+rngBuild()*0.12,
      rooting:true, until: rngBuild()*40 });
  }
  return out;
})();
// hog head-count: common from the sim's 1846 start; thins (never quite to
// zero — enforcement was legal, not instantly practical) after the Jan 24
// 1847 ordinance takes force.
function hogTargetCount(day){
  if(day < HOG_ORDINANCE_DAY) return 7;
  return Math.max(2, 7 - Math.floor((day-HOG_ORDINANCE_DAY)/12));
}
function makeGullGeo(){
  var white = new THREE.Color(0xe9e7df), gray = new THREE.Color(0x9aa0a3);
  var body = makeBoxLocal(0.10,0.09,0.32, white);
  function wingTri(sign){
    var pos = new Float32Array([ 0,0.06,0.10,  sign*0.52,0.10,-0.04,  0,0.06,-0.10 ]);
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos,3));
    return colorizeUniform(g, gray);
  }
  return mergeGeoms([body, wingTri(1), wingTri(-1)]); // triangle-wing bird, ~1m span
}
var GULL_CAP = 20;
var gullMesh = tagInspect(new THREE.InstancedMesh(makeGullGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0, side:THREE.DoubleSide}), GULL_CAP),
  "fauna", "Western gull", "Working the harbor and the waterfront refuse line (fauna-1846.md).");
gullMesh.count = 0; scene.add(gullMesh);
function makeHorseGeo(){
  var bay = new THREE.Color(0x5a3d28), darkBay = new THREE.Color(0x3c2a1c);
  function part(g){ return g; }
  var parts = [];
  [[-0.15,-0.48],[0.15,-0.48],[-0.15,0.42],[0.15,0.42]].forEach(function(o){
    var leg = makeBoxLocal(0.09,0.84,0.09, darkBay); leg.translate(o[0],0,o[1]);
    parts.push({g:leg,p:0});
  });
  var body = makeBoxLocal(0.44,0.52,1.35, bay); body.translate(0,0.80,0);
  parts.push({g:body,p:0});
  var neck = makeBoxLocal(0.16,0.52,0.22, bay); neck.rotateX(-0.5); neck.translate(0,1.18,0.62);
  parts.push({g:neck,p:1});
  var head = makeBoxLocal(0.13,0.36,0.18, darkBay); head.rotateX(0.35); head.translate(0,1.38,0.88);
  parts.push({g:head,p:1});
  var tail = makeBoxLocal(0.07,0.52,0.09, darkBay); tail.translate(0,0.62,-0.74);
  parts.push({g:tail,p:2});
  return mergeGeomsParts(parts); // ~2.2m nose-to-tail, ~1.5m withers (true scale)
}
// §10.3: whole animation lives in the vertex shader off one time uniform —
// aPart 1 = head/neck (slow large nod), aPart 2 = tail (fast small swish),
// per-instance phase so no two horses sync.
var hitchedHorseMesh = (function(){
  var rails = window.HITCHING_RAILS || [];
  var spots = [];
  rails.forEach(function(r){
    if(rngBuild()<0.8){
      var a = r.rotY;
      spots.push({ x:r.x+Math.sin(a)*1.0, z:r.z+Math.cos(a)*1.0, yaw:a+Math.PI+(rngBuild()-0.5)*0.4, phase:rngBuild()*Math.PI*2 });
    }
  });
  var n = Math.max(spots.length,1);
  var geo = makeHorseGeo();
  var phaseArr = new Float32Array(n);
  var mat = new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0});
  mat.onBeforeCompile = function(shader){
    shader.uniforms.uFaunaTime = faunaTimeUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPart;\nattribute float instancePhase;\nuniform float uFaunaTime;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat headMask = step(0.5,aPart)*(1.0-step(1.5,aPart));\nfloat tailMask = step(1.5,aPart);\ntransformed.y -= headMask*(0.5+0.5*sin(uFaunaTime*0.6+instancePhase))*0.12;\ntransformed.x += tailMask*sin(uFaunaTime*2.8+instancePhase*1.7)*0.09;");
  };
  var mesh = new THREE.InstancedMesh(geo, mat, n);
  var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1,1,1);
  spots.forEach(function(sp,i){
    phaseArr[i] = sp.phase;
    q.setFromAxisAngle(_UP, sp.yaw);
    v.set(sp.x, terrainHeight(sp.x,sp.z), sp.z);
    var sc = 0.94+rngBuild()*0.12; s.set(sc,sc,sc);
    m4.compose(v,q,s);
    mesh.setMatrixAt(i,m4);
  });
  geo.setAttribute("instancePhase", new THREE.InstancedBufferAttribute(phaseArr,1));
  mesh.count = spots.length;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
})();
function makeQuailGeo(){
  var brown = new THREE.Color(0x6b5a44), dark = new THREE.Color(0x3a3128);
  var body = makeBoxLocal(0.12,0.11,0.20, brown);
  var head = makeBoxLocal(0.06,0.08,0.07, dark); head.translate(0,0.09,0.10);
  return mergeGeoms([body,head]); // ~0.25m — true quail scale
}
var QUAIL_PER_COVEY = 6, QUAIL_COVEYS = 4; // s46: +2 coveys in the Great Sand Bank scrub (gameDensity california_quail -> great_sand_bank_west)
var quailMesh = tagInspect(new THREE.InstancedMesh(makeQuailGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), QUAIL_PER_COVEY*QUAIL_COVEYS),
  "fauna", "California quail", "Coveys in the dune scrub and chaparral (fauna-1846.md).");
quailMesh.count = 0; scene.add(quailMesh);
var QUAIL_SITES = (function(){
  var sites = scatterSample(2, PLAZA_CENTER.x-750, PLAZA_CENTER.z+120, 520,
    function(x,z,h){ return h>8 && h<50 && farFromVillage(x,z,60); }, 400);
  while(sites.length<2){ var fx=PLAZA_CENTER.x-600-sites.length*90, fz=PLAZA_CENTER.z+220; sites.push({x:fx,z:fz,h:terrainHeight(fx,fz)}); }
  // s46: west coveys in the Great Sand Bank dune scrub (the ~14 sq mi belt)
  sites = sites.concat(scatterRect(2, -8600, -6000, 1200, 5600,
    function(x,z,h){ var zn=zoneAt(x,z); return (zn===1||zn===2) && h>3; }, 900));
  while(sites.length<QUAIL_COVEYS){ var wx=-7200-(sites.length*300), wz=2800; sites.push({x:wx,z:wz,h:terrainHeight(wx,wz)}); }
  return sites.map(function(s){ return { x:s.x, z:s.z, flushT:-1, hidden:false, hideUntil:0 }; });
})();

/* =========================================================================
   RECONCILER TRANCHE 2026-07-10 (GAPS-2026-07-10 top-builds #2/#3/#4):
   1. RANCH/PASTURE VENUE + CATTLE (item A / build #2) — the documented
      pastoral zones at Mission Dolores (peninsula-1846.md §2: the Mission's
      grazing lands; catalog-fauna cattle_beef: documented, rarity 1,
      hide-and-tallow economy through the window, beef volume "rising
      sharply from 1849") and the Presidio vicinity (peninsula-1846.md §1:
      Mofras' "soldiers-rancheros" — soldier-ranchers — with families).
      A grazing venue advertises work here so the 5 formerly-orphaned
      occupations (farmer, rancher_ranchero, dairyman, hunter,
      vaquero_herder — catalog venueNeeds ranch/region/natural, previously
      resolver-less) route to real ground instead of the Plaza default.
      Cattle are TECHNIQUES §10 tethered-idle instances: static graze spots,
      phase-offset head-down/head-up sine (vertex shader, same aPart
      pattern as the hitched horses), slow drift between graze points.
   2. MUD-WINTER STREET PROPS (build #3) — see the MUD WINTER block up in
      the weather section for the documented window + citations; here live
      the puddle decals (contact-shadow mesh pattern) and the plank/crate/
      barrel crossing props ("a few planks, tobacco-boxes... barrels of
      spoiled provisions, or any other available object" — Annals via
      FoundSF; clm:econ:80). Strictly era-gated to weatherState.mud > 0.
   3. FAUNA BATCH (build #4) — per catalog-fauna.json verdicts, all
      documented, rarity 1-2: pelican_cormorant (Ayala named Alcatraz for
      them, 1775), heron_egret (Mission Bay marsh "inconceivably thick"
      with them, richest pre-1850), ship_dock_rat (explosion from late
      1849), stray_feral_dog (documented general problem), cat (mouser
      imports against the rat surge, late 1849). NO other species (elk
      absent, whales a documented absence, per the same catalog).
   All instanced; true scale; dice/steering, never scripts; no narration.
   ========================================================================= */

/* ---- 1a. the pastures: seeded search for open, flat, road-free ground
   near each outpost. Placement is a GUESS within the documented zone (the
   record puts grazing at the Mission lands / Presidio vicinity, not at a
   surveyed lot) — flagged per QA-GATE §1. ---- */
function findPastureCenter(ox, oz, angA, angB, dMin, dMax){
  for(var d=dMin; d<=dMax; d+=25){
    for(var a=angA; a<=angB; a+=0.22){
      var x = ox + Math.cos(a)*d, z = oz + Math.sin(a)*d;
      if(terrainHeight(x,z)>2 && terrainHeight(x,z)<45 && terrainSlopeDeg(x,z)<12 && !nearAnyRoad(x,z,14)) return {x:x, z:z};
    }
  }
  return null;
}
function buildGrazePoints(cx,cz,r,n){
  var pts = scatterSample(n, cx, cz, r, function(x,z,h){ return h>1.5 && h<60 && terrainSlopeDeg(x,z)<16 && !nearAnyRoad(x,z,6); }, n*30);
  while(pts.length<3){ var fa=pts.length*2.1; pts.push({x:cx+Math.cos(fa)*r*0.4, z:cz+Math.sin(fa)*r*0.4, h:terrainHeight(cx,cz)}); }
  return pts;
}
// SE of the Mission complex (clear of the orchard to the W, the rancheria
// to the NW, and the road in from the NE); inland S/E of the Presidio quad.
var PASTURE_MISSION = findPastureCenter(OUTPOSTS.mission.x, OUTPOSTS.mission.z, 0.15, 1.65, 170, 340) || { x:OUTPOSTS.mission.x+210, z:OUTPOSTS.mission.z+170 };
var PASTURE_PRESIDIO = findPastureCenter(OUTPOSTS.presidio.x, OUTPOSTS.presidio.z, 0.3, 2.8, 150, 320) || { x:OUTPOSTS.presidio.x+180, z:OUTPOSTS.presidio.z+120 };
var MISSION_GRAZE_PTS  = buildGrazePoints(PASTURE_MISSION.x,  PASTURE_MISSION.z,  90, 12);
var PRESIDIO_GRAZE_PTS = buildGrazePoints(PASTURE_PRESIDIO.x, PASTURE_PRESIDIO.z, 55, 6);

/* ---- 1b. corrals — the venue's visible built form (post-and-rail, the
   standard Californio rancho corral; period-plausible fill, no surveyed
   corral position survives). One merged static mesh. ---- */
(function buildRanchCorrals(){
  var geoms = [];
  var postC = new THREE.Color(0x6b563e), railC = new THREE.Color(0x7d6748);
  function corralAt(cx,cz,w,d){
    registerPlacement(cx,cz,Math.hypot(w,d)/2+1);
    var perim = [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    for(var s=0;s<4;s++){
      var A=perim[s], B=perim[(s+1)%4];
      var len = Math.hypot(B[0]-A[0], B[1]-A[1]);
      var nSeg = Math.max(2, Math.round(len/2.8));
      for(var i=0;i<=nSeg;i++){
        var t=i/nSeg, px=cx+lerp(A[0],B[0],t), pz=cz+lerp(A[1],B[1],t);
        var post = makeBoxLocal(0.14,1.3,0.14, postC);
        bake(post, new THREE.Vector3(px, terrainHeight(px,pz), pz), rngBuild()*0.3);
        geoms.push(post);
        if(i<nSeg && !(s===2 && i===Math.floor(nSeg/2))){ // one open gate on the far side
          var t2=(i+1)/nSeg, qx=cx+lerp(A[0],B[0],t2), qz=cz+lerp(A[1],B[1],t2);
          registerWalkSeg(px,pz,qx,qz); // s59: corral rails block walkers; the gate segment stays open
          var mx=(px+qx)/2, mz=(pz+qz)/2, my=terrainHeight(mx,mz);
          var segLen=Math.hypot(qx-px,qz-pz), yaw=Math.atan2(qx-px,qz-pz);
          [0.55,1.02].forEach(function(rh){
            var rail = makeBoxLocal(0.07,0.09,segLen*1.02, railC);
            rail.translate(0,rh,0);
            bake(rail, new THREE.Vector3(mx,my,mz), yaw);
            geoms.push(rail);
          });
        }
      }
    }
  }
  corralAt(PASTURE_MISSION.x, PASTURE_MISSION.z, 14, 11);
  corralAt(PASTURE_PRESIDIO.x, PASTURE_PRESIDIO.z, 9, 8);
  var m = new THREE.Mesh(mergeGeoms(geoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}));
  scene.add(m);
})();

/* ---- 1c. the venue itself + resolver bindings. Registered BEFORE
   ALL_PEOPLE_SLOTS builds (below), so worksiteForOccupation() routes the
   5 occupations here from the first spawn. "region"/"natural" (farmer's
   truck-farm periphery, the hunter's ground) resolve to the outer lands —
   the dune-scrub belt the quail coveys already inhabit (fauna-1846.md §3.1:
   quail "constantly to be found for sale alive" = a real hunted stock). ---- */
var WORKSITE_RANCH_MISSION  = { key:"ranch_mission",  label:"the Mission grazing grounds", x:PASTURE_MISSION.x,  z:PASTURE_MISSION.z,  activity:"stationary" };
var WORKSITE_RANCH_PRESIDIO = { key:"ranch_presidio", label:"the Presidio pastures",       x:PASTURE_PRESIDIO.x, z:PASTURE_PRESIDIO.z, activity:"stationary" };
var WORKSITE_OUTERLANDS = (function(){
  var q = QUAIL_SITES.length ? QUAIL_SITES[0] : null;
  return { key:"outerlands", label:"the outer lands", x:(q? q.x+25 : PLAZA_CENTER.x-650), z:(q? q.z+15 : PLAZA_CENTER.z+220), activity:"stationary" };
})();
VENUE_KEY_RESOLVERS.ranch   = function(rng){ return (rng && rng()<0.25) ? WORKSITE_RANCH_PRESIDIO : WORKSITE_RANCH_MISSION; };
VENUE_KEY_RESOLVERS.region  = function(){ return WORKSITE_OUTERLANDS; };
VENUE_KEY_RESOLVERS.natural = function(){ return WORKSITE_OUTERLANDS; };

/* ---- 1d. the cattle. True scale: ~2.3m nose-to-rump, ~1.26m shoulder
   (small Californio range cattle, not modern feedlot stock). Head+neck
   built LOW — grazing is the neutral pose; the shader's slow sine raises
   it (head-down/head-up, per-instance phase so the herd never locksteps). ---- */
function makeCattleGeo(){
  var hide = new THREE.Color(0x6d4b33), hideDark = new THREE.Color(0x4c352a), horn = new THREE.Color(0xc9bda0);
  var parts = [];
  [[-0.20,-0.60],[0.20,-0.60],[-0.20,0.55],[0.20,0.55]].forEach(function(o){
    var leg = makeBoxLocal(0.11,0.70,0.11, hideDark); leg.translate(o[0],0,o[1]);
    parts.push({g:leg,p:0});
  });
  var body = makeBoxLocal(0.60,0.56,1.72, hide); body.translate(0,0.68,0);
  parts.push({g:body,p:0});
  var neck = makeBoxLocal(0.20,0.50,0.24, hide); neck.rotateX(2.2); neck.translate(0,1.05,0.82);
  parts.push({g:neck,p:1});
  var head = makeBoxLocal(0.20,0.30,0.26, hideDark); head.translate(0,0.40,1.20);
  parts.push({g:head,p:1});
  [-1,1].forEach(function(sgn){
    var h = makeBoxLocal(0.20,0.05,0.05, horn); h.translate(sgn*0.17,0.66,1.12);
    parts.push({g:h,p:1});
  });
  var tail = makeBoxLocal(0.06,0.46,0.08, hideDark); tail.translate(0,0.44,-0.92);
  parts.push({g:tail,p:2});
  return mergeGeomsParts(parts);
}
var CATTLE_CAP = 30, CATTLE_MISSION_MAX = 24;
var CATTLE_BOOM_DAY = eventDateToSimDay("1849-02-01"); // beef-on-the-hoof volume "rising sharply from 1849" (catalog-fauna cattle_beef; Monterey Co. Historical Society)
function cattleTargetCounts(day){
  return { mission: day>=CATTLE_BOOM_DAY ? 24 : 16, presidio: 5 };
}
var cattleMesh = (function(){
  var geo = makeCattleGeo();
  var phaseArr = new Float32Array(CATTLE_CAP);
  for(var i=0;i<CATTLE_CAP;i++) phaseArr[i] = rngBuild()*Math.PI*2;
  geo.setAttribute("instancePhase", new THREE.InstancedBufferAttribute(phaseArr,1));
  var mat = new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0});
  mat.onBeforeCompile = function(shader){
    shader.uniforms.uFaunaTime = faunaTimeUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPart;\nattribute float instancePhase;\nuniform float uFaunaTime;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat cowHead = step(0.5,aPart)*(1.0-step(1.5,aPart));\nfloat cowTail = step(1.5,aPart);\ntransformed.y += cowHead*((0.5+0.5*sin(uFaunaTime*0.3+instancePhase))*0.42 - 0.12);\ntransformed.x += cowTail*sin(uFaunaTime*2.5+instancePhase*1.9)*0.08;");
  };
  var mesh = new THREE.InstancedMesh(geo, mat, CATTLE_CAP);
  tagInspect(mesh, "fauna", "Range cattle", "Loose hide-and-tallow stock grazing the peninsula hills (fauna-1846.md).");
  mesh.count = 0; scene.add(mesh);
  return mesh;
})();
var CATTLE = (function(){
  var out = [];
  for(var i=0;i<CATTLE_CAP;i++){
    var mission = i<CATTLE_MISSION_MAX;
    var pts = mission ? MISSION_GRAZE_PTS : PRESIDIO_GRAZE_PTS;
    var p0 = pts[i % pts.length];
    out.push({ herd:(mission?"mission":"presidio"), herdIdx:(mission?i:i-CATTLE_MISSION_MAX), pts:pts,
      x:p0.x+(rngBuild()-0.5)*10, z:p0.z+(rngBuild()-0.5)*10, tx:p0.x, tz:p0.z,
      phase:rngBuild()*Math.PI*2, baseYaw:rngBuild()*Math.PI*2, scale:0.92+rngBuild()*0.14,
      grazing:true, until:rngBuild()*120 });
  }
  return out;
})();

/* @P1850-CHUNK 60 — pelicans, herons, rats, cats, dogs */
/* ---- 3a. pelicans — small formation gliding the cove shoreline (boid-lite:
   a leader on a fixed offshore polyline, followers in a phase-offset V; the
   full flock solver is not warranted for 6 birds). ---- */
function makePelicanGeo(){
  var bodyC = new THREE.Color(0x8a8072), wingC = new THREE.Color(0x6f675a), headC = new THREE.Color(0xd8cfae), billC = new THREE.Color(0xb99a68);
  var body = makeBoxLocal(0.22,0.18,0.62, bodyC);
  var head = makeBoxLocal(0.10,0.10,0.12, headC); head.translate(0,0.16,0.34);
  var bill = makeBoxLocal(0.05,0.035,0.42, billC); bill.translate(0,0.15,0.55);
  function wingTri(sign){
    var pos = new Float32Array([ 0,0.14,0.18,  sign*1.05,0.20,-0.10,  0,0.14,-0.22 ]);
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos,3));
    return colorizeUniform(g, wingC);
  }
  return mergeGeoms([body,head,bill,wingTri(1),wingTri(-1)]); // ~2.2m span — true brown-pelican scale
}
var PELICAN_N = 6;
var pelicanMesh = tagInspect(new THREE.InstancedMesh(makePelicanGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0, side:THREE.DoubleSide}), PELICAN_N),
  "fauna", "Brown pelican", "Formation-gliders along the cove shoreline — Ayala named Alcatraz for their kind, 1775 (fauna-1846.md).");
pelicanMesh.count = 0; scene.add(pelicanMesh);
var PELICAN_PATH = (function(){
  var pts = [];
  for(var i=0;i<waterfrontBeachLines.length;i+=3){
    var ln = waterfrontBeachLines[i];
    pts.push({ x: ln.waterX+70+(i%2)*18, z: ln.z });
  }
  function extend(p0,p1,d){ var dx=p0.x-p1.x, dz=p0.z-p1.z, L=Math.hypot(dx,dz)||1; return {x:p0.x+dx/L*d+60, z:p0.z+dz/L*d}; }
  if(pts.length>=2){
    pts.unshift(extend(pts[0],pts[1],280));
    pts.push(extend(pts[pts.length-1],pts[pts.length-2],280));
  } else {
    pts = [{x:WORKSITE_WHARF.x+160,z:WORKSITE_WHARF.z-420},{x:WORKSITE_WHARF.x+230,z:WORKSITE_WHARF.z+420}];
  }
  return buildPolyline(pts,false);
})();
var PELICANS = { s: PELICAN_PATH.total*0.3, dir: 1, speed: 8.5 };

/* ---- 3b. herons — static-with-twitch waders at the Mission Creek/Mission
   Bay marsh edge ("inconceivably thick" bird life, FoundSF via
   fauna-1846.md §3.3; richest 1846-~1850, i.e. this whole sim window).
   Site found by marching from the Mission to the nearest waterline. ---- */
function makeHeronGeo(){
  var bodyC = new THREE.Color(0x7f8b94), darkC = new THREE.Color(0x5b656d), billC = new THREE.Color(0xb8a960);
  var parts = [];
  [[-0.05],[0.05]].forEach(function(o){
    var leg = makeBoxLocal(0.025,0.46,0.025, darkC); leg.translate(o[0],0,0);
    parts.push(leg);
  });
  var body = makeBoxLocal(0.15,0.17,0.42, bodyC); body.translate(0,0.44,0);
  parts.push(body);
  var neck = makeBoxLocal(0.05,0.34,0.06, bodyC); neck.rotateX(-0.35); neck.translate(0,0.58,0.16);
  parts.push(neck);
  var head = makeBoxLocal(0.07,0.07,0.10, darkC); head.translate(0,0.92,0.28);
  parts.push(head);
  var bill = makeBoxLocal(0.025,0.025,0.20, billC); bill.translate(0,0.945,0.42);
  parts.push(bill);
  return mergeGeoms(parts); // ~1.0m standing — true great-blue/egret scale
}
var HERON_N = 3;
var heronMesh = tagInspect(new THREE.InstancedMesh(makeHeronGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), HERON_N),
  "fauna", "Great blue heron", "Waders at the Mission Bay marsh — 'inconceivably thick' with birds in the era's accounts (fauna-1846.md).");
heronMesh.count = 0; scene.add(heronMesh);
var HERON_SPOTS = (function(){
  // The baked terrain keeps the Mission Bay marsh as a low near-waterline
  // flat (h ~0-1.5m) ENE of the Mission rather than as open water — so the
  // "marsh edge" is the nearest low flat, found by marching bearings from
  // the Mission until the ground drops below ~0.9m.
  var best = null;
  for(var a=0;a<28;a++){
    var ang = a/28*Math.PI*2;
    for(var d=150; d<=3400; d+=25){
      var x = OUTPOSTS.mission.x+Math.cos(ang)*d, z = OUTPOSTS.mission.z+Math.sin(ang)*d;
      var hh = terrainHeight(x,z);
      if(hh<0.9){
        if(hh>-0.5 && (!best || d<best.d)) best = {x:x, z:z, d:d};
        break;
      }
    }
  }
  if(!best) return [];
  var spots = [];
  for(var i=0;i<HERON_N;i++){
    for(var t=0;t<40;t++){
      var sx = best.x+(rngBuild()-0.5)*70, sz = best.z+(rngBuild()-0.5)*70;
      var sh = terrainHeight(sx,sz);
      if(sh>0.05 && sh<1.4){ spots.push({x:sx, z:sz, yaw:rngBuild()*Math.PI*2}); break; }
    }
  }
  return spots;
})();

/* ---- 3c. ship/dock rats — tiny fast darters at the wharf/storeship
   ground, night-biased; population "out of control by late 1849" (Fern
   Hill / sfgenealogy rat-catchers, catalog ship_dock_rat: documented,
   hard, dated). Gated: none before Aug 1849, ramping to full by Dec. ---- */
function makeRatGeo(){
  var c = new THREE.Color(0x3f3a36), c2 = new THREE.Color(0x2e2a27);
  var body = makeBoxLocal(0.07,0.055,0.20, c);
  var tail = makeBoxLocal(0.02,0.02,0.16, c2); tail.translate(0,0.02,-0.17);
  return mergeGeoms([body,tail]); // ~0.36m nose-to-tail-tip — true ship-rat scale
}
var RAT_CAP = 10;
var ratMesh = tagInspect(new THREE.InstancedMesh(makeRatGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), RAT_CAP),
  "fauna", "Ship rat", "Off the anchored fleet — the documented rat surge of the storeship waterfront (fauna-1846.md).");
ratMesh.count = 0; scene.add(ratMesh);
var RAT_SURGE_DAY = eventDateToSimDay("1849-08-01");
function ratTargetCount(day){
  if(day < RAT_SURGE_DAY) return 0;
  var eraF = clamp01((day-RAT_SURGE_DAY)/120); // full infestation by Dec 1849
  return Math.round(eraF*(2 + 8*nightFactor)); // night-biased
}
var RAT_ANCHORS = (function(){
  // Anchors must be on VISIBLY dry ground — terrainHeight() includes the
  // village-pad blend, so a bare height check can land on the tideline
  // flats that render as shallow water. The waterfront beach lines are the
  // same visually-dry band the waterfront-life props already use: for each
  // storeship, take the beach line nearest its z row, a step up the beach.
  var out = [];
  Object.keys(STORESHIP_INFO).forEach(function(k){
    var sz = STORESHIP_INFO[k].pos.z, best=null, bd=1e18;
    for(var i=0;i<waterfrontBeachLines.length;i++){
      var ln = waterfrontBeachLines[i], d = Math.abs(ln.z-sz);
      if(d<bd){ bd=d; best=ln; }
    }
    if(best) out.push({ x:lerp(best.landX, best.waterX, 0.35), z:best.z });
  });
  out.push({x:WORKSITE_WHARF.x-8, z:WORKSITE_WHARF.z+3});
  var ch = pickShopSite("SHIP CHANDLERY"); if(ch) out.push({x:ch.x, z:ch.z});
  return out.length ? out : [{x:PLAZA_CENTER.x, z:PLAZA_CENTER.z}];
})();
var RATS = (function(){
  var out = [];
  for(var i=0;i<RAT_CAP;i++){
    var a = RAT_ANCHORS[i % RAT_ANCHORS.length];
    out.push({ anchor:a, x:a.x+(rngBuild()-0.5)*6, z:a.z+(rngBuild()-0.5)*6, tx:a.x, tz:a.z, pausing:true, until:rngBuild()*3 });
  }
  return out;
})();

/* ---- 3d. cats — the documented mouser imports (sold off ships at $10-50
   against the rat surge; catalog cat), tethered-idle near the storeships/
   warehouses + occasional dart. From late 1849 only. ---- */
function makeCatGeo(){
  var c = new THREE.Color(0x5e564a), c2 = new THREE.Color(0x453e35);
  var haunch = makeBoxLocal(0.14,0.26,0.16, c); haunch.translate(0,0,-0.08);
  var chest = makeBoxLocal(0.12,0.22,0.14, c); chest.translate(0,0.02,0.08);
  var head = makeBoxLocal(0.10,0.10,0.10, c2); head.translate(0,0.24,0.10);
  var tail = makeBoxLocal(0.035,0.035,0.22, c2); tail.translate(0,0.015,-0.24);
  return mergeGeoms([haunch,chest,head,tail]); // ~0.34m sitting — true cat scale
}
var CAT_CAP = 3;
var catMesh = tagInspect(new THREE.InstancedMesh(makeCatGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), CAT_CAP),
  "fauna", "Cat", "Shipped in against the rat surge and sold dear on the waterfront (fauna-1846.md).");
catMesh.count = 0; scene.add(catMesh);
var CAT_ARRIVAL_DAY = eventDateToSimDay("1849-10-01");
var CAT_FULL_DAY = eventDateToSimDay("1849-12-01");
function catTargetCount(day){
  if(day < CAT_ARRIVAL_DAY) return 0;
  return day >= CAT_FULL_DAY ? 3 : 2;
}
var CATS = (function(){
  var out = [];
  for(var i=0;i<CAT_CAP;i++){
    var a = RAT_ANCHORS[(i*2+1) % RAT_ANCHORS.length]; // cats sit where the rats are
    out.push({ hx:a.x-rngBuild()*6, hz:a.z+(rngBuild()-0.5)*8, // landward bias — never seaward of the anchor band x:0, z:0, tx:0, tz:0,
      yaw:rngBuild()*Math.PI*2, sitting:true, until:rngBuild()*40, phase:rngBuild()*Math.PI*2 });
  }
  out.forEach(function(c){ c.x=c.hx; c.z=c.hz; c.tx=c.hx; c.tz=c.hz; });
  return out;
})();

/* ---- 3e. stray/feral dogs — documented general town problem ("in common
   with other cities... at the time", catalog stray_feral_dog); the hog-
   wander pattern between street anchors, faster gait, sniff-idle. Count
   scales with the town (fill:true) — 2 in the village era, 4 by 1849. ---- */
function makeDogGeo(){
  var c = new THREE.Color(0x8a7a5c), c2 = new THREE.Color(0x55483a);
  var parts = [];
  [[-0.08,-0.22],[0.08,-0.22],[-0.08,0.20],[0.08,0.20]].forEach(function(o){
    var leg = makeBoxLocal(0.06,0.30,0.06, c2); leg.translate(o[0],0,o[1]);
    parts.push(leg);
  });
  var body = makeBoxLocal(0.20,0.24,0.62, c); body.translate(0,0.28,0);
  parts.push(body);
  var head = makeBoxLocal(0.14,0.16,0.18, c2); head.translate(0,0.44,0.38);
  parts.push(head);
  var tail = makeBoxLocal(0.05,0.05,0.22, c2); tail.rotateX(-0.7); tail.translate(0,0.44,-0.32);
  parts.push(tail);
  return mergeGeoms(parts); // ~0.9m nose-to-tail, ~0.55m shoulder
}
var DOG_CAP = 4;
var dogMesh = tagInspect(new THREE.InstancedMesh(makeDogGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), DOG_CAP),
  "fauna", "Dog", "The town's loose dogs — a fixture of every street scene in the record (fauna-1846.md).");
dogMesh.count = 0; scene.add(dogMesh);
var DOG_GROW1 = eventDateToSimDay("1848-06-01"), DOG_GROW2 = eventDateToSimDay("1849-06-01");
function dogTargetCount(day){ return day>=DOG_GROW2 ? 4 : (day>=DOG_GROW1 ? 3 : 2); }
var DOG_PATCHES = (function(){
  var pts = [];
  for(var i=0;i<STREET_GRAPH.nodes.length && pts.length<8;i++){
    var n = STREET_GRAPH.nodes[i];
    if(n.key.indexOf("camp_")===0 || n.key==="mission" || n.key.indexOf("mroad_")===0) continue;
    var d = Math.hypot(n.x-PLAZA_CENTER.x, n.z-PLAZA_CENTER.z);
    if(d>25 && d<320 && rngBuild()<0.45 && terrainHeight(n.x,n.z)>1)
      pts.push({ x:n.x+(rngBuild()-0.5)*8, z:n.z+(rngBuild()-0.5)*8 });
  }
  while(pts.length<4) pts.push({ x:PLAZA_CENTER.x+(rngBuild()-0.5)*140, z:PLAZA_CENTER.z+(rngBuild()-0.5)*140 });
  return pts;
})();
var DOGS = (function(){
  var out = [];
  for(var i=0;i<DOG_CAP;i++){
    var p0 = DOG_PATCHES[i % DOG_PATCHES.length];
    out.push({ x:p0.x+(rngBuild()-0.5)*6, z:p0.z+(rngBuild()-0.5)*6, tx:p0.x, tz:p0.z,
      phase:rngBuild()*Math.PI*2, speed:0.8+rngBuild()*0.25, sniffing:true, until:rngBuild()*20 });
  }
  return out;
})();
function updateFauna(dt){
  faunaClock += dt;
  faunaTimeUniform.value = faunaClock;
  var alt = lastKnownAlt;
  var nearGround = alt <= 600;

  // ---- hogs (documented; thin after the Jan 1847 ordinance) ----
  var hogN = nearGround ? Math.min(hogTargetCount(simDay), HOG_CAP) : 0;
  for(var i=0;i<hogN;i++){
    var hog = HOGS[i];
    if(hog.rooting){
      if(faunaClock > hog.until){
        hog.rooting = false;
        var pick = HOG_MUCK_PATCHES[Math.floor(hash2(i*3.3, Math.floor(faunaClock*0.11))*HOG_MUCK_PATCHES.length) % HOG_MUCK_PATCHES.length];
        hog.tx = pick.x + (hash2(i*1.7, faunaClock)*4-2);
        hog.tz = pick.z + (hash2(i*2.9, faunaClock)*4-2);
      }
    } else {
      var ddx = hog.tx-hog.x, ddz = hog.tz-hog.z, dd = Math.hypot(ddx,ddz);
      if(dd < 0.5){ hog.rooting = true; hog.until = faunaClock + 25 + hash2(i, faunaClock)*55; }
      else { hog.x += (ddx/dd)*hog.speed*dt; hog.z += (ddz/dd)*hog.speed*dt; }
    }
    var hy = terrainHeight(hog.x,hog.z);
    var hyaw = hog.rooting ? (Math.atan2(hog.tx-hog.x||0.1, hog.tz-hog.z||0.1) + Math.sin(faunaClock*0.9+hog.phase)*0.35)
                           : Math.atan2(hog.tx-hog.x, hog.tz-hog.z);
    // snout-down rooting bob (per-instance phase, never lockstep) vs level trot
    var hlean = hog.rooting ? 0.34 + Math.sin(faunaClock*2.2+hog.phase)*0.16 : Math.sin(faunaClock*4.5+hog.phase)*0.04;
    setPersonInstance(hogMesh, i, hog.x, hy, hog.z, hyaw, hlean, 0, 1);
  }
  hogMesh.count = hogN;
  hogMesh.instanceMatrix.needsUpdate = true;

  // ---- gulls trailing ships (fill:true behavior detail, per catalog note) ----
  var gShips = window._gullShips || [];
  var gullN = (alt<=900 && gShips.length>0) ? GULL_CAP : 0;
  for(var gi=0;gi<gullN;gi++){
    var tgt = gShips[gi % gShips.length];
    var gx, gz, gyaw;
    if(tgt.moving){
      // trail astern: target = shipPos + trailing offset (+ lateral weave)
      var trail = 6 + (gi%7)*2.2;
      var latW = Math.sin(faunaClock*0.8 + gi*1.7)*3.5;
      gx = tgt.x - Math.sin(tgt.yaw)*trail + Math.cos(tgt.yaw)*latW;
      gz = tgt.z - Math.cos(tgt.yaw)*trail - Math.sin(tgt.yaw)*latW;
      gyaw = tgt.yaw + Math.sin(faunaClock*1.3+gi)*0.3;
    } else {
      // anchored ship: wheel above it
      var oa = faunaClock*0.35 + gi*(Math.PI*2/GULL_CAP)*3.7;
      var orad = 8 + (gi%5)*2.2;
      gx = tgt.x + Math.cos(oa)*orad;
      gz = tgt.z + Math.sin(oa)*orad;
      gyaw = Math.atan2(-Math.sin(oa), Math.cos(oa)); // tangent heading
    }
    var gy = 4.5 + 2.2*Math.sin(faunaClock*1.1 + gi*0.9);
    var flap = Math.sin(faunaClock*5.5 + gi*2.3)*0.45; // wing-rock reads as flapping at distance
    setPersonInstance(gullMesh, gi, gx, gy, gz, gyaw, 0, flap, 0.9+((gi*37)%10)*0.02);
  }
  gullMesh.count = gullN;
  gullMesh.instanceMatrix.needsUpdate = true;

  // ---- quail coveys in the dune scrub (peck-idle; flush on approach) ----
  var qIdx = 0;
  if(nearGround){
    for(var qc=0; qc<QUAIL_SITES.length; qc++){
      var site = QUAIL_SITES[qc];
      var fdx = (CAM.focus.x-site.x), fdz = (CAM.focus.z-site.z);
      var fd2 = fdx*fdx+fdz*fdz;
      if(site.hidden){
        if(fd2 > 50*50 && faunaClock > site.hideUntil){ site.hidden=false; site.flushT=-1; }
        else continue;
      }
      if(site.flushT<0 && fd2 < 22*22) site.flushT = faunaClock; // startle
      var ft = site.flushT>=0 ? (faunaClock-site.flushT) : -1;
      if(ft > 1.6){ site.hidden = true; site.hideUntil = faunaClock+30; continue; }
      for(var qb=0; qb<QUAIL_PER_COVEY; qb++){
        var qa = qb*(Math.PI*2/QUAIL_PER_COVEY) + qc*1.3;
        var qx, qz, qy2, qyaw2;
        if(ft>=0){ // flush: covey explodes outward, low arcing burst
          var spd = 7;
          qx = site.x + Math.cos(qa)*(1.2 + ft*spd);
          qz = site.z + Math.sin(qa)*(1.2 + ft*spd);
          qy2 = terrainHeight(qx,qz) + ft*3.2*(1.6-ft);
          qyaw2 = Math.atan2(Math.cos(qa), Math.sin(qa));
        } else { // mill + peck
          var mr = 1.0 + ((qb*29)%10)*0.22 + Math.sin(faunaClock*0.13+qb)*0.4;
          qx = site.x + Math.cos(qa + Math.sin(faunaClock*0.07+qc)*0.5)*mr;
          qz = site.z + Math.sin(qa + Math.sin(faunaClock*0.07+qc)*0.5)*mr;
          qy2 = terrainHeight(qx,qz);
          qyaw2 = qa + Math.sin(faunaClock*0.5+qb)*0.8;
        }
        var peck = ft>=0 ? 0 : Math.max(0, Math.sin(faunaClock*3.1+qb*2.2))*0.35;
        setPersonInstance(quailMesh, qIdx++, qx, qy2, qz, qyaw2, peck, 0, 1);
      }
    }
  }
  quailMesh.count = qIdx;
  quailMesh.instanceMatrix.needsUpdate = true;

  // ---- cattle grazing at the Mission/Presidio pastures (GAPS item A) ----
  var cN = 0;
  if(alt<=1100){
    var ct = cattleTargetCounts(simDay);
    for(var ci=0; ci<CATTLE.length && cN<CATTLE_CAP; ci++){
      var cow = CATTLE[ci];
      if(cow.herdIdx >= (cow.herd==="mission" ? ct.mission : ct.presidio)) continue;
      if(cow.grazing){
        if(faunaClock > cow.until){
          cow.grazing = false;
          var cpick = cow.pts[Math.floor(hash2(ci*2.7, Math.floor(faunaClock*0.05))*cow.pts.length) % cow.pts.length];
          cow.tx = cpick.x + (hash2(ci*1.3, faunaClock)*10-5);
          cow.tz = cpick.z + (hash2(ci*3.1, faunaClock)*10-5);
        }
      } else {
        var cdx = cow.tx-cow.x, cdz = cow.tz-cow.z, cdd = Math.hypot(cdx,cdz);
        if(cdd < 0.6){ cow.grazing = true; cow.until = faunaClock + 50 + hash2(ci, faunaClock)*130; }
        else { cow.x += (cdx/cdd)*0.32*dt; cow.z += (cdz/cdd)*0.32*dt; }
      }
      var cyaw = cow.grazing ? cow.baseYaw + Math.sin(faunaClock*0.11+cow.phase)*0.4
                             : Math.atan2(cow.tx-cow.x, cow.tz-cow.z);
      if(!cow.grazing) cow.baseYaw = cyaw;
      setPersonInstance(cattleMesh, cN++, cow.x, terrainHeight(cow.x,cow.z), cow.z, cyaw, 0, 0, cow.scale);
    }
  }
  cattleMesh.count = cN; cattleMesh.visible = cN>0;
  cattleMesh.instanceMatrix.needsUpdate = true;

  // ---- stray dogs (hog-wander pattern, faster gait; sniff-idle) ----
  var dogN = nearGround ? Math.min(dogTargetCount(simDay), DOG_CAP) : 0;
  for(var di=0; di<dogN; di++){
    var dog = DOGS[di];
    if(dog.sniffing){
      if(faunaClock > dog.until){
        dog.sniffing = false;
        var dpick = DOG_PATCHES[Math.floor(hash2(di*3.7, Math.floor(faunaClock*0.09))*DOG_PATCHES.length) % DOG_PATCHES.length];
        dog.tx = dpick.x + (hash2(di*1.9, faunaClock)*8-4);
        dog.tz = dpick.z + (hash2(di*2.3, faunaClock)*8-4);
      }
    } else {
      var ddx2 = dog.tx-dog.x, ddz2 = dog.tz-dog.z, ddd = Math.hypot(ddx2,ddz2);
      if(ddd < 0.5){ dog.sniffing = true; dog.until = faunaClock + 6 + hash2(di, faunaClock)*18; }
      else { dog.x += (ddx2/ddd)*dog.speed*dt; dog.z += (ddz2/ddd)*dog.speed*dt; }
    }
    var dyaw = dog.sniffing ? (Math.atan2(dog.tx-dog.x||0.1, dog.tz-dog.z||0.1) + Math.sin(faunaClock*0.7+dog.phase)*0.5)
                            : Math.atan2(dog.tx-dog.x, dog.tz-dog.z);
    var dlean = dog.sniffing ? 0.22 + Math.sin(faunaClock*2.6+dog.phase)*0.10 : Math.sin(faunaClock*6.0+dog.phase)*0.04;
    setPersonInstance(dogMesh, di, dog.x, terrainHeight(dog.x,dog.z), dog.z, dyaw, dlean, 0, 1);
  }
  dogMesh.count = dogN; dogMesh.visible = dogN>0;
  dogMesh.instanceMatrix.needsUpdate = true;

  // ---- ship/dock rats (night-biased darters; late-1849 surge) ----
  var ratN = (alt<=380) ? Math.min(ratTargetCount(simDay), RAT_CAP) : 0;
  for(var ri2=0; ri2<ratN; ri2++){
    var rat = RATS[ri2];
    if(rat.pausing){
      if(faunaClock > rat.until){
        rat.pausing = false;
        var rtx = Math.min(rat.anchor.x + 3, rat.anchor.x + (hash2(ri2*4.1, faunaClock)*16-8)); // never dart seaward past the anchor band
        var rtz = rat.anchor.z + (hash2(ri2*2.9, faunaClock)*16-8);
        if(terrainHeight(rtx,rtz) > 0.15){ rat.tx = rtx; rat.tz = rtz; }
        else { rat.tx = rat.anchor.x; rat.tz = rat.anchor.z; }
      }
    } else {
      var rdx = rat.tx-rat.x, rdz = rat.tz-rat.z, rdd = Math.hypot(rdx,rdz);
      if(rdd < 0.25){ rat.pausing = true; rat.until = faunaClock + 0.8 + hash2(ri2, faunaClock)*3.2; }
      else { rat.x += (rdx/rdd)*3.4*dt; rat.z += (rdz/rdd)*3.4*dt; }
    }
    var ryaw = Math.atan2(rat.tx-rat.x||0.05, rat.tz-rat.z||0.05);
    setPersonInstance(ratMesh, ri2, rat.x, terrainHeight(rat.x,rat.z), rat.z, ryaw, 0, 0, 1);
  }
  ratMesh.count = ratN; ratMesh.visible = ratN>0;
  ratMesh.instanceMatrix.needsUpdate = true;

  // ---- cats (tethered-idle mousers + occasional dart; late 1849) ----
  var catN = (alt<=380) ? Math.min(catTargetCount(simDay), CAT_CAP) : 0;
  for(var kci=0; kci<catN; kci++){
    var cat = CATS[kci];
    if(cat.sitting){
      if(faunaClock > cat.until){
        cat.sitting = false;
        cat.tx = Math.min(cat.hx + 3, cat.hx + (hash2(kci*5.3, faunaClock)*12-6)); // stay on the dry side of the home band
        cat.tz = cat.hz + (hash2(kci*3.9, faunaClock)*12-6);
        if(terrainHeight(cat.tx,cat.tz) <= 0.15){ cat.tx = cat.hx; cat.tz = cat.hz; }
      }
    } else {
      var kdx = cat.tx-cat.x, kdz = cat.tz-cat.z, kdd = Math.hypot(kdx,kdz);
      if(kdd < 0.2){ cat.sitting = true; cat.until = faunaClock + 25 + hash2(kci, faunaClock)*55; }
      else { cat.x += (kdx/kdd)*2.6*dt; cat.z += (kdz/kdd)*2.6*dt; cat.yaw = Math.atan2(kdx,kdz); }
    }
    var kyaw = cat.sitting ? cat.yaw + Math.sin(faunaClock*0.2+cat.phase)*0.35 : cat.yaw;
    setPersonInstance(catMesh, kci, cat.x, terrainHeight(cat.x,cat.z), cat.z, kyaw, 0, 0, 1);
  }
  catMesh.count = catN; catMesh.visible = catN>0;
  catMesh.instanceMatrix.needsUpdate = true;

  // ---- pelican formation gliding the cove shoreline ----
  var pelN = (alt<=1600) ? PELICAN_N : 0;
  if(pelN>0){
    PELICANS.s += PELICANS.dir*PELICANS.speed*dt;
    if(PELICANS.s > PELICAN_PATH.total+48) PELICANS.dir = -1;
    if(PELICANS.s < -48) PELICANS.dir = 1;
    for(var pi2=0; pi2<pelN; pi2++){
      var back = pi2*8.5;
      var lat = (pi2%2 ? 1 : -1)*Math.ceil(pi2/2)*3.4;
      var ps = clamp(PELICANS.s - PELICANS.dir*back, 0, PELICAN_PATH.total);
      var pp = pointOnPolyline(PELICAN_PATH, ps);
      var plen = Math.hypot(pp.dx,pp.dz)||1;
      var px2 = pp.x + (-pp.dz/plen)*lat, pz2 = pp.z + (pp.dx/plen)*lat;
      var pyaw = Math.atan2(PELICANS.dir*pp.dx, PELICANS.dir*pp.dz);
      // glide band: low over the open pre-rush cove, lifted above the
      // ~20m mast forest once the ghost fleet packs the anchorage (no
      // clipping through rigging — QA-GATE integration).
      var pyBase = simDay>=GHOST_FLEET_START ? 26 : 10;
      var py2 = pyBase + Math.sin(faunaClock*0.5+pi2*1.1)*1.5;
      var flapEnv = Math.max(0, Math.sin(faunaClock*0.22+pi2*1.9)); // glide, with periodic flap bursts
      var proll = Math.sin(faunaClock*0.8+pi2*0.7)*0.10 + (flapEnv>0.86 ? Math.sin(faunaClock*7.0+pi2)*0.35*((flapEnv-0.86)/0.14) : 0);
      setPersonInstance(pelicanMesh, pi2, px2, py2, pz2, pyaw, 0, proll, 1);
    }
  }
  pelicanMesh.count = pelN; pelicanMesh.visible = pelN>0;
  pelicanMesh.instanceMatrix.needsUpdate = true;

  // ---- herons at the Mission Creek marsh edge (static-with-twitch) ----
  var hnN = 0;
  if(HERON_SPOTS.length && alt<=800){
    for(var hi2=0; hi2<HERON_SPOTS.length && hnN<HERON_N; hi2++){
      var hs = HERON_SPOTS[hi2];
      var hyaw2 = hs.yaw + Math.sin(faunaClock*0.07+hi2*2.1)*0.5;
      var dip = Math.pow(Math.max(0, Math.sin(faunaClock*0.16+hi2*2.7)), 12)*0.55; // rare strike-dip at the mud
      setPersonInstance(heronMesh, hnN++, hs.x, terrainHeight(hs.x,hs.z), hs.z, hyaw2, dip, 0, 0.95+((hi2*13)%10)*0.01);
    }
  }
  heronMesh.count = hnN; heronMesh.visible = hnN>0;
  heronMesh.instanceMatrix.needsUpdate = true;

  // ---- mud-winter props (strictly gated on the documented window) ----
  var mudF = weatherState.mud;
  puddleMesh.visible = mudF>0.03 && alt<=1000;
  if(puddleMesh.visible) puddleMesh.material.opacity = mudF*0.5*(1-nightFactor*0.55);
  mudPlankMesh.visible = mudF>0.05;
}

// (The people-home-assignment block — HOME_BUILDING_SPOTS, nextHome(),
// homeLabelFor() — and the DENSITY_CURVE inverter dayForDensityAtLeast()
// were never fauna's: relocated to layers/people.js (chunk 50) and
// core/03-sim.js (chunk 23) in the 2026-07-12 cleanup, per layers-spec OWNS.)

