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
    "#wb-panel .wb-ov .wb-lname{ font-size:10px; color:#a9aeb5; letter-spacing:0.3px; }",
    "#wb-panel .wb-ov-legend{ font-size:9px; line-height:1.35; color:#6f757c; margin:0 0 5px 22px; }",
    "#wb-panel .wb-ov-group{ margin:6px 0 4px; border:1px solid #2a2e34; border-radius:4px; padding:4px 6px 5px; background:rgba(255,255,255,0.015); }",
    "#wb-panel .wb-ov-parent-name{ font-weight:bold; color:#cdb98f; font-size:10px; letter-spacing:0.5px; }",
    "#wb-panel .wb-ov-grouphdr{ font-size:9px; line-height:1.35; color:#7c828a; margin:1px 0 4px 22px; font-style:italic; }",
    "#wb-panel .wb-ov-groupbody{ border-left:2px solid #2f343b; margin-left:6px; padding-left:6px; }",
    "#wb-panel .wb-ov-child .wb-lname{ color:#b8bdc4; }",
    "#wb-panel .wb-ov-flat{ margin-top:4px; }",
    "#wb-panel .wb-ov-status{ font-size:9px; line-height:1.35; color:#8fa77b; margin:-2px 0 6px 22px; }",
    "#wb-panel .wb-select{ flex:1; background:#1d2126; color:#c9cdd2; border:1px solid #3d4249; border-radius:3px;",
    "  font:10px Consolas,monospace; padding:2px 4px; }",
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
    overlays: { spine:false, row:false, lots:false, parcels:false, keepout:false, zones:false, audits:false },
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
    // GROUND PLAN era-scrub (s80a): rebuild every date-gated overlay when the
    // timeline day moves, so scrubbing shows the survey spine / plat / parcels
    // being born at their checkpoints (cheap 2D/line redraw, once per integer
    // day). SINGLE-FRAME (2026-07-14): overlays no longer ease with a grid-swing
    // frame — there is one frame; only the date-gated birth/extent changes.
    if(Math.floor(simDay)!==_overlayDay){
      _overlayDay = Math.floor(simDay);
      ["spine","row","lots","parcels","keepout"].forEach(function(key){
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

  /* ---- 2b. TERRAIN VIEW (Director addendum #3) — diagnostic material MODES
     that override the terrain mesh material ONLY: geometry untouched, water
     untouched, fully reversible (NORMAL restores), nothing persists. The
     terrain layer currently fuses geometry + skin in one mesh; these modes let
     the landform be read apart from its paint (the dune field is in the
     heightfield but illegible under textured noon light — CLAY is the answer).
     Materials are dev-only closures (atelier), built lazily on first use. ---- */
  el("div","wb-sec","TERRAIN VIEW  (material override · geometry untouched)");
  /* diagnostic tints are per-VERTEX colours on a light geometry that SHARES
     the terrain's position/index buffers (no heavy clone) + an unlit
     MeshBasicMaterial — robust across renderers (a raw ShaderMaterial rendered
     wrong on this r128/WebGL2 build). Colours computed once from height +
     normal.y (terrain is unrotated, so object up = world up). */
  var wbClayMat=null, wbWireMat=null, wbDiagMat=null, wbWireMesh=null;
  var wbDiagGeo=null, wbSlopeColors=null, wbElevColors=null;
  function wbHypso(e){                                   // elevation → hypsometric rgb, quantized to 10 m bands
    var t = Math.max(0, Math.min(1, (Math.floor(e/10)*10)/120)), u;
    if(t<0.5){ u=t*2;      return [0.30+0.45*u, 0.55+0.13*u, 0.32+0.10*u]; }
    u=(t-0.5)*2;           return [0.75+0.11*u, 0.68+0.13*u, 0.42+0.33*u];
  }
  function wbSlopeCol(ny){                               // normal.y → green(flat)…red(45%+ grade)
    ny=Math.max(0,Math.min(1,ny)); var t=Math.max(0,Math.min(1, Math.tan(Math.acos(ny))/0.45)), u;
    if(t<0.5){ u=t*2;      return [0.20+0.70*u, 0.72+0.10*u, 0.28-0.12*u]; }
    u=(t-0.5)*2;           return [0.90-0.05*u, 0.82-0.66*u, 0.16-0.04*u];
  }
  function wbEnsureTerrainMats(){
    if(wbClayMat) return;
    wbClayMat = new THREE.MeshPhongMaterial({ color:0x9d9184, flatShading:true, specular:0x000000, shininess:0 }); // neutral warm grey clay
    wbWireMat = new THREE.MeshBasicMaterial({ color:0x20242a, wireframe:true, transparent:true, opacity:0.22, depthWrite:false });
    wbDiagMat = new THREE.MeshBasicMaterial({ vertexColors:true });
    var pos=terrainGeo.attributes.position, nrm=terrainGeo.attributes.normal, n=pos.count;
    wbSlopeColors=new Float32Array(n*3); wbElevColors=new Float32Array(n*3);
    for(var i=0;i<n;i++){
      var ec=wbHypso(pos.getY(i)); wbElevColors[i*3]=ec[0]; wbElevColors[i*3+1]=ec[1]; wbElevColors[i*3+2]=ec[2];
      var sc=wbSlopeCol(nrm?nrm.getY(i):1); wbSlopeColors[i*3]=sc[0]; wbSlopeColors[i*3+1]=sc[1]; wbSlopeColors[i*3+2]=sc[2];
    }
    wbDiagGeo=new THREE.BufferGeometry();
    wbDiagGeo.setAttribute("position", pos);            // SHARE — no copy
    if(terrainGeo.index) wbDiagGeo.setIndex(terrainGeo.index);
    wbDiagGeo.setAttribute("color", new THREE.BufferAttribute(wbElevColors,3));
    wbDiagGeo.computeBoundingSphere();
  }
  function wbDiag(colors){ wbDiagGeo.setAttribute("color", new THREE.BufferAttribute(colors,3)); terrainMesh.geometry=wbDiagGeo; terrainMesh.material=wbDiagMat; }
  function setTerrainMode(mode){
    wbEnsureTerrainMats();
    if(wbWireMesh){ scene.remove(wbWireMesh); wbWireMesh=null; } // shared geo — remove only, never dispose
    if(mode==="clay"){ terrainMesh.geometry=terrainGeo; terrainMesh.material = wbClayMat; }
    else if(mode==="slope"){ wbDiag(wbSlopeColors); }
    else if(mode==="elev"){ wbDiag(wbElevColors); }
    else if(mode==="wire"){ terrainMesh.geometry=terrainGeo; terrainMesh.material = wbClayMat;
      wbWireMesh = new THREE.Mesh(terrainGeo, wbWireMat); wbWireMesh.renderOrder = 2; wbWireMesh.frustumCulled = false; scene.add(wbWireMesh); }
    else { terrainMesh.geometry=terrainGeo; terrainMesh.material = terrainMat; } // NORMAL — restore the original skin + geometry
  }
  var tvRow = el("div","wb-row");
  el("span","wb-klabel","mode",tvRow);
  var tvSel = document.createElement("select"); tvSel.className = "wb-select";
  [["normal","NORMAL (skin)"],["clay","CLAY (matte landform)"],["slope","SLOPE (green→red, 0–45%+)"],
   ["elev","ELEVATION BANDS (~10 m)"],["wire","WIREFRAME over clay"]].forEach(function(o){
    var op=document.createElement("option"); op.value=o[0]; op.textContent=o[1]; tvSel.appendChild(op);
  });
  tvRow.appendChild(tvSel);
  tvSel.addEventListener("change", function(){ setTerrainMode(tvSel.value); });
  el("div","wb-ov-legend","SLOPE: green flat → red 45%+ grade · ELEVATION: hypsometric ramp 0–120 m, contour every 10 m · water surface unchanged in every mode.");
  el("div","wb-ov-status","geometry/skin structural split scheduled for the terrain fidelity admission.").style.color="#7c828a";

  /* ---- 3. RULE OVERLAYS — a HIERARCHY (Director addendum): THE GROUND PLAN
     survey-spine family (spine centerlines · rights-of-way · plat lots · named
     parcels) under one tri-state master, then the flat law/diagnostic rows
     (walk keep-out · ecology zones · audit failures). Copy is Director-authored
     verbatim; each row is a name + a small legend line. ---- */
  el("div","wb-sec","RULE OVERLAYS");
  var overlayObjs = { spine:null, row:null, lots:null, parcels:null, keepout:null, zones:null, audits:null };
  var auditStatusEl = null, keepoutStatusEl = null;

  /* one toggle path: every overlay rebuilds fresh on enable (all are cheap
     line/2D redraws, several are date-gated) and detaches on disable. */
  function setOverlay(key, on){
    WB.overlays[key] = on;
    if(on){
      if(overlayObjs[key]){ scene.remove(overlayObjs[key]); }
      overlayObjs[key] = buildOverlay(key);
      if(overlayObjs[key]) scene.add(overlayObjs[key]);
    } else if(overlayObjs[key]){
      scene.remove(overlayObjs[key]); overlayObjs[key] = null;
    }
  }
  function overlayRow(parent, key, cls, title, legend){
    var row = el("div","wb-row wb-ov"+(cls?" "+cls:""), null, parent);
    var cb = document.createElement("input"); cb.type="checkbox"; row.appendChild(cb);
    var name = el("span","wb-lname",title,row);
    var leg = el("div","wb-ov-legend",legend,parent); // legend under the row
    return { row:row, cb:cb, name:name, legend:leg };
  }

  /* --- PARENT GROUP: the survey spine (tri-state master) --- */
  var groupWrap = el("div","wb-ov-group");
  var groupHeadRow = el("div","wb-row wb-ov-parent", null, groupWrap);
  var groupCb = document.createElement("input"); groupCb.type="checkbox"; groupHeadRow.appendChild(groupCb);
  el("span","wb-lname wb-ov-parent-name","THE GROUND PLAN — the survey spine",groupHeadRow);
  el("div","wb-ov-grouphdr","Roads, lots, and zones are one dated system — toggle the family or break out a member.",groupWrap);
  var groupBody = el("div","wb-ov-groupbody",null,groupWrap);

  var SPINE_CHILDREN = ["spine","row","lots","parcels"];
  var childCbs = {};
  var groupEverUsed = false;
  var groupLast = { spine:false, row:false, lots:false, parcels:false };
  function syncGroupCheckbox(){
    var on = 0; SPINE_CHILDREN.forEach(function(k){ if(WB.overlays[k]) on++; });
    groupCb.checked = on > 0;
    groupCb.indeterminate = on > 0 && on < SPINE_CHILDREN.length;
  }
  function makeChild(key, title, legend){
    var r = overlayRow(groupBody, key, "wb-ov-child", title, legend);
    childCbs[key] = r.cb;
    r.cb.addEventListener("change", function(){
      setOverlay(key, r.cb.checked);
      if(r.cb.checked) groupEverUsed = true;
      syncGroupCheckbox();
    });
    return r;
  }
  makeChild("spine",  "MASTER SPINE — centerlines",
    "The canonical centerlines (the survey data itself, era-gated). Inviolate: every road system derives from these lines. gold = Market-class · white = main · grey = cross/lane · dashed = platted-unbuilt");
  makeChild("row",    "STREET RIGHTS-OF-WAY",
    "Legal street corridors: each street's constant surveyed width centered on its master centerline. Paint and placement law both derive from these. cyan = the one canonical −9.0° frame (single-frame amendment 2026-07-14).");
  makeChild("lots",   "PLAT LOTS",
    "The dated cadastre: blocks and 50-vara lots born at their survey checkpoints; scrub the timeline to watch the plat appear. white = lot lines · gold fill = record lot (number + owner via probe; ground labels arrive with the labels layer) · gold tick = corner lots marked at their corner point · cyan = water lot (1847 beach-and-water auction) · magenta = non-standard block. The plaza block is a public reserve — no lots.");
  makeChild("parcels","NAMED PARCELS",
    "Named ground parcels carrying allowed-asset-class law (plaza · cove · mud/beach bands · camp · mission · presidio). One zone truth: placement reads these. s87: all parcels are polygons — land/water parcels clipped to the 1849 shore (happy-valley-camp hugs the coast), the two shoreline bands drawn as real triangulated tints (raster exception gone).");

  groupCb.addEventListener("change", function(){
    var want = groupCb.checked;
    groupCb.indeterminate = false;
    if(want){
      var anyRemembered = SPINE_CHILDREN.some(function(k){ return groupLast[k]; });
      SPINE_CHILDREN.forEach(function(k){
        var on = (groupEverUsed && anyRemembered) ? groupLast[k] : true; // first use / nothing remembered = all four
        childCbs[k].checked = on; setOverlay(k, on);
      });
      groupEverUsed = true;
    } else {
      SPINE_CHILDREN.forEach(function(k){ groupLast[k] = WB.overlays[k]; childCbs[k].checked = false; setOverlay(k, false); }); // snapshot then hide all
    }
    syncGroupCheckbox();
  });

  /* --- FLAT ROWS: law + diagnostics (not the spine family) --- */
  var flatWrap = el("div","wb-ov-flat");
  function makeFlat(key, title, legend){
    var r = overlayRow(flatWrap, key, null, title, legend);
    r.cb.addEventListener("change", function(){ setOverlay(key, r.cb.checked); });
    return r;
  }
  var keepoutRow = makeFlat("keepout", "WALK KEEP-OUT",
    "Where walking is forbidden at the current date (red). Sources: water, placed footprints, registered keep-outs. Status line shows the live blocked-cell count — expect near-empty until blocking layers are admitted.");
  keepoutStatusEl = el("div","wb-ov-status","(toggle to sample the walk mask at this date)",flatWrap);
  makeFlat("zones", "ECOLOGY ZONES",
    "The zoneAt classification tinted over the domain: which ground class governs placement and vegetation at each point. Hydrology reconciliation pending — creek network incomplete.");
  makeFlat("audits", "AUDIT FAILURES",
    "Runs the full audit suite at the current date; a red marker at every violation coordinate. An empty overlay is the goal state.");

  function buildOverlay(key){
    if(key==="spine") return buildSpineOverlay();
    if(key==="row") return buildRowOverlay();
    if(key==="keepout") return buildKeepoutOverlay();
    if(key==="zones") return buildZonesOverlay();
    if(key==="audits") return buildAuditOverlay();
    if(key==="lots") return buildLotOverlay();
    if(key==="parcels") return buildParcelOverlay();
    return null;
  }

  /* ---- SHARED OVERLAY DRAPING (s81 — the user's #1 finding: overlays must
     follow terrain like the road canvas, not float on a flat screen-plane).
     Two drape paths, both mirroring ground-paint's model:
       • LINES (spine / ROW / lot edges): each run is tessellated into short
         sub-segments and each vertex sampled onto terrainHeight+lift, so the
         line hugs relief on slopes instead of chording over valleys/humps.
       • TINTS (parcels / keep-out / zones): the tint canvas is draped on a
         SUBDIVIDED plane whose every vertex is displaced to terrainHeight
         (was: one flat quad floating at y=60 — the source of the shear the
         user saw, where the cove tint appeared to slide over the plaza).
     FRAME LAW (s81 Director ruling; SINGLE-FRAME 2026-07-14): the workbench does
     ZERO frame math of its own — lot world geometry comes from the cadastre's
     lotWorldQuad(lot, day), and every street renders at the one canonical
     GRID_ROT_BASE frame (the grid-swing is deleted). No local skew derivation
     exists in this file. ---- */
  var _overlayDay = null;
  function wbStreetAngle(s){ return GRID_ROT_BASE; } // single frame — every street at the one canonical frame
  function wbPushDrapedRun(pos,col,pts,c,lift,dash,segLen){ // tessellate + drape a world polyline
    for(var s=0;s<pts.length-1;s++){
      var a=pts[s], b=pts[s+1], L=Math.hypot(b.x-a.x,b.z-a.z), n=Math.max(1,Math.round(L/segLen));
      for(var k=0;k<n;k++){
        if(dash && (k%2===1)) continue; // skip alternate sub-segments = dashed line
        var t0=k/n, t1=(k+1)/n;
        var x0=a.x+(b.x-a.x)*t0, z0=a.z+(b.z-a.z)*t0, x1=a.x+(b.x-a.x)*t1, z1=a.z+(b.z-a.z)*t1;
        pos.push(x0, terrainHeight(x0,z0)+lift, z0,  x1, terrainHeight(x1,z1)+lift, z1);
        col.push(c.r,c.g,c.b, c.r,c.g,c.b);
      }
    }
  }
  function wbLineSegs(pos,col,opacity,order){
    var g=new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col,3));
    var m=new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:opacity, depthTest:false }));
    m.renderOrder = order||999; m.frustumCulled=false;
    return m;
  }

  /* MASTER SPINE (Director addendum) — the canonical STREETS_RUNTIME centerlines
     themselves, era-gated to the active checkpoint extent, draped, colored by
     class (gold=Market · white=main · grey=cross/lane) and DASHED where the
     road is only platted-unbuilt (roadPieceState st<=1). The spine is core DATA
     with no render layer of its own; this makes the dataset directly inspectable
     under the derived paint. Rendered in each street's own painted frame. */
  var SPINE_GOLD=new THREE.Color(0xf2c14e), SPINE_WHITE=new THREE.Color(0xf3f5f7), SPINE_GREY=new THREE.Color(0x99a2aa);
  function buildSpineOverlay(){
    _overlayDay = Math.floor(simDay);
    updateStreetPaint();                               // core repaints the splat if the date crossed a threshold
    var solidPos=[], solidCol=[], dashPos=[], dashCol=[];
    STREETS_RUNTIME.forEach(function(s){
      var active=null;
      for(var ci=0; ci<s.checkpoints.length; ci++){ if(s.checkpoints[ci].day<=simDay) active=s.checkpoints[ci]; }
      if(!active) return;                             // not surveyed/mentioned yet at this date
      var angle = wbStreetAngle(s);                   // the exact frame the paint uses
      var wpts=[]; for(var pi=active.extent[0]; pi<=active.extent[1]; pi++) wpts.push(gridToWorldAt(s.polyline[pi].u, s.polyline[pi].v, angle));
      if(wpts.length<2) return;
      var c = (s.cls==="market") ? SPINE_GOLD : (s.cls.indexOf("main")===0 ? SPINE_WHITE : SPINE_GREY);
      var viogetFloor = (s.surveyedDay!=null && s.surveyedDay<=0);
      for(var k=0;k<wpts.length-1;k++){
        var a=wpts[k], b=wpts[k+1], mx=(a.x+b.x)/2, mz=(a.z+b.z)/2;
        var st = (typeof roadPieceState==="function") ? roadPieceState(s, mx, mz, simDay, viogetFloor).st : 2;
        var dash = st<=1;                             // platted-unbuilt / ghost line = dashed
        wbPushDrapedRun(dash?dashPos:solidPos, dash?dashCol:solidCol, [a,b], c, 0.8, dash, 9);
      }
    });
    var grp = new THREE.Group();
    grp.add(wbLineSegs(solidPos, solidCol, 0.96, 1000));
    grp.add(wbLineSegs(dashPos,  dashCol,  0.6,  1000));
    grp.frustumCulled=false;
    return grp;
  }

  /* ---- GROUND PLAN overlays (s80a, draped in s81) — lot boundaries + parcel
     tints, era-gated to simDay so scrubbing shows the plat being born at each
     survey checkpoint. Lot world geometry comes ENTIRELY from the cadastre's
     day-frame API (lotWorldQuad) — the frame fix lives in core/08, this
     overlay merely draws what the API returns. ---- */
  var CAD_COL_WATER=new THREE.Color(0x3fd0e0), CAD_COL_CORNER=new THREE.Color(0xe8c24e),
      CAD_COL_STD=new THREE.Color(0xcbd6dd), CAD_COL_NONSTD=new THREE.Color(0xe07ac0);
  function buildLotOverlay(){
    _overlayDay = Math.floor(simDay);
    var blocks = blocksAt(simDay), pos=[], col=[], goldPos=[], goldCol=[], fillPos=[], fillCol=[];
    /* s82 legibility: lot LINES are one color (white); corner lots are marked
       with a small gold tick (diamond) at their block-corner vertex instead of
       full gold outlines (4 of 6 lots in a standard block are corners — whole-
       perimeter gold read as noise). water lots stay cyan; non-standard blocks
       stay magenta.
       s87 (Director item 1 — RECORD-LOT VISIBILITY): a lot carrying registry
       data (source:"record", i.e. a digitized plat/Wheeler lot number ± an owner
       chain) reads AT A GLANCE, before any click — a soft GOLD FILL + a stronger
       gold boundary, vs the plain white pattern lots. (Ground-text numbers/owners
       arrive with the unified label layer next; this is the indicator only.) */
    var GOLD_FILL={ r:0.91, g:0.78, b:0.36 };
    function isRecordLot(l){ return l.source==="record" || (l.owners && l.owners.length); }
    function cornerTick(p){ var r=2.4, cc=CAD_COL_CORNER;
      wbPushDrapedRun(pos,col,[{x:p.x-r,z:p.z},{x:p.x,z:p.z-r},{x:p.x+r,z:p.z},{x:p.x,z:p.z+r},{x:p.x-r,z:p.z}],cc,0.6,false,3);
    }
    blocks.forEach(function(b){
      b.lots.forEach(function(l){
        var q = lotWorldQuad(l, simDay).quad;          // day-frame world geometry from the cadastre
        if(isRecordLot(l)){
          var before=fillPos.length;                   // soft gold fill (two draped tris)
          wbPushDrapedTri(fillPos, q[0],q[1],q[2], 0.30, 1);
          wbPushDrapedTri(fillPos, q[0],q[2],q[3], 0.30, 1);
          for(var f=0,added=(fillPos.length-before)/3; f<added; f++) fillCol.push(GOLD_FILL.r,GOLD_FILL.g,GOLD_FILL.b);
          wbPushDrapedRun(goldPos,goldCol,[q[0],q[1],q[2],q[3],q[0]],CAD_COL_CORNER,0.64,false,9); // stronger boundary
        } else {
          var c = l.water ? CAD_COL_WATER : (!b.standard ? CAD_COL_NONSTD : CAD_COL_STD);
          wbPushDrapedRun(pos,col,[q[0],q[1],q[2],q[3],q[0]],c,0.5,false,9); // closed loop, draped
        }
        if(l.corner){                                  // tick at the vertex that IS the block corner
          if(l.iU===0      && l.iV===0)      cornerTick(q[0]); // (u.lo,v.lo) = SW quad vertex
          if(l.iU===b.nU-1 && l.iV===0)      cornerTick(q[1]);
          if(l.iU===b.nU-1 && l.iV===b.nV-1) cornerTick(q[2]);
          if(l.iU===0      && l.iV===b.nV-1) cornerTick(q[3]);
        }
      });
    });
    var grp=new THREE.Group(); grp.frustumCulled=false;
    if(fillPos.length){
      var fg=new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.Float32BufferAttribute(fillPos,3));
      fg.setAttribute("color", new THREE.Float32BufferAttribute(fillCol,3));
      var fm=new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:0.30, depthTest:false, depthWrite:false, side:THREE.DoubleSide }));
      fm.renderOrder=996; fm.frustumCulled=false; grp.add(fm);
    }
    if(pos.length)     grp.add(wbLineSegs(pos,col,0.92,999));
    if(goldPos.length) grp.add(wbLineSegs(goldPos,goldCol,0.98,1000)); // record-lot boundary on top
    return grp;
  }
  /* plaza is a distinct WARM GOLD so it can never read as the cove's blue
     (s81 finding C — the reported "cove includes the plaza" was the flat-plane
     shear PLUS two near-identical blues; geometry is correct, see the audit). */
  var CAD_PARCEL_COLS = { plaza:[242,206,88], water:[70,150,200], mud:[130,90,70], beach:[210,190,120],
    camp:[220,140,70], mission:[180,120,200], presidio:[110,170,90], survey:[90,110,130] };
  /* NAMED PARCELS — EXACT POLYGON TINT (Director addendum 2026-07-14). The old
     path rasterized parcel MEMBERSHIP onto a coarse draped tint grid, so the
     plaza gold read as a stair-stepped blob and the cove edge as pixel stairs —
     the DISPLAY lied even though the parcel GEOMETRY is exact (s82's 0.0000 m).
     Now each parcel is drawn as a triangulated polygon mesh of its ACTUAL ring:
     uv rings materialized through the cadastre day-frame API (gridToWorldAt at
     cadSkewAt — one canonical frame post-single-frame), world rings as-is. Each
     triangle is midpoint-subdivided and draped onto terrainHeight like the line
     overlays, so the fill hugs relief; a crisp boundary stroke marks the exact
     edges. The platted-region envelope (cls "survey") is boundary-only (its fill
     blankets the town). s87: the RASTER BAND EXCEPTION IS GONE — storeship-mud-
     band + beach-band now carry real shoreline-followed polygon rings (core/08
     cadBandRibbons), and clipped parcels carry world rings, so EVERY parcel
     draws through the one triangulated-polygon path (no samplePlaneOverlay). */
  function wbEarClip(ring){ // ring:[{x,z}] simple polygon → array of [i,j,k] index triples
    var n=ring.length; if(n<3) return [];
    var V=[]; for(var i=0;i<n;i++) V.push(i);
    var a2=0; for(var i2=0;i2<n;i2++){ var p=ring[i2], q=ring[(i2+1)%n]; a2+=p.x*q.z-q.x*p.z; }
    if(a2<0) V.reverse();                                   // force CCW so ear test is consistent
    function cross(o,a,b){ return (a.x-o.x)*(b.z-o.z)-(a.z-o.z)*(b.x-o.x); }
    function inTri(pt,a,b,c){
      var d1=cross(a,b,pt), d2=cross(b,c,pt), d3=cross(c,a,pt);
      return !(((d1<0)||(d2<0)||(d3<0)) && ((d1>0)||(d2>0)||(d3>0)));
    }
    var tris=[], guard=0;
    while(V.length>2 && guard++ < n*n+4){
      var m=V.length, clipped=false;
      for(var vi=0; vi<m; vi++){
        var i0=V[(vi+m-1)%m], i1=V[vi], i2b=V[(vi+1)%m];
        var A=ring[i0], Bp=ring[i1], C=ring[i2b];
        if(cross(A,Bp,C)<=0) continue;                     // reflex/collinear vertex — not an ear
        var ear=true;
        for(var k=0;k<m;k++){ var ki=V[k]; if(ki===i0||ki===i1||ki===i2b) continue;
          if(inTri(ring[ki],A,Bp,C)){ ear=false; break; } }
        if(ear){ tris.push([i0,i1,i2b]); V.splice(vi,1); clipped=true; break; }
      }
      if(!clipped) break;                                  // degenerate ring — bail with what we have
    }
    return tris;
  }
  function wbPushDrapedTri(pos, a, b, c, lift, depth){     // recursive midpoint subdivide + drape
    if(depth<=0){
      pos.push(a.x, terrainHeight(a.x,a.z)+lift, a.z,
               b.x, terrainHeight(b.x,b.z)+lift, b.z,
               c.x, terrainHeight(c.x,c.z)+lift, c.z);
      return;
    }
    var ab={x:(a.x+b.x)/2,z:(a.z+b.z)/2}, bc={x:(b.x+c.x)/2,z:(b.z+c.z)/2}, ca={x:(c.x+a.x)/2,z:(c.z+a.z)/2};
    wbPushDrapedTri(pos,a,ab,ca,lift,depth-1); wbPushDrapedTri(pos,ab,b,bc,lift,depth-1);
    wbPushDrapedTri(pos,ca,bc,c,lift,depth-1); wbPushDrapedTri(pos,ab,bc,ca,lift,depth-1);
  }
  function wbParcelWorldRing(p){                            // parcel ring → world XZ (uv → day frame)
    if(!p.poly) return null;
    if(p.space==="uv") return p.poly.map(function(pt){ var w=gridToWorldAt(pt.u, pt.v, cadSkewAt(simDay)); return {x:w.x,z:w.z}; });
    return p.poly.map(function(pt){ return {x:pt.x, z:pt.z}; });
  }
  function buildParcelOverlay(){
    _overlayDay = Math.floor(simDay);
    var parcels = window.__P1850.groundPlan.parcels;
    var grp = new THREE.Group(); grp.frustumCulled=false;
    var fillPos=[], fillCol=[], strokePos=[], strokeCol=[];
    /* s87: EVERY parcel is a polygon now — the raster band exception is gone.
       Clipped parcels + the two shoreline bands carry world `rings`
       (multi-piece); uv parcels (plaza/platted-region) materialize their ring
       through the day-frame API. All drawn identically: triangulated draped
       tint + a crisp exact-edge boundary stroke. */
    parcels.forEach(function(p){
      if(p.birth>simDay) return;
      var rings = p.rings ? p.rings : (p.poly ? [wbParcelWorldRing(p)] : null);
      if(!rings) return;
      var rgb = CAD_PARCEL_COLS[p.cls]||[200,60,200], c={ r:rgb[0]/255, g:rgb[1]/255, b:rgb[2]/255 };
      rings.forEach(function(ring){
        if(!ring || ring.length<3) return;
        wbPushDrapedRun(strokePos, strokeCol, ring.concat([ring[0]]), c, 0.55, false, 9); // exact-edge boundary
        if(p.cls==="survey") return;                        // platted-region: boundary only (fill blankets the town)
        wbEarClip(ring).forEach(function(t){
          var A=ring[t[0]], Bp=ring[t[1]], C=ring[t[2]];
          var span=Math.max(Math.hypot(Bp.x-A.x,Bp.z-A.z), Math.hypot(C.x-Bp.x,C.z-Bp.z), Math.hypot(A.x-C.x,A.z-C.z));
          var depth=Math.max(1, Math.min(5, Math.round(Math.log2(Math.max(span,1)/40)))); // drape resolution ~40 m cells
          var before=fillPos.length;
          wbPushDrapedTri(fillPos, A, Bp, C, 0.35, depth);
          for(var q=0, added=(fillPos.length-before)/3; q<added; q++) fillCol.push(c.r,c.g,c.b);
        });
      });
    });
    if(fillPos.length){
      var fg=new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.Float32BufferAttribute(fillPos,3));
      fg.setAttribute("color", new THREE.Float32BufferAttribute(fillCol,3));
      var fm=new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:0.34, depthTest:false, depthWrite:false, side:THREE.DoubleSide }));
      fm.renderOrder=997; fm.frustumCulled=false; grp.add(fm);
    }
    if(strokePos.length) grp.add(wbLineSegs(strokePos, strokeCol, 0.95, 999));
    return grp;
  }

  /* STREET RIGHTS-OF-WAY (s81 Director ruling; SINGLE-FRAME 2026-07-14). Each
     street renders its corridor at the one canonical −9.0° frame (cyan) — the
     grid-swing and its Vioget-frame magenta variant are deleted, and with them
     the separate FRAME COMPARISON toggle (there is no second frame to compare).
     Full placement extent (the law reserves the right-of-way from day one). */
  function buildRowOverlay(){
    updateStreetPaint();
    var pos=[], col=[], cB=new THREE.Color(0x35e0e8);
    STREETS_RUNTIME.forEach(function(s){
      var halfW = s.widthM/2;
      var i1 = s.checkpoints.length ? s.checkpoints[s.checkpoints.length-1].extent[1] : s.polyline.length-1;
      for(var i=0;i<i1;i++){
        var a = gridToWorldAt(s.polyline[i].u,   s.polyline[i].v,   GRID_ROT_BASE);
        var b = gridToWorldAt(s.polyline[i+1].u, s.polyline[i+1].v, GRID_ROT_BASE);
        var dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)||1;
        var nx=-dz/len*halfW, nz=dx/len*halfW;
        wbPushDrapedRun(pos,col,[{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz}],cB,0.4,false,8);
        wbPushDrapedRun(pos,col,[{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz}],cB,0.4,false,8);
      }
    });
    return wbLineSegs(pos,col,0.9,999);
  }

  /* draped tint plane: NxN tint canvas over `box`, mapped onto a SUBDIVIDED
     grid whose vertices are displaced to terrainHeight (was a flat y=60 quad). */
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
    var W = box.xMax-box.xMin, H = box.zMax-box.zMin;
    var seg = Math.max(24, Math.min(190, Math.round(Math.max(W,H)/14)));       // ~14 m cells, capped
    var segX = Math.max(8, Math.round(seg*W/Math.max(W,H))), segZ = Math.max(8, Math.round(seg*H/Math.max(W,H)));
    var g = new THREE.PlaneGeometry(W, H, segX, segZ); g.rotateX(-Math.PI/2);
    var p = g.attributes.position, cx=(box.xMin+box.xMax)/2, cz=(box.zMin+box.zMax)/2;
    for(var vi=0; vi<p.count; vi++){ p.setY(vi, terrainHeight(p.getX(vi)+cx, p.getZ(vi)+cz)+0.3); }
    p.needsUpdate = true;
    var mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthTest:false, depthWrite:false }));
    mesh.position.set(cx, 0, cz);
    mesh.renderOrder = 998; mesh.frustumCulled = false;
    return mesh;
  }

  function buildKeepoutOverlay(){
    var B = (typeof TOWN_BOX==="object" && TOWN_BOX) ? TOWN_BOX : VILLAGE_BOX;
    var pad = 120, N = 200, blocked = 0, total = 0;
    var box = { xMin:B.xMin-pad, xMax:B.xMax+pad, zMin:B.zMin-pad, zMax:B.zMax+pad };
    var mesh = samplePlaneOverlay(box, N, function(x,z){
      total++;
      if(walkBlockedAt(x,z,simDay)){ blocked++; return [255,44,44,150]; }
      return null;
    });
    // HONEST EMPTY-STATE (s81 finding B): walkBlockedAt only blocks placed
    // footprints/keep-outs (water/steep-slope live in the A* pathfinder, not
    // this point query), and every footprint source is an empty stub on the
    // foundation — so the mask is legitimately empty. Say so rather than render
    // nothing silently.
    if(keepoutStatusEl){
      var iso = (window.__P1850 && window.__P1850.date) || "";
      keepoutStatusEl.textContent = blocked===0
        ? ("0 blocked cells at "+iso+" — no blocking layers admitted yet (buildings / fences / tents pending)")
        : (blocked+" of "+total+" sampled cells blocked at "+iso);
      keepoutStatusEl.style.color = blocked===0 ? "#8fa77b" : "#e0a06a";
    }
    return mesh;
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
      if(!best || d<best.d) best = { d:d, id:s.id, halfW:s.halfW };
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
    probeLine(probeOut, "ground-paint", (st ? "nearest street “"+st.id+"” "+st.d.toFixed(1)+"m away (ROW half-width "+st.halfW+"m)"
      + (inROW ? " — INSIDE right-of-way" : "") + (roadState ? " · lifecycle "+roadState : "") : "no street nearby")
      + " · splat alpha town="+(townA==null?"n/a":townA)+" close="+(closeA==null?"n/a":closeA)
      + " · surface: " + (inROW ? "road" : (painted ? "painted path/plaza/trodden" : "open ground")));
    // GROUND PLAN (s80a) — the cadastre card: lot id, block, dims, deviation-
    // from-standard, birth date, water flag, and the parcels containing the point.
    try{
      var gp = groundPlanAt(x, z, simDay);
      if(gp.platLot){
        var lot = lotById(gp.platLot), bDate = simDateISO(dateFromSimDay(lot.birth));
        var distName = (lot.district==="hundred-vara") ? "100-vara (SoMa)" : "50-vara";
        var devRef = (lot.district==="hundred-vara") ? "100vara" : "50vara";
        probeLine(probeOut, "ground-plan", "lot <b>"+gp.platLot+"</b>"
          + " · "+distName+" district"
          + " · "+lot.widthM.toFixed(2)+"×"+lot.depthM.toFixed(2)+"m"
          + " · dev-from-"+devRef+" "+(lot.dev*100).toFixed(2)+"%"
          + (lot.corner?" · CORNER":"") + (lot.water?" · WATER LOT":"")
          + " · born "+(lot.birth<-1000?"pre-sim":bDate));
        // s85: record-lot provenance — the digitized survey identity where a
        // plat-lots-known.json entry claims this lot (else pattern-fill fabric).
        if(lot.source==="record"){
          probeLine(probeOut, "record", "<b>Lot "+(lot.lotNumber||"?")+"</b> — "+(lot.recordSource||"eddy-1849")+" plat"
            + (lot.recordCitation ? " · "+String(lot.recordCitation).slice(0,90) : ""));
          // s86: chronological owner witness chain (Wheeler-1852 grant + Buckelew
          // 1847 map) — the data surface for the future who-is-where registry.
          if(lot.owners && lot.owners.length){
            probeLine(probeOut, "owners", lot.owners.map(function(o){
              var src = o.source.indexOf("wheeler")>=0 ? "Wheeler grant" : (o.source.indexOf("buckelew")>=0 ? "Buckelew map" : o.source);
              return "<b>"+o.dateOrInterval+"</b>: "+o.name+" ("+src+")";
            }).join(" · "));
          }
        } else {
          probeLine(probeOut, "record", "pattern-fill (no digitized record for this lot yet)");
        }
        probeLine(probeOut, "block", gp.block);
      } else if(gp.block){
        var pBlk = cadBlockAt(x, z, simDay);
        probeLine(probeOut, "ground-plan", (pBlk && pBlk.publicReserve)
          ? ("PUBLIC RESERVE — block "+gp.block+" (the plaza common, never subdivided; zero plat lots)")
          : ("block "+gp.block+" (point off its lot fabric)"));
      } else {
        probeLine(probeOut, "ground-plan", "unplatted ground (no block at this date)");
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
  el("div","wb-foot", "Overlays inspect the LAW and DATA; the Layers list above shows admitted RENDERERS — the spine has no renderer of its own by design (ground-paint derives from it).");
  el("div","wb-foot", WB_LAYERS.length+" layers registered · atelier.html only (never in the release build) · nothing persists");

  /* DEV CAPTURE (s81) — the atelier is dev-only, so a framebuffer grab lives
     here (not the release): render synchronously and read the whole drawing
     buffer BEFORE the browser composites/clears it (same trick the provenance
     probe's readLuminance uses), then encode a PNG via a 2D canvas. Returns a
     data URL. Used to produce screening evidence when the host's screenshot
     path chokes on this heavy WebGL scene. */
  /* NUMERIC ALIGNMENT PROOF (s81 Director intervention: geometry claims are
     measured, never eyeballed). window.__wbMeasure runs two measurements at
     the CURRENT date and returns median/p95/max tables:
       paintVsSpine — perpendicular offset (m) between the painted band's
         CENTER (alpha>=128 scan across the road) and the active-frame
         centerline, at mid-run stations clear of junctions. Tolerance is set
         by the paint canvas resolution (metersPerPixel reported).
       lotVsRow — offset (m) between each block's lot-fabric edge (from
         lotWorldQuad, the cadastre day-frame API) and the bounding street's
         ROW boundary (centerline dist − halfW) at 3 stations per edge.
         Expected ≈0: both derive from the same survey numbers.
     Also counts mid-block lane paint bands crossing the lot fabric (lanes are
     EXCLUDED from the plat lattice by spec — an EXPLAINED crossing, not a
     defect). Dev-only, atelier-only. */
  /* Correct-pixel alpha readback for the measurement: a continuous canvas
     coordinate c lies inside pixel floor(c) — ground-paint's own audit helper
     _gpAlphaAtWorld uses Math.round, a systematic −0.5 px (−2.08 m at this
     canvas) shift in every probe. That readback defect is REPORTED (ground-
     paint is signed-off; fixing it goes through its own gate) — the harness
     measures with floor so it measures the PAINT, not the reader. */
  function wbAlphaAt(x, z){
    var p = gpPx(x, z), px = Math.floor(p.x), py = Math.floor(p.y);
    if(px < 0 || py < 0 || px >= GP_W || py >= GP_H) return 0;
    return _gpImage().data[(py * GP_W + px) * 4 + 3];
  }
  window.__wbMeasure = function(){
    updateStreetPaint();
    function stats(arr){
      if(!arr.length) return { n:0 };
      var a = arr.slice().sort(function(x,y){ return x-y; });
      function q(p){ return a[Math.min(a.length-1, Math.round(p*(a.length-1)))]; }
      return { n:a.length, median:+q(0.5).toFixed(2), p95:+q(0.95).toFixed(2), max:+a[a.length-1].toFixed(2) };
    }
    var mpp = 1/GP_PXPM;
    // (a) paint-band center vs active-frame centerline. Stations every ~40 m
    // of arc length; band center = ALPHA-WEIGHTED centroid of the perpendicular
    // scan (sub-pixel estimate across the antialiased stroke edges).
    var offs = [], streetsProbed = 0;
    STREETS_RUNTIME.forEach(function(s){
      var rec = SPLAT_LAST_STATS && SPLAT_LAST_STATS.streets[s.id];
      if(!rec || !rec.worldPoly || rec.state < 2) return;
      var wp = rec.worldPoly, got = 0;
      for(var i=0; i<wp.length-1; i++){
        var a = wp[i], b = wp[i+1], L = Math.hypot(b.x-a.x, b.z-a.z); if(L < 6) continue;
        var nx=-(b.z-a.z)/L, nz=(b.x-a.x)/L;
        for(var d=20; d<L-10 && got<12; d+=40){
          var mx=a.x+(b.x-a.x)*d/L, mz=a.z+(b.z-a.z)*d/L;
          if(terrainHeight(mx,mz) <= 0.5) continue;                      // wet — never painted
          if(_gpNearOtherStreet(mx, mz, s.id, s.widthM/2 + 6)) continue; // junction / parallel bleed
          if(wbAlphaAt(mx,mz) < 128) continue;                           // not established paint here
          var wSum=0, wOff=0;
          for(var off=-(s.widthM/2+6); off<=s.widthM/2+6; off+=0.25){
            var al=wbAlphaAt(mx+nx*off, mz+nz*off);
            wSum += al; wOff += al*off;
          }
          if(wSum<=0) continue;
          offs.push(Math.abs(wOff/wSum)); got++;
        }
      }
      if(got) streetsProbed++;
    });
    // (b) lot-fabric edge vs ROW boundary (both from the same survey numbers)
    var edgeOffs = [], blocksChecked = 0;
    blocksAt(simDay).forEach(function(b){
      blocksChecked++;
      var edges = [
        { id:b.edges.west,  pts:[[b.uLo, b.vLo+(b.vHi-b.vLo)*0.25],[b.uLo,(b.vLo+b.vHi)/2],[b.uLo, b.vLo+(b.vHi-b.vLo)*0.75]] },
        { id:b.edges.east,  pts:[[b.uHi, b.vLo+(b.vHi-b.vLo)*0.25],[b.uHi,(b.vLo+b.vHi)/2],[b.uHi, b.vLo+(b.vHi-b.vLo)*0.75]] },
        { id:b.edges.north, pts:[[b.uLo+(b.uHi-b.uLo)*0.25, b.vLo],[(b.uLo+b.uHi)/2, b.vLo],[b.uLo+(b.uHi-b.uLo)*0.75, b.vLo]] },
        { id:b.edges.south, pts:[[b.uLo+(b.uHi-b.uLo)*0.25, b.vHi],[(b.uLo+b.uHi)/2, b.vHi],[b.uLo+(b.uHi-b.uLo)*0.75, b.vHi]] }
      ];
      edges.forEach(function(e){
        var st = STREETS_RUNTIME_BY_ID[e.id]; if(!st) return;
        var ang = wbStreetAngle(st), cl = [];
        for(var pi=0; pi<st.polyline.length; pi++) cl.push(gridToWorldAt(st.polyline[pi].u, st.polyline[pi].v, ang));
        e.pts.forEach(function(uv){
          var w = gridToWorldAt(uv[0], uv[1], cadSkewAt(simDay)); // block edge point, cadastre day frame
          var dmin = Infinity;
          for(var i=0;i<cl.length-1;i++) dmin = Math.min(dmin, distToSegXZ(w.x, w.z, cl[i].x, cl[i].z, cl[i+1].x, cl[i+1].z));
          edgeOffs.push(Math.abs(dmin - st.widthM/2));
        });
      });
    });
    // explained crossings: mid-block lanes (excluded from the lattice by spec)
    var laneSegsInBlocks = 0, lanesInvolved = {};
    STREETS_RUNTIME.forEach(function(s){
      if(CAD_GRID_CLASSES[s.cls]) return; // lattice streets bound blocks, skip
      for(var i=0;i<s.polyline.length-1;i++){
        var mu=(s.polyline[i].u+s.polyline[i+1].u)/2, mv=(s.polyline[i].v+s.polyline[i+1].v)/2;
        for(var bi=0; bi<GROUND_PLAN.blocks.length; bi++){ var b=GROUND_PLAN.blocks[bi];
          if(mu>b.uLo && mu<b.uHi && mv>b.vLo && mv<b.vHi){ laneSegsInBlocks++; lanesInvolved[s.id]=1; break; }
        }
      }
    });
    return {
      date: window.__P1850.date,
      activeSkewDeg: +(GRID_ROT_BASE*180/Math.PI).toFixed(3), // single frame — always -9.0°
      singleFrame: true,
      paintCanvasMetersPerPixel: +mpp.toFixed(2),
      paintVsSpine: { measure:"paint-band center vs active-frame centerline (m, perpendicular)",
                      tolerance:"±"+(mpp/2).toFixed(2)+" m (half canvas pixel) + stroke antialias",
                      streets:streetsProbed, stats:stats(offs) },
      lotVsRow:     { measure:"lot-fabric block edge vs ROW boundary (m)",
                      tolerance:"≈0 expected (same survey numbers); street polyline wobble ≤1 m (CAD_EPS)",
                      blocks:blocksChecked, stats:stats(edgeOffs) },
      explainedLaneCrossings: { note:"mid-block lanes excluded from the plat lattice by spec — their paint legitimately crosses lot fabric",
                                lanes:Object.keys(lanesInvolved), segmentsInsideBlocks:laneSegsInBlocks }
    };
  };

  window.__wbShot = function(){
    _wbRender(scene, camera);
    var gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    var buf = new Uint8Array(w*h*4);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
    var cv = document.createElement("canvas"); cv.width=w; cv.height=h;
    var ctx = cv.getContext("2d"), img = ctx.createImageData(w,h);
    for(var y=0;y<h;y++){ var srow=(h-1-y)*w*4, drow=y*w*4; for(var xi=0;xi<w*4;xi++) img.data[drow+xi]=buf[srow+xi]; }
    ctx.putImageData(img,0,0);
    return cv.toDataURL("image/png");
  };

  applyVis();
  console.log("[workbench] THE ATELIER armed — "+WB_LAYERS.length+" layer visibility registrations: "+WB_LAYERS.join(", "));
})();
