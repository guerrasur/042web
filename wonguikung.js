'use strict';
(() => {
 const KEY='042-wonguikung',HUNGER=6*60*60*1000,WINDOW=10*60*1000,LIMIT=4;
 const PHASES=['hello','question','naming','thanks','ready','dead'];
 const NAME=/^[BCDFGHJKLMNPQRSTVWXYZ][aeiou][bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$/;
 function names(){
  const result=new Set(),consonants='bcdfghjklmnpqrstvwxyz',vowels='aeiou';
  while(result.size<3){let name='';for(let i=0;i<6;i++){const letters=i%2?vowels:consonants;name+=letters[Math.floor(Math.random()*letters.length)];}result.add(name[0].toUpperCase()+name.slice(1));}
  return [...result];
 }
 function born(now,previousHue,number=1,cadavers=[]){
  return {version:1,number,cadavers:[...cadavers],phase:'hello',phaseAt:now,bornAt:now,lastFedAt:now,feeds:[],name:'',choices:names(),hue:previousHue===undefined?Math.floor(Math.random()*360):(previousHue+90+Math.floor(Math.random()*181))%360};
 }
 function archiveDead(s){
  if(s.phase!=='dead'||s.cadavers.some(p=>p.number===s.number))return false;
  s.cadavers.push({number:s.number,name:s.name,hue:s.hue,bornAt:s.bornAt,diedAt:s.phaseAt});return true;
 }
 function reconcile(state,now){
  if(state.phase==='dead')return false;
  if(now-state.lastFedAt>=HUNGER){state.phase='dead';state.phaseAt=state.lastFedAt+HUNGER;return true;}
  const recent=state.feeds.filter(time=>now-time<=WINDOW);
  if(recent.length>=LIMIT){state.phase='dead';state.phaseAt=recent[LIMIT-1];return true;}
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
   // Preserve saves made before the food limit changed from ten to four.
   if(!Array.isArray(s.feeds)||s.feeds.length>10||s.feeds.some(t=>!Number.isFinite(t)||t<0))return null;
   if(!Array.isArray(s.choices)||s.choices.length!==3||new Set(s.choices).size!==3||s.choices.some(n=>typeof n!=='string'||!NAME.test(n)))return null;
   if(typeof s.name!=='string'||(s.name&&!s.choices.includes(s.name))||(['thanks','ready'].includes(s.phase)&&!s.name))return null;
   // Old saves retain their current pet and begin numbering at one.
   if(s.number===undefined)s.number=1;
   if(s.cadavers===undefined)s.cadavers=[];
   if(!Number.isSafeInteger(s.number)||s.number<1||!Array.isArray(s.cadavers))return null;
   const numbers=new Set();
   for(const p of s.cadavers){
    if(!p||!Number.isSafeInteger(p.number)||p.number<1||p.number>s.number||numbers.has(p.number))return null;
    if(p.number===s.number&&s.phase!=='dead')return null;
    if(typeof p.name!=='string'||(p.name&&!NAME.test(p.name))||!Number.isInteger(p.hue)||p.hue<0||p.hue>=360)return null;
    if(!Number.isFinite(p.bornAt)||p.bornAt<0||!Number.isFinite(p.diedAt)||p.diedAt<p.bornAt)return null;
    numbers.add(p.number);
   }
   return s;
  }catch{return null;}
 }
 const apple='<img src="manz.png" alt="" aria-hidden="true" draggable="false">';
 const broom='<img src="escoba.png" alt="" aria-hidden="true" draggable="false">';
 const eyes=[[167,65],[257,60],[64,145],[111,126],[325,128],[366,148]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="19" ry="15" fill="#000"/><path d="M${x-10} ${y-10}l20 20m-20 0 20-20"/>`).join('');
 class Wonguikung {
  constructor(arena,source){
   this.active=false;this.state=null;this.drag=null;this.animations=[];this.busy=false;this.timer=null;this.actionTimer=null;this.source=source;this.historyOpen=false;
   try{this.state=read(localStorage.getItem(KEY));}catch{}
   this.root=document.createElement('section');this.root.className='wonguikung';this.root.hidden=true;this.root.setAttribute('aria-label','Tu Wonguikung');
   this.root.innerHTML=`<div class="wonguikung-tools" hidden><button class="wonguikung-history-button" type="button" aria-controls="wonguikung-cadavers" aria-expanded="false">Tus cadáveres</button></div><p class="wonguikung-name"></p><div class="wonguikung-stage"><button class="wonguikung-pet" type="button" disabled aria-label="Tu Wonguikung"><span class="wonguikung-sprite"><img alt="" draggable="false"><svg class="wonguikung-eyes" viewBox="0 0 427 330" aria-hidden="true">${eyes}</svg></span></button><span class="wonguikung-broom" hidden>${broom}</span></div><div class="wonguikung-dialogue"><p class="wonguikung-text" role="status" aria-live="polite"></p><div class="wonguikung-names" hidden></div><button class="wonguikung-apple" type="button" aria-label="Arrastrá la manzana hasta tu Wonguikung para darle de comer" hidden>${apple}</button></div>`;
   arena.append(this.root);
   this.pet=this.root.querySelector('.wonguikung-pet');this.sprite=this.root.querySelector('.wonguikung-sprite');this.sprite.querySelector('img').src=source;
   this.nameLabel=this.root.querySelector('.wonguikung-name');this.text=this.root.querySelector('.wonguikung-text');this.choices=this.root.querySelector('.wonguikung-names');this.apple=this.root.querySelector('.wonguikung-apple');this.broom=this.root.querySelector('.wonguikung-broom');
   this.stage=this.root.querySelector('.wonguikung-stage');
   this.historyTools=this.root.querySelector('.wonguikung-tools');this.historyButton=this.root.querySelector('.wonguikung-history-button');
   this.page=document.getElementById('main');
   this.history=document.createElement('aside');this.history.id='wonguikung-cadavers';this.history.className='wonguikung-cadavers';this.history.inert=true;
   this.history.setAttribute('aria-hidden','true');this.history.setAttribute('aria-labelledby','wonguikung-cadavers-title');
   this.history.innerHTML='<div class="cadavers-header"><h2 id="wonguikung-cadavers-title">Tus cadáveres</h2><button class="cadavers-return" type="button" aria-label="Volver a Tu Wonguikung"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button></div><div class="cadavers-grid" role="list"></div>';
   document.body.append(this.history);this.historyGrid=this.history.querySelector('.cadavers-grid');this.historyReturn=this.history.querySelector('.cadavers-return');
   this.historyButton.addEventListener('click',()=>this.openHistory());this.historyReturn.addEventListener('click',()=>this.closeHistory());
   this.history.addEventListener('keydown',e=>{if(!this.historyOpen)return;if(e.key==='Escape'){e.preventDefault();this.closeHistory();}else if(e.key==='Tab'){e.preventDefault();this.historyReturn.focus({preventScroll:true});}});
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
  save(){if(this.state){archiveDead(this.state);try{localStorage.setItem(KEY,JSON.stringify(this.state));}catch{}}}
  start(){
   this.active=true;this.root.hidden=false;
   this.size();
   if(!this.state){this.state=born(Date.now());this.save();this.render();this.grow();}
   else{this.tick();this.save();this.render();}
   this.schedule();
  }
  pause(){this.closeHistory(false);this.active=false;this.root.hidden=true;clearTimeout(this.timer);this.cancelDrag();this.cancelAction();this.save();}
  openHistory(){
   if(!this.active||this.busy||this.historyOpen||!this.state.cadavers.some(p=>p.number<this.state.number))return;
   this.cancelDrag();this.renderHistory();this.historyOpen=true;
   this.previousInert=this.page.inert;this.previousAria=this.page.getAttribute('aria-hidden');
   this.page.inert=true;this.page.setAttribute('aria-hidden','true');this.page.classList.add('cadavers-open');
   this.history.classList.add('open');this.history.inert=false;this.history.setAttribute('aria-hidden','false');this.historyButton.setAttribute('aria-expanded','true');
   this.historyReturn.focus({preventScroll:true});
  }
  closeHistory(focus=true){
   if(!this.historyOpen)return;
   this.historyOpen=false;this.history.classList.remove('open');this.history.inert=true;this.history.setAttribute('aria-hidden','true');
   this.page.classList.remove('cadavers-open');this.page.inert=this.previousInert;
   if(this.previousAria===null)this.page.removeAttribute('aria-hidden');else this.page.setAttribute('aria-hidden',this.previousAria);
   this.historyButton.setAttribute('aria-expanded','false');if(focus&&this.active)this.historyButton.focus({preventScroll:true});
  }
  renderHistory(){
   const signature=JSON.stringify(this.state.cadavers);if(this.historySignature===signature)return;
   this.historySignature=signature;this.historyGrid.replaceChildren();
   for(const p of this.state.cadavers){
    const card=document.createElement('div');card.className='cadaver-card is-dead';card.setAttribute('role','listitem');
    card.innerHTML=`<p class="cadaver-number"></p><span class="wonguikung-sprite"><img alt="" draggable="false"><svg class="wonguikung-eyes" viewBox="0 0 427 330" aria-hidden="true">${eyes}</svg></span><p class="cadaver-name"></p>`;
    card.querySelector('.cadaver-number').textContent='#'+p.number;card.querySelector('.cadaver-name').textContent=p.name||'Sin nombre';
    const sprite=card.querySelector('.wonguikung-sprite');sprite.querySelector('img').src=this.source;sprite.style.filter=`sepia(1) saturate(8) hue-rotate(${p.hue}deg) brightness(.95)`;
    this.historyGrid.append(card);
   }
  }
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
   this.historyTools.hidden=!s.cadavers.some(p=>p.number<s.number);this.historyButton.disabled=this.busy;
   if(this.historyOpen)this.renderHistory();
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
   this.save();this.busy=true;this.pet.disabled=true;this.historyButton.disabled=true;this.broom.hidden=false;
   this.motion(this.broom,[{transform:'translateX(160%) rotate(-20deg)',opacity:0},{transform:'translateX(40%) rotate(-20deg)',opacity:1,offset:.2},{transform:'translateX(-110%) rotate(15deg)',opacity:1,offset:.85},{transform:'translateX(-170%) rotate(15deg)',opacity:0}],1000);
   this.motion(this.pet,[{transform:'translateX(0)',opacity:1},{transform:'translateX(0)',opacity:1,offset:.25},{transform:'translateX(-120%) rotate(-25deg)',opacity:0}],1000);
   this.actionTimer=setTimeout(()=>{const {hue,number,cadavers}=this.state;this.cancelAction();this.state=born(Date.now(),hue,number+1,cadavers);this.save();this.render();this.grow();this.schedule();},1000);
  }
 }
 window.Wonguikung=Wonguikung;
 // Keep the real-time rules independent of the DOM for boundary checks.
 window.WonguikungRules=Object.freeze({born,reconcile,feed,read,archiveDead,HUNGER,WINDOW,LIMIT});
})();
