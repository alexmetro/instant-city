/* =====================================================================
   LAYER ui-chrome (slot 13) — OWNS HUD panels, timeline scrubber, paper pane, tickers. Parchment lives
   here and only here (Earth Palette Law). (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 4 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 34 — event ticker, the paper, click-to-fly, pulse, horizon ring */
/* =========================================================================
   7. EVENT TICKER — a parchment strip narrating the most recent qualifying
   spine event as sim-time passes it (fires/proclamations/arrivals get
   priority, per spec). Pre-Phase-3 minimal version: headline + date only,
   no click-through yet.
   ========================================================================= */
var TICKER_TYPES = { proclamation:1, ship_arrival:1, ship_departure:1, celebration:1, election:1, epidemic:1, shipwreck:1, fire:1 };
// 2026-07-09 (GAPS item "1849 bible-tier events visible"): "crime" joins the
// ticker classes so the newly-baked Hounds/riot/trial bible records surface
// on the bottom-bar ticker (SFPD founding is class:civic like hundreds of
// routine notices, so it's a director beat only — see DIRECTOR_BEATS below —
// rather than widening the ticker's civic gate and drowning it in noise).
var TICKER_CLASSES = { fire:1, disaster:1, crime:1 };
function tickerScore(e){
  var s = e.priority||0;
  if(e.class==="fire" || e.type==="fire") s += 100;
  if(e.type==="proclamation") s += 80;
  if(e.class==="disaster") s += 60;
  if(e.type==="ship_arrival" || e.type==="ship_departure") s += 20;
  return s;
}
var tickerEvents = EVENTS_RAW.filter(function(e){ return TICKER_CLASSES[e.class] || TICKER_TYPES[e.type]; })
  .map(function(e){ e._score = tickerScore(e); return e; })
  .sort(function(a,b){ return a.simDay-b.simDay; });
var tickerDateEl = document.getElementById("ticker-date");
var tickerTextEl = document.getElementById("ticker-text");
var tickerPanelEl = document.getElementById("hud-ticker");
var tickerIdx = 0, lastTickerShown = null;
function updateTicker(){
  if(tickerEvents.length===0) return;
  while(tickerIdx<tickerEvents.length-1 && tickerEvents[tickerIdx+1].simDay<=simDay) tickerIdx++;
  if(tickerEvents[tickerIdx].simDay>simDay){ tickerPanelEl.classList.remove("on"); return; }
  var best = tickerEvents[tickerIdx];
  for(var i=tickerIdx; i>=0 && (tickerEvents[tickerIdx].simDay-tickerEvents[i].simDay)<=6; i--){
    if(tickerEvents[i]._score>best._score) best = tickerEvents[i];
  }
  if(best!==lastTickerShown){
    lastTickerShown = best;
    tickerDateEl.textContent = dateFromSimDay(best.simDay).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
    tickerTextEl.textContent = best.headline;
  }
  tickerPanelEl.classList.add("on");
}
tickerPanelEl.classList.add("clickable");
tickerPanelEl.addEventListener("click", function(){
  if(!lastTickerShown) return;
  var evDateISO = simDateISO(dateFromSimDay(lastTickerShown.simDay));
  var dateKey = latestIssueOnOrBefore(evDateISO);
  // PHASE 5: a paper reports an event AFTER it happens — for fire-class
  // events, prefer the first issue within a week AFTER the event (the Dec 24
  // 1849 fire's report is the Dec 26 Alta) over the issue that preceded it.
  if(lastTickerShown.class==="fire"){
    var after = issueWithinDaysAfter(evDateISO, 7);
    if(after && simDay >= eventDateToSimDay(after)) dateKey = after;
  }
  if(!dateKey) return;
  pendingScrollHeadline = lastTickerShown.headline;
  paperView = "feed";
  ppTabFeed.classList.add("active"); ppTabBroadsheet.classList.remove("active");
  forcedIssueKey = dateKey;
  _lastRenderKey = null;
  setPaperOpen(true);
});

/* =========================================================================
   8. PHASE 3 — THE PAPER
   Real newspaper items (data/feed/*.json) and the horizon ring's world-known
   items (data/world.jsonl), baked by tools/build-feed.js -> app/feed-1846-49.js
   (same script-tag/no-fetch pattern as terrain-1846.js and events-1846-49.js).
   Two presentations of the day's issue (broadsheet / feed, spec §11),
   click-to-fly resolution against the Phase 1/2 grid + ship registry
   (spec §2 tiers: ships -> street corners -> plaza -> mission -> presidio,
   "unresolvable -> no fly affordance, never fake it"), CDNC receipts, the
   May 24 1848 suspension notice, and the >7000m horizon ring (spec §12).
   ========================================================================= */
var FEED_BY_DATE = window.FEED_BY_DATE || {};
var WORLD_KNOWN = window.WORLD_KNOWN || [];
if(!window.FEED_BY_DATE) console.warn("[verify] feed-1846-49.js failed to load — run: node tools/build-feed.js");
var FEED_DATES = Object.keys(FEED_BY_DATE).sort();
var MASTHEAD_NAME = { C:"THE CALIFORNIAN", CS:"THE CALIFORNIA STAR", CSC:"THE CALIFORNIA STAR & CALIFORNIAN", DAC:"THE ALTA CALIFORNIA" };
var SUSPENSION_ISSUE_DATE = "1848-05-24"; // the Californian's farewell-to-the-mines issue (data/feed confirms a business_close item that date: "Californian newspaper suspends publication amid gold rush")

function issueUrl(src){ return "https://cdnc.ucr.edu/?a=d&d=" + src; }
function todayISOFromSimDay(day){ return simDateISO(dateFromSimDay(day)); }
// (escapeHTML/cap — generic string helpers with heavy cross-layer consumers —
// moved to core/00-boot.js in the 2026-07-12 cleanup.)
function formatIssueDateLabel(dateKey){
  return new Date(dateKey+"T00:00:00Z").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"});
}
/* first real issue date strictly after iso and within `days` days, or null —
   Phase 5: used to route event click-throughs to the issue that REPORTED
   the event (e.g. Dec 24 1849 fire -> the Dec 26 Alta). */
function issueWithinDaysAfter(iso, days){
  var limit = simDateISO(new Date(Date.parse(iso+"T00:00:00Z") + days*86400000));
  for(var i=0;i<FEED_DATES.length;i++){
    if(FEED_DATES[i]>iso) return FEED_DATES[i]<=limit ? FEED_DATES[i] : null;
  }
  return null;
}
/* latest real issue date <= iso, or null if before the first issue (Aug 15 1846) */
function latestIssueOnOrBefore(iso){
  var lo=0, hi=FEED_DATES.length-1, ans=-1;
  while(lo<=hi){
    var mid=(lo+hi)>>1;
    if(FEED_DATES[mid]<=iso){ ans=mid; lo=mid+1; } else hi=mid-1;
  }
  return ans>=0 ? FEED_DATES[ans] : null;
}

/* -------------------------------------------------------------------------
   CLICK-TO-FLY RESOLUTION (spec item 2). Resolution tiers, in priority
   order: ship registry -> Vioget-grid street corners/streets -> Plaza ->
   Mission -> Presidio. No placeRefs exist in the extracted data, so this
   scans headline+text for the same names the grid/ships already carry —
   anything else stays unresolvable (no fake fly affordance, ever).
   ------------------------------------------------------------------------- */
var STREET_NAMES_U = Object.keys(GEO.streetsU);   // montgomery kearny dupont stockton
var STREET_NAMES_V = Object.keys(GEO.streetsV);   // pacific jackson clay washington sacramento california
var STREET_U_MIDV = (GEO.streetsV.pacific + GEO.streetsV.california)/2;
var STREET_V_MIDU = (GEO.streetsU.montgomery + GEO.streetsU.stockton)/2;
var PLAZA_RE = /\b(plaza|portsmouth square)\b/i;
var MISSION_RE = /\bmission\b/i;
var PRESIDIO_RE = /\bpresidio\b/i;
function findNameHits(text, names){
  var hits = [];
  names.forEach(function(n){ if(new RegExp("\\b"+n+"\\b","i").test(text)) hits.push(n); });
  return hits;
}
function resolveShipPlace(text){
  var hit = null;
  for(var i=0;i<shipVisits.length;i++){
    var v = shipVisits[i];
    if(v._state!=="anchored" && v._state!=="sailing_in" && v._state!=="sailing_out") continue;
    var re = new RegExp("\\b"+v.ship.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i");
    if(re.test(text)){ hit = v; break; }
  }
  if(!hit || !hit._anchorPos) return null;
  return { x:hit._anchorPos.x, z:hit._anchorPos.z, alt:220, label:"the "+hit.ship };
}
function resolvePlace(headline, text){
  var full = (headline||"")+" "+(text||"");
  var ship = resolveShipPlace(full);
  if(ship) return ship;
  var uHits = findNameHits(full, STREET_NAMES_U);
  var vHits = findNameHits(full, STREET_NAMES_V);
  if(uHits.length && vHits.length){
    var w = gridToWorld(GEO.streetsU[uHits[0]], GEO.streetsV[vHits[0]]);
    return { x:w.x, z:w.z, alt:260, label:cap(uHits[0])+" & "+cap(vHits[0]) };
  }
  if(uHits.length){
    var w2 = gridToWorld(GEO.streetsU[uHits[0]], STREET_U_MIDV);
    return { x:w2.x, z:w2.z, alt:300, label:cap(uHits[0])+" Street" };
  }
  if(vHits.length){
    var w3 = gridToWorld(STREET_V_MIDU, GEO.streetsV[vHits[0]]);
    return { x:w3.x, z:w3.z, alt:300, label:cap(vHits[0])+" Street" };
  }
  if(PLAZA_RE.test(full)) return { x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:220, label:"the Plaza" };
  if(MISSION_RE.test(full)) return { x:OUTPOSTS.mission.x, z:OUTPOSTS.mission.z, alt:280, label:"Mission Dolores" };
  if(PRESIDIO_RE.test(full)) return { x:OUTPOSTS.presidio.x, z:OUTPOSTS.presidio.z, alt:280, label:"the Presidio" };
  return null;
}

/* (flyTo() — the camera-rig write — plus its pulse crosshair relocated to
   layers/camera-input.js in the 2026-07-12 cleanup: the rig is camera-
   input's. Same global chunk position; consumers everywhere still call
   flyTo(x,z,alt) unchanged — it behaves as the de-facto shared interface.) */

/* @P1850-CHUNK 36 — byline chips, ticker, the paper pane, horizon ring */
/* -------------------------------------------------------------------------
   TYPE -> BYLINE CHIP (feed view). The extracted data carries no byline
   field (checked: data/feed/*.json items are {type,headline,text,prov}
   only), so chips are honestly derived from the item's documented type
   rather than inventing a name — "the harbor master's arrivals bot" etc.
   from spec §11 is exactly this kind of systemic account, not a person.
   ------------------------------------------------------------------------- */
var TYPE_CHIP = {
  business_open:"TRADE NOTICE", business_close:"TRADE NOTICE", ship_arrival:"HARBOR MASTER — ARRIVALS",
  ship_departure:"HARBOR MASTER — CLEARANCES", military:"MILITARY DESPATCH", proclamation:"PROCLAMATION",
  ordinance:"ORDINANCE", battle:"FIELD REPORT", masthead:"THE PUBLISHERS", color:"TOWN TALK",
  appointment:"APPOINTMENTS", mail:"THE MAILS", death:"DIED", birth:"BORN", crime:"THE POLICE",
  ad:"ADVERTISEMENT", election:"ELECTION RETURNS", court_case:"THE COURTS", disaster:"DISASTER",
  meeting:"PUBLIC MEETING", shipwreck:"MARINE DISASTER", celebration:"CELEBRATION", weather:"THE WEATHER",
  epidemic:"HEALTH NOTICE", auction_sale:"AUCTION", marriage:"MARRIED", discovery:"DISCOVERY",
  council_action:"TOWN COUNCIL", official_rhetoric:"OFFICIAL", fire:"FIRE", other:"MISCELLANY"
};
function chipLabel(type){ return TYPE_CHIP[type] || String(type).toUpperCase(); }
function receiptHTML(prov){
  if(!prov || !prov.src) return "";
  return '<a class="fi-receipt" href="'+issueUrl(prov.src)+'" target="_blank" rel="noopener">view the original page &rarr;</a>';
}
function fiHeadlineHTML(item){
  var place = resolvePlace(item.headline, item.text);
  return '<div class="fi-headline'+(place?" flyable":"")+'">'+escapeHTML(item.headline)+'</div>';
}

/* ---- pane state + DOM ---- */
var paperPaneEl = document.getElementById("paper-pane");
var ppBodyEl = document.getElementById("pp-body");
var ppMastheadEl = document.getElementById("pp-masthead");
var ppIssueDateEl = document.getElementById("pp-issue-date");
var ppTabBroadsheet = document.getElementById("pp-tab-broadsheet");
var ppTabFeed = document.getElementById("pp-tab-feed");
var ptMastheadNameEl = document.getElementById("pt-masthead-name");
var ptIssueDateEl = document.getElementById("pt-issue-date");
var paperOpen = false;
var paperView = "broadsheet";
var currentIssueDateKey = null;
var forcedIssueKey = null;      // set by the ticker click-through (spec item 5)
var pendingScrollHeadline = null;
var _lastRenderKey = null;

function setPaperOpen(open){
  paperOpen = open;
  paperPaneEl.classList.toggle("open", open);
  _lastRenderKey = null;
}
document.getElementById("paper-toggle").addEventListener("click", function(){ setPaperOpen(!paperOpen); });
document.getElementById("pp-close").addEventListener("click", function(){ setPaperOpen(false); });
ppTabBroadsheet.addEventListener("click", function(){
  paperView = "broadsheet"; ppTabBroadsheet.classList.add("active"); ppTabFeed.classList.remove("active"); _lastRenderKey=null;
});
ppTabFeed.addEventListener("click", function(){
  paperView = "feed"; ppTabFeed.classList.add("active"); ppTabBroadsheet.classList.remove("active"); _lastRenderKey=null;
});
window.addEventListener("keydown", function(e){
  if(e.key==="n"||e.key==="N") setPaperOpen(!paperOpen);
});
ppBodyEl.addEventListener("click", function(e){
  var h = e.target.closest && e.target.closest(".fi-headline.flyable");
  if(!h) return;
  var card = h.closest(".feed-item, .bs-item");
  var idx = card ? +card.getAttribute("data-idx") : -1;
  var issue = currentIssueDateKey && FEED_BY_DATE[currentIssueDateKey];
  if(!issue || idx<0 || !issue.items[idx]) return;
  var place = resolvePlace(issue.items[idx].headline, issue.items[idx].text);
  if(place) flyTo(place.x, place.z, place.alt);
});

// GAPS-2026-07-09 item 2 (economy layer): issues whose extraction already
// tagged prices as sourceContext:"prices_current" get a small MARKETS table —
// the same column a real period paper carried — linking data already baked
// from data/prices.jsonl to the specific issue date that reported it.
function marketsTableHTML(dateKey){
  var recs = (PRICES_BY_DATE[dateKey]||[]).filter(function(p){ return p.ctx==="prices_current"; });
  if(recs.length===0) return "";
  var rows = recs.slice(0,12).map(function(p){
    var amt = formatPrice(p);
    return '<tr><td>'+escapeHTML(p.item)+'</td><td>'+escapeHTML(amt||"")+'</td></tr>';
  }).join("");
  return '<table class="pp-markets"><caption>Prices Current</caption><thead><tr><th>Article</th><th>Price</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function renderBroadsheet(issue, dateKey){
  var html = '<div class="bs-columns">';
  issue.items.forEach(function(item, i){
    html += '<div class="bs-item" data-idx="'+i+'">' + fiHeadlineHTML(item)
      + '<p class="fi-text">'+escapeHTML(item.text)+'</p>' + receiptHTML(item.prov) + '</div>';
  });
  ppBodyEl.innerHTML = html + '</div>' + marketsTableHTML(dateKey);
}
function renderFeed(issue, dateKey){
  var html = "";
  issue.items.forEach(function(item, i){
    html += '<div class="feed-item" data-idx="'+i+'">'
      + '<span class="fi-chip'+(item.type==="ad"?" ad":"")+'">'+chipLabel(item.type)+'</span>'
      + fiHeadlineHTML(item) + '<p class="fi-text">'+escapeHTML(item.text)+'</p>' + receiptHTML(item.prov) + '</div>';
  });
  ppBodyEl.innerHTML = html + marketsTableHTML(dateKey);
}
function renderNoIssueYet(){
  ppMastheadEl.textContent = "THE INSTANT CITY";
  ppIssueDateEl.textContent = "no paper has reached San Francisco yet";
  ppBodyEl.innerHTML = '<div class="pp-noissue">The territory’s first newspaper, <i>The Californian</i>, begins publication August 15, 1846.</div>';
}
function renderSuspended(sinceKey){
  ppBodyEl.innerHTML = '<div class="pp-suspended"><span class="pp-s-line">The newspapers have gone to the gold fields.</span>'
    + '<span class="pp-s-sub">no issue since '+formatIssueDateLabel(sinceKey)+'</span></div>';
}
function scrollToPendingHeadline(){
  if(!pendingScrollHeadline) return;
  var target = pendingScrollHeadline; pendingScrollHeadline = null;
  setTimeout(function(){
    var nodes = ppBodyEl.querySelectorAll(".fi-headline");
    for(var i=0;i<nodes.length;i++){
      if(nodes[i].textContent===target){
        var card = nodes[i].closest(".feed-item, .bs-item");
        if(card){ card.scrollIntoView({block:"center", behavior:"smooth"}); card.classList.add("item-flash"); }
        break;
      }
    }
  }, 30);
}
function updatePaper(){
  var todayISO = todayISOFromSimDay(simDay);
  var naturalKey = latestIssueOnOrBefore(todayISO);
  var dateKey = forcedIssueKey || naturalKey;
  var mastheadName = naturalKey ? (MASTHEAD_NAME[FEED_BY_DATE[naturalKey].masthead]||FEED_BY_DATE[naturalKey].masthead) : "THE INSTANT CITY";
  ptMastheadNameEl.textContent = mastheadName;
  ptIssueDateEl.textContent = naturalKey ? (todayISO===naturalKey?"today's issue":("since "+formatIssueDateLabel(naturalKey))) : "no paper yet";
  currentIssueDateKey = dateKey;
  if(!paperOpen) return;
  var suspended = dateKey===SUSPENSION_ISSUE_DATE && todayISO>dateKey;
  var renderKey = dateKey+"|"+paperView+"|"+suspended;
  if(renderKey===_lastRenderKey && !pendingScrollHeadline) return;
  _lastRenderKey = renderKey;
  if(!dateKey){ renderNoIssueYet(); forcedIssueKey=null; return; }
  var issue = FEED_BY_DATE[dateKey];
  var issueMasthead = MASTHEAD_NAME[issue.masthead] || issue.masthead;
  ppMastheadEl.textContent = issueMasthead;
  if(suspended){ ppIssueDateEl.textContent="SUSPENDED"; renderSuspended(dateKey); forcedIssueKey=null; return; }
  ppIssueDateEl.textContent = (dateKey===naturalKey && todayISO===dateKey) ? ("issue of "+formatIssueDateLabel(dateKey)) : ("no paper since "+formatIssueDateLabel(dateKey));
  if(paperView==="broadsheet") renderBroadsheet(issue, dateKey); else renderFeed(issue, dateKey);
  scrollToPendingHeadline();
  forcedIssueKey = null;
}

/* -------------------------------------------------------------------------
   HORIZON RING (spec item 4 / spec §12) — >7000m, the world as SF currently
   knows it. Recomputes the shown set only when the sim date advances (the
   list can only change on a knownInSF crossing), so this stays O(1011) at
   most a few times a sim-day rather than every frame.
   ------------------------------------------------------------------------- */
var HORIZON_ALT = 7000;
var horizonRingEl = document.getElementById("horizon-ring");
var _lastHorizonISO = null;
function updateHorizonRing(alt){
  var show = alt>HORIZON_ALT;
  horizonRingEl.classList.toggle("on", show);
  if(!show) return;
  var todayISO = todayISOFromSimDay(simDay);
  if(todayISO===_lastHorizonISO) return;
  _lastHorizonISO = todayISO;
  var known = WORLD_KNOWN.filter(function(w){ return w.knownInSF<=todayISO; });
  known.sort(function(a,b){ return a.knownInSF!==b.knownInSF ? (a.knownInSF<b.knownInSF?1:-1) : (b.priority-a.priority); });
  var picks = known.slice(0,6);
  var html = '<span class="hr-title">THE WORLD AS KNOWN IN SAN FRANCISCO</span>';
  if(picks.length===0){
    html += '<span class="hr-item"><span class="hr-headline">no word yet from beyond the Golden Gate</span></span>';
  } else {
    picks.forEach(function(w){
      var days = Math.round(simDay - eventDateToSimDay(w.happened));
      var stale = days<=0 ? "JUST HAPPENED" : (days+" DAY"+(days===1?"":"S")+" AGO");
      html += '<span class="hr-item"><span class="hr-pos">'+escapeHTML((w.pos||"elsewhere").toUpperCase())+'</span>'
        + '<span class="hr-stale">'+stale+'</span>'
        + '<span class="hr-headline">'+escapeHTML(w.headline)+'</span></span>';
    });
  }
  horizonRingEl.innerHTML = html;
}

/* @P1850-CHUNK 68 — timeline scrubber */
/* =========================================================================
   THE SCRUBBER — bottom timeline ribbon, full span 1846-07 -> 1849-12.
   jumpToDate() is the single entry point for every explicit jump (drag
   release, track click, notch click, [ / ]): it sets simDay and rewrites
   the URL's &d=. Every downstream system (population/ships/districts/fire)
   already reads simDay live each frame (confirmed via updateShips'
   "jumping straight to a URL date" handling and FIRE's day-compare state),
   so this already IS the "fresh telling of fixed history" reconstruction
   — no fast-forward, no re-seed. lifeVariant (see personRng) is untouched
   by ordinary jumps in either direction, per TIME-JUMP SEMANTICS. ---- */
/* P0-3 fix (2026-07-10, Director's screening): every caller here (notch
   click, [ / ], __P1850.jump, the initial URL &d=) passes a bare whole
   calendar day (eventDateToSimDay's integer-midnight semantics) — landing
   there put updatePeople()'s peopleTargetCount() straight into its
   deep-night 0.06 multiplier (h<5.5), so ANY discrete jump-then-pause
   showed the town's near-empty midnight population (~6-11 of up to 180
   slots) regardless of the real daytime figure, reading as a ghost town
   exactly when the user is looking closest. The scrubber DRAG path never
   calls jumpToDate() (it sets simDay from continuous pixel position and
   commits via updateHashDate() directly), so dragging to an intentional
   night hour is untouched and still legitimately shows a sleepy town —
   this fix only defaults bare-date jumps to local noon. */
function jumpToDate(day){
  var wholeDay = Math.floor(day)===day;
  simDay = clamp(wholeDay ? day+0.5 : day, 0, SIM_END_DAY);
  updateHashDate();
}
/* top ~10 spine beats by narrative/director priority, hand-picked from the
   same extraction (events-1846-49.js / feed-1846-49.js) that drives
   DIRECTOR_BEATS above: founding flag, the Brooklyn's Brannan/Mormon
   arrival, the first newspaper issue, the renaming, Brannan's gold
   announcement, the papers' suspension, the SS California, the delegate
   election, and the Great Fire bracketed by the volunteer companies formed
   the next day. (No corpus record yet tags a "Hounds" headline verbatim —
   the delegate election fills that slot instead.) */
var SCRUB_NOTCHES = (function(){
  var picks = [
    { date:"1846-07-09", headline:"Montgomery raises the U.S. flag at Yerba Buena plaza" },
    { date:"1846-07-31", headline:"Ship Brooklyn lands Brannan and the Mormon settlers" },
    { date:"1846-08-15", headline:null },
    // s50 NATIVE PRESENCE: the Montgomery Indian-labor proclamation, issued
    // at Yerba Buena headquarters on its true date (native-presence-1846-49.md
    // §3; corpus CS18470306.1.4 / CS18470220.1.4) — headline + date only,
    // no editorializing (VOICE RULE).
    { date:"1846-09-15", headline:'Montgomery proclamation on Indian labor, issued at Yerba Buena headquarters' },
    { date:"1847-01-23", headline:"Renaming ordinance published: Yerba Buena becomes San Francisco" },
    { date:"1848-05-11", headline:'Brannan — "Gold! Gold from the American River!"' },
    { date:"1848-05-29", headline:"The Californian suspends publication" },
    { date:"1849-01-08", headline:"San Francisco to elect delegates for provisional convention" },
    { date:"1849-02-28", headline:"SS California, the first Pacific Mail steamer, enters the bay" },
    { date:"1849-12-24", headline:"The First Great Fire" },
    { date:"1849-12-25", headline:"Volunteer fire companies organize" }
  ];
  var firstIssue = FEED_BY_DATE["1846-08-15"];
  picks[2].headline = firstIssue ? ("First issue: "+(MASTHEAD_NAME[firstIssue.masthead]||firstIssue.masthead)) : "First issue: The Californian";
  return picks.map(function(p){ return { day:eventDateToSimDay(p.date), dateISO:p.date, headline:p.headline }; });
})();
(function buildScrubber(){
  var root = document.getElementById("hud-scrubber");
  var tab = document.getElementById("scr-tab");
  var yearsEl = document.getElementById("scr-years");
  var trackEl = document.getElementById("scr-track");
  var handleEl = document.getElementById("scr-handle");
  var chipEl = document.getElementById("scr-chip");
  var reshuffleEl = document.getElementById("seed-reshuffle");
  var collapsed = false, autoCollapsedByWatch = false, dragging = false;

  function pct(day){ return (clamp(day/SIM_END_DAY,0,1)*100).toFixed(3)+"%"; }
  function setCollapsed(v){ collapsed = v; root.classList.toggle("collapsed", v); }
  tab.addEventListener("click", function(){ setCollapsed(!collapsed); });

  // year labels
  for(var y=1846; y<=1849; y++){
    var yl = document.createElement("span");
    yl.className = "scr-year";
    yl.style.left = pct(eventDateToSimDay(y+"-01-01"));
    yl.textContent = y;
    yearsEl.appendChild(yl);
  }

  // month tick marks, 1846-07 through 1849-12
  var cursor = new Date(Date.UTC(1846,6,1)), endMs = Date.UTC(1850,0,1);
  while(cursor.getTime() < endMs){
    var tick = document.createElement("div");
    tick.className = "scr-tick" + (cursor.getUTCMonth()===0 ? " year" : "");
    tick.style.left = pct(eventDateToSimDay(cursor.toISOString().slice(0,10)));
    trackEl.appendChild(tick);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth()+1, 1));
  }

  // spine-event diamond notches — hover/tap tooltip is headline + date only,
  // no editorializing (VOICE RULE)
  SCRUB_NOTCHES.forEach(function(n){
    var el = document.createElement("div");
    el.className = "scr-notch";
    el.style.left = pct(n.day);
    el.addEventListener("mouseenter", function(){ showChip(n.dateISO, n.headline); });
    el.addEventListener("mouseleave", function(){ if(!dragging) hideChip(); });
    el.addEventListener("click", function(e){ e.stopPropagation(); jumpToDate(n.day); });
    trackEl.appendChild(el);
  });

  function showChip(dateISO, headline){
    var d = new Date(dateISO+"T00:00:00Z");
    var dateStr = d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
    chipEl.innerHTML = escapeHTML(dateStr) + (headline ? ('<span class="sc-head">'+escapeHTML(headline)+'</span>') : "");
    chipEl.classList.add("on");
  }
  function hideChip(){ chipEl.classList.remove("on"); }

  function dayFromClientX(clientX){
    var r = trackEl.getBoundingClientRect();
    return clamp((clientX-r.left)/Math.max(1,r.width), 0, 1) * SIM_END_DAY;
  }
  function updateHandle(){ handleEl.style.left = pct(simDay); }

  trackEl.addEventListener("pointerdown", function(e){
    dragging = true;
    SCRUBBING = true; // people render as ambient flow while the handle sweeps time
    try{ trackEl.setPointerCapture(e.pointerId); }catch(err){}
    simDay = clamp(dayFromClientX(e.clientX), 0, SIM_END_DAY);
    updateHandle();
    showChip(simDateISO(dateFromSimDay(simDay)), null);
  });
  trackEl.addEventListener("pointermove", function(e){
    if(!dragging) return;
    simDay = clamp(dayFromClientX(e.clientX), 0, SIM_END_DAY);
    updateHandle();
    showChip(simDateISO(dateFromSimDay(simDay)), null);
  });
  function endDrag(e){
    if(!dragging) return;
    dragging = false;
    SCRUBBING = false; // release: positions resample exactly from the counter-based schedules
    try{ trackEl.releasePointerCapture(e.pointerId); }catch(err){}
    updateHashDate(); // release commits the jump
    hideChip();
  }
  trackEl.addEventListener("pointerup", endDrag);
  trackEl.addEventListener("pointercancel", endDrag);

  function stepMonth(day, dir){
    var d = dateFromSimDay(day);
    var nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+dir, d.getUTCDate()));
    return eventDateToSimDay(nd.toISOString().slice(0,10));
  }
  window.addEventListener("keydown", function(e){
    if(e.target && (e.target.tagName==="INPUT" || e.target.tagName==="TEXTAREA")) return;
    if(e.key==="[") jumpToDate(stepMonth(simDay,-1));
    if(e.key==="]") jumpToDate(stepMonth(simDay,1));
  });

  reshuffleEl.addEventListener("click", function(e){ e.stopPropagation(); reshuffleLifeStream(); });

  // Watch mode (V) hides the ribbon by default via the SAME collapse the
  // tab uses — never touches setWatchMode itself, so the controls-rebuild
  // stays untouched; this just polls WATCH.on each frame for the transition.
  var lastWatchOn = false;
  (function tick(){
    if(!dragging) updateHandle();
    if(WATCH.on !== lastWatchOn){
      lastWatchOn = WATCH.on;
      if(lastWatchOn){ autoCollapsedByWatch = !collapsed; if(autoCollapsedByWatch) setCollapsed(true); }
      else if(autoCollapsedByWatch){ setCollapsed(false); autoCollapsedByWatch = false; }
    }
    requestAnimationFrame(tick);
  })();
})();

var bcClassEl = document.getElementById("bc-class"), bcQuoteEl = document.getElementById("bc-quote"),
    bcDateEl = document.getElementById("bc-date"), bcReceiptEl = document.getElementById("bc-receipt"),
    beatCardEl = document.getElementById("beat-card");
function showBeatCard(b){
  bcClassEl.textContent = b.kicker || (CLS_META[b.cls]||{}).kicker || b.cls.toUpperCase();
  // s44: person-follow/site cards state facts (name — trade; place) rather
  // than quoting a headline, so no quote marks for those kinds (voice rule).
  bcQuoteEl.textContent = (b.kind==="person"||b.kind==="site"||b.kind==="group") ? b.headline : "“"+b.headline+"”";
  bcDateEl.textContent = new Date(b.dateISO+"T00:00:00Z").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).toUpperCase();
  if(b.receipt){ bcReceiptEl.style.display=""; bcReceiptEl.href = b.receipt; }
  else bcReceiptEl.style.display="none";
  beatCardEl.classList.add("on");
}
function hideBeatCard(){ beatCardEl.classList.remove("on"); }
/* s44: end whatever beat is playing, releasing an auto-follow cleanly. */
function abortDirectorBeat(){
  if(DIRECTOR.autoSlot){
    if(followedSlot===DIRECTOR.autoSlot) closeInspect();
    DIRECTOR.autoSlot = null;
    document.body.classList.remove("watch-follow");
    CAM.pitchOffT = cinematicTilt ? CINEMATIC_TILT_OFFSET : 0;
    if(DIRECTOR.savedSpeed!=null && simSpeedKey==="x2") setSimSpeed(DIRECTOR.savedSpeed);
    DIRECTOR.savedSpeed = null;
  }
  DIRECTOR.beat = null; hideBeatCard();
}
function setWatchMode(on){
  WATCH.on = on;
  document.body.classList.toggle("watch-mode", on);
  // s44: watch mode's default tier is 2x FOLLOW — person-follows are the
  // headline, and they need schedule-true motion (you cannot follow a
  // person at day/s; the director drops compression itself when needed).
  if(on && simSpeedKey===0) setSimSpeed("x2");
  if(!on) abortDirectorBeat();
}
window.addEventListener("keydown", function(e){
  if(e.key==="v"||e.key==="V") setWatchMode(!WATCH.on);
});
function suspendDirector(){
  if(!WATCH.on) return;
  DIRECTOR.suspendUntil = performance.now()+30000;
  if(DIRECTOR.beat && !DIRECTOR.beat.holdUntilDay) abortDirectorBeat();
}
/* s41: window, not canvas — map drags can legitimately start on label chips
   now, and those must also give the watch-mode director its 30s pause. */
["pointerdown","wheel","touchstart"].forEach(function(ev){ window.addEventListener(ev, suspendDirector, {passive:true}); });
window.addEventListener("keydown", function(e){
  var k = e.key.toLowerCase();
  if("wasdqerf".indexOf(k)>=0 && k.length===1 || k.indexOf("arrow")===0) suspendDirector();
});
function anchoredShipCentroid(){
  var n=0, x=0, z=0;
  for(var i=0;i<shipVisits.length;i++){
    var v = shipVisits[i];
    if(v._state==="anchored" && v._anchorPos){ n++; x+=v._anchorPos.x; z+=v._anchorPos.z; }
  }
  return n>0 ? { count:n, x:x/n, z:z/n } : null;
}
function idleActivityCenter(){
  // "center of activity": village early -> waterfront/anchorage as ships
  // accumulate -> the tent districts in 1849
  if(simDay>=HAPPY_VALLEY_REVEAL_DAY+40 && Math.floor(simDay/45)%2===1) return { x:900, z:950, alt:1050 };
  var anch = anchoredShipCentroid();
  if(anch && anch.count>=6) return { x:lerp(anch.x,PLAZA_CENTER.x,0.35), z:lerp(anch.z,PLAZA_CENTER.z,0.35), alt:950 };
  return { x:PLAZA_CENTER.x, z:PLAZA_CENTER.z, alt:720 };
}
function lowerBoundBeats(day){
  var lo=0, hi=DIRECTOR_BEATS.length;
  while(lo<hi){ var mid=(lo+hi)>>1; if(DIRECTOR_BEATS[mid].simDay<day) lo=mid+1; else hi=mid; }
  return lo;
}

/* @P1850-CHUNK 73 — HUD update */
/* =====================================================================
   HUD UPDATE
   ===================================================================== */
var altValEl = document.getElementById("alt-val");
function updateHud(alt){
  altValEl.textContent = Math.round(alt) + " m";
}

/* Fullscreen button (iPad request, 2026-07-11): browser fullscreen where the
   API exists; the chromeless path on iOS is Add to Home Screen (manifest +
   apple-mobile-web-app meta in <head>), where this button auto-hides via the
   display-mode media query. */
(function(){
  var btn = document.getElementById("btn-fullscreen");
  if(!btn) return;
  var el = document.documentElement;
  var req = el.requestFullscreen || el.webkitRequestFullscreen;
  var exit = document.exitFullscreen || document.webkitExitFullscreen;
  if(!req){ btn.style.display = "none"; return; } // no API (iPhone Safari): PWA is the path
  btn.addEventListener("click", function(){
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if(fsEl) exit.call(document);
    else req.call(el);
  });
})();

