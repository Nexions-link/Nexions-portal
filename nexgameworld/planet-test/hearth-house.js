// Single source of truth for the walkable NexGameWorld longhouse.
// All dimensions are local metres. The house is rotated 90 degrees in the camp.
export const LONGHOUSE=Object.freeze({
 x:-27,z:-2,yaw:Math.PI/2,width:19.2,depth:20.8,height:9.1,
 wallThickness:.52,doorWidth:6.8,roofRise:4.7,
 chestLocalX:-5.6,chestLocalZ:3.0,chestRange:3.25
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
// No coplanar overlay surfaces: structural panels, floors, rugs, trim and shingles
// occupy distinct planes. Every wall and roof surface remains opaque.
export function buildHearthHouse(THREE,{root,villageVisuals}){
 const h=LONGHOUSE.height,hw=LONGHOUSE.width/2,hd=LONGHOUSE.depth/2;
 const door=LONGHOUSE.doorWidth,t=LONGHOUSE.wallThickness;
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({
  color,roughness:.92,metalness:0,side:THREE.FrontSide,...extra
 });
 const M={
  foundation:mat('#51453c'),floor:mat('#775036'),plank:mat('#aa7b4f'),
  wall:mat('#bfa17a'),insideWall:mat('#d4bb92'),
  darkWood:mat('#493025'),wood:mat('#6d4730'),
  beam:mat('#8e6242'),roof:mat('#68453c'),
  textile:mat('#8e4233'),textileTrim:mat('#c9a66b'),
  bedding:mat('#b1a187'),pillow:mat('#d8c7a1'),
  brass:mat('#c5a368',{metalness:.2,roughness:.72})
 };
 const createBox=(parent,m,x,y,z,w,height,depth)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,height,depth),m);
  mesh.position.set(x,y,z);mesh.receiveShadow=true;
  parent.add(mesh);return mesh;
 };
 const floor=new THREE.Group();floor.name='hearth-house-solid-floor';root.add(floor);
 // A single thick foundation with spaced plank boards: no shared Z planes.
 createBox(floor,M.foundation,0,.015,0,LONGHOUSE.width+.3,.2,LONGHOUSE.depth+.3);
 const n=15,plankPitch=(LONGHOUSE.width-.8)/n;
 for(let i=0;i<n;i++){
  const x=-hw+.4+(i+.5)*plankPitch;
  createBox(floor,i%4===0?M.plank:M.floor,x,.155,0,plankPitch-.042,.092,LONGHOUSE.depth-.62);
 }
 createBox(floor,M.textile,-.8,.226,4.0,4.65,.032,5.05);
 for(const sign of [-1,1])createBox(floor,M.textileTrim,-.8+sign*2.05,.249,4.0,.10,.012,4.62);

 const walls=new THREE.Group();walls.name='hearth-house-solid-walls';root.add(walls);
 const wall=(x,y,z,w,he,de)=>createBox(walls,M.wall,x,y,z,w,he,de);
 wall(-hw+t/2,h/2,0,t,h,LONGHOUSE.depth);
 wall(hw-t/2,h/2,0,t,h,LONGHOUSE.depth);
 wall(0,h/2,-hd+t/2,LONGHOUSE.width,h,t);
 const split=(LONGHOUSE.width-door)/2;
 for(const sign of [-1,1]){
  wall(sign*(door/2+split/2),h/2,hd-t/2,split,h,t);
 }
 wall(0,h-.84,hd-t/2,door,1.68,t);
 // Opaque inside wall boards stand proud of the wall's inside face;
 // there is no transparency-based x-ray mode to cause sorting artefacts.
 for(const x of [-hw+t+.075,hw-t-.075]){
  createBox(walls,M.insideWall,x,4.85,0,.10,5.8,hd*1.93);
 }
 createBox(walls,M.insideWall,0,4.85,-hd+t+.075,LONGHOUSE.width-2*t,5.8,.10);
 // All beams overlap physical solids by volume rather than coplanar polygons.
 for(const sx of [-1,1])for(const sz of [-1,1]){
  createBox(walls,M.darkWood,sx*(hw-.52),h*.50,sz*(hd-.52),.62,h,.62);
 }
 for(const sign of [-1,1]){
  createBox(walls,M.beam,sign*(hw-.39),1.45,0,.22,2.1,LONGHOUSE.depth-.85);
  createBox(walls,M.wood,sign*(hw-.55),h-.68,0,.28,.32,LONGHOUSE.depth-.85);
  // Interior hanging decoration is clear of the wall face and camera.
  createBox(walls,M.textile,sign*(hw-t-.20),5.1,1.2,.075,2.25,1.65);
  createBox(walls,M.textileTrim,sign*(hw-t-.25),5.7,1.2,.08,.13,1.2);
 }
 for(const zz of [-hd+.52,hd-.52]){
  createBox(walls,M.wood,0,h-.60,zz,LONGHOUSE.width-.8,.28,.24);
 }
 for(const sign of [-1,1]){
  createBox(walls,M.wood,sign*door/2,4,hd+.10,.32,8,.32);
  createBox(walls,M.textile,sign*(door/2+.48),5.6,hd+.17,.55,2.6,.11);
 }
 createBox(walls,M.darkWood,0,h-1.66,hd+.11,door+.35,.23,.34);
 // Rafters and lighting remain visible indoors after the exterior roof hides.
 for(const z of [-7,-2.4,2.4,7]){
  createBox(walls,M.beam,0,h+.05,z,LONGHOUSE.width-1.1,.28,.28);
 }
 const lamp=new THREE.PointLight(0xffc88a,.9,19,2);
 lamp.position.set(0,h-2.2,0);lamp.castShadow=false;root.add(lamp);
 createBox(walls,M.darkWood,0,h-1.2,0,.13,2.4,.13);
 const glow=new THREE.Mesh(new THREE.SphereGeometry(.26,10,8),
  new THREE.MeshStandardMaterial({color:'#e7ae60',emissive:'#ffac4a',emissiveIntensity:1.25}));
 glow.position.set(0,h-2.55,0);root.add(glow);

 // Roof is a single visibility layer, including gables, tiles and ridge.
 // Inside: hide it entirely, never make the triangles partially transparent.
 const roof=new THREE.Group();roof.name='hearth-house-exterior-roof';root.add(roof);
 const roofPlanes=[];
 const slope=Math.atan2(LONGHOUSE.roofRise,hw);
 const length=Math.hypot(hw,LONGHOUSE.roofRise)+.28;
 for(const sign of [-1,1]){
  const panel=createBox(roof,M.roof,sign*(hw/2+.18),h+LONGHOUSE.roofRise/2,0,
   length,.34,LONGHOUSE.depth+1.2);
  panel.rotation.z=-sign*slope;roofPlanes.push(panel);
  villageVisuals.addRoof(panel,length,LONGHOUSE.depth+1.2,sign===1?1:0);
 }
 createBox(roof,M.darkWood,0,h+LONGHOUSE.roofRise+.17,0,.60,.42,LONGHOUSE.depth+1.5);
 const gableShape=new THREE.Shape();
 gableShape.moveTo(-hw,h);gableShape.lineTo(hw,h);
 gableShape.lineTo(0,h+LONGHOUSE.roofRise);gableShape.closePath();
 const gableMat=mat('#b49a75',{side:THREE.DoubleSide});
 for(const z of [-hd,hd]){
  const gable=new THREE.Mesh(new THREE.ShapeGeometry(gableShape),gableMat);
  gable.position.z=z;roof.add(gable);
 }
 // Furnishings are kept clear of the chest's dedicated front-left corner.
 const furnishings=new THREE.Group();furnishings.name='hearth-house-furnishings';root.add(furnishings);
 const bed=(x,z,w,d)=>{
  createBox(furnishings,M.darkWood,x,.60,z,w,1.04,d);
  createBox(furnishings,M.bedding,x,1.20,z,w-.32,.17,d-.30);
  createBox(furnishings,M.pillow,x,1.34,z-d*.31,w-.7,.15,.66);
  for(const sign of [-1,1])createBox(furnishings,M.wood,x+sign*(w*.43),.80,z-d*.45,.24,1.6,.30);
 };
 bed(-5.2,-5,4.7,5.1);
 createBox(furnishings,M.darkWood,5.4,1.32,-6.2,3.4,2.6,2.4);
 createBox(furnishings,M.beam,5.4,2.72,-6.2,3.7,.24,2.65);
 createBox(furnishings,M.wood,3,.97,-1,3.5,.24,3);
 for(const sx of [-1,1])for(const sz of [-1,1])
  createBox(furnishings,M.darkWood,3+sx*1.49,.49,-1+sz*1.08,.27,.93,.27);
 for(const zz of [-3.6,2]){
  createBox(furnishings,M.wood,5.8,.70,zz,1.24,1.24,1.30);
  createBox(furnishings,M.bedding,5.8,1.38,zz,1.12,.12,1.1);
 }
 return {roof,roofPlanes,walls,floor,furnishings};
}
