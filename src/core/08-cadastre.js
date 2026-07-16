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
   (83.820 m square, 3 cols along Market [300 vara] × 2 rows into the district
   [200 vara] — s88 correction, was mislabeled 2×3; adjudication §2d/§4) — the
   same 6-lot COUNT as a Fifty Vara block but each lot 4× the AREA, on a grid rotated
   to Mission Road's bearing (~36° off the cardinal grid), a genuinely different
   frame (research/plat-truth-stage1.md §0, primary-corroborated by the Eddy
   1849 plat and by corpus "100 vara lot No. N" single-sale-unit citations).

   DISTRICT DETECTION + GEOMETRY SOURCE (documented choice, s85; DERIVATION
   DECISION REAFFIRMED s88 with the corrected street data — research/
   soma-streets-adjudication.md): the fabric is tiled ANALYTICALLY at the
   documented 100-vara module, ANCHORED to the surveyed spine's SoMa frame
   (origin O = the Market/First-Street corner; axes â = along-Market, b̂ =
   into-district, both read straight off the spine so the ~36° bearing and
   origin are geodetic-locked, never re-anchored). WHY still analytic, not
   cell-by-cell street derivation like the cardinal north (s88 decision): (1)
   the SoMa streets are DIAGONAL (~36° off cardinal), so they fail the cardinal
   lattice's constant-u / constant-v classifier (CAD_NS/CAD_EW) — feeding them
   in would need a whole separate frame-aware cell derivation; (2) the corrected
   street set is still INCOMPLETE (Fremont/Anthony/Beale/Spear, the waterfront
   fringe streets, remain absent — adjudication §3/§5 flagged follow-ups), so
   cell derivation would be gappy at the bay edge. The analytic pass is the
   robust source AND it is already spine-anchored: after the s88 street fix the
   numbered streets sit exactly at s = 0, 251.46, 502.9… (every 3rd lot = 300
   vara) and the named streets at t = 0, 167.64, 335.28… (every 2nd lot = 200
   vara), so the tiling's block seams COINCIDE with the corrected streets —
   the lot fabric aligns to the drawn streets by construction (before s88 the
   streets were mis-spaced at one 83.8 m lot edge, so this alignment was the
   flagged defect this sprint resolves). The tiling naturally EXTENDS past the
   named-street coverage (the deep into-district band beyond Brannan where the
   long numbered streets — e.g. Second's 11 blocks — run but no named cross
   street is documented): that region is "analytic beyond street coverage",
   documented here, not street-derivable. Blocks are authored plat-dimension
   (property-line to property-line) without ROW inset in v1. Zero dice — a pure
   function of the spine, exactly like the Fifty Vara fabric. Edge blocks (a
   partial column/row where the envelope is not an even multiple of the 3×2
   module) are flagged non-standard, the same way the cardinal lattice flags its
   edge blocks. */
var CAD_HV_LOT_VARA   = 100;
var CAD_HV_LOT_STD_M  = CAD_HV_LOT_VARA * CAD_VARA_M;      // 83.820 m — the 100-vara reference lot
var CAD_HV_BLOCK_COLS = 3;                                 // along Market (300 vara = 3 lots, between numbered streets) — s88 correction (was 2; see adjudication)
var CAD_HV_BLOCK_ROWS = 2;                                 // into the district (200 vara = 2 lots, between named streets) — s88 correction (was 3)
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
   by block_ref (or, s86, an explicit resolved `cadKey`) → the cadastre's block;
   a record's (col,row) or lot-position hint maps it onto a pattern lot's (iU,iV).
   The record also carries an owners[] witness chain (Wheeler-1852 grant +
   Buckelew-1847 map, chronological) which is stamped onto the matched lot for the
   probe/who-is-where surface. PURE (data join, zero dice). Records that name a
   publicReserve block (the plaza common, zero lots), a still-UNRESOLVED
   descriptive block_ref (s86 Buckelew 1847 — no cadastre key derivable, honest
   gap; carries cadKey:null + `unresolved`), or a block/position not present in
   the plan are collected as `unmatched` with a reason rather than forced — no
   record silently vanishes. Duplicate lot numbers (documented survey reality,
   e.g. Buckelew's 8/38/69 + Wheeler's 695/709/753) are tallied separately, not
   as failures. */
function cadApplyRecord(blocks, byId){
  var REG = (typeof window!=="undefined" && window.PLAT_LOTS_KNOWN) ? window.PLAT_LOTS_KNOWN : null;
  GROUND_PLAN_RECORD_STATS = { registryLoaded:!!REG, records:0, matched:0, unmatched:[], dimFlags:[], unresolved:0, duplicates:[] };
  if(!REG || !REG.lots) return;
  var byBlock = {}; blocks.forEach(function(b){ byBlock[b.key]=b; });
  var lotNumSeen = {};                                     // lot_number -> [block_ref,…] for duplicate tally
  REG.lots.forEach(function(rec){
    if(rec.type==="named_parcel") return;                 // named parcels handled by GROUND_PARCELS
    GROUND_PLAN_RECORD_STATS.records++;
    (lotNumSeen[rec.lot_number] = lotNumSeen[rec.lot_number] || []).push(rec.block_ref);
    // s86: prefer an explicitly resolved cadastre key over a (possibly
    // descriptive) block_ref. A descriptive Buckelew ref that could NOT be
    // resolved carries cadKey:null + `unresolved` — surfaced honestly, not lost.
    var joinKey = (rec.cadKey != null) ? rec.cadKey : rec.block_ref;
    var b = byBlock[joinKey];
    if(!b){
      var descriptive = (rec.block_ref_spine_match === false) || (rec.unresolved != null);
      if(descriptive) GROUND_PLAN_RECORD_STATS.unresolved++;
      GROUND_PLAN_RECORD_STATS.unmatched.push({ lot:rec.lot_number, block:rec.block_ref,
        reason: descriptive ? "unresolved-descriptive-block" : "block-not-in-plan" });
      return;
    }
    if(b.publicReserve){ GROUND_PLAN_RECORD_STATS.unmatched.push({ lot:rec.lot_number, block:rec.block_ref, reason:"public-reserve-zero-lots" }); return; }
    // map the record onto a pattern lot: explicit (iU,iV) if given, else first free lot
    var lot=null;
    if(rec.iU!=null && rec.iV!=null) lot = b.lots.filter(function(l){ return l.iU===rec.iU && l.iV===rec.iV; })[0];
    if(!lot) lot = b.lots.filter(function(l){ return l.source!=="record"; })[0];
    if(!lot){ GROUND_PLAN_RECORD_STATS.unmatched.push({ lot:rec.lot_number, block:rec.block_ref, reason:"no-free-lot" }); return; }
    lot.source="record"; lot.lotNumber=rec.lot_number; lot.recordSource=rec.survey || (rec._source||"eddy-1849");
    lot.recordCitation = rec.note || null;
    lot.owners = rec.owners || null;                       // s86: witness chain (Wheeler grant + Buckelew map)
    GROUND_PLAN_RECORD_STATS.matched++;
    // recorded-dimension check (record-only; flags, never forces geometry)
    if(rec.dimensions && rec.dimensions.width_m!=null){
      var dExp = (b.district==="hundred-vara"?CAD_HV_LOT_STD_M:CAD_LOT_STD_M);
      var dW = Math.abs(rec.dimensions.width_m - lot.widthM), dD = Math.abs((rec.dimensions.depth_m||rec.dimensions.width_m) - lot.depthM);
      if(dW>2.0 || dD>2.0) GROUND_PLAN_RECORD_STATS.dimFlags.push({ lot:rec.lot_number, block:rec.block_ref,
        recW:+rec.dimensions.width_m.toFixed(2), patW:+lot.widthM.toFixed(2), dW:+dW.toFixed(2), dD:+dD.toFixed(2) });
    }
  });
  // duplicate lot numbers across records (documented survey reality, not a fault)
  Object.keys(lotNumSeen).forEach(function(n){ if(lotNumSeen[n].length>1)
    GROUND_PLAN_RECORD_STATS.duplicates.push({ lot:n, count:lotNumSeen[n].length, blocks:lotNumSeen[n] }); });
}
var GROUND_PLAN_RECORD_STATS = { registryLoaded:false, records:0, matched:0, unmatched:[], dimFlags:[], unresolved:0, duplicates:[] };

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

/* =====================================================================
   s87 — VENDORED POLYGON CLIPPING (foundation-reset §4b, THE vendored-solved-
   problems policy; FIRST CONSUMER). window.PolyBool (src/vendor/polybool.js,
   polybooljs@1.2.2, MIT) does the boolean intersection. A parcel carries a
   `clip:"land"|"water"|"none"` attribute; land parcels are intersected against
   the LAND RING (everything inland of the traced 1849 natural high-water line),
   water parcels against the WATER RING (the cove seaward of it). Applied ONCE
   here at derivation, so every consumer — tints, groundPlanAt containment,
   future placement law — reads the CLIPPED geometry (one truth). The user's
   finding: happy-valley-camp spilled over the beach into the water; after this
   it hugs the coast exactly. Pure geometry over the fixed shoreline; zero dice,
   zero clock.

   REFERENCE DATE / WITNESS: the 1849 natural high-water line — shorelineX(z),
   which reads the baked trace of data/shoreline-natural-1849.json (the reset's
   named cove witness). The sim's whole window (through 1849-12-31) renders
   against this one natural line, so it is the shoreline-by-date truth for the
   cove parcels. The line is the COVE'S shore: it governs the cove-facing
   parcels (happy-valley-camp, yerba-buena-cove). The inland/other-coast parcels
   (mission-cluster far south past Mission Bay; presidio on the Golden Gate)
   sit far WEST of it — the cove land ring is a NO-OP for them (they are never
   deleted, never trimmed); correctly clipping THEIR own coasts (Mission Bay,
   the Gate) needs a full-peninsula land polygon (a terrain-marched boundary) —
   a documented fast-follow, not this sprint. platted-region is deliberately
   NOT clipped: the surveyed district legitimately includes the beach-and-water
   lots east of the line (cadIsWaterLot), so a land-clip would wrongly amputate
   them. ===================================================================== */
var CAD_CLIP_ZN = -1200, CAD_CLIP_ZS = 4200, CAD_CLIP_ZSTEP = 8; // z-span generous enough to CONTAIN every land parcel (inland ⇒ no-op, never deleted)
var CAD_CLIP_XWEST = -6500;          // far west of the whole peninsula (land-mask backstop)
var CAD_CLIP_XBAYOUT = 1250;         // seaward extent of the water ring (matches the cove BAYOUT)
var CAD_LAND_RING = (function(){     // world ring: everything inland (west) of the shore
  var pts=[];
  for(var z=CAD_CLIP_ZN; z<=CAD_CLIP_ZS; z+=CAD_CLIP_ZSTEP) pts.push([shorelineX(z), z]);   // east edge = the shore, ascending z
  pts.push([CAD_CLIP_XWEST, CAD_CLIP_ZS]); pts.push([CAD_CLIP_XWEST, CAD_CLIP_ZN]);         // far-west backstop
  return pts;
})();
var CAD_WATER_RING = (function(){    // world ring: the water seaward (east) of the shore, out to the bay edge
  var pts=[];
  for(var z=CAD_CLIP_ZN; z<=CAD_CLIP_ZS; z+=CAD_CLIP_ZSTEP) pts.push([shorelineX(z), z]);            // west edge = the shore
  for(var z2=CAD_CLIP_ZS; z2>=CAD_CLIP_ZN; z2-=CAD_CLIP_ZSTEP) pts.push([shorelineX(z2)+CAD_CLIP_XBAYOUT, z2]); // bay edge
  return pts;
})();
function cadRingArea(r){ var a=0; for(var i=0,j=r.length-1;i<r.length;j=i++){ a += r[j].x*r[i].z - r[i].x*r[j].z; } return Math.abs(a)/2; }
/* parcel ring (world {x,z} or uv {u,v}) → PolyBool region [[x,z],…] (world). */
function cadRingToPB(ring, space, day){
  return ring.map(function(p){
    if(p.x!=null) return [p.x, p.z];
    var w = gridToWorldAt(p.u, p.v, cadSkewAt(day)); return [w.x, w.z]; // uv → world (single frame)
  });
}
/* Intersect a parcel polygon against a world clip ring with the vendored
   boolean op. Returns { rings:[[{x,z}…],…], areaBefore, areaAfter, clipped }.
   Multi-region results (a parcel split by the coast) are preserved as a rings
   array; the lib being absent is an honest passthrough (never a silent empty). */
function cadClipParcelRing(ring, space, clipRing, day){
  var PB = (typeof window!=="undefined" && window.PolyBool) ? window.PolyBool : null;
  var srcPB = cadRingToPB(ring, space, day);
  var beforeRing = srcPB.map(function(p){ return {x:p[0], z:p[1]}; });
  var areaBefore = cadRingArea(beforeRing);
  if(!PB) return { rings:[beforeRing], areaBefore:areaBefore, areaAfter:areaBefore, clipped:false };
  var res = PB.intersect({ regions:[srcPB], inverted:false }, { regions:[clipRing], inverted:false });
  var rings = res.regions.filter(function(r){ return r.length>=3; }).map(function(r){ return r.map(function(p){ return {x:p[0], z:p[1]}; }); });
  var areaAfter=0; rings.forEach(function(r){ areaAfter += cadRingArea(r); });
  return { rings:rings, areaBefore:areaBefore, areaAfter:areaAfter, clipped:true };
}

/* =====================================================================
   s87 — BAND POLYGONS (kill the raster exception). The intertidal (storeship
   mud) and beach bands are terrain-height ISOSURFACES, NOT fixed-width offsets
   — measured on the baked terrain: the intertidal covers the whole submerged
   flat east of the beach where terrainHeight<=0.5 (out to the cove bay curve);
   the beach is the thin waterline strip where -0.6<h<=1.8. A pure offset of the
   shoreline ring therefore cannot reproduce them, so the vendored lib's
   offset (had we picked clipper) would not have applied — the honest derivation
   traces the predicate's own boundary. Their AUTHORITATIVE membership stays the
   terrain predicate (cadIntertidalContains / cadBeachContains — UNCHANGED, so
   zero placement-behaviour change; the folded wrappers stay thin over them).
   s87 adds a real POLYGON RING for RENDERING: a shoreline-following ribbon whose
   inland/seaward edges ARE the predicate boundary, located by scan + bisection
   at the fixed noon truth. The workbench then draws the bands as triangulated
   tints with a crisp boundary exactly like every other parcel — the raster tint
   is deleted. bandFidelity (audit) proves the ribbon reproduces the predicate at
   the s82 500-point method; every residual disagreement is a sub-trace-step
   BOUNDARY point (terrain micro-relief the ribbon smooths), reported explicitly.
   Deterministic; no dice/clock. ===================================================================== */
var CAD_BAND_ZN = -1000, CAD_BAND_ZS = 1800, CAD_BAND_ZSTEP = 4, CAD_BAND_XSTEP = 3;
function cadBandBisect(pred, z, xF, xT){ for(var k=0;k<32;k++){ var m=(xF+xT)/2; if(pred(m,z)) xT=m; else xF=m; } return (xF+xT)/2; }
function cadBandRibbons(pred, xLoFn, xHiFn, seawardFn){
  var ribbons=[], cur=null;
  for(var z=CAD_BAND_ZN; z<=CAD_BAND_ZS+1e-9; z+=CAD_BAND_ZSTEP){
    var xLo=xLoFn(z), xHi=xHiFn(z), xIn=null, xOut=null, prevX=xLo;
    for(var x=xLo; x<=xHi+1e-9; x+=CAD_BAND_XSTEP){ var p=pred(x,z);
      if(p && xIn===null) xIn = (x===xLo? xLo : cadBandBisect(pred, z, prevX, x));
      if(p) xOut=x; prevX=x; }
    if(xIn!==null){
      var xSea;
      if(seawardFn) xSea = seawardFn(z);                                          // analytic seaward edge (intertidal → cove bay curve)
      else { var xN=Math.min(xOut+CAD_BAND_XSTEP, xHi); xSea = pred(xN,z) ? xN : cadBandBisect(pred, z, xN, xOut); }
      if(!cur){ cur={ inland:[], seaward:[] }; ribbons.push(cur); }
      cur.inland.push({x:xIn, z:z}); cur.seaward.push({x:xSea, z:z});
    } else cur=null;
  }
  return ribbons.filter(function(r){ return r.inland.length>=2; })
                .map(function(r){ return r.inland.concat(r.seaward.slice().reverse()); });
}
/* intertidal: inland edge traced (the h=0.5 crossing near shore); seaward edge
   the cove bay curve (analytic) so the mud flat nests cleanly inside the cove.
   The inland-scan window reaches +500 so the ribbon never breaks where the flat
   starts late (e.g. the wide Rincon beach) — a too-narrow window left z-gaps
   that read as false-negatives against the predicate. */
var CAD_BAND_INTERTIDAL_RINGS = cadBandRibbons(cadIntertidalContains,
  function(z){ return shorelineX(z)-10; }, function(z){ return shorelineX(z)+500; },
  function(z){ return shorelineX(z)+CAD_CLIP_XBAYOUT; });
/* beach: both edges terrain-gated (the waterline ribbon). */
var CAD_BAND_BEACH_RINGS = cadBandRibbons(cadBeachContains,
  function(z){ return shorelineX(z)-40; }, function(z){ return shorelineX(z)+450; }, null);

var GROUND_PARCELS = [
  { name:"portsmouth-square", cls:"plaza",  birth:CAD_DAY_ALWAYS, allow:["civic","promenade","fountain","well"], keepOutStructures:true,
    space:"uv", poly:CAD_PLAZA_POLY, clip:"none" /* inland uv reserve — no coast to clip */, blockDerived:(CAD_PLAZA_BLOCK?CAD_PLAZA_BLOCK.key:null) /* s82: the parcel IS its block */ },
  { name:"yerba-buena-cove",  cls:"water",  birth:CAD_DAY_ALWAYS, allow:["ship","storeship","wharf","mooring","boat"], space:"world", poly:CAD_COVE_POLY, clip:"water" /* s87: intersect the water ring */ },
  /* s87: the two bands stop being raster-only. Membership stays the terrain
     predicate (contains — UNCHANGED); `rings` is the render polygon (crisp
     triangulated tint, like every other parcel). clip:"none" — the ribbon IS
     already the shoreline-followed geometry. */
  { name:"storeship-mud-band",cls:"mud",    birth:CAD_DAY_ALWAYS, allow:["storeship","wharf","beached-boat","flotsam"], band:"intertidal", contains:cadIntertidalContains, clip:"none", rings:CAD_BAND_INTERTIDAL_RINGS },
  { name:"beach-band",        cls:"beach",  birth:CAD_DAY_ALWAYS, allow:["flotsam","beached-boat","boat"], band:"beach", contains:cadBeachContains, clip:"none", rings:CAD_BAND_BEACH_RINGS },
  { name:"platted-region",    cls:"survey", birth:(function(){ var m=Infinity; GROUND_PLAN.blocks.forEach(function(b){ m=Math.min(m,b.birth); }); return m; })(), allow:["*"], space:"uv", poly:CAD_PLAT_BOUNDS, clip:"none" /* survey district legitimately includes beach/water lots — no land-clip */ },
  { name:"happy-valley-camp", cls:"camp",   birth:eventDateToSimDay("1849-08-01"), allow:["tent","shanty","encampment"], space:"world", poly:CAD_HAPPY_VALLEY_POLY, clip:"land" /* s87: the user's finding — hug the coast */ },
  { name:"mission-cluster",   cls:"mission",birth:CAD_DAY_ALWAYS, allow:["mission","adobe","civic","garden"], space:"world", poly:cadCirclePoly(OUTPOSTS.mission.x, OUTPOSTS.mission.z, 230, 20), clip:"land" /* inland of the cove line ⇒ no-op; own coast awaits the peninsula land polygon */ },
  { name:"presidio",          cls:"presidio",birth:CAD_DAY_ALWAYS, allow:["military","civic","adobe"], space:"world", poly:cadCirclePoly(OUTPOSTS.presidio.x, OUTPOSTS.presidio.z, 260, 20), clip:"land" /* Golden-Gate coast; cove line is a no-op here — see the peninsula-land fast-follow */ }
];
var GROUND_PARCELS_BY_NAME = {}; GROUND_PARCELS.forEach(function(p){ GROUND_PARCELS_BY_NAME[p.name]=p; });

/* s87 — APPLY THE CLIP ONCE, at derivation. Every parcel with clip:"land"/
   "water" is intersected against the matching ring; the result becomes the
   parcel's canonical world geometry (`rings` = all pieces, `poly` = the
   largest piece for single-ring consumers, space→"world"). Runs here so
   tints / groundPlanAt containment / future placement all read one clipped
   truth. Census kept for parcelIntegrity + the report (area before/after). */
var CAD_PARCEL_CLIP_STATS = [];
(function cadApplyParcelClips(){
  GROUND_PARCELS.forEach(function(p){
    if(!p.clip || p.clip==="none" || !p.poly) return;
    var clipRing = p.clip==="water" ? CAD_WATER_RING : CAD_LAND_RING;
    var r = cadClipParcelRing(p.poly, p.space, clipRing, null);
    if(r.rings.length){
      p.rings = r.rings;
      p.poly  = r.rings.reduce(function(a,b){ return cadRingArea(a)>=cadRingArea(b)?a:b; }); // largest ring
      p.space = "world";
    }
    CAD_PARCEL_CLIP_STATS.push({ name:p.name, clip:p.clip, rings:r.rings.length,
      areaBefore:+r.areaBefore.toFixed(0), areaAfter:+r.areaAfter.toFixed(0),
      trimmedPct:+(100*(1-r.areaAfter/(r.areaBefore||1))).toFixed(2), libUsed:r.clipped });
  });
})();

function cadPointInRings(rings, x, z){ // even-odd across ALL world rings (multipolygon + holes)
  var inside=false;
  for(var k=0;k<rings.length;k++){ var pts=rings[k];
    for(var i=0,j=pts.length-1;i<pts.length;j=i++){
      var xi=pts[i].x, zi=pts[i].z, xj=pts[j].x, zj=pts[j].z;
      if(((zi>z)!==(zj>z)) && (x < (xj-xi)*(z-zi)/(zj-zi)+xi)) inside=!inside;
    }
  }
  return inside;
}
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
  if(p.contains) return p.contains(x,z);                 // bands: terrain predicate is authoritative (rings are render-only)
  if(p.rings) return cadPointInRings(p.rings, x, z);     // s87: clipped multi-ring world geometry
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
              parcels:[], row:null, band:null, zone:null /* s91: governing land-use zone */,
              reservation:null /* s91: landmark reservation footprint, if any */ };
  var b = cadBlockAt(x,z,day);
  if(b){ out.block = b.key; var lot = cadLotAt(x,z,day); out.platLot = lot ? lot.id : null; }
  for(var i=0;i<GROUND_PARCELS.length;i++){ var p=GROUND_PARCELS[i];
    if((day==null || p.birth<=day) && cadParcelContains(p,x,z,day)) out.parcels.push(p.name);
  }
  out.row = cadRowAt(x,z);
  out.band = groundPlanBand(x,z);
  var Z = cadZoneAt(x,z,day); out.zone = Z ? Z.id : null;      // s91: WHERE-per-class law
  var rv = reservationAt(x,z,day); out.reservation = rv ? rv.landmarkId : null;
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
   s91 — ZONE LAW (building-spawn-spec §1 ZONES stage; placement-spec P3/P13
   "zone logic given ONE home"). The era-keyed ZONE TABLE: every land-use zone
   the buildings admission will spawn into, each carrying allowedClasses[] +
   densityTier + an era interval + a spatial test. This is the LAW layer over
   the parcels: the named parcels (GROUND_PARCELS) are the GEOMETRY (render
   tints + folded predicates); the zone table is the WHERE-per-class placement
   grammar canPlace consults. Zones REUSE the parcel predicates where a parcel
   already draws the ground (plaza, cove, bands, camp, mission, presidio) and
   ADD the three the parcels never modeled: commercial-core (era-grown from the
   plaza + downtown blocks), residential-band (the rest of the platted fabric),
   and waterfront-working (the pier corridors + the working shore bands).

   PRECEDENCE = array order. cadZoneAt() returns the FIRST exclusive zone whose
   test contains the point (the GOVERNING zone) — so every point has exactly ONE
   governing zone and two zones can never render a contradictory exclusive claim
   (proven by placement.zoneLaw). Zero dice, pure in (x,z,day) — same
   determinism law as the plat. densityTier is carried for the buildings
   admission (party-wall permission / fill density) and reported; not yet
   enforced here. ===================================================================== */
/* Commercial-core reach GROWS OUTWARD by era checkpoint (building-spawn-spec
   §1: "plaza ring + main-street frontages, growing outward by era"). Radius in
   world metres from the plaza centre; a downtown (fifty-vara) block is
   commercial when its centroid sits within reach at the queried date. Tunables
   (fill:true): 1846 village = the plaza ring; 1847 O'Farrell reaches the near
   blocks; mid-1848 grows toward the water; the spring-1849 boom carries the
   core to the Montgomery waterfront. */
var CAD_COMM_R = [
  { day:CAD_DAY_ALWAYS,                        r:120 },   // pre-survey village: plaza ring (City Hotel / Custom House / Portsmouth House cluster)
  { day:ERA_MAP_SIMDAY["ofarrell-1847"],       r:230 },   // 396 — O'Farrell survey: the near downtown blocks
  { day:eventDateToSimDay("1848-07-01"),       r:340 },   // grows toward the cove along Clay/Washington
  { day:eventDateToSimDay("1849-04-01"),       r:470 }    // the boom: gambling row + the full core to the Montgomery waterfront
];
function cadCommercialRadiusAt(day){
  if(day==null) return CAD_COMM_R[CAD_COMM_R.length-1].r;   // null day ⇒ fully grown (most-restrictive footprint)
  var r=CAD_COMM_R[0].r;
  for(var i=0;i<CAD_COMM_R.length;i++) if(day>=CAD_COMM_R[i].day) r=CAD_COMM_R[i].r;
  return r;
}
/* A block is in the commercial core when it is a downtown (cardinal fifty-vara)
   block, not the plaza reserve, whose centroid is within the era's reach of the
   plaza. Centroid world position is memoized on the block (single canonical
   frame; does not enter the determinism fingerprint). */
function cadBlockCommercial(b, day){
  if(!b || b.publicReserve || b.district!=="fifty-vara") return false;
  if(b.cxWorld==null){ var w=gridToWorldAt((b.uLo+b.uHi)/2,(b.vLo+b.vHi)/2,GRID_ROT_BASE); b.cxWorld=w.x; b.czWorld=w.z; }
  return Math.hypot(b.cxWorld-PLAZA_CENTER.x, b.czWorld-PLAZA_CENTER.z) <= cadCommercialRadiusAt(day);
}
/* THE ZONE TABLE — precedence-ordered. Each: { id, allowedClasses, densityTier,
   birth, exclusive, note, contains(x,z,day) }. exclusive zones claim the ground;
   a point outside every zone is LOOSE GROUND (only the unaddressed / scatter /
   fauna classes place there — building classes need zoned ground). */
var CAD_ZONE_TABLE = [
  { id:"plaza", densityTier:"none", birth:CAD_DAY_ALWAYS, exclusive:true,
    note:"the Portsmouth Square common — civic/promenade only; the Custom House + School House are the documented civic exceptions ON it (reservations, not fill).",
    allowedClasses:["civic","promenade","fountain","well","monument","landmark-civic"],
    contains:function(x,z,day){ return groundPlanParcelContains("portsmouth-square",x,z); } },
  { id:"waterfront-working", densityTier:"working", birth:CAD_DAY_ALWAYS, exclusive:true,
    note:"the pier corridors + the working shore (storeship mud band + beach band) — wharves, warehouses, storeships, flotsam.",
    allowedClasses:["wharf","wharf-shed","warehouse","storeship","beached-boat","flotsam","boat","crate","commercial","landmark-commerce"],
    contains:function(x,z,day){ return (typeof pierAt==="function" && pierAt(x,z,day)!=null) || cadIntertidalContains(x,z) || cadBeachContains(x,z); } },
  { id:"cove-water", densityTier:"none", birth:CAD_DAY_ALWAYS, exclusive:true,
    note:"open Yerba Buena Cove seaward of the working shore — the anchorage: ships + moorings + storeships.",
    allowedClasses:["ship","storeship","mooring","boat","wharf"],
    contains:function(x,z,day){ return groundPlanParcelContains("yerba-buena-cove",x,z); } },
  { id:"commercial-core", densityTier:"dense", birth:CAD_DAY_ALWAYS, exclusive:true,
    note:"plaza ring + downtown frontages, era-grown outward to the waterfront by the boom. Commercial/civic + addressed building tiers; NO tents/shanties (the commercial front is not tent ground at any era).",
    allowedClasses:["commercial","civic","hotel","gambling-hall","store","warehouse","frame","kit-house","iron-house","brick","sign","landmark-civic","landmark-commerce"],
    contains:function(x,z,day){ return cadBlockCommercial(cadBlockAt(x,z,day), day); } },
  { id:"camp", densityTier:"loose", birth:eventDateToSimDay("1849-08-01"), exclusive:true,
    note:"Happy Valley / SoMa tent settlement (born 1849) — tents, shanties, encampment structures, yard outbuildings.",
    allowedClasses:["tent","shanty","encampment","outbuilding"],
    contains:function(x,z,day){ return groundPlanParcelContains("happy-valley-camp",x,z); } },
  { id:"mission-cluster", densityTier:"sparse", birth:CAD_DAY_ALWAYS, exclusive:true,
    note:"Mission Dolores ground — mission/adobe/civic/garden + the odd frame or wayfarer's tent.",
    allowedClasses:["mission","adobe","civic","garden","tent","frame"],
    contains:function(x,z,day){ return groundPlanParcelContains("mission-cluster",x,z); } },
  { id:"presidio", densityTier:"sparse", birth:CAD_DAY_ALWAYS, exclusive:true,
    note:"the Presidio military reserve — military/civic/adobe.",
    allowedClasses:["military","civic","adobe"],
    contains:function(x,z,day){ return groundPlanParcelContains("presidio",x,z); } },
  { id:"residential-band", densityTier:"medium", birth:CAD_DAY_ALWAYS, exclusive:true,
    note:"the rest of the platted fabric (fifty- + hundred-vara blocks) beyond the commercial core — dwellings, frame/adobe/kit houses, plus early tents/shanties before the core reaches them.",
    allowedClasses:["frame","kit-house","adobe","brick","dwelling","outbuilding","store","civic","tent","shanty"],
    contains:function(x,z,day){ var b=cadBlockAt(x,z,day); return !!b && !b.publicReserve && !cadBlockCommercial(b,day); } }
];
var CAD_ZONE_BY_ID = {}; CAD_ZONE_TABLE.forEach(function(z){ CAD_ZONE_BY_ID[z.id]=z; });
/* Classes any zone governs (SELECTIVE — placement-spec doctrine: law is a
   floor, not blanket bureaucracy). A class not named by any zone AND not in the
   loose set is zone-agnostic (the LAW_TABLES row alone governs it). */
var CAD_LOOSE_ALLOWED = { tent:1, shanty:1, encampment:1, outbuilding:1, scatter:1, prop:1, tree:1, flotsam:1, fauna:1, fence:1, sign:1, boat:1, "beached-boat":1 };
var CAD_ZONE_RELEVANT = (function(){ var s={}; CAD_ZONE_TABLE.forEach(function(z){ z.allowedClasses.forEach(function(c){ s[c]=1; }); }); Object.keys(CAD_LOOSE_ALLOWED).forEach(function(c){ s[c]=1; }); return s; })();
/* THE governing zone at a point/date — first exclusive zone (by precedence)
   whose test contains it AND that is born by `day`. null ⇒ loose ground. */
function cadZoneAt(x, z, day){
  for(var i=0;i<CAD_ZONE_TABLE.length;i++){ var Z=CAD_ZONE_TABLE[i];
    if(day!=null && Z.birth!=null && Z.birth>day) continue;
    if(Z.contains(x,z,day)) return Z;
  }
  return null;
}
/* THE zone gate (building-spawn-spec §1: "the zone gate adds WHERE per class").
   {ok, reason, zone}. Zone-agnostic classes pass untouched; loose ground admits
   only the unaddressed/scatter/fauna set; otherwise the governing zone's
   allowedClasses decide. */
function cadZoneGate(cls, x, z, day){
  if(!CAD_ZONE_RELEVANT[cls]) return { ok:true, reason:"zone-agnostic", zone:null };
  var Z = cadZoneAt(x,z,day);
  if(!Z) return CAD_LOOSE_ALLOWED[cls] ? { ok:true, reason:"loose-ground", zone:null }
                                       : { ok:false, reason:"loose-ground-forbids:"+cls, zone:null };
  for(var i=0;i<Z.allowedClasses.length;i++) if(Z.allowedClasses[i]===cls || Z.allowedClasses[i]==="*") return { ok:true, reason:"zone:"+Z.id, zone:Z.id };
  return { ok:false, reason:"zone:"+Z.id+"-forbids:"+cls, zone:Z.id };
}
/* Public accessors. */
function landUseZoneAt(x,z,day){ var Z=cadZoneAt(x,z,day==null?SIM_DAY_FALLBACK():day); return Z?Z.id:null; }
function zoneAllows(cls,x,z,day){ return cadZoneGate(cls,x,z,day).ok; }
function SIM_DAY_FALLBACK(){ return (typeof simDay==="number") ? simDay : null; }

/* =====================================================================
   s91 — LANDMARK RESERVATIONS (building-spawn-spec §1: "the record wins" —
   reserved ground spawns THE landmark, never fill). window.LANDMARK_RESERVATIONS
   (baked from data/landmark-reservations.json) is joined to the live plan: each
   reservation resolves to a world footprint on a documented block+frontage (or
   ON the plaza common for the civic exceptions), gated by its built/burned dates.
   A reservation whose block is absent at its built date is surfaced as
   `unresolved` (never forced); the honest unanchorable list lives in the sidecar
   _meta. PURE (data join over the fixed plat, zero dice). ===================== */
function cadFrontageEdgeUV(b, frontage){
  // returns { p0:{u,v}, p1:{u,v}, inU, inV } — the edge's two block-corner uv
  // points (p0 = smaller coordinate) and the inward unit (into the block).
  switch(frontage){
    case "west":  return { p0:{u:b.uLo,v:b.vLo}, p1:{u:b.uLo,v:b.vHi}, inU:1,  inV:0 };
    case "east":  return { p0:{u:b.uHi,v:b.vLo}, p1:{u:b.uHi,v:b.vHi}, inU:-1, inV:0 };
    case "north": return { p0:{u:b.uLo,v:b.vLo}, p1:{u:b.uHi,v:b.vLo}, inU:0,  inV:1 };
    case "south": return { p0:{u:b.uLo,v:b.vHi}, p1:{u:b.uHi,v:b.vHi}, inU:0,  inV:-1 };
  }
  return null;
}
/* Resolve a reservation to { uvRect, quad(world), cx, cz } at `day`, or null if
   its block is absent / not yet born. uvRect is axis-aligned in (u,v) for the
   same-block overlap audit; quad is day-frame world for render/probe. */
function resolveReservationFootprint(res, day){
  var a=res.anchor, blk;
  if(a.kind==="plaza-exception"){
    blk = CAD_PLAZA_BLOCK; if(!blk) return null;
    if(day!=null && blk.birth>day) return null;
    var wM=a.widthM||24, dM=a.depthM||16, uLo,uHi,vLo,vHi;
    // corner of the plaza block: N=small v, S=large v, W=small u, E=large u
    var west=(a.corner==="NW"||a.corner==="SW"), north=(a.corner==="NW"||a.corner==="NE");
    uLo = west ? blk.uLo : blk.uHi-wM; uHi = west ? blk.uLo+wM : blk.uHi;
    vLo = north? blk.vLo : blk.vHi-dM; vHi = north? blk.vLo+dM : blk.vHi;
    return cadUVRectToFootprint(uLo,uHi,vLo,vHi,day,blk.key);
  }
  // block-frontage
  var byBlock = cadReservationBlockIndex(); blk = byBlock[a.block];
  if(!blk) return null;
  if(day!=null && blk.birth>day) return null;
  var e = cadFrontageEdgeUV(blk, a.frontage); if(!e) return null;
  var f0=a.frontFrac0!=null?a.frontFrac0:0, f1=a.frontFrac1!=null?a.frontFrac1:1, dM=a.depthM||20;
  // sub-interval along the edge
  var au0=e.p0.u+(e.p1.u-e.p0.u)*f0, av0=e.p0.v+(e.p1.v-e.p0.v)*f0;
  var au1=e.p0.u+(e.p1.u-e.p0.u)*f1, av1=e.p0.v+(e.p1.v-e.p0.v)*f1;
  var uLo=Math.min(au0,au1), uHi=Math.max(au0,au1), vLo=Math.min(av0,av1), vHi=Math.max(av0,av1);
  if(e.inU!==0){ if(e.inU>0) uHi=uLo+dM; else uLo=uHi-dM; }   // frontage is a vertical (u) edge → depth runs in u
  else         { if(e.inV>0) vHi=vLo+dM; else vLo=vHi-dM; }   // horizontal (v) edge → depth runs in v
  return cadUVRectToFootprint(uLo,uHi,vLo,vHi,day,blk.key);
}
function cadUVRectToFootprint(uLo,uHi,vLo,vHi,day,blockKey){
  var ang=cadSkewAt(day);
  var sw=gridToWorldAt(uLo,vLo,ang), se=gridToWorldAt(uHi,vLo,ang), ne=gridToWorldAt(uHi,vHi,ang), nw=gridToWorldAt(uLo,vHi,ang);
  return { uvRect:{ uLo:uLo,uHi:uHi,vLo:vLo,vHi:vHi }, block:blockKey,
           quad:[{x:sw.x,z:sw.z},{x:se.x,z:se.z},{x:ne.x,z:ne.z},{x:nw.x,z:nw.z}],
           cx:(sw.x+ne.x)/2, cz:(sw.z+ne.z)/2 };
}
var _cadResBlockIndex=null;
function cadReservationBlockIndex(){
  if(_cadResBlockIndex) return _cadResBlockIndex;
  _cadResBlockIndex={}; GROUND_PLAN.blocks.forEach(function(b){ _cadResBlockIndex[b.key]=b; });
  return _cadResBlockIndex;
}
var GROUND_RESERVATIONS = [];
var GROUND_RESERVATION_STATS = { registryLoaded:false, reservations:0, anchored:0, unresolved:[], unanchorableDocumented:0, plazaExceptions:0, overlaps:[] };
function cadApplyReservations(){
  var REG=(typeof window!=="undefined" && window.LANDMARK_RESERVATIONS) ? window.LANDMARK_RESERVATIONS : null;
  GROUND_RESERVATIONS=[]; GROUND_RESERVATION_STATS={ registryLoaded:!!REG, reservations:0, anchored:0, unresolved:[], unanchorableDocumented:0, plazaExceptions:0, overlaps:[] };
  if(!REG || !REG.reservations) return;
  GROUND_RESERVATION_STATS.unanchorableDocumented = (REG._meta && REG._meta.unanchorable ? REG._meta.unanchorable.length : 0);
  REG.reservations.forEach(function(res){
    GROUND_RESERVATION_STATS.reservations++;
    var built = res.dates && res.dates.built ? eventDateToSimDay(res.dates.built) : CAD_DAY_ALWAYS;
    var burned = res.dates && res.dates.burned ? eventDateToSimDay(res.dates.burned) : null;
    // resolve at the built date (the fabric it anchors to must exist then)
    var fp = resolveReservationFootprint(res, built);
    var rec = { landmarkId:res.landmarkId, name:res.name, dossier:res.dossier||null,
                anchor:res.anchor, kind:res.anchor.kind, block:res.anchor.block||(res.anchor.kind==="plaza-exception"?(CAD_PLAZA_BLOCK?CAD_PLAZA_BLOCK.key:null):null),
                built:built, burned:burned, confidence:res.confidence||null, source:res.source||null,
                note:(res.dates&&res.dates.note)||null, resolved:!!fp, footprint:fp };
    if(fp){ GROUND_RESERVATION_STATS.anchored++; if(res.anchor.kind==="plaza-exception") GROUND_RESERVATION_STATS.plazaExceptions++; }
    else   GROUND_RESERVATION_STATS.unresolved.push({ landmarkId:res.landmarkId, block:res.anchor.block||res.anchor.kind, reason:"block-absent-at-built-date" });
    GROUND_RESERVATIONS.push(rec);
  });
  // same-block ground conflict census (documented succession — burned+rebuilt at
  // the same spot — is NOT a conflict; only live-overlapping DISTINCT landmarks are)
  for(var i=0;i<GROUND_RESERVATIONS.length;i++) for(var j=i+1;j<GROUND_RESERVATIONS.length;j++){
    var A=GROUND_RESERVATIONS[i], B=GROUND_RESERVATIONS[j];
    if(!A.resolved||!B.resolved) continue;
    if(A.block!==B.block) continue;                        // different blocks can't share ground
    var ra=A.footprint.uvRect, rb=B.footprint.uvRect;
    var overlap = ra.uLo<rb.uHi-1e-6 && rb.uLo<ra.uHi-1e-6 && ra.vLo<rb.vHi-1e-6 && rb.vLo<ra.vHi-1e-6;
    if(overlap) GROUND_RESERVATION_STATS.overlaps.push({ a:A.landmarkId, b:B.landmarkId, block:A.block });
  }
}
cadApplyReservations();
/* Point query — which reservation footprint (if any) a point sits on at `day`
   (built ≤ day, and before burned when a burn date is in-window). */
function reservationAt(x,z,day){
  for(var i=0;i<GROUND_RESERVATIONS.length;i++){ var r=GROUND_RESERVATIONS[i];
    if(!r.resolved) continue;
    if(day!=null){ if(r.built>day) continue; if(r.burned!=null && day>=r.burned) continue; }
    if(cadPointInPoly(r.footprint.quad, x, z)) return r;
  }
  return null;
}
function reservationsAt(day){
  return GROUND_RESERVATIONS.filter(function(r){ return r.resolved && (day==null || (r.built<=day && (r.burned==null || day<r.burned))); });
}
function reservationById(id){ for(var i=0;i<GROUND_RESERVATIONS.length;i++) if(GROUND_RESERVATIONS[i].landmarkId===id) return GROUND_RESERVATIONS[i]; return null; }

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

    /* ===== s87 CLIP + BAND CHECKS ===== */
    /* (5a) NO LAND PARCEL CONTAINS WATER (the Happy Valley finding): sample
       clearly-SEAWARD points (east of the shore by real margins) across the
       cove z-span; NO clip:"land" parcel may contain any of them. Before the
       clip, happy-valley-camp contained hundreds of these; after, zero. */
    var landParcels = GROUND_PARCELS.filter(function(p){ return p.clip==="land"; });
    var seawardTested=0, seawardInLand=[];
    for(var sz=CAD_BAND_ZN; sz<=CAD_BAND_ZS; sz+=40){
      var shx=shorelineX(sz);
      [20,60,150,400,900].forEach(function(mg){
        var px=shx+mg, pz=sz; seawardTested++;
        landParcels.forEach(function(lp){ if(cadParcelContains(lp, px, pz) && seawardInLand.length<20) seawardInLand.push({ parcel:lp.name, x:+px.toFixed(0), z:+pz.toFixed(0), margin:mg }); });
      });
    }
    /* (5b) BAND FIDELITY — the render RINGS reproduce the terrain PREDICATE
       (the folded wrapper is the perfect reference). s82 500-point method +
       the whole cove z-span; a disagreement is "boundary" if the predicate
       flips within one trace step (2*CAD_BAND_XSTEP) of the point — i.e. a
       sub-resolution edge artifact, not a structural miss. PASS requires ZERO
       NON-boundary disagreements; the raw count is reported. */
    function bandFlipsNear(pred,x,z){ var d=2*CAD_BAND_XSTEP, b=pred(x,z);
      return pred(x-d,z)!==b || pred(x+d,z)!==b || pred(x,z-d)!==b || pred(x,z+d)!==b; }
    /* The two bands are terrain isosurfaces; the render ring is a shoreline-
       followed RIBBON. Split disagreements by kind at each sample point:
         falseNeg  (pred true, ring false) = the ribbon MISSES real band area —
                    a genuine polygon defect; away from the boundary it must be 0.
         falsePos  (pred false, ring true) = the ribbon OVER-covers — for the
                    intertidal this is an interior MUDFLAT ISLET (terrain locally
                    rises above the 0.5 tide datum inside the flat); the ribbon
                    smooths it, which is fine because the terrain PREDICATE stays
                    authoritative for membership. Reported, not failed.
       Boundary points (predicate flips within one trace step) are sub-resolution
       and excluded from the pass test. */
    var bandStats=[];
    [["storeship-mud-band",cadIntertidalContains],["beach-band",cadBeachContains]].forEach(function(bd){
      var bp=GROUND_PARCELS_BY_NAME[bd[0]], pred=bd[1]; if(!bp||!bp.rings) { bandStats.push({ band:bd[0], hasRings:false }); return; }
      var raw=0, fnNonB=0, fpNonB=0, tested=0;
      for(var gi2=0; gi2<side; gi2++) for(var gj2=0; gj2<side; gj2++){
        var bx=x0+(gi2+0.5)/side*(x1-x0), bz=z0+(gj2+0.5)/side*(z1-z0); tested++;
        var pr=pred(bx,bz), rg=cadPointInRings(bp.rings,bx,bz);
        if(pr!==rg){ raw++; if(!bandFlipsNear(pred,bx,bz)){ if(pr&&!rg) fnNonB++; else fpNonB++; } }
      }
      bandStats.push({ band:bd[0], hasRings:true, ringCount:bp.rings.length, sampled:tested, disagreements:raw,
        falseNeg_nonBoundary:fnNonB, interiorIslets_falsePos_nonBoundary:fpNonB });
    });
    var bandFalseNeg = bandStats.reduce(function(s,b){ return s+(b.falseNeg_nonBoundary||0); }, 0);
    var bandAllHaveRings = bandStats.every(function(b){ return b.hasRings; });
    /* (5c) CLIPPED + BAND parcels are CLOSED RINGS (>=3 distinct vertices each). */
    var badRings=[];
    GROUND_PARCELS.forEach(function(p){ if(!p.rings) return;
      p.rings.forEach(function(r,ri){ if(r.length<3) badRings.push(p.name+"#"+ri+" ("+r.length+"pts)"); }); });
    /* (5d) the clip actually FIRED via the vendored lib (not a silent passthrough). */
    var clipLibUsed = CAD_PARCEL_CLIP_STATS.length>0 && CAD_PARCEL_CLIP_STATS.every(function(c){ return c.libUsed; });

    return { pass: openRings.length===0 && disagree===0 && inlandInWater.length===0 && plazaSelf
                   && plazaOne && lotsInPlaza.length===0 && polyInBlock && plazaRowExact
                   && seawardInLand.length===0 && bandFalseNeg===0 && bandAllHaveRings && badRings.length===0 && clipLibUsed,
             law:"parcelIntegrity",
             clip:{ landParcelsContainNoWater:seawardInLand.length===0, seawardPointsTested:seawardTested, seawardInLandParcel:seawardInLand,
                    parcelClips:CAD_PARCEL_CLIP_STATS, clipLibUsed:clipLibUsed },
             bands:{ falseNegNonBoundary:bandFalseNeg, allHaveRings:bandAllHaveRings, detail:bandStats },
             clippedClosedRings:{ pass:badRings.length===0, bad:badRings },
             parcels:GROUND_PARCELS.length, openRings:openRings, sampledPoints:side*side*3, predicateDisagreements:disagree,
             inlandPointsInWater:inlandInWater, plazaCentroidInOwnParcel:plazaSelf,
             plazaBlockDerived:{ oneBlock:plazaOne, block:(CAD_PLAZA_BLOCK?CAD_PLAZA_BLOCK.key:null),
               lotsInsidePlaza:lotsInPlaza.length, lotList:lotsInPlaza.slice(0,8),
               polyWithinBlock:polyInBlock, polyBoundsDevM:polyBoundsDev,
               edgeToRowOffset:{ stations:rowOffsets.stations, maxM:rowOffsets.maxM, exact:plazaRowExact, sample:rowOffsets.list } } };
  });

  /* platRecords (s85 — CADASTRE CONSUMES THE RECORD; s86 — REGISTRY INTEGRATION).
     Every plat-lots-known.json record either (a) stamps a real plan lot
     (source:"record", carrying the recorded lot number + citation + owners[]
     witness chain) or (b) is accounted-for in `unmatched` with a reason:
       • public-reserve-zero-lots  — names the plaza common (zero lots by design)
       • unresolved-descriptive-block — an s86 Buckelew 1847 descriptive block_ref
         that could not be resolved to a cadastre key (cadKey:null; honest gap —
         the sheet's orientation is not pixel-derivable and no cadastre block
         beyond Eddy Block B/Block C carries official lot numbers to anchor against)
       • block-not-in-plan — a genuine spine-keyed miss (none expected)
     No record silently vanishes: matched + unmatched must equal records. Recorded
     dimensions diverging >2 m from the (district-correct) pattern are flagged (v1
     overlays identity, not fractional geometry — a flag is expected, not a fail).
     DUPLICATE lot numbers (Buckelew read 8/38/69 at two cells; Wheeler documents
     695/709/753 on the official map) are surfaced as documented survey reality,
     NOT failures. The audit PASSES on flags/unresolved/duplicates, FAILS only if a
     record is lost. Registry absent ⇒ documented no-op pass. */
  registerAudit("placement", "platRecords", function(){
    var R = (typeof GROUND_PLAN_RECORD_STATS!=="undefined") ? GROUND_PLAN_RECORD_STATS : null;
    if(!R || !R.registryLoaded) return { pass:true, law:"platRecords", registryLoaded:false, note:"plat-lots-known sidecar not loaded — pure pattern fabric" };
    var recordLots = GROUND_PLAN.lots.filter(function(l){ return l.source==="record"; });
    // integrity: every matched record produced exactly one record lot; every
    // record is either matched or explained in unmatched (nothing lost).
    var accounted = R.matched + R.unmatched.length;
    var ok = (accounted===R.records) && (recordLots.length===R.matched);
    // unmatched reason census
    var reasons={}; R.unmatched.forEach(function(u){ reasons[u.reason]=(reasons[u.reason]||0)+1; });
    var withOwners = recordLots.filter(function(l){ return l.owners && l.owners.length; }).length;
    return { pass: ok, law:"platRecords", registryLoaded:true,
             records:R.records, matched:R.matched, recordLotsInPlan:recordLots.length,
             recordLotsWithOwnerChain:withOwners,
             unmatched:R.unmatched.length, unmatchedByReason:reasons,
             unresolvedDescriptive:R.unresolved, unmatchedList:R.unmatched.slice(0,12),
             duplicateLotNumbers:R.duplicates.length, duplicateList:R.duplicates,
             dimensionFlags:R.dimFlags.length, dimFlagList:R.dimFlags.slice(0,12),
             sample:recordLots.slice(0,6).map(function(l){ return { id:l.id, lotNumber:l.lotNumber, district:l.district, source:l.recordSource,
               owners:(l.owners?l.owners.map(function(o){return o.dateOrInterval+" "+o.name;}):null) }; }) };
  });

  /* zoneLaw (s91 — ZONE LAW EXPANSION). Proves the era-keyed zone table is a
     complete, non-contradictory placement grammar:
       (1) STRUCTURE — every zone is closed + classed: non-empty allowedClasses,
           a contains() test, a densityTier.
       (2) COVERAGE — over a fixed town+cove lattice, every point that is on a
           platted block OR inside a named parcel has a GOVERNING zone (no zoned
           ground falls through unclassed). Reported: the per-zone histogram.
       (3) NO CONTRADICTORY EXCLUSIVE CLAIMS — at each sample the governing zone
           is unique by construction (first exclusive match); the audit confirms
           it equals the first containing zone at every point and reports how many
           points are claimed by >1 zone (precedence-resolved overlaps, e.g. a
           bayfront block edge in both waterfront-working and a downtown block).
       (4) THE GATE FIRES — synthetic canPlace probes at self-located points:
           a commercial building in the camp zone REJECTS; a tent in the boom-era
           commercial core REJECTS; commercial in the core ACCEPTS; a tent in camp
           ACCEPTS; a storeship on the mud band ACCEPTS; commercial on open cove
           REJECTS. Every probe expectation must hold. Deterministic; no dice. */
  registerAudit("placement", "zoneLaw", function(){
    var day = eventDateToSimDay("1849-09-01");           // boom era: commercial core at full reach
    // (1) structure
    var structBad=[];
    CAD_ZONE_TABLE.forEach(function(Z){
      if(!Z.allowedClasses || !Z.allowedClasses.length) structBad.push(Z.id+":no-classes");
      if(typeof Z.contains!=="function") structBad.push(Z.id+":no-test");
      if(!Z.densityTier) structBad.push(Z.id+":no-density");
    });
    // (2)+(3) coverage + overlap over a fixed lattice
    var pc=PLAZA_CENTER, x0=pc.x-700, x1=pc.x+1400, z0=pc.z-700, z1=pc.z+1100, side=48;
    var hist={}, uncovered=[], multiZone=0, governedMismatch=0, checked=0;
    for(var gi=0; gi<side; gi++) for(var gj=0; gj<side; gj++){
      var x=x0+(gi+0.5)/side*(x1-x0), z=z0+(gj+0.5)/side*(z1-z0);
      // "should be zoned" = on a platted block or inside any named parcel (excluding the survey envelope, which is a bbox not a claim)
      var onBlock = cadBlockAt(x,z,day)!=null;
      var inParcel=false; for(var pi=0;pi<GROUND_PARCELS.length;pi++){ var p=GROUND_PARCELS[pi]; if(p.cls==="survey") continue; if((p.birth<=day)&&cadParcelContains(p,x,z,day)){ inParcel=true; break; } }
      var shouldZone = onBlock || inParcel;
      // governing zone + all containing zones (for the overlap/contradiction check)
      var gov=null, containing=[];
      for(var zi=0; zi<CAD_ZONE_TABLE.length; zi++){ var Z=CAD_ZONE_TABLE[zi]; if(Z.birth!=null&&Z.birth>day) continue;
        if(Z.contains(x,z,day)){ containing.push(Z.id); if(!gov) gov=Z.id; } }
      if(containing.length>1) multiZone++;
      if(gov && gov!==containing[0]) governedMismatch++;   // must be identical by construction
      checked++;
      if(shouldZone){ if(!gov){ if(uncovered.length<20) uncovered.push({ x:+x.toFixed(0), z:+z.toFixed(0), onBlock:onBlock, inParcel:inParcel }); }
                      else hist[gov]=(hist[gov]||0)+1; }
      else if(gov) hist[gov]=(hist[gov]||0)+1;             // zoned beyond the platted region is fine (bands/camp/etc.)
    }
    // (4) gate probes — self-locate representative points on the lattice
    function findPoint(pred){ for(var gi=0; gi<side; gi++) for(var gj=0; gj<side; gj++){ var x=x0+(gi+0.5)/side*(x1-x0), z=z0+(gj+0.5)/side*(z1-z0); if(pred(x,z)) return {x:x,z:z}; } return null; }
    var pCamp = findPoint(function(x,z){ return landUseZoneAt(x,z,eventDateToSimDay("1849-09-01"))==="camp"; });
    var pCore = findPoint(function(x,z){ return landUseZoneAt(x,z,day)==="commercial-core"; });
    var pMud  = findPoint(function(x,z){ return landUseZoneAt(x,z,day)==="waterfront-working" && cadIntertidalContains(x,z); });
    var pCove = findPoint(function(x,z){ return landUseZoneAt(x,z,day)==="cove-water"; });
    var probes=[], probeFail=0;
    var bday=eventDateToSimDay("1849-09-01");
    /* REJECTION probes go through the full canPlace() (the real placement path,
       the brief's explicit ask: "canPlace zone-gate fires ... a commercial
       building in the camp zone = rejected"). The zone gate runs FIRST, so a
       zone-illegal class rejects with a zone reason regardless of slope/terrain. */
    function probeReject(name, cls, pt){
      if(!pt){ probes.push({ probe:name, located:false }); probeFail++; return; }
      var g=canPlace(cls, { x:pt.x, z:pt.z }, { day:bday });
      var ok = (g.ok===false) && /^zone:/.test(g.reason);   // rejected BY THE ZONE GATE, not another law
      if(!ok) probeFail++;
      probes.push({ probe:name, path:"canPlace", located:true, cls:cls, zone:landUseZoneAt(pt.x,pt.z,bday), gotOk:g.ok, reason:g.reason, pass:ok });
    }
    /* ACCEPTANCE probes test the ZONE GATE decision directly (cadZoneGate),
       isolating zone law from the positional laws (slope/terrain/overlap) that
       other audits already prove — a camp/mud point may legitimately be sloped
       or wet, which is not a zoning fact. */
    function probeAdmit(name, cls, pt){
      if(!pt){ probes.push({ probe:name, located:false }); probeFail++; return; }
      var g=cadZoneGate(cls, pt.x, pt.z, bday);
      var ok=(g.ok===true); if(!ok) probeFail++;
      probes.push({ probe:name, path:"cadZoneGate", located:true, cls:cls, zone:g.zone, gotOk:g.ok, reason:g.reason, pass:ok });
    }
    probeReject("commercial-in-camp",        "commercial", pCamp);
    probeReject("tent-in-commercial-core",   "tent",       pCore);
    probeReject("commercial-on-open-cove",   "commercial", pCove);
    probeAdmit ("commercial-in-core",        "commercial", pCore);
    probeAdmit ("tent-in-camp",              "tent",       pCamp);
    probeAdmit ("storeship-on-mud",          "storeship",  pMud);

    var pass = structBad.length===0 && uncovered.length===0 && governedMismatch===0 && probeFail===0;
    return { pass:pass, law:"zoneLaw", zones:CAD_ZONE_TABLE.length,
             structureViolations:structBad,
             coverage:{ sampled:checked, uncoveredZonedGround:uncovered.length, uncoveredList:uncovered, histogram:hist },
             overlap:{ multiZonePoints:multiZone, governingUniqueMismatches:governedMismatch },
             gate:{ failures:probeFail, probes:probes },
             table:CAD_ZONE_TABLE.map(function(Z){ return { id:Z.id, density:Z.densityTier, birth:(Z.birth<=CAD_DAY_ALWAYS?"always":Z.birth), classes:Z.allowedClasses.length }; }),
             commercialReach:CAD_COMM_R.map(function(s){ return { day:(s.day<=CAD_DAY_ALWAYS?"always":s.day), radiusM:s.r }; }) };
  });

  /* reservations (s91 — LANDMARK RESERVATIONS). Proves the record got its
     ground honestly:
       (1) every anchored reservation RESOLVES — its block exists at the built
           date and the footprint materialized (unresolved ones are surfaced,
           never forced; the documented-unanchorable list lives in the sidecar).
       (2) NO TWO reservations claim the same ground (same-block uv-rect overlap
           = 0) — documented burned→rebuild succession is same-id, not a conflict.
       (3) the Custom House sits ON the plaza block (the publicReserve civic
           exception, encoded explicitly as a plaza-exception anchor).
       (4) accounting closes: anchored + unresolved = reservations; the sidecar's
           documented-unanchorable count is reported.
     Registry absent ⇒ documented no-op pass. Deterministic; no dice. */
  registerAudit("placement", "reservations", function(){
    var S=GROUND_RESERVATION_STATS;
    if(!S.registryLoaded) return { pass:true, law:"reservations", registryLoaded:false, note:"landmark-reservations sidecar not loaded" };
    var accounted = (S.anchored + S.unresolved.length) === S.reservations;
    var noOverlap = S.overlaps.length===0;
    // Custom House ON the plaza block, resolved, plaza-exception
    var ch = reservationById("custom-house");
    var customOnPlaza = !!(ch && ch.resolved && ch.kind==="plaza-exception" && CAD_PLAZA_BLOCK && ch.block===CAD_PLAZA_BLOCK.key);
    // every plaza-exception reservation actually lands inside the plaza block uv bounds
    var plazaExcOk=true, plazaExcList=[];
    GROUND_RESERVATIONS.forEach(function(r){ if(r.kind!=="plaza-exception"||!r.resolved) return;
      var q=r.footprint.uvRect, pb=CAD_PLAZA_BLOCK;
      var inside = pb && q.uLo>=pb.uLo-1e-6 && q.uHi<=pb.uHi+1e-6 && q.vLo>=pb.vLo-1e-6 && q.vHi<=pb.vHi+1e-6;
      plazaExcList.push({ id:r.landmarkId, insidePlazaBlock:!!inside }); if(!inside) plazaExcOk=false;
    });
    var pass = accounted && noOverlap && customOnPlaza && plazaExcOk && S.unresolved.length===0;
    return { pass:pass, law:"reservations", registryLoaded:true,
             reservations:S.reservations, anchored:S.anchored, unresolved:S.unresolved.length, unresolvedList:S.unresolved,
             accountingCloses:accounted, unanchorableDocumented:S.unanchorableDocumented,
             sameGroundOverlaps:S.overlaps.length, overlapList:S.overlaps,
             customHouseOnPlazaBlock:customOnPlaza, plazaExceptions:S.plazaExceptions, plazaExceptionsInsideBlock:plazaExcOk, plazaExceptionList:plazaExcList,
             list:GROUND_RESERVATIONS.map(function(r){ return { id:r.landmarkId, name:r.name, kind:r.kind, block:r.block,
               built:(r.built<=CAD_DAY_ALWAYS?"pre-sim":r.built), burned:r.burned, confidence:r.confidence, resolved:r.resolved,
               cx:r.footprint?+r.footprint.cx.toFixed(0):null, cz:r.footprint?+r.footprint.cz.toFixed(0):null }; }) };
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

/* =====================================================================
   s97 PIER ADMISSION — the spine.pier* audit family (pier-system-spec §4 +
   SPRINT-s97 brief). Five framing-independent guards over the pier spine and
   its render/route surfaces, companions to spine.pierAnchors (s84). Every
   check is a pure function of the pier data + the ONE canonical frame
   (GRID_ROT_BASE, -9.0deg) — no camera, no wall-clock, no RNG — so the whole
   family is rewind-exact by construction. Registered at top level like
   pierAnchors; runAll() picks them up from the live __P1850_AUDITS registry.
   ===================================================================== */
(function(){
  function az(dx,dz){ var a=Math.atan2(dz,dx)*180/Math.PI; return ((a%180)+180)%180; } // undirected 0..180
  function angDiff(a,b){ var d=Math.abs(a-b)%180; return Math.min(d,180-d); }
  function pierWorld(p,i){ var q=p.polyline[i]; return gridToWorld(q.u,q.v); }
  function anchorOf(p){ return (typeof STREETS_RUNTIME_BY_ID!=="undefined") ? STREETS_RUNTIME_BY_ID[p.anchorStreet] : null; }
  function livePiers(){ return (typeof PIERS_RUNTIME!=="undefined") ? PIERS_RUNTIME : []; }

  /* spine.pierJunction — the TIGHT integration (pier-system-spec §1). Every pier's
     LANDWARD vertex sits ON its anchor street's centreline (continuous collinear
     spine: perpendicular gap <= 1 m AND the foot projects onto the anchor's own
     span, a real shared shoreline node) and the pier is collinear with the anchor
     (bearing dev <= 3 deg). junctionType is reported: 'terminus' (foot == the
     anchor's seaward endpoint, ~0 m — Central/Market) vs 'bulkhead' (foot is a
     documented bulkhead inset on the anchor; the platted water-lot line continues
     seaward over unbuilt in-window tideflat — the gap-to-platted-endpoint is
     RECORDED, not a fault). No-double-paint at the waterline is upheld structurally
     (streets wet-lot-skip over water; piers paint the plank exception) and proven
     independently by ground-paint.oneOwner. */
  registerAudit("spine","pierJunction", function(){
    var out={ pass:true, piers:0, violations:[], detail:[] };
    var piers=livePiers();
    if(!piers.length) return { pass:true, piers:0, note:"no piers in spine" };
    var GAP_TOL=1.0, BEAR_TOL=3.0;
    piers.forEach(function(p){
      out.piers++;
      var d={ id:p.id, anchor:p.anchorStreet };
      var anchor=anchorOf(p);
      if(!anchor){ out.violations.push({id:p.id,reason:"anchor-missing"}); out.detail.push(d); return; }
      var foot=pierWorld(p,0), bay=pierWorld(p,p.polyline.length-1);
      var acl=anchor.polyline.map(function(q){ return gridToWorld(q.u,q.v); });
      var dmin=Infinity, onSpan=false;
      for(var i=0;i<acl.length-1;i++){
        var a=acl[i],b=acl[i+1],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;
        var t=l2>0?((foot.x-a.x)*dx+(foot.z-a.z)*dz)/l2:0, tc=Math.max(0,Math.min(1,t));
        var qx=a.x+dx*tc, qz=a.z+dz*tc, dd=Math.hypot(foot.x-qx,foot.z-qz);
        if(dd<dmin){ dmin=dd; onSpan=(t>=-0.001 && t<=1.001); }
      }
      d.footToAnchorCentrelineM=+dmin.toFixed(3);
      d.onAnchorSpan=onSpan;
      var pierAz=az(bay.x-foot.x,bay.z-foot.z), anchAz=az(acl[acl.length-1].x-acl[0].x, acl[acl.length-1].z-acl[0].z);
      d.bearingDevDeg=+angDiff(pierAz,anchAz).toFixed(3);
      var e0=acl[0], e1=acl[acl.length-1];
      var gEnd=Math.min(Math.hypot(foot.x-e0.x,foot.z-e0.z), Math.hypot(foot.x-e1.x,foot.z-e1.z));
      d.gapToPlattedTerminusM=+gEnd.toFixed(1);
      d.junctionType = gEnd<=GAP_TOL ? "terminus" : "bulkhead";
      if(dmin>GAP_TOL) out.violations.push({id:p.id,reason:"foot-off-anchor-centreline",gapM:d.footToAnchorCentrelineM,tolM:GAP_TOL});
      if(d.bearingDevDeg>BEAR_TOL) out.violations.push({id:p.id,reason:"pier-not-collinear",devDeg:d.bearingDevDeg,tolDeg:BEAR_TOL});
      if(!onSpan) out.violations.push({id:p.id,reason:"foot-off-anchor-span"});
      out.detail.push(d);
    });
    out.pass=out.violations.length===0;
    return out;
  });

  /* spine.pierBuildoutMonotonic — the build-out lifecycle (pier-system-spec §2).
     (A) STATIC: each pier's checkpoints have strictly increasing dates and
     non-decreasing extent + lengthFt; birth <= first checkpoint (a reaching
     phase is allowed, never a negative gap). (B) RUNTIME at simDay: the ACTIVE
     extent equals pierActiveCheckpoint, and the rendered deck (pierEdgesAt)
     agrees with it — so the deck the paint layer draws follows the corrected
     checkpoint dates exactly (Central Wharf: reaching -> 300 ft @ 1849-08-31 ->
     800 ft @ fall-1849, the s97 date fix). */
  registerAudit("spine","pierBuildoutMonotonic", function(){
    var out={ pass:true, piers:0, violations:[], detail:[] };
    var piers=livePiers();
    if(!piers.length) return { pass:true, piers:0, note:"no piers in spine" };
    piers.forEach(function(p){
      out.piers++;
      var d={ id:p.id, birthDay:+p.birthDay.toFixed(0), checkpoints:p.checkpoints.length };
      var lastDay=-Infinity,lastExt=-1,lastLen=-1;
      p.checkpoints.forEach(function(c){
        // dates NON-DECREASING (equal dates are legitimate: Pacific St Wharf
        // carries an as-built + a planned extent on the SAME Mayor's-Message
        // date — a same-day plan bump, valid as long as the extent still grows).
        if(c.day<lastDay) out.violations.push({id:p.id,reason:"decreasing-date",day:c.day});
        if(c.extent[1]<lastExt) out.violations.push({id:p.id,reason:"decreasing-extent",extent:c.extent});
        if(c.lengthFt!=null && c.lengthFt<lastLen) out.violations.push({id:p.id,reason:"decreasing-length",lengthFt:c.lengthFt});
        lastDay=c.day; lastExt=c.extent[1]; if(c.lengthFt!=null) lastLen=c.lengthFt;
      });
      if(p.checkpoints.length && p.birthDay>p.checkpoints[0].day+0.5) out.violations.push({id:p.id,reason:"birth-after-first-checkpoint",birth:+p.birthDay.toFixed(0),first:+p.checkpoints[0].day.toFixed(0)});
      var active=pierActiveCheckpoint(p, simDay), e=pierEdgesAt(p, simDay);
      d.activeLengthFt = active?active.lengthFt:null;
      if(!active){ if(e.active) out.violations.push({id:p.id,reason:"deck-active-but-no-checkpoint"}); d.rendered="none/reaching"; }
      else {
        if(!e.active) out.violations.push({id:p.id,reason:"checkpoint-active-but-no-deck"});
        else if(e.lengthFt!==active.lengthFt) out.violations.push({id:p.id,reason:"deck-extent-mismatch",deck:e.lengthFt,active:active.lengthFt});
        d.rendered=active.lengthFt+"ft";
      }
      out.detail.push(d);
    });
    out.pass=out.violations.length===0;
    return out;
  });

  /* spine.pierDeckWidth — the constant-width law for piers (road-master-spec
     CONSTANT-WIDTH AMENDMENT / §9b). The canonical deck geometry (pierEdgesAt)
     must place each edge exactly width/2 from the centreline at EVERY station,
     for the full built extent — one constant width per member, no taper. */
  registerAudit("spine","pierDeckWidth", function(){
    var out={ pass:true, piers:0, violations:[], detail:[] };
    var piers=livePiers();
    if(!piers.length) return { pass:true, piers:0, note:"no piers in spine" };
    var TOL=0.05;
    piers.forEach(function(p){
      out.piers++;
      var e=pierEdgesAt(p, 1e9), d={ id:p.id, width_m:+p.widthM.toFixed(2) };
      if(!e.active || !e.centerline.length){ d.note="no-extent"; out.detail.push(d); return; }
      var hw=p.widthM/2, maxDev=0;
      for(var k=0;k<e.centerline.length;k++){
        var cl=e.centerline[k], L=e.leftEdge[k], R=e.rightEdge[k];
        maxDev=Math.max(maxDev, Math.abs(Math.hypot(L.x-cl.x,L.z-cl.z)-hw), Math.abs(Math.hypot(R.x-cl.x,R.z-cl.z)-hw));
      }
      d.halfWidth_m=+hw.toFixed(3); d.maxEdgeDev_m=+maxDev.toFixed(4); d.stations=e.centerline.length;
      if(maxDev>TOL) out.violations.push({id:p.id,reason:"deck-width-not-constant",maxDevM:d.maxEdgeDev_m,tolM:TOL});
      out.detail.push(d);
    });
    out.pass=out.violations.length===0;
    return out;
  });

  /* spine.pierWalkContinuity — the routing corridor flows street -> junction ->
     pier deck (pier-system-spec §3). In the shared STREET_GRAPH: every pier has
     a foot node and an end node; the foot edges to at least one NON-pier (street)
     node — the shared shoreline junction — and to the deck end; and both are
     reachable from the town core (plaza) by BFS. A regression that drops the
     pier wiring, or strands a wharf, turns this red. junctionGap is reported
     (short for the Montgomery-footed wharves; larger for the Sansome/Front
     bulkhead wharves the sparse core-street graph has no adjacent node for). */
  registerAudit("spine","pierWalkContinuity", function(){
    var out={ pass:true, piers:0, violations:[], detail:[] };
    var piers=livePiers();
    if(!piers.length) return { pass:true, piers:0, note:"no piers in spine" };
    if(typeof STREET_GRAPH==="undefined" || !STREET_GRAPH.nodes) return { pass:false, reason:"no street graph" };
    var G=STREET_GRAPH;
    function reachableFrom(startKey){
      var start=G.idx[startKey]; if(start==null) return {};
      var seen={}, q=[start]; seen[start]=true;
      while(q.length){ var u=q.shift(); G.edges[u].forEach(function(ed){ if(!seen[ed.to]){ seen[ed.to]=true; q.push(ed.to); } }); }
      return seen;
    }
    var reach=reachableFrom("plaza");
    piers.forEach(function(p){
      out.piers++;
      var fi=G.idx["pier_"+p.id+"_foot"], ei=G.idx["pier_"+p.id+"_end"], d={ id:p.id };
      if(fi==null||ei==null){ out.violations.push({id:p.id,reason:"pier-nodes-missing"}); out.detail.push(d); return; }
      var junctEdge=G.edges[fi].filter(function(ed){ return G.nodes[ed.to].key.indexOf("pier_")!==0; });
      if(!junctEdge.length) out.violations.push({id:p.id,reason:"foot-has-no-street-junction"});
      else d.junctionGapM=+Math.min.apply(null,junctEdge.map(function(ed){return ed.d;})).toFixed(1);
      if(!G.edges[fi].some(function(ed){ return ed.to===ei; })) out.violations.push({id:p.id,reason:"no-deck-edge"});
      d.footReachable=!!reach[fi]; d.endReachable=!!reach[ei];
      if(!reach[fi]||!reach[ei]) out.violations.push({id:p.id,reason:"pier-unreachable-from-core",foot:!!reach[fi],end:!!reach[ei]});
      out.detail.push(d);
    });
    out.pass=out.violations.length===0;
    return out;
  });

  /* spine.pierEdgesFrame — the pierEdges data surface the ships admission will
     consume (pier-system-spec §3). (1) DETERMINISM: two identical queries return
     byte-identical geometry (no RNG / stale-frame contamination -> rewind-exact).
     (2) CANONICAL FRAME: every centreline vertex round-trips through worldToGrid
     back to the pier's own (u,v) within 1 cm — proving the ONE -9.0deg frame, not
     a baked/other frame. (3) DOUBLE-SIDED + SYMMETRIC: left != right and both lie
     width/2 from the centreline (|dL-dR| ~ 0), so the mooring/ship-exclusion band
     is symmetric about the deck spine. Queried at full built extent (day 1e9). */
  registerAudit("spine","pierEdgesFrame", function(){
    var out={ pass:true, piers:0, violations:[], detail:[] };
    var piers=livePiers();
    if(!piers.length) return { pass:true, piers:0, note:"no piers in spine" };
    var DAY=1e9, FRAME_TOL=0.01, SYM_TOL=0.02;
    piers.forEach(function(p){
      out.piers++;
      var e1=pierEdgesAt(p, DAY), e2=pierEdgesAt(p, DAY), d={ id:p.id };
      if(!e1.active){ d.note="no-extent"; out.detail.push(d); return; }
      var n=e1.centerline.length, det=(e2.centerline.length===n);
      for(var k=0;k<n && det;k++){
        if(e1.centerline[k].x!==e2.centerline[k].x || e1.centerline[k].z!==e2.centerline[k].z ||
           e1.leftEdge[k].x!==e2.leftEdge[k].x || e1.rightEdge[k].x!==e2.rightEdge[k].x) det=false;
      }
      if(!det) out.violations.push({id:p.id,reason:"non-deterministic-edges"});
      var i0=pierActiveCheckpoint(p,DAY).extent[0], maxFrame=0;
      for(var k2=0;k2<n;k2++){
        var uv=p.polyline[i0+k2], g=worldToGrid(e1.centerline[k2].x, e1.centerline[k2].z);
        maxFrame=Math.max(maxFrame, Math.abs(g.u-uv.u), Math.abs(g.v-uv.v));
      }
      d.maxFrameRoundTrip_m=+maxFrame.toFixed(4);
      if(maxFrame>FRAME_TOL) out.violations.push({id:p.id,reason:"edges-not-in-canonical-frame",maxM:d.maxFrameRoundTrip_m});
      var hw=p.widthM/2, maxSym=0, distinct=true;
      for(var k3=0;k3<n;k3++){
        var cl=e1.centerline[k3], L=e1.leftEdge[k3], R=e1.rightEdge[k3];
        maxSym=Math.max(maxSym, Math.abs(Math.hypot(L.x-cl.x,L.z-cl.z)-Math.hypot(R.x-cl.x,R.z-cl.z)));
        if(Math.hypot(L.x-R.x,L.z-R.z) < hw) distinct=false;
      }
      d.maxLRAsym_m=+maxSym.toFixed(4);
      if(maxSym>SYM_TOL) out.violations.push({id:p.id,reason:"deck-edges-asymmetric",maxM:d.maxLRAsym_m});
      if(!distinct) out.violations.push({id:p.id,reason:"deck-edges-not-double-sided"});
      out.detail.push(d);
    });
    out.pass=out.violations.length===0;
    return out;
  });

  /* spine.pierOverWater — the wharf-must-be-over-water guard (s105). A wharf is a
     deck on piles OVER WATER: at each canonical noon date, every pier ACTIVE at
     that date must extend its deck over the bay, not sit on the bank. The landward
     APPROACH (the deck's contiguous run from the foot until it first reaches water
     — the beach/shore the wharf crosses to get off the land, e.g. Central Wharf's
     ~90 m over the Montgomery-St shore) is tolerated; SEAWARD of that first water
     crossing every deck sample must stay over water (isLandAt=false), and the deck
     END (the berth) must be over water. A deck that never reaches water — sits
     entirely on land, like the pre-s105 Broadway slab parked ~320 m inland on the
     Telegraph Hill bank — or that re-emerges onto land seaward of the water it
     reached, FAILS. Date-gated: a pier not yet built at a noon date has no deck and
     is skipped (matches the existing pier date-gating), so the 1850 City wharves
     are untested in the <=1849 window. Pure of wall-clock/RNG and of the current
     simDay — it sweeps a fixed canonical noon set and reads the release terrain
     (empty morph ops) — so it is rewind-exact and target-independent. Samples the
     deck centreline densely (the pier spine the app renders as centreline +/-
     width/2). A report-only full-extent scan of ALL piers rides in the detail so
     an out-of-window wharf that sits on land surfaces as a follow-up without
     failing the in-window gate. */
  registerAudit("spine","pierOverWater", function(){
    var out={ pass:true, piers:0, checks:0, violations:[], detail:[] };
    var piers=livePiers();
    if(!piers.length) return { pass:true, piers:0, note:"no piers in spine" };
    var DATES=["1846-07-01","1848-04-01","1849-09-15","1849-12-20"];   // the canonical noon dates
    var days=DATES.map(function(d){ return eventDateToSimDay(d); });
    var STEP=4;   // deck-centreline sample spacing (m)
    function scanDeck(p, day){
      var active=pierActiveCheckpoint(p, day);
      if(!active) return null;                       // not built yet — no deck to test
      var e=pierEdgesAt(p, day);
      if(!e.active || e.centerline.length<2) return null;
      var cl=e.centerline, reachedWater=false, landAfterWater=0, firstWaterM=null, acc=0, deckLen=0, prev=null;
      for(var i=1;i<cl.length;i++) deckLen+=Math.hypot(cl[i].x-cl[i-1].x, cl[i].z-cl[i-1].z);
      for(var s=0;s<cl.length-1;s++){
        var a=cl[s], b=cl[s+1], seg=Math.hypot(b.x-a.x,b.z-a.z), n=Math.max(1,Math.round(seg/STEP));
        for(var k=(s===0?0:1);k<=n;k++){
          var t=k/n, x=a.x+(b.x-a.x)*t, z=a.z+(b.z-a.z)*t;
          if(prev) acc+=Math.hypot(x-prev.x, z-prev.z);
          prev={ x:x, z:z };
          var land=isLandAt(x,z,day);
          if(!reachedWater){ if(!land){ reachedWater=true; firstWaterM=+acc.toFixed(1); } }
          else if(land){ landAfterWater++; }
        }
      }
      var end=cl[cl.length-1];
      return { lengthFt:active.lengthFt, deckLenM:+deckLen.toFixed(1), approachM:firstWaterM,
               reachedWater:reachedWater, endOverWater:!isLandAt(end.x,end.z,day), landSamplesAfterWater:landAfterWater };
    }
    piers.forEach(function(p){
      out.piers++;
      var d={ id:p.id, perDate:[] };
      DATES.forEach(function(iso,di){
        var r=scanDeck(p, days[di]);
        if(!r){ d.perDate.push({ date:iso, active:false }); return; }
        out.checks++;
        r.date=iso; r.active=true;
        if(!r.reachedWater) out.violations.push({ id:p.id, date:iso, reason:"deck-never-reaches-water(sits-on-land)" });
        if(!r.endOverWater) out.violations.push({ id:p.id, date:iso, reason:"deck-end-on-land" });
        if(r.landSamplesAfterWater>0) out.violations.push({ id:p.id, date:iso, reason:"deck-re-emerges-onto-land", landSamples:r.landSamplesAfterWater });
        d.perDate.push(r);
      });
      var full=scanDeck(p, 1e9);   // report-only full-extent scan (all 6 piers, incl. out-of-window 1850 wharves)
      d.fullExtent = full ? { reachedWater:full.reachedWater, endOverWater:full.endOverWater,
                              landSamplesAfterWater:full.landSamplesAfterWater, deckLenM:full.deckLenM, approachM:full.approachM,
                              onLand:(!full.reachedWater || !full.endOverWater || full.landSamplesAfterWater>0) } : null;
      out.detail.push(d);
    });
    out.pass=out.violations.length===0;
    return out;
  });
})();
