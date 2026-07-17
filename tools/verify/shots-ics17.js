#!/usr/bin/env node
/* ICS-17 screenshots (operator flag, minor polish — clamped-road terminal cap).
   Captures the RELEASE render of the Broadway foot at Clark's Point where the
   built road clamps at the dry-land edge: (a) top closeup, (b) oblique low
   framing (the angle where the ragged stroke butt-end read as a faint hover
   seam near the wharf foot). Run with a tag argument to name the pair:
       node tools/verify/shots-ics17.js before   # pre-fix index.html
       node tools/verify/shots-ics17.js after    # post-fix index.html
   DEV-ONLY. Writes into <APP_ROOT>/screenings/2026-07-17-ics17/. */
"use strict";
const path=require("path"), http=require("http"), fs=require("fs");
const { chromium }=require("playwright");
const ROOT=path.resolve(__dirname,"..","..");
const OUT=path.join(ROOT,"screenings","2026-07-17-ics17");
const TAG=(process.argv[2]||"shot").replace(/[^a-z0-9-]/gi,"");
/* Broadway foot (grid u=300.2) sits at world ~(352.3, -349.5); the wharf deck
   runs seaward to ~(426, -361). Framings centre on the shore junction. */
const SHOTS=[
  { id:`broadway-shore-closeup-${TAG}`, date:"1849-12-20", alt:200, x:358, z:-352,
    note:"top closeup: Broadway clamped at the dry-land edge, wharf foot" },
  { id:`broadway-shore-oblique-${TAG}`, date:"1849-12-20", alt:130, x:358, z:-352, yaw:2.4, pitchOff:0.35,
    note:"oblique low framing: the angle where the ragged end read as a hover seam" }
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

  await page.goto(`http://127.0.0.1:${srv.port}/index.html`,{waitUntil:"load",timeout:90000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850;},{timeout:90000});
  for(const s of SHOTS){
    await page.evaluate(iso=>window.__P1850.jump(iso),s.date); await settle(40);
    await page.evaluate(o=>window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,yaw:o.yaw,pitchOff:o.pitchOff,snap:true}),s); await settle(40);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(120);
    const dest=path.join(OUT,`${s.id}.png`);
    console.log("INDEX",await shoot(page,dest)?"ok":"FAIL",path.basename(dest),"-",s.note);
  }

  await browser.close(); srv.server.close();
})();
