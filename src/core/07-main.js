/* =====================================================================
   core/07-main — the render loop. Calls each layer's update entry points in draw order; module epilogue.
   GREAT SPLIT (layers-spec.md): this file holds 1 chunk(s) of the one app module.
   tools/build-app.js reassembles every chunk from every file in global CHUNK order (the number
   after @P1850-CHUNK) — original module statement order, byte-stable. Edit code freely inside a
   chunk; never reorder or renumber chunk markers without rebuilding + re-verifying.
   ===================================================================== */
/* @P1850-CHUNK 74 — render loop + IIFE close */
/* =====================================================================
   RENDER LOOP
   ===================================================================== */
var clock = new THREE.Clock();
document.getElementById("hud-loading").style.display = "none";
console.log("[verify] terrain-1846.js loaded:", TERRAIN.nx+"x"+TERRAIN.nz, "grid, x "+Math.round(WORLD.x0)+".."+Math.round(WORLD.xMax)+", z "+Math.round(WORLD.z0)+".."+Math.round(WORLD.zMax)+"m (peninsula domain). Village pad Y="+VILLAGE_Y.toFixed(2)+"m. Any [verify] warnings above indicate a building/street below the land threshold.");

function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);

  // The sim clock drives ships/growth/weather AND (fix sprint 2026-07-11,
  // superseding spec §13's "own real-time cycle") the day/night lighting —
  // see the SUN FROM THE SIM CLOCK compression policy at updateTimeOfDay().
  updateSimClock(dt);
  updateWeather();
  updateWetTint();
  updateShips(dt);
  updateWharfGrowth();
  updateGrowth();
  updateWaterfrontLife();
  updateLevelingSite();
  updateTicker();
  updateEraGating();   // fix, 2026-07-10 — bury/reveal era-gated landmarks by simDay, before fire touches the same slices
  updateFire(dt);      // PHASE 5 — the Dec 24 1849 Great Fire + aftermath/rebuild
  updateLaundryDay(simDay); // PL-B item 4 — laundry lines only carry wash on the (fill:true) weekly wash day

  updateTimeOfDay(dt); // SUN FROM THE SIM CLOCK — timeOfDay derives from simDay (compression policy above)
  updateDayNight();

  waterUniforms.uTime.value += dt;
  if(foamMesh) foamMesh.material.opacity = 0.42+0.14*Math.sin(waterUniforms.uTime.value*0.5);
  // TIDE (shoreline truth, 2026-07-11; amplitude fill:true — SF bay
  // semidiurnal, half-range approximated): the water plane rides a cheap
  // sin of simDay, sweeping the waterline back and forth across the baked
  // intertidal mud band (the bake's tidal profile spans +0.45..-0.5 over
  // the first ~70m offshore), so the flats read as flats: mud at low
  // water, the beached storeships afloat at high water.
  bayWater.position.y = TIDE.amp * Math.sin(simDay/TIDE.periodDays * Math.PI*2);
  if(foamMesh) foamMesh.position.y = bayWater.position.y*0.5; // foam tracks the moving edge halfway (cheap)

  // PHASE 4 — Follow mode: lock the rig's target onto the followed person
  // each frame (positions were refreshed by last frame's updatePeople());
  // the Annals chase rig (applyCameraRig below) does the rest, same as flyTo().
  if(followedSlot){
    CAM.focusT = new THREE.Vector3(followedSlot._x, groundHeight(followedSlot._x,followedSlot._z)+1.4, followedSlot._z);
  } else if(followedDocumented){
    CAM.focusT = new THREE.Vector3(followedDocumented.x, groundHeight(followedDocumented.x,followedDocumented.z)+1.4, followedDocumented.z);
  }

  applyKeyboardNav(dt);
  updateDirector(dt);  // PHASE 5 — auto-director (drives CAM.*T in Watch mode)
  var alt = applyCameraRig(dt);
  lastKnownAlt = alt;
  updateHud(alt);
  updateGroundScatter(alt);
  updateMicroScatter(alt); // GROUND MATERIALITY (s52) — camera-centered litter ring (replaces the retired A1 ripple film)
  updateDoodads(alt);      // PAINTERLY GROUND KIT (s60) — zone/town-keyed doodad ring
  updateFarScatter(alt);
  updatePeople(dt, camera.position.x, camera.position.z, alt);
  updateArrivals();
  updateFauna(dt);   // TECHNIQUES §10 — hogs / gulls / hitched horses / quail + reconciler tranche: cattle / dogs / rats / cats / pelicans / herons / mud-winter props (era- and verdict-gated)
  updateWharfBoats(waterUniforms.uTime.value); // TECHNIQUES §4.3 — moored craft bobbing at the wharf head
  updateSmoke(dt);
  updateDistrictZones(alt);
  updateBuildingLabels(alt);
  updateLocPoints(alt);   // s42 §11: key-location glyph+name tier (plaza / Central Wharf / Mission)
  updateBizGlyphs(alt);
  updateGridSwing(); // refreshes CURRENT_STREET_SKEW before updateStreetLabels() reads it, so labels never lag a frame behind the street paint
  updateStreetLabels(alt);
  updateLabels(alt);      // s42: regions/waterways moved BEFORE the declutter pass (they used to run after render, invisible to it)
  applyLabelDeclutter(performance.now()); // must run after every per-type label/glyph/ship update above
  updateSelectionRing();  // s42 §11: selection highlight tracks the selected entity per frame
  updateHoverRing(performance.now()); // s44: pointer-hover ring on people
  updateRain(dt, camera.position.x, camera.position.z, alt);
  updateFogBanks(dt);
  updatePaper();
  updateHorizonRing(alt);
  updatePulse(dt);

  var ghostT = ghostVisible ? smoothstep(CFG.ghostFadeEnd, CFG.ghostFadeStart, alt) : 0;
  ghostGroup.userData.mats.forEach(function(m){ m.opacity = ghostT*0.9; });
  ghostGroup.visible = ghostT>0.003;

  renderer.render(scene, camera);
}
animate();

})();
