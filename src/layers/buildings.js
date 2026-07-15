/* =====================================================================
   LAYER buildings (slot 3, s94a BUILDINGS v2 ADMISSION — PART A: THE LANDMARK
   REGISTRY + CONSTRUCTION STATES). OWNS: the AUTHORED half of the buildings
   world only — every reservation in the live cadastre (reservationsAt/
   GROUND_RESERVATIONS) rendered as a class-appropriate structure at its
   RESOLVED footprint, oriented to its frontage normal, arriving through the
   C0->C4 construction states over sim time and burning at its documented date.
   ZERO dice — landmarks are authored data (building-spawn-spec §1 THE
   AUTHORED/SIMULATED LINE), identical at every seed and every jump.

   READS: cadastre (reservationsAt / GROUND_RESERVATIONS / resolveReservation-
   Footprint / reservationById), the placement engine (registerPlacement +
   PLACEMENT_INDEX + PLACEMENT_STREET_SEGS for the ROW audit), the sim clock
   (simDay / eventDateToSimDay), terrainHeight, and the shared geometry kit
   (bake / makeBoxLocal / makeGableRoof / colorizeUniform / mergeGeoms from
   core/02-scene). NEVER: moves a centerline / lot / parcel / reservation,
   paints ground, or DECIDES where a building goes (that is Part B — the
   procedural/anonymous FILL — a LATER sprint; this file renders ONLY the
   record's already-reserved ground).

   IMPORT-REVIEW RECORD (foundation-reset §3.1, donor `git show
   legacy:src/layers/buildings.js`, the s76 v2 build that predates the cadastre):
     KEPT (the asset/geometry kit — the reusable substrate): the KIT palette
       family + kitWoodColor + hash1 + kitLibertyAccent (the documented
       weathered-wood / adobe / brick / canvas colour world); the front-axis
       orientation convention (the s76 §1.6 fix — the door decal is on the +z
       front face BY CONSTRUCTION, yaw derived from the frontage normal, so the
       s72 facing defect cannot recur); the foundation-skirt idea (a base pad so
       nothing reads as standing on stilts); and the construction scale-in RAMP
       concept (age->scale over a lead window) as the basis for the C0->C4
       machine.
     DELETED, not reconciled (the growth-spawn lineage the spec outlaws): the
       entire buildVillage() village-grid placer and its ~20-draw seeded
       placeBuilding(), growthBuildingCandidates / growthTargets / growReveal /
       growRevealStaged, pickFrontageSpot / nearestStreetDirUV / frontify,
       buildFireBlock (the hand-placed Dec-1849 fire block — the registry's
       dated reservations replace it), dayForBuildingIndex / dayForTentIndex
       spawn indexing, the tent/cart/worker construction-crew meshes, and every
       orientation / lot computation that lived OUTSIDE the reservation path.
       Also NOT ported: the hand-placed authored buildings buildMissionDolores /
       buildPresidio / buildTownChapel / buildFlagpole (landmark-reservations
       _meta.out_of_scope_this_pass — Mission/Presidio are named parcels /
       terrain-era; chapel + flagpole are not in the plaza-cluster registry). If
       wanted later they enter as REGISTRY entries, never hand-placed code.
     The generic geometry helpers (bake / makeBoxLocal / makeGableRoof /
       colorizeUniform / mergeGeoms) were relocated to core/02-scene during the
       foundation cut, so this layer CONSUMES them from there. The building-
       specific kit (the KIT palette, hash1, kitWoodColor) went out WITH the
       donor, so it is re-declared here (LM_KIT / hash1 / lmWoodColor) — the
       bible's own documented values, zero-dice.

   GREAT SPLIT: this file holds 1 chunk (build-app.js FILES). Its chunk number
   (16) is the donor's original — sparse gaps are fine; it lands after ground-
   paint (14) and before labels (40), the buildings draw slot.
   ===================================================================== */
/* @P1850-CHUNK 16 — buildings: THE LANDMARK REGISTRY renderer + construction states C0->C4 */

/* ---- RELEASE DEFAULT (flagged for user sign-off): landmark structures ON in
   the release build, matching the reservations already drawn as ground + named
   by labels. One named constant governs the boot state; the atelier toggle
   overrides at runtime (dev only). ---- */
var LM_ON_AT_RELEASE = true;

/* =====================================================================
   THE KIT (donor s72 UNIFICATION — architecture-1846-50.md, the Building
   Bible). Re-declared HERE (the donor's KIT was deleted with buildings.js in
   the foundation cut; kitWoodColor/hash1/kitLibertyAccent live in core/02-scene
   only as the growth kit consumed them). Values are the bible's own documented
   weathered-wood / adobe / brick / whitewash / canvas family so the town reads
   as ONE material world. hash1() (core) keys palette choices WITHOUT touching
   any seeded stream — landmarks are zero-dice, so this is deterministic per
   landmark id, never an rng draw. ===================================================================== */
var LM_KIT = {
  woodFresh: 0x8a7c6a, woodSilver: 0xa8a196, woodMid: 0x998b78,   // weathered fir/redwood span
  whiteTrim: 0xf2ede0, whitewash: 0xe8e2d0,                       // white-lead trim / whitewash
  adobe: 0x9c8060, adobeWet: 0x6e5a45,                            // warm mud brick
  brick: 0x9c5a44, brickDark: 0x7a3f30,                           // Howard & Mellus first-brick red
  canvas: 0xd8cba8,                                               // undyed canvas
  doorDark: 0x33291d, roofWood: 0x5a4a38, roofWorn: 0x6b5a44, roofTile: 0x7a4a34,
  pad: 0x574a3a                                                   // foundation-pad earth (donor skirt colour)
};
/* one deterministic hash -> [0,1) keyed by an integer (donor's hash1, KEPT).
   It does NOT draw from rngBuild/Math.random — palette choice never perturbs a
   seeded stream, and landmarks are zero-dice, so this is a pure per-id constant. */
function hash1(k){ var x = Math.sin((k + 1) * 12.9898) * 43758.5453; return x - Math.floor(x); }
/* deterministic weathered-wood body tone from an integer key (no-rng hash, so
   palette choice never perturbs a seeded draw stream). */
function lmWoodColor(hkey, ageT){
  var t = (hash1(hkey) * 0.55) + (ageT != null ? ageT * 0.35 : 0.2);
  return new THREE.Color(LM_KIT.woodFresh).lerp(new THREE.Color(LM_KIT.woodSilver), clamp(t, 0, 1));
}

/* =====================================================================
   THE LANDMARK CLASS TABLE (authored, IN THE LAYER, documented). The
   reservation data carries no `class`, so the structure nature is mapped here
   from the dossier — this decides the kit look (body/roof colour, storeys/
   height, roof pitch) AND the construction lead-time. One authored table, zero
   inference at render time. ===================================================================== */
var LM_CLASS = {
  "custom-house":          "adobe",   // §1.7 old Mexican adobe 'La Casa Grande', tiled roof
  "school-house":          "civic",   // §1.13 one-room frame civic building
  "city-hotel":            "hotel",   // §1.1 the settlement's first true hotel
  "parker-house":          "hotel",   // §1.2 two-story wood frame, balcony the length of the Square
  "el-dorado":             "hotel",   // §1.3 canvas -> 3-story building (multi-stage note below)
  "dennisons-exchange":    "hotel",   // §1.4 the gambling exchange (fire origin)
  "bella-union":           "hotel",   // §1.5 the Washington-St gambling saloon
  "alta-california-office": "store",   // §1.10 the newspaper's frame office
  "howard-mellus-store":   "brick",   // §1.12 the FIRST BRICK BUILDING in San Francisco (1848)
  "shades-tavern":         "store",   // §3.6 second-tier tavern + bowling alleys
  "portsmouth-house":      "hotel",   // §1.6 Clay-St hotel, 'enlarged to double its size' by 1848
  "merchants-exchange":    "civic",   // §1.8 purpose-built two-story commercial hall
  "california-star-office": "store",   // §1.10 the printing office (rear-lot, modest)
  "post-office":           "civic"    // §1.9 the formal Clay & Pike civilian post office
};
var LM_CLASS_DEFAULT = "store";
function lmClassOf(id){ return LM_CLASS[id] || LM_CLASS_DEFAULT; }

/* per-class kit: full (C4) height, roof ridge height, body/roof colour source.
   Height is the COMPLETE massing; the construction ramp scales it by hFrac. */
var LM_CLASS_KIT = {
  civic:  { h: 5.6, ridge: 2.2, roof: LM_KIT.roofWorn,  body: function(k){ return new THREE.Color(LM_KIT.whitewash); } },
  hotel:  { h: 6.6, ridge: 2.0, roof: LM_KIT.roofWood,  body: function(k){ return lmWoodColor(k, 0.35); } },
  store:  { h: 4.2, ridge: 1.6, roof: LM_KIT.roofWorn,  body: function(k){ return lmWoodColor(k, 0.2); } },
  adobe:  { h: 4.0, ridge: 0.9, roof: LM_KIT.roofTile,  body: function(k){ return new THREE.Color(LM_KIT.adobe); } },
  brick:  { h: 4.8, ridge: 1.4, roof: LM_KIT.roofWood,  body: function(k){ return new THREE.Color(LM_KIT.brick); } },
  canvas: { h: 3.0, ridge: 1.2, roof: LM_KIT.canvas,    body: function(k){ return new THREE.Color(LM_KIT.canvas); } }
};
function lmKitOf(id){ return LM_CLASS_KIT[lmClassOf(id)] || LM_CLASS_KIT.store; }

/* =====================================================================
   OPTION B — NEUTRAL PLACEHOLDER MASSING (user ruling 2026-07-14, s94a-b RIDER:
   the legacy wood/adobe/brick kit skin above "masquerades as final graphical
   output"). The rendered SKIN is now ONE neutral material world — a light grey
   volume + a flat roof cap — with only a SUBTLE per-legibility tint (civic vs
   commercial vs dwelling a hair apart) so classes read at a glance WITHOUT
   reading as materials: no grain, no weathering, no palette variety. It must
   read as a DIAGRAM, not a building. The STRUCTURAL machinery is UNCHANGED —
   resolved footprint dims, C0->C4 construction scaling, and the per-class heights
   (LM_CLASS_KIT.h, still consumed) all stand; ONLY colour changes here. The kit
   palette above is retained as the documented substrate for the DEFERRED
   per-landmark graphics program (spec §1) — it simply no longer paints the
   placeholder. ===================================================================== */
var LM_PLACEHOLDER = {
  body:   0x9ea19c,   // light neutral grey — the base massing
  roof:   0x868984,   // a hair darker neutral — the flat roof cap
  pad:    0x6f6b63,   // neutral site-pad grey (donor foundation-skirt, de-tinted)
  marker: 0xff6a1a    // HIGH-CONTRAST entrance/front accent (orange) — legible to town-500m
};
/* SUBTLE per-legibility category tint — a hair off neutral, NOT a palette. The
   authored LM_CLASS collapses to a coarse civic/commercial/dwelling read tinted
   onto the neutral body so classes are distinguishable at the plaza framing. */
var LM_TINT = { civic: 0xb7c1c7, commercial: 0x9ea19c, dwelling: 0xb8b2a4 };
var LM_CATEGORY = { civic:"civic", adobe:"civic", hotel:"commercial", store:"commercial",
                    brick:"commercial", canvas:"dwelling" };
function lmBodyColor(id){
  var cat = LM_CATEGORY[lmClassOf(id)] || "commercial";
  return new THREE.Color(LM_TINT[cat] || LM_PLACEHOLDER.body);
}
/* a flat ground triangle (arrowhead), position+color only — merges via mergeGeoms. */
function lmTriLocal(ax, az, bx, bz, cx2, cz2, yy, color){
  var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([ax,yy,az, bx,yy,bz, cx2,yy,cz2]), 3));
  return colorizeUniform(g, color);
}

/* =====================================================================
   THE CONSTRUCTION-STATE MACHINE (C0->C4, building-spawn-spec §1 / brief §3;
   user ruling 2026-07-14 "nothing appears instantly"). The arc runs in the
   window [built - leadDays, built]; `built` (the reservation date) is C4
   completion. States: C0 absent -> C1 site/pad -> C2 frame (partial massing) ->
   C3 walls (taller massing) -> C4 complete. The VISUAL is deliberately MINIMAL
   this sprint (scaffolds / workers / staging art are DEFERRED to the later
   graphical program, spec §1) — the requirement is a MONOTONIC, visible arc, not
   a real construction site.

   CONSTRUCTION_LEAD_DAYS — my authored fill:true tunables (period-true ranges,
   spec §1). A documented `constructionStart` in the reservation data OVERRIDES
   (none present in the s94 bake; honoured if a later pass adds it). ===== */
var CONSTRUCTION_LEAD_DAYS = {
  civic:   90,   // major/civic (Merchants' Exchange, School House, Post Office): weeks-to-months
  hotel:   90,   // City Hotel / Parker House / El Dorado / Bella Union / Portsmouth House / Dennison's
  store:   21,   // frame store/office: days-to-weeks
  frame:   21,
  adobe:   60,   // slower mass construction
  brick:   90,   // Howard & Mellus first brick
  canvas:   1,   // tent/canvas: hours-to-a-day (Taylor: "as if by magic in a single night")
  default: 30
};
function lmLeadDays(rec){
  var cls = lmClassOf(rec.landmarkId);
  return CONSTRUCTION_LEAD_DAYS[cls] != null ? CONSTRUCTION_LEAD_DAYS[cls] : CONSTRUCTION_LEAD_DAYS.default;
}
/* documented constructionStart override (data wins over the class default). */
function lmStartDay(rec){
  var a = rec.anchor || {};
  var csIso = (rec.dates && rec.dates.constructionStart) || a.constructionStart || rec.constructionStart;
  if(csIso){ var d = eventDateToSimDay(csIso); if(isFinite(d) && d <= rec.built) return d; }
  return rec.built - lmLeadDays(rec);
}
/* the state + continuous height fraction at `day`. Pure function of the record +
   day (zero dice) — the determinism / monotonic guarantees rest here. */
function lmStateAt(rec, day){
  var startDay = lmStartDay(rec), lead = rec.built - startDay;
  var out = { state: 0, hFrac: 0, arc: 0, active: false, startDay: startDay, lead: lead };
  if(rec.burned != null && day >= rec.burned) return out;      // burned -> absent (C0) from that day
  if(day < startDay) return out;                                // before ground is broken -> absent
  var arc = lead > 0 ? clamp((day - startDay) / lead, 0, 1) : 1;
  if(day >= rec.built) arc = 1;                                 // completed: hold C4 until burned
  var state = arc < 0.15 ? 1 : (arc < 0.5 ? 2 : (arc < 0.85 ? 3 : 4));
  var hFrac = state === 1 ? 0 : (state === 2 ? 0.45 : (state === 3 ? 0.8 : 1.0));
  out.state = state; out.hFrac = hFrac; out.arc = arc; out.active = true;
  return out;
}

/* =====================================================================
   FOOTPRINT + ORIENTATION (data-driven — the s72 facing bug cannot occur here
   by construction). The frontage normal is DERIVED from the resolved footprint
   quad (SW,SE,NE,NW in the block's u,v axes) + the anchor's frontage/corner —
   ONE function used by BOTH the renderer and the orientationLandmark audit, so
   the rendered door face and the reservation frontage normal are the SAME
   vector by definition. ===================================================================== */
function lmUnit(x, z){ var l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; }
/* map a block EDGE name -> its outward-facing unit normal (world), from the
   footprint's +u/+v world axes. The single canonical edge->normal mapping shared
   by block-frontage and the plaza CORNER RULE. */
function lmEdgeToNormal(edge, uAx, vAx){
  switch(edge){
    case "west":  return lmUnit(-uAx.x, -uAx.z);
    case "east":  return lmUnit( uAx.x,  uAx.z);
    case "north": return lmUnit(-vAx.x, -vAx.z);
    case "south": return lmUnit( vAx.x,  vAx.z);
  }
  return null;
}
/* the four bounding-street outward normals of a footprint (its edge normals) —
   the set the orientationLandmark street-alignment clause measures against. */
function lmEdgeNormals(fp){
  var q = fp.quad;
  var uAx = lmUnit(q[1].x - q[0].x, q[1].z - q[0].z);
  var vAx = lmUnit(q[3].x - q[0].x, q[3].z - q[0].z);
  return [ {x:uAx.x,z:uAx.z}, {x:-uAx.x,z:-uAx.z}, {x:vAx.x,z:vAx.z}, {x:-vAx.x,z:-vAx.z} ];
}
/* the bounding-street ids per edge for a reservation's block (plaza block for a
   plaza-exception; the documented block otherwise) — lets a street NAME resolve
   to one edge. */
function lmBlockEdges(rec){
  var a = rec.anchor || {};
  if(a.kind === "plaza-exception") return (typeof CAD_PLAZA_BLOCK !== "undefined" && CAD_PLAZA_BLOCK) ? CAD_PLAZA_BLOCK.edges : null;
  var key = rec.block || a.block;
  if(typeof cadReservationBlockIndex === "function" && key){ var b = cadReservationBlockIndex()[key]; return b ? b.edges : null; }
  return null;
}
/* resolve a street NAME to the block edge (west/east/north/south) that carries
   it — exact id match, then a substring tolerance for id/name drift. */
function lmStreetToEdge(edges, street){
  if(!edges || !street) return null;
  street = String(street).toLowerCase().trim();
  var names = { west:edges.west, east:edges.east, north:edges.north, south:edges.south }, k;
  for(k in names){ if(names[k] && String(names[k]).toLowerCase() === street) return k; }
  for(k in names){ var n = names[k] ? String(names[k]).toLowerCase() : ""; if(n && (n.indexOf(street) >= 0 || street.indexOf(n) >= 0)) return k; }
  return null;
}
/* the optional `anchor.facing` OVERRIDE (spec §1.6): a cardinal edge word/letter,
   a bounding-street name, or (rare escape hatch) an intercardinal bearing. The
   first two resolve to ONE edge and pass the audit; a genuine intercardinal
   diagonal is returned as-is and the street-alignment clause REJECTS it by design. */
function lmFacingNormal(facing, edges, uAx, vAx){
  var f = String(facing).toLowerCase().trim();
  var card = { north:"north", n:"north", south:"south", s:"south", east:"east", e:"east", west:"west", w:"west" };
  if(card[f]) return lmEdgeToNormal(card[f], uAx, vAx);
  var edge = lmStreetToEdge(edges, f);
  if(edge) return lmEdgeToNormal(edge, uAx, vAx);
  var inter = { ne:["north","east"], nw:["north","west"], se:["south","east"], sw:["south","west"] };
  if(inter[f]){
    var e0 = lmEdgeToNormal(inter[f][0], uAx, vAx), e1 = lmEdgeToNormal(inter[f][1], uAx, vAx);
    if(e0 && e1) return lmUnit(e0.x + e1.x, e0.z + e1.z);
  }
  return null;
}
/* outward-facing unit normal (world) for a reservation, from its footprint quad.
   CORNER RULE (building-spawn-spec §1.6, s94a): a corner reservation faces ONE
   street — never the 45° diagonal (the retired plaza-civics defect). */
function lmFrontageNormal(rec, fp){
  var q = fp.quad;                                              // [SW, SE, NE, NW]
  var uAx = lmUnit(q[1].x - q[0].x, q[1].z - q[0].z);          // +u world axis (SW->SE)
  var vAx = lmUnit(q[3].x - q[0].x, q[3].z - q[0].z);          // +v world axis (SW->NW)
  var a = rec.anchor || {};
  if(a.facing){                                                 // explicit override wins (any anchor)
    var nf = lmFacingNormal(a.facing, lmBlockEdges(rec), uAx, vAx);
    if(nf) return nf;
  }
  if(a.kind === "plaza-exception"){
    // face the FIRST street in frontStreet, mapped to the plaza block edge that
    // carries it — a SINGLE edge's outward normal, never the corner bisector.
    var first = String(a.frontStreet || "").split("/")[0];
    var edge = lmStreetToEdge(lmBlockEdges(rec), first);
    var pn = lmEdgeToNormal(edge, uAx, vAx);
    if(pn) return pn;
    // street unmatched: fall back to the corner's N/S edge — still ONE edge, never a diagonal
    return lmEdgeToNormal((a.corner === "NW" || a.corner === "NE") ? "north" : "south", uAx, vAx) || { x: 0, z: 1 };
  }
  switch(a.frontage){                                           // block-frontage: outward = away from block interior
    case "west":  return lmUnit(-uAx.x, -uAx.z);
    case "east":  return lmUnit( uAx.x,  uAx.z);
    case "north": return lmUnit(-vAx.x, -vAx.z);
    case "south": return lmUnit( vAx.x,  vAx.z);
  }
  return { x: 0, z: 1 };
}
/* footprint dims (width along frontage, depth into block) + centroid + yaw.
   yaw turns the local +z (door face) onto the frontage normal (see lmBakeAt). */
function lmFootprint(rec, fp){
  var q = fp.quad;
  var lenU = Math.hypot(q[1].x - q[0].x, q[1].z - q[0].z);      // SW->SE
  var lenV = Math.hypot(q[3].x - q[0].x, q[3].z - q[0].z);      // SW->NW
  var a = rec.anchor || {}, w, d;
  if(a.kind === "plaza-exception"){ w = lenU; d = lenV; }        // uLo..uHi = width, vLo..vHi = depth
  else if(a.frontage === "west" || a.frontage === "east"){ w = lenV; d = lenU; } // facade along v, depth in u
  else { w = lenU; d = lenV; }                                  // facade along u, depth in v
  var n = lmFrontageNormal(rec, fp);
  return { w: w, d: d, cx: fp.cx, cz: fp.cz, yaw: Math.atan2(n.x, n.z), nx: n.x, nz: n.z };
}

/* =====================================================================
   THE LAND-AT-DATE GATE (s99, terrain-morphing-spec §4/§7-step-2 INTERIM). A
   landmark renders only where its base stands on buildable land. This is the
   STATIC interim of the isLandAt predicate: the date-editable heightfield (which
   lets the cove FILL and these reservations LAND on their documented dates) is
   step 2 — until then a waterfront reservation anchored on the un-filled 1846
   cove is UNLANDED and does not render (it is not deleted: the reservation stands
   and returns the day the fill reaches it). terrainHeight + the y=0 waterline are
   read as-is; no data is edited. ===================================================================== */
var LAND_FLOOR       = 0.5;   // m — buildable-land floor: mean water (y=0) + tide/headroom. fill:true tunable.
var LM_WATERLINE_Y   = 0.0;   // bay water plane (mirrors wharves.js WHARF_WATER_Y; local — chunk 16 loads before chunk 17)
var LM_CORNER_DEEP_M = 1.0;   // even a dry-CENTROID landmark is unlanded if a footprint corner is deeper than this under water
/* authored exceptions (item 5): a pile-built / water-lot / over-water structure
   legitimately stands over water and is NOT gated or flagged. None are set in the
   s95 reservation data today — the fields are threaded so a future authored
   waterfront structure passes the gate and the buildingInWater audit. */
function lmExceptionOverWater(rec){ var a = rec.anchor || {}; return !!(rec.overWater || a.overWater); }
function lmExceptionStilted(rec){ var a = rec.anchor || {}; return !!(rec.stilted || a.stilted); }
/* UNLANDED test: returns null when the landmark is landed (renders), else a
   descriptor (surfaced by registryHonored as reserved-but-unlanded). Base-
   submerged ⇔ terrainHeight(centroid) ≤ LAND_FLOOR (kills sign-of-the-watch,
   cross-hobson-co). Edge-over-water tolerance: a dry-centroid landmark with only
   a shallow corner dip (centre-market's −0.07 m NE corner) stays LANDED — it is
   unlanded on corners only when a corner is more than LM_CORNER_DEEP_M under water. */
function lmUnlandedAt(rec, fp){
  if(!fp) return null;                                          // block not born at `day` — handled by the caller's own skip
  if(lmExceptionOverWater(rec)) return null;                    // authored water-lot / pile-built — legitimately over water
  var cH = terrainHeight(fp.cx, fp.cz);
  var q = fp.quad, minCornerH = Infinity;
  for(var i = 0; i < q.length; i++){ var h = terrainHeight(q[i].x, q[i].z); if(h < minCornerH) minCornerH = h; }
  var baseSubmerged = cH <= LAND_FLOOR;
  var cornerDeep    = (LM_WATERLINE_Y - minCornerH) > LM_CORNER_DEEP_M;
  if(!baseSubmerged && !cornerDeep) return null;
  return { landmarkId: rec.landmarkId, centroidH: +cH.toFixed(3), minCornerH: +minCornerH.toFixed(3),
           mUnderFloor: +(LAND_FLOOR - cH).toFixed(3), mUnderWater: +(LM_WATERLINE_Y - cH).toFixed(3),
           reason: baseSubmerged ? "base-submerged" : "corner-deep-underwater" };
}

/* =====================================================================
   THE DERIVED SET (pure function of `day`) — the ONE source of truth read by
   BOTH the renderer and every audit (measurement law: the instrument reads the
   same numbers the picture draws). Iterates the resolved reservations, resolves
   each footprint AT `day` (day-frame, never a stale baked frame — cadSkewAt is
   the single -9.0 lock, so this is day-invariant but re-resolved honestly), and
   attaches its construction state. Landmarks in their lead window (before
   `built`, so NOT yet in reservationsAt) are included at C1..C3; completed ones
   (reservationsAt's set) are C4. ZERO dice. ===================================================================== */
function deriveLandmarkSet(day){
  var out = [];
  var R = (typeof GROUND_RESERVATIONS !== "undefined") ? GROUND_RESERVATIONS : [];
  for(var i = 0; i < R.length; i++){
    var rec = R[i];
    if(!rec.resolved) continue;                                 // unresolved (block absent) — surfaced, never forced
    var st = lmStateAt(rec, day);
    if(!st.active) continue;                                    // C0 absent (before start / after burn)
    var fp = resolveReservationFootprint(rec, day);             // day-frame footprint (brief §4)
    if(!fp) continue;                                           // block not born at `day` — skip, never force
    if(lmUnlandedAt(rec, fp)) continue;                         // s99 LAND-AT-DATE GATE: un-render unlanded landmarks (returns in step 2 when the cove-fill lands)
    var f = lmFootprint(rec, fp);
    out.push({ id: rec.landmarkId, name: rec.name, cls: lmClassOf(rec.landmarkId),
               cx: f.cx, cz: f.cz, w: f.w, d: f.d, yaw: f.yaw, nx: f.nx, nz: f.nz,
               state: st.state, hFrac: st.hFrac, arc: st.arc,
               overWater: lmExceptionOverWater(rec), stilted: lmExceptionStilted(rec),
               built: rec.built, burned: rec.burned });
  }
  out.sort(function(a, b){ return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); }); // stable order (determinism fingerprint)
  return out;
}

/* =====================================================================
   THE RENDERER. LM_GROUP holds one Mesh per active landmark; rebuilt when the
   integer sim day changes (labels' _lblLastDay pattern). Between rebuilds the
   set is static (a building does not visibly grow within one day; the C0->C4
   ramp spans the whole lead window across many integer days, so the transition
   is smooth and monotonic without per-frame work). ===================================================================== */
var LM_GROUP = new THREE.Group(); LM_GROUP.frustumCulled = false; LM_GROUP.visible = LM_ON_AT_RELEASE; scene.add(LM_GROUP);
var LM_MAT = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, specular: 0x000000, shininess: 0 });
var _lmLastDay = null;
var LM_INSET = 0.6;   // shrink the body a hair inside the reserved quad (curb/neighbour gap)

/* bake a base-pivoted local geometry: place at local (lx,ly,lz), turn its +z
   onto the frontage normal (yaw about +Y — rotateY(yaw) maps local +z to world
   (sin yaw, cos yaw), matching core bake()'s convention), translate to world. */
function lmBakeAt(geo, lx, ly, lz, yaw, wx, wy, wz){
  geo.translate(lx, ly, lz);
  geo.rotateY(yaw);
  geo.translate(wx, wy, wz);
  return geo;
}
function lmBuildMesh(e){
  var y = terrainHeight(e.cx, e.cz);
  var w = Math.max(e.w - LM_INSET, 1.2), d = Math.max(e.d - LM_INSET, 1.2);
  var parts = [];
  // C1..C4: a low neutral site pad (donor foundation-skirt idea) — the "site" read
  var pad = makeBoxLocal(w, 0.3, d, new THREE.Color(LM_PLACEHOLDER.pad));
  bake(pad, new THREE.Vector3(e.cx, y, e.cz), e.yaw);
  parts.push(pad);
  // GROUND ARROW — the front/entrance orientation aid, present from C1 so the
  // facing reads even at the site stage. A flat high-contrast arrowhead just
  // beyond the front (+z) edge, pointing OUT along the frontage normal.
  var az0 = d / 2 + 0.4, aLen = Math.max(2.2, Math.min(w * 0.6, 4.2)), aHW = Math.max(1.0, Math.min(w * 0.28, 1.9));
  var arrow = lmTriLocal(-aHW, az0, aHW, az0, 0, az0 + aLen, 0.14, new THREE.Color(LM_PLACEHOLDER.marker));
  lmBakeAt(arrow, 0, 0, 0, e.yaw, e.cx, y, e.cz);
  parts.push(arrow);
  if(e.state >= 2){                                             // C2/C3/C4: the NEUTRAL massing, scaled by hFrac
    var kit = lmKitOf(e.id);                                    // per-class HEIGHT only (skin is neutral)
    var h = Math.max(kit.h * e.hFrac, 0.8);
    var body = makeBoxLocal(w, h, d, lmBodyColor(e.id));        // Option B: one neutral material + a subtle class tint
    bake(body, new THREE.Vector3(e.cx, y + 0.28, e.cz), e.yaw);
    parts.push(body);
    // FLAT ROOF CAP — a thin neutral slab (no gable: a pitched roof reads as a
    // finished building; this must read as placeholder massing).
    var roof = makeBoxLocal(w + 0.2, 0.28, d + 0.2, new THREE.Color(LM_PLACEHOLDER.roof));
    bake(roof, new THREE.Vector3(e.cx, y + 0.28 + h, e.cz), e.yaw);
    parts.push(roof);
    // FRONT-FACE STRIPE (brief §2) — a bold high-contrast vertical bar centred on
    // the +z (front) face, protruding a hair so it catches light. The instantly-
    // readable entrance indicator; with the ground arrow, legible at plaza-150m
    // and town-500m. It sits on the front face BY CONSTRUCTION (yaw = frontage
    // normal), so it is also the visible proof of the corner-rule orientation fix.
    var stripeH = Math.max(h * 0.9, 0.8);
    var stripe = makeBoxLocal(Math.min(0.9, w * 0.42), stripeH, 0.18, new THREE.Color(LM_PLACEHOLDER.marker));
    lmBakeAt(stripe, 0, 0.28, d / 2 - 0.02, e.yaw, e.cx, y, e.cz);
    parts.push(stripe);
  }
  var mesh = new THREE.Mesh(mergeGeoms(parts), LM_MAT);
  mesh.frustumCulled = false;
  mesh.userData.landmarkId = e.id;
  mesh.userData.state = e.state;
  return mesh;
}
function lmClear(){
  for(var i = LM_GROUP.children.length - 1; i >= 0; i--){
    var o = LM_GROUP.children[i]; LM_GROUP.remove(o); if(o.geometry) o.geometry.dispose();
  }
}
function rebuildLandmarks(){
  lmClear();
  var set = deriveLandmarkSet(simDay);
  for(var i = 0; i < set.length; i++) LM_GROUP.add(lmBuildMesh(set[i]));
  _lmLastDay = Math.floor(simDay);
}
function updateLandmarks(){
  if(!LM_GROUP.visible){ return; }
  if(Math.floor(simDay) !== _lmLastDay) rebuildLandmarks();
}

/* =====================================================================
   OCCUPANCY REGISTRATION (brief §1: "you MUST registerPlacement() each landmark
   footprint so Part B's fill — and ships/doodads — see it as occupied"). Done
   ONCE at init from the built-date footprints (static ground claim, independent
   of construction state); guarded so no rebuild ever bloats PLACEMENT_INDEX.
   Registered with a stable "landmark:<id>" label so the placement audits can
   attribute the footprint. ===================================================================== */
var _lmRegistered = false;
function lmRegisterOccupancy(){
  if(_lmRegistered) return; _lmRegistered = true;
  var R = (typeof GROUND_RESERVATIONS !== "undefined") ? GROUND_RESERVATIONS : [];
  var n = 0;
  for(var i = 0; i < R.length; i++){
    var rec = R[i]; if(!rec.resolved) continue;
    var fp = rec.footprint || resolveReservationFootprint(rec, rec.built); if(!fp) continue;
    var f = lmFootprint(rec, fp);
    registerPlacement(f.cx, f.cz, Math.hypot(f.w, f.d) / 2, "landmark:" + rec.landmarkId);
    n++;
  }
  if(typeof console !== "undefined") console.log("[verify] landmark occupancy:", n, "footprints registered into PLACEMENT_INDEX.");
}
lmRegisterOccupancy();

/* build the initial set so the world is populated before the first jump()/
   render (the harness reads audits at noon after a jump; the per-frame hook
   keeps it current). */
rebuildLandmarks();

/* per-frame hook — mirror labels' renderer.render wrap (labels.js:766). Do NOT
   touch core/07-main's frozen render loop. Composes with the labels wrap
   (buildings wraps first at chunk 16, labels at chunk 40; both run each frame). */
var _lmPrevRender = renderer.render.bind(renderer);
renderer.render = function(s, c){
  try { updateLandmarks(); } catch(e){ if(!updateLandmarks._warned){ console.warn("[buildings] update failed", e); updateLandmarks._warned = true; } }
  _lmPrevRender(s, c);
};

/* dev-tooling interface (layers-spec §15) — the atelier's parent toggle. */
registerLayerVisibility("buildings", function(v){ LM_GROUP.visible = v; if(v){ _lmLastDay = null; updateLandmarks(); } });

/* =====================================================================
   THE PART-A AUDITS (acceptance-gate discipline, spec §2 / brief §5). Registered
   under __P1850_AUDITS.buildings.*; each is a FRAMING-INDEPENDENT pure function
   of the derived set / fixed probes (never the camera), returning
   { pass, ...detail }. They are correctness guards for the NEW layer — the
   foundation has no buildings, so they cannot "fail on the old build"; where a
   class maps to a legacy defect (footprintsOBB overlaps, orientation) the s76
   fail-before proof is already on record (memory: s76 318/496 mis-faced, 4
   audits fail->green). ===================================================================== */
(function registerBuildingsAudits(){
  var DEG = 180 / Math.PI;
  var EPS = 0.5;                                                // centroid match tolerance (m)

  function sampleDays(){
    var ds = ["1846-07-01", "1848-04-01", "1849-09-15", "1849-12-20", "1849-12-26"];
    var out = ds.map(function(iso){ return eventDateToSimDay(iso); });
    if(typeof simDay === "number") out.push(simDay);
    return out;
  }
  /* oriented-box (quad) SAT penetration in metres, 0 if separated (0.05 slack —
     an exact shared edge / tangent-to-curb is not an intersection). */
  function quadPenetration(A, B){
    var polys = [A, B], best = 1e9, p, i, k;
    for(p = 0; p < 2; p++){ var poly = polys[p];
      for(i = 0; i < 4; i++){ var a = poly[i], b = poly[(i + 1) % 4];
        var ax = -(b.z - a.z), az = (b.x - a.x), l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
        var minA = 1e9, maxA = -1e9, minB = 1e9, maxB = -1e9;
        for(k = 0; k < 4; k++){
          var dA = A[k].x * ax + A[k].z * az; if(dA < minA) minA = dA; if(dA > maxA) maxA = dA;
          var dB = B[k].x * ax + B[k].z * az; if(dB < minB) minB = dB; if(dB > maxB) maxB = dB;
        }
        var ov = Math.min(maxA, maxB) - Math.max(minA, minB);
        if(ov <= 0.05) return 0;
        if(ov < best) best = ov;
      }
    }
    return best;
  }
  /* "no landmark sits in a street" measured as the ACTUAL property: does the
     street's ROADWAY CENTERLINE run THROUGH the footprint? A frontage building's
     facade sits AT the curb by construction (the block edge is the centerline
     inset by the street's half-width — cadastre line ~263), so it is tangent to
     — and may clip the ROW margin of — the very street it fronts and any near-
     coincident PARALLEL lane (e.g. the excluded mid-block Portsmouth-Street lane
     running along the plaza's Kearny edge). That curb tangency is NOT a landmark
     in a road. A landmark IS in a road only when the roadway line passes through
     its footprint. segCrossesQuad tests exactly that. */
  function pointInQuad(q, x, z){                                // convex quad [SW,SE,NE,NW]
    var sign = 0;
    for(var i = 0; i < 4; i++){
      var a = q[i], b = q[(i + 1) % 4];
      var cross = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
      if(cross !== 0){ var s = cross > 0 ? 1 : -1; if(sign === 0) sign = s; else if(s !== sign) return false; }
    }
    return true;
  }
  function segsIntersect(a, b, c, d){                           // proper segment intersection ab x cd
    function o(p, q, r){ return (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x); }
    var o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
    return ((o1 > 0) !== (o2 > 0)) && ((o3 > 0) !== (o4 > 0));
  }
  function segCrossesQuad(quad, seg){
    var P0 = { x: seg.x0, z: seg.z0 }, P1 = { x: seg.x1, z: seg.z1 };
    if(pointInQuad(quad, P0.x, P0.z) || pointInQuad(quad, P1.x, P1.z)) return true;
    for(var i = 0; i < 4; i++) if(segsIntersect(P0, P1, quad[i], quad[(i + 1) % 4])) return true;
    return false;
  }
  /* informational only (non-gating): deepest clip of a quad corner into a ROW
     capsule (segment + halfW). Surfaces the near-coincident-lane curb tangency
     transparently so the Director sees the number, not a hidden nudge. */
  function quadCurbClip(quad, seg){
    var dx = seg.x1 - seg.x0, dz = seg.z1 - seg.z0, l2 = dx * dx + dz * dz, worst = 0;
    for(var i = 0; i < 4; i++){
      var q = quad[i];
      var t = l2 > 0 ? clamp(((q.x - seg.x0) * dx + (q.z - seg.z0) * dz) / l2, 0, 1) : 0;
      var pen = seg.halfW - Math.hypot(q.x - (seg.x0 + dx * t), q.z - (seg.z0 + dz * t));
      if(pen > worst) worst = pen;
    }
    return worst;
  }
  function resolvedRecs(){
    var R = (typeof GROUND_RESERVATIONS !== "undefined") ? GROUND_RESERVATIONS : [];
    return R.filter(function(r){ return r.resolved; });
  }

  /* ---- 1. registryHonored — every reservationsAt(day) entry with a resolvable
     footprint has EXACTLY ONE landmark mesh at its centroid (+/-eps), AND zero
     rendered meshes whose id is not a resolved reservation. (Every authored
     thing rendered; nothing rendered that isn't authored.) ---- */
  registerAudit("buildings", "registryHonored", function(){
    var days = sampleDays(), viol = [], perDay = [], unlanded = [];
    for(var di = 0; di < days.length; di++){
      var day = days[di];
      var set = deriveLandmarkSet(day);
      var byId = {}; set.forEach(function(e){ byId[e.id] = (byId[e.id] || 0) + 1; });
      // no rendered id is a phantom (must be a resolved reservation)
      set.forEach(function(e){
        var rec = reservationById(e.id);
        if(!rec || !rec.resolved) viol.push({ day: +day.toFixed(1), id: e.id, why: "rendered-not-resolved" });
        if(byId[e.id] > 1) viol.push({ day: +day.toFixed(1), id: e.id, why: "duplicate-mesh", n: byId[e.id] });
      });
      // every completed reservation (reservationsAt) has exactly one mesh at its
      // centroid — UNLESS it is reserved-but-unlanded (s99 land gate): then it
      // correctly renders ZERO meshes and is ACCOUNTED here, not a phantom/failure.
      var res = reservationsAt(day);
      res.forEach(function(r){
        var fp = resolveReservationFootprint(r, day);
        var un = fp ? lmUnlandedAt(r, fp) : null;
        var matches = set.filter(function(e){ return e.id === r.landmarkId; });
        if(un){
          if(matches.length !== 0){ viol.push({ day: +day.toFixed(1), id: r.landmarkId, why: "unlanded-but-rendered", got: matches.length }); return; }
          unlanded.push({ day: +day.toFixed(1), id: r.landmarkId, mUnderWater: un.mUnderWater, reason: un.reason });
          return;
        }
        if(matches.length !== 1){ viol.push({ day: +day.toFixed(1), id: r.landmarkId, why: "expected-1-mesh", got: matches.length }); return; }
        if(!fp) return;
        var e = matches[0], dd = Math.hypot(e.cx - fp.cx, e.cz - fp.cz);
        if(dd > EPS) viol.push({ day: +day.toFixed(1), id: r.landmarkId, why: "centroid-off", off: +dd.toFixed(3) });
      });
      perDay.push({ day: +day.toFixed(1), rendered: set.length, completed: res.length });
    }
    return { pass: viol.length === 0, violations: viol.length, sample: viol.slice(0, 8), perDay: perDay,
             reservedButUnlanded: unlanded.length, unlandedSample: unlanded.slice(0, 12) };
  });

  /* ---- 2. footprintsOBB — true ORIENTED-bounding-box intersection = 0 across
     ALL landmark footprints pairwise, AND vs every ROW polygon (no landmark
     sits in a street). The reservation data was authored with distinct frontFrac
     intervals to avoid co-block overlaps; this PROVES it at footprint geometry.
     A genuine overlap is a DATA bug — surfaced, never silently nudged. ---- */
  registerAudit("buildings", "footprintsOBB", function(){
    var recs = resolvedRecs();
    var quads = recs.map(function(r){ return { id: r.landmarkId, block: r.block, quad: r.footprint.quad }; });
    var pairViol = [], maxPair = 0, i, j;
    for(i = 0; i < quads.length; i++) for(j = i + 1; j < quads.length; j++){
      var pen = quadPenetration(quads[i].quad, quads[j].quad);
      if(pen > maxPair) maxPair = pen;
      if(pen > 0.05) pairViol.push({ a: quads[i].id, b: quads[j].id, sameBlock: quads[i].block === quads[j].block, pen: +pen.toFixed(3) });
    }
    var segs = (typeof PLACEMENT_STREET_SEGS !== "undefined") ? PLACEMENT_STREET_SEGS : [];
    var rowViol = [], curbClips = [], maxClip = 0;
    for(i = 0; i < quads.length; i++){
      var c = quads[i].quad, cx = (c[0].x + c[2].x) / 2, cz = (c[0].z + c[2].z) / 2;
      var clip = 0, clipSeg = null;
      for(j = 0; j < segs.length; j++){
        var mx = (segs[j].x0 + segs[j].x1) / 2, mz = (segs[j].z0 + segs[j].z1) / 2;
        if(Math.hypot(mx - cx, mz - cz) > 120) continue;         // cheap reject
        if(segCrossesQuad(c, segs[j]))                           // GATING: roadway centerline runs through the footprint
          rowViol.push({ id: quads[i].id, row: segs[j].id });
        var k = quadCurbClip(c, segs[j]);                        // informational curb tangency
        if(k > clip){ clip = k; clipSeg = segs[j].id; }
      }
      if(clip > maxClip) maxClip = clip;
      if(clip > 0.3) curbClips.push({ id: quads[i].id, row: clipSeg, curbClipM: +clip.toFixed(3) });
    }
    return { pass: pairViol.length === 0 && rowViol.length === 0,
             footprints: quads.length, pairOverlaps: pairViol.length, maxPairOverlapM: +maxPair.toFixed(3),
             rowCenterlineIntrusions: rowViol.length, rowSample: rowViol.slice(0, 6),
             // informational (non-gating): frontage curb tangency vs near-coincident/parallel ROWs
             maxCurbClipM: +maxClip.toFixed(3), curbClips: curbClips.slice(0, 8),
             pairSample: pairViol.slice(0, 6) };
  });

  /* ---- 3. constructionMonotonic — for each landmark, sample its lead window:
     state is non-decreasing (C0<=C1<=...<=C4) up to `built`, holds C4, then
     absent after `burned`. Nothing at state > C0 before startDay. ---- */
  registerAudit("buildings", "constructionMonotonic", function(){
    var recs = resolvedRecs(), viol = [], rows = [];
    recs.forEach(function(rec){
      var start = lmStartDay(rec), lead = rec.built - start;
      var lo = start - 6, hi = (rec.burned != null ? rec.burned : rec.built) + 30;
      var N = 80, prev = -1, ok = true, sawC4 = false;
      for(var k = 0; k <= N; k++){
        var day = lo + (hi - lo) * (k / N);
        var st = lmStateAt(rec, day).state;
        // before startDay OR at/after burn => must be C0
        if(day < start - 1e-6 && st !== 0){ viol.push({ id: rec.landmarkId, why: "built-before-start", day: +day.toFixed(1), state: st }); ok = false; }
        if(rec.burned != null && day >= rec.burned && st !== 0){ viol.push({ id: rec.landmarkId, why: "not-absent-after-burn", day: +day.toFixed(1), state: st }); ok = false; }
        // monotonic non-decreasing across the RISING arc (up to built)
        if(day <= rec.built + 1e-6 && day >= start){
          if(st < prev){ viol.push({ id: rec.landmarkId, why: "state-decreased", day: +day.toFixed(1), from: prev, to: st }); ok = false; }
          prev = Math.max(prev, st);
        }
        // holds C4 between built and burn
        if(day >= rec.built && (rec.burned == null || day < rec.burned)){ if(st !== 4){ viol.push({ id: rec.landmarkId, why: "not-C4-after-built", day: +day.toFixed(1), state: st }); ok = false; } else sawC4 = true; }
      }
      rows.push({ id: rec.landmarkId, cls: lmClassOf(rec.landmarkId), leadDays: +lead.toFixed(0), reachedC4: sawC4, ok: ok });
    });
    return { pass: viol.length === 0, landmarks: recs.length, violations: viol.length, sample: viol.slice(0, 8), perLandmark: rows };
  });

  /* ---- 4. reservationDeterminism — derive the set twice at the same day
     (fresh): byte-identical. Rewind-exact: A -> B -> A returns identical. Zero
     dice, so this is exact by construction. ---- */
  registerAudit("buildings", "reservationDeterminism", function(){
    function fp(day){
      return deriveLandmarkSet(day).map(function(e){
        return e.id + "|" + e.cx.toFixed(4) + "|" + e.cz.toFixed(4) + "|" + e.state + "|" + e.hFrac.toFixed(4) + "|" + e.yaw.toFixed(6);
      }).join("\n");
    }
    var A = eventDateToSimDay("1848-04-01"), B = eventDateToSimDay("1849-12-20");
    var a1 = fp(A), a2 = fp(A);                                 // same day twice
    var bJump = fp(B), aBack = fp(A);                           // A -> B -> A rewind
    var sameDayIdentical = (a1 === a2), rewindExact = (a1 === aBack);
    return { pass: sameDayIdentical && rewindExact, sameDayIdentical: sameDayIdentical, rewindExact: rewindExact,
             countA: a1.split("\n").filter(Boolean).length, countB: bJump.split("\n").filter(Boolean).length };
  });

  /* ---- 5. orientationLandmark — TWO clauses:
     (a) SELF-CONSISTENCY: the rendered front-face normal (sin yaw, cos yaw) equals
         its reservation frontage normal <= 2deg (should be ~0 — data-driven wiring).
     (b) CORNER RULE (s94a, building-spawn-spec §1.6 / brief §4): the rendered front
         bearing must align (±2°) to ONE of the building's real bounding-street
         bearings — the four footprint-edge outward normals. A 45° diagonal between
         two of them FAILS. Fail-before: the retired plaza-civics code faced Custom
         House + School House diagonally (~45° off every edge) — that clause failed;
         the single-street fix lands them on one edge (~0°). ---- */
  registerAudit("buildings", "orientationLandmark", function(){
    var recs = resolvedRecs(), maxDeg = 0, maxStreetDeg = 0, viol = [];
    recs.forEach(function(rec){
      var fp = rec.footprint; if(!fp) return;
      var f = lmFootprint(rec, fp);
      var n = lmFrontageNormal(rec, fp);                        // the reservation frontage normal
      var fnx = Math.sin(f.yaw), fnz = Math.cos(f.yaw);         // the rendered door-face normal
      var dot = clamp(fnx * n.x + fnz * n.z, -1, 1);
      var deg = Math.acos(dot) * DEG;
      if(deg > maxDeg) maxDeg = deg;
      if(deg > 2) viol.push({ id: rec.landmarkId, why: "door-vs-frontage", deg: +deg.toFixed(3), frontage: (rec.anchor && (rec.anchor.frontage || rec.anchor.corner)) || null });
      // (b) front bearing must equal ONE bounding-street normal (no diagonal)
      var edges = lmEdgeNormals(fp), best = 999;
      for(var ei = 0; ei < edges.length; ei++){
        var ed = clamp(fnx * edges[ei].x + fnz * edges[ei].z, -1, 1), edg = Math.acos(ed) * DEG;
        if(edg < best) best = edg;
      }
      if(best > maxStreetDeg) maxStreetDeg = best;
      if(best > 2) viol.push({ id: rec.landmarkId, why: "front-not-street-aligned", diagDeg: +best.toFixed(3),
                               frontStreet: (rec.anchor && rec.anchor.frontStreet) || null,
                               corner: (rec.anchor && rec.anchor.corner) || null });
    });
    return { pass: viol.length === 0, landmarks: recs.length, maxDeg: +maxDeg.toFixed(4),
             maxStreetMisalignDeg: +maxStreetDeg.toFixed(4), violations: viol.length, sample: viol.slice(0, 6) };
  });
})();

/* driving hook for the verify harness — expose the derived set + a numbers
   table the report reads directly (mirrors labels' setTimeout attach; this
   layer's chunk 16 runs BEFORE core/06-debug builds window.__P1850). ZERO new
   geometry — an exposure over the pure derive + audits. */
setTimeout(function(){
  if(typeof window !== "undefined" && window.__P1850){
    window.__P1850.landmarksAt = function(day){ return deriveLandmarkSet(day == null ? simDay : day); };
    window.__P1850.landmarkCount = function(day){ return deriveLandmarkSet(day == null ? simDay : day).length; };
  }
}, 0);

/* =====================================================================
   ================  PART B — THE FILL ENGINE v1 (s96)  ================
   The DOCUMENTED 1847 census village (a deliberately BOUNDED first increment
   of the anonymous/simulated fill). Proves the fill pipeline end-to-end:
   catalog draw (window.BUILDING_TYPES) -> era-mix -> canPlace on born
   residential-band + commercial-core ground -> census audit against the
   bible's HARD 1847-04 anchor -> Option-B placeholder render through the
   C0->C4 construction ramp. A modest ramp through 1848 under the same rules;
   it STOPS at the 1848 village (the 1849 tent explosion is a later sprint,
   post-1848 census is INFORMATIONAL/non-gating).

   THE TWO-TRACK LAW (fill-density-model §0): fill READS the cadastre/catalog;
   it never moves a lot/reservation and never overlaps a landmark. Determinism:
   a DEDICATED seeded stream (cyrb128/sfc32 keyed "p1850-fill-"+seed) that never
   touches rngBuild/RNG_CALL_COUNT; the master roster is built ONCE (pure, cached)
   and deriveFillSet(day) is a pure filter over it — same seed+date ⇒ byte-
   identical, rewind-exact. Fill is NEVER registered into PLACEMENT_INDEX (that
   would mutate a shared global per-rebuild and break rewind) — inter-fill
   overlap is checked against a LOCAL occupancy list at master-build time; the
   51 landmark footprints ARE in PLACEMENT_INDEX (lmRegisterOccupancy) so
   canPlace already keeps fill off reserved landmark ground.

   HARD DEFERRALS (do NOT build here — later sprints): subdivision / lot-
   splitting (Knob B), the 1849 tent EXPLOSION (swale-scatter thousands),
   lifecycle transitions (burn/teardown/ruins/rebuild/rename), multistory /
   rear-court / made-land / party-wall. v1 places WHOLE, DETACHED buildings on
   born fifty-vara zone ground, gap-toothed, oriented to ONE street frontage.
   ===================================================================== */

/* ---- RELEASE DEFAULT: fill volumes ON, matching the landmark default. ---- */
var FILL_ON_AT_RELEASE = true;

/* THE CATALOG (baked window.BUILDING_TYPES + era-weight table, from
   data/building-types.json via app/building-types.js). Fill CONSUMES it. */
var FILL_TYPES  = (typeof window !== "undefined" && window.BUILDING_TYPES) ? window.BUILDING_TYPES : [];
var FILL_ERA_W  = (typeof window !== "undefined" && window.BUILDING_TYPE_ERA_WEIGHTS) ? window.BUILDING_TYPE_ERA_WEIGHTS : {};
var FILL_FT_M   = 0.3048;   // catalog footprints are in FEET (per its meta.units); convert to metres.

/* THE TUNABLES (fill:true — a later Atelier knob pass reads these). */
var FILL_CAP_ISO      = "1848-04-01";  // v1 caps the count at the 1848 village (post-1848 informational)
var FILL_SLOT_STEP_M  = 12;            // frontage-slot sampling interval along a block edge
var FILL_SETBACK_M    = 2.2;           // building set back from the frontage curb, into the block
var FILL_EDGE_CAP     = 0.55;          // per-block-edge built-fraction cap (gap-toothed; no ramparts)
var FILL_GAP_M        = 3.0;           // side-yard gap booked against a block edge between neighbours
var FILL_LOOKAHEAD    = 8;             // # of not-yet-counted buildings shown mid-construction (appear-in)
var FILL_STORY_H_M    = 3.1;           // placeholder storey height (neutral massing; not final art)

/* Only these subtypes are COUNTED census structures (dwellings + shops + civic
   halls + the counted lodging/commercial tiers). Yard ancillaries (sheds,
   open stalls) are NOT part of the 79-building 1847 census and v1 does not
   place them. */
var FILL_COUNTED_SUBTYPES = { "small-home":1, "medium-home":1, "large-home":1, "shop":1, "store":1,
  "saloon":1, "tavern":1, "office":1, "market":1, "warehouse":1, "manufactory":1, "tent":1 };

/* Census MATERIAL bucket for a catalog type (the bible's 1847 mix is shanty /
   frame / adobe). adobe->adobe; frame/iron (prefab is a frame-kit stand-in)->
   frame; scrap/canvas/canvas-over-frame/open-frame -> the improvised "shanty"
   low tier. Drives BOTH the eraMix audit and the zone class below. */
function fillCensusCat(t){
  var m = t.material;
  if(m === "adobe") return "adobe";
  if(m === "frame" || m === "iron") return "frame";
  return "shanty";
}
/* The zone class a fill building presents to the cadZoneGate (canPlace). The
   census bucket doubles as the zone class: shanty/adobe are residential-band
   only (the commercial front is never tent/adobe ground — CAD_ZONE_TABLE);
   frame places in BOTH residential-band and commercial-core. So an adobe/shanty
   rank naturally skips commercial-core slots and lands on residential ground. */
function fillZoneClass(t){ return fillCensusCat(t); }

/* eventDateToSimDay of the catalog's [start,end] era window (memoized). */
var _fillEraCache = {};
function fillEraValid(t, day){
  if(!t.era || t.era.length < 2) return true;
  var c = _fillEraCache[t.code];
  if(!c){ c = { a: eventDateToSimDay(t.era[0]), b: eventDateToSimDay(t.era[1]) }; _fillEraCache[t.code] = c; }
  return day >= c.a - 1e-6 && day <= c.b + 1e-6;
}
function fillWeight(code, snapKey){
  var s = FILL_ERA_W[snapKey]; if(!s || !s[code]) return 0;
  return s[code].weight || 0;
}

/* =====================================================================
   THE CENSUS CURVE (fill + landmarks TOTAL). The 1847-04 anchor is the bible's
   HARD documented survey (79 total: 22 shanty / 31 frame / 26 adobe); 1846-07
   is the documented "~50 buildings" village; 1848-04 is REASONED (fill:true) —
   the 1847 per-capita ratio (79 / pop~487) carried onto the pop curve's ~804 at
   1848-04 ⇒ ~130. v1 HOLDS 130 past the cap (does NOT chase the 1849 thousands).
   ONE curve read by BOTH the spawner and the census audit (measurement law). ===== */
var _fillCensusCurve = null;
function fillCensusCurve(){
  if(_fillCensusCurve) return _fillCensusCurve;
  _fillCensusCurve = [
    { day: eventDateToSimDay("1846-07-01"), n: 50 },   // documented ~50 (Swasey/Bosqui + demographics)
    { day: eventDateToSimDay("1847-04-01"), n: 79 },   // HARD ANCHOR (FoundSF survey, 28/39/33)
    { day: eventDateToSimDay("1848-04-01"), n: 130 }   // reasoned: 1847 per-capita x pop(1848-04); fill:true
  ];
  return _fillCensusCurve;
}
function fillTargetTotal(day){
  var C = fillCensusCurve();
  if(day <= C[0].day) return C[0].n;
  for(var i = 1; i < C.length; i++){
    if(day <= C[i].day) return lerp(C[i-1].n, C[i].n, (day - C[i-1].day) / (C[i].day - C[i-1].day));
  }
  return C[C.length-1].n;                               // cap at the 1848 village
}
/* fill count owed at a date = the census total minus the landmarks already
   standing (landmarks COUNT toward the 79). Clamped to what the master could
   actually place (a short master ⇒ the census audit reads under target, by
   design — starvation is surfaced, never hidden). */
function fillCountAt(day){
  var raw = Math.round(fillTargetTotal(day)) - reservationsAt(day).length;
  var cap = FILL_MASTER ? FILL_MASTER.length : 1e9;
  return clamp(raw, 0, cap);
}

/* =====================================================================
   THE TRANCHE MIX. Only the 1847-04 tranche is audited (eraMix ±8% of
   28/39/33). Post-1847 additions (the 1848 ramp) skew frame (frame construction
   accelerating; adobe residential construction essentially stops after 1848 —
   bible §1a; shanty persists as a diminishing low tier) — directional, not
   audited. Category is assigned by a DETERMINISTIC largest-remainder walk so the
   tranche proportions are hit exactly (never left to the rough weights). ===== */
var FILL_MIX_1847 = { shanty: 0.28, frame: 0.39, adobe: 0.33 };
var FILL_MIX_1848 = { shanty: 0.15, frame: 0.75, adobe: 0.10 };
/* pick the category most behind its quota (streaming largest-remainder). */
function fillPickCat(mix, counts){
  var placed = counts.shanty + counts.frame + counts.adobe;
  var best = null, bestDeficit = -Infinity, cats = ["shanty", "frame", "adobe"];
  for(var i = 0; i < cats.length; i++){
    var c = cats[i], want = mix[c] * (placed + 1), deficit = want - counts[c];
    if(deficit > bestDeficit){ bestDeficit = deficit; best = c; }
  }
  return best;
}
/* seeded weighted draw of a concrete code within a census category, era-valid at
   `day`, from the 1847-04 weight column (within-category variety only). */
function fillPickCode(cat, day, rng){
  var pool = [], tot = 0;
  for(var i = 0; i < FILL_TYPES.length; i++){
    var t = FILL_TYPES[i];
    if(t.isGapMarker) continue;
    if(!FILL_COUNTED_SUBTYPES[t.subtype]) continue;
    if(fillCensusCat(t) !== cat) continue;
    if(!fillEraValid(t, day)) continue;
    var w = fillWeight(t.code, "1847-04");
    if(w <= 0) w = 0.5;                                  // era-valid but zero-weighted at 1847 snapshot: a faint floor so later-era frame variety can still draw
    pool.push({ t: t, w: w }); tot += w;
  }
  if(!pool.length) return null;
  var r = rng() * tot, acc = 0;
  for(var k = 0; k < pool.length; k++){ acc += pool[k].w; if(r <= acc) return pool[k].t; }
  return pool[pool.length-1].t;
}

/* =====================================================================
   FRONTAGE SLOTS — candidate build spots along born FIFTY-VARA block edges (the
   Hundred Vara / SoMa fabric is deferred with the 1849 camp). Each slot faces
   ONE street (the block edge's outward normal — the §1.6 corner rule by
   construction, never a diagonal), set back from the curb into the block. The
   slot's `day` is the block birth (a slot cannot pre-date its ground). ===== */
function fillUnit(x, z){ var l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; }
function fillFrontageSlots(capDay){
  var slots = [], FR = ["west", "east", "north", "south"];
  var B = (typeof GROUND_PLAN !== "undefined") ? GROUND_PLAN.blocks : [];
  for(var bi = 0; bi < B.length; bi++){
    var b = B[bi];
    if(b.publicReserve) continue;                        // the plaza common — keep out
    if(b.district !== "fifty-vara") continue;            // Hundred Vara/SoMa deferred
    if(b.birth > capDay) continue;                       // not yet surveyed by the cap
    for(var fi = 0; fi < FR.length; fi++){
      var frontage = FR[fi];
      var e = cadFrontageEdgeUV(b, frontage); if(!e) continue;
      var w0 = gridToWorldAt(e.p0.u, e.p0.v, GRID_ROT_BASE);
      var w1 = gridToWorldAt(e.p1.u, e.p1.v, GRID_ROT_BASE);
      var pin = gridToWorldAt(e.p0.u + e.inU, e.p0.v + e.inV, GRID_ROT_BASE);   // a step inward
      var inward = fillUnit(pin.x - w0.x, pin.z - w0.z);
      var edgeLen = Math.hypot(w1.x - w0.x, w1.z - w0.z);
      var tang = fillUnit(w1.x - w0.x, w1.z - w0.z);      // along the edge
      var out = { x: -inward.x, z: -inward.z };           // outward street normal
      var n = Math.max(1, Math.round(edgeLen / FILL_SLOT_STEP_M));
      for(var si = 0; si < n; si++){
        var fFrac = (si + 0.5) / n;                       // sub-interval midpoint along the edge
        var ex = w0.x + tang.x * edgeLen * fFrac, ez = w0.z + tang.z * edgeLen * fFrac;
        slots.push({ block: b.key, edgeId: b.key + "|" + frontage, edgeLen: edgeLen, day: b.birth,
                     ex: ex, ez: ez, tx: tang.x, tz: tang.z, inx: inward.x, inz: inward.z,
                     outx: out.x, outz: out.z, yaw: Math.atan2(out.x, out.z),
                     cx: ex + inward.x * 12, cz: ez + inward.z * 12 /* ordering probe point, ~into the block */ });
      }
    }
  }
  return slots;
}

/* =====================================================================
   THE MASTER ROSTER — built ONCE (pure, cached, dedicated seeded stream). Slots
   ordered plaza-ward (demand realistic: the core fills first, thinning outward)
   with a small seeded jitter; greedily placed WHOLE + DETACHED under the per-edge
   built-fraction cap (gap-toothed) + canPlace (zone/terrain/slope/ROW/overlap-vs-
   landmarks) + a local inter-fill overlap check. Each accepted building carries a
   census category (tranche mix) and a construction appearDay. ===== */
var FILL_MASTER = null;
function fillOverlapsLocal(placed, x, z, r){
  for(var i = 0; i < placed.length; i++){
    var p = placed[i], dx = x - p.x, dz = z - p.z, md = r + p.r;
    if(dx*dx + dz*dz < md*md) return true;
  }
  return false;
}
function buildFillMaster(){
  if(FILL_MASTER) return FILL_MASTER;
  var seedStrLocal = "p1850-fill-" + (typeof seedStr !== "undefined" ? seedStr : "1846");
  var sd = cyrb128(seedStrLocal), rng = sfc32(sd[0], sd[1], sd[2], sd[3]);   // DEDICATED stream — never rngBuild
  var capDay  = eventDateToSimDay(FILL_CAP_ISO);
  var d1847   = eventDateToSimDay("1847-04-01");
  var need    = Math.max(0, Math.round(fillTargetTotal(capDay)) - reservationsAt(capDay).length);
  var N1847   = Math.max(0, Math.round(fillTargetTotal(d1847)) - reservationsAt(d1847).length);

  var slots = fillFrontageSlots(capDay);
  for(var s = 0; s < slots.length; s++){
    slots[s].order = Math.hypot(slots[s].cx - PLAZA_CENTER.x, slots[s].cz - PLAZA_CENTER.z) + (rng() - 0.5) * 10;
  }
  slots.sort(function(a, b){ return a.order - b.order; });

  var master = [], placed = [], edgeBuilt = {}, counts = { shanty: 0, frame: 0, adobe: 0 };
  for(var si = 0; si < slots.length && master.length < need; si++){
    var slot = slots[si];
    var rank = master.length;
    var mix  = rank < N1847 ? FILL_MIX_1847 : FILL_MIX_1848;
    var cat  = fillPickCat(mix, counts);
    var t    = fillPickCode(cat, slot.day, rng);
    if(!t){ continue; }                                  // no era-valid type in this category — try next slot (rank unchanged)
    var wM = t.footprint.w * FILL_FT_M, dM = t.footprint.d * FILL_FT_M;
    // per-edge built-fraction cap (gap-toothed; no ramparts)
    var built = edgeBuilt[slot.edgeId] || 0;
    if((built + wM) / slot.edgeLen > FILL_EDGE_CAP) continue;
    // pose: centre set back from the curb by (depth/2 + setback), small seeded
    // along-edge jitter within the slot for irregular spacing
    var jitter = (rng() - 0.5) * Math.min(FILL_SLOT_STEP_M * 0.5, slot.edgeLen * 0.15);
    var setIn  = FILL_SETBACK_M + dM / 2;
    var cx = slot.ex + slot.tx * jitter + slot.inx * setIn;
    var cz = slot.ez + slot.tz * jitter + slot.inz * setIn;
    var rBound = Math.hypot(wM, dM) / 2;
    // canPlace: zone gate (residential-band/commercial-core per class) + terrain
    // + slope + ROW + overlap vs PLACEMENT_INDEX (the 51 landmark footprints live
    // there, so reserved landmark ground is respected here).
    var cp = canPlace("structure", { x: cx, z: cz, yaw: slot.yaw, footprint: rBound, footprintW: wM, footprintD: dM },
                      { day: slot.day, zoneClass: fillZoneClass(t) });
    if(!cp.ok) continue;
    if(fillOverlapsLocal(placed, cx, cz, rBound)) continue;   // detached vs other fill
    // accept
    counts[cat]++;
    edgeBuilt[slot.edgeId] = built + wM + FILL_GAP_M;
    placed.push({ x: cx, z: cz, r: rBound });
    master.push({ code: t.code, cat: cat, material: t.material, subtype: t.subtype,
                  cx: cx, cz: cz, w: wM, d: dM, yaw: slot.yaw, nx: slot.outx, nz: slot.outz,
                  storyRange: t.storyRange || [1, 1], edgeId: slot.edgeId, edgeLen: slot.edgeLen,
                  overWater: !!t.overWater, stilted: !!t.stilted,   // item 5: authored pile-built/stilted exceptions (none in v1 catalog)
                  rank: rank, appearDay: capDay });
  }
  fillAssignAppearDays(master, capDay);
  FILL_MASTER = master;
  if(typeof console !== "undefined") console.log("[verify] fill master:", master.length, "of", need, "owed placed (fifty-vara born ground).");
  return FILL_MASTER;
}
/* appearDay per rank (plaza order == appear order): the day the raw fill-owed
   count first exceeds the rank. Monotonic (running max) so the shown prefix
   property holds and construction ramps are stable; rewind-exact. */
function fillAssignAppearDays(master, capDay){
  var d = eventDateToSimDay("1846-01-01"), prev = d, k = 0;
  for(; d <= capDay + 0.5 && k < master.length; d += 2){
    var fc = Math.round(fillTargetTotal(d)) - reservationsAt(d).length;
    while(k < fc && k < master.length){ var ad = Math.max(d, prev); master[k].appearDay = ad; prev = ad; k++; }
  }
  for(; k < master.length; k++){ master[k].appearDay = capDay; }
}

/* Construction lead by material (fill:true; Taylor: canvas "as if by magic in a
   single night", frame days-to-weeks, adobe slower mass work). */
function fillLeadDays(e){
  switch(e.material){
    case "canvas": case "canvas-over-frame": return 2;
    case "scrap": return 10;
    case "adobe": return 60;
    case "iron":  return 14;
    default:      return 21;                              // frame
  }
}
/* C0->C4 state + height fraction at `day` (reuses the s94a ramp shape). Complete
   (C4) at/after appearDay; absent before the lead window opens. */
function fillStateAt(e, day){
  var lead = fillLeadDays(e), start = e.appearDay - lead;
  if(day >= e.appearDay) return { state: 4, hFrac: 1, active: true };
  if(day < start)        return { state: 0, hFrac: 0, active: false };
  var arc = lead > 0 ? clamp((day - start) / lead, 0, 1) : 1;
  var state = arc < 0.15 ? 1 : (arc < 0.5 ? 2 : (arc < 0.85 ? 3 : 4));
  var hFrac = state === 1 ? 0 : (state === 2 ? 0.45 : (state === 3 ? 0.8 : 1.0));
  return { state: state, hFrac: hFrac, active: true };
}

/* =====================================================================
   THE DERIVED SET (pure function of `day`) — the ONE source read by BOTH the
   renderer and every fill audit. The first fillCountAt(day) ranks are the
   COUNTED census set (complete, C4 by construction of appearDay); a small
   look-ahead of not-yet-counted ranks currently mid-construction is shown at
   C1..C3 so nothing pops in. Zero dice — a filter over the cached master. ===== */
function deriveFillSet(day){
  var master = buildFillMaster();
  var fc = fillCountAt(day);
  var out = [];
  for(var i = 0; i < master.length; i++){
    var e = master[i], counted = (i < fc);
    var st = fillStateAt(e, day);
    if(!counted){
      if(i >= fc + FILL_LOOKAHEAD) break;                // ranks are plaza/appear-ordered — nothing further is active
      if(!st.active || st.state >= 4) continue;          // only show the genuinely-under-construction look-ahead
    }
    out.push({ code: e.code, cat: e.cat, material: e.material, subtype: e.subtype,
               cx: e.cx, cz: e.cz, w: e.w, d: e.d, yaw: e.yaw, nx: e.nx, nz: e.nz,
               storyRange: e.storyRange, edgeId: e.edgeId, edgeLen: e.edgeLen, rank: e.rank,
               overWater: !!e.overWater, stilted: !!e.stilted,
               appearDay: e.appearDay, state: st.state, hFrac: st.hFrac, counted: counted });
  }
  return out;
}

/* =====================================================================
   THE RENDERER — Option-B neutral placeholder volumes (the same material world
   as the landmarks: a light-grey box + flat roof cap + high-contrast front
   stripe/arrow), sized from the catalog footprint + a placeholder storey height,
   arriving through the C0->C4 ramp. Tagged by code. No new art. ===== */
var FILL_GROUP = new THREE.Group(); FILL_GROUP.frustumCulled = false; FILL_GROUP.visible = FILL_ON_AT_RELEASE; scene.add(FILL_GROUP);
var _fillLastDay = null;
var FILL_INSET = 0.4;
var FILL_TINT = { shanty: 0xb4ad9f, frame: 0x9ea19c, adobe: 0xb8b2a4 };   // a hair off neutral, matching LM_TINT voice
function fillBuildMesh(e){
  var y = terrainHeight(e.cx, e.cz);
  var w = Math.max(e.w - FILL_INSET, 1.0), d = Math.max(e.d - FILL_INSET, 1.0);
  var parts = [];
  // C1..C4 site pad
  var pad = makeBoxLocal(w, 0.25, d, new THREE.Color(LM_PLACEHOLDER.pad));
  bake(pad, new THREE.Vector3(e.cx, y, e.cz), e.yaw);
  parts.push(pad);
  // ground arrow (front/entrance aid) — smaller than the landmark's
  var az0 = d / 2 + 0.3, aLen = Math.max(1.4, Math.min(w * 0.6, 2.8)), aHW = Math.max(0.6, Math.min(w * 0.3, 1.2));
  var arrow = lmTriLocal(-aHW, az0, aHW, az0, 0, az0 + aLen, 0.12, new THREE.Color(LM_PLACEHOLDER.marker));
  lmBakeAt(arrow, 0, 0, 0, e.yaw, e.cx, y, e.cz);
  parts.push(arrow);
  if(e.state >= 2){
    var storeys = (e.storyRange && e.storyRange[1]) ? e.storyRange[1] : 1;
    var full = Math.max(storeys * FILL_STORY_H_M, 2.4);
    var h = Math.max(full * e.hFrac, 0.7);
    var body = makeBoxLocal(w, h, d, new THREE.Color(FILL_TINT[e.cat] || LM_PLACEHOLDER.body));
    bake(body, new THREE.Vector3(e.cx, y + 0.23, e.cz), e.yaw);
    parts.push(body);
    var roof = makeBoxLocal(w + 0.15, 0.22, d + 0.15, new THREE.Color(LM_PLACEHOLDER.roof));
    bake(roof, new THREE.Vector3(e.cx, y + 0.23 + h, e.cz), e.yaw);
    parts.push(roof);
    // front-face stripe (the corner-rule proof — on the +z face BY CONSTRUCTION)
    var stripeH = Math.max(h * 0.9, 0.6);
    var stripe = makeBoxLocal(Math.min(0.7, w * 0.4), stripeH, 0.15, new THREE.Color(LM_PLACEHOLDER.marker));
    lmBakeAt(stripe, 0, 0.23, d / 2 - 0.02, e.yaw, e.cx, y, e.cz);
    parts.push(stripe);
  }
  var mesh = new THREE.Mesh(mergeGeoms(parts), LM_MAT);
  mesh.frustumCulled = false;
  mesh.userData.fillCode = e.code;
  mesh.userData.fillRank = e.rank;
  return mesh;
}
function fillClear(){
  for(var i = FILL_GROUP.children.length - 1; i >= 0; i--){
    var o = FILL_GROUP.children[i]; FILL_GROUP.remove(o); if(o.geometry) o.geometry.dispose();
  }
}
function rebuildFill(){
  fillClear();
  var set = deriveFillSet(simDay);
  for(var i = 0; i < set.length; i++) FILL_GROUP.add(fillBuildMesh(set[i]));
  _fillLastDay = Math.floor(simDay);
}
function updateFill(){
  if(!FILL_GROUP.visible){ return; }
  if(Math.floor(simDay) !== _fillLastDay) rebuildFill();
}
rebuildFill();

/* per-frame hook — compose after the landmark wrap (same pattern; both run each
   frame, neither touches core/07-main's frozen loop). */
var _fillPrevRender = renderer.render.bind(renderer);
renderer.render = function(s, c){
  try { updateFill(); } catch(e){ if(!updateFill._warned){ console.warn("[buildings.fill] update failed", e); updateFill._warned = true; } }
  _fillPrevRender(s, c);
};
registerLayerVisibility("buildings-fill", function(v){ FILL_GROUP.visible = v; if(v){ _fillLastDay = null; updateFill(); } });

/* =====================================================================
   THE FILL AUDITS (new __P1850_AUDITS.buildings.fill*). Each is a framing-
   independent pure function that SAMPLES ITS OWN dates (the harness runs runAll
   at the canonical noons; the census/mix gates live at 1847-04 & 1848-04, so the
   audits reach for them directly). The 51 landmark audits are untouched. ===== */
(function registerFillAudits(){
  var EPS_FRAC = 0.05;                                    // census tolerance (±5%)
  var MIX_TOL  = 0.08;                                    // eraMix tolerance (±8%)

  /* OBB quad [SW,SE,NE,NW] from a fill entry's centre/size/yaw. depth axis =
     the frontage normal (sin yaw, cos yaw); width axis = its perpendicular. */
  function fillQuad(e){
    var nx = Math.sin(e.yaw), nz = Math.cos(e.yaw);       // depth (into block) axis
    var tx = nz, tz = -nx;                                // width (along frontage) axis
    var hw = e.w / 2, hd = e.d / 2;
    function P(sw, sd){ return { x: e.cx + tx*sw + nx*sd, z: e.cz + tz*sw + nz*sd }; }
    return [ P(-hw, -hd), P(hw, -hd), P(hw, hd), P(-hw, hd) ];
  }
  function penetration(A, B){                             // SAT overlap in metres, 0 if separated
    var polys = [A, B], best = 1e9, p, i, k;
    for(p = 0; p < 2; p++){ var poly = polys[p];
      for(i = 0; i < 4; i++){ var a = poly[i], b = poly[(i+1)%4];
        var ax = -(b.z - a.z), az = (b.x - a.x), l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
        var minA = 1e9, maxA = -1e9, minB = 1e9, maxB = -1e9;
        for(k = 0; k < 4; k++){
          var dA = A[k].x*ax + A[k].z*az; if(dA < minA) minA = dA; if(dA > maxA) maxA = dA;
          var dB = B[k].x*ax + B[k].z*az; if(dB < minB) minB = dB; if(dB > maxB) maxB = dB;
        }
        var ov = Math.min(maxA, maxB) - Math.max(minA, minB);
        if(ov <= 0.05) return 0;
        if(ov < best) best = ov;
      }
    }
    return best;
  }
  function pointInQuad(q, x, z){
    var sign = 0;
    for(var i = 0; i < 4; i++){ var a = q[i], b = q[(i+1)%4];
      var cr = (b.x-a.x)*(z-a.z) - (b.z-a.z)*(x-a.x);
      if(cr !== 0){ var s = cr > 0 ? 1 : -1; if(sign === 0) sign = s; else if(s !== sign) return false; }
    }
    return true;
  }
  function segsIntersect(a, b, c, d){
    function o(p, q, r){ return (q.x-p.x)*(r.z-p.z) - (q.z-p.z)*(r.x-p.x); }
    var o1 = o(a,b,c), o2 = o(a,b,d), o3 = o(c,d,a), o4 = o(c,d,b);
    return ((o1 > 0) !== (o2 > 0)) && ((o3 > 0) !== (o4 > 0));
  }
  function segCrossesQuad(q, seg){
    var P0 = { x: seg.x0, z: seg.z0 }, P1 = { x: seg.x1, z: seg.z1 };
    if(pointInQuad(q, P0.x, P0.z) || pointInQuad(q, P1.x, P1.z)) return true;
    for(var i = 0; i < 4; i++) if(segsIntersect(P0, P1, q[i], q[(i+1)%4])) return true;
    return false;
  }
  function landmarkQuadsAt(day){
    return deriveLandmarkSet(day).map(function(L){
      return fillQuad({ cx: L.cx, cz: L.cz, w: L.w, d: L.d, yaw: L.yaw });
    });
  }

  /* ---- fillCensus — total structures (fill + landmarks) within ±5% of the
     documented target at 1847-04 & 1848-04 (GATING); 1849 reported informational
     (non-gating — the tent explosion is a deferred sprint). ---- */
  registerAudit("buildings", "fillCensus", function(){
    var checks = [ { iso: "1847-04-01", gating: true }, { iso: "1848-04-01", gating: true },
                   { iso: "1849-09-15", gating: false }, { iso: "1849-12-20", gating: false } ];
    var rows = [], pass = true;
    checks.forEach(function(c){
      var day = eventDateToSimDay(c.iso);
      var target = Math.round(fillTargetTotal(day));
      var lm = reservationsAt(day).length;
      var fill = deriveFillSet(day).filter(function(e){ return e.counted; }).length;
      var total = fill + lm, dev = target > 0 ? Math.abs(total - target) / target : 0;
      var ok = dev <= EPS_FRAC;
      rows.push({ date: c.iso, target: target, landmarks: lm, fill: fill, total: total,
                  devPct: +(dev*100).toFixed(2), gating: c.gating, informational: !c.gating, ok: ok });
      if(c.gating && !ok) pass = false;
    });
    return { pass: pass, tolerancePct: EPS_FRAC*100, checks: rows };
  });

  /* ---- fillEraMix — the fill CLASS mix (shanty/frame/adobe) within ±8% of
     28/39/33 at 1847-04. ---- */
  registerAudit("buildings", "fillEraMix", function(){
    var day = eventDateToSimDay("1847-04-01");
    var set = deriveFillSet(day).filter(function(e){ return e.counted; });
    var n = set.length, c = { shanty: 0, frame: 0, adobe: 0 };
    set.forEach(function(e){ c[e.cat] = (c[e.cat] || 0) + 1; });
    var target = FILL_MIX_1847, cats = ["shanty", "frame", "adobe"], viol = [], rows = {};
    var pass = n > 0;
    cats.forEach(function(k){
      var frac = n > 0 ? c[k] / n : 0, dev = Math.abs(frac - target[k]);
      rows[k] = { count: c[k], frac: +frac.toFixed(3), target: target[k], devPct: +(dev*100).toFixed(2) };
      if(dev > MIX_TOL){ pass = false; viol.push({ cat: k, frac: +frac.toFixed(3), target: target[k] }); }
    });
    return { pass: pass, n: n, tolerancePct: MIX_TOL*100, mix: rows, violations: viol };
  });

  /* ---- fillFootprintsOBB — fill footprints are DETACHED: 0 pairwise OBB
     overlap, 0 overlap vs the 51 landmark footprints, 0 crossing any ROW
     centerline. Sampled at the gate dates + the canonical noons. ---- */
  registerAudit("buildings", "fillFootprintsOBB", function(){
    var days = ["1847-04-01", "1848-04-01", "1849-09-15", "1849-12-20"].map(eventDateToSimDay);
    var segs = (typeof PLACEMENT_STREET_SEGS !== "undefined") ? PLACEMENT_STREET_SEGS : [];
    var pairViol = 0, lmViol = 0, rowViol = 0, maxPair = 0, sample = [], perDay = [];
    days.forEach(function(day){
      var set = deriveFillSet(day), quads = set.map(fillQuad);
      var lmq = landmarkQuadsAt(day), i, j;
      var dPair = 0, dLm = 0, dRow = 0;
      for(i = 0; i < quads.length; i++){
        for(j = i + 1; j < quads.length; j++){
          var pen = penetration(quads[i], quads[j]);
          if(pen > maxPair) maxPair = pen;
          if(pen > 0.05){ dPair++; if(sample.length < 6) sample.push({ day: +day.toFixed(0), a: set[i].code, b: set[j].code, pen: +pen.toFixed(3) }); }
        }
        for(j = 0; j < lmq.length; j++) if(penetration(quads[i], lmq[j]) > 0.05){ dLm++; if(sample.length < 6) sample.push({ day: +day.toFixed(0), fill: set[i].code, vsLandmark: true }); }
        var cx = set[i].cx, cz = set[i].cz;
        for(j = 0; j < segs.length; j++){
          var mx = (segs[j].x0 + segs[j].x1)/2, mz = (segs[j].z0 + segs[j].z1)/2;
          if(Math.hypot(mx - cx, mz - cz) > 90) continue;
          if(segCrossesQuad(quads[i], segs[j])){ dRow++; if(sample.length < 6) sample.push({ day: +day.toFixed(0), fill: set[i].code, row: segs[j].id }); break; }
        }
      }
      pairViol += dPair; lmViol += dLm; rowViol += dRow;
      perDay.push({ date: +day.toFixed(0), fill: set.length, pairOverlaps: dPair, vsLandmark: dLm, rowCrossings: dRow });
    });
    return { pass: pairViol === 0 && lmViol === 0 && rowViol === 0,
             pairOverlaps: pairViol, vsLandmark: lmViol, rowCrossings: rowViol,
             maxPairOverlapM: +maxPair.toFixed(3), perDay: perDay, sample: sample.slice(0, 6) };
  });

  /* ---- fillFrontageOpenness — no block-perimeter ramparts: per block edge the
     built fraction (sum of fill widths / edge length) stays under the era cap,
     so the 1847-48 village reads gap-toothed, not wall-packed. ---- */
  registerAudit("buildings", "fillFrontageOpenness", function(){
    var days = ["1847-04-01", "1848-04-01"].map(eventDateToSimDay);
    var over = [], maxFrac = 0, rows = [];
    days.forEach(function(day){
      var set = deriveFillSet(day), byEdge = {};
      set.forEach(function(e){
        var g = byEdge[e.edgeId] || (byEdge[e.edgeId] = { built: 0, len: e.edgeLen });
        g.built += e.w;
      });
      var edges = 0, worst = 0;
      Object.keys(byEdge).forEach(function(id){
        var g = byEdge[id], frac = g.len > 0 ? g.built / g.len : 0; edges++;
        if(frac > maxFrac) maxFrac = frac;
        if(frac > worst) worst = frac;
        if(frac > FILL_EDGE_CAP + 1e-6) over.push({ date: +day.toFixed(0), edge: id, frac: +frac.toFixed(3) });
      });
      rows.push({ date: +day.toFixed(0), edgesBuilt: edges, worstEdgeFrac: +worst.toFixed(3) });
    });
    return { pass: over.length === 0, capFrac: FILL_EDGE_CAP, maxEdgeFrac: +maxFrac.toFixed(3),
             overCap: over.slice(0, 8), perDay: rows };
  });

  /* ---- fillDeterminism — same day twice ⇒ identical fill set; rewind A->B->A
     exact. The master is a cached pure product of a dedicated seeded stream, so
     this holds by construction; the audit PROVES it at the fingerprint. ---- */
  registerAudit("buildings", "fillDeterminism", function(){
    function fp(day){
      return deriveFillSet(day).map(function(e){
        return e.code + "|" + e.cx.toFixed(3) + "|" + e.cz.toFixed(3) + "|" + e.state + "|" + e.hFrac.toFixed(3) + "|" + e.yaw.toFixed(5) + "|" + (e.counted ? 1 : 0);
      }).join("\n");
    }
    var A = eventDateToSimDay("1847-04-01"), B = eventDateToSimDay("1848-04-01");
    var a1 = fp(A), a2 = fp(A), bJump = fp(B), aBack = fp(A);
    var sameDay = (a1 === a2), rewind = (a1 === aBack);
    return { pass: sameDay && rewind, sameDayIdentical: sameDay, rewindExact: rewind,
             countA: a1.split("\n").filter(Boolean).length, countB: bJump.split("\n").filter(Boolean).length };
  });
})();

/* =====================================================================
   THE PLACEMENT-INVARIANT AUDITS (s99, terrain-morphing-spec §5). Two standing
   audits over the RENDERED building set (landmarks + fill) at the canonical
   dates, enforcing §4 physically against the STATIC 1846 terrain (they become
   date-aware for free once terrainHeightAt(x,z,day) exists in step 2). Each is a
   framing-independent pure function: it reads terrainHeight + the y=0 waterline,
   never the camera. Measurement law: the footprint quad is the drawn OBB (centre/
   size/yaw) — the same box the renderer bakes. ===================================================================== */
(function registerPlacementInvariantAudits(){
  var WATER_Y      = 0.0;   // bay water plane (mirrors WHARF_WATER_Y)
  var SUBMERGE_TOL = 0.3;   // a footprint corner may dip this far under the waterline (shore-edge overhang) before it is "in water"
  var FLOAT_TOL    = 0.4;   // a footprint corner may hang this far above the ground before it is "floating"

  function sampleDays(){
    var ds = ["1846-07-01", "1848-04-01", "1849-09-15", "1849-12-20", "1849-12-26"];
    var out = ds.map(function(iso){ return eventDateToSimDay(iso); });
    if(typeof simDay === "number") out.push(simDay);
    return out;
  }
  /* the drawn OBB [SW,SE,NE,NW]: depth axis = frontage normal (sin yaw, cos yaw),
     width axis = its perpendicular — identical to the fill audits' fillQuad. */
  function poseQuad(cx, cz, w, d, yaw){
    var nx = Math.sin(yaw), nz = Math.cos(yaw), tx = nz, tz = -nx, hw = w / 2, hd = d / 2;
    function P(sw, sd){ return { x: cx + tx * sw + nx * sd, z: cz + tz * sw + nz * sd }; }
    return [ P(-hw, -hd), P(hw, -hd), P(hw, hd), P(-hw, hd) ];
  }
  /* every RENDERED building at `day`: landmarks + fill, each with its drawn OBB
     and its authored over-water / stilted exception flags. */
  function renderedAt(day){
    var out = [];
    deriveLandmarkSet(day).forEach(function(L){
      out.push({ kind: "landmark", id: L.id, cx: L.cx, cz: L.cz,
                 quad: poseQuad(L.cx, L.cz, L.w, L.d, L.yaw), overWater: !!L.overWater, stilted: !!L.stilted });
    });
    deriveFillSet(day).forEach(function(F){
      out.push({ kind: "fill", id: F.code, cx: F.cx, cz: F.cz,
                 quad: poseQuad(F.cx, F.cz, F.w, F.d, F.yaw), overWater: !!F.overWater, stilted: !!F.stilted });
    });
    return out;
  }

  /* ---- buildingInWater — no rendered building's base (centroid) is below the
     waterline, and no footprint corner is more than SUBMERGE_TOL below it, UNLESS
     the building carries an authored overWater exception. Fail-before: the s95
     waterfront landmarks anchored on the un-filled cove (sign-of-the-watch,
     cross-hobson-co) submerge; pass-after: the land-at-date gate un-renders them. */
  registerAudit("buildings", "buildingInWater", function(){
    var days = sampleDays(), viol = [], perDay = [], maxUnder = 0;
    days.forEach(function(day){
      var bs = renderedAt(day), dv = 0;
      bs.forEach(function(b){
        if(b.overWater) return;                                  // authored water structure — exempt
        var centroidUnder = WATER_Y - terrainHeight(b.cx, b.cz); // >0 ⇒ centroid below the waterline
        var worstCorner = 0;
        b.quad.forEach(function(c){ var u = WATER_Y - terrainHeight(c.x, c.z); if(u > worstCorner) worstCorner = u; });
        if(worstCorner > maxUnder) maxUnder = worstCorner;
        if(centroidUnder > 0 || worstCorner > SUBMERGE_TOL){
          dv++;
          if(viol.length < 12) viol.push({ day: +day.toFixed(1), kind: b.kind, id: b.id,
            centroidUnderM: +centroidUnder.toFixed(3), worstCornerUnderM: +worstCorner.toFixed(3) });
        }
      });
      perDay.push({ day: +day.toFixed(1), rendered: bs.length, offenders: dv });
    });
    return { pass: viol.length === 0, submergeTolM: SUBMERGE_TOL, offenders: viol.length,
             maxCornerUnderM: +maxUnder.toFixed(3), sample: viol.slice(0, 10), perDay: perDay };
  });

  /* ---- buildingFloating — no rendered footprint corner is suspended more than
     FLOAT_TOL above terrainHeight at that corner (the slope case: the flat pad
     sits at the centroid's ground height, so a downhill corner hangs in air),
     UNLESS an authored stilted exception.

     NON-GATING (informational), by brief §3 ("there may be some on sloped ground
     — surface them; if the fix is non-trivial, flag for the Director, don't
     force"). The offenders are REAL: authored landmarks and steep-slope fill on
     the natural plaza→Stockton grade float up to several metres at their downhill
     corner, because the placeholder is a FLAT pad at one (centroid) height with no
     foundation cut/fill. The honest fix is a Director-level REPRESENTATION
     decision — a foundation-skirt-to-grade plinth, or the step-2 terrain grading
     (cut/fill morph) that levels the building pad — NOT a number forced green
     here. So this audit REPORTS the offenders every run (a standing watch that
     drops to zero once grading lands) but does not red the gate. `pass` stays true
     while `gating:false` + `offenders` carry the finding — the fillCensus
     informational-check convention. ---- */
  registerAudit("buildings", "buildingFloating", function(){
    var days = sampleDays(), off = [], perDay = [], maxFloat = 0, total = 0;
    days.forEach(function(day){
      var bs = renderedAt(day), dv = 0;
      bs.forEach(function(b){
        if(b.stilted) return;
        var baseY = terrainHeight(b.cx, b.cz);                   // the mesh base sits at the centroid's ground height
        var worst = 0;
        b.quad.forEach(function(c){ var f = baseY - terrainHeight(c.x, c.z); if(f > worst) worst = f; });
        if(worst > maxFloat) maxFloat = worst;
        if(worst > FLOAT_TOL){ dv++; total++; if(off.length < 12) off.push({ day: +day.toFixed(1), kind: b.kind, id: b.id, cornerFloatM: +worst.toFixed(3) }); }
      });
      perDay.push({ day: +day.toFixed(1), rendered: bs.length, offenders: dv });
    });
    return { pass: true, gating: false, floatTolM: FLOAT_TOL, offenders: total,
             maxCornerFloatM: +maxFloat.toFixed(3), sample: off.slice(0, 10), perDay: perDay,
             note: "INFORMATIONAL (non-gating): slope-grading offenders flagged for the Director — resolved by a foundation-skirt-to-grade plinth or step-2 terrain grading, not forced here." };
  });
})();

/* driving hooks for the verify harness / Atelier — the derived fill set + a
   numbers table, exposed over the pure derive (zero new geometry). */
setTimeout(function(){
  if(typeof window !== "undefined" && window.__P1850){
    window.__P1850.fillAt = function(day){ return deriveFillSet(day == null ? simDay : day); };
    window.__P1850.fillCount = function(day){ return deriveFillSet(day == null ? simDay : day).filter(function(e){ return e.counted; }).length; };
    window.__P1850.fillMasterSize = function(){ return buildFillMaster().length; };
    window.__P1850.fillCensus = function(iso){
      var day = eventDateToSimDay(iso);
      var lm = reservationsAt(day).length, fill = window.__P1850.fillCount(day);
      return { date: iso, target: Math.round(fillTargetTotal(day)), landmarks: lm, fill: fill, total: fill + lm };
    };
  }
}, 0);
