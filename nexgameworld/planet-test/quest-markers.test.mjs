// Run with: node --test planet-test/quest-markers.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCanvas} from '@napi-rs/canvas';
import {createQuestMarkerFactory,markerStateFromGlyph,QUEST_MARKER_VISUALS} from './quest-markers.js';
import {mentorGlyph} from './mentor-chain.js';

function fixture(){
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(58,1,.1,1100);
 camera.position.set(5,12,288);
 camera.lookAt(new THREE.Vector3(0,3,261));
 camera.updateMatrixWorld();
 const document={createElement:type=>{
  assert.equal(type,'canvas');
  return createCanvas(96,96);
 }};
 const factory=createQuestMarkerFactory(THREE,{document,camera});
 const npc=new THREE.Group();
 npc.position.set(0,0,261);
 // Local Y is radial to the planet, not global Y.
 npc.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1));
 scene.add(npc);
 return {factory,npc,camera,scene};
}

test('quest stages keep their native three-state mechanics while sharing one visual style',()=>{
 assert.equal(markerStateFromGlyph('!'),'available');
 assert.equal(markerStateFromGlyph('?'),'ready');
 assert.equal(markerStateFromGlyph('·'),'active');
 assert.equal(markerStateFromGlyph(''),null);
 assert.equal(QUEST_MARKER_VISUALS.available.color,0xedc756);
 assert.ok(QUEST_MARKER_VISUALS.available.glow<=.12);
 assert.ok(QUEST_MARKER_VISUALS.active.glow<QUEST_MARKER_VISUALS.ready.glow);
 assert.equal(mentorGlyph(0),'!');
 assert.equal(mentorGlyph(1),'·');
 assert.equal(mentorGlyph(2),'?');
 assert.equal(mentorGlyph(12),'');
});

test('exclamation marker uses solid depth, dark outline and halo instead of text sprite',()=>{
 const {factory,npc}=fixture();
 const m=factory.create('!',5.5);
 npc.add(m);m.visible=true;
 assert.equal(m.userData.questMarker,true);
 assert.equal(m.userData.glyph,'!');
 assert.equal(m.userData.questState,'available');
 assert.ok(Math.abs(m.userData.baseHeight-5.33)<1e-6,'marker now sits closer to NPC');
 assert.equal(m.scale.x,.8);
 assert.ok(m.children.some(x=>x.isSprite&&x.name==='quest-soft-halo'));
 assert.ok(m.children.some(x=>x.isMesh&&x.geometry.isExtrudeGeometry));
 assert.equal(m.children.filter(x=>x.isMesh).length,4);
 for(const child of m.children){
  const hits=[];child.raycast({},hits);assert.equal(hits.length,0);
 }
 factory.dispose();
});

test('taken and turn-in quests render as different colour and intensity question marks',()=>{
 const {factory,npc}=fixture();
 const muted=factory.create('·',5.6),ready=factory.create('?',5.6);
 npc.add(muted,ready);muted.visible=true;ready.visible=true;
 factory.update(1,.68);
 assert.equal(muted.userData.questState,'active');
 assert.equal(ready.userData.questState,'ready');
 assert.ok(muted.children[0].material.opacity<ready.children[0].material.opacity);
 assert.ok(ready.children.some(x=>x.isMesh&&x.geometry.type==='TubeGeometry'));
 factory.dispose();
});

test('marker billboards face the live camera on curved planet without modifying NPC rotation',()=>{
 const {factory,npc,camera}=fixture();
 const m=factory.create('!',5.5);
 npc.add(m);m.visible=true;
 const before=npc.quaternion.clone();
 factory.update(1.4,.68);
 const worldOrientation=m.getWorldQuaternion(new THREE.Quaternion());
 assert.ok(Math.abs(worldOrientation.dot(camera.quaternion))>.9999);
 assert.ok(npc.quaternion.equals(before));
 const y1=m.position.y;
 factory.update(2.5,.15);
 assert.ok(Math.abs(m.position.y-y1)>.001);
 assert.equal(m.children[0].material.opacity,0);
 assert.ok(m.children.filter(x=>x.isMesh).every(x=>x.visible));
 factory.dispose();
});

test('quest markers remain compact, rounded and do not grow huge at long camera distance',()=>{
 const {factory,npc,camera}=fixture();
 const marker=factory.create('!',5.55);npc.add(marker);marker.visible=true;
 factory.update(0,.68);
 assert.ok(marker.scale.x<.95,'marker scale should stay modest at normal viewing distance');
 assert.ok(marker.children[0].scale.x<1.5,'glow remains compact');
 camera.position.set(0,30,330);camera.updateMatrixWorld();
 factory.update(.5,.68);
 assert.ok(marker.scale.x<.95,'long-distance boost stays below 12 percent');
 assert.ok(marker.position.y>5.3&&marker.position.y<5.48);
 assert.ok(marker.children[0].material.opacity<=.12);
 factory.dispose();
});

test('herbalist glyphs also expose muted in-progress state',()=>{
 const {factory,npc}=fixture();
 for(const glyph of ['!','·','?'])npc.add(factory.create(glyph,5.58));
 assert.equal(npc.children.filter(c=>c.userData.questMarker).length,3);
 assert.deepEqual(npc.children.map(x=>x.userData.glyph),['!','·','?']);
 factory.dispose();
});
