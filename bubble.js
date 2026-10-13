'use strict';
// Hidden Bubble Shooter, using the site's PNG for every game piece.
class FaceShooter {
 constructor(arena,source){
  this.arena=arena;this.source=source;this.active=false;this.frame=0;
  this.palette=[[255,94,110],[108,232,124],[86,186,255],[213,132,255]];this.sprites=[];
  this.root=document.createElement('section');this.root.className='face-shooter';this.root.hidden=true;
  this.root.innerHTML='<div class="shooter-hud"><span class="shooter-score" aria-live="polite">0</span></div><canvas tabindex="0" aria-label="Uní tres caras del mismo color. Arrastrá para apuntar y soltá para disparar."></canvas><p class="shooter-hint">Arrastrá para apuntar · Soltá para disparar</p><div class="shooter-result" hidden><p></p><button type="button">Jugar de nuevo</button></div>';
  arena.append(this.root);this.canvas=this.root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
  this.scoreLabel=this.root.querySelector('.shooter-score');this.result=this.root.querySelector('.shooter-result');
  this.result.querySelector('button').addEventListener('click',()=>this.reset());
  this.canvas.addEventListener('pointerdown',e=>{
   if(this.shot||this.over||this.pointer!==null||e.button!==0)return;
   this.pointer=e.pointerId;this.rect=this.canvas.getBoundingClientRect();this.canvas.setPointerCapture(e.pointerId);this.aim(e);
  });
  this.canvas.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer)this.aim(e);});
  const release=(e,fire)=>{if(e.pointerId!==this.pointer)return;this.pointer=null;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);if(fire)this.fire();};
  this.canvas.addEventListener('pointerup',e=>release(e,true));
  this.canvas.addEventListener('pointercancel',e=>release(e,false));
  this.canvas.addEventListener('lostpointercapture',e=>release(e,false));
  this.canvas.addEventListener('keydown',e=>{
   if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.preventDefault();
   if(e.key==='ArrowLeft')this.angle=Math.max(-Math.PI+.18,this.angle-.08);
   if(e.key==='ArrowRight')this.angle=Math.min(-.18,this.angle+.08);
   if(e.key===' '||e.key==='Enter')this.fire();
  });
  this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  this.root.addEventListener('click',e=>e.stopPropagation());
  this.root.addEventListener('pointerdown',e=>e.stopPropagation());
  this.observer=new ResizeObserver(()=>{if(this.active)this.resize();});this.observer.observe(arena);
  document.addEventListener('visibilitychange',()=>{this.last=0;if(this.active&&!document.hidden)this.loop();});
 }
 prepareSprites(){
  if(this.sprites.length)return;
  const image=new Image();image.src=this.source;
  const ready=()=>{
   const base=document.createElement('canvas');base.width=128;base.height=100;
   const context=base.getContext('2d');context.drawImage(image,0,0,128,100);
   const original=context.getImageData(0,0,128,100);
   // Bake RGB colors into pixels: no Canvas filter support is required on iOS.
   this.sprites=this.palette.map(color=>{
    const sprite=document.createElement('canvas');sprite.width=128;sprite.height=100;
    const target=sprite.getContext('2d'),pixels=target.createImageData(128,100);
    for(let i=0;i<original.data.length;i+=4){
     const shade=(original.data[i]+original.data[i+1]+original.data[i+2])/765;
     pixels.data[i]=color[0]*shade;pixels.data[i+1]=color[1]*shade;pixels.data[i+2]=color[2]*shade;
     pixels.data[i+3]=original.data[i+3];
    }
    target.putImageData(pixels,0,0);return sprite;
   });
  };
  if(image.complete&&image.naturalWidth)ready();else image.onload=ready;
 }
 start(){this.active=true;this.root.hidden=false;this.prepareSprites();this.resize();this.reset();this.canvas.focus({preventScroll:true});}
 resize(){
  const oldSize=this.size||1,oldLaunchX=this.launchX||0,oldLaunchY=this.launchY||0;this.width=this.canvas.clientWidth;this.height=this.canvas.clientHeight;
  const ratio=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*ratio);this.canvas.height=Math.round(this.height*ratio);this.ctx.setTransform(ratio,0,0,ratio,0,0);
  this.cols=9;this.size=Math.max(12,Math.min(44,this.width/9.5,this.height/10));this.rowHeight=this.size*Math.sqrt(3)/2;
  this.left=(this.width-this.cols*this.size)/2;this.launchX=this.width/2;this.launchY=this.height-this.size*.8;
  if(this.shot){this.shot.x=this.launchX+(this.shot.x-oldLaunchX)*this.size/oldSize;this.shot.y=this.launchY+(this.shot.y-oldLaunchY)*this.size/oldSize;}
  this.effects=[];this.slide=0;this.last=0;
  if(this.cells&&this.cells.some(c=>this.position(c).y>this.launchY-this.size*1.5))this.lose();
 }
 reset(){
  this.shift=0;this.cells=[];this.effects=[];this.shot=null;this.pointer=null;this.angle=-Math.PI/2;
  this.score=0;this.shots=0;this.wave=1;this.over=false;this.slide=0;this.last=0;this.result.hidden=true;
  this.seed();this.current=this.pick();this.next=this.pick();this.updateScore();this.loop();
 }
 seed(){for(let row=0;row<3;row++)this.makeRow(row);}
 makeRow(row){let color=this.randomColor();for(let col=0;col<this.cols-((row+this.shift)%2);col++){if(col%2===0)color=this.randomColor();this.cells.push({row,col,color});}}
 randomColor(){return Math.floor(Math.random()*this.palette.length);}
 pick(){const colors=[...new Set(this.cells.map(c=>c.color))];return colors.length?colors[Math.floor(Math.random()*colors.length)]:this.randomColor();}
 position(cell){return {x:this.left+this.size*(cell.col+.5+((cell.row+this.shift)%2)*.5),y:this.size*.55+cell.row*this.rowHeight};}
 neighbors(cell){const odd=(cell.row+this.shift)%2;return [[cell.row,cell.col-1],[cell.row,cell.col+1],[cell.row-1,cell.col+(odd?0:-1)],[cell.row-1,cell.col+(odd?1:0)],[cell.row+1,cell.col+(odd?0:-1)],[cell.row+1,cell.col+(odd?1:0)]];}
 connected(start,sameColor){
  const map=new Map(this.cells.map(c=>[`${c.row}:${c.col}`,c])),visited=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++)for(const [row,col] of this.neighbors(queue[i])){const cell=map.get(`${row}:${col}`);if(cell&&!visited.has(cell)&&(!sameColor||cell.color===start.color)){visited.add(cell);queue.push(cell);}}
  return visited;
 }
 aim(e){const x=(e.clientX-this.rect.left)*this.width/this.rect.width,y=(e.clientY-this.rect.top)*this.height/this.rect.height;
  this.angle=Math.max(-Math.PI+.18,Math.min(-.18,Math.atan2(Math.min(-8,y-this.launchY),x-this.launchX)));
 }
 fire(){if(!this.active||this.shot||this.over||this.slide>0)return;this.shot={x:this.launchX,y:this.launchY,vx:Math.cos(this.angle)*650,vy:Math.sin(this.angle)*650,color:this.current};}
 attach(){
  const shot=this.shot,candidates=new Map(),occupied=new Set(this.cells.map(c=>`${c.row}:${c.col}`));
  const add=(row,col)=>{if(row<0||col<0||col>=this.cols-((row+this.shift)%2)||occupied.has(`${row}:${col}`))return;const cell={row,col,color:shot.color};const pos=this.position(cell);candidates.set(`${row}:${col}`,{cell,distance:Math.hypot(pos.x-shot.x,pos.y-shot.y)});};
  for(let col=0;col<this.cols;col++)add(0,col);
  for(const cell of this.cells)for(const [row,col] of this.neighbors(cell))add(row,col);
  const nearest=[...candidates.values()].sort((a,b)=>a.distance-b.distance)[0];
  this.shot=null;if(!nearest){this.lose();return;}
  const cell=nearest.cell;this.cells.push(cell);const cluster=this.connected(cell,true);
  if(cluster.size>=3){
   this.remove(cluster,false);
   const anchored=new Set();for(const top of this.cells.filter(c=>c.row===0))for(const c of this.connected(top,false))anchored.add(c);
   this.remove(new Set(this.cells.filter(c=>!anchored.has(c))),true);
  }
  this.shots++;this.current=this.next;this.next=this.pick();
  if(!this.cells.length){this.wave++;this.shift=0;this.seed();this.current=this.pick();this.next=this.pick();}
  else if(this.shots%5===0){this.shift=1-this.shift;for(const c of this.cells)c.row++;this.makeRow(0);this.slide=this.rowHeight;}
  if(this.cells.some(c=>this.position(c).y>this.launchY-this.size*1.5))this.lose();this.updateScore();
 }
 remove(set,fall){for(const cell of set){const pos=this.position(cell);this.effects.push({...pos,color:cell.color,age:0,fall,vx:(Math.random()-.5)*100,vy:50});this.score+=fall?20:10;}this.cells=this.cells.filter(c=>!set.has(c));}
 updateScore(){this.scoreLabel.textContent=`${this.score} · Nivel ${this.wave}`;}
 lose(){this.over=true;this.shot=null;this.result.hidden=false;this.result.querySelector('p').textContent=`Fin del juego · ${this.score} puntos`;}
 step(dt){
  this.slide=Math.max(0,this.slide-dt*this.rowHeight*5);
  if(this.shot){const steps=Math.max(1,Math.ceil(650*dt/(this.size*.2)));for(let i=0;i<steps&&this.shot;i++){
   const shot=this.shot;shot.x+=shot.vx*dt/steps;shot.y+=shot.vy*dt/steps;
   if(shot.x<this.size*.5){shot.x=this.size-shot.x;shot.vx=Math.abs(shot.vx);}
   if(shot.x>this.width-this.size*.5){shot.x=2*(this.width-this.size*.5)-shot.x;shot.vx=-Math.abs(shot.vx);}
   if(shot.y<=this.size*.55||this.cells.some(cell=>{const p=this.position(cell);return Math.hypot(p.x-shot.x,p.y-shot.y)<this.size*.94;}))this.attach();
  }}
  for(const effect of this.effects){effect.age+=dt;if(effect.fall){effect.vy+=700*dt;effect.x+=effect.vx*dt;effect.y+=effect.vy*dt;}}
  this.effects=this.effects.filter(e=>e.age<(e.fall?.65:.28));
 }
 sprite(color,x,y,scale=1,alpha=1){const image=this.sprites[color];if(!image)return;this.ctx.globalAlpha=alpha;this.ctx.drawImage(image,x-this.size*scale*.5,y-this.size*scale*.39,this.size*scale,this.size*scale*.78);this.ctx.globalAlpha=1;}
 draw(){const c=this.ctx;c.clearRect(0,0,this.width,this.height);
  for(const cell of this.cells){const p=this.position(cell);this.sprite(cell.color,p.x,p.y-this.slide);}
  for(const e of this.effects)this.sprite(e.color,e.x,e.y,e.fall?1:1+e.age*2,Math.max(0,1-e.age/(e.fall?.65:.28)));
  c.strokeStyle='rgba(255,255,255,.18)';c.setLineDash([3,6]);c.beginPath();c.moveTo(0,this.launchY-this.size*1.5);c.lineTo(this.width,this.launchY-this.size*1.5);c.stroke();c.setLineDash([]);
  if(this.shot)this.sprite(this.shot.color,this.shot.x,this.shot.y);
  if(!this.over){this.sprite(this.current,this.launchX,this.launchY);this.sprite(this.next,this.launchX+this.size*1.8,this.launchY,.55,.5);
   const length=this.size*2.1,dx=Math.cos(this.angle),dy=Math.sin(this.angle),x=this.launchX+dx*length,y=this.launchY+dy*length;
   c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=2;c.beginPath();c.moveTo(this.launchX+dx*this.size*.6,this.launchY+dy*this.size*.6);c.lineTo(x,y);c.moveTo(x-dx*9-dy*5,y-dy*9+dx*5);c.lineTo(x,y);c.lineTo(x-dx*9+dy*5,y-dy*9-dx*5);c.stroke();
  }
 }
 loop(){cancelAnimationFrame(this.frame);if(!this.active||document.hidden)return;
  this.frame=requestAnimationFrame(now=>{const dt=this.last?Math.min((now-this.last)/1000,.035):0;this.last=now;this.step(dt);this.draw();this.loop();});
 }
}
window.FaceShooter=FaceShooter;
