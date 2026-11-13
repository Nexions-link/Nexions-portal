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
