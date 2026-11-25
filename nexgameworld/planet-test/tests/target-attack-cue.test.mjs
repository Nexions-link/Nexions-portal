import test from 'node:test';
import assert from 'node:assert/strict';
import {createTargetAttackCue,TARGET_ATTACK_STALE_MS} from '../target-attack-cue.js';

const mob=(id='wolf',life=1)=>({id,life,kind:'mob',hp:100,dead:0,corpse:false,root:{visible:true}});
const event=(m,windupMs=400)=>({mobId:m.id,life:m.life,targetId:'player',windupMs});
function fixture(options){let time=1000;return {cue:createTargetAttackCue({now:()=>time,...options}),set:v=>time=v};}

test('melee preparation is approximate and full progress waits for server confirmation',()=>{
 const {cue,set}=fixture(),m=mob(),before=structuredClone(m);
 assert.equal(cue.begin(event(m),m),true);
 assert.deepEqual(cue.read(m),{phase:'preparing',progress:0,remainingMs:400});
 set(1200);assert.deepEqual(cue.read(m),{phase:'preparing',progress:.5,remainingMs:200});
 set(1450);assert.deepEqual(cue.read(m),{phase:'waiting',progress:1,remainingMs:0});
 cue.snapshot({id:m.id,life:1,phase:'alive',attackWindup:true},m);
 set(1800);assert.equal(cue.read(m).phase,'waiting','true snapshot must not restart the timer');
 cue.finish(event(m),m);assert.equal(cue.read(m),null);
 assert.deepEqual(m,before,'no animation, combat or world fields are changed');
});

test('snapshot without a start event shows activity with no invented duration',()=>{
 const {cue,set}=fixture(),m=mob();
 cue.snapshot({id:m.id,life:1,phase:'alive',attackWindup:true},m);
 assert.deepEqual(cue.read(m),{phase:'unknown',progress:null,remainingMs:null});
 set(1800);cue.snapshot({id:m.id,life:1,phase:'alive',attackWindup:true},m);
 assert.equal(cue.read(m).phase,'unknown');
 cue.snapshot({id:m.id,life:1,phase:'alive',attackWindup:false},m);
 assert.equal(cue.read(m),null);
});

test('old-life events cannot start or finish the new life, including stale snapshots',()=>{
 const {cue}=fixture(),old=mob(),fresh=mob('wolf',2);
 cue.begin(event(old),old);cue.snapshot({id:'wolf',life:2,phase:'alive',attackWindup:false},fresh);
 cue.begin(event(fresh),fresh);
 assert.equal(cue.begin(event(old),fresh),false);
 assert.equal(cue.finish(event(old),fresh),false);
 assert.equal(cue.snapshot({id:'wolf',life:1,phase:'alive',attackWindup:false},old),false);
 assert.equal(cue.read(fresh).phase,'preparing');
});

test('target switches retain other current cues while death, hidden, disconnect and respawn clear them',()=>{
 const {cue}=fixture(),a=mob('a'),b=mob('b');
 cue.begin(event(a),a);cue.begin(event(b),b);
 assert.ok(cue.read(a));assert.ok(cue.read(b));assert.equal(cue.read({kind:'dummy',id:'dummy'}),null);
 cue.snapshot({id:a.id,life:1,phase:'corpse',attackWindup:false},{...a,hp:0,corpse:true});
 assert.equal(cue.read(a),null);assert.ok(cue.read(b));
 cue.snapshot({id:b.id,life:1,phase:'hidden',attackWindup:true},{...b,root:{visible:false}});
 assert.equal(cue.read(b),null);
 cue.begin(event(a),a);assert.equal(cue.read(a,{connected:false}),null);assert.equal(cue.read(a),null);
 cue.begin(event(a),a);assert.equal(cue.read(a,{playerAlive:false}),null);assert.equal(cue.read(a),null);
 cue.begin(event(a),a);cue.clear();assert.equal(cue.read(a),null);
});

test('only actual cues and explicit snapshot flags refresh the two-second stale timeout',()=>{
 const {cue,set}=fixture(),m=mob();
 cue.begin(event(m),m);set(2900);
 assert.ok(cue.read(m));cue.snapshot({id:m.id,life:1,phase:'alive'},m);
 set(1000+TARGET_ATTACK_STALE_MS);assert.equal(cue.read(m),null,'missing field must not keep an old cue alive');
 cue.begin(event(m),m);set(4500);cue.snapshot({id:m.id,life:1,phase:'alive',attackWindup:true},m);
 set(6000);assert.equal(cue.read(m).phase,'waiting');
 set(4500+TARGET_ATTACK_STALE_MS);assert.equal(cue.read(m),null);
 set(100000);assert.equal(cue.read(m),null,'background-tab time must not leave a frozen timer');
});

test('malformed timings never fabricate NaN progress and storage remains bounded',()=>{
 const {cue}=fixture({maxEntries:2}),a=mob('a'),b=mob('b'),c=mob('c');
 for(const duration of [NaN,Infinity,-1,undefined]){
  cue.begin({...event(a),windupMs:duration},a);assert.equal(cue.read(a).phase,'unknown');
 }
 cue.begin(event(a,450),a);cue.begin(event(b,450),b);cue.begin(event(c,450),c);
 assert.equal(cue.read(a),null);assert.ok(cue.read(b));assert.ok(cue.read(c));
 assert.equal(cue.begin({mobId:c.id,life:'1',windupMs:400},c),false);
 assert.equal(cue.begin(event(c),{...c,hp:0}),false);
});

test('each accepted telegraph starts a fresh approximate cue because the protocol has no attack identifier',()=>{
 const {cue,set}=fixture(),m=mob();
 cue.begin(event(m),m);set(1200);assert.equal(cue.read(m).progress,.5);
 cue.begin(event(m),m);assert.equal(cue.read(m).progress,0);
 set(1400);assert.equal(cue.read(m).progress,.5);
});
