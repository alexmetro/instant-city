/* =====================================================================
   core/06-debug — the __P1850 debug/QA registry + the consolidated audit registry
   (__P1850.audits.<layer>.<name>, runAll()). Layers register audits via registerAudit().
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 70 — __P1850 debug registry */
window.__P1850 = {
  jump: function(iso){ jumpToDate(eventDateToSimDay(iso)); }, // P0-3: routes through jumpToDate's noon-default fix
  jumpDay: function(day){ jumpToDate(day); }, // s59 QA: fractional-day jumps (sample specific hours)
  dayOf: function(iso){ return eventDateToSimDay(iso); },
  // s46 QA — peninsula bake hooks
  get world(){ return { x0:Math.round(WORLD.x0), z0:Math.round(WORLD.z0), xMax:Math.round(WORLD.xMax), zMax:Math.round(WORLD.zMax), cell:+WORLD.cell.toFixed(3), maxAltitude:CFG.maxAltitude }; },
  get terrainMesh(){ return TERRAIN_MESH_STATS; },
  get westFauna(){ return window._westFauna; },
  zoneAt: function(x,z){ return zoneAt(x,z); },
  invalidatePaint: function(){ invalidateGroundPaint(); return "redraped + repaint queued"; },
  _scene: function(){ return scene; },
  _renderer: function(){ return renderer; },
  // s44 QA — Director V2 hooks: the logged beat sequence and speed control
  // (both route through the real user-facing functions; the watch toggle is
  // the single `watch: setWatchMode` member further down — a duplicate
  // `watch:` key here was deleted in the 2026-07-12 cleanup).
  get beatLog(){ return INTEREST.log.slice(); },
  setSpeed: function(k){ setSimSpeed(k); },
  get director(){ // s44 QA introspection
    var b = DIRECTOR.beat;
    return {
      beat: b ? { kind:b.kind||"event", cls:b.cls, headline:b.headline, hold:b.hold,
                  pendingCut:!!b._pendingCut, slotId: b.slot?b.slot.id:null,
                  elapsed: +( (performance.now()-DIRECTOR.beatStart)/1000 ).toFixed(1) } : null,
      autoSlotId: DIRECTOR.autoSlot ? DIRECTOR.autoSlot.id : null,
      followedSlotId: followedSlot ? followedSlot.id : null,
      followedName: followedSlot && followedSlot.bio ? followedSlot.bio.name : null,
      suspendedForMs: Math.max(0, Math.round(DIRECTOR.suspendUntil-performance.now())),
      nextPickInMs: Math.max(0, Math.round(DIRECTOR.nextPickAt-performance.now())),
      pending: DIRECTOR.pending.length
    };
  },
  get date(){ return simDateISO(dateFromSimDay(simDay)); },
  get simDay(){ return simDay; },
  // s54 QA — touch-control-surface hooks: mode states and yaw (twist-orbit
  // verification reads yawT against the gesture angle). The speed tier is
  // the single `get speedKey()` further down — a duplicate getter here was
  // deleted in the 2026-07-12 cleanup.
  get modes(){ return { watch:WATCH.on, paper:paperOpen, ghost:ghostVisible,
    documentedOnly:provenanceOnly, tilt:cinematicTilt, pitchOff:+CAM.pitchOffT.toFixed(3) }; },
  get yawState(){ return { yaw:+CAM.yaw.toFixed(4), yawT:+CAM.yawT.toFixed(4) }; },
  get population(){ return Math.round(populationAt(simDay)); }, // documented population (POP_CURVE) — QA-GATE stat spot-check
  get density(){ return Math.round(densityAt(simDay)); }, // visible structure/crowd density driver (DENSITY_CURVE), decoupled from population
  get calls(){ return renderer.info.render.calls; },
  // s52 GROUND MATERIALITY QA hooks: micro-scatter census + a detail-layer
  // kill switch (detailAmp=0 must render pixel-identical beyond the fade —
  // and at ANY map framing — proving the distance fade)
  get micro(){ return MICRO_STATS; },
  get detailSets(){ return DETAIL_UNIFORM_SETS.length; },
  get detailAmp(){ return DETAIL_AMP_DEFAULT; },
  set detailAmp(v){ DETAIL_AMP_DEFAULT = +v; for(var i=0;i<DETAIL_UNIFORM_SETS.length;i++) DETAIL_UNIFORM_SETS[i].uDetailAmp.value = +v; },
  // s60 PAINTERLY GROUND KIT QA hooks: tile-kit census, doodad-ring census,
  // and a wet override (forces the mud-winter wet state for closeup QA
  // regardless of the current weatherState — null returns it to weather)
  get tiles(){ return TILE_STATS; },
  get doodads(){ return DOODAD_STATS; },
  get wetOverride(){ return WET_OVERRIDE; },
  set wetOverride(v){ WET_OVERRIDE = (v==null ? null : +v); updateWetTint(); },
  render: function(){ renderer.render(scene, camera); },
  tick: function(dt){ return applyCameraRig(dt||0.1); }, // manual frame-advance — CDP-automated tabs can report
                                                          // document.hidden=true and never fire rAF at all, so QA
                                                          // scripts can call this directly to advance the camera
                                                          // chase without depending on requestAnimationFrame.
  camSet: function(o){ // QA/CDP camera control (s16 street-label verification): write rig targets directly
    if(o.tT!=null) CAM.tT = clamp(o.tT,0,1);
    if(o.alt!=null) setZoomMeters(o.alt);
    if(o.yaw!=null) CAM.yawT = o.yaw;
    if(o.pitchOff!=null) CAM.pitchOffT = clamp(o.pitchOff, PITCH_OFF_MIN, PITCH_OFF_MAX);
    if(o.x!=null && o.z!=null){ CAM.focusT.set(o.x, groundHeight(o.x,o.z)+2, o.z); }
    if(o.snap){ CAM.t=CAM.tT; CAM.yaw=CAM.yawT; CAM.pitchOff=CAM.pitchOffT; CAM.focus.copy(CAM.focusT); }
  },
  /* s42 QA — inspect-law verification hooks: screen-coordinate pick (the
     real doPick path), panel readback, and direct per-kind selectors. */
  pick: function(x,y){ return trySelectAtScreenXY(x,y); },
  inspectPanel: function(){
    return inspectPanelEl.classList.contains("on")
      ? { kind: ipKindEl.textContent, name: ipNameEl.textContent, body: ipBodyEl.innerText }
      : null;
  },
  toScreen: function(x,z){
    var v = new THREE.Vector3(x, terrainHeight(x,z), z).project(camera);
    return { x:(v.x*0.5+0.5)*window.innerWidth, y:(-v.y*0.5+0.5)*window.innerHeight, front: v.z<1 };
  },
  closeInspect: closeInspect,
  _sel: {
    person: openPersonInspectorForSlot,
    documented: openPersonInspectorForDocumented,
    ship: openShipInspector,
    building: openBuildingInspector,
    growth: openGrowthBuildingInspector,
    tent: openTentInspector,
    street: openStreetInspector,
    zone: openZoneInspector,
    species: openSpeciesInspector,
    place: openPlaceInspector
  },
  get _selData(){
    return { slots:ALL_PEOPLE_SLOTS, villageSpots:VILLAGE_BUILDING_SPOTS, homes:HOME_BUILDING_SPOTS,
      streets:STREETS_RUNTIME, visits:shipVisits, zones:DISTRICT_ZONES, growth:spawnedBuildings,
      tentsSpawned:spawnedTents, tentCands:tentCandidates, inspectMeshes:INSPECT_MESHES, locPoints:LOC_POINTS };
  },
  get worldLabels(){ // every visible world label with class + screen box (collision QA)
    var out = [];
    document.querySelectorAll(".wlbl, .street-label, .biz-glyph").forEach(function(el){
      if(!(parseFloat(el.style.opacity)>0.05)) return;
      var r = el.getBoundingClientRect();
      out.push({ cls:el.className, text:(el.innerText||"").slice(0,40), left:Math.round(r.left), top:Math.round(r.top), right:Math.round(r.right), bottom:Math.round(r.bottom) });
    });
    return out;
  },
  get streetLabels(){ // s16 QA: every street label currently rendering, with screen box + rotation
    var out=[];
    streetLabelSlots.forEach(function(sl){
      if(!(parseFloat(sl.el.style.opacity)>0.05)) return;
      out.push({ name:sl.el.textContent, state:sl.state,
        x:Math.round(parseFloat(sl.el.style.left)||0), y:Math.round(parseFloat(sl.el.style.top)||0),
        rot:(sl.anchor&&sl.anchor.lastAngle!=null)?Math.round(sl.anchor.lastAngle):null, w:sl.el.offsetWidth, h:sl.el.offsetHeight });
    });
    return out;
  },
  get cam(){ return { x:camera.position.x, y:camera.position.y, z:camera.position.z,
    t:CAM.t, tT:CAM.tT, yaw:CAM.yaw, yawT:CAM.yawT, pitchOff:CAM.pitchOff, pitchOffT:CAM.pitchOffT, radius:CAM.radius,
    focus:{x:CAM.focus.x,y:CAM.focus.y,z:CAM.focus.z}, focusT:{x:CAM.focusT.x,y:CAM.focusT.y,z:CAM.focusT.z},
    alt:lastKnownAlt }; },
  get fire(){ return { glow:fireGlow, burning:_fireBurningCount, flames:flameMesh.count }; },
  get crowd(){
    var fleeing=0, watching=0;
    ALL_PEOPLE_SLOTS.forEach(function(s){
      if(s._now==="fleeing the fire") fleeing++;
      else if(s._now==="watching the fire from the Plaza") watching++;
    });
    return { fleeing:fleeing, watching:watching };
  },
  watch: setWatchMode, speed: setSimSpeed, flyTo: flyTo,
  get speedKey(){ return simSpeedKey; },
  get splatStats(){ return SPLAT_LAST_STATS; }, // s20 QA: era-diff ground truth — what the last splat repaint actually painted, per street
  /* ROAD LIFECYCLE (grounding.md §9b, s27): per-street lifecycle state at
     the CURRENT date, computed fresh (rewind-exact — pure function of
     simDay). streetId accepts the dataset id, a numbered-street member id,
     or a loose name ("kearny", "first", "market"). */
  roadState: function(streetId){
    var key = String(streetId||"").toLowerCase();
    var s = STREETS_RUNTIME_BY_ID[streetId] || STREETS_RUNTIME_BY_ID[key];
    if(!s){
      for(var i=0;i<STREETS_RUNTIME.length;i++){
        var c = STREETS_RUNTIME[i];
        if(c.id.toLowerCase()===key || c.name.toLowerCase().indexOf(key)===0 ||
           c.id.toLowerCase().indexOf(":"+key)>=0){ s=c; break; }
      }
    }
    if(!s) return null;
    var gateDay = s.surveyedDay!=null ? s.surveyedDay : s.firstMentionDay;
    var out = { id:s.id, name:s.name, date:simDateISO(dateFromSimDay(simDay)), state:"S0", pieces:[] };
    if(gateDay==null || simDay<gateDay) return out;
    var active = s.checkpoints[0];
    for(var ci=0; ci<s.checkpoints.length; ci++){ if(s.checkpoints[ci].day<=simDay) active=s.checkpoints[ci]; }
    if(!active) return out;
    var i0=active.extent[0], i1=active.extent[1];
    var angle = s.swings ? CURRENT_STREET_SKEW : GRID_ROT_BASE;
    var viogetExt = (s.surveyedDay!=null && s.surveyedDay<=0 && s.checkpoints.length) ? s.checkpoints[0].extent : null;
    var maxSt = 0;
    for(var pi=i0; pi<i1; pi++){
      var A = gridToWorldAt(s.polyline[pi].u, s.polyline[pi].v, angle);
      var B = gridToWorldAt(s.polyline[pi+1].u, s.polyline[pi+1].v, angle);
      var segLen = Math.hypot(B.x-A.x, B.z-A.z);
      var nSub = Math.max(1, Math.min(18, Math.round(segLen/50)));
      for(var sub=0; sub<nSub; sub++){
        var t=(sub+0.5)/nSub;
        var mx=A.x+(B.x-A.x)*t, mz=A.z+(B.z-A.z)*t;
        var wet = terrainHeight(mx,mz)<=0.5;
        if(wet){ out.pieces.push({x:Math.round(mx), z:Math.round(mz), st:"wet"}); continue; }
        var vf = viogetExt && pi>=viogetExt[0] && (pi+1)<=viogetExt[1];
        var st = roadPieceState(s, mx, mz, simDay, vf);
        maxSt = Math.max(maxSt, st.st);
        out.pieces.push({x:Math.round(mx), z:Math.round(mz), st:st.st, use:Math.round(st.use)});
      }
    }
    out.state = "S"+maxSt;
    return out;
  },
  roadStates: function(){ // summary of every street's current lifecycle state
    var self=this, out={};
    STREETS_RUNTIME.forEach(function(s){ var r=self.roadState(s.id); out[s.id]=r?r.state:"S0"; });
    return out;
  },
  roadAudit: function(){ /* s62 (road-master-spec constant-width amendment):
    ZERO structures on any right-of-way at any era. Checks every placed or
    placeable footprint (village incl. documented rows, growth candidates,
    tent candidates) against the constant-class-width street segments in
    EVERY frame a street ever renders in (PLACEMENT_STREET_SEGS). */
    function rectPts(x,z,rot,hw,hd){
      var c=Math.cos(rot), sn=Math.sin(rot), out=[];
      [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd],[0,0],[hw,0],[-hw,0],[0,hd],[0,-hd]].forEach(function(o){
        out.push({x:x+o[0]*c-o[1]*sn, z:z+o[0]*sn+o[1]*c});
      });
      return out;
    }
    function onRoad(pts, pad, postSwingOnly){
      for(var i=0;i<PLACEMENT_STREET_SEGS.length;i++){
        var sg=PLACEMENT_STREET_SEGS[i];
        // a structure founded AFTER the O'Farrell swing never coexists with
        // the pre-1847 Vioget-frame paint — audit it only against the frame
        // its streets actually render in while it stands
        if(postSwingOnly && sg.frame==="vioget") continue;
        for(var k=0;k<pts.length;k++){
          if(distToSegXZ(pts[k].x,pts[k].z,sg.x0,sg.z0,sg.x1,sg.z1) < sg.halfW+(pad||0)-0.05) return {id:sg.id, frame:sg.frame};
        }
      }
      return null;
    }
    var bad=[];
    VILLAGE_BUILDING_SPOTS.forEach(function(b,i){
      var postSwing = b.foundedDay!=null && b.foundedDay >= OFARRELL_SWING_END;
      var hit = onRoad(rectPts(b.x,b.z,b.rot||0,(b.w||4)/2,(b.d||4)/2), 0, postSwing);
      if(hit) bad.push({kind:"village", i:i, name:b.name||null, x:Math.round(b.x), z:Math.round(b.z), st:hit.id, frame:hit.frame});
    });
    growthBuildingCandidates.forEach(function(c,i){
      if(onRoad([{x:c.x,z:c.z}], 3.2)) bad.push({kind:"growth", i:i, x:Math.round(c.x), z:Math.round(c.z)});
    });
    tentCandidates.forEach(function(c,i){
      if(onRoad([{x:c.x,z:c.z}], 1.8)) bad.push({kind:"tent", i:i, x:Math.round(c.x), z:Math.round(c.z)});
    });
    return { checked: VILLAGE_BUILDING_SPOTS.length+growthBuildingCandidates.length+tentCandidates.length,
             violations: bad.length, list: bad.slice(0,40) };
  },
  terrainEdited: invalidateGroundPaint, // road-master-spec §6: terrain edits MUST invalidate ground paint
  _splatDebug: { townMesh:function(v){ splatTownMesh.visible=v; }, worldMesh:function(v){ splatWorldMesh.visible=v; },
    closeMesh:function(v){ splatCloseMesh.visible=v; },
    townAlphaAt:function(x,z){ var p=townPx(x,z); return splatTownCtx.getImageData(Math.round(p.x),Math.round(p.y),1,1).data; },
    closeAlphaAt:function(x,z){ var p=closePx(x,z); return splatCloseCtx.getImageData(Math.round(p.x),Math.round(p.y),1,1).data; },
    nearAt:function(x,z,r){ r=r||70; var b=0,t=0,i,dx,dz;
      for(i=0;i<spawnedBuildings.length;i++){ dx=spawnedBuildings[i].x-x; dz=spawnedBuildings[i].z-z; if(dx*dx+dz*dz<=r*r) b++; }
      for(i=0;i<spawnedTents.length;i++){ dx=spawnedTents[i].x-x; dz=spawnedTents[i].z-z; if(dx*dx+dz*dz<=r*r) t++; }
      return {buildings:b, tents:t}; } },
  splatOwnership: function(){ // QA: one owner per pixel — world contributes NOTHING inside the town rect, town NOTHING inside the close rect
    var f = TIER_FEATHER_M;
    var probes = [
      { tier:"world", ctx:splatWorldCtx, pxFn:worldPx, x:(TOWN_BOX.xMin+TOWN_BOX.xMax)/2, z:(TOWN_BOX.zMin+TOWN_BOX.zMax)/2 },
      { tier:"world", ctx:splatWorldCtx, pxFn:worldPx, x:TOWN_BOX.xMin+f+20, z:TOWN_BOX.zMin+f+20 },
      { tier:"world", ctx:splatWorldCtx, pxFn:worldPx, x:TOWN_BOX.xMax-f-20, z:TOWN_BOX.zMax-f-20 },
      { tier:"town",  ctx:splatTownCtx,  pxFn:townPx,  x:(CLOSE_BOX.xMin+CLOSE_BOX.xMax)/2, z:(CLOSE_BOX.zMin+CLOSE_BOX.zMax)/2 },
      { tier:"town",  ctx:splatTownCtx,  pxFn:townPx,  x:CLOSE_BOX.xMin+f+20, z:CLOSE_BOX.zMin+f+20 },
      { tier:"town",  ctx:splatTownCtx,  pxFn:townPx,  x:CLOSE_BOX.xMax-f-20, z:CLOSE_BOX.zMax-f-20 }
    ];
    return probes.map(function(p){
      var px = p.pxFn(p.x,p.z);
      var d = p.ctx.getImageData(Math.round(px.x), Math.round(px.y), 1, 1).data;
      return { tier:p.tier, x:Math.round(p.x), z:Math.round(p.z), alpha:d[3] }; // must all be 0
    });
  },
  get walkers(){ // fix-sprint QA: every rendered figure's position + measured apparent speed (m/s)
    var out=[];
    personMeshSlots.forEach(function(arr){ arr.forEach(function(s){
      if(!s) return;
      out.push({ id:s.id, kind:s.kind, x:+s._x.toFixed(2), z:+s._z.toFixed(2), pose:s._pose, appSpd:+(s._appSpd||0).toFixed(3) });
    }); });
    return out;
  },
  /* s59 QA — movement-naturalism hooks */
  walkBlocked: function(x,z){ return !!walkBlockedAt(x,z,simDay); },
  get walkMask(){ walkMaskInit(); return { obstacles:_walkObstacleCount, buckets:Object.keys(_walkHash).length }; },
  route: function(who,x0,z0,x1,z1){ // node-key signature of one person's route (diversity/rewind QA)
    var mDay=_walkRevealHorizon(simDay);
    var d0=walkExitPoint(x0,z0,mDay), d1=walkExitPoint(x1,z1,mDay);
    var n0=nearestGraphNode(d0?d0.x:x0,d0?d0.z:z0), n1=nearestGraphNode(d1?d1.x:x1,d1?d1.z:z1);
    var p=graphPathWeighted(n0,n1,simDay,who);
    return p ? p.map(function(ni){ return STREET_GRAPH.nodes[ni].key; }).join(">") : null;
  },
  routeDiversity: function(x0,z0,x1,z1,n){ // n same-OD walkers -> distinct route count
    n=n||10; var self=this, sigs=[], seen={}, distinct=0;
    for(var w=0;w<n;w++){ var sg=self.route(w,x0,z0,x1,z1); sigs.push(sg); if(sg!=null && !seen[sg]){ seen[sg]=1; distinct++; } }
    return { distinct:distinct, sigs:sigs };
  },
  walkAudit: function(){ // rendered-figure collision + road-share audit at the CURRENT frame
    var res={ total:0, walkers:0, inFootprint:0, inFootprintIds:[], nearRoad:0, onS2plus:0, spds:[] };
    personMeshSlots.forEach(function(arr){ arr.forEach(function(s){
      if(!s) return;
      res.total++;
      if(s._pose==="walk"){
        res.walkers++;
        if((s._appSpd||0)>0.2) res.spds.push(+(s._appSpd||0).toFixed(3));
        if(walkBlockedAt(s._x, s._z, simDay, 0)){ res.inFootprint++; res.inFootprintIds.push(s.id); } // r=0: strictly inside a footprint
        var ref = nearestStreetSegRef(s._x, s._z, 4);
        if(ref){
          res.nearRoad++;
          var st = roadPieceState(ref.s, s._x, s._z, simDay, ref.vf).st;
          if(st>=2) res.onS2plus++;
        }
      }
    }); });
    res.spds.sort(function(a,b){return a-b;});
    res.medianSpd = res.spds.length ? res.spds[Math.floor(res.spds.length/2)] : null;
    res.roadShare = res.nearRoad ? +(res.onS2plus/res.nearRoad).toFixed(3) : null;
    return res;
  },
  get beat(){ return DIRECTOR.beat ? DIRECTOR.beat.cls+": "+DIRECTOR.beat.headline : null; },
  get tents(){ return { candidates:tentCandidates.length, spawned:spawnedTents.length, meshCount:tentMesh.count }; },
  get ships(){
    var anchored=0, sailing=0, inferred=0;
    var allVisits = provenanceOnly ? shipVisits : shipVisits.concat(fillShipVisits);
    allVisits.forEach(function(v){
      var st = shipDesiredState(v, simDay);
      if(st==="anchored") anchored++;
      else if(st==="sailing_in"||st==="sailing_out") sailing++;
      if(v.arriveInferred && (st==="anchored"||st==="sailing_in"||st==="sailing_out")) inferred++;
    });
    return { anchored:anchored, sailing:sailing, anchoredInferredOnly:inferred };
  },
  get masts(){ return { cap:MAST_CAP, rendered:mastClusterMeshes.reduce(function(a,m){ return a+m.count; },0), byCluster:mastClusterMeshes.map(function(m){ return m.count; }), shipCap:SHIP_CAP, anchorSlots:ANCHOR_SLOTS.length }; },
  get buildings(){
    return { villageSpots:VILLAGE_BUILDING_SPOTS.length, candidates:growthBuildingCandidates.length,
      spawned:spawnedBuildings.length, target:growthTargets(densityAt(simDay)).buildings,
      stages:{ materials:growthMaterialsMesh.count, frame:growthFrameMesh.count, walls:growthWallsMesh.count, done:growthBuildingMesh.count+growthBuildingMesh2.count } };
  },
  get people(){
    return { cap:PEOPLE_CAP, target:peopleTargetCount(simDay,lastKnownAlt), alive:ALL_PEOPLE_SLOTS.length,
      rendered:personMeshes.reduce(function(a,m){return a+m.count;},0), alt:lastKnownAlt };
  },
  _debugMesh: function(name){
    var map = { growthBuildingMesh:growthBuildingMesh, tentMesh:tentMesh, mastClusterMesh:mastClusterMeshes[0],
      growthMaterialsMesh:growthMaterialsMesh, growthFrameMesh:growthFrameMesh, growthWallsMesh:growthWallsMesh,
      personMesh0:personMeshes[0] };
    var m = map[name]; if(!m) return null;
    return { frustumCulled:m.frustumCulled, count:m.count,
      boundingSphere: m.boundingSphere ? {x:m.boundingSphere.center.x,y:m.boundingSphere.center.y,z:m.boundingSphere.center.z,r:m.boundingSphere.radius} : null };
  },
  get plazaCenter(){ return { x:PLAZA_CENTER.x, z:PLAZA_CENTER.z }; },
  get fauna(){
    return { hogs:hogMesh.count, hogTarget:hogTargetCount(simDay), gulls:gullMesh.count,
      gullShipsInRange:(window._gullShips||[]).length, horses:hitchedHorseMesh.count,
      quail:quailMesh.count, muckPatches:HOG_MUCK_PATCHES.length,
      hogPos:HOGS.slice(0,3).map(function(hg){ return {x:Math.round(hg.x), z:Math.round(hg.z)}; }),
      horsePos:(window.HITCHING_RAILS||[]).slice(0,3).map(function(r){ return {x:Math.round(r.x), z:Math.round(r.z)}; }),
      quailSite:QUAIL_SITES.length?{x:Math.round(QUAIL_SITES[0].x), z:Math.round(QUAIL_SITES[0].z)}:null,
      // reconciler tranche 2026-07-10 (GAPS #2/#4)
      cattle:cattleMesh.count, cattleTargets:cattleTargetCounts(simDay),
      pelicans:pelicanMesh.count, herons:heronMesh.count, rats:ratMesh.count, ratTarget:ratTargetCount(simDay),
      cats:catMesh.count, catTarget:catTargetCount(simDay), dogs:dogMesh.count, dogTarget:dogTargetCount(simDay),
      heronSite:HERON_SPOTS.length?{x:Math.round(HERON_SPOTS[0].x), z:Math.round(HERON_SPOTS[0].z)}:null,
      ratAnchors:RAT_ANCHORS.map(function(a){ return {x:Math.round(a.x), z:Math.round(a.z)}; }),
      pelicanPos:(function(){ var p=pointOnPolyline(PELICAN_PATH, clamp(PELICANS.s,0,PELICAN_PATH.total)); return {x:Math.round(p.x), z:Math.round(p.z)}; })(),
      wharf:{x:Math.round(WORKSITE_WHARF.x), z:Math.round(WORKSITE_WHARF.z)} };
  },
  get ranch(){
    return { pastureMission:{x:Math.round(PASTURE_MISSION.x), z:Math.round(PASTURE_MISSION.z)},
      pasturePresidio:{x:Math.round(PASTURE_PRESIDIO.x), z:Math.round(PASTURE_PRESIDIO.z)},
      grazePts:{mission:MISSION_GRAZE_PTS.length, presidio:PRESIDIO_GRAZE_PTS.length},
      workersRouted:(function(){
        var n=0, ids={farmer:1,rancher_ranchero:1,dairyman:1,hunter:1,vaquero_herder:1};
        ALL_PEOPLE_SLOTS.forEach(function(s){ if(s.occ && ids[s.occ.id]) n++; });
        return n;
      })() };
  },
  get mud(){
    return { factor:weatherState.mud, wet:weatherState.wet, puddles:puddleMesh.count,
      puddlesVisible:puddleMesh.visible, planksVisible:mudPlankMesh.visible,
      window:{ start:MUD_WINTER_START, end:MUD_WINTER_END } };
  },
  get clusters(){
    var n=0, anchors={};
    ALL_PEOPLE_SLOTS.forEach(function(s){
      if(s._now && s._now.indexOf("talking at ")===0){ n++; anchors[s._now.slice(11)]=(anchors[s._now.slice(11)]||0)+1; }
    });
    return { talking:n, anchors:anchors, anchorCount:CLUSTER_ANCHORS.length };
  },
  get poseHistogram(){
    var h={}, byKind={routine:{}, extra:{}}, nows={};
    ALL_PEOPLE_SLOTS.forEach(function(s){
      if(simDay<s.notBeforeDay) return;
      h[s._pose]=(h[s._pose]||0)+1;
      byKind[s.kind][s._pose]=(byKind[s.kind][s._pose]||0)+1;
      if(s._pose==="idle"){ var k=(s._now||"").slice(0,26); nows[k]=(nows[k]||0)+1; }
    });
    return { all:h, byKind:byKind, idleNows:nows };
  },
  setHour: function(hFrac){ jumpToDate(Math.floor(simDay)+clamp(hFrac,0,23.9)/24); },
  // SUN-FROM-SIM-CLOCK verification hooks (fix sprint 2026-07-11)
  get hour(){ return (simDay-Math.floor(simDay))*24; },
  get tod(){ return timeOfDay; },
  get nightFactor(){ return nightFactor; },
  get lightBlend(){ return lightBlend; },
  get groundAbstraction(){ return groundAbstraction; },
  get daylight(){ return daylightSpanForDay(simDay); },
  get walkSample(){ // s39 2x-speed verification: positions of currently-walking figures
    var out=[]; for(var i=0;i<ALL_PEOPLE_SLOTS.length&&out.length<12;i++){ var s=ALL_PEOPLE_SLOTS[i]; if(s._pose==="walk"&&s._x!=null&&simDay>=s.notBeforeDay) out.push({id:s.id,x:s._x,z:s._z}); }
    return out;
  },
  get poseCounts(){
    return { walkM:personMeshes[POOL_M].count, walkF:personMeshes[POOL_F].count,
      child:personMeshes[POOL_CHILD].count, seated:personMeshes[POOL_SEATED].count,
      stooped:personMeshes[POOL_STOOPED].count, carrying:personMeshes[POOL_CARRY].count,
      sleepers:streetSleeperMesh.count };
  },
  get wharf(){
    return { tip:window._centralWharfTip, piles:window._cwPileMesh?window._cwPileMesh.count:0,
      boats:wharfBoatMesh.count, lastLen:window._centralWharfLastLen };
  },
  probeTerrain: function(x,z){
    return { h:terrainHeight(x,z), raw:sampleTerrainGrid(x,z), villageY:VILLAGE_Y,
      dOut:distOutsideBox(x,z,VILLAGE_BOX), villageBox:VILLAGE_BOX };
  },
  get storeships(){ return STORESHIP_INFO; },
  shipAudit: function(){ // s22 QA (shoreline truth): every active hull's ground truth — NO hull may sit on dry land (h > the +0.5 high-tide line) at ANY date
    updateShips(0.016); // stalled-rAF CDP tabs never run the frame loop — place hulls synchronously, same code path as rendering
    var res = { date:simDateISO(dateFromSimDay(simDay)), anchored:0, unplaced:0, dry:[], mud:0, water:0 };
    var allVisits = provenanceOnly ? shipVisits : shipVisits.concat(fillShipVisits);
    allVisits.forEach(function(v){
      if(shipDesiredState(v, simDay)!=="anchored") return; // sailing hulls ride bezier paths over open bay
      res.anchored++;
      var p = v.storeship ? v.storeship.pos : v._anchorPos;
      if(!p){ res.unplaced++; return; }
      var h = terrainHeight(p.x, p.z);
      if(h > 0.5) res.dry.push({ ship:v.ship, x:Math.round(p.x), z:Math.round(p.z), h:+h.toFixed(2) });
      else if(h > -0.5) res.mud++;
      else res.water++;
    });
    return res;
  },
  channelAudit: function(step, lat){ // sprint #29 QA: every corridor sample of the ship channel must be honest water
    step = step||25; lat = (lat==null)?65:lat;
    function audit(poly, name){
      var shallow = [], minD = 99;
      for(var s=0; s<=poly.len; s+=step){
        var p = shipPolyAt(poly, s);
        [-lat,0,lat].forEach(function(o){
          var h = terrainHeight(p.x - p.tz*o, p.z + p.tx*o);
          if(-h < minD) minD = -h;
          if(h > -1.5) shallow.push({ path:name, s:Math.round(s), x:Math.round(p.x-p.tz*o), z:Math.round(p.z+p.tx*o), h:+h.toFixed(2) });
        });
      }
      return { name:name, len:Math.round(poly.len), minDepth:+minD.toFixed(2), shallow:shallow };
    }
    return [ audit(SHIP_CHANNEL,"channel"), audit(SHIP_NORTH,"north-exit") ];
  },
  sailAudit: function(){ // sprint #29 QA: sample every currently-sailing hull's FULL composite path — no sample may be dry land
    updateShips(0.016);
    var out = [], allVisits = provenanceOnly ? shipVisits : shipVisits.concat(fillShipVisits);
    allVisits.forEach(function(v){
      if(v._renderMode!=="in" && v._renderMode!=="out") return;
      var arriving = v._renderMode==="in";
      var dry = [], minD = 99;
      for(var t=0; t<=1.0001; t+=0.01){
        var p = shipSailPos(v, t, arriving);
        var h = terrainHeight(p.x, p.z);
        if(-h < minD) minD = -h;
        if(h > 0.5) dry.push({ t:+t.toFixed(2), x:Math.round(p.x), z:Math.round(p.z), h:+h.toFixed(1) });
      }
      out.push({ ship:v.ship, mode:v._renderMode, storeship:!!v.storeship, minDepth:+minD.toFixed(2), dry:dry,
                 pos:{ x:Math.round(v._lastPos?v._lastPos.x:0), z:Math.round(v._lastPos?v._lastPos.z:0) } });
    });
    return out;
  },
  _nav: function(){ // sprint #29 QA: closure internals for screening scripts (read/drive only — not UI)
    return { visits: shipVisits, fill: fillShipVisits, jumpToDate: jumpToDate, updateShips: updateShips,
             terrainHeight: terrainHeight, eventDateToSimDay: eventDateToSimDay, channel: SHIP_CHANNEL, north: SHIP_NORTH, seed: ANCHOR_SEED };
  },
  anchorage: function(){ // sprint #29 QA: raft growth — anchored-hull distances from the prime-anchorage seed
    updateShips(0.016);
    var ds = [], allVisits = provenanceOnly ? shipVisits : shipVisits.concat(fillShipVisits);
    allVisits.forEach(function(v){
      if(shipDesiredState(v, simDay)!=="anchored" || !v._anchorPos || v.storeship) return;
      ds.push(Math.hypot(v._anchorPos.x-ANCHOR_SEED.x, v._anchorPos.z-ANCHOR_SEED.z));
    });
    ds.sort(function(a,b){ return a-b; });
    function within(r){ var n=0; ds.forEach(function(d){ if(d<=r) n++; }); return n; }
    return { date:simDateISO(dateFromSimDay(simDay)), anchored:ds.length, seed:{x:Math.round(ANCHOR_SEED.x), z:Math.round(ANCHOR_SEED.z)},
      within200:within(200), within400:within(400), within600:within(600),
      rMedian:ds.length?Math.round(ds[Math.floor(ds.length*0.5)]):0,
      r90:ds.length?Math.round(ds[Math.floor(ds.length*0.9)]):0,
      rMax:ds.length?Math.round(ds[ds.length-1]):0 };
  },
  get geoDebug(){
    return { streetsV:GEO.streetsV, streetsU:GEO.streetsU,
      pacificW:gridToWorld(0,GEO.streetsV.pacific), californiaW:gridToWorld(0,GEO.streetsV.california),
      clayW:gridToWorld(0,GEO.streetsV.clay), washingtonW:gridToWorld(0,GEO.streetsV.washington),
      zNorthHeadland:GEO.zNorthHeadland, zSouthHeadland:GEO.zSouthHeadland };
  },
  get firstPerson(){
    for(var i=0;i<ALL_PEOPLE_SLOTS.length;i++){
      var s = ALL_PEOPLE_SLOTS[i];
      if(s._x!=null && simDay>=s.notBeforeDay && (s.notAfterDay==null||simDay<=s.notAfterDay)) return { x:s._x, z:s._z, variant:s.variant, pose:s._pose };
    }
    return null;
  },
  _setFrustumCulled: function(name, val){
    var map = { growthBuildingMesh:growthBuildingMesh, tentMesh:tentMesh, mastClusterMesh:mastClusterMeshes[0],
      growthMaterialsMesh:growthMaterialsMesh, growthFrameMesh:growthFrameMesh, growthWallsMesh:growthWallsMesh,
      personMesh0:personMeshes[0] };
    var m = map[name]; if(m) m.frustumCulled = val;
  }
};


/* ---- CONSOLIDATED AUDIT REGISTRY (Great Split, 2026-07-12; layers-spec.md
   rules block). __P1850.audits.<layer>.<name>() -> { pass:bool, ...detail }.
   Layers registered lazily via registerAudit() (core/00-boot.js) from their
   own files. runAll() executes the whole suite and returns the screening-
   ready pass/fail summary — screenings run it wholesale; a failing audit
   fails the landing. ---- */
window.__P1850.audits = (function(){
  var ns = {};
  Object.keys(__P1850_AUDITS).forEach(function(layer){ ns[layer] = __P1850_AUDITS[layer]; });
  ns.runAll = function(){
    var t0 = performance.now(), results = [], pass = true;
    Object.keys(__P1850_AUDITS).sort().forEach(function(layer){
      Object.keys(__P1850_AUDITS[layer]).sort().forEach(function(name){
        var r, tA = performance.now();
        try { r = __P1850_AUDITS[layer][name](); }
        catch(e){ r = { pass:false, error: String(e && e.message || e) }; }
        var entry = { layer: layer, audit: name, pass: !!(r && r.pass),
                      ms: +(performance.now()-tA).toFixed(1) };
        if(r && r.skipped) entry.skipped = r.skipped;
        entry.detail = r;
        if(!entry.pass) pass = false;
        results.push(entry);
      });
    });
    return { pass: pass, date: simDateISO(dateFromSimDay(simDay)),
             ran: results.length, failed: results.filter(function(x){ return !x.pass; }).length,
             ms: +(performance.now()-t0).toFixed(1), results: results };
  };
  return ns;
})();
