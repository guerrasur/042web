/* Keep outbound navigation native: installed app when supported, web in a new tab otherwise. */
'use strict';
(()=>{
 const androidIntents=/Android/i.test(navigator.userAgent)&&/(?:Chrome|Chromium|SamsungBrowser|EdgA)\//i.test(navigator.userAgent);
 const packages={
  'instagram.com':'com.instagram.android',
  'youtube.com':'com.google.android.youtube',
  'music.youtube.com':'com.google.android.apps.youtube.music',
  'open.spotify.com':'com.spotify.music',
  'deezer.com':'deezer.android.app',
  'music.apple.com':'com.apple.android.music',
  'bandcamp.com':'com.bandcamp.android',
  'ok.ru':'ru.ok.android'
 };
 for(const link of document.querySelectorAll('a[href]')){
  let url;
  try{url=new URL(link.getAttribute('href'),document.baseURI);}catch{continue;}
  if(url.protocol!=='https:'||url.origin===new URL(document.baseURI).origin)continue;
  // Use the canonical video URL so the OS can match YouTube's app association directly.
  if(url.hostname==='youtu.be'){
   const video=url.pathname.slice(1);
   if(/^[\w-]{11}$/.test(video)){
    const canonical=new URL('https://www.youtube.com/watch');
    canonical.searchParams.set('v',video);
    for(const [key,value] of url.searchParams)if(key!=='v')canonical.searchParams.append(key,value);
    canonical.hash=url.hash;url=canonical;
   }
  }
  const web=url.href;
  link.target='_blank';link.rel='noopener noreferrer';
  link.href=web;
  const host=url.hostname.replace(/^www\./,'');
  const app=packages[host]||(host.endsWith('.bandcamp.com')?packages['bandcamp.com']:null);
  // On iOS and other browsers HTTPS remains a Universal/App Link with its native web fallback.
  // Android Chrome supports an explicit package and a browser fallback on the same user click.
  if(androidIntents&&app&&!url.hash){
   link.href=`intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=${app};S.browser_fallback_url=${encodeURIComponent(web)};end`;
  }
 }
})();
