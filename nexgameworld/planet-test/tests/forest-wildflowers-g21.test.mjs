import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestWildflowerLayout,forestWildflowerBudget,
 forestWildflowerGeometryData,FOREST_WILDFLOWER_PALETTE,
 createForestWildflowers,FOREST_WILDFLOWER_CAP}
 from '../forest-wildflowers.js';
import {forestGroundLifeLayout} from '../forest-ground-life.js';
import {forestColliders,createForestLayout,forestTrailLatitude,forestDistance,
 FOREST_CAMP,FOREST_SITE_CLEARINGS} from '../whispering-forest.js';

test('G-21 tiny original botanical petals, green stems and golden cores stay within a single 30-triangle mesh',()=>{
 const g=forestWildflowerGeometryData();
 assert.equal(g.heads,2);
 assert.equal(g.petals,10);
 assert.equal(g.triangles,30);
 assert.equal(g.positions.length,30*9);
 assert.equal(g.colors.length,g.positions.length);
 assert.ok(g.positions.every(Number.isFinite));
 assert.ok(g.colors.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
 const y=g.positions.filter((_,i)=>i%3===1);
 assert.ok(Math.min(...y)>=.04&&Math.max(...y)<.70,
  'wildflowers are small ground flowers rather than giant blooms');
 assert.ok(new Set(y.map(v=>v.toFixed(2))).size>=14,
  'petal tips, stalks, foliage and centres should occupy distinct 3D layers');
 assert.deepEqual(forestWildflowerGeometryData(),g);
 assert.equal(FOREST_WILDFLOWER_PALETTE.length,4);
 assert.ok(new Set(FOREST_WILDFLOWER_PALETTE).size===4);
});
test('G-21 four flower palettes are clustered on existing passable grass, never on quest or camp areas',()=>{
 const before=forestColliders(),treeLayout=createForestLayout();
 const grass=forestGroundLifeLayout().grass;
 const a=forestWildflowerLayout(grass),b=forestWildflowerLayout(grass);
 assert.deepEqual(a,b);
 assert.equal(a.length,FOREST_WILDFLOWER_CAP);
 const colors=new Set(a.map(p=>p.species));
 assert.deepEqual([...colors].sort(),[0,1,2,3]);
 const both=new Set();
 for(const p of a){
  assert.ok(p.species>=0&&p.species<=3&&Number.isInteger(p.species));
  assert.ok(p.scale>=.67&&p.scale<=1.20);
  assert.ok(p.brightness>=.77&&p.brightness<=1.1);
  assert.ok(p.shade>=0&&p.shade<=1);
  const dist=(p.lat-forestTrailLatitude(p.lon))*261;
  both.add(Math.sign(dist));
  assert.ok(Math.abs(dist)>=5.21);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>
    FOREST_CAMP.clearingRadius+2);
  assert.ok(FOREST_SITE_CLEARINGS.every(site=>
   forestDistance(p.lon,p.lat,site.lon,site.lat)>site.radius+2));
 }
 assert.deepEqual([...both].sort(),[-1,1]);
 assert.deepEqual(a.map(({lon,lat})=>({lon,lat})),
  a.map(({lon,lat})=>({lon,lat})));
 assert.ok(a.every(p=>grass.some(g=>g.lon===p.lon&&g.lat===p.lat)),
  'flowers must inherit original collision-safe positions');
 assert.deepEqual(forestColliders(),before);
 assert.deepEqual(createForestLayout(),treeLayout);
});
test('G-21 budget adds one controlled instanced call, leaves economy/mobile and portal preview safe',()=>{
 assert.equal(forestWildflowerBudget('economy'),100);
 assert.equal(forestWildflowerBudget('balanced'),420);
 assert.equal(forestWildflowerBudget('high'),640);
 assert.equal(forestWildflowerBudget('high',true),0);
 const scene=new THREE.Scene(),grass=forestGroundLifeLayout().grass;
 const flowers=createForestWildflowers(THREE,{scene,radius:261,heightAt:()=>0,grassLayout:grass});
 assert.equal(flowers.drawCalls,1);
 assert.equal(flowers.decorativeOnly,true);
 assert.equal(flowers.layout.length,640);
 assert.equal(scene.children.length,1);
 const mesh=flowers.mesh;
 assert.ok(mesh.isInstancedMesh);
 assert.equal(mesh.name,'forest-wildflowers-no-collision');
 assert.equal(mesh.geometry.getAttribute('position').count,90);
 assert.equal(mesh.geometry.getAttribute('color').count,90);
 assert.equal(mesh.material.transparent,false);
 assert.equal(mesh.material.vertexColors,true);
 assert.equal(mesh.castShadow,false);
 assert.equal(mesh.receiveShadow,false);
 assert.equal(mesh.count,420);
 const colors=new Set();
 for(const i of [0,1,9,24,43,119]){
  const c=new THREE.Color();mesh.getColorAt(i,c);
  assert.ok(Number.isFinite(c.r+c.g+c.b));
  colors.add(c.getHexString());
 }
 assert.ok(colors.size>=3);
 flowers.setQuality('high');assert.equal(mesh.count,640);
 flowers.setQuality('economy');assert.equal(mesh.count,100);
 flowers.setQuality('high',true);assert.equal(mesh.count,0);
 assert.equal(mesh.visible,false);
});
test('G-21 colors are active in real forest scene, gameplay and character input unchanged',()=>{
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const module=readFileSync(new URL('../forest-wildflowers.js',import.meta.url),'utf8');
 assert.match(planet,/createForestWildflowers\(THREE,\{scene,radius:R,heightAt,grassLayout:forestGroundLife\.layout\.grass\}\)/);
 assert.match(planet,/forestWildflowers\?\.setQuality\(qualityName,isPortalPreview\)/);
 assert.doesNotMatch(module,/new THREE\.ShaderMaterial|onBeforeCompile|addCollider|registerObstacle|WebSocket/);
});
