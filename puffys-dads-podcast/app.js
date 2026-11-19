const episodes=[
  {guest:'Wesley Tatum',src:'audio/tatum-puffy-v1.mp3',anchor:'episode-01-tatum'},
  {guest:'Camille Ritchie',src:'audio/camille-puffy-v1.mp3',anchor:'episode-02-camille-ritchie'},
  {guest:'Neel Shah',src:'audio/neel-puffy-v1.mp3',anchor:'episode-03-neel-shah'},
  {guest:'Karli Beckner',src:'audio/karli-puffy-v1.mp3',anchor:'episode-04-karli-beckner'}
];
const audio=document.getElementById('audio');
const dock=document.querySelector('.audio-dock');
const message=document.getElementById('audio-message');
let current=-1,lastTrigger;
document.querySelectorAll('.play-episode').forEach(button=>{
  button.closest('.episode').id=episodes[Number(button.dataset.index)].anchor;
});
const requestedEpisode=new URLSearchParams(location.search).get('episode')||location.hash.slice(1);
if(episodes.some(episode=>episode.anchor===requestedEpisode)){
  requestAnimationFrame(()=>document.getElementById(requestedEpisode)?.scrollIntoView());
}
document.querySelectorAll('.play-episode').forEach(button=>button.addEventListener('click',async event=>{
  event.preventDefault();  // the href exists so a long-press on iPhone can copy the episode link
  const index=Number(button.dataset.index);
  lastTrigger=button;
  dock.hidden=false;
  document.body.classList.add('has-player');
  message.textContent='';
  if(current!==index){audio.src=episodes[index].src;current=index;}
  document.getElementById('playing-title').textContent=episodes[index].guest;
  try {await audio.play();} catch {message.textContent='Press play in the player to start the episode.';}
}));
// Share: Web Share sheet where it exists (iPhone), otherwise copy the link.
// Each link points at episode/<nn-slug>/, the page that carries that episode's og: tags.
document.querySelectorAll('.share-episode').forEach(link=>link.addEventListener('click',async event=>{
  event.preventDefault();
  const url=new URL(link.getAttribute('href'),location.href).href;
  const title=`${episodes[Number(link.dataset.index)].guest} — Puffy’s Dad’s Podcast`;
  if(navigator.share){
    try{await navigator.share({title,url});return;}catch{/* cancelled or unsupported: fall through to copy */}
  }
  const label=link.querySelector('.share-label');
  try{
    await navigator.clipboard.writeText(url);
    label.textContent='Link copied!';
    window.setTimeout(()=>{label.textContent='Share';},2000);
  }catch{window.prompt('Copy this link:',url);}
}));
audio.addEventListener('error',()=>{message.textContent='The recording could not load. Please try again.';});
document.getElementById('close-player').addEventListener('click',()=>{
  audio.pause();dock.hidden=true;document.body.classList.remove('has-player');lastTrigger?.focus();
});

// Ambient, automatic thoughts: no controls or click-to-pause behavior.
// No live region, so changing thoughts don't interrupt screen readers.
const thoughtBubble=document.querySelector('.bubble');
const thoughtText=thoughtBubble.querySelector('.thought-text');
const thoughts=['kibbles…','are you\nawake…','birds…','grasshopper…','lunch…?','second\nbreakfast?…'];
let thoughtIndex=0,thoughtTimer;
function stopThoughtTimer(){
  window.clearTimeout(thoughtTimer);
  thoughtBubble.classList.remove('is-poofing');
}
function nextThought(){
  thoughtIndex=(thoughtIndex+1)%thoughts.length;
  thoughtText.textContent=thoughts[thoughtIndex];
}
function scheduleThought(delay=4600){
  stopThoughtTimer();
  if(document.hidden)return;
  thoughtTimer=window.setTimeout(()=>{
    thoughtBubble.classList.add('is-poofing');
    thoughtTimer=window.setTimeout(()=>{
      // Swap only while the cloud is invisible. The dots reappear first,
      // then the new thought overshoots and settles into its reading pose.
      nextThought();
      thoughtTimer=window.setTimeout(()=>scheduleThought(),860);
    },340);
  },delay);
}
document.addEventListener('visibilitychange',()=>scheduleThought());
scheduleThought(500);
