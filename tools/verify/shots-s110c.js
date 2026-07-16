#!/usr/bin/env node
/* s110c screenshots (terrain-edge-grounding-spec Phase 2b). Captures the RELEASE
   render of a coastal street (Montgomery/Clay) at 1849-12-20 — the built roads
   clamped at the shore, no plunge/float, the safety valve dormant under the clamp
   — plus the ATELIER dry-land overlay (raw red vs grade-eased clamped green +
   magenta too-steep segments) at the same coastal framing and at Presidio Road's
   steep segment, showing the grade-ease collapsed the coarse-bake spikes.
   DEV-ONLY. Writes into <APP_ROOT>/screenings/2026-07-16-s110c/. */
"use strict";
const path=require("path"), http=require("http"), fs=require("fs");
const { chromium }=require("playwright");
const ROOT=path.resolve(__dirname,"..","..");
const OUT=path.join(ROOT,"screenings","2026-07-16-s110c");
const DATE="1849-12-20";
const FRAMINGS=[
  { id:"coastal-montgomery-clay", alt:360, x:120, z:70,   note:"Montgomery/Clay meet the shore — clamped, no plunge/float; valve dormant under the clamp" },
  { id:"presidio-road-steep",     alt:520, x:-2250, z:-1243, note:"Presidio Road's steep segment (was 48.9%) — grade-eased" }
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

  // RELEASE render — the built roads on terrain
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`,{waitUntil:"load",timeout:90000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850;},{timeout:90000});
  for(const f of FRAMINGS){
    await page.evaluate(iso=>window.__P1850.jump(iso),DATE); await settle(40);
    await page.evaluate(o=>window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,snap:true}),f); await settle(40);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(120);
    const dest=path.join(OUT,`release-${f.id}-${DATE}.png`);
    console.log("RELEASE",await shoot(page,dest)?"ok":"FAIL",path.basename(dest));
  }

  // ATELIER with the dry-land / grade overlay armed (green = grade-eased clamp, magenta = too-steep)
  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`,{waitUntil:"load",timeout:90000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850;},{timeout:90000});
  const hasHook=await page.evaluate(()=>typeof window.__P1850_WBSETOVERLAY==="function");
  if(hasHook){
    await page.evaluate(()=>window.__P1850_WBSETOVERLAY("dryland",true));
    for(const f of FRAMINGS){
      await page.evaluate(iso=>window.__P1850.jump(iso),DATE); await settle(40);
      await page.evaluate(o=>window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,snap:true}),f); await settle(40);
      await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(120);
      const dest=path.join(OUT,`atelier-dryland-${f.id}-${DATE}.png`);
      console.log("ATELIER",await shoot(page,dest)?"ok":"FAIL",path.basename(dest));
    }
  } else console.log("ATELIER skipped (no __P1850_WBSETOVERLAY hook)");

  await browser.close(); srv.server.close();
})();
