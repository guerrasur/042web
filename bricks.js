'use strict';
// Ballz-style volleys. Every projectile uses the same cached colored PNG sprites.
class FaceBricks extends FaceShooter {
 constructor(arena,source){
  super(arena,source);this.root.classList.add('face-bricks');
  this.root.querySelector('.shooter-hint').textContent='Arrastrá para apuntar · Soltá para disparar';
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
  this.angle=-Math.PI/2;this.count=10;this.turn=1;this.destroyed=0;this.pending=0;this.emitted=0;this.returned=0;
  this.color=0;this.volleyColor=0;this.descent=0;this.over=false;this.last=0;this.elapsed=0;this.landing=null;this.launchX=this.width/2;this.result.hidden=true;
  this.addRow();this.updateScore();this.loop();
 }
 blockHue(hp){return Math.min(280,Math.log2(Math.max(1,hp))*40);}
 blockColor(hp,alpha=1){return `hsla(${this.blockHue(hp)},85%,65%,${alpha})`;}
 blockRect(b){return {x:this.left+b.col*this.tile+this.gap/2,y:b.row*this.tile+this.gap/2,w:this.tile-this.gap,h:this.tile-this.gap};}
 addRow(){
  const columns=[0,1,2,3,4,5].sort(()=>Math.random()-.5).slice(0,Math.min(5,3+Math.floor(this.turn/8)));
  for(const col of columns){const hp=Math.max(2,Math.round(this.turn*1.4+Math.random()*(3+this.turn*.5)));this.blocks.push({col,row:0,hp,reward:hp,id:Math.random()});}
 }
 updateScore(){this.scoreLabel.textContent=`${this.count} caras${this.pending?` (+${this.pending})`:''} · Turno ${this.turn}`;}
 fire(){
  if(!this.active||this.shot||this.over||this.descent>0)return;
  this.volleyColor=this.color;this.volleyAngle=this.angle;this.shot=true;this.elapsed=0;this.emitted=0;this.returned=0;this.volleyCount=this.count;this.pending=0;this.landing=null;this.balls=[];
  this.emit();this.updateScore();
 }
 emit(){
  if(this.emitted>=this.volleyCount)return;
  this.balls.push({x:this.launchX,y:this.launchY,vx:Math.cos(this.volleyAngle)*560,vy:Math.sin(this.volleyAngle)*560,color:this.volleyColor,age:0});this.emitted++;
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
  block.hp--;
  if(block.hp<=0){
   this.pending+=block.reward;this.destroyed++;
   this.effects.push({x:r.x+r.w/2,y:r.y+r.h/2,color:this.volleyColor,ink:this.blockColor(1),age:0,reward:block.reward});
   this.blocks=this.blocks.filter(b=>b!==block);this.updateScore();
  }
  return true;
 }
 nextTurn(){
  this.shot=null;this.count+=this.pending;this.pending=0;this.turn++;this.color=(this.color+1+Math.floor(Math.random()*3))%4;
  this.launchX=Math.max(this.size,Math.min(this.width-this.size,this.landing??this.launchX));
  for(const b of this.blocks)b.row++;
  this.addRow();this.descent=.32;
  this.updateScore();
 }
 lose(){this.over=true;this.shot=null;this.balls=[];this.result.hidden=false;this.result.querySelector('p').textContent=`Fin del juego · ${this.destroyed} bloques · ${this.count} caras`;}
 step(dt){
  if(this.descent>0){
   this.descent=Math.max(0,this.descent-dt);
   if(this.descent===0&&this.blocks.some(b=>this.blockRect(b).y+this.tile>this.launchY-this.size))this.lose();
  }
  if(this.shot){
   this.elapsed+=dt;
   // Limit work per frame while preserving the full volley size.
   let emittedThisFrame=0;
   while(this.emitted<this.volleyCount&&this.elapsed>=this.emitted*.055&&emittedThisFrame++<6)this.emit();
   const remaining=[];
   for(const ball of this.balls){
    ball.age+=dt;let landed=false;
    const steps=Math.max(1,Math.ceil(560*dt/Math.max(2,this.ballRadius*.5)));
    for(let i=0;i<steps&&!landed;i++){
     const px=ball.x,py=ball.y;ball.x+=ball.vx*dt/steps;ball.y+=ball.vy*dt/steps;
     if(ball.x<this.ballRadius){ball.x=2*this.ballRadius-ball.x;ball.vx=Math.abs(ball.vx);}
     if(ball.x>this.width-this.ballRadius){ball.x=2*(this.width-this.ballRadius)-ball.x;ball.vx=-Math.abs(ball.vx);}
     if(ball.y<this.ballRadius){ball.y=2*this.ballRadius-ball.y;ball.vy=Math.abs(ball.vy);}
     for(const block of this.blocks)if(this.hit(ball,block,px,py))break;
     if(ball.vy>0&&ball.y>=this.launchY){landed=true;if(this.landing===null)this.landing=ball.x;}
    }
    // Shallow trajectories cannot hold the round open indefinitely.
    if(ball.age>18)landed=true;
    if(landed)this.returned++;else remaining.push(ball);
   }
   this.balls=remaining;
   if(this.emitted===this.volleyCount&&!this.balls.length)this.nextTurn();
  }
  for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<.5);
 }
 trajectory(){
  const ball={x:this.launchX,y:this.launchY,vx:Math.cos(this.angle)*560,vy:Math.sin(this.angle)*560};
  const points=[];let traveled=0,rebounds=0;
  for(let i=0;i<700;i++){
   const px=ball.x,py=ball.y;ball.x+=ball.vx/140;ball.y+=ball.vy/140;traveled+=4;
   if(ball.x<this.ballRadius){ball.x=2*this.ballRadius-ball.x;ball.vx=Math.abs(ball.vx);rebounds++;}
   if(ball.x>this.width-this.ballRadius){ball.x=2*(this.width-this.ballRadius)-ball.x;ball.vx=-Math.abs(ball.vx);rebounds++;}
   if(ball.y<this.ballRadius){ball.y=2*this.ballRadius-ball.y;ball.vy=Math.abs(ball.vy);rebounds++;}
   const hit=this.blocks.some(block=>this.hit(ball,block,px,py,true));
   if(traveled>=this.size*3)points.push({x:ball.x,y:ball.y});
   if(hit||rebounds>=3||ball.y>this.launchY)break;
  }
  return points;
 }
 drawTrajectory(){
  const points=this.trajectory();if(points.length<2)return;
  const c=this.ctx;c.save();c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.5;c.setLineDash([3,7]);c.beginPath();
  points.forEach((p,i)=>{if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.stroke();c.restore();
 }
 draw(){
  const c=this.ctx;c.clearRect(0,0,this.width,this.height);
  c.textAlign='center';c.textBaseline='middle';
  for(const block of this.blocks){const r=this.blockRect(block);if(this.descent>0)r.y-=this.tile*Math.pow(this.descent/.32,3);c.fillStyle=this.blockColor(block.hp,.16);c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle=this.blockColor(block.hp);c.lineWidth=1.5;c.strokeRect(r.x,r.y,r.w,r.h);c.fillStyle='#fff';c.font=`${Math.max(13,this.tile*.29)}px Sentient,serif`;c.fillText(block.hp,r.x+r.w/2,r.y+r.h/2);}
  for(const e of this.effects){this.sprite(e.color,e.x,e.y,1+e.age,1-e.age*2);c.globalAlpha=1-e.age*2;c.fillStyle=e.ink;c.font='16px Sentient,serif';c.fillText(`+${e.reward}`,e.x,e.y-e.age*45);c.globalAlpha=1;}
  for(const b of this.balls)this.sprite(b.color,b.x,b.y);
  c.setLineDash([3,6]);c.strokeStyle='rgba(255,255,255,.15)';c.beginPath();c.moveTo(0,this.launchY-this.size);c.lineTo(this.width,this.launchY-this.size);c.stroke();c.setLineDash([]);
  if(!this.over){
   this.sprite(this.shot?this.volleyColor:this.color,this.launchX,this.launchY);
   c.fillStyle='#aaa';c.font='12px Sentient,serif';c.fillText(this.shot?`${this.volleyCount-this.emitted} por disparar`: `×${this.count}`,this.launchX,this.launchY-this.size*.75);
   if(!this.shot&&!this.descent){
    if(this.pointer!==null)this.drawTrajectory();
    const dx=Math.cos(this.angle),dy=Math.sin(this.angle),length=this.size*3,x=this.launchX+dx*length,y=this.launchY+dy*length;c.strokeStyle='#ddd';c.lineWidth=2;c.beginPath();c.moveTo(this.launchX+dx*this.size*.6,this.launchY+dy*this.size*.6);c.lineTo(x,y);c.moveTo(x-dx*9-dy*5,y-dy*9+dx*5);c.lineTo(x,y);c.lineTo(x-dx*9+dy*5,y-dy*9-dx*5);c.stroke();}
  }
 }
}
window.FaceBricks=FaceBricks;
