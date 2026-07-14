/* =====================================================================
   LAYER buildings (slot 4) — OWNS building/tent/fence/yard geometry+materials, placement, frontage/setback,
   signs, fire visuals of structures. NEVER: paints ground, moves people. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 10 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 16 — village buildings, era-gate dates, era runtime, foundation skirts */
/* =====================================================================
   VILLAGE BUILDINGS  (~30, seeded jitter for position/size/rotation/color)
   Density follows geography-shoreline.md §1/§2: densest at the Plaza's
   edges and along the Montgomery St waterfront between Clay & Washington
   (where Montgomery raised the flag, July 9 1846), thinning to almost
   nothing 2 blocks out — the built village was a few dozen structures,
   not a filled-in grid.
   ===================================================================== */
var windowGeoms = [];
var buildingGeoms = [];
var buildingsMesh; // hoisted for semantic-zoom crossfade (see SEMANTIC ZOOM below)
var chimneySpots = []; // {x,y,z} — smoke-puff emitters (A6), capped at a few buildings
var PLACEMENT_SIGNS = []; // s67 (#49) P5 sign registry — every mountSignBoard() sign, for placement.signs
var VILLAGE_BUILDING_SPOTS = []; // {x,z,y,rot,w,d,vStart,vEnd,name?} per placed building — reused by
                                  // Phase 4's yard-object pass (sheds/outhouses/signage), the
                                  // ambient-people street-life system, AND Phase 5's fire system
                                  // (vStart/vEnd index into buildingsMesh's merged vertex buffer so
                                  // individual buildings can be burned/collapsed/rebuilt in place —
                                  // see "PHASE 5 — THE FATES: THE FIRST GREAT FIRE" further down).
var buildingVertCursor = 0; // running vertex count across buildingGeoms as they're pushed, so each
                             // placeBuilding() call can record its own [vStart,vEnd) slice of the
                             // eventual merged buffer without a second full pass over the array.
var windowVertCursor = 0;   // same, for the separate merged window-glow mesh.
function pushBuildingGeo(list, geo){ list.push(geo); buildingVertCursor += geo.attributes.position.count; return geo; }

/* =====================================================================
   s72 (#51) UNIFICATION KIT — ONE PALETTE FAMILY (architecture-1846-50.md,
   the Building Bible). Every structure class draws its base from the SAME
   documented weathered-wood/adobe/canvas family so the town reads as one
   material world (kills the f02 "colorful landmark row vs featureless
   near-black growth cubes" split). Hex values are the bible's own:
     • weathered fir/redwood — the DEFAULT surface carrying ~85% of every
       block: #8a7c6a fresh-cut → #a8a196 silvered (age lerps between them).
     • white lead trim #f2ede0 (chalky) + dull sage-green shutters #4a5c3a —
       the ONLY corpus-attested accent colours.
     • LIBERTY MENU (grounding 15% rule, ~1-in-6-7 buildings): Venetian red
       #8f4432, yellow ochre #b8863f, Prussian blue-grey #3d5266 — real
       period pigments, never bright/modern hues.
     • adobe brick #9c8060 → weathered #6e5a45; whitewash #e8e2d0.
     • galvanized iron #b8bcc0 → weathered #8a8580, rust bleed #a85a3a.
     • undyed canvas #d8cba8.
   ===================================================================== */
var KIT = {
  woodFresh:  0x8a7c6a, woodSilver: 0xa8a196,          // weathered fir/redwood span
  woodMid:    0x998b78,                                 // a middle weathered tone
  whiteTrim:  0xf2ede0, greenShutter: 0x4a5c3a,         // attested accents
  liberty:    [0x8f4432, 0xb8863f, 0x3d5266],           // Venetian red / ochre / Prussian blue-grey
  adobe:      0x9c8060, adobeWet: 0x6e5a45, whitewash: 0xe8e2d0,
  ironNew:    0xb8bcc0, ironWeathered: 0x8a8580, rust: 0xa85a3a,
  canvas:     0xd8cba8,
  signCream:  0xe8dfc0, signInk: 0x2b1d0e,              // painted eave signboard
  doorDark:   0x33291d, roofWood: 0x5a4a38, roofWorn: 0x6b5a44
};
/* Weathered-wood body tone chosen deterministically from a hash key: most of
   the block sits mid-to-silvered; a small share reads fresher (new build).
   ageT 0..1 pushes toward silver (era lens / building age). */
function kitWoodColor(hkey, ageT){
  var t = (hash1(hkey)*0.6) + (ageT!=null?ageT*0.4:0.2);       // blend hash + age
  return new THREE.Color(KIT.woodFresh).lerp(new THREE.Color(KIT.woodSilver), clamp(t,0,1));
}
/* One deterministic hash → [0,1), keyed by an integer, for palette/kit
   choices that must NOT perturb the global rngBuild() draw stream (so a
   liberty-accent roll never shifts downstream seeded placement). */
function hash1(k){ var x = Math.sin((k+1)*12.9898)*43758.5453; return x-Math.floor(x); }
/* Liberty accent: ~1-in-6-7 of buildings carry ONE period pigment on a door
   or trim board. Returns a THREE.Color or null (the 85% documented base). */
function kitLibertyAccent(hkey){
  if(hash1(hkey*7.13+3.1) >= 0.15) return null;                 // ~15% budget, per-scene
  return new THREE.Color(KIT.liberty[Math.floor(hash1(hkey*3.7+1.9)*KIT.liberty.length)]);
}

/* =====================================================================
   ERA-GATE dates for named landmarks (fix, 2026-07-10): the Dec 1849 fire
   block's ~48 buildings (El Dorado, Parker House, Washington Arcade,
   Merchants' Exchange, etc.) were being placed and rendered unconditionally
   regardless of simDay — so a July 1846 view showed the whole 1849
   gambling/business row three years early. Dates below are the
   documented ones (NAMED_BUILDINGS' own sourced detail text, further
   down); anything undated/unverified gets the conservative default of
   "not before 1847-01-01", except the documented 1846 core (City Hotel,
   built by Leidesdorff in 1846 per NAMED_BUILDINGS).
   ===================================================================== */
var LANDMARK_FOUNDED_ISO = {
  "City Hotel": "1846-01-01",
  "El Dorado": "1849-01-01",
  "Washington Arcade": "1849-01-01",
  "Bella Union": "1849-10-22"
};
/* s62: default moved 1847-01-01 -> 1847-09-01. denseRow/forceFrame stock is
   ALIGNED to the corrected O'Farrell grid (GRID_ROT_BASE) — construction
   aligned to a survey cannot logically predate that survey's completion
   (Aug 1847). This also lets the road-footprint audit check post-survey
   rows against only the frame their streets actually paint in while they
   stand. Documented exceptions (City Hotel 1846) keep their own dates. */
var LANDMARK_DEFAULT_FOUNDED_ISO = "1847-09-01";
function landmarkFoundedDay(name){
  var iso = name ? (LANDMARK_FOUNDED_ISO[name] || LANDMARK_DEFAULT_FOUNDED_ISO) : LANDMARK_DEFAULT_FOUNDED_ISO;
  return eventDateToSimDay(iso);
}
(function buildVillage(){
  var uVals = [GEO.streetsU.stockton, GEO.streetsU.dupont, GEO.streetsU.kearny, GEO.streetsU.montgomery];
  // CLAY/WASHINGTON SWAP FIX (2026-07-10): this array's adjacent PAIRS
  // (vVals[bz]..vVals[bz+1]) are read as block bounds below, so it has to
  // be listed in real geographic (north-to-south) order — washington
  // before clay, now that the correction has washington north of the
  // Plaza and clay south of it. Leaving the old clay-before-washington
  // order after fixing GEO.streetsV's VALUES would silently double the
  // width of the Jackson/Washington and Clay/Sacramento blocks (each
  // swallowing the Plaza's own gap) and could let founding-village
  // buildings spawn inside Portsmouth Square itself.
  var vVals = [GEO.streetsV.pacific, GEO.streetsV.jackson, GEO.streetsV.washington, GEO.streetsV.clay, GEO.streetsV.sacramento, GEO.streetsV.california];
  var PLAZA_BX = 1, PLAZA_BZ = 2; // block between Dupont/Kearny x Washington/Clay
  window._VILLAGE_GRID = { uVals:uVals, vVals:vVals, PLAZA_BX:PLAZA_BX, PLAZA_BZ:PLAZA_BZ }; // Phase 5 fire-footprint lookup

  // s72 unification: village bodies now draw from the SAME documented family
  // as growth (KIT). Adobe = warm mud brick span; frame = weathered fir/redwood
  // (the ~85% base). Fresh/light tones dropped — they were the "2005 scrapbook"
  // read the bible flags. Roofs are weathered wood-shingle / tiled adobe browns.
  var adobeColors = [KIT.adobe, 0x8f7452, KIT.adobeWet];
  var frameColors = [KIT.woodMid, KIT.woodSilver, KIT.woodFresh, 0x8f8578];
  var roofColorsAdobe = [0x7a4a34, 0x6e5a45];
  var roofColorsFrame = [KIT.roofWood, KIT.roofWorn, 0x4c4238];

  function blockDensity(bx,bz){
    // true-scale pass: buildings shrank (below), so counts are raised a bit
    // to keep the same lived-in read rather than looking sparser.
    // (Phase 5 note: the Dec 24 1849 fire block gets its own explicit dense
    // fill pass below — buildFireBlock() — rather than a global bump here;
    // the Alta's fire report documents continuous ROWS of buildings on that
    // one block, which the general "few dozen structures" village decision
    // deliberately doesn't produce elsewhere.)
    if(bx===2 && bz===PLAZA_BZ) return 4.6;   // Montgomery between Clay & Washington
    var dPlaza = Math.abs(bx-PLAZA_BX)+Math.abs(bz-PLAZA_BZ);
    if(dPlaza<=1) return 3.6;                  // faces the Plaza directly
    if(dPlaza===2) return 1.9;                 // one ring further out
    return 0.5;                                // thinning to almost nothing at the grid's edge
  }

  // Rotates+places a small local-offset prop into a building's world frame
  // (bake local offset, spin with the building's yaw, translate to world) —
  // the same pattern the night-glow window quads already used below.
  function attachToBuilding(geo, localPos, rot, worldPos){
    bake(geo, localPos, 0);
    var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rot);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
    bake(geo, worldPos, 0);
    return geo;
  }

  function placeBuilding(x,z,rotBase,opts){
    opts = opts || {};
    // WORLD-P0 fix (canPlace engine): was only a below-land height check —
    // buildings could and did straddle streets/intersections (AUDIT §7).
    // Conservative footprint radius (worst-case half-diagonal at max
    // sizeMul, incl. named plaza landmarks) checked BEFORE any rngBuild()
    // call below so the seeded procedural sequence is undisturbed for
    // accepted placements. opts.denseRow (buildFireBlock's documented
    // continuous street-frontage row — the Alta's own account, not scale
    // inflation) uses a tight street margin and skips the cross-building
    // overlap test, since adjacent-frontage buildings are the documented
    // arrangement there, not a collision to avoid.
    var footprintR = 9 * (opts.sizeMul || 1);
    // denseRow (buildFireBlock's documented street-frontage row): the
    // exact lot position comes straight from the primary source, so skip
    // the street-proximity heuristic entirely rather than guess a margin
    // that would reject some hand-placed, historically-correct lots.
    var placeOpts = opts.denseRow ? {skipStreet:true, skipOverlap:true} : {streetMargin:3};
    if(!canPlace(x,z,footprintR,placeOpts)) return;
    var y = terrainHeight(x,z);

    var vStart = buildingVertCursor;         // Phase 5: this building's slice of the merged buffer
    var wStart = windowVertCursor;           // ...and its window-glow slice (flattened with it on burn)

    // true-scale pass (design addendum): a 50-vara lot is ~41.9m square, so a
    // single-story frame/adobe cottage/shanty of ~4.5-8m x 3.8-6.8m lets
    // several structures actually fit along a lot edge, instead of one
    // building dominating the whole lot. Named plaza landmarks (opts.sizeMul)
    // get a bounded bump: the Alta's own fire report calls the El Dorado "a
    // new four story, commodious public edifice" and the Parker House was the
    // town's grandest — still honest-scale, never inflated for visibility.
    var sizeMul = opts.sizeMul || 1;
    var w = (4.5+rngBuild()*3.5)*sizeMul, d = (3.8+rngBuild()*3)*sizeMul, h = (2.6+rngBuild()*1.6)*Math.min(sizeMul*(opts.tall?1.6:1), 2.4);
    registerPlacement(x,z, Math.hypot(w,d)/2); // shared placement index — later spawners (tents/growth/outposts) now see this footprint
    // ORGANIC LAYOUT (2026-07-10): pre-1847 Yerba Buena was scattered — survey
    // on paper, not ground — so ordinary construction gets generous off-grid
    // jitter; the Dec 1849 fire block (opts.denseRow) is a documented,
    // specific post-survey frontage row and stays disciplined/aligned, same
    // as the O'Farrell grid-swing logic elsewhere treats post-survey work.
    var jitterDeg = opts.denseRow ? 3 : 12;
    // aligned to the tilted grid, not true north: founding-village work sits
    // in the as-built Vioget frame; documented post-survey frontage rows
    // (denseRow — the Dec 1849 fire block) align to the corrected O'Farrell
    // base grid, same split the growth candidates below use.
    // s56 YAW-FRAME FIX (a sibling the 34858c0 re-projection missed):
    // bake()'s three.js yaw is the NEGATIVE of the world angle (Ry(a) maps
    // local +X to world angle -a in atan2(z,x) terms), while gridToWorld's
    // skew rotates the streets to world angle +skew. Adding the skew here
    // therefore rotated every building 2×skew AWAY from its street — an
    // invisible 5° when VIOGET_SKEW was +2.5°, a glaring 13°/18° once the
    // measured re-projection set the frames to -6.5°/-9.0°. The bake yaw
    // must be -(gridAngle + skew); rotBase (0/π/2) and the symmetric
    // jitter are sign-invariant, so the one rngBuild() draw is unchanged.
    // s76 SINGLE-SOURCE ORIENTATION (§1.6): yaw turns the front (+z, door face)
    // toward the nearest street. The old -(rotBase+skew) math drifted 90°/180°
    // off the door face (the Director's #1 nub — orientation audit hist showed
    // ~half the town at 90°/180°). rotBase is now vestigial for addressed rot;
    // the jitter draw is preserved so the seeded stream stays byte-stable.
    // denseRow (documented fire-block frontage) keeps its authored alignment.
    // even the documented Dec-1849 fire-block row (denseRow) faces its street
    // via the single source — its authored LOT POSITIONS honor the record, but
    // orientation is derived, never the old -(rotBase+skew) math that faced the
    // row's doors into the block (the pre-s76 fire-block nub).
    var rot = yawFacingStreet(x,z) + (rngBuild()-0.5)*2*(jitterDeg*Math.PI/180);
    var isAdobe = opts.forceFrame ? false : rngBuild()<0.55;
    var bodyColor = new THREE.Color(isAdobe? adobeColors[Math.floor(rngBuild()*adobeColors.length)] : frameColors[Math.floor(rngBuild()*frameColors.length)]);
    var roofColor = new THREE.Color(isAdobe? roofColorsAdobe[Math.floor(rngBuild()*roofColorsAdobe.length)] : roofColorsFrame[Math.floor(rngBuild()*roofColorsFrame.length)]);

    var body = makeBoxLocal(w,h,d,bodyColor);
    bake(body, new THREE.Vector3(x,y,z), rot);
    pushBuildingGeo(buildingGeoms, body);

    var roof = makeGableRoof(w,d,0.6, 1.1+rngBuild()*1.3, roofColor);
    bake(roof, new THREE.Vector3(x,y+h,z), rot);
    pushBuildingGeo(buildingGeoms, roof);

    // a couple of warm window glints (lit only at night)
    var darkInset = bodyColor.clone().multiplyScalar(0.35);
    var wCount = 1+Math.floor(rngBuild()*2);
    for(var wi=0; wi<wCount; wi++){
      var side = rngBuild()<0.5? -1:1;
      var offsetX = (rngBuild()-0.5)*(w*0.5);
      var wg = makeBoxLocal(0.6,0.6,0.06, new THREE.Color(0xffffff));
      attachToBuilding(wg, new THREE.Vector3(offsetX, h*0.5, side*(d/2+0.02)), rot, new THREE.Vector3(x,y,z));
      windowGeoms.push(wg);
      windowVertCursor += wg.attributes.position.count;

      // A6: a dark inset frame sitting a hair behind the glow quad, so the
      // window reads as a real dark recess by day and lights up at night.
      var inset = makeBoxLocal(0.72,0.72,0.05, darkInset);
      attachToBuilding(inset, new THREE.Vector3(offsetX, h*0.5, side*(d/2+0.005)), rot, new THREE.Vector3(x,y,z));
      pushBuildingGeo(buildingGeoms, inset);
    }
    // A6: a dark door inset, centered on the front (south-ish) face.
    // s72 unification: the door reads as a dark recess by default; ~1-in-7
    // buildings carry a LIBERTY accent (Venetian red / ochre / Prussian blue-
    // grey) painted door — hash-keyed off position so no rngBuild() draw is
    // consumed (the seeded stream is byte-stable).
    var hkey = Math.round(x*3.1)+Math.round(z*7.7);
    // s76 §1.6: the door decal is on the FRONT face (+z) by construction — the
    // front now faces the street (yawFacingStreet above), so the door faces the
    // street. The randomized ±z doorFace was half the orientation defect (doors
    // on the back wall). The rng draw is kept so the seeded stream is unchanged.
    rngBuild(); var doorFace = 1;
    var libAccent = kitLibertyAccent(hkey);
    var door = makeBoxLocal(1.1, 1.9, 0.08, libAccent || darkInset);
    var doorXoff = (rngBuild()-0.5)*w*0.3;
    attachToBuilding(door, new THREE.Vector3(doorXoff, 0.95, doorFace*(d/2+0.01)), rot, new THREE.Vector3(x,y,z));
    pushBuildingGeo(buildingGeoms, door);
    // s72: attested WHITE-LEAD trim + DULL SAGE-GREEN shutters on a minority
    // (~1-in-6, hash-keyed, no rng). Thin trim board over the door + a shutter
    // pair flanking it — the only corpus-attested painted accents on frame
    // cottages, applied at the bible's slightly-generous liberty frequency.
    if(hash1(hkey*1.7+0.3) < 0.17){
      var trim = makeBoxLocal(1.5, 0.16, 0.05, new THREE.Color(KIT.whiteTrim));
      attachToBuilding(trim, new THREE.Vector3(doorXoff, 1.98, doorFace*(d/2+0.02)), rot, new THREE.Vector3(x,y,z));
      pushBuildingGeo(buildingGeoms, trim);
      [-1,1].forEach(function(sh){
        var shut = makeBoxLocal(0.24, 1.5, 0.04, new THREE.Color(KIT.greenShutter));
        attachToBuilding(shut, new THREE.Vector3(doorXoff+sh*0.85, 0.9, doorFace*(d/2+0.02)), rot, new THREE.Vector3(x,y,z));
        pushBuildingGeo(buildingGeoms, shut);
      });
    }

    // A6: ~1 in 6 buildings gets a lean-to shed addition against one side
    if(rngBuild()<0.16){
      var lw = w*(0.35+rngBuild()*0.25), ld = d*0.55, lh = h*(0.45+rngBuild()*0.2);
      var leanSide = rngBuild()<0.5? -1:1;
      var lean = makeBoxLocal(lw, lh, ld, bodyColor.clone().multiplyScalar(0.88));
      attachToBuilding(lean, new THREE.Vector3(leanSide*(w/2+lw/2-0.3), 0, 0), rot, new THREE.Vector3(x,y,z));
      pushBuildingGeo(buildingGeoms, lean);
    }
    // A6: a handful of buildings get a chimney (+ a drifting smoke wisp emitter)
    if(chimneySpots.length<3 && rngBuild()<0.22){
      var chH = h*0.55;
      var chimney = makeBoxLocal(0.55,chH,0.55, new THREE.Color(0x6b5a4c));
      attachToBuilding(chimney, new THREE.Vector3(w*0.28, h, d*0.22), rot, new THREE.Vector3(x,y,z));
      pushBuildingGeo(buildingGeoms, chimney);
      var top = new THREE.Vector3(w*0.28, h+chH, d*0.22);
      var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rot);
      top.applyQuaternion(q);
      chimneySpots.push({ x:x+top.x, y:y+top.y, z:z+top.z });
    }

    // Phase 5: record the building's full vertex slices + landmark identity
    // for the fire system's footprint selection and burn/collapse/rebuild.
    // ERA-GATE fix: only the Dec-1849 fire block + City Hotel pass
    // forceFrame:true (buildFireBlock()'s put() calls / the City Hotel
    // placement below) — ordinary village/growth construction is
    // ungated (foundedDay:null), same as before this fix.
    VILLAGE_BUILDING_SPOTS.push({ x:x, z:z, y:y, rot:rot, w:w, d:d, h:h,
      vStart:vStart, vEnd:buildingVertCursor, wStart:wStart, wEnd:windowVertCursor,
      name:opts.name||null, isIgnition:!!opts.isIgnition, fireproof:!!opts.fireproof,
      unaddressed:!!opts.unaddressed, fireBlock:!!opts.denseRow,
      foundedDay: opts.forceFrame ? landmarkFoundedDay(opts.name) : null });
  }

  /* s72 (#51) FRONTAGE for the founding village: grounding §9 — "fill buildings
     front streets like real ones (facing, setback, street-wall density) rather
     than scattering inside blocks". The pre-s72 loop scattered UNIFORMLY inside
     the block interior, stranding frame houses 26-36m from any street (the P4
     setback offenses this sprint must fix). frontify() keeps a building near its
     nearest block edge (a street centerline) at a constant-width setback, and
     faces it. Pure geometry — no rngBuild() draw — applied to the ALREADY-drawn
     (u,v), so the seeded stream length is byte-identical to pre-s72 (draw order:
     branch-test, 3 position draws | 2 jog draws, coin — unchanged); only the
     resulting positions/orientations move. */
  function frontify(u,v,uLo,uHi,vLo,vHi){
    var dW=u-uLo, dE=uHi-u, dN=v-vLo, dS=vHi-v;
    var m=Math.min(dW,dE,dN,dS);
    // face the nearest edge (u-edges → π/2, v-edges → 0), same convention as
    // the growth lot system so the front (+z) turns toward the fronted street.
    var rot = (m===dW||m===dE) ? Math.PI/2 : 0;
    if(m<=30) return { u:u, v:v, rot:rot };   // already fronting an edge (canPlace keeps it ≥ROW-clear)
    // MID-BLOCK ORPHAN (setback offense): pull to the nearest edge at a 26m
    // constant-width setback (clears the ROW; door lands ≤25m from the street).
    if(dW<=dE && dW<=dN && dW<=dS) return { u:uLo+26, v:clamp(v,vLo+26,vHi-26), rot:Math.PI/2 };
    if(dE<=dN && dE<=dS)          return { u:uHi-26, v:clamp(v,vLo+26,vHi-26), rot:Math.PI/2 };
    if(dN<=dS)                    return { u:clamp(u,uLo+26,uHi-26), v:vLo+26, rot:0 };
    return                               { u:clamp(u,uLo+26,uHi-26), v:vHi-26, rot:0 };
  }
  for(var bx=0; bx<uVals.length-1; bx++){
    for(var bz=0; bz<vVals.length-1; bz++){
      if(bx===PLAZA_BX && bz===PLAZA_BZ) continue; // Portsmouth Square — kept open
      // s72 (#51): the Kearny-Montgomery × Washington-Clay block (bx=2,bz=2) is
      // the DOCUMENTED Dec-1849 fire block, filled to ~50 buildings by
      // buildFireBlock() below (skipOverlap party-wall density). The village
      // loop must NOT also drop scatter buildings into it — that produced the
      // authored P1 overlaps (village stock colliding with the fire row, neither
      // aware of the other). buildFireBlock owns this block.
      if(bx===2 && bz===PLAZA_BZ) continue;
      var uLo=uVals[bx], uHi=uVals[bx+1], vLo=vVals[bz], vHi=vVals[bz+1];

      var n = Math.max(0, Math.round(blockDensity(bx,bz) + (rngBuild()-0.5)*1.3));
      // Uneven occupancy (organic): some lots doubled-up (a second structure
      // crowded near the last along the same frontage), others empty. Every
      // building fronts its nearest block edge at a period setback (frontify).
      var lastG = null;
      for(var k=0;k<n;k++){
        var gu, gv;
        if(lastG && rngBuild()<0.28){
          var jog = 6+rngBuild()*8, jang = rngBuild()*Math.PI*2; // crowd along the frontage near the last building
          gu = lastG.u+Math.cos(jang)*jog; gv = lastG.v+Math.sin(jang)*jog;
        } else {
          var edgePick = rngBuild();
          var setb = 24+rngBuild()*5;            // 24-29m constant-width setback in from the fronted edge
          var alongT = rngBuild();
          if(edgePick<0.28){       gu=uLo+setb; gv=lerp(vLo+26,vHi-26,alongT); }   // west frontage
          else if(edgePick<0.56){  gu=uHi-setb; gv=lerp(vLo+26,vHi-26,alongT); }   // east frontage
          else if(edgePick<0.78){  gv=vLo+setb; gu=lerp(uLo+26,uHi-26,alongT); }   // north frontage
          else {                   gv=vHi-setb; gu=lerp(uLo+26,uHi-26,alongT); }   // south frontage
        }
        var fr = frontify(gu, gv, uLo,uHi,vLo,vHi);
        var coin = rngBuild()<0.5?0:Math.PI/2; // consumed (stream); the frontage rot is used instead
        var p = gridToWorld(fr.u, fr.v);
        placeBuilding(p.x, p.z, fr.rot);
        lastG = fr;
      }
    }
  }

  // a few outliers just past the grid's surveyed edge — squatters' huts
  // along the fading tracks, thinning the town out rather than a hard wall
  [
    gridToWorld(uVals[0]-90, vVals[2]+20),
    gridToWorld(uVals[1]-40, vVals[0]-70),
    gridToWorld(uVals[2]+30, vVals[5]+80)
  ].forEach(function(p){ placeBuilding(p.x, p.z, rngBuild()<0.5?0:Math.PI/2, {unaddressed:true}); }); // §5: squatter huts past the surveyed edge — deliberately unaddressed/loose

  /* -----------------------------------------------------------------------
     PHASE 5 — THE FIRE BLOCK. The Dec 24 1849 Great Fire's documented
     footprint, built to the Alta California's own Dec 26 1849 account
     (corpus DAC18491226, "APPALLING AND DESTRUCTIVE CONFLAGRATION!!"):
     one block, bounded by Kearny (west, facing Portsmouth Square),
     Montgomery (east), Clay and Washington — the fire began at Dennison's
     Exchange on the Kearny frontage, took the Parker House and El Dorado,
     ran down Washington St, and was arrested at Burgoyne & Co.'s unfinished
     brick store at Washington & Montgomery and at Delmonico's at Clay &
     Kearny. NOTE: placement follows the PRIMARY source (the Alta puts
     Dennison's between Parker House and the United States Restaurant on
     the plaza-facing frontage); economy-daily-life.md's secondary-source
     "Kearny between Clay and Jackson" is set aside where they conflict.
     The Alta names ~30 establishments in continuous rows on this one block
     (~50 buildings with the arcade/outbuildings), so this block alone is
     densely filled — a documented local density, not scale inflation.
     Individual lot positions within the frontages are approximate (the
     record gives order-along-the-row, not lot numbers).
     ----------------------------------------------------------------------- */
  (function buildFireBlock(){
    var kU = uVals[2], mU = uVals[3];            // kearny, montgomery
    // CLAY/WASHINGTON SWAP FIX (2026-07-10, grounding.md §9 knownDiscrepancies):
    // this whole block's offsets were written against the OLD, buggy
    // GEO.streetsV (clay = north/smaller value, washington = south/larger)
    // as bare "+N"/"-N" nudges relative to whichever edge was meant. Now
    // that GEO.streetsV.clay/washington read the CORRECTED values (washington
    // is north, clay is south), every one of those nudges has to flip sign
    // to keep pointing the same DIRECTION (interior vs. across-the-street)
    // relative to the correct edge — otherwise the whole named row would
    // silently reflect to the wrong side. nV/sV name the edges by compass
    // direction instead of street name, so every offset below still reads
    // as "+N toward the interior" the same way the original code intended;
    // only the actual (x,z) each named building lands on has moved to match
    // the corrected record.
    var nV = Math.min(GEO.streetsV.clay, GEO.streetsV.washington); // north edge = Washington St (corrected)
    var sV = Math.max(GEO.streetsV.clay, GEO.streetsV.washington); // south edge = Clay St (corrected)
    /* s62 CONSTANT-WIDTH SETBACKS (road-master-spec amendment): the old
       hand-nudged +8/+9m offsets were calibrated against the narrower
       PAINTED streets of an earlier renderer — against the CONSTANT
       surveyed class widths (Kearny 68'9" = 20.96m, Washington/Clay
       49'1.5" = 14.97m) they put whole frontage rows ON the roadway.
       Every offset below is now derived: centerline + halfW + 1.6m margin
       + half the building's worst-case depth (3.4m × sizeMul), so fronts
       align just clear of the right-of-way. And since these are documented
       POST-SURVEY rows (denseRow aligns their yaw to GRID_ROT_BASE), their
       positions convert through the SAME -9.0° frame the streets are
       painted in after Aug 1847 — not the founding-village Vioget frame
       (the 2.5° delta alone was ~6m of on-road drift here). */
    var K_HALF = STREETS_RUNTIME_BY_ID["kearny"].widthM/2;
    var W_HALF = STREETS_RUNTIME_BY_ID["washington"].widthM/2;
    var C_HALF = STREETS_RUNTIME_BY_ID["clay"].widthM/2;
    var M_HALF = STREETS_RUNTIME_BY_ID["montgomery"].widthM/2;
    function fOff(halfW, sizeMul){ return halfW + 1.6 + 3.5*(sizeMul||1); }
    /* Portsmouth Street (the corpus-attested mid-block lane at v=0, running
       from the Plaza to the Montgomery landing) BISECTS this block in the
       master data — the fill and mid-row lots must respect its constant
       right-of-way like any other street (s62 audit finding). */
    var _pStreet = STREETS_RUNTIME_BY_ID["portsmouth-street"];
    var P_HALF = _pStreet ? _pStreet.widthM/2 : 0;
    var P_V = _pStreet ? _pStreet.polyline[0].v : 0;
    function dodgeMidLane(v, halfV){
      if(!P_HALF) return v;
      var lo = P_V - (P_HALF+1.4+halfV), hi = P_V + (P_HALF+1.4+halfV);
      if(v>lo && v<hi) return (v<P_V) ? lo : hi;
      return v;
    }
    // s72 (#51): the fire block places its documented buildings via denseRow
    // (skipOverlap) — the Alta's continuous frontage row is the intended dense
    // arrangement, not a collision to avoid. But the 30-building INTERIOR FILL
    // was landing ON TOP of the named frontage buildings (the 11 authored P1
    // overlaps the s67 audit surfaced for #51). placedFB records every fire-
    // block footprint (grid-space centre + conservative radius) so the fill can
    // be de-overlapped deterministically — no rngBuild() draw, so the seeded
    // stream is byte-stable.
    var placedFB = [];
    function deoverlapFB(u,v,r){
      for(var pass=0; pass<16; pass++){
        var hit=false;
        for(var q=0;q<placedFB.length;q++){ var f=placedFB[q];
          var du=u-f.u, dv=v-f.v, md=r+f.r, d2=du*du+dv*dv;
          if(d2 < md*md){ var d=Math.sqrt(d2)||0.001; var push=(md-d)+0.4; u+=(du/d)*push; v+=(dv/d)*push; hit=true; }
        }
        if(!hit) break;
      }
      return { u:u, v:v };
    }
    function put(u,v,rot,opts){
      opts = opts||{};
      opts.denseRow = true; // documented continuous frontage row (Alta account) — see placeBuilding()
      placedFB.push({ u:u, v:v, r: 5.6*(opts.sizeMul||1) });
      var p = gridToWorldAt(u,v,GRID_ROT_BASE); placeBuilding(p.x,p.z,rot,opts);
    }

    // Kearny frontage, plaza-facing row — order per the Alta's loss list.
    // The Alta's account has this row running along Washington St (the
    // corrected north edge, nV) with two lots (Florence Saloon, Delmonico's)
    // toward the Clay St (south edge, sV) end near the plaza corner.
    put(kU+fOff(K_HALF,1.45), nV+fOff(W_HALF,1.45),  Math.PI/2, { name:"El Dorado",            sizeMul:1.45, tall:true, forceFrame:true });
    put(kU+fOff(K_HALF,1.55), nV+fOff(W_HALF,1.55)+14, Math.PI/2, { name:"Parker House",         sizeMul:1.55, tall:true, forceFrame:true });
    put(kU+fOff(K_HALF,1.25), dodgeMidLane(nV+fOff(W_HALF,1.25)+28, 4*1.25+1), Math.PI/2, { name:"Dennison's Exchange",  sizeMul:1.25, forceFrame:true, isIgnition:true });
    put(kU+fOff(K_HALF,1.15), dodgeMidLane(nV+fOff(W_HALF,1.15)+40, 4*1.15+1), Math.PI/2, { name:"United States Restaurant", sizeMul:1.15, forceFrame:true });
    put(kU+fOff(K_HALF,1),    dodgeMidLane(nV+fOff(W_HALF,1)+52, 5),    Math.PI/2, { name:"Hughs, Noel & Crenshaw", forceFrame:true });
    put(kU+fOff(K_HALF,1),    sV-fOff(C_HALF,1)-9,     Math.PI/2, { name:"Florence Saloon", forceFrame:true });
    put(kU+fOff(K_HALF,1.2),  sV-fOff(C_HALF,1.2),     Math.PI/2, { name:"Delmonico's",          sizeMul:1.2, forceFrame:true, fireproof:true }); // saved by its own roof crew (Alta)

    // Washington St frontage, running toward Montgomery — incl. the
    // Merchants' Exchange the authorities blew up, and the unfinished
    // Burgoyne & Co. brick store that finally stayed the fire.
    put(kU+28, nV+fOff(W_HALF,1)+13, 0, { name:"B. Ayres store", forceFrame:true });          // "in rear of the El Dorado" — set clear behind El Dorado's big corner footprint (s72 P1 fix, minimal move, still on this block)
    put(kU+32, nV+fOff(W_HALF,1), 0, { name:"Rosenbaum & Schaeffer", forceFrame:true });
    put(kU+46, nV+fOff(W_HALF,1.3), 0, { name:"Merchants' Exchange",   sizeMul:1.3, forceFrame:true }); // Dunbar & Gibbs — 2nd demolition
    put(kU+60, nV+fOff(W_HALF,1), 0, { name:"Washington Arcade", forceFrame:true });
    put(kU+72, nV+fOff(W_HALF,1), 0, { name:"Central House", forceFrame:true });
    put(kU+84, nV+fOff(W_HALF,1.15), 0, { name:"Geurschard & Van Beuren", sizeMul:1.15, forceFrame:true }); // 3rd demolition, by the Alcalde's order
    put(kU+98, nV+fOff(W_HALF,1), 0, { name:"Baltimore Restaurant", forceFrame:true });
    put(mU-fOff(M_HALF,1.3),  nV+fOff(W_HALF,1.3), 0, { name:"Burgoyne & Co. (brick, unfinished)", sizeMul:1.3, fireproof:true });

    // interior + Clay-side fill to the documented ~50-building count
    // (s62: fill kept clear of every right-of-way at constant class width,
    // including the Portsmouth St mid-block lane)
    // s72 (#51): the ~50-building block is a DENSE PARTY-WALL interior. The old
    // fill scattered at random orientations (0/π/2 coin), so perpendicular
    // neighbours read as intersecting footprints (the authored P1 overlaps). It
    // now lays on a jittered GRID with a CONSISTENT π/2 orientation — dense
    // packing between same-yaw neighbours is P1's permitted party-wall mechanism
    // (angle diff ≤15° → not an intersection) — kept in the interior/Clay band
    // clear of the rot-0 Washington frontage row, and de-overlapped as a safety
    // net. SAME three rngBuild() draws/iteration (two jitters + a consumed coin),
    // so the seeded stream length is unchanged.
    var FILL_COLS=6, FILL_ROWS=5;
    for(var i=0;i<30;i++){
      var col=i%FILL_COLS, row=Math.floor(i/FILL_COLS);
      var gu = lerp(kU+K_HALF+9, mU-M_HALF-9, (col+0.5)/FILL_COLS) + (rngBuild()-0.5)*7;
      var gv = lerp(nV+W_HALF+22, sV-C_HALF-8, (row+0.5)/FILL_ROWS) + (rngBuild()-0.5)*6;
      var _coin = rngBuild()<0.5?0:Math.PI/2; // consumed (stream); fill uses a consistent party-wall yaw
      gv = dodgeMidLane(gv, 5.6);
      var dz = deoverlapFB(gu, gv, 5.6);
      gu = clamp(dz.u, kU+K_HALF+9, mU-M_HALF-9);
      gv = dodgeMidLane(clamp(dz.v, nV+W_HALF+22, sV-C_HALF-8), 5.6);
      put(gu, gv, Math.PI/2, { forceFrame:true });
    }

    // scorched survivors just OUTSIDE the footprint (blanket crews kept
    // them wet, per the Alta): the Verandah opposite the El Dorado (the
    // NW corner of Kearny & Washington), and the Bella Union / Haley
    // House / Miners' Bank row across Washington (the north side).
    put(kU-fOff(K_HALF,1.15), nV-fOff(W_HALF,1.15), Math.PI/2, { name:"Verandah", sizeMul:1.15, forceFrame:true }); // kept out of the open Plaza block itself
    put(kU-24, nV-fOff(W_HALF,1),    0, { name:"Miners' Bank", forceFrame:true });
    put(kU-38, nV-fOff(W_HALF,1.25), 0, { name:"Bella Union", sizeMul:1.25, forceFrame:true });
    put(kU-52, nV-fOff(W_HALF,1.15), 0, { name:"Haley House", sizeMul:1.15, forceFrame:true });
  })();

  /* GAPS-2026-07-09 item 3 (named landmarks): City Hotel — William A.
     Leidesdorff, 1846, "corner of Clay and Kearny," Bancroft's first
     building in Yerba Buena "entitled to the name" of hotel (clm:timeline:14,
     clm:cast:86). Placed one block SOUTH of the fire footprint (Kearny
     frontage, the Clay-Sacramento block) — the exact lot isn't in the record
     (approximate, per QA-GATE §1), and no claim documents its Dec 24 1849
     fate, so it's kept outside the documented burn footprint rather than
     guessed into it either way.
     CLAY/WASHINGTON SWAP FIX (2026-07-10): Clay St is now correctly the
     fire block's SOUTH edge (sV above), so "outside the footprint, fronting
     Clay & Kearny from the far side" is now south of Clay (+10) rather than
     the old code's north-of-Clay (-10) — the old offset direction was
     calibrated against the pre-fix (wrong) street identity, not an
     independent design choice, so it has to flip along with the fix. */
  (function(){
    // s62 constant-width setback (same derivation as the fire block): Kearny
    // halfW + margin + half-depth east of Kearny, Clay halfW + margin +
    // half-depth south of Clay, converted through the post-survey frame.
    var kU2 = uVals[2], cV2 = GEO.streetsV.clay;
    var kHalf = STREETS_RUNTIME_BY_ID["kearny"].widthM/2, cHalf = STREETS_RUNTIME_BY_ID["clay"].widthM/2;
    // +7m extra: City Hotel is documented 1846 construction, so unlike the
    // post-survey fire block it COEXISTS with the pre-1847 Vioget-frame
    // street paint — the extra margin clears the right-of-way in BOTH
    // frames (~6.2m max divergence at this distance from the grid origin).
    var p = gridToWorldAt(kU2+kHalf+8.6+3.5*1.35, cV2+cHalf+8.6+3.5*1.35, GRID_ROT_BASE);
    placeBuilding(p.x, p.z, Math.PI/2, { name:"City Hotel", sizeMul:1.35, tall:true, forceFrame:true, denseRow:true });
  })();

  buildingsMesh = new THREE.Mesh(mergeGeoms(buildingGeoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, transparent:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}));
  scene.add(buildingsMesh);
})();

var windowsMesh = new THREE.Mesh(mergeGeoms(windowGeoms), new THREE.MeshBasicMaterial({ color:0xffcf8a, transparent:true, opacity:0 }));
scene.add(windowsMesh);

/* =====================================================================
   ERA-GATED LANDMARKS — runtime plumbing (fix, 2026-07-10): buildings
   flagged with a spot.foundedDay (the Dec 1849 fire block + City Hotel,
   see landmarkFoundedDay() above) stay buried below grade until simDay
   reaches their founding date, exactly the same vertex-slice technique
   the fire system below uses to collapse/rebuild buildings in place.
   Keeps the July 1846 view to the founding village + growth buildings
   only — no 1849 gambling row three years early.
   ===================================================================== */
var ERA_GATE = [];
VILLAGE_BUILDING_SPOTS.forEach(function(s, idx){
  // spotIdx doubles as this building's instance id in buildingShadowMesh
  // (s56 fix: the contact-shadow decal is gated WITH its building — an
  // unfounded building must not leave an orphan shadow blob on bare
  // ground). Indices are stable: the chapel is pushed AFTER this runs,
  // appended at the end.
  if(s.foundedDay!=null && s.vStart!=null) ERA_GATE.push({ spot:s, spotIdx:idx, groundY:s.y, _visible:null });
});
(function snapshotEraGateSlices(){
  var bPos = buildingsMesh.geometry.attributes.position.array;
  var bCol = buildingsMesh.geometry.attributes.color.array;
  var wPos = windowsMesh.geometry.attributes.position.array;
  ERA_GATE.forEach(function(rec){
    var s = rec.spot;
    rec.basePos = bPos.slice(s.vStart*3, s.vEnd*3);
    rec.baseCol = bCol.slice(s.vStart*3, s.vEnd*3);
    rec.baseWin = (s.wEnd>s.wStart) ? wPos.slice(s.wStart*3, s.wEnd*3) : null;
  });
  console.log("[verify] era-gated landmarks:", ERA_GATE.length, "buildings hidden until their founding date.");
})();
var _egM4 = new THREE.Matrix4(), _egQ = new THREE.Quaternion(), _egV = new THREE.Vector3(), _egS = new THREE.Vector3();
function updateEraGating(){
  if(ERA_GATE.length===0) return;
  var bPos = buildingsMesh.geometry.attributes.position, bCol = buildingsMesh.geometry.attributes.color;
  var wPos = windowsMesh.geometry.attributes.position;
  var touched = false;
  ERA_GATE.forEach(function(rec){
    var s = rec.spot;
    var visible = simDay >= s.foundedDay;
    if(visible===rec._visible) return;
    rec._visible = visible; touched = true;
    var n = s.vEnd - s.vStart, k, i3;
    if(visible){
      bPos.array.set(rec.basePos, s.vStart*3);
      bCol.array.set(rec.baseCol, s.vStart*3);
      if(rec.baseWin) wPos.array.set(rec.baseWin, s.wStart*3);
    } else {
      for(k=0;k<n;k++){
        i3=k*3;
        bPos.array[s.vStart*3+i3]   = rec.basePos[i3];
        bPos.array[s.vStart*3+i3+1] = rec.groundY - 60;
        bPos.array[s.vStart*3+i3+2] = rec.basePos[i3+2];
      }
      if(rec.baseWin){
        var wn = s.wEnd - s.wStart;
        for(k=0;k<wn;k++){
          i3=k*3;
          wPos.array[s.wStart*3+i3]   = rec.baseWin[i3];
          wPos.array[s.wStart*3+i3+1] = rec.groundY - 60;
          wPos.array[s.wStart*3+i3+2] = rec.baseWin[i3+2];
        }
      }
    }
    if(s._signMesh) s._signMesh.visible = visible;
    // s56: gate the contact-shadow decal WITH its building — before this,
    // buildingShadowMesh was baked once for every spot and never touched
    // again, so a not-yet-founded building left a dark orphan blob on
    // empty ground (the user's "shadows with no bodies" P0).
    if(typeof buildingShadowMesh !== "undefined" && buildingShadowMesh){
      _egQ.setFromAxisAngle(_UP, s.rot||0);
      _egV.set(s.x, visible ? s.y+0.04 : s.y-9999, s.z);
      _egS.set((s.w||4)*1.3, 1, (s.d||4)*1.3);
      _egM4.compose(_egV, _egQ, _egS);
      buildingShadowMesh.setMatrixAt(rec.spotIdx, _egM4);
      buildingShadowMesh.instanceMatrix.needsUpdate = true;
    }
  });
  if(touched){ bPos.needsUpdate = true; bCol.needsUpdate = true; wPos.needsUpdate = true; }
}

/* =====================================================================
   FOUNDATION SKIRTS (fix, 2026-07-10): buildings conform to terrain at a
   single center-sampled height point — on sloped ground that leaves a
   visible gap under the downhill edge that reads as the building
   "standing on stilts" at distance. A skirt (a plinth reaching down to
   the lowest footprint corner) fills that gap, same instancing language
   as the fence/woodpile prefabs further down.
   ===================================================================== */
(function buildFoundationSkirts(){
  function lowestCornerY(spot){
    var hw=spot.w/2, hd=spot.d/2, s=Math.sin(spot.rot), c=Math.cos(spot.rot);
    var corners = [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]];
    var minH = Infinity;
    corners.forEach(function(lp){
      var wx = spot.x + lp[0]*c + lp[1]*s, wz = spot.z - lp[0]*s + lp[1]*c;
      var h = terrainHeight(wx,wz);
      if(h<minH) minH = h;
    });
    return minH;
  }
  var unitGeo = new THREE.BoxGeometry(1,1,1).toNonIndexed(); unitGeo.translate(0,0.5,0);
  var mat = new THREE.MeshPhongMaterial({ color:0x574a3a, flatShading:true, specular:0x000000, shininess:0 });
  var recs = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(spot){
    if(spot.foundedDay!=null) return; // s56: no bare plinth standing years before its era-gated building (no rng consumed here)
    var minY = lowestCornerY(spot);
    var gap = spot.y - minY;
    if(gap < 0.35) return; // flat enough — no visible stilt gap
    recs.push({ x:spot.x, z:spot.z, y:minY, rot:spot.rot, w:Math.max(spot.w*0.97,1), d:Math.max(spot.d*0.97,1), h:Math.min(gap+0.15, 6) });
  });
  if(recs.length===0) return;
  var mesh = new THREE.InstancedMesh(unitGeo, mat, recs.length);
  var m4 = new THREE.Matrix4();
  recs.forEach(function(f,i){
    var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), f.rot);
    m4.compose(new THREE.Vector3(f.x,f.y,f.z), q, new THREE.Vector3(f.w,f.h,f.d));
    mesh.setMatrixAt(i,m4);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  console.log("[verify] foundation skirts:", recs.length, "buildings on sloped ground got a plinth.");
})();

/* @P1850-CHUNK 18 — plaza flagpole + flag */
/* =====================================================================
   PLAZA: flagpole + flag
   ===================================================================== */
(function buildFlagpole(){
  var plazaCx = PLAZA_CENTER.x;
  var plazaCz = PLAZA_CENTER.z;
  var y = terrainHeight(plazaCx,plazaCz);

  var pole = makeBoxLocal(0.3, 9, 0.3, new THREE.Color(0x5a4632));
  bake(pole, new THREE.Vector3(plazaCx,y,plazaCz), 0);
  var poleMesh = new THREE.Mesh(pole, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}));
  scene.add(poleMesh);

  // small canvas-generated US flag texture
  var cv = document.createElement("canvas"); cv.width=64; cv.height=40;
  var ctx = cv.getContext("2d");
  for(var s=0;s<13;s++){ ctx.fillStyle = (s%2===0)?"#b22234":"#ffffff"; ctx.fillRect(0, s*(40/13), 64, 40/13+1); }
  ctx.fillStyle = "#3c3b6e"; ctx.fillRect(0,0,26,40*7/13);
  ctx.fillStyle="#ffffff";
  for(var sy=0; sy<4; sy++) for(var sx=0; sx<5; sx++) ctx.fillRect(3+sx*5, 2+sy*4, 1.6,1.6);
  var flagTex = new THREE.CanvasTexture(cv);
  var flagGeo = new THREE.PlaneGeometry(2.6,1.6,4,3);
  var fp = flagGeo.attributes.position;
  for(var i=0;i<fp.count;i++){ // gentle wave bend baked into geometry
    var lx = fp.getX(i);
    fp.setZ(i, Math.sin(lx*1.6)*0.12);
  }
  flagGeo.computeVertexNormals();
  var flagMat = new THREE.MeshPhongMaterial({ map:flagTex, side:THREE.DoubleSide, specular:0x000000, shininess:0 });
  var flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(plazaCx+1.3, y+8.1, plazaCz);
  scene.add(flag);
})();

/* @P1850-CHUNK 21 — outpost hints (Mission Dolores + Presidio) */
/* =====================================================================
   OUTPOST HINTS — tiny building clusters at Mission Dolores + the Presidio
   ===================================================================== */
/* Real-world placements (research/peninsula-1846.md §1, §2, converted to
   world meters via the same lat/lon convention as the baked heightmap):
   Presidio quadrangle/Officers' Club ≈37.7976N,122.4588W (≈4.7km, bearing
   274° from Portsmouth Square); Mission Dolores basilica ≈37.7644N,
   122.4272W (≈3.85km). Verified against the baked grid (both land, 25-33m
   elevation — see tools/debug-region.js) rather than the old procedural
   ring's hand-picked, unverified coordinates. */
/* WORLD-P0 fix (2026-07-09, AUDIT H3/H4 + GAPS item 7): both clusters
 * previously rendered as empty fields — the audit's hypothesis (a
 * height-gate rejecting most/all jittered attempts) turned out to be
 * only half the story: once the shoreline-truth terrain fix above ran,
 * both real-world-sourced centers sample comfortably above the old y<1
 * gate (Mission ~25m, Presidio ~32m). Rebuilt as two dedicated,
 * content-specific builders (not 7/6 identical generic boxes) routed
 * through the shared canPlace() engine, with the documented buildings
 * peninsula-1846.md actually names, plus a handful of catalog-
 * appropriate static figures so neither site reads as an empty stage set.
 */
/* (makeOutpostPersonGeo()/placeOutpostPerson() — the static-figure person
   prefab — relocated to layers/people.js in the 2026-07-12 cleanup: people
   OWNS person geometry. Their chunk keeps this exact global position, so
   the outpost/chapel/wharf builders below still find _outpostSkin ready.) */
function makeOrchardTreeGeo(){
  var trunk = new THREE.CylinderGeometry(0.12,0.16,1.1,5).toNonIndexed();
  trunk.translate(0,0.55,0); colorizeUniform(trunk, new THREE.Color(0x5a4632));
  var canopy = new THREE.SphereGeometry(1.0,6,5).toNonIndexed();
  canopy.translate(0,1.7,0); colorizeUniform(canopy, new THREE.Color(0x5c6e3a));
  return mergeGeoms([trunk,canopy]);
}

(function buildMissionDolores(){
  var o = OUTPOSTS.mission;
  var geoms = [];
  var adobe = new THREE.Color(0xcda86e), adobeDark = new THREE.Color(0xb08a52);
  var roofTile = new THREE.Color(0x7a4a34);
  var hutColor = new THREE.Color(0xb99a6e), hutRoof = new THREE.Color(0x8c7a52);

  // (1) THE CHURCH — 114x22 ft = 34.7m x 6.7m, 4ft-thick adobe walls, ~21ft
  // (6.4m) to the ceiling; still standing unchanged since 1791
  // (peninsula-1846.md §2.1). True scale — the era's best-documented
  // standing building, deliberately NOT inflated.
  var churchW=34.7, churchD=6.7, churchH=6.4, churchRot=0.2;
  var churchX=o.x, churchZ=o.z, churchY=terrainHeight(churchX,churchZ);
  registerPlacement(churchX, churchZ, Math.hypot(churchW,churchD)/2);
  registerWalkRect(churchX, churchZ, churchRot, churchW/2, churchD/2); // s59: walkers route around the church, not through it
  var churchBody = makeBoxLocal(churchW,churchH,churchD,adobe);
  bake(churchBody, new THREE.Vector3(churchX,churchY,churchZ), churchRot);
  geoms.push(churchBody);
  var churchRoof = makeGableRoof(churchW,churchD,0.7,2.6,roofTile);
  bake(churchRoof, new THREE.Vector3(churchX,churchY+churchH,churchZ), churchRot);
  geoms.push(churchRoof);
  var belfry = makeBoxLocal(2.2,3.0,1.0,adobeDark);
  var belfryPos = new THREE.Vector3(-churchW*0.4,0,0);
  belfryPos.applyAxisAngle(new THREE.Vector3(0,1,0), churchRot);
  bake(belfry, new THREE.Vector3(churchX+belfryPos.x, churchY+churchH, churchZ+belfryPos.z), churchRot);
  geoms.push(belfry);

  // (2) CEMETERY — immediately adjacent to the church, "facing the
  // garden" (peninsula-1846.md §2.5): a small fenced plot of grave
  // markers on the church's south flank.
  (function(){
    var offs = new THREE.Vector3(0,0, churchD*1.6+8);
    offs.applyAxisAngle(new THREE.Vector3(0,1,0), churchRot);
    var cx=churchX+offs.x, cz=churchZ+offs.z;
    for(var i=0;i<9;i++){
      var mx=cx+(rngBuild()-0.5)*16, mz=cz+(rngBuild()-0.5)*10, my=terrainHeight(mx,mz);
      if(my<=1) continue;
      var marker = makeBoxLocal(0.26,0.5+rngBuild()*0.35,0.1, new THREE.Color(0x8f8a78));
      bake(marker, new THREE.Vector3(mx,my,mz), rngBuild()*Math.PI);
      geoms.push(marker);
    }
  })();

  // (3) CALIFORNIO ADOBES — Bernal, de Haro, Guerrero, Valencia families,
  // living in adobes at Dolores (peninsula-1846.md §2.2). Small
  // residential scale, ringed around the church/cemetery core.
  ["Bernal","de Haro","Guerrero","Valencia"].forEach(function(name,i){
    var ang = (i/4)*Math.PI*2 + 0.9, dist = 60+rngBuild()*35;
    var x = churchX+Math.cos(ang)*dist, z = churchZ+Math.sin(ang)*dist;
    if(!canPlace(x,z,7,{streetMargin:2})) return;
    var y = terrainHeight(x,z);
    // s56 BUILDING-YAW AUDIT: the Californio adobes ringing the Mission
    // read as full buildings, and rngBuild()*π gave them arbitrary ~45°+
    // yaws unrelated to anything. The historical cluster loosely followed
    // the Mission complex's own alignment — so they square to churchRot
    // with a generous hand-built jitter (±~20°). One draw either way.
    var w=6.5+rngBuild()*2.5, d=5.5+rngBuild()*2, h=3+rngBuild(), rot=churchRot+(rngBuild()-0.5)*0.7;
    registerPlacement(x,z,Math.hypot(w,d)/2);
    registerWalkRect(x,z,rot,w/2,d/2); // s59 walkability
    var body = makeBoxLocal(w,h,d, adobe.clone().lerp(adobeDark, rngBuild()*0.5));
    bake(body, new THREE.Vector3(x,y,z), rot);
    geoms.push(body);
    var roofG = makeGableRoof(w,d,0.5,1.1+rngBuild()*0.5,roofTile);
    bake(roofG, new THREE.Vector3(x,y+h,z), rot);
    geoms.push(roofG);
    placeOutpostPerson(geoms, x+w*0.7, z, rngBuild()*Math.PI*2, 0x3a332c, 0xcabf98, i%2===0);
  });

  // (4) THE RANCHERIA — the former Indian rancheria at Mission Dolores,
  // "occupied by remaining Indians" through 1835-1848, physically distinct
  // from the Californio-occupied quadrangle (SF Planning archaeologist's
  // memo quoted in peninsula-1846.md §2.1; clm:pen:24, clm:pen:32).
  // NATIVE PRESENCE sprint (s50, native-presence-1846-49.md): rebuilt at
  // ~5-family-dwellings scale (NPS/Milliken: "by 1850, only about five
  // Ramaytush families remained" — clm:native:2; ~15 descendants by 1842,
  // clm:pen:31). The original rancheria was rows of mission-built cabins
  // (1793-1806, "~8 rows/100 cabins"), long since shrunk to this remnant —
  // depicted as 3 low adobe-hint row cabins + 2 tule-hint dome shelters,
  // TRUE modest scale (~3.5x2.8m cabins), no invented village sprawl and
  // NO generic tribal iconography (research §6 DON'T). Positions are
  // DETERMINISTIC and exported via RANCHERIA_SITE so the people system
  // homes its (live, inspectable) inhabitants at these exact dwellings —
  // the old baked statue is gone. Structures render only through 1848
  // (clm:pen:32's zone window — separate mesh, gated in
  // updateDistrictZones); the placement bearing off the church is a
  // judgment (the memo says "distinct zone", not a bearing) — flagged as
  // such per QA-GATE rule 1.
  (function(){
    var ang = 4.0, dist = 130;
    var rx = churchX+Math.cos(ang)*dist, rz = churchZ+Math.sin(ang)*dist;
    var rGeoms = [];
    var tule = new THREE.Color(0xa9905d); // dry-reed tone, distinct from adobe
    var dwellings = [];
    // two loose "rows" (the record's own word for the layout), 5 dwellings
    var offs = [ [-9,-4], [0,-5.5], [9,-4], [-4.5,5.5], [5,6.5] ];
    for(var i=0;i<offs.length;i++){
      var x = rx+offs[i][0], z = rz+offs[i][1];
      var y = terrainHeight(x,z);
      registerPlacement(x,z,3);
      if(i<3) registerWalkRect(x,z, ((i*0.83)%0.24)-0.12, 1.9, 1.4); else registerWalkCircle(x,z,1.8); // s59: cabins as rects, tule domes as circles
      // s56 BUILDING-YAW AUDIT: the record's own word for the layout is
      // "rows" — cabins in a row share a facing. The old (i*0.83)%π gave
      // each dwelling an unrelated ~47°-stepped yaw that broke the row
      // read entirely. Row-aligned (the offs rows run along world X, so
      // base yaw 0) with a small deterministic hand-built wobble (±~7°).
      var rot = ((i*0.83)%0.24)-0.12;
      if(i<3){ // adobe-hint row cabin
        var w=3.2+((i*7)%10)*0.06, d=2.7, h=1.9;
        var hut = makeBoxLocal(w,h,d, hutColor);
        bake(hut, new THREE.Vector3(x,y,z), rot);
        rGeoms.push(hut);
        var hutRoofG = makeGableRoof(w,d,0.3,0.8,hutRoof);
        bake(hutRoofG, new THREE.Vector3(x,y+h,z), rot);
        rGeoms.push(hutRoofG);
      } else { // tule-hint dome shelter (low reed dome, no invented decoration)
        var dome = new THREE.SphereGeometry(1.7,8,5,0,Math.PI*2,0,Math.PI*0.52).toNonIndexed();
        dome.scale(1,0.82,1);
        colorizeUniform(dome, tule);
        bake(dome, new THREE.Vector3(x,y,z), rot);
        rGeoms.push(dome);
      }
      dwellings.push({x:x, z:z});
    }
    // a shared fire ring + drying frame — evidence of daily use (QA-GATE
    // rule 7), not costume props
    var ringY = terrainHeight(rx,rz+0.5);
    var ring = new THREE.CylinderGeometry(0.55,0.6,0.22,8).toNonIndexed();
    colorizeUniform(ring, new THREE.Color(0x4a4038));
    bake(ring, new THREE.Vector3(rx,ringY,rz+0.5), 0);
    rGeoms.push(ring);
    var frameY = terrainHeight(rx+4,rz+2);
    var rail = new THREE.BoxGeometry(2.4,0.08,0.08).toNonIndexed();
    rail.translate(0,1.25,0); colorizeUniform(rail, new THREE.Color(0x6b5a40));
    var legA = new THREE.CylinderGeometry(0.05,0.06,1.25,5).toNonIndexed(); legA.translate(-1.1,0.62,0); colorizeUniform(legA, new THREE.Color(0x6b5a40));
    var legB = new THREE.CylinderGeometry(0.05,0.06,1.25,5).toNonIndexed(); legB.translate(1.1,0.62,0); colorizeUniform(legB, new THREE.Color(0x6b5a40));
    var frame = mergeGeoms([rail,legA,legB]);
    bake(frame, new THREE.Vector3(rx+4,frameY,rz+2), 0.5);
    rGeoms.push(frame);
    window.RANCHERIA_SITE = { cx:rx, cz:rz, dwellings:dwellings };
    var rMesh = new THREE.Mesh(mergeGeoms(rGeoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}));
    scene.add(rMesh);
    window.RANCHERIA_MESH = rMesh; // era-gated (through 1848) in updateDistrictZones
  })();

  // (5) THE ORCHARD — west of the mission complex, separated from it by
  // El Camino Real (peninsula-1846.md §2.5): a loose orchard grid.
  (function(){
    var treeGeo = makeOrchardTreeGeo();
    var samples = [];
    var ox = churchX-160, oz = churchZ;
    for(var row=0; row<5; row++){
      for(var col=0; col<6; col++){
        var x = ox+(row-2)*14+(rngBuild()-0.5)*4, z = oz+(col-2.5)*13+(rngBuild()-0.5)*4;
        var y = terrainHeight(x,z);
        if(y<=1) continue;
        samples.push({x:x,z:z,h:y});
      }
    }
    var orchardMesh = buildScatterMesh(treeGeo, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), samples, {minScale:0.8,maxScale:1.2});
    scene.add(orchardMesh);
  })();

  var m = new THREE.Mesh(mergeGeoms(geoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}));
  scene.add(m);
  console.log("[verify] Mission Dolores: "+geoms.length+" parts merged, church at ("+churchX.toFixed(0)+","+churchZ.toFixed(0)+") y="+churchY.toFixed(1)+" size="+churchW+"x"+churchD+"x"+churchH);
})();

(function buildPresidio(){
  var o = OUTPOSTS.presidio;
  var geoms = [];
  var wall = new THREE.Color(0xcabb95), wallRuin = new THREE.Color(0xa89670);
  var roof = new THREE.Color(0x7a5238);
  var cx=o.x, cz=o.z, cy=terrainHeight(cx,cz);
  registerPlacement(cx,cz,95);

  // (1) THE ADOBE QUADRANGLE — ~200 yards (183m) per side, adobe
  // perimeter wall ~4 yards (3.66m) high, dilapidated: barracks "fallen
  // into ruins," walls "badly dilapidated," leaky roofs (peninsula-
  // 1846.md §1.1). Built as a wall OUTLINE (not a solid block) with
  // randomized gaps/height loss so it silhouettes as a ruin, not a fort.
  var half = 183/2;
  var corners = [[-half,-half],[half,-half],[half,half],[-half,half]];
  for(var side=0; side<4; side++){
    var a = corners[side], b = corners[(side+1)%4];
    var segCount = 10;
    for(var s=0; s<segCount; s++){
      var t0=s/segCount, t1=(s+1)/segCount;
      var lx0=a[0]+(b[0]-a[0])*t0, lz0=a[1]+(b[1]-a[1])*t0;
      var lx1=a[0]+(b[0]-a[0])*t1, lz1=a[1]+(b[1]-a[1])*t1;
      if(rngBuild()<0.22) continue; // gap — collapsed section
      var mx=cx+(lx0+lx1)/2, mz=cz+(lz0+lz1)/2, my=terrainHeight(mx,mz);
      if(my<=1) continue;
      registerWalkSeg(cx+lx0, cz+lz0, cx+lx1, cz+lz1); // s59: quadrangle wall blocks walkers (gaps stay passable)
      var segLen = Math.hypot(lx1-lx0, lz1-lz0);
      var yaw = Math.atan2(lx1-lx0, lz1-lz0);
      var hgt = 1.2+rngBuild()*2.4; // ruined -> a couple of intact yards
      var seg = makeBoxLocal(segLen*1.02, hgt, 0.9, rngBuild()<0.5?wall:wallRuin);
      var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
      seg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
      bake(seg, new THREE.Vector3(mx,my,mz), 0);
      geoms.push(seg);
    }
  }

  // (2) INTERIOR STRUCTURES — chapel, storehouses, commandant/officers'
  // quarters, a guardhouse at the entrance (peninsula-1846.md §1.1) —
  // roofed (some "adapted to new uses" per era pattern), smaller and less
  // ruined than the perimeter wall since these were still occupied.
  var interiors = [
    { u:0,   v:-half*0.55, w:14, d:9,  h:4.2, name:"chapel" },
    { u:-40, v:-half*0.4,  w:18, d:8,  h:3.6, name:"storehouse" },
    { u:35,  v:-half*0.3,  w:16, d:8,  h:3.8, name:"officers' quarters" },
    { u:0,   v:half*0.85,  w:8,  d:6,  h:3.0, name:"guardhouse" }
  ];
  interiors.forEach(function(bldg){
    // interior of the quadrangle's own already-registered footprint — no
    // canPlace() overlap check here (it would trivially fail against the
    // wall-circle registration just above); still gated on slope/height.
    var x=cx+bldg.u, z=cz+bldg.v;
    var y=terrainHeight(x,z);
    if(y<=1 || terrainSlopeDeg(x,z)>20) return;
    registerPlacement(x,z,Math.hypot(bldg.w,bldg.d)/2);
    var rot = rngBuild()*0.3;
    registerWalkRect(x,z,rot,bldg.w/2,bldg.d/2); // s59 walkability
    var body = makeBoxLocal(bldg.w,bldg.h,bldg.d, wall.clone().lerp(wallRuin,0.3));
    bake(body, new THREE.Vector3(x,y,z), rot);
    geoms.push(body);
    var roofG = makeGableRoof(bldg.w,bldg.d,0.5,1.0+rngBuild()*0.6, roof);
    bake(roofG, new THREE.Vector3(x,y+bldg.h,z), rot);
    geoms.push(roofG);
  });

  // (3) SKELETON GARRISON — "inhabited by only a sub-lieutenant and 5
  // soldiers-rancheros with their families" (Mofras 1841, bracketed to
  // 1846 per the research file) — a few static figures near the
  // guardhouse/quarters, not a full company.
  placeOutpostPerson(geoms, cx+2, cz+half*0.8, Math.PI, 0x2c2a28, 0x1e1c1a, false);
  placeOutpostPerson(geoms, cx-6, cz+half*0.75, Math.PI*0.8, 0x36402e, 0x262c1e, false);
  placeOutpostPerson(geoms, cx-38, cz-half*0.35, 0, 0x3a332c, 0xcabf98, true);

  var m = new THREE.Mesh(mergeGeoms(geoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}));
  scene.add(m);
  console.log("[verify] Presidio: "+geoms.length+" parts merged, quadrangle center ("+cx.toFixed(0)+","+cz.toFixed(0)+") y="+cy.toFixed(1));
})();

/* @P1850-CHUNK 23 — town chapel */
/* =====================================================================
   TOWN CHAPEL — behavior-spec.md item 3 ("a modest church building...
   simple frame chapel"); closes catalog-occupations.json's
   missing:church_building gap for protestant_minister. Rev. Timothy
   Dwight Hunt (arrived from Hawaii Oct 29 1848) held the city's first
   Protestant services as a nondenominational City Chaplain from Nov 2
   1848 (research/demographics-society.md "Other" ministries note); First
   Congregational Church organized July 1849. A 1847 proposal to build a
   church was tabled (data/events.jsonl 1847-10-06, "Proposal to build
   church tabled") — so the chapel is gated to Hunt's first-service date,
   never appearing before it, honoring the never-contradict rule. Distinct
   from Mission Dolores's Catholic adobe church (buildMissionDolores,
   already standing since the mission era) — this is the town's own small
   nondenominational/Protestant meeting house. "The Chapel" is a generic
   period-plausible label, not an asserted historical proper name (no
   documented building name survives for it). (Placed here, after
   eventDateToSimDay/SIM_START_MS are defined, rather than up with the
   other early village buildings — CHURCH_REVEAL_DAY needs the sim clock.)
   ===================================================================== */
var CHURCH_REVEAL_DAY = eventDateToSimDay("1848-11-02");
var CHURCH_SPOT = null;
(function buildTownChapel(){
  var base = gridToWorld(GEO.streetsU.stockton-55, GEO.streetsV.jackson-30);
  var x=base.x, z=base.z, footprintR=8, found=false, fallback=null;
  // s72 (#51): the chapel FRONTS a street too (P4 full strength — it was the
  // last authored mid-block setback offense at 30.7m). Among the seeded search
  // tries, accept the first canPlace-valid spot whose door lands ≤22m from the
  // street edge; keep the first valid spot as a fallback. rot is fixed below
  // (-GRID_ROT_BASE); its +z door is what the addressed audit measures.
  var _chRot = -GRID_ROT_BASE, _chFd = 5.6*0.5+0.3;
  function chapelDoorStreetDist(tx,tz){
    var dx=tx+Math.sin(_chRot)*_chFd, dz=tz+Math.cos(_chRot)*_chFd, best=1e9;
    for(var s=0;s<PLACEMENT_STREET_SEGS.length;s++){ var g=PLACEMENT_STREET_SEGS[s];
      var d=distToSegXZ(dx,dz,g.x0,g.z0,g.x1,g.z1)-g.halfW; if(d<best) best=d; }
    return best;
  }
  for(var tries=0; tries<50 && !found; tries++){
    var tx = base.x + (rngBuild()-0.5)*110, tz = base.z + (rngBuild()-0.5)*110;
    if(canPlace(tx,tz,footprintR,{streetMargin:4})){
      if(fallback==null) fallback={x:tx,z:tz};
      if(chapelDoorStreetDist(tx,tz)<=22){ x=tx; z=tz; found=true; }
    }
  }
  if(!found && fallback){ x=fallback.x; z=fallback.z; }
  var y = terrainHeight(x,z);
  registerPlacement(x,z,footprintR);
  // s76 §1.6: the chapel faces its street via the single orientation source too
  // (its label is generic/undocumented, so no authored orientation to honor) —
  // the fixed -GRID_ROT_BASE turned its +z door away from the nearest street at
  // this lot (the last orientation-audit residual).
  var rot = yawFacingStreet(x,z);
  var wall = new THREE.Color(0xe4dcc0), roof = new THREE.Color(0x5a4432), trim = new THREE.Color(0x3a3226);
  var w=8.5, d=5.6, h=3.4;
  var geoms = [];
  geoms.push(makeBoxLocal(w,h,d,wall));
  var roofG = makeGableRoof(w,d,0.5,2.2,roof); bake(roofG, new THREE.Vector3(0,h,0)); geoms.push(roofG);
  var steeple = makeBoxLocal(1.3,2.0,1.3,wall); bake(steeple, new THREE.Vector3(0,h+2.2,0)); geoms.push(steeple);
  var steepleRoof = makeGableRoof(1.3,1.3,0.1,1.1,roof); bake(steepleRoof, new THREE.Vector3(0,h+4.2,0)); geoms.push(steepleRoof);
  var crossV = makeBoxLocal(0.14,1.0,0.14,trim); bake(crossV, new THREE.Vector3(0,h+5.3,0)); geoms.push(crossV);
  var crossH = makeBoxLocal(0.6,0.14,0.14,trim); bake(crossH, new THREE.Vector3(0,h+5.6,0)); geoms.push(crossH);
  var door = makeBoxLocal(1.0,1.9,0.08,trim); bake(door, new THREE.Vector3(0,0.95,d/2+0.02)); geoms.push(door);
  var merged = mergeGeoms(geoms);
  bake(merged, new THREE.Vector3(x,y,z), rot);
  var mesh = new THREE.Mesh(merged, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}));
  mesh.visible = false; // gated on CHURCH_REVEAL_DAY, toggled each frame alongside the wharf-landing mesh
  scene.add(mesh);
  window._townChapelMesh = mesh;
  // s56: foundedDay added so the chapel is treated as era-gated everywhere
  // spots are consumed (labels, yard adjuncts, its contact shadow below) —
  // its own mesh visibility toggle in updateWharfGrowth() is unchanged.
  CHURCH_SPOT = { x:x, z:z, y:y, rot:rot, w:w, d:d, h:h, name:"The Chapel", foundedDay:CHURCH_REVEAL_DAY };
  VILLAGE_BUILDING_SPOTS.push(CHURCH_SPOT); // no vStart/vEnd — the fire system already guards s.vStart==null; gets label/inspector/sign treatment like any named spot
  window._chapelShadowIdx = VILLAGE_BUILDING_SPOTS.length-1; // its instance id in buildingShadowMesh (s56 shadow gating)
  console.log("[verify] Town chapel at ("+x.toFixed(0)+","+z.toFixed(0)+"), reveal day "+CHURCH_REVEAL_DAY.toFixed(0)+" (1848-11-02)");
})();

/* Named-spot subset of the founding village (moved from labels-inspect.js in
   the 2026-07-12 cleanup — derived buildings data consumed by the landmark
   signage below and people's City Hotel binding). Sits after the chapel push
   above, so it captures the identical, final named set the old position saw
   (VILLAGE_BUILDING_SPOTS receives no pushes after the chapel's). */
var NAMED_BUILDING_SPOTS = VILLAGE_BUILDING_SPOTS.filter(function(s){ return !!s.name; });

/* @P1850-CHUNK 31 — growth targets, growth building/tent spawning, blocks->frontage */
// P0-4 DENSITY fix (2026-07-10, Director's screening): the pre-fix curve
// froze buildings entirely at pop>2200 (~late 1848) — everany 1849 growth
// read as tents ONLY, so the record's "hundreds of structures spilling past
// the grid" (real 1849 SF: signed shops, hotels, gambling houses, a
// chapel — see cast/economy research) never rendered; Sept 1849 capped out
// at ~169 growth buildings (+~30 founding = ~199 total) regardless of the
// town's real size. Documented anchors calibrated against: 1846-07 baseline
// ~50 buildings, 1847-04-01 79 structures (22 shanties/31 frame/26 adobes),
// 1847-09 ~157 total (~78 new since April), 1848-03 ~200 buildings
// (school-trustee census) — all timeline-spine.md. No source gives an exact
// town-wide tally for Sept/Dec 1849 (the record jumps straight to fire-loss
// figures), so late-1849 is an explicit INTERPOLATION: the 1850-05-04 and
// 1850-06-14 fires each destroyed 150-300+ buildings in a PARTIAL district
// without leveling the town, implying total stock was already in the
// several-hundred range by early 1850 — so Sept 1849 ~500-600 total
// structures and Dec 1849 ~700-750 total (both founding+fire-block+growth)
// is a reasoned mid-point, not a hard count (flagged in the build report).
function growthTargets(pop){
  var basePop = DENSITY_CURVE[0].pop;
  var housedPop = Math.min(Math.max(0, pop-basePop), 2200);          // pre-1849 growth reads as houses
  var surgePop = Math.max(0, pop-2200);         // 1849 surge: mostly tents, but NOT exclusively —
                                                 // real construction (signage, hotels, chapel) continued
                                                 // alongside the tent camps, so a slower-but-nonzero
                                                 // building rate keeps pace with it (BUILDING_SURGE_DIV).
  var tentPop = surgePop;
  return {
    buildings: Math.min(Math.round(housedPop/13 + surgePop/BUILDING_SURGE_DIV), BUILDING_CAP),
    tents: Math.min(Math.round(tentPop/7), 1450)
  };
}
var BUILDING_SURGE_DIV = 45, BUILDING_CAP = 650;
var RAISE_DAYS = 7; // "a small raising animation (scale-in over a sim-week)"

/* P0-1 TIME-JUMP fix (2026-07-10, Director's screening): growReveal()/
   growRevealStaged() stamp each newly-caught-up entry's spawnDay at the
   moment they're first pushed into the `spawned` array. That's correct
   while the sim runs continuously (spawned.length only ever trails
   targetCount by a sliver of a day), but a PAUSED time-jump (URL &d=,
   notch click, [ / ], __P1850.jump) can push simDay forward by months in
   one frame — growReveal's while-loop instantly catches `spawned.length`
   up to the new targetCount (that part already works: __P1850.tents
   reports the right count immediately), but every entry added in that
   single catch-up gets spawnDay=simDay (i.e. "built RIGHT NOW"), so its
   RAISE_DAYS/CONSTRUCTION_DAYS scale-in animation starts from age=0 and,
   since the sim is paused, never advances — every tent/building that
   should already have stood for weeks renders at ~5% scale (effectively
   invisible) until the user unpauses and lets real simDay catch the
   animation up. FIX: these systems are counter-based/seeded precisely so
   "the day this candidate #i should first exist" is directly computable
   (invert growthTargets() against the same curve it's driven by — now
   DENSITY_CURVE, see the P0 population/density decoupling fix above) —
   backdate spawnDay to that computed reveal day instead of "now", so a
   paused jump shows already-standing stock at full scale on the very next
   frame, with no frame-stepping/replay. */
function dayForTentIndex(i){
  return dayForDensityAtLeast(2200 + (i+1)*7);
}
function dayForBuildingIndex(i){
  var n = i+1, housedCapCount = Math.floor(2200/13); // buildings obtainable from the housed-pop term alone
  if(n<=housedCapCount) return dayForDensityAtLeast(DENSITY_CURVE[0].pop + n*13);
  return dayForDensityAtLeast(2200 + (n-housedCapCount)*BUILDING_SURGE_DIV);
}

/* =====================================================================
   BLOCKS -> FRONTAGE (grounding.md §9 "Buildings belong to blocks",
   2026-07-10 street-checkpoint reset, bullet 5): meta.blocks.cardinal's
   ofarrell-1847 uLines x vLines grid — the dataset's own documented block
   subdivision — used to bias growth-building candidates onto block edges,
   facing the street, instead of scattering anywhere inside a block. Corner
   lots and main-street (N-S) frontages get double weight ("street-wall
   bias toward corners/main streets" per the brief). The Plaza's own block
   is excluded (found by matching line positions rather than a hardcoded
   index, so it stays correct if the dataset's grid ever changes). */
var GROWTH_BLOCKS = (function(){
  var era = SG.meta.blocks.cardinal.filter(function(b){ return b.era==="ofarrell-1847"; })[0];
  var uLines = era.uLines, vLines = era.vLines;
  function findLine(lines, val){ for(var i=0;i<lines.length;i++) if(Math.abs(lines[i]-val)<0.5) return i; return -1; }
  var plazaBX = findLine(uLines, Math.min(GEO.streetsU.dupont, GEO.streetsU.kearny));
  var plazaBZ = findLine(vLines, Math.min(GEO.streetsV.washington, GEO.streetsV.clay));
  var list = [];
  for(var bx=0; bx<uLines.length-1; bx++){
    for(var bz=0; bz<vLines.length-1; bz++){
      if(bx===plazaBX && bz===plazaBZ) continue; // Portsmouth Square — kept open, matches buildVillage()'s own exclusion
      list.push({ u0:uLines[bx], u1:uLines[bx+1], v0:vLines[bz], v1:vLines[bz+1] });
    }
  }
  return list;
})();
/* One frontage-biased (u,v,rot) candidate: pick a random block, then a
   random edge of it (main-street N-S edges double-weighted), a period
   setback inward from that edge, and a position along it (corner-biased
   ~35% of the time) — "face it, period setback, street-wall bias toward
   corners/main streets" (brief bullet 5), replacing pure scatter. */
function pickFrontageSpot(){
  var blk = GROWTH_BLOCKS[Math.floor(rngBuild()*GROWTH_BLOCKS.length)];
  var edges = [ {kind:"v0",w:1}, {kind:"v1",w:1}, {kind:"u0",w:2}, {kind:"u1",w:2} ];
  var totalW = 6, r = rngBuild()*totalW, edge = edges[edges.length-1];
  for(var i=0;i<edges.length;i++){ if(r<edges[i].w){ edge=edges[i]; break; } r-=edges[i].w; }
  // BOTH insets have to clear canPlace's street-proximity check, not just
  // look like a plausible yard depth — the chosen edge is a STREET
  // CENTERLINE (these are the same uLines/vLines the streets themselves
  // are drawn on), and the perpendicular block edges the along-axis lerp
  // approaches at its extremes (corner lots) are ALSO street centerlines.
  // The widest street on any cardinal-grid edge is California St (25.91m,
  // half 12.96m); canPlace additionally wants footprintR(4)+streetMargin(2)
  // beyond that. A too-small inset here (an earlier pass used 3-8m) means
  // canPlace silently rejects nearly every frontage candidate, collapsing
  // the whole growth-building candidate pool (caught live: 1500 attempts
  // -> 163 accepted instead of the expected ~650 — verify pixels/counts,
  // not just "the code runs", per QA-GATE's own standing lesson).
  var edgeSetback = 18+rngBuild()*12;  // 18-30m in from the fronted edge
  var cornerInset = 14+rngBuild()*8;   // 14-22m in from the block's other two edges
  var alongT = rngBuild();
  if(rngBuild()<0.35) alongT = alongT<0.5 ? alongT*0.3 : 1-(1-alongT)*0.3; // corner bias
  var u,v,rot;
  if(edge.kind==="v0"||edge.kind==="v1"){
    u = lerp(blk.u0+cornerInset, blk.u1-cornerInset, alongT);
    v = edge.kind==="v0" ? blk.v0+edgeSetback : blk.v1-edgeSetback;
    rot = 0;
  } else {
    v = lerp(blk.v0+cornerInset, blk.v1-cornerInset, alongT);
    u = edge.kind==="u0" ? blk.u0+edgeSetback : blk.u1-edgeSetback;
    rot = Math.PI/2;
  }
  return { u:u, v:v, rot:rot };
}

/* candidate lots for growth buildings: same grid the Phase 1 village used,
   spilling a little past its surveyed edge (town filling out) since new
   streets are this brief's explicitly optional/skippable stretch goal.
   FRONTAGE fix (2026-07-10): 80% of attempts now propose a block-edge
   frontage spot (pickFrontageSpot(), above) instead of pure uniform
   scatter across the whole padded box — same total attempt count and
   acceptance pipeline as before (canPlace/registerPlacement/sort/reveal),
   so accepted COUNTS are unaffected (growth-density calibration, commit
   569012f, is untouched), only WHERE each candidate lands within its
   block. The remaining 20% keep the old free scatter, preserving the
   "ragged expansion... spilling past the surveyed grid" character for
   growth beyond the platted blocks (frontage discipline only applies to
   platted ground — grounding.md §9). */
/* FRONTAGE LAW (road-master-spec §5, s27): nearest-master-line lookup in
   grid (u,v) space over the full STREETS_RUNTIME polylines — used to make
   the 20% free-scatter candidates FACE the street they stand beside
   (orientation parallel to the line) instead of a coin-flip axis, so
   street walls read along worn streets. Encampments/tents stay loose. */
function nearestStreetDirUV(u,v){
  var best = { d2:1e18, du:1, dv:0 };
  for(var si=0; si<STREETS_RUNTIME.length; si++){
    var poly = STREETS_RUNTIME[si].polyline;
    for(var i=0;i<poly.length-1;i++){
      var ax=poly[i].u, az=poly[i].v, bx=poly[i+1].u, bz=poly[i+1].v;
      var dx=bx-ax, dz=bz-az, l2=dx*dx+dz*dz;
      if(l2<1e-9) continue;
      var t = clamp(((u-ax)*dx+(v-az)*dz)/l2, 0, 1);
      var qx=ax+dx*t-u, qz=az+dz*t-v, d2=qx*qx+qz*qz;
      if(d2<best.d2){ var l=Math.sqrt(l2); best={ d2:d2, du:dx/l, dv:dz/l }; }
    }
  }
  return { dist:Math.sqrt(best.d2), rot:Math.atan2(best.dv, best.du) };
}
/* s72 (#51) FRONTAGE-ROW LOT SYSTEM — the flagship. Growth stock no longer
   rejection-scatters across a padded box (which produced the pool-limited,
   never-assembling ~398 candidates and the mid-block orphan read). Instead we
   DERIVE LOTS deterministically from the master street network: every block
   EDGE (a street centerline in the ofarrell-1847 cardinal grid) is subdivided
   into lots of a class-dependent frontage width — narrow commercial lots on the
   plaza ring + main-street frontages, wider residential lots elsewhere — and
   one building drops into each lot, fronting its street at a CONSTANT-WIDTH
   setback (P4 full strength: no addressed structure spawns mid-block). In the
   1849 commercial core, adjacent commercial lots run PARTY-WALL (buildings fill
   their lot, abut at shared edges, same yaw) so the downtown assembles into
   CONTINUOUS street-fronted rows — the classic-RS town read the campaign audit
   (D4: "the town does not assemble") calls for.
   DETERMINISM: the whole layout is a pure function of seed+street data (hash1
   per lot, no rngBuild() draw), so reload→identical and no downstream stream
   perturbation from WITHIN this generator. Candidate objects keep {x,z,rot}
   (consumed by routing/roads/audits/people) and add {buildW,kind,ironEligible}. */
var growthBuildingCandidates = (function(){
  var era = SG.meta.blocks.cardinal.filter(function(b){ return b.era==="ofarrell-1847"; })[0];
  var uLines=era.uLines, vLines=era.vLines;
  function findLine(lines,val){ for(var i=0;i<lines.length;i++) if(Math.abs(lines[i]-val)<0.5) return i; return -1; }
  var plazaBX = findLine(uLines, Math.min(GEO.streetsU.dupont, GEO.streetsU.kearny));
  var plazaBZ = findLine(vLines, Math.min(GEO.streetsV.washington, GEO.streetsV.clay));
  var fireNV=Math.min(GEO.streetsV.clay,GEO.streetsV.washington), fireSV=Math.max(GEO.streetsV.clay,GEO.streetsV.washington);
  var kearnyU=GEO.streetsU.kearny, montU=GEO.streetsU.montgomery;
  // constant class half-width of the documented street on a given grid line
  function edgeHalfWidth(isU, coord){
    for(var s=0;s<STREETS_RUNTIME.length;s++){ var st=STREETS_RUNTIME[s], poly=st.polyline;
      for(var i=0;i<poly.length;i++){ var c = isU?poly[i].u:poly[i].v;
        if(Math.abs(c-coord)<1.2) return st.widthM/2; } }
    return isU ? 10.48 : 7.49; // main / cross class default (68.75ft / 49.125ft)
  }
  var out=[], lotKey=0;
  for(var bxi=0; bxi<uLines.length-1; bxi++){
    for(var bzi=0; bzi<vLines.length-1; bzi++){
      if(bxi===plazaBX && bzi===plazaBZ) continue; // Portsmouth Square — kept open
      var u0=uLines[bxi], u1=uLines[bxi+1], v0=vLines[bzi], v1=vLines[bzi+1];
      var dRing = Math.abs(bxi-plazaBX)+Math.abs(bzi-plazaBZ);
      var isCoreBlock = dRing<=2;
      var edges=[
        {isU:true,  coord:u0, sign:+1, rot:Math.PI/2, main:true },  // west edge (N-S street), builds east
        {isU:true,  coord:u1, sign:-1, rot:Math.PI/2, main:true },  // east edge, builds west
        {isU:false, coord:v0, sign:+1, rot:0,         main:false }, // north edge (E-W street), builds south
        {isU:false, coord:v1, sign:-1, rot:0,         main:false }  // south edge, builds north
      ];
      edges.forEach(function(e, ei){
        var edgeKey = bxi+"_"+bzi+"_"+ei;
        var halfW = edgeHalfWidth(e.isU, e.coord);
        // commercial party-wall on the plaza ring & main-street frontages of the core
        var commercial = isCoreBlock && (e.main || dRing<=1);
        var frontW = commercial ? 6.4 : 15.5;      // lot frontage width
        var depth  = commercial ? 5.2 : 4.4;       // building depth
        var setback = commercial ? (halfW + depth*0.5 + 3.0) : (halfW + 9.0); // constant-width, door clears ROW
        var lo = e.isU ? v0 : u0, hi = e.isU ? v1 : u1;
        var cornerHalf = edgeHalfWidth(!e.isU, e.isU ? v0 : u0);
        // s76: commercial party-wall rows keep further off the corner — post-unlock
        // a full-width end lot on this edge would otherwise wrap into the
        // perpendicular edge's end lot at the block corner (the corner-overlap
        // footprintsOBB caught). A wider corner gap also reads period-true (open
        // corners / a single corner building, not two rows fused at 90°).
        var cm = cornerHalf + (commercial ? 9 : 3);
        var spanLo = lo+cm, spanHi = hi-cm, span = spanHi-spanLo;
        if(span < frontW*0.8) return;
        var nLots = Math.max(1, Math.floor(span/frontW));
        var step = span/nLots;
        for(var li=0; li<nLots; li++){
          lotKey++;
          var along = spanLo + (li+0.5)*step;
          var perp  = e.coord + e.sign*setback;
          var jperp = (hash1(lotKey*2.13)-0.5)*(commercial?0.5:3.0);
          var jalong= (hash1(lotKey*5.71)-0.5)*(commercial?0.24:2.0);
          var u,v;
          if(e.isU){ u=perp+jperp; v=along+jalong; } else { v=perp+jperp; u=along+jalong; }
          var p = gridToWorldAt(u,v,GRID_ROT_BASE);
          var h = terrainHeight(p.x,p.z);
          if(h<=1.2) continue;
          var dPlaza = Math.hypot(p.x-PLAZA_CENTER.x, p.z-PLAZA_CENTER.z);
          if(dPlaza<28) continue;                    // keep the plaza open
          if(u>kearnyU-10 && u<montU+10 && v>fireNV-10 && v<fireSV+10) continue; // authored fire block
          var buildW = commercial ? (step-0.5) : (6+hash1(lotKey*1.31)*2.5);
          var footR  = commercial ? depth*0.5 : Math.hypot(buildW,depth)/2;
          // commercial party-wall rows skip the overlap test (abutting is the
          // intended P1 party-wall mechanism, exact shared edge/same yaw) but
          // still clear the ROW; residentials take the full overlap check.
          var ok = commercial ? canPlace(p.x,p.z,footR,{streetMargin:2, skipOverlap:true})
                              : canPlace(p.x,p.z,footR,{streetMargin:2});
          if(!ok) continue;
          registerPlacement(p.x, p.z, commercial? depth*0.5 : footR, "growth");
          // s76 §1.6 SINGLE-SOURCE ORIENTATION: face the lot's OWN frontage
          // centerline (grid coord e.coord on the perpendicular axis, `along`
          // on the parallel), converted to the same GRID_ROT_BASE world frame
          // the building bakes in. (sin frontYaw, cos frontYaw) is the door
          // decal's world direction — door faces its street by construction.
          var cw = e.isU ? gridToWorldAt(e.coord, along, GRID_ROT_BASE)
                         : gridToWorldAt(along, e.coord, GRID_ROT_BASE);
          var frontYaw = Math.atan2(cw.x-p.x, cw.z-p.z);
          out.push({ x:p.x, z:p.z, u:u, v:v, rotBase:e.rot, frontYaw:frontYaw,
                     buildW:buildW, depth:depth, edgeKey:edgeKey, edgeIdx:li, dRing:dRing,
                     commercial:commercial, kind: commercial?"commercial":"house",
                     priority: dPlaza + hash1(lotKey*9.37)*45 });
        }
      });
    }
  }
  // reveal plaza-outward: the commercial core assembles first, residential edge
  // fills after — matches the growthTargets reveal cadence (dayForBuildingIndex
  // indexes into this sorted pool).
  out.sort(function(a,b){ return a.priority-b.priority; });
  out.forEach(function(c, idx){
    // s76 §1.6: yaw = the lot's frontYaw (front/door faces its own street) plus
    // a small deterministic jitter (≤7° law). Commercial rows keep near-zero
    // jitter so the party wall stays continuous; residential a looser wobble.
    // Replaces the -(rotBase+GRID_ROT_BASE) math that drifted 90°/180° off the
    // door face (orientation audit: ~half the town mis-faced pre-fix).
    var jitterDeg = c.commercial ? 1.2 : 6;
    c.rot = c.frontYaw + (hash1(idx*4.73)-0.5)*2*(jitterDeg*Math.PI/180);
    // IRON HOUSES — the 1849-51 material outlier: ~7% of RESIDENTIAL lots,
    // rendered as iron only inside the date window (reveal loop gates the date).
    c.ironEligible = (!c.commercial) && hash1(idx*11.91+2.3) < 0.07;
  });
  return out;
})();
/* tent candidates: Happy Valley (south of the cove) + the western hillsides
   + the village's immediate overflow, rejection-sampled against real
   terrain with the same scatterSample() helper the ground-detail scatter
   above already uses. */
var tentCandidates = (function(){
  // WORLD-P0 fix (canPlace engine): tentBiome previously only tested
  // height/village-distance — now also routes through the shared
  // canPlace() so tents avoid streets/Mission Road, overlap with village
  // buildings/outposts, and overlap each other (footprint radius ~2.2m,
  // matching makeTentGeo()'s ~1.7m cone radius + guy-rope margin).
  // s67 (#49) P7: intra-cluster tent spacing. The positional canPlace overlap
  // only sees tents already in PLACEMENT_INDEX, but tents register AFTER each
  // cluster's scatterSample returns — so two tents in the SAME cluster could
  // pitch <2.5m apart (the spacing offense placement.tents caught). This running
  // list makes the ≥2.5m floor hold WITHIN a cluster too; scatterSample's retry
  // loop simply resamples a rejected candidate, so the camp isn't thinned.
  var _tentAccepted = [];
  function tentBiome(x,z,h){
    if(!(h>2 && h<78 && farFromVillage(x,z,35))) return false;
    // shared positional engine: street/Mission-road clearance + cross-cluster overlap.
    if(!canPlace(x,z,2.2,{streetMargin:2})) return false;
    // universal law table — slope ≤12% and never in the intertidal band
    // (kills the tideline tent). Data-driven, on top of the positional checks.
    if(!canPlace("tent", {x:x, z:z}).ok) return false;
    for(var i=0;i<_tentAccepted.length;i++){
      var dx=x-_tentAccepted[i].x, dz=z-_tentAccepted[i].z;
      if(dx*dx+dz*dz < 2.6*2.6) return false; // ≥2.5m from any other tent (P7)
    }
    _tentAccepted.push({x:x, z:z});
    return true;
  }
  var clusters = [
    { cx:900, cz:950, r:650, label:"Happy Valley" },                                  // Happy Valley, south of the cove
    { cx:PLAZA_CENTER.x-260, cz:PLAZA_CENTER.z+220, r:380, label:"the town's edge camps" },     // immediate village overflow
    { cx:PLAZA_CENTER.x-900, cz:PLAZA_CENTER.z-260, r:700, label:"the western hillside camps" }      // western hillside camps
  ];
  var out = [];
  clusters.forEach(function(c){
    var accepted = scatterSample(480, c.cx, c.cz, c.r, tentBiome);
    console.log("[verify] tentCandidates cluster '"+c.label+"' accepted "+accepted.length+"/480 at ("+c.cx+","+c.cz+") r="+c.r);
    accepted.forEach(function(p){
      registerPlacement(p.x,p.z,2.2);
      out.push({ x:p.x, z:p.z, rot:rngBuild()*Math.PI*2, priority:rngBuild(), label:c.label });
    });
  });
  out.sort(function(a,b){ return a.priority-b.priority; });
  return out;
})();

// P0-4 DENSITY fix (2026-07-10, screening #2): the finished-building body
// color (0xceb182) sat within ~10 RGB units of duneGold (0xc9ad6c) and sand
// (0xd8c48c) — terrainColor()'s own ground palette — so at any altitude
// where the 5x4m footprint reads as only a few px, the growth-building
// layer camouflaged into the sand almost exactly like the tents did before
// their documented fix, even though the growth/reveal DATA was already
// correct (504/504 spawned at 1849-09-20, confirmed via __P1850.buildings).
// This is the actual root cause of "same ~25 structures, unchanged" —
// those 25 are the founding VILLAGE_BUILDING_SPOTS + fire-block, which use
// a varied, more contrasting palette (adobeColors/frameColors below); the
// growth layer was rendering literally invisible against its own ground.
// Two alternating body/roof colorways (weathered grey-brown timber, deliberately
// darker/cooler than sand — same fix direction as the tent canvas color)
// give both contrast AND a break from single-color repetition.
// s72 UNIFICATION: growth stock now draws from the SAME documented KIT family
// as the village (weathered fir/redwood base), killing the f02 near-black-cube
// read. Three colorways span the fresh→silvered weathering range; per-instance
// silvering is layered on top via instanceColor (age lens) in the reveal loop.
var GROWTH_BUILDING_COLORWAYS = [
  { body:KIT.woodMid,    roof:KIT.roofWood },
  { body:KIT.woodSilver, roof:KIT.roofWorn },
  { body:KIT.woodFresh,  roof:0x4c4238 }
];
// Shared door + multi-pane sash window hints on the front (+z) face — the
// "doors/windows on ALL classes at close zoom" mandate. RuneScape-simple:
// a dark door recess + dark sash quads with a paler muntin cross. Baked into
// the instanced base geometry so every instance carries them at zero draw cost.
function pushSashWindow(parts, cx, cy, cz, w, h, faceN){
  var recess = new THREE.BoxGeometry(w, h, 0.06).toNonIndexed(); recess.translate(cx, cy, cz);
  colorizeUniform(recess, new THREE.Color(KIT.doorDark));
  parts.push(recess);
  // muntins: a thin vertical + horizontal bar in a pale weathered-sash tone
  var vb = new THREE.BoxGeometry(0.05, h*0.92, 0.04).toNonIndexed(); vb.translate(cx, cy, cz+0.02*faceN);
  var hb = new THREE.BoxGeometry(w*0.92, 0.05, 0.04).toNonIndexed(); hb.translate(cx, cy, cz+0.02*faceN);
  colorizeUniform(vb, new THREE.Color(0xb9ad93)); colorizeUniform(hb, new THREE.Color(0xb9ad93));
  parts.push(vb, hb);
}
function makeGrowthBuildingGeo(variant){
  var cw = GROWTH_BUILDING_COLORWAYS[variant||0];
  var W=5, H=2.8, D=4;
  var body = makeBoxLocal(W,H,D, new THREE.Color(cw.body));
  var roof = makeGableRoof(W,D,0.45, 1.0+0.35*((variant||0)%3), new THREE.Color(cw.roof)); // roofline variety by variant
  bake(roof, new THREE.Vector3(0,H,0));
  var parts=[body,roof];
  var door = new THREE.BoxGeometry(1.05,1.85,0.08).toNonIndexed(); door.translate((variant||0)%2?0.7:-0.7,0.93,D/2+0.02);
  colorizeUniform(door, new THREE.Color(KIT.doorDark)); parts.push(door);
  pushSashWindow(parts, (variant||0)%2?-0.9:0.95, 1.55, D/2+0.02, 0.72, 0.72, 1);   // front sash
  pushSashWindow(parts, W/2+0.02, 1.5, 0.6, 0.6, 0.6, 1);                            // side sash (drawn on +x face-ish)
  return mergeGeoms(parts);
}
/* COMMERCIAL gable-front + painted eave signboard — the bible's dominant
   commercial signature (§3a, iconic signature #2). The gable end faces the
   street (+z); a cream signboard band rides the eave (block-lettering is
   implied at distance — per-instance text isn't possible on an InstancedMesh,
   so the painted board reads as the wayfinding at town range, the named
   authored signs carry the words up close). Taller than a house, wide door,
   shopfront sash. */
function makeGrowthCommercialGeo(variant){
  var cw = GROWTH_BUILDING_COLORWAYS[(variant||0)%GROWTH_BUILDING_COLORWAYS.length];
  var W=5, H=3.3, D=4.2;
  var body = makeBoxLocal(W,H,D, new THREE.Color(cw.body));
  // gable-front: ridge runs along X so the triangular gable faces the street (+z)
  var roof = makeGableRoof(D,W,0.4, 1.5, new THREE.Color(cw.roof));
  roof.rotateY(Math.PI/2); bake(roof, new THREE.Vector3(0,H,0));
  var parts=[body,roof];
  // painted eave signboard across the front
  var board = new THREE.BoxGeometry(W*0.92, 0.62, 0.12).toNonIndexed(); board.translate(0, H-0.05, D/2+0.05);
  colorizeUniform(board, new THREE.Color(KIT.signCream)); parts.push(board);
  var boardEdge = new THREE.BoxGeometry(W*0.94, 0.08, 0.13).toNonIndexed(); boardEdge.translate(0, H-0.36, D/2+0.055);
  colorizeUniform(boardEdge, new THREE.Color(KIT.signInk)); parts.push(boardEdge);
  // wide shop door + shopfront sash
  var door = new THREE.BoxGeometry(1.55,2.0,0.08).toNonIndexed(); door.translate(0,1.0,D/2+0.02);
  colorizeUniform(door, new THREE.Color(KIT.doorDark)); parts.push(door);
  pushSashWindow(parts, -1.55, 1.6, D/2+0.02, 1.0, 0.85, 1);
  pushSashWindow(parts,  1.55, 1.6, D/2+0.02, 1.0, 0.85, 1);
  return mergeGeoms(parts);
}
/* IRON / ZINC HOUSE — the deliberate 1849-51 material outlier (bible §4,
   iconic signature #3): 15×20 ft (4.57×6.1 m) galvanized box, corrugated
   ribbing, rust bleed at seams, gable in matching sheet. Nothing else in the
   townscape shares this metallic, rigidly-ribbed read. */
function makeIronHouseGeo(){
  var W=4.57, H=2.5, D=6.1;
  var body = makeBoxLocal(W,H,D, new THREE.Color(KIT.ironWeathered));
  var roof = makeGableRoof(W,D,0.25, 0.85, new THREE.Color(KIT.ironNew));
  bake(roof, new THREE.Vector3(0,H,0));
  var parts=[body,roof];
  // corrugation ribbing: alternating light/dark vertical ribs on the two long
  // (±x) faces — tighter pitch than clapboard, the distinct metallic read
  var ribN=9;
  for(var s=-1;s<=1;s+=2){
    for(var i=0;i<ribN;i++){
      var rz=(-D/2)+ (i+0.5)*(D/ribN);
      var rib=new THREE.BoxGeometry(0.05,H*0.98,D/ribN*0.5).toNonIndexed();
      rib.translate(s*(W/2+0.01), H*0.5, rz);
      colorizeUniform(rib, new THREE.Color(i%2? KIT.ironNew : 0x76726c));
      parts.push(rib);
    }
  }
  // rust bleed streaks near the base seams
  for(var rr=0; rr<4; rr++){
    var streak=new THREE.BoxGeometry(0.09,H*0.5,0.05).toNonIndexed();
    streak.translate((rr%2?1:-1)*(W/2+0.02), H*0.28, (-D/2)+(rr+1)*(D/5));
    colorizeUniform(streak, new THREE.Color(KIT.rust)); parts.push(streak);
  }
  var door=new THREE.BoxGeometry(1.0,1.8,0.08).toNonIndexed(); door.translate(0,0.9,D/2+0.02);
  colorizeUniform(door, new THREE.Color(0x2a2622)); parts.push(door);
  pushSashWindow(parts, 0, 1.6, D/2+0.02, 0.6, 0.55, 1);
  return mergeGeoms(parts);
}
/* behavior-spec.md item 4 ("CONSTRUCTION AS PROCESS"): three earlier-stage
   geometries for a growth building's site, same footprint/rotation as the
   finished makeGrowthBuildingGeo() above — materials pile -> frame ->
   walls (no roof) -> the finished body+roof already defined above. */
function makeConstructionMaterialsGeo(){ return makeTimberStackGeo(); } // a lumber/materials delivery, before framing starts
function makeConstructionFrameGeo(){
  var postColor = new THREE.Color(0x6b5a44); // fresh-cut framing timber (KIT roofWorn tone)
  var parts = [];
  [[-2.3,-1.85],[2.3,-1.85],[-2.3,1.85],[2.3,1.85]].forEach(function(c){
    var post = makeBoxLocal(0.18,2.8,0.18,postColor); bake(post, new THREE.Vector3(c[0],0,c[1])); parts.push(post);
  });
  var ridgeA = makeBoxLocal(5.0,0.16,0.16,postColor); bake(ridgeA, new THREE.Vector3(0,2.8,-1.85)); parts.push(ridgeA);
  var ridgeB = makeBoxLocal(5.0,0.16,0.16,postColor); bake(ridgeB, new THREE.Vector3(0,2.8,1.85)); parts.push(ridgeB);
  var crossA = makeBoxLocal(0.16,0.16,4.0,postColor); bake(crossA, new THREE.Vector3(-2.3,2.8,0)); parts.push(crossA);
  var crossB = makeBoxLocal(0.16,0.16,4.0,postColor); bake(crossB, new THREE.Vector3(2.3,2.8,0)); parts.push(crossB);
  return mergeGeoms(parts);
}
function makeConstructionWallsGeo(){
  // P0-4 fix: was the same near-sand tan (0xceb182) as the old finished body;
  // raw unweathered plank walls (pre-roof) read a shade greyer/paler than
  // the finished colorways above, still clearly darker than sand/duneGold.
  return makeBoxLocal(5,2.8,4, new THREE.Color(KIT.woodFresh)); // raw unweathered plank walls, pre-roof
}
/* QA-GATE tents debt: the old tent was a single warm-tan cone (0xd8cba0)
   almost indistinguishable from the sand palette (sand 0xd8c48c, duneGold
   0xc9ad6c in terrainColor() above) — it failed the silhouette check
   against its own background. Rebuilt as cool off-white/grey canvas
   (deliberately far from the warm sand hue) with dark seam ribs + a door
   flap baked into the same merged instance geometry (no extra draw call). */
function makeTentGeo(){
  var canvas = new THREE.Color(0xe9e6d9); // cool off-white canvas — contrasts against warm sand/duneGold
  var seam = new THREE.Color(0x4c4436);   // dark seam/rope tone
  // BUG FIX (2026-07-10, tent P0): ConeGeometry is indexed by default in r128
  // (27 unique verts / 54 index entries = 18 real triangles) — mergeGeoms()
  // below is a hand-rolled merger that concatenates raw position.array and
  // has no concept of an index buffer, so an indexed part silently collapses
  // into a flat 9-triangle vertex soup (wrong faces, mostly backface-culled
  // or degenerate) instead of a cone. Every other part in this function
  // already calls .toNonIndexed() first; the cone — the tent's entire body,
  // ~90% of its silhouette — did not, which is why tents never visually
  // rendered (candidate generation/placement were fine; only the body mesh
  // itself was corrupt). Matches the same indexed/non-indexed hazard the
  // audit's V2 finding already flagged for makeBlobCluster()/makeBoulderGeo().
  var cone = new THREE.ConeGeometry(1.7,2.6,6).toNonIndexed();
  cone.translate(0,1.3,0);
  colorizeUniform(cone, canvas);
  var parts = [cone];
  for(var i=0;i<3;i++){
    var ang = (i/3)*Math.PI*2 + 0.35;
    var seamG = new THREE.BoxGeometry(0.08,2.55,0.08).toNonIndexed();
    seamG.translate(Math.cos(ang)*1.03, 1.28, Math.sin(ang)*1.03);
    parts.push(colorizeUniform(seamG, seam));
  }
  var doorFlap = new THREE.BoxGeometry(0.68,1.35,0.06).toNonIndexed();
  doorFlap.translate(0,0.68,1.55);
  parts.push(colorizeUniform(doorFlap, seam));
  return mergeGeoms(parts);
}
/* small campfire-glow marker, one per ~5th tent — only bright at dusk/night
   (opacity driven by the shared `nightFactor` day/night global below), so
   Happy Valley reads as a lived-in camp after dark, not just canvas cones. */
function makeCampfireGeo(){
  var g = new THREE.ConeGeometry(0.32,0.5,6); g.translate(0,0.25,0);
  return colorizeUniform(g, new THREE.Color(0xffb060));
}
// s72: all FINISHED growth meshes share ONE material instance so the
// zones-tint altitude cartoon-crossfade (which sets growthBuildingMesh.material
// .opacity) governs every finished-building geometry uniformly — houses,
// commercial rows AND iron houses — without editing another layer (the
// material object is the shared surface). Also fixes the pre-s72 latent bug
// where growthBuildingMesh2's own material never received the crossfade.
var growthFinMat = new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, transparent:true, side:THREE.DoubleSide, specular:0x000000, shininess:0});
var growthBuildingMesh = new THREE.InstancedMesh(makeGrowthBuildingGeo(0), growthFinMat, growthBuildingCandidates.length);
growthBuildingMesh.count = 0; scene.add(growthBuildingMesh);
// second house colorway, routed by candidate hash in growRevealStaged() for variety.
var growthBuildingMesh2 = new THREE.InstancedMesh(makeGrowthBuildingGeo(1), growthFinMat, growthBuildingCandidates.length);
growthBuildingMesh2.count = 0; scene.add(growthBuildingMesh2);
// s72: commercial gable-front + eave-signboard rows (the party-wall core) and
// the 1849-51 iron-house outliers — their own geometries, shared material.
var growthCommercialMesh = new THREE.InstancedMesh(makeGrowthCommercialGeo(0), growthFinMat, growthBuildingCandidates.length);
growthCommercialMesh.count = 0; scene.add(growthCommercialMesh);
var ironHouseMesh = new THREE.InstancedMesh(makeIronHouseGeo(), growthFinMat, Math.max(1, Math.ceil(growthBuildingCandidates.length*0.1)));
ironHouseMesh.count = 0; scene.add(ironHouseMesh);
// s72: growth instance setter with NON-UNIFORM width scale (party-wall lots
// stretch the 5m base body to their frontage width so a row reads continuous).
var _gbM4=new THREE.Matrix4(), _gbQ=new THREE.Quaternion(), _gbUP=new THREE.Vector3(0,1,0), _gbV=new THREE.Vector3(), _gbS=new THREE.Vector3();
function setGrowthInstance(mesh, idx, x,y,z, yaw, sx, sz){
  _gbQ.setFromAxisAngle(_gbUP, yaw); _gbV.set(x,y,z); _gbS.set(sx==null?1:sx, 1, sz==null?1:sz);
  _gbM4.compose(_gbV,_gbQ,_gbS); mesh.setMatrixAt(idx, _gbM4);
}
// staged-construction meshes (item 4): a candidate occupies exactly one of
// these four meshes at a time, keyed by age-since-spawn (see
// updateGrowth()'s staged-reveal loop) — never a scale-in blob.
var growthMaterialsMesh = new THREE.InstancedMesh(makeConstructionMaterialsGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, transparent:true, specular:0x000000, shininess:0}), Math.max(1,growthBuildingCandidates.length));
growthMaterialsMesh.count = 0; scene.add(growthMaterialsMesh);
var growthFrameMesh = new THREE.InstancedMesh(makeConstructionFrameGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, transparent:true, specular:0x000000, shininess:0}), Math.max(1,growthBuildingCandidates.length));
growthFrameMesh.count = 0; scene.add(growthFrameMesh);
var growthWallsMesh = new THREE.InstancedMesh(makeConstructionWallsGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, transparent:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}), Math.max(1,growthBuildingCandidates.length));
growthWallsMesh.count = 0; scene.add(growthWallsMesh);
// up to 3 static worker figures per active (frame/walls-stage) site, shown
// only in daylight hours — "visible work" (item 4), cheap static figures
// per the existing wharf-builder/leveling-crew precedent, not full sim actors.
var CONSTRUCTION_WORKERS_PER_SITE = 2;
var constructionWorkerMesh = new THREE.InstancedMesh(makeOutpostPersonGeo(new THREE.Color(0x3a3226), new THREE.Color(0x241f1a), false), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), Math.max(1, growthBuildingCandidates.length*CONSTRUCTION_WORKERS_PER_SITE));
constructionWorkerMesh.count = 0; scene.add(constructionWorkerMesh);
// supply carts (item 4: "carts travel dealer->sites") — a small pool
// shuttling between LUMBER_YARD_SPOT (defined later, referenced only at
// call time inside growRevealStaged()) and whichever sites are still
// early in construction.
var SUPPLY_CART_CAP = 6;
function makeSupplyCartGeo(){
  var hullColor = new THREE.Color(0x5a4632), wheelColor = new THREE.Color(0x2e261c), loadColor = new THREE.Color(0x8a7050);
  var bed = makeBoxLocal(1.3,0.35,2.2, hullColor);
  var load = makeBoxLocal(1.0,0.35,1.7, loadColor); bake(load, new THREE.Vector3(0,0.35,0));
  var wheelA = new THREE.CylinderGeometry(0.32,0.32,0.14,8).toNonIndexed(); wheelA.rotateX(Math.PI/2); wheelA.translate(-0.7,0.32,0.6); colorizeUniform(wheelA, wheelColor);
  var wheelB = wheelA.clone(); wheelB.translate(1.4,0,0);
  return mergeGeoms([bed, load, wheelA, wheelB]);
}
var supplyCartMesh = new THREE.InstancedMesh(makeSupplyCartGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), SUPPLY_CART_CAP);
supplyCartMesh.count = 0; scene.add(supplyCartMesh);
var tentMesh = new THREE.InstancedMesh(makeTentGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, transparent:true, specular:0x000000, shininess:0}), tentCandidates.length);
tentMesh.count = 0; scene.add(tentMesh);
var campfireMesh = new THREE.InstancedMesh(makeCampfireGeo(), new THREE.MeshBasicMaterial({color:0xffb060, transparent:true, opacity:0}), Math.max(1,Math.ceil(tentCandidates.length/5)));
campfireMesh.count = 0; scene.add(campfireMesh);

var spawnedBuildings = [], spawnedTents = [];
function growReveal(pool, spawned, targetCount, mesh, revealDayFn){
  // s76 REWIND-EXACT (determinism law): a backward jump lowers targetCount —
  // shrink the spawned set so the world re-derives to fewer structures instead
  // of ratcheting up forever (the count-based audits were reading stale highs
  // after a scrub back in time).
  if(spawned.length>targetCount) spawned.length = Math.max(0, targetCount);
  while(spawned.length<targetCount && spawned.length<pool.length){
    var idx = spawned.length;
    var c = pool[idx];
    var rDay = revealDayFn ? Math.min(simDay, revealDayFn(idx)) : simDay; // P0-1: backdate to when this candidate should truly have appeared
    spawned.push({ x:c.x, z:c.z, h:terrainHeight(c.x,c.z), rot:c.rot, spawnDay:rDay, settled:false });
  }
  mesh.count = spawned.length;
  for(var i=0;i<spawned.length;i++){
    var b = spawned[i];
    if(b.settled) continue;
    var age = simDay-b.spawnDay;
    var s = 0.05+0.95*smoothstep(0,RAISE_DAYS,age);
    setShipInstance(mesh, i, b.x, b.h, b.z, b.rot, s);
    if(age>=RAISE_DAYS) b.settled = true;
  }
  mesh.instanceMatrix.needsUpdate = true;
}
/* behavior-spec.md item 4: staged assembly over ~2 sim-weeks, replacing the
   old uniform scale-in for buildings specifically (tents/boats/cargo/timber
   keep the plain growReveal() scale-in above — this is deliberately just
   for houses going up). A site occupies exactly one of materials/frame/
   walls/finished at a time, keyed by age since its reveal trigger (which
   itself is still paced by the population-curve growthTargets() above —
   only WHAT renders during that window changes, not WHEN a site starts). */
var CONSTRUCTION_DAYS = 14;
// iron/zinc houses appear ONLY 1849-51 (bible §4: the fad busted by 1852)
var IRON_WIN_START = eventDateToSimDay("1849-01-01"), IRON_WIN_END = eventDateToSimDay("1852-01-01");
var GROWTH_BASE_W = 5; // makeGrowthBuildingGeo/Commercial base body width (for the party-wall width scale)
// s76 §1.5 PARTY-WALL ERA UNLOCK: commercial lots abut into continuous rows
// ONLY from the boom-core unlock (~mid-1849). Before it, a plaza-ring lot is a
// DETACHED frame building with side yards (kills the Director's June-1847 200m
// strip). After it, abutment is capped: every 8th lot along an edge is a forced
// gap/alley so no run exceeds ~7 (rowEra run cap). One shared predicate, used
// identically by the renderer and the rowEra/frontageOpenness audits.
var SPAWN_UNLOCK_DAY = eventDateToSimDay("1849-06-01");
var COMMERCIAL_DETACHED_W = 4.6;   // pre-unlock / forced-gap commercial lot footprint width
function partyWallActive(c, day){
  return !!(c && c.commercial && day >= SPAWN_UNLOCK_DAY && (c.edgeIdx % 8) !== 7);
}
function lotEffectiveW(c, day){
  if(!c) return GROWTH_BASE_W;
  if(c.commercial) return partyWallActive(c, day) ? c.buildW : COMMERCIAL_DETACHED_W;
  return c.buildW || GROWTH_BASE_W;
}
function growRevealStaged(pool, spawned, targetCount, revealDayFn){
  if(spawned.length>targetCount) spawned.length = Math.max(0, targetCount); // s76 rewind-exact (see growReveal)
  while(spawned.length<targetCount && spawned.length<pool.length){
    var idx = spawned.length;
    var c = pool[idx];
    var rDay = revealDayFn ? Math.min(simDay, revealDayFn(idx)) : simDay; // P0-1: backdate to when this site should truly have broken ground
    spawned.push({ x:c.x, z:c.z, h:terrainHeight(c.x,c.z), rot:c.rot, spawnDay:rDay, settled:false });
  }
  var matN=0, frameN=0, wallN=0, doneN=0, doneN2=0, commN=0, ironN=0, workerN=0;
  var ironWindow = (simDay>=IRON_WIN_START && simDay<IRON_WIN_END);
  var dayHour = (simDay-Math.floor(simDay))*24;
  var isDaylight = dayHour>=6.5 && dayHour<18;
  for(var i=0;i<spawned.length;i++){
    var b = spawned[i], c = pool[i];
    // s76 §1.5: effective width is era-gated — commercial lots only stretch to
    // their full party-wall frontage AFTER the unlock (and not on a forced-gap
    // lot); before that they build detached at COMMERCIAL_DETACHED_W.
    var sx = lotEffectiveW(c, simDay)/GROWTH_BASE_W;
    var age = simDay-b.spawnDay;
    var frac = clamp(age/CONSTRUCTION_DAYS, 0, 1);
    var activeStage = (frac>=0.18 && frac<0.8); // frame or walls — the stages with workers/carts present
    if(frac<0.18){ setGrowthInstance(growthMaterialsMesh, matN++, b.x,b.h,b.z,b.rot,1); }
    else if(frac<0.45){ setGrowthInstance(growthFrameMesh, frameN++, b.x,b.h,b.z,b.rot,sx); }
    else if(frac<0.8){ setGrowthInstance(growthWallsMesh, wallN++, b.x,b.h,b.z,b.rot,sx); }
    else {
      // s72 KIT routing: iron outlier (1849-51 only) → commercial gable-front
      // row → domestic house (two colorways for variety, hash-routed so it's
      // stable per building, not index-parity flicker across reveals).
      // s76 §1.5: a commercial lot renders as a party-wall gable-front row ONLY
      // when the wall is active (post-unlock, non-gap). Pre-unlock or on a forced
      // gap it builds as a detached frame house at the narrower footprint — so
      // the plaza ring reads as detached village stock in 1847-48 and assembles
      // into continuous commercial rows only in the 1849 boom.
      if(c && c.ironEligible && ironWindow){ setGrowthInstance(ironHouseMesh, ironN++, b.x,b.h,b.z,b.rot,1); }
      else if(partyWallActive(c, simDay)){ setGrowthInstance(growthCommercialMesh, commN++, b.x,b.h,b.z,b.rot,sx); }
      else if(hash1(i*1.73)<0.5){ setGrowthInstance(growthBuildingMesh, doneN++, b.x,b.h,b.z,b.rot,sx); }
      else { setGrowthInstance(growthBuildingMesh2, doneN2++, b.x,b.h,b.z,b.rot,sx); }
      b.settled = frac>=1;
    }
    if(isDaylight && activeStage){
      for(var wk=0; wk<CONSTRUCTION_WORKERS_PER_SITE && workerN<constructionWorkerMesh.instanceMatrix.count; wk++){
        var wang = wk*2.4 + i*0.7;
        var wx = b.x+Math.cos(wang)*2.6, wz = b.z+Math.sin(wang)*2.6;
        setShipInstance(constructionWorkerMesh, workerN++, wx, terrainHeight(wx,wz), wz, wang+1.6, 1);
      }
    }
  }
  growthMaterialsMesh.count = matN; growthMaterialsMesh.instanceMatrix.needsUpdate = true;
  growthFrameMesh.count = frameN; growthFrameMesh.instanceMatrix.needsUpdate = true;
  growthWallsMesh.count = wallN; growthWallsMesh.instanceMatrix.needsUpdate = true;
  growthBuildingMesh2.count = doneN2; growthBuildingMesh2.instanceMatrix.needsUpdate = true;
  growthBuildingMesh.count = doneN; growthBuildingMesh.instanceMatrix.needsUpdate = true;
  growthCommercialMesh.count = commN; growthCommercialMesh.instanceMatrix.needsUpdate = true;
  ironHouseMesh.count = ironN; ironHouseMesh.instanceMatrix.needsUpdate = true;
  constructionWorkerMesh.count = workerN; constructionWorkerMesh.instanceMatrix.needsUpdate = true;

  // supply carts: a small pool shuttling between the lumber yard and
  // whichever sites are still in their materials/frame stage (item 4:
  // "carts travel dealer->sites").
  var earlyStageSites = [];
  for(i=0;i<spawned.length;i++){
    var age2 = simDay-spawned[i].spawnDay, f2 = clamp(age2/CONSTRUCTION_DAYS,0,1);
    if(f2<0.45) earlyStageSites.push(spawned[i]);
    if(earlyStageSites.length>=SUPPLY_CART_CAP) break;
  }
  supplyCartMesh.count = earlyStageSites.length;
  earlyStageSites.forEach(function(site, ci){
    var cyc = ((simDay*3 + ci*0.37)%1+1)%1;
    var ct = cyc<0.5 ? cyc*2 : (1-cyc)*2;
    var cx = lerp(LUMBER_YARD_SPOT.x, site.x, ct), cz = lerp(LUMBER_YARD_SPOT.z, site.z, ct);
    var yaw = Math.atan2(site.x-LUMBER_YARD_SPOT.x, site.z-LUMBER_YARD_SPOT.z);
    setShipInstance(supplyCartMesh, ci, cx, terrainHeight(cx,cz)+0.15, cz, yaw, 1);
  });
  supplyCartMesh.instanceMatrix.needsUpdate = true;
}
function updateCampfires(){
  var cfCount = Math.floor(spawnedTents.length/5);
  campfireMesh.count = cfCount;
  for(var i=0;i<cfCount;i++){
    var t = spawnedTents[i*5];
    var lit = t.settled ? 1 : 0;
    setShipInstance(campfireMesh, i, t.x+1.05, t.h+0.05, t.z+0.7, 0, lit);
  }
  campfireMesh.instanceMatrix.needsUpdate = true;
  campfireMesh.material.opacity = nightFactor*0.9;
}
function updateGrowth(){
  var pop = densityAt(simDay);
  var t = growthTargets(pop);
  growRevealStaged(growthBuildingCandidates, spawnedBuildings, t.buildings, dayForBuildingIndex);
  growReveal(tentCandidates, spawnedTents, t.tents, tentMesh, dayForTentIndex);
  updateCampfires();
}

/* @P1850-CHUNK 40 — shared sign board texture helpers */
/* canvas-texture painted sign board — hoisted to global scope (was local to
   buildYardObjects) so both the shop-shingle system below AND the notable-
   landmark physical signage / lumber-yard sign further down can share one
   texture-maker (coordinator directive: "extend the existing canvas
   signage-board system"). */
function makeSignTexture(word, priceLine){
  var h = priceLine ? 84 : 64;
  var cnv = document.createElement("canvas"); cnv.width=256; cnv.height=h;
  var ctx = cnv.getContext("2d");
  ctx.fillStyle = "#e8dfc0"; ctx.fillRect(0,0,256,h);
  ctx.strokeStyle = "#2b1d0e"; ctx.lineWidth=4; ctx.strokeRect(4,4,248,h-8);
  ctx.fillStyle = "#2b1d0e";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 26px Georgia, serif";
  ctx.fillText(word, 128, priceLine ? 30 : 34);
  if(priceLine){
    ctx.font = "20px Georgia, serif";
    ctx.fillText(priceLine, 128, 62);
  }
  var tex = new THREE.CanvasTexture(cnv);
  tex.needsUpdate = true;
  return { tex:tex, h:h };
}
function mountSignBoard(spot, word, priceLine, yOffset){
  var built = makeSignTexture(word, priceLine);
  var mat = new THREE.MeshBasicMaterial({ map:built.tex, side:THREE.DoubleSide, transparent:true });
  var geo = new THREE.PlaneGeometry(1.9, 0.5*(built.h/64));
  var mesh = new THREE.Mesh(geo, mat);
  var faceDist = spot.d*0.5+0.06;
  mesh.position.set(spot.x + Math.sin(spot.rot)*faceDist, spot.y+(yOffset!=null?yOffset:1.55), spot.z + Math.cos(spot.rot)*faceDist);
  mesh.rotation.y = spot.rot;
  scene.add(mesh);
  // s67 (#49) P5: every sign is registered so placement.signs can prove it
  // lives on a WALL plane — vertical (no roll/pitch, normal ⊥ any roof) and
  // below the fronted building's roofline, never lying on a roof plane.
  PLACEMENT_SIGNS.push({ x:mesh.position.x, y:mesh.position.y, z:mesh.position.z,
                         rotX:mesh.rotation.x, rotZ:mesh.rotation.z,
                         roofY:(spot.y||0)+((spot.h!=null?spot.h:3))+0.6 });
  return mesh;
}

/* @P1850-CHUNK 42 — yard objects, organic layout (yard fences + door-paths) */
/* =====================================================================
   YARD OBJECTS (QA-GATE town-density debt, 2026-07): period yard objects
   at true scale around the village's own real building placements
   (VILLAGE_BUILDING_SPOTS, captured by placeBuilding() above) — outhouses,
   standalone sheds, water barrels, and a handful of street-facing signage
   boards — so the town reads inhabited at 200-400m instead of just bare
   streets between buildings. Reuses the existing fence/woodpile/barrel
   prefab LANGUAGE (small merged box shapes, InstancedMesh) rather than
   inventing a new visual vocabulary.
   ===================================================================== */
var SIGN_BUILDING_SPOTS = []; // {x,z,y,rot,w,d,word} — reused by Phase 4's home/work
                               // system so shop-trade routines have a real signed building to work at.
(function buildYardObjects(){
  function behindSpot(spot, dist, lateral){
    // world offset "behind" a building relative to its own facing rotation,
    // so yard objects sit off the building's back/side rather than in the street
    var s = Math.sin(spot.rot), c = Math.cos(spot.rot);
    var lx = lateral, lz = -(spot.d*0.5+dist);
    return { x: spot.x + lx*c + lz*s, z: spot.z - lx*s + lz*c };
  }

  // ---- outhouses: small narrow gabled box, true scale (~1.1 x 1.1 x 2m) ----
  function makeOuthouseGeo(){
    var wall = new THREE.Color(0x8a7658), roof = new THREE.Color(0x4c4030);
    var body = makeBoxLocal(1.1,1.9,1.1, wall);
    var roofG = makeGableRoof(1.1,1.1,0.12,0.45, roof); bake(roofG, new THREE.Vector3(0,1.9,0));
    var door = makeBoxLocal(0.5,1.3,0.05, roof); bake(door, new THREE.Vector3(0,0.68,0.58));
    return mergeGeoms([body, roofG, door]);
  }
  var outhouseMatrices = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(spot){
    if(rngBuild()>=0.30) return;
    var p = behindSpot(spot, 4+rngBuild()*3, (rngBuild()-0.5)*spot.w*1.4);
    var h = terrainHeight(p.x,p.z);
    if(h<=1) return;
    var oRot = spot.rot+(rngBuild()-0.5)*0.5;
    // s56: era-gated landmarks (fire block, hotels, chapel) get NO baked
    // yard adjuncts — an outhouse standing alone years before its building
    // exists is the same orphan defect as the ungated shadows; and the
    // 1849 dense commercial row wouldn't keep cottage-yard furniture
    // anyway. rngBuild() draws above are consumed either way, so the
    // seeded stream for every ungated spot is byte-identical.
    if(spot.foundedDay!=null) return;
    outhouseMatrices.push({ x:p.x, z:p.z, h:h, rot: oRot });
  });
  if(outhouseMatrices.length>0){
    var outhouseMesh = new THREE.InstancedMesh(makeOuthouseGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}), outhouseMatrices.length);
    (function(){
      var m4=new THREE.Matrix4();
      outhouseMatrices.forEach(function(o,i){
        var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), o.rot);
        m4.compose(new THREE.Vector3(o.x,o.h,o.z), q, new THREE.Vector3(1,1,1));
        outhouseMesh.setMatrixAt(i,m4);
      });
      outhouseMesh.instanceMatrix.needsUpdate = true;
    })();
    scene.add(outhouseMesh);
  }

  // ---- standalone yard sheds: bigger than the attached lean-to (A6), true scale ----
  function makeYardShedGeo(){
    var wall = new THREE.Color(0x746048), roof = new THREE.Color(0x5a4432);
    var body = makeBoxLocal(3.0,2.0,2.3, wall);
    var roofG = makeGableRoof(3.0,2.3,0.3,0.65, roof); bake(roofG, new THREE.Vector3(0,2.0,0));
    return mergeGeoms([body, roofG]);
  }
  var shedMatrices = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(spot){
    if(rngBuild()>=0.16) return;
    var p = behindSpot(spot, 6+rngBuild()*4, (rngBuild()-0.5)*spot.w*1.6);
    var h = terrainHeight(p.x,p.z);
    if(h<=1) return;
    // s56 BUILDING-YAW AUDIT: these 3×2.3m gabled sheds read as small
    // BUILDINGS at 150m, and the old fully-random rot (rngBuild()*2π) was
    // the main source of "structures at arbitrary ~45° unrelated to any
    // street". road-master-spec §5 lets outbuildings be loose, but loose
    // means "strung up by eye off the house" (the yard-fence rule), not
    // uniformly random — so they now square roughly to their own house
    // (±~17°), same jitter language as the outhouses. One rngBuild()
    // draw either way: the seeded stream is unchanged.
    var sRot = spot.rot + (rngBuild()-0.5)*0.6;
    if(spot.foundedDay!=null) return; // s56: no yard adjuncts on era-gated landmarks (see outhouses)
    shedMatrices.push({ x:p.x, z:p.z, h:h, rot: sRot });
  });
  if(shedMatrices.length>0){
    var shedMesh = new THREE.InstancedMesh(makeYardShedGeo(), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0}), shedMatrices.length);
    (function(){
      var m4=new THREE.Matrix4();
      shedMatrices.forEach(function(o,i){
        var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), o.rot);
        m4.compose(new THREE.Vector3(o.x,o.h,o.z), q, new THREE.Vector3(1,1,1));
        shedMesh.setMatrixAt(i,m4);
      });
      shedMesh.instanceMatrix.needsUpdate = true;
    })();
    scene.add(shedMesh);
  }

  // ---- water barrels — every yard's rain/well-water butt, by the door ----
  var yardBarrelGeo = new THREE.CylinderGeometry(0.32,0.36,0.7,8).toNonIndexed();
  colorizeUniform(yardBarrelGeo, new THREE.Color(0x5c4a34));
  var yardBarrelSamples = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(spot){
    if(rngBuild()>=0.42) return;
    var s = Math.sin(spot.rot), c = Math.cos(spot.rot);
    var lx = (rngBuild()<0.5?-1:1)*(spot.w*0.5+0.6), lz = (rngBuild()-0.5)*spot.d*0.6;
    var x = spot.x + lx*c + lz*s, z = spot.z - lx*s + lz*c;
    var h = terrainHeight(x,z);
    if(spot.foundedDay!=null) return; // s56: no yard adjuncts on era-gated landmarks (draws consumed above)
    if(h>1) yardBarrelSamples.push({x:x,z:z,h:h});
  });
  if(yardBarrelSamples.length>0){
    var yardBarrelMesh = buildScatterMesh(yardBarrelGeo, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0}), yardBarrelSamples, { minScale:0.9, maxScale:1.2 });
    scene.add(yardBarrelMesh);
  }

  // ---- signage boards: a handful of hand-painted canvas-texture plaques on
  // street-facing walls of the buildings nearest the plaza (period trade
  // words) — small-N, so plain individual textured meshes rather than an
  // InstancedMesh (each needs its own texture); kept to <10 (+6 draw calls,
  // stated in the QA report) rather than forcing a texture-atlas pass. ----
  var SIGN_WORDS = ["GROCER","DRY GOODS","PROVISIONS","BOARDING","TIN SHOP","SHIP CHANDLERY"];
  // GAPS-2026-07-09 item 2 (economy layer): a documented period price, quietly
  // painted as the board's second line where the extraction has one for that
  // trade — no "1846-49 price" label, just the figure a real sign would carry.
  var SIGN_PRICE_ITEM = { "GROCER":/^eggs$/i, "DRY GOODS":/^cloth$/i, "PROVISIONS":/^flour$/i,
    "BOARDING":/^house rent$/i, "TIN SHOP":/^tin, plate$/i, "SHIP CHANDLERY":/^cordage, hemp$/i };
  // s56: era-gated landmarks excluded — a GROCER board floating over an
  // empty lot (its building buried until 1847/1849) was one of the orphan
  // artifacts; the named landmarks get their own gated signage anyway.
  var plazaSorted = VILLAGE_BUILDING_SPOTS.filter(function(s){ return s.foundedDay==null; }).sort(function(a,b){
    return Math.hypot(a.x-PLAZA_CENTER.x,a.z-PLAZA_CENTER.z) - Math.hypot(b.x-PLAZA_CENTER.x,b.z-PLAZA_CENTER.z);
  }).slice(0, SIGN_WORDS.length);
  plazaSorted.forEach(function(spot, i){
    var word = SIGN_WORDS[i % SIGN_WORDS.length];
    var re = SIGN_PRICE_ITEM[word];
    var priceRec = re ? findPriceByItem(re) : null;
    var priceLine = priceRec ? formatPrice(priceRec).toUpperCase() : null;
    mountSignBoard(spot, word, priceLine);
    SIGN_BUILDING_SPOTS.push({ x:spot.x, z:spot.z, y:spot.y, rot:spot.rot, w:spot.w, d:spot.d, word:word });
  });
})();

/* =====================================================================
   ORGANIC LAYOUT — YARD FENCES + DOOR-PATHS (2026-07-10): per-building lot
   texture the town was missing — split-rail yard fences around ~40% of
   houses (reusing buildVillageClutter's fence-prefab language, but scoped
   per-lot and always partial/irregular rather than a closed box) and worn
   door-to-street paths that approach at an angled jog rather than square
   perpendicular. Anchored to VILLAGE_BUILDING_SPOTS, same as the yard
   objects above.

   s70 (#55) P6 FENCE GROUND-LOGIC — placement-spec.md P6, first dedicated
   consumer of the s67 universal placement engine. The pre-s70 fence was built
   LONG-SEGMENT-FLAT: one rigid 2-post + 2-rail prefab was stamped per ~2.9m
   panel at ONE terrain height (the panel midpoint), so on a slope one post
   floated and the other buried, and the rails knifed into / hung off the grade
   (the user offense). It is now POST-INTERVAL GROUNDED: a run is a sequence of
   posts, EACH seated to terrain at its own x,z (base gap 0 by construction),
   with rails spanning consecutive post-tops so each rail follows that interval's
   slope (stepped/sloped per interval, never one long floating span). Every panel
   is validated through the engine (canPlace('fence',…) at each post — on land,
   never in a right-of-way [the f13-90m street-crossing offense], never in the
   intertidal band) plus exact seg-vs-seg / seg-vs-footprint crossing tests, and
   a gate gap is left where the door-path exits. FENCE_SEGS / FENCE_POSTS record
   the result for __P1850.audits.placement.fences. DETERMINISM: the rngBuild()
   draw sequence is byte-identical to pre-s70 (same 0.40 gate, yawSkew, hx, hz,
   nSides, side-shuffle, and per-panel 0.18 draw, same segN=round(len/2.9)); the
   new law rejections happen AFTER the panel's rng draw, exactly where the old
   fh<=1 / foundedDay skips already sat, so no rng is added or reordered and the
   world-wide seeded stream is unchanged.
   ===================================================================== */
/* s70: recorded per accepted panel for the P6 audit (framing-independent) and
   for the fence-fence crossing test during construction. IIFE-scoped globals so
   the core placement audit (06-debug) can walk them, same pattern as
   PLACEMENT_TREES / tentCandidates. */
var FENCE_SEGS = [];  // {x0,z0,x1,z1,spot,yaw} — accepted rail runs, world coords
var FENCE_POSTS = []; // {x,z,y} — every seated post base (y == terrainHeight there)
(function buildYardFencesAndPaths(){
  var postColor = new THREE.Color(0x5c4a35), railColor = new THREE.Color(0x6b5640);
  // POST: vertical box, base at y=0 (makeBoxLocal pivots at base center) so an
  // instance placed at (x, terrainHeight(x,z), z) seats its base exactly on the
  // grade — posts are ALWAYS vertical regardless of slope (a real fence post is).
  var postGeo = makeBoxLocal(0.12,0.85,0.12, postColor);
  // RAIL: unit box along +X, centred at origin, so a per-instance matrix that
  // maps +X onto the 3D post-to-post vector (scale X = interval length) draws a
  // rail that follows the interval's slope. Two rails per interval (RAIL_YS up
  // each post's own seat) keeps the split-rail read.
  var railUnitGeo = colorizeUniform(new THREE.BoxGeometry(1,0.07,0.07).toNonIndexed(), railColor);
  var RAIL_YS = [0.30, 0.58];

  // ---- crossing-test helpers (no rng; P6 topology the point-engine can't express) ----
  function ccw(ax,az,bx,bz,cx,cz){ return (cz-az)*(bx-ax) > (bz-az)*(cx-ax); }
  function segsCross(ax,az,bx,bz,cx,cz,dx,dz){ // STRICT straddle — shared endpoints (own corners) don't count
    return (ccw(ax,az,cx,cz,dx,dz)!==ccw(bx,bz,cx,cz,dx,dz)) && (ccw(ax,az,bx,bz,cx,cz)!==ccw(ax,az,bx,bz,dx,dz));
  }
  function ptInRect(px,pz,b){ // building's own local frame (matches placeBuilding bake + placement audits)
    var s=Math.sin(b.rot||0), c=Math.cos(b.rot||0), dx=px-b.x, dz=pz-b.z;
    return Math.abs(dx*c+dz*s) <= (b.w||4)/2 && Math.abs(-dx*s+dz*c) <= (b.d||4)/2;
  }
  function segHitsRect(x0,z0,x1,z1,b){
    if(ptInRect(x0,z0,b) || ptInRect(x1,z1,b)) return true;
    var s=Math.sin(b.rot||0), c=Math.cos(b.rot||0), hw=(b.w||4)/2, hd=(b.d||4)/2;
    function cr(lx,lz){ return { x:b.x+lx*c-lz*s, z:b.z+lx*s+lz*c }; }
    var C=[cr(-hw,-hd),cr(hw,-hd),cr(hw,hd),cr(-hw,hd)];
    for(var e=0;e<4;e++){ var p=C[e], q=C[(e+1)%4];
      if(segsCross(x0,z0,x1,z1, p.x,p.z,q.x,q.z)) return true; }
    return false;
  }

  // ---- split-rail yard fences: ~40% of houses, 2-3 of 4 sides chosen at
  // random with dropped rails for gaps/gates — an irregular partial
  // enclosure, never a neat closed box. ----
  var postMatrices = [], railMatrices = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(spot, spotIdx){
    if(rngBuild()>=0.40) return;
    var yawSkew = spot.rot + (rngBuild()-0.5)*0.5; // strung up by eye, not surveyed
    var hx = spot.w*0.5+2+rngBuild()*2, hz = spot.d*0.5+2+rngBuild()*2;
    var s = Math.sin(yawSkew), c = Math.cos(yawSkew);
    function toWorld(lx,lz){ return { x: spot.x + lx*c + lz*s, z: spot.z - lx*s + lz*c }; }
    var sides = [
      { a:[-hx,-hz], b:[hx,-hz] },
      { a:[hx,-hz],  b:[hx,hz]  },
      { a:[hx,hz],   b:[-hx,hz] },
      { a:[-hx,hz],  b:[-hx,-hz] }
    ];
    var nSides = 2+Math.floor(rngBuild()*2); // 2-3 of 4 sides -- always partial
    var chosen = sides.slice().sort(function(){ return rngBuild()-0.5; }).slice(0, nSides);
    // GATE GAP (P6): where the front door's path exits toward the street, leave
    // an opening. Derived from the door FACING only (spot.rot) — no rng — so the
    // door-path loop below keeps its own seeded stream; the door line runs from
    // the door out past the yard edge, and any panel it crosses becomes the gate.
    var faceDist = spot.d*0.5+0.3, reach = Math.max(hx,hz)+3;
    var doorX = spot.x+Math.sin(spot.rot)*faceDist, doorZ = spot.z+Math.cos(spot.rot)*faceDist;
    var gateX = spot.x+Math.sin(spot.rot)*reach,    gateZ = spot.z+Math.cos(spot.rot)*reach;
    var postKey = {}; // dedup shared/corner posts within this building
    function addPost(px,pz){
      var k = Math.round(px*10)+"_"+Math.round(pz*10);
      if(postKey[k]) return; postKey[k]=1;
      var ph = terrainHeight(px,pz);            // seat THIS post to ITS ground
      postMatrices.push({x:px,z:pz,h:ph});
      FENCE_POSTS.push({x:px,z:pz,y:ph});
    }
    chosen.forEach(function(side){
      var a = toWorld(side.a[0],side.a[1]), b = toWorld(side.b[0],side.b[1]);
      var dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz);
      var segN = Math.max(1, Math.round(len/2.9)); // ~2.9m post spacing (unchanged → same rng draw count)
      for(var i=0;i<segN;i++){
        if(rngBuild()<0.18) continue; // a missing panel -- gate, gap, wear (SAME draw as pre-s70)
        // ----- post-draw skips (NO rng — the s70 law checks slot in exactly
        //       where the old fh<=1 / foundedDay skips sat, so the stream holds) -----
        var t=(i+0.5)/segN, fx=a.x+dx*t, fz=a.z+dz*t, fh=terrainHeight(fx,fz);
        if(fh<=1) continue;
        if(spot.foundedDay!=null) continue; // s56: no yard fence around an era-gated landmark
        var t0=i/segN, t1=(i+1)/segN;
        var p0x=a.x+dx*t0, p0z=a.z+dz*t0, p1x=a.x+dx*t1, p1z=a.z+dz*t1;
        // P6 point-law via the engine, at BOTH posts of this panel
        if(!canPlace("fence", {x:p0x, z:p0z}).ok) continue;
        if(!canPlace("fence", {x:p1x, z:p1z}).ok) continue;
        // P6 gate gap: skip the panel the door-path crosses
        if(segsCross(p0x,p0z,p1x,p1z, doorX,doorZ,gateX,gateZ)) continue;
        // P6 no fence-fence crossing: vs every OTHER building's accepted runs
        var crossFence=false, f;
        for(f=0;f<FENCE_SEGS.length;f++){ var fs=FENCE_SEGS[f]; if(fs.spot===spotIdx) continue;
          if(segsCross(p0x,p0z,p1x,p1z, fs.x0,fs.z0,fs.x1,fs.z1)){ crossFence=true; break; } }
        if(crossFence) continue;
        // P6 no footprint crossing: vs every OTHER building (parent excluded)
        var crossFoot=false, j;
        for(j=0;j<VILLAGE_BUILDING_SPOTS.length;j++){ if(j===spotIdx) continue;
          var bb=VILLAGE_BUILDING_SPOTS[j]; if(bb.w==null) continue;
          var mdx=fx-bb.x, mdz=fz-bb.z, br=Math.hypot(bb.w,bb.d)/2+3;
          if(mdx*mdx+mdz*mdz > br*br) continue; // broadphase
          if(segHitsRect(p0x,p0z,p1x,p1z, bb)){ crossFoot=true; break; } }
        if(crossFoot) continue;
        // ----- accept: seat posts, span rails over the terrain interval -----
        addPost(p0x,p0z); addPost(p1x,p1z);
        var h0=terrainHeight(p0x,p0z), h1=terrainHeight(p1x,p1z);
        RAIL_YS.forEach(function(ry){
          railMatrices.push({ ax:p0x, ay:h0+ry, az:p0z, bx:p1x, by:h1+ry, bz:p1z });
        });
        FENCE_SEGS.push({ x0:p0x, z0:p0z, x1:p1x, z1:p1z, spot:spotIdx, yaw:yawSkew });
        registerWalkSeg(p0x,p0z,p1x,p1z); // s59: only PLACED panels block — gates/gaps stay passable
      }
    });
  });
  // ---- meshes: instanced posts (translation only) + instanced rails (each
  //      matrix maps +X onto its post-to-post vector). 2 draw calls total. ----
  var fenceMat = new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, flatShading:true, specular:0x000000, shininess:0 });
  if(postMatrices.length>0){
    var postMesh = new THREE.InstancedMesh(postGeo, fenceMat, postMatrices.length);
    var pm4=new THREE.Matrix4(), pq=new THREE.Quaternion(), pone=new THREE.Vector3(1,1,1);
    postMatrices.forEach(function(p,i){
      pm4.compose(new THREE.Vector3(p.x,p.h,p.z), pq, pone);
      postMesh.setMatrixAt(i,pm4);
    });
    postMesh.instanceMatrix.needsUpdate = true;
    scene.add(postMesh);
  }
  if(railMatrices.length>0){
    var railMesh = new THREE.InstancedMesh(railUnitGeo, fenceMat, railMatrices.length);
    var rm4=new THREE.Matrix4(), xAxis=new THREE.Vector3(1,0,0), dir=new THREE.Vector3(), rq=new THREE.Quaternion(), mid=new THREE.Vector3(), rs=new THREE.Vector3();
    railMatrices.forEach(function(r,i){
      dir.set(r.bx-r.ax, r.by-r.ay, r.bz-r.az);
      var L=dir.length()||0.001; dir.multiplyScalar(1/L);
      rq.setFromUnitVectors(xAxis, dir);
      mid.set((r.ax+r.bx)*0.5, (r.ay+r.by)*0.5, (r.az+r.bz)*0.5);
      rs.set(L,1,1);
      rm4.compose(mid,rq,rs);
      railMesh.setMatrixAt(i,rm4);
    });
    railMesh.instanceMatrix.needsUpdate = true;
    scene.add(railMesh);
  }

  // ---- worn door-paths: a strip from each door toward the nearest street,
  // jogged sideways along the street's own direction so it meets the road
  // at a natural angle rather than square perpendicular. Collected into
  // SPLAT_DOOR_PATHS and painted by renderGroundSplat() (GROUND SPLAT-MAP,
  // near the terrain build) instead of built as their own drape mesh. ----
  function nearestStreetPoint(x,z){
    var best=null, bestD=Infinity;
    PLACEMENT_STREET_SEGS.forEach(function(seg){
      var dx=seg.x1-seg.x0, dz=seg.z1-seg.z0, len2=dx*dx+dz*dz;
      var t = len2>0 ? ((x-seg.x0)*dx+(z-seg.z0)*dz)/len2 : 0;
      t = clamp(t,0,1);
      var px=seg.x0+dx*t, pz=seg.z0+dz*t, d=Math.hypot(x-px,z-pz);
      if(d<bestD){ var invLen=1/Math.sqrt(len2||1); bestD=d; best={x:px,z:pz,dirx:dx*invLen,dirz:dz*invLen}; }
    });
    return best;
  }
  function bestDistCheck(sp,x,z){ return Math.hypot(sp.x-x, sp.z-z); }
  VILLAGE_BUILDING_SPOTS.forEach(function(spot){
    if(rngBuild()>=0.35) return;
    var faceDist = spot.d*0.5+0.3;
    var doorX = spot.x+Math.sin(spot.rot)*faceDist, doorZ = spot.z+Math.cos(spot.rot)*faceDist;
    var sp = nearestStreetPoint(doorX,doorZ);
    if(!sp || bestDistCheck(sp,doorX,doorZ)>26) return;
    var jog = (rngBuild()-0.5)*10; // meters along the street's own direction -- avoids a square approach
    if(spot.foundedDay!=null) return; // s56: no worn door-path to a door that doesn't exist yet (draws consumed above)
    var tx = sp.x+sp.dirx*jog, tz = sp.z+sp.dirz*jog;
    SPLAT_DOOR_PATHS.push({ doorX:doorX, doorZ:doorZ, tx:tx, tz:tz });
  });
})();

/* @P1850-CHUNK 44 — physical signage for named landmarks */
/* =====================================================================
   PHYSICAL SIGNAGE FOR NAMED LANDMARKS (coordinator directive): the plaza's
   documented establishments (El Dorado, Parker House, City Hotel, etc.)
   previously only had a DOM label chip — no in-world identity below the
   distance a chip is legible. A painted wall board with the real name,
   mounted the same way as the trade-word shingles above, makes them
   readable at bubble/near range by architecture+signage alone, per the
   "signs ARE the wayfinding, chips are the fallback" directive.
   ===================================================================== */
(function buildNamedLandmarkSignage(){
  NAMED_BUILDING_SPOTS.forEach(function(spot){
    // era-gate fix: keep the sign board reference so updateEraGating() can
    // hide it along with the building until spot.foundedDay.
    spot._signMesh = mountSignBoard(spot, spot.name.toUpperCase(), null, spot.h ? spot.h*0.55 : 1.7);
    if(spot.foundedDay!=null) spot._signMesh.visible = simDay >= spot.foundedDay;
  });
})();

/* @P1850-CHUNK 56 — type-differentiated buildings */
/* =========================================================================
   PL-A LEFTOVER, COMPLETED — TYPE-DIFFERENTIATED BUILDINGS. placeBuilding()
   places every building identically (systems-inventory's own finding: "the
   app currently places all buildings generically with zero functional
   typing at all"). Rather than perform that surgery inside placeBuilding
   itself — its merged buildingsMesh geometry has fire-system vStart/vEnd
   slices per building that must stay exactly as recorded (Dec 24 1849 burn
   depends on them) — this is a SEPARATE accent pass, entirely additive:
   assign a .type to every already-placed VILLAGE_BUILDING_SPOTS entry,
   then bake small extra geometry into its OWN new static meshes (never
   touching buildingsMesh/windowsMesh). Houses get no accent at all —
   "houses stay domestic" per the brief.
   ========================================================================= */
// PL-A leftover, completed — mid-zoom (250-900m) business glyph tier: which
// engraved-style icon each business-typed building gets, keyed off its
// signed trade word where one exists (fork=food trades, barrel=goods/
// chandlery, anvil=smith trades, bed=lodging, cards=gambling); unnamed
// generic "business" spots (the scattered ~16% roll below) get a
// deterministic fallback so the same building always shows the same icon.
var GLYPH_FOR_WORD = { GROCER:"fork", PROVISIONS:"fork", "DRY GOODS":"barrel", "TIN SHOP":"anvil", "SHIP CHANDLERY":"barrel", BOARDING:"bed" };
var GLYPH_FALLBACK_POOL = ["fork","glass","barrel","anvil"];
var BIZ_GLYPH_SPOTS = []; // {x,z,y,h,glyph} — fed to the DOM glyph-label pool below
(function buildBuildingTypeAccents(){
  var signedByPos = {};
  SIGN_BUILDING_SPOTS.forEach(function(s){ signedByPos[s.x.toFixed(1)+"_"+s.z.toFixed(1)] = s.word; });
  var accentGeoms = [], glowGeoms = [];
  var rundownMargin = 40; // "just past the surveyed edge" — same reading buildVillage's own squatter-hut placement already uses
  VILLAGE_BUILDING_SPOTS.forEach(function(spot){
    var type = "house";
    if(GAMBLING_BUILDING_NAMES[spot.name]) type = "gambling";
    else if(spot.name==="City Hotel") type = "hotel";
    else if(!spot.name && signedByPos[spot.x.toFixed(1)+"_"+spot.z.toFixed(1)]) type = "business";
    else if(!spot.name && distOutsideBox(spot.x, spot.z, VILLAGE_BOX) > rundownMargin) type = "rundown";
    else if(!spot.name && rngBuild() < 0.16) type = "business"; // a scattering of unnamed shopfronts beyond the 6 signed trades
    spot.type = type;
    if(type==="house") return; // no accent — domestic buildings stay as placeBuilding() made them

    var word = signedByPos[spot.x.toFixed(1)+"_"+spot.z.toFixed(1)];
    var glyph = type==="gambling" ? "cards" : type==="hotel" ? "bed" : type==="rundown" ? null :
      (word && GLYPH_FOR_WORD[word]) || GLYPH_FALLBACK_POOL[Math.floor(rngBuild()*GLYPH_FALLBACK_POOL.length)];
    if(glyph) BIZ_GLYPH_SPOTS.push({ x:spot.x, z:spot.z, y:spot.y, h:spot.h, glyph:glyph, foundedDay:spot.foundedDay });

    var s = Math.sin(spot.rot), c = Math.cos(spot.rot);
    function localToWorld(lx,ly,lz){ return new THREE.Vector3(spot.x+lx*c+lz*s, spot.y+ly, spot.z-lx*s+lz*c); }

    if(type==="business"){
      // false front: a raised flat parapet above the roofline on the front face
      var frontZ = spot.d/2+0.05, frontW = spot.w*0.94, frontH = spot.h*0.55;
      var front = new THREE.PlaneGeometry(frontW, frontH).toNonIndexed();
      colorizeUniform(front, new THREE.Color(0x9c8f6e));
      front.rotateY(spot.rot);
      var fp = localToWorld(0, spot.h+frontH*0.5, frontZ);
      front.translate(fp.x, fp.y, fp.z);
      accentGeoms.push(front);
      // wider door threshold — a broader dark board at grade, front-and-center
      var doorW = new THREE.PlaneGeometry(1.8,1.0).toNonIndexed();
      colorizeUniform(doorW, new THREE.Color(0x3a3226));
      doorW.rotateY(spot.rot);
      var dp = localToWorld(0, 0.5, frontZ+0.01);
      doorW.translate(dp.x,dp.y,dp.z);
      accentGeoms.push(doorW);
      // evening glow — a wide warm shop-window band, lit only at night (see updateDayNight, windowsMesh's own opacity driver)
      var glow = new THREE.PlaneGeometry(1.6,0.7).toNonIndexed();
      colorizeUniform(glow, new THREE.Color(0xffcf8a));
      glow.rotateY(spot.rot);
      var gp = localToWorld(spot.w*0.28, spot.h*0.5, frontZ+0.015);
      glow.translate(gp.x,gp.y,gp.z);
      glowGeoms.push(glow);
    } else if(type==="gambling"){
      // lantern pair flanking the doorway
      [-1,1].forEach(function(side){
        var wp = localToWorld(side*spot.w*0.32, spot.h*0.5, spot.d/2+0.15);
        var lant = new THREE.BoxGeometry(0.16,0.22,0.16).toNonIndexed();
        colorizeUniform(lant, new THREE.Color(0xffd27a));
        lant.translate(wp.x, wp.y, wp.z);
        glowGeoms.push(lant);
      });
    } else if(type==="hotel"){
      // porch hint: a shallow roofed overhang across the front face, two posts
      var porchW = spot.w*0.9, porchD = 1.3, porchH = 0.15;
      var porch = makeBoxLocal(porchW, porchH, porchD, new THREE.Color(0x746048));
      bake(porch, localToWorld(0, spot.h*0.62, spot.d/2+porchD/2), spot.rot);
      accentGeoms.push(porch);
      [-1,1].forEach(function(pi){
        var post = new THREE.CylinderGeometry(0.06,0.06,spot.h*0.62,6).toNonIndexed();
        colorizeUniform(post, new THREE.Color(0x5a4432));
        var pp = localToWorld(pi*porchW*0.45, spot.h*0.31, spot.d/2+porchD-0.1);
        post.translate(pp.x, pp.y, pp.z);
        accentGeoms.push(post);
      });
    } else if(type==="rundown"){
      // town-edge grit: a patched, grayed weather-board reads rundown against the plaza's tidier core
      var patch = new THREE.PlaneGeometry(spot.w*0.5, spot.h*0.6).toNonIndexed();
      colorizeUniform(patch, new THREE.Color(0x565044));
      patch.rotateY(spot.rot+0.06);
      var pp2 = localToWorld(spot.w*0.15, spot.h*0.4, spot.d/2+0.03);
      patch.translate(pp2.x, pp2.y, pp2.z);
      accentGeoms.push(patch);
    }
  });
  if(accentGeoms.length>0){
    window.buildingTypeAccentMesh = new THREE.Mesh(mergeGeoms(accentGeoms), new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, transparent:true, specular:0x000000, shininess:0}));
    scene.add(window.buildingTypeAccentMesh);
  }
  if(glowGeoms.length>0){
    window.buildingGlowAccentMesh = new THREE.Mesh(mergeGeoms(glowGeoms), new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, opacity:0}));
    scene.add(window.buildingGlowAccentMesh);
  }
})();

/* (VENUE_KEY_RESOLVERS + worksiteForOccupation() — people's schedule/venue
   binding, implemented on people.js internals — relocated to people.js
   (end of its homes-&-workplaces chunk) in the 2026-07-12 cleanup. People
   OWNS schedules/routing consumption; fauna's ranch/region/natural resolver
   extensions still register before any slot is built.) */

/* ---- buildings audit (layers-spec.md rules block): a structure's footprint
   intersects NO right-of-way, any era — wraps the existing __P1850.roadAudit
   (s62 constant-width amendment; 0/1,890 at landing). ---- */
registerAudit("buildings", "rightOfWay", function(){
  var r = window.__P1850.roadAudit();
  return { pass: r.violations===0, checked: r.checked, violations: r.violations, list: r.list };
});

/* @P1850-CHUNK 47 — the lumber dealer (relocated from doodads.js, cleanup 2026-07-12 — buildings OWNS structures/signs; exact original global position, right after doodads assigns waterfrontBeachLines which it reads) */
/* =====================================================================
   THE LUMBER DEALER (behavior-spec.md item 4 — a documented building-
   materials trade): closes catalog-occupations.json's
   missing:lumber_yard_timber_stand gap for woodcutter_woodyard, and gives
   staged construction (below) a real materials source that supply carts
   travel from. Sited on the working beach — lumber arrived by ship, same
   waterfront the timber-stack waterfront-life props already occupy.
   (Placed here, after waterfrontBeachLines is actually assigned, rather
   than up with the other yard objects — it reads that array directly.)
   ===================================================================== */
var LUMBER_YARD_SPOT = (function buildLumberYard(){
  var ln = waterfrontBeachLines[Math.max(0, Math.floor(waterfrontBeachLines.length*0.78))] || null;
  var p = ln ? { x:lerp(ln.landX,ln.waterX,0.4), z:ln.z } : { x:WORKSITE_WHARF ? WORKSITE_WHARF.x : PLAZA_CENTER.x, z:PLAZA_CENTER.z };
  var y = terrainHeight(p.x,p.z);
  registerPlacement(p.x,p.z,7);
  var geoms = [];
  for(var s=0;s<3;s++){
    var stack = makeTimberStackGeo();
    bake(stack, new THREE.Vector3((s-1)*2.6, 0, (s%2)*1.2), s*0.5);
    geoms.push(stack);
  }
  // a simple open lean-to roof over the stacks — posts + gable, no walls
  var postColor = new THREE.Color(0x5a4632), roofColor = new THREE.Color(0x6b5238);
  [[-3.2,-2.2],[3.2,-2.2],[-3.2,2.2],[3.2,2.2]].forEach(function(o){
    var post = makeBoxLocal(0.22,3.0,0.22,postColor); bake(post, new THREE.Vector3(o[0],0,o[1])); geoms.push(post);
  });
  var roof = makeGableRoof(7.2,5.0,0.5,1.0,roofColor); bake(roof, new THREE.Vector3(0,3.0,0)); geoms.push(roof);
  var merged = mergeGeoms(geoms);
  bake(merged, new THREE.Vector3(p.x,y,p.z), 0.15);
  scene.add(new THREE.Mesh(merged, new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, side:THREE.DoubleSide, specular:0x000000, shininess:0})));
  mountSignBoard({x:p.x,z:p.z,y:y,rot:0.15,d:5.0}, "LUMBER YARD", null, 3.3);
  console.log("[verify] Lumber yard at ("+p.x.toFixed(0)+","+p.z.toFixed(0)+")");
  return { key:"lumberyard", label:"the lumber yard", x:p.x, z:p.z, activity:"stationary" };
})();

/* dev-tooling visibility interface (layers-spec.md §15): this layer's visibility toggle */
registerLayerVisibility("buildings", function(v){ [buildingsMesh, windowsMesh, growthBuildingMesh, growthBuildingMesh2, growthCommercialMesh, ironHouseMesh, growthMaterialsMesh, growthFrameMesh, growthWallsMesh, constructionWorkerMesh, supplyCartMesh, tentMesh, campfireMesh, window.buildingTypeAccentMesh, window.buildingGlowAccentMesh].forEach(function(m){ if(m) m.visible = v; }); });
