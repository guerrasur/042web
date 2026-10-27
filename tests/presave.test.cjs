const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function receiver(){
 const rows=[['Fecha de inscripción','Canal','Contacto','Avisado','Clave']];
 let locked=false,available=true,releases=0,flushes=0;
 const sheet={getLastRow:()=>rows.length,getRange:(row,col)=>({
  createTextFinder:key=>({matchEntireCell(){return this},useRegularExpression(){return this},findNext:()=>rows.slice(1).some(r=>r[4]===key)?{}:null}),
  setNumberFormats(){return this},setValues(values){rows[row-1]=values[0];return this}
 })};
 const context=vm.createContext({Date,JSON,
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>available?'private-sheet':null})},
  LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true},hasLock:()=>locked,releaseLock:()=>{locked=false;releases++}})},
  SpreadsheetApp:{openById:()=>({getSheetByName:name=>name==='Contactos'?sheet:null}),flush:()=>flushes++}
 });
 vm.runInContext(code,context);
 return {rows,context,post:data=>context.doPost({postData:{contents:typeof data==='string'?data:JSON.stringify(data)}}),get locked(){return locked},get releases(){return releases},get flushes(){return flushes},disable(){available=false}};
}
test('collector saves a formatted phone as text and deduplicates retries',()=>{
 const app=receiver();
 assert.equal(app.post({channel:'whatsapp',contact:'1100000000'}).ok,true);
 assert.equal(app.rows[1][2],'11 0000-0000');assert.equal(app.rows[1][3],'Pendiente');
 assert.equal(app.post({channel:'whatsapp',contact:'1100000000'}).ok,true);
 assert.equal(app.rows.length,2);assert.equal(app.releases,2);assert.equal(app.locked,false);assert.equal(app.flushes,1);
});
test('collector normalizes email and blocks spreadsheet formula execution',()=>{
 const app=receiver();
 assert.equal(app.post({channel:'mail',contact:'TEST@EXAMPLE.COM'}).ok,true);
 assert.equal(app.rows[1][2],'test@example.com');
 assert.equal(app.post({channel:'mail',contact:'test@example.com'}).ok,true);assert.equal(app.rows.length,2);
 assert.equal(app.post({channel:'mail',contact:'=test@example.com'}).ok,true);
 assert.equal(app.rows[2][2],"'=test@example.com");
});
test('invalid or oversized requests and a honeypot do not write records',()=>{
 const app=receiver();
 for(const data of ['not json',null,{channel:'sms',contact:'1100000000'},{channel:'mail',contact:'a@'},{channel:'mail',contact:123},{channel:'whatsapp',contact:'11000'},{channel:'whatsapp',contact:'1100000000',website:'spam'},'x'.repeat(2049)])assert.equal(app.post(data).ok,false);
 assert.equal(app.rows.length,1);
 app.disable();assert.equal(app.post({channel:'mail',contact:'test@example.com'}).ok,false);
});
test('public health check does not expose private contacts or sheet identifiers',()=>{
 const app=receiver();app.post({channel:'mail',contact:'test@example.com'});
 assert.deepEqual(app.context.doGet(),{ok:true,service:'042-release-reminders'});
});

function popup(fetch){
 class Element {
  constructor(){this.events={};this.attrs={};this.hidden=false;this.value='';this.selectionStart=this.selectionEnd=0;this.style={};}
  addEventListener(type,callback){(this.events[type]??=[]).push(callback)}
  emit(type,event={}){return Promise.all((this.events[type]||[]).map(fn=>fn({preventDefault(){},...event})))}
  setAttribute(key,value){this.attrs[key]=value}removeAttribute(key){delete this.attrs[key]}
  focus(){document.activeElement=this}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}
  showModal(){this.open=true}close(){this.open=false;this.emit('close')}
  get validity(){return {valid:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)}}
 }
 const names=['presave-dialog','presave','presave-choice','presave-entry','presave-thanks','presave-entry-title','presave-contact','presave-contact-label','presave-form','presave-error','presave-website'];
 const el=Object.fromEntries(names.map(name=>[name,new Element()]));
 const close=new Element(),back=new Element(),submit=new Element(),dog=new Element(),lane=new Element();
 const channels=['whatsapp','mail'].map(channel=>Object.assign(new Element(),{dataset:{channel}}));
 const document={getElementById:id=>el[id],hidden:false,addEventListener(){}};
 el['presave-dialog'].querySelector=selector=>({'.presave-close':close,'.presave-back':back,'.presave-dog':dog,'.presave-dog-lane':lane,'[data-channel]':channels[0]}[selector]);
 el['presave-dialog'].querySelectorAll=()=>channels;
 el['presave-form'].querySelector=()=>submit;
 const context=vm.createContext({window:{PRESAVE_CONFIG:{endpoint:'https://script.google.com/macros/s/test/exec',dogSprites:[]},matchMedia:()=>({matches:false,addEventListener(){}})},document,Image:class{},AbortController,setTimeout,clearTimeout,fetch});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../presave.js'),'utf8'),context);
 return {el,close,submit,back,channels,open:()=>el.presave.emit('click'),choose:channel=>channels[channel==='whatsapp'?0:1].emit('click'),save:()=>el['presave-form'].emit('submit'),type:async value=>{const input=el['presave-contact'];input.value=value;input.selectionStart=input.selectionEnd=value.length;await input.emit('input')}};
}
test('popup formats phones and waits for acknowledged storage before thanking',async()=>{
 let resolve,body;
 const ui=popup((url,options)=>{body=JSON.parse(options.body);return new Promise(r=>resolve=r)});
 await ui.open();await ui.choose('whatsapp');await ui.type('1160181192');
 assert.equal(ui.el['presave-contact'].value,'11 6018-1192');
 const saving=ui.save();assert.equal(ui.submit.disabled,true);assert.equal(ui.el['presave-thanks'].hidden,true);
 assert.equal(body.contact,'1160181192');resolve({ok:true,json:async()=>({ok:true})});await saving;
 assert.equal(ui.el['presave-thanks'].hidden,false);assert.equal(ui.submit.disabled,false);await ui.close.emit('click');
});
test('invalid email does not submit and failed storage preserves the form for retry',async()=>{
 let requests=0;
 const ui=popup(async()=>{requests++;return {ok:true,json:async()=>({ok:false})}});
 await ui.open();await ui.choose('mail');await ui.type('incompleto');await ui.save();
 assert.equal(requests,0);assert.equal(ui.el['presave-contact'].attrs['aria-invalid'],'true');
 await ui.type('test@example.com');await ui.save();assert.equal(requests,1);
 assert.equal(ui.el['presave-entry'].hidden,false);assert.equal(ui.el['presave-thanks'].hidden,true);assert.match(ui.el['presave-error'].textContent,/No se pudo confirmar/);
 await ui.close.emit('click');
});
test('close remains available during saving and stale results do not overwrite a reopened popup',async()=>{
 let resolve;
 const ui=popup(()=>new Promise(r=>resolve=r));
 await ui.open();await ui.choose('mail');await ui.type('test@example.com');const saving=ui.save();
 await ui.close.emit('click');assert.equal(ui.el['presave-dialog'].open,false);
 await ui.open();resolve({ok:true,json:async()=>({ok:true})});await saving;
 assert.equal(ui.el['presave-choice'].hidden,false);assert.equal(ui.el['presave-thanks'].hidden,true);
 await ui.close.emit('click');
});
