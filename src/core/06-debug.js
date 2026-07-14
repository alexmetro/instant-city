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
  get layerVis(){ return Object.keys(__P1850_LAYER_VIS); }, // dev-tooling interface (layers-spec.md §15): registered per-layer visibility toggles
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
      stages:{ materials:growthMaterialsMesh.count, frame:growthFrameMesh.count, walls:growthWallsMesh.count,
        done:growthBuildingMesh.count+growthBuildingMesh2.count+growthCommercialMesh.count+ironHouseMesh.count,
        houses:growthBuildingMesh.count+growthBuildingMesh2.count, commercial:growthCommercialMesh.count, iron:ironHouseMesh.count } };
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
  /* s80a THE GROUND PLAN cadastre (core/08-cadastre): the dated blocks/plat-
     lots/parcels system beside the spine. `at` is the one query every future
     admission consumes; the accessors + stats support screening and the
     Atelier overlay. */
  groundPlan: {
    at: function(x,z,day){ return groundPlanAt(x,z,day==null?simDay:day); },
    lotById: function(id){ return lotById(id); },
    blocksAt: function(day){ return blocksAt(day==null?simDay:day).map(function(b){ return b.key; }); },
    parcelByName: function(n){ return parcelByName(n); },
    band: function(x,z){ return groundPlanBand(x,z); },
    get stats(){ return groundPlanStats(); },
    get blocks(){ return GROUND_PLAN.blocks; },
    get lots(){ return GROUND_PLAN.lots; },
    get parcels(){ return GROUND_PARCELS; }
  },
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

/* =========================================================================
   s67 (#49) UNIVERSAL PLACEMENT AUDITS (placement-spec.md P1–P14).
   Core-owned (layers-spec rules block: "placement — cross-layer, core-owned").
   Every audit is FRAMING-INDEPENDENT: it walks world data / fixed probes, not
   the camera, so it holds at any date and any view. Registered under
   __P1850.audits.placement.* — the late-attach in registerAudit() (00-boot)
   surfaces this layer even though it registers after chunk 70's snapshot.
   A failing audit fails the landing.
   ========================================================================= */
(function registerPlacementAudits(){
  function rectCorners(x,z,rot,hw,hd){
    var c=Math.cos(rot||0), s=Math.sin(rot||0);
    return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(function(o){
      return { x:x+o[0]*c-o[1]*s, z:z+o[0]*s+o[1]*c };
    });
  }
  /* oriented-box overlap via SAT; returns minimum penetration depth (m), or 0
     if the rects are separated. 0.05m slack so an exact party wall (shared
     edge, P1's permitted mechanism) does not read as an intersection. */
  function rectPenetration(A,B){
    var polys=[A,B], best=1e9, i, p;
    for(p=0;p<2;p++){ var poly=polys[p];
      for(i=0;i<4;i++){ var a=poly[i], b=poly[(i+1)%4];
        var ax=-(b.z-a.z), az=(b.x-a.x), l=Math.hypot(ax,az)||1; ax/=l; az/=l;
        var minA=1e9,maxA=-1e9,minB=1e9,maxB=-1e9, k;
        for(k=0;k<4;k++){ var dA=A[k].x*ax+A[k].z*az; if(dA<minA)minA=dA; if(dA>maxA)maxA=dA;
                          var dB=B[k].x*ax+B[k].z*az; if(dB<minB)minB=dB; if(dB>maxB)maxB=dB; }
        var ov = Math.min(maxA,maxB) - Math.max(minA,minB);
        if(ov <= 0.05) return 0;             // separating axis found → no real overlap
        if(ov < best) best = ov;
      }
    }
    return best;
  }
  function angNorm(a){ while(a>Math.PI) a-=2*Math.PI; while(a<-Math.PI) a+=2*Math.PI; return a; }
  function pass(o){ o.pass = (o.violations===0); return o; }
  var DEG = 180/Math.PI;

  /* ---- P1: no intersecting footprints (party walls permitted).
     GATE (this engine sprint): no ENGINE-GOVERNED placement — a growth building
     or a tent, both routed through canPlace()+registerPlacement — overlaps an
     authored building or another procedural placement. That is exactly what the
     engine enforces at spawn; the audit proves it.
     REPORTED, non-gating: authored-vs-authored overlaps among the hand-placed
     documented village (the plaza's period-true commercial density). Those
     historical positions are deliberately placed OUTSIDE canPlace (documented
     bypass) and their reconciliation is #51's frontage-assembly scope, not this
     core engine sprint — surfaced here so #51 has the data, never hidden. ---- */
  registerAudit("placement", "footprints", function(){
    var B = VILLAGE_BUILDING_SPOTS, authored=[], i, j;
    function rectOf(o){ return rectCorners(o.x,o.z,o.rot||0,(o.w||4)/2,(o.d||4)/2); }
    for(i=0;i<B.length;i++){ var a=B[i]; if(a.w==null) continue;
      var ca=rectOf(a), ra=Math.hypot(a.w,a.d)/2;
      for(j=i+1;j<B.length;j++){ var b=B[j]; if(b.w==null) continue;
        var dx=a.x-b.x, dz=a.z-b.z, rb=Math.hypot(b.w,b.d)/2;
        if(dx*dx+dz*dz > (ra+rb)*(ra+rb)) continue;
        // s76: the documented Dec-1849 fire-block row is an authored continuous
        // block (Alta's establishments in order) — its dense packing is the
        // record, reported not gated (mirrors footprintsOBB's carve-out). Its
        // buildings now face their streets via the single orientation source,
        // which varies yaw at the block corners; that is authored, not a defect.
        if(a.fireBlock && b.fireBlock) continue;
        var pen=rectPenetration(ca, rectOf(b));
        if(pen>1.0 && Math.abs(angNorm((a.rot||0)-(b.rot||0)))>15/DEG)
          authored.push({ i:i, j:j, pen:+pen.toFixed(2), x:Math.round(a.x), z:Math.round(a.z) });
      }
    }
    // engine-governed placements: growth candidates + tents, each vs every
    // authored footprint (overlap here would be a real canPlace failure)
    var proc=[], viol=[];
    growthBuildingCandidates.forEach(function(c){ proc.push({x:c.x,z:c.z,r:4}); });
    tentCandidates.forEach(function(t){ proc.push({x:t.x,z:t.z,r:2.2}); });
    for(i=0;i<proc.length;i++){ var p=proc[i];
      for(j=0;j<B.length;j++){ var b2=B[j]; if(b2.w==null) continue;
        var ddx=p.x-b2.x, ddz=p.z-b2.z, br=Math.hypot(b2.w,b2.d)/2;
        if(ddx*ddx+ddz*ddz > (p.r+br)*(p.r+br)) continue;
        // circle centre vs oriented rect (inflated by the circle radius)
        var c=Math.cos(b2.rot||0), s=Math.sin(b2.rot||0), lx=Math.abs(ddx*c+ddz*s), lz=Math.abs(-ddx*s+ddz*c);
        if(lx < (b2.w||4)/2 + p.r*0.5 && lz < (b2.d||4)/2 + p.r*0.5){ viol.push({ px:Math.round(p.x), pz:Math.round(p.z), bldg:j }); break; }
      }
    }
    // s72 (#51) FULL GATING: P4's frontage assembly reaches full strength here,
    // so this audit now gates EVERYTHING — engine-governed placements AND the
    // hand-authored village (the 11 pre-existing authored overlaps were the
    // fire-block interior fill landing on the named row; s72 de-overlaps it).
    // A documented party wall (exact shared edge / same yaw, angle diff ≤15°)
    // is NOT an overlap here (rectPenetration's angle guard) — it is P1's
    // permitted mechanism, which the commercial rows use by design.
    return { pass: viol.length===0 && authored.length===0, law:"P1", engineChecked:proc.length, engineViolations:viol.length,
             authoredOverlaps:authored.length, gated:"engine+authored",
             engineList:viol.slice(0,10), authoredList:authored.slice(0,20) };
  });

  /* ---- P2: structures stand on the ground (nearest corner gap ≤0.3m; a
     downhill corner may run higher — the foundation-skirt system closes it —
     but a whole footprint floating >0.3m is broken) ---- */
  registerAudit("placement", "grounding", function(){
    var B=VILLAGE_BUILDING_SPOTS, bad=[], i;
    for(i=0;i<B.length;i++){
      var a=B[i]; if(a.w==null||a.y==null) continue;
      var cs=rectCorners(a.x,a.z,a.rot||0,(a.w||4)/2,(a.d||4)/2), minGap=1e9, k;
      for(k=0;k<4;k++){ var g=a.y-terrainHeight(cs[k].x,cs[k].z); if(g<minGap) minGap=g; }
      if(minGap > 0.3) bad.push({ i:i, minGap:+minGap.toFixed(2), x:Math.round(a.x), z:Math.round(a.z), name:a.name||null });
    }
    return pass({ law:"P2", checked:B.length, violations:bad.length, list:bad.slice(0,20) });
  });

  /* ---- P3: intertidal band belongs to the water trades (no tent/structure
     may stand east of the traced shoreline below the high-water line) ---- */
  registerAudit("placement", "intertidal", function(){
    var bad=[], i;
    for(i=0;i<VILLAGE_BUILDING_SPOTS.length;i++){ var a=VILLAGE_BUILDING_SPOTS[i];
      if(inIntertidalBand(a.x,a.z)) bad.push({ kind:"structure", i:i, x:Math.round(a.x), z:Math.round(a.z) }); }
    for(i=0;i<tentCandidates.length;i++){ var t=tentCandidates[i];
      if(inIntertidalBand(t.x,t.z)) bad.push({ kind:"tent", i:i, x:Math.round(t.x), z:Math.round(t.z) }); }
    return pass({ law:"P3", checked:VILLAGE_BUILDING_SPOTS.length+tentCandidates.length, violations:bad.length, list:bad.slice(0,20) });
  });

  /* ---- P4 (invariant floor): addressed structures connect — every platted
     town structure fronts a road or carries a door-path ≤25m. (Full frontage
     assembly is #51; this enforces the floor only.) ---- */
  registerAudit("placement", "addressed", function(){
    function distToNearestStreet(x,z){
      var best=1e9;
      for(var s=0;s<PLACEMENT_STREET_SEGS.length;s++){ var g=PLACEMENT_STREET_SEGS[s];
        var d=distToSegXZ(x,z,g.x0,g.z0,g.x1,g.z1)-g.halfW; if(d<best) best=d; }
      return best;
    }
    function doorDist(o){ var fd=(o.d||4)*0.5+0.3; return distToNearestStreet(o.x+Math.sin(o.rot||0)*fd, o.z+Math.cos(o.rot||0)*fd); }
    // s72 (#51) FULL STRENGTH: P4's frontage clause now gates at the strict
    // ≤25m door-path for EVERY addressed structure — the lot system fronts all
    // growth stock (commercial party-wall rows + residential frontage lots) and
    // the village/chapel were re-fronted (frontify). Mid-block orphan spawning
    // for addressed classes has ended. Period-loose exempt classes (road-master
    // §5): outlying squatters (growth >260m from the plaza) and the deliberately
    // unaddressed founding-village huts past the surveyed edge.
    var FRONT=25, viol=[], B=VILLAGE_BUILDING_SPOTS, i;
    function consider(kind, x, z, dist, name){
      if(dist>FRONT) viol.push({ kind:kind, x:Math.round(x), z:Math.round(z), d:+dist.toFixed(1), name:name||null });
    }
    var authoredChecked=0;
    for(i=0;i<B.length;i++){ var a=B[i]; if(a.w==null) continue;
      // deliberately-unaddressed founding-village squatter huts past the
      // surveyed edge stay period-loose (§5) — only the platted core is gated.
      if(Math.hypot(a.x-PLAZA_CENTER.x, a.z-PLAZA_CENTER.z) > 300 && !a.name) continue;
      authoredChecked++; consider("authored", a.x, a.z, doorDist(a), a.name);
    }
    var engineChecked=0;
    growthBuildingCandidates.forEach(function(c){
      if(Math.hypot(c.x-PLAZA_CENTER.x, c.z-PLAZA_CENTER.z) > 260) return; // outlying squatter cottages exempt (§5)
      engineChecked++; consider("growth", c.x, c.z, distToNearestStreet(c.x,c.z));
    });
    return { pass: viol.length===0, law:"P4", gate:"front(≤"+FRONT+"m door-path)",
             authoredChecked:authoredChecked, engineChecked:engineChecked,
             violations:viol.length, gated:"authored+engine", list:viol.slice(0,20) };
  });

  /* ---- P5: signs live on walls (vertical plane, normal ⊥ any roof, below
     the fronted building's roofline — never on a roof plane) ---- */
  registerAudit("placement", "signs", function(){
    var S=PLACEMENT_SIGNS, bad=[], i;
    for(i=0;i<S.length;i++){ var s=S[i];
      // P5's invariant is ORIENTATION: a sign on a wall plane is VERTICAL — its
      // normal is horizontal, ⊥ any roof plane. A sign lying on a roof would
      // carry pitch/roll (rotX/rotZ). roofY is a coarse estimate (spot.h can be
      // absent → default 3m), so height only fails a sign FLOATING well clear
      // above the building (>1.5m over the estimated eave), never a wall sign
      // mounted high on a taller-than-estimated façade.
      var tilted = Math.abs(angNorm(s.rotX))>5/DEG || Math.abs(angNorm(s.rotZ))>5/DEG; // lying toward a roof plane
      var floatingAbove = s.y > s.roofY + 1.5;
      if(tilted || floatingAbove) bad.push({ i:i, rotX:+s.rotX.toFixed(3), rotZ:+s.rotZ.toFixed(3), y:+s.y.toFixed(2), roofY:+s.roofY.toFixed(2) });
    }
    return pass({ law:"P5", checked:S.length, violations:bad.length, list:bad.slice(0,20) });
  });

  /* ---- P7: tent physical floor — slope ≤12%, never ROW/intertidal/footprint,
     spacing ≥2.5m from any other tent ---- */
  registerAudit("placement", "tents", function(){
    var T=tentCandidates, bad=[], i, j;
    for(i=0;i<T.length;i++){ var t=T[i], why=[];
      if(terrainSlopePct(t.x,t.z) > 12) why.push("slope");
      if(nearAnyRoad(t.x,t.z,0)) why.push("row");
      if(inIntertidalBand(t.x,t.z)) why.push("intertidal");
      var nn=1e9;
      for(j=0;j<T.length;j++){ if(j===i) continue; var dx=t.x-T[j].x, dz=t.z-T[j].z, d2=dx*dx+dz*dz; if(d2<nn) nn=d2; }
      if(Math.sqrt(nn) < 2.5) why.push("spacing");
      if(why.length) bad.push({ i:i, why:why, x:Math.round(t.x), z:Math.round(t.z) });
    }
    return pass({ law:"P7", checked:T.length, violations:bad.length, list:bad.slice(0,20) });
  });

  /* ---- P6 (#55): fences follow ground and lot logic. Walks the yard-fence
     runs recorded by the buildings-layer builder (FENCE_SEGS / FENCE_POSTS):
       • post grounding — every post base within 0.15m of terrain (the headline
         fix: no floating rails, no buried panels on slopes);
       • fence-ROW = 0 — no run crosses a right-of-way (the f13-90m offense);
       • fence-fence = 0 — no run crosses another building's run;
       • fence-footprint = 0 — no run crosses a building footprint (parent
         excluded — a fence rings its own yard by design);
       • parallelism — every segment runs parallel to its lot's own axes.
     Framing-independent: the runs are static (built once at load), so this
     holds at every sim date. ---- */
  registerAudit("placement", "fences", function(){
    var SEG = (typeof FENCE_SEGS!=="undefined") ? FENCE_SEGS : [];
    var POST = (typeof FENCE_POSTS!=="undefined") ? FENCE_POSTS : [];
    if(!SEG.length && !POST.length) return { pass:true, law:"P6", skipped:"no yard fences built" };
    function ccw(ax,az,bx,bz,cx,cz){ return (cz-az)*(bx-ax) > (bz-az)*(cx-ax); }
    function segsCross(ax,az,bx,bz,cx,cz,dx,dz){
      return (ccw(ax,az,cx,cz,dx,dz)!==ccw(bx,bz,cx,cz,dx,dz)) && (ccw(ax,az,bx,bz,cx,cz)!==ccw(ax,az,bx,bz,dx,dz));
    }
    function ptInRect(px,pz,b){ var s=Math.sin(b.rot||0), c=Math.cos(b.rot||0), dx=px-b.x, dz=pz-b.z;
      return Math.abs(dx*c+dz*s) <= (b.w||4)/2 && Math.abs(-dx*s+dz*c) <= (b.d||4)/2; }
    function segHitsRect(x0,z0,x1,z1,b){
      if(ptInRect(x0,z0,b)||ptInRect(x1,z1,b)) return true;
      var s=Math.sin(b.rot||0), c=Math.cos(b.rot||0), hw=(b.w||4)/2, hd=(b.d||4)/2;
      function cr(lx,lz){ return { x:b.x+lx*c-lz*s, z:b.z+lx*s+lz*c }; }
      var C=[cr(-hw,-hd),cr(hw,-hd),cr(hw,hd),cr(-hw,hd)];
      for(var e=0;e<4;e++){ var p=C[e], q=C[(e+1)%4]; if(segsCross(x0,z0,x1,z1,p.x,p.z,q.x,q.z)) return true; }
      return false;
    }
    function angMod90(a){ a=((a%(Math.PI/2))+Math.PI/2)%(Math.PI/2); if(a>Math.PI/4) a-=Math.PI/2; return a; }
    // post grounding
    var maxGap=0, groundBad=0, i, j;
    for(i=0;i<POST.length;i++){ var p=POST[i], g=Math.abs(p.y - terrainHeight(p.x,p.z));
      if(g>maxGap) maxGap=g; if(g>0.15) groundBad++; }
    // fence-ROW, parallelism (per segment); fence-footprint (per segment vs other bldgs)
    var rowHits=0, footHits=0, paraBad=0, bad=[];
    for(i=0;i<SEG.length;i++){ var s2=SEG[i];
      var mx=(s2.x0+s2.x1)/2, mz=(s2.z0+s2.z1)/2;
      if(nearAnyRoad(s2.x0,s2.z0,0)||nearAnyRoad(s2.x1,s2.z1,0)||nearAnyRoad(mx,mz,0)){ rowHits++; bad.push({why:"row",x:Math.round(mx),z:Math.round(mz)}); }
      var segAng=Math.atan2(s2.z1-s2.z0, s2.x1-s2.x0);
      if(Math.abs(angMod90(segAng+s2.yaw))*DEG > 3){ paraBad++; bad.push({why:"parallel",x:Math.round(mx),z:Math.round(mz)}); }
      for(j=0;j<VILLAGE_BUILDING_SPOTS.length;j++){ if(j===s2.spot) continue; var bb=VILLAGE_BUILDING_SPOTS[j]; if(bb.w==null) continue;
        var dx=mx-bb.x, dz=mz-bb.z, br=Math.hypot(bb.w,bb.d)/2+4; if(dx*dx+dz*dz>br*br) continue;
        if(segHitsRect(s2.x0,s2.z0,s2.x1,s2.z1,bb)){ footHits++; bad.push({why:"footprint",x:Math.round(mx),z:Math.round(mz)}); break; } }
    }
    // fence-fence (pairs from different lots)
    var fenceHits=0;
    for(i=0;i<SEG.length;i++){ var A=SEG[i];
      for(j=i+1;j<SEG.length;j++){ var B=SEG[j]; if(A.spot===B.spot) continue;
        var dxc=(A.x0-B.x0), dzc=(A.z0-B.z0); if(dxc*dxc+dzc*dzc>900) continue; // broadphase ~30m
        if(segsCross(A.x0,A.z0,A.x1,A.z1, B.x0,B.z0,B.x1,B.z1)){ fenceHits++; bad.push({why:"fence-fence",x:Math.round((A.x0+A.x1)/2),z:Math.round((A.z0+A.z1)/2)}); } }
    }
    var violations = groundBad+rowHits+footHits+fenceHits+paraBad;
    return { pass: violations===0, law:"P6", posts:POST.length, segments:SEG.length,
             postMaxGapM:+maxGap.toFixed(3), groundViolations:groundBad, rowHits:rowHits,
             fenceFenceHits:fenceHits, footprintHits:footHits, parallelViolations:paraBad,
             list:bad.slice(0,20) };
  });

  /* ---- P8: scatter respects the world — no build-time static prop on water
     or in the road centre band (the camera-centred doodad ring is separately
     guaranteed by its walkBlockedAt keep-out oracle, updateFarScatter). ---- */
  registerAudit("placement", "scatter", function(){
    var P=PLACEMENT_STATIC_PROPS, bad=[], i;
    for(i=0;i<P.length;i++){ var p=P[i];
      if(terrainHeight(p.x,p.z) <= 0.2) bad.push({ i:i, why:"water", cls:p.cls, x:Math.round(p.x), z:Math.round(p.z) });
      else if(nearAnyRoad(p.x,p.z,0)) bad.push({ i:i, why:"row-center", cls:p.cls, x:Math.round(p.x), z:Math.round(p.z) });
    }
    return pass({ law:"P8", checked:P.length, violations:bad.length, note:"live ring gated by walkBlockedAt", list:bad.slice(0,20) });
  });

  /* ---- P9: props never violate volumes — no static prop centre falls inside
     a building footprint (the Mission roof-crate class of offense) ---- */
  registerAudit("placement", "props", function(){
    var P=PLACEMENT_STATIC_PROPS, B=VILLAGE_BUILDING_SPOTS, bad=[], i, j;
    for(i=0;i<P.length;i++){ var p=P[i];
      for(j=0;j<B.length;j++){ var b=B[j]; if(b.w==null) continue;
        var dx=p.x-b.x, dz=p.z-b.z, rb=Math.hypot(b.w,b.d)/2+p.r;
        if(dx*dx+dz*dz > rb*rb) continue;                 // broadphase
        // exact test: prop centre inside the oriented footprint rect
        var c=Math.cos(b.rot||0), s=Math.sin(b.rot||0), lx=dx*c+dz*s, lz=-dx*s+dz*c;
        if(Math.abs(lx) < (b.w||4)/2 && Math.abs(lz) < (b.d||4)/2){ bad.push({ i:i, cls:p.cls, x:Math.round(p.x), z:Math.round(p.z), bldg:j }); break; }
      }
    }
    return pass({ law:"P9", checked:P.length, violations:bad.length, list:bad.slice(0,20) });
  });

  /* ---- P10: trees clear and belong — every tree crown clears every town
     footprint by ≥1m (trees also sit ≥190m off the platted village by
     clearOfManMade(), which this proves) ---- */
  registerAudit("placement", "trees", function(){
    var T=PLACEMENT_TREES, B=VILLAGE_BUILDING_SPOTS, bad=[], i, j, minClear=1e9;
    for(i=0;i<T.length;i++){ var t=T[i];
      for(j=0;j<B.length;j++){ var b=B[j]; if(b.w==null) continue;
        var dx=t.x-b.x, dz=t.z-b.z, br=Math.hypot(b.w,b.d)/2;
        if(dx*dx+dz*dz > (br+t.cr+40)*(br+t.cr+40)) continue;   // broadphase
        // distance from tree centre to the footprint rect, minus crown
        var c=Math.cos(b.rot||0), s=Math.sin(b.rot||0), lx=Math.abs(dx*c+dz*s)-(b.w||4)/2, lz=Math.abs(-dx*s+dz*c)-(b.d||4)/2;
        var dRect = Math.hypot(Math.max(lx,0), Math.max(lz,0));
        var clear = dRect - t.cr;
        if(clear < minClear) minClear = clear;
        if(clear < 1.0) bad.push({ i:i, sp:t.sp, clear:+clear.toFixed(2), x:Math.round(t.x), z:Math.round(t.z) });
      }
    }
    return pass({ law:"P10", checked:T.length, violations:bad.length, minClearM:(minClear===1e9?null:+minClear.toFixed(1)), list:bad.slice(0,20) });
  });

  /* ---- ships helpers: the set of hulls present (anchored + grounded
     storeships) at the current date, with true-scale footprints ---- */
  function presentHulls(){
    var out=[], allVisits = provenanceOnly ? shipVisits : shipVisits.concat(fillShipVisits);
    allVisits.forEach(function(v){
      var st = shipDesiredState(v, simDay);
      if(st!=="anchored") return;                 // sailing hulls ride open water
      var pos = v.storeship ? v.storeship.pos : v._anchorPos;
      if(!pos) return;
      var dims = SHIP_DIMS[v.shipType] || SHIP_DIMS[0];
      out.push({ ship:v.ship, storeship:!!v.storeship, x:pos.x, z:pos.z, yaw:v._anchorYaw, hl:dims.hl, hb:dims.hb });
    });
    return out;
  }

  /* ---- P13: the anchorage rides one tide — heading spread ≤30° total ---- */
  registerAudit("placement", "anchorageHeading", function(){
    var H=presentHulls().filter(function(h){ return !h.storeship; });
    if(H.length<2) return { pass:true, law:"P13", skipped:"fewer than 2 anchored ships", anchored:H.length };
    // total angular spread = max−min of each heading's signed deviation from the
    // circular mean (the true range the fleet occupies; NOT 2×maxDev, which
    // overstates an asymmetric sample of a few ships).
    var sx=0, sz=0;
    H.forEach(function(h){ sx+=Math.cos(h.yaw); sz+=Math.sin(h.yaw); });
    var mean=Math.atan2(sz,sx), lo=1e9, hi=-1e9;
    H.forEach(function(h){ var d=angNorm(h.yaw-mean); if(d<lo)lo=d; if(d>hi)hi=d; });
    var spreadDeg = (hi-lo)*DEG;
    return { pass: spreadDeg <= 30.5, law:"P13", anchored:H.length, spreadDeg:+spreadDeg.toFixed(1), meanDeg:+(mean*DEG).toFixed(1) };
  });

  /* ---- P13: no two anchored hulls overlap ---- */
  registerAudit("placement", "hullOverlap", function(){
    var H=presentHulls().filter(function(h){ return !h.storeship; }), bad=[], i, j;
    for(i=0;i<H.length;i++){ var a=H[i], sa=hullSeg(a.x,a.z,a.yaw,a.hl);
      for(j=i+1;j<H.length;j++){ var b=H[j];
        var dx=a.x-b.x, dz=a.z-b.z; if(dx*dx+dz*dz > 120*120) continue;   // broadphase
        var sb=hullSeg(b.x,b.z,b.yaw,b.hl), need=a.hb+b.hb;
        if(segSegDistSq(sa[0],sa[1],sa[2],sa[3], sb[0],sb[1],sb[2],sb[3]) < need*need)
          bad.push({ a:a.ship, b:b.ship, x:Math.round(a.x), z:Math.round(a.z) });
      }
    }
    return pass({ law:"P13", anchored:H.length, violations:bad.length, list:bad.slice(0,20) });
  });

  /* ---- P13: storeships only in the mud band ---- */
  registerAudit("placement", "storeshipMud", function(){
    var bad=[], keys=Object.keys(STORESHIP_INFO);
    keys.forEach(function(k){ var p=STORESHIP_INFO[k].pos, h=terrainHeight(p.x,p.z);
      if(h < -1.5 || h > 0.8) bad.push({ ship:k, h:+h.toFixed(2), x:Math.round(p.x), z:Math.round(p.z) }); });
    return pass({ law:"P13", checked:keys.length, violations:bad.length, list:bad });
  });

  /* ---- P11: the wharf is continuous (single grown deck, meets the shore, no
     orphan fragments) ---- */
  registerAudit("placement", "wharfContinuity", function(){
    var tip = window._centralWharfTip;
    if(!tip) return { pass:true, law:"P11", skipped:"Central Wharf not yet built at this date" };
    var shoreX = tip.x - tip.len, hShore = terrainHeight(shoreX, tip.z);
    var bad=[];
    if(tip.len < 6) bad.push("deck shorter than one bay");
    if(hShore < -1.2) bad.push("shore end floats in deep water (h="+hShore.toFixed(2)+")");
    var piles = window._cwPileMesh ? window._cwPileMesh.count : 0;
    if(piles < 1) bad.push("no piles");
    return pass({ law:"P11", lenM:Math.round(tip.len), shoreEndH:+hShore.toFixed(2), piles:piles, violations:bad.length, list:bad });
  });

  /* ---- P12: moored/present vessels never cross the wharf deck ---- */
  registerAudit("placement", "moorings", function(){
    var tip = window._centralWharfTip;
    if(!tip) return { pass:true, law:"P12", skipped:"Central Wharf not yet built at this date" };
    var x0=tip.x-tip.len, x1=tip.x, halfW=tip.deckW/2, bad=[];
    presentHulls().forEach(function(h){
      var seg=hullSeg(h.x,h.z,h.yaw,h.hl);
      // sample the hull segment; any sample within the deck rect = hull∩deck
      for(var t=0;t<=1;t+=0.1){
        var sx=seg[0]+(seg[2]-seg[0])*t, sz=seg[1]+(seg[3]-seg[1])*t;
        if(sx>=x0-1 && sx<=x1+1 && Math.abs(sz-tip.z) < halfW+0.5){ bad.push({ ship:h.ship, x:Math.round(h.x), z:Math.round(h.z) }); break; }
      }
    });
    return pass({ law:"P12", checked:presentHulls().length, violations:bad.length, list:bad.slice(0,20) });
  });

  /* ---- P14: animals keep to their ground — cattle graze points sit in the
     pasture (≥70% floor), off every ROW and footprint ---- */
  registerAudit("placement", "fauna", function(){
    var groups=[{pts:MISSION_GRAZE_PTS, c:PASTURE_MISSION, r:90}, {pts:PRESIDIO_GRAZE_PTS, c:PASTURE_PRESIDIO, r:55}];
    var total=0, inPasture=0, rowHits=0, footHits=0, bad=[];
    groups.forEach(function(g){
      g.pts.forEach(function(p){
        total++;
        if(Math.hypot(p.x-g.c.x, p.z-g.c.z) <= g.r*1.2) inPasture++;
        if(nearAnyRoad(p.x,p.z,0)){ rowHits++; bad.push({ why:"row", x:Math.round(p.x), z:Math.round(p.z) }); }
        for(var j=0;j<VILLAGE_BUILDING_SPOTS.length;j++){ var b=VILLAGE_BUILDING_SPOTS[j]; if(b.w==null) continue;
          var dx=p.x-b.x, dz=p.z-b.z, rb=Math.hypot(b.w,b.d)/2;
          if(dx*dx+dz*dz < rb*rb){ footHits++; bad.push({ why:"footprint", x:Math.round(p.x), z:Math.round(p.z) }); break; } }
      });
    });
    var ratio = total? inPasture/total : 1;
    return { pass: (ratio>=0.7 && rowHits===0 && footHits===0), law:"P14",
             grazePoints:total, pastureRatio:+ratio.toFixed(2), rowHits:rowHits, footHits:footHits, list:bad.slice(0,20) };
  });

  /* =======================================================================
     s76 BUILDING SPAWN v2 ACCEPTANCE AUDITS (building-spawn-spec.md §2).
     Built BEFORE the v2 spawner and captured FAILING on the current build —
     the fail record IS the acceptance evidence for the three Director defect
     frames (wrong facing everywhere; the June-1847 party-wall strip; the
     wall-to-wall perimeter ramparts). Each is framing-independent (walks world
     data at the current simDay), registered under placement.* like the P-suite.
     ======================================================================= */

  var SPAWN_UNLOCK_DAY = eventDateToSimDay("1849-06-01");  // party-wall boom-core unlock (§1.5, tunable)

  /* nearest street centerline info for a point: distance to the centerline,
     the foot of the perpendicular, and the unit normal pointing FROM the
     centerline TOWARD the point (the frontage-facing direction a building on
     that lot must present its door along). */
  function nearestStreetInfo(x,z){
    var best={ d:1e9, fx:x, fz:z, nx:0, nz:1, halfW:0 };
    for(var s=0;s<PLACEMENT_STREET_SEGS.length;s++){ var g=PLACEMENT_STREET_SEGS[s];
      var dx=g.x1-g.x0, dz=g.z1-g.z0, l2=dx*dx+dz*dz;
      var t=l2>0?clamp(((x-g.x0)*dx+(z-g.z0)*dz)/l2,0,1):0;
      var fx=g.x0+dx*t, fz=g.z0+dz*t, d=Math.hypot(x-fx,z-fz);
      if(d<best.d){ var inv=d>1e-4?1/d:0; best={ d:d, fx:fx, fz:fz, nx:(x-fx)*inv, nz:(z-fz)*inv, halfW:g.halfW }; }
    }
    return best;
  }
  /* the world-space list of addressed structures at the CURRENT date: the
     platted village/landmarks (VILLAGE_BUILDING_SPOTS with a real footprint,
     excluding the deliberately-unaddressed squatter huts >300m out) PLUS the
     growth candidates that have actually revealed (spawnedBuildings joins to
     growthBuildingCandidates by index). Each carries {x,z,rot,w,d,commercial,
     edgeKey,perp} where known. */
  function addressedBuilt(){
    var out=[], i;
    for(i=0;i<VILLAGE_BUILDING_SPOTS.length;i++){ var a=VILLAGE_BUILDING_SPOTS[i];
      if(a.w==null) continue;
      if(a.foundedDay!=null && simDay < a.foundedDay) continue; // not yet built (era-gated) — not present to audit
      if(a.unaddressed) continue;                               // §5: deliberately-unaddressed squatter huts
      if(Math.hypot(a.x-PLAZA_CENTER.x,a.z-PLAZA_CENTER.z)>300 && !a.name) continue; // §5 exempt outliers
      out.push({ x:a.x, z:a.z, rot:a.rot||0, w:a.w, d:a.d, commercial:false, src:"village", fireBlock:!!a.fireBlock, edgeKey:null });
    }
    var nBuilt = (typeof spawnedBuildings!=="undefined") ? spawnedBuildings.length : 0;
    for(i=0;i<nBuilt && i<growthBuildingCandidates.length;i++){
      var c=growthBuildingCandidates[i], b=spawnedBuildings[i];
      // effective width is the ERA-GATED rendered width (party wall only after
      // the unlock) so the audits measure what actually stands at this date.
      var w=(typeof lotEffectiveW!=="undefined")?lotEffectiveW(c,simDay):(c.buildW!=null?c.buildW:5);
      var dd=(c.depth!=null?c.depth:4);
      var party=(typeof partyWallActive!=="undefined")?partyWallActive(c,simDay):!!c.commercial;
      out.push({ x:b.x, z:b.z, rot:b.rot!=null?b.rot:(c.rot||0), w:w, d:dd,
                 commercial:party, src:"growth", dRing:(c.dRing!=null?c.dRing:9),
                 edgeKey:(c.edgeKey!=null?c.edgeKey:null) });
    }
    return out;
  }

  /* ---- ORIENTATION (§2, new): every addressed building's door-face normal
     within 15° of its lot's frontage normal. Door-face world normal follows
     the codebase convention (sin(rot),cos(rot)) — the same vector the yard
     door-path builder uses. FAILS on the s72 build: the user's #1 nub. ---- */
  /* the frontage a building actually addresses: among street segments whose
     perpendicular foot is within 40m AND lies in front of the door (so a lot
     fronts the street its door opens onto, not one behind it), the smallest
     angle between the door-face and the inward direction to that foot. This is
     the corner-lot rule made auditable — a building on a corner fronts ONE of
     its two streets, and facing either is correct. Returns 999 if no street is
     fronted (a genuine mid-block orphan). */
  function bestFrontageAngle(x,z,dnx,dnz){
    var best=999;
    for(var s=0;s<PLACEMENT_STREET_SEGS.length;s++){ var g=PLACEMENT_STREET_SEGS[s];
      var dx=g.x1-g.x0, dz=g.z1-g.z0, l2=dx*dx+dz*dz;
      var t=l2>0?clamp(((x-g.x0)*dx+(z-g.z0)*dz)/l2,0,1):0;
      var fx=g.x0+dx*t, fz=g.z0+dz*t, d=Math.hypot(x-fx,z-fz);
      if(d>40 || d<1e-3) continue;
      var inx=(fx-x)/d, inz=(fz-z)/d;               // inward: building → street foot
      if(dnx*inx+dnz*inz <= 0) continue;            // street is behind the door — not fronted
      var ang=Math.acos(clamp(dnx*inx+dnz*inz,-1,1))*DEG;
      if(ang<best) best=ang;
    }
    return best;
  }
  registerAudit("placement", "orientation", function(){
    var A=addressedBuilt(), bad=[], i, worst=0;
    var perSrc={ village:{n:0,bad:0}, growth:{n:0,bad:0} };
    var hist={ ok:0, off90:0, off180:0, other:0 };
    for(i=0;i<A.length;i++){ var b=A[i];
      var info=nearestStreetInfo(b.x,b.z);
      if(info.d>90) continue;                        // no street to face nearby (deep outlier) — not addressed here
      var dnx=Math.sin(b.rot), dnz=Math.cos(b.rot);  // door-face world normal (code convention)
      // measure against the street the building actually fronts (corner rule),
      // not merely the geometrically nearest (which is the cross street at a
      // corner). A mid-block orphan fronts nothing → 999 → counted as violation.
      var ang=bestFrontageAngle(b.x,b.z,dnx,dnz);
      if(ang>900) ang=180;
      if(ang>worst) worst=ang;
      (perSrc[b.src]=perSrc[b.src]||{n:0,bad:0}).n++;
      if(ang<=15) hist.ok++; else if(Math.abs(ang-90)<=20) hist.off90++;
      else if(ang>=150) hist.off180++; else hist.other++;
      if(ang>15){ perSrc[b.src].bad++; bad.push({ src:b.src, x:Math.round(b.x), z:Math.round(b.z), angleDeg:+ang.toFixed(1),
        rot:+b.rot.toFixed(2), doorX:+dnx.toFixed(2), doorZ:+dnz.toFixed(2), nOutX:+info.nx.toFixed(2), nOutZ:+info.nz.toFixed(2), streetD:+info.d.toFixed(1) }); }
    }
    return { pass: bad.length===0, law:"orientation(≤15°)", checked:A.length,
             violations:bad.length, worstDeg:+worst.toFixed(1), perSrc:perSrc, hist:hist, list:bad.slice(0,20) };
  });

  /* ---- footprintsOBB (§2, upgrade): true oriented-box intersection across
     ALL structure classes = 0 (the circle proxy is retired). A permitted party
     wall (angle diff ≤15° with only edge contact) is NOT an overlap. FAILS
     where the s72 circle index passed real oriented overlaps. ---- */
  registerAudit("placement", "footprintsOBB", function(){
    var A=addressedBuilt(), i, j, viol=[], maxPen=0, authoredFB=0;
    var R=A.map(function(b){ return rectCorners(b.x,b.z,b.rot,(b.w||4)/2,(b.d||4)/2); });
    for(i=0;i<A.length;i++){ var a=A[i], ra=Math.hypot(a.w,a.d)/2;
      for(j=i+1;j<A.length;j++){ var b=A[j];
        var dx=a.x-b.x, dz=a.z-b.z, rb=Math.hypot(b.w,b.d)/2;
        if(dx*dx+dz*dz > (ra+rb)*(ra+rb)) continue;   // broadphase
        var pen=rectPenetration(R[i],R[j]);
        if(pen<=0) continue;
        var partyWall = Math.abs(angNorm(a.rot-b.rot))<=15/DEG && pen<0.6; // shared-edge abutment
        if(partyWall) continue;
        // the documented Dec-1849 fire-block row (Alta's continuous establishments)
        // is an AUTHORED party-wall block whose lot positions honor the record —
        // reported but not gated, same doctrine as the placement.footprints audit's
        // authored carve-out. Tightening it to exact shared walls is a fast-follow.
        if(a.fireBlock && b.fireBlock){ authoredFB++; continue; }
        if(pen>maxPen) maxPen=pen;
        if(pen>1.0) viol.push({ i:i, j:j, pen:+pen.toFixed(2), x:Math.round(a.x), z:Math.round(a.z) });
      }
    }
    return { pass: viol.length===0, law:"footprintsOBB", checked:A.length,
             violations:viol.length, maxPenM:+maxPen.toFixed(2),
             authoredFireBlockOverlaps:authoredFB, gated:"engine-governed (authored fire-block reported)",
             list:viol.slice(0,20) };
  });

  /* ---- rowEra (§2, new): zero party-wall abutments before the unlock date;
     max continuous run ≤8; abutment only in the commercial core. Walks the
     BUILT addressed set at the current simDay, groups abutting neighbours
     (centre gap ≤ half-widths + 0.8m, near-parallel), and measures runs.
     FAILS on the June-1847 200m strip (abutments present pre-unlock). ---- */
  registerAudit("placement", "rowEra", function(){
    var A=addressedBuilt().filter(function(b){ return b.src==="growth"; });
    var pairs=[], i, j;
    for(i=0;i<A.length;i++){ var a=A[i];
      for(j=i+1;j<A.length;j++){ var b=A[j];
        var dx=a.x-b.x, dz=a.z-b.z, dist=Math.hypot(dx,dz);
        var need=(a.w+b.w)/2;
        if(dist > need+0.8) continue;                          // not abutting
        if(Math.abs(angNorm(a.rot-b.rot))>15/DEG) continue;    // party wall shares yaw
        pairs.push([i,j]);
      }
    }
    // union-find run lengths
    var parent=A.map(function(_,k){ return k; });
    function find(k){ while(parent[k]!==k){ parent[k]=parent[parent[k]]; k=parent[k]; } return k; }
    pairs.forEach(function(p){ parent[find(p[0])]=find(p[1]); });
    var runSize={}, maxRun=0;
    A.forEach(function(_,k){ if(pairs.length){ var r=find(k); runSize[r]=(runSize[r]||0)+1; } });
    Object.keys(runSize).forEach(function(r){ if(runSize[r]>maxRun) maxRun=runSize[r]; });
    var preUnlock = simDay < SPAWN_UNLOCK_DAY;
    var prematureAbut=0, nonCoreAbut=0;
    pairs.forEach(function(p){
      if(preUnlock) prematureAbut++;
      if(!A[p[0]].commercial || !A[p[1]].commercial) nonCoreAbut++;
    });
    var runCapViol = maxRun>8 ? 1 : 0;
    var violations = prematureAbut + nonCoreAbut + runCapViol;
    return { pass: violations===0, law:"rowEra", date:simDateISO(dateFromSimDay(simDay)),
             preUnlock:preUnlock, abutments:pairs.length, prematureAbut:prematureAbut,
             nonCoreAbut:nonCoreAbut, maxRun:(pairs.length?maxRun:0), runCap:8, violations:violations };
  });

  /* ---- frontageOpenness (§2, new): zero block-interior addressed spawns
     (a building whose door is >28m from any street is mid-block) AND a
     perimeter-rampart detector — per block edge, the built fraction may not
     exceed the era curve (pre-1849 edges are mostly empty/gap-toothed). FAILS
     on the wall-to-wall perimeter frame. ---- */
  registerAudit("placement", "frontageOpenness", function(){
    var A=addressedBuilt(), interior=[], i;
    var INTERIOR_M=30;
    // (1) zero block-interior addressed spawns — a building whose door is >30m
    //     from every street is a mid-block orphan (open interiors, §1.5).
    for(i=0;i<A.length;i++){ var b=A[i];
      var doorx=b.x+Math.sin(b.rot)*((b.d||4)*0.5), doorz=b.z+Math.cos(b.rot)*((b.d||4)*0.5);
      var edgeDist=Math.min(nearestStreetInfo(b.x,b.z).d, nearestStreetInfo(doorx,doorz).d);
      if(edgeDist>INTERIOR_M) interior.push({ src:b.src, x:Math.round(b.x), z:Math.round(b.z), d:+edgeDist.toFixed(1) });
    }
    // (2) RADIAL DENSITY GRADIENT (Director headline, §1.4): built fraction of
    //     the lot fabric by ring. The plaza ring/main-street core must densify
    //     far ahead of the outer blocks — "sparse scatter spread evenly" is the
    //     named failure. Bins the whole candidate pool by dRing; built = revealed.
    var nBuilt=(typeof spawnedBuildings!=="undefined")?spawnedBuildings.length:0;
    function ringOf(dr){ return dr<=1?"core":(dr<=3?"mid":"edge"); }
    var tot={core:0,mid:0,edge:0}, blt={core:0,mid:0,edge:0};
    for(i=0;i<growthBuildingCandidates.length;i++){ var c=growthBuildingCandidates[i], r=ringOf(c.dRing!=null?c.dRing:9);
      tot[r]++; if(i<nBuilt) blt[r]++; }
    function frac(r){ return tot[r]? blt[r]/tot[r] : 0; }
    var coreF=frac("core"), midF=frac("mid"), edgeF=frac("edge");
    // pre-unlock: everything low + monotone (core ≥ mid ≥ edge, no rampart);
    // post-unlock boom: a STEEP gradient — core densifies to full frontage
    // (that is the GOAL, not a rampart), while the OUTER ring must stay
    // gap-toothed. So the rampart guard applies to the edge ring only.
    var preUnlock=simDay<SPAWN_UNLOCK_DAY;
    var edgeCap = preUnlock?0.45:0.90;
    var rampart = (edgeF>edgeCap)?1:0;
    // gradient must not invert (outer ring denser than core = even-scatter smell)
    var inverted = (edgeF > coreF+0.02 || midF > coreF+0.02)?1:0;
    // once the boom is on and the core is materially built, demand the spread
    var boomOn = !preUnlock && coreF>0.35;
    var flat = (boomOn && (coreF - edgeF) < 0.12)?1:0;
    var violations = interior.length + rampart + inverted + flat;
    return { pass: violations===0, law:"frontageOpenness", checked:A.length,
             interiorSpawns:interior.length,
             ringFrac:{core:+coreF.toFixed(2), mid:+midF.toFixed(2), edge:+edgeF.toFixed(2)},
             ringTotals:tot, rampart:rampart, inverted:inverted, flat:flat,
             gradientOK:(coreF>=edgeF), violations:violations, list:interior.slice(0,15) };
  });
})();

/* =========================================================================
   THE GEODETIC LOCK standing guard (core.geodeticLock). Lives in debug.js's
   chunk 70 alongside the other core/placement audits (07-main's chunk 74 is
   the module IIFE close, so this must precede it). Registered lazily; the
   "core" namespace late-attaches to __P1850.audits (core/00-boot).
   core.geodeticLock (foundation-reset §2 "THE GEODETIC LOCK"): the standing
   control-point audit that fails any build whose geometry drifts from the
   verified affine fit. Re-derives everything LIVE from the 8 OSM street-
   intersection control points (tools/map-overlay.py; SF's downtown grid is
   unchanged since O'Farrell 1847, so modern intersections are valid 1846-56
   ground truth). Three independent checks, all FRAMING-INDEPENDENT:
     A) DATASET FIDELITY — least-squares affine fit real(local-m)→(u,v) over
        the 8 points; FAIL if RMS > 2 m (the reprojected street dataset must
        still register to ground truth). Measured baseline: 1.13 m.
     B) CANONICAL TRANSFORM vs GROUND TRUTH — run gridToWorld() end-to-end
        (u,v)→world→lat/lon (bake frame) and compare to each point's OSM
        lat/lon; FAIL if RMS > 2 m. This is the guard that catches the
        outlawed "gridToWorld pinned to the wrong angle" class: at the old
        −6.5° pin this measured 18 m RMS (35 m worst); at the canonical
        −9.0° it measures ~1.2 m.
     C) NO TRANSFORM DRIFT — gridToWorld()'s implied base azimuth must equal
        GRID_ROT_BASE within 0.1°; worldToGrid() must invert gridToWorld() to
        <1e-3 m; VIOGET_SKEW must remain GRID_ROT_BASE+VIOGET_ERROR. Any
        future layer that re-defines its own origin/angle trips this.
   This is the permanent gate for all future grid EXPANSION.
   ========================================================================= */
registerAudit("core", "geodeticLock", function(){
  // (lat, lon, u, v) — the 8 control points, verbatim from tools/map-overlay.py
  // CONTROL_POINTS (OSM Overpass way-intersection nodes; (u,v) from the
  // reprojected data/streets-geometry.json).
  var CP = [
    ["montgomery_clay",       37.7946763, -122.4031576,    0.0,    49.39],
    ["montgomery_washington", 37.7955349, -122.4033265,    0.0,   -49.39],
    ["kearny_clay",           37.7944619, -122.4047926, -145.71,   49.39],
    ["kearny_washington",     37.7953282, -122.4049700, -145.71,  -49.39],
    ["market_kearny",         37.7876758, -122.4034364, -145.71,  815.06],
    ["market_montgomery",     37.7888178, -122.4019881,    0.0,   709.20],
    ["broadway_battery",      37.7985851, -122.4010680,  249.6,  -350.79],
    ["sansome_clay",          37.7948561, -122.4015163,  145.71,   49.39]
  ];
  // yardstick — independent WGS84 m/deg @37.795°N (Snyder), the audit's own
  // yardstick, NOT the repo's 111320 (the affine absorbs a uniform scale, so
  // the fit RMS is identical either way; kept explicit for the record).
  var FIT_OLAT=37.7946617, FIT_OLON=-122.4028640, FIT_MLAT=110992.6, FIT_MLON=88076.6;
  // bake frame — MUST mirror tools/bake-terrain.js metersToLatLon (the frame
  // gridToWorld's world (x,z) lives in). Used only to re-project the canonical
  // transform back to lat/lon for check B.
  var BAKE_CLAT=37.7955, BAKE_CLON=-122.4045;
  var BAKE_MLAT=111320.0, BAKE_MLON=111320.0*Math.cos(BAKE_CLAT*Math.PI/180);

  function solve3(M,b){ // Gaussian elimination, 3x3 (M is [[..],[..],[..]])
    var A=[M[0].concat(b[0]), M[1].concat(b[1]), M[2].concat(b[2])];
    for(var i=0;i<3;i++){
      var piv=i; for(var r=i+1;r<3;r++) if(Math.abs(A[r][i])>Math.abs(A[piv][i])) piv=r;
      var tmp=A[i]; A[i]=A[piv]; A[piv]=tmp;
      for(var r2=0;r2<3;r2++){ if(r2===i) continue; var f=A[r2][i]/A[i][i];
        for(var c=i;c<4;c++) A[r2][c]-=f*A[i][c]; }
    }
    return [A[0][3]/A[0][0], A[1][3]/A[1][1], A[2][3]/A[2][2]];
  }
  function haversine(la1,lo1,la2,lo2){
    var R=6371008.8, p1=la1*Math.PI/180, p2=la2*Math.PI/180;
    var dp=(la2-la1)*Math.PI/180, dl=(lo2-lo1)*Math.PI/180;
    var h=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
    return 2*R*Math.asin(Math.sqrt(h));
  }

  // --- A) affine fit real(local-m)→(u,v) via normal equations ---
  var Sxx=0,Sxy=0,Sx=0,Syy=0,Sy=0,n=CP.length;
  var bux=0,buy=0,bu=0,bvx=0,bvy=0,bv=0;
  var src=[];
  for(var i=0;i<n;i++){
    var lat=CP[i][1], lon=CP[i][2], u=CP[i][3], v=CP[i][4];
    var sx=(lon-FIT_OLON)*FIT_MLON, sy=(lat-FIT_OLAT)*FIT_MLAT; src.push([sx,sy]);
    Sxx+=sx*sx; Sxy+=sx*sy; Sx+=sx; Syy+=sy*sy; Sy+=sy;
    bux+=sx*u; buy+=sy*u; bu+=u; bvx+=sx*v; bvy+=sy*v; bv+=v;
  }
  var NM=[[Sxx,Sxy,Sx],[Sxy,Syy,Sy],[Sx,Sy,n]];
  var au=solve3(NM,[[bux],[buy],[bu]]); // u = au0*sx+au1*sy+au2
  var av=solve3(NM,[[bvx],[bvy],[bv]]);
  var sse=0;
  for(var j=0;j<n;j++){
    var pu=au[0]*src[j][0]+au[1]*src[j][1]+au[2];
    var pv=av[0]*src[j][0]+av[1]*src[j][1]+av[2];
    sse+=(pu-CP[j][3])*(pu-CP[j][3])+(pv-CP[j][4])*(pv-CP[j][4]);
  }
  var fitRms=Math.sqrt(sse/n);

  // --- B) canonical gridToWorld() end-to-end vs OSM lat/lon ---
  var e2eSse=0, e2eMax=0, worst="";
  for(var k=0;k<n;k++){
    var w=gridToWorld(CP[k][3], CP[k][4]);
    var plat=BAKE_CLAT - w.z/BAKE_MLAT, plon=BAKE_CLON + w.x/BAKE_MLON;
    var d=haversine(CP[k][1],CP[k][2],plat,plon);
    e2eSse+=d*d; if(d>e2eMax){ e2eMax=d; worst=CP[k][0]; }
  }
  var e2eRms=Math.sqrt(e2eSse/n);

  // --- C) no-transform-drift ---
  var probe=gridToWorld(1000,0);
  var g2wAzDeg=Math.atan2(probe.z-GRID_ORIGIN_Z, probe.x-GRID_ORIGIN_X)*180/Math.PI;
  var azErr=Math.abs(g2wAzDeg - GRID_ROT_BASE_DEG);
  var rtMax=0;
  for(var m=0;m<n;m++){
    var wp=gridToWorld(CP[m][3],CP[m][4]); var g=worldToGrid(wp.x,wp.z);
    rtMax=Math.max(rtMax, Math.hypot(g.u-CP[m][3], g.v-CP[m][4]));
  }
  var viogetOK=Math.abs(VIOGET_SKEW_DEG-(GRID_ROT_BASE_DEG+VIOGET_ERROR_DEG))<1e-9;

  var pass = fitRms<=2.0 && e2eRms<=2.0 && azErr<=0.1 && rtMax<=1e-3 && viogetOK;
  return {
    pass: pass,
    datasetFitRms_m: +fitRms.toFixed(3),
    canonicalEndToEndRms_m: +e2eRms.toFixed(3),
    canonicalEndToEndMax_m: +e2eMax.toFixed(3), worst: worst,
    gridToWorldAzDeg: +g2wAzDeg.toFixed(4), gridRotBaseDeg: GRID_ROT_BASE_DEG,
    azimuthDriftDeg: +azErr.toFixed(4),
    worldToGridRoundTripMax_m: +rtMax.toExponential(2),
    viogetRelationOK: viogetOK,
    controlPoints: n,
    gates: "fitRms<=2, e2eRms<=2, azDrift<=0.1deg, roundTrip<=1e-3m"
  };
});
