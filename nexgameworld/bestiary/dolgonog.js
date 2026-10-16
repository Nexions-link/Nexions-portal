// Lightweight procedural *reconstruction* of the original dolgonog silhouette.
// We cannot yet read the published site's GLB, so this is not claimed to be
// the original 3,226-triangle asset. Replace it with the GLB when available.
export const DEFAULT_DOLGONOG=Object.freeze({
 body:1,neck:1,crest:1,legs:1,feathers:1,
 plumage:'#a98658',wings:'#47392f',crestColor:'#b35c3e'
});
const TAU=Math.PI*2;
function mat(THREE,color,roughness=.94){
 return new THREE.MeshStandardMaterial({color,roughness,metalness:0,flatShading:false});
}
export function createDolgonog(THREE,options=DEFAULT_DOLGONOG){
 const p={...DEFAULT_DOLGONOG,...options};
 const root=new THREE.Group();root.name='dolgonog-v01-reconstruction';
 const anatomy={};
 const coat=mat(THREE,p.plumage),shadow=mat(THREE,p.wings);
 const light=mat(THREE,'#dfbb81'),cream=mat(THREE,'#f5daa4');
 const chest=mat(THREE,'#bb9872'),trim=mat(THREE,'#806349');
 const crest=mat(THREE,p.crestColor),crestTip=mat(THREE,'#dc8b56');
 const beak=mat(THREE,'#b99758'),beakLight=mat(THREE,'#e0bd75');
 const skin=mat(THREE,'#665142'),claw=mat(THREE,'#ded0b0');
 const eye=mat(THREE,'#201c1a',.35),iris=mat(THREE,'#dbbb78',.38);
 const highlight=new THREE.MeshBasicMaterial({color:0xffffff});
 const parts=[];
 const group=(parent,name,x=0,y=0,z=0)=>{
  const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
 };
 const shape=(parent,geometry,material,name,pos=[0,0,0],scale=[1,1,1])=>{
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=name;mesh.position.set(...pos);mesh.scale.set(...scale);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);parts.push(mesh);return mesh;
 };
 const ball=(parent,m,name,pos,scale,detail=12)=>shape(parent,
  new THREE.SphereGeometry(1,detail,9),m,name,pos,scale);
 const rod=(parent,m,name,start,end,r1,r2=r1,sides=9)=>{
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);
  const vec=b.clone().sub(a),length=vec.length();
  const mesh=shape(parent,new THREE.CylinderGeometry(r2,r1,length,sides,1),m,name,
    a.add(b).multiplyScalar(.5).toArray());
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());
  return mesh;
 };
 const plume=(parent,m,name,pos,scale,angle=0)=>{
  const mesh=ball(parent,m,name,pos,scale,10);mesh.rotation.x=angle;return mesh;
 };
 anatomy.body=group(root,'body',0,2.0,0);
 const body=anatomy.body,bs=p.body;
 ball(body,coat,'rounded torso',[0,.08,-.1],[.73*bs,.64*bs,1.0*bs],18);
 ball(body,light,'ochre chest',[0,-.05,.49],[.52*bs,.49*bs,.62*bs],14);
 ball(body,chest,'upper breast',[0,.31,.29],[.49,.37,.60],12);
 ball(body,shadow,'back of wings',[0,.23,-.55],[.68,.45,.58],14);
 // Feathered belly and short tail: silhouette variation without a huge texture.
 for(let i=0;i<7;i++){
  const x=(i-3)*.154,z=.64-Math.abs(i-3)*.035;
  plume(body,i%3===0?cream:light,'breast plume '+i,[x,-.17,z],[.14,.31,.25],-.28);
 }
 for(let i=0;i<7;i++){
  const x=(i-3)*.15;
  plume(body,i%2?coat:trim,'tail fan '+i,[x,.37,-.94],[.155,.18,.70],-.34-(i%2)*.12);
 }
 const wings=[];
 for(const side of [-1,1]){
  const wing=group(body,side<0?'left wing':'right wing',side*.64,.26,-.14);
  wings.push(wing);
  const w=ball(wing,shadow,'wing shoulder',[side*.09,-.05,-.16],[.21,.39,.73],14);
  w.rotation.x=-.18;w.rotation.z=side*-.18;
  for(let i=0;i<7;i++){
   const f=plume(wing,i%2?trim:shadow,'layered flight feather '+side+' '+i,
     [side*(.16+i*.008),-.11+i*.049,-.46-i*.12],
     [.135+p.feathers*.027,.12,.42+i*.015],.18+(i%3)*.10);
   f.rotation.y=side*(-.08-i*.015);
  }
  for(let i=0;i<4;i++){
   plume(wing,coat,'wing covert '+side+' '+i,
    [side*.145,.18-i*.13,-.36+i*.15],[.16,.14,.33],-.15);
  }
 }
 anatomy.wings=wings;
 // Raised flexible neck; made of tapered connected solids.
 anatomy.neck=group(body,'neck',0,.23,.53);
 const neck=anatomy.neck,ns=p.neck;
 rod(neck,coat,'neck lower',[0,0,0],[0,.52*ns,.27],.28,.20);
 rod(neck,chest,'neck upper',[0,.49*ns,.26],[0,1.16*ns,.37],.215,.16);
 ball(neck,coat,'neck shoulder',[0,.11,.065],[.28,.37,.29],12);
 for(let i=0;i<5;i++)
  plume(neck,i%2?cream:light,'throat feathers '+i,
   [0,.16+i*.2*ns,.18+i*.044],[.20-i*.011,.18,.18],.3);
 anatomy.head=group(neck,'head',0,1.19*ns,.39);
 const head=anatomy.head;
 ball(head,coat,'large skull',[0,.16,0],[.35,.32,.35],16);
 ball(head,light,'cheek',[0,.06,.18],[.29,.22,.27],12);
 shape(head,new THREE.ConeGeometry(.22,.65,5),beakLight,'upper beak',
  [0,.03,.56],[1,.78,1]).rotation.x=Math.PI/2;
 ball(head,beak,'lower beak',[0,-.13,.42],[.19,.074,.25],10);
 for(const side of [-1,1]){
  ball(head,cream,'eye socket '+side,[side*.282,.21,.08],[.098,.123,.13],10);
  ball(head,iris,'iris '+side,[side*.35,.22,.12],[.041,.071,.076],12);
  ball(head,eye,'pupil '+side,[side*.385,.215,.145],[.022,.048,.04],9);
  ball(head,highlight,'eye sparkle '+side,[side*.4,.245,.173],[.008,.014,.014],8);
  ball(head,skin,'nostril '+side,[side*.095,.078,.75],[.026,.016,.019],8);
 }
 for(let i=0;i<5;i++){
  const a=(i-2)*.32,sz=p.crest*(.77-(Math.abs(i-2)*.11));
  const f=shape(head,new THREE.ConeGeometry(.12,sz,7),i%2?crestTip:crest,
   'terracotta crest plume '+i,[(i-2)*.125,.38+sz*.42,-.16]);
  f.rotation.z=-a*.55;f.rotation.x=.23+(i%2)*.15;
 }
 // Two pivoted legs for gait. Fixed pose remains readable from all sides.
 const legs=[];
 for(const side of [-1,1]){
  const leg=group(root,side<0?'left leg':'right leg',side*.41,1.82,-.08);
  legs.push(leg);
  ball(leg,coat,'thigh '+side,[0,-.17,-.05],[.25,.38,.28],12);
  rod(leg,skin,'upper shank '+side,[0,-.34,0],[0,-1.05,.09],.105,.075);
  ball(leg,trim,'knee '+side,[0,-1.02,.09],[.135,.14,.135],10);
  rod(leg,skin,'lower shank '+side,[0,-1.08,.1],[0,-1.52,.14],.078,.067);
  ball(leg,skin,'ankle '+side,[0,-1.54,.14],[.10,.10,.10],9);
  for(const toe of [-1,0,1]){
   rod(leg,skin,'toe '+side+' '+toe,[0,-1.57,.18],
    [toe*.18,-1.65,.49-(Math.abs(toe)*.08)],.070,.044,8);
   const tip=shape(leg,new THREE.ConeGeometry(.051,.19,7),claw,
    'claw '+side+' '+toe,[toe*.18,-1.65,.56-Math.abs(toe)*.08]);
   tip.rotation.x=Math.PI/2;
  }
 }
 anatomy.legs=legs;
 root.userData.creatureId='dolgonog';
 function update(seconds,animation='idle'){
  const t=seconds,walk=animation==='walk',attack=animation==='attack';
  const stride=walk?Math.sin(t*9):0,breath=Math.sin(t*2.2)*.016;
  body.position.y=2.0+(walk?Math.abs(Math.sin(t*9))*.075:breath);
  body.rotation.x=walk?.04*Math.sin(t*9):attack?-.08:Math.sin(t*1.4)*.012;
  for(let i=0;i<2;i++){
   legs[i].rotation.x=walk?(i?1:-1)*stride*.49:0;
   wings[i].rotation.z=(i?1:-1)*(walk?.075*Math.sin(t*9):.025*Math.sin(t*1.8));
  }
  neck.rotation.x=attack?-.65*Math.max(0,Math.sin(t*7)):(walk?.085*Math.sin(t*9):.024*Math.sin(t*1.5));
  head.rotation.x=attack?-.24*Math.max(0,Math.sin(t*7)):.016*Math.sin(t*2.5);
  head.rotation.z=attack?Math.sin(t*6)*.08:.016*Math.sin(t*1.4);
 }
 update(0);
 return {root,parts,update,anatomy};
}
export function countTriangles(root){
 let triangles=0;
 root.traverse(object=>{
  const g=object.geometry;if(!g||!object.isMesh)return;
  const index=g.getIndex?.();
  const count=index?index.count:g.getAttribute('position')?.count??0;
  triangles+=Math.floor(count/3);
 });
 return triangles;
}
export function disposeDolgonog(root){
 const geometries=new Set(),materials=new Set();
 root.traverse(o=>{
  if(o.geometry)geometries.add(o.geometry);
  if(o.material)for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);
 });
 for(const g of geometries)g.dispose();
 for(const m of materials)m.dispose();
}
