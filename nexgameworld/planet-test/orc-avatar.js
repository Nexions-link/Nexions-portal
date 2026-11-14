// Original sculpted orc, built on the established articulated player rig.
// Geometry and painted maps are shared; materials and animation state are not.
import {createOrcMaterials} from './orc-materials.js?v=64607';
import {createOrcHead} from './orc-head.js?v=64607';
import {orcProfile,orcCurve,orcPlate,orcRibbon,batchOrcJoint} from './orc-geometry.js?v=64607';
export function createOrc(THREE,scene){
 const root=new THREE.Group();root.name='orc-root';scene.add(root);
 const joints=[];
 const joint=(parent,name,x=0,y=0,z=0)=>{
  const g=new THREE.Group();g.name=name;g.position.set(x,y,z);
  g.userData.orcJoint=true;parent.add(g);joints.push(g);return g;
 };
 const M=createOrcMaterials(THREE);
 for(const [name,material] of Object.entries(M))material.name='orc-'+name;
 const mesh=(parent,name,geometry,material,x=0,y=0,z=0)=>{
  const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);
  m.castShadow=m.receiveShadow=true;parent.add(m);return m;
 };
 const form=(parent,name,rings,material,options={})=>mesh(parent,name,orcProfile(THREE,name,rings,options),material);
 const curve=(parent,name,points,radii,material,options={})=>mesh(parent,name,orcCurve(THREE,name,points,radii,options),material);
 const plate=(parent,name,outline,material,x,y,z,depth=.035)=>mesh(parent,name,orcPlate(THREE,name,outline,depth),material,x,y,z);
 const body=joint(root,'orc-body',0,1.4),chest=joint(body,'orc-chest'),
  neck=joint(chest,'orc-neck',0,1.02,.25),head=joint(neck,'orc-head'),tail=joint(body,'orc-tail'),braids=[];
 // One continuous back, ribcage, pectoral plane and abdomen replaces the
 // intersecting chest/abdominal balls. The waist tapers below broad trapezii.
 form(chest,'torso',[
  [-.27,.51,.30,-.015],[-.08,.55,.33,0],[.20,.62,.36,-.015],
  [.43,.77,.40,-.025],[.67,.94,.425,-.045],[.87,.98,.40,-.075],
  [1.03,.86,.35,-.12],[1.19,.57,.29,-.18],[1.25,.34,.23,-.14]
 ],M.skin,{segments:32,power:.82,sculpt:(x,y,z)=>{
  if(z>0){
   const chestPlane=Math.exp(-(((Math.abs(x)-.40)/.34)**2+((y-.68)/.24)**2));
   const sternum=Math.exp(-((x/.065)**2+((y-.65)/.30)**2));
   const abdomen=Math.exp(-((x/.30)**2+((y-.20)/.34)**2));
   z+=.13*chestPlane-.03*sternum+.035*abdomen;
  }else{
   const shoulderBlade=Math.exp(-(((Math.abs(x)-.41)/.30)**2+((y-.73)/.33)**2));
   const spine=Math.exp(-((x/.075)**2+((y-.59)/.53)**2));
   z-=.055*shoulderBlade-.033*spine;
  }
  return [x,y,z];
 },shade:(x,y,z)=>{
  const facing=Math.max(0,Math.min(1,z/.35));
  const underChest=Math.exp(-(((y-.49)/.065)**2+((Math.abs(x)-.40)/.34)**2));
  const sternum=Math.exp(-((x/.06)**2+((y-.69)/.25)**2));
  const oblique=Math.exp(-(((Math.abs(x)-.49)/.08)**2+((y-.20)/.24)**2));
  const rear=Math.max(0,Math.min(1,-z/.35));
  const spine=Math.exp(-((x/.075)**2+((y-.61)/.46)**2));
  return 1-facing*(.16*underChest+.10*sternum+.065*oblique)-rear*.10*spine;
 }});
 // A low, broad neck grows from the trapezius rather than a ball on a stalk.
 form(neck,'neck-column',[[-.13,.36,.27,-.11],[.06,.35,.29,-.10],[.25,.30,.27,-.055]],M.skin,{power:.8});
 const sculpture=createOrcHead(THREE,M);
 sculpture.scale.setScalar(.88);sculpture.position.y=.07;head.add(sculpture);
 // Layered hide trousers, a metal-bound belt and a weighted red front cloth.
 form(body,'hip-hide',[[-.45,.51,.32,0],[-.23,.63,.37,.01],[-.06,.63,.36,0],[.02,.55,.32,0]],M.leatherDark,{power:.72});
 form(body,'girdle',[[-.15,.65,.39,.015],[-.12,.68,.41,.015],[.02,.66,.39,.015],[.045,.62,.36,.015]],M.leather,{power:.65});
 form(body,'girdle-upper-edge',[[.01,.675,.405,.015],[.055,.64,.38,.015]],M.metalDark,{power:.65});
 form(body,'girdle-lower-edge',[[-.17,.66,.40,.015],[-.135,.68,.41,.015]],M.trim,{power:.65});
 plate(body,'belt-buckle',[[-.16,-.10],[-.18,.07],[0,.15],[.18,.07],[.16,-.10],[0,-.15]],M.metal,0,-.055,.425,.065);
 plate(body,'buckle-inlay',[[-.055,-.065],[-.055,.055],[0,.095],[.055,.055],[.055,-.065],[0,-.095]],M.trim,0,-.055,.51,.015);
 form(body,'front-cloth',[[-.87,.21,.022,.33],[-.68,.27,.035,.39],[-.38,.29,.045,.43],[-.14,.29,.045,.425]],M.cloth,{segments:16,power:.5});
 for(const s of [-1,1]){
  mesh(chest,'harness-'+s,orcRibbon(THREE,'harness-'+s,
   [[s*.56,1.04,.26],[s*.50,.82,.445],[s*.35,.50,.485],[s*.18,.18,.425],[s*.12,-.07,.417]],.17,.035),M.leather);
  plate(chest,'chest-clasp-'+s,[[-.09,-.09],[-.09,.09],[.09,.09],[.09,-.09]],M.metalDark,s*.33,.47,.48,.025).rotation.z=-s*.28;
  curve(body,'side-cloth-trim-'+s,[[s*.24,-.20,.47],[s*.26,-.48,.43],[s*.19,-.83,.36]],[.017,.017,.014],M.trim,{sides:5});
 }
 const arms=[],legs=[];
 for(const s of [-1,1]){
  const shoulder=joint(chest,'orc-shoulder-'+s,s*.86,.96,0),
   elbow=joint(shoulder,'orc-elbow-'+s,s*.13,-.69,.015),
   hand=joint(elbow,'orc-hand-'+s,s*.025,-.69,.035);
  form(shoulder,'upper-arm-'+s,[[.14,.28,.27,-.025,s*.025],[.01,.38,.34,-.005,s*.045],[-.22,.37,.33,.01,s*.07],[-.45,.29,.275,.03,s*.10],[-.68,.22,.215,.015,s*.13],[-.76,.15,.15,.015,s*.13]],M.skin,{power:.85});
  form(elbow,'forearm-'+s,[[.19,.045,.045,0],[.13,.17,.16,0],[.05,.235,.22,0],[-.08,.275,.255,.015],[-.28,.27,.245,.02],[-.47,.22,.205,.025],[-.69,.17,.16,.035,s*.025]],M.skin,{power:.8});
  // A single broad palm and curled tapered digits; wrist and grip stay exact.
  form(hand,'palm-'+s,[[-.29,.20,.15,.055],[-.21,.25,.19,.035],[-.07,.25,.21,.015],[.08,.18,.16,0],[.15,.105,.10,.015],[.18,.025,.025,.015]],M.skin,{segments:20,power:.68});
  for(let i=0;i<4;i++){
   const x=(i-1.5)*.105;
   curve(hand,'finger-'+s+'-'+i,[[x,-.17,.13],[x,-.28,.19],[x,-.35,.13],[x,-.32,.045]],[.067,.072,.059,.025],M.skin,{sides:8});
   plate(hand,'nail-'+s+'-'+i,[[-.033,-.032],[-.034,.025],[.025,.035],[.033,-.025]],M.ivory,x,-.32,.18,.008);
  }
  curve(hand,'thumb-'+s,[[-s*.21,-.04,.12],[-s*.29,-.13,.19],[-s*.25,-.24,.17]],[.095,.105,.065],M.skin,{sides:10});
  arms.push({shoulder,elbow,hand});
  // Asymmetrical forged shoulder shells with bone spikes and visible trim.
  const heavy=s<0;
  form(shoulder,'pauldron-'+s,[[-.14,.33,.29,-.02,s*.045],[-.02,.48,.405,-.025,s*.06],[.17,.43,.37,-.06,s*.07],[.29,.25,.26,-.08,s*.06]],heavy?M.metal:M.leatherDark,{segments:16,power:.62});
  form(shoulder,'pauldron-rim-'+s,[[-.14,.35,.31,-.02,s*.045],[-.09,.43,.37,-.025,s*.05]],M.trim,{segments:16,power:.62});
  for(let i=0;i<(heavy?3:2);i++){
   const z=-.24+i*.22,x=s*(.11+i*.055);
   curve(shoulder,'shoulder-spike-'+s+'-'+i,[[x,.20,z],[x+s*.10,.38,z-.025],[x+s*.16,.56-i*.035,z-.065]],
    [.095,.065,.002],M.ivory,{sides:8});
  }
  form(elbow,'bracer-'+s,[[-.62,.20,.19,.035],[-.56,.245,.23,.035],[-.32,.285,.27,.02],[-.26,.265,.25,.02]],M.leatherDark,{segments:16,power:.66});
  for(const y of [-.58,-.32])form(elbow,'bracer-band-'+s+'-'+y,[[y-.025,.25,.24,.025],[y+.025,.255,.245,.025]],M.metalDark,{segments:16,power:.68});
  plate(elbow,'bracer-face-'+s,[[-.13,-.16],[-.17,.12],[0,.20],[.17,.12],[.13,-.16],[0,-.21]],M.metal,0,-.44,.26,.04);
  const hip=joint(root,'orc-hip-'+s,s*.38,1.4),knee=joint(hip,'orc-knee-'+s,0,-.72),foot=joint(knee,'orc-foot-'+s,0,-.68);
  form(hip,'thigh-'+s,[[.02,.27,.29,0],[-.13,.33,.33,.01],[-.35,.32,.31,.025],[-.57,.265,.25,.025],[-.72,.225,.22,0]],M.leather,{power:.75});
  form(knee,'shin-'+s,[[.06,.24,.23,0],[-.12,.255,.255,.01],[-.36,.225,.23,.02],[-.59,.19,.18,.015],[-.68,.18,.17,.015]],M.leatherDark,{power:.72});
  form(knee,'knee-hide-fold-'+s,[[-.17,.19,.18,0],[-.08,.26,.235,0],[.025,.28,.25,0],[.13,.235,.22,0],[.18,.13,.13,0]],M.leather,{segments:20,power:.8});
  plate(knee,'knee-guard-'+s,[[-.20,-.14],[-.23,.09],[0,.24],[.23,.09],[.20,-.14],[0,-.23]],M.metal,0,-.045,.235,.055);
  plate(knee,'shin-front-'+s,[[-.14,-.24],[-.18,.14],[0,.22],[.18,.14],[.14,-.24],[0,-.31]],M.metalDark,0,-.36,.22,.035);
  for(const y of [-.24,-.54])form(knee,'boot-band-'+s+'-'+y,[[y-.025,.24,.235,.025],[y+.025,.245,.24,.025]],M.leather,{segments:16,power:.65});
  form(foot,'boot-'+s,[[-.17,.29,.41,.17],[-.10,.31,.43,.18],[.02,.30,.40,.17],[.15,.235,.245,.04],[.24,.19,.18,.015]],M.leatherDark,{segments:20,power:.54});
  form(foot,'boot-sole-'+s,[[-.21,.305,.425,.175],[-.155,.315,.44,.175]],M.black,{segments:20,power:.5});
  plate(foot,'toe-cap-'+s,[[-.23,-.05],[-.24,.04],[0,.13],[.24,.04],[.23,-.05]],M.metalDark,0,-.035,.58,.035);
  legs.push({hip,knee,foot,sign:s});
 }
 // Merge only rigid surfaces inside each joint. This keeps the new sculpture
 // cheaper to draw than the old collection of separate green spheres.
 for(const g of joints)batchOrcJoint(THREE,g);
 root.userData.raceId='orc';root.userData.characterModel='ngw-orc-sculpt-v1';
 root.userData.surfaceRevision='sculpted-painted-orc-1';
 return {root,body,chest,neck,head,tail,braids,arms,legs,visualDetails:null,anatomy:null};
}
export function equipBowVisual(THREE,actor){
 if(actor.root.userData.hunterBow)return actor.root.userData.hunterBow;
 const bow=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:0x84532c,roughness:.65}),metal=new THREE.MeshStandardMaterial({color:0xc4ad6c,metalness:.45,roughness:.4});
 // The recurved tips leave room for the holding hand's opposed thumb.
 const points=[[-.15,-.86,0],[.22,-.55,0],[.30,0,0],[.22,.55,0],[-.15,.86,0]].map(p=>new THREE.Vector3(...p));
 const limb=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.045,7,false),wood);bow.add(limb);
 const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([points[0],points[4]]),new THREE.LineBasicMaterial({color:0xe5d7b7}));string.name='bow-string';bow.add(string);
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.24,10),metal);grip.name='bow-grip';grip.position.x=.30;bow.add(grip);
 // Face the string toward the other (drawing) hand, while keeping the
 // handle centered in the shared palm position (0,-.10,.015).
 bow.rotation.set(Math.PI/2,0,Math.PI);
 bow.position.set(.30,-.10,.015);bow.visible=false;
 actor.arms[0].hand.add(bow);actor.root.userData.hunterBow=bow;
 return bow;
}
export function equipHunterVisual(THREE,actor){
 actor.root.userData.classId='hunter';
 equipBowVisual(THREE,actor);
 if(actor.root.userData.hunterQuiver)return;
 const wood=new THREE.MeshStandardMaterial({color:0x84532c,roughness:.65}),metal=new THREE.MeshStandardMaterial({color:0xc4ad6c,metalness:.45,roughness:.4});
 const quiver=new THREE.Mesh(new THREE.CylinderGeometry(.18,.14,.83,12),wood);quiver.position.set(.48,.55,-.48);quiver.rotation.z=-.3;actor.chest.add(quiver);
 actor.root.userData.hunterQuiver=quiver;
 for(let i=0;i<4;i++){const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.60,5),metal);shaft.position.set(.38+i*.07,1.07,-.49);shaft.rotation.z=-.3;actor.chest.add(shaft);}
}
