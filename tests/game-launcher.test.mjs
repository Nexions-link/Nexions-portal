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

async function attempt({local='0.6.34.1',upstream='0.6.34.1',
 accountPlay=true,portalPreview=false,token=SESSION_TOKEN,characterId=CHARACTER_ID}={}){
 const params=new URLSearchParams();
 if(accountPlay)params.set('account-play','1');
 if(portalPreview)params.set('portal-preview','1');
 const search=params.size?'?'+params.toString():'';
 const frame={src:null,addEventListener(type,callback){
  if(type==='load')this.loadCallback=callback;
 }};
 const loading={hidden:false,querySelector(){return this.paragraph||(this.paragraph={textContent:'Загружаем игровой мир…'})}};
 const notice={hidden:true};
 const retries=[],redirects=[];
 const context={
  document:{getElementById(id){return {game:frame,loading,notice}[id]}},
  location:{href:'https://nexions.ru/nexgameworld/'+search,search,
   replace(url){redirects.push(url)}},
  sessionStorage:{getItem(key){
   if(key==='ngw-alpha-session')return token;
   if(key==='ngw-selected-character')return characterId;
   return null;
  }},
  URL,URLSearchParams,console:{warn(){},info(){}},
  setTimeout:(fn,delay)=>retries.push({fn,delay}),
  fetch:async url=>{
   const isLocal=String(url).startsWith('./planet-test/');
   const version=isLocal?local:upstream;
   if(!version)return {ok:false};
   return {ok:true,json:async()=>({project:'NexGameWorld',version})};
  }
 };
 runInNewContext(launcher,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {frame,loading,notice,retries,redirects};
}

test('account hero launch accepts current four-part hotfix version',async()=>{
 const result=await attempt();
 assert.match(result.frame.src,/^https:\/\/nexions\.ru\/nexgameworld\/planet-test\/\?v=0\.6\.34\.1&account-play=1$/);
 assert.equal(result.retries.length,0);
 assert.ok(result.frame.loadCallback);
 result.frame.loadCallback();
 assert.equal(result.loading.hidden,true);
});
test('account hero launch accepts older three-part releases',async()=>{
 const result=await attempt({local:'0.6.34',upstream:'0.6.34.1'});
 assert.match(result.frame.src,/nexions\.ru\/nexgameworld\/planet-test\/\?v=0\.6\.34&account-play=1/);
 assert.equal(result.retries.length,0);
});
test('portal globe preview can still select newer upstream release',async()=>{
 const result=await attempt({local:'0.6.34',upstream:'0.6.34.1',accountPlay:false,portalPreview:true});
 assert.match(result.frame.src,/nexions-link\.github\.io\/Nexgame\/planet-test\/\?v=0\.6\.34\.1/);
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
 assert.equal(result.retries[0].delay,12000);
});
test('invalid or unavailable mirror never receives account session',async()=>{
 for(const local of ['0.6.34.1.1','0.6.bad.1',null]){
  const result=await attempt({local,accountPlay:true});
  assert.equal(result.frame.src,null);
  assert.equal(result.retries.length,1);
 }
});
