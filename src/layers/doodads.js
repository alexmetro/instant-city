/* =====================================================================
   LAYER doodads (slot 5) — OWNS scatter/litter/vegetation instancing (trees, scrub, doodad ring,
   village clutter, waterfront props). READS zoneAt, walkBlockedAt, terrainHeight. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 4 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 29 — ground scatter, micro-scatter ring, doodad ring, village-life clutter */
/* =====================================================================
   A1: DETAIL DISPLACEMENT PATCH — RETIRED (s52 GROUND MATERIALITY).
   The old 600m camera-following translucent ripple film (one uniform
   dune tint over ALL ground, town included) was itself a large part of
   the "painted-on" close-zoom read the user flagged, and it violated the
   one-owner idea (a second, unkeyed detail layer floating over the real
   ground materials). Its job is now done properly INSIDE the terrain +
   splat materials by the GROUND DETAIL ENGINE (material-keyed detail
   albedo + derivative-noise detail normals, camera-distance faded) plus
   the MICRO-SCATTER RING below. One draw call saved.
   ===================================================================== */

/* =====================================================================
   A2: GROUND SCATTER — seeded InstancedMesh sets (one draw call each):
   scrub tufts, dune-grass clumps, rocks, driftwood, kelp, wildflowers.
   Placement is rejection-sampled against real terrain height (biome
   proxy, matching terrainColor()'s own elevation bands) within a radius
   of the peninsula tip, since that's the only ground close enough to
   ever be seen up close — scattering across the full 12km baked box
   would be wasted density. Fades out with altitude (A2 spec: ~1500m).
   ===================================================================== */
var scatterMeshes = [];
var farScatterMeshes = []; // trees / rock outcrops — fade further out than ground-hugging scatter
(function buildGroundScatter(){
  var originX = PLAZA_CENTER.x, originZ = PLAZA_CENTER.z;

  function scrubTest(x,z,h){ return h>10 && h<70 && farFromVillage(x,z,70); }
  function duneTest(x,z,h){ return h>0.6 && h<9 && farFromVillage(x,z,60); }
  function rockTest(x,z,h){ return h>18 && h<55 && farFromVillage(x,z,80); }
  function tideTest(x,z,h){ return h>-0.5 && h<2.2 && farFromVillage(x,z,90); }
  function flowerTest(x,z,h){ return h>14 && h<65 && x<originX-500 && farFromVillage(x,z,70); }

  // scrub tufts — small dark cones on scrub slopes
  var scrubGeo = new THREE.ConeGeometry(0.32,0.85,5); scrubGeo.translate(0,0.42,0);
  var scrubMat = new THREE.MeshPhongMaterial({ color:0xffffff, flatShading:true, specular:0x000000, shininess:0 });
  var scrubSamples = scatterSample(SCT(3200), originX, originZ, 2300, scrubTest);
  // s46 WEST ECOLOGY: wind-blown dune scrub across the zone-2 belts (SoMa
  // field's outer reach + the Great Sand Bank's scrub fringes) — same mesh,
  // zero extra draw calls
  scrubSamples = scrubSamples.concat(scatterRect(SCT(1500), -9200, -1500, -1400, 7400,
    function(x,z,h){ var zn=zoneAt(x,z); return (zn===2 || (zn===1 && hash2(Math.floor(x*0.2),Math.floor(z*0.2))>0.86)) && h>2 && h<90; }, SCT(1500)*14));
  var scrubMesh = buildScatterMesh(scrubGeo, scrubMat, scrubSamples, {
    minScale:0.7, maxScale:1.5, colors:[new THREE.Color(0x4d5c30), new THREE.Color(0x5e6e38), new THREE.Color(0x3f4a26)]
  });
  scene.add(scrubMesh); scatterMeshes.push(scrubMesh);

  // dune/scrub-cross fix, 2026-07-10: 2 perpendicular planes (4 blades at
  // 90°) read as a hard, flat "X"/jack from mid-to-long distance, especially
  // tiled along the dune-elevation band as a marching arc — never as a
  // clump of grass. A 3rd plane (6 blades at 60°) breaks the axis-aligned
  // cross, and a narrower/shorter default silhouette plus a slightly domed
  // vertical taper reads rounder, softer, and greener up close.
  function makeCrossPlanes(w,h,color,blades){
    var p1 = new THREE.PlaneGeometry(w,h).toNonIndexed(); p1.translate(0,h/2,0);
    var parts = [colorizeUniform(p1,color)];
    var n = blades||2;
    for(var i=1;i<n;i++){
      var p = p1.clone(); p.rotateY((Math.PI/n)*i); parts.push(colorizeUniform(p,color));
    }
    return mergeGeoms(parts);
  }
  var duneGeo = makeCrossPlanes(0.52,0.5,new THREE.Color(0xffffff),3);
  var duneMat = new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, side:THREE.DoubleSide, flatShading:true, specular:0x000000, shininess:0, transparent:true });
  var duneSamples = scatterSample(SCT(2800), originX, originZ, 2400, duneTest);
  // s46 WEST: sparse dune grass on the Great Sand Bank (active dunes are
  // mostly bare — tone carries the read; grass rides hollows) + grassland tufts
  duneSamples = duneSamples.concat(scatterRect(SCT(1400), -9300, -5200, -100, 7400,
    function(x,z,h){ return zoneAt(x,z)===1 && h>1.5 && hash2(Math.floor(x*0.3),Math.floor(z*0.3))>0.5; }, SCT(1400)*12));
  duneSamples = duneSamples.concat(scatterRect(SCT(700), -8700, -1200, -1500, 9200,
    function(x,z,h){ return zoneAt(x,z)===3 && h>1.5 && h<80; }, SCT(700)*14));
  var duneMesh = buildScatterMesh(duneGeo, duneMat, duneSamples, {
    minScale:0.7, maxScale:1.3, colors:[new THREE.Color(0x8c9a5c), new THREE.Color(0xa0a868), new THREE.Color(0x9cae6e)]
  });
  scene.add(duneMesh); scatterMeshes.push(duneMesh);

  // rocks — grey dodecahedra near hill bases
  var rockGeo = new THREE.DodecahedronGeometry(0.55,0); rockGeo.translate(0,0.38,0);
  var rockMat = new THREE.MeshPhongMaterial({ color:0xffffff, flatShading:true, specular:0x000000, shininess:0 });
  var rockSamples = scatterSample(SCT(750), originX, originZ, 2300, rockTest);
  var rockMesh = buildScatterMesh(rockGeo, rockMat, rockSamples, {
    minScale:0.6, maxScale:1.8, colors:[new THREE.Color(0x8f8672), new THREE.Color(0x9c9280), new THREE.Color(0x7d7462)]
  });
  scene.add(rockMesh); scatterMeshes.push(rockMesh);

  // driftwood — thin weathered logs along the tideline
  var driftGeo = new THREE.BoxGeometry(1.7,0.22,0.32).toNonIndexed();
  var driftMat = new THREE.MeshPhongMaterial({ color:0x6b5a44, flatShading:true, specular:0x000000, shininess:0 });
  var driftSamples = scatterSample(SCT(220), originX, originZ, 2200, tideTest);
  // s46: driftwood on the Ocean Beach strand
  driftSamples = driftSamples.concat(scatterRect(SCT(120), -9750, -8700, 1700, 8200,
    function(x,z,h){ return h>-0.4 && h<2.2; }, SCT(120)*20));
  var driftMesh = buildScatterMesh(driftGeo, driftMat, driftSamples, { tilt:0.5, yOffset:0.12, minScale:0.7, maxScale:1.3 });
  scene.add(driftMesh); scatterMeshes.push(driftMesh);

  // kelp scraps — dark flat strands along the tideline
  var kelpGeo = new THREE.PlaneGeometry(0.32,1.2,1,3);
  var kp = kelpGeo.attributes.position;
  for(var ki=0;ki<kp.count;ki++) kp.setX(ki, kp.getX(ki)+Math.sin(kp.getY(ki)*3.0)*0.07);
  kelpGeo.rotateX(-Math.PI/2);
  var kelpMat = new THREE.MeshPhongMaterial({ color:0x3c3226, side:THREE.DoubleSide, flatShading:true, specular:0x000000, shininess:0 });
  var kelpSamples = scatterSample(SCT(260), originX, originZ, 2200, tideTest);
  var kelpMesh = buildScatterMesh(kelpGeo, kelpMat, kelpSamples, { yOffset:0.05, minScale:0.8, maxScale:1.5 });
  scene.add(kelpMesh); scatterMeshes.push(kelpMesh);

  // wildflowers — spring color specks on the western hills
  var flowerGeo = makeCrossPlanes(0.24,0.24,new THREE.Color(0xffffff));
  var flowerMat = new THREE.MeshBasicMaterial({ color:0xffffff, vertexColors:true, side:THREE.DoubleSide, transparent:true });
  var flowerSamples = scatterSample(SCT(550), originX-900, originZ, 1500, flowerTest);
  var flowerMesh = buildScatterMesh(flowerGeo, flowerMat, flowerSamples, {
    minScale:0.8, maxScale:1.3,
    colors:[new THREE.Color(0xe8a0c0), new THREE.Color(0xf0d060), new THREE.Color(0xc898e0), new THREE.Color(0xf0f0f0)]
  });
  scene.add(flowerMesh); scatterMeshes.push(flowerMesh);
})();
function updateGroundScatter(alt){
  var vis = alt < 1900;
  var fadeOpac = clamp01(1-smoothstep(1400,1850,alt));
  for(var i=0;i<scatterMeshes.length;i++){
    var m = scatterMeshes[i];
    m.visible = vis;
    if(m.material.transparent!==undefined){ m.material.transparent = true; m.material.opacity = fadeOpac; }
  }
}
/* trees + rock outcrops read as "landscape character" from further out, so
   they get their own, longer fade curve than the low ground scatter above. */
function updateFarScatter(alt){
  var vis = alt < 2650;
  var fadeOpac = clamp01(1-smoothstep(2000,2600,alt));
  for(var i=0;i<farScatterMeshes.length;i++){
    var m = farScatterMeshes[i];
    m.visible = vis;
    if(m.material.transparent!==undefined){ m.material.transparent = true; m.material.opacity = fadeOpac; }
  }
}

/* =====================================================================
   MICRO-SCATTER RING (s52 GROUND MATERIALITY, part 3) — the minimal
   version of the camera-centered scatter grid every modern grass/detritus
   system uses (a ring of instances follows the camera; a deterministic
   per-cell world-space hash decides what grows/lies in each cell, so the
   litter NEVER swims as the camera moves — cells despawn beyond the ring
   and respawn identically on return).

   TRUE-SCALE tiny props (0.05-0.3m), era-neutral natural litter only,
   keyed by the same baked ecology zones / placement data as everything
   else: town ground = wood chips, stones, straw wisps, occasional plank
   scrap; painted streets/plaza = sparse compacted stones; sand = shell/
   stone specks + grass tufts at the dune-scrub edge; grassland = tufts;
   marsh edge = reed clumps. Nothing on water, nothing inside building
   footprints (PLACEMENT_INDEX), nothing above ~250m camera altitude —
   the map view gains ZERO draw calls. Two pools = +2 draw calls close-in.
   ===================================================================== */
var MICRO_RING_R = IS_TOUCH ? 60 : 80;
var MICRO_CELL = 2.6;
// s60 PAINTERLY GROUND KIT: keep-rates roughly doubled (the painterly-kit
// formula's "doodad density" leg) — caps sized to the new worst case.
var MICRO_CHUNK_CAP = SCT(1600), MICRO_TUFT_CAP = SCT(1500);
var MICRO_ALT_HIDE = 250;         // hard off — well under any map framing
function _microHash(ix,iz,k){ return hash2(ix*12.9898+k*3.7, iz*78.233-k*7.1); }
function makeMicroChunkGeo(){     // one irregular flattened lump — reads as chip/stone/scrap by scale+tint
  var g = new THREE.BoxGeometry(0.20,0.045,0.12).toNonIndexed();
  var pos = g.attributes.position;
  for(var i=0;i<pos.count;i++){
    pos.setX(i, pos.getX(i)*(1.0+(hash2(i*3.1,7.7)-0.5)*0.4));
    pos.setZ(i, pos.getZ(i)*(1.0+(hash2(i*1.7,3.3)-0.5)*0.4));
  }
  g.translate(0,0.024,0);
  g.computeVertexNormals();
  return g;
}
function makeMicroTuftGeo(){      // 3 crossed blades — tuft / straw wisp / reed by scale+tint
  var parts = [];
  for(var i=0;i<3;i++){
    var p = new THREE.PlaneGeometry(0.14,0.22).toNonIndexed();
    p.translate(0,0.11,0);
    p.rotateY(Math.PI/3*i + 0.35);
    parts.push(colorizeUniform(p, new THREE.Color(0xffffff)));
  }
  return mergeGeoms(parts);
}
var microChunkMesh = new THREE.InstancedMesh(makeMicroChunkGeo(),
  new THREE.MeshPhongMaterial({ color:0xffffff, flatShading:true, specular:0x000000, shininess:0, transparent:true }), MICRO_CHUNK_CAP);
var microTuftMesh = new THREE.InstancedMesh(makeMicroTuftGeo(),
  new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, side:THREE.DoubleSide, flatShading:true, specular:0x000000, shininess:0, transparent:true }), MICRO_TUFT_CAP);
microChunkMesh.count = 0; microTuftMesh.count = 0;
// r128 footgun: setColorAt() sizes instanceColor from the CURRENT count —
// which is 0 here until the first rebuild — so pre-allocate at the cap
// (filled white) or every instance renders vColor=0 black.
microChunkMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MICRO_CHUNK_CAP*3).fill(1), 3);
microTuftMesh.instanceColor  = new THREE.InstancedBufferAttribute(new Float32Array(MICRO_TUFT_CAP*3).fill(1), 3);
microChunkMesh.frustumCulled = false; microTuftMesh.frustumCulled = false; // ring surrounds the camera by construction
scene.add(microChunkMesh); scene.add(microTuftMesh);
var MICRO_STATS = { chunks:0, tufts:0, cells:0, lastMs:0 };
// palettes (era-neutral 1846 ground litter)
var MICRO_COLS = { // kept LIGHT: true-scale litter shows the camera mostly its shaded flanks, so albedo leans bright to net out mid-tone
  chip:   [new THREE.Color(0xa88b58), new THREE.Color(0xb5986a), new THREE.Color(0x96794e)],
  stone:  [new THREE.Color(0x9a9078), new THREE.Color(0x8a8068), new THREE.Color(0xa89e88)],
  plank:  [new THREE.Color(0xb09a6e), new THREE.Color(0x9e8860)],
  shell:  [new THREE.Color(0xd4c9ae), new THREE.Color(0xc9bc9e), new THREE.Color(0xbcae90)],
  straw:  [new THREE.Color(0xc9ae64), new THREE.Color(0xd2b970)],
  scat:   [new THREE.Color(0x4a3f2e), new THREE.Color(0x5c4e38)], // s60: droppings on the grazing flats — era-neutral animal sign
  grass:  [new THREE.Color(0x8c9a5c), new THREE.Color(0x7c8a4e), new THREE.Color(0x96a464)],
  dune:   [new THREE.Color(0xa0a868), new THREE.Color(0x949c5e)],
  reed:   [new THREE.Color(0x6b7a42), new THREE.Color(0x5e7038)]
};
// Plaza rect in world space (litter class: compacted public ground)
var MICRO_PLAZA = (function(){
  var c = [ gridToWorld(GEO.plaza.uMin, GEO.plaza.vMin), gridToWorld(GEO.plaza.uMax, GEO.plaza.vMin),
            gridToWorld(GEO.plaza.uMax, GEO.plaza.vMax), gridToWorld(GEO.plaza.uMin, GEO.plaza.vMax) ];
  return c;
})();
function _microInPlaza(x,z){
  var sgn = 0;
  for(var i=0;i<4;i++){
    var a = MICRO_PLAZA[i], b = MICRO_PLAZA[(i+1)%4];
    var cr = (b.x-a.x)*(z-a.z)-(b.z-a.z)*(x-a.x);
    if(cr===0) continue;
    if(sgn===0) sgn = cr>0?1:-1;
    else if((cr>0?1:-1)!==sgn) return false;
  }
  return true;
}
var _microLastX = 1e9, _microLastZ = 1e9, _microBuilt = false;
function rebuildMicroScatter(camX, camZ){
  var t0 = performance.now();
  var R = MICRO_RING_R, R2 = R*R;
  // local working sets (one pass over the global tables per rebuild)
  var segs = [];
  function collectSegs(list){
    for(var i=0;i<list.length;i++){
      var s = list[i];
      var pad = s.halfW+4;
      if(Math.max(s.x0,s.x1) < camX-R-pad || Math.min(s.x0,s.x1) > camX+R+pad ||
         Math.max(s.z0,s.z1) < camZ-R-pad || Math.min(s.z0,s.z1) > camZ+R+pad) continue;
      segs.push(s);
    }
  }
  collectSegs(PLACEMENT_STREET_SEGS);
  collectSegs(PLACEMENT_MISSION_SEGS);
  var foots = [];
  for(var fi=0; fi<PLACEMENT_INDEX.length; fi++){
    var f = PLACEMENT_INDEX[fi];
    if(Math.abs(f.x-camX)>R+8 || Math.abs(f.z-camZ)>R+8) continue;
    foots.push(f);
  }
  function streetDistClass(x,z){ // 0 = clear, 1 = on street (within half width), 2 = shoulder
    var best = 1e9, bw = 0;
    for(var i=0;i<segs.length;i++){
      var s = segs[i];
      var d = distToSegXZ(x,z,s.x0,s.z0,s.x1,s.z1);
      if(d-s.halfW < best-bw){ best = d; bw = s.halfW; }
      if(d < s.halfW) return 1;
    }
    return (best < bw+2.5) ? 2 : 0;
  }
  function inFootprint(x,z){
    for(var i=0;i<foots.length;i++){
      var p = foots[i], dx=x-p.x, dz=z-p.z, r=p.r+0.3;
      if(dx*dx+dz*dz < r*r) return true;
    }
    return false;
  }
  var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), vv = new THREE.Vector3(), sv = new THREE.Vector3();
  var YAX = new THREE.Vector3(0,1,0), XAX = new THREE.Vector3(1,0,0);
  var nChunk = 0, nTuft = 0, nCells = 0;
  var i0 = Math.floor((camX-R)/MICRO_CELL), i1 = Math.ceil((camX+R)/MICRO_CELL);
  var j0 = Math.floor((camZ-R)/MICRO_CELL), j1 = Math.ceil((camZ+R)/MICRO_CELL);
  var _edge = 1; // per-cell ring-edge scale taper (despawn never pops)
  function pushChunk(x,z,y,scXZ,scY,stretch,tint,tilt,h1,h2){
    if(nChunk>=MICRO_CHUNK_CAP) return;
    q.setFromAxisAngle(YAX, h1*Math.PI*2);
    if(tilt){ var tq = new THREE.Quaternion().setFromAxisAngle(XAX, (h2-0.5)*tilt); q.multiply(tq); }
    vv.set(x,y,z); sv.set(scXZ*(stretch||1)*_edge, scY*_edge, scXZ*_edge);
    m4.compose(vv,q,sv);
    microChunkMesh.setMatrixAt(nChunk, m4);
    microChunkMesh.setColorAt(nChunk, tint);
    nChunk++;
  }
  function pushTuft(x,z,y,scXZ,scY,tint,h1){
    if(nTuft>=MICRO_TUFT_CAP) return;
    q.setFromAxisAngle(YAX, h1*Math.PI*2);
    vv.set(x,y,z); sv.set(scXZ*_edge, scY*_edge, scXZ*_edge);
    m4.compose(vv,q,sv);
    microTuftMesh.setMatrixAt(nTuft, m4);
    microTuftMesh.setColorAt(nTuft, tint);
    nTuft++;
  }
  function pick(arr,h){ return arr[Math.floor(h*arr.length)%arr.length]; }
  for(var iz=j0; iz<=j1; iz++){
    for(var ix=i0; ix<=i1; ix++){
      var hKeep = _microHash(ix,iz,0);
      var x = (ix + 0.5 + (_microHash(ix,iz,1)-0.5)*0.9)*MICRO_CELL;
      var z = (iz + 0.5 + (_microHash(ix,iz,2)-0.5)*0.9)*MICRO_CELL;
      var ddx = x-camX, ddz = z-camZ, d2 = ddx*ddx+ddz*ddz;
      if(d2 > R2) continue;
      nCells++;
      var h = terrainMeshSurfaceY(x,z);
      if(h < 0.45) continue;                       // never on water / the wet tide edge
      _edge = 1-smoothstep(R-16,R-2,Math.sqrt(d2));
      if(_edge < 0.05) continue;
      var stCls = streetDistClass(x,z);
      var plaza = (stCls!==1) && _microInPlaza(x,z);
      var dTown = distOutsideBox(x,z,VILLAGE_BOX);
      var zn = zoneAt(x,z);
      var h1 = _microHash(ix,iz,3), h2 = _microHash(ix,iz,4), h3 = _microHash(ix,iz,5);
      var lift = (x>CLOSE_BOX.xMin && x<CLOSE_BOX.xMax && z>CLOSE_BOX.zMin && z<CLOSE_BOX.zMax) ? CLOSE_SPLAT_LIFT+0.01
               : (x>TOWN_BOX.xMin && x<TOWN_BOX.xMax && z>TOWN_BOX.zMin && z<TOWN_BOX.zMax) ? TOWN_SPLAT_LIFT+0.01 : 0.01;
      var groundY = h + ((stCls===1||plaza) ? lift : 0.01);
      if(stCls===1 || plaza){
        // compacted public surface: sparse stones + the odd chip pressed in
        if(hKeep > 0.14) continue;
        if(inFootprint(x,z)) continue;
        var tp = h2<0.6 ? "stone" : "chip";
        pushChunk(x,z,groundY, 0.55+h3*0.5, 0.45+h3*0.3, 1, pick(MICRO_COLS[tp],h1), 0.15, h1, h2);
      } else if(dTown < 40){
        // town ground: working litter — chips, straw, stones, plank scraps
        if(hKeep > 0.55) continue;
        if(inFootprint(x,z)) continue;
        if(h2 < 0.38){ pushChunk(x,z,groundY, 0.7+h3*0.8, 0.7+h3*0.4, 1, pick(MICRO_COLS.chip,h1), 0.3, h1, h2); }
        else if(h2 < 0.62){ pushTuft(x,z,groundY, 0.8+h3*0.6, 0.30+h3*0.15, pick(MICRO_COLS.straw,h1), h1); } // flattened straw wisp
        else if(h2 < 0.85){ pushChunk(x,z,groundY, 0.55+h3*0.7, 0.55+h3*0.4, 1, pick(MICRO_COLS.stone,h1), 0.2, h1, h2); }
        else { pushChunk(x,z,groundY, 0.6+h3*0.4, 0.5, 2.4+h3*0.8, pick(MICRO_COLS.plank,h1), 0.1, h1, h2); } // plank scrap
      } else if(stCls===2){
        continue; // street shoulder outside town: keep the worn edge clean
      } else if(zn===1){
        // open sand: shell/stone specks; tufts only at the dune-scrub edge
        var nearScrub = (zoneAt(x+14,z)===2 || zoneAt(x-14,z)===2 || zoneAt(x,z+14)===2 || zoneAt(x,z-14)===2);
        if(nearScrub && hKeep < 0.34){ pushTuft(x,z,groundY, 0.9+h3*0.7, 0.8+h3*0.6, pick(MICRO_COLS.dune,h1), h1); }
        else if(hKeep < 0.22){ pushChunk(x,z,groundY, 0.4+h3*0.4, 0.5+h3*0.3, 1, pick(h2<0.55?MICRO_COLS.shell:MICRO_COLS.stone,h1), 0.2, h1, h2); }
      } else if(zn===2){
        if(hKeep < 0.35) pushTuft(x,z,groundY, 0.9+h3*0.7, 0.9+h3*0.6, pick(MICRO_COLS.dune,h1), h1);
      } else if(zn===3){
        if(hKeep < 0.34) pushTuft(x,z,groundY, 0.9+h3*0.8, 1.0+h3*0.7, pick(MICRO_COLS.grass,h1), h1); // <=~1010 worst case — the 1500 cap never truncates the scan directionally
        else if(hKeep < 0.40) pushChunk(x,z,groundY, 0.35+h3*0.3, 0.3, 1.4, pick(MICRO_COLS.scat,h1), 0.2, h1, h2); // s60: animal sign on the grazing flats
      } else if(zn===5 && h < 1.5){
        if(hKeep < 0.55) pushTuft(x,z,groundY, 0.7+h3*0.5, 1.7+h3*1.0, pick(MICRO_COLS.reed,h1), h1); // reeds at the marsh edge
      } else if(zn===4){
        if(hKeep < 0.28) pushChunk(x,z,groundY, 0.6+h3*0.7, 0.7+h3*0.4, 1.6, pick(MICRO_COLS.chip,h1), 0.5, h1, h2); // oak-floor twigs
      } else if(zn===6){
        if(hKeep < 0.06) pushChunk(x,z,groundY, 0.4+h3*0.3, 0.35, 1.3, pick(MICRO_COLS.scat,h1), 0.2, h1, h2); // s60: sign on the mudflats
      } else {
        if(hKeep < 0.18) pushChunk(x,z,groundY, 0.5+h3*0.6, 0.6+h3*0.4, 1, pick(MICRO_COLS.stone,h1), 0.3, h1, h2);
      }
    }
  }
  microChunkMesh.count = nChunk; microTuftMesh.count = nTuft;
  microChunkMesh.instanceMatrix.needsUpdate = true;
  microTuftMesh.instanceMatrix.needsUpdate = true;
  if(microChunkMesh.instanceColor) microChunkMesh.instanceColor.needsUpdate = true;
  if(microTuftMesh.instanceColor) microTuftMesh.instanceColor.needsUpdate = true;
  _microLastX = camX; _microLastZ = camZ; _microBuilt = true;
  MICRO_STATS.chunks = nChunk; MICRO_STATS.tufts = nTuft; MICRO_STATS.cells = nCells;
  MICRO_STATS.lastMs = +(performance.now()-t0).toFixed(2);
}
function updateMicroScatter(alt){
  if(alt >= MICRO_ALT_HIDE){
    microChunkMesh.visible = false; microTuftMesh.visible = false;
    return;
  }
  var op = clamp01(1-smoothstep(150,235,alt));
  microChunkMesh.material.opacity = op; microTuftMesh.material.opacity = op;
  var on = op > 0.01;
  microChunkMesh.visible = on && microChunkMesh.count>0;
  microTuftMesh.visible = on && microTuftMesh.count>0;
  if(!on) return;
  // ring centers on the LOOK-AT point (CAM.focus), not the eye — a pure
  // zoom barely moves the focus, so the ring never recenters/churns
  // during the zoom-in gesture (the s52 no-shimmer requirement).
  var cx = CAM.focus.x, cz = CAM.focus.z;
  var dx = cx-_microLastX, dz = cz-_microLastZ;
  if(!_microBuilt || dx*dx+dz*dz > 25) rebuildMicroScatter(cx, cz);
  microChunkMesh.visible = microChunkMesh.count>0;
  microTuftMesh.visible = microTuftMesh.count>0;
}

/* =====================================================================
   DOODAD RING (s60 PAINTERLY GROUND KIT) — the "doodad density" leg of
   the painterly-kit formula (hand-painted tiles + splat blend + DOODADS
   + graded palette). Expands the s52 micro-litter ring into a fuller
   pass of true-scale, era-neutral props (0.3-1.6m), keyed by ecology
   zone + town proximity, same camera-centered deterministic-cell design
   (per-cell world-space hash — never swims, despawns/respawns identically):
     near buildings — firewood stacks, barrels, crates set against walls,
       kept OUT of doorways via the walkBlockedAt oracle's own obstacle
       frame (the +Z door-face apron the s59 door-paths use stays clear)
     town interior/fringe — stones, cut stumps (the woodcutting ring),
       grass clumps thinning toward the trodden core
     grassland/scrub/oak — painted-texture grass clumps (the RuneScape/
       WoW billboard-clump trick), stones, stumps
     tideline — driftwood + kelp wrack;  flats — bleached bones
   Placement law: nothing on water (h<0.45), nothing on streets' travel
   lanes (PLACEMENT segs), nothing on the plaza, nothing inside/against
   footprints-fences-rails (walkBlockedAt r=0.55). Rebuilds also on the
   30-day route bucket so yard goods appear only beside REVEALED
   buildings (era-honest). Hidden above 300m: map framings gain ZERO
   draw calls; +9 draw calls close-in (one per pool).
   ===================================================================== */
var DOODAD_RING_R = IS_TOUCH ? 90 : 130;
var DOODAD_CELL = 6.5;
var DOODAD_ALT_HIDE = 300;
function _doodadHash(ix,iz,k){ return hash2(ix*17.713+k*5.9, iz*43.129-k*11.3); }
function makeGrassClumpTexture(){ // painted mini-texture: blades fanning from the root, 4 greens
  var S=128, c=document.createElement("canvas"); c.width=c.height=S;
  var x=c.getContext("2d");
  var s=(97*2654435761)>>>0;
  function R(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; }
  var GREENS=["#4f5e30","#66763e","#82914e","#98a45e"];
  x.lineCap="round";
  for(var i=0;i<26;i++){
    var bx=S*0.5+(R()-0.5)*S*0.35, tipX=bx+(R()-0.5)*S*0.6, tipY=S*(0.04+R()*0.32);
    x.strokeStyle=GREENS[(R()*GREENS.length)|0];
    x.lineWidth=2+R()*3.5;
    x.beginPath(); x.moveTo(bx,S*0.99);
    x.quadraticCurveTo(bx+(tipX-bx)*0.25, S*0.55, tipX, tipY);
    x.stroke();
  }
  return new THREE.CanvasTexture(c);
}
var DOODAD_POOLS = (function(){
  function mk(geo, mat, cap){
    var m = new THREE.InstancedMesh(geo, mat, cap);
    m.count = 0;
    // r128 setColorAt footgun (see micro ring): pre-allocate at cap or instances render black
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap*3).fill(1), 3);
    m.frustumCulled = false;
    scene.add(m);
    return { mesh:m, cap:cap };
  }
  function phong(opts){
    var o = { flatShading:true, specular:0x000000, shininess:0, transparent:true };
    for(var k in opts) o[k]=opts[k];
    return new THREE.MeshPhongMaterial(o);
  }
  // grass clump: 3 crossed textured quads (hand-merged — mergeGeoms drops
  // the UVs the painted mini-texture needs)
  var clumpGeo = (function(){
    var parts=[], i;
    for(i=0;i<3;i++){
      var p=new THREE.PlaneGeometry(0.8,0.5).toNonIndexed();
      p.translate(0,0.24,0); p.rotateY(Math.PI/3*i+0.4);
      parts.push(p);
    }
    var total=0;
    parts.forEach(function(p2){ total+=p2.attributes.position.count; });
    var pos=new Float32Array(total*3), uv=new Float32Array(total*2), off=0;
    parts.forEach(function(p2){
      pos.set(p2.attributes.position.array, off*3);
      uv.set(p2.attributes.uv.array, off*2);
      off+=p2.attributes.position.count;
    });
    var g=new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos,3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv,2));
    g.computeVertexNormals();
    return g;
  })();
  var clumpMat = phong({ map:makeGrassClumpTexture(), alphaTest:0.35, side:THREE.DoubleSide });
  // cut stump: dark bole + pale fresh-cut top face
  var stumpGeo = (function(){
    var bole = colorizeUniform(new THREE.CylinderGeometry(0.24,0.30,0.34,7).toNonIndexed(), new THREE.Color(0x5f4c32));
    bole.translate(0,0.17,0);
    var cut = colorizeUniform(new THREE.CylinderGeometry(0.225,0.225,0.025,7).toNonIndexed(), new THREE.Color(0xc9b083));
    cut.translate(0,0.345,0);
    return mergeGeoms([bole,cut]);
  })();
  // firewood stack: two log courses
  var woodGeo = (function(){
    var logs=[], lc=new THREE.Color(0x5a4632), i;
    for(i=0;i<3;i++){
      var g=new THREE.CylinderGeometry(0.11,0.11,0.9,6).toNonIndexed();
      g.rotateZ(Math.PI/2); g.translate(0,0.11,(i-1)*0.24);
      logs.push(colorizeUniform(g,lc));
    }
    for(i=0;i<2;i++){
      var g2=new THREE.CylinderGeometry(0.11,0.11,0.9,6).toNonIndexed();
      g2.rotateZ(Math.PI/2); g2.translate(0,0.30,(i-0.5)*0.24);
      logs.push(colorizeUniform(g2,new THREE.Color(0x64503a)));
    }
    return mergeGeoms(logs);
  })();
  var kelpGeo = (function(){
    var g=new THREE.PlaneGeometry(0.4,1.3,1,3);
    var p=g.attributes.position;
    for(var i=0;i<p.count;i++) p.setX(i, p.getX(i)+Math.sin(p.getY(i)*3.0)*0.09);
    g.rotateX(-Math.PI/2); g.translate(0,0.03,0);
    return g;
  })();
  var stoneGeo=new THREE.DodecahedronGeometry(0.30,0); stoneGeo.translate(0,0.20,0);
  var barrelGeo=new THREE.CylinderGeometry(0.28,0.32,0.85,8); barrelGeo.translate(0,0.425,0);
  var crateGeo=new THREE.BoxGeometry(0.6,0.55,0.6).toNonIndexed(); crateGeo.translate(0,0.275,0);
  var driftGeo=new THREE.BoxGeometry(1.6,0.20,0.28).toNonIndexed(); driftGeo.translate(0,0.10,0);
  var boneGeo=new THREE.BoxGeometry(0.55,0.07,0.09).toNonIndexed(); boneGeo.translate(0,0.035,0);
  return {
    clump:  mk(clumpGeo, clumpMat, SCT(1100)),
    stone:  mk(stoneGeo, phong({color:0xffffff}), SCT(500)),
    stump:  mk(stumpGeo, phong({color:0xffffff, vertexColors:true}), SCT(160)),
    wood:   mk(woodGeo,  phong({color:0xffffff, vertexColors:true}), SCT(80)),
    barrel: mk(barrelGeo, phong({color:0x6e5230}), SCT(100)),
    crate:  mk(crateGeo,  phong({color:0x8a6f47}), SCT(100)),
    drift:  mk(driftGeo,  phong({color:0x6b5a44}), SCT(160)),
    kelp:   mk(kelpGeo,   phong({color:0x3c3226, side:THREE.DoubleSide}), SCT(200)),
    bone:   mk(boneGeo,   phong({color:0xffffff}), SCT(80))
  };
})();
var DOODAD_COLS = {
  stone: [new THREE.Color(0x8f8672), new THREE.Color(0x9c9280), new THREE.Color(0x7d7462)],
  bone:  [new THREE.Color(0xcfc5ad), new THREE.Color(0xbfb49a)],
  white: [new THREE.Color(0xffffff), new THREE.Color(0xe8e0d4), new THREE.Color(0xd8ccba)]
};
var DOODAD_STATS = { counts:{}, cells:0, lastMs:0 };
var _doodadLastX=1e9, _doodadLastZ=1e9, _doodadBuilt=false, _doodadLastDayB=-1;
function rebuildDoodads(camX, camZ){
  var t0 = performance.now();
  var R = DOODAD_RING_R, R2 = R*R, k;
  var segs = [];
  function collectSegs(list){
    for(var i=0;i<list.length;i++){
      var s = list[i], pad = s.halfW+4;
      if(Math.max(s.x0,s.x1) < camX-R-pad || Math.min(s.x0,s.x1) > camX+R+pad ||
         Math.max(s.z0,s.z1) < camZ-R-pad || Math.min(s.z0,s.z1) > camZ+R+pad) continue;
      segs.push(s);
    }
  }
  collectSegs(PLACEMENT_STREET_SEGS);
  collectSegs(PLACEMENT_MISSION_SEGS);
  function onStreet(x,z){
    for(var i=0;i<segs.length;i++){
      var s = segs[i];
      if(distToSegXZ(x,z,s.x0,s.z0,s.x1,s.z1) < s.halfW+0.8) return true;
    }
    return false;
  }
  var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), tq = new THREE.Quaternion(),
      vv = new THREE.Vector3(), sv = new THREE.Vector3();
  var YAX = new THREE.Vector3(0,1,0), XAX = new THREE.Vector3(1,0,0);
  var n = {}; for(k in DOODAD_POOLS) n[k]=0;
  var _edge = 1;
  function push(pool, x,z,y, sc, tint, yaw, tilt, h2){
    var P = DOODAD_POOLS[pool];
    if(n[pool]>=P.cap) return;
    q.setFromAxisAngle(YAX, yaw*Math.PI*2);
    if(tilt){ tq.setFromAxisAngle(XAX, (h2-0.5)*tilt); q.multiply(tq); }
    vv.set(x,y,z); sv.set(sc*_edge, sc*_edge, sc*_edge);
    m4.compose(vv,q,sv);
    P.mesh.setMatrixAt(n[pool], m4);
    if(tint) P.mesh.setColorAt(n[pool], tint);
    n[pool]++;
  }
  function pick(arr,h){ return arr[Math.floor(h*arr.length)%arr.length]; }
  var i0 = Math.floor((camX-R)/DOODAD_CELL), i1 = Math.ceil((camX+R)/DOODAD_CELL);
  var j0 = Math.floor((camZ-R)/DOODAD_CELL), j1 = Math.ceil((camZ+R)/DOODAD_CELL);
  var nCells = 0;
  for(var iz=j0; iz<=j1; iz++){
    for(var ix=i0; ix<=i1; ix++){
      var hKeep = _doodadHash(ix,iz,0);
      var x = (ix + 0.5 + (_doodadHash(ix,iz,1)-0.5)*0.85)*DOODAD_CELL;
      var z = (iz + 0.5 + (_doodadHash(ix,iz,2)-0.5)*0.85)*DOODAD_CELL;
      var ddx = x-camX, ddz = z-camZ, d2 = ddx*ddx+ddz*ddz;
      if(d2 > R2) continue;
      nCells++;
      var h = terrainMeshSurfaceY(x,z);
      if(h < 0.45) continue;                          // never on water / the wet tide edge
      _edge = 1-smoothstep(R-24,R-4,Math.sqrt(d2));
      if(_edge < 0.05) continue;
      if(onStreet(x,z)) continue;                     // travel lanes stay clear
      if(_microInPlaza(x,z)) continue;
      if(walkBlockedAt(x,z,simDay,0.55)) continue;    // the one collision oracle: footprints, fences, rails, walls
      var h1 = _doodadHash(ix,iz,3), h2 = _doodadHash(ix,iz,4), h3 = _doodadHash(ix,iz,5);
      var dTown = distOutsideBox(x,z,VILLAGE_BOX);
      var zn = zoneAt(x,z);
      var y = h + 0.01;
      // yard goods: set against a REVEALED building wall, out of the doorway
      var nb = (dTown < 90) ? walkBlockedAt(x,z,simDay,3.6) : null;
      if(nb && nb.t===1 && nb.hw>1.6){
        var dxb=x-nb.x, dzb=z-nb.z, cb=Math.cos(nb.rot), sb2=Math.sin(nb.rot);
        var lx=dxb*cb-dzb*sb2, lz=dxb*sb2+dzb*cb;
        if(lz > 0 && Math.abs(lx) < nb.hw*0.6) continue; // +Z door-face apron (s59 door-paths) stays clear
        if(hKeep < 0.5){
          if(h2 < 0.30) push("wood", x,z,y, 0.9+h3*0.25, pick(DOODAD_COLS.white,h1), Math.atan2(sb2,cb)/(Math.PI*2), 0, h2);
          else if(h2 < 0.62) push("barrel", x,z,y, 0.9+h3*0.2, null, h1, 0, h2);
          else if(h2 < 0.90) push("crate", x,z,y, 0.85+h3*0.3, null, h1, 0, h2);
          else push("clump", x,z,y, 0.6+h3*0.4, null, h1, 0, h2);
        }
      } else if(dTown===0){
        // town interior open lots: sparse stones + cut stumps (micro ring carries the litter)
        if(hKeep < 0.10){
          if(h2 < 0.6) push("stone", x,z,y, 0.5+h3*0.8, pick(DOODAD_COLS.stone,h1), h1, 0.2, h2);
          else push("stump", x,z,y, 0.8+h3*0.5, null, h1, 0, h2);
        }
      } else if(dTown < 80){
        // worn fringe: the woodcutting ring — clumps, stones, stumps
        if(hKeep < 0.30){
          if(h2 < 0.55) push("clump", x,z,y, 0.7+h3*0.7, null, h1, 0, h2);
          else if(h2 < 0.80) push("stone", x,z,y, 0.5+h3*1.0, pick(DOODAD_COLS.stone,h1), h1, 0.2, h2);
          else push("stump", x,z,y, 0.8+h3*0.5, null, h1, 0, h2);
        }
      } else if(h < 1.6 && zn!==5 && zn!==6){
        // tideline wrack: driftwood + kelp thrown above the wet edge
        if(hKeep < 0.10) push("drift", x,z,y+0.02, 0.7+h3*0.7, null, h1, 0.5, h2);
        else if(hKeep < 0.32) push("kelp", x,z,y+0.02, 0.8+h3*0.8, null, h1, 0, h2);
      } else if(zn===6){
        if(hKeep < 0.05) push("bone", x,z,y, 0.7+h3*0.5, pick(DOODAD_COLS.bone,h1), h1, 0.15, h2); // bleached bone on the flats
      } else if(zn===3){
        if(hKeep < 0.30){
          if(h2 < 0.72) push("clump", x,z,y, 0.7+h3*0.7, null, h1, 0, h2);
          else if(h2 < 0.93) push("stone", x,z,y, 0.5+h3*1.1, pick(DOODAD_COLS.stone,h1), h1, 0.2, h2);
          else push("bone", x,z,y, 0.7+h3*0.5, pick(DOODAD_COLS.bone,h1), h1, 0.15, h2);
        }
      } else if(zn===2){
        if(hKeep < 0.26){
          if(h2 < 0.8) push("clump", x,z,y, 0.7+h3*0.6, null, h1, 0, h2);
          else push("stone", x,z,y, 0.5+h3*1.0, pick(DOODAD_COLS.stone,h1), h1, 0.2, h2);
        }
      } else if(zn===4){
        if(hKeep < 0.24){
          if(h2 < 0.35) push("stump", x,z,y, 0.9+h3*0.6, null, h1, 0, h2);
          else push("clump", x,z,y, 0.7+h3*0.7, null, h1, 0, h2);
        }
      } else if(zn===1){
        if(hKeep < 0.06){
          if(h2 < 0.6) push("stone", x,z,y, 0.4+h3*0.8, pick(DOODAD_COLS.stone,h1), h1, 0.2, h2);
          else push("bone", x,z,y, 0.7+h3*0.5, pick(DOODAD_COLS.bone,h1), h1, 0.15, h2);
        }
      } else {
        if(hKeep < 0.10){
          if(h2 < 0.7) push("clump", x,z,y, 0.7+h3*0.6, null, h1, 0, h2);
          else push("stone", x,z,y, 0.5+h3*0.9, pick(DOODAD_COLS.stone,h1), h1, 0.2, h2);
        }
      }
    }
  }
  for(k in DOODAD_POOLS){
    var P = DOODAD_POOLS[k];
    P.mesh.count = n[k];
    P.mesh.instanceMatrix.needsUpdate = true;
    if(P.mesh.instanceColor) P.mesh.instanceColor.needsUpdate = true;
    DOODAD_STATS.counts[k] = n[k];
  }
  DOODAD_STATS.cells = nCells;
  DOODAD_STATS.lastMs = +(performance.now()-t0).toFixed(2);
  _doodadLastX = camX; _doodadLastZ = camZ; _doodadBuilt = true;
  _doodadLastDayB = Math.floor(simDay/ROUTE_BUCKET_DAYS);
}
function updateDoodads(alt){
  var k;
  if(alt >= DOODAD_ALT_HIDE){
    for(k in DOODAD_POOLS) DOODAD_POOLS[k].mesh.visible = false;
    return;
  }
  var op = clamp01(1-smoothstep(200,290,alt));
  var on = op > 0.01;
  for(k in DOODAD_POOLS){
    var P = DOODAD_POOLS[k];
    P.mesh.material.opacity = op;
    P.mesh.visible = on && P.mesh.count>0;
  }
  if(!on) return;
  var cx = CAM.focus.x, cz = CAM.focus.z;   // look-at centered, same no-churn rule as the micro ring
  var dx = cx-_doodadLastX, dz = cz-_doodadLastZ;
  var dayB = Math.floor(simDay/ROUTE_BUCKET_DAYS);
  if(!_doodadBuilt || dx*dx+dz*dz > 64 || dayB!==_doodadLastDayB) rebuildDoodads(cx, cz);
}

/* =====================================================================
   A3: VILLAGE-LIFE CLUTTER — barrels, crates, woodpiles, split-rail
   fences, hitching posts, laundry lines, worn dirt paths, and a small
   wharf-stub with two rowboats at the Montgomery St beach. Anchored to
   a handful of plausible yard spots around the grid (we don't retain
   individual building footprints, since they're merged into one static
   mesh) rather than every lot — "a few," per the brief, not everywhere.
   ===================================================================== */
// PL-B item 4 (grit): laundry lines toggle visible only on the (fill:true)
// weekly wash day, so their presence reads as an active household task
// rather than permanent scenery — hoisted so updateLaundryDay() (called
// from the main animate loop) can reach them.
var laundryRopeMesh = null, laundryClothMesh = null;
function isWashDay(day){ return DOW_NAMES[dateFromSimDay(Math.floor(day)).getUTCDay()]==="Monday"; }
function updateLaundryDay(day){
  var on = isWashDay(day);
  if(laundryClothMesh) laundryClothMesh.visible = on; // the ropes stay up permanently; only the hanging wash appears/disappears
}
(function buildVillageClutter(){
  var clutterAnchors = [
    gridToWorld(GEO.streetsU.montgomery-14, GEO.streetsV.clay+9),
    gridToWorld(GEO.streetsU.montgomery-14, GEO.streetsV.washington-9),
    gridToWorld(GEO.streetsU.kearny+9, GEO.streetsV.clay-13),
    gridToWorld(GEO.streetsU.dupont-9, GEO.streetsV.washington+13),
    gridToWorld(GEO.streetsU.stockton+13, GEO.streetsV.sacramento-9)
  ];

  /* ---- barrels + crates (InstancedMesh, one draw call each) ---- */
  var barrelGeo = new THREE.CylinderGeometry(0.34,0.38,0.62,8);
  var barrelMat = new THREE.MeshPhongMaterial({ color:0x6e5230, flatShading:true, specular:0x000000, shininess:0 });
  var barrelSamples = [];
  var crateGeo = new THREE.BoxGeometry(0.55,0.5,0.55).toNonIndexed();
  var crateMat = new THREE.MeshPhongMaterial({ color:0x8a6f47, flatShading:true, specular:0x000000, shininess:0 });
  var crateSamples = [];
  clutterAnchors.forEach(function(a){
    var nB = 2+Math.floor(rngBuild()*3), nC = 1+Math.floor(rngBuild()*3);
    for(var i=0;i<nB;i++){
      var x=a.x+(rngBuild()-0.5)*9, z=a.z+(rngBuild()-0.5)*9, h=terrainHeight(x,z);
      if(h>1) barrelSamples.push({x:x,z:z,h:h});
    }
    for(i=0;i<nC;i++){
      var x2=a.x+(rngBuild()-0.5)*9, z2=a.z+(rngBuild()-0.5)*9, h2=terrainHeight(x2,z2);
      if(h2>1) crateSamples.push({x:x2,z:z2,h:h2});
    }
  });
  var barrelMesh = buildScatterMesh(barrelGeo, barrelMat, barrelSamples, { minScale:0.85, maxScale:1.15 });
  scene.add(barrelMesh);
  var crateMesh = buildScatterMesh(crateGeo, crateMat, crateSamples, { minScale:0.85, maxScale:1.2 });
  scene.add(crateMesh);

  /* ---- woodpiles (merged log prefab, InstancedMesh) ---- */
  function makeWoodpileGeo(){
    var logs = [], logColor = new THREE.Color(0x5a4632);
    for(var layer=0; layer<3; layer++){
      for(var i=0;i<3;i++){
        var g = new THREE.CylinderGeometry(0.13,0.13,1.1,6).toNonIndexed();
        g.rotateZ(Math.PI/2);
        g.translate((i-1)*0.28, 0.13+layer*0.23, 0);
        logs.push(colorizeUniform(g, logColor));
      }
    }
    return mergeGeoms(logs);
  }
  var woodSamples = [];
  clutterAnchors.forEach(function(a){
    if(rngBuild()<0.7){
      var x=a.x+(rngBuild()-0.5)*10, z=a.z+(rngBuild()-0.5)*10, h=terrainHeight(x,z);
      if(h>1) woodSamples.push({x:x,z:z,h:h});
    }
  });
  var woodMesh = buildScatterMesh(makeWoodpileGeo(), new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, flatShading:true, specular:0x000000, shininess:0 }), woodSamples, { minScale:0.85, maxScale:1.15 });
  scene.add(woodMesh);

  /* ---- split-rail fence segments along a couple of lot lines ---- */
  function makeFenceSegGeo(){
    // FENCE-LINE fix, 2026-07-10: the rail box (width 2.9, already centered
    // on local x=0 by makeBoxLocal) was then translated an EXTRA -1.45 in x,
    // shoving it to span [-2.9,0] instead of [-1.45,1.45] — so it bridged
    // neither post (at ±1.4) properly: the right post stood alone with no
    // rail reaching it, and the rail overshot 1.45 past the left post. That
    // asymmetric post/rail mismatch, repeated and tiled along every fence
    // line, is what read as scattered X/jack shapes instead of a continuous
    // rail line. Fix: no extra x-shift — the rail already spans exactly the
    // gap between the two posts.
    var parts = [], postColor = new THREE.Color(0x5c4a35), railColor = new THREE.Color(0x6b5640);
    [-1.4,1.4].forEach(function(px){
      var post = makeBoxLocal(0.12,0.9,0.12, postColor); post.translate(px,0,0); parts.push(post);
    });
    [0.3,0.6].forEach(function(py){
      var rail = makeBoxLocal(2.9,0.08,0.08, railColor); rail.translate(0,py,0); parts.push(rail);
    });
    return mergeGeoms(parts);
  }
  var fenceGeo = makeFenceSegGeo();
  var fenceMat = new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, flatShading:true, specular:0x000000, shininess:0 });
  var fenceMatrices = [];
  var fenceLines = [
    { p0:gridToWorld(GEO.streetsU.kearny+6, GEO.streetsV.clay-3), p1:gridToWorld(GEO.streetsU.montgomery-6, GEO.streetsV.clay-3) },
    { p0:gridToWorld(GEO.streetsU.dupont+6, GEO.streetsV.sacramento+3), p1:gridToWorld(GEO.streetsU.kearny-6, GEO.streetsV.sacramento+3) }
  ];
  fenceLines.forEach(function(ln){
    var dx=ln.p1.x-ln.p0.x, dz=ln.p1.z-ln.p0.z, len=Math.hypot(dx,dz);
    var segN = Math.max(1, Math.floor(len/2.9));
    // s56 FENCE-YAW FIX (the map-wide "ladder/jack" 90° defect): this
    // prefab's posts+rails run along local X, but atan2(dx,dz) is the
    // local-Z convention (people, corral rails) — it aligned the rail's
    // SHORT axis with the lot line, so every segment stood broadside,
    // reading as rungs perpendicular to the fence run. For an X-aligned
    // prefab the bake yaw is -(world line angle) = atan2(-dz,dx). The
    // ranch corrals build Z-aligned rails and were always correct.
    var yaw = Math.atan2(-dz,dx);
    for(var i=0;i<segN;i++){
      var t=(i+0.5)/segN, fx=ln.p0.x+dx*t, fz=ln.p0.z+dz*t, fh=terrainHeight(fx,fz);
      if(fh<=1) continue;
      fenceMatrices.push({x:fx,z:fz,h:fh,rotY:yaw});
      registerWalkSeg(ln.p0.x+dx*(i/segN), ln.p0.z+dz*(i/segN), ln.p0.x+dx*((i+1)/segN), ln.p0.z+dz*((i+1)/segN)); // s59: rails block walkers
    }
  });
  var fenceMesh = new THREE.InstancedMesh(fenceGeo, fenceMat, Math.max(fenceMatrices.length,1));
  (function(){
    var m4=new THREE.Matrix4();
    if(fenceMatrices.length===0){ m4.compose(new THREE.Vector3(0,-99999,0), new THREE.Quaternion(), new THREE.Vector3(0,0,0)); fenceMesh.setMatrixAt(0,m4); }
    fenceMatrices.forEach(function(f,i){
      var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), f.rotY);
      m4.compose(new THREE.Vector3(f.x,f.h,f.z), q, new THREE.Vector3(1,1,1));
      fenceMesh.setMatrixAt(i,m4);
    });
    fenceMesh.instanceMatrix.needsUpdate = true;
  })();
  scene.add(fenceMesh);

  /* ---- hitching rails near a few plaza-front lots ----
     ODD-PROP FIX: the old version was a single thin vertical post (0.12 wide,
     0.85 tall) with a symmetric crossbar at 0.8 — a lone "T"/cross silhouette
     — repeated 7 times in a full circle around the plaza. At mid distance
     that read as a ring of small standing figures. Rebuilt as a low
     two-post hitching RAIL (horizontal rail slung low between two stout
     posts, like the fence prefab) so the silhouette reads as furniture, and
     placed in a few clumps near lot-front spots rather than a ring around
     open plaza ground. */
  function makeHitchingRailGeo(){
    var c = new THREE.Color(0x4a3c2c);
    var parts = [];
    [-1.0,1.0].forEach(function(px){
      var post = makeBoxLocal(0.16,0.62,0.16, c); post.translate(px,0,0); parts.push(post);
    });
    var rail = makeBoxLocal(2.2,0.09,0.09, c); rail.translate(0,0.55,0); parts.push(rail);
    return mergeGeoms(parts);
  }
  var railMatrices = [];
  clutterAnchors.forEach(function(a){
    if(rngBuild()<0.6){
      var ang = rngBuild()*Math.PI*2;
      var rx=a.x+(rngBuild()-0.5)*7, rz=a.z+(rngBuild()-0.5)*7, rh=terrainHeight(rx,rz);
      if(rh>1) railMatrices.push({x:rx,z:rz,h:rh,rotY:ang});
    }
  });
  // §10.3 support: the seeded roll above can leave as few as one rail —
  // top up to 3 with hash2-jittered plaza-front spots (deterministic, and
  // crucially NOT rngBuild, so the seeded world stream downstream of this
  // block is byte-identical to before this addition).
  for(var ri=0; railMatrices.length<3 && ri<clutterAnchors.length; ri++){
    var ra = clutterAnchors[ri];
    var hx = ra.x + (hash2(ri*7.1, 3.3)-0.5)*8, hz = ra.z + (hash2(ri*2.9, 8.7)-0.5)*8;
    var hh2 = terrainHeight(hx,hz);
    if(hh2>1) railMatrices.push({x:hx, z:hz, h:hh2, rotY: hash2(ri*5.3, 1.9)*Math.PI*2});
  }
  window.HITCHING_RAILS = railMatrices; // read by the §10.3 hitching-post horses (fauna layer)
  if(railMatrices.length>0){
    var railGeo = makeHitchingRailGeo();
    var railMesh = new THREE.InstancedMesh(railGeo, new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, flatShading:true, specular:0x000000, shininess:0 }), railMatrices.length);
    (function(){
      var m4=new THREE.Matrix4();
      railMatrices.forEach(function(r,i){
        var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), r.rotY);
        m4.compose(new THREE.Vector3(r.x,r.h,r.z), q, new THREE.Vector3(1,1,1));
        railMesh.setMatrixAt(i,m4);
      });
      railMesh.instanceMatrix.needsUpdate = true;
    })();
    scene.add(railMesh);
  }

  /* ---- laundry lines: 2-3 sagging ropes + small cloth quads ---- */
  var ropePositions = [], clothGeoms = [];
  var laundryPairs = [
    [clutterAnchors[0], clutterAnchors[1]],
    [clutterAnchors[2], clutterAnchors[3]]
  ];
  var clothPalette = [0xe8e0c8, 0xc9c0a0, 0xb8ccd8, 0xd8b8a0];
  laundryPairs.forEach(function(pair, li){
    var a=pair[0], b=pair[1];
    var dx=b.x-a.x, dz=b.z-a.z, dist=Math.hypot(dx,dz);
    if(dist<3 || dist>26) return;
    var ay = terrainHeight(a.x,a.z)+2.6, by = terrainHeight(b.x,b.z)+2.6;
    var segs = 10, sag = 0.55+rngBuild()*0.3;
    var prev = null;
    for(var i=0;i<=segs;i++){
      var t=i/segs;
      var px=a.x+dx*t, pz=a.z+dz*t;
      var py=lerp(ay,by,t) - Math.sin(Math.PI*t)*sag;
      if(prev) ropePositions.push(prev.x,prev.y,prev.z, px,py,pz);
      prev = {x:px,y:py,z:pz};
      if(i>0 && i<segs && rngBuild()<0.45){
        var clothColor = new THREE.Color(clothPalette[Math.floor(rngBuild()*clothPalette.length)]);
        var cloth = new THREE.PlaneGeometry(0.5,0.6).toNonIndexed();
        cloth.rotateY(Math.atan2(dx,dz));
        cloth.translate(px,py-0.35,pz);
        clothGeoms.push(colorizeUniform(cloth, clothColor));
      }
    }
  });
  if(ropePositions.length>0){
    var ropeGeo = new THREE.BufferGeometry();
    ropeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ropePositions),3));
    laundryRopeMesh = new THREE.LineSegments(ropeGeo, new THREE.LineBasicMaterial({ color:0x3a3226 }));
    scene.add(laundryRopeMesh);
  }
  if(clothGeoms.length>0){
    laundryClothMesh = new THREE.Mesh(mergeGeoms(clothGeoms), new THREE.MeshPhongMaterial({ vertexColors:true, side:THREE.DoubleSide, flatShading:true, specular:0x000000, shininess:0 }));
    scene.add(laundryClothMesh);
  }

  /* ---- worn dirt paths: darker decal strips from yards toward the plaza.
     LEGACY-STREET-MESH fix (2026-07-10): this used to build its own raised
     drapeGroundStrip() box mesh — one of the last survivors of the old
     per-segment street technique the splat rebuild was supposed to fully
     replace. Now just collects the same two endpoints per anchor into
     SPLAT_CLUTTER_PATHS; renderGroundSplat() (GROUND SPLAT-MAP, near the
     terrain build) paints them with the same color/width as before. ---- */
  clutterAnchors.forEach(function(a){
    var toward = { x: lerp(a.x, PLAZA_CENTER.x, 0.32), z: lerp(a.z, PLAZA_CENTER.z, 0.32) };
    SPLAT_CLUTTER_PATHS.push({ x0:a.x, z0:a.z, x1:toward.x, z1:toward.z });
  });
})(); /* SEAM (Great Split, 2026-07-12): buildVillageClutter used to run on through the
   WHARF GROWTH block; that block is closure-independent (verified: it declares every
   local it uses) and belongs to the ships layer (layers-spec.md slot 7 owns wharf deck
   structures) — it now runs as buildWharfGrowth() in layers/ships.js, chunk 30, at the
   exact same point in module order. */

/* @P1850-CHUNK 37 — waterfront life props + the lumber dealer */
/* =====================================================================
   WATERFRONT LIFE — the working beach between the village's Montgomery
   St edge and the true (heightmap) waterline: beached rowboats, cargo
   piles (barrels/crates/sacks), and timber/hide stacks. Candidate spots
   are found per cross-street line by walking east from Montgomery until
   the baked terrain actually goes underwater (same technique buildWharf()
   uses above), so nothing floats or sits submerged even where the beach
   narrows or widens along the cove. Counts scale with the population
   curve via the same growReveal() used for houses/tents (sparse in
   1846-47, crowded by 1849) — three InstancedMeshes total, so the whole
   layer costs 3 draw calls.
   ===================================================================== */
var waterfrontBeachLines = (function(){
  var lines = [];
  var vMin = GEO.streetsV.pacific-50, vMax = GEO.streetsV.california+50;
  var n = 46;
  for(var i=0;i<n;i++){
    var v = lerp(vMin, vMax, (i+0.5)/n);
    var landPt = gridToWorld(GEO.streetsU.montgomery, v);
    var lastLandX = landPt.x, x = landPt.x;
    for(var step=0; step<90; step++){
      x += 3;
      if(terrainHeight(x, landPt.z) < 0) break;
      lastLandX = x;
    }
    if(x-landPt.x < 8) continue; // strip too narrow here to bother
    lines.push({ z:landPt.z, landX:landPt.x, waterX:x });
  }
  return lines;
})();

/* =====================================================================
   THE LUMBER DEALER (behavior-spec.md item 4 — a documented building-
   materials trade): closes catalog-occupations.json's
   missing:lumber_yard_timber_stand gap for woodcutter_woodyard, and gives
   staged construction (below) a real materials source that supply carts
   travel from. Sited on the working beach — lumber arrived by ship, same
   waterfront the timber-stack waterfront-life props already occupy.
   (Placed here, after waterfrontBeachLines is actually assigned, rather
   than up with the other yard objects — it reads that array directly.)
   ===================================================================== */
var LUMBER_YARD_SPOT = (function buildLumberYard(){
  var ln = waterfrontBeachLines[Math.max(0, Math.floor(waterfrontBeachLines.length*0.78))] || null;
  var p = ln ? { x:lerp(ln.landX,ln.waterX,0.4), z:ln.z } : { x:WORKSITE_WHARF ? WORKSITE_WHARF.x : PLAZA_CENTER.x, z:PLAZA_CENTER.z };
  var y = terrainHeight(p.x,p.z);
  registerPlacement(p.x,p.z,7);
  var geoms = [];
  for(var s=0;s<3;s++){
    var stack = makeTimberStackGeo();
    bake(stack, new THREE.Vector3((s-1)*2.6, 0, (s%2)*1.2), s*0.5);
    geoms.push(stack);
  }
  // a simple open lean-to roof over the stacks — posts + gable, no walls
  var postColor = new THREE.Color(0x5a4632), roofColor = new THREE.Color(0x6b5238);
  [[-3.2,-2.2],[3.2,-2.2],[-3.2,2.2],[3.2,2.2]].forEach(function(o){
    var post = makeBoxLocal(0.22,3.0,0.22,postColor); bake(post, new THREE.Vector3(o[0],0,o[1])); geoms.push(post);
  });
  var roof = makeGableRoof(7.2,5.0,0.5,1.0,roofColor); bake(roof, new THREE.Vector3(0,3.0,0)); geoms.push(roof);
  var merged = mergeGeoms(geoms);
  bake(merged, new THREE.Vector3(p.x,y,p.z), 0.15);
  scene.add(new THREE.Mesh(merged, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0})));
  mountSignBoard({x:p.x,z:p.z,y:y,rot:0.15,d:5.0}, "LUMBER YARD", null, 3.3);
  console.log("[verify] Lumber yard at ("+p.x.toFixed(0)+","+p.z.toFixed(0)+")");
  return { key:"lumberyard", label:"the lumber yard", x:p.x, z:p.z, activity:"stationary" };
})();

function beachCandidatePool(count, salt, tNear, tFar){
  var out = [], tries = 0, attempts = count*4;
  while(out.length<count && tries<attempts && waterfrontBeachLines.length>0){
    var i = tries; tries++;
    var lnIdx = Math.floor(hash2(i*2.1+salt, 5.5)*waterfrontBeachLines.length) % waterfrontBeachLines.length;
    var ln = waterfrontBeachLines[lnIdx];
    var t = lerp(tNear, tFar, hash2(i*1.7+salt, 8.8));
    var x = lerp(ln.landX, ln.waterX, t) + (hash2(i*3.3+salt,1.1)-0.5)*4;
    var z = ln.z + (hash2(i*4.4+salt,2.2)-0.5)*8;
    var h = terrainHeight(x,z);
    if(h <= -0.3) continue; // stay dry-ish, never submerged
    out.push({ x:x, z:z, rot: hash2(i*5.5+salt,3.3)*Math.PI*2, priority: hash2(i*6.6+salt,7.7) });
  }
  out.sort(function(a,b){ return a.priority-b.priority; });
  return out;
}
var boatCandidates   = beachCandidatePool(24, 101, 0.35, 0.72);
var cargoCandidates  = beachCandidatePool(76, 203, 0.15, 0.55);
var timberCandidates = beachCandidatePool(12, 307, 0.08, 0.30);

function makeRowboatGeo(){
  // s48 harbor-craft upgrade: pointed bow (diamond prow), gunwale rim,
  // two thwarts — a ship's boat instead of a floating box.
  var hullColor = new THREE.Color(0x5c4530), rimColor = new THREE.Color(0x6e5a3f), thwartColor = new THREE.Color(0x7a6547);
  var hull = makeBoxLocal(1.4,0.55,3.0, hullColor);
  var prow = makeBoxLocal(1.0,0.55,1.0, hullColor); prow.rotateY(Math.PI/4); prow.translate(0,0.275,1.5);
  var rim = makeBoxLocal(1.55,0.14,3.2, rimColor); bake(rim, new THREE.Vector3(0,0.5,-0.05));
  var t1 = makeBoxLocal(1.3,0.08,0.28, thwartColor); bake(t1, new THREE.Vector3(0,0.34,0.5));
  var t2 = makeBoxLocal(1.3,0.08,0.28, thwartColor); bake(t2, new THREE.Vector3(0,0.34,-0.7));
  return mergeGeoms([hull, prow, rim, t1, t2]);
}
/* s48 SCOW / LIGHTER — the harbor workhorse of the storeship era: cargo
   off the anchored fleet crossed the last quarter-mile to the beach in
   flat-bottomed lighters (the lightering economy the wharf was built to
   kill). Flat hull, blunt sloped bow ramp, low freeboard, single
   spritsail mast with the sail stowed along the boom. */
function makeScowGeo(){
  var hullColor = new THREE.Color(0x4f3d2a), rimColor = new THREE.Color(0x62503a),
      mastColor = new THREE.Color(0x453824), canvasColor = new THREE.Color(0x9a8c6e);
  var hull = makeBoxLocal(3.0,0.75,7.6, hullColor);
  var bowRamp = makeBoxLocal(3.0,0.7,1.6, hullColor); bowRamp.rotateX(-0.42); bowRamp.translate(0,0.30,4.1);
  var rim = makeBoxLocal(3.2,0.16,7.8, rimColor); bake(rim, new THREE.Vector3(0,0.68,0));
  var mast = makeBoxLocal(0.2,7.5,0.2, mastColor); bake(mast, new THREE.Vector3(0,0.6,1.6));
  var sprit = makeBoxLocal(0.12,0.12,4.4, mastColor); sprit.rotateX(0.5); sprit.translate(0, 4.4, 1.6-Math.cos(0.5)*2.2);
  var furl = makeBoxLocal(0.34,0.4,3.6, canvasColor); bake(furl, new THREE.Vector3(0,1.5,-0.2));
  var tiller = makeBoxLocal(0.14,0.14,1.4, mastColor); bake(tiller, new THREE.Vector3(0.3,0.75,-3.6));
  return mergeGeoms([hull, bowRamp, rim, mast, sprit, furl, tiller]);
}
function makeCargoPileGeo(){
  var barrelColor = new THREE.Color(0x6e5230), crateColor = new THREE.Color(0x8a6f47), sackColor = new THREE.Color(0x9c8a5e);
  var parts = [];
  var b1 = new THREE.CylinderGeometry(0.34,0.38,0.62,8).toNonIndexed(); b1.translate(-0.4,0.31,0.1); parts.push(colorizeUniform(b1,barrelColor));
  var b2 = new THREE.CylinderGeometry(0.34,0.38,0.62,8).toNonIndexed(); b2.translate(0.15,0.31,-0.35); parts.push(colorizeUniform(b2,barrelColor));
  var c1 = new THREE.BoxGeometry(0.55,0.5,0.55).toNonIndexed(); c1.translate(0.45,0.25,0.45); parts.push(colorizeUniform(c1,crateColor));
  var c2 = new THREE.BoxGeometry(0.5,0.42,0.5).toNonIndexed(); c2.translate(0.45,0.88,0.45); parts.push(colorizeUniform(c2,crateColor));
  var sack = new THREE.BoxGeometry(0.7,0.4,0.5).toNonIndexed(); sack.translate(-0.5,0.2,-0.6); parts.push(colorizeUniform(sack,sackColor));
  return mergeGeoms(parts);
}
function makeTimberStackGeo(){
  var logColor = new THREE.Color(0x4a3c2c), hideColor = new THREE.Color(0x8a7050);
  var parts = [];
  for(var layer=0; layer<2; layer++){
    for(var i=0;i<4;i++){
      var g = new THREE.CylinderGeometry(0.16,0.16,2.6,6).toNonIndexed();
      g.rotateZ(Math.PI/2);
      g.translate((i-1.5)*0.34, 0.16+layer*0.30, -0.9);
      parts.push(colorizeUniform(g, logColor));
    }
  }
  for(var hi=0; hi<3; hi++){
    var hide = new THREE.BoxGeometry(1.1,0.14,0.9).toNonIndexed();
    hide.translate(0.9, 0.1+hi*0.16, 0.8);
    parts.push(colorizeUniform(hide, hideColor));
  }
  return mergeGeoms(parts);
}
var rowboatMesh = new THREE.InstancedMesh(makeRowboatGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), Math.max(boatCandidates.length,1));
rowboatMesh.count = 0; scene.add(rowboatMesh);
var cargoPileMesh = new THREE.InstancedMesh(makeCargoPileGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), Math.max(cargoCandidates.length,1));
cargoPileMesh.count = 0; scene.add(cargoPileMesh);
var timberStackMesh = new THREE.InstancedMesh(makeTimberStackGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), Math.max(timberCandidates.length,1));
timberStackMesh.count = 0; scene.add(timberStackMesh);

/* @P1850-CHUNK 39 — waterfront prop reveal (updateWaterfrontLife) */
var spawnedBoats = [], spawnedCargo = [], spawnedTimber = [];
function waterfrontTargets(pop){
  return {
    boats:  Math.min(2+Math.round(pop/900),  boatCandidates.length),
    cargo:  Math.min(3+Math.round(pop/260),  cargoCandidates.length),
    timber: Math.min(1+Math.round(pop/2200), timberCandidates.length)
  };
}
function updateWaterfrontLife(){
  var pop = densityAt(simDay); // density, not population — see P0 decoupling fix above
  var t = waterfrontTargets(pop);
  growReveal(boatCandidates,   spawnedBoats,  t.boats,  rowboatMesh);
  growReveal(cargoCandidates,  spawnedCargo,  t.cargo,  cargoPileMesh);
  growReveal(timberCandidates, spawnedTimber, t.timber, timberStackMesh);
}

/* @P1850-CHUNK 52 — trees, rock outcrops, chaparral band */
/* =====================================================================
   A2b: TREES, ROCK OUTCROPS & CHAPARRAL BAND — visual-richness pass.
   Historical grounding (research/peninsula-1846.md, geography-shoreline.md):
   coastal dune scrub + coyote-brush chaparral on slopes; coast live oaks
   clustered in sheltered valleys and around Mission Dolores; willows at
   springs/creek lines; scattered laurel/buckeye; serpentine rock outcrops
   on Telegraph/Rincon/Fort Point flanks. 5 new InstancedMesh draw calls
   total (oak, willow, laurel, boulder, chaparral shrub). Placement is
   masked off the village box, the street grid and the Mission Road so
   nothing grows through a building or track.
   ===================================================================== */
(function buildVegetationAndRockOutcrops(){
  var originX = PLAZA_CENTER.x, originZ = PLAZA_CENTER.z;

  function distToSeg(x,z,x0,z0,x1,z1){
    var dx=x1-x0, dz=z1-z0, len2=dx*dx+dz*dz;
    var t = len2>0 ? ((x-x0)*dx+(z-z0)*dz)/len2 : 0;
    t = clamp(t,0,1);
    return Math.hypot(x-(x0+dx*t), z-(z0+dz*t));
  }
  var STREET_SEGS = (function(){
    var uVals=[GEO.streetsU.stockton,GEO.streetsU.dupont,GEO.streetsU.kearny,GEO.streetsU.montgomery];
    var vVals=[GEO.streetsV.pacific,GEO.streetsV.jackson,GEO.streetsV.clay,GEO.streetsV.washington,GEO.streetsV.sacramento,GEO.streetsV.california];
    var vSpan=[vVals[0],vVals[vVals.length-1]], uSpan=[uVals[0],uVals[uVals.length-1]];
    var segs=[];
    uVals.forEach(function(u){ var a=gridToWorld(u,vSpan[0]), b=gridToWorld(u,vSpan[1]); segs.push([a.x,a.z,b.x,b.z]); });
    vVals.forEach(function(v){ var a=gridToWorld(uSpan[0],v), b=gridToWorld(uSpan[1],v); segs.push([a.x,a.z,b.x,b.z]); });
    return segs;
  })();
  function nearStreet(x,z,buffer){
    for(var i=0;i<STREET_SEGS.length;i++){ if(distToSeg(x,z,STREET_SEGS[i][0],STREET_SEGS[i][1],STREET_SEGS[i][2],STREET_SEGS[i][3])<buffer) return true; }
    return false;
  }
  function nearMissionRoad(x,z,buffer){
    for(var i=0;i<MISSION_ROAD_PTS.length-1;i++){
      var a=MISSION_ROAD_PTS[i], b=MISSION_ROAD_PTS[i+1];
      if(distToSeg(x,z,a.x,a.z,b.x,b.z)<buffer) return true;
    }
    return false;
  }
  function clearOfManMade(x,z){ return farFromVillage(x,z,190) && !nearStreet(x,z,16) && !nearMissionRoad(x,z,22); }
  function leeBias(x,z){ var d=14, hE=terrainHeight(x+d,z), hW=terrainHeight(x-d,z); return (hW-hE)/(2*d); }
  function localRelief(x,z){
    var d=18, h0=terrainHeight(x,z), mx=h0, mn=h0;
    [[d,0],[-d,0],[0,d],[0,-d]].forEach(function(o){ var h=terrainHeight(x+o[0],z+o[1]); if(h>mx)mx=h; if(h<mn)mn=h; });
    return mx-mn;
  }

  function makeBlobCluster(n, baseR, spreadXZ, spreadY, colors, yBase){
    var parts=[];
    for(var i=0;i<n;i++){
      var r = baseR*(0.62+rngBuild()*0.6);
      var g = new THREE.IcosahedronGeometry(r,0).toNonIndexed();
      var ang = rngBuild()*Math.PI*2, rad = spreadXZ*Math.sqrt(rngBuild());
      g.translate(Math.cos(ang)*rad, yBase+rngBuild()*spreadY, Math.sin(ang)*rad);
      parts.push(colorizeUniform(g, colors[i%colors.length]));
    }
    return parts;
  }
  // coast live oak — thick short trunk, broad irregular dark-green canopy blob-cluster
  function makeOakGeo(){
    var trunk = makeBoxLocal(0.8,1.7,0.8, new THREE.Color(0x4a3a28)); trunk.rotateY(Math.PI/4);
    var canopy = makeBlobCluster(5, 1.55, 1.35, 0.9, [new THREE.Color(0x3d5a2c),new THREE.Color(0x4c6c37),new THREE.Color(0x345024)], 2.0);
    return mergeGeoms([trunk].concat(canopy));
  }
  // willow — pale drooping clump near water
  function makeWillowGeo(){
    var trunk = makeBoxLocal(0.55,2.1,0.55, new THREE.Color(0x5c5138));
    var canopy = makeBlobCluster(4, 1.5, 1.5, 0.6, [new THREE.Color(0x7c8f56),new THREE.Color(0x8a9c66),new THREE.Color(0x6e8048)], 2.6);
    var fronds=[];
    for(var i=0;i<7;i++){
      var ang=rngBuild()*Math.PI*2, rad=1.1+rngBuild()*0.9;
      var f = new THREE.PlaneGeometry(0.22,1.7).toNonIndexed();
      f.rotateX(-0.25); f.translate(0,-0.7,0); f.rotateY(ang);
      f.translate(Math.cos(ang)*rad, 2.9, Math.sin(ang)*rad);
      fronds.push(colorizeUniform(f, new THREE.Color(0x93a468)));
    }
    return mergeGeoms([trunk].concat(canopy).concat(fronds));
  }
  // laurel/buckeye — small single-crown tree
  function makeLaurelGeo(){
    var trunk = makeBoxLocal(0.4,1.0,0.4, new THREE.Color(0x4a4030));
    var canopy = makeBlobCluster(3, 0.95, 0.7, 0.5, [new THREE.Color(0x4a6a3c),new THREE.Color(0x3f5a32)], 1.3);
    return mergeGeoms([trunk].concat(canopy));
  }
  // boulder — two offset icosahedra for an irregular angular silhouette, grey-green serpentine tint
  function makeBoulderGeo(){
    var a = new THREE.IcosahedronGeometry(1.0,0).toNonIndexed(); a.translate(0,0.7,0);
    var b = new THREE.IcosahedronGeometry(0.68,0).toNonIndexed(); b.translate(0.55,0.55,0.2);
    return mergeGeoms([colorizeUniform(a,new THREE.Color(0x7c8a72)), colorizeUniform(b,new THREE.Color(0x697860))]);
  }
  // chaparral shrub — wider mounded coyote-brush clump vs. the slender scrub cone
  function makeChaparralGeo(){
    return mergeGeoms(makeBlobCluster(3, 0.42, 0.3, 0.22, [new THREE.Color(0x566a37),new THREE.Color(0x4a5c2e),new THREE.Color(0x63763f)], 0.28));
  }
  function propMat(){ return new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, flatShading:true, specular:0x000000, shininess:0 }); }

  // s46: the dune belts are DOCUMENTED treeless ("primarily sand dunes and
  // scrub grasslands, devoid of trees" — peninsula-1846.md §2.4); the baked
  // zones now make that enforceable for every tree species.
  function inDuneZone(x,z){ var zn = zoneAt(x,z); return zn===1 || zn===2; }
  // ---- oaks: valley/lee-slope groves + a denser grove around Mission Dolores ----
  function oakTest(x,z,h){ return h>6 && h<105 && !inDuneZone(x,z) && clearOfManMade(x,z) && localRelief(x,z)<9 && leeBias(x,z)>-0.03; }
  var oakSamples = scatterSample(SCT(1250), originX, originZ, 2500, oakTest);
  function oakMissionTest(x,z,h){
    var dm = Math.hypot(x-OUTPOSTS.mission.x, z-OUTPOSTS.mission.z);
    return h>4 && h<75 && dm>85 && !nearMissionRoad(x,z,20);
  }
  oakSamples = oakSamples.concat(scatterSample(SCT(400), OUTPOSTS.mission.x, OUTPOSTS.mission.z, 520, oakMissionTest));
  // ---- s46 WEST: oak/laurel groves in the documented sheltered Presidio
  // valley pockets (peninsula-geography zones el_polin + lobos_creek_valley,
  // baked zone 4) — Poisson-disk clustered per TECHNIQUES §2 (cluster
  // centers with a blue-noise minimum spacing, trees packed within each). ----
  (function(){
    var centers = [], MINR = 85;
    for(var t=0; t<900 && centers.length<26; t++){
      var x = -7000 + rngBuild()*2700, z = -480 + rngBuild()*1360;
      if(zoneAt(x,z)!==4) continue;
      var ok = true;
      for(var q=0;q<centers.length;q++){ if(Math.hypot(x-centers[q].x, z-centers[q].z)<MINR){ ok=false; break; } }
      if(ok) centers.push({x:x,z:z});
    }
    centers.forEach(function(cc){
      var n = 4 + Math.floor(rngBuild()*5);
      for(var k=0;k<n;k++){
        var a = rngBuild()*Math.PI*2, r = 5 + Math.sqrt(rngBuild())*26;
        var gx = cc.x+Math.cos(a)*r, gz = cc.z+Math.sin(a)*r, gh = terrainHeight(gx,gz);
        if(gh>2 && gh<95) oakSamples.push({x:gx, z:gz, h:gh});
      }
    });
  })();
  var oakMesh = buildScatterMesh(makeOakGeo(), propMat(), oakSamples, { minScale:1.4, maxScale:2.7 });
  tagInspect(oakMesh, "tree", "Coast live oak", "Clustered in sheltered valleys and around Mission Dolores (peninsula-1846.md).");
  scene.add(oakMesh); farScatterMeshes.push(oakMesh);

  // ---- willows: low-lying flat ground (springs/creek proxy) + near the Mission's arroyo ----
  function willowTest(x,z,h){ return h>1 && h<9 && !inDuneZone(x,z) && clearOfManMade(x,z) && localRelief(x,z)<4; }
  var willowSamples = scatterSample(SCT(380), originX, originZ, 2400, willowTest);
  function willowMissionTest(x,z,h){
    var dm = Math.hypot(x-OUTPOSTS.mission.x, z-OUTPOSTS.mission.z);
    return h>2 && h<40 && dm<450 && !nearMissionRoad(x,z,20);
  }
  willowSamples = willowSamples.concat(scatterSample(SCT(160), OUTPOSTS.mission.x, OUTPOSTS.mission.z, 450, willowMissionTest));
  // ---- s46 WEST: riparian willow lines — the Mission Creek corridor
  // (dataset zone 7, Behr's eyewitness willows near the creek mouth),
  // Lobos Creek banks, the lake margins, Washerwoman's Lagoon edge ----
  willowSamples = willowSamples.concat(scatterRect(SCT(80), -1750, 450, 2580, 3060,
    function(x,z,h){ return zoneAt(x,z)===7 && h>0.2 && h<6; }, SCT(80)*16));
  willowSamples = willowSamples.concat(scatterRect(SCT(30), -7250, -4950, -180, 420,
    function(x,z,h){ return h>0.5 && h<26 && zoneAt(x,z)!==1; }, SCT(30)*20)); // Lobos Creek valley floor
  willowSamples = willowSamples.concat(scatterRect(SCT(36), -8600, -6850, 6500, 9200,
    function(x,z,h){ return h>0.3 && h<9; }, SCT(36)*20)); // Lake Merced margin
  willowSamples = willowSamples.concat(scatterSample(SCT(8), -2754, -816, 130,
    function(x,z,h){ return h>0.3 && h<8; })); // Washerwoman's Lagoon edge
  willowSamples = willowSamples.concat(scatterSample(SCT(9), -5700, 700, 160,
    function(x,z,h){ var L=(TERRAIN.geodata.lakes[0]||{}).level||0; return h>L-0.5 && h<L+7; })); // Mountain Lake rim
  var willowMesh = buildScatterMesh(makeWillowGeo(), propMat(), willowSamples, { minScale:1.3, maxScale:2.3 });
  tagInspect(willowMesh, "tree", "Willow", "At springs and creek lines — the low wet ground's marker tree (peninsula-1846.md).");
  scene.add(willowMesh); farScatterMeshes.push(willowMesh);

  // ---- laurel/buckeye: sparse, scattered through the scrub band ----
  function laurelTest(x,z,h){ return h>12 && h<80 && !inDuneZone(x,z) && clearOfManMade(x,z) && localRelief(x,z)<14; }
  var laurelSamples = scatterSample(SCT(700), originX, originZ, 2450, laurelTest);
  var laurelMesh = buildScatterMesh(makeLaurelGeo(), propMat(), laurelSamples, { minScale:1.3, maxScale:2.2 });
  tagInspect(laurelMesh, "tree", "California laurel / buckeye", "Scattered singles through the scrub band (peninsula-1846.md).");
  scene.add(laurelMesh); farScatterMeshes.push(laurelMesh);

  // ---- rock outcrops: clustered groups on Telegraph/Rincon/Fort Point flanks + scattered singles on steep slopes ----
  var boulderClusters = [
    { x:-134,  z:-808,  r:80,  n:20 }, // Telegraph Hill flank
    { x:1076,  z:1118,  r:85,  n:20 }, // Rincon Hill flank
    { x:-4560, z:-480,  r:100, n:18 }  // Fort Point/Presidio flank (nearest verified high ground to the
                                       // Golden Gate batteries — exact Fort Point site isn't in the baked/verified set)
  ];
  var boulderSamples = [];
  boulderClusters.forEach(function(c){
    boulderSamples = boulderSamples.concat(scatterSample(c.n, c.x, c.z, c.r, function(x,z,h){ return h>10 && h<170; }));
  });
  function steepSlopeTest(x,z,h){ return h>16 && h<140 && clearOfManMade(x,z) && Math.abs(leeBias(x,z))>0.28; }
  boulderSamples = boulderSamples.concat(scatterSample(SCT(220), originX, originZ, 2500, steepSlopeTest));
  // ---- s46 WEST: craggy rock on the baked Seal Rocks islets + the Point
  // Lobos headland (the rocky coast the haul-out hangs off) ----
  (TERRAIN.geodata.sealRocks||[]).forEach(function(r){
    boulderSamples = boulderSamples.concat(scatterSample(5, r[0], r[1], 26, function(x,z,h){ return h>0.6; }, 120));
  });
  boulderSamples = boulderSamples.concat(scatterSample(14, -9280, 1150, 300, function(x,z,h){ return h>8 && h<130; }, 300));
  var boulderMesh = buildScatterMesh(makeBoulderGeo(), propMat(), boulderSamples, { minScale:1.6, maxScale:5.5 });
  tagInspect(boulderMesh, "outcrop", "Serpentine outcrop", "Grey-green rock on the Telegraph, Rincon, and Fort Point flanks (peninsula-1846.md).");
  scene.add(boulderMesh); farScatterMeshes.push(boulderMesh);

  // ---- chaparral band: denser coyote-brush clumps on mid slopes (joins the near-fade scatter group) ----
  function chapTest(x,z,h){ return h>16 && h<58 && farFromVillage(x,z,70); }
  var chapSamples = scatterSample(SCT(1400), originX, originZ, 2300, chapTest);
  // s46 WEST: coyote-brush mounds through the dune-scrub belt + grassland edges
  chapSamples = chapSamples.concat(scatterRect(SCT(800), -9200, -1500, -1400, 7500,
    function(x,z,h){ var zn=zoneAt(x,z); return zn===2 && h>3 && h<95; }, SCT(800)*14));
  var chapMesh = buildScatterMesh(makeChaparralGeo(), propMat(), chapSamples, { minScale:0.8, maxScale:1.6 });
  scene.add(chapMesh); scatterMeshes.push(chapMesh);
})();

