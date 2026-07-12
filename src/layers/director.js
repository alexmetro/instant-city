/* =====================================================================
   LAYER director (slot 12) — OWNS watch mode, interest pool, beat cards. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 2 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 55 — auto-director + watch mode */
/* =========================================================================
   PHASE 5 — AUTO-DIRECTOR + WATCH MODE (V)
   Event bus with spine priorities (fire 10, Brannan 9, a paper's first
   issue 7, ship arrival 4 first-of-month-only, month-change idle 2);
   shot grammar = eased fly-to (the existing spring rig), wide establishing
   then push-in, hold 8-18s; per-class cooldowns; parchment lower-third
   quoting the actual headline with date + receipt. Manual input suspends
   the director for 30s. Watch mode hides all HUD but date/beat-card/ticker.
   ========================================================================= */
var WATCH = { on:false };
var DIRECTOR = { suspendUntil:0, beat:null, beatStart:0, cursor:0, pending:[], cooldownUntil:{}, lastMonthKey:"",
  // s44 DIRECTOR V2 state: autoSlot = the person the DIRECTOR is following
  // (manual follows outrank; they're distinguished by not being autoSlot),
  // savedSpeed = timelapse tier to restore after a follow forced 2x,
  // nextPickAt/idleSince pace the cuts between beats.
  autoSlot:null, savedSpeed:null, nextPickAt:0, idleSince:0 };
var CLS_META = {
  fire:  { kicker:"THE FIRST GREAT FIRE",  hold:26, cooldown:5,  stale:1.2 },
  minorfire:{ kicker:"FIRE",               hold:10, cooldown:30, stale:3 },
  moment:{ kicker:"A DOCUMENTED MOMENT",   hold:16, cooldown:20, stale:4 },
  paper: { kicker:"THE PRESS",             hold:12, cooldown:30, stale:10 },
  ship:  { kicker:"SHIP ARRIVAL",          hold:9,  cooldown:20, stale:5 },
  month: { kicker:"THE TOWN",              hold:8,  cooldown:40, stale:8 },
  // s44 interest-pool classes (holds are per-beat; these are fallbacks)
  follow:{ kicker:"FOLLOWING",             hold:30, cooldown:6,  stale:0 },
  ashore:{ kicker:"JUST ASHORE",           hold:18, cooldown:90, stale:0 },
  site:  { kicker:"THE TOWN",              hold:16, cooldown:35, stale:0 }
};
var DIRECTOR_BEATS = (function(){
  var beats = [];
  // 1. fires from the spine (the Dec 24 1849 Great Fire holds through its whole burn)
  EVENTS_RAW.forEach(function(e){
    if(e.class!=="fire") return;
    if(e.date==="1849-12-24"){
      beats.push({ simDay:FIRE.day0-0.02, cls:"fire", pri:10, x:FIRE.cx, z:FIRE.cz, alt:250,
        holdUntilDay:FIRE.day1+1.2/24, headline:"APPALLING AND DESTRUCTIVE CONFLAGRATION!! — Loss of property exceeding $1,000,000!!",
        dateISO:e.date, receipt:"https://cdnc.ucr.edu/?a=d&d=DAC18491226.1.2" });
    } else {
      beats.push({ simDay:e.simDay, cls:"minorfire", pri:6, x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:420,
        headline:e.headline, dateISO:e.date, receipt:(e.prov&&e.prov.url)||null });
    }
  });
  // 2. Brannan (9) + Leidesdorff (6) documented moments
  DOCUMENTED_MOMENTS.forEach(function(doc){
    beats.push({ simDay:doc.startDay+0.35, cls:"moment", pri:(doc.key==="brannan"?9:6),
      x:doc.x, z:doc.z, alt:120, headline:doc.chip, dateISO:simDateISO(dateFromSimDay(doc.startDay)),
      receipt:doc.receiptUrl||null });
  });
  // 2b. GAPS-2026-07-09 item 3 — 1849 bible-tier events promoted to map
  // moments: the Hounds' attack on Little Chile (documentary distance per
  // spec §15 — no gore, just the beat card + the district), the SFPD's
  // Aug 13 1849 founding under Malachi Fallon, and the Euphemia's Oct 1849
  // jail-ship purchase (she's already rendered as a storeship — see
  // STORESHIP_INFO/openShipInspector — this just gives her purchase its
  // own director beat too).
  var LITTLE_CHILE_ZONE = DISTRICT_ZONES.filter(function(z){ return z.name==="LITTLE CHILE"; })[0];
  EVENTS_RAW.forEach(function(e){
    // s50 NATIVE PRESENCE: Montgomery's Sept 15 1846 Indian-labor
    // proclamation (the priority-8 bible spine record) — a documented
    // moment at the plaza/headquarters, quoted verbatim in the record's
    // own words, receipt to the Star's republication (CS18470306.1.4).
    if(e.date==="1846-09-15" && e.type==="proclamation" && (e.priority||0)>=8){
      beats.push({ simDay:e.simDay+0.3, cls:"moment", pri:7, x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:220,
        headline:e.headline, dateISO:e.date, receipt:(e.prov&&e.prov.url)||null });
    }
    if(e.date==="1849-07-15" && /Hounds attack Little Chile/i.test(e.headline||"")){
      beats.push({ simDay:e.simDay+0.25, cls:"moment", pri:8,
        x:(LITTLE_CHILE_ZONE?LITTLE_CHILE_ZONE.cx:PLAZA_CENTER.x), z:(LITTLE_CHILE_ZONE?LITTLE_CHILE_ZONE.cz:PLAZA_CENTER.z), alt:180,
        headline:e.headline, dateISO:e.date, receipt:(e.prov&&e.prov.url)||null });
    }
    if(e.date==="1849-07-16" && /Mass meeting at Portsmouth Square/i.test(e.headline||"")){
      beats.push({ simDay:e.simDay+0.3, cls:"moment", pri:7, x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:220,
        headline:"Citizens' posse enrolls at Portsmouth Square, the morning after the Hounds' raid", dateISO:e.date, receipt:(e.prov&&e.prov.url)||null });
    }
    if(e.date==="1849-08-13" && /Fallon/i.test(e.headline||"")){
      beats.push({ simDay:e.simDay+0.3, cls:"moment", pri:7, x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:220,
        headline:e.headline, dateISO:e.date, receipt:(e.prov&&e.prov.url)||null });
    }
    if(e.date==="1849-10-08" && /Euphemia/i.test(e.headline||"")){
      var eup = STORESHIP_INFO["Euphemia"];
      beats.push({ simDay:e.simDay+0.3, cls:"moment", pri:6,
        x:(eup?eup.pos.x:PLAZA_CENTER.x), z:(eup?eup.pos.z:PLAZA_CENTER.z), alt:180,
        headline:e.headline, dateISO:e.date, receipt:(e.prov&&e.prov.url)||null });
    }
  });
  // 3a. newspaper launches from the spine (e.g. "Alta California newspaper
  // to launch", Jan 4 1849 — its extracted issues begin Dec 1849, so the
  // masthead scan below wouldn't surface the launch itself)
  EVENTS_RAW.forEach(function(e){
    if(e.type!=="business_open" || !/newspaper/i.test(e.headline||"")) return;
    beats.push({ simDay:e.simDay+0.4, cls:"paper", pri:7, x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:480,
      headline:e.headline, dateISO:e.date, receipt:null });
  });
  // 3b. first issue of each paper (masthead first-appearance in the real issue list)
  var seenMast = {};
  FEED_DATES.forEach(function(dk){
    var issue = FEED_BY_DATE[dk];
    if(seenMast[issue.masthead]) return;
    seenMast[issue.masthead] = true;
    var first = issue.items[0];
    beats.push({ simDay:eventDateToSimDay(dk)+0.4, cls:"paper", pri:7, x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:480,
      headline:"First issue: "+(MASTHEAD_NAME[issue.masthead]||issue.masthead),
      dateISO:dk, receipt:(first&&first.prov&&first.prov.src)?issueUrl(first.prov.src):null });
  });
  // 4. ship arrivals — first documented arrival of each month only
  var monthSeen = {};
  shipVisits.slice().sort(function(a,b){ return (a.arrive==null?1e9:a.arrive)-(b.arrive==null?1e9:b.arrive); })
    .forEach(function(v){
      // arrive is a fill-inferred estimate (buildShipVisits' coverage-gap
      // fix), not a documented date — never assert it as a headline beat.
      if(v.arrive==null || v.arriveInferred) return;
      var mk = simDateISO(dateFromSimDay(v.arrive)).slice(0,7);
      if(monthSeen[mk]) return;
      monthSeen[mk] = true;
      beats.push({ simDay:v.arrive+0.3, cls:"ship", pri:4, visit:v, alt:260,
        headline:"Arrived: the "+v.ship, dateISO:simDateISO(dateFromSimDay(v.arrive)), receipt:null });
    });
  beats.sort(function(a,b){ return a.simDay-b.simDay; });
  return beats;
})();

/* @P1850-CHUNK 57 — interest system (Director V2) */
/* =========================================================================
   s44 — THE INTEREST SYSTEM (Director V2). A scored pool of candidate
   beats, refreshed as the sim runs:
     (a) PERSON-FOLLOW beats (the headline): roster people near their
         documented mention dates, participants of high-icon events
         (behavior-spec §6 salience), evening saloon-goers, the vaquero with
         the herd, mud-winter walkers — followed at LIVE/2x, shoulder
         distance, inspect panel showing who they are (facts only).
     (b) EVENT beats: the existing DIRECTOR_BEATS spine (fires, documented
         moments, press, arrivals), icon-scored, unchanged.
     (c) SITE beats: a curated gallery of proven framings, era-weighted.
   Scoring mixes salience, recency (near a documented date), novelty
   (per-person/per-site cooldowns + per-hour spend pressure), and
   era-appropriateness (availability gates). Beats CUT together (quick
   fade); when nothing scores, the director jump-cuts the sim clock forward
   to the next interesting hour instead of orbiting an empty frame.
   ========================================================================= */
var INTEREST = { slotCool:{}, siteCool:{}, typeCool:{}, nameCool:{}, hourSpent:{}, log:[] };
var directorFadeEl = document.getElementById("director-fade");
var _cutBusy = false;
function directorCut(apply){
  if(_cutBusy){ apply(); return; }
  _cutBusy = true;
  directorFadeEl.classList.add("on");
  setTimeout(function(){
    apply();
    // compose the new shot behind the fade: snap the rig to its targets
    CAM.t = CAM.tT; CAM.yaw = CAM.yawT; CAM.pitchOff = CAM.pitchOffT; CAM.focus.copy(CAM.focusT);
    setTimeout(function(){ directorFadeEl.classList.remove("on"); _cutBusy = false; }, 80);
  }, 280);
}
/* curated site gallery — proven framings, all factual place descriptions
   (voice rule: state what/where, never editorialize) */
var SITE_GALLERY = [
  { key:"wharf_work", kicker:"THE WHARF", label:"Central Wharf at work",
    hours:[7.5,17.5], from:eventDateToSimDay("1849-05-20"), alt:170, drift:0.022,
    pos:function(){ return { x:WORKSITE_WHARF.x, z:WORKSITE_WHARF.z }; } },
  { key:"plaza_noon", kicker:"THE PLAZA", label:"Portsmouth Square at midday",
    hours:[11,13.8], from:0, alt:150, drift:0.02,
    pos:function(){ return PLAZA_CENTER; } },
  { key:"mast_forest", kicker:"THE ANCHORAGE", label:"The anchored fleet off the cove at first light",
    hours:[5.2,8.6], from:0, alt:380, drift:0.016,
    avail:function(){ var a=anchoredShipCentroid(); return !!(a && a.count>=12); },
    pos:function(){ var a=anchoredShipCentroid(); return a ? { x:a.x, z:a.z } : null; } },
  { key:"mud_crossing", kicker:"WINTER MUD", label:"Crossing the mud at Portsmouth Square",
    hours:[7,17.9], from:0, alt:95, drift:0.028,
    avail:function(){ return weatherState.mud>0.45; },
    pos:function(){ return { x:PLAZA_CENTER.x+26, z:PLAZA_CENTER.z+18 }; } },
  { key:"mission_pasture", kicker:"THE MISSION", label:"Cattle on the Mission grazing grounds",
    hours:[8,17.5], from:0, alt:240, drift:0.018,
    pos:function(){ return { x:PASTURE_MISSION.x, z:PASTURE_MISSION.z }; } },
  { key:"tents_dusk", kicker:"HAPPY VALLEY", label:"The tent camp toward dusk",
    hours:[16.5,20.3], from:HAPPY_VALLEY_REVEAL_DAY+20, alt:230, drift:0.02,
    pos:function(){ return { x:900, z:950 }; } }
];
function personCandidates(now, day, h, out){
  if(provenanceOnly) return; // documented-only mode hides the simulated cast — no person-follows
  if(h<6.2 || h>=21.5) return; // deep-night streets are legitimately near-empty
  // surnames of actors named in high-icon events within a day (behavior-spec
  // §6 salience) — participants of those events score up
  var actorHits = {};
  for(var ei=0; ei<EVENTS_RAW.length; ei++){
    var ev = EVENTS_RAW[ei];
    if((ev.priority||0)<6 || !ev.actors || Math.abs(day-ev.simDay)>0.8) continue;
    for(var ai=0; ai<ev.actors.length; ai++){
      var parts = String(ev.actors[ai]).toUpperCase().replace(/[.]/g,"").split(/\s+/);
      var last = parts[parts.length-1];
      if(last && last.length>3) actorHits[last] = true;
    }
  }
  var mudSeason = weatherState.mud>0.45;
  // outdoor veto for stationary candidates: a figure standing inside a
  // building footprint (indoor work is rendered at the building's spot)
  // cannot be followed readably — the camera would hold on a roof.
  function standsInBuilding(x,z){
    for(var bi=0;bi<VILLAGE_BUILDING_SPOTS.length;bi++){
      var sp = VILLAGE_BUILDING_SPOTS[bi];
      if(sp.foundedDay!=null && day<sp.foundedDay) continue;
      if(Math.abs(x-sp.x)<sp.w*0.62+0.6 && Math.abs(z-sp.z)<sp.d*0.62+0.6) return true;
    }
    return false;
  }
  for(var i=0;i<ALL_PEOPLE_SLOTS.length;i++){
    var s = ALL_PEOPLE_SLOTS[i];
    if(day<s.notBeforeDay || (s.notAfterDay!=null && day>s.notAfterDay)) continue;
    if((INTEREST.slotCool[s.id]||0) > now) continue; // novelty: don't re-follow
    // schedule-true status right now (same pure function of simDay the
    // renderer runs; updatePeople recomputes every frame afterwards)
    if(s.kind==="routine") computeRoutinePosition(s, day); else computeExtraPosition(s, day);
    var nowStr = s._now||"";
    if(/^asleep/.test(nowStr) || s._pose==="sleep") continue;
    if(s._pose!=="walk"){
      if(/Mission Dolores|Presidio/.test(nowStr)) continue;     // landmark-interior worksites
      if(standsInBuilding(s._x, s._z)) continue;                // under a roof — unwatchable
    }
    var sc = 0;
    if(s.roster){
      sc += 1.0 + Math.min(1.6, Math.log(1+(s.roster.mentions||1))*0.30); // salience: attestation
      if(s._rFirstDay===undefined) s._rFirstDay = s.roster.first ? eventDateToSimDay(s.roster.first) : null;
      if(s._rLastDay===undefined)  s._rLastDay  = s.roster.last  ? eventDateToSimDay(s.roster.last)  : null;
      if(s._rFirstDay!=null && Math.abs(day-s._rFirstDay)<8) sc += 2.2;      // recency: near their documented moment
      else if(s._rLastDay!=null && Math.abs(day-s._rLastDay)<8) sc += 1.6;
      var surname = s.roster.name.toUpperCase().replace(/[.]/g,"").split(/\s+/).pop();
      if(surname && surname.length>3 && actorHits[surname]) sc += 2.6;       // named in a high-icon event today
    }
    if(s.occ && s.occ.id==="vaquero_herder" && h>=7.5 && h<18 && /at work/.test(nowStr)) sc += 2.4; // with the herd
    if(h>=18.7 && /of an evening|stumbling/.test(nowStr)) sc += 2.0;          // evening saloon-goers
    if(s._pose==="walk") sc += 0.9;                                           // en route = something to follow
    if(mudSeason && s._pose==="walk") sc += 0.9;                              // mud-winter crossings
    if(/^at home/.test(nowStr)) sc -= 2.2;
    if(s.occ && (INTEREST.typeCool[s.occ.id]||0) > now) sc -= 2.4;            // novelty: vary the trades followed
    if(s.roster && (INTEREST.nameCool[s.roster.name]||0) > now) sc -= 6;      // novelty: never re-follow a name (dup roster entries)
    sc += ((s.id*37)%97)/97*0.5; // deterministic variety jitter
    if(sc < 1.5) continue;
    out.push({ kind:"person", score:sc, slot:s });
  }
}
function ashoreCandidates(now, day, out){
  if((INTEREST.siteCool["ashore"]||0) > now) return;
  for(var i=0;i<shipVisits.length;i++){
    var v = shipVisits[i];
    if(v.arrive==null || v.arriveInferred || !v._anchorPos) continue; // documented arrivals only
    var age = day - v.arrive;
    if(age<0.05 || age>ARRIVAL_WINDOW_DAYS*0.95) continue;
    out.push({ kind:"group", score:3.0, visit:v });
    return; // one is plenty
  }
}
function siteCandidates(now, day, h, out){
  for(var i=0;i<SITE_GALLERY.length;i++){
    var g = SITE_GALLERY[i];
    if(day < g.from) continue;
    if(h < g.hours[0] || h >= g.hours[1]) continue;
    if((INTEREST.siteCool[g.key]||0) > now) continue; // novelty: no repeats
    if(g.avail && !g.avail()) continue;               // era/condition gate
    var p = g.pos(); if(!p) continue;
    out.push({ kind:"site", score:1.7 + ((i*29)%13)/13*0.4, gallery:g, x:p.x, z:p.z });
  }
}
function makePersonBeat(c){
  var s = c.slot;
  var bio = generateBio(s);
  // walkers earn the long holds (their errand is the show); a stationary
  // figure holds shorter so pacing stays varied
  var hold = clamp(22 + c.score*6, 20, 60);
  if(s._pose!=="walk") hold = Math.min(hold, 32);
  return { kind:"person", cls:"follow", pri:5, slot:s,
    hold: hold,
    kicker: bio.role ? "FOLLOWING — FROM THE RECORD" : "FOLLOWING",
    headline: bio.name + " — " + bio.trade,
    dateISO: simDateISO(dateFromSimDay(simDay)),
    alt: 40 + (s.id%5)*5 };
}
function makeGroupBeat(c){
  var v = c.visit;
  return { kind:"group", cls:"ashore", pri:6, visit:v,
    hold: 18,
    kicker: "JUST ASHORE",
    headline: "Ashore from the "+v.ship,
    dateISO: simDateISO(dateFromSimDay(simDay)),
    alt: 120,
    pos: function(){
      var age = simDay - v.arrive;
      if(age<0 || age>ARRIVAL_WINDOW_DAYS || !v._anchorPos) return null;
      var rowT = clamp(age/(ARRIVAL_WINDOW_DAYS*ARRIVAL_ROW_FRAC), 0, 1);
      if(rowT<1) return { x:lerp(v._anchorPos.x,WORKSITE_WHARF.x,rowT), z:lerp(v._anchorPos.z,WORKSITE_WHARF.z,rowT) };
      var cache = _arrivalCache[v.ship+"_"+v.arrive];
      if(!cache) return { x:WORKSITE_WHARF.x, z:WORKSITE_WHARF.z };
      var walkT = clamp((age-(ARRIVAL_WINDOW_DAYS*ARRIVAL_ROW_FRAC))/(ARRIVAL_WINDOW_DAYS*(1-ARRIVAL_ROW_FRAC)), 0, 1);
      var pt = pointOnPolyline(cache.poly, walkT*cache.poly.total);
      return { x:pt.x, z:pt.z };
    } };
}
function makeSiteBeat(c){
  var g = c.gallery;
  return { kind:"site", cls:"site", pri:3, siteKey:g.key,
    hold: 13 + ((g.key.length*7)%7),
    kicker: g.kicker, headline: g.label,
    dateISO: simDateISO(dateFromSimDay(simDay)),
    x: c.x, z: c.z, alt: g.alt, drift: g.drift };
}
function pickInterestBeat(now){
  var day = simDay, h = (day-Math.floor(day))*24;
  var hourKey = Math.floor(day*24);
  var spent = INTEREST.hourSpent[hourKey]||0;
  var cands = [];
  personCandidates(now, day, h, cands);
  ashoreCandidates(now, day, cands);
  siteCandidates(now, day, h, cands);
  // pacing: after two person-follows in a row, lean toward a site/arrival
  // beat so the session alternates registers (a strong documented-moment
  // person can still outbid the lean).
  var run = INTEREST.runPerson||0;
  var best = null;
  for(var i=0;i<cands.length;i++){
    var c = cands[i];
    var eff = c.score + (c.kind==="person" ? (run>=2 ? -2.2 : 0) : Math.min(1.2, run*0.5));
    c._eff = eff;
    if(!best || eff>best._eff) best = c;
  }
  if(!best || best._eff < 1.5 + 1.1*spent) return null; // hour spent — move on (time cut) rather than repeat
  INTEREST.hourSpent[hourKey] = spent+1;
  INTEREST.runPerson = best.kind==="person" ? run+1 : 0;
  if(best.kind==="person") return makePersonBeat(best);
  if(best.kind==="group") return makeGroupBeat(best);
  return makeSiteBeat(best);
}
function logBeat(b){
  var f = simDay-Math.floor(simDay), hh = Math.floor(f*24), mm = Math.floor((f*24-hh)*60);
  var entry = { at: simDateISO(dateFromSimDay(simDay))+" "+(hh<10?"0":"")+hh+":"+(mm<10?"0":"")+mm,
    cls: b.cls, kind: b.kind||"event",
    kicker: b.kicker||(CLS_META[b.cls]||{}).kicker||b.cls, headline: b.headline };
  INTEREST.log.push(entry);
  if(INTEREST.log.length>250) INTEREST.log.shift();
  console.log("[director] "+entry.at+" · "+entry.kicker+" · "+entry.headline);
}
function startInterestBeat(b, now){
  b._pendingCut = true;
  DIRECTOR.beat = b; DIRECTOR.beatStart = now;
  DIRECTOR.idleSince = 0;
  showBeatCard(b);
  logBeat(b);
  directorCut(function(){
    if(DIRECTOR.beat!==b) return; // aborted/preempted during the fade (e.g. the fire)
    b._pendingCut = false;
    DIRECTOR.beatStart = performance.now();
    if(b.kind==="person"){
      var s = b.slot;
      INTEREST.slotCool[s.id] = performance.now() + 12*60*1000;
      if(s.occ) INTEREST.typeCool[s.occ.id] = performance.now() + 9*60*1000;
      if(s.roster) INTEREST.nameCool[s.roster.name] = performance.now() + 30*60*1000;
      // person-follows run schedule-true: at high compression drop to 2x
      // automatically (you cannot follow a person at day/s); restore after.
      if(timelapseActive()){ DIRECTOR.savedSpeed = simSpeedKey; setSimSpeed("x2"); }
      else if(simSpeedKey===0) setSimSpeed("x2");
      if(s.kind==="routine") computeRoutinePosition(s, simDay); else computeExtraPosition(s, simDay);
      DIRECTOR.autoSlot = s;
      openPersonInspectorForSlot(s);          // the panel says who they are — facts only
      document.body.classList.add("watch-follow");
      setZoomMeters(b.alt);                   // period-drama shoulder/three-quarter distance
      CAM.yawT = CAM.yaw + (((s.id%7)/7)-0.5)*1.6; // vary the angle per person
      CAM.pitchOffT = -0.30;
      CAM.focusT = new THREE.Vector3(s._x, groundHeight(s._x,s._z)+1.4, s._z);
    } else if(b.kind==="group"){
      INTEREST.siteCool["ashore"] = performance.now() + 8*60*1000;
      var gp = b.pos();
      if(gp) CAM.focusT = new THREE.Vector3(gp.x, groundHeight(gp.x,gp.z)+1.2, gp.z);
      setZoomMeters(b.alt);
      CAM.pitchOffT = cinematicTilt ? CINEMATIC_TILT_OFFSET : 0;
    } else {
      INTEREST.siteCool[b.siteKey] = performance.now() + 6*60*1000;
      CAM.focusT = new THREE.Vector3(b.x, groundHeight(b.x,b.z), b.z);
      setZoomMeters(clamp(b.alt*1.15, CFG.minAltitude, CFG.maxAltitude));
      CAM.pitchOffT = cinematicTilt ? CINEMATIC_TILT_OFFSET : 0;
    }
  });
}
var INTEREST_HOURS = [6.2, 8.0, 11.8, 15.2, 17.3, 19.3];
function nextInterestHourDay(day){
  var f = Math.floor(day), h = (day-f)*24;
  for(var i=0;i<INTEREST_HOURS.length;i++){ if(INTEREST_HOURS[i] > h+0.2) return f + INTEREST_HOURS[i]/24; }
  return f + 1 + INTEREST_HOURS[0]/24;
}
function updateDirector(dt){
  var now = performance.now();
  // backward time-jump: resynchronize the cursor and drop stale pendings
  if(DIRECTOR.cursor>0 && DIRECTOR_BEATS[DIRECTOR.cursor-1] && DIRECTOR_BEATS[DIRECTOR.cursor-1].simDay > simDay + 0.5){
    DIRECTOR.cursor = lowerBoundBeats(simDay);
    DIRECTOR.pending.length = 0;
    abortDirectorBeat();
  }
  while(DIRECTOR.cursor<DIRECTOR_BEATS.length && DIRECTOR_BEATS[DIRECTOR.cursor].simDay<=simDay){
    DIRECTOR.pending.push(DIRECTOR_BEATS[DIRECTOR.cursor]); DIRECTOR.cursor++;
  }
  DIRECTOR.pending = DIRECTOR.pending.filter(function(b){
    return (simDay - b.simDay) <= ((CLS_META[b.cls]||{}).stale||5);
  });
  if(!WATCH.on) return;
  // a manual follow outranks the director — but if the director's own person
  // beat lost its follow (user clicked someone else / Esc), the beat must
  // FINISH first or it would hang forever behind this early return.
  if(DIRECTOR.beat && DIRECTOR.beat.kind==="person" && !DIRECTOR.beat._pendingCut
     && followedSlot!==DIRECTOR.beat.slot){
    DIRECTOR.cooldownUntil[DIRECTOR.beat.cls] = now + ((CLS_META[DIRECTOR.beat.cls]||{}).cooldown||25)*1000;
    abortDirectorBeat();
    DIRECTOR.nextPickAt = now + 2000;
  }
  if(followedDocumented) return;
  if(followedSlot && followedSlot!==DIRECTOR.autoSlot) return; // (the director's own follow doesn't)
  if(now < DIRECTOR.suspendUntil) return;                 // manual input holds for 30s

  // month-change idle beat (priority 2): a wide re-establishing look
  var mk = simDateISO(dateFromSimDay(simDay)).slice(0,7);
  if(mk!==DIRECTOR.lastMonthKey){
    DIRECTOR.lastMonthKey = mk;
    var c = idleActivityCenter();
    var mdate = dateFromSimDay(simDay);
    DIRECTOR.pending.push({ simDay:simDay, cls:"month", pri:2, x:c.x, z:c.z, alt:c.alt,
      headline: mdate.toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})+" — pop. ~"+Math.round(populationAt(simDay)).toLocaleString()+" souls",
      dateISO: simDateISO(mdate), receipt:null });
  }

  // a top-priority beat (the fire) preempts whatever lower beat is playing
  if(DIRECTOR.beat && (DIRECTOR.beat.pri||5)<9){
    for(var pi=0; pi<DIRECTOR.pending.length; pi++){
      if(DIRECTOR.pending[pi].pri>=9){ abortDirectorBeat(); break; }
    }
  }
  if(DIRECTOR.beat){
    var b = DIRECTOR.beat;
    if(b._pendingCut) return; // composing behind the cut fade
    var elapsed = (now-DIRECTOR.beatStart)/1000;
    var done = false;
    if(b.kind==="person"){
      var fs = b.slot;
      done = elapsed > b.hold
          || followedSlot!==fs                             // user closed/replaced the panel
          || simDay<fs.notBeforeDay || (fs.notAfterDay!=null && simDay>fs.notAfterDay)
          || (elapsed>8 && (/^asleep/.test(fs._now||"") || fs._pose==="sleep")); // their day concluded
      if(!done){
        // the follow lock in animate() carries the focus; the director holds
        // the shoulder distance + a slow drift around them.
        setZoomMeters(b.alt);
        CAM.yawT += 0.030*dt;
        return;
      }
    } else if(b.kind==="group"){
      var gp = b.pos();
      done = elapsed > b.hold || !gp;
      if(!done){
        CAM.focusT = new THREE.Vector3(gp.x, groundHeight(gp.x,gp.z)+1.2, gp.z);
        setZoomMeters(b.alt);
        CAM.yawT += 0.024*dt;
        return;
      }
    } else if(b.kind==="site"){
      done = elapsed > b.hold;
      if(!done){
        // hold with slow drift + a gentle settle toward the framing altitude
        var st = smoothstep(0, Math.max(6, b.hold*0.6), elapsed);
        CAM.focusT = new THREE.Vector3(b.x, groundHeight(b.x,b.z), b.z);
        setZoomMeters(clamp(lerp(b.alt*1.15, b.alt, st), CFG.minAltitude, CFG.maxAltitude));
        CAM.yawT += (b.drift||0.02)*dt;
        return;
      }
    } else {
      done = b.holdUntilDay ? (simDay>b.holdUntilDay) : (elapsed > ((CLS_META[b.cls]||{}).hold||10));
      if(!done){
        // event grammar: wide establishing -> push-in, slow drift throughout
        var pushT = smoothstep(0, 5.5, elapsed);
        CAM.focusT = new THREE.Vector3(b.x, groundHeight(b.x,b.z), b.z);
        setZoomMeters(clamp(lerp(b.alt*2.7, b.alt, pushT), CFG.minAltitude, CFG.maxAltitude));
        CAM.yawT += (b.cls==="fire" ? 0.055 : 0.035)*dt;
        return;
      }
    }
    DIRECTOR.cooldownUntil[b.cls] = now + ((CLS_META[b.cls]||{}).cooldown||25)*1000;
    abortDirectorBeat(); // clears the card + releases any auto-follow
    DIRECTOR.nextPickAt = now + 1600 + Math.random()*2800; // varied pacing between cuts
  }
  if(now >= DIRECTOR.nextPickAt){
    // 1. the highest-priority pending EVENT beat off cooldown (icon-scored spine)
    var best = null;
    for(var i=0;i<DIRECTOR.pending.length;i++){
      var cand = DIRECTOR.pending[i];
      if((DIRECTOR.cooldownUntil[cand.cls]||0) > now) continue;
      if(!best || cand.pri>best.pri || (cand.pri===best.pri && cand.simDay<best.simDay)) best = cand;
    }
    if(best){
      DIRECTOR.pending.splice(DIRECTOR.pending.indexOf(best),1);
      if(best.visit){ // ship beats resolve their anchor position at trigger time
        var ap = best.visit._anchorPos;
        best.x = ap ? ap.x : 450; best.z = ap ? ap.z : 0;
      }
      DIRECTOR.beat = best;
      DIRECTOR.beatStart = now;
      DIRECTOR.idleSince = 0;
      showBeatCard(best);
      logBeat(best);
      return;
    }
    // 2. the interest pool: person-follows / just-ashore / site gallery
    var ib = pickInterestBeat(now);
    if(ib){ startInterestBeat(ib, now); return; }
    DIRECTOR.nextPickAt = now + 700; // nothing scored — retry shortly
    if(!DIRECTOR.idleSince) DIRECTOR.idleSince = now;
  }
  // s44 TIME CUT: nothing worth watching right now (or this hour is spent) —
  // jump-cut the sim clock forward to the next interesting hour instead of
  // orbiting an empty frame. Follow tiers only (timelapse compresses on its
  // own); never past the next documented beat (land on it instead); never
  // inside the fire window (its own beat holds the clock).
  if(DIRECTOR.idleSince && now-DIRECTOR.idleSince>4500 && followSpeedActive() && !SCRUBBING
     && !(simDay>=FIRE.day0 && simDay<=FIRE.day1)){
    var target = nextInterestHourDay(simDay);
    var nb = DIRECTOR_BEATS[DIRECTOR.cursor];
    if(nb && nb.simDay < target) target = nb.simDay + 0.002;
    target = Math.min(target, SIM_END_DAY);
    if(target > simDay + 0.02){
      DIRECTOR.idleSince = 0;
      DIRECTOR.nextPickAt = now + 1000;
      directorCut(function(){ simDay = target; updateHashDate(); });
      return;
    }
  }
  // idle: slow golden-hour orbit of the current center of activity
  var ic = idleActivityCenter();
  CAM.focusT = new THREE.Vector3(
    lerp(CAM.focusT.x, ic.x, clamp01(dt*0.5)),
    groundHeight(ic.x,ic.z),
    lerp(CAM.focusT.z, ic.z, clamp01(dt*0.5)));
  setZoomMeters(lerp(getZoomMeters(), ic.alt, clamp01(dt*0.4)));
  CAM.yawT += 0.03*dt;
  // drift deep night toward the golden hours: lighting derives from the sim
  // clock now (fix sprint 2026-07-11), so the idle director nudges the SIM
  // clock itself through the small hours (~10 sim-min per real second — the
  // same visual pace the old timeOfDay drift had). Skipped at timelapse,
  // where the representative light never reads as deep night anyway.
  if(nightFactor>0.9 && !timelapseActive()) simDay = clamp(simDay + dt*(3/420), 0, SIM_END_DAY);
}

/* debug/verification handle (used by the Phase-5 QA pass; harmless in prod) */
