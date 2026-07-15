/* AUTO-GENERATED from data/landmark-reservations.json (docs repo) — do not hand-edit.
 * The landmark reservation registry consumed by core/08-cadastre cadApplyReservations()
 * as window.LANDMARK_RESERVATIONS. Regenerate when the source JSON changes.
 * s91: Zoning Project stage 3 — 10 anchored reservations (plaza cluster + Howard&Mellus + Shades),
 * 5 unanchorable landmarks documented in _meta.unanchorable (reserved nothing on a guess).
 * s94: PRESENCE-OVER-PRECISION re-anchor — 4 of the 5 unanchorable landmarks moved into
 * reservations[] with approximate:true best-effort placements (14 total); sam-brannan-store
 * remains the sole unanchorable entry (genuinely zero locational basis).
 * s95: LANDMARK IDENTIFICATION batch 1 — 37 new block-frontage anchors mined from
 * data/places.jsonl's SF in-window candidate set (51 total). shades-tavern reconciled
 * (Pacific & Stockton confirmed). See _meta.s95_batch1_pass and _meta.batch1_backlog. */
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
        "landmarkId": "sam-brannan-store",
        "name": "Sam Brannan's store",
        "dossier": "§1.11",
        "reason": "re-reviewed under the PRESENCE-OVER-PRECISION ruling (s94) and still has no defensible SF-map basis: the earliest attested notice ('S. BRANNAN, San Francisco, Dec. 30, 1847', CS18480115) carries no street at all, and every dated, addressed Brannan operation found in the corpus (WAC18490125, WAC18490201, WAC18490517) explicitly relocates to Sacramento City and Sutter's Fort — off the sim's San Francisco map. The separately-indexed 'Osborn & Brannan' auction-room partnership (multiple 1849 hits) is a distinct entity with its own unaddressed record, not evidence for a 'Sam Brannan's store' street position. Presence-over-precision licenses best-effort approximation from a hint, not invention from zero hint; this one stays unanchorable."
      }
    ],
    "s94_reanchor_pass": "PRESENCE-OVER-PRECISION re-anchor (building-spawn-spec.md §1, user ruling 2026-07-14): 4 of the 5 previously-unanchorable landmarks (portsmouth-house, merchants-exchange, california-star-office, post-office) moved into reservations[] below with approximate:true, best-effort block/frontage placements reasoned from partial hints (dossier adjacency language, corpus cross-references, external Pike->Waverly Place verification), and honest confidence/source strings recording exactly what was guessed. sam-brannan-store remains unanchorable (genuinely zero locational basis, see above). Reuses only the existing block-frontage/plaza-exception anchor kinds — no new anchor kind invented.",
    "out_of_scope_this_pass": "Storeships (Niantic, Euphemia, Apollo, General Harrison — ships-era, per the brief). Peripheral areas (Mission Dolores, Presidio, Telegraph Hill signal station, the 1847 windmill) are already named parcels or ships/terrain-era and are not building reservations in this plaza-cluster pass.",
    "batch1_backlog": [
      {
        "name": "Finley, Johnson & Co.",
        "kind": "store",
        "mentions": 37,
        "reason": "Address is literally 'Portsmouth House, Clay st.' — co-located with/tenant inside the existing portsmouth-house reservation, not a separate footprint. Needs a schema concept for co-located tenants (not present in block-frontage) before it can be anchored distinctly."
      },
      {
        "name": "C. V. Gillespie's store",
        "kind": "store",
        "mentions": 9,
        "reason": "Address 'Washington street, rear of U.S. Barracks' — same awkward rear-lot address already used (and flagged as schema-stretching) for the existing california-star-office reservation. Deferred rather than compounding a second awkward anchor at the same ambiguous rear-lot location."
      },
      {
        "name": "Geltson & Co.",
        "kind": "store",
        "mentions": 32,
        "reason": "DEFERRED (waterfront, per brief): 'Montgomery Street on the Beach' / 'on the Beach' — needs a water-lot anchor kind not yet built."
      },
      {
        "name": "S. H. Williams & Co.",
        "kind": "store",
        "mentions": 21,
        "reason": "DEFERRED (waterfront, per brief): 'foot of California st.' — needs a water-lot anchor kind not yet built."
      },
      {
        "name": "Simmons, Hutchinson & Co.",
        "kind": "store",
        "mentions": 17,
        "reason": "DEFERRED (waterfront, per brief): 'foot of Sacramento street' — needs a water-lot anchor kind not yet built."
      },
      {
        "name": "Cooke, Baker & Co",
        "kind": "store",
        "mentions": 11,
        "reason": "DEFERRED (waterfront, per brief): 'foot of Sacramento street' — needs a water-lot anchor kind not yet built."
      },
      {
        "name": "PLUMMER, KEITH & CO.",
        "kind": "store",
        "mentions": 9,
        "reason": "DEFERRED (waterfront, per brief): 'foot of Sacramento street' — needs a water-lot anchor kind not yet built."
      },
      {
        "name": "Joseph Bawden & Co.",
        "kind": "store",
        "mentions": 9,
        "reason": "DEFERRED (waterfront, per brief): 'Foot of Broadway, near the wharf' — needs a water-lot anchor kind not yet built."
      },
      {
        "name": "E. Mickle & Co.",
        "kind": "store",
        "mentions": 18,
        "reason": "DEFERRED (waterfront-adjacent, ambiguous): addresses mix 'Clay street' with 'Clay street wharf' and a cross-reference to Sherman & Ruckel's corner-Clay/Montgomery warehouse; not cleanly a land-lot address, deferred pending a clearer read."
      }
    ],
    "s95_batch1_pass": "Batch 1 landmark identification (2026-07-14): 37 new block-frontage anchors added from data/places.jsonl's ~85-record SF in-window candidate set (kind in store/hotel/tavern/saloon/bank/newspaper_office/public_building/market/manufactory, mentions>=8, spine-street address). 51 source records fed the 37 anchors (14 merges of exact-duplicate/successor name variants of the same building). 16 records deduped against the existing 14 (same buildings under kind-classifier noise: Portsmouth House x4, California Star x4, Mellus & Howard x3, Alta California x2, City Hotel, Custom House, Merchants' Exchange). 1 dropped as a non-SF leak (S. Brannan & Co., 'corner of Front and J street' = Sacramento, the brief's known trap). 1 dropped as a false-positive address match ('L. W. Hastings law office', 'Upper California' matched the spine-street filter on the substring 'california' but is a region reference, not a street address). 9 moved to _meta.batch1_backlog (7 waterfront/foot-of-street deferrals per the brief, 2 co-located/schema-limited deferrals). The shades-tavern entry was reconciled (see its dates.note/source) — verdict: Pacific & Stockton confirmed, anchor unchanged, confidence raised C->B. All new frontFrac intervals were collision-checked against each other and the existing 14 by script (0 collisions across 28 touched block+frontage pairs). Constructed block keys not previously used by the existing 14 (roughly a dozen of the 37) are flagged per-entry as 'unresolved-if-absent' — the brief accepts this; the engine surfaces such reservations as unresolved rather than forcing them.",
    "s95_fix_pass": "s95-fix collision + resolution pass (2026-07-14, Opus data-fix; DATA-only, no engine change). The s95 batch-1 registry failed buildings.footprintsOBB + placement.reservations on: (a) 5 same-block perpendicular-corner WORLD-SPACE footprint overlaps, (b) 1 mid-block ROW centerline crossing, (c) 6 entries the s95 pass believed sat on absent blocks. Fixes reposition ONLY s95 NEW entries — the plaza-cluster 14 (custom-house, school-house, city-hotel, parker-house, el-dorado, dennisons-exchange, bella-union, alta-california-office, howard-mellus-store, shades-tavern, portsmouth-house, merchants-exchange, california-star-office, post-office) are byte-unchanged. (a/b) On B|kearny|montgomery|washington|clay: Clay(south)-edge re-lay-out (starkey-janion-co, shelley-norris, leighton-swasey-co, jj-chauviteau-co) pulled east of el-dorados Kearny-depth projection; Montgomery(east)-edge re-lay-out (drings-store, jewett-melhado, burgoyne-co) clearing New-York-Stores NE corner, Sherman&Ruckels SE corner, and moving jewett-melhado off the portsmouth-street mid-block lane. That lane runs EAST-WEST at block-center v (confirmed by parker/el-dorado curb clips at v~=+/-3.05m); jewett was fixed by a frontFrac v-shift entirely south of the centerline, NOT by depth reduction (depth is perpendicular to this lane and would not clear it). On B|kearny|montgomery|clay|sacramento: ward-smith-ward-co-montgomery + wh-davis-store-montgomery shifted south along Montgomery to clear Howard&Melluss NE corner (ward-smith kept — 174 mentions). On B|kearny|montgomery|jackson|washington: schwerin-garbe-co shifted east along Washington to clear Colonnade Houses SW corner. (c) These were NOT absent blocks: grayson-guild-co, everett-co, mcdonald-reynolds-co, simmons-lilly-co, probst-smith-co carried block key ...|sacramento|california but the live cadastre street id is california-street — a key typo. Corrected to the canonical id; all 5 resolve on the existing (always-present) block (simmons-lilly-co frontFrac0 0.10->0.13 to clear everett-cos NW corner). californian-office-broadway-sansomes block B|sansome|battery|broadway|pacific exists but its surveyed birth (~1847-08-01) postdates the entrys built date 1847-05-22; built clamped to 1847-08-02 (first date the surveyed ground exists) and frontFrac shifted off the Broadway/Sansome NW corner shared with bingham-reynolds-bartlett-co. NET: 51/51 anchored, 0 unresolved, 0 footprint overlaps, 0 ROW intrusions — footprintsOBB + placement.reservations GREEN on both build targets across all 4 noon dates."
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
        "note": "'corner of Pacific and Stockton streets' (operative address from Apr 19 1848); second-tier but persistent tavern with attached bowling alleys, off the high-rent Square. Quadrant unstated — the townward (SE-of-intersection) block is taken. s95 RECONCILIATION: places.jsonl's raw addresses[] array lists 'corner of Pacific and Jackson streets' first, which could be misread as the corpus favoring Jackson over Stockton. Receipt-level review (20 dated receipts, place-tavern-shades-tavern) shows the Jackson citation is a SINGLE ad (C18480412, the tavern's very first notice) superseded exactly one week later (C18480419) by 'corner of Pacific and Stockton streets', which then recurs consistently through Dec 1848 (C18480517, C18481104, CSC18481223 'CORNER PACIFIC AND STOCLTON [STOCKTON] STS' — 7 total Stockton citations vs. 1 Jackson). VERDICT: Pacific & Stockton confirmed as the operative address (the Jackson citation reads as a one-off error in the first ad, corrected the next week); the existing anchor is NOT moved. A fifth address variant, 'corner of Pacific and Dupont streets', appears in the addresses[] array but not in the visible receipt sample (receiptsTruncated:true) and is not further corroborated."
      },
      "confidence": "B",
      "source": "dossier §3.6; corpus C18480419–CSC18481223. If the Pacific/Stockton block is absent at the built date it is surfaced as unresolved, not forced. s95: reconciliation pass reviewed all 20 available receipts (place-tavern-shades-tavern, mentions:37, receiptsTruncated:true) and confirms Pacific&Stockton over the single Pacific&Jackson citation; confidence raised C->B on the strength of this corroboration, though the exact quadrant remains unstated as before."
    },
    {
      "landmarkId": "portsmouth-house",
      "name": "Portsmouth House",
      "dossier": "§1.6",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.05,
        "frontFrac1": 0.38,
        "depthM": 20,
        "corner": "NW"
      },
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
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|jackson|washington",
        "frontage": "south",
        "frontStreet": "washington",
        "frontFrac0": 0.3,
        "frontFrac1": 0.65,
        "depthM": 16,
        "corner": false
      },
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
      "anchor": {
        "kind": "block-frontage",
        "block": "B|dupont|kearny|jackson|washington",
        "frontage": "south",
        "frontStreet": "washington",
        "frontFrac0": 0.44,
        "frontFrac1": 0.54,
        "depthM": 12,
        "corner": false
      },
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
      "anchor": {
        "kind": "block-frontage",
        "block": "B|stockton|dupont|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.1,
        "frontFrac1": 0.38,
        "depthM": 14,
        "corner": "SW"
      },
      "approximate": true,
      "dates": {
        "built": "1849-03-01",
        "note": "the FORMAL Clay & Pike civilian post office, opened March 1849 (timeline-spine.md/FoundSF POST_OFFICE_1849) — distinct from the informal 1847 Quartermaster-office 'Post Office' (C18470605), which is NOT anchored here (no location beyond 'the Quarter Master at the several points at which troops are stationed'). PRESENCE-OVER-PRECISION placement: Pike Street is verified (this pass, cast.md + web research) to be the same street later renamed Waverly Place — cast.md independently attests this twice ('27 Waverly Place (formerly Pike Street)', Charles Cora and Belle Cora entries) and modern sources confirm Waverly Place runs one block WEST of Grant Ave/Dupont, between Washington and Sacramento Streets (crossing Clay), parallel to Dupont and Stockton — i.e. Pike/Waverly is the mid-block alley in the Stockton-Dupont corridor, NOT between Dupont and Kearny. (NOTE: timeline-part-1849.md's phrasing 'southwest corner of Pike (later Clay) and Clay Streets' reads as a transcription glitch — read against cast.md's clean double-attestation, Pike was renamed to Waverly Place, not to Clay.) Pike/Waverly itself is not in the street spine, so the intersection is approximated onto the nearest resolvable block: B|stockton|dupont|clay|sacramento (the Clay-fronting block south of Clay, spanning Stockton to Dupont), positioned toward its west (Stockton) portion per the dossier's own 'southwest corner of Pike and Clay' phrasing (west of the mid-block alley, south of Clay)."
      },
      "confidence": "B",
      "source": "dossier §1.9; timeline-part-1849.md/timeline-spine.md (Clay & Pike, March 1849, FoundSF POST_OFFICE_1849); cast.md (Charles Cora, Belle Cora entries: '27 Waverly Place (formerly Pike Street)') for the Pike=Waverly identification; WebSearch this pass (gpsmycity.com, evendo.com, Medium/Doug Chan) corroborating Waverly Place's Washington-Sacramento, one-block-west-of-Grant-Ave position. Block/frontFrac position is an approximation onto the nearest spine block, not a corpus-resolved footprint."
    },
    {
      "landmarkId": "ward-smith-ward-co-montgomery",
      "name": "Ward & Smith / Ward & Co",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|clay|sacramento",
        "frontage": "east",
        "frontStreet": "montgomery",
        "frontFrac0": 0.26,
        "frontFrac1": 0.48,
        "depthM": 18,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1847-02-06",
        "note": "'No. 3 Montgomery street' (Ward & Smith, attested 1847-02-06 to 1849-06-07, 174+10 mentions across name-variant records) continues as 'Ward & Co' from 1849-06-28 ('late Ward & Smith' self-identifies as the successor firm; one 1849 ad reads 'Montgomery street, corner Clay'). Treated as ONE physical storefront under two successive trading names rather than two separate footprints — a merge judgment call. built=firstSeen is a mention proxy, not a construction date."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-ward-smith (174), place-store-ward-co (34), place-store-ward-smith-store (10, dup). Corner/quadrant at the Clay end of Montgomery inferred from the low street number and the one 'corner Clay' Ward & Co ad; not corpus-pinned to this exact block. Flagged: three source records merged into one landmark on a succession judgment call."
    },
    {
      "landmarkId": "wh-davis-store-montgomery",
      "name": "W. H. Davis store",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|clay|sacramento",
        "frontage": "east",
        "frontStreet": "montgomery",
        "frontFrac0": 0.5,
        "frontFrac1": 0.68,
        "depthM": 16,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1847-07-10",
        "note": "'No. 2, Montgomery street' (W. H. Davis, sole trader, 1847-07-10 to 1848-06-03); a duplicate-kind record 'WM. H. DAVIS store' (8 mentions, same proprietor) merged in. Kept distinct from the later 'Davis & Carter' partnership store (different address emphasis, later window) rather than merged with it — a judgment call, since both involve William H. Davis."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-w-h-davis-store (34), place-store-wm-h-davis-store (8, dup merged). Position along Montgomery is ordinal (adjacent to the low-numbered Ward & Smith storefront), not corpus-resolved."
    },
    {
      "landmarkId": "starkey-janion-co",
      "name": "Starkey, Janion & Co",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "south",
        "frontStreet": "clay",
        "frontFrac0": 0.19,
        "frontFrac1": 0.33,
        "depthM": 18,
        "corner": "SW"
      },
      "approximate": true,
      "dates": {
        "built": "1848-09-02",
        "note": "'corner of Clay and Kearney sts' (also 'foot California st.' for a later/second address, not used here), attested 1848-09-02 to 1849-11-29, 67 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-starkey-janion-co. Corner streets explicit; the specific quadrant (of 4 at Clay&Kearny — the other 3 already hold City Hotel, Portsmouth House-approx, and the Portsmouth Square reserve itself) is inferred as the only open quadrant, not corpus-pinned."
    },
    {
      "landmarkId": "shelley-norris",
      "name": "SHELLEY & NORRIS",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "south",
        "frontStreet": "clay",
        "frontFrac0": 0.35,
        "frontFrac1": 0.47,
        "depthM": 16,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1847-07-10",
        "note": "'corner of Clay and Kearny streets', attested 1847-07-10 to 1847-10-27 (9 mentions) — closes BEFORE Starkey, Janion & Co opens at the same corner phrase (1848-09-02). No time overlap: plausibly the same physical corner storefront under sequential tenants, not two separate buildings. Modeled here as an adjacent, non-overlapping slice on the same frontage rather than sharing Starkey Janion's footprint, since the schema has no lifecycle/succession field."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-shelley-norris. Flagged for Director: likely the same corner as starkey-janion-co under an earlier tenant, not independently verified as a distinct footprint."
    },
    {
      "landmarkId": "davis-carter",
      "name": "Davis & Carter",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|montgomery|sansome|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.02,
        "frontFrac1": 0.25,
        "depthM": 18,
        "corner": "NW"
      },
      "approximate": true,
      "dates": {
        "built": "1848-09-02",
        "note": "'corner of Clay and Montgomery streets', attested 1848-09-02 to 1849-06-07, 36 mentions — the most-mentioned of the Clay&Montgomery-corner store cluster after Howard & Mellus (which already holds the Kearny-Montgomery/Clay-Sacramento block's Montgomery-end Clay frontage)."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-davis-carter. Corner streets explicit; the exact quadrant (one of the 3 remaining, since Howard & Mellus occupies the SW-real/NE-labeled one) is inferred, not corpus-pinned — William H. Davis of this partnership is likely the same person as the solo W. H. Davis store, unconfirmed."
    },
    {
      "landmarkId": "sherman-ruckel",
      "name": "Sherman & Ruckel",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "south",
        "frontStreet": "clay",
        "frontFrac0": 0.75,
        "frontFrac1": 0.97,
        "depthM": 18,
        "corner": "SE"
      },
      "approximate": true,
      "dates": {
        "built": "1848-07-15",
        "note": "'corner of Clay and Montgomery streets', attested 1848-07-15 to 1849-11-22, 27 mentions; corroborated by E. Mickle & Co.'s ad citing 'warehouse of Messrs. Sherman & Ruckle, corner of Clay and Montgomery sts.' as a landmark reference, confirming a well-known corner presence."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-sherman-ruckel; cross-ref place-store-e-mickle-co. Quadrant (2nd of the 3 open Clay&Montgomery corners) inferred, not corpus-pinned."
    },
    {
      "landmarkId": "bleecker-vandyke-belden",
      "name": "Bleecker, Van Dyke & Belden",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|montgomery|sansome|washington|clay",
        "frontage": "south",
        "frontStreet": "clay",
        "frontFrac0": 0.03,
        "frontFrac1": 0.25,
        "depthM": 16,
        "corner": "SW"
      },
      "approximate": true,
      "dates": {
        "built": "1849-08-04",
        "note": "'cor. Montgomery and Clay sts.', attested 1849-08-04 to 1849-11-22, 12 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-bleecker-van-dyke-belden. Quadrant (3rd of the 3 open Clay&Montgomery corners) inferred, not corpus-pinned."
    },
    {
      "landmarkId": "a-hugues-pioche-co",
      "name": "A. Hugues, Pioche & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|montgomery|sansome|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.3,
        "frontFrac1": 0.55,
        "depthM": 18,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-03-15",
        "note": "'Clay street' only, no cross street, attested 1849-03-15 to 1849-11-29, 37 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-a-hugues-pioche-co. Placed on the Clay-fronting block east of Montgomery (open ground after Davis & Carter's corner slice); position along Clay is ordinal, not corpus-resolved."
    },
    {
      "landmarkId": "cross-hobson-co",
      "name": "Cross, Hobson & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|montgomery|sansome|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.58,
        "frontFrac1": 0.8,
        "depthM": 16,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1848-12-23",
        "note": "'Clay Street' only, no cross street, attested 1848-12-23 to 1849-11-15, 28 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-cross-hobson-co. Same block as a-hugues-pioche-co; position along Clay is ordinal, not corpus-resolved."
    },
    {
      "landmarkId": "robert-a-parker-store",
      "name": "Robert A. Parker's Store (Adobe House)",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|dupont|kearny|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.05,
        "frontFrac1": 0.28,
        "depthM": 16,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1847-06-05",
        "note": "'Clay street' / named 'the Adobie House' (a distinctive older adobe building), attested 1847-06-05 to 1848-11-18, 22 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-robert-a-parker-s-store. Placed on the City Hotel block's open Clay frontage (west of City Hotel's own footprint) on the reasoning that a named older adobe building plausibly sits on the square-fronting block; position is ordinal, not corpus-resolved."
    },
    {
      "landmarkId": "leighton-swasey-co",
      "name": "Leighton, Swasey & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "south",
        "frontStreet": "clay",
        "frontFrac0": 0.49,
        "frontFrac1": 0.61,
        "depthM": 14,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1848-12-23",
        "note": "'Clay Street' only, no cross street, attested 1848-12-23 to 1849-07-02, 11 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-leighton-swasey-co. Placed in the mid-block Clay-frontage gap between the Clay&Kearny and Clay&Montgomery corner clusters on this block; position ordinal, not corpus-resolved."
    },
    {
      "landmarkId": "jj-chauviteau-co",
      "name": "J. J. Chauviteau & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "south",
        "frontStreet": "clay",
        "frontFrac0": 0.63,
        "frontFrac1": 0.74,
        "depthM": 14,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-07-26",
        "note": "'Clay street' only, no cross street, attested 1849-07-26 to 1849-11-29, 9 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-j-j-chauviteau-co. Same block as leighton-swasey-co; position ordinal, not corpus-resolved."
    },
    {
      "landmarkId": "woodruff-addison",
      "name": "Woodruff & Addison",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|stockton|dupont|clay|sacramento",
        "frontage": "north",
        "frontStreet": "clay",
        "frontFrac0": 0.4,
        "frontFrac1": 0.6,
        "depthM": 16,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-07-02",
        "note": "'Clay st., above Portsmouth square', attested 1849-07-02 to 1849-10-04, 11 mentions — 'above' read as west of the square along Clay, toward Stockton."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-woodruff-addison. Placed on the Post Office's block (open Clay frontage west of the existing post-office reservation); 'above the square' reading is a judgment call."
    },
    {
      "landmarkId": "new-york-store-ross",
      "name": "New York Store (C. L. Ross)",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "north",
        "frontStreet": "washington",
        "frontFrac0": 0.72,
        "frontFrac1": 0.98,
        "depthM": 18,
        "corner": "NE"
      },
      "approximate": true,
      "dates": {
        "built": "1847-09-25",
        "note": "'corner of Montgomery and Washington streets' / 'Cor. Washington & Montgomery Sts.', explicit and repeated across five name-variant records spanning C. L. Ross's operation under his own name and successive partnership names (C. L. Ross → C. L. Ross store → NEW YORK STORE / N. Y. Store → Ross, Benton & Co.), 1847-09-25 through 1849-11-08, 136 combined mentions. Corroborated independently by CENTRE MARKET's ad text 'opposite the New York Store'. built=firstSeen (C. L. Ross's earliest appearance) is a mention proxy."
      },
      "confidence": "A",
      "source": "places.jsonl place-store-new-york-store (53), place-store-n-y-store (38), place-store-c-l-ross-store (21), place-store-ross-benton-co (15), place-store-c-l-ross (9) — 5 records merged as one continuously-operated corner storefront under one proprietor's evolving trade names. This is the largest merge judgment call in this batch; flagged for Director review. Quadrant (of 4 at Washington&Montgomery) inferred as the only one not yet claimed by an existing or newly-anchored landmark, not corpus-pinned."
    },
    {
      "landmarkId": "centre-market",
      "name": "Centre Market",
      "kind": "market",
      "class": "market",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|montgomery|sansome|jackson|washington",
        "frontage": "south",
        "frontStreet": "washington",
        "frontFrac0": 0.03,
        "frontFrac1": 0.3,
        "depthM": 14,
        "corner": "SW"
      },
      "approximate": true,
      "dates": {
        "built": "1848-10-21",
        "note": "'Corner of Washington and Montgomery sts., opposite the New York Store' (explicit cross-reference), attested 1848-10-21 to 1849-06-07, 17 mentions. One receipt gives 'corner of Jackson and Montgomery streets' instead — read as a one-off transcription slip against the 3-of-4 Washington/Montgomery citations."
      },
      "confidence": "B",
      "source": "places.jsonl place-market-centre-market. Placed on the block across Montgomery from new-york-store-ross per the 'opposite' phrasing; exact quadrant among the streets-Washington/Montgomery intersection's four corners is inferred."
    },
    {
      "landmarkId": "robert-wells-co",
      "name": "Robert Wells & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|clay|sacramento",
        "frontage": "south",
        "frontStreet": "sacramento",
        "frontFrac0": 0.75,
        "frontFrac1": 0.97,
        "depthM": 16,
        "corner": "SE"
      },
      "approximate": true,
      "dates": {
        "built": "1848-09-30",
        "note": "'corner of Sacramento and Montgomery streets', attested 1848-09-30 to 1849-11-08 across two name-variant records (R. Wells & Co., no cross-street given, merged with Robert Wells & Co., corner explicit), 27 combined mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-r-wells-co (14), place-store-robert-wells-co (13) — merged as the same proprietor. Quadrant (1 of 3 open at Sacramento&Montgomery) inferred, not corpus-pinned."
    },
    {
      "landmarkId": "osborn-brannan",
      "name": "Osborn & Brannan",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|montgomery|sansome|clay|sacramento",
        "frontage": "south",
        "frontStreet": "sacramento",
        "frontFrac0": 0.03,
        "frontFrac1": 0.25,
        "depthM": 16,
        "corner": "SW"
      },
      "approximate": true,
      "dates": {
        "built": "1849-07-26",
        "note": "'corner Montgomery and Sacramento sts' (majority) vs one 'corner Montgomery and Sansome sts.' outlier, attested 1849-07-26 to 1849-11-29, 13 mentions. NOTE: this record DOES carry street addresses, which refines (does not contradict) the existing _meta note that Osborn & Brannan's record is 'unaddressed' — that note was about it not being evidence for Sam Brannan's OWN store location; Osborn & Brannan's auction-room partnership has its own, separate, defensible corner."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-osborn-brannan. Quadrant (2nd of 3 open at Sacramento&Montgomery) inferred. Flagged: this record has addresses despite the existing sam-brannan-store unanchorable note describing Osborn & Brannan's record as address-less; worth a Director sanity check against the source data."
    },
    {
      "landmarkId": "grayson-guild-co",
      "name": "Grayson, Guild & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|sacramento|california-street",
        "frontage": "north",
        "frontStreet": "sacramento",
        "frontFrac0": 0.75,
        "frontFrac1": 0.97,
        "depthM": 14,
        "corner": "NE"
      },
      "approximate": true,
      "dates": {
        "built": "1849-08-16",
        "note": "'corner of Sacramento and Montgomery sts', attested 1849-08-16 to 1849-11-08, 8 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-grayson-guild-co. Quadrant (3rd of 3 open at Sacramento&Montgomery) inferred, not corpus-pinned. Constructed block (kearny-montgomery/sacramento-california) is south of the existing Howard & Mellus block; flagged as an unresolved-if-absent key. s95-fix: the block key here was a typo — the live cadastre street id is \"california-street\", not \"california\"; corrected, so any \"unresolved-if-absent\" flag above no longer applies and the entry resolves on the existing always-present block."
    },
    {
      "landmarkId": "everett-co",
      "name": "Everett & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|sacramento|california-street",
        "frontage": "west",
        "frontStreet": "kearny",
        "frontFrac0": 0.02,
        "frontFrac1": 0.22,
        "depthM": 14,
        "corner": "NW"
      },
      "approximate": true,
      "dates": {
        "built": "1847-12-29",
        "note": "'Corner Sacramento and Kearny sts.', attested 1847-12-29 to 1849-12-06, 10 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-everett-co. Quadrant inferred (this construction places it on the Grayson-Guild/Simmons-Lilly/Probst-Smith block's Kearny-facing edge). Constructed block flagged as unresolved-if-absent. s95-fix: the block key here was a typo — the live cadastre street id is \"california-street\", not \"california\"; corrected, so any \"unresolved-if-absent\" flag above no longer applies and the entry resolves on the existing always-present block."
    },
    {
      "landmarkId": "mcdonald-reynolds-co",
      "name": "McDonald, Reynolds & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|sacramento|california-street",
        "frontage": "west",
        "frontStreet": "kearny",
        "frontFrac0": 0.24,
        "frontFrac1": 0.42,
        "depthM": 12,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-08-31",
        "note": "'Kearny street, 2 doors above Sacramento', attested 1849-08-31 to 1849-11-29, 8 mentions — 'above Sacramento' read as just north of the Sacramento&Kearny corner, set back from everett-co's corner slice."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-mcdonald-reynolds-co. Same block as everett-co; 'two doors above' gives relative but not absolute position. s95-fix: the block key here was a typo — the live cadastre street id is \"california-street\", not \"california\"; corrected, so any \"unresolved-if-absent\" flag above no longer applies and the entry resolves on the existing always-present block."
    },
    {
      "landmarkId": "simmons-lilly-co",
      "name": "Simmons, Lilly & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|sacramento|california-street",
        "frontage": "north",
        "frontStreet": "sacramento",
        "frontFrac0": 0.13,
        "frontFrac1": 0.35,
        "depthM": 16,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-07-02",
        "note": "'Sacramento street' (also 'Sacramento st., between Montgomery and Kearney sts.' — consistent with this block) is the majority address; one receipt gives 'Sansome Street near Pacific street' instead, read as a separate retail branch not anchored here. Attested 1849-07-02 to 1849-12-06, 14 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-simmons-lilly-co. Address conflict (Sacramento st. primary vs. a Sansome/Pacific retail-branch mention) flagged; only the Sacramento st. address is anchored. s95-fix: the block key here was a typo — the live cadastre street id is \"california-street\", not \"california\"; corrected, so any \"unresolved-if-absent\" flag above no longer applies and the entry resolves on the existing always-present block."
    },
    {
      "landmarkId": "probst-smith-co",
      "name": "Probst, Smith & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|sacramento|california-street",
        "frontage": "south",
        "frontStreet": "california",
        "frontFrac0": 0.3,
        "frontFrac1": 0.55,
        "depthM": 16,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-04-05",
        "note": "Two addresses across the run: 'Washington street' / '19 Washington street' (earlier) then '43 California street' / 'California Street' (more specific, taken as the later/operative address). Attested 1849-04-05 to 1849-12-06, 24 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-probst-smith-co. Anchored at the more specific numbered California St. address; the earlier Washington St. address is not separately anchored. Constructed California-fronting block is new to this registry — flagged as unresolved-if-absent. s95-fix: the block key here was a typo — the live cadastre street id is \"california-street\", not \"california\"; corrected, so any \"unresolved-if-absent\" flag above no longer applies and the entry resolves on the existing always-present block."
    },
    {
      "landmarkId": "colonnade-house",
      "name": "Colonnade House",
      "kind": "hotel",
      "class": "hotel",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|jackson|washington",
        "frontage": "west",
        "frontStreet": "kearny",
        "frontFrac0": 0.72,
        "frontFrac1": 0.95,
        "depthM": 20,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1848-03-29",
        "note": "'Kearny Street, a few doors from Portsmouth Square', attested 1848-03-29 to 1849-07-02, 18 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-hotel-colonnade-house. Placed on Dennison's Exchange's block (Kearny frontage, north of Parker House/El Dorado's block, open ground north of Dennison's own footprint) as the nearest 'few doors up Kearny from the square' reading; exact block among plausible Kearny-corridor blocks is a judgment call."
    },
    {
      "landmarkId": "hood-wilson",
      "name": "Hood & Wilson",
      "kind": "manufactory",
      "class": "manufactory",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|pacific|jackson",
        "frontage": "north",
        "frontStreet": "pacific",
        "frontFrac0": 0.03,
        "frontFrac1": 0.28,
        "depthM": 16,
        "corner": "NW"
      },
      "approximate": true,
      "dates": {
        "built": "1848-03-29",
        "note": "'Corner of Kearny and Pacific Sts.', attested across two name-variant records (Hood & Wilson, Hood & Wilson Shop) 1848-03-29 to 1849-06-28, 31 combined mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-manufactory-hood-wilson (21), place-manufactory-hood-wilson-shop (10) — merged, same proprietors. Quadrant inferred."
    },
    {
      "landmarkId": "tent-store",
      "name": "Tent Store",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|pacific|jackson",
        "frontage": "south",
        "frontStreet": "jackson",
        "frontFrac0": 0.05,
        "frontFrac1": 0.28,
        "depthM": 14,
        "corner": "SW"
      },
      "approximate": true,
      "dates": {
        "built": "1849-07-02",
        "note": "'corner of Kearny and Jackson sts.', attested 1849-07-02 to 1849-11-22, 14 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-tent-store. Same block as hood-wilson (different frontage); quadrant inferred."
    },
    {
      "landmarkId": "public-house-denecke-wissell",
      "name": "Public House (Denecke's / New Hotel, Wissell's)",
      "kind": "hotel",
      "class": "hotel",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|sansome|battery|pacific|jackson",
        "frontage": "north",
        "frontStreet": "pacific",
        "frontFrac0": 0.05,
        "frontFrac1": 0.3,
        "depthM": 20,
        "corner": "NW"
      },
      "approximate": true,
      "dates": {
        "built": "1847-12-15",
        "note": "'corner of Pacific & Sansome streets', attested under 'Public House' (Peter Davidson, then George Denecke) 1847-12-15 to 1848-12-23, then continues at the same corner and proprietor lineage (Denecke) as 'New Hotel (formerly Denecke's Public House)' under Frederick Wissell & Co. 1849-02-15 to 1849-10-25 — the same building renamed, not a new footprint. 31 combined mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-tavern-public-house (23), place-hotel-new-hotel-formerly-denecke-s-public-house (8) — merged as one building under successive names/operators at the same corner. Quadrant inferred."
    },
    {
      "landmarkId": "sign-of-the-watch",
      "name": "Sign of the Watch",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|sansome|battery|pacific|jackson",
        "frontage": "south",
        "frontStreet": "jackson",
        "frontFrac0": 0.05,
        "frontFrac1": 0.28,
        "depthM": 14,
        "corner": "SW"
      },
      "approximate": true,
      "dates": {
        "built": "1848-04-12",
        "note": "'corner of Jackson and Sansome sts.', attested 1848-04-12 to 1849-02-22, 12 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-sign-of-the-watch. Same block as public-house-denecke-wissell (different frontage); quadrant inferred."
    },
    {
      "landmarkId": "blythe-co",
      "name": "Blythe & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|dupont|kearny|pacific|jackson",
        "frontage": "north",
        "frontStreet": "pacific",
        "frontFrac0": 0.05,
        "frontFrac1": 0.25,
        "depthM": 14,
        "corner": "NW"
      },
      "approximate": true,
      "dates": {
        "built": "1849-05-17",
        "note": "'corner of Pacific and Dupont streets', attested 1849-05-17 to 1849-11-22, 8 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-blythe-co. Quadrant inferred; constructed block flagged as unresolved-if-absent."
    },
    {
      "landmarkId": "buckland-house",
      "name": "Buckland House",
      "kind": "hotel",
      "class": "hotel",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|broadway|pacific",
        "frontage": "south",
        "frontStreet": "pacific",
        "frontFrac0": 0.1,
        "frontFrac1": 0.35,
        "depthM": 18,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-05-24",
        "note": "'Pacific street' only, no cross street, attested 1849-05-24 to 1849-10-04, 14 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-hotel-buckland-house. Constructed block flagged as unresolved-if-absent; position along Pacific is ordinal."
    },
    {
      "landmarkId": "salmon-ellis",
      "name": "Salmon & Ellis",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|broadway|pacific",
        "frontage": "south",
        "frontStreet": "pacific",
        "frontFrac0": 0.37,
        "frontFrac1": 0.55,
        "depthM": 14,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-07-26",
        "note": "'Pacific street, next the Buckland House', attested 1849-07-26 to 1849-12-06, 18 mentions — placed immediately adjacent to buckland-house per the explicit cross-reference."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-salmon-ellis. Relative position (next to Buckland House) is corpus-attested; the block itself is a construction, flagged as unresolved-if-absent."
    },
    {
      "landmarkId": "californian-office-broadway-sansome",
      "name": "The Californian (newspaper office)",
      "kind": "newspaper_office",
      "class": "newspaper-office",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|sansome|battery|broadway|pacific",
        "frontage": "north",
        "frontStreet": "broadway",
        "frontFrac0": 0.21,
        "frontFrac1": 0.46,
        "depthM": 14,
        "corner": "NW"
      },
      "approximate": true,
      "dates": {
        "built": "1847-08-02",
        "note": "'corner Broadway and Sansome Sts.' across four name-variant records, 133 combined mentions. DIRECTOR CORRECTION (2026-07-14): built moved from the s95 mention-proxy 1846-08-15 (the paper's Monterey FOUNDING date under Colton & Semple, before it moved to SF) to 1847-05-22, the documented resumption of publication in San Francisco — the earliest the Broadway/Sansome office could stand. Corner streets explicit and well-corroborated (SF masthead 'CALIFORNIAN. SAN FRANCISCO' by Sept 1847); quadrant inferred; the exact first Broadway/Sansome citation date is still unpinned, so 1847-05-22 remains a best-effort SF-era anchor, not a construction record."
      },
      "confidence": "A",
      "source": "places.jsonl place-newspaper-office-the-californian (53), place-newspaper-office-californian-office (34), place-newspaper-office-californian (30), place-newspaper-office-office-of-the-californian (16) — 4 records merged as the same paper's SF office. Corner streets explicit and well-corroborated; quadrant inferred. Flagged: the built date is the weakest part of this otherwise strong anchor. s95-fix: built clamped 1847-05-22 -> 1847-08-02 (the surveyed block B|sansome|battery|broadway|pacific is born ~1847-08-01; the office cannot anchor to ground before it is surveyed) and frontFrac shifted off the Broadway/Sansome NW corner it shared with bingham-reynolds-bartlett-co."
    },
    {
      "landmarkId": "bingham-reynolds-bartlett-co",
      "name": "Bingham, Reynolds, Bartlett, & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|sansome|battery|broadway|pacific",
        "frontage": "west",
        "frontStreet": "sansome",
        "frontFrac0": 0.05,
        "frontFrac1": 0.3,
        "depthM": 16,
        "corner": "NW"
      },
      "approximate": true,
      "dates": {
        "built": "1849-08-23",
        "note": "'corner of Sansome street and Broadway', also 'two doors from De Witt and Harrison's', attested 1849-08-23 to 1849-11-15, 12 mentions."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-bingham-reynolds-bartlett-co. Placed on the Sansome-facing edge of the same corner block as the Californian office (different frontage face of the same corner); quadrant inferred."
    },
    {
      "landmarkId": "de-witt-harrison",
      "name": "De Witt & Harrison",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|sansome|battery|broadway|pacific",
        "frontage": "west",
        "frontStreet": "sansome",
        "frontFrac0": 0.33,
        "frontFrac1": 0.55,
        "depthM": 18,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1848-11-25",
        "note": "'Sansome street, opposite the Government Reserve', attested across two name-variant records (De Witt & Harrison, DeWitt & Harrison) 1848-11-25 to 1849-11-22, 28 combined mentions; Bingham, Reynolds, Bartlett & Co.'s ad places itself 'two doors' north of this store, which is used to set its position just south of bingham-reynolds-bartlett-co on the same frontage."
      },
      "confidence": "B",
      "source": "places.jsonl place-store-de-witt-harrison (18), place-store-dewitt-harrison (10) — merged, same proprietors. 'Government Reserve' identification (the Clark's Point-area military/public reserve) and quadrant are inferred, not corpus-pinned."
    },
    {
      "landmarkId": "schwerin-garbe-co",
      "name": "Schwerin, Garbe & Co.",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|jackson|washington",
        "frontage": "south",
        "frontStreet": "washington",
        "frontFrac0": 0.18,
        "frontFrac1": 0.29,
        "depthM": 14,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-08-16",
        "note": "'Washington st.' only, no cross street, attested 1849-08-16 to 1849-11-22, 10 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-schwerin-garbe-co. Placed on the Merchants' Exchange block's open Washington frontage (west of the existing merchants-exchange reservation); position ordinal, not corpus-resolved."
    },
    {
      "landmarkId": "drings-store",
      "name": "Dring's store",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "east",
        "frontStreet": "montgomery",
        "frontFrac0": 0.23,
        "frontFrac1": 0.38,
        "depthM": 14,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-01-04",
        "note": "'Montgomery Street' only, no cross street, attested 1849-01-04 to 1849-04-19, 14 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-dring-s-store. Position along Montgomery is ordinal, not corpus-resolved."
    },
    {
      "landmarkId": "jewett-melhado",
      "name": "Jewett & Melhado",
      "kind": "store",
      "class": "store",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "east",
        "frontStreet": "montgomery",
        "frontFrac0": 0.55,
        "frontFrac1": 0.66,
        "depthM": 14,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-07-12",
        "note": "'Montgomery Street' only, no cross street, attested 1849-07-12 to 1849-11-08, 8 mentions."
      },
      "confidence": "C",
      "source": "places.jsonl place-store-jewett-melhado. NOTE: 'Jewett & Melhado' also appear as proprietor names on the existing merchants-exchange record — this store and the Exchange tenancy may be the same people operating two ventures, or one conflated record; not resolved here, flagged for Director review."
    },
    {
      "landmarkId": "burgoyne-co",
      "name": "Burgoyne & Co.",
      "kind": "bank",
      "class": "bank",
      "anchor": {
        "kind": "block-frontage",
        "block": "B|kearny|montgomery|washington|clay",
        "frontage": "east",
        "frontStreet": "montgomery",
        "frontFrac0": 0.68,
        "frontFrac1": 0.78,
        "depthM": 14,
        "corner": false
      },
      "approximate": true,
      "dates": {
        "built": "1849-08-31",
        "note": "'Montgomery street' only, no cross street, attested 1849-08-31 to 1849-12-01, 10 mentions. Notable as the batch's only bank-kind candidate."
      },
      "confidence": "C",
      "source": "places.jsonl place-bank-burgoyne-co. Position along Montgomery is ordinal, not corpus-resolved."
    }
  ]
};
