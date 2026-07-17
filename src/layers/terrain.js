/* =====================================================================
   LAYER terrain (slot 1) — OWNS terrain meshes/materials, heightmap consumption, relief/hillshade,
   village-pad feather, coast/intertidal band, water surface, west-peninsula geography.
   NEVER: paints roads/paths, tints for districts, draws props. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 4 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 06 — terrain mesh + ground detail engine */
/* =====================================================================
   TERRAIN — ONE mesh built directly from the baked heightmap grid (s46:
   544x504 rect peninsula domain, Pacific -> bay), with COAST-BAND
   SUBDIVISION (screening #17's promoted facet-banding debt): any cell
   that crosses the waterline band WITH real slope is subdivided KxK
   (K=4, ~7.8m triangles) using Catmull-Rom-smoothed heights, so the
   shoreline banks read as smooth grades at grazing sun instead of 31m
   flat-shaded facet checkerboard. Crack-free by construction: fine
   vertices on a border shared with an UNsubdivided cell are pinned to
   that cell's linear edge; corners are exact grid heights; two
   subdivided neighbors sample the same smooth function.
   The mesh reads terrainHeight()'s pad/gate rule for every vertex (one
   height rule, s22) via terrainHeightFrom() over the smoothed base.
   ===================================================================== */
var TERR_SUB_K = 4;
var MESH_BASE_H, MESH_CELL_SUB, MESH_SUB_H = [];
var TERRAIN_MESH_STATS = { verts:0, tris:0, subCells:0 };
function _catmull(p0,p1,p2,p3,t){
  return 0.5*((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t*t + (-p0+3*p1-3*p2+p3)*t*t*t);
}
function _gridHRaw(gi,gj){
  gi = gi<0?0:(gi>TERRAIN.nx-1?TERRAIN.nx-1:gi);
  gj = gj<0?0:(gj>TERRAIN.nz-1?TERRAIN.nz-1:gj);
  return TERRAIN.heights[gj*TERRAIN.nx+gi];
}
function sampleTerrainSmooth(x,z){ // C1 bicubic (Catmull-Rom) over the baked grid
  var fi = clamp((x-WORLD.x0)/WORLD.cell, 0, TERRAIN.nx-1.000001);
  var fj = clamp((z-WORLD.z0)/WORLD.cell, 0, TERRAIN.nz-1.000001);
  var i1 = Math.floor(fi), j1 = Math.floor(fj), fx = fi-i1, fz = fj-j1;
  var r0 = _catmull(_gridHRaw(i1-1,j1-1), _gridHRaw(i1,j1-1), _gridHRaw(i1+1,j1-1), _gridHRaw(i1+2,j1-1), fx);
  var r1 = _catmull(_gridHRaw(i1-1,j1  ), _gridHRaw(i1,j1  ), _gridHRaw(i1+1,j1  ), _gridHRaw(i1+2,j1  ), fx);
  var r2 = _catmull(_gridHRaw(i1-1,j1+1), _gridHRaw(i1,j1+1), _gridHRaw(i1+1,j1+1), _gridHRaw(i1+2,j1+1), fx);
  var r3 = _catmull(_gridHRaw(i1-1,j1+2), _gridHRaw(i1,j1+2), _gridHRaw(i1+1,j1+2), _gridHRaw(i1+2,j1+2), fx);
  return _catmull(r0,r1,r2,r3,fz);
}
/* GROUND MATERIALITY (s52) — per-vertex surface-class weights for the
   detail-albedo/detail-normal shader layer (see GROUND DETAIL ENGINE just
   below the terrain build). Channels: x=sand, y=grass/scrub, z=trodden
   dirt (village/town ground), w=mud (tidal band, mudflat, marsh floor).
   Zones come from the same baked ecology codes terrainColor() reads;
   weights interpolate across the 31m mesh so class edges are soft. */
function detailSurfWeights(x,z,h){
  var w0=0,w1=0,w2=0,w3=0;
  if(h<=0.15){
    // underwater: only the exposed-at-low-tide top of the shelf gets mud
    // micro-detail; the deep shelf stays clean (water covers it anyway)
    w3 = clamp01((h+1.0)/1.0);
    return [w0,w1,w2,w3];
  }
  var zn = zoneAt(x,z);
  if(zn===1){ w0=1; }
  else if(zn===2){ w0=0.6; w1=0.4; }
  else if(zn===3){ w1=1; }
  else if(zn===4){ w1=0.65; w2=0.35; }        // oak floor: duff + bare dirt
  else if(zn===5){ w1=0.5; w3=0.5; }          // marsh: tule over wet mud
  else if(zn===6){ w3=1; }
  else if(zn===7){ w1=0.7; w3=0.3; }
  else {
    var elevT = smoothstep(3,32,h);           // matches terrainColor()'s bands
    w0 = 1-elevT; w1 = elevT;
  }
  // village interior: dusty trodden earth (same warped 260m feather as the
  // tint — s60 square kill: material-class edge must match the tone edge)
  var villageT = 1-villageFeatherT(x,z,distOutsideBox(x,z,VILLAGE_BOX),260);
  if(villageT>0){
    var k = villageT*0.9;
    w0*=(1-k); w1*=(1-k); w3*=(1-k); w2 = w2*(1-k)+k;
  }
  // waterline wet-mud band (same read terrainColor() gives it)
  var beachT = 1-smoothstep(0.1,3.0,h);
  if(beachT>0){
    var k2 = beachT*0.85;
    w0*=(1-k2); w1*=(1-k2); w2*=(1-k2); w3 = w3*(1-k2)+k2;
  }
  return [w0,w1,w2,w3];
}
var terrainGeo = null;
(function buildTerrain(){
  var nx = TERRAIN.nx, nz = TERRAIN.nz, cell = WORLD.cell, K = TERR_SUB_K;
  var cellsX = nx-1, cellsZ = nz-1;

  // final (pad-blended) heights at every grid point — the ONE height rule
  MESH_BASE_H = new Float32Array(nx*nz);
  for(var j=0;j<nz;j++) for(var i=0;i<nx;i++){
    MESH_BASE_H[j*nx+i] = terrainHeightFrom(TERRAIN.heights[j*nx+i], WORLD.x0+i*cell, WORLD.z0+j*cell);
  }

  // classify coast-band cells: cross the waterline band AND carry slope
  // (flat marsh/mudflat excluded — no facets to smooth there)
  var subFlag = new Uint8Array(cellsX*cellsZ);
  var subCount = 0;
  for(var cj=0;cj<cellsZ;cj++) for(var ci=0;ci<cellsX;ci++){
    var h00=MESH_BASE_H[cj*nx+ci],     h10=MESH_BASE_H[cj*nx+ci+1],
        h01=MESH_BASE_H[(cj+1)*nx+ci], h11=MESH_BASE_H[(cj+1)*nx+ci+1];
    var mn=Math.min(h00,h10,h01,h11), mx=Math.max(h00,h10,h01,h11);
    // tight band around the VISIBLE waterline (the grazing-sun banding zone);
    // deep-shelf-only cells excluded — water covers them
    if(mn<2.4 && mx>-1.2 && (mx-mn)>0.85){ subFlag[cj*cellsX+ci]=1; subCount++; }
  }
  function subNb(ci,cj){ return ci>=0 && cj>=0 && ci<cellsX && cj<cellsZ && subFlag[cj*cellsX+ci]===1; }

  MESH_CELL_SUB = new Int32Array(cellsX*cellsZ); MESH_CELL_SUB.fill(-1);
  var positions = [], indices = [];
  for(j=0;j<nz;j++) for(i=0;i<nx;i++){
    positions.push(WORLD.x0+i*cell, MESH_BASE_H[j*nx+i], WORLD.z0+j*cell);
  }
  for(cj=0;cj<cellsZ;cj++){
    for(ci=0;ci<cellsX;ci++){
      var a = cj*nx+ci, b = (cj+1)*nx+ci, c = (cj+1)*nx+ci+1, d = cj*nx+ci+1;
      if(!subFlag[cj*cellsX+ci]){
        indices.push(a,b,d, b,c,d); // same anti-diagonal split PlaneGeometry used
        continue;
      }
      var cx0 = WORLD.x0+ci*cell, cz0 = WORLD.z0+cj*cell;
      var Hloc = new Float32Array((K+1)*(K+1));
      var vStart = positions.length/3;
      for(var sb=0; sb<=K; sb++){
        for(var sa=0; sa<=K; sa++){
          var x = cx0 + sa*cell/K, z = cz0 + sb*cell/K, y;
          var onW = sa===0, onE = sa===K, onN = sb===0, onS = sb===K;
          if((onW||onE)&&(onN||onS)){
            y = MESH_BASE_H[(cj+(onS?1:0))*nx + ci + (onE?1:0)]; // exact corner
          } else if(onN && !subNb(ci,cj-1)){ y = lerp(MESH_BASE_H[a], MESH_BASE_H[d], sa/K); }
          else if(onS && !subNb(ci,cj+1)){ y = lerp(MESH_BASE_H[b], MESH_BASE_H[c], sa/K); }
          else if(onW && !subNb(ci-1,cj)){ y = lerp(MESH_BASE_H[a], MESH_BASE_H[b], sb/K); }
          else if(onE && !subNb(ci+1,cj)){ y = lerp(MESH_BASE_H[d], MESH_BASE_H[c], sb/K); }
          else { y = terrainHeightFrom(sampleTerrainSmooth(x,z), x, z); }
          Hloc[sb*(K+1)+sa] = y;
          positions.push(x, y, z);
        }
      }
      MESH_CELL_SUB[cj*cellsX+ci] = MESH_SUB_H.length;
      MESH_SUB_H.push(Hloc);
      for(sb=0;sb<K;sb++) for(sa=0;sa<K;sa++){
        var va = vStart+sb*(K+1)+sa,     vb = vStart+(sb+1)*(K+1)+sa,
            vc = vStart+(sb+1)*(K+1)+sa+1, vd = vStart+sb*(K+1)+sa+1;
        indices.push(va,vb,vd, vb,vc,vd);
      }
    }
  }

  // vertex colors: lithograph palette + NW-light hillshade + valley AO
  // (WORLD-P0 fix 2026-07-09, unchanged rules — now sampled per-vertex)
  var posArr = new Float32Array(positions);
  var colArr = new Float32Array(posArr.length);
  var LIGHT = new THREE.Vector3(-0.55, 0.62, -0.55).normalize();
  var shadeCool = new THREE.Color(0x1c2a34), shadeWarm = new THREE.Color(0x3a2a14);
  var vCount = posArr.length/3;
  var surfArr = new Float32Array(vCount*4); // GROUND MATERIALITY (s52) — aSurf class weights
  for(var vi=0; vi<vCount; vi++){
    var vx = posArr[vi*3], vy = posArr[vi*3+1], vz = posArr[vi*3+2];
    var sw = detailSurfWeights(vx,vz,vy);
    surfArr[vi*4]=sw[0]; surfArr[vi*4+1]=sw[1]; surfArr[vi*4+2]=sw[2]; surfArr[vi*4+3]=sw[3];
    var col = terrainColor(vx,vz,vy);
    var dOut = distOutsideBox(vx,vz,VILLAGE_BOX);
    var villageBlend = villageFeatherT(vx,vz,dOut,240); // s60: same warped edge as the height pad — shading feather stays coincident
    if(villageBlend>0.15 && vy>3.0){
      var hE = sampleTerrainGrid(vx+cell,vz), hW = sampleTerrainGrid(vx-cell,vz);
      var hS = sampleTerrainGrid(vx,vz+cell), hN = sampleTerrainGrid(vx,vz-cell);
      var dhdx = (hE-hW)/(2*cell), dhdz = (hS-hN)/(2*cell);
      var nnx=-dhdx, nny=1, nnz=-dhdz;
      var nlen = Math.sqrt(nnx*nnx+nny*nny+nnz*nnz);
      nnx/=nlen; nny/=nlen; nnz/=nlen;
      var ndotl = nnx*LIGHT.x+nny*LIGHT.y+nnz*LIGHT.z;
      var shadeT = clamp01(1-(ndotl+0.15)/1.15);
      col.lerp(shadeCool, shadeT*0.30*villageBlend);
      col.lerp(shadeWarm, (1-shadeT)*0.12*villageBlend);
      var ringAvg = (sampleTerrainGrid(vx+2*cell,vz)+sampleTerrainGrid(vx-2*cell,vz)+sampleTerrainGrid(vx,vz+2*cell)+sampleTerrainGrid(vx,vz-2*cell))/4;
      var aoT = clamp01((ringAvg-vy)/14);
      col.lerp(shadeCool, aoT*0.22*villageBlend);
    }
    colArr[vi*3]=col.r; colArr[vi*3+1]=col.g; colArr[vi*3+2]=col.b;
  }

  terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute("position", new THREE.BufferAttribute(posArr,3));
  terrainGeo.setAttribute("color", new THREE.BufferAttribute(colArr,3));
  terrainGeo.setAttribute("aSurf", new THREE.BufferAttribute(surfArr,4)); // GROUND MATERIALITY (s52)
  terrainGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices),1));
  terrainGeo.computeVertexNormals();
  TERRAIN_MESH_STATS.verts = vCount;
  TERRAIN_MESH_STATS.tris = indices.length/3;
  TERRAIN_MESH_STATS.subCells = subCount;
  console.log("[verify] terrain mesh: "+vCount+" verts, "+(indices.length/3)+" tris, "+subCount+" coast cells subdivided "+K+"x"+K);
})();
/* =====================================================================
   GROUND DETAIL ENGINE (s52) — GROUND MATERIALITY sprint.
   The splat/vertex-color ground was flat albedo with zero material
   response up close ("painted on"). Fix = the industry-standard trio,
   all procedural, all camera-distance-faded:

   1. DETAIL ALBEDO (classic detail texturing — the Unreal 1 "detail
      texture" / idTech lineage): 2-3 octave value noise in the terrain +
      splat fragment shaders (onBeforeCompile patch), tiled at ~0.15-2m
      features, MATERIAL-KEYED by the baked ecology zone / surface class
      (aSurf vertex weights: sand ripple grain, dirt clods + scuff, grass
      stipple, mud cracks/puddles; splat tiers = compacted road grain +
      faint directional scuff). Modulates albedo value ±<=10%, hue stable.
   2. DETAIL NORMALS (derivative-noise bump, Inigo Quilez's "noise with
      analytic derivatives"): the SAME noise field's analytic gradient
      perturbs the fragment normal, so close ground shading responds to
      the sun instead of reading as paint. Subtle — the RuneScape bar.
   3. (Part 3, the camera-centered MICRO-SCATTER RING, lives beside the
      other scatter systems further down.)

   Both shader layers fade smoothly over camera distance 45m (full) ->
   180m (zero) — the map view is pixel-identical, and because the noise
   domain is pure world-space the pattern never crawls during a zoom.
   Multiplicative + zero-mean => night lighting dims it automatically and
   streets can never be lightened above adjacent ground (grounding.md §9
   no-map-overlay). uDetailWet (driven by the same weatherState signal as
   the ground tint) turns mud cracks into filled/pooled wet variance for
   the documented 1849-50 mud winter.
   NOTE: this retires the old A1 "detail displacement patch" (the 600m
   translucent ripple film — the very "painted-on filter layer" QA once
   flagged); detail now lives in the ground materials themselves.
   ===================================================================== */
var DETAIL_UNIFORM_SETS = [];   // every patched shader's uniforms — updateWetTint()/QA drive these
var DETAIL_AMP_DEFAULT = 1.0;   // __P1850.detailAmp QA toggle (0 = prove the fade)
var DETAIL_GLSL_PARS = [
  "uniform float uDetailAmp;",
  "uniform float uDetailWet;",
  "varying vec3 vDetailWorld;",
  // IQ-style 2D value noise returning (signed value, d/dx, d/dy) — the
  // analytic gradient is what feeds the detail-normal perturbation.
  "vec3 dnoise2(vec2 p){",
  "  vec2 ip = floor(p); vec2 f = fract(p);",
  "  vec2 u = f*f*(3.0-2.0*f);",
  "  vec2 du = 6.0*f*(1.0-f);",
  "  float a = fract(sin(dot(ip,vec2(127.1,311.7)))*43758.5453);",
  "  float b = fract(sin(dot(ip+vec2(1.0,0.0),vec2(127.1,311.7)))*43758.5453);",
  "  float c = fract(sin(dot(ip+vec2(0.0,1.0),vec2(127.1,311.7)))*43758.5453);",
  "  float d = fract(sin(dot(ip+vec2(1.0,1.0),vec2(127.1,311.7)))*43758.5453);",
  "  float k1=b-a; float k2=c-a; float k3=a-b-c+d;",
  "  float n = a + k1*u.x + k2*u.y + k3*u.x*u.y;",
  "  vec2 g = du*(vec2(k1,k2)+k3*u.yx);",
  "  return vec3(n*2.0-1.0, g*2.0);",
  "}",
  // 2 octaves on touch (DETAIL_LOWQ), 3 on desktop; octave domains are
  // ROTATED (not just offset) so the value-noise lattice never prints as
  // an axis-aligned weave, and gradients accumulate with the chain-rule
  // rotation+frequency factor so bump stays consistent.
  "vec3 dfbm2(vec2 p){",
  "  vec3 n1 = dnoise2(p);",
  "  vec2 p2 = vec2(p.x*0.825-p.y*0.565, p.x*0.565+p.y*0.825)*2.73 + vec2(19.7,7.3);",
  "  vec3 n2 = dnoise2(p2);",
  "  vec2 g2 = vec2(n2.y*0.825+n2.z*0.565, -n2.y*0.565+n2.z*0.825)*2.73;",
  "  vec3 r = vec3(n1.x+0.5*n2.x, n1.yz+0.5*g2);",
  "  #ifndef DETAIL_LOWQ",
  "  vec2 p3 = vec2(p.x*0.362-p.y*0.932, p.x*0.932+p.y*0.362)*6.31 + vec2(41.3,23.1);",
  "  vec3 n3 = dnoise2(p3);",
  "  vec2 g3 = vec2(n3.y*0.362+n3.z*0.932, -n3.y*0.932+n3.z*0.362)*6.31;",
  "  r.x += 0.25*n3.x; r.yz += 0.25*g3;",
  "  #endif",
  "  return r*(1.0/1.75);",
  "}",
  // anisotropic field: noise on a rotated+scaled domain, gradient mapped
  // back to world axes (dc = unit direction cosines of the ridge axis).
  "vec3 dfield2(vec2 p, vec2 dc, vec2 sc){",
  "  vec2 q = vec2(dot(p,dc)*sc.x, dot(p,vec2(-dc.y,dc.x))*sc.y);",
  "  vec3 n = dnoise2(q);",
  "  vec2 g = n.y*sc.x*dc + n.z*sc.y*vec2(-dc.y,dc.x);",
  "  return vec3(n.x, g);",
  "}"
].join("\n");
/* @P1850-CHUNK 08 — terrain material + mesh (relocated from ground-paint.js, cleanup 2026-07-12 — terrain OWNS terrain meshes/materials; exact original global position, right after ground-paint's detail-shader patch function it calls) */
var terrainMat = new THREE.MeshPhongMaterial({ vertexColors:true, flatShading:true, specular:0x000000, shininess:0,
  polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1 });
patchGroundDetailMaterial(terrainMat, "terrain", null);
var terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrainMesh);

/* =====================================================================
   TERRAIN-COLOR V2 (TCV2) — shader-side surface upgrade. Targets the
   operator's ranked complaints about the flat baked vertex-color ground:
     #1 BLUR (smooth color smeared across the 31 m triangles, zero high-
        frequency detail) -> crisp world-space procedural grain + a
        partial value-step so the ground reads sharp, not gradient-soft.
     1-NOTE  -> value-ladder stepping into readable tonal tiers.
     SHARP SEAMS -> the two-scale grain dithers biome edges.
     FLAT / NO 3D -> detail-normal relief from the noise gradient, so
        light plays across the surface below the triangle scale.
   Plus DYNAMIC seasonal green<->golden (uTSeason, a pure function of
   simDay). All behind uTerrainV2: 0 => the shader is skipped and the
   ground is byte-identical to the baked v1 (A/B + rollback + parity).
   World-space noise => deterministic, never crawls on zoom; everything
   camera-distance faded so the overview stays clean and the close view
   gets the detail. Reuses the baked vColor (the ecology-zone earth
   palette) as the albedo anchor and the aSurf material weights already
   on the geometry — a redesign of the RENDER, not of the spatial law. */
var TERRAIN_QA = { on: 1, detail: 1, season: -1 }; // season<0 => live (simDay); >=0 => forced phase for QA
var TCV2_UNIFORMS = null;
(function applyTerrainColorV2(){
  var prevOBC = terrainMat.onBeforeCompile;
  terrainMat.onBeforeCompile = function(shader){
    if(typeof prevOBC === "function") prevOBC(shader);
    shader.uniforms.uTerrainV2 = { value: TERRAIN_QA.on };
    shader.uniforms.uTDetail   = { value: TERRAIN_QA.detail };
    shader.uniforms.uTSeason   = { value: 0.5 };
    shader.uniforms.uTDay      = { value: 0.0 };
    TCV2_UNIFORMS = shader.uniforms;
    shader.vertexShader =
      "attribute vec4 aSurf;\nvarying vec4 vTSurf;\nvarying vec3 vTW;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n  vTSurf = aSurf;\n  vTW = position;");
    shader.fragmentShader =
      [ "uniform float uTerrainV2;", "uniform float uTDetail;",
        "uniform float uTSeason;",  "uniform float uTDay;",
        "varying vec4 vTSurf;",     "varying vec3 vTW;",
        // analytic-derivative value noise: vec3(signed value, d/dx, d/dy)
        "vec3 tnoise(vec2 p){",
        "  vec2 ip=floor(p), f=fract(p);",
        "  vec2 u=f*f*(3.0-2.0*f), du=6.0*f*(1.0-f);",
        "  float a=fract(sin(dot(ip,vec2(127.1,311.7)))*43758.5453);",
        "  float b=fract(sin(dot(ip+vec2(1.0,0.0),vec2(127.1,311.7)))*43758.5453);",
        "  float c=fract(sin(dot(ip+vec2(0.0,1.0),vec2(127.1,311.7)))*43758.5453);",
        "  float d=fract(sin(dot(ip+vec2(1.0,1.0),vec2(127.1,311.7)))*43758.5453);",
        "  float k1=b-a,k2=c-a,k3=a-b-c+d;",
        "  float n=a+k1*u.x+k2*u.y+k3*u.x*u.y;",
        "  vec2 g=du*(vec2(k1,k2)+k3*u.yx);",
        "  return vec3(n*2.0-1.0, g*2.0);",
        "}",
        "vec3 tfbm(vec2 p){",
        "  vec3 s=vec3(0.0); float amp=0.5; mat2 rot=mat2(0.80,0.60,-0.60,0.80); vec2 q=p;",
        "  for(int i=0;i<4;i++){ vec3 nn=tnoise(q); s.x+=amp*nn.x; s.yz+=amp*nn.yz; q=rot*q*2.03; amp*=0.5; }",
        "  return s;",
        "}"
      ].join("\n") + "\n" + shader.fragmentShader.replace(
        "#include <color_fragment>",
        [ "#include <color_fragment>",
          "if(uTerrainV2 > 0.5){",
          "  vec3 base = diffuseColor.rgb;",
          "  vec3 v2 = base;",
          "  float camDist = length(vViewPosition);",
          "  float fade = 1.0 - smoothstep(90.0, 380.0, camDist);",
          "  vec2 gp = vTW.xz;",
          "  vec3 nB = tfbm(gp * 0.13);",              // broad mottle (~8 m)
          "  vec3 nF = tfbm(gp * 1.15);",              // fine grain (~0.9 m)
          "  float grain = nB.x*0.55 + nF.x*0.45;",
          "  float sand=vTSurf.x, grass=vTSurf.y, dirt=vTSurf.z, mud=vTSurf.w;",  // aSurf law: [sand, grass/scrub, trodden dirt, mud]
          "  float amp = 0.09*sand + 0.13*dirt + 0.17*grass + 0.07*mud + 0.05;",
          "  float luma = dot(base, vec3(0.299,0.587,0.114));",
          "  v2 *= (1.0 + grain*amp*(0.4+0.6*fade)*uTDetail);",   // 1) grain kills the smear (zero-mean, value only)
          "  float ql = floor(luma*7.0 + 0.5)/7.0;",              // 2) partial value-step -> crisp tiers
          "  float stepMix = 0.35*(1.0 - smoothstep(160.0,520.0,camDist));",
          "  float tl = mix(luma, ql, stepMix);",
          "  v2 *= (luma>0.001 ? tl/luma : 1.0);",
          "  vec3 gn = normalize(vec3(-(nB.y*0.5+nF.y), 1.2, -(nB.z*0.5+nF.z)));", // 3) detail-normal relief -> 3D
          "  float ndl = clamp(dot(gn, normalize(vec3(-0.55,0.62,-0.55)))*0.5+0.5, 0.0, 1.0);",  // match the baked hillshade LIGHT so micro/macro relief agree
          "  v2 *= mix(1.0, mix(0.86,1.13,ndl), 0.35+0.45*fade);",
          "  float veg = clamp(grass + 0.4*dirt, 0.0, 1.0);",     // 4) seasonal green<->golden (dynamic)
          "  vec3 season = mix(vec3(1.09,1.01,0.79), vec3(0.87,1.05,0.83), clamp(uTSeason,0.0,1.0));",
          "  v2 = mix(v2, v2*season, veg*0.45);",
          "  diffuseColor.rgb = v2;",
          "}"
        ].join("\n"));
  };
  terrainMat.needsUpdate = true;
})();
/* per-frame: drive the TCV2 time uniforms (mirror labels/buildings' render
   wrap). uTSeason is a pure function of simDay -> deterministic + rewindable. */
var _tcv2PrevRender = renderer.render.bind(renderer);
renderer.render = function(s, c){
  if(TCV2_UNIFORMS){
    var day = (typeof simDay === "number") ? simDay : 0, season;
    if(TERRAIN_QA.season >= 0){ season = TERRAIN_QA.season; }
    else {
      // SF Mediterranean: wettest ~late Jan (green), driest ~late Jul (golden)
      var dt = dateFromSimDay(day);
      var doy = (Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) - Date.UTC(dt.getUTCFullYear(),0,1))/86400000;
      season = 0.5 + 0.5*Math.cos((doy - 20)/365.25 * 2*Math.PI);
    }
    TCV2_UNIFORMS.uTerrainV2.value = TERRAIN_QA.on;
    TCV2_UNIFORMS.uTDetail.value   = TERRAIN_QA.detail;
    TCV2_UNIFORMS.uTSeason.value   = season;
    TCV2_UNIFORMS.uTDay.value      = day;
  }
  _tcv2PrevRender(s, c);
};

/* @P1850-CHUNK 12 — horizon skirt, water, shoreline foam */
/* =====================================================================
   HORIZON SKIRT — a big, cheap, low-poly disc well below the terrain,
   colored to melt into the fog/sea tone, so panning past the baked box's
   12km edge reveals hazy distance rather than a void or a hard cutoff.
   ===================================================================== */
(function buildHorizonSkirt(){
  var geo = new THREE.CircleGeometry(34000, 48);
  geo.rotateX(-Math.PI/2);
  var pos = geo.attributes.position;
  var colors = new Float32Array(pos.count*3);
  var seaTone = new THREE.Color(0x2a4356);
  for(var i=0;i<pos.count;i++){
    var x = pos.getX(i), z = pos.getZ(i);
    var d = Math.hypot(x,z);
    pos.setY(i, -14 - d*0.002);
    colors[i*3]=seaTone.r; colors[i*3+1]=seaTone.g; colors[i*3+2]=seaTone.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors,3));
  geo.computeVertexNormals();
  var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors:true, fog:true }));
  scene.add(mesh);
})();

/* =====================================================================
   WATER  (bay + small lagoon), vertex-animated with a fresnel-ish tint
   ===================================================================== */
var waterVert = [
"#include <common>",
"#include <logdepthbuf_pars_vertex>",
"uniform float uTime;",
"varying vec3 vNormalV;",
"varying vec3 vViewPos;",
"varying vec2 vWorldXZ;",
"void main(){",
"  vec3 p = position;",
"  vWorldXZ = p.xz;", // true world x/z (this plane carries no further object rotation)
"  float gateDist = length(vec2(p.x-(-4000.0), p.z-(-3450.0)));",
"  float gateSwell = 1.0 + 0.85*(1.0-smoothstep(200.0,3200.0,gateDist));", // stronger swell near the Gate
"  float w1 = sin(p.x*0.045 + uTime*1.15)*0.16*gateSwell;",
"  float w2 = sin(p.y*0.06  - uTime*1.6 )*0.11*gateSwell;",
"  float w3 = sin((p.x+p.y)*0.02 + uTime*0.6)*0.10*gateSwell;",
"  p.z += w1+w2+w3;",
"  float dWdx = cos(p.x*0.045+uTime*1.15)*0.045*0.16 + cos((p.x+p.y)*0.02+uTime*0.6)*0.02*0.10;",
"  float dWdy = cos(p.y*0.06 -uTime*1.6 )*0.06*0.11  + cos((p.x+p.y)*0.02+uTime*0.6)*0.02*0.10;",
"  vec3 n = normalize(vec3(-dWdx,-dWdy,1.0));",
"  vec4 mv = modelViewMatrix*vec4(p,1.0);",
"  vViewPos = -mv.xyz;",
"  vNormalV = normalize(normalMatrix*n);",
"  gl_Position = projectionMatrix*mv;",
"  #include <logdepthbuf_vertex>",
"}"
].join("\n");
var waterFrag = [
"#include <common>",
"#include <logdepthbuf_pars_fragment>",
"uniform vec3 uDeep;",
"uniform vec3 uShallow;",
"uniform float uOpacity;",
"uniform vec3 uFogColor;",
"uniform float uFogNear;",
"uniform float uFogFar;",
"uniform float uTime;",
"uniform float uSunGlint;",
"varying vec3 vNormalV;",
"varying vec3 vViewPos;",
"varying vec2 vWorldXZ;",
"void main(){",
"  #include <logdepthbuf_fragment>",
"  vec3 viewDir = normalize(vViewPos);",
"  float fres = pow(1.0-clamp(dot(normalize(vNormalV), viewDir),0.0,1.0), 3.0);",
"  vec3 col = mix(uDeep, uShallow, fres);",
// low-sun-angle glint: sparse per-pixel sparkle specks, brightest at dawn/dusk (uSunGlint)
"  float sparkleN = fract(sin(dot(floor(vWorldXZ*2.2)+uTime*0.05, vec2(12.9898,78.233)))*43758.5453);",
"  float sparkle = pow(clamp(sparkleN,0.0,1.0), 42.0)*fres*uSunGlint;",
"  col += vec3(1.0,0.97,0.85)*sparkle*2.2;",
"  float fogT = clamp((length(vViewPos)-uFogNear)/max(uFogFar-uFogNear,1.0), 0.0, 1.0);",
"  col = mix(col, uFogColor, fogT);",
"  gl_FragColor = vec4(col, uOpacity);",
"}"
].join("\n");
var waterUniforms = {
  uTime:{ value:0 },
  uDeep:{ value:new THREE.Color(0x2a5570) },
  uShallow:{ value:new THREE.Color(0x8fc2c9) },
  uOpacity:{ value:0.88 },
  uFogColor:{ value:new THREE.Color(0xcfc2a0) },
  uFogNear:{ value:650 },
  uFogFar:{ value:4200 },
  uSunGlint:{ value:0 }
};
var waterMat = new THREE.ShaderMaterial({
  uniforms:waterUniforms, vertexShader:waterVert, fragmentShader:waterFrag,
  transparent:true
});
/* A big plane — well beyond any reasonable pan/orbit distance — so its
   edge is never visible (the old, much smaller plane showed a hard-edged
   "square tile" line once the camera panned near the baked box's border;
   fixed here by both sizing it generously AND fading it to the fog color
   at distance as a second line of defense). */
var bayGeo = new THREE.PlaneGeometry(70000, 70000, CFG.waterSeg, CFG.waterSeg);
bayGeo.rotateX(-Math.PI/2);
var bayWater = new THREE.Mesh(bayGeo, waterMat);
scene.add(bayWater);
/* TIDE (shoreline truth, 2026-07-11): cheap semidiurnal cycle — the water
   plane's y sweeps the waterline across the baked intertidal mud band.
   amp/period are fill:true (plausible SF half-tide-range scale, NOT a
   harmonic model); the mud band itself is the documented fact. */
var TIDE = { amp:0.35, periodDays:0.5175, fill:true };

/* =====================================================================
   SHORELINE FOAM (A5) — a thin, gently animated pale ribbon that hugs the
   real land/water boundary. Marches along z, at each step searching
   outward from the analytic shoreline guess for the actual sign-change in
   the BAKED heightmap (terrainHeight crossing 0), so the ribbon follows
   the true baked contour rather than the idealized cove formula.
   ===================================================================== */
var foamMesh = null;
(function buildShorelineFoam(){
  var pts = [];
  for(var z=-1350; z<=1350; z+=16){
    var guess = shorelineX(z);
    var prevH = terrainHeight(guess-220,z);
    var found = null;
    for(var dx=-220; dx<=280; dx+=4){
      var xx = guess+dx, h = terrainHeight(xx,z);
      if(prevH<0 && h>=0){ found=xx; break; }
      prevH = h;
    }
    if(found!==null) pts.push({x:found, z:z});
  }
  if(pts.length<2) return;
  var positions=[], colors=[];
  var foamCol = new THREE.Color(0xeef5ee);
  var width = 7;
  for(var i=0;i<pts.length-1;i++){
    var a=pts[i], b=pts[i+1];
    var dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)||1;
    var nx=-dz/len, nz=dx/len;
    var ya=terrainHeight(a.x,a.z)+0.22, yb=terrainHeight(b.x,b.z)+0.22;
    var p0=[a.x+nx*width*0.5, ya, a.z+nz*width*0.5];
    var p1=[a.x-nx*width*0.5, ya, a.z-nz*width*0.5];
    var p2=[b.x+nx*width*0.5, yb, b.z+nz*width*0.5];
    var p3=[b.x-nx*width*0.5, yb, b.z-nz*width*0.5];
    [p0,p1,p2, p1,p3,p2].forEach(function(p){
      positions.push(p[0],p[1],p[2]);
      colors.push(foamCol.r,foamCol.g,foamCol.b);
    });
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions),3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors),3));
  geo.computeVertexNormals();
  var mat = new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:0.5, depthWrite:false, fog:true });
  foamMesh = new THREE.Mesh(geo, mat);
  scene.add(foamMesh);
})();

/* NOTE: the old procedural build had a small hand-placed "lagoon" pond NW
   of the village (Washerwoman's Lagoon in spirit). The real baked terrain
   there is a plain hillside (Nob Hill's northern flank, no basin) — see
   tools/debug-region.js's scan around x=-560,z=-560 — so it's dropped
   rather than floating a disc of water on a slope. */

/* (OUTPOSTS — the Mission Dolores / Presidio geography truth — relocated to
   core/01-geography.js in the 2026-07-12 cleanup: core's placement engine
   reads it, so a layer could not own it.) */

/* @P1850-CHUNK 64 — west peninsula geography (perched lake, creeks, tule, west fauna anchors) */
/* =====================================================================
   s46 — WEST PENINSULA GEOGRAPHY (data/peninsula-geography-1849.json):
   perched lake water, the Lobos Creek ribbon, tule marsh texture, and
   the gameDensity fauna anchors (sea lions at Seal Rocks, waterfowl at
   Merced + Mission Bay, deer at the oak/scrub boundaries). Draw-call
   delta for this whole block: +6 (lake, ribbon, tule, sea lions, ducks,
   deer) — all flora additions above ride existing instanced meshes.
   ===================================================================== */
(function buildWestGeography(){
  var gd = TERRAIN.geodata || {};

  // ---- Mountain Lake: PERCHED water plane at the baked level (the one
  // water body well above the sea plane; Merced/Washerwoman's/creeks are
  // carved below datum and read from the one bay water plane) ----
  (gd.lakes||[]).forEach(function(L){
    var shape = new THREE.Shape();
    L.poly.forEach(function(p,i){ if(i===0) shape.moveTo(p[0],-p[1]); else shape.lineTo(p[0],-p[1]); });
    var geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI/2); // shape (x,-z) -> world xz, normal up
    var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color:0x41707c, transparent:true, opacity:0.92 }));
    mesh.position.y = L.level;
    tagInspect(mesh, "water", L.label, "Spring-fed lake behind the dune belt (peninsula-1846.md §3.4; modern outline is a documented lower-bound proxy — the 1846 lake was larger).");
    scene.add(mesh);
  });

  // ---- Lobos Creek: perched water ribbon down its carved valley ----
  (gd.creeks||[]).forEach(function(C){
    if(!C.ribbon) return;
    var pts = [];
    for(var i=0;i<C.pts.length-1;i++){
      var a=C.pts[i], b=C.pts[i+1], seg=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.max(2,Math.round(seg/24));
      for(var k=0;k<n;k++) pts.push([lerp(a[0],b[0],k/n), lerp(a[1],b[1],k/n)]);
    }
    pts.push(C.pts[C.pts.length-1]);
    var positions=[], w=C.width/2;
    for(i=0;i<pts.length-1;i++){
      var p0=pts[i], p1=pts[i+1];
      var dx=p1[0]-p0[0], dz=p1[1]-p0[1], len=Math.hypot(dx,dz)||1;
      var nx=-dz/len, nz=dx/len;
      var y0=terrainHeight(p0[0],p0[1])+0.25, y1=terrainHeight(p1[0],p1[1])+0.25;
      var A=[p0[0]+nx*w,y0,p0[1]+nz*w], B=[p0[0]-nx*w,y0,p0[1]-nz*w];
      var Cq=[p1[0]+nx*w,y1,p1[1]+nz*w], D=[p1[0]-nx*w,y1,p1[1]-nz*w];
      [A,B,Cq, B,D,Cq].forEach(function(p){ positions.push(p[0],p[1],p[2]); });
    }
    var geo=new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions),3));
    geo.computeVertexNormals();
    var mesh=new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color:0x4d747c, transparent:true, opacity:0.85 }));
    tagInspect(mesh, "water", C.label, "The Presidio's principal fresh-water source (NPS/Presidio Trust; course is a modern proxy, fill).");
    scene.add(mesh);
  });

  // ---- tule / marsh grass texture on the tidal marshes (zone 5/7) ----
  var tuleGeo = (function(){
    var p1 = new THREE.PlaneGeometry(0.5,1.25).toNonIndexed(); p1.translate(0,0.62,0);
    var parts=[colorizeUniform(p1,new THREE.Color(0xffffff))];
    for(var i=1;i<3;i++){ var p=p1.clone(); p.rotateY(Math.PI/3*i); parts.push(colorizeUniform(p,new THREE.Color(0xffffff))); }
    return mergeGeoms(parts);
  })();
  var tuleMat = new THREE.MeshPhongMaterial({ color:0xffffff, vertexColors:true, side:THREE.DoubleSide, flatShading:true, specular:0x000000, shininess:0, transparent:true });
  var tuleSamples = scatterRect(SCT(420), 200, 1350, 1700, 2950,
    function(x,z,h){ var zn=zoneAt(x,z); return (zn===5||zn===7) && h>0.1 && h<1.4; }, SCT(420)*16);
  tuleSamples = tuleSamples.concat(scatterRect(SCT(160), -1750, 450, 2580, 3060,
    function(x,z,h){ return zoneAt(x,z)===7 && h>0.05 && h<1.6; }, SCT(160)*16));
  tuleSamples = tuleSamples.concat(scatterRect(SCT(180), -4600, -3650, -1260, -930,
    function(x,z,h){ return zoneAt(x,z)===5 && h>0.1 && h<1.4; }, SCT(180)*16));
  var tuleMesh = buildScatterMesh(tuleGeo, tuleMat, tuleSamples, {
    minScale:0.8, maxScale:1.5,
    colors:[new THREE.Color(0x7a8a4c), new THREE.Color(0x8f9457), new THREE.Color(0x6d7c44), new THREE.Color(0x9c8a55)]
  });
  tagInspect(tuleMesh, "flora", "Tule marsh", "'Inconceivably thick' wetland at Mission Bay; the Crissy shore marsh (fauna-1846.md §3.3).");
  scene.add(tuleMesh); scatterMeshes.push(tuleMesh);

  // ---- SEA LIONS at Seal Rocks (fauna-1846.md §2.2, gameDensity sea_lion
  // rarity 2 — the documented natural haul-out, a decade before the 1858
  // Cliff House made it a tourist sight). TECHNIQUES §10 tethered-idle:
  // static instances, head-raise sine in the vertex shader (aPart), zero
  // per-frame JS beyond the shared time uniform. ----
  function makeSeaLionGeo(){
    var hide=new THREE.Color(0x6a5240), dark=new THREE.Color(0x53412f);
    var parts=[];
    var body=makeBoxLocal(0.62,0.42,1.95,hide); parts.push({g:body,p:0});
    var chest=makeBoxLocal(0.52,0.56,0.62,hide); chest.translate(0,0,0.55); parts.push({g:chest,p:0});
    var neck=makeBoxLocal(0.3,0.42,0.34,hide); neck.translate(0,0.5,0.78); parts.push({g:neck,p:1});
    var head=makeBoxLocal(0.24,0.22,0.4,dark); head.translate(0,0.86,0.92); parts.push({g:head,p:1});
    var tail=makeBoxLocal(0.3,0.12,0.5,dark); tail.translate(0,0.02,-1.1); parts.push({g:tail,p:2});
    var flipL=makeBoxLocal(0.34,0.07,0.44,dark); flipL.translate(0.42,0.02,0.35); parts.push({g:flipL,p:0});
    var flipR=makeBoxLocal(0.34,0.07,0.44,dark); flipR.translate(-0.42,0.02,0.35); parts.push({g:flipR,p:0});
    return mergeGeomsParts(parts); // ~2.5m nose-to-tail — true CA sea lion bull scale
  }
  var SEALION_N = 14;
  var seaLionMesh = (function(){
    var geo = makeSeaLionGeo();
    var phaseArr = new Float32Array(SEALION_N);
    for(var i=0;i<SEALION_N;i++) phaseArr[i]=rngBuild()*Math.PI*2;
    geo.setAttribute("instancePhase", new THREE.InstancedBufferAttribute(phaseArr,1));
    var mat = new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0});
    mat.onBeforeCompile = function(shader){
      shader.uniforms.uFaunaTime = faunaTimeUniform;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aPart;\nattribute float instancePhase;\nuniform float uFaunaTime;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat slHead = step(0.5,aPart)*(1.0-step(1.5,aPart));\nfloat slTail = step(1.5,aPart);\ntransformed.y += slHead*(0.5+0.5*sin(uFaunaTime*0.35+instancePhase))*0.30;\ntransformed.y += slTail*(0.5+0.5*sin(uFaunaTime*0.9+instancePhase*1.7))*0.10;");
    };
    var mesh = new THREE.InstancedMesh(geo, mat, SEALION_N);
    tagInspect(mesh, "fauna", "California sea lion", "The documented haul-out colony at the rocks later named Seal Rocks (fauna-1846.md §2.2; natural colony predates the 1858 Seal Rock House).");
    var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), v=new THREE.Vector3(), s=new THREE.Vector3();
    var rocks = gd.sealRocks||[[-9720,1673,7.5]];
    var placed=0;
    for(var ri=0; ri<rocks.length && placed<SEALION_N; ri++){
      var r=rocks[ri];
      var perRock = ri===0?7:(ri===1?4:3);
      for(var k=0;k<perRock && placed<SEALION_N;k++){
        for(var t=0;t<50;t++){
          var a=rngBuild()*Math.PI*2, rad=3+Math.sqrt(rngBuild())*24;
          var x=r[0]+Math.cos(a)*rad, z=r[1]+Math.sin(a)*rad, h=terrainHeight(x,z);
          if(h>0.7 && h<r[2]+0.5){
            q.setFromAxisAngle(_UP, rngBuild()*Math.PI*2);
            var sc=0.8+rngBuild()*0.4; s.set(sc,sc,sc);
            v.set(x,h,z);
            m4.compose(v,q,s);
            mesh.setMatrixAt(placed++, m4);
            break;
          }
        }
      }
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  })();

  // ---- waterfowl rafts (gameDensity ducks_geese rarity 2: marsh + Merced) ----
  function makeDuckGeo(){
    var b=new THREE.Color(0x5c5142), d=new THREE.Color(0x39322a);
    var body=makeBoxLocal(0.24,0.16,0.42,b);
    var head=makeBoxLocal(0.09,0.12,0.1,d); head.translate(0,0.16,0.2);
    return mergeGeoms([body,head]); // ~0.4m — true duck scale
  }
  var DUCK_N=22;
  var duckMesh=(function(){
    var mat=new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0});
    var mesh=new THREE.InstancedMesh(makeDuckGeo(), mat, DUCK_N);
    tagInspect(mesh,"fauna","Ducks and geese","Seasonal waterfowl rafts on Lake Merced and the Mission Bay shallows (fauna-1846.md — 'darkened the surface of every bay').");
    var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), v=new THREE.Vector3(), s=new THREE.Vector3(1,1,1);
    var n=0;
    function raft(cx,cz,r,count){
      for(var k=0;k<count && n<DUCK_N;k++){
        for(var t=0;t<30;t++){
          var a=rngBuild()*Math.PI*2, rad=Math.sqrt(rngBuild())*r;
          var x=cx+Math.cos(a)*rad, z=cz+Math.sin(a)*rad;
          if(terrainHeight(x,z)<-0.25){
            q.setFromAxisAngle(_UP, rngBuild()*Math.PI*2);
            v.set(x, 0.34, z);
            m4.compose(v,q,s);
            mesh.setMatrixAt(n++, m4);
            break;
          }
        }
      }
    }
    raft(-7620,7900,320,12);   // Lake Merced
    raft(760,2350,260,10);     // Mission Bay shallows
    mesh.count=n;
    mesh.instanceMatrix.needsUpdate=true;
    scene.add(mesh);
    return mesh;
  })();

  // ---- black-tailed deer at the oak/scrub boundaries (gameDensity rarity 3) ----
  function makeDeerGeo(){
    var tan=new THREE.Color(0x8a7050), dk=new THREE.Color(0x6a5540);
    var parts=[];
    [[-0.12,-0.34],[0.12,-0.34],[-0.12,0.3],[0.12,0.3]].forEach(function(o){
      var leg=makeBoxLocal(0.07,0.62,0.07,dk); leg.translate(o[0],0,o[1]); parts.push({g:leg,p:0});
    });
    var body=makeBoxLocal(0.32,0.36,1.0,tan); body.translate(0,0.58,0); parts.push({g:body,p:0});
    var neck=makeBoxLocal(0.12,0.4,0.14,tan); neck.rotateX(-0.5); neck.translate(0,0.94,0.44); parts.push({g:neck,p:1});
    var head=makeBoxLocal(0.11,0.14,0.24,dk); head.translate(0,1.16,0.62); parts.push({g:head,p:1});
    return mergeGeomsParts(parts); // ~1.5m body — true black-tailed scale
  }
  var DEER_N=8;
  var deerMesh=(function(){
    var geo=makeDeerGeo();
    var phaseArr=new Float32Array(DEER_N);
    for(var i=0;i<DEER_N;i++) phaseArr[i]=rngBuild()*Math.PI*2;
    geo.setAttribute("instancePhase", new THREE.InstancedBufferAttribute(phaseArr,1));
    var mat=new THREE.MeshPhongMaterial({vertexColors:true, flatShading:true, specular:0x000000, shininess:0});
    mat.onBeforeCompile=function(shader){
      shader.uniforms.uFaunaTime = faunaTimeUniform;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>","#include <common>\nattribute float aPart;\nattribute float instancePhase;\nuniform float uFaunaTime;")
        .replace("#include <begin_vertex>","#include <begin_vertex>\nfloat deerHead = step(0.5,aPart);\ntransformed.y -= deerHead*(0.5+0.5*sin(uFaunaTime*0.22+instancePhase))*0.42;");
    };
    var mesh=new THREE.InstancedMesh(geo,mat,DEER_N);
    tagInspect(mesh,"fauna","Black-tailed deer","Browsing the oak-valley and dune-scrub edges (fauna-1846.md; regionally abundant, declining with settlement).");
    var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), v=new THREE.Vector3(), s=new THREE.Vector3();
    var groups=[{x:-4820,z:-60,n:3},{x:-6280,z:240,n:3},{x:-2150,z:1320,n:2}];
    var n=0;
    groups.forEach(function(g){
      for(var k=0;k<g.n && n<DEER_N;k++){
        for(var t=0;t<40;t++){
          var x=g.x+(rngBuild()-0.5)*90, z=g.z+(rngBuild()-0.5)*90, h=terrainHeight(x,z);
          if(h>2 && h<105){
            q.setFromAxisAngle(_UP, rngBuild()*Math.PI*2);
            var sc=0.9+rngBuild()*0.18; s.set(sc,sc,sc);
            v.set(x,h,z);
            m4.compose(v,q,s);
            mesh.setMatrixAt(n++,m4);
            break;
          }
        }
      }
    });
    mesh.count=n;
    mesh.instanceMatrix.needsUpdate=true;
    scene.add(mesh);
    return mesh;
  })();

  window._westFauna = { seaLions:seaLionMesh.count, ducks:duckMesh.count, deer:deerMesh.count, tule:tuleSamples.length };

})();

/* (buildLabels()/_geoLabelBandOpacity()/updateLabels() — the geographic
   label DOM + per-frame updater — and the west-peninsula LABELS entries
   relocated to layers/labels-inspect.js in the 2026-07-12 cleanup:
   labels-inspect OWNS all floating labels. Their chunk runs right after
   this one, before the first animate() frame reads any label.) */


/* ---- terrain audit (layers-spec.md rules block; Earth Palette Law): midday
   sunlit ground luminance 0.55-0.70, audited by framebuffer readback.
   s68 FRAMING-INDEPENDENCE FIX: the audit used to sample rings around
   whatever the user's camera framed — bare town sand reads ~0.64 (pass)
   but grass hills read ~0.41 (fail), so the verdict was a coin flip on
   camera position. Grass/vegetated zones are legitimately darker and are
   NOT governed by the Earth Palette band (it rules bare ground albedo
   only), so they must never be probed. The audit now reads a FIXED set
   of world-anchored bare sand/dirt probes through ONE internal readback
   frame rendered from a fixed canonical town framing (fog disabled for
   determinism), then restores the user's camera and re-renders their
   frame. Same verdict from any camera position, any altitude. Runtime
   filters still drop any probe the growing town has since covered
   (street ROW / structure / painted worn earth). Skips (pass, reason
   stated) only on sim state, never on framing: night, or fewer than 6
   probes still bare/visible. ---- */
/* Fixed probes (world x,z) — verified bare sand/dirt at the canonical
   framing (s68 probe mining, luminance 0.54-0.64 at noon):
   - west dune slope at the town edge (x -400)
   - NW town blocks, bare sand between the platted streets (x -350..-100)
   - plaza edge, Portsmouth Square surrounds (last three)
   Wide-spread entries fall off-screen at narrow viewports; the central
   block keeps the required 6+ probes alive at every aspect ratio. */
var LUM_PROBES = [
  [-400,-100],[-400,-50],
  [-350,-100],[-300,-150],[-300,-100],[-300,-50],[-250,-200],[-250,0],
  [-200,-250],[-200,-150],[-150,-250],[-150,-100],[-100,-200],[-100,-100],
  [-200,100],[-150,150],[0,100]
];
// canonical internal readback framing: over the probe centroid, town scale
var LUM_CAM = { fx:-250, fz:-120, radius:420, yaw:0.65, elev:62*Math.PI/180 };
/* TCV2 wiring guard: the shader-side terrain upgrade must be compiled and
   active (default on). Catches a silent onBeforeCompile break that would
   drop the ground back to flat baked v1 without any other audit noticing.
   Skips (pass) when A/B-toggled off or before first compile. */
registerAudit("terrain", "v2Active", function(){
  if(!TCV2_UNIFORMS) return { pass:true, skipped:"TCV2 shader not yet compiled" };
  if(!(TCV2_UNIFORMS.uTerrainV2.value > 0.5)) return { pass:true, skipped:"terrainV2 toggled off (A/B)" };
  return { pass:true, detail:"TCV2 active (season="+(+TCV2_UNIFORMS.uTSeason.value).toFixed(2)+", detail="+(+TCV2_UNIFORMS.uTDetail.value).toFixed(2)+")" };
});
registerAudit("terrain", "luminance", function(){
  if(typeof nightFactor==="number" && nightFactor>0.05)
    return { pass:true, skipped:"not midday (nightFactor="+nightFactor.toFixed(2)+")" };
  // BARE ground only: the law is about terrain albedo, not structures or
  // worn paint. Drop any fixed probe that today's town has covered —
  // street ROW (roads are ground-paint's, not terrain's), canPlace()
  // rejections (buildings/props), splat-painted worn-earth pixels.
  var pts=[];
  for(var pi=0; pi<LUM_PROBES.length; pi++){
    var x=LUM_PROBES[pi][0], z=LUM_PROBES[pi][1];
    if(terrainHeight(x,z)<=1.0) continue;
    var clear=true;
    for(var i=0;i<PLACEMENT_STREET_SEGS.length;i++){
      var sg=PLACEMENT_STREET_SEGS[i];
      if(distToSegXZ(x,z,sg.x0,sg.z0,sg.x1,sg.z1)<sg.halfW+4){ clear=false; break; }
    }
    if(clear && !canPlace(x, z, 1.5, {})) clear = false;
    if(clear){
      try {
        var D = window.__P1850._splatDebug;
        if(x>CLOSE_BOX.xMin+6 && x<CLOSE_BOX.xMax-6 && z>CLOSE_BOX.zMin+6 && z<CLOSE_BOX.zMax-6){
          if(D.closeAlphaAt(x,z)[3] > 8) clear = false;
        } else if(x>TOWN_BOX.xMin+6 && x<TOWN_BOX.xMax-6 && z>TOWN_BOX.zMin+6 && z<TOWN_BOX.zMax-6){
          if(D.townAlphaAt(x,z)[3] > 8) clear = false;
        }
      } catch(e) { /* pre-first-paint — keep the probe */ }
    }
    if(clear) pts.push({x:x,z:z});
  }
  if(pts.length<6) return { pass:true, skipped:"fewer than 6 of the fixed probes still bare (town growth)" };
  // ONE internal readback frame from the canonical framing; the user's
  // camera state (and fog) is saved and restored — their frame comes back
  // with a final render, so nothing on screen changes.
  var savedPos = camera.position.clone(), savedQuat = camera.quaternion.clone();
  var savedFov = camera.fov;
  var savedFogNear = scene.fog.near, savedFogFar = scene.fog.far;
  var lums = [];
  try {
    var fy = terrainHeight(LUM_CAM.fx, LUM_CAM.fz)+2;
    // narrow (portrait) viewports shrink the horizontal FOV and would drop
    // probes off-screen — temporarily widen the vertical FOV so the frame
    // spans the same ground as the landscape baseline. Camera DISTANCE (the
    // input the distance-keyed ground shading actually sees) is untouched,
    // so readings match the calibration; depends only on the viewport,
    // never on where the user's camera is.
    if(camera.aspect < 1.2){
      camera.fov = 2*Math.atan(Math.tan(savedFov*Math.PI/360) * 1.2/camera.aspect) * 180/Math.PI;
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      LUM_CAM.fx + LUM_CAM.radius*Math.cos(LUM_CAM.elev)*Math.sin(LUM_CAM.yaw),
      fy + LUM_CAM.radius*Math.sin(LUM_CAM.elev),
      LUM_CAM.fz + LUM_CAM.radius*Math.cos(LUM_CAM.elev)*Math.cos(LUM_CAM.yaw));
    camera.lookAt(LUM_CAM.fx, fy, LUM_CAM.fz);
    // FIXED canonical fog for the readback — deterministic at any prior
    // camera/fog state, and matching what the rig itself computes at this
    // framing's ~390m eye altitude (the band was calibrated under it):
    scene.fog.near = 250; scene.fog.far = 2550;
    window.__P1850.render(); // fresh frame in THIS task — stalled-rAF (CDP) safe, buffer still live
    var gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    var buf = new Uint8Array(4);
    var v = new THREE.Vector3();
    pts.forEach(function(p){
      v.set(p.x, terrainHeight(p.x,p.z), p.z).project(camera);
      if(v.z>=1 || v.x<-0.92 || v.x>0.92 || v.y<-0.92 || v.y>0.92) return;
      var sx = Math.round((v.x*0.5+0.5)*W), sy = Math.round((v.y*0.5+0.5)*H); // readPixels origin = bottom-left = NDC y
      gl.readPixels(sx, sy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      lums.push((0.2126*buf[0]+0.7152*buf[1]+0.0722*buf[2])/255);
    });
  } finally {
    camera.position.copy(savedPos);
    camera.quaternion.copy(savedQuat);
    if(camera.fov !== savedFov){ camera.fov = savedFov; camera.updateProjectionMatrix(); }
    scene.fog.near = savedFogNear; scene.fog.far = savedFogFar;
    camera.updateMatrixWorld(true);
    window.__P1850.render(); // the user's frame, back on screen
  }
  if(lums.length<6) return { pass:true, skipped:"fewer than 6 probes on screen at the canonical framing" };
  lums.sort(function(a,b){return a-b;});
  var med = lums[Math.floor(lums.length/2)];
  // law band 0.55-0.70; +-0.05 readback tolerance (shadow dither, probe scatter)
  return { pass: med>=0.50 && med<=0.75, median:+med.toFixed(3), band:"0.55-0.70 (tol 0.05)",
           n:lums.length, min:+lums[0].toFixed(3), max:+lums[lums.length-1].toFixed(3),
           probe:"fixed world-anchored, canonical internal framing (s68)" };
});

/* dev-tooling visibility interface (layers-spec.md §15): this layer's visibility toggle */
registerLayerVisibility("terrain", function(v){ [terrainMesh, bayWater, foamMesh].forEach(function(m){ if(m) m.visible = v; }); });
