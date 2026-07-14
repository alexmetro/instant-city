/* AUTO-GENERATED from data/plat-lots-known.json (docs repo) — do not hand-edit.
 * The digitized survey lot registry consumed by core/08-cadastre cadApplyRecord()
 * as window.PLAT_LOTS_KNOWN. Regenerate when the source JSON changes.
 * s86: 68 records (14 Eddy spine-matched + 54 Buckelew 1847, descriptive block_refs
 * carrying cadKey/unresolved + owners[] witness chains). */
window.PLAT_LOTS_KNOWN = {
  "_meta": {
    "title": "Plat lots known -- digitized survey registry (s85 stage-1b core + Buckelew 1847 stage-2 extension)",
    "generated": "2026-07-14",
    "status": "v2 -- the Portsmouth Square plaza-ring core (Eddy 1849, GOLD/HIGH) PLUS two rings of blocks immediately around the plaza read off the earlier Buckelew Feb 1847 map (see _meta.buckelew_1847_pass for method/coverage/flags). COVERAGE BOUNDARY (honest, per the s85 brief 'partial-but-true beats complete-but-assumed'): 3 Eddy-1849 blocks (14 records) + 14 Buckelew-1847 blocks (54 records) = 17 blocks / 68 lot records total, all within ~2 blocks of Portsmouth Square. The Kearny/Montgomery commercial-spine extension further out, the 1901 Block Book widths pass, and most of the Buckelew sheet's outer rows (NW corner ~lots 341-360, the Broadway/Vallejo edge column ~216-236, the Montgomery/Sloat waterfront ~183-210, McKinley Square) remain DEFERRED -- legible but not transcribed this pass.",
    "source_map": "research/map-scans/eddy-1849.jpg (Eddy 1849 official re-survey; Stanford/Rumsey DRUID xg004hm0718, CC BY-NC-SA 3.0)",
    "underlying_survey": "O'Farrell 1847 fifty-vara survey (Eddy's 1849 map is the earliest independently digitized proxy)",
    "join_key": "block_ref is EITHER the live cadastre block key (Eddy spine-matched records) OR a descriptive Buckelew ref; in the latter case a `cadKey` field carries the resolved cadastre key when one could be derived, else `unresolved` documents why (s86). block_ref (spine-matched) is the LIVE CADASTRE block key (app/src/core/08-cadastre.js deriveGroundPlan: 'B|west|east|north|south' street-id edge key); iU/iV are the pattern-lot ordinals within that block (iU 0..nU-1 west->east, iV 0..nV-1 north->south). cadApplyRecord() stamps the recorded lot_number + source onto the matching pattern lot (source:'record'); pattern-fill everywhere else. This makes the record the OVERRIDE, the 50-vara pattern the FILL (building-spawn-spec.md 1.3-3a).",
    "georeferencing_method": "Lot NUMBERS + the 2x3 six-lot subdivision are read directly off the scan (HIGH confidence). Coordinates come from the DOCUMENTED grid transform, never scan pixel-picking (VALIDATION-2026-07-11.md flagged pixel-picking on this scan as +/-150px). v1 overlays IDENTITY; fractional-lot GEOMETRY (which axis 19-1/2 splits) is a fast-follow pending Block Book widths.",
    "vara_definition": "1 California vara = 33 in = 0.8382 m (METROLOGY-PHASE0.md S0, verified). A 50-vara lot = 41.910 m square.",
    "rulings_this_pass": {
      "lot_52_conflict": "RESOLVED (s85). The stage-1 draft FLAGGED a conflict: a corpus ad (DAC18491212/14/17) cites '50 vara Lot No. 52 ... centrally situated on Washington street' -- read as inconsistent with the plat placing lot 52 on the block's Dupont (west) edge. Reading the FULL corpus snippet this pass dissolves the conflict: it reads '...50 vara Lot No. 52, with the convenient dwelling house and offices thereon, centrally situated on WASHINGTON AND DUPONT sts. AND PORTSMOUTH [Square]' (DAC18491212). That is a CORNER lot at the Washington x Dupont corner, adjacent to the plaza -- exactly the NW corner of the plaza block, fronting Dupont at the Washington cross-street. The plat placement (west edge, north/Washington end) is CONSISTENT with the corpus. The stage-1 flag was an artifact of a truncated snippet ('Washington street' only). Lot 52 upgraded to GOLD; lot 51 is directly south of it (Dupont frontage, next to the plaza).",
      "plaza_block_extent_finding": "The plat shows lots 51/52 (with documented dwelling houses) on the Dupont edge of the SAME block that holds Portsmouth Square -- i.e. the plaza did NOT occupy the full block; it shared its block with private Dupont-frontage lots. The s85 cadastre (inheriting s82) models the ENTIRE plaza block as a publicReserve with ZERO plat lots, so records 51/52 cannot be stamped and are surfaced as platRecords 'public-reserve-zero-lots' unmatched (honest, not forced). FLAG for a future pass: the plaza reserve should be narrowed to exclude the Dupont-frontage lots 51/52, OR the plaza block model revisited. Not changed here (s82 is signed-off substrate; this is a scoped reconciliation item)."
    },
    "confidence_tier_key": {
      "lot_existence_and_number": "HIGH -- directly legible on a high-resolution scan of a named, dated official survey map",
      "lot_precise_boundary": "MODERATE -- derived from the grid transform + assumed uniform subdivision, not pixel-measured",
      "record_join": "the block_ref/iU/iV join to the live cadastre is EXACT (verified against the running plan, s85)"
    },
    "buckelew_1847_pass": {
      "date": "2026-07-14",
      "mandate": "Extend the registry with a full read of the Buckelew Feb 22 1847 map (research/map-scans/plats/sf-plan-1847-02-22-bartlett-buckelew.jpg, 5511x6735, Yale Beinecke WA MSS S-1882), per research/lot-sources-stage2.md priority #1.",
      "method": "Symbolic extraction only -- lot numbers, owner names, and block adjacency read directly off the (excellently legible) cloth-map scan via Pillow crops; NO pixel registration attempted (per stage-1/stage-1b method guardrail). Coordinates/positions for the two blocks that match the LIVE CADASTRE (Portsmouth Square, Block C) are inherited from the existing georeferenced records. All NEW blocks this pass are recorded with a descriptive block_ref (block_ref_spine_match:false) rather than a cadastre key, because this map's own hand-drawn layout could not be reliably resolved to compass directions (see orientation_caveat) -- forcing a west|east|north|south key would have been a guess, not a reading.",
      "orientation_caveat": "This sheet does not use a consistent north-up drawing convention: the same real-world street (e.g. Kearny) reads as a page-HORIZONTAL divider in one part of the sheet and a page-VERTICAL divider elsewhere, and block rows/columns do not resolve to a single consistent compass rotation the way Eddy 1849 loosely does. Rather than force a pixel-derived rotation (explicitly against method guardrails, and previously shown unreliable on the Eddy scans -- stage-1 S2), block adjacency for new (non-spine-matched) blocks is recorded RELATIVE to Portsmouth Square/Block C (already anchored) and to each other, not as absolute compass block_ref keys.",
      "naming_discrepancy_flag": "Two of Buckelew's 1847 column-divider street labels do NOT match the modern/spine street names in the position where period geography says they should sit: the street between \"California\" and \"Clay\" is labeled \"HOWARD\" (not \"Sacramento\", the modern/spine street in that position), and the street between \"Jackson\" and \"Vallejo\" is labeled \"BARTLETT\" (not \"Pacific\"). Both read clearly and unambiguously at native resolution. This is additional to the already-known Jan 1847 Bartlett renaming ordinance: it suggests at least two more streets were renamed a second time between Feb 1847 (this map) and Eddy's 1849 re-survey, OR that Buckelew used working names not carried forward. Not resolved further this pass -- flagged for whoever next reconciles Buckelew's full street list against Eddy's.",
      "hundred_vara_near_plaza_finding": "stage-2 flagged several blocks near the plaza labeled \"One Hundred Varas\" as an unreconciled surprise. This pass narrows that finding: the \"One Hundred Varas\" label applies specifically to a small number of NAMED RESERVE blocks immediately adjoining the plaza (Cooper Square/50, Prudon-to-Mellus Square/49, Fitch Square/57, Paty[?] Square/76, and McKinley Square [seen, not fully read]) -- not to the whole neighborhood. The ordinary numbered lots directly surrounding those reserves (42, 43, 47, 48, etc.) are confirmed FIFTY VARA lots via clean Wheeler Schedule E joins (Whittaker/42, Bennett/43, Wisner/47, Bennett/48 all match). So: Hundred-Vara-sized NAMED reserves sit embedded within an otherwise Fifty-Vara fabric immediately around Portsmouth Square in 1847 -- a real, narrower, better-evidenced version of stage-2's flag.",
      "duplicate_lot_numbers_flag": "Two lot numbers were each read TWICE at clearly different cells on the sheet, not reconciled this pass: \"8\" (once as Larkin, overwriting a struck N. H. Dana, in buckelew-spear-larkin-block; once as Reading in buckelew-reading-block) and \"38\" (once as S. Cooper in buckelew-prudon-mellus-square; once bare in buckelew-reading-block). Wheeler documents exactly 3 known duplicate lot numbers on the official Hundred Vara map (695, 709, 753) but does not list 8 or 38 among them -- so these are either genuine additional undocumented duplicates, or a digit was misread at one of the two locations. Recorded honestly as unresolved rather than silently picking one reading.",
      "coverage": "Portsmouth-Square-ring blocks enriched (Wheeler joins added to 8 of the existing 14 records) + 14 NEW blocks read and recorded (Cooper Square, Prudon-to-Mellus Square, Fitch Square, Paty Square, Smith/Bennett/Wisner block, Whittaker block, Sullivan/Horn block, Vioget block, Spear/Larkin block, Davis/Derby block, Glenn block, Reading block, 39-40 block, Lepage block) -- roughly the two rings of blocks immediately surrounding Portsmouth Square on the Buckelew sheet. McKinley Square was sighted (name legible) but its number and any adjoining lots were NOT captured this pass -- illegible/deferred, needs a dedicated crop. The wider sheet (the row of blocks 341-360 at the map's far NW edge, the Broadway/Vallejo edge column ~lots 216-236, and the Montgomery/Sloat waterfront cluster ~lots 183-210) was read structurally (block grid, presence of numbers) during this pass but NOT transcribed lot-by-lot -- legible, deferred to a future pass, consistent with this project's \"partial-but-true over complete-but-assumed\" practice (plat-truth-stage1b S4).",
      "wheeler_joins": "CONFIRMED (unambiguous grantee-name match): lots 2, 18, 23, 24, 28, 29, 30, 42, 43, 47, 48, 51, 52 = 13 lots (lot 51/52 pre-existing per stage-2, re-confirmed here with exact Wheeler line citations). AMBIGUOUS / NOT FORCED (owner name on Buckelew does not match Wheeler's grantee, or no owner name legible to compare): lots 1, 4, 6, 8, 20, 21, 41, 44, 46, 53, 54, 55, 60, 61 and the 4 reserve-square numbers 49/50/57/76 = 18 lots. Not attempted (Wheeler text not fetched for these specific rows this pass): 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 35, 36, 37, 38, 39, 40, 45, 62, 63, 64, 65, 66, 67, 68, 69.",
      "crops_saved": "research/map-scans/plats/buckelew-crops/ -- plaza-square-block-a-cooper-prudon.jpg, fitch-paty-squares-hundredvara-row.jpg, whittaker-bennett-wisner-blocks.jpg, south-of-kearny-low-series.jpg, edge-200s-column.jpg (structural witness only, not transcribed).",
      "reserve_square_verdict": {
        "s86_finding": "The four Buckelew-labelled \"squares\" near the plaza (Cooper/50, Prudon-to-Mellus/49, Fitch/57, Paty/76) are NOT civic public reserves like Portsmouth Square. Wheeler 1852 p.21 states plainly: 'Of the lots within the limits of the fifty vara survey, there are ten of the dimensions of one hundred varas square, to wit: numbers 1, 18, 24, 49, 50, 56, 57, 76, 673 and 675.' Wheeler Schedule E carries a dated private grantor->grantee grant for each of 49/50/57/76 (see per-lot owners[]). They are therefore double-size PRIVATE granted lots whose Buckelew 'Square' labels are owner/toponym names, not municipal dedications. VERDICT: none registered as publicReserve parcels; Portsmouth Square remains the sole in-window public reserve. This OVERRIDES the s86 brief's default assumption (slate item 2) on the evidence, per its own contingency clause ('If any is genuinely NOT a reserve ... record the dated transition rather than a permanent reserve').",
        "wheeler_source": "research/map-scans/plats/wheeler-1852_djvu.txt line 2390 (p.21) + Schedule E lots 49,50,57,76 (lines ~8492-8779)",
        "mckinley_square_note": "'McKinley Square' (meta coverage note, sighted-not-read) is almost certainly an anachronistic misread on an 1847 sheet (Pres. McKinley postdates it by 50 years); not captured, not modeled."
      },
      "block_ref_resolution_s86": {
        "method": "Attempted to resolve each of the 14 descriptive Buckelew block_refs to a live cadastre 'B|west|east|north|south' key by lot-number adjacency against the two Eddy-anchored blocks (Block B = B|kearny|montgomery|washington|clay {20,19,3,27,19-1/2,2}; Block C = B|dupont|kearny|clay|sacramento {53,30,29,54,55,28}) and the plaza block.",
        "outcome": "ZERO of the 14 descriptive blocks resolve to a cadastre key. Reasons: (1) only Block B/Block C carry official fifty-vara lot numbers in the cadastre — every other cadastre block is pure pattern fabric with no lot-number anchor to match against; (2) the sheet's orientation is not pixel-derivable (method guardrail); (3) the four 'square' blocks embed HUNDRED-vara lots that have no cell in the near-plaza fifty-vara 6-lot subdivision; (4) Block B's Eddy-local numbering is documented-inconsistent with the official numbering, so spear-larkin's shared 2/20 do not anchor it. Each record therefore carries cadKey:null + an `unresolved` reason. Honest gap (plat-truth 'partial-but-true over complete-but-assumed'): the matched-count stays 12 (the Eddy Block B/C lots); the 54 Buckelew records are consumed as `unresolved-descriptive-block` (accounted, never lost) by the platRecords audit. Resolution awaits either the official O'Farrell fifty-vara numbering-sequence map or a georeferenced Buckelew read — both deferred.",
        "block_b_owner_caveat": "owners[] Wheeler grant witnesses are WITHHELD from Eddy Block B (B|kearny|montgomery|washington|clay), whose Eddy-map-local numbers {20,19,3,27,19-1/2,2} are documented-inconsistent with the official fifty-vara numbering (stage-2 S3a). Attaching Wheeler grantees there by lot number would risk asserting the wrong owner. Block C, the plaza block, and all Buckelew descriptive records use confirmed official numbering, so their Wheeler joins are kept.",
        "new_wheeler_joins_s86": "s86 read Wheeler Schedule E lots 1-83 and added grant witnesses to owners[]; several NEW joins confirm prior uncertain Buckelew owner reads: lot 7 'Carlos Glein' ~ Buckelew 'Glenn'; lot 8 'Reading' = Buckelew 'Reading' (and resolves the duplicate-8: Wheeler's unique lot 8 is Reading, so the spear-larkin lot-8 'Larkin/Dana' cell is the misread/anomaly); lot 62 'Francisco Hoen' ~ Buckelew 'Horn/Hoen'; lot 63 'Juan Allig' ~ Buckelew 'allg'; lot 50 'John B. Cooper' explains the 'Cooper Square' toponym; lot 66 'Thomas Smith' ~ Buckelew 'J. Smith'."
      }
    }
  },
  "lots": [
    {
      "id": "plat-20",
      "survey": "eddy-1849",
      "lot_number": "20",
      "block_ref": "B|kearny|montgomery|washington|clay",
      "block_label": "Kearny-Montgomery x Washington-Clay (E of the plaza)",
      "iU": 0,
      "iV": 0,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "NW lot (Kearny/Washington corner) of the clean 2x3 six-lot block E of the plaza."
    },
    {
      "id": "plat-19",
      "survey": "eddy-1849",
      "lot_number": "19",
      "block_ref": "B|kearny|montgomery|washington|clay",
      "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 1,
      "iV": 0,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "N-row middle lot."
    },
    {
      "id": "plat-3",
      "survey": "eddy-1849",
      "lot_number": "3",
      "block_ref": "B|kearny|montgomery|washington|clay",
      "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 2,
      "iV": 0,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "NE lot (Montgomery/Washington corner)."
    },
    {
      "id": "plat-27",
      "survey": "eddy-1849",
      "lot_number": "27",
      "block_ref": "B|kearny|montgomery|washington|clay",
      "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 0,
      "iV": 1,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "SW lot (Kearny/Clay corner)."
    },
    {
      "id": "plat-19half",
      "survey": "eddy-1849",
      "lot_number": "19-1/2",
      "block_ref": "B|kearny|montgomery|washington|clay",
      "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 1,
      "iV": 1,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH (existence/number); MODERATE (which axis the half-lot splits)",
      "source": "eddy-1849 plat, directly legible",
      "note": "OFFICIALLY NUMBERED HALF-LOT on the 1849 survey itself ('19-1/2') -- primary evidence that even the nominally-uniform 50-vara grid carried fractional lots AT THE POINT OF SURVEY, not just by later private split. v1 stamps the identity onto the pattern lot; the true half-lot cut geometry is a Block-Book fast-follow."
    },
    {
      "id": "plat-2",
      "survey": "eddy-1849",
      "lot_number": "2",
      "block_ref": "B|kearny|montgomery|washington|clay",
      "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 2,
      "iV": 1,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "SE lot (Montgomery/Clay corner)."
    },
    {
      "id": "plat-53-c",
      "survey": "eddy-1849",
      "lot_number": "53",
      "block_ref": "B|dupont|kearny|clay|sacramento",
      "block_label": "Dupont-Kearny x Clay-Sacramento (S of the plaza)",
      "iU": 0,
      "iV": 0,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "NW lot (Dupont/Clay corner), block immediately S of the plaza across Clay St.",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Wolmough (uncertain cursive read)",
        "wheeler_match": "NOT CONFIRMED -- Wheeler Schedule E lot 53 names grantee Juan Castanadra (Dec 15 1843), not Wolmough. Not forced; may reflect an unrecorded resale between the 1843 grant and the Feb 1847 map, or a misread on one side.",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 53 (name mismatch, not joined)"
      },
      "owners": [
        {
          "name": "Juan Castanadra",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-12-15"
        },
        {
          "name": "Wolmough (uncertain cursive read)",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "plat-30-c",
      "survey": "eddy-1849",
      "lot_number": "30",
      "block_ref": "B|dupont|kearny|clay|sacramento",
      "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 1,
      "iV": 0,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "N-row middle lot.",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Endsdorf (Leidesdorff)",
        "wheeler_match": "CONFIRMED -- Wheeler Schedule E lot 30: grantee William A. Leidesdorff (same July 3 1843 grant as lot 29 -- Leidesdorff held both adjoining lots).",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 30"
      },
      "owners": [
        {
          "name": "William A. Leidesdorff",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-07-03"
        },
        {
          "name": "Endsdorf (Leidesdorff)",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "plat-29-c",
      "survey": "eddy-1849",
      "lot_number": "29",
      "block_ref": "B|dupont|kearny|clay|sacramento",
      "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 2,
      "iV": 0,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "NE lot (Kearny/Clay corner).",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Lestodorf / Endsdorf (cursive misread of Leidesdorff)",
        "wheeler_match": "CONFIRMED -- Wheeler Schedule E lot 29: grantee William A. Leidesdorff, July 3 1843, grantor F. Sanchez J. de Paz.",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 29"
      },
      "owners": [
        {
          "name": "William A. Leidesdorff",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-07-03"
        },
        {
          "name": "Lestodorf / Endsdorf (cursive misread of Leidesdorff)",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "plat-54-c",
      "survey": "eddy-1849",
      "lot_number": "54",
      "block_ref": "B|dupont|kearny|clay|sacramento",
      "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 0,
      "iV": 1,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "SW lot (Dupont/Sacramento corner).",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Ward & Chever",
        "wheeler_match": "NOT CONFIRMED -- Wheeler Schedule E lot 54 names grantee Trinidad Maya (same date as 53), not Ward & Chever. Not forced.",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 54 (name mismatch, not joined)"
      },
      "owners": [
        {
          "name": "Trinidad Maya",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-12-15"
        },
        {
          "name": "Ward & Chever",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "plat-55-c",
      "survey": "eddy-1849",
      "lot_number": "55",
      "block_ref": "B|dupont|kearny|clay|sacramento",
      "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 1,
      "iV": 1,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "S-row middle lot.",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Endsdorf(?) -- cell partly obscured by a stain on the cloth",
        "wheeler_match": "NOT CONFIRMED -- Wheeler Schedule E lot 55 names grantee Vincente Miramontes (Apr 1843), not Endsdorf. Not forced; the Buckelew reading itself is low-confidence here due to the stain.",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 55 (name mismatch + stained read, not joined)"
      },
      "owners": [
        {
          "name": "Vincente Miramontes",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-04"
        },
        {
          "name": "Endsdorf(?) -- cell partly obscured by a stain on the cloth",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "plat-28-c",
      "survey": "eddy-1849",
      "lot_number": "28",
      "block_ref": "B|dupont|kearny|clay|sacramento",
      "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 2,
      "iV": 1,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "HIGH",
      "source": "eddy-1849 plat, directly legible",
      "note": "SE lot (Kearny/Sacramento corner).",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Ben[evides] (abbreviated)",
        "wheeler_match": "CONFIRMED -- Wheeler Schedule E lot 28: grantee Jose Benevides, Dec 8 1846, grantor Bartlett Alcalde.",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 28"
      },
      "owners": [
        {
          "name": "Jose Benevides",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-12-08"
        },
        {
          "name": "Ben[evides] (abbreviated)",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "plat-52",
      "survey": "eddy-1849",
      "lot_number": "52",
      "block_ref": "B|dupont|kearny|washington|clay",
      "block_label": "Portsmouth Square block (Dupont-Kearny x Washington-Clay)",
      "iU": 0,
      "iV": 0,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "GOLD (plat + corpus agree, s85 ruling)",
      "source": "eddy-1849 plat + corpus DAC18491212/14/17",
      "note": "Washington x Dupont CORNER lot fronting the plaza, with a documented dwelling house (DAC18491212: 'Lot No. 52 ... centrally situated on Washington and Dupont sts. and Portsmouth [Square]'). EXPECTED UNMATCHED in the cadastre: this block is modeled as the publicReserve plaza common (zero plat lots, s82). Surfaced by platRecords as 'public-reserve-zero-lots' -- see _meta.rulings_this_pass.plaza_block_extent_finding.",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Smith",
        "wheeler_match": "CONFIRMED -- Wheeler Schedule E lot 52: grantee Esteban Smith, June 3 1846, grantor Noe Jues de Paz. Already GOLD via corpus per stage-1b; Buckelew 1847 is a THIRD, two-years-earlier independent confirmation of the same lot/owner pairing.",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 52"
      },
      "owners": [
        {
          "name": "Esteban Smith",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-06-03"
        },
        {
          "name": "Smith",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "plat-51",
      "survey": "eddy-1849",
      "lot_number": "51",
      "block_ref": "B|dupont|kearny|washington|clay",
      "block_label": "Portsmouth Square block (Dupont-Kearny x Washington-Clay)",
      "iU": 0,
      "iV": 1,
      "dimensions": {
        "width_vara": 50,
        "depth_vara": 50,
        "width_m": 41.91,
        "depth_m": 41.91
      },
      "confidence": "MODERATE-HIGH (paired with lot 52)",
      "source": "eddy-1849 plat",
      "note": "Dupont-frontage lot directly S of lot 52, west edge of the plaza block. Same expected-unmatched (public-reserve) handling as lot 52.",
      "buckelew_1847": {
        "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
        "buckelew_owner": "Noe",
        "wheeler_match": "CONFIRMED -- Wheeler Schedule E lot 51: grantee Jesus Noe, Apr 14 1843, grantor F. Sanchez J. de Paz (Grant on Petition).",
        "wheeler_citation": "wheeler-1852 Schedule E, lot 51"
      },
      "owners": [
        {
          "name": "Jesus Noe",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-04-14"
        },
        {
          "name": "Noe",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ]
    },
    {
      "id": "buckelew-1847-49",
      "survey": "buckelew-1847",
      "lot_number": "10",
      "block_ref": "buckelew-39-40-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 39/40, 13/12, 10/11, all bare numbers, no owner names legible.",
      "owner": null,
      "confidence": "HIGH (numbers only)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Aquilla Glover / Francis J. Lippitt",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-08"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-50",
      "survey": "buckelew-1847",
      "lot_number": "11",
      "block_ref": "buckelew-39-40-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 39/40, 13/12, 10/11, all bare numbers, no owner names legible.",
      "owner": null,
      "confidence": "HIGH (numbers only)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Aquilla Glover / Francis J. Lippitt",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-04-28"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-48",
      "survey": "buckelew-1847",
      "lot_number": "12",
      "block_ref": "buckelew-39-40-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 39/40, 13/12, 10/11, all bare numbers, no owner names legible.",
      "owner": null,
      "confidence": "HIGH (numbers only)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Aquilla Glover / Francis J. Lippitt",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-24"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-47",
      "survey": "buckelew-1847",
      "lot_number": "13",
      "block_ref": "buckelew-39-40-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 39/40, 13/12, 10/11, all bare numbers, no owner names legible.",
      "owner": null,
      "confidence": "HIGH (numbers only)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "George Hyde",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-03"
        },
        {
          "name": "E. P. Jones",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-08-26"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-45",
      "survey": "buckelew-1847",
      "lot_number": "39",
      "block_ref": "buckelew-39-40-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 39/40, 13/12, 10/11, all bare numbers, no owner names legible.",
      "owner": null,
      "confidence": "HIGH (numbers only)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Michael Foley",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-08"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-46",
      "survey": "buckelew-1847",
      "lot_number": "40",
      "block_ref": "buckelew-39-40-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 39/40, 13/12, 10/11, all bare numbers, no owner names legible.",
      "owner": null,
      "confidence": "HIGH (numbers only)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Augustus Tieroff",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-19"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-2",
      "survey": "buckelew-1847",
      "lot_number": "31",
      "block_ref": "buckelew-cooper-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara reserve block adjoining Portsmouth Square, named \"Cooper Square\" (lot 50), with 2 flanking numbered lots. Exact cardinal side relative to the plaza NOT resolved this pass (see _meta.orientation_caveat).",
      "owner": "Thompson & Hefner (uncertain cursive read)",
      "confidence": "HIGH (number/name legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Francisco de Haro",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-04"
        },
        {
          "name": "Thompson & Hefner (uncertain cursive read)",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        },
        {
          "name": "John Finch",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-01"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 50 (Wheeler p.21), which has no cell in the cadastre's fifty-vara 6-lot subdivision near the plaza (the 100-vara district is SoMa, elsewhere)."
      }
    },
    {
      "id": "buckelew-1847-3",
      "survey": "buckelew-1847",
      "lot_number": "32",
      "block_ref": "buckelew-cooper-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara reserve block adjoining Portsmouth Square, named \"Cooper Square\" (lot 50), with 2 flanking numbered lots. Exact cardinal side relative to the plaza NOT resolved this pass (see _meta.orientation_caveat).",
      "owner": "Hilger",
      "confidence": "HIGH (number/name legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Domingo Feliz",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-04-15"
        },
        {
          "name": "Hilger",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 50 (Wheeler p.21), which has no cell in the cadastre's fifty-vara 6-lot subdivision near the plaza (the 100-vara district is SoMa, elsewhere)."
      }
    },
    {
      "id": "buckelew-1847-1",
      "survey": "buckelew-1847",
      "lot_number": "50",
      "block_ref": "buckelew-cooper-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara reserve block adjoining Portsmouth Square, named \"Cooper Square\" (lot 50), with 2 flanking numbered lots. Exact cardinal side relative to the plaza NOT resolved this pass (see _meta.orientation_caveat).",
      "owner": null,
      "confidence": "HIGH (number/name legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Reserve name \"Cooper Square\" written across the cell; no personal-name grantee visible (a public/reserved square, like Portsmouth Square itself).",
      "owners": [
        {
          "name": "John B. Cooper",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1840-01-15"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 50 (Wheeler p.21), which has no cell in the cadastre's fifty-vara 6-lot subdivision near the plaza (the 100-vara district is SoMa, elsewhere)."
      },
      "hundred_vara_lot": true,
      "reserve_verdict": "NOT a civic reserve. Wheeler p.21 lists lot 50 among the ten HUNDRED-vara lots within the fifty-vara survey; Schedule E shows it privately GRANTED to John B. Cooper (Jan 15 1840, grantor Guerrero Jues de Paz). \"Cooper Square\" is the Cooper family's double-size private holding, not a municipal common. Not modeled as a publicReserve parcel."
    },
    {
      "id": "buckelew-1847-36",
      "survey": "buckelew-1847",
      "lot_number": "4",
      "block_ref": "buckelew-davis-derby-block",
      "block_ref_spine_match": false,
      "block_label": "Block containing lot 18 (Davis) and lot 4 (Derby & Co), near the Vioget/Spear cluster south of the plaza.",
      "owner": "Derby & Co",
      "confidence": "HIGH",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "NOT CONFIRMED -- Wheeler Schedule E lot 4 grantee is Francisco Guerrero (Nov 15 1843), not Derby & Co. Not forced; plausibly a later resale by 1847.",
      "owners": [
        {
          "name": "Francisco Guerrero",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-11-15"
        },
        {
          "name": "Derby & Co",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-35",
      "survey": "buckelew-1847",
      "lot_number": "18",
      "block_ref": "buckelew-davis-derby-block",
      "block_ref_spine_match": false,
      "block_label": "Block containing lot 18 (Davis) and lot 4 (Derby & Co), near the Vioget/Spear cluster south of the plaza.",
      "owner": "Davis",
      "confidence": "HIGH (number + owner; Wheeler-confirmed)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "CONFIRMED",
      "note": "CONFIRMED -- Wheeler Schedule E lot 18: grantee Juan C. Davis, Dec 9 1839, grantor Guerrero Jues de Paz.",
      "owners": [
        {
          "name": "Juan C. Davis",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1839-12-09"
        },
        {
          "name": "Davis",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-7",
      "survey": "buckelew-1847",
      "lot_number": "57",
      "block_ref": "buckelew-fitch-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara reserve block named \"Fitch Square\" (lot 57), in the row directly north of the Cooper/Prudon-Mellus squares (Dupont row-band per row_labels_top). Cardinal side not resolved.",
      "owner": null,
      "confidence": "HIGH (number/name legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: fitch-paty-squares-hundredvara-row.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Reserve name \"Fitch Square\" written across the cell. NOT the same lot 57 as Wheeler Schedule D (grantee Wm. H. Peterson) or Schedule E (grantee Jacob P. Leese) -- neither matches Fitch; the square's toponym likely commemorates a person (Henry Fitch, cf. lot 22 below) rather than citing a current grantee, so no Wheeler join is forced.",
      "owners": [
        {
          "name": "Jacob P. Leese",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1836-07-08"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Contains HUNDRED-vara lot 57 (Wheeler p.21); 100-vara lot has no cell in the near-plaza fifty-vara subdivision."
      },
      "hundred_vara_lot": true,
      "reserve_verdict": "NOT a civic reserve. Wheeler p.21: lot 57 is one of the ten 100-vara lots; Schedule E grantee Jacob P. Leese (July 8 1836, grantor Estudillo Alcalde, marked *). \"Fitch Square\" is a toponym (cf. Henry D. Fitch, Wheeler lot 22), the parcel itself a private grant. Not a publicReserve parcel."
    },
    {
      "id": "buckelew-1847-37",
      "survey": "buckelew-1847",
      "lot_number": "6",
      "block_ref": "buckelew-glenn-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 6 and 7, both labeled owner \"Glenn\".",
      "owner": "Glenn",
      "confidence": "HIGH (numbers); MODERATE (owner name)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "NOT CONFIRMED -- Wheeler Schedule E lot 6 grantee is Jose Maria Santa Maria (June 6 1846) / an earlier crossed-out Dec 11 1844 grant, not Glenn. Not forced.",
      "owners": [
        {
          "name": "Jose Maria Santa Maria",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-06-06"
        },
        {
          "name": "Glenn",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-38",
      "survey": "buckelew-1847",
      "lot_number": "7",
      "block_ref": "buckelew-glenn-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 6 and 7, both labeled owner \"Glenn\".",
      "owner": "Glenn",
      "confidence": "HIGH (numbers); MODERATE (owner name)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "Not cross-checked against Wheeler this pass.",
      "owners": [
        {
          "name": "Carlos Glein",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1844-11-13"
        },
        {
          "name": "Glenn",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-54",
      "survey": "buckelew-1847",
      "lot_number": "16",
      "block_ref": "buckelew-lepage-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 35/36 (owners illegible) and 17/16 (Lepage / Eschenauer).",
      "owner": "Eschenauer(?) -- uncertain cursive read",
      "confidence": "HIGH (numbers); MODERATE (17/16 owner names)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Bruno Valencia",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-08-15"
        },
        {
          "name": "Eschenauer(?) -- uncertain cursive read",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-53",
      "survey": "buckelew-1847",
      "lot_number": "17",
      "block_ref": "buckelew-lepage-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 35/36 (owners illegible) and 17/16 (Lepage / Eschenauer).",
      "owner": "Lepage",
      "confidence": "HIGH (numbers); MODERATE (17/16 owner names)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Benito Diaz and J. B. Mesa",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1844-07-19"
        },
        {
          "name": "Lepage",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-51",
      "survey": "buckelew-1847",
      "lot_number": "35",
      "block_ref": "buckelew-lepage-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 35/36 (owners illegible) and 17/16 (Lepage / Eschenauer).",
      "owner": null,
      "confidence": "HIGH (numbers); MODERATE (17/16 owner names)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "A short owner fragment is visible but not legibly transcribable this pass.",
      "owners": [
        {
          "name": "John Martin",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-12-27"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-52",
      "survey": "buckelew-1847",
      "lot_number": "36",
      "block_ref": "buckelew-lepage-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 35/36 (owners illegible) and 17/16 (Lepage / Eschenauer).",
      "owner": null,
      "confidence": "HIGH (numbers); MODERATE (17/16 owner names)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Gregory Escalante",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-10-15"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-9",
      "survey": "buckelew-1847",
      "lot_number": "58",
      "block_ref": "buckelew-paty-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara block containing a reserve labeled \"Paty[?] Square\" (lot 76) plus 2 plain numbered lots, same row-band as Fitch Square.",
      "owner": null,
      "confidence": "MODERATE (76 and Square clear; the 2-digit numbers above it are a harder cursive read)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: fitch-paty-squares-hundredvara-row.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Digit legible, cell otherwise bare.",
      "owners": [
        {
          "name": "Joel P. Dedmond",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1844-12-21"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 76 (Wheeler p.21); see cooper-square note on the 100-vara/50-vara model mismatch."
      }
    },
    {
      "id": "buckelew-1847-10",
      "survey": "buckelew-1847",
      "lot_number": "69",
      "block_ref": "buckelew-paty-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara block containing a reserve labeled \"Paty[?] Square\" (lot 76) plus 2 plain numbered lots, same row-band as Fitch Square.",
      "owner": null,
      "confidence": "MODERATE (76 and Square clear; the 2-digit numbers above it are a harder cursive read)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: fitch-paty-squares-hundredvara-row.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Second digit uncertain (69 vs 59); recorded as read, LOW-MODERATE confidence on the exact digit.",
      "owners": [
        {
          "name": "James McClary",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-11-18"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 76 (Wheeler p.21); see cooper-square note on the 100-vara/50-vara model mismatch."
      }
    },
    {
      "id": "buckelew-1847-8",
      "survey": "buckelew-1847",
      "lot_number": "76",
      "block_ref": "buckelew-paty-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara block containing a reserve labeled \"Paty[?] Square\" (lot 76) plus 2 plain numbered lots, same row-band as Fitch Square.",
      "owner": "Paty (uncertain -- could also read \"Paly\")",
      "confidence": "MODERATE (76 and Square clear; the 2-digit numbers above it are a harder cursive read)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: fitch-paty-squares-hundredvara-row.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Labeled \"One Hundred Varas ... 76 Paty Square\".",
      "owners": [
        {
          "name": "Francisco Sanchez",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1837-11-08"
        },
        {
          "name": "Paty (uncertain -- could also read \"Paly\")",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 76 (Wheeler p.21); see cooper-square note on the 100-vara/50-vara model mismatch."
      },
      "hundred_vara_lot": true,
      "reserve_verdict": "NOT a civic reserve. Wheeler p.21: lot 76 is one of the ten 100-vara lots; Schedule E grantee Francisco Sanchez (Nov 8 1837, grantor Martinez Alcalde). The Buckelew \"Paty[?]\" owner read is low-confidence and does not match Wheeler's grantee; regardless the parcel is a private grant, not a municipal common. Not a publicReserve parcel."
    },
    {
      "id": "buckelew-1847-6",
      "survey": "buckelew-1847",
      "lot_number": "34",
      "block_ref": "buckelew-prudon-mellus-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara reserve block, named \"Prudon to Mellus Square\" (lot 49), immediately adjacent to the Cooper Square block. Cardinal side not resolved.",
      "owner": null,
      "confidence": "HIGH (number/name legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Owner name not legible.",
      "owners": [
        {
          "name": "Juan Bta. (name torn off record)",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1843-04-15"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 49 (Wheeler p.21); see cooper-square note on the 100-vara/50-vara model mismatch."
      }
    },
    {
      "id": "buckelew-1847-5",
      "survey": "buckelew-1847",
      "lot_number": "38",
      "block_ref": "buckelew-prudon-mellus-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara reserve block, named \"Prudon to Mellus Square\" (lot 49), immediately adjacent to the Cooper Square block. Cardinal side not resolved.",
      "owner": "S. Cooper",
      "confidence": "HIGH (number/name legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "DUPLICATE NUMBER FLAG: a second \"38\" was also read in the Reading block south of Kearny (buckelew-reading-block) -- not reconciled this pass; may be a genuine duplicate/misread digit on one side.",
      "owners": [
        {
          "name": "S. Cooper",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        },
        {
          "name": "James S. Linn",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-03"
        },
        {
          "name": "John Cannell",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-05"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 49 (Wheeler p.21); see cooper-square note on the 100-vara/50-vara model mismatch."
      }
    },
    {
      "id": "buckelew-1847-4",
      "survey": "buckelew-1847",
      "lot_number": "49",
      "block_ref": "buckelew-prudon-mellus-square",
      "block_ref_spine_match": false,
      "block_label": "One Hundred Vara reserve block, named \"Prudon to Mellus Square\" (lot 49), immediately adjacent to the Cooper Square block. Cardinal side not resolved.",
      "owner": null,
      "confidence": "HIGH (number/name legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: plaza-square-block-a-cooper-prudon.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Reserve name \"Prudon to Mellus Square\" written across the cell.",
      "owners": [
        {
          "name": "Francisco Caseres",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1838-03-20"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Also contains HUNDRED-vara lot 49 (Wheeler p.21); see cooper-square note on the 100-vara/50-vara model mismatch."
      },
      "hundred_vara_lot": true,
      "reserve_verdict": "NOT a civic reserve. Wheeler p.21: lot 49 is one of the ten 100-vara lots; Schedule E grantee Francisco Caseres (Mar 20 1838, grantor Francisco de Haro). \"Prudon to Mellus Square\" reflects a private conveyance chain (Prudon->Mellus), not a civic dedication. Not a publicReserve parcel."
    },
    {
      "id": "buckelew-1847-43",
      "survey": "buckelew-1847",
      "lot_number": "8",
      "block_ref": "buckelew-reading-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 37/38 (bare), 15/14 (bare), and 8/9 (Reading / bare) -- three stacked rows.",
      "owner": "Reading",
      "confidence": "HIGH (numbers); LOW (owner name legibility beyond Reading)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "DUPLICATE NUMBER FLAG vs \"8\" (owner Larkin/struck Dana) in buckelew-spear-larkin-block -- two distinct cells on the sheet both read as lot 8. Not reconciled; recorded honestly as a conflict rather than silently picking one.",
      "owners": [
        {
          "name": "Reading",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-05-28"
        },
        {
          "name": "Reading",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-44",
      "survey": "buckelew-1847",
      "lot_number": "9",
      "block_ref": "buckelew-reading-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 37/38 (bare), 15/14 (bare), and 8/9 (Reading / bare) -- three stacked rows.",
      "owner": null,
      "confidence": "HIGH (numbers); LOW (owner name legibility beyond Reading)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "John Allen",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-02-26"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-42",
      "survey": "buckelew-1847",
      "lot_number": "14",
      "block_ref": "buckelew-reading-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 37/38 (bare), 15/14 (bare), and 8/9 (Reading / bare) -- three stacked rows.",
      "owner": null,
      "confidence": "HIGH (numbers); LOW (owner name legibility beyond Reading)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Hugh Reid",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-02-26"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-41",
      "survey": "buckelew-1847",
      "lot_number": "15",
      "block_ref": "buckelew-reading-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 37/38 (bare), 15/14 (bare), and 8/9 (Reading / bare) -- three stacked rows.",
      "owner": null,
      "confidence": "HIGH (numbers); LOW (owner name legibility beyond Reading)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Elon S. Marsh",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-01"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-39",
      "survey": "buckelew-1847",
      "lot_number": "37",
      "block_ref": "buckelew-reading-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 37/38 (bare), 15/14 (bare), and 8/9 (Reading / bare) -- three stacked rows.",
      "owner": null,
      "confidence": "HIGH (numbers); LOW (owner name legibility beyond Reading)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "D. E. E. Soto de Bernel",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1844-12-17"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-40",
      "survey": "buckelew-1847",
      "lot_number": "38",
      "block_ref": "buckelew-reading-block",
      "block_ref_spine_match": false,
      "block_label": "Block with lots 37/38 (bare), 15/14 (bare), and 8/9 (Reading / bare) -- three stacked rows.",
      "owner": null,
      "confidence": "HIGH (numbers); LOW (owner name legibility beyond Reading)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "DUPLICATE NUMBER FLAG vs \"38\" (owner S. Cooper) in buckelew-prudon-mellus-square -- not reconciled this pass.",
      "owners": [
        {
          "name": "James S. Linn",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-03"
        },
        {
          "name": "John Cannell",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-05"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-16",
      "survey": "buckelew-1847",
      "lot_number": "43",
      "block_ref": "buckelew-smith-bennett-wisner-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block (confirmed via Wheeler joins on 3 of 6 lots) two streets east of the Cooper Square block, row-band between the \"One Hundred Varas\" squares and the Whittaker block.",
      "owner": "Bennett",
      "confidence": "HIGH (number + owner; Wheeler-confirmed)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "CONFIRMED",
      "note": "CONFIRMED -- Wheeler Schedule E lot 43: grantee \"Var[de]man Bennett\", Feb 3 1847, grantor Bartlett Chief Mag. (same Bennett as lot 48 -- held both.)",
      "owners": [
        {
          "name": "Vardeman Bennett",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-02-03"
        },
        {
          "name": "Bennett",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-15",
      "survey": "buckelew-1847",
      "lot_number": "44",
      "block_ref": "buckelew-smith-bennett-wisner-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block (confirmed via Wheeler joins on 3 of 6 lots) two streets east of the Cooper Square block, row-band between the \"One Hundred Varas\" squares and the Whittaker block.",
      "owner": "Brannan & Co",
      "confidence": "HIGH (numbers); MODERATE-HIGH (owner names)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "Wheeler Schedule E lot 44's row is garbled/blank in the OCR (falls in a page-break gap right before lot 45); not cross-checked this pass.",
      "owners": [
        {
          "name": "Brannan & Co",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-14",
      "survey": "buckelew-1847",
      "lot_number": "47",
      "block_ref": "buckelew-smith-bennett-wisner-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block (confirmed via Wheeler joins on 3 of 6 lots) two streets east of the Cooper Square block, row-band between the \"One Hundred Varas\" squares and the Whittaker block.",
      "owner": "G. Wisner",
      "confidence": "HIGH (number + owner; Wheeler-confirmed)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "CONFIRMED",
      "note": "CONFIRMED -- Wheeler Schedule E lot 47: grantee George Wisner, Nov 25 1846, grantor Bartlett Alcalde.",
      "owners": [
        {
          "name": "George Wisner",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-11-25"
        },
        {
          "name": "G. Wisner",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-13",
      "survey": "buckelew-1847",
      "lot_number": "48",
      "block_ref": "buckelew-smith-bennett-wisner-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block (confirmed via Wheeler joins on 3 of 6 lots) two streets east of the Cooper Square block, row-band between the \"One Hundred Varas\" squares and the Whittaker block.",
      "owner": "V. Bennett",
      "confidence": "HIGH (number + owner; Wheeler-confirmed)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "CONFIRMED",
      "note": "CONFIRMED -- Wheeler Schedule E lot 48: grantee \"Var[de]man Bennett\", Mar 1 1847, grantor Bryant Chief Mag.",
      "owners": [
        {
          "name": "V. Bennett",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        },
        {
          "name": "Vardeman Bennett",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-01"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-11",
      "survey": "buckelew-1847",
      "lot_number": "66",
      "block_ref": "buckelew-smith-bennett-wisner-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block (confirmed via Wheeler joins on 3 of 6 lots) two streets east of the Cooper Square block, row-band between the \"One Hundred Varas\" squares and the Whittaker block.",
      "owner": "J. Smith",
      "confidence": "HIGH (numbers); MODERATE-HIGH (owner names)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "Not cross-checked against Wheeler this pass (a different Smith than lot 52's Esteban Smith is plausible -- common surname).",
      "owners": [
        {
          "name": "Thomas Smith",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1845-04-18"
        },
        {
          "name": "J. Smith",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-12",
      "survey": "buckelew-1847",
      "lot_number": "67",
      "block_ref": "buckelew-smith-bennett-wisner-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block (confirmed via Wheeler joins on 3 of 6 lots) two streets east of the Cooper Square block, row-band between the \"One Hundred Varas\" squares and the Whittaker block.",
      "owner": "Congcy(?) -- low-confidence cursive read",
      "confidence": "HIGH (numbers); MODERATE-HIGH (owner names)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "John Couzins",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-01-26"
        },
        {
          "name": "Congcy(?) -- low-confidence cursive read",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        },
        {
          "name": "Thomas Osborn",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1849-12-18"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-33",
      "survey": "buckelew-1847",
      "lot_number": "2",
      "block_ref": "buckelew-spear-larkin-block",
      "block_ref_spine_match": false,
      "block_label": "Block adjoining the Vioget/lot-1 block, with lots 21/20 (bare) over lot 2 (Spear & Hinckly) over lot 8 (a struck \"N. H. Dana\" replaced by \"Larkin\").",
      "owner": "Spear & Hinckly",
      "confidence": "HIGH (number + owner; Wheeler-confirmed)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "CONFIRMED",
      "note": "CONFIRMED -- Wheeler Schedule E lot 2: grantees Nathan Spear and Susanna Hinckly, Jan 11 1847 (and a duplicate/earlier Dec 28 1846 grant, same parties) -- both surnames legible on the map cell.",
      "owners": [
        {
          "name": "Nathan Spear & Susanna Hinckly",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-01-11"
        },
        {
          "name": "Spear & Hinckly",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Shares lots 2 and 20 with Eddy Block B, but Block B's Eddy-map local numbering is documented-inconsistent with the official fifty-vara numbering (stage-2 S3a: lot 20 recurs; Wheeler's unique lot 2 = Spear & Hinckly and lot 20 = Sherrback anchor elsewhere), so the shared numbers do not anchor this block to Block B."
      }
    },
    {
      "id": "buckelew-1847-34",
      "survey": "buckelew-1847",
      "lot_number": "8",
      "block_ref": "buckelew-spear-larkin-block",
      "block_ref_spine_match": false,
      "block_label": "Block adjoining the Vioget/lot-1 block, with lots 21/20 (bare) over lot 2 (Spear & Hinckly) over lot 8 (a struck \"N. H. Dana\" replaced by \"Larkin\").",
      "owner": "Larkin (overwriting/superseding a struck \"N. H. Dana\")",
      "confidence": "HIGH (numbers); the ownership history (X-marks) is a genuine multi-event read, not a single grant",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "Two owner names stacked with an X-mark between them on the same cell -- read as a superseded-then-current ownership pair, the same pattern Wheeler uses for re-granted lots. Not cross-checked against Wheeler Schedule E lot 8 this pass (not fetched). DUPLICATE NUMBER FLAG vs the second \"8\" (owner Reading) in buckelew-reading-block -- not reconciled; genuinely two different cells both read as \"8\" elsewhere on the sheet, OR one is a misread digit.",
      "owners": [
        {
          "name": "Reading",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-05-28"
        },
        {
          "name": "Larkin (overwriting/superseding a struck \"N. H. Dana\")",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Shares lots 2 and 20 with Eddy Block B, but Block B's Eddy-map local numbering is documented-inconsistent with the official fifty-vara numbering (stage-2 S3a: lot 20 recurs; Wheeler's unique lot 2 = Spear & Hinckly and lot 20 = Sherrback anchor elsewhere), so the shared numbers do not anchor this block to Block B."
      }
    },
    {
      "id": "buckelew-1847-32",
      "survey": "buckelew-1847",
      "lot_number": "20",
      "block_ref": "buckelew-spear-larkin-block",
      "block_ref_spine_match": false,
      "block_label": "Block adjoining the Vioget/lot-1 block, with lots 21/20 (bare) over lot 2 (Spear & Hinckly) over lot 8 (a struck \"N. H. Dana\" replaced by \"Larkin\").",
      "owner": null,
      "confidence": "HIGH (numbers); the ownership history (X-marks) is a genuine multi-event read, not a single grant",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Wheeler Schedule E lot 20 grantee: Peter T. Sherrback, May 1 1842 -- no owner name on the Buckelew cell to cross-check. This is the recurrence of \"20\" already noted by stage-2; it does NOT carry the rest of Eddy Block B's set {19,3,27,19-1/2,2} nearby, consistent with stage-2's finding.",
      "owners": [
        {
          "name": "Peter T. Sherrback",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1842-05-01"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Shares lots 2 and 20 with Eddy Block B, but Block B's Eddy-map local numbering is documented-inconsistent with the official fifty-vara numbering (stage-2 S3a: lot 20 recurs; Wheeler's unique lot 2 = Spear & Hinckly and lot 20 = Sherrback anchor elsewhere), so the shared numbers do not anchor this block to Block B."
      }
    },
    {
      "id": "buckelew-1847-31",
      "survey": "buckelew-1847",
      "lot_number": "21",
      "block_ref": "buckelew-spear-larkin-block",
      "block_ref_spine_match": false,
      "block_label": "Block adjoining the Vioget/lot-1 block, with lots 21/20 (bare) over lot 2 (Spear & Hinckly) over lot 8 (a struck \"N. H. Dana\" replaced by \"Larkin\").",
      "owner": null,
      "confidence": "HIGH (numbers); the ownership history (X-marks) is a genuine multi-event read, not a single grant",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Wheeler Schedule E lot 21 grantee: George Allen, Mar 8 1842 -- no owner name on the Buckelew cell to cross-check.",
      "owners": [
        {
          "name": "George Allen",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1842-03-08"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed. Shares lots 2 and 20 with Eddy Block B, but Block B's Eddy-map local numbering is documented-inconsistent with the official fifty-vara numbering (stage-2 S3a: lot 20 recurs; Wheeler's unique lot 2 = Spear & Hinckly and lot 20 = Sherrback anchor elsewhere), so the shared numbers do not anchor this block to Block B."
      }
    },
    {
      "id": "buckelew-1847-23",
      "survey": "buckelew-1847",
      "lot_number": "60",
      "block_ref": "buckelew-sullivan-horn-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block further east/north, row-band above the Whittaker/Bennett cluster (per east_of_plaza crop, directly south of the \"one hundred varas 49/Prudon-Mellus\" block across a STREET boundary).",
      "owner": "H. (abbreviated, illegible beyond initial)",
      "confidence": "HIGH (numbers); LOW-MODERATE (owner names, cramped cursive)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "Wheeler Schedule E lot 60 has two grant events (J. L. Folsom 1848; John Smith 1849 re-grant) -- neither clearly matches a bare \"H.\"; not forced.",
      "owners": [
        {
          "name": "Juan Yvain",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-06-20"
        },
        {
          "name": "H. (abbreviated, illegible beyond initial)",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-24",
      "survey": "buckelew-1847",
      "lot_number": "61",
      "block_ref": "buckelew-sullivan-horn-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block further east/north, row-band above the Whittaker/Bennett cluster (per east_of_plaza crop, directly south of the \"one hundred varas 49/Prudon-Mellus\" block across a STREET boundary).",
      "owner": "Sullivan",
      "confidence": "HIGH (numbers); LOW-MODERATE (owner names, cramped cursive)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "Wheeler Schedule E lot 61 grantee is James A. Hardie (Oct 24 1848) -- does not match Sullivan. Not forced.",
      "owners": [
        {
          "name": "William Fisher",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1845-10-20"
        },
        {
          "name": "Sullivan",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-25",
      "survey": "buckelew-1847",
      "lot_number": "62",
      "block_ref": "buckelew-sullivan-horn-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block further east/north, row-band above the Whittaker/Bennett cluster (per east_of_plaza crop, directly south of the \"one hundred varas 49/Prudon-Mellus\" block across a STREET boundary).",
      "owner": "Horn (uncertain -- could be \"Hoen\")",
      "confidence": "HIGH (numbers); LOW-MODERATE (owner names, cramped cursive)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Francisco Hoen",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-06-19"
        },
        {
          "name": "Horn (uncertain -- could be \"Hoen\")",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-26",
      "survey": "buckelew-1847",
      "lot_number": "63",
      "block_ref": "buckelew-sullivan-horn-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block further east/north, row-band above the Whittaker/Bennett cluster (per east_of_plaza crop, directly south of the \"one hundred varas 49/Prudon-Mellus\" block across a STREET boundary).",
      "owner": "allg(?) -- low-confidence, possibly \"Callag[han]\"",
      "confidence": "HIGH (numbers); LOW-MODERATE (owner names, cramped cursive)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Juan Allig",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-06-19"
        },
        {
          "name": "allg(?) -- low-confidence, possibly \"Callag[han]\"",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-27",
      "survey": "buckelew-1847",
      "lot_number": "64",
      "block_ref": "buckelew-sullivan-horn-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block further east/north, row-band above the Whittaker/Bennett cluster (per east_of_plaza crop, directly south of the \"one hundred varas 49/Prudon-Mellus\" block across a STREET boundary).",
      "owner": null,
      "confidence": "HIGH (numbers); LOW-MODERATE (owner names, cramped cursive)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Enoch P. Jewett",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-04"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-28",
      "survey": "buckelew-1847",
      "lot_number": "65",
      "block_ref": "buckelew-sullivan-horn-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block further east/north, row-band above the Whittaker/Bennett cluster (per east_of_plaza crop, directly south of the \"one hundred varas 49/Prudon-Mellus\" block across a STREET boundary).",
      "owner": null,
      "confidence": "HIGH (numbers); LOW-MODERATE (owner names, cramped cursive)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "John D. Harris",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-17"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-30",
      "survey": "buckelew-1847",
      "lot_number": "1",
      "block_ref": "buckelew-vioget-block",
      "block_ref_spine_match": false,
      "block_label": "Block south of Portsmouth Square across the Kearny-adjacent street, containing lot 23 (Vioget) and lot 1 with a written dimension note. Same area research/lot-sources-stage2.md S3a already spot-checked and found lot 20 recurring without the full Eddy Block B set.",
      "owner": null,
      "confidence": "HIGH",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Cell carries a written dimension note \"108 x 50\" (unit not specified on the map -- plausibly feet, since 108x50 vara would be an enormous, non-standard lot; flagged, not resolved). Wheeler Schedule E lot 1: grantee Jacob P. Leese, Jan 15 1840 -- no owner name on the Buckelew cell to cross-check.",
      "owners": [
        {
          "name": "Jacob P. Leese",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1840-01-15"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-29",
      "survey": "buckelew-1847",
      "lot_number": "23",
      "block_ref": "buckelew-vioget-block",
      "block_ref_spine_match": false,
      "block_label": "Block south of Portsmouth Square across the Kearny-adjacent street, containing lot 23 (Vioget) and lot 1 with a written dimension note. Same area research/lot-sources-stage2.md S3a already spot-checked and found lot 20 recurring without the full Eddy Block B set.",
      "owner": "Vioget",
      "confidence": "HIGH (number + owner; Wheeler-confirmed)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: south-of-kearny-low-series.jpg",
      "wheeler_join": "CONFIRMED",
      "note": "CONFIRMED -- Wheeler Schedule E lot 23: grantee Juan Vioget, Jan 15 1840, grantor Guerrero Jues de Paz. This is Jean-Jacques Vioget, author of the 1839 survey stage-1 S1.2 flagged as never independently digitized -- his own name appears as a grantee on a numbered lot here, a nice incidental confirmation he held town-lot property, not just surveyed it.",
      "owners": [
        {
          "name": "Juan Vioget",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1840-01-15"
        },
        {
          "name": "Vioget",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-22",
      "survey": "buckelew-1847",
      "lot_number": "41",
      "block_ref": "buckelew-whittaker-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block immediately east of the Smith/Bennett/Wisner block, sharing the \"Whittaker\" owner across its bottom row.",
      "owner": "Whittaker (label appears to span both bottom cells)",
      "confidence": "HIGH (numbers); MODERATE (owner names, only Whittaker legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "Wheeler Schedule E lot 41 grantee is James Greyson (Mar 16 1847) -- does not match Whittaker; the map may show only one owner label spanning a 2-lot holding at 41/42, or 41 belongs to a different owner not separately lettered. Not forced.",
      "owners": [
        {
          "name": "Whittaker (label appears to span both bottom cells)",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        },
        {
          "name": "James Greyson",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-16"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-21",
      "survey": "buckelew-1847",
      "lot_number": "42",
      "block_ref": "buckelew-whittaker-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block immediately east of the Smith/Bennett/Wisner block, sharing the \"Whittaker\" owner across its bottom row.",
      "owner": "Whittaker",
      "confidence": "HIGH (number + owner; Wheeler-confirmed)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "CONFIRMED",
      "note": "CONFIRMED -- Wheeler Schedule E lot 42: grantee Robert Whittaker, Nov 25 1846, grantor Bartlett Alcalde.",
      "owners": [
        {
          "name": "Robert Whittaker",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-11-25"
        },
        {
          "name": "Whittaker",
          "source": "buckelew-1847 map",
          "dateOrInterval": "1847-02-22"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-20",
      "survey": "buckelew-1847",
      "lot_number": "45",
      "block_ref": "buckelew-whittaker-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block immediately east of the Smith/Bennett/Wisner block, sharing the \"Whittaker\" owner across its bottom row.",
      "owner": null,
      "confidence": "HIGH (numbers); MODERATE (owner names, only Whittaker legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Eusebio Soto",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1845-05-10"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-19",
      "survey": "buckelew-1847",
      "lot_number": "46",
      "block_ref": "buckelew-whittaker-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block immediately east of the Smith/Bennett/Wisner block, sharing the \"Whittaker\" owner across its bottom row.",
      "owner": null,
      "confidence": "HIGH (numbers); MODERATE (owner names, only Whittaker legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": "Wheeler Schedule E lot 46 grantee is Kale Puaanni (a Hawaiian name, Feb 26 1847) -- not legible as an owner label on the Buckelew cell itself, so not asserted as a match.",
      "owners": [
        {
          "name": "Kale Puaanni",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-02-26"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-17",
      "survey": "buckelew-1847",
      "lot_number": "68",
      "block_ref": "buckelew-whittaker-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block immediately east of the Smith/Bennett/Wisner block, sharing the \"Whittaker\" owner across its bottom row.",
      "owner": null,
      "confidence": "HIGH (numbers); MODERATE (owner names, only Whittaker legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "not attempted this pass",
      "note": null,
      "owners": [
        {
          "name": "Stephen A. Wright",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1847-03-05"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    },
    {
      "id": "buckelew-1847-18",
      "survey": "buckelew-1847",
      "lot_number": "69",
      "block_ref": "buckelew-whittaker-block",
      "block_ref_spine_match": false,
      "block_label": "Fifty Vara block immediately east of the Smith/Bennett/Wisner block, sharing the \"Whittaker\" owner across its bottom row.",
      "owner": null,
      "confidence": "HIGH (numbers); MODERATE (owner names, only Whittaker legible)",
      "source": "buckelew-1847 (sf-plan-1847-02-22-bartlett-buckelew.jpg, Yale Beinecke WA MSS S-1882, Bartlett-certified Feb 22 1847), crop: whittaker-bennett-wisner-blocks.jpg",
      "wheeler_join": "ambiguous / not forced",
      "note": "DUPLICATE NUMBER FLAG vs the \"69\" tentatively read in buckelew-paty-square -- not reconciled.",
      "owners": [
        {
          "name": "James McClary",
          "source": "wheeler-1852 Schedule E",
          "dateOrInterval": "1846-11-18"
        }
      ],
      "cadKey": null,
      "unresolved": {
        "reason": "Descriptive Buckelew block_ref: the Feb 22 1847 sheet has no consistent north-up drawing convention (_meta.buckelew_1847_pass.orientation_caveat), and pixel-derived rotation is barred by method guardrail. Beyond the two Eddy-anchored cadastre blocks (Block B, Block C) NO cadastre block carries official fifty-vara lot numbers, so there is no lot-number adjacency to resolve this descriptive ref to a spine 'B|west|east|north|south' key. Left unresolved (honest gap) rather than guessed."
      }
    }
  ]
};
