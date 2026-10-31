import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {FOREST_BARK_G12_VERSION,FOREST_BARK_TEXTURE_SIZE,forestBarkPixel,
 buildForestBarkPixels,forestBarkSpeciesTint,forestBarkQuality,
 forestBarkUseRoughness,createForestBarkTextures} from '../forest-bark-texture.js';
import {createWhisperingForest,createForestLayout,forestColliders,
 FOREST_TRUNK_BASE_SCALE} from '../whispering-forest.js';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('G-12 texture is deterministic, opaque, has real fissures, moss and woody highlights',()=>{
 assert.equal(FOREST_BARK_G12_VERSION,'R1-G12-1');
 assert.deepEqual(FOREST_BARK_TEXTURE_SIZE,{width:256,height:512});
 const a=buildForestBarkPixels(64,128),b=buildForestBarkPixels(64,128);
 assert.deepEqual(a,b);
 const lows=new Set(),heights=new Set(),rough=new Set();
 let cracks=0,moss=0,warm=0;
 for(let y=0;y<128;y++)for(let x=0;x<64;x++){
  const i=(y*64+x)*4,p=forestBarkPixel((x+.5)/64,(y+.5)/128);
  assert.equal(a.color[i+3],255);
  assert.equal(a.bump[i+3],255);
  assert.equal(a.roughness[i+3],255);
  assert.equal(a.roughness[i+1],p.roughness,'Three.js roughness green channel');
  lows.add(p.color[0]);heights.add(p.relief);rough.add(p.roughness);
  if(p.fissure>.6)cracks++;
  if(p.moss>.04)moss++;
  if(p.color[0]>160)warm++;
 }
 assert.ok(lows.size>100&&heights.size>90&&rough.size>45,
  'Rich color, carved relief, and varying roughness');
 assert.ok(cracks>200&&moss>300&&warm>1800,'Fissures, moss, lit wood all present');
});

test('G-12 bark UVs wrap in both directions without stitching or visible seams',()=>{
 for(const [u,v] of [[.05,.33],[.93,.81],[.41,.71]]){
  assert.deepEqual(forestBarkPixel(u,v),forestBarkPixel(u+1,v-1));
 }
 for(const a of [0,.16,.31,.70,.97]){
  const l=forestBarkPixel(.00001,a),r=forestBarkPixel(.99999,a);
  assert.ok(Math.abs(l.color[0]-r.color[0])<8);
  assert.ok(Math.abs(l.relief-r.relief)<8);
 }
 assert.throws(()=>forestBarkPixel(Infinity,.4),RangeError);
});

test('G-12 maintains distinguishable deciduous, conifer and deadwood palettes',()=>{
 const broad=forestBarkSpeciesTint({evergreen:false,tint:.8});
 const pine=forestBarkSpeciesTint({evergreen:true,tint:.8});
 const limb=forestBarkSpeciesTint({evergreen:false,tint:.8},'branch');
 const fallen=forestBarkSpeciesTint({tint:.8},'fallen');
 assert.equal(new Set([broad,pine,limb,fallen]).size,4);
 for(const col of [broad,pine,limb,fallen])assert.match(col,/^#[0-9a-f]{6}$/);
 assert.notEqual(forestBarkSpeciesTint({evergreen:false,tint:.2}),
  forestBarkSpeciesTint({evergreen:false,tint:.8}));
 assert.throws(()=>forestBarkSpeciesTint({},'wrong'),RangeError);
});

test('G-12 PBR map uses correct color spaces and mobile-friendly quality gates',()=>{
 const x=createForestBarkTextures(THREE);
 assert.ok(x.map&&x.bumpMap&&x.roughnessMap);
 assert.equal(x.map.colorSpace,THREE.SRGBColorSpace);
 assert.equal(x.roughnessMap.colorSpace,THREE.NoColorSpace);
 assert.equal(x.bumpMap.colorSpace,THREE.NoColorSpace);
 assert.equal(x.map.repeat.x,2);assert.equal(x.map.repeat.y,4);
 assert.ok(x.map.generateMipmaps);
 assert.deepEqual(forestBarkQuality('economy'),{bump:false,bumpScale:0});
 assert.equal(forestBarkQuality('high',true).bump,false);
 assert.equal(forestBarkUseRoughness('economy'),false);
 assert.equal(forestBarkUseRoughness('high',true),false);
 assert.equal(forestBarkUseRoughness('balanced'),false);
 assert.equal(forestBarkUseRoughness('high'),true);
 assert.ok(forestBarkQuality('high').bumpScale>forestBarkQuality('balanced').bumpScale);
 for(const m of Object.values(x))m.dispose();
});

test('G-12 bark is shared by trunks, high boughs and fallen timber without extra batches',()=>{
 const before=forestColliders();
 const scene=new THREE.Scene();
 const art=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0});
 assert.equal(art.treeCount,400);
 assert.equal(createForestLayout().trees.length,400);
 const meshes=scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 assert.equal(meshes.length,12,'No new draw calls from G-12');
 const tr=scene.children.find(x=>x.name==='forest-ancient-trunks');
 const branch=scene.children.find(x=>x.name==='forest-high-boughs');
 const fallen=scene.children.find(x=>x.name==='forest-fallen-timber');
 assert.ok(tr&&branch&&fallen);
 assert.equal(tr.material.map,branch.material.map);
 assert.equal(tr.material.map,fallen.material.map);
 assert.equal(tr.geometry.userData.g11Trunk,true);
 assert.equal(fallen.instanceMatrix.count,34,'full original timber layout is retained');
 const palette=Array.from({length:12},(_,i)=>{
  const c=new THREE.Color();tr.getColorAt(i,c);return c.getHexString();
 });
 assert.ok(new Set(palette).size>=2,'species identity is preserved per tree');
 art.setQuality('economy');
 assert.equal(tr.material.bumpMap,null);
 assert.equal(tr.material.roughnessMap,null);
 art.setQuality('balanced');
 assert.ok(tr.material.bumpMap);
 assert.equal(tr.material.roughnessMap,null);
 art.setQuality('high');
 assert.ok(tr.material.bumpMap&&tr.material.roughnessMap);
 assert.equal(tr.material.roughnessMap,branch.material.roughnessMap);
 art.setQuality('high',true);
 assert.equal(tr.material.bumpMap,null);
 assert.equal(tr.material.roughnessMap,null);
 assert.deepEqual(forestColliders(),before);
 assert.equal(FOREST_TRUNK_BASE_SCALE,.78);
});

test('G-12 modifies no camera, multiplayer, movement, collision or tree placement sources',()=>{
 const forest=src('../whispering-forest.js'),planet=src('../planet.js'),
  bark=src('../forest-bark-texture.js');
 assert.match(forest,/forestBarkSpeciesTint\(p,'trunk'\)/);
 assert.match(forest,/forestBarkSpeciesTint\(p,'branch'\)/);
 assert.match(forest,/forestBarkSpeciesTint\(p,'fallen'\)/);
 assert.match(forest,/roughnessMap/);
 assert.match(forest,/new THREE\.InstancedMesh/);
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(planet,/from '\.\/whispering-forest\.js\?v=24'/);
 assert.doesNotMatch(bark,/WebSocket|camera\.|localStorage|fetch\(|createCollider|ShaderMaterial|onBeforeCompile/);
});