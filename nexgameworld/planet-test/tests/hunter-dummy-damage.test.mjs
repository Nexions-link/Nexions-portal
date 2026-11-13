import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './harness.mjs';

test('practice dummy reports ranged damage and special shot bonuses at level eight',()=>{
 const random=Math.random;
 try{
  Math.random=()=>0;
  for(const [abilityId,expected] of [['autoShot',25],['arcaneShot',37],['concussiveShot',25],['aimedShot',55]]){
   const profile={classId:'hunter',raceId:'orc',level:8,resource:100,health:120,
    inventory:[],equipment:{weapon:{id:'wornBow'}},
    actionBar:[{kind:'ability',id:abilityId}]};
   const h=harness({authenticatedProfile:profile});
   h.rpg.setMultiplayer({connected:true});
   h.selectDummy();
   const before=Number(h.get('targetHp').textContent.split(' / ')[0]);
   h.get('actionsBar').children[0].click();
   for(let i=0;i<10;i++)h.rpg.update(.1);
   const after=Number(h.get('targetHp').textContent.split(' / ')[0]);
   assert.equal(before-after,expected,abilityId+' should match authoritative ranged combat');
  }
 }finally{Math.random=random;}
});
