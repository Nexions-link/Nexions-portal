// Original procedural wolf: shared articulated gait rig for creatures and mounts.
import {createWolfGaitState,advanceWolfGait} from './wolf-gait.js?v=1';
export function createForestWolfVisual(THREE,variant=0){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const mat=hex=>new THREE.MeshStandardMaterial({color:hex,roughness:1,flatShading:true});
 const fur=mat(variant%2?'#59574d':'#4b524e'),mane=mat('#383d35'),light=mat('#a69c86'),
  black=mat('#252723'),iris=mat('#b6a07e'),shade=mat('#697168'),inner=mat('#86756c'),teeth=mat('#d8cfb5');
 const sph=new THREE.IcosahedronGeometry(1,1);
 function part(parent,geo,color,x,y,z,sx=1,sy=1,sz=1){
  const o=new THREE.Mesh(geo,color);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
 }
 part(body,sph,fur,0,1.12,0,.59,.53,1.04);
 part(body,sph,mane,0,1.3,.42,.61,.66,.58);
 // Layered shoulders, haunches and throat suggest thick fur without textures.
 for(const side of [-1,1]){
  part(body,sph,fur,side*.39,1.05,-.63,.27,.42,.40);
  part(body,sph,mane,side*.40,1.30,.39,.24,.37,.36);
  for(let i=0;i<4;i++){
   const tuft=part(body,new THREE.ConeGeometry(.14-i*.014,.38,5),i%2?fur:mane,side*(.38+i*.035),1.12-i*.10,.62-i*.19);
   tuft.rotation.x=Math.PI*.55;tuft.rotation.z=side*.23;
  }
 }
 part(body,sph,shade,0,1.52,-.12,.35,.18,.65);
 const head=new THREE.Group();head.position.set(0,1.48,.79);body.add(head);
 part(head,sph,fur,0,0,.23,.45,.38,.50);
 part(head,sph,light,0,-.18,.65,.26,.20,.40);
 part(head,sph,black,0,-.17,.96,.15,.11,.16);
 part(head,sph,light,0,-.34,.58,.23,.12,.35);
 for(const side of [-1,1]){
  part(head,sph,mane,side*.32,-.08,.35,.20,.23,.36);
  part(head,sph,black,side*.38,.11,.56,.095,.075,.060);
  part(head,sph,teeth,side*.20,-.30,.81,.04,.09,.05);
 }
 // Separate jaw pivot: growling and biting do not affect the collision root.
 const jaw=new THREE.Group();jaw.position.set(0,-.22,.53);head.add(jaw);
 part(jaw,sph,light,0,-.11,.18,.245,.115,.31);
 for(const side of [-1,1]){
  const fang=part(jaw,new THREE.ConeGeometry(.038,.16,5),teeth,side*.18,-.035,.37);
  fang.rotation.x=Math.PI;
 }
 const strikeMotion={cueSeen:0,hitSeen:0,cueAt:-1,hitAt:-1};
 const gait=createWolfGaitState(variant);
 const ears=[];
 for(const s of [-1,1]){
  const ear=part(head,new THREE.ConeGeometry(.18,.55,6),mane,s*.29,.42,.12);
  ear.rotation.z=-s*.12;ears.push(ear);
  part(head,new THREE.ConeGeometry(.095,.32,5),inner,s*.29,.43,.205).rotation.z=-s*.12;
  part(head,sph,iris,s*.37,.10,.51,.062,.053,.055);
 }
 // Joint hierarchy places the foot under the wolf instead of swinging an
 // entire cylinder about its midpoint. Shared geometries keep allocations low.
 const legs=[],upperGeo=new THREE.CylinderGeometry(.15,.18,.49,7),
  lowerGeo=new THREE.CylinderGeometry(.12,.15,.43,7);
 for(const side of [-1,1])for(const z of [-1,1]){
  const hip=new THREE.Group();hip.position.set(side*.40,.94,z*.67);
  hip.name=(z>0?'fore':'hind')+(side<0?'Left':'Right')+'Hip';body.add(hip);
  part(hip,upperGeo,fur,0,-.245,0);
  const hock=new THREE.Group();hock.position.y=-.47;hip.add(hock);
  part(hock,lowerGeo,fur,0,-.215,0);
  const paw=new THREE.Group();paw.position.set(0,-.43,.09);hock.add(paw);
  part(paw,sph,mane,0,0,.12,.205,.12,.31);
  legs.push({hip,hock,paw});
 }
 const tailPivot=new THREE.Group();tailPivot.position.set(0,1.31,-1.12);body.add(tailPivot);
 const tail=part(tailPivot,new THREE.ConeGeometry(.25,1.06,7),fur,0,0,-.35);
 tail.rotation.x=-1.13;
 part(tailPivot,sph,mane,0,.13,-.74,.23,.23,.30);
 function animate(time,distance=0,attack=0,howl=0,hit=0,strike={},gaitOptions={}){
  // Server-confirmed telegraph starts the crouch; confirmed impact triggers the
  // visible bite. Only the mesh moves, never the authoritative position/hitbox.
  const cue=Number.isInteger(strike.cueSequence)?strike.cueSequence:0;
  const impact=Number.isInteger(strike.hitSequence)?strike.hitSequence:0;
  if(cue!==strikeMotion.cueSeen){
   strikeMotion.cueSeen=cue;strikeMotion.cueAt=time;strikeMotion.hitAt=-1;
  }
  if(impact!==strikeMotion.hitSeen){
   strikeMotion.hitSeen=impact;strikeMotion.hitAt=time;
  }
  const windupDuration=Math.max(.1,Math.min(1.2,strike.windupDuration||.4));
  const windup=attack>0&&strikeMotion.cueAt>=0?
   Math.min(1,Math.max(0,(time-strikeMotion.cueAt)/(windupDuration*.48))):0;
  const elapsed=strikeMotion.hitAt>=0?time-strikeMotion.hitAt:Infinity;
  const lunge=elapsed>=0&&elapsed<.22?
   (elapsed<.06?elapsed/.06:Math.max(0,1-(elapsed-.06)/.16)):0;
  const recovery=elapsed>=.18&&elapsed<.54?
   Math.max(0,1-(elapsed-.18)/.36):0;
  const combatPose=attack>0||lunge>0||recovery>0;
  const pose=advanceWolfGait(gait,time,distance,gaitOptions);
  const {dt,phase:stridePhase,moving}=pose,idle=1-moving;
  const sprint=pose.gallop,threat=attack>0;
  // Independent deterministic scent, vigilance and rest cycles. Reuse only
  // existing pivots, so there are no extra draw calls or authoritative moves.
  const cycle=((time*.105+variant*.37)%3+3)%3;
  // Wild pack members sniff the ground; a saddled, commanded wolf keeps its head up.
  const calm=idle*(combatPose||howl>0||gaitOptions?.mounted?0:1);
  const sniff=calm*Math.max(0,1-Math.abs(cycle-1)*3);
  const watch=calm*Math.max(0,1-Math.abs(cycle-2)*2);
  const rest=calm*Math.max(0,1-Math.abs(cycle)*2);
  // Four individual articulated joints with grounded recovery phases:
  // walk -> diagonal trot -> paired-suspension gallop. Combat offsets remain
  // separate so the server-confirmed bite cannot be lost inside the stride.
  body.scale.y=1+.014*Math.sin(time*1.9+variant)*idle*(combatPose?0:1);
  const legResponse=1-Math.exp(-dt*18);
  for(let i=0;i<legs.length;i++){
   const {hip,hock,paw}=legs[i],front=i%2===1,step=pose.legs[i];
   const strikeTilt=windup*(front?-.16:.14)+lunge*(front?.33:-.20);
   const targetHip=step.hip*(1-.8*windup)+strikeTilt;
   const targetHock=step.hock*(1-.75*windup);
   hip.rotation.x+=(targetHip-hip.rotation.x)*legResponse;
   hock.rotation.x+=(targetHock-hock.rotation.x)*legResponse;
   paw.rotation.x+=(step.ankle-paw.rotation.x)*legResponse;
  }
  // Visible warning: neck/head tilt upward, ears flare, howl before attack.
  const voice=Math.min(1,Math.max(0,howl));
  head.rotation.x=voice?-.62*voice:combatPose?
   (-.20+.18*windup-.37*lunge+.10*recovery):
   .07*Math.sin(time*.8+variant)+.27*sniff-.10*watch+.085*rest;
  head.position.y=1.48+.16*voice-.10*windup+.045*lunge-.17*sniff-.07*rest;
  jaw.rotation.x=.05+.40*windup+.62*lunge+.13*recovery+.035*sniff*Math.sin(time*8);
  jaw.visible=true;
  head.rotation.z=hit>0?.085*Math.sin(time*19+variant):0;
  head.rotation.y=combatPose?0:Math.sin(time*.67+variant*.9)*(.11+.25*watch)*idle;
  for(let i=0;i<ears.length;i++){
   const side=i===0?-1:1;
   ears[i].rotation.z=-side*.12+Math.sin(time*2.1+variant+i*1.7)*.035*idle
    +side*(.24*windup+.38*lunge);
  }
  body.position.y=pose.bounce+.08*voice-.075*windup+.045*lunge;
  body.position.z=-.085*windup+.30*lunge-.05*recovery;
  body.rotation.x=pose.pitch+.13*windup-.21*lunge+.055*recovery;
  body.rotation.z=pose.roll;
  tailPivot.rotation.z=Math.sin(time*(threat?1.9:1.3)+variant)*(threat?.06:.10+.11*watch)+.025*sniff;
  tailPivot.rotation.x=.08*Math.sin(time*1.1+variant)-.13*rest+.10*watch;
  return pose;
 }
 function resetAttack(){
  strikeMotion.cueSeen=0;strikeMotion.hitSeen=0;
  strikeMotion.cueAt=-1;strikeMotion.hitAt=-1;
  body.position.z=0;body.rotation.x=0;jaw.rotation.x=.05;
  gait.lastTime=null;gait.phase=variant*.37;gait.blend=0;gait.velocity=0;
  body.rotation.z=0;body.position.y=0;body.scale.y=1;
  for(const leg of legs){leg.hip.rotation.x=0;leg.hock.rotation.x=0;leg.paw.rotation.x=0;}
 }
 return {root,body,legs,animate,resetAttack};
}
