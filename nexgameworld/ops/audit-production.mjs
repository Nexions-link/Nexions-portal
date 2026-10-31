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
 worldOrigin='https://api.nexions.ru',
 timeoutMs=55000
}={}){
 if(typeof fetchImpl!=='function')throw Error('fetch is required');
 let requestSerial=0;
 const get=async (origin,path,format='json')=>{
  const endpointUrl=new URL(url(origin,path));
  endpointUrl.searchParams.set('ngw_audit',String(Date.now())+'-'+(++requestSerial));
  const endpoint=endpointUrl.href;
  // A scheduled read should bypass edge caches without changing canonical URLs.
  const response=await fetchImpl(endpoint,{
   cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
   headers:{accept:format==='json'?'application/json':format==='script'?
    'text/javascript,application/javascript':'text/plain'}
  });
  if(!response.ok)throw Error(new URL(endpoint).pathname+' HTTP '+response.status);
  if(format==='script'){
   // Browser ES modules require a JavaScript MIME. A 200 HTML fallback
   // or a CDN error document is NOT a successful game release.
   const type=response.headers?.get?.('content-type')||'';
   if(type&&!/\b(?:java|ecma)script\b/i.test(type))
    throw Error('Game JS module served with invalid MIME '+type+': '+endpointUrl.pathname);
   const body=await response.text();
   if(!body.trim()||/^\s*<!doctype html/i.test(body))
    throw Error('Game JS module is an empty/HTML response: '+endpointUrl.pathname);
   return body;
  }
  return format==='json'?response.json():response.text();
 };
 const [health,ready,manifest,upstream,clientHtml,launcherHtml,gameCode,houseCode,sessionCode,accountCode,accountHtml]=await Promise.all([
  get(worldOrigin,'/health'),get(worldOrigin,'/ready'),
  get(siteOrigin,'/nexgameworld/planet-test/version.json'),
  get(siteOrigin,'/nexgameworld/upstream-commit.txt','text'),
  get(siteOrigin,'/nexgameworld/planet-test/index.html','text'),
  get(siteOrigin,'/nexgameworld/','text'),
  get(siteOrigin,'/nexgameworld/planet-test/planet.js','script'),
  get(siteOrigin,'/nexgameworld/planet-test/hearth-house.js','script'),
  get(siteOrigin,'/nexgameworld/planet-test/account-session.js','text'),
  get(siteOrigin,'/nexgameworld/account.js','text'),
  get(siteOrigin,'/nexgameworld/account.html','text')
 ]);
 const latest=String(manifest?.version||''),build=String(health?.build||'');
 const publishedSha=String(upstream).trim().toLowerCase();
 if(health?.ok!==true||health?.world!=='nexgameworld')
  throw Error('VPS /health is not the active NexGameWorld server');
 if(ready?.ready!==true)throw Error('VPS /ready does not confirm PostgreSQL availability');
 if(health?.databaseConfigured!==true||health?.accountDbStatus!=='ready'||
    health?.accountApiEnabled!==true||health?.authenticatedWorldEnabled!==true||
    health?.authenticatedEconomyEnabled!==true)
  throw Error('Production account or economy service is not ready');
 if(health?.guestWorldEnabled!==false)throw Error('Guest world must remain disabled');
 if(!VERSION.test(latest)||!VERSION.test(build)||latest!==build||ready?.build!==build)
  throw Error('Live game manifest and VPS server build do not match');
 const declared=[...clientHtml.matchAll(/\bdata-build="([^"]+)"/g)].map(match=>match[1]);
 if(declared.length!==1||declared[0]!==latest)
  throw Error('Live playable HTML and game version.json do not match: '+declared.join(',')+'/'+latest);
 const entry=clientHtml.match(/import\(['"]\.\/planet\.js\?v=(\d+)['"]\)/);
 if(!entry)throw Error('Live game HTML does not load a versioned main module');
 // Do not accept a release that only works when a third-party CDN is reachable.
 // For players in Russia the entire bootstrap must resolve same-origin.
 const importMapText=clientHtml.match(/<script\s+type=['"]importmap['"]>([\s\S]*?)<\/script>/)?.[1];
 let imports;
 try{imports=JSON.parse(importMapText||'').imports;}catch{}
 if(imports?.three!=='./vendor/three.module.js?v=160'||
    Object.values(imports||{}).some(value=>typeof value!=='string'||
     value.startsWith('https:')||value.startsWith('http:')))
  throw Error('Live browser still depends on an external Three.js CDN');
 // Check the exact URL that the browser imports, not just the unversioned
 // planet.js path. Query parameters are part of the release bootstrap.
 const [entryCode,threeCode,startZoneCode,crownCode,meadowCode]=await Promise.all([
  get(siteOrigin,'/nexgameworld/planet-test/planet.js?v='+entry[1],'script'),
  get(siteOrigin,'/nexgameworld/planet-test/vendor/three.module.js?v=160','script'),
  get(siteOrigin,'/nexgameworld/planet-test/start-zone.js','script'),
  get(siteOrigin,'/nexgameworld/planet-test/forest-crown-geometry.js','script'),
  get(siteOrigin,'/nexgameworld/planet-test/sphere-meadow.js','script')
 ]);
 if(entryCode!==gameCode||
    !threeCode.includes("const REVISION = '160';")||
    !threeCode.includes('export {')||
    !startZoneCode.includes('createStartZone')||
    !crownCode.includes('deciduousCrownData')||
    !meadowCode.includes('createSphericalMeadow'))
  throw Error('Public playable JS module graph is incomplete or stale');
 if(!launcherHtml.includes("const local='./planet-test/'")||!launcherHtml.includes('account-play'))
  throw Error('Live Nexions.ru launcher is not the same-domain authenticated game');
 if(!gameCode.includes("from './start-zone.js?v=")||!houseCode.includes('export function buildHearthHouse'))
  throw Error('Live Nexions.ru is missing required spherical game modules');
 if(!SHA.test(publishedSha))throw Error('The website upstream-commit.txt is invalid');
 if(expectedSha){
  if(!SHA.test(expectedSha))throw Error('Invalid expected source SHA');
  if(publishedSha!==expectedSha.toLowerCase())
   throw Error('Website mirror is behind Nexgame/main: '+publishedSha.slice(0,10)+' != '+expectedSha.slice(0,10));
 }
 if(!sessionCode.includes("ACCOUNT_API='https://api.nexions.ru/api/ngw'")||
    !sessionCode.includes("AUTH_WORLD_URL='wss://api.nexions.ru/ws/nexgameworld/auth'")||
    !accountCode.includes("API='https://api.nexions.ru/api/ngw'")||
    !accountHtml.includes('connect-src https://api.nexions.ru;'))
  throw Error('Live account and game clients have not switched to the VPS');
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
