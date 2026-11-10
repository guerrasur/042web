'use strict';
(()=>{
 const frame=document.getElementById('about-frame');
 const text=document.getElementById('about-text');
 let pending=0;
 function fit(){
  pending=0;
  if(!frame.clientWidth||!frame.clientHeight)return;
  // Measure the rendered text, including line wraps and links, against this viewport.
  let low=1,high=26;
  for(let pass=0;pass<13;pass++){
   const size=(low+high)/2;
   text.style.fontSize=`${size}px`;
   if(text.scrollHeight<=frame.clientHeight&&text.scrollWidth<=frame.clientWidth)low=size;
   else high=size;
  }
  text.style.fontSize=`${Math.floor(low*100)/100}px`;
 }
 function schedule(){if(!pending)pending=requestAnimationFrame(fit);}
 new ResizeObserver(schedule).observe(frame);
 window.addEventListener('pageshow',schedule);
 window.addEventListener('resize',schedule);
 document.fonts.ready.then(schedule);
 schedule();
 document.getElementById('about-back').addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  try{
   const previous=new URL(document.referrer);
   if(previous.origin===location.origin&&previous.pathname!==location.pathname&&history.length>1){event.preventDefault();history.back();}
  }catch{/* A direct visit returns to the EP through the normal link. */}
 });
})();
