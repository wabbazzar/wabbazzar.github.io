/** Package QC-reviewed audio, canonical episode routes, and a compatible RSS feed.
 * node tools/release-puffy.mjs /path/to/men_dont_talk --reviewed
 * No deployment; git diff and browser QA are separate gates.
 */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pipeline=process.argv[2];
if(!pipeline || !process.argv.includes('--reviewed'))throw new Error('Requires pipeline path and explicit --reviewed after reading all release QC.');
const brand='Puffy’s Dad’s Podcast',base='https://wabbazzar.com',route='/puffys-dads-podcast/';
const out=resolve(root,route.slice(1));
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const metadata=JSON.parse(readFileSync(resolve(root,'men-dont-talk/episodes.json'),'utf8'));
const map=[['tatum','tatum','Tue, 25 Aug 2026 12:00:00 +0000'],['camille_richie','camille','Tue, 18 Aug 2026 18:41:56 +0000'],['neel_shah','neel','Mon, 24 Aug 2026 19:37:33 +0000']];
mkdirSync(resolve(out,'audio'),{recursive:true});
const release=[];
for(let i=0;i<metadata.length;i++){
 const e=metadata[i], [slug,name,published]=map[i];
 const folder=resolve(pipeline,'episodes',slug,'out/puffy_v1');
 const manifest=JSON.parse(readFileSync(resolve(folder,'puffy_v1_manifest.json'),'utf8'));
 const qc=JSON.parse(readFileSync(resolve(folder,'release_qc.json'),'utf8'));
 const source=resolve(folder,'puffy_v1.mp3');
 const hash=createHash('sha256').update(readFileSync(source)).digest('hex');
 if(qc.sha256!==hash || !qc.whole_file_qc.includes('PASS:'))throw new Error(`Missing/stale QC for ${slug}`);
 e.audio=`audio/${name}-puffy-v1.mp3`;
 e.photo=`../men-dont-talk/${e.photo}`;
 e.seconds=Math.round(manifest.total_s);
 e.duration=`${Math.floor(e.seconds/60)}:${String(e.seconds%60).padStart(2,'0')}`;
 e.published=published;
 e.guid=`wabbazzar-mdt-episode-${e.number}-${e.slug}`; // preserve the existing Tatum subscriber identity
 copyFileSync(source,resolve(out,e.audio));
 e.bytes=statSync(resolve(out,e.audio)).size;
 release.push({episode:slug,audio:e.audio,sha256:hash,duration_s:manifest.total_s,marks_s:manifest.marks_s});
}
writeFileSync(resolve(out,'episodes.json'),JSON.stringify(metadata,null,2)+'\n');
writeFileSync(resolve(out,'release.json'),JSON.stringify({brand,release:'2026-10-08',episodes:release},null,2)+'\n');

function landing(target,title,description){return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${xml(title)} — ${brand}</title><meta name="description" content="${xml(description)}">
<link rel="canonical" href="${base+target}"><meta property="og:type" content="website">
<meta property="og:site_name" content="${brand}"><meta property="og:title" content="${xml(title)} — ${brand}">
<meta property="og:description" content="${xml(description)}"><meta property="og:url" content="${base+target}">
<meta property="og:image" content="${base+route}assets/share.png?v=2"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${base+route}assets/share.png?v=2">
<link rel="icon" href="/favicon.svg?v=wb1"><style>body{background:#e7d9f5;color:#623982;font:20px system-ui;display:grid;min-height:90vh;place-items:center}a{color:inherit}</style>
<script>location.replace(${JSON.stringify(target)}+location.search+${target.includes('#')?'""':'location.hash'});</script>
</head><body><a href="${target}">Open ${xml(title)}</a></body></html>\n`;}
for(const e of metadata){
 const pageRoute=`episode/${e.number}-${e.slug}/`;
 const target=route+`?episode=${e.anchor}#${e.anchor}`;
 // Canonical share route has its own metadata; browsers land on the matching card.
 let page=landing(target,e.guest,e.description).replace(base+target,base+route+pageRoute);
 // target already has a query/hash; don't append a second query.
 page=page.replace(`+location.search+""`, '');
 for(const dir of [resolve(out,pageRoute),resolve(root,'men-dont-talk',pageRoute)]){
  mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'index.html'),page);
 }
 if(e.number==='02')for(const alias of ['05-camille-ritchie','05-camille-richie']){
  const dir=resolve(root,'men-dont-talk/episode',alias);mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'index.html'),page);
 }
}
writeFileSync(resolve(root,'men-dont-talk/index.html'),landing(route,brand,"I'm Puffy's dad. These are my friends."));

function feed(self){return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<atom:link href="${base+self}" rel="self" type="application/rss+xml"/>
<title>${brand}</title><link>${base+route}</link><language>en-us</language>
<copyright>© 2026 Wesley Beckner</copyright><description>I'm Puffy's dad. These are my friends. Long conversations about life, supervised by one orange cat.</description>
<itunes:summary>I'm Puffy's dad. These are my friends. Long conversations about life, supervised by one orange cat.</itunes:summary>
<itunes:author>Wesley Beckner</itunes:author><itunes:type>episodic</itunes:type><itunes:explicit>true</itunes:explicit>
<itunes:owner><itunes:name>Wesley Beckner</itunes:name><itunes:email>wesleybeckner@gmail.com</itunes:email></itunes:owner>
<itunes:image href="${base+route}assets/show-3000.png?v=2"/>
<itunes:category text="Society &amp; Culture"><itunes:category text="Personal Journals"/></itunes:category>
<image><url>${base+route}assets/show-3000.png?v=2</url><title>${brand}</title><link>${base+route}</link></image>
${metadata.map(e=>`<item><title>${e.number}. ${xml(e.guest)}</title><link>${base+route}episode/${e.number}-${e.slug}/</link>
<guid isPermaLink="false">${e.guid}</guid><pubDate>${e.published}</pubDate><description>${xml(e.description)} Recorded ${e.recorded}.</description>
<itunes:summary>${xml(e.description)}</itunes:summary><itunes:author>Wesley Beckner</itunes:author><itunes:episodeType>full</itunes:episodeType>
<itunes:episode>${Number(e.number)}</itunes:episode><itunes:explicit>true</itunes:explicit><itunes:duration>${e.seconds}</itunes:duration>
<itunes:image href="${base+route}assets/show-3000.png?v=2"/>
<enclosure url="${base+route+e.audio}" length="${e.bytes}" type="audio/mpeg"/></item>`).join('\n')}
</channel></rss>\n`;}
for(const url of [route+'feed.xml','/men-dont-talk/feed.xml'])writeFileSync(resolve(root,url.slice(1)),feed(url));
console.log('Packaged',metadata.map(e=>({guest:e.guest,duration:e.duration,bytes:e.bytes})));
