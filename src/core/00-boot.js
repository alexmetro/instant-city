/* =====================================================================
   core/00-boot — module prologue: sim-clock constants, CFG, touch detection, seeded RNG, math helpers.
   Shared interface owner (layers-spec.md): seeded dice, sim epoch constants.
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 01 — IIFE open, sim-clock constants, CFG, touch detect, seeded RNG, math helpers */
(function(){
"use strict";

/* =====================================================================
   SIM CLOCK CONSTANTS — hoisted to the very top of the module (s56 P0
   fix). These used to live down in the Phase-2 section (~line 4839),
   AFTER buildVillage() had already run — so every parse-time call of
   eventDateToSimDay() before that point (landmarkFoundedDay() inside
   placeBuilding(), the exact trap the OFARRELL_SWING comment documents)
   silently computed with SIM_START_MS === undefined and returned NaN.
   Concretely: all 49 era-gated landmark buildings (the Dec-1849 fire
   block, El Dorado, Parker House, City Hotel, ...) got foundedDay:NaN,
   and updateEraGating()'s `simDay >= NaN` is false forever — they were
   permanently buried at EVERY date, leaving their baked contact shadows
   orphaned on empty ground (the user-reported "shadows with no bodies").
   Nothing here depends on anything else in the module, so the top is the
   one place this can never happen again.
   ===================================================================== */
var SIM_START_MS = Date.UTC(1846,6,1);                    // July 1, 1846
var SIM_END_DAY = (Date.UTC(1850,0,1)-SIM_START_MS)/86400000; // through Dec 31, 1849
function dateFromSimDay(day){ return new Date(SIM_START_MS + day*86400000); }
function eventDateToSimDay(dateStr){
  var y = +dateStr.slice(0,4);
  var m = dateStr.length>=7 ? (+dateStr.slice(5,7)-1) : 0;
  var d = dateStr.length>=10 ? +dateStr.slice(8,10) : 1;
  return (Date.UTC(y,m,d)-SIM_START_MS)/86400000;
}

/* =====================================================================
   CONFIG
   ===================================================================== */
var CFG = {
  // worldSize is GONE (s46 peninsula bake): the baked domain is now a
  // RECTANGLE read from terrain-1846.js — see WORLD below TERRAIN's load.
  waterSeg: 128,
  minAltitude: 30,
  maxAltitude: 15000,     // s46: raised so the FULL peninsula (Pacific -> bay) frames in one view
  labelFadeStart: 1200,   // (superseded s42 — per-category bands live in _geoLabelBandOpacity)
  labelFadeFull: 1900,
  ghostFadeStart: 500,    // ghost overlay fully visible above this altitude
  ghostFadeEnd: 150,       // fully hidden at/below this altitude
  zoomTrueScaleFull: 550, // semantic zoom (Phase 2 addendum): below this altitude,
  zoomCartoFull: 850,     // true-scale buildings are fully opaque and the district-tint
                           // cartographic layer is invisible; above zoomCartoFull it's reversed.
  peopleMaxAltitude: 350, // Phase 4 §9: ambient people exist only below this altitude
                           // (statistics/the population curve stand in above it).
  buildingLabelAlwaysAlt: 120 // LABEL TIER FIX (usability fix, 2026-07-09): DOM
                           // building-NAME chips render only below this altitude
                           // (was 250, with an always-on touch bypass above it —
                           // that's what piled ~12 name chips on top of the town
                           // on mobile). Between here and zoomCartoFull, only the
                           // decluttered biz-glyph roundels (updateBizGlyphs) carry
                           // building identity; physical signage covers the rest.
};

/* =====================================================================
   TOUCH/MOBILE DETECTION — feature-detected (never UA-sniffed) per the
   Phase-4 controls-overhaul addendum. Used to (a) switch the drag/pinch
   input scheme, (b) collapse the HUD hint behind a tap chip, and (c) trim
   scatter/people instance counts ~40% for lower-powered touch hardware.
   ===================================================================== */
var IS_TOUCH = (("ontouchstart" in window) || (navigator.maxTouchPoints||0) > 0) &&
               (!window.matchMedia || window.matchMedia("(pointer: coarse)").matches);
if(IS_TOUCH) document.body.classList.add("touch-device");
function SCT(n){ return IS_TOUCH ? Math.max(1, Math.round(n*0.6)) : n; } // ~40% instance-count trim on touch

/* =====================================================================
   SEED + RNG  (sfc32, seeded via URL hash #s=1234)
   Used ONLY for building placement/size/color jitter. Terrain, streets,
   shoreline and hills are fixed truth and never depend on the seed.
   ===================================================================== */
function cyrb128(str){
  var h1=1779033703,h2=3144134277,h3=1013904242,h4=2773480762,k;
  for(var i=0;i<str.length;i++){
    k=str.charCodeAt(i);
    h1=h2^Math.imul(h1^k,597399067);
    h2=h3^Math.imul(h2^k,2869860233);
    h3=h4^Math.imul(h3^k,951274213);
    h4=h1^Math.imul(h4^k,2716044179);
  }
  h1=Math.imul(h3^(h1>>>18),597399067);
  h2=Math.imul(h4^(h2>>>22),2869860233);
  h3=Math.imul(h1^(h3>>>17),951274213);
  h4=Math.imul(h2^(h4>>>19),2716044179);
  return [(h1^h2^h3^h4)>>>0,(h2^h1)>>>0,(h3^h1)>>>0,(h4^h1)>>>0];
}
function sfc32(a,b,c,d){
  return function(){
    a>>>=0;b>>>=0;c>>>=0;d>>>=0;
    var t=(a+b)|0;
    a=b^(b>>>9);
    b=(c+(c<<3))|0;
    c=(c<<21|c>>>11);
    d=(d+1)|0;
    t=(t+d)|0;
    c=(c+t)|0;
    return (t>>>0)/4294967296;
  };
}
var seedStr = "1846";      // WORLD seed — terrain/streets/buildings/ships/curves never read lifeVariant
var lifeVariant = 0;       // life-stream variant — constant across ordinary jumps; bumped only by the
                            // seed chip's reshuffle glyph (a deliberate "new telling", not an automatic re-seed)
(function(){
  var m = location.hash.match(/s=([A-Za-z0-9]+)(?:\.(\d+))?/);
  if(m){ seedStr = m[1]; if(m[2]) lifeVariant = parseInt(m[2],10)||0; }
  else { try{ history.replaceState(null,"","#s="+seedStr); }catch(e){} }
})();
document.getElementById("seed-val").textContent = seedStr;
var seeds = cyrb128("p1850-"+seedStr);
/* RNG_CALL_COUNT (s80a): a transparent call counter over the seeded dice —
   returns the identical stream, byte-for-byte, but lets the cadastre's
   lotDeterminism audit PROVE the plat consumes zero dice (a pure function of
   the spine must never advance this counter when re-derived). */
var RNG_CALL_COUNT = 0;
var _rngBuildCore = sfc32(seeds[0],seeds[1],seeds[2],seeds[3]);
var rngBuild = function(){ RNG_CALL_COUNT++; return _rngBuildCore(); };
function seedHashValue(){ return seedStr + (lifeVariant ? ("."+lifeVariant) : ""); }
function updateHashSeed(){
  var h = location.hash.replace(/s=[A-Za-z0-9]+(?:\.\d+)?/, "s="+seedHashValue());
  if(h.indexOf("#")!==0) h = "#"+h;
  try{ history.replaceState(null,"", h); }catch(e){}
}

/* =====================================================================
   SMALL MATH HELPERS
   ===================================================================== */
function lerp(a,b,t){ return a+(b-a)*t; }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function clamp01(v){ return v<0?0:(v>1?1:v); }
function smoothstep(e0,e1,x){ var t=clamp((x-e0)/(e1-e0),0,1); return t*t*(3-2*t); }

/* Deterministic (non-seeded) hash noise — used for terrain, which is
   fixed truth and must render identically regardless of the seed. */
function hash2(x,y){
  var s = Math.sin(x*127.1+y*311.7)*43758.5453123;
  return s-Math.floor(s);
}
function noise2(x,y){
  var xi=Math.floor(x), yi=Math.floor(y);
  var xf=x-xi, yf=y-yi;
  var u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  var a=hash2(xi,yi), b=hash2(xi+1,yi), c=hash2(xi,yi+1), d=hash2(xi+1,yi+1);
  return lerp(lerp(a,b,u), lerp(c,d,u), v);
}
function fbm(x,y,octaves){
  var total=0, amp=0.5, freq=1, maxAmp=0;
  for(var i=0;i<octaves;i++){
    total += noise2(x*freq,y*freq)*amp;
    maxAmp += amp;
    amp*=0.5; freq*=2.13;
  }
  return total/maxAmp; // ~0..1
}


/* ---- AUDIT REGISTRY plumbing (Great Split, layers-spec.md rules block) ----
   Each layer registers its executable seed-rule audits from its OWN file via
   registerAudit(layer, name, fn). fn is called lazily (post-load, by
   __P1850.audits.runAll() or directly), so registering before the module
   vars it reads are assigned is safe — var/function bindings are hoisted
   module-wide. core/06-debug.js exposes the registry on __P1850.audits. */
var __P1850_AUDITS = {};
function registerAudit(layer, name, fn){
  (__P1850_AUDITS[layer] = __P1850_AUDITS[layer] || {})[name] = fn;
  /* s67: core/06-debug's __P1850.audits namespace snapshots the registry's
     LAYER KEYS when its chunk (70) runs — a layer whose first registerAudit
     executes in a later chunk (effects' lightStateConsistency lives in
     chunk 71) would be reachable via runAll() (which iterates the live
     registry) but missing from __P1850.audits.<layer>. Attach late layers
     to the exposed namespace here; same object reference, so per-audit
     additions inside a known layer still surface either way. */
  if(window.__P1850 && window.__P1850.audits && !window.__P1850.audits[layer])
    window.__P1850.audits[layer] = __P1850_AUDITS[layer];
}

/* ---- LAYER VISIBILITY REGISTRY (dev-tooling interface, layers-spec.md §15) ----
   Each render layer registers a setVisible(bool) toggle for its own
   meshes/canvases from its OWN file via registerLayerVisibility(name, fn)
   — a one-liner per layer. The only consumer is the SEPARATE dev-tool
   build (see layers-spec.md slot 15); in this release build nothing ever
   calls these, so the registry is a dormant object — zero per-frame cost. */
var __P1850_LAYER_VIS = {};
function registerLayerVisibility(name, setVisibleFn){ __P1850_LAYER_VIS[name] = setVisibleFn; }

/* Generic string helpers (relocated from ui-chrome.js in the 2026-07-12
   cleanup — labels-inspect is escapeHTML's heaviest consumer and core
   routing uses cap(); cross-layer helper calls belong in core). Function
   declarations hoist module-wide, so the earlier position is behavior-safe. */
function escapeHTML(s){ return (s||"").replace(/[&<>]/g, function(c){ return c==="&"?"&amp;":(c==="<"?"&lt;":"&gt;"); }); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* =====================================================================
   FOUNDATION STUBS (s79 THE FOUNDATION CUT — foundation-reset.md §2).
   The substrate keeps core + terrain + ground-plan + ground-paint + chrome;
   the higher layers (buildings, doodads, people, ships, fauna, effects,
   director, zones-tint, labels-inspect) are OUT until each passes its
   admission gate (foundation-reset §3-§4). Those removed layers used to
   DEFINE the symbols below, which a handful of KEPT files still reference at
   the interface (the render loop, the road-lifecycle use counter, the walk
   mask, the debug/inspect API, kept event handlers). Rather than leave
   dangling references, we stub them HONESTLY here — empty collections and
   no-op / passthrough functions — placed in the module prologue so they exist
   before any consumer runs (function declarations hoist module-wide, so even
   terrain's init-time tagInspect() resolves). This whole block is REMOVABLE:
   as each layer is admitted it re-defines its own symbols (a later
   declaration wins) and the matching stub line is deleted at the door.
   Each stub names the layer whose admission retires it.
   ===================================================================== */
/* buildings — placement inputs the road-lifecycle counter, walk mask, and
   placement audits iterate (empty ⇒ zero contributors, audits pass vacuously) */
var VILLAGE_BUILDING_SPOTS = [];      // FOUNDATION: awaiting admission of buildings
var growthBuildingCandidates = [];    // FOUNDATION: awaiting admission of buildings
var tentCandidates = [];              // FOUNDATION: awaiting admission of buildings
var spawnedBuildings = [];            // FOUNDATION: awaiting admission of buildings
var spawnedTents = [];                // FOUNDATION: awaiting admission of buildings
var tentMesh = { count: 0 };          // FOUNDATION: awaiting admission of buildings (debug getter reads .count)
var PLACEMENT_SIGNS = [];             // FOUNDATION: awaiting admission of buildings (placement.signs audit registry)
function dayForBuildingIndex(){ return 1e9; } // FOUNDATION: awaiting admission of buildings (never revealed)
function dayForTentIndex(){ return 1e9; }      // FOUNDATION: awaiting admission of buildings
/* doodads — placement scatter the placement audits check clearance against;
   scatterMeshes is the far-LOD registry terrain drops its natural-feature
   meshes (tule marsh, sea lions, waterfowl, deer) into (they still scene.add) */
var PLACEMENT_TREES = [];             // FOUNDATION: awaiting admission of doodads
var PLACEMENT_STATIC_PROPS = [];      // FOUNDATION: awaiting admission of doodads
var scatterMeshes = [];               // FOUNDATION: awaiting admission of doodads (terrain pushes natural-feature meshes here)
/* people — home spots + roster slots + the life-stream reshuffle + camp gate */
var HOME_BUILDING_SPOTS = [];         // FOUNDATION: awaiting admission of people
var ALL_PEOPLE_SLOTS = [];            // FOUNDATION: awaiting admission of people
var HAPPY_VALLEY_REVEAL_DAY = eventDateToSimDay("1849-08-01"); // FOUNDATION: awaiting admission of people (Happy Valley camp corridor gate)
function reshuffleLifeStream(){}      // FOUNDATION: awaiting admission of people
/* ships — the documented/fill visit lists the debug API + provenance toggle read */
var shipVisits = [];                  // FOUNDATION: awaiting admission of ships
var fillShipVisits = [];              // FOUNDATION: awaiting admission of ships
var STORESHIP_INFO = [];              // FOUNDATION: awaiting admission of ships (placement.storeshipMud audit input)
/* fauna — terrain's natural-fauna meshes (sea lion/waterfowl/deer) share the
   fauna sway shader's time uniform; static (value stays 0) until fauna returns */
var faunaTimeUniform = { value: 0 };  // FOUNDATION: awaiting admission of fauna
var MISSION_GRAZE_PTS = [];           // FOUNDATION: awaiting admission of fauna (placement.fauna graze-point input)
var PRESIDIO_GRAZE_PTS = [];          // FOUNDATION: awaiting admission of fauna
var PASTURE_MISSION = { x:0, z:0 };   // FOUNDATION: awaiting admission of fauna (pasture centre — unused while graze lists are empty)
var PASTURE_PRESIDIO = { x:0, z:0 };  // FOUNDATION: awaiting admission of fauna
/* labels-inspect — the inspect/selection system + its pick/close/mode state */
var INSPECT_MESHES = [];              // FOUNDATION: awaiting admission of labels-inspect
var LOC_POINTS = [];                  // FOUNDATION: awaiting admission of labels-inspect
var provenanceOnly = false;           // FOUNDATION: awaiting admission of labels-inspect
var followedSlot = null;              // FOUNDATION: awaiting admission of labels-inspect (people-follow target)
var followedDocumented = null;        // FOUNDATION: awaiting admission of labels-inspect
function tagInspect(){}               // FOUNDATION: awaiting admission of labels-inspect (terrain tags its natural features)
function trySelectAtScreenXY(){ return null; } // FOUNDATION: awaiting admission of labels-inspect (nothing selectable yet)
function closeInspect(){}             // FOUNDATION: awaiting admission of labels-inspect
function phoneChromeActive(){ return false; }  // FOUNDATION: awaiting admission of labels-inspect
/* the __P1850._sel dispatch table (core/06-debug) references these EAGERLY at
   the object literal — no-op each until the inspect panel returns */
function openPersonInspectorForSlot(){}       // FOUNDATION: awaiting admission of labels-inspect
function openPersonInspectorForDocumented(){} // FOUNDATION: awaiting admission of labels-inspect
function openShipInspector(){}                // FOUNDATION: awaiting admission of labels-inspect
function openBuildingInspector(){}            // FOUNDATION: awaiting admission of labels-inspect
function openGrowthBuildingInspector(){}      // FOUNDATION: awaiting admission of labels-inspect
function openTentInspector(){}                // FOUNDATION: awaiting admission of labels-inspect
function openStreetInspector(){}              // FOUNDATION: awaiting admission of labels-inspect
function openZoneInspector(){}                // FOUNDATION: awaiting admission of labels-inspect
function openSpeciesInspector(){}             // FOUNDATION: awaiting admission of labels-inspect
function openPlaceInspector(){}               // FOUNDATION: awaiting admission of labels-inspect
/* zones-tint — the district zone list the debug _selData getter + any zone
   probe read (empty ⇒ no districts to tint or inspect yet) */
var DISTRICT_ZONES = [];              // FOUNDATION: awaiting admission of zones-tint
/* director — watch-mode + beat state the debug getter + ui-chrome endWatch read */
var WATCH = { on: false };            // FOUNDATION: awaiting admission of director
var DIRECTOR = { autoSlot:null, savedSpeed:null, beat:null, pending:[], suspendUntil:0, nextPickAt:0, beatStart:0 }; // FOUNDATION: awaiting admission of director
var INTEREST = { slotCool:{}, siteCool:{}, typeCool:{}, nameCool:{}, hourSpent:{}, log:[] }; // FOUNDATION: awaiting admission of director (debug interest getter)
/* effects — day/night + weather + fire + ghost state that kept core/handlers touch.
   Lighting is now STATIC NOON (owned by core/02-scene here); these keep the
   sim-clock + menu wiring inert until the effects layer restores the cycle. */
var WET_OVERRIDE = null;              // FOUNDATION: awaiting admission of effects (debug wet override)
var ghostVisible = false;             // FOUNDATION: awaiting admission of effects (altitude ghost overlay)
var weatherState = { wet: 0, mud: 0 }; // FOUNDATION: awaiting admission of effects (camera fog + debug read it every frame; static-dry until weather returns)
var puddleMesh = { count: 0 };        // FOUNDATION: awaiting admission of effects (debug wet getter reads .count)
function fireClockStep(step){ return step; }   // FOUNDATION: awaiting admission of effects (no fire-day sub-stepping)
function refreshLightState(){}        // FOUNDATION: awaiting admission of effects (noon is static; no relight on jump)
function updateWetTint(){}            // FOUNDATION: awaiting admission of effects (ground stays dry)
function setGhost(){}                 // FOUNDATION: awaiting admission of effects
function skipToSunriseSunset(){}      // FOUNDATION: awaiting admission of effects (T-key sun skip)
function setProvenanceOnly(){}        // FOUNDATION: awaiting admission of labels-inspect (provenance filter)
