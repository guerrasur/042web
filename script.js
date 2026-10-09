'use strict';
// Add the official pre-save URL here when available.
const PRESAVE_URL = '';
const loading = document.getElementById('loading');
const main = document.getElementById('main');
const arena = document.getElementById('arena');
const group = document.getElementById('group');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let x=0,y=0,vx=92,vy=74,maxX=0,maxY=0,last=0,frame=0,started=false,loaded=false;
let hue=0;
function changeColor(){
 hue=(hue+70+Math.random()*140)%360;
 group.style.filter=`sepia(1) saturate(8) hue-rotate(${hue}deg) brightness(.95)`;
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
group.addEventListener('load',resize);
document.addEventListener('visibilitychange',resume);
reducedMotion.addEventListener('change',()=>{resize();resume();});
const assets=[...document.images].map(img=>img.decode().catch(()=>{}));
function enter(){
 if(!loaded||started)return;
 resize();started=true;main.inert=false;main.removeAttribute('aria-hidden');main.classList.add('ready');loading.classList.add('done');
 loading.removeAttribute('tabindex');loading.setAttribute('aria-hidden','true');
 document.getElementById('presave').focus({preventScroll:true});resume();
}
loading.addEventListener('click',enter);
loading.addEventListener('keydown',event=>{
 if(loaded&&(event.key==='Enter'||event.key===' ')){event.preventDefault();enter();}
});
Promise.all([Promise.all(assets),new Promise(resolve=>setTimeout(resolve,3000))]).then(()=>{
 loaded=true;
 const logo=loading.querySelector('.logo');logo.style.animation='none';logo.style.opacity='1';
 loading.style.cursor='pointer';loading.setAttribute('role','button');loading.setAttribute('aria-label','Entrar');loading.tabIndex=0;
});
document.getElementById('presave').addEventListener('click',()=>{
 if(PRESAVE_URL){window.location.assign(PRESAVE_URL);}else{document.getElementById('notice').hidden=false;}
});
