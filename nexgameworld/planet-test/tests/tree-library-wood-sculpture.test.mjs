import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rootGrowthFlare,branchGrowthCollar,cambiumRadiusModifier,
 sculptedWoodPathGeometry} from '../tree-library-wood-sculpture.js';
import {TREE_LIBRARY,forestTrunkRadius,createForestLibraryTree}
 from '../tree-library-forest-types.js';
import {createAncientPine,ancientPineTrunkRadius}
 from '../tree-library-ancient-pine.js';

test('buttresses genuinely grow into the trunk shell, fading with height',()=>{
 const a=.11*17;
 assert.ok(rootGrowthFlare(0,a,{count:9,seed:17,jitter:.20})>
  rootGrowthFlare(7,a,{count:9,seed:17,jitter:.20})*5);
 const attachments=[{level:12,direction:1.2,weight:1}];
 assert.ok(branchGrowthCollar(12,1.2,attachments)>.15);
 assert.ok(branchGrowthCollar(13.8,1.2,attachments)<.0001);
 assert.ok(branchGrowthCollar(12,2.8,attachments)<.0001);
 assert.ok(Math.abs(cambiumRadiusModifier(2,.5,17)-
  cambiumRadiusModifier(2,.8,17))>.001);
 for(const tree of TREE_LIBRARY.slice(1)){
  const a=forestTrunkRadius(tree.id,.025,.4,17);
  const b=forestTrunkRadius(tree.id,.13,.4,17);
  assert.ok(a>b*.80);
 }
 assert.ok(ancientPineTrunkRadius(0,.4,17)>ancientPineTrunkRadius(12,.4,17));
});

test('organic continuous wood sweep has finite normals, UV and non-circular radial outline',()=>{
 const points=[[0,0,0],[1,.24,.2],[2,1.3,1.1],[3,1.1,2.6]],
  radii=[.51,.38,.23,.025],sides=22;
 const mesh=sculptedWoodPathGeometry(THREE,points,radii,{sides,seed:41,subdivisions:12});
 assert.equal(mesh.userData.biologicalSculpture,true);
 assert.equal(mesh.userData.radialSides,sides);
 assert.ok(mesh.userData.pathSamples>12);
 assert.equal(mesh.getAttribute('position').count,(mesh.userData.pathSamples+1)*(sides+1));
 const position=mesh.getAttribute('position'),normal=mesh.getAttribute('normal'),
  uv=mesh.getAttribute('uv');
 assert.ok(position.count>600);assert.equal(position.count,normal.count);
 assert.equal(uv.count,position.count);
 for(let i=0;i<position.count;i++){
  for(const attr of [position,normal])
   for(let k=0;k<3;k++)assert.ok(Number.isFinite(attr.array[i*3+k]),'non-finite wood vertex');
  assert.ok(Number.isFinite(uv.getX(i))&&Number.isFinite(uv.getY(i)));
 }
 const ring=[];
 for(let j=0;j<sides;j++){
  const x=position.getX(j),z=position.getZ(j);
  ring.push(Math.hypot(x,z));
 }
 assert.ok(Math.max(...ring)-Math.min(...ring)>.035,'biological non-circular outline');
 assert.ok(mesh.boundingSphere.radius>2);
 const copy=sculptedWoodPathGeometry(THREE,points,radii,{sides,seed:41,subdivisions:12});
 assert.deepEqual([...copy.getAttribute('position').array], [...position.array]);
 const variant=sculptedWoodPathGeometry(THREE,points,radii,{sides,seed:142,subdivisions:12});
 assert.notDeepEqual([...variant.getAttribute('position').array], [...position.array]);
 for(const g of [mesh,copy,variant])g.dispose();
});

test('different sculpted branch and root morphology preserve realistic proportions',()=>{
 for(const kind of ['root','branch']){
  const mesh=sculptedWoodPathGeometry(THREE,[[0,.5,0],[.8,.7,0],[2.7,.05,1.2]],
   [.53,.34,.022],{seed:13,sides:16,kind});
  assert.equal(mesh.userData.kind,kind);
  assert.ok(mesh.getAttribute('position').count>100);
  mesh.dispose();
 }
 assert.throws(()=>sculptedWoodPathGeometry(THREE,[[0,0,0]],[.3]),RangeError);
 assert.throws(()=>sculptedWoodPathGeometry(THREE,[[0,0,0],[1,0,0]],[.3]),RangeError);
 assert.throws(()=>sculptedWoodPathGeometry(THREE,[[0,0,0],[1,0,0]],[-1,.5]),RangeError);
});

test('all five library entries now have real sculpture metadata, no collision changes',()=>{
 for(const descriptor of TREE_LIBRARY){
  const built=descriptor.id==='tree_pine_ancient'?
   createAncientPine(THREE,{seed:17,mapSize:64}):
   createForestLibraryTree(THREE,{id:descriptor.id,seed:17,mapSize:64});
  const stats=built.group.userData.geometryCounts;
  assert.equal(stats.sculptedWood,true);
  assert.ok(stats.rootButtresses>=8);
  assert.ok(stats.branchCollars>=20);
  assert.ok(built.group.children.some(mesh=>mesh.name.includes('merged root')||
   mesh.name.includes('unified visible root')));
  assert.ok(built.group.children.every(mesh=>mesh.userData.collider!==true));
  built.dispose();
 }
});
