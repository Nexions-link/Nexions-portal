import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const page=readFileSync(new URL('../nexgameworld/index.html',import.meta.url),'utf8');
const match=page.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
assert.ok(match,'game launcher inline script must exist');
const launcher=match[1];
const SESSION_TOKEN='a'.repeat(43);
const CHARACTER_ID='12345678-1234-4123-8123-123456789abc';

async function attempt({local='0.6.34.1',upstream='0.6.34.1',source=upstream,
 accountPlay=true,portalPreview=false,token=SESSION_TOKEN,characterId=CHARACTER_ID}={}){
 const params=new URLSearchParams();
 if(accountPlay)params.set('account-play','1');
 if(portalPreview)params.set('portal-preview','1');
 const search=params.size?'?'+params.toString():'';
 const frame={src:null,addEventListener(type,callback){
  if(type==='load')this.loadCallback=callback;
 }};
 const loading={hidden:false,querySelector(){return this.paragraph||(this.paragraph={textContent:'Загружаем игровой мир…'})}};
 const notice={hidden:true},noticeText={textContent:''};
 const noticeReload={hidden:true,addEventListener(event,fn){if(event==='click')this.click=fn}};
 const state={local,upstream,source};
 const reloads=[];
 const retries=[],redirects=[],windowEvents={},documentEvents=[];
 const context={
  document:{hidden:false,getElementById(id){return {game:frame,loading,notice,noticeText,noticeReload}[id]},
   addEventListener(name,fn){documentEvents.push({name,fn})}},
  window:{addEventListener(name,fn){windowEvents[name]=fn}},
  location:{href:'https://nexions.ru/nexgameworld/'+search,search,
   replace(url){redirects.push(url)},reload(){reloads.push(true)}}, 
  sessionStorage:{getItem(key){
   if(key==='ngw-alpha-session')return token;
   if(key==='ngw-selected-character')return characterId;
   return null;
  }},
  URL,URLSearchParams,console:{warn(){},info(){}},
  setTimeout:(fn,delay)=>{retries.push({fn,delay});return retries.length;},
  clearTimeout:()=>{},
  fetch:async url=>{
   const address=String(url);
   const isLocal=address.startsWith('./planet-test/');
   const isSource=address.startsWith('https://raw.githubusercontent.com/');
   const version=isLocal?state.local:isSource?state.source:state.upstream;
   if(!version)return {ok:false};
   return {ok:true,json:async()=>({project:'NexGameWorld',version})};
  }
 };
 runInNewContext(launcher,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {frame,loading,notice,noticeText,noticeReload,retries,redirects,windowEvents,documentEvents,state,reloads};
}

test('account hero launch accepts current four-part hotfix version',async()=>{
 const result=await attempt();
 const url=new URL(result.frame.src);
 assert.equal(url.origin,'https://nexions.ru');
 assert.equal(url.searchParams.get('v'),'0.6.34.1');
 assert.ok(/^\d+$/.test(url.searchParams.get('fresh')));
 assert.equal(url.searchParams.get('account-play'),'1');
 assert.equal(result.retries.length,0);
 assert.ok(result.frame.loadCallback);
 result.frame.loadCallback();
 assert.equal(result.loading.hidden,true);
});
test('account hero starts compatible same-origin game during a Pages release delay',async()=>{
 const result=await attempt({local:'0.6.34',upstream:'0.6.34.1'});
 const url=new URL(result.frame.src);
 assert.equal(url.origin,'https://nexions.ru','never expose account session to fallback');
 assert.equal(url.searchParams.get('v'),'0.6.34');
 assert.equal(result.retries.length,1);
 assert.equal(result.retries[0].delay,30000);
 assert.equal(result.notice.hidden,false);
 assert.match(result.noticeText.textContent,/0\.6\.34\.1/);
 result.frame.loadCallback();
 assert.equal(result.loading.hidden,true,'game becomes playable despite delayed Pages');
});
test('portal globe preview can still select newer upstream release',async()=>{
 const result=await attempt({local:'0.6.34',upstream:'0.6.34.1',accountPlay:false,portalPreview:true});
 const url=new URL(result.frame.src);
 assert.equal(url.origin,'https://nexions-link.github.io');
 assert.equal(url.searchParams.get('v'),'0.6.34.1');
 assert.ok(url.searchParams.get('fresh'));
 assert.equal(result.notice.hidden,false);
 assert.equal(result.redirects.length,0);
});
test('bare game entry redirects to account and never renders Stranger',async()=>{
 const result=await attempt({accountPlay:false});
 assert.deepEqual(result.redirects,['/nexgameworld/account.html']);
 assert.equal(result.frame.src,null);
 assert.equal(result.retries.length,0);
});
test('account-play without selected character or session returns to account',async()=>{
 for(const options of [{token:null},{characterId:null},{token:'invalid'},{characterId:'invalid'}]){
  const result=await attempt(options);
  assert.deepEqual(result.redirects,['/nexgameworld/account.html']);
  assert.equal(result.frame.src,null);
 }
});
test('older three-part mirror still retries when too old for account launch',async()=>{
 const result=await attempt({local:'0.6.31',upstream:'0.6.34.1'});
 assert.equal(result.frame.src,null);
 assert.equal(result.retries.length,1);
 assert.equal(result.retries[0].delay,8000);
});
test('invalid or unavailable mirror never receives account session',async()=>{
 for(const local of ['0.6.34.1.1','0.6.bad.1',null]){
  const result=await attempt({local,accountPlay:true});
  assert.equal(result.frame.src,null);
  assert.equal(result.retries.length,1);
 }
});

test('source main ahead of both mirrors no longer freezes compatible account game',async()=>{
 const result=await attempt({local:'0.6.38.10',upstream:'0.6.38.10',source:'0.6.38.12'});
 assert.equal(new URL(result.frame.src).searchParams.get('v'),'0.6.38.10');
 assert.equal(result.retries.length,1);
 assert.equal(result.retries[0].delay,30000);
 assert.match(result.noticeText.textContent,/0\.6\.38\.12/);
 assert.match(result.noticeText.textContent,/0\.6\.38\.10/);
});
test('current local mirror launches even when upstream Pages is unreachable',async()=>{
 const result=await attempt({local:'0.6.38.12',upstream:null,source:'0.6.38.12'});
 const url=new URL(result.frame.src);
 assert.equal(url.origin,'https://nexions.ru');
 assert.equal(url.searchParams.get('v'),'0.6.38.12');
 assert.ok(url.searchParams.get('fresh'));
});
test('return from Safari bfcache rechecks latest build without reloading the same game',async()=>{
 const result=await attempt({local:'0.6.38.12',upstream:'0.6.38.12'});
 const first=result.frame.src;
 assert.ok(result.windowEvents.pageshow);
 result.windowEvents.pageshow({persisted:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(result.frame.src,first);
});

test('actual screenshot scenario: old 0.6.43.24 launches while 0.6.43.27 propagates',async()=>{
 const result=await attempt({local:'0.6.43.24',upstream:'0.6.43.24',source:'0.6.43.27'});
 assert.equal(new URL(result.frame.src).searchParams.get('v'),'0.6.43.24');
 result.frame.loadCallback();
 assert.equal(result.loading.hidden,true);
 assert.equal(result.notice.hidden,false);
 assert.equal(result.noticeReload.hidden,false);
});
test('when latest version appears, do not restart an active battle without consent',async()=>{
 const result=await attempt({local:'0.6.43.24',upstream:'0.6.43.27',source:'0.6.43.27'});
 const oldFrame=result.frame.src;
 result.state.local='0.6.43.27';
 result.retries[0].fn();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(result.frame.src,oldFrame,'player stays in the ongoing combat');
 assert.match(result.noticeText.textContent,/Новая версия Alpha 0\.6\.43\.27 готова/);
 assert.equal(result.noticeReload.hidden,false);
 result.noticeReload.click();
 assert.equal(result.reloads.length,1,'one tap reload explicitly selects latest');
});
