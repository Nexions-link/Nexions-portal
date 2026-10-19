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
 // Small deterministic material maps, built in memory without downloads.
 // A single 64x64 atlas per surface type avoids extra requests on iPhone.
 function createGrain(kind){
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const h0=(Math.imul(x+17,73856093)^Math.imul(y+23,19349663)^
    (kind==='wood'?83492791:24793403))>>>0;
   const noise=((h0^(h0>>>13))%27)-13;
   const streak=kind==='wood'
    ?Math.sin(x*.58+Math.sin(y*.10+x*.11)*.8)*11+
     Math.sin(x*1.87+y*.025)*4
    :Math.sin(x*.35+y*.2)*4+((x+y*3)%9===0?-12:0);
   const brightness=Math.max(150,Math.min(255,
    Math.round((kind==='wood'?221:229)+noise*.75+streak)));
   const offset=(y*size+x)*4;
   data[offset]=brightness;data[offset+1]=brightness;
   data[offset+2]=brightness;data[offset+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  texture.name='hearth-house-'+kind+'-grain';
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(2,2);
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
 }
 const timberGrain=createGrain('wood'),hideGrain=createGrain('hide');
 for(const mat of [M.darkWood,M.wood,M.lightWood,M.plank,M.floor])
  mat.map=timberGrain;
 for(const mat of [M.wall,M.hide,M.roof])mat.map=hideGrain;
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
 // Stitching echoes the hand-lashed canvas of the surrounding tents.
 // Lightweight instanced geometry and no gameplay hitboxes.
 const lacing=[];
 for(const sign of [-1,1])for(const z of [-7.85,-4.12,-.35,3.42,7.19]){
  for(const y of [1.25,2.8,4.35,5.9,7.45]){
   const x=sign*(hw+.105);
   lacing.push([[x,y,z-.23],[x,y+.18,z+.23],.026]);
   lacing.push([[x,y+.18,z-.23],[x,y,z+.23],.026]);
  }
 }
 beams(accents,'hearth-house-hide-lacings',lacing,M.lightWood);
 // Flared exterior facade wings break up the rectangular building silhouette.
 // Every wing is outside the solid envelope; the doorway and room stay untouched.
 const wingPanels=[];
 for(const sign of [-1,1]){
  for(const z of [-5.4,1.0,6.5]){
   const wing=createBox(accents,M.wood,sign*(hw+.31),4.45,z,.33,5.95,3.15);
   wing.rotation.y=sign*.17;
   wing.name='hearth-house-side-wing';
   wingPanels.push(wing);
   const hideCover=createBox(wing,M.hide,sign*.22,.15,.045,.12,5.0,2.56);
   hideCover.name='hearth-house-wing-hide';
  }
  // Raised segmented face panels surround, but never cover, the 6.8m doorway.
  for(const x of [sign*6.15,sign*8.22]){
   const face=createBox(accents,M.lightWood,x,4.1,hd+.32,.85,5.3,.30);
   face.name='hearth-house-front-pier';
   createBox(face,M.hide,0,.2,.19,.64,4.25,.05);
  }
 }
 // Batched side counter-braces instead of an uninterrupted box-shaped wall.
 const sideBraces=[];
 for(const sign of [-1,1])for(const z of [-7.0,0,7.0]){
  sideBraces.push([[sign*(hw+.25),h-.68,z],
   [sign*(hw+1.43),.33,z+.24],.20]);
  sideBraces.push([[sign*(hw+.25),3.1,z-1.05],
   [sign*(hw+1.13),.43,z-1.05],.13]);
 }
 beams(accents,'hearth-house-side-counter-braces',sideBraces,M.darkWood);
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
 // Bone carvings flank the gateway, strictly outside the original opening.
 const carvings=[];
 for(const sign of [-1,1]){
  const x=sign*(door/2+.68),z=hd+.73;
  for(let i=0;i<3;i++){
   const y=2.6+i*1.22;
   carvings.push([[x-.31,y,z],[x,y+.42,z],.046]);
   carvings.push([[x,y+.42,z],[x+.31,y,z],.046]);
  }
 }
 beams(accents,'hearth-house-entrance-carvings',carvings,M.bone);
 // Two ceremonial signposts give the elder's lodge a focal point.
 // Their feet stand outside the protected central entrance corridor.
 const totemRods=[];
 const totemOrnaments=[];
 for(const sign of [-1,1]){
  const x=sign*7.55,z=hd+1.50;
  totemRods.push([[x,.25,z],[x,5.05,z],.24]);
  totemRods.push([[x,4.2,z],[x+sign*.85,4.62,z],.13]);
  totemRods.push([[x,4.2,z],[x-sign*.72,4.48,z],.13]);
  totemRods.push([[x,5.05,z],[x+sign*.34,5.6,z],.12]);
  for(const y of [2.35,3.18,4.0]){
   totemOrnaments.push({x,y,z,radius:.34});
  }
  const hanging=createBox(accents,sign<0?M.red:M.teal,
   x+sign*.75,3.21,z,.61,1.56,.095);
  hanging.name='hearth-house-ceremonial-totem-pennant';
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.24,.49,5),
   M.bone);
  tip.name='hearth-house-totem-finial';
  tip.position.set(x+sign*.34,5.73,z);
  accents.add(tip);
 }
 beams(accents,'hearth-house-ceremonial-posts',totemRods,M.darkWood);
 const collarGeo=new THREE.CylinderGeometry(1,1,1,9);
 const collarBatch=new THREE.InstancedMesh(collarGeo,M.teal,totemOrnaments.length);
 collarBatch.name='hearth-house-totem-collars';
 totemOrnaments.forEach(({x,y,z,radius},i)=>{
  dummy.position.set(x,y,z);dummy.quaternion.identity();
  dummy.scale.set(radius,.16,radius);dummy.updateMatrix();
  collarBatch.setMatrixAt(i,dummy.matrix);
 });
 collarBatch.instanceMatrix.needsUpdate=true;accents.add(collarBatch);
 // Low stone edging marks the forecourt without obstructing its open centre.
 // This is entirely decorative: it does not define any collision surface.
 const stones=[];
 for(const sign of [-1,1])for(let row=0;row<5;row++){
  const x=sign*(4.9+(row%2)*.55),z=hd+1.14+row*.70;
  stones.push({x,y:.13,z,sx:.67+(row%3)*.09,sz:.40+(row%2)*.10});
 }
 const pebbleBatch=new THREE.InstancedMesh(
  new THREE.DodecahedronGeometry(1,0),M.foundation,stones.length);
 pebbleBatch.name='hearth-house-forecourt-edging';
 stones.forEach((stone,i)=>{
  dummy.position.set(stone.x,stone.y,stone.z);
  dummy.rotation.set(0,(i%5)*.17,0);
  dummy.scale.set(stone.sx,.12,stone.sz);dummy.updateMatrix();
  pebbleBatch.setMatrixAt(i,dummy.matrix);
 });
 pebbleBatch.instanceMatrix.needsUpdate=true;accents.add(pebbleBatch);
 // A low wooden threshold visually ties the forecourt to the existing floor.
 const threshold=createBox(accents,M.plank,0,.155,hd+.43,
  door-.34,.145,.53);
 threshold.name='hearth-house-entry-threshold';
 // Weathered flat stepping stones lead to the entrance. They intentionally do
 // not participate in physics and sit below the player's feet.
 const steps=new THREE.InstancedMesh(
  new THREE.CylinderGeometry(1,1,1,7),M.foundation,5);
 steps.name='hearth-house-forecourt-stepping-stones';
 for(let i=0;i<5;i++){
  dummy.position.set(Math.sin(i*1.8)*.4,.085,hd+1.12+i*.89);
  dummy.rotation.set(0,i*.31,0);
  dummy.scale.set(.82+(i%2)*.14,.045,.55+(i%3)*.065);
  dummy.updateMatrix();steps.setMatrixAt(i,dummy.matrix);
 }
 steps.instanceMatrix.needsUpdate=true;accents.add(steps);
 // Symbolic wall torches: emissive meshes provide a warm focal point
 // without expensive dynamic lights, particles or frame-time animation.
 const emberMat=material('#e2a451',{
  emissive:new THREE.Color('#ef7138'),emissiveIntensity:.75,
  roughness:1
 });
 for(const sign of [-1,1]){
  const x=sign*6.95,z=hd+.84;
  const socket=new THREE.Mesh(new THREE.CylinderGeometry(.30,.42,.64,8),
   M.darkWood);
  socket.name='hearth-house-entrance-sconce';
  socket.rotation.z=sign*.24;
  socket.position.set(x,4.35,z);accents.add(socket);
  const ember=new THREE.Mesh(new THREE.IcosahedronGeometry(.32,1),emberMat);
  ember.name='hearth-house-sconce-ember';
  ember.position.set(x,4.78,z+.08);accents.add(ember);
 }
 // Curved bone pendants hang from the existing ceremonial poles outside the
 // walking corridor; a shared instanced draw call is sufficient.
 const charms=[];
 for(const sign of [-1,1]){
  const x=sign*7.55,z=hd+1.55;
  for(let i=0;i<4;i++){
   const offset=(i-1.5)*.31;
   charms.push([[x+offset,2.15,z],[x+offset,1.63-(i%2)*.14,z],.048]);
  }
 }
 beams(accents,'hearth-house-bone-wind-charms',charms,M.bone);

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
 // A raised hide canopy makes the elder's entry recognizable at a distance.
 // It belongs to the hideable roof, not the solid walls or interior.
 const porch=new THREE.Group();
 porch.name='hearth-house-ceremonial-porch';roof.add(porch);
 const porchRise=1.26,porchHalfWidth=4.62;
 const canopySlope=Math.atan2(porchRise,porchHalfWidth);
 const canopyLength=Math.hypot(porchHalfWidth,porchRise)+.18;
 for(const sign of [-1,1]){
  const panel=createBox(porch,M.hide,sign*porchHalfWidth/2,
   h+.10,hd+1.45,canopyLength,.20,3.15);
  panel.rotation.z=-sign*canopySlope;
  panel.name='hearth-house-porch-hide-roof';
  const border=createBox(panel,M.red,sign*(canopyLength/2-.27),.135,1.34,.38,.055,2.65);
  border.name='hearth-house-awning-red-edging';
 }
 const porchTimber=[
  [[-porchHalfWidth,h-1.1,hd+.35],[-porchHalfWidth,h-.06,hd+.35],.19],
  [[porchHalfWidth,h-1.1,hd+.35],[porchHalfWidth,h-.06,hd+.35],.19],
  [[0,h+porchRise+.26,hd-.20],[0,h+porchRise+.26,hd+3.08],.19]
 ];
 for(const z of [hd+.20,hd+2.91]){
  for(const sign of [-1,1])porchTimber.push([
   [0,h+porchRise+.2,z],[sign*(porchHalfWidth+.1),h-.38,z],.18]);
 }
 beams(porch,'hearth-house-porch-rafters',porchTimber,M.wood);
 const pennantShape=new THREE.Shape();
 pennantShape.moveTo(-.42,.6);pennantShape.lineTo(.42,.6);
 pennantShape.lineTo(.32,-.61);pennantShape.lineTo(0,-.36);
 pennantShape.lineTo(-.32,-.61);pennantShape.closePath();
 for(const sign of [-1,1]){
  const pennant=new THREE.Mesh(new THREE.ShapeGeometry(pennantShape),
   sign<0?M.red:M.teal);
  pennant.name='hearth-house-porch-pennant';
  pennant.position.set(sign*4.42,h-.73,hd+3.045);
  porch.add(pennant);
  createBox(porch,M.bone,sign*4.42,h-.16,hd+3.08,.95,.10,.08);
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
 // Timber gable ribs visually connect the house to the camp's carved totems.
 const gableBeams=[];
 for(const z of [-hd-.13,hd+.13]){
  for(const sign of [-1,1]){
   gableBeams.push([[0,h+LONGHOUSE.roofRise-.08,z],
    [sign*(hw-.46),h+.09,z],.15]);
   gableBeams.push([[sign*3.12,h+.17,z],
    [sign*3.12,h+LONGHOUSE.roofRise*(1-3.12/hw)-.12,z],.09]);
  }
 }
 beams(roof,'hearth-house-gable-timber',gableBeams,M.darkWood);
 // Staggered small ornamental eaves, batched under the hideable roof,
 // add varied depth without changing the camera's original roof planes.
 const fringes=[];
 for(const sign of [-1,1])for(const z of [-8.0,-4.0,1.1,6.2]){
  fringes.push([[sign*(hw-.18),h+.13,z-.86],
    [sign*(hw+.55),h-.57,z-.86],.11]);
  fringes.push([[sign*(hw-.18),h+.13,z+.86],
    [sign*(hw+.55),h-.57,z+.86],.11]);
 }
 beams(roof,'hearth-house-eave-details',fringes,M.lightWood);
 // The rough, uneven hide apron softens the geometric lower roof edge.
 // All aprons disappear automatically together with the exterior roof.
 const roofAprons=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),M.hide,24);
 roofAprons.name='hearth-house-roof-hide-apron';
 const apronColors=['#a98564','#bba17a','#cdb18a'].map(x=>new THREE.Color(x));
 let ai=0;
 for(const sign of [-1,1])for(let i=0;i<12;i++){
  const z=-hd+.60+i*(LONGHOUSE.depth-1.2)/12;
  dummy.position.set(sign*(hw+.48),h-.37-(i%3)*.095,z);
  dummy.rotation.set(0,0,sign*.11);
  dummy.scale.set(.115,.55+(i%4)*.12,1.43);
  dummy.updateMatrix();roofAprons.setMatrixAt(ai,dummy.matrix);
  roofAprons.setColorAt(ai,apronColors[(i+(sign+1)/2)%3]);ai++;
 }
 roofAprons.instanceMatrix.needsUpdate=true;
 if(roofAprons.instanceColor)roofAprons.instanceColor.needsUpdate=true;
 roof.add(roofAprons);
 // Colorful narrow ribbons mark the fore edge of the awning rather than
 // extending the collision envelope or changing the old roof planes.
 const ribbonBatch=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),
  material('#ffffff',{side:THREE.DoubleSide}),18);
 ribbonBatch.name='hearth-house-awning-woven-fringe';
 const ribbons=['#a45139','#b78e5a','#477b74'].map(x=>new THREE.Color(x));
 for(let i=0;i<18;i++){
  dummy.position.set(-4.13+i*.486,h-.64+(i%3)*.065,hd+3.05);
  dummy.rotation.set(0,0,Math.sin(i*1.4)*.045);
  dummy.scale.set(.28,.64+(i%4)*.095,.065);dummy.updateMatrix();
  ribbonBatch.setMatrixAt(i,dummy.matrix);
  ribbonBatch.setColorAt(i,ribbons[i%3]);
 }
 ribbonBatch.instanceMatrix.needsUpdate=true;
 if(ribbonBatch.instanceColor)ribbonBatch.instanceColor.needsUpdate=true;
 porch.add(ribbonBatch);
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
