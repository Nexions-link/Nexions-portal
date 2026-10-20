// Small, weapon-specific follow-throughs layered on the native Tauren rig.
// All outputs are cosmetic joint/IK offsets. Server damage, hit timing,
// root motion, collision, equipment grips and the authored weapon model stay untouched.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const ease=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x)};
const phase=(prepare,drive,recover)=>({
 mainX:prepare[0],mainY:prepare[1],mainZ:prepare[2],
 elbow:drive[0],offhand:drive[1],yaw:drive[2],
 lean:recover[0],shift:recover[1],foot:recover[2]
});
// Distinct overhead heft, lateral slash and compact straight-line thrust.
// Small amplitudes sit *on top of* approved weaponSwingProfile/daggerThrustPose.
const profiles=Object.freeze({
 axe:phase([-.14,.015,.035],[-.085,-.095,.075],[.047,-.042,.080]),
 sword:phase([-.075,-.095,-.075],[-.055,-.050,.205],[.026,.022,.063]),
 dagger:phase([-.035,.015,.008],[.055,-.020,-.023],[.019,.012,.105]),
 none:phase([-.055,0,.015],[-.015,-.035,.035],[.021,0,.04])
});
export function weaponActionDetail({weaponKind='none',attack=-1,walk=0,guard=0,blocking=false}={}){
 const t=finite(attack,-1);
 const active=t>=0&&t<=1;
 const p=active?clamp(t,0,1):0;
 // All envelopes reach zero at start/end; no re-timing of melee impact (.425).
 const prepare=active?ease(.025,.27,p)*(1-ease(.33,.48,p)):0;
 const drive=active?ease(.31,.425,p)*(1-ease(.53,.70,p)):0;
 const recover=active?ease(.55,.70,p)*(1-ease(.84,1,p)):0;
 const moving=clamp(finite(walk),0,1);
 const ready=clamp(finite(guard),0,1);
 const stepScale=1-.55*moving;
 const config=profiles[weaponKind]||profiles.none;
 const holdLeft=blocking===true?.25:1;
 const effort=prepare*.7+drive+recover*.35;
 const shift=config.shift*(prepare-.42*drive)*stepScale;
 return {
  prepare,drive,recover,
  // Independent shoulder axes make axe/side-cut/stab silhouettes readable.
  mainShoulderX:config.mainX*prepare+
   (weaponKind==='axe'?.19:weaponKind==='dagger'?-.10:.11)*drive-.055*recover,
  mainShoulderY:config.mainY*prepare+config.yaw*.75*drive-config.yaw*.24*recover,
  mainShoulderZ:config.mainZ*prepare+(weaponKind==='sword'?-.145:.025)*drive+
   (weaponKind==='sword'?.045:0)*recover,
  mainElbowX:config.elbow*prepare+
   (weaponKind==='dagger'?.08:.115)*drive-.035*recover,
  offShoulderX:(config.offhand*prepare-.085*drive+.035*recover)*holdLeft,
  offShoulderY:(-.05*prepare+.065*drive)*holdLeft,
  offElbowX:(-.065*prepare+.045*drive)*holdLeft,
  torsoYaw:-config.yaw*.55*prepare+config.yaw*drive-.025*recover,
  torsoPitch:-config.lean*prepare+.045*drive-.018*recover,
  torsoRoll:shift*.35,
  shiftX:shift,
  headPitch:-.016*prepare+.013*drive,
  // Front hooves keep the support leg grounded; footwork is reduced in motion.
  leftFootZ:(.022*ready+.036*prepare-.015*drive)*stepScale,
  rightFootZ:(-.028*ready-config.foot*.55*prepare+config.foot*drive)*stepScale,
  leftFootLift:0,
  rightFootLift:(.012*prepare+.026*drive)*(1-.4*moving),
  // Lightweight shoulder counter-swing on steps, no independent game pose.
  gaitElbow:(.025*moving)*(1-.55*ready),
  tailYaw:shift*.40+effort*.012
 };
}
