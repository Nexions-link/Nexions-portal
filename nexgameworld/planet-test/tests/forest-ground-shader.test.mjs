import test from 'node:test';
import assert from 'node:assert/strict';
import {forestGroundMask,forestGroundWeights,forestTrailLat,installForestGroundShader}
 from '../forest-ground-shader.js';
test('base ground texture changes by soil and micro-climate, not uniform green',()=>{
 const samples=[];
 for(const lon of [.40,.66,.89,1.11,1.33]){
  for(const offset of [-.20,-.12,.08,.19]){
   const v=forestGroundWeights(lon,forestTrailLat(lon)+offset);
   samples.push(v);
   for(const k of ['mask','soil','moss','leaves','trail','moist'])
    assert.ok(Number.isFinite(v[k])&&v[k]>=0&&v[k]<=1,k);
  }
 }
 assert.ok(new Set(samples.map(x=>Math.round(x.soil*100))).size>=5);
 assert.ok(new Set(samples.map(x=>Math.round(x.moss*100))).size>=4);
 assert.ok(forestGroundMask(.7,.02)>.8);
 assert.equal(forestGroundMask(-1,.02),0);
 assert.equal(forestGroundMask(.7,1.2),0);
});
test('forest path is actual ground coloring and remains traversable',()=>{
 const lon=.84,lat=forestTrailLat(lon);
 assert.ok(forestGroundWeights(lon,lat).trail>.8);
 assert.ok(forestGroundWeights(lon,lat+.09).trail<.05);
});
test('StandardMaterial shader injects once with mobile quality uniform, never geometry',()=>{
 const mat={},api=installForestGroundShader(mat,{radius:261});
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',
  fragmentShader:'#include <common>\n#include <color_fragment>'};
 mat.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/vNgwTerrainDirection=normalize\(position\)/);
 assert.match(shader.fragmentShader,/ngwTerrainNoise/);
 assert.match(shader.fragmentShader,/diffuseColor.rgb=mix/);
 assert.equal(shader.uniforms.uNgwTerrainRadius.value,261);
 api.setQuality('economy');assert.equal(api.detail,.55);
 api.setQuality('high');assert.equal(api.detail,1.3);
 api.setRadius(350);assert.equal(shader.uniforms.uNgwTerrainRadius.value,350);
 assert.equal(mat.customProgramCacheKey(),'ngw-ground-surface-v1');
});
