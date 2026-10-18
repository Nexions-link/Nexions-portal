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
// Only the solid building envelope. Interior decoration and colliders are added
// separately, one reviewed object at a time. No furniture or invisible props.
export function buildHearthHouse(THREE,{root,villageVisuals}){
 const h=LONGHOUSE.height,hw=LONGHOUSE.width/2,hd=LONGHOUSE.depth/2;
 const door=LONGHOUSE.doorWidth,t=LONGHOUSE.wallThickness;
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({
  color,roughness:.92,metalness:0,side:THREE.FrontSide,...extra
 });
 const M={
  foundation:mat('#51453c'),floor:mat('#775036'),plank:mat('#aa7b4f'),
  wall:mat('#bfa17a'),
  darkWood:mat('#493025'),roof:mat('#68453c')
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
 // The house contains no interior objects. Only the Atlas chest is placed separately.
 return {roof,roofPlanes,walls,floor};
}
