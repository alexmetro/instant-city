/* =====================================================================
   core/03-sim — sim clock, events/prices/roster data plumbing, population + density curves.
   Shared interface owner: simDay, setSimSpeed, eventDateToSimDay, populationAt/densityAt.
   GREAT SPLIT (layers-spec.md): this file holds 5 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 22 — phase 2 banner */
/* =========================================================================
   PHASE 2 — "THE CLOCK"
   Simulation time, ships arriving/departing on their true documented dates,
   population-driven village growth (buildings -> tents), rain-year weather,
   the bottom event ticker, and (design addendum) the semantic-zoom
   cartographic layer that stands in for individual buildings at altitude.
   Builds on the Phase 1 world above; only reaches back into it via the
   hoisted buildingsMesh reference (crossfading) and the splatWorldMat/
   splatTownMat ground-splat materials (wet-weather tint).
   ========================================================================= */

/* ---- helpers shared by everything below ----
   (SIM_START_MS / SIM_END_DAY / dateFromSimDay / eventDateToSimDay moved
   to the TOP of the module, s56 P0 fix — see the SIM CLOCK CONSTANTS
   block up there for why parse-order mattered.) */
/* SINGLE-FRAME LIBERTY (2026-07-14, road-master-spec SINGLE-FRAME AMENDMENT):
   OFARRELL_SWING_START/END are DELETED — they only ever parameterized the
   Feb-Aug 1847 grid-swing easing, which is gone (no street physically
   rotated; the survey correction was a paper event). The 1847 survey remains
   a street/plat CHECKPOINT via ERA_MAP_SIMDAY["ofarrell-1847"] (Aug 1 1847,
   day 396) up in the STREETS_RUNTIME section — that literal is a documented
   street-appearance date, not a frame boundary. */

/* @P1850-CHUNK 24 — sim clock: speeds, hash date, clock DOM readouts */
/* =========================================================================
   1. SIM CLOCK — fractional sim-days since 1846-07-01. Speeds read straight
   off dt each frame (no need for a sub-stepped accumulator: nothing here is
   physically simulated at sub-day resolution, "1 tick = 1 sim-day" just
   means downstream systems compare simDay against dated records). URL hash
   gains &d=YYYY-MM-DD, restored on load and rewritten on pause per spec §8.
   ========================================================================= */
/* SPEED REDESIGN (fix sprint 2026-07-11, user-specified): the DEFAULT
   unpaused speed is LIVE — sim time 1:1 with real time — so street
   life is watchable at true walking pace. "x2" (fix sprint 2026-07-11 #3)
   is the FOLLOW tier: sim time at 2x real, people still schedule-true and
   human-followable (~3.2 m/s apparent max). day/week/month are the
   timelapse tiers; at those rates individual schedule-true motion is NOT
   rendered (see AMBIENT-FLOW in the people system) because one sim-hour
   passes in ~83ms at day/s alone. Keys: Space pause/LIVE, 1=2x follow,
   2=day/s, 3=week/s, 4=month/s. */
var SIM_SPEEDS = { 0:0, live:1/86400, x2:2/86400, day:0.5, week:7, month:30 }; // days/sec: paused, LIVE 1:1, 2x follow, 1day/2s, 1wk/s, 1mo/s
var simDay = 0;
var simSpeedKey = 0;
var lastActiveSpeed = "day"; // last TIMELAPSE tier — watch mode's unpause default
var SCRUBBING = false;   // timeline drag in progress (set by the scrubber) — renders as ambient flow, like timelapse
function timelapseActive(){ return simSpeedKey==="day" || simSpeedKey==="week" || simSpeedKey==="month"; }
function followSpeedActive(){ return simSpeedKey==="live" || simSpeedKey==="x2"; } // schedule-true, sun-true tiers
(function initSimClockFromHash(){
  var m = location.hash.match(/d=(\d{4}-\d{2}-\d{2})/);
  // P0-3 fix (2026-07-10): +0.5 lands a bare calendar-date URL at noon, not
  // midnight — see jumpToDate()'s comment for why.
  if(m) simDay = clamp(eventDateToSimDay(m[1])+0.5, 0, SIM_END_DAY);
})();
function simDateISO(d){ return d.toISOString().slice(0,10); }
var DOW_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]; // shared calendar names (moved from people.js, cleanup 2026-07-12 — people schedules + doodads' wash day both read it)
function updateHashDate(){
  var iso = simDateISO(dateFromSimDay(simDay));
  var h = location.hash.replace(/&?d=\d{4}-\d{2}-\d{2}/,"");
  if(h.indexOf("#")!==0) h = "#"+h;
  try{ history.replaceState(null,"", h+"&d="+iso); }catch(e){}
  /* TWO-MIDDAYS FIX (s67): updateHashDate() is the commit choke point every
     discrete time-set already flows through — jumpToDate() (scrub release,
     notch click, [ / ], URL/debug jumps), skipToSunriseSunset() (T), and
     pause. Re-derive the full light state synchronously here so a jump
     relights the world in the same call, not one rAF frame later (or never,
     in rAF-throttled/hidden QA tabs) — the "two middays" divergence. Same
     pattern as animate(): core orchestration calling a layer's update entry
     point (refreshLightState, effects.js — hoisted module-wide). */
  refreshLightState();
}
var clockDateEl = document.getElementById("clock-date");
var clockSpeedEl = document.getElementById("clock-speed");
var SPEED_LABELS = { 0:"PAUSED", live:"LIVE — 1:1", x2:"FOLLOW — 2×", day:"1 DAY / 2s", week:"1 WEEK / s", month:"1 MONTH / s" };
/* (The speed-pill DOM wiring + the Space/1/2/3/4 keyboard bindings were
   relocated to layers/camera-input.js in the 2026-07-12 cleanup — spec:
   core/sim does no rendering; camera-input OWNS keys + the speed pill.
   Their chunks keep the exact original global positions, so setSimSpeed(0)
   below still runs AFTER updateSpeedPill/speedPillEl exist, and listener
   registration order is unchanged. setSimSpeed state stays core.) */

/* @P1850-CHUNK 26 — sim speed state (setSimSpeed) */
function setSimSpeed(key){
  var wasPaused = simSpeedKey===0;
  simSpeedKey = key;
  clockSpeedEl.textContent = SPEED_LABELS[key];
  updateSpeedPill(key);
  if(key===0 && !wasPaused) updateHashDate(); // "update on pause"
}
setSimSpeed(0); // starts paused; Space toggles pause/LIVE, 1 = 2x follow, 2/3/4 for timelapse

/* @P1850-CHUNK 28 — sim clock advance, events data, prices, roster + occupation catalog */
function updateSimClock(dt){
  if(simSpeedKey!==0){
    var step = SIM_SPEEDS[simSpeedKey]*dt;
    // PHASE 5 — fire-day sub-day simulation: while the sim clock is inside
    // the Dec 24 1849 fire window, cap the effective rate at ~1 sim-hour
    // per 3 real seconds so the fire is watchable; and never let a coarse
    // step (week/s, month/s) jump the window entirely — land on its
    // opening instead. fireClockStep() is defined with the fire system
    // further down (function declarations hoist across this closure).
    step = fireClockStep(step, dt);
    simDay = clamp(simDay + step, 0, SIM_END_DAY);
    if(simDay>=SIM_END_DAY) setSimSpeed(0); // the currently-extracted era ends here — hold, don't run away
  }
  var d = dateFromSimDay(simDay);
  clockDateEl.textContent = d.toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric", year:"numeric", timeZone:"UTC"});
}

/* =========================================================================
   2. EVENTS DATA — data/events.jsonl, pre-filtered to the SF/Yerba Buena
   strand and baked into events-1846-49.js by tools/build-events.js (same
   script-tag pattern as terrain-1846.js, so the app still runs from a plain
   file:// double-click with no fetch()/CORS step).
   ========================================================================= */
var EVENTS_RAW = window.EVENTS_1846_49 || [];
if(!window.EVENTS_1846_49) console.warn("[verify] events-1846-49.js failed to load — ships/ticker will be empty. Run: node tools/build-events.js");
EVENTS_RAW.forEach(function(e){
  e.simDay = eventDateToSimDay(e.date);
  // PHASE 5 fix: spine 'arrival' records carry a ship but no extraction
  // type (the SS California and Niantic, both 1849 anchors) — normalize so
  // the ship system, ticker, and director all see them as arrivals.
  if(!e.type && e.class==="arrival" && e.ship) e.type = "ship_arrival";
});

/* =========================================================================
   2b. PRICES DATA — data/prices.jsonl baked (review:true skipped) into
   prices-1846-49.js by tools/build-prices.js (GAPS-2026-07-09 item 2, the
   economy layer). Surfaced quietly per grounding.md's voice rule: shop
   signage price lines, the paper pane's MARKETS table (linked to issues
   whose extraction already tagged sourceContext:"prices_current"), and a
   documented-wage mention on person-inspector bio cards. No UI badge or
   commentary calls this system out by name.
   ========================================================================= */
var PRICES_RAW = window.PRICES_1846_49 || [];
if(!window.PRICES_1846_49) console.warn("[verify] prices-1846-49.js failed to load — signage/markets/wage lines will be empty. Run: node tools/build-prices.js");
PRICES_RAW.forEach(function(p){ p.simDay = p.date ? eventDateToSimDay(p.date) : null; });
var PRICES_BY_DATE = {};
PRICES_RAW.forEach(function(p){ if(p.date){ (PRICES_BY_DATE[p.date]=PRICES_BY_DATE[p.date]||[]).push(p); } });
/* first-match-wins lookup by item-name substring, era-general (not tied to
   simDay — signage/bio text is baked once, so "the" documented figure for a
   trade is whichever the era's own record set surfaces first, favoring
   earlier/cheaper era-typical figures over the 1849 inflation spike). */
function findPriceByItem(re){
  for(var i=0;i<PRICES_RAW.length;i++){ if(re.test(PRICES_RAW[i].item)) return PRICES_RAW[i]; }
  return null;
}
function formatPrice(p){
  if(!p) return null;
  var amt = "$"+(p.priceHigh!=null ? (p.price+"-"+p.priceHigh) : p.price);
  return amt + (p.unit ? ("/"+p.unit) : "");
}

/* =========================================================================
   2c. ROSTER + OCCUPATION CATALOG — behavior-spec.md §0/item 2: real names
   from data/people.jsonl (tools/build-roster.js -> roster-1846-49.js) seed
   the persistent population BEFORE invented people; occupations are dealt
   from data/catalog-occupations.json's eraWeight/genderRule/originSkew
   (tools/build-catalog-js.js -> catalog-occupations.js), binding venueNeeds
   only where worldSupport==="exists" (behavior-spec.md's own instruction).
   ========================================================================= */
var ROSTER = window.ROSTER_1846_49 || [];
if(!window.ROSTER_1846_49) console.warn("[verify] roster-1846-49.js failed to load — routine cast will use invented names only. Run: node tools/build-roster.js");
var CATALOG_OCC_ALL = (window.CATALOG_OCCUPATIONS && window.CATALOG_OCCUPATIONS.occupations) || [];
if(!window.CATALOG_OCCUPATIONS) console.warn("[verify] catalog-occupations.js failed to load — routine slots will have no occupations (there is no fallback list). Run: node tools/build-catalog-js.js");
var CATALOG_OCC = CATALOG_OCC_ALL.filter(function(o){ return o.worldSupport==="exists"; });
var CATALOG_OCC_BY_ID = {}; CATALOG_OCC_ALL.forEach(function(o){ CATALOG_OCC_BY_ID[o.id]=o; });
// PL-B item 1 (full dice engine): the remaining behavior-spec.md §0 catalog —
// activities (§2/§3, what the world offers + the dice's menu). The reactions
// catalog (app/catalog-reactions.js) was loaded-but-never-consumed for weeks;
// its script tag + loader were removed in the 2026-07-12 cleanup (the sidecar
// file stays on disk — re-add both if a ticker/reaction pass ever lands).
var CATALOG_ACT = (window.CATALOG_ACTIVITIES && window.CATALOG_ACTIVITIES.activities) || [];
if(!window.CATALOG_ACTIVITIES) console.warn("[verify] catalog-activities.js failed to load — the dice engine has no activities to sample. Run: node tools/build-catalog-js.js");
// roster people are consumed sequentially (best-attested first — see the
// builder's sort) into routine slots first, then extras, so real names use
// up the persistent cast before density-fill anonymous slots reach for one.
var rosterPtr = 0;
function nextRosterPerson(){
  return rosterPtr < ROSTER.length ? ROSTER[rosterPtr++] : null;
}
/* era column for the catalog's eraWeight table, given a sim day a person is
   expected to be active in (behavior-spec.md item 2: "assign per its
   eraWeights"). 1849-01-01 is the documented column boundary. */
var ERA_1849_DAY = eventDateToSimDay("1849-01-01");
function eraColumnForDay(day){ return day>=ERA_1849_DAY ? "1849" : "1846-1848"; }
/* weighted pick over CATALOG_OCC for a given era + origin, honoring
   eraWeight and originSkew (originSkew is a fill-marked per-origin
   multiplier map on some entries; absent = neutral 1.0). */
function pickCatalogOccupation(era, originKey, rng){
  var total=0, weights=[];
  for(var i=0;i<CATALOG_OCC.length;i++){
    var o=CATALOG_OCC[i], ew=o.eraWeight && o.eraWeight[era];
    var w = ew ? ew.weight : 0;
    if(w<=0) continue;
    if(o.originSkew && originKey && o.originSkew[originKey]!=null) w *= o.originSkew[originKey];
    weights.push({o:o, w:w}); total += w;
  }
  if(total<=0) return null;
  var r = rng()*total;
  for(var j=0;j<weights.length;j++){ r -= weights[j].w; if(r<=0) return weights[j].o; }
  return weights[weights.length-1].o;
}
/* occupation's own genderRule overrides the origin-driven era curve when
   present (per-trade rules are more specific — e.g. sailor 99% male even in
   an era/origin with a more even overall ratio). */
function isMaleForOccupation(occ, fallbackFrac, rng){
  if(occ && occ.genderRule && typeof occ.genderRule.m === "number") return rng() < occ.genderRule.m;
  return rng() < fallbackFrac;
}
/* behavior-spec.md §1: two traits per person, from independent axes, skew
   activity weights (evening venue choice, drunkenness) rather than scripts. */
var TRAIT_AXES = [ ["temperate","heavy-drinker"], ["industrious","idler"], ["pious","indifferent"], ["gregarious","solitary"], ["restless","settled"] ];
function rollTraits(rng){
  var t = {};
  TRAIT_AXES.forEach(function(axis){ t[axis[0]+":"+axis[1]] = axis[rng()<0.5?0:1]; });
  return { drink: t["temperate:heavy-drinker"], work: t["industrious:idler"], faith: t["pious:indifferent"], social: t["gregarious:solitary"], temperament: t["restless:settled"] };
}

/* @P1850-CHUNK 30 — POP_CURVE/populationAt + DENSITY_CURVE/densityAt */
/* =========================================================================
   4. VILLAGE GROWTH — population curve (demographics-society.md) drives
   how many additional buildings (1846-48) and then tents (1849's explosion,
   spreading over Happy Valley + the hillsides rather than orderly houses)
   are revealed over time, each with a week-long "raising" scale-in.
   ========================================================================= */
var POP_CURVE = [
  { d:"1846-07-01", p:200 },
  { d:"1846-08-05", p:420 },   // the Brooklyn's ~230 landed July 31, "more than doubling" the town
  { d:"1847-01-26", p:500 },
  { d:"1847-08-28", p:459 },   // the best-documented early count (California Star + Annals)
  { d:"1848-04-30", p:850 },   // school trustees' count
  { d:"1848-06-15", p:650 },   // gold-rush exodus: "like a place where the plague reigns"
  { d:"1848-08-15", p:600 },
  { d:"1848-12-31", p:2000 },
  { d:"1849-06-30", p:5000 },  // GAPS-2026-07-10 P0 fix: was 11000 (120% overshoot). timeline-spine.md
                                // clm:timeline:42, hard confidence: "Population ~5,000 (from ~2,000 in
                                // January); ~15,000 added to the district in the first half-year" —
                                // this is the ONLY node changed. The 11000 figure conflated visible-
                                // structure/crowd density with actual population count (see DENSITY_CURVE
                                // below, which now carries the old density-fix-tuned numbers so Sept 1849
                                // building/tent/crowd density does not regress from this correction).
  { d:"1849-12-31", p:25000 }  // the Annals' own estimate, "nearer twenty-five thousand souls"
].map(function(k){ return { day: eventDateToSimDay(k.d), pop:k.p }; });
function populationAt(day){
  if(day<=POP_CURVE[0].day) return POP_CURVE[0].pop;
  for(var i=1;i<POP_CURVE.length;i++){
    if(day<=POP_CURVE[i].day){
      var a=POP_CURVE[i-1], b=POP_CURVE[i];
      return lerp(a.pop, b.pop, (day-a.day)/(b.day-a.day));
    }
  }
  return POP_CURVE[POP_CURVE.length-1].pop;
}
// DENSITY_CURVE (GAPS-2026-07-10 P0 fix, decoupling pass): drives visible
// structure/crowd DENSITY (growth buildings, tents, waterfront boats/cargo,
// ambient walker count) — NOT the documented population figure, which now
// lives in POP_CURVE/populationAt() above for display/narrative use only.
// Round-2 reconciliation found the Sept-1849-density P0 fix (commit 0e3ed3f)
// had conflated the two: it pushed the 1849-06-30 POP_CURVE node to 11000 to
// force enough visible structures, when the documented population for that
// date is ~5,000 (timeline-spine.md clm:timeline:42). Rather than re-derive
// and re-tune the whole growthTargets()/peopleTargetCount()/waterfrontTargets()
// formula set against a fresh building-count curve (50/79/157/200 documented,
// ~500-600/~700-750 interpolated for Sept/Dec 1849 per the growthTargets()
// comment below), this curve simply keeps the OLD, already screening-verified
// pop numbers (identical to pre-fix POP_CURVE) so every density system's
// output is bit-for-bit unchanged. Only populationAt() moved; densityAt() did
// not, so nothing that reads density regresses.
var DENSITY_CURVE = [
  { d:"1846-07-01", p:200 },
  { d:"1846-08-05", p:420 },
  { d:"1847-01-26", p:500 },
  { d:"1847-08-28", p:459 },
  { d:"1848-04-30", p:850 },
  { d:"1848-06-15", p:650 },
  { d:"1848-08-15", p:600 },
  { d:"1848-12-31", p:2000 },
  { d:"1849-06-30", p:11000 }, // kept at the pre-fix, screening-verified density value on purpose
  { d:"1849-12-31", p:25000 }
].map(function(k){ return { day: eventDateToSimDay(k.d), pop:k.p }; });
function densityAt(day){
  if(day<=DENSITY_CURVE[0].day) return DENSITY_CURVE[0].pop;
  for(var i=1;i<DENSITY_CURVE.length;i++){
    if(day<=DENSITY_CURVE[i].day){
      var a=DENSITY_CURVE[i-1], b=DENSITY_CURVE[i];
      return lerp(a.pop, b.pop, (day-a.day)/(b.day-a.day));
    }
  }
  return DENSITY_CURVE[DENSITY_CURVE.length-1].pop;
}
/* densityAt's inverse: first sim day the density curve reaches popTarget.
   Consumed by buildings' deterministic reveal days (dayForTentIndex /
   dayForBuildingIndex, the P0-1 time-jump fix) and people's tent-home
   reveal days. (Relocated verbatim from fauna.js in the 2026-07-12
   cleanup — this is core/sim's curve, so its inverter lives here.) */
function dayForDensityAtLeast(popTarget){
  for(var i=0;i<DENSITY_CURVE.length;i++){
    if(DENSITY_CURVE[i].pop>=popTarget){
      if(i===0) return DENSITY_CURVE[0].day;
      var a=DENSITY_CURVE[i-1], b=DENSITY_CURVE[i];
      return lerp(a.day, b.day, clamp((popTarget-a.pop)/(b.pop-a.pop),0,1));
    }
  }
  return DENSITY_CURVE[DENSITY_CURVE.length-1].day;
}
