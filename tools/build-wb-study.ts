/** Run from the site root: ../portavec/node_modules/.bin/tsx tools/build-wb-study.ts */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runPipeline } from '../../portavec/src/algorithms/pipeline.ts';
const require = createRequire(new URL('../../portavec/package.json', import.meta.url));
const { PNG } = require('pngjs');
const out = new URL('../docs/wb-logo-study/', import.meta.url);
mkdirSync(out, { recursive: true });
const source = PNG.sync.read(readFileSync(new URL('../icon-512.png', import.meta.url)));
const data = new Uint8ClampedArray(source.data);
// Invert: Portavec treats dark pixels as foreground. Threshold 55 excludes
// the original's dark texture and gray corner sparkle.
for (let i = 0; i < data.length; i += 4)
  for (let c = 0; c < 3; c++) data[i + c] = 255 - data[i + c];
const options = {
  thresholdMethod: 'manual' as const, manualThreshold: 55,
  useEdgeDetection: false, curveFitMethod: 'polyline' as const,
  curveTolerance: 1.4, simplifyTolerance: 0.5,
  fillColor: '#fff', strokeColor: 'none', minContourLength: 15,
};
const result = runPipeline({ width: source.width, height: source.height, data } as ImageData, options, true);
writeFileSync(new URL('portavec-trace.svg', out), result.svg);
// Cleaned component trace in the source's 512 × 512 coordinate space.
const original = [
  ['left-ribbon', 'M63 128H133L203 395H134Z'],
  ['inner-rise', 'M178 257L218 144L248 260L208 373Z'],
  ['upper-fold', 'M224 128H295L255 243Z'],
  ['shared-spine', 'M306 128H323L361 181H308V337H362L375 325L334 395H270L244 302Z'],
  ['upper-bowl', 'M334 128H415L460 202L386 308V273L367 254L386 236V196Z'],
  ['lower-bowl', 'M420 269L460 321L415 395H345Z'],
];
const b = original.slice(3);
const w = 'M63 128H128L177 319L212 210H242L300 395H260L228 295L195 395H134Z';
const paths = (pieces: string[][]) => pieces.map(([id, d]) => `    <path id="${id}" d="${d}"/>`).join('\n');
const svg = (body: string, title: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" color="#fff" role="img" aria-labelledby="title">
  <title id="title">${title}</title>
${body}
</svg>\n`;
writeFileSync(new URL('faithful-trace.svg', out), svg(`<g fill="currentColor">\n${paths(original)}\n</g>`, 'Original WB, coordinate trace'));
const defs = `<defs>
    <mask id="underpass" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512" style="mask-type:luminance">
      <rect width="512" height="512" fill="white"/>
      <!-- The W passes in front. Ten units of outline leave a five-unit reveal. -->
      <path d="${w}" fill="black" stroke="black" stroke-width="10" stroke-linejoin="miter"/>
      <!-- Restore the shared heel below the B counter's baseline. -->
      <rect y="338" width="512" height="174" fill="white"/>
    </mask>
  </defs>`;
const mark = (cut: boolean, colored = false) => `${defs}
  <g fill="${colored ? '#79d5ca' : 'currentColor'}"${cut ? ' mask="url(#underpass)"' : ''}>
${paths(b)}
  </g>
  <path id="w-overpass" fill="${colored ? '#f4c56c' : 'currentColor'}" d="${w}"/>`;
writeFileSync(new URL('wb-crossover.svg', out), svg(mark(true), 'WB with W crossing over the B spine'));
writeFileSync(new URL('wb-joined.svg', out), svg(mark(false), 'WB with a continuous shared junction'));
const grid = Array.from({ length: 9 }, (_, i) => 64 * i).map(n => `<path d="M${n} 0V512M0 ${n}H512"/>`).join('');
const points = [[177,319],[212,210],[242,210],[228,295],[260,395],[300,395],[306,128],[308,181],[308,337]];
const labels = points.map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff"/><text x="${x + ([2,5,7,8].includes(i)?8:-8)}" y="${y + ([1,6].includes(i)?-10:18)}" text-anchor="${[2,5,7,8].includes(i)?'start':'end'}">${x},${y}</text>`).join('\n');
writeFileSync(new URL('construction.svg', out), svg(`<rect width="512" height="512" fill="#0b0b0b"/>
  <g stroke="#333" stroke-width="0.6">${grid}</g>
  ${mark(true, true)}
  <g font-family="monospace" font-size="11" fill="#fff" paint-order="stroke" stroke="#0b0b0b" stroke-width="3">${labels}</g>`, 'WB construction: gold W, teal B, source coordinates'));
// Omit timing so repeated runs produce stable artifacts.
const { processingTimeMs, stages, ...geometry } = result.metrics;
writeFileSync(new URL('trace-metrics.json', out), JSON.stringify({
  source: '../../icon-512.png', portavecRevision: '0b91cc7', inverted: true,
  options, geometry, contours: result.debug?.contours.contours.map(c => ({ points: c.points, isHole: c.isHole })),
}, null, 2) + '\n');
console.log(JSON.stringify({ output: out.pathname, geometry }));
