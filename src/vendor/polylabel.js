/* @P1850-CHUNK 09 — VENDORED polylabel@1.1.0 (ISC, Mapbox) + tinyqueue@2.0.3 (ISC) inlined — pole of inaccessibility; exposes module-local `polylabel`. */
/* =====================================================================
   src/vendor/ — VENDORED SOLVED-PROBLEM (foundation-reset.md §4b). s90 THE
   LABELS BATCH, second policy consumer (after s87's polybooljs). ONE clearly-
   marked vendor chunk, one self-contained file, pinned versions, upstream
   licenses verbatim, purely deterministic (grepped: no Date / Math.random /
   performance.*).

   WHY polylabel — the §4b JUSTIFICATION: every ground/zone label needs a good
   ANCHOR POINT INSIDE its polygon — not the centroid (which falls outside
   L-shaped blocks, cove crescents, the plaza-notched grid) but the "pole of
   inaccessibility", the interior point farthest from any edge, so a label sits
   squarely on its lot / parcel / water body. That is polylabel's exact and only
   job; it is the canonical tiny single-file solution. Hand-rolling a pole-of-
   inaccessibility search is the checkable solved problem a gate rejects.

   PINNED: polylabel@1.1.0 (npm, Mapbox, ISC). Its one runtime dependency is
   tinyqueue@2.0.3 (Vladimir Agafonkin, ISC) — a binary heap. To keep the §4b
   single-file constraint, tinyqueue is INLINED here (its ES-class source
   rewritten as an equivalent ES5 constructor so the whole app stays one classic
   script) and polylabel's require('tinyqueue') is dropped. Import review per
   foundation-reset §3.1: both bundles read end-to-end — pure geometry + a heap,
   zero external lookups, no assets/network/clock/RNG. The CommonJS
   module.exports = polylabel wrapper is replaced by assignment to the module-
   local var polylabel (every later chunk closes over it).
   GREAT SPLIT: this file holds 1 chunk (build-app.js FILES).

   ---- upstream LICENSE — polylabel (ISC), Copyright (c) 2016 Mapbox ----
   ---- upstream LICENSE — tinyqueue (ISC), Copyright (c) 2017 Vladimir Agafonkin ----
   Permission to use, copy, modify, and/or distribute this software for any
   purpose with or without fee is hereby granted, provided that the above
   copyright notice and this permission notice appear in all copies. THE SOFTWARE
   IS PROVIDED "AS IS" AND THE AUTHOR/ISC DISCLAIMS ALL WARRANTIES WITH REGARD TO
   THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS.
   IN NO EVENT SHALL THE AUTHOR/ISC BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT,
   OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
   DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
   ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS
   SOFTWARE.
   ===================================================================== */
var polylabel = (function () { "use strict";

  /* ---- tinyqueue@2.0.3 (ISC) — ES class inlined as an ES5 constructor ---- */
  function TinyQueue(data, compare) {
    this.data = data || [];
    this.length = this.data.length;
    this.compare = compare || defaultCompare;
    if (this.length > 0) { for (var i = (this.length >> 1) - 1; i >= 0; i--) this._down(i); }
  }
  TinyQueue.prototype.push = function (item) {
    this.data.push(item); this.length++; this._up(this.length - 1);
  };
  TinyQueue.prototype.pop = function () {
    if (this.length === 0) return undefined;
    var top = this.data[0], bottom = this.data.pop();
    this.length--;
    if (this.length > 0) { this.data[0] = bottom; this._down(0); }
    return top;
  };
  TinyQueue.prototype.peek = function () { return this.data[0]; };
  TinyQueue.prototype._up = function (pos) {
    var data = this.data, compare = this.compare, item = data[pos];
    while (pos > 0) {
      var parent = (pos - 1) >> 1, current = data[parent];
      if (compare(item, current) >= 0) break;
      data[pos] = current; pos = parent;
    }
    data[pos] = item;
  };
  TinyQueue.prototype._down = function (pos) {
    var data = this.data, compare = this.compare, halfLength = this.length >> 1, item = data[pos];
    while (pos < halfLength) {
      var left = (pos << 1) + 1, best = data[left], right = left + 1;
      if (right < this.length && compare(data[right], best) < 0) { left = right; best = data[right]; }
      if (compare(best, item) >= 0) break;
      data[pos] = best; pos = left;
    }
    data[pos] = item;
  };
  function defaultCompare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  /* ---- polylabel@1.1.0 (ISC) — verbatim, require('tinyqueue') -> TinyQueue ---- */
  function polylabel(polygon, precision, debug) {
    precision = precision || 1.0;
    var minX, minY, maxX, maxY;
    for (var i = 0; i < polygon[0].length; i++) {
      var p = polygon[0][i];
      if (!i || p[0] < minX) minX = p[0];
      if (!i || p[1] < minY) minY = p[1];
      if (!i || p[0] > maxX) maxX = p[0];
      if (!i || p[1] > maxY) maxY = p[1];
    }
    var width = maxX - minX, height = maxY - minY;
    var cellSize = Math.min(width, height), h = cellSize / 2;
    if (cellSize === 0) {
      var degenerate = [minX, minY]; degenerate.distance = 0; return degenerate;
    }
    var cellQueue = new TinyQueue(undefined, compareMax);
    for (var x = minX; x < maxX; x += cellSize) {
      for (var y = minY; y < maxY; y += cellSize) {
        cellQueue.push(new Cell(x + h, y + h, h, polygon));
      }
    }
    var bestCell = getCentroidCell(polygon);
    var bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, polygon);
    if (bboxCell.d > bestCell.d) bestCell = bboxCell;
    var numProbes = cellQueue.length;
    while (cellQueue.length) {
      var cell = cellQueue.pop();
      if (cell.d > bestCell.d) {
        bestCell = cell;
        if (debug) console.log("found best %d after %d probes", Math.round(1e4 * cell.d) / 1e4, numProbes);
      }
      if (cell.max - bestCell.d <= precision) continue;
      h = cell.h / 2;
      cellQueue.push(new Cell(cell.x - h, cell.y - h, h, polygon));
      cellQueue.push(new Cell(cell.x + h, cell.y - h, h, polygon));
      cellQueue.push(new Cell(cell.x - h, cell.y + h, h, polygon));
      cellQueue.push(new Cell(cell.x + h, cell.y + h, h, polygon));
      numProbes += 4;
    }
    var pole = [bestCell.x, bestCell.y]; pole.distance = bestCell.d; return pole;
  }
  function compareMax(a, b) { return b.max - a.max; }
  function Cell(x, y, h, polygon) {
    this.x = x; this.y = y; this.h = h;
    this.d = pointToPolygonDist(x, y, polygon);
    this.max = this.d + this.h * Math.SQRT2;
  }
  function pointToPolygonDist(x, y, polygon) {
    var inside = false, minDistSq = Infinity;
    for (var k = 0; k < polygon.length; k++) {
      var ring = polygon[k];
      for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
        var a = ring[i], b = ring[j];
        if ((a[1] > y !== b[1] > y) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) inside = !inside;
        minDistSq = Math.min(minDistSq, getSegDistSq(x, y, a, b));
      }
    }
    return minDistSq === 0 ? 0 : (inside ? 1 : -1) * Math.sqrt(minDistSq);
  }
  function getCentroidCell(polygon) {
    var area = 0, x = 0, y = 0, points = polygon[0];
    for (var i = 0, len = points.length, j = len - 1; i < len; j = i++) {
      var a = points[i], b = points[j], f = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * f; y += (a[1] + b[1]) * f; area += f * 3;
    }
    if (area === 0) return new Cell(points[0][0], points[0][1], 0, polygon);
    return new Cell(x / area, y / area, 0, polygon);
  }
  function getSegDistSq(px, py, a, b) {
    var x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      var t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = px - x; dy = py - y;
    return dx * dx + dy * dy;
  }

  return polylabel;
})();
