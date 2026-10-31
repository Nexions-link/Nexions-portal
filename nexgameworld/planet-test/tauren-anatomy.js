// NexGameWorld player anatomy v2. Original fantasy character, not a WoW asset.
// Purely visual, attached to existing animation joints. No mesh is a hitbox,
// interactable, target surface or equipment anchor. Small instanced batches keep
// the iPhone draw-call cost independent of the number of decorative features.
export function createTaurenAnatomy(THREE,actor,{fur=0x836144,remote=false}={}){
 const {root,head,chest,body,arms,legs,tail}=actor;
 if(!root||!head||!chest||!body||!tail||arms?.length!==2||legs?.length!==2)
  throw Error('NexGameWorld anatomy v2 requires the original animated joint hierarchy');
 const noop=()=>{},parts=[],meshes=[],dummy=new THREE.Object3D();
 const base=new THREE.Color(fur);
 // Reuse the living character's existing fur and muzzle textures so the
 // new anatomical volumes share its hand-painted hide rather than appearing
 // as untextured plastic patches against the original skinned rig.
 const skin=chest.children.find(o=>o.isMesh&&o.material?.map)?.material||
  make(base.clone().multiplyScalar(1.05));
 const shade=make(base.clone().multiplyScalar(.82),{map:skin.map||null});
 const muzzle=head.children.find(o=>o.isMesh&&o.material?.color?.getHex()===0xc5a47b)?.material||
  make(0xc3a27d);
 const lip=make(0x705143);
 const nose=make(0x33241e);
 const bone=make(0xe8d5ad);
 const keratin=make(0x4b382a);
 const furAccent=make(0x51372a,{map:skin.map||null});
 const copper=make(0x9e7447,{metalness:.12,roughness:.67});
 // Shared within one actor and cloned by the existing preview where needed.
 const sphere=new THREE.SphereGeometry(1,16,12);
 const fineSphere=new THREE.SphereGeometry(1,12,9);
 const cone=new THREE.ConeGeometry(1,1,9,1);
 function make(color,settings={}){
  return new THREE.MeshStandardMaterial({color,roughness:.96,metalness:0,...settings});
 }
 const row=(position,scale,angleZ=0)=>({position,scale,angleZ});
 function add(parent,name,geometry,material,rows,quality='base'){
  const item=new THREE.InstancedMesh(geometry,material,rows.length);
  item.name='ngw-anatomy-v2-'+name;
  item.frustumCulled=false;item.castShadow=false;item.receiveShadow=false;
  item.raycast=noop;
  item.userData.cosmeticOnly=true;
  for(let i=0;i<rows.length;i++){
   const r=rows[i];
   dummy.position.set(...r.position);
   dummy.rotation.set(r.angleX||0,r.angleY||0,r.angleZ||0);
   dummy.scale.set(...r.scale);
   dummy.updateMatrix();
   item.setMatrixAt(i,dummy.matrix);
  }
  item.instanceMatrix.needsUpdate=true;
  parent.add(item);parts.push({item,quality});meshes.push(item);
  return item;
 }
 // The previous sculpt placed both brow contour ellipsoids DIRECTLY IN FRONT
 // of the iris (z≈.55 versus pupil z≈.47), hiding both eyes. Keep all new brow
 // mass above the eye line; do not shift the rig, horns or equipment anchors.
 add(head,'cranial-contours',sphere,skin,[
  row([0,.34,.24],[.38,.24,.22]),
  row([-.38,-.17,.34],[.185,.27,.24],-.12),
  row([.38,-.17,.34],[.185,.27,.24],.12),
  row([-.27,.315,.32],[.175,.075,.10],.13),
  row([.27,.315,.32],[.175,.075,.10],-.13)
 ]);
 add(head,'long-muzzle',sphere,muzzle,[
  row([0,-.50,.55],[.355,.18,.33]),
  row([0,-.205,.745],[.36,.22,.275]),
  row([-.255,-.305,.75],[.18,.13,.21]),
  row([.255,-.305,.75],[.18,.13,.21])
 ]);
 // Facial finishing is confined below the eye line. Shape transitions sit
 // on animated head geometry, with no new occluders around the pupils.
 // The shallow nasal bridge joins forehead and muzzle without a round "ball".
 add(head,'nasal-bridge',sphere,skin,[
  row([0,-.112,.49],[.145,.20,.135]),
  row([0,-.27,.57],[.22,.13,.115])
 ],'enhanced');
 // Raised cheek pads and slight taper under the jaw clarify the silhouette
 // from side and three-quarter views while keeping eye sockets unobstructed.
 add(head,'cheek-and-jowl',fineSphere,skin,[
  row([-.455,-.30,.355],[.145,.21,.17],-.17),
  row([.455,-.30,.355],[.145,.21,.17],.17),
  row([-.27,-.525,.38],[.17,.12,.18],-.14),
  row([.27,-.525,.38],[.17,.12,.18],.14)
 ],'enhanced');
 add(head,'cheek-fur-ridges',cone,furAccent,[
  row([-.515,-.34,.29],[.074,.23,.078],.24),
  row([.515,-.34,.29],[.074,.23,.078],-.24),
  row([-.455,-.48,.24],[.062,.16,.065],.36),
  row([.455,-.48,.24],[.062,.16,.065],-.36)
 ],'high');
 // Subtle leather-toned folds follow the upper snout and mouth corners;
 // they sit below the eyes, never in front of the iris or highlights.
 add(head,'muzzle-folds',fineSphere,lip,[
  row([-.36,-.267,.85],[.036,.083,.037],-.12),
  row([.36,-.267,.85],[.036,.083,.037],.12),
  row([-.282,-.452,.79],[.055,.027,.036],-.14),
  row([.282,-.452,.79],[.055,.027,.036],.14)
 ],'high');
 add(head,'nostril-rims',fineSphere,lip,[
  row([-.238,-.125,1.090],[.116,.071,.026],-.2),
  row([.238,-.125,1.090],[.116,.071,.026],.2)
 ]);
 add(head,'nostril-cavities',fineSphere,nose,[
  row([-.238,-.119,1.117],[.061,.029,.012],-.12),
  row([.238,-.119,1.117],[.061,.029,.012],.12)
 ]);
 add(head,'lower-lip',fineSphere,lip,[
  row([0,-.453,.852],[.285,.025,.12]),
  row([0,-.511,.791],[.25,.048,.10])
 ],'enhanced');
 // Short lower tusks do not borrow WoW identifiers or obstruct hand equipment.
 add(head,'short-tusks',cone,bone,[
  row([-.335,-.41,.924],[.065,.228,.067],-.23),
  row([.335,-.41,.924],[.065,.228,.067],.23)
 ],'enhanced');
 add(head,'ear-inner-folds',fineSphere,muzzle,[
  row([-.72,.29,.026],[.28,.068,.062],.15),
  row([.72,.29,.026],[.28,.068,.062],-.15)
 ],'enhanced');
 // Shoulder/back muscle flow follows the animated chest, not the root.
 add(chest,'shoulder-yoke',sphere,skin,[
  row([-.75,.74,.16],[.34,.32,.305],-.15),
  row([.75,.74,.16],[.34,.32,.305],.15),
  row([0,1.06,-.19],[.60,.37,.36])
 ]);
 add(chest,'sternum-and-pectoral',sphere,shade,[
  row([-.37,.58,.445],[.38,.27,.154],-.05),
  row([.37,.58,.445],[.38,.27,.154],.05)
 ],'enhanced');
 // Engraved leather/bone accents stay on torso, not on animated hand joints.
 add(chest,'tribal-neck-runes',fineSphere,furAccent,[
  row([-.54,1.12,.28],[.06,.1,.036],-.33),
  row([.54,1.12,.28],[.06,.1,.036],.33),
  row([-.47,1.22,.23],[.038,.073,.024]),
  row([.47,1.22,.23],[.038,.073,.024])
 ],'high');
 add(body,'waist-join',fineSphere,copper,[
  row([-.43,-.05,.51],[.09,.09,.052]),
  row([.43,-.05,.51],[.09,.09,.052])
 ],'enhanced');
 // A single anatomy batch for each articulated limb means it bends exactly
 // where the existing Tauren animation/IK expects it to bend.
 for(let i=0;i<2;i++){
  const sign=i===0?-1:1,arm=arms[i],leg=legs[i];
  add(arm.shoulder,'deltoid-'+i,sphere,skin,[
   row([sign*.09,-.20,.005],[.38,.35,.35]),
   row([sign*.09,-.46,.13],[.235,.24,.20])
  ]);
  add(arm.elbow,'forearm-'+i,sphere,skin,[
   row([sign*.015,-.34,.085],[.255,.29,.235])
  ]);
  add(leg.hip,'thigh-'+i,sphere,skin,[
   row([0,-.29,.055],[.295,.30,.265])
  ]);
  add(leg.knee,'calf-'+i,sphere,skin,[
   row([0,-.34,.025],[.237,.275,.235])
  ]);
  add(leg.foot,'hoof-keratin-'+i,fineSphere,keratin,[
   row([-.126,-.15,.29],[.098,.065,.084]),
   row([.126,-.15,.29],[.098,.065,.084])
  ],'enhanced');
  add(arm.hand,'knuckles-'+i,fineSphere,shade,[
   row([-.15,-.24,.134],[.075,.079,.059]),
   row([0,-.24,.134],[.075,.079,.059]),
   row([.15,-.24,.134],[.075,.079,.059])
  ],'high');
 }
 add(tail,'tail-tuft-creases',cone,furAccent,[
  row([-.085,-1.09,-.46],[.085,.25,.077],.14),
  row([.085,-1.09,-.46],[.085,.25,.077],-.14)
 ],'enhanced');
 let quality=remote?0.35:0.68;
 function setQuality(value){
  quality=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
  for(const part of parts){
   part.item.visible=!(remote&&quality<.1)&&(part.quality==='base'||
    (part.quality==='enhanced'&&quality>=.36)||
    (part.quality==='high'&&quality>=.78));
  }
 }
 setQuality(quality);
 root.userData.characterModel='ngw-tauren-anatomy-v2';
 // Retain a direct handle only for optional quality scaling. Geometry remains
 // part of the original rig and is included in character-sheet previews.
 return {setQuality,meshes,revision:2,get quality(){return quality},
  get triangles(){return parts.reduce((sum,p)=>sum+(p.item.visible?p.item.count*(p.item.geometry.index?.count||0)/3:0),0)},
  get visibleBatches(){return parts.filter(p=>p.item.visible).length}};
}
