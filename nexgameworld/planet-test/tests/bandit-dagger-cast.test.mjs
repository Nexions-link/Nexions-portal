import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './harness.mjs';
import {animateSphericalTauren} from '../tauren-animation.js';

const banditProfile=()=>({
 nickname:'Следопыт',level:4,health:110,experience:0,gold:40,
 inventory:Array(12).fill(null),equipment:{},
 quests:{bandit:{stage:3,kills:3},banditWeapons:{stage:1}}
});
function withFakeCastClock(run){
 const realNow=Date.now,realSetTimeout=globalThis.setTimeout;
 const realClearTimeout=globalThis.clearTimeout;
 let time=100000,nextId=1;
 const timers=new Map();
 Date.now=()=>time;
 globalThis.setTimeout=(fn,delay)=>{const id=nextId++;timers.set(id,{fn,delay});return id};
 globalThis.clearTimeout=id=>{timers.delete(id)};
 try{
  return run({
   advance(ms){time+=ms;},
   runTimer(){
    const [[id,timer]]=[...timers.entries()];
    assert.ok(timer,'server-approved gather timer exists');
    timers.delete(id);time+=timer.delay;timer.fn();
   },
   activeTimers:()=>timers.size
  });
 }finally{
  Date.now=realNow;globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClearTimeout;
 }
}

test('dagger pickup shows herbalist cast bar, kneels for 1.5 seconds, then releases on server acknowledgement',()=>{
 withFakeCastClock(clock=>{
  const h=harness({x:-62,z:-10,authenticatedProfile:banditProfile()}),sent=[];
  h.rpg.setMultiplayer({connected:true,economy:(kind,params)=>{
   sent.push({kind,...params});return true;
  }});
  h.rpg.update(.016);
  h.rpg.interact();
  assert.deepEqual(sent.at(-1),{kind:'banditWeaponStart',index:0});
  assert.equal(h.get('gatherCast').hidden,true,'do not animate before server accepts');
  assert.equal(h.rpg.getAnimationState().gather,false);
  h.rpg.onEconomyResult({ok:true,kind:'banditWeaponStart',castMs:1500});
  assert.equal(h.get('gatherCast').hidden,false);
  assert.equal(h.get('gatherCastLabel').textContent,'Сбор: Кинжал разбойника');
  assert.equal(h.get('gatherCastTime').textContent,'1,5 с');
  assert.equal(h.rpg.getAnimationState().gather,true);
  assert.equal(h.rpg.movementLocked,true);
  const standing=h.hero.body.position.y;
  for(let i=0;i<5;i++)animateSphericalTauren(h.hero,{
   dt:.1,time:i*.1,...h.rpg.getAnimationState()
  });
  assert.ok(h.hero.root.userData.gatherBlend>.75,'body enters gather pose');
  assert.ok(h.hero.body.position.y<standing-.25,'character bends down to pick up dagger');
  clock.advance(750);
  h.rpg.update(.016);
  assert.equal(h.get('gatherCast').attributes['aria-valuenow'],'50');
  assert.equal(h.get('gatherCastTime').textContent,'0,8 с');
  clock.advance(750);
  h.rpg.update(.016);
  assert.equal(h.get('gatherCast').attributes['aria-valuenow'],'100');
  assert.equal(sent.filter(x=>x.kind==='banditWeaponFinish').length,0,'never sends before the secure timer');
  clock.runTimer();
  assert.deepEqual(sent.at(-1),{kind:'banditWeaponFinish',index:0});
  assert.equal(h.rpg.getAnimationState().gather,true,'hold pose until server confirms pickup');
  h.rpg.onEconomyResult({ok:true,kind:'banditWeaponFinish'});
  assert.equal(h.get('gatherCast').hidden,true);
  assert.equal(h.rpg.getAnimationState().gather,false);
  assert.equal(h.rpg.movementLocked,false);
 });
});

test('failed dagger cast restores HUD, standing pose and movement without granting an item',()=>{
 withFakeCastClock(clock=>{
  const h=harness({x:-62,z:-10,authenticatedProfile:banditProfile()}),sent=[];
  h.rpg.setMultiplayer({connected:true,economy:(kind,params)=>{sent.push({kind,...params});return true;}});
  h.rpg.update(.016);h.rpg.interact();
  h.rpg.onEconomyResult({ok:true,kind:'banditWeaponStart',castMs:1500});
  assert.equal(h.rpg.getAnimationState().gather,true);
  h.rpg.onEconomyResult({ok:false,kind:'banditWeaponFinish',reason:'interaction_too_far'});
  assert.equal(h.get('gatherCast').hidden,true);
  assert.equal(h.rpg.getAnimationState().gather,false);
  assert.equal(h.rpg.movementLocked,false);
  assert.equal(clock.activeTimers(),0,'server completion callback is cancelled');
  assert.equal(sent.filter(x=>x.kind==='banditWeaponFinish').length,0);
 });
});

test('online herbalist collecting uses the same visible casting bar and kneeling pose',()=>{
 withFakeCastClock(clock=>{
  const profile={...banditProfile(),
   quests:{gather:{stage:1,accepted:true}},
   inventory:Array(12).fill(null)};
  const h=harness({x:-12,z:10,authenticatedProfile:profile}),sent=[];
  h.rpg.setMultiplayer({connected:true,economy:(kind,params)=>{sent.push({kind,...params});return true;}});
  h.rpg.update(.016);h.rpg.interact();
  assert.equal(sent.at(-1)?.kind,'gatherStart');
  h.rpg.onEconomyResult({ok:true,kind:'gatherStart',castMs:1500});
  assert.equal(h.get('gatherCastLabel').textContent,'Сбор: Луговой цветок');
  assert.equal(h.rpg.getAnimationState().gather,true);
  clock.runTimer();
  assert.equal(sent.at(-1).kind,'gatherFinish');
  h.rpg.onEconomyResult({ok:true,kind:'gatherFinish'});
  assert.equal(h.get('gatherCast').hidden,true);
  assert.equal(h.rpg.getAnimationState().gather,false);
 });
});
