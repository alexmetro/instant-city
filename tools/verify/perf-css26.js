#!/usr/bin/env node
/* css26 PERF-CHECK: does backdrop-filter glass over the WebGL canvas cost
   visible frame time? A/B on the SAME build: rAF frame deltas with the glass
   chrome live (legend open + scrubber + pill + pillows on screen), then with
   an injected kill-switch (backdrop-filter:none everywhere), at the town
   framing. 5 batches x 60 frames, median batch average reported. DEV-ONLY. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json" };
  const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async ()=>{
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1600,height:1000} })).newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v && getComputedStyle(v).display==="none" && window.__P1850; }, { timeout:90000 });
  const settle = async (n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n); await sleep(140); };
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(40);
  await page.evaluate(()=>window.__P1850.camSet({ alt:500, x:-60, z:122, snap:true })); await settle(40);
  await page.evaluate(()=>window.__P1850_LC_LEGEND.setOpen(true)); await sleep(300);

  const measure = async (label)=>{
    const batches = [];
    for(let b=0;b<5;b++){
      const avg = await page.evaluate(()=>new Promise(res=>{
        const t=[]; let last=performance.now();
        function f(){ const n=performance.now(); t.push(n-last); last=n;
          if(t.length<60) requestAnimationFrame(f); else { t.shift(); res(t.reduce((a,c)=>a+c,0)/t.length); } }
        requestAnimationFrame(f);
      }));
      batches.push(+avg.toFixed(2)); await sleep(80);
    }
    batches.sort((a,b)=>a-b);
    console.log(`${label}: median ${batches[2]} ms/frame  (batches: ${batches.join(", ")})`);
    return batches[2];
  };

  const withGlass = await measure("glass ON  (backdrop-filter live)");
  await page.evaluate(()=>{ const st=document.createElement("style"); st.id="kill-glass";
    st.textContent="*, *::before, *::after{ backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }";
    document.head.appendChild(st); });
  await sleep(200);
  const noGlass = await measure("glass OFF (kill-switch injected)");
  console.log(`delta: ${(withGlass-noGlass).toFixed(2)} ms/frame (${((withGlass-noGlass)/noGlass*100).toFixed(1)}%) — SwiftShader software raster, worst case vs a real GPU`);
  await browser.close(); srv.server.close();
})();
