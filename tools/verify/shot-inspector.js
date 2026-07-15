/* one-off s101 evidence capture: drives the atelier coordinate timeline
   inspector and screenshots the panel + scene. Not part of the gate; safe to
   delete. Run: node tools/verify/shot-inspector.js  (server on :8099). */
"use strict";
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "report", "shots");
const URL = "http://127.0.0.1:8099/atelier.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newContext ? null : await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const v = document.getElementById("hud-loading");
    const gone = v && getComputedStyle(v).display === "none";
    return gone && window.__P1850 && typeof window.__P1850.audits === "object";
  }, { timeout: 45000 });
  const settle = async (n = 40) => { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.15); }, n); await sleep(150); };

  const PT = { x: -26, z: -42 };

  // arm the inspector, set the date, frame the point obliquely
  await page.evaluate((pt) => {
    window.__P1850.jump("1849-09-15");
    const btns = [].slice.call(document.querySelectorAll("#wb-panel .wb-btn"));
    const tl = btns.find((b) => b.textContent.indexOf("timeline") === 0);
    if (tl && tl.textContent.indexOf("OFF") >= 0) tl.click();
    window.__P1850.camSet({ x: pt.x, z: pt.z, alt: 210, tT: 0.5, pitchOff: 0.18, yaw: 0.62, snap: true });
    window.dispatchEvent(new Event("resize"));
  }, PT);
  await settle(60);
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());

  // click the point through the real canvas handler
  const sc = await page.evaluate((pt) => window.__P1850.toScreen(pt.x, pt.z), PT);
  await page.mouse.click(sc.x, sc.y);
  await settle(20);
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());

  const tlText = await page.evaluate(() => document.querySelectorAll(".wb-probe-out")[0].innerText);
  console.log("TIMELINE PANEL:\n" + tlText);

  // scroll the panel so the TEMPORAL DEBUG-VIZ section + timeline output is in view
  const scrollToTimeline = () => page.evaluate(() => {
    const secs = [].slice.call(document.querySelectorAll("#wb-panel .wb-sec"));
    const sec = secs.find((s) => s.textContent.indexOf("TEMPORAL DEBUG-VIZ") === 0);
    if (sec) document.getElementById("wb-panel").scrollTop = sec.offsetTop - 8;
  });
  await scrollToTimeline();

  await page.screenshot({ path: path.join(OUT, "s101-inspector-dennisons.png") });
  console.log("saved s101-inspector-dennisons.png");

  // a second capture: the Custom House plaza-block point (single-span, pre-window state)
  await page.evaluate(() => {
    window.__P1850.camSet({ x: -160.15, z: 52.97, alt: 210, tT: 0.5, pitchOff: 0.18, yaw: 0.62, snap: true });
    window.dispatchEvent(new Event("resize"));
  });
  await settle(50);
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());
  const sc2 = await page.evaluate(() => window.__P1850.toScreen(-160.15, 52.97));
  await page.mouse.click(sc2.x, sc2.y);
  await settle(20);
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());
  console.log("PLAZA PANEL:\n" + await page.evaluate(() => document.querySelectorAll(".wb-probe-out")[0].innerText));
  await scrollToTimeline();
  await page.screenshot({ path: path.join(OUT, "s101-inspector-plaza-customhouse.png") });
  console.log("saved s101-inspector-plaza-customhouse.png");

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
