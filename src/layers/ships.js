/* =====================================================================
   LAYER ships (slot 7) — OWNS hulls/rigs/sails/anchorage/channel sailing, storeship dress, wharf deck
   structures. READS shoreline, clock, records. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 5 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 19 — ships phase-1 retirement note */
/* =====================================================================
   SHIPS — the Phase-1 draft here was 3 hardcoded, never-updated, always-
   visible boxy hulls at fixed spots. Removed (2026-07: QA-GATE ships debt):
   it duplicated and undercut the real Phase-2 date-driven ship system
   below (shipVisits/shipHullMeshes), which is the one actually responsible
   for the fleet, and its flat-box silhouette was part of the "squares in a
   parking lot" complaint. See "SHIP HULL/SAIL PREFABS" further down for
   the QA-GATE rebuild (sheer hull, bowsprit, 3 vessel types).
   ===================================================================== */

/* @P1850-CHUNK 29 — documented visits, vessel types, navigation, anchorage, hull/sail prefabs, fill traffic */
/* =========================================================================
   3. SHIPS ON THEIR TRUE DATES
   The data is noisy newsprint (the same ship's arrival gets re-mentioned
   across several issues before the news moves on), so events are deduped
   per ship+type (collapsing repeats within 21 days) before being paired
   into arrival->departure "visits." A visit with no matching arrival was
   already anchored before our July-1846 window opens; one with no matching
   departure stays anchored through the end of the extracted era — exactly
   the "forest of masts" the brief describes.
   ========================================================================= */
/* WORLD-P0 fix (2026-07-09, AUDIT H2 / GAPS item 6): the four
 * best-documented storeships — Niantic, Apollo, Euphemia, General
 * Harrison — now have explicit ship_arrival events (data/events.jsonl,
 * baked via tools/build-events.js) and get a distinguishing "derelict/
 * converted" treatment here: a fixed real-world grounding position near
 * their documented cross-streets (clm:shore:8 — afloat/aground amid open
 * water/mud within the cove, NEVER on filled land pre-1851) instead of
 * the generic offshore anchorage arc, a permanent list/heel angle (they
 * were deserted, not actively worked), and an always-on name label.
 * Positions are approximate (only cross-street names survive, not exact
 * lot coordinates) — placed just bayward of Montgomery (the 1846
 * shoreline) at their documented cross streets, verified against the
 * baked heightmap to land in shallow water/mudflat, not on dry land.
 */
var STORESHIP_INFO = (function(){
  var clay = GEO.streetsV.clay, sacramento = GEO.streetsV.sacramento;
  function pos(u,v){ return gridToWorld(u,v); }
  // chipRank: fixed per-ship vertical stagger step for the always-on name
  // chips — the four hulks sit within a block of each other, so their
  // labels stacked/overlapped at most view angles (screening #5 item c).
  return {
    "Niantic":          { pos: pos(90,  clay-16),       list: 0.16, chipRank:0, groundedNote:"grounded at Clay & Sansome" }, // u 70->90 (cove-arc correction 2026-07-12): wet mud, closer to the documented Sansome corner (u=145.7). v clay-4->clay-16 (s67 #49 P12, fill:true): the Central Wharf grows along the foot of Clay (deck centreline z~93); at clay-4 the Niantic's 35m hull swung its bow to z~96, so the deck planking drove straight THROUGH her bow (the "ship-through-the-wharf" offense). clay-16 keeps her in the same wet-mud band (h~-0.06) but drops her bow to z~84, clear of the deck shore edge (z~88.7) — a storeship berthed BESIDE the wharf, not skewered by it.
    "General Harrison": { pos: pos(112, clay-2),        list: 0.11, chipRank:1, groundedNote:"grounded near Battery St, by the Niantic" },
    "Euphemia":         { pos: pos(103, sacramento+4),  list: 0.09, chipRank:2, groundedNote:"berthed near Central Wharf, converted to the town jail" }, // u 85->97 (s22) ->103 (s25 re-projection): keeps her in the wet mud at the tideline — the 31m heightmap's bilinear shore ridge shifted under her when the grid was re-registered (+110/+44) and re-spaced; verified h≈+0.1 (wet mud, not dry) against the re-baked terrain
    "Apollo":           { pos: pos(128, sacramento+6),  list: 0.14, chipRank:3, groundedNote:"beached between Central Wharf and Howison's Pier" }
  };
})();
/* =====================================================================
   DOCUMENTED VESSEL TYPES (s48 ship design upgrade). The newsprint that
   supplies every arrival/departure usually names the rig too ("the brig
   Euphemia", "whaler Niantic", "Am. barque Whiton") — this map is that
   record, extracted from data/events.jsonl's headline/text/quote fields
   per ship name (162 of the 170 in-window vessels carry a documented
   rig). Classes: 0 = full-rigged SHIP (incl. whaleships, packets,
   frigates, steamers — square rig on all three masts is the honest
   silhouette for all of them at this LOD), 1 = BARQUE (square fore/main,
   fore-and-aft mizzen), 2 = BRIG (two masts, square), 3 = SCHOONER
   (fore-and-aft; sloops/scows/launches fold in here — closest silhouette).
   Where the same hull appears under variant spellings each spelling keeps
   its own vote (noisy newsprint; deterministic either way).
   ===================================================================== */
var SHIP_TYPE_RECORD = { "Adams":0,"Adelaide":2,"Alcolk":2,"Alice":3,"America":0,"Angola":1,
  "Anita":1,"Apollo":0,"Armatta":0,"Auais":3,"Bark Angola":1,"Barnstable":0,
  "Baycal":2,"Belfast":2,"Benj. Rush":0,"Brig Henry":2,"Brig Sabine":2,"Brig Silvan":2,
  "Brooklyn":0,"Brutus":0,"COMMODORE SHUBRICK":3,"Cabinet":0,"Cadboro":3,"Cadborough":2,
  "Callao":1,"Caroline":1,"Cayuga":2,"Citizen":0,"Citizens":0,"Clementine":0,
  "Columbia":1,"Columbus":0,"Com. Shubrick":3,"Com. Stockton":2,"Commodore Shubrick":3,"Commodore Stockton":2,
  "Confederacion":0,"Congress":0,"Constantine":2,"Corea":0,"Coreo de Cobija":0,"Correo de Cobija":2,
  "Courier de Varp":0,"Currency Las":3,"Currency Lass":2,"Cyane":0,"Dale":0,"Don Quixot":1,
  "Don Quixote":1,"ELIZABETH":2,"Eagle":0,"Edward":0,"Elizabeth":2,"Erie":0,
  "Euphemia":2,"Euphrates":0,"Everline":2,"FLORA":1,"Ferdinand":0,"Flecha":2,
  "Fletcher":2,"Flora":0,"Francisca":2,"Francisco":3,"Gen. Kearny":3,"General Harrison":0,
  "Georgiana":1,"Greyhound":3,"Guypuacuana":1,"Guypuscuana":1,"Haalilio":3,"Henry":2,
  "Herald":0,"Honolulu":3,"Huntress":0,"INDEPENDENCE":0,"Independence":0,"Indiana":3,
  "Isaac Howland":0,"J. R. S.":2,"Janet":1,"Janette":1,"Japan":0,"Joven Guipiscoana":1,
  "Joven Guipuzcoana":1,"Julia":3,"Julian":2,"K. Carter":3,"Kamehameha III":3,"Lady Adams":2,
  "Laura Ann":2,"Levant":0,"Lexington":0,"Loo Choo":0,"Louia Perry":2,"Louise":2,
  "MARY":3,"Magnet":0,"Magnolia":0,"Malek Adhel":2,"Maria Helena":0,"Maria Teresa":2,
  "Mary":3,"Mary Ann":2,"Mary Frances":0,"Mary Francis":0,"Matilda":3,"Moscow":1,
  "Mount Vernon":0,"Mt. Vernon":0,"Naslednich":1,"Natalia":1,"Niantic":0,"Obed Mitchell":0,
  "Ochotsk":2,"Ochotz":2,"Olga":1,"Orbed Mitchell":0,"Pacifico":2,"Parachute":0,
  "Paramatta":1,"Peacock":3,"Portsmouth":0,"Preble":0,"Prescott":0,"Prima Vera":2,
  "Providence":2,"Rhone":0,"Roman":0,"S S, Taylor":2,"S. S. Taylor":3,"SS California":0,
  "STERLING":0,"Sabine":2,"Saganaduck":3,"Santa Cruz":3,"Savannah":0,"Sloop rigged Scow":3,
  "Southampton":0,"Spy":2,"Star":3,"Starling":3,"Susan Drew":0,"Sweeden":0,
  "Tasso":1,"Tepic":2,"Tepid":2,"Tho's. H. Perkins":0,"Thomas H. Benton":2,"Thomas H. Perkins":0,
  "Thomas H. Pirkins":0,"Toulon":1,"Triaad":0,"Triad":0,"Trovador":2,"Veloz":2,
  "Vesper":0,"Virginia":0,"WHITON":1,"Wave":3,"Whiton":1,"Xylon":0 };
/* PERIOD-MIX TABLE for vessels whose rig the record never names — the 8
   undocumented in-window ships plus every coverage-gap fill arrival
   (fill:true — these weights are ASSUMED, not documented per hull). The
   weights are this corpus's own documented-rig ratio (162 typed vessels:
   66 ship / 25 barque / 44 brig / 27 schooner = .41/.15/.27/.17), which
   also matches the mixed square-rig majority of the 1849 SF arrival
   aggregates. Deterministic draw per ship name / fill index. */
var SHIP_FILL_MIX = [ [0,0.41],[1,0.15],[2,0.27],[3,0.17] ];
function shipTypeFromRoll(h){ // h in [0,1)
  var acc = 0;
  for(var i=0;i<SHIP_FILL_MIX.length;i++){ acc += SHIP_FILL_MIX[i][1]; if(h < acc) return SHIP_FILL_MIX[i][0]; }
  return 0;
}
// PRE-RUSH SHIP CURVE fix (task #28, 2026-07-11): "anchored forever once a
// departure is never mentioned again" is the correct reading of the record
// ONLY once desertion is actually the documented norm — timeline-spine.md:
// "1848-10 (~) — the reflux: ... ship arrivals resume (crews still desert
// wholesale — the ghost fleet begins)". Before that, the corpus is full of
// ordinary Mexican-American-War-era naval/coastal-packet traffic (Congress,
// Cyane, Savannah, Dale, Lexington, "Commodore Stockton"/"Commodore
// Shubrick", etc. — repeat callers on routine patrol/mail runs) whose
// LAST recorded mention in this thin pre-Dec-1849 corpus is often an
// arrival simply because no follow-up departure notice survived — not
// because the vessel was abandoned. Applying the ghost-fleet assumption
// that far back inflated the anchored count to ~94-95 ships by Jan 1848
// (verified against app/events-1846-49.js's own baked ship events), vs.
// the documented reality of a pre-rush cove holding a handful (research/
// timeline-spine.md's own baseline: a ~200-person trading village) and
// rush arrivals only beginning ~Feb 1849, ~200 by June/July 1849 ("By June,
// ~200 ships stand abandoned in Yerba Buena Cove" — timeline-spine.md
// 1849-06), ramping toward the ~566 Dec-1849 peak the fill-traffic system
// below already targets. Fix: a visit with no recorded departure gets a
// bounded, plausible turnaround (same distribution style fillShipVisits()
// uses) instead of "anchored forever" UNLESS its arrival falls at/after
// GHOST_FLEET_START — the one exception is a visit's OWN later re-arrival
// (the consecutive-arrival branch below), which is always bounded: the
// ship logically must have left to come back, ghost-fleet era or not.
var GHOST_FLEET_START = eventDateToSimDay("1848-10-01");
function boundedShipStay(arriveDay){ return arriveDay + 20 + rngBuild()*50; }
var shipVisits = (function buildShipVisits(){
  var DEDUP_DAYS = 21;
  var byShip = {};
  EVENTS_RAW.forEach(function(e){
    if((e.type!=="ship_arrival" && e.type!=="ship_departure") || !e.ship) return;
    (byShip[e.ship] = byShip[e.ship]||[]).push(e);
  });
  var visits = [];
  Object.keys(byShip).forEach(function(name){
    var evs = byShip[name].slice().sort(function(a,b){ return a.simDay-b.simDay; });
    var seq = [];
    evs.forEach(function(e){
      var last = seq[seq.length-1];
      if(last && last.type===e.type && (e.simDay-last.simDay)<DEDUP_DAYS) return;
      seq.push(e);
    });
    var pendingArrive = null;
    seq.forEach(function(e){
      if(e.type==="ship_arrival"){
        // a second arrival with no departure in between: the ship
        // necessarily left and came back — always bounded, any era.
        if(pendingArrive!==null) visits.push({ ship:name, arrive:pendingArrive, depart:boundedShipStay(pendingArrive) });
        pendingArrive = e.simDay;
      } else {
        // BUG FIX (2026-07-10, ghost-fleet P0): a documented departure with
        // no matching prior arrival (very plausible — the corpus's coverage
        // is thin pre-Dec-1849, grounding.md's own COVERAGE-GAP RULE) used
        // to be stored as arrive:null, and shipDesiredState() read that as
        // "pre-existing at window open" — rendering the ship anchored from
        // day one of the sim (Jul 1846), regardless of how late its real
        // departure actually was. The record's silence is about *when* it
        // arrived, not *whether* it did, so per the coverage-gap rule this
        // fills the silence with a plausible recent arrival instead of
        // reading it as "since the beginning of recorded time": inferred
        // as departure minus a typical stay (same 20-170 day distribution
        // fillShipVisits() below already uses for simulated traffic),
        // floored at 0 so it can never predate the sim's own start.
        var inferredArrive = pendingArrive===null ? Math.max(0, e.simDay - (20+rngBuild()*150)) : pendingArrive;
        visits.push({ ship:name, arrive:inferredArrive, depart:e.simDay, arriveInferred:pendingArrive===null });
        pendingArrive = null;
      }
    });
    if(pendingArrive!==null){
      // PRE-RUSH SHIP CURVE fix: only pre-ghost-fleet-era leftover arrivals
      // get bounded; from GHOST_FLEET_START on, "no departure ever
      // recorded" really does mean the documented desertion pattern —
      // stays anchored, same as before this fix.
      visits.push({ ship:name, arrive:pendingArrive, depart: pendingArrive<GHOST_FLEET_START ? boundedShipStay(pendingArrive) : null });
    }
  });
  visits.forEach(function(v){
    v.pathJitter = rngBuild();
    v.exitNorth = rngBuild()<0.5;
    // s48 ship design upgrade: 4 vessel classes (0=full-rigged ship, 1=barque,
    // 2=brig, 3=schooner). Documented ships carry their recorded rig
    // (SHIP_TYPE_RECORD, from the arrival notices themselves); the few
    // undocumented ones draw deterministically per ship NAME from the
    // period-mix table, so a given vessel keeps the same silhouette across
    // arrivals/departures either way.
    v.shipType = SHIP_TYPE_RECORD[v.ship] != null ? SHIP_TYPE_RECORD[v.ship]
               : shipTypeFromRoll((cyrb128("shiptype-"+v.ship)[0] >>> 8) / 16777216);
    v._state = "future"; v._anchorPos = null; v._anchorIdx = -1; v._anchorYaw = rngBuild()*Math.PI*2;
    // WORLD-P0 fix: named storeships get a fixed documented grounding spot
    // + permanent list angle instead of the generic anchorage arc/slot —
    // only applies to the specific visit that never departs (the real
    // ship's earlier ordinary trading visits, if any, are unaffected).
    if(STORESHIP_INFO[v.ship] && v.depart===null) v.storeship = STORESHIP_INFO[v.ship];
  });
  visits.sort(function(a,b){ return (a.arrive!==null?a.arrive:-1) - (b.arrive!==null?b.arrive:-1); });
  return visits;
})();

// P0-2 fix (2026-07-10, Director's screening): __P1850.ships reports 497
// anchored by Sept 1849, climbing to a documented peak of 566 (Dec 1 1849,
// the sim's own data — buildShipVisits()+fillShipVisits against the real
// 1849 aggregate arrival rate) — SHIP_CAP+MAST_CAP stays at a combined 800,
// comfortably above the documented in-sim peak with headroom to spare, and
// the anchorage lattice below supplies 1000+ distinct depth-checked
// moorings so nothing ever wraps onto a reused slot.
var SHIP_CAP = 130;         // full-hull rendered ships, per spec
var MAST_CAP = 670;         // simplified mast-cluster overflow ("the forest of masts")

/* =====================================================================
   SHIP NAVIGATION (sprint #29, 2026-07-11) — WATER-ONLY ROUTING.
   The old single quadratic bezier (gate -> "Alcatraz" control -> anchor)
   cut straight across the peninsula's NE corner: sampled against the
   baked heightmap it ran 34/101 samples over dry land, topping Telegraph
   Hill at h=+42m on final approach (the user report: "ships sail
   straight through the peninsula"). Ships now sail a WAYPOINT CHANNEL
   derived from the real geography — mid-strait from the Golden Gate,
   deep water south of Alcatraz, along the north shore with 300m+
   clearance (clearing the charted rock/islet at ~(-1200,-1650)),
   rounding Clark's Point (easternmost shallow in the bake x=410; the
   channel rounds it abeam at x~850) south into Yerba Buena cove.
   The channel is DATA — a Catmull-Rom-smoothed waypoint polyline plus a
   corridor width: each ship steers along it with a per-ship lateral
   offset (±SHIP_LATERAL_MAX) and a slight period tack wiggle, both
   tapering to zero on final approach. The full corridor was validated
   against the baked terrain offline (min depth 2.2m at ±65m laterals)
   and is re-audited at every load (validateShipChannelOnBuild below;
   __P1850.channelAudit / __P1850.sailAudit for QA).
   ===================================================================== */
var SHIP_GATE = { x:-4000, z:-3450 };        // the Golden Gate
var SHIP_NORTH_EXIT = { x:-2500, z:-5300 };  // up-bay departures (Sacramento/Benicia way)
var SHIP_CHANNEL_WPTS = [
  SHIP_GATE,
  { x:-3050, z:-2650 },  // mid-strait, angling SE
  { x:-2150, z:-2150 },  // deep water, well south of Alcatraz (Alcatraz bakes at ~(-1350,-3450))
  { x:-1150, z:-1950 },  // clears the North Beach flats and the bay islet at (-1200,-1650)
  { x: -250, z:-1720 },  // off the north shore (land reaches z=-1280..-1360 along here)
  { x:  620, z:-1620 },  // begin rounding Clark's Point
  { x:  850, z:-1180 },  // abeam the point, ~440m off its easternmost shallow
  { x:  790, z: -820 }   // cove gate: the mouth of Yerba Buena cove
];
var SHIP_NORTH_WPTS = [
  { x:  790, z: -820 },  // shares the cove gate, reverses round the point, then up-bay
  { x:  780, z:-1180 },
  { x:  540, z:-1600 },
  { x:  280, z:-2300 },
  { x: -450, z:-3600 },
  { x:-1400, z:-4900 },
  SHIP_NORTH_EXIT
];
var SHIP_LATERAL_MAX = 45; // per-ship corridor offset (m); with the ±20m tack wiggle this stays inside the validated ±65m wet corridor
function smoothShipPath(wpts, step){ // Catmull-Rom through the waypoints -> dense arc-length polyline
  var raw = [];
  function cr(p0,p1,p2,p3,t){
    var t2=t*t, t3=t2*t;
    return { x: 0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
             z: 0.5*((2*p1.z)+(-p0.z+p2.z)*t+(2*p0.z-5*p1.z+4*p2.z-p3.z)*t2+(-p0.z+3*p1.z-3*p2.z+p3.z)*t3) };
  }
  for(var i=0;i<wpts.length-1;i++){
    var p0=wpts[Math.max(0,i-1)], p1=wpts[i], p2=wpts[i+1], p3=wpts[Math.min(wpts.length-1,i+2)];
    var n = Math.max(2, Math.ceil(Math.hypot(p2.x-p1.x, p2.z-p1.z)/step));
    for(var k=(i===0?0:1); k<=n; k++) raw.push(cr(p0,p1,p2,p3,k/n));
  }
  var pts=[{x:raw[0].x, z:raw[0].z, s:0}], s=0;
  for(var j=1;j<raw.length;j++){
    s += Math.hypot(raw[j].x-raw[j-1].x, raw[j].z-raw[j-1].z);
    pts.push({x:raw[j].x, z:raw[j].z, s:s});
  }
  return { pts:pts, len:s };
}
function shipPolyAt(poly, s){ // position + unit tangent at arc length s (clamped)
  var pts = poly.pts;
  s = clamp(s, 0, poly.len);
  var lo=0, hi=pts.length-1;
  while(hi-lo>1){ var mid=(lo+hi)>>1; if(pts[mid].s<=s) lo=mid; else hi=mid; }
  var a=pts[lo], b=pts[Math.min(lo+1, pts.length-1)];
  var seg = Math.max(1e-6, b.s-a.s), t=(s-a.s)/seg;
  var tx=(b.x-a.x)/seg, tz=(b.z-a.z)/seg;
  var tl = Math.hypot(tx,tz)||1;
  return { x:lerp(a.x,b.x,t), z:lerp(a.z,b.z,t), tx:tx/tl, tz:tz/tl };
}
var SHIP_CHANNEL = smoothShipPath(SHIP_CHANNEL_WPTS, 25);
var SHIP_NORTH = smoothShipPath(SHIP_NORTH_WPTS, 25);

/* ---------------------------------------------------------------------
   ANCHORAGE GROWTH (sprint #29) — historically the fleet moored in a
   dense raft off the town's own frontage and spread bay-ward as 1849
   filled the cove. Slots are a jittered hex LATTICE over the cove's
   real deep water (baked-heightmap depth > 2m only), SORTED BY DISTANCE
   FROM THE PRIME ANCHORAGE SEED off Clay/Montgomery. Assignment
   (assignAnchorSlots below) is a build-time deterministic chronological
   sweep: each visit takes the nearest FREE slot whose hull clears every
   already-anchored hull (oriented segment-segment check with true-scale
   footprints), the four grounded storeships, and the Central Wharf
   corridor; a mooring frees when its occupant weighs anchor. The fleet
   therefore fills OUTWARD from the prime anchorage as 1849 progresses
   (measured on this lattice: 12 ships = raft radius ~50m, Jul-1849
   ~200 = ~275m, Sept ~352 = ~406m, Dec ~566 = ~577m) and every ship
   keeps its slot across any scrub/rewind — the sweep runs once off the
   visit list at build, never off runtime frame order.
   --------------------------------------------------------------------- */
var ANCHOR_SEED = { x: shorelineX(0)+230, z: 0 }; // prime anchorage off the Clay/Montgomery frontage (depth ~4m)
var ANCHOR_SLOTS = (function(){
  var PITCH = 29; // mooring spacing (m) — period rafting density; the sweep's collision check thins where hulls would truly touch
  var slots = [], rowI = 0;
  var cw = gridToWorld(GEO.streetsU.montgomery, GEO.streetsV.clay); // Central Wharf line (foot of Clay)
  var cwTipX = cw.x;
  for(var ws=0; ws<80; ws++){ cwTipX += 3; if(terrainHeight(cwTipX, cw.z) < 0) break; }
  cwTipX += 310; // documented full deck (244m) + swing clearance
  var hulks = Object.keys(STORESHIP_INFO).map(function(k){ return STORESHIP_INFO[k].pos; });
  for(var z=-950; z<=1060; z+=PITCH*0.87){
    rowI++;
    var wx = shorelineX(z)-260;
    for(var st=0; st<200; st++){ wx += 4; if(terrainHeight(wx,z)<0) break; } // real water's edge, not the analytic seed
    for(var c=0; c<19; c++){
      var x = wx + 55 + c*PITCH + (rowI%2)*PITCH*0.5 + (hash2(rowI*3.1, c*7.7)-0.5)*8;
      var zz = z + (hash2(rowI*1.7, c*2.3)-0.5)*8;
      if(terrainHeight(x,zz) >= -2) continue;              // depth: below sea level + margin, real heightmap
      // s67 (#49) P12: keep the Central Wharf's water clear at HULL clearance,
      // not slot-centre — a slot centre just outside the deck edge could still
      // swing a 35m hull through the planking (the "ship-through-the-wharf"
      // offense). Reserve half the corridor + a full hull half-length (17.5m)
      // so no accepted hull segment can ever reach the deck.
      if(Math.abs(zz-cw.z) < 44 && x < cwTipX) continue;   // 26m deck corridor + ~18m hull half-length
      var nearHulk = false;
      for(var hk=0; hk<hulks.length; hk++){ var hdx=hulks[hk].x-x, hdz=hulks[hk].z-zz; if(hdx*hdx+hdz*hdz < 55*55){ nearHulk = true; break; } }
      if(nearHulk) continue;
      // s67 (#49) P13: the anchorage rides ONE shared wind/tide vector ±15°
      // (the whole fleet swings together). Base heading is bow-NW into the
      // ebb; the per-slot scatter was ±0.45 rad (±25.8°, ~52° total spread)
      // — over the ±15° law. Tightened to ±0.26 rad so heading spread ≤30°
      // total (audited by placement.anchorageHeading). fill:true tunable.
      slots.push({ x:x, z:zz, d:Math.hypot(x-ANCHOR_SEED.x, zz-ANCHOR_SEED.z),
                   yaw: Math.atan2(-1,-1) + (hash2(c*1.3+rowI*5.5, 13.7)-0.5)*0.52 }); // bow NW-ish into wind/ebb, ±15° wind/tide scatter
    }
  }
  slots.sort(function(a,b){ return a.d-b.d; });
  return slots;
})();

/* true-scale hull footprints per vessel class (matches the SHIP_CLASS
   dims the prefab hulls below are built at) for the sweep's collision
   check: 0 full-rigged ship 35m, 1 barque 30m, 2 brig 26m, 3 schooner 20m */
var SHIP_DIMS = [ {hl:17.5, hb:4.6}, {hl:15.0, hb:4.3}, {hl:13.0, hb:4.1}, {hl:10.0, hb:3.4} ];
function _ptSegDistSq(px,pz, ax,az, bx,bz){
  var vx=bx-ax, vz=bz-az, wx=px-ax, wz=pz-az;
  var c1 = vx*wx+vz*wz;
  if(c1<=0) return wx*wx+wz*wz;
  var c2 = vx*vx+vz*vz;
  var t = c1>=c2 ? 1 : c1/c2;
  var qx=ax+vx*t-px, qz=az+vz*t-pz;
  return qx*qx+qz*qz;
}
function segSegDistSq(ax,az,bx,bz, cx,cz,dx,dz){
  function orient(ox,oz,px,pz,qx,qz){ return (px-ox)*(qz-oz)-(pz-oz)*(qx-ox); }
  var o1=orient(ax,az,bx,bz,cx,cz), o2=orient(ax,az,bx,bz,dx,dz),
      o3=orient(cx,cz,dx,dz,ax,az), o4=orient(cx,cz,dx,dz,bx,bz);
  if(((o1>0)!==(o2>0)) && ((o3>0)!==(o4>0))) return 0; // crossing hulls
  return Math.min(_ptSegDistSq(ax,az,cx,cz,dx,dz), _ptSegDistSq(bx,bz,cx,cz,dx,dz),
                  _ptSegDistSq(cx,cz,ax,az,bx,bz), _ptSegDistSq(dx,dz,ax,az,bx,bz));
}
function hullSeg(x,z,yaw,hl){ var dx=Math.sin(yaw)*hl, dz=Math.cos(yaw)*hl; return [x-dx,z-dz,x+dx,z+dz]; }

/* final approach: leave the channel at the cove gate, stand toward a
   point radially offshore of the assigned mooring (the raft grows
   outward from the seed, so a new arrival's slot is on the fringe and
   the stand-in crosses open water, not the raft), then luff up the last
   length onto the anchor heading. */
function shipStandoff(dest){
  var so = { x: dest.x+220, z: dest.z }; // radially offshore — the cove faces east
  for(var i=0; i<20 && terrainHeight(so.x, so.z) > -2.5; i++){ so.x = lerp(so.x, dest.x, 0.2); so.z = lerp(so.z, dest.z, 0.2); }
  return so;
}
function ensureApproach(v){
  if(v._appPolyCache) return v._appPolyCache;
  var dest = v._anchorPos;
  var gateEnd = SHIP_CHANNEL.pts[SHIP_CHANNEL.pts.length-1];
  v._appPolyCache = smoothShipPath([ {x:gateEnd.x, z:gateEnd.z}, shipStandoff(dest), {x:dest.x, z:dest.z} ], 18);
  return v._appPolyCache;
}
function approachLenEstimate(dest){
  var so = shipStandoff(dest);
  var gateEnd = SHIP_CHANNEL.pts[SHIP_CHANNEL.pts.length-1];
  return (Math.hypot(so.x-gateEnd.x, so.z-gateEnd.z) + Math.hypot(dest.x-so.x, dest.z-so.z)) * 1.02;
}

/* the sailing position: composite path = channel + final approach
   (arrivals), or approach reversed + channel/north-exit (departures),
   with the per-ship lateral corridor offset + tack wiggle tapering to
   zero over the last 220m so every hull converges onto its mooring. */
function shipSailPos(v, t, arriving){
  var Lc = SHIP_CHANNEL.len, La = v._appLen || approachLenEstimate(v._anchorPos);
  var L = arriving ? Lc+La : La + (v.exitNorth ? SHIP_NORTH.len : Lc);
  var s = clamp(t,0,1)*L, b, remAnchor;
  if(arriving){
    if(s <= Lc) b = shipPolyAt(SHIP_CHANNEL, s);
    else { var ap = ensureApproach(v); b = shipPolyAt(ap, (s-Lc)/La*ap.len); }
    remAnchor = L-s;
  } else {
    if(s <= La){ var ap2 = ensureApproach(v); b = shipPolyAt(ap2, (1-s/La)*ap2.len); b.tx=-b.tx; b.tz=-b.tz; }
    else if(v.exitNorth) b = shipPolyAt(SHIP_NORTH, s-La);
    else { b = shipPolyAt(SHIP_CHANNEL, Lc-(s-La)); b.tx=-b.tx; b.tz=-b.tz; }
    remAnchor = s;
  }
  var taper = clamp(remAnchor/220, 0, 1);
  var tack = (10 + hash2(v.pathJitter*91.7, 4.1)*10) * Math.sin(s*0.019 + v.pathJitter*6.283); // slight period tack wiggle
  var lat = ((v.pathJitter-0.5)*2*SHIP_LATERAL_MAX + tack) * taper;
  return { x: b.x - b.tz*lat, z: b.z + b.tx*lat };
}
/* ANCHORAGE ASSIGNMENT SWEEP — deterministic, build-time (rewind-exact:
   runs once over the arrival-sorted visit list; runtime frame order can
   never change who moors where). Also fixes a latent rewind bug in the
   old runtime alloc/free: scrubbing BACKWARD across a departure used to
   leave the freed slot re-issuable while the original ship re-anchored
   on it — two hulls on one mooring. Called below, after fillShipVisits
   exists. */
function assignAnchorSlots(allVisits){
  var order = allVisits.slice().sort(function(a,b){ return (a.arrive-b.arrive) || (a.ship<b.ship?-1:(a.ship>b.ship?1:0)); });
  var occ = {};      // slotIdx -> {seg, hb} of the hull riding there
  var releases = []; // {day, idx} — mooring frees when its occupant weighs anchor
  var CELL = 64, grid = {};
  ANCHOR_SLOTS.forEach(function(sl,i){ var key = Math.floor(sl.x/CELL)+","+Math.floor(sl.z/CELL); (grid[key]=grid[key]||[]).push(i); });
  function neighborsOf(i){
    var sl = ANCHOR_SLOTS[i], out = [], cx = Math.floor(sl.x/CELL), cz = Math.floor(sl.z/CELL);
    for(var gx=cx-1; gx<=cx+1; gx++) for(var gz=cz-1; gz<=cz+1; gz++){
      var arr = grid[gx+","+gz]; if(arr) out = out.concat(arr);
    }
    return out;
  }
  order.forEach(function(v){
    for(var r=releases.length-1; r>=0; r--){ if(releases[r].day <= v.arrive){ delete occ[releases[r].idx]; releases.splice(r,1); } }
    if(v.storeship){
      // documented grounding spot at the tideline — never on the lattice
      v._anchorPos = v.storeship.pos; v._anchorYaw = 0.3; v._anchorIdx = -2;
    } else {
      var dims = SHIP_DIMS[v.shipType], idx = -1;
      for(var i=0;i<ANCHOR_SLOTS.length;i++){
        if(occ[i]) continue;
        var sl = ANCHOR_SLOTS[i];
        var seg = hullSeg(sl.x, sl.z, sl.yaw, dims.hl);
        var ok = true, nb = neighborsOf(i);
        for(var n2=0;n2<nb.length;n2++){
          var o = occ[nb[n2]]; if(!o) continue;
          var need = dims.hb + o.hb + 3; // beam-to-beam clearance
          if(segSegDistSq(seg[0],seg[1],seg[2],seg[3], o.seg[0],o.seg[1],o.seg[2],o.seg[3]) < need*need){ ok = false; break; }
        }
        if(ok){ idx = i; break; } // slots are seed-distance-sorted: first free+clear IS the nearest valid mooring
      }
      if(idx < 0) idx = ANCHOR_SLOTS.length-1; // defensive: the lattice (1000+) far exceeds the ~566 peak
      var slot = ANCHOR_SLOTS[idx];
      occ[idx] = { seg: hullSeg(slot.x, slot.z, slot.yaw, dims.hl), hb: dims.hb };
      v._anchorIdx = idx; v._anchorPos = slot; v._anchorYaw = slot.yaw;
      if(v.depart!==null) releases.push({ day: v.depart+0.05, idx: idx });
    }
    // per-visit sail timing: true path distance / a period working speed
    // (5.0-7.8 knots) -> a full Golden Gate->anchor entrance is ~30-45
    // real minutes at LIVE 1:1 (grounding.md §10), proportionally faster
    // in timelapse (ambient-flow, see updateShips).
    v._speed = 2.6 + hash2((v._anchorIdx+3)*0.77, v.pathJitter*17.3)*1.4; // m/s
    v._appLen = approachLenEstimate(v._anchorPos);
    v._sailInDays = (SHIP_CHANNEL.len + v._appLen)/(v._speed*86400);
    v._sailOutDays = (v._appLen + (v.exitNorth ? SHIP_NORTH.len : SHIP_CHANNEL.len))/(v._speed*86400);
  });
}

/* load-time corridor audit: the channel is derived from the current
   terrain bake's own geography — if a future re-bake moves the shore
   under it, say so loudly instead of silently sailing over land. */
(function validateShipChannelOnBuild(){
  var bad = 0, minD = 99;
  [SHIP_CHANNEL, SHIP_NORTH].forEach(function(poly){
    for(var s=0; s<=poly.len; s+=50){
      var p = shipPolyAt(poly, s);
      for(var o=-65; o<=65; o+=65){
        var h = terrainHeight(p.x - p.tz*o, p.z + p.tx*o);
        if(-h < minD) minD = -h;
        if(h > -1.5) bad++;
      }
    }
  });
  if(bad > 0) console.warn("[verify] ship channel corridor has "+bad+" shallow samples (<1.5m depth) — re-derive SHIP_CHANNEL_WPTS against the current terrain bake");
  else console.log("[verify] ship channel wet end-to-end (min depth "+minD.toFixed(1)+"m at ±65m laterals; "+ANCHOR_SLOTS.length+" anchorage slots, seed d"+Math.round(ANCHOR_SLOTS[0].d)+".."+Math.round(ANCHOR_SLOTS[ANCHOR_SLOTS.length-1].d)+"m)");
})();
function shipDesiredState(v, day){
  // sail windows are per-visit (true path length / period speed, set by
  // assignAnchorSlots) — a ship is "sailing_in" for the ~30-45 sim-minutes
  // its entrance actually takes, anchored ON its documented date.
  if(v.depart!==null){
    if(day >= v.depart+(v._sailOutDays||0.05)) return "done";
    if(day >= v.depart) return "sailing_out";
  }
  // BUG FIX (2026-07-10, ghost-fleet P0): arrive is never null any more —
  // buildShipVisits() now infers a plausible recent arrival (depart minus a
  // typical stay) for the coverage-gap case that used to leave arrive:null
  // here and get read as "anchored since window open." See buildShipVisits().
  if(day >= v.arrive) return "anchored";
  if(day >= v.arrive-(v._sailInDays||0.05)) return "sailing_in";
  return "future";
}

/* =====================================================================
   SHIP HULL/SAIL PREFABS (s48 SHIP DESIGN UPGRADE, 2026-07-11 — retires
   the QA-GATE "squares in a parking lot" silhouette debt). Length runs
   along local Z, bow at +Z, matching this file's yaw=atan2(dx,dz)
   convention. Four true-scale vessel classes, each with:
   - a LOFTED HULL SHELL (7 stations x 4 longitudinal rows: rail / sheer-
     strake band / wale / keel) giving a real sheer line (bow + stern
     rise), a flat transom stern, bulwarks (deck surface sunk 0.8m below
     the rail), and a raked stem — bluff entry on the ship/barque
     (merchantman/whaler hulls), progressively finer + more raked toward
     the schooner (the clipper-bow read);
   - a full spar plan (masts with rake, 2-3 yard tiers on square-rigged
     masts, gaff+boom on fore-and-aft masts, bowsprit on everything) —
     crossed yards are what give the 300-800m mast forest its texture;
   - shroud fans + a forestay ribbon (standing-rigging hint <150m; they
     alias away harmlessly at distance);
   - painted sheer-strake band on ship/barque (the period painted-ports
     look on packets/whalers) for day+night value contrast.
   Dimensions are TRUE SCALE, built directly in meters (no post-scale):
   ship 35m x 8.0m beam (documented range 30-46m; Gen. Harrison 126ft =
   38.4m), barque 30m x 7.4m, brig 26m x 7.0m, schooner 20m x 5.6m —
   geography-shoreline.md's ship-dimension citations. Set sails vs furled
   bundles are separate per-class InstancedMeshes crossfaded by the
   existing non-uniform-Y-scale trick in updateShips(); furled bundles
   hang under the yards at anchor (the ghost fleet reads as laid-up
   shipping, not paper cutouts); deserted storeships ride bare-poled.
   ===================================================================== */
function ShipGeoBuilder(){ this.pos = []; this.col = []; }
ShipGeoBuilder.prototype.tri = function(a,b,c,col){
  this.pos.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]);
  for(var i=0;i<3;i++) this.col.push(col.r,col.g,col.b);
};
ShipGeoBuilder.prototype.quad = function(a,b,c,d,col){ this.tri(a,b,c,col); this.tri(a,c,d,col); };
ShipGeoBuilder.prototype.geo = function(){
  var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.pos),3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.col),3));
  return g;
};
/* fore-and-aft (gaff) sail: a raw quad with a slanted head edge (peak at
   the mast, tapering aft/down), the fore-and-aft rig's distinguishing
   silhouette vs. the square-riggers' rectangles. */
function makeGaffSailGeo(spanZ, hHigh, hLow, color){
  var A=[0,0,0], B=[0,hHigh,0], C=[0,hLow,-spanZ], D=[0,hLow*0.15,-spanZ];
  var tris = [A,B,C, A,C,D];
  var positions = new Float32Array(tris.length*3);
  for(var i=0;i<tris.length;i++){ positions[i*3]=tris[i][0]; positions[i*3+1]=tris[i][1]; positions[i*3+2]=tris[i][2]; }
  var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions,3));
  return colorizeUniform(g,color);
}

/* SHIP_CLASS — the four era classes. stations: z (frac of len, stern -0.5
   -> bow +0.5), w (frac of half-beam), s (deck sheer rise, m), k (keel
   depth frac — rises toward the ends). masts: z frac, h = truck height
   above waterline (m), w spar width, rake (rad, negative = aft), yards =
   [heightFrac-of-h, lenFrac-of-len] tiers, gaff = fore-and-aft spars. */
var SHIP_CLASS = [
  { name:"ship", len:35, beam:8.0, deck:2.7, bulwark:1.0, bowSheer:1.7, sternSheer:1.0, draft:1.8, rakeM:2.2, sprit:11,
    topside:0x362a1d, bottom:0x2b2015, stripe:true, stripeCol:0xd8cfb8, deckCol:0x5f4e38, mast:0x4a3c2c, canvas:0xe2d8bc,
    stations:[ {z:-0.50,w:0.62,s:1.00,k:0.55},{z:-0.35,w:0.90,s:0.45,k:0.90},{z:-0.10,w:1.00,s:0.05,k:1},
               {z: 0.15,w:0.98,s:0.15,k:1},{z: 0.33,w:0.84,s:0.55,k:0.85},{z: 0.45,w:0.52,s:1.15,k:0.60} ],
    masts:[ {z: 0.28, h:24.0, w:0.44, rake:-0.04, yards:[[0.40,0.50],[0.60,0.38],[0.77,0.26]]},
            {z:-0.03, h:27.0, w:0.50, rake:-0.04, yards:[[0.40,0.52],[0.60,0.40],[0.77,0.28]]},
            {z:-0.33, h:21.0, w:0.38, rake:-0.05, yards:[[0.44,0.36],[0.66,0.26]], gaff:{boom:0.26, gaffLen:0.20}} ] },
  { name:"barque", len:30, beam:7.4, deck:2.5, bulwark:0.95, bowSheer:1.5, sternSheer:0.85, draft:1.7, rakeM:1.9, sprit:9.5,
    topside:0x33281c, bottom:0x281e13, stripe:true, stripeCol:0xcfc4a4, deckCol:0x5f4e38, mast:0x4a3c2c, canvas:0xd6c9a6,
    stations:[ {z:-0.50,w:0.60,s:0.85,k:0.55},{z:-0.35,w:0.89,s:0.40,k:0.90},{z:-0.10,w:1.00,s:0.03,k:1},
               {z: 0.15,w:0.97,s:0.14,k:1},{z: 0.33,w:0.82,s:0.50,k:0.85},{z: 0.45,w:0.50,s:1.00,k:0.60} ],
    masts:[ {z: 0.28, h:22.0, w:0.42, rake:-0.04, yards:[[0.40,0.50],[0.61,0.38],[0.78,0.26]]},
            {z:-0.04, h:24.0, w:0.46, rake:-0.04, yards:[[0.40,0.52],[0.61,0.40],[0.78,0.28]]},
            {z:-0.34, h:17.5, w:0.34, rake:-0.06, gaff:{boom:0.30, gaffLen:0.22}} ] }, // yardless mizzen — THE barque tell
  { name:"brig", len:26, beam:7.0, deck:2.3, bulwark:0.90, bowSheer:1.2, sternSheer:0.70, draft:1.6, rakeM:2.0, sprit:10,
    topside:0x3a2e22, bottom:0x2d2318, stripe:false, stripeCol:0x3a2e22, deckCol:0x5f4e38, mast:0x4a3c2c, canvas:0xcfc0a0,
    stations:[ {z:-0.50,w:0.58,s:0.70,k:0.55},{z:-0.34,w:0.88,s:0.30,k:0.90},{z:-0.08,w:1.00,s:0.00,k:1},
               {z: 0.16,w:0.95,s:0.15,k:1},{z: 0.34,w:0.76,s:0.50,k:0.85},{z: 0.46,w:0.42,s:0.90,k:0.60} ],
    masts:[ {z: 0.26, h:20.0, w:0.40, rake:-0.04, yards:[[0.42,0.52],[0.64,0.40],[0.80,0.27]]},
            {z:-0.22, h:21.5, w:0.42, rake:-0.05, yards:[[0.42,0.52],[0.64,0.40]], gaff:{boom:0.28, gaffLen:0.20}} ] },
  { name:"schooner", len:20, beam:5.6, deck:1.9, bulwark:0.70, bowSheer:0.8, sternSheer:0.45, draft:1.3, rakeM:1.6, sprit:7,
    topside:0x33281c, bottom:0x271d12, stripe:false, stripeCol:0x33281c, deckCol:0x63513a, mast:0x453824, canvas:0xc7b48d,
    stations:[ {z:-0.50,w:0.50,s:0.45,k:0.50},{z:-0.33,w:0.80,s:0.20,k:0.85},{z:-0.06,w:1.00,s:0.00,k:1},
               {z: 0.16,w:0.88,s:0.12,k:0.95},{z: 0.32,w:0.62,s:0.35,k:0.80},{z: 0.44,w:0.32,s:0.62,k:0.60} ],
    masts:[ {z: 0.24, h:16.0, w:0.30, rake:-0.12, gaff:{boom:0.34, gaffLen:0.26}},
            {z:-0.20, h:17.5, w:0.32, rake:-0.12, gaff:{boom:0.38, gaffLen:0.28}} ] }
];
// derived bowsprit geometry anchors (steeve ~17 deg, tip at 0.80 of spar length)
SHIP_CLASS.forEach(function(C){
  var a = 0.30;
  C.spritAngle = a;
  C.spritBase = { y: C.deck + C.bulwark + C.bowSheer - 0.6, z: C.len*0.5 + C.rakeM*0.55 };
  C.spritTip  = { y: C.spritBase.y + Math.sin(a)*C.sprit*0.80, z: C.spritBase.z + Math.cos(a)*C.sprit*0.80 };
});
function makeShipHullGeo(ci){
  var C = SHIP_CLASS[ci], L = C.len, hb = C.beam/2, deckTop = C.deck + C.bulwark;
  var topC = new THREE.Color(C.topside), botC = new THREE.Color(C.bottom),
      bandC = new THREE.Color(C.stripe ? C.stripeCol : C.topside),
      deckC = new THREE.Color(C.deckCol), mastC = new THREE.Color(C.mast);
  var B = new ShipGeoBuilder();
  // longitudinal rows over the station table + a raked stem appended as a
  // degenerate (zero-width) station so the same loft loop closes the bow
  var railR=[], bandR=[], waleR=[], keelR=[], deckR=[];
  C.stations.forEach(function(s){
    var z = s.z*L, w = s.w*hb;
    railR.push([w*0.94, deckTop+s.s,      z]);
    bandR.push([w,      deckTop+s.s-0.55, z]);
    waleR.push([w*0.90, 0.45,             z]);
    keelR.push([0,     -C.draft*(s.k!=null?s.k:1), z]);
    deckR.push([w*0.96, deckTop+s.s-0.80, z]);
  });
  var stemTopZ = L*0.5 + C.rakeM, stemBotZ = L*0.485;
  railR.push([0, deckTop+C.bowSheer,      stemTopZ]);
  bandR.push([0, deckTop+C.bowSheer-0.9,  lerp(stemBotZ, stemTopZ, 0.72)]);
  waleR.push([0, 0.30,                    lerp(stemBotZ, stemTopZ, 0.30)]);
  keelR.push([0, -C.draft*0.55,           stemBotZ]);
  deckR.push([0, deckTop+C.bowSheer-0.80, lerp(stemBotZ, stemTopZ, 0.85)]);
  var rows = [railR, bandR, waleR, keelR], rowCols = [bandC, topC, botC];
  function mx(p){ return [-p[0], p[1], p[2]]; }
  for(var i=0;i<railR.length-1;i++){
    for(var r=0;r<3;r++){
      var a=rows[r][i], b=rows[r][i+1], c=rows[r+1][i+1], d=rows[r+1][i];
      B.quad(a,b,c,d, rowCols[r]);                  // starboard, +X out
      B.quad(mx(d),mx(c),mx(b),mx(a), rowCols[r]);  // port mirror
    }
    B.quad(mx(deckR[i]), mx(deckR[i+1]), deckR[i+1], deckR[i], deckC); // deck, +Y (0.8m below the rail = bulwark)
  }
  // flat transom stern cap (-Z out)
  B.quad(mx(railR[0]), railR[0], bandR[0], mx(bandR[0]), bandC);
  B.quad(mx(bandR[0]), bandR[0], waleR[0], mx(waleR[0]), topC);
  B.tri(mx(waleR[0]), waleR[0], keelR[0], botC);
  // shroud lines (standing-rigging hint <150m): two thin ribbons per side
  // per mast, rail to masthead — reads as rigging, never as canvas
  function ribbon(a, b, w, col){
    var dx = b[0]-a[0], dz = b[2]-a[2], dl = Math.hypot(dx,dz)||1;
    var ox = -dz/dl*w, oz = dx/dl*w; // horizontal offset perpendicular to the run
    B.quad([a[0]+ox,a[1],a[2]+oz],[b[0]+ox,b[1],b[2]+oz],[b[0]-ox,b[1],b[2]-oz],[a[0]-ox,a[1],a[2]-oz], col);
    B.quad([a[0]-ox,a[1],a[2]-oz],[b[0]-ox,b[1],b[2]-oz],[b[0]+ox,b[1],b[2]+oz],[a[0]+ox,a[1],a[2]+oz], col);
  }
  C.masts.forEach(function(m){
    var zM = m.z*L, yTop = m.h*0.64;
    var top = [0, yTop, zM + Math.tan(m.rake||0)*(yTop - C.deck)];
    [-1,1].forEach(function(sd){
      ribbon([sd*hb*0.86, deckTop, zM-1.8], top, 0.05, mastC);
      ribbon([sd*hb*0.86, deckTop, zM+1.8], top, 0.05, mastC);
    });
  });
  var fm = C.masts[0];
  var sA = [0, fm.h*0.86, fm.z*L], sB = [0, C.spritTip.y, C.spritTip.z];
  B.quad([ 0.05,sA[1],sA[2]], [ 0.05,sB[1],sB[2]], [-0.05,sB[1],sB[2]], [-0.05,sA[1],sA[2]], mastC);
  B.quad([-0.05,sA[1],sA[2]], [-0.05,sB[1],sB[2]], [ 0.05,sB[1],sB[2]], [ 0.05,sA[1],sA[2]], mastC);
  var parts = [B.geo()];
  // bowsprit (every class carries one — square-riggers AND schooners)
  var sp = makeBoxLocal(0.30, 0.30, C.sprit, mastC);
  sp.rotateX(-C.spritAngle);
  sp.translate(0, C.spritBase.y + Math.sin(C.spritAngle)*C.sprit*0.30,
                  C.spritBase.z + Math.cos(C.spritAngle)*C.sprit*0.30);
  parts.push(sp);
  // spar plan: raked masts, yard tiers (square rig), boom+gaff (fore-and-aft)
  C.masts.forEach(function(m){
    var zM = m.z*L;
    var g = makeBoxLocal(m.w, m.h - C.deck, m.w, mastC);
    g.rotateX(m.rake||0);
    g.translate(0, C.deck, zM);
    parts.push(g);
    if(m.yards) m.yards.forEach(function(yd, ti){
      var yAbs = yd[0]*m.h, zAt = zM + Math.tan(m.rake||0)*(yAbs - C.deck);
      var yw = ti===0 ? 0.28 : 0.22;
      var y = makeBoxLocal(yd[1]*L, yw, yw, mastC);
      bake(y, new THREE.Vector3(0, yAbs-yw/2, zAt+0.15));
      parts.push(y);
    });
    if(m.gaff){
      var bl = m.gaff.boom*L;
      var boom = makeBoxLocal(0.20, 0.20, bl, mastC);
      bake(boom, new THREE.Vector3(0, C.deck+0.95, zM - bl/2 + 0.5));
      parts.push(boom);
      var gl = m.gaff.gaffLen*L;
      var gf = makeBoxLocal(0.15, 0.15, gl, mastC);
      gf.rotateX(0.55); // aft end rises
      gf.translate(0, m.h*0.62 + Math.sin(0.55)*gl/2, zM - Math.cos(0.55)*gl/2 + 0.3);
      parts.push(gf);
    }
  });
  // deck furniture hint (house aft, cargo hatch forward)
  var house = makeBoxLocal(C.beam*0.34, 0.9, L*0.14, new THREE.Color(C.deckCol).multiplyScalar(1.18));
  bake(house, new THREE.Vector3(0, deckTop-0.8, -L*0.22)); parts.push(house);
  var hatch = makeBoxLocal(C.beam*0.30, 0.35, L*0.10, new THREE.Color(C.deckCol).multiplyScalar(0.80));
  bake(hatch, new THREE.Vector3(0, deckTop-0.8, L*0.12)); parts.push(hatch);
  return mergeGeoms(parts);
}
function makeShipSailGeo(ci){
  var C = SHIP_CLASS[ci], L = C.len, base = new THREE.Color(C.canvas);
  var parts = [], tone = 0;
  function col(){ tone++; return base.clone().multiplyScalar(0.92 + hash2(tone*3.7, 5.5)*0.14); } // per-panel tone
  C.masts.forEach(function(m){
    var zM = m.z*L;
    if(m.yards){
      var prevY = C.deck + 1.6;
      m.yards.forEach(function(yd){
        var yAbs = yd[0]*m.h, zAt = zM + Math.tan(m.rake||0)*(yAbs - C.deck);
        var top = yAbs - 0.25, h = top - prevY;
        if(h > 0.8){
          var p = colorizeUniform(new THREE.PlaneGeometry(yd[1]*L*0.92, h).toNonIndexed(), col());
          p.translate(0, (top+prevY)/2, zAt+0.45);
          parts.push(p);
        }
        prevY = yAbs + 0.25;
      });
    }
    if(m.gaff){
      var hH = (m.h - C.deck)*0.60;
      parts.push(bake(makeGaffSailGeo(m.gaff.boom*L*0.85, hH, hH*0.75, col()), new THREE.Vector3(0, C.deck+1.15, zM+0.2)));
    }
  });
  // jibs on the fore stay (all classes)
  var fm = C.masts[0], zF = fm.z*L, tip = C.spritTip;
  var B = new ShipGeoBuilder();
  B.tri([0, tip.y+0.2, tip.z-0.4], [0, fm.h*0.82, zF+0.6], [0, C.deck+0.6, zF+1.6], col());
  B.tri([0, tip.y+0.15, lerp(tip.z, zF, 0.35)], [0, fm.h*0.62, zF+0.4], [0, C.deck+0.5, zF+2.4], col());
  parts.push(B.geo());
  return mergeGeoms(parts);
}
function makeShipFurledGeo(ci){
  var C = SHIP_CLASS[ci], L = C.len, parts = [], i = 0;
  var canvasC = new THREE.Color(C.canvas).multiplyScalar(0.78); // rolled canvas, dust-grey
  C.masts.forEach(function(m){
    var zM = m.z*L;
    if(m.yards) m.yards.forEach(function(yd){
      i++;
      var yAbs = yd[0]*m.h, zAt = zM + Math.tan(m.rake||0)*(yAbs - C.deck);
      var b = makeBoxLocal(yd[1]*L*0.86, 0.34, 0.44, canvasC.clone().multiplyScalar(0.92 + hash2(i*3.1, 7.7)*0.16));
      bake(b, new THREE.Vector3(0, yAbs-0.50, zAt+0.15));
      parts.push(b);
    });
    if(m.gaff){
      i++;
      var bl = m.gaff.boom*L;
      var bb = makeBoxLocal(0.40, 0.45, bl*0.80, canvasC.clone().multiplyScalar(0.95));
      bake(bb, new THREE.Vector3(0, C.deck+1.05, zM - bl*0.36 + 0.5));
      parts.push(bb);
    }
  });
  var sb = makeBoxLocal(0.30, 0.30, C.sprit*0.45, canvasC.clone()); // jib stowed along the sprit
  bake(sb, new THREE.Vector3(0, lerp(C.spritBase.y, C.spritTip.y, 0.4), lerp(C.spritBase.z, C.spritTip.z, 0.4)));
  parts.push(sb);
  return mergeGeoms(parts);
}

/* overflow tier (the mast forest): three cluster silhouettes routed by
   vessel class so the 600-1500m read keeps the fleet's documented rig
   mix — crossed yards + furled-canvas hints give the forest its texture.
   Mast heights match the full-hull tier (main trucks 17-26m) so the two
   tiers blend seamlessly. */
var CLUSTER_OF_TYPE = [0, 0, 1, 2]; // ship+barque -> 3-mast, brig -> 2-mast square, schooner -> fore-and-aft
function makeMastClusterGeoVariant(kind){
  var mastC = new THREE.Color(0x2b2216), hullC = new THREE.Color(0x3a2d1f), // hull tone matched to the full-hull tier's topside so the two tiers read as one fleet
      bowC  = new THREE.Color(0x443426), canvasC = new THREE.Color(0x8d8168);
  var parts = [];
  function mast(z, h, w, rake){ var g = makeBoxLocal(w, h, w, mastC); g.rotateX(rake||0); g.translate(0, 1.0, z); parts.push(g); }
  function yard(z, y, len){ var g = makeBoxLocal(len, 0.26, 0.26, mastC); bake(g, new THREE.Vector3(0, y, z)); parts.push(g); }
  function bundle(z, y, len, j){ var g = makeBoxLocal(len*0.85, 0.40, 0.50, canvasC.clone().multiplyScalar(0.88 + hash2(j*3.3, 5.1)*0.24)); bake(g, new THREE.Vector3(0, y-0.45, z)); parts.push(g); }
  function bundleZ(z, y, len, j){ var g = makeBoxLocal(0.50, 0.45, len, canvasC.clone().multiplyScalar(0.88 + hash2(j*3.3, 5.1)*0.24)); bake(g, new THREE.Vector3(0, y, z)); parts.push(g); }
  function hullHint(len, beam){
    var g = makeBoxLocal(beam, 1.7, len, hullC); parts.push(g);
    var b = makeBoxLocal(beam*0.80, 1.1, len*0.18, bowC); bake(b, new THREE.Vector3(0, 1.5, len*0.38)); parts.push(b);
    var q = makeBoxLocal(beam*0.85, 0.8, len*0.14, bowC); bake(q, new THREE.Vector3(0, 1.5, -len*0.40)); parts.push(q);
    var sp = makeBoxLocal(0.28, 0.28, len*0.26, mastC); sp.rotateX(-0.30); sp.translate(0, 2.4, len*0.55); parts.push(sp);
  }
  if(kind===0){ // 3-masted square-rigger (ship/barque class, ~33m)
    hullHint(32, 5.6);
    mast(  9.6, 23.0, 0.42, -0.04); mast(-0.6, 26.0, 0.46, -0.04); mast(-10.4, 20.0, 0.36, -0.05);
    yard(  9.6, 10.2, 15.5); yard(  9.6, 14.6, 11.5); yard(-0.6, 11.4, 17.5); yard(-0.6, 16.6, 13.0); yard(-10.4, 9.0, 12.0);
    bundle( 9.6, 10.2, 15.5, 1); bundle(-0.6, 11.4, 17.5, 2); bundle(-0.6, 16.6, 13.0, 3); bundle(-10.4, 9.0, 12.0, 4);
  } else if(kind===1){ // 2-masted square-rigger (brig class, ~25m)
    hullHint(24, 5.0);
    mast( 6.2, 19.5, 0.40, -0.04); mast(-5.4, 21.0, 0.42, -0.05);
    yard( 6.2, 8.6, 13.0); yard( 6.2, 12.6, 10.0); yard(-5.4, 9.2, 13.5); yard(-5.4, 13.4, 10.5);
    bundle(6.2, 8.6, 13.0, 11); bundle(6.2, 12.6, 10.0, 12); bundle(-5.4, 9.2, 13.5, 13);
  } else { // fore-and-aft (schooner class, ~19m) — raked masts, booms, no yards
    hullHint(18, 4.2);
    mast( 4.4, 15.5, 0.32, -0.12); mast(-4.0, 17.0, 0.34, -0.12);
    var b1 = makeBoxLocal(0.2, 0.2, 6.5, mastC); bake(b1, new THREE.Vector3(0, 2.6, 1.4)); parts.push(b1);
    var b2 = makeBoxLocal(0.2, 0.2, 7.0, mastC); bake(b2, new THREE.Vector3(0, 2.6, -7.2)); parts.push(b2);
    bundleZ(1.4, 3.25, 5.5, 21); bundleZ(-7.2, 3.25, 6.0, 22);
  }
  return mergeGeoms(parts);
}

/* instanced pools: one hull + one set-sail + one furled-bundle mesh per
   class, three cluster meshes for the overflow forest. Every geometry
   gets an inflated bounding sphere: r128 InstancedMesh frustum-culls by
   the SHARED geometry sphere at the mesh origin, and hulls ride the
   channel out to the Golden Gate (±4km) — without this, close framings
   that exclude the world origin (e.g. the Clark's Point arrival shot)
   would cull the whole fleet mid-view. */
function _shipPoolGeo(g){ g.computeBoundingSphere(); g.boundingSphere.radius = 6000; return g; }
var shipHullMeshes = [0,1,2,3].map(function(ci){
  var m = new THREE.InstancedMesh(_shipPoolGeo(makeShipHullGeo(ci)), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), SHIP_CAP);
  m.count = 0; scene.add(m); return m;
});
var shipSailMeshes = [0,1,2,3].map(function(ci){
  var m = new THREE.InstancedMesh(_shipPoolGeo(makeShipSailGeo(ci)), new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.DoubleSide, transparent:true}), SHIP_CAP);
  m.count = 0; scene.add(m); return m;
});
var shipFurlMeshes = [0,1,2,3].map(function(ci){
  var m = new THREE.InstancedMesh(_shipPoolGeo(makeShipFurledGeo(ci)), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), SHIP_CAP);
  m.count = 0; scene.add(m); return m;
});
var mastClusterMeshes = [0,1,2].map(function(k){
  var m = new THREE.InstancedMesh(_shipPoolGeo(makeMastClusterGeoVariant(k)), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), MAST_CAP);
  m.count = 0; scene.add(m); return m;
});
/* per-instance WEATHERED-CANVAS TONE JITTER (the people-system's
   instanceTint pattern — the r128 workaround for missing setColorAt):
   sails + furled bundles tint per vessel, clusters get a value jitter so
   the anchored forest reads as weathered individuals, not one stamp. */
function addShipTintAttr(mesh){
  var cap = mesh.instanceMatrix.count;
  var arr = new Float32Array(cap*3);
  for(var i=0;i<arr.length;i++) arr[i] = 1;
  var attr = new THREE.InstancedBufferAttribute(arr, 3);
  mesh.geometry.setAttribute("instanceTint", attr);
  mesh.material.onBeforeCompile = function(sh){
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 instanceTint;\nvarying vec3 vShipTint;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvShipTint = instanceTint;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vShipTint;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= vShipTint;");
  };
  return attr;
}
var shipSailTintAttrs = shipSailMeshes.map(addShipTintAttr);
var shipFurlTintAttrs = shipFurlMeshes.map(addShipTintAttr);
var mastClusterTintAttrs = mastClusterMeshes.map(addShipTintAttr);
console.log("[verify] s48 ship classes — tris/hull: " + shipHullMeshes.map(function(m,i){
  return SHIP_CLASS[i].name+" "+Math.round(m.geometry.attributes.position.count/3);
}).join(", ") + "; sails: " + shipSailMeshes.map(function(m){ return Math.round(m.geometry.attributes.position.count/3); }).join("/") +
"; furled: " + shipFurlMeshes.map(function(m){ return Math.round(m.geometry.attributes.position.count/3); }).join("/") +
"; clusters: " + mastClusterMeshes.map(function(m){ return Math.round(m.geometry.attributes.position.count/3); }).join("/"));

var SHIP_LABEL_POOL = 14;
var shipLabelPool = [];
(function buildShipLabelPool(){
  var hudEl = document.getElementById("hud");
  for(var i=0;i<SHIP_LABEL_POOL;i++){
    var el = document.createElement("div");
    el.className = "wlbl wlbl-ship"; // §11 grammar: ships = name · date, light compact haloed text (no chip)
    el.addEventListener("click", function(e){
      e.stopPropagation();
      if(this._visit) openShipInspector(this._visit);
    });
    hudEl.appendChild(el);
    shipLabelPool.push(el);
  }
})();
/* s42 inspect law: per-frame instanceId -> visit maps so the tap/click
   raycaster can resolve a hull hit to its ship record (updateShips fills
   these in the same loop that writes the instance matrices). */
var shipPickVisits = [[],[],[],[]], mastPickVisits = [[],[],[]];

/* =========================================================================
   COVERAGE-GAP FILL TRAFFIC (WORLD-P0 fix 2026-07-09, grounding.md's
   COVERAGE-GAP RULE + fix list item 6). data/GAPS-2026-07-09.md's "1849
   spine cliff" finding: the newspaper record genuinely goes quiet for
   most of 1849 (the Californian/Star merged paper ended 1848; the Daily
   Alta doesn't begin until Dec 1849), so almost no NAMED ship arrivals
   survive for that stretch — but ~700+ vessels documented in aggregate
   actually arrived that year. Per the rule: the PAPER stays honestly
   silent for the gap; the WORLD stays alive. These are simulated,
   unnamed arrivals at the documented aggregate rate, rendered with the
   exact same hull/sail visuals as real ships (no badge, no distinct
   color — grounding.md's VOICE RULE: provenance stays quiet function,
   never on-screen editorializing) but entirely excluded whenever the P
   (provenance/"the record only") toggle is on, same as simulated people.
   ========================================================================= */
var FILL_GAP_START_DAY = eventDateToSimDay("1849-01-01");
var FILL_GAP_END_DAY = eventDateToSimDay("1849-11-30");
var FILL_SHIPS_PER_WEEK = 12; // "several per week" per ~700+/year documented aggregate
var fillShipVisits = (function(){
  var out = [];
  var totalWeeks = Math.max(0, FILL_GAP_END_DAY-FILL_GAP_START_DAY)/7;
  var n = Math.round(totalWeeks*FILL_SHIPS_PER_WEEK);
  for(var i=0;i<n;i++){
    var arrive = FILL_GAP_START_DAY + ((i+rngBuild())/n)*(FILL_GAP_END_DAY-FILL_GAP_START_DAY);
    var stay = 20+rngBuild()*150; // many lingered/deserted for the diggings (the historical pattern); some moved on
    out.push({
      ship: "fill-"+i, arrive: arrive, depart: (rngBuild()<0.4 ? arrive+stay : null),
      pathJitter: rngBuild(), exitNorth: rngBuild()<0.5,
      shipType: shipTypeFromRoll(rngBuild()), // period-mix table (fill:true weights — see SHIP_FILL_MIX)
      _state:"future", _anchorPos:null, _anchorIdx:-1, _anchorYaw: rngBuild()*Math.PI*2,
      isFill: true
    });
  }
  out.sort(function(a,b){ return a.arrive-b.arrive; });
  return out;
})();

/* sprint #29: every visit (documented + fill) gets its mooring, sail
   windows, and approach geometry ONCE, deterministically, at build —
   provenance toggle only filters rendering, never re-assigns. */
assignAnchorSlots(shipVisits.concat(fillShipVisits));

var _UP = new THREE.Vector3(0,1,0);
var _shipM4 = new THREE.Matrix4(), _shipQ = new THREE.Quaternion(), _shipV = new THREE.Vector3(), _shipS = new THREE.Vector3();
var _shipLabelV = new THREE.Vector3();
var _shipListQ = new THREE.Quaternion(), _shipListAxis = new THREE.Vector3(0,0,1);
function setShipInstance(mesh, idx, x, y, z, yaw, scale, list){
  _shipQ.setFromAxisAngle(_UP, yaw);
  if(list){ _shipListQ.setFromAxisAngle(_shipListAxis, list); _shipQ.multiply(_shipListQ); } // permanent heel/list — grounded storeships
  _shipV.set(x,y,z); _shipS.set(scale,scale,scale);
  _shipM4.compose(_shipV,_shipQ,_shipS);
  mesh.setMatrixAt(idx, _shipM4);
}

var SHIP_FLOW_BUDGET = 10;     // §10 ambient-flow analog: max ships visibly working the channel at timelapse
var shipsLastSimDay = null;
function updateShips(dt){
  var activeList = [], anchoredCandidates = [];
  // WORLD-P0 fix (coverage-gap fill traffic): merge in the simulated
  // 1849 fill arrivals unless the provenance ("record only") toggle is on.
  var allVisits = provenanceOnly ? shipVisits : shipVisits.concat(fillShipVisits);
  /* §10 LIVE-PACE analog for ships (sprint #29): at LIVE/pause the rendered
     position is schedule-true — pure f(simDay), a full entrance sails the
     channel at 5-8 knots over ~30-45 real minutes, period-honest. At
     timelapse a schedule-true transit (~0.03 sim-days) would flash across
     in under 100ms — a teleport — so ships that arrive/depart while the
     timelapse clock is RUNNING instead sail an AMBIENT-FLOW pass along the
     same channel: capped apparent speed (full route in ~6 real seconds),
     budgeted to SHIP_FLOW_BUDGET concurrent sails (beyond the budget they
     appear directly at anchor — correct counts, legible motion). Flow
     state is render-only; moorings, dates, and states stay deterministic,
     and exact schedule positions resample the instant timelapse ends. */
  var tl = timelapseActive() && !SCRUBBING;
  var frameA = shipsLastSimDay===null ? simDay : shipsLastSimDay;
  var organic = tl && simDay>frameA && (simDay-frameA) < 1.5; // a running clock, not a jump/scrub
  var flows = 0;
  allVisits.forEach(function(v){
    var st = shipDesiredState(v, simDay);
    v._state = st; v._renderMode = null;
    // s48 storeship dress: the shed/gangway/signage mesh follows the hull's
    // grounded state (built lazily after the waterfront systems load)
    if(v.storeship && v.storeship._dress){
      var dvis = st==="anchored";
      if(v.storeship._dressVis !== dvis){
        v.storeship._dressVis = dvis;
        v.storeship._dress.forEach(function(dm){ dm.visible = dvis; });
      }
    }
    if(!v._anchorPos) return; // defensive; assignAnchorSlots covers every visit
    var LIn = SHIP_CHANNEL.len + v._appLen;
    var LOut = v._appLen + (v.exitNorth ? SHIP_NORTH.len : SHIP_CHANNEL.len);
    if(!tl){ v._flowIn = null; v._flowOut = null; }
    else {
      var sailStart = v.arrive - (v._sailInDays||0.05);
      if(!v._flowIn && organic && sailStart>frameA && sailStart<=simDay && flows<SHIP_FLOW_BUDGET && (st==="sailing_in"||st==="anchored")) v._flowIn = { s:0 };
      if(!v._flowOut && organic && v.depart!==null && v.depart>frameA && v.depart<=simDay && flows<SHIP_FLOW_BUDGET && (st==="sailing_out"||st==="done")) v._flowOut = { s:0 };
    }
    if(v._flowIn){
      v._flowIn.s += dt*(LIn/6);
      if(v._flowIn.s>=LIn || st==="future" || st==="sailing_out" || st==="done") v._flowIn = null; else flows++;
    }
    if(v._flowOut){
      v._flowOut.s += dt*(LOut/6);
      if(v._flowOut.s>=LOut || st==="future" || st==="sailing_in") v._flowOut = null; else flows++;
    }
    // render bucket + rendered arc position (meters along the composite path)
    if(v._flowOut){
      var sTO = st==="done" ? LOut : clamp((simDay-v.depart)/(v._sailOutDays||0.05),0,1)*LOut;
      v._renderMode = "out"; v._renderS = Math.min(v._flowOut.s, sTO); // never ahead of the schedule-true position, never faster than the flow cap
      activeList.push(v); return;
    }
    if(st==="sailing_out"){
      v._renderMode = "out"; v._renderS = clamp((simDay-v.depart)/(v._sailOutDays||0.05),0,1)*LOut;
      activeList.push(v); return;
    }
    if(v._flowIn){
      var sTI = st==="anchored" ? LIn : clamp((simDay-(v.arrive-(v._sailInDays||0.05)))/(v._sailInDays||0.05),0,1)*LIn;
      v._renderMode = "in"; v._renderS = Math.min(v._flowIn.s, sTI);
      activeList.push(v); return;
    }
    if(st==="sailing_in"){
      v._renderMode = "in"; v._renderS = clamp((simDay-(v.arrive-(v._sailInDays||0.05)))/(v._sailInDays||0.05),0,1)*LIn;
      activeList.push(v); return;
    }
    if(st==="anchored"){ v._renderMode = "anchor"; anchoredCandidates.push(v); }
  });
  shipsLastSimDay = simDay;
  // most recently arrived first, but named storeships always sort to the
  // front so they never fall into the mast-cluster overflow tier — they're
  // the era's best-documented hulls and must always render as full ships.
  anchoredCandidates.sort(function(a,b){ return ((b.storeship?1e9:0)+(b.arrive||0)) - ((a.storeship?1e9:0)+(a.arrive||0)); });
  // hard cap: SHIP_CAP+MAST_CAP is the total instance capacity actually
  // allocated below (mastClusterMesh has room for MAST_CAP, not
  // "however many are anchored") — coverage-gap fill traffic can push
  // anchored count well past that at the 1849 peak, so anything beyond
  // the cap is dropped here rather than overrunning setMatrixAt().
  if(anchoredCandidates.length > SHIP_CAP+MAST_CAP) anchoredCandidates.length = SHIP_CAP+MAST_CAP;
  var freeCap = Math.max(0, SHIP_CAP-activeList.length);
  var activeAnchored = anchoredCandidates.slice(0, freeCap);
  var overflow = anchoredCandidates.slice(freeCap);
  activeList = activeList.concat(activeAnchored);

  var labelCandidates = [];
  var typeCounts = [0,0,0,0];
  var gullTargets = []; // §10.2 gulls: up to 3 ships in camera range (sailing ships sort first in activeList); deserted storeships draw no working-harbor birds
  activeList.forEach(function(v){
    var pos, sailScale, y;
    if(v._renderMode==="in" || v._renderMode==="out"){
      var arriving = v._renderMode==="in";
      var L = arriving ? SHIP_CHANNEL.len+v._appLen : v._appLen+(v.exitNorth ? SHIP_NORTH.len : SHIP_CHANNEL.len);
      var tt = L>0 ? clamp(v._renderS/L, 0, 1) : 1;
      pos = shipSailPos(v, tt, arriving);
      var ahead = shipSailPos(v, clamp(tt + 40/L, 0, 1), arriving);
      var pathYaw = Math.atan2(ahead.x-pos.x, ahead.z-pos.z) || v._anchorYaw;
      // luff/turn-up: inside ~90m of the mooring the heading settles onto
      // the anchor yaw (arrivals) / swings off it (departures), and the
      // sails come in / fill over the same stretch.
      var remM = arriving ? (L-v._renderS) : v._renderS; // meters from the mooring
      if(remM < 90){
        var w = 1 - remM/90;
        var dy = v._anchorYaw - pathYaw;
        while(dy > Math.PI) dy -= 2*Math.PI; while(dy < -Math.PI) dy += 2*Math.PI;
        pathYaw += dy*w;
      }
      v._yaw = pathYaw;
      sailScale = clamp(remM/130, 0.06, 1);
      y = 0.25;
      if(arriving && !v.isFill) labelCandidates.push(v); // fill traffic is anonymous — no name/date label, per the coverage-gap voice rule
    } else { // anchored (active tier)
      pos = v._anchorPos; v._yaw = v._anchorYaw;
      // storeships are grounded/deserted, not gently riding at anchor —
      // near-zero bob, permanent list angle applied below.
      sailScale = v.storeship ? 0.02 : 0.02;
      y = v.storeship ? 0.05 : (0.2+Math.sin(simDay*2+v._anchorIdx)*0.05);
      if(!v.isFill && (v.storeship || (v.arrive!==null && (simDay-v.arrive)<1))) labelCandidates.push(v);
    }
    v._lastPos = pos;
    if(!v.storeship && gullTargets.length<3){
      var gdx = pos.x-camera.position.x, gdz = pos.z-camera.position.z;
      if(gdx*gdx+gdz*gdz < 900*900) gullTargets.push({ x:pos.x, z:pos.z, yaw:v._yaw, moving:v._state!=="anchored" });
    }
    // route this vessel's instance into its own type-pool (full ship/brig/schooner)
    var ty = v.shipType, idx = typeCounts[ty]++;
    shipPickVisits[ty][idx] = v; // s42 inspect law: instanceId -> visit for the tap raycaster
    setShipInstance(shipHullMeshes[ty], idx, pos.x, y, pos.z, v._yaw, 1, v.storeship && v._state==="anchored" ? v.storeship.list : 0);
    // sail uses a non-uniform Y scale (furled flat when anchored) instead of
    // going through setShipInstance's uniform scale. s48: the X/Z scale
    // collapses alongside Y (clamped, x5 ramp) so a struck sail vanishes
    // instead of leaving a full-length pale sliver at the waterline.
    _shipQ.setFromAxisAngle(_UP, v._yaw);
    _shipV.set(pos.x,y,pos.z);
    var sailXZ = clamp(sailScale*5, 0.001, 1);
    _shipS.set(sailXZ, sailScale, sailXZ);
    _shipM4.compose(_shipV,_shipQ,_shipS);
    shipSailMeshes[ty].setMatrixAt(idx, _shipM4);
    // s48: furled bundles crossfade opposite the set sails (bent canvas on
    // the yards at anchor); deserted storeships ride bare-poled — their
    // canvas was struck/rotted, which is exactly what distinguishes the
    // hulk row from the working anchorage at a glance.
    var furlScale = v.storeship ? 0.001 : clamp(1.1 - sailScale*1.1, 0.001, 1);
    var furlXZ = clamp(furlScale*5, 0.001, 1);
    _shipS.set(furlXZ, furlScale, furlXZ);
    _shipM4.compose(_shipV, _shipQ, _shipS);
    shipFurlMeshes[ty].setMatrixAt(idx, _shipM4);
    // weathered-canvas tone jitter, stable per vessel across frames
    if(!v._ctint){
      var th1 = hash2((v.pathJitter||0.5)*91.3, 7.7), th2 = hash2((v.pathJitter||0.5)*17.9, 3.3);
      var tb = 0.78 + th1*0.28, tw = (th2-0.5)*0.10;
      v._ctint = [tb*(1+tw), tb, tb*(1-tw*0.6)];
    }
    shipSailTintAttrs[ty].setXYZ(idx, v._ctint[0], v._ctint[1], v._ctint[2]);
    shipFurlTintAttrs[ty].setXYZ(idx, v._ctint[0], v._ctint[1], v._ctint[2]);
  });
  shipHullMeshes.forEach(function(m,ty){ m.count = typeCounts[ty]; m.instanceMatrix.needsUpdate = true; });
  shipSailMeshes.forEach(function(m,ty){ m.count = typeCounts[ty]; m.instanceMatrix.needsUpdate = true; });
  shipFurlMeshes.forEach(function(m,ty){ m.count = typeCounts[ty]; m.instanceMatrix.needsUpdate = true; });
  shipSailTintAttrs.forEach(function(a){ a.needsUpdate = true; });
  shipFurlTintAttrs.forEach(function(a){ a.needsUpdate = true; });

  shipPickVisits.forEach(function(arr,ty){ arr.length = typeCounts[ty]; });
  // s48 overflow tier: route each anchored-overflow hull into the cluster
  // silhouette matching its documented/period-mix class, so the 600-1500m
  // mast forest keeps the fleet's rig mix instead of one repeated stamp
  var clusterBuckets = [[],[],[]];
  overflow.forEach(function(v){ clusterBuckets[CLUSTER_OF_TYPE[v.shipType]].push(v); });
  mastPickVisits = clusterBuckets; // s42 inspect law: per-pool instanceId -> visit
  mastClusterMeshes.forEach(function(m,k){
    var arr = clusterBuckets[k];
    m.count = arr.length;
    for(var ci=0; ci<arr.length; ci++){
      var cv = arr[ci];
      setShipInstance(m, ci, cv._anchorPos.x, 0.2, cv._anchorPos.z, cv._anchorYaw, 1);
      var tj = 0.82 + hash2((cv._anchorIdx+7)*3.7, 9.1)*0.32; // weathered value jitter — forest texture
      mastClusterTintAttrs[k].setXYZ(ci, tj, tj, tj);
    }
    m.instanceMatrix.needsUpdate = true;
    mastClusterTintAttrs[k].needsUpdate = true;
  });
  window._gullShips = gullTargets; // read by updateFauna's §10.2 gull flock

  // label chips: ship name + date, while sailing and for a day after anchoring (spec §2)
  for(var li=0; li<SHIP_LABEL_POOL; li++){
    var el = shipLabelPool[li];
    var v2 = labelCandidates[li];
    if(!v2){ el.style.opacity = 0; el._visit = null; continue; }
    var p2 = v2._lastPos || v2._anchorPos; // set in the render loop above (sailing ships: rendered channel position)
    var wy = terrainHeight(p2.x,p2.z);
    _shipLabelV.set(p2.x, Math.max(wy,0)+12, p2.z);
    _shipLabelV.applyMatrix4(camera.matrixWorldInverse);
    if(_shipLabelV.z>-1){ el.style.opacity=0; el._visit = null; continue; }
    _shipLabelV.set(p2.x, Math.max(wy,0)+12, p2.z).project(camera);
    if(_shipLabelV.x<-1.05||_shipLabelV.x>1.05||_shipLabelV.y<-1.05||_shipLabelV.y>1.05){ el.style.opacity=0; el._visit = null; continue; }
    var dateStr = v2.arrive!==null ? dateFromSimDay(v2.arrive).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}) : "";
    el.textContent = v2.ship.toUpperCase() + (dateStr?(" · "+dateStr):"");
    el.style.opacity = 0.95;
    el.style.left = ((_shipLabelV.x*0.5+0.5)*window.innerWidth)+"px";
    // storeship chips get a fixed per-ship vertical stagger so the four
    // named hulks' always-on labels never stack (screening #5 item c)
    var chipYOff = (v2.storeship && v2.storeship.chipRank!=null) ? v2.storeship.chipRank*17 : 0;
    el.style.top = ((-_shipLabelV.y*0.5+0.5)*window.innerHeight + chipYOff)+"px";
    el._visit = v2;
  }
}

/* @P1850-CHUNK 39 — wharf growth (landing stages + Central Wharf deck) */
  /* ---- WHARF GROWTH (WORLD-P0 fix 2026-07-09, AUDIT H1 / GAPS item 5) ----
     Previously one static mesh, visible unchanged from July 1846 — 18
     months before any wharf existed (clm:shore:4: Clark's Point wharf,
     1847, was the first). Rebuilt as a date-gated, growing system:
       - nothing before fall 1847 (both stub landings + Central Wharf
         hidden pre-1847-09-01)
       - small plank landing stages, 1847-48 (the two stub meshes below,
         now toggled by date instead of always-on)
       - Central/Long Wharf begins growing May 1849 (corrections.md
         hedges the exact incorporation date; May 1849 per this file's
         own comment elsewhere) toward ~800 ft (244m) by late 1849
         (geography-shoreline.md §4), with a couple of tiny worker
         figures at the growing tip while under construction (behavior
         catalog wharf_builder, cheap: reuses makeOutpostPersonGeo-style
         static figures baked fresh each growth step). */
(function buildWharfGrowth(){ /* SEAM (Great Split, 2026-07-12): extracted verbatim from
   buildVillageClutter's tail (layers/doodads.js) — closure-independent, module globals only. */
  var WHARF_LANDING_START_DAY = eventDateToSimDay("1847-09-01");
  var CENTRAL_WHARF_START_DAY = eventDateToSimDay("1849-05-01");
  var CENTRAL_WHARF_FULL_LEN = 244; // ~800 ft
  var waterY = 0.25;
  var deckColor = new THREE.Color(0x6e5a3f), pileColor = new THREE.Color(0x4a3c2c);

  /* ---- small landing stages (1847-48): built once, whole-mesh visibility
     toggled by date rather than geometry regen since they don't grow. ---- */
  var landingGeoms = [];
  var wharfV = (GEO.streetsV.clay+GEO.streetsV.washington)/2;
  var landPt = gridToWorld(GEO.streetsU.montgomery, wharfV);
  var lastLandX = landPt.x, x = landPt.x;
  for(var step=0; step<80; step++){ x += 3; if(terrainHeight(x, landPt.z) < 0) break; lastLandX = x; }
  var deckLen = 16, deckW = 3.2;
  var deck = makeBoxLocal(deckW, 0.18, deckLen, deckColor);
  bake(deck, new THREE.Vector3(lastLandX+deckLen/2-1, waterY, landPt.z), Math.PI/2);
  landingGeoms.push(deck);
  for(var pi=0;pi<4;pi++){
    var pile = makeBoxLocal(0.3,1.4,0.3, pileColor);
    var px = lastLandX + 2 + pi*4.5;
    bake(pile, new THREE.Vector3(px, waterY-1.2, landPt.z + (pi%2===0?-1.4:1.4)), 0);
    landingGeoms.push(pile);
  }
  var hullColor = new THREE.Color(0x5c4530);
  [[-6,-3.5,0.3],[-9,3.2,-0.4]].forEach(function(b){
    var boat = makeBoxLocal(3.2,0.5,1.3, hullColor);
    bake(boat, new THREE.Vector3(lastLandX+b[0], terrainHeight(lastLandX+b[0], landPt.z+b[1])+0.25, landPt.z+b[1]), b[2]);
    landingGeoms.push(boat);
  });
  var landPt2 = gridToWorld(GEO.streetsU.montgomery, GEO.streetsV.washington);
  var lastLandX2 = landPt2.x, x2 = landPt2.x;
  for(var step2=0; step2<80; step2++){ x2 += 3; if(terrainHeight(x2, landPt2.z) < 0) break; lastLandX2 = x2; }
  var deck2Len = 13, deck2W = 2.6;
  var deck2 = makeBoxLocal(deck2W, 0.16, deck2Len, deckColor);
  bake(deck2, new THREE.Vector3(lastLandX2+deck2Len/2-1, waterY, landPt2.z), Math.PI/2);
  landingGeoms.push(deck2);
  for(var pj=0;pj<3;pj++){
    var pile2 = makeBoxLocal(0.28,1.3,0.28, pileColor);
    var px2 = lastLandX2 + 2 + pj*4.2;
    bake(pile2, new THREE.Vector3(px2, waterY-1.1, landPt2.z + (pj%2===0?-1.2:1.2)), 0);
    landingGeoms.push(pile2);
  }
  var scowColor = new THREE.Color(0x554330);
  var scowHull = makeBoxLocal(2.6,0.7,6.5, scowColor);
  var scowX = lastLandX2-7, scowZ = landPt2.z+6;
  bake(scowHull, new THREE.Vector3(scowX, terrainHeight(scowX,scowZ)+0.35, scowZ), 0.35);
  landingGeoms.push(scowHull);
  window._wharfLandingMesh = new THREE.Mesh(mergeGeoms(landingGeoms), new THREE.MeshPhongMaterial({ vertexColors:true, flatShading:true, specular:0x000000, shininess:0 }));
  window._wharfLandingMesh.visible = false;
  scene.add(window._wharfLandingMesh);

  /* ---- Central/Long Wharf: a growing deck, foot of Clay St (corrections.md
     places this stretch's fill/wharf activity between Sacramento and Clay).
     Rebuilt (cheap: one thin box + piles + a couple of worker figures)
     only when the visible length actually changes, not every frame. ---- */
  var cwZ = gridToWorld(GEO.streetsU.montgomery, GEO.streetsV.clay).z;
  var cwStartPt = gridToWorld(GEO.streetsU.montgomery, GEO.streetsV.clay);
  var cwStartX = cwStartPt.x, cwx = cwStartPt.x;
  for(var cws=0; cws<80; cws++){ cwx += 3; if(terrainHeight(cwx, cwZ) < 0) break; cwStartX = cwx; }
  window._centralWharfGroup = new THREE.Group();
  scene.add(window._centralWharfGroup);
  window._centralWharfLastLen = -1;
  /* TECHNIQUES §4.1 — instanced piles along both deck edges at the
     historical ~3.5m bay spacing, per-pile rotation/offset/height jitter
     (deterministic per pile index — hash2, not rng — so a growth rebuild
     never reshuffles the existing bays), with every ~7th pile standing
     proud of the deck as a bollard. One InstancedMesh, one draw call. */
  var CW_PILE_CAP = 200;
  var cwPileMesh = new THREE.InstancedMesh(makeBoxLocal(0.34,1,0.34, pileColor),
    new THREE.MeshPhongMaterial({ vertexColors:true, flatShading:true, specular:0x000000, shininess:0 }), CW_PILE_CAP);
  cwPileMesh.count = 0; scene.add(cwPileMesh);
  window._cwPileMesh = cwPileMesh; // __P1850.wharf verification hook
  var _cwM4 = new THREE.Matrix4(), _cwQ = new THREE.Quaternion(), _cwV = new THREE.Vector3(), _cwS = new THREE.Vector3();
  /* TECHNIQUES §4.2 — plank-age wear gradient "for free": the wharf grew
     seaward over sim-time, so constructionDay(distanceAlongDeck) is known
     exactly (the same linear growth updateWharfGrowth drives). Deck planks
     tint from weathered gray at the shore end (built first) to fresh-cut
     tan at the working end (built last month) — a wharf that visibly
     records its own growth history. */
  var CW_FRESH = new THREE.Color(0xa07f4e), CW_WEATHERED = new THREE.Color(0x777263);
  function cwConstructionDay(dist){
    return CENTRAL_WHARF_START_DAY + (dist/CENTRAL_WHARF_FULL_LEN)*(SIM_END_DAY-CENTRAL_WHARF_START_DAY);
  }
  window._buildCentralWharf = function(lenM){
    var g = window._centralWharfGroup;
    while(g.children.length){ g.remove(g.children[0]); }
    var pileIdx = 0;
    if(lenM<=0){ cwPileMesh.count = 0; window._centralWharfTip = null; return; }
    var geoms = [];
    var deckW3 = 6.5;
    // ROAD MASTERPLAN §4 (s27): true TRANSVERSE PLANKS — one box per
    // ~0.45m plank with a visible gap line and per-plank tone jitter on
    // top of the §4.2 age gradient, so the deck reads plank-by-plank at
    // full zoom instead of as 4m slabs. ~540 boxes at full length, merged
    // to one geometry per rebuild — rebuilds only on growth/tint epochs.
    var DECK_SEG = 0.45; // one plank
    var nSeg = Math.max(1, Math.ceil(lenM/DECK_SEG));
    for(var si=0; si<nSeg; si++){
      var segLen = Math.min(DECK_SEG, lenM - si*DECK_SEG);
      if(segLen<=0) break;
      var ageT = clamp((simDay - cwConstructionDay(si*DECK_SEG))/150, 0, 1);
      var segCol = CW_FRESH.clone().lerp(CW_WEATHERED, ageT);
      // per-plank value jitter so the gradient reads as planks, not a ramp
      segCol.multiplyScalar(0.90 + hash2(si*3.7, 1.3)*0.18);
      var deckSeg = makeBoxLocal(deckW3, 0.22, segLen*0.86, segCol); // 14% gap line between planks
      bake(deckSeg, new THREE.Vector3(cwStartX + si*DECK_SEG + segLen/2, waterY, cwZ), Math.PI/2);
      geoms.push(deckSeg);
    }
    var m = new THREE.Mesh(mergeGeoms(geoms), new THREE.MeshPhongMaterial({ vertexColors:true, flatShading:true, specular:0x000000, shininess:0 }));
    g.add(m);
    // piles: ~3.5m bays down both edges
    var BAY = 3.5;
    for(var bx=1.2; bx<lenM && pileIdx<CW_PILE_CAP-1; bx+=BAY){
      for(var side=-1; side<=1; side+=2){
        if(pileIdx>=CW_PILE_CAP) break;
        var pj = hash2(bx*1.31, side*2.17), pj2 = hash2(bx*2.71, side*0.53);
        var bollard = (Math.floor(bx/BAY)+ (side>0?3:0)) % 7 === 0;
        var px = cwStartX + bx + (pj-0.5)*0.5;
        var pz = cwZ + side*(deckW3/2 - 0.12) + (pj2-0.5)*0.3;
        _cwQ.setFromAxisAngle(_UP, (pj-0.5)*0.1); // ±3° rotation jitter
        _cwV.set(px, waterY-2.3, pz);
        _cwS.set(1, 2.35 + pj2*0.25 + (bollard?0.75:0), 1); // bollards stand proud of the deck
        _cwM4.compose(_cwV,_cwQ,_cwS);
        cwPileMesh.setMatrixAt(pileIdx++, _cwM4);
      }
    }
    cwPileMesh.count = pileIdx;
    cwPileMesh.instanceMatrix.needsUpdate = true;
    window._centralWharfTip = { x:cwStartX+lenM, z:cwZ, len:lenM, deckW:deckW3 };
    // a couple of worker figures at the growing tip while under construction
    // (behavior catalog wharf_builder — cheap static figures, not full sim actors)
    if(lenM < CENTRAL_WHARF_FULL_LEN*0.98){
      var wpg = [];
      placeOutpostPerson(wpg, cwStartX+lenM-3, cwZ-1.6, Math.PI*0.5, 0x3a3226, 0x2a2420, false);
      placeOutpostPerson(wpg, cwStartX+lenM-6, cwZ+1.8, Math.PI*1.5, 0x36402e, 0x262c1e, false);
      var wm = new THREE.Mesh(mergeGeoms(wpg), new THREE.MeshPhongMaterial({ vertexColors:true, flatShading:true, specular:0x000000, shininess:0 }));
      // workers stand ON the deck, not on the (underwater) terrain height placeOutpostPerson used
      wm.position.y = waterY - terrainHeight(cwStartX+lenM-3, cwZ-1.6);
      g.add(wm);
    }
  };
  window._cwTintEpoch = -1;
  window.updateWharfGrowth = function(){
    window._wharfLandingMesh.visible = simDay >= WHARF_LANDING_START_DAY;
    if(window._townChapelMesh) window._townChapelMesh.visible = simDay >= CHURCH_REVEAL_DAY;
    // s56: the chapel's contact-shadow decal gates WITH the chapel (same
    // orphan-blob fix as updateEraGating's, but the chapel has no vertex
    // slice so it's handled here beside its own visibility toggle).
    if(typeof buildingShadowMesh !== "undefined" && buildingShadowMesh && window._chapelShadowIdx != null && CHURCH_SPOT){
      var chapelOn = simDay >= CHURCH_REVEAL_DAY;
      if(chapelOn !== window._chapelShadowOn){
        window._chapelShadowOn = chapelOn;
        var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), CHURCH_SPOT.rot||0);
        var m4 = new THREE.Matrix4().compose(
          new THREE.Vector3(CHURCH_SPOT.x, chapelOn ? CHURCH_SPOT.y+0.04 : CHURCH_SPOT.y-9999, CHURCH_SPOT.z),
          q, new THREE.Vector3((CHURCH_SPOT.w||4)*1.3, 1, (CHURCH_SPOT.d||4)*1.3));
        buildingShadowMesh.setMatrixAt(window._chapelShadowIdx, m4);
        buildingShadowMesh.instanceMatrix.needsUpdate = true;
      }
    }
    var t = clamp((simDay-CENTRAL_WHARF_START_DAY)/(SIM_END_DAY-CENTRAL_WHARF_START_DAY), 0, 1);
    var lenM = t>0 ? Math.max(6, CENTRAL_WHARF_FULL_LEN*t) : 0;
    var rounded = Math.round(lenM/2)*2;
    // rebuild on growth AND every ~15 sim-days so the §4.2 age gradient
    // keeps weathering even once a stretch has stopped growing
    var tintEpoch = Math.floor(simDay/15);
    if(rounded !== window._centralWharfLastLen || tintEpoch !== window._cwTintEpoch){
      window._buildCentralWharf(simDay>=CENTRAL_WHARF_START_DAY ? rounded : 0);
      window._centralWharfLastLen = rounded;
      window._cwTintEpoch = tintEpoch;
    }
  };
  window.updateWharfGrowth();

  /* PLANKED SURFACE APRONS (road-master-spec §4, s27): the shore ends of
     the documented decking — planked landing aprons where the wharves
     meet the beach, painted by the splat engine's plank layer (transverse
     per-plank strokes, tone jitter, the documented lighter-than-ground
     exception). Positions derive from the same landing/deck anchors the
     3D decks use; exact apron footprints are fill:true (period wharves
     universally met the shore over laid planking; no survey of these two
     aprons exists). Date-gated to each structure's own documented start,
     and those days are pushed into the repaint thresholds so scrubbing
     across them repaints the ground. */
  SPLAT_PLANK_APRONS.push({ x0:lastLandX-13, z0:landPt.z, x1:lastLandX+2, z1:landPt.z, widthM:5.5, from:WHARF_LANDING_START_DAY });
  SPLAT_PLANK_APRONS.push({ x0:lastLandX2-11, z0:landPt2.z, x1:lastLandX2+2, z1:landPt2.z, widthM:4.5, from:WHARF_LANDING_START_DAY });
  SPLAT_PLANK_APRONS.push({ x0:cwStartX-15, z0:cwZ, x1:cwStartX+2, z1:cwZ, widthM:7, from:CENTRAL_WHARF_START_DAY });
  STREET_REPAINT_THRESHOLDS.push(WHARF_LANDING_START_DAY, CENTRAL_WHARF_START_DAY);
})();

/* @P1850-CHUNK 41 — storeship dress */
/* =====================================================================
   STORESHIP DRESS (s48) — the four documented conversions (Niantic,
   General Harrison, Apollo storeships; Euphemia the town jail) were not
   ships at anchor but SHIP-BUILDINGS: decks roofed over with wooden
   sheds, gangways run to the shore, business signs on the housing (the
   Niantic's famous painted "STORAGE"; the Apollo warehouse/saloon; the
   Euphemia prison hulk). Each hulk gets a shed roof + side walls over
   the waist (masts standing through the roof, as in the 1850-51
   daguerreotypes), a plank gangway walked shoreward to the real mud
   line, and a signage hint — all baked with the hull's own documented
   grounding transform (position, yaw 0.3, permanent list), and gated
   visible only while the visit is in its grounded/anchored state (the
   dress never sails in with her). Placement source: STORESHIP_INFO's
   documented cross-street groundings above.
   ===================================================================== */
(function buildStoreshipDress(){
  var mat = new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0});
  var SIGN_WORD = { "Niantic":"STORAGE", "General Harrison":"STORAGE", "Apollo":"STORES", "Euphemia":"JAIL" };
  Object.keys(STORESHIP_INFO).forEach(function(name){
    var info = STORESHIP_INFO[name];
    var ci = SHIP_TYPE_RECORD[name]!=null ? SHIP_TYPE_RECORD[name] : 0;
    var C = SHIP_CLASS[ci], L = C.len, hb = C.beam/2, deckY = C.deck;
    // grounded-hull transform — must match setShipInstance's compose for
    // storeships exactly (pos, y=0.05, yaw 0.3, list about local Z)
    var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), 0.3);
    var ql = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), info.list);
    q.multiply(ql);
    var M = new THREE.Matrix4().compose(new THREE.Vector3(info.pos.x, 0.05, info.pos.z), q, new THREE.Vector3(1,1,1));
    // shed over the waist, in ship-local space
    var parts = [];
    var shedW = C.beam + 1.6, shedL = L*0.52, wallC = new THREE.Color(0x6b5a41), roofC = new THREE.Color(0x54432f);
    [[-1],[1]].forEach(function(sd){
      var wall = makeBoxLocal(0.18, 2.3, shedL, wallC);
      bake(wall, new THREE.Vector3(sd[0]*shedW/2, deckY, -L*0.04));
      parts.push(wall);
    });
    var gable = makeGableRoof(shedW, shedL, 0.5, 1.5, roofC);
    bake(gable, new THREE.Vector3(0, deckY+2.3, -L*0.04));
    parts.push(gable);
    var local = mergeGeoms(parts);
    local.applyMatrix4(M);
    // gangway: from the shoreward rail down to the first real mud above
    // the waterline (walked against the baked heightmap, west side —
    // local -X after the 0.3 yaw)
    var start = new THREE.Vector3(-hb*0.9, deckY+0.3, L*0.10).applyMatrix4(M);
    var dir = new THREE.Vector3(-1,0,0).applyQuaternion(q); dir.y = 0; dir.normalize();
    var end = null;
    for(var d=8; d<=42; d+=2){
      var ex = info.pos.x + dir.x*d, ez = info.pos.z + dir.z*d;
      if(terrainHeight(ex,ez) > 0.15){ end = new THREE.Vector3(ex, terrainHeight(ex,ez)+0.25, ez); break; }
    }
    if(!end) end = new THREE.Vector3(info.pos.x + dir.x*22, 0.35, info.pos.z + dir.z*22);
    var glen = start.distanceTo(end);
    var plank = makeBoxLocal(1.3, 0.14, glen, new THREE.Color(0x8a7350));
    plank.translate(0, -0.07, glen/2); // pivot at the deck end, run along +Z
    var dy = end.y - start.y;
    plank.rotateX(Math.asin(clamp(-dy/glen, -1, 1)));
    plank.rotateY(Math.atan2(end.x-start.x, end.z-start.z));
    plank.translate(start.x, start.y, start.z);
    var merged = mergeGeoms([local, plank]);
    var mesh = new THREE.Mesh(merged, mat);
    mesh.visible = false;
    scene.add(mesh);
    // signage hint on the shed's shore-facing side
    var sp = new THREE.Vector3(-shedW/2 - 0.25, deckY + 1.7, -L*0.04).applyMatrix4(M);
    var signRot = Math.atan2(dir.x, dir.z);
    var sign = mountSignBoard({ x:sp.x, z:sp.z, y:0, rot:signRot, d:0 }, SIGN_WORD[name]||"STORAGE", null, sp.y);
    sign.visible = false;
    info._dress = [mesh, sign];
    info._dressVis = false;
  });
  console.log("[verify] s48 storeship dress built for "+Object.keys(STORESHIP_INFO).length+" hulks (shed+gangway+sign, state-gated)");
})();

/* @P1850-CHUNK 49 — wharf boats + lighters */
/* TECHNIQUES §4.3 — moored-boat variety at the Central Wharf head: 2-3
   small craft clustered off the working end, believability from parameter
   noise (per-instance yaw jitter, a slight permanent heel, independent
   bob phase) rather than hull count. One InstancedMesh; positions ride
   window._centralWharfTip so the cluster follows the deck as it grows. */
var WHARF_BOAT_N = 3;
var wharfBoatMesh = new THREE.InstancedMesh(makeRowboatGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), WHARF_BOAT_N);
wharfBoatMesh.count = 0; scene.add(wharfBoatMesh);
var WHARF_BOAT_JIT = [ {dx:-2.5, side:1,  yaw:0.35, heel:0.05, phase:0.0},
                       {dx:-6.8, side:1,  yaw:-0.5, heel:0.08, phase:2.1},
                       {dx:-4.2, side:-1, yaw:0.9,  heel:0.04, phase:4.4} ];
/* s48: lighters (scows) working the water between the wharf head and the
   anchorage — the fleet's cargo actually moved through these. Positions
   ride the growing wharf tip seaward (+x is bayward all along the cove
   frontage); depth-checked each frame so a growing wharf never leaves a
   scow beached. */
var LIGHTER_N = 4;
var lighterMesh = new THREE.InstancedMesh(makeScowGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), LIGHTER_N);
lighterMesh.count = 0; scene.add(lighterMesh);
var LIGHTER_JIT = [ {dx:16, dz: 13, yaw: 1.25, heel:0.03, phase:1.0},
                    {dx:30, dz:-17, yaw:-0.40, heel:0.05, phase:3.2},
                    {dx:52, dz:  7, yaw: 2.40, heel:0.02, phase:5.0},
                    {dx:22, dz: 34, yaw: 0.20, heel:0.04, phase:0.6} ];
function updateWharfBoats(tSec){
  var tip = window._centralWharfTip;
  if(!tip || tip.len<24){ wharfBoatMesh.count = 0; lighterMesh.count = 0; return; }
  for(var i=0;i<WHARF_BOAT_N;i++){
    var b = WHARF_BOAT_JIT[i];
    var bx = tip.x + b.dx, bz = tip.z + b.side*(tip.deckW/2 + 2.6);
    var by = 0.10 + Math.sin(tSec*0.9 + b.phase)*0.06; // independent bob phase
    setShipInstance(wharfBoatMesh, i, bx, by, bz, b.yaw, 1, b.heel);
  }
  wharfBoatMesh.count = WHARF_BOAT_N;
  wharfBoatMesh.instanceMatrix.needsUpdate = true;
  var ln = 0;
  if(tip.len >= 40){ // lighters appear once the wharf is a real cargo head
    for(var li=0; li<LIGHTER_N; li++){
      var L = LIGHTER_JIT[li];
      var lx = tip.x + L.dx, lz = tip.z + L.dz;
      if(terrainHeight(lx,lz) > -0.6) continue; // honest water only
      var ly = 0.08 + Math.sin(tSec*0.7 + L.phase)*0.05;
      setShipInstance(lighterMesh, ln++, lx, ly, lz, L.yaw, 1, L.heel);
    }
  }
  lighterMesh.count = ln;
  lighterMesh.instanceMatrix.needsUpdate = true;
}


/* ---- ships audits (layers-spec.md rules block): never dry; sailing paths
   sample water-only; the channel corridor is honest water — wrap the existing
   __P1850.shipAudit / sailAudit / channelAudit. ---- */
registerAudit("ships", "dry", function(){
  var r = window.__P1850.shipAudit();
  return { pass: r.dry.length===0 && r.unplaced===0, date: r.date,
           anchored: r.anchored, dry: r.dry, unplaced: r.unplaced, mud: r.mud, water: r.water };
});
registerAudit("ships", "sailPaths", function(){
  var rs = window.__P1850.sailAudit();
  var bad = rs.filter(function(v){ return v.dry.length>0; });
  return { pass: bad.length===0, sailing: rs.length, violations: bad };
});
registerAudit("ships", "channel", function(){
  var rs = window.__P1850.channelAudit();
  var bad = rs.filter(function(c){ return c.shallow.length>0; });
  return { pass: bad.length===0,
           minDepths: rs.map(function(c){ return { path:c.name, minDepth:c.minDepth }; }),
           violations: bad };
});

/* dev-tooling visibility interface (layers-spec.md §15): this layer's visibility toggle */
registerLayerVisibility("ships", function(v){ shipHullMeshes.concat(shipSailMeshes, shipFurlMeshes, mastClusterMeshes, [wharfBoatMesh, lighterMesh, window._wharfLandingMesh, window._centralWharfGroup, window._cwPileMesh]).forEach(function(m){ if(m) m.visible = v; }); Object.keys(STORESHIP_INFO).forEach(function(k){ (STORESHIP_INFO[k]._dress||[]).forEach(function(m){ m.visible = v && !!STORESHIP_INFO[k]._dressVis; }); }); });
