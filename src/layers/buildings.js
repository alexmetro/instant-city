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
    var f = lmFootprint(rec, fp);
    out.push({ id: rec.landmarkId, name: rec.name, cls: lmClassOf(rec.landmarkId),
               cx: f.cx, cz: f.cz, w: f.w, d: f.d, yaw: f.yaw, nx: f.nx, nz: f.nz,
               state: st.state, hFrac: st.hFrac, arc: st.arc,
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
    var days = sampleDays(), viol = [], perDay = [];
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
      // every completed reservation (reservationsAt) has exactly one mesh at its centroid
      var res = reservationsAt(day);
      res.forEach(function(r){
        var matches = set.filter(function(e){ return e.id === r.landmarkId; });
        if(matches.length !== 1){ viol.push({ day: +day.toFixed(1), id: r.landmarkId, why: "expected-1-mesh", got: matches.length }); return; }
        var fp = resolveReservationFootprint(r, day); if(!fp) return;
        var e = matches[0], dd = Math.hypot(e.cx - fp.cx, e.cz - fp.cz);
        if(dd > EPS) viol.push({ day: +day.toFixed(1), id: r.landmarkId, why: "centroid-off", off: +dd.toFixed(3) });
      });
      perDay.push({ day: +day.toFixed(1), rendered: set.length, completed: res.length });
    }
    return { pass: viol.length === 0, violations: viol.length, sample: viol.slice(0, 8), perDay: perDay };
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
