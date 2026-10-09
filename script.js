'use strict';
// Add the official pre-save URL here when available.
const PRESAVE_URL = '';
const loading = document.getElementById('loading');
const main = document.getElementById('main');
const entranceHint=document.getElementById('entrance-hint');
let entranceHintTimer=null;
function resetEntranceHint(){
 clearTimeout(entranceHintTimer);entranceHintTimer=null;
 entranceHint.classList.remove('visible');
 if(loaded&&!started)entranceHintTimer=setTimeout(()=>{
  entranceHintTimer=null;
  if(loaded&&!started)entranceHint.classList.add('visible');
 },4000);
}
loading.addEventListener('pointerdown',resetEntranceHint);
loading.addEventListener('keydown',resetEntranceHint);
const arena = document.getElementById('arena');
const group = document.getElementById('group');
const groupImage = document.getElementById('group-image');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let x=0,y=0,vx=92,vy=74,maxX=0,maxY=0,last=0,frame=0,started=false,loaded=false;
const INITIAL_VX=92,INITIAL_VY=74;
let hue=0;
function changeColor(){
 hue=(hue+70+Math.random()*140)%360;
 groupImage.style.filter=`sepia(1) saturate(8) hue-rotate(${hue}deg) brightness(.95)`;
}
function paint(){group.style.transform=`translate3d(${x}px,${y}px,0)`;}
function resize(){
 maxX=Math.max(0,arena.clientWidth-group.clientWidth);
 maxY=Math.max(0,arena.clientHeight-group.clientHeight);
 if(!started||reducedMotion.matches){x=maxX/2;y=maxY/2;}else{x=Math.min(maxX,Math.max(0,x));y=Math.min(maxY,Math.max(0,y));}
 paint();
}
function bounce(position,velocity,limit,delta){
 if(limit<=0)return [0,velocity];
 let next=position+velocity*delta;
 while(next<0||next>limit){if(next<0){next=-next;velocity=Math.abs(velocity);changeColor();}if(next>limit){next=2*limit-next;velocity=-Math.abs(velocity);changeColor();}}
 return [next,velocity];
}
function animate(now){
 const dt=last?Math.min((now-last)/1000,.05):0;last=now;
 [x,vx]=bounce(x,vx,maxX,dt);[y,vy]=bounce(y,vy,maxY,dt);paint();
 frame=requestAnimationFrame(animate);
}
function resume(){cancelAnimationFrame(frame);last=0;if(started&&!document.hidden&&!reducedMotion.matches)frame=requestAnimationFrame(animate);}
new ResizeObserver(resize).observe(arena);
groupImage.addEventListener('load',resize);
document.addEventListener('visibilitychange',resume);
reducedMotion.addEventListener('change',()=>{resize();resume();});
// The moving button remains available after the image bursts, for the fifth tap.
let inflation=0,burst=false;
let deformation;
const originalGroupSource=groupImage.src;
let groupPixels;
function expandCenter(level){
 if(level===0){groupImage.src=originalGroupSource;return;}
 const canvas=document.createElement('canvas');
 if(!groupPixels){
  canvas.width=groupImage.naturalWidth;canvas.height=groupImage.naturalHeight;
  const context=canvas.getContext('2d');
  context.drawImage(groupImage,0,0);
  groupPixels=context.getImageData(0,0,canvas.width,canvas.height);
 }
 const {width,height,data}=groupPixels;
 canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');
 const output=context.createImageData(width,height);
 // Inverse radial mapping: expand the center and compress the outer ring.
 // The ellipse boundary stays fixed, so every stage has the same dimensions.
 const power=1+level*.45;
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const nx=(px-(width-1)/2)/(width/2),ny=(py-(height-1)/2)/(height/2);
  const radius=Math.hypot(nx,ny);
  const factor=radius>0&&radius<1?Math.pow(radius,power-1):1;
  const sx=Math.max(0,Math.min(width-1,(width-1)/2+nx*factor*width/2));
  const sy=Math.max(0,Math.min(height-1,(height-1)/2+ny*factor*height/2));
  const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
  const a=(iy*width+ix)*4,b=(iy*width+Math.min(ix+1,width-1))*4;
  const c=(Math.min(iy+1,height-1)*width+ix)*4,d=(Math.min(iy+1,height-1)*width+Math.min(ix+1,width-1))*4;
  const dest=(py*width+px)*4;
  for(let channel=0;channel<4;channel++)output.data[dest+channel]=
   (data[a+channel]*(1-fx)+data[b+channel]*fx)*(1-fy)+
   (data[c+channel]*(1-fx)+data[d+channel]*fx)*fy;
 }
 context.putImageData(output,0,0);
 groupImage.src=canvas.toDataURL('image/png');
}
const fragments=new Set();
function clearFragments(){for(const fragment of fragments)fragment.remove();fragments.clear();}
function inflate(){
 if(!started)return;
 if(burst){
  burst=false;inflation=0;clearFragments();
  vx=Math.sign(vx)*INITIAL_VX;vy=Math.sign(vy)*INITIAL_VY;
  groupImage.style.visibility='';
 }else if(inflation===3){
  burst=true;
  deformation?.cancel();
  groupImage.style.visibility='hidden';
  group.setAttribute('aria-label','Volver a mostrar figura');
  if(!reducedMotion.matches){
   const width=group.clientWidth,height=group.clientHeight;
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const fragment=document.createElement('span');
    fragment.className='group-fragment';
    fragment.style.cssText=`left:${x+col*width/4}px;top:${y+row*height/4}px;width:${width/4+1}px;height:${height/4+1}px;background-image:url("${groupImage.src}");background-size:${width}px ${height}px;background-position:${-col*width/4}px ${-row*height/4}px;filter:${groupImage.style.filter}`;
    arena.append(fragment);fragments.add(fragment);
    const dx=(col-1.5)*55,dy=(row-1.5)*55;
    const animation=fragment.animate([
     {transform:'translate(0,0) scale(1)',opacity:1},
     {transform:`translate(${dx}px,${dy}px) rotate(${(col-row)*30}deg) scale(.25)`,opacity:0}
    ],{duration:650,easing:'cubic-bezier(.16,.7,.3,1)',fill:'forwards'});
    animation.onfinish=()=>{fragment.remove();fragments.delete(fragment);};
   }
  }
  return;
 }else{inflation++;vx*=2;vy*=2;}
 deformation?.cancel();
 expandCenter(inflation);
 group.setAttribute('aria-label',inflation===3?'Explotar figura':'Inflar figura');
 if(!reducedMotion.matches)deformation=groupImage.animate([
  {transform:'translateX(-2px)'},
  {transform:'translateX(2px)',offset:.35},
  {transform:'translateX(-1px)',offset:.7},
  {transform:'translateX(0)'}
 ],{duration:480,easing:'ease-out'});
}
group.addEventListener('click',event=>{event.stopPropagation();inflate();});
arena.addEventListener('click',()=>{if(burst)inflate();});
const assets=[...document.images].map(img=>img.decode().catch(()=>{}));
function enter(){
 if(!loaded||started)return;
 clearTimeout(entranceHintTimer);entranceHintTimer=null;
 entranceHint.classList.remove('visible');
 resize();started=true;main.inert=false;main.removeAttribute('aria-hidden');main.classList.add('ready');loading.classList.add('done');
 loading.removeAttribute('tabindex');loading.setAttribute('aria-hidden','true');
 document.getElementById('play-pause').disabled ? document.getElementById('presave').focus({preventScroll:true}) : document.getElementById('play-pause').focus({preventScroll:true});
 startAudio();resume();
}
loading.addEventListener('click',enter);
loading.addEventListener('keydown',event=>{
 if(loaded&&(event.key==='Enter'||event.key===' ')){event.preventDefault();enter();}
});
document.getElementById('presave').addEventListener('click',()=>{
 if(PRESAVE_URL){window.location.assign(PRESAVE_URL);}else{document.getElementById('notice').hidden=false;}
});

// Add songs in order, using local MP3 paths or direct audio URLs.
const TRACKS=[{title:'A medio azular',album:'Meditación Guiada Para Perros',edition:'EP (2026)',src:'audio/a-medio-azular.mp3'}];
const audio=document.getElementById('audio');
const previous=document.getElementById('previous');
const next=document.getElementById('next');
const playPause=document.getElementById('play-pause');
let trackIndex=0,pendingPaused=false;
function syncPlayer(){
 previous.disabled=trackIndex===0;next.disabled=trackIndex===TRACKS.length-1;
 const available=Boolean(TRACKS[trackIndex].src);
 playPause.disabled=false;
 const paused=available?audio.paused:pendingPaused;
 playPause.setAttribute('aria-label',paused?'Reproducir':'Pausar');
 playPause.title=available?playPause.getAttribute('aria-label'):'Audio todavía no disponible';
 document.getElementById('pause-icon').toggleAttribute('hidden',paused);
 document.getElementById('play-icon').toggleAttribute('hidden',!paused);
}
function startAudio(){if(TRACKS[trackIndex].src)audio.play().catch(syncPlayer);}
function selectTrack(index){
 if(index<0||index>=TRACKS.length)return;
 audio.pause();trackIndex=index;
 document.querySelector('h1').textContent='"'+TRACKS[index].title+'"';
 if(TRACKS[index].src){audio.src=TRACKS[index].src;}else{audio.removeAttribute('src');}
 audio.load();syncPlayer();if(started)startAudio();
}
previous.addEventListener('click',()=>selectTrack(trackIndex-1));
next.addEventListener('click',()=>selectTrack(trackIndex+1));
playPause.addEventListener('click',()=>{
 if(!TRACKS[trackIndex].src){pendingPaused=!pendingPaused;syncPlayer();return;}
 if(audio.paused)startAudio();else audio.pause();
});
for(const event of ['play','pause','ended','error'])audio.addEventListener(event,syncPlayer);
audio.addEventListener('ended',()=>{if(trackIndex<TRACKS.length-1)selectTrack(trackIndex+1);});
selectTrack(0);

// Keep the entrance still when cached audio is ready before loading becomes visible.
// Read the media's actual readiness on every visit; a past visit alone is no guarantee.
let entranceAssetsReady=false;
function syncEntrance(){
 if(started)return;
 const audioReady=!TRACKS[0].src||audio.readyState>=HTMLMediaElement.HAVE_FUTURE_DATA||Boolean(audio.error);
 const wasLoaded=loaded;
 loaded=entranceAssetsReady&&audioReady;
 if(loaded!==wasLoaded)resetEntranceHint();
 loading.classList.toggle('is-loading',!loaded&&entranceLoadingVisible);
 loading.style.cursor=loaded?'pointer':'default';
 loading.setAttribute('role',loaded?'button':'status');
 loading.setAttribute('aria-label',loaded?'Entrar':'Cargando');
 if(loaded)loading.tabIndex=0;else loading.removeAttribute('tabindex');
}
let entranceLoadingVisible=false;
for(const event of ['loadeddata','canplay','canplaythrough','progress','waiting','stalled','error','emptied'])audio.addEventListener(event,syncEntrance);
Promise.all(assets).then(()=>{entranceAssetsReady=true;syncEntrance();});
setTimeout(()=>{entranceLoadingVisible=true;syncEntrance();},150);
syncEntrance();
