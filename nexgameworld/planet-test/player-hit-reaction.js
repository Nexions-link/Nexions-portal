// P2.2: cosmetic recoil after a server-confirmed incoming strike.
// Bone poses only: no root movement, combat timer, hitbox, or health changes.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const rest=()=>({pitch:0,roll:0,headPitch:0,depth:0,dip:0,shieldBrace:0,weaponBrace:0,active:false});
export function beginPlayerHitReaction(user,{damage=0,blocked=false,absorbed=0}={}){
 if(!user||typeof user!=='object'||!Number.isFinite(damage)||damage<0||
    !Number.isFinite(absorbed)||absorbed<0||(damage===0&&!blocked))return false;
 const prior=user.incomingCombatHit;
 const count=(Number.isSafeInteger(prior?.count)?prior.count:0)+1;
 const strength=blocked?clamp(.56+Math.min(30,absorbed)*.009,.56,.83):
  clamp(.60+Math.min(40,damage)*.012,.60,1);
 user.incomingCombatHit={count,age:0,duration:blocked?.34:.48,blocked:!!blocked,
  strength,side:count%2===0?1:-1};
 return true;
}
export function advancePlayerHitReaction(user,dt=0){
 const s=user?.incomingCombatHit;
 if(!s)return rest();
 s.age=clamp((Number.isFinite(s.age)?s.age:0)+(Number.isFinite(dt)?clamp(dt,0,.10):0),0,s.duration);
 if(s.age>=s.duration){user.incomingCombatHit=null;return rest()}
 const t=s.age/s.duration;
 const w=smooth(t/.19)*(1-smooth((t-.25)/.75))*s.strength;
 const block=s.blocked;
 return {pitch:(block?-.045:-.115)*w,roll:(block?.033:.067)*w*s.side,
  headPitch:(block?.033:.105)*w,depth:(block?.016:.075)*w,
  dip:(block?.008:.045)*w,shieldBrace:(block?.19:.035)*w,
  weaponBrace:(block?.04:.105)*w,active:true};
}
export function resetPlayerHitReaction(user){
 if(user&&typeof user==='object')user.incomingCombatHit=null;
}
