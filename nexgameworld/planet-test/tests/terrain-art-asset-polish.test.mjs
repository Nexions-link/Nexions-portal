import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {ART_LAB,artLabWorldPoint} from '../terrain-art-lab.js';
import {showcaseLayout,SHOWCASE_LANDMARKS,createStonewindShowcase}
 from '../terrain-art-showcase.js';
import {crownSurfaceSample,createDetailedCrownGeometry,
 createRidgedBarkSegment,mergeBarkParts,createDetailedRockGeometry,
 createCutWoodTextures} from '../terrain-art-asset-polish.js';

test('existing canopy clumps gain sculpted leaves and rough irregular edges',()=>{
 const old=new THREE.IcosahedronGeometry(1,1);
 const near=createDetailedCrownGeometry(THREE,{far:false});
 const far=createDetailedCrownGeometry(THREE,{far:true});
 assert.ok(near.getAttribute('position').count>old.getAttribute('position').count*3);
 assert.ok(near.getAttribute('position').count>far.getAttribute('position').count);
 for(const g of [near,far]){
  const p=g.getAttribute('position'),colors=g.getAttribute('color');
  assert.equal(p.count,colors.count);
  assert.ok(g.boundingSphere.radius>1.02);
  assert.ok(g.boundingSphere.radius<1.7);
  assert.ok(Array.from(p.array).every(Number.isFinite));
  assert.ok(Array.from(colors.array).every(Number.isFinite));
 }
 assert.ok(crownSurfaceSample(.5,.4,.7).radius>.7);
 near.dispose();far.dispose();old.dispose();
});

test('bark is sculpted, vertex coloured, and merged without adding draw calls',()=>{
 const a=createRidgedBarkSegment(THREE,1.2,.4,9);
 const b=createRidgedBarkSegment(THREE,.4,.06,3);
 assert.ok(a.getAttribute('position').count>150);
 assert.ok(a.getAttribute('color').count===a.getAttribute('position').count);
 const x=new THREE.Mesh(a),y=new THREE.Mesh(b);
 x.position.set(.2,1.8,.1);y.position.set(1,7,.4);
 const joined=mergeBarkParts(THREE,[x,y]);
 assert.equal(joined.getAttribute('position').count,
  (a.index?a.index.count:a.getAttribute('position').count)+
  (b.index?b.index.count:b.getAttribute('position').count));
 assert.equal(joined.getAttribute('color').count,joined.getAttribute('position').count);
 assert.ok(joined.boundingSphere.radius>4);
 assert.throws(()=>createRidgedBarkSegment(THREE,.2,.05,0),RangeError);
 a.dispose();b.dispose();joined.dispose();
});

test('granite and growth rings refine existing stones and timber',()=>{
 const rock=createDetailedRockGeometry(THREE,{large:true});
 const nearRock=createDetailedRockGeometry(THREE);
 assert.ok(rock.getAttribute('position').count>nearRock.getAttribute('position').count);
 assert.equal(rock.getAttribute('color').count,rock.getAttribute('position').count);
 assert.ok(Array.from(rock.getAttribute('position').array).every(Number.isFinite));
 const wood=createCutWoodTextures(THREE);
 assert.equal(wood.image.width,256);
 const img=wood.image.data;
 const sample=new Set(Array.from({length:24},(_,i)=>img[((i*7+38)*256+(i*3+34))*4]));
 assert.ok(sample.size>7,'annual growth rings must vary in tone');
 assert.ok(Array.from(img.slice(0,1000)).every(Number.isFinite));
 assert.throws(()=>createCutWoodTextures(THREE,{size:8}),RangeError);
 rock.dispose();nearRock.dispose();wood.dispose();
});

test('all original locations and instanced populations stay unchanged',()=>{
 const before=showcaseLayout(),count=Object.fromEntries(
 Object.entries(before).map(([k,v])=>[k,v.length]));
 const scene=new THREE.Scene(),art=createStonewindShowcase(THREE,{scene});
 assert.deepEqual(Object.fromEntries(
  Object.entries(art.layout).map(([k,v])=>[k,v.length])),count);
 assert.deepEqual(SHOWCASE_LANDMARKS.hero,{x:ART_LAB.treeSites[0][0],
  z:ART_LAB.treeSites[0][1]});
 assert.equal(scene.children.length,1);
 const oldBatches=art.root.children.filter(o=>o.isInstancedMesh);
 assert.equal(oldBatches.length,8);
 assert.ok(oldBatches.some(o=>o.name.includes('forest-crown')));
 const oldCount=oldBatches.reduce((a,m)=>a+m.instanceMatrix.count,0);
 art.setQuality('high');
 assert.equal(oldBatches.reduce((a,m)=>a+m.instanceMatrix.count,0),oldCount);
 assert.equal(art.root.children.length,13,
  'all existing prop groups remain, without additional scenic groups');
 art.setQuality('economy');
 art.setQuality('high');art.dispose();
 assert.equal(scene.children.length,0);
});

test('main game and scenery populations are untouched, only art lab assets changed',()=>{
 const view=readFileSync(new URL('../terrain-art-lab-view.js',import.meta.url),'utf8');
 const show=readFileSync(new URL('../terrain-art-showcase.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(view,/mergeBarkParts\(THREE,barkParts\)/);
 assert.match(view,/new THREE.InstancedMesh\(crownNear,leafMaterial,count\)/);
 assert.match(view,/const pebbleGeo=createWeatheredStoneGeometry/);
 assert.match(view,/for\(let index=0;index<ART_LAB.treeSites.length;index\+\+\)/);
 assert.match(show,/createCutWoodTextures/);
 assert.match(show,/createDetailedRockGeometry/);
 assert.doesNotMatch(game,/terrain-art-asset-polish|createDetailedCrownGeometry/);
 assert.ok(artLabWorldPoint(0,0).every(Number.isFinite));
});
