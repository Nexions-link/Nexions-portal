import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {G13_ROOT_VERSION,G13_ROOT_BOUND,G13_ROOT_COUNT,G13_ROOT_STATIONS,
 g13RootGeometryData,g13RootMossLitterData,g13RootContactShadowData,
 createG13RootGeometry,createG13MossLitterGeometry,
 createG13ContactShadowGeometry} from '../forest-roots-g13.js';
import {createWhisperingForest,createForestLayout,forestColliders,
 FOREST_TRUNK_BASE_SCALE,forestLocalPoint,blocksForestAtLocal,
 forestTrailLatitude,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance}
 from '../whispering-forest.js';
import {canWalkCamp} from '../sphere-physics.js';
import {walkableSphereNormal} from '../../server/world-movement.js';
import {localToNormal} from '../../server/spherical-pve.js';

const R=261;
const maxRadius=data=>{
 let radius=0;
 for(let i=0;i<data.positions.length;i+=3)
  radius=Math.max(radius,Math.hypot(data.positions[i],data.positions[i+2]));
 return radius;
};
test('G-13 roots really grow from the G-11 trunk and disappear into soil',()=>{
 assert.equal(G13_ROOT_VERSION,'R1-G13-1');
 assert.equal(G13_ROOT_COUNT,5);
 assert.equal(G13_ROOT_BOUND,FOREST_TRUNK_BASE_SCALE);
 assert.equal(G13_ROOT_STATIONS.length,6);
 const data=g13RootGeometryData();
 assert.equal(data.positions.length/3,G13_ROOT_COUNT*(G13_ROOT_STATIONS.length-1)*6*6);
 assert.ok(maxRadius(data)<=G13_ROOT_BOUND);
 assert.ok(maxRadius(data)>.75,'radial root tips approach old physical footprint');
 assert.ok(data.positions.some((v,i)=>i%3===1&&v<-.04),
  'tips sink below the visual soil to eliminate floating ends');
 assert.ok(data.positions.some((v,i)=>i%3===1&&v>.85),
  'upper shoulders intersect the standing trunk');
 assert.equal(data.positions.length,data.colors.length);
 assert.equal(data.positions.length/3*2,data.uv.length);
 assert.ok(data.positions.every(Number.isFinite));
 assert.ok(data.colors.every(v=>v>=0&&v<=1&&Number.isFinite(v)));
 const second=g13RootGeometryData();
 assert.deepEqual(data,second,'identical deterministic geometry each generation');
});

test('G-13 moss, leaf litter and contact shading are thin and fit within old tree collider',()=>{
 const moss=g13RootMossLitterData(),shade=g13RootContactShadowData();
 assert.ok(moss.positions.length/3>=75);
 assert.equal(shade.positions.length/3,24*3);
 for(const data of [moss,shade]){
  assert.ok(maxRadius(data)<=G13_ROOT_BOUND,
   'no added decoration can become a new blocking boundary');
  assert.ok(data.positions.every(Number.isFinite));
  assert.equal(data.positions.length,data.colors.length);
 }
 assert.ok(moss.positions.some((v,i)=>i%3===1&&v>.08));
 assert.ok(shade.positions.filter((_,i)=>i%3===1).every(v=>v===0));
});

test('G-13 geometry uses one shared instanced mesh per kind with valid THREE buffers',()=>{
 for(const [kind,build] of [['roots',createG13RootGeometry],
  ['moss',createG13MossLitterGeometry],['shade',createG13ContactShadowGeometry]]){
  const geo=build(THREE);
  const positions=geo.getAttribute('position');
  assert.equal(positions.count,geo.getAttribute('normal').count);
  assert.equal(positions.count,geo.getAttribute('uv').count);
  assert.equal(positions.count,geo.getAttribute('color').count);
  assert.equal(geo.userData.g13Bound,G13_ROOT_BOUND);
  assert.equal(geo.userData.g13Decorative,true);
  assert.ok(geo.name.includes('G13'));
  assert.ok(geo.boundingSphere.radius>0);
  geo.dispose();
 }
});

test('G-13 scene shows real roots, forest-floor mats and contact shade without gameplay colliders',()=>{
 const colliders=forestColliders();
 const scene=new THREE.Scene();
 const layout=createForestLayout();
 const forest=createWhisperingForest(THREE,{scene,radius:R,heightAt:()=>0});
 assert.equal(forest.treeCount,400);
 assert.equal(layout.trees.length,400);
 const forestBatches=scene.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('forest-'));
 assert.equal(forestBatches.length,12,'same original forest instanced batches');
 const roots=scene.getObjectByName('forest-buttress-roots');
 const moss=scene.getObjectByName('g13-root-moss-litter');
 const shade=scene.getObjectByName('g13-root-contact-shade');
 assert.ok(roots?.isInstancedMesh&&moss?.isInstancedMesh&&shade?.isInstancedMesh);
 assert.equal(roots.count,400);
 assert.equal(roots.geometry.userData.g13Decorative,true);
 assert.equal(moss.material.vertexColors,true);
 assert.equal(shade.material.transparent,true);
 assert.equal(shade.material.depthWrite,false);
 assert.ok(shade.material.opacity>0&&shade.material.opacity<.3);
 assert.equal(roots.material,scene.getObjectByName('forest-ancient-trunks').material);
 assert.equal(moss.instanceMatrix.count,400);
 assert.equal(shade.instanceMatrix.count,400);
 for(const mesh of [roots,moss,shade]){
  assert.ok(mesh.geometry.getAttribute('position').count>40);
  assert.equal(mesh.raycast?.toString().includes('()=>{}'),true,
   'tap/target raycasts should ignore decorative roots');
 }
 // Root crown and its contact geometry inherit the exact geodetic normal
 // and anchor position from the original tree; there is no xy-map offset.
 const tree=layout.trees[0],normal=new THREE.Vector3(
  Math.cos(tree.lat)*Math.sin(tree.lon),Math.sin(tree.lat),
  Math.cos(tree.lat)*Math.cos(tree.lon));
 for(const [mesh,offset] of [[roots,.01],[moss,.002],[shade,.052]]){
  const m=new THREE.Matrix4();mesh.getMatrixAt(0,m);
  const pos=new THREE.Vector3().setFromMatrixPosition(m);
  assert.ok(Math.abs(pos.length()-(R+offset))<.00002,mesh.name);
  assert.ok(pos.clone().normalize().distanceTo(normal)<.00002);
 }
 forest.setQuality('high');
 assert.equal(roots.count,400);
 assert.equal(moss.count,400);assert.equal(shade.count,400);
 forest.setQuality('balanced');
 assert.equal(roots.count,400);
 assert.equal(moss.count,240);assert.equal(shade.count,240);
 forest.setQuality('economy');
 assert.equal(roots.count,400);
 assert.equal(moss.count,112);assert.equal(shade.count,112);
 assert.equal(roots.castShadow,false);
 assert.deepEqual(forestColliders(),colliders);
});

test('G-13 preserved passable forest trail, surveyed camp, quests and online-collider map',()=>{
 const original=forestColliders(),layout=createForestLayout();
 // Original forest server collider shape and positions must match the client.
 assert.equal(original.length,400+5); // visible camp props plus trees
 for(const tree of layout.trees){
  const p=forestLocalPoint(tree.lon,tree.lat,R);
  assert.ok(blocksForestAtLocal(p.x,p.z));
 }
 for(let lon=.145;lon<=1.46;lon+=.012){
  const p=forestLocalPoint(lon,forestTrailLatitude(lon),R);
  assert.equal(canWalkCamp(p.x,p.z,.42,R),true,'client trail blocked at '+lon);
  assert.equal(walkableSphereNormal(localToNormal(p.x,p.z,R),R),true,
   'online movement blocked at '+lon);
 }
 for(const site of [FOREST_CAMP,...FOREST_SITE_CLEARINGS]){
  assert.ok(layout.trees.every(t=>forestDistance(t.lon,t.lat,site.lon,site.lat)>
   t.radius+(site.radius||0)-1e-8));
 }
 assert.deepEqual(forestColliders(),original);
});

test('G-13 does not alter original camera, networking, server or published geometry contracts',()=>{
 const forest=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const roots=readFileSync(new URL('../forest-roots-g13.js',import.meta.url),'utf8');
 assert.match(forest,/import \{createG13RootGeometry/);
 assert.match(forest,/g13-root-contact-shade/);
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(planet,/from '\.\/whispering-forest\.js\?v=\d+'/);
 assert.doesNotMatch(roots,/fetch\(|localStorage|WebSocket|createCollider|ShaderMaterial|camera\./);
});
