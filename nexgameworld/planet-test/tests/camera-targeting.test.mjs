import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCameraTargetFilter} from '../camera-targeting.js';
import {harness} from './harness.mjs';
const mob=(x,y,z)=>{
 const root=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial());
 root.add(body);root.position.set(x,y,z);return {root};
};
test('frustum excludes behind, horizontal, vertical and distant camera bounds; includes partial models',()=>{
 const camera=new THREE.PerspectiveCamera(60,1,.1,100);
 const visible=createCameraTargetFilter(THREE,camera);
 assert.equal(visible(mob(0,0,-10)),true);
 assert.equal(visible(mob(0,0,10)),false);
 assert.equal(visible(mob(15,0,-10)),false);
 assert.equal(visible(mob(0,15,-10)),false);
 assert.equal(visible(mob(0,0,-101)),false);
 assert.equal(visible(mob(5.9,0,-10)),true,'Visible part of body at screen edge counts');
 const hidden=mob(0,0,-10);hidden.root.children[0].visible=false;
 assert.equal(visible(hidden),false);
 const labelOnly=mob(20,0,-10);const sprite=new THREE.Sprite();sprite.position.x=-20;labelOnly.root.add(sprite);
 assert.equal(visible(labelOnly),false,'Overhead labels alone are not a visible mob');
});
test('camera rotation and portrait/landscape aspect take effect on the next press',()=>{
 const camera=new THREE.PerspectiveCamera(60,2,.1,100),side=mob(8,0,-10);
 assert.equal(createCameraTargetFilter(THREE,camera)(side),true);
 camera.aspect=.5;camera.updateProjectionMatrix();
 assert.equal(createCameraTargetFilter(THREE,camera)(side),false);
 camera.lookAt(10,0,0);
 const positiveX=mob(10,0,0);
 assert.equal(createCameraTargetFilter(THREE,camera)(positiveX),true);
 assert.equal(createCameraTargetFilter(THREE,camera)(mob(0,0,-10)),false);
});
test('real target button no longer reacquires an enemy outside the current camera view',()=>{
 const h=harness();h.selectDummy();h.get('targetClear').click();
 // Keep the character in exactly the same place and direction; rotate camera only.
 const backward=h.camera.position.clone().sub(h.hero.root.position).normalize();
 h.camera.lookAt(h.camera.position.clone().add(backward));
 h.get('targetNext').click();
 assert.equal(h.get('targetFrame').hidden,true);
 h.camera.lookAt(h.hero.root.position.clone().addScaledVector(h.hero.root.position.clone().normalize(),1.5));
 h.get('targetNext').click();assert.equal(h.get('targetName').textContent,'Тренировочный манекен');
});
