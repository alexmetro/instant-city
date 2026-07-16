#!/usr/bin/env node
/* ics12 diagnostic probe (dev-only, not committed as part of the app):
   boots the release build headless, jumps to 1849-12-20, dumps plazaCenter,
   the world bbox of every painted street polyline (per class), and Clay
   street's polyline near the plaza — used to aim the closeup framing and
   size the near-town detail region. */
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
  page.on("pageerror", e=>console.log("PAGEERROR", e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v && getComputedStyle(v).display==="none" && window.__P1850; }, { timeout:90000 });
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-12-20");
  await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick && window.__P1850.tick(0.1); }, 40);
  await sleep(150);
  const out = await page.evaluate(()=>{
    const P = window.__P1850, st = P.splatStats;
    const bb = { x0:1e9, x1:-1e9, z0:1e9, z1:-1e9 };
    const perStreet = [];
    Object.keys(st.streets).forEach(id=>{
      const r = st.streets[id]; if(!r.worldPoly || !r.painted) return;
      let sx0=1e9,sx1=-1e9,sz0=1e9,sz1=-1e9;
      r.worldPoly.forEach(p=>{ sx0=Math.min(sx0,p.x); sx1=Math.max(sx1,p.x); sz0=Math.min(sz0,p.z); sz1=Math.max(sz1,p.z); });
      bb.x0=Math.min(bb.x0,sx0); bb.x1=Math.max(bb.x1,sx1); bb.z0=Math.min(bb.z0,sz0); bb.z1=Math.max(bb.z1,sz1);
      perStreet.push({ id, state:r.state, x0:Math.round(sx0), x1:Math.round(sx1), z0:Math.round(sz0), z1:Math.round(sz1) });
    });
    const clay = st.streets["clay-street"] || st.streets["clay"] || null;
    const cam = { fov: null };
    return {
      plazaCenter: P.plazaCenter,
      paintedBBox: { x0:Math.round(bb.x0), x1:Math.round(bb.x1), z0:Math.round(bb.z0), z1:Math.round(bb.z1) },
      streets: perStreet.sort((a,b)=>a.id.localeCompare(b.id)),
      clayPoly: clay && clay.worldPoly ? clay.worldPoly.slice(0,40).map(p=>({x:Math.round(p.x), z:Math.round(p.z)})) : null
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); srv.server.close();
})();
