import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {harness,installDom} from './harness.mjs';
import {creatureByIndex} from '../creature-registry.js';
import {createTargetAttackHud} from '../target-attack-hud.js';

function onlineTarget(){
 const spec=creatureByIndex(0),profile={classId:'warrior',raceId:'orc',level:8,health:120,
  inventory:[],equipment:{weapon:{id:'wornAxe'}}};
 const h=harness({x:spec.x,z:spec.z-8,authenticatedProfile:profile});
 const attacks=[],transport={connected:true,requestChestStatus:()=>true,sendAttack:(...row)=>attacks.push(row)};
 h.rpg.setMultiplayer(transport);
 const snapshot=(change={})=>({index:spec.index,id:spec.id,x:spec.x,z:spec.z,hp:500,life:1,phase:'alive',attackWindup:false,...change});
 const cue=(change={})=>({mobId:spec.id,life:1,targetId:'self',windupMs:400,...change});
 h.rpg.onMobSnapshot([snapshot()]);h.rpg.targetNearest();
 assert.equal(h.get('targetName').textContent,spec.name);
 return {...h,spec,transport,attacks,snapshot,cue};
}

test('actual telegraphs show selected-target preparation without hiding distance or predicting damage',()=>{
 const h=onlineTarget(),distance=h.get('targetDistance').textContent;
 const state=JSON.stringify(h.rpg.state),writes=h.writes.length;
 h.rpg.onMobTelegraph(h.cue());
 assert.equal(h.get('targetAttackCue').hidden,false);assert.equal(h.get('targetStatus').hidden,true);
 assert.equal(h.get('targetAttackCueLabel').textContent,'Готовит удар');
 assert.match(h.get('targetAttackCueTime').textContent,/^≈0,[1-4] с$/);
 assert.equal(h.get('targetDistance').hidden,false);assert.equal(h.get('targetDistance').textContent,distance);
 assert.equal(JSON.stringify(h.rpg.state),state);assert.equal(h.writes.length,writes);assert.equal(h.attacks.length,0);
 h.rpg.onMobSnapshot([h.snapshot({attackWindup:false})]);
 assert.equal(h.get('targetAttackCue').hidden,true);assert.equal(h.get('targetStatus').hidden,false);
 assert.equal(h.get('targetDistance').textContent,distance);
});

test('known to hidden to unknown removes the old aria number and repeat paints do not rewrite DOM',()=>{
 installDom();
 const get=id=>document.getElementById(id),frame=get('targetAttackCue'),status=get('targetStatus');
 frame.hidden=true;status.hidden=false;
 frame.removeAttribute=name=>delete frame.attributes[name];
 let writes=0,hiddenWrites=0;
 const setAttribute=frame.setAttribute.bind(frame);
 frame.setAttribute=(...args)=>{writes++;setAttribute(...args);};
 for(const node of [frame,status]){
  let value=node.hidden;
  Object.defineProperty(node,'hidden',{get:()=>value,set:next=>{hiddenWrites++;value=next;}});
 }
 const renderer=createTargetAttackHud({document});
 renderer.paint({phase:'preparing',progress:.5,remainingMs:200});
 assert.equal(frame.attributes['aria-valuenow'],'50');
 assert.equal(get('targetAttackCueTime').textContent,'≈0,2 с');
 renderer.paint(null);assert.equal(frame.attributes['aria-valuenow'],undefined);
 renderer.paint({phase:'unknown',progress:null,remainingMs:null});
 assert.equal(frame.attributes['aria-valuenow'],undefined);
 assert.equal(get('targetAttackCueTime').textContent,'…');
 const beforeWrites=writes,beforeHidden=hiddenWrites;
 renderer.paint({phase:'unknown',progress:null,remainingMs:null});
 assert.equal(writes,beforeWrites);assert.equal(hiddenWrites,beforeHidden);
});

test('snapshot-only preparation has no invented clock and explicit false cancels without waiting',()=>{
 const h=onlineTarget();h.rpg.onMobSnapshot([h.snapshot({attackWindup:true})]);
 assert.equal(h.get('targetAttackCue').attributes['data-attack-phase'],'unknown');
 assert.equal(h.get('targetAttackCueTime').textContent,'…');
 const missing=h.snapshot();delete missing.attackWindup;
 h.rpg.onMobSnapshot([missing]);assert.equal(h.get('targetAttackCue').hidden,false);
 h.rpg.onMobSnapshot([h.snapshot()]);assert.equal(h.get('targetAttackCue').hidden,true);
});

test('real impact and observer strike, life replacement, death and disconnect remove old cues',()=>{
 const h=onlineTarget();
 h.rpg.onMobTelegraph(h.cue());h.rpg.onMobStrike({...h.cue(),targetId:'other'},'self');
 assert.equal(h.get('targetAttackCue').hidden,true);
 h.rpg.onMobTelegraph(h.cue());h.rpg.onMobAttack({...h.cue(),hp:h.rpg.state.hp,damage:0});
 assert.equal(h.get('targetAttackCue').hidden,true);
 h.rpg.onMobTelegraph(h.cue());h.rpg.onMobSnapshot([h.snapshot({life:2})]);
 assert.equal(h.get('targetAttackCue').hidden,true);
 h.rpg.onMobTelegraph(h.cue({life:2}));h.rpg.onMobTelegraph(h.cue());
 h.rpg.onMobStrike({...h.cue(),targetId:'other'},'self');
 assert.equal(h.get('targetAttackCue').hidden,false,'old-life impact cannot finish new preparation');
 h.rpg.onMobSnapshot([h.snapshot({life:2,phase:'corpse',hp:0})]);
 assert.equal(h.get('targetAttackCue').hidden,true);
 h.rpg.onMobSnapshot([h.snapshot({life:3})]);h.rpg.targetNearest();h.rpg.onMobTelegraph(h.cue({life:3}));
 assert.equal(h.get('targetAttackCue').hidden,false);
 h.transport.connected=false;h.rpg.onNetworkDisconnect();assert.equal(h.get('targetAttackCue').hidden,true);
 h.transport.connected=true;h.rpg.draw(false);assert.equal(h.get('targetAttackCue').hidden,true);
 h.rpg.onMobTelegraph(h.cue({life:3}));h.rpg.onNetworkRespawn({hp:120});
 assert.equal(h.get('targetAttackCue').hidden,true);
});

test('clearing and changing selected target restores status, while a current hidden cue can be selected again',()=>{
 const h=onlineTarget();h.rpg.onMobTelegraph(h.cue());
 h.get('targetClear').click();assert.equal(h.get('targetAttackCue').hidden,true);
 assert.equal(h.get('targetStatus').hidden,false);
 h.rpg.targetNearest();assert.equal(h.get('targetAttackCue').hidden,false);
 h.get('targetClear').click();h.position(-7,5);h.selectDummy();
 assert.equal(h.get('targetAttackCue').hidden,true);assert.equal(h.get('targetDistance').hidden,false);
});

test('the HUD swaps only the fixed old status line and uses no layout reads or CSS animation',()=>{
 const h=onlineTarget(),renderer=createTargetAttackHud({document});
 for(const id of ['targetAttackCue','targetStatus','targetDistance'])
  h.get(id).getBoundingClientRect=()=>{throw Error('HUD must not measure layout');};
 renderer.paint({phase:'preparing',progress:.5,remainingMs:200});
 assert.equal(h.get('targetAttackCueFill').style.transform,'scaleX(0.500)');
 renderer.paint({phase:'waiting',progress:1,remainingMs:0});
 assert.equal(h.get('targetAttackCueLabel').textContent,'Ожидает удара');
 renderer.paint(null);assert.equal(h.get('targetStatus').hidden,false);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../target-attack-cue.css',import.meta.url),'utf8');
 assert.match(html,/<div id="targetDistance" aria-live="off"><\/div>\s*<div id="targetActivityRow">/);
 assert.match(css,/#hudTop #targetActivityRow\{[^}]*height:12px;min-height:12px;max-height:12px/);
 assert.doesNotMatch(css,/animation\s*:|@keyframes|transition\s*:/);
});
