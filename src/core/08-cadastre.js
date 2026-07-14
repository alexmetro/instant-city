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

/* deriveGroundPlan() — the PURE derivation. Same spine in ⇒ byte-identical
   plan out, zero seeded-dice draws (lotDeterminism proves both). Returns
   { blocks, lots, byId }. A block is the land BETWEEN its four bounding
   street centerlines, inset by each street's constant surveyed half-width
   (so lot fabric runs property-line to property-line and the 6-lot pattern
   closes exactly against the real block polygon). */
function deriveGroundPlan(){
  var blocks = [], lots = [], byId = {};
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
    var blk = { key:key, birth:birth, edges:{ west:wS.id, east:eS.id, north:nS.id, south:sS.id },
                uLo:uLo, uHi:uHi, vLo:vLo, vHi:vHi, extU:extU, extV:extV, nU:nU, nV:nV,
                standard:std, waterLots:0, lots:[] };
    var waterN=0;
    for(var a=0;a<nU;a++) for(var b=0;b<nV;b++){
      var lu0=uLo+extU*a/nU, lu1=uLo+extU*(a+1)/nU, lv0=vLo+extV*b/nV, lv1=vLo+extV*(b+1)/nV;
      var wM=lu1-lu0, dM=lv1-lv0;
      var cu=(lu0+lu1)/2, cv=(lv0+lv1)/2, cw=gridToWorld(cu,cv);
      var water = cadIsWaterLot(cw.x, cw.z);
      if(water) waterN++;
      var devW = wM/CAD_LOT_STD_M - 1, devD = dM/CAD_LOT_STD_M - 1;
      var lot = { id:key+"#"+a+","+b, block:key, iU:a, iV:b, birth:birth,
                  u:{ lo:lu0, hi:lu1 }, v:{ lo:lv0, hi:lv1 },
                  widthM:wM, depthM:dM, devW:devW, devD:devD, dev:Math.max(Math.abs(devW),Math.abs(devD)),
                  corner:(a===0||a===nU-1)&&(b===0||b===nV-1), water:water,
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
  return { blocks:blocks, lots:lots, byId:byId };
}

var GROUND_PLAN = deriveGroundPlan();

/* =====================================================================
   THE DAY FRAME (s81 Director ruling: the swing is materialized INSIDE the
   cadastre, never in consumers). The plat is stored frame-agnostic in (u,v);
   world geometry is produced AT QUERY TIME in the frame the streets render
   in on the queried day — Vioget (−6.5°) before the O'Farrell swing, eased
   to base (−9.0°) across Feb–Aug 1847, base after (the same law
   updateGridSwing applies to the paint). Consumers (overlays, buildings
   placement, anything future) call the API and do ZERO frame math of their
   own — consumer-side frame math is the outlawed pre-s77 class. Derives
   only from the canonical constants (VIOGET_SKEW / GRID_ROT_BASE /
   GRID_ORIGIN_X/Z — the geodetic lock's own numbers) + the sim's swing
   window. OFARRELL_SWING_START/END live in the sim chunk (module var
   hoisting makes them visible here); guarded so a pre-init call degrades
   to the resting base frame.
   ===================================================================== */
function cadSkewAt(day){
  if(day == null) day = (typeof simDay === "number") ? simDay : 1e9;
  if(typeof OFARRELL_SWING_START !== "number" || !isFinite(OFARRELL_SWING_START)) return GRID_ROT_BASE;
  var t = Math.max(0, Math.min(1, (day - OFARRELL_SWING_START) / (OFARRELL_SWING_END - OFARRELL_SWING_START)));
  return VIOGET_SKEW + (GRID_ROT_BASE - VIOGET_SKEW) * t;
}
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
  var sw = gridToWorldAt(l.u.lo, l.v.lo, a), se = gridToWorldAt(l.u.hi, l.v.lo, a),
      ne = gridToWorldAt(l.u.hi, l.v.hi, a), nw = gridToWorldAt(l.u.lo, l.v.hi, a);
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

/* Portsmouth Square — the plaza proto-parcel folds IN. Membership is the
   EXACT two-frame test the old inPublicSquare used (Vioget as-built AND the
   O'Farrell base), so the fold is behavior-preserving (parcelIntegrity proves
   it). Open ground — structures/lot-lines/fences keep out. */
function cadPlazaContains(x,z){
  var P=GEO.plaza, X=x-GRID_ORIGIN_X, Z=z-GRID_ORIGIN_Z, frames=[VIOGET_SKEW, GRID_ROT_BASE];
  for(var f=0;f<frames.length;f++){
    var c=Math.cos(frames[f]), s=Math.sin(frames[f]);
    var u=X*c + Z*s, v=-X*s + Z*c;
    if(u>=P.uMin && u<=P.uMax && v>=P.vMin && v<=P.vMax) return true;
  }
  return false;
}
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
  { name:"portsmouth-square", cls:"plaza",  birth:CAD_DAY_ALWAYS, allow:["civic","promenade","fountain","well"], keepOutStructures:true, contains:cadPlazaContains },
  { name:"yerba-buena-cove",  cls:"water",  birth:CAD_DAY_ALWAYS, allow:["ship","storeship","wharf","mooring","boat"], space:"world", poly:CAD_COVE_POLY },
  { name:"storeship-mud-band",cls:"mud",    birth:CAD_DAY_ALWAYS, allow:["storeship","wharf","beached-boat","flotsam"], band:"intertidal", contains:cadIntertidalContains },
  { name:"beach-band",        cls:"beach",  birth:CAD_DAY_ALWAYS, allow:["flotsam","beached-boat","boat"], band:"beach", contains:cadBeachContains },
  { name:"platted-region",    cls:"survey", birth:(function(){ var m=Infinity; GROUND_PLAN.blocks.forEach(function(b){ m=Math.min(m,b.birth); }); return m; })(), allow:["*"], space:"uv", poly:CAD_PLAT_BOUNDS },
  { name:"happy-valley-camp", cls:"camp",   birth:eventDateToSimDay("1849-08-01"), allow:["tent","shanty","encampment"], space:"world", poly:CAD_HAPPY_VALLEY_POLY },
  { name:"mission-cluster",   cls:"mission",birth:CAD_DAY_ALWAYS, allow:["mission","adobe","civic","garden"], space:"world", poly:cadCirclePoly(OUTPOSTS.mission.x, OUTPOSTS.mission.z, 230, 20) },
  { name:"presidio",          cls:"presidio",birth:CAD_DAY_ALWAYS, allow:["military","civic","adobe"], space:"world", poly:cadCirclePoly(OUTPOSTS.presidio.x, OUTPOSTS.presidio.z, 260, 20) }
];
var GROUND_PARCELS_BY_NAME = {}; GROUND_PARCELS.forEach(function(p){ GROUND_PARCELS_BY_NAME[p.name]=p; });

function cadPointInPoly(pts, x, z){ // ray cast, points {x,z}
  var inside=false;
  for(var i=0,j=pts.length-1; i<pts.length; j=i++){
    var xi=pts[i].x, zi=pts[i].z, xj=pts[j].x, zj=pts[j].z;
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
/* Point queries invert through the DAY frame (cadSkewAt) — a click on a lot
   corner at an 1846 date maps to the (u,v) the Vioget-frame streets bound,
   not the resting base frame 2.5° away (~17 m at the grid edge). */
function cadBlockAt(x, z, day){
  var g = cadWorldToGridAt(x, z, cadSkewAt(day));
  for(var i=0;i<GROUND_PLAN.blocks.length;i++){ var b=GROUND_PLAN.blocks[i];
    if(day!=null && b.birth>day) continue;
    if(g.u>=b.uLo && g.u<=b.uHi && g.v>=b.vLo && g.v<=b.vHi) return b;
  }
  return null;
}
function cadLotAt(x, z, day){
  var b = cadBlockAt(x,z,day); if(!b) return null;
  var g = cadWorldToGridAt(x, z, cadSkewAt(day));
  var a = Math.min(b.nU-1, Math.max(0, Math.floor((g.u-b.uLo)/b.extU*b.nU)));
  var c = Math.min(b.nV-1, Math.max(0, Math.floor((g.v-b.vLo)/b.extV*b.nV)));
  return b.lots[a*b.nV + c] || null;
}
function cadRowAt(x, z){ // the right-of-way (street id) the point sits inside, if any
  var best=null;
  if(typeof PLACEMENT_STREET_SEGS==="undefined") return null;
  for(var i=0;i<PLACEMENT_STREET_SEGS.length;i++){ var s=PLACEMENT_STREET_SEGS[i];
    var d=distToSegXZ(x,z,s.x0,s.z0,s.x1,s.z1);
    if(d<s.halfW && (!best || d<best.d)) best={ id:s.id, d:d, halfW:s.halfW, frame:s.frame };
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
/* Cadastre census (for __P1850 + reporting). */
function groundPlanStats(){
  var B=GROUND_PLAN.blocks, L=GROUND_PLAN.lots;
  function era(d){ return d<0?"vioget-1839":(d<400?"ofarrell-1847":(d<1300?"eddy-1849":"later")); }
  var per={};
  B.forEach(function(b){ var e=era(b.birth); (per[e]=per[e]||{blocks:0,lots:0,waterLots:0,nonStandard:0});
    per[e].blocks++; per[e].lots+=b.lots.length; per[e].waterLots+=b.waterLots; if(!b.standard) per[e].nonStandard++; });
  var maxDev=0; L.forEach(function(l){ if(l.dev>maxDev) maxDev=l.dev; });
  return { blocks:B.length, lots:L.length, waterLots:L.filter(function(l){ return l.water; }).length,
           standardBlocks:B.filter(function(b){ return b.standard; }).length,
           nonStandardBlocks:B.filter(function(b){ return !b.standard; }).length,
           parcels:GROUND_PARCELS.length, maxDevPct:+(maxDev*100).toFixed(3), perEra:per };
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
     never failed (building-spawn-spec: edge/partial blocks are flagged). */
  registerAudit("placement", "platClosure", function(){
    var B=GROUND_PLAN.blocks, closureFail=[], nonStd=[], i;
    for(i=0;i<B.length;i++){ var b=B[i];
      // partition integrity: lot count == nU*nV, unique ordinals, areas sum to block
      var area=b.extU*b.extV, lotArea=0, seen={}, dup=false;
      for(var k=0;k<b.lots.length;k++){ var l=b.lots[k]; lotArea+=l.widthM*l.depthM;
        var o=l.iU+","+l.iV; if(seen[o]) dup=true; seen[o]=1; }
      var closed = b.lots.length===b.nU*b.nV && !dup && Math.abs(lotArea-area) <= 0.01;
      if(b.standard){ if(!closed) closureFail.push({ block:b.key, dArea:+(lotArea-area).toFixed(4), lots:b.lots.length }); }
      else nonStd.push({ block:b.key, shape:b.nU+"x"+b.nV, lots:b.lots.length, water:b.waterLots });
    }
    return { pass: closureFail.length===0, law:"platClosure",
             standardBlocks:B.filter(function(x){return x.standard;}).length,
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

  /* platFrame (s81 Director ruling) — the cadastre's day-frame world geometry
     matches the streets' rendered frame NUMERICALLY: at 1846-07-01 (Vioget,
     −6.5°) and 1848-04-01 (post-swing base, −9.0°), for EVERY block present,
     the lot-edge azimuths (both axes, from lotWorldQuad at that day) equal the
     bounding streets' rendered polyline azimuths within 0.2°. Also asserts the
     day frame itself resolves to the correct constant at both dates. */
  registerAudit("placement", "platFrame", function(){
    function az(dx,dz){ var a = Math.atan2(dz,dx)*180/Math.PI; return ((a%180)+180)%180; }   // undirected line azimuth
    function angDiff(a,b){ var d = Math.abs(a-b)%180; return Math.min(d, 180-d); }
    function checkDay(day){
      var skew = cadSkewAt(day), bad = [], maxDev = 0, checked = 0, B = blocksAt(day);
      B.forEach(function(b){
        var q = lotWorldQuad(b.lots[0], day).quad;
        var pairs = [ ["north", az(q[1].x-q[0].x, q[1].z-q[0].z)],   // SW->SE edge vs the E-W street
                      ["west",  az(q[3].x-q[0].x, q[3].z-q[0].z)] ]; // SW->NW edge vs the N-S street
        pairs.forEach(function(p){
          var st = STREETS_RUNTIME_BY_ID[b.edges[p[0]]]; if(!st) return;
          var ang = st.swings ? skew : GRID_ROT_BASE;
          var n = st.polyline.length;
          var p0 = gridToWorldAt(st.polyline[0].u, st.polyline[0].v, ang);
          var p1 = gridToWorldAt(st.polyline[n-1].u, st.polyline[n-1].v, ang);
          var d = angDiff(p[1], az(p1.x-p0.x, p1.z-p0.z)); checked++;
          if(d > maxDev) maxDev = d;
          if(d > 0.2) bad.push({ block:b.key, edge:p[0], street:st.id, devDeg:+d.toFixed(3) });
        });
      });
      return { skewDeg:+(skew*180/Math.PI).toFixed(3), blocks:B.length, edgesChecked:checked,
               maxDevDeg:+maxDev.toFixed(4), violations:bad.length, list:bad.slice(0,10) };
    }
    var d1846 = checkDay(eventDateToSimDay("1846-07-01"));
    var d1848 = checkDay(eventDateToSimDay("1848-04-01"));
    var framesRight = Math.abs(d1846.skewDeg - VIOGET_SKEW_DEG) < 0.01 && Math.abs(d1848.skewDeg - GRID_ROT_BASE_DEG) < 0.01;
    return { pass: d1846.violations===0 && d1848.violations===0 && framesRight, law:"platFrame",
             framesResolve:framesRight, "vioget-1846":d1846, "base-1848":d1848 };
  });

  /* parcelIntegrity — (1) every polygon parcel is a closed ring (>=3 pts);
     (2) the FOLDED predicates agree with their reference math at 500 fixed
     sample points (proves inIntertidalBand/inBeachBand/inPublicSquare are now
     thin wrappers that did NOT change behavior). */
  registerAudit("placement", "parcelIntegrity", function(){
    // (1) closed rings
    var openRings=[];
    GROUND_PARCELS.forEach(function(p){ if(p.poly && p.poly.length<3) openRings.push(p.name); });
    // (2) fold agreement — reference math IS the original predicate formula
    function refIntertidal(x,z){ return x >= shorelineX(z) - 4 && terrainHeight(x,z) <= 0.5; }
    function refBeach(x,z){ var h=terrainHeight(x,z); return x >= shorelineX(z) - 30 && h > -0.6 && h <= 1.8; }
    function refPlaza(x,z){
      var P=GEO.plaza, X=x-GRID_ORIGIN_X, Z=z-GRID_ORIGIN_Z, frames=[VIOGET_SKEW, GRID_ROT_BASE];
      for(var f=0;f<frames.length;f++){ var c=Math.cos(frames[f]), s=Math.sin(frames[f]);
        var u=X*c+Z*s, v=-X*s+Z*c; if(u>=P.uMin&&u<=P.uMax&&v>=P.vMin&&v<=P.vMax) return true; }
      return false;
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
    return { pass: openRings.length===0 && disagree===0 && inlandInWater.length===0 && plazaSelf, law:"parcelIntegrity",
             parcels:GROUND_PARCELS.length, openRings:openRings, sampledPoints:side*side*3, predicateDisagreements:disagree,
             inlandPointsInWater:inlandInWater, plazaCentroidInOwnParcel:plazaSelf };
  });
})();
