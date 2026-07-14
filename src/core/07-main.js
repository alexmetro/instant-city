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

  /* s79 THE FOUNDATION CUT (foundation-reset.md §2): the render loop calls
     ONLY the substrate's per-frame update entry points. Every removed layer's
     update() call (ships/growth/weather/fire/people/doodads/fauna/effects/
     director/zones-tint/labels-inspect) is gone from this loop; each returns
     here as its layer passes the admission gate (foundation-reset §3-§4).
     Lighting is STATIC NOON now (core/02-scene owns the rig), so no
     updateTimeOfDay/updateDayNight either — the sun does not move until the
     effects layer is admitted. The sim CLOCK still advances (date/timeline
     live); the ground-paint repaint still fires from updateGridSwing() below
     as streets cross their appear/checkpoint days. */
  updateSimClock(dt);
  updateTicker();

  waterUniforms.uTime.value += dt;
  if(foamMesh) foamMesh.material.opacity = 0.42+0.14*Math.sin(waterUniforms.uTime.value*0.5);
  // TIDE (shoreline truth): the water plane rides a cheap sin of simDay,
  // sweeping the waterline across the baked intertidal mud band.
  bayWater.position.y = TIDE.amp * Math.sin(simDay/TIDE.periodDays * Math.PI*2);
  if(foamMesh) foamMesh.position.y = bayWater.position.y*0.5;

  // Follow mode targets (followedSlot/followedDocumented) are foundation
  // stubs (null) until labels-inspect is admitted — the block is inert now.
  if(followedSlot){
    CAM.focusT = new THREE.Vector3(followedSlot._x, groundHeight(followedSlot._x,followedSlot._z)+1.4, followedSlot._z);
  } else if(followedDocumented){
    CAM.focusT = new THREE.Vector3(followedDocumented.x, groundHeight(followedDocumented.x,followedDocumented.z)+1.4, followedDocumented.z);
  }

  applyKeyboardNav(dt);
  var alt = applyCameraRig(dt);
  lastKnownAlt = alt;
  updateHud(alt);
  updateGridSwing(); // refreshes CURRENT_STREET_SKEW + repaints the ground-paint splat as streets appear/upgrade by simDay
  updatePaper();
  updateHorizonRing(alt);
  updatePulse(dt);

  renderer.render(scene, camera);
}
animate();

})();
