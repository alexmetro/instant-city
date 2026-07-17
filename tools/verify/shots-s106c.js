#!/usr/bin/env node
/* s106c screenshots — BLEED HALOS + THE 1849 IN-TOWN TENT-FIRST FILL (atelier):
     (1) Happy Valley EDGE closeup @ 1849-12-20 — the halo gradient (dense
         core feathering past the dashed documented boundary toward the
         fainter dashed halo-extent line);
     (2) Happy Valley overview @ 1849-12-20 — core boundary + halo extent
         rings both visible, 1000 tents;
     (3) TOWN OVERVIEW @ 1849-12-20 — the in-town wave threading the platted
         blocks around the plaza / Dupont / Stockton (tents+shanties in the
         residential band, frame densifying the commercial core);
     (4) plaza-west closeup (Dupont/Stockton ground) @ 1849-12-20 — fill
         tents readable as tent silhouettes between the frame placeholders;
     (5) REGRESSION PROOF @ 1848-04-01 — the pre-boom village unchanged
         (byte-identical 1846-48 fill; zero wave entries; zero zone tents).
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-s106c/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-s106c");

function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png" };
  const server = http.createServer((req,res)=>{ let p = decodeURIComponent(req.url.split("?")[0]); if(p==="/") p="/index.html";
    const fp = path.join(root,p); if(!fp.startsWith(root)){ res.writeHead(403); return res.end(); }
    fs.readFile(fp,(e,b)=>{ if(e){ res.writeHead(404); return res.end(); } res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms=>new Promise(r=>setTimeout(r,ms));

(async ()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1600,height:1000} })).newPage();
  page.on("pageerror", e=>console.log("PAGEERROR", e.message));
  const settle = async(n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(140); };

  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:120000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.fillWave; },{timeout:120000});

  // framing anchors: HV centroid + the HV boundary point nearest the town (the bleed-toward-town edge) + the plaza
  const anchors = await page.evaluate(()=>{
    const plaza = window.__P1850.plazaCenter;
    const hv = window.__P1850_ENCAMP.zones.find(z=>z.id==="happy-valley");
    const r = hv.poly||[]; let cx=0, cz=0; r.forEach(p=>{cx+=p.x;cz+=p.z;}); cx/=r.length; cz/=r.length;
    let edge = r[0], best = Infinity;
    r.forEach(p=>{ const d = Math.hypot(p.x-plaza.x, p.z-plaza.z); if(d<best){ best=d; edge=p; } });
    return { plaza:{x:plaza.x,z:plaza.z}, hv:{x:cx,z:cz}, hvEdge:{x:edge.x,z:edge.z} };
  });
  console.log("anchors:", JSON.stringify(anchors));
  const A = anchors;

  const SHOTS = [
    { id:"1-happy-valley-edge-halo-1849-12-20", date:"1849-12-20", alt:320, x:A.hvEdge.x, z:A.hvEdge.z, ov:{encamp:true},
      note:"HV edge closeup (townward corner) — dense core feathering out past the dashed boundary into the halo band" },
    { id:"2-happy-valley-halo-overview-1849-12-20", date:"1849-12-20", alt:640, x:A.hv.x, z:A.hv.z, ov:{encamp:true},
      note:"HV overview — core boundary (dashed) + halo extent (fainter dashed) + 1000 tents" },
    { id:"3-town-overview-1849-12-20", date:"1849-12-20", alt:700, x:A.plaza.x, z:A.plaza.z, ov:{},
      note:"town overview Dec 1849 — the in-town wave filling the platted blocks (tents+shanties in the residential band, frame in the core)" },
    { id:"4-plaza-west-core-fill-1849-12-20", date:"1849-12-20", alt:230, x:A.plaza.x-170, z:A.plaza.z, ov:{},
      note:"Dupont/Stockton ground west of the plaza — the once-empty core blocks now frame-filled (zone law: the boom core is never tent ground)" },
    { id:"5-tent-belt-1849-12-20", date:"1849-12-20", alt:280,
      x:(A.plaza.x + 0.78*(A.hvEdge.x - A.plaza.x)), z:(A.plaza.z + 0.78*(A.hvEdge.z - A.plaza.z)), ov:{},
      note:"the residential belt beyond the commercial reach (Bush/Sutter toward Market) — in-town fill tents threading the platted blocks" },
    { id:"6-regression-1848-04-01", date:"1848-04-01", alt:500, x:A.plaza.x, z:A.plaza.z, ov:{},
      note:"regression proof — Apr 1848 village unchanged (byte-identical fill fingerprint; zero wave entries)" }
  ];

  for(const s of SHOTS){
    await page.evaluate(o=>{ window.__P1850_WBSETOVERLAY("encamp", !!o.encamp); window.__P1850_WBSETOVERLAY("lifecycle", false); }, s.ov);
    await page.evaluate(iso=>window.__P1850.jump(iso), s.date); await settle(50);
    await page.evaluate(o=>{ window.__P1850.camSet({ alt:o.alt, x:o.x, z:o.z, snap:true }); }, s);
    await settle(50);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
    const nums = await page.evaluate(iso=>({ tents: window.__P1850.tentCounts(iso).standing, fill: window.__P1850.fillCensus(iso) }), s.date);
    const dest = path.join(OUT, `${s.id}.png`);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", path.basename(dest), JSON.stringify(nums), "-", s.note);
  }

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
