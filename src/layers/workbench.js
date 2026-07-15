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

   DEBUG-VIZ-FIRST (s101, the twin of rules-first): every system ships its
   atelier VISUALIZATION as a first-class deliverable, alongside its audits —
   built WITH (or before) the engine that produces the behaviour, PER SYSTEM.
   You cannot land a temporal system you cannot SEE. This file is where those
   visualizations live; the first is the COORDINATE TIMELINE INSPECTOR (s101) —
   click a point, read its state across the sim window (the literal "a coordinate
   is a timeline"). It reads the same date-parameterized world the engine drives,
   so it lights up new transitions automatically as each system lands. Its
   siblings (land/buildable, grounding, terrain-morph) arrive WITH the morphing
   engine they visualize (s102/s103), not bundled ahead of it.
   ===================================================================== */
/* @P1850-CHUNK 75 — THE ATELIER dev workbench (atelier.html only; never in release) */
(function(){
  "use strict";

  /* ---------------- injected chrome (kept out of shell.html so the release
     stylesheet carries zero workbench bytes) ---------------- */
  var wbStyle = document.createElement("style");
  wbStyle.textContent = [
    "#wb-panel{ position:fixed; left:8px; top:8px; bottom:8px; width:272px; z-index:99999;",
    "  overflow-y:auto; background:rgba(13,14,16,0.94); color:#c9cdd2; border:1px solid #33373d;",
    "  border-radius:6px; padding:8px 9px 10px; font:11px/1.45 Consolas,Menlo,monospace;",
    "  box-shadow:0 4px 18px rgba(0,0,0,0.5); }",
    "#wb-panel .wb-title{ font-weight:bold; letter-spacing:1.5px; color:#e8e3d5; font-size:12px; margin-bottom:6px; }",
    "#wb-panel .wb-sub{ font-weight:normal; letter-spacing:0; color:#7c828a; font-size:10px; }",
    "#wb-panel .wb-section{ border-top:1px solid #23272d; }",
    "#wb-panel .wb-section:first-of-type{ border-top:none; }",
    "#wb-panel .wb-sechdr{ display:flex; align-items:center; gap:6px; cursor:pointer; padding:6px 1px 5px; user-select:none; }",
    "#wb-panel .wb-sechdr:hover{ background:rgba(255,255,255,0.025); }",
    "#wb-panel .wb-caret{ color:#5b6066; font-size:8px; width:8px; text-align:center; transition:transform 0.12s; }",
    "#wb-panel .wb-section.collapsed .wb-caret{ transform:rotate(-90deg); }",
    "#wb-panel .wb-sectitle{ flex:1; color:#8fa7bd; font-size:10px; letter-spacing:1px; font-weight:bold; }",
    "#wb-panel .wb-section.active .wb-sectitle{ color:#cdd8e2; }",
    "#wb-panel .wb-secdot{ width:6px; height:6px; border-radius:50%; background:#7ee2a0; opacity:0; box-shadow:0 0 5px #7ee2a0; flex:none; }",
    "#wb-panel .wb-section.active .wb-secdot{ opacity:1; }",
    "#wb-panel .wb-secbody{ padding:0 0 5px; }",
    "#wb-panel .wb-section.collapsed .wb-secbody{ display:none; }",
    "#wb-panel .wb-info{ font:9px/12px Consolas,monospace; color:#6f757c; border:1px solid #3a3f46; border-radius:50%;",
    "  width:13px; height:13px; text-align:center; cursor:pointer; flex:none; }",
    "#wb-panel .wb-info:hover{ color:#c9cdd2; border-color:#5f676f; }",
    "#wb-panel .wb-info.on{ color:#ffd75e; border-color:#ffd75e; }",
    "#wb-panel .wb-secdesc{ display:none; font-size:9px; line-height:1.4; color:#7c828a; margin:1px 0 5px;",
    "  padding:4px 6px; background:rgba(255,255,255,0.02); border-left:2px solid #3a3f46; border-radius:2px; }",
    "#wb-panel .wb-secdesc.show{ display:block; }",
    "#wb-panel .wb-row{ display:flex; align-items:center; gap:6px; padding:1px 0; }",
    "#wb-panel .wb-row input[type=checkbox]{ margin:0; accent-color:#5aa0c8; }",
    "#wb-panel .wb-row.off .wb-lname{ color:#5b6066; text-decoration:line-through; }",
    "#wb-panel .wb-lname{ flex:1; cursor:default; }",
    "#wb-panel .wb-ov .wb-lname{ font-size:10px; color:#a9aeb5; letter-spacing:0.3px; }",
    "#wb-panel .wb-row.active{ background:rgba(255,215,94,0.06); border-radius:2px; }",
    "#wb-panel .wb-row.active .wb-lname{ color:#e6d9a8; }",
    "#wb-panel .wb-ov-legend{ display:none; font-size:9px; line-height:1.35; color:#6f757c; margin:0 0 4px 22px; }",
    "#wb-panel .wb-ov-legend.show{ display:block; }",
    "#wb-panel .wb-ov-group{ margin:5px 0 4px; border:1px solid #2a2e34; border-radius:4px; padding:3px 6px 4px; background:rgba(255,255,255,0.015); }",
    "#wb-panel .wb-ov-parent-name{ font-weight:bold; color:#cdb98f; font-size:10px; letter-spacing:0.5px; }",
    "#wb-panel .wb-ov-grouphdr{ display:none; font-size:9px; line-height:1.35; color:#7c828a; margin:1px 0 4px 22px; font-style:italic; }",
    "#wb-panel .wb-ov-grouphdr.show{ display:block; }",
    "#wb-panel .wb-ov-groupbody{ border-left:2px solid #2f343b; margin-left:6px; padding-left:6px; }",
    "#wb-panel .wb-ov-child .wb-lname{ color:#b8bdc4; }",
    "#wb-panel .wb-ov-flat{ margin-top:4px; }",
    "#wb-panel .wb-ov-status{ font-size:9px; line-height:1.35; color:#8fa77b; margin:-1px 0 5px 22px; }",
    "#wb-panel .wb-select{ flex:1; background:#1d2126; color:#c9cdd2; border:1px solid #3d4249; border-radius:3px;",
    "  font:10px Consolas,monospace; padding:2px 4px; }",
    "#wb-panel .wb-solo{ background:#1d2126; color:#6b7178; border:1px solid #33373d;",
    "  border-radius:3px; font-size:10px; line-height:1; padding:2px 5px; cursor:pointer; }",
    "#wb-panel .wb-solo.on{ color:#ffd75e; border-color:#ffd75e; }",
    "#wb-panel .wb-btn{ background:#1d2126; color:#c9cdd2; border:1px solid #3d4249; border-radius:4px;",
    "  font:11px Consolas,monospace; padding:4px 8px; cursor:pointer; margin:3px 4px 3px 0; }",
    "#wb-panel .wb-btn.on{ color:#7ee2a0; border-color:#7ee2a0; }",
    "#wb-panel .wb-probe-out{ background:#101215; border:1px solid #2a2e34; border-radius:4px;",
    "  padding:6px; margin-top:4px; min-height:26px; max-height:230px; overflow-y:auto;",
    "  font-size:10px; color:#aeb4bb; word-break:break-word; }",
    "#wb-panel .wb-probe-out.live{ border-color:#ffd75e; box-shadow:0 0 0 1px rgba(255,215,94,0.25); background:#14140f; }",
    "#wb-panel .wb-pl{ margin-bottom:3px; }",
    "#wb-panel .wb-pl b{ color:#8fa7bd; }",
    "#wb-panel .wb-knob{ display:flex; align-items:center; gap:5px; padding:1px 0; }",
    "#wb-panel .wb-klabel{ flex:1; font-size:10px; color:#a9aeb5; }",
    "#wb-panel .wb-knob input[type=range]{ width:86px; accent-color:#5aa0c8; }",
    "#wb-panel .wb-kval{ font-style:normal; color:#e8e3d5; width:32px; text-align:right; }",
    "#wb-panel .wb-actions{ margin-top:6px; }",
    "#wb-panel .wb-audit-status{ margin-top:4px; font-size:10px; color:#8a9098; }",
    "#wb-panel .wb-audit-status.ok{ color:#7ee2a0; }",
    "#wb-panel .wb-audit-status.bad{ color:#ff7a6e; }",
    "#wb-panel .wb-foot{ margin-top:8px; color:#5b6066; font-size:9px; border-top:1px solid #2a2e34; padding-top:6px; }",
    "body.wb-probe #c, body.wb-tl #c{ cursor:crosshair; }",
    "body.dev-labels-off .wlbl, body.dev-labels-off .street-label, body.dev-labels-off .biz-glyph{ display:none !important; }"
  ].join("\n");
  document.head.appendChild(wbStyle);

  /* ---------------- state ---------------- */
  var WB = {
    muted: {},            // layerName -> true when hidden
    solo: null,           // layerName | null
    probe: false,
    overlays: { spine:false, row:false, lots:false, parcels:false, wharf:false, keepout:false, zones:false, audits:false },
    tl: false,            // coordinate timeline inspector armed
    knobs: { sunMul:1, hemiMul:1, ambientMul:1, nightLift:0, detailAmp:null, doodadMul:1, streetAlphaMul:1 }
  };
  var WB_ORDER = ["terrain","ground-paint","zones-tint","buildings","wharves","doodads","people","ships","fauna","effects","labels"];
  // labels is presented as its own tri-state FAMILY below (parent + 3 sublayers),
  // not a flat mute row — exclude it here so it is not doubled.
  var WB_LAYERS = WB_ORDER.filter(function(n){ return !!__P1850_LAYER_VIS[n] && n!=="labels"; });
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
      ["spine","row","lots","parcels","reservations","wharf","keepout","zonelaw"].forEach(function(key){
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
  /* curBody is the container new elements flow into. It is the panel until a
     section opens, then that section's body — so every section-building block
     below keeps using the plain el() calls it always used, and its output lands
     inside the right collapsible section without threading a parent argument
     through each call. */
  var curBody = panel;
  function el(tag, cls, txt, parent){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(txt!=null) e.textContent = txt;
    (parent||curBody).appendChild(e);
    return e;
  }
  var title = el("div","wb-title","THE ATELIER", panel);
  el("span","wb-sub"," dev workbench — nothing here persists", title);

  /* A SECTION is a titled, collapsible group: a header row (caret · title ·
     active dot · optional ? that reveals a description) over a body. Opening a
     section points curBody at its body. This is the scannability spine — the
     rail reads as a list of section titles + their controls, with the prose
     tucked behind the ? and the whole body collapsible from the header. */
  var wbSections = {};
  function beginSection(id, titleText, opts){
    opts = opts || {};
    var wrap = el("section","wb-section", null, panel);
    var hdr = el("div","wb-sechdr", null, wrap);
    el("span","wb-caret","▾", hdr);
    el("span","wb-sectitle", titleText, hdr);
    el("span","wb-secdot", null, hdr);
    var body = el("div","wb-secbody", null, wrap);
    if(opts.desc){
      var desc = el("div","wb-secdesc", opts.desc, body);
      var q = el("span","wb-info","?", hdr);
      q.title = "show/hide description";
      q.addEventListener("click", function(ev){ ev.stopPropagation(); desc.classList.toggle("show"); q.classList.toggle("on"); });
    }
    hdr.addEventListener("click", function(){ wrap.classList.toggle("collapsed"); });
    curBody = body;
    wbSections[id] = { wrap:wrap, body:body };
    return wbSections[id];
  }
  function markSectionActive(id, on){ if(wbSections[id]) wbSections[id].wrap.classList.toggle("active", !!on); }

  /* ---- 1. LAYER PANEL ---- */
  beginSection("layers","LAYERS", { desc:"Mute a render layer with its checkbox, or solo one with the ◉ button (alt-click a row name = solo). Muted layers are re-asserted OFF every frame." });
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
    markSectionActive("layers", !!WB.solo || WB_LAYERS.some(function(n){ return WB.muted[n]; }));
  }

  /* ---- 1c. LABELS FAMILY (s90) — the labels render-layer's category sublayers
     as a tri-state family (parent LABELS → LOTS / STREETS / ZONES & LANDMARKS),
     mirroring the Ground Plan group. Children drive labelsSetSublayer(); the
     parent mirrors their state and mutes the whole layer via the visibility
     registry (__P1850_LAYER_VIS.labels). Present only when the labels layer is
     assembled in this build. ---- */
  if(typeof __P1850_LAYER_VIS.labels === "function" && typeof labelsSetSublayer === "function"){
    beginSection("labels","LABELS", { desc:"The labels render-layer's category sublayers as a tri-state family (parent LABELS → LOTS / STREETS / ZONES & LANDMARKS). §11 zoom bands: regions own the high view; streets then lots fade in on descent." });
    var lblParentVisible = true;                    // the registry parent (LABELS layer present)
    var lblGroupWrap = el("div","wb-ov-group");
    var lblHeadRow = el("div","wb-row wb-ov-parent", null, lblGroupWrap);
    var lblParentCb = document.createElement("input"); lblParentCb.type="checkbox"; lblHeadRow.appendChild(lblParentCb);
    el("span","wb-lname wb-ov-parent-name","LABELS — floating haloed world text",lblHeadRow);
    var lblGroupHdr = el("div","wb-ov-grouphdr","Lot ground-text · street names · zones & landmarks. §11 zoom bands: regions own the high view, streets then lots fade in on descent.",lblGroupWrap);
    (function(){ var q = el("span","wb-info","?", lblHeadRow); q.title="show/hide group note";
      q.addEventListener("click", function(ev){ ev.stopPropagation(); lblGroupHdr.classList.toggle("show"); q.classList.toggle("on"); }); })();
    var lblBody = el("div","wb-ov-groupbody",null,lblGroupWrap);
    var LBL_CHILDREN = [
      ["lots",    "LOTS — record lot number + owner (flat ground text, polylabel anchor)"],
      ["streets", "STREETS — era-correct names along the line (small-caps voice)"],
      ["zones",   "ZONES & LANDMARKS — hills · waterways (blue italic) · plaza · outposts"]
    ];
    var lblChildCbs = {};
    function lblSyncParent(){
      var on = 0; LBL_CHILDREN.forEach(function(c){ if(labelsGetSublayer(c[0])) on++; });
      LBL_CHILDREN.forEach(function(c){ lblChildCbs[c[0]].checked = labelsGetSublayer(c[0]); });
      lblParentCb.checked = lblParentVisible && on > 0;
      lblParentCb.indeterminate = lblParentVisible && on > 0 && on < LBL_CHILDREN.length;
    }
    LBL_CHILDREN.forEach(function(c){
      var r = overlayRow(lblBody, c[0], "wb-ov-child", c[1], "");
      r.legend.remove();                            // no separate legend line for these
      lblChildCbs[c[0]] = r.cb;
      r.cb.addEventListener("change", function(){
        labelsSetSublayer(c[0], r.cb.checked);
        if(r.cb.checked && !lblParentVisible){ lblParentVisible = true; __P1850_LAYER_VIS.labels(true); }
        lblSyncParent();
      });
    });
    lblParentCb.addEventListener("change", function(){
      var want = lblParentCb.checked; lblParentCb.indeterminate = false;
      if(want){
        lblParentVisible = true; __P1850_LAYER_VIS.labels(true);
        LBL_CHILDREN.forEach(function(c){ labelsSetSublayer(c[0], true); });
      } else {
        lblParentVisible = false; __P1850_LAYER_VIS.labels(false);   // mute the whole layer; child states preserved
      }
      lblSyncParent();
    });
    lblSyncParent();
  }

  /* ---- 2b. TERRAIN VIEW (Director addendum #3) — diagnostic material MODES
     that override the terrain mesh material ONLY: geometry untouched, water
     untouched, fully reversible (NORMAL restores), nothing persists. The
     terrain layer currently fuses geometry + skin in one mesh; these modes let
     the landform be read apart from its paint (the dune field is in the
     heightfield but illegible under textured noon light — CLAY is the answer).
     Materials are dev-only closures (atelier), built lazily on first use. ---- */
  beginSection("terrain","TERRAIN VIEW", { desc:"Diagnostic material MODES override the terrain mesh material only (geometry, water and skin untouched; NORMAL restores). SLOPE: green flat → red 45%+ grade. ELEVATION: hypsometric ramp 0–120 m, contour every 10 m. Water surface unchanged in every mode. The geometry/skin structural split is scheduled for the terrain fidelity admission." });
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
  tvSel.addEventListener("change", function(){ setTerrainMode(tvSel.value); markSectionActive("terrain", tvSel.value!=="normal"); });

  /* ---- 3. RULE OVERLAYS — a HIERARCHY (Director addendum): THE GROUND PLAN
     survey-spine family (spine centerlines · rights-of-way · plat lots · named
     parcels) under one tri-state master, then the flat law/diagnostic rows
     (walk keep-out · ecology zones · audit failures). Copy is Director-authored
     verbatim; each row is a name + a small legend line. ---- */
  beginSection("overlays","RULE OVERLAYS", { desc:"Overlays inspect the LAW and DATA behind the render — the survey spine, rights-of-way, plat lots, parcels, landmark reservations, walk keep-out mask, zones, and live audit failures. Each row's ? reveals its legend; active overlays are highlighted." });
  var overlayObjs = { spine:null, row:null, lots:null, parcels:null, reservations:null, wharf:null, keepout:null, zones:null, zonelaw:null, audits:null };
  var overlayRowEls = {};
  var auditStatusEl = null, keepoutStatusEl = null;

  function refreshOverlayActive(){
    Object.keys(overlayRowEls).forEach(function(k){ overlayRowEls[k].row.classList.toggle("active", !!WB.overlays[k]); });
    markSectionActive("overlays", Object.keys(WB.overlays).some(function(k){ return WB.overlays[k]; }));
  }

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
    refreshOverlayActive();
  }
  function overlayRow(parent, key, cls, title, legend){
    var row = el("div","wb-row wb-ov"+(cls?" "+cls:""), null, parent);
    var cb = document.createElement("input"); cb.type="checkbox"; row.appendChild(cb);
    var name = el("span","wb-lname",title,row);
    var leg = el("div","wb-ov-legend",legend,parent); // legend under the row, revealed by the row ?
    if(legend){
      var q = el("span","wb-info","?", row); q.title = "show/hide legend";
      q.addEventListener("click", function(ev){ ev.stopPropagation(); leg.classList.toggle("show"); q.classList.toggle("on"); });
    }
    return { row:row, cb:cb, name:name, legend:leg };
  }

  /* --- PARENT GROUP: the survey spine (tri-state master) --- */
  var groupWrap = el("div","wb-ov-group");
  var groupHeadRow = el("div","wb-row wb-ov-parent", null, groupWrap);
  var groupCb = document.createElement("input"); groupCb.type="checkbox"; groupHeadRow.appendChild(groupCb);
  el("span","wb-lname wb-ov-parent-name","THE GROUND PLAN — the survey spine",groupHeadRow);
  var groupHdr = el("div","wb-ov-grouphdr","Roads, lots, and zones are one dated system — toggle the family or break out a member.",groupWrap);
  (function(){ var q = el("span","wb-info","?", groupHeadRow); q.title="show/hide group note";
    q.addEventListener("click", function(ev){ ev.stopPropagation(); groupHdr.classList.toggle("show"); q.classList.toggle("on"); }); })();
  var groupBody = el("div","wb-ov-groupbody",null,groupWrap);

  var SPINE_CHILDREN = ["spine","row","lots","parcels","reservations"];
  var childCbs = {};
  var groupEverUsed = false;
  var groupLast = { spine:false, row:false, lots:false, parcels:false, reservations:false };
  function syncGroupCheckbox(){
    var on = 0; SPINE_CHILDREN.forEach(function(k){ if(WB.overlays[k]) on++; });
    groupCb.checked = on > 0;
    groupCb.indeterminate = on > 0 && on < SPINE_CHILDREN.length;
  }
  function makeChild(key, title, legend){
    var r = overlayRow(groupBody, key, "wb-ov-child", title, legend);
    childCbs[key] = r.cb;
    overlayRowEls[key] = r;
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
    "Named ground parcels carrying allowed-asset-class law (plaza · cove · mud/beach bands · camp · mission · presidio). One zone truth: placement reads these. oxblood = public reserve (the plaza common) · blue = cove · brown/tan = mud/beach bands · orange = camp · violet = mission · green = presidio. s87: all parcels are polygons — land/water parcels clipped to the 1849 shore (happy-valley-camp hugs the coast), the two shoreline bands drawn as real triangulated tints (raster exception gone).");
  makeChild("reservations","LANDMARK RESERVATIONS",
    "s91: the record's reserved ground — documented landmarks the buildings admission will spawn (never fill). Each active (built≤date, pre-burn) reservation drawn as an amber footprint + a diamond glyph at its centre; the name is in the LOTS label sublayer, and the probe card shows dates + source. Plaza cluster: Custom House + School House sit ON the plaza common (the documented civic exception); Parker House / El Dorado / Dennison's / Bella Union ring the Square (burned in the Dec 24 1849 Great Fire — scrub past it to watch them drop out). 5 documented-unanchorable landmarks reserve nothing (honest gap).");

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
    overlayRowEls[key] = r;
    r.cb.addEventListener("change", function(){ setOverlay(key, r.cb.checked); });
    return r;
  }
  var keepoutRow = makeFlat("keepout", "WALK KEEP-OUT",
    "Where walking is forbidden at the current date (red). Sources: water, placed footprints, registered keep-outs. Status line shows the live blocked-cell count — expect near-empty until blocking layers are admitted.");
  keepoutStatusEl = el("div","wb-ov-status","(toggle to sample the walk mask at this date)",flatWrap);
  makeFlat("wharf", "WHARVES (alignments + distances)",
    "s98: the AUTHORED wharf network as clear LINES — centerlines (PIERS_RUNTIME, era-gated to the active extent) + the deck-extent outline (pierDeckQuad), draped at deck height above the cove so they read against the cyan water-lot grid the corridor spans (the future-fill footprint — what the cove eventually becomes land). 100-ft distance ticks along each centerline + a cross at the bay end give the length read. gold = centerline · white = deck outline · cyan ticks = 100-ft stations. Scrub 1848→1849 to watch Central Wharf reach 300→800 ft. Only Broadway (1847) + Central (1849) are in-window; the 1850 city wharves appear past the sim end.");
  makeFlat("zonelaw", "ZONE LAW (land-use)",
    "s91: the governing LAND-USE zone tinted over the town + cove at the current date (cadZoneAt — the WHERE-per-class placement grammar canPlace reads). amber = commercial-core (plaza ring + downtown, GROWS outward by era — scrub 1846→1849 to watch it reach the waterfront) · slate = residential-band · brown = waterfront-working (piers + working shore) · blue = cove-water · oxblood = plaza · orange = camp (Happy Valley, born 1849) · violet = mission · green = presidio. Distinct from ECOLOGY ZONES (terrain/vegetation) below.");
  makeFlat("zones", "ECOLOGY ZONES",
    "The zoneAt classification tinted over the domain: which ground class governs placement and vegetation at each point. Hydrology reconciliation pending — creek network incomplete.");
  makeFlat("audits", "AUDIT FAILURES",
    "Runs the full audit suite at the current date; a red marker at every violation coordinate. An empty overlay is the goal state.");

  function buildOverlay(key){
    if(key==="spine") return buildSpineOverlay();
    if(key==="row") return buildRowOverlay();
    if(key==="keepout") return buildKeepoutOverlay();
    if(key==="zones") return buildZonesOverlay();
    if(key==="zonelaw") return buildZoneLawOverlay();
    if(key==="audits") return buildAuditOverlay();
    if(key==="lots") return buildLotOverlay();
    if(key==="parcels") return buildParcelOverlay();
    if(key==="reservations") return buildReservationOverlay();
    if(key==="wharf") return buildWharfOverlay();
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

  /* WHARVES (s98 7a — the wharf DEBUG OVERLAY) — the AUTHORED wharf network as
     clear LINES: centerlines (pierEdgesAt, era-gated to the active extent) + the
     deck-extent outline (pierDeckQuad) + 100-ft distance ticks + a bay-end cross.
     Drawn at a FIXED deck height (NOT draped on terrain — the corridor is over
     water; terrain there is the seabed, below the waterline) so the lines read
     ABOVE the cove against the cyan water-lot grid the wharf corridor spans (the
     future-fill footprint). Reads the cadastre's own day-frame deck geometry —
     zero frame math here (same single-frame law as every overlay). */
  var WHARF_OVL_GOLD=new THREE.Color(0xf2c14e), WHARF_OVL_WHITE=new THREE.Color(0xf3f5f7), WHARF_OVL_TICK=new THREE.Color(0x3fd0e0);
  function buildWharfOverlay(){
    _overlayDay = Math.floor(simDay);
    var yOvl = (typeof WHARF_DECK_Y!=="undefined" ? WHARF_DECK_Y : 2.0) + 0.6;   // just above the deck top, over the water
    var FT_M = 0.3048, TICK_FT = 100, TICK_M = TICK_FT*FT_M;
    var pos=[], col=[];
    function seg(a, b, c){ pos.push(a.x, yOvl, a.z, b.x, yOvl, b.z); col.push(c.r,c.g,c.b, c.r,c.g,c.b); }
    var piers = (typeof piersAt==="function") ? piersAt(simDay) : [];
    piers.forEach(function(p){
      var e = pierEdgesAt(p, simDay);
      if(!e || !e.active || e.centerline.length<2) return;                       // not yet decked at this date
      var cl = e.centerline;
      for(var k=0;k<cl.length-1;k++) seg(cl[k], cl[k+1], WHARF_OVL_GOLD);         // centerline (gold)
      var q = e.deckQuad;                                                         // deck-extent outline (white loop)
      for(var m=0;m<q.length;m++) seg(q[m], q[(m+1)%q.length], WHARF_OVL_WHITE);
      // 100-ft distance ticks along the centerline (perpendicular cyan marks)
      var acc=0, hw=Math.max(p.widthM*0.9, 6);
      for(var s2=0;s2<cl.length-1;s2++){
        var a=cl[s2], b=cl[s2+1], dx=b.x-a.x, dz=b.z-a.z, L=Math.hypot(dx,dz)||1, ux=dx/L, uz=dz/L, nx=-uz, nz=ux;
        var next=Math.ceil((acc+1e-6)/TICK_M)*TICK_M;
        while(next<=acc+L+1e-6){
          var t=(next-acc)/L, mx=a.x+dx*t, mz=a.z+dz*t;
          seg({x:mx+nx*hw, z:mz+nz*hw}, {x:mx-nx*hw, z:mz-nz*hw}, WHARF_OVL_TICK);
          next+=TICK_M;
        }
        acc+=L;
      }
      // bay-end cross (the reach terminus — reads the built distance at a glance)
      var o=e.outerEnd, r=Math.max(p.widthM, 8);
      seg({x:o.x-r,z:o.z}, {x:o.x+r,z:o.z}, WHARF_OVL_TICK);
      seg({x:o.x,z:o.z-r}, {x:o.x,z:o.z+r}, WHARF_OVL_TICK);
    });
    if(!pos.length) return null;
    return wbLineSegs(pos, col, 0.98, 1001);
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
  /* plaza (public reserve) is OXBLOOD — the game-read spec's civic accent
     (Director rider, s88). It was WARM GOLD, which after s87's gold record-lot
     fill made the plaza read as "a third record block" with both overlays on;
     oxblood is unmistakably not gold and not the cove's blue (s81 finding C). */
  var CAD_PARCEL_COLS = { plaza:[114,32,32], water:[70,150,200], mud:[130,90,70], beach:[210,190,120],
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
        var sc = (p.cls==="plaza") ? { r:0.31, g:0.08, b:0.08 } : c; // s88: deeper oxblood boundary for the public reserve
        wbPushDrapedRun(strokePos, strokeCol, ring.concat([ring[0]]), sc, 0.55, false, 9); // exact-edge boundary
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

  /* s91 — ZONE LAW MAP: the governing land-use zone (cadZoneAt) tinted over the
     town + cove at the current date. A draped tint plane like the ecology-zone
     overlay, but keyed to the LAND-USE zone (WHERE-per-class placement grammar),
     so the commercial core visibly grows outward across the era checkpoints. */
  var WB_ZONELAW_COL = { "plaza":[150,45,45], "waterfront-working":[140,95,70], "cove-water":[70,150,200],
    "commercial-core":[224,164,52], "camp":[232,112,60], "mission-cluster":[168,110,196],
    "presidio":[110,170,90], "residential-band":[118,196,168] /* distinct sea-green: not the amber core, not the cove's saturated blue */ };
  function buildZoneLawOverlay(){
    _overlayDay = Math.floor(simDay);
    var pc = (typeof PLAZA_CENTER==="object"&&PLAZA_CENTER) ? PLAZA_CENTER : {x:0,z:0};
    var box = { xMin:pc.x-720, xMax:pc.x+1320, zMin:pc.z-760, zMax:pc.z+1240 };
    var day = simDay;
    return samplePlaneOverlay(box, 208, function(x,z){
      var id = (typeof landUseZoneAt==="function") ? landUseZoneAt(x,z,day) : null;
      if(!id) return null;
      var c = WB_ZONELAW_COL[id] || [150,150,150];
      return [c[0], c[1], c[2], 150];
    });
  }

  /* s91 — LANDMARK RESERVATIONS: each reservation active at the current date
     (built ≤ date, before any in-window burn) drawn as an amber footprint quad
     (translucent fill + bold boundary) with a diamond glyph at its centre. The
     record's ground, distinct from the pattern lots — reserved, never fill. */
  function buildReservationOverlay(){
    _overlayDay = Math.floor(simDay);
    var grp = new THREE.Group(); grp.frustumCulled=false;
    var live = (typeof reservationsAt==="function") ? reservationsAt(simDay) : [];
    var strokePos=[], strokeCol=[], glyphPos=[], glyphCol=[], fillPos=[], fillCol=[];
    var AMBER = new THREE.Color(0xffb347), FILL={ r:1.0, g:0.70, b:0.28 };
    live.forEach(function(r){
      if(!r.footprint) return;
      var q = r.footprint.quad; if(!q || q.length<4) return;
      var before=fillPos.length;
      wbPushDrapedTri(fillPos, q[0],q[1],q[2], 0.42, 1);
      wbPushDrapedTri(fillPos, q[0],q[2],q[3], 0.42, 1);
      for(var f=0,added=(fillPos.length-before)/3; f<added; f++) fillCol.push(FILL.r,FILL.g,FILL.b);
      wbPushDrapedRun(strokePos,strokeCol,[q[0],q[1],q[2],q[3],q[0]],AMBER,0.66,false,9);
      var cx=r.footprint.cx, cz=r.footprint.cz, rr=4.0;
      wbPushDrapedRun(glyphPos,glyphCol,[{x:cx-rr,z:cz},{x:cx,z:cz-rr},{x:cx+rr,z:cz},{x:cx,z:cz+rr},{x:cx-rr,z:cz}],AMBER,0.95,false,3);
    });
    if(fillPos.length){
      var fg=new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.Float32BufferAttribute(fillPos,3));
      fg.setAttribute("color", new THREE.Float32BufferAttribute(fillCol,3));
      var fm=new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:0.30, depthTest:false, depthWrite:false, side:THREE.DoubleSide }));
      fm.renderOrder=997; fm.frustumCulled=false; grp.add(fm);
    }
    if(strokePos.length) grp.add(wbLineSegs(strokePos, strokeCol, 0.98, 1001));
    if(glyphPos.length)  grp.add(wbLineSegs(glyphPos,  glyphCol,  1.0,  1002));
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

  /* =====================================================================
     s101 THE COORDINATE TIMELINE INSPECTOR — the first DEBUG-VIZ-FIRST tool:
     SEE a coordinate's timeline. A PURE READ of the existing date-parameterized
     world (no dice, no new world state, static terrain). The land/buildable
     overlay, grounding viz, and terrain-morph framework are DEFERRED to land WITH
     the morphing engine they visualize (s102/s103) — debug-viz-first PER SYSTEM.
     ===================================================================== */

  /* THE isLandAt SEAM (temporal-world-model.md §2/§7). STATIC interim impl:
     land <=> terrainHeight > the bay waterline (y=0). The inspector's land/water
     read routes through this ONE helper, so when the date-editable heightfield
     lands (s103) the cove FILLS by swapping this single call-site to
     terrainHeightAt(x,z,day) — nothing else changes. The `day` argument is
     accepted now (ignored) so the signature is already correct. */
  var WB_WATERLINE_Y = 0.0;
  function wbIsLandAt(x, z, day){ return terrainHeight(x, z) > WB_WATERLINE_Y; }

  /* oriented-footprint hit test (same width/depth axis convention as the buildings
     layer's poseQuad): is (x,z) inside a building's drawn box. */
  function wbInBox(x, z, cx, cz, w, d, yaw){
    var nx = Math.sin(yaw), nz = Math.cos(yaw), tx = nz, tz = -nx, dx = x-cx, dz = z-cz;
    return Math.abs(dx*tx+dz*tz) <= w/2+0.2 && Math.abs(dx*nx+dz*nz) <= d/2+0.2;
  }

  /* THE COORDINATE TIMELINE INSPECTOR. Click any world point
     → raycast to the ground → read that coordinate's STATE across the sim window
     and render the SEQUENCE OF STATE CHANGES (unchanged spans collapsed). The
     literal picture of "a coordinate is a timeline": water/land, block/lot, zone,
     ROW, parcels, reservation, pier, and building, each at date. Pure reads. */
  function wbBuildingAt(x, z, day){
    try{
      if(typeof deriveLandmarkSet === "function"){ var L = deriveLandmarkSet(day);
        for(var i = 0; i < L.length; i++){ var e = L[i]; if(wbInBox(x, z, e.cx, e.cz, e.w, e.d, e.yaw)) return "landmark "+(e.name||e.id)+" ["+e.state+"]"; } }
      if(typeof deriveFillSet === "function"){ var F = deriveFillSet(day);
        for(var j = 0; j < F.length; j++){ var f = F[j]; if(wbInBox(x, z, f.cx, f.cz, f.w, f.d, f.yaw)) return "fill "+f.code+" ["+f.state+"]"; } }
    }catch(e){}
    return null;
  }
  function wbCoordStateAt(x, z, day){
    var gp = groundPlanAt(x, z, day);
    return { land:wbIsLandAt(x, z, day), block:gp.block, lot:gp.platLot, zone:gp.zone, row:(gp.row?gp.row.id:null),
             parcels:(gp.parcels||[]).slice().sort().join(","), reservation:gp.reservation,
             pier:(typeof pierAt === "function") ? pierAt(x, z, day) : null, bld:wbBuildingAt(x, z, day) };
  }
  function wbStateSig(s){
    return [s.land?"L":"W", s.block||"-", s.lot||"-", s.zone||"-", s.row||"-", s.parcels||"-", s.reservation||"-", s.pier||"-", s.bld||"-"].join("|");
  }
  function wbStateDesc(s){
    var p = [];
    p.push(s.land ? "land" : "WATER");
    if(s.pier) p.push("pier "+s.pier);
    if(s.lot) p.push("lot "+s.lot); else if(s.block) p.push("block "+s.block); else p.push("unplatted");
    if(s.zone) p.push("zone "+s.zone);
    if(s.row) p.push("ROW "+s.row);
    if(s.parcels) p.push("["+s.parcels+"]");
    if(s.reservation) p.push("reserved "+s.reservation);
    if(s.bld) p.push("building: "+s.bld);
    return p.join(" · ");
  }
  /* the sampled dates: monthly boundaries across [0, SIM_END_DAY] PLUS the exact
     event days (block births, reservation built/burned, pier build-out, street
     survey checkpoints) so a transition reports on its true date, not the coarse
     month boundary. Deterministic, clamped to the sim window, sorted, deduped. */
  function wbTimelineDays(){
    var set = {};
    function add(d){ if(d == null || !isFinite(d)) return; d = Math.max(0, Math.min(SIM_END_DAY, Math.round(d))); set[d] = 1; }
    var d0 = dateFromSimDay(0), y = d0.getUTCFullYear(), m = d0.getUTCMonth();
    for(var k = 0; k < 72; k++){ var day = (Date.UTC(y, m+k, 1) - SIM_START_MS)/86400000; if(day > SIM_END_DAY) break; add(day); }
    add(0); add(SIM_END_DAY);
    try{ (GROUND_PLAN.blocks||[]).forEach(function(b){ add(b.birth); }); }catch(e){}
    try{ (typeof GROUND_RESERVATIONS !== "undefined" ? GROUND_RESERVATIONS : []).forEach(function(r){ add(r.built); add(r.burned); }); }catch(e){}
    try{ (typeof PIERS_RUNTIME !== "undefined" ? PIERS_RUNTIME : []).forEach(function(p){ add(p.birthDay); (p.checkpoints||[]).forEach(function(c){ add(c.day); }); }); }catch(e){}
    try{ (typeof STREETS_RUNTIME !== "undefined" ? STREETS_RUNTIME : []).forEach(function(s){ (s.checkpoints||[]).forEach(function(c){ add(c.day); }); add(s.surveyedDay); }); }catch(e){}
    return Object.keys(set).map(Number).sort(function(a, b){ return a-b; });
  }
  var wbTlMarkerObj = null;
  function wbClearTlMarker(){ if(wbTlMarkerObj){ scene.remove(wbTlMarkerObj); wbTlMarkerObj = null; } }
  function wbSetTlMarker(x, z){
    wbClearTlMarker();
    var g = new THREE.ConeGeometry(3, 18, 8); g.translate(0, 9, 0);
    var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color:0xffd75e, depthTest:false, transparent:true, opacity:0.95 }));
    m.position.set(x, terrainHeight(x, z), z); m.renderOrder = 2000; m.frustumCulled = false;
    wbTlMarkerObj = m; scene.add(m);
  }
  beginSection("s101","TEMPORAL DEBUG-VIZ", { desc:"The coordinate timeline inspector (debug-viz-first, s101). Arm, then click any world point to read its state — water/land, block/lot, zone, ROW, parcels, reservation, pier, building — across the 1846–1849 window, unchanged spans collapsed. Pure reads of the date-parameterized world; static terrain until terrain-morphing (s102/s103)." });
  var tlActions = el("div","wb-actions");
  var tlBtn = el("button","wb-btn","timeline: OFF — click to arm", tlActions);
  var tlClearBtn = el("button","wb-btn","clear pin", tlActions);
  var tlOut = el("div","wb-probe-out","(arm, then click any world point to read its state across 1846–1849)");
  tlBtn.addEventListener("click", function(){
    WB.tl = !WB.tl;
    tlBtn.textContent = WB.tl ? "timeline: ON — click the world" : "timeline: OFF — click to arm";
    tlBtn.classList.toggle("on", WB.tl);
    document.body.classList.toggle("wb-tl", WB.tl);
    markSectionActive("s101", WB.tl);
  });
  tlClearBtn.addEventListener("click", function(){ wbClearTlMarker(); tlOut.textContent = "(pin cleared)"; tlOut.classList.remove("live"); });
  function wbTlLine(k, v){ var d = document.createElement("div"); d.className = "wb-pl"; d.innerHTML = "<b>"+k+"</b> "+v; tlOut.appendChild(d); }
  function wbRunTimeline(px, py){
    var p = groundPointFromScreen(px, py);
    tlOut.textContent = "";
    if(!p){ wbTlLine("timeline", "no ground under that click (sky)"); tlOut.classList.remove("live"); return; }
    tlOut.classList.add("live");
    wbSetTlMarker(p.x, p.z);
    var days = wbTimelineDays(), spans = [], prevSig = null;
    for(var i = 0; i < days.length; i++){
      var s = wbCoordStateAt(p.x, p.z, days[i]), sig = wbStateSig(s);
      if(sig !== prevSig){ spans.push({ day:days[i], state:s }); prevSig = sig; }
    }
    wbTlLine("point", p.x.toFixed(1)+", "+p.z.toFixed(1)+" · terrain "+terrainHeight(p.x, p.z).toFixed(2)+"m · "
      + spans.length+" state span"+(spans.length===1?"":"s")+" over the sim window ("+days.length+" dates sampled)");
    spans.forEach(function(sp){ wbTlLine(dateFromSimDay(sp.day).toISOString().slice(0, 7), wbStateDesc(sp.state)); });
    wbTlLine("note", "static terrain (s101): land/water is fixed until terrain-morphing (s102/s103). This inspector reads the same date-parameterized queries the engine drives, so water→land→pier→building transitions appear here automatically as those systems land.");
  }
  canvas.addEventListener("click", function(ev){
    if(!WB.tl) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    wbRunTimeline(ev.clientX, ev.clientY);
  }, true);

  /* ---- 2. PROVENANCE PROBE ---- */
  beginSection("probe","PROVENANCE PROBE", { desc:"Arm, then click any world point for a full provenance card at the current date — terrain, ground-paint, cadastre lot/block/parcel/zone-law, landmark reservation, buildings, doodads, people, walk mask, and the real pick hit." });
  var probeBtn = el("button","wb-btn","probe: OFF — click to arm");
  var probeOut = el("div","wb-probe-out","(arm, then click any world point)");
  probeBtn.addEventListener("click", function(){
    WB.probe = !WB.probe;
    probeBtn.textContent = WB.probe ? "probe: ON — click the world" : "probe: OFF — click to arm";
    probeBtn.classList.toggle("on", WB.probe);
    document.body.classList.toggle("wb-probe", WB.probe);
    markSectionActive("probe", WB.probe);
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
    if(!p){ probeLine(probeOut,"probe","no ground under that click (sky)"); probeOut.classList.remove("live"); return; }
    probeOut.classList.add("live");
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
      // s91: governing land-use zone (WHERE-per-class law) + allowed classes
      if(gp.zone && typeof parcelByName==="function"){
        var Zdef = (typeof CAD_ZONE_BY_ID!=="undefined") ? CAD_ZONE_BY_ID[gp.zone] : null;
        probeLine(probeOut, "zone-law", "<b>"+gp.zone+"</b>"
          + (Zdef ? " · density "+Zdef.densityTier+" · allows: "+Zdef.allowedClasses.join(", ") : ""));
      } else if(!gp.zone){
        probeLine(probeOut, "zone-law", "loose ground (outside every zone — only tents/shanties/scatter/fauna place here)");
      }
      // s91: landmark reservation card (name · dates · confidence · source)
      if(gp.reservation && typeof reservationById==="function"){
        var lm = reservationById(gp.reservation);
        if(lm){
          var bt = lm.built<=-1e8 ? "pre-sim" : simDateISO(dateFromSimDay(lm.built));
          var arc = "built "+bt + (lm.burned!=null ? " · burned "+simDateISO(dateFromSimDay(lm.burned)) : "");
          probeLine(probeOut, "LANDMARK", "<b>"+lm.name+"</b> ("+lm.dossier+") · "+arc + " · confidence "+lm.confidence);
          if(lm.note)   probeLine(probeOut, "landmark-note", String(lm.note).slice(0,140));
          if(lm.source) probeLine(probeOut, "landmark-source", String(lm.source).slice(0,140));
        }
      }
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
  beginSection("knobs","TUNING KNOBS", { desc:"Live lighting and detail multipliers layered over whatever the sim wrote this frame. Nothing persists — reload resets every knob to its default." });
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
    markSectionActive("knobs", Object.keys(WB.knobs).some(function(k){ return Math.abs(WB.knobs[k]-WB_KNOB_DEFAULTS[k])>1e-9; }));
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
  beginSection("actions","AUDITS & EXPORT");
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
  curBody = panel;   // footer sits at the panel root, below every section
  el("div","wb-foot", "Overlays inspect the LAW and DATA; the Layers list above shows admitted RENDERERS — the spine has no renderer of its own by design (ground-paint derives from it).");
  el("div","wb-foot", WB_LAYERS.length+" layers registered · atelier.html only (never in the release build) · nothing persists");

  /* SURFACE THE ACTIVE TOOLS: lift the two inspectors (timeline + probe) to the
     top of the rail, right under the title, so a pinned readout is the first
     thing seen instead of being buried beneath the overlay list. */
  if(wbSections.s101 && wbSections.layers) panel.insertBefore(wbSections.s101.wrap, wbSections.layers.wrap);
  if(wbSections.probe && wbSections.layers) panel.insertBefore(wbSections.probe.wrap, wbSections.layers.wrap);

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
