// Single source of truth for the walkable NexGameWorld longhouse.
// All dimensions are local metres. The house is rotated 90 degrees in the camp.
export const LONGHOUSE=Object.freeze({
 x:-27,z:-2,yaw:Math.PI/2,width:19.2,depth:20.8,height:9.1,
 wallThickness:.52,doorWidth:6.8,roofRise:4.7,
 chestLocalX:5.4,chestLocalZ:-6.2,chestRange:3.25
});
export function toHouseCoordinates(x,z){
 return {x:-(z-LONGHOUSE.z),z:x-LONGHOUSE.x};
}
export function fromHouseCoordinates(x,z){
 return {x:LONGHOUSE.x+z,z:LONGHOUSE.z-x};
}
export const HOUSE_CHEST=Object.freeze({
 ...fromHouseCoordinates(LONGHOUSE.chestLocalX,LONGHOUSE.chestLocalZ),
 range:LONGHOUSE.chestRange
});
export function insideHouse(x,z,margin=.65){
 const p=toHouseCoordinates(x,z);
 return Math.abs(p.x)<LONGHOUSE.width/2-margin&&
  Math.abs(p.z)<LONGHOUSE.depth/2-margin;
}
// The collision envelope and walkable interior are deliberately unchanged.
// All tribal accents live outside that envelope; they have no physics or targets.
export function buildHearthHouse(THREE,{root,villageVisuals}){
 const h=LONGHOUSE.height,hw=LONGHOUSE.width/2,hd=LONGHOUSE.depth/2;
 const door=LONGHOUSE.doorWidth,t=LONGHOUSE.wallThickness;
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({
  color,roughness:.94,metalness:0,side:THREE.FrontSide,...extra
 });
 const M={
  foundation:material('#514137'),floor:material('#704c32'),plank:material('#926948'),
  wall:material('#bda17d'),darkWood:material('#3e291e'),
  wood:material('#644329'),lightWood:material('#99734e'),
  roof:material('#73503b'),hide:material('#d4b98b',{side:THREE.DoubleSide}),
  red:material('#964b33',{side:THREE.DoubleSide}),
  teal:material('#447b74',{side:THREE.DoubleSide}),
  bone:material('#dfcca1'),gold:material('#c5a061')
 };
 const createBox=(parent,m,x,y,z,w,height,depth)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,height,depth),m);
  mesh.position.set(x,y,z);mesh.receiveShadow=true;
  parent.add(mesh);return mesh;
 };
 const UP=new THREE.Vector3(0,1,0);
 // Many timber members use a single instanced draw call per material.
 function beams(parent,name,members,mat){
  const inst=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,7),mat,members.length);
  inst.name=name;inst.receiveShadow=true;inst.castShadow=false;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),dir=new THREE.Vector3();
  const node=new THREE.Object3D();
  for(let i=0;i<members.length;i++){
   const [start,end,radius]=members[i];
   a.set(...start);b.set(...end);dir.subVectors(b,a);
   node.position.copy(a).add(b).multiplyScalar(.5);
   node.quaternion.setFromUnitVectors(UP,dir.clone().normalize());
   node.scale.set(radius,dir.length(),radius);node.updateMatrix();
   inst.setMatrixAt(i,node.matrix);
  }
  inst.instanceMatrix.needsUpdate=true;parent.add(inst);return inst;
 }
 const floor=new THREE.Group();floor.name='hearth-house-solid-floor';root.add(floor);
 createBox(floor,M.foundation,0,.015,0,LONGHOUSE.width+.3,.2,LONGHOUSE.depth+.3);
 const n=15,pitch=(LONGHOUSE.width-.8)/n;
 for(let i=0;i<n;i++)createBox(floor,i%4===0?M.plank:M.floor,
  -hw+.4+(i+.5)*pitch,.155,0,pitch-.042,.092,LONGHOUSE.depth-.62);

 const walls=new THREE.Group();walls.name='hearth-house-solid-walls';root.add(walls);
 const wall=(x,y,z,w,he,de)=>createBox(walls,M.wall,x,y,z,w,he,de);
 wall(-hw+t/2,h/2,0,t,h,LONGHOUSE.depth);
 wall(hw-t/2,h/2,0,t,h,LONGHOUSE.depth);
 wall(0,h/2,-hd+t/2,LONGHOUSE.width,h,t);
 const split=(LONGHOUSE.width-door)/2;
 for(const sign of [-1,1])wall(sign*(door/2+split/2),h/2,hd-t/2,split,h,t);
 wall(0,h-.84,hd-t/2,door,1.68,t);
 
 // Hide panels and lashed poles echo the smaller canvas tents in this village.
 // The roof, doorway and chest remain in precisely their former coordinates.
 const accents=new THREE.Group();accents.name='hearth-house-tribal-exterior';walls.add(accents);
 const hidePanels=[
  ...[-1,1].flatMap(s=>[-7.4,-3.7,0,3.7,7.4].map((z,i)=>({
   x:s*(hw+.045),y:4.5,z,w:.085,h:7.2,d:3.5,color:(i+s+8)%3
  }))),
  ...[-1,1].flatMap(s=>[-7.25,-4.65,4.65,7.25].map((x,i)=>({
   x,y:4.5,z:s*(hd+.045),w:2.48,h:7.2,d:.075,color:(i+s+8)%3
  }))),
  ...[-6.9,-3.5,0,3.5,6.9].map((x,i)=>({
   x,y:4.5,z:-hd-.07,w:3.25,h:7.2,d:.07,color:i%3
  }))
 ];
 const hideMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),
  material('#ffffff',{side:THREE.DoubleSide}),hidePanels.length);
 hideMesh.name='hearth-house-hide-wall-panels';hideMesh.receiveShadow=true;
 const hideTints=['#c6a47b','#d2b38b','#bfa17a'].map(c=>new THREE.Color(c));
 const dummy=new THREE.Object3D();
 hidePanels.forEach((p,i)=>{
  dummy.position.set(p.x,p.y,p.z);dummy.quaternion.identity();
  dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();
  hideMesh.setMatrixAt(i,dummy.matrix);hideMesh.setColorAt(i,hideTints[p.color]);
 });
 hideMesh.instanceMatrix.needsUpdate=true;
 if(hideMesh.instanceColor)hideMesh.instanceColor.needsUpdate=true;
 accents.add(hideMesh);
 const timber=[];
 for(const s of [-1,1]){
  for(const z of [-9,-5.1,0,5.1,9]){
   timber.push([[s*(hw+.22),.36,z],[s*(hw+.22),h-.3,z],.205]);
  }
  // Low sloping corner buttresses, placed outside the house.
  for(const z of [-hd+.6,hd-.6]){
   timber.push([[s*(hw+.58),.2,z],[s*(hw+.19),h*.65,z],.27]);
  }
  for(const x of [-8.65,-5.6,5.6,8.65]){
   timber.push([[x,.35,s*(hd+.22)],[x,h-.3,s*(hd+.22)],.18]);
  }
  timber.push([[s*(door/2+.52),.15,hd+.4],[s*(door/2+.52),h+.25,hd+.4],.36]);
 }
 for(const s of [-1,1]){
  timber.push([[s*(hw+.26),1.2,-hd+.4],[s*(hw+.26),1.2,hd-.4],.16]);
  timber.push([[s*(hw+.26),h-.75,-hd+.4],[s*(hw+.26),h-.75,hd-.4],.17]);
 }
 timber.push([[-hw+.6,1.2,-hd-.24],[hw-.6,1.2,-hd-.24],.16]);
 timber.push([[-hw+.6,h-.72,-hd-.25],[hw-.6,h-.72,-hd-.25],.19]);
 timber.push([[-hw+.6,1.2,hd+.24],[-door/2-.54,1.2,hd+.24],.16]);
 timber.push([[door/2+.54,1.2,hd+.24],[hw-.6,1.2,hd+.24],.16]);
 beams(accents,'hearth-house-lashed-timber',timber,M.darkWood);
 // Warm and turquoise woven talismans on either side of the entrance.
 for(const s of [-1,1]){
  const bx=s*(door/2+1.35),front=hd+.48;
  createBox(accents,M.red,bx,5.9,front,.92,2.85,.12);
  createBox(accents,M.teal,bx,7.05,front+.085,.93,.20,.052);
  createBox(accents,M.bone,bx,4.75,front+.08,.18,.38,.06);
  createBox(accents,M.lightWood,bx,7.56,front,.20,.56,.24);
 }
 // Geometric tribal emblem, not a decal borrowed from another game's art.
 const emblem=new THREE.Group();emblem.name='hearth-house-entrance-emblem';
 emblem.position.set(0,8.28,hd+.51);accents.add(emblem);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.105,6,12),M.bone);
 emblem.add(ring);
 const glyph=createBox(emblem,M.teal,0,0,.12,.27,.82,.09);
 glyph.rotation.z=Math.PI/4;
 const bead=new THREE.Mesh(new THREE.IcosahedronGeometry(.19,0),M.gold);
 bead.position.z=.24;emblem.add(bead);

 const roof=new THREE.Group();roof.name='hearth-house-exterior-roof';root.add(roof);
 const roofPlanes=[],slope=Math.atan2(LONGHOUSE.roofRise,hw);
 const length=Math.hypot(hw,LONGHOUSE.roofRise)+.28,roofDepth=LONGHOUSE.depth+1.2;
 for(const sign of [-1,1]){
  const panel=createBox(roof,M.roof,sign*(hw/2+.18),
   h+LONGHOUSE.roofRise/2,0,length,.34,roofDepth);
  panel.rotation.z=-sign*slope;roofPlanes.push(panel);
  // Village shingles retain the roof's recognizable rough, layered surface.
  if(villageVisuals?.addRoof)villageVisuals.addRoof(panel,length,roofDepth,sign===1?1:0);
  // Thick, dyed-hide seams give the roof the same palette as the nearby tents.
  // Placed above the shingles with a deliberate gap to avoid Z-fighting.
  const patches=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.035,1),
   material('#ffffff',{side:THREE.DoubleSide}),18);
  patches.name='hearth-house-roof-hide-patches';patches.receiveShadow=true;
  const colors=['#8d6044','#a27a55','#ba9367'].map(c=>new THREE.Color(c));
  let at=0;
  for(let row=0;row<6;row++)for(let col=0;col<3;col++){
   dummy.position.set(-length/2+1.08+col*3.55,.251,
    -roofDepth/2+2+row*3.6);
   dummy.quaternion.identity();dummy.scale.set(2.48,.035,2.6);
   dummy.updateMatrix();patches.setMatrixAt(at,dummy.matrix);
   patches.setColorAt(at,colors[(row+col*2+(sign+1)/2)%3]);at++;
  }
  patches.instanceMatrix.needsUpdate=true;
  if(patches.instanceColor)patches.instanceColor.needsUpdate=true;
  panel.add(patches);
 }
 // Rounded timber ridgeline, paired rafters, and two original bone finials
 // create a distinctive silhouette visible over the surrounding tents.
 createBox(roof,M.darkWood,0,h+LONGHOUSE.roofRise+.19,0,.66,.46,roofDepth+.15);
 const rafters=[];
 for(const z of [-hd-.35,-hd+4,0,hd-4,hd+.35]){
  for(const sign of [-1,1])rafters.push([
   [0,h+LONGHOUSE.roofRise+.3,z],
   [sign*(hw+.55),h-.04,z],.19
  ]);
 }
 beams(roof,'hearth-house-exposed-roof-rafters',rafters,M.wood);
 const gableShape=new THREE.Shape();
 gableShape.moveTo(-hw,h);gableShape.lineTo(hw,h);
 gableShape.lineTo(0,h+LONGHOUSE.roofRise);gableShape.closePath();
 const gableMat=material('#af926f',{side:THREE.DoubleSide});
 for(const z of [-hd-.02,hd+.02]){
  const gable=new THREE.Mesh(new THREE.ShapeGeometry(gableShape),gableMat);
  gable.name='hearth-house-hide-gable';gable.position.z=z;roof.add(gable);
 }
 const finials=[];
 for(const z of [-hd-.35,hd+.35]){
  for(const s of [-1,1]){
   // Stylized curved horn poles, not a recognizable copyrighted symbol.
   finials.push([[s*.28,h+LONGHOUSE.roofRise+.4,z],
    [s*.92,h+LONGHOUSE.roofRise+1.15,z],.2]);
   finials.push([[s*.92,h+LONGHOUSE.roofRise+1.15,z],
    [s*1.3,h+LONGHOUSE.roofRise+1.56,z],.135]);
   finials.push([[s*1.3,h+LONGHOUSE.roofRise+1.56,z],
    [s*1.48,h+LONGHOUSE.roofRise+1.73,z],.067]);
  }
 }
 beams(roof,'hearth-house-bone-finials',finials,M.bone);
 // Roof group hides fully indoors; nothing has been placed in the walkable room.
 return {roof,roofPlanes,walls,floor,accents};
}
