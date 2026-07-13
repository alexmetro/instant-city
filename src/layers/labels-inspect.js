/* =====================================================================
   LAYER labels-inspect (slot 10) — OWNS all floating labels + declutter + the inspect panel + selection
   rings + click/tap picking. NEVER: gameplay state. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 5 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 15 — street name label engine */
/* =====================================================================
   STREET NAME LABEL ENGINE (rebuilt 2026-07-10, iPad oblique-view fix)

   TECHNIQUE: screen-space label placement along the feature's PROJECTED
   path + greedy priority declutter — the industry-standard slippy-map
   renderer approach (Google Maps, Mapbox GL, OSM renderers all do
   exactly this). The previous constant-size DOM billboards had no depth
   scaling, no collision, and no angle awareness, so an oblique high view
   piled ~40 same-size names on the receding side of the grid while
   nearby streets went unlabeled (the user-reported iPad defect).

   How it works, per decision tick (~5Hz, STREET_LABEL_TICK_MS):
     1. PLACEMENT — each era-gated street's active-checkpoint polyline is
        resampled at ~30m, projected to screen space, and its longest
        contiguous ON-SCREEN run measured in pixels. A street is a label
        candidate only if that run is long enough for its own text
        (>= ~90px and >= 1.15x the label's measured width — which also
        rejects edge-on streets, since they project short), with an
        explicit local-foreshortening floor on top. Long runs repeat the
        name at most once per ~450 screen px. The label sits at the run's
        (fractional) midpoint and is ROTATED to lie along the street's
        local screen direction, flipped so text never reads upside-down.
     2. DECLUTTER — candidates are greedily accepted by priority
        (street class x on-screen length x proximity to screen center),
        hard-capped at STREET_LABEL_CAP, testing each candidate's rotated
        screen box against fixed UI panel rects, the chip rects the
        shared label-declutter engine accepted on ITS last tick
        (_declutterAcceptedRects — one declutter system, per the
        one-system law; street labels always yield to chips), and every
        street label already accepted this tick. Rejected labels simply
        don't render this tick.
     3. HYSTERESIS — a slot must stay accepted ~300ms before it appears
        and stay rejected ~300ms before it disappears, then fades over
        ~200ms (CSS transition), so pinch-zooming through the band never
        thrashes/pops labels.
   Between ticks, only the ACCEPTED (<=14) labels are reprojected per
   frame from their stored world anchors — 2 projections each — so
   labels stay glued to their streets during camera motion at trivial
   per-frame cost (this runs on iPad Safari).

   Kept from the previous engine: the 120-1200m altitude band, per-street
   era gating (surveyedDay/firstMentionDay), the water-lot suppression
   (a platted street whose ground is still open water gets no name), and
   CURRENT_STREET_SKEW so labels track the exact angle renderGroundSplat()
   painted this frame. "mission-street" stays unlabeled here (see
   STREETS_RUNTIME's own comment on why it's excluded). */
var STREET_LABEL_DEFS = STREETS_RUNTIME.filter(function(s){ return s.surveyedDay!=null || s.firstMentionDay!=null; })
  .map(function(s){
    // Display trim (user, 2026-07-11): "CALIFORNIA", not "CALIFORNIA STREET" —
    // period-map style, and shorter text clears the declutter cap for more names.
    // Only the generic STREET suffix drops; ROAD/WHARF/etc. stay (there the type
    // IS the information), and the dataset keeps full names for provenance.
    var display = s.name.toUpperCase().replace(/\s+STREET$/, "");
    return { s:s, name:display, gateDay: s.surveyedDay!=null?s.surveyedDay:s.firstMentionDay, slots:[], _hw:0 };
  });
var streetLabelSlots = []; // {el, s, gateDay, rep, state:off|pending|on|leaving, since, anchor}
(function buildStreetLabelPool(){
  var hudEl = document.getElementById("hud");
  var MAX_REPS = 3; // bounded DOM pool per street; actual reps shown per tick is screen-length-driven
  STREET_LABEL_DEFS.forEach(function(def){
    var s = def.s;
    // gridToWorldAt() is a pure rotation — distance is skew-invariant, so
    // any fixed angle gives the same real-world length, used only to size
    // the DOM pool; use the street's FULL polyline (its eventual longest
    // run) so the pool never needs to grow across eras.
    var total = 0;
    for(var i=1;i<s.polyline.length;i++) total += Math.hypot(
      gridToWorldAt(s.polyline[i].u,s.polyline[i].v,0).x - gridToWorldAt(s.polyline[i-1].u,s.polyline[i-1].v,0).x,
      gridToWorldAt(s.polyline[i].u,s.polyline[i].v,0).z - gridToWorldAt(s.polyline[i-1].u,s.polyline[i-1].v,0).z);
    var reps = Math.min(MAX_REPS, Math.max(1, Math.round(total/200)));
    for(var r=0;r<reps;r++){
      var el = document.createElement("div");
      el.className = "street-label";
      el.textContent = def.name;
      hudEl.appendChild(el);
      var slot = { el:el, s:s, gateDay:def.gateDay, rep:r, state:"off", since:0, anchor:null };
      def.slots.push(slot);
      streetLabelSlots.push(slot);
    }
  });
})();
/* Active checkpoint extent's world-space polyline for a street at the
   given skew angle (cardinal streets swing, everything else is fixed at
   the permanent GRID_ROT_BASE — same rule renderGroundSplat() itself
   follows). Shared by the label engine below; renderGroundSplat() inlines
   its own simpler version. */
function streetActiveWorldPts(s, day, skewAngleForSwinging){
  var active = s.checkpoints[0];
  for(var ci=0; ci<s.checkpoints.length; ci++){ if(s.checkpoints[ci].day<=day) active=s.checkpoints[ci]; }
  if(!active) return null;
  var angle = s.swings ? skewAngleForSwinging : GRID_ROT_BASE;
  var pts = [];
  for(var pi=active.extent[0]; pi<=active.extent[1]; pi++) pts.push(gridToWorldAt(s.polyline[pi].u, s.polyline[pi].v, angle));
  return pts;
}
var STREET_LABEL_ALT_MIN=120, STREET_LABEL_ALT_MAX=1200; // unchanged altitude band
var STREET_LABEL_CAP = 14;          // hard cap on visible street labels
var STREET_LABEL_MIN_RUN_PX = 90;   // minimum on-screen run to earn a label at all
var STREET_LABEL_REPEAT_PX = 450;   // at most one name instance per this many screen px
var STREET_LABEL_TICK_MS = 200;     // ~5Hz full placement/declutter recompute
var STREET_LABEL_HYST_MS = 280;     // must be valid/invalid this long before showing/hiding
var STREET_LABEL_SAMPLE_M = 30;     // world-space resample step along each polyline
var STREET_LABEL_EDGEON_PPM = 0.22; // min local screen px per world meter along the street (edge-on/too-far floor)
var STREET_LABEL_GAP_PX = 12;       // min screen gap between two accepted street labels
var STREET_CLASS_WEIGHT = { market:4, main:3, "main-override":3, cross:2, "cross-override":2, "cross-ofarrell":2 };
// Fixed-UI blocker panels street labels must never underlap (chips are
// covered separately via _declutterAcceptedRects). Rects re-read at tick
// rate only, so getBoundingClientRect cost stays off the frame path.
var STREET_LABEL_UI_BLOCKER_IDS = ["hud-title","hud-seed","hud-clock","hud-ghost","hud-altitude","hud-ticker",
  "hud-scrubber","hud-hint","hud-hint-toggle","hud-tilt-toggle","hud-menu-toggle","hud-menu-sheet",
  "paper-toggle","hud-provenance","inspect-panel","paper-pane",
  // s42 label overhaul: the world-news horizon bar + the beat card are
  // occupied screen space too (user-reported collision at the zoomed-out
  // framing) — ALL UI panels are blockers for ALL world labels now.
  "horizon-ring","beat-card"];
function collectUIBlockerRects(){
  var rects = [];
  for(var i=0;i<STREET_LABEL_UI_BLOCKER_IDS.length;i++){
    var el = document.getElementById(STREET_LABEL_UI_BLOCKER_IDS[i]);
    if(!el) continue;
    var cs = window.getComputedStyle(el);
    if(cs.display==="none" || cs.visibility==="hidden" || parseFloat(cs.opacity)<0.05) continue;
    var r = el.getBoundingClientRect();
    if(r.width<2 || r.height<2) continue;
    rects.push({ left:r.left, right:r.right, top:r.top, bottom:r.bottom });
  }
  return rects;
}
var _slV = new THREE.Vector3();
// front: in front of the camera's near plane; on: within the padded viewport.
function _projectStreetPoint(wx,wy,wz,out){
  _slV.set(wx,wy,wz).applyMatrix4(camera.matrixWorldInverse);
  if(_slV.z>-1){ out.front=false; out.on=false; return out; }
  _slV.set(wx,wy,wz).project(camera);
  out.front = true;
  out.sx = (_slV.x*0.5+0.5)*window.innerWidth;
  out.sy = (-_slV.y*0.5+0.5)*window.innerHeight;
  out.on = _slV.x>=-1.04 && _slV.x<=1.04 && _slV.y>=-1.04 && _slV.y<=1.04;
  return out;
}
function _streetLabelHalfSize(def){
  if(!def._hw){
    var el = def.slots.length ? def.slots[0].el : null;
    def._hw = (el && el.offsetWidth) ? el.offsetWidth/2+2 : def.name.length*4.2+8; // real box once laid out; estimate before
  }
  return { hw:def._hw, hh:9 };
}
var _lastStreetLabelTick = -1e9;
function recomputeStreetLabelPlacements(now, alt){
  var candidates = [];
  var inBand = alt>=STREET_LABEL_ALT_MIN && alt<=STREET_LABEL_ALT_MAX;
  if(inBand){
    var skew = CURRENT_STREET_SKEW;
    var W = window.innerWidth, H = window.innerHeight;
    var scx=W/2, scy=H/2, diag=Math.hypot(W,H);
    var p = {front:false,on:false,sx:0,sy:0};
    for(var d=0; d<STREET_LABEL_DEFS.length; d++){
      var def = STREET_LABEL_DEFS[d];
      if(simDay < def.gateDay) continue; // era gate: this name isn't on any map or in any corpus mention yet
      var pts = streetActiveWorldPts(def.s, simDay, skew);
      if(!pts || pts.length<2) continue;
      // resample the active-extent polyline at ~30m and project every sample
      var samples = [];
      for(var i=0;i<pts.length-1;i++){
        var ax=pts[i].x, az=pts[i].z, bx=pts[i+1].x, bz=pts[i+1].z;
        var n = Math.max(1, Math.ceil(Math.hypot(bx-ax,bz-az)/STREET_LABEL_SAMPLE_M));
        for(var k=(i===0?0:1); k<=n; k++){
          var tt=k/n, wx=lerp(ax,bx,tt), wz=lerp(az,bz,tt);
          var wy=terrainHeight(wx,wz)+0.3;
          _projectStreetPoint(wx,wy,wz,p);
          samples.push({wx:wx,wy:wy,wz:wz, ok:(p.front&&p.on), sx:p.sx, sy:p.sy});
        }
      }
      // longest contiguous on-screen run, measured in screen px
      var best=null, runStart=-1;
      for(var si=0; si<=samples.length; si++){
        var okNow = si<samples.length && samples[si].ok;
        if(okNow && runStart<0) runStart=si;
        if(!okNow && runStart>=0){
          if(si-runStart>=2){
            var L=0, cum=[0];
            for(var q=runStart+1;q<si;q++){ L+=Math.hypot(samples[q].sx-samples[q-1].sx, samples[q].sy-samples[q-1].sy); cum.push(L); }
            if(!best || L>best.L) best={i0:runStart, L:L, cum:cum};
          }
          runStart=-1;
        }
      }
      if(!best) continue;
      var half = _streetLabelHalfSize(def);
      // the run must fit the label's own text with margin — this is also the
      // edge-on filter: a street seen nearly end-on projects a short run
      if(best.L < Math.max(STREET_LABEL_MIN_RUN_PX, half.hw*2*1.15)) continue;
      var reps = Math.min(def.slots.length, Math.max(1, Math.floor(best.L/STREET_LABEL_REPEAT_PX)));
      var clsW = STREET_CLASS_WEIGHT[def.s.cls] || 1;
      for(var r=0;r<reps;r++){
        var target = (r+0.5)/reps * best.L;
        var j=1; while(j<best.cum.length-1 && best.cum[j]<target) j++;
        var sa=samples[best.i0+j-1], sb=samples[best.i0+j];
        var segPx = best.cum[j]-best.cum[j-1];
        var ft = segPx>0 ? (target-best.cum[j-1])/segPx : 0;
        // local foreshortening floor: labels never sit where the street is
        // compressed to almost nothing on screen (too edge-on / too far)
        var worldStep = Math.hypot(sb.wx-sa.wx, sb.wz-sa.wz);
        if(worldStep>0 && segPx/worldStep < STREET_LABEL_EDGEON_PPM) continue;
        var wx2=lerp(sa.wx,sb.wx,ft), wz2=lerp(sa.wz,sb.wz,ft);
        var wy2=terrainHeight(wx2,wz2)+0.3;
        // WATER-LOT LABEL rule (kept from previous engine, screening #5
        // item a): a platted water-lot street whose ground is still open
        // water paints only a dashed pier-hint — its NAME must not float
        // over open water either. Threshold 0.5 = the high-tide line
        // (shoreline truth 2026-07-11): the intertidal mud band is a
        // water lot too, same rule as the splat painter's segWet.
        if(wy2-0.3 <= 0.5) continue;
        var angle = Math.atan2(sb.sy-sa.sy, sb.sx-sa.sx)*180/Math.PI;
        if(angle>90) angle-=180; else if(angle<-90) angle+=180; // never upside-down
        var sx2=lerp(sa.sx,sb.sx,ft), sy2=lerp(sa.sy,sb.sy,ft);
        var centerFactor = 1 - Math.min(1, Math.hypot(sx2-scx,sy2-scy)/(0.6*diag));
        candidates.push({
          slot:def.slots[r], sx:sx2, sy:sy2, angle:angle, hw:half.hw, hh:half.hh,
          anchor:{ wx:wx2, wy:wy2, wz:wz2, ax:sb.wx, ay:sb.wy, az:sb.wz, lastAngle:angle },
          prio: clsW * best.L * (0.35+0.65*centerFactor)
        });
      }
    }
  }
  // GREEDY DECLUTTER: highest priority first, against UI rects, the shared
  // declutter engine's accepted chip rects (street labels yield to chips),
  // and street labels already accepted this tick. Hard cap at 14.
  candidates.sort(function(a,b){ return b.prio-a.prio; });
  var blockers = collectUIBlockerRects();
  for(var bi=0;bi<_declutterAcceptedRects.length;bi++) blockers.push(_declutterAcceptedRects[bi]);
  var placedBoxes = [], acceptedBySlot = new Map();
  for(var ci=0; ci<candidates.length && acceptedBySlot.size<STREET_LABEL_CAP; ci++){
    var c = candidates[ci];
    if(acceptedBySlot.has(c.slot)) continue;
    // conservative screen AABB of the ROTATED text box
    var rad=c.angle*Math.PI/180, cA=Math.abs(Math.cos(rad)), sA=Math.abs(Math.sin(rad));
    var hw=cA*c.hw+sA*c.hh, hh=sA*c.hw+cA*c.hh;
    var box = { left:c.sx-hw, right:c.sx+hw, top:c.sy-hh, bottom:c.sy+hh };
    var hit = false, x;
    for(x=0;x<blockers.length && !hit;x++) hit = rectsOverlap(box, blockers[x], LABEL_PAD);
    for(x=0;x<placedBoxes.length && !hit;x++) hit = rectsOverlap(box, placedBoxes[x], STREET_LABEL_GAP_PX);
    if(hit) continue;
    placedBoxes.push(box);
    acceptedBySlot.set(c.slot, c);
  }
  // HYSTERESIS state machine (anti-thrash during pinch/orbit): accepted
  // slots must persist ~STREET_LABEL_HYST_MS before appearing; rejected
  // ones keep rendering that long before the ~200ms CSS fade-out.
  for(var si2=0; si2<streetLabelSlots.length; si2++){
    var slot = streetLabelSlots[si2];
    var acc = acceptedBySlot.get(slot);
    if(acc){
      slot.anchor = acc.anchor;
      if(slot.state==="off"){ slot.state="pending"; slot.since=now; }
      else if(slot.state==="pending" && now-slot.since>=STREET_LABEL_HYST_MS){ slot.state="on"; }
      else if(slot.state==="leaving"){ slot.state="on"; }
    } else {
      if(slot.state==="pending"){ slot.state="off"; }
      else if(slot.state==="on"){ slot.state="leaving"; slot.since=now; }
      else if(slot.state==="leaving" && now-slot.since>=STREET_LABEL_HYST_MS){ slot.state="off"; }
    }
  }
}
var _slFrameP = {front:false,on:false,sx:0,sy:0};
function updateStreetLabels(alt){
  var now = performance.now();
  var i, slot, el;
  // hard clamp well outside the band — no hysteresis grace when the user
  // has clearly left the labeled altitude range
  if(alt < STREET_LABEL_ALT_MIN*0.8 || alt > STREET_LABEL_ALT_MAX*1.18){
    for(i=0;i<streetLabelSlots.length;i++){ slot=streetLabelSlots[i]; slot.state="off"; slot.el.style.opacity=0; }
    return;
  }
  if(now-_lastStreetLabelTick >= STREET_LABEL_TICK_MS){
    _lastStreetLabelTick = now;
    recomputeStreetLabelPlacements(now, alt); // ~5Hz full recompute; frames between ticks only reproject accepted anchors below
  }
  for(i=0;i<streetLabelSlots.length;i++){
    slot=streetLabelSlots[i]; el=slot.el;
    if(!((slot.state==="on"||slot.state==="leaving") && slot.anchor)){ el.style.opacity=0; continue; }
    var a = slot.anchor;
    _projectStreetPoint(a.wx,a.wy,a.wz,_slFrameP);
    if(!_slFrameP.front || !_slFrameP.on){ el.style.opacity=0; slot.state="off"; continue; } // moved offscreen between ticks — hide now
    var sx=_slFrameP.sx, sy=_slFrameP.sy;
    _projectStreetPoint(a.ax,a.ay,a.az,_slFrameP);
    var angle = a.lastAngle;
    if(_slFrameP.front){
      angle = Math.atan2(_slFrameP.sy-sy, _slFrameP.sx-sx)*180/Math.PI;
      if(angle>90) angle-=180; else if(angle<-90) angle+=180;
      a.lastAngle = angle;
    }
    el.style.opacity = 0.92;
    el.style.left = sx+"px";
    el.style.top = sy+"px";
    el.style.transform = "translate(-50%,-50%) rotate("+angle.toFixed(2)+"deg)";
  }
}

/* @P1850-CHUNK 37 — inspect core, named landmarks, biz glyphs, label declutter */
/* =========================================================================
   INSPECT CORE (§11 INSPECT LAW, s42) — the ONE persistent, edge-docked
   inspect surface. Every selectable entity kind (person, building, tent,
   street, ship, tree/fauna, zone, place) renders into the same panel via
   showInspect(); tap/click selection UPDATES IN PLACE; ESC or tap-empty
   deselects. Replaces the ship/building/person popup trio (deleted —
   one-system law). A subtle terrain-hugging ring marks the selection.
   ========================================================================= */
var inspectPanelEl = document.getElementById("inspect-panel");
var ipKindEl = document.getElementById("ip-kind");
var ipNameEl = document.getElementById("ip-name");
var ipBodyEl = document.getElementById("ip-body");
var SELECTED = null; // {kind, ...refs} — read by the per-frame ring/NOW updaters
function ipRow(label, html){ return '<span class="ip-label">'+label+'</span><span class="ip-field">'+html+'</span>'; }
function showInspect(kindText, name, bodyHtml, opts){
  opts = opts || {};
  ipKindEl.textContent = kindText;
  ipKindEl.classList.toggle("documented", !!opts.documented);
  ipNameEl.textContent = name;
  var html = bodyHtml;
  if(opts.receiptUrl){
    html += '<span class="ip-field" style="margin-top:7px;"><a href="'+opts.receiptUrl+'" target="_blank" rel="noopener">'
      + escapeHTML(opts.receiptText || "view the original page →")+'</a></span>';
  }
  if(opts.hint) html += '<span class="ip-hint">'+opts.hint+'</span>';
  ipBodyEl.innerHTML = html;
  followReleaseEl.classList.remove("on"); // s54: only the person-follow openers re-show it
  inspectPanelEl.classList.add("on");
  document.body.classList.add("ip-open"); // s59: phone chrome stacks the beat card above the sheet
  // s54 single-top-layer policy: on phone chrome the inspect bottom-sheet and
  // the ☰ menu sheet occupy the same layer — opening one closes the other
  // (the user finding: the sheet drew OVER the open menu, both half-visible).
  document.getElementById("hud-menu-sheet").classList.remove("open");
}
/* s54: true while the phone-chrome media block (portrait narrow OR coarse
   landscape short) is active — the layouts where bottom sheets collide. */
function phoneChromeActive(){
  return !!(window.matchMedia &&
    window.matchMedia("(max-width:520px), (pointer:coarse) and (max-height:440px)").matches);
}
/* s54 FOLLOW RELEASE — the touch path for Esc: a 44px chip inside the
   inspect panel, shown only while a person/documented figure is followed. */
var followReleaseEl = document.getElementById("follow-release");
followReleaseEl.addEventListener("click", function(e){ e.stopPropagation(); closeInspect(); });
function closeInspect(){
  inspectPanelEl.classList.remove("on");
  document.body.classList.remove("ip-open"); // s59
  followReleaseEl.classList.remove("on"); // s54
  SELECTED = null;
  followedSlot = null; followedDocumented = null;
  selRingMesh.visible = false;
}
document.getElementById("ip-close").addEventListener("click", function(e){ e.stopPropagation(); closeInspect(); });
/* selection highlight: a subtle parchment ring hugging the ground at the
   selected entity — repositioned per frame (updateSelectionRing) so it
   tracks walking people and sailing ships. depthTest off: the ring is a
   UI affordance, never occluded by terrain. */
var selRingMesh = (function(){
  var g = new THREE.RingGeometry(0.82, 1.0, 48);
  var m = new THREE.MeshBasicMaterial({ color:0xf1e6c9, transparent:true, opacity:0.6,
    depthWrite:false, depthTest:false, side:THREE.DoubleSide, fog:false });
  var mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI/2; mesh.visible = false; mesh.renderOrder = 9;
  scene.add(mesh);
  return mesh;
})();
function setSelRing(x, z, r){
  selRingMesh.position.set(x, Math.max(terrainHeight(x,z),0)+0.5, z);
  selRingMesh.scale.set(r, r, 1);
  selRingMesh.visible = true;
}
function updateSelectionRing(){
  if(!SELECTED){ selRingMesh.visible = false; return; }
  if(SELECTED.kind==="person" && SELECTED.slot) setSelRing(SELECTED.slot._x, SELECTED.slot._z, 1.4);
  else if(SELECTED.kind==="ship" && SELECTED.visit){
    var p = SELECTED.visit._lastPos || SELECTED.visit._anchorPos;
    if(p) setSelRing(p.x, p.z, 16);
  }
  // static kinds keep the ring where the pick landed
  selRingMesh.material.opacity = 0.42 + 0.18*Math.sin(performance.now()*0.004);
  // live NOW refresh for a followed person (updates in place, §11)
  if(SELECTED.kind==="person" && SELECTED.slot){
    var nowEl = document.getElementById("ip-now");
    if(nowEl) nowEl.textContent = SELECTED.slot._now || "—";
  }
}

/* ---- SHIP cards (kept from spec item 6, re-homed into the one panel):
   name, silhouette type, arrival, status (at anchor / abandoned /
   storeship), documented fate + CDNC receipt. ---- */
function findFeedItemProv(dateKey, headline){
  var issue = FEED_BY_DATE[dateKey];
  if(!issue) return null;
  for(var i=0;i<issue.items.length;i++){ if(issue.items[i].headline===headline) return issue.items[i].prov; }
  return null;
}
function findShipArrivalRecord(name){
  var best = null;
  EVENTS_RAW.forEach(function(e){
    if(e.ship===name && e.type==="ship_arrival" && (!best || e.simDay>best.simDay)) best = e;
  });
  return best;
}
var SHIP_TYPE_NAME = ["full-rigged ship","barque","brig","schooner"];
function openShipInspector(v){
  // BUG FIX (2026-07-10, ghost-fleet P0) carried forward: undocumented
  // arrivals must key off the explicit arriveInferred flag, never
  // "arrive!==null", or the panel would present a fabricated date as fact.
  var documented = v.arrive!==null && !v.arriveInferred && !v.isFill;
  var st = shipDesiredState(v, simDay);
  var html = "";
  html += ipRow("TYPE", escapeHTML(v.storeship ? "storeship — "+SHIP_TYPE_NAME[v.shipType] : SHIP_TYPE_NAME[v.shipType]));
  html += ipRow("ARRIVED", documented ? escapeHTML(formatIssueDateLabel(todayISOFromSimDay(v.arrive))) : "arrival undocumented in this window");
  var status;
  if(v.storeship) status = "grounded storeship — "+v.storeship.groundedNote;
  else if(st==="sailing_in") status = "standing in through the Gate";
  else if(st==="sailing_out") status = "outbound";
  else if(st==="anchored" && v.depart===null && v.arrive!==null && v.arrive>=GHOST_FLEET_START)
    status = "abandoned at anchor — crew gone to the diggings (the ghost fleet)";
  else if(st==="anchored") status = "at anchor in Yerba Buena Cove";
  else status = v.depart!==null && simDay>v.depart ? "departed San Francisco" : "in port";
  html += ipRow("STATUS", escapeHTML(status));
  if(v.depart!==null && !v.storeship) html += ipRow("FATE", "departed "+escapeHTML(formatIssueDateLabel(todayISOFromSimDay(v.depart))));
  var opts = {};
  var rec = documented ? findShipArrivalRecord(v.ship) : null;
  if(rec){
    html += ipRow("THE RECORD", escapeHTML(rec.headline));
    var issueKey = latestIssueOnOrBefore(todayISOFromSimDay(rec.simDay));
    var prov = issueKey && findFeedItemProv(issueKey, rec.headline);
    if(prov && prov.src) opts.receiptUrl = issueUrl(prov.src);
  }
  var kind = v.isFill ? "SHIP — UNRECORDED" : (v.storeship ? "STORESHIP" : "SHIP");
  opts.documented = documented;
  showInspect(kind, v.isFill ? "Unnamed vessel" : v.ship, html, opts);
  var p = v._lastPos || v._anchorPos;
  SELECTED = { kind:"ship", visit:v };
  if(p) setSelRing(p.x, p.z, 16);
  followedSlot = null; followedDocumented = null;
}

/* =========================================================================
   GAPS-2026-07-09 item 3 — NAMED LANDMARKS: the plaza's named buildings
   (currently only "live" inside the fire system's burn/scorch lists) get
   an inspector card + a clickable label, same DOM-label-pool pattern as
   ship labels above. Curated one-line facts for the buildings the gap
   report specifically named; every other named spot (the fire block's
   ~8 other documented establishments) still gets a card with its name and
   burn status — just without invented color beyond what's sourced.
   ========================================================================= */
var NAMED_BUILDINGS = {
  "El Dorado": { detail:"Opened as a 15x25-ft canvas gambling tent around 1849, next to City Hall on Portsmouth Square, run by James McCabe and Thomas J.A. Chambers; the tent alone reportedly rented for $40,000/year.", src:"economy-daily-life.md §4.1" },
  "Parker House": { detail:"Built as a hotel by Robert A. Parker; its upper floors were leased to gamblers for faro, monte, and roulette.", src:"timeline-part-1849.md ¶gambling" },
  "Dennison's Exchange": { detail:"A gambling exchange on the Kearny frontage — the Great Fire's point of origin, 5:45 a.m., Dec 24 1849.", src:"weather-climate.md §2" },
  "City Hotel": { detail:"Built by William A. Leidesdorff in 1846 — Bancroft's first building in Yerba Buena \"entitled to the name\" of hotel.", src:"timeline-spine.md 1846-12-31" },
  "Bella Union": { detail:"Opened Oct 22, 1849 at 720 Washington St — hosted San Francisco's first minstrel show that year.", src:"economy-daily-life.md §4.1" },
  "Verandah": { detail:"A gambling saloon on the plaza's west side, opposite the El Dorado.", src:"economy-daily-life.md §4.1" },
  "Washington Arcade": { detail:"One of the round-the-clock gambling houses ringing Portsmouth Square in 1849.", src:"timeline-spine.md ¶Gambling around the plaza" },
  "Merchants' Exchange": { detail:"Blown up by the authorities' powder demolition as the Great Fire neared Montgomery St.", src:"AUTOGEN:fire-spine" },
  "Delmonico's": { detail:"Saved from the Great Fire by its own roof crew, at Clay & Kearny.", src:"AUTOGEN:fire-spine" },
  "The Chapel": { detail:"Rev. Timothy Dwight Hunt (from Hawaii, arrived Oct 29 1848) held the town's first Protestant services as a nondenominational City Chaplain from Nov 2, 1848; the congregation organized as First Congregational Church in July 1849. No documented name survives for an early meeting-house building itself.", src:"demographics-society.md §ministries" }
};
var FIRE_RECEIPT_URL = "https://cdnc.ucr.edu/?a=d&d=DAC18491226.1.2";
function buildingStatus(spot){
  var burning = FIRE.burn.some(function(b){ return b.spot===spot; });
  var scorched = !burning && FIRE.scorch.some(function(s){ return s.spot===spot; });
  if(!burning && !scorched) return { text:"standing", onFire:false };
  if(simDay < FIRE.day0) return { text:"standing", onFire:false };
  if(simDay <= FIRE.day1+0.3) return { text: burning ? "burning — the Great Fire, Dec 24 1849" : "scorched but standing — the Great Fire", onFire:true };
  if(burning) return { text: simDay>=FIRE.rebuildDay ? "destroyed Dec 24 1849 — rebuilding" : "destroyed, Dec 24 1849", onFire:true };
  return { text:"standing (scorched in the Great Fire)", onFire:true };
}
/* §11 inspect law — BUILDING cards for EVERY structure, not just the named
   landmarks: type (residence / lodging house / grocer's / gambling house /
   …), occupant or business, founded date where documented, street corner.
   HOME_BUILDING_SPOTS maps 1:1 by index onto VILLAGE_BUILDING_SPOTS, so a
   spot's boarding/occupancy data rides along for free. */
function signWordAt(x,z){
  for(var i=0;i<SIGN_BUILDING_SPOTS.length;i++){
    var s = SIGN_BUILDING_SPOTS[i];
    if(Math.abs(s.x-x)<0.6 && Math.abs(s.z-z)<0.6) return s.word;
  }
  return null;
}
function buildingTypeWord(spot){
  var idx = VILLAGE_BUILDING_SPOTS.indexOf(spot);
  var home = idx>=0 && typeof HOME_BUILDING_SPOTS!=="undefined" ? HOME_BUILDING_SPOTS[idx] : null;
  var word = signWordAt(spot.x, spot.z);
  if(spot.type==="gambling") return "gambling house";
  if(spot.type==="hotel" || spot.name==="City Hotel") return "hotel";
  if(spot.name==="The Chapel") return "meeting house";
  if(spot.type==="business") return word ? (SIGN_WORD_LABEL[word]||word.toLowerCase()) : "storefront";
  if(spot.type==="rundown") return "rundown cabin — past the surveyed edge";
  if(home && home.boarding) return "lodging house";
  return "residence";
}
function openBuildingInspector(spot){
  var idx = VILLAGE_BUILDING_SPOTS.indexOf(spot);
  var home = idx>=0 && typeof HOME_BUILDING_SPOTS!=="undefined" ? HOME_BUILDING_SPOTS[idx] : null;
  var typeWord = buildingTypeWord(spot);
  var html = ipRow("TYPE", escapeHTML(typeWord));
  if(spot.name){
    var st = buildingStatus(spot);
    html += ipRow("STATUS", escapeHTML(st.text));
  }
  if(!spot.name && home){
    if(home.boarding) html += ipRow("OCCUPANTS", home.used>0 ? (home.used+" boarder"+(home.used===1?"":"s")+" of the town's floating crowd") : "rooms to let");
    else if(home.used>0) html += ipRow("OCCUPANTS", "a household of "+home.used);
  }
  html += ipRow("FOUNDED", (spot.foundedDay!=null && spot.foundedDay>0)
    ? escapeHTML(formatIssueDateLabel(todayISOFromSimDay(spot.foundedDay)))
    : (spot.foundedDay!=null
      ? "standing before the window opens (July 1846)" // e.g. City Hotel, built 1846 — founded day predates the sim clock
      : "standing at the window's open (no founding date in the record)"));
  html += ipRow("STREET", escapeHTML(nearestStreetPair(spot.x, spot.z))+" Streets");
  var info = spot.name ? NAMED_BUILDINGS[spot.name] : null;
  if(info) html += ipRow("THE RECORD", escapeHTML(info.detail));
  else if(spot.name) html += ipRow("THE RECORD", "One of the establishments named in the Alta's own account of Portsmouth Square.");
  var opts = { documented: !!spot.name };
  if(spot.name){
    var st2 = buildingStatus(spot);
    if(st2.onFire){ opts.receiptUrl = FIRE_RECEIPT_URL; }
  }
  showInspect(spot.name ? "NAMED BUILDING" : "BUILDING", spot.name || cap(typeWord), html, opts);
  SELECTED = { kind:"building", spot:spot };
  setSelRing(spot.x, spot.z, Math.max(spot.w, spot.d)*0.85+1.2);
  followedSlot = null; followedDocumented = null;
}
/* growth-rush frame houses + canvas tents (the 1848-49 build-out) get the
   same treatment — spawnedBuildings/spawnedTents entries carry spawnDay. */
function openGrowthBuildingInspector(b){
  var frac = clamp((simDay-b.spawnDay)/CONSTRUCTION_DAYS, 0, 1);
  var stage = frac<0.18 ? "materials on the lot" : frac<0.45 ? "frame up" : frac<0.8 ? "walls going on" : "finished";
  var html = ipRow("TYPE", "frame house — the growth rush");
  html += ipRow("STATE", escapeHTML(stage));
  html += ipRow("RAISED", escapeHTML(formatIssueDateLabel(todayISOFromSimDay(b.spawnDay))));
  html += ipRow("STREET", escapeHTML(nearestStreetPair(b.x, b.z))+" Streets");
  showInspect("BUILDING", "Frame house", html, {});
  SELECTED = { kind:"building", spot:b };
  setSelRing(b.x, b.z, 5);
  followedSlot = null; followedDocumented = null;
}
function openTentInspector(t){
  var html = ipRow("TYPE", "canvas tent");
  if(t.label) html += ipRow("CAMP", escapeHTML(t.label));
  if(t.spawnDay!=null) html += ipRow("PITCHED", escapeHTML(formatIssueDateLabel(todayISOFromSimDay(t.spawnDay))));
  showInspect("TENT", "Canvas tent", html, {});
  SELECTED = { kind:"tent", spot:t };
  setSelRing(t.x, t.z, 3);
  followedSlot = null; followedDocumented = null;
}
/* §11 STREET cards: name, the road-emergence lifecycle state as a plain
   word (grounding.md §9b — surveyed line / foot trail / worn road / graded
   street, computed live via roadPieceState at the picked point), survey +
   first-mention dates, and the dataset's own source note. */
var ROAD_STATE_WORD = { 0:"not yet traced", 1:"a surveyed line — paper only", 2:"a foot trail, worn by use",
  3:"a worn road, widening toward its plat", 4:"a graded street, full survey width" };
function streetSourceNote(id){
  var baseId = id.indexOf(":")>=0 ? id.slice(0, id.indexOf(":")) : id;
  for(var i=0;i<SG.streets.length;i++){
    if(SG.streets[i].id===baseId) return SG.streets[i].sourceNotes || null;
  }
  return null;
}
function openStreetInspector(s, atX, atZ){
  var wet = terrainHeight(atX, atZ) <= 0.5;
  var stateWord;
  if(wet) stateWord = "platted across the water lots — still open water here";
  else {
    var viogetExt = (s.surveyedDay!=null && s.surveyedDay<=0 && s.checkpoints.length) ? s.checkpoints[0].extent : null;
    // conservative: treat the picked point as inside the Vioget extent when
    // one exists (the floor only lifts S0/S1 to trail, per §9b)
    var st = roadPieceState(s, atX, atZ, simDay, !!viogetExt);
    stateWord = ROAD_STATE_WORD[st.st] || "—";
  }
  var html = ipRow("STATE", escapeHTML(stateWord));
  if(s.surveyedDay!=null){
    html += ipRow("SURVEYED", escapeHTML(s.surveyedDay<=0
      ? "Vioget's survey, 1839"
      : formatIssueDateLabel(todayISOFromSimDay(s.surveyedDay))));
  } else {
    html += ipRow("SURVEYED", "never platted in this window — corpus-attested use only");
  }
  if(s.firstMentionDay!=null) html += ipRow("FIRST IN PRINT", escapeHTML(formatIssueDateLabel(todayISOFromSimDay(s.firstMentionDay))));
  var note = streetSourceNote(s.id);
  if(note) html += ipRow("THE RECORD", escapeHTML(note.length>260 ? note.slice(0,257)+"…" : note));
  showInspect("STREET", s.name, html, {});
  SELECTED = { kind:"street", street:s, x:atX, z:atZ };
  setSelRing(atX, atZ, Math.max(6, s.widthM));
  followedSlot = null; followedDocumented = null;
}
function openZoneInspector(z){
  var html = ipRow("THE RECORD", escapeHTML(z.record || "named in the record"));
  if(z.revealDay>=0) html += ipRow("APPEARS", escapeHTML(formatIssueDateLabel(todayISOFromSimDay(z.revealDay))));
  showInspect("DISTRICT", z.name, html, {});
  SELECTED = { kind:"zone", zone:z };
  setSelRing(z.cx, z.cz, Math.min(z.r*0.5, 120));
  followedSlot = null; followedDocumented = null;
}
// (NAMED_BUILDING_SPOTS — derived buildings data — moved to buildings.js in
// the 2026-07-12 cleanup; buildings' landmark signage and people's City Hotel
// binding consume it, so labels-inspect could not own it.)
var BUILDING_LABEL_POOL = Math.min(4, NAMED_BUILDING_SPOTS.length); // decluttered hard cap (was 14)
var buildingLabelPool = [];
(function buildBuildingLabelPool(){
  var hudEl = document.getElementById("hud");
  for(var i=0;i<BUILDING_LABEL_POOL;i++){
    var el = document.createElement("div");
    // §11 grammar: key buildings = small period glyph + name, ink text with
    // a parchment halo, close zoom only (innerHTML set in updateBuildingLabels)
    el.className = "wlbl wlbl-loc";
    el.addEventListener("click", function(e){
      e.stopPropagation();
      if(this._spot) openBuildingInspector(this._spot);
    });
    hudEl.appendChild(el);
    buildingLabelPool.push(el);
  }
})();
/* engraved-style period glyphs (moved up from the biz-glyph tier so the
   location labels can share them; four new marks added for the §11
   "small symbol + name" location grammar: house, church, flag, anchor). */
var GLYPH_SVG = {
  fork:  '<svg viewBox="0 0 16 16"><path d="M5 2v5M8 2v5M11 2v5M8 7v7" stroke="#2b1d0e" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>',
  glass: '<svg viewBox="0 0 16 16"><path d="M5 3h6l-1.5 8h-3z" fill="none" stroke="#2b1d0e" stroke-width="1.2"/><path d="M6.5 13h3" stroke="#2b1d0e" stroke-width="1.2" stroke-linecap="round"/></svg>',
  cards: '<svg viewBox="0 0 16 16"><rect x="4" y="4" width="6" height="8" rx="1" transform="rotate(-14 7 8)" fill="none" stroke="#2b1d0e" stroke-width="1.1"/><rect x="6.5" y="4" width="6" height="8" rx="1" fill="none" stroke="#2b1d0e" stroke-width="1.1"/></svg>',
  bed:   '<svg viewBox="0 0 16 16"><rect x="3" y="7.5" width="10" height="4" fill="none" stroke="#2b1d0e" stroke-width="1.1"/><path d="M3 7.5V4h3v3.5" stroke="#2b1d0e" stroke-width="1.1" fill="none"/></svg>',
  anvil: '<svg viewBox="0 0 16 16"><path d="M3 6.5h10l-2 2H6z" fill="none" stroke="#2b1d0e" stroke-width="1.1"/><rect x="6.5" y="8.5" width="3" height="3.5" fill="none" stroke="#2b1d0e" stroke-width="1.1"/></svg>',
  barrel:'<svg viewBox="0 0 16 16"><rect x="5" y="2" width="6" height="12" rx="2.4" fill="none" stroke="#2b1d0e" stroke-width="1.1"/><path d="M5 6h6M5 10h6" stroke="#2b1d0e" stroke-width="1"/></svg>',
  house: '<svg viewBox="0 0 16 16"><path d="M3 8l5-4.5L13 8" fill="none" stroke="#2b1d0e" stroke-width="1.2"/><path d="M4.5 8v5h7V8" fill="none" stroke="#2b1d0e" stroke-width="1.1"/></svg>',
  church:'<svg viewBox="0 0 16 16"><path d="M8 2v3M6.6 3.5h2.8" stroke="#2b1d0e" stroke-width="1.1" fill="none"/><path d="M4.5 13V9l3.5-3 3.5 3v4" fill="none" stroke="#2b1d0e" stroke-width="1.1"/></svg>',
  flag:  '<svg viewBox="0 0 16 16"><path d="M5 2.5v11" stroke="#2b1d0e" stroke-width="1.2"/><path d="M5 3h6l-1.6 2L11 7H5z" fill="none" stroke="#2b1d0e" stroke-width="1.1"/></svg>',
  anchor:'<svg viewBox="0 0 16 16"><circle cx="8" cy="3.6" r="1.3" fill="none" stroke="#2b1d0e" stroke-width="1.1"/><path d="M8 5v8M4 10c0 2 1.8 3 4 3s4-1 4-3M5.8 7h4.4" fill="none" stroke="#2b1d0e" stroke-width="1.1" stroke-linecap="round"/></svg>'
};
function locGlyphFor(spot){
  if(spot.type==="gambling") return "cards";
  if(spot.type==="hotel" || (spot.name && /hotel/i.test(spot.name))) return "bed";
  if(spot.name==="The Chapel") return "church";
  return "house";
}
function locLabelHTML(glyph, name){
  return '<span class="wg">'+(GLYPH_SVG[glyph]||GLYPH_SVG.house)+'</span>'+escapeHTML(name);
}

/* §11 KEY LOCATIONS — a small fixed set of place labels beyond the named
   buildings (the plaza, Central Wharf, Mission Dolores), small glyph +
   name at close-to-mid zoom. Only documented places; no Post Office label —
   no documented site survives in this build's evidence base to place one. */
var LOC_POINTS = (function(){
  var cw = gridToWorld(GEO.streetsU.montgomery, GEO.streetsV.clay);
  return [
    { name:"The Plaza", glyph:"flag", x:PLAZA_CENTER.x, z:PLAZA_CENTER.z,
      record:"Portsmouth Square — the open square Vioget's 1839 survey kept at the town's heart; parade ground, market, and by 1849 a ring of round-the-clock gambling houses." },
    { name:"Central Wharf", glyph:"anchor", x:cw.x+120, z:cw.z, foundedDay:eventDateToSimDay("1849-05-01"),
      record:"Begun May 1849 off the foot of Clay Street and pushed ~800 feet out over the cove flats — the town's deep-water landing." },
    { name:"Mission Dolores", glyph:"church", x:OUTPOSTS.mission.x, z:OUTPOSTS.mission.z,
      record:"Mission San Francisco de Asís (founded 1776) — the peninsula's oldest settlement, a cluster of adobes at the end of the sand-hill road." },
    // s50 NATIVE PRESENCE: findability affordance (QA-GATE rule 3) for the
    // small (~true-scale) rancheria dwelling cluster — label ends with the
    // documented occupancy window (clm:pen:32), same gate as its tint zone.
    { name:"The Rancheria", glyph:"house",
      x:(window.RANCHERIA_SITE?RANCHERIA_SITE.cx:OUTPOSTS.mission.x-85), z:(window.RANCHERIA_SITE?RANCHERIA_SITE.cz:OUTPOSTS.mission.z-98),
      endDay:eventDateToSimDay("1848-12-31"),
      record:"The former Indian rancheria at Mission Dolores, 'occupied by remaining Indians' through 1848 — the dwelling place of the Ramaytush Ohlone remnant community (~15 descendants by 1842; about five families by 1850, per NPS/Milliken). No source documents Native settlement anywhere else on the peninsula in this period (peninsula-1846.md §2.1-2.2; native-presence-1846-49.md)." }
  ];
})();
var locLabelPool = [];
(function buildLocLabelPool(){
  var hudEl = document.getElementById("hud");
  LOC_POINTS.forEach(function(p){
    var el = document.createElement("div");
    el.className = "wlbl wlbl-loc";
    el.innerHTML = locLabelHTML(p.glyph, p.name);
    el.addEventListener("click", function(e){ e.stopPropagation(); openPlaceInspector(p); });
    hudEl.appendChild(el);
    p.el = el; locLabelPool.push(el);
  });
})();
function openPlaceInspector(p){
  var html = ipRow("THE RECORD", escapeHTML(p.record));
  if(p.foundedDay!=null) html += ipRow("BEGUN", escapeHTML(formatIssueDateLabel(todayISOFromSimDay(p.foundedDay))));
  showInspect("PLACE", p.name, html, { documented:true });
  SELECTED = { kind:"place", spot:p };
  setSelRing(p.x, p.z, 22);
  followedSlot = null; followedDocumented = null;
}
var _locLabelV = new THREE.Vector3();
function updateLocPoints(alt){
  // band: fade in below ~530m, gone above (the zone tier owns higher views)
  var fade = 1 - smoothstep(430, 530, alt);
  for(var i=0;i<LOC_POINTS.length;i++){
    var p = LOC_POINTS[i], el = p.el;
    if(fade<0.02 || (p.foundedDay!=null && simDay<p.foundedDay) || (p.endDay!=null && simDay>p.endDay)){ el.style.opacity=0; continue; }
    var y = terrainHeight(p.x,p.z)+4;
    _locLabelV.set(p.x,y,p.z).applyMatrix4(camera.matrixWorldInverse);
    if(_locLabelV.z>-1){ el.style.opacity=0; continue; }
    _locLabelV.set(p.x,y,p.z).project(camera);
    if(_locLabelV.x<-1.05||_locLabelV.x>1.05||_locLabelV.y<-1.05||_locLabelV.y>1.05){ el.style.opacity=0; continue; }
    el.style.opacity = fade*0.92;
    el.style.left = ((_locLabelV.x*0.5+0.5)*window.innerWidth)+"px";
    el.style.top = ((-_locLabelV.y*0.5+0.5)*window.innerHeight)+"px";
  }
}
var _bldgLabelV = new THREE.Vector3();
// LABEL TIER FIX (usability fix, 2026-07-09): name chips now belong ONLY to
// the close-in band (<=buildingLabelAlwaysAlt, ~120m) on every input type —
// the old "|| IS_TOUCH always-on up to zoomCartoFull(850)" bypass is what
// let ~12 name chips pile up over the whole town on mobile at ~213m. Above
// this altitude, updateBizGlyphs()'s decluttered roundels carry building
// identity instead; runLabelDeclutter() below does the final screen-space
// collision pass + cap on whatever this function marks visible.
function updateBuildingLabels(alt){
  if(alt > CFG.buildingLabelAlwaysAlt || NAMED_BUILDING_SPOTS.length===0){
    buildingLabelPool.forEach(function(el){ el.style.opacity = 0; el._spot = null; });
    return;
  }
  // nearest-N by screen distance from camera target, cheap since N is tiny (<25)
  // era-gate fix: never label a landmark before its founding date
  var cands = NAMED_BUILDING_SPOTS.filter(function(s){ return s.foundedDay==null || simDay>=s.foundedDay; }).sort(function(a,b){
    return (Math.hypot(a.x-camera.position.x,a.z-camera.position.z)) - (Math.hypot(b.x-camera.position.x,b.z-camera.position.z));
  }).slice(0, BUILDING_LABEL_POOL);
  for(var i=0;i<BUILDING_LABEL_POOL;i++){
    var el = buildingLabelPool[i], spot = cands[i];
    if(!spot){ el.style.opacity = 0; el._spot = null; continue; }
    _bldgLabelV.set(spot.x, spot.y+spot.h+1.4, spot.z);
    _bldgLabelV.applyMatrix4(camera.matrixWorldInverse);
    if(_bldgLabelV.z>-1){ el.style.opacity=0; el._spot=null; continue; }
    _bldgLabelV.set(spot.x, spot.y+spot.h+1.4, spot.z).project(camera);
    if(_bldgLabelV.x<-1.05||_bldgLabelV.x>1.05||_bldgLabelV.y<-1.05||_bldgLabelV.y>1.05){ el.style.opacity=0; el._spot=null; continue; }
    var sx = (_bldgLabelV.x*0.5+0.5)*window.innerWidth, sy = (-_bldgLabelV.y*0.5+0.5)*window.innerHeight;
    if(el._spot!==spot) el.innerHTML = locLabelHTML(locGlyphFor(spot), spot.name);
    el.style.opacity = 0.9;
    el.style.left = sx+"px";
    el.style.top = sy+"px";
    el._spot = spot;
  }
}

/* =====================================================================
   PL-A LEFTOVER, COMPLETED — mid-zoom (250-900m) business glyph tier: a
   small engraved-style parchment roundel per business/gambling/hotel
   building (BIZ_GLYPH_SPOTS, populated later once buildBuildingTypeAccents
   has typed every building). Fades in below zoomCartoFull(850), fully
   opaque by ~450m, fades back out below buildingLabelAlwaysAlt(250) where
   true-scale signage/architecture itself carries the identity instead —
   same "signs are the wayfinding, chips are the fallback" discipline the
   named-landmark labels above already follow. (GLYPH_SVG itself moved up
   beside the location-label tier, s42 — the two tiers share the marks.)
   ===================================================================== */
var BIZ_GLYPH_POOL = SCT(10), bizGlyphPool = []; // decluttered hard cap (was 30)
(function buildBizGlyphPool(){
  var hudEl = document.getElementById("hud");
  for(var i=0;i<BIZ_GLYPH_POOL;i++){
    var el = document.createElement("div");
    el.className = "biz-glyph";
    hudEl.appendChild(el);
    bizGlyphPool.push(el);
  }
})();
var _bizGlyphV = new THREE.Vector3();
var BIZ_GLYPH_ALT_FULL = 450, BIZ_GLYPH_ALT_NEAR = CFG.buildingLabelAlwaysAlt, BIZ_GLYPH_ALT_FAR = CFG.zoomCartoFull;
function updateBizGlyphs(alt){
  if(alt>BIZ_GLYPH_ALT_FAR || alt<BIZ_GLYPH_ALT_NEAR || BIZ_GLYPH_SPOTS.length===0){
    bizGlyphPool.forEach(function(el){ el.style.opacity = 0; });
    return;
  }
  var fadeOpacity = alt>BIZ_GLYPH_ALT_FULL ? smoothstep(BIZ_GLYPH_ALT_FAR, BIZ_GLYPH_ALT_FULL, alt)
                   : smoothstep(BIZ_GLYPH_ALT_NEAR, BIZ_GLYPH_ALT_NEAR+80, alt);
  // era-gate fix: never show a glyph over a building that isn't built yet
  var cands = BIZ_GLYPH_SPOTS.filter(function(s){ return s.foundedDay==null || simDay>=s.foundedDay; }).sort(function(a,b){
    return (Math.hypot(a.x-camera.position.x,a.z-camera.position.z)) - (Math.hypot(b.x-camera.position.x,b.z-camera.position.z));
  }).slice(0, BIZ_GLYPH_POOL);
  for(var i=0;i<BIZ_GLYPH_POOL;i++){
    var el = bizGlyphPool[i], spot = cands[i];
    if(!spot){ el.style.opacity = 0; continue; }
    _bizGlyphV.set(spot.x, spot.y+spot.h+0.6, spot.z);
    _bizGlyphV.applyMatrix4(camera.matrixWorldInverse);
    if(_bizGlyphV.z>-1){ el.style.opacity=0; continue; }
    _bizGlyphV.set(spot.x, spot.y+spot.h+0.6, spot.z).project(camera);
    if(_bizGlyphV.x<-1.05||_bizGlyphV.x>1.05||_bizGlyphV.y<-1.05||_bizGlyphV.y>1.05){ el.style.opacity=0; continue; }
    if(el._glyph!==spot.glyph){ el.innerHTML = GLYPH_SVG[spot.glyph]||""; el._glyph = spot.glyph; }
    el.style.opacity = fadeOpacity*0.92;
    el.style.left = ((_bizGlyphV.x*0.5+0.5)*window.innerWidth)+"px";
    el.style.top = ((-_bizGlyphV.y*0.5+0.5)*window.innerHeight)+"px";
  }
}

/* =====================================================================
   SCREEN-SPACE LABEL DECLUTTER ENGINE (usability fix, 2026-07-09)

   Every per-type update function above (updateBuildingLabels,
   updateBizGlyphs) and the ship/documented-moment ones further down set
   each pooled chip's opacity/left/top independently, every frame, purely
   from ITS OWN altitude/distance rules — none of them know about each
   other, so nothing ever stopped two chips from landing on the same
   screen pixels and fusing into an opaque pile (the field-reported bug:
   ~12 building-name chips stacked solid at 213m, hiding the whole town).

   This pass runs once per frame, AFTER all of those, and resolves
   collisions in screen space across every chip type at once:
     priority: selected/followed (documented moments) > named landmark
               (building names) > glyph roundel > ship
   Overlap losers are hidden outright (never partially stacked — no
   opacity blending between competing chips), building-related markers
   (names+glyphs together) are hard-capped at LABEL_DECLUTTER_CAP even
   with zero overlaps, and ties are broken by nearest-to-screen-center.
   Hovered (desktop) or currently-open (tap, either input) chips are
   always exempt from both the cap and the overlap test.

   The DECISION (which elements are suppressed) is only recomputed at
   ~5Hz (LABEL_DECLUTTER_INTERVAL) — cheap enough given the tiny pooled
   element counts, but there's no need to re-run a full O(n^2) collision
   pass 60x/sec for something that only needs to feel responsive, not
   frame-perfect. The cached decision is still APPLIED every frame (so a
   suppressed chip never gets a chance to flash back to full opacity in
   the 1-2 frames before the next decision tick), it's just not
   RECOMPUTED every frame.
   ===================================================================== */
var LABEL_DECLUTTER_CAP = 8;
var LABEL_DECLUTTER_INTERVAL = 200; // ms (~5Hz)
var LABEL_PAD = 3; // px slack before two labels count as "overlapping"
var LABEL_DECLUTTER_HYST_MS = 280;  // s42: street-engine-style hysteresis — a
                                    // label must stay accepted/rejected this
                                    // long before appearing/disappearing, so
                                    // zoom sweeps cross-fade instead of popping
var _declutterAcceptedRects = []; // this tick's accepted label boxes — consumed by the street-label
                                  // engine (recomputeStreetLabelPlacements) as blockers, so street
                                  // names always yield to point labels without a second collision system
var _lastDeclutterRun = 0;
var _dcState = new WeakMap(); // el -> {st:"off"|"pending"|"on"|"leaving", since}
// shared screen-rect overlap test — used by this engine AND the street-label engine above
function rectsOverlap(a,b,pad){ return a.left<b.right+pad && a.right+pad>b.left && a.top<b.bottom+pad && a.bottom+pad>b.top; }
function _labelHalfSize(el, kind){
  if(kind==="glyph") return { hw:10, hh:10 };
  // prefer the element's real rendered box (screening #5 item c: the
  // character-count estimate under-measured wide chips, letting "slight"
  // overlaps through the declutter); fall back to the estimate pre-layout.
  if(el.offsetWidth) return { hw: el.offsetWidth/2 + 2, hh: Math.max(11, el.offsetHeight/2 + 2) };
  var len = (el.textContent||"").length;
  return { hw: Math.min(120, 20+len*3.1), hh:11 };
}
function _declutterCollect(pool, kind, priority, buildingRelated, out){
  pool.forEach(function(el){
    var op = parseFloat(el.style.opacity);
    if(!(op>0.05)) return;
    var hs = _labelHalfSize(el, kind);
    var x = parseFloat(el.style.left)||0, y = parseFloat(el.style.top)||0;
    out.push({
      el:el, priority:priority, buildingRelated:buildingRelated,
      left:x-hs.hw, right:x+hs.hw, top:y-hs.hh, bottom:y+hs.hh, cx:x, cy:y,
      exempt: el.matches(":hover")
    });
  });
}
/* s42: EVERY point-label category now routes through this one engine —
   documented moments, building/location names, biz glyphs, ships, zones,
   and the region/waterway tier (geoLabelEls, filled by buildLabels below).
   Fixed UI panels (title/clock/scrubber/ticker/horizon bar/beat card/
   inspect panel — collectUIBlockerRects, shared with the street engine)
   enter the pass as pre-accepted blockers: no world label may underlap
   chrome (the user-reported zoomed-out collision). Street labels keep
   yielding via _declutterAcceptedRects, same as before. */
function recomputeLabelDeclutter(now){
  var items = [];
  _declutterCollect(documentedLabels, "text", 7, false, items);
  _declutterCollect(buildingLabelPool, "text", 6, true, items);
  _declutterCollect(locLabelPool, "text", 5, false, items);
  _declutterCollect(bizGlyphPool, "glyph", 4, true, items);
  _declutterCollect(shipLabelPool, "text", 3, false, items);
  _declutterCollect(zoneLabelEls, "text", 2, false, items);
  _declutterCollect(geoLabelEls, "text", 1, false, items); // regions/waterways: biggest text, lowest priority — they yield
  var cx = window.innerWidth/2, cy = window.innerHeight/2;
  items.forEach(function(it){ var dx=it.cx-cx, dy=it.cy-cy; it.d2 = dx*dx+dy*dy; });
  items.sort(function(a,b){
    if(a.exempt!==b.exempt) return a.exempt ? -1 : 1;
    if(a.priority!==b.priority) return b.priority-a.priority;
    return a.d2-b.d2;
  });
  var accepted = [], buildingCount = 0;
  var uiRects = collectUIBlockerRects();
  for(var u=0; u<uiRects.length; u++) accepted.push(uiRects[u]); // chrome wins, always
  var acceptedWorld = [];
  items.forEach(function(it){
    it._won = true;
    if(!it.exempt){
      if(it.buildingRelated && buildingCount>=LABEL_DECLUTTER_CAP){ it._won=false; }
      else {
        for(var i=0;i<accepted.length;i++){
          if(rectsOverlap(it, accepted[i], LABEL_PAD)){ it._won=false; break; }
        }
      }
    }
    if(!it._won) return;
    accepted.push(it); acceptedWorld.push(it);
    if(it.buildingRelated) buildingCount++;
  });
  // HYSTERESIS state machine (reused from the street-label engine): won
  // items persist ~280ms before appearing; losers keep rendering that long
  // before the CSS fade-out — no popping while pinch-zooming through bands.
  items.forEach(function(it){
    var s = _dcState.get(it.el);
    if(!s){ s = { st:"off", since:now }; _dcState.set(it.el, s); }
    if(it._won){
      if(s.st==="off"){ s.st="pending"; s.since=now; }
      else if(s.st==="pending" && now-s.since>=LABEL_DECLUTTER_HYST_MS){ s.st="on"; }
      else if(s.st==="leaving"){ s.st="on"; }
    } else {
      if(s.st==="pending"){ s.st="off"; }
      else if(s.st==="on"){ s.st="leaving"; s.since=now; }
      else if(s.st==="leaving" && now-s.since>=LABEL_DECLUTTER_HYST_MS){ s.st="off"; }
    }
  });
  _declutterAcceptedRects = acceptedWorld.map(function(a){ return { left:a.left, right:a.right, top:a.top, bottom:a.bottom }; });
}
var _DECLUTTER_POOLS_ALL = null;
function applyLabelDeclutter(now){
  if(now-_lastDeclutterRun >= LABEL_DECLUTTER_INTERVAL){
    _lastDeclutterRun = now;
    recomputeLabelDeclutter(now);
  }
  if(!_DECLUTTER_POOLS_ALL) _DECLUTTER_POOLS_ALL = [documentedLabels, buildingLabelPool, locLabelPool, bizGlyphPool, shipLabelPool, zoneLabelEls, geoLabelEls];
  _DECLUTTER_POOLS_ALL.forEach(function(pool){
    pool.forEach(function(el){
      var s = _dcState.get(el);
      if(s && (s.st==="off"||s.st==="pending") && parseFloat(el.style.opacity)>0.05) el.style.opacity = 0;
    });
  });
}
var geoLabelEls = []; // regions + waterways — filled by buildLabels() far below

/* s42 INSPECT LAW — inspectable-mesh registry: any InstancedMesh whose
   every instance is the same species/kind (trees, fauna) registers here
   with its catalog identity; the tap raycaster resolves a hit to a
   species card without per-instance bookkeeping. */
var INSPECT_MESHES = [];
function tagInspect(mesh, kind, species, note){
  if(!mesh) return mesh;
  mesh.userData._inspect = { kind:kind, species:species, note:note||null };
  INSPECT_MESHES.push(mesh);
  return mesh;
}
function openSpeciesInspector(info, x, z, r){
  var html = ipRow("SPECIES", escapeHTML(info.species));
  if(info.note) html += ipRow("THE RECORD", escapeHTML(info.note));
  showInspect(info.kind.toUpperCase(), info.species, html, {});
  SELECTED = { kind:info.kind, x:x, z:z };
  setSelRing(x, z, r||2.5);
  followedSlot = null; followedDocumented = null;
}

/* @P1850-CHUNK 51 — geographic labels */
/* =====================================================================
   GEOGRAPHIC LABELS — s42 §11 grammar split: WATERWAYS (blue-toned italic
   serif, title case — Yerba Buena Cove, San Francisco Bay, the Golden
   Gate, Mission Creek pushed in at buildLabels once the marsh site is
   known) vs REGIONS (large, very faint caps that own the high altitudes).
   No more parchment chips — floating haloed text only.
   ===================================================================== */
/* Hill/landmark label positions verified against the baked heightmap
   (tools/debug-region.js peak search) rather than the old procedural
   ring's hand-picked, unverified coordinates — see research/peninsula-1846.md
   for the source bearings/distances used to seed the search. */
var LABELS = [
  { name:"the Golden Gate",       cat:"water",              x:-4000, z:-3450, y:40 },
  { name:"San Francisco Bay",     cat:"water",              x:2600,  z:-1700, y:30 },
  { name:"Yerba Buena Cove",      cat:"water", near:true,   x:200,   z:20,    y:20 },
  { name:"TELEGRAPH HILL",        cat:"region", x:-134,  z:-808,  y:null },
  { name:"NOB HILL",              cat:"region", x:-945,  z:181,   y:null },
  { name:"RINCON HILL",           cat:"region", x:1076,  z:1118,  y:null },
  { name:"YERBA BUENA ISLAND",    cat:"region", x:3360,  z:-1620, y:null },
  { name:"MISSION DOLORES",       cat:"region", x:-1997, z:3462,  y:null },
  { name:"THE PRESIDIO",          cat:"region", x:-4776, z:-234,  y:null },
  { name:"ALCATRAZ",              cat:"region", x:-1600, z:-3460, y:null }
];

/* @P1850-CHUNK 62 — person cards, follow, click/tap selection (doPick) */
/* ---- 8. PERSON cards + Follow + provenance toggle (s42: rendered into
   the ONE inspect panel; the #person-inspector popup is deleted). ---- */
var followedSlot = null, followedDocumented = null;
/* Clicking a HOME/WORK name in the bio card flies the camera there (spec
   ask #2) — releases follow-mode first so the per-frame follow-lock in
   animate() doesn't immediately snap the target back onto the walker. */
window.__piFlyTo = function(x,z,alt){
  followedSlot = null; followedDocumented = null;
  flyTo(x,z,alt);
};
/* §11 "documented receipts w/ click-to-paper": scan the baked feed for a
   printed mention of a roster person's name; clicking opens THE PAPER at
   that issue, scrolled to the item — same mechanism as the ticker click. */
function findPaperMention(name){
  if(!name) return null;
  var target = name.toUpperCase();
  var surname = null;
  var parts = target.replace(/[.]/g,"").split(/\s+/);
  if(parts.length>1 && parts[parts.length-1].length>3) surname = parts[parts.length-1];
  for(var k=0;k<FEED_DATES.length;k++){
    var dateKey = FEED_DATES[k], issue = FEED_BY_DATE[dateKey];
    for(var i=0;i<issue.items.length;i++){
      var it = issue.items[i];
      // s44: skip extraction-artifact items whose "headline" is a raw token
      // (e.g. "period_diction") — never show those as a receipt line.
      if(!it.headline || /_/.test(it.headline)) continue;
      var hay = ((it.headline||"")+" "+(it.text||"")).toUpperCase();
      if(hay.indexOf(target)>=0 || (surname && hay.indexOf(surname)>=0)){
        return { dateKey:dateKey, headline:it.headline };
      }
    }
  }
  return null;
}
window.__ipOpenPaper = function(dateKey, headline){
  pendingScrollHeadline = headline;
  paperView = "feed";
  ppTabFeed.classList.add("active"); ppTabBroadsheet.classList.remove("active");
  forcedIssueKey = dateKey;
  _lastRenderKey = null;
  setPaperOpen(true);
};
var _ipMention = null; // last-rendered paper mention, consumed by the delegated click below
ipBodyEl.addEventListener("click", function(e){
  var t = e.target;
  if(t && t.classList && t.classList.contains("ip-paper") && _ipMention){
    e.preventDefault();
    window.__ipOpenPaper(_ipMention.dateKey, _ipMention.headline);
  }
});
function openPersonInspectorForSlot(slot){
  var bio = generateBio(slot);
  // grounding.md cast tiers: a roster-backed person is "from the record"
  // (real name, printed role) rather than wholly simulated — quiet badge
  // text only, no meta commentary (voice rule).
  var html = "";
  html += ipRow("ORIGIN &middot; ARRIVED &middot; TRADE"+(bio.wage?" &middot; WAGE":""),
    escapeHTML(bio.origin+" · "+bio.arrivedYear+" · "+bio.trade+(bio.wage?(" · "+bio.wage):"")));
  var homeLink = '<a href="#" class="ip-fly" onclick="__piFlyTo('+slot.homePos.x.toFixed(1)+','+slot.homePos.z.toFixed(1)+',110);return false;">'+escapeHTML(slot.homeLabel)+'</a>';
  var detailHtml = 'Boards at '+homeLink;
  if(slot.workPos){
    // s44 grammar fix: labels like "the Mission grazing grounds" already
    // carry their article — don't prepend a second "the".
    var worksArticle = /^the /i.test(slot.workLabel||"") ? 'works ' : 'works the ';
    detailHtml += '; '+worksArticle+'<a href="#" class="ip-fly" onclick="__piFlyTo('+slot.workPos.x.toFixed(1)+','+slot.workPos.z.toFixed(1)+',110);return false;">'+escapeHTML(slot.workLabel)+'</a>';
  }
  detailHtml += bio.role ? (". Printed in the record as \""+escapeHTML(bio.role)+"\".") : (bio.agenda ? ". "+escapeHTML(bio.agenda)+"." : ".");
  if(bio.family) detailHtml += escapeHTML(bio.family);
  html += ipRow("HOME"+(slot.workPos?" &middot; WORK":""), detailHtml);
  // s50: documented-individual card rows (Pedro Evencio, clm:demo:142) —
  // the record's facts verbatim + their source, no invented dialogue or
  // motive (spec §15).
  if(slot.docFacts){
    html += ipRow("FROM THE RECORD", escapeHTML(slot.docFacts));
    if(slot.docSource) html += ipRow("SOURCE", escapeHTML(slot.docSource));
  }
  html += '<span class="ip-label">NOW</span><span class="ip-field ip-now" id="ip-now">'+escapeHTML(slot._now||"—")+'</span>';
  _ipMention = bio.role ? findPaperMention(bio.name) : null; // only roster names can be in print
  if(_ipMention){
    html += '<span class="ip-label">RECEIPT</span><span class="ip-field"><a href="#" class="ip-paper" onclick="return false;">in the paper: '
      + escapeHTML(_ipMention.headline)+' →</a></span>';
  }
  showInspect(slot.docFacts ? "PERSON — DOCUMENTED" : (bio.role ? "PERSON — FROM THE RECORD" : "PERSON — UNRECORDED"), bio.name, html,
    { hint:"Esc — release", documented:!!slot.docFacts });
  SELECTED = { kind:"person", slot:slot };
  setSelRing(slot._x, slot._z, 1.4);
  followedSlot = slot; followedDocumented = null;
  followReleaseEl.classList.add("on"); // s54: touch path for Esc
  setZoomMeters(70);
}
function openPersonInspectorForDocumented(doc){
  var html = "";
  html += ipRow("SUMMARY", escapeHTML(doc.summary));
  html += ipRow("RECEIPT NOTE", escapeHTML(doc.detail));
  _ipMention = null;
  showInspect("DOCUMENTED", doc.name, html, {
    documented:true,
    receiptUrl: doc.receiptUrl || null,
    receiptText: doc.receiptNote ? (doc.receiptNote+" →") : "view the original page →",
    hint:"Esc — release"
  });
  SELECTED = { kind:"documented", doc:doc };
  setSelRing(doc.x, doc.z, 2.2);
  followedDocumented = doc; followedSlot = null;
  followReleaseEl.classList.add("on"); // s54: touch path for Esc
  setZoomMeters(90);
}
var provenanceOnly = false;
var hudProvenanceEl = document.getElementById("hud-provenance");
function setProvenanceOnly(on){
  provenanceOnly = on;
  hudProvenanceEl.classList.toggle("on", on);
  if(on && followedSlot) closeInspect(); // simulated fill (and its card) hides under the record-only toggle
}
window.addEventListener("keydown", function(e){
  if(e.key==="p"||e.key==="P") setProvenanceOnly(!provenanceOnly);
  if(e.key==="Escape") closeInspect(); // §11: ESC deselects (one inspect surface)
});

/* ---- 9. click/tap selection (s42 §11 INSPECT LAW — the doPick): one
   resolver for EVERY selectable entity kind, priority ordered
     person > documented figure > ship > tree/fauna > building/tent >
     street > zone > empty (deselect).
   Called from the pointer/touch input handlers below with a movement
   threshold already applied there. ---- */
var peopleRaycaster = new THREE.Raycaster();
var _peopleNdc = new THREE.Vector2();
/* U3 hit-target fix: a walking figure's capsule is only ~0.2-0.27m wide in
   world space, so an exact ray/mesh intersection routinely misses fingers
   and even careful mouse clicks. If the precise raycast comes up empty,
   snap to the nearest visible person within a small on-screen radius of the
   tap instead of silently no-op'ing. */
var _snapV3 = new THREE.Vector3();
var SNAP_PX = 24;
function nearestPersonAtScreenXY(clientX, clientY){
  var best=null, bestD=SNAP_PX;
  for(var mi=0; mi<personMeshSlots.length; mi++){
    var arr = personMeshSlots[mi];
    for(var ii=0; ii<arr.length; ii++){
      var slot = arr[ii];
      if(!slot) continue;
      _snapV3.set(slot._x, terrainHeight(slot._x, slot._z)+1.0, slot._z);
      _snapV3.project(camera);
      if(_snapV3.z<-1 || _snapV3.z>1) continue; // behind camera / outside clip range
      var sx=(_snapV3.x*0.5+0.5)*window.innerWidth, sy=(-_snapV3.y*0.5+0.5)*window.innerHeight;
      var d=Math.hypot(sx-clientX, sy-clientY);
      if(d<bestD){ bestD=d; best=slot; }
    }
  }
  return best;
}
function trySnapToNearestPerson(clientX, clientY){
  var best = nearestPersonAtScreenXY(clientX, clientY);
  if(best){ openPersonInspectorForSlot(best); return true; }
  return false;
}
/* s44: pointer-hover ring on people — hover marks who is inspectable (ties
   into the inspect panel; click opens it). Desktop pointers only; the scan
   is the same cheap projected-distance sweep the tap-snap uses, throttled. */
var hoverRingMesh = (function(){
  var g = new THREE.RingGeometry(0.82, 1.0, 48);
  var m = new THREE.MeshBasicMaterial({ color:0xf1e6c9, transparent:true, opacity:0.30,
    depthWrite:false, depthTest:false, side:THREE.DoubleSide, fog:false });
  var mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI/2; mesh.visible = false; mesh.renderOrder = 9;
  scene.add(mesh);
  return mesh;
})();
var _hoverPX = -1, _hoverPY = -1, _hoverSlot = null, _hoverNextScan = 0;
if(!IS_TOUCH){
  window.addEventListener("pointermove", function(e){ _hoverPX = e.clientX; _hoverPY = e.clientY; }, {passive:true});
}
function updateHoverRing(now){
  if(IS_TOUCH || _hoverPX<0) return;
  var anyPeople = false;
  for(var i=0;i<personMeshes.length;i++){ if(personMeshes[i].count>0){ anyPeople=true; break; } }
  if(!anyPeople){ hoverRingMesh.visible=false; _hoverSlot=null; renderer.domElement.style.cursor=""; return; }
  if(now>=_hoverNextScan){
    _hoverNextScan = now+120;
    _hoverSlot = nearestPersonAtScreenXY(_hoverPX, _hoverPY);
  }
  var s = _hoverSlot;
  var selIsSame = SELECTED && SELECTED.kind==="person" && SELECTED.slot===s;
  if(s && !selIsSame){
    hoverRingMesh.position.set(s._x, Math.max(terrainHeight(s._x,s._z),0)+0.5, s._z);
    hoverRingMesh.scale.set(1.25,1.25,1);
    hoverRingMesh.visible = true;
  } else hoverRingMesh.visible = false;
  renderer.domElement.style.cursor = s ? "pointer" : "";
}
function metersPerPixelAtFocus(){
  return 2*Math.tan(camera.fov*Math.PI/360)/window.innerHeight * (CAM ? CAM.radius : 500);
}
function _distToSegXZ(x,z,x0,z0,x1,z1){
  var dx=x1-x0, dz=z1-z0, len2=dx*dx+dz*dz;
  var t = len2>0 ? ((x-x0)*dx+(z-z0)*dz)/len2 : 0;
  t = clamp(t,0,1);
  return { d: Math.hypot(x-(x0+dx*t), z-(z0+dz*t)), px:x0+dx*t, pz:z0+dz*t };
}
/* STREET pick: nearest era-gated street polyline (active checkpoint extent,
   current skew) within its own width or ~12 screen px, whichever is wider. */
function pickStreetAt(px, pz){
  var mpp = metersPerPixelAtFocus();
  var best = null, bestD = 1e9;
  for(var i=0;i<STREETS_RUNTIME.length;i++){
    var s = STREETS_RUNTIME[i];
    var gate = s.surveyedDay!=null ? s.surveyedDay : s.firstMentionDay;
    if(gate==null || simDay<gate) continue;
    var pts = streetActiveWorldPts(s, simDay, CURRENT_STREET_SKEW);
    if(!pts || pts.length<2) continue;
    for(var j=1;j<pts.length;j++){
      var r = _distToSegXZ(px,pz, pts[j-1].x,pts[j-1].z, pts[j].x,pts[j].z);
      if(r.d<bestD){ bestD=r.d; best={ s:s, x:r.px, z:r.pz, d:r.d }; }
    }
  }
  if(!best) return null;
  var thresh = Math.max(best.s.widthM*0.75, mpp*12, 5);
  return bestD<=thresh ? best : null;
}
function tryPickShip(raycaster){
  var hits = raycaster.intersectObjects(shipHullMeshes.concat(mastClusterMeshes), false);
  if(!hits.length) return false;
  var h = hits[0];
  var v = null;
  var ti = shipHullMeshes.indexOf(h.object);
  if(ti>=0) v = shipPickVisits[ti][h.instanceId];
  else { var mi = mastClusterMeshes.indexOf(h.object); if(mi>=0) v = mastPickVisits[mi][h.instanceId]; }
  if(v){ openShipInspector(v); return true; }
  return false;
}
function tryPickSpecies(raycaster){
  var hits = raycaster.intersectObjects(INSPECT_MESHES, false);
  if(!hits.length) return false;
  var h = hits[0];
  var info = h.object.userData._inspect;
  if(!info) return false;
  openSpeciesInspector(info, h.point.x, h.point.z, info.kind==="tree" ? 3.2 : 2);
  return true;
}
function tryPickGroundEntity(gx, gz, alt){
  // buildings (village core, era-gated), then growth frame houses, tents
  var i, best=null, bestD=1e9, d;
  for(i=0;i<VILLAGE_BUILDING_SPOTS.length;i++){
    var sp = VILLAGE_BUILDING_SPOTS[i];
    if(sp.foundedDay!=null && simDay<sp.foundedDay) continue;
    d = Math.hypot(sp.x-gx, sp.z-gz);
    if(d < Math.max(sp.w,sp.d)*0.75+1.5 && d<bestD){ bestD=d; best={kind:"village", spot:sp}; }
  }
  if(best){ openBuildingInspector(best.spot); return true; }
  for(i=0;i<spawnedBuildings.length;i++){
    var gb = spawnedBuildings[i];
    d = Math.hypot(gb.x-gx, gb.z-gz);
    if(d<4.5 && d<bestD){ bestD=d; best={kind:"growth", spot:gb}; }
  }
  if(best){ openGrowthBuildingInspector(best.spot); return true; }
  for(i=0;i<spawnedTents.length;i++){
    var tt = spawnedTents[i];
    d = Math.hypot(tt.x-gx, tt.z-gz);
    if(d<3 && d<bestD){
      bestD=d;
      var cand = tentCandidates[i]; // growReveal keeps index parity with the candidate pool
      best={kind:"tent", spot:{ x:tt.x, z:tt.z, spawnDay:tt.spawnDay, label:cand?cand.label:null }};
    }
  }
  if(best){ openTentInspector(best.spot); return true; }
  // streets
  var st = pickStreetAt(gx, gz);
  if(st){ openStreetInspector(st.s, st.x, st.z); return true; }
  // zones — only meaningful above the close-in band (their tint tier)
  if(alt>250){
    for(i=0;i<DISTRICT_ZONES.length;i++){
      var z = DISTRICT_ZONES[i];
      if(z.revealDay>=0 && simDay<z.revealDay) continue;
      if(z.endDay!=null && simDay>z.endDay) continue; // s50: the rancheria's zone window closes after 1848
      if(Math.hypot(z.cx-gx, z.cz-gz) <= z.r*0.85){ openZoneInspector(z); return true; }
    }
  }
  return false;
}
function trySelectAtScreenXY(clientX, clientY){
  _peopleNdc.x = (clientX/window.innerWidth)*2-1;
  _peopleNdc.y = -(clientY/window.innerHeight)*2+1;
  peopleRaycaster.setFromCamera(_peopleNdc, camera);
  // 1. people + the documented-moment figures (precise)
  var targets = personMeshes.concat(documentedMeshes);
  var hits = peopleRaycaster.intersectObjects(targets, false);
  if(hits.length){
    var hit = hits[0];
    var mi = personMeshes.indexOf(hit.object);
    if(mi>=0){
      var slot = (personMeshSlots[mi]||[])[hit.instanceId];
      if(slot){ openPersonInspectorForSlot(slot); return true; }
    }
    var di = documentedMeshes.indexOf(hit.object);
    if(di>=0){ openPersonInspectorForDocumented(DOCUMENTED_MOMENTS[di]); return true; }
  }
  // 2. near-miss snap to a person (tiny capsules, U3 fix)
  if(trySnapToNearestPerson(clientX, clientY)) return true;
  // 3. ships (hulls + the mast-cluster overflow tier)
  if(tryPickShip(peopleRaycaster)) return true;
  // 4. trees / fauna (species-tagged instanced meshes)
  if(tryPickSpecies(peopleRaycaster)) return true;
  // 5. ground entities: buildings, tents, streets, zones
  var g = groundHit(clientX, clientY);
  if(g && tryPickGroundEntity(g.x, g.z, lastKnownAlt)) return true;
  // 6. empty — §11: tap-empty deselects
  closeInspect();
  return false;
}


/* ---- labels-inspect audit (layers-spec.md rules block): no overlapping
   rendered labels, incl. UI rects — the existing computed check (worldLabels
   boxes vs rectsOverlap + collectUIBlockerRects), consolidated. ---- */
registerAudit("labels-inspect", "overlap", function(){
  var labels = window.__P1850.worldLabels; // visible world labels with screen boxes
  var ui = collectUIBlockerRects();
  var overlaps = [];
  for(var i=0;i<labels.length;i++){
    for(var j=i+1;j<labels.length;j++)
      if(rectsOverlap(labels[i], labels[j], -1)) // -1px: touching edges are legal
        overlaps.push({ a:labels[i].text, b:labels[j].text });
    for(var u=0;u<ui.length;u++)
      if(rectsOverlap(labels[i], ui[u], -1))
        overlaps.push({ a:labels[i].text, b:"UI#"+u });
  }
  return { pass: overlaps.length===0, labels: labels.length, uiRects: ui.length, overlaps: overlaps };
});

/* @P1850-CHUNK 65 — geographic label DOM + per-frame updater (relocated from terrain.js, cleanup 2026-07-12 — labels-inspect OWNS all floating labels; runs right after the terrain chunk that used to hold it, before the first animate() frame) */
// ---- geographic labels for the west (§11 grammar; join the shared pool;
// pushed from here since the 2026-07-12 cleanup — the entries carry the
// same coordinates buildWestGeography verified against the baked terrain) ----
LABELS.push(
  { name:"Pacific Ocean",        cat:"water",            x:-10400, z:3200, y:30 },
  { name:"Mission Bay",          cat:"water", near:true, x:850,   z:2350, y:12 },
  { name:"Lake Merced",          cat:"water", near:true, x:-7600, z:7900, y:8 },
  { name:"Mountain Lake",        cat:"water", near:true, x:-5700, z:695,  y:null },
  { name:"Lobos Creek",          cat:"water", near:true, x:-6100, z:190,  y:null },
  { name:"Washerwoman's Lagoon", cat:"water", near:true, x:-2754, z:-816, y:null },
  { name:"SEAL ROCKS",           cat:"region", x:-9880, z:1620, y:14 },
  { name:"POINT LOBOS",          cat:"region", x:-9200, z:1150, y:null },
  { name:"THE GREAT SAND BANK",  cat:"region", x:-7300, z:3600, y:null },
  { name:"OCEAN BEACH",          cat:"region", x:-9380, z:4300, y:8 },
  { name:"FORT POINT",           cat:"region", x:-6405, z:-1600, y:10 }
);

(function buildLabels(){
  var hudEl = document.getElementById("hud");
  // §11 waterway set: Mission Creek joins here (its marsh-edge site is
  // found at runtime by the heron placement search — reuse it rather than
  // invent a second coordinate for the same feature).
  if(typeof HERON_SPOTS!=="undefined" && HERON_SPOTS.length){
    LABELS.push({ name:"Mission Creek", cat:"water", near:true, x:HERON_SPOTS[0].x, z:HERON_SPOTS[0].z, y:null });
  }
  LABELS.forEach(function(L){
    var el = document.createElement("div");
    el.className = "wlbl " + (L.cat==="water" ? "wlbl-water" : L.cat==="route" ? "wlbl-route" : "wlbl-region");
    el.textContent = L.name;
    hudEl.appendChild(el);
    L.el = el;
    geoLabelEls.push(el); // shared declutter engine pool
    var gy = (L.y!==null && L.y!==undefined) ? L.y : groundHeight(L.x,L.z)+45;
    L.pos = new THREE.Vector3(L.x, gy, L.z);
  });
})();
var _labelV = new THREE.Vector3();
/* §11 zoom choreography: regions OWN the high band (fade in ascending
   ~1050-1600m and stay); big waterways ride a slightly lower shoulder;
   near waterways (the cove, Mission Creek) live in the street/zone band
   and bow out again at altitude. All cross-fades — no popping. */
function _geoLabelBandOpacity(L, alt){
  if(L.cat==="water"){
    if(L.near) return smoothstep(260, 430, alt) * (1 - smoothstep(2600, 4200, alt));
    return smoothstep(750, 1200, alt);
  }
  return smoothstep(1050, 1600, alt);
}
function updateLabels(alt){
  for(var i=0;i<LABELS.length;i++){
    var L = LABELS[i];
    var fade = _geoLabelBandOpacity(L, alt);
    if(fade<0.02){ L.el.style.opacity = 0; continue; }
    // in front of the camera?
    _labelV.copy(L.pos).applyMatrix4(camera.matrixWorldInverse);
    if(_labelV.z > -1){ L.el.style.opacity = 0; continue; }
    _labelV.copy(L.pos).project(camera);
    if(_labelV.x<-1.05||_labelV.x>1.05||_labelV.y<-1.05||_labelV.y>1.05){ L.el.style.opacity = 0; continue; }
    L.el.style.opacity = fade*0.95;
    L.el.style.left = ((_labelV.x*0.5+0.5)*window.innerWidth)+"px";
    L.el.style.top  = ((-_labelV.y*0.5+0.5)*window.innerHeight)+"px";
  }
}

/* dev-tooling visibility interface (layers-spec.md §15): this layer's visibility toggle (DOM labels via a CSS class gate whose rule ships only in the dev-tool artifact) */
registerLayerVisibility("labels", function(v){ document.body.classList.toggle("dev-labels-off", !v); if(!v){ selRingMesh.visible = false; hoverRingMesh.visible = false; } });
