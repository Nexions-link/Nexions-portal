import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const page=readFileSync(new URL('../nexgameworld/index.html',import.meta.url),'utf8');
const match=page.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
assert.ok(match,'game launcher inline script must exist');
const launcher=match[1];
async function attempt({local='0.6.34.1',upstream='0.6.34.1',accountPlay=true}={}){
 const params=accountPlay?'?account-play=1':'';
 const frame={src:null,addEventListener(type,callback){
  if(type==='load')this.loadCallback=callback;
 }};
 const loading={hidden:false,querySelector(){return this.paragraph||(this.paragraph={textContent:'Загружаем игровой мир…'})}};
 const notice={hidden:true};
 const retries=[];
 const context={
  document:{getElementById(id){return {game:frame,loading,notice}[id]}},
  location:{href:'https://nexions.ru/nexgameworld/'+params,search:params},
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
 return {frame,loading,notice,retries};
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
test('non-account players select newer four-part upstream release',async()=>{
 const result=await attempt({local:'0.6.34',upstream:'0.6.34.1',accountPlay:false});
 assert.match(result.frame.src,/nexions-link\.github\.io\/Nexgame\/planet-test\/\?v=0\.6\.34\.1/);
 assert.equal(result.notice.hidden,false);
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
