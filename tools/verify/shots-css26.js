#!/usr/bin/env node
/* css26 screenshots — GLASS CHROME polish (backdrop blur+saturate scrims,
   white-alpha hairlines, --ease-out token, blur-in reveals, text-wrap):
     (a) town framing at 500 m, lifecycle LEGEND OPEN + timeline scrubber +
         speed pill + altitude/masthead glass pillows — the required
         chrome-over-map read;
     (b) closer 250 m street band — glass detail over building fills
         (scrubber body, speed pill, beat-card band empty, altitude);
     (c) same town framing with THE PAPER pane open — the era parchment
         surface unchanged next to the glass chrome, text-wrap on masthead
         and body copy.
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-css26/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-css26");

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

  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});

  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(50);

  /* (a) town framing, legend open, timeline visible */
  await page.evaluate(()=>window.__P1850.camSet({ alt:500, x:-60, z:122, snap:true })); await settle(50);
  await page.evaluate(()=>window.__P1850_LC_LEGEND.setOpen(true)); await sleep(400);
  await shoot("town-500m-legend-timeline", "glass chrome over the town: legend panel+chip, scrubber body/tab, speed pill, altitude + masthead pillows");

  /* (b) closer street band — glass detail over building fills */
  await page.evaluate(()=>window.__P1850.camSet({ alt:250, x:-60, z:122, snap:true })); await settle(50);
  await shoot("street-250m-glass-detail", "closer read: blur pickup under scrubber/speed pill/legend over the street band");

  /* (c) the paper pane open next to the glass chrome */
  await page.evaluate(()=>window.__P1850_LC_LEGEND.setOpen(false));
  await page.evaluate(()=>window.__P1850.camSet({ alt:500, x:-60, z:122, snap:true })); await settle(50);
  await page.evaluate(()=>{ document.getElementById("paper-toggle").dispatchEvent(new MouseEvent("click",{bubbles:true})); });
  await sleep(700); /* slide + blur-in settle */
  await shoot("town-500m-paper-open", "era parchment paper pane (unchanged voice) beside the glass chrome; text-wrap balance/pretty in the sheet");

  await browser.close(); srv.server.close();
})();
