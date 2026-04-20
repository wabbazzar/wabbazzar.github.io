#!/usr/bin/env node
// Headless tuner. Loads fracture.js, generates 20 varied triangles at a
// target viewport size, and reports coverage / duration / shard count per
// trial — so we can iterate on params without a browser.
//
// Usage:
//   node tools/fracture-tune.js                # default params
//   node tools/fracture-tune.js '{"MAX_DEPTH":6,"PRIMARY_LEN_MULT":3.2}'

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "fracture.js"), "utf8");
const sandbox = { window: {}, Math };
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox);
const Fracture = sandbox.window.Fracture;

const override = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const params = Object.assign({}, Fracture.DEFAULT_PARAMS, override);

const VIEWPORTS = [
    { name: "desktop", w: 1440, h: 900 },
    { name: "laptop",  w: 1280, h: 720 },
    { name: "mobile",  w: 390,  h: 844 },
];

function rng(seed) { return Fracture.mulberry32(seed); }

function randomTriangle(vp, r) {
    const { w, h } = vp;
    const cx = 0.2 * w + 0.6 * w * r();
    const cy = 0.2 * h + 0.6 * h * r();
    const rBase = Math.min(w, h) * (0.05 + 0.25 * r());
    const rot = r() * Math.PI * 2;
    const pts = [];
    for (let i = 0; i < 3; i++) {
        const a = rot + (i * 2 * Math.PI / 3) + (r() - 0.5) * 0.6;
        const rr = rBase * (0.6 + 0.8 * r());
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
}

function runBatch(vp, N, seed0) {
    let pass = 0;
    let covSum = 0, durSum = 0, shardSum = 0;
    let covMin = 1, durMax = 0, shardMax = 0;
    const rows = [];
    for (let i = 0; i < N; i++) {
        const r = rng(seed0 + i);
        const tri = randomTriangle(vp, r);
        const plan = Fracture.planFracture(tri, vp, params, seed0 + i + 1);
        const cov = Fracture.shardAreaCoverage(plan.shards, vp);
        const dur = plan.totalMs;
        const ok = cov >= 0.95 && dur <= 3000;
        if (ok) pass++;
        covSum += cov; durSum += dur; shardSum += plan.shards.length;
        if (cov < covMin) covMin = cov;
        if (dur > durMax) durMax = dur;
        if (plan.shards.length > shardMax) shardMax = plan.shards.length;
        rows.push({ i, cov, dur, shards: plan.shards.length, ok });
    }
    return {
        vp, N, pass,
        avgCov: covSum / N, avgDur: durSum / N, avgShards: shardSum / N,
        covMin, durMax, shardMax, rows,
    };
}

function fmt(pct) { return (pct * 100).toFixed(1) + "%"; }

console.log("params =", JSON.stringify(params));
console.log();
for (const vp of VIEWPORTS) {
    const res = runBatch(vp, 20, 2025);
    console.log(`-- ${vp.name.padEnd(7)} ${vp.w}x${vp.h}  pass ${res.pass}/20  avg cov ${fmt(res.avgCov)}  min cov ${fmt(res.covMin)}  avg dur ${res.avgDur.toFixed(0)}ms  max dur ${res.durMax.toFixed(0)}ms  avg shards ${res.avgShards.toFixed(1)}  max shards ${res.shardMax}`);
    for (const r of res.rows) {
        const tag = r.ok ? "PASS" : "FAIL";
        console.log(`   #${String(r.i + 1).padStart(2)} cov=${fmt(r.cov)} dur=${(r.dur|0)}ms shards=${r.shards} ${tag}`);
    }
    console.log();
}
