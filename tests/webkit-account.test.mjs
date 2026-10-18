// WebKit smoke tests against a LOCAL static Nexions.ru mirror with a mocked API.
// No real NexGameWorld player accounts are created, modified or deleted.
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {webkit} from 'playwright';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const characterId='11111111-1111-4111-8111-111111111111';
const token='A'.repeat(43);
let server,base,browser;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};

before(async()=>{
 server=createServer(async(req,res)=>{
  try{
   const original=new URL(req.url,'http://localhost').pathname;
   let pathname=decodeURIComponent(original);
   if(pathname==='/nexgameworld/')pathname+='index.html';
   // Prevent path traversal in the test fixture server.
   const filename=resolve(root,'.'+pathname);
   if(!filename.startsWith(root+sep))throw Error('invalid test path');
   if(pathname==='/nexgameworld/planet-test/'){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end('<!doctype html><title>WebKit launcher fixture</title><p id="fake-world">Local game-frame fixture</p>');return;
   }
   const buffer=await readFile(filename);
   res.writeHead(200,{'content-type':mime[extname(filename)]||'application/octet-stream','cache-control':'no-store'});
   res.end(buffer);
  }catch{
   res.writeHead(404,{'content-type':'text/plain'});res.end('not found');
  }
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port;
 browser=await webkit.launch({headless:true});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});

async function portrait(){
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
 });
 const page=await context.newPage();
 page.setDefaultTimeout(12000);
 return {context,page};
}
async function fakeApi(page){
 const requests=[];
 await page.route('https://nexgame-world.onrender.com/api/ngw/**',async route=>{
  const req=route.request();
  const u=new URL(req.url());
  requests.push({path:u.pathname,method:req.method(),auth:req.headers().authorization||''});
  const headers={
   'access-control-allow-origin':'*',
   'access-control-allow-methods':'GET,POST,DELETE,OPTIONS',
   'access-control-allow-headers':'authorization,content-type',
   'cache-control':'no-store'
  };
  if(req.method()==='OPTIONS'){
   await route.fulfill({status:204,headers});return;
  }
  let body={error:'unexpected fake API call'},status=404;
  if(u.pathname==='/api/ngw/login'){
   body={token,account:{username:'smoke_hero'}};status=200;
  }else if(u.pathname==='/api/ngw/characters'){
   body={slots:4,characters:[{id:characterId,nickname:'Тестовый герой',level:3}]};status=200;
  }else if(u.pathname==='/api/ngw/me'){
   body={username:'smoke_hero'};status=200;
  }
  await route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(body)});
 });
 return requests;
}
async function fakeRemoteVersions(page){
 // This verifies the mirror's account-launch logic without relying on GitHub/CDN.
 await page.route('https://raw.githubusercontent.com/**',route=>route.abort());
 await page.route('https://nexions-link.github.io/**',route=>route.abort());
}
async function signIn(page){
 await page.goto(base+'/nexgameworld/account.html');
 await page.locator('#loginName').fill('smoke_hero');
 await page.locator('#loginPass').fill('test-only-password');
 await page.locator('#loginForm button[type=submit]').click();
 await page.locator('#characters:not([hidden])').waitFor();
}

test('portrait WebKit shows account screen without horizontal overflow',async()=>{
 const {context,page}=await portrait();
 try{
  await page.goto(base+'/nexgameworld/account.html');
  assert.equal(await page.locator('#login').isVisible(),true);
  assert.equal(await page.locator('#loginPass').getAttribute('type'),'password');
  await page.locator('[data-show-password="loginPass"]').click();
  assert.equal(await page.locator('#loginPass').getAttribute('type'),'text');
  await page.locator('[data-view="register"]').click();
  assert.equal(await page.locator('#register').isVisible(),true);
  assert.equal(await page.locator('#loginPass').getAttribute('type'),'password');
  const dims=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,viewWidth:innerWidth}));
  assert.ok(dims.pageWidth<=dims.viewWidth+2,JSON.stringify(dims));
 }finally{await context.close();}
});

test('bare game route and account-play without a session do not start anonymous world',async()=>{
 const {context,page}=await portrait();
 try{
  await page.goto(base+'/nexgameworld/');
  await page.waitForURL('**/nexgameworld/account.html');
  await page.goto(base+'/nexgameworld/?account-play=1');
  await page.waitForURL('**/nexgameworld/account.html');
  assert.equal(await page.locator('#login').isVisible(),true);
  assert.equal(await page.locator('iframe#game').count(),0);
 }finally{await context.close();}
});

test('mock account selects a hero and launches only same-origin game frame',async()=>{
 const {context,page}=await portrait();
 try{
  const requests=await fakeApi(page);
  await fakeRemoteVersions(page);
  await signIn(page);
  await page.locator('.hero button', {hasText:'Выбрать'}).first().click();
  await page.waitForURL(/\/nexgameworld\/\?account-play=1/);
  const launched=await page.evaluate(()=>({
   path:location.pathname,href:location.href,
   session:sessionStorage.getItem('ngw-alpha-session'),
   hero:sessionStorage.getItem('ngw-selected-character')
  }));
  assert.equal(launched.session,token);
  assert.equal(launched.hero,characterId);
  assert.ok(!launched.href.includes(token),'Token must never be copied to the address');
  assert.ok(!launched.href.includes(characterId),'Character ID must remain in sessionStorage');
  await page.locator('#game').waitFor({state:'attached'});
  await page.waitForFunction(()=>document.querySelector('#game')?.src.includes('v=0.6.41.4'));
  const iframe=await page.locator('#game').getAttribute('src');
  assert.equal(new URL(iframe).origin,base,'Authenticated game must stay same-origin');
  assert.equal(new URL(iframe).pathname,'/nexgameworld/planet-test/');
  assert.ok(requests.some(x=>x.path==='/api/ngw/characters'&&x.auth==='Bearer '+token));
  assert.equal(requests.filter(x=>x.method==='DELETE').length,0);
 }finally{await context.close();}
});

test('mobile delete dialog cannot submit without exact character name',async()=>{
 const {context,page}=await portrait();
 try{
  const requests=await fakeApi(page);
  await signIn(page);
  await page.locator('.hero .delete-hero').first().click();
  assert.equal(await page.locator('#deleteDialog').evaluate(e=>e.open),true);
  assert.equal(await page.locator('#confirmDelete').isDisabled(),true);
  await page.locator('#deleteConfirmName').fill('Wrong');
  assert.equal(await page.locator('#confirmDelete').isDisabled(),true);
  await page.locator('#deleteConfirmName').fill('Тестовый герой');
  assert.equal(await page.locator('#confirmDelete').isEnabled(),true);
  await page.locator('#cancelDelete').click();
  assert.equal(await page.locator('#deleteDialog').evaluate(e=>e.open),false);
  assert.equal(requests.filter(x=>x.method==='DELETE').length,0);
 }finally{await context.close();}
});
