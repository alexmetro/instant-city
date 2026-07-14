/* =====================================================================
   core/01-geography — geography truth, the master street spine data (STREET-CHECKPOINT LAW), baked-terrain
   sampler. Shared interface owner: terrainHeight(x,z), gridToWorld/worldToGrid, zoneAt(x,z), STREETS_RUNTIME.
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 02 — geography truth, street-checkpoint spine data, baked-terrain sampler + zoneAt */
/* =====================================================================
   GEOGRAPHY TRUTH (research/geography-shoreline.md §2, research/peninsula-1846.md)
   World coords: +X = east (toward the bay), +Z = south, Y = up.
   Origin roughly at Montgomery & Clay, the flag-raising corner.
   Portsmouth Square (the Plaza) sits just inland of it.

   Grid corrected against geography-shoreline.md §2: Vioget's Nov-1839
   survey covered only 3 blocks (west) x 5 blocks (north-south) around the
   plaza — Montgomery/Kearny/Dupont/Stockton x Pacific/Jackson/Clay/
   Washington/Sacramento/California — each block six 50-vara lots,
   412 x 275 ft (125.7 x 83.8 m). Vioget's survey was famously ~2.5 degrees
   off true right angles ("Vioget's error"), not corrected until O'Farrell's
   1847 "swing" — modeled here as a rigid skew of the whole grid (see
   gridToWorld()) rather than hand-skewing individual streets.

   GEOMETRY TRUTH re-projection (2026-07-11, research/map-scans/
   VALIDATION-2026-07-11.md §4 — measured against the georeferenced 1853
   Coast Survey chart + Overpass-measured modern intersections, which are
   valid ground truth because the grid is unchanged since O'Farrell 1847):
   1. The BASE grid rotation is ~9°, not 2.5°: measured corridor bearings
      Montgomery 351.2° (=-8.8°), Washington 80.6°/Clay 80.6-81.0°
      (=-9.0..-9.4°); fitted mean -9.1°, adopted -9.0° (best Market
      cross-check: modeled Market compass bearing 45.00° vs measured
      45.06°, well inside the ±0.5° acceptance). SIGN: in this file's
      convention (+x east, +z south, x = u·cos a − v·sin a) a NEGATIVE
      angle leans grid-north west of true north, as measured.
   2. SEMANTICS SPLIT (geography-shoreline.md §2 + its uncertainty #3):
      the historical "O'Farrell swing" corrected Vioget's ~2.5° error
      WITHIN the ~9°-rotated grid — the 2.5° is the SWING DELTA, not the
      grid's rotation. GRID_ROT_BASE (-9.0°, permanent, = the measured
      modern/post-1847 grid) and VIOGET_ERROR_DEG (2.5°, the pre-1847
      as-built offset the Feb-Aug 1847 swing removes) are now separate
      numbers; the as-built pre-swing frame is base + error = -6.5°.
      (The error's SIGN/direction is undocumented — the record says only
      "2.5° off true right angles", mechanism contested per
      geography-shoreline.md consolidated-uncertainty #3 — so the swing
      keeps this file's long-standing direction convention: pre-1847 sits
      2.5° counterclockwise-of-base in app angle terms.)
   3. TERRAIN REGISTRATION: the heightmap bake's world frame is centered
      on (37.7955N, 122.4045W) while the street grid's (u,v)=(0,0) —
      Montgomery St's centerline at the Washington–Clay midrow — is really
      at (37.7951056N, 122.4032421W). gridToWorldAt() now places the grid
      at that measured spot in the terrain frame (GRID_ORIGIN_X/Z below)
      instead of silently equating the two origins (~119m apart).
   Centerline spacing (fix #2 of the validation) lives in the DATASET:
   data/streets-geometry.json was re-projected to measured centerline
   spacing (block + per-pair street widths; Market re-anchored to its two
   measured crossings; Battery/Front at the measured 103.9m water-lot
   spacing) — see tools/reproject-streets-2026-07-11.js and the dataset's
   meta.reprojection_2026_07_11.
   ===================================================================== */
/* Metrology note (geography-shoreline.md §2), kept for the record — the
   former VARA_M/LOT_M/BLOCK_W/BLOCK_D constant chain was dead code (nothing
   read it; exact per-street positions come from STREETS_RUNTIME) and was
   deleted in the 2026-07-12 cleanup. The research figures it carried:
   1 vara = 0.838 m; a 50-vara lot ≈ 41.9 m; N-S main-street CENTERLINE
   spacing ≈ 146.2 m (150-vara block + mean documented street width;
   measured Montgomery↔Kearny 145.8-146.4 m); E-W cross-street CENTERLINE
   spacing ≈ 98.8 m (100-vara block + documented 14.97 m cross width;
   measured Washington↔Clay 96.7-97.7 m). */
var GRID_ROT_BASE_DEG = -9.0;            // fitted base grid rotation (measured, permanent — the
                                          // O'Farrell/modern grid; VALIDATION-2026-07-11 §4.1)
var VIOGET_ERROR_DEG = 2.5;              // "Vioget's error" — the 1847 swing DELTA within the
                                          // rotated grid (geography-shoreline.md §2; direction
                                          // modeled, mechanism contested per uncertainty #3)
var VIOGET_SKEW_DEG = GRID_ROT_BASE_DEG + VIOGET_ERROR_DEG; // -6.5° — the as-built pre-1847 frame
var VIOGET_SKEW = VIOGET_SKEW_DEG*Math.PI/180;
var GRID_ROT_BASE = GRID_ROT_BASE_DEG*Math.PI/180;
/* Terrain↔grid registration (VALIDATION-2026-07-11 §4.3): world offset of
   the grid origin inside the terrain bake's frame. Derived: grid (0,0) is
   really (37.7951056N, 122.4032421W) (midpoint of the Overpass-measured
   Montgomery×Clay / Montgomery×Washington nodes); the bake box is centered
   (37.7955N, 122.4045W); equirectangular at the bake's own meters/degree
   (111320·cos 37.7955° = 87965.4 m/°lon) → (+110.66 E, +43.90 S). MUST
   match tools/bake-terrain.js's GRID_ORIGIN_X/Z (the shore anchors are
   derived through the same transform at bake time). */
var GRID_ORIGIN_X = 110.66, GRID_ORIGIN_Z = 43.90;
var STREET_STUB_LEN = 100;               // sandy-track fade-out length beyond the grid edge
                                          // (shortened 2026-07-10, night-glow fix: the old 180m
                                          // reach + a color that paled toward bright tan read as
                                          // radiating bright scratches spiking off the grid edge)

/* =====================================================================
   THE GEODETIC LOCK (foundation-reset §2) — the ONE canonical world↔grid
   transform. gridToWorldAt() is the primitive; gridToWorld()/worldToGrid()
   are the canonical (resting-frame) mapping every subsystem must derive
   from. No layer defines its own origin/angle or m-per-degree constant —
   the outlawed class is the pre-s77 "gridToWorld pinned at −6.5° while its
   streets render at −9.0°" bug. Verified LIVE by the standing guard
   __P1850.audits.core.geodeticLock(), which re-fits the 8 OSM control
   points and re-projects gridToWorld() end-to-end against them (FAIL if
   RMS > ~2 m or any transform's implied base angle drifts from
   GRID_ROT_BASE by >0.1°). Grid EXPANSION extends from this same fit —
   never re-anchored locally.

   Rotates an "ideal" square-grid coordinate (u = ideal east/west, v = ideal
   north/south) into world (x,z) at a GIVEN skew angle, then registers it
   into the terrain frame via GRID_ORIGIN_X/Z (fix #3 above). Every street,
   block and the plaza itself is defined in (u,v) and only converted at the
   end, so the whole grid tilts together instead of being hand-skewed per
   street. gridToWorldAt() is parameterized so the GROUND-SPLAT street
   painter (below) can ease the angle from the as-built VIOGET_SKEW (-6.5°)
   to GRID_ROT_BASE (-9.0°) for the O'Farrell 1847 grid-swing. */
function gridToWorldAt(u,v,skewAngle){
  var c = Math.cos(skewAngle), s = Math.sin(skewAngle);
  return { x: u*c - v*s + GRID_ORIGIN_X, z: u*s + v*c + GRID_ORIGIN_Z };
}
/* gridToWorld(): THE canonical resting frame (GRID_ROT_BASE, −9.0°) — the
   measured/post-1847 O'Farrell grid. s77 GEODETIC LOCK FIX: this was pinned
   at VIOGET_SKEW (−6.5°), so every fixed anchor that reads it (GEO.plaza
   fill, doodad fences, the wharf/anchorage, the fire block, the routing
   walker graph, ship berths) sat 9–13 m off the −9.0° streets it is
   supposed to bound (end-to-end that pin measured 18 m RMS / 35 m worst vs
   the OSM control points; the canonical −9.0° measures 1.2 m RMS). The
   deliberate pre-survey Vioget-frame consumers — the founding-village
   scatter + City Hotel, an intentional "existing buildings kept Vioget's
   crooked alignment, new construction followed the corrected grid" model —
   now call gridToWorldAt(u,v,VIOGET_SKEW) EXPLICITLY, so there is no silent
   frame left anywhere. The visible street ground-paint still eases −6.5°→
   −9.0° across Feb–Aug 1847 (renderGroundSplat); at rest (which is the
   entire post-Aug-1847 window, i.e. essentially the whole Gold-Rush sim)
   everything shares the one −9.0° frame. */
function gridToWorld(u,v){ return gridToWorldAt(u,v,GRID_ROT_BASE); }
/* worldToGrid(): the canonical inverse of gridToWorld() — the single source
   for every world→(u,v) mapping (routing's nearestStreetPair, the fire
   footprint test). Un-registers the terrain-frame origin, then rotates back
   by −GRID_ROT_BASE. Any other inverse in the codebase must call this, not
   re-derive its own angle (GEODETIC LOCK). */
function worldToGrid(x,z){
  var lx = x - GRID_ORIGIN_X, lz = z - GRID_ORIGIN_Z;
  var c = Math.cos(GRID_ROT_BASE), s = Math.sin(GRID_ROT_BASE);
  return { u: lx*c + lz*s, v: -lx*s + lz*c };
}

/* GAPS-2026-07-09 item 4 (reconciler flag) — the O'Farrell "grid swing":
   the comment above always noted the 1847 correction but never executed
   it. STREET RENDERING REBUILD (2026-07-10): previously this rotated a
   THREE.Group the street meshes were parented to, but
   OFARRELL_SWING_START/END were computed here via eventDateToSimDay()
   before SIM_START_MS existed (it's assigned much further down, see
   "PHASE 2 — THE CLOCK"), so both evaluated to NaN and the group's
   rotation was NaN from the very first frame — the swing never actually
   played. Fixed by moving the OFARRELL_SWING_START/END assignment down
   next to SIM_START_MS/eventDateToSimDay's real definitions (search
   "OFARRELL_SWING_START" below); the swing is now driven by re-painting
   the ground-splat street layer (see GROUND SPLAT-MAP) at the current
   skew angle instead of rotating a mesh group, which sidesteps the whole
   rotation-convention question the old comment worked around. */
var LAST_SPLAT_SWING_T = -1;
// LABEL-SKEW-MATCH fix (2026-07-10, iPad field-test defect #5): the current
// street-grid skew angle, read by updateStreetLabels() every frame so DOM
// street labels always track the SAME angle renderGroundSplat() just
// painted the streets at — previously labels were seated once at the fixed
// VIOGET_SKEW and never updated, visibly diverging from the street paint
// during the Feb-Aug 1847 grid swing.
var CURRENT_STREET_SKEW = VIOGET_SKEW;
function updateGridSwing(){
  var t = clamp((simDay-OFARRELL_SWING_START)/(OFARRELL_SWING_END-OFARRELL_SWING_START), 0, 1);
  // t=0 (pre-Feb 1847): full as-built Vioget frame (-6.5°), same as the
  // buildings. t=1 (post-Aug 1847): eased to GRID_ROT_BASE (-9.0°) — the
  // O'Farrell swing removes only the 2.5° VIOGET_ERROR_DEG delta, it does
  // NOT square the grid to cardinal (the measured modern grid the swing
  // produced is itself rotated -9°; see the GEOMETRY TRUTH block above).
  // Buildings (never re-baked) stay in the Vioget frame, same as the
  // historical record describes for existing structures versus new
  // post-survey construction.
  CURRENT_STREET_SKEW = VIOGET_SKEW + (GRID_ROT_BASE - VIOGET_SKEW)*t;
  // Re-paints the splat canvases when EITHER the swing angle has moved
  // (cheap 2D redraw, no need to redo it 60x/sec) OR simDay has crossed
  // some street's own survey/worn-track/checkpoint threshold (see
  // STREET_REPAINT_THRESHOLDS above) — the swing-only trigger used to be
  // the sole repaint driver, which silently stopped mattering forever
  // after Aug 1847 (t pinned at 1) even though streets keep
  // appearing/upgrading for years afterward. streetTopologyMayHaveChanged
  // also fires unconditionally the first time (LAST_SPLAT_SIMDAY===null),
  // AND correctly re-detects a threshold crossing on a BACKWARD time-jump
  // (rewind), not just forward playback. CURRENT_STREET_SKEW itself is
  // still updated above every call so labels stay perfectly in sync even
  // between repaints.
  var topologyChanged = streetTopologyMayHaveChanged(LAST_SPLAT_SIMDAY, simDay);
  // WEAR-ON-USE fix (task #28 item 3): also repaint when the spawned-
  // building count has moved — street wear now reads nearby built density,
  // which changes continuously as the town grows, not just at the fixed
  // survey/checkpoint thresholds streetTopologyMayHaveChanged() tracks.
  var buildingCountChanged = (spawnedBuildings.length + spawnedTents.length) !== LAST_SPLAT_BUILDING_COUNT; // tents count too (s20 on-use ruling: tent camps wear streets)
  var needRepaint = Math.abs(t-LAST_SPLAT_SWING_T)>0.015 || topologyChanged || buildingCountChanged;
  if(needRepaint && typeof renderGroundSplat==="function"){
    // REPAINT THROTTLE (s20 sprint, 2026-07-11): the hand-worn stroke
    // engine made repaints heavier, and timelapse growth changes the
    // building count nearly every frame — cap repaints at ~3/s of WALL
    // time. A skipped repaint is never lost: LAST_* stays stale, so the
    // same trigger re-fires every frame until the throttle window opens
    // (the final state after a jump/scrub always lands within ~350ms).
    var nowMs = performance.now();
    if(LAST_SPLAT_SIMDAY===null || nowMs - _lastSplatRepaintMs > 350){
      _lastSplatRepaintMs = nowMs;
      LAST_SPLAT_SWING_T = t;
      LAST_SPLAT_SIMDAY = simDay;
      LAST_SPLAT_BUILDING_COUNT = spawnedBuildings.length + spawnedTents.length;
      renderGroundSplat(CURRENT_STREET_SKEW);
    }
  }
}
var _lastSplatRepaintMs = 0;

/* =====================================================================
   STREET-CHECKPOINT DATA (grounding.md §9, THE STREET-CHECKPOINT LAW):
   data/streets-geometry.json (baked as app/streets-geometry.js, loaded
   above as window.STREETS_GEOMETRY) is now the ONLY street source in this
   file. The old hardcoded 10-street Vioget-grid streetsU/V literals are
   DELETED, not reconciled — every coordinate below is read straight out
   of the dataset. This single change also fixes knownDiscrepancies[0],
   the CLAY/WASHINGTON SWAP BUG (the app previously had clay north/
   washington south of the Plaza; the record — Portsmouth Square bounded
   by Washington St to the north, Clay St to the south — is the reverse):
   every one of this file's many GEO.streetsV.clay/washington consumers
   (the fire block, the wharf, the docks, the walker graph, City Hotel's
   "corner of Clay and Kearny") inherits the fix automatically, with zero
   other edits, because they all read the same corrected values from here.
   ===================================================================== */
var SG = window.STREETS_GEOMETRY;
if(!SG){ throw new Error("streets-geometry.js failed to load — check the <script src> path / run tools/build-streets-geo-js.js"); }

// Per-checkpoint-map simDay thresholds (when that survey's documented
// extent becomes "current" for streets whose topology grows across
// checkpoints, e.g. Montgomery's vioget-1839 [pacific..california] stub
// growing to its full ofarrell-1847 [vallejo..market-crossing] run).
// Hardcoded as plain simDay integers (not via eventDateToSimDay(), which
// isn't defined until much further down — see ITS OWN comment on why
// OFARRELL_SWING_START/END has to live there) rather than left as NaN
// bait; ofarrell-1847's value is asserted equal to OFARRELL_SWING_END
// where that constant is finally defined, so the two can never drift.
var ERA_MAP_SIMDAY = {
  "vioget-1839": -999999, "none": -999999, "primary-corpus": -999999, // already-there-at-sim-start baselines
  "ofarrell-1847": 396,   // Aug 1 1847 == OFARRELL_SWING_END (asserted below, once that const exists)
  "eddy-1849": 1279,      // Dec 31 1849 — Eddy's re-survey
  "coast-survey-1853": 2376 // Jan 1 1853 — the Coast Survey chart (no finer date in the record)
};

/* STREETS_RUNTIME: one flattened, render-ready entry per documented street
   (Hundred Vara group members — Folsom/Harrison/Bryant/Brannan, First
   through Eighth — expanded out of their generative "members" arrays into
   individual entries here). Two dataset entries are DELIBERATELY excluded:
     - "mission-street": this file's EXISTING findLowRoute()-based winding
       path (MISSION_ROAD_PTS, far below) is topologically TRUER than the
       dataset's own 2-point polyline, which its own checkpoint evidence
       calls "a DELIBERATE ANALYTICAL SIMPLIFICATION of a winding real
       path." Per grounding.md §9 ("topology is the truth that matters
       most"), keeping the existing curved implementation IS following the
       law here, not a lapse from it — a straight-line swap-in would be a
       regression. Its (u,v) endpoints still come from GEO below.
     - "western-addition-future-streets": ships with an empty polyline on
       purpose (meta.knownDiscrepancies explains why no coordinate exists
       yet) — nothing to render, and outside this project's 1846-1856
       Act I window regardless. */
var STREETS_RUNTIME = (function(){
  var calib = SG.meta.calibration;
  var classWidthMap = {}; calib.widthClasses.forEach(function(c){ classWidthMap[c.class]=c.width_m; });
  var overrideMap = {}; calib.perStreetWidthOverrides_fromEldredge1912.forEach(function(o){ overrideMap[o.id]=o.width_m; });
  function widthFor(entry){
    if(entry.width_m!=null) return entry.width_m;
    if(overrideMap[entry.id]!=null) return overrideMap[entry.id];
    return classWidthMap[entry.widthClass] || classWidthMap[entry.class] || 12; // last-resort only; calibration covers every class actually used
  }
  var out = [];
  function addEntry(id,name,widthM,polyline,checkpoints,appears,cls){
    var swings = checkpoints.some(function(c){ return c.map==="vioget-1839"; }); // only the original Vioget-surveyed streets ease through the O'Farrell skew
    var ckpts = checkpoints.filter(function(c){ return Array.isArray(c.extent); }).map(function(c){
      return { day: ERA_MAP_SIMDAY[c.map]!=null ? ERA_MAP_SIMDAY[c.map] : -999999, extent:c.extent };
    }).sort(function(a,b){ return a.day-b.day; });
    out.push({ id:id, name:name, widthM:widthM, cls:cls||"lane", polyline:polyline, checkpoints:ckpts,
      surveyedDay: appears?appears.surveyedDay:null, firstMentionDay: appears?appears.firstMentionDay:null, swings:swings });
  }
  SG.streets.forEach(function(s){
    if(s.id==="mission-street" || s.id==="western-addition-future-streets") return;
    if(s.members){ // hundred-vara-district-streets, numbered-streets-first-eighth: no growth across checkpoints, full length from ofarrell-1847
      var wM = widthFor(s);
      s.members.forEach(function(m){
        var poly = m.polyline.map(function(p){ return {u:p[0],v:p[1]}; });
        addEntry(s.id+":"+m.name, m.name+" Street", wM, poly, [{map:"ofarrell-1847",extent:[0,poly.length-1]}], s.appears, s.class);
      });
      return;
    }
    var poly = s.polyline.map(function(p){ return {u:p[0],v:p[1]}; });
    addEntry(s.id, s.name, widthFor(s), poly, s.checkpoints, s.appears, s.class);
  });
  return out;
})();
var STREETS_RUNTIME_BY_ID = {}; STREETS_RUNTIME.forEach(function(s){ STREETS_RUNTIME_BY_ID[s.id]=s; });
function streetUConst(id){ return STREETS_RUNTIME_BY_ID[id].polyline[0].u; } // cardinal N-S streets only: constant u along the whole run
function streetVConst(id){ return STREETS_RUNTIME_BY_ID[id].polyline[0].v; } // cardinal E-W streets only: constant v along the whole run

/* Every simDay where SOME street's rendered state could change — its own
   survey/worn-track dates, or a checkpoint-era boundary that grows its
   drawn extent (read by updateGridSwing() below, which used to repaint
   the splat canvases ONLY when the O'Farrell skew was still easing; once
   that finishes (t=1, forever after) it would otherwise never notice
   Eddy's 1849 extensions or a street's firstMentionDay arriving — exactly
   the "time-jump leaves the world stale" failure class the P0 quartet
   fixed for population/ships/people, now closed for streets too). */
// Wear-ramp constants, hoisted out of renderGroundSplat() (s20 sprint,
// 2026-07-11) so the repaint-threshold table below can see them: a street's
// rendered state keeps changing through the whole mention/survey ramp, so
// the ramp END days are repaint thresholds too — previously a date jump
// landing mid-ramp (e.g. firstMention+10d -> firstMention+300d) crossed no
// threshold and left both tiers painted at the stale pre-jump wear.
// ON-USE RULING (s20 sprint, 2026-07-11, coordinator directive): the old
// DEFAULT_WORN_DELAY fill ("no corpus citation -> read as worn ~1yr after
// survey") is DELETED, not tuned. Every street in streets-geometry.js
// carries wornTrackRule:"on-use", and the record is explicit that
// O'Farrell's 1847 paper streets were paper: Market's right-of-way stayed
// ungraded sand dunes through this sim's whole window, and the numbered
// streets only firmed up where the 1849 Happy Valley tent settlement
// actually was. A survey date alone now NEVER drives wear — wear comes
// from a documented corpus first-mention (use evidence, ramped below) or
// from real adjacent settlement density (buildings AND tent camps).
var WEAR_MENTION_RAMP = 120;  // days from firstMentionDay to fully-worn, once documented in use
var STREET_REPAINT_THRESHOLDS = (function(){
  var set = {};
  STREETS_RUNTIME.forEach(function(s){
    if(s.surveyedDay!=null) set[s.surveyedDay]=1;
    if(s.firstMentionDay!=null){ set[s.firstMentionDay]=1; set[s.firstMentionDay+WEAR_MENTION_RAMP]=1; }
    s.checkpoints.forEach(function(c){ if(c.day>-999999) set[c.day]=1; });
  });
  return Object.keys(set).map(Number).sort(function(a,b){ return a-b; });
})();
var LAST_SPLAT_SIMDAY = null;
function streetTopologyMayHaveChanged(prevDay, curDay){
  if(prevDay==null || prevDay===curDay) return prevDay==null;
  // ERA-CORRECTNESS audit (s20 sprint): any jump/scrub of 15+ days always
  // repaints — closes the mid-ramp staleness class generically (wear is a
  // continuous function of simDay between thresholds, and a big jump can
  // land inside any street's ramp without crossing a discrete threshold).
  if(Math.abs(curDay-prevDay)>=15) return true;
  var lo=Math.min(prevDay,curDay), hi=Math.max(prevDay,curDay);
  for(var i=0;i<STREET_REPAINT_THRESHOLDS.length;i++){
    var t = STREET_REPAINT_THRESHOLDS[i];
    if(t>lo && t<=hi) return true;
  }
  return false;
}
// WEAR-ON-USE fix (task #28 item 3): renderGroundSplat()'s street wear now
// also reads nearby built density off spawnedBuildings (see its own
// comment further down), which grows continuously as the town fills in —
// not just at the discrete survey/first-mention/checkpoint dates
// STREET_REPAINT_THRESHOLDS tracks. LAST_SPLAT_BUILDING_COUNT (checked by
// updateGridSwing() below) triggers an extra repaint whenever the spawned-
// building count itself has moved, so a paused jump's synchronous growth
// catch-up (P0-1) is reflected in the very next repaint, same frame.
var LAST_SPLAT_BUILDING_COUNT = -1;

var GEO = {
  // Compatibility map for this file's ~80 other GEO.streetsU/V.xxx call
  // sites (fire block, wharf, docks, walker graph, labels' own fallback
  // span, etc.) — same 10 named keys as the old hardcoded object, but
  // every value is now READ from STREETS_RUNTIME above instead of computed
  // independently, so there is exactly one source of truth for them.
  streetsU: { montgomery:streetUConst("montgomery"), kearny:streetUConst("kearny"), dupont:streetUConst("dupont"), stockton:streetUConst("stockton") },
  streetsV: { pacific:streetVConst("pacific"), jackson:streetVConst("jackson"), clay:streetVConst("clay"),
              washington:streetVConst("washington"), sacramento:streetVConst("sacramento"), california:streetVConst("california-street") },
  // Plaza: one block inland of Montgomery (Dupont/Kearny x Washington/Clay,
  // north-to-south) — "faced the water one block up from the beach."
  // GEOMETRY TRUTH (2026-07-11): read straight from the reprojected street
  // centerlines instead of BLOCK_W/BLOCK_D multiples, so the plaza block
  // stays exactly between its four bounding streets under the measured
  // per-pair centerline spacing (Dupont -292.37 is no longer exactly
  // 2x Kearny's -145.71).
  plaza: { uMin:streetUConst("dupont"), uMax:streetUConst("kearny"),
           vMin:streetVConst("washington"), vMax:streetVConst("clay") },

  // shoreline: 1846 cove — inland edge at Montgomery St's EAST side between
  // Clay & Washington (the flag-raising beach), Clark's Point (Broadway &
  // Battery) north, the south beach arcing east past Happy Valley to Rincon
  // Point. COVE ARC CORRECTION (2026-07-12): shoreAnchors is now a dense
  // (10m) first-water-edge table derived from the MEASURED natural line —
  // the 222-vertex trace of the 1853 Coast Survey chart's "original H.W.
  // line per Eddy's 1852 resurvey" (data/shoreline-natural-1849.json),
  // which the bake consumed verbatim as a land/water polygon (old
  // hand-derived curve deviated up to 230m from it on the south beach).
  // shorelineX(z) reads that same emitted table (TERRAIN_1846.shoreAnchors,
  // tools/bake-terrain.js), so the analytic curve and the baked heightmap
  // can never disagree; east of the curve the heightmap alone is truth.
  zNorthHeadland: -900,
  zSouthHeadland: 1224,   // Rincon Point tip z — s77 re-trace to Harrison & Spear
                          // (data/shoreline-natural-1849.json; was 765, ~460m too far
                          // north, collapsing the cove span 18%). Only drives the
                          // modern/ghost 2026 shoreline falloff extent below.

  // fixed offset for the then/now 2026 ghost shoreline (fill was greatest
  // mid-cove, least near the natural headlands)
  ghostFillMid: 480,
  ghostFillHeadland: 120
};

/* One shoreline curve, one owner: [z, shoreX] anchors baked into
   terrain-1846.js by tools/bake-terrain.js (the traced 1849 natural
   high-water line, data/shoreline-natural-1849.json), linear interp +
   a light 3-tap smoothing. COVE ARC CORRECTION (2026-07-12): the anchors
   are now DENSE (10m spacing, discontinuity-refined) samples of the
   traced line, so the smoothing window shrank ±40 -> ±4 — at the trace's
   real corners the old ±40 window bowed the curve up to ~21m off the
   measured line, and any wide window smears the first-water-edge's two
   real jumps (the spit at the foot of Clay; the Rincon flank handoff). */
function shoreAnchorsX(z){
  var A = TERRAIN.shoreAnchors;
  if(z<=A[0][0]) return A[0][1];
  if(z>=A[A.length-1][0]) return A[A.length-1][1];
  for(var i=0;i<A.length-1;i++){
    if(z>=A[i][0] && z<=A[i+1][0]) return lerp(A[i][1], A[i+1][1], (z-A[i][0])/(A[i+1][0]-A[i][0]));
  }
  return A[A.length-1][1];
}
function shorelineX(z){
  return (shoreAnchorsX(z-4)+shoreAnchorsX(z)+shoreAnchorsX(z+4))/3;
}
function modernShorelineX(z){
  var half = z<0 ? Math.abs(GEO.zNorthHeadland) : GEO.zSouthHeadland;
  var t = clamp(Math.abs(z)/half, 0, 1.7);
  var fill = lerp(GEO.ghostFillMid, GEO.ghostFillHeadland, smoothstep(0,1,t));
  return shorelineX(z) + fill;
}

var PLAZA_CENTER = gridToWorld((GEO.plaza.uMin+GEO.plaza.uMax)/2, (GEO.plaza.vMin+GEO.plaza.vMax)/2);

/* Village footprint used to flatten terrain under the streets/plaza — the
   world-space bounding box of the (now much smaller, skewed) grid plus a
   margin, computed from the grid's corners rather than hand-picked. */
var VILLAGE_BOX = (function(){
  var pad = 40;
  var us = [GEO.streetsU.stockton-pad, GEO.streetsU.montgomery+pad];
  var vs = [GEO.streetsV.pacific-pad, GEO.streetsV.california+pad];
  var xMin=Infinity, xMax=-Infinity, zMin=Infinity, zMax=-Infinity;
  us.forEach(function(u){ vs.forEach(function(v){
    var w = gridToWorld(u,v);
    xMin=Math.min(xMin,w.x); xMax=Math.max(xMax,w.x);
    zMin=Math.min(zMin,w.z); zMax=Math.max(zMax,w.z);
  }); });
  return { xMin:xMin, xMax:xMax, zMin:zMin, zMax:zMax };
})();
function distOutsideBox(x,z,b){
  var dx = Math.max(b.xMin-x, 0, x-b.xMax);
  var dz = Math.max(b.zMin-z, 0, z-b.zMax);
  return Math.sqrt(dx*dx+dz*dz);
}
/* KILL-THE-SQUARE (s60 PAINTERLY GROUND KIT): every village-edge treatment
   (pad height blend, trodden-earth tint, hillshade gate, surface-class
   shift) used to feather over distOutsideBox() with a UNIFORM width —
   three coaxial rounded rectangles whose constant-width, constant-strength
   ring read as a plinth boundary under the town at any altitude (the
   user's "square"). One SHARED world-noise warp makes the feather width
   wander ~0.55x-1.65x on ~130-400m lobes, so the boundary is an organic
   worn-ground coastline, not a rect. Deterministic (hash noise, no seed),
   and used by BOTH the height rule and the color/material rules so the
   pad slope and the tone edge stay coincident. Early-outs bound the fbm
   cost to the feather ring only (terrainHeight is a hot path). */
function villageFeatherT(x,z,dOut,width){
  if(dOut<=0) return 0;
  if(dOut>=width*1.9) return 1;   // beyond the widest possible warped feather
  return smoothstep(0, width, dOut*(0.55 + 1.1*fbm(x*0.0075+3.7, z*0.0075, 2)));
}

/* =====================================================================
   REAL TERRAIN — sampled from the baked 1846 heightmap (terrain-1846.js,
   produced by tools/bake-terrain.js from AWS Terrarium elevation tiles,
   with 1846 historical corrections: Treasure Island deleted, Yerba Buena
   Cove / Mission Bay / the Marina restored to water-or-marsh). Bilinear
   sample, one function used everywhere: building/street/ship placement,
   camera collision, and the terrain mesh itself.
   ===================================================================== */
var TERRAIN = window.TERRAIN_1846;
if(!TERRAIN){ throw new Error("terrain-1846.js failed to load — run tools/bake-terrain.js and check the <script src> path"); }
if(!TERRAIN.nx){ throw new Error("terrain-1846.js is a pre-peninsula square bake — re-run tools/bake-terrain.js (s46 rect domain)"); }
/* WORLD — the rect baked domain (s46 peninsula bake: Pacific -> bay).
   Replaces every CFG.worldSize consumer. */
var WORLD = (function(){
  var w = { x0:TERRAIN.x0, z0:TERRAIN.z0, cell:TERRAIN.cell, nx:TERRAIN.nx, nz:TERRAIN.nz };
  w.xMax = w.x0 + (w.nx-1)*w.cell;
  w.zMax = w.z0 + (w.nz-1)*w.cell;
  w.sizeX = w.xMax - w.x0;
  w.sizeZ = w.zMax - w.z0;
  return w;
})();
function sampleTerrainGrid(x,z){
  var fi = clamp((x-WORLD.x0)/WORLD.cell, 0, TERRAIN.nx-1);
  var fj = clamp((z-WORLD.z0)/WORLD.cell, 0, TERRAIN.nz-1);
  var i0 = Math.floor(fi), j0 = Math.floor(fj);
  var fx = fi-i0, fz = fj-j0;
  var i1 = Math.min(i0+1, TERRAIN.nx-1), j1 = Math.min(j0+1, TERRAIN.nz-1);
  var h00 = TERRAIN.heights[j0*TERRAIN.nx+i0], h10 = TERRAIN.heights[j0*TERRAIN.nx+i1];
  var h01 = TERRAIN.heights[j1*TERRAIN.nx+i0], h11 = TERRAIN.heights[j1*TERRAIN.nx+i1];
  var h0 = h00+(h10-h00)*fx, h1 = h01+(h11-h01)*fx;
  return h0+(h1-h0)*fz;
}
/* ECOLOGY ZONE lookup (s46) — per-cell zone codes baked by
   tools/bake-terrain.js from data/peninsula-geography-1849.json:
   0 none | 1 dune_sand | 2 dune_scrub | 3 grassland | 4 oak_woodland |
   5 tidal_marsh | 6 mudflat | 7 riparian_willow */
function zoneAt(x,z){
  var i = Math.round((x-WORLD.x0)/WORLD.cell), j = Math.round((z-WORLD.z0)/WORLD.cell);
  if(i<0||j<0||i>=TERRAIN.nx||j>=TERRAIN.nz) return 0;
  return TERRAIN.zones.charCodeAt(j*TERRAIN.nx+i)-48;
}

/* Village flat reference height — sampled from the real grid at the plaza,
   so the flattened pad sits at the true local elevation instead of a
   hand-picked constant. */
var VILLAGE_Y = sampleTerrainGrid(PLAZA_CENTER.x, PLAZA_CENTER.z);

/* The terrain truth function — also used for building placement, ships,
   camera collision, and the flattened street/plaza levels. Blends a flat
   pad into the real sampled heights near the plaza so streets/buildings
   sit naturally (real San Francisco streets climb noticeably from
   Montgomery towards Stockton; the village needs a walkable pad). */
/* terrainHeightFrom(h,x,z): the pad/gate logic applied to a PROVIDED base
   sample — split out (s46) so the coast-band mesh subdivision can run the
   same rule over its smoothed (Catmull-Rom) base samples. terrainHeight()
   itself is unchanged in behavior. */
function terrainHeightFrom(h,x,z){
  var dOut = distOutsideBox(x,z,VILLAGE_BOX);
  var villageBlend = villageFeatherT(x,z,dOut,240); // 0 inside, 1 far outside — noise-warped edge (s60 square kill)
  /* WATERLINE FIX (task #27, 2026-07-11): this blend used to run
     unconditionally, lifting anything within 240m of VILLAGE_BOX up toward
     the dry VILLAGE_Y height regardless of what the real (already
     historically-corrected) baked sample said — so the whole eastern
     apron between the plaza and the documented 1846-51 cove waterline
     (research/geography-shoreline.md §1/§3: "shoreline at Montgomery St.
     ... through ~1851"; shorelineX(z) below is the exact curve
     findRealShoreX()/the storeship placement code already treats as
     ground truth) got raised above sea level into a false wide sand
     beach, burying the correctly-underwater relief the four named
     storeships (Niantic, General Harrison, Euphemia, Apollo) sit in.
     East of that documented natural shoreline the pad must never govern:
     trust the real sampled height there, full stop. West of it (the town
     side) the pad blend behaves exactly as before. (The sim never runs
     past 1849-12-31 — SIM_END_DAY below — so this static per-(x,z)
     natural-shoreline curve IS the shoreline-by-date truth for every
     date this app can actually reach; the 1851+ fill progression
     research describes is out of the sim's own window.) */
  var dShore = x - shorelineX(z);
  if(dShore > 0) return h;
  /* PAD BANK FEATHER (s22 shoreline truth, 2026-07-11): the #27 gate
     above used to be a hard step — pad height (VILLAGE_Y ~21m) one
     sample west of the shoreline, tide-flat mud one sample east — which
     the terrain mesh rendered as a one-cell cliff wall the moment it
     started reading terrainHeight() honestly. The last ~80m of the pad
     now eases down to the real (bake-banked) beach height, so the town
     meets the cove on a beach bank, not a fault scarp. */
  var padH = lerp(VILLAGE_Y, h, villageBlend);
  var wBank = smoothstep(-80, -6, dShore);
  return lerp(padH, h, wBank);
}
function terrainHeight(x,z){ return terrainHeightFrom(sampleTerrainGrid(x,z), x, z); }
/* alias: pre-rewrite code called the unified sampler groundHeight() */
function groundHeight(x,z){ return terrainHeight(x,z); }

var _SEALROCK_GREY = new THREE.Color(0x757b72);
function terrainColor(x,z,h){
  var d = hash2(Math.floor(x*0.4), Math.floor(z*0.4));
  var dither = (fbm(x*0.08,z*0.08,2)-0.5)*0.05;
  // s46: ecology zone with SOFT boundaries — the lookup point is jittered
  // by a broad noise field so 31m cell steps / polygon sides never print
  // as straight color seams (the zone polygons are coarse envelopes).
  var zn = 0;
  if(TERRAIN.zones){
    var zjx = (fbm(x*0.012+7.3, z*0.012, 2)-0.5)*170;
    var zjz = (fbm(x*0.012, z*0.012+3.1, 2)-0.5)*170;
    zn = zoneAt(x+zjx, z+zjz);
  }

  // palette anchors — THE EARTH PALETTE LAW (s62, grounding.md §9): base
  // albedos retuned so midday sunlit ground renders at ~0.55-0.70 luminance
  // (AoE2:DE / RuneScape value world) under the ~1.03x noon rig. Ground is
  // EARTH, not paper; parchment lives in the UI panels only.
  var wetMud   = new THREE.Color(0x5c4e3a);
  var mudFlat  = new THREE.Color(0x4d4334);  // intertidal wet-sheen mud — darker than any dry sand, browner than seabed
  var sand     = new THREE.Color(0xb7a06f);  // beach/base sand: pale but never white (was 0xd8c48c, clipped white under the old rig)
  var duneGold = new THREE.Color(0xa98e58);  // warm tan, not cream (was 0xc9ad6c)
  var scrub    = new THREE.Color(0x64773e);
  var scrubDry = new THREE.Color(0x8c8a52);
  var rocky    = new THREE.Color(0x977e55);  // dry rocky tops with body (was 0xa9906a)
  var village  = new THREE.Color(0xa8905f);  // town dirt: mid brown-tan (was 0xcbb488)
  var seabedShallow = new THREE.Color(0x4a6b5f);
  var seabedDeep    = new THREE.Color(0x1f3a4d);

  var col;
  if(h <= 0.15){
    // underwater seabed: muddy near the surface, deepening with depth
    var depthT = clamp01(-h/45);
    col = seabedShallow.clone().lerp(seabedDeep, depthT);
    col.lerp(wetMud, clamp01(1-depthT)*0.35);
    // INTERTIDAL FLATS (shoreline truth, 2026-07-11): the top ~1m of the
    // shelf is the cove's exposed-at-low-tide mud — read as dark wet mud
    // through the shallow water and wherever the tide uncovers it, clearly
    // distinct from dry sand above and open water beyond.
    col.lerp(mudFlat, clamp01((h+1.0)/1.0)*0.8);
    // s46: the Mission Bay tidal flat (zone 6) is silty and pale — the
    // near-black cove-mud read at 1km scale looked like a stain, not a flat
    if(zn===6) col.lerp(new THREE.Color(0x7a7059), 0.5);
  } else {
    col = sand.clone();
    // low sandy dunes -> mid scrub -> dry rocky tops (dark flanks vs pale flats)
    var elevT = smoothstep(3,32,h);
    col.lerp(scrub, elevT*0.95);
    var highT = smoothstep(45,120,h);
    col.lerp(rocky, highT*0.6);
    col.lerp(duneGold, (1-elevT)*0.25);
    // hash-driven patchiness so scrub reads as painterly clumps, not a band
    col.lerp(scrubDry, d*0.15*elevT);
    // broad landscape-scale mottling + lee-slope (east-facing, sheltered from
    // the prevailing onshore wind) darker chaparral banding, so the ground
    // reads patchy/textured from altitude rather than a uniform scrub tint
    var bigPatch = fbm(x*0.0035, z*0.0035, 3);
    col.lerp(scrubDry, bigPatch*0.22*elevT);
    if(h>3){
      var leeD=14, hE=terrainHeight(x+leeD,z), hW=terrainHeight(x-leeD,z);
      var leeT = clamp01((hW-hE)/leeD*4);
      col.lerp(scrub.clone().multiplyScalar(0.7), leeT*0.3*elevT);
    }
    // ECOLOGY-ZONE GROUND (s46, data/peninsula-geography-1849.json): where
    // a baked zone exists, its documented ground treatment overrides the
    // generic elevation gradient (85% — a little base variation survives).
    if(zn>0){
      var zcol = null;
      if(zn===1){
        // Great Sand Bank: ACTIVE transverse dune ridges (prevailing NW
        // wind) — crest direction wanders at two scales and the ridge
        // field is masked patchy (belts of sharp slip-face banding,
        // calmer open sand sheets between) so it never reads as wallpaper
        var wander = Math.sin(x*0.0028 + z*0.0035)*1.8 + Math.sin(x*0.0009 - z*0.0013)*1.2;
        var ridge = 0.5+0.5*Math.sin(x*0.045 + z*0.016 + wander*2.0);
        var ridgeMask = 0.3+0.7*fbm(x*0.0045+11.0, z*0.0045, 2);
        // s62 earth palette: dune sand = warm tan (was 0xd2bd85 cream)
        zcol = new THREE.Color(0xb59f6b).lerp(new THREE.Color(0x8d774c), (0.18 + ridge*0.72)*ridgeMask);
        if(d>0.94) zcol.lerp(new THREE.Color(0x8c8a52), 0.3); // rare scrub fleck
      } else if(zn===2){ // dune scrub: sand base, olive brush patches (s62: tan base, was 0xcdbb84)
        zcol = new THREE.Color(0xb0a06f).lerp(new THREE.Color(0x6d7c44), 0.25+0.5*fbm(x*0.02,z*0.02,2));
      } else if(zn===3){ // grassland/pasture: sage coastal prairie with body (s62: was 0xb3a35e/0x8a9552 tawny-bright)
        zcol = new THREE.Color(0x8f8a52).lerp(new THREE.Color(0x6f7d43), 0.3+0.4*fbm(x*0.015,z*0.015,2));
      } else if(zn===4){ // oak woodland floor: deeper green-brown
        zcol = new THREE.Color(0x6b7a42).lerp(new THREE.Color(0x4c5e30), 0.5*fbm(x*0.03,z*0.03,2));
      } else if(zn===5 && h<2.5){ // tidal marsh: tule green + rusty patches
        zcol = new THREE.Color(0x77804a).lerp(new THREE.Color(0x9c7f4e), 0.35+0.45*fbm(x*0.03,z*0.03,2));
      } else if(zn===6 && h<1.5){ // mudflat: dark wet sheen
        zcol = new THREE.Color(0x4d4334).lerp(new THREE.Color(0x5c4e3a), 0.4*d);
      } else if(zn===7 && h<6){ // riparian willow line: deep green band
        zcol = new THREE.Color(0x5e7a3c).lerp(new THREE.Color(0x486030), 0.5*fbm(x*0.05,z*0.05,2));
      }
      if(zcol) col.lerp(zcol, 0.85);
    }
    // village interior: dusty trodden earth — s60 square kill: the edge is
    // noise-warped (shared villageFeatherT) AND the tint strength is itself
    // patchy, so the trodden zone reads as worn ground bleeding into scrub,
    // never as a uniform lighter rectangle at altitude.
    var dOut = distOutsideBox(x,z,VILLAGE_BOX);
    var villageT = 1-villageFeatherT(x,z,dOut,260);
    // patch strength varies on ~300m lobes (NOT ~60m: per-vertex sampling at
    // the 31m grid + flatShading printed tighter noise as pale hard-edged
    // triangle facets — caught in s60 QA)
    col.lerp(village, villageT*(0.40+0.24*fbm(x*0.0055,z*0.0055,2)));
    // wet mud / beach right at the waterline — SKIPPED on tidal marsh
    // (zone 5): marsh is vegetated to the waterline, tule tone owns it
    if(zn!==5){
      var beachT = 1-smoothstep(0,7,h);
      col.lerp(wetMud, beachT*0.55);
      // INTERTIDAL FLATS (shoreline truth, 2026-07-11): the above-datum part
      // of the mud band (h up to ~+0.45 out of the bake's tidal profile) is
      // WET mud, not beach sand — dark, water-sheened, unmistakably distinct
      // from the dry ground above the high-tide line.
      col.lerp(mudFlat, (1-smoothstep(0.1,0.55,h))*0.85);
    }
    // s46: Seal Rocks islets are bare grey rock, not sand
    if(x<-9740 && z>1350 && z<1950 && TERRAIN.geodata && TERRAIN.geodata.sealRocks){
      var SRK = TERRAIN.geodata.sealRocks;
      for(var sri=0; sri<SRK.length; sri++){
        var srd = Math.hypot(x-SRK[sri][0], z-SRK[sri][1]);
        if(srd<75){ col.lerp(_SEALROCK_GREY, 0.85*(1-smoothstep(30,75,srd))); break; }
      }
    }
  }
  // crisp darker waterline edge band for coast legibility at altitude.
  // Narrowed 3.5m -> 1.3m (s22): the band is height-based, and the new
  // gentle beach banks put |h|<3.5 ground across a 100m+ swath — the wide
  // near-black stain amplified the flat-shaded slope checkerboard.
  var edgeT = 1-smoothstep(0,1.3,Math.abs(h));
  col.lerp(new THREE.Color(0x2c2418), edgeT*0.55*(zn===5?0.15:1)); // marsh keeps its tule tone to the water's edge

  col.r = clamp01(col.r+dither); col.g = clamp01(col.g+dither); col.b = clamp01(col.b+dither);
  return col;
}


/* Outpost geography truth (research/peninsula-1846.md §1/§2, converted to
   world meters via the heightmap's lat/lon convention; verified against the
   baked grid with tools/debug-region.js). Relocated verbatim from
   layers/terrain.js in the 2026-07-12 cleanup — core's shared placement
   engine (PLACEMENT_MISSION_SEGS) and the street graph read it, so it is
   geography truth, not a layer's. Initialized here (earlier than its old
   slot at the end of the terrain chunk) — a pure literal with no deps. */
var OUTPOSTS = {
  mission:  { x:-1997, z:3462, n:7 },
  presidio: { x:-4776, z:-234, n:6 }
};
