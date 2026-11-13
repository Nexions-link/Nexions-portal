import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';
import {TRAINING_DUMMY} from '../../training.js';

const hunterProfile=()=>({classId:'hunter',raceId:'orc',level:4,resource:100,health:120,
 inventory:[],equipment:{weapon:{id:'wornBow'}},actionBar:[]});

test('authenticated hunter displays mana and hunter spells, restores class hotbar after checkpoint',()=>{
 const profile=hunterProfile();
 const h=harness({authenticatedProfile:profile});
 assert.equal(h.rpg.state.classId,'hunter');
 assert.equal(h.rpg.state.hotbar[0].id,'autoShot');
 assert.equal(h.get('className').textContent,'Орк · Охотник');
 assert.match(h.get('rageText').textContent,/Мана/);
 h.get('spellbookButton').click();
 const text=descendants(h.get('spellbookAbilities')).map(e=>e.textContent).join(' ');
 assert.match(text,/Залп/);assert.doesNotMatch(text,/Рубящий удар|Громовая поступь/);
 const actionBar=[...h.rpg.state.hotbar];actionBar[4]={kind:'ability',id:'multiShot'};
 h.rpg.applyServerProgress({...profile,actionBar},'welcome');
 assert.equal(h.rpg.state.hotbar[4].id,'multiShot');
 const reconnect=harness({authenticatedProfile:{...profile,actionBar}});
 assert.deepEqual(reconnect.rpg.state.hotbar,actionBar);
});

test('hunter can turn Auto Shot off while moving or after removing the bow',()=>{
 for(const changed of ['moving','unarmed']){
  const profile=hunterProfile();
  const h=harness({authenticatedProfile:profile});
  h.rpg.setMultiplayer({connected:true,sendAttack:()=>true});
  h.selectDummy();
  h.get('actionsBar').children[0].click();
  assert.match(h.get('actionsBar').children[0].className,/is-active/);
  if(changed==='moving')h.hero.root.userData.walkBlend=1;
  else h.rpg.applyServerProgress({...profile,equipment:{}},'checkpoint');
  h.get('actionsBar').children[0].click();
  assert.doesNotMatch(h.get('actionsBar').children[0].className,/is-active/,changed);
  h.hero.root.userData.walkBlend=0;
  for(let i=0;i<25;i++)h.rpg.update(.1);
  assert.doesNotMatch(h.get('actionsBar').children[0].className,/is-active/,'stopped stance stays off');
 }
});

test('server-confirmed incoming hits grant rage to warriors but never mana to hunters',()=>{
 for(const classId of ['hunter','warrior']){
  const h=harness({authenticatedProfile:{...hunterProfile(),classId,resource:10}});
  h.rpg.setMultiplayer({connected:true,sendAttack:()=>true});
  h.rpg.onMobAttack({hp:100,damage:5,blocked:false});
  assert.equal(h.rpg.state.resource,classId==='hunter'?10:15,classId);
 }
});

test('local bow model and animation kind follow authoritative equipment checkpoints',()=>{
 const profile=hunterProfile(),h=harness({authenticatedProfile:profile});
 const bow=h.hero.root.userData.hunterBow;
 assert.ok(bow);
 assert.equal(bow.visible,true);
 assert.equal(bow.parent,h.hero.arms[0].hand);
 assert.equal(h.rpg.getAnimationState().weaponKind,'bow');
 h.rpg.applyServerProgress({...profile,equipment:{weapon:{id:'wornAxe'}}},'checkpoint');
 assert.equal(bow.visible,false);
 assert.equal(h.rpg.getAnimationState().weaponKind,'axe','pose changes before the melee GLB finishes loading');
 h.rpg.applyServerProgress({...profile,equipment:{}},'checkpoint');
 assert.equal(bow.visible,false);
 assert.equal(h.rpg.getAnimationState().weaponKind,'none');
 h.rpg.applyServerProgress(profile,'checkpoint');
 assert.equal(bow.visible,true);
 assert.equal(h.rpg.getAnimationState().weaponKind,'bow');
 assert.equal(h.hero.root.userData.hunterBow,bow,'unchanged bow is reused');
});

test('hunter Auto Shot holds ranged position and stays active instead of approaching with the bow',()=>{
 const h=harness({x:TRAINING_DUMMY.x,z:TRAINING_DUMMY.z-20,authenticatedProfile:hunterProfile()});
 h.position(TRAINING_DUMMY.x,TRAINING_DUMMY.z-20,TRAINING_DUMMY);
 h.rpg.setMultiplayer({connected:true,sendAttack:()=>true});
 h.selectDummy();
 h.get('actionsBar').children[0].click();
 assert.equal(h.rpg.getApproachTarget(),null,'Auto Shot must not drive the player into melee range');
 assert.match(h.get('actionsBar').children[0].className,/is-active/);
 for(let i=0;i<60;i++)h.rpg.update(.1);
 assert.match(h.get('targetDistance').textContent,/20/);
 assert.equal(h.rpg.getApproachTarget(),null);
 assert.match(h.get('actionsBar').children[0].className,/is-active/,'Auto Shot stays enabled between shots');
});
