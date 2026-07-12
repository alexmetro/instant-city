/* =====================================================================
   LAYER zones-tint (slot 3) — OWNS district/activity tint overlays. NEVER: ground texture. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 33 — district/activity tint overlays */
/* =========================================================================
   6. SEMANTIC ZOOM / DISTRICT TINTS (design addendum)
   Above ~zoomCartoFull altitude, individual buildings/tents crossfade out
   and a cartographic layer of tinted district zones + name labels (floating
   haloed .wlbl-zone text, §11 grammar) takes over, à la a period map legend; below
   ~zoomTrueScaleFull the true-scale world reads on its own and the tints
   are gone. Happy Valley's tint only appears once its tents do (1849).

   FIX (user-reported: tints were plain circles that crossed the shoreline,
   e.g. Happy Valley bleeding into the cove). Each zone is now a low-res
   grid mesh conforming to the real baked terrain (per-vertex height from
   terrainHeight(), same sampler as the ground/streets/buildings), with a
   per-vertex mask = radial falloff * land mask (land mask soft-thresholds
   on height so the tint truly ends at the coastline instead of a flat
   circle ignoring water) — a heightmap-masked mesh rather than a
   CircleGeometry disc. A screen-space-derivative rim (fwidth on the mask)
   darkens the tint right where that mask gradient is steep, giving the
   "period map legend" boundary stroke without a second ring mesh.
   ========================================================================= */
var DISTRICT_ZONES = [
  // `record` (s42 inspect law): what the record says about the place — shown
  // verbatim in the inspect panel when a tap lands inside the zone.
  { name:"THE VILLAGE",      cx:PLAZA_CENTER.x,      cz:PLAZA_CENTER.z,      r:360, color:0xcdb37a, revealDay:-1,
    record:"Yerba Buena — the trading village around the Plaza; ~200 souls at the July 1846 flag-raising, renamed San Francisco January 1847 (timeline-spine.md)." },
  { name:"MISSION DOLORES",  cx:OUTPOSTS.mission.x,  cz:OUTPOSTS.mission.z,  r:190, color:0x93a674, revealDay:-1,
    record:"Mission San Francisco de Asís (founded 1776) — the peninsula's oldest settlement, secularized under Mexico; a cluster of adobes by 1846 (peninsula-1846.md)." },
  // NATIVE PRESENCE sprint (s50): the documented remnant-community zone at
  // the Mission — the ONLY Native settlement anywhere on this map, because
  // the record documents no other ("no source documents an occupied
  // Yelamu/Ramaytush village, camp, or seasonal-use site anywhere in the
  // 1846-49 frame" — native-presence-1846-49.md §1, clm:native:3; a
  // confirmed silence, not an omission). endDay per clm:pen:32's
  // 1793-1848 window.
  { name:"THE RANCHERIA",    cx:(window.RANCHERIA_SITE?RANCHERIA_SITE.cx:OUTPOSTS.mission.x-85), cz:(window.RANCHERIA_SITE?RANCHERIA_SITE.cz:OUTPOSTS.mission.z-98),
    r:60, color:0xa9905d, revealDay:-1, endDay:eventDateToSimDay("1848-12-31"),
    record:"The former Indian rancheria at Mission Dolores, 'occupied by remaining Indians' through 1848 — the last dwelling place of the Ramaytush Ohlone remnant community (~15 descendants by 1842; about five families by 1850, per NPS/Milliken). No source documents Native settlement anywhere else on the peninsula in this period (peninsula-1846.md §2.1-2.2; native-presence-1846-49.md)." },
  { name:"THE PRESIDIO",     cx:OUTPOSTS.presidio.x, cz:OUTPOSTS.presidio.z, r:190, color:0x88a0ad, revealDay:-1,
    record:"The Mexican-era military post at the Golden Gate — garrisoned only thinly by 1846 (peninsula-1846.md)." },
  { name:"HAPPY VALLEY",     cx:900, cz:950,          r:440, color:0xd8a15c, revealDay:eventDateToSimDay("1849-01-10"),
    record:"The 1849 canvas city south of the cove — hundreds of tents pitched among the dunes and scrub as the rush crowds outran the town's rooms (demographics-society.md)." },
  // GAPS-2026-07-09 item 3 (1849 bible-tier events): the Chilean immigrant
  // encampment, site of the Hounds' July 15 1849 attack. s59 PLACEMENT FIX
  // (user-caught): the record is BLOCK-PRECISE, not vague —
  // demographics-society.md §"Little Chile (Chilecito)": "On the block
  // bounded by Montgomery, Kearny, Pacific, and Jackson Streets near
  // Telegraph Hill/Broadway" (modern plaque near Kearny & Columbus). This
  // supersedes the old "no lot-level position survives" note. Center is
  // DERIVED from the street grid (midpoint of that documented block via
  // gridToWorld) so it survives any future re-projection; radius ~ the
  // block. Revealed on ORIGINS' documented Chilean-arrival onset
  // (1848-10-25); Hounds record text kept.
  (function(){
    var pMid = gridToWorld((GEO.streetsU.kearny+GEO.streetsU.montgomery)/2, (GEO.streetsV.pacific+GEO.streetsV.jackson)/2);
    return { name:"LITTLE CHILE", cx:pMid.x, cz:pMid.z, r:65, color:0xb98a5a, revealDay:eventDateToSimDay("1848-10-25"),
      record:"Little Chile (Chilecito) — the Chilean quarter on the block bounded by Montgomery, Kearny, Pacific and Jackson Streets, at the base of Telegraph Hill — attacked and plundered by the Hounds, July 15 1849 (demographics-society.md §Little Chile; police-courts.md)." };
  })()
];
var RANCHERIA_END_DAY = eventDateToSimDay("1848-12-31"); // clm:pen:32 — the rancheria's documented occupancy window closes with 1848
var ZONE_GRID_RES = 28; // (res+1)^2 verts per zone, land-masked once at build time
var zoneVert = [
  "#include <common>",
  "#include <logdepthbuf_pars_vertex>",
  "attribute float aMask;",
  "varying float vMask;",
  "void main(){",
  "  vMask = aMask;",
  "  vec4 mv = modelViewMatrix*vec4(position,1.0);",
  "  gl_Position = projectionMatrix*mv;",
  "  #include <logdepthbuf_vertex>",
  "}"
].join("\n");
var zoneFrag = [
  "#include <common>",
  "#include <logdepthbuf_pars_fragment>",
  "uniform vec3 uColor;",
  "uniform vec3 uRim;",
  "uniform float uOpacity;",
  "uniform float uNightFactor;", // NIGHT-GLOW fix (2026-07-10): see updateDistrictZones()
  "varying float vMask;",
  "void main(){",
  "  #include <logdepthbuf_fragment>",
  "  float edge = clamp(fwidth(vMask)*4.0, 0.0, 1.0);", // steep-gradient rim (real coastline/radial edge)
  "  vec3 col = mix(uColor, uRim, edge*0.85);",
  "  col *= mix(1.0, 0.14, uNightFactor);", // same order of magnitude as terrain's night ambient/hemi falloff
  "  gl_FragColor = vec4(col, vMask*uOpacity);",
  "}"
].join("\n");
function buildZoneGeometry(z){
  var res = ZONE_GRID_RES, half = z.r*1.15;
  var positions = [], masks = [];
  for(var j=0;j<=res;j++){
    for(var i=0;i<=res;i++){
      var lx = lerp(-half, half, i/res), lz = lerp(-half, half, j/res);
      var wx = z.cx+lx, wz = z.cz+lz;
      var h = terrainHeight(wx,wz);
      var dist = Math.hypot(lx,lz);
      var radial = 1-smoothstep(z.r*0.62, z.r, dist);
      // land mask raised to the HIGH-TIDE line (s22 shoreline truth): the
      // old -0.4..1.6 ramp straddled the new rippled intertidal mud band,
      // so the mask fluctuated per vertex across the flats and the
      // fwidth() rim shader drew dark diamond edges over the whole zone
      // (the Feb-1849 Happy Valley tint read as terrain corruption).
      // Districts are dry-land concepts: mask starts above the mud.
      var land = smoothstep(0.5, 2.2, h);
      positions.push(wx, h+1.0, wz);
      masks.push(radial*land);
    }
  }
  var indices = [];
  for(var j2=0;j2<res;j2++){
    for(var i2=0;i2<res;i2++){
      var a=j2*(res+1)+i2, b=a+1, c=a+res+1, d=c+1;
      indices.push(a,c,b, b,c,d);
    }
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute("aMask", new THREE.Float32BufferAttribute(masks,1));
  geo.setIndex(indices);
  return geo;
}
(function buildDistrictTints(){
  var hudEl = document.getElementById("hud");
  DISTRICT_ZONES.forEach(function(z){
    var geo = buildZoneGeometry(z);
    var col = new THREE.Color(z.color);
    var rim = col.clone().lerp(new THREE.Color(0x2b1d0e), 0.55);
    var mat = new THREE.ShaderMaterial({
      uniforms:{ uColor:{value:col}, uRim:{value:rim}, uOpacity:{value:0}, uNightFactor:{value:0} },
      vertexShader:zoneVert, fragmentShader:zoneFrag,
      transparent:true, depthWrite:false,
      extensions:{ derivatives:true }
    });
    var mesh = new THREE.Mesh(geo,mat); scene.add(mesh);
    z.tintMesh = mesh;
    // §11 grammar: neighborhoods/zones = letter-spaced caps in a softer
    // sepia, floating haloed text (the old parchment chip is gone).
    var el = document.createElement("div"); el.className="wlbl wlbl-zone"; el.textContent=z.name;
    hudEl.appendChild(el); z.el = el;
    z.pos = new THREE.Vector3(z.cx, terrainHeight(z.cx,z.cz)+80, z.cz);
  });
})();
var zoneLabelEls = DISTRICT_ZONES.map(function(z){ return z.el; }); // fed to the shared declutter engine
var _zoneV = new THREE.Vector3();
function updateDistrictZones(alt){
  var cartoT = smoothstep(CFG.zoomTrueScaleFull, CFG.zoomCartoFull, alt);
  // s50: rancheria structures render only through their documented window
  // (clm:pen:32, occupied 1793-1848) — same simDay gate as the zone below.
  if(window.RANCHERIA_MESH) RANCHERIA_MESH.visible = simDay<=RANCHERIA_END_DAY;
  DISTRICT_ZONES.forEach(function(z){
    var revealed = (z.revealDay<0 || simDay>=z.revealDay) && (z.endDay==null || simDay<=z.endDay);
    var op = revealed ? cartoT : 0;
    // TIMELAPSE GROUND ABSTRACTION (fix sprint 2026-07-11 #4): a subtle
    // district activity glow joins the dimmed figure flow at ground-level
    // timelapse (groundAbstraction, set in updatePeople) — activity reads
    // as place, not as zipping individuals.
    var glowOp = op*0.42 + (revealed ? groundAbstraction*0.10 : 0);
    z.tintMesh.material.uniforms.uOpacity.value = glowOp;
    z.tintMesh.material.uniforms.uNightFactor.value = nightFactor; // NIGHT-GLOW fix (2026-07-10): these were a raw unlit ShaderMaterial — full brightness at any hour, reading as a glowing halo/disc at night. nightFactor is the same day/night global updateDayNight() already drives terrain/splat dimming from.
    z.tintMesh.visible = glowOp>0.004;
    // §11 zoom choreography: zone NAMES hand the very high band off to the
    // region labels (updateLabels) — cross-fade out above ~2000m. The tint
    // itself keeps its period-map-legend behavior unchanged.
    var zoneLabelFade = 1 - smoothstep(2000, 3000, alt);
    if(op*zoneLabelFade<0.01){ z.el.style.opacity=0; return; }
    _zoneV.copy(z.pos).applyMatrix4(camera.matrixWorldInverse);
    if(_zoneV.z>-1){ z.el.style.opacity=0; return; }
    _zoneV.copy(z.pos).project(camera);
    if(_zoneV.x<-1.05||_zoneV.x>1.05||_zoneV.y<-1.05||_zoneV.y>1.05){ z.el.style.opacity=0; return; }
    z.el.style.opacity = op*zoneLabelFade*0.95;
    z.el.style.left = ((_zoneV.x*0.5+0.5)*window.innerWidth)+"px";
    z.el.style.top = ((-_zoneV.y*0.5+0.5)*window.innerHeight)+"px";
  });
  var structOpacity = 1-cartoT*0.88;
  buildingsMesh.material.opacity = structOpacity;
  growthBuildingMesh.material.opacity = structOpacity;
  growthMaterialsMesh.material.opacity = structOpacity;
  growthFrameMesh.material.opacity = structOpacity;
  growthWallsMesh.material.opacity = structOpacity;
  tentMesh.material.opacity = structOpacity;
}

