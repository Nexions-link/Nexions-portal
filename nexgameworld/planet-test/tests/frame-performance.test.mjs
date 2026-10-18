import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameProfiler,FRAME_SCENES,selectFrameScene} from '../frame-performance.js';

test('deterministic camera/combat/house classification with combat priority',()=>{
 assert.deepEqual(Object.keys(FRAME_SCENES),['world','camera','combat','house']);
 assert.equal(selectFrameScene({dragging:true}),'camera');
 assert.equal(selectFrameScene({dragging:true,orbit:true}),'world');
 assert.equal(selectFrameScene({house:true}),'house');
 assert.equal(selectFrameScene({combat:true,house:true,dragging:true}),'combat');
 assert.equal(selectFrameScene(), 'world');
});

test('identifies a 45Hz steady frame budget and 95th percentile independently of FPS',()=>{
 const profile=createFrameProfiler();
 for(let i=0;i<450;i++)assert.equal(profile.record(1000/45,8,'camera',71),true);
 const row=profile.stats('camera');
 assert.equal(row.frames,450);
 assert.ok(Math.abs(row.fps-45)<.001);
 assert.ok(Math.abs(row.p95Ms-1000/45)<.001);
 assert.equal(row.slowFrames,0);
 assert.equal(row.maxDrawCalls,71);
 assert.equal(profile.stats('house'),null);
 assert.match(profile.format('camera'),/FPS 45.*Камера/);
});

test('p95 reveals bursts of long frames during multi-mob combat',()=>{
 const profile=createFrameProfiler({capacity:100});
 for(let i=0;i<95;i++)profile.record(1000/60,10,'combat',140);
 for(let i=0;i<5;i++)profile.record(95,15,'combat',210);
 const row=profile.stats('combat');
 assert.equal(row.frames,100);
 assert.equal(row.slowFrames,5);
 assert.ok(row.p95Ms<20,'95th percentile ignores isolated worst 5%');
 assert.equal(row.maxMs,95);
 assert.equal(row.maxDrawCalls,210);
 assert.match(profile.report({version:'0.6.42.3',quality:'balanced'}),/Бой: кадров 100/);
});

test('rolling 600-frame capacity cannot accumulate unlimited samples or player data',()=>{
 const profile=createFrameProfiler({capacity:8});
 for(let i=0;i<20;i++)profile.record(i%2?20:15,5,'house');
 const row=profile.stats('house');
 assert.equal(row.frames,8);
 assert.ok(row.fps>55&&row.fps<60);
 const report=profile.report({version:'local',quality:'high'});
 assert.ok(report.includes('Дом: кадров 8'));
 assert.ok(!report.includes('token')&&!report.includes('accountId'));
 profile.reset();
 assert.equal(profile.stats('house'),null);
});

test('Safari tab pauses, invalid frame times and clock regressions are excluded',()=>{
 const profile=createFrameProfiler();
 assert.equal(profile.record(1600,1,'world'),false);
 assert.equal(profile.record(-4,2,'world'),false);
 assert.equal(profile.record(16,Infinity,'world'),false);
 assert.equal(profile.record(NaN,2,'world'),false);
 assert.equal(profile.record(16,2,'world',NaN),true);
 assert.equal(profile.stats('world').frames,1);
 assert.equal(profile.stats('world').maxDrawCalls,0);
});

test('all four scenes are separately sampled and CPU cost is not mislabeled GPU time',()=>{
 const profile=createFrameProfiler();
 const values={world:16,camera:25,combat:50,house:33};
 for(const [scene,ms] of Object.entries(values))for(let i=0;i<60;i++)
  profile.record(ms,4,scene,60);
 for(const [scene,ms] of Object.entries(values)){
  assert.ok(Math.abs(profile.stats(scene).fps-1000/ms)<.001);
  assert.equal(profile.stats(scene).avgCpuMs,4);
 }
 assert.equal(profile.stats('combat').slowFrames,60);
 assert.ok(profile.report().includes('JS/WebGL'));
});
