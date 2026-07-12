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
var rngBuild = sfc32(seeds[0],seeds[1],seeds[2],seeds[3]);
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
}

/* Generic string helpers (relocated from ui-chrome.js in the 2026-07-12
   cleanup — labels-inspect is escapeHTML's heaviest consumer and core
   routing uses cap(); cross-layer helper calls belong in core). Function
   declarations hoist module-wide, so the earlier position is behavior-safe. */
function escapeHTML(s){ return (s||"").replace(/[&<>]/g, function(c){ return c==="&"?"&amp;":(c==="<"?"&lt;":"&gt;"); }); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
