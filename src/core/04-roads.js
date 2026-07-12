/* =====================================================================
   core/04-roads — road lifecycle engine (grounding.md §9b). Shared interface owner: roadPieceState
   (the spec's roadStateAt) — consumed by ground-paint, routing, and the audits.
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 08 — road lifecycle engine (roadPieceState — shared interface) */
/* =====================================================================
   ROAD LIFECYCLE ENGINE — grounding.md §9b (s27 sprint, 2026-07-11).
   Roads are not booleans; they EMERGE. Every street piece carries a
   lifecycle state per date, computed DETERMINISTICALLY from data — a
   pure function of simDay, so any rewind/date-jump lands on the exact
   same state (counter-based, never runtime-accumulated):
     S0 NONE       before survey and before use
     S1 GHOST      surveyor's line on paper (faintest darker ghost)
     S2 TRAIL      desire path worn by actual use — narrow, meandering
                   off the platted centerline within the right-of-way
     S3 DEVELOPING widened worn track pulled toward the plat, ruts
     S4 DEFINED    full survey width, straightened, graded
   Transition drivers, in data:
     - survey dates (streets-geometry.js appears.surveyedDay) -> S1
     - ACCUMULATED ROUTED USE -> S2/S3/S4: the closed-form counter
       U(piece, D) = sum_i w_i * [PS(D) - PS(reveal_i)]      (frontage)
                   + sum_pair traf_w * [PS(D) - PS(gate_pair)] (traffic)
       where PS is the prefix integral of a population-activity scale
       (densityAt clamped), frontage contributors are the growth system's
       own DETERMINISTIC candidate reveal days (buildings AND tents —
       dayForBuildingIndex/dayForTentIndex, the same backdating math the
       P0-1 time-jump fix trusts), and traffic corridors are the actual
       STREET_GRAPH Dijkstra routes between the sim's real hubs (plaza,
       the Clay St landing, Mission Dolores, the tent camps) weighted by
       the same activity scale. Footsteps-as-input, in closed form.
     - documented grading/planking dates (research/infrastructure.md §3)
       force S4 — encoded below; all are spring-1850+ (outside the current
       Dec-1849 sim end) but carried for timeline completeness.
   Documented caps (checkpoint-law exceptions, cited): Market stayed an
   ungraded sand ridge through the whole window -> S1 cap; only the
   numbered streets nearest Happy Valley (First/Second) became ways in
   window, Third/Fourth partially, the higher numbers stayed paper.
   Downgrades (abandoned trails fading) are allowed by §9b but no
   in-window case exists; the counter is monotonic here by construction.
   Every threshold below is a tunable, fill:true.
   ===================================================================== */
var ROAD_USE_T2 = 120, ROAD_USE_T3 = 900, ROAD_USE_T4 = 1900; // effective fully-fronted use-days
var ROAD_USE_START_DAY = -1500;  // village-era accumulation floor (~mid-1842; Vioget's 1839 lanes had years of light use by 1846)
var ROAD_FRONT_R_BLDG = 70, ROAD_FRONT_R_TENT = 110, ROAD_FRONT_FULL = 6, ROAD_FRONT_WMAX = 12;
var ROAD_TRAF_K = 0.55;
var ROAD_STATE_CAPS = {
  // Market: O'Farrell's 120-ft showpiece stayed a PAPER street — an
  // ungraded sand ridge crossed its right-of-way until grading in the
  // early 1850s, after this sim's Dec-1849 end (user/coordinator ruling
  // 2026-07-11; road-master-spec test case: S1 ghost all window).
  "market": 1,
  // Numbered streets: only First/Second (uncapped — the Happy Valley camp
  // drives their wear honestly) became worn ways in-window; Third/Fourth
  // at most trails, Fifth+ stayed paper lines through the dunes.
  "numbered-streets-first-eighth:Third": 2,
  "numbered-streets-first-eighth:Fourth": 2,
  "numbered-streets-first-eighth:Fifth": 1,
  "numbered-streets-first-eighth:Sixth": 1,
  "numbered-streets-first-eighth:Seventh": 1,
  "numbered-streets-first-eighth:Eighth": 1
};
var _roadLife = null;
function roadLifeInit(){
  if(_roadLife) return _roadLife;
  // PS: prefix integral of the population-activity scale. densityAt() is
  // the sim's own documented density curve; /900 normalizes so the 1848
  // town ~= 1 "unit town", clamped [0.22, 3] so the village era still
  // wears its lanes and the 1849 flood saturates rather than exploding.
  var T0 = -1600, T1 = Math.ceil(SIM_END_DAY)+420, STEPP = 5;
  var psArr = [0], acc = 0;
  for(var d=T0; d<T1; d+=STEPP){ acc += clamp(densityAt(d)/900, 0.22, 3.0)*STEPP; psArr.push(acc); }
  function PS(day){
    var f = (clamp(day, T0, T1)-T0)/STEPP;
    var i = Math.min(Math.floor(f), psArr.length-2);
    return lerp(psArr[i], psArr[i+1], f-i);
  }
  // Frontage contributors with deterministic reveal days.
  var contribs = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(b){ contribs.push({x:b.x, z:b.z, tent:false, r:ROAD_USE_START_DAY}); });
  growthBuildingCandidates.forEach(function(c,i){ contribs.push({x:c.x, z:c.z, tent:false, r:dayForBuildingIndex(i)}); });
  tentCandidates.forEach(function(c,i){ contribs.push({x:c.x, z:c.z, tent:true, r:dayForTentIndex(i)}); });
  // Routed-traffic corridors: Dijkstra over the sim's own walker graph
  // between its real hubs, weighted; camp pairs gate on the camps' arrival.
  // s59 HONESTY: corridors now use the SAME road-lifecycle-weighted router
  // people route with (graphPathWeighted), so §9b's closed-form traffic
  // accrues to the segments people actually walk. _roadLife is assigned
  // BEFORE the pairs are routed: during corridor routing the traf term is
  // still empty, so edge states evaluate frontage-only (breaks the
  // corridors->state->corridors cycle deterministically); the piece cache
  // primed with empty-traf data is cleared right after.
  var hvDay = HAPPY_VALLEY_REVEAL_DAY;
  var corridorEdges = [];
  var docS4 = {
    "kearny":     eventDateToSimDay("1850-04-01"),
    "montgomery": eventDateToSimDay("1850-04-01"),
    "washington": eventDateToSimDay("1850-04-01"),
    "clay":       eventDateToSimDay("1850-04-01")
  };
  _roadLife = { PS:PS, contribs:contribs, corridorEdges:corridorEdges, docS4:docS4, pieceCache:{} };
  function addPair(aKey, bKey, w, fromDay){
    var ai = STREET_GRAPH.idx[aKey], bi = STREET_GRAPH.idx[bKey];
    if(ai==null || bi==null) return;
    var p = graphPathWeighted(ai, bi, Math.max(fromDay, 0), -1, true);
    if(!p) return;
    for(var i=0;i<p.length-1;i++){
      var A = STREET_GRAPH.nodes[p[i]], B = STREET_GRAPH.nodes[p[i+1]];
      corridorEdges.push({ ax:A.x, az:A.z, bx:B.x, bz:B.z, w:w, from:fromDay });
    }
  }
  addPair("plaza", "wharf", 1.0, ROAD_USE_START_DAY);   // the working shore was the artery from the start
  addPair("plaza", "mission", 0.30, ROAD_USE_START_DAY);
  addPair("plaza", "camp_happyvalley", 0.45, hvDay);
  addPair("wharf", "camp_happyvalley", 0.35, hvDay);
  addPair("plaza", "camp_edge", 0.22, hvDay);
  addPair("plaza", "camp_western", 0.22, hvDay);
  // (docS4 — the documented S4 forcers, research/infrastructure.md §3, all
  // outside the current Dec-31-1849 window — moved up with the _roadLife
  // assignment above so corridor routing can see it.)
  _roadLife.pieceCache = {}; // s59: drop entries primed during corridor routing (frontage-only traf)
  return _roadLife;
}
function _distPtSeg2(px,pz, ax,az, bx,bz){
  var dx=bx-ax, dz=bz-az, l2=dx*dx+dz*dz;
  var t = l2>0 ? clamp(((px-ax)*dx+(pz-az)*dz)/l2, 0, 1) : 0;
  var qx=ax+dx*t-px, qz=az+dz*t-pz;
  return qx*qx+qz*qz;
}
/* Per-piece static data (frontage contributor list + corridor weights),
   cached by quantized midpoint — piece midpoints are deterministic, so
   the cache is stable across repaints. */
function roadPieceData(x,z){
  var RL = roadLifeInit();
  var key = Math.round(x/6)+","+Math.round(z/6);
  var pd = RL.pieceCache[key];
  if(pd) return pd;
  pd = { f:[], traf:[] };
  var i, c, dx, dz, d2;
  for(i=0;i<RL.contribs.length;i++){
    c = RL.contribs[i];
    var R = c.tent ? ROAD_FRONT_R_TENT : ROAD_FRONT_R_BLDG;
    dx = c.x-x; dz = c.z-z; d2 = dx*dx+dz*dz;
    if(d2 <= R*R){
      var w = (1-Math.sqrt(d2)/R) * (c.tent ? 0.7 : 1.4);
      pd.f.push({ r:c.r, w:w });
    }
  }
  pd.f.sort(function(a,b){ return a.r-b.r; });
  var trafByFrom = {};
  for(i=0;i<RL.corridorEdges.length;i++){
    var e = RL.corridorEdges[i];
    if(_distPtSeg2(x,z, e.ax,e.az, e.bx,e.bz) <= 14*14){
      trafByFrom[e.from] = (trafByFrom[e.from]||0) + e.w;
    }
  }
  Object.keys(trafByFrom).forEach(function(k){ pd.traf.push({ from:+k, w:Math.min(trafByFrom[k], 1.8) }); });
  RL.pieceCache[key] = pd;
  return pd;
}
/* Accumulated use counter U(piece, day) — pure function of day. */
function roadPieceUse(x,z,day){
  var RL = roadLifeInit();
  var pd = roadPieceData(x,z);
  var U = 0, wSum = 0, i;
  var psNow = RL.PS(day);
  for(i=0;i<pd.f.length;i++){
    var f = pd.f[i];
    if(f.r >= day) break; // sorted by reveal day
    var wEff = Math.min(f.w, ROAD_FRONT_WMAX - wSum);
    if(wEff<=0) break;
    wSum += wEff;
    U += (wEff/ROAD_FRONT_FULL) * (psNow - RL.PS(Math.max(f.r, ROAD_USE_START_DAY)));
  }
  for(i=0;i<pd.traf.length;i++){
    var t = pd.traf[i];
    if(day > t.from) U += ROAD_TRAF_K * t.w * (psNow - RL.PS(t.from));
  }
  return U;
}
/* Lifecycle state for one street piece at one date. `viogetFloor` marks
   pieces inside the street's ORIGINAL Vioget-1839 extent (surveyedDay<=0):
   Vioget formalized lanes the village had already worn in — they read as
   trails (S2) from sim start, never paper lines. */
function roadStateFromUse(s, U, day, viogetFloor){
  var st = U>=ROAD_USE_T4 ? 4 : U>=ROAD_USE_T3 ? 3 : U>=ROAD_USE_T2 ? 2 : 1;
  // A corpus first-mention is documented use evidence — floors the street
  // at TRAIL once the mention ramp completes (never straight to S3+:
  // real widening needs real frontage/traffic).
  if(st<2 && s.firstMentionDay!=null && day >= s.firstMentionDay + WEAR_MENTION_RAMP*0.5) st = 2;
  if(viogetFloor && st<2) st = 2;
  // an unplatted (corpus-only) lane can never straighten to a plat that
  // does not exist — trails may precede or ignore plats (§9b), but S4
  // means "straightened to the plat".
  if(s.surveyedDay==null && st>3) st = 3;
  var cap = ROAD_STATE_CAPS[s.id];
  if(cap!=null && st>cap) st = cap;
  var doc = roadLifeInit().docS4[s.id];
  if(doc!=null && day>=doc) st = 4;
  return st;
}
function roadPieceState(s, x, z, day, viogetFloor){
  var gateDay = s.surveyedDay!=null ? s.surveyedDay : s.firstMentionDay;
  if(gateDay==null || day<gateDay) return { st:0, use:0 };
  var U = roadPieceUse(x,z,day);
  return { st: roadStateFromUse(s, U, day, viogetFloor), use: U };
}

