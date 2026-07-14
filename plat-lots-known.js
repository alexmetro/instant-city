/* AUTO-GENERATED from data/plat-lots-known.json (docs repo) — do not hand-edit.
 * The digitized survey lot registry consumed by core/08-cadastre cadApplyRecord()
 * as window.PLAT_LOTS_KNOWN. Regenerate when the source JSON changes (s85). */
window.PLAT_LOTS_KNOWN = {
  "_meta": {
    "title": "Plat lots known -- digitized survey registry (s85 stage-1b, promoted from the stage-1 draft)",
    "generated": "2026-07-14",
    "status": "v1 -- the Portsmouth Square plaza-ring core, read WELL off the Eddy 1849 plat. COVERAGE BOUNDARY (honest, per the s85 brief 'partial-but-true beats complete-but-assumed'): 3 blocks / 15 lot records around Portsmouth Square. The Kearny/Montgomery commercial-spine extension to ~15-25 blocks is DEFERRED to the Block Book pass (see research/plat-truth-stage1b.md): the Eddy lithograph's per-lot numbers are legible but slow to transcribe at scale, and recovering RECORDED lot WIDTHS (vs assumed thirds) needs the 1901 San Francisco Block Book, not yet parsed. This file therefore digitizes the plaza ring at GOLD confidence rather than guessing the spine.",
    "source_map": "research/map-scans/eddy-1849.jpg (Eddy 1849 official re-survey; Stanford/Rumsey DRUID xg004hm0718, CC BY-NC-SA 3.0)",
    "underlying_survey": "O'Farrell 1847 fifty-vara survey (Eddy's 1849 map is the earliest independently digitized proxy)",
    "join_key": "block_ref is the LIVE CADASTRE block key (app/src/core/08-cadastre.js deriveGroundPlan: 'B|west|east|north|south' street-id edge key); iU/iV are the pattern-lot ordinals within that block (iU 0..nU-1 west->east, iV 0..nV-1 north->south). cadApplyRecord() stamps the recorded lot_number + source onto the matching pattern lot (source:'record'); pattern-fill everywhere else. This makes the record the OVERRIDE, the 50-vara pattern the FILL (building-spawn-spec.md 1.3-3a).",
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
    }
  },
  "lots": [
    {
      "id": "plat-20", "survey": "eddy-1849", "lot_number": "20",
      "block_ref": "B|kearny|montgomery|washington|clay", "block_label": "Kearny-Montgomery x Washington-Clay (E of the plaza)",
      "iU": 0, "iV": 0, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible",
      "note": "NW lot (Kearny/Washington corner) of the clean 2x3 six-lot block E of the plaza."
    },
    {
      "id": "plat-19", "survey": "eddy-1849", "lot_number": "19",
      "block_ref": "B|kearny|montgomery|washington|clay", "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 1, "iV": 0, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "N-row middle lot."
    },
    {
      "id": "plat-3", "survey": "eddy-1849", "lot_number": "3",
      "block_ref": "B|kearny|montgomery|washington|clay", "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 2, "iV": 0, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "NE lot (Montgomery/Washington corner)."
    },
    {
      "id": "plat-27", "survey": "eddy-1849", "lot_number": "27",
      "block_ref": "B|kearny|montgomery|washington|clay", "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 0, "iV": 1, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "SW lot (Kearny/Clay corner)."
    },
    {
      "id": "plat-19half", "survey": "eddy-1849", "lot_number": "19-1/2",
      "block_ref": "B|kearny|montgomery|washington|clay", "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 1, "iV": 1, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH (existence/number); MODERATE (which axis the half-lot splits)",
      "source": "eddy-1849 plat, directly legible",
      "note": "OFFICIALLY NUMBERED HALF-LOT on the 1849 survey itself ('19-1/2') -- primary evidence that even the nominally-uniform 50-vara grid carried fractional lots AT THE POINT OF SURVEY, not just by later private split. v1 stamps the identity onto the pattern lot; the true half-lot cut geometry is a Block-Book fast-follow."
    },
    {
      "id": "plat-2", "survey": "eddy-1849", "lot_number": "2",
      "block_ref": "B|kearny|montgomery|washington|clay", "block_label": "Kearny-Montgomery x Washington-Clay",
      "iU": 2, "iV": 1, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "SE lot (Montgomery/Clay corner)."
    },
    {
      "id": "plat-53-c", "survey": "eddy-1849", "lot_number": "53",
      "block_ref": "B|dupont|kearny|clay|sacramento", "block_label": "Dupont-Kearny x Clay-Sacramento (S of the plaza)",
      "iU": 0, "iV": 0, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "NW lot (Dupont/Clay corner), block immediately S of the plaza across Clay St."
    },
    {
      "id": "plat-30-c", "survey": "eddy-1849", "lot_number": "30",
      "block_ref": "B|dupont|kearny|clay|sacramento", "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 1, "iV": 0, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "N-row middle lot."
    },
    {
      "id": "plat-29-c", "survey": "eddy-1849", "lot_number": "29",
      "block_ref": "B|dupont|kearny|clay|sacramento", "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 2, "iV": 0, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "NE lot (Kearny/Clay corner)."
    },
    {
      "id": "plat-54-c", "survey": "eddy-1849", "lot_number": "54",
      "block_ref": "B|dupont|kearny|clay|sacramento", "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 0, "iV": 1, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "SW lot (Dupont/Sacramento corner)."
    },
    {
      "id": "plat-55-c", "survey": "eddy-1849", "lot_number": "55",
      "block_ref": "B|dupont|kearny|clay|sacramento", "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 1, "iV": 1, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "S-row middle lot."
    },
    {
      "id": "plat-28-c", "survey": "eddy-1849", "lot_number": "28",
      "block_ref": "B|dupont|kearny|clay|sacramento", "block_label": "Dupont-Kearny x Clay-Sacramento",
      "iU": 2, "iV": 1, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "HIGH", "source": "eddy-1849 plat, directly legible", "note": "SE lot (Kearny/Sacramento corner)."
    },
    {
      "id": "plat-52", "survey": "eddy-1849", "lot_number": "52",
      "block_ref": "B|dupont|kearny|washington|clay", "block_label": "Portsmouth Square block (Dupont-Kearny x Washington-Clay)",
      "iU": 0, "iV": 0, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "GOLD (plat + corpus agree, s85 ruling)",
      "source": "eddy-1849 plat + corpus DAC18491212/14/17",
      "note": "Washington x Dupont CORNER lot fronting the plaza, with a documented dwelling house (DAC18491212: 'Lot No. 52 ... centrally situated on Washington and Dupont sts. and Portsmouth [Square]'). EXPECTED UNMATCHED in the cadastre: this block is modeled as the publicReserve plaza common (zero plat lots, s82). Surfaced by platRecords as 'public-reserve-zero-lots' -- see _meta.rulings_this_pass.plaza_block_extent_finding."
    },
    {
      "id": "plat-51", "survey": "eddy-1849", "lot_number": "51",
      "block_ref": "B|dupont|kearny|washington|clay", "block_label": "Portsmouth Square block (Dupont-Kearny x Washington-Clay)",
      "iU": 0, "iV": 1, "dimensions": { "width_vara": 50, "depth_vara": 50, "width_m": 41.91, "depth_m": 41.91 },
      "confidence": "MODERATE-HIGH (paired with lot 52)",
      "source": "eddy-1849 plat",
      "note": "Dupont-frontage lot directly S of lot 52, west edge of the plaza block. Same expected-unmatched (public-reserve) handling as lot 52."
    }
  ]
};
