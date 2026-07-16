#!/usr/bin/env node
/* s110d screenshots (terrain-edge-grounding-spec Phase 2c — the s105 Broadway
   integration + inland foot re-anchor). Captures the RELEASE render of Broadway
   Wharf at (a) Dec 1847 — the short stub touching the shore, its foot visibly on
   dry land — and (b) Dec 1849 — the full deck out over the water off the foot of
   Broadway — plus (c) the ATELIER dry-land overlay at the same framing: the foot
   cross (green = dry and set back >= 8 ft) INLAND of the orange dry-land edge.
   DEV-ONLY. Writes into <APP_ROOT>/screenings/2026-07-16-s110d/. */
"use strict";
const path=require("path"), http=require("http"), fs=require("fs");
const { chromium }=require("playwright");
const ROOT=path.resolve(__dirname,"..","..");
const OUT=path.join(ROOT,"screenings","2026-07-16-s110d");
/* Broadway foot (grid u=300.2, v=-350.79) sits at world ~(352.3, -349.5); the
   deck end (u=374.9) at ~(426.1, -361.2). Framings center on that run. */
const SHOTS=[
  { id:"broadway-dec1847-stub-shore", target:"index",   date:"1847-12-20", alt:260, x:375, z:-352,
    note:"Dec 1847 stub touching the shore; foot on dry land" },
  { id:"broadway-dec1849-deck-water", target:"index",   date:"1849-12-20", alt:380, x:392, z:-356,
    note:"full deck out over the water off the foot of Broadway" },
  { id:"atelier-dryland-broadway-foot", target:"atelier", date:"1849-12-20", alt:260, x:375, z:-352,
    note:"dry-land overlay: green foot cross inland of the orange dry-land edge", overlay:true }
];

function startServer(root){
  const MIME={".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".png":"image/png",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
  const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b);});});
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function shoot(page,dest){
  let ok=false;
  try{ const c=await page.$("canvas"); if(c){ await c.screenshot({path:dest}); ok=true; } }catch(e){}
  if(!ok){ try{ const u=await page.evaluate(()=>window.__wbShot?window.__wbShot():null); if(u){ fs.writeFileSync(dest, Buffer.from(u.split(",")[1],"base64")); ok=true; } }catch(e){} }
  return ok;
}

(async ()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv=await startServer(ROOT);
  const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
  const ctx=await browser.newContext({viewport:{width:1600,height:1000}});
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.log("PAGEERROR",e.message));
  const settle=async(n=40)=>{ await page.evaluate(k=>{for(let i=0;i<k;i++)window.__P1850.tick&&window.__P1850.tick(0.1);},n); await sleep(140); };

  let loaded=null;
  for(const s of SHOTS){
    if(loaded!==s.target){
      await page.goto(`http://127.0.0.1:${srv.port}/${s.target}.html`,{waitUntil:"load",timeout:90000});
      await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850;},{timeout:90000});
      loaded=s.target;
    }
    if(s.overlay){
      const hasHook=await page.evaluate(()=>typeof window.__P1850_WBSETOVERLAY==="function");
      if(!hasHook){ console.log("SKIP",s.id,"(no __P1850_WBSETOVERLAY hook)"); continue; }
      await page.evaluate(()=>window.__P1850_WBSETOVERLAY("dryland",true));
    }
    await page.evaluate(iso=>window.__P1850.jump(iso),s.date); await settle(40);
    await page.evaluate(o=>window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,snap:true}),s); await settle(40);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(120);
    const dest=path.join(OUT,`${s.id}.png`);
    console.log(s.target.toUpperCase(),await shoot(page,dest)?"ok":"FAIL",path.basename(dest),"-",s.note);
  }

  await browser.close(); srv.server.close();
})();
