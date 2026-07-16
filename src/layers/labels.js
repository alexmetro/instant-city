/* =====================================================================
   LAYER labels (NEW, s90 THE LABELS BATCH — foundation admission, labels-
   inspect pulled forward + restructured per foundation-reset manifest row).
   OWNS: every world LABEL — lot ground-text, street names, zone/landmark
   names — as CANVAS-TEXTURE TEXT ON THREE GEOMETRY (never DOM, never chip/
   box plates; grounding §11 floating haloed text is the law). Three text
   surfaces, one per category geometry:
     (a) LOT  — a flat, ground-oriented plane at the lot's polylabel pole:
                the record lot NUMBER, owner name fading in below at close zoom.
     (b) STREET — a flat, ground-oriented plane oriented ALONG the street line,
                  §11 small-caps voice, era-gated to existence + era-correct name.
     (c) ZONE/LANDMARK — a camera-facing SPRITE at the polygon's polylabel pole
                  (hills, waterways in blue italic, ocean/bay, the plaza civic
                  voice, Mission Dolores, Presidio, Happy Valley).
   READS: cadastre (blocksAt / lotWorldQuad / GROUND_PARCELS / parcelByName),
   STREETS_RUNTIME + window.STREETS_GEOMETRY (eraNames), terrainHeight/TERRAIN,
   WORLD, PLAZA_CENTER, camera/renderer/scene, lastKnownAlt, simDay,
   GRID_ROT_BASE + gridToWorldAt, and the VENDORED rbush (declutter) + polylabel
   (anchors). NEVER: moves a centerline / lot / parcel (all geometry is read),
   paints ground (that is ground-paint), places objects.

   THE HAND-ROLL (foundation-reset §4b sanction): the text RENDERER is hand-
   rolled — the s89 admission review found NO importable candidate survives the
   §4b single-file/no-asset constraints for FLAT ground-oriented world text
   (troika-three-text cannot vendor single-file; three-spritetext billboards
   fail the flat ground-text acceptance). So text is rasterized to a canvas at
   supersampled resolution (crisp at the world-size band) with a stroke HALO
   (§11 no plates) and mapped onto Three geometry here. The two GEOMETRY/GIS
   solved-problems this layer needs — polygon pole-of-inaccessibility (anchors)
   and screen-box collision indexing (declutter) — are VENDORED (polylabel,
   rbush), never hand-rolled, per §4b.

   ICS-11 (label clarity pass, operator backlog): [1] band selection in DEVICE
   px (× devicePixelRatio, 768 band added) so HiDPI stays crisp; [2] declutter
   upgraded to TRUE projected screen quads (rbush broad phase + separating-axis
   narrow phase, (prio,seq) deterministic order) — diagonal strips no longer
   pile up; [3] word wrap for long owner/civic names (style.wrap, balanced
   centered lines; streets stay one line along the road); [4] outer glow lifted
   0.66→0.74 for dark-background separation. Audits: declutter + wrap join
   crispness/contrast/eraNames/anchorsInside.

   ICS-13 (POI category symbols, operator backlog): a fourth sublayer
   "symbols" — camera-facing map-pin markers hovering over every NAMED place
   (landmark reservations + the plaza), categorized businesses/residences/
   parks/other from the registry's business kinds, Google-Maps palette,
   date-aware with reservationsAt(day), joining the true-quad declutter at
   prio 33 (below streets, above the flat landmark/lot text). Audit:
   poiSymbols (mapping coverage + built-vs-recomputed set fidelity).

   ICS-14 (Maps-style pass, operator feedback on ics13 with Google-Maps
   reference shots): [1] POI markers redrawn as the MODERN Maps emblem — a
   flat colored circle badge with a thin white ring and a tiny pointed tail
   (not the classic teardrop pin); same palette/cache/declutter/date wiring.
   [2] STREET LABELS ONLY switch to ROBOTO (the Maps face) — classic
   Apache-2.0 Roboto v2.138 Medium+Bold, SUBSET to the street charset and
   embedded base64-WOFF2 via the FontFace API (single-file law kept: the
   font ships inside this file; load-before-raster handled by a one-time
   re-raster when the faces resolve). Mixed-case names, Maps-style casing.
   Ink/casing chosen by MEASUREMENT on OUR palette (operator correction:
   Maps grey ink assumes Maps' near-white streets; ours are dark dirt) —
   WHITE ink + dark-grey casing + the layer's light outer glow clears the
   contrast gate on every background family (see the contrast audit's
   street per-background table). [3] zoom-dependent WEIGHT STEP (Maps close
   zoom = bold): Roboto Bold above LBL_STREET_BOLD_PX on-screen px, Medium
   below, swapped on camera-settle like the resolution bands (never per
   frame). [4] ALTITUDE LOD: street text size is CAPPED far out (growMax 2
   vs the global 6 — far names stay small/discreet like Maps), and street
   classes disappear progressively with altitude (lanes first, then cross
   streets, mains persist; LBL_STREET_LOD). Zones/landmarks (small-caps,
   letter-spaced) persist at altitude with a cooler neutral ink; era fonts
   for lots/zones/civic voices unchanged. Audits: contrast now measures
   each style's OWN inner ring (street casing included) + reports the
   street per-background table; crispness mirrors the street growth cap
   and the band ladder gains 16/24 px rungs for the small far labels.

   ICS-14c (landmark/business legibility, operator screenshots: "HOOD &
   WILSON" / "MERCHANTS' EXCHANGE" / "STARKEY, JANION & CO." barely readable
   — faint parchment-gold washes out on sand ground and grey placeholder
   roofs). ROOT CAUSE (measured): the contrast audit scored the halo SYSTEM
   (ring separation + ink-vs-ring) — gold #f0d79a passed at 4.3 — but at
   glance sizes the casing is a thin outline and the INK BODY must itself
   clear the host surface: gold ink vs its actual hosts measures 1.30–2.74,
   and the roof greys these labels actually sit over were not in the audit
   palette at all. FIX per the host-surface polarity rule: the civic/landmark
   voice + BOTH lot voices (numerals + owner) flip to the measured dark-ink
   pairing — LBL_LANDMARK_INK #332e26 warm sepia-black ink + the light
   parchment casing, ink + casing ONLY (the ics14b no-glow law stands; the
   lot voices lose their s92 light glow here too — no glow anywhere but
   water). #332e26 was chosen by measurement: ink-vs-host ≥3.48 on every
   land+roof background (the district #453f35 measures 2.69 on rocky —
   below gate — and white street ink measures 1.83 on the light civic roof
   tint, so neither existing pairing serves; era letterforms/caps/wrap
   untouched). Audit strengthened to measure the actual property: [1] the
   ROOF GREY family (placeholder body 0x9ea19c / flat cap 0x868984 / civic
   tint 0xb7c1c7) joins the background palette; [2] host families are now
   SETS — civic + lot voices are hosted on land AND roofs; [3] GLANCE voices
   (street/civic/lotNum/lotOwn — small on-screen, read-at-a-glance names)
   additionally gate raw INK-vs-HOST-background ≥3.0 as a MIN component
   (the no-glow max() let a casing hide an invisible ink body; fails before:
   gold civic 1.30 on roofLight; passes after: 3.48). civic joins the
   reported per-background decision tables.

   ICS-14d (OPERATOR DIRECTIVE 2026-07-16, final authority, supersedes every
   prior per-voice ink/face choice): the street voice (Roboto, white ink
   #ffffff, dark-grey casing rgba(40,44,48,0.94), no glow) is "perfect"; the
   ics14c dark-sepia landmark/business names are STILL effectively illegible
   at real sizes, and the serif era voices are not working. EVERY TEXT VOICE
   now takes the EXACT street treatment — embedded Roboto (Medium/Bold),
   white ink + dark casing, glow:false — landmark/business/reservation
   names, lot owner names, lot numerals, district/hill/zone caps, civic,
   water (water keeps a light BLUE TINT of the ink, #b9dcef — measured, it
   still clears every gate). Caps-vs-mixed-case kept per voice; wrapping/
   declutter/LOD/orientation untouched; era serif polish deferred to a later
   sprint (sets b/c now alias the same Roboto voices — the era faces live in
   git history). Legibility at a glance is the only goal. The Roboto subset
   is RE-CUT to add ( ) — reservation names like "Robert A. Parker's Store
   (Adobe House)" render parens (74-char charset, see the embed block). The
   contrast audit is REWRITTEN to the Maps satellite model for every voice
   (ink-vs-casing + rim/ink carrier per background; see AUDIT 3 docs).

   ACCEPTANCE (verbatim law): a label must be attributable to its subject at a
   glance, without clicking, even with all overlays enabled. §11 zoom-band
   choreography: regions own altitude and FADE on descent; streets then lots
   fade in at their bands; cross-fades never pop (per-frame opacity easing);
   priority declutter via rbush screen boxes; the world-news horizon bar is a
   reserved screen rect labels never collide with.
   GREAT SPLIT: this file holds 1 chunk (build-app.js FILES).
   ===================================================================== */
/* @P1850-CHUNK 40 — LABELS layer (lot ground-text · street names · zones & landmarks) */

/* ---- RELEASE DEFAULT (flagged for user sign-off): labels ON in index.html,
   matching legacy behavior. One named constant governs the release-boot state
   of the parent layer AND all three sublayers; the atelier's checkbox family
   overrides at runtime (dev only). Flip to false to ship with labels off. ---- */
var LABELS_ON_AT_RELEASE = true;

/* sublayer visibility state (parent + three sublayers). The atelier writes
   these via labelsSetSublayer(); release boots from the constant above. */
var LABELS_VIS = {
  parent:  LABELS_ON_AT_RELEASE,
  lots:    LABELS_ON_AT_RELEASE,
  streets: LABELS_ON_AT_RELEASE,
  zones:   LABELS_ON_AT_RELEASE,
  symbols: LABELS_ON_AT_RELEASE   // ics13 POI symbols — release default ON (operator-requested map feature)
};

/* ---- §11 CATEGORY VOICES. One grammar so a reader never confuses types:
   waterways = blue italic serif · streets = small-caps · zones/landmarks =
   spaced caps softer sepia · regions = large faint caps · civic (plaza) = a
   warm civic accent · lots = ink numerals + owner.

   s92 DUAL-HALO (user finding #1 — "same background fill color, very hard to
   read"). §11's "halo that survives ANY background" made real: every glyph gets
   a DARK INNER stroke (separates light/gold text from the bright amber ground —
   the common case) PLUS a LIGHT OUTER glow (separates the dark inner ring from
   the scene's brown road-paint + hillshade shadows — where a dark-only halo
   vanishes). One ring or the other always carries ≥3:1 against whatever the
   label lands on; the labels.contrast audit proves this against the earth
   palette. Applied to ALL categories via labelTexture. ---- */
var LBL_HALO_DARK  = "rgba(12,14,17,0.90)";     // inner ring — beats the bright sunlit ground
var LBL_HALO_LIGHT = "rgba(250,247,236,0.74)";  // outer glow — beats road-paint + shadow + deep water (ics11: 0.66→0.74 lifts the dark-background ring separation; the contrast audit reports the worst case)
var LBL_GLOW_EXTRA = 2.4;                       // outer glow half-width beyond the dark ring (px @ LBL_FONT_PX)
/* ics14b (operator, live-build screenshot): at oblique/grazing camera angles the
   soft outer-glow pass SMEARS into a fog ring around the casing and street
   names become hard to read — Maps labels are ink + thin casing ONLY, no glow.
   A style with glow:false skips the outer-glow pass entirely (ink + casing
   only); the contrast audit scores those styles on the Maps model — the casing
   separates the label on backgrounds opposite its polarity, and the INK itself
   carries the edge on backgrounds that match the casing (white-on-dark road is
   exactly Maps satellite mode). Applied to street + district caps + the
   civic/landmark name voice; water + lot voices keep the standing dual halo. */

/* ---- s93 item 4 — TYPOGRAPHY OPTION SETS (no unilateral change; the user
   picks). THREE complete style tables selected by ONE constant; the atelier /
   verify harness can flip it to screenshot a/b/c side by side. DEFAULT IS 'a'
   (the current s92 look) — this sprint ships NO type change. SINGLE-FILE LAW:
   system/web-safe font STACKS only, zero font ASSET FILES. ICS-14 amendment
   (operator override): STREET labels use ROBOTO, embedded INSIDE this file as
   a base64-WOFF2 subset (still single-file — nothing fetched); every other
   voice keeps its era stack. The street entry is therefore IDENTICAL across
   the three sets (the operator's Maps-style street voice overrides the era
   voice regardless of the chosen era set). Documented stacks:
     a CURRENT   — Georgia (the shipped serif); the s92 dual-halo voices as-is.
     b CARTO     — Palatino Linotype / Book Antiqua / Palatino: a warmer old-
                   style serif with open counters + generous tracking, the feel
                   of an engraved 19th-C survey plate. Streets small-caps,
                   waterways italic (period-map convention).
     c ENGRAVED  — Didot / Bodoni MT (high-contrast didone) with TIGHTER
                   tracking + THINNER weights + brighter ink and a stronger dark
                   ring: the fine copperplate-engraving look. Falls back to the
                   Times/Georgia serif where the didone is absent.
   Every set keeps the SAME dual-halo colours (the contrast audit is halo-based
   and set-independent) unless a set deliberately raises ink/ring for contrast. */

/* ---- ICS-14 STREET VOICE (operator, from Google-Maps reference shots).
   Roboto mixed-case, Maps typographic character — but the INK/CASING pair is
   chosen by MEASUREMENT on OUR surfaces, not copied from Maps: Maps' grey ink
   assumes near-white streets; our streets are dark dirt-brown paint (road
   0x6b5838), crossed by bright sand (0xb7a06f), green scrub/hills and water.
   WHITE ink inside a Maps dark-grey CASING is the pair that clears the 3:1
   gate on EVERY background family: on dark dirt the WHITE INK itself separates
   (Maps satellite mode — white on dark needs no ring), on bright sand the
   dark casing does, and the white-on-dark-grey ink/casing contrast is ~13:1
   everywhere — this is also exactly Maps' own CLOSE-ZOOM street treatment
   (bold white fill, dark-grey border), so one pairing serves both zoom bands
   and only the WEIGHT steps (Bold near, Medium far; see LBL_STREET_BOLD_PX).
   ics14b: glow:false — NO outer glow (the s92 light glow smeared into a fog
   ring at grazing angles; Maps streets are ink + casing only).
   The contrast audit prints the measured per-background table. */
var LBL_STREET_FAMILY = "Roboto, 'Segoe UI', Arial, sans-serif";
var LBL_STREET_INK    = "#ffffff";                 // Maps satellite-mode street fill (white at every zoom)
var LBL_STREET_CASE   = "rgba(40,44,48,0.94)";     // Maps dark-grey casing (#282c30 family)
/* ICS-14d (OPERATOR DIRECTIVE 2026-07-16 — final authority, supersedes the
   ics14 host-surface polarity inks and the ics14c measured dark landmark
   ink): EVERY text voice takes the EXACT street treatment — embedded Roboto,
   WHITE ink #ffffff + Maps dark-grey casing rgba(40,44,48,0.94), halo 4,
   glow:false. The one sanctioned variation: WATER keeps a light BLUE TINT
   of the ink (#b9dcef) — measured, it clears every audit gate (worst
   carrier 3.47 on rocky, via the casing rim; ink-vs-casing ≥6.8 on every
   background), so water still reads as water. italic is OFF everywhere:
   only upright Roboto 500/700 are embedded, and canvas font-matching would
   silently substitute the fallback stack for an italic request. Caps vs
   mixed-case kept per voice; era serif faces (Georgia/Palatino/Didot sets)
   are SUSPENDED by the override — era polish comes later; git history
   preserves the tables. Civic letter-spacing steps 0.24→0.06: at glance
   sizes the wide engraved tracking pulled cap glyphs apart faster than the
   eye groups them (legibility is the only goal this pass). */
var LBL_WATER_INK = "#b9dcef";   // light blue tint of the white ink (water voice only; measured, see contrast audit)
var LBL_STREET_BOLD_PX = 44;   // on-screen CSS px (apparent size, NOT device px): at/above → Roboto 700, below → 500. ~44px ⇒ bold kicks in under ~220 m altitude (plaza framings), town/overview stay Medium.
function _lblStreetStyle(setKey){
  return { key:setKey+".street", family:LBL_STREET_FAMILY, weight:"500", weightNear:"700", weightNearPx:LBL_STREET_BOLD_PX,
           color:LBL_STREET_INK, haloColor:LBL_STREET_CASE, halo:4, glow:false, letterSpacing:0.03, smallCaps:false, italic:false };
}
/* voice builder — the street treatment with per-voice weight/tracking/caps/
   wrap. Every voice: Roboto, white ink (water: blue tint), dark casing,
   halo 4, no glow, upright. */
function _lblVoice(key, o){
  var st = { key:key, family:LBL_STREET_FAMILY, weight:(o.weight||"500"),
             color:(o.color||LBL_STREET_INK), haloColor:LBL_STREET_CASE, halo:4, glow:false,
             letterSpacing:(o.letterSpacing!=null?o.letterSpacing:0.03),
             smallCaps:!!o.smallCaps, italic:false };
  if(o.wrap) st.wrap = o.wrap;
  return st;
}
function _lblRobotoVoices(setKey){
  return {
    region:  _lblVoice(setKey+".region", { weight:"500", letterSpacing:0.34, smallCaps:true }),
    hill:    _lblVoice(setKey+".hill",   { weight:"500", letterSpacing:0.30, smallCaps:true }),
    water:   _lblVoice(setKey+".water",  { weight:"500", letterSpacing:0.18, color:LBL_WATER_INK }),
    place:   _lblVoice(setKey+".place",  { weight:"500", letterSpacing:0.26, smallCaps:true }),
    civic:   _lblVoice(setKey+".civic",  { weight:"700", letterSpacing:0.06, smallCaps:true, wrap:8 }),
    street:  _lblStreetStyle(setKey),
    lotNum:  _lblVoice(setKey+".lotNum", { weight:"700", letterSpacing:0.02 }),
    lotOwn:  _lblVoice(setKey+".lotOwn", { weight:"500", letterSpacing:0.04, wrap:8 })
  };
}
/* ics14d: sets b/c ALIAS the same Roboto voices while the era override
   stands (the type-set knob + labelsSetTypeSet API keep working; distinct
   keys per set keep the texture cache namespaced as before). */
var LBL_STYLE_SETS = { a:_lblRobotoVoices("a"), b:_lblRobotoVoices("b"), c:_lblRobotoVoices("c") };
/* THE ONE KNOB. 'a' = current shipped look (default; unchanged this sprint).
   Atelier/harness override: window.LABEL_TYPE_SET = 'b'|'c' before boot, or set
   labelsSetTypeSet('b') at runtime (rebuilds the label set with the new voices). */
var LABEL_TYPE_SET = (typeof window!=="undefined" && window.LABEL_TYPE_SET && LBL_STYLE_SETS[window.LABEL_TYPE_SET]) ? window.LABEL_TYPE_SET : "a";
var LBL_STYLE = LBL_STYLE_SETS[LABEL_TYPE_SET];

/* ---- THE HAND-ROLLED TEXT TEXTURE RENDERER. Rasterize `text` in `style` to a
   supersampled canvas with a stroke halo (no plate), cache by style+text so a
   rebuild across date scrubs re-uses the bitmap. Returns { tex, aspect }. ---- */
var LBL_FONT_PX = 60;        // layout font height (CSS px) — the on-screen size is set by geometry/sprite scale
var _lblTexCache = {};
var _lblMeasureCtx = document.createElement("canvas").getContext("2d");
function _lblFontStr(style, px){ return (style.italic?"italic ":"") + style.weight + " " + px + "px " + style.family; }
function _lblAdvances(disp, style){
  _lblMeasureCtx.font = _lblFontStr(style, LBL_FONT_PX);
  var ls = style.letterSpacing * LBL_FONT_PX, adv = [], total = 0;
  for(var i=0;i<disp.length;i++){ var w = _lblMeasureCtx.measureText(disp[i]).width; adv.push(w); total += w + (i<disp.length-1?ls:0); }
  return { adv:adv, total:total, ls:ls };
}

/* ---- ICS-14 ROBOTO EMBED (ics14d: EVERY voice — the operator's uniform
   street treatment; ics14e: the SAME faces now also carry the DOM HUD
   chrome — title/clock/masthead/ticker/altitude/timeline etc. reference
   font-family 'Roboto' in shell.html CSS and resolve to these FontFaces
   via document.fonts, zero duplicated bytes). Classic Apache-2.0 Roboto
   v2.138 (googlefonts/roboto release), Medium (500) + Bold (700), SUBSET
   with fonttools/pyftsubset. ics14e RE-CUT to the 108-char HUD+label
   charset: full printable ASCII U+0020-007E (the HUD renders arbitrary
   corpus text — ticker/beat-card headlines carry : ; ! ? " [ ] $ etc.)
   plus ° É × æ é – — ‘ ’ “ ” … and · (the title's "SAN FRANCISCO · 1846",
   the speed pill's 2×, curly quotes on beat-card quotes). The extras were
   derived by scanning the actual dynamic strings (events-1846-49.js
   headline/kicker fields + feed WORLD_KNOWN headlines) + every static
   shell.html HUD string; a superset of the ics14d label charset, so
   canvas label rasters are unchanged. WOFF2: 6,220 + 6,232 bytes
   (≈16.6 KB as base64, was ≈9.8 KB) — the whole face still ships inside
   this file, single-file law intact.
   LOAD-BEFORE-RASTER: canvas 2D SILENTLY substitutes the fallback family when
   a FontFace has not finished loading — so the first rebuild may raster
   labels with the fallback stack. When both faces resolve (data: URI, so
   milliseconds), ALL text entries in the texture cache are purged (ics14d:
   every voice is Roboto now, not just streets) and the label set rebuilt ONCE
   with real Roboto metrics (geometry re-derives its aspect from measureText).
   One-time event, never per-frame; both weights are pre-loaded so later zoom
   weight-steps re-raster from the cache path only. */
var LBL_ROBOTO_MEDIUM_B64 = "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";
var LBL_ROBOTO_BOLD_B64 = "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";
var _lblRobotoReady = false;
(function(){
  if(typeof FontFace==="undefined" || typeof document==="undefined" || !document.fonts){ _lblRobotoReady = true; return; }
  try{
    var med  = new FontFace("Roboto", "url(data:font/woff2;base64," + LBL_ROBOTO_MEDIUM_B64 + ") format('woff2')", { weight:"500" });
    var bold = new FontFace("Roboto", "url(data:font/woff2;base64," + LBL_ROBOTO_BOLD_B64 + ") format('woff2')", { weight:"700" });
    document.fonts.add(med); document.fonts.add(bold);
    Promise.all([med.load(), bold.load()]).then(function(){
      _lblRobotoReady = true;
      // purge any TEXT raster made with the fallback face (ics14d: every
      // voice is Roboto — purge everything except the "poi|…" emblem
      // rasters, which carry no text), then force a full rebuild on the
      // next frame — updateLabels runs before every draw, so no frame ever
      // samples a disposed texture.
      for(var k in _lblTexCache){
        if(_lblTexCache.hasOwnProperty(k) && !/^poi\|/.test(k)){
          var e = _lblTexCache[k];
          _lblTexBytes -= e.cw*e.ch*4*1.34; if(_lblTexBytes<0) _lblTexBytes = 0;
          e.tex.dispose(); delete _lblTexCache[k];
        }
      }
      _lblLastDay = null;   // rebuildLabels() on the next updateLabels
    }).catch(function(err){
      _lblRobotoReady = true;
      if(typeof console!=="undefined" && console.warn) console.warn("[labels] embedded Roboto failed to load — street labels stay on the fallback stack", err);
    });
  }catch(e){ _lblRobotoReady = true; }
})();

/* ---- s93 item 1 — PER-SCALE-BAND RE-RASTERIZATION (user finding #1: text
   blurry at altitude). ROOT CAUSE: s90/s92 rasterized every label ONCE at a
   fixed ~500px master (LBL_SS 3 × the ~166px layout box). A grounded label is
   then shown at whatever on-screen size its geometry/scale gives — ~30-40 px at
   the town/overview framings — so the master is 12-16× the displayed size and
   viewed at a grazing ground angle. That deep, oblique MINIFICATION is exactly
   where trilinear+anisotropic sampling goes soft: the mip level chosen for the
   foreshortened footprint is far coarser than the screen, and the aniso ratio
   blows past the old 8× clamp on the receding axis. FIX: rasterize each label at
   a RESOLUTION BAND chosen from its current on-screen height, targeting ~1 texel
   per screen pixel (texel/screen ratio in [1,2)). Bands are powers of two (the
   canvas text-box height in px); the smallest band ≥ the displayed height wins.
   Re-raster only on camera-settle when a label's band changes (reuses the s92
   yaw-settle throttle) — cached by style+text+BAND so words share bitmaps and a
   band is paid for once. Total texture memory is budgeted + reported (the
   crispness audit + labelsTexBudget()). Plus: anisotropy clamp raised to the
   renderer max (≤16) and mip/min-mag filters kept correct. ---- */
/* ics11 goal 1 (sharpness): band selection is in DEVICE pixels — the on-screen
   CSS-px height is multiplied by devicePixelRatio before picking, so a HiDPI /
   OS-scaled display gets a texture dense enough for its physical pixels (the
   old CSS-px pick undersampled at DPR>1). A 768 band joins the ladder for the
   close-zoom × HiDPI corner. Clamped at 2.5 to bound texture memory. */
var LBL_DPR = Math.min(2.5, (typeof window!=="undefined" && window.devicePixelRatio) || 1);
var LBL_BAND_PX = [16, 24, 48, 96, 192, 384, 768];   // canvas text-box heights (device px); a label picks the smallest ≥ its on-screen device px. ics14: 16/24 rungs added — the street growth cap (LBL_ZF_STREET_MAX) lets far street names shrink to ~11-22 device px, and texel≈screen must hold there too.
var LBL_BAND_DEFAULT = 192;                  // pre-first-settle band (refined on the first settle frame)
var LBL_TEX_BUDGET_MB = 96;                  // eviction ceiling (RGBA + mip tail ≈ ×1.34); LRU-evicts back toward 0.8× this
var _lblAniso = Math.min(16, (renderer.capabilities.getMaxAnisotropy && renderer.capabilities.getMaxAnisotropy()) || 1);
var _lblTexBytes = 0;                        // running estimate of live canvas-texture bytes
var _lblTexClock = 0;                        // monotonic LRU stamp
function _lblPickBand(hPx){
  var h = hPx>0 ? hPx : 1;
  for(var i=0;i<LBL_BAND_PX.length;i++){ if(LBL_BAND_PX[i] >= h) return LBL_BAND_PX[i]; }
  return LBL_BAND_PX[LBL_BAND_PX.length-1];
}
/* LRU eviction — bounds the cache over a long date-scrub / type-set session.
   NEVER disposes a texture currently on a live label's material (that would blank
   it); an evicted word simply re-rasterizes on demand. Called before a new
   allocation so the fresh texture is never a candidate. */
function _lblEvictIfNeeded(){
  var cap = LBL_TEX_BUDGET_MB*1048576;
  if(_lblTexBytes <= cap) return;
  var inUse = {};
  for(var i=0;i<_lblItems.length;i++){ var m=_lblItems[i].obj.material && _lblItems[i].obj.material.map; if(m) inUse[m.uuid]=1; }
  var keys = Object.keys(_lblTexCache);
  keys.sort(function(a,b){ return _lblTexCache[a].lru - _lblTexCache[b].lru; });
  var target = cap*0.8;
  for(var k=0;k<keys.length && _lblTexBytes>target;k++){
    var e=_lblTexCache[keys[k]];
    if(inUse[e.tex.uuid]) continue;           // keep visible textures
    _lblTexBytes -= e.cw*e.ch*4*1.34; if(_lblTexBytes<0) _lblTexBytes=0;
    e.tex.dispose(); delete _lblTexCache[keys[k]];
  }
}
/* ics11 goal 3 — WORD WRAP. Pure function of (display string, style): a style
   with `wrap` (max line width in LBL_FONT_PX multiples) breaks a too-long label
   at spaces into 2+ CENTERED lines. Greedy first, then re-wrapped at the ideal
   per-line width for the achieved count so the lines come out balanced ("ROBERT
   A. PARKER'S / STORE (ADOBE HOUSE)", not a long line over a stub). A single
   overlong word never breaks mid-word. Streets carry no `wrap` — they stay one
   line along the road. Deterministic: no measurement of anything but the text. */
function _lblWrapLines(disp, style, wrapPx){
  if(!wrapPx || _lblAdvances(disp, style).total <= wrapPx) return [disp];
  var words = disp.split(" ").filter(function(w){ return w.length>0; });
  if(words.length < 2) return [disp];
  var lineW = function(ws){ return _lblAdvances(ws.join(" "), style).total; };
  var greedy = function(maxW){
    var out=[], cur=[];
    for(var i=0;i<words.length;i++){
      cur.push(words[i]);
      if(cur.length>1 && lineW(cur) > maxW){ cur.pop(); out.push(cur.join(" ")); cur=[words[i]]; }
    }
    if(cur.length) out.push(cur.join(" "));
    return out;
  };
  var lines = greedy(wrapPx);
  var total = _lblAdvances(disp, style).total;
  var target = Math.min(wrapPx, Math.max(total/lines.length*1.08, wrapPx*0.55));
  var balanced = greedy(target);
  return (balanced.length===lines.length) ? balanced : lines;
}
function labelTexture(text, style, band, weight){
  band = band || LBL_BAND_DEFAULT;
  // ics14 WEIGHT VARIANT (street zoom weight-step): a non-base weight derives a
  // clone style whose key carries the weight, so cache entries + advances +
  // raster all follow it (bold has wider advances → its own aspect).
  if(weight && weight !== style.weight){
    var s2 = {}; for(var sk in style){ if(style.hasOwnProperty(sk)) s2[sk] = style[sk]; }
    s2.weight = weight; s2.key = style.key + "@" + weight; style = s2;
  }
  var key = style.key + "|" + band + "|" + text;
  if(_lblTexCache[key]){ _lblTexCache[key].lru = ++_lblTexClock; return _lblTexCache[key]; }
  _lblEvictIfNeeded();
  var disp = style.smallCaps ? text.toUpperCase() : text;
  // ics11 goal 3: wrap long labels (style.wrap = max line width, LBL_FONT_PX ×)
  var lines = _lblWrapLines(disp, style, style.wrap ? style.wrap*LBL_FONT_PX : 0);
  var ms = lines.map(function(L){ return _lblAdvances(L, style); });
  var maxW = 0; for(var mi=0; mi<ms.length; mi++) if(ms[mi].total > maxW) maxW = ms[mi].total;
  // pad must clear the WIDEST ring — the light outer glow (halo + glow, both
  // sides) plus the soft blur, else the glow clips at the texture edge.
  // ics14b: glow:false voices (street/districts/civic) have no glow pass —
  // the casing is the widest ring and the pad shrinks with it.
  var noGlow = style.glow === false;
  var glowW = noGlow ? style.halo : style.halo + LBL_GLOW_EXTRA;
  var pad = Math.ceil(LBL_FONT_PX*0.42 + glowW*2 + style.halo);
  var lineH = LBL_FONT_PX*1.36;
  var W = Math.ceil(maxW) + pad*2, H = Math.ceil(lineH*lines.length) + pad*2;
  // BAND SUPERSAMPLE: choose ss so the rasterized canvas box height ≈ band px
  // (texel≈screen at that band). Replaces the old fixed LBL_SS=3.
  var ss = band / H;
  var cw = Math.max(2, Math.round(W*ss)), ch = Math.max(2, Math.round(H*ss));
  var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
  var ctx = cv.getContext("2d"); ctx.scale(ss, ss);
  ctx.font = _lblFontStr(style, LBL_FONT_PX);
  ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineJoin = "round"; ctx.miterLimit = 2;
  // DUAL-HALO, widest→narrowest→fill so the rings nest concentrically around
  // each glyph: [1] light outer glow (with a soft blur) reads on dark scene
  // shadow/road-paint; [2] dark inner stroke reads on the bright amber ground;
  // [3] the ink fill covers the glyph body. Painting wide-then-narrow leaves a
  // light ring OUTSIDE the dark ring OUTSIDE the ink — §11's any-background halo.
  // Each pass walks EVERY line (centered) so the rings nest across the block.
  var drawPass = function(mode, color, lw, blur){
    if(mode==="stroke"){ ctx.lineWidth = lw; ctx.strokeStyle = color;
      ctx.shadowColor = blur ? color : "rgba(0,0,0,0)"; ctx.shadowBlur = blur || 0; }
    else { ctx.shadowBlur = 0; ctx.shadowColor = "rgba(0,0,0,0)"; ctx.fillStyle = color; }
    for(var li=0; li<lines.length; li++){
      var L = lines[li], mL = ms[li];
      var y = pad + lineH*li + lineH/2, x = pad + (maxW - mL.total)/2;   // center each line
      for(var i=0;i<L.length;i++){
        if(mode==="stroke") ctx.strokeText(L[i], x, y); else ctx.fillText(L[i], x, y);
        x += mL.adv[i] + mL.ls;
      }
    }
  };
  // ics14b: glow:false voices (street/districts/civic — operator, oblique-angle
  // fog finding; ics14c adds both lot voices) skip pass [1] entirely: ink +
  // casing only, the Maps treatment. The one voice still carrying the s92
  // dual halo (water) keeps the light glow.
  if(!noGlow) drawPass("stroke", style.glowColor || LBL_HALO_LIGHT, glowW*2, style.halo*0.9);   // [1] outer glow (soft)
  drawPass("stroke", style.haloColor, style.halo*2, 0);          // [2] inner ring / casing (opposite polarity of the ink)
  drawPass("fill", style.color, 0, 0);                           // [3] ink
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  tex.anisotropy = _lblAniso;
  tex.needsUpdate = true;
  _lblTexBytes += cw*ch*4*1.34;   // RGBA + mip tail
  // texelH = the canvas box height in px (== band, up to rounding) — the crispness
  // audit reads this to form texel/screen without re-deriving the raster.
  // lines/aspect are band-independent (wrap works in layout px), so a band swap
  // never changes a label's geometry.
  var e = { tex:tex, aspect: W/H, lines:lines.length, band:band, texelH:ch, cw:cw, ch:ch, lru: ++_lblTexClock }; _lblTexCache[key] = e; return e;
}
/* live texture-memory report (QA/audit + budget check). */
function labelsTexBudget(){
  var n = 0; for(var k in _lblTexCache){ if(_lblTexCache.hasOwnProperty(k)) n++; }
  return { textures:n, estBytes:Math.round(_lblTexBytes), estMB:+(_lblTexBytes/1048576).toFixed(2),
           budgetMB:LBL_TEX_BUDGET_MB, withinBudget:(_lblTexBytes/1048576) <= LBL_TEX_BUDGET_MB, anisotropy:_lblAniso, bands:LBL_BAND_PX };
}

/* ---- GRID BASIS (once): unit world directions of +u (street run) and +v (down
   the block), for aligning ground text and offsetting the owner line. ---- */
var _lblGrid = (function(){
  var o = gridToWorldAt(0,0,GRID_ROT_BASE), pu = gridToWorldAt(1,0,GRID_ROT_BASE), pv = gridToWorldAt(0,1,GRID_ROT_BASE);
  var ux = pu.x-o.x, uz = pu.z-o.z, ul = Math.hypot(ux,uz)||1;
  var vx = pv.x-o.x, vz = pv.z-o.z, vl = Math.hypot(vx,vz)||1;
  return { ux:ux/ul, uz:uz/ul, vx:vx/vl, vz:vz/vl, angle:Math.atan2(uz/ul, ux/ul) };
})();
var LBL_LIFT = 0.5;         // ground text sits just above the paint drape

/* ---- geometry factories. s93 item 1: each carries its text+style+band so the
   settle pass can re-raster to a new band by swapping the material map. ---- */
function _lblGroundMesh(text, style, x, z, worldH, angle, grow, band){
  var t = labelTexture(text, style, band);
  // ics11 goal 3: a wrapped label stacks lines — worldH stays the PER-LINE size
  // (eased down slightly as lines stack so a 3-line block doesn't dwarf its lot);
  // the plane grows to hold the whole block. aspect already spans the full block.
  var lines = t.lines || 1;
  var gh = (worldH * Math.pow(0.85, lines-1)) * lines, w = gh * t.aspect;
  var geo = new THREE.PlaneGeometry(w, gh); geo.rotateX(-Math.PI/2);   // lie flat on the ground
  var mat = new THREE.MeshBasicMaterial({ map:t.tex, transparent:true, depthTest:false, depthWrite:false, opacity:0 });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, terrainHeight(x,z)+LBL_LIFT, z);
  mesh.rotation.y = -angle;                                                // align text with the line
  mesh.renderOrder = 20; mesh.frustumCulled = false; mesh.userData.text = text;
  mesh.userData.style = style; mesh.userData.band = t.band;               // for the band re-raster swap
  mesh.userData.lines = lines;                                            // ics11: wrap audit + declutter box
  mesh.userData.aspect = t.aspect;                                        // ics14: weight-variant aspect tracking (geometry refresh)
  // s92 flip (finding #3 — never upside down): remember the world-anchored
  // baseline orientation so updateLabels can add ±π to keep it camera-upright.
  mesh.userData.baseRotY = -angle;            // world-anchored rotation (no flip)
  mesh.userData.dirX = Math.cos(angle);       // world +x-z unit vector the text reads along
  mesh.userData.dirZ = Math.sin(angle);
  mesh.userData.flip = false;
  mesh.userData.grow = !!grow;                // finding #2: scale up with altitude so it stays legible high
  return mesh;
}
function _lblSprite(text, style, x, z, lift, band){
  var t = labelTexture(text, style, band);
  var mat = new THREE.SpriteMaterial({ map:t.tex, transparent:true, depthTest:false, depthWrite:false, opacity:0 });
  var s = new THREE.Sprite(mat); s.userData.aspect = t.aspect; s.userData.text = text;
  s.userData.style = style; s.userData.band = t.band; s.userData.lines = t.lines || 1;
  s.position.set(x, terrainHeight(x,z)+lift, z);
  s.renderOrder = 25; s.frustumCulled = false;
  return s;
}

/* ---- s93 item 2 — STREET NAMES FOLLOW THEIR STREETS. A street name is no
   longer a single flat quad hung at one height (which floats/clips on a downhill
   run and never bends). It is a THIN GROUND RIBBON sampled ALONG the street's
   polyline arc: cross-sections stepped down the arc, each draped to its own
   terrainHeight, the word canvas mapped across the arc-length (u) and the ROW
   width (v). Result: glyph spacing preserved, the run gently follows curvature,
   and it drapes over downhill grades — "almost painted-on." The whole word is
   the flip unit (s92 camera-upright: reverse u+v, never per-letter). Where the
   arc bends too hard over the word (LBL_CURV_MAX) it would read as a smear, so
   we fall back to the straight quad there. Vertices are ANCHOR-RELATIVE so the
   grow scale (finding #2) grows the word about its centre, same as the quad. */
var LBL_CURV_MAX = 0.62;    // rad — total tangent turn over a word above which we straight-quad-fallback (~36°)
function _lblArcCum(pts){
  var cum=[0], total=0;
  for(var k=1;k<pts.length;k++){ total += Math.hypot(pts[k].x-pts[k-1].x, pts[k].z-pts[k-1].z); cum.push(total); }
  return { cum:cum, total:total };
}
function _lblArcSample(pts, cum, s){
  var seg=1; while(seg<cum.length-1 && cum[seg]<s) seg++;
  var a=pts[seg-1], b=pts[seg], segLen=(cum[seg]-cum[seg-1])||1, f=(s-cum[seg-1])/segLen;
  var dx=(b.x-a.x)/segLen, dz=(b.z-a.z)/segLen;
  return { x:a.x+(b.x-a.x)*f, z:a.z+(b.z-a.z)*f, tx:dx, tz:dz };
}
/* build (or rebuild) the ribbon geometry from stored arc params; anchor-relative
   positions + per-vertex terrain drape. UVs written by _lblRibbonSetFlip. */
function _lblRibbonGeom(ud){
  var pts=ud.pts, cum=ud.cum, s0=ud.s0, s1=ud.s1, K=ud.K, hw=ud.worldH*0.5;
  var ax=ud.ax, ay=ud.ay, az=ud.az;
  var pos=new Float32Array((K+1)*2*3), uvA=new Float32Array((K+1)*2*2), baseU=new Float32Array((K+1)*2);
  for(var k=0;k<=K;k++){
    var s=s0+(s1-s0)*(k/K), sm=_lblArcSample(pts,cum,s);
    var nx=-sm.tz, nz=sm.tx;                       // left-hand ground normal
    var lx=sm.x+nx*hw, lz=sm.z+nz*hw, rx=sm.x-nx*hw, rz=sm.z-nz*hw;
    var li=(k*2)*3, ri=(k*2+1)*3;
    pos[li]=lx-ax; pos[li+1]=terrainHeight(lx,lz)+LBL_LIFT-ay; pos[li+2]=lz-az;
    pos[ri]=rx-ax; pos[ri+1]=terrainHeight(rx,rz)+LBL_LIFT-ay; pos[ri+2]=rz-az;
    baseU[k*2]=k/K; baseU[k*2+1]=k/K;
  }
  var idx=[];
  for(var q=0;q<K;q++){ var a0=q*2, b0=q*2+1, a1=(q+1)*2, b1=(q+1)*2+1; idx.push(a0,b0,a1, b0,b1,a1); }
  var geo=new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvA,2));
  geo.setIndex(idx);
  geo.userData.baseU = baseU;   // per-vertex u before flip (v is 1 for left edge, 0 for right)
  return geo;
}
function _lblRibbonSetFlip(mesh, flip){
  // v=1 (canvas top / glyph tops) must sit on the SAME side of the tangent the
  // working straight quad puts it — the (tz,-tx) side, i.e. the RIGHT vertex
  // (P − Nperp·hw, the odd index). Putting it on the left mirrors the run.
  var geo=mesh.geometry, baseU=geo.userData.baseU, uv=geo.attributes.uv.array, n=baseU.length;
  for(var i=0;i<n;i++){
    var isLeft=(i%2)===0, u=baseU[i], v=isLeft?0:1;
    uv[i*2]   = flip ? (1-u) : u;
    uv[i*2+1] = flip ? (1-v) : v;
  }
  geo.attributes.uv.needsUpdate = true;
  mesh.userData.flip = flip;
}
/* one street-name instance centred at arc-length sCenter. Returns a ribbon mesh,
   or null when the arc bends too hard (caller places a straight quad instead). */
function _lblStreetRibbon(name, style, pts, cum, total, sCenter, worldH, band){
  var t = labelTexture(name, style, band), wordW = worldH * t.aspect;
  var s0 = sCenter - wordW/2, s1 = sCenter + wordW/2;
  if(s0 < 0){ s1 -= s0; s0 = 0; }
  if(s1 > total){ s0 -= (s1-total); s1 = total; if(s0<0) s0=0; }
  if(s1-s0 < 1) return null;
  var K = Math.max(4, Math.min(48, Math.round((s1-s0)/4)));
  // curvature: total absolute turn of the tangent across the word span
  var turn=0, prev=null;
  for(var k=0;k<=K;k++){
    var sm=_lblArcSample(pts,cum, s0+(s1-s0)*(k/K)), ang=Math.atan2(sm.tz,sm.tx);
    if(prev!==null){ var d=ang-prev; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; turn+=Math.abs(d); }
    prev=ang;
  }
  if(turn > LBL_CURV_MAX) return null;   // too bent → straight-quad fallback
  var ac = _lblArcSample(pts,cum,sCenter);
  var ax=ac.x, ay=terrainHeight(ac.x,ac.z)+LBL_LIFT, az=ac.z;
  var ud = { ribbon:true, text:name, style:style, band:t.band, aspect:t.aspect, worldH:worldH, lines:t.lines||1,
             pts:pts, cum:cum, s0:s0, s1:s1, K:K, ax:ax, ay:ay, az:az, grow:true,
             dirX:ac.tx, dirZ:ac.tz, flip:false };
  var geo = _lblRibbonGeom(ud);
  // DoubleSide: the strip lies flat on the ground; winding-from-above is not
  // guaranteed across curved runs, so render both faces (flat text, no lighting).
  var mat = new THREE.MeshBasicMaterial({ map:t.tex, transparent:true, depthTest:false, depthWrite:false, opacity:0, side:THREE.DoubleSide });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(ax, ay, az);
  mesh.renderOrder = 20; mesh.frustumCulled = false; mesh.userData = ud;
  _lblRibbonSetFlip(mesh, false);
  return mesh;
}

/* ---- ERA-DATED STREET NAMES (item B consumer). The dated name arrays live in
   the street geometry data (window.STREETS_GEOMETRY .eraNames — added to
   data/streets-geometry.json this sprint); the labels layer reads them directly
   by street id, so no core plumbing changes. Each eraNames entry is
   { name, start, end|null, source }; the period-correct name is the interval
   covering the sim date, else the street's default runtime name. ---- */
var _lblEraNames = (function(){
  var map = {}, SG = window.STREETS_GEOMETRY;
  if(SG && SG.streets) SG.streets.forEach(function(s){ if(s.eraNames && s.eraNames.length) map[s.id] = s.eraNames; });
  return map;
})();
function eraStreetName(streetRt, day){
  var baseId = streetRt.id.indexOf(":")>=0 ? streetRt.id.split(":")[0] : streetRt.id;
  var arr = _lblEraNames[baseId];
  if(arr){
    for(var i=0;i<arr.length;i++){
      var s0 = arr[i].start!=null ? eventDateToSimDay(arr[i].start) : -1e9;
      var s1 = arr[i].end!=null ? eventDateToSimDay(arr[i].end) : 1e9;
      if(day>=s0 && day<s1) return _lblStreetDisplay(arr[i].name);
    }
  }
  return _lblStreetDisplay(streetRt.name);
}
/* short label name: the dataset carries a few long descriptive names ("Commercial
   Street landing approach (the 1846 'Portsmouth street…')"). A label is a glance,
   not a gloss — keep the name up to the first "Street"/"St", drop trailing clauses
   and any parenthetical. */
function _lblStreetDisplay(name){
  var n = String(name||"");
  var m = n.match(/^(.*?\b(?:Street|St\.?|Road|Wharf|Place|Avenue|Ave\.?)\b)/i);
  if(m) return m[1].trim();
  var cut = n.search(/[\(\/]|\b(?:to the|landing|approach)\b/i);
  return (cut>0 ? n.slice(0,cut) : n).trim();
}

/* ---- ZONE / LANDMARK ANCHORS. Parcels (cove/plaza/camp/mission/presidio) →
   polylabel pole of their world ring. Hills → the highest baked terrain vertex
   inside a named search box (data-grounded, not invented; skipped if the box is
   flat). Ocean/Bay → fixed points over open water. ---- */
function _lblParcelWorldRing(p){
  // largest-area world ring: p.rings (clipped/world multi-piece) or p.poly (uv/world)
  var rings = [];
  if(p.rings){ p.rings.forEach(function(r){ if(r&&r.length>=3) rings.push(r.map(function(pt){ return {x:pt.x,z:pt.z}; })); }); }
  else if(p.poly){
    if(p.space==="uv") rings.push(p.poly.map(function(pt){ var w=gridToWorldAt(pt.u,pt.v,GRID_ROT_BASE); return {x:w.x,z:w.z}; }));
    else rings.push(p.poly.map(function(pt){ return {x:pt.x,z:pt.z}; }));
  }
  if(!rings.length) return null;
  var best=null, bestA=-1;
  rings.forEach(function(r){ var a=0; for(var i=0,j=r.length-1;i<r.length;j=i++) a+=r[j].x*r[i].z-r[i].x*r[j].z; a=Math.abs(a)/2; if(a>bestA){ bestA=a; best=r; } });
  return best;
}
function _lblPolePoint(ring){
  var poly = [ring.map(function(p){ return [p.x, p.z]; })];
  var pole = polylabel(poly, 2.0);
  return { x:pole[0], z:pole[1] };
}
/* hill peak search: highest baked vertex within a box centered PLAZA+offset. */
function _lblPeakInBox(cx, cz, half){
  var i0 = Math.max(0, Math.floor((cx-half-WORLD.x0)/WORLD.cell)), i1 = Math.min(TERRAIN.nx-1, Math.ceil((cx+half-WORLD.x0)/WORLD.cell));
  var j0 = Math.max(0, Math.floor((cz-half-WORLD.z0)/WORLD.cell)), j1 = Math.min(TERRAIN.nz-1, Math.ceil((cz+half-WORLD.z0)/WORLD.cell));
  var bh=-1e9, bx=cx, bz=cz;
  for(var j=j0;j<=j1;j++) for(var i=i0;i<=i1;i++){ var h=TERRAIN.heights[j*TERRAIN.nx+i]; if(h>bh){ bh=h; bx=WORLD.x0+i*WORLD.cell; bz=WORLD.z0+j*WORLD.cell; } }
  return { x:bx, z:bz, h:bh };
}
var LBL_HILLS = [   // offsets from the plaza in world metres (+x E, +z S); peak-found within ±half
  { name:"Telegraph Hill", dx: 150, dz:-620, half:340, minH:24 },
  { name:"Nob Hill",       dx:-640, dz:-140, half:360, minH:40 },
  { name:"Russian Hill",   dx:-520, dz:-620, half:360, minH:40 },
  { name:"Rincon Hill",    dx: 540, dz: 900, half:380, minH:18 }
];
/* Ocean/Bay fixed anchors + which parcels get a landmark label + its voice.
   ics14 host-surface polarity: ocean/bay are HOSTED ON WATER, so they take the
   WATER voice (light blue italic — the Maps water treatment), not the land-
   polarity district voice; they keep the region ZOOM BAND + size. */
var LBL_WATERBODIES = [
  { name:"Pacific Ocean",      x:-9200, z: 3200, style:"water", worldPx:34, band:"region" },
  { name:"San Francisco Bay",  x: 3600, z: -200, style:"water", worldPx:34, band:"region" }
];
/* ics14d SIZE FLOORS (operator: raise any voice whose NAME renders below
   ~11 px/line at its band). A sprite's screenPx is the whole PADDED texture
   box, not the glyph line: for a 1-line label the glyph em gets only
   LBL_FONT_PX/(lineH + 2·pad) ≈ 0.38 of the box (pad = 0.42·em + casing
   rings) — so the old civic 15 px box rendered its name at ≈5.7 px em,
   the real illegibility the operator screenshotted. Floors below are set
   so the rendered EM ≥ ~11 px: parcels 22→28, cove 26→28 (hills 30 and
   ocean/bay 34 already clear at ≈11.9/13.5 px em; the civic reservation
   voice steps 15→30 at its _lblAdd). */
var LBL_PARCEL_LABELS = {   // cadastre parcel name -> { text, style, band, screenPx }
  "yerba-buena-cove": { text:"Yerba Buena Cove", style:"water", band:"water", screenPx:28 },
  "portsmouth-square":{ text:"Portsmouth Square",style:"civic", band:"place", screenPx:28 },
  "happy-valley-camp":{ text:"Happy Valley",     style:"place", band:"place", screenPx:28 },
  "mission-cluster":  { text:"Mission Dolores",  style:"place", band:"place", screenPx:28 },
  "presidio":         { text:"The Presidio",     style:"place", band:"place", screenPx:28 }
};

/* =====================================================================
   ICS-13 — POI CATEGORY SYMBOLS (operator backlog, verbatim: "Create distinct
   visual symbols for different point of interest (POI) categories such as
   residences, businesses, parks, and others. Symbols should hover over each
   POI using Google Maps color palette.").
   A POI is a NAMED place only: the landmark-reservation registry
   (window.LANDMARK_RESERVATIONS, the same records the buildings admission
   spawns) + the plaza public ground (Portsmouth Square parcel). Anonymous
   procedural fill (tents/shacks) NEVER gets a symbol.
   Each POI gets a camera-facing marker sprite hovering above its roof —
   since ICS-14 the MODERN Maps EMBLEM (flat colored circle badge + thin
   white ring + tiny pointed tail; see poiSymbolTexture), white category
   glyph inside, glow/hairline outlined (the same any-background discipline
   as the text labels), rasterized DPR-aware with mips into the shared label
   texture cache, joining the ics11 true-quad declutter as sublayer
   "symbols" (atelier toggle POI SYMBOLS, default ON; release default ON).
   Deterministic: pure function of date + camera — the set is
   reservationsAt(day) order + the plaza, zero dice. ---- */

/* THE CATEGORY MAPPING (derived from real data — the registry's business
   `kind` field). Google-Maps palette family:
     business  BLUE  #4285F4 (Maps primary blue; the one blue, used consistently)
     residence TEAL  #00897B (Maps residential green-teal family)
     park      GREEN #34A853 (Maps park green)
     other     GREY  #9AA0A6 (Maps neutral grey)
   Registry kinds observed (s95 batch 1): store/market/bank/manufactory/
   hotel/newspaper_office — all commercial. No dwelling kind exists in the
   registry today, so the residence bucket is EMPTY (honest; the machinery +
   palette slot stand ready for when named residences join the registry). */
var POI_KIND_CAT = {
  store:"business", market:"business", bank:"business", manufactory:"business",
  hotel:"business", newspaper_office:"business", tavern:"business",
  saloon:"business", exchange:"business",
  residence:"residence", dwelling:"residence",
  park:"park", plaza:"park",
  civic:"other", school:"other", church:"other", post_office:"other"
};
/* The 14 plaza-cluster records (s91/s94) predate the registry's entry-level
   `kind` field. Their kinds are documented in the dossier notes each record
   carries — mapped here explicitly, one line per record, never guessed:
   hotels (City Hotel/Parker House/Portsmouth House), gambling saloons
   (El Dorado/Dennison's/Bella Union), newspaper offices (Alta California/
   California Star), Howard & Mellus store, Shades Tavern, Merchants'
   Exchange; civic: Custom House, School House, Post Office. */
var POI_LEGACY_KIND = {
  "custom-house":"civic", "school-house":"school", "post-office":"post_office",
  "city-hotel":"hotel", "parker-house":"hotel", "portsmouth-house":"hotel",
  "el-dorado":"saloon", "dennisons-exchange":"saloon", "bella-union":"saloon",
  "alta-california-office":"newspaper_office", "california-star-office":"newspaper_office",
  "howard-mellus-store":"store", "shades-tavern":"tavern",
  "merchants-exchange":"exchange"
};
/* landmarkId -> business kind, read once from the registry sidecar (the
   cadastre's GROUND_RESERVATIONS records carry the ANCHOR kind, not the
   business kind, so we index the source registry directly). */
var _poiKindById = (function(){
  var map = {}, REG = (typeof window!=="undefined" && window.LANDMARK_RESERVATIONS) ? window.LANDMARK_RESERVATIONS : null;
  if(REG && REG.reservations) REG.reservations.forEach(function(r){
    map[r.landmarkId] = r.kind || POI_LEGACY_KIND[r.landmarkId] || null;
  });
  return map;
})();
/* category of a live reservation record; null = unmapped kind (surfaced by
   the poiSymbols audit rather than silently bucketed). */
function poiCategory(landmarkId){
  var kind = _poiKindById[landmarkId];
  return (kind && POI_KIND_CAT[kind]) ? POI_KIND_CAT[kind] : null;
}
var POI_COLORS = { business:"#4285F4", residence:"#00897B", park:"#34A853", other:"#9AA0A6" };
/* ics14 item 6.1 — PROGRESSIVE EMBLEM REVEAL (Maps altitude LOD for POIs: high
   zoom shows only the top-tier landmarks; descending reveals the business
   diversity; close shows all). Deterministic KIND→TIER priority:
     tier 1 (landmarks: civic/church/school/post office/park/hotel) — the full
            poi band (fades 900→1600 m, the last emblems standing);
     tier 2 (institutions: bank/exchange/newspaper/market/manufactory) —
            revealed below the town band (fades 700→1000 m);
     tier 3 (everyday retail: store/tavern/saloon + residences) — the close
            reveal (fades 420→650 m; full at the plaza framing).
   Tiers also step the declutter priority (33/34/35) so when space is tight the
   top tier wins the SAT placement — same (prio, seq) determinism as ever.
   Framings: 1500 m ⇒ tier-1 residual only · 500 m ⇒ tiers 1+2 (tier 3 fading
   in at 0.65) · 150 m ⇒ all. */
var POI_TIER_BY_KIND = {
  civic:1, school:1, church:1, post_office:1, park:1, plaza:1, hotel:1,
  bank:2, exchange:2, newspaper_office:2, market:2, manufactory:2,
  store:3, tavern:3, saloon:3, residence:3, dwelling:3
};
function poiTier(kind){ return (kind && POI_TIER_BY_KIND[kind]) || 3; }
var POI_SS_PX  = 30;    // marker screen height (px): the ics14 emblem reads a ~23 px disc + ~4.5 px tail at this size — Maps web proportions (disc 22-26 px, tail 4-5 px); still never a billboard
var POI_LIFT_M = 13;    // hover height above the terrain (clears the tallest landmark kit: hotel 6.6 m + ridge 2 m + plinth)

/* ---- THE MARKER RASTER (labelTexture's discipline for a vector emblem):
   supersampled canvas at the label BAND ladder, mips + max aniso, cached in
   the SHARED _lblTexCache (key "poi|cat|band") so the LRU budget/eviction
   governs these too.
   ICS-14 REDESIGN (operator, Google-Maps reference): the classic TEARDROP pin
   is replaced by the MODERN Maps POI EMBLEM — a small FLAT colored CIRCLE
   BADGE with the white category glyph inside, a thin WHITE RING around the
   disc, and a TINY short pointed TAIL at the bottom. The badge reads as a
   circle, not a pin. Layout in a 100×118 unit box: colored disc r40 @ (50,49),
   white ring band r40→45.5, tail triangle to (50,112) (white-cased like the
   ring); a soft light glow + dark hairline around the whole silhouette keep
   the §11 any-background separation discipline. At POI_SS_PX=30 the disc+ring
   is ≈23 screen px and the visible tail ≈4.5 px — Maps web proportions. ---- */
function _poiGlyph(ctx, cat){
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if(cat==="business"){
    // shopping bag: handle arc + body
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(50, 40, 9, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35,40); ctx.lineTo(65,40); ctx.lineTo(63,63); ctx.lineTo(37,63); ctx.closePath(); ctx.fill();
  } else if(cat==="residence"){
    // house: roof gable + body
    ctx.beginPath(); ctx.moveTo(50,28); ctx.lineTo(29,47); ctx.lineTo(71,47); ctx.closePath(); ctx.fill();
    ctx.fillRect(35,47,30,17);
  } else if(cat==="park"){
    // tree: round canopy + trunk
    ctx.beginPath(); ctx.arc(50,40,13,0,Math.PI*2); ctx.fill();
    ctx.fillRect(46,50,8,14);
  } else {
    // other: pennant flag on a pole
    ctx.fillRect(41,28,5,36);
    ctx.beginPath(); ctx.moveTo(46,30); ctx.lineTo(68,37); ctx.lineTo(46,45); ctx.closePath(); ctx.fill();
  }
}
function poiSymbolTexture(cat, band){
  band = band || LBL_BAND_DEFAULT;
  var key = "poi|" + cat + "|" + band;
  if(_lblTexCache[key]){ _lblTexCache[key].lru = ++_lblTexClock; return _lblTexCache[key]; }
  _lblEvictIfNeeded();
  var UW = 100, UH = 118, s = band/UH;
  var cw = Math.max(2, Math.round(UW*s)), ch = Math.max(2, Math.round(UH*s));
  var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
  var ctx = cv.getContext("2d"); ctx.scale(s, s);
  // OUTER silhouette: the white-cased badge boundary — ring circle + tail
  var outer = function(){
    ctx.beginPath();
    ctx.arc(50, 49, 45.5, 0, Math.PI*2);
    ctx.moveTo(39, 84); ctx.lineTo(50, 112); ctx.lineTo(61, 84); ctx.closePath();
  };
  // INNER color: the flat disc + the colored core of the tail (inset so the
  // white casing shows as the thin Maps ring + a white tail edge)
  var inner = function(){
    ctx.beginPath();
    ctx.arc(50, 49, 40, 0, Math.PI*2);
    ctx.moveTo(43, 85); ctx.lineTo(50, 107); ctx.lineTo(57, 85); ctx.closePath();
  };
  // [1] soft light glow around the silhouette — separates the badge from dark
  //     road-paint/shadow (§11 any-background discipline, kept from ics13)
  outer(); ctx.lineWidth = 6; ctx.strokeStyle = LBL_HALO_LIGHT;
  ctx.shadowColor = LBL_HALO_LIGHT; ctx.shadowBlur = 4; ctx.stroke();
  ctx.shadowBlur = 0; ctx.shadowColor = "rgba(0,0,0,0)";
  // [2] dark hairline around the silhouette — separates it from bright ground
  outer(); ctx.lineWidth = 2.5; ctx.strokeStyle = LBL_HALO_DARK; ctx.stroke();
  // [3] fill the outer silhouette WHITE — this IS the thin white ring (r40→45.5)
  //     plus the white casing of the tiny tail
  outer(); ctx.fillStyle = "rgba(255,255,255,0.97)"; ctx.fill();
  // [4] flat category-color disc + tail core
  inner(); ctx.fillStyle = POI_COLORS[cat] || POI_COLORS.other; ctx.fill();
  // [5] white category glyph, centred in the disc (ics13 glyphs re-anchored
  //     from the old pin's disc centre (50,46) to the badge centre (50,49))
  ctx.save();
  ctx.translate(50, 49); ctx.scale(1.1, 1.1); ctx.translate(-50, -46);
  _poiGlyph(ctx, cat);
  ctx.restore();
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  tex.anisotropy = _lblAniso; tex.needsUpdate = true;
  _lblTexBytes += cw*ch*4*1.34;
  var e = { tex:tex, aspect: UW/UH, lines:1, band:band, texelH:ch, cw:cw, ch:ch, lru: ++_lblTexClock };
  _lblTexCache[key] = e; return e;
}
/* camera-facing marker sprite (the zone-sprite pattern, POI texture). */
function _poiSprite(cat, name, x, z, band){
  var t = poiSymbolTexture(cat, band);
  var mat = new THREE.SpriteMaterial({ map:t.tex, transparent:true, depthTest:false, depthWrite:false, opacity:0 });
  var s = new THREE.Sprite(mat);
  s.userData.aspect = t.aspect; s.userData.text = name;
  s.userData.poi = true; s.userData.poiCat = cat; s.userData.band = t.band; s.userData.lines = 1;
  s.position.set(x, terrainHeight(x,z)+POI_LIFT_M, z);
  s.renderOrder = 26; s.frustumCulled = false;
  return s;
}

/* ---- ZOOM-BAND OPACITY (alt in metres; lastKnownAlt). rampDown(a,b): 1 below
   a, 0 above b, linear between — a category "fades OUT as you climb". Regions
   own the high view and fade on descent (rampUp); streets then lots fade in as
   you descend (rampDown at their bands). ---- */
function _rDown(alt,a,b){ return alt<=a?1:(alt>=b?0:(b-alt)/(b-a)); }   // visible LOW, gone HIGH
function _rUp(alt,a,b){ return alt<=a?0:(alt>=b?1:(alt-a)/(b-a)); }     // visible HIGH, gone LOW
var LBL_BANDS = {
  region:  function(a){ return _rUp(a, 480, 950); },                    // hills/ocean/bay: own altitude, fade on descent
  water:   function(a){ return Math.min(_rUp(a,140,360), _rDown(a,4200,7000)); }, // cove: mid-high, gentle
  place:   function(a){ return _rDown(a, 3600, 6600); },                // civic/landmark places: persist, fade only very high
  // s92 finding #2 — streets stay legible from ~2x the old altitude. Old
  // ceiling 880m fully hid every street name by the town framing; the raised
  // ceiling (fade 1500→2400m) keeps majors readable up into the overview band,
  // where zoom-scaling (updateLabels) + priority declutter show the majors first.
  // ics14: this is now the MAIN-class ramp only — see LBL_STREET_LOD below for
  // the class-tier ramps (Maps altitude LOD: minors hide first).
  street:  function(a){ return _rDown(a, 1500, 2400); },                // fade in low, persist to the overview (main tier)
  lotNum:  function(a){ return _rDown(a, 180, 270); },                  // fade in at the lot band
  lotOwn:  function(a){ return _rDown(a, 96, 158); },                   // owner: closer still
  landmark:function(a){ return _rDown(a, 520, 780); },                  // s91/s92: reservation names — read earlier (higher) than lot numbers
  poi:     function(a){ return _rDown(a, 900, 1600); }                  // ics13: POI symbols — full through the town band, fading across the overview climb
};
/* s92 STREET PRIORITY (finding #2): main streets outrank cross streets in the
   declutter so altitude reveals the majors first. Lower number = placed first.
   Streets sit BELOW zones/landmarks (prio 10–14) so region labels still win.
   ics14: the class list is factored into a TIER (shared by prio + LOD ramps). */
function _lblStreetTier(cls){
  if(cls==="market"||cls==="main"||cls==="main-override"||cls==="plank-road") return "main";
  if(cls==="cross"||cls==="cross-ofarrell"||cls==="cross-override"||cls==="hundred-vara") return "cross";
  return "lane";   // lane / wharf-lane / trail / pier / future-tag
}
function _lblStreetPrio(cls){
  var t = _lblStreetTier(cls);
  return t==="main" ? 27 : (t==="cross" ? 30 : 32);
}
/* ics14 ALTITUDE LOD — PROGRESSIVE DISAPPEARANCE BY STREET CLASS (operator,
   from Maps reference shots at increasing altitude: minor streets lose labels
   first; at the highest zoom only primary roadways stay named). Tier ramps
   (each also bounded by the main 1500→2400 m ceiling):
     lane   — visible below 260 m, gone by 400 m   (closest zoom only)
     cross  — visible below 700 m, gone by 1000 m  (town band keeps them)
     main   — the s92 ramp: persists to 1500 m, gone by 2400 m
   Against the canonical framings: 150 m ⇒ all classes; 500 m ⇒ main+cross;
   1500 m ⇒ mains only; ≥2400 m ⇒ none (zones/districts persist alone).
   Continuous _rDown ramps evaluated per frame with the standard opacity
   easing — deterministic, no flicker, no per-frame raster. */
var LBL_STREET_LOD = {
  main:  LBL_BANDS.street,
  cross: function(a){ return Math.min(_rDown(a, 1500, 2400), _rDown(a, 700, 1000)); },
  lane:  function(a){ return Math.min(_rDown(a, 1500, 2400), _rDown(a, 260, 400)); }
};
/* ics14 item 6.1 — POI reveal-tier ramps (see POI_TIER_BY_KIND). Each tier is
   bounded by the base poi band; lower tiers gain an earlier fade-out. */
var LBL_POI_TIER_BANDS = {
  1: LBL_BANDS.poi,
  2: function(a){ return Math.min(LBL_BANDS.poi(a), _rDown(a, 700, 1000)); },
  3: function(a){ return Math.min(LBL_BANDS.poi(a), _rDown(a, 420, 650)); }
};
/* ics14 LOD item 1 — FAR STREET TEXT STAYS SMALL (Maps keeps far street names
   modest; they never grow huge). Street labels cap their altitude growth at
   2× base (the global grow cap is 6×) — on-screen they hold ~32 px through
   the town band, then SHRINK with distance instead of ballooning. */
var LBL_ZF_STREET_MAX = 2;
/* s92 REPEAT-ALONG-LINE (finding #2 — "some streets visible, not all"): one
   label per street can sit off-screen or lose the declutter. Walk the street's
   active run and drop an anchor every LBL_REPEAT_M of world length (capped), so
   panning always keeps one instance in frame. Returns [{x,z,ang}] in world. */
var LBL_REPEAT_M = 240;     // spacing between repeated street-name instances (world metres)
var LBL_REPEAT_MAX = 6;     // cap instances per street run
function _lblStreetPlaces(poly, i0, i1){
  var pts = [];
  for(var i=i0;i<=i1;i++){ var w = gridToWorldAt(poly[i].u, poly[i].v, GRID_ROT_BASE); pts.push({x:w.x,z:w.z}); }
  if(pts.length<2) return null;
  var ac = _lblArcCum(pts); if(ac.total < 1) return null;
  // centre arc-lengths: spaced LBL_REPEAT_M, at least the midpoint
  var n = Math.min(LBL_REPEAT_MAX, Math.max(1, Math.round(ac.total/LBL_REPEAT_M)));
  var centers=[];
  for(var a=0;a<n;a++) centers.push(ac.total*(a+0.5)/n);
  return { pts:pts, cum:ac.cum, total:ac.total, centers:centers };
}

/* ====================================================================
   LABEL SET — rebuilt when the sim DATE (integer day) or a sublayer toggle
   changes (era gating + record-lot birth + era street names all move with the
   date). Each label is { obj:Three obj, band:fn, sublayer, prio, ss?:screenPx,
   ground?:bool }. Per-frame update only touches opacity/scale/visibility.
   ==================================================================== */
var LBL_GROUP = new THREE.Group(); LBL_GROUP.frustumCulled = false; scene.add(LBL_GROUP);
var _lblItems = [];
var _lblLastDay = null, _lblLastVisKey = null;

function _lblClear(){
  for(var i=0;i<_lblItems.length;i++){ var o=_lblItems[i].obj; LBL_GROUP.remove(o); if(o.geometry) o.geometry.dispose(); }
  _lblItems.length = 0;
}
function _lblAdd(obj, bandFn, sublayer, prio, screenPx, ground){
  obj.material.opacity = 0; LBL_GROUP.add(obj);
  // seq = build order — the DETERMINISTIC declutter tiebreak within a priority
  // class (ics11 goal 2): rebuild order is a pure function of date + toggles,
  // so (prio, seq) ordering is identical every frame at the same camera+date.
  _lblItems.push({ obj:obj, band:bandFn, sublayer:sublayer, prio:prio, seq:_lblItems.length, ss:screenPx||0, ground:!!ground, cur:0 });
}

function rebuildLabels(){
  _lblClear();
  var day = simDay;

  /* --- ZONES & LANDMARKS --- */
  if(LABELS_VIS.zones){
    // hills (peak-found; skip a box that never rises to a real hill)
    LBL_HILLS.forEach(function(H){
      var pk = _lblPeakInBox(PLAZA_CENTER.x+H.dx, PLAZA_CENTER.z+H.dz, H.half);
      if(pk.h < H.minH) return;
      _lblAdd(_lblSprite(H.name, LBL_STYLE.hill, pk.x, pk.z, 30), LBL_BANDS.region, "zones", 10, 30, false);
    });
    // ocean / bay (fixed open-water anchors; ics14 — water-host voice)
    LBL_WATERBODIES.forEach(function(W){
      _lblAdd(_lblSprite(W.name, LBL_STYLE[W.style], W.x, W.z, 8), LBL_BANDS[W.band], "zones", 12, W.worldPx, false);
    });
    // named parcels (cove / plaza / camp / mission / presidio) at their pole
    Object.keys(LBL_PARCEL_LABELS).forEach(function(pname){
      var p = parcelByName(pname); if(!p) return;
      if(p.birth!=null && p.birth>day) return;                 // era-gated with the parcel
      var ring = _lblParcelWorldRing(p); if(!ring) return;
      var pole = _lblPolePoint(ring);
      var cfg = LBL_PARCEL_LABELS[pname];
      _lblAdd(_lblSprite(cfg.text, LBL_STYLE[cfg.style], pole.x, pole.z, 10), LBL_BANDS[cfg.band], "zones",
              pname==="yerba-buena-cove"?11:14, cfg.screenPx, false);
    });
  }

  /* --- STREETS (era-gated existence + era-correct name, oriented along line,
         repeat-along-line so one instance is always in frame) --- */
  if(LABELS_VIS.streets){
    STREETS_RUNTIME.forEach(function(s){
      var active = null;
      for(var ci=0; ci<s.checkpoints.length; ci++){ if(s.checkpoints[ci].day<=day) active = s.checkpoints[ci]; }
      if(!active) return;                                      // not surveyed/mentioned yet
      var i0 = active.extent[0], i1 = active.extent[1]; if(i1<=i0) return;
      var name = eraStreetName(s, day);
      var tier = _lblStreetTier(s.cls);
      var prio = _lblStreetPrio(s.cls);
      var pl = _lblStreetPlaces(s.polyline, i0, i1); if(!pl) return;
      pl.centers.forEach(function(sc){
        var ac = _lblArcSample(pl.pts, pl.cum, sc);
        if(terrainHeight(ac.x, ac.z) <= 0.5) return;           // don't float a name over the tide flats
        // item 2: per-arc RIBBON that follows the street + drapes downhill; on a
        // too-bent span fall back to the straight quad (grow=true → altitude scale).
        var rib = _lblStreetRibbon(name, LBL_STYLE.street, pl.pts, pl.cum, pl.total, sc, 10, LBL_BAND_DEFAULT);
        var obj = rib || _lblGroundMesh(name, LBL_STYLE.street, ac.x, ac.z, 10, Math.atan2(ac.tz, ac.tx), true, LBL_BAND_DEFAULT);
        obj.userData.growMax = LBL_ZF_STREET_MAX;              // ics14 LOD: far street text stays small
        _lblAdd(obj, LBL_STREET_LOD[tier], "streets", prio, 0, true);   // ics14 LOD: class-tier altitude ramp
      });
    });
  }

  /* --- LOTS (record lots only: number flat on the ground + owner below) --- */
  if(LABELS_VIS.lots){
    blocksAt(day).forEach(function(bl){
      bl.lots.forEach(function(l){
        var isRecord = (l.source==="record") || (l.owners && l.owners.length);
        if(!isRecord) return;
        var q = lotWorldQuad(l, day).quad; if(!q || q.length<4) return;
        var ring = [q[0],q[1],q[2],q[3]];
        var pole = _lblPolePoint(ring);
        var num = l.lotNumber!=null ? String(l.lotNumber) : (l.lot_number!=null ? String(l.lot_number) : null);
        if(num) _lblAdd(_lblGroundMesh(num, LBL_STYLE.lotNum, pole.x, pole.z, 9, _lblGrid.angle), LBL_BANDS.lotNum, "lots", 40, 0, true);
        if(l.owners && l.owners.length){
          var nm = (typeof l.owners[0]==="string") ? l.owners[0] : (l.owners[0] && l.owners[0].name);
          if(nm){ nm = nm.replace(/\s*\(.*$/,"").trim();       // drop "(uncertain cursive read)" etc.
            var ox = pole.x + _lblGrid.vx*7.5, oz = pole.z + _lblGrid.vz*7.5;   // just "below" the number, down the block
            _lblAdd(_lblGroundMesh(nm, LBL_STYLE.lotOwn, ox, oz, 5.2, _lblGrid.angle), LBL_BANDS.lotOwn, "lots", 41, 0, true);
          }
        }
      });
    });
    /* s91 — LANDMARK RESERVATION NAMES join the LOTS sublayer, civic/commerce
       voice (warm gold small-caps); era-gated (built ≤ day, before any
       in-window burn) so the Dec 24 1849 Great Fire cluster fades as you
       scrub past the fire.
       ics14 item 6.2 (operator's Maps orientation rule): building/landmark
       NAME TEXT is VIEWER-ORIENTED — these were flat ground-rotated quads
       (s91); they are now camera-facing sprites like the zone names (streets
       stay along their street; only the orientation changed — voice, band,
       prio, era gating identical). Lift 8 m keeps the name below its POI
       emblem (13 m). Multi-line wrap still works (sprites stack lines), so
       the ICS-16 close-zoom subtitle line has room to join later.
       ics14d SIZE FLOOR: screenPx 15→30 — 15 px was the PADDED texture box,
       rendering the name's glyph em at ≈5.7 px (the operator's "effectively
       illegible at real sizes"); 30 px puts the em at ≈11.4 px, the Maps
       POI-label size. */
    if(typeof reservationsAt==="function"){
      reservationsAt(day).forEach(function(r){
        if(!r.footprint) return;
        var cx=r.footprint.cx, cz=r.footprint.cz;
        if(terrainHeight(cx,cz) <= 0.3) return;               // don't float a name over water
        _lblAdd(_lblSprite(r.name, LBL_STYLE.civic, cx, cz, 8), LBL_BANDS.landmark, "lots", 34, 30, false);
      });
    }
  }

  /* --- ICS-13 POI SYMBOLS — one category pin per NAMED place: every live
         reservation (built ≤ day, pre-burn — the exact reservationsAt(day) set
         the buildings admission spawns) + the plaza public ground. Registry
         order + plaza = deterministic (prio, seq). NEVER anonymous fill. --- */
  if(LABELS_VIS.symbols){
    var poiBand = _lblPickBand(POI_SS_PX * LBL_DPR);   // fixed screen size ⇒ the band is known up front
    if(typeof reservationsAt==="function"){
      reservationsAt(day).forEach(function(r){
        if(!r.footprint) return;
        var cat = poiCategory(r.landmarkId); if(!cat) return;   // unmapped kind — surfaced by the poiSymbols audit
        var cx=r.footprint.cx, cz=r.footprint.cz;
        if(terrainHeight(cx,cz) <= 0.3) return;                 // same water gate as the reservation name
        // ics14 item 6.1: reveal tier from the record's kind — band ramp +
        // declutter priority step (32+tier ⇒ 33/34/35) in one place.
        var tier = poiTier(_poiKindById[r.landmarkId]);
        _lblAdd(_poiSprite(cat, r.name, cx, cz, poiBand), LBL_POI_TIER_BANDS[tier], "symbols", 32+tier, POI_SS_PX, false);
      });
    }
    // the plaza public ground — the park bucket (era-gated with the parcel).
    // The pin is offset 24 m up-block (-v) from the pole: the zone label
    // "Portsmouth Square" sits AT the pole with prio 14, and a co-anchored
    // prio-33 pin would always lose the declutter and never show. The offset
    // (deterministic, grid-basis) keeps the pin well inside the ~90 m square.
    // ics14: the plaza is kind "plaza" ⇒ reveal tier 1 (a Maps top-tier park).
    var plazaP = (typeof parcelByName==="function") ? parcelByName("portsmouth-square") : null;
    if(plazaP && !(plazaP.birth!=null && plazaP.birth>day)){
      var plazaRing = _lblParcelWorldRing(plazaP);
      if(plazaRing){
        var plazaPole = _lblPolePoint(plazaRing);
        var ppx = plazaPole.x - _lblGrid.vx*24, ppz = plazaPole.z - _lblGrid.vz*24;
        _lblAdd(_poiSprite("park", "Portsmouth Square", ppx, ppz, poiBand), LBL_POI_TIER_BANDS[poiTier("plaza")], "symbols", 32+poiTier("plaza"), POI_SS_PX, false);
      }
    }
  }

  _lblLastDay = Math.floor(simDay);
  _lblLastVisKey = _lblVisKey();
  _lblFlipYaw = null;   // fresh meshes: force a flip recompute on the next frame
}
function _lblVisKey(){ return (LABELS_VIS.lots?"1":"0")+(LABELS_VIS.streets?"1":"0")+(LABELS_VIS.zones?"1":"0")+(LABELS_VIS.symbols?"1":"0"); }

/* ====================================================================
   PER-FRAME UPDATE — opacity by altitude (§11 bands) + priority DECLUTTER via
   the vendored rbush over projected screen boxes, + camera-facing sprite scale
   for a stable on-screen size. Opacity EASES toward its target each frame so
   band cross-fades and declutter hide/show never pop. Wraps renderer.render so
   it runs before every draw (release + atelier) with zero core-loop edits.
   ==================================================================== */
var LBL_HORIZON_H = 52;     // the world-news horizon bar screen rect (top strip) labels avoid
var LBL_DECL_PAD = 3;       // ics11: min screen-px breathing room the declutter reserves around a label
var _lblTree = (typeof RBush!=="undefined") ? new RBush() : null;
var _lblV3 = new THREE.Vector3();
function _lblProject(x, y, z){
  _lblV3.set(x, y, z).project(camera);
  return { x:(_lblV3.x*0.5+0.5)*window.innerWidth, y:(-_lblV3.y*0.5+0.5)*window.innerHeight, front:_lblV3.z<1 };
}
/* ics11 goal 2 — EXACT OVERLAP TEST. The old declutter tested an UNROTATED
   anchor-centered box (w×h of the label as if screen-axis-aligned) — a ground
   strip running diagonally on screen sweeps far outside that box, so diagonal
   label pileups sailed straight through (the s93-era overlap soup). Now each
   label's four WORLD corners are projected to a true screen QUAD; rbush stays
   the broad phase (quad AABB) and a separating-axis test on the convex quads is
   the narrow phase — no false pass on diagonals, no false suppression of two
   parallel strips whose AABBs merely touch. */
function _lblQuadOverlap(A, B){
  var quads = [A, B];
  for(var q=0;q<2;q++){
    var P = quads[q];
    for(var i=0;i<4;i++){
      var j=(i+1)%4, ax=P[j].y-P[i].y, ay=P[i].x-P[j].x;   // outward edge normal
      var minA=1e18,maxA=-1e18,minB=1e18,maxB=-1e18;
      for(var k=0;k<4;k++){
        var pa=A[k].x*ax+A[k].y*ay; if(pa<minA)minA=pa; if(pa>maxA)maxA=pa;
        var pb=B[k].x*ax+B[k].y*ay; if(pb<minB)minB=pb; if(pb>maxB)maxB=pb;
      }
      if(maxA<=minB || maxB<=minA) return false;           // separating axis found
    }
  }
  return true;
}

/* s92 finding #2 — ZOOM-SCALED GROUND LABELS (MapLibre text-size interpolate):
   a `grow` ground label's world-size scales ∝ altitude between clamps, so its
   ON-SCREEN size stays legible as the camera climbs (screen ≈ worldH/dist, and
   dist ∝ alt, so worldH ∝ alt ⇒ near-constant screen height) — then clamps so
   it never runs away. Base size (zf=1) holds through the low street band. */
var LBL_ZF_REF = 300;       // altitude (m) at which grow labels sit at base size
var LBL_ZF_MAX = 6;         // clamp: never bigger than 6x base
function _lblZoomFactor(alt){ var zf = alt/LBL_ZF_REF; return zf<1?1:(zf>LBL_ZF_MAX?LBL_ZF_MAX:zf); }

/* s92 finding #3 — CAMERA-UPRIGHT FLIP. Ground text is WORLD-anchored (fixed to
   the street/lot, does not spin with a pan) but must never render upside-down.
   Project the label's world baseline; if it reads right-to-left on screen (the
   camera has yawed past 90° relative to the text run) add π to the mesh's y-
   rotation — a cheap quad flip, NOT a canvas re-raster. Throttled: recomputed
   only when the camera yaw has settled to a new heading (or on rebuild), never
   per frame. Zone SPRITES are camera-facing billboards → skipped (no dirX). */
var _lblFlipYaw = null, _lblSettleAlt = -1;
/* s93 item 1 — re-raster a label to a new resolution band by swapping its
   material map (cached by style+text+band). Geometry/aspect are band-independent
   so only the texture changes; sprites keep their (band-independent) aspect. */
function _lblSetBand(it, band, weight){
  var o = it.obj, ud = o.userData;
  var wv = weight || null;
  if(ud.band === band && (ud.weightVar || null) === wv) return;
  var e = ud.poi ? poiSymbolTexture(ud.poiCat, band) : labelTexture(ud.text, ud.style, band, wv);
  o.material.map = e.tex; o.material.needsUpdate = true; ud.band = band; ud.weightVar = wv;
  if(!it.ground) o.userData.aspect = e.aspect;   // sprites size from userData.aspect
  // ics14 weight step: a weight variant changes glyph advances → the texture
  // aspect. Ground geometry was built for the base-weight aspect; refresh it
  // when the aspect drifts so bold never renders squashed into a medium quad.
  // Settle-gated (same cadence as the band swap), never per frame.
  if(it.ground && e.aspect && ud.aspect && Math.abs(e.aspect - ud.aspect) > 0.002) _lblGroundReshape(it, e.aspect);
  it._texelH = e.texelH;
}
/* rebuild a ground label's geometry for a new texture aspect (ics14 weight
   step). Ribbon: re-span s0/s1 about the same arc centre (the ±4-6% span change
   of a weight swap does not re-run the curvature gate — the word was already
   accepted at this spot) and re-drape. Quad: swap the PlaneGeometry. */
function _lblGroundReshape(it, aspect){
  var o = it.obj, ud = o.userData;
  if(ud.ribbon){
    var scen = (ud.s0 + ud.s1) / 2, total = ud.cum[ud.cum.length - 1];
    var wordW = ud.worldH * aspect;
    var s0 = scen - wordW/2, s1 = scen + wordW/2;
    if(s0 < 0){ s1 -= s0; s0 = 0; }
    if(s1 > total){ s0 -= (s1 - total); s1 = total; if(s0 < 0) s0 = 0; }
    ud.s0 = s0; ud.s1 = s1; ud.aspect = aspect;
    var old = o.geometry;
    o.geometry = _lblRibbonGeom(ud);
    old.dispose();
    _lblRibbonSetFlip(o, ud.flip);
  } else {
    var gp = o.geometry.parameters, gh = gp ? gp.height : (ud.worldH || 10);
    var g2 = new THREE.PlaneGeometry(gh * aspect, gh); g2.rotateX(-Math.PI/2);
    var oldG = o.geometry;
    o.geometry = g2;
    oldG.dispose();
    ud.aspect = aspect;
  }
}
function _lblComputeFlips(){
  var EPS = 6;   // world metres along the baseline to sample screen direction
  for(var i=0;i<_lblItems.length;i++){
    var o = _lblItems[i].obj;
    if(!_lblItems[i].ground || o.userData.dirX===undefined) continue;
    var p0 = _lblProject(o.position.x, o.position.y, o.position.z);
    var p1 = _lblProject(o.position.x + o.userData.dirX*EPS, o.position.y, o.position.z + o.userData.dirZ*EPS);
    if(!p0.front || !p1.front) continue;
    var flip = (p1.x - p0.x) < 0;                 // baseline runs leftward on screen ⇒ inverted
    if(flip !== o.userData.flip){
      // s93 item 2 — the WHOLE WORD is the flip unit. A ribbon can't spin 180°
      // (that unwinds it off the curve), so it flips by reversing its u+v; a
      // straight quad keeps the s92 ±π rotation.
      if(o.userData.ribbon) _lblRibbonSetFlip(o, flip);
      else { o.userData.flip = flip; o.rotation.y = o.userData.baseRotY + (flip?Math.PI:0); }
    }
  }
}
function updateLabels(){
  if(!LABELS_VIS.parent){ for(var q=0;q<_lblItems.length;q++){ var it0=_lblItems[q]; it0.cur+= (0-it0.cur)*0.3; it0.obj.material.opacity=it0.cur; it0.obj.visible=it0.cur>0.01; } return; }
  // rebuild the label set when the date or sublayer selection changed
  if(Math.floor(simDay)!==_lblLastDay || _lblVisKey()!==_lblLastVisKey) rebuildLabels();

  var alt = (typeof lastKnownAlt==="number" && lastKnownAlt>0) ? lastKnownAlt : 800;
  var vpH = window.innerHeight, fovK = 2*Math.tan(camera.fov*Math.PI/360)/vpH; // world-per-screen-px at unit distance
  var zf = _lblZoomFactor(alt);   // finding #2: altitude → world-size scale for `grow` labels

  // finding #3 + item 1: recompute camera-upright flips AND re-raster bands only
  // when the view has SETTLED to a new heading OR a materially new altitude
  // (throttled) — or after a rebuild reset _lblFlipYaw to null. Band depends on
  // altitude (zoom), so a big alt change must re-trigger the band pass.
  var yawNow = (typeof CAM!=="undefined" && CAM) ? CAM.yaw : 0;
  var settle = (_lblFlipYaw===null || Math.abs(yawNow-_lblFlipYaw) > 0.05
               || _lblSettleAlt<0 || Math.abs(alt-_lblSettleAlt)/Math.max(1,_lblSettleAlt) > 0.08);
  if(settle) _lblComputeFlips();

  // 1) compute each item's target (band × sublayer) + screen box; collect visible
  var cands = [];
  for(var i=0;i<_lblItems.length;i++){
    var it = _lblItems[i], target = it.band(alt) * (LABELS_VIS[it.sublayer]?1:0);
    it._target = target;
    // apply the altitude scale up-front so the declutter box below sees the
    // real on-screen footprint (a grown label reserves more space). Ribbons are
    // anchor-relative, so setScalar grows them about their centre like a quad.
    // ics14 LOD: a per-item growMax (streets: 2×) caps the altitude growth so
    // far street names stay small/discreet instead of ballooning to 6×.
    if(it.ground && it.obj.userData.grow) it.obj.scale.setScalar(Math.min(zf, it.obj.userData.growMax || LBL_ZF_MAX));
    if(target < 0.02){ it._box = null; it._quad = null; continue; }
    var p = _lblProject(it.obj.position.x, it.obj.position.y, it.obj.position.z);
    if(!p.front){ it._box = null; it._quad = null; it._target = 0; continue; }
    // ground geometry may be a PlaneGeometry (parameters) or a ribbon (userData)
    var gp = it.ground ? it.obj.geometry.parameters : null;
    var aspect = it.ground ? (gp ? gp.width/gp.height : it.obj.userData.aspect) : it.obj.userData.aspect;
    var hPx, hPxRaw, quad = null;
    if(it.ground){
      var gH = gp ? gp.height : it.obj.userData.worldH;
      var dist = camera.position.distanceTo(it.obj.position);
      var dpk = dist*fovK;
      hPx = (gH * it.obj.scale.y) / Math.max(1, dpk);                    // declutter-box height (legacy clamp kept)
      hPxRaw = (gH * it.obj.scale.y) / Math.max(0.0001, dpk);            // TRUE on-screen height → band selection (item 1)
      // ics11 goal 2: TRUE screen quad — project the label's four WORLD corners
      // (reading dir × ground perpendicular, inflated by the pad in world metres)
      // instead of pretending the strip is screen-axis-aligned. A ribbon is
      // approximated by its straight chord box (curvature capped at LBL_CURV_MAX).
      var ud2 = it.obj.userData;
      if(ud2.dirX!==undefined){
        var padW = LBL_DECL_PAD * dpk;
        var hwd = (gH*aspect*it.obj.scale.y)/2 + padW, hhd = (gH*it.obj.scale.y)/2 + padW;
        var px0=it.obj.position.x, py0=it.obj.position.y, pz0=it.obj.position.z;
        var qs=[], sgn=[[-1,-1],[1,-1],[1,1],[-1,1]], okQ=true;
        for(var cq=0;cq<4 && okQ;cq++){
          var cxw = px0 + ud2.dirX*hwd*sgn[cq][0] - ud2.dirZ*hhd*sgn[cq][1];
          var czw = pz0 + ud2.dirZ*hwd*sgn[cq][0] + ud2.dirX*hhd*sgn[cq][1];
          var pc = _lblProject(cxw, py0, czw);
          if(!pc.front) okQ=false; else qs.push({x:pc.x, y:pc.y});
        }
        if(okQ) quad = qs;
      }
    } else {
      hPx = it.ss * (it.obj.userData.lines||1); hPxRaw = hPx;            // sprite: constant on-screen px (scaled below)
    }
    if(!quad){   // sprite (already screen-aligned), or a ground corner behind the near plane
      var wq = hPx*aspect/2 + LBL_DECL_PAD, hq = hPx/2 + LBL_DECL_PAD;
      quad = [{x:p.x-wq,y:p.y-hq},{x:p.x+wq,y:p.y-hq},{x:p.x+wq,y:p.y+hq},{x:p.x-wq,y:p.y+hq}];
    }
    var mnX=1e18,mnY=1e18,mxX=-1e18,mxY=-1e18;
    for(var qk=0;qk<4;qk++){ var qp=quad[qk]; if(qp.x<mnX)mnX=qp.x; if(qp.x>mxX)mxX=qp.x; if(qp.y<mnY)mnY=qp.y; if(qp.y>mxY)mxY=qp.y; }
    it._box = { minX:mnX, minY:mnY, maxX:mxX, maxY:mxY };
    it._quad = quad;
    it._px = p; it._hPx = hPx; it._hPxRaw = hPxRaw;
    cands.push(it);
  }

  // item 1: BAND RE-RASTER PASS (throttled with the settle gate). Each visible
  // label picks the smallest band ≥ its on-screen height (texel≈screen) and
  // swaps its map if that changed — off the hot per-frame path, so a settled
  // camera pays the raster once per band transition.
  if(settle){
    // ics11 goal 1: band pick in DEVICE px — × devicePixelRatio so HiDPI gets
    // enough texels for its physical pixels (texel ≈ device pixel).
    // ics14: the WEIGHT STEP rides the same settle gate — a style with
    // weightNear (streets) picks Bold when its APPARENT size (CSS px, not
    // device px: weight is a zoom-style choice, not a raster-density one)
    // reaches weightNearPx. Maps behavior: bold white close up.
    for(var bi=0; bi<cands.length; bi++){
      var itb=cands[bi], stb=itb.obj.userData.style, wv=null;
      if(stb && stb.weightNear && itb._hPxRaw >= stb.weightNearPx) wv = stb.weightNear;
      _lblSetBand(itb, _lblPickBand(itb._hPxRaw * LBL_DPR), wv);
    }
    _lblFlipYaw = yawNow; _lblSettleAlt = alt;
  }

  // 2) priority declutter (rbush broad phase + SAT narrow phase, ics11 goal 2):
  // reserve the horizon bar, then place high-prio (low `prio` number) first in
  // (prio, seq) order — seq is the build index, so the ordering is a pure
  // function of the label set, stable across frames (no size-crossing swaps,
  // no dice). A candidate whose padded quad intersects a placed quad is
  // suppressed; it reappears the moment space frees up (zooming in).
  if(_lblTree){
    _lblTree.clear();
    _lblTree.insert({ minX:0, minY:0, maxX:window.innerWidth, maxY:LBL_HORIZON_H, quad:null });
    cands.sort(function(a,b){ return a.prio-b.prio || a.seq-b.seq; });
    for(var c=0;c<cands.length;c++){
      var it2 = cands[c], bx = it2._box;
      var hits = _lblTree.search(bx), blocked = false;
      for(var h=0; h<hits.length && !blocked; h++){
        blocked = !hits[h].quad || _lblQuadOverlap(it2._quad, hits[h].quad);   // null quad = the horizon bar (AABB hit is enough)
      }
      if(blocked){ it2._target = 0; }
      else _lblTree.insert({ minX:bx.minX, minY:bx.minY, maxX:bx.maxX, maxY:bx.maxY, quad:it2._quad });
    }
  }

  // 3) ease every item toward its target (band × declutter); scale sprites for
  // a stable on-screen size. Easing is why cross-fades and hide/show never pop.
  for(var k=0;k<_lblItems.length;k++){
    var itf = _lblItems[k];                 // culled/decluttered items already have _target = 0
    itf.cur += (itf._target - itf.cur) * 0.28;
    if(itf._target < 0.004 && itf.cur < 0.004) itf.cur = 0;
    itf.obj.material.opacity = itf.cur;
    itf.obj.visible = itf.cur > 0.01;
    if(!itf.ground && itf.obj.visible){
      var dist2 = camera.position.distanceTo(itf.obj.position);
      var wH = Math.max(1, dist2*fovK*itf.ss*(itf.obj.userData.lines||1)); // world height for the target screen px (per line)
      itf.obj.scale.set(wH*itf.obj.userData.aspect, wH, 1);
    }
  }
}

/* wrap renderer.render — labels update immediately before every draw (mirrors
   the workbench's per-frame hook; composes with it since labels load first). */
var _lblPrevRender = renderer.render.bind(renderer);
renderer.render = function(s,c){ try{ updateLabels(); }catch(e){ if(!updateLabels._warned){ console.warn("[labels] update failed", e); updateLabels._warned=true; } } _lblPrevRender(s,c); };

/* ---- dev-tooling interface (layers-spec §15) + sublayer control for the
   atelier's tri-state family. The parent toggle hides the whole group; the
   three sublayers gate their own labels (rebuild picks up the change). ---- */
registerLayerVisibility("labels", function(v){ LABELS_VIS.parent = v; LBL_GROUP.visible = v; });
function labelsSetSublayer(key, on){ if(key in LABELS_VIS){ LABELS_VIS[key] = on; } }
function labelsGetSublayer(key){ return !!LABELS_VIS[key]; }
/* s93 item 4 — flip the typography option set at runtime (atelier / harness
   triptych). Rebuilds the label set with the new voices on the next update. */
function labelsSetTypeSet(k){
  if(!LBL_STYLE_SETS[k]) return false;
  LABEL_TYPE_SET = k; LBL_STYLE = LBL_STYLE_SETS[k];
  _lblLastDay = null; _lblLastVisKey = null;   // force a rebuild with the new styles
  return true;
}
function labelsGetTypeSet(){ return LABEL_TYPE_SET; }
/* driving hooks for the verify harness. This layer (chunk 40) runs BEFORE
   core/06-debug (chunk 70) creates window.__P1850, so attach on the next tick —
   after the synchronous module IIFE finishes and __P1850 exists. Lets the harness
   screenshot a/b/c + read the texture budget without reaching into the closure. */
setTimeout(function(){
  if(typeof window!=="undefined" && window.__P1850){
    window.__P1850.labelsSetTypeSet = labelsSetTypeSet;
    window.__P1850.labelsGetTypeSet = labelsGetTypeSet;
    window.__P1850.labelsTexBudget  = labelsTexBudget;
  }
}, 0);

/* audit + QA hooks live in core/06-debug (labels namespace) — this layer exposes
   the live set through a getter the debug registry reads. */
function labelsLiveSet(){
  var out = [];
  for(var i=0;i<_lblItems.length;i++){ var it=_lblItems[i];
    if(it.cur>0.02) out.push({ text:it.obj.userData.text, sublayer:it.sublayer, prio:it.prio, x:Math.round(it.obj.position.x), z:Math.round(it.obj.position.z), op:+it.cur.toFixed(2), box:it._box||null });
  }
  return out;
}
/* full built set (ignores opacity/declutter) — QA/audit ground truth: what the
   current date + sublayer selection produced, before the zoom bands gate it. */
function labelsBuiltSet(){
  return _lblItems.map(function(it){ return { text:it.obj.userData.text, sublayer:it.sublayer, prio:it.prio,
    x:Math.round(it.obj.position.x), z:Math.round(it.obj.position.z), ground:it.ground }; });
}

/* ---- AUDIT 1 — eraNames (item B; grounding §11 era-correct names). The period-
   correct street name renders at the sim date: pre-1847-11-03 the plat names
   (Howard / Bartlett), the modern names after. FAILS BEFORE the eraNames data
   (falls back to the modern name at 1846), PASSES after.
   ics14d NOTE (operator override, documented): this audit asserts era-correct
   street NAMES only — it never asserted a typeface, so it survives the
   directive that suspended the serif ERA VOICES (Georgia/Palatino/Didot style
   sets → uniform Roboto street treatment; see LBL_STYLE_SETS). Era-dated
   naming stays law; era TYPOGRAPHY polish returns in a later sprint. ---- */
var LBL_ERA_FLIP = eventDateToSimDay("1847-11-03");
registerAudit("labels", "eraNames", function(){
  var want = [ { id:"sacramento", pre:"Howard",   post:"Sacramento" },
               { id:"pacific",    pre:"Bartlett", post:"Pacific" } ];
  var checks = [], bad = [];
  want.forEach(function(w){
    var s = STREETS_RUNTIME_BY_ID[w.id]; if(!s) return;
    var got = eraStreetName(s, simDay), expect = (simDay < LBL_ERA_FLIP) ? w.pre : w.post;
    checks.push({ id:w.id, got:got, expect:expect });
    if(got.toLowerCase().indexOf(expect.toLowerCase()) < 0) bad.push({ id:w.id, got:got, expect:expect });
  });
  return { pass: bad.length===0, date:simDateISO(dateFromSimDay(simDay)), checks:checks, bad:bad };
});

/* ---- AUDIT 2 — anchorsInside (the verbatim acceptance: a label must be
   attributable to its subject at a glance). Every ground/zone label anchor is
   the polylabel pole of its subject polygon — verify each pole lies INSIDE its
   lot quad / parcel ring, so no label floats off its subject. ---- */
registerAudit("labels", "anchorsInside", function(){
  var bad = [], n = 0;
  blocksAt(simDay).forEach(function(bl){ bl.lots.forEach(function(l){
    if(!((l.source==="record") || (l.owners && l.owners.length))) return;
    var q = lotWorldQuad(l, simDay).quad; if(!q || q.length<4) return;
    var pole = _lblPolePoint([q[0],q[1],q[2],q[3]]); n++;
    if(!cadPointInPoly(q, pole.x, pole.z)) bad.push({ lot:l.lotNumber, x:Math.round(pole.x), z:Math.round(pole.z) });
  }); });
  Object.keys(LBL_PARCEL_LABELS).forEach(function(pn){
    var p = parcelByName(pn); if(!p || (p.birth!=null && p.birth>simDay)) return;
    var ring = _lblParcelWorldRing(p); if(!ring) return;
    var pole = _lblPolePoint(ring); n++;
    if(!cadPointInPoly(ring, pole.x, pole.z)) bad.push({ parcel:pn, x:Math.round(pole.x), z:Math.round(pole.z) });
  });
  return { pass: bad.length===0, anchorsChecked:n, bad:bad };
});

/* ---- AUDIT 3 — contrast (s92 finding #1, verbatim: "same background fill
   color, making it very hard to read"). METHOD (stated honestly): the labels
   are HALOED, so a glyph never abuts the terrain directly — its effective
   background is its own halo, and the halo's job is to separate the text mass
   from whatever ground it lands on. So we do NOT measure glyph-vs-terrain (that
   is intentionally low and irrelevant); we measure the DUAL-HALO system:
     • ringSep(bg)   = max( contrast(darkInner⊕bg, bg), contrast(lightOuter⊕bg, bg) )
                       — the dual-halo guarantee: on a bright amber bg the dark
                         inner ring carries the edge; on a dark road/shadow bg
                         the light outer glow carries it; we take whichever wins.
     • glyphVsInner  = contrast(glyphColor, darkInner⊕bg) — the ink vs its ring.
   The per-style score is min over the EARTH PALETTE (grounding §9: brightest
   sunlit sand → darkest hillshade/road-paint, plus the cove's water) of
   min(ringSep, glyphVsInner). Contrast is WCAG relative-luminance; semi-
   transparent halos are alpha-composited over each background first. GATE: every
   style's worst-case ≥ 3.0 (readable-text floor for haloed labels). FAILS BEFORE
   the dual halo (a single 0.82 dark stroke drops below 3:1 on the dark road/
   shadow backgrounds); PASSES after. Date-independent (palette + styles fixed).
   ICS-14 STRENGTHENING (operator's host-surface polarity rule): [1] the rings
   are now read from EACH STYLE (inner = style.haloColor — the street voice
   carries a Maps dark-grey casing, districts a light one), so the audit
   measures the styles' ACTUAL rings instead of assuming the global dark/light
   pair; [2] every background is tagged with its SURFACE FAMILY (land / road /
   water) and every style with the family it is HOSTED on — the audit gates
   BOTH the all-background worst case (≥3.0, unchanged — labels can overhang
   their host) AND the host-family worst case, and reports the per-background
   tables for the street + district voices (the operator's decision record);
   [3] grassGreen joins the palette (district host includes the green hills);
   [4] the street Bold weight variant shares the Medium colors, so one
   measurement covers both zoom weights.
   ICS-14b — NO-GLOW VOICES (operator: the outer glow smeared into fog at
   grazing angles; Maps labels are ink + thin casing only). For glow:false
   styles the raster paints NO outer ring, so the audit measures what is
   actually there: the separation guarantee becomes
     ringSep(bg) = max( contrast(casing⊕bg, bg), contrast(ink, bg) )
   — on backgrounds OPPOSITE the casing's polarity the casing carries the
   silhouette edge; on backgrounds MATCHING the casing (where the casing
   melts in) the visible boundary is the INK itself against the ground, and
   its direct contrast carries the read (white-on-dark road: exactly Maps'
   satellite-mode streets). The one voice still carrying the dual halo
   (water) keeps the s92 two-ring formula unchanged.
   ICS-14c — GLANCE-INK GATE + ROOF GREYS (operator screenshots: gold
   business names unreadable over sand + grey placeholder roofs — yet the
   audit PASSED them at 4.3, because ringSep's max() lets a strong casing
   hide an ink body with no direct contrast of its own; the acceptance law
   is read-at-a-GLANCE, and at glance sizes the ink body is the label).
   Strengthened to measure that property: [1] the ROOF GREY family joins the
   background palette (placeholder body 0x9ea19c — the operator's sampled
   grey — flat cap 0x868984, civic tint 0xb7c1c7): landmark/business + lot
   text sits OVER buildings, so roofs are those voices' host too; [2] HOST_FAM
   values are now SETS (civic/lotNum/lotOwn host = land + roof); [3] GLANCE
   voices (street, civic, lotNum, lotOwn — the small read-at-a-glance names)
   take inkVsBg as a MIN component on their HOST backgrounds (not max):
   score = min(ringSep, inkVsCasing, inkVsHost). Districts/regions/hills
   render large + letter-spaced at altitude (silhouette-read, not glance-
   read) and keep the ics14b model; water keeps the dual halo. FAILS BEFORE
   (gold civic ink vs the light roof tint = 1.30); PASSES after (#332e26
   landmark ink ≥3.48 on every host background).
   ICS-14d — THE UNIFORM MAPS-SATELLITE MODEL (operator directive 2026-07-16:
   every voice takes the street treatment — white ink, dark casing, no glow;
   the ics14c dark-ink pairing and its glance inkVsHost gate are SUPERSEDED).
   With white ink on our mostly-LIGHT hosts (sand/roofs) the ink body can
   NEVER directly clear the host — the separation is carried by the CASING
   RIM around every glyph (exactly Google Maps' satellite streets, which are
   white-filled with a dark border on bright imagery). The audit measures
   what is actually painted, per voice per background:
     inkVsCasing = contrast(ink, casing⊕bg)      — glyph body vs its own rim
     casingVsBg  = contrast(casing⊕bg, bg)       — the rim edge vs the host
     inkVsBg     = contrast(ink, bg)             — the ink edge vs the host
     carrier(bg) = max(casingVsBg, inkVsBg)      — on LIGHT surfaces the dark
                   rim carries (casingVsBg ≥3.0 there — the operator's
                   white-on-light rule holds literally on every light host);
                   on DARK surfaces the casing melts in and the WHITE INK is
                   the visible boundary (Maps satellite mode; a dark rim can
                   never clear a dark host, so the literal casing-vs-host
                   gate is physically unsatisfiable there and the ink gates
                   instead — stated, not hidden)
     score(bg)   = min(inkVsCasing, carrier)
   GATE: score ≥3.0 on EVERY background (all-palette, stronger than the old
   host-only glance gate) for EVERY voice; host-family minima still tracked
   and reported. Per-background decision tables are reported for ALL voices
   (the operator's record). The dual-halo branch is gone — no voice paints a
   glow anymore (water switched to a blue-tinted ink under the same casing).
   FAILS BEFORE ics14d on the OLD styles (dark sepia civic ink vs its light
   casing was the read; under this model the old water dual-halo styles are
   simply absent); PASSES after: worst case ≈3.47 (water on rocky, carried
   by the casing rim). */
function _lblSrgbToLin(c){ c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
function _lblRelLum(rgb){ return 0.2126*_lblSrgbToLin(rgb[0]) + 0.7152*_lblSrgbToLin(rgb[1]) + 0.0722*_lblSrgbToLin(rgb[2]); }
function _lblContrast(a,b){ var la=_lblRelLum(a), lb=_lblRelLum(b), hi=Math.max(la,lb), lo=Math.min(la,lb); return (hi+0.05)/(lo+0.05); }
function _lblHex(h){ return [(h>>16)&255,(h>>8)&255,h&255]; }
function _lblParseRgba(s){ var m=s.match(/rgba?\(([^)]+)\)/); var p=m[1].split(",").map(function(v){return parseFloat(v);}); return { rgb:[p[0],p[1],p[2]], a:(p[3]==null?1:p[3]) }; }
function _lblParseCss(col){ if(col[0]==="#"){ var h=col.slice(1); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; } return _lblParseRgba(col).rgb; }
function _lblParseCssA(col){ if(col[0]==="#") return { rgb:_lblParseCss(col), a:1 }; return _lblParseRgba(col); }
function _lblComposite(src, a, bg){ return [src[0]*a+bg[0]*(1-a), src[1]*a+bg[1]*(1-a), src[2]*a+bg[2]*(1-a)]; }
registerAudit("labels", "contrast", function(){
  // THE EARTH PALETTE a ground/zone label can land on (albedos, grounding §9;
  // the darkest entries stand in for hillshade + road-paint + shadow — runtime
  // lighting only darkens the bright end, which the light glow is built for).
  // ics14: each entry carries its SURFACE FAMILY (host tagging).
  var BG = [
    { name:"sand",       fam:"land",  rgb:_lblHex(0xb7a06f) },  // brightest sunlit ground
    { name:"duneGold",   fam:"land",  rgb:_lblHex(0xa98e58) },
    { name:"village",    fam:"land",  rgb:_lblHex(0xa8905f) },  // town dirt
    { name:"scrubDry",   fam:"land",  rgb:_lblHex(0x8c8a52) },
    { name:"rocky",      fam:"land",  rgb:_lblHex(0x977e55) },
    { name:"grassGreen", fam:"land",  rgb:_lblHex(0x6f8b4e) },  // ics14: green hill grass (district host)
    { name:"roofLight",  fam:"roof",  rgb:_lblHex(0xb7c1c7) },  // ics14c: lightest placeholder tint (LM_TINT.civic)
    { name:"roofBody",   fam:"roof",  rgb:_lblHex(0x9ea19c) },  // ics14c: placeholder body grey (the operator's sample)
    { name:"roofCap",    fam:"roof",  rgb:_lblHex(0x868984) },  // ics14c: flat roof cap (LM_PLACEHOLDER.roof)
    { name:"plank",      fam:"road",  rgb:_lblHex(0x9c8560) },  // planked deck (street names cross wharves)
    { name:"road",       fam:"road",  rgb:_lblHex(0x6b5838) },  // road-paint band — the STREET-label host
    { name:"ghost",      fam:"road",  rgb:_lblHex(0x5c4e33) },  // surveyor ghost line
    { name:"shadow",     fam:"shade", rgb:_lblHex(0x3a2a14) },  // darkest hillshade (nobody's host; still gated)
    { name:"waterLo",    fam:"water", rgb:_lblHex(0x8fc2c9) },  // bright shallow (cove label)
    { name:"waterHi",    fam:"water", rgb:_lblHex(0x2a5570) }
  ];
  // ics14 — the surface families each voice is HOSTED on (retained for the
  // per-host reporting; every voice now shares the same white-ink/dark-casing
  // pairing, so hosts inform the REPORT rather than choose an ink).
  var HOST_FAM = { street:["road"], region:["land"], hill:["land"], place:["land"],
                   civic:["land","roof"], lotNum:["land","roof"], lotOwn:["land","roof"], water:["water"] };
  var GATE = 3.0, styles = [], worst = { style:null, bg:null, ratio:1e9 };
  Object.keys(LBL_STYLE).forEach(function(key){
    var st = LBL_STYLE[key], ink = _lblParseCss(st.color), casing = _lblParseCssA(st.haloColor);
    var hostFams = HOST_FAM[key] || null;
    var sMin = 1e9, sBg = null, hMin = 1e9, hBg = null, perBg = [];
    BG.forEach(function(b){
      var eCase = _lblComposite(casing.rgb, casing.a, b.rgb);
      var inkVsCasing = _lblContrast(ink, eCase);    // glyph body vs its own rim (white/dark-grey ≈ 12-13:1)
      var casingVsBg  = _lblContrast(eCase, b.rgb);  // rim edge vs host — the carrier on LIGHT surfaces
      var inkVsBg     = _lblContrast(ink, b.rgb);    // ink edge vs host — the carrier on DARK surfaces (Maps satellite mode)
      var carrier = Math.max(casingVsBg, inkVsBg);
      var here = Math.min(inkVsCasing, carrier);
      var isHost = hostFams !== null && hostFams.indexOf(b.fam) >= 0;
      perBg.push({ bg:b.name, host:isHost, inkVsCasing:+inkVsCasing.toFixed(2),
                   casingVsBg:+casingVsBg.toFixed(2), inkVsBg:+inkVsBg.toFixed(2), score:+here.toFixed(2) });
      if(here < sMin){ sMin = here; sBg = b.name; }
      if(isHost && here < hMin){ hMin = here; hBg = b.name; }
    });
    styles.push({ style:key, minRatio:+sMin.toFixed(2), worstBg:sBg, hostFam:hostFams,
                  hostMin:(hMin<1e9 ? +hMin.toFixed(2) : null), hostWorstBg:hBg, perBg:perBg });
    if(sMin < worst.ratio){ worst = { style:key, bg:sBg, ratio:+sMin.toFixed(2) }; }
  });
  // gate the ALL-background worst case for every voice (labels overhang their
  // hosts; the palette-wide min is the stronger, honest gate) — the per-host
  // minima are reported alongside for the operator's record.
  var bad = styles.filter(function(s){ return s.minRatio < GATE || (s.hostMin !== null && s.hostMin < GATE); });
  return { pass: bad.length===0, gate:GATE,
           method:"ics14d uniform Maps-satellite model, every voice: score(bg)=min(inkVsCasing, max(casingVsBg, inkVsBg)) ≥3.0 over the FULL earth+roof palette; on light hosts the dark casing rim carries (casingVsBg ≥3.0 there — the operator's white-on-light rule, literal); on dark hosts the white ink is the boundary (a dark rim cannot clear a dark host — stated, not hidden); per-background tables reported for every voice; street Bold shares Medium colors (one measurement, both weights)",
           minContrastRatio: worst.ratio, worstCase: worst, styles: styles, bad: bad };
});

/* ---- AUDIT 4 — crispness (s93 item 1, user finding: "text blurry at altitude").
   METHOD (stated honestly): a canvas-texture label is sharp when its texture
   resolution matches its on-screen size — the effective TEXEL-PER-SCREEN-PIXEL
   ratio should sit near 1 (below ~0.5 the texture is magnified = fuzzy; above
   ~2 it is deeply minified and the mip/aniso footprint softens on a grazing
   ground plane, which is exactly the s90/s92 blur). The per-band re-raster picks,
   for each label, the smallest band ≥ its on-screen height, so the ratio is
   band ÷ screenPx. We evaluate the STREET case (the user's subject) at 3
   altitudes {300, 900, 1800} m, using the live camera fov + viewport and the
   grow zoom-factor: worldH = 10 m, near-overhead viewing distance ≈ alt, so
   screenPx = worldH·zf(alt) ÷ (alt·fovK). GATE: every sampled ratio in
   [0.5, 2.0] AND the texture budget within cap. FAILS BEFORE (the old fixed
   ~500 px master shown at ~32 screen px = ratio ~15, far above 2.0); PASSES
   after (band selection holds the ratio in [1,2)). Camera-independent except for
   fov/vpH; runs at any date. ---- */
registerAudit("labels", "crispness", function(){
  var vpH = (typeof window!=="undefined" && window.innerHeight) ? window.innerHeight : 1000;
  var fovDeg = (typeof camera!=="undefined" && camera && camera.fov) ? camera.fov : 55;
  var fovK = 2*Math.tan(fovDeg*Math.PI/360)/vpH;
  var worldH = 10, alts = [300, 900, 1800], GATE_LO = 0.5, GATE_HI = 2.0;
  var rows = [], ok = true, worst = { alt:null, ratio:1 };
  alts.forEach(function(alt){
    // ics14: mirror the runtime STREET growth cap (LBL_ZF_STREET_MAX, LOD item
    // 1 — far street names stay small). Above ~600 m the on-screen height now
    // SHRINKS with altitude instead of holding ~32 px; the 16/24 band rungs
    // keep texel≈screen down there.
    var zf = alt/LBL_ZF_REF; zf = zf<1?1:(zf>LBL_ZF_MAX?LBL_ZF_MAX:zf);
    zf = Math.min(zf, LBL_ZF_STREET_MAX);
    var dist = alt;                                   // representative near-overhead street viewing distance
    var screenPx = (worldH*zf)/Math.max(0.0001, dist*fovK);   // TRUE on-screen height (no declutter clamp)
    // ics11: band pick + ratio in DEVICE px (× devicePixelRatio), mirroring the
    // runtime pick — a HiDPI display must not undersample its physical pixels.
    var devPx = screenPx * LBL_DPR;
    var band = _lblPickBand(devPx);
    var ratio = band/Math.max(0.001, devPx);          // texel(=band px) per device px
    rows.push({ alt:alt, zf:+zf.toFixed(2), screenPx:+screenPx.toFixed(1), devPx:+devPx.toFixed(1), band:band, texelPerScreen:+ratio.toFixed(2) });
    if(ratio < GATE_LO || ratio > GATE_HI) ok = false;
    if(Math.abs(ratio-1.25) > Math.abs(worst.ratio-1.25)) worst = { alt:alt, ratio:+ratio.toFixed(2) };
  });
  var bud = labelsTexBudget();
  return { pass: ok && bud.withinBudget, gate:[GATE_LO, GATE_HI],
           method:"street case: texelPerScreen = band ÷ (worldH·zf·dpr ÷ (alt·fovK)), zf capped at the ics14 street growth cap "+LBL_ZF_STREET_MAX+"; band = smallest of ["+LBL_BAND_PX.join(",")+"] ≥ screenPx·dpr; fov "+(+fovDeg.toFixed(1))+"°, vpH "+vpH+", dpr "+LBL_DPR,
           samples: rows, worst: worst, texture: bud };
});

/* ---- AUDIT 5 — declutter (ics11 goal 2, operator verbatim: "prevent overlap").
   PROPERTY: no two PLACED labels' screen quads intersect. METHOD (stated
   honestly): re-runs the separating-axis test pairwise over every label the
   last frame's declutter placed (_target > 0), using the same projected corner
   quads the placer reserved — so this is a consistency proof of the placer
   (rbush broad phase + SAT narrow phase in (prio,seq) order), not an independent
   pixel measurement; the ribbon quad is the straight chord approximation
   (curvature ≤ LBL_CURV_MAX). FAILS BEFORE ics11 (the axis-aligned anchor box
   let diagonal strips pile up — the s93-era label soup in the town framing);
   PASSES after. Runs at any date/camera; pure function of the last frame. ---- */
registerAudit("labels", "declutter", function(){
  var placed = [];
  for(var i=0;i<_lblItems.length;i++){ var it=_lblItems[i];
    if(it._target>0.02 && it._quad) placed.push(it); }
  var bad = [], suppressed = 0;
  for(var s=0;s<_lblItems.length;s++){ var t=_lblItems[s]; if(t._quad && !(t._target>0.02)) suppressed++; }
  for(var a=0;a<placed.length;a++){
    for(var b=a+1;b<placed.length;b++){
      if(_lblQuadOverlap(placed[a]._quad, placed[b]._quad))
        bad.push({ a:placed[a].obj.userData.text, b:placed[b].obj.userData.text, prioA:placed[a].prio, prioB:placed[b].prio });
    }
  }
  return { pass: bad.length===0, placed:placed.length, suppressed:suppressed,
           method:"pairwise SAT over the placed labels' projected screen quads (same quads the declutter reserved; padded by "+LBL_DECL_PAD+"px)",
           bad: bad.slice(0,8) };
});

/* ---- AUDIT 6 — wrap (ics11 goal 3, operator verbatim: "implement word
   wrapping for long labels"). PROPERTY: every built label whose style declares
   `wrap` and whose single-line layout width exceeds the wrap limit actually
   rasterized as ≥2 lines, and every produced line fits the limit (a single
   unbreakable word is exempt). Streets carry no wrap — one line along the road
   by design. FAILS BEFORE ics11 (userData.lines is undefined — every long
   owner/civic name was one enormous strip); PASSES after. Date-dependent set;
   pass-with-zero-checked when the date has no wrappable labels (not a skip). */
registerAudit("labels", "wrap", function(){
  var bad = [], checked = 0;
  for(var i=0;i<_lblItems.length;i++){
    var ud = _lblItems[i].obj.userData, st = ud.style;
    if(!st || !st.wrap) continue;
    checked++;
    var disp = st.smallCaps ? String(ud.text).toUpperCase() : String(ud.text);
    var limit = st.wrap * LBL_FONT_PX;
    var total = _lblAdvances(disp, st).total;
    var lines = _lblWrapLines(disp, st, limit);
    if(total > limit && disp.indexOf(" ")>=0 && (ud.lines||1) < 2){
      bad.push({ text:ud.text, layoutPx:Math.round(total), limitPx:Math.round(limit), why:"needs wrap, rendered 1 line" }); continue;
    }
    if((ud.lines||1) !== lines.length){
      bad.push({ text:ud.text, why:"built lines "+(ud.lines||1)+" != wrap fn "+lines.length }); continue;
    }
    for(var L=0; L<lines.length; L++){
      if(lines[L].indexOf(" ")>=0 && _lblAdvances(lines[L], st).total > limit*1.01){
        bad.push({ text:ud.text, line:lines[L], why:"line overflows wrap limit" }); break;
      }
    }
  }
  return { pass: bad.length===0, checked:checked,
           method:"style.wrap × LBL_FONT_PX layout-px limit; long multi-word labels must rasterize ≥2 balanced lines, each line ≤ limit (single unbreakable words exempt)",
           bad: bad.slice(0,8) };
});

/* ---- AUDIT 7 — poiSymbols (ics13, operator verbatim: "distinct visual
   symbols for different point of interest (POI) categories"). PROPERTIES:
   [1] MAPPING COVERAGE — every registry reservation's business kind maps to a
       category (unmapped kinds fail loudly, never silently bucketed);
   [2] SET FIDELITY — with the sublayer on, the built symbol set equals the
       expectation recomputed here from the same data (reservationsAt(day)
       footprints on land + the era-gated plaza parcel): same total, same
       per-category counts — date-aware existence + determinism in one check;
   [3] PALETTE — every built symbol's category is in the POI_COLORS table.
   FAILS BEFORE ics13 (no symbols built, expected > 0 at every canonical
   date); PASSES after. Reports the per-bucket census + the residences-empty
   honesty flag (no dwelling kind exists in the registry today). ---- */
registerAudit("labels", "poiSymbols", function(){
  // settle the built set to the queried date via the exact updateLabels trigger
  // (audits can run before the first post-jump frame rebuilds; measure set
  // fidelity at the date, not render-loop scheduling)
  if(Math.floor(simDay)!==_lblLastDay || _lblVisKey()!==_lblLastVisKey) rebuildLabels();
  var day = simDay, bad = [];
  // [1] mapping coverage over the WHOLE registry (date-independent)
  var unmapped = [];
  Object.keys(_poiKindById).forEach(function(id){
    if(!poiCategory(id)) unmapped.push({ landmarkId:id, kind:_poiKindById[id] });
  });
  if(unmapped.length) bad.push({ why:"unmapped registry kinds", list:unmapped.slice(0,6) });
  // [2] expected set at the sim date (mirrors rebuildLabels' predicate exactly)
  var expect = { business:0, residence:0, park:0, other:0 }, expectN = 0;
  if(typeof reservationsAt==="function"){
    reservationsAt(day).forEach(function(r){
      if(!r.footprint) return;
      var cat = poiCategory(r.landmarkId); if(!cat) return;
      if(terrainHeight(r.footprint.cx, r.footprint.cz) <= 0.3) return;
      expect[cat]++; expectN++;
    });
  }
  var plazaP = (typeof parcelByName==="function") ? parcelByName("portsmouth-square") : null;
  if(plazaP && !(plazaP.birth!=null && plazaP.birth>day) && _lblParcelWorldRing(plazaP)){ expect.park++; expectN++; }
  // built census (sublayer "symbols" in the live label set); ics14 — also
  // tally the reveal tiers (prio 33/34/35 ⇒ tier 1/2/3) for the report.
  var built = { business:0, residence:0, park:0, other:0 }, builtN = 0, paletteBad = [];
  var tiers = { 1:0, 2:0, 3:0 };
  for(var i=0;i<_lblItems.length;i++){
    var it = _lblItems[i]; if(it.sublayer!=="symbols") continue;
    var cat = it.obj.userData.poiCat;
    if(!POI_COLORS[cat]){ paletteBad.push({ text:it.obj.userData.text, cat:cat }); continue; }   // [3]
    built[cat]++; builtN++;
    var tr = it.prio - 32; if(tiers[tr]!==undefined) tiers[tr]++;
  }
  if(paletteBad.length) bad.push({ why:"category not in POI_COLORS", list:paletteBad.slice(0,6) });
  if(LABELS_VIS.symbols){
    if(builtN !== expectN) bad.push({ why:"built count != expected", built:builtN, expected:expectN });
    Object.keys(expect).forEach(function(c){
      if(built[c] !== expect[c]) bad.push({ why:"bucket mismatch: "+c, built:built[c], expected:expect[c] });
    });
  }
  return { pass: bad.length===0, date:simDateISO(dateFromSimDay(simDay)),
           sublayerOn: !!LABELS_VIS.symbols, expected:expect, built:built,
           revealTiers: tiers,   // ics14: emblem reveal-tier census (1 landmarks / 2 institutions / 3 retail)
           residencesEmpty: expect.residence===0,
           method:"mapping coverage over the registry + built-vs-recomputed set fidelity (reservationsAt(day) on-land footprints + era-gated plaza) + palette membership",
           bad: bad.slice(0,8) };
});
