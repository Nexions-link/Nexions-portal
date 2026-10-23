import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOREST_WOLF_REQUIRED_CLIPS} from '../forest-wolf-glb.js';
function loadGlb(relative){
 const data=readFileSync(new URL(relative,import.meta.url));
 assert.equal(data.toString('ascii',0,4),'glTF');
 assert.equal(data.readUInt32LE(4),2);
 assert.equal(data.readUInt32LE(8),data.length);
 const jsonSize=data.readUInt32LE(12);
 assert.equal(data.toString('ascii',16,20),'JSON');
 const json=JSON.parse(data.toString('utf8',20,20+jsonSize).trim());
 const binIndex=20+jsonSize;
 assert.equal(data.toString('ascii',binIndex+4,binIndex+8),'BIN\0');
 assert.equal(data.readUInt32LE(binIndex),json.buffers[0].byteLength);
 const bytes=data.length-(binIndex+8);
 assert.equal(bytes,json.buffers[0].byteLength);
 for(const v of json.bufferViews){
  assert.ok(v.byteOffset>=0);
  assert.ok(v.byteOffset+v.byteLength<=bytes);
  assert.equal(v.byteOffset%4,0);
 }
 for(const a of json.accessors){
  assert.ok(a.bufferView>=0&&a.bufferView<json.bufferViews.length);
  assert.ok(a.count>0);
 }
 return {json,size:data.length};
}
test('Wolf GLB near and far files really exist, parse and have valid binary layout',()=>{
 const near=loadGlb('../../bestiary/models/forest-wolf-v1.glb');
 const far=loadGlb('../../bestiary/models/forest-wolf-far-v1.glb');
 assert.ok(near.size>far.size*2);
 assert.ok(near.json.nodes.some(n=>n.name==='Head'));
 assert.ok(near.json.nodes.some(n=>n.name==='FL_Upper'));
 assert.deepEqual(near.json.animations.map(a=>a.name),
  [...FOREST_WOLF_REQUIRED_CLIPS]);
 assert.ok(far.json.meshes.length>0);
 assert.ok(far.json.nodes.length>=15);
 for(const clip of near.json.animations){
  assert.ok(clip.channels.length>=4);
  for(const channel of clip.channels)
   assert.ok(channel.target.node>=0&&channel.target.node<near.json.nodes.length);
 }
});
test('Atlas C005 and game near/far LOD resolve to actual public files',()=>{
 const catalog=readFileSync(new URL('../../bestiary/atlas-catalog.js',import.meta.url),'utf8');
 assert.match(catalog,/asset:'\.\/models\/forest-wolf-v1\.glb'/);
 const glb=readFileSync(new URL('../forest-wolf-glb.js',import.meta.url),'utf8');
 assert.match(glb,/forest-wolf-far-v1\.glb/);
});
