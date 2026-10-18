import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSphericalCombatVfx} from './sphere-combat-vfx.js';

test('pooled hit effect fades and never modifies the hostile target',()=>{
 const scene=new THREE.Scene(),fx=createSphericalCombatVfx({THREE,parent:scene});
 const enemy={root:new THREE.Group(),hp:36,aggro:false};
 enemy.root.position.set(30,40,250);
 assert.equal(fx.trigger(enemy,'hit'),true);
 assert.equal(fx.activeCount(),1);
 assert.equal(enemy.hp,36);
 assert.equal(enemy.aggro,false);
 const visible=scene.children.filter(c=>c.visible&&c.name==='nexgameworld-impact-sparks');
 assert.equal(visible.length,1);
 assert.equal(visible[0].children.length,5);
 assert.equal(visible[0].children.every(c=>c.castShadow===false),true);
 // The effect intentionally caps a single frame advance at 0.1s.
 fx.update(.3);
 assert.equal(fx.activeCount(),1);
 fx.update(.3);fx.update(.3);
 assert.equal(fx.activeCount(),0);
});
test('successful shield block has its own lightweight colour and returns to pool',()=>{
 const scene=new THREE.Scene(),fx=createSphericalCombatVfx({THREE,parent:scene});
 const hero={root:new THREE.Group()};
 hero.root.position.set(0,0,261);
 assert.equal(fx.trigger(hero,'block'),true);
 const active=scene.children.find(c=>c.visible);
 assert.equal(active.children[0].material.color.getHex(),0xb5f4f4);
 fx.update(.2);assert.equal(fx.activeCount(),1);
 fx.update(.2);fx.update(.2);fx.update(.2);
 assert.equal(fx.activeCount(),0);
});
test('economy disables particles; max quality displays five pooled sparks',()=>{
 const scene=new THREE.Scene(),fx=createSphericalCombatVfx({THREE,parent:scene});
 const hero={root:new THREE.Group()};
 hero.root.position.set(0,0,261);
 fx.setQuality(.15);
 assert.equal(fx.trigger(hero,'hit'),false);
 assert.equal(fx.activeCount(),0);
 fx.setQuality(1);
 assert.equal(fx.trigger(hero,'strong'),true);
 fx.update(.01);
 const active=scene.children.find(c=>c.visible);
 assert.equal(active.children.filter(c=>c.visible).length,5);
 fx.clear();
 assert.equal(fx.activeCount(),0);
});

test('distant impact glints are culled, while nearby hit/block stay fully visible',()=>{
 const scene=new THREE.Scene(),viewer=new THREE.Vector3(0,0,1);
 const fx=createSphericalCombatVfx({
  THREE,parent:scene,getViewerNormal:()=>viewer,getRadius:()=>261,maxVisibleMetres:55
 });
 const remote={root:new THREE.Group()},near={root:new THREE.Group()};
 remote.root.position.set(0,0,-261);
 near.root.position.set(0,0,261);
 assert.equal(fx.trigger(remote,'hit'),false);
 assert.equal(fx.activeCount(),0);
 assert.equal(fx.trigger(near,'hit'),true);
 assert.equal(fx.trigger(near,'block'),true);
 assert.equal(fx.activeCount(),2);
 fx.clear();assert.equal(fx.activeCount(),0);
});
