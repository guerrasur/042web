'use strict';
(() => {
 const KEY='042-wonguikung',HUNGER=6*60*60*1000,WINDOW=10*60*1000,LIMIT=10;
 const PHASES=['hello','question','naming','thanks','ready','dead'];
 const NAME=/^[BCDFGHJKLMNPQRSTVWXYZ][aeiou][bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$/;
 function names(){
  const result=new Set(),consonants='bcdfghjklmnpqrstvwxyz',vowels='aeiou';
  while(result.size<3){let name='';for(let i=0;i<6;i++){const letters=i%2?vowels:consonants;name+=letters[Math.floor(Math.random()*letters.length)];}result.add(name[0].toUpperCase()+name.slice(1));}
  return [...result];
 }
 function born(now,previousHue){
  return {version:1,phase:'hello',phaseAt:now,bornAt:now,lastFedAt:now,feeds:[],name:'',choices:names(),hue:previousHue===undefined?Math.floor(Math.random()*360):(previousHue+90+Math.floor(Math.random()*181))%360};
 }
 function reconcile(state,now){
  if(state.phase==='dead')return false;
  if(now-state.lastFedAt>=HUNGER){state.phase='dead';state.phaseAt=state.lastFedAt+HUNGER;return true;}
  let changed=false;
  for(const [from,to,delay] of [['hello','question',2800],['question','naming',800],['thanks','ready',1600]]){
   if(state.phase===from&&now-state.phaseAt>=delay){state.phase=to;state.phaseAt+=delay;changed=true;}
  }
  return changed;
 }
 function feed(state,now){
  reconcile(state,now);
  if(state.phase!=='ready')return false;
  state.feeds=state.feeds.filter(time=>now-time<=WINDOW);
  state.feeds.push(now);state.lastFedAt=now;
  if(state.feeds.length>=LIMIT){state.phase='dead';state.phaseAt=now;}
  return true;
 }
 function read(raw){
  try{
   const s=JSON.parse(raw);
   if(!s||s.version!==1||!PHASES.includes(s.phase)||!Number.isInteger(s.hue)||s.hue<0||s.hue>=360)return null;
   if(['bornAt','lastFedAt','phaseAt'].some(key=>!Number.isFinite(s[key])||s[key]<0))return null;
   if(!Array.isArray(s.feeds)||s.feeds.length>LIMIT||s.feeds.some(t=>!Number.isFinite(t)||t<0))return null;
   if(!Array.isArray(s.choices)||s.choices.length!==3||new Set(s.choices).size!==3||s.choices.some(n=>typeof n!=='string'||!NAME.test(n)))return null;
   if(typeof s.name!=='string'||(s.name&&!s.choices.includes(s.name))||(['thanks','ready'].includes(s.phase)&&!s.name))return null;
   return s;
  }catch{return null;}
 }
 const apple='<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#94b981" d="M34 16c0-9 7-13 16-12-1 9-7 14-16 12"/><path fill="none" stroke="#ddd" stroke-width="3" d="m33 24-3-14"/><path fill="#fa8429" d="M32 23C18 12 7 23 9 37c2 15 13 24 23 19 10 5 21-4 23-19 2-14-9-25-23-14Z"/><path fill="none" stroke="#ffd4b3" stroke-width="3" stroke-linecap="round" d="M18 30c-3 5-2 10 0 13"/></svg>';
 const broom='<svg viewBox="0 0 100 160" aria-hidden="true"><path stroke="#fa8429" stroke-width="8" stroke-linecap="square" d="M67 4 44 107"/><path fill="#eee" d="m29 96 33 8 18 41-64-16Z"/><path fill="none" stroke="#000" stroke-width="3" d="m32 108-6 23m15-21-5 24m15-21-4 23m13-20-3 22"/></svg>';
 const eyes=[[167,65],[257,60],[64,145],[111,126],[325,128],[366,148]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="19" ry="15" fill="#000"/><path d="M${x-10} ${y-10}l20 20m-20 0 20-20"/>`).join('');
 class Wonguikung {
  constructor(arena,source){
   this.active=false;this.state=null;this.drag=null;this.animations=[];this.busy=false;this.timer=null;this.actionTimer=null;
   try{this.state=read(localStorage.getItem(KEY));}catch{}
   this.root=document.createElement('section');this.root.className='wonguikung';this.root.hidden=true;this.root.setAttribute('aria-label','Tu Wonguikung');
   this.root.innerHTML=`<p class="wonguikung-name"></p><div class="wonguikung-stage"><button class="wonguikung-pet" type="button" disabled aria-label="Tu Wonguikung"><span class="wonguikung-sprite"><img alt="" draggable="false"><svg class="wonguikung-eyes" viewBox="0 0 427 330" aria-hidden="true">${eyes}</svg></span></button><span class="wonguikung-broom" hidden>${broom}</span></div><div class="wonguikung-dialogue"><p class="wonguikung-text" role="status" aria-live="polite"></p><div class="wonguikung-names" hidden></div><button class="wonguikung-apple" type="button" aria-label="Arrastrá la manzana hasta tu Wonguikung para darle de comer" hidden>${apple}</button></div>`;
   arena.append(this.root);
   this.pet=this.root.querySelector('.wonguikung-pet');this.sprite=this.root.querySelector('.wonguikung-sprite');this.sprite.querySelector('img').src=source;
   this.nameLabel=this.root.querySelector('.wonguikung-name');this.text=this.root.querySelector('.wonguikung-text');this.choices=this.root.querySelector('.wonguikung-names');this.apple=this.root.querySelector('.wonguikung-apple');this.broom=this.root.querySelector('.wonguikung-broom');
   this.stage=this.root.querySelector('.wonguikung-stage');
   for(const type of ['click','pointerdown','pointerup'])this.root.addEventListener(type,e=>e.stopPropagation());
   this.pet.addEventListener('click',()=>this.sweep());
   this.apple.addEventListener('pointerdown',e=>this.beginDrag(e));
   this.apple.addEventListener('pointermove',e=>this.moveDrag(e));
   this.apple.addEventListener('pointerup',e=>this.endDrag(e));
   for(const type of ['pointercancel','lostpointercapture'])this.apple.addEventListener(type,()=>this.cancelDrag());
   this.apple.addEventListener('click',e=>{if(e.detail===0)this.eat();});
   this.root.addEventListener('contextmenu',e=>e.preventDefault());
   document.addEventListener('visibilitychange',()=>{this.cancelDrag();if(document.hidden)this.save();else if(this.active){this.tick();this.schedule();}});
   window.addEventListener('pagehide',()=>this.save());
   window.addEventListener('pageshow',()=>{if(this.active){this.tick();this.schedule();}});
   window.addEventListener('storage',e=>{if(e.key!==KEY)return;const state=read(e.newValue);if(state){this.cancelAction();this.state=state;if(this.active){this.tick();this.render();this.schedule();}}});
   new ResizeObserver(()=>{this.cancelDrag();this.size();}).observe(this.stage);
  }
  save(){if(this.state)try{localStorage.setItem(KEY,JSON.stringify(this.state));}catch{}}
  start(){
   this.active=true;this.root.hidden=false;
   this.size();
   if(!this.state){this.state=born(Date.now());this.save();this.render();this.grow();}
   else{this.tick();this.render();}
   this.schedule();
  }
  pause(){this.active=false;this.root.hidden=true;clearTimeout(this.timer);this.cancelDrag();this.cancelAction();this.save();}
  size(){this.root.style.setProperty('--pet-size',Math.max(0,this.stage.clientHeight*427/330)+'px');}
  tick(){if(this.state&&reconcile(this.state,Date.now())){if(this.state.phase==='dead')this.cancelAction();this.save();this.render();}}
  schedule(){
   clearTimeout(this.timer);
   if(!this.active||document.hidden||this.state.phase==='dead')return;
   const s=this.state,delays={hello:2800,question:800,thanks:1600};
   const untilPhase=delays[s.phase]===undefined?Infinity:s.phaseAt+delays[s.phase]-Date.now();
   const delay=Math.max(1,Math.min(1000,untilPhase,s.lastFedAt+HUNGER-Date.now()));
   this.timer=setTimeout(()=>{this.tick();this.schedule();},delay);
  }
  render(){
   const s=this.state;if(!s)return;
   this.root.classList.toggle('is-dead',s.phase==='dead');
   this.sprite.style.filter=`sepia(1) saturate(8) hue-rotate(${s.hue}deg) brightness(.95)`;
   this.nameLabel.textContent=s.name;
   this.pet.disabled=s.phase!=='dead'||this.busy;
   this.pet.setAttribute('aria-label',s.phase==='dead'?'Barrer a tu Wonguikung y recibir uno nuevo':s.name||'Tu Wonguikung');
   const words={hello:'Hola umano',question:'¿Cual es mi nombre?',naming:'¿Cual es mi nombre?',thanks:'Gracias',ready:'',dead:''};
   if(this.text.textContent!==words[s.phase])this.text.textContent=words[s.phase];
   this.text.hidden=!words[s.phase];this.choices.hidden=s.phase!=='naming';this.apple.hidden=s.phase!=='ready';this.apple.disabled=this.busy;
   if(s.phase==='naming'&&this.choices.dataset.names!==s.choices.join(',')){
    this.choices.replaceChildren();this.choices.dataset.names=s.choices.join(',');
    for(const name of s.choices){const button=document.createElement('button');button.type='button';button.textContent=name;button.addEventListener('click',()=>this.choose(name));this.choices.append(button);}
   }
  }
  choose(name){
   this.tick();if(this.state.phase!=='naming'||!this.state.choices.includes(name))return;
   this.state.name=name;this.state.phase='thanks';this.state.phaseAt=Date.now();this.save();this.render();this.schedule();
  }
  beginDrag(e){
   this.tick();if(e.button!==0||this.drag||this.busy||this.state.phase!=='ready')return;
   e.preventDefault();const rect=this.apple.getBoundingClientRect();
   this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:rect.left+rect.width/2,cy:rect.top+rect.height/2,moved:false};
   this.apple.setPointerCapture(e.pointerId);this.apple.classList.add('dragging');
  }
  moveDrag(e){
   const d=this.drag;if(!d||d.id!==e.pointerId)return;
   const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>6)d.moved=true;
   this.apple.style.transform=`translate(${dx}px,${dy}px) scale(1.12)`;
   this.root.classList.toggle('can-feed',this.insidePet(d.cx+dx,d.cy+dy));
  }
  insidePet(x,y){const r=this.pet.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
  endDrag(e){
   const d=this.drag;if(!d||d.id!==e.pointerId)return;
   const accepted=d.moved&&this.insidePet(d.cx+e.clientX-d.x,d.cy+e.clientY-d.y);
   this.cancelDrag();if(accepted)this.eat();
  }
  cancelDrag(){
   const d=this.drag;this.drag=null;this.apple.style.transform='';this.apple.classList.remove('dragging');this.root.classList.remove('can-feed');
   if(d&&this.apple.hasPointerCapture(d.id))this.apple.releasePointerCapture(d.id);
  }
  motion(element,frames,duration){
   const animation=element.animate(frames,{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?Math.min(duration,140):duration,easing:'ease-in-out'});
   this.animations.push(animation);return animation;
  }
  eat(){
   this.tick();if(!this.active||this.busy||!feed(this.state,Date.now()))return;
   this.save();this.render();if(this.state.phase==='dead'){this.schedule();return;}
   this.busy=true;this.apple.disabled=true;this.apple.classList.add('is-eaten');
   this.motion(this.sprite,[{transform:'scale(1)'},{transform:'scale(1.08,.86)',offset:.2},{transform:'scale(.95,1.08)',offset:.4},{transform:'scale(1.07,.9)',offset:.65},{transform:'scale(1)'}],650);
   this.actionTimer=setTimeout(()=>{this.cancelAction();this.render();},650);
  }
  grow(){this.motion(this.pet,[{transform:'scale(.001)',opacity:0},{transform:'scale(.05)',opacity:1,offset:.2},{transform:'scale(1.07)',offset:.8},{transform:'scale(1)'}],1200);}
  cancelAction(){clearTimeout(this.actionTimer);this.actionTimer=null;for(const a of this.animations)a.cancel();this.animations=[];this.busy=false;this.broom.hidden=true;this.apple.classList.remove('is-eaten');}
  sweep(){
   if(!this.active||this.busy||this.state.phase!=='dead')return;
   this.busy=true;this.pet.disabled=true;this.broom.hidden=false;
   this.motion(this.broom,[{transform:'translateX(160%) rotate(-20deg)',opacity:0},{transform:'translateX(40%) rotate(-20deg)',opacity:1,offset:.2},{transform:'translateX(-110%) rotate(15deg)',opacity:1,offset:.85},{transform:'translateX(-170%) rotate(15deg)',opacity:0}],1000);
   this.motion(this.pet,[{transform:'translateX(0)',opacity:1},{transform:'translateX(0)',opacity:1,offset:.25},{transform:'translateX(-120%) rotate(-25deg)',opacity:0}],1000);
   this.actionTimer=setTimeout(()=>{const hue=this.state.hue;this.cancelAction();this.state=born(Date.now(),hue);this.save();this.render();this.grow();this.schedule();},1000);
  }
 }
 window.Wonguikung=Wonguikung;
 // Keep the real-time rules independent of the DOM for boundary checks.
 window.WonguikungRules=Object.freeze({born,reconcile,feed,read,HUNGER,WINDOW,LIMIT});
})();
