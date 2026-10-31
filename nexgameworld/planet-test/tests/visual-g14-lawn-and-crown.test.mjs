import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createSphericalMeadow,meadowGrassBladeData} from '../sphere-meadow.js';
import {deciduousCrownData,FOREST_CROWN_GEOMETRY_BUDGET} from '../forest-crown-geometry.js';
import {startVisualRouteSegments,lakeRadius,pathWear} from '../start-zone.js';
import {createForestLayout,forestColliders} from '../whispering-forest.js';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const normal=(x,z,R)=>{
 const d=Math.hypot(x,z),t=d/R,k=d?Math.sin(t)/d:0;
 return new THREE.Vector3(x*k,z*k,Math.cos(t));
};
test('G-14 leaf clusters break the smooth oak silhouette without extra mesh batches',()=>{
 const data=deciduousCrownData(),other=deciduousCrownData(1);
 const n=(FOREST_CROWN_GEOMETRY_BUDGET.deciduousSegments+1)*
  (FOREST_CROWN_GEOMETRY_BUDGET.deciduousRings+1);
 assert.equal(data.positions.length/3,n+4*FOREST_CROWN_GEOMETRY_BUDGET.deciduousLeafClusters);
 assert.notDeepEqual(data.positions,other.positions);
 assert.ok(data.indices.length>1000);
 const reds=data.colors.filter((_,i)=>i%3===0);
 assert.ok(Math.min(...reds)<.24 && Math.max(...reds)>.6,
  'dark leaf pockets and illuminated edges both exist');
 assert.deepEqual(deciduousCrownData(),data,'geometry is deterministic');
 assert.equal(createForestLayout().trees.length,400);
});
test('G-14 starter meadow is a dense short lawn with only occasional small shrubs',()=>{
 const scene=new THREE.Scene();
 const allowed=(x,z)=>Math.hypot(x,z)<69&&lakeRadius(x,z)>1.18&&
  pathWear(x,z)<.18&&(Math.abs(x+27)>12.8||Math.abs(z+2)>12.5);
 const meadow=createSphericalMeadow(THREE,{scene,getRadius:()=>261,
  toNormal:normal,heightAt:()=>0,accept:allowed});
 assert.ok(meadow.counts.grass>=9000,'starter meadow lawn dominates');
 assert.equal(meadow.counts.shrubs,160,'small shrubs remain sparse');
 assert.ok(meadow.counts.grass/meadow.counts.shrubs>55);
 const grass=meadowGrassBladeData();
 assert.equal(grass.bladeCount,6);
 assert.equal(grass.positions.length/9,18,'six shaded curved grass blades in one tuft');
 assert.equal(scene.children.filter(x=>x.isInstancedMesh).length,6);
 const grassMesh=scene.children[0],shrubMesh=scene.children[4];
 assert.ok(grassMesh.isInstancedMesh&&shrubMesh.isInstancedMesh);
 assert.ok(grassMesh.count>9000);
 const matrix=new THREE.Matrix4(),scale=new THREE.Vector3(),
  position=new THREE.Vector3(),rotation=new THREE.Quaternion();
 for(let i=0;i<grassMesh.instanceMatrix.count;i++){
  grassMesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
  const n=position.clone().normalize(),d=Math.acos(Math.max(-1,Math.min(1,n.z)))*261;
  const xy=Math.hypot(n.x,n.y),x=xy>1e-7?n.x*d/xy:0,z=xy>1e-7?n.y*d/xy:0;
  assert.ok(allowed(x,z),'grass must never cover road, lake or house');
  assert.ok(scale.y<.64,'short lawn rather than large bushes');
 }
 meadow.applyDensity({grass:.38,flowers:.4,shrubs:.4,pebbles:.35});
 assert.equal(grassMesh.count,Math.floor(meadow.counts.grass*.38));
 meadow.applyDensity({grass:1,flowers:1,shrubs:1,pebbles:1});
 assert.equal(grassMesh.count,meadow.counts.grass);
 assert.equal(shrubMesh.count,160);
});
test('G-14 touches only decorative canopy and lawn, not cameras, multiplayer or colliders',()=>{
 const forest=source('../whispering-forest.js'),planet=source('../planet.js'),
  meadow=source('../sphere-meadow.js'),roots=source('../forest-roots-g13.js');
 const colliders=forestColliders();
 assert.match(forest,/forest-crown-geometry\.js\?v=3/);
 assert.match(planet,/sphere-physics/);
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(meadow,/count:10500/);
 assert.doesNotMatch(meadow,/WebSocket|fetch\(|localStorage|createCollider/);
 assert.doesNotMatch(roots,/createCollider/);
 assert.deepEqual(forestColliders(),colliders);
});
