import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';

test('game chat keeps the exact input node and unsent text across HUD redraws and party updates',()=>{
 const profile={level:4,nickname:'Tester',inventory:[],actionBar:[]};
 const h=harness({authenticatedProfile:profile});
 h.rpg.setMultiplayer({connected:true,sendChat:()=>true,invite:()=>true,leaveParty:()=>true});
 h.get('partyOpen').click();
 const body=h.get('mbody');
 const find=className=>descendants(body).find(node=>node.className===className);
 const input=find('ngw-chat-message');
 const roster=find('ngw-party-roster');
 assert.ok(input&&roster,'party chat and roster are visible');
 input.value='Набираю сообщение';
 const beforeChildren=body.children.slice();
 for(let i=0;i<12;i++){
  h.rpg.draw();
  h.rpg.update(.2);
  assert.equal(find('ngw-chat-message'),input,'HUD refresh must not recreate input');
  assert.equal(input.value,'Набираю сообщение');
 }
 h.rpg.onOnlinePlayers([{id:'peer-1',name:'Друг',level:5}]);
 assert.equal(find('ngw-chat-message'),input,'player roster update must keep input');
 assert.equal(find('ngw-party-roster'),roster,'roster container should be retained');
 assert.ok(descendants(roster).some(node=>node.textContent==='Друг'));
 h.rpg.onPartyState({groupId:'g1',leaderId:'peer-1',members:[{id:'peer-1',name:'Друг',level:5}]});
 assert.equal(find('ngw-chat-message'),input,'party membership update must keep input');
 assert.equal(input.value,'Набираю сообщение');
 assert.deepEqual(body.children,beforeChildren,'no modal children detached by notifications');
 h.rpg.draw();
 assert.equal(find('ngw-chat-message'),input);
});
