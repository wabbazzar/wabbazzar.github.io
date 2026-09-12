// Five coordinate-built alternatives. Does not modify the approved site logo.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const out = new URL('../docs/wb-variations/', import.meta.url);
await mkdir(out, {recursive:true});
const approved = await readFile(new URL('../assets/brand/wb.svg',import.meta.url),'utf8');
const n = v => Number(v.toFixed(3));
const poly = points => 'M'+points.map(p=>p.map(n).join(' ')).join('L')+'Z';
const slope = Math.tan(Math.PI/12); // W downstrokes: 75° from horizontal.
function w(k) {
  const valley=128+slope*191, crest=valley+k*109, right=crest+30;
  const foot=right+slope*185, notch=foot-40-slope*100;
  return poly([[63,128],[128,128],[valley,319],[crest,210],[right,210],
    [foot,395],[foot-40,395],[notch,295],[notch-100*k,395],[63+slope*267,395]]);
}
function b(k,d=.75,{tip=460,spine=308,start=244,vertical=false,lowerLeft=345}={}) {
  const e=tip-106*k, cap=e-68*d;
  return [
    poly([[vertical?spine-32:start+174*k,128],[cap-11,128],[cap-11+53*d,181],
      [spine,181],[spine,337],[lowerLeft-11+58*k,337],
      [lowerLeft-11,395],[spine-(vertical?32:38),395],...(vertical?[]:[[start,302]])]),
    poly([[cap,128],[tip-74*d,128],[tip,202],[e,308],[e,273],
      [e-19*d,254],[e,254-19*d/k],[e,196]]),
    poly([[lowerLeft+126*k,269],[lowerLeft+126*k+52*d,321],
      [lowerLeft+52*k+52*d,395],[lowerLeft,395]]),
  ];
}
const origB=[
 'M306 128H323L361 181H308V337H362L375 325L334 395H270L244 302Z',
 'M334 128H415L460 202L386 308V273L367 254L386 236V196Z',
 'M420 269L460 321L415 395H345Z',
];
const origW='M63 128H128L177 319L212 210H242L300 395H260L228 295L195 395H134Z';
const k60=1/Math.sqrt(3), kSteep=62/174;
const variants=[
 {id:'01-steep-parallels',name:'Steep parallels',brief:'Keep the inner-spine crossover. Match the W rise and both B clefts at 70.4°.',k:kSteep,d:.75,w:[w(kSteep)],b:b(kSteep),guide:[[244,302],[306,128]],change:'Alignment only; narrow, upright B.'},
 {id:'02-sixty-degree',name:'60° rhythm',brief:'Open the upward diagonals to 60°. Pair the B’s chevrons at ±60° and keep the W downstrokes parallel at 75°.',k:k60,d:k60,w:[w(k60)],b:b(k60,k60,{start:220}),guide:[[220,302],[220+174*k60,128]],change:'Alignment only; a broader, more regular rhythm.'},
 {id:'03-outer-reach',name:'Outer reach',brief:'Extend the W’s final arm to the B’s far-right point. Keep the inherited B as a control for the reach change.',k:132/193,d:null,w:[origW,poly([[270,395],[328,395],[460,202],[402,202]])],b:origB,guide:[[328,395],[460,202]],change:'Reach only; original B angles intentionally retained.'},
 {id:'04-outer-grid',name:'Outer reach / 3:2 grid',brief:'Extend the W to the outside and align the rising edges on a 2-right / 3-up grid: 56.3°. B folds use a second repeated ratio.',k:2/3,d:.75,w:[w(2/3),poly([[400-193*2/3,395],[460-193*2/3,395],[460,202],[400,202]])],b:b(2/3,.75,{vertical:true}),guide:[[460-193*2/3,395],[460,202]],change:'Reach + alignment; long shared diagonal through the counter.'},
 {id:'05-wide-lattice',name:'45° lattice',brief:'A wider experiment: the W reaches the outer bowl on a 45° diagonal; all B chamfers use the same 45° grid.',k:1,d:1,w:[w(1),poly([[310,395],[370,395],[563,202],[503,202]])],b:b(1,1,{tip:563,spine:370,vertical:true,lowerLeft:387}),guide:[[370,395],[563,202]],change:'Reach + alignment; intentionally wider proportions.',transform:'translate(13.18 54.28) scale(0.79)'},
];
function svg(v,colored=false,guides=false){
 const bcolor=colored?'#79d5ca':'#fff',wcolor=colored?'#f4c56c':'#fff';
 const mask=v.w.map(d=>`<path d="${d}" fill="black" stroke="black" stroke-width="10" stroke-linejoin="miter"/>`).join('');
 // Preserve the W's negative-space notch even where the B's heel overlaps it.
 const pts=v.id==='03-outer-reach'?null:v.w[0].match(/-?\d+(?:\.\d+)?/g).map(Number);
 const knockout=pts?`<path fill="black" d="${poly([[pts[16]-2*v.k,397],[pts[14],pts[15]],[pts[12]+2*slope,397]])}"/>`:'';
 const lines=[];
 if(guides){for(const [x,y] of [v.guide[0],[v.guide[0][0]+35,v.guide[0][1]],[v.guide[0][0]+100,v.guide[0][1]]])lines.push(`<path d="M${n(x-v.k*250)} ${y+250}L${n(x+v.k*350)} ${y-350}"/>`);}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${v.name}"><defs><mask id="under" maskUnits="userSpaceOnUse" x="-100" y="-100" width="900" height="900" style="mask-type:luminance"><rect x="-100" y="-100" width="900" height="900" fill="white"/>${mask}<rect y="338" width="800" height="174" fill="white"/>${knockout}</mask></defs><g${v.transform?` transform="${v.transform}"`:''}><g fill="${bcolor}" mask="url(#under)">${v.b.map(d=>`<path d="${d}"/>`).join('')}</g><g fill="${wcolor}">${v.w.map(d=>`<path d="${d}"/>`).join('')}</g>${guides?`<g fill="none" stroke="#ed766b" stroke-opacity=".7" stroke-width="1" stroke-dasharray="5 5">${lines.join('')}</g>`:''}</g></svg>`;
}
for(const v of variants){
 await writeFile(new URL(v.id+'.svg',out),svg(v));
 await writeFile(new URL(v.id+'-geometry.svg',out),svg(v,true,true));
}
await writeFile(new URL('00-current.svg',out),approved);
const cards=[{id:'00-current',name:'Current / live',brief:'Approved crossover. Reference for the five explorations.',change:'Baseline'},...variants];
await writeFile(new URL('geometry.json',out),JSON.stringify(variants.map(v=>({...v,ascendingAngle:n(Math.atan(1/v.k)*180/Math.PI)})),null,2)+'\n');
await writeFile(new URL('index.html',out),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WB — five directions</title><link rel="icon" href="/favicon.svg?v=wb1"><style>
*{box-sizing:border-box}body{margin:0;background:#f1eee6;color:#252522;font:15px/1.45 system-ui,sans-serif}main{max-width:1320px;padding:32px;margin:auto}.eyebrow{font:12px monospace;text-transform:uppercase;letter-spacing:.13em;color:#226c59}h1{font:500 42px/1.1 Georgia,serif;letter-spacing:-.025em;margin:10px 0}header p{color:#626660;max-width:820px}label{display:inline-flex;gap:8px;align-items:center;cursor:pointer;margin-top:10px}input{accent-color:#226c59}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;margin-top:24px}figure{margin:0;min-width:0}.art{width:100%;display:block;background:#0a0a09;aspect-ratio:1}h2{font-size:17px;margin:12px 0 6px}p{margin:0;color:#626660}.desc{min-height:90px}.samples{display:flex;align-items:end;gap:18px;margin:14px 0;font:11px monospace;color:#626660}.samples span{display:grid;justify-items:center;gap:5px}.samples img{background:#0a0a09}a{color:#226c59;text-underline-offset:3px}a:focus-visible,input:focus-visible{outline:3px solid #226c59;outline-offset:4px}.files{display:flex;gap:16px;font-size:13px}footer{border-top:1px solid #d6d3ca;margin-top:30px;padding-top:16px;color:#626660;font-size:13px}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){main{padding:22px 18px}.grid{grid-template-columns:1fr}h1{font-size:34px}.desc{min-height:0}}
</style></head><body><main><header><div class="eyebrow">Wabbazzar / monogram study 02</div><h1>Five directions for the WB.</h1><p>Compare the live mark with changes to the crossover reach and diagonal alignment. Each option is built from explicit coordinates; the gold/teal view separates the W from the B.</p><label><input id="geometry" type="checkbox"> Show letter construction and parallel guides</label></header><section class="grid">${cards.map((v,i)=>`<figure><img class="art" data-id="${v.id}" src="${v.id}.svg" alt="${v.name} WB logo"><h2>${i===0?'00':String(i).padStart(2,'0')} / ${v.name}</h2><p class="desc">${v.brief}</p><div class="samples">${[22,32,64].map(s=>`<span><img src="${v.id}.svg" width="${s}" height="${s}" alt="${s} pixel ${v.name}">${s}px</span>`).join('')}</div><div class="files"><a href="${v.id}.svg" download>SVG</a>${i?`<a href="${v.id}-geometry.svg" download>Geometry</a>`:''}</div></figure>`).join('')}</section><footer>00 is deployed. 01–05 are proposals for comparison; choosing a direction comes before any further site-logo change.</footer></main><script>document.querySelector('#geometry').addEventListener('change',e=>{for(const img of document.querySelectorAll('.art'))if(img.dataset.id!=='00-current')img.src=img.dataset.id+(e.target.checked?'-geometry':'')+'.svg'});</script></body></html>`);
const browser=await chromium.launch({headless:true});
try {const p=await browser.newPage();for(const v of variants){const png=await p.evaluate(async url=>{const i=new Image();i.src=url;await i.decode();const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#0a0a09';ctx.fillRect(0,0,512,512);ctx.drawImage(i,0,0);return c.toDataURL('image/png').split(',')[1];},'data:image/svg+xml;base64,'+Buffer.from(svg(v)).toString('base64'));await writeFile(new URL(v.id+'.png',out),Buffer.from(png,'base64'));}}finally{await browser.close();}
console.log('Wrote five proposals and comparison to',out.pathname);
