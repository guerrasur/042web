'use strict';
// Add the official pre-save URL here when available.
const PRESAVE_URL = '';
const loading = document.getElementById('loading');
const main = document.getElementById('main');
const arena = document.getElementById('arena');
const group = document.getElementById('group');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let x=0,y=0,vx=46,vy=37,maxX=0,maxY=0,last=0,frame=0,started=false;
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
 while(next<0||next>limit){if(next<0){next=-next;velocity=Math.abs(velocity);}if(next>limit){next=2*limit-next;velocity=-Math.abs(velocity);}}
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
Promise.all([Promise.all(assets),new Promise(resolve=>setTimeout(resolve,3000))]).then(()=>{
 resize();started=true;main.inert=false;main.removeAttribute('aria-hidden');main.classList.add('ready');loading.classList.add('done');resume();
});
document.getElementById('presave').addEventListener('click',()=>{
 if(PRESAVE_URL){window.location.assign(PRESAVE_URL);}else{document.getElementById('notice').hidden=false;}
});
