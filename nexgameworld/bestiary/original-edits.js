// Parametric edits of the ACTUAL authored GLB, not the temporary 3D reconstruction.
// Edits intentionally avoid Body.scale and animated rotations, since the GLB's
// Idle/Walk/Peck clips own those channels.
export function isDolgonogRig(root){
 return ['Body_mesh','Neck','Head_mesh','Wing_L','Wing_R'].every(n=>!!root.getObjectByName(n));
}
const baseColors=new WeakMap();
const basePositions=new WeakMap();
const baselinePalette={plumage:'#a98658',wings:'#47392f',crestColor:'#b35c3e'};
function ratio(THREE,tint,baseline){
 const a=new THREE.Color(tint),b=new THREE.Color(baseline);
 return [Math.min(2.5,a.r/Math.max(.03,b.r)),
         Math.min(2.5,a.g/Math.max(.03,b.g)),
         Math.min(2.5,a.b/Math.max(.03,b.b))];
}
export function applyOriginalDolgonogEdits(THREE,root,params){
 if(!isDolgonogRig(root))return false;
 const p=params;
 const body=root.getObjectByName('Body_mesh'),
  neck=root.getObjectByName('Neck'),
  head=root.getObjectByName('Head_mesh'),
  wingL=root.getObjectByName('Wing_L_mesh'),wingR=root.getObjectByName('Wing_R_mesh'),
  tail=root.getObjectByName('Tail_mesh');
 // Mesh transforms do not conflict with root Bone/Node animation channels.
 body.scale.set(p.body,p.body,p.body);
 neck.scale.set(1,p.neck,1);
 for(const m of [wingL,wingR,tail])if(m)m.scale.set(p.feathers,p.feathers,p.feathers);
 const crestThreshold=.34;
 const pos=head.geometry.attributes.position;
 let original=basePositions.get(pos);
 if(!original){
  original=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){const k=i*3;original[k]=pos.getX(i);original[k+1]=pos.getY(i);original[k+2]=pos.getZ(i)}
  basePositions.set(pos,original);
 }
 for(let i=0;i<pos.count;i++){
  const n=i*pos.itemSize;
  const x=original[n],y=original[n+1],z=original[n+2];
  // On this specific rig the five crest plumes sit above the skull toward
  // the back, in local head-space. Don't move beak, eyes or cheeks.
  const fade=Math.min(1,Math.max(0,(y-crestThreshold)/.10))*
    Math.min(1,Math.max(0,(.27-z)/.16));
  pos.setXYZ(i,x,y+(y-crestThreshold)*(p.crest-1)*fade,z);
 }
 pos.needsUpdate=true;head.geometry.computeVertexNormals();
 head.geometry.computeBoundingSphere();head.geometry.computeBoundingBox();
 const coat=ratio(THREE,p.plumage,baselinePalette.plumage);
 const wings=ratio(THREE,p.wings,baselinePalette.wings);
 const crest=ratio(THREE,p.crestColor,baselinePalette.crestColor);
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry)return;
  const originalName=mesh.name;
  const attribute=mesh.geometry.getAttribute('color');if(!attribute)return;
  let colors=baseColors.get(attribute);
  if(!colors){
   colors=new Float32Array(attribute.count*3);
   for(let i=0;i<attribute.count;i++){const k=i*3;colors[k]=attribute.getX(i);colors[k+1]=attribute.getY(i);colors[k+2]=attribute.getZ(i)}
   baseColors.set(attribute,colors);
  }
  const multiplier=originalName.startsWith('Wing_')?wings:coat;
  const headMesh=originalName==='Head_mesh';
  const positions=mesh.geometry.getAttribute('position');
  const rest=headMesh?basePositions.get(positions):null;
  for(let i=0;i<attribute.count;i++){
   const index=i*3;
   const y=rest?rest[index+1]:positions.getY(i);
   const z=rest?rest[index+2]:positions.getZ(i);
   const crestMask=headMesh&&y>.34&&z<.27?
    Math.min(1,(y-.34)/.16)*Math.min(1,(.27-z)/.18):0;
   const t=[];
   for(let channel=0;channel<3;channel++){
    const gain=multiplier[channel]*(1-crestMask)+crest[channel]*crestMask;
    t.push(Math.max(0,Math.min(1,colors[index+channel]*gain)));
   }
   attribute.setXYZ(i,t[0],t[1],t[2]);
  }
  attribute.needsUpdate=true;
 });
 return true;
}
