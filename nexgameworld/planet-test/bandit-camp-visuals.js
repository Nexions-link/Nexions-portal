// Decorative, non-colliding bandit encampment. Anchors are sphere-aware and
// rebuilt by start-zone.js whenever the planet surface is refreshed.
import {BANDIT_CAMP} from './bandit-camp-data.js';
export function createBanditCampVisuals(THREE,{anchor,shadowCasters=[]}){
 const wood=new THREE.MeshStandardMaterial({color:0x59402d,roughness:1});
 const canvas=new THREE.MeshStandardMaterial({color:0x755341,roughness:1,side:THREE.DoubleSide});
 const leather=new THREE.MeshStandardMaterial({color:0x392c28,roughness:1});
 const ember=new THREE.MeshBasicMaterial({color:0xe89a4d});
 const stone=new THREE.MeshStandardMaterial({color:0x7c7567,roughness:1});
 const root=anchor(BANDIT_CAMP.center.x,BANDIT_CAMP.center.z);
 root.name='bandit-dust-trail-camp';
 const add=(geometry,material,x,y,z,parent=root)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 };
 // Two lean-to shelters avoid the high polygon count of a full building.
 for(const [x,z,rotation] of [[-4,2,.3],[4,3,-.4]]){
  const shelter=new THREE.Group();shelter.position.set(x,0,z);shelter.rotation.y=rotation;root.add(shelter);
  for(const side of [-1,1]){
   const post=add(new THREE.CylinderGeometry(.10,.13,2.9,6),wood,side*1.8,1.45,-1.5,shelter);
   shadowCasters.push(post);
  }
  const roof=add(new THREE.BoxGeometry(4.5,.12,3.8),canvas,0,2.65,0,shelter);
  roof.rotation.x=-.28;shadowCasters.push(roof);
  add(new THREE.BoxGeometry(3.3,.35,1.4),leather,0,.18,.5,shelter);
 }
 for(const [x,z] of [[-7,-3],[7,-3],[-7,7],[7,7]]){
  add(new THREE.CylinderGeometry(.11,.16,2.2,6),wood,x,1.1,z);
  add(new THREE.ConeGeometry(.22,.5,6),wood,x,2.4,z);
 }
 // A compact cooking fire, intentionally away from the mob spawn points.
 for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7;
  add(new THREE.DodecahedronGeometry(.27,0),stone,Math.cos(a)*.85,.19,Math.sin(a)*.85+1);
 }
 const flame=add(new THREE.ConeGeometry(.36,.85,7),ember,0,.57,1);
 add(new THREE.BoxGeometry(1.5,.75,1),wood,2.4,.4,-2.2);
 return {root,animate(t){flame.scale.y=1+Math.sin(t*7)*.1;}};
}
