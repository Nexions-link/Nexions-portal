import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 let submitted=null;
 await page.route('https://api.nexions.ru/**',route=>{
  if(route.request().method()==='POST')submitted=route.request().postDataJSON();
  return route.fulfill({json:{account:{username:'VisualTest'},characters:[],slots:3}});
 });
 await page.addInitScript(()=>sessionStorage.setItem('ngw-alpha-session','a'.repeat(43)));
 await page.goto('http://127.0.0.1:8765/nexgameworld/account.html');
 await page.locator('#characters').waitFor({state:'visible'});
 await page.locator('.creation-stage canvas').waitFor();
 for(const race of ['hornfolk','orc'])for(const klass of ['warrior','hunter']){
  await page.locator(`label:has(input[value="${race}"])`).click();
  await page.locator(`label:has(input[value="${klass}"])`).click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.creation-stage').getAttribute('data-failed'),null);
  await page.screenshot({path:`artifacts/create-${race}-${klass}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No mobile horizontal overflow');
 await page.screenshot({path:'artifacts/create-mobile.png',fullPage:true});
 await page.locator('#heroName').fill('Следопыт');
 await page.locator('#characterForm button[type="submit"]').click();
 await page.waitForTimeout(200);
 assert.deepEqual(submitted,{nickname:'Следопыт',raceId:'orc',classId:'hunter'});
 assert.deepEqual(errors,[]);
 console.log('All four race/class previews render; mobile layout and creation payload verified.');
}finally{await browser.close();}
