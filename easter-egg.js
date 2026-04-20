// Easter eggs + in-iframe launcher:
//  - long-press anywhere → puffacles (via the fracture shatter animation)
//  - fast triple-tap anywhere → tetris (same shatter, centered on the 3rd tap)
//  - clicking a portavec link → portavec in-iframe with a back button
// All three mount into the same full-screen iframe overlay with a bottom-right
// exit button. Depends on fracture.js for the shatter math + rendering.
(function () {
    "use strict";

    const PUFFACLES_URL = "https://wabbazzar.com/puffacles/?bg=wabbazzar";
    const TETRIS_URL = "https://wabbazzar.com/tetris/";
    const PORTAVEC_HREF_RE = /^https?:\/\/(?:www\.)?wabbazzar\.com\/portavec\/?(?:[?#]|$)/;

    // Long-press timing.
    const HOLD_SPARK_MS = 1000;   // silent charge-up before sparks appear
    const HOLD_FIRE_MS = 2000;    // total hold time until shatter fires
    const CANCEL_MOVE_PX = 24;    // jitter tolerance — moving farther cancels (user is scrolling)
    const VIRTUAL_TRI_RADIUS = 70; // half-size of the synthetic triangle centered on the touch

    // Triple-tap timing.
    const TAP_MAX_DURATION_MS = 280;  // pointerdown→pointerup longer than this isn't a tap
    const TAP_MAX_MOVE_PX = 12;       // max movement while pressed to still count as a tap
    const TRIPLE_TAP_WINDOW_MS = 600; // all 3 taps must land within this window
    const TRIPLE_TAP_MAX_SPREAD_PX = 90; // all 3 taps must be within this radius of the first

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

    // ---------- virtual triangle from a single point ----------

    // Synthesize an equilateral triangle centered on (x, y). The fracture math
    // takes a triangle; for a long-press we fabricate a small one so cracks
    // radiate with 3-fold symmetry from the touch point.
    function triangleAround(x, y, radius) {
        const pts = [];
        for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + i * (2 * Math.PI / 3);
            pts.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
        }
        return pts;
    }

    // ---------- shatter playback ----------

    let currentDismiss = null;
    let stageOpen = false;

    // Opens `url` in a full-screen iframe over the page. If `triangle` is
    // provided, plays the fracture shatter animation on the way in. Otherwise
    // simply cross-fades the iframe up. In both cases, installs ESC /
    // postMessage('<label>:exit') / bottom-right button dismissal.
    //
    // opts:
    //   title     — iframe title attribute (also used for the exit postMessage key)
    //   triangle  — [[x,y],[x,y],[x,y]] to drive the shatter; omit for plain fade
    //   exitKey   — postMessage key from iframe that triggers dismiss (default: `${title}:exit`)
    function openInIframe(url, opts) {
        opts = opts || {};
        if (stageOpen) return; // guard against double-launch
        stageOpen = true;

        const title = opts.title || "launcher";
        const triangle = opts.triangle || null;
        const exitKey = opts.exitKey || (title + ":exit");
        const withShatter = !!triangle;
        const viewport = { w: window.innerWidth, h: window.innerHeight };

        // Container stacks: page body -> iframe -> (optional shatter canvas).
        const stage = document.createElement("div");
        stage.className = "egg-stage";
        Object.assign(stage.style, {
            position: "fixed", inset: "0", zIndex: "2147483630", pointerEvents: "none",
        });
        document.body.appendChild(stage);

        // Bottom-right exit button (clickable because ESC keydowns don't cross
        // iframe boundaries once the game takes focus).
        const hint = document.createElement("button");
        hint.type = "button";
        hint.className = "egg-hint";
        hint.textContent = "✕ exit";
        stage.appendChild(hint);

        // Target iframe in the back.
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.title = title;
        iframe.allow = "fullscreen; gamepad; autoplay; accelerometer; gyroscope";
        Object.assign(iframe.style, {
            position: "absolute", inset: "0", width: "100%", height: "100%",
            border: "0", background: "#000", opacity: "0",
            transition: "opacity 900ms ease-out",
        });
        stage.appendChild(iframe);

        if (withShatter) {
            // Shatter canvas on top of the iframe.
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

            // Page content behind fades out in time with the shatter.
            setTimeout(() => document.body.classList.add("egg-shattering"), 260);

            const plan = window.Fracture.planFracture(triangle, viewport, window.Fracture.DEFAULT_PARAMS);
            const theme = {
                shardColor: "rgba(6, 10, 18, 0.96)",
                crackColor: "rgba(255, 225, 150, 1)",
                crackGlow: "rgba(255, 190, 80, 0.55)",
            };

            // Iframe fades in as cracks propagate; input hands off as shards finish.
            setTimeout(() => { iframe.style.opacity = "1"; }, Math.max(0, plan.network.totalMs * 0.4));
            const handoffAt = plan.totalMs + 120;

            const start = performance.now();
            function frame(now) {
                const t = now - start;
                const still = window.Fracture.renderFrame(ctx, plan, t, theme);
                if (still) {
                    requestAnimationFrame(frame);
                } else {
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
            setTimeout(() => {
                stage.style.pointerEvents = "auto";
                iframe.style.pointerEvents = "auto";
            }, handoffAt);
        } else {
            // Simple cross-fade: no shatter, just pull the iframe up over the page.
            document.body.classList.add("egg-shattering");
            requestAnimationFrame(() => { iframe.style.opacity = "1"; });
            setTimeout(() => {
                stage.style.pointerEvents = "auto";
                iframe.style.pointerEvents = "auto";
            }, 900);
        }

        // Dismissal: ESC when parent has focus, postMessage from the iframe,
        // or the visible exit button (works regardless of focus).
        let dismissed = false;
        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            currentDismiss = null;
            window.removeEventListener("keydown", onKey, true);
            window.removeEventListener("message", onMsg);
            iframe.style.transition = "opacity 450ms ease-out";
            iframe.style.opacity = "0";
            stage.style.pointerEvents = "none";
            document.body.classList.remove("egg-shattering");
            setTimeout(() => {
                stage.remove();
                fired = false;
                stageOpen = false;
            }, 600);
        }
        function onKey(ev) {
            if (ev.key === "Escape") { ev.preventDefault(); dismiss(); }
        }
        function onMsg(ev) {
            const d = ev.data;
            if (d === exitKey || (d && d.type === exitKey)) dismiss();
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

        let hold = null;          // long-press state
        let suppressScroll = false;
        let tapHistory = [];      // ring buffer of recent clean taps (triple-tap detection)

        function shouldIgnoreTarget(t) {
            // Don't hijack interactions on actual foreground controls.
            if (!t || !t.closest) return false;
            return !!t.closest('a[href], button, input, textarea, select, label, [role="button"], .poem-overlay');
        }

        function cancelHold(reason) {
            if (!hold) return;
            clearTimeout(hold.sparkTimer);
            clearInterval(hold.emitInterval);
            clearTimeout(hold.fireTimer);
            hold = null;
            suppressScroll = false;
            document.body.classList.remove("egg-arming");
            document.body.classList.remove("egg-capturing");
            dbg("hold cancelled:", reason);
        }

        function fireShatter(cx, cy, url, title) {
            const triangle = triangleAround(cx, cy, VIRTUAL_TRI_RADIUS);
            if (FIRE_ONCE) fired = true;

            // Swallow the follow-up click so existing handlers (rain-phone poem,
            // nav links underneath the release point) don't fire alongside us.
            const eatClick = (c) => { c.stopPropagation(); c.preventDefault(); };
            window.addEventListener("click", eatClick, { capture: true, once: true });
            setTimeout(() => window.removeEventListener("click", eatClick, { capture: true }), 400);

            for (const [bx, by] of triangle) sparks.burst(bx, by);
            setTimeout(() => {
                openInIframe(url, { triangle, title });
                setTimeout(() => sparks.destroy(), 400);
            }, 80);
        }

        function registerTap(x, y) {
            const now = performance.now();
            tapHistory = tapHistory.filter(t => now - t.t < TRIPLE_TAP_WINDOW_MS);
            tapHistory.push({ t: now, x, y });
            if (tapHistory.length < 3) return;
            const first = tapHistory[0];
            let maxSpread = 0;
            for (const t of tapHistory) {
                const d = Math.hypot(t.x - first.x, t.y - first.y);
                if (d > maxSpread) maxSpread = d;
            }
            if (maxSpread > TRIPLE_TAP_MAX_SPREAD_PX) return;
            // Triple-tap confirmed — consume the history so the 4th tap doesn't re-fire.
            tapHistory = [];
            dbg("triple-tap → tetris", { x, y });
            fireShatter(x, y, TETRIS_URL, "tetris");
        }

        function onDown(ev) {
            if (fired || hold || stageOpen) return;
            if (ev.pointerType === "mouse" && ev.button !== 0) return;
            if (shouldIgnoreTarget(ev.target)) return;

            const x = ev.clientX, y = ev.clientY;
            hold = {
                x, y,
                pointerId: ev.pointerId,
                startedAt: performance.now(),
                sparkTimer: 0,
                emitInterval: 0,
                fireTimer: 0,
                sawSparks: false,
                maxMoved: 0,
            };
            // Arm immediately so iOS Safari's long-press callout never appears.
            document.body.classList.add("egg-arming");
            dbg("hold start", { x, y });

            hold.sparkTimer = setTimeout(() => {
                if (!hold) return;
                hold.sawSparks = true;
                document.body.classList.add("egg-capturing");
                suppressScroll = true;
                hold.emitInterval = setInterval(() => {
                    if (!hold) return;
                    const elapsed = performance.now() - hold.startedAt;
                    const charge = Math.min(1, (elapsed - HOLD_SPARK_MS) / (HOLD_FIRE_MS - HOLD_SPARK_MS));
                    sparks.emit(hold.x, hold.y, 0.7 + charge * 2.0);
                }, 40);
            }, HOLD_SPARK_MS);

            hold.fireTimer = setTimeout(() => {
                if (!hold) return;
                const { x: fx, y: fy } = hold;
                cancelHold("fire");
                fireShatter(fx, fy, PUFFACLES_URL, "puffacles");
            }, HOLD_FIRE_MS);
        }

        function onMove(ev) {
            if (!hold || ev.pointerId !== hold.pointerId) return;
            const dx = ev.clientX - hold.x, dy = ev.clientY - hold.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > hold.maxMoved) hold.maxMoved = d2;
            if (d2 > CANCEL_MOVE_PX * CANCEL_MOVE_PX) {
                cancelHold("moved");
            }
        }

        function onUp(ev) {
            if (!hold || ev.pointerId !== hold.pointerId) return;
            // If the release came fast and clean (no sparks yet, minimal move),
            // count it as a tap for triple-tap detection.
            const duration = performance.now() - hold.startedAt;
            const moved = Math.sqrt(hold.maxMoved);
            const tapX = hold.x, tapY = hold.y;
            const cleanTap = !hold.sawSparks && duration < TAP_MAX_DURATION_MS && moved < TAP_MAX_MOVE_PX;
            cancelHold("released");
            if (cleanTap && !shouldIgnoreTarget(ev.target)) registerTap(tapX, tapY);
        }

        function onCancel(ev) {
            if (!hold || ev.pointerId !== hold.pointerId) return;
            cancelHold("pointercancel");
        }

        // iOS Safari shows a callout menu on long-press; kill it while charging.
        function onContextMenu(ev) {
            if (suppressScroll) ev.preventDefault();
        }

        // Intercept portavec links so they open in the same iframe overlay as
        // the easter-egg targets (with the bottom-right exit button). Only
        // hijack plain left-clicks — middle-click / cmd+click still opens a
        // new tab like any other link.
        function onAnchorClick(ev) {
            if (ev.defaultPrevented) return;
            if (ev.button !== 0) return;
            if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
            const a = ev.target && ev.target.closest && ev.target.closest("a[href]");
            if (!a) return;
            if (!PORTAVEC_HREF_RE.test(a.href)) return;
            ev.preventDefault();
            openInIframe(a.href, { title: "portavec" });
        }

        window.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onCancel);
        window.addEventListener("contextmenu", onContextMenu);
        document.addEventListener("click", onAnchorClick, true);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
