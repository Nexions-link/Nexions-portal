import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GRAPHICS_PRESETS,resolveGraphicsPreset,effectivePixelRatio,graphicsDensity} from './graphics-quality.js';
const read=name=>readFileSync(fileURLToPath(new URL(name,import.meta.url)),'utf8');

test('all three presets are real, ordered by detail and bounded for mobile',()=>{
 assert.deepEqual(Object.keys(GRAPHICS_PRESETS),['economy','balanced','high']);
 for(const key of Object.keys(GRAPHICS_PRESETS)){
  const p=GRAPHICS_PRESETS[key];
  assert.ok(p.dpr>=.5&&p.dpr<=1.7);
  assert.ok(p.fogNear>0&&p.fogFar>p.fogNear);
  assert.ok(p.grass>=0&&p.grass<=1);
  assert.ok(p.flowers>=0&&p.flowers<=1);
  assert.ok(p.reeds>=0&&p.reeds<=1);
  assert.ok(p.pebbles>=0&&p.pebbles<=1);
 }
 assert.ok(GRAPHICS_PRESETS.economy.grass<GRAPHICS_PRESETS.balanced.grass);
 assert.ok(GRAPHICS_PRESETS.balanced.grass<GRAPHICS_PRESETS.high.grass);
 assert.equal(GRAPHICS_PRESETS.economy.shadowSize,0);
 assert.equal(GRAPHICS_PRESETS.balanced.shadowSize,1024);
 assert.equal(GRAPHICS_PRESETS.high.shadowSize,2048);
});

test('pixel ratio adapts to mobile displays and homepage preview always stays light',()=>{
 assert.equal(resolveGraphicsPreset('invalid'),'balanced');
 assert.equal(resolveGraphicsPreset('economy'),'economy');
 assert.equal(effectivePixelRatio('high',2),1.65);
 assert.equal(effectivePixelRatio('balanced',3),1.3);
 assert.equal(effectivePixelRatio('economy',2),.9);
 assert.equal(effectivePixelRatio('high',3,true),1);
 assert.equal(effectivePixelRatio('balanced',.75),.75);
});

test('every graphics profile maps to all scenery density channels',()=>{
 for(const key of Object.keys(GRAPHICS_PRESETS)){
  const d=graphicsDensity(key);
  for(const field of ['grass','flowers','shrubs','pebbles','reeds','shimmer','detail']){
   assert.ok(Number.isFinite(d[field]),key+'/'+field);
   assert.ok(d[field]>=0&&d[field]<=1,key+'/'+field);
  }
 }
});

test('mobile menu quality/FPS inputs are wired to rendering, not only labels',()=>{
 const planet=read('./planet.js'),zone=read('./start-zone.js'),meadow=read('./sphere-meadow.js');
 const html=read('./index.html');
 assert.match(planet,/graphicsSelect\?\.addEventListener\('change'/);
 assert.match(planet,/renderer\.setPixelRatio\(effectivePixelRatio/);
 assert.match(planet,/sun\.castShadow=enabled/);
 assert.match(planet,/renderer\.shadowMap\.enabled=enabled/);
 assert.match(planet,/startZone\.setGraphics/);
 assert.match(planet,/fpsFrames\/fpsSeconds/);
 assert.match(planet,/createFrameProfiler/);
 assert.match(planet,/selectFrameScene/);
 assert.match(planet,/frameProfiler\.record/);
 assert.match(planet,/frameProfiler\.report/);
 assert.match(html,/id="copyFpsReport"/);
 assert.match(html,/id="resetFpsReport"/);
 assert.match(html,/id="graphicsQuality"/);
 assert.match(html,/id="showFps"/);
 assert.match(zone,/function setGraphics\(preset/);
 assert.match(zone,/meadow\.applyDensity\(preset\)/);
 assert.match(zone,/reeds\.count=Math\.floor/);
 assert.match(meadow,/mode==='pebbles'/);
});
