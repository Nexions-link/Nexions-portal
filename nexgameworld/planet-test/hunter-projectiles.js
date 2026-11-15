import {createHunterArrow,HUNTER_ARROW_NOCK_Z,HUNTER_ARROW_TIP_Z,HUNTER_ARROW_LENGTH} from './hunter-arrow.js?v=64608';

// Cosmetic flights only. Damage, hit timing and ownership remain server owned.
export const HUNTER_PROJECTILE_CAPACITY=16;
const finiteVector=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&Number.isFinite(value.z);
export function createHunterProjectiles(THREE,scene){
 const pool=Array.from({length:HUNTER_PROJECTILE_CAPACITY},()=>{
  const mesh=createHunterArrow(THREE);mesh.visible=false;scene.add(mesh);
  return {mesh,material:mesh.children[0].material,from:new THREE.Vector3(),to:new THREE.Vector3(),age:0,duration:.22};
 });
 const forward=new THREE.Vector3(0,0,1),start=new THREE.Vector3(),end=new THREE.Vector3(),direction=new THREE.Vector3();
 let cursor=0,disposed=false;
 function fire(from,to,id,options={}){
  if(disposed||!finiteVector(from)||!finiteVector(to)||!options||typeof options!=='object')return false;
  for(const key of ['exactOrigin','exactTarget','originAtNock'])
   if(options[key]!==undefined&&typeof options[key]!=='boolean')return false;
  const duration=options.flightTime===undefined?.22:options.flightTime;
  if(!Number.isFinite(duration)||duration<=0)return false;
  start.copy(from);end.copy(to);
  // Legacy callers pass ground positions on the sphere. Bow-muzzle callers
  // already supply a world point and must not receive another radial lift.
  if(!options.exactOrigin)start.addScaledVector(direction.copy(from).normalize(),1.7);
  if(!options.exactTarget)end.addScaledVector(direction.copy(to).normalize(),1.4);
  direction.copy(end).sub(start);
  const distanceSquared=direction.lengthSq();
  if(!Number.isFinite(distanceSquared)||distanceSquared<1e-12)return false;
  if(options.originAtNock){
   // A released arrow preserves the nocked asset's tail anchor. Its tip reaches
   // the requested impact point without overshooting by half an arrow length.
   if(distanceSquared<=(HUNTER_ARROW_LENGTH+1e-6)**2)return false;
   direction.normalize();
   start.addScaledVector(direction,-HUNTER_ARROW_NOCK_Z);
   end.addScaledVector(direction,-HUNTER_ARROW_TIP_Z);
   direction.copy(end).sub(start);
  }
  const fx=pool[cursor];cursor=(cursor+1)%pool.length;
  fx.from.copy(start);fx.to.copy(end);fx.age=0;
  fx.duration=Math.max(.05,Math.min(1.5,duration));
  fx.mesh.position.copy(start);
  fx.mesh.quaternion.setFromUnitVectors(forward,direction.normalize());
  fx.material.color.set(id==='arcaneShot'?0xe8d5ff:id==='concussiveShot'?0xc7efff:0xffffff);
  fx.material.emissive.set(id==='arcaneShot'?0x251038:id==='concussiveShot'?0x102b32:0x000000);
  fx.material.emissiveIntensity=.15;
  fx.mesh.visible=true;return true;
 }
 function update(dt){
  if(disposed||!Number.isFinite(dt)||dt<=0)return;
  for(const fx of pool){
   if(!fx.mesh.visible)continue;
   fx.age=Math.min(fx.duration,fx.age+dt);
   fx.mesh.position.lerpVectors(fx.from,fx.to,fx.age/fx.duration);
   if(fx.age>=fx.duration)fx.mesh.visible=false;
  }
 }
 function clear(){for(const fx of pool)fx.mesh.visible=false;}
 function dispose(){
  if(disposed)return;disposed=true;clear();
  for(const fx of pool){fx.mesh.removeFromParent();fx.material.dispose();}
  // Cached geometry also belongs to nocked arrows and other projectile pools.
 }
 return {fire,update,clear,dispose};
}
