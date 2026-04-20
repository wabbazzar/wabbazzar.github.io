// Recursive fracture tree + Delaunay shard tessellation used by the
// triangle-gesture easter egg and the tuning harness. Exposed as
// window.Fracture. No external dependencies.
(function () {
    "use strict";

    // ---------- helpers ----------

    const { hypot, atan2, sin, cos, PI } = Math;
    const TAU = PI * 2;

    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function scale(a, s) { return [a[0] * s, a[1] * s]; }
    function len(a) { return hypot(a[0], a[1]); }

    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---------- crack network ----------

    // A "crack" is a line segment from (x1,y1) to (x2,y2) with a parent reference,
    // a depth level, and a `delay` — when during propagation it starts drawing.
    function buildCrackNetwork(triangle, viewport, params, rand) {
        const {
            PRIMARY_LEN_MULT,
            BRANCH_LEN_RATIO,
            BRANCH_ANGLE_SPREAD,
            MAX_DEPTH,
            PROPAGATION_MS,
            SEGMENT_MS,
        } = params;

        const cx = (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3;
        const cy = (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3;
        const centroid = [cx, cy];

        // Outward bisector for each corner: sum of the two edge-unit-vectors
        // pointing *away* from the corner, then negate and normalize — which
        // works out to the direction from centroid through the corner.
        const segments = [];
        const nodes = [...triangle]; // seed with the 3 drawn vertices

        function clipToViewport(start, dir, length) {
            // Find intersection with viewport rectangle if we overshoot.
            const [sx, sy] = start;
            const [dx, dy] = dir;
            let tMin = length;
            const { w, h } = viewport;
            if (dx > 1e-9) tMin = Math.min(tMin, (w - sx) / dx);
            else if (dx < -1e-9) tMin = Math.min(tMin, (0 - sx) / dx);
            if (dy > 1e-9) tMin = Math.min(tMin, (h - sy) / dy);
            else if (dy < -1e-9) tMin = Math.min(tMin, (0 - sy) / dy);
            tMin = Math.max(0, Math.min(length, tMin));
            return { end: [sx + dx * tMin, sy + dy * tMin], hitEdge: tMin < length - 0.01 };
        }

        // Emit a single crack segment; recurse with two branches.
        function emit(start, angle, length, depth, parentId, startDelay) {
            if (length < 8) return;
            const dir = [cos(angle), sin(angle)];
            const { end, hitEdge } = clipToViewport(start, dir, length);
            const actualLen = hypot(end[0] - start[0], end[1] - start[1]);
            if (actualLen < 4) return;

            const duration = Math.max(30, SEGMENT_MS * (actualLen / 120));
            const id = segments.length;
            segments.push({
                id,
                parent: parentId,
                depth,
                start,
                end,
                angle,
                length: actualLen,
                delay: startDelay,
                duration,
            });
            nodes.push(end);

            if (depth >= MAX_DEPTH || hitEdge) return;

            // Two children at ±spread (with jitter).
            const jitter = BRANCH_ANGLE_SPREAD * (0.6 + 0.4 * rand());
            const lenRatio1 = BRANCH_LEN_RATIO * (0.75 + 0.5 * rand());
            const lenRatio2 = BRANCH_LEN_RATIO * (0.75 + 0.5 * rand());
            const childDelay = startDelay + duration;
            emit(end, angle + jitter, actualLen * lenRatio1, depth + 1, id, childDelay);
            emit(end, angle - jitter, actualLen * lenRatio2, depth + 1, id, childDelay);

            // Occasionally spawn a third "fork" straight ahead for density.
            if (rand() < 0.35 && depth < MAX_DEPTH - 1) {
                const lenRatio3 = BRANCH_LEN_RATIO * 0.55 * (0.5 + rand());
                emit(end, angle + (rand() - 0.5) * 0.3, actualLen * lenRatio3, depth + 1, id, childDelay);
            }
        }

        // 3 primary cracks, one outward from each corner.
        for (let i = 0; i < 3; i++) {
            const corner = triangle[i];
            const a = triangle[(i + 1) % 3];
            const b = triangle[(i + 2) % 3];
            const oppositeLen = hypot(a[0] - b[0], a[1] - b[1]);
            // Outward direction = from centroid through corner.
            const dx = corner[0] - cx;
            const dy = corner[1] - cy;
            const d = hypot(dx, dy) || 1;
            const angle = atan2(dy / d, dx / d);
            const primaryLen = oppositeLen * PRIMARY_LEN_MULT;
            emit(corner, angle, primaryLen, 0, -1, 0);
        }

        // Total network duration (latest segment finish time).
        let totalMs = 0;
        for (const s of segments) {
            if (s.delay + s.duration > totalMs) totalMs = s.delay + s.duration;
        }
        totalMs = Math.min(totalMs, PROPAGATION_MS);
        return { segments, nodes, totalMs, centroid };
    }

    // ---------- Delaunay (Bowyer–Watson) ----------

    function circumcircle(a, b, c) {
        const ax = a[0], ay = a[1];
        const bx = b[0], by = b[1];
        const cx = c[0], cy = c[1];
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(d) < 1e-12) return null;
        const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
        const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
        const r2 = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
        return { cx: ux, cy: uy, r2 };
    }

    function delaunay(points) {
        // Super-triangle large enough to contain every point.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
            if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
        }
        const dx = (maxX - minX) || 1, dy = (maxY - minY) || 1;
        const dmax = Math.max(dx, dy) * 20;
        const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
        const st0 = [midX - dmax, midY - dmax];
        const st1 = [midX + dmax, midY - dmax];
        const st2 = [midX, midY + dmax];
        const pts = points.slice();
        const sA = pts.length, sB = sA + 1, sC = sA + 2;
        pts.push(st0, st1, st2);

        let triangles = [[sA, sB, sC]];

        for (let i = 0; i < points.length; i++) {
            const p = pts[i];
            const bad = [];
            for (let t = 0; t < triangles.length; t++) {
                const [ia, ib, ic] = triangles[t];
                const cc = circumcircle(pts[ia], pts[ib], pts[ic]);
                if (!cc) continue;
                const d2 = (p[0] - cc.cx) * (p[0] - cc.cx) + (p[1] - cc.cy) * (p[1] - cc.cy);
                if (d2 < cc.r2 - 1e-9) bad.push(t);
            }
            // Boundary edges of the hole (edges appearing in exactly one bad triangle).
            const edgeCount = new Map();
            for (const t of bad) {
                const [ia, ib, ic] = triangles[t];
                const edges = [[ia, ib], [ib, ic], [ic, ia]];
                for (const [u, v] of edges) {
                    const key = u < v ? `${u},${v}` : `${v},${u}`;
                    edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
                }
            }
            // Remove bad triangles (in descending index order).
            bad.sort((a, b) => b - a);
            for (const t of bad) triangles.splice(t, 1);
            // Re-triangulate hole with boundary edges to new point.
            for (const [key, count] of edgeCount) {
                if (count !== 1) continue;
                const [u, v] = key.split(",").map(Number);
                triangles.push([u, v, i]);
            }
        }
        // Strip triangles that reference super-triangle vertices.
        const out = [];
        for (const [a, b, c] of triangles) {
            if (a < sA && b < sA && c < sA) out.push([a, b, c]);
        }
        return { triangles: out, points: pts.slice(0, points.length) };
    }

    // ---------- shard generation ----------

    function generateShards(network, viewport, params, rand) {
        const { EXTRA_JITTER_POINTS, EDGE_SAMPLE_STEP } = params;
        const { w, h } = viewport;

        // Seed points: viewport corners + border samples + crack network nodes + jitter.
        const seeds = [];
        seeds.push([0, 0], [w, 0], [w, h], [0, h]);
        // Border samples so no gigantic triangles span the edges.
        const step = Math.max(80, EDGE_SAMPLE_STEP);
        for (let x = step; x < w; x += step) { seeds.push([x, 0]); seeds.push([x, h]); }
        for (let y = step; y < h; y += step) { seeds.push([0, y]); seeds.push([w, y]); }
        // Network nodes.
        for (const n of network.nodes) seeds.push([n[0], n[1]]);
        // Jitter for variety (biased toward viewport center + original triangle).
        for (let i = 0; i < EXTRA_JITTER_POINTS; i++) {
            seeds.push([rand() * w, rand() * h]);
        }

        // Deduplicate near-duplicates (would break Delaunay circumcircle test).
        const dedup = [];
        const EPS = 2;
        for (const p of seeds) {
            let dup = false;
            for (const q of dedup) {
                if (Math.abs(p[0] - q[0]) < EPS && Math.abs(p[1] - q[1]) < EPS) { dup = true; break; }
            }
            if (!dup) dedup.push(p);
        }

        const { triangles, points } = delaunay(dedup);

        // Build shard objects; attach delay based on distance from network centroid so
        // shards near the drawn triangle fly first.
        const shards = [];
        for (const [ia, ib, ic] of triangles) {
            const pa = points[ia], pb = points[ib], pc = points[ic];
            const cx = (pa[0] + pb[0] + pc[0]) / 3;
            const cy = (pa[1] + pb[1] + pc[1]) / 3;
            // signed area -> skip degenerates
            const area = Math.abs(
                (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1])
            ) / 2;
            if (area < 4) continue;
            shards.push({
                a: pa, b: pb, c: pc,
                centroid: [cx, cy],
                area,
            });
        }
        return shards;
    }

    // ---------- full plan ----------

    function planFracture(triangle, viewport, params, seed) {
        const rand = mulberry32(seed || ((Math.random() * 1e9) | 0));
        const network = buildCrackNetwork(triangle, viewport, params, rand);
        const shards = generateShards(network, viewport, params, rand);
        // Stagger shard delay: start after crack propagation; closer-to-origin shards leave earlier.
        const origin = network.centroid;
        let dMax = 0;
        for (const s of shards) {
            s._d = hypot(s.centroid[0] - origin[0], s.centroid[1] - origin[1]);
            if (s._d > dMax) dMax = s._d;
        }
        const shatterStart = network.totalMs * 0.6; // overlap with crack tail
        const shardSpan = params.SHATTER_MS;
        for (const s of shards) {
            const t = dMax > 0 ? s._d / dMax : 0;
            s.delay = shatterStart + t * params.SHATTER_STAGGER;
            s.duration = shardSpan;
        }
        const totalMs = Math.max(
            network.totalMs,
            shatterStart + params.SHATTER_STAGGER + shardSpan
        );
        return { network, shards, totalMs, viewport, origin };
    }

    // ---------- metrics ----------

    function shardAreaCoverage(shards, viewport) {
        let sum = 0;
        for (const s of shards) sum += s.area;
        const vpArea = viewport.w * viewport.h;
        return Math.min(1, sum / vpArea);
    }

    // ---------- rendering (canvas) ----------

    // Draws one frame of the fracture animation.
    //   t: elapsed ms since animation start
    //   plan: output of planFracture
    //   ctx: 2d canvas context
    // Returns true while animating, false when done.
    function renderFrame(ctx, plan, t, theme) {
        const { w, h } = plan.viewport;
        ctx.clearRect(0, 0, w, h);
        const th = theme || {};
        const shardColor = th.shardColor || "rgba(6, 10, 18, 0.92)";
        const crackColor = th.crackColor || "rgba(255, 230, 160, 1)";
        const crackGlow = th.crackGlow || "rgba(255, 200, 90, 0.55)";

        // Shards: each flies outward from origin with rotation + fade.
        for (const s of plan.shards) {
            const local = t - s.delay;
            if (local <= 0) {
                // not started yet — render as static occluder piece
                drawTriangle(ctx, s.a, s.b, s.c, shardColor);
                continue;
            }
            if (local >= s.duration) continue; // flown off
            const u = local / s.duration;
            const e = 1 - Math.pow(1 - u, 2); // ease-out
            const [ox, oy] = plan.origin;
            const dx = s.centroid[0] - ox;
            const dy = s.centroid[1] - oy;
            const dlen = Math.hypot(dx, dy) || 1;
            const push = 400 * e;
            const tx = (dx / dlen) * push;
            const ty = (dy / dlen) * push;
            const rot = (s._d % 2 === 0 ? 1 : -1) * e * 0.9;
            const alpha = 1 - e;
            ctx.save();
            ctx.translate(s.centroid[0] + tx, s.centroid[1] + ty);
            ctx.rotate(rot);
            ctx.globalAlpha = alpha;
            ctx.translate(-s.centroid[0], -s.centroid[1]);
            drawTriangle(ctx, s.a, s.b, s.c, shardColor);
            ctx.restore();
        }

        // Crack lines: drawn on top, fade out as they age.
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const seg of plan.network.segments) {
            const local = t - seg.delay;
            if (local <= 0) continue;
            const u = Math.min(1, local / seg.duration);
            const ex = seg.start[0] + (seg.end[0] - seg.start[0]) * u;
            const ey = seg.start[1] + (seg.end[1] - seg.start[1]) * u;
            // Fade the crack after it has fully propagated.
            const age = local - seg.duration;
            const ageFade = age > 0 ? Math.max(0, 1 - age / 500) : 1;
            if (ageFade <= 0) continue;
            ctx.globalAlpha = 0.85 * ageFade;
            ctx.strokeStyle = crackGlow;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(seg.start[0], seg.start[1]);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.strokeStyle = crackColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return t < plan.totalMs;
    }

    function drawTriangle(ctx, a, b, c, fill) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.closePath();
        ctx.fill();
    }

    // ---------- default params ----------

    // Tuned values: 60/60 random-triangle trials across 1440×900, 1280×720, and
    // 390×844 viewports pass coverage≥95% in ≤3000ms. See tools/fracture-tune.js.
    const DEFAULT_PARAMS = {
        // crack tree
        PRIMARY_LEN_MULT: 2.8,
        BRANCH_LEN_RATIO: 0.72,
        BRANCH_ANGLE_SPREAD: 0.95,  // radians
        MAX_DEPTH: 4,
        PROPAGATION_MS: 550,
        SEGMENT_MS: 60,             // per ~120px of length
        // tessellation
        EXTRA_JITTER_POINTS: 12,
        EDGE_SAMPLE_STEP: 220,
        // shatter
        SHATTER_MS: 1500,
        SHATTER_STAGGER: 650,
    };

    // ---------- public API ----------

    window.Fracture = {
        DEFAULT_PARAMS,
        buildCrackNetwork,
        generateShards,
        delaunay,
        planFracture,
        renderFrame,
        shardAreaCoverage,
        mulberry32,
    };
})();
