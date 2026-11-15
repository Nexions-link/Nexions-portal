// Original arrow artwork. The same asset is nocked on the bow and fired through
// the world; local +Z points toward its steel tip, local -Z toward its nock.
const geometryCache=new WeakMap();
export const HUNTER_ARROW_NOCK_Z=-.72;
export const HUNTER_ARROW_TIP_Z=.76;
export const HUNTER_ARROW_LENGTH=HUNTER_ARROW_TIP_Z-HUNTER_ARROW_NOCK_Z;

function arrowGeometry(THREE){
 if(geometryCache.has(THREE))return geometryCache.get(THREE);
 const positions=[],normals=[],colors=[],uvs=[];
 const color=new THREE.Color(),point=new THREE.Vector3();
 const add=(geometry,matrix,tint,shade=null)=>{
  const flat=geometry.index?geometry.toNonIndexed():geometry;
  flat.applyMatrix4(matrix);
  if(!flat.attributes.normal)flat.computeVertexNormals();
  color.set(tint);
  const p=flat.attributes.position,n=flat.attributes.normal,uv=flat.attributes.uv;
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i);
   const tone=shade?shade(point):1;
   positions.push(point.x,point.y,point.z);
   normals.push(n.getX(i),n.getY(i),n.getZ(i));
   colors.push(color.r*tone,color.g*tone,color.b*tone);
   uvs.push(uv?.getX(i)||0,uv?.getY(i)||0);
  }
  flat.dispose();if(flat!==geometry)geometry.dispose();
 };
 const axisMatrix=z=>new THREE.Matrix4().makeRotationX(Math.PI/2)
  .setPosition(0,0,z);
 // A seven-sided tapered wooden shaft and two tight binding collars read at
 // gameplay scale without a downloaded texture or another draw call.
 add(new THREE.CylinderGeometry(.018,.022,1.22,7,1),axisMatrix(-.04),0xb88b50,
  p=>.86+.11*Math.cos(Math.atan2(p.y,p.x)*3)+.025*Math.sin(p.z*47));
 for(const z of [-.635,.505]){
  add(new THREE.CylinderGeometry(.026,.026,.075,8,1),axisMatrix(z),0x55432e);
  for(const offset of [-.025,0,.025])
   add(new THREE.CylinderGeometry(.027,.027,.007,8,1),axisMatrix(z+offset),0xb9aa88);
 }
 // A sharp diamond broadhead has thin steel edges rather than a projectile cone.
 const head=new THREE.BufferGeometry();
 head.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,HUNTER_ARROW_TIP_Z,.072,0,.585,0,.017,.585,-.072,0,.585,0,-.017,.585,0,0,.548
 ],3));
 head.setIndex([0,1,2,0,2,3,0,3,4,0,4,1,5,2,1,5,3,2,5,4,3,5,1,4]);
 head.computeVertexNormals();
 add(head,new THREE.Matrix4(),0xc5d0d2,p=>p.y>=0?1:.72);
 // Three thin, solid feather vanes: a red cock feather, two warm pale vanes.
 const featherOutline=[[.017,-.595],[.088,-.57],[.095,-.385],[.026,-.285],[.017,-.31]];
 const feather=()=>{
  const geometry=new THREE.BufferGeometry(),vertices=[],indices=[],count=featherOutline.length;
  for(const x of [-.003,.003])for(const [y,z] of featherOutline)vertices.push(x,y,z);
  for(let i=1;i<count-1;i++)indices.push(0,i+1,i,count,count+i,count+i+1);
  for(let i=0;i<count;i++){
   const next=(i+1)%count;
   indices.push(i,next,count+i,next,count+next,count+i);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
 };
 for(let i=0;i<3;i++)add(feather(),new THREE.Matrix4().makeRotationZ(i*Math.PI*2/3),
  i===0?0x963f37:0xe6d7b6,p=>.88+.12*Math.cos((p.z+.6)*31));
 // A split nock leaves a real slot for the bowstring at the back of the shaft.
 for(const x of [-.012,.012])add(new THREE.BoxGeometry(.012,.027,.06),
  new THREE.Matrix4().makeTranslation(x,0,HUNTER_ARROW_NOCK_Z+.03),0xb9a17a);
 const geometry=new THREE.BufferGeometry();geometry.name='NGW original hunter arrow';
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.actorShared=true;
 geometryCache.set(THREE,geometry);return geometry;
}
export function createHunterArrow(THREE){
 const arrow=new THREE.Group();arrow.name='hunter-arrow';
 arrow.userData.hunterArrow={nockZ:HUNTER_ARROW_NOCK_Z,tipZ:HUNTER_ARROW_TIP_Z,length:HUNTER_ARROW_LENGTH};
 const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,
  roughness:.74,metalness:.12});
 material.name='hunter-arrow-material';
 const mesh=new THREE.Mesh(arrowGeometry(THREE),material);
 mesh.name='hunter-arrow-art';mesh.castShadow=false;mesh.receiveShadow=false;
 arrow.add(mesh);return arrow;
}
