#!/usr/bin/env node
/* s108 screenshots — the building lifecycle read (building-lifecycle-spec).
   (a) ONE BUILDING ACROSS ITS STATES: Dennison's Exchange (the fire's point of
       origin, the fastest documented rebuild arc — "rebuilt in 16 days")
       through C1 site -> C2 frame -> C3 walls -> active -> burning ->
       ruins -> clearing -> rebuild C1/C2; plus El Dorado's canvas tent and
       its authored EXPAND arc (canvas -> 3-story).
   (b) THE PLAZA before / during / after the Dec 24 1849 Great Fire.
   (c) The ATELIER lifecycle overlay (state tints + glyphs).
   DEV-ONLY. Writes into <APP_ROOT>/screenings/2026-07-16-s108/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-16-s108");

const SHOTS = [
  // (a) one building across its states — Dennison's Exchange (camera set from its live centroid)
  { id:"dennisons-1-C1-site",     target:"index", date:"1849-03-10", alt:110, at:"dennisons-exchange", note:"C1 site: pad + orange front arrow" },
  { id:"dennisons-2-C2-frame",    target:"index", date:"1849-04-05", alt:110, at:"dennisons-exchange", note:"C2: partial block, pale scaffold tone" },
  { id:"dennisons-3-C3-walls",    target:"index", date:"1849-05-15", alt:110, at:"dennisons-exchange", note:"C3: taller block, scaffold tone stepping toward class tint" },
  { id:"dennisons-4-active",      target:"index", date:"1849-09-15", alt:110, at:"dennisons-exchange", note:"active C4, fresh-wood sheen still fading (built Jun 1)" },
  { id:"dennisons-5-burning",     target:"index", date:"1849-12-24", alt:110, at:"dennisons-exchange", note:"BURNING: charcoal body + ember-red front markers (the fire day)" },
  { id:"dennisons-6-ruins",       target:"index", date:"1849-12-25", alt:110, at:"dennisons-exchange", note:"RUINS: low dark rubble slab + boxlets + debris wedge" },
  { id:"dennisons-7-clearing",    target:"index", date:"1849-12-27", alt:110, at:"dennisons-exchange", note:"CLEARING: rubble shrinking away" },
  { id:"dennisons-8-rebuild-C1",  target:"index", date:"1849-12-29", alt:110, at:"dennisons-exchange", note:"REBUILD C1 on the cleared lot (the 16-day rebuild starts in-window)" },
  { id:"dennisons-9-rebuild-C2",  target:"index", date:"1849-12-31", alt:110, at:"dennisons-exchange", note:"rebuild C2 by the window's last day" },
  // El Dorado: the authored canvas -> 3-story expand arc
  { id:"eldorado-1-canvas",       target:"index", date:"1849-05-01", alt:110, at:"el-dorado", note:"the canvas-class tent form (authored construct, 3-day lead)" },
  { id:"eldorado-2-expanding",    target:"index", date:"1849-08-20", alt:110, at:"el-dorado", note:"EXPANDING: scaffold-tone annex growing above the old body" },
  { id:"eldorado-3-expanded",     target:"index", date:"1849-10-15", alt:110, at:"el-dorado", note:"the expanded 3-story form, fresh-wood sheen" },
  // (b) the plaza before / during / after the Great Fire
  { id:"plaza-1-before-fire",     target:"index", date:"1849-12-20", alt:220, note:"the plaza cluster standing, four days before the fire" },
  { id:"plaza-2-fire-day",        target:"index", date:"1849-12-24", alt:220, note:"Dec 24 1849: the Kearny-side cluster burning (charcoal + ember)" },
  { id:"plaza-3-after-ruins",     target:"index", date:"1849-12-26", alt:220, note:"the morning after: ruins along Kearny + Washington" },
  { id:"plaza-4-after-rebuild",   target:"index", date:"1849-12-31", alt:220, note:"the window's end: cleared lots + rebuild sites rising" },
  // (c) the atelier lifecycle overlay
  { id:"atelier-lifecycle-fire",  target:"atelier", date:"1849-12-26", alt:260, overlay:"lifecycle", note:"lifecycle overlay: RUIN/CLR/CLD tints + glyphs across the burn scar" },
  { id:"atelier-lifecycle-1849",  target:"atelier", date:"1849-09-15", alt:320, overlay:"lifecycle", note:"lifecycle overlay: A/A* actives, C-stage constructions, TDN teardowns" }
];

function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png" };
  const server = http.createServer((req,res)=>{ let p = decodeURIComponent(req.url.split("?")[0]); if(p==="/") p="/index.html";
    const fp = path.join(root,p); if(!fp.startsWith(root)){ res.writeHead(403); return res.end(); }
    fs.readFile(fp,(e,b)=>{ if(e){ res.writeHead(404); return res.end(); } res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
async function shoot(page,dest){
  let ok=false;
  try{ const c=await page.$("canvas"); if(c){ await c.screenshot({path:dest}); ok=true; } }catch(e){}
  if(!ok){ try{ const u=await page.evaluate(()=>window.__wbShot?window.__wbShot():null); if(u){ fs.writeFileSync(dest, Buffer.from(u.split(",")[1],"base64")); ok=true; } }catch(e){} }
  return ok;
}

(async ()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1600,height:1000} })).newPage();
  page.on("pageerror", e=>console.log("PAGEERROR", e.message));
  const settle = async(n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(140); };

  let loaded = null;
  for(const s of SHOTS){
    if(loaded !== s.target){
      await page.goto(`http://127.0.0.1:${srv.port}/${s.target}.html`, { waitUntil:"load", timeout:90000 });
      await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
      loaded = s.target;
    }
    if(s.overlay){
      const hasHook = await page.evaluate(()=>typeof window.__P1850_WBSETOVERLAY==="function");
      if(hasHook) await page.evaluate(k=>window.__P1850_WBSETOVERLAY(k,true), s.overlay);
      else console.log("WARN no overlay hook for", s.id);
    }
    await page.evaluate(iso=>window.__P1850.jump(iso), s.date); await settle(40);
    let cx = null, cz = null;
    if(s.at){
      const c = await page.evaluate(id=>{
        const L = window.__P1850.landmarksAt();
        const e = L.find(x=>x.id===id);
        return e ? { x:e.cx, z:e.cz } : null;
      }, s.at);
      if(c){ cx=c.x; cz=c.z; } else console.log("WARN", s.id, "landmark not in derived set at", s.date, "- plaza fallback");
    }
    await page.evaluate(o=>{ window.__P1850.camSet({ alt:o.alt, x:(o.x!=null?o.x:window.__P1850.plazaCenter.x), z:(o.z!=null?o.z:window.__P1850.plazaCenter.z), snap:true }); }, { alt:s.alt, x:cx, z:cz });
    await settle(40);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(120);
    const dest = path.join(OUT, `${s.id}.png`);
    console.log((await shoot(page,dest))?"ok  ":"FAIL", path.basename(dest), "-", s.note);
    if(s.overlay) await page.evaluate(k=>window.__P1850_WBSETOVERLAY&&window.__P1850_WBSETOVERLAY(k,false), s.overlay);
  }

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
