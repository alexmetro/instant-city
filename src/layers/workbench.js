/* =====================================================================
   layers/workbench — THE ATELIER: the dev workbench, a FULLY SEPARATE
   artifact (user amendment 2026-07-13). This file is assembled ONLY into
   app/atelier.html (tools/build-app.js ATELIER_FILES); the release
   index.html contains ZERO workbench bytes. Loading atelier.html IS the
   opt-in — no flag, no runtime gate. Total removability: delete this
   file + its ATELIER_FILES entry + app/atelier.html and the tool is gone
   (the one-liner registerLayerVisibility calls left in the render layers
   are inert registry feeds nothing else consumes).
   OWNS (layers-spec.md slot 15): the workbench panel UI + its injected
   CSS, layer visibility control (via the core registerLayerVisibility
   registry), the provenance probe, rule overlays (street rights-of-way,
   walk keep-out mask, ecology zones, live audit-failure markers) and
   live tuning knobs. READS: core interfaces (terrainHeight, zoneAt,
   walkBlockedAt, simDay, WORLD, spine/PLACEMENT segs) + the __P1850
   debug registry + the layer visibility registry. This is a tool, not
   period UI — exempt from newsprint styling (compact dark dev chrome).
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s); the atelier
   assembly splices it INSIDE the module closure, immediately before the
   closing chunk (core/07-main) — its chunk number (75) is bookkeeping.
   ===================================================================== */
/* @P1850-CHUNK 75 — THE ATELIER dev workbench (atelier.html only; never in release) */
(function(){
  "use strict";

  /* ---------------- injected chrome (kept out of shell.html so the release
     stylesheet carries zero workbench bytes) ---------------- */
  var wbStyle = document.createElement("style");
  wbStyle.textContent = [
    "#wb-panel{ position:fixed; left:8px; top:8px; bottom:8px; width:264px; z-index:99999;",
    "  overflow-y:auto; background:rgba(13,14,16,0.93); color:#c9cdd2; border:1px solid #33373d;",
    "  border-radius:6px; padding:10px 10px 14px; font:11px/1.5 Consolas,Menlo,monospace;",
    "  box-shadow:0 4px 18px rgba(0,0,0,0.5); }",
    "#wb-panel .wb-title{ font-weight:bold; letter-spacing:1.5px; color:#e8e3d5; font-size:12px; margin-bottom:2px; }",
    "#wb-panel .wb-sub{ font-weight:normal; letter-spacing:0; color:#7c828a; font-size:10px; }",
    "#wb-panel .wb-sec{ margin:10px 0 4px; padding-top:6px; border-top:1px solid #2a2e34;",
    "  color:#8fa7bd; font-size:10px; letter-spacing:1px; }",
    "#wb-panel .wb-row{ display:flex; align-items:center; gap:6px; padding:1px 0; }",
    "#wb-panel .wb-row input[type=checkbox]{ margin:0; accent-color:#5aa0c8; }",
    "#wb-panel .wb-row.off .wb-lname{ color:#5b6066; text-decoration:line-through; }",
    "#wb-panel .wb-lname{ flex:1; cursor:default; }",
    "#wb-panel .wb-ov .wb-lname{ font-size:10px; color:#a9aeb5; }",
    "#wb-panel .wb-solo{ background:#1d2126; color:#6b7178; border:1px solid #33373d;",
    "  border-radius:3px; font-size:10px; line-height:1; padding:2px 5px; cursor:pointer; }",
    "#wb-panel .wb-solo.on{ color:#ffd75e; border-color:#ffd75e; }",
    "#wb-panel .wb-btn{ background:#1d2126; color:#c9cdd2; border:1px solid #3d4249; border-radius:4px;",
    "  font:11px Consolas,monospace; padding:4px 8px; cursor:pointer; margin:3px 4px 3px 0; }",
    "#wb-panel .wb-btn.on{ color:#7ee2a0; border-color:#7ee2a0; }",
    "#wb-panel .wb-probe-out{ background:#101215; border:1px solid #2a2e34; border-radius:4px;",
    "  padding:6px; margin-top:4px; min-height:30px; max-height:220px; overflow-y:auto;",
    "  font-size:10px; color:#aeb4bb; word-break:break-word; }",
    "#wb-panel .wb-pl{ margin-bottom:3px; }",
    "#wb-panel .wb-pl b{ color:#8fa7bd; }",
    "#wb-panel .wb-knob{ display:flex; align-items:center; gap:5px; padding:1px 0; }",
    "#wb-panel .wb-klabel{ flex:1; font-size:10px; color:#a9aeb5; }",
    "#wb-panel .wb-knob input[type=range]{ width:86px; accent-color:#5aa0c8; }",
    "#wb-panel .wb-kval{ font-style:normal; color:#e8e3d5; width:32px; text-align:right; }",
    "#wb-panel .wb-actions{ margin-top:8px; }",
    "#wb-panel .wb-audit-status{ margin-top:4px; font-size:10px; color:#8a9098; }",
    "#wb-panel .wb-audit-status.ok{ color:#7ee2a0; }",
    "#wb-panel .wb-audit-status.bad{ color:#ff7a6e; }",
    "#wb-panel .wb-foot{ margin-top:10px; color:#5b6066; font-size:9px; border-top:1px solid #2a2e34; padding-top:6px; }",
    "body.wb-probe #c{ cursor:crosshair; }",
    "body.dev-labels-off .wlbl, body.dev-labels-off .street-label, body.dev-labels-off .biz-glyph{ display:none !important; }"
  ].join("\n");
  document.head.appendChild(wbStyle);

  /* ---------------- state ---------------- */
  var WB = {
    muted: {},            // layerName -> true when hidden
    solo: null,           // layerName | null
    probe: false,
    overlays: { row:false, keepout:false, zones:false, audits:false, lots:false, parcels:false },
    knobs: { sunMul:1, hemiMul:1, ambientMul:1, nightLift:0, detailAmp:null, doodadMul:1, streetAlphaMul:1 }
  };
  var WB_ORDER = ["terrain","ground-paint","zones-tint","buildings","doodads","people","ships","fauna","effects","labels"];
  var WB_LAYERS = WB_ORDER.filter(function(n){ return !!__P1850_LAYER_VIS[n]; });
  WB.knobs.detailAmp = window.__P1850 ? +window.__P1850.detailAmp : 1;
  var WB_KNOB_DEFAULTS = JSON.parse(JSON.stringify(WB.knobs));
  var WB_DOODAD_CELL_BASE = (typeof DOODAD_CELL !== "undefined") ? DOODAD_CELL : null; /* FOUNDATION: awaiting admission of doodads — knob inert until then */

  function wbLayerOn(name){ return WB.solo ? name===WB.solo : !WB.muted[name]; }
  function applyVis(){
    WB_LAYERS.forEach(function(n){
      try{ __P1850_LAYER_VIS[n](wbLayerOn(n)); }catch(e){ console.warn("[workbench] setVisible failed for "+n, e); }
    });
    syncRows();
  }

  /* ---------------- per-frame hook: re-assert mutes + apply light knobs.
     Installed by wrapping renderer.render — runs immediately before every
     draw, so per-frame sim writes (updateDayNight intensities, era gating
     re-showing meshes) never win over a mute/knob for a rendered frame. */
  var _wbRender = renderer.render.bind(renderer);
  var WB_LIGHTS = [ {o:sun, key:"sunMul", night:false}, {o:hemi, key:"hemiMul", night:true}, {o:ambient, key:"ambientMul", night:true} ];
  function wbFrame(){
    // mutes: re-assert OFF only (never force-on — the sim owns reveals)
    WB_LAYERS.forEach(function(n){ if(!wbLayerOn(n)){ try{ __P1850_LAYER_VIS[n](false); }catch(e){} } });
    // light knobs: multiplier over whatever the sim wrote this frame,
    // with base-tracking so a static intensity never compounds
    var nf = (typeof nightFactor==="number") ? nightFactor : 0;
    WB_LIGHTS.forEach(function(L){
      var cur = L.o.intensity;
      if(L._set===undefined || Math.abs(cur-L._set)>1e-9) L._base = cur; // sim wrote fresh
      var v = L._base * WB.knobs[L.key] + (L.night ? WB.knobs.nightLift*nf : 0);
      L.o.intensity = v; L._set = v;
    });
    // GROUND PLAN era-scrub (s80a): rebuild the date-gated lot/parcel overlays
    // when the timeline day moves, so scrubbing shows the plat being born at
    // the survey checkpoints (cheap 2D/line redraw, once per integer day).
    if((WB.overlays.lots || WB.overlays.parcels) && Math.floor(simDay)!==_lotOverlayDay){
      ["lots","parcels"].forEach(function(key){
        if(!WB.overlays[key]) return;
        if(overlayObjs[key]){ scene.remove(overlayObjs[key]); }
        overlayObjs[key] = buildOverlay(key);
        if(overlayObjs[key]) scene.add(overlayObjs[key]);
      });
    }
  }
  renderer.render = function(s,c){ wbFrame(); _wbRender(s,c); };

  /* ---------------- panel DOM ---------------- */
  var panel = document.createElement("div");
  panel.id = "wb-panel";
  document.body.appendChild(panel);
  function el(tag, cls, txt, parent){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(txt!=null) e.textContent = txt;
    (parent||panel).appendChild(e);
    return e;
  }
  var title = el("div","wb-title","THE ATELIER");
  el("span","wb-sub"," dev workbench — nothing here persists", title);

  /* ---- 1. LAYER PANEL ---- */
  el("div","wb-sec","LAYERS  (☐ mute · ◉ solo · alt-click row = solo)");
  var rowEls = {};
  WB_LAYERS.forEach(function(name){
    var row = el("div","wb-row");
    var cb = document.createElement("input"); cb.type="checkbox"; cb.checked = true; row.appendChild(cb);
    var lab = el("span","wb-lname",name,row);
    var solo = el("button","wb-solo","◉",row);
    solo.title = "solo "+name;
    cb.addEventListener("change", function(){ WB.muted[name] = !cb.checked; applyVis(); });
    solo.addEventListener("click", function(ev){ ev.stopPropagation(); WB.solo = (WB.solo===name) ? null : name; applyVis(); });
    lab.addEventListener("click", function(ev){ if(ev.altKey){ WB.solo = (WB.solo===name) ? null : name; applyVis(); } });
    rowEls[name] = { row:row, cb:cb, solo:solo };
  });
  function syncRows(){
    WB_LAYERS.forEach(function(n){
      var r = rowEls[n];
      r.cb.checked = !WB.muted[n];
      r.solo.classList.toggle("on", WB.solo===n);
      r.row.classList.toggle("off", !wbLayerOn(n));
    });
  }

  /* ---- 3. RULE OVERLAYS ---- */
  el("div","wb-sec","RULE OVERLAYS");
  var overlayObjs = { row:null, keepout:null, zones:null, audits:null, lots:null, parcels:null };
  var overlayDefs = [
    { key:"row",     label:"street rights-of-way (constant class widths; cyan=base frame, magenta=Vioget)" },
    { key:"keepout", label:"walkBlockedAt keep-out mask (red = blocked, sampled at current date)" },
    { key:"zones",   label:"ecology zones (zoneAt tint over the whole domain)" },
    { key:"audits",  label:"audit failures (runs audits.runAll(), red markers at violation coords)" },
    { key:"lots",    label:"GROUND PLAN — plat lots (era-gated: scrub the timeline to watch the plat be born · cyan=water lot, gold=corner, magenta=non-standard block)" },
    { key:"parcels", label:"GROUND PLAN — named parcel tints (plaza · cove · mud/beach bands · camp · mission · presidio)" }
  ];
  var auditStatusEl = null;
  overlayDefs.forEach(function(def){
    var row = el("div","wb-row wb-ov");
    var cb = document.createElement("input"); cb.type="checkbox"; row.appendChild(cb);
    el("span","wb-lname",def.label,row);
    cb.addEventListener("change", function(){
      WB.overlays[def.key] = cb.checked;
      if(cb.checked){
        if(def.key==="keepout" || def.key==="audits" || def.key==="lots" || def.key==="parcels" || !overlayObjs[def.key]){ // rebuild date-dependent overlays fresh
          if(overlayObjs[def.key]){ scene.remove(overlayObjs[def.key]); }
          overlayObjs[def.key] = buildOverlay(def.key);
        }
        if(overlayObjs[def.key]) scene.add(overlayObjs[def.key]);
      } else if(overlayObjs[def.key]){
        scene.remove(overlayObjs[def.key]);
      }
    });
  });

  function buildOverlay(key){
    if(key==="row") return buildRowOverlay();
    if(key==="keepout") return buildKeepoutOverlay();
    if(key==="zones") return buildZonesOverlay();
    if(key==="audits") return buildAuditOverlay();
    if(key==="lots") return buildLotOverlay();
    if(key==="parcels") return buildParcelOverlay();
    return null;
  }

  /* ---- GROUND PLAN overlays (s80a) — draped lot boundaries + parcel tints,
     era-gated to simDay so scrubbing the timeline shows the plat being born at
     each survey checkpoint (1846 Vioget region only → 1847 O'Farrell fabric +
     cove water lots → 1849 Eddy extension). Rebuilt whenever the date moves
     (see wbFrame's watcher below). Reads the core cadastre only. ---- */
  var CAD_COL_WATER=new THREE.Color(0x3fd0e0), CAD_COL_CORNER=new THREE.Color(0xe8c24e),
      CAD_COL_STD=new THREE.Color(0xcbd6dd), CAD_COL_NONSTD=new THREE.Color(0xe07ac0);
  var _lotOverlayDay = null;
  function buildLotOverlay(){
    _lotOverlayDay = Math.floor(simDay);
    var blocks = blocksAt(simDay), pos=[], col=[], SUB=5;
    function edge(a,b,c){
      for(var k=0;k<SUB;k++){
        var x0=a.x+(b.x-a.x)*k/SUB, z0=a.z+(b.z-a.z)*k/SUB;
        var x1=a.x+(b.x-a.x)*(k+1)/SUB, z1=a.z+(b.z-a.z)*(k+1)/SUB;
        pos.push(x0, terrainHeight(x0,z0)+0.5, z0,  x1, terrainHeight(x1,z1)+0.5, z1);
        col.push(c.r,c.g,c.b, c.r,c.g,c.b);
      }
    }
    blocks.forEach(function(b){
      b.lots.forEach(function(l){
        var c = l.water ? CAD_COL_WATER : (!b.standard ? CAD_COL_NONSTD : (l.corner ? CAD_COL_CORNER : CAD_COL_STD));
        var q=l.quad; // [SW,SE,NE,NW] world corners
        edge(q[0],q[1],c); edge(q[1],q[2],c); edge(q[2],q[3],c); edge(q[3],q[0],c);
      });
    });
    var g=new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col,3));
    var m=new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.92, depthTest:false }));
    m.renderOrder=999; m.frustumCulled=false;
    return m;
  }
  var CAD_PARCEL_COLS = { plaza:[120,200,255], water:[70,150,200], mud:[130,90,70], beach:[210,190,120],
    camp:[220,140,70], mission:[180,120,200], presidio:[110,170,90], survey:[90,110,130] };
  function buildParcelOverlay(){
    _lotOverlayDay = Math.floor(simDay);
    var B = (typeof TOWN_BOX==="object" && TOWN_BOX) ? TOWN_BOX : VILLAGE_BOX, pad=900;
    var box = { xMin:B.xMin-pad, xMax:B.xMax+pad+400, zMin:B.zMin-pad, zMax:B.zMax+pad };
    var parcels = window.__P1850.groundPlan.parcels;
    return samplePlaneOverlay(box, 220, function(x,z){
      for(var i=0;i<parcels.length;i++){ var p=parcels[i];
        if(p.name==="survey") continue; // boundary only — skip its fill (it blankets the town)
        if((p.birth<=simDay) && window.__P1850.groundPlan.parcelByName(p.name) && cadParcelHit(p,x,z)){
          var c=CAD_PARCEL_COLS[p.cls]||[200,60,200]; return [c[0],c[1],c[2],90];
        }
      }
      return null;
    });
  }
  // point-in-parcel (mirrors core cadParcelContains via the exposed helpers)
  function cadParcelHit(p,x,z){ return groundPlanParcelContains(p.name, x, z); }

  function buildRowOverlay(){
    var pos=[], col=[], cB=new THREE.Color(0x35e0e8), cV=new THREE.Color(0xe855d0);
    PLACEMENT_STREET_SEGS.forEach(function(s){
      var dx=s.x1-s.x0, dz=s.z1-s.z0, len=Math.hypot(dx,dz)||1;
      var nx=-dz/len*s.halfW, nz=dx/len*s.halfW;
      var c = s.frame==="vioget" ? cV : cB;
      [[s.x0+nx,s.z0+nz,s.x1+nx,s.z1+nz],[s.x0-nx,s.z0-nz,s.x1-nx,s.z1-nz]].forEach(function(L){
        pos.push(L[0], terrainHeight(L[0],L[1])+0.4, L[1],  L[2], terrainHeight(L[2],L[3])+0.4, L[3]);
        col.push(c.r,c.g,c.b, c.r,c.g,c.b);
      });
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col,3));
    var m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.9, depthTest:false }));
    m.renderOrder = 999; m.frustumCulled = false;
    return m;
  }

  function samplePlaneOverlay(box, N, sampleFn){
    var cv = document.createElement("canvas"); cv.width = cv.height = N;
    var ctx = cv.getContext("2d"), img = ctx.createImageData(N,N);
    for(var j=0;j<N;j++) for(var i=0;i<N;i++){
      var x = box.xMin + (i+0.5)/N*(box.xMax-box.xMin);
      var z = box.zMin + (j+0.5)/N*(box.zMax-box.zMin);
      var rgba = sampleFn(x,z);
      if(rgba){ var o=(j*N+i)*4; img.data[o]=rgba[0]; img.data[o+1]=rgba[1]; img.data[o+2]=rgba[2]; img.data[o+3]=rgba[3]; }
    }
    ctx.putImageData(img,0,0);
    var tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter;
    var g = new THREE.PlaneGeometry(box.xMax-box.xMin, box.zMax-box.zMin); g.rotateX(-Math.PI/2);
    var mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthTest:false, depthWrite:false }));
    mesh.position.set((box.xMin+box.xMax)/2, 60, (box.zMin+box.zMax)/2);
    mesh.renderOrder = 998; mesh.frustumCulled = false;
    return mesh;
  }

  function buildKeepoutOverlay(){
    var B = (typeof TOWN_BOX==="object" && TOWN_BOX) ? TOWN_BOX : VILLAGE_BOX;
    var pad = 120;
    var box = { xMin:B.xMin-pad, xMax:B.xMax+pad, zMin:B.zMin-pad, zMax:B.zMax+pad };
    return samplePlaneOverlay(box, 200, function(x,z){
      return walkBlockedAt(x,z,simDay) ? [255,44,44,150] : null;
    });
  }

  var WB_ZONE_NAMES = { 0:"none / town core", 1:"dune", 2:"scrub / chaparral", 3:"grassland", 4:"oak woodland", 5:"marsh / reeds", 6:"mudflat" };
  var WB_ZONE_COLS = { 1:[228,205,130], 2:[150,140,70], 3:[110,170,80], 4:[60,120,60], 5:[80,170,160], 6:[150,120,95] };
  function buildZonesOverlay(){
    var box = { xMin:WORLD.x0, xMax:WORLD.xMax, zMin:WORLD.z0, zMax:WORLD.zMax };
    return samplePlaneOverlay(box, 256, function(x,z){
      var zn = zoneAt(x,z);
      var c = WB_ZONE_COLS[zn];
      return c ? [c[0],c[1],c[2],95] : (zn>0 ? [200,60,200,95] : null);
    });
  }

  function collectXZ(v, out, depth){
    if(!v || out.length>=400 || (depth||0)>4) return;
    if(Array.isArray(v)){ for(var i=0;i<v.length && out.length<400;i++) collectXZ(v[i], out, (depth||0)+1); return; }
    if(typeof v==="object"){
      if(typeof v.x==="number" && typeof v.z==="number" && isFinite(v.x) && isFinite(v.z)){ out.push({x:v.x,z:v.z}); return; }
      for(var k in v){ if(v.hasOwnProperty(k)) collectXZ(v[k], out, (depth||0)+1); }
    }
  }
  var lastAuditSummary = null;
  function buildAuditOverlay(){
    var res = window.__P1850.audits.runAll();
    lastAuditSummary = res;
    var pts = [];
    res.results.forEach(function(r){ if(!r.pass) collectXZ(r.detail, pts); });
    setAuditStatus(res, pts.length);
    var g = new THREE.ConeGeometry(4, 16, 6); g.translate(0,8,0);
    var mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color:0xff2020, depthTest:false, transparent:true, opacity:0.9 }), Math.max(pts.length,1));
    var m4 = new THREE.Matrix4();
    if(!pts.length){ m4.makeScale(0,0,0); mesh.setMatrixAt(0,m4); mesh.count=1; }
    else pts.forEach(function(p,i){ m4.makeTranslation(p.x, terrainHeight(p.x,p.z)+2, p.z); mesh.setMatrixAt(i,m4); });
    mesh.count = Math.max(pts.length,1);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.renderOrder = 1000; mesh.frustumCulled = false;
    return mesh;
  }
  function setAuditStatus(res, markerCount){
    var failed = res.results.filter(function(r){ return !r.pass; });
    auditStatusEl.textContent = "audits @ "+res.date+": "+res.ran+" ran, "+res.failed+" failed ("+res.ms+"ms)"
      + (failed.length ? " — "+failed.map(function(r){ return r.layer+"."+r.audit; }).join(", ")+" · "+markerCount+" markers" : " — ALL GREEN");
    auditStatusEl.className = "wb-audit-status " + (res.pass ? "ok" : "bad");
  }

  /* ---- 2. PROVENANCE PROBE ---- */
  el("div","wb-sec","PROVENANCE PROBE");
  var probeBtn = el("button","wb-btn","probe: OFF — click to arm");
  var probeOut = el("div","wb-probe-out","(arm, then click any world point)");
  probeBtn.addEventListener("click", function(){
    WB.probe = !WB.probe;
    probeBtn.textContent = WB.probe ? "probe: ON — click the world" : "probe: OFF — click to arm";
    probeBtn.classList.toggle("on", WB.probe);
    document.body.classList.toggle("wb-probe", WB.probe);
  });

  function groundPointFromScreen(px,py){
    var ndc = new THREE.Vector2(px/window.innerWidth*2-1, -(py/window.innerHeight)*2+1);
    var rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, camera);
    var o = rc.ray.origin, d = rc.ray.direction;
    var t = 0, step = 4, hit = null, prev = 0;
    for(t=step; t<26000; t+=step){
      var x = o.x+d.x*t, y = o.y+d.y*t, z = o.z+d.z*t;
      var h = terrainHeight(x,z);
      if(y <= h){ hit = t; break; }
      prev = t;
      step = Math.min(60, Math.max(4, (y-h)*0.5)); // adaptive march
    }
    if(hit==null) return null;
    var lo = prev, hi = hit; // bisect refine
    for(var i=0;i<24;i++){
      var mid = (lo+hi)/2;
      var mx=o.x+d.x*mid, my=o.y+d.y*mid, mz=o.z+d.z*mid;
      if(my <= terrainHeight(mx,mz)) hi = mid; else lo = mid;
    }
    return { x:o.x+d.x*hi, z:o.z+d.z*hi };
  }
  function readLuminance(px,py){
    try{
      _wbRender(scene,camera);
      var gl = renderer.getContext(), dpr = renderer.getPixelRatio();
      var buf = new Uint8Array(4);
      gl.readPixels(Math.round(px*dpr), Math.round(gl.drawingBufferHeight-py*dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return { lum:+((0.2126*buf[0]+0.7152*buf[1]+0.0722*buf[2])/255).toFixed(3), rgb:[buf[0],buf[1],buf[2]] };
    }catch(e){ return null; }
  }
  function nearestStreet(x,z){
    var best = null;
    for(var i=0;i<PLACEMENT_STREET_SEGS.length;i++){
      var s = PLACEMENT_STREET_SEGS[i];
      var d = distToSegXZ(x,z,s.x0,s.z0,s.x1,s.z1);
      if(!best || d<best.d) best = { d:d, id:s.id, halfW:s.halfW, frame:s.frame };
    }
    return best;
  }
  function buildingAt(x,z){
    var i;
    for(i=0;i<VILLAGE_BUILDING_SPOTS.length;i++){
      var b = VILLAGE_BUILDING_SPOTS[i];
      var c = Math.cos(-(b.rot||0)), sn = Math.sin(-(b.rot||0));
      var dx=x-b.x, dz=z-b.z, lx=dx*c-dz*sn, lz=dx*sn+dz*c;
      if(Math.abs(lx)<=(b.w||4)/2+0.3 && Math.abs(lz)<=(b.d||4)/2+0.3)
        return "village footprint #"+i+(b.name?" “"+b.name+"”":"")+(b.type?" ["+b.type+"]":"")+(b.foundedDay!=null?" foundedDay="+Math.round(b.foundedDay):"");
    }
    for(i=0;i<spawnedBuildings.length;i++){ if(Math.hypot(x-spawnedBuildings[i].x, z-spawnedBuildings[i].z)<3.4) return "growth building #"+i; }
    for(i=0;i<spawnedTents.length;i++){ if(Math.hypot(x-spawnedTents[i].x, z-spawnedTents[i].z)<2.0) return "tent #"+i; }
    return null;
  }
  function doodadAt(x,z){
    var best = null;
    Object.keys(DOODAD_POOLS).forEach(function(k){
      var m = DOODAD_POOLS[k].mesh, arr = m.instanceMatrix.array;
      for(var i=0;i<m.count;i++){
        var d = Math.hypot(x-arr[i*16+12], z-arr[i*16+14]);
        if(d<2.5 && (!best || d<best.d)) best = { pool:k, d:d };
      }
    });
    return best ? "pool “"+best.pool+"” ("+best.d.toFixed(1)+"m)" : null;
  }
  function personNear(x,z){
    try{
      var w = window.__P1850.walkers, best = null;
      for(var i=0;i<w.length;i++){
        var d = Math.hypot(x-w[i].x, z-w[i].z);
        if(d<6 && (!best || d<best.d)) best = { d:d, id:w[i].id, pose:w[i].pose };
      }
      return best ? "#"+best.id+" ("+best.pose+", "+best.d.toFixed(1)+"m away)" : null;
    }catch(e){ return null; }
  }
  function probeLine(out, k, v){ var d = document.createElement("div"); d.className="wb-pl"; d.innerHTML = "<b>"+k+"</b> "+v; out.appendChild(d); }
  function runProbe(px,py){
    var lumInfo = readLuminance(px,py); // read BEFORE the pick re-renders anything
    var p = groundPointFromScreen(px,py);
    probeOut.textContent = "";
    if(!p){ probeLine(probeOut,"probe","no ground under that click (sky)"); return; }
    var x=p.x, z=p.z, h=terrainHeight(x,z), zn=zoneAt(x,z);
    var st = nearestStreet(x,z);
    var townA=null, closeA=null;
    try{ townA = window.__P1850._splatDebug.townAlphaAt(x,z)[3]; }catch(e){}
    try{ closeA = window.__P1850._splatDebug.closeAlphaAt(x,z)[3]; }catch(e){}
    var inROW = st && st.d < st.halfW;
    var painted = (townA||0)>10 || (closeA||0)>10;
    var bld = buildingAt(x,z);
    var dd = doodadAt(x,z);
    var pn = personNear(x,z);
    var blocked = !!walkBlockedAt(x,z,simDay);
    var roadState = null;
    if(st && st.d < st.halfW+6){ try{ var rs = window.__P1850.roadState(st.id); roadState = rs ? rs.state : null; }catch(e){} }

    probeLine(probeOut, "point", x.toFixed(1)+", "+z.toFixed(1)+"  @ "+window.__P1850.date);
    probeLine(probeOut, "terrain", "height "+h.toFixed(2)+"m · ecology zone "+zn+" ("+(WB_ZONE_NAMES[zn]||"?")+")"
      + (lumInfo ? " · pixel luminance "+lumInfo.lum+" (rgb "+lumInfo.rgb.join(",")+")" : ""));
    probeLine(probeOut, "ground-paint", (st ? "nearest street “"+st.id+"” "+st.d.toFixed(1)+"m away (ROW half-width "+st.halfW+"m, frame "+st.frame+")"
      + (inROW ? " — INSIDE right-of-way" : "") + (roadState ? " · lifecycle "+roadState : "") : "no street nearby")
      + " · splat alpha town="+(townA==null?"n/a":townA)+" close="+(closeA==null?"n/a":closeA)
      + " · surface: " + (inROW ? "road" : (painted ? "painted path/plaza/trodden" : "open ground")));
    // GROUND PLAN (s80a) — the cadastre card: lot id, block, dims, deviation-
    // from-standard, birth date, water flag, and the parcels containing the point.
    try{
      var gp = groundPlanAt(x, z, simDay);
      if(gp.platLot){
        var lot = lotById(gp.platLot), bDate = simDateISO(dateFromSimDay(lot.birth));
        probeLine(probeOut, "ground-plan", "lot <b>"+gp.platLot+"</b>"
          + " · "+lot.widthM.toFixed(2)+"×"+lot.depthM.toFixed(2)+"m"
          + " · dev-from-50vara "+(lot.dev*100).toFixed(2)+"%"
          + (lot.corner?" · CORNER":"") + (lot.water?" · WATER LOT":"")
          + " · born "+(lot.birth<-1000?"pre-sim":bDate));
        probeLine(probeOut, "block", gp.block);
      } else {
        probeLine(probeOut, "ground-plan", gp.block ? ("block "+gp.block+" (point off its lot fabric)") : "unplatted ground (no block at this date)");
      }
      probeLine(probeOut, "parcels", gp.parcels.length ? gp.parcels.join(" · ") : "none");
      if(gp.band) probeLine(probeOut, "band", gp.band);
    }catch(e){ probeLine(probeOut, "ground-plan", "(cadastre error: "+e.message+")"); }
    probeLine(probeOut, "buildings", bld || "no footprint here");
    probeLine(probeOut, "doodads", dd || "no doodad within 2.5m");
    probeLine(probeOut, "people", pn || "no figure within 6m");
    probeLine(probeOut, "walk", blocked ? "BLOCKED (walkBlockedAt=true)" : "walkable");
    var draws = ["terrain"];
    if(inROW || painted) draws.push("ground-paint");
    if(bld) draws.push("buildings");
    if(dd) draws.push("doodads");
    if(pn) draws.push("people");
    probeLine(probeOut, "layers drawing here", draws.join(" · "));
    // entity inspect through the REAL pick path
    try{
      window.__P1850.pick(px,py);
      var panelInfo = window.__P1850.inspectPanel();
      probeLine(probeOut, "inspect hit", panelInfo ? panelInfo.kind+" — "+panelInfo.name : "none");
    }catch(e){ probeLine(probeOut, "inspect hit", "(pick failed: "+e.message+")"); }
  }
  canvas.addEventListener("click", function(ev){
    if(!WB.probe) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    runProbe(ev.clientX, ev.clientY);
  }, true);

  /* ---- 4. TUNING KNOBS ---- */
  el("div","wb-sec","TUNING KNOBS  (live · reload resets)");
  var knobDefs = [
    { key:"sunMul",        label:"sun intensity ×",     min:0, max:2.5, step:0.05 },
    { key:"hemiMul",       label:"hemi intensity ×",    min:0, max:2.5, step:0.05 },
    { key:"ambientMul",    label:"ambient intensity ×", min:0, max:2.5, step:0.05 },
    { key:"nightLift",     label:"night-lift (+hemi/amb · nightFactor)", min:0, max:0.5, step:0.01 },
    { key:"detailAmp",     label:"ground detail amp",        min:0, max:2,   step:0.05 },
    { key:"doodadMul",     label:"doodad ring density ×", min:0.25, max:3, step:0.05 },
    { key:"streetAlphaMul",label:"street fill alpha ×", min:0, max:1,   step:0.02 }
  ];
  var knobEls = {};
  function applyKnob(key, v){
    WB.knobs[key] = v;
    if(key==="detailAmp"){ window.__P1850.detailAmp = v; }
    else if(key==="doodadMul"){ if(WB_DOODAD_CELL_BASE!=null){ DOODAD_CELL = WB_DOODAD_CELL_BASE/Math.sqrt(Math.max(v,0.01)); _doodadBuilt = false; } } /* FOUNDATION: inert until doodads admission */
    else if(key==="streetAlphaMul"){ var wbSplats=[typeof splatWorldMesh!=="undefined"?splatWorldMesh:null, typeof splatTownMesh!=="undefined"?splatTownMesh:null, typeof splatCloseMesh!=="undefined"?splatCloseMesh:null]; wbSplats.forEach(function(m){ if(m) m.material.opacity = v; }); } /* FOUNDATION: uniform renderer has one mesh; town/close return with the road-art admission */
    // sun/hemi/ambient/nightLift are applied in wbFrame each frame
    knobEls[key].val.textContent = (+v).toFixed(2);
  }
  knobDefs.forEach(function(d){
    var row = el("div","wb-knob");
    el("span","wb-klabel",d.label,row);
    var input = document.createElement("input");
    input.type="range"; input.min=d.min; input.max=d.max; input.step=d.step; input.value=WB.knobs[d.key];
    row.appendChild(input);
    var val = el("em","wb-kval",(+WB.knobs[d.key]).toFixed(2),row);
    knobEls[d.key] = { input:input, val:val };
    input.addEventListener("input", function(){ applyKnob(d.key, +input.value); });
  });

  /* ---- actions ---- */
  var actions = el("div","wb-actions");
  var auditBtn = el("button","wb-btn","run audits",actions);
  var copyBtn = el("button","wb-btn","COPY SETTINGS",actions);
  auditStatusEl = el("div","wb-audit-status","");
  auditBtn.addEventListener("click", function(){
    var res = window.__P1850.audits.runAll();
    var pts=[]; res.results.forEach(function(r){ if(!r.pass) collectXZ(r.detail, pts); });
    setAuditStatus(res, pts.length);
  });
  copyBtn.addEventListener("click", function(){
    var changed = {};
    Object.keys(WB.knobs).forEach(function(k){ if(Math.abs(WB.knobs[k]-WB_KNOB_DEFAULTS[k])>1e-9) changed[k] = +(+WB.knobs[k]).toFixed(3); });
    var payload = JSON.stringify({ workbench:"tuning", date:window.__P1850.date, seed:seedStr, changed:changed }, null, 2);
    console.log("[workbench] COPY SETTINGS:\n"+payload);
    function done(ok){ copyBtn.textContent = ok ? "copied ✓ (also in console)" : "clipboard blocked — see console"; setTimeout(function(){ copyBtn.textContent="COPY SETTINGS"; }, 2500); }
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(payload).then(function(){ done(true); }, function(){ done(false); });
    else done(false);
  });
  el("div","wb-foot", WB_LAYERS.length+" layers registered · atelier.html only (never in the release build) · nothing persists");

  applyVis();
  console.log("[workbench] THE ATELIER armed — "+WB_LAYERS.length+" layer visibility registrations: "+WB_LAYERS.join(", "));
})();
