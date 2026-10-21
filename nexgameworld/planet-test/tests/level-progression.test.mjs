import test from 'node:test';
import assert from 'node:assert/strict';
import {levelExperienceRequirement,totalExperienceToLevel,earnedExperienceSince,
 earlyLevelMilestone,levelProgress} from '../level-progression.js';
import {readFileSync} from 'node:fs';
test('iPhone XP progress is consistent from 1 to 10 and charge unlock is deterministic',()=>{
 assert.equal(totalExperienceToLevel(10),2700);
 for(let i=1;i<=10;i++){
  const view=levelProgress(i,0);
  assert.equal(view.required,100+(i-1)*50);
  assert.equal(view.toEarlyCap,i>=10?0:2700-totalExperienceToLevel(i));
 }
 assert.deepEqual(earlyLevelMilestone(7),{level:8,abilityId:'charge',label:'Рывок'});
 assert.equal(earlyLevelMilestone(8),null);
 assert.equal(earnedExperienceSince(7,395,8,10),15);
 assert.equal(earnedExperienceSince(8,10,8,10),0);
});
test('online and offline frontends use shared XP math, show quest XP and unlock hint',()=>{
 const online=readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 const sheet=readFileSync(new URL('../character-sheet.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../../server/spherical-world.js',import.meta.url),'utf8');
 assert.match(online,/const xpRequired=levelExperienceRequirement;/);
 assert.match(online,/earnedExperienceSince\(previousLevel,previousXp,state.level,state.xp\)/);
 assert.match(online,/source!=='welcome'&&source!=='checkpoint'/);
 assert.match(online,/Новая способность: «Рывок»/);
 assert.match(sheet,/До 10 уровня:/);
 assert.match(world,/p\.hp=levelUp\?p\.maxHp/);
 assert.match(world,/if\(levelUp\)send\(ws,\{type:'playerVitals'/);
});
