/* =====================================================================
   core/02-scene — renderer/scene/camera objects, geometry merge + scatter helpers, shared placement engine.
   Shared plumbing consumed by every rendering layer.
   GREAT SPLIT (layers-spec.md): this file holds 3 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 03 — renderer / scene / camera objects */
/* =====================================================================
   RENDERER / SCENE / CAMERA
   ===================================================================== */
var canvas = document.getElementById("c");
var renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true, logarithmicDepthBuffer:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, 1, 45000); // far raised for the s46 15km ceiling

scene.fog = new THREE.Fog(0xa89b7c, 800, 4200); // s62 earth palette: haze is earthy-atmospheric, not parchment (was 0xcfc2a0 — the far-ground white wash)

/* @P1850-CHUNK 05 — geometry/merge + shared scatter helpers */
/* =====================================================================
   GEOMETRY / MERGE HELPERS  (no BufferGeometryUtils dependency — manual)
   ===================================================================== */
function colorizeUniform(geo, color){
  var n = geo.attributes.position.count;
  var arr = new Float32Array(n*3);
  for(var i=0;i<n;i++){ arr[i*3]=color.r; arr[i*3+1]=color.g; arr[i*3+2]=color.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(arr,3));
  return geo;
}
function bake(geo, pos, rotY, scale){
  var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rotY||0);
  var m = new THREE.Matrix4().compose(pos, q, scale||new THREE.Vector3(1,1,1));
  geo.applyMatrix4(m);
  return geo;
}
function makeBoxLocal(w,h,d,color){
  var g = new THREE.BoxGeometry(w,h,d).toNonIndexed();
  g.translate(0,h/2,0); // pivot at base center
  return colorizeUniform(g,color);
}
function makeGableRoof(w,d,overhang,ridgeH,color){
  var hw=w/2+overhang, hd=d/2+overhang;
  var A=[-hw,0,-hd], B=[hw,0,-hd], C=[hw,0,hd], D=[-hw,0,hd], R1=[0,ridgeH,-hd], R2=[0,ridgeH,hd];
  var tris = [A,B,R1, D,C,R2, A,R1,D, R1,R2,D, B,C,R2, B,R2,R1];
  var positions = new Float32Array(tris.length*3);
  for(var i=0;i<tris.length;i++){ positions[i*3]=tris[i][0]; positions[i*3+1]=tris[i][1]; positions[i*3+2]=tris[i][2]; }
  var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions,3));
  return colorizeUniform(g,color);
}
function mergeGeoms(list){
  var totalPos=0;
  for(var i=0;i<list.length;i++) totalPos += list[i].attributes.position.array.length;
  var positions = new Float32Array(totalPos);
  var colors = new Float32Array(totalPos);
  var offset=0;
  for(i=0;i<list.length;i++){
    var pa = list[i].attributes.position.array;
    var ca = list[i].attributes.color.array;
    positions.set(pa, offset);
    colors.set(ca, offset);
    offset += pa.length;
  }
  var merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions,3));
  merged.setAttribute("color", new THREE.BufferAttribute(colors,3));
  merged.computeVertexNormals();
  return merged;
}

/* =====================================================================
   SCATTER HELPERS — shared seeded rejection-sampler + InstancedMesh
   builder, used by the ground-detail scatter (scrub/dune-grass/rocks/
   driftwood/kelp/wildflowers) and the village-life clutter (barrels,
   crates, fences, hitching posts). Placement uses rngBuild (seeded) so
   scatter is stable per seed; each biome test reads real terrain height.
   Kept to InstancedMesh (one draw call per prop type, per research: a
   shared geometry+material batches into a single GPU draw regardless of
   instance count) to stay well inside the added-draw-call budget.
   ===================================================================== */
function scatterSample(count, cx, cz, radius, biomeTest, maxAttempts){
  var out = [];
  var tries = 0, cap = maxAttempts || count*8;
  while(out.length<count && tries<cap){
    tries++;
    var ang = rngBuild()*Math.PI*2, r = Math.sqrt(rngBuild())*radius;
    var x = cx + Math.cos(ang)*r, z = cz + Math.sin(ang)*r;
    var h = terrainHeight(x,z);
    if(biomeTest(x,z,h)) out.push({x:x,z:z,h:h});
  }
  return out;
}
function buildScatterMesh(geo, mat, samples, opts){
  opts = opts||{};
  var count = Math.max(samples.length,1);
  var mesh = new THREE.InstancedMesh(geo, mat, count);
  var m4 = new THREE.Matrix4(), q, v = new THREE.Vector3(), s = new THREE.Vector3();
  for(var i=0;i<samples.length;i++){
    var p = samples[i];
    var rotY = rngBuild()*Math.PI*2;
    q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rotY);
    if(opts.tilt){ // lay flat-ish with random tilt (driftwood/kelp on the tideline)
      var tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI/2 + (rngBuild()-0.5)*opts.tilt);
      q.multiply(tiltQ);
    }
    var sc = (opts.minScale||0.7) + rngBuild()*((opts.maxScale||1.3)-(opts.minScale||0.7));
    v.set(p.x, p.h+(opts.yOffset||0), p.z);
    s.set(sc,sc,sc);
    m4.compose(v,q,s);
    mesh.setMatrixAt(i, m4);
    if(opts.colors) mesh.setColorAt(i, opts.colors[Math.floor(rngBuild()*opts.colors.length)]);
  }
  if(samples.length===0){ // degenerate placeholder, scaled to nothing
    m4.compose(new THREE.Vector3(0,-99999,0), new THREE.Quaternion(), new THREE.Vector3(0,0,0));
    mesh.setMatrixAt(0,m4);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if(mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
function farFromVillage(x,z,margin){ return distOutsideBox(x,z,VILLAGE_BOX) > margin; }
/* s46: rejection sampler over an arbitrary rect — the west-peninsula
   ecology zones span kilometers, far beyond scatterSample's radius idiom. */
function scatterRect(count, xMin, xMax, zMin, zMax, biomeTest, maxAttempts){
  var out = [], tries = 0, cap = maxAttempts || count*10;
  while(out.length<count && tries<cap){
    tries++;
    var x = xMin + rngBuild()*(xMax-xMin), z = zMin + rngBuild()*(zMax-zMin);
    var h = terrainHeight(x,z);
    if(biomeTest(x,z,h)) out.push({x:x,z:z,h:h});
  }
  return out;
}

/* LEGACY-STREET-MESH fix (2026-07-10): paintRoadVariation()/
   drapeGroundSegment()/drapeGroundStrip() — the old per-segment raised-box
   street-mesh pipeline (chained ~30m draped boxes with hand-rolled rut/edge
   vertex-color variation) — used to be the entire street/road rendering
   system. The GROUND SPLAT-MAP rebuild below replaced grid streets, their
   fade-out stubs, and the Mission Road with painted canvas decals; the last
   two callers (yard-clutter "worn dirt paths" and the dune-leveling cart
   track) were migrated to SPLAT_CLUTTER_PATHS/SPLAT_LEVELING_CART_PTS
   (see GROUND SPLAT-MAP, renderGroundSplat()) leaving these three functions
   with zero callers. Deleted outright rather than left as dead code —
   grounding.md §9: one street/ground-marking system only, competing logic
   is deleted, not reconciled. */

/* @P1850-CHUNK 11 — shared placement engine canPlace() */
/* =========================================================================
   SHARED PLACEMENT ENGINE — canPlace(x,z,footprintR,opts)  (WORLD-P0 fix
   2026-07-09, AUDIT-2026-07-09.md §7 "Placement Collision Sweep")
   Previously each spawner (village buildings, growth buildings, tents,
   outposts) rejection-sampled independently against its own narrow
   criteria only — no spawner checked the street grid, the Mission Road,
   slope, or any other spawner's already-accepted footprints, which is
   exactly how the audit found buildings straddling streets/intersections.
   This is the one service every spawner now consults before accepting a
   candidate position:
     1. distance to the nearest street/Mission-road centerline >=
        (half-width + margin)
     2. terrain slope <= ~20 degrees, above the water line
     3. bounding-circle overlap against every already-accepted placement
        across ALL classes (buildings, outposts, tents, growth buildings)
   Spawners that accept a candidate MUST call registerPlacement() so later
   spawners see it — this is what actually closes the "class-blind"
   collision gap the audit flagged (buildings not aware of tents, tents
   not aware of outposts, etc).
   ========================================================================= */
var PLACEMENT_INDEX = []; // {x,z,r} — every accepted footprint, any class, any spawner
function registerPlacement(x,z,r){ PLACEMENT_INDEX.push({x:x,z:z,r:r||3}); }

/* s59 MOVEMENT NATURALISM — walkability obstacle registries. Unlike
   PLACEMENT_INDEX (bounding circles, half-diagonal radii — fine for
   spawn rejection, far too fat for pedestrians), these carry the EXACT
   shapes routing/collision needs: oriented rects for buildings (bake-yaw
   convention, same local frame the yard-fence builder uses), circles for
   tents/domes, thin segments for fences/corral rails. Builders whose
   geometry is otherwise thrown away (fences, corrals, outposts) push
   here; the big candidate arrays (VILLAGE_BUILDING_SPOTS, growth, tents)
   are read directly by walkMaskInit() further down. reveal = the simDay
   the obstacle first exists (default: always). */
var WALK_RECTS = [];   // {x,z,rot,hw,hd,reveal}
var WALK_CIRCLES = []; // {x,z,r,reveal}
var WALK_SEGS = [];    // {x0,z0,x1,z1} — thin barriers (halfW ~0.35)
function registerWalkRect(x,z,rot,hw,hd,reveal){ WALK_RECTS.push({x:x,z:z,rot:rot||0,hw:hw,hd:hd,reveal:(reveal==null?-1e9:reveal)}); }
function registerWalkCircle(x,z,r,reveal){ WALK_CIRCLES.push({x:x,z:z,r:r,reveal:(reveal==null?-1e9:reveal)}); }
function registerWalkSeg(x0,z0,x1,z1){ WALK_SEGS.push({x0:x0,z0:z0,x1:x1,z1:z1}); }

function distToSegXZ(x,z,x0,z0,x1,z1){
  var dx=x1-x0, dz=z1-z0, len2=dx*dx+dz*dz;
  var t = len2>0 ? ((x-x0)*dx+(z-z0)*dz)/len2 : 0;
  t = clamp(t,0,1);
  return Math.hypot(x-(x0+dx*t), z-(z0+dz*t));
}
/* STREET-CHECKPOINT RESET (grounding.md §9): the old fixed 10-segment
   cardinal-grid-only list (half-widths guessed at 5/3.5) is DELETED —
   every documented street in STREETS_RUNTIME now contributes its own
   segments at its own documented half-width. Built once, against each
   street's FULLEST known extent (its last/biggest checkpoint — placement
   deliberately treats the network as already fully grown, so early
   buildings never end up standing where a not-yet-surveyed later street
   will run; only the SPLAT PAINTER and LABELS are era-gated, since only
   they need to visibly grow over time). Projected via the same fixed
   gridToWorld() (permanent VIOGET_SKEW) every OTHER placement call in this
   file uses — matching the existing, already-screening-passed convention
   that collision geometry lives in buildings' own fixed frame, not
   whatever angle a street happens to be painted at post-swing (see
   updateGridSwing()'s comment on why buildings "never re-baked" is
   historically correct, not a bug). */
/* s62 BUILDINGS-ON-ROADS FIX (road-master-spec constant-width amendment):
   this list used to be built ONLY in the fixed Vioget frame (-6.5°), but
   streets PAINT at GRID_ROT_BASE (-9.0°) after the Aug-1847 swing — and
   non-swinging (post-O'Farrell) streets paint at -9.0° ALWAYS. The 2.5°
   frame delta is up to ~26m of lateral divergence at the block extremes,
   which is exactly how frontage rows ended up standing on the painted
   roadway. Placement clearance is now the UNION of every frame a street
   ever renders in: swinging streets contribute BOTH frames (the swing
   sweep), non-swinging streets contribute the -9.0° frame they always
   paint at. halfW is the street's CONSTANT surveyed class width — the
   right-of-way is reserved at full width from day one. */
var PLACEMENT_STREET_SEGS = (function(){
  var segs = [];
  STREETS_RUNTIME.forEach(function(s){
    var i1 = s.checkpoints.length ? s.checkpoints[s.checkpoints.length-1].extent[1] : s.polyline.length-1;
    var halfW = s.widthM/2;
    var frames = s.swings ? [{a:VIOGET_SKEW,f:"vioget"}, {a:GRID_ROT_BASE,f:"base"}] : [{a:GRID_ROT_BASE,f:"base"}];
    frames.forEach(function(fr){
      for(var i=0;i<i1;i++){
        var a=gridToWorldAt(s.polyline[i].u, s.polyline[i].v, fr.a), b=gridToWorldAt(s.polyline[i+1].u, s.polyline[i+1].v, fr.a);
        segs.push({x0:a.x,z0:a.z,x1:b.x,z1:b.z,halfW:halfW,frame:fr.f,id:s.id});
      }
    });
  });
  return segs;
})();
/* Rough Mission Road corridor (village edge -> Mission Dolores) for early
   collision purposes; the exact curved path is pathfound/rendered later
   (MISSION_ROAD_PTS, much further down) but this straight-ish 2-segment
   approximation is enough to keep every spawner off its general line. */
var PLACEMENT_MISSION_SEGS = (function(){
  var start = gridToWorld(GEO.streetsU.stockton-40, GEO.streetsV.california+40);
  var mid = { x:(start.x+OUTPOSTS.mission.x)/2 - 220, z:(start.z+OUTPOSTS.mission.z)/2 };
  var end = { x:OUTPOSTS.mission.x, z:OUTPOSTS.mission.z };
  return [
    { x0:start.x, z0:start.z, x1:mid.x, z1:mid.z, halfW:9 },
    { x0:mid.x, z0:mid.z, x1:end.x, z1:end.z, halfW:9 }
  ];
})();
function nearAnyRoad(x,z,margin){
  var i;
  for(i=0;i<PLACEMENT_STREET_SEGS.length;i++){
    var s = PLACEMENT_STREET_SEGS[i];
    if(distToSegXZ(x,z,s.x0,s.z0,s.x1,s.z1) < s.halfW+margin) return true;
  }
  for(i=0;i<PLACEMENT_MISSION_SEGS.length;i++){
    var m = PLACEMENT_MISSION_SEGS[i];
    if(distToSegXZ(x,z,m.x0,m.z0,m.x1,m.z1) < m.halfW+margin) return true;
  }
  return false;
}
function terrainSlopeDeg(x,z){
  var d=6;
  var hE=terrainHeight(x+d,z), hW=terrainHeight(x-d,z), hN=terrainHeight(x,z-d), hS=terrainHeight(x,z+d);
  var dzdx=(hE-hW)/(2*d), dzdz=(hS-hN)/(2*d);
  return Math.atan(Math.sqrt(dzdx*dzdx+dzdz*dzdz))*180/Math.PI;
}
/* footprintR: the candidate's own bounding-circle radius (half its
   longest footprint dimension is a safe estimate). opts: {minY, streetMargin,
   skipSlope, skipOverlap} for spawners with looser/tighter needs. */
function canPlace(x,z,footprintR,opts){
  opts = opts||{};
  var minY = opts.minY!=null ? opts.minY : 1;
  var y = terrainHeight(x,z);
  if(y<=minY) return false;
  if(!opts.skipSlope && terrainSlopeDeg(x,z) > 20) return false;
  if(!opts.skipStreet){
    var margin = opts.streetMargin!=null ? opts.streetMargin : 3;
    if(nearAnyRoad(x,z,footprintR+margin)) return false;
  }
  if(!opts.skipOverlap){
    for(var i=0;i<PLACEMENT_INDEX.length;i++){
      var p = PLACEMENT_INDEX[i];
      var dx=x-p.x, dz=z-p.z, minDist=footprintR+p.r;
      if(dx*dx+dz*dz < minDist*minDist) return false;
    }
  }
  return true;
}

