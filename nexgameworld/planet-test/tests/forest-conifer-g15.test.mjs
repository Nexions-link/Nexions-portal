import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {buildG15ConiferData,G15_CONIFER_BUDGET} from '../forest-conifer-g15.js';
import {coniferCrownData,crownDataBounds,crownLowestHeightFraction,
 FOREST_CROWN_GEOMETRY_BUDGET} from '../forest-crown-geometry.js';
import {createWhisperingForest,createForestLayout,forestColliders,
 forestTrailLatitude,FOREST_TREE_CAP} from '../whispering-forest.js';
const p=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('G-15: seven graduated whorls with 3 independently drooping sprays per bough',()=>{
 const a=buildG15ConiferData(),b=buildG15ConiferData(),c=buildG15ConiferData(1);
 assert.deepEqual(a,b,'procedural tree is deterministic');
 assert.notDeepEqual(a.positions,c.positions,'upper pine / lower fir geometry differs');
 assert.deepEqual(G15_CONIFER_BUDGET,{whorls:7,branches:11,sprays:3});
 assert.equal(FOREST_CROWN_GEOMETRY_BUDGET.coniferWhorls,7);
 assert.equal(FOREST_CROWN_GEOMETRY_BUDGET.coniferBranches,11);
 assert.equal(FOREST_CROWN_GEOMETRY_BUDGET.coniferNeedleSprays,3);
 assert.equal(a.positions.length/9,7*11*3*2);
 assert.equal(a.colors.length,a.positions.length);
 assert.equal(a.indices.length,0);
 assert.ok(a.positions.every(Number.isFinite));
 assert.ok(a.colors.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
 assert.ok(a.positions.length/9<500,'mobile-safe opaque low-polygon geometry');
 assert.deepEqual(coniferCrownData(),a,'live forest crown uses G-15 asset');
 assert.throws(()=>buildG15ConiferData(Infinity),RangeError);
});

test('G-15 drooping needle points and staggered lengths make non-conical 3D silhouettes',()=>{
 const d=coniferCrownData();
 const bounds=crownDataBounds(d);
 assert.ok(bounds.radialMax>1.03&&bounds.radialMax<1.13);
 assert.ok(bounds.minY<-.5&&bounds.minY>-.6);
 assert.ok(bounds.maxY<.5);
 const radial=[],tips=[],roots=[];
 const positions=d.positions;
 // Each bough segment contributes two consecutive triangles:
 // triangle 1 root, left, tip; triangle 2 root, tip, right.
 for(let i=0;i<positions.length;i+=18){
  const rootY=positions[i+1],tipY=positions[i+7];
  roots.push(rootY);tips.push(tipY);
  assert.ok(tipY<rootY-.08,'needles hang below each branch collar');
  radial.push(Math.hypot(positions[i+6],positions[i+8]));
 }
 assert.ok(Math.max(...radial)-Math.min(...radial)>.8,
  'upper and lower crowns must have visibly different lengths');
 assert.ok(crownLowestHeightFraction('conifer')>.4,
  'needles must stay above the hero in the original forest');
 const branches=new Set();
 for(let i=0;i<positions.length;i+=18){
  const x=positions[i+6],z=positions[i+8];
  branches.add(Math.floor((Math.atan2(z,x)+Math.PI)*10));
 }
 assert.ok(branches.size>=15,'silhouette reads as radial branches from all viewpoints');
 const colors=d.colors, green=new Set();
 let dark=0,bright=0;
 for(let i=1;i<colors.length;i+=3){
  green.add(colors[i].toFixed(2));
  if(colors[i]<.52)dark++;
  if(colors[i]>.78)bright++;
 }
 assert.ok(green.size>25&&dark>100&&bright>100,
  'deep shaded foliage pockets and sunlit needle rims are both present');
});

test('G-15 existing 400 forest trees retain exactly 2 pine batches and fixed colliders',()=>{
 const before=forestColliders(),layout=createForestLayout();
 const scene=new THREE.Scene();
 const model=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0});
 assert.equal(model.treeCount,FOREST_TREE_CAP);
 const batches=scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 assert.equal(batches.length,12,'no extra draw batches or alpha sprites');
 const evergreen=layout.trees.filter(t=>t.evergreen).length;
 const bottom=scene.getObjectByName('forest-pine-lower');
 const upper=scene.getObjectByName('forest-pine-crown');
 assert.ok(bottom?.isInstancedMesh&&upper?.isInstancedMesh);
 assert.equal(bottom.count,evergreen);
 assert.equal(upper.count,evergreen);
 assert.equal(bottom.material,upper.material,'one opaque foliage material');
 assert.equal(bottom.material.transparent,false);
 assert.equal(bottom.geometry.getAttribute('position').count,7*11*3*2*3);
 assert.equal(upper.geometry.getAttribute('position').count,7*11*3*2*3);
 assert.notDeepEqual(Array.from(bottom.geometry.attributes.position.array).slice(0,20),
  Array.from(upper.geometry.attributes.position.array).slice(0,20));
 for(const preset of ['economy','balanced','high']){
  model.setQuality(preset);
  assert.equal(bottom.count,evergreen);
  assert.equal(upper.count,evergreen);
 }
 for(const t of layout.trees)
  assert.ok(Math.abs(t.lat-forestTrailLatitude(t.lon))*261>=7.2+t.radius,
   'original walking corridor remains clear');
 assert.deepEqual(forestColliders(),before,'server geometry and physics unchanged');
});

test('G-15 self-hosted PC modules, camera, starter lawn and VPS remain untouched',()=>{
 const planet=p('../planet.js'),forest=p('../whispering-forest.js'),
  index=p('../index.html'),conifer=p('../forest-conifer-g15.js'),
  meadow=p('../sphere-meadow.js'),server=p('../../server/index.js');
 assert.match(planet,/from '\.\/whispering-forest\.js\?v=27'/);
 assert.match(forest,/from '\.\/forest-crown-geometry\.js\?v=4'/);
 assert.match(index,/import\('\.\/planet\.js\?v=253'\)/);
 assert.match(index,/"three":"\.\/vendor\/three\.module\.js\?v=160"/);
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(meadow,/count:10500,attempts:56000/);
 assert.match(server,/BUILD='0\.6\.45\.46'/);
 assert.doesNotMatch(conifer,/WebSocket|camera\.|fetch\(|localStorage|createCollider|ShaderMaterial|onBeforeCompile|document\./);
});
