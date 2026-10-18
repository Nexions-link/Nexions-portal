// Quest-only dropped daggers around the western bandit outpost.
// Shared by the browser renderer and the authoritative collection server.
export const BANDIT_WEAPON_ITEM='banditDagger';
export const BANDIT_WEAPON_REQUIRED=3;
export const BANDIT_WEAPON_CAST_SECONDS=1.5;
export const BANDIT_WEAPON_RESPAWN_SECONDS=32;
export const BANDIT_WEAPON_INTERACT_RANGE=2.8;
export const BANDIT_WEAPON_LOCATIONS=Object.freeze([
 [-62,-10],[-78,-4],[-65,8],[-78,15],[-62,19]
].map(point=>Object.freeze(point)));

export function banditWeaponNode(index){
 if(!Number.isSafeInteger(index)||index<0||index>=BANDIT_WEAPON_LOCATIONS.length)
  return null;
 const [x,z]=BANDIT_WEAPON_LOCATIONS[index];
 // SQL gather-node checks permit gather:<stage>:<index>. Reserve indices
 // 100-104 outside the herbalist catalog so existing Neon tables require no migration.
 return {nodeId:'gather:3:'+(100+index),index,itemId:BANDIT_WEAPON_ITEM,x,z};
}

export function createBanditWeaponWorld({THREE,parent,place}){
 const metal=new THREE.MeshStandardMaterial({color:0xa0a8a5,metalness:.58,roughness:.47});
 const edge=new THREE.MeshStandardMaterial({color:0xc7c5b3,metalness:.35,roughness:.44});
 const grip=new THREE.MeshStandardMaterial({color:0x4a3025,roughness:.92});
 const crossguard=new THREE.MeshStandardMaterial({color:0x756248,metalness:.3,roughness:.61});
 const glow=new THREE.MeshBasicMaterial({color:0xffdd93,depthWrite:false,toneMapped:false});
 const bladeGeometry=new THREE.BoxGeometry(.26,.055,1.00);
 const tipGeometry=new THREE.ConeGeometry(.16,.39,4);
 const handleGeometry=new THREE.CylinderGeometry(.085,.10,.62,9);
 const guardGeometry=new THREE.BoxGeometry(.60,.13,.18);
 const pommelGeometry=new THREE.IcosahedronGeometry(.115,0);
 const ringGeometry=new THREE.TorusGeometry(.72,.023,5,36);
 const sparkGeometry=new THREE.OctahedronGeometry(.07,0);
 const nodes=[];
 function mesh(root,geometry,material,x,y,z){
  const obj=new THREE.Mesh(geometry,material);
  obj.position.set(x,y,z);root.add(obj);return obj;
 }
 for(let index=0;index<BANDIT_WEAPON_LOCATIONS.length;index++){
  const point=banditWeaponNode(index),root=new THREE.Group();
  root.name='quest-bandit-dagger-'+index;root.rotation.y=.3+index*.9;parent.add(root);
  mesh(root,bladeGeometry,metal,0,.19,-.39);
  const tip=mesh(root,tipGeometry,edge,0,.19,-1.07);
  tip.rotation.x=-Math.PI/2;tip.rotation.y=Math.PI/4;
  const handle=mesh(root,handleGeometry,grip,0,.20,.46);
  handle.rotation.x=Math.PI/2;
  mesh(root,guardGeometry,crossguard,0,.21,.14);
  mesh(root,pommelGeometry,crossguard,0,.20,.82);
  for(const z of [.34,.55,.70]){
   const wrap=mesh(root,guardGeometry,crossguard,0,.205,z);
   wrap.scale.set(.23,.63,.20);
  }
  const ring=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({
   color:0xe6c486,transparent:true,opacity:.2,depthWrite:false,toneMapped:false
  }));
  ring.rotation.x=-Math.PI/2;ring.position.y=.07;ring.raycast=()=>{};root.add(ring);
  const sparkle=mesh(root,sparkGeometry,glow,0,.83,-.3);
  sparkle.raycast=()=>{};
  const node={kind:'banditWeapon',id:point.nodeId,index,
   x:point.x,z:point.z,yaw:.3+index*.9,root,ring,sparkle,
   readyAt:0,name:'Кинжал разбойника'};
  root.visible=false;nodes.push(node);place(node);
 }
 return {nodes,update(clock,available,getDistance){
  for(const node of nodes){
   node.root.visible=!!available(node)&&clock>=node.readyAt;
   if(!node.root.visible)continue;
   const d=getDistance(node);
   node.ring.visible=d<9;
   node.ring.material.opacity=Math.max(.06,Math.min(.42,(9-d)/12))*(.8+.2*Math.sin(clock*2.5));
   node.sparkle.visible=d<13;
   node.sparkle.position.y=.8+.09*Math.sin(clock*2+node.index);
  }
 }};
}
