/* Release reminders. The private contact list is never read by the browser. */
'use strict';
(()=>{
 const config=window.PRESAVE_CONFIG||{};
 const dialog=document.getElementById('presave-dialog');
 const trigger=document.getElementById('presave');
 const choice=document.getElementById('presave-choice');
 const entry=document.getElementById('presave-entry');
 const thanks=document.getElementById('presave-thanks');
 const title=document.getElementById('presave-entry-title');
 const contact=document.getElementById('presave-contact');
 const label=document.getElementById('presave-contact-label');
 const form=document.getElementById('presave-form');
 const error=document.getElementById('presave-error');
 const submit=form.querySelector('button[type=submit]');
 const back=dialog.querySelector('.presave-back');
 const dog=dialog.querySelector('.presave-dog');
 const lane=dialog.querySelector('.presave-dog-lane');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let channel='',session=0,busy=false,dogImages=null,dogLoading=null;
 let walk=null,stepTimer=0,lapTimer=0,step=0,dogRun=0;

 function show(stage){
  choice.hidden=stage!=='choice';entry.hidden=stage!=='entry';thanks.hidden=stage!=='thanks';
  dialog.setAttribute('aria-labelledby',stage==='choice'?'presave-title':stage==='entry'?'presave-entry-title':'presave-thanks');
 }
 function setBusy(value){
  busy=value;submit.disabled=value;back.disabled=value;contact.readOnly=value;
  form.setAttribute('aria-busy',String(value));submit.textContent=value?'Guardando…':'Listo';
 }
 function choose(value){
  channel=value;contact.value='';error.textContent='';contact.removeAttribute('aria-invalid');
  const phone=value==='whatsapp';
  title.textContent=phone?'Dejá el número al que querés que te avise':'Dejá el mail al que querés que te avise';
  label.textContent=phone?'Número de Whatsapp':'Mail';
  contact.type=phone?'tel':'email';contact.inputMode=phone?'tel':'email';
  contact.autocomplete=phone?'tel-national':'email';contact.maxLength=phone?24:254;
  contact.placeholder=phone?'XX XXXX-XXXX':'elgordofidel.cabj@gmail.com';
  contact.autocapitalize='none';contact.spellcheck=false;
  show('entry');contact.focus({preventScroll:true});
 }
 function formatPhone(value){
  const digits=value.replace(/\D/g,'').slice(0,10);
  return digits.slice(0,2)+(digits.length>2?' '+digits.slice(2,6):'')+(digits.length>6?'-'+digits.slice(6):'');
 }
 function caretForDigits(value,count){
  if(!count)return 0;
  let seen=0;for(let i=0;i<value.length;i++)if(/\d/.test(value[i])&&++seen===count)return i+1;
  return value.length;
 }
 contact.addEventListener('beforeinput',event=>{
  if(channel!=='whatsapp'||event.inputType!=='deleteContentBackward'||contact.selectionStart!==contact.selectionEnd)return;
  const at=contact.selectionStart;
  if(at>0&&/[ -]/.test(contact.value[at-1])){
   event.preventDefault();
   const count=contact.value.slice(0,at).replace(/\D/g,'').length;
   const digits=contact.value.replace(/\D/g,'');
   contact.value=formatPhone(digits.slice(0,count-1)+digits.slice(count));
   const caret=caretForDigits(contact.value,count-1);contact.setSelectionRange(caret,caret);
  }
 });
 contact.addEventListener('input',()=>{
  error.textContent='';contact.removeAttribute('aria-invalid');
  if(channel!=='whatsapp')return;
  const count=contact.value.slice(0,contact.selectionStart).replace(/\D/g,'').length;
  contact.value=formatPhone(contact.value);
  const caret=caretForDigits(contact.value,count);contact.setSelectionRange(caret,caret);
 });

 function stopDog(){
  dogRun++;
  clearTimeout(stepTimer);clearTimeout(lapTimer);stepTimer=lapTimer=0;
  if(walk){walk.onfinish=null;walk.cancel();walk=null;}
 }
 function dogStep(){
  if(!dogImages||!dialog.open||document.hidden||reduced.matches)return;
  step=1-step;dogImages[0].hidden=step!==0;dogImages[1].hidden=step!==1;
  stepTimer=setTimeout(dogStep,500);
 }
 function dogLap(){
  if(!dogImages||!dialog.open||document.hidden||reduced.matches)return;
  dog.hidden=false;
  const distance=lane.clientWidth+dog.clientWidth;
  const duration=distance/Math.max(10,Number(config.dogSpeed)||28)*1000;
  walk=dog.animate([{transform:`translateX(${-dog.clientWidth}px)`},{transform:`translateX(${lane.clientWidth}px)`}],{duration,easing:'linear',fill:'forwards'});
  walk.onfinish=()=>{const finished=walk;walk=null;dog.hidden=true;finished.cancel();lapTimer=setTimeout(dogLap,1000);};
 }
 async function startDog(){
  stopDog();
  const run=dogRun;
  if(!dogLoading){
   dogLoading=Promise.all((config.dogSprites||[]).slice(0,2).map(src=>new Promise((resolve,reject)=>{
    const img=new Image();img.alt='';img.draggable=false;img.onload=()=>resolve(img);img.onerror=reject;img.src=src;
   }))).then(images=>{
    if(images.length===2){dogImages=images;dog.replaceChildren(...images);}
   }).catch(()=>{/* The artist's two sprites can be added later without a broken image. */});
  }
  await dogLoading;
  if(run!==dogRun||!dogImages||!dialog.open||document.hidden)return;
  step=0;dogImages[0].hidden=false;dogImages[1].hidden=true;dog.hidden=false;
  if(reduced.matches){dog.style.transform='translateX(22px)';return;}
  dog.style.transform='';stepTimer=setTimeout(dogStep,500);dogLap();
 }

 trigger.addEventListener('click',()=>{
  session++;setBusy(false);error.textContent='';contact.value='';show('choice');
  dialog.showModal();dialog.querySelector('[data-channel]').focus({preventScroll:true});startDog();
 });
 dialog.querySelector('.presave-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{session++;stopDog();trigger.focus({preventScroll:true});});
 back.addEventListener('click',()=>{show('choice');dialog.querySelector('[data-channel]').focus({preventScroll:true});});
 dialog.querySelectorAll('[data-channel]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.channel)));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDog();else if(dialog.open)startDog();});
 reduced.addEventListener('change',()=>{if(dialog.open)startDog();});

 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const phone=channel==='whatsapp';
  const value=phone?contact.value.replace(/\D/g,''):contact.value.trim().toLowerCase();
  if(phone?!/^\d{10}$/.test(value):!value||!contact.validity.valid){
   error.textContent=phone?'Escribí los 10 dígitos, por ejemplo 11 6018-1192.':'Revisá que el mail esté completo.';
   contact.setAttribute('aria-invalid','true');contact.focus({preventScroll:true});return;
  }
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.endpoint||'')){
   error.textContent='Todavía no se habilitó el registro. Volvé a intentar más tarde.';return;
  }
  const current=session;setBusy(true);error.textContent='';
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch(config.endpoint,{
    method:'POST',redirect:'follow',credentials:'omit',signal:controller.signal,
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({channel,contact:value,website:document.getElementById('presave-website').value})
   });
   if(!response.ok)throw new Error('http');
   const result=await response.json();if(result.ok!==true)throw new Error('save');
   if(current===session&&dialog.open){show('thanks');dialog.querySelector('.presave-close').focus({preventScroll:true});}
  }catch{
   if(current===session&&dialog.open)error.textContent='No se pudo confirmar el guardado. Tocá Listo para volver a intentar.';
  }finally{
   clearTimeout(timer);if(current===session)setBusy(false);
  }
 });
})();
