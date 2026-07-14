# tools/verify — the Verification Harness (s89 ITEM 0)

DEV-ONLY. Never shipped; the app stays single-file (foundation-reset §3/§4b).
Playwright is vendored LOCALLY here (own package.json; node_modules gitignored).

## Setup (once)
    cd tools/verify
    npm install
    npx playwright install chromium

## Run
    node tools/verify/verify.js            # serve worktree, verify index.html + atelier.html
    node tools/verify/verify.js --file ../../index.html
    node tools/verify/verify.js --url http://localhost:8000/index.html
    node tools/verify/verify.js --headed   # watch the browser

Emits report/report.json + report/report.md. Exit 0 = all green, 1 = red.

For EACH target: installs error traps before load, asserts boot (veil clears,
zero uncaught, zero console errors), runs the NOON PROTOCOL at the four
canonical dates (audits.runAll — any fail OR any skipped-at-noon = red), runs
the measurement tables via __P1850.verify.* checked against fixtures/osm-controls.json,
and captures canonical framing screenshots (canvas screenshot; __wbShot fallback).

Geodesic ground truth: fixtures/osm-controls.json (stored once; runs never hit
the network). Provenance = OSM Overpass control points, tools/map-overlay.py.
