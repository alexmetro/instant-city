/* =====================================================================
   core/08-cadastre — THE GROUND PLAN (building-spawn-spec.md §1 v1.2): the
   single dated cadastre that sits BESIDE the spine. Blocks + plat lots (the
   50-vara fabric) + named parcels, all a PURE deterministic function of the
   street spine (zero dice — the lotDeterminism audit proves the seeded RNG
   counter never moves). The one interface every future admission consumes:
   groundPlanAt(x,z,day) -> { block?, platLot?, plot?, parcels[], row?, band? }.
   The `plot` field is RESERVED (null in v1) so the signature does not change
   when demand-driven building plots (§1.3 tier 3b) arrive with buildings v2.

   CONSUMES s76's seam design (stable edge keys): a block is identified by the
   four STREET IDS that bound it (B|west|east|north|south) and a lot by that
   key + its (iU,iV) ordinal — persistent, spine-derived identities that
   survive re-derivation byte-identically. TAKEN from s76: the stable street-id
   edge keys, the vara metrology (50 varas = 41.91 m), the two-frame plaza
   keep-out math (folded here as the portsmouth-square parcel). LEFT in s76
   (buildings' scope, not the cadastre): the uVals/vVals hardcoded 4x6 grid,
   blockDensity/frontify occupancy fill, buildFireBlock — all demand/occupancy
   logic that belongs to the buildings admission, never to the fixed plat.

   OWNS: BLOCKS (polygons from the network per survey checkpoint), PLAT LOTS
   (the 50-vara subdivision, corner flags, water-lot class), NAMED PARCELS
   (dated polygons + allowed-asset-class lists). FOLDS the older scattered zone
   predicates (inIntertidalBand / inBeachBand / inPublicSquare) into parcels so
   there is ONE zone truth — those core predicates (02-scene) become thin
   wrappers over this system.
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s); global CHUNK order
   splices it right after the geography spine (chunk 02) and scene renderer
   (chunk 03), before the placement engine (chunk 13) that consumes its folded
   predicates at runtime. Pure DATA at load — touches no THREE/scene object.
   ===================================================================== */
/* @P1850-CHUNK 04 — the ground-plan cadastre: blocks, plat lots, named parcels, groundPlanAt() */

/* THE VARA STANDARD (research/METROLOGY-PHASE0.md §0, primary-verified):
   California statute vara = 33 in = 0.8382 m; a 50-vara lot = 137.5 ft =
   41.910 m square; a standard 100x150-vara block = 83.82 x 125.73 m = SIX
   50-vara lots (2 x 3). These are the numbers the in-world plat is MEASURED
   AGAINST (THE BLOCK IS THE BAROMETER, foundation-reset §2) — the deviation
   each lot stores is (actual dim / this standard − 1). */
var CAD_VARA_M = 0.8382;
var CAD_LOT_STD_M = 50 * CAD_VARA_M;                 // 41.910 m — the 50-vara reference lot
var CAD_STD_LOTS_PER_BLOCK = 6;                       // 2 x 3

/* The lattice is built ONLY from the cardinal surveyed grid streets — the
   avenues (constant u) and streets (constant v). Market (diagonal district
   boundary), the Mission road, the South-of-Market 100-vara district
   (numbered + hundred-vara diagonal streets), and the minor mid-block lanes
   (Portsmouth/Water/Shubrick/Commercial) are DELIBERATELY excluded: a
   diagonal or a short lane is not a plat parallel. The SoMa 100-vara grid is
   a distinct rotated fabric represented in v1 as a named parcel, not lots
   (its subdivision is a fast-follow — see the report). */
var CAD_GRID_CLASSES = { "main":1, "main-override":1, "cross":1, "cross-override":1, "cross-ofarrell":1 };
var CAD_EPS = 1.0; // m — "constant u/v" and span-coverage tolerance

/* Classify every grid street as N-S (constant u = an avenue edge) or E-W
   (constant v = a street edge), sorted along their varying axis. */
var CAD_NS = [], CAD_EW = [];
(function classifyGridStreets(){
  STREETS_RUNTIME.forEach(function(s){
    if(!CAD_GRID_CLASSES[s.cls]) return;
    var us = s.polyline.map(function(p){ return p.u; }), vs = s.polyline.map(function(p){ return p.v; });
    var du = Math.max.apply(null,us)-Math.min.apply(null,us), dv = Math.max.apply(null,vs)-Math.min.apply(null,vs);
    if(du < CAD_EPS)      CAD_NS.push({ id:s.id, u:us[0], s:s });
    else if(dv < CAD_EPS) CAD_EW.push({ id:s.id, v:vs[0], s:s });
  });
  CAD_NS.sort(function(a,b){ return a.u-b.u; });
  CAD_EW.sort(function(a,b){ return a.v-b.v; });
})();

/* Earliest checkpoint day at which a street's rendered extent COVERS a
   perpendicular span — this is what makes a block "born at its bounding
   streets' survey date": a Vioget street covers only its small original
   extent until O'Farrell 1847 grows it, so a block south of the original
   survey is not born until the streets reach it. Infinity = never covered. */
function cadCoverDayNS(st, vLo, vHi){ // N-S avenue: its extent is a v-range
  var best = Infinity;
  for(var i=0;i<st.checkpoints.length;i++){ var c=st.checkpoints[i];
    var a=st.polyline[c.extent[0]].v, b=st.polyline[c.extent[1]].v, lo=Math.min(a,b), hi=Math.max(a,b);
    if(vLo>=lo-CAD_EPS && vHi<=hi+CAD_EPS) best=Math.min(best,c.day);
  }
  return best;
}
function cadCoverDayEW(st, uLo, uHi){ // E-W street: its extent is a u-range
  var best = Infinity;
  for(var i=0;i<st.checkpoints.length;i++){ var c=st.checkpoints[i];
    var a=st.polyline[c.extent[0]].u, b=st.polyline[c.extent[1]].u, lo=Math.min(a,b), hi=Math.max(a,b);
    if(uLo>=lo-CAD_EPS && uHi<=hi+CAD_EPS) best=Math.min(best,c.day);
  }
  return best;
}

/* Market is the SE boundary of the 50-vara district — everything on its
   bay/South-of-Market side is the 100-vara grid, not our lattice. Sign
   calibrated so the plaza (well inside the district) returns >0 = keep. */
var CAD_MARKET_A = { u:353.5, v:452.37 }, CAD_MARKET_B = { u:-3453.51, v:3218.33 };
function cadMarketSide(u,v){
  var ABu = CAD_MARKET_B.u-CAD_MARKET_A.u, ABv = CAD_MARKET_B.v-CAD_MARKET_A.v;
  return ABu*(v-CAD_MARKET_A.v) - ABv*(u-CAD_MARKET_A.u);
}

/* Water-lot test (folds the 1847 beach-and-water-lot region into the plat):
   a lot whose centroid sits seaward of the traced 1846 high-water line and at
   or below the tide-flat height is a WATER LOT — "Yerba Buena Cove is a lot
   that houses ships" (building-spawn-spec §1). Pure geometry (shorelineX +
   the baked heightmap), no dice. */
function cadIsWaterLot(cx, cz){
  return cx >= shorelineX(cz) - 4 && sampleTerrainGrid(cx,cz) <= 0.6;
}

/* =====================================================================
   THE HUNDRED VARA DISTRICT (s85 — THE TWO-STANDARD CADASTRE, the structural
   fix). South of Market, O'Farrell's 1847 survey DOUBLED the module: blocks
   are 200×300 varas (167.64 × 251.46 m) holding SIX 100×100-vara lots
   (83.820 m square, 2 cols along Market × 3 rows into the district) — the same
   6-lot COUNT as a Fifty Vara block but each lot 4× the AREA, on a grid rotated
   to Mission Road's bearing (~36° off the cardinal grid), a genuinely different
   frame (research/plat-truth-stage1.md §0, primary-corroborated by the Eddy
   1849 plat and by corpus "100 vara lot No. N" single-sale-unit citations).

   DISTRICT DETECTION + GEOMETRY SOURCE (documented choice, s85): the fabric is
   tiled ANALYTICALLY at the documented 100-vara module, ANCHORED to the
   surveyed spine's SoMa frame (origin O = the Market/First-Street corner; axes
   â = along-Market, b̂ = into-district, both read straight off the spine so the
   ~36° bearing and origin are geodetic-locked, never re-anchored). It is NOT
   derived cell-by-cell from the SoMa street lines because those lines are
   spaced at 83.8 m = ONE 100-vara lot edge (numbered streets First–Eighth,
   parallel streets Mission–Brannan) — i.e. the street data resolves the
   district at LOT granularity, not the 200×300-vara BLOCK granularity, so
   street-cell derivation would either give 1-lot "blocks" or, after ROW inset,
   62.8 m lots (both wrong). The documented module is the robust source; the
   street-spacing mismatch is a flagged finding for a future streets-data pass
   (see the s85 report). Blocks are authored plat-dimension (property-line to
   property-line) without ROW inset in v1 (the bounding-street widths are the
   very data in dispute). Zero dice — a pure function of the spine, exactly like
   the Fifty Vara fabric. Edge blocks (a partial column/row where the envelope
   is not an even multiple of the 2×3 module) are flagged non-standard, the same
   way the cardinal lattice flags its edge blocks. */
var CAD_HV_LOT_VARA   = 100;
var CAD_HV_LOT_STD_M  = CAD_HV_LOT_VARA * CAD_VARA_M;      // 83.820 m — the 100-vara reference lot
var CAD_HV_BLOCK_COLS = 2;                                 // along Market (200 vara)
var CAD_HV_BLOCK_ROWS = 3;                                 // into the district (300 vara)
var CAD_HV_SURVEY_DAY = ERA_MAP_SIMDAY["ofarrell-1847"];   // 396 (Aug 1 1847) — the Hundred Vara survey

/* The SoMa frame, DERIVED from the surveyed spine (geodetic lock — never a new
   origin/angle): â = along-Market unit (the parallel-street axis); b̂ =
   into-district unit (the numbered-street axis, ⟂ to â); O = the Market/First
   corner. All in (u,v) grid space. Blocks/lots are authored in the (s,t) local
   frame (s along â, t along b̂) then mapped back to rotated (u,v) quads. */
var CAD_SOMA_FRAME = (function(){
  var mk = STREETS_RUNTIME_BY_ID["market"];
  var f1 = STREETS_RUNTIME_BY_ID["numbered-streets-first-eighth:First"];
  if(!mk || !f1) return null;
  function unit(du,dv){ var Lm=Math.hypot(du,dv)||1; return { u:du/Lm, v:dv/Lm }; }
  var m0=mk.polyline[0], m1=mk.polyline[1];
  var a = unit(m1.u-m0.u, m1.v-m0.v);                      // along-Market
  var p0=f1.polyline[0], p1=f1.polyline[f1.polyline.length-1];
  var b = unit(p1.u-p0.u, p1.v-p0.v);                      // into-district (⟂)
  return { O:{ u:p0.u, v:p0.v }, a:a, b:b };
})();
/* World azimuths of the two SoMa axes (undirected, degrees) — the platFrame
   audit checks Hundred Vara lot edges against THESE (the district's own
   bearing) instead of the cardinal streets. */
var CAD_SOMA_WORLD_AZ = (function(){
  if(!CAD_SOMA_FRAME) return null;
  var O=CAD_SOMA_FRAME.O, a=CAD_SOMA_FRAME.a, b=CAD_SOMA_FRAME.b;
  var w0=gridToWorld(O.u,O.v), wa=gridToWorld(O.u+a.u,O.v+a.v), wb=gridToWorld(O.u+b.u,O.v+b.v);
  function az(dx,dz){ var A=Math.atan2(dz,dx)*180/Math.PI; return ((A%180)+180)%180; }
  return { a:az(wa.x-w0.x, wa.z-w0.z), b:az(wb.x-w0.x, wb.z-w0.z) };
})();

/* deriveHundredVara() — appends the SoMa district's blocks/lots to the plan.
   Envelope is measured from the digitized SoMa street members (so the extent
   tracks the surveyed spine); the module is the documented 100-vara lot. */
function deriveHundredVara(blocks, lots, byId){
  var F = CAD_SOMA_FRAME; if(!F) return;
  function toST(u,v){ var du=u-F.O.u, dv=v-F.O.v; return { s:du*F.a.u+dv*F.a.v, t:du*F.b.u+dv*F.b.v }; }
  function toUV(s,t){ return { u:F.O.u + s*F.a.u + t*F.b.u, v:F.O.v + s*F.a.v + t*F.b.v }; }
  var sMin=Infinity,sMax=-Infinity,tMin=Infinity,tMax=-Infinity;
  STREETS_RUNTIME.forEach(function(st){
    if(st.id.indexOf("hundred-vara-district-streets:")!==0 && st.id.indexOf("numbered-streets-first-eighth:")!==0) return;
    st.polyline.forEach(function(p){ var q=toST(p.u,p.v);
      if(q.s<sMin)sMin=q.s; if(q.s>sMax)sMax=q.s; if(q.t<tMin)tMin=q.t; if(q.t>tMax)tMax=q.t; });
  });
  if(!isFinite(sMin)) return;
  var Lm = CAD_HV_LOT_STD_M;
  var nLotS = Math.max(1, Math.round((sMax-sMin)/Lm));     // lot-cells along Market
  var nLotT = Math.max(1, Math.round((tMax-tMin)/Lm));     // lot-cells into the district
  var s0=sMin, t0=tMin;
  function uvBBox(q){ return { uLo:Math.min(q[0].u,q[1].u,q[2].u,q[3].u), uHi:Math.max(q[0].u,q[1].u,q[2].u,q[3].u),
                               vLo:Math.min(q[0].v,q[1].v,q[2].v,q[3].v), vHi:Math.max(q[0].v,q[1].v,q[2].v,q[3].v) }; }
  for(var bi=0; bi*CAD_HV_BLOCK_COLS < nLotS; bi++){
    var colLo=bi*CAD_HV_BLOCK_COLS, colHi=Math.min(nLotS, colLo+CAD_HV_BLOCK_COLS), nc=colHi-colLo;
    for(var bj=0; bj*CAD_HV_BLOCK_ROWS < nLotT; bj++){
      var rowLo=bj*CAD_HV_BLOCK_ROWS, rowHi=Math.min(nLotT, rowLo+CAD_HV_BLOCK_ROWS), nr=rowHi-rowLo;
      var bsLo=s0+colLo*Lm, bsHi=s0+colHi*Lm, btLo=t0+rowLo*Lm, btHi=t0+rowHi*Lm;
      var bq=[toUV(bsLo,btLo),toUV(bsHi,btLo),toUV(bsHi,btHi),toUV(bsLo,btHi)]; // SW,SE,NE,NW in (s,t)
      var bb=uvBBox(bq);
      var std=(nc===CAD_HV_BLOCK_COLS && nr===CAD_HV_BLOCK_ROWS);
      var key="HV|"+colLo+"_"+colHi+"|"+rowLo+"_"+rowHi;
      var blk={ key:key, birth:CAD_HV_SURVEY_DAY, district:"hundred-vara",
                edges:{ west:null, east:null, north:null, south:null, district:"hundred-vara" },
                uLo:bb.uLo, uHi:bb.uHi, vLo:bb.vLo, vHi:bb.vHi, extU:(bsHi-bsLo), extV:(btHi-btLo),
                nU:nc, nV:nr, uvQuad:bq, sLo:bsLo, sHi:bsHi, tLo:btLo, tHi:btHi,
                standard:std, publicReserve:false, waterLots:0, lots:[] };
      var waterN=0;
      for(var a=0;a<nc;a++) for(var b2=0;b2<nr;b2++){
        var lsLo=bsLo+a*Lm, lsHi=bsLo+(a+1)*Lm, ltLo=btLo+b2*Lm, ltHi=btLo+(b2+1)*Lm;
        var lq=[toUV(lsLo,ltLo),toUV(lsHi,ltLo),toUV(lsHi,ltHi),toUV(lsLo,ltHi)];
        var lb=uvBBox(lq), cuv=toUV((lsLo+lsHi)/2,(ltLo+ltHi)/2), cw=gridToWorld(cuv.u,cuv.v);
        var water=cadIsWaterLot(cw.x,cw.z); if(water)waterN++;
        var wM=lsHi-lsLo, dM=ltHi-ltLo, devW=wM/CAD_HV_LOT_STD_M-1, devD=dM/CAD_HV_LOT_STD_M-1;
        var lot={ id:key+"#"+a+","+b2, block:key, district:"hundred-vara", iU:a, iV:b2, birth:CAD_HV_SURVEY_DAY,
                  u:{ lo:lb.uLo, hi:lb.uHi }, v:{ lo:lb.vLo, hi:lb.vHi }, uvQuad:lq,
                  widthM:wM, depthM:dM, devW:devW, devD:devD, dev:Math.max(Math.abs(devW),Math.abs(devD)),
                  corner:(a===0||a===nc-1)&&(b2===0||b2===nr-1), water:water,
                  source:"pattern", lotNumber:null, recordSource:null, cx:cw.x, cz:cw.z };
        blk.lots.push(lot); lots.push(lot); byId[lot.id]=lot;
      }
      blk.waterLots=waterN; blocks.push(blk);
    }
  }
}

/* deriveGroundPlan() — the PURE derivation. Same spine in ⇒ byte-identical
   plan out, zero seeded-dice draws (lotDeterminism proves both). Returns
   { blocks, lots, byId }. A block is the land BETWEEN its four bounding
   street centerlines, inset by each street's constant surveyed half-width
   (so lot fabric runs property-line to property-line and the 6-lot pattern
   closes exactly against the real block polygon). */
function deriveGroundPlan(){
  var blocks = [], lots = [], byId = {};
  /* PUBLIC RESERVE (s82): Portsmouth Square was the city common — a reserved
     PUBLIC block, never subdivided in our window. The block containing the
     plaza centroid (PLAZA_CENTER, inverted through the resting base frame —
     the post-1847-swing frame the plat rests in) is flagged publicReserve and
     generates ZERO plat lots (platted common ≠ platted lots). The parcel
     polygon below is DERIVED from this block, so parcel and plat can never
     disagree. */
  var plazaG = cadWorldToGridAt(PLAZA_CENTER.x, PLAZA_CENTER.z, GRID_ROT_BASE);
  for(var i=0;i<CAD_NS.length-1;i++) for(var j=0;j<CAD_EW.length-1;j++){
    var wS=CAD_NS[i], eS=CAD_NS[i+1], nS=CAD_EW[j], sS=CAD_EW[j+1];
    var uLoC=wS.u, uHiC=eS.u, vLoC=nS.v, vHiC=sS.v; // centerline cell
    var birth = Math.max(
      cadCoverDayNS(wS.s, vLoC, vHiC), cadCoverDayNS(eS.s, vLoC, vHiC),
      cadCoverDayEW(nS.s, uLoC, uHiC), cadCoverDayEW(sS.s, uLoC, uHiC)
    );
    if(!isFinite(birth)) continue;                       // an edge never reaches ⇒ not a block
    if(cadMarketSide((uLoC+uHiC)/2, (vLoC+vHiC)/2) < 0) continue; // beyond Market (SoMa grid)
    // block interior: inset the centerline cell by each street's half width
    var uLo=uLoC + wS.s.widthM/2, uHi=uHiC - eS.s.widthM/2;
    var vLo=vLoC + nS.s.widthM/2, vHi=vHiC - sS.s.widthM/2;
    var extU=uHi-uLo, extV=vHi-vLo;
    if(extU<5 || extV<5) continue;                       // degenerate (never triggers on the real spine)
    // FIT THE PATTERN TO THE ACTUAL BLOCK: lot counts from the real extent /
    // the vara standard; equal proportional divisions absorb the real spacing.
    var nU=Math.max(1, Math.round(extU/CAD_LOT_STD_M)), nV=Math.max(1, Math.round(extV/CAD_LOT_STD_M));
    var std = (nU*nV===CAD_STD_LOTS_PER_BLOCK) && ((nU===3&&nV===2)||(nU===2&&nV===3));
    var key = "B|"+wS.id+"|"+eS.id+"|"+nS.id+"|"+sS.id;
    var isReserve = plazaG.u>uLo && plazaG.u<uHi && plazaG.v>vLo && plazaG.v<vHi;
    var blk = { key:key, birth:birth, district:"fifty-vara", edges:{ west:wS.id, east:eS.id, north:nS.id, south:sS.id },
                uLo:uLo, uHi:uHi, vLo:vLo, vHi:vHi, extU:extU, extV:extV, nU:nU, nV:nV,
                standard:std, publicReserve:isReserve, waterLots:0, lots:[] };
    var waterN=0;
    if(isReserve){ blocks.push(blk); continue; }         // public reserve: ZERO plat lots
    for(var a=0;a<nU;a++) for(var b=0;b<nV;b++){
      var lu0=uLo+extU*a/nU, lu1=uLo+extU*(a+1)/nU, lv0=vLo+extV*b/nV, lv1=vLo+extV*(b+1)/nV;
      var wM=lu1-lu0, dM=lv1-lv0;
      var cu=(lu0+lu1)/2, cv=(lv0+lv1)/2, cw=gridToWorld(cu,cv);
      var water = cadIsWaterLot(cw.x, cw.z);
      if(water) waterN++;
      var devW = wM/CAD_LOT_STD_M - 1, devD = dM/CAD_LOT_STD_M - 1;
      var lot = { id:key+"#"+a+","+b, block:key, district:"fifty-vara", iU:a, iV:b, birth:birth,
                  u:{ lo:lu0, hi:lu1 }, v:{ lo:lv0, hi:lv1 },
                  widthM:wM, depthM:dM, devW:devW, devD:devD, dev:Math.max(Math.abs(devW),Math.abs(devD)),
                  corner:(a===0||a===nU-1)&&(b===0||b===nV-1), water:water,
                  // s85: source tag (pattern | record) + recorded identity, set by
                  // cadApplyRecord() below where a plat-lots-known.json entry claims
                  // this lot; pattern-fill everywhere else.
                  source:"pattern", lotNumber:null, recordSource:null,
                  // canonical-frame centroid, used ONLY by the water-lot birth
                  // classification above (a fixed property). NO baked world quad
                  // is stored (s81 Director ruling) — world geometry comes from
                  // lotWorldQuad(lot, day) so no consumer can grab a stale frame.
                  cx:cw.x, cz:cw.z };
      blk.lots.push(lot); lots.push(lot); byId[lot.id]=lot;
    }
    blk.waterLots = waterN;
    blocks.push(blk);
  }
  deriveHundredVara(blocks, lots, byId);   // s85: append the SoMa 100-vara district
  cadApplyRecord(blocks, byId);            // s85: overlay plat-lots-known.json record identities
  return { blocks:blocks, lots:lots, byId:byId };
}

/* =====================================================================
   THE RECORD OVERLAY (s85 — CADASTRE CONSUMES THE RECORD, building-spawn-spec
   §1.3 "documented buildings anchor to their known lot… the record wins").
   data/plat-lots-known.json (baked to app/plat-lots-known.js →
   window.PLAT_LOTS_KNOWN) is the digitized survey registry read off the Eddy
   1849 plat. Where a known lot exists for a block, the cadastre stamps the
   RECORDED identity (lot number — including fractional lots like "19½" — and
   the source citation) onto the matching pattern lot, tagging it source:"record"
   (pattern-fill remains everywhere else, tagged source:"pattern"). v1 overlays
   IDENTITY + a recorded-dimension check; it does not yet re-cut fractional lot
   GEOMETRY (a fast-follow — the pattern division stands as the lot's shape until
   per-lot boundary widths are recovered from the Block Book). Records are keyed
   by block_ref → the cadastre's block; a record's (col,row) or lot-position hint
   maps it onto a pattern lot's (iU,iV). PURE (data join, zero dice). Records
   that name a publicReserve block (the plaza common, which holds zero lots) or a
   block/position not present in the plan are collected as `unmatched` for the
   platRecords audit rather than forced. */
function cadApplyRecord(blocks, byId){
  var REG = (typeof window!=="undefined" && window.PLAT_LOTS_KNOWN) ? window.PLAT_LOTS_KNOWN : null;
  GROUND_PLAN_RECORD_STATS = { registryLoaded:!!REG, records:0, matched:0, unmatched:[], dimFlags:[] };
  if(!REG || !REG.lots) return;
  var byBlock = {}; blocks.forEach(function(b){ byBlock[b.key]=b; });
  REG.lots.forEach(function(rec){
    if(rec.type==="named_parcel") return;                 // named parcels handled by GROUND_PARCELS
    GROUND_PLAN_RECORD_STATS.records++;
    var b = byBlock[rec.block_ref];
    if(!b){ GROUND_PLAN_RECORD_STATS.unmatched.push({ lot:rec.lot_number, block:rec.block_ref, reason:"block-not-in-plan" }); return; }
    if(b.publicReserve){ GROUND_PLAN_RECORD_STATS.unmatched.push({ lot:rec.lot_number, block:rec.block_ref, reason:"public-reserve-zero-lots" }); return; }
    // map the record onto a pattern lot: explicit (iU,iV) if given, else first free lot
    var lot=null;
    if(rec.iU!=null && rec.iV!=null) lot = b.lots.filter(function(l){ return l.iU===rec.iU && l.iV===rec.iV; })[0];
    if(!lot) lot = b.lots.filter(function(l){ return l.source!=="record"; })[0];
    if(!lot){ GROUND_PLAN_RECORD_STATS.unmatched.push({ lot:rec.lot_number, block:rec.block_ref, reason:"no-free-lot" }); return; }
    lot.source="record"; lot.lotNumber=rec.lot_number; lot.recordSource=rec.survey || (rec._source||"eddy-1849");
    lot.recordCitation = rec.note || null;
    GROUND_PLAN_RECORD_STATS.matched++;
    // recorded-dimension check (record-only; flags, never forces geometry)
    if(rec.dimensions && rec.dimensions.width_m!=null){
      var dExp = (b.district==="hundred-vara"?CAD_HV_LOT_STD_M:CAD_LOT_STD_M);
      var dW = Math.abs(rec.dimensions.width_m - lot.widthM), dD = Math.abs((rec.dimensions.depth_m||rec.dimensions.width_m) - lot.depthM);
      if(dW>2.0 || dD>2.0) GROUND_PLAN_RECORD_STATS.dimFlags.push({ lot:rec.lot_number, block:rec.block_ref,
        recW:+rec.dimensions.width_m.toFixed(2), patW:+lot.widthM.toFixed(2), dW:+dW.toFixed(2), dD:+dD.toFixed(2) });
    }
  });
}
var GROUND_PLAN_RECORD_STATS = { registryLoaded:false, records:0, matched:0, unmatched:[], dimFlags:[] };

var GROUND_PLAN = deriveGroundPlan();

/* =====================================================================
   THE DAY FRAME — SINGLE FRAME (user decision + Director concurrence,
   2026-07-14, road-master-spec SINGLE-FRAME AMENDMENT). The plat is stored
   frame-agnostic in (u,v); world geometry is produced AT QUERY TIME. cadSkewAt
   once materialized the Feb-Aug 1847 O'Farrell grid-swing HERE (Vioget −6.5°
   → base −9.0°, eased by date) so consumers did zero frame math. The swing is
   now DELETED as geometry — no street physically rotated — so cadSkewAt
   resolves to the ONE canonical frame (GRID_ROT_BASE, −9.0°) at every date.
   The `day` parameter is RETAINED for API stability (lotWorldQuad(lot, day)
   and every point-query keep their signatures) but no longer changes the
   frame: one frame, all dates.
   ===================================================================== */
function cadSkewAt(day){ return GRID_ROT_BASE; } // day ignored — single frame (2026-07-14)
/* Parameterized inverse of gridToWorldAt() — same canonical origin/angle
   constants (geodetic lock: DERIVED from the one fit, never re-anchored).
   worldToGrid() is exactly this at the resting base frame. */
function cadWorldToGridAt(x, z, ang){
  var lx = x - GRID_ORIGIN_X, lz = z - GRID_ORIGIN_Z;
  var c = Math.cos(ang), s = Math.sin(ang);
  return { u: lx*c + lz*s, v: -lx*s + lz*c };
}
/* Day-correct world geometry for a lot (or lot id): 4-corner quad
   [SW,SE,NE,NW] + centroid in the queried day's frame. THE one way any
   consumer obtains lot world geometry. */
function lotWorldQuad(lotOrId, day){
  var l = typeof lotOrId === "string" ? GROUND_PLAN.byId[lotOrId] : lotOrId;
  if(!l) return null;
  var a = cadSkewAt(day);
  // s85: Hundred Vara lots/blocks carry an explicit rotated (u,v) quad (the
  // SoMa frame is ~36° off the cardinal grid, so it is NOT an axis-aligned uv
  // rect); the cardinal Fifty Vara fabric builds its quad from the u/v bbox.
  var c = l.uvQuad ? l.uvQuad
        : [ {u:l.u.lo,v:l.v.lo},{u:l.u.hi,v:l.v.lo},{u:l.u.hi,v:l.v.hi},{u:l.u.lo,v:l.v.hi} ];
  var sw=gridToWorldAt(c[0].u,c[0].v,a), se=gridToWorldAt(c[1].u,c[1].v,a),
      ne=gridToWorldAt(c[2].u,c[2].v,a), nw=gridToWorldAt(c[3].u,c[3].v,a);
  return { quad:[{x:sw.x,z:sw.z},{x:se.x,z:se.z},{x:ne.x,z:ne.z},{x:nw.x,z:nw.z}],
           cx:(sw.x+ne.x)/2, cz:(sw.z+ne.z)/2, skew:a };
}

/* =====================================================================
   NAMED PARCELS — dated polygons (or predicates) carrying allowed-asset-class
   lists. This is placement-spec P3/P13 zone logic given ONE home. Each parcel:
     { name, cls, birth, allow:[classes], space:"uv"|"world", poly | contains }
   Parcels with a `contains(x,z)` predicate FOLD the older core zone predicates
   so there is one zone truth; the poly parcels are closed rings.
   ===================================================================== */
var CAD_DAY_ALWAYS = -1e9;

/* Portsmouth Square — BLOCK-DERIVED (s82, user finding on the live atelier).
   The plaza parcel polygon IS its cadastre block polygon (the publicReserve
   block bounded by Kearny/Clay/Dupont/Washington, found via the plaza
   centroid in deriveGroundPlan). It therefore inherits the exact ROW-edge
   fit (block bounds = centerline − surveyed half-width, the same numbers the
   lots close against) and, as a uv-space parcel, the day-frame behavior
   automatically (cadParcelContains inverts uv polys through cadSkewAt).
   Replaces the old hand-authored two-frame GEO.plaza rect, which spanned
   street CENTERLINES and so overlapped the surrounding rights-of-way.
   Open ground — structures/lot-lines/fences keep out; the block generates
   zero plat lots (platted common, never subdivided in-window). */
var CAD_PLAZA_BLOCK = (function(){
  var r = GROUND_PLAN.blocks.filter(function(b){ return b.publicReserve; });
  return r.length===1 ? r[0] : null;   // !==1 is a parcelIntegrity failure, reported not forced
})();
var CAD_PLAZA_POLY = CAD_PLAZA_BLOCK ? [
  { u:CAD_PLAZA_BLOCK.uLo, v:CAD_PLAZA_BLOCK.vLo }, { u:CAD_PLAZA_BLOCK.uHi, v:CAD_PLAZA_BLOCK.vLo },
  { u:CAD_PLAZA_BLOCK.uHi, v:CAD_PLAZA_BLOCK.vHi }, { u:CAD_PLAZA_BLOCK.uLo, v:CAD_PLAZA_BLOCK.vHi }
] : null;
/* storeship mud band = the intertidal band (folds inIntertidalBand's math). */
function cadIntertidalContains(x,z){ return x >= shorelineX(z) - 4 && terrainHeight(x,z) <= 0.5; }
/* beach band (folds inBeachBand's math). */
function cadBeachContains(x,z){ var h=terrainHeight(x,z); return x >= shorelineX(z) - 30 && h > -0.6 && h <= 1.8; }

/* Yerba Buena Cove anchorage — the water body seaward of the traced 1846
   high-water line across the cove's z-span (Clark's Point to the south beach),
   out to a bay edge. A closed world ring sampled from the shoreline curve. */
var CAD_COVE_POLY = (function(){
  var pts=[], zN=-360, zS=1180, step=60, BAYOUT=1250;
  for(var z=zN; z<=zS; z+=step) pts.push({ x:shorelineX(z)+2, z:z });      // inland edge (the shore)
  for(var z2=zS; z2>=zN; z2-=step) pts.push({ x:shorelineX(z2)+BAYOUT, z:z2 }); // bay edge
  return pts;
})();

/* Platted-region boundary — the surveyed district envelope in (u,v). */
var CAD_PLAT_BOUNDS = (function(){
  var uLo=Infinity,uHi=-Infinity,vLo=Infinity,vHi=-Infinity;
  GROUND_PLAN.blocks.forEach(function(b){ uLo=Math.min(uLo,b.uLo); uHi=Math.max(uHi,b.uHi); vLo=Math.min(vLo,b.vLo); vHi=Math.max(vHi,b.vHi); });
  return [ {u:uLo,v:vLo},{u:uHi,v:vLo},{u:uHi,v:vHi},{u:uLo,v:vHi} ];
})();

/* Happy Valley / South-of-Market camp corridor — the 100-vara district south
   of Market where the 1849 tent settlement stood (numbered streets). Bbox of
   the numbered-street members, projected to world. Born at Eddy 1849. */
var CAD_HAPPY_VALLEY_POLY = (function(){
  var uLo=Infinity,uHi=-Infinity,vLo=Infinity,vHi=-Infinity, any=false;
  STREETS_RUNTIME.forEach(function(s){
    if(s.id.indexOf("numbered-streets")!==0 && s.id.indexOf("numbered-streets-first-eighth")<0) return;
    any=true; s.polyline.forEach(function(p){ uLo=Math.min(uLo,p.u); uHi=Math.max(uHi,p.u); vLo=Math.min(vLo,p.v); vHi=Math.max(vHi,p.v); });
  });
  if(!any){ uLo=0; uHi=800; vLo=460; vHi=1300; } // fallback SoMa box
  return [gridToWorld(uLo,vLo),gridToWorld(uHi,vLo),gridToWorld(uHi,vHi),gridToWorld(uLo,vHi)].map(function(p){ return {x:p.x,z:p.z}; });
})();

function cadCirclePoly(cx,cz,r,n){ var out=[]; for(var i=0;i<n;i++){ var a=i/n*Math.PI*2; out.push({x:cx+Math.cos(a)*r, z:cz+Math.sin(a)*r}); } return out; }

var GROUND_PARCELS = [
  { name:"portsmouth-square", cls:"plaza",  birth:CAD_DAY_ALWAYS, allow:["civic","promenade","fountain","well"], keepOutStructures:true,
    space:"uv", poly:CAD_PLAZA_POLY, blockDerived:(CAD_PLAZA_BLOCK?CAD_PLAZA_BLOCK.key:null) /* s82: the parcel IS its block */ },
  { name:"yerba-buena-cove",  cls:"water",  birth:CAD_DAY_ALWAYS, allow:["ship","storeship","wharf","mooring","boat"], space:"world", poly:CAD_COVE_POLY },
  { name:"storeship-mud-band",cls:"mud",    birth:CAD_DAY_ALWAYS, allow:["storeship","wharf","beached-boat","flotsam"], band:"intertidal", contains:cadIntertidalContains },
  { name:"beach-band",        cls:"beach",  birth:CAD_DAY_ALWAYS, allow:["flotsam","beached-boat","boat"], band:"beach", contains:cadBeachContains },
  { name:"platted-region",    cls:"survey", birth:(function(){ var m=Infinity; GROUND_PLAN.blocks.forEach(function(b){ m=Math.min(m,b.birth); }); return m; })(), allow:["*"], space:"uv", poly:CAD_PLAT_BOUNDS },
  { name:"happy-valley-camp", cls:"camp",   birth:eventDateToSimDay("1849-08-01"), allow:["tent","shanty","encampment"], space:"world", poly:CAD_HAPPY_VALLEY_POLY },
  { name:"mission-cluster",   cls:"mission",birth:CAD_DAY_ALWAYS, allow:["mission","adobe","civic","garden"], space:"world", poly:cadCirclePoly(OUTPOSTS.mission.x, OUTPOSTS.mission.z, 230, 20) },
  { name:"presidio",          cls:"presidio",birth:CAD_DAY_ALWAYS, allow:["military","civic","adobe"], space:"world", poly:cadCirclePoly(OUTPOSTS.presidio.x, OUTPOSTS.presidio.z, 260, 20) }
];
var GROUND_PARCELS_BY_NAME = {}; GROUND_PARCELS.forEach(function(p){ GROUND_PARCELS_BY_NAME[p.name]=p; });

function cadPointInPoly(pts, x, z){ // ray cast; points {x,z} (world) or {u,v} (uv parcels)
  /* s82 FIX (proven by parcelIntegrity): uv-space parcel rings are authored
     as {u,v} points, but this reader only knew {x,z} — every uv poly test
     read undefined→NaN and returned false (the plaza centroid was "outside"
     its own parcel; the platted-region parcel silently matched nothing). */
  var inside=false;
  for(var i=0,j=pts.length-1; i<pts.length; j=i++){
    var xi=(pts[i].x!=null?pts[i].x:pts[i].u), zi=(pts[i].z!=null?pts[i].z:pts[i].v);
    var xj=(pts[j].x!=null?pts[j].x:pts[j].u), zj=(pts[j].z!=null?pts[j].z:pts[j].v);
    if(((zi>z)!==(zj>z)) && (x < (xj-xi)*(z-zi)/(zj-zi)+xi)) inside=!inside;
  }
  return inside;
}
function cadParcelContains(p, x, z, day){
  if(p.contains) return p.contains(x,z);
  if(p.poly){
    // uv-space parcels invert through the DAY frame like the plat itself
    if(p.space==="uv"){ var g=cadWorldToGridAt(x, z, cadSkewAt(day)); return cadPointInPoly(p.poly, g.u, g.v); }
    return cadPointInPoly(p.poly, x, z);
  }
  return false;
}

/* =====================================================================
   THE API — the one interface every future admission consumes.
   ===================================================================== */
/* Point queries invert through cadSkewAt — the one canonical frame at every
   date (single frame 2026-07-14: the grid-swing and its 1846 Vioget offset are
   deleted, so there is no date-dependent skew to invert through). */
function cadBlockAt(x, z, day){
  var g = cadWorldToGridAt(x, z, cadSkewAt(day));
  for(var i=0;i<GROUND_PLAN.blocks.length;i++){ var b=GROUND_PLAN.blocks[i];
    if(day!=null && b.birth>day) continue;
    if(g.u>=b.uLo && g.u<=b.uHi && g.v>=b.vLo && g.v<=b.vHi){
      // s85: rotated Hundred Vara block — the uv bbox is a loose broad-phase;
      // confirm with a precise point-in-quad test (cardinal blocks have no
      // uvQuad and are exactly their bbox).
      if(b.uvQuad && !cadPointInPoly(b.uvQuad, g.u, g.v)) continue;
      return b;
    }
  }
  return null;
}
function cadLotAt(x, z, day){
  var b = cadBlockAt(x,z,day); if(!b) return null;
  var g = cadWorldToGridAt(x, z, cadSkewAt(day));
  // s85: rotated Hundred Vara lots — point-in-quad over the block's ≤6 lots
  // (the (iU,iV) arithmetic below assumes an axis-aligned uv rect).
  if(b.uvQuad){ for(var k=0;k<b.lots.length;k++){ if(cadPointInPoly(b.lots[k].uvQuad, g.u, g.v)) return b.lots[k]; } return null; }
  var a = Math.min(b.nU-1, Math.max(0, Math.floor((g.u-b.uLo)/b.extU*b.nU)));
  var c = Math.min(b.nV-1, Math.max(0, Math.floor((g.v-b.vLo)/b.extV*b.nV)));
  return b.lots[a*b.nV + c] || null;
}
function cadRowAt(x, z){ // the right-of-way (street id) the point sits inside, if any
  var best=null;
  if(typeof PLACEMENT_STREET_SEGS==="undefined") return null;
  for(var i=0;i<PLACEMENT_STREET_SEGS.length;i++){ var s=PLACEMENT_STREET_SEGS[i];
    var d=distToSegXZ(x,z,s.x0,s.z0,s.x1,s.z1);
    if(d<s.halfW && (!best || d<best.d)) best={ id:s.id, d:d, halfW:s.halfW };
  }
  return best;
}
function groundPlanBand(x,z){
  if(cadIntertidalContains(x,z)) return "intertidal";
  if(cadBeachContains(x,z)) return "beach";
  return null;
}
function groundPlanParcelContains(name, x, z){
  var p=GROUND_PARCELS_BY_NAME[name]; return p ? cadParcelContains(p,x,z) : false;
}
/* THE query — what is this ground at this date. */
function groundPlanAt(x, z, day){
  var out = { block:null, platLot:null, plot:null /* RESERVED for building plots (§1.3 3b) */,
              parcels:[], row:null, band:null };
  var b = cadBlockAt(x,z,day);
  if(b){ out.block = b.key; var lot = cadLotAt(x,z,day); out.platLot = lot ? lot.id : null; }
  for(var i=0;i<GROUND_PARCELS.length;i++){ var p=GROUND_PARCELS[i];
    if((day==null || p.birth<=day) && cadParcelContains(p,x,z,day)) out.parcels.push(p.name);
  }
  out.row = cadRowAt(x,z);
  out.band = groundPlanBand(x,z);
  return out;
}
/* Targeted accessors. */
function lotById(id){ return GROUND_PLAN.byId[id] || null; }
function blocksAt(day){ return GROUND_PLAN.blocks.filter(function(b){ return day==null || b.birth<=day; }); }
function parcelByName(name){ return GROUND_PARCELS_BY_NAME[name] || null; }

/* =====================================================================
   PIER DECK-EDGE / MOORING SURFACE (s84 — THE SPINE EXPANSION, road-master-spec
   SPINE MEMBERSHIP AMENDMENT). A pier is UNIQUELY double-sided: its deck edges
   (centerline +/- width/2) are BOTH the walk-path boundary AND the mooring /
   ship-exclusion line the anchorage/mooring laws (placement-spec P12/P13) will
   consume at the SHIPS admission. This is the data surface those consumers will
   read; NO ships code consumes it yet (design-and-document, per the s84 brief).
   The deck geometry is a PURE function of the pier spine + the queried day
   (the active construction/extension checkpoint), produced at query time in the
   one canonical frame — never a baked/stale frame (same discipline as
   lotWorldQuad). A pier reads as a parcel-like WATER-EXCLUSION band, not a plat
   lot. ===================================================================== */
function pierEdgesAt(idOrPier, day){
  var p = typeof idOrPier === "string" ? (typeof PIERS_RUNTIME_BY_ID !== "undefined" ? PIERS_RUNTIME_BY_ID[idOrPier] : null) : idOrPier;
  if(!p) return null;
  var active = pierActiveCheckpoint(p, day);
  var base = { id:p.id, anchorStreet:p.anchorStreet, width:p.widthM, active:false,
               centerline:[], leftEdge:[], rightEdge:[], deckQuad:[], innerEnd:null, outerEnd:null };
  if(!active) return base;                        // not yet built at `day` — no deck, no mooring band
  var i0 = active.extent[0], i1 = active.extent[1], hw = p.widthM/2;
  var pts = [];
  for(var i=i0;i<=i1;i++){ var w = gridToWorld(p.polyline[i].u, p.polyline[i].v); pts.push({ x:w.x, z:w.z }); }
  var cl=[], L=[], R=[];
  for(var k=0;k<pts.length;k++){
    var a = pts[Math.max(0,k-1)], b = pts[Math.min(pts.length-1,k+1)];
    var dx=b.x-a.x, dz=b.z-a.z, dl=Math.hypot(dx,dz)||1, nx=-dz/dl, nz=dx/dl; // left unit normal
    cl.push({ x:pts[k].x, z:pts[k].z });
    L.push({ x:pts[k].x+nx*hw, z:pts[k].z+nz*hw });
    R.push({ x:pts[k].x-nx*hw, z:pts[k].z-nz*hw });
  }
  var deckQuad = L.concat(R.slice().reverse());   // closed ring: left edge out, right edge back
  return { id:p.id, anchorStreet:p.anchorStreet, width:p.widthM, active:true,
           lengthFt:active.lengthFt, centerline:cl, leftEdge:L, rightEdge:R, deckQuad:deckQuad,
           innerEnd:cl[0], outerEnd:cl[cl.length-1] };
}
function pierDeckQuad(idOrPier, day){ var e = pierEdgesAt(idOrPier, day); return e && e.active ? e.deckQuad : null; }
function piersAt(day){ return (typeof PIERS_RUNTIME !== "undefined" ? PIERS_RUNTIME : []).filter(function(p){ return day==null || day>=p.birthDay; }); }
/* Point-in-deck test — which pier's deck (if any) a world point sits on at `day`
   (the P12/P13 water-exclusion query a ship-placement pass will run). */
function pierAt(x, z, day){
  var live = piersAt(day);
  for(var i=0;i<live.length;i++){ var q = pierDeckQuad(live[i], day); if(q && cadPointInPoly(q, x, z)) return live[i].id; }
  return null;
}
function pierStats(){
  return (typeof PIERS_RUNTIME !== "undefined" ? PIERS_RUNTIME : []).map(function(p){
    var e = pierEdgesAt(p, 1e9);                  // full built extent, for the census
    return { id:p.id, anchor:p.anchorStreet, width_m:p.widthM, birthDay:+p.birthDay.toFixed(0),
             fullLengthFt:(p.checkpoints.length?p.checkpoints[p.checkpoints.length-1].lengthFt:null),
             provenance:p.provenance, outerEnd:e.outerEnd };
  });
}
/* Cadastre census (for __P1850 + reporting). */
function groundPlanStats(){
  var B=GROUND_PLAN.blocks, L=GROUND_PLAN.lots;
  function era(d){ return d<0?"vioget-1839":(d<400?"ofarrell-1847":(d<1300?"eddy-1849":"later")); }
  var per={};
  B.forEach(function(b){ var e=era(b.birth); (per[e]=per[e]||{blocks:0,lots:0,waterLots:0,nonStandard:0});
    per[e].blocks++; per[e].lots+=b.lots.length; per[e].waterLots+=b.waterLots; if(!b.standard) per[e].nonStandard++; });
  var maxDev=0; L.forEach(function(l){ if(l.dev>maxDev) maxDev=l.dev; });
  // s85: PER-DISTRICT census (the two-standard cadastre — Fifty Vara vs Hundred
  // Vara). Reports each district's block/lot counts, standard-block count, and a
  // sampled lot dimension so the 41.91 m (50-vara) vs 83.82 m (100-vara) size
  // correction is visible numerically.
  var perDistrict={};
  B.forEach(function(b){ var d=b.district||"fifty-vara";
    var o=perDistrict[d]=perDistrict[d]||{ blocks:0, lots:0, standardBlocks:0, nonStandardBlocks:0, waterLots:0, sampleLotM:null };
    o.blocks++; o.lots+=b.lots.length; o[b.standard?"standardBlocks":"nonStandardBlocks"]++; o.waterLots+=b.waterLots;
    if(o.sampleLotM===null && b.standard && b.lots.length){ var sl=b.lots[0]; o.sampleLotM=[+sl.widthM.toFixed(3),+sl.depthM.toFixed(3)]; }
  });
  Object.keys(perDistrict).forEach(function(d){ perDistrict[d].lotStdM=+((d==="hundred-vara"?CAD_HV_LOT_STD_M:CAD_LOT_STD_M)).toFixed(3); });
  var rec=(typeof GROUND_PLAN_RECORD_STATS!=="undefined")?GROUND_PLAN_RECORD_STATS:null;
  return { blocks:B.length, lots:L.length, waterLots:L.filter(function(l){ return l.water; }).length,
           standardBlocks:B.filter(function(b){ return b.standard; }).length,
           nonStandardBlocks:B.filter(function(b){ return !b.standard; }).length,
           publicReserveBlocks:B.filter(function(b){ return b.publicReserve; }).length, // s82: plaza — platted common, zero lots
           recordLots:L.filter(function(l){ return l.source==="record"; }).length,
           parcels:GROUND_PARCELS.length, maxDevPct:+(maxDev*100).toFixed(3), perEra:per,
           perDistrict:perDistrict, record:rec };
}

/* =====================================================================
   AUDITS (the gate) — registered under placement.* (core-owned). Framing-
   independent: they walk the plan data / fixed probes, never the camera.
   ===================================================================== */
(function registerCadastreAudits(){
  function serializePlan(P){ // stable numeric fingerprint (no functions / world floats that could jitter)
    return P.blocks.map(function(b){
      return b.key+"@"+b.birth+"|"+b.nU+"x"+b.nV+"|"+b.lots.map(function(l){
        return l.iU+","+l.iV+":"+l.widthM.toFixed(4)+"x"+l.depthM.toFixed(4)+(l.corner?"c":"")+(l.water?"w":"");
      }).join(";");
    }).join("\n");
  }

  /* platClosure — every STANDARD block's 6 lots tile it exactly (area
     conservation, no gaps/overlaps). Non-standard blocks reported with counts,
     never failed (building-spawn-spec: edge/partial blocks are flagged).
     PUBLIC RESERVE blocks (s82: the plaza) are exempt from closure and must
     instead hold ZERO plat lots — the common was never subdivided. */
  registerAudit("placement", "platClosure", function(){
    var B=GROUND_PLAN.blocks, closureFail=[], nonStd=[], reserveBad=[], reserveN=0, i;
    for(i=0;i<B.length;i++){ var b=B[i];
      if(b.publicReserve){ reserveN++;
        if(b.lots.length!==0) reserveBad.push({ block:b.key, lots:b.lots.length });
        continue;
      }
      // partition integrity: lot count == nU*nV, unique ordinals, areas sum to block
      var area=b.extU*b.extV, lotArea=0, seen={}, dup=false;
      for(var k=0;k<b.lots.length;k++){ var l=b.lots[k]; lotArea+=l.widthM*l.depthM;
        var o=l.iU+","+l.iV; if(seen[o]) dup=true; seen[o]=1; }
      var closed = b.lots.length===b.nU*b.nV && !dup && Math.abs(lotArea-area) <= 0.01;
      if(b.standard){ if(!closed) closureFail.push({ block:b.key, dArea:+(lotArea-area).toFixed(4), lots:b.lots.length }); }
      else nonStd.push({ block:b.key, shape:b.nU+"x"+b.nV, lots:b.lots.length, water:b.waterLots });
    }
    // s85: per-district standard/closure census (the "standard block" definition
    // is now district-scoped — 6×41.91 m lots north of Market, 6×83.82 m lots
    // south of it; closure is checked identically for both).
    var perDistrict={};
    B.forEach(function(x){ var d=x.district||"fifty-vara";
      var o=perDistrict[d]=perDistrict[d]||{ standard:0, nonStandard:0, reserve:0 };
      if(x.publicReserve) o.reserve++; else if(x.standard) o.standard++; else o.nonStandard++; });
    return { pass: closureFail.length===0 && reserveBad.length===0, law:"platClosure",
             standardBlocks:B.filter(function(x){return x.standard && !x.publicReserve;}).length,
             perDistrict:perDistrict,
             publicReserveBlocks:reserveN, publicReserveWithLots:reserveBad,
             nonStandardFlagged:nonStd.length, closureFailures:closureFail.length,
             failList:closureFail.slice(0,20), nonStandardList:nonStd.slice(0,30) };
  });

  /* lotDeterminism — two derivations byte-identical AND zero seeded-dice
     consumed (the RNG counter must not move). ZERO dice: the plat is a pure
     function of the spine. */
  registerAudit("placement", "lotDeterminism", function(){
    var before = (typeof RNG_CALL_COUNT==="number") ? RNG_CALL_COUNT : null;
    var a = deriveGroundPlan(), b = deriveGroundPlan();
    var after = (typeof RNG_CALL_COUNT==="number") ? RNG_CALL_COUNT : null;
    var sa = serializePlan(a), sb = serializePlan(b), sLive = serializePlan(GROUND_PLAN);
    var identical = (sa===sb) && (sa===sLive);
    var rngConsumed = (before!=null && after!=null) ? (after-before) : null;
    return { pass: identical && (rngConsumed===0), law:"determinism",
             byteIdentical:identical, rngConsumed:rngConsumed,
             blocks:a.blocks.length, lots:a.lots.length };
  });

  /* platDates — no lot exists before its block's survey checkpoint; a block's
     birth is not earlier than ANY bounding street's earliest appearance; and
     blocksAt() is monotone. Per-era snapshot counts reported. */
  registerAudit("placement", "platDates", function(){
    var B=GROUND_PLAN.blocks, bad=[], i;
    for(i=0;i<B.length;i++){ var b=B[i];
      // every lot inherits the block birth exactly (no earlier lot)
      for(var k=0;k<b.lots.length;k++){ if(b.lots[k].birth < b.birth) bad.push({ block:b.key, lot:b.lots[k].id, reason:"lot-before-block" }); }
      // birth >= each bounding street's earliest checkpoint day
      var edges=[b.edges.west,b.edges.east,b.edges.north,b.edges.south];
      for(var e=0;e<edges.length;e++){ var st=STREETS_RUNTIME_BY_ID[edges[e]];
        var earliest = st && st.checkpoints.length ? st.checkpoints[0].day : -1e9;
        if(b.birth < earliest-0.5) bad.push({ block:b.key, reason:"before-street", edge:edges[e], birth:b.birth, streetDay:earliest });
      }
    }
    // monotonicity + era snapshot
    var d1846=blocksAt(-100).length, d1848=blocksAt(eventDateToSimDay("1848-04-01")).length, d1849=blocksAt(eventDateToSimDay("1849-09-01")).length;
    var mono = d1846<=d1848 && d1848<=d1849;
    return { pass: bad.length===0 && mono, law:"platDates", violations:bad.length,
             era:{ "vioget(1846)":d1846, "ofarrell(1848-04)":d1848, "eddy(1849-09)":d1849 },
             monotone:mono, list:bad.slice(0,20) };
  });

  /* platFrame (s81 Director ruling; SINGLE-FRAME 2026-07-14) — the cadastre's
     day-frame world geometry matches the streets' rendered frame NUMERICALLY:
     for EVERY block present, the lot-edge azimuths (both axes, from lotWorldQuad
     at that day) equal the bounding streets' rendered polyline azimuths within
     0.2°. Checked at 1846-07-01 AND 1849-09-01 — both now resolve to the ONE
     canonical frame (GRID_ROT_BASE, −9.0°): the grid-swing is deleted, so the
     dual-frame (Vioget-1846 / base-1848) branch is gone. The audit still
     asserts the day frame resolves to −9.0° at both dates. */
  registerAudit("placement", "platFrame", function(){
    function az(dx,dz){ var a = Math.atan2(dz,dx)*180/Math.PI; return ((a%180)+180)%180; }   // undirected line azimuth
    function angDiff(a,b){ var d = Math.abs(a-b)%180; return Math.min(d, 180-d); }
    function checkDay(day){
      var skew = cadSkewAt(day), bad = [], maxDev = 0, checked = 0, B = blocksAt(day);
      B.forEach(function(b){
        // publicReserve blocks (s82) hold zero lots — check the block rect
        // itself through the same day-frame API (lotWorldQuad takes any
        // {u:{lo,hi},v:{lo,hi}} rect / uvQuad), so the plaza block stays audited.
        var l0 = b.lots[0] || { uvQuad:b.uvQuad, u:{ lo:b.uLo, hi:b.uHi }, v:{ lo:b.vLo, hi:b.vHi } };
        var q = lotWorldQuad(l0, day).quad;
        var eS = az(q[1].x-q[0].x, q[1].z-q[0].z);   // SW->SE edge
        var eT = az(q[3].x-q[0].x, q[3].z-q[0].z);   // SW->NW edge
        if(b.district==="hundred-vara"){
          // s85: the rotated SoMa fabric is checked against the DISTRICT'S OWN
          // bearing (â along Market, b̂ into the district) — proving the lots
          // inherit the ~36°-rotated Hundred Vara frame, not the cardinal grid.
          if(!CAD_SOMA_WORLD_AZ) return;
          var da=angDiff(eS, CAD_SOMA_WORLD_AZ.a), db=angDiff(eT, CAD_SOMA_WORLD_AZ.b);
          checked+=2; if(da>maxDev)maxDev=da; if(db>maxDev)maxDev=db;
          if(da>0.2) bad.push({ block:b.key, edge:"along-market", axis:"soma-a", devDeg:+da.toFixed(3) });
          if(db>0.2) bad.push({ block:b.key, edge:"into-district", axis:"soma-b", devDeg:+db.toFixed(3) });
          return;
        }
        var pairs = [ ["north", eS],   // SW->SE edge vs the E-W street
                      ["west",  eT] ];  // SW->NW edge vs the N-S street
        pairs.forEach(function(p){
          var st = STREETS_RUNTIME_BY_ID[b.edges[p[0]]]; if(!st) return;
          var n = st.polyline.length;               // single frame: every street at GRID_ROT_BASE
          var p0 = gridToWorldAt(st.polyline[0].u, st.polyline[0].v, GRID_ROT_BASE);
          var p1 = gridToWorldAt(st.polyline[n-1].u, st.polyline[n-1].v, GRID_ROT_BASE);
          var d = angDiff(p[1], az(p1.x-p0.x, p1.z-p0.z)); checked++;
          if(d > maxDev) maxDev = d;
          if(d > 0.2) bad.push({ block:b.key, edge:p[0], street:st.id, devDeg:+d.toFixed(3) });
        });
      });
      return { skewDeg:+(skew*180/Math.PI).toFixed(3), blocks:B.length, edgesChecked:checked,
               maxDevDeg:+maxDev.toFixed(4), violations:bad.length, list:bad.slice(0,10) };
    }
    var d1846 = checkDay(eventDateToSimDay("1846-07-01"));
    var d1849 = checkDay(eventDateToSimDay("1849-09-01"));
    var framesRight = Math.abs(d1846.skewDeg - GRID_ROT_BASE_DEG) < 0.01 && Math.abs(d1849.skewDeg - GRID_ROT_BASE_DEG) < 0.01;
    return { pass: d1846.violations===0 && d1849.violations===0 && framesRight, law:"platFrame",
             singleFrame:framesRight, "base-1846":d1846, "base-1849":d1849 };
  });

  /* parcelIntegrity — (1) every polygon parcel is a closed ring (>=3 pts);
     (2) the FOLDED predicates agree with their reference math at 500 fixed
     sample points (proves inIntertidalBand/inBeachBand/inPublicSquare are now
     thin wrappers that did NOT change behavior). */
  registerAudit("placement", "parcelIntegrity", function(){
    // (1) closed rings
    var openRings=[];
    GROUND_PARCELS.forEach(function(p){ if(p.poly && p.poly.length<3) openRings.push(p.name); });
    // (2) fold agreement — reference math IS the parcel's defining formula
    function refIntertidal(x,z){ return x >= shorelineX(z) - 4 && terrainHeight(x,z) <= 0.5; }
    function refBeach(x,z){ var h=terrainHeight(x,z); return x >= shorelineX(z) - 30 && h > -0.6 && h <= 1.8; }
    function refPlaza(x,z){ // s82: block-derived — point inside the reserve block's uv bounds, DAY frame
      if(!CAD_PLAZA_BLOCK) return false;
      var g = cadWorldToGridAt(x, z, cadSkewAt(null)), b = CAD_PLAZA_BLOCK;
      return g.u>=b.uLo && g.u<=b.uHi && g.v>=b.vLo && g.v<=b.vHi;
    }
    // fixed 500-point lattice over the town + cove bbox (deterministic, no dice)
    var x0=PLAZA_CENTER.x-700, x1=PLAZA_CENTER.x+1400, z0=PLAZA_CENTER.z-700, z1=PLAZA_CENTER.z+900;
    var N=500, disagree=0, side=Math.ceil(Math.sqrt(N)); // ~23x23 grid
    for(var gi=0; gi<side; gi++) for(var gj=0; gj<side; gj++){
      var x=x0+(gi+0.5)/side*(x1-x0), z=z0+(gj+0.5)/side*(z1-z0);
      if(inIntertidalBand(x,z)!==refIntertidal(x,z)) disagree++;
      if(inBeachBand(x,z)!==refBeach(x,z)) disagree++;
      if(inPublicSquare(x,z)!==refPlaza(x,z)) disagree++;
    }
    // (3) INLAND-NOT-IN-WATER (s81 finding C — "cove includes the plaza"): the
    // plaza centroid and known town-interior points must NOT fall inside any
    // water-class parcel (the cove), and the plaza centroid MUST be inside its
    // OWN parcel (portsmouth-square is a distinct parcel, tinted distinctly).
    // Guards the inland-point-in-cove class of polygon defect.
    var pc = PLAZA_CENTER;
    var inlandProbes = [
      { n:"plaza-centroid", x:pc.x,     z:pc.z },
      { n:"plaza-west",     x:pc.x-80,  z:pc.z },
      { n:"plaza-north",    x:pc.x,     z:pc.z-120 },
      { n:"town-interior",  x:pc.x-40,  z:pc.z+90 },
      { n:"town-west",      x:pc.x-160, z:pc.z+40 }
    ];
    var waterParcels = GROUND_PARCELS.filter(function(p){ return p.cls==="water"; });
    var inlandInWater = [];
    inlandProbes.forEach(function(pt){
      waterParcels.forEach(function(wp){ if(cadParcelContains(wp, pt.x, pt.z)) inlandInWater.push(pt.n+" in "+wp.name); });
    });
    var plazaParcel = GROUND_PARCELS_BY_NAME["portsmouth-square"];
    var plazaSelf = !!(plazaParcel && cadParcelContains(plazaParcel, pc.x, pc.z));
    // (4) PLAZA BLOCK-DERIVATION (s82) — three numeric laws:
    //   (4a) public-square parcels contain ZERO plat lots (no lot's uv rect
    //        intersects the plaza poly's uv bounds);
    //   (4b) the plaza parcel polygon lies WITHIN its block's uv bounds
    //        (identity expected — derived from it) ⇒ no overlap with any ROW;
    //   (4c) plaza parcel edge-to-ROW-edge offset = 0.00 m at 3 stations per
    //        edge, all 4 edges, at 1846-07-01 AND 1849-09-01 — both now the ONE
    //        canonical frame (single frame 2026-07-14) — the same exactness
    //        standard the lots meet.
    var plazaOne = !!CAD_PLAZA_BLOCK;                       // exactly one reserve block claimed
    var lotsInPlaza = [];
    if(CAD_PLAZA_BLOCK){ var pb=CAD_PLAZA_BLOCK;
      GROUND_PLAN.lots.forEach(function(l){
        if(l.u.hi > pb.uLo+1e-9 && l.u.lo < pb.uHi-1e-9 && l.v.hi > pb.vLo+1e-9 && l.v.lo < pb.vHi-1e-9)
          lotsInPlaza.push(l.id);
      });
    }
    var polyInBlock = false, polyBoundsDev = null;
    if(CAD_PLAZA_BLOCK && plazaParcel && plazaParcel.poly){
      var dU=0, dV=0;
      plazaParcel.poly.forEach(function(p){
        dU = Math.max(dU, Math.max(pb.uLo-p.u, p.u-pb.uHi));
        dV = Math.max(dV, Math.max(pb.vLo-p.v, p.v-pb.vHi));
      });
      polyBoundsDev = +Math.max(dU, dV, 0).toFixed(6);      // m outside the block bounds (0 = inside)
      polyInBlock = dU <= 1e-6 && dV <= 1e-6;
    }
    var rowOffsets = { maxM:null, stations:0, list:[] };
    if(CAD_PLAZA_BLOCK){
      var days = [eventDateToSimDay("1846-07-01"), eventDateToSimDay("1849-09-01")], maxOff = 0;
      days.forEach(function(dd){
        var skew = cadSkewAt(dd);
        var edges = [
          { id:pb.edges.west,  pts:[[pb.uLo, pb.vLo+(pb.vHi-pb.vLo)*0.25],[pb.uLo,(pb.vLo+pb.vHi)/2],[pb.uLo, pb.vLo+(pb.vHi-pb.vLo)*0.75]] },
          { id:pb.edges.east,  pts:[[pb.uHi, pb.vLo+(pb.vHi-pb.vLo)*0.25],[pb.uHi,(pb.vLo+pb.vHi)/2],[pb.uHi, pb.vLo+(pb.vHi-pb.vLo)*0.75]] },
          { id:pb.edges.north, pts:[[pb.uLo+(pb.uHi-pb.uLo)*0.25, pb.vLo],[(pb.uLo+pb.uHi)/2, pb.vLo],[pb.uLo+(pb.uHi-pb.uLo)*0.75, pb.vLo]] },
          { id:pb.edges.south, pts:[[pb.uLo+(pb.uHi-pb.uLo)*0.25, pb.vHi],[(pb.uLo+pb.uHi)/2, pb.vHi],[pb.uLo+(pb.uHi-pb.uLo)*0.75, pb.vHi]] }
        ];
        edges.forEach(function(e){
          var st = STREETS_RUNTIME_BY_ID[e.id]; if(!st) return;
          var cl = [];   // single frame: every street at GRID_ROT_BASE
          for(var pi=0; pi<st.polyline.length; pi++) cl.push(gridToWorldAt(st.polyline[pi].u, st.polyline[pi].v, GRID_ROT_BASE));
          e.pts.forEach(function(uv){
            var w = gridToWorldAt(uv[0], uv[1], skew), dmin = Infinity;
            for(var si=0; si<cl.length-1; si++) dmin = Math.min(dmin, distToSegXZ(w.x, w.z, cl[si].x, cl[si].z, cl[si+1].x, cl[si+1].z));
            var off = Math.abs(dmin - st.widthM/2);
            rowOffsets.stations++;
            if(off > maxOff) maxOff = off;
            rowOffsets.list.push({ day:dd, edge:e.id, offM:+off.toFixed(4) });
          });
        });
      });
      rowOffsets.maxM = +maxOff.toFixed(4);
      rowOffsets.list = rowOffsets.list.slice(0,8);
    }
    var plazaRowExact = rowOffsets.maxM!=null && rowOffsets.maxM <= 0.005; // 0.00 m at report precision
    return { pass: openRings.length===0 && disagree===0 && inlandInWater.length===0 && plazaSelf
                   && plazaOne && lotsInPlaza.length===0 && polyInBlock && plazaRowExact,
             law:"parcelIntegrity",
             parcels:GROUND_PARCELS.length, openRings:openRings, sampledPoints:side*side*3, predicateDisagreements:disagree,
             inlandPointsInWater:inlandInWater, plazaCentroidInOwnParcel:plazaSelf,
             plazaBlockDerived:{ oneBlock:plazaOne, block:(CAD_PLAZA_BLOCK?CAD_PLAZA_BLOCK.key:null),
               lotsInsidePlaza:lotsInPlaza.length, lotList:lotsInPlaza.slice(0,8),
               polyWithinBlock:polyInBlock, polyBoundsDevM:polyBoundsDev,
               edgeToRowOffset:{ stations:rowOffsets.stations, maxM:rowOffsets.maxM, exact:plazaRowExact, sample:rowOffsets.list } } };
  });

  /* platRecords (s85 — CADASTRE CONSUMES THE RECORD). Every plat-lots-known.json
     record either (a) stamps a real plan lot (source:"record", carrying the
     recorded lot number + citation) or (b) is accounted-for in `unmatched` with
     a reason (block not in plan, or a publicReserve block that holds zero lots).
     No record silently vanishes. Record lots whose recorded dimensions diverge
     from their (district-correct) pattern dimensions by >2 m are flagged (v1
     overlays identity, not fractional geometry — a flag is expected, not a fail,
     until per-lot widths land; the audit PASSES on flags, FAILS only if a record
     is lost). If the registry is absent (sidecar not built), the audit is a
     documented no-op pass. */
  registerAudit("placement", "platRecords", function(){
    var R = (typeof GROUND_PLAN_RECORD_STATS!=="undefined") ? GROUND_PLAN_RECORD_STATS : null;
    if(!R || !R.registryLoaded) return { pass:true, law:"platRecords", registryLoaded:false, note:"plat-lots-known sidecar not loaded — pure pattern fabric" };
    var recordLots = GROUND_PLAN.lots.filter(function(l){ return l.source==="record"; });
    // integrity: every matched record produced exactly one record lot; every
    // record is either matched or explained in unmatched (nothing lost).
    var accounted = R.matched + R.unmatched.length;
    var ok = (accounted===R.records) && (recordLots.length===R.matched);
    return { pass: ok, law:"platRecords", registryLoaded:true,
             records:R.records, matched:R.matched, recordLotsInPlan:recordLots.length,
             unmatched:R.unmatched.length, unmatchedList:R.unmatched.slice(0,12),
             dimensionFlags:R.dimFlags.length, dimFlagList:R.dimFlags.slice(0,12),
             sample:recordLots.slice(0,6).map(function(l){ return { id:l.id, lotNumber:l.lotNumber, district:l.district, source:l.recordSource }; }) };
  });
})();

/* =====================================================================
   spine.pierAnchors (s84 — THE SPINE EXPANSION). The pier-membership integrity
   guard: every pier-class spine member must (1) name an anchor street that
   EXISTS in the spine; (2) be COLLINEAR with that anchor (its bayward bearing
   matches the anchor street's bearing, undirected, within 6deg); (3) have its
   INNER vertex sit ON the anchor street's centerline (continuity at the
   shoreline crossing — within the anchor's half-width + margin); (4) carry a
   single constant width; (5) have in-bounds, monotone construction/extension
   extents. Framing-independent (walks spine data / fixed world probes, no
   camera). A new `spine` audit namespace — late-attaches to __P1850.audits via
   registerAudit (core/00-boot). ===================================================================== */
registerAudit("spine", "pierAnchors", function(){
  function az(dx,dz){ var a = Math.atan2(dz,dx)*180/Math.PI; return ((a%180)+180)%180; } // undirected
  function angDiff(a,b){ var d = Math.abs(a-b)%180; return Math.min(d, 180-d); }
  var out = { pass:true, piers:0, violations:[], detail:[] };
  if(typeof PIERS_RUNTIME === "undefined" || !PIERS_RUNTIME.length) return { pass:true, piers:0, note:"no piers in spine" };
  PIERS_RUNTIME.forEach(function(p){
    out.piers++;
    var d = { id:p.id, anchor:p.anchorStreet, width_m:p.widthM, birthDay:+p.birthDay.toFixed(0) };
    var anchor = STREETS_RUNTIME_BY_ID[p.anchorStreet];
    if(!anchor){ out.violations.push({ id:p.id, reason:"anchor-street-missing", anchor:p.anchorStreet }); d.anchorExists=false; out.detail.push(d); return; }
    d.anchorExists = true;
    // world geometry (one canonical frame)
    var inner = gridToWorld(p.polyline[0].u, p.polyline[0].v);
    var outer = gridToWorld(p.polyline[p.polyline.length-1].u, p.polyline[p.polyline.length-1].v);
    var acl = anchor.polyline.map(function(q){ return gridToWorld(q.u, q.v); });
    // (3) continuity: inner vertex distance to the anchor centerline
    var dmin = Infinity;
    for(var i=0;i<acl.length-1;i++) dmin = Math.min(dmin, distToSegXZ(inner.x, inner.z, acl[i].x, acl[i].z, acl[i+1].x, acl[i+1].z));
    d.innerToAnchorLineM = +dmin.toFixed(2);
    // (2) bearing alignment (pier bayward vs anchor overall bearing, undirected)
    var pierAz = az(outer.x-inner.x, outer.z-inner.z);
    var anchAz = az(acl[acl.length-1].x-acl[0].x, acl[acl.length-1].z-acl[0].z);
    d.bearingDevDeg = +angDiff(pierAz, anchAz).toFixed(2);
    var contOk = dmin <= (anchor.widthM/2 + 12);
    var bearOk = d.bearingDevDeg <= 6;
    if(!contOk) out.violations.push({ id:p.id, reason:"inner-vertex-off-anchor-centerline", distM:d.innerToAnchorLineM, tolM:+(anchor.widthM/2+12).toFixed(1) });
    if(!bearOk) out.violations.push({ id:p.id, reason:"pier-not-collinear-with-anchor", devDeg:d.bearingDevDeg });
    // (4) constant width present
    if(!(p.widthM > 0)) out.violations.push({ id:p.id, reason:"no-width" });
    // (5) extents in-bounds + monotone
    var pn = p.polyline.length, lastI1 = -1;
    p.checkpoints.forEach(function(c){
      if(c.extent[0] < 0 || c.extent[1] >= pn || c.extent[1] <= c.extent[0]) out.violations.push({ id:p.id, reason:"bad-extent", extent:c.extent, verts:pn });
      if(c.extent[1] < lastI1) out.violations.push({ id:p.id, reason:"non-monotone-extent", extent:c.extent });
      lastI1 = c.extent[1];
    });
    // length proof: outer-extent world length vs the documented feet (record-only)
    d.builtLengthM = +Math.hypot(outer.x-inner.x, outer.z-inner.z).toFixed(1);
    d.builtLengthFt = +(d.builtLengthM/0.3048).toFixed(0);
    out.detail.push(d);
  });
  out.pass = out.violations.length === 0;
  return out;
});
