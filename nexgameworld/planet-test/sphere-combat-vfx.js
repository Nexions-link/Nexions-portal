// NexGameWorld's lightweight radial impact glints. Cosmetic only:
// no physics, raycasts, target changes, extra damage, or WebGL post-processing.
export function createSphericalCombatVfx({THREE,parent}){
 const UP=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 const geometry=new THREE.ConeGeometry(.068,.27,4);
 const palette={hit:0xffdc83,strong:0xff9c66,stomp:0xc5d9f2,block:0xb5f4f4};
 const effects=Array.from({length:6},()=>{
  const group=new THREE.Group();group.visible=false;group.name='nexgameworld-impact-sparks';parent.add(group);
  const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,
   depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const sparks=Array.from({length:5},(_,i)=>{
   const mesh=new THREE.Mesh(geometry,material);
   mesh.raycast=()=>{};mesh.castShadow=false;
   mesh.rotation.set(.18*i,.5*i,.9*i);group.add(mesh);
   return mesh;
  });
  return {group,material,sparks,age:1,life:.3,kind:'hit'};
 });
 let cursor=0,density=.68;
 function setQuality(value){
  density=Math.max(0,Math.min(1,Number(value)||0));
  if(density<.3)for(const effect of effects)effect.group.visible=false;
 }
 function trigger(entity,kind='hit'){
  if(density<.3||!entity?.root?.position)return false;
  const p=entity.root.position;
  if(p.lengthSq()<1)return false;
  const effect=effects[cursor];cursor=(cursor+1)%effects.length;
  effect.kind=Object.hasOwn(palette,kind)?kind:'hit';
  effect.age=0;effect.life=effect.kind==='block'?.33:.27;
  normal.copy(p).normalize();
  effect.group.position.copy(p).addScaledVector(normal,
   effect.kind==='block'?1.7:entity.trainingDummy?2:1.62);
  effect.group.quaternion.setFromUnitVectors(UP,normal);
  effect.material.color.setHex(palette[effect.kind]);
  effect.material.opacity=.9;
  effect.group.visible=true;
  return true;
 }
 function update(dt){
  for(const fx of effects){
   if(!fx.group.visible)continue;
   fx.age+=Math.max(0,Math.min(.1,Number(dt)||0));
   if(fx.age>=fx.life||density<.3){fx.group.visible=false;continue;}
   const t=fx.age/fx.life,amount=density<.85?3:5;
   fx.material.opacity=.8*(1-t)*(1-t);
   for(let i=0;i<fx.sparks.length;i++){
    const spark=fx.sparks[i];spark.visible=i<amount;
    const a=i*Math.PI*2/5+.3;
    const expand=.1+.65*t;
    spark.position.set(Math.cos(a)*expand,.035+Math.sin(t*Math.PI)*.19,Math.sin(a)*expand);
    spark.scale.setScalar(.85*(1-.78*t));
    spark.rotation.y+=.018;
   }
  }
 }
 function clear(){for(const fx of effects)fx.group.visible=false;}
 return {trigger,update,clear,setQuality,activeCount:()=>effects.filter(x=>x.group.visible).length};
}
