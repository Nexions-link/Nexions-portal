import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LONGHOUSE,HOUSE_CHEST,toHouseCoordinates,fromHouseCoordinates,insideHouse,buildHearthHouse} from '../hearth-house.js';
import {canWalkCamp,isInLonghouse} from '../sphere-physics.js';
import {CHEST_X,CHEST_Z,CHEST_RANGE} from '../../server/chest.js';
import {OFFLINE_CHEST} from '../gather-world.js';
import {createChestMotion} from '../../bestiary/chest-preview-motion.js';
import {readFileSync} from 'node:fs';
const at=(x,z)=>fromHouseCoordinates(x,z);
function walk(x,z,bodyRadius){const p=at(x,z);return canWalkCamp(p.x,p.z,bodyRadius)}
test('shared chest is centered opposite the longhouse doorway, against its far wall',()=>{
 assert.equal(LONGHOUSE.chestLocalX,0);
 assert.equal(LONGHOUSE.chestLocalZ,-8.6);
 const local=toHouseCoordinates(HOUSE_CHEST.x,HOUSE_CHEST.z);
 assert.ok(Math.abs(local.x)<1e-9,'door and chest share the same x-axis');
 assert.ok(Math.abs(local.z+8.6)<1e-9);
 assert.deepEqual(HOUSE_CHEST,{x:-35.6,z:-2,range:3.25});
 assert.equal(LONGHOUSE.doorWidth,6.8);
 const innerBackFace=-LONGHOUSE.depth/2+LONGHOUSE.wallThickness;
 assert.ok(local.z-.725>innerBackFace+.35,'leave space for rear lid and camera');
 assert.ok(local.z< -LONGHOUSE.depth/2+2.25,'keep chest at rear wall');
 assert.equal(CHEST_X,HOUSE_CHEST.x);
 assert.equal(CHEST_Z,HOUSE_CHEST.z);
 assert.equal(CHEST_RANGE,HOUSE_CHEST.range);
 assert.equal(OFFLINE_CHEST.x,CHEST_X);
 assert.equal(OFFLINE_CHEST.z,CHEST_Z);
 assert.equal(OFFLINE_CHEST.slots,18);
 assert.equal(isInLonghouse(CHEST_X,CHEST_Z),true);
});
test('an interior grid is entirely free apart from the actual GLB chest',()=>{
 let checked=0;
 for(let x=-8.2;x<=8.2;x+=.35)for(let z=-9;z<=9;z+=.35){
  const blocked=Math.abs(x-LONGHOUSE.chestLocalX)<1.155+.42&&
   Math.abs(z-LONGHOUSE.chestLocalZ)<.725+.42;
  assert.equal(walk(x,z),!blocked,'Unexpected obstacle at local '+x+','+z);
  checked++;
 }
 assert.ok(checked>1800);
 for(const [x,z] of [[-5.2,-5],[3,-1],[4.49,.08],[-5.6,3],[0,0],[7,-8],[-7,8]]){
  assert.equal(walk(x,z),true,'Legacy obstacle at '+x+','+z);
 }
 assert.equal(walk(0,-8.6),false);
 assert.equal(walk(0,-6.65),true);
 assert.equal(walk(5.4,-6.2),true,'old chest corner must be open');
 assert.equal(insideHouse(CHEST_X,CHEST_Z),true);
});
test('structural walls are solid and entrance remains open',()=>{
 const hd=LONGHOUSE.depth/2,hw=LONGHOUSE.width/2;
 for(const x of [-7,-5,-3,3,5,7])assert.equal(walk(x,hd),false);
 for(const x of [-2.8,0,2.8]){
  assert.equal(walk(x,hd),true);
  assert.equal(walk(x,hd+1),true);
 }
 for(const z of [-8,0,8]){
  assert.equal(walk(hw,z),false);
  assert.equal(walk(-hw,z),false);
 }
 assert.equal(walk(0,-hd),false);
});
test('house graph contains only floor, walls and roof, no props',()=>{
 const root=new THREE.Group(),roofPlanes=[];
 const model=buildHearthHouse(THREE,{root,villageVisuals:{
  addRoof(mesh){roofPlanes.push(mesh)}
 }});
 assert.equal(root.children.length,3);
 assert.deepEqual(root.children.map(child=>child.name),[
  'hearth-house-solid-floor','hearth-house-solid-walls','hearth-house-exterior-roof'
 ]);
 assert.equal(model.walls.children.filter(mesh=>mesh.isMesh).length,6);
 assert.equal(roofPlanes.length,2);
 assert.ok(roofPlanes.every(mesh=>model.roof.getObjectById(mesh.id)===mesh));
 assert.ok(model.walls.children.filter(mesh=>mesh.isMesh).every(mesh=>!mesh.material.transparent));
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.floor.visible,true);
});
test('Atlas GLB remains intact with Open and Close animations',()=>{
 const glb=readFileSync(new URL('../../bestiary/models/village-chest-v0.1.glb',import.meta.url));
 assert.equal(glb.toString('utf8',0,4),'glTF');
 const n=glb.readUInt32LE(12);
 const json=JSON.parse(glb.toString('utf8',20,20+n));
 const clips=(json.animations||[]).map(x=>x.name);
 assert.ok(clips.includes('Open')&&clips.includes('Close'));
 assert.ok(json.nodes.some(x=>x.name==='Lid_Hinge'));
 const hinge=new THREE.Group(),motion=createChestMotion(hinge);
 motion.select('Open');motion.update(.4);
 const half=hinge.rotation.x;
 motion.select('Close');assert.equal(hinge.rotation.x,half);
 motion.update(3);assert.ok(Math.abs(hinge.rotation.x)<1e-6);
});

test('every active browser geometry consumer uses the current shared module URL',()=>{
 // A warm Safari cache must not mix the old chest anchor with the new server.
 const consumers=['gather-world.js','start-zone.js','sphere-physics.js','interaction-targeting.js'];
 for(const name of consumers){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  const imports=[...source.matchAll(/hearth-house\.js\?v=([^'"\s]+)/g)];
  assert.ok(imports.length>0,name);
  assert.ok(imports.every(row=>row[1]==='10'),name+' requests a stale geometry module');
 }
 for(const [name,dependency,version] of [['planet.js','start-zone.js','40'],['planet.js','offline-rpg.js','110'],['offline-rpg.js','gather-world.js','23'],['offline-rpg.js','camp-actions.js','21']]){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  const marker=dependency+'?v=';
  const at=source.indexOf(marker);
  const actual=at<0?NaN:Number.parseInt(source.slice(at+marker.length),10);
  assert.ok(Number.isInteger(actual)&&actual>=Number(version),
   name+' must invalidate its geometry dependency without rejecting newer cache revisions');
 }
});

test('tribal exterior adds lightweight art without colliders or blocking the doorway',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 assert.deepEqual(root.children.map(child=>child.name),[
  'hearth-house-solid-floor','hearth-house-solid-walls','hearth-house-exterior-roof'
 ]);
 const details=model.walls.getObjectByName('hearth-house-tribal-exterior');
 assert.ok(details);
 assert.equal(details.getObjectByName('hearth-house-hide-wall-panels').isInstancedMesh,true);
 assert.equal(details.getObjectByName('hearth-house-lashed-timber').isInstancedMesh,true);
 assert.equal(details.getObjectByName('hearth-house-entrance-emblem').isGroup,true);
 assert.equal(model.roof.getObjectByName('hearth-house-bone-finials').isInstancedMesh,true);
 assert.ok(model.roofPlanes.every(panel=>panel.getObjectByName('hearth-house-roof-hide-patches').isInstancedMesh));
 assert.equal(model.floor.children.length,16);
 const front=model.walls.children.filter(mesh=>mesh.isMesh&&
  Math.abs(mesh.position.z-(LONGHOUSE.depth/2-LONGHOUSE.wallThickness/2))<1e-6);
 assert.equal(front.length,3);
 assert.ok(front.filter(mesh=>mesh.position.x!==0).every(mesh=>
  Math.abs(Math.abs(mesh.position.x)-mesh.geometry.parameters.width/2-LONGHOUSE.doorWidth/2)<1e-6
 ));
 // The roof alone can disappear indoors; the decoration has no gameplay hitboxes.
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.floor.visible,true);
 root.traverse(node=>{
  assert.notEqual(node.userData.collidable,true);
  assert.notEqual(node.userData.targetable,true);
 });
});

test('elder longhouse porch remains outside the walkable space',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const porch=model.roof.getObjectByName('hearth-house-ceremonial-porch');
 assert.ok(porch?.isGroup);
 assert.equal(porch.children.filter(node=>node.name==='hearth-house-porch-hide-roof').length,2);
 assert.equal(porch.children.filter(node=>node.name==='hearth-house-porch-pennant').length,2);
 assert.equal(model.roof.getObjectByName('hearth-house-gable-timber').isInstancedMesh,true);
 assert.equal(model.walls.getObjectByName('hearth-house-hide-lacings').isInstancedMesh,true);
 assert.equal(model.walls.getObjectByName('hearth-house-entrance-carvings').isInstancedMesh,true);
 assert.equal(model.walls.children.filter(node=>node.isMesh).length,6);
 assert.equal(model.floor.children.length,16);
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.floor.visible,true);
 for(const x of [-2.8,0,2.8])assert.equal(walk(x,LONGHOUSE.depth/2),true);
 root.traverse(node=>{
  assert.notEqual(node.userData.collidable,true);
  assert.notEqual(node.userData.targetable,true);
 });
});

test('elder architectural facades frame the doorway and retain the original walkable grid',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const wing=model.accents.getObjectByName('hearth-house-side-wing');
 const posts=model.accents.getObjectByName('hearth-house-ceremonial-posts');
 const collars=model.accents.getObjectByName('hearth-house-totem-collars');
 const paving=model.accents.getObjectByName('hearth-house-forecourt-edging');
 const threshold=model.accents.getObjectByName('hearth-house-entry-threshold');
 assert.ok(wing && wing.isMesh);
 assert.equal(model.accents.children.filter(x=>x.name==='hearth-house-side-wing').length,6);
 assert.equal(model.accents.children.filter(x=>x.name==='hearth-house-front-pier').length,4);
 assert.ok(posts?.isInstancedMesh);
 assert.equal(posts.count,8);
 assert.equal(collars?.count,6);
 assert.equal(paving?.count,10);
 assert.ok(threshold?.isMesh);
 assert.equal(threshold.geometry.parameters.width,LONGHOUSE.doorWidth-.34);
 assert.ok(model.roof.getObjectByName('hearth-house-eave-details').isInstancedMesh);
 assert.equal(model.walls.children.filter(x=>x.isMesh).length,6);
 assert.equal(root.children.length,3);
 // Freestanding signposts and stone edging must never intrude on the central path.
 assert.ok(paving.geometry && Math.abs(threshold.position.x)<1e-9);
 const span=LONGHOUSE.doorWidth/2;
 model.accents.children.filter(x=>x.name==='hearth-house-ceremonial-totem-pennant').forEach(x=>{
  assert.ok(Math.abs(x.position.x)>span+2);
 });
 for(const x of [-2.8,0,2.8]){
  assert.equal(walk(x,LONGHOUSE.depth/2),true);
  assert.equal(walk(x,LONGHOUSE.depth/2+1),true);
 }
 model.roof.visible=false;
 assert.equal(model.floor.visible,true);
 assert.equal(model.walls.visible,true);
 root.traverse(node=>{
  assert.notEqual(node.userData.collidable,true);
  assert.notEqual(node.userData.targetable,true);
 });
});

test('textured elder lodge keeps procedural materials lightweight and platform independent',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const wall=model.walls.children.find(node=>node.isMesh);
 const timber=model.accents.getObjectByName('hearth-house-lashed-timber');
 assert.equal(wall.material.map.isDataTexture,true);
 assert.equal(timber.material.map.isDataTexture,true);
 assert.notEqual(wall.material.map,timber.material.map);
 assert.equal(wall.material.map.image.width,64);
 assert.equal(timber.material.map.image.height,64);
 const tex=timber.material.map.image.data;
 assert.ok(new Set([tex[0],tex[4],tex[8],tex[64]]).size>1);
 assert.equal(model.accents.getObjectByName('hearth-house-forecourt-stepping-stones').count,5);
 assert.equal(model.accents.getObjectByName('hearth-house-bone-wind-charms').count,8);
 assert.equal(model.accents.children.filter(x=>x.name==='hearth-house-entrance-sconce').length,2);
 assert.equal(model.accents.children.filter(x=>x.name==='hearth-house-sconce-ember').length,2);
 assert.equal(model.roof.getObjectByName('hearth-house-roof-hide-apron').count,24);
 assert.equal(model.roof.getObjectByName('hearth-house-ceremonial-porch')
  .getObjectByName('hearth-house-awning-woven-fringe').count,18);
 assert.equal(model.walls.children.filter(node=>node.isMesh).length,6);
 assert.equal(root.children.length,3);
 for(const x of [-2.8,0,2.8]){
  assert.equal(walk(x,LONGHOUSE.depth/2),true);
  assert.equal(walk(x,LONGHOUSE.depth/2+1),true);
 }
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.floor.visible,true);
 root.traverse(node=>{
  assert.notEqual(node.userData.collidable,true);
  assert.notEqual(node.userData.targetable,true);
 });
});

test("elder's interior is permanent solid-looking decor, not part of fading roof or walls",()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 assert.deepEqual(root.children.map(x=>x.name),[
  'hearth-house-solid-floor','hearth-house-solid-walls','hearth-house-exterior-roof'
 ]);
 assert.equal(model.floor.children.length,16);
 assert.equal(model.walls.children.filter(x=>x.isMesh).length,6);
 const interior=model.interior;
 assert.ok(interior?.isGroup);
 assert.equal(interior.name,'hearth-house-elder-interior');
 assert.equal(interior.parent,model.floor.children[0]);
 const beams=interior.getObjectByName('hearth-house-interior-timber');
 assert.equal(beams.isInstancedMesh,true);
 assert.ok(beams.count>=20);
 const banners=interior.getObjectByName('hearth-house-interior-hide-banners');
 assert.equal(banners.count,8);
 const seat=interior.getObjectByName('hearth-house-elder-seat');
 assert.equal(seat?.isGroup,true);
 assert.ok(seat.position.x<0);
 assert.ok(Math.hypot(seat.position.x-LONGHOUSE.chestLocalX,
  seat.position.z-LONGHOUSE.chestLocalZ)>5.5);
 assert.equal(seat.getObjectByName('hearth-house-elder-symbol').isMesh,true);
 const hearth=interior.getObjectByName('hearth-house-decorative-hearth');
 assert.equal(hearth?.isGroup,true);
 assert.equal(hearth.getObjectByName('hearth-house-hearth-stones').count,12);
 assert.equal(hearth.getObjectByName('hearth-house-hearth-logs').isInstancedMesh,true);
 assert.equal(hearth.getObjectByName('hearth-house-hearth-glow').material.isMeshBasicMaterial,true);
 assert.equal(interior.children.filter(x=>x.name==='hearth-house-interior-sconce').length,2);
 assert.equal(interior.children.filter(x=>x.name==='hearth-house-interior-ember').length,2);
 assert.equal(interior.getObjectByName('hearth-house-interior-bone-charms').isInstancedMesh,true);
 let lights=0,decorMeshes=0;
 interior.traverse(node=>{
  if(node.isLight)lights++;
  if(node.isMesh){
   decorMeshes++;
   assert.notEqual(node.userData.collidable,true);
   assert.notEqual(node.userData.targetable,true);
   assert.equal(node.castShadow,false);
  }
 });
 assert.equal(lights,0,'interior decor cannot change global lights at the threshold');
 assert.ok(decorMeshes<55,'mobile-friendly decorative draw-call budget');
 model.roof.visible=false;
 assert.equal(interior.visible,true);
 for(const [x,z] of [[0,0],[0,7],[0,-5],[7,-7],[-7,6]]){
  assert.equal(walk(x,z),true,'unchanged corridor/collision at '+x+','+z);
 }
 assert.equal(walk(LONGHOUSE.chestLocalX,LONGHOUSE.chestLocalZ),false);
});

test('chest transfer keeps route, camera clearance and elder room props accessible',()=>{
 const doorZ=LONGHOUSE.depth/2;
 const cx=LONGHOUSE.chestLocalX,cz=LONGHOUSE.chestLocalZ;
 assert.equal(cx,0,'center of chest and doorway must share the same local x');
 assert.equal(walk(0,doorZ+1),true);
 assert.equal(walk(0,doorZ),true);
 for(const z of [7,4,1,-2,-5,-6.65])assert.equal(walk(0,z),true,'route to chest: '+z);
 assert.equal(walk(0,cz),false,'solid physical footprint');
 for(const x of [-3.0,3.0])assert.equal(walk(x,cz),true,'side clearance for interaction');
 for(const z of [-7.0,-6.65])assert.ok(Math.abs(z-cz)<HOUSE_CHEST.range-.5);
 const root=new THREE.Group(),house=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const seat=house.interior.getObjectByName('hearth-house-elder-seat');
 const hearth=house.interior.getObjectByName('hearth-house-decorative-hearth');
 assert.ok(Math.hypot(seat.position.x-cx,seat.position.z-cz)>4);
 assert.ok(Math.hypot(hearth.position.x-cx,hearth.position.z-cz)>6);
 assert.equal(house.roof.visible,true);
 assert.equal(root.children.length,3);
});

test('rear wall chest zone and approach contain no decorative furnishings',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const interior=model.interior;
 const props=interior.getObjectByName('hearth-house-side-furnishings');
 assert.ok(props?.isGroup,'new props are registered in non-fading interior');
 assert.equal(props.parent,interior);
 const reserved={minX:-3.1,maxX:3.1,minZ:-10.0,maxZ:-5.2};
 const rectIntersects=box=>box.min.x<reserved.maxX&&box.max.x>reserved.minX&&
  box.min.z<reserved.maxZ&&box.max.z>reserved.minZ;
 const bbox=new THREE.Box3();
 for(const child of props.children){
  bbox.setFromObject(child);
  assert.equal(rectIntersects(bbox),false,
   child.name+' must never cover the shared chest or its clear approach');
 }
 const resting=props.children.filter(x=>x.name==='hearth-house-side-resting-place');
 assert.equal(resting.length,2);
 assert.equal(props.getObjectByName('hearth-house-carving-station')?.isGroup,true);
 assert.equal(props.getObjectByName('hearth-house-side-storage-shelf')?.isGroup,true);
 assert.equal(props.getObjectByName('hearth-house-side-clay-jars')?.count,6);
 assert.equal(props.getObjectByName('hearth-house-side-leather-hangers').isInstancedMesh,true);
 const banners=interior.getObjectByName('hearth-house-interior-hide-banners');
 for(let i=0;i<4;i++){
  const matrix=new THREE.Matrix4();banners.getMatrixAt(i,matrix);
  const pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scale=new THREE.Vector3();
  matrix.decompose(pos,rot,scale);
  assert.ok(Math.abs(pos.x)-scale.x/2>reserved.maxX,
   'rear decorative tapestry must not appear behind the chest');
 }
 const charms=interior.getObjectByName('hearth-house-interior-bone-charms');
 for(let i=0;i<charms.count;i++){
  const matrix=new THREE.Matrix4();charms.getMatrixAt(i,matrix);
  const pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scale=new THREE.Vector3();
  matrix.decompose(pos,rot,scale);
  if(pos.z<reserved.maxZ)
   assert.ok(Math.abs(pos.x)>reserved.maxX,'no ceiling talisman above chest');
 }
 // Scene composition, physical collision and opening interaction unchanged.
 assert.equal(root.children.length,3);
 assert.equal(model.floor.children.length,16);
 assert.equal(model.walls.children.filter(x=>x.isMesh).length,6);
 for(const z of [10.8,7,3,0,-3,-5,-6.65])
  assert.equal(walk(0,z),true,'the chest approach is walkable at z='+z);
 assert.equal(walk(LONGHOUSE.chestLocalX,LONGHOUSE.chestLocalZ),false);
 const origin=model.interior.getObjectByName('hearth-house-elder-seat');
 assert.ok(Math.abs(origin.position.x)>reserved.maxX);
 let drawMeshes=0,dynamicLights=0;
 interior.traverse(x=>{
  if(x.isMesh){drawMeshes++;assert.notEqual(x.userData.collidable,true);}
  if(x.isLight)dynamicLights++;
 });
 assert.equal(dynamicLights,0);
 assert.ok(drawMeshes<55,'protect iPhone render budget');
});
