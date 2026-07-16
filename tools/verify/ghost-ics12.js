#!/usr/bin/env node
/* ics12 ghost-hairline check: 1847-09-15 (post-O'Farrell survey, pre-wear) at
   400 m — S1 ghost lines must render with the same faint 0.30-alpha look.
   Usage: node tools/verify/ghost-ics12.js <suffix> */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-16-ics12");
const SUFFIX = process.argv[2] || "shot";
function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json" };
  const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async ()=>{
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1600,height:1000} })).newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v && getComputedStyle(v).display==="none" && window.__P1850; }, { timeout:90000 });
  const settle = async (n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n); await sleep(140); };
  await page.evaluate(iso=>window.__P1850.jump(iso), "1847-09-15"); await settle(40);
  await page.evaluate(()=>window.__P1850.camSet({ alt:400, x:-105.7, z:78.2, snap:true })); await settle(40);
  await page.evaluate(()=>window.__P1850.render && window.__P1850.render()); await sleep(120);
  const c = await page.$("canvas"); await c.screenshot({ path: path.join(OUT, `ghosts-400m-1847-${SUFFIX}.png`) });
  console.log("ok", `ghosts-400m-1847-${SUFFIX}.png`);
  await browser.close(); srv.server.close();
})();
