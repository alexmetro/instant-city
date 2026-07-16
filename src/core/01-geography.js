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
   2. SINGLE FRAME (user decision + Director concurrence, 2026-07-14 —
      road-master-spec.md SINGLE-FRAME AMENDMENT): GRID_ROT_BASE (-9.0°,
      the measured modern/post-1847 O'Farrell grid) is the ONE frame for the
      entire window. The historical "O'Farrell swing" corrected Vioget's
      ~2.5° error on PAPER in 1847 — no street or building physically
      rotated — so it is NOT modeled as geometry here. The old dual-frame
      machinery (VIOGET_ERROR_DEG 2.5°, the as-built -6.5° VIOGET_SKEW, the
      Feb-Aug 1847 easing) was deleted; it produced a recurring consumer-bug
      class (the -6.5° pin, the cadastre lot shear) for no visible gain. The
      1847 survey remains a full spine/plat CHECKPOINT (streets + lots appear
      on their dates); only the ~2.5° alignment of 1846's few physical
      streets is simplified — a DELIBERATE, TAGGED liberty (that physical
      1846 alignment is itself barely documented, and trails meander by §9b
      law, so this contradicts nothing).
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
                                          // O'Farrell/modern grid; VALIDATION-2026-07-11 §4.1).
                                          // SINGLE-FRAME LIBERTY (2026-07-14): this is now the ONE
                                          // frame for the entire sim window — the animated Vioget
                                          // (-6.5°) → O'Farrell (-9.0°) grid-swing is DELETED as
                                          // geometry (it modeled a paper survey correction as a
                                          // physical rotation that never happened). 1846-47 renders
                                          // at the corrected O'Farrell alignment; the ~2.5° Vioget
                                          // divergence is not modeled as geometry — see
                                          // road-master-spec.md SINGLE-FRAME AMENDMENT. The former
                                          // VIOGET_ERROR_DEG / VIOGET_SKEW_DEG / VIOGET_SKEW chain
                                          // and updateGridSwing()/CURRENT_STREET_SKEW easing were
                                          // deleted with it.
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
   street. SINGLE-FRAME LIBERTY (2026-07-14): the skewAngle parameter is
   retained (paint/overlays/audits still call it), but the ONLY angle any
   consumer passes is now GRID_ROT_BASE — the Vioget-frame branch is gone. */
function gridToWorldAt(u,v,skewAngle){
  var c = Math.cos(skewAngle), s = Math.sin(skewAngle);
  return { x: u*c - v*s + GRID_ORIGIN_X, z: u*s + v*c + GRID_ORIGIN_Z };
}
/* gridToWorld(): THE canonical frame (GRID_ROT_BASE, −9.0°) — the
   measured/post-1847 O'Farrell grid, and now the ONE frame for the entire
   sim window (SINGLE-FRAME AMENDMENT). s77 GEODETIC LOCK FIX: this was once
   pinned at the as-built Vioget −6.5°, so every fixed anchor that reads it
   (GEO.plaza fill, the wharf/anchorage, the fire block, the routing walker
   graph, ship berths) sat 9–13 m off the −9.0° streets it is supposed to
   bound (that pin measured 18 m RMS / 35 m worst vs the OSM control points;
   the canonical −9.0° measures 1.2 m RMS). With the grid-swing deleted there
   is no second frame anywhere — no consumer passes any angle but −9.0°. */
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

/* SINGLE-FRAME LIBERTY (2026-07-14, road-master-spec SINGLE-FRAME AMENDMENT)
   — the old site of updateGridSwing()/CURRENT_STREET_SKEW. The O'Farrell
   grid-swing (the Feb-Aug 1847 -6.5°→-9.0° easing that repainted the streets
   at an animated skew) is DELETED as geometry: the survey correction was a
   paper event, no street physically rotated. What survives is the DATE-DRIVEN
   repaint duty — the ground-splat street layer must still be re-painted when
   simDay crosses a street's survey/first-mention/checkpoint threshold or the
   town's built density changes (streets keep appearing/upgrading for years).
   updateStreetPaint() below is that driver, minus all angle easing — it now
   only decides WHEN to repaint, never at what frame (renderGroundSplat()
   always paints at the one canonical GRID_ROT_BASE frame). */
function updateStreetPaint(){
  // Re-paints the splat canvas when simDay has crossed some street's own
  // survey/worn-track/checkpoint threshold (STREET_REPAINT_THRESHOLDS) — fires
  // unconditionally the first time (LAST_SPLAT_SIMDAY===null), and correctly
  // re-detects a threshold crossing on a BACKWARD time-jump (rewind), not just
  // forward playback.
  var topologyChanged = streetTopologyMayHaveChanged(LAST_SPLAT_SIMDAY, simDay);
  // WEAR-ON-USE fix (task #28 item 3): also repaint when the spawned-
  // building count has moved — street wear now reads nearby built density,
  // which changes continuously as the town grows, not just at the fixed
  // survey/checkpoint thresholds streetTopologyMayHaveChanged() tracks.
  var buildingCountChanged = (spawnedBuildings.length + spawnedTents.length) !== LAST_SPLAT_BUILDING_COUNT; // tents count too (s20 on-use ruling: tent camps wear streets)
  var needRepaint = topologyChanged || buildingCountChanged;
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
      LAST_SPLAT_SIMDAY = simDay;
      LAST_SPLAT_BUILDING_COUNT = spawnedBuildings.length + spawnedTents.length;
      renderGroundSplat();
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
// isn't defined until much further down) rather than left as NaN bait.
var ERA_MAP_SIMDAY = {
  "vioget-1839": -999999, "none": -999999, "primary-corpus": -999999, // already-there-at-sim-start baselines
  "ofarrell-1847": 396,   // Aug 1 1847 — O'Farrell survey CHECKPOINT (streets grow to their surveyed extent; NOT a frame swing — single-frame amendment 2026-07-14)
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
    // SINGLE-FRAME LIBERTY (2026-07-14): the per-street `swings` flag is gone —
    // every street renders at the one canonical GRID_ROT_BASE frame at every
    // date; there is no Vioget-frame branch to select anymore.
    var ckpts = checkpoints.filter(function(c){ return Array.isArray(c.extent); }).map(function(c){
      return { day: ERA_MAP_SIMDAY[c.map]!=null ? ERA_MAP_SIMDAY[c.map] : -999999, extent:c.extent };
    }).sort(function(a,b){ return a.day-b.day; });
    out.push({ id:id, name:name, widthM:widthM, cls:cls||"lane", polyline:polyline, checkpoints:ckpts,
      surveyedDay: appears?appears.surveyedDay:null, firstMentionDay: appears?appears.firstMentionDay:null });
  }
  SG.streets.forEach(function(s){
    // s84: mission-street is now INCLUDED — its dataset polyline is the
    // s84 dune-field-swale route (12 vertices threading the SoMa hollows,
    // re-anchored to Kearny x California per the franchise text), which is
    // topologically truer than the deleted legacy straight line/findLowRoute.
    // presidio-road (new s84 trail) flows through here too. Only the
    // deliberately-empty western-addition pointer is excluded.
    if(s.id==="western-addition-future-streets") return;
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

/* =====================================================================
   PIER-CLASS SPINE MEMBERS (s84 — THE SPINE EXPANSION, road-master-spec.md
   SPINE MEMBERSHIP AMENDMENT). "A wharf is a street on piles." Each pier is a
   first-class spine member (class 'pier') with a CONSTANT surveyed width, DATED
   construction/extension checkpoints (extent grows with the build), and an
   anchor street it extends bayward. Read from window.STREETS_GEOMETRY.piers
   (data/streets-geometry.json, dossier research/outward-and-wharf-network-
   1846-50.md Part 1). PIERS_RUNTIME mirrors STREETS_RUNTIME's shape so the same
   ground-paint pass strokes both — but the pier deck is a PLANK surface over
   WATER (the ground-paint pier branch bypasses the wet-lot skip and paints the
   documented never-lighter-than-terrain plank tone, grounding §9 planked
   exception). The DECK EDGES (centerline +/- width/2) are the mooring / ship-
   exclusion boundary consumed at the ships admission — exposed by
   core/08-cadastre pierEdgesAt()/pierDeckQuad(). No ships code consumes it yet.
   Dates -> simDay via eventDateToSimDay (defined in core/00-boot, available
   here). ===================================================================== */
var PIERS_RUNTIME = (function(){
  if(!SG.piers || !SG.piers.members) return [];
  return SG.piers.members.map(function(m){
    var poly = m.polyline.map(function(p){ return {u:p[0], v:p[1]}; });
    var ck = (m.checkpoints||[]).map(function(c){
      return { day: eventDateToSimDay(c.date), extent: c.extent, lengthFt: c.lengthFt, confidence: c.confidence };
    }).sort(function(a,b){ return a.day-b.day; });
    return { id:m.id, name:m.name, cls:"pier", widthM:m.width_m,
             anchorStreet:m.anchorStreet, anchorFoot:m.anchorFoot, baywardAxis:m.baywardAxis||[1,0],
             polyline:poly, checkpoints:ck,
             birthDay: eventDateToSimDay(m.birth),
             provenance:m.provenance, dossier:m.dossier };
  });
})();
var PIERS_RUNTIME_BY_ID = {}; PIERS_RUNTIME.forEach(function(p){ PIERS_RUNTIME_BY_ID[p.id]=p; });
/* The active checkpoint (largest extent whose date has arrived) for a pier at a
   given simDay, or null if the pier is not yet born OR is still in its
   reaching/pile-driving phase (born but no DECKED checkpoint has fired yet).
   s97 PIER ADMISSION (pier-system-spec §2, the build-out lifecycle): the
   P0 absent -> P1 reaching -> P2 decked states are made legible in the extent
   over time. The old `|| checkpoints[0]` fallback front-loaded the first
   checkpoint's deck onto a pier's birth day; removed so that Central Wharf —
   which COMMENCED 1849-07-07 (birth) but whose first 300 ft of deck is
   documented 1849-08-31 (WAC18490831, the s97 date fix) — carries no deck in
   its reaching window (returns null). Safe for every other pier: each has
   birthDay <= its first checkpoint's day, and where they are equal the loop
   finds that checkpoint immediately (the removed fallback was dead for them). */
function pierActiveCheckpoint(p, day){
  if(day < p.birthDay) return null;
  var active = null;
  for(var i=0;i<p.checkpoints.length;i++){ if(p.checkpoints[i].day <= day) active = p.checkpoints[i]; }
  return active;
}

/* Every simDay where SOME street's rendered state could change — its own
   survey/worn-track dates, or a checkpoint-era boundary that grows its
   drawn extent (read by updateStreetPaint() below, the date-driven repaint
   driver; it must notice Eddy's 1849 extensions or a street's firstMentionDay
   arriving — exactly the "time-jump leaves the world stale" failure class
   the P0 quartet
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
  // s84: pier construction/extension dates are repaint thresholds too, so the
  // deck appears on its birth date and grows at each extension checkpoint.
  PIERS_RUNTIME.forEach(function(p){
    set[p.birthDay]=1;
    p.checkpoints.forEach(function(c){ set[c.day]=1; });
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
// updateStreetPaint() below) triggers an extra repaint whenever the spawned-
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

/* =====================================================================
   THE DATE-EDITABLE HEIGHTFIELD (terrain-morphing-spec §1/§2/§2b/§4,
   temporal-world-model §2 the cascade). Phase B — the machinery only.

   terrainHeightAt(x,z,day) = baseline1846(x,z) + Σ (active morph delta by
   `day`). The baseline is terrainHeight() (the pad/gate 1846 sampler); the
   deltas come from AUTHORED morph operations in TERRAIN_MORPH_OPS. That list
   is EMPTY in the release build, so terrainHeightAt === terrainHeight and the
   public terrain is the 1846 baseline, UNCHANGED. terrainHeight(x,z) itself is
   untouched (no existing caller regresses); terrainHeightAt is the new
   date-parameterized truth every future date-aware consumer reads.

   MORPH-OP MODEL (§2 + §2b): { id, kind:'cut'|'fill'|'move',
     region:[{x,z}...] world polygon, profile:{ targetDeltaM, edgeFalloffM },
     arc:{ startDay, completeDay }, fedBy?:<cut-op-id> }.
   The delta RAMPS LINEARLY over [startDay, completeDay] (the annual-checkpoint
   ramp), is SHAPED by an edge falloff (a graded bank, never a step) so the
   morphed ground blends, and is bounded to the region (surgical). CUT =
   negative targetDeltaM (loose), FILL = positive (surgical), MOVE = a coupled
   cut+fill via the optional narrative `fedBy` link (no volume accounting). A
   PURE function of (x,z,day,ops): zero dice, rewind-exact, identical every
   seed. ===================================================================== */
window.TERRAIN_MORPH_OPS = window.TERRAIN_MORPH_OPS || []; // RELEASE: EMPTY — terrain === 1846 baseline
var TERRAIN_WATERLINE_Y = 0.0;   // the bay water plane (mirrors LM_WATERLINE_Y / WHARF_WATER_Y)
var TERRAIN_LAND_MARGIN = 0.0;   // land <=> ground strictly above the waterline (§4 predicate)
function _morphSegDist(x,z,ax,az,bx,bz){
  var dx=bx-ax, dz=bz-az, l2=dx*dx+dz*dz;
  var t = l2>0 ? ((x-ax)*dx+(z-az)*dz)/l2 : 0;
  t = t<0?0:(t>1?1:t);
  var px=ax+t*dx, pz=az+t*dz;
  return Math.hypot(x-px, z-pz);
}
function _morphPointInPoly(x,z,poly){
  var inside=false;
  for(var i=0,j=poly.length-1;i<poly.length;j=i++){
    var xi=poly[i].x, zi=poly[i].z, xj=poly[j].x, zj=poly[j].z;
    if(((zi>z)!==(zj>z)) && (x < (xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi)) inside=!inside;
  }
  return inside;
}
function _morphDistToEdge(x,z,poly){
  var best=Infinity;
  for(var i=0,j=poly.length-1;i<poly.length;j=i++){
    var d=_morphSegDist(x,z,poly[j].x,poly[j].z,poly[i].x,poly[i].z);
    if(d<best) best=d;
  }
  return best;
}
/* min/max of a region polygon along one world axis ('x' or 'z') — the front's
   travel span for the directional-advance fill (below). */
function _morphAxisBounds(poly, axis){
  var lo=Infinity, hi=-Infinity;
  for(var i=0;i<poly.length;i++){ var c=poly[i][axis]; if(c<lo)lo=c; if(c>hi)hi=c; }
  return { lo:lo, hi:hi };
}
/* the moving front's position along the advance axis at `day` (§2b): starts at
   the shore-side region edge and marches to the far edge as the op ramps. Pure
   of `day`. Shared by morphOpDeltaAt and the atelier's advancing-front overlay. */
function morphAdvanceFront(op, day){
  var adv = op.advance; if(!adv) return null;
  var axis = adv.axis==="z" ? "z" : "x";
  var ab = _morphAxisBounds(op.region, axis), span = ab.hi-ab.lo, ramp = morphOpRamp(op, day);
  return { axis:axis, dir:(adv.dir<0?-1:1), lo:ab.lo, hi:ab.hi,
           front: adv.dir<0 ? (ab.hi - ramp*span) : (ab.lo + ramp*span) };
}
/* the annual-checkpoint ramp (§2b): the delta eases in LINEARLY across the
   op's dated arc, so the cove visibly fills over time. Undated op = fully
   applied (a static edit). Pure of `day`. */
function morphOpRamp(op, day){
  var a = op.arc; if(!a || a.startDay==null || a.completeDay==null) return 1;
  if(day <= a.startDay) return 0;
  if(day >= a.completeDay) return 1;
  return (a.completeDay===a.startDay) ? 1 : (day-a.startDay)/(a.completeDay-a.startDay);
}
/* one op's shaped, ramped delta at (x,z,day). Two shape models:

   UNIFORM (no `advance`, the original): full targetDeltaM in the region
   interior, tapered to 0 across the last edgeFalloffM before the boundary (the
   graded bank), zero outside — the whole region rises together, ramp scaling
   HEIGHT. Unchanged.

   DIRECTIONAL SHORE-ANCHORED (fill op with `advance:{axis,dir,frontFalloffM}`,
   s102b — the reclamation model): a FRONT sweeps along axis*dir as the op ramps
   (ramp scales the front POSITION, not the height). Behind the front (the shore
   side) the ground is raised to the FULL targetDeltaM; ahead of it 0; the moving
   front tapers over frontFalloffM (the graded advancing bank). Only the CROSS-
   axis (lateral) region edges feather by edgeFalloffM — the shore-side (back)
   edge is NOT feathered, so the fill butts hard against the anchored waterfront
   land and can never leave a water gap (the disjoint mid-cove-slab defect the
   uniform model produced when its region floated off the shore). Pure of `day`;
   rewind-exact; ramp 0 -> no fill. */
function morphOpDeltaAt(op, x, z, day){
  var prof = op.profile || {}, target = prof.targetDeltaM || 0;
  if(!target) return 0;
  var ramp = morphOpRamp(op, day);
  if(ramp <= 0) return 0;
  var poly = op.region;
  if(!poly || poly.length < 3 || !_morphPointInPoly(x,z,poly)) return 0;
  var fall = prof.edgeFalloffM || 0;
  if(op.advance && op.kind==="fill"){
    var f = morphAdvanceFront(op, day), ff = op.advance.frontFalloffM || 0;
    var coord = f.axis==="x" ? x : z;
    var frontShape = f.dir<0
      ? (ff>0 ? smoothstep(f.front, f.front+ff, coord) : (coord>=f.front?1:0))   // shore on +axis side
      : (ff>0 ? (1 - smoothstep(f.front-ff, f.front, coord)) : (coord<=f.front?1:0)); // shore on -axis side
    if(frontShape <= 0) return 0;
    var crossAxis = f.axis==="x" ? "z" : "x", cb = _morphAxisBounds(poly, crossAxis);
    var cc = crossAxis==="x" ? x : z;
    var lateral = fall>0 ? smoothstep(0, fall, Math.min(cc-cb.lo, cb.hi-cc)) : 1;
    return target * frontShape * lateral;
  }
  var shape = fall > 0 ? smoothstep(0, fall, _morphDistToEdge(x,z,poly)) : 1;
  return target * ramp * shape;
}
/* the active-delta stack at (x,z,day). ops defaults to the release list
   (window.TERRAIN_MORPH_OPS); the atelier passes its own list (release ops +
   the demo op) so the machinery is provable without authoring release ops. */
function morphDeltaAt(x, z, day, ops){
  ops = ops || window.TERRAIN_MORPH_OPS;
  if(!ops || !ops.length) return 0;
  var sum = 0;
  for(var i=0;i<ops.length;i++) sum += morphOpDeltaAt(ops[i], x, z, day);
  return sum;
}
/* THE DATE-PARAMETERIZED HEIGHT (§1). Empty ops -> === terrainHeight (baseline). */
function terrainHeightAt(x, z, day, ops){
  return terrainHeight(x, z) + morphDeltaAt(x, z, day, ops);
}
/* THE ONE PREDICATE (§4): land <=> ground above the waterline at date. Building
   placement, cove water-lots, wharf-fill and anchorage all reduce to this. */
function isLandAt(x, z, day, ops){
  return terrainHeightAt(x, z, day, ops) > TERRAIN_WATERLINE_Y + TERRAIN_LAND_MARGIN;
}
/* shorelineAt(day): the DERIVED coast (§4) — a coarse contour sample of the
   CONTIGUOUS mainland's seaward edge, not the outermost crossing. Per z-row it
   marches from a known-inland start (far west, on the peninsula) seaward: it
   skips any leading water, LATCHES on the first land, then records the FIRST
   land->water crossing of that contiguous land run and STOPS. An OFFSHORE body
   (a detached fill island in open water) therefore never moves the shore — the
   defect where the old outermost-crossing contour snapped to a disjoint slab's
   far edge and zigzagged is closed by construction. The result is a function of
   z (one x per row), so it is monotone in z and cannot self-cross; as a shore-
   CONNECTED fill raises the cove the contiguous run extends and the sampled
   shore advances seaward on its own. */
function shorelineAt(day, ops){
  var pts=[];
  for(var z=-360; z<=1180; z+=30){
    var onLand=false, found=null;
    for(var x=-200; x<=1500 && found===null; x+=12){
      var land = isLandAt(x, z, day, ops);
      if(!onLand){ if(land) onLand=true; }          // skip leading water; latch the mainland
      else if(!land){ found = x; }                   // first land->water of that run = the coast
    }
    if(found!==null) pts.push({ x:found, z:z });
  }
  return pts;
}

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
