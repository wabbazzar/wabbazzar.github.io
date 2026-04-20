// Triangle-gesture easter egg: draw a closed triangle anywhere on the page
// (hold left mouse / finger down) and the viewport shatters into the
// puffacles game. Depends on fracture.js for the math + animation, and on
// the puffacles deploy at https://wabbazzar.com/puffacles/?bg=wabbazzar.
(function () {
    "use strict";

    const PUFFACLES_URL = "https://wabbazzar.com/puffacles/?bg=wabbazzar";

    // Tweak-your-heart-out thresholds for gesture recognition.
    const MIN_PATH_POINTS = 12;
    const RDP_EPSILON = 26;             // px — how aggressively we simplify the stroke
    const CLOSURE_PX = 160;             // start/end must be within this to count as closed
    const MIN_TRI_AREA = 2800;          // px² — reject dinky triangles
    const MAX_STROKE_MS = 5000;         // ignore strokes longer than this (probably not a gesture)

    // Allow the egg to fire repeatedly by default; flip to `?egg=once` in the URL
    // to opt back into one-shot behavior for production.
    const qs = new URLSearchParams(location.search);
    const FIRE_ONCE = qs.get("egg") === "once";
    const DEBUG = qs.get("egg") === "debug";
    function dbg(...a) { if (DEBUG) console.log("[egg]", ...a); }

    let fired = false;

    // ---------- spark particles ----------

    function startSparks() {
        const cv = document.createElement("canvas");
        cv.className = "egg-spark-layer";
        Object.assign(cv.style, {
            position: "fixed", inset: "0", pointerEvents: "none", zIndex: "2147483640",
        });
        document.body.appendChild(cv);
        const ctx = cv.getContext("2d");

        let W = 0, H = 0;
        function resize() {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            W = window.innerWidth; H = window.innerHeight;
            cv.width = W * dpr; cv.height = H * dpr;
            cv.style.width = W + "px"; cv.style.height = H + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener("resize", resize);

        const particles = [];
        function emit(x, y, boost = 1) {
            const n = 3 + ((Math.random() * 3) | 0);
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const speed = (0.6 + Math.random() * 2.2) * boost;
                particles.push({
                    x, y,
                    vx: Math.cos(a) * speed,
                    vy: Math.sin(a) * speed - 0.6,  // slight upward bias
                    life: 1,
                    decay: 0.02 + Math.random() * 0.03,
                    size: 1 + Math.random() * 2,
                    hue: 0, sat: 0,  // white; kept as hsla so alpha fades cleanly
                });
            }
        }

        let running = true;
        function tick() {
            if (!running) return;
            // trail effect: slight fade instead of full clear
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = "lighter";
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.life -= p.decay;
                if (p.life <= 0) { particles.splice(i, 1); continue; }
                const a = Math.max(0, p.life);
                ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 100%, ${a})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.6), 0, Math.PI * 2);
                ctx.fill();
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        return {
            emit,
            burst(x, y) { for (let i = 0; i < 40; i++) emit(x, y, 2.2); },
            destroy() {
                running = false;
                cv.remove();
                window.removeEventListener("resize", resize);
            },
        };
    }

    // ---------- stroke capture + triangle detection ----------

    function perpDist(p, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
        const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / d2;
        const px = a.x + t * dx, py = a.y + t * dy;
        return Math.hypot(p.x - px, p.y - py);
    }

    function rdp(points, eps) {
        if (points.length < 3) return points.slice();
        let maxD = 0, idx = 0;
        const end = points.length - 1;
        for (let i = 1; i < end; i++) {
            const d = perpDist(points[i], points[0], points[end]);
            if (d > maxD) { maxD = d; idx = i; }
        }
        if (maxD > eps) {
            const left = rdp(points.slice(0, idx + 1), eps);
            const right = rdp(points.slice(idx), eps);
            return left.slice(0, -1).concat(right);
        }
        return [points[0], points[end]];
    }

    function triArea(a, b, c) {
        return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
    }

    function analyzeStroke(path) {
        if (path.length < MIN_PATH_POINTS) { dbg("reject: too few points", path.length); return null; }
        const duration = path[path.length - 1].t - path[0].t;
        if (duration > MAX_STROKE_MS) { dbg("reject: too slow", duration); return null; }

        const startEnd = Math.hypot(path[0].x - path[path.length - 1].x, path[0].y - path[path.length - 1].y);
        if (startEnd > CLOSURE_PX) { dbg("reject: not closed", startEnd.toFixed(0)); return null; }

        const simplified = rdp(path, RDP_EPSILON);
        dbg("simplified to", simplified.length, "points");
        // A closed triangle should simplify to ~4 vertices (first corner, two more, return-to-first).
        if (simplified.length < 4 || simplified.length > 9) { dbg("reject: odd vertex count", simplified.length); return null; }

        // Candidate vertices = all simplified points except the final (which is ~= first).
        const candidates = simplified.slice(0, -1);
        if (candidates.length < 3) { dbg("reject: <3 candidates"); return null; }

        // Pick the 3 points that maximize enclosed area — robust against a wobbly segment
        // that RDP kept as an extra vertex.
        let bestArea = 0, best = null;
        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                for (let k = j + 1; k < candidates.length; k++) {
                    const a = triArea(candidates[i], candidates[j], candidates[k]);
                    if (a > bestArea) { bestArea = a; best = [candidates[i], candidates[j], candidates[k]]; }
                }
            }
        }
        if (!best || bestArea < MIN_TRI_AREA) { dbg("reject: area too small", bestArea|0); return null; }
        dbg("accept triangle area", bestArea|0);

        // Orient consistently (counter-clockwise) so angle math downstream is stable.
        const [A, B, C] = best;
        const signed = (B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y);
        const pts = signed > 0 ? [A, B, C] : [A, C, B];
        return pts.map(p => [p.x, p.y]);
    }

    // ---------- shatter playback ----------

    let currentDismiss = null;

    function playShatter(triangle) {
        const viewport = { w: window.innerWidth, h: window.innerHeight };

        // Container stacks: page body -> iframe -> shatter canvas -> (removed when done).
        const stage = document.createElement("div");
        stage.className = "egg-stage";
        Object.assign(stage.style, {
            position: "fixed", inset: "0", zIndex: "2147483630", pointerEvents: "none",
        });
        document.body.appendChild(stage);

        // Tiny hint so users know how to get back out. Clickable because ESC
        // keydowns don't cross iframe boundaries once the game takes focus.
        const hint = document.createElement("button");
        hint.type = "button";
        hint.className = "egg-hint";
        hint.textContent = "✕ exit";
        stage.appendChild(hint);

        // Game iframe in the back.
        const iframe = document.createElement("iframe");
        iframe.src = PUFFACLES_URL;
        iframe.title = "puffacles";
        iframe.allow = "fullscreen; gamepad; autoplay; accelerometer; gyroscope";
        Object.assign(iframe.style, {
            position: "absolute", inset: "0", width: "100%", height: "100%",
            border: "0", background: "#000", opacity: "0",
            transition: "opacity 900ms ease-out",
        });
        stage.appendChild(iframe);

        // Shatter canvas on top.
        const cv = document.createElement("canvas");
        Object.assign(cv.style, {
            position: "absolute", inset: "0", width: "100%", height: "100%",
            pointerEvents: "none",
        });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = viewport.w * dpr; cv.height = viewport.h * dpr;
        const ctx = cv.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stage.appendChild(cv);

        // Page content behind fades out in time with the shatter. Slight delay so the
        // first cracks appear while the site is still visible underneath.
        setTimeout(() => document.body.classList.add("egg-shattering"), 260);

        const plan = window.Fracture.planFracture(triangle, viewport, window.Fracture.DEFAULT_PARAMS);

        // Sample the starfield/background hue to tint shards so they feel like
        // pieces of the site rather than pure black.
        const theme = {
            shardColor: "rgba(6, 10, 18, 0.96)",
            crackColor: "rgba(255, 225, 150, 1)",
            crackGlow: "rgba(255, 190, 80, 0.55)",
        };

        // Kick the iframe to fade in once cracks start propagating.
        setTimeout(() => { iframe.style.opacity = "1"; }, Math.max(0, plan.network.totalMs * 0.4));
        // Hand the game input at roughly the same time shards are done flying.
        const handoffAt = plan.totalMs + 120;

        const start = performance.now();
        function frame(now) {
            const t = now - start;
            const still = window.Fracture.renderFrame(ctx, plan, t, theme);
            if (still) {
                requestAnimationFrame(frame);
            } else {
                // Fade the shatter canvas out cleanly, then give iframe full input.
                cv.style.transition = "opacity 250ms ease-out";
                cv.style.opacity = "0";
                setTimeout(() => {
                    stage.style.pointerEvents = "auto";
                    iframe.style.pointerEvents = "auto";
                    cv.remove();
                }, 260);
            }
        }
        requestAnimationFrame(frame);

        // Safety net.
        setTimeout(() => {
            stage.style.pointerEvents = "auto";
            iframe.style.pointerEvents = "auto";
        }, handoffAt);

        // Exit path: ESC anywhere (iframe can't eat keydowns when focus is on parent,
        // but game input often grabs focus — we also listen on window with capture so
        // the host page gets first shot).
        let dismissed = false;
        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            currentDismiss = null;
            window.removeEventListener("keydown", onKey, true);
            iframe.style.transition = "opacity 450ms ease-out";
            iframe.style.opacity = "0";
            stage.style.pointerEvents = "none";
            document.body.classList.remove("egg-shattering");
            setTimeout(() => {
                stage.remove();
                fired = false;
            }, 600);
        }
        function onKey(ev) {
            if (ev.key === "Escape") { ev.preventDefault(); dismiss(); }
        }
        function onMsg(ev) {
            const d = ev.data;
            if (d === "puffacles:exit" || (d && d.type === "puffacles:exit")) dismiss();
        }
        window.addEventListener("keydown", onKey, true);
        window.addEventListener("message", onMsg);
        hint.addEventListener("click", (ev) => { ev.stopPropagation(); dismiss(); });
        currentDismiss = dismiss;
    }

    // ---------- orchestration ----------

    function init() {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (!window.Fracture) { console.warn("[egg] fracture.js missing"); return; }

        const sparks = startSparks();

        let path = null;
        let pointerId = null;

        function shouldIgnoreTarget(t) {
            // Don't hijack interactions on actual foreground controls.
            if (!t || !t.closest) return false;
            return !!t.closest('a[href], button, input, textarea, select, label, [role="button"], .poem-overlay');
        }

        function onDown(ev) {
            if (fired) return;
            if (ev.pointerType === "mouse" && ev.button !== 0) return;
            if (shouldIgnoreTarget(ev.target)) return;
            pointerId = ev.pointerId;
            path = [{ x: ev.clientX, y: ev.clientY, t: performance.now() }];
            document.body.classList.add("egg-capturing");
            sparks.emit(ev.clientX, ev.clientY, 1.2);
        }
        function onMove(ev) {
            if (!path || ev.pointerId !== pointerId) return;
            const last = path[path.length - 1];
            const dx = ev.clientX - last.x, dy = ev.clientY - last.y;
            if (dx * dx + dy * dy < 9) return;  // sub-3px moves get squashed
            path.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
            sparks.emit(ev.clientX, ev.clientY);
        }
        function onUp(ev) {
            if (!path || ev.pointerId !== pointerId) return;
            const finished = path;
            path = null; pointerId = null;
            document.body.classList.remove("egg-capturing");
            const triangle = analyzeStroke(finished);
            if (!triangle) return;
            if (FIRE_ONCE) fired = true;

            // Swallow the follow-up click so existing handlers (rain-phone poem,
            // nav links underneath the release point) don't fire alongside us.
            const eatClick = (c) => { c.stopPropagation(); c.preventDefault(); };
            window.addEventListener("click", eatClick, { capture: true, once: true });
            setTimeout(() => window.removeEventListener("click", eatClick, { capture: true }), 400);

            // Celebratory bursts at each corner before the shatter hits.
            for (const [x, y] of triangle) sparks.burst(x, y);
            setTimeout(() => {
                playShatter(triangle);
                // Kill the spark layer once the shatter takes over.
                setTimeout(() => sparks.destroy(), 400);
            }, 80);
        }
        function onCancel(ev) {
            if (!path || ev.pointerId !== pointerId) return;
            path = null; pointerId = null;
            document.body.classList.remove("egg-capturing");
        }

        window.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onCancel);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
