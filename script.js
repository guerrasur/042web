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
const arena=document.getElementById('arena');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
// Conservative hints only: unknown hardware keeps the normal quality profile.
const lowPower=Boolean(navigator.connection?.saveData||
 (navigator.deviceMemory&&navigator.deviceMemory<=4)||
 (navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4));
const sitePerformance=window.SITE_PERFORMANCE=Object.freeze({
 lowPower,pixelRatio:Math.min(window.devicePixelRatio||1,lowPower?1:2),
 gameFrameMs:1000/(lowPower?30:60),
 planRate:lowPower?30:60
});
let started=false,loaded=false,frame=0,last=0,maxX=0,maxY=0,radius=40;
let plans=null,planStates=null;
let shooter=null;
let bricks=null;
let wonguikung=null;
const colorTimers=[];
const group=document.getElementById('group');
const heads=[group];
for(let i=1;i<3;i++){
 const head=group.cloneNode(true);head.hidden=true;head.id=`group-${i+1}`;
 head.querySelector('img').id=`group-image-${i+1}`;arena.append(head);heads.push(head);
}
const bodies=heads.map((element,index)=>({element,image:element.querySelector('img'),
 x:0,y:0,vx:index?-92:92,vy:index?74:-74,targetSpeed:0,hue:index*120,
 active:index===0,inflation:0,burst:false,grab:null,suppressUntil:0,fragments:new Set(),deformation:null}));
function tint(body){body.hue=(body.hue+70+Math.random()*140)%360;body.image.style.filter=`sepia(1) saturate(8) hue-rotate(${body.hue}deg) brightness(.95)`;}
for(const body of bodies.slice(1))body.image.style.filter=`sepia(1) saturate(8) hue-rotate(${body.hue}deg) brightness(.95)`;
function paint(){for(const b of bodies)if(b.active&&!b.burst)b.element.style.transform=`translate3d(${b.x}px,${b.y}px,0)`;}
function snapshot(){return bodies.map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy,targetSpeed:b.targetSpeed,active:b.active,burst:b.burst,held:Boolean(b.grab)}));}
function apply(states){states.forEach((s,i)=>{for(const key of ['x','y','vx','vy','targetSpeed'])bodies[i][key]=s[key];});}
function wall(b){
 let hit=false;
 if(b.x<0){b.x=-b.x;b.vx=Math.abs(b.vx);hit=true;}
 if(b.x>maxX){b.x=2*maxX-b.x;b.vx=-Math.abs(b.vx);hit=true;}
 if(b.y<0){b.y=-b.y;b.vy=Math.abs(b.vy);hit=true;}
 if(b.y>maxY){b.y=2*maxY-b.y;b.vy=-Math.abs(b.vy);hit=true;}
 b.x=Math.max(0,Math.min(maxX,b.x));b.y=Math.max(0,Math.min(maxY,b.y));
 return hit;
}
function physics(states,dt){
 const hits=new Set();
 states.forEach((b,i)=>{
  if(!b.active||b.burst||b.held)return;
  if(b.targetSpeed){
   const speed=Math.hypot(b.vx,b.vy);
   if(speed){const eased=b.targetSpeed+(speed-b.targetSpeed)*Math.exp(-3.5*dt);b.vx*=eased/speed;b.vy*=eased/speed;}
  }
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(wall(b))hits.add(i);
 });
 for(let i=0;i<states.length;i++)for(let j=i+1;j<states.length;j++){
 const a=states[i],b=states[j];
 if(a.active&&b.active&&!a.burst&&!b.burst&&!(a.held&&b.held)){
  const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy),diameter=radius*2;
  if(distance<diameter){
   const nx=distance>.001?dx/distance:1,ny=distance>.001?dy/distance:0;
   const overlap=diameter-distance+.05;
   const shareA=a.held?0:b.held?1:.5,shareB=b.held?0:a.held?1:.5;
   a.x-=nx*overlap*shareA;a.y-=ny*overlap*shareA;
   b.x+=nx*overlap*shareB;b.y+=ny*overlap*shareB;
   const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
   if(relative<0){
    const impulse=-relative*(a.held||b.held?1.85:1);
    if(!a.held){a.vx-=impulse*nx;a.vy-=impulse*ny;}
    if(!b.held){b.vx+=impulse*nx;b.vy+=impulse*ny;}
    hits.add(i);hits.add(j);
   }
   for(const body of states)if(!body.held){
    wall(body);
    const speed=Math.hypot(body.vx,body.vy);
    if(speed>1800){body.vx*=1800/speed;body.vy*=1800/speed;}
   }
  }
 }
 }
 return hits;
}
function stopPlans(){
 if(plans){
  const time=Math.min(Number(plans[0].currentTime||0)/1000,4);
  const index=Math.min(planStates.length-1,Math.floor(time*sitePerformance.planRate));
  const states=planStates[index].map(s=>({...s}));
  const remaining=Math.max(0,time-index/sitePerformance.planRate),steps=Math.max(1,Math.ceil(remaining*120));
  for(let i=0;i<steps;i++)physics(states,remaining/steps);apply(states);
  for(const animation of plans)animation.cancel();plans=null;planStates=null;paint();
 }
 for(const timer of colorTimers)clearTimeout(timer);colorTimers.length=0;
}
function playPlans(){
 const states=snapshot(),frames=bodies.map(()=>[]),stride=120/sitePerformance.planRate;
 planStates=[states.map(s=>({...s}))];
 for(let i=0;i<=480;i++){
  if(i){
   const hits=physics(states,1/120);
   for(const index of hits)colorTimers.push(setTimeout(()=>tint(bodies[index]),i/120*1000));
  }
  // Physics remains at 120 Hz; store fewer compositor keyframes and snapshots.
  if(i%stride===0){
   if(i)planStates.push(states.map(s=>({...s})));
   states.forEach((s,index)=>{if(s.active&&!s.burst)frames[index].push({transform:`translate3d(${s.x}px,${s.y}px,0)`,offset:i/480});});
  }
 }
 plans=bodies.flatMap((b,i)=>frames[i].length?[b.element.animate(frames[i],{duration:4000,easing:'linear',fill:'forwards'})]:[]);
 plans[0].onfinish=()=>{stopPlans();resume();};
}
function animate(now){
 const dt=last?Math.min((now-last)/1000,.05):0;last=now;
 const states=snapshot();
 bodies.forEach((b,i)=>{if(b.grab){states[i].x=b.grab.targetX;states[i].y=b.grab.targetY;if(now-b.grab.time>120){states[i].vx=0;states[i].vy=0;}}});
 if(!reducedMotion.matches){
  const steps=Math.max(1,Math.ceil(dt*120));
  for(let i=0;i<steps;i++)for(const index of physics(states,dt/steps))tint(bodies[index]);
 }
 apply(states);paint();frame=requestAnimationFrame(animate);
}
function resume(){
 cancelAnimationFrame(frame);frame=0;last=0;stopPlans();
 if(!started||document.hidden||shooter?.active||bricks?.active||wonguikung?.active||!bodies.some(b=>b.active&&!b.burst))return;
 if(bodies.some(b=>b.grab)){frame=requestAnimationFrame(animate);return;}
 if(!reducedMotion.matches)playPlans();
}
function resize(){
 stopPlans();
 maxX=Math.max(0,arena.clientWidth-group.clientWidth);maxY=Math.max(0,arena.clientHeight-group.clientHeight);
 radius=Math.min(group.clientWidth,group.clientHeight)*.48;
 bodies.forEach((b,i)=>{
  if(!started){b.x=maxX*(i?.78:.22);b.y=maxY*(i?.65:.35);}
  b.x=Math.max(0,Math.min(maxX,b.x));b.y=Math.max(0,Math.min(maxY,b.y));
  if(b.grab){const rect=arena.getBoundingClientRect();b.grab.left=rect.left;b.grab.top=rect.top;b.grab.targetX=b.x;b.grab.targetY=b.y;}
 });paint();resume();
}
const originalGroupSource=bodies[0].image.src;
// Pre-rendered with the same pixel mapping by scripts/prepare-deformations.py.
// Only the requested stage is downloaded; no image processing runs on the device.
function expandCenter(level){return level?`sprites/group-inflated-${level}.png`:originalGroupSource;}
function inflate(body){
 if(!started||!body.active||body.burst||shooter?.active)return;stopPlans();body.deformation?.cancel();
 if(body.inflation===3){
  body.burst=true;body.image.style.visibility='hidden';body.element.style.pointerEvents='none';body.element.tabIndex=-1;
  if(!reducedMotion.matches){
   const width=body.element.clientWidth,height=body.element.clientHeight;
   const pieces=lowPower?2:4;
   for(let row=0;row<pieces;row++)for(let col=0;col<pieces;col++){
    const fragment=document.createElement('span');fragment.className='group-fragment';
    fragment.style.cssText=`left:${body.x+col*width/pieces}px;top:${body.y+row*height/pieces}px;width:${width/pieces+1}px;height:${height/pieces+1}px;background-image:url("${body.image.src}");background-size:${width}px ${height}px;background-position:${-col*width/pieces}px ${-row*height/pieces}px;filter:${body.image.style.filter}`;
    arena.append(fragment);body.fragments.add(fragment);
    const animation=fragment.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(col-(pieces-1)/2)*55}px,${(row-(pieces-1)/2)*55}px) rotate(${(col-row)*30}deg) scale(.25)`,opacity:0}],{duration:650,easing:'cubic-bezier(.16,.7,.3,1)',fill:'forwards'});
    animation.onfinish=()=>{fragment.remove();body.fragments.delete(fragment);};
   }
  }
  resume();return;
 }else{body.inflation++;body.vx*=2;body.vy*=2;if(body.targetSpeed)body.targetSpeed*=2;}
 const stage=body.inflation,source=expandCenter(stage),image=new Image();
 image.src=source;
 // Retain the previous face until the requested asset has decoded, even offline.
 image.decode().then(()=>{
  if(body.active&&!body.burst&&body.inflation===stage)body.image.src=source;
 }).catch(()=>{});
 body.element.setAttribute('aria-label',body.inflation===3?'Explotar figura':'Inflar figura');
 if(!reducedMotion.matches)body.deformation=body.image.animate([{transform:'translateX(-2px)'},{transform:'translateX(2px)',offset:.35},{transform:'translateX(-1px)',offset:.7},{transform:'translateX(0)'}],{duration:480,easing:'ease-out'});
 resume();
}
function finishGrab(body,event){
 const grab=body.grab;if(!grab||event.pointerId!==grab.id)return;
 clearTimeout(grab.timer);body.grab=null;
 if(grab.dragging){
  body.x=grab.targetX;body.y=grab.targetY;body.suppressUntil=performance.now()+500;
  const speed=Math.hypot(grab.vx,grab.vy);
  if(speed>30&&performance.now()-grab.time<120&&event.type!=='pointercancel'){
   body.targetSpeed=Math.hypot(92,74)*2**body.inflation;
   const launch=Math.max(body.targetSpeed,Math.min(speed,1800));body.vx=grab.vx/speed*launch;body.vy=grab.vy/speed*launch;
  }else{body.vx=grab.savedVx;body.vy=grab.savedVy;}
 }
 body.element.classList.remove('dragging');
 if(body.element.hasPointerCapture(event.pointerId))body.element.releasePointerCapture(event.pointerId);
 paint();
 if(event.type==='pointerup'&&!grab.dragging){body.suppressUntil=performance.now()+600;inflate(body);}
 else resume();
}
for(const body of bodies){
 body.image.addEventListener('load',resize);
 body.element.addEventListener('pointerdown',event=>{
  if(!started||!body.active||body.burst||body.grab||event.button!==0)return;
  stopPlans();const rect=arena.getBoundingClientRect();
  const grab=body.grab={id:event.pointerId,left:rect.left,top:rect.top,offsetX:event.clientX-rect.left-body.x,offsetY:event.clientY-rect.top-body.y,
   startX:event.clientX,startY:event.clientY,previousX:event.clientX,previousY:event.clientY,savedVx:body.vx,savedVy:body.vy,time:performance.now(),vx:0,vy:0,targetX:body.x,targetY:body.y,dragging:false,timer:null};
  body.element.setPointerCapture(event.pointerId);
  grab.timer=setTimeout(()=>{if(!body.burst&&body.grab===grab){grab.dragging=true;body.element.classList.add('dragging');}},180);resume();
 });
 body.element.addEventListener('pointermove',event=>{
  const g=body.grab;if(!g||g.id!==event.pointerId||body.burst)return;
  const now=performance.now(),dt=Math.max((now-g.time)/1000,.008),blend=1-Math.exp(-dt*35);
  if(Math.hypot(event.clientX-g.startX,event.clientY-g.startY)>6){g.dragging=true;clearTimeout(g.timer);body.element.classList.add('dragging');}
  g.vx+=((event.clientX-g.previousX)/dt-g.vx)*blend;g.vy+=((event.clientY-g.previousY)/dt-g.vy)*blend;
  g.previousX=event.clientX;g.previousY=event.clientY;g.time=now;
  if(g.dragging){
   g.targetX=Math.max(0,Math.min(maxX,event.clientX-g.left-g.offsetX));g.targetY=Math.max(0,Math.min(maxY,event.clientY-g.top-g.offsetY));
   body.vx=Math.max(-1000,Math.min(1000,g.vx));body.vy=Math.max(-1000,Math.min(1000,g.vy));
  }
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])body.element.addEventListener(name,event=>{event.stopPropagation();finishGrab(body,event);});
 for(const name of ['contextmenu','dragstart'])body.element.addEventListener(name,event=>event.preventDefault());
 body.element.addEventListener('click',event=>{event.stopPropagation();if(performance.now()<body.suppressUntil)return;inflate(body);});
}
shooter=new window.FaceShooter(arena,originalGroupSource);
bricks=new window.FaceBricks(arena,originalGroupSource);
wonguikung=new window.Wonguikung(arena,originalGroupSource);
function openGame(game){
 bricks.pause();
 wonguikung.pause();
 
 stopPlans();cancelAnimationFrame(frame);frame=0;
 for(const current of [shooter,bricks]){
  current.active=false;current.pointer=null;current.root.hidden=true;cancelAnimationFrame(current.frame);current.frame=0;
 }
 for(const body of bodies){
  if(body.grab){clearTimeout(body.grab.timer);body.grab=null;body.element.classList.remove('dragging');}
  body.element.hidden=true;for(const fragment of body.fragments)fragment.remove();body.fragments.clear();
 }
 game.start();
}


const menu=document.getElementById('site-menu');
const menuToggle=document.getElementById('menu-toggle');
const menuOptions=[...menu.querySelectorAll('.menu-option')];
const footerActions=document.querySelector('.footer-actions');
const pageHeader=document.querySelector('header');
let menuOpen=false,currentScreen='home',menuTaps=0;
let presaveRevealed=false,presaveRevealing=false;
function revealPresave(){
 presaveRevealed=true;presaveRevealing=true;
 const presaveButton=document.getElementById('presave');
 presaveButton.inert=false;presaveButton.removeAttribute('aria-hidden');
 menuToggle.classList.add('revealing');
 footerActions.classList.remove('presave-collapsed');
 menuToggle.setAttribute('aria-label','Abrir menú');
 // Keep the mouth open for the complete reveal, then restore the smile.
 setTimeout(()=>{presaveRevealing=false;menuToggle.classList.remove('revealing');},reducedMotion.matches?0:850);
}
function sizeMenu(){
 menu.style.setProperty('--menu-height',Math.max(0,footerActions.getBoundingClientRect().top-18)+'px');
}
function setMenu(open){
 menuOpen=open;sizeMenu();
 menu.classList.toggle('open',open);menu.inert=!open;
 menu.setAttribute('aria-hidden',String(!open));
 menuToggle.setAttribute('aria-expanded',String(open));
 menuToggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
 arena.inert=open;pageHeader.inert=open;
 if(open){
  wonguikung.cancelDrag();
  for(const game of [shooter,bricks]){
   if(game.pointer!==null&&game.canvas.hasPointerCapture(game.pointer))game.canvas.releasePointerCapture(game.pointer);
   game.pointer=null;game.loop();
  }
  (menuOptions.find(option=>option.dataset.screen===currentScreen)||menuOptions[0]).focus({preventScroll:true});
 }else menuToggle.focus({preventScroll:true});
}
function resetHome(){
 bricks.pause();
 wonguikung.pause();
 stopPlans();cancelAnimationFrame(frame);frame=0;
 for(const game of [shooter,bricks]){
  game.active=false;game.pointer=null;game.root.hidden=true;cancelAnimationFrame(game.frame);game.frame=0;
 }
 bodies.forEach((body,index)=>{
  if(body.grab){clearTimeout(body.grab.timer);if(body.element.hasPointerCapture(body.grab.id))body.element.releasePointerCapture(body.grab.id);}
  body.grab=null;body.deformation?.cancel();body.deformation=null;
  for(const fragment of body.fragments)fragment.remove();body.fragments.clear();
  body.active=index===0;body.burst=false;body.inflation=0;body.targetSpeed=0;body.suppressUntil=0;
  body.vx=index?-92:92;body.vy=index?74:-74;body.hue=index*120;
  body.image.src=originalGroupSource;body.image.style.visibility='';
  body.image.style.filter=index?`sepia(1) saturate(8) hue-rotate(${body.hue}deg) brightness(.95)`:'';
  body.element.classList.remove('dragging');body.element.style.pointerEvents='';body.element.removeAttribute('tabindex');
  body.element.setAttribute('aria-label','Inflar figura');body.element.hidden=index!==0;
  body.x=maxX*(index?.78:.22);body.y=maxY*(index?.65:.35);
 });
 paint();resize();
}
menuToggle.addEventListener('click',()=>{
 if(!presaveRevealed){revealPresave();return;}
 if(presaveRevealing)return;
 if(++menuTaps===6){
  menuTaps=0;currentScreen='bubble';
  for(const item of menuOptions){item.classList.remove('selected');item.removeAttribute('aria-current');}
  setMenu(false);openGame(shooter);return;
 }
 setMenu(!menuOpen);
});
for(const option of menuOptions)option.addEventListener('click',()=>{
 if(option.dataset.screen==='music'){
  setMenu(false);return;
 }
 currentScreen=option.dataset.screen;
 for(const item of menuOptions){
  const selected=item===option;item.classList.toggle('selected',selected);
  if(selected)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
 }
 setMenu(false);
 if(currentScreen==='home')resetHome();else openGame(currentScreen==='wonguikung'?wonguikung:bricks);
});
document.addEventListener('keydown',event=>{
 if(!menuOpen)return;
 if(event.key==='Escape'){event.preventDefault();setMenu(false);}
 if(event.key==='Tab'){
  const focusable=[...menuOptions,menuToggle],index=focusable.indexOf(document.activeElement);
  event.preventDefault();focusable[(index+(event.shiftKey?-1:1)+focusable.length)%focusable.length].focus({preventScroll:true});
 }
});
new ResizeObserver(sizeMenu).observe(footerActions);
window.addEventListener('resize',sizeMenu);

function tapArena(event){
 if(!started||shooter.active||bricks?.active||wonguikung?.active||event.target!==arena)return;
 const other=bodies.find(body=>!body.active);
 if(other){
  stopPlans();
  const rect=arena.getBoundingClientRect();
  other.x=Math.max(0,Math.min(maxX,event.clientX-rect.left-group.clientWidth/2));
  other.y=Math.max(0,Math.min(maxY,event.clientY-rect.top-group.clientHeight/2));
  other.active=true;other.element.hidden=false;paint();resume();return;
 }

}
let arenaTouch=null,arenaClickUntil=0;
arena.addEventListener('pointerdown',event=>{
 if(event.target!==arena||event.button!==0||arenaTouch)return;
 arenaTouch={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
 arena.setPointerCapture(event.pointerId);
});
arena.addEventListener('pointermove',event=>{
 if(arenaTouch?.id===event.pointerId&&Math.hypot(event.clientX-arenaTouch.x,event.clientY-arenaTouch.y)>8)arenaTouch.moved=true;
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])arena.addEventListener(name,event=>{
 if(arenaTouch?.id!==event.pointerId)return;
 const touch=arenaTouch;arenaTouch=null;arenaClickUntil=performance.now()+600;
 if(arena.hasPointerCapture(event.pointerId))arena.releasePointerCapture(event.pointerId);
 if(name==='pointerup'&&!touch.moved)tapArena(event);
});
arena.addEventListener('click',event=>{if(performance.now()<arenaClickUntil)return;tapArena(event);});
document.addEventListener('selectstart',event=>event.preventDefault());
new ResizeObserver(resize).observe(arena);
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const b of bodies)if(b.grab)finishGrab(b,{pointerId:b.grab.id,type:'pointercancel'});resume();});
reducedMotion.addEventListener('change',()=>{resize();resume();});
const assets=[...document.images].map(img=>img.decode().catch(()=>{}));
function enter(){
 if(!loaded||started)return;
 clearTimeout(entranceHintTimer);entranceHintTimer=null;
 entranceHint.classList.remove('visible');
 resize();started=true;main.inert=false;main.removeAttribute('aria-hidden');main.classList.add('ready');loading.classList.add('done');
 loading.removeAttribute('tabindex');loading.setAttribute('aria-hidden','true');
 songVisibility.focus({preventScroll:true});
 startAudio();resume();beginEyeHint();
}
loading.addEventListener('pointerup',event=>{if(event.button===0)enter();});
loading.addEventListener('click',enter);
loading.addEventListener('keydown',event=>{
 if(loaded&&(event.key==='Enter'||event.key===' ')){event.preventDefault();enter();}
});
document.getElementById('presave').addEventListener('click',()=>{
 if(PRESAVE_URL){window.location.assign(PRESAVE_URL);}else{document.getElementById('notice').hidden=false;}
});

// Add songs in order, using local MP3 paths or direct audio URLs.
const TRACKS=[
 {title:'A medio azular',artist:'Lucio 042',album:'Meditación Guiada Para Perros',cover:'covers/meditacion-guiada-para-perros.webp',src:'audio/a-medio-azular.mp3'},
 {title:'200 pesos fuertes (instrumental)',artist:'Lucio 042',album:'Viejo y Clásico (Beattape)',cover:'covers/viejo-y-clasico.webp',src:'audio/200-pesos-fuertes-instrumental.mp3'},
 {title:'Rueguen por Nosotros',artist:'Lucio 042',album:'Rumbo de Cambio',cover:'covers/rumbo-de-cambio.webp',src:'audio/rueguen-por-nosotros.mp3'},
 {title:'Rumbo de Cambio',artist:'Lucio 042 y OCRE 9 (051)',album:'Rumbo de Cambio',cover:'covers/rumbo-de-cambio.webp',src:'audio/rumbo-de-cambio.mp3'}
];
// The eye hides the song panel without interrupting playback.
const songVisibility=document.getElementById('song-visibility');
const songPanel=document.getElementById('song-panel');
const trackCover=document.getElementById('track-cover');
const openEye=new Image();openEye.src='eyesopen.png';
const eyeHint=document.getElementById('eye-hint');
let eyeHintTimer=null,eyeTouched=false;
let eyeOpenAttempts=0,lastEyeTap=-Infinity,eyeCrying=false,eyeTearCount=0;
function shedEyeTear(){
 eyeCrying=true;
 if(++eyeTearCount===3){
  eyeHint.textContent='Basta…';
  eyeHint.classList.add('eye-plea','visible');
 }
 const tear=document.createElement('span');
 tear.className='eye-tear';tear.setAttribute('aria-hidden','true');
 songVisibility.append(tear);
 const falling=tear.animate(reducedMotion.matches?[
  {opacity:1},{opacity:0}
 ]:[
  {transform:'translateY(0) rotate(-45deg)',opacity:1},
  {transform:'translateY(18px) rotate(-45deg)',opacity:.85,offset:.35},
  {transform:'translateY(66px) rotate(-45deg)',opacity:0}
 ],{duration:reducedMotion.matches?250:900,easing:'ease-in',fill:'forwards'});
 const finish=()=>{tear.remove();eyeCrying=false;};
 falling.onfinish=finish;falling.oncancel=finish;
}
function beginEyeHint(){
 if(eyeTouched)return;
 clearTimeout(eyeHintTimer);
 eyeHintTimer=setTimeout(()=>{
  if(!eyeTouched)eyeHint.classList.add('visible');
 },10000);
}
songVisibility.addEventListener('click',()=>{
 if(eyeCrying)return;
 eyeTouched=true;clearTimeout(eyeHintTimer);eyeHint.classList.remove('visible');
 const now=performance.now();
 if(now-lastEyeTap>3000)eyeOpenAttempts=0;
 lastEyeTap=now;
 const visible=songVisibility.getAttribute('aria-expanded')!=='true';
 if(visible&&++eyeOpenAttempts===3){
  eyeOpenAttempts=0;shedEyeTear();return;
 }
 songVisibility.setAttribute('aria-expanded',String(visible));
 songVisibility.setAttribute('aria-label',visible?'Ocultar canción':'Mostrar canción');
 songVisibility.querySelector('img').src=visible?'eyesopen.png':'eyesclos.png';
 songPanel.inert=!visible;songPanel.setAttribute('aria-hidden',String(!visible));
 pageHeader.classList.toggle('song-collapsed',!visible);
 syncWaveform();
});
trackCover.addEventListener('error',()=>{trackCover.hidden=true;});
const audio=document.getElementById('audio');
// Analyse the playing element itself: no second download or simulated motion.
const waveform=document.getElementById('audio-waveform');
const waveformInk=waveform.getContext('2d');
let audioContext=null,waveformAnalyser=null,waveformSamples=null,waveformFrame=0;
function prepareWaveform(){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass||!waveformInk)return;
 if(!audioContext){
  try{
   const context=new AudioContextClass();
   const analyser=context.createAnalyser();
   analyser.fftSize=2048;
   const source=context.createMediaElementSource(audio);
   // Keep playback connected independently of the visualisation branch.
   source.connect(context.destination);
   source.connect(analyser);
   audioContext=context;waveformAnalyser=analyser;
   waveformSamples=new Uint8Array(analyser.fftSize);
  }catch{return;}
 }
 // Called synchronously from the entrance/play gesture, including on iOS.
 if(audioContext.state!=='running')audioContext.resume().catch(()=>{});
}
function drawWaveform(live=false){
 if(!waveformInk)return;
 const width=waveform.clientWidth,height=waveform.clientHeight;
 if(!width||!height)return;
 const scale=Math.min(window.devicePixelRatio||1,2);
 const pixelWidth=Math.round(width*scale),pixelHeight=Math.round(height*scale);
 if(waveform.width!==pixelWidth||waveform.height!==pixelHeight){
  waveform.width=pixelWidth;waveform.height=pixelHeight;
 }
 waveformInk.setTransform(scale,0,0,scale,0,0);
 waveformInk.clearRect(0,0,width,height);
 waveformInk.strokeStyle='#fff';waveformInk.lineWidth=1.2;
 waveformInk.lineJoin='round';waveformInk.lineCap='round';waveformInk.beginPath();
 if(live){
  waveformAnalyser.getByteTimeDomainData(waveformSamples);
  for(let x=0;x<=width;x++){
   const sample=waveformSamples[Math.min(waveformSamples.length-1,Math.floor(x/width*waveformSamples.length))];
   const y=height/2+(sample-128)/128*(height/2-2);
   if(x===0)waveformInk.moveTo(x,y);else waveformInk.lineTo(x,y);
  }
 }else{
  waveformInk.moveTo(0,height/2);waveformInk.lineTo(width,height/2);
 }
 waveformInk.stroke();
}
function syncWaveform(){
 cancelAnimationFrame(waveformFrame);waveformFrame=0;
 const live=waveformAnalyser&&!audio.paused&&!audio.ended&&!audio.error&&!document.hidden&&
  songVisibility.getAttribute('aria-expanded')==='true'&&!reducedMotion.matches;
 drawWaveform(live);
 if(live)waveformFrame=requestAnimationFrame(syncWaveform);
}
for(const event of ['playing','pause','ended','error','emptied','waiting'])audio.addEventListener(event,()=>syncWaveform());
document.addEventListener('visibilitychange',syncWaveform);
reducedMotion.addEventListener('change',syncWaveform);
new ResizeObserver(()=>syncWaveform()).observe(waveform);

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
function startAudio(){
 if(!TRACKS[trackIndex].src)return;
 prepareWaveform();audio.play().catch(syncPlayer);
}
function selectTrack(index){
 if(index<0||index>=TRACKS.length)return;
 audio.pause();trackIndex=index;
 document.querySelector('h1').textContent='"'+TRACKS[index].title+'"';
 document.getElementById('track-artist').textContent=TRACKS[index].artist;
 document.getElementById('track-album').textContent=TRACKS[index].album;
 trackCover.hidden=!TRACKS[index].cover;
 if(TRACKS[index].cover)trackCover.src=TRACKS[index].cover;
 else trackCover.removeAttribute('src');
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

// Every visit includes three seconds of simulated loading, even with cached assets.
// The hint countdown starts only when both simulated and actual loading finish.
let entranceAssetsReady=false,entranceMinimumElapsed=false;
function syncEntrance(){
 if(started)return;
 const wasLoaded=loaded;
 loaded=entranceMinimumElapsed&&entranceAssetsReady;
 if(loaded!==wasLoaded)resetEntranceHint();
 loading.classList.toggle('is-loading',!loaded);
 loading.style.cursor=loaded?'pointer':'default';
 loading.setAttribute('role',loaded?'button':'status');
 loading.setAttribute('aria-label',loaded?'Entrar':'Cargando');
 if(loaded)loading.tabIndex=0;else loading.removeAttribute('tabindex');
}
for(const event of ['loadeddata','canplay','canplaythrough','progress','waiting','stalled','error','emptied'])audio.addEventListener(event,syncEntrance);
Promise.all(assets).then(()=>{
 entranceAssetsReady=true;syncEntrance();

});
setTimeout(()=>{entranceMinimumElapsed=true;syncEntrance();},3000);
syncEntrance();

// Replaced with the commit SHA by the Pages build, for every deployment.
const BUILD_VERSION='e89cd0c50c4adf181dbc6426d8942cd0b1f3abae';
let checkingUpdate=false;
async function checkForUpdate(){
 if(checkingUpdate||document.hidden||BUILD_VERSION.startsWith('__'))return;
 checkingUpdate=true;
 try{
  const versionURL=new URL('version.json',location.href);
  versionURL.searchParams.set('t',Date.now());
  const response=await fetch(versionURL,{cache:'no-store'});
  if(!response.ok)return;
  const {version}=await response.json();
  if(typeof version!=='string'||!/^[a-f0-9]{40}$/.test(version)||version===BUILD_VERSION)return;
  // Avoid reload loops if the CDN temporarily serves an older HTML document.
  const previousReload=JSON.parse(sessionStorage.getItem('042-update')||'null');
  if(previousReload?.version===version&&Date.now()-previousReload.time<120000)return;
  sessionStorage.setItem('042-update',JSON.stringify({version,time:Date.now()}));
  const destination=new URL(location.href);
  destination.searchParams.set('v',version);
  location.replace(destination.href);
 }catch{
  // Offline visits continue normally; the next check retries automatically.
 }finally{checkingUpdate=false;}
}
checkForUpdate();
setInterval(checkForUpdate,30000);
window.addEventListener('pageshow',checkForUpdate);
window.addEventListener('online',checkForUpdate);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate();});
