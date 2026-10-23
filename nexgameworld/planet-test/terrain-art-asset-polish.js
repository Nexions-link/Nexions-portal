// P2.4.3: improve the SAME trees, crowns, rocks and cut timber.
// Geometry upgrades are replacements, not new scene props or populations.
// Authored locally for NexGameWorld; no imported textures or third-party art.
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=n=>{let t=(n>>>0)+0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};

export function crownSurfaceSample(x,y,z){
 const n=Math.hypot(x,y,z)||1,px=x/n,py=y/n,pz=z/n;
 const lobe=Math.sin(7*px+2.8*pz)*Math.cos(5.4*py-4*pz);
 const whorl=Math.cos(12*px+5*pz)*Math.sin(11*py-4*px);
 const torn=Math.sin(21*px+13*pz+2*py)*Math.cos(17*pz-7*py);
 // Distinct clumps and broken feathered edges rather than a smooth ball.
 const radius=1+.105*lobe+.055*whorl+.027*torn+.045*py;
 const leafShade=clamp(.76+.17*py+.10*whorl+.09*torn,.43,1.05);
 return {radius,shade:leafShade};
}
export function createDetailedCrownGeometry(THREE,{far=false}={}){
 const source=new THREE.IcosahedronGeometry(1,far?1:2);
 const geo=source.index?source.toNonIndexed():source;
 if(geo!==source)source.dispose();
 const p=geo.getAttribute('position'),colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),s=crownSurfaceSample(x,y,z);
  p.setXYZ(i,x*s.radius,y*s.radius,z*s.radius);
  colors.push(clamp(s.shade+.06),clamp(s.shade+.05),clamp(s.shade-.09));
 }
 // The foliage silhouette is broken into readable tapered, folded leaves.
 // These leaflets live INSIDE the existing crown geometry, not extra meshes.
 const positions=Array.from(p.array),shades=colors.slice();
 const leafCount=far?22:125;
 for(let i=0;i<leafCount;i++){
  const phi=TAU*hash(i*7+124),y=hash(i*11+837)*1.94-.97;
  const rad=Math.sqrt(Math.max(0,1-y*y));
  const nx=Math.cos(phi)*rad,nz=Math.sin(phi)*rad;
  const center=[nx,y,nz],tangent=[-Math.sin(phi),0,Math.cos(phi)];
  const bitangent=[-y*Math.cos(phi),rad,-y*Math.sin(phi)];
  const lean=(hash(i+607)-.5)*.44,length=(far?.17:.20)+hash(i+15)*.18;
  const width=(far?.058:.066)+hash(i+71)*.078;
  const r=crownSurfaceSample(...center).radius+.025;
  const v=(along,across,depth=0)=>center.map((c,k)=>c*(r+depth)+
   tangent[k]*(along+lean*along+across*.13)+bitangent[k]*across);
  const a=v(-length*.42,-width*.5),b=v(length*.16,width*.75,.09);
  const c=v(length*.85,0,.18),d=v(length*.07,-width*.8,.085);
  const dark=.66+.26*hash(i*5+99);
  const lit=[dark*.94,dark*1.05,dark*.78],mid=[dark*1.10,dark*1.11,dark*.83];
  const push=(a,b,c,tints)=>{
   positions.push(...a,...b,...c);
   for(const tint of tints)shades.push(...tint.map(v=>clamp(v,0,1.12)));
  };
  push(a,b,c,[lit,mid,mid]);push(a,c,d,[lit,mid,lit]);
 }
 const out=new THREE.BufferGeometry();
 out.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 out.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));
 out.computeVertexNormals();out.computeBoundingSphere();
 geo.dispose();
 out.name=far?'NGW detailed distant foliage silhouette':'NGW layered folded leaf crown';
 return out;
}
export function createRidgedBarkSegment(THREE,rStart,rEnd,length,{radial=12,heightSegments=9}={}){
 if(!(length>0&&rStart>0&&rEnd>=0))throw new RangeError('Invalid branch');
 const g=new THREE.CylinderGeometry(rEnd,rStart,length,radial,heightSegments);
 const p=g.getAttribute('position'),uv=g.getAttribute('uv'),col=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const a=Math.atan2(z,x),t=y/length+.5;
  const groove=.035*Math.cos(13*a+Math.sin(5*t)*.34)+
   .012*Math.sin(29*a+17*t)+.014*Math.sin(31*t+4*a);
  const m=1+groove;
  p.setXYZ(i,x*m,y+.012*Math.sin(a*7+t*11),z*m);
  const shade=clamp(.85+.11*Math.cos(a*9+Math.sin(t*8))+.06*Math.sin(a*21+t*15),.54,1);
  col.push(shade*.92,shade*.88,shade*.82);
  // Bark fibres flow along trunks; UV repeat is tied to branch length.
  uv.setY(i,uv.getY(i)*Math.max(.6,length/5.2));
 }
 p.needsUpdate=true;uv.needsUpdate=true;
 g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
export function mergeBarkParts(THREE,parts){
 if(!parts.length)throw new RangeError('No bark parts');
 const xyz=[],norm=[],uv=[],col=[];
 for(const mesh of parts){
  mesh.updateMatrix();
  const converted=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  converted.applyMatrix4(mesh.matrix);
  const p=converted.getAttribute('position'),n=converted.getAttribute('normal'),
   tex=converted.getAttribute('uv'),tint=converted.getAttribute('color');
  for(let i=0;i<p.count;i++){
   xyz.push(p.getX(i),p.getY(i),p.getZ(i));
   norm.push(n.getX(i),n.getY(i),n.getZ(i));
   uv.push(tex?tex.getX(i):0,tex?tex.getY(i):0);
   col.push(tint?tint.getX(i):1,tint?tint.getY(i):1,tint?tint.getZ(i):1);
  }
  converted.dispose();
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 geo.computeBoundingSphere();
 return geo;
}
export function createDetailedRockGeometry(THREE,{large=false}={}){
 const g=new THREE.IcosahedronGeometry(1,large?3:2);
 const p=g.getAttribute('position'),colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const ridge=Math.sin(x*9.7+z*11.4)*Math.cos(y*11.2-x*7.3);
  const fissure=Math.pow(Math.abs(Math.sin(x*12.9+y*7.2-z*9.3)),15);
  const displaced=.94+.065*ridge+.055*Math.sin(x*4.8+y*7.6)-.066*fissure;
  p.setXYZ(i,x*displaced,y*displaced,z*displaced);
  const lichen=clamp((y*.43+.34*Math.sin(x*8.4+z*5.7))+.38,0,1);
  const shade=clamp(.78+.13*ridge-.12*fissure,.47,.99);
  colors.push((.76-.19*lichen)*shade,
   (.81-.075*lichen)*shade,(.84-.21*lichen)*shade);
 }
 p.needsUpdate=true;
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.computeVertexNormals();g.computeBoundingSphere();
 g.name='NGW sculpted weathered original granite';
 return g;
}
export function createCutWoodTextures(THREE,{size=256}={}){
 if(size<64||size>512)throw new RangeError('Invalid wood atlas');
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=(x+.5-size/2)/(size*.5),py=(y+.5-size/2)/(size*.5);
  const r=Math.hypot(px,py),a=Math.atan2(py,px);
  const wiggle=.028*Math.sin(a*7+r*16)+.016*Math.cos(a*13-r*11);
  const rings=.5+.5*Math.cos((r+wiggle)*119+Math.sin(a*8+r*15)*.8);
  const crack=Math.pow(Math.abs(Math.sin(a*6.5+Math.cos(r*10))),22)*
   Math.pow(clamp((r-.18)/.7),1.6);
  const medulla=1-clamp(r*8);
  const bark=clamp((r-.78)*5);
  const tone=clamp(.78+.16*rings-.29*crack+.11*medulla-.32*bark,.24,1);
  const i=(y*size+x)*4;
  data[i]=Math.round(194*tone);data[i+1]=Math.round(157*tone);
  data[i+2]=Math.round(110*tone);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.name='Original Stonewind growth rings';
 texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;
 texture.anisotropy=4;texture.needsUpdate=true;
 return texture;
}
