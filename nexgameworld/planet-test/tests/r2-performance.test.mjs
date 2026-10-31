import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createR2AdaptiveRenderBudget,createR2SceneSnapshot,compareR2SceneSnapshots}
 from '../r2-performance.js';
import {createShadowRefreshBudget} from '../render-budget.js';
import {createFrameProfiler} from '../frame-performance.js';

function play(budget,ms,seconds,{quality='high',enabled=true}={}){
 let changed=0;
 const fps=Math.round(1000/ms);
 for(let i=0;i<fps*seconds;i++)if(budget.observe(ms,ms/1000,{enabled,quality}))changed++;
 return changed;
}
test('R2-04 is opt-in and never reduces baseline graphics budget',()=>{
 const adaptive=createR2AdaptiveRenderBudget();
 assert.deepEqual(adaptive.settings('high',false),{stage:0,pixelRatioCap:Infinity,shadowHz:0});
 assert.equal(adaptive.observe(50,.05,{enabled:false,quality:'high'}),false);
 assert.equal(adaptive.stage,0);
 const shadow=createShadowRefreshBudget();let count=0;
 for(let i=0;i<60;i++)count+=Number(shadow.next(1/60,{enabled:true,quality:'high',maxHz:0}));
 assert.equal(count,60,'default high preset refresh unchanged');
 assert.equal(adaptive.settings('balanced',true).shadowHz,30);
 assert.equal(adaptive.settings('economy',true).pixelRatioCap,Infinity);
});
test('stable 45 fps iPhone preserves pixel ratio; slow sustained frames trigger bounded cap',()=>{
 const b=createR2AdaptiveRenderBudget();
 play(b,1000/45,6);
 assert.equal(b.stage,0,'steady 45Hz must remain sharp');
 play(b,40,3);
 assert.equal(b.stage,2,'sustained 25fps should engage protective mode');
 let s=b.settings('high',true);
 assert.equal(s.pixelRatioCap,1.25);assert.equal(s.shadowHz,18);
 assert.equal(b.settings('balanced',true).pixelRatioCap,1);
 assert.equal(b.settings('high',false).pixelRatioCap,Infinity);
});
test('adaptive resolution recovers gradually and resets for preset changes or Safari backgrounding',()=>{
 const b=createR2AdaptiveRenderBudget();
 play(b,42,3);assert.equal(b.stage,2);
 play(b,16.67,5);assert.equal(b.stage,2,'avoid flicker from a short good interval');
 play(b,16.67,5);assert.ok(b.stage<=1,'recovery requires sustained good performance after the slow-window clears');
 play(b,16.67,10);assert.equal(b.stage,0);
 play(b,42,3);assert.equal(b.stage,2);
 b.observe(16,1/60,{enabled:true,quality:'balanced'});
 assert.equal(b.stage,0,'new graphic quality resets old samples');
 b.observe(16,1/60,{enabled:true,quality:'balanced',hidden:true});
 assert.equal(b.stage,0);
});
test('R2-04 high shadows reduce updates; baseline balanced and high unchanged',()=>{
 const normal=createShadowRefreshBudget(),optimized=createShadowRefreshBudget();
 let full=0,saved=0;
 for(let i=0;i<120;i++){
  full+=Number(normal.next(1/60,{enabled:true,quality:'high'}));
  saved+=Number(optimized.next(1/60,{enabled:true,quality:'high',maxHz:30}));
 }
 assert.equal(full,120);
 assert.ok(saved>=59&&saved<=61,'30 Hz shadows halve redraws on 60 Hz display');
 const throttled=createShadowRefreshBudget();let calls=0;
 for(let i=0;i<120;i++)calls+=Number(throttled.next(1/60,{enabled:true,quality:'high',maxHz:18}));
 assert.ok(calls>=35&&calls<=38);
 assert.equal(throttled.next(1/60,{enabled:false,quality:'high',maxHz:18}),false);
 assert.equal(throttled.next(1/60,{enabled:true,quality:'high',maxHz:18}),true,
  'returning from orbit redraws immediately');
});
test('real-world A/B report contains only anonymous frame statistics and full scene coverage',()=>{
 const profile=createFrameProfiler();
 for(let i=0;i<90;i++){profile.record(20,6,'world',112);profile.record(25,6,'camera',122)}
 const first=createR2SceneSnapshot({profile,version:'0.6.45.59',quality:'high',r2:'mat:0 flora:0 light:0 perf:0',dpr:1.65});
 assert.deepEqual(Object.keys(first.results),['world','camera']);
 profile.reset();
 for(let i=0;i<90;i++){profile.record(17,5,'world',108);profile.record(22,5,'camera',112)}
 const last=createR2SceneSnapshot({profile,version:'0.6.45.59',quality:'high',r2:'mat:1 flora:1 light:1 perf:1',dpr:1.42});
 const comparison=compareR2SceneSnapshots(first,last);
 assert.match(comparison,/Мир: FPS 50 → 58\.8/);
 assert.match(comparison,/Камера: FPS 40 → 45\.5/);
 assert.match(comparison,/Бой: недостаточно кадров/);
 assert.match(comparison,/DPR 1\.42/);
 assert.doesNotMatch(JSON.stringify(first)+comparison,/sessionToken|accountId|characterId|positionNormal/);
 assert.match(compareR2SceneSnapshots(null,last),/Нет пары замеров/);
});
test('live game exposes opt-in guard, A/B comparison and a real post-render PNG capture',()=>{
 const s=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(s,/get\('r2perf'\)==='1'/);
 assert.match(s,/shadowBudget\.next\(dt,\{/);
 assert.match(s,/maxHz:shadowSettings\.shadowHz/);
 assert.match(s,/renderer\.setPixelRatio\(nextRatio\)/);
 assert.match(s,/canvas\.toBlob\(blob=>/);
 assert.match(s,/renderer\.render\(scene,camera\);\n    if\(pendingR2Capture/);
 assert.match(html,/id="r2PerformanceToggle"/);
 assert.match(html,/id="saveR2Baseline"/);
 assert.match(html,/id="compareR2Frames"/);
 assert.match(html,/id="captureR2Frame"/);
});
