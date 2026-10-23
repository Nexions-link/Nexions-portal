// NexGameWorld NGW-ART-TREES-001 / T2: original reusable forest sculptures.
// Every tree has real 3D roots, branches and botanical silhouettes. No game
// logic, saved state, network APIs, external models, or invisible colliders.
import {mergeBarkParts} from './terrain-art-asset-polish.js';
import {createAncientPine,ANCIENT_PINE_METADATA} from './tree-library-ancient-pine.js?v=3';
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const fract=x=>x-Math.floor(x);
const hash=n=>fract(Math.sin(n*127.1+72.3)*43758.5453);
const sin=Math.sin,cos=Math.cos;

export const TREE_LIBRARY=Object.freeze([
 ANCIENT_PINE_METADATA,
 Object.freeze({id:'tree_oak_whispering',name:'Шепчущий дуб',version:'0.1.0',
  material:'bark_oak_ancient',foliage:'leaf_oak',height:25,site:1,origin:'original procedural NGW'}),
 Object.freeze({id:'tree_dead_sentinel',name:'Сухой страж',version:'0.1.0',
  material:'wood_dead_weathered',foliage:'none',height:20,site:2,origin:'original procedural NGW'}),
 Object.freeze({id:'tree_broadleaf_moss',name:'Мшистое широколиственное',version:'0.1.0',
  material:'bark_wet_moss',foliage:'leaf_dark',height:27,site:3,origin:'original procedural NGW'}),
 Object.freeze({id:'tree_root_ancient',name:'Древо корней',version:'0.1.0',
  material:'root_wood',foliage:'leaf_dark',height:22,site:4,origin:'original procedural NGW'})
]);
export const TREE_GALLERY_SITES=Object.freeze([
 [0.85,10.2],[-9.7,10.4],[10.8,-8.2],[-11.4,-7.8],[9.4,9.2]
].map(p=>Object.freeze(p)));
const STYLES=Object.freeze({
 tree_oak_whispering:Object.freeze({height:25,radius:2.08,roots:11,
  branches:28,leaf:1.0,moss:170,base:[111,87,62],shade:'#66804c',grooves:13,twist:1.40,
  crownStart:.38,reach:8.2,profile:1.28,lichen:.20}),
 tree_dead_sentinel:Object.freeze({height:20,radius:1.64,roots:8,
  branches:24,leaf:0,moss:0,base:[157,149,132],shade:'#8a887b',grooves:21,twist:.94,
  crownStart:.35,reach:6.2,profile:1.16,lichen:.68}),
 tree_broadleaf_moss:Object.freeze({height:27,radius:1.80,roots:11,
  branches:30,leaf:1.20,moss:440,base:[81,80,67],shade:'#365d42',grooves:16,twist:.86,
  crownStart:.42,reach:8.0,profile:1.31,lichen:.42}),
 tree_root_ancient:Object.freeze({height:22,radius:2.45,roots:15,
  branches:23,leaf:.67,moss:280,base:[119,96,70],shade:'#5d7951',grooves:12,twist:2.25,
  crownStart:.40,reach:6.6,profile:1.49,lichen:.24})
});
export function forestBarkSample(id,u,v){
 const st=STYLES[id];if(!st)throw new RangeError('Unknown forest bark: '+id);
 u=fract(u);v=fract(v);
 const isDead=id==='tree_dead_sentinel',isWet=id==='tree_broadleaf_moss';
 const warp=.046*sin(TAU*(v*3+sin(TAU*u*3)*.12))+.028*sin(TAU*(v*11-u*2));
 const plate=.5+.5*cos(TAU*(st.grooves*(u+warp*.10)+sin(TAU*v*2)*.19));
 const cracked=Math.pow(plate,isDead?20:14);
 const scales=.5+.5*sin(TAU*(v*(isDead?14:23)+.26*sin(TAU*u*3)));
 const grain=.5+.5*sin(TAU*(u*63+v*37+.08*sin(TAU*u*9)));
 const notch=.5+.5*cos(TAU*(u*7-v*9));
 const height=clamp(.34+.26*scales+.17*notch+.07*grain-.34*cracked,.03,.89);
 const damp=isWet?.77:1;
 const lime=(isDead?.14:st.lichen*.24)*(.5+.5*sin(TAU*(u*9+v*16)))*(.4+.6*notch);
 const brightness=clamp((.39+.81*height-.11*cracked)*damp,.14,.99);
 const color=st.base.map((c,i)=>Math.round(clamp(c*brightness+(i===1?90:50)*lime,0,255)));
 const roughness=clamp((isWet?.82:.92)+.08*cracked-.07*height,.72,1);
 return {color:[...color,255],height,roughness};
}
export function createForestBarkMaps(THREE,id,{width=512,height=1024}={}){
 if(!STYLES[id])throw new RangeError('Invalid species');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||
    width>4096||height>8192)throw new RangeError('Invalid bark atlas size');
 const albedo=new Uint8Array(width*height*4),relief=new Uint8Array(albedo.length),
  normal=new Uint8Array(albedo.length),rough=new Uint8Array(albedo.length);
 const field=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,i=p*4,s=forestBarkSample(id,(x+.5)/width,(y+.5)/height);
  albedo.set(s.color,i);field[p]=s.height;
  const h=Math.round(s.height*255),r=Math.round(s.roughness*255);
  relief.set([h,h,h,255],i);rough.set([r,r,r,255],i);
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  const dx=(field[y*width+(x+1)%width]-field[y*width+(x+width-1)%width])*3,
   dy=(field[((y+1)%height)*width+x]-field[((y+height-1)%height)*width+x])*3;
  const len=Math.hypot(dx,dy,1);
  normal.set([Math.round(127.5*(1-dx/len)),Math.round(127.5*(1-dy/len)),
   Math.round(127.5*(1+1/len)),255],i);
 }
 const texture=(bytes,srgb,label)=>{
  const t=new THREE.DataTexture(bytes,width,height,THREE.RGBAFormat);
  t.name='NGW '+id+' '+label;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
  t.anisotropy=8;t.generateMipmaps=true;t.needsUpdate=true;return t;
 };
 return {map:texture(albedo,true,'albedo'),normalMap:texture(normal,false,'normal'),
  roughnessMap:texture(rough,false,'roughness'),heightMap:texture(relief,false,'height')};
}
export function trunkCenterAt(id,t,seed=17){
 const st=STYLES[id];if(!st)throw new RangeError('Unknown tree');
 return [st.twist*sin(t*2.86+seed*.047)*Math.pow(t,1.35),
  st.twist*.71*cos(t*3.6+seed*.061)*Math.pow(t,1.28)];
}
export function forestTrunkRadius(id,t,angle,seed=17){
 const st=STYLES[id];if(!st)throw new RangeError('Unknown tree');
 const flare=st.radius*.55*Math.exp(-Math.pow(t/.10,2));
 const base=mix(st.radius,st.radius*.095,Math.pow(clamp(t),.73));
 const facet=1+.072*cos(angle*7+seed*.09+t*11)+.038*sin(angle*13-t*21);
 const ridge=.075*sin(angle*st.grooves+t*15+seed*.11)+
  .040*cos(angle*27-t*57);
 return Math.max(.035,(base+flare)*facet+ridge);
}
function pathTube(THREE,points,radii,{sides=10}={}){
 const xyz=[],uv=[],indices=[];
 for(let i=0;i<points.length;i++){
  const p=new THREE.Vector3(...points[i]),prev=new THREE.Vector3(...points[Math.max(0,i-1)]),
   next=new THREE.Vector3(...points[Math.min(points.length-1,i+1)]),
   tangent=next.sub(prev).normalize();
  if(tangent.lengthSq()<.5)tangent.set(0,1,0);
  const ref=Math.abs(tangent.y)>.94?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  const b=new THREE.Vector3().crossVectors(tangent,ref).normalize(),
   c=new THREE.Vector3().crossVectors(b,tangent).normalize();
  for(let j=0;j<=sides;j++){
   const a=j*TAU/sides,r=radii[i],p2=p.clone()
    .addScaledVector(b,r*cos(a)).addScaledVector(c,r*sin(a));
   xyz.push(p2.x,p2.y,p2.z);uv.push(j/sides,i/(points.length-1)*2);
   if(i<points.length-1&&j<sides){
    const q=i*(sides+1)+j;
    indices.push(q,q+sides+1,q+1,q+1,q+sides+1,q+sides+2);
   }
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function trunkGeometry(THREE,id,seed){
 const st=STYLES[id],rows=110,sides=80,vertices=[],uv=[],indices=[];
 for(let i=0;i<=rows;i++){
  const t=i/rows,[cx,cz]=trunkCenterAt(id,t,seed);
  for(let j=0;j<=sides;j++){
   const a=j*TAU/sides,rad=forestTrunkRadius(id,t,a,seed);
   const end=id==='tree_dead_sentinel'?1.0-.08*(1+sin(a*7+seed)):1;
   const y=st.height*(i===rows?end:t);
   vertices.push(cx+cos(a)*rad,y,cz+sin(a)*rad);
   uv.push(j/sides,t*3);
   if(i<rows&&j<sides){
    const q=i*(sides+1)+j;indices.push(q,q+sides+1,q+1,q+1,q+sides+1,q+sides+2);
   }
  }
 }
 // Old hollow sentinel: actual visible inner cavity and irregular broken rim.
 if(id==='tree_dead_sentinel'){
  const last=rows*(sides+1),firstInner=vertices.length/3;
  const [cx,cz]=trunkCenterAt(id,1,seed);
  for(let i=0;i<=9;i++){
   const down=i/9;
   for(let j=0;j<=sides;j++){
    const a=j*TAU/sides,outer=forestTrunkRadius(id,1,a,seed),
     wall=outer*(.35+.06*sin(a*9)),y=st.height*(.92-.18*down-.08*sin(a*7+seed));
    vertices.push(cx+cos(a)*wall,y,cz+sin(a)*wall);uv.push(j/sides,3+down*.25);
    if(i<9&&j<sides){
     const q=firstInner+i*(sides+1)+j;
     indices.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1);
    }
   }
  }
  for(let j=0;j<sides;j++){
   const a=last+j,b=last+j+1,c=firstInner+j,d=firstInner+j+1;
   indices.push(a,c,b,b,c,d);
  }
 }
 const g=new THREE.BufferGeometry();g.setIndex(indices);
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function leafClusterGeometry(THREE,id){
 const vertices=[],colors=[];
 const moss=id==='tree_broadleaf_moss',gnarl=id==='tree_root_ancient';
 const count=moss?20:gnarl?13:17;
 for(let i=0;i<count;i++){
  const a=i*2.39996,j=hash(i*67+9),len=.43+.48*j;
  const y=(hash(i*19)-.5)*.61,w=.14+.12*hash(i*39);
  const vx=cos(a),vz=sin(a),sideX=-vz,sideZ=vx;
  const start=[vx*.08,y,vz*.08],mid=[vx*len*.58,y+.18, vz*len*.58],
   tip=[vx*len*1.12,y+(moss?-.36:.22)+.16*j,vz*len*1.12],
   edgeA=[mid[0]+sideX*w,mid[1]+.09,mid[2]+sideZ*w],
   edgeB=[mid[0]-sideX*w,mid[1]-.04,mid[2]-sideZ*w];
  for(const tri of [[start,edgeA,tip],[start,tip,edgeB]]){
   vertices.push(...tri.flat());
   const shade=.69+.24*hash(i*31+11);
   for(let v=0;v<3;v++)colors.push(shade*.78,shade,shade*.71);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function createForestLibraryTree(THREE,{id,seed=17,mapSize=512,
 groundHeight=()=>0}={}){
 if(id==='tree_pine_ancient')return createAncientPine(THREE,{seed,mapSize,groundHeight});
 const st=STYLES[id];if(!st)throw new RangeError('Unknown library tree: '+id);
 if(!Number.isFinite(seed)||typeof groundHeight!=='function')throw new TypeError('Invalid tree parameters');
 const meta=TREE_LIBRARY.find(x=>x.id===id);
 const group=new THREE.Group();group.name='NGW gallery '+id+' / visual-no-collision';
 group.userData.assetId=id;group.userData.collider=false;
 const mats=createForestBarkMaps(THREE,id,{width:mapSize,height:mapSize*2});
 const bark=new THREE.MeshStandardMaterial({map:mats.map,normalMap:mats.normalMap,
  roughnessMap:mats.roughnessMap,bumpMap:mats.heightMap,bumpScale:.11,roughness:1,
  normalScale:new THREE.Vector2(1.35,1.35),metalness:0,side:THREE.DoubleSide});
 const leaves=new THREE.MeshStandardMaterial({color:st.shade,vertexColors:true,
  roughness:.97,metalness:0,side:THREE.DoubleSide});
 const mossMat=new THREE.MeshStandardMaterial({color:'#507052',roughness:1,metalness:0});
 const materials=[bark,leaves,mossMat],textures=Object.values(mats),geometries=[],
  segments=[],objects=[],placements=[];
 const add=(g,mat,name,cast=true)=>{
  const m=new THREE.Mesh(g,mat);m.name=name;m.castShadow=cast;m.receiveShadow=true;
  group.add(m);objects.push(m);geometries.push(g);return m;
 };
 const shell=trunkGeometry(THREE,id,seed);
 add(shell,bark,id+' sculpted main trunk');
 for(let root=0;root<st.roots;root++){
  const a=TAU*root/st.roots+seed*.11,
   reach=(id==='tree_root_ancient'?5.7:3.8)*(.75+.45*hash(root*11+seed));
  const points=[],rads=[];
  for(let j=0;j<=18;j++){
   const t=j/18,angle=a+.24*sin(t*4+root),
    d=st.radius*.42+t*reach,rx=cos(angle)*d,rz=sin(angle)*d;
   const terrain=clamp(groundHeight(rx,rz),-1.5,1.5);
   points.push([rx,mix(.7,terrain-.045,t)+.24*sin(t*Math.PI),rz]);
   rads.push(Math.max(.012,mix(st.radius*.34,.018,Math.pow(t,.78))*
    (1+.15*sin(t*14+root*3))));
  }
  const rootGeom=pathTube(THREE,points,rads,{sides:14});
  segments.push(new THREE.Mesh(rootGeom,bark));
 }
 let boughs=0;
 for(let i=0;i<st.branches;i++){
  const phase=i/st.branches,t=st.crownStart+(1-st.crownStart)*phase,
   ang=i*2.39996+seed*.23+(i%3)*.20,
   level=st.height*t,asym=.72+.56*hash(i*41+seed),
   reach=st.reach*Math.pow(1-phase,.36)*asym,
   twist=id==='tree_root_ancient'?1.3:1;
  const [ox,oz]=trunkCenterAt(id,t,seed),
   endX=ox+cos(ang)*reach,endZ=oz+sin(ang)*reach;
  const droop=id==='tree_broadleaf_moss'?-1.65:id==='tree_dead_sentinel'?.55:-.35;
  const points=[],rads=[];
  for(let j=0;j<=20;j++){
   const f=j/20,bend=f*f*(.22*sin(i*19)+.20*twist);
   points.push([mix(ox,endX,f)+sin(ang)*bend,
    level+.7*sin(f*Math.PI)+droop*f*f, mix(oz,endZ,f)+cos(ang)*bend]);
   rads.push(Math.max(.012,mix(.36*(1-phase*.65),.016,Math.pow(f,.84))));
  }
  segments.push(new THREE.Mesh(pathTube(THREE,points,rads),bark));boughs++;
  for(let fork=0;fork<4;fork++){
   const f=.43+fork*.13,r=reach*f,sp=(fork%2?1:-1)*(.75+.37*hash(i*13+fork)),
    start=[ox+cos(ang)*r,level+.1,oz+sin(ang)*r],
    tip=[start[0]+cos(ang)*reach*.16-sin(ang)*sp,
     start[1]+.55+(fork%3)*.18+(droop<0?-.33*fork:0),
     start[2]+sin(ang)*reach*.16+cos(ang)*sp];
   segments.push(new THREE.Mesh(pathTube(THREE,[start,tip],[.075,.012],{sides:7}),bark));
   if(st.leaf)for(let n=0;n<8;n++){
    const along=(n+.5)/8;
    placements.push([mix(start[0],tip[0],along),mix(start[1],tip[1],along),
     mix(start[2],tip[2],along),ang, .54+hash(i*19+fork*13+n)*.61]);
   }
  }
 }
 const woody=mergeBarkParts(THREE,segments);
 for(const part of segments)part.geometry.dispose();
 add(woody,bark,id+' unified visible root and bough mesh');
 if(st.leaf){
  const shape=leafClusterGeometry(THREE,id);
  const tuft=new THREE.InstancedMesh(shape,leaves,placements.length);
  const obj=new THREE.Object3D(),color=new THREE.Color();
  for(let i=0;i<placements.length;i++){
   const [x,y,z,a,s]=placements[i],tone=hash(i*37+seed);
   obj.position.set(x,y,z);obj.rotation.set(hash(i*17)*.7,a,hash(i*23)*TAU);
   obj.scale.set(s,s*(id==='tree_broadleaf_moss'?1.23:.89),s);
   obj.updateMatrix();tuft.setMatrixAt(i,obj.matrix);
   color.setHSL((id==='tree_broadleaf_moss'?.36:.26)+tone*.045,
    .19+tone*.14,.27+tone*.19);
   tuft.setColorAt(i,color);
  }
  tuft.instanceMatrix.needsUpdate=true;tuft.instanceColor.needsUpdate=true;
  tuft.frustumCulled=false;tuft.name=id+' 3D leaves';tuft.castShadow=false;
  group.add(tuft);geometries.push(shape);
 }
 if(st.moss){
  const mg=new THREE.IcosahedronGeometry(1,2),moss=new THREE.InstancedMesh(mg,mossMat,st.moss),
   obj=new THREE.Object3D();
  for(let i=0;i<st.moss;i++){
   const h=hash(i*17+seed)*7,a=hash(i*11+seed)*TAU;
   const t=h/st.height,r=forestTrunkRadius(id,t,a,seed)+.032,[cx,cz]=trunkCenterAt(id,t,seed);
   obj.position.set(cx+cos(a)*r,h,cz+sin(a)*r);
   obj.rotation.set(hash(i*13)*TAU,hash(i*19)*TAU,hash(i*23)*TAU);
   const size=.035+hash(i*29)*.13;
   obj.scale.set(size*.7,size*1.23,size*.38);obj.updateMatrix();moss.setMatrixAt(i,obj.matrix);
  }
  moss.instanceMatrix.needsUpdate=true;moss.frustumCulled=false;
  moss.name=id+' volumetric bark moss';group.add(moss);geometries.push(mg);
 }
 if(id==='tree_dead_sentinel'){
  // Open raw broken-wood sockets; actual negative space at the crown.
  const c=new THREE.MeshStandardMaterial({color:'#292924',roughness:1,side:THREE.DoubleSide});
  materials.push(c);
  const cavity=new THREE.Mesh(new THREE.CylinderGeometry(.12,.42,1.1,18,2,true),c);
  const [x,z]=trunkCenterAt(id,.97,seed);
  cavity.position.set(x,st.height*.82,z);cavity.name=id+' dark hollow interior';
  group.add(cavity);geometries.push(cavity.geometry);
 }
 group.userData.geometryCounts={branches:boughs,roots:st.roots,
  leafClusters:placements.length,mossPatches:st.moss,height:st.height};
 return {group,maps:mats,metadata:meta,
  dispose(){group.parent?.remove(group);for(const g of geometries)g.dispose();
   for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
