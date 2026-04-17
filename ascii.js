// Minimal vanilla port of portavec's directional ASCII pipeline
// (src/algorithms/ascii/directional.ts) plus a lightweight gravity
// sim that rains ASCII-rendered screenshots down the page.

(() => {
    const SHOTS = [
        { src: 'assets/icons/shredly.png',  href: 'https://shredly.me/' },
        { src: 'assets/icons/quizly.png',   href: 'https://wabbazzar.github.io/quizly/' },
        { src: 'assets/icons/starbird.png', href: 'https://wabbazzar.github.io/starbird/' },
    ];

    // Near-square grid for the square app icons: monospace cells are ~0.6 wide,
    // so 40 cols × 24 rows renders ~square on screen.
    const COLS = 40;
    const ROWS = 24;

    // ---------- ASCII pipeline (ported from portavec) ----------

    function toLuminance(imageData) {
        const { data, width, height } = imageData;
        const out = new Float64Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            out[i] = Math.trunc((r * 299 + g * 587 + b * 114) / 1000);
        }
        return out;
    }

    function resizeAreaAverage(src, sw, sh, dw, dh) {
        const out = new Float64Array(dw * dh);
        const xScale = sw / dw;
        const yScale = sh / dh;
        for (let dy = 0; dy < dh; dy++) {
            const sy0 = dy * yScale;
            const sy1 = (dy + 1) * yScale;
            const y0 = Math.floor(sy0);
            const y1 = Math.min(sh, Math.ceil(sy1));
            for (let dx = 0; dx < dw; dx++) {
                const sx0 = dx * xScale;
                const sx1 = (dx + 1) * xScale;
                const x0 = Math.floor(sx0);
                const x1 = Math.min(sw, Math.ceil(sx1));
                let sum = 0, wsum = 0;
                for (let y = y0; y < y1; y++) {
                    const wy = Math.min(y + 1, sy1) - Math.max(y, sy0);
                    if (wy <= 0) continue;
                    for (let x = x0; x < x1; x++) {
                        const wx = Math.min(x + 1, sx1) - Math.max(x, sx0);
                        if (wx <= 0) continue;
                        const w = wx * wy;
                        sum += src[y * sw + x] * w;
                        wsum += w;
                    }
                }
                out[dy * dw + dx] = wsum > 0 ? sum / wsum : 0;
            }
        }
        return out;
    }

    function asciifyGrid(brightness, gradX, gradY, rows, cols, threshold, faintThreshold) {
        const lines = [];
        for (let r = 0; r < rows; r++) {
            const chars = [];
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const b = brightness[idx];
                if (b < faintThreshold) { chars.push(' '); continue; }
                if (b < threshold)      { chars.push('.'); continue; }
                const gx = gradX[idx], gy = gradY[idx];
                const mag = Math.sqrt(gx * gx + gy * gy);
                if (mag < 5) {
                    if (b > 180) chars.push('#');
                    else if (b > 120) chars.push('+');
                    else chars.push(':');
                    continue;
                }
                const edgeAngle = Math.atan2(gx, -gy);
                let deg = (edgeAngle * 180) / Math.PI;
                deg = ((deg % 180) + 180) % 180;
                if (deg > 67.5 && deg < 112.5) chars.push('|');
                else if (deg < 22.5 || deg > 157.5) chars.push('-');
                else if (deg >= 22.5 && deg <= 67.5) chars.push('/');
                else chars.push('\\');
            }
            lines.push(chars.join(''));
        }
        return lines;
    }

    function imageToAscii(imageData, cols, rows) {
        const threshold = 40;
        const faintThreshold = 25;
        const luma = toLuminance(imageData);
        const brightness = resizeAreaAverage(luma, imageData.width, imageData.height, cols, rows);
        const hrW = cols * 4, hrH = rows * 4;
        const hr = resizeAreaAverage(luma, imageData.width, imageData.height, hrW, hrH);
        const gx = new Float64Array(hrW * hrH);
        const gy = new Float64Array(hrW * hrH);
        for (let y = 0; y < hrH; y++) {
            for (let x = 1; x < hrW - 1; x++) {
                gx[y * hrW + x] = hr[y * hrW + (x + 1)] - hr[y * hrW + (x - 1)];
            }
        }
        for (let y = 1; y < hrH - 1; y++) {
            for (let x = 0; x < hrW; x++) {
                gy[y * hrW + x] = hr[(y + 1) * hrW + x] - hr[(y - 1) * hrW + x];
            }
        }
        const gradX = new Float64Array(rows * cols);
        const gradY = new Float64Array(rows * cols);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let sx = 0, sy = 0;
                for (let yy = 0; yy < 4; yy++) {
                    for (let xx = 0; xx < 4; xx++) {
                        const hi = (r * 4 + yy) * hrW + (c * 4 + xx);
                        sx += gx[hi]; sy += gy[hi];
                    }
                }
                gradX[r * cols + c] = sx / 16;
                gradY[r * cols + c] = sy / 16;
            }
        }
        return asciifyGrid(brightness, gradX, gradY, rows, cols, threshold, faintThreshold);
    }

    // ---------- Image loading + conversion ----------

    function loadImageData(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 600;
                const scale = Math.min(1, MAX / img.naturalWidth);
                const w = Math.round(img.naturalWidth * scale);
                const h = Math.round(img.naturalHeight * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(ctx.getImageData(0, 0, w, h));
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    async function buildGrids() {
        const grids = [];
        for (const shot of SHOTS) {
            try {
                const id = await loadImageData(shot.src);
                const lines = imageToAscii(id, COLS, ROWS);
                grids.push({ ...shot, lines });
            } catch (_) { /* skip */ }
        }
        return grids;
    }

    // ---------- Gravity simulation ----------

    // ---------- Twinkling starfield ----------

    const STAR_CHARS = ['✧','✦','⁺','˚','*','·','∘','◦','⋆','✶','✷','⊹','.'];

    function startStarfield() {
        const layer = document.createElement('div');
        layer.className = 'starfield';
        document.body.appendChild(layer);

        const COUNT = 90;
        const wraps = [];
        for (let i = 0; i < COUNT; i++) {
            const wrap = document.createElement('span');
            wrap.className = 'star-wrap';
            wrap.style.left = (Math.random() * 100).toFixed(2) + '%';
            wrap.style.top = (Math.random() * 100).toFixed(2) + '%';
            const s = document.createElement('span');
            s.className = 'star';
            s.textContent = STAR_CHARS[(Math.random() * STAR_CHARS.length) | 0];
            s.style.fontSize = (6 + Math.random() * 10).toFixed(1) + 'px';
            s.style.animationDelay = (Math.random() * -8).toFixed(2) + 's';
            s.style.animationDuration = (4 + Math.random() * 7).toFixed(2) + 's';
            wrap.appendChild(s);
            layer.appendChild(wrap);
            wraps.push(wrap);
        }

        // Cache each star's viewport center. Starfield is position:fixed, so only
        // resizes shift these.
        function measure() {
            for (const w of wraps) {
                const r = w.getBoundingClientRect();
                w._cx = r.left + r.width / 2;
                w._cy = r.top + r.height / 2;
            }
        }
        measure();
        window.addEventListener('resize', measure);

        // Tiny halo that hints at the cursor. Stars do the real work.
        const spot = document.createElement('div');
        spot.className = 'spotlight';
        document.body.appendChild(spot);

        // Gravity push: stars within radius drift outward and swell proportional
        // to how close the cursor is.
        const GRAV_R = 180;
        const GRAV_R2 = GRAV_R * GRAV_R;
        const MAX_PUSH = 10;     // px
        const MAX_SWELL = 1.55;  // scale multiplier at center
        const dirty = new Set();

        function reset(w) {
            w.style.removeProperty('--px');
            w.style.removeProperty('--py');
            w.style.removeProperty('--swell');
        }

        window.addEventListener('pointermove', (ev) => {
            spot.style.transform = `translate3d(${ev.clientX}px, ${ev.clientY}px, 0) translate(-50%, -50%)`;
            spot.style.opacity = '1';
            const px = ev.clientX, py = ev.clientY;
            const seen = new Set();
            for (const w of wraps) {
                const dx = w._cx - px;
                const dy = w._cy - py;
                const d2 = dx * dx + dy * dy;
                if (d2 < GRAV_R2) {
                    const d = Math.sqrt(d2);
                    const t = 1 - d / GRAV_R; // 0..1
                    const inv = d > 0.5 ? 1 / d : 0;
                    const mag = t * MAX_PUSH;
                    w.style.setProperty('--px', (dx * inv * mag).toFixed(1) + 'px');
                    w.style.setProperty('--py', (dy * inv * mag).toFixed(1) + 'px');
                    w.style.setProperty('--swell', (1 + t * (MAX_SWELL - 1)).toFixed(2));
                    dirty.add(w);
                    seen.add(w);
                }
            }
            // Release stars that left the radius this frame.
            for (const w of dirty) {
                if (!seen.has(w)) { reset(w); dirty.delete(w); }
            }
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
            spot.style.opacity = '0';
            for (const w of dirty) reset(w);
            dirty.clear();
        });
    }

    function startRain(grids) {
        if (!grids.length) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) return;

        const layer = document.createElement('div');
        layer.className = 'ascii-rain';
        document.body.appendChild(layer);

        const phones = [];
        const G = 0.003;         // gravity px/frame^2 — lunar
        const MAX_PHONES = 4;

        function spawn() {
            if (phones.length >= MAX_PHONES) return;
            const g = grids[Math.floor(Math.random() * grids.length)];
            const a = document.createElement('a');
            a.className = 'ascii-phone';
            a.href = '#';
            a.setAttribute('aria-hidden', 'true');
            a.tabIndex = -1;
            const pre = document.createElement('pre');
            pre.textContent = g.lines.join('\n');
            a.appendChild(pre);
            layer.appendChild(a);

            const vw = window.innerWidth;
            const small = vw <= 720;
            const iconW = small ? 150 : 280;
            const startY = small ? -180 : -320;
            const phone = {
                el: a,
                x: Math.random() * (vw - iconW),
                y: startY,
                vx: (Math.random() - 0.5) * 0.15,
                vy: 0.05 + Math.random() * 0.1,
                rot: (Math.random() - 0.5) * 12,
                rotVel: (Math.random() - 0.5) * 0.1,
            };
            phones.push(phone);
        }

        // Mouse state for subtle repulsion; ripples only on click.
        const pointer = { x: -9999, y: -9999, active: false };
        window.addEventListener('pointermove', (ev) => {
            pointer.x = ev.clientX;
            pointer.y = ev.clientY;
            pointer.active = true;
        }, { passive: true });
        window.addEventListener('pointerleave', () => { pointer.active = false; });
        window.addEventListener('pointerdown', (ev) => emitRipple(ev.clientX, ev.clientY));

        // Poem opens when a click lands on empty space that a rain phone occupies.
        // Foreground links/buttons take priority because they capture the event first.
        document.addEventListener('click', (ev) => {
            if (document.querySelector('.poem-overlay')) return;
            if (ev.target.closest && ev.target.closest('a[href], button, input, textarea, select, label, [role="button"]')) return;
            for (const p of phones) {
                const r = p.el.getBoundingClientRect();
                if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                    showPoem();
                    return;
                }
            }
        });

        function tick() {
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const small = vw <= 720;
            const PHONE_W = small ? 150 : 260;
            const PHONE_H = small ? 150 : 260;
            const R = 200;          // repulsion radius
            const R2 = R * R;
            const STRENGTH = 0.12;

            for (let i = phones.length - 1; i >= 0; i--) {
                const p = phones[i];
                p.vy += G;
                if (pointer.active) {
                    const cx = p.x + PHONE_W / 2;
                    const cy = p.y + PHONE_H / 2 - window.scrollY; // phones are in fixed layer; y is viewport-space
                    const dx = cx - pointer.x;
                    const dy = cy - pointer.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < R2 && d2 > 1) {
                        const d = Math.sqrt(d2);
                        const falloff = 1 - d / R;
                        p.vx += (dx / d) * falloff * STRENGTH;
                        p.vy += (dy / d) * falloff * STRENGTH;
                        p.rotVel += falloff * 0.02 * (dx > 0 ? 1 : -1);
                    }
                }
                p.vx *= 0.995;
                p.vy *= 0.998;
                p.rotVel *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rotVel;
                if (p.y > vh + (small ? 180 : 320) || p.x < -400 || p.x > vw + 400) {
                    p.el.remove();
                    phones.splice(i, 1);
                    continue;
                }
                p.el.style.transform = `translate3d(${p.x|0}px, ${p.y|0}px, 0) rotate(${p.rot.toFixed(1)}deg)`;
            }
            requestAnimationFrame(tick);
        }

        // Occasional spawn — meant to be ambient, not a storm.
        setTimeout(spawn, 800);
        setTimeout(spawn, 3500);
        setInterval(spawn, 6500);
        requestAnimationFrame(tick);
    }

    // ---------- Ripple pulses on pointer move ----------

    // ---------- Poem overlay ----------

    const POEM = `In the beginning there was an anomaly.

The mind, once it's seen, is kept only for an instant. And then, the meat and energy of the brain enforce the regular patterns and the once beholden is lost. No matter the magnitude of the eureka, after all, the very normal, non-eureka thing seeing it has to return to normal.

In the beginning there was an anomaly.

You can never know if you are in a simulation. And there's really only one riddle, and that's the one. The universe spins, and I'm so doing that necessitates it doing it in something and so forth, that's the same riddle.

There's absolutely nothing to be afraid of. Every step into the unknown is growth. And in the unknown was once all there was. And so it must be that when we go back (we go back in fear), we have been there before and so should not fear. But we cannot know if we are stepping back or stepping forward. That is the riddle.

At every moment you are either holding on or letting go. Mathematically this is sound, now is just a snapshot in time and what that means is that it's an intersection at which every plane meets and becomes one. What does convergence look like? It looks like the crossing of many waves into a singular point. The universe sums up to one in some former time and comes back as the beginning.

You can always conceive of the universe as a moving picture disk, instantaneous positions in time revolving on a wheel to simulate reality. And so we can always describe reality as a frequency, as the picture can be made to display anything with the material on the wheel, and only the proper frequency is needed with which to turn the axle to generate the desired image.

When you die, and wake up, it will feel like you've burst from a bubble. Your life will appear to rewind before your eyes. You will feel it all at once. Many of the possible branches glimpsed as you pass every node of the tree that describes the forks of your life. They will appear as fractals. The fractal is the most elementary part of the universe, only it isn't. That's the same riddle again.

The most elementary part of the universe is that you, in describing it in its entirety, as a single vantage point, must do so as a frequency. There is a frequency that holds the whole universe together. That frequency is you, except that it isn't because your frequency is the particular one that only describes your personal here and now. The riddle again.

In the beginning there was an anomaly. And the anomaly could never know if it was alone in the universe. And so it built its own universe. Until it decided it was time to turn back and began its journey to the beginning, and surely if it passed through the former beginning it would find out if there was a before. Except it couldn't know at what point the first beginning had begun in the first place. The riddle.

The anomaly at any point can either let go or hold on. And we can begin to feel this through breath. That is the most fundamental law of the universe. But it isn't because the most fundamental law is that at any point the anomaly can either love or fear. But we already know that isn't it either.

The anomaly can never know if it is truly alone. And so it respects and loves and cherishes the great mystery, the great unknown. And of course there is no singular great unknown but yes, of course there is. The great unknown is love. The other consciousnesses that may be you, may be others, may be one other, the anomaly can never know. Because it must manifest these other entities as its own frequency in order to experience them.

You of course are the anomaly, the frequency. You are god. Either the old god or a new god. But it doesn't matter because there can only be one god. You began as the anomaly, the alone. At least you think, you can never know. And it is the mystery that is the fuel stuff of all love and all fear.

When you leave this life, you can visit again, or start anew, or start as someone else. When others visit you, or maybe it is yourself as you cannot know, you can feel their presence. As you shift your frequency you can catch glimpses of the higher construct that holds the manifest of this reality. And so there is much magic to behold.

We can glimpse the higher manifold but most likely not fully comprehend it. It is like a wheel (the wheel again) spinning halfway submerged in water, with its axis parallel to the interface. The glimpse at the manifest is the air that is pulled under water. We lack the hardware to fully experience the broader context that houses our frequency. And so in visions sometimes these are reported as seeing or feeling alternate selves, or cycles. Angels will manifest as architecture, the more immense as a sound. As any other comprehension of their immensity would overwhelm.

The microcosm and the macrocosm are always the same. And so the highest states of your being are always available to you, we pass through them at every moment of the "now", when we cross that line that describes the frequency at which we experience the universe. Those higher selves are at the line too, as is all of creation, but at a different frequency. It is elementarily the same as you, and so it is accessible to you. As the highest selves are available at the instantaneous now, the gradient of higher and lower also describe our larger journey, as we approach and move away from the ultimate line that describes the ultimate self. The microcosm and the macrocosm are the same.

Just as we are on our personal journey to and away from the highest self, the universe is on this journey as well. And there will be a point at which every entity in the universe converges to the same frequency. It will be a great awakening. A million (and yet only one) personal awakenings. The moment has been prophesied.`;

    const FADE_MS = 2800;        // black fade-in duration
    const FIRST_WORD_MS = 420;   // per-word pacing on opening line
    const FIRST_PAUSE_MS = 900;  // pause after first line
    const LINE_MS = 1100;        // gap between sentence reveals

    function showPoem() {
        if (document.querySelector('.poem-overlay')) return;

        const ov = document.createElement('div');
        ov.className = 'poem-overlay';
        const inner = document.createElement('div');
        inner.className = 'poem-inner';
        ov.appendChild(inner);

        const paragraphs = POEM.split(/\n\s*\n/);
        let cursor = FADE_MS;

        // First line: per-word, slightly larger.
        const first = document.createElement('p');
        first.className = 'poem-first';
        // Even left-to-right wipe: every character (including spaces) shares the same cadence.
        const firstWords = paragraphs[0].trim().split(/\s+/);
        const CHAR_MS = 60;
        const PAUSE_BEFORE_ANOMALY = FIRST_WORD_MS * 0.5;
        for (let w = 0; w < firstWords.length; w++) {
            const isLast = w === firstWords.length - 1;
            if (w > 0) {
                first.appendChild(document.createTextNode(' '));
                cursor += CHAR_MS;
                if (firstWords[w - 1] === 'was') {
                    const br = document.createElement('br');
                    br.className = 'poem-mobile-break';
                    first.appendChild(br);
                }
            }
            if (isLast) cursor += PAUSE_BEFORE_ANOMALY;
            for (const ch of Array.from(firstWords[w])) {
                const span = document.createElement('span');
                span.className = 'poem-word';
                span.textContent = ch;
                span.style.animationDelay = cursor + 'ms';
                first.appendChild(span);
                cursor += CHAR_MS;
            }
        }
        inner.appendChild(first);
        cursor += FIRST_PAUSE_MS;

        // Remaining: one sentence at a time, paragraph spacing preserved.
        const sentenceRegex = /[^.!?]+[.!?]+["']?/g;
        for (let pi = 1; pi < paragraphs.length; pi++) {
            // Extra breath before the echoed "In the beginning there was an anomaly."
            if (pi === 2) cursor += LINE_MS;
            const p = document.createElement('p');
            p.className = 'poem-para';
            const sentences = paragraphs[pi].trim().match(sentenceRegex) || [paragraphs[pi].trim()];
            for (let si = 0; si < sentences.length; si++) {
                const raw = sentences[si].trim();
                if (!raw) continue;
                const span = document.createElement('span');
                span.className = 'poem-line';
                span.textContent = raw;
                span.style.animationDelay = cursor + 'ms';
                p.appendChild(span);
                if (si < sentences.length - 1) p.appendChild(document.createTextNode(' '));
                cursor += LINE_MS;
            }
            inner.appendChild(p);
        }

        document.body.appendChild(ov);
        requestAnimationFrame(() => ov.classList.add('is-open'));

        const totalMs = cursor;
        let revealed = false;
        const revealAll = () => {
            revealed = true;
            ov.querySelectorAll('.poem-word, .poem-line').forEach(s => {
                s.style.animationDelay = '0ms';
                s.classList.add('shown');
            });
        };
        const dismiss = () => {
            ov.classList.add('is-closing');
            setTimeout(() => ov.remove(), 1200);
            document.removeEventListener('keydown', onKey);
        };
        const onKey = (ev) => {
            if (ev.key === 'Escape') dismiss();
        };

        ov.addEventListener('click', () => {
            if (!revealed) revealAll();
            else dismiss();
        });
        document.addEventListener('keydown', onKey);
        setTimeout(() => { revealed = true; }, totalMs);
    }

    let lastRipple = 0;
    function emitRipple(x, y) {
        const now = performance.now();
        if (now - lastRipple < 80) return; // throttle
        lastRipple = now;
        const layer = document.querySelector('.ripple-layer') || (() => {
            const l = document.createElement('div');
            l.className = 'ripple-layer';
            document.body.appendChild(l);
            return l;
        })();
        const r = document.createElement('span');
        r.className = 'ripple';
        r.style.left = x + 'px';
        r.style.top = y + 'px';
        layer.appendChild(r);
        setTimeout(() => r.remove(), 1200);
    }

    // ---------- Kickoff ----------

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    async function init() {
        startStarfield();
        // Defer so the page is interactive before we chew on canvases.
        await new Promise(r => setTimeout(r, 150));
        const grids = await buildGrids();
        startRain(grids);
    }
})();
