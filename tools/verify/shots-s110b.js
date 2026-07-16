#!/usr/bin/env node
/* s110b before/after screenshots (terrain-edge-grounding-spec Phase 2a). Serves
   a build root, captures the RELEASE render (index.html) at the north waterfront
   + the SoMa/Mission-Bay edge on the two canonical dates — proving the BUILT
   roads now stop at the shore instead of floating over the cove — and (when the
   atelier overlay hook is present) a companion atelier frame with the survey
   spine + plat lots armed, proving the PLAT still draws over the water as the
   plan. DEV-ONLY. Usage: node shots-s110b.js --root <dir> --tag before|after.
   Writes into <APP_ROOT>/screenings/2026-07-16-s110b/. */
"use strict";
const path=require("path"), http=require("http"), fs=require("fs");
const { chromium }=require("playwright");

const args=process.argv.slice(2);
const flag=(n,d)=>{ const i=args.indexOf(n); return i>=0?(args[i+1]||d):d; };
const ROOT=path.resolve(flag("--root", path.resolve(__dirname,"..","..")));
const TAG=flag("--tag","after");
const OUT=path.join(path.resolve(__dirname,"..",".."),"screenings","2026-07-16-s110b");

const FRAMINGS=[
  { id:"north-waterfront", alt:470,  x:210, z:-140, note:"north cove — Jackson/Washington/Clay/Broadway/Sansome/Battery/Front meet the shore" },
  { id:"broadway-foot",    alt:320,  x:170, z:-300, note:"Broadway's built road clamped at the foot (the wharf deck is a later pass)" },
  { id:"soma-mission-bay", alt:1150, x:540, z:1520, note:"SoMa / Mission Bay — the numbered streets over the water" }
];
const DATES=["1849-12-20","1848-04-01"];
const PLAT_OVERLAYS=["spine","lots","row"];   // the survey plat: ground-plan spine + plat lots + ROW survey

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

  // 1) RELEASE render (index.html) — the built roads
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`,{waitUntil:"load",timeout:90000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850;},{timeout:90000});
  for(const d of DATES) for(const f of FRAMINGS){
    await page.evaluate(iso=>window.__P1850.jump(iso),d); await settle(40);
    await page.evaluate(o=>window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,snap:true}),f); await settle(40);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(120);
    const dest=path.join(OUT,`${TAG}-${f.id}-${d}.png`);
    console.log("RELEASE",await shoot(page,dest)?"ok":"FAIL",path.basename(dest));
  }

  // 2) ATELIER with the survey PLAT overlays armed (spine + plat lots + ROW) —
  //    proof the plat still draws over the water (only when the hook exists).
  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`,{waitUntil:"load",timeout:90000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850;},{timeout:90000});
  const hasHook=await page.evaluate(()=>typeof window.__P1850_WBSETOVERLAY==="function");
  if(hasHook){
    await page.evaluate(keys=>keys.forEach(k=>window.__P1850_WBSETOVERLAY(k,true)),PLAT_OVERLAYS);
    for(const d of DATES) for(const f of FRAMINGS){
      await page.evaluate(iso=>window.__P1850.jump(iso),d); await settle(40);
      await page.evaluate(o=>window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,snap:true}),f); await settle(40);
      await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(120);
      const dest=path.join(OUT,`${TAG}-plat-${f.id}-${d}.png`);
      console.log("PLAT   ",await shoot(page,dest)?"ok":"FAIL",path.basename(dest));
    }
  } else console.log("PLAT    skipped (no __P1850_WBSETOVERLAY hook in this build)");

  await browser.close(); srv.server.close();
})();
