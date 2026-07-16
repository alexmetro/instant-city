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
/* ics14 HOST-SURFACE POLARITY — district/region/hill voice (host = mid-tan
   sand / green scrub land). MEASURED CHOICE between the two Maps pairings
   (audit math over the LAND host family): dark ink #453F35 + light casing
   measures better on our land tones AND matches Maps light-mode districts
   (dark-grey ink on light land), so districts take the tonal INVERSE of the
   street voice — casing is the opposite polarity of the ink per the
   operator's rule. ics14b: the dark outer glow is GONE (same fog-at-grazing
   defect as the street light glow, dark polarity); the casing alpha steps
   0.90→0.96 so the light casing alone still clears 3:1 on the scrub/grass
   end of the land host family (the glow used to carry that edge). */
var LBL_DISTRICT_INK  = "#453f35";                 // dark warm-grey ink (engraved-plate read on tan land)
var LBL_DISTRICT_CASE = "rgba(250,247,236,0.96)";  // light casing (opposite polarity; ics14b 0.90→0.96, no-glow contrast)
var LBL_STREET_BOLD_PX = 44;   // on-screen CSS px (apparent size, NOT device px): at/above → Roboto 700, below → 500. ~44px ⇒ bold kicks in under ~220 m altitude (plaza framings), town/overview stay Medium.
function _lblStreetStyle(setKey){
  return { key:setKey+".street", family:LBL_STREET_FAMILY, weight:"500", weightNear:"700", weightNearPx:LBL_STREET_BOLD_PX,
           color:LBL_STREET_INK, haloColor:LBL_STREET_CASE, halo:4, glow:false, letterSpacing:0.03, smallCaps:false, italic:false };
}
var LBL_STYLE_SETS = {
  a: {
    /* ics14 HOST-SURFACE POLARITY (operator's governing rule, from Maps dark-
       mode reference: ink polarity adapts to the label's HOST surface, casing
       is the OPPOSITE polarity). District/region/hill caps are HOSTED on the
       mid-tan sand / green scrub land → DARK warm-grey ink + LIGHT casing +
       dark outer glow (the tonal inverse of the street voice, which sits on
       dark dirt paint). Era FONT (Georgia small-caps, letter-spaced)
       unchanged; the contrast audit measures each pairing on its host family
       (LBL_HOST_FAM) and gates the all-background worst case. */
    region:  { key:"a.region",  family:"Georgia, 'Times New Roman', serif", weight:"600", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.34, smallCaps:true,  italic:false },
    hill:    { key:"a.hill",    family:"Georgia, 'Times New Roman', serif", weight:"600", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.30, smallCaps:true,  italic:false },
    water:   { key:"a.water",   family:"Georgia, 'Times New Roman', serif", weight:"600", color:"#9fc6dd", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.18, smallCaps:false, italic:true  },
    place:   { key:"a.place",   family:"Georgia, 'Times New Roman', serif", weight:"600", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.26, smallCaps:true,  italic:false },
    civic:   { key:"a.civic",   family:"Georgia, 'Times New Roman', serif", weight:"700", color:"#f0d79a", haloColor:LBL_HALO_DARK, glow:false, halo:5, letterSpacing:0.24, smallCaps:true,  italic:false, wrap:8 },
    street:  _lblStreetStyle("a"),
    lotNum:  { key:"a.lotNum",  family:"Georgia, 'Times New Roman', serif", weight:"700", color:"#f4efe4", haloColor:LBL_HALO_DARK, halo:4, letterSpacing:0.02, smallCaps:false, italic:false },
    lotOwn:  { key:"a.lotOwn",  family:"Georgia, 'Times New Roman', serif", weight:"500", color:"#dcd3c0", haloColor:LBL_HALO_DARK, halo:3, letterSpacing:0.04, smallCaps:false, italic:true, wrap:8  }
  },
  b: {
    /* ics14 host-surface polarity applied here too (district ink law is
       set-independent; only the era FONT varies between sets). */
    region:  { key:"b.region",  family:"'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif", weight:"600", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.40, smallCaps:true,  italic:false },
    hill:    { key:"b.hill",    family:"'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif", weight:"600", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.36, smallCaps:true,  italic:false },
    water:   { key:"b.water",   family:"'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif", weight:"500", color:"#9fc6dd", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.20, smallCaps:false, italic:true  },
    place:   { key:"b.place",   family:"'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif", weight:"600", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.32, smallCaps:true,  italic:false },
    civic:   { key:"b.civic",   family:"'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif", weight:"700", color:"#f0d79a", haloColor:LBL_HALO_DARK, glow:false, halo:5, letterSpacing:0.30, smallCaps:true,  italic:false, wrap:8 },
    street:  _lblStreetStyle("b"),   // ics14: the operator's Maps street voice overrides the era voice in every set
    lotNum:  { key:"b.lotNum",  family:"'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif", weight:"700", color:"#f4efe4", haloColor:LBL_HALO_DARK, halo:4, letterSpacing:0.02, smallCaps:false, italic:false },
    lotOwn:  { key:"b.lotOwn",  family:"'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif", weight:"500", color:"#dcd3c0", haloColor:LBL_HALO_DARK, halo:3, letterSpacing:0.04, smallCaps:false, italic:true, wrap:8  }
  },
  c: {
    region:  { key:"c.region",  family:"Didot,'Bodoni MT','Times New Roman',serif", weight:"500", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.20, smallCaps:true,  italic:false },
    hill:    { key:"c.hill",    family:"Didot,'Bodoni MT','Times New Roman',serif", weight:"500", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.18, smallCaps:true,  italic:false },
    water:   { key:"c.water",   family:"Didot,'Bodoni MT','Times New Roman',serif", weight:"400", color:"#a9d0e6", haloColor:LBL_HALO_DARK, halo:5, letterSpacing:0.10, smallCaps:false, italic:true  },
    place:   { key:"c.place",   family:"Didot,'Bodoni MT','Times New Roman',serif", weight:"500", color:LBL_DISTRICT_INK, haloColor:LBL_DISTRICT_CASE, glow:false, halo:5, letterSpacing:0.16, smallCaps:true,  italic:false },
    civic:   { key:"c.civic",   family:"Didot,'Bodoni MT','Times New Roman',serif", weight:"600", color:"#f6dda0", haloColor:LBL_HALO_DARK, glow:false, halo:5, letterSpacing:0.14, smallCaps:true,  italic:false, wrap:8 },
    street:  _lblStreetStyle("c"),   // ics14: the operator's Maps street voice overrides the era voice in every set
    lotNum:  { key:"c.lotNum",  family:"Didot,'Bodoni MT','Times New Roman',serif", weight:"600", color:"#f8f3ea", haloColor:LBL_HALO_DARK, halo:4, letterSpacing:0.02, smallCaps:false, italic:false },
    lotOwn:  { key:"c.lotOwn",  family:"Didot,'Bodoni MT','Times New Roman',serif", weight:"400", color:"#e0d7c4", haloColor:LBL_HALO_DARK, halo:3, letterSpacing:0.03, smallCaps:false, italic:true, wrap:8  }
  }
};
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

/* ---- ICS-14 ROBOTO EMBED (street voice only). Classic Apache-2.0 Roboto
   v2.138 (googlefonts/roboto release), Medium (500) + Bold (700), SUBSET with
   fonttools/pyftsubset to the 72-char street-label charset
   ( A-Z a-z 0-9 space . , ' ’ & - – — / ) and compressed to WOFF2:
   3,700 + 3,692 bytes (≈9.9 KB as base64) — the whole face ships inside this
   file, single-file law intact.
   LOAD-BEFORE-RASTER: canvas 2D SILENTLY substitutes the fallback family when
   a FontFace has not finished loading — so the first rebuild may raster
   streets with the fallback stack. When both faces resolve (data: URI, so
   milliseconds), the street entries in the texture cache are purged and the
   label set rebuilt ONCE with real Roboto metrics (geometry re-derives its
   aspect from measureText). One-time event, never per-frame; both weights are
   pre-loaded so later zoom weight-steps re-raster from the cache path only. */
var LBL_ROBOTO_MEDIUM_B64 = "d09GMgABAAAAAA50AA0AAAAAGOQAAA4kAAIjVAAAAAAAAAAAAAAAAAAAAAAAAAAAGhYbIBw2BmAAZAqoMJ4jATYCJAOCKAuBFgAEIAVGByAbWhJRlHBaCsHPw9jBsSfOjNJc5Ox+0JRUB7TNe/inRIzOFdoY02HNLEwwqpcsymWzTF0ZEYtkBbp2MgYcmO+++RN1/5vlH+gzfFhyxqTIvChH2doO0gowht11cGfECZeu023dYq89H5+rW6XNCQfWBB7vboCSZvc/V0tnb5Mu44Ir3TEIB8piTD6Xdn8p9+mVJ5RSFA7JoJDYNr60pzZJFGAxEoUE4RQWh+cxnIt8ypEpw1W/GwACAFQAgrsXJcEVEONxFFAGVUBc3JgBQALU0rushJlXZQnWgG6lGF+UzQHtpOwENtJzYnPT5xICnI6i+5AFwACwvZgVAKKGi/h+SMS1w6J4KuFu9SXdfXzcwRHU1RVIcUvDACiGMwJuGUrHeDF1wLsCPJEOKJLqUPAl4oDi2bvrwRoIg2J1aXWFZYamumAMThCrLvWxbsqYfp2zmjMDBBTq6cN2lKDB4rWkHCINqTIDMK4bVuDEYTMk+BRwFsacgQOXzGu2IhMxl7RFhCwrxkBA8b60KpWCUVASShMlKuiJoCqyOChLFUnenIQXI5GUKRQqRZ2KiosSxCg0mghZiiZG1iVJEkWpZIoqWVxEWZwqQ5JRokqSUBJVFFWTpNHEqeJUmq4sV1JyhWhrxF5eHKfdY75v+Tt7iR+0xUrCSsV7r5RUC1HyIJgdgNYQFiXGPw+wkljxrBRUv/ObQ1tuok4TviY6tMEr4QJm9Y6+WbXnDJnXHavZVjeL6tGKnLBAic+sDzHnaA/hEYsGpIfqMwJXq/6kDqZpROpiU4QaX2ojO44+Y1U9pcgfwzpMBglUUHVjqd9Mo4EPbvNAtRGA9kQU4Xp4NrCpakPuSkrDWx7wF90vmSMCFpnDLlwT+eRyQrynuy7QhEuFzNmjWH24HavPHQQ6qHiLlYWV6wR9aE/j6rflxJQ7bbc5kP08jy7LYXkKpRWMcpU5ivEGimnbnZOpwmbJ0xHivn0hURp7gbgoqIi1pb+wmuhP7IOreNBKbYrG2ieOlX32HdWBI93VkEnzdMo5R2YypjftJ4HCaxQv5POcRWNbi1nmqA4yLHo2RIqFwrJdmdu8brlXiaYH+2MdpBqyV4/ZiyaKnOxVeTD+hiWNs76wXzriJ06KJ0pzLExXFjEMX17ClogPgfPgDNeGYx9PYzgSjoV234ipwde+nGEhc37kckSE8p2OU7k8dpKlkyZRe6ahXrialPlwA9i/cDQSjWitytRYpURxqe4CtgavMDcFE4c3YG5egZLZHt0jMW23B44dYlaQWCL8yEzwRl/uL6ra8SxF071ZjsPC3dnYkmT3QMJeMhpoItBh3R2Dj0cFgp5UMoob58G9IlojJqvMRRqrwGjxJBFqqK/k/52bH1loUyNDstaseuADO7L781UBhnt6vGmwK51NoQvd4Y2GNVY7qw0/2N9shLHxpWDZauZpDT+oaE3ScATzotRFzsUrOEc1WQbj5XAcWmPJK/jxLHJGL6+5VgniXCTb0UfUqToCqaSQQK38qb5ff5lIJ62erEkWbxPuUeh3c6E3UMPc6mwYbbvpfvB6kUYS3KtVHBfSak/J4IvnnmjAK34qhmJgUpwK/fUH/wWdswJ6ond95m823YrpH726OlNFzyKAn34xrbkjU8vvW7nrXEGAS5DfvoDz/W3nT7Q/qk7m7Ap2iHOXY9oWcgclyk4ML614HeKfWB5Ef7/Cx87aJ9DDixlPOCoSU1KdW5zqZ5v/xtdeLx3Er9XI1x9Eb0LEx3OJieOBbtVMA2ebzVHXwL+rTbQNGi57eNV7emV7Mus9mGC2yNMaMXmo9dYEnDUTw3BqY4MEOTwTwjG5kVFUBoK+q04VXchKLzoLIzbTxdfnCq7AKJhj1wC7JuSyirpX94KLeFvb0KlxfEFt4AFPVmZ1cmnJzjzhA0SMP/Fl/Hr9EVxVk1sk1Nc/3FxWXBo3OR1bkRYlOI/Od/Qjfd1B6bxMyzrjjNucbrmZ/ntqvZ3CmKoCTlZlYeZXWbAe1WOM/Tl1ve26q9A17+fjskhRyDj80MxrmtbvohuesLqs9x3hVccnJeF12QFqB19pYiA//0RNWc3hisBgc2BkTff/UJufojqTfMZacmxeE5WfK7xDZhYkz2UV3hx+od/deHHz5fj00uNVRfm8nMDqaCUGMPJ49doJhqDN+vy9DZwtNnaKD++UHOkoKr/BNo8045xMffSnv/ZP/6PUtJORZmyLiuuSGjGcwsiItFxWHKcgKpJdoGbEqaxNZZfVctLLSidKSsHJSmegNHvVWwXpDrW/uKefRC4WVR4b6tF9OLBoMPftS9T39rCCzJt5PuVhqs7RFzddjU4ruAySmgm8V5p1PFK+v3We/13Vk4OR4Glxup86+kkWMJ7gi8i9rnj2oSTDUvXC2xaaHXt+FdSkxj7/hkowbOZeEqyeKZZWlID994l/koOKClRRuzybfDojXwqTUpQZ/yfWXL+/9dyZP/CybGIv5dLRxh2wAzDeeW12oY2HDafAlMJ6o3Siq3cZmT+/5087a5dLnde2BT0LenS3Q/+qrZ2HLnt2eKaAD+6TyfTitgWpsDTvaG+7dEUREqbQ8Usys3n7dt6ZJeQd+9sz5GJNvs0+VaMHoNzY0vjPjfgvqiVqCQugCLnQqGOmO8Kb/5ugfe7upQ7NLpWXsOPjyqpLgH817/jFp6WPP7fh/OklS+UarSvG4JzZ0cEtHPsWViMBitYRa7U95+QqFIdirsF0rHzlnDTtDn51DRWX9I+Ryc5Krt9OpYKf4ArTs1ic4l/M9GD6lVDEmSXMf8jireUTR+4uL65bvI8cOXUNWYQtyirxV5ssSWMvBqW/LZk/W7LYVtmUllh5cBv48VKOca0X+C7xMR49Nea5IfgjizeXTx6541R5r71Py1zJIv3Z4a/E7Ch345NSK7doUeuhNx/QxsbG5MyK+g0Aq/sLg7JTDlTinl/kKb9891OGcP0fu65xU115dtD6Xam7jX+480cv3JQf/rwBTTjVuXep+XpRfW0tG3BDbzprOp+8+fcGbGV4S91/7P69+rDi35/uv92tB7bUNbRuaQW/YZ76E96i+nGejOxCtpx0NqQH8qQXeUKJAF2Jq7oCGYz3l6bNkGAxhiSs3UUX3EGmjmchai6qfaP/8bTeatk1snrYQB0DkjI8L543T161Zrf8fyQBGOtNp+ohM203SoftsfgPwwlQabJjdtGZI923ms8jNz7ucQ+MYkUHJwbaCyq/dXZf59+6PcfVD5K4cKHIt7Jr+3/solNwMDA0Jb+OrOy5x26i5E0BAQSmKSWX+4ctF17H7HNuucvY0NqQ8uLM5qR+WHMhpCgR9XmNtv6fuvbnu8Os9ozA8Xf711fo5ddoUEZp/Pa4iSrtmtgx0KNksGtutL1ZzZf5+dr86bmUfAMhEOCR+NasrpodLnXdjKrttdm9XHA4dNNqXUfFke9SRrMGoGjSw39p9DGpjVy6/VjlyaS6NYGsohaJkh5JNCp6JxhKNUw2LDQcv3I86VrnfR7DVQK7t8v6LHKSPQkap0OFvu6x2Vuyao8Ubait8EjJu/D0nTXyTuXne/MXt5PLyalTypPifKWcO1sLump2MirGnUt21Bb2ckE7p3GbezUmAAII7PKabxx8cA3G7wvvZMWGA3F4w9q11TeaGbQh83Qh3dRM51rS88K9gS4ufQ9GDUs2gqpjPycjbsjHCfOZ0YY+2txH9wpA7gcYOFha0BI2brMtEBfQXxMys2ufjvoeyz82cvzeDRh8LLxfmOwX5p8cKuX+Vng3Oym0gy+wdW0NKqS/IZbkb37ceucKjD0S3s+MCQUf3U9kG/4nkhX+jSaftObzF/IavoBb2tdUD+tzZTaXDjU2/NY2Q4vUJXYuIgBsYpbM4VTe6Bkz+yXNH18jIdW607F02rl8Z3XOwFZpbm4POFrTAZsQLqVknumYX/NZ+uesWc/V1DJqyju9rTn9NVyXko+ueZtr8ga2go4U6/TqitcC+nusKHDjAQsm8loOJnWsA5gbVS5qj3Gb6mYfP+p8+4QrdIiOi44I9ltpHexQp3xHf2DL1i2fbzyb/fCqno+Pb/bxjWF5QDbeVS6s6EDjSfaVK1eIAuKDKw8iPT5aGp4GSSwlpezpgSe3YOiB8F5eYoDrBYdSipAOdlfpcrn0Qblj9L+0oxiNgUHEEF2ylv783ZtXb55ptvx8YX5q/ubcp7OfQIqUehHfHS/qIRWoIzqaNZJFwwbqvYHe0bB1ZbXByRYM8bsDYZGOir6akXLtK4ivZyZn8IAN5rd77zGYdmhLP6gzArKJsCmK1evLKGGGNuI27Ad7oWW7bzuAG3jMArPbMdHXQmKiRdHiYeQBXDq6C28J1aEW670BAgA4rYA7JzNto8VsF0kKJEm6/esiDe8y7HXM4Nf9pWHx1P/nCBlwCUJGEDn/qQASOJbmb9vcf+HP44nfACzkPwCmAkFIGPgjbaCCOwzuOFtoxBsBDt0AKRBOgR/4wgqognxwg2SpKMwfJDFR2IGtgUSMjgW0HpJEujwHUjHeNjhnOIZmgQkmYkaBjIhALXaR1MuoKg7FoMsccRg80Sn+01dDOWYKkkQRsMDEwQCdAxI6AL5oIISjVVCGWlCkDkqvgwDcCJigTbAezYJiHDXshUOWr6ImWKTCBsJPSXkOFKObsBy1CLi+4CmawMSdARKaDQX4HyCHCUATJYIa/g1Q8XdbjxnAfoI5VCN3wRqtgYOAAIAnDIEs+AJxOkUC4ABgb1XAA4KSWaBookI4oKXiesiAOAi5W6uDFyQAC1IgD9IYXEiSEpEDsZAtxUprywEWAA==";
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
      // purge any street raster made with the fallback face (keys "<set>.street|…"
      // or weight-variant "<set>.street@700|…"), then force a full rebuild on the
      // next frame — updateLabels runs before every draw, so no frame ever
      // samples a disposed texture.
      for(var k in _lblTexCache){
        if(_lblTexCache.hasOwnProperty(k) && /^[a-z]\.street[@|]/.test(k)){
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
  // fog finding) skip pass [1] entirely: ink + casing only, the Maps treatment.
  // Voices still carrying the s92 dual halo (water/lot) keep the light glow.
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
var LBL_PARCEL_LABELS = {   // cadastre parcel name -> { text, style, band, screenPx }
  "yerba-buena-cove": { text:"Yerba Buena Cove", style:"water", band:"water", screenPx:26 },
  "portsmouth-square":{ text:"Portsmouth Square",style:"civic", band:"place", screenPx:22 },
  "happy-valley-camp":{ text:"Happy Valley",     style:"place", band:"place", screenPx:22 },
  "mission-cluster":  { text:"Mission Dolores",  style:"place", band:"place", screenPx:22 },
  "presidio":         { text:"The Presidio",     style:"place", band:"place", screenPx:22 }
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
       the ICS-16 close-zoom subtitle line has room to join later. */
    if(typeof reservationsAt==="function"){
      reservationsAt(day).forEach(function(r){
        if(!r.footprint) return;
        var cx=r.footprint.cx, cz=r.footprint.cz;
        if(terrainHeight(cx,cz) <= 0.3) return;               // don't float a name over water
        _lblAdd(_lblSprite(r.name, LBL_STYLE.civic, cx, cz, 8), LBL_BANDS.landmark, "lots", 34, 15, false);
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
   (falls back to the modern name at 1846), PASSES after. ---- */
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
   satellite-mode streets). Voices still carrying the dual halo (water/lot)
   keep the s92 two-ring formula unchanged. */
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
    { name:"plank",      fam:"road",  rgb:_lblHex(0x9c8560) },  // planked deck (street names cross wharves)
    { name:"road",       fam:"road",  rgb:_lblHex(0x6b5838) },  // road-paint band — the STREET-label host
    { name:"ghost",      fam:"road",  rgb:_lblHex(0x5c4e33) },  // surveyor ghost line
    { name:"shadow",     fam:"shade", rgb:_lblHex(0x3a2a14) },  // darkest hillshade (nobody's host; still gated)
    { name:"waterLo",    fam:"water", rgb:_lblHex(0x8fc2c9) },  // bright shallow (cove label)
    { name:"waterHi",    fam:"water", rgb:_lblHex(0x2a5570) }
  ];
  // ics14 — the surface family each voice is HOSTED on (operator's polarity
  // rule: ink is chosen per host surface; these are our known constants).
  var HOST_FAM = { street:"road", region:"land", hill:"land", place:"land",
                   civic:"land", lotNum:"land", lotOwn:"land", water:"water" };
  var DETAIL_TABLE = { street:1, place:1 };   // the operator-decided voices report full per-bg tables
  var GATE = 3.0, styles = [], worst = { style:null, bg:null, ratio:1e9 };
  Object.keys(LBL_STYLE).forEach(function(key){
    var st = LBL_STYLE[key], glyph = _lblParseCss(st.color);
    // ics14: measure the style's OWN rings (street/districts/civic = ink +
    // casing ONLY, no glow — ics14b; water/lot = the classic dark ring +
    // light glow dual halo).
    var noGlow = st.glow === false;
    var inner = _lblParseCssA(st.haloColor), outer = noGlow ? null : _lblParseCssA(st.glowColor || LBL_HALO_LIGHT);
    var hostFam = HOST_FAM[key] || null;
    var sMin = 1e9, sBg = null, hMin = 1e9, hBg = null, perBg = [];
    BG.forEach(function(b){
      var eInner = _lblComposite(inner.rgb, inner.a, b.rgb);
      // ics14b no-glow: no outer ring exists — where the casing melts into the
      // bg, the INK's own edge against the ground is the visible boundary.
      var outerSep = noGlow ? _lblContrast(glyph, b.rgb)
                            : _lblContrast(_lblComposite(outer.rgb, outer.a, b.rgb), b.rgb);
      var ringSep = Math.max(_lblContrast(eInner, b.rgb), outerSep);
      var glyphVsInner = _lblContrast(glyph, eInner);
      var here = Math.min(ringSep, glyphVsInner);
      var isHost = hostFam !== null && b.fam === hostFam;
      if(DETAIL_TABLE[key]) perBg.push({ bg:b.name, host:isHost, ringSep:+ringSep.toFixed(2), inkVsCasing:+glyphVsInner.toFixed(2), score:+here.toFixed(2) });
      if(here < sMin){ sMin = here; sBg = b.name; }
      if(isHost && here < hMin){ hMin = here; hBg = b.name; }
    });
    var row = { style:key, minRatio:+sMin.toFixed(2), worstBg:sBg, hostFam:hostFam,
                hostMin:(hMin<1e9 ? +hMin.toFixed(2) : null), hostWorstBg:hBg };
    if(DETAIL_TABLE[key]) row.perBg = perBg;
    styles.push(row);
    if(sMin < worst.ratio){ worst = { style:key, bg:sBg, ratio:+sMin.toFixed(2) }; }
  });
  // gate BOTH the all-background worst case (labels overhang their host) AND
  // the host-family worst case (the operator's per-host pairing must clear).
  var bad = styles.filter(function(s){ return s.minRatio < GATE || (s.hostMin !== null && s.hostMin < GATE); });
  return { pass: bad.length===0, gate:GATE,
           method:"per-style WCAG min over earth palette + per-host-family gate; glow:false voices (street/districts/civic) = ink+casing only, sep=max(casingVsBg, inkVsBg); dual-halo voices (water/lot) = inner casing + light glow; street Bold shares Medium colors (one measurement, both weights)",
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
