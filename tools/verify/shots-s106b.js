#!/usr/bin/env node
/* s106b screenshots — THE 1849 TENT EXPLOSION (atelier, ENCAMPMENT ZONES
   overlay ON so the hard spawn boundary reads against the tents):
     (1) Happy Valley 1849-09-15 — the tent city ramping (~350 standing);
     (2) Happy Valley 1849-12-20 — "perhaps a thousand" (the documented
         late-1849 figure, placed in full — no render cap);
     (3) Happy Valley closeup — the three variant silhouettes readable
         (TNT-1 wall / TNT-2 wedge / TNT-3 framed cloth house + door marker);
     (4) Little Chile closeup 1849-07-14 — the pre-raid camp (60 tents);
     (5) Little Chile 1849-07-16 + LIFECYCLE overlay — the Hounds-raid
         aftermath (torn-down tents as teardown/cleared tints);
     (6) date-gate proof 1848-04-01 — Happy Valley EMPTY (no zone, no tents);
     (7) QA compose proof — __P1850_TENT_QA({demoBurn:true}) burning tent
         with the LIFECYCLE overlay (charcoal body + ember door + red BRN
         tint compose); knob restored off after the shot.
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-s106b/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-s106b");

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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.tentCounts; },{timeout:120000});

  // zone centroids for framing
  const cents = await page.evaluate(()=>{
    const out={};
    window.__P1850_ENCAMP.zones.forEach(z=>{ const r=z.poly||[]; let cx=0,cz=0; r.forEach(p=>{cx+=p.x;cz+=p.z;});
      out[z.id]= r.length?{x:cx/r.length,z:cz/r.length}:null; });
    return out;
  });
  const HV = cents["happy-valley"], LC = cents["little-chile"];
  console.log("centroids:", JSON.stringify(cents));

  const SHOTS = [
    { id:"1-happy-valley-1849-09-15",       date:"1849-09-15", alt:560, x:HV.x, z:HV.z, ov:{encamp:true, lifecycle:false},
      note:"Happy Valley ramping (~350 tents standing), zone overlay on" },
    { id:"2-happy-valley-1849-12-20",       date:"1849-12-20", alt:560, x:HV.x, z:HV.z, ov:{encamp:true, lifecycle:false},
      note:"Happy Valley at the documented 'perhaps a thousand' (1000 placed, no render cap)" },
    { id:"3-happy-valley-closeup-variants", date:"1849-12-20", alt:110, x:HV.x, z:HV.z, ov:{encamp:true, lifecycle:false},
      note:"variant silhouettes: TNT-1 wall / TNT-2 wedge / TNT-3 framed cloth house + orange door markers" },
    { id:"4-little-chile-preraid-1849-07-14", date:"1849-07-14", alt:220, x:LC.x, z:LC.z, ov:{encamp:true, lifecycle:false},
      note:"Little Chile pre-raid (60 tents on the documented Montgomery/Kearny/Pacific/Jackson block)" },
    { id:"5-little-chile-raid-1849-07-16",  date:"1849-07-16", alt:220, x:LC.x, z:LC.z, ov:{encamp:true, lifecycle:true},
      note:"the Hounds-raid aftermath (Jul 15: tents torn down) — lifecycle overlay composing over the camp" },
    { id:"6-dategate-happy-valley-1848-04-01", date:"1848-04-01", alt:560, x:HV.x, z:HV.z, ov:{encamp:true, lifecycle:false},
      note:"pre-boom date gate: Apr 1848 — no zone, ZERO Happy Valley tents" }
  ];

  for(const s of SHOTS){
    await page.evaluate(o=>{ window.__P1850_WBSETOVERLAY("encamp", !!o.encamp); window.__P1850_WBSETOVERLAY("lifecycle", !!o.lifecycle); }, s.ov);
    await page.evaluate(iso=>window.__P1850.jump(iso), s.date); await settle(50);
    await page.evaluate(o=>{ window.__P1850.camSet({ alt:o.alt, x:o.x, z:o.z, snap:true }); }, s);
    await settle(50);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
    const counts = await page.evaluate(iso=>window.__P1850.tentCounts(iso).standing, s.date);
    const dest = path.join(OUT, `${s.id}.png`);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", path.basename(dest), "(standing:", JSON.stringify(counts), ") -", s.note);
  }

  // (7) QA compose proof — demoBurn knob ON, burning tent + lifecycle overlay
  await page.evaluate(()=>window.__P1850_TENT_QA({ demoBurn:true }));
  const burnPos = await page.evaluate(()=>{
    const day = window.__P1850.dayOf("1849-09-01") + 0.5;
    const b = window.__P1850.tentsAt(day).filter(t=>t.phase==="burning" && t.zone==="happy-valley")[0];
    return b ? { x:b.cx, z:b.cz } : null;
  });
  await page.evaluate(()=>{ window.__P1850_WBSETOVERLAY("encamp", true); window.__P1850_WBSETOVERLAY("lifecycle", true); });
  await page.evaluate(()=>window.__P1850.jump("1849-09-01")); await settle(50);
  if(burnPos){
    await page.evaluate(o=>{ window.__P1850.camSet({ alt:70, x:o.x, z:o.z, snap:true }); }, burnPos);
    await settle(50);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
    const dest = path.join(OUT, "7-qa-demoburn-compose.png");
    try{ await page.screenshot({ path:dest }); console.log("ok  ", path.basename(dest), "- QA demoBurn: charcoal tent + ember door + BRN lifecycle tint compose (knob-labeled debug affordance)"); }
    catch(e){ console.log("FAIL 7-qa-demoburn-compose.png", e.message); }
  } else console.log("FAIL 7-qa-demoburn-compose.png — no burning tent under the knob");
  await page.evaluate(()=>window.__P1850_TENT_QA({ demoBurn:false }));

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
