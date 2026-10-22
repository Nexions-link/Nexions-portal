import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
test('globe ground remains opaque stock Three.js material; no custom shader hook',()=>{
 assert.match(planet,/groundMaterial=new THREE\.MeshStandardMaterial/);
 assert.match(planet,/transparent:false,depthWrite:true,side:THREE\.FrontSide/);
 assert.doesNotMatch(planet,/installForestGroundShader\(/);
 assert.doesNotMatch(planet,/groundShading\.setQuality/);
});
