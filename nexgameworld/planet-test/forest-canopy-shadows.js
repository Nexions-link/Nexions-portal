// Bounded balanced-quality canopy shadows: 48 nearby 80-triangle silhouettes.
// High uses original full crowns; economy adds no shadow work.
import {createForestLayout} from './whispering-forest.js';
export function createForestCanopyShadows(THREE,{scene,radius,heightAt}){
 const trees=createForestLayout().trees;
 const rows=trees.map(t=>{
  const normal=new THREE.Vector3(Math.cos(t.lat)*Math.sin(t.lon),Math.sin(t.lat),Math.cos(t.lat)*Math.cos(t.lon));
  return {t,normal,height:heightAt(normal)};
 });
 const geometry=new THREE.IcosahedronGeometry(1,1);
 const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
 const mesh=new THREE.InstancedMesh(geometry,material,48);
 mesh.name='woodland-near-canopy-shadow-only';mesh.castShadow=true;
 mesh.frustumCulled=false;mesh.visible=false;mesh.count=0;
 const object=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
 let enabled=false;
 scene.add(mesh);
 return {
  mesh,
  setQuality(q,portal=false){enabled=!portal&&q==='balanced';mesh.visible=enabled;},
  update(normal){
   if(!enabled)return;
   // Include crowns upstream of the local sun projection as well as the hero.
   const nearest=rows.map(r=>({r,d:radius*Math.acos(Math.min(1,Math.max(-1,r.normal.dot(normal))))}))
    .filter(x=>x.d<55).sort((a,b)=>a.d-b.d).slice(0,48);
   mesh.count=nearest.length;
   nearest.forEach(({r},i)=>{
    const t=r.t;
    object.position.copy(r.normal).multiplyScalar(radius+r.height+t.height*.76);
    object.quaternion.setFromUnitVectors(up,r.normal);
    object.scale.set(t.radius*(t.evergreen?3.1:4.1),t.height*(t.evergreen?.25:.18),t.radius*(t.evergreen?3.1:3.7));
    object.updateMatrix();mesh.setMatrixAt(i,object.matrix);
   });
   mesh.instanceMatrix.needsUpdate=true;
  }
 };
}
