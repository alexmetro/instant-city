/* =====================================================================
   LAYER camera-input (slot 11) — OWNS camera rig, pointer/touch/keys, speed pill + menu chrome bindings. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 4 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 25 — speed pill DOM wiring (relocated from core/03-sim, cleanup 2026-07-12 — camera-input OWNS the speed pill; exact original global position, so the setSimSpeed(0) boot call still paints the pill) */
/* s54 TOUCH CONTROL SURFACE — the segmented speed pill (coarse-pointer
   chrome, see CSS). Taps route through the same setSimSpeed() the keyboard
   uses; setSimSpeed() highlights the active segment, so the pill always
   shows the current state. */
var speedPillEl = document.getElementById("speed-pill");
function updateSpeedPill(key){
  if(!speedPillEl) return;
  var segs = speedPillEl.children;
  for(var i=0;i<segs.length;i++){
    segs[i].classList.toggle("active", segs[i].getAttribute("data-speed")===String(key));
  }
  // first segment is a play/pause TOGGLE and shows the available action:
  // ▶ while paused (tap = play), ❚❚ while running (tap = pause)
  segs[0].innerHTML = key===0 ? "&#9654;" : "&#10074;&#10074;";
}
if(speedPillEl) speedPillEl.addEventListener("click", function(e){
  var seg = e.target.closest ? e.target.closest(".sp-seg") : null;
  if(!seg) return;
  var k = seg.getAttribute("data-speed");
  if(k==="0"){ setSimSpeed(simSpeedKey===0 ? "live" : 0); return; } // mirror the Space key: pause <-> LIVE
  if(k==="day"||k==="week"||k==="month") lastActiveSpeed = k; // mirror the 2/3/4 key handlers
  setSimSpeed(k);
});

/* @P1850-CHUNK 27 — sim-speed keyboard bindings (relocated from core/03-sim, cleanup 2026-07-12 — camera-input OWNS keys; exact original global position keeps keydown-listener registration order) */
window.addEventListener("keydown", function(e){
  if(e.code==="Space"){
    e.preventDefault();
    if(simSpeedKey===0) setSimSpeed("live"); else setSimSpeed(0);
  }
  if(e.key==="1"){ setSimSpeed("x2"); } // 2x follow — schedule-true, not a timelapse tier
  if(e.key==="2"){ lastActiveSpeed="day";   setSimSpeed("day"); }
  if(e.key==="3"){ lastActiveSpeed="week";  setSimSpeed("week"); }
  if(e.key==="4"){ lastActiveSpeed="month"; setSimSpeed("month"); }
});

/* @P1850-CHUNK 35 — flyTo (camera-rig write) + pulse crosshair (relocated from ui-chrome, cleanup 2026-07-12 — the rig is camera-input's; exact original global position preserves mesh/scene.add order) */
/* ---- brief crosshair pulse at a fly destination ---- */
var pulseGeo = new THREE.RingGeometry(1,1.15,32); pulseGeo.rotateX(-Math.PI/2);
var pulseMat = new THREE.MeshBasicMaterial({ color:0xf1e6c9, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide, fog:false });
var pulseMesh = new THREE.Mesh(pulseGeo, pulseMat); scene.add(pulseMesh);
var pulseT = -1;
function pulseAt(x,z){ pulseMesh.position.set(x, groundHeight(x,z)+1.5, z); pulseT = 0; }
function updatePulse(dt){
  if(pulseT<0) return;
  pulseT += dt;
  var dur = 1.15;
  if(pulseT>dur){ pulseT=-1; pulseMat.opacity=0; return; }
  var t = pulseT/dur;
  var s = lerp(4,70,t);
  pulseMesh.scale.set(s,s,s);
  pulseMat.opacity = (1-t)*0.85;
}
function flyTo(x,z,alt){
  CAM.focusT = new THREE.Vector3(x, groundHeight(x,z), z);
  setZoomMeters(alt||260);
  pulseAt(x,z);
}

/* @P1850-CHUNK 72 — camera rig, pointer/touch/keys, speed pill + menu chrome, WASD */
/* =====================================================================
   CAMERA RIG + INPUT — Annals-kingdom architecture (ported verbatim from
   research/annals-nav-reference.md, 2026-07-10; see field notes there).
   REPLACES the previous spring-damper rig, momentum-coast system, and
   split mouse/touch/wheel/gesture handling entirely. This was the fix for
   the P0 usability bug: iPad trackpad pinch used to hijack Safari's page
   zoom, unrecoverably, because our old input layer never listened for
   the Safari-only gesturestart/gesturechange/gestureend events.

   One normalized zoom scalar (CAM.tT, target; CAM.t, smoothed) drives
   radius AND pitch together — 0 = fully zoomed in (CFG.minAltitude),
   1 = fully zoomed out (CFG.maxAltitude), same convention the old
   elevationForDistance() used internally, so the semantic-zoom bands
   (labels/declutter/district-tint) keep exactly the same meaning as
   before. yawT/yaw (orbit azimuth), pitchOffT/pitchOff (manual tilt,
   same tuned range as before), and focusT/focus (pan target, world xz)
   each chase their target with the same single-pole smoothing — no
   velocity/spring state anywhere, so nothing can fight the drag.
   ===================================================================== */
function tFromRadius(r){
  r = clamp(r, CFG.minAltitude, CFG.maxAltitude);
  return (Math.log(r)-Math.log(CFG.minAltitude))/(Math.log(CFG.maxAltitude)-Math.log(CFG.minAltitude));
}
function radiusFromT(t){
  return Math.exp(lerp(Math.log(CFG.minAltitude), Math.log(CFG.maxAltitude), clamp(t,0,1)));
}
function getZoomMeters(){ return radiusFromT(CAM.tT); }
function setZoomMeters(m){ CAM.tT = tFromRadius(m); }

var CAM = {
  tT: tFromRadius(1600), t: tFromRadius(1600),
  yawT: 0.65, yaw: 0.65,
  pitchOffT: 0, pitchOff: 0,
  focusT: new THREE.Vector3(PLAZA_CENTER.x, VILLAGE_Y+2, PLAZA_CENTER.z),
  focus: new THREE.Vector3(PLAZA_CENTER.x, VILLAGE_Y+2, PLAZA_CENTER.z),
  radius: 1600 // cached each frame (meters) — read by panBy/wheel/pinch for their screen->world scale
};

// manual-tilt range (orbit-drag / two-finger vertical) — same tuned bounds
// as before (usability fix, 2026-07-09): wide enough to reach the cinematic
// low angle by hand, but the auto curve below never drifts there on its own.
var PITCH_OFF_MIN = -0.62, PITCH_OFF_MAX = 0.35;
var CINEMATIC_TILT_OFFSET = -0.62;
var cinematicTilt = false;
function setCinematicTilt(on){
  cinematicTilt = on;
  CAM.pitchOffT = on ? CINEMATIC_TILT_OFFSET : 0;
  // s69: the standalone desktop tilt button is gone — the ☰ menu row is the
  // one tilt control on every viewport.
  var row = document.getElementById("hm-tilt");
  if(row) row.classList.toggle("active", on);
}

/* MAPS-LIKE PITCH (usability fix, 2026-07-09, preserved verbatim): camera
   elevation stays "mostly top-down with a slight tilt" at every altitude —
   like Google/Apple Maps — and never auto-pitches toward horizon-parallel
   just because the user zoomed in. 55-70° across the max-altitude..~150m
   band, easing to 45° at min altitude. Now parameterized directly on CAM.t
   (the same normalized value the old elevationForDistance() derived from
   distance internally) instead of re-deriving it from a radius. */
var ELEV_T_LOW = (Math.log(150)-Math.log(CFG.minAltitude))/(Math.log(CFG.maxAltitude)-Math.log(CFG.minAltitude));
function elevationForT(t){
  if(t>=ELEV_T_LOW) return lerp(55*Math.PI/180, 70*Math.PI/180, (t-ELEV_T_LOW)/(1-ELEV_T_LOW));
  return lerp(45*Math.PI/180, 55*Math.PI/180, t/ELEV_T_LOW);
}

// single-pole exponential smoothing, frame-rate independent — replaces the
// old spring-damper entirely; every input path only ever writes the *T
// (target) fields below, this is the one place values chase them.
function chase(cur, target, dt, rate){ return cur + (target-cur)*(1-Math.exp(-rate*dt)); }

function applyCameraRig(dt){
  CAM.t = chase(CAM.t, CAM.tT, dt, 8);
  CAM.yaw = chase(CAM.yaw, CAM.yawT, dt, 10);
  CAM.pitchOff = chase(CAM.pitchOff, CAM.pitchOffT, dt, 8);
  CAM.focus.x = chase(CAM.focus.x, CAM.focusT.x, dt, 9);
  CAM.focus.y = chase(CAM.focus.y, CAM.focusT.y, dt, 9);
  CAM.focus.z = chase(CAM.focus.z, CAM.focusT.z, dt, 9);

  CAM.radius = radiusFromT(CAM.t);
  var elev = clamp(elevationForT(CAM.t) + CAM.pitchOff, 8*Math.PI/180, 85*Math.PI/180);
  CAM.elev = elev; // cached for panBy's foreshortening term (s41)

  var horizR = CAM.radius*Math.cos(elev);
  var camX = CAM.focus.x + horizR*Math.sin(CAM.yaw);
  var camZ = CAM.focus.z + horizR*Math.cos(CAM.yaw);
  var camY = CAM.focus.y + CAM.radius*Math.sin(elev);

  // camera floor (Annals arch. point H): never dips under the terrain
  // regardless of pitch/zoom combination.
  var groundAtCam = groundHeight(camX,camZ);
  var minY = groundAtCam + 3.5;
  if(camY<minY) camY = minY;

  var groundAtFocus = groundHeight(CAM.focus.x, CAM.focus.z);
  if(CAM.focus.y < groundAtFocus-2) CAM.focus.y = groundAtFocus-2;

  camera.position.set(camX,camY,camZ);
  camera.lookAt(CAM.focus.x, CAM.focus.y, CAM.focus.z);

  // dynamic distance+height fog: closer/thicker near the ground, receding at
  // altitude. s46: curve re-fit for the 15km ceiling — at the full-peninsula
  // framing the old 26km fog-far read as haze soup over the whole west.
  var alt = camY-groundAtCam;
  var altT = clamp01(alt/8000);
  var wetFogT = weatherState.wet*0.4; // rainy days pull the fog in a bit
  scene.fog.near = lerp(60, 4200, altT) * (1-wetFogT*0.35);
  scene.fog.far = lerp(650, 42000, altT) * (1-wetFogT*0.3);
  waterUniforms.uFogNear.value = scene.fog.near;
  waterUniforms.uFogFar.value = scene.fog.far;
  waterUniforms.uFogColor.value.copy(scene.fog.color);

  // scale the near plane with altitude for depth-buffer precision
  var near = Math.max(0.5, alt*0.01);
  if(Math.abs(camera.near-near) > near*0.1){
    camera.near = near;
    camera.updateProjectionMatrix();
  }

  return alt;
}

/* =====================================================================
   INPUT  (Pointer Events only — unified mouse/touch/pen; Safari gesture
   events handled separately since they never reach the wheel handler)
   1 pointer: button 0 orbits (yawT/pitchOffT), any other button pans.
   2 pointers: pinch-zoom (tT) AND centroid-pan (panBy) simultaneously,
   continuously re-baselined each move for 1:1 tracking.
   Pointer up with <5px total movement = tap -> inspect; a second tap
   within 350ms and <36px of the first = fly-to via ground raycast (mouse
   dblclick is the same path — PointerEvents fire for mouse too).
   ===================================================================== */
var TAP_MAX_MS = 500;      // ms — single tap must release within this to count as a tap at all
var DBLTAP_MAX_MS = 350;   // ms — gap between two taps to count as a double-tap/dblclick
var DBLTAP_MAX_DIST = 36;  // px — distance between the two taps
var ptrs = new Map();      // pointerId -> {x,y,type,button}
var tapState = { downX:0, downY:0, downTime:0, moved:0, onCanvas:true };
var lastTap = { time:-9999, x:0, y:0 };
var orbitActive = false, panActive = false;
var pinch = null; // {ids:[idA,idB], d, cx, cy} once a 2nd pointer joins
canvas.addEventListener("contextmenu", function(e){ e.preventDefault(); });

/* s41 MOBILE-PAN FIX — the nav pointer/wheel/gesture handlers now live on
   WINDOW, not the canvas. Root cause of the iPad "one-finger pan is
   unreliable" bug: label chips (today's haloed .wlbl / .street-label /
   .biz-glyph labels), the 78vw-wide scrubber ribbon, and the beat card
   all sit OVER the canvas with pointer-events:auto — any drag that STARTED
   on one of them never reached the canvas listeners at all, so whether a
   pan worked depended on exactly which pixel the finger landed on. Now the
   window sees every pointer and only genuinely interactive chrome (the
   selector below) opts out of map navigation; label chips count as map
   surface (drag pans, tap still opens them via their own click handlers). */
var UI_STEAL_SELECTOR = "#paper-pane,#hud-menu-sheet,#hud-menu-toggle,#beat-card,"+
  "#inspect-panel,#paper-toggle,#speed-pill,"+ /* s54: pill + (inside inspect-panel) release chip are genuine chrome */
  "#hud-ticker,#hud-seed,#hud-title,"+ /* s69: help panel / "?" chip / tilt button removed — everything lives in the ☰ menu */
  "#hud-clock,#hud-altitude,#horizon-ring,#touch-debug,.scr-tab,.scr-track,"+
  "a,button,input,textarea,select";
function isUIEvent(e){
  var t = e.target;
  return !!(t && t.closest && t.closest(UI_STEAL_SELECTOR));
}
/* One real drag must not double as a click on whatever chip the finger
   happened to land on — ptrEnd arms this after any >5px gesture and a
   capture-phase listener swallows the compatibility click that follows. */
var suppressClickUntil = 0;
window.addEventListener("click", function(e){
  if(performance.now() < suppressClickUntil){ e.stopPropagation(); e.preventDefault(); }
}, true);

/* screen dx/dy (pan gesture delta) -> world xz delta, rotated through yaw
   (Annals arch. point C) — REWORKED s41 to the Apple-Maps invariant (the
   ground point under the finger stays under the finger), measured against
   the real camera via CDP touch traces:
   - the flat 0.0016*radius gain overshot 1:1 by ~35% (it bakes in one
     window height and ignores fov); now derived exactly:
     meters-per-pixel at the focus = 2*tan(fov/2)/viewportHeight * radius.
   - screen-VERTICAL drags cross foreshortened ground — 1px maps to
     1/sin(elevation) ground-meters along the view axis (55-70 deg here,
     up to ~3x at the cinematic low tilt). The old uniform scale made
     vertical pans lag horizontal ones.
   - the forward component's SIGN was inverted in the port: finger down
     moved the world up-screen (measured -183px per +200px drag) while
     horizontal correctly followed the finger — the half-mirrored response
     is a big slice of why touch pan felt broken. Both axes now follow. */
function panBy(dx, dy){
  var sc = 2*Math.tan(camera.fov*Math.PI/360)/window.innerHeight * CAM.radius;
  var fsc = sc/Math.max(0.25, Math.sin(CAM.elev || 1));
  var lat = dx*sc, fwd = dy*fsc;
  var sinY = Math.sin(CAM.yaw), cosY = Math.cos(CAM.yaw);
  var worldDX = -cosY*lat - sinY*fwd;
  var worldDZ =  sinY*lat - cosY*fwd;
  var nx = clamp(CAM.focusT.x + worldDX, WORLD.x0, WORLD.xMax);
  var nz = clamp(CAM.focusT.z + worldDZ, WORLD.z0, WORLD.zMax);
  CAM.focusT.x = nx; CAM.focusT.z = nz;
  CAM.focusT.y = groundHeight(nx, nz);
}

/* Ground-anchored pan (s41, the exact Apple-Maps invariant): at gesture
   start we remember the terrain point under the finger (dragAnchor); every
   move then shifts the focus by exactly the world displacement that puts
   that point back under the finger. Because the correction is recomputed
   each event against the CURRENT camera pose from the ABSOLUTE anchor, it
   self-corrects both the chase-smoothing lag and perspective nonlinearity
   (the scalar panBy above is first-order and drifted up to ~50% on long
   screen-vertical drags — meters-per-pixel shrinks toward the bottom of
   the screen). Falls back to the scalar model when a ray misses (sky /
   past the world edge). Serves BOTH the one-finger pan and the two-finger
   centroid pan; anchoring the pinch centroid also makes zoom track the
   fingers' midpoint instead of the screen center. */
var dragAnchor = null; // {x,z} terrain point pinned under the finger/centroid
function anchorPan(cx, cy, pdx, pdy){
  var gCur = dragAnchor ? groundHit(cx, cy) : null;
  if(dragAnchor && gCur){
    var nx = clamp(CAM.focusT.x + (dragAnchor.x - gCur.x), WORLD.x0, WORLD.xMax);
    var nz = clamp(CAM.focusT.z + (dragAnchor.z - gCur.z), WORLD.z0, WORLD.zMax);
    CAM.focusT.x = nx; CAM.focusT.z = nz;
    CAM.focusT.y = groundHeight(nx, nz);
  } else {
    panBy(pdx, pdy); // sky/off-world fallback: first-order screen-space model
  }
}

/* Heightfield ray-march with bisection refine (Annals arch. point G) —
   replaces the old virtual-plane raycast. Marches the actual terrain
   instead of a flat plane through the focus point, so it never misses at
   grazing angles; returns null past the world edge or if the ray never
   comes down to meet the ground (looking at open sky). */
function groundHit(sx, sy){
  var ndcX = (sx/window.innerWidth)*2-1, ndcY = -(sy/window.innerHeight)*2+1;
  var ray = new THREE.Raycaster();
  ray.setFromCamera({x:ndcX,y:ndcY}, camera);
  var ro = ray.ray.origin, rd = ray.ray.direction;
  if(Math.abs(rd.y) < 1e-6) return null;
  var maxDist = 60000, step = 40;
  var prevT = 0;
  for(var t=step; t<=maxDist; t+=step){
    var py = ro.y+rd.y*t, px = ro.x+rd.x*t, pz = ro.z+rd.z*t;
    if(py - terrainHeight(px,pz) <= 0){
      var lo=prevT, hi=t;
      for(var i=0;i<14;i++){
        var mid=(lo+hi)*0.5;
        var mx=ro.x+rd.x*mid, mz=ro.z+rd.z*mid, my=ro.y+rd.y*mid;
        if(my-terrainHeight(mx,mz) > 0) lo=mid; else hi=mid;
      }
      var fx=ro.x+rd.x*hi, fz=ro.z+rd.z*hi;
      if(fx<WORLD.x0 || fx>WORLD.xMax || fz<WORLD.z0 || fz>WORLD.zMax) return null;
      return { x:fx, z:fz };
    }
    prevT = t;
  }
  return null;
}

window.addEventListener("pointerdown", function(e){
  if(isUIEvent(e)) return; // genuine chrome: panels, scrubber track/tab, links…

  /* stale-pointer purge (s41): a drag that starts on a chip has no pointer
     capture, so if its pointerup is ever lost (window blur, iOS system
     gesture) the ptrs entry would linger and the NEXT single finger would
     read ptrs.size===2 — a phantom pinch that zooms instead of panning.
     e.isPrimary on a touch means no other touch is actually down. */
  if(e.pointerType==="touch" && e.isPrimary && ptrs.size){
    ptrs.clear(); pinch = null; orbitActive = false; panActive = false;
  }
  /* capture only when the gesture starts on the canvas itself (keeps mouse
     drags tracking outside the window). Chip-started drags stay uncaptured
     so the chip's own click still fires on a clean tap. try/catch: iOS can
     throw here and an unguarded throw used to abort this whole handler. */
  if(e.target===canvas){ try{ canvas.setPointerCapture(e.pointerId); }catch(err){} }
  ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY, type:e.pointerType, button:e.button });

  if(ptrs.size===2){
    var ids = Array.from(ptrs.keys());
    var p0 = ptrs.get(ids[0]), p1 = ptrs.get(ids[1]);
    pinch = { ids:ids, d:Math.hypot(p1.x-p0.x,p1.y-p0.y), cx:(p0.x+p1.x)/2, cy:(p0.y+p1.y)/2,
              // s54 TWIST ORBIT: inter-finger angle; twist engages only past
              // ~10° accumulated rotation (Apple-Maps threshold) so an
              // ordinary pinch never wobbles the yaw.
              ang:Math.atan2(p1.y-p0.y, p1.x-p0.x), twist:false, twistAcc:0 };
    orbitActive = false; panActive = false;
    dragAnchor = groundHit(pinch.cx, pinch.cy); // pin the terrain under the centroid
    return;
  }
  if(ptrs.size>2) return; // ignore a 3rd+ pointer

  tapState.downX=e.clientX; tapState.downY=e.clientY; tapState.downTime=performance.now(); tapState.moved=0;
  tapState.onCanvas = (e.target===canvas); // chip taps select via their own click handlers
  dragAnchor = groundHit(e.clientX, e.clientY); // pin the terrain under the finger
  // DRAG-CONVENTION SWAP (2026-07-10, user directive overriding the Annals
  // default): primary drag (left mouse button / one-finger touch) now PANS
  // — Apple Maps muscle memory — secondary (right mouse button) orbits.
  // Q/E keyboard rotate remains the orbit alternative. Two-finger
  // pinch+centroid-pan (the `pinch` branch above) is untouched.
  if(e.button===0){ panActive = true; orbitActive = false; }
  else { orbitActive = true; panActive = false; }
});
window.addEventListener("pointermove", function(e){
  if(!ptrs.has(e.pointerId)) return;
  var prev = ptrs.get(e.pointerId);
  var dx = e.clientX-prev.x, dy = e.clientY-prev.y;
  ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY, type:e.pointerType, button:prev.button });

  if(pinch && (e.pointerId===pinch.ids[0] || e.pointerId===pinch.ids[1])){
    var p0 = ptrs.get(pinch.ids[0]), p1 = ptrs.get(pinch.ids[1]);
    if(!p0 || !p1) return;
    var d = Math.hypot(p1.x-p0.x, p1.y-p0.y);
    var cx = (p0.x+p1.x)/2, cy = (p0.y+p1.y)/2;
    CAM.tT = clamp(CAM.tT + (pinch.d-d)*0.0016, 0, 1);
    /* s54 TWIST ORBIT (the standard maps two-finger rotate): the same two
       pointers already do distance=zoom + centroid=pan; the inter-finger
       ANGLE now drives CAM.yaw. Engages past ~10° accumulated twist so
       pinch-zooms don't jitter the heading; once engaged it tracks 1:1
       (derivation: screen angle of a world feature is -(yaw + const) in
       y-up terms, so yawT += dAng(client coords) rotates the ground WITH
       the fingers — verified against __P1850.toScreen bearings). The
       centroid dragAnchor correction in anchorPan() then keeps the ground
       point under the fingers, so the world pivots about the touch point,
       not the screen center. */
    var ang = Math.atan2(p1.y-p0.y, p1.x-p0.x);
    var dAng = ang - pinch.ang;
    if(dAng>Math.PI) dAng -= 2*Math.PI; else if(dAng<-Math.PI) dAng += 2*Math.PI;
    pinch.ang = ang;
    if(!pinch.twist){
      pinch.twistAcc += dAng;
      if(Math.abs(pinch.twistAcc) > 0.175) pinch.twist = true; // ~10°; engage without replaying the threshold (no snap)
    } else {
      CAM.yawT += dAng;
    }
    anchorPan(cx, cy, cx-pinch.cx, cy-pinch.cy);
    pinch.d = d; pinch.cx = cx; pinch.cy = cy; // continuous re-baseline = 1:1 tracking
    return;
  }

  if(orbitActive){
    CAM.yawT -= dx*0.0052;
    CAM.pitchOffT = clamp(CAM.pitchOffT + dy*0.0034, PITCH_OFF_MIN, PITCH_OFF_MAX);
  } else if(panActive){
    anchorPan(e.clientX, e.clientY, dx, dy);
  }
  var moveDist = Math.hypot(e.clientX-tapState.downX, e.clientY-tapState.downY);
  if(moveDist>tapState.moved) tapState.moved = moveDist;
});
function endWhy(r){ if(TDBG) TDBG.why = r; } // ?debugtouch: why the last gesture ended the way it did
function ptrEnd(e){
  if(!ptrs.has(e.pointerId)){ endWhy("foreign"); return; } // not a gesture the nav owns (started on UI chrome)
  ptrs.delete(e.pointerId);

  if(pinch && (e.pointerId===pinch.ids[0] || e.pointerId===pinch.ids[1])){
    pinch = null;
    endWhy("pinch-end");
    var remaining = Array.from(ptrs.keys());
    if(remaining.length===1){
      var p = ptrs.get(remaining[0]);
      tapState.downX=p.x; tapState.downY=p.y; tapState.downTime=performance.now(); tapState.moved=999;
      panActive = (p.button===0); orbitActive = !panActive; // same swapped convention as pointerdown above
      dragAnchor = groundHit(p.x, p.y); // re-pin under the surviving finger
    } else { orbitActive = false; panActive = false; dragAnchor = null; }
    return;
  }
  if(!orbitActive && !panActive){ endWhy("idle"); return; }
  orbitActive = false; panActive = false; dragAnchor = null;

  // a real drag must not ALSO fire as a click on whatever chip it ended over
  if(tapState.moved>5) suppressClickUntil = performance.now()+400;

  /* pointercancel = the browser/OS took the gesture (iOS fires it
     aggressively when its own gestures contend) — never treat it as a tap. */
  if(e.type==="pointercancel"){ endWhy("cancelled"); return; }

  if(!tapState.onCanvas){ endWhy("ui-tap"); return; } // clean tap on a chip: its own click handler selects

  if(tapState.moved>5){ endWhy("drag"); }
  else if((performance.now()-tapState.downTime)>=TAP_MAX_MS){ endWhy("slow-tap"); }
  else endWhy("tap");
  if(tapState.moved<=5 && (performance.now()-tapState.downTime)<TAP_MAX_MS){
    var now = performance.now();
    var isDbl = (now-lastTap.time)<DBLTAP_MAX_MS && Math.hypot(e.clientX-lastTap.x, e.clientY-lastTap.y)<DBLTAP_MAX_DIST;
    if(isDbl){
      lastTap.time = -9999; // consumed; don't chain into a triple-tap
      if(TDBG) TDBG.dbl = (TDBG.dbl||0)+1;
      var hit = groundHit(e.clientX, e.clientY);
      if(hit){
        CAM.focusT.set(hit.x, groundHeight(hit.x,hit.z), hit.z);
        CAM.tT = clamp(CAM.tT - 0.18, 0, 1); // double-tap/dblclick -> fly-to + zoom in a step
        pulseAt(hit.x, hit.z);
      }
    } else {
      lastTap.time = now; lastTap.x = e.clientX; lastTap.y = e.clientY;
      if(TDBG) TDBG.sel = (TDBG.sel||0)+1;
      trySelectAtScreenXY(e.clientX, e.clientY);
    }
  }
}
window.addEventListener("pointerup", ptrEnd);
window.addEventListener("pointercancel", ptrEnd);

/* wheel: magnitude-scaled (not sign-stepped, so trackpads don't slam);
   ctrl+wheel IS trackpad-pinch in Chromium/Firefox (higher gain); zoom-in
   drifts the focus toward the cursor's ground point (Annals arch. point D,
   verbatim). passive:false is required for preventDefault to work — this
   is what stops a Windows-precision-trackpad pinch from page-zooming.
   s41: moved to window (chips/ribbons over the map used to eat it and a
   ctrl+wheel trackpad-pinch over a chip page-zoomed); real chrome (paper
   pane etc.) opts out via isUIEvent so its native scroll still works. */
window.addEventListener("wheel", function(e){
  if(isUIEvent(e)) return;
  e.preventDefault();
  var dy = e.deltaY;
  if(e.deltaMode===1) dy *= 33; else if(e.deltaMode===2) dy *= window.innerHeight;
  var step = clamp(dy*(e.ctrlKey ? 0.0028 : 0.00048), -0.09, 0.09);
  if(step<0){
    var hit = groundHit(e.clientX, e.clientY);
    if(hit) CAM.focusT.lerp(new THREE.Vector3(hit.x, groundHeight(hit.x,hit.z), hit.z), clamp(-step*3.2, 0, 0.2));
  }
  CAM.tT = clamp(CAM.tT + step, 0, 1);
}, { passive:false });

/* Safari-only trackpad-pinch path (Annals arch. point E, verbatim) — THE
   iPad-trackpad fix: Safari never fires wheel events for a trackpad pinch,
   only these proprietary gesture events, and zooms the whole PAGE
   unrecoverably unless all three are preventDefault'd. */
/* s41 changes to the verbatim port, both iPad-touch findings:
   (a) listeners moved canvas->window + isUIEvent filter — Safari targets
       gesture events at the FIRST touch's element, so a pinch whose first
       finger landed on a label chip never reached the canvas listeners and
       page-zoomed (user-scalable=no is ignored by modern iOS);
   (b) gesturechange now yields while a pointer-pinch is active — Safari
       fires gesture events for two-finger TOUCH as well as trackpad pinch,
       so this handler (absolute tT from gesture start) and the pointer
       pinch path (incremental tT) were both writing CAM.tT, fighting each
       other mid-gesture. Trackpad pinches have no pointer pair (pinch stays
       null), so the trackpad fix is untouched. */
var gestT = null;
window.addEventListener("gesturestart", function(e){ if(isUIEvent(e)) return; e.preventDefault(); gestT = CAM.tT; });
window.addEventListener("gesturechange", function(e){
  if(isUIEvent(e)) return;
  e.preventDefault();
  if(gestT===null || pinch) return;
  CAM.tT = clamp(gestT - Math.log2(e.scale || 1)*0.5, 0, 1);
});
window.addEventListener("gestureend", function(e){ if(isUIEvent(e)) return; e.preventDefault(); gestT = null; });

/* =====================================================================
   ?debugtouch — tiny shipping diagnostic overlay (s41 mobile-pan sprint).
   Hidden unless the URL has ?debugtouch. Shows the last 5 pointer/gesture
   events (with the DOM element that received them — the #1 way a drag
   dies is an overlay stealing pointerdown from the canvas), whether the
   canvas got pointer capture, pointercancel count, and live pan state.
   Screenshot this on-device when touch input misbehaves. Also exposes a
   read-only window.__dt handle for automated input verification — only
   when the flag is present.
   ===================================================================== */
var TDBG = /[?&]debugtouch/i.test(location.search) ? (function(){
  var el = document.createElement("div");
  el.id = "touch-debug";
  el.style.cssText = "position:fixed;left:4px;top:64px;z-index:99;background:rgba(0,0,0,0.72);color:#8f8;font:9px/1.4 monospace;padding:4px 6px;pointer-events:none;max-width:60vw;white-space:pre;";
  document.body.appendChild(el);
  var lines = [], cancels = 0, lastCap = "-", mv = null;
  function desc(t){ if(!t||!t.tagName) return "?"; if(t.id) return "#"+t.id; var c=(t.className||"").toString().split(" ")[0]; return t.tagName.toLowerCase()+(c?"."+c:""); }
  function flushMv(){ if(mv){ lines.push("move#"+mv.id+" x"+mv.n+" ->"+mv.x+","+mv.y+" on "+mv.tgt); if(lines.length>5) lines.shift(); mv=null; } }
  function push(s){ flushMv(); lines.push(s); if(lines.length>5) lines.shift(); paint(); }
  function paint(){
    el.textContent = lines.join("\n")
      + (mv ? "\nmove#"+mv.id+" x"+mv.n+" ->"+mv.x+","+mv.y+" on "+mv.tgt : "")
      + "\nptrs:"+ptrs.size+" pan:"+panActive+" orbit:"+orbitActive+" pinch:"+(!!pinch)
      + "\ncap:"+lastCap+" cancels:"+cancels+" moved:"+tapState.moved.toFixed(0)
      + "\nfocus:"+CAM.focusT.x.toFixed(0)+","+CAM.focusT.z.toFixed(0)+" r:"+CAM.radius.toFixed(0);
  }
  ["pointerdown","pointerup","pointercancel"].forEach(function(t){
    window.addEventListener(t, function(e){
      if(t==="pointercancel") cancels++;
      if(t==="pointerdown") lastCap = "?";
      push(t.replace("pointer","")+"#"+e.pointerId+" "+e.pointerType+"/b"+e.button+" "+Math.round(e.clientX)+","+Math.round(e.clientY)+" on "+desc(e.target));
    }, true);
  });
  window.addEventListener("pointermove", function(e){
    if(ptrs.size===0 && e.pointerType==="mouse") return; // ignore idle mouse hover
    if(lastCap==="?"){ try{ lastCap = canvas.hasPointerCapture(e.pointerId) ? "ok" : "NO"; }catch(err){ lastCap = "err"; } }
    if(mv && mv.id!==e.pointerId) flushMv();
    if(!mv) mv = { id:e.pointerId, n:0 };
    mv.n++; mv.x = Math.round(e.clientX); mv.y = Math.round(e.clientY); mv.tgt = desc(e.target);
    paint();
  }, true);
  ["gesturestart","gesturechange","gestureend"].forEach(function(t){
    window.addEventListener(t, function(e){ push(t+" scale="+(e.scale!=null ? Number(e.scale).toFixed(2) : "-")); }, true);
  });
  window.__dt = {
    CAM:CAM, groundHit:groundHit, camera:camera, ptrs:ptrs, terrainHeight:terrainHeight, lastTap:lastTap,
    toScreen:function(x,z){ var v=new THREE.Vector3(x,terrainHeight(x,z),z).project(camera);
      return { x:(v.x*0.5+0.5)*window.innerWidth, y:(-v.y*0.5+0.5)*window.innerHeight }; },
    state:function(){ return { tT:CAM.tT, t:CAM.t, radius:CAM.radius, fx:CAM.focusT.x, fz:CAM.focusT.z,
      pan:panActive, orbit:orbitActive, pinch:!!pinch, cancels:cancels, cap:lastCap, moved:tapState.moved,
      sel:TDBG&&TDBG.sel||0, dbl:TDBG&&TDBG.dbl||0, why:TDBG&&TDBG.why||"-", onCanvas:tapState.onCanvas,
      anchor:dragAnchor ? {x:dragAnchor.x, z:dragAnchor.z} : null }; }
  };
  return { push:push };
})() : null;

window.addEventListener("resize", function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  // re-sync pixel ratio too (audit U5 follow-up): setPixelRatio() was only
  // ever called once at initial load, so dragging the window to a
  // different-DPI monitor (or an emulator/DPR change) left the WebGL
  // drawing buffer sized off a stale ratio even though canvas.style.width/
  // height (and therefore layout) stayed correct — a real, if narrow, gap
  // between "looks right in devtools" and "renders at full resolution."
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---- ☰ menu (s69 CONTROL CENTRALIZATION, user directive): THE one control
   surface on every viewport — the "?" hint chip, the always-on bottom-right
   help panel, and the standalone desktop tilt button are all GONE. The sheet
   holds: mode rows · tilt slider · the Controls & shortcuts reference
   (expanded on the first-ever visit via a localStorage flag, collapsed
   behind its row thereafter) · display-element rows · the Atelier link. ---- */
(function(){
  var menuBtn = document.getElementById("hud-menu-toggle");
  var sheet = document.getElementById("hud-menu-sheet");
  var closeBtn = document.getElementById("hm-close");
  var ctlRow = document.getElementById("hm-controls");
  var ctlBody = document.getElementById("hm-controls-body");
  var CTL_SEEN_KEY = "p1850-controls-seen";
  var ctlSeen = false;
  try{ ctlSeen = !!localStorage.getItem(CTL_SEEN_KEY); }catch(err){} // private-mode Safari can throw
  function setCtlOpen(open){
    ctlBody.classList.toggle("open", open);
    ctlRow.classList.toggle("open", open);
  }
  setCtlOpen(!ctlSeen); // first-ever visit: the reference greets you expanded
  ctlRow.addEventListener("click", function(){ setCtlOpen(!ctlBody.classList.contains("open")); });
  menuBtn.addEventListener("click", function(e){
    e.stopPropagation();
    var open = sheet.classList.toggle("open");
    // s54 single-top-layer policy (see showInspect): on phone chrome the
    // inspect bottom-sheet would draw over the opening menu — close it.
    if(open && phoneChromeActive()) closeInspect();
    if(open && !ctlSeen){ // the expanded first-visit reference has now been seen
      ctlSeen = true;
      try{ localStorage.setItem(CTL_SEEN_KEY, "1"); }catch(err){}
    }
    if(open) syncDisplayRows();
  });
  closeBtn.addEventListener("click", function(e){ e.stopPropagation(); sheet.classList.remove("open"); });
  /* DISPLAY rows — meaningful on every viewport now: on phone they show a
     default-hidden panel via .menu-forced (the narrow-viewport CSS), on
     desktop they hide a default-shown one via .menu-hidden. State is re-read
     from computed style whenever the sheet opens, so the show/hide caption
     always reports the truth for the current viewport. */
  function elVisible(el){
    var cs = window.getComputedStyle(el);
    return cs.display!=="none" && cs.visibility!=="hidden";
  }
  var displayRows = [];
  document.querySelectorAll(".hm-row[data-target]").forEach(function(row){
    var target = document.getElementById(row.dataset.target);
    displayRows.push({ row:row, target:target });
    row.addEventListener("click", function(){
      if(elVisible(target)){ target.classList.remove("menu-forced"); target.classList.add("menu-hidden"); }
      else { target.classList.remove("menu-hidden"); target.classList.add("menu-forced"); }
      row.classList.toggle("active", elVisible(target));
    });
  });
  function syncDisplayRows(){
    displayRows.forEach(function(d){ d.row.classList.toggle("active", elVisible(d.target)); });
  }
  document.getElementById("hm-tilt").addEventListener("click", function(){
    setCinematicTilt(!cinematicTilt);
  });
  /* the Atelier link (dev workbench, layers-spec slot 15): a side-by-side
     artifact — commit the live sim moment into the hash first, then carry
     the WHOLE #hash (seed + date) across so the workbench opens on this
     exact moment. */
  document.getElementById("hm-atelier").addEventListener("click", function(){
    updateHashDate();
    location.href = "atelier.html" + location.hash;
  });
})();

/* ---- s54 MODES in the menu: the touch path for the V / N / G / P / T keys,
   each row driving the exact same setter the key drives, with live on/off
   state while the sheet is open. The camera-tilt slider is the chosen small
   pitch control (a two-finger vertical-drag pitch would contend with the
   existing two-finger centroid-pan, so the slider is the cleaner path). ---- */
(function(){
  var sheet = document.getElementById("hud-menu-sheet");
  var rowWatch = document.getElementById("hm-watch");
  var rowPaper = document.getElementById("hm-paper");
  var rowGhost = document.getElementById("hm-ghost");
  var rowProv  = document.getElementById("hm-provenance");
  var rowTilt  = document.getElementById("hm-tilt");
  var tiltRange = document.getElementById("tilt-range");
  var tiltDragging = false;
  rowWatch.addEventListener("click", function(){
    setWatchMode(!WATCH.on);
    if(WATCH.on) sheet.classList.remove("open"); // cede the screen to the director
    syncMenuModes();
  });
  rowPaper.addEventListener("click", function(){ setPaperOpen(!paperOpen); syncMenuModes(); });
  rowGhost.addEventListener("click", function(){ setGhost(!ghostVisible); syncMenuModes(); });
  rowProv.addEventListener("click", function(){ setProvenanceOnly(!provenanceOnly); syncMenuModes(); });
  document.getElementById("hm-skip").addEventListener("click", function(){ skipToSunriseSunset(); });
  // sync immediately whenever the sheet is opened, too (the rAF tick below
  // covers keyboard-driven changes while it sits open, but background/CDP
  // tabs throttle rAF — never rely on it for the tap-response path)
  document.getElementById("hud-menu-toggle").addEventListener("click", syncMenuModes);
  tiltRange.addEventListener("pointerdown", function(){ tiltDragging = true; });
  window.addEventListener("pointerup", function(){ tiltDragging = false; });
  tiltRange.addEventListener("input", function(){
    cinematicTilt = false; // manual slider position ≠ the cinematic preset (s69: standalone button gone; the row's active state clears via syncMenuModes)
    CAM.pitchOffT = clamp(parseFloat(tiltRange.value), PITCH_OFF_MIN, PITCH_OFF_MAX);
    syncMenuModes();
  });
  function syncMenuModes(){
    rowWatch.classList.toggle("active", WATCH.on);
    rowPaper.classList.toggle("active", paperOpen);
    rowGhost.classList.toggle("active", ghostVisible);
    rowProv.classList.toggle("active", provenanceOnly);
    rowTilt.classList.toggle("active", cinematicTilt);
    if(!tiltDragging) tiltRange.value = CAM.pitchOffT;
  }
  (function tick(){ // cheap: 5 no-op class toggles, and only while the sheet is open
    if(sheet.classList.contains("open")) syncMenuModes();
    requestAnimationFrame(tick);
  })();
})();

/* ---- s54 idle chrome fade: the new touch controls dim to 60% after 4s of
   no input and restore to full on any interaction. ---- */
(function(){
  var t = null;
  function pokeChrome(){
    document.body.classList.remove("chrome-idle");
    clearTimeout(t);
    t = setTimeout(function(){ document.body.classList.add("chrome-idle"); }, 4000);
  }
  ["pointerdown","pointermove","wheel","keydown","touchstart"].forEach(function(ev){
    window.addEventListener(ev, pokeChrome, {passive:true});
  });
  pokeChrome();
})();

/* =====================================================================
   B: WASD FLY + Q/E ROTATE + R/F ALTITUDE — drives the same CAM.focusT/
   yawT/tT targets as every other input path, so nothing fights. Gated off
   INPUT/TEXTAREA targets per the nav-rebuild keyboard rule (defensive —
   this app has no text fields today, but keeps the contract honest).
   ===================================================================== */
var keys = {};
function isTypingTarget(t){ return t && (t.tagName==="INPUT" || t.tagName==="TEXTAREA"); }
window.addEventListener("keydown", function(e){ if(isTypingTarget(e.target)) return; keys[e.key.toLowerCase()] = true; });
window.addEventListener("keyup", function(e){ keys[e.key.toLowerCase()] = false; });
window.addEventListener("blur", function(){ keys = {}; });
var lastKnownAlt = 200;
function applyKeyboardNav(dt){
  var az = CAM.yaw;
  var fwd = new THREE.Vector3(-Math.sin(az),0,-Math.cos(az)); // where the camera is looking
  var right = new THREE.Vector3(Math.cos(az),0,-Math.sin(az));
  var moveF=0, moveR=0;
  if(keys["w"]||keys["arrowup"]) moveF += 1;
  if(keys["s"]||keys["arrowdown"]) moveF -= 1;
  if(keys["d"]||keys["arrowright"]) moveR += 1;
  if(keys["a"]||keys["arrowleft"]) moveR -= 1;
  if(moveF||moveR){
    var invLen = 1/Math.max(1, Math.hypot(moveF,moveR));
    var speed = Math.max(lastKnownAlt,20)*1.6; // brisk fly speed, altitude-scaled
    if(keys["shift"]) speed *= 2.5;            // hold Shift to sprint
    CAM.focusT.addScaledVector(fwd, moveF*invLen*speed*dt).addScaledVector(right, moveR*invLen*speed*dt);
  }
  // Q/E rotate azimuth left/right; R/F move altitude down/up
  var rotRate = 0;
  if(keys["e"]) rotRate += 1;
  if(keys["q"]) rotRate -= 1;
  if(rotRate) CAM.yawT += rotRate*1.6*dt;

  var altRate = 0;
  if(keys["r"]) altRate += 1;
  if(keys["f"]) altRate -= 1;
  if(altRate) setZoomMeters(clamp(getZoomMeters()*Math.exp(altRate*0.9*dt), CFG.minAltitude, CFG.maxAltitude));
}

