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
let started=false,loaded=false,frame=0,last=0,maxX=0,maxY=0,radius=40;
let plans=null,planStates=null;
let shooterTimer=null;
let shooter=null;
let bricks=null;
let presaveTaps=0;
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
function paint(){for(const b of bodies)b.element.style.transform=`translate3d(${b.x}px,${b.y}px,0)`;}
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
  const index=Math.min(480,Math.floor(time*120));
  const states=planStates[index].map(s=>({...s}));
  physics(states,Math.max(0,time-index/120));apply(states);
  for(const animation of plans)animation.cancel();plans=null;planStates=null;paint();
 }
 for(const timer of colorTimers)clearTimeout(timer);colorTimers.length=0;
}
function playPlans(){
 const states=snapshot(),frames=bodies.map(()=>[]);planStates=[states.map(s=>({...s}))];
 for(let i=0;i<=480;i++){
  if(i){
   const hits=physics(states,1/120);
   for(const index of hits)colorTimers.push(setTimeout(()=>tint(bodies[index]),i/120*1000));
   planStates.push(states.map(s=>({...s})));
  }
  states.forEach((s,index)=>frames[index].push({transform:`translate3d(${s.x}px,${s.y}px,0)`,offset:i/480}));
 }
 plans=bodies.map((b,i)=>b.element.animate(frames[i],{duration:4000,easing:'linear',fill:'forwards'}));
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
 if(!started||document.hidden||shooter?.active||bricks?.active)return;
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
let groupPixels;
const deformationSources=new Map([[0,originalGroupSource]]);
function expandCenter(level){
 if(deformationSources.has(level))return deformationSources.get(level);
 const canvas=document.createElement('canvas');
 if(!groupPixels){
  canvas.width=bodies[0].image.naturalWidth;canvas.height=bodies[0].image.naturalHeight;
  const context=canvas.getContext('2d');context.drawImage(bodies[0].image,0,0);
  groupPixels=context.getImageData(0,0,canvas.width,canvas.height);
 }
 const {width,height,data}=groupPixels;canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d'),output=context.createImageData(width,height),power=1+level*.45;
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const nx=(px-(width-1)/2)/(width/2),ny=(py-(height-1)/2)/(height/2),r=Math.hypot(nx,ny);
  const factor=r>0&&r<1?Math.pow(r,power-1):1;
  const sx=Math.max(0,Math.min(width-1,(width-1)/2+nx*factor*width/2));
  const sy=Math.max(0,Math.min(height-1,(height-1)/2+ny*factor*height/2));
  const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
  const a=(iy*width+ix)*4,b=(iy*width+Math.min(ix+1,width-1))*4;
  const c=(Math.min(iy+1,height-1)*width+ix)*4,d=(Math.min(iy+1,height-1)*width+Math.min(ix+1,width-1))*4;
  for(let ch=0;ch<4;ch++)output.data[(py*width+px)*4+ch]=(data[a+ch]*(1-fx)+data[b+ch]*fx)*(1-fy)+(data[c+ch]*(1-fx)+data[d+ch]*fx)*fy;
 }
 context.putImageData(output,0,0);const source=canvas.toDataURL('image/png');deformationSources.set(level,source);return source;
}
function inflate(body){
 if(!started||!body.active||body.burst||shooter?.active)return;clearTimeout(shooterTimer);stopPlans();body.deformation?.cancel();
 if(body.inflation===3){
  body.burst=true;body.image.style.visibility='hidden';body.element.style.pointerEvents='none';body.element.tabIndex=-1;
  if(!reducedMotion.matches){
   const width=body.element.clientWidth,height=body.element.clientHeight;
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const fragment=document.createElement('span');fragment.className='group-fragment';
    fragment.style.cssText=`left:${body.x+col*width/4}px;top:${body.y+row*height/4}px;width:${width/4+1}px;height:${height/4+1}px;background-image:url("${body.image.src}");background-size:${width}px ${height}px;background-position:${-col*width/4}px ${-row*height/4}px;filter:${body.image.style.filter}`;
    arena.append(fragment);body.fragments.add(fragment);
    const animation=fragment.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(col-1.5)*55}px,${(row-1.5)*55}px) rotate(${(col-row)*30}deg) scale(.25)`,opacity:0}],{duration:650,easing:'cubic-bezier(.16,.7,.3,1)',fill:'forwards'});
    animation.onfinish=()=>{fragment.remove();body.fragments.delete(fragment);};
   }
  }
  if(bodies.every(b=>b.burst))shooterTimer=setTimeout(()=>{
   if(!bodies.every(b=>b.burst)||shooter?.active||bricks?.active)return;
   openGame(bricks);
  },950);
  resume();return;
 }else{body.inflation++;body.vx*=2;body.vy*=2;if(body.targetSpeed)body.targetSpeed*=2;}
 body.image.src=expandCenter(body.inflation);
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
function openGame(game){
 clearTimeout(shooterTimer);shooterTimer=null;
 stopPlans();cancelAnimationFrame(frame);frame=0;
 for(const current of [shooter,bricks]){
  current.active=false;current.pointer=null;current.root.hidden=true;cancelAnimationFrame(current.frame);
 }
 for(const body of bodies){
  if(body.grab){clearTimeout(body.grab.timer);body.grab=null;body.element.classList.remove('dragging');}
  body.element.hidden=true;for(const fragment of body.fragments)fragment.remove();body.fragments.clear();
 }
 game.start();
}

function tapArena(event){
 if(!started||shooter.active||bricks?.active||event.target!==arena)return;
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
 document.getElementById('play-pause').disabled ? document.getElementById('presave').focus({preventScroll:true}) : document.getElementById('play-pause').focus({preventScroll:true});
 startAudio();resume();
}
loading.addEventListener('pointerup',event=>{if(event.button===0)enter();});
loading.addEventListener('click',enter);
loading.addEventListener('keydown',event=>{
 if(loaded&&(event.key==='Enter'||event.key===' ')){event.preventDefault();enter();}
});
document.getElementById('presave').addEventListener('click',()=>{
 if(started&&++presaveTaps===10){
  presaveTaps=0;document.getElementById('notice').hidden=true;openGame(shooter);return;
 }
 if(PRESAVE_URL){window.location.assign(PRESAVE_URL);}else{document.getElementById('notice').hidden=false;}
});

// Add songs in order, using local MP3 paths or direct audio URLs.
const TRACKS=[
 {title:'A medio azular',album:'Meditación Guiada Para Perros',edition:'EP (2026)',src:'audio/a-medio-azular.mp3'},
 {title:'200 pesos fuertes (instrumental)',src:'audio/200-pesos-fuertes-instrumental.mp3'}
];
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

// Every visit includes three seconds of simulated loading, even with cached assets.
// The hint countdown starts only when both simulated and actual loading finish.
let entranceAssetsReady=false,entranceMinimumElapsed=false;
function syncEntrance(){
 if(started)return;
 const audioReady=!TRACKS[0].src||audio.readyState>=HTMLMediaElement.HAVE_FUTURE_DATA||Boolean(audio.error);
 const wasLoaded=loaded;
 loaded=entranceMinimumElapsed&&entranceAssetsReady&&audioReady;
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
 // Prepare the three deformation stages during loading, before the first tap.
 let stage=1;
 const warm=()=>{
  if(bodies[0].image.naturalWidth){try{expandCenter(stage);}catch{/* A later tap can retry. */}}
  if(++stage<=3)setTimeout(warm,24);
 };
 setTimeout(warm,0);
});
setTimeout(()=>{entranceMinimumElapsed=true;syncEntrance();},3000);
syncEntrance();

// Replaced with the commit SHA by the Pages build, for every deployment.
const BUILD_VERSION='1ddb4bbb6751181d2d5cde39f9b03ff2e45f2bc3';
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
