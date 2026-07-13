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

/* @P1850-CHUNK 13 — shared placement engine canPlace() */
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
var PLACEMENT_INDEX = []; // {x,z,r,cls} — every accepted footprint, any class, any spawner
/* s67 (#49): generalized to carry an optional class tag so the universal
   engine (canPlaceClass) and the placement audits can attribute a footprint
   to its owner. Backward compatible — every existing registerPlacement(x,z,r)
   caller keeps working (cls just defaults to null). */
function registerPlacement(x,z,r,cls){ PLACEMENT_INDEX.push({x:x,z:z,r:r||3,cls:cls||null}); }

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
   skipSlope, skipOverlap} for spawners with looser/tighter needs.
   s67 (#49): the ORIGINAL positional engine, preserved verbatim as
   canPlaceXZ — 20+ spawners (village/growth buildings, tents, outposts,
   people spawn checks) depend on its boolean contract, and its exact
   rejection set is load-bearing for determinism (identical seed ⇒ identical
   world). The universal law-table engine (canPlaceClass, below) sits ON TOP;
   canPlace() dispatches to whichever the caller asked for. */
function canPlaceXZ(x,z,footprintR,opts){
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

/* =========================================================================
   s67 (#49) THE UNIVERSAL PLACEMENT ENGINE (placement-spec.md v1, Fable
   2026-07-13). One core service, one law table. canPlace() is polymorphic:
     canPlace("tent", {x,z,yaw,footprint}, {day,parentId,anchorId}) -> {ok,reason}
        — the class-keyed law-table path (P1–P14 invariants).
     canPlace(x, z, footprintR, opts)   -> bool
        — the legacy positional path (canPlaceXZ), unchanged for every
          existing caller.
   Reads ONLY core interfaces: terrainHeight, shorelineX, zoneAt, the street
   spine via nearAnyRoad (constant class widths), PLACEMENT_INDEX. Pure in
   (seed, simDay): no camera, no frame state — so a law rejection resamples
   deterministically and worlds stay in sync across identical seeds.
   ========================================================================= */

/* Surface / band predicates (core geography interfaces only). +x is bayward
   (east) in this world, so "east of the traced shoreline" = x > shorelineX(z).
   The 1846–51 cove waterline is shorelineX(z); the intertidal band is east of
   it and at/below the +0.5m high-water line (matches terrain.js's baked tidal
   profile and __P1850.shipAudit's mud classification). */
function terrainSlopePct(x,z){ return Math.tan(terrainSlopeDeg(x,z)*Math.PI/180)*100; }
function inIntertidalBand(x,z){ return x >= shorelineX(z) - 4 && terrainHeight(x,z) <= 0.5; }
function inBeachBand(x,z){ // dry-ish working beach just landward of the waterline (flotsam belongs here)
  var h = terrainHeight(x,z);
  return x >= shorelineX(z) - 30 && h > -0.6 && h <= 1.8;
}

/* LAW_TABLES — per-class placement law, DATA-DRIVEN so a new asset class is a
   table row, not new code (placement-spec §1). Every numeric threshold here is
   a TUNABLE (fill:true — the Atelier knob pass reads this table). Keys map to
   the placement-spec P-laws enforced by canPlaceClass() below and proven by
   __P1850.audits.placement.*.
     surface: "land" | "water" | null   minY: land height floor (m)
     slopeMaxPct: slope cap (%)         intertidalAllowed: may stand in the surf?
     row:false  never in a right-of-way (constant class width)
     rowCenter:false  never in the road CENTER band (looser than row)
     footprint:false / footprintClearM  overlap prohibition vs PLACEMENT_INDEX */
var LAW_TABLES = {
  /* Structures (addressed) — P1 overlap, P2 grounding/slope, P3 intertidal, P4 addressed. */
  structure: { surface:"land", minY:1,   slopeMaxPct:15, groundTolM:0.3, footprintClearM:1.5, intertidalAllowed:false, addressed:true, doorPathMaxM:25 },
  /* Tents — P7: slope ≤12%, never ROW/intertidal/footprint, spacing ≥2.5m
     (spacing is enforced by the caller's canPlaceXZ overlap at r=2.2 ⇒ ≥4.4m
     centre-to-centre; this row adds the slope + intertidal law). */
  tent:      { surface:"land", minY:2,   slopeMaxPct:12, intertidalAllowed:false, row:false, rowMargin:2 },
  /* Fences — P6 (#55, first dedicated consumer). This row supplies the
     POINT-LEVEL laws canPlaceClass checks at each post along a run: on land,
     never in a right-of-way (the f13-90m street-crossing offense), never in
     the intertidal band. The SEGMENT-LEVEL clauses of P6 — endpoints anchor to
     lot corners, segments parallel to lot/street lines, no crossing of another
     fence or a footprint, gate gap at door-paths, and per-post grounding — are
     topological (a point predicate can't express a line crossing) and are
     enforced by the buildings-layer builder's rectangle geometry + exact
     seg/rect crossing tests, then PROVEN by __P1850.audits.placement.fences.
     NOTE: footprintClearM is deliberately ABSENT — a fence rings its own
     parent building's yard (posts sit just outside the footprint), and the
     PLACEMENT_INDEX bounding-circle radius (half-diagonal) would false-reject a
     building's own fence; parent-excluded footprint crossing lives in the
     builder/audit instead. */
  fence:     { surface:"land", minY:1, intertidalAllowed:false, row:false, rowMargin:0 },
  /* Water trades — P3 exempt (they BELONG in the band). */
  storeship: { surface:null, intertidalAllowed:true, mudBand:true },
  ship:      { surface:"water", spacingHullMul:1.5, headingSpreadDeg:30 },   // P13
  wharf:     { surface:null, intertidalAllowed:true, continuous:true },      // P11
  mooring:   { surface:"water", hullAlignDeg:5 },                            // P12
  /* Doodads / props / trees — P8 scatter, P9 props, P10 trees. */
  scatter:   { surface:"land", minY:0.05, water:true, rowCenter:false },
  flotsam:   { intertidalAllowed:true, beachOnly:true },
  prop:      { surface:"land", minY:0.05, volumeClear:true },
  tree:      { surface:"land", minY:1, crownClearM:1.0, riparianOnlyCreek:true },
  sign:      { plane:"wall" },
  /* Fauna — P14. */
  fauna:     { row:false, footprint:false, pastureFloor:0.7 }
};

/* canPlaceClass(cls, pose, ctx) — the law-table path. Returns {ok, reason}.
   Applies only the laws present in the class row (data-driven), reading core
   interfaces exclusively. Determinism: no frame/camera state consulted. */
function canPlaceClass(cls, pose, ctx){
  ctx = ctx||{}; pose = pose||{};
  var law = LAW_TABLES[cls];
  if(!law) return { ok:true, reason:"no-law:"+cls };   // unknown class: engine imposes nothing
  var x = pose.x, z = pose.z, h = terrainHeight(x,z);
  if(law.surface==="land" && h <= (law.minY!=null?law.minY:0.5)) return { ok:false, reason:"not-on-land" };
  if(law.surface==="water" && h > -0.5) return { ok:false, reason:"not-in-water" };
  if(law.intertidalAllowed===false && inIntertidalBand(x,z)) return { ok:false, reason:"intertidal" };
  if(law.beachOnly && !inBeachBand(x,z)) return { ok:false, reason:"off-beach" };
  if(law.water===true && h <= 0) return { ok:false, reason:"on-water" };
  if(law.slopeMaxPct!=null && terrainSlopePct(x,z) > law.slopeMaxPct) return { ok:false, reason:"slope" };
  if(law.row===false && nearAnyRoad(x,z, law.rowMargin||0)) return { ok:false, reason:"row" };
  if(law.rowCenter===false && nearAnyRoad(x,z, 0)) return { ok:false, reason:"row-center" };
  if(law.footprint===false || law.footprintClearM!=null){
    var r = (pose.footprint!=null?pose.footprint:(pose.radius!=null?pose.radius:(law.footprintClearM||0)));
    for(var i=0;i<PLACEMENT_INDEX.length;i++){
      var p = PLACEMENT_INDEX[i], dx=x-p.x, dz=z-p.z, md=r+p.r;
      if(md>0 && dx*dx+dz*dz < md*md) return { ok:false, reason:"overlap" };
    }
  }
  return { ok:true, reason:"ok" };
}

/* Polymorphic front door (placement-spec §1 named signature). */
function canPlace(a,b,c,d){
  if(typeof a === "string") return canPlaceClass(a,b,c);
  return canPlaceXZ(a,b,c,d);
}

