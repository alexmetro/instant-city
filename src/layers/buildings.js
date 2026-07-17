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
/* @P1850-CHUNK 16 — buildings: THE LANDMARK REGISTRY renderer + the s108 BUILDING LIFECYCLE state machine (buildingStateAt: construct C0->C4 -> active/aging -> expand -> burn -> RUINS -> clear -> rebuild | teardown; the Dec 24 1849 Great Fire world event; per-state placeholders) */

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

/* =====================================================================
   s108 — THE BUILDING LIFECYCLE STATE MACHINE (building-lifecycle-spec.md).
   A building is not an object with a build date and a burn date — it is a
   DATED TIMELINE (spec §1). The C0->C4 construction machine above is the
   FIRST CHAPTER; this section generalizes it to the full lifecycle:

     construct C0->C4 -> complete (fresh-wood sheen aging, §2a)
       -> expand (annex growing) -> complete (new form)
       -> burn (~1 day, SHARP) -> RUINS (persistent STATE — the ruins gate,
          spec §2b: no construction on a lot in ruins) -> clearing -> cleared
          -> rebuild C0->C4 (only after cleared) | gone
       -> teardown (controlled deconstruct, the density/replacement path)
          -> cleared -> rebuild | gone

   TRIGGERS (spec §4): LANDMARKS carry AUTHORED arcs (LM_LIFECYCLE_ARCS below
   + built/burned back-compat from the registry); FILL carries a SIMULATED
   lifecycle (spec §4b) generated from pure seeded hashes of the building
   identity — zero dice at query time, rewind-exact. WORLD EVENTS (spec §4/D1)
   apply spatially: the Dec 24 1849 Great Fire is an authored perimeter that
   burns EVERY building it covers (landmark AND fill) — a fill building burns
   because it stood in the fire, never because a die said so.

   The single query is buildingStateAt(spans, day) — a pure function returning
   { phase, state(C0..C4), hFrac, constructT, agingT, transition, form }
   (spec §6). The renderer maps each phase to a DISTINCT placeholder visual
   (the operator's key steer: states readable at a glance in crude blocks —
   see the LC legend at lmBuildMesh). ===================================== */

/* ---- lifecycle durations (fill:true tunables; spec §3: gradual<->sharp is
   ONE parameter — transition duration). ---- */
var LC_BURN_DAYS          = 1;     // burn: ~hours-1 day (SHARP)
var LC_RUINS_DEFAULT_DAYS = 21;    // un-authored ruins hold (a lot could sit burnt for months)
var LC_CLEAR_DEFAULT_DAYS = 4;     // hauling off debris
var LC_TEARDOWN_DAYS      = 4;     // controlled deconstruct (~days)
var LC_CLEARED_HOLD_DAYS  = 14;    // a cleared lot with NO scheduled rebuild reads as bare ground this long, then 'gone'
var LC_FRESH_DAYS         = 365;   // §2a fresh-wood sheen: bright ~first year -> weathered persists

/* ---- QA knobs (per-system debug affordance; default OFF — used by the
   rules-first fail-before probes; a version bump invalidates every lifecycle
   cache so toggling is deterministic + rewind-exact either way). ---- */
var LC_QA = { breakRuinsGate: false, disableWorldEvents: false, version: 0 };

/* deterministic string-keyed hash -> [0,1) (hash1 over a rolled integer key).
   NEVER an rng draw — the fill lifecycle is a pure function of the building
   identity + salt (spec §4b determinism law). */
function lcStrKey(s){ var k = 0; for(var i = 0; i < s.length; i++){ k = (k * 131 + s.charCodeAt(i)) >>> 0; } return k % 1000003; }
function lcHash(id, salt){ return hash1(lcStrKey(String(id) + "|" + salt)); }

/* =====================================================================
   WORLD EVENTS (spec §4 / D1). THE DEC 24 1849 GREAT FIRE — the first great
   fire, origin Dennison's Exchange ~6am (dossier §1.4; registry dates_note;
   Annals of San Francisco: the east side of Portsmouth Square destroyed,
   ~a million dollars lost). The AUTHORED PERIMETER is expressed in the
   cadastre's own vocabulary (block + frontage edge + sub-interval + depth —
   the same strips the reservations use) and resolved to world quads through
   the SAME resolveReservationFootprint path, so the scope is grounded to the
   record's blocks, not hand-typed world coordinates:
     • the KEARNY frontage of B|kearny|montgomery|washington|clay (full edge,
       26 m deep): Parker House + El Dorado — the east side of the Square.
     • the KEARNY frontage of B|kearny|montgomery|jackson|washington (frac
       0.20-1.00, 26 m deep): Dennison's Exchange (origin) + the adjoining
       Kearny row (Colonnade House — undocumented either way; the perimeter
       is the record's "east side" scope, so it burns WITH its row).
     • the WASHINGTON frontage of B|dupont|kearny|jackson|washington at its
       KEARNY end (frac 0.53-1.00, 24 m deep): Bella Union. The Alta
       California office (frac 0.10-0.42) and the California Star rear-lot
       slice (0.44-0.54) sit WEST of the strip — the record has both papers
       publishing after the fire, so the perimeter stops short of them.
   MEMBERSHIP RULE (one rule, engine + audit): a building is IN the fire iff
   its footprint CENTROID lies inside a perimeter strip. Landmarks with an
   authored burned:1849-12-24 CONFIRM the event (the record wins, D1). ===== */
var WORLD_EVENTS = [{
  id: "great-fire-1849", kind: "fire", dateISO: "1849-12-24",
  perimeter: [
    { block: "B|kearny|montgomery|washington|clay",    frontage: "west",  frac0: 0.00, frac1: 1.00, depthM: 26 },
    { block: "B|kearny|montgomery|jackson|washington", frontage: "west",  frac0: 0.20, frac1: 1.00, depthM: 26 },
    { block: "B|dupont|kearny|jackson|washington",     frontage: "south", frac0: 0.53, frac1: 1.00, depthM: 24 }
  ]
}];
var _lcFireCache = null;
function lcFireEvents(){
  if(_lcFireCache) return _lcFireCache;
  _lcFireCache = WORLD_EVENTS.map(function(ev){
    var day = eventDateToSimDay(ev.dateISO), quads = [];
    ev.perimeter.forEach(function(s){
      var fp = resolveReservationFootprint({ anchor: { kind: "block-frontage", block: s.block,
        frontage: s.frontage, frontFrac0: s.frac0, frontFrac1: s.frac1, depthM: s.depthM } }, day);
      if(fp) quads.push(fp.quad);
    });
    return { id: ev.id, day: day, quads: quads };
  });
  return _lcFireCache;
}
function lcPointInQuad(q, x, z){                                // convex quad sign test
  var sign = 0;
  for(var i = 0; i < 4; i++){
    var a = q[i], b = q[(i + 1) % 4];
    var cr = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    if(cr !== 0){ var s = cr > 0 ? 1 : -1; if(sign === 0) sign = s; else if(s !== sign) return false; }
  }
  return true;
}
/* the fire event covering a centroid (or null). LC_QA.disableWorldEvents is the
   fireScope fail-before knob: with the world event unwired, in-perimeter
   buildings do not burn and the audit goes red. */
function lcFireHit(cx, cz){
  if(LC_QA.disableWorldEvents) return null;
  var evs = lcFireEvents();
  for(var i = 0; i < evs.length; i++)
    for(var k = 0; k < evs[i].quads.length; k++)
      if(lcPointInQuad(evs[i].quads[k], cx, cz)) return evs[i];
  return null;
}

/* =====================================================================
   AUTHORED LANDMARK ARCS (spec §4 SELF-AUTHORED / D2: author only where the
   record gives an arc; every other landmark stays the degenerate built(/burned)
   case). Dates from the dossier / registry notes:
     • el-dorado — canvas tent (~15x25 ft) Apr 1849 -> 3-story building by fall
       (dossier §1.3; spec §5's own example arc). Construct = the tent (canvas,
       "as if by magic" lead); expand completes 1849-09-01.
     • dennisons-exchange — burned Dec 24; "rebuilt in 16 days" (reopened
       mid-Jan 1850, out of window): ruins cleared fast, rebuild starts in the
       last days of Dec — its C1 site work is visible before the window ends.
     • parker-house — burned Dec 24; rebuilt 1850 (out of window): slower
       ruins->clear, rebuild completion far out of window.
     • el-dorado — burned Dec 24; rebuilt quickly (reopened weeks later, out
       of window).
     • bella-union — burned Dec 24; rebuilt (and burned again May 4 1850, out
       of window).
   A landmark burned WITHOUT an authored postBurn arc (e.g. Colonnade House,
   burned via the world event with no documented aftermath) takes the default
   ruins/clear durations and NO rebuild (nothing invented, D2). ============ */
var LM_LIFECYCLE_ARCS = {
  "el-dorado": {
    construct: { leadDays: 3, form: { cls: "canvas", hM: 3.0, stories: 1 } },
    expand:    { onISO: "1849-09-01", durationDays: 30, form: { cls: "hotel", hM: 9.6, stories: 3 } },
    postBurn:  { ruinsUntilISO: "1849-12-27", clearDays: 3, rebuild: { onISO: "1850-02-01", leadDays: 30 } }
  },
  "dennisons-exchange": {
    postBurn: { ruinsUntilISO: "1849-12-26", clearDays: 2, rebuild: { onISO: "1850-01-09", leadDays: 12 } }
  },
  "parker-house": {
    postBurn: { ruinsUntilISO: "1849-12-28", clearDays: 3, rebuild: { onISO: "1850-04-01", leadDays: 75 } }
  },
  "bella-union": {
    postBurn: { ruinsUntilISO: "1849-12-28", clearDays: 3, rebuild: { onISO: "1850-03-01", leadDays: 45 } }
  }
};

/* =====================================================================
   THE EVENT LIST -> SPAN TIMELINE compiler. Events ({type, start, on, form,
   via}) sorted by start compile to a CONTIGUOUS span list covering all time —
   each span { from, to, phase, ...detail }. buildingStateAt() then answers any
   day by locating its span. Both are pure; the compile is cached per building
   (invalidated by LC_QA.version). ======================================== */
function lcBuildSpans(evs){
  var spans = [], t = -1e9, form = null, formDoneAt = null, prevType = null, prevVia = null;
  function push(from, to, phase, extra){
    if(to - from > 1e-9){ var s = extra || {}; s.from = from; s.to = to; s.phase = phase; spans.push(s); }
  }
  for(var i = 0; i <= evs.length; i++){
    var ev = i < evs.length ? evs[i] : null;
    var idleEnd = ev ? Math.max(ev.start, t) : 1e9;
    if(idleEnd > t){                                            // the idle span the previous event left us in
      if(prevType === null) push(t, idleEnd, "absent");
      else if(prevType === "construct" || prevType === "rebuild" || prevType === "expand")
        push(t, idleEnd, "complete", { form: form, formDoneAt: formDoneAt });
      else if(prevType === "burn") push(t, idleEnd, "ruins", { via: prevVia });
      else if(prevType === "clear" || prevType === "teardown"){
        if(ev) push(t, idleEnd, "cleared");                     // rebuild scheduled: bare lot until it starts
        else { var hold = Math.min(idleEnd, t + LC_CLEARED_HOLD_DAYS);
               push(t, hold, "cleared"); push(hold, idleEnd, "gone"); }
      }
      t = idleEnd;
    }
    if(!ev) break;
    var on = Math.max(ev.on, ev.start + 1e-6);
    if(ev.type === "construct" || ev.type === "rebuild"){
      push(ev.start, on, "constructing", { form: ev.form || form, rebuild: ev.type === "rebuild" });
      form = ev.form || form; formDoneAt = on;
    } else if(ev.type === "expand"){
      push(ev.start, on, "expanding", { form: ev.form, prevForm: form, formDoneAt: formDoneAt });
      form = ev.form; formDoneAt = on;
    } else if(ev.type === "burn"){
      push(ev.start, on, "burning", { form: form, via: ev.via });
      form = null; formDoneAt = null; prevVia = ev.via;
    } else if(ev.type === "teardown"){
      push(ev.start, on, "teardown", { form: form });
      form = null; formDoneAt = null;
    } else if(ev.type === "clear"){
      push(ev.start, on, "clearing", {});
    }
    t = Math.max(t, on);
    prevType = ev.type;
  }
  return spans;
}
/* THE STATE QUERY (spec §6) — pure function of (compiled spans, day). */
function buildingStateAt(spans, day){
  var s = null;
  for(var i = 0; i < spans.length; i++){ if(day >= spans[i].from && day < spans[i].to){ s = spans[i]; break; } }
  if(!s) s = spans.length ? spans[spans.length - 1] : { phase: "absent", from: 0, to: 1 };
  var out = { phase: s.phase, state: 0, hFrac: 0, constructT: 0, agingT: 1, transition: null,
              form: s.form || null, prevForm: s.prevForm || null,
              active: s.phase !== "absent" && s.phase !== "gone" };
  var prog = (s.to - s.from) > 0 ? clamp((day - s.from) / (s.to - s.from), 0, 1) : 1;
  switch(s.phase){
    case "constructing":
      out.constructT = prog;
      out.state = prog < 0.15 ? 1 : (prog < 0.5 ? 2 : (prog < 0.85 ? 3 : 4));
      out.hFrac = out.state === 1 ? 0 : (out.state === 2 ? 0.45 : (out.state === 3 ? 0.8 : 1.0));
      out.transition = { type: s.rebuild ? "rebuild" : "construct", progress: prog };
      break;
    case "complete":
      out.state = 4; out.hFrac = 1; out.constructT = 1;
      out.agingT = (s.formDoneAt != null) ? clamp((day - s.formDoneAt) / LC_FRESH_DAYS, 0, 1) : 1;
      break;
    case "expanding":
      out.state = 4; out.hFrac = 1; out.constructT = 1;
      out.agingT = (s.formDoneAt != null) ? clamp((day - s.formDoneAt) / LC_FRESH_DAYS, 0, 1) : 1;
      out.transition = { type: "expand", progress: prog };
      break;
    case "burning":
      out.state = 4; out.hFrac = 1; out.constructT = 1;
      out.transition = { type: "burn", progress: prog, via: s.via || null };
      break;
    case "ruins":    out.transition = { type: "ruins", progress: 0, via: s.via || null }; break;
    case "clearing": out.transition = { type: "clear", progress: prog }; break;
    case "teardown": out.transition = { type: "teardown", progress: prog }; break;
  }
  return out;
}

/* ---- the LANDMARK lifecycle: authored events from the registry record +
   LM_LIFECYCLE_ARCS + world-event participation. Cached per landmarkId. ---- */
var _lmSpanCache = {}, _lmSpanCacheVer = 0;
function lmLifecycleOf(rec){
  if(_lmSpanCacheVer !== LC_QA.version){ _lmSpanCache = {}; _lmSpanCacheVer = LC_QA.version; }
  var hit = _lmSpanCache[rec.landmarkId]; if(hit) return hit;
  var arcs = LM_LIFECYCLE_ARCS[rec.landmarkId] || {};
  var kit = lmKitOf(rec.landmarkId), evs = [];
  var c = arcs.construct || null;
  var cStart = (c && c.leadDays != null) ? rec.built - c.leadDays : lmStartDay(rec);
  evs.push({ type: "construct", start: cStart, on: rec.built,
             form: (c && c.form) || { cls: lmClassOf(rec.landmarkId), hM: kit.h } });
  if(arcs.expand){
    var xOn = eventDateToSimDay(arcs.expand.onISO);
    evs.push({ type: "expand", start: xOn - (arcs.expand.durationDays || 21), on: xOn, form: arcs.expand.form });
  }
  // burn: the authored record CONFIRMS/overrides the world event (the record wins)
  var fire = rec.footprint ? lcFireHit(rec.footprint.cx, rec.footprint.cz) : null;
  var burnDay = rec.burned != null ? rec.burned : (fire ? fire.day : null);
  if(burnDay != null){
    var viaFire = fire && (rec.burned == null || Math.abs(rec.burned - fire.day) < 0.51);
    evs.push({ type: "burn", start: burnDay, on: burnDay + LC_BURN_DAYS, via: viaFire ? fire.id : "authored" });
    var pb = arcs.postBurn || {};
    var ruinsEnd = pb.ruinsUntilISO ? eventDateToSimDay(pb.ruinsUntilISO) : burnDay + LC_BURN_DAYS + LC_RUINS_DEFAULT_DAYS;
    if(ruinsEnd < burnDay + LC_BURN_DAYS) ruinsEnd = burnDay + LC_BURN_DAYS;
    var clearOn = ruinsEnd + (pb.clearDays != null ? pb.clearDays : LC_CLEAR_DEFAULT_DAYS);
    evs.push({ type: "clear", start: ruinsEnd, on: clearOn });
    if(pb.rebuild){
      var rOn = eventDateToSimDay(pb.rebuild.onISO);
      var rStart = rOn - (pb.rebuild.leadDays != null ? pb.rebuild.leadDays : lmLeadDays(rec));
      if(rStart < clearOn) rStart = clearOn;                    // THE RUINS GATE (spec §2b): rebuild only on cleared ground
      if(LC_QA.breakRuinsGate) rStart = burnDay + 0.5;          // QA fail-before knob: rebuild while ruins uncleared
      evs.push({ type: "rebuild", start: rStart, on: Math.max(rOn, rStart + 1),
                 form: pb.rebuild.form || { cls: lmClassOf(rec.landmarkId), hM: kit.h } });
    }
  }
  evs.sort(function(a, b){ return a.start - b.start; });
  var out = { events: evs, spans: lcBuildSpans(evs) };
  _lmSpanCache[rec.landmarkId] = out;
  return out;
}
/* the state at `day` — the ONE query the renderer + audits read (legacy fields
   state/hFrac/arc/active preserved; phase/transition/agingT/form are the s108
   lifecycle read). Pure, zero dice, rewind-exact. */
function lmStateAt(rec, day){
  var lc = lmLifecycleOf(rec);
  var s = buildingStateAt(lc.spans, day);
  s.arc = s.constructT;
  s.startDay = lc.events[0].start; s.lead = lc.events[0].on - lc.events[0].start;
  return s;
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
   UNIVERSAL GROUNDING (temporal-world-model.md §3b THE UNIVERSAL GROUNDING
   RULE, s100). DEFAULT engine behavior for every ground-standing structure: the
   flat floor sits at the HIGHEST sampled footprint point (+ε) so nothing buries
   into the hill, and an auto-generated FOUNDATION PLINTH skirt drops from that
   floor down to the terrain at every perimeter sample so nothing floats — tall
   on the downhill side, thin uphill (period-correct built-up foundations on the
   grade). ONE function, consumed by BOTH the landmark renderer and the fill
   renderer, replacing the old single centroid-height base (var y =
   terrainHeight(cx,cz)). Programmatic, never hand-authored — the spawner places
   thousands, so grounding is computed from the footprint + terrain, per object,
   every time. Pure function of (footprint + static terrain); the swap to
   terrainHeightAt(x,z,day) when terrain-morphing lands is one call-site change
   here (terrainHeight -> terrainHeightAt). Generalizes the legacy
   buildFoundationSkirts plinth (donor buildings.js) from lowest-corner box to a
   per-corner grade-hugging skirt. ===================================================================== */
var GROUND_EPS      = 0.02;   // the floor clears the highest footprint corner by this (nothing buries)
var GROUND_STEP_M   = 1.5;    // m — perimeter sample spacing: the skirt's bottom edge follows the grade on this pitch, so on a steep bank (the shoreline scarp) it hugs the drop instead of chording over it
/* the footprint perimeter sample ring (world XZ) for a posed box: each edge
   subdivided into ~GROUND_STEP_M sub-segments (never fewer than one interior
   sample) so the skirt tracks the grade even where the terrain drops steeply
   across a single facade (waterfront bank). The plinth is built from — and the
   buildingFloating audit is measured against — exactly this ring. */
function groundPerimeter(cx, cz, w, d, yaw){
  var nx = Math.sin(yaw), nz = Math.cos(yaw), tx = nz, tz = -nx, hw = w / 2, hd = d / 2;
  function P(sw, sd){ return { x: cx + tx * sw + nx * sd, z: cz + tz * sw + nz * sd }; }
  var corners = [ P(-hw, -hd), P(hw, -hd), P(hw, hd), P(-hw, hd) ], ring = [];
  for(var i = 0; i < 4; i++){
    var a = corners[i], b = corners[(i + 1) % 4];
    ring.push(a);
    var segs = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / GROUND_STEP_M));
    for(var k = 1; k < segs; k++){
      var t = k / segs;
      ring.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return ring;
}
/* sample terrainHeight around the footprint perimeter. Returns the level floorY
   (highest sample + ε) and the ring with each point's ground height — the plinth
   generation and the buildingFloating audit both read this ONE result (the
   instrument reads the numbers the picture draws). */
function groundStructureAt(cx, cz, w, d, yaw){
  var ring = groundPerimeter(cx, cz, w, d, yaw), maxH = -Infinity, minH = Infinity;
  for(var i = 0; i < ring.length; i++){
    var h = terrainHeight(ring[i].x, ring[i].z);
    ring[i].groundY = h;
    if(h > maxH) maxH = h;
    if(h < minH) minH = h;
  }
  return { floorY: maxH + GROUND_EPS, ring: ring, minGroundY: minH, maxGroundY: maxH };
}
/* the auto-generated FOUNDATION PLINTH geometry: a closed vertical skirt whose
   TOP edge is level at floorY and whose BOTTOM edge drops to the sampled terrain
   at each perimeter point (tall downhill, thin uphill). Two triangles per ring
   segment, position + color only (mergeGeoms consumes those; LM_MAT flat-shades,
   so face normals are derived in-shader — no normal attribute needed). Colour =
   the neutral pad tone (a hair darker than the body, Option-B). */
function groundPlinthGeo(g, color){
  var ring = g.ring, n = ring.length, pos = new Float32Array(n * 18), j = 0, fy = g.floorY;
  function push(x, y, z){ pos[j++] = x; pos[j++] = y; pos[j++] = z; }
  for(var i = 0; i < n; i++){
    var a = ring[i], b = ring[(i + 1) % n];
    push(a.x, a.groundY, a.z); push(b.x, b.groundY, b.z); push(b.x, fy, b.z);   // outward-wound skirt quad
    push(a.x, a.groundY, a.z); push(b.x, fy, b.z); push(a.x, fy, a.z);
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return colorizeUniform(geo, color);
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
    var form = st.form || {}, kit = lmKitOf(rec.landmarkId);
    out.push({ id: rec.landmarkId, name: rec.name, cls: form.cls || lmClassOf(rec.landmarkId),
               cx: f.cx, cz: f.cz, w: f.w, d: f.d, yaw: f.yaw, nx: f.nx, nz: f.nz,
               state: st.state, hFrac: st.hFrac, arc: st.arc,
               phase: st.phase, transition: st.transition, agingT: st.agingT,
               hM: form.hM != null ? form.hM : kit.h,
               prevHM: st.prevForm && st.prevForm.hM != null ? st.prevForm.hM : null,
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
/* =====================================================================
   THE PER-STATE PLACEHOLDER LEGEND (s108, the operator's key steer: every
   lifecycle state gets its OWN DISTINCT look so a building's state reads at a
   glance even as a crude grey block — functional diagram, not final art; the
   front-face marker law stands wherever a structure is present):

     C1 site           — pad + orange ground arrow (unchanged s94a read)
     C2/C3 rising      — partial-height block in SCAFFOLD-TONE TINT STEPS
                         (pale raw-lumber tone stepping toward the class tint)
     C4/active         — the neutral class-tinted block + flat roof cap +
                         orange front stripe; FRESH-WOOD SHEEN: brighter for
                         ~the first year, fading to the standard tone (§2a)
     expanding         — full old body + a scaffold-tone ANNEX slab visibly
                         GROWING from the old roofline to the new height
     burning           — CHARCOAL body + darker roof + EMBER-RED front
                         stripe/arrow (the fire day only)
     RUINS             — a LOW DARK RUBBLE SLAB + deterministic rubble
                         boxlets + a charcoal debris wedge at the front (the
                         orange markers are gone with the structure)
     clearing          — the rubble slab + boxlets SHRINKING away
     cleared           — the bare neutral site pad, nothing else
     teardown          — the body SHRINKING back down in scaffold tone, roof
                         already off (controlled deconstruct)
     rebuild           — C0->C4 again (scaffold steps, same as construct)
   ===================================================================== */
var LC_TONES = {
  scaffold: 0xd0c8b4,     // raw-lumber/scaffold pale tone (construction + teardown + annex)
  charcoal: 0x39332e,     // burning body
  charcoalRoof: 0x2a2622, // burning roof cap
  ember: 0xe23a18,        // ember-red front markers during the burn
  rubble: 0x4d463e,       // ruins slab
  rubbleDark: 0x3a352f,   // rubble boxlets
  debris: 0x241f1a,       // the ruins front debris wedge
  freshBoost: 0.16        // fresh-wood sheen strength (lerp toward white at agingT=0)
};
/* class tint for an arbitrary form class (the id-keyed lmBodyColor stands for
   the common case; expand/rebuild forms may carry a different class). */
function lmBodyColorCls(cls){
  var cat = LM_CATEGORY[cls] || "commercial";
  return new THREE.Color(LM_TINT[cat] || LM_PLACEHOLDER.body);
}
/* construction scaffold-tone step: C2 mostly scaffold, C3 halfway, C4 = tint. */
function lcScaffoldStep(finalTint, state){
  var t = state >= 4 ? 1 : (state === 3 ? 0.55 : 0.25);
  return new THREE.Color(LC_TONES.scaffold).lerp(finalTint, t);
}
/* fresh-wood sheen (§2a): brighter for ~the first year, then the standard tone. */
function lcFreshTone(tint, agingT){
  if(agingT == null || agingT >= 1) return tint;
  return tint.clone().lerp(new THREE.Color(0xffffff), LC_TONES.freshBoost * (1 - agingT));
}
/* RUINS / CLEARING rubble kit: a low dark slab + deterministic boxlets +
   a charcoal debris wedge at the front. frac 1 = full ruins, ->0 clearing. */
function lcRubbleParts(parts, e, w, d, y, yaw, frac){
  var hs = 0.12 + 0.5 * frac;
  var slab = makeBoxLocal(w * (0.7 + 0.3 * frac), hs, d * (0.7 + 0.3 * frac), new THREE.Color(LC_TONES.rubble));
  bake(slab, new THREE.Vector3(e.cx, y + 0.28, e.cz), yaw);
  parts.push(slab);
  var idKey = lcStrKey(String(e.id != null ? e.id : (e.code + "#" + e.rank)));
  var n = Math.max(1, Math.round(3 * frac));
  for(var i = 0; i < n; i++){
    var rx = (hash1(idKey + i * 13) - 0.5) * w * 0.5, rz = (hash1(idKey + i * 13 + 5) - 0.5) * d * 0.5;
    var bw = 0.8 + hash1(idKey + i * 13 + 9) * 1.6;
    var bh = (0.5 + hash1(idKey + i * 13 + 11) * 0.8) * Math.max(frac, 0.25);
    var bx = makeBoxLocal(bw, bh, bw * 0.8, new THREE.Color(LC_TONES.rubbleDark));
    lmBakeAt(bx, rx, 0.28 + hs, rz, yaw, e.cx, y, e.cz);
    parts.push(bx);
  }
  // debris wedge — a dark flat triangle pointing INTO the lot at the front edge
  // (replaces the orange entrance arrow while the lot holds ruins; visibly NOT
  // an entrance marker: dark, inverted).
  var az0 = d / 2 + 0.4, aLen = Math.max(1.6, Math.min(w * 0.4, 3.0)) * Math.max(frac, 0.3);
  var wedge = lmTriLocal(-aLen * 0.6, az0 + aLen, aLen * 0.6, az0 + aLen, 0, az0, 0.14, new THREE.Color(LC_TONES.debris));
  var wy = terrainHeight(e.cx + Math.sin(yaw) * (d / 2 + 1.2), e.cz + Math.cos(yaw) * (d / 2 + 1.2));
  lmBakeAt(wedge, 0, 0, 0, yaw, e.cx, wy, e.cz);
  parts.push(wedge);
}
function lmBuildMesh(e){
  // UNIVERSAL GROUNDING (§3b): the floor sits on the highest footprint corner and
  // an auto foundation-plinth drops to grade at every corner — nothing floats or
  // buries on the slope. Built at the FULL reserved footprint so it grounds the
  // audited corners; the body insets a hair inside it.
  var g = groundStructureAt(e.cx, e.cz, e.w, e.d, e.yaw);
  var y = g.floorY;
  var w = Math.max(e.w - LM_INSET, 1.2), d = Math.max(e.d - LM_INSET, 1.2);
  var parts = [];
  parts.push(groundPlinthGeo(g, new THREE.Color(LM_PLACEHOLDER.pad)));
  // the neutral site pad on the level floor — present in EVERY rendered state
  // (site, structure base, ruins ground, cleared lot).
  var pad = makeBoxLocal(w, 0.3, d, new THREE.Color(LM_PLACEHOLDER.pad));
  bake(pad, new THREE.Vector3(e.cx, y, e.cz), e.yaw);
  parts.push(pad);
  var phase = e.phase || (e.state >= 4 ? "complete" : "constructing");
  var structural = (phase === "constructing" || phase === "complete" || phase === "expanding" ||
                    phase === "burning" || phase === "teardown");
  if(structural){
    // GROUND ARROW — the front/entrance orientation aid (front-face marker law),
    // present whenever a structure stands or is being built/unbuilt. Ember-red
    // during the burn; orange otherwise.
    var mkCol = phase === "burning" ? LC_TONES.ember : LM_PLACEHOLDER.marker;
    var arrowGroundY = terrainHeight(e.cx + e.nx * (e.d / 2 + 1.2), e.cz + e.nz * (e.d / 2 + 1.2));
    var az0 = d / 2 + 0.4, aLen = Math.max(2.2, Math.min(w * 0.6, 4.2)), aHW = Math.max(1.0, Math.min(w * 0.28, 1.9));
    var arrow = lmTriLocal(-aHW, az0, aHW, az0, 0, az0 + aLen, 0.14, new THREE.Color(mkCol));
    lmBakeAt(arrow, 0, 0, 0, e.yaw, e.cx, arrowGroundY, e.cz);
    parts.push(arrow);
  }
  var hFull = e.hM != null ? e.hM : lmKitOf(e.id).h;            // the current form's full height
  var tint = lmBodyColorCls(e.cls || lmClassOf(e.id));
  var prog = e.transition ? e.transition.progress : 0;
  var h = null, bodyCol = null, roofOn = false, stripeCol = LM_PLACEHOLDER.marker;
  if(phase === "constructing" && e.state >= 2){
    h = Math.max(hFull * e.hFrac, 0.8); bodyCol = lcScaffoldStep(tint, e.state); roofOn = true;
  } else if(phase === "complete"){
    h = hFull; bodyCol = lcFreshTone(tint, e.agingT); roofOn = true;
  } else if(phase === "expanding"){
    h = Math.max(e.prevHM != null ? e.prevHM : hFull * 0.5, 0.8);
    bodyCol = lcFreshTone(tint, e.agingT); roofOn = true;
  } else if(phase === "burning"){
    h = hFull; bodyCol = new THREE.Color(LC_TONES.charcoal); roofOn = true; stripeCol = LC_TONES.ember;
  } else if(phase === "teardown"){
    h = Math.max(hFull * (1 - prog), 0.5); bodyCol = new THREE.Color(LC_TONES.scaffold); roofOn = false;
  }
  if(h != null){
    var body = makeBoxLocal(w, h, d, bodyCol);
    bake(body, new THREE.Vector3(e.cx, y + 0.28, e.cz), e.yaw);
    parts.push(body);
    var topY = y + 0.28 + h;
    if(phase === "expanding"){
      // THE ANNEX — a slightly-inset scaffold-tone slab growing from the old
      // roofline toward the new full height (the operator's "annex block growing").
      var newH = Math.max(hFull, h + 0.5);
      var annexH = Math.max((newH - h) * prog, 0.3);
      var annex = makeBoxLocal(Math.max(w - 1.2, 1.0), annexH, Math.max(d - 1.2, 1.0), new THREE.Color(LC_TONES.scaffold));
      bake(annex, new THREE.Vector3(e.cx, topY, e.cz), e.yaw);
      parts.push(annex);
      topY += annexH;
    }
    if(roofOn){
      // FLAT ROOF CAP — a thin neutral slab (no gable: a pitched roof reads as a
      // finished building; this must read as placeholder massing).
      var roofCol = phase === "burning" ? LC_TONES.charcoalRoof : LM_PLACEHOLDER.roof;
      var roof = makeBoxLocal(w + 0.2, 0.28, d + 0.2, new THREE.Color(roofCol));
      bake(roof, new THREE.Vector3(e.cx, topY, e.cz), e.yaw);
      parts.push(roof);
    }
    // FRONT-FACE STRIPE — the bold vertical bar on the +z (front) face BY
    // CONSTRUCTION (yaw = frontage normal): the entrance indicator and the
    // visible proof of the corner-rule fix. Ember-red while burning.
    var stripeH = Math.max(h * 0.9, 0.8);
    var stripe = makeBoxLocal(Math.min(0.9, w * 0.42), stripeH, 0.18, new THREE.Color(stripeCol));
    lmBakeAt(stripe, 0, 0.28, d / 2 - 0.02, e.yaw, e.cx, y, e.cz);
    parts.push(stripe);
  }
  if(phase === "ruins")    lcRubbleParts(parts, e, w, d, y, e.yaw, 1);
  if(phase === "clearing") lcRubbleParts(parts, e, w, d, y, e.yaw, Math.max(1 - prog, 0.05));
  // phase "cleared": the bare pad alone — nothing further.
  var mesh = new THREE.Mesh(mergeGeoms(parts), LM_MAT);
  mesh.frustumCulled = false;
  mesh.userData.landmarkId = e.id;
  mesh.userData.state = e.state;
  mesh.userData.phase = phase;
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

  /* ---- 3. constructionMonotonic — s108 EPISODE-AWARE rewrite (the brief's
     "state-monotonic within an episode"). Two clauses per landmark:
     (a) SPAN-CHAIN LEGALITY: the compiled lifecycle span sequence follows the
         legal machine — absent->constructing->complete; complete may only go
         expanding/burning/teardown; burning->RUINS->clearing->cleared->
         (constructing|gone); teardown->cleared. Any other transition (e.g. a
         burn that skips ruins, a rebuild landing mid-ruins) FAILS.
     (b) C-STATE MONOTONIC within every constructing episode (C0<=C1<=..<=C4,
         sampled), absent before ground is broken, C4 held while complete. ---- */
  registerAudit("buildings", "constructionMonotonic", function(){
    var recs = resolvedRecs(), viol = [], rows = [];
    var LEGAL = { absent: { constructing: 1 }, constructing: { complete: 1 },
                  complete: { expanding: 1, burning: 1, teardown: 1 },
                  expanding: { complete: 1 }, burning: { ruins: 1 }, ruins: { clearing: 1 },
                  // a rebuild may start the moment clearing completes (the cleared
                  // span is then zero-length) — the ruins gate itself is enforced
                  // by lifecycleRuinsGate on the event timeline.
                  clearing: { cleared: 1, constructing: 1 }, cleared: { constructing: 1, gone: 1 },
                  teardown: { cleared: 1, constructing: 1 }, gone: {} };
    recs.forEach(function(rec){
      var lc = lmLifecycleOf(rec), ok = true, sawC4 = false;
      for(var i = 0; i < lc.spans.length - 1; i++){
        var a = lc.spans[i].phase, b = lc.spans[i + 1].phase;
        if(!(LEGAL[a] && LEGAL[a][b])){ viol.push({ id: rec.landmarkId, why: "illegal-transition", from: a, to: b, day: +lc.spans[i + 1].from.toFixed(1) }); ok = false; }
      }
      lc.spans.forEach(function(sp){
        if(sp.phase === "constructing"){
          var prev = -1;
          for(var k = 0; k <= 24; k++){
            var d = sp.from + (sp.to - sp.from) * (k / 24);
            var st = buildingStateAt(lc.spans, Math.min(d, sp.to - 1e-6)).state;
            if(st < prev){ viol.push({ id: rec.landmarkId, why: "state-decreased", day: +d.toFixed(1), from: prev, to: st }); ok = false; }
            prev = Math.max(prev, st);
          }
        }
        if(sp.phase === "complete"){
          var mid = buildingStateAt(lc.spans, (sp.from + Math.min(sp.to, sp.from + 60)) / 2);
          if(mid.state !== 4){ viol.push({ id: rec.landmarkId, why: "not-C4-while-complete", day: +sp.from.toFixed(1), state: mid.state }); ok = false; }
          else sawC4 = true;
        }
      });
      var st0 = lmStateAt(rec, lc.events[0].start - 3);
      if(st0.phase !== "absent"){ viol.push({ id: rec.landmarkId, why: "present-before-start", phase: st0.phase }); ok = false; }
      rows.push({ id: rec.landmarkId, cls: lmClassOf(rec.landmarkId), spans: lc.spans.length,
                  events: lc.events.map(function(ev){ return ev.type; }).join(">"), reachedC4: sawC4, ok: ok });
    });
    return { pass: viol.length === 0, landmarks: recs.length, violations: viol.length, sample: viol.slice(0, 8), perLandmark: rows };
  });

  /* ---- 4. reservationDeterminism — derive the set twice at the same day
     (fresh): byte-identical. Rewind-exact: A -> B -> A returns identical. Zero
     dice, so this is exact by construction. ---- */
  registerAudit("buildings", "reservationDeterminism", function(){
    function fp(day){
      return deriveLandmarkSet(day).map(function(e){
        return e.id + "|" + e.cx.toFixed(4) + "|" + e.cz.toFixed(4) + "|" + e.state + "|" + e.hFrac.toFixed(4) + "|" + e.yaw.toFixed(6)
             + "|" + e.phase + "|" + (e.transition ? e.transition.type + ":" + e.transition.progress.toFixed(5) : "-") + "|" + (e.agingT != null ? e.agingT.toFixed(5) : "-");
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
   v1 STOPPED at the 1848 village. s106c (ICS-23) EXTENDS the master with the
   1849 IN-TOWN TENT-FIRST DENSIFICATION WAVE (see the wave block inside
   buildFillMaster + buildings.inTownFill); the v1 build itself is untouched
   and byte-identical (own seeded stream). The 1847-04/1848-04 census gates
   stay EXACT; the late-1849 totals are gated by the inTownFill band.

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
    { day: eventDateToSimDay("1848-04-01"), n: 130 },  // reasoned: 1847 per-capita x pop(1848-04); fill:true
    /* s106c (ICS-23) THE 1849 IN-TOWN DENSIFICATION NODES (fill:true reasoned —
       the record gives NO town-wide structure tally for late 1849; it jumps to
       fire-loss figures). Basis = the project's standing late-1849 interpolation
       (legacy growthTargets calibration, carried into core/03-sim's density
       notes): the 1850-05/06 fires each destroyed 150-300+ buildings in a
       PARTIAL district without leveling the town ⇒ total in-town stock already
       several hundred by early 1850 ⇒ Sept 1849 ~500-600 and Dec 1849 ~700-750
       total structures. The curve holds the 1848 village flat through spring
       1849 (the wave is the operator's mid-1849 ramp), then ramps to the band
       midpoints. The 1851-panorama gradient (core packed → edges gap-toothed)
       is the FAR anchor — 720 at Dec-20 stays well inside it. The 1847-04 (79)
       and 1848-04 (130) gates are interpolation NODES: values at and before
       them are byte-unchanged by construction. */
    { day: eventDateToSimDay("1849-06-15"), n: 130 },  // hold the village through spring 1849
    { day: eventDateToSimDay("1849-09-15"), n: 520 },  // reasoned mid-point of the ~500-600 Sept interpolation
    { day: eventDateToSimDay("1849-12-20"), n: 720 }   // reasoned mid-point of the ~700-750 Dec interpolation
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
/* s106c (ICS-23) THE 1849 IN-TOWN WAVE MIX — tent-FIRST (fill-density-model §2:
   "1849: tents/canvas dominate NEW construction — the single highest corpus
   rate measured — + prefab/kit frame arrives at scale in parallel"; adobe
   construction essentially stops after 1848, bible §1a). Category shares are
   fill:true reasoned tunables grounded in §2; the CONCRETE code inside a
   category is drawn from the catalog's "1849" era-weight column (so tents
   dominate the shanty bucket: TNT-1 9 / TNT-2 7 / TNT-3 6 vs scrap 4). */
var FILL_MIX_1849 = { shanty: 0.55, frame: 0.45, adobe: 0.00 };
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
   `day`, from the `snapKey` weight column (default "1847-04" — the v1 village;
   s106c passes "1849" for the in-town wave so tents dominate the shanty bucket). */
function fillPickCode(cat, day, rng, snapKey){
  var pool = [], tot = 0;
  for(var i = 0; i < FILL_TYPES.length; i++){
    var t = FILL_TYPES[i];
    if(t.isGapMarker) continue;
    if(!FILL_COUNTED_SUBTYPES[t.subtype]) continue;
    if(fillCensusCat(t) !== cat) continue;
    if(!fillEraValid(t, day)) continue;
    var w = fillWeight(t.code, snapKey || "1847-04");
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
var FILL_MASTER = null, _fillMasterVer = -1;
/* s106c geometry gates the LAW_TABLES rows don't carry (module-level so the
   wave spawner and the inTownFill audit share ONE measure — measurement law):
   the "structure" row has no ROW clause (v1 stayed off streets by slot
   construction, but small mid-block streets like Shubrick cut through block
   interiors) and the "tent" row has no footprint clause (the tent master
   checks PLACEMENT_INDEX by hand — the wave must too). */
function fillPoseQuad(cx, cz, w, d, yaw){
  var nx = Math.sin(yaw), nz = Math.cos(yaw), tx = nz, tz = -nx, hw = w / 2, hd = d / 2;
  function P(sw, sd){ return { x: cx + tx * sw + nx * sd, z: cz + tz * sw + nz * sd }; }
  return [ P(-hw, -hd), P(hw, -hd), P(hw, hd), P(-hw, hd) ];
}
function fillPointInQuad(q, x, z){
  var sign = 0;
  for(var i = 0; i < 4; i++){ var a = q[i], b = q[(i+1)%4];
    var cr = (b.x-a.x)*(z-a.z) - (b.z-a.z)*(x-a.x);
    if(cr !== 0){ var s = cr > 0 ? 1 : -1; if(sign === 0) sign = s; else if(s !== sign) return false; }
  }
  return true;
}
function fillSegsIntersect(a, b, c, d){
  function o(p, q, r){ return (q.x-p.x)*(r.z-p.z) - (q.z-p.z)*(r.x-p.x); }
  var o1 = o(a,b,c), o2 = o(a,b,d), o3 = o(c,d,a), o4 = o(c,d,b);
  return ((o1 > 0) !== (o2 > 0)) && ((o3 > 0) !== (o4 > 0));
}
function fillQuadCrossesRow(q, cx, cz){
  var segs = (typeof PLACEMENT_STREET_SEGS !== "undefined") ? PLACEMENT_STREET_SEGS : [];
  for(var j = 0; j < segs.length; j++){
    var s = segs[j], mx = (s.x0 + s.x1) / 2, mz = (s.z0 + s.z1) / 2;
    if(Math.hypot(mx - cx, mz - cz) > 90) continue;
    var P0 = { x: s.x0, z: s.z0 }, P1 = { x: s.x1, z: s.z1 };
    if(fillPointInQuad(q, P0.x, P0.z) || fillPointInQuad(q, P1.x, P1.z)) return true;
    for(var i = 0; i < 4; i++) if(fillSegsIntersect(P0, P1, q[i], q[(i+1)%4])) return true;
  }
  return false;
}
/* s106c QA knob (per-system debug affordance; default OFF — the probe's
   fail-before flips it): ignoreInTownGates makes the 1849 WAVE skip its
   placement gates (encampment-ground rejection, dry-land, canPlace zone/law,
   curb setback) so wave fill lands in streets/water/documented-camp ground
   and buildings.inTownFill goes RED; knob off → GREEN (the gates are real).
   The v1 1846-48 village build is NEVER touched by the knob. */
var FILL_QA = { ignoreInTownGates: false, version: 0 };
/* s106c tunables — the in-town 1849 tent-first densification wave. */
var FILL_1849_START_ISO = "1849-06-15";   // wave ramp start (operator: "ramping mid-1849 -> Dec 1849")
var FILL_1849_CAP_ISO   = "1849-12-20";   // wave cap = the boom-peak canonical noon
var FILL_EDGE_CAP_1849  = 0.70;           // per-edge built-fraction cap for the wave (denser than the 0.55 village, still gap-toothed — the 1851 gradient is the FAR anchor, never fully packed)
var FILL_1849_BAND      = [630, 780];     // gating plausibility band for the Dec-20 in-town total (see fillCensusCurve s106c note)
var FILL_1849_BAND_SEP  = [380, 640];     // gating band for the Sept-15 in-town total (~500-600 interpolation, wide for placement reality)
function fillOverlapsLocal(placed, x, z, r){
  for(var i = 0; i < placed.length; i++){
    var p = placed[i], dx = x - p.x, dz = z - p.z, md = r + p.r;
    if(dx*dx + dz*dz < md*md) return true;
  }
  return false;
}
function buildFillMaster(){
  if(FILL_MASTER && _fillMasterVer === FILL_QA.version) return FILL_MASTER;
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
  var v1Len = master.length;

  /* ===================================================================
     s106c (ICS-23) — THE 1849 IN-TOWN TENT-FIRST DENSIFICATION WAVE
     (operator change 2). Historically the whole town was threaded with
     tents + shanties through 1849 (Taylor's "scattering town of tents");
     fill v1 deliberately capped at the 1848 village, leaving the platted
     blocks around Portsmouth Square / Dupont / Stockton empty. This wave
     EXTENDS the master — the v1 1846-48 build above is UNTOUCHED (its own
     stream, its own loop; byte-identical, proven by the determinism
     fingerprints) — with new units on EMPTY platted fifty-vara ground,
     appearing mid-1849 → Dec 1849 along the census-curve ramp.

     EVERY existing gate holds (the operator's law):
       • canPlace law rows — tents through the "tent" row (minY 2, slope
         ≤12%, never ROW margin 2, never intertidal), everything else
         through "structure"; corner-level (footprintW/D passed);
       • zone law — evaluated at the WAVE CAP date (the era-grown
         commercial core at its FULL boom reach, the strictest claim in
         the window): the core admits frame only, so tents/shanties
         thread the RESIDENTIAL band (fill-density-model §3: tents are
         never wedged between the plaza's frame buildings) while frame
         densifies the core blocks;
       • cadastre reservations — PLACEMENT_INDEX overlap via canPlace
         (the 51 landmark footprints) + the local inter-fill check;
       • documented camp ground — the wave never places inside an
         ENCAMPMENT_ZONES ring (the record's camps belong to the tent
         master; fill must not crowd Little Chile's block);
       • dry land — isDryLand at the wave start (s110a; dry ground only
         grows later in the window);
       • occupancy/spacing — the SAME per-edge built-fraction budget the
         v1 loop booked (carried over in `edgeBuilt`), capped at the 1849
         era cap, + FILL_GAP_M side yards + detached-overlap vs ALL fill.

     Type mix: FILL_MIX_1849 categories (tent-first, §2) with concrete
     codes drawn from the catalog's "1849" era-weight column. Dedicated
     seeded stream ("p1850-fill1849-") so the v1 stream's consumption is
     bit-identical to s96..s106b. Audited by buildings.inTownFill. ===== */
  var waveStart = eventDateToSimDay(FILL_1849_START_ISO);
  var waveCap   = eventDateToSimDay(FILL_1849_CAP_ISO);
  var sd2 = cyrb128("p1850-fill1849-" + (typeof seedStr !== "undefined" ? seedStr : "1846"));
  var rng2 = sfc32(sd2[0], sd2[1], sd2[2], sd2[3]);       // DEDICATED wave stream — never the v1 stream, never rngBuild
  var need2 = Math.max(0, Math.round(fillTargetTotal(waveCap)) - reservationsAt(waveCap).length - v1Len);
  var slots2 = fillFrontageSlots(waveCap);                // fifty-vara blocks born by the cap (incl. post-1848 births)
  for(var s2 = 0; s2 < slots2.length; s2++){
    slots2[s2].order = Math.hypot(slots2[s2].cx - PLAZA_CENTER.x, slots2[s2].cz - PLAZA_CENTER.z) + (rng2() - 0.5) * 10;
  }
  slots2.sort(function(a, b){ return a.order - b.order; });
  var counts2 = { shanty: 0, frame: 0, adobe: 0 }, waveN = 0;
  var rej2 = { edgeCap: 0, camp: 0, water: 0, zone: 0, law: 0, row: 0, reserved: 0, overlap: 0, noType: 0 };
  /* THE WAVE WALK — largest-remainder category pick (the exact tranche-mix
     discipline v1 uses) with a PER-CATEGORY slot cursor over the ONE
     plaza-ward slot list. Each category walks the demand order and takes
     the first slot ITS zone law admits: frame densifies the commercial
     core; the shanty/tent bucket skips the core (the commercial front is
     never tent ground — CAD_ZONE_TABLE) and threads the residential band
     beyond it. One shared deficit walk keeps the 55/45 tent-first mix
     exact while each class finds its own legal ground. (A naive per-slot
     fallback was measured first: the core's slots ate the whole wave as
     frame — 505/51 — because plaza-ward order reaches the core first.
     A category with NO remaining legal slot is marked exhausted and its
     share falls to the others — reported, never silently hidden.) */
  var cursors2 = { shanty: 0, frame: 0, adobe: 0 }, exhausted2 = {};
  function wavePickCat(){
    var placedN = counts2.shanty + counts2.frame + counts2.adobe;
    var best = null, bestDef = -Infinity;
    ["shanty", "frame", "adobe"].forEach(function(c){
      if(FILL_MIX_1849[c] <= 0 || exhausted2[c]) return;
      var def = FILL_MIX_1849[c] * (placedN + 1) - counts2[c];
      if(def > bestDef){ bestDef = def; best = c; }
    });
    return best;
  }
  while(waveN < need2){
    var cat2 = wavePickCat();
    if(!cat2) break;                                      // every category out of legal ground
    var placedOne = false, idx2 = cursors2[cat2];
    for(; idx2 < slots2.length; idx2++){
      var slot2 = slots2[idx2];
      var t2 = fillPickCode(cat2, waveCap, rng2, "1849");
      if(!t2){ rej2.noType++; idx2 = slots2.length; break; }
      var wM2 = t2.footprint.w * FILL_FT_M, dM2 = t2.footprint.d * FILL_FT_M;
      var built2 = edgeBuilt[slot2.edgeId] || 0;          // the v1 bookings CARRY — one shared per-edge budget
      if((built2 + wM2) / slot2.edgeLen > FILL_EDGE_CAP_1849){ rej2.edgeCap++; continue; }
      var jitter2 = (rng2() - 0.5) * Math.min(FILL_SLOT_STEP_M * 0.5, slot2.edgeLen * 0.15);
      var setIn2 = FILL_QA.ignoreInTownGates ? 0 : (FILL_SETBACK_M + dM2 / 2);   // knob: straddle the curb (ROW offense) for the fail-before proof
      var cx2 = slot2.ex + slot2.tx * jitter2 + slot2.inx * setIn2;
      var cz2 = slot2.ez + slot2.tz * jitter2 + slot2.inz * setIn2;
      var rB2 = Math.hypot(wM2, dM2) / 2;
      if(!FILL_QA.ignoreInTownGates){
        // the record's camp ground belongs to the tent master — fill never crowds a documented encampment
        if(typeof encampmentZoneAt === "function" && encampmentZoneAt(cx2, cz2, waveCap)){ rej2.camp++; continue; }
        // buildable dry ground at the wave start (s110a; strictest — dry land only grows)
        if(typeof isDryLand === "function" && !isDryLand(cx2, cz2, waveStart)){ rej2.water++; continue; }
        var cls2 = t2.subtype === "tent" ? "tent" : "structure";
        var cp2 = canPlace(cls2, { x: cx2, z: cz2, yaw: slot2.yaw, footprint: rB2, footprintW: wM2, footprintD: dM2 },
                           { day: waveCap, zoneClass: t2.subtype === "tent" ? "tent" : fillZoneClass(t2) });
        if(!cp2.ok){ if(/^zone/.test(cp2.reason || "")) rej2.zone++; else rej2.law++; continue; }
        // explicit gates the LAW rows don't carry: mid-block rights-of-way
        // (Shubrick-class alleys cut through block interiors — the structure
        // row has no ROW clause) + reserved landmark ground for tents (the
        // tent row has no footprint clause).
        if(fillQuadCrossesRow(fillPoseQuad(cx2, cz2, wM2, dM2, slot2.yaw), cx2, cz2)){ rej2.row++; continue; }
        var resBad2 = false;
        for(var pi2 = 0; pi2 < PLACEMENT_INDEX.length; pi2++){
          var q2 = PLACEMENT_INDEX[pi2], rdx2 = cx2 - q2.x, rdz2 = cz2 - q2.z, rmd2 = rB2 + q2.r;
          if(rdx2*rdx2 + rdz2*rdz2 < rmd2*rmd2){ resBad2 = true; break; }
        }
        if(resBad2){ rej2.reserved++; continue; }
      }
      if(fillOverlapsLocal(placed, cx2, cz2, rB2)){ rej2.overlap++; continue; }
      counts2[cat2]++; waveN++;
      edgeBuilt[slot2.edgeId] = built2 + wM2 + FILL_GAP_M;
      placed.push({ x: cx2, z: cz2, r: rB2 });
      master.push({ code: t2.code, cat: cat2, material: t2.material, subtype: t2.subtype,
                    cx: cx2, cz: cz2, w: wM2, d: dM2, yaw: slot2.yaw, nx: slot2.outx, nz: slot2.outz,
                    storyRange: t2.storyRange || [1, 1], edgeId: slot2.edgeId, edgeLen: slot2.edgeLen,
                    overWater: !!t2.overWater, stilted: !!t2.stilted,
                    rank: master.length, appearDay: waveCap, wave: 1849 });
      placedOne = true; idx2++;
      break;
    }
    cursors2[cat2] = idx2;
    if(!placedOne) exhausted2[cat2] = true;               // this category found no remaining legal slot
  }
  var exhaustedList2 = Object.keys(exhausted2);
  if(exhaustedList2.length && typeof console !== "undefined")
    console.warn("[fill] 1849 wave: category slot supply exhausted for " + exhaustedList2.join(",") +
                 " — the mix audit (inTownFill) measures the drift.");
  /* wave appearDays — the SAME monotonic walk as v1, over the 1849 ramp:
     a wave rank appears the day the census-owed count first exceeds it.
     Wave appearDays all ≥ waveStart > the v1 cap, so the whole master
     stays appear-ordered by rank (the deriveFillSet early-exit law). */
  var prev2 = waveStart, k2 = v1Len;
  for(var d2 = waveStart; d2 <= waveCap + 0.5 && k2 < master.length; d2 += 1){
    var fc2 = Math.round(fillTargetTotal(d2)) - reservationsAt(d2).length;
    while(k2 < fc2 && k2 < master.length){ var ad2 = Math.max(d2, prev2); master[k2].appearDay = ad2; prev2 = ad2; k2++; }
  }
  for(; k2 < master.length; k2++) master[k2].appearDay = waveCap;
  master._wave = { v1: v1Len, placed: waveN, need: need2, startDay: waveStart, capDay: waveCap,
                   mix: counts2, rejects: rej2, slots: slots2.length, qaIgnoreGates: FILL_QA.ignoreInTownGates };
  if(waveN < need2 && typeof console !== "undefined")
    console.warn("[fill] 1849 WAVE PLACEMENT STARVED: " + waveN + "/" + need2 +
                 " owed units fit under the placement laws (reported, not silently capped).");

  FILL_MASTER = master; _fillMasterVer = FILL_QA.version;
  if(typeof console !== "undefined") console.log("[verify] fill master:", v1Len, "of", need, "owed placed (fifty-vara born ground)",
    "+ 1849 wave", waveN, "of", need2, "(tent-first in-town densification, s106c).");
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
/* =====================================================================
   s108 THE SIMULATED FILL LIFECYCLE (building-lifecycle-spec §4b). Every fill
   building carries the SAME event-list/span schema as the landmarks — only the
   SOURCE differs: seeded laws instead of authored dates. All parameters are
   pure hashes of the building identity (lcHash — zero dice at query time; the
   master placement stream is NEVER re-drawn, so the village layout is
   byte-identical to s96). The laws (shape per spec §4b):
     • BIRTH — construct at appearDay with the material lead (unchanged s96).
     • FRESH-WOOD AGING — automatic (§2a) via the complete span's formDoneAt.
     • THE 1849 UPGRADE WAVE (teardown-for-replacement, the operator's density
       path): a seeded ~30% of shanty-class buildings NOT in the fire perimeter
       are torn down (controlled deconstruct) on a seeded day in Mar-Aug 1849
       and replaced by an upgraded FRAME building on the same lot. Scheduled
       strictly AFTER the 1848-04 census gate (the audited tranche is never
       perturbed; the 1849 checks are informational by design).
     • WORLD-EVENT PARTICIPATION — a fill building inside the great-fire-1849
       perimeter BURNS on the fire date (no dice — it stood in the fire) ->
       ruins (seeded 3-10 days) -> clearing (seeded 2-4 days) -> ~75% rapid
       period rebuild, UPGRADED to frame (the wood->better-material fire
       response), rebuild lead seeded 14-27 days.
   Events are cached on the master entry (the master itself is cached + pure);
   LC_QA.version invalidates for the QA fail-before probes. ================ */
function fillLifecycleOf(e){
  if(e._lc && e._lcVer === LC_QA.version) return e._lc;
  var id = e.code + "#" + e.rank, evs = [];
  var lead = fillLeadDays(e);
  evs.push({ type: "construct", start: e.appearDay - lead, on: e.appearDay,
             form: { cls: e.cat, stories: (e.storyRange && e.storyRange[1]) || 1 } });
  var fire = lcFireHit(e.cx, e.cz);
  if(!fire && e.cat === "shanty" && lcHash(id, "upg") < 0.30){
    var t0 = eventDateToSimDay("1849-03-01") + Math.floor(lcHash(id, "upgday") * 180);   // Mar-Aug 1849
    if(t0 > e.appearDay + 30){
      var tOn = t0 + LC_TEARDOWN_DAYS;
      evs.push({ type: "teardown", start: t0, on: tOn });
      var rStart = tOn + 2;
      if(LC_QA.breakRuinsGate) rStart = t0 + 0.5;               // QA: rebuild before the lot is cleared
      evs.push({ type: "rebuild", start: rStart, on: rStart + 21,
                 form: { cls: "frame", stories: (e.storyRange && e.storyRange[1]) || 1 } });
    }
  }
  if(fire){
    var b = fire.day;
    evs.push({ type: "burn", start: b, on: b + LC_BURN_DAYS, via: fire.id });
    var ruinsDays = 3 + Math.floor(lcHash(id, "ruins") * 8);    // 3-10 days of ruins
    var clearDays = 2 + Math.floor(lcHash(id, "clr") * 3);      // 2-4 days of clearing
    var clearStart = b + LC_BURN_DAYS + ruinsDays, clearOn = clearStart + clearDays;
    evs.push({ type: "clear", start: clearStart, on: clearOn });
    if(lcHash(id, "rb") < 0.75){                                // the rapid period rebuild, upgraded to frame
      var rs = clearOn;
      if(LC_QA.breakRuinsGate) rs = b + 0.5;                    // QA: rebuild while ruins uncleared
      evs.push({ type: "rebuild", start: rs, on: rs + 14 + Math.floor(lcHash(id, "rblead") * 14),
                 form: { cls: "frame", stories: (e.storyRange && e.storyRange[1]) || 1 } });
    }
  }
  evs.sort(function(a, b2){ return a.start - b2.start; });
  e._lc = { events: evs, spans: lcBuildSpans(evs) };
  e._lcVer = LC_QA.version;
  return e._lc;
}
/* the fill state query — same buildingStateAt engine as the landmarks (legacy
   state/hFrac/active preserved). Pure filter over cached pure data. */
function fillStateAt(e, day){
  var s = buildingStateAt(fillLifecycleOf(e).spans, day);
  s.arc = s.constructT;
  return s;
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
      if(!(st.phase === "constructing" && st.state < 4)) continue;   // only the genuinely-under-construction look-ahead
    }
    var form = st.form || {};
    out.push({ code: e.code, cat: e.cat, cls: form.cls || e.cat, material: e.material, subtype: e.subtype,
               cx: e.cx, cz: e.cz, w: e.w, d: e.d, yaw: e.yaw, nx: e.nx, nz: e.nz,
               storyRange: e.storyRange, stories: form.stories || (e.storyRange && e.storyRange[1]) || 1,
               edgeId: e.edgeId, edgeLen: e.edgeLen, rank: e.rank, wave: e.wave || 0,
               overWater: !!e.overWater, stilted: !!e.stilted,
               appearDay: e.appearDay, state: st.state, hFrac: st.hFrac, counted: counted,
               phase: st.phase, transition: st.transition, agingT: st.agingT });
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
  // UNIVERSAL GROUNDING (§3b) — identical default as the landmarks: floor on the
  // highest corner + an auto foundation-plinth to grade, so slope fill never
  // floats or buries. Per-state visuals follow the s108 lifecycle legend
  // (see lmBuildMesh): scaffold-step construction, fresh-wood sheen, charcoal
  // burn, rubble ruins/clearing, bare cleared pad, shrinking teardown.
  var g = groundStructureAt(e.cx, e.cz, e.w, e.d, e.yaw);
  var y = g.floorY;
  var w = Math.max(e.w - FILL_INSET, 1.0), d = Math.max(e.d - FILL_INSET, 1.0);
  var parts = [];
  parts.push(groundPlinthGeo(g, new THREE.Color(LM_PLACEHOLDER.pad)));
  var pad = makeBoxLocal(w, 0.25, d, new THREE.Color(LM_PLACEHOLDER.pad));
  bake(pad, new THREE.Vector3(e.cx, y, e.cz), e.yaw);
  parts.push(pad);
  var phase = e.phase || (e.state >= 4 ? "complete" : "constructing");
  var structural = (phase === "constructing" || phase === "complete" || phase === "expanding" ||
                    phase === "burning" || phase === "teardown");
  if(structural){
    // ground arrow (front/entrance aid) — smaller than the landmark's, sat on grade
    var mkCol = phase === "burning" ? LC_TONES.ember : LM_PLACEHOLDER.marker;
    var arrowGroundY = terrainHeight(e.cx + e.nx * (e.d / 2 + 1.0), e.cz + e.nz * (e.d / 2 + 1.0));
    var az0 = d / 2 + 0.3, aLen = Math.max(1.4, Math.min(w * 0.6, 2.8)), aHW = Math.max(0.6, Math.min(w * 0.3, 1.2));
    var arrow = lmTriLocal(-aHW, az0, aHW, az0, 0, az0 + aLen, 0.12, new THREE.Color(mkCol));
    lmBakeAt(arrow, 0, 0, 0, e.yaw, e.cx, arrowGroundY, e.cz);
    parts.push(arrow);
  }
  var storeys = e.stories || (e.storyRange && e.storyRange[1]) || 1;
  var full = Math.max(storeys * FILL_STORY_H_M, 2.4);
  var tint = new THREE.Color(FILL_TINT[e.cls || e.cat] || LM_PLACEHOLDER.body);
  var prog = e.transition ? e.transition.progress : 0;
  var h = null, bodyCol = null, roofOn = false, stripeCol = LM_PLACEHOLDER.marker;
  if(phase === "constructing" && e.state >= 2){
    h = Math.max(full * e.hFrac, 0.7); bodyCol = lcScaffoldStep(tint, e.state); roofOn = true;
  } else if(phase === "complete" || phase === "expanding"){
    h = full; bodyCol = lcFreshTone(tint, e.agingT); roofOn = true;
  } else if(phase === "burning"){
    h = full; bodyCol = new THREE.Color(LC_TONES.charcoal); roofOn = true; stripeCol = LC_TONES.ember;
  } else if(phase === "teardown"){
    h = Math.max(full * (1 - prog), 0.4); bodyCol = new THREE.Color(LC_TONES.scaffold); roofOn = false;
  }
  if(h != null){
    var body = makeBoxLocal(w, h, d, bodyCol);
    bake(body, new THREE.Vector3(e.cx, y + 0.23, e.cz), e.yaw);
    parts.push(body);
    if(roofOn){
      var roofCol = phase === "burning" ? LC_TONES.charcoalRoof : LM_PLACEHOLDER.roof;
      var roof = makeBoxLocal(w + 0.15, 0.22, d + 0.15, new THREE.Color(roofCol));
      bake(roof, new THREE.Vector3(e.cx, y + 0.23 + h, e.cz), e.yaw);
      parts.push(roof);
    }
    // front-face stripe (the corner-rule proof — on the +z face BY CONSTRUCTION)
    var stripeH = Math.max(h * 0.9, 0.6);
    var stripe = makeBoxLocal(Math.min(0.7, w * 0.4), stripeH, 0.15, new THREE.Color(stripeCol));
    lmBakeAt(stripe, 0, 0.23, d / 2 - 0.02, e.yaw, e.cx, y, e.cz);
    parts.push(stripe);
  }
  if(phase === "ruins")    lcRubbleParts(parts, e, w, d, y, e.yaw, 1);
  if(phase === "clearing") lcRubbleParts(parts, e, w, d, y, e.yaw, Math.max(1 - prog, 0.05));
  var mesh = new THREE.Mesh(mergeGeoms(parts), LM_MAT);
  mesh.frustumCulled = false;
  mesh.userData.fillCode = e.code;
  mesh.userData.fillRank = e.rank;
  mesh.userData.phase = phase;
  return mesh;
}
function fillClear(){
  for(var i = FILL_GROUP.children.length - 1; i >= 0; i--){
    var o = FILL_GROUP.children[i]; FILL_GROUP.remove(o); if(o.geometry) o.geometry.dispose();
  }
}
function rebuildFill(){
  fillClear();
  var set = deriveFillSet(simDay), tentParts = [];
  for(var i = 0; i < set.length; i++){
    if(set[i].phase === "absent" || set[i].phase === "gone") continue;   // nothing on the lot to draw
    /* s106c: in-town fill TENTS draw with the s106b tent placeholder
       vocabulary (variant silhouettes + door marker), merged into ONE mesh
       — never the box massing. TENT_VARIANTS lives in a later chunk; on the
       very first (load-time) rebuild it is still undefined, so tents fall
       back to boxes for that one pass and the s106b chunk re-arms the fill
       renderer (_fillLastDay = null) once the tent vocabulary exists. */
    if(set[i].subtype === "tent" && typeof TENT_VARIANTS !== "undefined"){ tentPartsInto(tentParts, set[i]); continue; }
    FILL_GROUP.add(fillBuildMesh(set[i]));
  }
  if(tentParts.length){
    var tm = new THREE.Mesh(mergeGeoms(tentParts), LM_MAT);
    tm.frustumCulled = false;
    tm.userData.fillTents = true;
    FILL_GROUP.add(tm);
  }
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
        return e.code + "|" + e.cx.toFixed(3) + "|" + e.cz.toFixed(3) + "|" + e.state + "|" + e.hFrac.toFixed(3) + "|" + e.yaw.toFixed(5) + "|" + (e.counted ? 1 : 0)
             + "|" + e.phase + "|" + (e.transition ? e.transition.type + ":" + e.transition.progress.toFixed(5) : "-");
      }).join("\n");
    }
    var A = eventDateToSimDay("1847-04-01"), B = eventDateToSimDay("1848-04-01");
    var a1 = fp(A), a2 = fp(A), bJump = fp(B), aBack = fp(A);
    var sameDay = (a1 === a2), rewind = (a1 === aBack);
    return { pass: sameDay && rewind, sameDayIdentical: sameDay, rewindExact: rewind,
             countA: a1.split("\n").filter(Boolean).length, countB: bJump.split("\n").filter(Boolean).length };
  });

  /* ---- inTownFill (s106c, ICS-23) — THE 1849 IN-TOWN DENSIFICATION LAW.
     The operator's rules made standing (rules-first):
       (1) THE CENSUS GATES HOLD EXACTLY — counted total (fill + landmarks)
           is 79 at 1847-04-01 and 130 at 1848-04-01, to the unit;
       (2) THE EARLY ERAS ARE UNTOUCHED — zero 1849-wave entries stand (or
           construct) at/before the 1848-04 gate;
       (3) THE LATE-1849 TOTAL SITS IN THE MODEL'S BAND — counted in-town
           total within FILL_1849_BAND_SEP @ Sept-15 and FILL_1849_BAND
           @ Dec-20 (the ~500-600 / ~700-750 late-1849 interpolation);
       (4) WAVE PLACEMENT LEGALITY — no wave entry on water (isDryLand at
           the wave start), none crossing a street right-of-way, none
           overlapping reserved landmark ground, none inside a documented
           encampment zone's rings (the record's camp ground belongs to
           the tent master);
       (5) TENT-FIRST MIX — the wave's shanty-class share within ±10% of
           FILL_MIX_1849, zero adobe, and tents ≥20% of the wave (canvas
           dominates 1849 new construction, fill-density-model §2);
       (6) NO RAMPARTS — per-edge built fraction (v1 + wave) stays under
           the 1849 era cap at Dec-20.
     Fail-before: __P1850_FILL_QA({ignoreInTownGates:true}) drops the wave's
     gates + curb setback, so wave fill straddles streets / lands on camp
     ground / water — (4) goes RED; knob off → GREEN. ---- */
  registerAudit("buildings", "inTownFill", function(){
    var master = buildFillMaster(), wv = master._wave || { v1: master.length, placed: 0 };
    var problems = [], segs = (typeof PLACEMENT_STREET_SEGS !== "undefined") ? PLACEMENT_STREET_SEGS : [];
    // (1) the census gates, EXACT
    var gates = [];
    [{ iso: "1847-04-01", n: 79 }, { iso: "1848-04-01", n: 130 }].forEach(function(c){
      var day = eventDateToSimDay(c.iso);
      var total = deriveFillSet(day).filter(function(e){ return e.counted; }).length + reservationsAt(day).length;
      gates.push({ date: c.iso, documented: c.n, total: total });
      if(total !== c.n) problems.push(c.iso + ": total " + total + " != documented " + c.n + " (EXACT gate)");
    });
    // (2) the early eras untouched: no wave entry present at the gate dates
    ["1847-04-01", "1848-04-01"].forEach(function(iso){
      var day = eventDateToSimDay(iso);
      var n = deriveFillSet(day).filter(function(e){ return e.wave === 1849; }).length;
      if(n > 0) problems.push(iso + ": " + n + " wave-1849 entries present pre-boom");
    });
    // (3) the late-1849 band
    var lateRows = [];
    [{ iso: "1849-09-15", band: FILL_1849_BAND_SEP }, { iso: FILL_1849_CAP_ISO, band: FILL_1849_BAND }].forEach(function(c){
      var day = eventDateToSimDay(c.iso);
      var total = deriveFillSet(day).filter(function(e){ return e.counted; }).length + reservationsAt(day).length;
      lateRows.push({ date: c.iso, total: total, band: c.band });
      if(total < c.band[0] || total > c.band[1])
        problems.push(c.iso + ": in-town total " + total + " outside the model band [" + c.band[0] + "," + c.band[1] + "]");
    });
    // (4) wave placement legality — measured on the master (day-independent geometry)
    var capDay = wv.capDay != null ? wv.capDay : eventDateToSimDay(FILL_1849_CAP_ISO);
    var startDay = wv.startDay != null ? wv.startDay : eventDateToSimDay(FILL_1849_START_ISO);
    var lmq = landmarkQuadsAt(capDay);
    var rowViol = 0, wetViol = 0, campViol = 0, lmViol = 0, legality = [];
    for(var i = wv.v1; i < master.length; i++){
      var e = master[i], q = fillQuad(e);
      if(typeof encampmentZoneAt === "function" && encampmentZoneAt(e.cx, e.cz, capDay)){
        campViol++; if(legality.length < 8) legality.push({ rank: e.rank, code: e.code, why: "on-documented-camp-ground" });
      }
      if(typeof isDryLand === "function" && !isDryLand(e.cx, e.cz, startDay)){
        wetViol++; if(legality.length < 8) legality.push({ rank: e.rank, code: e.code, why: "on-water" });
      }
      for(var j = 0; j < segs.length; j++){
        var mx = (segs[j].x0 + segs[j].x1) / 2, mz = (segs[j].z0 + segs[j].z1) / 2;
        if(Math.hypot(mx - e.cx, mz - e.cz) > 90) continue;
        if(segCrossesQuad(q, segs[j])){ rowViol++; if(legality.length < 8) legality.push({ rank: e.rank, code: e.code, why: "crosses-row:" + segs[j].id }); break; }
      }
      for(var k = 0; k < lmq.length; k++){
        if(penetration(q, lmq[k]) > 0.05){ lmViol++; if(legality.length < 8) legality.push({ rank: e.rank, code: e.code, why: "on-reserved-landmark-ground" }); break; }
      }
    }
    if(rowViol + wetViol + campViol + lmViol > 0)
      problems.push("wave legality: " + rowViol + " ROW / " + wetViol + " water / " + campViol + " camp-ground / " + lmViol + " reserved-ground violations");
    // (5) tent-first mix over the wave
    var mixCt = { shanty: 0, frame: 0, adobe: 0 }, tents = 0, waveTotal = master.length - wv.v1;
    for(var m = wv.v1; m < master.length; m++){ mixCt[master[m].cat]++; if(master[m].subtype === "tent") tents++; }
    var shFrac = waveTotal ? mixCt.shanty / waveTotal : 0, tentFrac = waveTotal ? tents / waveTotal : 0;
    if(waveTotal > 0){
      if(Math.abs(shFrac - FILL_MIX_1849.shanty) > 0.10) problems.push("wave shanty share " + shFrac.toFixed(3) + " off FILL_MIX_1849 " + FILL_MIX_1849.shanty + " by >0.10");
      if(mixCt.adobe > 0) problems.push("wave placed " + mixCt.adobe + " adobe (1849 adobe construction has stopped)");
      if(tentFrac < 0.20) problems.push("wave tent share " + tentFrac.toFixed(3) + " < 0.20 (not tent-first)");
    } else problems.push("wave placed ZERO units (starved outright)");
    // (6) no ramparts at the boom peak
    var byEdge = {}, worstEdge = 0;
    deriveFillSet(capDay).forEach(function(e){
      var g = byEdge[e.edgeId] || (byEdge[e.edgeId] = { built: 0, len: e.edgeLen });
      g.built += e.w;
    });
    Object.keys(byEdge).forEach(function(id){
      var g = byEdge[id], frac = g.len > 0 ? g.built / g.len : 0;
      if(frac > worstEdge) worstEdge = frac;
    });
    if(worstEdge > FILL_EDGE_CAP_1849 + 1e-6) problems.push("per-edge built fraction " + worstEdge.toFixed(3) + " over the 1849 cap " + FILL_EDGE_CAP_1849);
    return { pass: problems.length === 0, law: "inTownFill (1849 tent-first densification, s106c)",
             censusGates: gates, late1849: lateRows,
             wave: { placed: waveTotal, need: wv.need, mix: mixCt, shantyFrac: +shFrac.toFixed(3),
                     tents: tents, tentFrac: +tentFrac.toFixed(3), worstEdgeFrac: +worstEdge.toFixed(3) },
             legality: { rowViol: rowViol, wetViol: wetViol, campViol: campViol, lmViol: lmViol, sample: legality },
             problems: problems.slice(0, 10),
             qaKnobs: { ignoreInTownGates: FILL_QA.ignoreInTownGates } };
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
      out.push({ kind: "landmark", id: L.id, cx: L.cx, cz: L.cz, w: L.w, d: L.d, yaw: L.yaw,
                 quad: poseQuad(L.cx, L.cz, L.w, L.d, L.yaw), overWater: !!L.overWater, stilted: !!L.stilted });
    });
    deriveFillSet(day).forEach(function(F){
      out.push({ kind: "fill", id: F.code, cx: F.cx, cz: F.cz, w: F.w, d: F.d, yaw: F.yaw,
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

  /* ---- buildingFloating — GATING (s100, temporal-world-model.md §3b THE
     UNIVERSAL GROUNDING RULE). Every rendered structure carries the DEFAULT auto
     foundation-plinth (groundStructureAt): the floor sits on the highest footprint
     corner (+ε, nothing buries) and the skirt drops to grade at every perimeter
     sample (nothing floats). The audit reads the SAME groundStructureAt the
     renderer draws (measurement law) and fine-samples the drawn skirt's bottom
     edge (a chord between adjacent perimeter samples, each at the exact sampled
     terrain) against the true grade underneath.

     BUILDABLE vs SCARP. The grounding engine conforms a structure to BUILDABLE
     ground. Where the STATIC terrain is itself a near-vertical SCARP — the
     ungraded Montgomery/Sansome bluff-to-tideflat drop a handful of waterfront
     landmarks straddle (local grade > SCARP_GRADE, ~100%+) — a flat-floored
     structure cannot conform until the ground is GRADED (the cove-fill / terrain-
     morphing sprint, temporal-world-model §3b terrain-at-date; out of scope here,
     static-only). So the gate measures skirt float on BUILDABLE-grade segments
     (must be 0) and reports the scarp residual INFORMATIONALLY (scarpResidualM /
     scarpBuildings) — the standing watch that drops to zero once the cove fill
     lifts the tideflat to street grade. UNLESS an authored `stilted` exception.

     Fail-before / pass-after in ONE reading: `preGrounding*` reproduces the s99
     flat-centroid-pad metric (the retired base sat at terrainHeight(centroid), so
     a downhill corner hung preGroundingMaxGapM ~4.28 m in the air) — the plinth
     drives the buildable-grade float to 0. ---- */
  var SCARP_GRADE = 0.5;   // rise/run above this (>27deg) is ungraded scarp/bank terrain (cove-fill territory), not the buildable town slope (<~25%) the plinth owns
  registerAudit("buildings", "buildingFloating", function(){
    var days = sampleDays(), off = [], perDay = [], maxFloat = 0, total = 0;
    var preOff = 0, preMax = 0, maxBury = 0, scarpMax = 0, scarpSet = {};   // s99 fail-before reference + scarp residual (informational)
    days.forEach(function(day){
      var bs = renderedAt(day), dv = 0;
      bs.forEach(function(b){
        if(b.stilted) return;
        // fail-before reference: the retired flat pad sat at the centroid height,
        // so each corner hung (centroidY - cornerGround) in the air.
        var centroidY = terrainHeight(b.cx, b.cz), preGap = 0;
        b.quad.forEach(function(c){ var f = centroidY - terrainHeight(c.x, c.z); if(f > preGap) preGap = f; });
        if(preGap > preMax) preMax = preGap;
        if(preGap > FLOAT_TOL) preOff++;
        // grounded measurement: the drawn plinth skirt vs the true grade along its
        // perimeter (the SAME ring the renderer bakes), split buildable vs scarp.
        var g = groundStructureAt(b.cx, b.cz, b.w, b.d, b.yaw), ring = g.ring, n = ring.length, worst = 0, scarpWorst = 0;
        // classify each perimeter segment as ungraded scarp/bank by grade, then
        // widen to its NEIGHBOURS: the concave TOE knee at the foot of a scarp (a
        // gentle segment where the bank meets the flat tideflat) is part of the
        // same ungraded bank the cove-fill grades — exempt it with its scarp.
        var steep = [];
        for(var i = 0; i < n; i++){
          var a0 = ring[i], a1 = ring[(i + 1) % n], sl = Math.hypot(a1.x - a0.x, a1.z - a0.z) || 1;
          steep[i] = Math.abs(a1.groundY - a0.groundY) > sl * SCARP_GRADE;
        }
        for(var i = 0; i < n; i++){
          var p0 = ring[i], p1 = ring[(i + 1) % n];
          var ungraded = steep[i] || steep[(i + n - 1) % n] || steep[(i + 1) % n];
          for(var k = 1; k < 4; k++){
            var t = k / 4, px = p0.x + (p1.x - p0.x) * t, pz = p0.z + (p1.z - p0.z) * t;
            var skirtBottom = p0.groundY + (p1.groundY - p0.groundY) * t;   // the drawn chord
            var terr = terrainHeight(px, pz), fl = skirtBottom - terr;      // >0: skirt lifts off a dip
            if(ungraded){ if(fl > scarpWorst) scarpWorst = fl; }
            else { if(fl > worst) worst = fl; }
            if(-fl > maxBury) maxBury = -fl;                                 // <0: skirt into a bulge (cosmetic)
          }
        }
        if(scarpWorst > scarpMax) scarpMax = scarpWorst;
        if(scarpWorst > FLOAT_TOL) scarpSet[b.id] = +scarpWorst.toFixed(3);
        if(worst > maxFloat) maxFloat = worst;
        if(worst > FLOAT_TOL){ dv++; total++; if(off.length < 12) off.push({ day: +day.toFixed(1), kind: b.kind, id: b.id, cornerFloatM: +worst.toFixed(3) }); }
      });
      perDay.push({ day: +day.toFixed(1), rendered: bs.length, offenders: dv });
    });
    var scarpIds = Object.keys(scarpSet);
    return { pass: total === 0, gating: true, floatTolM: FLOAT_TOL, offenders: total,
             maxBuildableFloatM: +maxFloat.toFixed(3), sample: off.slice(0, 10), perDay: perDay,
             preGroundingOffenders: preOff, preGroundingMaxGapM: +preMax.toFixed(3), maxSkirtBuryM: +maxBury.toFixed(3),
             scarpResidualM: +scarpMax.toFixed(3), scarpBuildings: scarpIds.length, scarpSample: scarpIds.slice(0, 8).map(function(id){ return { id: id, residualM: scarpSet[id] }; }),
             note: "GATING (s100): the auto foundation-plinth drives BUILDABLE-grade float to 0; scarp* is the ungraded Montgomery/Sansome bluff residual under a few waterfront landmarks, resolved by the cove-fill/terrain-grading sprint (static-only here). preGrounding* is the s99 flat-centroid-pad fail-before reference." };
  });
})();

/* =====================================================================
   THE s108 LIFECYCLE AUDITS (rules-first: the ruins gate, the fire's scope,
   and lifecycle determinism become STANDING RULES with executable audits —
   never one-off patches). Registered under __P1850_AUDITS.buildings.*; each
   is a framing-independent pure function over the SAME compiled lifecycle
   timelines the renderer draws (measurement law).

   FAIL-BEFORE / PASS-AFTER (proven by tools/verify/probe-s108.js):
     • lifecycleRuinsGate — fail-before: __P1850_LC_QA({breakRuinsGate:true})
       forces every rebuild to start the evening of the burn (the pre-s108
       world had NO ruins state at all: burn -> instant absent); the audit
       goes RED on rebuild-before-cleared. Pass-after: knob off, the gate
       ordering (burn->ruins->clearing->cleared->rebuild) holds everywhere.
     • fireScope — fail-before: __P1850_LC_QA({disableWorldEvents:true})
       unwires the world event (the pre-s108 state: only the 4 authored
       burned: fields did anything; in-perimeter fill and un-annotated
       landmarks did NOT burn); the audit goes RED on in-perimeter-not-burned.
       Pass-after: every building the perimeter covers burns on the date,
       none outside it burns via the event, and the record's four documented
       burns + named survivors are confirmed.
     • lifecycleDeterminism — the full phase/transition fingerprint is
       byte-identical same-day and across an A->B->...->A rewind (zero dice
       at query time; seeded-hash fill laws; cached pure compiles). ======== */
(function registerLifecycleAudits(){
  function lcResolvedRecs(){
    var R = (typeof GROUND_RESERVATIONS !== "undefined") ? GROUND_RESERVATIONS : [];
    return R.filter(function(r){ return r.resolved; });
  }
  function lcAllTimelines(){
    var out = [];
    lcResolvedRecs().forEach(function(rec){
      var lc = lmLifecycleOf(rec);
      out.push({ id: rec.landmarkId, kind: "landmark", cx: rec.footprint.cx, cz: rec.footprint.cz,
                 events: lc.events, spans: lc.spans });
    });
    buildFillMaster().forEach(function(e){
      var lc = fillLifecycleOf(e);
      out.push({ id: e.code + "#" + e.rank, kind: "fill", cx: e.cx, cz: e.cz,
                 events: lc.events, spans: lc.spans });
    });
    /* s106b: TENTS are lifecycle citizens too — the ruins gate + the fire's
       scope govern them (their raid teardown->rebuild arcs must clear first,
       and a tent inside an authored fire perimeter must burn via it). */
    if(typeof buildTentMaster === "function"){
      buildTentMaster().forEach(function(e){
        var lc = tentLifecycleOf(e);
        out.push({ id: "TNT|" + e.zone + "#" + e.zoneRank, kind: "tent", cx: e.cx, cz: e.cz,
                   events: lc.events, spans: lc.spans });
      });
    }
    return out;
  }

  /* ---- lifecycleRuinsGate — THE RUINS GATE (spec §2b): uncontrolled
     destruction leaves RUINS; the lot STAYS in ruins until actively CLEARED;
     no construct/rebuild may begin before the clear completes. Teardown (the
     controlled path) must still reach `cleared` before its replacement starts.
     Measured on the EVENT timelines (the law's own terms), for every landmark
     and every fill building. ---- */
  registerAudit("buildings", "lifecycleRuinsGate", function(){
    var viol = [], burnEvents = 0, teardownEvents = 0, rebuilds = 0;
    lcAllTimelines().forEach(function(t){
      t.events.forEach(function(ev){
        if(ev.type !== "burn" && ev.type !== "teardown") return;
        if(ev.type === "burn") burnEvents++; else teardownEvents++;
        var clear = null, nextBuild = null;
        t.events.forEach(function(o){
          if(o.type === "clear" && o.start >= ev.on - 1e-6 && (!clear || o.start < clear.start)) clear = o;
          if((o.type === "rebuild" || o.type === "construct") && o.start > ev.start && (!nextBuild || o.start < nextBuild.start)) nextBuild = o;
        });
        if(ev.type === "burn"){
          // a ruins SPAN must exist between the burn and whatever follows
          var hasRuins = t.spans.some(function(s){ return s.phase === "ruins" && s.from >= ev.start - 1e-6 && (!nextBuild || s.from < nextBuild.start); });
          if(!hasRuins) viol.push({ id: t.id, kind: t.kind, why: "no-ruins-after-burn" });
        }
        if(nextBuild){
          rebuilds++;
          var clearedAt = ev.type === "teardown" ? ev.on : (clear ? clear.on : null);   // teardown clears AS it goes (spec §2b)
          if(ev.type === "burn" && !clear) viol.push({ id: t.id, kind: t.kind, why: "rebuild-without-clear" });
          else if(clearedAt != null && nextBuild.start < clearedAt - 1e-6)
            viol.push({ id: t.id, kind: t.kind, why: "rebuild-before-cleared",
                        rebuildStart: +nextBuild.start.toFixed(1), clearedAt: +clearedAt.toFixed(1) });
        }
      });
    });
    return { pass: viol.length === 0, burnEvents: burnEvents, teardownEvents: teardownEvents,
             rebuildsChecked: rebuilds, violations: viol.length, sample: viol.slice(0, 8),
             qaKnobs: { breakRuinsGate: LC_QA.breakRuinsGate, disableWorldEvents: LC_QA.disableWorldEvents } };
  });

  /* ---- fireScope — THE DEC 24 1849 WORLD EVENT'S SCOPE (spec §4/D1): the
     authored perimeter resolves; EVERY building whose footprint centroid the
     perimeter covers (landmark AND fill) burns via great-fire-1849 on the
     date; NO building outside it burns via the event; the record's four
     documented burns are inside and burn; the documented survivors flanking
     the perimeter are outside and stand. ---- */
  registerAudit("buildings", "fireScope", function(){
    var evs = lcFireEvents();
    if(!evs.length || evs[0].quads.length !== WORLD_EVENTS[0].perimeter.length)
      return { pass: false, why: "perimeter-unresolved", resolvedStrips: evs.length ? evs[0].quads.length : 0 };
    var fire = evs[0], viol = [], inside = 0, burnedInside = 0;
    function check(id, kind, cx, cz, events){
      var inScope = fire.quads.some(function(q){ return lcPointInQuad(q, cx, cz); });
      var burnViaFire = events.some(function(ev){ return ev.type === "burn" && ev.via === fire.id && Math.abs(ev.start - fire.day) < 0.51; });
      if(inScope){ inside++; if(burnViaFire) burnedInside++; else viol.push({ id: id, kind: kind, why: "in-perimeter-not-burned" }); }
      else if(burnViaFire) viol.push({ id: id, kind: kind, why: "burned-outside-perimeter" });
      return inScope;
    }
    var scopeById = {};
    lcAllTimelines().forEach(function(t){ scopeById[t.id] = check(t.id, t.kind, t.cx, t.cz, t.events); });
    // the record's confirmations (dossier/registry dates_note)
    var mustBurn = ["parker-house", "el-dorado", "dennisons-exchange", "bella-union"];
    var mustSurvive = ["alta-california-office", "california-star-office", "merchants-exchange",
                       "custom-house", "school-house", "city-hotel", "howard-mellus-store", "new-york-store-ross"];
    mustBurn.forEach(function(id){ if(!scopeById[id]) viol.push({ id: id, why: "documented-burn-outside-perimeter" }); });
    mustSurvive.forEach(function(id){ if(scopeById[id]) viol.push({ id: id, why: "documented-survivor-inside-perimeter" }); });
    return { pass: viol.length === 0, fireDay: +fire.day.toFixed(1), strips: fire.quads.length,
             inPerimeter: inside, burnedInPerimeter: burnedInside,
             violations: viol.length, sample: viol.slice(0, 10),
             qaKnobs: { disableWorldEvents: LC_QA.disableWorldEvents } };
  });

  /* ---- lifecycleDeterminism — the FULL lifecycle read (phase + C-state +
     transition progress + aging) is byte-identical when derived twice at the
     same day, and across an A->B->C->D->A rewind. Probes the loud days: the
     El Dorado expand, the fire morning, deep ruins, the rebuild window, and
     the fill upgrade wave. ---- */
  registerAudit("buildings", "lifecycleDeterminism", function(){
    function fp(day){
      var rows = [];
      deriveLandmarkSet(day).forEach(function(e){
        rows.push("L|" + e.id + "|" + e.phase + "|" + e.state + "|" + e.hFrac.toFixed(4)
          + "|" + (e.transition ? e.transition.type + ":" + e.transition.progress.toFixed(5) : "-")
          + "|" + (e.agingT != null ? e.agingT.toFixed(5) : "-"));
      });
      deriveFillSet(day).forEach(function(e){
        rows.push("F|" + e.code + "#" + e.rank + "|" + e.phase + "|" + e.state + "|" + e.hFrac.toFixed(4)
          + "|" + (e.transition ? e.transition.type + ":" + e.transition.progress.toFixed(5) : "-"));
      });
      return rows.join("\n");
    }
    var days = ["1849-07-15", "1849-08-15", "1849-12-26", "1849-12-30"].map(eventDateToSimDay);
    days.push(eventDateToSimDay("1849-12-24") + 0.5);            // mid-burn
    var first = days.map(fp);
    var second = days.map(fp);                                   // same days again (cache-warm second read)
    var rewound = fp(days[0]);                                   // ...and back to A after the walk
    var sameDay = first.every(function(s, i){ return s === second[i]; });
    var rewindExact = first[0] === rewound;
    return { pass: sameDay && rewindExact, sameDayIdentical: sameDay, rewindExact: rewindExact,
             daysProbed: days.length, rows: first[0].split("\n").length };
  });
})();

/* =====================================================================
   ================  s106b (ICS-22) — THE 1849 TENT EXPLOSION  ==========
   Part B of the encampment work: the DOCUMENTED tent boom spawned STRICTLY
   inside the s106a ENCAMPMENT_ZONES registry (core/08) — the zones are the
   HARD spawn boundary (operator law; every tent footprint corner must sit
   inside its zone's rings at every date it stands).

   WHAT (the catalog, not invented here): the tent subtype's 3 coded variants
   from window.BUILDING_TYPES (building-types-spec §3 — codes now, art later):
     TNT-1 wall tent          (bible §2 wall tents; photobook R7, 10x13 ft)
     TNT-2 wedge/pup tent     (bible §2 wedge/A-tents; dims inferred, 8x10 ft)
     TNT-3 framed cloth house (bible §2 canvas-over-frame semi-buildings —
                               "reads as a building silhouette but the skin
                               is fabric"; photobook GAPS #1; 12x16 ft)
   Variant mix = the catalog's 1849 era-weight column (TNT-1:9 / TNT-2:7 /
   TNT-3:6). Placeholder visuals only (Option-B): one neutral canvas-grey
   material world, a DISTINCT silhouette per variant (walls+ridge / bare
   wedge prism / building-height gable), front-face marker at the gable door.

   WHEN/HOW MANY (per-zone density curves; fill:true tunables; the documented
   anchors are in the curve comments):
     • Little Chile — small from Aug 1848 (the Valparaiso wave; "many
       dwellings tents" spring 1849); the July 15 1849 HOUNDS RAID is an
       authored world event: tents "violently torn down" (Annals via
       demographics-society §Hounds — torn down + plundered, NOT burned;
       nothing invented) — a seeded documented-scale share tears down that
       day, a share of those re-rise in the following weeks.
     • Happy Valley — ramps from Aug 1849 (zone start; Taylor's eyewitness)
       toward "perhaps a thousand" tents by late 1849 (Annals/FoundSF).
       The DATA target is the documented number; the render draws every
       placed tent as ONE merged geometry (~60 tris/tent), so no render cap
       is needed — if placement starves under the physical laws the deficit
       is REPORTED (console + audit detail), never silently capped.
     • Pleasant Valley — [FLAG] tier (1849 tents NOT directly attested,
       s106a): weighted DOWN — a small fraction of Happy Valley, and the
       tentDensityWindow audit enforces the down-weighting as a law.

   LIFECYCLE (s108): tents carry the SAME event-list/span schema through
   buildingStateAt — construct (canvas: overnight lead), world-event fire
   participation via lcFireHit (wired; no documented camp lies inside the
   Dec 24 perimeter, so none burns via it today), the authored raid
   (teardown -> cleared -> partial rebuild), and the ruins-gate/fireScope
   audits govern tents too (tent timelines join lcAllTimelines).

   DETERMINISM: a DEDICATED seeded stream ("p1850-tents-"+seed) consumed
   ONLY at master build; the master is cached + pure; deriveTentSet(day) is
   a pure filter; per-tent lifecycle params are lcHash seeded hashes. ZERO
   dice at query time; rewind-exact; proven by buildings.tentDeterminism.
   ===================================================================== */
var TENT_ON_AT_RELEASE = true;

/* the catalog rows (subtype "tent") — footprints/eras come from the DATA. */
var TENT_TYPES = FILL_TYPES.filter(function(t){ return t.subtype === "tent" && !t.isGapMarker; });
var TENT_TYPE_BY_CODE = {}; TENT_TYPES.forEach(function(t){ TENT_TYPE_BY_CODE[t.code] = t; });

/* per-variant placeholder SILHOUETTE params (visual vocabulary only — the
   footprint dims are the catalog's). Neutral canvas-grey tones a hair apart
   (Option-B: silhouette is the identifier, not palette). */
var TENT_VARIANTS = {
  "TNT-1": { wallH: 1.0, ridgeH: 1.35, tone: 0xccc6b5 },   // wall tent: low vertical walls + ridge
  "TNT-2": { wallH: 0.0, ridgeH: 1.50, tone: 0xc7c1b0 },   // wedge/pup: bare ground-to-ridge prism
  "TNT-3": { wallH: 2.1, ridgeH: 0.90, tone: 0xbab8ab }    // framed cloth house: building-height walls + gable
};
var TENT_TONE_DEFAULT = 0xc9c3b2;

/* per-zone DENSITY CURVES (fill:true tunables) — piecewise-linear day->count.
   Documented anchors:
     happy-valley: "perhaps a thousand" tents from 1849 (Annals 1855 via
       FoundSF; s106a basis), settled from Aug 1849 (Taylor's eyewitness +
       the camp-parcel birth); the tent corpus rate PEAKS 1849 at 27.73/100k
       (density-mechanisms §1.2). Ramp Aug->Dec to 1000.
     little-chile: the Valparaiso wave from Aug 1848 (~1,500 Chileans arrived
       1848; most transited to the mines — the STANDING camp stays small);
       "many dwellings tents" spring 1849; raid July 15 1849; held flat
       after the raid (recovery is rebuild arcs, not new curve growth).
     pleasant-valley: [FLAG] — included ONLY as a weakly-sourced pocket of
       the camp belt (s106a); weighted hard DOWN vs Happy Valley. */
var TENT_ZONE_CURVES = {
  "happy-valley":    [["1849-08-01",0],["1849-08-20",120],["1849-09-15",350],["1849-10-15",600],["1849-12-01",900],["1849-12-20",1000]],
  "little-chile":    [["1848-08-01",0],["1848-10-01",12],["1849-01-01",25],["1849-04-01",45],["1849-07-14",60]],
  "pleasant-valley": [["1849-08-01",0],["1849-09-15",12],["1849-12-20",40]]
};
/* THE HOUNDS RAID (documented world event — timeline-part-1849 1849-07-15;
   demographics-society §"Violence against Chileans": the Hounds "violently
   tore down [tents], plundering them" — TORN DOWN, not burned; the fractions
   are fill:true reasoned tunables, the record gives no count). */
var TENT_RAID = { zone: "little-chile", dateISO: "1849-07-15", hitFrac: 0.55, rebuildFrac: 0.5 };
var TENT_GAP_M = 1.0;          // side gap booked between tents (centre spacing = rA+rB+gap)
var TENT_LEAD_DAYS = 1;        // canvas goes up overnight (Taylor: "as if by magic in a single night")

/* =====================================================================
   s106c (ICS-23) — BLEED HALOS (operator change 1). The s106b hard zone
   edge read artificial ("absolute tent city then open land"); the record's
   boundaries are honest street-framed ENVELOPES (approximate:true), so a
   camp's real edge feathered past them. Each zone gets a FALLOFF HALO BAND
   outside its documented rings: tent placement density DECAYS with distance
   past the boundary — seeded, deterministic acceptance probability
   p = 1 - smoothstep(d / haloW) over the halo distance d (the WORST of the
   footprint's centroid + 4 corners). Same per-zone TOTALS as s106b (the
   documented anchors: HV 1000 @ Dec-1849 etc.) — tents spread WIDER, never
   multiply. Halo candidates still pass EVERY placement gate (isDryLand +
   canPlace tent law + ROW/reserved + spacing) — a halo bleeds toward the
   town but a tent never sits in a street or on reserved ground; the zone
   gate for halo ground is evaluated at the FULLY-GROWN commercial reach
   (the strictest in-window claim), so a halo tent is never on ground the
   boom core claims by Dec 1849. Widths are fill:true tunables: Happy
   Valley 90 m (the big dune-swale camp feathers widest), Little Chile /
   Pleasant Valley 60 m (small pockets). buildings.tentInZone is amended to
   zone+halo (the ignore-boundary fail-before knob still goes RED: it
   samples an over-inflated bbox with NO ring/halo test, so tents land far
   beyond the halo). ==================================================== */
var TENT_HALO_W = { "happy-valley": 90, "little-chile": 60, "pleasant-valley": 60 };
function tentHaloW(zoneId){ return TENT_HALO_W[zoneId] != null ? TENT_HALO_W[zoneId] : 0; }
/* distance a point stands OUTSIDE a zone's rings (0 = inside; else the min
   distance to any ring segment). The halo law's one geometric measure —
   shared by the spawner and the tentInZone audit (measurement law). */
function tentRingsOutsideDist(rings, x, z){
  if(cadPointInRings(rings, x, z)) return 0;
  var best = Infinity;
  for(var k = 0; k < rings.length; k++){
    var pts = rings[k];
    for(var i = 0; i < pts.length; i++){
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var d = distToSegXZ(x, z, a.x, a.z, b.x, b.z);
      if(d < best) best = d;
    }
  }
  return best;
}
function tentHaloSmoothstep(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

/* QA knobs (per-system debug affordance, feedback-1850-placeholder-representation;
   default OFF — the fail-before probes flip them):
     ignoreZoneBoundary — placement samples an OVER-INFLATED zone bbox
       (rings + halo + 150 m) without the ring/halo containment test, so
       tents spill far beyond the documented zone AND its s106c bleed halo
       and the amended tentInZone audit goes RED (fail-before), then green
       with the knob off.
     demoBurn — ONE seeded tent per zone takes a full law-abiding burn ->
       ruins -> clear arc on 1849-09-01, so the burning-tent placeholder +
       the lifecycle-overlay tint composition are verifiable on screen
       (no documented tent burn exists in-window; this is a labeled QA
       affordance, never world truth). */
var TENT_QA = { ignoreZoneBoundary: false, demoBurn: false, version: 0 };

/* piecewise-linear curve read (memoized day parse). ONE function used by the
   spawner's appear-day assignment; the density AUDIT measures the derived
   world against the DOCUMENTED bands, not against this curve. */
var _tentCurveCache = {};
function tentCurveAt(zoneId, day){
  var c = _tentCurveCache[zoneId];
  if(!c){
    var src = TENT_ZONE_CURVES[zoneId] || [];
    c = src.map(function(p){ return { day: eventDateToSimDay(p[0]), n: p[1] }; });
    _tentCurveCache[zoneId] = c;
  }
  if(!c.length) return 0;
  if(day <= c[0].day) return c[0].n;
  for(var i = 1; i < c.length; i++){
    if(day <= c[i].day) return lerp(c[i-1].n, c[i].n, (day - c[i-1].day) / (c[i].day - c[i-1].day));
  }
  return c[c.length-1].n;
}
function tentCurveMax(zoneId){
  var src = TENT_ZONE_CURVES[zoneId] || [], m = 0;
  src.forEach(function(p){ if(p[1] > m) m = p[1]; });
  return m;
}

/* footprint corner points (centroid + 4 corners) for the STRICT boundary +
   dry-land tests — the same OBB the renderer bakes (measurement law). */
function tentCornerPts(cx, cz, w, d, yaw){
  var nx = Math.sin(yaw), nz = Math.cos(yaw), tx = nz, tz = -nx, hw = w/2, hd = d/2;
  return [ { x: cx, z: cz },
           { x: cx - tx*hw - nx*hd, z: cz - tz*hw - nz*hd }, { x: cx + tx*hw - nx*hd, z: cz + tz*hw - nz*hd },
           { x: cx + tx*hw + nx*hd, z: cz + tz*hw + nz*hd }, { x: cx - tx*hw + nx*hd, z: cz - tz*hw + nz*hd } ];
}

/* seeded weighted variant draw from the catalog's 1849 era-weight column
   (the tent boom snapshot), era-valid at `day`. */
function tentPickType(day, rng){
  var pool = [], tot = 0;
  for(var i = 0; i < TENT_TYPES.length; i++){
    var t = TENT_TYPES[i];
    if(!fillEraValid(t, day)) continue;
    var w = fillWeight(t.code, "1849"); if(w <= 0) w = 1;
    pool.push({ t: t, w: w }); tot += w;
  }
  if(!pool.length) return null;
  var r = rng() * tot, acc = 0;
  for(var k = 0; k < pool.length; k++){ acc += pool[k].w; if(r <= acc) return pool[k].t; }
  return pool[pool.length-1].t;
}

/* =====================================================================
   THE TENT MASTER — built ONCE per QA version (pure, cached, dedicated
   seeded stream "p1850-tents-"+seed — never rngBuild/RNG_CALL_COUNT).
   Per zone: seeded rejection sampling of candidate poses, each gated by
     (1) the HARD ZONE BOUNDARY — centroid + all 4 footprint corners inside
         the zone's clipped world rings (operator law; skipped ONLY under
         the ignoreZoneBoundary fail-before knob);
     (2) isDryLand at centroid + corners (s110a buildable surface);
     (3) the EXISTING placement law — canPlace("tent",...) = the cadastre
         zone gate (documented-camp override, core/08) + tent law row
         (minY 2, slope <=12%, never intertidal, never ROW margin 2),
         corner-level (footprintW/D passed);
     (4) reserved ground — no overlap vs PLACEMENT_INDEX (the 51 landmark
         footprints live there via lmRegisterOccupancy);
     (5) the fill village — no overlap vs the FILL_MASTER footprints
         (fill is deliberately NOT in PLACEMENT_INDEX — local check);
     (6) other tents — bounding-circle spacing + TENT_GAP_M.
   appearDay per zone-rank follows the zone's density curve (monotonic).
   Placement starvation (fewer accepted than the documented target) is
   REPORTED loudly — never silently capped. ============================ */
var TENT_MASTER = null, _tentMasterVer = -1;
function buildTentMaster(){
  if(TENT_MASTER && _tentMasterVer === TENT_QA.version) return TENT_MASTER;
  var sd = cyrb128("p1850-tents-" + (typeof seedStr !== "undefined" ? seedStr : "1846"));
  var rng = sfc32(sd[0], sd[1], sd[2], sd[3]);              // DEDICATED stream
  var fillM = buildFillMaster();
  var master = [], report = [];
  var zones = (typeof ENCAMPMENT_ZONES !== "undefined") ? ENCAMPMENT_ZONES : [];
  zones.forEach(function(zone){
    var targetMax = tentCurveMax(zone.id);
    if(!targetMax || !zone.rings || !zone.rings.length) return;
    var haloW = tentHaloW(zone.id);
    /* zone-gate LAW DAY (s106c): a halo tent stands on ground OUTSIDE the
       documented rings, where the general zone law (not the record-wins
       override) governs — and the commercial core GROWS through the window.
       Evaluating at the fully-grown reach (Apr 1849, CAD_COMM_R's last
       checkpoint) is the strictest in-window claim, so an accepted halo
       tent is legal at every date it stands. In-ring candidates are
       unaffected (the documented-camp override admits them at any active
       date). */
    var lawDay = Math.max(zone.startDay, eventDateToSimDay("1849-04-01"));
    var xLo = Infinity, xHi = -Infinity, zLo = Infinity, zHi = -Infinity;
    zone.rings.forEach(function(r){ r.forEach(function(p){
      if(p.x < xLo) xLo = p.x; if(p.x > xHi) xHi = p.x;
      if(p.z < zLo) zLo = p.z; if(p.z > zHi) zHi = p.z; }); });
    /* sample bbox: rings + the halo band. Under the ignoreZoneBoundary
       fail-before knob the bbox is over-inflated well PAST the halo so the
       amended zone+halo audit still goes RED (fail-before stays provable). */
    var pad = TENT_QA.ignoreZoneBoundary ? haloW + 150 : haloW;
    xLo -= pad; xHi += pad; zLo -= pad; zHi += pad;
    var placed = [], list = [], tries = 0, maxTries = targetMax * 60;
    while(list.length < targetMax && tries < maxTries){
      tries++;
      var x = xLo + rng() * (xHi - xLo), z = zLo + rng() * (zHi - zLo);
      var t = tentPickType(zone.startDay, rng); if(!t) break;
      var yaw = rng() * Math.PI * 2;                        // scattered camp ("a scattering town of tents")
      var wM = t.footprint.w * FILL_FT_M, dM = t.footprint.d * FILL_FT_M;
      var rB = Math.hypot(wM, dM) / 2;
      var pts = tentCornerPts(x, z, wM, dM, yaw), pi, bad = false;
      // (1) THE ZONE BOUNDARY + BLEED HALO (all 5 pts) — inside the rings is
      //     always admissible; past them the seeded smoothstep falloff decides
      //     (density decays to zero at the halo edge). Skipped whole under the
      //     QA knob (fail-before: tents spill far beyond the halo).
      var haloDist = 0;
      if(!TENT_QA.ignoreZoneBoundary){
        for(pi = 0; pi < pts.length; pi++){
          var od = tentRingsOutsideDist(zone.rings, pts[pi].x, pts[pi].z);
          if(od > haloW + 1e-6){ bad = true; break; }
          if(od > haloDist) haloDist = od;
        }
        if(bad) continue;
        if(haloDist > 0){
          if(haloW <= 0) continue;                          // no halo: the s106b hard boundary
          if(rng() >= 1 - tentHaloSmoothstep(haloDist / haloW)) continue;   // seeded density falloff
        }
      }
      // (2) dry land (buildable/anchorable surface) at centroid + corners
      for(pi = 0; pi < pts.length; pi++) if(!isDryLand(pts[pi].x, pts[pi].z, zone.startDay)){ bad = true; break; }
      if(bad) continue;
      // (3) the existing placement law (zone gate + tent law row, corner-level)
      var cp = canPlace("tent", { x: x, z: z, yaw: yaw, footprint: rB, footprintW: wM, footprintD: dM }, { day: lawDay });
      if(!cp.ok) continue;
      // (4) reserved landmark ground
      for(pi = 0; pi < PLACEMENT_INDEX.length; pi++){
        var q = PLACEMENT_INDEX[pi], dx = x - q.x, dz = z - q.z, md = rB + q.r;
        if(dx*dx + dz*dz < md*md){ bad = true; break; }
      }
      if(bad) continue;
      // (5) the fill village (local master check — fill is not in PLACEMENT_INDEX)
      for(pi = 0; pi < fillM.length; pi++){
        var f = fillM[pi], fdx = x - f.cx, fdz = z - f.cz, fr = rB + Math.hypot(f.w, f.d)/2 + 0.5;
        if(fdx*fdx + fdz*fdz < fr*fr){ bad = true; break; }
      }
      if(bad) continue;
      // (6) other tents
      if(fillOverlapsLocal(placed, x, z, rB + TENT_GAP_M)) continue;
      placed.push({ x: x, z: z, r: rB });
      list.push({ code: t.code, zone: zone.id, zoneStartDay: zone.startDay,
                  cx: x, cz: z, w: wM, d: dM, yaw: yaw, haloDist: +haloDist.toFixed(2),
                  zoneRank: list.length, appearDay: zone.startDay });
    }
    // appearDay per zone-rank from the density curve (monotonic; rewind-exact)
    var prev = zone.startDay, k = 0;
    for(var d = zone.startDay; d <= SIM_END_DAY + 0.5 && k < list.length; d += 1){
      var want = Math.round(tentCurveAt(zone.id, d));
      while(k < want && k < list.length){ var ad = Math.max(d, prev); list[k].appearDay = ad; prev = ad; k++; }
    }
    for(; k < list.length; k++) list[k].appearDay = SIM_END_DAY;   // starved past window end (never shown)
    var haloCt = 0; list.forEach(function(e){ if(e.haloDist > 0) haloCt++; });   // s106c halo occupancy split
    report.push({ zone: zone.id, placed: list.length, target: targetMax, tries: tries,
                  haloW: haloW, core: list.length - haloCt, halo: haloCt,
                  haloFrac: list.length ? +(haloCt / list.length).toFixed(3) : 0 });
    if(list.length < targetMax)
      console.warn("[tents] PLACEMENT STARVED in " + zone.id + ": " + list.length + "/" + targetMax +
                   " documented-target tents fit under the placement laws (reported, not silently capped).");
    master.push.apply(master, list);
  });
  master.forEach(function(e, i){ e.rank = i; });
  TENT_MASTER = master; _tentMasterVer = TENT_QA.version;
  TENT_MASTER._report = report;
  if(typeof console !== "undefined")
    console.log("[verify] tent master:", report.map(function(r){ return r.zone + " " + r.placed + "/" + r.target; }).join(" · "));
  return TENT_MASTER;
}

/* =====================================================================
   THE TENT LIFECYCLE (s108 §4b applied to tents). Same event-list/span
   schema + buildingStateAt engine as landmarks/fill; sources:
     • construct — appearDay with the canvas overnight lead;
     • WORLD-EVENT FIRE participation — lcFireHit (a tent inside an authored
       fire perimeter burns -> ruins -> clear; canvas is not rebuilt by the
       fire law — a burned tent is replaced, not rebuilt, building-types §3);
     • THE HOUNDS RAID (little-chile, 1849-07-15) — a seeded hitFrac of
       tents standing that day are TORN DOWN (the record's own verb) ->
       cleared; a seeded rebuildFrac of those re-rise 1-5 weeks later;
     • demoBurn QA arc (labeled debug affordance, default off).
   All parameters are lcHash pure hashes of the tent identity — zero dice
   at query time. Cached per entry, invalidated by either QA version. ===== */
function tentQaKey(){ return LC_QA.version + "|" + TENT_QA.version; }
function tentLifecycleOf(e){
  var key = tentQaKey();
  if(e._lc && e._lcVer === key) return e._lc;
  var id = "TNT|" + e.zone + "#" + e.zoneRank;
  var evs = [{ type: "construct", start: e.appearDay - TENT_LEAD_DAYS, on: e.appearDay,
               form: { cls: "canvas", stories: 1 } }];
  var fire = lcFireHit(e.cx, e.cz);
  if(fire && fire.day >= e.appearDay){
    evs.push({ type: "burn", start: fire.day, on: fire.day + LC_BURN_DAYS, via: fire.id });
    var ruinsDays = 2 + Math.floor(lcHash(id, "ruins") * 5);
    var clearStart = fire.day + LC_BURN_DAYS + ruinsDays;
    evs.push({ type: "clear", start: clearStart, on: clearStart + 1 });
  }
  if(e.zone === TENT_RAID.zone){
    var raidDay = eventDateToSimDay(TENT_RAID.dateISO);
    if(e.appearDay < raidDay - 0.5 && lcHash(id, "raid") < TENT_RAID.hitFrac){
      evs.push({ type: "teardown", start: raidDay, on: raidDay + 0.5 });   // torn down in the raid (documented verb)
      if(lcHash(id, "raidRb") < TENT_RAID.rebuildFrac){
        var rs = raidDay + 7 + Math.floor(lcHash(id, "raidLead") * 28);    // re-rise 1-5 weeks on (seeded)
        evs.push({ type: "rebuild", start: rs, on: rs + TENT_LEAD_DAYS, form: { cls: "canvas", stories: 1 } });
      }
    }
  }
  if(TENT_QA.demoBurn && e.zoneRank === 0){                                // QA compose proof (one tent per zone)
    var b = eventDateToSimDay("1849-09-01");
    if(e.appearDay < b - 1){
      evs.push({ type: "burn", start: b, on: b + LC_BURN_DAYS, via: "qa-demo-burn" });
      evs.push({ type: "clear", start: b + LC_BURN_DAYS + 4, on: b + LC_BURN_DAYS + 6 });
    }
  }
  evs.sort(function(a, b2){ return a.start - b2.start; });
  e._lc = { events: evs, spans: lcBuildSpans(evs) };
  e._lcVer = key;
  return e._lc;
}

/* THE DERIVED SET — pure function of `day`; the ONE source read by the
   renderer, the atelier lifecycle overlay, and every tent audit. */
function deriveTentSet(day){
  var m = buildTentMaster(), out = [];
  for(var i = 0; i < m.length; i++){
    var e = m[i];
    if(day < e.appearDay - TENT_LEAD_DAYS - 0.5) continue;   // not yet begun (fast skip)
    var st = buildingStateAt(tentLifecycleOf(e).spans, day);
    if(st.phase === "absent" || st.phase === "gone") continue;
    out.push({ code: e.code, zone: e.zone, cx: e.cx, cz: e.cz, w: e.w, d: e.d, yaw: e.yaw,
               rank: e.rank, zoneRank: e.zoneRank, appearDay: e.appearDay, stories: 1,
               haloDist: e.haloDist || 0,   // s106c: 0 = inside the documented rings; >0 = halo band
               phase: st.phase, state: st.state, hFrac: st.hFrac, agingT: st.agingT,
               transition: st.transition });
  }
  return out;
}
function tentCountsByZoneAt(day){
  var c = {};
  deriveTentSet(day).forEach(function(e){
    if(e.phase === "cleared" || e.phase === "clearing" || e.phase === "ruins") return;   // no canvas standing
    c[e.zone] = (c[e.zone] || 0) + 1;
  });
  return c;
}

/* =====================================================================
   THE TENT RENDERER — Option-B placeholder vocabulary, ONE merged mesh per
   rebuild (a thousand instanced-by-merge placeholder tents ~60 tris each —
   no render cap; the documented count draws in full). Grounding: the SAME
   groundStructureAt auto-plinth as every structure (§3b universal rule).
   Distinct silhouette per variant; front-face marker on the +z gable (the
   door end, by construction); lifecycle states reuse the s108 legend
   vocabulary (charcoal burn, rubble ruins, shrinking teardown). ========= */
var TENT_GROUP = new THREE.Group(); TENT_GROUP.frustumCulled = false; TENT_GROUP.visible = TENT_ON_AT_RELEASE; scene.add(TENT_GROUP);
var _tentLastDay = null;
function tentPartsInto(parts, e){
  var v = TENT_VARIANTS[e.code] || { wallH: 0.8, ridgeH: 1.2, tone: TENT_TONE_DEFAULT };
  var g = groundStructureAt(e.cx, e.cz, e.w, e.d, e.yaw);
  var y = g.floorY;
  parts.push(groundPlinthGeo(g, new THREE.Color(LM_PLACEHOLDER.pad)));
  var pad = makeBoxLocal(Math.max(e.w, 0.8), 0.12, Math.max(e.d, 0.8), new THREE.Color(LM_PLACEHOLDER.pad));
  bake(pad, new THREE.Vector3(e.cx, y, e.cz), e.yaw);
  parts.push(pad);
  var phase = e.phase, prog = e.transition ? e.transition.progress : 0;
  if(phase === "ruins"){ lcRubbleParts(parts, e, e.w, e.d, y, e.yaw, 0.5); return; }       // a torn/burnt tent leaves little
  if(phase === "clearing"){ lcRubbleParts(parts, e, e.w, e.d, y, e.yaw, Math.max(0.5 * (1 - prog), 0.05)); return; }
  if(phase === "cleared") return;                                                          // bare pad only
  var hScale = 1;
  if(phase === "constructing"){ if(e.state < 2) return; hScale = Math.max(e.hFrac, 0.35); }
  else if(phase === "teardown"){ hScale = Math.max(1 - prog, 0.2); }
  var burning = (phase === "burning");
  var tone   = new THREE.Color(burning ? LC_TONES.charcoal : v.tone);
  var roofTn = new THREE.Color(burning ? LC_TONES.charcoalRoof : v.tone).multiplyScalar(burning ? 1 : 0.93);
  var wallH = v.wallH * hScale, ridgeH = Math.max(v.ridgeH * hScale, 0.3);
  var wIn = Math.max(e.w - 0.12, 0.7), dIn = Math.max(e.d - 0.12, 0.7);
  if(wallH > 0.05){
    var walls = makeBoxLocal(wIn, wallH, dIn, tone);
    bake(walls, new THREE.Vector3(e.cx, y + 0.1, e.cz), e.yaw);
    parts.push(walls);
  }
  var roof = makeGableRoof(wIn, dIn, 0.05, ridgeH, roofTn);
  bake(roof, new THREE.Vector3(e.cx, y + 0.1 + wallH, e.cz), e.yaw);
  parts.push(roof);
  // front-face marker: door stripe on the +z gable end (the front, by construction)
  var mk = new THREE.Color(burning ? LC_TONES.ember : LM_PLACEHOLDER.marker);
  var doorH = Math.max((wallH + ridgeH) * 0.55, 0.35);
  var door = makeBoxLocal(0.3, doorH, 0.1, mk);
  bake(door, new THREE.Vector3(e.cx + Math.sin(e.yaw) * (dIn/2 + 0.02), y + 0.1, e.cz + Math.cos(e.yaw) * (dIn/2 + 0.02)), e.yaw);
  parts.push(door);
}
function tentClear(){
  for(var i = TENT_GROUP.children.length - 1; i >= 0; i--){
    var o = TENT_GROUP.children[i]; TENT_GROUP.remove(o); if(o.geometry) o.geometry.dispose();
  }
}
function rebuildTents(){
  tentClear();
  var set = deriveTentSet(simDay), parts = [];
  for(var i = 0; i < set.length; i++) tentPartsInto(parts, set[i]);
  if(parts.length){
    var mesh = new THREE.Mesh(mergeGeoms(parts), LM_MAT);
    mesh.frustumCulled = false;
    mesh.userData.tents = set.length;
    TENT_GROUP.add(mesh);
  }
  _tentLastDay = Math.floor(simDay);
}
function updateTents(){
  if(!TENT_GROUP.visible) return;
  if(Math.floor(simDay) !== _tentLastDay) rebuildTents();
}
rebuildTents();
_fillLastDay = null;   // s106c: re-arm the fill renderer — the tent vocabulary (TENT_VARIANTS) now exists, so in-town fill tents re-draw as tents on the next frame
var _tentPrevRender = renderer.render.bind(renderer);
renderer.render = function(s, c){
  try { updateTents(); } catch(e){ if(!updateTents._warned){ console.warn("[buildings.tents] update failed", e); updateTents._warned = true; } }
  _tentPrevRender(s, c);
};
registerLayerVisibility("buildings-tents", function(v){ TENT_GROUP.visible = v; if(v){ _tentLastDay = null; updateTents(); } });

/* =====================================================================
   THE TENT AUDITS (rules-first — defects become standing rules with
   fail-before/pass-after proofs, run by tools/verify/probe-s106b.js):
     • tentInZone — s106c AMENDED: NO tent stands outside an ACTIVE
       documented encampment zone's rings + its BLEED HALO band: centroid +
       all 4 footprint corners inside the rings or within tentHaloW(zone)
       of them, at every sampled date; the core/halo occupancy split is
       reported. (The in-town 1849 fill tents are the FILL track's — they
       are governed by buildings.inTownFill, not this law.) Fail-before:
       __P1850_TENT_QA({ignoreZoneBoundary:true}) spills tents far beyond
       the halo.
     • tentDensityWindow — per-zone standing-tent counts inside the
       documented plausibility bands at the noon dates; ZERO tents anywhere
       before a zone is born (1846/47/48-04 — so the 1847 census ~79 and
       the 1848-04 ~130 gates CANNOT be polluted; the census totals are
       re-asserted here as a regression guard); Pleasant Valley (FLAG tier)
       stays weighted DOWN vs Happy Valley as a LAW.
     • tentDeterminism — two FRESH master derivations byte-identical to the
       live master with ZERO shared-stream rng consumed; the derived-set
       fingerprint is same-day identical and A->B->...->A rewind-exact. ===== */
(function registerTentAudits(){
  registerAudit("buildings", "tentInZone", function(){
    /* s106c AMENDMENT (operator change 1): the law is now ZONE + BLEED HALO —
       every tent's centroid + 4 footprint corners stand inside the documented
       rings OR within the zone's halo width of them (tentRingsOutsideDist, the
       same measure the spawner gates on — measurement law). The halo occupancy
       split (core vs halo, per zone, across the sampled dates) is REPORTED.
       Fail-before still works: the ignoreZoneBoundary knob samples an
       over-inflated bbox with no ring/halo test, so tents land beyond the
       halo and this audit goes RED. */
    var days = ["1848-10-01", "1849-06-01", "1849-09-15", "1849-12-20"].map(eventDateToSimDay);
    if(typeof simDay === "number") days.push(simDay);
    var viol = [], checked = 0, occ = {};
    days.forEach(function(day){
      var byId = {};
      encampmentZonesAt(day).forEach(function(z){ byId[z.id] = z; });
      deriveTentSet(day).forEach(function(e){
        checked++;
        var zn = byId[e.zone];
        if(!zn){ if(viol.length < 10) viol.push({ day: +day.toFixed(0), tent: e.zone + "#" + e.zoneRank, why: "zone-not-active" }); return; }
        var hw = tentHaloW(e.zone);
        var pts = tentCornerPts(e.cx, e.cz, e.w, e.d, e.yaw), worst = 0;
        for(var pi = 0; pi < pts.length; pi++){
          var od = tentRingsOutsideDist(zn.rings, pts[pi].x, pts[pi].z);
          if(od > worst) worst = od;
          if(od > hw + 0.5){
            if(viol.length < 10) viol.push({ day: +day.toFixed(0), tent: e.zone + "#" + e.zoneRank,
                                             why: (pi === 0 ? "centroid" : "corner") + "-outside-zone+halo",
                                             beyondHaloM: +(od - hw).toFixed(1) });
            return;
          }
        }
        var o = occ[e.zone] || (occ[e.zone] = { core: 0, halo: 0 });
        if(worst > 0) o.halo++; else o.core++;
      });
    });
    var occupancy = {};
    Object.keys(occ).forEach(function(zid){
      var o = occ[zid], n = o.core + o.halo;
      occupancy[zid] = { core: o.core, halo: o.halo, haloFrac: n ? +(o.halo / n).toFixed(3) : 0, haloW: tentHaloW(zid) };
    });
    return { pass: viol.length === 0, law: "tentInZone (zone + bleed halo, s106c)", checked: checked,
             haloWidthsM: TENT_HALO_W, occupancy: occupancy,
             violations: viol.length, sample: viol.slice(0, 8),
             qaKnobs: { ignoreZoneBoundary: TENT_QA.ignoreZoneBoundary } };
  });

  registerAudit("buildings", "tentDensityWindow", function(){
    var Z0 = { "happy-valley": [0, 0], "little-chile": [0, 0], "pleasant-valley": [0, 0] };
    var checks = [
      { iso: "1846-07-01", bands: Z0 },                       // no documented camp exists
      { iso: "1847-04-01", bands: Z0 },                       // the census-79 gate date: zero tents
      { iso: "1848-04-01", bands: Z0 },                       // pre-Valparaiso-wave: zero tents (Little Chile from Aug 1848)
      { iso: "1849-09-15", bands: { "happy-valley": [150, 650], "little-chile": [15, 80], "pleasant-valley": [0, 60] } },
      { iso: "1849-12-20", bands: { "happy-valley": [780, 1150], "little-chile": [10, 80], "pleasant-valley": [0, 80] } }
    ];
    var rows = [], problems = [];
    checks.forEach(function(c){
      var day = eventDateToSimDay(c.iso);
      var counts = tentCountsByZoneAt(day), row = { date: c.iso, counts: counts };
      Object.keys(c.bands).forEach(function(zid){
        var n = counts[zid] || 0, b = c.bands[zid];
        if(n < b[0] || n > b[1]) problems.push(c.iso + " " + zid + ": " + n + " outside [" + b[0] + "," + b[1] + "]");
      });
      // FLAG-tier down-weighting is a LAW: Pleasant Valley <= 15% of Happy Valley
      var hv = counts["happy-valley"] || 0, pv = counts["pleasant-valley"] || 0;
      if(hv > 0 && pv > 0.15 * hv) problems.push(c.iso + ": pleasant-valley (" + pv + ") not weighted down vs happy-valley (" + hv + ")");
      rows.push(row);
    });
    // census-gate regression guard: the documented village gates stand untouched
    var census = [];
    [{ iso: "1847-04-01" }, { iso: "1848-04-01" }].forEach(function(c){
      var day = eventDateToSimDay(c.iso);
      var target = Math.round(fillTargetTotal(day));
      var total = deriveFillSet(day).filter(function(e){ return e.counted; }).length + reservationsAt(day).length;
      var dev = target > 0 ? Math.abs(total - target) / target : 0;
      census.push({ date: c.iso, target: target, total: total, devPct: +(dev*100).toFixed(2) });
      if(dev > 0.05) problems.push(c.iso + ": census total " + total + " regressed vs target " + target);
    });
    var rep = buildTentMaster()._report || [];
    return { pass: problems.length === 0, law: "tentDensityWindow", perDate: rows,
             censusGates: census, placementReport: rep, problems: problems.slice(0, 10) };
  });

  registerAudit("buildings", "tentDeterminism", function(){
    function fpMaster(list){
      return list.map(function(e){
        return e.code + "|" + e.zone + "#" + e.zoneRank + "|" + e.cx.toFixed(3) + "," + e.cz.toFixed(3)
             + "|" + e.yaw.toFixed(5) + "|" + e.appearDay.toFixed(2);
      }).join("\n");
    }
    function fpSet(day){
      return deriveTentSet(day).map(function(e){
        return e.zone + "#" + e.zoneRank + "|" + e.phase + "|" + e.state + "|" + e.hFrac.toFixed(3)
             + "|" + (e.transition ? e.transition.type + ":" + e.transition.progress.toFixed(5) : "-");
      }).join("\n");
    }
    var before = (typeof RNG_CALL_COUNT === "number") ? RNG_CALL_COUNT : null;
    var live = buildTentMaster(), fLive = fpMaster(live);
    TENT_MASTER = null; var a = buildTentMaster();
    TENT_MASTER = null; var b = buildTentMaster();
    TENT_MASTER = live; _tentMasterVer = TENT_QA.version;             // restore the live cache
    var after = (typeof RNG_CALL_COUNT === "number") ? RNG_CALL_COUNT : null;
    var masterIdentical = (fpMaster(a) === fpMaster(b)) && (fpMaster(a) === fLive);
    var rngConsumed = (before != null && after != null) ? (after - before) : null;
    var days = ["1849-07-14", "1849-07-16", "1849-09-15", "1849-12-20"].map(eventDateToSimDay);
    var first = days.map(fpSet), second = days.map(fpSet), rewound = fpSet(days[0]);
    var sameDay = first.every(function(s, i){ return s === second[i]; });
    var rewindExact = first[0] === rewound;
    return { pass: masterIdentical && rngConsumed === 0 && sameDay && rewindExact,
             law: "tentDeterminism", masterByteIdentical: masterIdentical, rngConsumed: rngConsumed,
             sameDayIdentical: sameDay, rewindExact: rewindExact, tents: live.length };
  });
})();

/* QA + driving hooks (dev/verify affordances — pure toggles, default off;
   the version bump invalidates the master + every tent lifecycle cache so
   the derived world is deterministic on either side of a toggle). */
if(typeof window !== "undefined"){
  window.__P1850_TENT_QA = function(opts){
    opts = opts || {};
    if(opts.ignoreZoneBoundary != null) TENT_QA.ignoreZoneBoundary = !!opts.ignoreZoneBoundary;
    if(opts.demoBurn != null)           TENT_QA.demoBurn = !!opts.demoBurn;
    TENT_QA.version++;
    TENT_MASTER = null; _tentLastDay = null;
    return { ignoreZoneBoundary: TENT_QA.ignoreZoneBoundary, demoBurn: TENT_QA.demoBurn, version: TENT_QA.version };
  };
  /* s106c — the in-town-wave QA knob (fail-before for buildings.inTownFill).
     Invalidates the FILL master AND the tent master (tents avoid fill, so a
     changed fill layout changes their avoid set) — deterministic on either
     side of a toggle. */
  window.__P1850_FILL_QA = function(opts){
    opts = opts || {};
    if(opts.ignoreInTownGates != null) FILL_QA.ignoreInTownGates = !!opts.ignoreInTownGates;
    FILL_QA.version++;
    FILL_MASTER = null; TENT_MASTER = null; _fillLastDay = null; _tentLastDay = null;
    return { ignoreInTownGates: FILL_QA.ignoreInTownGates, version: FILL_QA.version };
  };
}
setTimeout(function(){
  if(typeof window !== "undefined" && window.__P1850){
    window.__P1850.tentsAt = function(day){ return deriveTentSet(day == null ? simDay : day); };
    window.__P1850.tentCounts = function(iso){
      var day = iso ? eventDateToSimDay(iso) : simDay;
      return { date: iso || null, standing: tentCountsByZoneAt(day),
               derived: deriveTentSet(day).length, master: buildTentMaster().length,
               report: buildTentMaster()._report };
    };
  }
}, 0);

/* ---- s108 QA + probe hooks (dev/verify affordances; pure toggles, default
   off — a version bump invalidates every lifecycle cache so the derived world
   stays deterministic on either side of a toggle). ---- */
if(typeof window !== "undefined"){
  window.__P1850_LC_QA = function(opts){
    opts = opts || {};
    if(opts.breakRuinsGate != null)     LC_QA.breakRuinsGate = !!opts.breakRuinsGate;
    if(opts.disableWorldEvents != null) LC_QA.disableWorldEvents = !!opts.disableWorldEvents;
    LC_QA.version++;
    _lmSpanCache = {}; _lmSpanCacheVer = LC_QA.version;
    _lmLastDay = null; _fillLastDay = null; _tentLastDay = null; // force a re-render at the current day (tent caches key on LC_QA.version too)
    return { breakRuinsGate: LC_QA.breakRuinsGate, disableWorldEvents: LC_QA.disableWorldEvents, version: LC_QA.version };
  };
  /* every lifecycle event day (landmark + fill) — consumed by the atelier's
     coordinate-timeline inspector so transitions report on their true dates. */
  window.__P1850_LIFECYCLE_DAYS = function(){
    var out = [];
    var R = (typeof GROUND_RESERVATIONS !== "undefined") ? GROUND_RESERVATIONS : [];
    R.forEach(function(rec){
      if(!rec.resolved) return;
      lmLifecycleOf(rec).events.forEach(function(ev){ out.push(ev.start); out.push(ev.on); });
    });
    buildFillMaster().forEach(function(e){
      fillLifecycleOf(e).events.forEach(function(ev){ out.push(ev.start); out.push(ev.on); });
    });
    return out;
  };
}

/* driving hooks for the verify harness / Atelier — the derived fill set + a
   numbers table, exposed over the pure derive (zero new geometry). */
setTimeout(function(){
  if(typeof window !== "undefined" && window.__P1850){
    window.__P1850.buildingLifecycle = function(id, day){
      var d = day == null ? simDay : day;
      var rec = reservationById(id);
      if(rec && rec.resolved){
        var lc = lmLifecycleOf(rec);
        return { id: id, kind: "landmark", state: lmStateAt(rec, d),
                 events: lc.events, spans: lc.spans.map(function(s){ return { from: +s.from.toFixed(1), to: +(Math.min(s.to, 9e8)).toFixed(1), phase: s.phase }; }) };
      }
      var m = buildFillMaster();
      for(var i = 0; i < m.length; i++){
        if(m[i].code + "#" + m[i].rank === id || m[i].code === id){
          var flc = fillLifecycleOf(m[i]);
          return { id: m[i].code + "#" + m[i].rank, kind: "fill", state: fillStateAt(m[i], d),
                   events: flc.events, spans: flc.spans.map(function(s){ return { from: +s.from.toFixed(1), to: +(Math.min(s.to, 9e8)).toFixed(1), phase: s.phase }; }) };
        }
      }
      return null;
    };
    window.__P1850.fireScopeInfo = function(){
      var evs = lcFireEvents(); if(!evs.length) return null;
      var fire = evs[0], burned = [], standing = [];
      var R = (typeof GROUND_RESERVATIONS !== "undefined") ? GROUND_RESERVATIONS : [];
      R.forEach(function(rec){
        if(!rec.resolved) return;
        var inScope = fire.quads.some(function(q){ return lcPointInQuad(q, rec.footprint.cx, rec.footprint.cz); });
        (inScope ? burned : standing).push(rec.landmarkId);
      });
      var fillIn = buildFillMaster().filter(function(e){ return fire.quads.some(function(q){ return lcPointInQuad(q, e.cx, e.cz); }); });
      return { id: fire.id, day: +fire.day.toFixed(1), strips: fire.quads.length,
               landmarksInPerimeter: burned, fillInPerimeter: fillIn.map(function(e){ return e.code + "#" + e.rank; }) };
    };
    window.__P1850.fillAt = function(day){ return deriveFillSet(day == null ? simDay : day); };
    window.__P1850.fillCount = function(day){ return deriveFillSet(day == null ? simDay : day).filter(function(e){ return e.counted; }).length; };
    window.__P1850.fillMasterSize = function(){ return buildFillMaster().length; };
    window.__P1850.fillWave = function(){ return buildFillMaster()._wave; };   // s106c: the 1849 in-town wave report
    window.__P1850.fillCensus = function(iso){
      var day = eventDateToSimDay(iso);
      var lm = reservationsAt(day).length, fill = window.__P1850.fillCount(day);
      return { date: iso, target: Math.round(fillTargetTotal(day)), landmarks: lm, fill: fill, total: fill + lm };
    };
  }
}, 0);

/* =====================================================================
   s108b — THE LIFECYCLE LEGEND (operator ask 2026-07-16): a floating,
   collapsible on-screen key to the s108 placeholder states, because the
   crude-block placeholders are only readable at a glance WITH a key.
   Swatches are drawn from the SAME constants the renderer paints with
   (LM_PLACEHOLDER / LM_TINT / LC_TONES via lcScaffoldStep / lcFreshTone /
   lmBodyColorCls) — never hand-typed colour copies, so a tint change in the
   render constants re-colours the legend on the next build by construction.
   HUD voice: Roboto (--hud-font), white ink on a dark scrim (ics14e).
   BOTH targets: release gets a small collapsed LEGEND chip (top-right,
   under the clock); the atelier ALSO auto-opens it with the BUILDING
   LIFECYCLE overlay toggle (workbench setOverlay hook ->
   window.__P1850_LC_LEGEND.setOpen). ================================== */
(function lcLegendInit(){
  if(typeof document === "undefined") return;
  function cssOf(v){                                            // int hex OR THREE.Color -> css
    if(v && v.isColor) return "#" + v.getHexString();
    return "#" + ("000000" + v.toString(16)).slice(-6);
  }
  var comTint  = lmBodyColorCls("store");                       // the commercial class tint (the common case)
  var C = {
    pad:      cssOf(LM_PLACEHOLDER.pad),
    roof:     cssOf(LM_PLACEHOLDER.roof),
    marker:   cssOf(LM_PLACEHOLDER.marker),
    tint:     cssOf(comTint),
    tintCiv:  cssOf(LM_TINT.civic),
    tintDwl:  cssOf(LM_TINT.dwelling),
    fresh:    cssOf(lcFreshTone(comTint, 0)),                   // agingT=0 — full first-day sheen
    c2:       cssOf(lcScaffoldStep(comTint, 2)),
    c3:       cssOf(lcScaffoldStep(comTint, 3)),
    scaffold: cssOf(LC_TONES.scaffold),
    charcoal: cssOf(LC_TONES.charcoal),
    charRoof: cssOf(LC_TONES.charcoalRoof),
    ember:    cssOf(LC_TONES.ember),
    rubble:   cssOf(LC_TONES.rubble),
    rubbleDk: cssOf(LC_TONES.rubbleDark),
    debris:   cssOf(LC_TONES.debris)
  };
  var st = document.createElement("style");
  st.textContent = [
    "#lc-legend-chip{ position:fixed; top:66px; right:16px; z-index:11; pointer-events:auto; cursor:pointer;",
    "  font-family:var(--hud-font); font-size:0.56rem; font-weight:700; letter-spacing:2px; color:#fff;",
    "  background:rgba(14,17,21,0.68); padding:4px 10px; border-radius:3px;",
    "  text-shadow:var(--halo-dark); user-select:none; -webkit-user-select:none; }",
    "#lc-legend-chip:hover{ background:rgba(14,17,21,0.92); }",
    "#lc-legend-chip.on{ background:rgba(14,17,21,0.92); }",
    "#lc-legend{ position:fixed; top:94px; right:16px; z-index:11; pointer-events:auto; display:none;",
    "  font-family:var(--hud-font); color:#fff; background:rgba(13,15,19,0.93); border-radius:4px;",
    "  padding:8px 10px 9px; width:236px; box-sizing:border-box;",
    "  max-height:calc(100vh - 150px); overflow-y:auto; }",
    "#lc-legend.open{ display:block; }",
    "#lc-legend .lcl-title{ font-size:0.54rem; font-weight:700; letter-spacing:2px; opacity:0.85; margin-bottom:6px; }",
    "#lc-legend .lcl-title .lcl-x{ float:right; cursor:pointer; opacity:0.7; font-size:0.7rem; line-height:0.7; padding:0 2px; }",
    "#lc-legend .lcl-title .lcl-x:hover{ opacity:1; }",
    "#lc-legend .lcl-row{ display:flex; align-items:center; margin:3px 0; }",
    "#lc-legend .lcl-row canvas{ width:40px; height:26px; flex:0 0 40px; margin-right:8px;",
    "  border-radius:2px; background:rgba(255,255,255,0.06); }",
    "#lc-legend .lcl-lab{ display:block; font-size:0.54rem; font-weight:700; letter-spacing:1.2px; }",
    "#lc-legend .lcl-note{ display:block; font-size:0.5rem; font-weight:500; opacity:0.72; line-height:1.3; }",
    "#lc-legend .lcl-dot{ display:inline-block; width:7px; height:7px; border-radius:1px; vertical-align:-1px; margin:0 2px 0 4px; }"
  ].join("\n");
  document.head.appendChild(st);

  /* mini-diagram painters (2x backing for crispness). Same vocabulary as the
     render: site pad low, box massing, flat roof cap, front markers. */
  function sw(draw){
    var cv = document.createElement("canvas"); cv.width = 80; cv.height = 52;
    var ctx = cv.getContext("2d"); ctx.scale(2, 2); draw(ctx); return cv;
  }
  function pPad(ctx){ ctx.fillStyle = C.pad; ctx.fillRect(8, 20, 24, 3); }
  function pArrow(ctx, col){ ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(38, 21.5); ctx.lineTo(33, 18.8); ctx.lineTo(33, 24.2); ctx.closePath(); ctx.fill(); }
  function pBlock(ctx, x, w, h, col){ ctx.fillStyle = col; ctx.fillRect(x, 20 - h, w, h); }
  function pRoof(ctx, h, col){ ctx.fillStyle = col; ctx.fillRect(11, 20 - h - 2.5, 18, 2.5); }
  function pStripe(ctx, h){ ctx.fillStyle = C.marker; ctx.fillRect(19, 20 - h, 2, h); }

  var ROWS = [
    { lab: "C1 SITE", note: "site pad + orange entrance arrow", draw: function(ctx){
        pPad(ctx); pArrow(ctx, C.marker); } },
    { lab: "C2–C3 CONSTRUCTION", note: "pale partial block rising → class tint", draw: function(ctx){
        pPad(ctx); pBlock(ctx, 12, 8, 7, C.c2); pBlock(ctx, 20, 8, 12, C.c3); pArrow(ctx, C.marker); } },
    { lab: "ACTIVE", note: "class tint · brighter = fresh wood (first year)"
        + " <span class='lcl-dot' style='background:" + C.tintCiv + "'></span>civic"
        + "<span class='lcl-dot' style='background:" + C.tint + "'></span>comm"
        + "<span class='lcl-dot' style='background:" + C.tintDwl + "'></span>dwell", draw: function(ctx){
        pPad(ctx); pBlock(ctx, 12, 8, 14, C.fresh); pBlock(ctx, 20, 8, 14, C.tint);
        pRoof(ctx, 14, C.roof); pStripe(ctx, 12); } },
    { lab: "EXPANDING", note: "pale annex slab growing above the old roof", draw: function(ctx){
        pPad(ctx); pBlock(ctx, 12, 16, 10, C.tint); pBlock(ctx, 14, 12, 5, C.scaffold);
        ctx.fillStyle = C.roof; ctx.fillRect(13, 2.5, 14, 2.5); } },
    { lab: "BURNING", note: "charcoal body + ember-red front (Dec 24 1849)", draw: function(ctx){
        pPad(ctx); pBlock(ctx, 12, 16, 14, C.charcoal); pRoof(ctx, 14, C.charRoof);
        ctx.fillStyle = C.ember; ctx.fillRect(19, 8, 2, 12); pArrow(ctx, C.ember); } },
    { lab: "RUINS", note: "dark rubble slab + debris — must be cleared", draw: function(ctx){
        ctx.fillStyle = C.rubble; ctx.fillRect(10, 16.5, 20, 4);
        ctx.fillStyle = C.rubbleDk; ctx.fillRect(14, 14, 4, 2.5); ctx.fillRect(22, 14.7, 3, 1.8);
        ctx.fillStyle = C.debris; ctx.beginPath(); ctx.moveTo(38, 18.5); ctx.lineTo(38, 24); ctx.lineTo(32.5, 21.2); ctx.closePath(); ctx.fill(); } },
    { lab: "CLEARING", note: "rubble shrinking away", draw: function(ctx){
        ctx.fillStyle = C.rubble; ctx.fillRect(13, 18.3, 14, 2.2);
        ctx.fillStyle = C.rubbleDk; ctx.fillRect(17, 16.8, 3, 1.5); } },
    { lab: "CLEARED", note: "bare site pad — ready ground, nothing else", draw: function(ctx){
        pPad(ctx); } },
    { lab: "TEARDOWN", note: "body shrinking, roof off (replacement path)", draw: function(ctx){
        pPad(ctx); pBlock(ctx, 12, 16, 8, C.scaffold); pArrow(ctx, C.marker); } },
    { lab: "REBUILD", note: "C1→C4 again — only on a cleared lot", draw: function(ctx){
        pPad(ctx); pBlock(ctx, 12, 10, 5, C.c2); pArrow(ctx, C.marker); } }
  ];

  var chip = document.createElement("div");
  chip.id = "lc-legend-chip"; chip.textContent = "LEGEND"; chip.title = "building lifecycle states — what the placeholder blocks mean";
  var panel = document.createElement("div");
  panel.id = "lc-legend";
  var title = document.createElement("div"); title.className = "lcl-title";
  title.innerHTML = "BUILDING LIFECYCLE — PLACEHOLDER KEY<span class='lcl-x' title='close'>×</span>";
  panel.appendChild(title);
  ROWS.forEach(function(r){
    var row = document.createElement("div"); row.className = "lcl-row";
    row.appendChild(sw(r.draw));
    var txt = document.createElement("div");
    txt.innerHTML = "<span class='lcl-lab'>" + r.lab + "</span><span class='lcl-note'>" + r.note + "</span>";
    row.appendChild(txt);
    panel.appendChild(row);
  });
  document.body.appendChild(chip);
  document.body.appendChild(panel);

  var open = false;
  function setOpen(v){
    open = !!v;
    panel.classList.toggle("open", open);
    chip.classList.toggle("on", open);
  }
  chip.addEventListener("click", function(){ setOpen(!open); });
  title.querySelector(".lcl-x").addEventListener("click", function(){ setOpen(false); });
  window.__P1850_LC_LEGEND = { setOpen: setOpen, isOpen: function(){ return open; } };
})();
