#!/usr/bin/env node
/* d1 (ICS-28) screenshots — Apple material/motion pass over the glass chrome
   (two glass tiers + 35% dim, spring easings on transforms, concentric radii,
   vibrancy ladder, press feel, a11y fallbacks, 11px type floor):
     (a) town framing at 500 m, lifecycle LEGEND OPEN + timeline scrubber +
         speed pill + altitude/masthead glass pillows — the required
         chrome-over-map read (css26 framing 1);
     (b) closer 250 m street band — glass detail over building fills
         (css26 framing 2);
     (c) same town framing with THE PAPER pane open (css26 framing 3);
     (d) ☰ menu sheet open — the frosted-parchment pane + panel radius;
     (e) the ATELIER rail — regular-tier glass, hard scroll-edge head,
         vibrancy ink ladder, capsule controls.
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-d1/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-d1");

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
  const shoot = async(id,note)=>{ const dest=path.join(OUT,`${id}.png`); await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(260);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", `${id}.png -`, note); };
  const boot = async(target)=>{
    await page.goto(`http://127.0.0.1:${srv.port}/${target}`, { waitUntil:"load", timeout:90000 });
    await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
    await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(50);
  };

  await boot("index.html");

  /* (a) town framing, legend open, timeline visible */
  await page.evaluate(()=>window.__P1850.camSet({ alt:500, x:-60, z:122, snap:true })); await settle(50);
  await page.evaluate(()=>window.__P1850_LC_LEGEND.setOpen(true)); await sleep(900); /* spring settle */
  await shoot("town-500m-legend-timeline", "regular-tier glass over the town: legend panel (r-panel + rim) + capsule chip, scrubber, speed pill, clear-tier pillows");

  /* (b) closer street band — glass detail over building fills */
  await page.evaluate(()=>window.__P1850.camSet({ alt:250, x:-60, z:122, snap:true })); await settle(50);
  await shoot("street-250m-glass-detail", "closer read: 35% dim + brightness(0.94) pickup under scrubber/speed pill/legend over the street band");

  /* (c) the paper pane open next to the glass chrome */
  await page.evaluate(()=>window.__P1850_LC_LEGEND.setOpen(false));
  await page.evaluate(()=>window.__P1850.camSet({ alt:500, x:-60, z:122, snap:true })); await settle(50);
  await page.evaluate(()=>{ document.getElementById("paper-toggle").dispatchEvent(new MouseEvent("click",{bubbles:true})); });
  await sleep(900); /* spring slide + blur-in settle */
  await shoot("town-500m-paper-open", "era parchment paper pane (unchanged voice) beside the glass chrome after the spring slide");
  await page.evaluate(()=>{ document.getElementById("pp-close").dispatchEvent(new MouseEvent("click",{bubbles:true})); }); await sleep(800);

  /* (d) menu sheet open — frosted parchment + r-panel radius + rim */
  await page.evaluate(()=>{ document.getElementById("hud-menu-toggle").dispatchEvent(new MouseEvent("click",{bubbles:true})); });
  await sleep(900);
  await shoot("town-500m-menu-open", "the frosted-parchment menu sheet: regular-tier blur behind the era fill, 16px panel radius, glass rim");

  /* (e) the atelier rail */
  await boot("atelier.html");
  await page.evaluate(()=>window.__P1850.camSet({ alt:500, x:-60, z:122, snap:true })); await settle(50);
  await shoot("atelier-rail", "workbench: regular-tier glass, near-solid hard-scroll-edge head, vibrancy ink ladder, capsule buttons, concentric radii");

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error(e); process.exit(1); });
