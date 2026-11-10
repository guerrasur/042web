const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app-links.js'),'utf8');
function links(userAgent,hrefs){
 const anchors=hrefs.map(href=>({href,getAttribute(){return this.href}}));
 vm.runInNewContext(code,{URL,encodeURIComponent,navigator:{userAgent},document:{baseURI:'https://guerrasur.github.io/042web/?ep=1',querySelectorAll:()=>anchors}});
 return anchors;
}
test('iPhone and desktop keep native HTTPS app links and open websites in new tabs',()=>{
 for(const agent of ['Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1','Mozilla/5.0 Chrome/140.0']){
  const [instagram,youtube,ok,about]=links(agent,['https://www.instagram.com/juanalarrivey/','https://youtu.be/30dYncV5_Bs?si=share','https://ok.ru/profile/910453455641/video/14402533919257','sobre-el-ep.html']);
  assert.equal(instagram.href,'https://www.instagram.com/juanalarrivey/');
  assert.equal(youtube.href,'https://www.youtube.com/watch?v=30dYncV5_Bs&si=share');
  for(const a of [instagram,youtube,ok]){assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer');}
  assert.equal(about.href,'sobre-el-ep.html');assert.equal(about.target,undefined);
 }
});
test('Android intents select each app and preserve the HTTPS fallback without timers or popups',()=>{
 const destinations={
  'https://www.instagram.com/roccoscioletti_/':'com.instagram.android',
  'https://youtu.be/30dYncV5_Bs?si=share':'com.google.android.youtube',
  'https://music.youtube.com/playlist?list=example':'com.google.android.apps.youtube.music',
  'https://open.spotify.com/album/example':'com.spotify.music',
  'https://www.deezer.com/album/123':'deezer.android.app',
  'https://music.apple.com/ar/album/example/123':'com.apple.android.music',
  'https://0051.bandcamp.com/':'com.bandcamp.android',
  'https://ok.ru/profile/910453455641/video/14402533919257':'ru.ok.android'
 };
 const anchors=links('Mozilla/5.0 (Linux; Android 15) Chrome/140.0',Object.keys(destinations));
 for(const [i,app] of Object.values(destinations).entries()){
  const a=anchors[i];assert(a.href.startsWith('intent://'));assert(a.href.includes(`;package=${app};`));
  const fallback=decodeURIComponent(a.href.split('S.browser_fallback_url=')[1].split(';end')[0]);
  assert(fallback.startsWith('https://'));assert.equal(a.target,'_blank');
 }
});
test('unrelated destinations, fragments and unsupported browsers retain HTTPS fallback',()=>{
 const [unknown,fragment,internal]=links('Android Chrome/140.0',['https://example.com/','https://www.youtube.com/watch?v=30dYncV5_Bs#t=30','./?ep=1']);
 assert.equal(unknown.href,'https://example.com/');assert(fragment.href.endsWith('#t=30'));assert.equal(internal.target,undefined);
 const [instagram]=links('Android Firefox/140.0',['https://www.instagram.com/tomasalfiz/']);
 assert(instagram.href.startsWith('https://'));
});
