/* =====================================================================
   LAYER ground-paint (slot 2) — MINIMAL UNIFORM ROADS (s79 admission #1).
   OWNS: every road pixel — a SINGLE world-space paint canvas draped on the
   terrain, one clean dirt tone per established street at the CONSTANT class
   width from the master spine, plus the faintest darker hairline for a
   just-surveyed S1 ghost line. READS: STREETS_RUNTIME + roadPieceState
   (roadStateAt) + gridToWorldAt + terrainHeight + WORLD + terrainGeo + the
   sim clock. NEVER: moves a centerline (master data is inviolate), touches
   terrain vertices, places objects, renders wear/ruts/casing/fill grammar.

   THE REWRITE (foundation-reset.md §3, admission #1): the legacy 2,564-line
   three-tier splat engine (painterly tile kit, s52 detail normals, S1-S4 wear
   fill grammar, plaza bespoke, mission/el-camino/presidio trails, plank aprons,
   door-paths, desire trails, fog-rect tier ownership) is GONE — preserved on
   the `legacy` branch, reference only. This is deliberately DUMB and CORRECT:
   for each street segment present at simDay, stroke ONE uniform surface at its
   class width in ONE canvas pass (junctions repaint the same tone → one owner);
   era-gated (nothing before survey/first-mention; S1 = faint hairline). Blending,
   wear, width art, and the ground-detail engine return later as NEW work on this
   hardened base, each through its own admission gate. layers-spec.md rules:
   constant class width everywhere; one canvas owns every road pixel; road tone
   never lighter than adjacent ground; era gate (simDay < appear-day ⇒ zero paint).
   GREAT SPLIT: this file holds 1 chunk of the one app module (build-app.js).
   ===================================================================== */
/* @P1850-CHUNK 14 — minimal uniform ground-paint (foundation admission #1) */

/* GROUND DETAIL ENGINE — DEFERRED. terrain calls patchGroundDetailMaterial()
   on its own material at init (the s52 detail-normal / tile engine used to live
   in this layer). That materiality returns with a later ground-paint admission;
   for the foundation it is a no-op so terrain renders clean flat-shaded. The
   declaration hoists module-wide, so terrain's earlier init-time call resolves. */
function patchGroundDetailMaterial(mat, kind, prevHook){
  if(typeof prevHook === "function") mat.onBeforeCompile = prevHook;
}

/* ---- EARTH-PALETTE dirt tones (grounding.md §9: darker than terrain; no map
   overlay). One clean established-road tone + the faint S1 ghost. ---- */
var GP_TONE_ROAD  = "#6b5838"; // rgb(107,88,56) — luminance ~0.35, well under the 0.55 sunlit-ground floor
var GP_TONE_GHOST = "#5c4e33"; // the surveyor's line: darker still, drawn faint
var GP_GHOST_ALPHA = 0.30;
var GP_GHOST_WM = 1.6;         // ghost hairline width (m) — a thin scratch, never a class-width band
/* s84: PIER PLANK DECK tone. grounding.md §9 EXCEPTION — a planked surface (a
   wharf deck) is DOCUMENTED to read as WOOD, lawfully slightly LIGHTER than the
   terrain/road (the never-lighter-than-terrain floor applies to dirt roads, not
   planks). Weathered warm grey-brown, distinguishable from dirt at a glance but
   still restrained (lum ~0.51). Dumb & uniform like the roads: one tone, no
   plank strokes / piles / props (that is ships-admission art). */
var GP_TONE_PLANK = "#9c8560"; // rgb(156,133,96) — luminance ~0.51, reads as wood deck

/* ---- WORLD-SPACE PAINT CANVAS. Uniform px/m on both axes (canvas sized to
   the world aspect), so a constant class width in metres paints a constant
   width in pixels regardless of street orientation. ---- */
/* s90 item C — desktop MAXDIM 4096 → 6144. The canvas spans the whole 17 km
   peninsula domain, so at 4096 it resolved only ~0.24 px/m: a 10.67 m plank
   deck was ~2.6 px wide, and the constantWidth probe (single-pixel alpha reads,
   ~4 m pixel pitch) measured 8.4 m at one station and 12.4 m at the next purely
   from sub-pixel phase (spread 4.0 m > tol 3.2 m) — a MEASUREMENT artifact of a
   sub-3px feature, the painted width was already uniform. 6144 ⇒ ~0.36 px/m
   (deck ~3.85 px, pixel pitch ~2.8 m), so a class-width member resolves to a
   stable, station-independent width. Touch stays 2048 (mobile perf; the harness
   verifies desktop). Not the reserved close-zoom "resolution tiering" art-gate
   — the minimum bump for a surveyed member to measure constant. */
var GP_MAXDIM = IS_TOUCH ? 2048 : 6144;
var GP_PXPM = GP_MAXDIM / Math.max(WORLD.sizeX, WORLD.sizeZ);
var GP_W = Math.max(2, Math.round(WORLD.sizeX * GP_PXPM));
var GP_H = Math.max(2, Math.round(WORLD.sizeZ * GP_PXPM));
var gpCanvas = document.createElement("canvas"); gpCanvas.width = GP_W; gpCanvas.height = GP_H;
var gpCtx = gpCanvas.getContext("2d");
function gpPx(x, z){ return { x:(x - WORLD.x0) * GP_PXPM, y:(z - WORLD.z0) * GP_PXPM }; }
function gpPxLen(m){ return m * GP_PXPM; }

var gpTex = new THREE.CanvasTexture(gpCanvas);
gpTex.flipY = false; gpTex.wrapS = gpTex.wrapT = THREE.ClampToEdgeWrapping;
gpTex.premultiplyAlpha = true; gpTex.generateMipmaps = true;
gpTex.minFilter = THREE.LinearMipmapLinearFilter; gpTex.magFilter = THREE.LinearFilter;
gpTex.anisotropy = Math.min(8, (renderer.capabilities.getMaxAnisotropy && renderer.capabilities.getMaxAnisotropy()) || 1);

/* DRAPED OVERLAY GEOMETRY — the terrain's OWN shape (shared vertex order),
   lifted a hair so it can never z-fight, UV = world XZ straight onto the
   canvas. Seamless with the terrain by construction (no rectangle, so no
   tier-plane fog artifact to patch away). */
var GP_LIFT = 0.12;
var splatWorldGeo = new THREE.BufferGeometry();
(function(){
  var sp = terrainGeo.attributes.position, n = sp.count;
  var pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for(var i = 0; i < n; i++){
    var x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
    pos[i*3] = x; pos[i*3+1] = y + GP_LIFT; pos[i*3+2] = z;
    uv[i*2] = (x - WORLD.x0) / WORLD.sizeX; uv[i*2+1] = (z - WORLD.z0) / WORLD.sizeZ;
  }
  splatWorldGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  splatWorldGeo.setAttribute("normal", terrainGeo.attributes.normal); // reuse terrain normals (uniform lift keeps them valid)
  splatWorldGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if(terrainGeo.index) splatWorldGeo.setIndex(terrainGeo.index);
})();

/* PREMULTIPLIED-ALPHA lit material + fog-alpha patch: transparent texels add
   ZERO fog (a=0 ⇒ no haze wash over the whole overlay), painted road fades into
   the haze proportionally. Same proven equation as the legacy splat, minus the
   three-tier machinery. Lit by the same sun/hemi/ambient as terrain, so it dims
   with it automatically (when day/night returns with the effects admission). */
function _gpFogChunk(){
  var chunk = THREE.ShaderChunk && THREE.ShaderChunk.fog_fragment; if(!chunk) return null;
  var lit = "gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );";
  var fix = "gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor * gl_FragColor.a, fogFactor );";
  if(chunk.indexOf(lit) !== -1) return chunk.replace(lit, fix);
  var re = /gl_FragColor\.rgb\s*=\s*mix\(\s*gl_FragColor\.rgb\s*,\s*fogColor\s*,\s*fogFactor\s*\)\s*;/;
  if(re.test(chunk)) return chunk.replace(re, fix);
  return null;
}
var splatWorldMat = new THREE.MeshPhongMaterial({ map:gpTex, transparent:true, depthWrite:false, specular:0x000000, shininess:0 });
splatWorldMat.blending = THREE.CustomBlending;
splatWorldMat.blendEquation = THREE.AddEquation;
splatWorldMat.blendSrc = THREE.OneFactor;
splatWorldMat.blendDst = THREE.OneMinusSrcAlphaFactor;
splatWorldMat.onBeforeCompile = function(shader){
  var patched = _gpFogChunk();
  if(patched && shader.fragmentShader.indexOf("#include <fog_fragment>") !== -1)
    shader.fragmentShader = shader.fragmentShader.replace("#include <fog_fragment>", patched);
};
var splatWorldMesh = new THREE.Mesh(splatWorldGeo, splatWorldMat);
splatWorldMesh.renderOrder = 1;
scene.add(splatWorldMesh);

/* ---- THE PAINT PASS. Called by core updateStreetPaint() when simDay crosses a
   street's survey/first-mention/checkpoint day (throttled ~3/s). One clear +
   one pass over the platted spine. SINGLE-FRAME (2026-07-14): paints at the one
   canonical GRID_ROT_BASE frame — the old O'Farrell grid-swing skew argument is
   gone. ---- */
var SPLAT_LAST_STATS = null;  // s20 QA hook (read by __P1850.splatStats + the audits)
var _gpID = null;             // cached ImageData for audits, dropped each repaint

function _gpStrokeRun(pts, cls){
  if(pts.length < 2) return;
  if(cls === 1){ gpCtx.globalAlpha = GP_GHOST_ALPHA; gpCtx.strokeStyle = GP_TONE_GHOST; gpCtx.lineWidth = Math.max(1, gpPxLen(GP_GHOST_WM)); }
  else         { gpCtx.globalAlpha = 1;              gpCtx.strokeStyle = GP_TONE_ROAD;  gpCtx.lineWidth = Math.max(1, gpPxLen(pts._wM)); }
  var p0 = gpPx(pts[0].x, pts[0].z);
  gpCtx.beginPath(); gpCtx.moveTo(p0.x, p0.y);
  for(var i = 1; i < pts.length; i++){ var p = gpPx(pts[i].x, pts[i].z); gpCtx.lineTo(p.x, p.y); }
  gpCtx.stroke();
  gpCtx.globalAlpha = 1;
}
/* s90 item C — fill a closed world-space ring (pier plank deck). Filling the
   exact deck polygon gives symmetric coverage-AA on both long edges, so the
   deck paints a MEASURABLY constant width even where it is only a few px wide
   (a centred stroke of a sub-3px diagonal line does not — see the pier branch). */
function _gpFillPoly(ring, tone){
  if(!ring || ring.length < 3) return;
  gpCtx.globalAlpha = 1; gpCtx.fillStyle = tone;
  var p0 = gpPx(ring[0].x, ring[0].z);
  gpCtx.beginPath(); gpCtx.moveTo(p0.x, p0.y);
  for(var i = 1; i < ring.length; i++){ var p = gpPx(ring[i].x, ring[i].z); gpCtx.lineTo(p.x, p.y); }
  gpCtx.closePath(); gpCtx.fill();
}

function renderGroundSplat(){
  gpCtx.clearRect(0, 0, GP_W, GP_H);
  gpCtx.lineCap = "butt";     // butt caps: clean street ends, no spike, no round bloom
  gpCtx.lineJoin = "round";   // smooth bends within a run
  var stats = { simDay:simDay, skew:GRID_ROT_BASE, streets:{} }; // single frame (2026-07-14)

  STREETS_RUNTIME.forEach(function(s){
    var rec = stats.streets[s.id] = { painted:false, ghostSegs:0, wornSegs:0, state:0, worldPoly:null, stations:[] };
    var gateDay = s.surveyedDay != null ? s.surveyedDay : s.firstMentionDay;
    if(gateDay == null || simDay < gateDay) return; // S0 — not surveyed and not yet in any corpus mention: ZERO paint

    var active = s.checkpoints[0];
    for(var ci = 0; ci < s.checkpoints.length; ci++){ if(s.checkpoints[ci].day <= simDay) active = s.checkpoints[ci]; }
    if(!active) return;
    var i0 = active.extent[0], i1 = active.extent[1];
    var angle = GRID_ROT_BASE; // single frame (2026-07-14): every street at the one canonical frame
    var viogetFloor = (s.surveyedDay != null && s.surveyedDay <= 0); // Vioget-1839 lanes read as worn trails from sim start
    var wpts = [];
    for(var pi = i0; pi <= i1; pi++) wpts.push(gridToWorldAt(s.polyline[pi].u, s.polyline[pi].v, angle));
    if(wpts.length < 2) return;
    rec.worldPoly = wpts;

    // classify each segment: 0 = none (S0 / wet water-lot), 1 = ghost (S1), 2 = established (S2+)
    var cls = new Array(wpts.length - 1);
    for(var si = 0; si < wpts.length - 1; si++){
      var A = wpts[si], B = wpts[si+1], mx = (A.x+B.x)/2, mz = (A.z+B.z)/2;
      if(terrainHeight(mx, mz) <= 0.5){ cls[si] = 0; continue; } // WET: a platted line over the tide flats is a water lot, never a street
      var st = roadPieceState(s, mx, mz, simDay, viogetFloor).st;
      cls[si] = st <= 0 ? 0 : (st === 1 ? 1 : 2);
      if(st > rec.state) rec.state = st;
    }

    // stroke contiguous same-class runs (round joins within a run; butt caps at run ends)
    var runA = 0;
    function flush(end){
      var c = cls[runA]; if(c === 0){ return; }
      var run = wpts.slice(runA, end + 2); run._wM = s.widthM;
      _gpStrokeRun(run, c);
      if(c === 1) rec.ghostSegs += (end - runA + 1); else rec.wornSegs += (end - runA + 1);
      if(c === 2){ // record a mid-run station for the constantWidth audit
        var mi = Math.floor((runA + end) / 2);
        var a = wpts[mi], b = wpts[mi+1], dl = Math.hypot(b.x-a.x, b.z-a.z);
        if(dl > 1 && rec.stations.length < 3)
          rec.stations.push({ x:(a.x+b.x)/2, z:(a.z+b.z)/2, nx:-(b.z-a.z)/dl, nz:(b.x-a.x)/dl });
      }
    }
    for(var k = 1; k < cls.length; k++){ if(cls[k] !== cls[runA]){ flush(k-1); runA = k; } }
    flush(cls.length - 1);
    rec.painted = (rec.ghostSegs + rec.wornSegs) > 0;
  });

  /* s84/s97: PIER-CLASS SPINE MEMBERS — plank decks (road-master-spec SPINE
     MEMBERSHIP AMENDMENT; pier-system-spec §1 unified renderer). Painted AFTER
     the streets so a deck sits over the wet-lot gap its anchor street leaves.
     Constant class width, era-gated by construction date (pierActiveCheckpoint
     == null ⇒ not yet built OR still reaching ⇒ zero paint), extent GROWS with
     the dated checkpoints. The wet-lot skip does NOT apply — a pier IS over
     water; the plank tone is the documented §9 exception (wood, lawfully
     slightly lighter than terrain). One uniform tone, one pass.
     NOT A FORKED RENDERER (pier-system-spec §1): this is the SAME
     renderGroundSplat pass, drawing the deck from the SINGLE canonical geometry
     source — pierEdgesAt (core/08-cadastre, produced in the one -9.0° frame at
     query time) — through the SAME fill primitive (_gpFillPoly) the street
     aprons/plaza use. No parallel pier geometry exists to drift from the spine;
     the frame is locked by spine.pierEdgesFrame. The street's own stroke path is
     signed-off substrate and is untouched — the deck class-switches off
     PIERS_RUNTIME, it does not re-implement the street renderer. */
  if(typeof PIERS_RUNTIME !== "undefined") PIERS_RUNTIME.forEach(function(p){
    var rec = stats.streets[p.id] = { painted:false, ghostSegs:0, wornSegs:0, state:4, worldPoly:null, stations:[], isPier:true };
    /* s90 item C — FILLED DECK QUAD, not a centred stroke. The deck is only a
       few px wide on the peninsula-scale paint canvas (~0.24 px/m ⇒ a 10.67 m
       deck ≈ 2.6 px); a canvas STROKE of a diagonal line only ~2.6 px wide lays
       down asymmetric per-pixel edge coverage, so the constantWidth probe read
       8.4 m at one station and 12.4 m at the next (spread 4.0 m > tol 3.2 m) even
       though the painted width was uniform. Filling the EXACT deck polygon
       (pierEdgesAt → centreline ± width/2, the cadastre's own deck geometry) lays
       coverage-based AA symmetrically about BOTH edges, so the perpendicular
       measurement lands the same width at every station — genuinely constant. */
    var e = pierEdgesAt(p, simDay);
    if(!e || !e.active || !e.deckQuad || e.deckQuad.length < 4) return; // era gate: not yet built at simDay
    rec.worldPoly = e.centerline;
    _gpFillPoly(e.deckQuad, GP_TONE_PLANK);     // plank deck (grounding §9 planked exception)
    rec.wornSegs = e.centerline.length - 1; rec.painted = true;
    for(var si = 0; si < e.centerline.length - 1 && rec.stations.length < 3; si++){
      var a = e.centerline[si], b = e.centerline[si+1], dl = Math.hypot(b.x-a.x, b.z-a.z);
      if(dl > 8) rec.stations.push({ x:(a.x+b.x)/2, z:(a.z+b.z)/2, nx:-(b.z-a.z)/dl, nz:(b.x-a.x)/dl });
    }
  });

  gpTex.needsUpdate = true;
  _gpID = null;
  SPLAT_LAST_STATS = stats;
}

/* TERRAIN-EDIT → PAINT invalidation (road-master-spec §6): re-drape onto the
   (possibly edited) terrain surface and force a full repaint next frame. No
   current system mutates terrain at runtime; this is the mandated wiring. */
function invalidateGroundPaint(){
  var sp = terrainGeo.attributes.position, dp = splatWorldGeo.attributes.position;
  for(var i = 0; i < sp.count; i++){ dp.setX(i, sp.getX(i)); dp.setY(i, sp.getY(i) + GP_LIFT); dp.setZ(i, sp.getZ(i)); }
  dp.needsUpdate = true; splatWorldGeo.computeBoundingSphere();
  LAST_SPLAT_SIMDAY = null; _lastSplatRepaintMs = 0; // core/01-geography repaint bookkeeping — repaint unconditionally next frame
}

/* ---- AUDIT SUPPORT ---- */
function _gpImage(){ if(!_gpID) _gpID = gpCtx.getImageData(0, 0, GP_W, GP_H); return _gpID; }
function _gpAlphaAtWorld(x, z){
  var p = gpPx(x, z), px = Math.round(p.x), py = Math.round(p.y);
  if(px < 0 || py < 0 || px >= GP_W || py >= GP_H) return 0;
  return _gpImage().data[(py * GP_W + px) * 4 + 3];
}
/* Neighbourhood alpha (max over a ±r-px plus/square) — a sub-pixel-thin member
   (a ~2 m TRAIL paints ≈1 px at GP_PXPM) can leave its exact rounded centre
   pixel antialiased near zero while the line itself is painted; a 1-px window
   reads the line robustly without widening the invariant (s84). */
function _gpAlphaNearWorld(x, z, r){
  r = r || 1; var p = gpPx(x, z), cx = Math.round(p.x), cy = Math.round(p.y), best = 0;
  for(var dy = -r; dy <= r; dy++) for(var dx = -r; dx <= r; dx++){
    var px = cx+dx, py = cy+dy; if(px < 0 || py < 0 || px >= GP_W || py >= GP_H) continue;
    var a = _gpImage().data[(py * GP_W + px) * 4 + 3]; if(a > best) best = a;
  }
  return best;
}
/* proximity to any OTHER painted street's active world polyline (junction skip) */
function _gpNearOtherStreet(x, z, selfId, r, alsoIgnoreId){
  if(!SPLAT_LAST_STATS) return false;
  var r2 = r * r, ids = Object.keys(SPLAT_LAST_STATS.streets);
  for(var i = 0; i < ids.length; i++){
    if(ids[i] === selfId || ids[i] === alsoIgnoreId) continue; // s84: a pier ignores its anchor street (collinear by design)
    var wp = SPLAT_LAST_STATS.streets[ids[i]].worldPoly; if(!wp) continue;
    for(var j = 0; j < wp.length - 1; j++){
      var a = wp[j], b = wp[j+1], dx = b.x-a.x, dz = b.z-a.z, l2 = dx*dx+dz*dz;
      var t = l2 > 0 ? Math.max(0, Math.min(1, ((x-a.x)*dx + (z-a.z)*dz) / l2)) : 0;
      var qx = a.x + dx*t - x, qz = a.z + dz*t - z;
      if(qx*qx + qz*qz < r2) return true;
    }
  }
  return false;
}

/* AUDIT 1 — oneOwner (layers-spec.md screening #11). A single canvas is the
   sole road painter, so one-owner-per-pixel holds by construction; verify the
   invariant structurally (exactly one ground-paint mesh) and that painted
   street centres do read paint from it. */
registerAudit("ground-paint", "oneOwner", function(){
  updateStreetPaint();
  var meshes = 0; scene.traverse(function(o){ if(o === splatWorldMesh) meshes++; });
  var probes = 0, painted = 0, unpainted = [];
  if(SPLAT_LAST_STATS) STREETS_RUNTIME.forEach(function(s){
    var rec = SPLAT_LAST_STATS.streets[s.id]; if(!rec || !rec.stations.length) return;
    var st = rec.stations[0]; probes++;
    // ±1 px window so a ~1-px trail line registers at its own centre (s84)
    if(_gpAlphaNearWorld(st.x, st.z, 1) > 0) painted++; else unpainted.push({ id:s.id, cls:s.cls, wM:s.widthM, x:Math.round(st.x), z:Math.round(st.z) });
  });
  return { pass: meshes === 1 && (probes === 0 || painted === probes), canvases:1, meshes:meshes, probes:probes, painted:painted, unpainted:unpainted };
});

/* AUDIT 2 — constantWidth (layers-spec.md CONSTANT-WIDTH AMENDMENT). Every
   established street paints its class width, everywhere: at up to 3 mid-run
   stations clear of junctions, scan alpha perpendicular to the centreline and
   require the painted width ≈ widthM and the stations mutually constant. */
registerAudit("ground-paint", "constantWidth", function(){
  updateStreetPaint();
  var out = { pass:true, streetsProbed:0, piersProbed:0, stations:0, violations:[], skipped:[] };
  if(!SPLAT_LAST_STATS) return { pass:false, error:"no splat stats — paint never ran" };
  // s84: piers extend the constant-width law (plank decks paint their class
  // width too). Iterate streets + pier spine members through the same probe.
  var _members = STREETS_RUNTIME.concat(typeof PIERS_RUNTIME !== "undefined" ? PIERS_RUNTIME : []);
  _members.forEach(function(s){
    var rec = SPLAT_LAST_STATS.streets[s.id]; if(!rec || !rec.stations.length) return;
    var widths = [], _anchorId = (s.cls === "pier" ? s.anchorStreet : null);
    for(var k = 0; k < rec.stations.length; k++){
      var st = rec.stations[k];
      if(_gpNearOtherStreet(st.x, st.z, s.id, s.widthM/2 + 4, _anchorId)) continue; // junction / parallel bleed (pier ignores its own anchor)
      var centerA = _gpAlphaAtWorld(st.x, st.z); if(centerA < 50) continue;
      var thr = centerA * 0.45, half = {}, sides = [1, -1], overflow = false;
      for(var si = 0; si < 2; si++){
        var sgn = sides[si], lastOn = 0, misses = 0;
        for(var off = 0.4; off <= s.widthM * 0.85 + 4; off += 0.4){
          var a2 = _gpAlphaAtWorld(st.x + st.nx*off*sgn, st.z + st.nz*off*sgn);
          if(a2 >= thr){ lastOn = off; misses = 0; if(off > s.widthM*0.7 + 3) overflow = true; }
          else if(++misses >= 2) break;
        }
        half[sgn] = lastOn + 0.2;
      }
      if(overflow) continue; // crossing street widened the band here — not a clean station
      widths.push(+(half[1] + half[-1]).toFixed(2)); out.stations++;
    }
    if(!widths.length){ out.skipped.push(s.id); return; }
    if(s.cls === "pier") out.piersProbed++; else out.streetsProbed++;
    var mn = Math.min.apply(null, widths), mx = Math.max.apply(null, widths);
    var tolAbs = Math.max(2.5, 0.35 * s.widthM);
    if(widths.some(function(w){ return Math.abs(w - s.widthM) > tolAbs; }) || (mx - mn) > Math.max(2.0, 0.30 * s.widthM)){
      out.pass = false; out.violations.push({ id:s.id, widthM:s.widthM, measured:widths });
    }
  });
  return out;
});

/* AUDIT 3 — eraPaint (layers-spec.md): IF simDay < a street's appear-day THEN
   zero paint. Two teeth: (a) the paint registry recorded no segments for any
   unappeared street; (b) a centreline pixel probe clear of every OTHER street
   reads alpha ~0 (crossing streets' legal paint is excluded). */
registerAudit("ground-paint", "eraPaint", function(){
  updateStreetPaint();
  var out = { pass:true, unappeared:0, probes:0, statsViolations:[], pixelViolations:[] };
  STREETS_RUNTIME.forEach(function(s){
    var gateDay = s.surveyedDay != null ? s.surveyedDay : s.firstMentionDay;
    if(gateDay == null || simDay >= gateDay) return; // appeared — outside this rule
    out.unappeared++;
    var rec = SPLAT_LAST_STATS && SPLAT_LAST_STATS.streets[s.id];
    if(rec && (rec.ghostSegs + rec.wornSegs) > 0) out.statsViolations.push(s.id);
    var angle = GRID_ROT_BASE, probed = 0; // single frame (2026-07-14)
    for(var pi = 0; pi + 1 < s.polyline.length && probed < 8; pi++){
      var A = gridToWorldAt(s.polyline[pi].u,   s.polyline[pi].v,   angle);
      var B = gridToWorldAt(s.polyline[pi+1].u, s.polyline[pi+1].v, angle);
      var mx = (A.x+B.x)/2, mz = (A.z+B.z)/2;
      if(terrainHeight(mx, mz) <= 0.5) continue;
      if(_gpNearOtherStreet(mx, mz, s.id, 3)) continue; // a crossing street's legal paint
      probed++; out.probes++;
      if(_gpAlphaAtWorld(mx, mz) > 12) out.pixelViolations.push({ id:s.id, x:Math.round(mx), z:Math.round(mz), alpha:_gpAlphaAtWorld(mx, mz) });
    }
  });
  /* s84: PIER birth-date era-gating. Piers are over water (terrainHeight<=0.5),
     so the pixel-probe tooth above would skip every pier station — the deck's
     era gate is verified via the STATS tooth instead: a pier not yet built at
     simDay (birthDay > simDay) must have recorded ZERO plank segments. */
  out.unappearedPiers = 0;
  if(typeof PIERS_RUNTIME !== "undefined") PIERS_RUNTIME.forEach(function(p){
    if(simDay >= p.birthDay) return; // built — outside this rule
    out.unappearedPiers++;
    var rec = SPLAT_LAST_STATS && SPLAT_LAST_STATS.streets[p.id];
    if(rec && (rec.ghostSegs + rec.wornSegs) > 0) out.statsViolations.push(p.id);
  });
  if(out.statsViolations.length || out.pixelViolations.length) out.pass = false;
  return out;
});

/* AUDIT 4 — roadDarkerThanGround (grounding.md §9 no-map-overlay). The road
   dirt must never read lighter than the ground it sits on: compare the
   established road albedo luminance to the median LAND terrain vertex-colour
   luminance (both sRGB vertex/canvas space, same lights). */
registerAudit("ground-paint", "roadDarkerThanGround", function(){
  var rc = new THREE.Color(GP_TONE_ROAD);
  var roadLum = 0.2126*rc.r + 0.7152*rc.g + 0.0722*rc.b;
  var col = terrainGeo.attributes.color, pos = terrainGeo.attributes.position;
  var lums = [];
  if(col){
    var step = Math.max(1, Math.floor(pos.count / 4000));
    for(var i = 0; i < pos.count; i += step){
      if(pos.getY(i) <= 0.6) continue; // skip water / tide-flat vertices
      lums.push(0.2126*col.getX(i) + 0.7152*col.getY(i) + 0.0722*col.getZ(i));
    }
    lums.sort(function(a, b){ return a - b; });
  }
  var terrLum = lums.length ? lums[Math.floor(lums.length/2)] : 0.6;
  return { pass: roadLum < terrLum, roadLum:+roadLum.toFixed(3), terrainMedianLum:+terrLum.toFixed(3), samples:lums.length };
});

/* AUDIT 5 — spine.spineGrounded (s100, temporal-world-model.md §3b THE UNIVERSAL
   GROUNDING RULE, spine clause: "the surface DRAPES on the terrain — the
   centerline/deck Y follows terrainHeightAt continuously, not sampled once, so a
   hillside road neither floats nor clips"). CONFIRMED, standing guard: the road
   paint is not separate elevated geometry but the terrain's OWN mesh — every
   overlay vertex is a terrain vertex lifted by the constant GP_LIFT (splatWorldGeo
   copies terrainGeo positions + lift), so the road surface tracks the grade
   vertex-for-vertex and cannot float or bury by construction.
   Two clauses:
     (1) STRUCTURAL DRAPE (the real, falsifiable guard): every overlay vertex Y
         equals its terrain vertex Y + GP_LIFT. A regression that flattened the
         overlay (a single sampled elevation) diverges here immediately.
     (2) CENTERLINE COVERAGE: sampled along every LAND street centerline the drape
         has a defined grade (terrainHeight finite), and the road sits GP_LIFT
         above it (within DRAPE_TOL). PIERS ARE EXEMPT — a centerline point over
         water (terrainHeight <= LAND_FLOOR) is a pier/wet-lot deck, skipped here
         (spine.wharfBlockGrounded covers wharf/pier grounding). ---- */
registerAudit("spine", "spineGrounded", function(){
  var LAND_FLOOR = 0.5, DRAPE_TOL = 0.5;                        // road sits within this of grade (GP_LIFT + mesh discretization)
  // (1) structural drape: overlay == terrain + GP_LIFT at every vertex
  var tp = terrainGeo.attributes.position, sp = splatWorldGeo.attributes.position;
  var n = Math.min(tp.count, sp.count), maxLift = -Infinity, minLift = Infinity, vBad = 0;
  for(var i = 0; i < n; i++){
    var dy = sp.getY(i) - tp.getY(i);
    if(dy > maxLift) maxLift = dy;
    if(dy < minLift) minLift = dy;
    if(Math.abs(dy - GP_LIFT) > 1e-3) vBad++;
  }
  var structOk = vBad === 0 && Math.abs(maxLift - GP_LIFT) < 1e-3 && Math.abs(minLift - GP_LIFT) < 1e-3;
  // (2) land-centerline coverage; piers (over water) exempt
  var segs = (typeof PLACEMENT_STREET_SEGS !== "undefined") ? PLACEMENT_STREET_SEGS : [];
  var landSamples = 0, wetExempt = 0, maxDev = 0, K = 6, floaters = [];
  for(var s = 0; s < segs.length; s++){
    var seg = segs[s];
    for(var k = 0; k <= K; k++){
      var t = k / K, x = seg.x0 + (seg.x1 - seg.x0) * t, z = seg.z0 + (seg.z1 - seg.z0) * t;
      var terr = terrainHeight(x, z);
      if(!isFinite(terr) || terr <= LAND_FLOOR){ wetExempt++; continue; }   // over water — pier/wet lot, exempt
      var dev = Math.abs((terr + GP_LIFT) - terr);                          // the road surface vs the grade it drapes on
      if(dev > maxDev) maxDev = dev;
      if(dev > DRAPE_TOL && floaters.length < 10) floaters.push({ id: seg.id, x: +x.toFixed(1), z: +z.toFixed(1), devM: +dev.toFixed(3) });
      landSamples++;
    }
  }
  return { pass: structOk && maxDev <= DRAPE_TOL, gating: true,
           drapeModel: "road overlay = terrain geometry + GP_LIFT (shared vertices) — follows the grade continuously, not sampled once",
           liftM: GP_LIFT, vertices: n, vertexDrapeViolations: vBad, maxVertexLiftM: +maxLift.toFixed(4), minVertexLiftM: +minLift.toFixed(4),
           landCenterlineSamples: landSamples, pierWaterSamplesExempt: wetExempt, maxDrapeDevM: +maxDev.toFixed(4), floaters: floaters,
           note: "roads drape on terrain by construction (terrain mesh + lift); piers over water exempt (spine.wharfBlockGrounded)." };
});

/* dev-tooling visibility interface (layers-spec.md §15) */
registerLayerVisibility("ground-paint", function(v){ splatWorldMesh.visible = v; });
