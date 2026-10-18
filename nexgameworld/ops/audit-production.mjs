import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
// Read-only public production checks. No player credentials or database connections.
const VERSION=/^\d+\.\d+\.\d+(?:\.\d+)?$/;
const SHA=/^[a-f0-9]{40}$/;
const url=(origin,path)=>new URL(path,origin).href;

export async function auditProduction({
 fetchImpl=globalThis.fetch,
 expectedSha=null,
 siteOrigin='https://nexions.ru',
 worldOrigin='https://nexgame-world.onrender.com',
 timeoutMs=55000
}={}){
 if(typeof fetchImpl!=='function')throw Error('fetch is required');
 const get=async (origin,path,format='json')=>{
  const endpoint=url(origin,path);
  // A scheduled read should bypass edge caches without changing canonical URLs.
  const response=await fetchImpl(endpoint,{
   cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
   headers:{accept:format==='json'?'application/json':'text/plain'}
  });
  if(!response.ok)throw Error(new URL(endpoint).pathname+' HTTP '+response.status);
  return format==='json'?response.json():response.text();
 };
 const [health,ready,manifest,upstream]=await Promise.all([
  get(worldOrigin,'/health'),get(worldOrigin,'/ready'),
  get(siteOrigin,'/nexgameworld/planet-test/version.json'),
  get(siteOrigin,'/nexgameworld/upstream-commit.txt','text')
 ]);
 const latest=String(manifest?.version||''),build=String(health?.build||'');
 const publishedSha=String(upstream).trim().toLowerCase();
 if(health?.ok!==true||health?.world!=='nexgameworld')
  throw Error('Render /health is not the active NexGameWorld server');
 if(ready?.ready!==true)throw Error('Render /ready does not confirm PostgreSQL availability');
 if(health?.databaseConfigured!==true||health?.accountDbStatus!=='ready'||
    health?.accountApiEnabled!==true||health?.authenticatedWorldEnabled!==true||
    health?.authenticatedEconomyEnabled!==true)
  throw Error('Production account or economy service is not ready');
 if(health?.guestWorldEnabled!==false)throw Error('Guest world must remain disabled');
 if(!VERSION.test(latest)||!VERSION.test(build)||latest!==build||ready?.build!==build)
  throw Error('Live game manifest and Render server build do not match');
 if(!SHA.test(publishedSha))throw Error('The website upstream-commit.txt is invalid');
 if(expectedSha){
  if(!SHA.test(expectedSha))throw Error('Invalid expected source SHA');
  if(publishedSha!==expectedSha.toLowerCase())
   throw Error('Website mirror is behind Nexgame/main: '+publishedSha.slice(0,10)+' != '+expectedSha.slice(0,10));
 }
 const failures=Number(health?.worldMetrics?.progressSaveFailures);
 if(!Number.isFinite(failures)||failures<0)
  throw Error('Save-failure metric is missing or invalid');
 if(failures>0)throw Error('Production progressSaveFailures is nonzero: '+failures);
 return {version:latest,publishedSha,players:Number(health.players)||0,
  progressSaveFailures:failures,serverReady:true};
}

export async function auditWithRetry(options={},{
 attempts=3,delayMs=20000,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
 let last;
 for(let n=0;n<attempts;n++){
  try{return await auditProduction(options)}
  catch(error){last=error;if(n+1<attempts)await sleep(delayMs)}
 }
 throw last;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const expectedSha=process.env.GITHUB_SHA||null;
 auditWithRetry({expectedSha}).then(report=>{
  console.log('NGW production OK:',JSON.stringify({...report,
   publishedSha:report.publishedSha.slice(0,12)}));
 }).catch(error=>{
  console.error('NGW production check failed:',error.message);
  process.exitCode=1;
 });
}
