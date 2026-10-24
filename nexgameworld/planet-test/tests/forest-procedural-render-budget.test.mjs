import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createForestLayout,forestColliders,createWhisperingForest,
 proceduralForestTrunkSurface,FOREST_TRUNK_BASE_SCALE,blocksForestAtLocal,
 forestLocalPoint} from '../whispering-forest.js';
import {deciduousCrownData,coniferCrownData,
 FOREST_CROWN_GEOMETRY_BUDGET} from '../forest-crown-geometry.js';

test('new procedural trunk is expressive while remaining inside old server footprint',()=>{
 const radial=[],shade=[],moss=[];
 for(const y of [-.5,-.38,-.25,0,.25,.5]){
  for(let k=0;k<60;k++){
   const g=proceduralForestTrunkSurface(y,k*Math.PI*2/60);
   assert.ok(g.radial>=.73&&g.radial<=.998);
   assert.ok(g.shade>=.38&&g.shade<=.99);
   assert.ok(g.moss>=0&&g.moss<=1);
   radial.push(g.radial);shade.push(g.shade);moss.push(g.moss);
  }
 }
 assert.ok(Math.max(...radial)-Math.min(...radial)>.07,'old flat strips must become organic');
 assert.ok(Math.max(...shade)-Math.min(...shade)>.15,'visible bark must have depth');
 assert.ok(Math.max(...moss)-Math.min(...moss)>.25,'ground moss growth fades upward');
 assert.throws(()=>proceduralForestTrunkSurface(NaN,0),RangeError);
});
test('zero extra tree draw batches and unchanged indexed geometry count',()=>{
 const before=forestColliders(),layout=createForestLayout();
 const scene=new THREE.Scene();
 const forest=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0});
 const batches=scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 assert.equal(batches.length,12,'do not add even one per-tree draw batch');
 assert.equal(forest.treeCount,400);
 assert.equal(forest.pilotTreeCount,0);
 assert.equal(scene.children.filter(x=>x.userData.forestPilot).length,0);
 const trunks=scene.children.find(x=>x.name==='forest-ancient-trunks');
 const baseline=new THREE.CylinderGeometry(.52,FOREST_TRUNK_BASE_SCALE,1,20,18);
 assert.equal(trunks.geometry.attributes.position.count,baseline.attributes.position.count);
 assert.equal(trunks.geometry.index.count,baseline.index.count);
 const position=trunks.geometry.attributes.position,normal=trunks.geometry.attributes.normal;
 for(let i=0;i<position.count;i++){
  assert.ok(Number.isFinite(position.getX(i)+position.getY(i)+position.getZ(i)));
  assert.ok(Number.isFinite(normal.getX(i)+normal.getY(i)+normal.getZ(i)));
 }
 for(let j=0;j<400;j++){
  const tree=layout.trees[j],p=forestLocalPoint(tree.lon,tree.lat);
  assert.equal(blocksForestAtLocal(p.x,p.z),true);
 }
 assert.deepEqual(forestColliders(),before);
 baseline.dispose();
});
test('canopy silhouettes improve but no new foliage triangles or materials',()=>{
 const decid=deciduousCrownData(),pine=coniferCrownData();
 assert.equal(decid.positions.length/3,
  (FOREST_CROWN_GEOMETRY_BUDGET.deciduousSegments+1)*
  (FOREST_CROWN_GEOMETRY_BUDGET.deciduousRings+1));
 assert.equal(pine.positions.length/9,
  FOREST_CROWN_GEOMETRY_BUDGET.coniferWhorls*
  FOREST_CROWN_GEOMETRY_BUDGET.coniferBranches*2);
 assert.equal(pine.indices.length,0);
 assert.ok(decid.positions.every(Number.isFinite));
 assert.ok(pine.positions.every(Number.isFinite));
});
test('live forest imports no expensive gallery GLB/procedural master library',()=>{
 const forest=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.doesNotMatch(forest,/whispering-forest-tree-pilot|createAncientPine|createForestLibraryTree/);
 assert.doesNotMatch(planet,/forest-tree-render-optimization|createAncientPine/);
 assert.match(forest,/new THREE\.InstancedMesh/);
});
