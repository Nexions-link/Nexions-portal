// Visual-only two-tier GLB wolves. Authoritative server coordinates and combat never depend on LOD.
export const FOREST_WOLF_GLB=Object.freeze({
 near:'../bestiary/models/forest-wolf-v1.glb?v=1',
 far:'../bestiary/models/forest-wolf-far-v1.glb?v=1'
});
export const FOREST_WOLF_SWITCH=Object.freeze({farAt:36,nearAt:28});
export const FOREST_WOLF_REQUIRED_CLIPS=Object.freeze(['Idle','Walk','Run','Attack','Hurt','Death']);
export function selectForestWolfLOD(metres,previous='near',urgent=false){
 if(urgent||!Number.isFinite(metres))return 'near';
 return previous==='far'
  ?(metres<=FOREST_WOLF_SWITCH.nearAt?'near':'far')
  :(metres>=FOREST_WOLF_SWITCH.farAt?'far':'near');
}
export function validateForestWolfAssets(near,far){
 const clips=new Set(near?.animations?.map(c=>c.name)||[]);
 return !!near?.scene&&!!far?.scene&&
  FOREST_WOLF_REQUIRED_CLIPS.every(c=>clips.has(c))&&
  !!near.scene.getObjectByName('Head')&&!!near.scene.getObjectByName('FL_Upper');
}
// GLTFLoader caches a single copy of both assets. Cloned scene nodes have separate
// animation state, while geometry, materials and textures are reused across the pack.
export function createForestWolfGltf(THREE,nearAsset,farAsset){
 if(!validateForestWolfAssets(nearAsset,farAsset))throw Error('Invalid wolf GLB assets');
 const container=new THREE.Group();container.name='forest-wolf-glb-v1';
 const near=nearAsset.scene.clone(true),far=farAsset.scene.clone(true);
 near.name='wolf-detailed';far.name='wolf-far';
 container.add(near,far);far.visible=false;
 near.traverse(n=>{
  if(n.isMesh){n.castShadow=true;n.receiveShadow=false;n.frustumCulled=true;}
 });
 far.traverse(n=>{
  if(n.isMesh){n.castShadow=false;n.receiveShadow=false;n.frustumCulled=true;}
 });
 const mixer=new THREE.AnimationMixer(near);
 const actions=Object.fromEntries(nearAsset.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 for(const name of ['Attack','Hurt','Death']){
  actions[name]?.setLoop(THREE.LoopOnce,1);
  if(actions[name])actions[name].clampWhenFinished=true;
 }
 const head=near.getObjectByName('Head');
 let lod='near',mode=null;
 function forceNear(){
  lod='near';near.visible=true;far.visible=false;
 }
 function setLOD(metres,urgent=false){
  const next=selectForestWolfLOD(metres,lod,urgent);
  if(next!==lod){
   lod=next;near.visible=lod==='near';far.visible=lod==='far';
  }
  return lod;
 }
 function play(next){
  if(mode===next)return;
  const previous=mode?actions[mode]:null;
  const action=actions[next];
  if(!action)return;
  if(previous&&previous!==action)previous.fadeOut(.14);
  action.reset().fadeIn(.14).play();
  mode=next;
 }
 function update(dt,moved,{distance=0,windup=0,hit=0,howl=0,aggro=false,targeted=false}={}){
  // Prefer the complete rig during combat, warning howls, targeting and close viewing.
  const urgent=windup>0||hit>0||howl>0||targeted||distance<12;
  if(setLOD(distance,urgent)==='far')return;
  const speed=Math.max(0,moved)/Math.max(dt,.001);
  const traveling=moved>.008&&speed>.08;
  const next=hit>0?'Hurt':windup>0?'Attack':
   traveling?(aggro||speed>2.6?'Run':'Walk'):'Idle';
  play(next);
  const walking=next==='Walk'||next==='Run';
  if(walking)actions[next].setEffectiveTimeScale(Math.min(2,Math.max(.65,speed/(next==='Run'?3.4:1.8))));
  mixer.update(Math.max(0,Math.min(dt,.12)));
  // Reapply the howl to the animated neck without changing origin or hitbox.
  if(howl>0&&head)head.rotation.x-=Math.min(.52,howl*.5);
 }
 function reset(){
  mixer.stopAllAction();mixer.timeScale=1;mode=null;forceNear();
 }
 return {container,near,far,mixer,actions,update,reset,forceNear,setLOD,
  get lod(){return lod;},get mode(){return mode;}};
}
