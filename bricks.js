'use strict';
// Ballz-style volleys. Every projectile uses the same cached colored PNG sprites.
class FaceBricks extends FaceShooter {
 constructor(arena,source){
  super(arena,source);this.root.classList.add('face-bricks');
  this.root.querySelector('.shooter-hud').remove();
  this.root.querySelector('.shooter-hint').remove();
  const restart=this.result.querySelector('button');restart.classList.add('bricks-restart');
  restart.setAttribute('aria-label','Jugar de nuevo');restart.title='Jugar de nuevo';
  restart.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path transform="translate(24 0) scale(-1 1)" d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>';
  this.recordLabel=document.createElement('p');this.recordLabel.className='bricks-record';this.result.insertBefore(this.recordLabel,restart);
  this.record=0;
  try{const saved=Number(localStorage.getItem('042-bricks-record'));if(Number.isSafeInteger(saved)&&saved>=0)this.record=saved;}catch{}

  this.canvas.setAttribute('aria-label','Dispará las caras contra los bloques numerados. Arrastrá para apuntar y soltá para disparar.');
 }
 resize(){
  const oldWidth=this.width||1,oldHeight=this.height||1;
  this.width=this.canvas.clientWidth;this.height=this.canvas.clientHeight;
  const ratio=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*ratio);this.canvas.height=Math.round(this.height*ratio);this.ctx.setTransform(ratio,0,0,ratio,0,0);
  this.size=Math.max(14,Math.min(24,this.width/17));this.ballRadius=this.size*.36;
  this.cols=6;this.gap=5;this.tile=Math.min(this.width/6,this.height/8.5);this.left=(this.width-this.tile*6)/2;
  this.launchY=this.height-this.size*.8;
  this.launchX=this.launchX?this.launchX*this.width/oldWidth:this.width/2;
  for(const b of this.balls||[]){b.x*=this.width/oldWidth;b.y*=this.height/oldHeight;}
  this.last=0;this.rect=this.canvas.getBoundingClientRect();
  if(!this.descent&&this.blocks?.some(b=>this.blockRect(b).y+this.tile>this.launchY-this.size))this.lose();
 }
 reset(){
  this.blocks=[];this.balls=[];this.effects=[];this.shot=null;this.pointer=null;
  this.angle=-Math.PI/2;this.count=5;this.turn=1;this.destroyed=0;this.pending=0;this.emitted=0;this.returned=0;
  this.color=0;this.volleyColor=0;this.descent=0;this.over=false;this.last=0;this.elapsed=0;this.landing=null;this.launchX=this.width/2;this.result.hidden=true;
  this.addRow();this.updateScore();this.loop();
 }
 blockHue(hp){return Math.min(280,Math.log2(Math.max(1,hp))*40);}
 blockColor(hp,alpha=1){return `hsla(${this.blockHue(hp)},85%,65%,${alpha})`;}
 blockRect(b){return {x:this.left+b.col*this.tile+this.gap/2,y:b.row*this.tile+this.gap/2,w:this.tile-this.gap,h:this.tile-this.gap};}
 addRow(){
  const columns=[0,1,2,3,4,5].sort(()=>Math.random()-.5).slice(0,Math.min(5,3+Math.floor(this.turn/8)));
  for(const col of columns){const hp=Math.max(2,Math.round(this.turn*1.4+Math.random()*(3+this.turn*.5)));this.blocks.push({col,row:0,hp,reward:1,id:Math.random()});}
 }
 updateScore(){}
 fire(){
  if(!this.active||this.shot||this.over||this.descent>0)return;
  this.volleyColor=this.color;this.volleyAngle=this.angle;this.shot=true;this.elapsed=0;this.emitted=0;this.returned=0;this.volleyCount=this.count;this.pending=0;this.landing=null;this.balls=[];
  this.emit(0);this.updateScore();
 }
 emit(born=this.elapsed){
  if(this.emitted>=this.volleyCount)return;
  this.balls.push({x:this.launchX,y:this.launchY,vx:Math.cos(this.volleyAngle)*560,vy:Math.sin(this.volleyAngle)*560,color:this.volleyColor,age:0,born});this.emitted++;
 }
 hit(ball,block,previousX,previousY,preview=false){
  const r=this.blockRect(block),radius=this.ballRadius;
  const closestX=Math.max(r.x,Math.min(r.x+r.w,ball.x)),closestY=Math.max(r.y,Math.min(r.y+r.h,ball.y));
  const dx=ball.x-closestX,dy=ball.y-closestY;
  if(dx*dx+dy*dy>radius*radius)return false;
  if(previousY<=r.y-radius){ball.y=r.y-radius;ball.vy=-Math.abs(ball.vy);}
  else if(previousY>=r.y+r.h+radius){ball.y=r.y+r.h+radius;ball.vy=Math.abs(ball.vy);}
  else if(previousX<=r.x-radius){ball.x=r.x-radius;ball.vx=-Math.abs(ball.vx);}
  else if(previousX>=r.x+r.w+radius){ball.x=r.x+r.w+radius;ball.vx=Math.abs(ball.vx);}
  else if(Math.abs(dx)>Math.abs(dy)){ball.x=dx<0?r.x-radius:r.x+r.w+radius;ball.vx=dx<0?-Math.abs(ball.vx):Math.abs(ball.vx);}
  else{ball.y=dy<0?r.y-radius:r.y+r.h+radius;ball.vy=dy<0?-Math.abs(ball.vy):Math.abs(ball.vy);}
  if(preview)return true;
  this.damage(block);
  return true;
 }
 nextTurn(){
  this.shot=null;this.count+=this.pending;this.pending=0;this.turn++;this.color=(this.color+1+Math.floor(Math.random()*3))%4;
  this.launchX=Math.max(this.size,Math.min(this.width-this.size,this.landing??this.launchX));
  for(const b of this.blocks)b.row++;
  this.addRow();this.descent=.32;
  this.updateScore();
 }
 lose(){
  this.over=true;this.shot=null;this.balls=[];
  this.record=Math.max(this.record||0,this.count);
  try{localStorage.setItem('042-bricks-record',String(this.record));}catch{}
  this.result.querySelector('p').textContent=`Wachos recolectados: ${this.count}`;
  this.recordLabel.textContent=`Record: ${this.record}`;
  this.result.hidden=false;
 }

 step(dt){
  if(this.descent>0){
   this.descent=Math.max(0,this.descent-dt);
   if(this.descent===0&&this.blocks.some(b=>this.blockRect(b).y+this.tile>this.launchY-this.size))this.lose();
  }
  if(this.shot){
   const previousElapsed=this.elapsed;this.elapsed+=dt;
   // Place each new PNG at its exact position since its scheduled launch time.
   while(this.emitted<this.volleyCount&&this.elapsed>=this.emitted*.08)this.emit(this.emitted*.08);
   const remaining=[];
   for(const ball of this.balls){
    const elapsed=Math.max(0,this.elapsed-Math.max(previousElapsed,ball.born??previousElapsed));
    ball.age+=elapsed;
    const landed=this.advance(ball,elapsed)||ball.age>18;
    if(landed){this.returned++;if(this.landing===null)this.landing=ball.x;}
    else remaining.push(ball);
   }
   this.balls=remaining;
   if(this.emitted===this.volleyCount&&!this.balls.length)this.nextTurn();
  }
  for(const effect of this.effects)effect.age+=dt;
  this.effects=this.effects.filter(effect=>effect.age<.35);
 }
 impact(ball,maxDistance=Infinity){
  const speed=Math.hypot(ball.vx,ball.vy),dx=ball.vx/speed,dy=ball.vy/speed;
  let best=null;
  const consider=(distance,nx,ny,block=null,landing=false)=>{
   if(distance>=-.0001&&distance<=maxDistance&&(!best||distance<best.distance))best={distance:Math.max(0,distance),nx,ny,block,landing};
  };
  if(dx<0)consider((this.ballRadius-ball.x)/dx,1,0);
  if(dx>0)consider((this.width-this.ballRadius-ball.x)/dx,-1,0);
  if(dy<0)consider((this.ballRadius-ball.y)/dy,0,1);
  if(dy>0)consider((this.launchY-ball.y)/dy,0,-1,null,true);
  for(const block of this.blocks){
   const r=this.blockRect(block),pad=this.ballRadius;
   let near=-Infinity,far=Infinity,nx=0,ny=0,valid=true;
   for(const [origin,direction,min,max,ax,ay] of [[ball.x,dx,r.x-pad,r.x+r.w+pad,1,0],[ball.y,dy,r.y-pad,r.y+r.h+pad,0,1]]){
    if(Math.abs(direction)<1e-9){if(origin<min||origin>max)valid=false;continue;}
    const t1=(min-origin)/direction,t2=(max-origin)/direction,entry=Math.min(t1,t2),exit=Math.max(t1,t2);
    if(entry>near){near=entry;nx=-Math.sign(direction)*ax;ny=-Math.sign(direction)*ay;}
    far=Math.min(far,exit);
   }
   if(valid&&near<=far&&far>=0&&near>=-.0001)consider(near,nx,ny,block);
  }
  return best;
 }
 damage(block){
  block.hp--;
  if(block.hp<=0){
   const r=this.blockRect(block);this.pending++;this.destroyed++;
   this.effects.push({x:r.x+r.w/2,y:r.y+r.h/2,age:0});
   this.blocks=this.blocks.filter(b=>b!==block);this.updateScore();
  }
 }
 advance(ball,dt){
  let distance=Math.hypot(ball.vx,ball.vy)*dt;
  for(let i=0;i<12&&distance>1e-6;i++){
   const speed=Math.hypot(ball.vx,ball.vy),dx=ball.vx/speed,dy=ball.vy/speed,hit=this.impact(ball,distance);
   if(!hit){ball.x+=dx*distance;ball.y+=dy*distance;return false;}
   ball.x+=dx*hit.distance;ball.y+=dy*hit.distance;distance-=hit.distance;
   if(hit.landing)return true;
   if(hit.block)this.damage(hit.block);
   const dot=ball.vx*hit.nx+ball.vy*hit.ny;
   ball.vx-=2*dot*hit.nx;ball.vy-=2*dot*hit.ny;
   ball.x+=hit.nx*.001;ball.y+=hit.ny*.001;
  }
  return false;
 }
 trajectory(){
  const ball={x:this.launchX,y:this.launchY,vx:Math.cos(this.angle)*560,vy:Math.sin(this.angle)*560};
  const points=[];let traveled=0;const limit=this.size*3+Math.min(420,this.height*.8);
  for(let i=0;i<5;i++){
   const speed=Math.hypot(ball.vx,ball.vy),dx=ball.vx/speed,dy=ball.vy/speed,hit=this.impact(ball,this.height*3);
   const wanted=hit?hit.distance:this.height*3,distance=Math.min(wanted,limit-traveled),capped=distance<wanted;
   if(!points.length&&traveled+distance>=this.size*3){const skip=Math.max(0,this.size*3-traveled);points.push({x:ball.x+dx*skip,y:ball.y+dy*skip});}
   ball.x+=dx*distance;ball.y+=dy*distance;traveled+=distance;
   if(points.length)points.push({x:ball.x,y:ball.y,block:!capped&&Boolean(hit?.block)});
   if(capped||traveled>=limit||!hit||hit.landing)break;
   const dot=ball.vx*hit.nx+ball.vy*hit.ny;
   ball.vx-=2*dot*hit.nx;ball.vy-=2*dot*hit.ny;
   ball.x+=hit.nx*.001;ball.y+=hit.ny*.001;
  }
  return points;
 }
 guideDots(){
  const points=this.trajectory();if(points.length<2)return [];
  const lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  const dots=[];
  for(let distance=0;distance<=lengths.at(-1);distance+=10){
   let i=1;while(i<lengths.length-1&&lengths[i]<distance)i++;
   const segment=lengths[i]-lengths[i-1],t=segment?(distance-lengths[i-1])/segment:0;
   dots.push({x:points[i-1].x+(points[i].x-points[i-1].x)*t,y:points[i-1].y+(points[i].y-points[i-1].y)*t,distance,radius:2.6});
  }
  // Color follows cumulative path length, including all reflected segments.
  points.slice(1).forEach((p,i)=>{
   const distance=lengths[i+1];
   const nearby=dots.findIndex(d=>Math.abs(d.distance-distance)<4);
   const dot={x:p.x,y:p.y,distance,radius:2.6};
   if(nearby>=0)dots[nearby]=dot;else dots.push(dot);
  });
  dots.sort((a,b)=>a.distance-b.distance);
  const total=lengths.at(-1);
  for(const dot of dots)dot.hue=total?240*(1-dot.distance/total):0;
  return dots;
 }
 drawTrajectory(){
  const c=this.ctx;c.save();
  for(const dot of this.guideDots()){
   c.fillStyle=`hsla(${dot.hue},90%,65%,.85)`;c.beginPath();c.arc(dot.x,dot.y,dot.radius,0,Math.PI*2);c.fill();
  }
  c.restore();
 }
 draw(){
  const c=this.ctx;c.clearRect(0,0,this.width,this.height);
  c.textAlign='center';c.textBaseline='middle';
  for(const block of this.blocks){const r=this.blockRect(block);if(this.descent>0)r.y-=this.tile*Math.pow(this.descent/.32,3);c.fillStyle=this.blockColor(block.hp,.16);c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=this.blockColor(block.hp);c.lineWidth=1.5;c.strokeRect(r.x,r.y,r.w,r.h);c.fillStyle='#fff';c.font=`${Math.max(13,this.tile*.29)}px Sentient,serif`;c.fillText(block.hp,r.x+r.w/2,r.y+r.h/2);}
  for(const effect of this.effects){
   const t=effect.age/.35;
   c.save();c.globalAlpha=(1-t)*(1-t);c.fillStyle='#fff';c.font='16px Sentient,serif';
   c.fillText('+1',effect.x,effect.y-t*30);c.restore();
  }
  for(const b of this.balls)this.sprite(b.color,b.x,b.y);
  c.setLineDash([3,6]);c.strokeStyle='rgba(255,255,255,.15)';c.beginPath();c.moveTo(0,this.launchY-this.size);c.lineTo(this.width,this.launchY-this.size);c.stroke();c.setLineDash([]);
  if(!this.over){
   this.sprite(this.shot?this.volleyColor:this.color,this.launchX,this.launchY);
   c.fillStyle='#aaa';c.font='12px Sentient,serif';c.fillText(`×${this.shot?this.volleyCount-this.emitted:this.count}`,this.launchX,this.launchY-this.size*.75);
   if(!this.shot&&!this.descent){
    if(this.pointer!==null)this.drawTrajectory();
    const dx=Math.cos(this.angle),dy=Math.sin(this.angle),length=this.size*3,x=this.launchX+dx*length,y=this.launchY+dy*length;c.strokeStyle='#ddd';c.lineWidth=2;c.beginPath();c.moveTo(this.launchX+dx*this.size*.6,this.launchY+dy*this.size*.6);c.lineTo(x,y);c.moveTo(x-dx*9-dy*5,y-dy*9+dx*5);c.lineTo(x,y);c.lineTo(x-dx*9+dy*5,y-dy*9-dx*5);c.stroke();}
  }
 }
}
window.FaceBricks=FaceBricks;
