/* =====================================================================
   LAYER labels (NEW, s90 THE LABELS BATCH — foundation admission, labels-
   inspect pulled forward + restructured per foundation-reset manifest row).
   OWNS: every world LABEL — lot ground-text, street names, zone/landmark
   names — as CANVAS-TEXTURE TEXT ON THREE GEOMETRY (never DOM, never chip/
   box plates; grounding §11 floating haloed text is the law). Three text
   surfaces, one per category geometry:
     (a) LOT  — a flat, ground-oriented plane at the lot's polylabel pole:
                the record lot NUMBER, owner name fading in below at close zoom.
     (b) STREET — a flat, ground-oriented plane oriented ALONG the street line,
                  §11 small-caps voice, era-gated to existence + era-correct name.
     (c) ZONE/LANDMARK — a camera-facing SPRITE at the polygon's polylabel pole
                  (hills, waterways in blue italic, ocean/bay, the plaza civic
                  voice, Mission Dolores, Presidio, Happy Valley).
   READS: cadastre (blocksAt / lotWorldQuad / GROUND_PARCELS / parcelByName),
   STREETS_RUNTIME + window.STREETS_GEOMETRY (eraNames), terrainHeight/TERRAIN,
   WORLD, PLAZA_CENTER, camera/renderer/scene, lastKnownAlt, simDay,
   GRID_ROT_BASE + gridToWorldAt, and the VENDORED rbush (declutter) + polylabel
   (anchors). NEVER: moves a centerline / lot / parcel (all geometry is read),
   paints ground (that is ground-paint), places objects.

   THE HAND-ROLL (foundation-reset §4b sanction): the text RENDERER is hand-
   rolled — the s89 admission review found NO importable candidate survives the
   §4b single-file/no-asset constraints for FLAT ground-oriented world text
   (troika-three-text cannot vendor single-file; three-spritetext billboards
   fail the flat ground-text acceptance). So text is rasterized to a canvas at
   supersampled resolution (crisp at the world-size band) with a stroke HALO
   (§11 no plates) and mapped onto Three geometry here. The two GEOMETRY/GIS
   solved-problems this layer needs — polygon pole-of-inaccessibility (anchors)
   and screen-box collision indexing (declutter) — are VENDORED (polylabel,
   rbush), never hand-rolled, per §4b.

   ACCEPTANCE (verbatim law): a label must be attributable to its subject at a
   glance, without clicking, even with all overlays enabled. §11 zoom-band
   choreography: regions own altitude and FADE on descent; streets then lots
   fade in at their bands; cross-fades never pop (per-frame opacity easing);
   priority declutter via rbush screen boxes; the world-news horizon bar is a
   reserved screen rect labels never collide with.
   GREAT SPLIT: this file holds 1 chunk (build-app.js FILES).
   ===================================================================== */
/* @P1850-CHUNK 40 — LABELS layer (lot ground-text · street names · zones & landmarks) */

/* ---- RELEASE DEFAULT (flagged for user sign-off): labels ON in index.html,
   matching legacy behavior. One named constant governs the release-boot state
   of the parent layer AND all three sublayers; the atelier's checkbox family
   overrides at runtime (dev only). Flip to false to ship with labels off. ---- */
var LABELS_ON_AT_RELEASE = true;

/* sublayer visibility state (parent + three sublayers). The atelier writes
   these via labelsSetSublayer(); release boots from the constant above. */
var LABELS_VIS = {
  parent:  LABELS_ON_AT_RELEASE,
  lots:    LABELS_ON_AT_RELEASE,
  streets: LABELS_ON_AT_RELEASE,
  zones:   LABELS_ON_AT_RELEASE
};

/* ---- §11 CATEGORY VOICES. One grammar so a reader never confuses types:
   waterways = blue italic serif · streets = small-caps · zones/landmarks =
   spaced caps softer sepia · regions = large faint caps · civic (plaza) = a
   warm civic accent · lots = ink numerals + owner. Halo = a dark stroke under
   light text (survives any ground). ---- */
var LBL_HALO_DARK = "rgba(12,14,17,0.82)";
var LBL_STYLE = {
  region:  { key:"region",  family:"Georgia, 'Times New Roman', serif", weight:"600", color:"#efe7d2", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.34, smallCaps:true,  italic:false },
  hill:    { key:"hill",    family:"Georgia, 'Times New Roman', serif", weight:"600", color:"#e9dfc4", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.30, smallCaps:true,  italic:false },
  water:   { key:"water",   family:"Georgia, 'Times New Roman', serif", weight:"600", color:"#9fc6dd", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.18, smallCaps:false, italic:true  },
  place:   { key:"place",   family:"Georgia, 'Times New Roman', serif", weight:"600", color:"#e7dcc2", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.26, smallCaps:true,  italic:false },
  civic:   { key:"civic",   family:"Georgia, 'Times New Roman', serif", weight:"700", color:"#f0d79a", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.24, smallCaps:true,  italic:false },
  street:  { key:"street",  family:"Georgia, 'Times New Roman', serif", weight:"600", color:"#efe9db", haloColor:LBL_HALO_DARK, halo:4, letterSpacing:0.22, smallCaps:true,  italic:false },
  lotNum:  { key:"lotNum",  family:"Georgia, 'Times New Roman', serif", weight:"700", color:"#f4efe4", haloColor:LBL_HALO_DARK, halo:4, letterSpacing:0.02, smallCaps:false, italic:false },
  lotOwn:  { key:"lotOwn",  family:"Georgia, 'Times New Roman', serif", weight:"500", color:"#dcd3c0", haloColor:LBL_HALO_DARK, halo:3, letterSpacing:0.04, smallCaps:false, italic:true  }
};

/* ---- THE HAND-ROLLED TEXT TEXTURE RENDERER. Rasterize `text` in `style` to a
   supersampled canvas with a stroke halo (no plate), cache by style+text so a
   rebuild across date scrubs re-uses the bitmap. Returns { tex, aspect }. ---- */
var LBL_SS = 3;              // supersample: crisp at the world-size band (§11 close-zoom)
var LBL_FONT_PX = 60;        // base raster height; on-screen size set by geometry/sprite scale
var _lblTexCache = {};
var _lblMeasureCtx = document.createElement("canvas").getContext("2d");
function _lblFontStr(style, px){ return (style.italic?"italic ":"") + style.weight + " " + px + "px " + style.family; }
function _lblAdvances(disp, style){
  _lblMeasureCtx.font = _lblFontStr(style, LBL_FONT_PX);
  var ls = style.letterSpacing * LBL_FONT_PX, adv = [], total = 0;
  for(var i=0;i<disp.length;i++){ var w = _lblMeasureCtx.measureText(disp[i]).width; adv.push(w); total += w + (i<disp.length-1?ls:0); }
  return { adv:adv, total:total, ls:ls };
}
function labelTexture(text, style){
  var key = style.key + "|" + text;
  if(_lblTexCache[key]) return _lblTexCache[key];
  var disp = style.smallCaps ? text.toUpperCase() : text;
  var m = _lblAdvances(disp, style);
  var pad = Math.ceil(LBL_FONT_PX*0.42 + style.halo*2);
  var W = Math.ceil(m.total) + pad*2, H = Math.ceil(LBL_FONT_PX*1.36) + pad*2;
  var cv = document.createElement("canvas"); cv.width = Math.max(2, W*LBL_SS); cv.height = Math.max(2, H*LBL_SS);
  var ctx = cv.getContext("2d"); ctx.scale(LBL_SS, LBL_SS);
  ctx.font = _lblFontStr(style, LBL_FONT_PX);
  ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineJoin = "round"; ctx.miterLimit = 2;
  var y = H/2;
  // halo pass (stroke every glyph), then ink pass — so the halo never overlays the ink
  ctx.lineWidth = style.halo*2; ctx.strokeStyle = style.haloColor;
  var x = pad; for(var i=0;i<disp.length;i++){ ctx.strokeText(disp[i], x, y); x += m.adv[i] + m.ls; }
  ctx.fillStyle = style.color;
  x = pad; for(var j=0;j<disp.length;j++){ ctx.fillText(disp[j], x, y); x += m.adv[j] + m.ls; }
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  tex.anisotropy = Math.min(8, (renderer.capabilities.getMaxAnisotropy && renderer.capabilities.getMaxAnisotropy()) || 1);
  tex.needsUpdate = true;
  var e = { tex:tex, aspect: W/H }; _lblTexCache[key] = e; return e;
}

/* ---- GRID BASIS (once): unit world directions of +u (street run) and +v (down
   the block), for aligning ground text and offsetting the owner line. ---- */
var _lblGrid = (function(){
  var o = gridToWorldAt(0,0,GRID_ROT_BASE), pu = gridToWorldAt(1,0,GRID_ROT_BASE), pv = gridToWorldAt(0,1,GRID_ROT_BASE);
  var ux = pu.x-o.x, uz = pu.z-o.z, ul = Math.hypot(ux,uz)||1;
  var vx = pv.x-o.x, vz = pv.z-o.z, vl = Math.hypot(vx,vz)||1;
  return { ux:ux/ul, uz:uz/ul, vx:vx/vl, vz:vz/vl, angle:Math.atan2(uz/ul, ux/ul) };
})();
var LBL_LIFT = 0.5;         // ground text sits just above the paint drape

/* ---- geometry factories ---- */
function _lblGroundMesh(text, style, x, z, worldH, angle){
  var t = labelTexture(text, style), w = worldH * t.aspect;
  var geo = new THREE.PlaneGeometry(w, worldH); geo.rotateX(-Math.PI/2);   // lie flat on the ground
  var mat = new THREE.MeshBasicMaterial({ map:t.tex, transparent:true, depthTest:false, depthWrite:false, opacity:0 });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, terrainHeight(x,z)+LBL_LIFT, z);
  mesh.rotation.y = -angle;                                                // align text with the line
  mesh.renderOrder = 20; mesh.frustumCulled = false; mesh.userData.text = text;
  return mesh;
}
function _lblSprite(text, style, x, z, lift){
  var t = labelTexture(text, style);
  var mat = new THREE.SpriteMaterial({ map:t.tex, transparent:true, depthTest:false, depthWrite:false, opacity:0 });
  var s = new THREE.Sprite(mat); s.userData.aspect = t.aspect; s.userData.text = text;
  s.position.set(x, terrainHeight(x,z)+lift, z);
  s.renderOrder = 25; s.frustumCulled = false;
  return s;
}

/* ---- ERA-DATED STREET NAMES (item B consumer). The dated name arrays live in
   the street geometry data (window.STREETS_GEOMETRY .eraNames — added to
   data/streets-geometry.json this sprint); the labels layer reads them directly
   by street id, so no core plumbing changes. Each eraNames entry is
   { name, start, end|null, source }; the period-correct name is the interval
   covering the sim date, else the street's default runtime name. ---- */
var _lblEraNames = (function(){
  var map = {}, SG = window.STREETS_GEOMETRY;
  if(SG && SG.streets) SG.streets.forEach(function(s){ if(s.eraNames && s.eraNames.length) map[s.id] = s.eraNames; });
  return map;
})();
function eraStreetName(streetRt, day){
  var baseId = streetRt.id.indexOf(":")>=0 ? streetRt.id.split(":")[0] : streetRt.id;
  var arr = _lblEraNames[baseId];
  if(arr){
    for(var i=0;i<arr.length;i++){
      var s0 = arr[i].start!=null ? eventDateToSimDay(arr[i].start) : -1e9;
      var s1 = arr[i].end!=null ? eventDateToSimDay(arr[i].end) : 1e9;
      if(day>=s0 && day<s1) return _lblStreetDisplay(arr[i].name);
    }
  }
  return _lblStreetDisplay(streetRt.name);
}
/* short label name: the dataset carries a few long descriptive names ("Commercial
   Street landing approach (the 1846 'Portsmouth street…')"). A label is a glance,
   not a gloss — keep the name up to the first "Street"/"St", drop trailing clauses
   and any parenthetical. */
function _lblStreetDisplay(name){
  var n = String(name||"");
  var m = n.match(/^(.*?\b(?:Street|St\.?|Road|Wharf|Place|Avenue|Ave\.?)\b)/i);
  if(m) return m[1].trim();
  var cut = n.search(/[\(\/]|\b(?:to the|landing|approach)\b/i);
  return (cut>0 ? n.slice(0,cut) : n).trim();
}

/* ---- ZONE / LANDMARK ANCHORS. Parcels (cove/plaza/camp/mission/presidio) →
   polylabel pole of their world ring. Hills → the highest baked terrain vertex
   inside a named search box (data-grounded, not invented; skipped if the box is
   flat). Ocean/Bay → fixed points over open water. ---- */
function _lblParcelWorldRing(p){
  // largest-area world ring: p.rings (clipped/world multi-piece) or p.poly (uv/world)
  var rings = [];
  if(p.rings){ p.rings.forEach(function(r){ if(r&&r.length>=3) rings.push(r.map(function(pt){ return {x:pt.x,z:pt.z}; })); }); }
  else if(p.poly){
    if(p.space==="uv") rings.push(p.poly.map(function(pt){ var w=gridToWorldAt(pt.u,pt.v,GRID_ROT_BASE); return {x:w.x,z:w.z}; }));
    else rings.push(p.poly.map(function(pt){ return {x:pt.x,z:pt.z}; }));
  }
  if(!rings.length) return null;
  var best=null, bestA=-1;
  rings.forEach(function(r){ var a=0; for(var i=0,j=r.length-1;i<r.length;j=i++) a+=r[j].x*r[i].z-r[i].x*r[j].z; a=Math.abs(a)/2; if(a>bestA){ bestA=a; best=r; } });
  return best;
}
function _lblPolePoint(ring){
  var poly = [ring.map(function(p){ return [p.x, p.z]; })];
  var pole = polylabel(poly, 2.0);
  return { x:pole[0], z:pole[1] };
}
/* hill peak search: highest baked vertex within a box centered PLAZA+offset. */
function _lblPeakInBox(cx, cz, half){
  var i0 = Math.max(0, Math.floor((cx-half-WORLD.x0)/WORLD.cell)), i1 = Math.min(TERRAIN.nx-1, Math.ceil((cx+half-WORLD.x0)/WORLD.cell));
  var j0 = Math.max(0, Math.floor((cz-half-WORLD.z0)/WORLD.cell)), j1 = Math.min(TERRAIN.nz-1, Math.ceil((cz+half-WORLD.z0)/WORLD.cell));
  var bh=-1e9, bx=cx, bz=cz;
  for(var j=j0;j<=j1;j++) for(var i=i0;i<=i1;i++){ var h=TERRAIN.heights[j*TERRAIN.nx+i]; if(h>bh){ bh=h; bx=WORLD.x0+i*WORLD.cell; bz=WORLD.z0+j*WORLD.cell; } }
  return { x:bx, z:bz, h:bh };
}
var LBL_HILLS = [   // offsets from the plaza in world metres (+x E, +z S); peak-found within ±half
  { name:"Telegraph Hill", dx: 150, dz:-620, half:340, minH:24 },
  { name:"Nob Hill",       dx:-640, dz:-140, half:360, minH:40 },
  { name:"Russian Hill",   dx:-520, dz:-620, half:360, minH:40 },
  { name:"Rincon Hill",    dx: 540, dz: 900, half:380, minH:18 }
];
/* Ocean/Bay fixed anchors + which parcels get a landmark label + its voice. */
var LBL_WATERBODIES = [
  { name:"Pacific Ocean",      x:-9200, z: 3200, style:"region", worldPx:34, band:"region" },
  { name:"San Francisco Bay",  x: 3600, z: -200, style:"region", worldPx:34, band:"region" }
];
var LBL_PARCEL_LABELS = {   // cadastre parcel name -> { text, style, band, screenPx }
  "yerba-buena-cove": { text:"Yerba Buena Cove", style:"water", band:"water", screenPx:26 },
  "portsmouth-square":{ text:"Portsmouth Square",style:"civic", band:"place", screenPx:22 },
  "happy-valley-camp":{ text:"Happy Valley",     style:"place", band:"place", screenPx:22 },
  "mission-cluster":  { text:"Mission Dolores",  style:"place", band:"place", screenPx:22 },
  "presidio":         { text:"The Presidio",     style:"place", band:"place", screenPx:22 }
};

/* ---- ZOOM-BAND OPACITY (alt in metres; lastKnownAlt). rampDown(a,b): 1 below
   a, 0 above b, linear between — a category "fades OUT as you climb". Regions
   own the high view and fade on descent (rampUp); streets then lots fade in as
   you descend (rampDown at their bands). ---- */
function _rDown(alt,a,b){ return alt<=a?1:(alt>=b?0:(b-alt)/(b-a)); }   // visible LOW, gone HIGH
function _rUp(alt,a,b){ return alt<=a?0:(alt>=b?1:(alt-a)/(b-a)); }     // visible HIGH, gone LOW
var LBL_BANDS = {
  region:  function(a){ return _rUp(a, 480, 950); },                    // hills/ocean/bay: own altitude, fade on descent
  water:   function(a){ return Math.min(_rUp(a,140,360), _rDown(a,4200,7000)); }, // cove: mid-high, gentle
  place:   function(a){ return _rDown(a, 3600, 6600); },                // civic/landmark places: persist, fade only very high
  street:  function(a){ return _rDown(a, 560, 880); },                  // fade in at the street band
  lotNum:  function(a){ return _rDown(a, 180, 270); },                  // fade in at the lot band
  lotOwn:  function(a){ return _rDown(a, 96, 158); },                   // owner: closer still
  landmark:function(a){ return _rDown(a, 360, 560); }                   // s91: reservation names — read earlier (higher) than lot numbers
};

/* ====================================================================
   LABEL SET — rebuilt when the sim DATE (integer day) or a sublayer toggle
   changes (era gating + record-lot birth + era street names all move with the
   date). Each label is { obj:Three obj, band:fn, sublayer, prio, ss?:screenPx,
   ground?:bool }. Per-frame update only touches opacity/scale/visibility.
   ==================================================================== */
var LBL_GROUP = new THREE.Group(); LBL_GROUP.frustumCulled = false; scene.add(LBL_GROUP);
var _lblItems = [];
var _lblLastDay = null, _lblLastVisKey = null;

function _lblClear(){
  for(var i=0;i<_lblItems.length;i++){ var o=_lblItems[i].obj; LBL_GROUP.remove(o); if(o.geometry) o.geometry.dispose(); }
  _lblItems.length = 0;
}
function _lblAdd(obj, bandFn, sublayer, prio, screenPx, ground){
  obj.material.opacity = 0; LBL_GROUP.add(obj);
  _lblItems.push({ obj:obj, band:bandFn, sublayer:sublayer, prio:prio, ss:screenPx||0, ground:!!ground, cur:0 });
}

function rebuildLabels(){
  _lblClear();
  var day = simDay;

  /* --- ZONES & LANDMARKS --- */
  if(LABELS_VIS.zones){
    // hills (peak-found; skip a box that never rises to a real hill)
    LBL_HILLS.forEach(function(H){
      var pk = _lblPeakInBox(PLAZA_CENTER.x+H.dx, PLAZA_CENTER.z+H.dz, H.half);
      if(pk.h < H.minH) return;
      _lblAdd(_lblSprite(H.name, LBL_STYLE.hill, pk.x, pk.z, 30), LBL_BANDS.region, "zones", 10, 30, false);
    });
    // ocean / bay (fixed open-water anchors)
    LBL_WATERBODIES.forEach(function(W){
      _lblAdd(_lblSprite(W.name, LBL_STYLE.region, W.x, W.z, 8), LBL_BANDS.region, "zones", 12, W.worldPx, false);
    });
    // named parcels (cove / plaza / camp / mission / presidio) at their pole
    Object.keys(LBL_PARCEL_LABELS).forEach(function(pname){
      var p = parcelByName(pname); if(!p) return;
      if(p.birth!=null && p.birth>day) return;                 // era-gated with the parcel
      var ring = _lblParcelWorldRing(p); if(!ring) return;
      var pole = _lblPolePoint(ring);
      var cfg = LBL_PARCEL_LABELS[pname];
      _lblAdd(_lblSprite(cfg.text, LBL_STYLE[cfg.style], pole.x, pole.z, 10), LBL_BANDS[cfg.band], "zones",
              pname==="yerba-buena-cove"?11:14, cfg.screenPx, false);
    });
  }

  /* --- STREETS (era-gated existence + era-correct name, oriented along line) --- */
  if(LABELS_VIS.streets){
    STREETS_RUNTIME.forEach(function(s){
      var active = null;
      for(var ci=0; ci<s.checkpoints.length; ci++){ if(s.checkpoints[ci].day<=day) active = s.checkpoints[ci]; }
      if(!active) return;                                      // not surveyed/mentioned yet
      var i0 = active.extent[0], i1 = active.extent[1]; if(i1<=i0) return;
      var mid = (i0+i1)>>1;                                    // anchor at the middle segment
      var a = gridToWorldAt(s.polyline[mid].u, s.polyline[mid].v, GRID_ROT_BASE);
      var b = gridToWorldAt(s.polyline[Math.min(mid+1,i1)].u, s.polyline[Math.min(mid+1,i1)].v, GRID_ROT_BASE);
      var mx=(a.x+b.x)/2, mz=(a.z+b.z)/2;
      if(terrainHeight(mx,mz) <= 0.5) return;                  // don't float a name over the tide flats
      var ang = Math.atan2(b.z-a.z, b.x-a.x);
      var name = eraStreetName(s, day);
      _lblAdd(_lblGroundMesh(name, LBL_STYLE.street, mx, mz, 10, ang), LBL_BANDS.street, "streets", 30, 0, true);
    });
  }

  /* --- LOTS (record lots only: number flat on the ground + owner below) --- */
  if(LABELS_VIS.lots){
    blocksAt(day).forEach(function(bl){
      bl.lots.forEach(function(l){
        var isRecord = (l.source==="record") || (l.owners && l.owners.length);
        if(!isRecord) return;
        var q = lotWorldQuad(l, day).quad; if(!q || q.length<4) return;
        var ring = [q[0],q[1],q[2],q[3]];
        var pole = _lblPolePoint(ring);
        var num = l.lotNumber!=null ? String(l.lotNumber) : (l.lot_number!=null ? String(l.lot_number) : null);
        if(num) _lblAdd(_lblGroundMesh(num, LBL_STYLE.lotNum, pole.x, pole.z, 9, _lblGrid.angle), LBL_BANDS.lotNum, "lots", 40, 0, true);
        if(l.owners && l.owners.length){
          var nm = (typeof l.owners[0]==="string") ? l.owners[0] : (l.owners[0] && l.owners[0].name);
          if(nm){ nm = nm.replace(/\s*\(.*$/,"").trim();       // drop "(uncertain cursive read)" etc.
            var ox = pole.x + _lblGrid.vx*7.5, oz = pole.z + _lblGrid.vz*7.5;   // just "below" the number, down the block
            _lblAdd(_lblGroundMesh(nm, LBL_STYLE.lotOwn, ox, oz, 5.2, _lblGrid.angle), LBL_BANDS.lotOwn, "lots", 41, 0, true);
          }
        }
      });
    });
    /* s91 — LANDMARK RESERVATION NAMES join the LOTS sublayer, civic/commerce
       voice (warm gold small-caps). The record's ground gets its name flat on
       the reserved footprint; era-gated (built ≤ day, before any in-window burn)
       so the Dec 24 1849 Great Fire cluster fades as you scrub past the fire. */
    if(typeof reservationsAt==="function"){
      reservationsAt(day).forEach(function(r){
        if(!r.footprint) return;
        var cx=r.footprint.cx, cz=r.footprint.cz;
        if(terrainHeight(cx,cz) <= 0.3) return;               // don't float a name over water
        _lblAdd(_lblGroundMesh(r.name, LBL_STYLE.civic, cx, cz, 8, _lblGrid.angle), LBL_BANDS.landmark, "lots", 34, 0, true);
      });
    }
  }

  _lblLastDay = Math.floor(simDay);
  _lblLastVisKey = _lblVisKey();
}
function _lblVisKey(){ return (LABELS_VIS.lots?"1":"0")+(LABELS_VIS.streets?"1":"0")+(LABELS_VIS.zones?"1":"0"); }

/* ====================================================================
   PER-FRAME UPDATE — opacity by altitude (§11 bands) + priority DECLUTTER via
   the vendored rbush over projected screen boxes, + camera-facing sprite scale
   for a stable on-screen size. Opacity EASES toward its target each frame so
   band cross-fades and declutter hide/show never pop. Wraps renderer.render so
   it runs before every draw (release + atelier) with zero core-loop edits.
   ==================================================================== */
var LBL_HORIZON_H = 52;     // the world-news horizon bar screen rect (top strip) labels avoid
var _lblTree = (typeof RBush!=="undefined") ? new RBush() : null;
var _lblV3 = new THREE.Vector3();
function _lblProject(x, y, z){
  _lblV3.set(x, y, z).project(camera);
  return { x:(_lblV3.x*0.5+0.5)*window.innerWidth, y:(-_lblV3.y*0.5+0.5)*window.innerHeight, front:_lblV3.z<1 };
}
function updateLabels(){
  if(!LABELS_VIS.parent){ for(var q=0;q<_lblItems.length;q++){ var it0=_lblItems[q]; it0.cur+= (0-it0.cur)*0.3; it0.obj.material.opacity=it0.cur; it0.obj.visible=it0.cur>0.01; } return; }
  // rebuild the label set when the date or sublayer selection changed
  if(Math.floor(simDay)!==_lblLastDay || _lblVisKey()!==_lblLastVisKey) rebuildLabels();

  var alt = (typeof lastKnownAlt==="number" && lastKnownAlt>0) ? lastKnownAlt : 800;
  var vpH = window.innerHeight, fovK = 2*Math.tan(camera.fov*Math.PI/360)/vpH; // world-per-screen-px at unit distance

  // 1) compute each item's target (band × sublayer) + screen box; collect visible
  var cands = [];
  for(var i=0;i<_lblItems.length;i++){
    var it = _lblItems[i], target = it.band(alt) * (LABELS_VIS[it.sublayer]?1:0);
    it._target = target;
    if(target < 0.02){ it._box = null; continue; }
    var p = _lblProject(it.obj.position.x, it.obj.position.y, it.obj.position.z);
    if(!p.front){ it._box = null; it._target = 0; continue; }
    var t = it.obj.material.map;
    var aspect = it.ground ? (it.obj.geometry.parameters ? (it.obj.geometry.parameters.width/it.obj.geometry.parameters.height) : 4) : it.obj.userData.aspect;
    var hPx;
    if(it.ground){
      var dist = camera.position.distanceTo(it.obj.position);
      hPx = it.obj.geometry.parameters.height / Math.max(1, dist*fovK);   // world height → screen px
    } else {
      hPx = it.ss;                                                        // sprite: constant on-screen px (scaled below)
    }
    var wPx = hPx*aspect;
    it._box = { minX:p.x-wPx/2, minY:p.y-hPx/2, maxX:p.x+wPx/2, maxY:p.y+hPx/2 };
    it._px = p; it._hPx = hPx;
    cands.push(it);
  }

  // 2) priority declutter (rbush): reserve the horizon bar, then place high-prio
  // (low `prio` number) first; a candidate overlapping a placed box is suppressed.
  if(_lblTree){
    _lblTree.clear();
    _lblTree.insert({ minX:0, minY:0, maxX:window.innerWidth, maxY:LBL_HORIZON_H });
    cands.sort(function(a,b){ return a.prio-b.prio || (b._hPx-a._hPx); });
    for(var c=0;c<cands.length;c++){
      var it2 = cands[c], bx = it2._box;
      var probe = { minX:bx.minX+2, minY:bx.minY+2, maxX:bx.maxX-2, maxY:bx.maxY-2 };
      if(_lblTree.collides(probe)){ it2._target = 0; }
      else _lblTree.insert(bx);
    }
  }

  // 3) ease every item toward its target (band × declutter); scale sprites for
  // a stable on-screen size. Easing is why cross-fades and hide/show never pop.
  for(var k=0;k<_lblItems.length;k++){
    var itf = _lblItems[k];                 // culled/decluttered items already have _target = 0
    itf.cur += (itf._target - itf.cur) * 0.28;
    if(itf._target < 0.004 && itf.cur < 0.004) itf.cur = 0;
    itf.obj.material.opacity = itf.cur;
    itf.obj.visible = itf.cur > 0.01;
    if(!itf.ground && itf.obj.visible){
      var dist2 = camera.position.distanceTo(itf.obj.position);
      var wH = Math.max(1, dist2*fovK*itf.ss);                            // world height for the target screen px
      itf.obj.scale.set(wH*itf.obj.userData.aspect, wH, 1);
    }
  }
}

/* wrap renderer.render — labels update immediately before every draw (mirrors
   the workbench's per-frame hook; composes with it since labels load first). */
var _lblPrevRender = renderer.render.bind(renderer);
renderer.render = function(s,c){ try{ updateLabels(); }catch(e){ if(!updateLabels._warned){ console.warn("[labels] update failed", e); updateLabels._warned=true; } } _lblPrevRender(s,c); };

/* ---- dev-tooling interface (layers-spec §15) + sublayer control for the
   atelier's tri-state family. The parent toggle hides the whole group; the
   three sublayers gate their own labels (rebuild picks up the change). ---- */
registerLayerVisibility("labels", function(v){ LABELS_VIS.parent = v; LBL_GROUP.visible = v; });
function labelsSetSublayer(key, on){ if(key in LABELS_VIS){ LABELS_VIS[key] = on; } }
function labelsGetSublayer(key){ return !!LABELS_VIS[key]; }

/* audit + QA hooks live in core/06-debug (labels namespace) — this layer exposes
   the live set through a getter the debug registry reads. */
function labelsLiveSet(){
  var out = [];
  for(var i=0;i<_lblItems.length;i++){ var it=_lblItems[i];
    if(it.cur>0.02) out.push({ text:it.obj.userData.text, sublayer:it.sublayer, prio:it.prio, x:Math.round(it.obj.position.x), z:Math.round(it.obj.position.z), op:+it.cur.toFixed(2), box:it._box||null });
  }
  return out;
}
/* full built set (ignores opacity/declutter) — QA/audit ground truth: what the
   current date + sublayer selection produced, before the zoom bands gate it. */
function labelsBuiltSet(){
  return _lblItems.map(function(it){ return { text:it.obj.userData.text, sublayer:it.sublayer, prio:it.prio,
    x:Math.round(it.obj.position.x), z:Math.round(it.obj.position.z), ground:it.ground }; });
}

/* ---- AUDIT 1 — eraNames (item B; grounding §11 era-correct names). The period-
   correct street name renders at the sim date: pre-1847-11-03 the plat names
   (Howard / Bartlett), the modern names after. FAILS BEFORE the eraNames data
   (falls back to the modern name at 1846), PASSES after. ---- */
var LBL_ERA_FLIP = eventDateToSimDay("1847-11-03");
registerAudit("labels", "eraNames", function(){
  var want = [ { id:"sacramento", pre:"Howard",   post:"Sacramento" },
               { id:"pacific",    pre:"Bartlett", post:"Pacific" } ];
  var checks = [], bad = [];
  want.forEach(function(w){
    var s = STREETS_RUNTIME_BY_ID[w.id]; if(!s) return;
    var got = eraStreetName(s, simDay), expect = (simDay < LBL_ERA_FLIP) ? w.pre : w.post;
    checks.push({ id:w.id, got:got, expect:expect });
    if(got.toLowerCase().indexOf(expect.toLowerCase()) < 0) bad.push({ id:w.id, got:got, expect:expect });
  });
  return { pass: bad.length===0, date:simDateISO(dateFromSimDay(simDay)), checks:checks, bad:bad };
});

/* ---- AUDIT 2 — anchorsInside (the verbatim acceptance: a label must be
   attributable to its subject at a glance). Every ground/zone label anchor is
   the polylabel pole of its subject polygon — verify each pole lies INSIDE its
   lot quad / parcel ring, so no label floats off its subject. ---- */
registerAudit("labels", "anchorsInside", function(){
  var bad = [], n = 0;
  blocksAt(simDay).forEach(function(bl){ bl.lots.forEach(function(l){
    if(!((l.source==="record") || (l.owners && l.owners.length))) return;
    var q = lotWorldQuad(l, simDay).quad; if(!q || q.length<4) return;
    var pole = _lblPolePoint([q[0],q[1],q[2],q[3]]); n++;
    if(!cadPointInPoly(q, pole.x, pole.z)) bad.push({ lot:l.lotNumber, x:Math.round(pole.x), z:Math.round(pole.z) });
  }); });
  Object.keys(LBL_PARCEL_LABELS).forEach(function(pn){
    var p = parcelByName(pn); if(!p || (p.birth!=null && p.birth>simDay)) return;
    var ring = _lblParcelWorldRing(p); if(!ring) return;
    var pole = _lblPolePoint(ring); n++;
    if(!cadPointInPoly(ring, pole.x, pole.z)) bad.push({ parcel:pn, x:Math.round(pole.x), z:Math.round(pole.z) });
  });
  return { pass: bad.length===0, anchorsChecked:n, bad:bad };
});
