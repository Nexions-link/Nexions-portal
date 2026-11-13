import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';

test('level rewards announce the actual class ability for hunters and warriors',()=>{
 for(const [classId,previousLevel,level,abilityName] of [
  ['hunter',3,4,'Залп'],['hunter',7,8,'Прицельный выстрел'],['warrior',7,8,'Рывок']
 ]){
  const profile={classId,raceId:'orc',level:previousLevel,experience:0,gold:0,resource:100,health:120,
   inventory:[],equipment:{weapon:{id:classId==='hunter'?'wornBow':'wornAxe'}},actionBar:[]};
  const h=harness({authenticatedProfile:profile});
  h.rpg.applyServerProgress({...profile,level,revision:2},'mentorTurnIn');
  const unlock=descendants(h.get('levelUpFeedback')).find(el=>el.className==='ngw-levelup-unlock');
  assert.equal(unlock?.textContent,'Открыта способность «'+abilityName+'»');
  assert.ok(h.get('toast').textContent.includes('«'+abilityName+'»'));
  if(classId==='hunter'){
   assert.ok(!h.get('toast').textContent.includes('Рывок'));
   assert.ok(!descendants(h.get('levelUpFeedback')).some(el=>el.textContent.includes('Рывок')));
  }
 }
});
