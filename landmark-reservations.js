/* AUTO-GENERATED from data/landmark-reservations.json (docs repo) — do not hand-edit.
 * The landmark reservation registry consumed by core/08-cadastre cadApplyReservations()
 * as window.LANDMARK_RESERVATIONS. Regenerate when the source JSON changes.
 * s91: Zoning Project stage 3 — 10 anchored reservations (plaza cluster + Howard&Mellus + Shades),
 * 5 unanchorable landmarks documented in _meta.unanchorable (reserved nothing on a guess). */
window.LANDMARK_RESERVATIONS = {
  "_meta": {
    "title": "Landmark reservations — the record gets its ground (Zoning Project stage 3, s91)",
    "generated": "2026-07-14",
    "brief": "building-spawn-spec.md §1 (THE GROUND PLAN — named parcels + the record wins); research/landmarks-1846-50.md (THE DOSSIER, 30 documented structures). A reservation is dated, anchored ground the buildings admission will consume: reserved ground spawns THE landmark, never procedural fill. Anchored honestly — lot/block+frontage where the dossier gives a corner or a square-fronting street; NOTHING reserved on a guess (unanchorable landmarks are listed below with the reason, per the STOP-AND-REPORT rule).",
    "consumed_by": "app/src/core/08-cadastre.js cadApplyReservations() as window.LANDMARK_RESERVATIONS; baked to app/landmark-reservations.js (do not hand-edit the baked copy).",
    "anchor_schema": {
      "kind": "'block-frontage' (a documented block + which bounding street it fronts) | 'plaza-exception' (a civic building ON the Portsmouth Square common — the documented exception to the publicReserve zero-lots rule)",
      "block": "the live cadastre block key (B|west|east|north|south street-id edge key, deriveGroundPlan) — resolved to the plan at query time; a reservation whose block is absent at its built date is surfaced as unresolved, never forced",
      "frontage": "west|east|north|south — which uv edge of the block the facade sits on (west=smaller-u avenue edge, north=smaller-v street edge)",
      "frontStreet": "the human street name that edge carries (documentation only)",
      "frontFrac0/frontFrac1": "the [0..1] sub-interval along that frontage edge the footprint occupies (0 = the edge's smaller-coordinate corner). Distinct intervals keep co-block landmarks off each other's ground.",
      "depthM": "footprint depth into the block from the frontage (m)",
      "widthM": "plaza-exception only: footprint width along the corner edge (m)",
      "corner": "'NW'|'NE'|'SW'|'SE' for plaza-exception; boolean corner flag for block-frontage"
    },
    "confidence_key": {
      "A": "corpus/eyewitness-anchored corner or square-fronting address — the strongest tier",
      "B": "documented street/side but the exact quadrant or block carries a noted ambiguity",
      "C": "corner named but which of four quadrants unstated"
    },
    "dates_note": "built/burned/rebuilt arcs from the dossier. The Dec 24 1849 Great Fire (origin: Dennison's Exchange) took the Parker House, El Dorado, Bella Union, and Haley House — encoded as burned:1849-12-24 so the buildings admission can honor the pre-fire / post-fire plaza states within the window (sim ends 1849-12-31).",
    "unanchorable": [
      {
        "landmarkId": "portsmouth-house",
        "name": "Portsmouth House",
        "dossier": "§1.6",
        "reason": "the dossier gives only 'Clay Street' — no cross street or corner; picking a Clay block would be a guess (65 corpus mentions confirm the building, not its block)."
      },
      {
        "landmarkId": "merchants-exchange",
        "name": "Merchants' Exchange",
        "dossier": "§1.8",
        "reason": "'Washington street' only — no cross street; ambiguous which Washington block."
      },
      {
        "landmarkId": "california-star-office",
        "name": "California Star printing office",
        "dossier": "§1.10",
        "reason": "'Washington St., rear of the U.S. Barracks' — a rear-lot structure with no street frontage; the barracks lot is not itself reserved, so 'rear of' has no resolvable anchor."
      },
      {
        "landmarkId": "post-office",
        "name": "Post Office",
        "dossier": "§1.9",
        "reason": "'Clay & Pike' — Pike Street (later Waverly Place) is not in the street spine, so the intersection cannot be resolved."
      },
      {
        "landmarkId": "sam-brannan-store",
        "name": "Sam Brannan's store",
        "dossier": "§1.11",
        "reason": "no in-window San Francisco street address in the corpus ('S. BRANNAN, San Francisco, Dec 30 1847' gives no street); the 1849 Sacramento/Sutter's Fort operations are out of the sim map."
      }
    ],
    "out_of_scope_this_pass": "Storeships (Niantic, Euphemia, Apollo, General Harrison — ships-era, per the brief). Peripheral areas (Mission Dolores, Presidio, Telegraph Hill signal station, the 1847 windmill) are already named parcels or ships/terrain-era and are not building reservations in this plaza-cluster pass."
  },
  "reservations": [
    {
      "landmarkId": "custom-house",
      "name": "Custom House",
      "dossier": "§1.7",
      "anchor": {
        "kind": "plaza-exception",
        "corner": "NW",
        "frontStreet": "washington/dupont",
        "widthM": 26,
        "depthM": 17
      },
      "dates": {
        "built": "1844-01-01",
        "burned": "1851-06-01",
        "note": "old Mexican adobe 'La Casa Grande'; adobe walls, tiled roof (CS18480401 eyewitness). Civic exception ON the plaza common — publicReserve allows the documented civic building; stands the whole window, lost to fire 1851 (just after)."
      },
      "confidence": "A",
      "source": "dossier §1.7; corpus CS18480401 (shipboard eyewitness), WAC18490118/0712 (wayfinding); LOC ca0673"
    },
    {
      "landmarkId": "school-house",
      "name": "School House",
      "dossier": "§1.13",
      "anchor": {
        "kind": "plaza-exception",
        "corner": "SW",
        "frontStreet": "clay/dupont",
        "widthM": 16,
        "depthM": 13
      },
      "dates": {
        "built": "1847-12-01",
        "note": "one-room frame civic building (finished late 1847, instruction from Apr 3 1848); later SF's first police station house."
      },
      "confidence": "B",
      "source": "dossier §1.13; corpus WAC18490201; timeline-part-1846-47.md, police-courts.md. Ambiguity: §1.13 says 'SW corner of the plaza'; §1.14 records 'SW corner Clay/Kearny' (SE of the square) — the plaza-SW reading is taken, flagged."
    },
    {
      "landmarkId": "city-hotel",
      "name": "City Hotel",
      "dossier": "§1.1",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|dupont|kearny|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.55,
        "frontFrac1": 0.98,
        "depthM": 22,
        "corner": "NE"
      },
      "dates": {
        "built": "1846-01-01",
        "note": "the settlement's first true hotel (Leidesdorff, 1846). South side of Portsmouth Square, entrance from Clay at the Kearny corner; long block-spanning footprint (CS18480401)."
      },
      "confidence": "A",
      "source": "dossier §1.1; corpus C18480715/0902/0916, CS18480401; timeline-part-1846-47.md"
    },
    {
      "landmarkId": "parker-house",
      "name": "Parker House",
      "dossier": "§1.2",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "west",
        "frontStreet": "kearny",
        "frontFrac0": 0.05,
        "frontFrac1": 0.45,
        "depthM": 22,
        "corner": false
      },
      "dates": {
        "built": "1849-01-01",
        "burned": "1849-12-24",
        "note": "two-story wood frame, covered porch/balcony the length of the Square facade. East side of the Square fronting Kearny; burned in the Great Fire, rebuilt 1850 (out of window)."
      },
      "confidence": "A",
      "source": "dossier §1.2; corpus WAC18490412–18491108; PCAD Parker House #1; economy-daily-life.md §4.1"
    },
    {
      "landmarkId": "el-dorado",
      "name": "El Dorado",
      "dossier": "§1.3",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "west",
        "frontStreet": "kearny",
        "frontFrac0": 0.55,
        "frontFrac1": 0.95,
        "depthM": 22,
        "corner": false
      },
      "dates": {
        "built": "1849-04-01",
        "burned": "1849-12-24",
        "note": "canvas tent (~15×25 ft) Apr 1849 → later a 3-story hipped-roof building — model as an explicit multi-stage asset. East side of the Square beside the Parker House; burned in the Great Fire."
      },
      "confidence": "A",
      "source": "dossier §1.3; PCAD El Dorado #1; economy-daily-life.md §4.1; architecture-1846-50.md §3b"
    },
    {
      "landmarkId": "dennisons-exchange",
      "name": "Dennison's Exchange",
      "dossier": "§1.4",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|jackson|washington",
        "frontage": "west",
        "frontStreet": "kearny",
        "frontFrac0": 0.3,
        "frontFrac1": 0.7,
        "depthM": 20,
        "corner": false
      },
      "dates": {
        "built": "1849-06-01",
        "burned": "1849-12-24",
        "note": "Kearny St between Clay and Jackson, opposite the Square (east side of Kearny). The POINT OF ORIGIN of the Dec 24 1849 Great Fire (~6am); rebuilt in 16 days (mid-Jan 1850, out of window)."
      },
      "confidence": "B",
      "source": "dossier §1.4; corpus WAC18491101/1115; economy-daily-life.md §4.1, §5.2. 'Between Clay and Jackson' spans two blocks; the Washington–Jackson block is taken to separate it from the Parker/El Dorado ground."
    },
    {
      "landmarkId": "bella-union",
      "name": "Bella Union",
      "dossier": "§1.5",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|dupont|kearny|jackson|washington",
        "frontage": "south",
        "frontStreet": "washington",
        "frontFrac0": 0.55,
        "frontFrac1": 0.92,
        "depthM": 20,
        "corner": false
      },
      "dates": {
        "built": "1849-10-22",
        "burned": "1849-12-24",
        "note": "720 Washington St, north side of the Square. Opened Oct 22 1849; burned in the Great Fire and again May 4 1850; rebuilt each time."
      },
      "confidence": "B",
      "source": "dossier §1.5; corpus WAC18491115; economy-daily-life.md §4.1"
    },
    {
      "landmarkId": "alta-california-office",
      "name": "Alta California office",
      "dossier": "§1.10",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|dupont|kearny|jackson|washington",
        "frontage": "south",
        "frontStreet": "washington",
        "frontFrac0": 0.1,
        "frontFrac1": 0.42,
        "depthM": 16,
        "corner": false
      },
      "dates": {
        "built": "1849-01-01",
        "note": "'Office on Washington street, Portsmouth Square' — the square-fronting Washington block; the Daily Alta California's seat (launched Jan 1849)."
      },
      "confidence": "B",
      "source": "dossier §1.10; corpus WAC18490524"
    },
    {
      "landmarkId": "howard-mellus-store",
      "name": "Howard & Mellus store",
      "dossier": "§1.12",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.7,
        "frontFrac1": 0.98,
        "depthM": 20,
        "corner": "NE"
      },
      "dates": {
        "built": "1848-01-01",
        "note": "SW corner of Clay & Montgomery — the FIRST BRICK BUILDING in San Francisco (1848), the former Hudson's Bay Company property. A material outlier (brick, not frame/adobe/canvas)."
      },
      "confidence": "A",
      "source": "dossier §1.12; cast.md (Howard entry); corpus CS18470220/0227, C18480916"
    },
    {
      "landmarkId": "shades-tavern",
      "name": "Shades Tavern",
      "dossier": "§3.6",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|stockton|dupont|pacific|jackson",
        "frontage": "north",
        "frontStreet": "pacific",
        "frontFrac0": 0.1,
        "frontFrac1": 0.45,
        "depthM": 18,
        "corner": "NW"
      },
      "dates": {
        "built": "1848-04-01",
        "note": "'corner of Pacific and Stockton streets' (operative address from Apr 19 1848); second-tier but persistent tavern with attached bowling alleys, off the high-rent Square. Quadrant unstated — the townward (SE-of-intersection) block is taken."
      },
      "confidence": "C",
      "source": "dossier §3.6; corpus C18480419–CSC18481223. If the Pacific/Stockton block is absent at the built date it is surfaced as unresolved, not forced."
    }
  ]
};
