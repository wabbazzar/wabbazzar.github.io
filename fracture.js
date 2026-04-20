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

    // ---------- shard + edge generation ----------

    // Build the Delaunay tessellation and extract its interior edges. The edges
    // ARE the crack lines we render — this guarantees every gold line lies on
    // an actual shard boundary, so shards peel apart along the cracks exactly.
    // Each edge also gets a BFS-depth from the original triangle vertices, so
    // timing can propagate outward like a real crack front.
    function generateShards(network, triangle, viewport, params, rand) {
        const { EXTRA_JITTER_POINTS, EDGE_SAMPLE_STEP } = params;
        const { w, h } = viewport;

        // Seed points: viewport corners + border samples + crack network nodes + jitter.
        const seeds = [];
        seeds.push([0, 0], [w, 0], [w, h], [0, h]);
        const step = Math.max(80, EDGE_SAMPLE_STEP);
        for (let x = step; x < w; x += step) { seeds.push([x, 0]); seeds.push([x, h]); }
        for (let y = step; y < h; y += step) { seeds.push([0, y]); seeds.push([w, y]); }
        for (const n of network.nodes) seeds.push([n[0], n[1]]);
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

        // Locate the 3 triangle vertices in the dedup set (nearest-by-distance match).
        const triIdx = [];
        for (let i = 0; i < 3; i++) {
            const [tx, ty] = triangle[i];
            let best = -1, bestD = Infinity;
            for (let k = 0; k < dedup.length; k++) {
                const dx = dedup[k][0] - tx, dy = dedup[k][1] - ty;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestD) { bestD = d2; best = k; }
            }
            if (best >= 0) triIdx.push(best);
        }

        const { triangles, points } = delaunay(dedup);

        // Build the edge multimap: each edge records the triangles it bounds.
        const edgeMap = new Map();
        for (let ti = 0; ti < triangles.length; ti++) {
            const [a, b, c] = triangles[ti];
            const pairs = [[a, b], [b, c], [c, a]];
            for (const [u, v] of pairs) {
                const key = u < v ? u + "," + v : v + "," + u;
                let e = edgeMap.get(key);
                if (!e) { e = { a: u, b: v, tris: [] }; edgeMap.set(key, e); }
                e.tris.push(ti);
            }
        }

        // Vertex adjacency for BFS.
        const adj = new Array(points.length);
        for (let i = 0; i < points.length; i++) adj[i] = [];
        for (const e of edgeMap.values()) {
            adj[e.a].push(e.b);
            adj[e.b].push(e.a);
        }

        // BFS from the 3 triangle-vertex indices so every vertex has a depth
        // equal to the number of Delaunay edges between it and the gesture.
        const vertDepth = new Array(points.length).fill(Infinity);
        const queue = [];
        for (const i of triIdx) { if (i >= 0 && vertDepth[i] === Infinity) { vertDepth[i] = 0; queue.push(i); } }
        let head = 0;
        while (head < queue.length) {
            const u = queue[head++];
            for (const v of adj[u]) {
                if (vertDepth[v] === Infinity) { vertDepth[v] = vertDepth[u] + 1; queue.push(v); }
            }
        }
        let maxVertDepth = 1;
        for (let i = 0; i < vertDepth.length; i++) {
            if (vertDepth[i] !== Infinity && vertDepth[i] > maxVertDepth) maxVertDepth = vertDepth[i];
        }

        // Build shards (non-degenerate triangles) and index them by triangle id
        // so edges can point at the exact shard objects they bound.
        const shardByTri = new Array(triangles.length);
        const shards = [];
        for (let ti = 0; ti < triangles.length; ti++) {
            const [ia, ib, ic] = triangles[ti];
            const pa = points[ia], pb = points[ib], pc = points[ic];
            const area = Math.abs(
                (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1])
            ) / 2;
            if (area < 4) continue;
            const cx = (pa[0] + pb[0] + pc[0]) / 3;
            const cy = (pa[1] + pb[1] + pc[1]) / 3;
            const sd = Math.min(
                vertDepth[ia] === Infinity ? maxVertDepth : vertDepth[ia],
                vertDepth[ib] === Infinity ? maxVertDepth : vertDepth[ib],
                vertDepth[ic] === Infinity ? maxVertDepth : vertDepth[ic]
            );
            const s = { a: pa, b: pb, c: pc, centroid: [cx, cy], area, bfsDepth: sd };
            shardByTri[ti] = s;
            shards.push(s);
        }

        // Interior edges (shared by 2 valid shards) are the visible cracks.
        const edges = [];
        for (const e of edgeMap.values()) {
            if (e.tris.length !== 2) continue;
            const sA = shardByTri[e.tris[0]];
            const sB = shardByTri[e.tris[1]];
            if (!sA || !sB) continue;
            const da = vertDepth[e.a] === Infinity ? maxVertDepth : vertDepth[e.a];
            const db = vertDepth[e.b] === Infinity ? maxVertDepth : vertDepth[e.b];
            edges.push({
                a: points[e.a], b: points[e.b],
                bfsDepth: Math.min(da, db),
                shardA: sA, shardB: sB,
            });
        }

        return { shards, edges, maxVertDepth };
    }

    // ---------- full plan ----------

    function planFracture(triangle, viewport, params, seed) {
        const rand = mulberry32(seed || ((Math.random() * 1e9) | 0));
        const network = buildCrackNetwork(triangle, viewport, params, rand);
        const origin = network.centroid;

        const { shards, edges, maxVertDepth } = generateShards(network, triangle, viewport, params, rand);

        // Edge wave: each BFS-depth level gets a time slot, so cracks propagate
        // outward from the triangle corners along real shard boundaries.
        let edgeEnd = 0;
        for (const e of edges) {
            e.delay = e.bfsDepth * params.EDGE_STEP_MS + rand() * 40;
            e.duration = params.EDGE_DRAW_MS;
            const finish = e.delay + e.duration;
            if (finish > edgeEnd) edgeEnd = finish;
        }

        // Shatter begins once the crack wave has fully laid out, with a brief
        // settled moment where the whole cracked viewport is visible.
        const shatterStart = edgeEnd + params.PRE_SHATTER_PAUSE_MS;
        for (const s of shards) {
            const sd = (maxVertDepth > 0) ? s.bfsDepth / maxVertDepth : 0;
            s.delay = shatterStart + sd * params.SHATTER_STAGGER;
            s.duration = params.SHATTER_MS;
            // Outward push direction from origin (used by renderFrame).
            s._d = hypot(s.centroid[0] - origin[0], s.centroid[1] - origin[1]);
        }

        // Each edge fades out once the earlier of its two adjacent shards begins
        // flying — so the crack "opens up" in time with the break.
        for (const e of edges) {
            e.fadeStart = Math.min(e.shardA.delay, e.shardB.delay);
            e.fadeDuration = params.EDGE_FADE_MS;
        }

        const totalMs = shatterStart + params.SHATTER_STAGGER + params.SHATTER_MS;
        return { network, shards, edges, totalMs, viewport, origin, params };
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

        // Crack lines = actual Delaunay edges between adjacent shards. They
        // stroke in from the midpoint outward (edge splitting open), stay lit,
        // then fade as their bounding shards fly off.
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const e of plan.edges) {
            const local = t - e.delay;
            if (local <= 0) continue;
            const drawU = Math.min(1, local / e.duration);
            const mx = (e.a[0] + e.b[0]) / 2;
            const my = (e.a[1] + e.b[1]) / 2;
            const ax = mx + (e.a[0] - mx) * drawU;
            const ay = my + (e.a[1] - my) * drawU;
            const bx = mx + (e.b[0] - mx) * drawU;
            const by = my + (e.b[1] - my) * drawU;

            let alpha = 1;
            const fadeT = t - e.fadeStart;
            if (fadeT > 0) alpha = Math.max(0, 1 - fadeT / e.fadeDuration);
            if (alpha <= 0) continue;

            ctx.globalAlpha = 0.85 * alpha;
            ctx.strokeStyle = crackGlow;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
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

    // Tuned with tools/fracture-tune.js. Crack-tree params still used to seed
    // Delaunay points biased toward the gesture; cracks themselves are now
    // drawn along Delaunay edges, BFS-timed outward from the triangle.
    const DEFAULT_PARAMS = {
        // crack tree (point-set seeding only — no longer rendered)
        PRIMARY_LEN_MULT: 2.8,
        BRANCH_LEN_RATIO: 0.72,
        BRANCH_ANGLE_SPREAD: 0.95,  // radians
        MAX_DEPTH: 4,
        PROPAGATION_MS: 550,
        SEGMENT_MS: 60,
        // tessellation
        EXTRA_JITTER_POINTS: 12,
        EDGE_SAMPLE_STEP: 220,
        // edge wave (visible crack propagation along shard boundaries)
        EDGE_STEP_MS: 55,           // ms per BFS depth level
        EDGE_DRAW_MS: 130,          // per-edge stroke-in duration
        EDGE_FADE_MS: 320,          // edge fade-out when adjacent shard flies
        PRE_SHATTER_PAUSE_MS: 90,   // beat of "fully cracked" before shards move
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
