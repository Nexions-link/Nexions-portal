// Decorative, non-colliding bandit encampment. Anchors are sphere-aware and
// rebuilt by start-zone.js whenever the planet surface is refreshed.
import {BANDIT_CAMP,BANDIT_CHIEF_LOCATION,BANDIT_CHIEF_PATH} from './bandit-camp-data.js?v=2';
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
 // Supply corner and spear rack add readable landmarks without collisions.
 const crateWood=new THREE.MeshStandardMaterial({color:0x735235,roughness:.95});
 const iron=new THREE.MeshStandardMaterial({color:0x655b51,metalness:.25,roughness:.8});
 for(const [x,z,scale] of [[4.9,-5.6,1],[6.15,-5.9,.85],[5.5,-5.65,.65]]){
  const box=add(new THREE.BoxGeometry(1.05,.85,1.0),crateWood,x,.43*scale,z);
  box.scale.setScalar(scale);shadowCasters.push(box);
 }
 for(const [x,z] of [[-6.4,4.8],[-4.7,4.7]]){
  const roll=add(new THREE.CylinderGeometry(.31,.31,1.55,9),leather,x,.31,z);
  roll.rotation.z=Math.PI/2;
 }
 const rack=new THREE.Group();rack.position.set(-5.5,0,-5.4);root.add(rack);
 for(const x of [-1,1]){
  const post=add(new THREE.CylinderGeometry(.075,.11,2,6),wood,x,1,0,rack);
  shadowCasters.push(post);
 }
 add(new THREE.BoxGeometry(2.15,.12,.16),wood,0,1.75,0,rack);
 add(new THREE.BoxGeometry(2.15,.12,.16),wood,0,.55,0,rack);
 for(const x of [-.65,0,.65]){
  const spear=add(new THREE.CylinderGeometry(.035,.045,1.6,6),wood,x,1,.15,rack);
  spear.rotation.z=x*.15;
  add(new THREE.ConeGeometry(.12,.34,5),iron,x,1.95,.15,rack);
 }
 // A compact cooking fire, intentionally away from the mob spawn points.
 for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7;
  add(new THREE.DodecahedronGeometry(.27,0),stone,Math.cos(a)*.85,.19,Math.sin(a)*.85+1);
 }
 const flame=add(new THREE.ConeGeometry(.36,.85,7),ember,0,.57,1);
 add(new THREE.BoxGeometry(1.5,.75,1),wood,2.4,.4,-2.2);
 // Small stone markers follow the worn path. None block player navigation.
 for(let i=1;i<BANDIT_CHIEF_PATH.length-1;i++){
  const [x,z]=BANDIT_CHIEF_PATH[i],waystone=anchor(x-2.1,z);
  waystone.name='chief-trail-waystone-'+i;
  const stoneMesh=add(new THREE.DodecahedronGeometry(.43,0),stone,0,.22,0,waystone);
  stoneMesh.scale.set(.9,.7,1.2);
  add(new THREE.CylinderGeometry(.035,.06,1.35,5),wood,0,.9,0,waystone);
  const strip=add(new THREE.BoxGeometry(.37,.62,.055),canvas,.23,1.26,0,waystone);
  strip.rotation.z=-.15;
 }
 // The chief lives on a separate clearing, well outside the three sentries'
 // detection areas. Keep the center open for combat and the red target ring.
 const chief=anchor(BANDIT_CHIEF_LOCATION.x,BANDIT_CHIEF_LOCATION.z);
 chief.name='bandit-chief-secluded-clearing';
 const darkStone=new THREE.MeshStandardMaterial({color:0x484b42,roughness:1});
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,rr=4.6+(i%3)*.3;
  const marker=add(new THREE.DodecahedronGeometry(.48,0),darkStone,
   Math.cos(a)*rr,.24,Math.sin(a)*rr,chief);
  marker.scale.set(1,.65,1.3);
 }
 for(const side of [-1,1]){
  const post=add(new THREE.CylinderGeometry(.085,.11,3.5,7),wood,side*3.4,1.75,-1.35,chief);
  shadowCasters.push(post);
  const banner=add(new THREE.BoxGeometry(1.05,1.25,.08),canvas,side*3.4,2.47,-1.25,chief);
  banner.rotation.y=side*.12;
 }
 // A personal supply cache identifies the boss area without obstructing its spawn.
 add(new THREE.BoxGeometry(1.5,.65,.85),leather,0,.34,-4.4,chief);
 return {root,animate(t){flame.scale.y=1+Math.sin(t*7)*.1;}};
}
