/* AUTO-GENERATED from data/landmark-reservations.json (docs repo) — do not hand-edit.
 * The landmark reservation registry consumed by core/08-cadastre cadApplyReservations()
 * as window.LANDMARK_RESERVATIONS. Regenerate when the source JSON changes.
 * s91: Zoning Project stage 3 — 10 anchored reservations (plaza cluster + Howard&Mellus + Shades),
 * 5 unanchorable landmarks documented in _meta.unanchorable (reserved nothing on a guess).
 * s94: PRESENCE-OVER-PRECISION re-anchor — 4 of the 5 unanchorable landmarks moved into
 * reservations[] with approximate:true best-effort placements (14 total); sam-brannan-store
 * remains the sole unanchorable entry (genuinely zero locational basis). */
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
      "frontStreet": "the human street name(s) that edge carries. For plaza-exception (corner) anchors this is 'primary/secondary' (e.g. 'washington/dupont'); the FIRST street is the primary frontage the CORNER RULE (building-spawn-spec §1.6) faces — the corner faces ONE street, never the 45° diagonal.",
      "facing": "OPTIONAL orientation override (building-spawn-spec §1.6, s94a). When a source documents the true frontage, set this to a bounding-street NAME (mapped to that block edge) or a cardinal edge word/letter (north|south|east|west | n|s|e|w). It WINS over the frontStreet default. An intercardinal bearing (NE|NW|SE|SW) is accepted but is a genuine diagonal and the orientationLandmark street-alignment clause will reject it unless it coincides with an edge — corners are expected to name a single street. Absent on every current reservation (all default to frontStreet's first street).",
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
        "landmarkId": "sam-brannan-store",
        "name": "Sam Brannan's store",
        "dossier": "§1.11",
        "reason": "re-reviewed under the PRESENCE-OVER-PRECISION ruling (s94) and still has no defensible SF-map basis: the earliest attested notice ('S. BRANNAN, San Francisco, Dec. 30, 1847', CS18480115) carries no street at all, and every dated, addressed Brannan operation found in the corpus (WAC18490125, WAC18490201, WAC18490517) explicitly relocates to Sacramento City and Sutter's Fort — off the sim's San Francisco map. The separately-indexed 'Osborn & Brannan' auction-room partnership (multiple 1849 hits) is a distinct entity with its own unaddressed record, not evidence for a 'Sam Brannan's store' street position. Presence-over-precision licenses best-effort approximation from a hint, not invention from zero hint; this one stays unanchorable."
      }
    ],
    "s94_reanchor_pass": "PRESENCE-OVER-PRECISION re-anchor (building-spawn-spec.md §1, user ruling 2026-07-14): 4 of the 5 previously-unanchorable landmarks (portsmouth-house, merchants-exchange, california-star-office, post-office) moved into reservations[] below with approximate:true, best-effort block/frontage placements reasoned from partial hints (dossier adjacency language, corpus cross-references, external Pike->Waverly Place verification), and honest confidence/source strings recording exactly what was guessed. sam-brannan-store remains unanchorable (genuinely zero locational basis, see above). Reuses only the existing block-frontage/plaza-exception anchor kinds — no new anchor kind invented.",
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
    },
    {
      "landmarkId": "portsmouth-house",
      "name": "Portsmouth House",
      "dossier": "§1.6",
      "anchor": { "kind": "block-frontage", "block": "B|kearny|montgomery|clay|sacramento", "frontage": "north", "frontStreet": "clay", "frontFrac0": 0.05, "frontFrac1": 0.38, "depthM": 20, "corner": "NW" },
      "approximate": true,
      "dates": {
        "built": "1846-10-17",
        "note": "open by Oct 17 1846 (earliest corpus hit) through at least Aug 1849; 'recently enlarged to double its former size' by Jan 1848 (CS18480101). PRESENCE-OVER-PRECISION placement: dossier §1.6 gives only 'Clay Street', no cross street; §4.1's ensemble narrative places it 'one block over on Clay' from the City Hotel (B|dupont|kearny|clay|sacramento, the square-adjacent block). 'One block over' is directionally ambiguous (west toward Stockton vs. east across Kearny toward Montgomery) — the east/Montgomery-corridor block is taken as the more defensible reading: Montgomery was the developing merchant corridor by 1846-47 (Howard & Mellus's later 1848 brick store sits on this same block), while Stockton was still 'a rudimentary thoroughfare amid sand hills' as late as 1849 (streets-geometry.json). Positioned at the block's NW (Kearny) corner — the end nearest the City Hotel/square, i.e. literally 'one block over' at the well-attested Clay & Kearny corner — leaving the Montgomery end (already Howard & Mellus's ground, frontFrac 0.70-0.98) untouched."
      },
      "confidence": "C",
      "source": "dossier §1.6 (Clay Street only, 65 corpus mentions of the building, none of its block); §4.1 ('one block over on Clay' from City Hotel); places.jsonl place-hotel-portsmouth-house (addresses: 'Clay street'/'Clay st.' only, no cross street). Direction of 'one block over' is a judgment call, not corpus-resolved — flagged for review."
    },
    {
      "landmarkId": "merchants-exchange",
      "name": "Merchants' Exchange",
      "dossier": "§1.8",
      "anchor": { "kind": "block-frontage", "block": "B|kearny|montgomery|jackson|washington", "frontage": "south", "frontStreet": "washington", "frontFrac0": 0.30, "frontFrac1": 0.65, "depthM": 16, "corner": false },
      "approximate": true,
      "dates": {
        "built": "1849-08-30",
        "note": "opened Aug-Sept 1849 (first ad WAC18490830); the second-floor hall specifically completed Nov 22 1849 (WAC18491122). PRESENCE-OVER-PRECISION placement: dossier §1.8 gives only 'Washington street', no cross street at all (places.jsonl confirms: single address 'Washington street'). Placed on the Washington-fronting block immediately east of the square (Kearny-Montgomery x Jackson-Washington) rather than the square-fronting block itself, reasoning: (1) the square-fronting Washington block already carries Bella Union + Alta California office ground and a 1849 purpose-built two-story commercial hall isn't corroborated as sharing that specific frontage; (2) 1849-built commercial construction skews toward the Montgomery corridor, matching Howard & Mellus's already-established brick-store presence one block south on this same Kearny-Montgomery block. This is the weakest-evidenced of the four re-anchored entries — no textual hint narrows it beyond 'Washington street'; flagged for Director review, could equally sit on the square-fronting Washington block."
      },
      "confidence": "C",
      "source": "dossier §1.8 (WAC18490830/0831/1115/1122/1129/1201/1206); places.jsonl place-public-building-merchants-exchange (addresses: ['Washington street'] only). Block choice is a default-to-plausible-cluster guess, not corpus-resolved."
    },
    {
      "landmarkId": "california-star-office",
      "name": "California Star printing office",
      "dossier": "§1.10",
      "anchor": { "kind": "block-frontage", "block": "B|dupont|kearny|jackson|washington", "frontage": "south", "frontStreet": "washington", "frontFrac0": 0.44, "frontFrac1": 0.54, "depthM": 12, "corner": false },
      "approximate": true,
      "dates": {
        "built": "1847-10-16",
        "note": "address attested CS18471016 through CS18480614 (paper founded Jan 1847, masthead from CS18470109, but the 'rear of the U.S. Barracks' address specifically confirmed only from Oct 1847). PRESENCE-OVER-PRECISION placement: dossier §1.10 gives 'Washington St., rear of the U.S. Barracks' — a rear-lot structure, no street frontage of its own. A separate corpus hit (C18470529, places.jsonl place-public-building-portsmouth-square-barracks) locates 'the Barracks in Portsmouth square' — i.e. a barracks building fronting the square itself, most plausibly on the square's north (Washington) edge given the newspaper's own Washington St. address for its 'rear'. Modeled as a narrow, shallow interior slice of the same square-fronting Washington block already carrying Alta California office (frontFrac 0.10-0.42) and Bella Union (0.55-0.92), placed in the untouched gap between them (0.44-0.54) with a reduced depthM to signal it as the 'modest secondary/rear-lot structure' the dossier itself calls it, not a full street-facing building. This treats 'rear of the barracks' as an address of convenience along the same frontage rather than true interior depth, which the anchor schema has no field to express directly."
      },
      "confidence": "C",
      "source": "dossier §1.10 (CS18471016-CS18480614, 'Washington St., rear of the U.S. Barracks'); C18470529 ('in front of the Barracks in Portsmouth square', places.jsonl place-public-building-portsmouth-square-barracks) — the identification of this May-1847 'Portsmouth Square Barracks' hit with the same 'U.S. Barracks' cited in the paper's own Oct-1847-onward address ads is plausible (same military-occupation era, same square) but not independently confirmed as the identical structure. Flagged: the barracks' own footprint is not itself reserved (out of scope), and the office's placement here approximates a rear-lot relationship the anchor schema cannot literally encode."
    },
    {
      "landmarkId": "post-office",
      "name": "Post Office",
      "dossier": "§1.9",
      "anchor": { "kind": "block-frontage", "block": "B|stockton|dupont|clay|sacramento", "frontage": "north", "frontStreet": "clay", "frontFrac0": 0.10, "frontFrac1": 0.38, "depthM": 14, "corner": "SW" },
      "approximate": true,
      "dates": {
        "built": "1849-03-01",
        "note": "the FORMAL Clay & Pike civilian post office, opened March 1849 (timeline-spine.md/FoundSF POST_OFFICE_1849) — distinct from the informal 1847 Quartermaster-office 'Post Office' (C18470605), which is NOT anchored here (no location beyond 'the Quarter Master at the several points at which troops are stationed'). PRESENCE-OVER-PRECISION placement: Pike Street is verified (this pass, cast.md + web research) to be the same street later renamed Waverly Place — cast.md independently attests this twice ('27 Waverly Place (formerly Pike Street)', Charles Cora and Belle Cora entries) and modern sources confirm Waverly Place runs one block WEST of Grant Ave/Dupont, between Washington and Sacramento Streets (crossing Clay), parallel to Dupont and Stockton — i.e. Pike/Waverly is the mid-block alley in the Stockton-Dupont corridor, NOT between Dupont and Kearny. (NOTE: timeline-part-1849.md's phrasing 'southwest corner of Pike (later Clay) and Clay Streets' reads as a transcription glitch — read against cast.md's clean double-attestation, Pike was renamed to Waverly Place, not to Clay.) Pike/Waverly itself is not in the street spine, so the intersection is approximated onto the nearest resolvable block: B|stockton|dupont|clay|sacramento (the Clay-fronting block south of Clay, spanning Stockton to Dupont), positioned toward its west (Stockton) portion per the dossier's own 'southwest corner of Pike and Clay' phrasing (west of the mid-block alley, south of Clay)."
      },
      "confidence": "B",
      "source": "dossier §1.9; timeline-part-1849.md/timeline-spine.md (Clay & Pike, March 1849, FoundSF POST_OFFICE_1849); cast.md (Charles Cora, Belle Cora entries: '27 Waverly Place (formerly Pike Street)') for the Pike=Waverly identification; WebSearch this pass (gpsmycity.com, evendo.com, Medium/Doug Chan) corroborating Waverly Place's Washington-Sacramento, one-block-west-of-Grant-Ave position. Block/frontFrac position is an approximation onto the nearest spine block, not a corpus-resolved footprint."
    }
  ]
};
