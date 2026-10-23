import {mergeBarkParts} from './terrain-art-asset-polish.js';
import {sculptedWoodPathGeometry,rootGrowthFlare,branchGrowthCollar,
 cambiumRadiusModifier} from './tree-library-wood-sculpture.js?v=1';
// NGW-ART-TREES-001 / T1. Original hero pine for the Stonewind art lab.
// Procedural master: no extracted game materials, gameplay hooks or colliders.
const TAU = Math.PI * 2;
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a+(b-a)*t;
const fract = v => v-Math.floor(v);
const hash = n => fract(Math.sin(n*127.1+43.7)*43758.5453);
const snoise = (u,v) => Math.sin(u*5.47+Math.cos(v*4.71)*.9)*Math.cos(v*3.89-u*1.61);
const smooth = t => t*t*(3-2*t);
const periodic = (x,y,px,py) => {
 const ix=Math.floor(x),iy=Math.floor(y),u=smooth(fract(x)),v=smooth(fract(y));
 const n=(a,b)=>hash(((a%px+px)%px)*179+((b%py+py)%py)*947);
 return mix(mix(n(ix,iy),n(ix+1,iy),u),mix(n(ix,iy+1),n(ix+1,iy+1),u),v);
};
export const ANCIENT_PINE_ID='tree_pine_ancient';
export const ANCIENT_PINE_METADATA=Object.freeze({
 id:ANCIENT_PINE_ID,name:'Древняя сосна',version:'0.1.1',author:'NexGameWorld original',
 height:28,collider:'none — art lab only',source:'deterministic Three.js meshes and maps',
 material:'bark_pine_old',view:'planet-test/terrain-art-lab.html'
});
// Maps repeat seamlessly in U and V. The height field drives BOTH relief
// pixels and geometric displacement, unlike a normal-map-only brown cylinder.
export function oldPineBarkSample(u,v){
 u=fract(u);v=fract(v);
 const rough=periodic(u*12,v*24,12,24);
 const medium=periodic(u*48,v*96,48,96);
 const fine=periodic(u*128,v*256,128,256);
 const warped=u+.018*Math.sin(TAU*v*4)+.014*(rough-.5);
 const plates=.5+.5*Math.cos(TAU*(13*warped+.08*Math.sin(TAU*3*v)));
 const fissure=Math.pow(plates,16)*(.70+.30*medium);
 const scale=.5+.5*Math.cos(TAU*(v*21+.14*Math.sin(TAU*3*u)));
 const ridges=.58+.25*(rough-.5)+.24*scale-.69*fissure+.09*(fine-.5);
 const height=clamp(.43+.38*ridges,.06,.94);
 const dark=clamp(.43+.52*height-.19*fissure,.15,.94);
 const grey=medium*.06;
 return {
  height,roughness:clamp(.91+.07*fissure-.08*height,.79,1),
  color:[Math.round(161*dark+grey*255),Math.round(111*dark+grey*181),
   Math.round(79*dark+grey*133),255]
 };
}
export function createOldPineMaps(THREE,{width=1024,height=2048}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width>4096||height>8192)
  throw new RangeError('Invalid bark map dimensions');
 const albedo=new Uint8Array(width*height*4),relief=new Uint8Array(width*height*4),
  rough=new Uint8Array(width*height*4);
 const heights=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,s=oldPineBarkSample((x+.5)/width,(y+.5)/height);
  albedo.set(s.color,i*4);heights[i]=s.height;
  const h=Math.round(s.height*255),r=Math.round(s.roughness*255);
  relief.set([h,h,h,255],i*4);rough.set([r,r,r,255],i*4);
 }
 const normal=new Uint8Array(width*height*4);
 // Tangent-space normal of the same height surface; no fake baked lighting.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,dx=(heights[y*width+(x+1)%width]-heights[y*width+(x+width-1)%width])*2.1,
   dy=(heights[((y+1)%height)*width+x]-heights[((y+height-1)%height)*width+x])*2.1;
  const len=Math.hypot(dx,dy,1),k=i*4;
  normal[k]=Math.round(127.5*(1-dx/len));
  normal[k+1]=Math.round(127.5*(1-dy/len));
  normal[k+2]=Math.round(127.5*(1+1/len));normal[k+3]=255;
 }
 const texture=(data,srgb,name)=>{
  const tex=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  tex.name=name;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
  tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
  tex.generateMipmaps=true;tex.anisotropy=8;tex.needsUpdate=true;return tex;
 };
 return {map:texture(albedo,true,'NGW old pine albedo'),
  normalMap:texture(normal,false,'NGW old pine normal'),
  roughnessMap:texture(rough,false,'NGW old pine roughness'),
  heightMap:texture(relief,false,'NGW old pine height / bump')};
}
function pineBranchAttachments(seed){
 const anchors=[];
 for(let layer=0;layer<16;layer++){
  const h=8+layer*1.07,count=layer<4?6:layer<12?7:5;
  for(let j=0;j<count;j++){
   const a=(j+(layer%2)*.46)*TAU/count+seed*.031;
   anchors.push({level:h,direction:a,weight:1-layer*.038});
  }
 }
 return anchors;
}
export function ancientPineTrunkRadius(y,angle,seed=7,collars=null){
 const t=clamp(y/28),base=mix(1.37,.13,Math.pow(t,.71));
 const flare=.67*Math.exp(-Math.pow(t/.075,2));
 const macro=1+.068*Math.sin(angle*7+seed*.17+t*8)+.034*Math.cos(angle*13-t*18);
 const plate=oldPineBarkSample(angle/TAU,t*3).height;
 const root=rootGrowthFlare(y,angle,{count:9,seed,phase:.11,jitter:.20,
  reach:.57,spread:.27,height:2.65});
 const collar=branchGrowthCollar(y,angle,collars||pineBranchAttachments(seed),
  {height:.25,strength:.12});
 const cambium=cambiumRadiusModifier(y,angle,seed,{grain:.083,grooves:12});
 const micro=.035*snoise(angle*2.4,t*19)+.020*Math.sin(angle*31+t*54);
 return Math.max(.085,(base+flare)*macro+root+collar+cambium+micro+.085*(plate-.5));
}
function pathGeometry(THREE,points,radii,{sides=18,seed=17,kind='branch'}={}){
 return sculptedWoodPathGeometry(THREE,points,radii,
  {sides,seed,character:kind==='root'?1.35:1.1,kind,subdivisions:4});
}
function createNeedleGeometry(THREE){
 const positions=[],colors=[];
 // Each instanced tuft has separately folded 3D needles with staggered tips.
 for(let i=0;i<34;i++){
  const a=i*2.39996,phase=hash(i*23+71),length=.34+phase*.42,
   spread=.12+.14*hash(i*13+2),dy=(hash(i*79+10)-.5)*.22;
  const root=[Math.cos(a)*.055,dy,Math.sin(a)*.055];
  const tip=[Math.cos(a)*spread,dy+length,Math.sin(a)*spread];
  const side=[Math.cos(a+.21)*spread*.59,dy+length*.42,Math.sin(a+.21)*spread*.59];
  const back=[Math.cos(a-.21)*spread*.59,dy+length*.42,Math.sin(a-.21)*spread*.59];
  for(const tri of [[root,side,tip],[root,tip,back]]){
   positions.push(...tri.flat());
   const shade=.57+.35*hash(i*5+13);
   for(let j=0;j<3;j++)colors.push(.48*shade,.71*shade,.50*shade);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 return g;
}
export function createAncientPine(THREE,{seed=17,mapSize=1024,groundHeight=()=>0}={}){
 if(!Number.isFinite(seed)||typeof groundHeight!=='function')throw new RangeError('Invalid pine seed or terrain');
 const group=new THREE.Group();group.name='NGW hero ancient pine T1 — no collisions';
 group.userData.assetId=ANCIENT_PINE_ID;
 const maps=createOldPineMaps(THREE,{width:mapSize,height:mapSize*2});
 const wood=new THREE.MeshStandardMaterial({color:'#ffffff',map:maps.map,normalMap:maps.normalMap,
  normalScale:new THREE.Vector2(1.3,1.3),roughnessMap:maps.roughnessMap,
  roughness:1,metalness:0,bumpMap:maps.heightMap,bumpScale:.105,side:THREE.DoubleSide});
 const needle=new THREE.MeshStandardMaterial({color:'#d2ddc9',roughness:1,metalness:0,
  vertexColors:true,side:THREE.DoubleSide});
 const mossMaterial=new THREE.MeshStandardMaterial({color:'#3d6549',roughness:1,metalness:0});
 const meshes=[],geometries=[],materials=[wood,needle,mossMaterial],textures=Object.values(maps);
 const add=(g,m,name,cast=true)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=cast;
  o.receiveShadow=true;group.add(o);meshes.push(o);geometries.push(g);return o;};
 // 28 m sculpted trunk, asymmetric in angle and height (actual silhouette relief).
 const trunk=new THREE.CylinderGeometry(.13,1.37,28,112,172,false);
 const collars=pineBranchAttachments(seed);
 const p=trunk.getAttribute('position'),uv=trunk.getAttribute('uv');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),y=p.getY(i)+14,a=Math.atan2(z,x);
  const r=ancientPineTrunkRadius(y,a,seed,collars),rr=Math.hypot(x,z)||1;
  p.setXYZ(i,x/rr*r,y,z/rr*r);
  uv.setY(i,uv.getY(i)*3.1);
 }
 p.needsUpdate=true;uv.needsUpdate=true;
 trunk.computeVertexNormals();trunk.computeBoundingSphere();
 add(trunk,wood,'Hero pine / fissured geometry bark');
 // Nine sweeping roots transition into the actual local ground. Art-lab
 // surface below remains untouched and there is deliberately no collider.
 for(let j=0;j<9;j++){
  const angle=j*TAU/9+.11*seed+hash(j*13)*.20,
   reach=2.2+1.15*hash(j*17+3),bend=(hash(j*71+4)-.5)*.8;
  const points=[],radii=[];
  for(let k=0;k<=12;k++){
   const t=k/12,rad=.69+reach*t,theta=angle+bend*t*t;
   const surface=clamp(groundHeight(Math.cos(theta)*rad,Math.sin(theta)*rad),-1.5,1.5);
   const y=mix(.36,surface-.05,t)+.20*Math.sin(Math.PI*t);
   points.push([Math.cos(theta)*rad,y,Math.sin(theta)*rad]);
   radii.push(Math.max(.018,mix(.64,.026,Math.pow(t,.76))*(1+.19*Math.sin(t*12+j*3))));
  }
  add(pathGeometry(THREE,points,radii,{sides:22,seed:seed+j*19,kind:'root'}),wood,
   'Hero pine / root '+j);
 }
 // Crown: layered age-distributed boughs, bare lower stem, open gaps,
 // nested secondary twigs. Pseudo-random but deterministic and reproducible.
 const placements=[];
 for(let layer=0;layer<16;layer++){
  const h=8+layer*1.07,whorlCount=layer<4?6:layer<12?7:5;
  for(let j=0;j<whorlCount;j++){
   const a=(j+(layer%2)*.46)*TAU/whorlCount+seed*.031,
    asym=.75+.42*hash(layer*97+j*11),reach=(6.7-layer*.27)*asym;
   const sx=.08*Math.sin(h*.22),sz=.12*Math.cos(h*.19),
    trunkR=ancientPineTrunkRadius(h,a,seed,collars);
   const px=sx+Math.cos(a)*reach,pz=sz+Math.sin(a)*reach;
   const ey=h-.48-(j%3)*.20+layer*.014;
   const pts=[[sx+Math.cos(a)*trunkR*.74,h,sz+Math.sin(a)*trunkR*.74],
    [sx+Math.cos(a)*reach*.30,h+.25,sz+Math.sin(a)*reach*.30],
    [sx+Math.cos(a)*reach*.66+Math.sin(a)*.15,h-.21,
     sz+Math.sin(a)*reach*.66-Math.cos(a)*.15],
    [px,ey,pz]],rs=[.29-.009*layer,.23-.008*layer,.082,.016];
   add(pathGeometry(THREE,pts,rs,{sides:16,seed:seed+layer*17+j*23}),wood,
    'Hero pine / primary bough '+layer+'-'+j,false);
   const primaryCurve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
   for(let twig=0;twig<5;twig++){
    const t=.40+twig*.13,spread=(twig%2?1:-1)*(.55+.25*hash(j*33+twig)),
     root=primaryCurve.getPoint(t),x=root.x,y=root.y,z=root.z;
    const end=[x+Math.cos(a)*reach*.16-Math.sin(a)*spread,
     y+.19+.09*twig,z+Math.sin(a)*reach*.16+Math.cos(a)*spread],
     mid=[mix(x,end[0],.51)+.11*Math.sin(t*19+layer),
      mix(y,end[1],.51)+.14,mix(z,end[2],.51)+.11*Math.cos(t*13+j)];
    add(pathGeometry(THREE,[[x,y,z],mid,end],[.068,.041,.009],
     {sides:11,seed:seed+layer*27+j*5+twig}),wood,
     'Hero pine / fork '+layer+'-'+j+'-'+twig,false);
    for(let k=0;k<4;k++){
     placements.push([mix(x,end[0],k/3),mix(y,end[1],k/3),mix(z,end[2],k/3),
      a+(k%2?-.42:.42),.55+.36*hash(layer*17+j*3+twig*5+k)]);
    }
   }
  }
 }
 const tuftGeom=createNeedleGeometry(THREE),tuft=new THREE.InstancedMesh(tuftGeom,needle,placements.length);
 const o=new THREE.Object3D(),tint=new THREE.Color();
 for(let i=0;i<placements.length;i++){
  const [x,y,z,a,s]=placements[i];
  o.position.set(x,y,z);o.rotation.set(Math.PI*.25+hash(i*15)*.7,a,hash(i*19)*TAU);
  o.scale.set(s*.82,s,s*.91);o.updateMatrix();tuft.setMatrixAt(i,o.matrix);
  tint.setHSL(.29+hash(i*71)*.05,.23+hash(i*9)*.09,.24+hash(i*31)*.14);
  tuft.setColorAt(i,tint);
 }
 tuft.instanceMatrix.needsUpdate=true;tuft.instanceColor.needsUpdate=true;
 tuft.name='Hero pine / layered individual 3D needle tufts';tuft.castShadow=false;tuft.frustumCulled=false;
 group.add(tuft);geometries.push(tuftGeom);
 const mossGeom=new THREE.IcosahedronGeometry(1,2),patches=260,
  moss=new THREE.InstancedMesh(mossGeom,mossMaterial,patches);
 for(let i=0;i<patches;i++){
  const h=hash(i*39+21)*5.4,a=hash(i*75+1)*TAU;
  const r=ancientPineTrunkRadius(h,a,seed,collars)+.025;
  o.position.set(Math.cos(a)*r,h,Math.sin(a)*r);
  o.rotation.set(hash(i*97)*TAU,hash(i*41)*TAU,hash(i*3)*TAU);
  const size=.025+hash(i*5+19)*.095;
  o.scale.set(size,size*(.65+hash(i*15)),size*.5);o.updateMatrix();
  moss.setMatrixAt(i,o.matrix);
 }
 moss.instanceMatrix.needsUpdate=true;moss.frustumCulled=false;
 moss.name='Hero pine / volumetric moss growing on bark';group.add(moss);geometries.push(mossGeom);
 // Merge the full sculpted branch/root geometry into one draw call without
 // reducing polygons or removing any detail. Prototype art stays lossless.
 const woodyParts=meshes.slice(1);
 const merged=mergeBarkParts(THREE,woodyParts);
 for(const part of woodyParts)group.remove(part);
 add(merged,wood,'Hero pine / merged root and branch sculpture');
 group.userData.geometryCounts={sculptedWood:true,rootButtresses:9,
  branchCollars:collars.length,branches:woodyParts.length-9,roots:9,needleTufts:placements.length,
  mossPatches:patches,height:28};
 return {group,maps,metadata:ANCIENT_PINE_METADATA,
  dispose(){group.parent?.remove(group);for(const g of geometries)g.dispose();
   for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
