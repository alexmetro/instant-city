/* =====================================================================
   LAYER people (slot 6) — OWNS person geometry/pools/gait, poses, clusters, schedules/routing consumption.
   Routes come from core/05-routing. NEVER: draws ground wear directly. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 5 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 36 — dune-leveling crew worksite */
/* =====================================================================
   DUNE-LEVELING CREW (behavior-spec.md item 4): a designated sand hill on
   the town's edge that visibly shrinks over months as it's carted away —
   never modifying the baked heightfield itself (the mound is a separate
   prop standing ON the real terrain; only ITS OWN scale animates), with
   2 static worker figures at its working face, a cart path, and a fill
   pile at the cove/wharf edge that grows as the hill shrinks — the same
   material moving from one honest visual system to another, echoing the
   town's real land-leveling/land-filling economy (research/geography-
   shoreline.md's cove-fill arc) at a legible, small scale.
   ===================================================================== */
var LEVELING_SITE = (function buildDuneLevelingSite(){
  var best = null;
  for(var tries=0; tries<220; tries++){
    var x = PLAZA_CENTER.x - 260 - rngBuild()*280;
    var z = PLAZA_CENTER.z - 40 + (rngBuild()-0.5)*320;
    var h = terrainHeight(x,z);
    if(h<3 || h>11) continue;
    if(!farFromVillage(x,z,40)) continue;
    if(!canPlace(x,z,16,{streetMargin:2})) continue;
    if(!best || h>best.h) best = {x:x,z:z,h:h};
  }
  if(!best){ var fx=PLAZA_CENTER.x-420, fz=PLAZA_CENTER.z-40; best = {x:fx,z:fz,h:terrainHeight(fx,fz)}; }
  registerPlacement(best.x,best.z,16);

  var moundGeo = new THREE.ConeGeometry(15,8,8,1).toNonIndexed();
  moundGeo.translate(0,4,0); // pivot at base — scaling Y shrinks from the base up, top comes down
  var posAttr = moundGeo.attributes.position;
  for(var vi=0; vi<posAttr.count; vi++){ // irregular silhouette, not a perfect cone
    posAttr.setX(vi, posAttr.getX(vi) + (hash2(vi*3.1, best.x*0.011)-0.5)*2.2);
    posAttr.setZ(vi, posAttr.getZ(vi) + (hash2(vi*4.7, best.z*0.011)-0.5)*2.2);
  }
  moundGeo.computeVertexNormals();
  colorizeUniform(moundGeo, new THREE.Color(0xd8c48c));
  var moundMesh = new THREE.Mesh(moundGeo, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}));
  moundMesh.position.set(best.x, best.h, best.z);
  scene.add(moundMesh);

  var wharfPt = (function(){ var v=(GEO.streetsV.clay+GEO.streetsV.washington)/2; return gridToWorld(GEO.streetsU.montgomery+14, v); })();
  var fillGeo = new THREE.ConeGeometry(7,3,7,1).toNonIndexed();
  fillGeo.translate(0,1.5,0);
  colorizeUniform(fillGeo, new THREE.Color(0xc9b378));
  var fillMesh = new THREE.Mesh(fillGeo, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}));
  var fillBaseY = Math.max(terrainHeight(wharfPt.x, wharfPt.z), 0);
  fillMesh.position.set(wharfPt.x, fillBaseY, wharfPt.z);
  fillMesh.scale.y = 0.001;
  scene.add(fillMesh);

  // Cart track from the mound to the fill site — LEGACY-STREET-MESH fix
  // (2026-07-10): used to build its own raised drapeGroundStrip() box mesh;
  // now just hands the same waypoints to SPLAT_LEVELING_CART_PTS, painted
  // by renderGroundSplat() with the same color/width/mottle as before.
  var pathPts = [], hops=10;
  for(var i=0;i<=hops;i++){ var t=i/hops; pathPts.push({x:lerp(best.x,wharfPt.x,t), z:lerp(best.z,wharfPt.z,t)}); }
  SPLAT_LEVELING_CART_PTS = pathPts;

  var workerGeoms = [];
  for(var wI=0; wI<2; wI++){
    var wx = best.x + Math.cos(wI*2.4)*6, wz = best.z + Math.sin(wI*2.4)*6;
    var wy = terrainHeight(wx,wz);
    workerGeoms.push(makeOutpostPersonGeo(new THREE.Color(0x39332a), new THREE.Color(0x241f1a), false));
    bake(workerGeoms[workerGeoms.length-1], new THREE.Vector3(wx,wy,wz), wI*1.4);
    var pick = makeBoxLocal(0.06,1.1,0.06, new THREE.Color(0x4a3c2c));
    bake(pick, new THREE.Vector3(wx+0.3,wy+0.5,wz), wI*1.4+0.6);
    workerGeoms.push(pick);
  }
  if(workerGeoms.length) scene.add(new THREE.Mesh(mergeGeoms(workerGeoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0})));

  console.log("[verify] Dune-leveling site at ("+best.x.toFixed(0)+","+best.z.toFixed(0)+"), start height "+best.h.toFixed(1)+"m");
  return { x:best.x, z:best.z, baseH:best.h, moundMesh:moundMesh, fillMesh:fillMesh, fillBaseY:fillBaseY,
    startDay:eventDateToSimDay("1847-09-01"), endDay:eventDateToSimDay("1849-06-01") };
})();
function updateLevelingSite(){
  var t = clamp((simDay-LEVELING_SITE.startDay)/(LEVELING_SITE.endDay-LEVELING_SITE.startDay),0,1);
  LEVELING_SITE.moundMesh.scale.y = 1 - 0.82*smoothstep(0,1,t); // shrinks toward a low residual rise, never fully vanishes
  LEVELING_SITE.fillMesh.scale.y = 0.05 + 2.1*smoothstep(0,1,t);
}

/* @P1850-CHUNK 42 — phase 4: name banks, walking routes */
/* =========================================================================
   PHASE 4 — "THE PEOPLE"
   Ambient (bubble-tier) instanced walkers below peopleMaxAltitude (350m,
   spec §9/§4), followable with a lazy deterministic biography that
   crystallizes on click and persists for the seed, plus two DOCUMENTED
   figures (Brannan's gold announcement, Leidesdorff's funeral) that
   appear only on their true dates and cite cast.md/the feed.
   ========================================================================= */

/* ---- 1. name banks / trades / agendas — simulated fill, grounded in
   demographics-society.md's origin composition, not claiming real people ---- */
var NAME_BANKS = {
  american:   { first:["John","William","James","Thomas","Robert","Charles","Henry","George","Samuel","Edward"],
                last:["Smith","Brown","Davis","Clark","Wilson","Hayes","Foster","Bennett","Sawyer","Whitfield"] },
  californio: { first:["José","Francisco","Ramón","Antonio","Ignacio","María","Concepción","Dolores"],
                last:["Peralta","Sanchez","Guerrero","Amador","Bernal","Noe","Castro","Alviso"] },
  black:      { first:["Moses","Isaac","William","Charles","Mary","Sarah","Peter","Daniel"],
                last:["Freeman","Carter","Jackson","Reed","Bowman","Prince","Harding"] },
  hawaiian:   { first:["Kealoha","Kahale","Nahoa","Kaimana","Kanoa","Malia","Keoni","Pua"],
                last:[], singleName:true },
  // s50 NATIVE PRESENCE: mission-register single baptismal names — the form
  // the record itself uses for the Mission Dolores community (cf. the one
  // documented individual, Pedro Evencio, and the register style in
  // demographics-society.md §5). Name pool fill:true; deliberately NOT
  // invented "tribal" names (native-presence-1846-49.md §6 DON'T: no
  // pan-Indian imagery/naming — mission survivors bore Spanish baptismal
  // names in every period source we hold).
  indigenous: { first:["Ignacio","Gregorio","Bruno","Fermín","Faustino","Marcelo","Tiburcio","Juana","Gertrudis","Dolores"],
                last:[], singleName:true },
  french:     { first:["Jean","Pierre","Louis","Henri","Étienne","Marie","Adèle"],
                last:["Dubois","Lefèvre","Moreau","Girard","Bonnet","Chevalier"] },
  chilean:    { first:["Manuel","Pedro","Diego","Rafael","Domingo","Rosa","Carmen"],
                last:["Silva","Rojas","Vidal","Ortega","Vergara","Cifuentes"] },
  australian: { first:["Michael","Patrick","Thomas","William","Bridget","Margaret"],
                last:["Ryan","Doyle","Sullivan","Walsh","Kelly","No more m"] },
  chinese:    { first:["Ah Fong","Ah Sing","Ah Toy","Ah Chung","Ah Ming","Ah Wing"],
                last:["Lai","Yee","Chan","Wong","Chun"] }
};
var TRADES = ["carpenter","teamster","sailor ashore","clerk","blacksmith","cook","washerwoman",
  "lodging-house keeper","drayman","baker","tinsmith","stevedore","grocer's hand","outfitter",
  "boarding-house cook","brickmaker"];
// GAPS-2026-07-09 item 3 (SFPD founding, Aug 13 1849): "constable" only
// enters the trade pool once Malachi Fallon's force actually existed — see
// TRADE_EARLIEST_DAY below, folded into each routine slot's notBeforeDay.
var TRADES_WITH_CONSTABLE = TRADES.concat(["constable"]);
var SFPD_FOUNDING_DAY = eventDateToSimDay("1849-08-13");
var TRADE_EARLIEST_DAY = { constable: SFPD_FOUNDING_DAY };
var AGENDAS = [
  "saving passage money for the mines","minding a cousin's store on commission",
  "waiting on a ship that hasn't come in","just off the boat, still finding his feet",
  "keeping accounts for a Montgomery Street merchant","running letters up to the post office",
  "digging a well for the new arrivals","mending nets down by the beach",
  "hauling lumber up from the wharf","looking for work before the rains",
  "nursing a fever caught on the passage out","building a second room onto the shanty"
];
var ORIGINS = [
  { key:"american",   label:"American",              weight:5.0, earliestDay:0 },
  { key:"californio", label:"Californio",            weight:1.1, earliestDay:0 },
  { key:"black",       label:"Black (American)",      weight:0.3, earliestDay:0 },
  { key:"hawaiian",    label:"Sandwich Islander",     weight:0.6, earliestDay:0 },
  // s50 NATIVE PRESENCE (GAPS-2026-07-10 item 7, native-presence-1846-49.md
  // §2/§6): the June/Aug 1847 town census counted 34 Indigenous of 459
  // total = 7.4% (California Star Aug 28 1847 + 1855 Annals — clm:demo:4,
  // clm:timeline:20). CALIBRATION NOTE: a weight of 0.56 would be the
  // naive parallel to hawaiian's 0.6-for-8.7%, but indigenous slots never
  // consume roster names (the corpus documents no named Native individual
  // in the town core, §3), and it is precisely the roster's 1847-48
  // first-mention dates that thin every OTHER origin's alive count by
  // ~half at the census date — so 0.56 overshot the sampled 1847 share to
  // ~17%. The census anchor is carried instead by: (a) this small random
  // weight for anonymous town presence (the census's own 34-in-town), plus
  // (b) the GUARANTEED rancheria households (RANCHERIA_TARGET + Pedro
  // Evencio, built below) — together spot-checked in-browser to ≈7.4% of
  // the alive register at mid-1847. ERA CURVE: the share then dilutes as
  // the rush cohorts' earliestDay arrivals inflate the town, and thins
  // further via staggered notAfterDay expiry (indigenousNotAfterDay below)
  // toward the 1852 SF+SM census tail of 140 across BOTH counties
  // (clm:demo:141). Dress: same period working clothes as every other
  // laborer (WARDROBE.everyday) — no caricature, per research §6.
  { key:"indigenous",  label:"Indigenous (Ramaytush/Mission)", weight:0.09, earliestDay:0 },
  { key:"french",      label:"French",                weight:0.7, earliestDay:eventDateToSimDay("1849-02-01") },
  { key:"chilean",     label:"Chilean/Peruvian",      weight:1.4, earliestDay:eventDateToSimDay("1848-10-25") },
  { key:"australian",  label:"Australian",            weight:1.0, earliestDay:eventDateToSimDay("1849-04-01") },
  { key:"chinese",     label:"Chinese",               weight:0.4, earliestDay:eventDateToSimDay("1849-01-01") }
];
var ORIGINS_BY_KEY = {}; ORIGINS.forEach(function(o){ ORIGINS_BY_KEY[o.key]=o; });
// PL-A leftover, completed: origins already drove name banks (NAME_BANKS
// below); this is the missing "subtle appearance tint" half — a gentle
// per-origin RGB multiply (kept close to 1,1,1 on purpose) applied via
// InstancedMesh.setColorAt in updatePeople(), read as a hint of complexion
// diversity across the documented origin mix rather than a costume marker.
// fill:true aesthetic judgment; not a sourced statistic.
var ORIGIN_TINT = {
  american:   new THREE.Color(1.00,1.00,1.00),
  californio: new THREE.Color(1.03,0.96,0.88),
  black:      new THREE.Color(0.86,0.76,0.67),
  hawaiian:   new THREE.Color(1.02,0.93,0.80),
  indigenous: new THREE.Color(1.02,0.93,0.82),
  french:     new THREE.Color(1.00,0.99,0.96),
  chilean:    new THREE.Color(1.01,0.94,0.85),
  australian: new THREE.Color(0.99,0.98,0.96),
  chinese:    new THREE.Color(1.00,0.96,0.85)
};
/* gender ratio: 70% male pre-rush (Jan 1847 count, 321/459), easing toward the
   ~97-98% male 1849 peak (Harbor Master's log / Annals), then back to ~84% by
   1853 (Ladies' Protection & Relief Society figure) — demographics-society.md §1. */
function genderMaleFrac(day){
  var d47=eventDateToSimDay("1847-01-26"), d49=eventDateToSimDay("1849-06-01"), d53=eventDateToSimDay("1853-01-01");
  if(day<=d47) return 0.70;
  if(day<=d49) return lerp(0.70,0.975,(day-d47)/(d49-d47));
  if(day<=d53) return lerp(0.975,0.84,(day-d49)/(d53-d49));
  return 0.84;
}
function pickWeighted(keys, table){
  var total=0; keys.forEach(function(k){ total+=table[k].weight; });
  var r = rngBuild()*total;
  for(var i=0;i<keys.length;i++){ r-=table[keys[i]].weight; if(r<=0) return keys[i]; }
  return keys[keys.length-1];
}

/* ---- 2. walking routes — real streets (GEO grid), the real waterfront
   sample lines, and the Mission road, so ambient people move along the
   same ground truth as the buildings/streets, not invented paths ---- */
function buildPolyline(pts, loop){
  var arr = pts.slice(); if(loop) arr.push(pts[0]);
  var segs=[], total=0;
  for(var i=0;i<arr.length-1;i++){
    var d = Math.hypot(arr[i+1].x-arr[i].x, arr[i+1].z-arr[i].z);
    segs.push({ a:arr[i], b:arr[i+1], d:d, cum:total });
    total += d;
  }
  return { segs:segs, total:Math.max(total,1), loop:!!loop };
}
function pointOnPolyline(poly, s){
  var segs = poly.segs;
  for(var i=0;i<segs.length;i++){
    var seg = segs[i];
    if(s<=seg.cum+seg.d || i===segs.length-1){
      var t = seg.d>0 ? clamp((s-seg.cum)/seg.d,0,1) : 0;
      return { x:lerp(seg.a.x,seg.b.x,t), z:lerp(seg.a.z,seg.b.z,t), dx:seg.b.x-seg.a.x, dz:seg.b.z-seg.a.z };
    }
  }
  var last = segs[segs.length-1];
  return { x:last.b.x, z:last.b.z, dx:last.b.x-last.a.x, dz:last.b.z-last.a.z };
}
function loopPoints(cx,cz,r,n){
  var pts=[];
  for(var i=0;i<n;i++){ var a=(i/n)*Math.PI*2; pts.push({x:cx+Math.cos(a)*r, z:cz+Math.sin(a)*r}); }
  return pts;
}
var HAPPY_VALLEY_REVEAL_DAY = eventDateToSimDay("1849-01-05"); // tents/growth start reading as Happy Valley around here

/* @P1850-CHUNK 44 — homes & workplaces, social clusters, occupation->venue binding */
/* ---- 2c. HOMES & WORKPLACES — a home is a real VILLAGE_BUILDING_SPOTS
   building (capacity-weighted; ~18% are boarding houses that hold many,
   reflecting the era) or, once tents exist, a real tentCandidates lot; a
   workplace is a real trade site: the Clay St landing, a signed shop
   building (reusing the six signage boards already on real buildings), the
   Plaza market, the beach (sailors/fishing), Mission Dolores, or a lot
   that's currently mid-"raise" (construction gets workers). ---- */
var SIGN_WORD_LABEL = { "GROCER":"grocer's", "DRY GOODS":"dry goods store", "PROVISIONS":"provisions store",
  "BOARDING":"boarding house", "TIN SHOP":"tin shop", "SHIP CHANDLERY":"ship chandlery" };
function pickShopSite(word){
  for(var i=0;i<SIGN_BUILDING_SPOTS.length;i++){
    if(SIGN_BUILDING_SPOTS[i].word===word){
      var s = SIGN_BUILDING_SPOTS[i];
      return { key:"shop_"+word, label:SIGN_WORD_LABEL[word]||word.toLowerCase(), x:s.x, z:s.z, rot:s.rot, activity:"stationary" };
    }
  }
  return null;
}
// GAPS-2026-07-09 item 3 (gambling quarter): the plaza's named gambling
// houses, already standing as VILLAGE_BUILDING_SPOTS entries — see
// buildFireBlock() and the City Hotel placement above.
var GAMBLING_BUILDING_NAMES = { "El Dorado":1, "Parker House":1, "Bella Union":1, "Verandah":1, "Washington Arcade":1, "Dennison's Exchange":1 };
var GAMBLING_SPOTS = VILLAGE_BUILDING_SPOTS.filter(function(s){ return GAMBLING_BUILDING_NAMES[s.name]; });
function pickGamblingSite(){
  if(GAMBLING_SPOTS.length===0) return null;
  var s = GAMBLING_SPOTS[Math.floor(rngBuild()*GAMBLING_SPOTS.length)];
  return { key:"gambling_"+s.name, label:s.name, x:s.x, z:s.z, activity:"stationary" };
}
var WORKSITE_PLAZA_MARKET = { key:"plazamarket", label:"Plaza market", x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, activity:"market" };
// s50 fix (found verifying rancheria inhabitants at LIVE): this worksite
// sat at OUTPOSTS.mission exactly — the CHURCH's own center — so every
// mission worker's stationary at-work pose (±3.6m clusterOffset) rendered
// INSIDE the 34.7x6.7m church mesh, invisible. Moved to the open forecourt
// SW of the church, clear of the building footprint and the cemetery plot.
var WORKSITE_MISSION = { key:"mission", label:"Mission Dolores", x:OUTPOSTS.mission.x-14, z:OUTPOSTS.mission.z+12, activity:"stationary" };
var WORKSITE_WHARF = (function(){
  var wharfV = (GEO.streetsV.clay+GEO.streetsV.washington)/2;
  var landPt = gridToWorld(GEO.streetsU.montgomery, wharfV);
  var lastLandX = landPt.x, x = landPt.x;
  for(var step=0; step<80; step++){ x+=3; if(terrainHeight(x,landPt.z)<0) break; lastLandX=x; }
  return { key:"wharf", label:"Clay St landing", x:lastLandX-2, z:landPt.z, activity:"carry",
    pairA:{x:lastLandX-6, z:landPt.z-2}, pairB:{x:lastLandX+7, z:landPt.z+1.5} };
})();
var WORKSITE_BEACH = (function(){
  var ln = waterfrontBeachLines[Math.floor(waterfrontBeachLines.length*0.5)] || null;
  var p = ln ? { x:lerp(ln.landX,ln.waterX,0.55), z:ln.z } : { x:WORKSITE_WHARF.x, z:WORKSITE_WHARF.z };
  return { key:"beach", label:"beach", x:p.x, z:p.z, activity:"fish" };
})();
// PL-B item 4 (grit): candidate ground-sleeping spots for the 1849
// street-sleeper population (see sleepsRough on EXTRA slots) — clustered
// near the Plaza and the Clay St landing, the two documented centers of
// the transient/broke-on-arrival crowd (economy-daily-life.md §1.5).
var STREET_SLEEPER_CANDIDATES = (function(){
  var pts = [];
  function addAround(cx,cz,n,rad){
    for(var i=0;i<n;i++){
      var a = rngBuild()*Math.PI*2, r = 6+rngBuild()*rad;
      var x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r;
      if(terrainHeight(x,z)>1) pts.push({x:x,z:z});
    }
  }
  addAround(PLAZA_CENTER.x, PLAZA_CENTER.z, 16, 55);
  addAround(WORKSITE_WHARF.x, WORKSITE_WHARF.z, 10, 40);
  return pts;
})();
function nearestSleeperSpot(x,z){
  var best=null, bd=1e18;
  for(var i=0;i<STREET_SLEEPER_CANDIDATES.length;i++){
    var p = STREET_SLEEPER_CANDIDATES[i], d=(p.x-x)*(p.x-x)+(p.z-z)*(p.z-z);
    if(d<bd){ bd=d; best=p; }
  }
  return best || { x:PLAZA_CENTER.x, z:PLAZA_CENTER.z };
}

/* =========================================================================
   TECHNIQUES §7 — SOCIAL CLUSTERS (facing-circle conversation groups).
   The Sims-style placement rule, no social AI: idle-eligible walkers
   join/found a cluster at an existing graph anchor (Plaza corners, shop
   doorways, the wharf head), stand on a jittered circle r = 0.9+0.3·rand,
   bodies oriented at the group centroid ±20° (never exactly at it), hold
   20-90 sim-minutes, disperse. Every roll is the counter-based dice
   (hash(seed, person, day, slot) — behavior-spec.md §3), so cluster
   membership is identical after any rewind/date-jump; the shared centroid
   jitter hashes on (anchor, day), not the person, so members of the same
   day's group agree on where it stands. Voice rule: the only narrative
   surface is the inspector's _now field ("talking at ..."), never on-
   screen narration.
   ========================================================================= */
var CLUSTER_ANCHORS = (function(){
  var out = [];
  ["kearny_clay","kearny_washington","dupont_clay","dupont_washington"].forEach(function(k){
    var ni = STREET_GRAPH.idx[k];
    if(ni==null) return;
    var n = STREET_GRAPH.nodes[ni];
    out.push({ x:n.x, z:n.z, label:"the "+nearestStreetPair(n.x,n.z)+" corner of the Plaza" });
  });
  var wi = STREET_GRAPH.idx.wharf;
  if(wi!=null){ var wn = STREET_GRAPH.nodes[wi]; out.push({ x:wn.x, z:wn.z, label:"the wharf head" }); }
  // shop doorways — a step out from the signed storefronts' own facing side
  SIGN_BUILDING_SPOTS.slice(0,4).forEach(function(s){
    var fd = (s.d||3)*0.5 + 1.8;
    out.push({ x:s.x+Math.sin(s.rot)*fd, z:s.z+Math.cos(s.rot)*fd,
      label:"the "+(s.word ? s.word.toLowerCase() : "shop")+" doorway" });
  });
  return out;
})();
var CLUSTER_START_HOURS = [8.5, 10, 11.5, 13, 14.5, 16, 17.5]; // quantized so the dice actually co-locate people
function resolveClusterPlan(slot, day){
  var dayKey = Math.floor(day);
  if(slot._clusterDay === dayKey) return;
  slot._clusterDay = dayKey;
  var rng = diceRng(slot.id, day, "cluster");
  if(rng() < 0.60){ slot._cluster = null; return; } // ~40% of ambient walkers pause to talk at some point today
  var anchorI = Math.floor(rng()*CLUSTER_ANCHORS.length);
  var anchor = CLUSTER_ANCHORS[anchorI];
  var h0 = CLUSTER_START_HOURS[Math.floor(rng()*CLUSTER_START_HOURS.length)];
  var durH = (20 + rng()*70)/60; // 20-90 sim-minutes
  var r = 0.9 + 0.3*rng();
  var ang = rng()*Math.PI*2;
  var faceJit = (rng()-0.5)*(Math.PI/4.5); // ±20° off the centroid — perfect facing reads robotic
  var carry = !slot.isChild && rng()<0.15; // one mid-errand member stopped to chat, crate still shouldered
  var ch = cyrb128(seedHashValue()+"|cluster|"+anchorI+"|"+dayKey);
  var crng = sfc32(ch[0],ch[1],ch[2],ch[3]);
  var ccx = anchor.x + (crng()-0.5)*3.0, ccz = anchor.z + (crng()-0.5)*3.0;
  // s59 walkability: a jittered centroid landing inside a footprint snaps
  // back to the anchor itself (anchors are open ground by construction) —
  // deterministic, same result for every member of the day's group.
  if(walkBlockedAt(ccx, ccz, day)){ ccx = anchor.x; ccz = anchor.z; }
  slot._cluster = { anchor:anchor, h0:h0, h1:h0+durH, r:r, ang:ang, faceJit:faceJit, carry:carry,
    cx:ccx, cz:ccz };
}
var CONSTRUCTION_SITES = growthBuildingCandidates.slice(0, Math.min(30, growthBuildingCandidates.length))
  .map(function(c,i){ return { key:"construction_"+i, label:"a house going up nearby", x:c.x, z:c.z, activity:"construction" }; });
function pickConstructionSite(rng){
  return CONSTRUCTION_SITES.length ? CONSTRUCTION_SITES[Math.floor(rng()*CONSTRUCTION_SITES.length)] : WORKSITE_PLAZA_MARKET;
}
function worksiteForTrade(trade, rng){
  switch(trade){
    case "carpenter": case "brickmaker": case "blacksmith": return pickConstructionSite(rng);
    case "teamster": case "drayman": case "stevedore": return rng()<0.75 ? WORKSITE_WHARF : WORKSITE_BEACH;
    case "sailor ashore": return rng()<0.6 ? WORKSITE_BEACH : WORKSITE_WHARF;
    case "grocer's hand": return pickShopSite("GROCER") || WORKSITE_PLAZA_MARKET;
    case "outfitter": return pickShopSite("DRY GOODS") || WORKSITE_PLAZA_MARKET;
    case "clerk": return rng()<0.5 ? (pickShopSite("DRY GOODS")||WORKSITE_PLAZA_MARKET) : WORKSITE_PLAZA_MARKET;
    case "baker": return pickShopSite("PROVISIONS") || WORKSITE_PLAZA_MARKET;
    case "cook": case "boarding-house cook": case "lodging-house keeper": case "washerwoman":
      return pickShopSite("BOARDING") || WORKSITE_PLAZA_MARKET;
    case "tinsmith": return pickShopSite("TIN SHOP") || WORKSITE_PLAZA_MARKET;
    // GAPS-2026-07-09 item 3: the SFPD's first station was a one-room former
    // schoolhouse on Portsmouth Square (clm:police:28) — same plaza worksite,
    // distinct label.
    case "constable": return { key:"stationhouse", label:"station house on the Plaza", x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, activity:"stationary" };
    default: return WORKSITE_PLAZA_MARKET;
  }
}
/* ---- 2d. CATALOG-DRIVEN OCCUPATION -> VENUE binding (behavior-spec.md
   item 2): occ.venueNeeds carries catalog venue-key strings (wharf, shop,
   construction_site, leveling_site, saloon, mission, ...); this resolves
   the first one that has a real standing venue in this world, honoring
   "venueNeeds bind people to the venues that exist — worldSupport:exists
   only". A few named/notable spots get specific bindings (City Hotel,
   the plaza's gambling houses, the new chapel/lumber yard) rather than
   always falling through to the generic Plaza. ---- */
function pickAnyShopSite(rng){
  if(SIGN_BUILDING_SPOTS.length===0) return null;
  var s = SIGN_BUILDING_SPOTS[Math.floor(rng()*SIGN_BUILDING_SPOTS.length)];
  return { key:"shop_"+s.word+"_r", label:SIGN_WORD_LABEL[s.word]||s.word.toLowerCase(), x:s.x, z:s.z, activity:"stationary" };
}
var CITY_HOTEL_SPOT = NAMED_BUILDING_SPOTS.filter(function(s){ return s.name==="City Hotel"; })[0] || null;

/* @P1850-CHUNK 46 — dice engine + arrivals flow */
/* =========================================================================
   PL-B item 1 — THE FULL DICE ENGINE (behavior-spec.md §3), replacing PL-A's
   flat per-slot coinflips (a fixed 40% doErrand, a fixed saloonWeight
   formula decided ONCE at slot-build time and never revisited) with a real
   per-CALENDAR-DAY weighted sample against data/catalog-activities.json:

     weight = catalogBase(1.0) x occupationFit x traitModifiers x needPressure x timeWindow/era x genderPropriety

   Every roll is hash(seed, person, day, slot) — a fresh cyrb128+sfc32
   derivation per (person,day,slotKey) key rather than accumulated RNG
   state, so a date jump/rewind reproduces the identical pick with no
   history replay (counter-based, per the spec's "rewind is exact").
   Needs (food, sociability — behavior-spec.md §1) rise one unit per day
   until an activity that relieves them is picked, Sims-style; rest is
   handled by the existing universal night-sleep branch below, not by this
   pool (everyone sleeps; there is no "choice" to model there).
   ========================================================================= */
function diceRng(personId, day, slotKey){
  var h = cyrb128(seedHashValue()+"|p"+personId+"|d"+Math.floor(day)+"|"+slotKey);
  return sfc32(h[0],h[1],h[2],h[3]);
}
function diceRoll(personId, day, slotKey){ return diceRng(personId,day,slotKey)(); }

// fill:true — SS California's Feb 28 1849 debut is the only documented
// steamer date this app has; the monthly 28th-of-the-month repeat is an
// approximation (the real schedule slipped with weather/repairs) used only
// to drive the write_letters/watch_ships_arrive/mail spike windows the
// catalog itself flags (timeWindow.spike==="steamer_day").
var STEAMER_DAY0 = eventDateToSimDay("1849-02-28");
function isSteamerDay(day){ return day>=STEAMER_DAY0 && dateFromSimDay(Math.floor(day)).getUTCDate()===28; }
var DOW_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// occupation-fit (fill:true, no direct citation — "your trade colors your
// leisure taste" is an era-consistent design judgment, not a documented
// statistic): a light multiplier on top of the trait/need/era weight.
var OCC_CATEGORY_ACTIVITY_BOOST = {
  vice_economy:  { drink_at_saloon:1.6, gamble_cards:1.7 },
  clergy:        { attend_church_sunday:1.8, read_newspaper_at_exchange:1.2 },
  press:         { read_newspaper_at_exchange:1.8 },
  civic:         { attend_town_meeting:1.6, read_newspaper_at_exchange:1.2 },
  commerce:      { attend_auction_spectate:1.4, read_newspaper_at_exchange:1.3 },
  maritime:      { watch_ships_arrive:1.5, drink_at_saloon:1.2 },
  agriculture_subsistence: { fish_recreational:1.3 },
  professional:  { read_newspaper_at_exchange:1.3, attend_town_meeting:1.2 }
};
// which need axis each activity relieves, and by how much (fill:true shape,
// tuned by the reconciler's statistical spot-check, not itself sourced).
var NEED_RELIEF = {
  eat_meal:{food:1.0}, drink_at_saloon:{social:0.8}, gamble_cards:{social:0.35},
  visit_friend:{social:1.0}, gossip_street:{social:0.6}, watch_music_dance:{social:0.7},
  promenade_stroll:{social:0.3}, watch_ships_arrive:{social:0.2},
  attend_auction_spectate:{social:0.2}, read_newspaper_at_exchange:{social:0.25},
  attend_town_meeting:{social:0.3}, play_music_instrument:{social:0.4}
};
// the catalog's traitModifiers keys are "<axisFamilyWord>:<poleName>" (e.g.
// "drinker:heavy", "idler:idle") — two pole spellings ("heavy","idle")
// don't match this app's own rolled trait-value strings ("heavy-drinker",
// "idler") verbatim; every other pole spells identically. Since all ten
// pole values across the five axes are unique strings, matching a
// normalized pole against the person's five rolled values (regardless of
// the axis-family word prefix) is sufficient — no per-axis lookup needed.
var TRAIT_POLE_ALIAS = { heavy:"heavy-drinker", idle:"idler" };
function traitModifierFor(act, traits){
  if(!act.traitModifiers) return 1;
  var poles = [traits.drink, traits.work, traits.faith, traits.social, traits.temperament];
  var m = 1;
  Object.keys(act.traitModifiers).forEach(function(k){
    var pole = k.split(":")[1]; pole = TRAIT_POLE_ALIAS[pole] || pole;
    if(poles.indexOf(pole)!==-1) m *= act.traitModifiers[k];
  });
  return m;
}
function activityEraCol(day){ return day>=ERA_1849_DAY ? "1849" : "1846-1848"; }
// sleep_rest and attend_church_sunday are handled by the fixed night/Sunday
// branches in computeRoutinePosition — excluded from the free-choice pools
// below so they're never double-resolved.
function poolFor(tags){
  return CATALOG_ACT.filter(function(a){
    if(a.id==="sleep_rest" || a.id==="attend_church_sunday") return false;
    return a.timeWindow && a.timeWindow.timeOfDay && a.timeWindow.timeOfDay.some(function(t){ return tags.indexOf(t)!==-1; });
  });
}
// the app's two existing "free choice" windows: the midday break (~12-13.4h)
// and the evening-out window (~19-20.7h) — catalog activities are matched
// into whichever pool their own timeWindow.timeOfDay tags fall into (some,
// e.g. promenade_stroll/visit_friend, land in both and so can be picked in
// either window).
var MIDDAY_POOL = poolFor(["morning","midday","afternoon"]);
var EVENING_POOL = poolFor(["evening","night"]);
function pickActivity(pool, slot, day, slotKey){
  var era = activityEraCol(day);
  var dow = DOW_NAMES[dateFromSimDay(Math.floor(day)).getUTCDay()];
  var steamer = isSteamerDay(day);
  var occBoost = (slot.occ && OCC_CATEGORY_ACTIVITY_BOOST[slot.occ.category]) || null;
  var candidates = [], total = 0;
  for(var i=0;i<pool.length;i++){
    var a = pool[i];
    if(!a.eraAvailability || !a.eraAvailability[era]) continue; // "the activity doesn't exist yet" — hard gate, not a skew
    if(a.timeWindow.daysOfWeek!=="all" && a.timeWindow.daysOfWeek.indexOf(dow)===-1) continue;
    var w = 1.0;
    w *= traitModifierFor(a, slot.traits);
    w *= slot.gender==="male" ? a.genderPropriety.m : a.genderPropriety.f;
    if(occBoost && occBoost[a.id]) w *= occBoost[a.id];
    var relief = NEED_RELIEF[a.id];
    if(relief){
      if(relief.food) w *= (1+slot.needs.food*relief.food*0.7);
      if(relief.social) w *= (1+slot.needs.social*relief.social*0.6);
    }
    if(a.timeWindow.spike==="steamer_day" && steamer) w *= 3.2;
    if(w<=0) continue;
    candidates.push({a:a, w:w}); total += w;
  }
  if(total<=0) return null;
  var r = diceRoll(slot.id, day, slotKey)*total;
  for(var j=0;j<candidates.length;j++){ r -= candidates[j].w; if(r<=0) return candidates[j].a; }
  return candidates[candidates.length-1].a;
}
// resolves a chosen activity's venueNeeds against the SAME VENUE_KEY_RESOLVERS
// table occupations already use — behavior-spec.md's "venueNeeds bind
// people to the venues that exist" rule applies equally to leisure choices.
function venueForActivity(act, slot, day, slotKey){
  var need = act.venueNeeds || [];
  for(var i=0;i<need.length;i++){
    var resolver = VENUE_KEY_RESOLVERS[need[i]];
    if(resolver){
      var rng = diceRng(slot.id, day, slotKey+"_venue"+i);
      var w = resolver(rng);
      if(w) return w;
    }
  }
  return WORKSITE_PLAZA_MARKET;
}
// pose to render while performing each activity, reusing the existing
// POSE_BOB vocabulary rather than inventing new animation states.
var ACT_POSE = {
  eat_meal:"market", fetch_water:"idle", wash_bathe:"idle", warm_by_fire:"idle",
  drink_at_saloon:"evening", gamble_cards:"evening", watch_music_dance:"evening", play_music_instrument:"evening",
  read_by_water:"idle", promenade_stroll:"idle", visit_friend:"idle", write_letters:"stationary",
  fish_recreational:"fish", watch_ships_arrive:"stationary", smoke_pipe_idle:"idle",
  attend_auction_spectate:"stationary", gossip_street:"idle", attend_town_meeting:"stationary",
  attend_funeral:"stationary", attend_wedding_celebration:"evening", read_newspaper_at_exchange:"stationary"
};
// resolved once per calendar day per routine slot (cached on slot._scheduleDay),
// not every frame — the dice pick itself is cheap but deterministic-per-day,
// so there is nothing gained by re-rolling every tick.
function resolveDailySchedule(slot, day){
  var dayKey = Math.floor(day);
  if(slot._scheduleDay === dayKey) return;
  slot._scheduleDay = dayKey;
  slot.needs.food += 1; slot.needs.social += 1; // "rise until acted on" (behavior-spec.md §3)

  // s59 micro speed variance: each routine walker owns a purposeful pace
  // (~1.4-1.85 m/s, median ~1.6) — hash-dealt off slot.id, no rng-stream
  // draw, stable across rewinds. Extras already amble at their own speed.
  if(slot.walkMps==null) slot.walkMps = 1.38 + 0.47*hash2(slot.id*0.617+3.31, 9.13);

  // s59 ROUTE BUCKETS: the standing legs (commute/errand/Sunday/chapel) are
  // re-routed once per 30-day bucket — road lifecycle states have moved, new
  // construction stands. Pure function of (bucket, person, lifeVariant):
  // rewind lands in the same bucket -> the identical route. The swap happens
  // here (calendar-day rollover / fresh jump), never mid-walk at LIVE.
  var bucket = Math.floor(day/ROUTE_BUCKET_DAYS);
  if(slot._routeBucket!==bucket && slot.workPos){
    slot._routeBucket = bucket;
    slot.commutePoly = buildRoutePoly(slot.homePos.x,slot.homePos.z, slot.workPos.x,slot.workPos.z, {day:day, who:slot.id});
    slot.errandPoly  = buildRoutePoly(slot.workPos.x,slot.workPos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:day, who:slot.id});
    slot.sundayPoly  = buildRoutePoly(slot.homePos.x,slot.homePos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:day, who:slot.id});
    if(slot.sundayGoesToChurch && CHURCH_SPOT)
      slot.churchPoly = buildRoutePoly(slot.homePos.x,slot.homePos.z, CHURCH_SPOT.x,CHURCH_SPOT.z, {day:day, who:slot.id});
  }

  var isTent = slot.home && slot.home.type==="tent";
  var campfireSite = { x:slot.homePos.x, z:slot.homePos.z, label:"the campfire" };

  var mAct = pickActivity(MIDDAY_POOL, slot, day, "midday");
  if(mAct){
    var mSite = isTent ? campfireSite : venueForActivity(mAct, slot, day, "midday");
    var mPoly = isTent ? null : buildRoutePoly(slot.workPos.x,slot.workPos.z, mSite.x,mSite.z, {day:day, who:slot.id});
    slot._midday = { act:mAct, site:mSite, poly:mPoly };
    var mr = NEED_RELIEF[mAct.id];
    if(mr){
      if(mr.food) slot.needs.food = Math.max(0, slot.needs.food - mr.food*2.2);
      if(mr.social) slot.needs.social = Math.max(0, slot.needs.social - mr.social*1.6);
    }
  } else slot._midday = null;

  var goEveningRoll = diceRoll(slot.id, day, "evening_go");
  var eveningBias = 0.28 + (slot.traits.social==="gregarious"?0.14:0) + (slot.traits.drink==="heavy-drinker"?0.10:0) + Math.min(0.25, slot.needs.social*0.05);
  slot._doEvening = goEveningRoll < clamp(eveningBias, 0.05, 0.85);
  if(slot._doEvening){
    var eAct = pickActivity(EVENING_POOL, slot, day, "evening");
    if(eAct){
      var eSite = isTent ? campfireSite : venueForActivity(eAct, slot, day, "evening");
      var ePoly = isTent ? null : buildRoutePoly(slot.workPos.x,slot.workPos.z, eSite.x,eSite.z, {day:day, who:slot.id});
      var isDrunkWalk = eAct.id==="drink_at_saloon" && slot.traits.drink==="heavy-drinker" && diceRoll(slot.id,day,"drunk")<0.4;
      slot._evening = { act:eAct, site:eSite, poly:ePoly, isDrunkWalk:isDrunkWalk };
      var er = NEED_RELIEF[eAct.id];
      if(er && er.social) slot.needs.social = Math.max(0, slot.needs.social - er.social*1.6);
    } else slot._evening = null;
  } else slot._evening = null;
}

/* =========================================================================
   ARRIVALS FLOW (behavior-spec.md item 5): a ship reaching its documented
   arrival day triggers a short disembark window — a boat rows from the
   anchorage to the Clay St landing, then a knot of passengers with bundles
   walks from the landing to a boarding house/hotel (most) or continues to
   the tent district (some), via the real street graph. Reuses the existing
   shipVisits/fillShipVisits arrival dates as its trigger — no new date
   data required, so real AND coverage-gap-fill arrivals both produce a
   disembarking crowd (matching whichever the provenance toggle shows).
   ========================================================================= */
var ARRIVAL_WINDOW_DAYS = 1.2, ARRIVAL_ROW_FRAC = 0.3, ARRIVAL_PASSENGERS_PER_SHIP = 4, ARRIVAL_CAP = 28;
function makeBundlePersonGeo(coatColor, hatColor){
  var parts = [makeOutpostPersonGeo(coatColor, hatColor, false)];
  var bundle = makeBoxLocal(0.3,0.3,0.3, new THREE.Color(0x8a7050));
  bake(bundle, new THREE.Vector3(0.24,0.55,0));
  parts.push(bundle);
  return mergeGeoms(parts);
}
var arrivalBoatMesh = new THREE.InstancedMesh(makeRowboatGeo ? makeRowboatGeo() : new THREE.BoxGeometry(1.5,0.5,3), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), 6);
arrivalBoatMesh.count = 0; scene.add(arrivalBoatMesh);
var arrivalPassengerMesh = new THREE.InstancedMesh(makeBundlePersonGeo(new THREE.Color(0x3a3226), new THREE.Color(0x241f1a)), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), ARRIVAL_CAP);
arrivalPassengerMesh.count = 0; scene.add(arrivalPassengerMesh);
var _arrivalCache = {};
function arrivalDestination(rng){
  if(rng()<0.7){ var b = pickShopSite("BOARDING"); if(b) return { x:b.x, z:b.z }; }
  var camp = STREET_GRAPH.idx["camp_happyvalley"]!=null ? STREET_GRAPH.nodes[STREET_GRAPH.idx["camp_happyvalley"]] : null;
  return camp ? { x:camp.x, z:camp.z } : { x:PLAZA_CENTER.x, z:PLAZA_CENTER.z };
}
function updateArrivals(){
  var boatN=0, passN=0;
  var visits = provenanceOnly ? shipVisits : shipVisits.concat(fillShipVisits);
  for(var vi=0; vi<visits.length; vi++){
    var v = visits[vi];
    if(v.arrive==null || !v._anchorPos) continue;
    var age = simDay - v.arrive;
    if(age<0 || age>ARRIVAL_WINDOW_DAYS) continue;
    var key = v.ship+"_"+v.arrive;
    var cache = _arrivalCache[key];
    if(!cache){
      var dest = arrivalDestination(rngBuild);
      cache = _arrivalCache[key] = { poly: buildRoutePoly(WORKSITE_WHARF.x, WORKSITE_WHARF.z, dest.x, dest.z, {day:v.arrive, who:100000+Math.floor(v.arrive)}) };
    }
    var rowT = clamp(age/(ARRIVAL_WINDOW_DAYS*ARRIVAL_ROW_FRAC), 0, 1);
    if(rowT<1 && boatN<arrivalBoatMesh.instanceMatrix.count){
      var bx = lerp(v._anchorPos.x, WORKSITE_WHARF.x, rowT), bz = lerp(v._anchorPos.z, WORKSITE_WHARF.z, rowT);
      var byaw = Math.atan2(WORKSITE_WHARF.x-v._anchorPos.x, WORKSITE_WHARF.z-v._anchorPos.z);
      setShipInstance(arrivalBoatMesh, boatN++, bx, 0.15, bz, byaw, 1);
    }
    var walkT = clamp((age-(ARRIVAL_WINDOW_DAYS*ARRIVAL_ROW_FRAC))/(ARRIVAL_WINDOW_DAYS*(1-ARRIVAL_ROW_FRAC)), 0, 1);
    for(var pi=0; pi<ARRIVAL_PASSENGERS_PER_SHIP && passN<arrivalPassengerMesh.instanceMatrix.count; pi++){
      var pt = rowT<1 ? { x:lerp(v._anchorPos.x,WORKSITE_WHARF.x,rowT), z:lerp(v._anchorPos.z,WORKSITE_WHARF.z,rowT) } : pointOnPolyline(cache.poly, walkT*cache.poly.total);
      var jx = (pi-1.5)*0.55, jz = (pi-1.5)*0.3;
      var px = pt.x+jx, pz = pt.z+jz;
      setShipInstance(arrivalPassengerMesh, passN++, px, terrainHeight(px,pz), pz, 0.4, 1);
    }
  }
  arrivalBoatMesh.count = boatN; arrivalBoatMesh.instanceMatrix.needsUpdate = true;
  arrivalPassengerMesh.count = passN; arrivalPassengerMesh.instanceMatrix.needsUpdate = true;
}
/* @P1850-CHUNK 50 — people slots, native presence, figure prefab, variety, biography, schedule, documented moments */
/* ---- 3. slot generation — built once at load so a given slot index is
   stable across the whole session. ROUTINE slots (spec §9's persistent
   population, ~60-120-strong) get a real HOME + WORK + daily schedule;
   EXTRA slots are ambient density-fill with no fixed abode, wandering the
   same street graph without a routine — "population honesty" (ask #5). ---- */
var ALL_ORIGIN_KEYS = ORIGINS.map(function(o){ return o.key; });
var ROUTINE_CAP = IS_TOUCH ? 60 : 100;
var PEOPLE_CAP = IS_TOUCH ? 110 : 180;
/* Wardrobe palettes (coat, hat) — TECHNIQUES §1.1: ~20 combos crossed from
   occupation/era cohorts. Era gating rides the population itself: 1849-rush
   arrival cohorts (origin.earliestDay >= ERA_1849_DAY) draw from the
   flannel table (red shirts are period-documented; miners' red/blue
   flannel + drab canvas), merchants/professionals wear black broadcloth,
   Californios dark jackets (sash noted in research; palette-only here —
   no new geometry), sailors short dark jackets. Weights fill:true —
   design judgment from the ledger's cited pattern, not a sourced census.
   (Defined HERE, above ALL_PEOPLE_SLOTS, because slot generation below
   consumes these tables at load time.) */
var WARDROBE = {
  miner49: [ [0x8a2f23,0x2a241f],[0x2f4468,0x241f1a],[0x8a2f23,0x3a3226],[0x9c8a5e,0x2a2420],[0x2f4468,0x4a3c2c],[0x6e5a3f,0x241f1a] ],
  merchant:[ [0x1d1b19,0x141210],[0x2c2a28,0x1e1c1a],[0x3b3630,0x201d19] ],
  californio:[ [0x33261c,0x1c150f],[0x24303a,0x18120d] ],
  sailor:  [ [0x263043,0x1a1f2c],[0x323c48,0x22262e] ],
  everyday:[ [0x2c2a28,0x1e1c1a],[0x3a3226,0x2a2420],[0x36402e,0x262c1e],[0x4a4034,0x2a2420],[0x5a4632,0x241f1a] ],
  female:  [ [0x3a332c,0xcabf98],[0x4a3b33,0xd8cfae],[0x2f3a33,0xc4b691] ]
};
var _MERCHANT_CATS = { commerce:1, professional:1, civic:1, press:1, clergy:1, vice_economy:1 };
function pickWardrobe(occ, origin, isMale, rng){
  var table;
  if(!isMale) table = WARDROBE.female;
  else if(origin && origin.key==="californio" && origin.earliestDay<ERA_1849_DAY) table = WARDROBE.californio;
  else if(occ && _MERCHANT_CATS[occ.category]) table = WARDROBE.merchant;
  else if(occ && occ.category==="maritime") table = WARDROBE.sailor;
  else if(origin && origin.earliestDay>=ERA_1849_DAY) table = rng()<0.75 ? WARDROBE.miner49 : WARDROBE.everyday;
  else table = WARDROBE.everyday;
  var pick = table[Math.floor(rng()*table.length)];
  return { coat:new THREE.Color(pick[0]), hat:new THREE.Color(pick[1]) };
}
/* Skin-tone palette — TECHNIQUES §1.2, approved exactly as written (CANON
   rider 3): a DISCRETE 6-swatch array, tonal variation only, identical
   mesh. Per-origin weights below are fill:true — shaped from
   demographics-society.md's documented origin mix (Californio, Anglo,
   Hawaiian "Kanaka", African American, Chilean, French, Chinese from
   1848), but the exact tone distributions within each cohort are design
   assumptions, not sourced statistics. No caricature geometry, ever. */
var SKIN_TONES = [
  new THREE.Color(0xe8c39e), new THREE.Color(0xd9b088), new THREE.Color(0xc79a72),
  new THREE.Color(0xb5825f), new THREE.Color(0x8d6144), new THREE.Color(0x5f4130)
];
var SKIN_WEIGHTS_BY_ORIGIN = { /* fill:true (see comment above) */
  american:  [0.30,0.38,0.24,0.06,0.015,0.005],
  californio:[0.04,0.18,0.34,0.32,0.10,0.02],
  black:     [0.00,0.02,0.08,0.20,0.42,0.28],
  hawaiian:  [0.00,0.06,0.24,0.44,0.22,0.04],
  indigenous:[0.00,0.05,0.26,0.42,0.23,0.04],
  french:    [0.34,0.40,0.20,0.05,0.008,0.002],
  chilean:   [0.03,0.16,0.36,0.32,0.11,0.02],
  australian:[0.30,0.40,0.22,0.06,0.015,0.005],
  chinese:   [0.10,0.38,0.38,0.12,0.02,0.00]
};
function pickSkinTone(originKey, rng){
  var w = SKIN_WEIGHTS_BY_ORIGIN[originKey] || SKIN_WEIGHTS_BY_ORIGIN.american;
  var total=0, i; for(i=0;i<w.length;i++) total+=w[i];
  var r = rng()*total;
  for(i=0;i<w.length;i++){ r-=w[i]; if(r<=0) return SKIN_TONES[i]; }
  return SKIN_TONES[2];
}
// pool indices — 0..2 are silhouettes (slot.sil routes there while
// walking/standing); 3..5 are the pose-library pools (§6).
var POOL_M=0, POOL_F=1, POOL_CHILD=2, POOL_SEATED=3, POOL_STOOPED=4, POOL_CARRY=5;
/* ---- s50 NATIVE PRESENCE helpers (native-presence-1846-49.md) ----
   Occupations: only the DOCUMENTED role set for the Mission community —
   mission/adobe labor (§4, clm:pen:22), household/laundry work (§4,
   demographics-society.md §3, Washerwoman's Lagoon), and rancho/herding
   labor (the 1852 census household-attachment pattern, clm:demo:141 —
   an inference-from-pattern for 1846-49, per §4). NEVER the generic town
   catalog draw (§6 DON'T: no incidental town trades without a documented
   basis). Weights fill:true within that documented set. */
var INDIGENOUS_OCC_IDS = ["common_laborer","common_laborer","vaquero_herder","washerwoman_laundress","domestic_servant"];
function pickIndigenousOccupation(rng){
  return CATALOG_OCC_BY_ID[INDIGENOUS_OCC_IDS[Math.floor(rng()*INDIGENOUS_OCC_IDS.length)]] || null;
}
/* Era curve (ORIGINS comment above): a fraction of indigenous slots thin
   out across 1849 toward the 1852 SF+SM census tail of 140 across BOTH
   counties (clm:demo:141) — the town share dilutes from the documented
   7.4% (1847) toward the near-invisibility the record itself describes
   ("numerically invisible against the town's explosive growth",
   demographics-society.md §5). The rancheria-anchored families and Pedro
   Evencio persist (clm:native:2: ~5 families still at the Mission, 1850). */
var INDIG_FADE_START = eventDateToSimDay("1849-02-01"), INDIG_FADE_END = eventDateToSimDay("1849-11-15");
function indigenousNotAfterDay(rng){
  return rng()<0.60 ? Math.round(lerp(INDIG_FADE_START, INDIG_FADE_END, rng())) : null;
}
var RANCHERIA_HOME_LABEL = "Mission Dolores (the old rancheria)";
/* Agendas for invented indigenous bios: drawn from the DOCUMENTED role set
   only (fill:true phrasing of §4's mission labor / laundry / rancho
   pattern), instead of the town AGENDAS pool ("passage money for the
   mines" etc., which would claim an undocumented town life). */
var INDIGENOUS_AGENDAS = [
  "working the Mission's fields and adobes",
  "washing for the town at the freshwater lagoon",
  "hired out to a rancho household for the season",
  "keeping the Mission herd with the vaqueros"
];
// gender-split spouse pools for the rancheria household fill (the mixed
// NAME_BANKS pool was naming husbands as wives) — same register style.
var INDIGENOUS_SPOUSE_F = ["Juana","Gertrudis","Dolores","Marcela","Faustina"];
var INDIGENOUS_SPOUSE_M = ["Ignacio","Gregorio","Bruno","Tiburcio"];
var ALL_PEOPLE_SLOTS = (function(){
  var slots = [], id = 0, missionAssigned = 0, MISSION_TARGET = 5;
  var ranchAssigned = 0, RANCH_TARGET = 3; // GAPS-2026-07-10 item A: keep a small herder presence at the pastures
  var rancheriaAssigned = 0, RANCHERIA_TARGET = 4; // + Pedro Evencio below ≈ the ~5 families of clm:native:2

  for(var ri=0; ri<ROUTINE_CAP; ri++){
    var originKey = pickWeighted(ALL_ORIGIN_KEYS, ORIGINS_BY_KEY);
    var origin = ORIGINS_BY_KEY[originKey];
    // behavior-spec.md §0: real names from the roster first, best-attested
    // first (the builder's own sort order) — invented people only once the
    // roster is exhausted. s50: indigenous slots never draw a roster name —
    // the roster is newsprint town figures, and the corpus documents NO
    // named Native individual inside the town core in this window
    // (native-presence-1846-49.md §3); their names come from the
    // mission-register bank instead, and the one documented individual
    // (Pedro Evencio) gets his own dedicated slot below.
    var rosterPerson = origin.key==="indigenous" ? null : nextRosterPerson();
    var era = eraColumnForDay(origin.earliestDay);
    var occ = (rosterPerson && rosterPerson.occ) ? CATALOG_OCC_BY_ID[rosterPerson.occ] : pickCatalogOccupation(era, origin.key, rngBuild);
    if(origin.key==="indigenous") occ = pickIndigenousOccupation(rngBuild); // documented role set only (helper comment above)
    // vaquero is the standard Californio cattle-herding role of the pre-rush
    // economy (catalog vaquero_herder: documented, demographics-society.md §2)
    // — same guaranteed-minimum pattern as MISSION_TARGET below; never
    // overrides a roster person's documented role (roster principle, §0).
    if(!(rosterPerson && rosterPerson.occ) && origin.key==="californio" && ranchAssigned<RANCH_TARGET && CATALOG_OCC_BY_ID["vaquero_herder"]){
      occ = CATALOG_OCC_BY_ID["vaquero_herder"]; ranchAssigned++; // occupation unknown in the record -> distribution fill is legitimate (§0)
    }
    var isMale = isMaleForOccupation(occ, genderMaleFrac(origin.earliestDay), rngBuild);
    if(rosterPerson && rosterPerson.gender==="f") isMale = false;
    // TECHNIQUES §1: silhouette + wardrobe palette + discrete skin tone +
    // ±6% height jitter, all dealt once at slot build (rngBuild, seeded).
    var sil = isMale ? POOL_M : POOL_F;
    var wardrobe = pickWardrobe(occ, origin, isMale, rngBuild);
    var skinC = pickSkinTone(origin.key, rngBuild);
    var traits = rollTraits(rngBuild);

    // s50: ALL story-level (routine, named-bio) Native presence anchors to
    // Mission Dolores — home at the documented rancheria dwellings, work at
    // the Mission grounds / grazing pastures (research §6 DO: "anchor any
    // individually-named or story-level Native presence to Mission
    // Dolores, not the Yerba Buena village core"). Town-street presence at
    // the census share is carried by the anonymous extras below.
    var isRancheriaSlot = origin.key==="indigenous";
    var home, work;
    if(isRancheriaSlot){
      var dws = (window.RANCHERIA_SITE && RANCHERIA_SITE.dwellings) || [{x:OUTPOSTS.mission.x-85, z:OUTPOSTS.mission.z-98}];
      var dw = dws[rancheriaAssigned % dws.length];
      home = { spot:{x:dw.x, z:dw.z, w:3, d:2.6, label:RANCHERIA_HOME_LABEL}, revealDay:0, type:"rancheria" };
      work = (occ && occ.id==="vaquero_herder") ? WORKSITE_RANCH_MISSION : WORKSITE_MISSION;
      rancheriaAssigned++;
    } else {
      home = nextHome();
      work = worksiteForOccupation(occ, rngBuild);
      if(origin.key==="californio" && missionAssigned<MISSION_TARGET && rngBuild()<0.5){ work = WORKSITE_MISSION; missionAssigned++; }
    }

    var homePos = { x: home.spot.x + (rngBuild()-0.5)*(home.type==="tent"?2.2:(home.spot.w||3)*0.7),
                    z: home.spot.z + (rngBuild()-0.5)*(home.type==="tent"?2.2:(home.spot.d||3)*0.7) };
    var workPos = { x:work.x, z:work.z };

    var slotDay0 = Math.max(origin.earliestDay, home.revealDay||0); // s59: initial legs routed for the arrival-day bucket (rebuilt per bucket by resolveDailySchedule)
    var commutePoly = buildRoutePoly(homePos.x,homePos.z, workPos.x,workPos.z, {day:slotDay0, who:id});
    var errandPoly  = buildRoutePoly(workPos.x,workPos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:slotDay0, who:id});
    var sundayPoly  = buildRoutePoly(homePos.x,homePos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:slotDay0, who:id});
    // behavior-spec.md §1: a pious minority attends the town chapel once it
    // exists (from CHURCH_REVEAL_DAY) rather than the Plaza's Sunday crowd.
    var sundayGoesToChurch = !isRancheriaSlot && traits.faith==="pious" && rngBuild()<0.55; // s50: Mission residents live beside the Mission church itself — never routed to the town chapel
    var churchPoly = (sundayGoesToChurch && CHURCH_SPOT) ? buildRoutePoly(homePos.x,homePos.z, CHURCH_SPOT.x, CHURCH_SPOT.z, {day:slotDay0, who:id}) : null;

    // PL-B item 1: the midday-break/evening-out free choices are now
    // resolved PER CALENDAR DAY by the dice engine (resolveDailySchedule,
    // above) reading data/catalog-activities.json — nothing to decide once
    // at build time beyond the needs state they read.
    var needs = { food:0, social:0 };

    // PL-B item 3 (families): a synthetic, era-honest household-fill layer
    // (behavior-spec.md §1's "household... where demographics permit") —
    // no source documents any specific person's spouse/children, so this is
    // fill:true flavor text on the bio card, never a second simulated body.
    // Boarding-house dwellers stay bachelors (the era's own housing form);
    // only cottage-dwellers roll for a family, at an era-honest rate: much
    // higher 1846-48 (demographics-society.md's more-mixed early gender
    // ratio) than the bachelor-dominated 1849 rush.
    var family = null;
    if(!home.boarding && home.type!=="tent"){
      var familyChance = era==="1846-1848" ? 0.42 : 0.07;
      if(rngBuild() < familyChance){
        var fBank = NAME_BANKS[origin.key] || NAME_BANKS.american;
        // s50: gender-appropriate spouse pool for indigenous households
        // (the mixed single-name bank was naming husbands as wives)
        var spouseFirst = origin.key==="indigenous"
          ? (isMale ? INDIGENOUS_SPOUSE_F : INDIGENOUS_SPOUSE_M)[Math.floor(rngBuild()*(isMale?INDIGENOUS_SPOUSE_F:INDIGENOUS_SPOUSE_M).length)]
          : fBank.first[Math.floor(rngBuild()*fBank.first.length)];
        var nChildRoll = rngBuild();
        var nChildren = nChildRoll<0.45?0 : nChildRoll<0.75?1 : nChildRoll<0.93?2 : 3;
        family = { spouseFirst:spouseFirst, children:nChildren };
      }
    }

    // PL-A leftover (origins drive name banks + subtle appearance tint):
    // a gentle per-origin multiply on the merged coat+skin+hat geometry's
    // vertex colors via InstancedMesh.setColorAt — deliberately kept close
    // to (1,1,1) so it reads as a hint of skin-tone/complexion diversity
    // across documented origin groups, not a costume marker. fill:true
    // aesthetic judgment, not a sourced statistic.
    var originTint = ORIGIN_TINT[origin.key] || ORIGIN_TINT.american;

    var rosterFirstDay = (rosterPerson && rosterPerson.first) ? eventDateToSimDay(rosterPerson.first) : null;
    var rosterLastDay  = (rosterPerson && rosterPerson.last)  ? eventDateToSimDay(rosterPerson.last)  : null;

    slots.push({
      id:id++, kind:"routine", origin:origin, gender:isMale?"male":"female", variant:sil,
      sil:sil, coatC:wardrobe.coat, hatC:wardrobe.hat, skinC:skinC, _scale:0.94+rngBuild()*0.12,
      occ:occ, roster:rosterPerson, traits:traits, needs:needs, family:family, originTint:originTint,
      sundayGoesToChurch:sundayGoesToChurch, churchPoly:churchPoly,
      lateralJitter:(rngBuild()-0.5)*2.2, clusterOffset:{ x:(rngBuild()-0.5)*3.6, z:(rngBuild()-0.5)*3.6 },
      isLanternCandidate: rngBuild()<0.32,
      home:home, homePos:homePos, homeLabel:homeLabelFor(home),
      work:work, workPos:workPos, workLabel:work.label, workActivity:work.activity,
      commutePoly:commutePoly, errandPoly:errandPoly, sundayPoly:sundayPoly,
      _midday:null, _doEvening:false, _evening:null, _scheduleDay:-1,
      /* s56 P0 (empty 1846 town): the roster-name first-mention floor is
         GONE from arrival, the exact mirror of the notAfterDay fix below.
         Not one of the 600 roster entries is first-mentioned before
         1846-08-15 (the Californian's own first issue) — so flooring every
         named slot to its name's newsprint debut guaranteed the founding
         village (documented pop ~200) had ZERO street life for the sim's
         first six weeks and a starved trickle until 1847. Same ruling as
         the expiry fix: the roster name is cosmetic flavor for the
         inspector card; the LIFE persists — and it arrives — independent
         of when a newspaper first printed the name. Cohort arrival
         (origin.earliestDay) and the home's reveal still gate honestly. */
      notBeforeDay: Math.max(origin.earliestDay, home.revealDay||0),
      /* BUGFIX completion (2026-07-10, §6 pose-library verification): the
         close-range legibility pass's own comment (see the extras loop
         below) diagnosed that BOTH populations hard-expired at their
         roster figure's last-documented-mention (~Jan 1849 at the
         latest), but only extras were fixed. Routine slots kept
         notAfterDay:rosterLastDay — so the ENTIRE routine cast (the only
         people with workplaces, schedules, and therefore work/evening
         poses) vanished before the gold rush: Sept 1849 had zero
         at-work/seated/stooped figures, only ambient wanderers. Same
         rationale as the extras fix: the roster name is cosmetic flavor
         for the inspector card, not the simulated person's sole identity
         — the LIFE persists; only the name's documented presence window
         belongs to the record. notBeforeDay (arrival floor) untouched.
         s50 exception (deliberate, era-honest — NOT the old roster bug):
         indigenous slots beyond the ~5 anchored rancheria families thin
         out across 1849 per the documented dilution curve
         (indigenousNotAfterDay above; clm:demo:141 tail anchor). */
      notAfterDay: (isRancheriaSlot && rancheriaAssigned>RANCHERIA_TARGET) ? indigenousNotAfterDay(rngBuild) : null,
      bio:null, _x:homePos.x, _z:homePos.z, _distSq:1e18, _now:"", _pose:"idle"
    });
  }

  var EXTRA_POOL_SIZE = IS_TOUCH ? 90 : 200;
  for(var ei=0; ei<EXTRA_POOL_SIZE; ei++){
    var originKey2 = pickWeighted(ALL_ORIGIN_KEYS, ORIGINS_BY_KEY);
    var origin2 = ORIGINS_BY_KEY[originKey2];
    var rosterPerson2 = origin2.key==="indigenous" ? null : nextRosterPerson(); // real names keep filling density-fill slots after the routine cast (§0: "invented people only beyond the roster"); s50: never a newsprint name on an indigenous slot (see the routine loop's comment)
    var isMale2 = rngBuild() < genderMaleFrac(origin2.earliestDay);
    if(rosterPerson2 && rosterPerson2.gender==="f") isMale2 = false;
    // TECHNIQUES §1.3 child silhouette: a small, era-honest fraction of the
    // ambient extras are children — weighted toward the more-family-mixed
    // 1846-48 cohorts, near-absent in the bachelor-dominated 1849 rush
    // (demographics-society.md gender/household mix; exact rates fill:true).
    var isChild = rngBuild() < (origin2.earliestDay < ERA_1849_DAY ? 0.06 : 0.015);
    var sil2 = isChild ? POOL_CHILD : (isMale2 ? POOL_M : POOL_F);
    var wardrobe2 = pickWardrobe(null, origin2, isMale2, rngBuild);
    var skinC2 = pickSkinTone(origin2.key, rngBuild);
    // behavior-spec.md item 5: a handful of extras are dedicated Mission
    // Road foot traffic — the "travelers both directions daily" ask —
    // instead of the generic in-town street-graph wander, so the road to
    // the Mission always reads as used, not just when a Californio
    // routine-slot's workplace happens to be assigned there.
    var isMissionTraveler = ei<6 && typeof MISSION_ROAD_PTS!=="undefined" && MISSION_ROAD_PTS.length>1;
    var wanderPoly = isMissionTraveler ? buildPolyline(MISSION_ROAD_PTS, false) : buildWanderPoly(rngBuild, origin2.earliestDay);
    var rosterFirstDay2 = (rosterPerson2 && rosterPerson2.first) ? eventDateToSimDay(rosterPerson2.first) : null;
    var traits2 = rollTraits(rngBuild);
    // PL-B item 4 (grit): 1849 street-sleepers — trait+arrival-weighted, per
    // the brief. Only extras whose ORIGIN cohort's earliest presence is
    // already in the 1849 rush are eligible at all (the documented
    // young-single-men-broke-on-arrival profile); idle/restless poles raise
    // the odds further (fill:true shape — no census of WHO slept rough,
    // only that large numbers did, economy-daily-life.md §1.5).
    var roughEligible = origin2.earliestDay >= ERA_1849_DAY && !isChild;
    var roughChance = roughEligible ? (0.05 + (traits2.work==="idler"?0.10:0) + (traits2.temperament==="restless"?0.08:0)) : 0;
    var sleepsRough = rngBuild() < roughChance;
    slots.push({
      id:id++, kind:"extra", origin:origin2, gender:isMale2?"male":"female", variant:sil2,
      sil:sil2, isChild:isChild, coatC:wardrobe2.coat, hatC:wardrobe2.hat, skinC:skinC2, _scale:0.94+rngBuild()*0.12,
      occ:null, roster:rosterPerson2, traits:traits2, originTint: ORIGIN_TINT[origin2.key]||ORIGIN_TINT.american,
      speed:0.8+rngBuild()*0.7, phaseOffset: rngBuild()*wanderPoly.total*2, lateralJitter:(rngBuild()-0.5)*2.0,
      isLanternCandidate: rngBuild()<0.32, sleepsRough:sleepsRough, _sleepYaw:rngBuild()*Math.PI*2,
      wanderPoly:wanderPoly, homePos:{x:wanderPoly.segs[0].a.x, z:wanderPoly.segs[0].a.z},
      homeLabel: isMissionTraveler ? "on the Mission road" : ("about "+nearestStreetPair(wanderPoly.segs[0].a.x, wanderPoly.segs[0].a.z)+" Streets"),
      work:null, workPos:null, workLabel:null,
      // s50: an indigenous extra's TOWN presence is census-dated (the 34
      // counted mid-1847, clm:demo:4), not documented back to day 0 — so
      // their register onset staggers across the census's own run-up,
      // instead of claiming continuous town-core presence from July 1846
      // (which only the Mission community has, per the record).
      notBeforeDay: origin2.key==="indigenous"
        ? Math.round(rngBuild()*eventDateToSimDay("1847-06-01"))
        // s56 P0: roster first-mention floor dropped from extras too (see
        // the routine loop's comment) — cohort arrival gates alone.
        : origin2.earliestDay,
      // BUGFIX (close-range legibility pass, 2026-07-10): extras are
      // anonymous ambient density-fill (see comment at their loop's top) —
      // a roster name is cosmetic flavor for the inspector card, not their
      // sole identity. Binding notAfterDay to that ONE real person's own
      // last-documented-mention date was wiping out the entire town: since
      // the 600-entry roster never exhausts against the 90-200 extra slots,
      // every extra got a real roster figure, and NOT ONE roster entry's
      // "last" date extends past sim day ~906 (~Jan 1849) — so every extra
      // (plus every routine slot, same mechanism) hard-expired before the
      // 1849 gold rush even started, leaving the entire back half of the
      // timeline's streets and plaza completely empty of people on every
      // platform. Extras never expire this way; notBeforeDay (arrival
      // floor) is untouched. s50 exception (deliberate, era-honest):
      // indigenous extras carry the documented dilution curve — see
      // indigenousNotAfterDay above (clm:demo:141 tail anchor).
      notAfterDay: origin2.key==="indigenous" ? indigenousNotAfterDay(rngBuild) : null,
      bio:null, _x:wanderPoly.segs[0].a.x, _z:wanderPoly.segs[0].a.z, _distSq:1e18, _now:"about the streets", _pose:"walk"
    });
  }

  /* ---- s50 GUARANTEED RANCHERIA HOUSEHOLDS — the random origin draw
     alone can't promise the documented remnant community exists on every
     seed, so the rancheria is topped up to RANCHERIA_TARGET resident
     household heads (+ Pedro Evencio below ≈ the ~5 families the NPS/
     Milliken record puts at Mission Dolores, clm:native:2). Same
     guaranteed-minimum pattern as MISSION_TARGET/RANCH_TARGET above.
     These persist through sim end (the record keeps them there past
     1849); names are mission-register bank draws (invented, shown as
     PERSON — UNRECORDED), occupations from the documented role set. ---- */
  while(rancheriaAssigned < RANCHERIA_TARGET){
    var rOrigin = ORIGINS_BY_KEY.indigenous;
    var rOcc = pickIndigenousOccupation(rngBuild);
    var rDws = (window.RANCHERIA_SITE && RANCHERIA_SITE.dwellings) || [{x:OUTPOSTS.mission.x-85, z:OUTPOSTS.mission.z-98}];
    var rDw = rDws[rancheriaAssigned % rDws.length];
    var rMale = isMaleForOccupation(rOcc, 0.6, rngBuild);
    var rWardrobe = pickWardrobe(rOcc, rOrigin, rMale, rngBuild);
    var rTraits = rollTraits(rngBuild);
    var rHomePos = { x:rDw.x+(rngBuild()-0.5)*2.0, z:rDw.z+(rngBuild()-0.5)*2.0 };
    var rWork = (rOcc && rOcc.id==="vaquero_herder") ? WORKSITE_RANCH_MISSION : WORKSITE_MISSION;
    var rWorkPos = { x:rWork.x, z:rWork.z };
    // household-fill flavor (same fill:true layer as the town family roll):
    // these ARE the record's "families" — each guaranteed head carries one.
    var rSpousePool = rMale ? INDIGENOUS_SPOUSE_F : INDIGENOUS_SPOUSE_M;
    var rFamily = { spouseFirst:rSpousePool[Math.floor(rngBuild()*rSpousePool.length)], children:1+Math.floor(rngBuild()*2) };
    var rId = id; // s59: the literal's id++ evaluates before the route-poly properties — capture the slot's own id for {who:}
    slots.push({
      id:id++, kind:"routine", origin:rOrigin, gender:rMale?"male":"female", variant:rMale?POOL_M:POOL_F,
      sil:rMale?POOL_M:POOL_F, coatC:rWardrobe.coat, hatC:rWardrobe.hat, skinC:pickSkinTone("indigenous",rngBuild), _scale:0.94+rngBuild()*0.12,
      occ:rOcc, roster:null, traits:rTraits, needs:{food:0,social:0}, family:rFamily, originTint:ORIGIN_TINT.indigenous,
      sundayGoesToChurch:false, churchPoly:null,
      lateralJitter:(rngBuild()-0.5)*2.2, clusterOffset:{ x:(rngBuild()-0.5)*3.6, z:(rngBuild()-0.5)*3.6 },
      isLanternCandidate: rngBuild()<0.32,
      home:{ spot:{x:rDw.x, z:rDw.z, w:3, d:2.6, label:RANCHERIA_HOME_LABEL}, revealDay:0, type:"rancheria" },
      homePos:rHomePos, homeLabel:RANCHERIA_HOME_LABEL,
      work:rWork, workPos:rWorkPos, workLabel:rWork.label, workActivity:rWork.activity,
      commutePoly:buildRoutePoly(rHomePos.x,rHomePos.z, rWorkPos.x,rWorkPos.z, {day:0, who:rId}),
      errandPoly:buildRoutePoly(rWorkPos.x,rWorkPos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:0, who:rId}),
      sundayPoly:buildRoutePoly(rHomePos.x,rHomePos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:0, who:rId}),
      _midday:null, _doEvening:false, _evening:null, _scheduleDay:-1,
      notBeforeDay:0, notAfterDay:null,
      bio:null, _x:rHomePos.x, _z:rHomePos.z, _distSq:1e18, _now:"", _pose:"idle"
    });
    rancheriaAssigned++;
  }

  /* ---- s50 PEDRO EVENCIO — the ONE individually documented Native
     resident of the window (clm:demo:142, demographics-society.md §5,
     native-presence-1846-49.md §1): married a Patwin woman from the Sonoma
     mission system at Mission Dolores in December 1846; identified as late
     as 1893 as "the last (Ramaytush) Native American of San Mateo." A
     dedicated, always-present routine slot spanning the WHOLE sim window
     (notBeforeDay 0, notAfterDay null — his documented life spans 1846
     through 1893), homed at the rancheria, inspectable like any person;
     his card carries the documented facts + source verbatim (docFacts/
     docSource, rendered in openPersonInspectorForSlot). His day-to-day
     occupation is NOT documented — common laborer at the Mission grounds
     is distribution fill, legitimate per behavior-spec.md §0 ("occupation
     unknown in the record -> distribution fill"), and his card never
     claims it as record. ---- */
  (function(){
    var origin = ORIGINS_BY_KEY.indigenous;
    var occ = CATALOG_OCC_BY_ID["common_laborer"] || null;
    var dws = (window.RANCHERIA_SITE && RANCHERIA_SITE.dwellings) || [{x:OUTPOSTS.mission.x-85, z:OUTPOSTS.mission.z-98}];
    var dw = dws[dws.length-1];
    var homePos = { x:dw.x+1.2, z:dw.z+1.0 };
    var work = WORKSITE_MISSION;
    var workPos = { x:work.x, z:work.z };
    var wardrobe = pickWardrobe(occ, origin, true, rngBuild); // same period working clothes as any laborer — no costume marker
    var pId = id; // s59: same id-capture as the rancheria loop above
    slots.push({
      id:id++, kind:"routine", origin:origin, gender:"male", variant:POOL_M,
      sil:POOL_M, coatC:wardrobe.coat, hatC:wardrobe.hat, skinC:pickSkinTone("indigenous",rngBuild), _scale:1.0,
      occ:occ,
      roster:{ name:"Pedro Evencio", role:null, occ:null, gender:null, first:null, last:null, mentions:null, src:"clm:demo:142" },
      docFacts:'Married a Patwin woman from the Sonoma mission system at Mission Dolores in December 1846. Identified as late as 1893 as "the last (Ramaytush) Native American of San Mateo."',
      docSource:"demographics-society.md §5 (claim clm:demo:142); native-presence-1846-49.md §1",
      traits:rollTraits(rngBuild), needs:{food:0,social:0}, family:null, originTint:ORIGIN_TINT.indigenous,
      sundayGoesToChurch:false, churchPoly:null,
      lateralJitter:(rngBuild()-0.5)*2.2, clusterOffset:{ x:(rngBuild()-0.5)*3.6, z:(rngBuild()-0.5)*3.6 },
      isLanternCandidate:false,
      home:{ spot:{x:dw.x, z:dw.z, w:3, d:2.6, label:RANCHERIA_HOME_LABEL}, revealDay:0, type:"rancheria" },
      homePos:homePos, homeLabel:RANCHERIA_HOME_LABEL,
      work:work, workPos:workPos, workLabel:work.label, workActivity:work.activity,
      commutePoly:buildRoutePoly(homePos.x,homePos.z, workPos.x,workPos.z, {day:0, who:pId}),
      errandPoly:buildRoutePoly(workPos.x,workPos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:0, who:pId}),
      sundayPoly:buildRoutePoly(homePos.x,homePos.z, PLAZA_CENTER.x,PLAZA_CENTER.z, {day:0, who:pId}),
      _midday:null, _doEvening:false, _evening:null, _scheduleDay:-1,
      notBeforeDay:0, notAfterDay:null,
      bio:null, _x:homePos.x, _z:homePos.z, _distSq:1e18, _now:"", _pose:"idle"
    });
  })();
  return slots;
})();

/* ---- 4. figure prefab — s33 PEOPLE OVERHAUL (TECHNIQUES CANON rider 5,
   the "RuneScape minimum" bar): the coat-cone era is over. Every figure
   is an articulated low-poly body — head / torso / two arms / two legs
   (~190-230 tris per variant) — built from the shared masked-part
   builders below. This legacy entry point now returns the SAME
   articulated standing body with colors BAKED into the vertex color
   attribute (only the two DOCUMENTED-MOMENT figures use it; they render
   as plain static Meshes on an unpatched material, so the aPart/aLimb
   attributes it carries are simply ignored). ---- */
var SKIN_TONE = new THREE.Color(0xc79a72);
function makePersonGeo(coatColor, hatColor, isFemale){
  var geo = makeStandingMaskedGeo(isFemale);
  var ap = geo.attributes.aPart.array, col = geo.attributes.color.array;
  var trouser = coatColor.clone().multiplyScalar(0.55);
  for(var i=0;i<ap.length;i++){
    var c = ap[i]===PART_SKIN ? SKIN_TONE
          : ap[i]===PART_HAT ? hatColor
          : ap[i]===PART_TROUSER ? trouser
          : ap[i]===PART_FIXED ? null : coatColor;
    if(c){ col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; }
  }
  return geo;
}

/* =========================================================================
   TECHNIQUES §1 (CHARACTER VARIETY) + §6 (POSE LIBRARY), polish tranche 1,
   2026-07-10. Palette-swap instancing per the ledger: color is applied
   PER-INSTANCE (three instanced vec3 attributes: coat, skin, hat) against
   silhouette geometries whose tintable parts are baked WHITE and tagged
   with an aPart vertex attribute (0=coat, 1=skin/head, 2=hat, 3=fixed
   baked color e.g. the carried crate, 4=trousers — coat tint darkened
   0.55 in-shader, s33). So ~20 wardrobe palettes x 6
   discrete skin tones ride on just SIX InstancedMesh pools:
     0 standing/walking male · 1 standing/walking female · 2 child
     3 seated · 4 stooped-working · 5 carrying
   (streetSleeperMesh remains the 7th, pre-existing pose-pool entry.)
   The child silhouette is the classic read: 0.6 height, proportionally
   BIGGER head. Pose geos route through the same pool-swap updatePeople()
   already does for sleepers. NOTHING here is skeletal/VAT (ratified
   rejection, TECHNIQUES rider 4). ---- */
var PART_COAT=0, PART_SKIN=1, PART_HAT=2, PART_FIXED=3, PART_TROUSER=4; // TROUSER (s33): coat tint darkened 0.55 in-shader — palette-driven leg variety, zero new attributes
/* s33 LIMB IDS — the second per-vertex channel (aLimb = vec2(limbId,
   pivotY)): the vertex shader counter-swings ids 2-5 about the baked
   pivot height, id 6 (skirt) sways side-to-side instead, ids 0/1 never
   move. Pose geos bake their part rotations statically and tag limbs 0,
   so poses need no shader work (rider 5: "poses are static part
   rotations"). PivotY rides the attribute so the child variant's shorter
   limbs pivot at ITS shoulder/hip heights, not the adult's. */
var LIMB_STATIC=0, LIMB_HEAD=1, LIMB_ARM_L=2, LIMB_ARM_R=3, LIMB_LEG_L=4, LIMB_LEG_R=5, LIMB_SKIRT=6;
var _PART_WHITE = new THREE.Color(0xffffff);
function mergeGeomsParts(parts){ // parts: [{g:geometry, p:partId, l:limbId, v:pivotY}] — colors pre-baked (white for tintable parts)
  var merged = mergeGeoms(parts.map(function(p){ return p.g; }));
  var n = merged.attributes.position.count;
  var arr = new Float32Array(n), limb = new Float32Array(n*2);
  var off=0;
  parts.forEach(function(p){
    var c = p.g.attributes.position.count;
    for(var i=0;i<c;i++){ arr[off+i]=p.p; limb[(off+i)*2]=p.l||0; limb[(off+i)*2+1]=p.v||0; }
    off+=c;
  });
  merged.setAttribute("aPart", new THREE.BufferAttribute(arr,1));
  merged.setAttribute("aLimb", new THREE.BufferAttribute(limb,2));
  return merged;
}
function wp(geo){ return colorizeUniform(geo, _PART_WHITE); } // white tintable part
function _limbCyl(rTop,rBot,len,seg){ return new THREE.CylinderGeometry(rTop,rBot,len,seg).toNonIndexed(); }
/* ADULT STANDING/WALKING BODY. Male: trouser legs (0-0.78) + knee-length
   coat torso (0.58-1.20, flared hem hides the hip joint) + sleeve arms
   hanging from the shoulders + head + crown/brim hat. Female: full
   tapered skirt cone (0-0.82, NO leg geometry — the skirt itself is the
   swinging "limb", tagged LIMB_SKIRT so it sways instead) + bodice +
   arms + head + bonnet. ~220 / ~190 tris. */
function makeStandingMaskedGeo(isFemale){
  var parts = [], side;
  if(isFemale){
    var skirt = wp(_limbCyl(0.14,0.32,0.82,7)); skirt.translate(0,0.41,0);
    var bodice = wp(_limbCyl(0.16,0.20,0.46,6)); bodice.translate(0,1.00,0);
    parts.push({g:skirt,p:PART_COAT,l:LIMB_SKIRT,v:0.82},{g:bodice,p:PART_COAT});
  } else {
    for(side=-1;side<=1;side+=2){
      var leg = wp(_limbCyl(0.055,0.065,0.78,5)); leg.translate(side*0.085,0.39,0);
      parts.push({g:leg,p:PART_TROUSER,l:side<0?LIMB_LEG_L:LIMB_LEG_R,v:0.78});
    }
    var coat = wp(_limbCyl(0.17,0.235,0.62,6)); coat.translate(0,0.89,0);
    parts.push({g:coat,p:PART_COAT});
  }
  for(side=-1;side<=1;side+=2){
    var arm = wp(_limbCyl(0.045,0.05,0.55,5)); arm.translate(side*0.215,0.825,0);
    parts.push({g:arm,p:PART_COAT,l:side<0?LIMB_ARM_L:LIMB_ARM_R,v:1.10});
  }
  var head = wp(new THREE.SphereGeometry(0.14,7,5).toNonIndexed()); head.translate(0,1.31,0);
  parts.push({g:head,p:PART_SKIN,l:LIMB_HEAD});
  if(isFemale){
    var bonnet = wp(new THREE.SphereGeometry(0.175,7,5,0,Math.PI*2,0,Math.PI*0.62).toNonIndexed());
    bonnet.translate(0,1.36,0);
    parts.push({g:bonnet,p:PART_HAT,l:LIMB_HEAD});
  } else {
    var crown = wp(_limbCyl(0.12,0.12,0.14,7)); crown.translate(0,1.46,0);
    var brim = wp(_limbCyl(0.23,0.23,0.03,8)); brim.translate(0,1.40,0);
    parts.push({g:crown,p:PART_HAT,l:LIMB_HEAD},{g:brim,p:PART_HAT,l:LIMB_HEAD});
  }
  return mergeGeomsParts(parts);
}
function makeChildMaskedGeo(){ // ~0.6 adult height, proportionally bigger head (the classic child silhouette); full limb set, own pivot heights
  var parts=[];
  for(var side=-1;side<=1;side+=2){
    var leg = wp(_limbCyl(0.038,0.045,0.42,5)); leg.translate(side*0.055,0.21,0);
    var arm = wp(_limbCyl(0.03,0.034,0.34,5)); arm.translate(side*0.145,0.53,0);
    parts.push({g:leg,p:PART_TROUSER,l:side<0?LIMB_LEG_L:LIMB_LEG_R,v:0.42},
               {g:arm,p:PART_COAT,l:side<0?LIMB_ARM_L:LIMB_ARM_R,v:0.70});
  }
  var coat = wp(_limbCyl(0.115,0.15,0.38,6)); coat.translate(0,0.55,0);
  var head = wp(new THREE.SphereGeometry(0.115,7,5).toNonIndexed()); head.translate(0,0.85,0);
  var cap = wp(_limbCyl(0.13,0.13,0.03,8)); cap.translate(0,0.955,0);
  parts.push({g:coat,p:PART_COAT},{g:head,p:PART_SKIN,l:LIMB_HEAD},{g:cap,p:PART_HAT,l:LIMB_HEAD});
  return mergeGeomsParts(parts);
}
function makeSeatedMaskedGeo(){ // wharf edges / benches / saloons: thighs horizontal, calves hanging, hands on lap — all rotations baked (limbs static)
  var parts=[];
  for(var side=-1;side<=1;side+=2){
    var thigh = wp(_limbCyl(0.06,0.06,0.40,5)); thigh.rotateX(Math.PI/2); thigh.translate(side*0.08,0.42,0.20);
    var calf = wp(_limbCyl(0.05,0.058,0.44,5)); calf.translate(side*0.08,0.22,0.40);
    var arm = wp(_limbCyl(0.042,0.048,0.42,5)); arm.translate(0,-0.21,0); arm.rotateX(-0.55); arm.translate(side*0.20,1.02,0.02);
    parts.push({g:thigh,p:PART_TROUSER},{g:calf,p:PART_TROUSER},{g:arm,p:PART_COAT});
  }
  var torso = wp(_limbCyl(0.17,0.22,0.60,6)); torso.translate(0,0.30,0); torso.rotateX(0.10); torso.translate(0,0.42,0);
  var head = wp(new THREE.SphereGeometry(0.14,7,5).toNonIndexed()); head.translate(0,1.13,0.06);
  var crown = wp(_limbCyl(0.12,0.12,0.13,7)); crown.translate(0,1.27,0.06);
  var brim = wp(_limbCyl(0.22,0.22,0.03,8)); brim.translate(0,1.215,0.06);
  parts.push({g:torso,p:PART_COAT},{g:head,p:PART_SKIN},{g:crown,p:PART_HAT},{g:brim,p:PART_HAT});
  return mergeGeomsParts(parts);
}
function makeStoopedMaskedGeo(){ // digging/washing/loading: torso bent ~60° at the hip, arms reaching down toward the work, legs planted
  var parts=[];
  for(var side=-1;side<=1;side+=2){
    var leg = wp(_limbCyl(0.055,0.065,0.74,5)); leg.translate(side*0.085,0.37,0);
    var arm = wp(_limbCyl(0.042,0.048,0.50,5)); arm.translate(0,-0.25,0); arm.rotateX(-0.25); arm.translate(side*0.16,1.00,0.42);
    parts.push({g:leg,p:PART_TROUSER},{g:arm,p:PART_COAT});
  }
  var torso = wp(_limbCyl(0.16,0.22,0.62,6)); torso.translate(0,0.31,0); torso.rotateX(1.05); torso.translate(0,0.74,0);
  var head = wp(new THREE.SphereGeometry(0.14,7,5).toNonIndexed()); head.translate(0,1.10,0.62);
  var brim = wp(_limbCyl(0.22,0.22,0.03,8)); brim.translate(0,1.20,0.64);
  parts.push({g:torso,p:PART_COAT},{g:head,p:PART_SKIN},{g:brim,p:PART_HAT});
  return mergeGeomsParts(parts);
}
function makeCarryMaskedGeo(){ // both arms raised forward holding a crate at the chest; legs keep LIVE limb ids so a walking carrier still strides
  var parts=[];
  for(var side=-1;side<=1;side+=2){
    var leg = wp(_limbCyl(0.055,0.065,0.78,5)); leg.translate(side*0.085,0.39,0);
    var arm = wp(_limbCyl(0.045,0.05,0.52,5)); arm.translate(0,-0.26,0); arm.rotateX(-1.30); arm.translate(side*0.19,1.10,0);
    parts.push({g:leg,p:PART_TROUSER,l:side<0?LIMB_LEG_L:LIMB_LEG_R,v:0.78},{g:arm,p:PART_COAT});
  }
  var coat = wp(_limbCyl(0.17,0.235,0.62,6)); coat.translate(0,0.89,0);
  var head = wp(new THREE.SphereGeometry(0.14,7,5).toNonIndexed()); head.translate(0,1.31,0);
  var crown = wp(_limbCyl(0.12,0.12,0.14,7)); crown.translate(0,1.46,0);
  var crate = colorizeUniform(new THREE.BoxGeometry(0.36,0.30,0.34).toNonIndexed(), new THREE.Color(0x8a6f47));
  crate.translate(0,1.06,0.42);
  parts.push({g:coat,p:PART_COAT},{g:head,p:PART_SKIN},{g:crown,p:PART_HAT},{g:crate,p:PART_FIXED});
  return mergeGeomsParts(parts);
}
var PERSON_POOL_GEOS = [
  makeStandingMaskedGeo(false), makeStandingMaskedGeo(true), makeChildMaskedGeo(),
  makeSeatedMaskedGeo(), makeStoopedMaskedGeo(), makeCarryMaskedGeo()
];
// pose -> pose-pool routing (assigned from catalog-activities/worksites:
// construction & leveling -> stooped; wharf "carry" -> carrying; saloons/
// evening venues & shore fishing -> seated; everything else stands/walks
// in its silhouette pool).
function poolIndexFor(slot){
  var p = slot._pose;
  if(p==="carry") return POOL_CARRY;
  if(p==="construction") return POOL_STOOPED;
  if(p==="evening" || p==="fish") return POOL_SEATED;
  return slot.sil || 0;
}
/* PL-B item 4 (wet-season mud on the lower body), retained through the §1
   rework: r128 predates InstancedMesh.setColorAt (r131), so per-instance
   color rides hand-authored InstancedBufferAttributes (coat/skin/hat,
   written per-frame in updatePeople) + an onBeforeCompile patch that (a)
   selects the per-part tint by aPart and (b) muddies hems by uMud — the
   SAME weatherState.wet signal terrain/streets already tint on. */
var personMudUniform = { value: 0 };
/* s44 NIGHT READABILITY — people get a subtle warm rim/edge tint at night so
   figures separate from the ground (shader, riding the existing per-part
   attribute plumbing). uPersonRim = nightFactor (0 by day). uFollow =
   (worldX, worldZ, strength): the followed person carries a slightly
   stronger rim day AND night so they're always clearly readable. */
var personRimUniform = { value: 0 };
var personFollowUniform = { value: new THREE.Vector3(0, 0, 0) };
function patchPersonMaterial(mesh){
  mesh.material.onBeforeCompile = function(shader){
    shader.uniforms.uMud = personMudUniform;
    shader.uniforms.uPersonRim = personRimUniform;
    shader.uniforms.uFollow = personFollowUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 instanceTint;\nattribute vec3 instanceSkin;\nattribute vec3 instanceHat;\nattribute float aPart;\nattribute vec2 aLimb;\nattribute vec2 instanceGait;\nvarying vec3 vInstanceTint;\nvarying vec3 vInstanceSkin;\nvarying vec3 vInstanceHat;\nvarying float vPart;\nvarying float vLocalY;\nvarying vec3 vWPos;")
      /* s33 WALK CYCLE (TECHNIQUES rider 5, the labeled-parts crowd
         trick): counter-swing limbs by part id about their baked pivot
         height. instanceGait = (phase, amplitude) per instance — phase
         accumulates with DISTANCE WALKED (the apparent-velocity
         _gaitPhase, so stride always matches ground covered, no
         lockstep), amplitude scales with apparent speed and is exactly
         0 when standing (no idle flailing). armL+legR share phase,
         armR+legL the opposite half-cycle. The skirt (id 6) sways about
         Z at half stride frequency instead of leg-swinging. */
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nfloat limbAng = 0.0, limbSway = 0.0;\nif(aLimb.x > 1.5 && instanceGait.y > 0.001){\n  float lp = instanceGait.x;\n  if(aLimb.x < 2.5) limbAng = sin(lp + 3.14159265) * instanceGait.y * 0.72;\n  else if(aLimb.x < 3.5) limbAng = sin(lp) * instanceGait.y * 0.72;\n  else if(aLimb.x < 4.5) limbAng = sin(lp) * instanceGait.y;\n  else if(aLimb.x < 5.5) limbAng = sin(lp + 3.14159265) * instanceGait.y;\n  else limbSway = sin(lp * 0.5) * instanceGait.y * 0.30;\n}\nfloat limbC = cos(limbAng), limbS = sin(limbAng);\nfloat swayC = cos(limbSway), swayS = sin(limbSway);\nif(limbAng != 0.0) objectNormal = vec3(objectNormal.x, objectNormal.y*limbC - objectNormal.z*limbS, objectNormal.y*limbS + objectNormal.z*limbC);\nif(limbSway != 0.0) objectNormal = vec3(objectNormal.x*swayC - objectNormal.y*swayS, objectNormal.x*swayS + objectNormal.y*swayC, objectNormal.z);")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvInstanceTint = instanceTint;\nvInstanceSkin = instanceSkin;\nvInstanceHat = instanceHat;\nvPart = aPart;\nvLocalY = position.y;\nif(limbAng != 0.0){\n  float ly = transformed.y - aLimb.y;\n  transformed.y = aLimb.y + ly*limbC - transformed.z*limbS;\n  transformed.z = ly*limbS + transformed.z*limbC;\n}\nif(limbSway != 0.0){\n  float lx = transformed.x, ly2 = transformed.y - aLimb.y;\n  transformed.x = lx*swayC - ly2*swayS;\n  transformed.y = aLimb.y + lx*swayS + ly2*swayC;\n}\nvWPos = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uMud;\nuniform float uPersonRim;\nuniform vec3 uFollow;\nvarying vec3 vInstanceTint;\nvarying vec3 vInstanceSkin;\nvarying vec3 vInstanceHat;\nvarying float vPart;\nvarying float vLocalY;\nvarying vec3 vWPos;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n{ vec3 partTint = vPart<0.5 ? vInstanceTint : (vPart<1.5 ? vInstanceSkin : (vPart<2.5 ? vInstanceHat : (vPart<3.5 ? vec3(1.0) : vInstanceTint*0.55)));\ndiffuseColor.rgb *= partTint;\nfloat band = 1.0 - smoothstep(0.0, 0.55, vLocalY); float m = band*uMud; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30,0.24,0.16), m*0.55); }")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n{\n  float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.0);\n  float followK = uFollow.z * (1.0 - smoothstep(1.5, 2.6, distance(vWPos.xz, uFollow.xy)));\n  // rim (grazing edges) + a small flat warm lift: the camera's maps-like\n  // pitch sees mostly tops of hats/shoulders where a pure fresnel rim\n  // vanishes, so the flat term is what keeps figures countable at night.\n  totalEmissiveRadiance += vec3(1.0, 0.56, 0.28) * (uPersonRim*(rimF*0.35 + 0.15) + followK*(rimF*0.45 + 0.20));\n}");
  };
  mesh.material.needsUpdate = true;
}
function makeInstColorAttr(geo, name){
  var arr = new Float32Array(PEOPLE_CAP*3);
  for(var i=0;i<arr.length;i++) arr[i]=1;
  var attr = new THREE.InstancedBufferAttribute(arr, 3);
  if(attr.setUsage) attr.setUsage(THREE.DynamicDrawUsage); else attr.dynamic = true;
  geo.setAttribute(name, attr);
  return attr;
}
function makeInstGaitAttr(geo){ // s33: (phase, swing amplitude) per instance — zero-filled, so pose pools whose limbs are all static cost nothing
  var attr = new THREE.InstancedBufferAttribute(new Float32Array(PEOPLE_CAP*2), 2);
  if(attr.setUsage) attr.setUsage(THREE.DynamicDrawUsage); else attr.dynamic = true;
  geo.setAttribute("instanceGait", attr);
  return attr;
}
var personMeshes = PERSON_POOL_GEOS.map(function(geo){
  var mesh = new THREE.InstancedMesh(geo, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), PEOPLE_CAP);
  mesh._coatAttr = makeInstColorAttr(geo, "instanceTint");
  mesh._skinAttr = makeInstColorAttr(geo, "instanceSkin");
  mesh._hatAttr  = makeInstColorAttr(geo, "instanceHat");
  mesh._gaitAttr = makeInstGaitAttr(geo);
  patchPersonMaterial(mesh);
  mesh.count = 0; scene.add(mesh); return mesh;
});
var personMeshSlots = personMeshes.map(function(){ return []; }); // instanceId -> slot, rebuilt every frame in updatePeople()
var LANTERN_CAP = Math.max(1, Math.round(PEOPLE_CAP*0.3));
var lanternGlowMesh = new THREE.InstancedMesh(
  colorizeUniform(new THREE.BoxGeometry(0.09,0.13,0.09).toNonIndexed(), new THREE.Color(0xffd27a)),
  new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, opacity:0}), LANTERN_CAP);
lanternGlowMesh.count = 0; scene.add(lanternGlowMesh);
/* s44 NIGHT READABILITY: each carried lantern also throws a small warm pool
   on the ground (soft radial sprite, additive) — widens the read of lantern
   light without touching the period-dim building glow. One draw call. */
var LANTERN_POOL_TEX = (function(){
  var c = document.createElement("canvas"); c.width = c.height = 64;
  var g = c.getContext("2d");
  var grad = g.createRadialGradient(32,32,2,32,32,31);
  grad.addColorStop(0,"rgba(255,196,120,0.85)");
  grad.addColorStop(0.45,"rgba(255,172,92,0.30)");
  grad.addColorStop(1,"rgba(255,160,80,0)");
  g.fillStyle = grad; g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
})();
var lanternPoolMesh = (function(){
  var geo = new THREE.PlaneGeometry(3.4,3.4); geo.rotateX(-Math.PI/2);
  var mat = new THREE.MeshBasicMaterial({ map:LANTERN_POOL_TEX, transparent:true, opacity:0,
    depthWrite:false, blending:THREE.AdditiveBlending, fog:false });
  var mesh = new THREE.InstancedMesh(geo, mat, LANTERN_CAP);
  mesh.count = 0; mesh.renderOrder = 1; scene.add(mesh);
  return mesh;
})();

// grounding contact shadow for every active walking/standing figure (see the
// "GROUNDING CONTACT SHADOWS" block above, which builds the static building
// version + the shared CONTACT_SHADOW_TEX); capacity matches PEOPLE_CAP since
// at most that many person-instances are ever active in a frame.
// P0-3 fix (2026-07-10, screening #2): the person body itself (a true-scale
// ~1.5m coat cone) is not the problem — close-range testing (25m altitude)
// shows it renders with plenty of color contrast (dark coat vs pale sand).
// The screening's 100-150m framings are the "maps-like" near-top-down
// camera pitch (elevationForT(), 45-55° at this altitude band), where a
// 0.4m-wide, 1.5m-tall figure genuinely projects to ~1-2px — a true findability
// failure per QA-GATE rule 3, which prescribes a semantic-zoom affordance
// for anything this small rather than inflating the asset's own geometry
// (grounding.md's scale rule). The contact shadow already IS that
// affordance (same pattern as buildingShadowMesh) but was itself only
// ~0.5m x 0.3m — also sub-pixel at altitude, so it wasn't helping. Enlarged
// here (not the person mesh) so each walker registers as a legible dark
// mark from above, the same trick top-down city-builders (SimCity/Cities:
// Skylines "pop dot + shadow") use for crowd legibility at zoomed-out scale.
var personShadowMesh = (function(){
  var geo = new THREE.PlaneGeometry(1,1); geo.rotateX(-Math.PI/2);
  var mat = new THREE.MeshBasicMaterial({ map:CONTACT_SHADOW_TEX, transparent:true, depthWrite:false, opacity:0.88 });
  var mesh = new THREE.InstancedMesh(geo, mat, PEOPLE_CAP);
  mesh.count = 0; mesh.renderOrder = -1; scene.add(mesh);
  return mesh;
})();
var _personShadowM4 = new THREE.Matrix4(), _personShadowQ = new THREE.Quaternion();

// PL-B item 4 (grit) reworked s33: street-sleepers on the limbed-body
// grammar — a side-lying figure (blanket-toned torso + hip roll + knees
// drawn up at an angle) + bare head, same ~1.5 x 0.55 footprint as the old
// huddle box so every existing sleeper spot still fits. Static pose, baked
// colors, own tiny instanced mesh as before.
function makeStreetSleeperGeo(){
  var blanket = new THREE.Color(0x4a4034), blanket2 = new THREE.Color(0x413830);
  var torso = colorizeUniform(_limbCyl(0.22,0.25,0.68,6), blanket);
  torso.rotateZ(Math.PI/2); torso.translate(0.26,0.23,0);
  var hips = colorizeUniform(_limbCyl(0.18,0.22,0.32,6), blanket2);
  hips.rotateZ(Math.PI/2); hips.translate(-0.24,0.20,0);
  var legs = colorizeUniform(_limbCyl(0.12,0.16,0.55,6), blanket2); // knees drawn up — bent off the body axis
  legs.rotateZ(Math.PI/2); legs.rotateY(-0.7); legs.translate(-0.58,0.14,0.14);
  var head = new THREE.SphereGeometry(0.15,7,5).toNonIndexed();
  head.translate(0.72,0.20,0);
  colorizeUniform(head, SKIN_TONE);
  return mergeGeoms([torso, hips, legs, head]);
}
var STREET_SLEEPER_CAP = 20;
var streetSleeperMesh = new THREE.InstancedMesh(makeStreetSleeperGeo(),
  new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), STREET_SLEEPER_CAP);
streetSleeperMesh.count = 0; scene.add(streetSleeperMesh);

/* ---- 5. lazy deterministic biography — crystallizes on first observation,
   seeded from (URL seed, LIFE VARIANT, slot id) so it's identical on every
   revisit AND on every ordinary date jump within a telling (jumps never
   change lifeVariant — see TIME-JUMP SEMANTICS in grounding.md). Only the
   seed chip's reshuffle glyph bumps lifeVariant and clears the cached bios
   below, which is the one deliberate "new telling" affordance. ---- */
function personRng(slotId){
  var h = cyrb128("p1850-person-"+seedStr+"."+lifeVariant+"-"+slotId);
  return sfc32(h[0],h[1],h[2],h[3]);
}
function reshuffleLifeStream(){
  lifeVariant++;
  ALL_PEOPLE_SLOTS.forEach(function(s){ s.bio = null; });
  updateHashSeed();
  if(followedSlot) generateBio(followedSlot); // refresh an open inspector in place
}
// GAPS-2026-07-09 item 2 (economy layer): where the extraction has a
// documented period wage for a slot's catalog trade, a bio card may mention
// it — quietly, as a fact about the person, not a system callout.
// GAPS-2026-07-09 item 2 (economy layer): documented period wages, keyed by
// catalog occupation id now that occupations are catalog-driven rather than
// the legacy ad-hoc TRADES strings.
var TRADE_WAGE_ITEM = {
  carpenter: /^mechanical labor wages$/i, mason_bricklayer: /^mechanical labor wages$/i, blacksmith: /^mechanical labor wages$/i,
  wharf_laborer_stevedore: /^labor wage$/i, common_laborer: /^labor wage$/i, porter: /^labor wage$/i,
  clerk: /^clerk hire$/i,
  cook: /^domestic labor$/i, domestic_servant: /^domestic labor$/i
};
// PL-B item 3 (families): renders the fill:true household layer set at
// slot-build time (see ALL_PEOPLE_SLOTS) as one quiet clause on the bio
// card — never a second simulated body, never on-screen commentary.
function familyLineFor(slot){
  if(!slot.family) return "";
  var possessive = slot.gender==="male" ? "his" : "her";
  var spouseWord = slot.gender==="male" ? "wife" : "husband";
  var kids = slot.family.children;
  var kidsPhrase = kids===0 ? "" : (kids===1 ? ", and their young child" : (", and their "+kids+" children"));
  return " Keeps house with "+possessive+" "+spouseWord+", "+slot.family.spouseFirst+kidsPhrase+".";
}
function generateBio(slot){
  if(slot.bio) return slot.bio;
  var rng = personRng(slot.id);
  // behavior-spec.md §0: a roster person's name + printed role are FIXED
  // (real, from data/people.jsonl) — everything else about them (origin,
  // traits, schedule) was already dealt from the catalog at slot-build
  // time; only invented people get an on-the-spot name/agenda draw here.
  if(slot.roster){
    var rp = slot.roster;
    var rpOcc = rp.occ ? CATALOG_OCC_BY_ID[rp.occ] : slot.occ;
    var wageRe2 = rpOcc ? TRADE_WAGE_ITEM[rpOcc.id] : null;
    var wageRec2 = wageRe2 ? findPriceByItem(wageRe2) : null;
    slot.bio = {
      name: rp.name,
      origin: slot.origin ? slot.origin.label : "unrecorded",
      // s50: the Indigenous population did not "arrive" — they are the
      // original population (native-presence-1846-49.md §1).
      // s56: capped at the CURRENT sim day — with the roster arrival floor
      // gone (see notBeforeDay), a named person can be on the street before
      // the name's first newsprint mention; the card must never claim they
      // "arrived" in a year later than the one you're watching them in.
      arrivedYear: (slot.origin && slot.origin.key==="indigenous") ? "native-born" : dateFromSimDay(Math.min(rp.first ? eventDateToSimDay(rp.first) : Math.max(slot.notBeforeDay,0), simDay)).getUTCFullYear(),
      trade: rpOcc ? rpOcc.label : (rp.role || "—"),
      role: rp.role || null, mentions: rp.mentions || null,
      agenda: null, family: familyLineFor(slot),
      wage: wageRec2 ? formatPrice(wageRec2) : null
    };
    return slot.bio;
  }
  var bank = NAME_BANKS[slot.origin.key] || NAME_BANKS.american;
  var first = bank.first[Math.floor(rng()*bank.first.length)];
  var name = bank.singleName ? first : (first+" "+bank.last[Math.floor(rng()*bank.last.length)]);
  var earliestDay = Math.max(slot.notBeforeDay,0), latestDay = Math.max(earliestDay, simDay);
  var arrivedDay = earliestDay + rng()*Math.max(1,(latestDay-earliestDay));
  // s50: indigenous bios draw trade + agenda from the DOCUMENTED role set
  // only (pickIndigenousOccupation / INDIGENOUS_AGENDAS — see their
  // comments), never the generic town catalog/agenda pools.
  var isIndig = slot.origin.key==="indigenous";
  var occ = slot.occ || (isIndig ? pickIndigenousOccupation(rng) : pickCatalogOccupation(eraColumnForDay(arrivedDay), slot.origin.key, rng));
  var wageRe = occ ? TRADE_WAGE_ITEM[occ.id] : null;
  var wageRec = wageRe ? findPriceByItem(wageRe) : null;
  slot.bio = {
    name:name, origin:slot.origin.label, arrivedYear: isIndig ? "native-born" : dateFromSimDay(arrivedDay).getUTCFullYear(),
    trade: occ ? occ.label : "laborer",
    role: null, mentions: null,
    agenda:(isIndig ? INDIGENOUS_AGENDAS[Math.floor(rng()*INDIGENOUS_AGENDAS.length)] : AGENDAS[Math.floor(rng()*AGENDAS.length)]), family: familyLineFor(slot),
    wage: wageRec ? formatPrice(wageRec) : null
  };
  return slot.bio;
}

/* ---- 6. DAILY SCHEDULE + per-frame walk/LOD selection. `h` below is the
   hour-of-day read straight off the fractional part of simDay — the sim's
   OWN calendar clock, which (fix sprint 2026-07-11) now ALSO drives the
   day/night lighting (updateTimeOfDay/updateDayNight), so schedules and
   the sun finally agree; the schedule is deliberately
   tied to the SAME clock that drives ships/growth/weather so "follow a
   person for a sim-day" reads as one coherent day: ~6am wake, walk to
   work, work, a midday errand for some, walk home ~6pm, a few out for the
   evening, sleep — reduced work + a Plaza gathering on Sundays. ---- */
var peopleClock = 0;
var POSE_BOB = {
  walk:         { freq:5.2, amp:0.045, yOff:0 },
  carry:        { freq:2.6, amp:0.07,  yOff:-0.05 },
  market:       { freq:1.1, amp:0.03,  yOff:0 },
  evening:      { freq:1.0, amp:0.025, yOff:0 },
  fish:         { freq:0.9, amp:0.03,  yOff:-0.04 },
  stationary:   { freq:1.4, amp:0.05,  yOff:0 },
  construction: { freq:1.6, amp:0.06,  yOff:-0.02 },
  idle:         { freq:0.8, amp:0.02,  yOff:0 },
  sleep:        { freq:0.3, amp:0.01,  yOff:0 }
};
/* TECHNIQUES §6.2 — matrix-compose-only gait: yaw + forward lean (about
   local X, speed-proportional) + roll sway (about local Z, ±3°) + uniform
   scale (the §1.3 ±6% height jitter / any future size class). */
var _pQ = new THREE.Quaternion(), _pQ2 = new THREE.Quaternion(), _pM4 = new THREE.Matrix4(), _pV = new THREE.Vector3(), _pS = new THREE.Vector3();
var _AXIS_X = new THREE.Vector3(1,0,0), _AXIS_Z = new THREE.Vector3(0,0,1);
function setPersonInstance(mesh, idx, x, y, z, yaw, lean, roll, scale){
  _pQ.setFromAxisAngle(_UP, yaw);
  if(lean){ _pQ2.setFromAxisAngle(_AXIS_X, lean); _pQ.multiply(_pQ2); }
  if(roll){ _pQ2.setFromAxisAngle(_AXIS_Z, roll); _pQ.multiply(_pQ2); }
  _pV.set(x,y,z); _pS.set(scale,scale,scale);
  _pM4.compose(_pV,_pQ,_pS);
  mesh.setMatrixAt(idx, _pM4);
}
function isSundayForDay(day){ return dateFromSimDay(Math.floor(day)).getUTCDay()===0; }
function sampleWithJitter(poly, t01, lateralJitter){
  var p = pointOnPolyline(poly, clamp(t01,0,1)*poly.total);
  var len = Math.hypot(p.dx,p.dz)||1;
  var jx = p.x+(-p.dz/len)*lateralJitter, jz = p.z+(p.dx/len)*lateralJitter;
  // s59 cheap slide-along: the route centerline is collision-free by
  // construction; if this person's lane offset would shave a wall/fence,
  // give up the offset for that stretch instead of clipping.
  if(lateralJitter && walkBlockedAt(jx, jz, simDay)) return { x:p.x, z:p.z, dx:p.dx, dz:p.dz };
  return { x:jx, z:jz, dx:p.dx, dz:p.dz };
}
/* ONE INTEGRATOR (fix sprint 2026-07-11, supersedes the 2026-07-09
   "two-speed" wall-clock band-aid — that stateful walkT01 accumulator is
   DELETED per grounding.md's competing-systems-die law). History of the
   defect: routine-cast walk segments were originally keyed to the sim
   clock (a whole commute in ~83ms at the old default 1day/2s), then
   patched to advance a per-slot accumulator by wall-clock dt — but the
   schedule STATE (home/commute/work anchors) still swept with the sim
   hour, so at timelapse routine figures teleported between anchors many
   times per second while wall-clock-paced ambient extras strolled
   normally in the same frame: two unsynced movers, the user-reported
   "speed of light next to casual walkers".
   Now there is ONE movement policy with two clock modes:
   - LIVE / PAUSED / any explicit date jump: positions are a PURE FUNCTION
     of simDay (behavior-spec.md §3 counter-based schedules — resampling
     is exact, rewind-safe, no per-slot motion state). Walk progress along
     a route = sim-seconds since the walk window opened × PERSON_WALK_MPS;
     at LIVE (1:1) that IS true walking pace on screen. Whoever finishes a
     route before the window closes is simply "arrived" at the destination
     state. Extras' wander distance is sim-seconds × their amble speed.
   - 2x FOLLOW (fix sprint 2026-07-11 #3): same pure function of simDay —
     the clock just runs at 2/86400 days/s, so everyone moves schedule-true
     at exactly 2x apparent (walkers ~3.2 m/s, still human-followable).
   - TIMELAPSE (day/week/month per s) and scrub-drag: schedule-true motion is not
     renderable (state flips faster than a frame), so everyone renders as
     AMBIENT FLOW — representative street traffic along their real route
     polylines at a capped legible pace (≤ ~1.7 m/s), count/density still
     read off the sim date. Dropping back to LIVE or pausing resamples
     exact schedule positions from simDay.
   Gait/bob is keyed to APPARENT velocity (measured per-frame screen
   displacement), never to a clock, so gait always matches motion in both
   modes. */
var PERSON_WALK_MPS = 1.6; // purposeful errand pace; extras amble at their own 0.8-1.5
function walkProg(h, h0, poly, mps){
  // deterministic walk progress: fraction of the route covered at the
  // person's own pace (s59 micro speed variance — slot.walkMps, hash-dealt
  // ~1.4-1.85, median ~1.6) in the sim-seconds elapsed since the window
  // opened at hour h0 — pure function of the sim clock, exact under rewind/jump.
  return clamp(((h - h0)*3600*(mps||PERSON_WALK_MPS))/Math.max(20, poly.total), 0, 1);
}
/* s44 grammar helper: work labels like "the Mission grazing grounds" already
   carry their article — avoid "the the" in NOW lines. */
function theLabel(lbl){ return /^the /i.test(lbl||"") ? lbl : "the "+lbl; }
function computeRoutinePosition(slot, day){
  resolveDailySchedule(slot, day); // PL-B item 1: today's dice-picked midday/evening activity, cached per calendar day
  var h = (day-Math.floor(day))*24;
  var sunday = isSundayForDay(day);
  var pose="idle", label="at home", x=slot.homePos.x, z=slot.homePos.z, dx=0, dz=1, pp, wt;

  // behavior-spec.md item 3: once the chapel exists, a pious minority
  // attends its Sunday service there instead of the Plaza's secular
  // gathering (CHURCH_SPOT/CHURCH_REVEAL_DAY, built above).
  var goingToChurch = sunday && slot.sundayGoesToChurch && slot.churchPoly && day>=CHURCH_REVEAL_DAY;
  var sundayDestPoly = goingToChurch ? slot.churchPoly : slot.sundayPoly;
  var sundayDestLabel = goingToChurch ? "the chapel" : "the Plaza";
  var sundayAtLabel = goingToChurch ? "at the chapel, Sunday service" : "at the Plaza, Sunday gathering";
  var sundayDestX = goingToChurch ? CHURCH_SPOT.x : PLAZA_CENTER.x;
  var sundayDestZ = goingToChurch ? CHURCH_SPOT.z : PLAZA_CENTER.z;

  if(sunday){
    if(h<7 || h>=21){ label="asleep at home"; }
    else if(h<8){ label="waking, a Sunday"; }
    else if(h<8.5){
      wt = walkProg(h, 8, sundayDestPoly, slot.walkMps);
      if(wt>=1){ x=sundayDestX; z=sundayDestZ; pose="market"; label=sundayAtLabel; }
      else { pp=sampleWithJitter(sundayDestPoly,wt,slot.lateralJitter); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk"; label="walking to "+sundayDestLabel; }
    }
    else if(h<12.5){ x=sundayDestX; z=sundayDestZ; pose="market"; label=sundayAtLabel; }
    else if(h<13){
      wt = walkProg(h, 12.5, sundayDestPoly, slot.walkMps);
      if(wt>=1){ label="at home, the Sabbath"; }
      else { pp=sampleWithJitter(sundayDestPoly,1-wt,slot.lateralJitter); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk"; label="walking home"; }
    }
    else { label="at home, the Sabbath"; }
  } else {
    if(h<5.5 || h>=21){ label="asleep at home"; }
    else if(h<6.5){ label="waking for the day"; }
    else if(h<7.5){
      wt = walkProg(h, 6.5, slot.commutePoly, slot.walkMps);
      if(wt>=1){ x=slot.workPos.x; z=slot.workPos.z; pose=slot.workActivity; label="at work — "+theLabel(slot.workLabel); }
      else { pp=sampleWithJitter(slot.commutePoly,wt,slot.lateralJitter); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk"; label="walking to "+theLabel(slot.workLabel); }
    }
    else if(h<12){ x=slot.workPos.x; z=slot.workPos.z; pose=slot.workActivity; label="at work — "+theLabel(slot.workLabel); }
    else if(slot._midday && h<13.4){
      // PL-B item 1/2 (dice engine + needs visible): today's midday choice
      // was sampled from data/catalog-activities.json against this
      // person's traits/needs/era (resolveDailySchedule) — eat_meal is by
      // far the most common pick (food need rises daily until satisfied),
      // but auctions, the newspaper office, letter-writing (spiking on
      // steamer days), fishing, and gossip all compete for the slot.
      var m = slot._midday, mPose = ACT_POSE[m.act.id] || "stationary";
      if(m.poly){
        if(h<12.4){
          wt = walkProg(h, 12, m.poly, slot.walkMps);
          if(wt>=1){ x=m.site.x; z=m.site.z; pose=mPose; label=m.act.label+(m.site.label?(" — "+m.site.label):""); }
          else { pp=sampleWithJitter(m.poly,wt,slot.lateralJitter); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk"; label="walking to "+(m.site.label||m.act.label.toLowerCase()); }
        }
        else if(h<13.0){ x=m.site.x; z=m.site.z; pose=mPose; label=m.act.label+(m.site.label?(" — "+m.site.label):""); }
        else {
          wt = walkProg(h, 13.0, m.poly, slot.walkMps);
          if(wt>=1){ x=slot.workPos.x; z=slot.workPos.z; pose=slot.workActivity; label="at work — "+theLabel(slot.workLabel); }
          else { pp=sampleWithJitter(m.poly,1-wt,slot.lateralJitter); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk"; label="walking back to "+theLabel(slot.workLabel); }
        }
      } else { x=m.site.x; z=m.site.z; pose=mPose; label=m.act.label+" at the campfire"; }
    }
    else if(h<18){ x=slot.workPos.x; z=slot.workPos.z; pose=slot.workActivity; label="at work — "+theLabel(slot.workLabel); }
    else if(h<19){
      wt = walkProg(h, 18, slot.commutePoly, slot.walkMps);
      if(wt>=1){ label="at home"; }
      else { pp=sampleWithJitter(slot.commutePoly,1-wt,slot.lateralJitter); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk"; label="walking home"; }
    }
    else if(slot._doEvening && slot._evening){
      var e = slot._evening, ePose = ACT_POSE[e.act.id] || "evening";
      if(e.poly){
        if(h<19.3){
          wt = walkProg(h, 19, e.poly, slot.walkMps);
          if(wt>=1){ x=e.site.x; z=e.site.z; pose=ePose; label=e.act.label+(e.site.label?(" — "+e.site.label):"")+", of an evening"; }
          else { pp=sampleWithJitter(e.poly,wt,slot.lateralJitter); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk"; label="walking to "+(e.site.label||e.act.label.toLowerCase()); }
        }
        else if(h<20.7){ x=e.site.x; z=e.site.z; pose=ePose; label=e.act.label+(e.site.label?(" — "+e.site.label):"")+", of an evening"; }
        else {
          // "occasional drunk stumbling home" (trait-weighted, re-rolled
          // daily by resolveDailySchedule): an extra oscillating
          // perpendicular weave on top of the normal lateral jitter, only
          // when today's dice picked drink_at_saloon for a heavy-drinker.
          var weaveJit = e.isDrunkWalk ? slot.lateralJitter + Math.sin(peopleClock*3.1+slot.id*1.7)*1.6 : slot.lateralJitter;
          wt = walkProg(h, 20.7, e.poly, slot.walkMps);
          if(wt>=1){ label="at home"; }
          else {
            pp=sampleWithJitter(e.poly,1-wt,weaveJit); x=pp.x;z=pp.z;dx=pp.dx;dz=pp.dz; pose="walk";
            label = e.isDrunkWalk ? "stumbling home" : "walking home";
          }
        }
      } else { x=e.site.x; z=e.site.z; pose=ePose; label=e.act.label+" at the campfire"; }
    }
    else { label="at home"; }
  }

  if(pose==="carry" && slot.work && slot.work.pairA){
    var cyc = ((peopleClock*0.11 + slot.id*0.31)%1+1)%1;
    var ct = cyc<0.5 ? cyc*2 : (1-cyc)*2;
    x = lerp(slot.work.pairA.x, slot.work.pairB.x, ct);
    z = lerp(slot.work.pairA.z, slot.work.pairB.z, ct);
    dx = slot.work.pairB.x-slot.work.pairA.x; dz = slot.work.pairB.z-slot.work.pairA.z;
  } else if(pose==="market"||pose==="evening"||pose==="stationary"||pose==="construction"||pose==="idle"){
    // s59: the cluster offset yields when the anchor is OUTDOORS and the
    // offset would land in a wall/fence. Indoor anchors (work rendered at
    // the building's own spot) keep their offsets — indoors is indoors.
    var cox = x + slot.clusterOffset.x*0.4, coz = z + slot.clusterOffset.z*0.4;
    if(!(walkBlockedAt(cox,coz,day) && !walkBlockedAt(x,z,day))){ x = cox; z = coz; }
    if(!dx && !dz){ dx = slot.clusterOffset.x||0.1; dz = slot.clusterOffset.z||1; }
  } else if(pose==="fish"){
    x += slot.lateralJitter*1.4; dx = 1; dz = 0.15; // facing the bay, roughly east
  }

  slot._x=x; slot._z=z; slot._dx=dx||0; slot._dz=dz||1; slot._pose=pose; slot._now=label;
}
function computeExtraPosition(slot, day){
  var h=(day-Math.floor(day))*24;
  // PL-B item 4 (grit): a street-sleeper extra beds down rough near the
  // Plaza/wharf through the deep-night hours instead of vanishing into the
  // "asleep, somewhere in town" label everyone else gets — rendered by
  // updatePeople() into the dedicated streetSleeperMesh (pose "sleep").
  if(slot.sleepsRough && day>=ERA_1849_DAY && (h<5.5||h>=22.5)){
    if(!slot._sleepSpot) slot._sleepSpot = nearestSleeperSpot(slot.homePos.x, slot.homePos.z);
    slot._x = slot._sleepSpot.x; slot._z = slot._sleepSpot.z;
    slot._dx = Math.cos(slot._sleepYaw); slot._dz = Math.sin(slot._sleepYaw); slot._pose = "sleep";
    slot._now = "sleeping rough near "+nearestStreetPair(slot._x,slot._z)+" Streets";
    return;
  }
  // TECHNIQUES §7: today's dice-planned conversation window (see
  // resolveClusterPlan above) — a terminal state in the wander machine.
  resolveClusterPlan(slot, day);
  var cl = slot._cluster;
  if(cl && h>=cl.h0 && h<cl.h1){
    var px = cl.cx + Math.cos(cl.ang)*cl.r, pz = cl.cz + Math.sin(cl.ang)*cl.r;
    slot._x = px; slot._z = pz;
    var fd = Math.atan2(cl.cx-px, cl.cz-pz) + cl.faceJit;
    slot._dx = Math.sin(fd); slot._dz = Math.cos(fd);
    slot._pose = cl.carry ? "carry" : "idle";
    slot._now = "talking at "+cl.anchor.label;
    return;
  }
  // ONE INTEGRATOR: wander distance is sim-seconds × amble speed — a pure
  // function of the sim clock (counter-based, resample-exact), which at
  // LIVE 1:1 IS wall-clock pacing. (The old peopleClock keying — the
  // second, unsynced time base — is gone.)
  movePolyWalker(slot, slot.wanderPoly, day*86400*slot.speed + slot.phaseOffset);
  slot._now = (h<5.5||h>=22.5) ? "asleep, somewhere in town" : "about the streets";
}
/* Shared ping-pong polyline walker — the single piece of route-following
   math every mover (LIVE extras, ambient flow) runs through. */
function movePolyWalker(slot, poly, dist){
  var period=poly.total*2, m=((dist%period)+period)%period;
  var d, forward;
  if(m<=poly.total){ d=m; forward=true; } else { d=period-m; forward=false; }
  var p = pointOnPolyline(poly,d);
  var dx = forward?p.dx:-p.dx, dz = forward?p.dz:-p.dz;
  var len = Math.hypot(dx,dz)||1;
  var jx = p.x + (-dz/len)*slot.lateralJitter, jz = p.z + (dx/len)*slot.lateralJitter;
  // s59 slide-along: lane offset yields to walls/fences (centerline is clear)
  if(slot.lateralJitter && walkBlockedAt(jx, jz, simDay)){ jx = p.x; jz = p.z; }
  slot._x = jx;
  slot._z = jz;
  slot._dx=dx; slot._dz=dz; slot._pose="walk";
}
/* AMBIENT FLOW — the timelapse mover (day/week/month tiers + scrub drag;
   2x follow renders schedule-true like LIVE and never enters here). At those
   rates schedule-true motion is unrenderable (a sim-hour < one frame), so
   every figure — routine cast and extras alike — reads as representative
   street traffic: ping-ponging its own real route polyline (commute route
   for the cast, wander route for extras) at a capped legible pace, keyed
   to wall-clock peopleClock so nothing zips or teleports while the sim
   date races. Count/density still come from the sim date via
   peopleTargetCount(). Dropping to LIVE/pause resamples exact schedule
   positions. */
function computeFlowPosition(slot){
  var poly = slot.kind==="extra" ? slot.wanderPoly : slot.commutePoly;
  var spd = slot.kind==="extra" ? slot.speed : (1.1 + (slot.id%7)*0.09); // 0.8-1.5 / 1.1-1.64 m/s, all ≤ ~1.7
  var phase = slot.phaseOffset!=null ? slot.phaseOffset : (slot.id*137.9)%(poly.total*2);
  movePolyWalker(slot, poly, peopleClock*spd + phase);
  slot._now = "about the streets";
}
function peopleTargetCount(day, alt){
  var fireCrowd = day>=FIRE.day0 && day<=FIRE.day1+3/24;
  if(alt>(fireCrowd?750:CFG.peopleMaxAltitude)) return 0;
  var pop = densityAt(day); // street-liveliness density, not documented population — P0 decoupling fix above
  var base = clamp(Math.round(pop/45), 6, PEOPLE_CAP);
  var h = (day-Math.floor(day))*24;
  var deepNight = (h<5.5 || h>=22.5) ? 0.06 : 1.0; // sim-schedule night: near-empty streets
  // AMBIENT FLOW: at timelapse the sim hour sweeps whole days per second —
  // instantaneous night-gating would strobe the crowd, so use the
  // day-averaged factor ((17h×1.0 + 7h×0.06)/24) instead.
  if(timelapseActive() || SCRUBBING) deepNight = 0.73;
  return Math.max(2, Math.round(base*deepNight));
}
/* TIMELAPSE GROUND ABSTRACTION (fix sprint 2026-07-11 #4): at day/s+ below
   ~250m, individual ambient-flow figures FADE toward an activity
   representation (dimmed translucent flow + a subtle district activity
   glow, applied in updateDistrictZones) so ground-level timelapse reads as
   intentional abstraction rather than zipping chaos. Above 250m the specks
   render at full strength — watching them + the growth IS the point of
   timelapse. Smoothed so tier changes cross-fade rather than pop. */
var groundAbstraction = 0; // 0 = normal figures, 1 = fully abstracted (ground-level timelapse)
function updatePeople(dt, camX, camZ, alt){
  peopleClock += dt;
  var absTarget = (timelapseActive()||SCRUBBING) ? (1 - smoothstep(120, 250, alt)) : 0;
  groundAbstraction += (absTarget-groundAbstraction)*(1-Math.exp(-4*dt));
  if(groundAbstraction<0.005) groundAbstraction = 0;
  var absOn = groundAbstraction>0;
  var absFade = 1 - groundAbstraction*0.72; // figures dim to ~28%, never fully vanish (flow stays legible)
  personMeshes.forEach(function(m){ m.material.transparent = absOn; m.material.opacity = absFade; });
  streetSleeperMesh.material.transparent = absOn; streetSleeperMesh.material.opacity = absFade;
  // s44: slightly stronger contact shadows by day — figure/ground separation
  // for tracking people (night keeps the softer mark; the rim does that job).
  personShadowMesh.material.opacity = (0.82 + 0.16*(1-nightFactor))*absFade;
  // PHASE 5: while the Great Fire burns, the crowd IS the documented story
  // ("a stampede of six thousand human beings") — lift the ambient-people
  // altitude gate so the exodus/spectators read from the director's fire
  // shot. Instance cap unchanged, so the perf budget holds.
  var fireCrowdActive = simDay>=FIRE.day0 && simDay<=FIRE.day1+3/24;
  var ambientOn = (alt<=(fireCrowdActive?750:CFG.peopleMaxAltitude)) && !provenanceOnly;
  if(!ambientOn){
    personMeshes.forEach(function(m){ m.count=0; });
    lanternGlowMesh.count = 0;
    lanternPoolMesh.count = 0;
    streetSleeperMesh.count = 0;
    personShadowMesh.count = 0;
    updateDocumentedMoments(alt);
    return;
  }
  var day = simDay;
  personMudUniform.value = weatherState.wet; // PL-B item 4: same wet-season signal the ground/streets already tint on
  var eligible = [];
  resetFleeBudget(); // PHASE 5: cap new flee-route computations per frame
  var flow = timelapseActive() || SCRUBBING; // ONE INTEGRATOR clock policy: exact schedules at LIVE/pause, ambient flow at timelapse
  for(var i=0;i<ALL_PEOPLE_SLOTS.length;i++){
    var s = ALL_PEOPLE_SLOTS[i];
    if(day<s.notBeforeDay) continue;
    if(s.notAfterDay!=null && day>s.notAfterDay) continue; // roster presence window closes (last documented mention)
    if(flow) computeFlowPosition(s);
    else if(s.kind==="routine") computeRoutinePosition(s, day);
    else computeExtraPosition(s, day);
    applyFireCrowd(s, day); // PHASE 5: flee the fire zone via the street graph, then spectate
    // APPARENT VELOCITY — measured screen displacement per real second;
    // the single signal gait/bob keys to, so animation always matches
    // motion. A large jump (mode switch, date jump, resample) reads as
    // >8 m/s and freezes gait for that frame instead of blurring.
    var pvx = s._px!=null ? s._x-s._px : 0, pvz = s._pz!=null ? s._z-s._pz : 0;
    var appRaw = Math.hypot(pvx,pvz)/Math.max(dt,1e-3);
    s._appSpd = appRaw>8 ? 0 : appRaw;
    s._px = s._x; s._pz = s._z;
    s._gaitPhase = (s._gaitPhase||0) + s._appSpd*dt*3.25; // ~1 stride cycle per 1.9m walked
    s._distSq = (s._x-camX)*(s._x-camX)+(s._z-camZ)*(s._z-camZ);
    eligible.push(s);
  }
  eligible.sort(function(a,b){ return a._distSq-b._distSq; });
  var targetN = peopleTargetCount(day, alt);
  var active = eligible.slice(0, targetN);
  if(followedSlot && day>=followedSlot.notBeforeDay && active.indexOf(followedSlot)===-1) active.push(followedSlot);

  var NP = personMeshes.length;
  var counts=[], slotArrays=[];
  for(var ci=0;ci<NP;ci++){ counts.push(0); slotArrays.push([]); }
  var lanternCount=0, sleeperCount=0, shadowCount=0;
  var showLanterns = nightFactor>0.5;
  active.forEach(function(s){
    var h = terrainHeight(s._x,s._z);
    var yaw = (s._dx||s._dz) ? Math.atan2(s._dx,s._dz) : 0;
    // grounding contact shadow (see personShadowMesh, built above) — every
    // rendered figure gets one, walking or asleep, so nobody floats.
    if(shadowCount<PEOPLE_CAP){
      _personShadowQ.setFromAxisAngle(_UP, yaw);
      // P0-3 fix: enlarged from (0.55,1,0.32) — see personShadowMesh comment above.
      _personShadowM4.compose(new THREE.Vector3(s._x, h+0.02, s._z), _personShadowQ, new THREE.Vector3(1.3, 1, s._pose==="sleep"?2.0:0.95));
      personShadowMesh.setMatrixAt(shadowCount, _personShadowM4);
      shadowCount++;
    }
    // PL-B item 4: sleep-pose instances render lying flat into their own
    // tiny mesh instead of the upright coat-cone person figure.
    if(s._pose==="sleep" && sleeperCount<STREET_SLEEPER_CAP){
      setShipInstance(streetSleeperMesh, sleeperCount, s._x, h+0.03, s._z, s._sleepYaw||0, 1);
      sleeperCount++;
      return;
    }
    var vi = poolIndexFor(s), idx = counts[vi];
    if(idx>=PEOPLE_CAP) return;
    counts[vi]++;
    var pb = POSE_BOB[s._pose] || POSE_BOB.walk;
    // TECHNIQUES §6.2 walk-cycle flavor, rekeyed (fix sprint 2026-07-11):
    // gait keys to APPARENT velocity via the distance-accumulated
    // _gaitPhase — a stationary "walker" (arrived early, paused sim)
    // doesn't bob, and stride rate always matches ground actually covered.
    // Non-walkers keep the faint time-based idle sway.
    var walking = s._pose==="walk";
    var spd = s._appSpd||0;
    var gaitK = clamp(spd/1.2, 0, 1);
    var bob = walking
      ? Math.sin((s._gaitPhase||0) + s.id*0.7)*pb.amp*gaitK + pb.yOff
      : Math.sin(peopleClock*pb.freq + s.id*0.7)*pb.amp + pb.yOff;
    var lean = walking ? clamp(spd*0.04, 0, 0.09) : 0;
    var roll = walking ? Math.sin((s._gaitPhase||0)*0.55 + s.id*1.31)*0.052*gaitK
                       : Math.sin(peopleClock*0.7 + s.id)*0.012;
    setPersonInstance(personMeshes[vi], idx, s._x, h+bob, s._z, yaw, lean, roll, s._scale||1);
    slotArrays[vi][idx] = s;
    var pm = personMeshes[vi];
    var cc = s.coatC || _PART_WHITE, sc = s.skinC || SKIN_TONE, hc = s.hatC || _PART_WHITE;
    var ca = pm._coatAttr.array, sa = pm._skinAttr.array, ha = pm._hatAttr.array;
    ca[idx*3]=cc.r; ca[idx*3+1]=cc.g; ca[idx*3+2]=cc.b;
    sa[idx*3]=sc.r; sa[idx*3+1]=sc.g; sa[idx*3+2]=sc.b;
    ha[idx*3]=hc.r; ha[idx*3+1]=hc.g; ha[idx*3+2]=hc.b;
    // s33 WALK CYCLE: per-instance (phase, amplitude) for the shader limb
    // swing — phase is the distance-accumulated _gaitPhase (plus the same
    // per-slot dephase the bob uses, so no lockstep), amplitude keys to
    // APPARENT velocity exactly like bob/lean: 0 standing, full swing
    // (±0.55 rad legs, ±0.72× that arms) at ≥1.2 m/s. Applies to any
    // pool whose geo carries live limb ids (walkers + carrying legs).
    var ga = pm._gaitAttr.array;
    ga[idx*2] = (s._gaitPhase||0) + s.id*0.7;
    ga[idx*2+1] = clamp((s._appSpd||0)/1.2, 0, 1)*0.55;
    if(showLanterns && s.isLanternCandidate && lanternCount<LANTERN_CAP){
      // s44: slightly larger lantern + a warm ground pool under the carrier
      setShipInstance(lanternGlowMesh, lanternCount, s._x+Math.sin(yaw+1.4)*0.26, h+0.78, s._z+Math.cos(yaw+1.4)*0.26, 0, 1.35);
      setShipInstance(lanternPoolMesh, lanternCount, s._x, h+0.06, s._z, 0, 1);
      lanternCount++;
    }
  });
  personMeshes.forEach(function(m,vi){ m.count=counts[vi]; m.instanceMatrix.needsUpdate=true;
    m._coatAttr.needsUpdate=true; m._skinAttr.needsUpdate=true; m._hatAttr.needsUpdate=true; m._gaitAttr.needsUpdate=true; });
  personMeshSlots = slotArrays;
  lanternGlowMesh.count = lanternCount;
  lanternGlowMesh.instanceMatrix.needsUpdate = true;
  lanternGlowMesh.material.opacity = nightFactor;
  lanternPoolMesh.count = lanternCount;
  lanternPoolMesh.instanceMatrix.needsUpdate = true;
  lanternPoolMesh.material.opacity = nightFactor*0.7;
  // s44 rim uniforms: warm night edge tint on figures (0 by day, stands down
  // with ground abstraction); the followed person reads stronger, always.
  personRimUniform.value = nightFactor*(1-groundAbstraction);
  if(followedSlot) personFollowUniform.value.set(followedSlot._x, followedSlot._z, 1.0);
  else personFollowUniform.value.z = 0;
  streetSleeperMesh.count = sleeperCount;
  streetSleeperMesh.instanceMatrix.needsUpdate = true;
  personShadowMesh.count = shadowCount;
  personShadowMesh.instanceMatrix.needsUpdate = true;

  // (s42) the followed person's live NOW line now refreshes in
  // updateSelectionRing() — the one inspect panel updates in place.
  updateDocumentedMoments(alt);
}

/* ---- 7. DOCUMENTED MOMENTS — Brannan's gold announcement + Leidesdorff's
   funeral, appearing only on/near their true dates (cast.md, EVENTS_1846_49).
   Spine record dates the Brannan street-announcement 1848-05-11 (not the
   popularly-repeated "May 12"); the quoted line itself is Bancroft-era
   tradition, not a verbatim contemporary transcript — flagged honestly in
   the card rather than presented as a direct quote receipt. ---- */
var DOCUMENTED_MOMENTS = [
  { key:"brannan", name:"Sam Brannan",
    x:PLAZA_CENTER.x+22, z:PLAZA_CENTER.z-12,
    startDay:eventDateToSimDay("1848-05-11"), endDay:eventDateToSimDay("1848-05-15"),
    chip:'SAM BRANNAN — "Gold! Gold from the American River!"',
    summary:"Merchant, printer, Mormon elder (arrived on the Brooklyn, July 31 1846) — publicized the gold discovery in San Francisco's streets, May 1848.",
    detail:"The traditional account (via Bancroft) has Brannan striding down Montgomery Street with a bottle of gold dust, shouting the line above. The EVENT and its approximate date are documented (spine record, 1848-05-11); the exact WORDING is Bancroft-era tradition, not a verbatim contemporary transcript — cast.md flags this explicitly.",
    receiptHeadline:"Brannan seeks carpenters for two-month contract", receiptNote:"corroborating receipt, same week — not the gold-shout quote itself" },
  { key:"leidesdorff", name:"William A. Leidesdorff",
    x:PLAZA_CENTER.x-26, z:PLAZA_CENTER.z+16,
    startDay:eventDateToSimDay("1848-05-18"), endDay:eventDateToSimDay("1848-05-21"),
    chip:"WILLIAM LEIDESDORFF — funeral procession to Mission Dolores",
    summary:"U.S. Vice-Consul, city treasurer, City Hotel proprietor — died May 18, 1848, ~age 38.",
    detail:"Flags at half-mast and minute guns marked the procession to Mission Dolores (cast.md). Cause of death reported as a seven-day fever; retrospective sources note the symptoms also fit meningitis or scarlet fever — diagnosis uncertain.",
    receiptHeadline:"Vice Consul Leidesdorff dies in San Francisco", receiptNote:null }
];
function findFeedItemByHeadline(headline){
  var keys = Object.keys(FEED_BY_DATE);
  for(var k=0;k<keys.length;k++){
    var issue = FEED_BY_DATE[keys[k]];
    for(var i=0;i<issue.items.length;i++){ if(issue.items[i].headline===headline) return issue.items[i]; }
  }
  return null;
}
var documentedMeshes = [], documentedLabels = [];
(function buildDocumentedMoments(){
  var hudEl = document.getElementById("hud");
  DOCUMENTED_MOMENTS.forEach(function(doc){
    var coat = doc.key==="brannan" ? 0x7a3020 : 0x2a2a2a;
    var geo = makePersonGeo(new THREE.Color(coat), new THREE.Color(0x1c1a18), false);
    var mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}));
    mesh.scale.set(1.2,1.2,1.2); // a marked figure — slightly larger silhouette
    mesh.visible = false;
    scene.add(mesh);
    documentedMeshes.push(mesh);

    var el = document.createElement("div");
    el.className = "wlbl wlbl-moment"; // §11: documented moments = distinct haloed beat text, no chip
    el.textContent = doc.chip;
    el.addEventListener("click", function(e){ e.stopPropagation(); openPersonInspectorForDocumented(doc); });
    hudEl.appendChild(el);
    documentedLabels.push(el);

    var found = findFeedItemByHeadline(doc.receiptHeadline);
    doc.receiptUrl = (found && found.prov && found.prov.src) ? issueUrl(found.prov.src) : null;
  });
})();
var _docLabelV = new THREE.Vector3();
function updateDocumentedMoments(alt){
  DOCUMENTED_MOMENTS.forEach(function(doc,i){
    var mesh = documentedMeshes[i], el = documentedLabels[i];
    var dateActive = simDay>=doc.startDay && simDay<=doc.endDay;
    mesh.visible = dateActive;
    if(!dateActive || alt>1400){ el.style.opacity=0; return; }
    var y = terrainHeight(doc.x,doc.z);
    mesh.position.set(doc.x,y,doc.z);
    _docLabelV.set(doc.x,y+2.7,doc.z);
    _docLabelV.applyMatrix4(camera.matrixWorldInverse);
    if(_docLabelV.z>-1){ el.style.opacity=0; return; }
    _docLabelV.set(doc.x,y+2.7,doc.z).project(camera);
    if(_docLabelV.x<-1.05||_docLabelV.x>1.05||_docLabelV.y<-1.05||_docLabelV.y>1.05){ el.style.opacity=0; return; }
    el.style.opacity = 0.95;
    el.style.left = ((_docLabelV.x*0.5+0.5)*window.innerWidth)+"px";
    el.style.top = ((-_docLabelV.y*0.5+0.5)*window.innerHeight)+"px";
  });
}


/* ---- people audits (layers-spec.md rules block): never inside a footprint;
   apparent speed <=3 m/s — wraps the existing __P1850.walkAudit. Route
   diversity wraps __P1850.routeDiversity between the sim's two busiest
   documented hubs (the Plaza and the Clay St wharf). ---- */
registerAudit("people", "walk", function(){
  var r = window.__P1850.walkAudit();
  return { pass: r.inFootprint===0 && (r.medianSpd==null || r.medianSpd<=3.0),
           total: r.total, walkers: r.walkers, inFootprint: r.inFootprint,
           medianSpd: r.medianSpd, roadShare: r.roadShare };
});
registerAudit("people", "routeDiversity", function(){
  // liveness check: the weighted router returns real routes between the sim's
  // two busiest documented hubs. distinct-count reported for screening eyes;
  // a diversity FLOOR is deliberately not codified (layers-spec.md rules block
  // has no such rule — selectivity: do not invent rules beyond the list).
  var r = window.__P1850.routeDiversity(PLAZA_CENTER.x, PLAZA_CENTER.z, WORKSITE_WHARF.x, WORKSITE_WHARF.z, 10);
  var routed = r.sigs.filter(function(s){ return s!=null; }).length;
  return { pass: routed>0, routed: routed, distinct: r.distinct, sampled: 10 };
});
