/* =====================================================================
   core/05-routing — street graph + walkability mask + weighted diverse routing (s59). Shared interface
   owner: walkBlockedAt(x,z,day), graphPathWeighted. People consume routes; they never build them.
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 54 — street graph, walkability mask, weighted diverse routing (s59) */
/* ---- 2b. STREET GRAPH — a waypoint graph over the real surveyed street
   grid (every streetsU x streetsV intersection), plus the Plaza (wired to
   its four bounding corners), the Clay St wharf/landing, the Mission-road
   chain (reusing MISSION_ROAD_PTS' real low-ground route), and a spur from
   each off-grid camp hub (Happy Valley, the town's-edge camps, the western
   hillside camps, Sydney Town/Little Chile) to its nearest real street
   node. People move ONLY via BFS/Dijkstra shortest path along these edges
   — the fix for "doesn't respect streets... straight lines": the sole
   straight-line segment allowed anywhere is the short spur from an exact
   building/tent/worksite position to its nearest graph node (stepping from
   your own door to the street), consistent with this village's tiny
   50-vara-lot scale. ---- */
var STREET_GRAPH = (function(){
  var nodes = [], edgeList = [], idx = {};
  function addNode(key,x,z){ idx[key] = nodes.length; nodes.push({key:key,x:x,z:z}); edgeList.push([]); return idx[key]; }
  function addEdge(k1,k2){
    var i1=idx[k1], i2=idx[k2];
    if(i1==null||i2==null||i1===i2) return;
    var d = Math.hypot(nodes[i1].x-nodes[i2].x, nodes[i1].z-nodes[i2].z);
    edgeList[i1].push({to:i2,d:d}); edgeList[i2].push({to:i1,d:d});
  }
  // CLAY/WASHINGTON SWAP FIX (2026-07-10): the adjacency loops below
  // connect each key to its NEXT key in this array, assuming that order is
  // already geographic (ascending u/v) — true before the fix (object-
  // literal insertion order happened to match), but no longer guaranteed
  // once GEO.streetsV.clay/washington's VALUES swapped while their key
  // POSITIONS in the object literal did not. Sorting by actual coordinate
  // value makes this correct regardless of insertion order (and immune to
  // future edits reordering the literal).
  var uKeys = Object.keys(GEO.streetsU).sort(function(a,b){ return GEO.streetsU[a]-GEO.streetsU[b]; });
  var vKeys = Object.keys(GEO.streetsV).sort(function(a,b){ return GEO.streetsV[a]-GEO.streetsV[b]; });
  uKeys.forEach(function(uk){ vKeys.forEach(function(vk){
    var p = gridToWorld(GEO.streetsU[uk], GEO.streetsV[vk]);
    addNode(uk+"_"+vk, p.x, p.z);
  }); });
  for(var ui=0; ui<uKeys.length; ui++){
    for(var vi=0; vi<vKeys.length-1; vi++) addEdge(uKeys[ui]+"_"+vKeys[vi], uKeys[ui]+"_"+vKeys[vi+1]);
  }
  for(var vi2=0; vi2<vKeys.length; vi2++){
    for(var ui2=0; ui2<uKeys.length-1; ui2++) addEdge(uKeys[ui2]+"_"+vKeys[vi2], uKeys[ui2+1]+"_"+vKeys[vi2]);
  }
  // Plaza (the open block) — wired to its four bounding corners so a
  // walker can actually cut across the square rather than only skirt it.
  addNode("plaza", PLAZA_CENTER.x, PLAZA_CENTER.z);
  ["kearny_clay","kearny_washington","dupont_clay","dupont_washington"].forEach(function(k){ addEdge("plaza",k); });
  // Clay St wharf/landing — the working waterfront's graph anchor.
  var wharfV0 = (GEO.streetsV.clay+GEO.streetsV.washington)/2;
  var wharfPt0 = gridToWorld(GEO.streetsU.montgomery, wharfV0);
  addNode("wharf", wharfPt0.x, wharfPt0.z);
  addEdge("wharf","montgomery_clay"); addEdge("wharf","montgomery_washington");
  // Mission road — chain the real findLowRoute() points (MISSION_ROAD_PTS,
  // built above) up to the point nearest Mission Dolores itself.
  if(typeof MISSION_ROAD_PTS!=="undefined" && MISSION_ROAD_PTS.length>1){
    var missionNearest=0, missionNearestD=1e18;
    MISSION_ROAD_PTS.forEach(function(p,i){
      var d=Math.hypot(p.x-OUTPOSTS.mission.x,p.z-OUTPOSTS.mission.z);
      if(d<missionNearestD){ missionNearestD=d; missionNearest=i; }
    });
    var prevKey = null;
    for(var mi=0; mi<=missionNearest; mi++){
      var mkey = "mroad_"+mi;
      addNode(mkey, MISSION_ROAD_PTS[mi].x, MISSION_ROAD_PTS[mi].z);
      if(prevKey) addEdge(prevKey, mkey);
      prevKey = mkey;
    }
    var startNode = idx["mroad_0"];
    var bestK=null, bestD=1e18;
    Object.keys(idx).forEach(function(k){
      if(k.indexOf("mroad_")===0 || k==="plaza" || k==="wharf") return;
      var n = nodes[idx[k]], d=Math.hypot(n.x-nodes[startNode].x, n.z-nodes[startNode].z);
      if(d<bestD){ bestD=d; bestK=k; }
    });
    if(bestK) addEdge(bestK, "mroad_0");
    addNode("mission", OUTPOSTS.mission.x, OUTPOSTS.mission.z);
    addEdge("mission", "mroad_"+missionNearest);
  } else {
    addNode("mission", OUTPOSTS.mission.x, OUTPOSTS.mission.z);
  }
  // Off-grid camp hubs — squatter tracks, not surveyed streets: one direct
  // spur each from the camp's center to its nearest real street node.
  [
    { key:"camp_happyvalley", x:900, z:950 },
    { key:"camp_edge",        x:PLAZA_CENTER.x-260, z:PLAZA_CENTER.z+220 },
    { key:"camp_western",     x:PLAZA_CENTER.x-900, z:PLAZA_CENTER.z-260 },
    { key:"camp_northcove",   x:lerp(PLAZA_CENTER.x,-134,0.5), z:lerp(PLAZA_CENTER.z,-808,0.5) }
  ].forEach(function(c){
    addNode(c.key, c.x, c.z);
    var bestK2=null, bestD2=1e18;
    Object.keys(idx).forEach(function(k){
      if(k===c.key || k.indexOf("camp_")===0) return;
      var n=nodes[idx[k]], d=Math.hypot(n.x-c.x,n.z-c.z);
      if(d<bestD2){ bestD2=d; bestK2=k; }
    });
    if(bestK2) addEdge(bestK2, c.key);
  });
  // s97 PIER ADMISSION (pier-system-spec §1 THE JUNCTION + §3 walk continuity):
  // wire each pier into the walk graph as street -> junction(foot) -> deck(end)
  // so the routing corridor flows continuously from the street grid onto the
  // wharf deck (spine.pierWalkContinuity proves reachability). The FOOT node
  // sits on its anchor street's centreline (verified 0.00 m off-centre by
  // spine.pierJunction) and links to the nearest real street/grid node — the
  // shared shoreline junction — and to the deck END node (the full built
  // bayward extent). A pure SPUR: END is a dead end, so no through-route
  // shortcut is introduced into the land network. Topology is date-independent
  // (full extent); the audit is a reachability property, not a per-day gate.
  // Reads only PIERS_RUNTIME + gridToWorld (both defined far upstream); never
  // pierEdgesAt (cadastre, defined downstream of this graph IIFE).
  if(typeof PIERS_RUNTIME !== "undefined") PIERS_RUNTIME.forEach(function(p){
    if(!p.checkpoints.length || !p.polyline.length) return;
    var footW = gridToWorld(p.polyline[0].u, p.polyline[0].v);
    var lastCk = p.checkpoints[p.checkpoints.length-1];
    var oi = Math.max(0, Math.min(lastCk.extent[1], p.polyline.length-1));
    var endW = gridToWorld(p.polyline[oi].u, p.polyline[oi].v);
    var footKey = "pier_"+p.id+"_foot", endKey = "pier_"+p.id+"_end";
    addNode(footKey, footW.x, footW.z);
    addNode(endKey, endW.x, endW.z);
    var bestK=null, bestD=1e18;
    Object.keys(idx).forEach(function(k){
      if(k.indexOf("pier_")===0 || k.indexOf("camp_")===0 || k.indexOf("mroad_")===0) return;
      var n=nodes[idx[k]], d=Math.hypot(n.x-footW.x, n.z-footW.z);
      if(d<bestD){ bestD=d; bestK=k; }
    });
    if(bestK) addEdge(bestK, footKey);   // the shoreline junction (street -> foot)
    addEdge(footKey, endKey);            // the deck corridor (foot -> end)
  });
  return { nodes:nodes, edges:edgeList, idx:idx };
})();
function nearestGraphNode(x,z){
  var best=0, bestD=1e18;
  for(var i=0;i<STREET_GRAPH.nodes.length;i++){
    var n=STREET_GRAPH.nodes[i], d=(n.x-x)*(n.x-x)+(n.z-z)*(n.z-z);
    if(d<bestD){ bestD=d; best=i; }
  }
  return best;
}
/* =========================================================================
   s59 MOVEMENT NATURALISM — WALKABILITY MASK + WEIGHTED, DIVERSE ROUTING.

   1. THE MASK: every building footprint (founding village, landmarks,
      growth candidates at their deterministic reveal days, tents, outpost
      structures), fence rail, corral rail and the Presidio wall lives in a
      16m-bucket spatial hash of EXACT shapes (oriented rects / circles /
      thin segments). walkBlockedAt(x,z,day) is the one collision oracle:
      route building, detours, lateral-jitter clamping and QA all read it.
      Era-honest: an obstacle blocks only from its reveal day (quantized to
      the 30-day route bucket, so a route never clips a building that pops
      mid-bucket).
   2. ROUTING: graphPathWeighted() = Dijkstra over the same STREET_GRAPH,
      edge cost = length x roadLifecycleFactor^personRoadPref x personJitter.
      Lifecycle factors read grounding.md §9b state per edge per 30-day
      bucket (S4/S3 cheap, S2 moderate, ghost/open ground expensive but
      PERMITTED — corner-cutting is period truth, wall-following robots are
      not). personRoadPref + per-edge jitter are counter-based hashes of
      (person, lifeVariant) — stable within a telling, rewind-exact, re-dealt
      only by the reshuffle glyph. 10 same-OD walkers therefore spread over
      the block grid instead of stacking on one shortest path.
   3. DETOURS + DOORS: any polyline segment that crosses an obstacle is
      locally re-routed by a small bounded A* over ~1.6m cells (string-pulled
      back to a natural line); an endpoint INSIDE a footprint (a home, a
      shop) exits via the building's own door face first, so walks read as
      door -> street -> door. No teleports anywhere: every position change
      rides a polyline.
   All thresholds fill:true tunables.
   ========================================================================= */
var WALK_PERSON_R = 0.35, WALK_BUCKET = 16, WALK_CELL = 1.6;
var ROUTE_BUCKET_DAYS = 30;
var _walkHash = null, _walkObstacleCount = 0;
function walkMaskInit(){
  if(_walkHash) return;
  var obs = [];
  VILLAGE_BUILDING_SPOTS.forEach(function(sp){
    obs.push({t:1, x:sp.x, z:sp.z, rot:sp.rot||0, hw:(sp.w||4)/2, hd:(sp.d||4)/2, reveal:(sp.foundedDay!=null?sp.foundedDay:-1e9)});
  });
  growthBuildingCandidates.forEach(function(c,i){
    obs.push({t:1, x:c.x, z:c.z, rot:c.rot||0, hw:2.5, hd:2.0, reveal:dayForBuildingIndex(i)});
  });
  tentCandidates.forEach(function(c,i){
    obs.push({t:2, x:c.x, z:c.z, r:1.9, reveal:dayForTentIndex(i)});
  });
  WALK_RECTS.forEach(function(r){ obs.push({t:1, x:r.x, z:r.z, rot:r.rot, hw:r.hw, hd:r.hd, reveal:r.reveal}); });
  WALK_CIRCLES.forEach(function(c){ obs.push({t:2, x:c.x, z:c.z, r:c.r, reveal:c.reveal}); });
  WALK_SEGS.forEach(function(s){ obs.push({t:3, x0:s.x0, z0:s.z0, x1:s.x1, z1:s.z1, reveal:-1e9}); });
  _walkObstacleCount = obs.length;
  _walkHash = {};
  var m = WALK_PERSON_R + 0.5;
  obs.forEach(function(o){
    var xMin,xMax,zMin,zMax;
    if(o.t===1){ var rr=Math.hypot(o.hw,o.hd)+m; xMin=o.x-rr; xMax=o.x+rr; zMin=o.z-rr; zMax=o.z+rr; }
    else if(o.t===2){ xMin=o.x-o.r-m; xMax=o.x+o.r+m; zMin=o.z-o.r-m; zMax=o.z+o.r+m; }
    else { xMin=Math.min(o.x0,o.x1)-m; xMax=Math.max(o.x0,o.x1)+m; zMin=Math.min(o.z0,o.z1)-m; zMax=Math.max(o.z0,o.z1)+m; }
    for(var bx=Math.floor(xMin/WALK_BUCKET); bx<=Math.floor(xMax/WALK_BUCKET); bx++)
      for(var bz=Math.floor(zMin/WALK_BUCKET); bz<=Math.floor(zMax/WALK_BUCKET); bz++){
        var k=bx+","+bz;
        (_walkHash[k]||(_walkHash[k]=[])).push(o);
      }
  });
}
/* Reveal days quantize to the END of the route bucket so a leg built for
   this bucket already avoids anything that will stand before the bucket
   closes — no mid-bucket clipping through fresh construction. */
function _walkRevealHorizon(day){ return (Math.floor(day/ROUTE_BUCKET_DAYS)+1)*ROUTE_BUCKET_DAYS; }
function walkBlockedAt(x,z,day,r){
  if(!_walkHash) walkMaskInit();
  var arr = _walkHash[Math.floor(x/WALK_BUCKET)+","+Math.floor(z/WALK_BUCKET)];
  if(!arr) return null;
  var R = r!=null ? r : WALK_PERSON_R;
  for(var i=0;i<arr.length;i++){
    var o = arr[i];
    if(o.reveal>day) continue;
    if(o.t===1){
      var dx=x-o.x, dz=z-o.z, c=Math.cos(o.rot), s=Math.sin(o.rot);
      var lx=dx*c-dz*s, lz=dx*s+dz*c; // inverse of the bake-yaw local->world frame (see buildYardFencesAndPaths' toWorld)
      if(Math.abs(lx)<o.hw+R && Math.abs(lz)<o.hd+R) return o;
    } else if(o.t===2){
      var ddx=x-o.x, ddz=z-o.z, rr=o.r+R;
      if(ddx*ddx+ddz*ddz<rr*rr) return o;
    } else {
      if(distToSegXZ(x,z,o.x0,o.z0,o.x1,o.z1)<0.35+R) return o;
    }
  }
  return null;
}
/* An endpoint inside a footprint (homePos in a cottage, a shop worksite)
   exits through the obstacle's own faces — the +Z "door face" (the same
   local face the splat door-paths use) tried first — then ring-searches. */
function walkExitPoint(x,z,day){
  var o = walkBlockedAt(x,z,day);
  if(!o) return null;
  var cands = [], m = WALK_PERSON_R+0.9, i, a;
  if(o.t===1){
    var c=Math.cos(o.rot), s=Math.sin(o.rot);
    [[0,o.hd+m],[0,-(o.hd+m)],[o.hw+m,0],[-(o.hw+m),0]].forEach(function(l){
      cands.push({x:o.x+l[0]*c+l[1]*s, z:o.z-l[0]*s+l[1]*c});
    });
  } else if(o.t===2){
    for(i=0;i<8;i++){ a=(i/8)*Math.PI*2; cands.push({x:o.x+Math.cos(a)*(o.r+m), z:o.z+Math.sin(a)*(o.r+m)}); }
  }
  for(var rad=2.4; rad<=15; rad+=3.1) for(i=0;i<12;i++){
    a=(i/12)*Math.PI*2;
    cands.push({x:x+Math.cos(a)*rad, z:z+Math.sin(a)*rad});
  }
  for(i=0;i<cands.length;i++){
    var p=cands[i];
    if(terrainHeight(p.x,p.z)>0.15 && !walkBlockedAt(p.x,p.z,day)) return p;
  }
  return null;
}
function _walkFreeSeg(ax,az,bx,bz,day){
  var d = Math.hypot(bx-ax,bz-az);
  var n = Math.max(1, Math.ceil(d/1.2));
  for(var i=1;i<=n;i++){
    var t=i/n;
    if(walkBlockedAt(ax+(bx-ax)*t, az+(bz-az)*t, day)) return false;
  }
  return true;
}
/* Local A* around whatever blocks a straight segment: bounded box, coarse
   cells (adaptive for long spurs), octile heuristic, no corner cutting,
   water (terrain <= 0.15) blocked, hard expansion cap — then string-pulled
   so the detour reads as a person skirting a wall, not a grid crawl. */
function walkDetour(ax,az,bx,bz,day){
  var pad = 34;
  var spanX = Math.abs(bx-ax)+2*pad, spanZ = Math.abs(bz-az)+2*pad;
  var cell = Math.max(WALK_CELL, Math.max(spanX,spanZ)/200);
  var xMin=Math.min(ax,bx)-pad, zMin=Math.min(az,bz)-pad;
  var W=Math.ceil(spanX/cell), H=Math.ceil(spanZ/cell);
  function cellXZ(ix,iz){ return {x:xMin+(ix+0.5)*cell, z:zMin+(iz+0.5)*cell}; }
  function freeCell(ix,iz){
    if(ix<0||iz<0||ix>=W||iz>=H) return false;
    var p=cellXZ(ix,iz);
    if(terrainHeight(p.x,p.z)<=0.15) return false;
    return !walkBlockedAt(p.x,p.z,day);
  }
  function toCell(x,z){ return {ix:clamp(Math.floor((x-xMin)/cell),0,W-1), iz:clamp(Math.floor((z-zMin)/cell),0,H-1)}; }
  function nudgeFree(cc){
    if(freeCell(cc.ix,cc.iz)) return cc;
    for(var r=1;r<=4;r++) for(var dx=-r;dx<=r;dx++) for(var dz=-r;dz<=r;dz++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue;
      if(freeCell(cc.ix+dx,cc.iz+dz)) return {ix:cc.ix+dx, iz:cc.iz+dz};
    }
    return null;
  }
  var s0=nudgeFree(toCell(ax,az)), g=nudgeFree(toCell(bx,bz));
  if(!s0||!g) return null;
  var open=[], gs={}, came={}, closed={};
  function key(ix,iz){ return ix+iz*512; }
  function hDist(ix,iz){ var adx=Math.abs(ix-g.ix), adz=Math.abs(iz-g.iz); return (Math.max(adx,adz)+0.4142*Math.min(adx,adz))*1.02; }
  var k0=key(s0.ix,s0.iz);
  gs[k0]=0; open.push({ix:s0.ix,iz:s0.iz,f:hDist(s0.ix,s0.iz)});
  var DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.4142],[1,-1,1.4142],[-1,1,1.4142],[-1,-1,1.4142]];
  var pops=0, found=false;
  while(open.length && pops<6000){
    var bi=0, oi;
    for(oi=1;oi<open.length;oi++) if(open[oi].f<open[bi].f) bi=oi;
    var cur=open.splice(bi,1)[0]; pops++;
    var ck=key(cur.ix,cur.iz);
    if(closed[ck]) continue;
    closed[ck]=1;
    if(cur.ix===g.ix && cur.iz===g.iz){ found=true; break; }
    for(var di=0;di<8;di++){
      var D=DIRS[di], nx=cur.ix+D[0], nz=cur.iz+D[1];
      var nk=key(nx,nz);
      if(closed[nk] || !freeCell(nx,nz)) continue;
      if(D[2]>1 && (!freeCell(cur.ix+D[0],cur.iz) || !freeCell(cur.ix,cur.iz+D[1]))) continue;
      var ng=gs[ck]+D[2];
      if(gs[nk]==null || ng<gs[nk]){ gs[nk]=ng; came[nk]=ck; open.push({ix:nx,iz:nz,f:ng+hDist(nx,nz)}); }
    }
  }
  if(!found) return null;
  var cells=[], k=key(g.ix,g.iz);
  var guard=0;
  while(k!=null && k!==k0 && guard++<20000){ cells.push(k); k=came[k]; }
  cells.reverse();
  var pts = cells.map(function(kk){ var iz=Math.floor(kk/512), ix=kk-iz*512; return cellXZ(ix,iz); });
  // string-pull: greedy furthest-visible waypoint from each anchor
  var pulled=[], cx0=ax, cz0=az, idx=0, guard2=0;
  while(idx<pts.length && guard2++<80){
    if(_walkFreeSeg(cx0,cz0,bx,bz,day)) break;
    var far=idx;
    for(var j=pts.length-1;j>=idx;j--){ if(_walkFreeSeg(cx0,cz0,pts[j].x,pts[j].z,day)){ far=j; break; } }
    cx0=pts[far].x; cz0=pts[far].z;
    pulled.push(pts[far]); idx=far+1;
  }
  return pulled;
}
/* Post-process any waypoint list: obstacle-crossing segments get detoured. */
function walkAdjustPts(pts, day){
  if(!pts || pts.length<2) return pts;
  var out=[pts[0]];
  for(var i=1;i<pts.length;i++){
    var a=out[out.length-1], b=pts[i];
    if(!_walkFreeSeg(a.x,a.z,b.x,b.z,day)){
      var det = walkDetour(a.x,a.z,b.x,b.z,day);
      if(det) for(var j=0;j<det.length;j++) out.push(det[j]);
    }
    out.push(b);
  }
  return out;
}

/* ---- road-lifecycle edge costs (grounding.md §9b feeds routing) ---- */
var _walkStreetSegs = null; // placement-frame street pieces WITH street refs (routing costs + the road-share QA audit)
function walkStreetSegsInit(){
  if(_walkStreetSegs) return _walkStreetSegs;
  var segs=[];
  STREETS_RUNTIME.forEach(function(s){
    var i1 = s.checkpoints.length ? s.checkpoints[s.checkpoints.length-1].extent[1] : s.polyline.length-1;
    var viogetExt = (s.surveyedDay!=null && s.surveyedDay<=0 && s.checkpoints.length) ? s.checkpoints[0].extent : null;
    for(var i=0;i<i1;i++){
      var a=gridToWorld(s.polyline[i].u, s.polyline[i].v), b=gridToWorld(s.polyline[i+1].u, s.polyline[i+1].v);
      segs.push({x0:a.x,z0:a.z,x1:b.x,z1:b.z,halfW:s.widthM/2,s:s,vf:!!(viogetExt && i>=viogetExt[0] && (i+1)<=viogetExt[1])});
    }
  });
  _walkStreetSegs = segs;
  return segs;
}
function nearestStreetSegRef(x,z,maxOver){
  var segs=walkStreetSegsInit(), best=null, bestD=maxOver;
  for(var i=0;i<segs.length;i++){
    var sg=segs[i], d=distToSegXZ(x,z,sg.x0,sg.z0,sg.x1,sg.z1)-sg.halfW;
    if(d<bestD){ bestD=d; best=sg; }
  }
  return best;
}
var ROAD_STATE_COST = [2.3, 1.9, 1.35, 1.05, 1.0]; // S0..S4 cost-per-meter factor (fill:true tunables)
var _edgeMetaReady=false, _edgeCostCache={};
function edgeMetaInit(){
  if(_edgeMetaReady) return;
  _edgeMetaReady = true;
  var eIdx=0;
  function isCamp(k){ return k.indexOf("camp_")===0; }
  function isM(k){ return k.indexOf("mroad_")===0 || k==="mission"; }
  for(var u=0;u<STREET_GRAPH.nodes.length;u++){
    var nu=STREET_GRAPH.nodes[u];
    STREET_GRAPH.edges[u].forEach(function(e){
      var nv=STREET_GRAPH.nodes[e.to];
      var mx=(nu.x+nv.x)/2, mz=(nu.z+nv.z)/2;
      var kU=nu.key, kV=nv.key, kind="street", ref=null;
      if(isM(kU)||isM(kV)) kind="mroad";
      else if(isCamp(kU)||isCamp(kV)) kind="spur";
      else if(kU==="plaza"||kV==="plaza") kind="plaza";
      else if(kU==="wharf"||kV==="wharf") kind="wharf";
      else ref = nearestStreetSegRef(mx,mz,6);
      e.meta = { i:eIdx++, mx:mx, mz:mz, kind:kind, ref:ref,
        ukey:(Math.min(u,e.to)*1024+Math.max(u,e.to)) }; // canonical undirected id — jitter is direction-symmetric
    });
  }
}
function edgeStateFactor(meta, day){
  if(meta.kind==="mroad") return 1.12; // the documented Mission road — a real used way
  if(meta.kind==="plaza") return 1.10; // cutting across the open square is period truth
  if(meta.kind==="wharf") return 1.05;
  if(meta.kind==="spur")  return 1.45; // squatter tracks out to the camps
  if(!meta.ref) return 1.9;            // unmapped = open ground
  var st = roadPieceState(meta.ref.s, meta.mx, meta.mz, day, meta.ref.vf).st;
  return ROAD_STATE_COST[st];
}
function edgeCosts(day){
  edgeMetaInit();
  var bucket = Math.floor(day/ROUTE_BUCKET_DAYS);
  if(_edgeCostCache[bucket]) return _edgeCostCache[bucket];
  var evalDay = (bucket+0.5)*ROUTE_BUCKET_DAYS;
  var arr = [];
  for(var u=0;u<STREET_GRAPH.nodes.length;u++)
    STREET_GRAPH.edges[u].forEach(function(e){ arr[e.meta.i] = edgeStateFactor(e.meta, evalDay); });
  _edgeCostCache[bucket] = arr; // ~43 buckets over the whole sim — tiny
  return arr;
}
/* Weighted Dijkstra. who<0 = neutral (corridors, QA); who>=0 = a person:
   personal road-preference exponent (corner-cutters vs road-keepers) +
   stable per-edge cost jitter, both counter-based hashes on lifeVariant —
   rewind-exact within a telling, re-dealt only by the reshuffle glyph. */
function graphPathWeighted(fromIdx, toIdx, day, who, freshCosts){
  edgeMetaInit();
  var costs = freshCosts ? null : edgeCosts(day);
  var personal = (who!=null && who>=0);
  var roadExp = personal ? 0.55 + 0.9*hash2(who*0.913+7.31, lifeVariant*1.7+2.13) : 1.0;
  var n = STREET_GRAPH.nodes.length;
  var dist=new Array(n).fill(Infinity), prev=new Array(n).fill(-1), visited=new Array(n).fill(false);
  dist[fromIdx]=0;
  for(var iter=0;iter<n;iter++){
    var u=-1, best=Infinity;
    for(var i=0;i<n;i++) if(!visited[i]&&dist[i]<best){ best=dist[i]; u=i; }
    if(u===-1||u===toIdx) break;
    visited[u]=true;
    STREET_GRAPH.edges[u].forEach(function(e){
      var f = costs ? costs[e.meta.i] : edgeStateFactor(e.meta, day);
      var w = e.d * Math.pow(f, roadExp);
      if(personal) w *= 0.85 + 0.30*hash2(who*0.377+e.meta.ukey*0.0131, lifeVariant*2.3+5.7);
      var nd = dist[u]+w;
      if(nd<dist[e.to]){ dist[e.to]=nd; prev[e.to]=u; }
    });
  }
  if(dist[toIdx]===Infinity) return null;
  var path=[toIdx];
  while(prev[path[path.length-1]]!==-1) path.push(prev[path[path.length-1]]);
  path.reverse();
  return path;
}

/* Builds a walkable polyline from one exact world point to another, routed
   via the street graph: door-exit spurs onto the graph at each end, a
   person-weighted legal chain of street segments between, obstacle detours
   applied to every segment. opt = {day, who} — omitted (legacy callers)
   falls back to the current simDay and a neutral route. */
function buildRoutePoly(x0,z0,x1,z1,opt){
  opt = opt||{};
  var day = opt.day!=null ? opt.day : (typeof simDay!=="undefined" ? simDay : 0);
  var who = opt.who!=null ? opt.who : -1;
  var mDay = _walkRevealHorizon(day); // avoid anything standing by bucket end — no mid-bucket clipping
  var d0 = walkExitPoint(x0,z0,mDay), d1 = walkExitPoint(x1,z1,mDay);
  var n0 = nearestGraphNode(d0?d0.x:x0, d0?d0.z:z0), n1 = nearestGraphNode(d1?d1.x:x1, d1?d1.z:z1);
  var nodePath = graphPathWeighted(n0,n1,day,who);
  // An indoor endpoint (homePos in a cottage, a shop worksite) is replaced
  // by its DOOR point: the rendered walk is door -> street -> door, and no
  // walking figure ever samples inside a footprint. The step across the
  // wall plane happens off-stage (the schedule's stationary anchor states
  // render at the interior anchor = indoors, hidden under the roof).
  var pts = [d0 || {x:x0,z:z0}];
  if(nodePath){ nodePath.forEach(function(ni){ pts.push({x:STREET_GRAPH.nodes[ni].x, z:STREET_GRAPH.nodes[ni].z}); }); }
  else { pts.push({x:STREET_GRAPH.nodes[n0].x, z:STREET_GRAPH.nodes[n0].z}); pts.push({x:STREET_GRAPH.nodes[n1].x, z:STREET_GRAPH.nodes[n1].z}); }
  pts.push(d1 || {x:x1,z:z1});
  // SPUR REJOIN (s59): a door connected only to the NEAREST NODE makes a
  // walker overshoot along the street and double back. Instead, leave/join
  // the road at the closest PASSING POINT: project each terminal anchor
  // onto the route's earlier segments; if truncating there saves real
  // distance, cut the route at the projection (plausible corner-cutting at
  // the joints only — mid-route stays on the roads). Any blocked hop from
  // the projection to the door is detoured by walkAdjustPts below — which
  // IS the natural walk around the building to its entrance.
  function segProj(px,pz, a,b){
    var dx=b.x-a.x, dz=b.z-a.z, l2=dx*dx+dz*dz;
    var t = l2>0 ? clamp(((px-a.x)*dx+(pz-a.z)*dz)/l2, 0, 1) : 0;
    var qx=a.x+dx*t, qz=a.z+dz*t;
    return { x:qx, z:qz, d:Math.hypot(px-qx,pz-qz) };
  }
  function pathLen(arr,i0,i1){ var L=0; for(var i=i0;i<i1;i++) L+=Math.hypot(arr[i+1].x-arr[i].x, arr[i+1].z-arr[i].z); return L; }
  function rejoinEnd(){
    if(pts.length<4) return;
    var endA = pts[pts.length-1], best=null, bi=-1;
    for(var i=0;i<pts.length-2;i++){
      var pr = segProj(endA.x,endA.z, pts[i], pts[i+1]);
      if(!best || pr.d<best.d){ best=pr; bi=i; }
    }
    if(!best) return;
    var saved = pathLen(pts, bi, pts.length-1) + 0
              - (Math.hypot(best.x-pts[bi].x,best.z-pts[bi].z) + best.d);
    if(saved>4){ pts = pts.slice(0,bi+1); pts.push({x:best.x,z:best.z}); pts.push(endA); }
  }
  function rejoinStart(){
    if(pts.length<4) return;
    var startA = pts[0], best=null, bi=-1;
    for(var i=1;i<pts.length-1;i++){
      var pr = segProj(startA.x,startA.z, pts[i], pts[i+1]);
      if(!best || pr.d<best.d){ best=pr; bi=i; }
    }
    if(!best) return;
    var saved = pathLen(pts, 0, bi+1)
              - (best.d + Math.hypot(pts[bi+1].x-best.x, pts[bi+1].z-best.z));
    if(saved>4){ var tail = pts.slice(bi+1); pts = [startA, {x:best.x,z:best.z}].concat(tail); }
  }
  rejoinEnd(); rejoinStart();
  for(var i=pts.length-2;i>=0 && pts.length>2;i--)
    if(Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].z-pts[i].z)<0.6) pts.splice(i+1,1);
  return buildPolyline(walkAdjustPts(pts, mDay), false);
}
/* A "wander" polyline for ambient (non-routine) extras: a random walk of
   street-graph hops from a random start node — no destination, but still
   100% graph-legal, so density-filler people respect the grid too.
   s59: each hop is now road-lifecycle-weighted (one rng draw per hop via a
   weighted CDF — the seeded draw COUNT is unchanged, so the build stream
   holds), so ambient strollers favor worn streets over ghost plat lines. */
function buildWanderPoly(rng, day){
  edgeMetaInit();
  if(day==null) day = 0;
  var cur = Math.floor(rng()*STREET_GRAPH.nodes.length), prev=-1;
  var pts = [{x:STREET_GRAPH.nodes[cur].x, z:STREET_GRAPH.nodes[cur].z}];
  var hops = 5+Math.floor(rng()*6);
  for(var i=0;i<hops;i++){
    var neigh = STREET_GRAPH.edges[cur];
    if(!neigh || neigh.length===0) break;
    var choices = neigh.filter(function(e){ return e.to!==prev; });
    if(choices.length===0) choices = neigh;
    var wts=[], tot=0, ci;
    for(ci=0;ci<choices.length;ci++){ var w=1/Math.pow(edgeStateFactor(choices[ci].meta, day), 1.4); wts.push(w); tot+=w; }
    var r=rng()*tot, pick=choices[choices.length-1];
    for(ci=0;ci<choices.length;ci++){ r-=wts[ci]; if(r<=0){ pick=choices[ci]; break; } }
    prev = cur; cur = pick.to;
    pts.push({x:STREET_GRAPH.nodes[cur].x, z:STREET_GRAPH.nodes[cur].z});
  }
  // wander polys live for the extra's WHOLE presence window and are never
  // rebuilt (rebuilding would teleport a mid-loop walker) — so they avoid
  // every obstacle that will EVER stand, not just this bucket's.
  return buildPolyline(walkAdjustPts(pts, 1e9), false);
}
function worldToGridApprox(x,z){
  // s77 GEODETIC LOCK: was its own inverse pinned at −VIOGET_SKEW (−6.5°),
  // which disagreed with gridToWorld's actual frame and mis-mapped every
  // world→grid lookup (nearestStreetPair labels, the fire-footprint test)
  // by the same 2.5° the frame fix removes. Now delegates to the ONE
  // canonical inverse (core/01-geography worldToGrid), so it can never
  // drift from gridToWorld again.
  return worldToGrid(x,z);
}
function nearestStreetPair(x,z){
  var g = worldToGridApprox(x,z);
  var bu=null,bud=1e18; Object.keys(GEO.streetsU).forEach(function(k){ var d=Math.abs(GEO.streetsU[k]-g.u); if(d<bud){bud=d;bu=k;} });
  var bv=null,bvd=1e18; Object.keys(GEO.streetsV).forEach(function(k){ var d=Math.abs(GEO.streetsV[k]-g.v); if(d<bvd){bvd=d;bv=k;} });
  return cap(bu)+" & "+cap(bv);
}

