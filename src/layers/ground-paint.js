/* =====================================================================
   LAYER ground-paint (slot 2) — OWNS every road/plaza/path/trodden-ground pixel: splat canvases,
   their meshes, tile textures, era repaint. READS spine, roadPieceState, terrainHeight, zoneAt, clock.
   NEVER: moves a centerline, touches terrain vertices, places objects. (layers-spec.md)
   GREAT SPLIT (layers-spec.md): this file holds 5 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 07 — painterly tile kit + ground detail shader patch */
/* =====================================================================
   PAINTERLY TILE KIT (s60 PAINTERLY GROUND KIT) — THE ANSWER to "what is
   RuneScape / WoW / Civ / AoE2:DE remastered's trick to low-poly
   high-fidelity up close": HAND-PAINTED TILING TEXTURES WITH BAKED VALUE
   DETAIL (light and shadow painted INTO the albedo), SPLAT-BLENDED by
   surface class + DOODAD DENSITY + a GRADED PALETTE — NOT per-pixel
   procedural noise. At load we paint one seamless 512px (256 touch) tile
   per surface class on canvas, deliberate strokes with a painter's value
   range:
     dirt  — clods with shadowed SE undersides + scuffed lighter NW tops
     sand  — wind-ripple crests as highlight+shadow stroke pairs (NE-SW
             crests, transverse to the NW prevailing wind, matching the
             dune bands terrainColor() already lays down)
     grass — layered blade-patch daubs in 3 greens, dark to light
     mud   — dry: shrinkage plates with dark seams + curled lighter lips /
             wet: darker soaked plates, seams filled, puddle glints
             (states blended by uDetailWet, the same weatherState signal
             that drives the ground tint — the 1849-50 mud winter)
     road  — compacted fine grain + subtle wheel-polish bands along the
             travel axis (the shader samples it in a uGridDir-rotated
             domain, so canvas-horizontal IS the traffic direction)
   SEAMLESS: every stroke pass is replayed at all 9 torus offsets (painted
   on a torus). ZERO-MEAN: each finished tile is normalized to a 127.5
   per-channel mean, so the shader's 2x multiply averages to identity —
   the distance cross-fade (full <100m -> flat map tones by 250m) lands
   exactly on the baked map palette (the s52 fade discipline + GPU-
   readback fade proof still hold), night lighting dims it for free, and
   streets can never be lightened above adjacent ground (grounding.md §9
   no-map-overlay). The s52 derivative-noise DETAIL NORMALS layer is kept
   unchanged underneath — tiles carry the value story, the analytic-
   gradient bump keeps the sun response honest.
   ===================================================================== */
var TILE_STATS = { size:0, classes:[], paintMs:0 };
var TILE_KIT = (function(){
  var t0 = performance.now();
  var S = IS_TOUCH ? 256 : 512;
  var K = S/512; // strokes are authored at 512px scale
  function tileRng(seed){ var s=(seed*2654435761)>>>0; return function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
  function mkCanvas(){ var c=document.createElement("canvas"); c.width=c.height=S; return c; }
  /* TORUS PAINT: run the stroke pass ONCE onto a transparent 3Sx3S guard
     canvas (tile at the center), then composite the nine SxS blocks onto
     the tile — every stroke that crosses an edge re-enters from the
     opposite side, exactly the torus, at 1/9th the stroke cost of naive
     9-offset replay. fn receives the guard context (pre-translated). */
  function wrap9(ctx, fn){
    var big=document.createElement("canvas"); big.width=big.height=S*3;
    // willReadFrequently keeps the guard OFF the GPU: one accelerated
    // surface in the chain makes normalizeMean's getImageData a ~300ms
    // GPU-sync stall PER TILE (measured) — all-software paints in ~10ms
    var bx=big.getContext("2d",{willReadFrequently:true});
    bx.save(); bx.translate(S,S); fn(bx); bx.restore();
    for(var a=0;a<3;a++) for(var b=0;b<3;b++) ctx.drawImage(big, a*S, b*S, S, S, 0, 0, S, S);
  }
  function normalizeMean(ctx){ // per-channel mean -> 127.5 (the zero-mean guarantee)
    var img = ctx.getImageData(0,0,S,S), d = img.data, n = S*S;
    var mr=0,mg=0,mb=0,i;
    for(i=0;i<d.length;i+=4){ mr+=d[i]; mg+=d[i+1]; mb+=d[i+2]; }
    mr=127.5-mr/n; mg=127.5-mg/n; mb=127.5-mb/n;
    for(i=0;i<d.length;i+=4){
      d[i]  =Math.max(0,Math.min(255,d[i]+mr));
      d[i+1]=Math.max(0,Math.min(255,d[i+1]+mg));
      d[i+2]=Math.max(0,Math.min(255,d[i+2]+mb));
    }
    ctx.putImageData(img,0,0);
  }
  function toTex(canvas){
    var t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function rgba(r,g,b,a){ return "rgba("+r+","+g+","+b+","+a+")"; }
  /* soft blotch/glint sprite, rendered ONCE then drawImage'd — canvas
     radial gradients are ~2ms each and the torus replay multiplies them
     x9; sprites cut the whole kit's paint time ~7x */
  var _spriteCache = {};
  function blotchSprite(color){
    if(_spriteCache[color]) return _spriteCache[color];
    var c=document.createElement("canvas"); c.width=c.height=64;
    var x=c.getContext("2d",{willReadFrequently:true}); // software, same reason as the guard canvas
    var g=x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,color); g.addColorStop(1,"rgba(0,0,0,0)");
    x.fillStyle=g; x.fillRect(0,0,64,64);
    _spriteCache[color]=c;
    return c;
  }
  function blotch(ctx,color,bx,by,br,alpha){
    ctx.globalAlpha=alpha;
    ctx.drawImage(blotchSprite(color), bx-br, by-br, br*2, br*2);
    ctx.globalAlpha=1;
  }

  function paintDirt(){
    var c=mkCanvas(), x=c.getContext("2d",{willReadFrequently:true}); // normalizeMean reads back — software canvas skips the GPU sync stall
    x.fillStyle="#8b7b60"; x.fillRect(0,0,S,S);
    wrap9(x,function(x){ // param shadows the tile ctx: strokes land on the guard canvas
      var R=tileRng(7), i;
      for(i=0;i<70;i++){ // broad scuff-variance underpainting
        var bx=R()*S, by=R()*S, br=(24+R()*46)*K, dk=R()<0.5;
        blotch(x, dk?"rgb(96,82,60)":"rgb(168,150,116)", bx, by, br, dk?0.10:0.09);
      }
      for(i=0;i<220;i++){ // clods: body + shadowed SE underside + scuffed lighter NW top
        var cx=R()*S, cy=R()*S, rx=(5+R()*13)*K, ry=rx*(0.55+R()*0.5), a=R()*Math.PI;
        x.save(); x.translate(cx,cy); x.rotate(a);
        x.fillStyle=rgba(150,132,102,(0.36+R()*0.22).toFixed(3));
        x.beginPath(); x.ellipse(0,0,rx,ry,0,0,7); x.fill();
        x.fillStyle="rgba(66,54,38,0.42)";
        x.beginPath(); x.ellipse(rx*0.22,ry*0.32,rx*0.85,ry*0.6,0,0,7); x.fill();
        x.fillStyle="rgba(186,168,132,0.42)";
        x.beginPath(); x.ellipse(-rx*0.22,-ry*0.34,rx*0.5,ry*0.35,0,0,7); x.fill();
        x.restore();
      }
      x.lineCap="round";
      for(i=0;i<70;i++){ // dragged scuff streaks
        var sx=R()*S, sy=R()*S, ln=(8+R()*22)*K, an=R()*Math.PI;
        x.strokeStyle=R()<0.5?"rgba(180,162,128,0.16)":"rgba(80,66,48,0.16)";
        x.lineWidth=(1+R()*2)*K;
        x.beginPath(); x.moveTo(sx,sy); x.lineTo(sx+Math.cos(an)*ln, sy+Math.sin(an)*ln); x.stroke();
      }
    });
    normalizeMean(x);
    return toTex(c);
  }
  function paintSand(){
    var c=mkCanvas(), x=c.getContext("2d",{willReadFrequently:true}); // normalizeMean reads back — software canvas skips the GPU sync stall
    x.fillStyle="#cdb888"; x.fillRect(0,0,S,S);
    wrap9(x,function(x){ // param shadows the tile ctx: strokes land on the guard canvas
      var R=tileRng(13), i, diag=S*1.45, spacing=26*K;
      x.lineCap="round";
      for(i=0;i<Math.ceil(diag/spacing);i++){ // ripple crests: highlight+shadow pair, NE-SW
        var off=-diag/2 + i*spacing + (R()-0.5)*8*K, amp=(3+R()*5)*K, ph=R()*7, wl=(52+R()*46)*K;
        var crest=function(shift){
          x.beginPath();
          for(var t=-diag/2;t<=diag/2;t+=6*K){
            var w=Math.sin(t/wl*6.283+ph)*amp;
            var px=S/2 + t*0.7071 + (off+w+shift)*0.7071;
            var py=S/2 - t*0.7071 + (off+w+shift)*0.7071;
            if(t<=-diag/2+3*K) x.moveTo(px,py); else x.lineTo(px,py);
          }
        };
        x.strokeStyle="rgba(238,218,168,0.5)"; x.lineWidth=3.4*K; crest(0); x.stroke();       // sunlit crest
        x.strokeStyle="rgba(128,104,66,0.44)"; x.lineWidth=4.6*K; crest(4.6*K); x.stroke();   // slip-face shadow
      }
      for(i=0;i<900;i++){ // grain specks
        x.fillStyle=R()<0.5?"rgba(120,100,66,0.18)":"rgba(240,222,178,0.18)";
        x.fillRect(R()*S, R()*S, 1.4*K, 1.4*K);
      }
    });
    normalizeMean(x);
    return toTex(c);
  }
  function paintGrass(){
    var c=mkCanvas(), x=c.getContext("2d",{willReadFrequently:true}); // normalizeMean reads back — software canvas skips the GPU sync stall
    x.fillStyle="#6d7a45"; x.fillRect(0,0,S,S);
    wrap9(x,function(x){ // param shadows the tile ctx: strokes land on the guard canvas
      var R=tileRng(29), i, l;
      for(i=0;i<130;i++){ // dark under-patches (the shadow layer)
        var bx=R()*S, by=R()*S, br=(7+R()*16)*K;
        x.fillStyle=rgba(58,70,34,(0.28+R()*0.14).toFixed(3));
        x.beginPath(); x.ellipse(bx,by,br,br*0.7,R()*3,0,7); x.fill();
      }
      x.lineCap="round";
      var GREENS=[[104,118,62],[136,148,84]]; // mid then light daubs — 3 greens with the base
      for(l=0;l<2;l++){
        var g=GREENS[l], nn=l===0?420:230;
        for(i=0;i<nn;i++){
          var sx=R()*S, sy=R()*S, ln=(3.5+R()*6)*K, an=-1.571+(R()-0.5)*1.5, bow=(R()-0.5)*2*K;
          x.strokeStyle=rgba(g[0]+((R()*18)|0), g[1]+((R()*18)|0), g[2]+((R()*14)|0), 0.5);
          x.lineWidth=(1.1+R()*1.3)*K;
          x.beginPath(); x.moveTo(sx,sy);
          x.quadraticCurveTo(sx+Math.cos(an)*ln*0.5+bow, sy+Math.sin(an)*ln*0.5, sx+Math.cos(an)*ln, sy+Math.sin(an)*ln);
          x.stroke();
        }
      }
    });
    normalizeMean(x);
    return toTex(c);
  }
  function paintMud(wet){
    var c=mkCanvas(), x=c.getContext("2d",{willReadFrequently:true}); // normalizeMean reads back — software canvas skips the GPU sync stall
    x.fillStyle = wet?"#584a38":"#6e5f49"; x.fillRect(0,0,S,S);
    wrap9(x,function(x){ // param shadows the tile ctx: strokes land on the guard canvas
      var R=tileRng(41), i, j; // SAME seed both states — plates line up dry->wet
      for(i=0;i<60;i++){ // shrinkage plates: irregular blobs
        var px=R()*S, py=R()*S, pr=(14+R()*22)*K, n=6+((R()*4)|0);
        x.beginPath();
        for(j=0;j<=n;j++){
          var an=j/n*6.283, rr=pr*(0.75+R()*0.5);
          var vx=px+Math.cos(an)*rr, vy=py+Math.sin(an)*rr*0.85;
          if(j===0) x.moveTo(vx,vy); else x.lineTo(vx,vy);
        }
        x.closePath();
        if(wet){
          x.fillStyle=rgba(80,68,52,(0.40+R()*0.22).toFixed(3)); x.fill();   // soaked plates, seams filled
          x.strokeStyle="rgba(46,38,28,0.35)"; x.lineWidth=2.4*K; x.stroke();
        } else {
          x.fillStyle=rgba(126,110,86,(0.30+R()*0.18).toFixed(3)); x.fill(); // dry plate top
          x.strokeStyle="rgba(42,34,24,0.55)"; x.lineWidth=(2.4+R()*1.6)*K; x.stroke(); // dark seam
          x.strokeStyle="rgba(150,134,108,0.20)"; x.lineWidth=1.2*K;         // curled lighter NW lip
          x.save(); x.translate(-1.2*K,-1.2*K); x.stroke(); x.restore();
        }
      }
      if(!wet){
        x.lineCap="round";
        for(i=0;i<50;i++){ // hairline cracks inside plates
          var sx=R()*S, sy=R()*S, an2=R()*3.14, ln=(6+R()*14)*K;
          x.strokeStyle="rgba(50,40,28,0.30)"; x.lineWidth=1*K;
          x.beginPath(); x.moveTo(sx,sy);
          x.lineTo(sx+Math.cos(an2)*ln*0.6, sy+Math.sin(an2)*ln*0.6);
          x.lineTo(sx+Math.cos(an2+0.5)*ln, sy+Math.sin(an2+0.5)*ln);
          x.stroke();
        }
      } else {
        for(i=0;i<46;i++){ // puddle glint: pale sky-sheen pools + bright sparks
          var qx=R()*S, qy=R()*S, qr=(4+R()*10)*K;
          blotch(x, "rgb(160,166,162)", qx, qy, qr, 0.5);
          if(R()<0.5){ x.fillStyle="rgba(226,230,222,0.7)"; x.fillRect(qx-1.4*K, qy-0.7*K, 3.2*K, 1.4*K); }
        }
      }
    });
    normalizeMean(x);
    return toTex(c);
  }
  function paintRoad(){
    var c=mkCanvas(), x=c.getContext("2d",{willReadFrequently:true}); // normalizeMean reads back — software canvas skips the GPU sync stall
    x.fillStyle="#93826a"; x.fillRect(0,0,S,S);
    wrap9(x,function(x){ // param shadows the tile ctx: strokes land on the guard canvas
      var R=tileRng(57), i;
      for(i=0;i<50;i++){ // broad worn patches
        var bx=R()*S, by=R()*S, br=(20+R()*40)*K, dk=R()<0.5;
        blotch(x, dk?"rgb(120,104,82)":"rgb(170,152,124)", bx, by, br, dk?0.08:0.07);
      }
      for(i=0;i<1400;i++){ // compacted fine grain
        x.fillStyle=R()<0.5?"rgba(112,96,74,0.13)":"rgba(178,162,134,0.13)";
        x.fillRect(R()*S, R()*S, 1.2*K, 1.2*K);
      }
      /* wheel-polish bands along canvas-horizontal (= the travel axis after
         the shader's uGridDir rotation). Faint + zero-mean-normalized:
         streets never lighten above adjacent ground (§9 no-map-overlay). */
      var bands=[0.22,0.30,0.62,0.70];
      for(i=0;i<bands.length;i++){
        var by2=bands[i]*S + (R()-0.5)*6*K, bw=(5+R()*4)*K;
        var g3=x.createLinearGradient(0,by2-bw,0,by2+bw);
        g3.addColorStop(0,"rgba(0,0,0,0)");
        g3.addColorStop(0.5,"rgba(186,170,140,0.16)");
        g3.addColorStop(1,"rgba(0,0,0,0)");
        x.fillStyle=g3; x.fillRect(-S,by2-bw,3*S,bw*2);
        x.fillStyle="rgba(96,82,62,0.10)"; x.fillRect(-S,by2+bw*0.9,3*S,1.6*K); // faint rut-edge shadow
      }
    });
    normalizeMean(x);
    return toTex(c);
  }

  var kit = { sand:paintSand(), grass:paintGrass(), dirt:paintDirt(),
              mud:paintMud(false), mudWet:paintMud(true), road:paintRoad() };
  TILE_STATS.size=S;
  TILE_STATS.classes=["dirt","sand","grass","mudDry","mudWet","road"];
  TILE_STATS.paintMs=+(performance.now()-t0).toFixed(1);
  console.log("[verify] painterly tile kit: 6 classes @ "+S+"px painted in "+TILE_STATS.paintMs+"ms");
  return kit;
})();
/* fragment block (s60 rewrite): PAINTED TILES carry the albedo story
   (class-keyed, splat-blended by vSurfW, world-space UVs, 2x zero-mean
   multiply, full <100m -> flat map tones by 250m); the s52 derivative-
   noise DETAIL NORMALS are kept unchanged underneath (45->180m fade).
   (s60's 260-470m distance-gated PALETTE GRADE was deleted in s62 —
   superseded by the GLOBAL earth palette, grounding.md §9: the flat map
   tones themselves are AoE2:DE-deep now, at every distance.)
   uDetailAmp=0 still kills both layers — the fade proof holds.
   Injected after <color_fragment>; dtGrad is consumed by the normal patch. */
var DETAIL_FRAG_TERRAIN = [
  "float dtFade = 0.0; vec2 dtGrad = vec2(0.0);",
  "{",
  "  float dCam = distance(vDetailWorld, cameraPosition);",
  "  dtFade = (1.0 - smoothstep(45.0, 180.0, dCam)) * uDetailAmp;",   // detail-NORMAL fade (s52, unchanged)
  "  float tileF = (1.0 - smoothstep(100.0, 250.0, dCam)) * uDetailAmp;", // painted-tile fade (s60)
  "  vec2 p = vDetailWorld.xz;",
  "  vec4 sw = vSurfW;",
  "  float mudW = min(1.0, sw.w + sw.z*uDetailWet*0.85);",   // wet season: town dirt churns to mud
  "  float dirtW = sw.z * (1.0 - uDetailWet*0.6);",
  "  if(tileF > 0.003){",                                    // PAINTED TILES (s60): class-keyed, splat-blended albedo
  "    vec3 tmul = vec3(0.0); float tw = 0.0;",
  "    if(sw.x > 0.02){ tmul += sw.x*texture2D(uTileSand,  p*0.14).rgb; tw += sw.x; }",
  "    if(sw.y > 0.02){ tmul += sw.y*texture2D(uTileGrass, p*0.19).rgb; tw += sw.y; }",
  "    if(dirtW > 0.02){ tmul += dirtW*texture2D(uTileDirt, p*0.20).rgb; tw += dirtW; }",
  "    if(mudW > 0.02){",
  "      vec3 mt = mix(texture2D(uTileMud, p*0.15).rgb, texture2D(uTileMudWet, p*0.15).rgb, uDetailWet);",
  "      tmul += mudW*mt; tw += mudW;",
  "    }",
  "    if(tw > 0.003){ tmul /= tw; diffuseColor.rgb *= mix(vec3(1.0), tmul*2.0, tileF*min(tw,1.0)); }", // 2x zero-mean multiply — fades to flat map tones exactly
  "  }",
  "  if(dtFade > 0.003){",                                   // DETAIL NORMALS (s52, kept): gradient only — the albedo is painted now
  "    if(sw.x > 0.02){",                                    // SAND: wind-ripple + grain bump
  "      vec3 rip = dfield2(p, vec2(0.70710678,-0.70710678), vec2(0.55,2.6));",
  "      vec3 grn = dnoise2(p*4.6);",
  "      dtGrad += sw.x*(rip.yz*0.020 + grn.yz*0.0035);",
  "    }",
  "    if(sw.y > 0.02){ dtGrad += sw.y*dfbm2(p*3.8).yz*0.0045; }",   // GRASS: blade stipple bump
  "    if(dirtW > 0.02){ dtGrad += dirtW*(dfbm2(p*1.6).yz*0.011 + dnoise2(p*0.45).yz*0.012); }", // DIRT: clod bump
  "    if(mudW > 0.02){",
  "      vec3 mb = dfbm2(p*1.2);",
  "      float pool = smoothstep(0.12, 0.5, -mb.x) * uDetailWet;",
  "      dtGrad += mudW*mb.yz*0.012*(1.0-pool);",            // puddles read flat — gradient dies inside them
  "    }",
  "  }",
  // (s60's 260-470m distance-gated PALETTE GRADE deleted s62 — SUPERSEDED by
  //  the global earth palette, grounding.md §9: the map itself is earthy now,
  //  no distance-gated enrichment as the fix.)
  "}"
].join("\n");
var DETAIL_FRAG_ROAD = [
  "float dtFade = 0.0; vec2 dtGrad = vec2(0.0);",
  "{",
  "  float dCam = distance(vDetailWorld, cameraPosition);",
  "  dtFade = (1.0 - smoothstep(45.0, 180.0, dCam)) * uDetailAmp;",
  "  float tileF = (1.0 - smoothstep(100.0, 250.0, dCam)) * uDetailAmp;",
  "  vec2 p = vDetailWorld.xz;",
  /* s65: plaza membership computed up front — it gates the wheel-polish
     bands below (a directional street texture wallpapers as pinstripes
     across a big open square) and drives the wet-mud coupling further on. */
  "  float plz = 0.0;",
  "  if(uPlazaHalf.x > 0.5){",
  "    vec2 prel = p - uPlazaC;",
  "    float plu = abs(dot(prel, uPlazaU));",
  "    float plv = abs(dot(prel, vec2(-uPlazaU.y, uPlazaU.x)));",
  "    plz = (1.0-smoothstep(uPlazaHalf.x-8.0, uPlazaHalf.x, plu)) * (1.0-smoothstep(uPlazaHalf.y-8.0, uPlazaHalf.y, plv));",
  "  }",
  "  if(tileF > 0.003){",                                       // PAINTED ROAD TILE (s60): compacted grain + wheel-polish bands
  "    vec2 q = vec2(dot(p,uGridDir), dot(p,vec2(-uGridDir.y,uGridDir.x)));", // travel-aligned domain — the bands ride the traffic axis
  "    diffuseColor.rgb *= mix(vec3(1.0), texture2D(uTileRoad, q*0.24).rgb*2.0, tileF*(1.0-plz*0.65));", // zero-mean: streets never lighten above ground (§9); the plaza mutes the banded street tile — trample, not traffic lanes
  "  }",
  "  if(dtFade > 0.003){",                                      // s52 detail normals, kept — gradient only
  "    vec3 gr = dfbm2(p*3.6);",                                // compacted fine grain bump
  "    dtGrad += gr.yz*0.004;",
  "    float scM = 0.5+0.5*dnoise2(p*0.11).x;",                 // scuff comes in worn patches, not wall-to-wall
  "    vec3 s1 = dfield2(p, uGridDir, vec2(0.35,2.6));",        // faint hoof/wheel scuff, elongated along travel
  "    vec3 s2 = dfield2(p, vec2(-uGridDir.y,uGridDir.x), vec2(0.35,2.6));", // the cross axis, weaker (no weave)
  "    dtGrad += (s1.yz*0.0030+s2.yz*0.0017)*scM;",
  "    float pool = smoothstep(0.15,0.5,-gr.x)*uDetailWet;",    // mud winter: churned pools in the low grain
  "    diffuseColor.rgb *= (1.0 - pool*0.07*dtFade);",
  "    dtGrad *= (1.0-pool*0.8);",
  "  }",
  /* s65 PORTSMOUTH SQUARE MUD COUPLING — the plaza was notoriously bad in
     the wet (unimproved, trampled, rutted open square). Inside the plaza
     rect (renderGroundSplat hands the shader the current skewed frame each
     repaint) the SAME uDetailWet signal that churns the town dirt pools
     standing water in the trampled lows. Deliberately NOT gated on dtFade:
     the term is world-space and cheap, so the wet plaza reads at the 200m
     mid framing too, not just inside the detail bubble. Darken-only (§9:
     paint never lighter than ground); pools kill the detail-normal
     gradient so standing water reads flat. */
  "  if(plz > 0.01 && uDetailWet > 0.01){",
  "    float ppool = smoothstep(0.04, 0.40, -dfbm2(p*0.85).x);",
  "    diffuseColor.rgb *= 1.0 - plz*uDetailWet*(0.07 + ppool*0.17);",
  "    dtGrad *= 1.0 - plz*uDetailWet*ppool*0.85;",
  "  }",
  // (s60 260-470m palette grade deleted s62 — superseded by the global earth palette, §9)
  "}"
].join("\n");
/* s65: the current plaza rect (center / u-axis / half-extents, world XZ) —
   written by renderGroundSplat() every repaint (the frame swings through the
   O'Farrell window), consumed by the road-kind detail shader above. */
var PLAZA_RECT_STATE = { cx:0, cz:0, ux:1, uz:0, hu:0, hv:0 };
var PLAZA_UNIFORM_SETS = [];
var DETAIL_FRAG_NORMAL = [
  "if(dtFade > 0.003){",
  "  vec3 dtPert = (viewMatrix * vec4(-dtGrad.x, 0.0, -dtGrad.y, 0.0)).xyz;", // world-up bump -> view space (vec4 form: GLSL ES 1.00-safe)
  "  normal = normalize(normal + dtPert*dtFade);",
  "}"
].join("\n");
/* kind: "terrain" (reads aSurf class weights) | "road" (splat tiers).
   prevHook: an existing onBeforeCompile to chain (splat fog patch). */
function patchGroundDetailMaterial(mat, kind, prevHook){
  mat.onBeforeCompile = function(shader){
    if(prevHook) prevHook(shader);
    shader.uniforms.uDetailAmp = { value: DETAIL_AMP_DEFAULT };
    shader.uniforms.uDetailWet = { value: 0 };
    if(kind==="road"){
      shader.uniforms.uGridDir = { value: new THREE.Vector2(Math.cos(GRID_ROT_BASE), Math.sin(GRID_ROT_BASE)) };
      shader.uniforms.uTileRoad = { value: TILE_KIT.road };   // s60 painterly tile kit
      // s65 plaza mud coupling — seeded from the last repaint's frame (the
      // shader compiles AFTER the first repaint), then repaint-updated.
      shader.uniforms.uPlazaC    = { value: new THREE.Vector2(PLAZA_RECT_STATE.cx, PLAZA_RECT_STATE.cz) };
      shader.uniforms.uPlazaU    = { value: new THREE.Vector2(PLAZA_RECT_STATE.ux, PLAZA_RECT_STATE.uz) };
      shader.uniforms.uPlazaHalf = { value: new THREE.Vector2(PLAZA_RECT_STATE.hu, PLAZA_RECT_STATE.hv) };
      PLAZA_UNIFORM_SETS.push(shader.uniforms);
    } else {
      shader.uniforms.uTileSand   = { value: TILE_KIT.sand };
      shader.uniforms.uTileGrass  = { value: TILE_KIT.grass };
      shader.uniforms.uTileDirt   = { value: TILE_KIT.dirt };
      shader.uniforms.uTileMud    = { value: TILE_KIT.mud };
      shader.uniforms.uTileMudWet = { value: TILE_KIT.mudWet };
    }
    DETAIL_UNIFORM_SETS.push(shader.uniforms);
    var defs = (IS_TOUCH ? "#define DETAIL_LOWQ\n" : "");
    shader.vertexShader = defs + shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDetailWorld;" +
        (kind==="terrain" ? "\nattribute vec4 aSurf;\nvarying vec4 vSurfW;" : ""))
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDetailWorld = (modelMatrix*vec4(position,1.0)).xyz;" +
        (kind==="terrain" ? "\nvSurfW = aSurf;" : ""));
    shader.fragmentShader = defs + shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + DETAIL_GLSL_PARS +
        (kind==="terrain"
          ? "\nvarying vec4 vSurfW;\nuniform sampler2D uTileSand;\nuniform sampler2D uTileGrass;\nuniform sampler2D uTileDirt;\nuniform sampler2D uTileMud;\nuniform sampler2D uTileMudWet;"
          : "\nuniform vec2 uGridDir;\nuniform sampler2D uTileRoad;\nuniform vec2 uPlazaC;\nuniform vec2 uPlazaU;\nuniform vec2 uPlazaHalf;"))
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + (kind==="terrain" ? DETAIL_FRAG_TERRAIN : DETAIL_FRAG_ROAD))
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n" + DETAIL_FRAG_NORMAL);
  };
}
/* (terrainMat/terrainMesh — terrain OWNS its mesh + material — relocated to
   layers/terrain.js in the 2026-07-12 cleanup, keeping this exact global
   position. patchGroundDetailMaterial() above stays here: the detail-shader
   patch is ground-paint's legal shared piece.) */

/* @P1850-CHUNK 09 — ground splat-map (street/path/wear paint) */
/* =====================================================================
   GROUND SPLAT-MAP — STREET RENDERING REBUILD (2026-07-10)
   Replaces the old chained ~30m draped box/plane street segments (their
   joints read as visibly seamed at any oblique or close angle — field
   feedback: "Microsoft Paint") with the standard game/maps technique:
   paint the entire ground-marking network into 2D canvases, then project
   it onto the terrain as alpha-blended decal meshes that share the
   terrain's own vertices (or its own real sampled heights) — so the
   drape always matches the ground exactly and there is never a seam.

   Two tiers:
     - WORLD canvas/mesh: covers the full 12km baked box (shares
       terrainGeo's own position/normal buffers directly, just adds a
       matching UV), coarser resolution — so the grid and the Mission
       Road / El Camino Real still read at altitude.
     - TOWN canvas/mesh: covers just the ~1km village footprint at much
       higher effective resolution (its own smaller draped grid,
       sampling terrainHeight() same as everything else) — crisp street
       edges up close, where the old per-segment geometry looked worst.
       Sits at a stronger negative polygon offset so it always wins over
       the coarser world layer where the two overlap.

   The street-GRAPH data itself (GEO.streetsU/V, MISSION_ROAD_PTS, block
   dimensions, etc.) is UNCHANGED — only how it's rendered. Re-painted (a
   few dozen cheap canvas strokes, not a rebuild) whenever the O'Farrell
   1847 grid-swing progress changes — see updateGridSwing() above, which
   now actually runs (its NaN bug is fixed alongside SIM_START_MS below).
   ===================================================================== */
// SHIMMER fix (s20 sprint, 2026-07-11): world res raised 3072 -> 4096 —
// power-of-two, so the splat textures can mipmap (see the PREMULTIPLIED
// MIPMAP block below; WebGL1 requires POT dimensions for generateMipmap,
// and 3072 silently isn't POT). Bonus: world texel density improves
// 3.9m -> 2.9m/texel.
// ROAD MASTERPLAN (s27 sprint, 2026-07-11, road-master-spec.md §4): a THIRD
// tier — CLOSE — over the town core, so full zoom-in (~40-60m altitude)
// stays crisp: town tier is ~0.42m/texel, the close tier is ~0.2m/texel,
// enough to resolve wheel-rut pairs and individual wharf planks. Touch
// devices get 2048 (0.4m/texel) to bound texture memory.
var SPLAT_WORLD_RES = 4096, SPLAT_TOWN_RES = 4096;
var SPLAT_CLOSE_RES = IS_TOUCH ? 2048 : 4096;
/* GRID-SNAP DRAPE (s27, road-master-spec §6 — kills the pale z-clip
   triangles through road paint near Pacific/Broadway and the shore edge):
   the draped town decal used to sample terrain at ITS OWN ~9.7m vertex
   grid, mis-registered against the rendered terrain mesh's 31.3m grid —
   between decal vertices the decal plane cuts BELOW terrain-triangle
   ridges (the piecewise surface is locally convex there), and with
   logarithmicDepthBuffer polygonOffset is inert, so every such dip is a
   camera-dependent hole in the street paint (the "pale z-clip triangles").
   Fix: snap every decal tier's box to the terrain mesh's own vertex grid
   and subdivide each terrain cell exactly K times. Decal vertices then lie
   ON the rendered terrain triangles (terrainMeshSurfaceY is exact at those
   points, and PlaneGeometry's shared anti-diagonal orientation makes every
   sub-cell planar-coincident) — the decal IS the terrain surface plus a
   constant lift, no dips, no holes, at any slope. */
var TERRAIN_CELL = WORLD.cell;
function snapGridDown(v,o){ return o + Math.floor((v-o)/TERRAIN_CELL)*TERRAIN_CELL; }
function snapGridUp(v,o){ return o + Math.ceil((v-o)/TERRAIN_CELL)*TERRAIN_CELL; }
// BLUR fix (2026-07-10, iPad field test defect #4): pad sized so the
// mid-zoom (300-600m) oblique camera's ground frustum stays inside the
// crisp town tier — measured 600-700m+ reach from the plaza at 500m alt.
var TOWN_BOX = (function(){
  var pad = 600;
  return { xMin:snapGridDown(VILLAGE_BOX.xMin-pad, WORLD.x0), xMax:snapGridUp(VILLAGE_BOX.xMax+pad, WORLD.x0),
           zMin:snapGridDown(VILLAGE_BOX.zMin-pad, WORLD.z0), zMax:snapGridUp(VILLAGE_BOX.zMax+pad, WORLD.z0) };
})();
var TOWN_W = TOWN_BOX.xMax-TOWN_BOX.xMin, TOWN_H = TOWN_BOX.zMax-TOWN_BOX.zMin;
// CLOSE tier box: the village core + the working waterfront (plaza, fire
// block, Clay St landing / Central Wharf foot all inside).
var CLOSE_BOX = (function(){
  var pad = 130;
  return { xMin:snapGridDown(VILLAGE_BOX.xMin-pad, WORLD.x0), xMax:snapGridUp(VILLAGE_BOX.xMax+pad+60, WORLD.x0),
           zMin:snapGridDown(VILLAGE_BOX.zMin-pad, WORLD.z0), zMax:snapGridUp(VILLAGE_BOX.zMax+pad, WORLD.z0) };
})();
var CLOSE_W = CLOSE_BOX.xMax-CLOSE_BOX.xMin, CLOSE_H = CLOSE_BOX.zMax-CLOSE_BOX.zMin;

function worldPx(x,z){ return { x:(x-WORLD.x0)/WORLD.sizeX*SPLAT_WORLD_RES, y:(z-WORLD.z0)/WORLD.sizeZ*SPLAT_WORLD_RES }; }
function worldPxLen(m){ return m/WORLD.sizeX*SPLAT_WORLD_RES; } // x-scale; z anisotropy is 8% — invisible at world tier
function townPx(x,z){ return { x:(x-TOWN_BOX.xMin)/TOWN_W*SPLAT_TOWN_RES, y:(z-TOWN_BOX.zMin)/TOWN_H*SPLAT_TOWN_RES }; }
function townPxLen(m){ return m/TOWN_W*SPLAT_TOWN_RES; }
function closePx(x,z){ return { x:(x-CLOSE_BOX.xMin)/CLOSE_W*SPLAT_CLOSE_RES, y:(z-CLOSE_BOX.zMin)/CLOSE_H*SPLAT_CLOSE_RES }; }
function closePxLen(m){ return m/CLOSE_W*SPLAT_CLOSE_RES; }

var splatWorldCanvas = document.createElement("canvas"); splatWorldCanvas.width=splatWorldCanvas.height=SPLAT_WORLD_RES;
var splatTownCanvas  = document.createElement("canvas"); splatTownCanvas.width=splatTownCanvas.height=SPLAT_TOWN_RES;
var splatCloseCanvas = document.createElement("canvas"); splatCloseCanvas.width=splatCloseCanvas.height=SPLAT_CLOSE_RES;
var splatWorldCtx = splatWorldCanvas.getContext("2d"), splatTownCtx = splatTownCanvas.getContext("2d"), splatCloseCtx = splatCloseCanvas.getContext("2d");
// One reusable scratch canvas for the network-layer compositor (see
// NETWORK-FIRST STROKING below) — each class layer is drawn OPAQUE in
// here, then composited onto a tier canvas in one pass.
var SPLAT_SCRATCH_RES = Math.max(SPLAT_WORLD_RES, SPLAT_TOWN_RES, SPLAT_CLOSE_RES);
var splatScratchCanvas = document.createElement("canvas"); splatScratchCanvas.width=splatScratchCanvas.height=SPLAT_SCRATCH_RES;
var splatScratchCtx = splatScratchCanvas.getContext("2d");

/* Strokes a polyline (world-space {x,z} points) at world-space width
   `widthM` into one canvas. lineCap defaults to BUTT (road-master-spec §2:
   no circular endcap blobs, ever); interior joins are round. */
function splatStroke(ctx, pxFn, pxLenFn, pts, widthM, color, alpha, cap){
  if(!pts || pts.length<2) return;
  ctx.save();
  // SUB-TEXEL COVERAGE fix (s20 sprint): a stroke narrower than one canvas
  // pixel keeps the 1px floor but scales alpha by true coverage, so thin
  // faint marks thin out toward invisibility at world scale instead of
  // fattening into full-strength lines.
  var _pw = pxLenFn(widthM);
  ctx.globalAlpha = (alpha==null?1:alpha) * Math.min(1, _pw);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, _pw);
  ctx.lineJoin = "round"; ctx.lineCap = cap||"butt";
  ctx.beginPath();
  var p0 = pxFn(pts[0].x, pts[0].z);
  ctx.moveTo(p0.x, p0.y);
  for(var i=1;i<pts.length;i++){ var p = pxFn(pts[i].x, pts[i].z); ctx.lineTo(p.x, p.y); }
  ctx.stroke();
  ctx.restore();
}
function splatFillPoly(ctx, pxFn, pts, color, alpha){
  if(!pts || pts.length<3) return;
  ctx.save();
  ctx.globalAlpha = alpha==null?1:alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  var p0 = pxFn(pts[0].x, pts[0].z);
  ctx.moveTo(p0.x, p0.y);
  for(var i=1;i<pts.length;i++){ var p = pxFn(pts[i].x, pts[i].z); ctx.lineTo(p.x, p.y); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
/* Perpendicular-offset copy of a polyline (used for the wheel-rut twin
   grooves) — offsets each point along its local (neighbor-averaged)
   normal, so it tracks curves as well as straight runs. */
function splatOffsetPolyline(pts, offset){
  var out = [];
  for(var i=0;i<pts.length;i++){
    var a = pts[Math.max(i-1,0)], b = pts[Math.min(i+1,pts.length-1)];
    var dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)||1;
    out.push({ x:pts[i].x-(dz/len)*offset, z:pts[i].z+(dx/len)*offset });
  }
  return out;
}
/* Densify a waypoint chain through a quadratic-through-midpoints curve,
   returning plain {x,z} samples every ~step meters — used to hand the
   smoothed Mission Road / El Camino routes to the network stroker. */
function smoothRoutePts(pts, step){
  if(!pts || pts.length<2) return pts||[];
  var out = [pts[0]];
  function quad(p0,c,p1){
    var len = Math.hypot(p1.x-p0.x,p1.z-p0.z)+Math.hypot(c.x-p0.x,c.z-p0.z);
    var n = Math.max(2, Math.round(len/step));
    for(var k=1;k<=n;k++){
      var t=k/n, it=1-t;
      out.push({ x: it*it*p0.x + 2*it*t*c.x + t*t*p1.x, z: it*it*p0.z + 2*it*t*c.z + t*t*p1.z });
    }
  }
  var prev = pts[0];
  for(var i=1;i<pts.length-1;i++){
    var cur=pts[i], next=pts[i+1];
    var mid={ x:(cur.x+next.x)/2, z:(cur.z+next.z)/2 };
    quad(prev, cur, mid);
    prev = mid;
  }
  quad(prev, pts[pts.length-1], pts[pts.length-1]);
  return out;
}
function _streetSeed(str){ var h=0; for(var i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))|0; return ((h>>>0)%1000)/1000; }
function _strokeN(seed,k){ return hash2(seed*127.1+k*13.7+3.7, seed*311.7-k*7.3+1.3); }
function _parseSplatCol(c){
  if(c.charAt(0)==="#") return { r:parseInt(c.substr(1,2),16), g:parseInt(c.substr(3,2),16), b:parseInt(c.substr(5,2),16) };
  var m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return m ? {r:+m[1], g:+m[2], b:+m[3]} : {r:110, g:90, b:60};
}
function _jitterCol(base, dk){
  return "rgb("+Math.min(255,Math.round(base.r*dk))+","+Math.min(255,Math.round(base.g*dk))+","+Math.min(255,Math.round(base.b*dk))+")";
}
function _mixCol(a, b, t){
  return "rgb("+Math.round(a.r+(b.r-a.r)*t)+","+Math.round(a.g+(b.g-a.g)*t)+","+Math.round(a.b+(b.b-a.b)*t)+")";
}

/* @P1850-CHUNK 11 — network-first stroking + constant-width + tier ownership */
/* =====================================================================
   NETWORK-FIRST STROKING (s27) + CONSTANT-WIDTH AMENDMENT (s62 —
   road-master-spec header, user ruling 2026-07-12, BINDING).
   Streets stroke as a NETWORK, one compositing layer per lifecycle class:
     - every layer is drawn OPAQUE into a scratch canvas (overdraw is
       invisible, so intersections within a class are painted ONCE — a
       continuous surface, never two overlapping stroke layers);
     - the finished layer is composited onto the tier canvas in one pass
       at the class alpha, after erasing what lies beneath it (one owner
       per ground pixel across classes too);
     - BUTT caps everywhere; true dead ends get a ragged noise-modulated
       fade-out erase, AT MOST one street-width long (no circles, no
       spike tails);
   CONSTANT WIDTH (s62): exactly TWO rendered width families —
     (1) an OFFICIAL STREET renders at its surveyed class width from the
         master data, CONSTANT along its whole length and over time from
         the day it first appears;
     (2) a FOOTPATH/TRAIL renders at ONE narrow constant (~1.8m).
   The §9b lifecycle is FILL/TREATMENT progression INSIDE that width:
     S1 = faint right-of-way boundary hint (scratched edge lines at ±W/2),
     S2 = the ROW hint + a trodden footpath line wandering INSIDE it,
     S3 = partial fill (light wash + patchy worn bands + ruts),
     S4 = full worn surface (tone wobble + ruts + churn),
     planked where documented (wharf aprons — the lighter-than-ground
     exception). NEVER width change: all width-interpolation/taper/jitter
     code (taperA/B, _taperMul, per-class widths, frac-driven S2 width,
     tapered Vioget stubs) is DELETED — it was the Frankenstein source of
     ballooning junctions and alternating thick/thin strips.
   Casing (§3) is a soft two-step edge GRADIENT painted as whole-layer
   under-passes, so it rims only the OUTSIDE of the unioned network.
   ===================================================================== */
var ROAD_COLS = {
  ghost: "#8a7850",           // darker than the (s62 earth-palette) sand, never lighter
  trail: "#5f4c31",           // compacted foot path
  faint: "#7d6b4a",           // faint work tracks / clutter paths
  r3:    "#6a563a", r3case:"#514028",
  r4:    "#75613f", r4case:"#4b3b26",
  partialWash: "#8d7852",     // s62 S3 partial-fill wash — worn ground inside the right-of-way, still darker than terrain
  rut:   "#241a0f",
  plank: "#a68a58"           // documented lighter-than-ground exception (wharf decking)
};
var ROAD_LAYER_ALPHA = { ghost:0.16, faint:0.42, door:0.52, trail:0.78, r3:0.90, r4:0.95, plank:0.92 };
// s65: "door" is the worn door-path class — its own compositing layer so the
// footpath family can sit FAINTER than any street class (thinner + fainter
// than streets, per the constant-width amendment's footpath register).
var ROAD_LAYER_ORDER = ["ghost","faint","door","trail","r3","r4","plank"]; // low->high; each layer erases what lies beneath (one owner)

/* Resample a run's raw centerline at ~7m with a seeded two-sine lateral
   meander (country roads / trails / work paths only — a PLATTED street's
   band never leaves its master centerline, s62 constant-width amendment;
   the per-class roadMeanderAmp table was deleted with the width-morph
   machinery). `s0` is the run's arc offset so adjoining runs phase-match. */
function buildRunNodes(rawPts, amp, seed, s0){
  if(!rawPts || rawPts.length<2) return null;
  var STEP=7, nodes=[], dAcc=s0||0, ph1=seed*37.0, ph2=seed*91.0;
  for(var i=0;i<rawPts.length-1;i++){
    var ax=rawPts[i].x, az=rawPts[i].z, bx=rawPts[i+1].x, bz=rawPts[i+1].z;
    var dx=bx-ax, dz=bz-az, len=Math.hypot(dx,dz);
    if(len<1e-6) continue;
    var nxp=-dz/len, nzp=dx/len;
    var n=Math.max(1, Math.round(len/STEP));
    for(var k=(nodes.length?1:0);k<=n;k++){
      var tt=k/n, d=dAcc+len*tt;
      var off=amp*(0.62*Math.sin(d*0.045+ph1)+0.38*Math.sin(d*0.016+ph2));
      nodes.push({x:ax+dx*tt+nxp*off, z:az+dz*tt+nzp*off});
    }
    dAcc+=len;
  }
  return nodes.length>=2 ? nodes : null;
}

// Scratch bbox tracking (composite/clear only the touched region).
var _scr = { x0:0, y0:0, x1:0, y1:0, any:false };
function _scrReset(){ _scr.any=false; _scr.x0=_scr.y0=Infinity; _scr.x1=_scr.y1=-Infinity; }
function _scrGrow(p, r){
  if(p.x-r<_scr.x0) _scr.x0=p.x-r; if(p.x+r>_scr.x1) _scr.x1=p.x+r;
  if(p.y-r<_scr.y0) _scr.y0=p.y-r; if(p.y+r>_scr.y1) _scr.y1=p.y+r;
  _scr.any=true;
}
function _scrStroke(ctx, pxFn, pxLenFn, pts, widthM, color, cap){
  if(!pts || pts.length<2) return;
  var _pw = pxLenFn(widthM);
  ctx.globalAlpha = Math.min(1, _pw); // sub-texel coverage rule, in-layer
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, _pw);
  ctx.lineJoin = "round"; ctx.lineCap = cap||"butt";
  ctx.beginPath();
  var p0 = pxFn(pts[0].x, pts[0].z);
  ctx.moveTo(p0.x, p0.y); _scrGrow(p0, _pw);
  for(var i=1;i<pts.length;i++){ var p = pxFn(pts[i].x, pts[i].z); ctx.lineTo(p.x, p.y); _scrGrow(p, _pw); }
  ctx.stroke();
}
/* Ragged dead-end fade: destination-out gradient along the final stretch
   plus a few erase nibbles — a road end is a ragged fade-out strip, not a
   circle (§2). Operates on the OPAQUE scratch layer, so the fade is exact. */
function _scrEndFade(ctx, pxFn, pxLenFn, nodes, atStart, widthM, seed, fadeFrac){
  if(!nodes || nodes.length<2) return;
  var total=0, i;
  for(i=0;i<nodes.length-1;i++) total += Math.hypot(nodes[i+1].x-nodes[i].x, nodes[i+1].z-nodes[i].z);
  // s62 (§2 + user finding): a ragged fade is AT MOST one street-width long
  // — the old 2.2W+6 reach drew the "tapered spike" tails at terminations
  var L = Math.min(total*(fadeFrac||0.5), Math.max(widthM, 8));
  var pts = atStart ? nodes : nodes.slice().reverse(); // pts[0] = the dead end
  // walk back L meters from the end
  var acc=0, backPt=pts[pts.length-1];
  for(i=0;i<pts.length-1;i++){
    var seg = Math.hypot(pts[i+1].x-pts[i].x, pts[i+1].z-pts[i].z);
    if(acc+seg>=L){ var t=(L-acc)/seg; backPt={x:lerp(pts[i].x,pts[i+1].x,t), z:lerp(pts[i].z,pts[i+1].z,t)}; break; }
    acc+=seg;
  }
  var pe = pxFn(pts[0].x, pts[0].z), pb = pxFn(backPt.x, backPt.z);
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  var g = ctx.createLinearGradient(pb.x, pb.y, pe.x, pe.y);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.72, "rgba(0,0,0,0.8)"); g.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalAlpha = 1;
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1, pxLenFn(widthM*2.0));
  ctx.lineCap = "butt";
  ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pe.x, pe.y); ctx.stroke();
  // ragged nibbles at the tip
  var dirx = pe.x-pb.x, diry = pe.y-pb.y, dl = Math.hypot(dirx,diry)||1;
  dirx/=dl; diry/=dl;
  var nibM = Math.min(widthM, 6); // s62: nibble geometry capped absolute — wide constant-width streets no longer scatter huge erase blobs
  for(var k=0;k<4;k++){
    var h1 = _strokeN(seed||0.5, 40+k*3), h2 = _strokeN(seed||0.5, 41+k*3);
    var cx = pe.x - dirx*pxLenFn(nibM)*(0.2+h1*1.3) + (-diry)*pxLenFn(widthM)*(h2-0.5)*1.0;
    var cy = pe.y - diry*pxLenFn(nibM)*(0.2+h1*1.3) + ( dirx)*pxLenFn(widthM)*(h2-0.5)*1.0;
    ctx.globalAlpha = 0.55+h1*0.4;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, pxLenFn(nibM*(0.18+h2*0.22))), 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
/* CONSTANT-WIDTH PAINTER (s62 — road-master-spec CONSTANT-WIDTH AMENDMENT):
   exactly two width families — a street's surveyed class width (constant
   along its whole length and over time) and the ~1.8m footpath. ALL width
   interpolation/taper/jitter code is deleted (it was the source of the
   Frankenstein bulges/ballooning junctions). Lifecycle renders as FILL /
   surface treatment inside the constant width (run.fill: "full" | "partial").

   CASING: the old hard two-tone under-pass read as TWO SEPARATE DARK RAILS
   at oblique angles. It is now a width-proportional inner edge GRADIENT —
   two nested whole-layer passes stepping softly darker toward the rim; all
   rim passes for the layer paint BEFORE any core, so the gradient only rims
   the OUTSIDE of the unioned network (junctions painted once, clean). */
var ROAD_CASE_W = 1.0; // per-side shaded-edge width (m), absolute — never class-scaled
function _scrCasingPass(t, run, widthM, mixT){
  var col = _mixCol(_parseSplatCol(run.col), _parseSplatCol(run.caseCol), mixT);
  t.sctx.globalAlpha = 1;
  _scrStroke(t.sctx, t.pxFn, t.pxLenFn, run.nodes, widthM, col, "butt");
}
function _scrRoadRun(t, run){
  var ctx = t.sctx, nodes = run.nodes;
  var base = _parseSplatCol(run.col);
  var coreW = (t.detail && run.caseW) ? Math.max(run.widthM - 2*run.caseW, run.widthM*0.6) : run.widthM;
  var partial = run.fill==="partial";
  if(!t.detail){
    // coarse world tier: one plain constant stroke (partial fill reads as a
    // lighter wash at map scale — the class grammar's "patchy" register)
    _scrStroke(ctx, t.pxFn, t.pxLenFn, nodes, run.widthM,
      partial ? _mixCol(base, _parseSplatCol(ROAD_COLS.partialWash), 0.45) : run.col, "butt");
    return;
  }
  var seed = run.seed, j, a, b, dx, dz, len, dk;
  if(partial){
    /* S3 PARTIAL FILL: a light worn wash across the constant width, with
       broken opaque worn bands (wheel/foot lanes) inside it — patchy fill
       progression, never width progression. */
    _scrStroke(ctx, t.pxFn, t.pxLenFn, nodes, coreW, _mixCol(base, _parseSplatCol(ROAD_COLS.partialWash), 0.55), "butt");
    var bandDefs = [ {off:-0.28, w:0.26, ph:0.0}, {off:-0.01, w:0.30, ph:2.2}, {off:0.25, w:0.24, ph:4.1} ];
    for(var bi=0;bi<bandDefs.length;bi++){
      var bd = bandDefs[bi];
      var line = splatOffsetPolyline(nodes, coreW*bd.off);
      var d = 0, runPts = [];
      for(var k=0;k<line.length;k++){
        if(k>0) d += Math.hypot(line[k].x-line[k-1].x, line[k].z-line[k-1].z);
        var v = 0.5+0.5*Math.sin(d*0.055+bd.ph+seed*31.0) + (_strokeN(seed, 900+k*2+bi)-0.5)*0.6;
        if(v > 0.42) runPts.push(line[k]);
        if((v <= 0.42 || k===line.length-1) && runPts.length){
          if(runPts.length>=2){
            dk = 1 + (_strokeN(seed, 950+k+bi*7)-0.5)*0.10;
            _scrStroke(ctx, t.pxFn, t.pxLenFn, runPts, coreW*bd.w, _jitterCol(base, dk), "butt");
          }
          runPts = [];
        }
      }
    }
  } else {
    // S4 FULL FILL: constant width, per-segment tone wobble only
    for(j=0;j<nodes.length-1;j++){
      a = nodes[j]; b = nodes[j+1];
      // clip terminal segment extensions back inside the run so nothing protrudes
      dx=b.x-a.x; dz=b.z-a.z; len=Math.hypot(dx,dz)||1;
      var aa = (j===0) ? a : {x:a.x-dx/len*coreW*0.4, z:a.z-dz/len*coreW*0.4};
      var bb = (j===nodes.length-2) ? b : {x:b.x+dx/len*coreW*0.4, z:b.z+dz/len*coreW*0.4};
      // tone wobble kept subtle — larger values read as tiled panels at the
      // close tier's resolution (s27 plaza-150m finding)
      dk = 1 + (_strokeN(seed, j*2)-0.5)*0.11;
      _scrStroke(ctx, t.pxFn, t.pxLenFn, [aa,bb], coreW, _jitterCol(base, dk), "butt");
    }
  }
  if(run.ruts && coreW>=3.4){
    /* broken wheel-rut twins at TRUE wagon gauge (s62: absolute meters —
       the old coreW-proportional offset/width scaled to ~3m dark lines on
       the wide constant-width streets: the user's "two dark rails").
       Wide streets get two travel lanes; the ruts stay thin and broken. */
    var rutCol = _mixCol(_parseSplatCol(ROAD_COLS.rut), base, 0.5);
    var rutOff = 0.78, rutW = 0.4;
    var lanes = coreW>=9 ? [-coreW*0.18, coreW*0.18] : [0];
    for(var li=0; li<lanes.length; li++){
      var laneC = lanes[li];
      [rutOff,-rutOff].forEach(function(off, side){
        var line = splatOffsetPolyline(nodes, laneC+off);
        var ph = seed*53.0 + side*2.7 + li*1.9, d2 = 0, runPts2 = [];
        for(var k=0;k<line.length;k++){
          if(k>0) d2 += Math.hypot(line[k].x-line[k-1].x, line[k].z-line[k-1].z);
          var v = 0.5+0.5*Math.sin(d2*0.09+ph) + (_strokeN(seed,700+k*2+side+li*97)-0.5)*0.55;
          if(v > 0.38) runPts2.push(line[k]);
          if((v <= 0.38 || k===line.length-1) && runPts2.length){
            if(runPts2.length>=2) _scrStroke(ctx, t.pxFn, t.pxLenFn, runPts2, rutW, rutCol, "butt");
            runPts2 = [];
          }
        }
      });
    }
  }
  if(run.churn){
    // hoof-churned mottle (§4 worn street), detail tiers only — s62: blotch
    // radius capped ABSOLUTE (the old coreW-proportional radius blew up to
    // ~3m smudge blobs on wide streets, worst at junctions)
    var churnCol = _mixCol(_parseSplatCol(ROAD_COLS.rut), base, 0.55);
    ctx.fillStyle = churnCol;
    for(var m=1;m<nodes.length-1;m++){
      var hh = _strokeN(seed, 300+m);
      if(hh>0.62){
        var pc = t.pxFn(nodes[m].x + (_strokeN(seed,500+m)-0.5)*coreW*0.35, nodes[m].z + (_strokeN(seed,600+m)-0.5)*coreW*0.35);
        ctx.globalAlpha = 0.30+(hh-0.62)*0.8;
        ctx.beginPath(); ctx.arc(pc.x, pc.y, Math.max(1, t.pxLenFn(Math.min(1.1, coreW*0.06+hh*0.4))), 0, Math.PI*2); ctx.fill();
        _scrGrow(pc, t.pxLenFn(coreW*0.2));
      }
    }
    ctx.globalAlpha = 1;
  }
}
/* Ghost run — the surveyor's RIGHT-OF-WAY HINT (s62 constant-width
   amendment): the full class width is marked by its BOUNDARIES — two
   scratched, gappy edge lines at ±W/2 — never a filled band (§9
   no-map-overlay: a plat is a promise; nearly invisible at altitude).
   Narrow ways and the coarse world tier keep the old thin center scratch
   (an edge pair is sub-texel there anyway). Opaque in-layer; the layer
   alpha keeps it faint. */
function _scrGhostRun(t, run){
  var ctx = t.sctx, nodes = run.nodes;
  var base = _parseSplatCol(run.col);
  if(!t.detail || run.widthM < 3.5){
    var w = Math.min(run.widthM*0.35, 1.5);
    for(var j=0;j<nodes.length-1;j++){
      var a=nodes[j], b=nodes[j+1];
      var hh = hash2((a.x+b.x)*0.0105, (a.z+b.z)*0.0105);
      if(hh > 0.80) continue; // gap — scratched, not vector-drawn
      _scrStroke(ctx, t.pxFn, t.pxLenFn, [a,b], w*(0.7+hh*0.6), _jitterCol(base, 0.85+hh*0.4), "butt");
    }
    return;
  }
  [ -run.widthM/2, run.widthM/2 ].forEach(function(off, side){
    var line = splatOffsetPolyline(nodes, off);
    for(var j=0;j<line.length-1;j++){
      var a=line[j], b=line[j+1];
      var hh = hash2((a.x+b.x)*0.0105+side*3.7, (a.z+b.z)*0.0105);
      if(hh > 0.72) continue; // gappy scratch, not a drawn rule
      _scrStroke(ctx, t.pxFn, t.pxLenFn, [a,b], 0.55+hh*0.5, _jitterCol(base, 0.82+hh*0.4), "butt");
    }
  });
}
/* Planked surface (§4, documented only): transverse plank strokes with
   per-plank tone jitter and gap lines — the documented lighter-than-
   ground exception (wharf decking). */
function _scrPlankRun(t, run){
  var ctx = t.sctx;
  var a = run.nodes[0], b = run.nodes[run.nodes.length-1];
  var dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)||1;
  var ux=dx/len, uz=dz/len, nx=-uz, nz=ux;
  var base = _parseSplatCol(run.col);
  if(!t.detail){
    _scrStroke(ctx, t.pxFn, t.pxLenFn, run.nodes, run.widthM, run.col, "butt");
    return;
  }
  var stepM = 0.42, half = run.widthM/2;
  for(var d=0; d<=len; d+=stepM){
    var hh = hash2((a.x+ux*d)*1.7, (a.z+uz*d)*1.7);
    if(hh>0.96) continue; // a missing plank here and there
    var cx = a.x+ux*d, cz = a.z+uz*d;
    var dk = 0.86+hh*0.30;
    var p0 = {x:cx+nx*half, z:cz+nz*half}, p1 = {x:cx-nx*half, z:cz-nz*half};
    _scrStroke(ctx, t.pxFn, t.pxLenFn, [p0,p1], stepM*0.82, _jitterCol(base, dk), "butt");
  }
}
/* Draw + composite one class layer for one tier. Erase-then-draw gives
   exact one-owner-per-pixel between classes; within the layer the opaque
   scratch union already guarantees single-surface intersections. */
function drawRoadLayer(t, runs, layerAlpha){
  var use = [];
  for(var i=0;i<runs.length;i++){
    var r = runs[i];
    if(r.detailOnly && !t.detail) continue;
    // skip runs entirely outside this tier's box (padded)
    if(t.box){
      var bb = r.bbox;
      var pad = r.widthM*2+12;
      if(bb.x1 < t.box.xMin-pad || bb.x0 > t.box.xMax+pad || bb.z1 < t.box.zMin-pad || bb.z0 > t.box.zMax+pad) continue;
    }
    // skip runs that lie entirely inside a HIGHER tier's ownership core —
    // the tier cutout would erase them anyway (pure cost saving)
    if(t.skipInside){
      var bi = r.bbox, f = TIER_FEATHER_M+10;
      if(bi.x0 > t.skipInside.xMin+f && bi.x1 < t.skipInside.xMax-f &&
         bi.z0 > t.skipInside.zMin+f && bi.z1 < t.skipInside.zMax-f) continue;
    }
    use.push(r);
  }
  if(!use.length) return;
  var ctx = t.sctx;
  // clear the scratch region touched by the previous layer
  if(t._dirty){ ctx.clearRect(t._dirty.x0, t._dirty.y0, t._dirty.x1-t._dirty.x0, t._dirty.y1-t._dirty.y0); }
  _scrReset();
  ctx.save();
  // s62 gradient casing: TWO nested whole-layer under-passes (outer rim,
  // then inner rim) before any core — a soft darker edge gradient inside
  // the constant-width stroke, rimming only the OUTSIDE of the unioned
  // network (junctions painted once; the old single hard pass read as two
  // separate dark rails at oblique angles)
  if(t.detail){
    for(var c=0;c<use.length;c++){ if(use[c].kind==="road" && use[c].caseW) _scrCasingPass(t, use[c], use[c].widthM, 0.62); }
    for(var c2=0;c2<use.length;c2++){ if(use[c2].kind==="road" && use[c2].caseW) _scrCasingPass(t, use[c2], use[c2].widthM - use[c2].caseW, 0.30); }
  }
  for(var j=0;j<use.length;j++){
    var run = use[j];
    if(run.kind==="ghost") _scrGhostRun(t, run);
    else if(run.kind==="plank") _scrPlankRun(t, run);
    else _scrRoadRun(t, run);
  }
  // ragged dead-end fades (marked during network assembly)
  for(var k=0;k<use.length;k++){
    var rk = use[k];
    if(rk.fadeA) _scrEndFade(ctx, t.pxFn, t.pxLenFn, rk.nodes, true, rk.widthM, rk.seed, rk.fadeFrac);
    if(rk.fadeB) _scrEndFade(ctx, t.pxFn, t.pxLenFn, rk.nodes, false, rk.widthM, rk.seed, rk.fadeFrac);
  }
  ctx.restore();
  if(!_scr.any) return;
  var x0 = Math.max(0, Math.floor(_scr.x0)), y0 = Math.max(0, Math.floor(_scr.y0));
  var x1 = Math.min(t.res, Math.ceil(_scr.x1)), y1 = Math.min(t.res, Math.ceil(_scr.y1));
  if(x1<=x0 || y1<=y0){ t._dirty = {x0:0,y0:0,x1:0,y1:0}; return; }
  t._dirty = { x0:x0, y0:y0, x1:x1, y1:y1 };
  var w = x1-x0, h = y1-y0;
  t.ctx.save();
  t.ctx.globalCompositeOperation = "destination-out";
  t.ctx.globalAlpha = 1;
  t.ctx.drawImage(splatScratchCanvas, x0,y0,w,h, x0,y0,w,h);
  t.ctx.globalCompositeOperation = "source-over";
  t.ctx.globalAlpha = layerAlpha;
  t.ctx.drawImage(splatScratchCanvas, x0,y0,w,h, x0,y0,w,h);
  t.ctx.restore();
}

/* Static (non-swinging) ground-marking data — filled in later by the
   sections that compute it (Mission road, worn door-paths, plaza clutter
   paths, dune-leveling cart track, wharf plank aprons) as the file's
   top-level setup runs. renderGroundSplat() reads whatever's populated
   at call time; the first repaint happens on the first animate() frame,
   by which point every section below has already run. */
var SPLAT_MISSION_PTS = [], SPLAT_ELCAMINO_PTS = [], SPLAT_PRESIDIO_PTS = [], SPLAT_DOOR_PATHS = [];
var SPLAT_CLUTTER_PATHS = [], SPLAT_LEVELING_CART_PTS = [];
var SPLAT_PLANK_APRONS = []; // {x0,z0,x1,z1,widthM,from} — pushed by the wharf builder

/* ?debugroads (s65 STRAY-LINE CENSUS): every painted line gets a canvas-drawn
   midpoint label with its source id (street id / door-path / desire-trail /
   plaza-path / cart-track / ...), and splatStats.census counts every run by
   source class — so "what IS that line" is answerable by system, not by eye.
   Debug paint pollutes the alpha canvases: never run audits in a ?debugroads
   tab. */
var DEBUG_ROADS = /[?&]debugroads/i.test(location.search);
var DEBUG_ROAD_LABELS = []; // {x,z,label} — rebuilt each repaint when DEBUG_ROADS

/* THE master (re)draw. `skewAngle` is the grid's CURRENT skew — the full
   as-built Vioget frame (-6.5°) before Feb 1847, eased to the permanent
   GRID_ROT_BASE (-9.0°) by Aug 1847, per updateGridSwing() above. */
var SPLAT_LAST_STATS = null;
var ROADSTATE_LAST = null; // per-street lifecycle snapshot of the last repaint (__P1850.roadState)
function renderGroundSplat(skewAngle){
  var _statT0 = performance.now();
  var _stats = { simDay: simDay, skew: skewAngle, streets: {} };
  splatWorldCtx.clearRect(0,0,SPLAT_WORLD_RES,SPLAT_WORLD_RES);
  splatTownCtx.clearRect(0,0,SPLAT_TOWN_RES,SPLAT_TOWN_RES);
  splatCloseCtx.clearRect(0,0,SPLAT_CLOSE_RES,SPLAT_CLOSE_RES);
  ROADSTATE_LAST = {};

  var TIERS = [
    { name:"world", ctx:splatWorldCtx, sctx:splatScratchCtx, pxFn:worldPx, pxLenFn:worldPxLen, res:SPLAT_WORLD_RES, detail:false,
      box:null, skipInside:TOWN_BOX, _dirty:null },
    { name:"town",  ctx:splatTownCtx, sctx:splatScratchCtx, pxFn:townPx, pxLenFn:townPxLen, res:SPLAT_TOWN_RES, detail:true,
      box:TOWN_BOX, skipInside:CLOSE_BOX, _dirty:null },
    { name:"close", ctx:splatCloseCtx, sctx:splatScratchCtx, pxFn:closePx, pxLenFn:closePxLen, res:SPLAT_CLOSE_RES, detail:true,
      box:CLOSE_BOX, skipInside:null, _dirty:null }
  ];

  // Plaza — Portsmouth Square corner frame (streets swing it through the
  // O'Farrell window). The authored plaza paint itself (paintPlaza below)
  // runs AFTER network assembly; here we just fix the frame and hand the
  // wet-season shader coupling its current rect (center/axes/half-extents).
  var plazaCorners = [
    gridToWorld(GEO.plaza.uMin, GEO.plaza.vMin), gridToWorld(GEO.plaza.uMax, GEO.plaza.vMin),
    gridToWorld(GEO.plaza.uMax, GEO.plaza.vMax), gridToWorld(GEO.plaza.uMin, GEO.plaza.vMax)
  ];
  (function(){
    var cx=(plazaCorners[0].x+plazaCorners[2].x)/2, cz=(plazaCorners[0].z+plazaCorners[2].z)/2;
    var ux=plazaCorners[1].x-plazaCorners[0].x, uz=plazaCorners[1].z-plazaCorners[0].z;
    var vx=plazaCorners[3].x-plazaCorners[0].x, vz=plazaCorners[3].z-plazaCorners[0].z;
    var hu=Math.hypot(ux,uz)/2, hv=Math.hypot(vx,vz)/2;
    var uux=ux/(hu*2), uuz=uz/(hu*2);
    PLAZA_RECT_STATE.cx=cx; PLAZA_RECT_STATE.cz=cz;
    PLAZA_RECT_STATE.ux=uux; PLAZA_RECT_STATE.uz=uuz;
    PLAZA_RECT_STATE.hu=hu; PLAZA_RECT_STATE.hv=hv;
    for(var pi=0; pi<PLAZA_UNIFORM_SETS.length; pi++){
      var U = PLAZA_UNIFORM_SETS[pi];
      U.uPlazaC.value.set(cx,cz); U.uPlazaU.value.set(uux,uuz); U.uPlazaHalf.value.set(hu,hv);
    }
  })();

  /* ---- assemble the per-class network layers ---- */
  var LAYERS = { ghost:[], faint:[], door:[], trail:[], r3:[], r4:[], plank:[] };
  var PIER_RUNS = [];
  function runBBox(nodes){
    var x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;
    for(var i=0;i<nodes.length;i++){
      if(nodes[i].x<x0)x0=nodes[i].x; if(nodes[i].x>x1)x1=nodes[i].x;
      if(nodes[i].z<z0)z0=nodes[i].z; if(nodes[i].z>z1)z1=nodes[i].z;
    }
    return {x0:x0,z0:z0,x1:x1,z1:z1};
  }
  function addRun(bucket, kind, rawPts, widthM, col, opts){
    opts = opts||{};
    var seed = opts.seed!=null?opts.seed:hash2(rawPts[0].x*0.037, rawPts[0].z*0.037);
    var amp = opts.amp!=null?opts.amp:1.1; // explicit per-caller; default is a mild work-path wander
    var nodes = opts.noMeander ? rawPts : buildRunNodes(rawPts, amp, seed, opts.s0||0);
    if(!nodes || nodes.length<2) return null;
    var run = { bucket:bucket, kind:kind, nodes:nodes, widthM:widthM, col:col, seed:seed,
      caseW:opts.caseW||0, caseCol:opts.caseCol||null, ruts:!!opts.ruts, churn:!!opts.churn,
      fill:opts.fill||"full", // s62 constant-width amendment: lifecycle is FILL progression, never width
      detailOnly:!!opts.detailOnly, isStreet:!!opts.isStreet,
      fadeA:false, fadeB:!!opts.fadeB, fadeFrac:opts.fadeFrac||0.45, noEndFade:!!opts.noEndFade,
      src:opts.src||"UNKNOWN", // s65 census: the LIVE SYSTEM this line came from — no source, no paint
      bbox:null };
    run.bbox = runBBox(nodes);
    LAYERS[bucket].push(run);
    return run;
  }

  // (plaza diagonals live in paintPlaza() now — s65 bespoke treatment)

  // Mission Road + El Camino Real — single irregular darker-than-ground
  // dirt tracks (screening #11 retone preserved): the Mission road is a
  // cart route (broken ruts), El Camino a fainter trace. Both fade out
  // raggedly at their far ends via the dead-end pass.
  if(SPLAT_MISSION_PTS.length>1)
    addRun("trail", "road", smoothRoutePts(SPLAT_MISSION_PTS, 14), 4.8, "#7d693f", {amp:1.1, seed:0.37, ruts:true, isStreet:true, src:"mission-road"});
  if(SPLAT_ELCAMINO_PTS.length>1)
    addRun("faint", "road", smoothRoutePts(SPLAT_ELCAMINO_PTS, 14), 3.4, "#93805a", {amp:1.2, seed:0.61, isStreet:true, src:"el-camino-real"});
  if(SPLAT_PRESIDIO_PTS.length>1) // s46: the documented village->Black Point->Presidio horse trail (peninsula-1846.md §5.5)
    addRun("faint", "road", smoothRoutePts(SPLAT_PRESIDIO_PTS, 14), 3.0, "#93805a", {amp:1.15, seed:0.44, isStreet:true, src:"presidio-trail"});

  // Dune-leveling cart track — a work path, not a street (live system:
  // people.js's dune-leveling crew set-piece hands us its own waypoints)
  if(SPLAT_LEVELING_CART_PTS.length>1)
    addRun("faint", "road", smoothRoutePts(SPLAT_LEVELING_CART_PTS, 12), 1.6, "#8f7a54", {detailOnly:true, amp:0.8, seed:0.71, src:"cart-track"});

  // Wharf plank aprons (§4 planked surface — documented decking, the
  // lighter-than-ground exception), date-gated by their builders.
  SPLAT_PLANK_APRONS.forEach(function(ap,i){
    if(simDay < ap.from) return;
    addRun("plank", "plank", [{x:ap.x0,z:ap.z0},{x:ap.x1,z:ap.z1}], ap.widthM, ROAD_COLS.plank, {noMeander:true, noEndFade:true, src:"plank-apron#"+i});
  });
  // (door-paths + desire trails moved BELOW the street network assembly —
  //  s65: their endpoints are validated against the PAINTED network of this
  //  very repaint, so an orphan stub can never be drawn.)

  /* ---- THE STREET NETWORK (grounding.md §9 + §9b) ---- */
  STREETS_RUNTIME.forEach(function(s){
    var gateDay = s.surveyedDay!=null ? s.surveyedDay : s.firstMentionDay;
    if(gateDay==null || simDay<gateDay) return; // S0 — not yet on any map or in any corpus mention
    var active = s.checkpoints[0];
    for(var ci=0; ci<s.checkpoints.length; ci++){ if(s.checkpoints[ci].day<=simDay) active=s.checkpoints[ci]; }
    if(!active) return;
    var i0=active.extent[0], i1=active.extent[1], angle=s.swings?skewAngle:GRID_ROT_BASE;
    var pathPts=[];
    for(var pi=i0; pi<=i1; pi++) pathPts.push(gridToWorldAt(s.polyline[pi].u, s.polyline[pi].v, angle));
    if(pathPts.length<2) return;
    var viogetExt = (s.surveyedDay!=null && s.surveyedDay<=0 && s.checkpoints.length) ? s.checkpoints[0].extent : null;

    var _rec = _stats.streets[s.id] = { extent:[i0,i1], state:0, maxUse:0, ghostSegs:0, wornSegs:0, pierSegs:0, pieces:[] };
    var lifePieces = [];

    // subdivide into <=50m lifecycle pieces
    var arc = 0;
    var pieceList = []; // {a,b,mid,s0,len,st,use,wet,vf}
    for(var segI=0; segI<pathPts.length-1; segI++){
      var A = pathPts[segI], B = pathPts[segI+1];
      var segLen = Math.hypot(B.x-A.x, B.z-A.z);
      var nSub = Math.max(1, Math.min(18, Math.round(segLen/50)));
      for(var sub=0; sub<nSub; sub++){
        var t0=sub/nSub, t1=(sub+1)/nSub;
        var a = {x:A.x+(B.x-A.x)*t0, z:A.z+(B.z-A.z)*t0}, b = {x:A.x+(B.x-A.x)*t1, z:A.z+(B.z-A.z)*t1};
        var mid = {x:(a.x+b.x)/2, z:(a.z+b.z)/2};
        // WET = below the HIGH-TIDE line: a platted line across the tide
        // flats is a water lot, never a walkable street (shoreline truth)
        var wet = terrainHeight(a.x,a.z)<=0.5 && terrainHeight(b.x,b.z)<=0.5;
        var vf = !!(viogetExt && (i0+segI)>=viogetExt[0] && (i0+segI+1)<=viogetExt[1]);
        pieceList.push({ a:a, b:b, mid:mid, s0:arc, len:segLen/nSub, wet:wet, vf:vf,
          use: wet?0:roadPieceUse(mid.x, mid.z, simDay), st:0 });
        arc += segLen/nSub;
      }
    }
    // ARC SMOOTHING + MIN-RUN MERGE (s27 polish): a road's class does not
    // flip every 50m. Use is smoothed along the street (~150m window)
    // before state mapping, and any class run shorter than ~90m between
    // equal neighbors (or <60m anywhere) is absorbed, so class changes
    // land at plausible spots instead of stippling mid-block.
    var pi2;
    var smoothU = pieceList.map(function(p, i){
      if(p.wet) return 0;
      var prev = i>0 && !pieceList[i-1].wet ? pieceList[i-1].use : p.use;
      var next = i<pieceList.length-1 && !pieceList[i+1].wet ? pieceList[i+1].use : p.use;
      return 0.25*prev + 0.5*p.use + 0.25*next;
    });
    for(pi2=0; pi2<pieceList.length; pi2++){
      var pp = pieceList[pi2];
      pp.st = pp.wet ? -1 : roadStateFromUse(s, smoothU[pi2], simDay, pp.vf);
    }
    for(var mergePass=0; mergePass<2; mergePass++){
      var runStart=0;
      for(pi2=1; pi2<=pieceList.length; pi2++){
        if(pi2===pieceList.length || pieceList[pi2].st!==pieceList[runStart].st){
          var runLen=0, ri;
          for(ri=runStart; ri<pi2; ri++) runLen += pieceList[ri].len;
          var prevSt = runStart>0 ? pieceList[runStart-1].st : null;
          var nextSt = pi2<pieceList.length ? pieceList[pi2].st : null;
          var cur = pieceList[runStart].st;
          if(cur>=0){
            var absorb = null;
            if(prevSt!=null && prevSt===nextSt && prevSt>=0 && runLen<90) absorb = prevSt;
            else if(runLen<60 && (prevSt!=null||nextSt!=null)){
              var lo = Math.min(prevSt==null?99:prevSt, nextSt==null?99:nextSt);
              if(lo>=0 && lo<99) absorb = lo;
            }
            if(absorb!=null && absorb!==cur){ for(ri=runStart; ri<pi2; ri++) pieceList[ri].st = absorb; }
          }
          runStart = pi2;
        }
      }
    }
    for(pi2=0; pi2<pieceList.length; pi2++){
      var pf = pieceList[pi2];
      _rec.maxUse = Math.max(_rec.maxUse, pf.wet?0:pf.use);
      if(!pf.wet) _rec.state = Math.max(_rec.state, pf.st);
      _rec.pieces.push({ x:Math.round(pf.mid.x), z:Math.round(pf.mid.z), st:pf.wet?"wet":pf.st, use:Math.round(pf.wet?0:pf.use) });
    }
    lifePieces = pieceList;
    ROADSTATE_LAST[s.id] = { id:s.id, name:s.name, state:_rec.state, pieces:_rec.pieces };

    /* ONE shared STRAIGHT chain for the whole painted extent (s62,
       road-master-spec §1 + constant-width amendment): the master line is
       inviolate — the platted band renders ON the centerline at constant
       class width; only the S2 footpath INSIDE the right-of-way wanders.
       Class runs are node ranges over this chain (adjacent runs share
       their boundary node); the amplitude-interpolation machinery that
       morphed width/meander across class boundaries is DELETED. */
    var seedS = _streetSeed(s.id);
    var totalArc = arc;
    function pieceIdxAt(d){
      var lo=0, hi=lifePieces.length-1;
      while(lo<hi){ var m=(lo+hi+1)>>1; if(lifePieces[m].s0<=d) lo=m; else hi=m-1; }
      return lo;
    }
    var chain=[], dAcc=0;
    for(var cs=0; cs<pathPts.length-1; cs++){
      var A2=pathPts[cs], B2=pathPts[cs+1];
      var dx2=B2.x-A2.x, dz2=B2.z-A2.z, len2=Math.hypot(dx2,dz2);
      if(len2<1e-6) continue;
      var n2=Math.max(1, Math.round(len2/7));
      for(var k2=(chain.length?1:0); k2<=n2; k2++){
        var tt2=k2/n2;
        chain.push({ x:A2.x+dx2*tt2, z:A2.z+dz2*tt2, d:dAcc+len2*tt2 });
      }
      dAcc+=len2;
    }
    /* the trodden-footpath wander (S2 only): a seeded two-sine lateral
       offset on the run's own nodes, clamped to stay INSIDE the ROW */
    function meanderNodes(nodesIn, amp){
      var ph1=seedS*37.0, ph2=seedS*91.0, out=[];
      for(var i=0;i<nodesIn.length;i++){
        var p=nodesIn[i];
        var pA=nodesIn[Math.max(0,i-1)], pB=nodesIn[Math.min(nodesIn.length-1,i+1)];
        var ddx=pB.x-pA.x, ddz=pB.z-pA.z, dl=Math.hypot(ddx,ddz)||1;
        var off = amp*(0.62*Math.sin(p.d*0.045+ph1)+0.38*Math.sin(p.d*0.016+ph2));
        out.push({x:p.x+(-ddz/dl)*off, z:p.z+(ddx/dl)*off});
      }
      return out;
    }
    var STREET_TRAIL_W = 1.8; // the footpath family's ONE narrow constant width
    var curKey=null, curNodes=null;
    function flushRun(){
      if(curKey==null || !curNodes || curNodes.length<2){ curKey=null; curNodes=null; return; }
      if(curKey===-1){ // wet — pier hint over the tideflat
        PIER_RUNS.push({ pts:curNodes, widthM:s.widthM, src:"street:"+s.id+"#pier" });
        _rec.pierSegs += curNodes.length-1;
        curKey=null; curNodes=null; return;
      }
      if(curKey===0){ curKey=null; curNodes=null; return; }
      /* CONSTANT-WIDTH AMENDMENT: lifecycle = FILL/TREATMENT progression
         inside the constant class width, NEVER width change.
           S1 — faint right-of-way boundary hint (full class width)
           S2 — the ROW hint stays + a trodden footpath line INSIDE it
           S3 — partial fill: light wash + patchy worn bands, edge gradient
           S4 — full worn surface, edge gradient, ruts, churn */
      if(curKey===1){
        addRun("ghost", "ghost", curNodes, s.widthM, ROAD_COLS.ghost, { seed:seedS, noMeander:true, src:"street:"+s.id+"#S1-ghost" });
        _rec.ghostSegs += curNodes.length-1;
      } else if(curKey===2){
        if(s.surveyedDay!=null)
          addRun("ghost", "ghost", curNodes, s.widthM, ROAD_COLS.ghost, { seed:seedS, noMeander:true, src:"street:"+s.id+"#S2-row-hint" });
        var amp = s.surveyedDay!=null
          ? Math.min(2.2, Math.max(0.8, s.widthM/2 - STREET_TRAIL_W))  // wander stays inside the platted ROW
          : 2.8;                                                        // unplatted desire path — freer (§9b)
        addRun("trail", "road", meanderNodes(curNodes, amp), STREET_TRAIL_W, ROAD_COLS.trail,
          { seed:seedS, noMeander:true, isStreet:true, src:"street:"+s.id+"#S2-trail" });
        _rec.wornSegs += curNodes.length-1;
      } else if(curKey===3){
        addRun("r3", "road", curNodes, s.widthM, ROAD_COLS.r3,
          { seed:seedS, noMeander:true, caseW:ROAD_CASE_W, caseCol:ROAD_COLS.r3case, ruts:true, fill:"partial", isStreet:true, src:"street:"+s.id+"#S3" });
        _rec.wornSegs += curNodes.length-1;
      } else {
        addRun("r4", "road", curNodes, s.widthM, ROAD_COLS.r4,
          { seed:seedS, noMeander:true, caseW:ROAD_CASE_W, caseCol:ROAD_COLS.r4case, ruts:true, churn:true, fill:"full", isStreet:true, src:"street:"+s.id+"#S4" });
        _rec.wornSegs += curNodes.length-1;
      }
      curKey=null; curNodes=null;
    }
    for(var ni=0; ni<chain.length; ni++){
      var node = chain[ni];
      var lpN = lifePieces[pieceIdxAt(Math.min(node.d, totalArc-0.01))];
      var key = lpN.wet ? -1 : lpN.st;
      if(curKey===null){ curKey=key; curNodes=[node]; }
      else if(key!==curKey){
        curNodes.push(node); // shared boundary node — continuity across class runs
        flushRun();
        curKey=key; curNodes=[node];
      } else {
        curNodes.push(node);
      }
    }
    flushRun();

    // Fading sandy stub past the surveyed edge — kept only for the
    // original Vioget streets whose extents really end in unsurveyed
    // ground; a FOOTPATH-family constant-width track with a ragged fade
    // (s62: the old s.widthM*0.45 taper stubs were the "spike" artifacts).
    if(s.swings && _rec.state>=2 && chain.length>=2){
      var a0=s.polyline[i0], a1=s.polyline[i1], aNext=s.polyline[Math.min(i0+1,i1)], aPrev=s.polyline[Math.max(i1-1,i0)];
      [[a0,aNext],[a1,aPrev]].forEach(function(pair, side){
        var du=pair[0].u-pair[1].u, dv=pair[0].v-pair[1].v, dl=Math.hypot(du,dv)||1;
        du/=dl; dv/=dl;
        // start the stub at the street chain's ACTUAL (meandered) end so
        // the sandy track continues the trail instead of restarting on
        // the platted centerline a few meters away
        var eA = side===0 ? chain[0] : chain[chain.length-1];
        var eB = gridToWorldAt(pair[0].u+du*STREET_STUB_LEN, pair[0].v+dv*STREET_STUB_LEN, angle);
        if(terrainHeight(eB.x,eB.z)<=1.5){
          // shorten until dry
          var tEnd = 1;
          for(var ts=10; ts>=1; ts--){ var q={x:lerp(eA.x,eB.x,ts/10), z:lerp(eA.z,eB.z,ts/10)}; if(terrainHeight(q.x,q.z)>1.5){ tEnd=ts/10; break; } }
          if(tEnd<0.15) return;
          eB = {x:lerp(eA.x,eB.x,tEnd), z:lerp(eA.z,eB.z,tEnd)};
        }
        addRun("faint", "road", [eA,eB], 1.8, "#7c6a4a",
          { seed:_streetSeed(s.id)+0.31+side*0.17, amp:2.2, fadeB:true, fadeFrac:0.75, noEndFade:true, src:"street:"+s.id+"#stub" });
      });
    }
  });

  /* ---- dead-end detection (§2: butt caps at junctions, ragged fade-outs
     at TRUE dead ends). A run end that meets no other worn run is a dead
     end; ends that meet another street pass straight through the union. */
  var wornRuns = LAYERS.trail.concat(LAYERS.r3, LAYERS.r4).filter(function(r){ return r.isStreet; });
  function nearAnotherRun(run, pt, radius){
    var r2 = radius*radius;
    for(var i=0;i<wornRuns.length;i++){
      var o = wornRuns[i];
      if(o===run) continue;
      var bb=o.bbox;
      if(pt.x<bb.x0-radius || pt.x>bb.x1+radius || pt.z<bb.z0-radius || pt.z>bb.z1+radius) continue;
      for(var k=0;k<o.nodes.length;k++){
        var dx=o.nodes[k].x-pt.x, dz=o.nodes[k].z-pt.z;
        if(dx*dx+dz*dz<=r2) return true;
      }
    }
    return false;
  }
  wornRuns.forEach(function(r){
    if(r.noEndFade) return;
    var rad = Math.max(10, r.widthM*0.9);
    if(!nearAnotherRun(r, r.nodes[0], rad)) r.fadeA = true;
    if(!nearAnotherRun(r, r.nodes[r.nodes.length-1], rad)) r.fadeB = true;
  });

  /* ---- s65 FOOTPATH FAMILY (door-paths + desire trails), assembled AFTER
     the street network so endpoints validate against the network THIS
     repaint actually painted. ENDPOINT LAW: a door-path must visibly
     connect a building to a road; a desire trail must connect two real
     destinations. A path whose far end resolves to no painted street is an
     artifact and is NOT drawn (counted in the census as dropped). Faintness
     is keyed to the core road-lifecycle use counter (roadPieceUse — the
     same routed-traffic data that grades street wear), by mixing the stroke
     color toward the trodden village ground tone: low use fades toward the
     ground, never lighter than it. ---- */
  function onPaintedStreet(x,z,pad){
    for(var i=0;i<wornRuns.length;i++){
      var o=wornRuns[i], bb=o.bbox, hw=o.widthM/2+(pad||0);
      if(x<bb.x0-hw || x>bb.x1+hw || z<bb.z0-hw || z>bb.z1+hw) continue;
      for(var k=0;k<o.nodes.length-1;k++){
        // node spacing is ~7m; segment-distance so the ROW test has no gaps
        var ax=o.nodes[k].x, az=o.nodes[k].z, bx=o.nodes[k+1].x, bz=o.nodes[k+1].z;
        var dx=bx-ax, dz=bz-az, l2=dx*dx+dz*dz;
        var t = l2>0 ? Math.max(0, Math.min(1, ((x-ax)*dx+(z-az)*dz)/l2)) : 0;
        var qx=ax+dx*t-x, qz=az+dz*t-z;
        if(qx*qx+qz*qz <= hw*hw) return true;
      }
    }
    return false;
  }
  var _pathUseTone = "#645238"; // full-use trample core — darker than the trodden village ground
  var _pathFaintTone = "#8d7854"; // low-use end of the ramp — approaches (never passes) the ground tone
  function useToneAt(x,z){
    var u01 = clamp(roadPieceUse(x,z,simDay)/ROAD_USE_T3, 0, 1);
    return _mixCol(_parseSplatCol(_pathFaintTone), _parseSplatCol(_pathUseTone), 0.25+0.75*u01);
  }
  var _censusDropped = { doorPath:0, desireTrail:0 };
  // Worn door-paths (live source: buildings.js pushes one per always-founded
  // village door) — the narrow footpath constant, detail tiers only. The
  // recorded street-side endpoint was computed in the PLACEMENT frame; the
  // painted street can sit meters away once the O'Farrell swing moves the
  // grid — so aim THROUGH the recorded point and clip to the network that
  // is actually painted today. No painted road on the ray = orphan, dropped.
  SPLAT_DOOR_PATHS.forEach(function(p,i){
    var ddx=p.tx-p.doorX, ddz=p.tz-p.doorZ, ddl=Math.hypot(ddx,ddz)||1;
    var hit = clipToPaintedStreet(p.doorX, p.doorZ, p.doorX+ddx/ddl*(ddl+18), p.doorZ+ddz/ddl*(ddl+18));
    if(!hit){ _censusDropped.doorPath++; return; }
    addRun("door", "road", [{x:p.doorX,z:p.doorZ},hit], 1.1, useToneAt(hit.x,hit.z),
      {detailOnly:true, noEndFade:true, amp:0.25, seed:0.5+i*0.013, src:"door-path#"+i});
  });
  // Desire trails (live source: doodads.js yard-clutter anchors). The old
  // far endpoint was lerp(yard->plaza, 0.32) — a stub ending in open ground
  // (the census's one true artifact class). Re-target: walk the yard->plaza
  // ray to the FIRST painted street right-of-way and end just inside it, so
  // the trail connects yard -> road; no road on the ray = dropped.
  function clipToPaintedStreet(x0,z0,x1,z1){
    var dx=x1-x0, dz=z1-z0, len=Math.hypot(dx,dz);
    if(len<2) return null;
    dx/=len; dz/=len;
    for(var d=3; d<=len; d+=1.5){
      var qx=x0+dx*d, qz=z0+dz*d;
      if(onPaintedStreet(qx,qz,-0.5)) return {x:qx+dx*1.0, z:qz+dz*1.0}; // 1m inside the ROW — visibly meets the road
    }
    return null;
  }
  SPLAT_CLUTTER_PATHS.forEach(function(p,i){
    var hit = clipToPaintedStreet(p.x0, p.z0, PLAZA_CENTER.x, PLAZA_CENTER.z);
    if(!hit){ _censusDropped.desireTrail++; return; }
    addRun("faint", "road", [{x:p.x0,z:p.z0},hit], 1.8, useToneAt(hit.x,hit.z),
      {detailOnly:true, noEndFade:true, amp:0.4, seed:0.11+i*0.017, src:"desire-trail#"+i});
  });

  /* ---- s65 NEAR-TOWN APRON (painted before the layer compositor runs, so
     the street network still erases-then-draws on top). Apron anchors = the
     places use actually concentrates: street-network dead ends, village
     doors, working yards. (paintPlaza runs AFTER the compositor — see its
     call below the tier loop.) ---- */
  var apronAnchors = [];
  wornRuns.forEach(function(r){
    if(r.fadeA) apronAnchors.push({x:r.nodes[0].x, z:r.nodes[0].z, w:1.0});
    if(r.fadeB) apronAnchors.push({x:r.nodes[r.nodes.length-1].x, z:r.nodes[r.nodes.length-1].z, w:1.0});
  });
  SPLAT_DOOR_PATHS.forEach(function(p){ apronAnchors.push({x:p.doorX, z:p.doorZ, w:0.55}); });
  SPLAT_CLUTTER_PATHS.forEach(function(p){ apronAnchors.push({x:p.x0, z:p.z0, w:0.8}); });
  var _apronStats = paintNearTownApron(apronAnchors);

  /* ---- paint: per tier, per class layer, low to high (each layer erases
     what lies beneath it — one owner per pixel across classes) ---- */
  TIERS.forEach(function(t){
    t._dirty = { x0:0, y0:0, x1:t.res, y1:t.res }; // scratch state unknown at start
    ROAD_LAYER_ORDER.forEach(function(lk){
      drawRoadLayer(t, LAYERS[lk], ROAD_LAYER_ALPHA[lk]);
    });
    // pier-line hints (piles/stakes over the tideflat) — translucent
    // dashes straight on the tier canvas (over water, no union needed)
    PIER_RUNS.forEach(function(pr){
      var ctx = t.ctx;
      ctx.save();
      var _pw = t.pxLenFn(Math.min(pr.widthM,3));
      ctx.globalAlpha = 0.24 * Math.min(1, _pw);
      ctx.strokeStyle = "#7c8a86";
      ctx.lineWidth = Math.max(1, _pw);
      ctx.lineCap = "butt";
      ctx.setLineDash([t.pxLenFn(3), t.pxLenFn(5)]);
      ctx.beginPath();
      var p0 = t.pxFn(pr.pts[0].x, pr.pts[0].z); ctx.moveTo(p0.x,p0.y);
      for(var i=1;i<pr.pts.length;i++){ var p=t.pxFn(pr.pts[i].x,pr.pts[i].z); ctx.lineTo(p.x,p.y); }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });
  });
  // leave the scratch clean for the next repaint
  var lastT = TIERS[TIERS.length-1];
  if(lastT._dirty) splatScratchCtx.clearRect(lastT._dirty.x0, lastT._dirty.y0, lastT._dirty.x1-lastT._dirty.x0, lastT._dirty.y1-lastT._dirty.y0);

  /* ---- s65 PORTSMOUTH SQUARE — painted AFTER the street compositor. The
     fill is INSET to the bounding streets' ROW edges (they still own their
     pixels untouched), while anything the data routes ACROSS the open
     square (portsmouth-street, the documented "down Portsmouth street to
     the landing" lane, starts at the plaza's center) is absorbed into the
     square's own trampled surface — an open square has one worn ground,
     not a striped band through it; the diagonals carry the crossing wear. */
  paintPlaza(plazaCorners);

  /* ---- s65 census: every painted line, counted by source class ---- */
  (function(){
    var census = {};
    function bump(src){
      var cls = src.indexOf("street:")===0 ? "street"+src.slice(src.indexOf("#")) // street:<id>#S4 -> "street#S4"
              : src.split("#")[0];
      census[cls] = (census[cls]||0)+1;
    }
    ROAD_LAYER_ORDER.forEach(function(lk){ LAYERS[lk].forEach(function(r){ bump(r.src); }); });
    PIER_RUNS.forEach(function(pr){ bump(pr.src||"UNKNOWN"); });
    PLAZA_DEBUG_LABELS.forEach(function(l){ bump(l.label); });
    census["door-path DROPPED(unresolved)"] = _censusDropped.doorPath;
    census["desire-trail DROPPED(unresolved)"] = _censusDropped.desireTrail;
    census["apron-worn-spots"] = _apronStats.blotches;
    _stats.census = census;
  })();
  if(DEBUG_ROADS){
    DEBUG_ROAD_LABELS.length = 0;
    ROAD_LAYER_ORDER.forEach(function(lk){ LAYERS[lk].forEach(function(r){
      var m = r.nodes[Math.floor(r.nodes.length/2)];
      DEBUG_ROAD_LABELS.push({ x:m.x, z:m.z, label:r.src });
    }); });
    PIER_RUNS.forEach(function(pr){
      var m = pr.pts[Math.floor(pr.pts.length/2)];
      DEBUG_ROAD_LABELS.push({ x:m.x, z:m.z, label:pr.src||"UNKNOWN" });
    });
    PLAZA_DEBUG_LABELS.forEach(function(l){ DEBUG_ROAD_LABELS.push(l); });
    TIERS.forEach(function(t){ drawDebugRoadLabels(t); });
  }

  applyTierOwnership();

  _stats.ms = +(performance.now()-_statT0).toFixed(1);
  SPLAT_LAST_STATS = _stats;
  splatWorldTex.needsUpdate = true;
  splatTownTex.needsUpdate = true;
  splatCloseTex.needsUpdate = true;
}

/* =====================================================================
   s65 PORTSMOUTH SQUARE — BESPOKE PLAZA TREATMENT (per the record:
   research/geography-shoreline + demographics — an UNIMPROVED, trampled,
   rutted open square, the sim's living room; never landscaped in this
   window). Grammar:
     - packed-earth base whose BOUNDARY is defined by the four bounding
       streets: the fill is INSET to their ROW edges, so the streets' own
       paint frames the square — no outline stroke of its own;
     - heavy trample in the center (the crowd's ground) fading to PATCHY
       edges: erase nibbles let the trodden village ground show through,
       grass-tuft daubs survive where feet don't reach;
     - the two corner-to-corner worn crossing paths, refined: meandered,
       CONSTANT footpath width (1.8m core inside a soft 3.6m wash — fill
       treatment, never width change), broken scuff dashes;
     - a trampled gathering ring at the flagpole (plaza center);
     - wagon-gauge rut pairs along the Washington (flag / old-adobe custom
       house) side — the documented working edge of the square;
     - wet-season coupling lives in the road-kind detail shader (see
       DETAIL_FRAG_ROAD's uPlaza block) driven by the same uDetailWet
       signal as the mud tiles, so the notorious plaza mud needs no
       repaint to appear.
   Every tone sits at or below the packed-earth base value — the plaza can
   never read lighter than the ground around it (§9). Deterministic (hash2
   dice only). Painted AFTER the layer compositor: the ROW-edge inset keeps
   every bounding street untouched, and data lanes routed ACROSS the open
   square are absorbed into its one worn surface (see the call site).
   ===================================================================== */
var PLAZA_DEBUG_LABELS = [];
var _plzSpriteCache = {};
function _plzSprite(color){
  if(_plzSpriteCache[color]) return _plzSpriteCache[color];
  var c=document.createElement("canvas"); c.width=c.height=64;
  var x=c.getContext("2d");
  var g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,color); g.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=g; x.fillRect(0,0,64,64);
  _plzSpriteCache[color]=c;
  return c;
}
function _plzBlotch(tp, x, z, rM, color, alpha){
  var p = tp.pxFn(x,z), r = Math.max(1, tp.pxLenFn(rM));
  tp.ctx.globalAlpha = alpha;
  tp.ctx.drawImage(_plzSprite(color), p.x-r, p.y-r, r*2, r*2);
  tp.ctx.globalAlpha = 1;
}
function paintPlaza(corners){
  PLAZA_DEBUG_LABELS.length = 0;
  var cx=(corners[0].x+corners[2].x)/2, cz=(corners[0].z+corners[2].z)/2;
  var ux=corners[1].x-corners[0].x, uz=corners[1].z-corners[0].z;   // west->east (Dupont->Kearny)
  var vx=corners[3].x-corners[0].x, vz=corners[3].z-corners[0].z;   // north->south (Washington->Clay)
  var huC=Math.hypot(ux,uz)/2, hvC=Math.hypot(vx,vz)/2;             // centerline-to-centerline half spans
  var eux=ux/(huC*2), euz=uz/(huC*2), evx=vx/(hvC*2), evz=vz/(hvC*2);
  /* INSET TO THE ROW EDGE (s65): GEO.plaza spans street CENTERLINES; the
     old fill painted under the bounding streets' rights-of-way, where the
     ghost/ROW-hint layers' erase-then-draw cut BRIGHT scratches through the
     dark fill (worst in the wet). The fill now stops at each street's own
     edge — the square's boundary IS the surrounding streets' paint. */
  function _halfW(id){ var s=STREETS_RUNTIME_BY_ID[id]; return (s?s.widthM:14)/2 + 1.2; }
  var inW=_halfW("dupont"), inE=_halfW("kearny"), inN=_halfW("washington"), inS=_halfW("clay");
  var cIx = cx + eux*(inW-inE)/2 + evx*(inN-inS)/2;                 // inset-rect center
  var cIz = cz + euz*(inW-inE)/2 + evz*(inN-inS)/2;
  var hu = huC-(inW+inE)/2, hv = hvC-(inN+inS)/2;                   // inset half spans
  function P(u,v){ return { x: cIx + eux*u*hu + evx*v*hv, z: cIz + euz*u*hu + evz*v*hv }; }
  var insetCorners = [ P(-1,-1), P(1,-1), P(1,1), P(-1,1) ];
  var BASE = "#836e4c";        // packed trampled earth — darker than the village trodden tint
  var tiers = [ {ctx:splatTownCtx, pxFn:townPx, pxLenFn:townPxLen},
                {ctx:splatCloseCtx, pxFn:closePx, pxLenFn:closePxLen} ];
  tiers.forEach(function(tp){
    var i, R;
    // 1) base fill to the ROW edges — boundary owned by the surrounding
    //    streets, not by an outline of our own
    splatFillPoly(tp.ctx, tp.pxFn, insetCorners, BASE, 1);
    // 2) center-weighted trample: broad soft worn-earth bodies (low
    //    frequency, painterly — not per-pixel noise)
    for(i=0;i<7;i++){
      R = function(k){ return hash2(11.3+i*7.7+k*3.1, 4.9+i*1.7); };
      var bu=(R(0)-0.5)*1.0, bv=(R(1)-0.5)*1.0, c1=P(bu,bv);
      var dk = R(2)<0.6;
      _plzBlotch(tp, c1.x, c1.z, (0.32+R(3)*0.22)*Math.min(hu,hv),
        dk?"rgb(105,86,58)":"rgb(140,119,84)", dk?(0.17+R(4)*0.11):(0.09+R(4)*0.06));
    }
    // 3) micro churn, heaviest at the center, thinning outward
    for(i=0;i<110;i++){
      R = function(k){ return hash2(31.7+i*2.3+k*5.9, 9.1+i*0.61); };
      var uu=(R(0)-0.5)*2, vv=(R(1)-0.5)*2;
      var wgt = 1-Math.max(Math.abs(uu),Math.abs(vv));
      if(R(2) > 0.22+0.78*wgt) continue;          // center-weighted density
      var q=P(uu,vv), dk2 = R(3)<0.55;
      _plzBlotch(tp, q.x, q.z, 0.5+R(4)*1.3, dk2?"rgb(97,80,54)":"rgb(134,114,80)", 0.10+R(5)*0.12);
    }
    // 4) patchy edges: erase nibbles (ground shows through) + grass-tuft
    //    daubs in the outer band — feet don't polish the rim
    tp.ctx.save();
    for(i=0;i<150;i++){
      R = function(k){ return hash2(51.1+i*3.7+k*7.3, 17.9+i*0.83); };
      var edge = Math.floor(R(0)*4);              // 0 N, 1 S, 2 W, 3 E
      var t2 = (R(1)-0.5)*2*0.96;
      var inset = 0.86+R(2)*0.12;                 // outer 2-14% band
      var pe = edge===0?P(t2,-inset) : edge===1?P(t2,inset) : edge===2?P(-inset,t2) : P(inset,t2);
      if(R(3)<0.52){                              // erase nibble — trodden ground shows through
        tp.ctx.globalCompositeOperation="destination-out";
        _plzBlotch(tp, pe.x, pe.z, 0.6+R(4)*1.6, "rgb(0,0,0)", 0.22+R(5)*0.30);
        tp.ctx.globalCompositeOperation="source-over";
      } else {                                    // surviving grass tuft
        _plzBlotch(tp, pe.x, pe.z, 0.35+R(4)*0.55, R(5)<0.5?"rgb(92,102,54)":"rgb(78,88,46)", 0.35+R(6)*0.25);
      }
    }
    tp.ctx.restore();
    // 5) the two worn crossing diagonals — meandered, constant footpath
    //    width: soft wash + 1.8m core + broken scuffs (fill, never width)
    [ {a:{u:-1,v:-1}, b:{u:1,v:1}, seed:0.23, al:1.00, tag:"plaza-diagonal#0"},
      {a:{u:1,v:-1},  b:{u:-1,v:1}, seed:0.71, al:0.88, tag:"plaza-diagonal#1"} ].forEach(function(dg){
      var steps = Math.max(24, Math.round(Math.hypot(hu,hv)*2/4)), nodes=[], k;
      for(k=0;k<=steps;k++){
        var t3=k/steps;
        var mu=lerp(dg.a.u,dg.b.u,t3), mv=lerp(dg.a.v,dg.b.v,t3);
        // clamp the wander INSIDE the square; zero at the corners so the
        // path meets the street crossings exactly
        var sinT = Math.sin(Math.PI*t3);
        var off = (0.62*Math.sin(t3*9.2+dg.seed*37)+0.38*Math.sin(t3*3.1+dg.seed*91)) * 1.8 * sinT;
        // lateral offset perpendicular to the diagonal, in world space:
        var q0=P(mu,mv);
        var ddx=(dg.b.u-dg.a.u)*hu*eux+(dg.b.v-dg.a.v)*hv*evx, ddz=(dg.b.u-dg.a.u)*hu*euz+(dg.b.v-dg.a.v)*hv*evz;
        var dl=Math.hypot(ddx,ddz)||1;
        nodes.push({x:q0.x+(-ddz/dl)*off, z:q0.z+(ddx/dl)*off});
      }
      splatStroke(tp.ctx, tp.pxFn, tp.pxLenFn, nodes, 3.6, "#75603f", 0.24*dg.al, "butt"); // soft worn wash
      // trodden core (footpath constant width) — segment-jittered tone and
      // alpha with slight overlap, so it reads worn-in rather than drawn
      for(k=0;k<nodes.length-1;k++){
        var ja=nodes[k], jb=nodes[k+1];
        var jdx=jb.x-ja.x, jdz=jb.z-ja.z, jl=Math.hypot(jdx,jdz)||1;
        var jaa = k===0?ja:{x:ja.x-jdx/jl*0.7, z:ja.z-jdz/jl*0.7};
        var jdk = 1 + (hash2(k*7.1+dg.seed*29, 3.3)-0.5)*0.16;
        splatStroke(tp.ctx, tp.pxFn, tp.pxLenFn, [jaa,jb], 1.8,
          _jitterCol(_parseSplatCol("#63513a"), jdk), (0.34+hash2(k*1.7,dg.seed*13)*0.14)*dg.al, "butt");
      }
      var runPts=[], k2;                                                            // broken darker scuff dashes
      for(k2=0;k2<nodes.length;k2++){
        var v3 = 0.5+0.5*Math.sin(k2*0.9+dg.seed*53) + (hash2(k2*3.3+dg.seed*17,7.7)-0.5)*0.7;
        if(v3>0.55) runPts.push(nodes[k2]);
        if((v3<=0.55 || k2===nodes.length-1) && runPts.length){
          if(runPts.length>=2) splatStroke(tp.ctx, tp.pxFn, tp.pxLenFn, runPts, 0.9, "#544430", 0.5*dg.al, "butt");
          runPts=[];
        }
      }
    });
    // 6) gathering trample at the flagpole (plaza center)
    for(i=0;i<16;i++){
      R = function(k){ return hash2(71.3+i*4.1+k*2.7, 23.3+i*1.13); };
      var ga=R(0)*6.283, gr=R(1)*8;
      _plzBlotch(tp, cx+Math.cos(ga)*gr, cz+Math.sin(ga)*gr, 0.7+R(2)*1.4, "rgb(90,74,50)", 0.10+R(3)*0.10);
    }
    // 7) wagon-gauge ruts along the Washington (flag/custom-house) side —
    //    broken twin grooves, two passes, absolute gauge (s62 rut law)
    [ {vIn:5.2, seed:0.19}, {vIn:7.0, seed:0.37}, {vIn:9.2, seed:0.83} ].forEach(function(lane){
      var vv2 = -(1 - lane.vIn/hv);
      [ -0.78, 0.78 ].forEach(function(gOff, side){
        var pts=[], n=Math.max(16, Math.round(hu*2/5)), k3;
        for(k3=0;k3<=n;k3++){
          var t4=(k3/n-0.5)*2*0.86;
          var base2=P(t4, vv2);
          var wob=Math.sin(t4*7+lane.seed*31)*0.35;
          pts.push({x:base2.x+evx*(gOff+wob), z:base2.z+evz*(gOff+wob)});
        }
        var run2=[], k4;
        for(k4=0;k4<pts.length;k4++){
          var v4 = 0.5+0.5*Math.sin(k4*0.7+lane.seed*47+side*2.1) + (hash2(k4*2.9+lane.seed*11,3.1)-0.5)*0.6;
          if(v4>0.42) run2.push(pts[k4]);
          if((v4<=0.42 || k4===pts.length-1) && run2.length){
            if(run2.length>=2) splatStroke(tp.ctx, tp.pxFn, tp.pxLenFn, run2, 0.4, "#4a3c2a", 0.62, "butt");
            run2=[];
          }
        }
      });
    });
  });
  // census/debug entries (lines only — the fill/blotch fields are counted
  // by their own census keys)
  PLAZA_DEBUG_LABELS.push({ x:P(-0.5,-0.5).x, z:P(-0.5,-0.5).z, label:"plaza-diagonal#0" });
  PLAZA_DEBUG_LABELS.push({ x:P(0.5,-0.5).x, z:P(0.5,-0.5).z, label:"plaza-diagonal#1" });
  PLAZA_DEBUG_LABELS.push({ x:P(0,-(1-8/hv)).x, z:P(0,-(1-8/hv)).z, label:"plaza-ruts#washington-side" });
}

/* =====================================================================
   s65 NEAR-TOWN APRON — the trodden zone around town, de-flattened.
   NO uniform wash: deterministic worn-spot scatter whose acceptance is
   (a) the SAME warped organic feather the s60 square-kill uses
       (villageFeatherT — core-owned; no rect can reappear),
   (b) a radial USE gradient read from the core road-lifecycle counter
       (roadPieceUse — the routed-traffic + frontage data), so wear is
       heaviest at street ends and door clusters and era-honest (a bigger
       town tramples a wider apron; 1846 barely marks it),
   (c) ecology-zone keyed tone (zoneAt): dune sand scuffs sandy-dark,
       grassland wears to dirt, scrub in between — a PATCHY transition
       between trample and dune/grass, never one tone.
   Plus authored worn spots at the anchors themselves (street dead ends,
   village doors, working yards/wells). All tones darker than the ground
   they sit on (§9). Candidates are precomputed once; per-repaint cost is
   the use lookup + sprite draws. Painted before the layer compositor —
   streets stay on top; erased under inner tiers by tier ownership.
   ===================================================================== */
var APRON_CANDIDATES = null;
function _apronBuildCandidates(){
  var out = [], PAD = 280, STEP = 24;
  var x0 = VILLAGE_BOX.xMin-PAD, x1 = VILLAGE_BOX.xMax+PAD;
  var z0 = VILLAGE_BOX.zMin-PAD, z1 = VILLAGE_BOX.zMax+PAD;
  for(var gx=x0; gx<=x1; gx+=STEP){
    for(var gz=z0; gz<=z1; gz+=STEP){
      var jx = gx+(hash2(gx*0.13,gz*0.17)-0.5)*STEP*0.9;
      var jz = gz+(hash2(gx*0.19,gz*0.11)-0.5)*STEP*0.9;
      if(terrainHeight(jx,jz)<=1.0) continue;              // never on the wet flats
      if(_gpNearPlaza(jx,jz,2)) continue;                  // the plaza owns its own ground
      var dOut = distOutsideBox(jx,jz,VILLAGE_BOX);
      var envT = 1-villageFeatherT(jx,jz,dOut,260);        // s60 organic feather — 1 inside, warped falloff outside
      if(dOut<=0) envT = 0.55;                             // interior: sparser (streets/yards carry the story there)
      var patch = fbm(jx*0.011+9.1, jz*0.011, 2);          // patchiness — kills any uniform wash
      var env = envT*(0.25+0.75*patch);
      if(env<0.10) continue;
      var zn = zoneAt(jx,jz);
      out.push({ x:jx, z:jz, env:env, zn:zn });
    }
  }
  return out;
}
function paintNearTownApron(anchors){
  if(!APRON_CANDIDATES) APRON_CANDIDATES = _apronBuildCandidates();
  var tiers = [ {ctx:splatTownCtx, pxFn:townPx, pxLenFn:townPxLen, box:TOWN_BOX},
                {ctx:splatCloseCtx, pxFn:closePx, pxLenFn:closePxLen, box:CLOSE_BOX} ];
  var drawn = 0;
  function toneFor(zn, dk){
    if(zn===1||zn===2) return dk?"rgb(118,99,68)":"rgb(139,119,84)";   // dune sand: sandy scuff
    if(zn===3||zn===4) return dk?"rgb(96,82,54)":"rgb(112,95,63)";     // grass/woodland: worn to dirt
    return dk?"rgb(107,90,61)":"rgb(126,107,74)";                      // default scrub-dirt
  }
  function drawSpot(x,z,rM,color,alpha){
    for(var ti=0;ti<tiers.length;ti++){
      var tp=tiers[ti], B=tp.box;
      if(x<B.xMin+4||x>B.xMax-4||z<B.zMin+4||z>B.zMax-4) continue;
      _plzBlotch(tp, x, z, rM, color, alpha);
    }
    drawn++;
  }
  // (a) the scattered patchy transition, use-graded
  for(var i=0;i<APRON_CANDIDATES.length;i++){
    var c = APRON_CANDIDATES[i];
    var u01 = clamp(roadPieceUse(c.x,c.z,simDay)/ROAD_USE_T3, 0, 1);
    var s = c.env*(0.18+0.82*u01);
    if(s<0.07) continue;
    var h1 = hash2(c.x*0.31,c.z*0.29), h2 = hash2(c.x*0.17,c.z*0.41);
    drawSpot(c.x, c.z, 2.2+h1*3.8, toneFor(c.zn, h2<0.6), 0.045+s*0.11);
    if(s>0.5 && h2>0.45) // heavy-use spots double up — reads as real traffic, not dots
      drawSpot(c.x+(h1-0.5)*9, c.z+(h2-0.5)*9, 1.6+h2*2.6, toneFor(c.zn,true), 0.04+s*0.08);
  }
  // (b) authored worn spots at the use anchors (street ends, doors, yards)
  for(var a=0; a<anchors.length; a++){
    var an = anchors[a];
    var u = clamp(roadPieceUse(an.x,an.z,simDay)/ROAD_USE_T3, 0, 1) * an.w;
    if(u<0.05) continue;
    var n = 3 + Math.round(u*7);
    for(var k=0;k<n;k++){
      var hh1 = hash2(an.x*0.7+k*3.9, an.z*0.9+k*1.3), hh2 = hash2(an.x*0.4-k*2.1, an.z*0.6+k*4.7);
      var ang = hh1*6.283, rr = hh2*hh2*(4+u*9); // squared: clusters at the anchor, thins radially
      drawSpot(an.x+Math.cos(ang)*rr, an.z+Math.sin(ang)*rr,
        1.4+hh1*2.4, toneFor(zoneAt(an.x,an.z), hh2<0.65), 0.05+u*0.10);
    }
  }
  return { blotches: drawn };
}

/* ---- ?debugroads label pass (s65 census): canvas-drawn, per tier ---- */
function drawDebugRoadLabels(t){
  var ctx = t.ctx;
  ctx.save();
  var fpx = Math.max(11, Math.round(t.pxLenFn(6)));
  ctx.font = "bold "+fpx+"px monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  for(var i=0;i<DEBUG_ROAD_LABELS.length;i++){
    var L = DEBUG_ROAD_LABELS[i];
    if(t.box && (L.x<t.box.xMin||L.x>t.box.xMax||L.z<t.box.zMin||L.z>t.box.zMax)) continue;
    var p = t.pxFn(L.x, L.z);
    if(p.x<-40||p.y<-40||p.x>t.res+40||p.y>t.res+40) continue;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff3b30";
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, fpx*0.18), 0, 6.283); ctx.fill();
    ctx.lineWidth = Math.max(2, fpx*0.16); ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.strokeText(L.label, p.x+fpx*0.5, p.y);
    ctx.fillStyle = "#ffe24a";
    ctx.fillText(L.label, p.x+fpx*0.5, p.y);
  }
  ctx.restore();
}

/* =====================================================================
   TIER OWNERSHIP (s20 sprint; extended to 3 tiers s27): EVERY GROUND
   PIXEL HAS EXACTLY ONE OWNER. After each repaint the world canvas gets a
   HARD CUTOUT (destination-out) of the town rectangle, and the town
   canvas gets a hard cutout of the close rectangle; only in the thin
   feather bands do adjacent tiers cross-fade complementarily.
   ===================================================================== */
var TIER_FEATHER_M = 60;
function eraseFeatheredRect(ctx, x0,y0,x1,y1, f, invert){
  // invert=false: erase fully inside the inset core, fading to no-erase at
  // the rect edge (outer tier). invert=true: erase nothing inside the core,
  // fading to full erase at the rect edge (inner tier's own edge fade).
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  var ix0=x0+f, iy0=y0+f, ix1=x1-f, iy1=y1-f;
  var IN = invert?"rgba(0,0,0,0)":"rgba(0,0,0,1)", OUT = invert?"rgba(0,0,0,1)":"rgba(0,0,0,0)";
  if(!invert){ ctx.fillStyle="#000"; ctx.fillRect(ix0, iy0, ix1-ix0, iy1-iy0); }
  function band(gx0,gy0,gx1,gy1, rx,ry,rw,rh){
    var g = ctx.createLinearGradient(gx0,gy0,gx1,gy1);
    g.addColorStop(0, IN); g.addColorStop(1, OUT);
    ctx.fillStyle = g; ctx.fillRect(rx,ry,rw,rh);
  }
  band(0,iy0, 0,y0,  ix0,y0, ix1-ix0, f);   // top    (gradient runs inner->outer)
  band(0,iy1, 0,y1,  ix0,iy1, ix1-ix0, f);  // bottom
  band(ix0,0, x0,0,  x0,iy0, f, iy1-iy0);   // left
  band(ix1,0, x1,0,  ix1,iy0, f, iy1-iy0);  // right
  function corner(cx,cy, rx,ry){
    var g = ctx.createRadialGradient(cx,cy,0, cx,cy,f);
    g.addColorStop(0, IN); g.addColorStop(1, OUT);
    ctx.fillStyle = g; ctx.fillRect(rx,ry,f,f);
  }
  corner(ix0,iy0, x0,y0); corner(ix1,iy0, ix1,y0);
  corner(ix0,iy1, x0,iy1); corner(ix1,iy1, ix1,iy1);
  ctx.restore();
}
function applyTierOwnership(){
  // WORLD tier: hard cutout of the town rect (feather band inside its edge)
  var a = worldPx(TOWN_BOX.xMin, TOWN_BOX.zMin), b = worldPx(TOWN_BOX.xMax, TOWN_BOX.zMax);
  eraseFeatheredRect(splatWorldCtx, Math.min(a.x,b.x), Math.min(a.y,b.y), Math.max(a.x,b.x), Math.max(a.y,b.y),
                     worldPxLen(TIER_FEATHER_M), false);
  // TOWN tier: complementary fade of its own outermost band...
  eraseFeatheredRect(splatTownCtx, 0, 0, SPLAT_TOWN_RES, SPLAT_TOWN_RES,
                     townPxLen(TIER_FEATHER_M), true);
  // ...plus a hard cutout of the close rect
  var c = townPx(CLOSE_BOX.xMin, CLOSE_BOX.zMin), d = townPx(CLOSE_BOX.xMax, CLOSE_BOX.zMax);
  eraseFeatheredRect(splatTownCtx, Math.min(c.x,d.x), Math.min(c.y,d.y), Math.max(c.x,d.x), Math.max(c.y,d.y),
                     townPxLen(TIER_FEATHER_M), false);
  // CLOSE tier: complementary fade of its own outermost band
  eraseFeatheredRect(splatCloseCtx, 0, 0, SPLAT_CLOSE_RES, SPLAT_CLOSE_RES,
                     closePxLen(TIER_FEATHER_M), true);
}

var splatWorldTex = new THREE.CanvasTexture(splatWorldCanvas); splatWorldTex.flipY=false; splatWorldTex.wrapS=splatWorldTex.wrapT=THREE.ClampToEdgeWrapping;
var splatTownTex  = new THREE.CanvasTexture(splatTownCanvas);  splatTownTex.flipY=false;  splatTownTex.wrapS=splatTownTex.wrapT=THREE.ClampToEdgeWrapping;
var splatCloseTex = new THREE.CanvasTexture(splatCloseCanvas); splatCloseTex.flipY=false; splatCloseTex.wrapS=splatCloseTex.wrapT=THREE.ClampToEdgeWrapping;
/* PREMULTIPLIED MIPMAP PIPELINE (s20 sprint, 2026-07-11): upload the
   canvases premultiplied (canvas 2D backing store already IS
   premultiplied) and mip-average color*alpha together — transparent
   texels are (0,0,0,0) and can never bleed a tan wash. Blending uses the
   matching premultiplied equation in makeSplatMaterial() below, with the
   fog mix patched to respect alpha. Anisotropy keeps street lines crisp
   at the oblique, low-pitch angles the map camera actually uses. */
var SPLAT_ANISO = Math.min(8, (renderer.capabilities.getMaxAnisotropy&&renderer.capabilities.getMaxAnisotropy())||1);
[splatWorldTex, splatTownTex, splatCloseTex].forEach(function(t){
  t.premultiplyAlpha = true;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = SPLAT_ANISO;
});

// World overlay: shares terrainGeo's OWN position/normal buffers (so it
// is exactly coincident with the terrain, no seam possible) with its own
// UV mapping world XZ straight onto the canvas.
var splatWorldGeo = new THREE.BufferGeometry();
splatWorldGeo.setAttribute("position", terrainGeo.attributes.position);
splatWorldGeo.setAttribute("normal", terrainGeo.attributes.normal);
if(terrainGeo.index) splatWorldGeo.setIndex(terrainGeo.index);
(function(){
  var pos = terrainGeo.attributes.position;
  var uv = new Float32Array(pos.count*2);
  for(var i=0;i<pos.count;i++){
    uv[i*2]   = (pos.getX(i)-WORLD.x0)/WORLD.sizeX;
    uv[i*2+1] = (pos.getZ(i)-WORLD.z0)/WORLD.sizeZ;
  }
  splatWorldGeo.setAttribute("uv", new THREE.BufferAttribute(uv,2));
})();

/* Exact triangle-true sample of the RENDERED terrain mesh surface. s46:
   table-driven over MESH_BASE_H / MESH_SUB_H (the exact vertex heights
   the coast-band-subdivided builder emitted, same a-b-d/b-c-d split), so
   draped decal vertices still land exactly on the rendered surface —
   including inside subdivided coast cells. NOTE for future runtime
   terrain edits: mutating TERRAIN.heights requires rebuilding these
   tables too, then invalidateGroundPaint() (road-master-spec §6). */
function terrainMeshSurfaceY(x,z){
  var nx = TERRAIN.nx, cellsX = nx-1, cellsZ = TERRAIN.nz-1, cell = WORLD.cell;
  var fi = clamp((x-WORLD.x0)/cell, 0, cellsX-1e-6), fj = clamp((z-WORLD.z0)/cell, 0, cellsZ-1e-6);
  var gi = Math.floor(fi), gj = Math.floor(fj);
  var fx = fi-gi, fz = fj-gj;
  var so = MESH_CELL_SUB[gj*cellsX+gi];
  var ha,hb,hc,hd;
  if(so>=0){
    var K = TERR_SUB_K, H = MESH_SUB_H[so];
    var sfi = Math.min(fx*K, K-1e-6), sfj = Math.min(fz*K, K-1e-6);
    var sa = Math.floor(sfi), sb = Math.floor(sfj);
    fx = sfi-sa; fz = sfj-sb;
    ha = H[sb*(K+1)+sa];     hb = H[(sb+1)*(K+1)+sa];
    hc = H[(sb+1)*(K+1)+sa+1]; hd = H[sb*(K+1)+sa+1];
  } else {
    ha = MESH_BASE_H[gj*nx+gi];     hb = MESH_BASE_H[(gj+1)*nx+gi];
    hc = MESH_BASE_H[(gj+1)*nx+gi+1]; hd = MESH_BASE_H[gj*nx+gi+1];
  }
  return (fx+fz<=1) ? ha+(hd-ha)*fx+(hb-ha)*fz
                    : hc+(hd-hc)*(1-fz)+(hb-hc)*(1-fx);
}
/* Build (or re-drape) a grid-snapped decal tier geometry. K subdivisions
   per terrain cell; box edges are already snapped to the terrain grid. */
function buildSplatTierGeo(box, lift){
  var K = 4, cell = TERRAIN_CELL/K;
  var w = box.xMax-box.xMin, h = box.zMax-box.zMin;
  var segsX = Math.max(1, Math.round(w/cell)), segsZ = Math.max(1, Math.round(h/cell));
  var geo = new THREE.PlaneGeometry(w, h, segsX, segsZ);
  geo.rotateX(-Math.PI/2);
  geo.translate((box.xMin+box.xMax)/2, 0, (box.zMin+box.zMax)/2);
  var pos = geo.attributes.position;
  var uv = new Float32Array(pos.count*2);
  for(var i=0;i<pos.count;i++){
    var x=pos.getX(i), z=pos.getZ(i);
    pos.setY(i, terrainMeshSurfaceY(x,z) + lift);
    uv[i*2]   = (x-box.xMin)/w;
    uv[i*2+1] = (z-box.zMin)/h;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv,2));
  geo.computeVertexNormals();
  geo.userData.splatBox = box; geo.userData.splatLift = lift;
  return geo;
}
function redrapeSplatTierGeo(geo){
  var pos = geo.attributes.position, lift = geo.userData.splatLift;
  for(var i=0;i<pos.count;i++) pos.setY(i, terrainMeshSurfaceY(pos.getX(i), pos.getZ(i)) + lift);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}
var TOWN_SPLAT_LIFT = 0.10, CLOSE_SPLAT_LIFT = 0.16;
var splatTownGeo  = buildSplatTierGeo(TOWN_BOX, TOWN_SPLAT_LIFT);
var splatCloseGeo = buildSplatTierGeo(CLOSE_BOX, CLOSE_SPLAT_LIFT);

/* TERRAIN-EDIT -> PAINT-CACHE INVALIDATION (road-master-spec §6): any
   future runtime mutation of TERRAIN.heights / terrainGeo positions MUST
   call this — it re-drapes the decal tiers onto the new surface and
   forces a full repaint on the next frame. "A terrain change without a
   repaint is a bug by definition." (No current system mutates terrain at
   runtime; this is the mandated wiring for the ones that will.) */
function invalidateGroundPaint(){
  redrapeSplatTierGeo(splatTownGeo);
  redrapeSplatTierGeo(splatCloseGeo);
  LAST_SPLAT_SIMDAY = null;      // updateGridSwing() repaints unconditionally next frame
  _lastSplatRepaintMs = 0;
}

/* NIGHT-GLOW fix, part B (2026-07-10): splat decals use a lit material
   sharing the same sun/hemi/ambient lights terrainMesh uses, so both
   surfaces dim together automatically. GROUND MATERIALITY (s52): Lambert
   -> Phong (specular stays black, so the diffuse result is identical) —
   Lambert lights per-VERTEX in r128, and the detail-normal perturbation
   (see GROUND DETAIL ENGINE) needs per-FRAGMENT lighting to read. */
function makeSplatMaterial(tex, offsetAmt){
  var m = new THREE.MeshPhongMaterial({ map:tex, transparent:true, depthWrite:false, specular:0x000000, shininess:0,
    polygonOffset:true, polygonOffsetFactor:offsetAmt, polygonOffsetUnits:offsetAmt });
  // PREMULTIPLIED MIPMAP PIPELINE (s20): blend with the matching
  // premultiplied-alpha equation. Night darkening / wet tint still work
  // unchanged: lighting and material.color scale the (premultiplied) rgb,
  // alpha rides through untouched.
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  patchGroundDetailMaterial(m, "road", function(shader){
    // Weight the fog target by alpha so transparent stays transparent and
    // painted streets still fade into the haze.
    var fogLine = "gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );";
    if(shader.fragmentShader.indexOf(fogLine) !== -1){
      shader.fragmentShader = shader.fragmentShader.replace(fogLine,
        "gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor * gl_FragColor.a, fogFactor );");
    } else if(window.console) console.warn("splat fog premultiply patch: fog chunk not found — three version drift?");
  });
  return m;
}
var splatWorldMat = makeSplatMaterial(splatWorldTex, -2);
var splatTownMat  = makeSplatMaterial(splatTownTex, -4);
var splatCloseMat = makeSplatMaterial(splatCloseTex, -6); // offsets kept for consistency, but NOTE: logdepth writes gl_FragDepth, so polygonOffset never actually applies — real tier authority is the TIER OWNERSHIP canvas cutout + renderOrder + the meshes' geometric lifts
var splatWorldMesh = new THREE.Mesh(splatWorldGeo, splatWorldMat);
var splatTownMesh  = new THREE.Mesh(splatTownGeo, splatTownMat);
var splatCloseMesh = new THREE.Mesh(splatCloseGeo, splatCloseMat);
// Explicit renderOrder makes the transparent draw order deterministic
// (world, then town, then close) regardless of any per-frame camera-
// distance tie — the depth-bias tiering alone can flip frame-to-frame.
splatWorldMesh.renderOrder = 1;
splatTownMesh.renderOrder = 2;
splatCloseMesh.renderOrder = 3;
scene.add(splatWorldMesh);
scene.add(splatTownMesh);
scene.add(splatCloseMesh);

/* @P1850-CHUNK 14 — streets note (paint lives in the splat engine) */
/* =====================================================================
   STREETS — TOMBSTONE. The per-segment draped-box street-mesh IIFE that
   once lived at this position is gone: every street pixel is painted by
   the GROUND SPLAT-MAP engine above (renderGroundSplat(), s62 constant-
   width painter — per-class widths from STREETS_RUNTIME/ROAD_COLS, grid
   frames per updateGridSwing()). Street GEOMETRY truth is unchanged:
   GEO.streetsU/V + STREETS_RUNTIME remain the single source for both the
   splat painter and the placement engine above (STREET_STUB_LEN still
   governs the sandy-track fade past the surveyed grid's edge).
   ===================================================================== */

/* @P1850-CHUNK 52 — mission road paint */
/* =====================================================================
   MISSION ROAD — a winding dirt track from the village's SW edge to
   Mission Dolores, continuing south past it as the old peninsula road
   (El Camino Real). Per peninsula-1846.md §2.3/§5.5: no dedicated road
   existed in 1846 — travelers described "a winding way among the
   sand-hills and chaparral" — so the route below is a greedy low-ground
   search over the real baked heightmap (prefers lower terrain, meanders
   rather than beelining to Mission Dolores), not a surveyed path.
   ===================================================================== */
var MISSION_ROAD_PTS = []; // populated below — reused as an exclusion corridor for tree placement
(function buildMissionRoad(){
  /* Steps from (x0,z0) to (x1,z1) in `steps` hops, meandering laterally
     (tapered to zero at both ends) and, at each hop, nudging toward
     whichever nearby sample is lowest — "path of least resistance" over
     the real terrain rather than a straight line. */
  function findLowRoute(x0,z0,x1,z1,steps){
    var dx=x1-x0, dz=z1-z0, dist=Math.hypot(dx,dz);
    var dirX=dx/dist, dirZ=dz/dist, perpX=-dirZ, perpZ=dirX;
    var pts = [];
    for(var i=0;i<=steps;i++){
      var t=i/steps;
      var bx=x0+dx*t, bz=z0+dz*t;
      var taper = Math.sin(Math.PI*t);           // 0 at both ends, 1 mid-route
      var meander = Math.sin(t*Math.PI*2.4+0.7)*90*taper;
      var cx=bx+perpX*meander, cz=bz+perpZ*meander;
      var bestX=cx, bestZ=cz, bestH=terrainHeight(cx,cz);
      for(var a=0;a<8;a++){
        var ang=a/8*Math.PI*2;
        var tx=cx+Math.cos(ang)*45, tz=cz+Math.sin(ang)*45;
        var th=terrainHeight(tx,tz);
        if(th<bestH && th>1.5){ bestH=th; bestX=tx; bestZ=tz; }
      }
      pts.push({x:bestX,z:bestZ});
    }
    return pts;
  }

  // Start at the village's SW corner — where Stockton St's fading stub
  // trails off — and curve to Mission Dolores. OUTPOSTS.mission is this
  // file's existing terrain-verified placement (see the note at its
  // definition above); it sits ~1km north of the task brief's approximate
  // (-2200,2400) — kept as-is so the road actually meets the rendered
  // Mission buildings instead of ending in empty ground.
  var swCorner = gridToWorld(GEO.streetsU.stockton-20, GEO.streetsV.california+STREET_STUB_LEN*0.7);
  var mission = OUTPOSTS.mission;
  var toMission = findLowRoute(swCorner.x, swCorner.z, mission.x, mission.z, 17);

  // Continue south past the Mission — "the old road down the peninsula,"
  // El Camino Real's line — tapering narrower/fainter toward the frame edge.
  var southEnd = { x: mission.x-140, z: mission.z+1450 };
  var southRoute = findLowRoute(mission.x, mission.z, southEnd.x, southEnd.z, 12);

  // Rendering moved to the GROUND SPLAT-MAP (see renderGroundSplat() near
  // the terrain build): these are the same findLowRoute() waypoints the
  // old per-segment drapeGroundStrip() mesh used, now painted as one
  // smooth quadraticCurveTo curve instead — mottle (hoofprint blotching,
  // A4) stays on the near Mission-road leg only, same as before.
  SPLAT_MISSION_PTS = toMission;
  SPLAT_ELCAMINO_PTS = southRoute;

  MISSION_ROAD_PTS = toMission.concat(southRoute);

  var midPt = toMission[Math.floor(toMission.length/2)];
  LABELS.push({ name:"ROAD TO THE MISSION", cat:"route", x:midPt.x, z:midPt.z, y:null });
  var farPt = southRoute[southRoute.length-1];
  LABELS.push({ name:"EL CAMINO REAL", cat:"route", x:farPt.x, z:farPt.z, y:null });

  // ---- s46: THE PRESIDIO TRAIL — documented from 1835 (peninsula-1846.md
  // §5.5, solid: horse trail village -> Presidio VIA BLACK POINT). Same
  // low-ground meander search as the Mission road; rendered as a faint
  // single track in the world splat tier (no-map-overlay rule). ----
  var nwCorner = gridToWorld(GEO.streetsU.stockton-15, GEO.streetsV.pacific-40);
  var blackPoint = { x:-2300, z:-1080 }; // the land shoulder behind Black Point (Fort Mason)
  var toBlackPt = findLowRoute(nwCorner.x, nwCorner.z, blackPoint.x, blackPoint.z, 12);
  var toPresidio = findLowRoute(blackPoint.x, blackPoint.z, OUTPOSTS.presidio.x+90, OUTPOSTS.presidio.z+30, 12);
  var presidioRoute = toBlackPt.concat(toPresidio.slice(1));
  // keep the track out of open water / Washerwoman's Lagoon: nudge any
  // wet waypoint to the nearest dry ground
  presidioRoute.forEach(function(p){
    if(terrainHeight(p.x,p.z) < 1.2){
      for(var rr=30; rr<=120; rr+=30){
        var done=false;
        for(var aa=0; aa<8; aa++){
          var ang=aa/8*Math.PI*2, tx=p.x+Math.cos(ang)*rr, tz=p.z+Math.sin(ang)*rr;
          if(terrainHeight(tx,tz)>1.8){ p.x=tx; p.z=tz; done=true; break; }
        }
        if(done) break;
      }
    }
  });
  SPLAT_PRESIDIO_PTS = presidioRoute;
  var pmid = presidioRoute[Math.floor(presidioRoute.length*0.6)];
  LABELS.push({ name:"ROAD TO THE PRESIDIO", cat:"route", x:pmid.x, z:pmid.z, y:null });
})();


/* ---- ground-paint audits (layers-spec.md rules block; registered here so the
   audit code lives with the layer it polices — Great Split, 2026-07-12) ---- */

/* shared probe helpers: pick the OWNER tier for a world point (tier ownership
   cuts town paint inside CLOSE_BOX and world paint inside TOWN_BOX), and clear-
   ance tests so probes never sit on someone else's legal paint. */
function _gpInBox(x, z, B, m){ return x>=B.xMin+m && x<=B.xMax-m && z>=B.zMin+m && z<=B.zMax-m; }
function _gpOwnerTier(x, z){
  if(_gpInBox(x, z, CLOSE_BOX, 8)) return { name:"close", ctx:splatCloseCtx, pxFn:closePx, pxLenFn:closePxLen };
  if(_gpInBox(x, z, TOWN_BOX, 8))  return { name:"town",  ctx:splatTownCtx,  pxFn:townPx,  pxLenFn:townPxLen };
  return null; // world tier is too coarse for metrological probes — callers skip
}
function _gpAlphaAt(tier, x, z){
  var p = tier.pxFn(x, z);
  return tier.ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data[3];
}
function _gpNearOtherStreet(x, z, selfId, m){
  for(var i=0;i<PLACEMENT_STREET_SEGS.length;i++){
    var sg = PLACEMENT_STREET_SEGS[i];
    if(sg.id===selfId) continue;
    if(distToSegXZ(x, z, sg.x0, sg.z0, sg.x1, sg.z1) < sg.halfW + m) return true;
  }
  return false;
}
function _gpNearPlaza(x, z, m){
  var a = gridToWorld(GEO.plaza.uMin, GEO.plaza.vMin), b = gridToWorld(GEO.plaza.uMax, GEO.plaza.vMax);
  return x >= Math.min(a.x,b.x)-m && x <= Math.max(a.x,b.x)+m &&
         z >= Math.min(a.z,b.z)-m && z <= Math.max(a.z,b.z)+m;
}

registerAudit("ground-paint", "oneOwner", function(){
  // one-owner-per-pixel (screening #11): outer tiers contribute NOTHING inside
  // an inner tier's rect — wraps the existing __P1850.splatOwnership probes.
  var probes = window.__P1850.splatOwnership();
  var bad = probes.filter(function(p){ return p.alpha !== 0; });
  return { pass: bad.length===0, probes: probes.length, violations: bad };
});

registerAudit("ground-paint", "constantWidth", function(){
  /* CONSTANT-WIDTH sample check (s62 amendment, layers-spec.md): road width is
     the CONSTANT class width, everywhere, always. For each street with S4
     (full-surface) pieces in the current paint, measure the painted width by
     alpha scan perpendicular to the centerline at up to 3 mid-block stations
     (clear of junctions/plaza), and require every station ~= widthM and the
     stations mutually constant. */
  updateGridSwing(); // repaint synchronously if the splat is stale for this date/skew
  var out = { pass:true, streetsProbed:0, stations:0, violations:[], skipped:[] };
  if(!SPLAT_LAST_STATS){ return { pass:false, error:"no splat stats — paint never ran" }; }
  STREETS_RUNTIME.forEach(function(s){
    var rec = SPLAT_LAST_STATS.streets[s.id];
    if(!rec || !rec.pieces || rec.pieces.length<2) return;
    var s4idx = [];
    for(var i=0;i<rec.pieces.length;i++) if(rec.pieces[i].st===4) s4idx.push(i);
    if(!s4idx.length) return;
    var widths = [], tried = 0;
    for(var k=0; k<s4idx.length && widths.length<3 && tried<24; k+=Math.max(1,Math.floor(s4idx.length/8))){
      tried++;
      var i2 = s4idx[k], p = rec.pieces[i2];
      var pPrev = rec.pieces[Math.max(0,i2-1)], pNext = rec.pieces[Math.min(rec.pieces.length-1,i2+1)];
      var dx = pNext.x-pPrev.x, dz = pNext.z-pPrev.z, dl = Math.hypot(dx,dz);
      if(dl<1) continue;
      var nx = -dz/dl, nz = dx/dl; // lateral unit
      if(terrainHeight(p.x,p.z)<=0.5) continue;
      if(_gpNearOtherStreet(p.x, p.z, s.id, s.widthM/2 + 4)) continue; // junction / parallel-street bleed
      if(_gpNearPlaza(p.x, p.z, 14)) continue;
      var tier = _gpOwnerTier(p.x, p.z); if(!tier) continue;
      var centerA = _gpAlphaAt(tier, p.x, p.z);
      if(centerA < 50) continue; // not a solidly painted station (tile seam etc.) — not measurable
      var thr = centerA*0.45, half = {}, sides = [1,-1];
      for(var si=0; si<2; si++){
        var sgn = sides[si], lastOn = 0, misses = 0;
        for(var off=0.4; off<=s.widthM*0.85+3; off+=0.4){
          var a2 = _gpAlphaAt(tier, p.x+nx*off*sgn, p.z+nz*off*sgn);
          if(a2>=thr){ lastOn = off; misses = 0; } else if(++misses>=2) break;
        }
        half[sgn] = lastOn + 0.2;
      }
      widths.push(+(half[1]+half[-1]).toFixed(2));
      out.stations++;
    }
    if(!widths.length){ out.skipped.push(s.id); return; }
    out.streetsProbed++;
    var mn = Math.min.apply(null,widths), mx = Math.max.apply(null,widths);
    var tolAbs = Math.max(2.5, 0.35*s.widthM);
    var bad = widths.some(function(w){ return Math.abs(w - s.widthM) > tolAbs; }) ||
              (mx - mn) > Math.max(2.0, 0.30*s.widthM);
    if(bad){ out.pass = false; out.violations.push({ id:s.id, widthM:s.widthM, measured:widths }); }
  });
  return out;
});

registerAudit("ground-paint", "eraPaint", function(){
  /* ERA-PAINT check (layers-spec.md): IF simDay < a street's appear-day THEN
     zero paint. Two teeth: (a) the paint registry — the last repaint recorded
     no segs for any unappeared street; (b) a pixel probe set on unappeared
     centerlines, clear of every OTHER street's ROW and the plaza, must read
     alpha ~0 in the owning tier canvas. */
  updateGridSwing();
  var out = { pass:true, unappeared:0, probes:0, statsViolations:[], pixelViolations:[] };
  STREETS_RUNTIME.forEach(function(s){
    var gateDay = s.surveyedDay!=null ? s.surveyedDay : s.firstMentionDay;
    if(gateDay==null || simDay>=gateDay) return; // appeared — outside this rule
    out.unappeared++;
    var rec = SPLAT_LAST_STATS && SPLAT_LAST_STATS.streets[s.id];
    if(rec && ((rec.ghostSegs||0)+(rec.wornSegs||0)+(rec.pierSegs||0))>0) out.statsViolations.push(s.id);
    var angle = s.swings ? CURRENT_STREET_SKEW : GRID_ROT_BASE, probed = 0;
    for(var pi=0; pi+1<s.polyline.length && probed<8; pi++){
      var A = gridToWorldAt(s.polyline[pi].u,   s.polyline[pi].v,   angle);
      var B = gridToWorldAt(s.polyline[pi+1].u, s.polyline[pi+1].v, angle);
      var mx=(A.x+B.x)/2, mz=(A.z+B.z)/2;
      if(terrainHeight(mx,mz)<=0.5) continue;           // wet — water lots never paint anyway
      if(_gpNearOtherStreet(mx, mz, s.id, 3)) continue; // a crossing street's legal paint
      if(_gpNearPlaza(mx, mz, 16)) continue;
      var tier = _gpOwnerTier(mx, mz); if(!tier) continue;
      probed++; out.probes++;
      var a3 = _gpAlphaAt(tier, mx, mz);
      if(a3 > 12) out.pixelViolations.push({ id:s.id, x:Math.round(mx), z:Math.round(mz), alpha:a3, tier:tier.name });
    }
  });
  if(out.statsViolations.length || out.pixelViolations.length) out.pass = false;
  return out;
});

/* dev-tooling visibility interface (layers-spec.md §15): this layer's visibility toggle */
registerLayerVisibility("ground-paint", function(v){ [splatWorldMesh, splatTownMesh, splatCloseMesh].forEach(function(m){ m.visible = v; }); });
