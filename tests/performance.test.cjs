const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
function runtime(fps=60){
 let time=0,id=0,seed=42;
 const frames=new Map(),storage=new Map();
 const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const context=vm.createContext({
  window:{SITE_PERFORMANCE:{gameFrameMs:1000/fps,pixelRatio:1}},document:{hidden:false},
  performance:{now:()=>time},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  Math:math,requestAnimationFrame:callback=>{frames.set(++id,callback);return id;},cancelAnimationFrame:key=>frames.delete(key)
 });
 vm.runInContext(source('bubble.js'),context);vm.runInContext(source('bricks.js'),context);
 return {context,frames,storage,run(ms){for(let end=time+ms;time<end;){time+=1000/120;const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(time);}}};
}
function gameIn(env,type='FaceBricks'){
 const game=vm.runInContext(`Object.create(window.${type}.prototype)`,env.context);
 Object.assign(game,{active:true,frame:0,draws:0,width:320,height:480,size:18,ballRadius:6.48,cols:6,gap:5,tile:50,left:10,launchX:160,launchY:460,record:0,
  result:{hidden:true,querySelector:()=>({textContent:''})},scoreLabel:{},recordLabel:{},canvas:{hasPointerCapture:()=>false},draw(){this.draws++;}});
 if(type==='FaceShooter')Object.assign(game,{palette:[[1],[2],[3],[4]],cols:9,size:32,rowHeight:32*Math.sqrt(3)/2,left:16});
 game.reset();return game;
}
for(const fps of [30,60]){
 test(`games sleep while idle and wake for input at ${fps} FPS`,()=>{
  for(const type of ['FaceShooter','FaceBricks']){
   const env=runtime(fps),game=gameIn(env,type);
   env.run(1000);assert.equal(game.draws,1);assert.equal(env.frames.size,0);
   game.rect={left:0,top:0,width:320,height:480};game.aim({clientX:160,clientY:10});env.run(100);
   assert.equal(game.draws,2);assert.equal(env.frames.size,0);
   game.fire();assert.equal(env.frames.size,1);game.loop();assert.equal(env.frames.size,1,'no duplicate loop');
   env.run(22000);assert.equal(env.frames.size,0,'sleeps after volley and effects');
   const draws=game.draws;env.run(1000);assert.equal(game.draws,draws);
   if(type==='FaceBricks')assert(env.storage.has('042-bricks-game'),'final idle state saved');
  }
 });
 test(`volley rendering is bounded to ${fps} FPS`,()=>{
  const env=runtime(fps),game=gameIn(env);env.run(100);game.fire();const draws=game.draws;env.run(500);
  assert(game.draws-draws<=fps/2+2);assert(game.draws>draws);
  env.context.document.hidden=true;env.run(1000);assert.equal(env.frames.size,0);
  env.context.document.hidden=false;game.last=0;game.loop();env.run(22000);assert.equal(env.frames.size,0);
 });
}
test('30 and 60 FPS preserve the same volley result',()=>{
 const results=[30,60].map(fps=>{const env=runtime(fps),game=gameIn(env);env.run(100);game.fire();env.run(22000);return JSON.stringify({count:game.count,turn:game.turn,destroyed:game.destroyed,blocks:game.blocks});});
 assert.equal(results[0],results[1]);
});
test('pause cancels pending frame and resumes the existing volley',()=>{
 const env=runtime(30),game=gameIn(env);env.run(100);game.fire();env.run(100);game.pause();
 assert.equal(game.frame,0);assert.equal(env.frames.size,0);assert(game.shot);
 const elapsed=game.elapsed;env.run(5000);assert.equal(game.elapsed,elapsed);
 game.active=true;game.loop();env.run(22000);assert.equal(game.turn,2);assert.equal(env.frames.size,0);
});
const app=source('script.js');
test('hardware hints select the lighter profile and unknown hardware keeps normal quality',()=>{
 for(const [navigator,expected] of [[{hardwareConcurrency:4},true],[{deviceMemory:2},true],[{connection:{saveData:true}},true],[{},false],[{hardwareConcurrency:8,deviceMemory:8},false]]){
  const context=vm.createContext({navigator,window:{devicePixelRatio:3},Object});
  vm.runInContext(app.slice(app.indexOf('// Conservative hints'),app.indexOf('let started=')),context);
  assert.equal(context.window.SITE_PERFORMANCE.lowPower,expected);
  assert.equal(context.window.SITE_PERFORMANCE.pixelRatio,expected?1:2);
 }
});
for(const lowPower of [true,false])test(`waveform retains original detail and display cadence (low=${lowPower})`,()=>{
 const env=runtime();let reads=0,samples=0,connections=0,observer;
 const ink={setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
 const canvas={getContext:()=>ink,get clientWidth(){reads++;return 240;},get clientHeight(){reads++;return 32;}};
 const audio={paused:false,ended:false,error:null,addEventListener(){}};
 Object.assign(env.context,{lowPower,sitePerformance:{pixelRatio:1,waveformFrameMs:1000/(lowPower?15:30)},songVisibility:{getAttribute:()=>'true'},reducedMotion:{matches:false,addEventListener(){}},Uint8Array,
  ResizeObserver:class{constructor(callback){observer=callback;}observe(){}}});
 Object.assign(env.context.document,{getElementById:id=>id==='audio'?audio:canvas,addEventListener(){}});
 env.context.window.devicePixelRatio=2;
 env.context.window.AudioContext=class{state='running';destination={};createAnalyser(){return{fftSize:0,getByteTimeDomainData(arr){samples++;arr.fill(128);arr[0]=192;}}}createMediaElementSource(){return{connect(){connections++;}}}};
 const section=app.slice(app.indexOf("const audio=document.getElementById('audio');"),app.indexOf("const previous=document.getElementById('previous');"));
 vm.runInContext(section,env.context);observer();
 vm.runInContext('prepareWaveform();prepareWaveform();syncWaveform()',env.context);
 env.run(1000);assert.equal(connections,2);assert(samples>=119&&samples<=123);assert(reads>=240);
 assert.equal(vm.runInContext("waveformAnalyser.fftSize",env.context),2048);assert.equal(canvas.width,480);
 audio.paused=true;vm.runInContext('syncWaveform()',env.context);assert.equal(env.frames.size,0);
 audio.paused=false;env.context.reducedMotion.matches=true;vm.runInContext('syncWaveform()',env.context);assert.equal(env.frames.size,0);
});
test('physics planning stores fewer frames without changing simulated travel',()=>{
 for(const planRate of [30,60]){
  const env=runtime();let keyframes=0;
  const bodies=Array.from({length:3},(_,i)=>({x:50,y:50,vx:92,vy:74,targetSpeed:0,active:i===0,burst:false,grab:null,element:{style:{},animate(frames){keyframes=frames.length;return{currentTime:2000,cancel(){}};}}}));
  Object.assign(env.context,{bodies,sitePerformance:{planRate},maxX:1000,maxY:1000,radius:40,plans:null,planStates:null,colorTimers:[],setTimeout(){},clearTimeout(){},tint(){}});
  const section=app.slice(app.indexOf('function paint(){'),app.indexOf('function animate(now){'));
  vm.runInContext(section,env.context);vm.runInContext('playPlans()',env.context);
  assert.equal(keyframes,planRate*4+1);assert.equal(vm.runInContext('plans.length',env.context),1);
  vm.runInContext('stopPlans()',env.context);assert(Math.abs(bodies[0].x-234)<.001);assert(Math.abs(bodies[0].y-198)<.001);
 }
});
test('pet schedules actual phase and hunger deadlines',()=>{
 let delay,now=10000;
 const env=vm.createContext({window:{},Date:{now:()=>now},document:{hidden:false},setTimeout:(callback,ms)=>{delay=ms;},clearTimeout(){}});
 vm.runInContext(source('wonguikung.js'),env);
 const pet=vm.runInContext('Object.create(window.Wonguikung.prototype)',env);
 pet.active=true;pet.state={phase:'ready',lastFedAt:now};pet.schedule();assert.equal(delay,6*60*60*1000);
 pet.state.phase='hello';pet.state.phaseAt=now;pet.schedule();assert.equal(delay,2800);
 pet.state.phase='dead';delay=null;pet.schedule();assert.equal(delay,null);
});
test('published package contains all deformation assets and avoids audio download gate',()=>{
 for(const stage of [1,2,3])assert(fs.existsSync(path.join(root,`dist/sprites/group-inflated-${stage}.png`)));
 assert(!app.includes('getImageData'));assert(!app.includes('toDataURL'));
 assert(source('index.html').includes('<audio id="audio" preload="metadata">'));
 assert(app.includes('loaded=entranceMinimumElapsed&&entranceAssetsReady;'));
});
