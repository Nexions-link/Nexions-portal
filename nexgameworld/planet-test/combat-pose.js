// Visual-only combat pose envelopes; never schedules hits or changes PvE rules.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
export function combatPose({attack=-1,weaponKind='none',blockRemaining=0,recoil=0,walk=0}={}){
 const active=Number.isFinite(attack)&&attack>=0&&attack<=1;
 const t=active?attack:0;
 const anticipation=active?smooth(t/.32)*(1-smooth((t-.32)/.18)):0;
 const recovery=active?smooth((t-.48)/.13)*(1-smooth((t-.86)/.14)):0;
 const guard=clamp((Number.isFinite(blockRemaining)?blockRemaining:0)/.35,0,1);
 const impact=clamp(Number.isFinite(recoil)?recoil:0,0,1);
 const heavy=weaponKind==='axe'?1:weaponKind==='sword'?.78:weaponKind==='dagger'?.28:.6;
 return {active,anticipation,recovery,guard,impact,
  stance:clamp((active?.55:0)+guard*.35+impact*.48,0,1),
  brace:anticipation*.08*heavy+guard*.06,
  lunge:recovery*.045*heavy,
  mobility:1-clamp(Number.isFinite(walk)?walk:0,0,1)*.3};
}
