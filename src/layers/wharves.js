/* =====================================================================
   LAYER wharves (slot 3b, s98 WHARF REPRESENTATION — 7b: THE 3D PLACEHOLDER
   BLOCKS). OWNS: the visible 3D massing of every AUTHORED wharf — each pier
   spine member rendered as a NEUTRAL placeholder PRISM from the seabed (the
   terrain surface under the water along the deck) up to a deck freeboard above
   the waterline, at the pier's ACTIVE extent per date (so the block BUILDS OUT
   over sim time as its checkpoints fire). Same placeholder philosophy as the
   buildings Option-B volumes (neutral, clearly-not-final, reads as a diagram),
   a hair COOLER in tone so a wharf ≠ a building at a glance.

   THE RULING (pier-system-spec §6-§7, 2026-07-15): wharves are AUTHORED
   road-building hybrids, HANDCRAFTED not simulated. This layer changes only how
   the already-authored wharves are REPRESENTED — it adds ZERO simulation, no
   lifecycle transitions, no ship code. The geometry is a PURE function of the
   pier spine + the queried day + the one canonical −9.0° frame (rewind-exact),
   read from the cadastre's own deck surface (pierEdgesAt / pierDeckQuad,
   core/08-cadastre) — no forked frame math, no re-derived alignment.

   READS: PIERS_RUNTIME (core/01-geography), pierEdgesAt / pierActiveCheckpoint
   (core/08-cadastre), terrainHeight (core/01-geography, the seabed sampler), the
   sim clock (simDay). NEVER moves a centerline / checkpoint / edge, paints
   ground, or decides where a wharf goes (all authored data upstream).

   RELATION TO s84/s97: the flat plank ground-paint (ground-paint.js pier branch)
   stays as the FAINT on-water FOOTPRINT beneath the block — the 3D block is now
   the primary wharf visual, rising above the water the paint sits on. The deck
   EDGES (pierEdges, the mooring/ship-exclusion line) and the s97 walk-graph are
   untouched — this layer only draws massing over them.

   GREAT SPLIT: this file holds 1 chunk (17) — it lands after buildings (16) and
   before labels (40), the wharf draw slot.
   ===================================================================== */
/* @P1850-CHUNK 17 — wharves: the 3D placeholder blocks (seabed→deck prism at the active extent) */

/* ---- RELEASE DEFAULT: wharf blocks ON in the release build (they are authored
   structures, shown like the landmark volumes). The atelier toggle overrides at
   runtime (dev only). ---- */
var WHARF_ON_AT_RELEASE = true;

/* =====================================================================
   THE PLACEHOLDER PALETTE (Option-B discipline, buildings.js LM_PLACEHOLDER).
   One neutral material world — a light COOL grey deck over a darker cool-grey
   substructure — deliberately a hair off the buildings' (warmer) neutral so a
   wharf reads as NOT a building at a glance. No grain, no timber art: that is
   the deferred per-wharf graphics program (spec §7 forward). ===== */
var WHARF_DECK_COL = new THREE.Color(0x9aa2a4);   // deck top — cool neutral grey (buildings body is warmer 0x9ea19c)
var WHARF_WALL_COL = new THREE.Color(0x7d8587);   // substructure walls — a shade darker, still neutral

/* GEOMETRY CONSTANTS (fill:true — period-plausible deck freeboard). The mean
   waterline sits at y=0 (the bay water plane; tide sweeps ±0.35 m, terrain.js
   TIDE). The deck is a FLAT horizontal surface at WHARF_DECK_Y above the
   waterline (~2 m, inside the 1.5–2.5 m brief band), auto-RAISED per-wharf to
   clear the highest ground under it (WHARF_DECK_CLEARANCE) so a wharf whose
   landward end meets high beach/bank still shows its deck above the surface. The
   block base drops WHARF_FOOTING below the sampled seabed so the prism is
   unambiguously GROUNDED on the water's floor.

   SEABED SOURCE = sampleTerrainGrid (the RAW baked 1846 bathymetry), NOT
   terrainHeight: terrainHeight blends a walkable village PAD up over the near-
   shore band (its own WATERLINE-FIX comment calls that a fiction the real
   shoreline overrides), which would put a wharf's landward floor metres in the
   air. The wharf's seabed is the true cove floor the raw bake carries — the same
   underwater relief the storeships sit in. */
var WHARF_WATER_Y        = 0.0;
var WHARF_DECK_FREEBOARD = 2.0;                                  // flat deck height above mean waterline (m)
var WHARF_DECK_Y         = WHARF_WATER_Y + WHARF_DECK_FREEBOARD; // baseline world y of the deck surface (raised per-wharf if the ground is higher)
var WHARF_DECK_CLEARANCE = 0.6;                                  // min deck clearance over the highest seabed vertex under a wharf
var WHARF_FOOTING        = 0.4;                                  // base sinks this far below the seabed (grounded)
function wharfSeabed(x, z){ return sampleTerrainGrid(x, z); }    // raw bathymetry = the water's floor

/* =====================================================================
   THE DERIVED SET (pure function of `day`) — the ONE source read by BOTH the
   renderer and every audit (measurement law: the instrument reads the numbers
   the picture draws). For each pier with an ACTIVE deck at `day`, the block is
   the deck ring (pierEdgesAt: centreline ± width/2, the cadastre's own geometry)
   raised to WHARF_DECK_Y and dropped to the sampled seabed at every deck vertex.
   Piers still reaching (no decked checkpoint) or not yet born are absent — the
   block appears and lengthens exactly with the authored checkpoints. ZERO dice.
   ===================================================================== */
function deriveWharfSet(day){
  var out = [];
  var piers = (typeof PIERS_RUNTIME !== "undefined") ? PIERS_RUNTIME : [];
  for(var i = 0; i < piers.length; i++){
    var p = piers[i];
    var active = pierActiveCheckpoint(p, day);                  // null ⇒ absent/reaching (no deck yet)
    if(!active) continue;
    var e = pierEdgesAt(p, day);
    if(!e || !e.active || !e.leftEdge.length || !e.rightEdge.length) continue;
    var L = e.leftEdge, R = e.rightEdge, n = L.length;
    // per-vertex seabed (the raw cove floor under the deck) — for the base + the
    // flat deck height (raised to clear the highest floor vertex).
    var seabedL = new Array(n), seabedR = new Array(n), minSeabed = Infinity, maxSeabed = -Infinity;
    for(var k = 0; k < n; k++){
      var sL = wharfSeabed(L[k].x, L[k].z), sR = wharfSeabed(R[k].x, R[k].z);
      seabedL[k] = sL; seabedR[k] = sR;
      minSeabed = Math.min(minSeabed, sL, sR); maxSeabed = Math.max(maxSeabed, sL, sR);
    }
    var topY = Math.max(WHARF_DECK_Y, maxSeabed + WHARF_DECK_CLEARANCE);   // flat deck, above water and above any ground under it
    // s99 RIDER — a single FLAT base at the DEEPEST sampled seabed under the block
    // (minus the footing). A per-vertex base only touches the floor AT each sample;
    // between coarsely-sampled polyline vertices, over a seabed that dips into deep
    // water, the straight wall-bottom chord would FLOAT above the floor. A flat base
    // at (minSeabed - footing) sits at or below the seabed CONTINUOUSLY — no floating
    // gap anywhere — and stays grounded at every vertex (base ≤ local seabed), so
    // wharfBlockGrounded's per-vertex base-below-seabed check still holds.
    var baseFloorY = minSeabed - WHARF_FOOTING;
    var baseL = new Array(n), baseR = new Array(n);
    for(var m2 = 0; m2 < n; m2++){ baseL[m2] = baseFloorY; baseR[m2] = baseFloorY; }
    out.push({ id: p.id, lengthFt: e.lengthFt, extent: active.extent,
               leftEdge: L, rightEdge: R, seabedL: seabedL, seabedR: seabedR, baseL: baseL, baseR: baseR,
               topY: topY, minSeabed: minSeabed, maxSeabed: maxSeabed, overWater: minSeabed < WHARF_WATER_Y,
               outerEnd: e.outerEnd, innerEnd: e.innerEnd });
  }
  out.sort(function(a, b){ return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); }); // stable order (determinism fingerprint)
  return out;
}

/* =====================================================================
   THE RENDERER. WHARF_GROUP holds one Mesh per active wharf, rebuilt when the
   integer sim day changes (labels'/buildings' _lastDay pattern). Between
   rebuilds the set is static — a wharf lengthens only at a checkpoint, which is
   an integer-day threshold. Flat-shaded double-sided material so the hand-built
   prism lights correctly from any winding without a normal pass. ===== */
var WHARF_GROUP = new THREE.Group(); WHARF_GROUP.frustumCulled = false; WHARF_GROUP.visible = WHARF_ON_AT_RELEASE; scene.add(WHARF_GROUP);
var WHARF_MAT = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, specular: 0x000000, shininess: 0 });
var _wharfLastDay = null;

/* push one triangle (3 verts) with a uniform colour into the position/colour
   arrays. flatShading derives the face normal, so no normal attribute is fed. */
function wharfPushTri(pos, col, a, b, c, color){
  pos.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]);
  for(var i = 0; i < 3; i++) col.push(color.r, color.g, color.b);
}
function wharfBuildMesh(e){
  var L = e.leftEdge, R = e.rightEdge, bL = e.baseL, bR = e.baseR, n = L.length, top = e.topY;
  var pos = [], col = [];
  // TOP DECK CAP — a quad strip between the left and right deck edges at deck y.
  for(var k = 0; k < n - 1; k++){
    var l0 = [L[k].x, top, L[k].z],   l1 = [L[k+1].x, top, L[k+1].z];
    var r0 = [R[k].x, top, R[k].z],   r1 = [R[k+1].x, top, R[k+1].z];
    wharfPushTri(pos, col, l0, l1, r1, WHARF_DECK_COL);
    wharfPushTri(pos, col, l0, r1, r0, WHARF_DECK_COL);
  }
  // SIDE WALLS — walk the closed deck perimeter (left edge out, right edge back);
  // each segment is a wall from the sampled seabed base up to the deck. The two
  // end caps (outer bay end, inner shore end) fall out of the ring automatically.
  var ring = [], baseY = [];
  for(var a = 0; a < n; a++){ ring.push(L[a]); baseY.push(bL[a]); }
  for(var b = n - 1; b >= 0; b--){ ring.push(R[b]); baseY.push(bR[b]); }
  for(var i = 0; i < ring.length; i++){
    var j = (i + 1) % ring.length;
    var p = ring[i], q = ring[j], py = baseY[i], qy = baseY[j];
    var pB = [p.x, py, p.z], qB = [q.x, qy, q.z], qT = [q.x, top, q.z], pT = [p.x, top, p.z];
    wharfPushTri(pos, col, pB, qB, qT, WHARF_WALL_COL);
    wharfPushTri(pos, col, pB, qT, pT, WHARF_WALL_COL);
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color",    new THREE.Float32BufferAttribute(col, 3));
  var mesh = new THREE.Mesh(geo, WHARF_MAT);
  mesh.frustumCulled = false;
  mesh.userData.wharfId = e.id;
  mesh.userData.lengthFt = e.lengthFt;
  return mesh;
}
function wharfClear(){
  for(var i = WHARF_GROUP.children.length - 1; i >= 0; i--){
    var o = WHARF_GROUP.children[i]; WHARF_GROUP.remove(o); if(o.geometry) o.geometry.dispose();
  }
}
function rebuildWharves(){
  wharfClear();
  var set = deriveWharfSet(simDay);
  for(var i = 0; i < set.length; i++) WHARF_GROUP.add(wharfBuildMesh(set[i]));
  _wharfLastDay = Math.floor(simDay);
}
function updateWharves(){
  if(!WHARF_GROUP.visible){ return; }
  if(Math.floor(simDay) !== _wharfLastDay) rebuildWharves();
}
rebuildWharves();

/* per-frame hook — mirror buildings/labels' renderer.render wrap. Composes with
   the other layer wraps (each calls its predecessor). Do NOT touch core/07-main's
   frozen render loop. */
var _wharfPrevRender = renderer.render.bind(renderer);
renderer.render = function(s, c){
  try { updateWharves(); } catch(e){ if(!updateWharves._warned){ console.warn("[wharves] update failed", e); updateWharves._warned = true; } }
  _wharfPrevRender(s, c);
};

/* dev-tooling interface (layers-spec §15) — the atelier's layer toggle. */
registerLayerVisibility("wharves", function(v){ WHARF_GROUP.visible = v; if(v){ _wharfLastDay = null; updateWharves(); } });

/* =====================================================================
   THE s98 AUDITS (acceptance-gate discipline). Registered under
   __P1850_AUDITS.spine.* alongside the s97 pier family; each is a
   FRAMING-INDEPENDENT pure function of the derived set / pier data (never the
   camera), returning { pass, ...detail }. When no wharf has an active deck at
   `day` (e.g. 1846, before Broadway) they pass with wharves:0 and a note — an
   honest absence, not an audit-level skip. ===================================================================== */
(function registerWharfAudits(){
  function livePiers(){ return (typeof PIERS_RUNTIME !== "undefined") ? PIERS_RUNTIME : []; }

  /* spine.wharfBlockExtent — the 3D block's seaward extent EQUALS the active
     checkpoint at the current date (matches spine.pierBuildoutMonotonic). The
     block is built from pierEdgesAt at the active extent, so its lengthFt and its
     outer-end deck vertex must equal pierActiveCheckpoint's — proving the block
     BUILDS OUT with the authored checkpoints (Broadway 180 ft from 1847; Central
     reaching → 300 ft @ 1849-08-31 → 800 ft @ fall-1849). */
  registerAudit("spine", "wharfBlockExtent", function(){
    var out = { pass: true, wharves: 0, violations: [], detail: [] };
    var set = deriveWharfSet(simDay), byId = {}; set.forEach(function(e){ byId[e.id] = e; });
    livePiers().forEach(function(p){
      var active = pierActiveCheckpoint(p, simDay), e = byId[p.id];
      if(!active){ if(e) out.violations.push({ id: p.id, reason: "block-present-but-no-checkpoint" }); return; }
      out.wharves++;
      var d = { id: p.id, activeLengthFt: active.lengthFt };
      if(!e){ out.violations.push({ id: p.id, reason: "checkpoint-active-but-no-block" }); out.detail.push(d); return; }
      if(e.lengthFt !== active.lengthFt) out.violations.push({ id: p.id, reason: "block-length-mismatch", block: e.lengthFt, active: active.lengthFt });
      if(e.extent[1] !== active.extent[1]) out.violations.push({ id: p.id, reason: "block-extent-mismatch", block: e.extent, active: active.extent });
      // the block's outer deck vertex is the active extent's outer polyline vertex (canonical frame)
      var outer = gridToWorld(p.polyline[active.extent[1]].u, p.polyline[active.extent[1]].v);
      var dOuter = Math.hypot(e.outerEnd.x - outer.x, e.outerEnd.z - outer.z);
      d.outerEndErr_m = +dOuter.toFixed(4); d.blockLengthFt = e.lengthFt;
      if(dOuter > 0.05) out.violations.push({ id: p.id, reason: "block-outer-end-off-extent", errM: d.outerEndErr_m });
      out.detail.push(d);
    });
    out.pass = out.violations.length === 0;
    if(!out.wharves && !out.violations.length) out.note = "no wharf has an active deck at this date";
    return out;
  });

  /* spine.wharfBlockGrounded — the block is a solid prism resting on the water's
     floor with a deck above the surface: (1) its base is at or below the sampled
     seabed at EVERY deck vertex (grounded, not floating); (2) its flat deck top
     clears the high-tide waterline (visible above water); (3) the deck clears the
     highest seabed vertex under it (not buried in the bank); (4) the prism is
     non-degenerate (top strictly above base everywhere). `overWater` is reported
     per wharf — a documented-inland authored wharf (Broadway, per the pre-existing
     pier polyline) still grounds correctly on the bank; the honest gap is flagged
     in the report, not fixed by this REPRESENTATION sprint. */
  registerAudit("spine", "wharfBlockGrounded", function(){
    var out = { pass: true, wharves: 0, overWater: 0, violations: [], detail: [] };
    var TIDE_HIGH = 0.35;                                        // terrain.js TIDE.amp — deck must clear the highest waterline
    var set = deriveWharfSet(simDay);
    set.forEach(function(e){
      out.wharves++; if(e.overWater) out.overWater++;
      var d = { id: e.id, topY: +e.topY.toFixed(2), minSeabed_m: +e.minSeabed.toFixed(2), maxSeabed_m: +e.maxSeabed.toFixed(2), overWater: e.overWater };
      // (1) base at every vertex is at or below the seabed (base = seabed - footing)
      var maxBaseAboveSeabed = 0, minSlab = Infinity;
      for(var k = 0; k < e.leftEdge.length; k++){
        maxBaseAboveSeabed = Math.max(maxBaseAboveSeabed, e.baseL[k] - e.seabedL[k], e.baseR[k] - e.seabedR[k]);
        minSlab = Math.min(minSlab, e.topY - e.baseL[k], e.topY - e.baseR[k]);
      }
      d.maxBaseAboveSeabed_m = +maxBaseAboveSeabed.toFixed(4); d.minSlab_m = +minSlab.toFixed(3);
      if(maxBaseAboveSeabed > 1e-6) out.violations.push({ id: e.id, reason: "base-above-seabed", m: d.maxBaseAboveSeabed_m });
      // (2) deck top clears the high-tide waterline (visible above water)
      if(e.topY <= TIDE_HIGH) out.violations.push({ id: e.id, reason: "deck-below-waterline", topY: d.topY, tideHigh: TIDE_HIGH });
      // (3) deck clears the highest seabed vertex under the block (not buried)
      if(e.topY <= e.maxSeabed) out.violations.push({ id: e.id, reason: "deck-below-ground", topY: d.topY, maxSeabed: d.maxSeabed_m });
      // (4) non-degenerate solid (top strictly above base everywhere)
      if(minSlab <= 0) out.violations.push({ id: e.id, reason: "degenerate-prism", minSlab: d.minSlab_m });
      out.detail.push(d);
    });
    out.pass = out.violations.length === 0;
    if(!out.wharves) out.note = "no wharf has an active deck at this date";
    return out;
  });

  /* spine.wharfBlockDeterminism — the block geometry is a pure function of (day +
     pier data + the one −9.0° frame): two derives at one day are byte-identical,
     and A→B→A rewinds exact. Zero dice / clock / stale frame, so exact by
     construction (companion to buildings.reservationDeterminism). */
  registerAudit("spine", "wharfBlockDeterminism", function(){
    function fp(day){
      return deriveWharfSet(day).map(function(e){
        return e.id + "|" + e.lengthFt + "|" + e.topY.toFixed(4) + "|" + e.minSeabed.toFixed(4) + "|" +
               e.maxSeabed.toFixed(4) + "|" + e.outerEnd.x.toFixed(4) + "|" + e.outerEnd.z.toFixed(4);
      }).join("\n");
    }
    var A = eventDateToSimDay("1849-09-15"), B = eventDateToSimDay("1849-12-20");
    var a1 = fp(A), a2 = fp(A), bJump = fp(B), aBack = fp(A);
    var sameDayIdentical = (a1 === a2), rewindExact = (a1 === aBack);
    return { pass: sameDayIdentical && rewindExact, sameDayIdentical: sameDayIdentical, rewindExact: rewindExact,
             countA: a1.split("\n").filter(Boolean).length, countB: bJump.split("\n").filter(Boolean).length };
  });
})();

/* =====================================================================
   s110a TERRAIN-EDGE GROUNDING AUDITS (terrain-edge-grounding-spec §1/§2/§3),
   spine family alongside the pier audits above. PHASE 1 — REPORT-ONLY: each
   audit COMPUTES the real violation counts + locations against the raw
   authored data and carries them in `detail`, but returns pass:true so it does
   NOT redden the noon gate while the operator sees the scope. Phase 2 flips
   them to GATING (after the clamp/re-anchor lands). Every audit is a
   framing-independent pure function of (simDay + authored spine + dated
   terrain) via the core dry-land predicate — rewind-exact. ===== */
(function registerEdgeGroundingAudits(){
  var STEEP_SUSPECT = 0.315;   // 31.5% — SF's period-typical steepest (Filbert St)
  var STEEP_FAIL    = 0.41;    // 41% — Bradford above Tompkins, the single real-world outlier
  var FOOT_SETBACK_M = 2.4;    // ~8 ft inland of the dry-land edge (operator-set within the 5-10 ft band)
  /* roadGrade allow-list (s110c). A road here does not fail the gate, but its
     grade is STILL measured + reported — the fail is acknowledged, not silenced.
     Reserved for a segment crossing REAL terrain too steep for a walkable street
     (needs a terrain grading pass — out of scope for a road-side fix). */
  var GRADE_ALLOWLIST = {
    "numbered-streets-first-eighth:First": "First St descends Rincon Hill's real ~45-59% face to Mission Bay (sustained in the terrain, not a coarse-bake spike — grade-easing the spine cannot lawfully flatten a genuine hill this steep). The historical fix was the Second-Street cut; that is a terrain grading pass, out of scope here."
  };

  function liveStreets(){ return (typeof STREETS_RUNTIME !== "undefined") ? STREETS_RUNTIME : []; }
  function livePiers(){ return (typeof PIERS_RUNTIME !== "undefined") ? PIERS_RUNTIME : []; }
  // the street's active-extent (u,v) slice at `day` (largest checkpoint whose
  // date has arrived) — the actual drawn road, era-gated like the paint/spine.
  function activeStreetRoad(s, day){
    var active=null;
    for(var ci=0; ci<s.checkpoints.length; ci++){ if(s.checkpoints[ci].day<=day) active=s.checkpoints[ci]; }
    if(!active) return null;
    return { id:s.id, name:s.name, cls:s.cls, widthM:s.widthM,
             polyline:s.polyline.slice(active.extent[0], active.extent[1]+1) };
  }

  /* spine.roadGrounded — GATING (s110b Phase 2a). A road (spine centerline + its
     draped paint) must rest on dry land or on a grounded structure; it may NEVER
     float off the terrain edge over open water. Measured on the BUILT road — the
     CLAMPED drawn extent that ground-paint now renders (roadDrawnExtentAt.clamped,
     the same source the paint reads) — not the raw authored polyline. The clamp
     trims each road's seaward overhang back to the coast (the dry-land edge / a
     grounded wharf deck), so the built road's seaward terminus is grounded and no
     built sample hangs over open water; this audit confirms that property holds.
     An interior swale sample (grounded terrain that dips below the high-tide
     freeboard but is still land at mean tide, inland of the coast) is NOT a
     floater and is not flagged — only a sample over genuine open water (isLandAt
     false) with no deck under it is. The authored overhang the clamp removed is
     reported for scope; the wholly-seaward (never reaches dry land) roads build
     nothing (the survey plat still draws their line over the water). */
  registerAudit("spine", "roadGrounded", function(){
    var out = { pass:true, gating:true, roadsChecked:0, builtRoads:0,
                floatingBuiltRoads:0, floatingBuiltRoadIds:[], floatingBuiltSamples:0,
                authoredOverhangRoads:0, authoredOverhangSamples:0, fullyOverWater:0, detail:[] };
    liveStreets().forEach(function(s){
      var road = activeStreetRoad(s, simDay); if(!road || road.polyline.length<2) return;
      out.roadsChecked++;
      var ext = roadDrawnExtentAt(road, simDay);
      if(ext.trimmedAt){ out.authoredOverhangRoads++; out.authoredOverhangSamples += (ext.raw.length - ext.clamped.length); }
      if(!ext.clamped.length){ out.fullyOverWater++; return; }   // never reaches dry land — nothing built; the plat shows the survey line
      out.builtRoads++;
      // The FLOATING defect is a road that runs OUT past the coast and terminates
      // over the void. The clamp trims that seaward overhang, so both ENDS of the
      // built extent sit on grounded terrain (dry land, or a wharf deck at a
      // road->wharf junction). Interior water samples along a shoreline street
      // (Sansome/Battery thread the irregular 1849 waterline) are NOT floaters:
      // the paint wet-skips them (no dirt is stroked over the tideflat) and the
      // survey plat carries the line — so this gate reads the drawn extent's
      // SEAWARD TERMINI, not every sample. A terminus over open water (isLandAt
      // false) with nothing under it is the true overhang.
      var ends = [ext.clamped[0], ext.clamped[ext.clamped.length-1]], floatEnd = null;
      for(var e=0;e<ends.length && !floatEnd;e++){
        var p = ends[e];
        if(isDryLand(p.x, p.z, simDay) || _overActivePierDeck(p.x, p.z, simDay)) continue;  // grounded terminus (dry land or wharf deck)
        if(isLandAt(p.x, p.z, simDay)) continue;                                             // marginal but real ground at mean tide — not the void
        floatEnd = { x:+p.x.toFixed(1), z:+p.z.toFixed(1) };                                 // terminus hangs over open water — a floater
      }
      if(floatEnd){
        out.pass=false; out.floatingBuiltRoads++; out.floatingBuiltRoadIds.push(road.id);
        out.floatingBuiltSamples++;
        if(out.detail.length<40) out.detail.push({ id:road.id, name:road.name, floatEnd:floatEnd });
      }
    });
    out.note = "GATING (Phase 2a): "+out.floatingBuiltRoads+" of "+out.builtRoads+" built roads float over open water; the clamp trimmed "
             + out.authoredOverhangRoads+" authored overhangs ("+out.authoredOverhangSamples+" samples), "+out.fullyOverWater+" roads are wholly seaward (plat-only, unbuilt).";
    return out;
  });

  /* spine.roadGrade — GATING (s110c Phase 2b). A road is always walkable: per
     grounded (clamped) segment the grade stays under SF's real-world ceiling.
     suspect > 31.5% (steeper than any period street, reported but LEGAL — SF has
     streets this steep), FAIL > 41% (steeper than Bradford, the single real-world
     outlier — no street ever existed steeper). Graded on the CLAMPED, GRADE-EASED
     extent (roadDrawnExtentAt.clamped — the same drawn spine ground-paint renders
     and roadGrounded reads); the coast/cliff drop past the edge is roadGrounded's
     concern, not grade. The Phase-1 counts (Montgomery 67 %, Clay 43 %, Presidio
     49 %) were coarse-bake quantization aliased into single 15 m drape segments;
     the spine grade-ease (§2) collapses them to their real macro-grades, all
     under the cap. The gate fails on any >41 % segment OUTSIDE the allow-list;
     allow-listed roads (real terrain too steep for a walkable street — a terrain
     grading pass, out of scope) are still measured + reported, never silenced. */
  registerAudit("spine", "roadGrade", function(){
    var out = { pass:true, gating:true, roadsChecked:0, segments:0, suspectSegments:0,
                failSegments:0, unlistedFailSegments:0, allowlistedRoads:0, worstGradePct:0, detail:[] };
    liveStreets().forEach(function(s){
      var road = activeStreetRoad(s, simDay); if(!road || road.polyline.length<2) return;
      out.roadsChecked++;
      var pts = roadDrawnExtentAt(road, simDay).clamped;
      var allowed = !!GRADE_ALLOWLIST[road.id];
      var sSuspect=0, sFail=0, worst=0, worstAt=null;
      for(var k=0;k<pts.length-1;k++){
        var a=pts[k], b=pts[k+1], run=Math.hypot(b.x-a.x, b.z-a.z);
        if(run<1e-3) continue;
        out.segments++;
        var grade = Math.abs(b.y-a.y)/run;
        if(grade>worst){ worst=grade; worstAt={ x:+((a.x+b.x)/2).toFixed(1), z:+((a.z+b.z)/2).toFixed(1) }; }
        if(grade>STEEP_FAIL) sFail++; else if(grade>STEEP_SUSPECT) sSuspect++;
      }
      out.suspectSegments+=sSuspect; out.failSegments+=sFail;
      if(allowed && sFail){ out.allowlistedRoads++; } else { out.unlistedFailSegments+=sFail; }
      if(worst>out.worstGradePct/100) out.worstGradePct=+(worst*100).toFixed(1);
      if((sSuspect||sFail) && out.detail.length<40)
        out.detail.push({ id:road.id, name:road.name, suspect:sSuspect, fail:sFail,
          worstGradePct:+(worst*100).toFixed(1), worstAt:worstAt,
          allowlisted:allowed||undefined, reason: allowed?GRADE_ALLOWLIST[road.id]:undefined });
    });
    out.pass = out.unlistedFailSegments === 0;
    out.note = "GATING (Phase 2b): "+out.unlistedFailSegments+" gating fail (>41%) + "+out.suspectSegments
             +" suspect (>31.5%, legal) segments across "+out.roadsChecked+" active roads; "
             +out.allowlistedRoads+" allow-listed road(s) with real-terrain steep faces (reported, not gated).";
    return out;
  });

  /* spine.wharfFootDryInland — each pier/wharf foot anchors on DRY LAND and
     is set back >= ~8 ft (2.4 m) INLAND of the dry-land edge (above high tide),
     NEVER at the coastline/waterline; the deck then runs seaward over water.
     The authored feet (Broadway, Central) sit on the Montgomery beach line —
     dry at mean tide, under water at high tide — so they FLAG here (the proof
     the rule works; re-anchoring inland is Phase 2). */
  registerAudit("spine", "wharfFootDryInland", function(){
    var out = { pass:true, reportOnly:true, phase:1, wharvesChecked:0, misAnchored:0, misAnchoredIds:[], detail:[] };
    var edge = dryLandEdgeAt(simDay);
    livePiers().forEach(function(p){
      var active = pierActiveCheckpoint(p, simDay); if(!active) return;   // absent/reaching at this date
      out.wharvesChecked++;
      var f = gridToWorld(p.polyline[active.extent[0]].u, p.polyline[active.extent[0]].v);
      var dry = isDryLand(f.x, f.z, simDay);
      var edgeX = dryLandEdgeXAt(f.z, edge);
      var setback = (edgeX!=null) ? (edgeX - f.x) : null;               // +X seaward: inland foot has x < edgeX
      var ok = dry && setback!=null && setback >= FOOT_SETBACK_M;
      if(!ok){ out.misAnchored++; out.misAnchoredIds.push(p.id); }
      out.detail.push({ id:p.id, name:p.name, foot:{ x:+f.x.toFixed(1), z:+f.z.toFixed(1) },
        footDry:dry, setbackM:(setback==null?null:+setback.toFixed(1)), minSetbackM:FOOT_SETBACK_M, ok:ok });
    });
    out.note = "REPORT-ONLY (Phase 1): "+out.misAnchored+" of "+out.wharvesChecked+" active wharf feet fail the dry-inland anchor rule.";
    return out;
  });
})();

/* driving hook for the verify harness — expose the derived set (mirrors
   buildings' landmarksAt attach). ZERO new geometry. */
setTimeout(function(){
  if(typeof window !== "undefined" && window.__P1850){
    window.__P1850.wharvesAt = function(day){ return deriveWharfSet(day == null ? simDay : day); };
  }
}, 0);
