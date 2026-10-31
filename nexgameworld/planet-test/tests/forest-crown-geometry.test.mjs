import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_CROWN_GEOMETRY_BUDGET,deciduousCrownData,
 coniferCrownData,crownDataBounds,crownLowestHeightFraction} from '../forest-crown-geometry.js';
import {createForestLayout,forestColliders,blocksForestAtLocal,forestTrailLatitude}
 from '../whispering-forest.js';
test('leaves have a non-spherical lobe outline and compact shared geometry',()=>{
 const a=deciduousCrownData(),b=deciduousCrownData(),upper=deciduousCrownData(1);
 assert.deepEqual(a,b);
 assert.notDeepEqual(a.positions,upper.positions);
 assert.equal(a.positions.length/3,
  (FOREST_CROWN_GEOMETRY_BUDGET.deciduousSegments+1)*
  (FOREST_CROWN_GEOMETRY_BUDGET.deciduousRings+1)+
  4*FOREST_CROWN_GEOMETRY_BUDGET.deciduousLeafClusters);
 assert.ok(a.positions.length/3<350,'low-polygon shared canopy');
 assert.equal(a.positions.length,a.colors.length);
 assert.ok(a.indices.length>0&&a.indices.every(i=>i<a.positions.length/3));
 const row=4,radial=[];
 for(let j=0;j<FOREST_CROWN_GEOMETRY_BUDGET.deciduousSegments;j++){
  const off=3*(row*(FOREST_CROWN_GEOMETRY_BUDGET.deciduousSegments+1)+j);
  radial.push(Math.hypot(a.positions[off],a.positions[off+2]));
 }
 assert.ok(Math.max(...radial)-Math.min(...radial)>.09);
 assert.ok(crownDataBounds(a).radialMax<1.3);
});
test('pine tree crowns have separated layered drooping branches',()=>{
 const pine=coniferCrownData(),top=coniferCrownData(1);
 assert.notDeepEqual(pine.positions,top.positions);
 assert.equal(pine.positions.length,pine.colors.length);
 assert.equal(pine.indices.length,0);
 assert.equal(pine.positions.length/9,
  FOREST_CROWN_GEOMETRY_BUDGET.coniferWhorls*
  FOREST_CROWN_GEOMETRY_BUDGET.coniferBranches*2);
 assert.ok(crownDataBounds(pine).radialMax<=1.13);
 assert.ok(crownDataBounds(pine).minY<-.48);
 assert.ok(crownDataBounds(pine).maxY<.5);
});
test('canopy geometry never moves original blocking trees or touches character height',()=>{
 const trees=createForestLayout(),collisions=forestColliders();
 assert.ok(crownLowestHeightFraction('conifer')>.40);
 assert.ok(crownLowestHeightFraction('deciduous')>.60);
 assert.equal(trees.trees.length,400);
 for(const tree of trees.trees){
  const blocked={x:tree.lon,z:tree.lat};
  assert.ok(tree.height>14);
  assert.ok(Math.abs(tree.lat-forestTrailLatitude(tree.lon))*261>=7.2+tree.radius);
 }
 assert.deepEqual(forestColliders(),collisions);
});
