// NexGame 3D · Alpha 0.2.7 — a small, procedural Mulgore-inspired starting zone.
const $=id=>document.getElementById(id);
let THREE;
try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js')}
catch(error){$('loadText').textContent='Не удалось загрузить 3D-движок. Проверь соединение и обнови страницу.';throw error}
try{
const clamp=THREE.MathUtils.clamp,TAU=Math.PI*2;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xaac9cd);scene.fog=new THREE.Fog(0xc1cbb0,65,166);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.09,230);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
$('scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe9ebc9,0x65502e,2.1));
const sun=new THREE.DirectionalLight(0xffe4ad,2.8);sun.position.set(-30,48,22);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.045;
scene.add(sun,sun.target);
let seed=531;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
function heightAt(x,z){const flat=smooth(10,29,Math.hypot(x+5,z-4));return flat*(Math.sin(x*.055)*Math.cos(z*.067)*1.65+Math.sin(z*.13+x*.047)*.6)}
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,...extra});
function texture(draw,size=128){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const grain=texture((ctx,s)=>{ctx.fillStyle='#b2b993';ctx.fillRect(0,0,s,s);for(let i=0;i<2200;i++){ctx.fillStyle=rand()>.5?'#bfc69b55':'#62744130';ctx.fillRect(rand()*s,rand()*s,1+rand()*3,1+rand()*3)}});grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(58,58);
const hide=texture((c,s)=>{c.fillStyle='#dbc39a';c.fillRect(0,0,s,s);for(let i=0;i<900;i++){c.fillStyle=rand()>.5?'#fff0ca18':'#53392313';c.fillRect(rand()*s,rand()*s,rand()*12,1)}c.strokeStyle='#6d3d2b';c.lineWidth=9;c.beginPath();for(let x=0;x<=s;x+=16){c.lineTo(x,40+(x%32?13:-13))}c.stroke();c.fillStyle='#ac5938';c.fillRect(0,54,s,12);c.fillStyle='#346c66';c.fillRect(0,74,s,6);c.fillStyle='#795034';c.fillRect(0,s-7,s,7)});hide.wrapS=THREE.RepeatWrapping;hide.repeat.set(3,1);
const M={grass:material(0x90a357,{map:grain,vertexColors:true}),dirt:material(0xa08c51),wood:material(0x5b3d24),woodLight:material(0x916139),hide:material(0xe0c899,{map:hide,side:THREE.DoubleSide}),hideDark:material(0x9b7449),red:material(0x9a4931),teal:material(0x427b70),gold:material(0xd7ae5e),bone:material(0xe5d5aa),rock:material(0x8a7250),rockLight:material(0xaa926c),rockDark:material(0x6e593c),leaf:material(0x718746),leafLight:material(0x98a253),black:material(0x231f19),metal:material(0x9caaa2,{roughness:.65,metalness:.2}),water:material(0x547d77,{roughness:.38,transparent:true,opacity:.85})};
const G={sphere:new THREE.SphereGeometry(1,12,9),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,9),rock:new THREE.DodecahedronGeometry(1,0)};
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g}
function mesh(parent,geometry,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,cast=true){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m}
const ell=(p,m,x,y,z,sx,sy,sz,cast=true)=>mesh(p,G.sphere,m,x,y,z,sx,sy,sz,cast);
const box=(p,m,x,y,z,sx,sy,sz,cast=true)=>mesh(p,G.box,m,x,y,z,sx,sy,sz,cast);
function rod(p,m,a,b,r=.08,r2=r,segments=7){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const obj=mesh(p,new THREE.CylinderGeometry(r2,r,d.length(),segments),m,...av.clone().add(bv).multiplyScalar(.5).toArray());obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return obj}
// Bake rigid pieces into one draw per material. Joint groups remain separate and animated.
function fuse(root,all=false){root.updateMatrixWorld(true);const list=[];if(all)root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)list.push(o)});else{for(const child of [...root.children])if(child.isGroup)fuse(child);for(const child of root.children)if(child.isMesh)list.push(child)}
 const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),batches=new Map();
 for(const m of list){if(Array.isArray(m.material))continue;const key=m.material.uuid+'-'+m.castShadow;let b=batches.get(key);if(!b){b={mat:m.material,cast:m.castShadow,p:[],n:[],uv:[]};batches.set(key,b)}
 const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(all?new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld):m.matrix);
 const pos=geo.attributes.position,norm=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++){b.p.push(pos.getX(i),pos.getY(i),pos.getZ(i));b.n.push(norm.getX(i),norm.getY(i),norm.getZ(i));b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0)}geo.dispose();m.removeFromParent();
 }
 for(const b of batches.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));mesh(root,geo,b.mat,0,0,0,1,1,1,b.cast)}
}
const world=group(scene),colliders=[],cameraBlockers=[],mapLandmarks=[];
function obstacle(x,z,r,height=5){colliders.push({x,z,r,height})}
function clearAt(x,z,r=.58){if(Math.abs(x)>69||Math.abs(z)>69)return false;for(const o of colliders)if((x-o.x)**2+(z-o.z)**2<(r+o.r)**2)return false;return true}
const terrainGeo=new THREE.PlaneGeometry(190,190,120,120);terrainGeo.rotateX(-Math.PI/2);
const tp=terrainGeo.attributes.position,colors=[];const ca=new THREE.Color(0x789044),cb=new THREE.Color(0xb1b76a),cc=new THREE.Color();
for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i);tp.setY(i,heightAt(x,z));cc.copy(ca).lerp(cb,.5+.24*Math.sin(x*.075+z*.04)+.13*Math.sin(x*.38-z*.22));colors.push(cc.r,cc.g,cc.b)}terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();mesh(scene,terrainGeo,M.grass,0,0,0,1,1,1,false);
const routes=[[[0,9],[-2,0],[-5,-12],[-8,-26],[-18,-42]],[[0,3],[13,5],[25,2],[38,-9]],[[0,9],[1,24],[12,37],[32,43]]];
const SCOUT_X=12,SCOUT_Z=37,BOSS_X=39,BOSS_Z=47;
const bossWaypoints=[[0,9],[1,24],[12,37],[32,43],[BOSS_X,BOSS_Z]];
// Crimson dashes mark the final hunting route in both the 3D world and map.
const bossGuide=new THREE.InstancedMesh(new THREE.BoxGeometry(.3,.05,1.0),
 new THREE.MeshBasicMaterial({color:0xd43835,transparent:true,opacity:.92,depthWrite:false}),80);
bossGuide.castShadow=false;bossGuide.receiveShadow=false;bossGuide.frustumCulled=false;
const dashDummy=new THREE.Object3D();let guideCount=0;
for(let step=0;step<bossWaypoints.length-1;step++){
 const [ax,az]=bossWaypoints[step],[bx,bz]=bossWaypoints[step+1];
 const dx=bx-ax,dz=bz-az,dist=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
 for(let d=.8;d<dist-.2;d+=2.15){
  const x=ax+dx*d/dist,z=az+dz*d/dist;
  dashDummy.position.set(x,heightAt(x,z)+.14,z);
  dashDummy.rotation.set(0,yaw,0);dashDummy.updateMatrix();
  bossGuide.setMatrixAt(guideCount++,dashDummy.matrix);
 }
}
bossGuide.count=guideCount;bossGuide.instanceMatrix.needsUpdate=true;
bossGuide.visible=false;scene.add(bossGuide);
const pathSegments=[];
function path(points,width){for(let k=0;k<points.length-1;k++){const [ax,az]=points[k],[bx,bz]=points[k+1];pathSegments.push({ax,az,bx,bz,width});const length=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/length*width/2,nz=(bx-ax)/length*width/2,steps=Math.ceil(length),p=[],uv=[];for(let i=0;i<steps;i++){const coords=[];for(const t of [i/steps,(i+1)/steps])for(const side of [-1,1]){const x=ax+(bx-ax)*t+nx*side,z=az+(bz-az)*t+nz*side;coords.push([x,heightAt(x,z)+.032,z])}for(const id of [0,1,2,1,3,2]){p.push(...coords[id]);uv.push(0,0)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();mesh(world,geo,M.dirt,0,0,0,1,1,1,false)}}
routes.forEach(r=>path(r,3.5));
function onPath(x,z){return pathSegments.some(s=>{const dx=s.bx-s.ax,dz=s.bz-s.az,t=clamp(((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-s.ax-dx*t,z-s.az-dz*t)<s.width*.6})}
// Sandstone mesas and a grassy upper rim enclose the playable valley.
for(let i=0;i<25;i++){const angle=i/25*TAU,rr=104+rand()*10,x=Math.sin(angle)*rr,z=Math.cos(angle)*rr,h=12+rand()*18,r=8+rand()*8,y=heightAt(x,z);const base=mesh(world,new THREE.CylinderGeometry(r*.8,r,h,8),i%3?M.rock:M.rockDark,x,y+h/2-2,z);base.rotation.y=rand();cameraBlockers.push(base);mesh(world,new THREE.CylinderGeometry(r*.82,r*.85,2.3,8),M.rockLight,x,y+h-2.8,z);mesh(world,new THREE.CylinderGeometry(r*.76,r*.82,1.3,8),M.leaf,x,y+h-1,z);}
function tent(x,z,r=4,rotation=0){const g=group(world,x,heightAt(x,z),z);g.rotation.y=rotation;const roof=mesh(g,new THREE.ConeGeometry(r,r*1.42,14,1,true),M.hide,0,r*.71,0);cameraBlockers.push(roof);mesh(g,new THREE.CylinderGeometry(r,r,.5,14,1,true),M.hideDark,0,.25,0);for(let i=0;i<9;i++){const a=i/9*TAU;rod(g,M.wood,[Math.sin(a)*r*.99,0,Math.cos(a)*r*.99],[Math.sin(a)*.25,r*1.64,Math.cos(a)*.25],.07,.055)}
 const door=mesh(g,new THREE.PlaneGeometry(r*.49,r*.65),M.black,0,r*.33,r*.72);door.rotation.x=-.53;box(g,M.red,0,r*.66,r*.55,r*.65,.12,.12);for(const s of [-1,1])rod(g,M.wood,[s*r*.29,.04,r*.98],[s*r*.2,r*.66,r*.55],.07);
 obstacle(x,z,r*.87,r*1.5);mapLandmarks.push({x,z,r,color:'#cbb17a'});return g}
tent(-12,-5,5,.5);tent(11,-7,4.2,-.5);tent(-15,12,3.8,2.2);tent(13,16,3.4,-1.7);tent(-23,-15,3,.5);
function totem(x,z,scale=1){const g=group(world,x,heightAt(x,z),z);g.scale.setScalar(scale);mesh(g,new THREE.CylinderGeometry(.48,.65,4.8,8),M.woodLight,0,2.4,0);for(let i=0;i<3;i++){const y=.9+i*1.25;mesh(g,new THREE.CylinderGeometry(.52,.53,.26,8),i%2?M.teal:M.red,0,y,0);box(g,M.bone,0,y+.43,.5,.67,.38,.13);for(const s of [-1,1])box(g,M.black,s*.2,y+.5,.58,.11,.09,.035);box(g,M.red,0,y+.28,.6,.14,.21,.15)}const wings=group(g,0,4.3,0);for(const s of [-1,1]){const w=box(wings,M.teal,s*1.15,0,0,2,.38,.3);w.rotation.z=s*.15;for(let i=0;i<4;i++){const f=box(wings,i%2?M.red:M.bone,s*(.65+i*.38),-.22,0,.18,.63,.16);f.rotation.z=s*.18}}ell(g,M.bone,0,5,0,.55,.43,.45);obstacle(x,z,.75*scale,5*scale);mapLandmarks.push({x,z,r:.8,color:'#73b9ae'});return g}
totem(-3,-5,1);totem(5,9,.75);totem(-5,25,.8);totem(35,-14,1.25);
function banner(x,z,angle){const g=group(world,x,heightAt(x,z),z);g.rotation.y=angle;rod(g,M.wood,[-1,0,0],[-1,4.6,0],.09);rod(g,M.wood,[1,0,0],[1,4.6,0],.09);rod(g,M.wood,[-1.25,4.3,0],[1.25,4.3,0],.09);mesh(g,new THREE.PlaneGeometry(1.85,2.1),M.hide,0,3.15,0);obstacle(x-1,z,.15);obstacle(x+1,z,.15)}
banner(-4,19,.2);banner(5,-14,-.1);
// Camp hearth. Only two flame meshes animate; there is no particle simulation.
const hearth=group(world,-6,heightAt(-6,7),7);for(let i=0;i<9;i++){const a=i/9*TAU;ell(hearth,M.rock,Math.sin(a)*1.15,.19,Math.cos(a)*1.15,.34,.23,.29)}for(let i=0;i<3;i++){const log=mesh(hearth,G.cylinder,M.wood,0,.25,0,.18,1.9,.18);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/3}obstacle(-6,7,1.05,1.3);
const fire=group(scene,-6,heightAt(-6,7)+.25,7);const flameM=new THREE.MeshBasicMaterial({color:0xf6a044,transparent:true,opacity:.85});mesh(fire,G.cone,flameM,0,.47,0,.55,1.3,.55,false);mesh(fire,G.cone,new THREE.MeshBasicMaterial({color:0xffda79}),0,.3,.04,.28,.85,.3,false);
for(let i=0;i<38;i++){const x=(rand()-.5)*136,z=(rand()-.5)*136;if(Math.hypot(x,z)<23||onPath(x,z)||!clearAt(x,z,3))continue;const size=.8+rand()*1.8;mesh(world,G.rock,i%2?M.rock:M.rockLight,x,heightAt(x,z)+size*.34,z,size,size*.7,size*.9);obstacle(x,z,size*.7,size)}
function tree(x,z,scale){const y=heightAt(x,z),g=group(world,x,y,z);g.scale.setScalar(scale);rod(g,M.wood,[0,0,0],[.2,4.2,0],.33,.15);for(const s of [-1,1])rod(g,M.wood,[0,2,0],[s*1.6,4.8,.2],.18,.07);ell(g,M.leaf,-1.4,4.8,0,2.4,.9,1.75);ell(g,M.leafLight,1.4,5,.2,2.1,.95,1.6);ell(g,M.leaf,0,5.65,0,2.5,.85,1.8);obstacle(x,z,.4*scale,5*scale)}
for(const [x,z,s] of [[-26,21,1.2],[25,22,1],[34,-26,.95],[-34,-30,1.15],[9,49,1.2],[-39,40,1.1],[46,31,1.3],[50,-8,.8],[-47,-7,1.1]])tree(x,z,s);
const pond=mesh(world,new THREE.CircleGeometry(6,36),M.water,26,heightAt(26,29)+.05,29,1,1,1,false);pond.rotation.x=-Math.PI/2;pond.scale.set(1.4,.72,1);
// Shallow water is traversable: actors follow the terrain beneath its surface.
// Sparse, instanced grass keeps the large meadow inexpensive on phones.
const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.18,0,0,.03,.7,.03,.16,0,0,0,0,-.17,.04,.52,0,0,0,.18],3));grassGeo.computeVertexNormals();
const grass=new THREE.InstancedMesh(grassGeo,material(0x718643,{side:THREE.DoubleSide}),1100),dummy=new THREE.Object3D();let grassCount=0;
for(let i=0;i<1900&&grassCount<1100;i++){const x=(rand()-.5)*139,z=(rand()-.5)*139;if(!clearAt(x,z,.15)||onPath(x,z)||Math.hypot(x+5,z-4)<8)continue;dummy.position.set(x,heightAt(x,z),z);dummy.rotation.y=rand()*TAU;dummy.scale.setScalar(.45+rand()*.75);dummy.updateMatrix();grass.setMatrixAt(grassCount,dummy.matrix);grass.setColorAt(grassCount,new THREE.Color().setHSL(.17+rand()*.055,.35,.31+rand()*.14));grassCount++}grass.count=grassCount;grass.instanceMatrix.needsUpdate=true;scene.add(grass);
fuse(world,true);
// Soft contact shadows stay directly on the terrain underneath each actor.
const shadowTexture=texture((c,s)=>{const grad=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);grad.addColorStop(0,'rgba(22,22,10,.48)');grad.addColorStop(.4,'rgba(22,22,10,.24)');grad.addColorStop(1,'rgba(22,22,10,0)');c.fillStyle=grad;c.fillRect(0,0,s,s)},64);
const shadowMat=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});
function contactShadow(size){const m=mesh(scene,new THREE.PlaneGeometry(size,size),shadowMat,0,.04,0,1,1,1,false);m.rotation.x=-Math.PI/2;return m}
function makeTauren({fur=0x795033,cloth=M.red,weapon=false,scale=1}={}){
 const root=group(scene),body=group(root,0,1.4,0),chest=group(body),neck=group(chest,0,1.22,.3),head=group(neck),pelt=material(fur),dark=material(0x382a20),muzzle=material(0xb49a72),hoof=material(0x302c25);
 ell(chest,pelt,0,.77,-.08,.95,.89,.57);ell(chest,dark,0,1.02,-.31,.79,.86,.39);ell(chest,pelt,0,.22,.05,.6,.52,.43);
 // Heavy, forward-set head, wide muzzle, swept horns and a dark mane.
 ell(head,pelt,0,.04,.12,.53,.61,.46);ell(head,muzzle,0,-.2,.55,.49,.29,.34);ell(head,dark,0,.46,-.08,.42,.33,.4);
 for(const s of [-1,1]){
  ell(head,pelt,s*.58,.13,.07,.33,.15,.19).rotation.z=s*.2;
  ell(head,dark,s*.24,.13,.48,.16,.083,.065).rotation.z=-s*.17;
  ell(head,M.bone,s*.23,.11,.527,.065,.044,.025);ell(head,M.black,s*.225,.11,.553,.025,.039,.015);
  ell(head,dark,s*.19,-.16,.842,.071,.045,.026);
  const points=[new THREE.Vector3(s*.39,.34,-.06),new THREE.Vector3(s*.73,.35,-.12),new THREE.Vector3(s*.97,.6,-.14),new THREE.Vector3(s*.99,.91,-.04)];
  for(let i=0;i<points.length-1;i++)rod(head,i===0?muzzle:M.bone,points[i].toArray(),points[i+1].toArray(),.19-i*.055,i===2?.008:.14-i*.055,8);
 }
 const noseRing=mesh(head,new THREE.TorusGeometry(.09,.021,6,12),M.gold,.09,-.32,.85);noseRing.rotation.y=.12;
 const beard=mesh(head,G.cone,dark,0,-.6,.32,.26,.66,.25);beard.rotation.z=Math.PI;
 const braids=[];for(const s of [-1,1]){const b=group(head,s*.38,-.25,.29);ell(b,dark,0,-.23,0,.115,.38,.11);mesh(b,G.cylinder,M.teal,0,-.43,0,.12,.13,.12);braids.push(b)}
 mesh(body,G.cylinder,M.wood,0,-.05,0,.63,.19,.46);box(body,M.gold,0,-.04,.465,.28,.24,.08);
 // Front and back leather skirt panels; the leg joints remain free below them.
 for(const z of [-.39,.42]){const skirt=box(body,cloth,0,-.3,z,.77,.65,.1);skirt.rotation.x=z>0?-.1:.1;box(body,M.bone,0,-.25,z+(z>0?.07:-.07),.15,.47,.04)}
 const arms=[];for(const s of [-1,1]){const shoulder=group(chest,s*.95,.95,.02),elbow=group(shoulder,0,-.61,.015),hand=group(elbow,0,-.56,.035);ell(shoulder,pelt,0,-.13,0,.34,.48,.36);ell(shoulder,s===1?M.hideDark:cloth,0,.04,-.015,.43,.27,.4);ell(elbow,pelt,0,-.24,0,.28,.36,.29);mesh(elbow,G.cylinder,M.wood,0,-.44,0,.29,.19,.28);ell(hand,pelt,0,-.07,.01,.27,.23,.24);arms.push({shoulder,elbow,hand})}
 const legs=[];for(const s of [-1,1]){const hip=group(root,s*.43,1.4,0),knee=group(hip,0,-.72,0),foot=group(knee,0,-.68,0);ell(hip,pelt,0,-.22,0,.3,.45,.3);ell(knee,pelt,0,-.28,0,.23,.38,.23);for(const dx of [-.105,.105])box(foot,hoof,dx,-.04,.11,.195,.34,.53);legs.push({hip,knee,foot,sign:s})}
 const tail=group(body,0,.05,-.4);rod(tail,pelt,[0,0,0],[0,-.78,-.42],.065,.04);ell(tail,dark,0,-.8,-.44,.13,.22,.13);
 if(weapon){const axe=group(arms[1].hand,0,-.12,.03);rod(axe,M.wood,[0,-.8,0],[0,.77,0],.065);for(const y of [-.55,-.4,-.25])mesh(axe,G.cylinder,M.hideDark,0,y,0,.077,.08,.077);const blade=new THREE.Shape();blade.moveTo(-.08,.7);blade.lineTo(.39,.93);blade.quadraticCurveTo(.66,.6,.51,.26);blade.lineTo(.1,.4);blade.lineTo(-.08,.4);blade.closePath();const geo=new THREE.ExtrudeGeometry(blade,{depth:.11,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,steps:1});mesh(axe,geo,M.metal,0,0,-.055);mesh(axe,G.sphere,M.gold,0,.58,0,.13,.13,.13)}
 root.scale.setScalar(scale);fuse(root);const shadow=contactShadow(2.35*scale);
 return{root,body,chest,neck,head,arms,legs,tail,braids,shadow,phase:0,scale,walk:0};
}
const hero=makeTauren({weapon:true});
const mentor=makeTauren({fur:0x725438,cloth:M.teal,scale:.95});mentor.root.position.set(-1.5,heightAt(-1.5,-5),-5);mentor.root.rotation.y=.2;
const trader=makeTauren({fur:0x978064,cloth:M.hideDark,scale:.89});trader.root.position.set(8,heightAt(8,1),1);trader.root.rotation.y=-.7;
const npcs=[{x:-1.5,z:-5,name:'Наставник Каменный Рог',actor:mentor,type:'mentor'},{x:8,z:1,name:'Травница Тихая Заря',actor:trader,type:'trader'}];
// Friendly NPCs are interaction targets, not physical obstacles.
function spriteText(text,color='#f9df91',size=32){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+size+'px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#302817';ctx.fillStyle=color;ctx.strokeText(text,256,48);ctx.fillText(text,256,48);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true}));s.scale.set(4.3,.81,1);return s}
for(const n of npcs){const name=spriteText(n.name,'#d9e2a1',25);scene.add(name);name.position.set(n.x,heightAt(n.x,n.z)+4.45,n.z)}
const questMarker=spriteText('!','#ffe180',72);questMarker.scale.set(2.5,1.6,1);scene.add(questMarker);
const relic=group(scene,35,heightAt(35,-14)+1.7,-11.8);const featherMat=material(0x79c8ba,{emissive:0x2c5b45,emissiveIntensity:.5});ell(relic,featherMat,0,.15,0,.18,.48,.08);rod(relic,M.bone,[0,-.4,0],[0,.53,0],.025);const relicShadow=contactShadow(1);
// Lightweight wildlife: animated joint groups, no skinned meshes or animation files.
function makePlainstrider(x,z,index){const root=group(scene,x,heightAt(x,z),z),body=group(root,0,1.23,0),brown=material(index%2?0x826649:0x917044),plume=material(0xa77944),legs=[];ell(body,brown,0,.1,0,.58,.49,.8);ell(body,plume,0,.18,-.4,.53,.35,.47);rod(body,brown,[0,.25,.5],[0,.92,.82],.18,.13);ell(body,brown,0,.97,.85,.25,.29,.27);ell(body,M.gold,0,.89,1.12,.15,.1,.28);for(const s of [-1,1]){ell(body,M.black,s*.19,1.02,.99,.045,.045,.03);const wing=ell(body,plume,s*.46,.12,-.05,.14,.35,.6);wing.rotation.x=.2;const leg=group(root,s*.24,1.1,.06);rod(leg,M.hideDark,[0,0,0],[0,-.93,0],.055);box(leg,M.wood,0,-1,.14,.18,.12,.38);legs.push(leg)}for(let i=0;i<3;i++){const f=ell(body,plume,(i-1)*.16,.98,.63,.055,.42,.11);f.rotation.x=-.2}fuse(root);return{root,body,legs,shadow:contactShadow(1.7),spawnX:x,spawnZ:z,hp:54,maxHp:54,dead:0,corpseAge:0,loot:[],hit:0,aggro:false,stunned:0,attackCd:0,phase:index,roamTime:rand()*8,index}}
const enemies=[[-9,-23],[1,-28],[13,-22],[21,-33],[-22,-35],[-28,29],[15,36],[34,13]].map(([x,z],i)=>makePlainstrider(x,z,i));
for(const enemy of enemies){enemy.name='Равнинный долгоног';enemy.baseScale=1;enemy.boss=false}
const giant=makePlainstrider(BOSS_X,BOSS_Z,enemies.length);
giant.name='Грозоклюв — огромный долгоног';
giant.boss=true;giant.baseScale=1.8;giant.maxHp=giant.hp=108;
giant.root.scale.setScalar(giant.baseScale);
giant.shadow.scale.setScalar(1.7);
giant.nameTag=spriteText('Грозоклюв · Исполин','#f9bd91',27);
giant.nameTag.scale.set(4.7,.84,1);scene.add(giant.nameTag);
giant.nameTag.position.set(BOSS_X,heightAt(BOSS_X,BOSS_Z)+4.65,BOSS_Z);
enemies.push(giant);
const CORPSE_DURATION=65,CORPSE_FALL_TIME=.85,LOOT_INTERACT_RANGE=3.3;
const corpseLootTexture=texture((c,size)=>{
 c.clearRect(0,0,size,size);
 const glow=c.createRadialGradient(size/2,size/2,3,size/2,size/2,size*.46);
 glow.addColorStop(0,'#fff7ccee');glow.addColorStop(.46,'#e7c46caa');glow.addColorStop(1,'#b88a3600');
 c.fillStyle=glow;c.fillRect(0,0,size,size);
 c.fillStyle='#fff2bc';c.strokeStyle='#8b6226';c.lineWidth=2;
 c.beginPath();c.moveTo(size/2,size*.13);c.lineTo(size*.61,size*.4);
 c.lineTo(size*.87,size/2);c.lineTo(size*.61,size*.6);
 c.lineTo(size/2,size*.87);c.lineTo(size*.39,size*.6);
 c.lineTo(size*.13,size/2);c.lineTo(size*.39,size*.4);
 c.closePath();c.fill();c.stroke();
},128);
const corpseLootMaterial=new THREE.SpriteMaterial({map:corpseLootTexture,transparent:true,depthWrite:false,depthTest:true});
for(const e of enemies){
 e.corpseAge=0;e.loot=[];
 e.lootMarker=new THREE.Sprite(corpseLootMaterial);
 e.lootMarker.scale.set(.95,.95,1);
 e.lootMarker.visible=false;scene.add(e.lootMarker);
}
const selection=mesh(scene,new THREE.RingGeometry(.8,.88,40),new THREE.MeshBasicMaterial({color:0xf6d580,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}),0,.07,0,1,1,1,false);selection.rotation.x=-Math.PI/2;selection.visible=false;
const stompRing=mesh(scene,new THREE.RingGeometry(.85,1,48),new THREE.MeshBasicMaterial({color:0xe9c66b,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,.08,0,1,1,1,false);stompRing.rotation.x=-Math.PI/2;
function animateTauren(actor,time,dt,walk=0,attack=-1,stomp=-1,turn=0){
 actor.walk=THREE.MathUtils.damp(actor.walk,walk,10,dt);const w=actor.walk,phase=actor.phase,breath=Math.sin(time*1.7),stride=Math.sin(phase*TAU),beat=Math.cos(phase*TAU*2);
 actor.body.position.set(stride*.035*w,1.4+.008*breath+.026*(1-beat)*w,0);actor.chest.rotation.set(.035*w,Math.sin(phase*TAU)*.065*w,-stride*.025*w);actor.chest.scale.y=1+breath*.005;
 actor.neck.rotation.set(-.018*breath-.025*beat*w,-actor.chest.rotation.y*.65,stride*.015*w);
 let swing=0,windup=0;
 if(attack>=0){const a=clamp(attack,0,1);windup=smooth(0,.32,a)*(1-smooth(.38,.65,a));swing=smooth(.32,.58,a)*(1-smooth(.64,1,a));actor.chest.rotation.y+=-.32*windup+.42*swing;actor.chest.rotation.x+=.12*swing}
 const crouch=stomp>=0?.14*Math.sin(Math.min(stomp/.55,1)*Math.PI):0;actor.body.position.y-=crouch;
 for(let i=0;i<2;i++){const arm=actor.arms[i],sign=i?1:-1;arm.shoulder.rotation.x=sign*stride*.31*w-(i?1.85*windup-.48*swing:0);arm.shoulder.rotation.z=-sign*(.12+.025*breath+(stomp>=0?.17*Math.sin(stomp*Math.PI):0));arm.elbow.rotation.x=-.14-Math.abs(stride)*.11*w-(i?.6*windup:0)}
 const yaw=actor.root.rotation.y;
 for(let i=0;i<2;i++){const leg=actor.legs[i],p=(phase+i*.5)%1;let z=0,lift=0;if(p<.58)z=.775-1.55*p/.58;else{const t=(p-.58)/.42;z=-.775+1.55*smooth(0,1,t);lift=Math.sin(t*Math.PI)*.22}z*=w;lift*=w;
 if(stomp>=0&&i===1){lift+=.42*Math.sin(Math.min(stomp/.48,1)*Math.PI);z+=.17*Math.sin(stomp*Math.PI)}
 const footX=actor.root.position.x+(leg.sign*.43*Math.cos(yaw)+z*Math.sin(yaw))*actor.scale,footZ=actor.root.position.z+(-leg.sign*.43*Math.sin(yaw)+z*Math.cos(yaw))*actor.scale;
 leg.hip.position.y=actor.body.position.y;const y=(heightAt(footX,footZ)-actor.root.position.y)/actor.scale+.205+lift-leg.hip.position.y;
 const distance=clamp(Math.hypot(y,z),.15,1.397),knee=Math.acos(clamp((distance*distance-.72*.72-.68*.68)/(2*.72*.68),-1,1));
 leg.hip.rotation.x=Math.atan2(-z,-y)-Math.atan2(.68*Math.sin(knee),.72+.68*Math.cos(knee));leg.knee.rotation.x=knee;leg.foot.rotation.x=-leg.hip.rotation.x-knee;
 }
 actor.tail.rotation.x=.06+Math.sin(time*2)*.06+w*.08;actor.tail.rotation.z=Math.sin(time*1.6)*.09+stride*.11*w-clamp(turn,-.25,.25);
 actor.braids.forEach((b,i)=>{b.rotation.x=.035*Math.sin(time*2+i)+.07*stride*w;b.rotation.z=clamp(turn*.3,-.1,.1)});
 actor.shadow.position.set(actor.root.position.x,heightAt(actor.root.position.x,actor.root.position.z)+.055,actor.root.position.z);
}
const saveKey='nexgame-mulgore-alpha02',cameraStoreKey='nexgame-real3d-camera-distance';
// The starter backpack has 12 actual slots; four future bag sockets can add capacity.
const BASE_INVENTORY_SLOTS=12,EQUIPPED_BAG_SLOTS=4,MAX_ITEM_STACK=20;
const ITEM_CATALOG={
 feather:{name:'Перо долгонога',icon:'🪶',quality:'Обычный',description:'Длинное крепкое перо равнинного долгонога.'},
 beak:{name:'Клюв долгонога',icon:'🦴',quality:'Обычный',description:'Прочный клюв. Может пригодиться ремесленнику.'},
 down:{name:'Мягкий пух',icon:'☁️',quality:'Обычный',description:'Тёплый и лёгкий пух с равнин.'},
 charm:{name:'Полированная бусина',icon:'🔮',quality:'Необычный',description:'Редкая находка с узором, напоминающим облака.'},
 giantFeather:{name:'Перо Грозоклюва',icon:'🪶',quality:'Редкий',description:'Огромное багряное перо поверженного исполина.'}
};
const initial={x:0,z:10,yaw:Math.PI,hp:120,level:1,xp:0,gold:0,potions:2,quest:0,kills:0,relic:false,inventory:Array(BASE_INVENTORY_SLOTS).fill(null),bags:Array(EQUIPPED_BAG_SLOTS).fill(null)};
let state={...initial,inventory:[...initial.inventory],bags:[...initial.bags]};
function normalizeBags(input){
 return Array.from({length:EQUIPPED_BAG_SLOTS},(_,i)=>{
  const bag=Array.isArray(input)?input[i]:null;
  return bag&&typeof bag.id==='string'&&Number.isInteger(bag.slots)&&bag.slots>=1&&bag.slots<=24?{id:bag.id,slots:bag.slots}:null;
 });
}
function inventoryCapacity(){
 return BASE_INVENTORY_SLOTS+state.bags.reduce((total,bag)=>total+(bag?bag.slots:0),0);
}
function normalizeInventory(input){
 return Array.from({length:inventoryCapacity()},(_,i)=>{
  const item=Array.isArray(input)?input[i]:null;
  return item&&typeof item.id==='string'&&ITEM_CATALOG[item.id]&&Number.isFinite(item.qty)
   ?{id:item.id,qty:clamp(Math.floor(item.qty),1,MAX_ITEM_STACK)}:null;
 });
}
function itemOccupancy(){return state.inventory.reduce((sum,item)=>sum+(item?1:0),0)}
function canStoreItem(item){
 if(!item||!ITEM_CATALOG[item.id]||!Number.isInteger(item.qty)||item.qty<=0)return false;
 let capacity=0;
 for(const slot of state.inventory){
  if(!slot)capacity+=MAX_ITEM_STACK;
  else if(slot.id===item.id)capacity+=MAX_ITEM_STACK-slot.qty;
  if(capacity>=item.qty)return true;
 }
 return false;
}
function storeItem(item){
 // Atomic insertion: never delete dropped loot unless every unit fits.
 if(!canStoreItem(item))return false;
 let remaining=item.qty;
 for(const slot of state.inventory){
  if(!slot||slot.id!==item.id||remaining===0)continue;
  const add=Math.min(MAX_ITEM_STACK-slot.qty,remaining);
  slot.qty+=add;remaining-=add;
 }
 for(let i=0;i<state.inventory.length&&remaining>0;i++)if(!state.inventory[i]){
  const add=Math.min(MAX_ITEM_STACK,remaining);
  state.inventory[i]={id:item.id,qty:add};remaining-=add;
 }
 save();return true;
}
// Corpses do not always carry goods: 72% chance, occasionally two finds.
function rollCorpseLoot(){
 if(Math.random()>=.72)return [];
 const r=Math.random();
 const id=r<.42?'feather':r<.72?'beak':r<.94?'down':'charm';
 const result=[{id,qty:id==='down'&&Math.random()<.38?2:1}];
 if(Math.random()<.16)result.push({id:id==='feather'?'down':'feather',qty:1});
 return result;
}

try{const saved=JSON.parse(localStorage.getItem(saveKey));if(saved&&typeof saved==='object')for(const k of Object.keys(initial))if(typeof saved[k]===typeof initial[k]&&(typeof saved[k]!=='number'||Number.isFinite(saved[k])))state[k]=saved[k]}catch(e){}
state.level=clamp(Math.floor(state.level),1,60);state.quest=clamp(Math.floor(state.quest),0,12);state.kills=clamp(Math.floor(state.kills),0,3);state.potions=clamp(Math.floor(state.potions),0,99);state.gold=clamp(Math.floor(state.gold),0,99999);state.xp=Math.max(0,state.xp);state.hp=clamp(state.hp,1,120+(state.level-1)*20);if(!clearAt(state.x,state.z)){state.x=initial.x;state.z=initial.z}
state.bags=normalizeBags(state.bags);state.inventory=normalizeInventory(state.inventory);
hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;
const save=()=>{try{localStorage.setItem(saveKey,JSON.stringify(state))}catch(e){}};
const keys=new Set(),joy={x:0,y:0,id:null},look={id:null,x:0,y:0,startX:0,startY:0,selectOnly:false},stick=$('stick'),nub=$('nub');
let modalKind=null,selected=null,autoAttack=false,swingTarget=null,attackElapsed=-1,attackCooldown=0,attackLanded=false,stompElapsed=-1,stompCooldown=0,stompLanded=false,shockAge=9,clock=0,saveClock=0,hudClock=0,velocityX=0,velocityZ=0,lastCombatAt=-100;
let cameraYaw=0,cameraPitch=.29,cameraDistance=10.5,actualCameraDistance=10.5;
let cameraFollow=false,cameraFollowCooldown=0;
const cameraFollowStoreKey='nexgame-real3d-camera-follow',cameraFollowSwitch=$('cameraFollow');
const cameraSlider=$('cameraDistance');
function setCameraDistance(value,persist=true){if(!Number.isFinite(value))return;cameraDistance=Math.round(clamp(value,4,22)*10)/10;cameraSlider.value=String(cameraDistance);const valueText=cameraDistance.toFixed(1).replace('.',',');$('cameraDistanceValue').textContent=valueText;cameraSlider.setAttribute('aria-valuetext',valueText);if(persist)try{localStorage.setItem(cameraStoreKey,String(cameraDistance))}catch(e){}}
try{const saved=JSON.parse(localStorage.getItem(cameraStoreKey));if(Number.isFinite(saved))setCameraDistance(saved,false)}catch(e){}setCameraDistance(cameraDistance,false);actualCameraDistance=cameraDistance;
cameraSlider.addEventListener('input',()=>setCameraDistance(Number(cameraSlider.value)));
function setCameraFollow(enabled,persist=true){
 cameraFollow=!!enabled;
 cameraFollowSwitch.checked=cameraFollow;
 cameraFollowSwitch.setAttribute('aria-checked',String(cameraFollow));
 cameraFollowCooldown=0;
 if(persist)try{localStorage.setItem(cameraFollowStoreKey,cameraFollow?'1':'0')}catch(e){}
}
try{setCameraFollow(localStorage.getItem(cameraFollowStoreKey)==='1',false)}catch(e){setCameraFollow(false,false)}
cameraFollowSwitch.addEventListener('change',()=>setCameraFollow(cameraFollowSwitch.checked));
function resetStick(){joy.x=joy.y=0;joy.id=null;nub.style.transform='translate(0,0)'}
function clearInput(){keys.clear();resetStick();look.id=null;velocityX=velocityZ=0}
function stickMove(e){const r=stick.getBoundingClientRect(),radius=r.width*.3,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),s=len>radius?radius/len:1;joy.x=Math.abs(dx*s)<3?0:dx*s/radius;joy.y=Math.abs(dy*s)<3?0:dy*s/radius;nub.style.transform=`translate(${dx*s}px,${dy*s}px)`}
stick.addEventListener('pointerdown',e=>{if(modalKind||joy.id!==null)return;e.preventDefault();joy.id=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id){e.preventDefault();stickMove(e)}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(joy.id===e.pointerId)resetStick()});
const canvas=renderer.domElement,pickRay=new THREE.Raycaster();canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',e=>{if(modalKind||look.id!==null)return;look.id=e.pointerId;look.selectOnly=e.pointerType==='touch'&&e.clientX<innerWidth*.35;look.x=look.startX=e.clientX;look.y=look.startY=e.clientY;cameraFollowCooldown=.85;canvas.setPointerCapture(e.pointerId);if(document.activeElement===cameraSlider)cameraSlider.blur()});
canvas.addEventListener('pointermove',e=>{if(look.id!==e.pointerId)return;if(!look.selectOnly){cameraYaw-=(e.clientX-look.x)*.007;cameraPitch=clamp(cameraPitch+(e.clientY-look.y)*.0045,.1,1.05)}look.x=e.clientX;look.y=e.clientY;cameraFollowCooldown=.85});
canvas.addEventListener('pointerup',e=>{
 if(look.id!==e.pointerId)return;
 if(Math.hypot(e.clientX-look.startX,e.clientY-look.startY)<7){
  pickRay.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
  const visibleMobs=enemies.filter(enemy=>enemy.dead<=0||enemy.corpseAge>0);
  const hits=pickRay.intersectObjects(visibleMobs.map(enemy=>enemy.root),true);
  if(hits.length){
   let obj=hits[0].object;
   while(obj.parent&&obj.parent!==scene)obj=obj.parent;
   const enemy=visibleMobs.find(m=>m.root===obj);
   if(enemy){if(enemy.dead>0)showCorpseLoot(enemy);else setTarget(enemy)}
  }
 }
 look.id=null;cameraFollowCooldown=Math.max(cameraFollowCooldown,.85);
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(look.id===e.pointerId){look.id=null;cameraFollowCooldown=Math.max(cameraFollowCooldown,.85)}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{if(!modalKind)setCameraDistance(cameraDistance+Math.sign(e.deltaY)*.5)},{passive:true});
addEventListener('blur',clearInput);addEventListener('pagehide',()=>{clearInput();save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();save()}});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape'){e.preventDefault();if(modalKind)closeDialog();else if(selected)clearTarget();else pause();return}if(e.target===cameraSlider)return;if(e.target instanceof HTMLButtonElement&&(k===' '||k==='enter'))return;if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab'].includes(k))e.preventDefault();if(modalKind)return;if(['1',' ','2','3','e','i','tab'].includes(k)){if(e.repeat)return;if(k==='1'||k===' ')attack();if(k==='2')stomp();if(k==='3')heal();if(k==='e')interact();if(k==='i')bag();if(k==='tab'){cycleTarget(e.shiftKey?-1:1)}return}keys.add(k)});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
let toastTimer;
function msg(text,duration=2600){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),duration)}
let combatWarningTimer=0,lastCombatWarning='',lastCombatWarningAt=-99;
function hideCombatWarning(){clearTimeout(combatWarningTimer);$('combatError').classList.remove('show');lastCombatWarning=''}
function combatWarning(text,force=false){
 if(!force&&text===lastCombatWarning&&clock-lastCombatWarningAt<1.9)return;
 lastCombatWarning=text;lastCombatWarningAt=clock;
 const box=$('combatError');clearTimeout(combatWarningTimer);
 box.textContent=text;box.classList.add('show');
 combatWarningTimer=setTimeout(()=>box.classList.remove('show'),1550);
}
function openDialog(title,sub,lines,kind='dialog'){clearInput();modalKind=kind;$('panel').classList.toggle('inventory-modal',kind==='bag');$('cameraControl').hidden=kind!=='settings';$('mtitle').textContent=title;$('msub').textContent=sub;$('mbody').replaceChildren();$('choices').replaceChildren();for(const line of lines){const p=document.createElement('p');p.textContent=line;$('mbody').appendChild(p)}$('modal').hidden=false;$('interact').hidden=true}
function choice(label,fn,type=''){const button=document.createElement('button');button.className='choice '+type;button.textContent=label;button.addEventListener('click',fn);$('choices').appendChild(button)}
function closeDialog(){modalKind=null;$('modal').hidden=true;$('panel').classList.remove('inventory-modal');$('cameraControl').hidden=true;clearInput();if(document.activeElement instanceof HTMLButtonElement)document.activeElement.blur();save();updateHUD()}
function pause(){
 if(modalKind==='pause'){closeDialog();return}
 openDialog('У костра','NEXGAME · МУЛГОР · ALPHA 0.2.7',
 ['Мир поставлен на паузу. Продолжи путь, открой настройки камеры или начни сначала.',
  'W/S — идти вперёд и назад; A/D — непрерывно поворачивать; Tab — цель; 1 — автоатака.',
  'После победы обыщи тело долгонога. Рюкзак открывается клавишей I.'], 'pause');
 choice('▶ Продолжить путь',closeDialog);
 choice('⚙ Настройки камеры',cameraSettings);
 choice('Начать заново',()=>{
  openDialog('Начать новый путь?','СБРОС ПРОГРЕССА',['Будут сброшены задания, уровень, собранная добыча, инвентарь и предметы этой версии Мулгора.']);
  choice('Сбросить прогресс',resetWorld,'danger');choice('Вернуться',pause,'alt');
 },'alt');
}
function cameraSettings(){
 openDialog('Настройки камеры','ПОВОРОТ И РАССТОЯНИЕ',
 ['Настрой расстояние до героя и автоматическое следование за поворотами. Вертикальный угол остаётся под твоим управлением.'],'settings');
 choice('← Назад в меню',pause,'alt');
 choice('▶ Продолжить игру',closeDialog);
}
function resetWorld(){
 state={...initial,inventory:[...initial.inventory],bags:[...initial.bags]};
 for(const e of enemies){
  e.hp=e.maxHp;e.dead=0;e.corpseAge=0;e.loot=[];e.lootMarker.visible=false;
  e.hit=0;e.aggro=false;e.stunned=0;e.attackCd=0;
  e.root.visible=true;e.shadow.visible=true;
  e.root.rotation.z=0;e.root.scale.setScalar(e.baseScale||1);
  e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ);
  e.shadow.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ)+.055,e.spawnZ);
 }hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;hero.phase=hero.walk=0;attackElapsed=stompElapsed=-1;attackCooldown=stompCooldown=0;selected=null;autoAttack=false;swingTarget=null;lastCombatAt=-100;hideCombatWarning();shockAge=9;cameraYaw=0;cameraPitch=.29;cameraFollowCooldown=0;closeDialog();msg('Новый путь начинается в лагере Нараче')}
function isLootableCorpse(e){return !!e&&e.dead>0&&Array.isArray(e.loot)&&e.loot.length>0}
function nearTarget(){
 let closest=null,dist=3.5;
 for(const n of npcs){const d=Math.hypot(state.x-n.x,state.z-n.z);if(d<dist){dist=d;closest={kind:'npc',npc:n}}}
 for(const e of enemies)if(isLootableCorpse(e)){
  const d=Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z);
  if(d<dist&&d<LOOT_INTERACT_RANGE){dist=d;closest={kind:'corpse',enemy:e}}
 }
 if(state.quest===4){
  const d=Math.hypot(state.x-35,state.z+11.8);
  if(d<dist&&d<3.1)closest={kind:'relic'};
 }
 return closest;
}
function interact(){
 if(modalKind)return;
 const target=nearTarget();
 if(!target){msg('Подойди к жителю или предмету ближе');return}
 if(target.kind==='corpse'){showCorpseLoot(target.enemy);return}
 if(target.kind==='relic'){state.quest=5;state.relic=true;save();updateHUD();msg('Получено перо предков');return}
 if(target.npc.type==='mentor')mentorTalk();else traderTalk();
}
function xpNeed(){return 100+(state.level-1)*50}
function experience(n){state.xp+=n;while(state.xp>=xpNeed()){state.xp-=xpNeed();state.level++;state.hp=120+(state.level-1)*20;msg('Новый уровень: '+state.level+'!')}}
function mentorTalk(){
 const q=state.quest;
 if(q===0){
  openDialog('Первые шаги','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Приветствую тебя, молодой воин. Это первое из пяти испытаний лагеря Нараче.',
    'Для начала победи трёх долгоногов за лагерем.']);
  choice('Принять: Обряд силы (2/5)',()=>{state.quest=1;state.kills=0;closeDialog();msg('Задание принято: Обряд силы')});
  choice('Позже',closeDialog,'alt');
 }else if(q===1){
  openDialog('Обряд силы','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Победи трёх обычных равнинных долгоногов на дороге. Прогресс: '+state.kills+' / 3.']);
  choice('Продолжить охоту',closeDialog);
 }else if(q===2){
  openDialog('Обряд силы завершён','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Ты доказал силу. Впереди испытание внимательности и уважения к предкам.']);
  choice('Награда: 25 монет и 80 опыта',()=>{state.quest=3;state.gold+=25;experience(80);closeDialog();msg('Обряд силы пройден — 2/5')});
 }else if(q===3){
  openDialog('Голос предков','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['На востоке стоит древний тотем с бирюзовыми крыльями. Подбери перо предков рядом с ним и принеси мне.',
    'Награда: 40 монет и 110 опыта.']);
  choice('Принять: Голос предков (3/5)',()=>{state.quest=4;closeDialog();msg('Найди перо у восточного тотема')});
  choice('Позже',closeDialog,'alt');
 }else if(q===4){
  openDialog('Голос предков','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Иди по восточной тропе к высокому тотему с бирюзовыми крыльями. Ищи сияющее перо на земле.']);
  choice('Я вернусь',closeDialog);
 }else if(q===5){
  openDialog('Земля помнит','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Ты сохранил память предков. Но на дальних пастбищах замечены огромные следы.']);
  choice('Отдать перо: 40 монет и 110 опыта',()=>{state.quest=6;state.relic=false;state.gold+=40;experience(110);closeDialog();msg('Голос предков завершён — 3/5')});
 }else if(q===6){
  openDialog('Следы исполина','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Охотники заметили следы громадной птицы. Пройди по юго-восточной тропе и разведай дальнее пастбище.',
    'Найди каменную развилку на дальнем участке дороги. Награда: 50 монет и 95 опыта.']);
  choice('Принять: Следы исполина (4/5)',()=>{state.quest=7;closeDialog();msg('Разведай дальнюю тропу на юго-востоке')});
  choice('Позже',closeDialog,'alt');
 }else if(q===7){
  openDialog('Следы исполина','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Следуй по юго-восточной дороге от лагеря к дальнему пастбищу. Осмотри местность и возвращайся.']);
  choice('Продолжить разведку',closeDialog);
 }else if(q===8){
  openDialog('Донесение разведчика','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Теперь мы знаем, где бродит исполин. Ты хорошо справился, но впереди настоящее испытание.']);
  choice('Завершить: 50 монет и 95 опыта',()=>{state.quest=9;state.gold+=50;experience(95);closeDialog();msg('Следы исполина завершены — 4/5')});
 }else if(q===9){
  openDialog('Грозоклюв: вожак стада','ПОСЛЕДНЕЕ ИСПЫТАНИЕ · 5/5',
   ['На дальнем пастбище появился Грозоклюв — огромный долгоног. Он вдвое выносливее обычных птиц.',
    'Победи его и возвращайся. Красный пунктир укажет путь в мире и на мини-карте.',
    'Награда: 90 монет и 190 опыта.']);
  choice('Принять: Победить Грозоклюва (5/5)',()=>{state.quest=10;closeDialog();msg('Следуй по красному пунктиру к Грозоклюву')});
  choice('Позже',closeDialog,'alt');
 }else if(q===10){
  openDialog('Грозоклюв: вожак стада','ПОСЛЕДНЕЕ ИСПЫТАНИЕ · 5/5',
   ['Иди по красному пунктиру по юго-восточной дороге к Грозоклюву.',
    'У него 108 здоровья. Его удары сильнее, чем у обычных долгоногов.']);
  choice('Продолжить охоту',closeDialog);
 }else if(q===11){
  openDialog('Испытания завершены','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Грозоклюв повержен. Ты прошёл все пять испытаний и защитил лагерь Нараче!']);
  choice('Награда: 90 монет и 190 опыта',()=>{state.quest=12;state.gold+=90;experience(190);closeDialog();msg('Все 5 заданий завершены!')});
 }else{
  openDialog('Хранитель Мулгора','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Все пять заданий пройдены. Ты стал защитником лагеря Нараче.',
    'Продолжай путешествовать и собирать добычу. Впереди новые приключения.']);
  choice('До встречи',closeDialog);
 }
}
function traderTalk(){openDialog('Травница Тихая Заря','ПРИПАСЫ ЛАГЕРЯ',['Настой луговых трав восстанавливает 55 здоровья. Цена — 10 монет.','В твоём кошеле: '+state.gold+' монет.']);choice('Купить настой — 10 монет',()=>{if(state.gold<10){msg('Недостаточно монет');return}state.gold-=10;state.potions++;closeDialog();msg('Лечебный настой добавлен в рюкзак')});choice('До встречи',closeDialog,'alt')}
function bag(){
 if(modalKind==='bag'){closeDialog();return}
 openDialog('Рюкзак странника','ТАУРЕН · ВОИН · УРОВЕНЬ '+state.level,[],'bag');
 renderInventory();
 choice('🧪 Выпить лечебный настой ('+state.potions+')',()=>{if(heal(true))closeDialog()});
 choice('Закрыть рюкзак',closeDialog,'alt');
}
function discardInventorySlot(index){
 if(!Number.isInteger(index)||index<0||index>=state.inventory.length||!state.inventory[index])return false;
 state.inventory[index]=null;save();return true;
}
function renderInventory(){
 const body=$('mbody');body.replaceChildren();
 const occupied=itemOccupancy(),capacity=inventoryCapacity();
 const summary=document.createElement('div');summary.className='inventory-summary';
 summary.textContent='Ячейки: '+occupied+' / '+capacity+' · Монеты: '+state.gold+' · Настои: '+state.potions;
 body.appendChild(summary);
 const grid=document.createElement('div');grid.className='inventory-grid';
 const detail=document.createElement('div');detail.className='inventory-detail';
 detail.textContent='Нажми на предмет, чтобы узнать о нём больше.';
 for(let i=0;i<capacity;i++){
  const item=state.inventory[i],cell=document.createElement('button');
  cell.type='button';cell.className='inventory-slot'+(item?' occupied':' empty');
  cell.setAttribute('aria-label',item?ITEM_CATALOG[item.id].name+', '+item.qty+' шт.':'Пустая ячейка '+(i+1));
  if(item){
   const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=ITEM_CATALOG[item.id].icon;
   const count=document.createElement('span');count.className='slot-count';count.textContent=item.qty>1?String(item.qty):'';
   cell.appendChild(icon);cell.appendChild(count);
   cell.addEventListener('click',()=>{
    const def=ITEM_CATALOG[item.id];
    for(const button of grid.children)button.classList.remove('active');
    cell.classList.add('active');
    detail.replaceChildren();
    const description=document.createElement('div');
    description.textContent=def.name+' ×'+item.qty+' · '+def.quality+'. '+def.description;
    detail.appendChild(description);
    const del=document.createElement('button');
    del.className='inventory-delete';del.type='button';del.textContent='🗑 Удалить предмет';
    detail.appendChild(del);
    del.addEventListener('click',()=>{
     detail.replaceChildren();
     const question=document.createElement('div');question.className='inventory-confirm';
     question.textContent='Удалить '+def.name+' ×'+item.qty+'? Это действие нельзя отменить.';
     const yes=document.createElement('button');yes.type='button';yes.className='choice danger';yes.textContent='Удалить безвозвратно';
     const no=document.createElement('button');no.type='button';no.className='choice alt';no.textContent='Отмена';
     yes.addEventListener('click',()=>{
      if(!discardInventorySlot(i)){msg('Не удалось удалить предмет');return}
      renderInventory();msg('Предмет удалён: '+def.name);
     });
     no.addEventListener('click',()=>{cell.click()});
     question.appendChild(yes);question.appendChild(no);detail.appendChild(question);
    });
   });
  }else{
   const number=document.createElement('span');number.className='slot-empty-mark';number.textContent='·';
   cell.appendChild(number);
  }
  grid.appendChild(cell);
 }
 body.appendChild(grid);body.appendChild(detail);
 const title=document.createElement('div');title.className='bag-sockets-title';title.textContent='Дополнительные сумки ('+state.bags.filter(Boolean).length+' / '+EQUIPPED_BAG_SLOTS+')';body.appendChild(title);
 const sockets=document.createElement('div');sockets.className='bag-sockets';
 for(let i=0;i<EQUIPPED_BAG_SLOTS;i++){
  const entry=state.bags[i],socket=document.createElement('div');
  socket.className='bag-socket'+(entry?' equipped':'');
  socket.setAttribute('aria-label',entry?'Сумка '+(i+1)+', '+entry.slots+' дополнительных мест':'Место для сумки '+(i+1)+', пока недоступно');
  const glyph=document.createElement('span');glyph.className='bag-socket-icon';glyph.textContent=entry?'🎒':'＋';
  const sub=document.createElement('span');sub.textContent=entry?'+'+entry.slots+' мест':'Сумка '+(i+1);
  socket.appendChild(glyph);socket.appendChild(sub);sockets.appendChild(socket);
 }
 body.appendChild(sockets);
 const note=document.createElement('p');note.className='bag-sockets-note';
 note.textContent='Четыре места под сумки подготовлены. Сами сумки и их добычу добавим в следующих обновлениях.';
 body.appendChild(note);
}
function finishLoot(e){
 e.loot=[];e.lootMarker.visible=false;
 closeDialog();msg('Тело обыскано');
}
function renderCorpseLoot(e){
 if(!isLootableCorpse(e)){finishLoot(e);return}
 const body=$('mbody');body.replaceChildren();$('choices').replaceChildren();
 const intro=document.createElement('p');intro.className='loot-description';
 intro.textContent='На теле равнинного долгонога найдена добыча. Нажми на предмет, чтобы положить его в рюкзак.';
 body.appendChild(intro);
 const list=document.createElement('div');list.className='loot-list';
 for(let i=0;i<e.loot.length;i++){
  const row=e.loot[i],def=ITEM_CATALOG[row.id],button=document.createElement('button');
  button.className='loot-item';button.type='button';
  button.textContent=def.icon+'  '+def.name+(row.qty>1?' ×'+row.qty:'');
  button.setAttribute('aria-label','Взять '+def.name+', '+row.qty+' шт.');
  button.addEventListener('click',()=>{
   if(!storeItem(row)){msg('В рюкзаке недостаточно места');return}
   e.loot.splice(i,1);
   if(e.loot.length)renderCorpseLoot(e);else finishLoot(e);
   msg('Получено: '+def.name+(row.qty>1?' ×'+row.qty:''));
  });
  list.appendChild(button);
 }
 body.appendChild(list);
 choice('Забрать всё',()=>{
  let grabbed=0;
  for(let i=e.loot.length-1;i>=0;i--)if(storeItem(e.loot[i])){e.loot.splice(i,1);grabbed++}
  if(!grabbed){msg('В рюкзаке недостаточно места');return}
  if(e.loot.length)renderCorpseLoot(e);else finishLoot(e);
  msg('Собрано предметов: '+grabbed);
 });
 choice('Закрыть',closeDialog,'alt');
}
function showCorpseLoot(e){
 if(!e||e.dead<=0){msg('Тело уже исчезло');return}
 if(Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)>LOOT_INTERACT_RANGE){
  combatWarning('Слишком далеко',true);return;
 }
 if(!isLootableCorpse(e)){msg('На теле ничего нет');return}
 openDialog((e.name||'Добыча с долгонога'),'ОБЫСК ТЕЛА',[],'loot');
 renderCorpseLoot(e);
}
function heal(fromBag=false){if(modalKind&&!fromBag)return false;if(state.potions<=0){msg('Лечебные настои закончились');return false}const max=120+(state.level-1)*20;if(state.hp>=max){msg('Здоровье уже полное');return false}state.hp=Math.min(max,state.hp+55);state.potions--;save();updateHUD();msg('Луговые травы восстановили здоровье');return true}
// Melee combat: select first, validate distance and facing, then animate.
const MELEE_RANGE=3.45,TARGET_RANGE=35,SWING_PERIOD=1.8;
function isAliveTarget(e){return !!e&&e.dead<=0&&e.hp>0&&enemies.includes(e)}
function targetDistance(e){return Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)}
function nearestEnemy(range=TARGET_RANGE){
 let best=null,dist=range;
 for(const e of enemies)if(isAliveTarget(e)){const d=targetDistance(e);if(d<dist){dist=d;best=e}}
 return best;
}
function meleeFailure(e){
 if(!isAliveTarget(e))return 'Нет цели';
 const d=targetDistance(e);
 if(d>MELEE_RANGE)return 'Цель слишком далеко';
 if(d>.001){
  const dx=e.root.position.x-state.x,dz=e.root.position.z-state.z;
  const facing=Math.sin(hero.root.rotation.y)*dx+Math.cos(hero.root.rotation.y)*dz;
  if(facing<d*.04)return 'Цель не перед вами';
 }
 return '';
}
function clearTarget(){
 selected=null;autoAttack=false;swingTarget=null;
 attackElapsed=-1;attackCooldown=0;
 hideCombatWarning();updateHUD();
}
function setTarget(e){
 if(!isAliveTarget(e)){clearTarget();return}
 selected=e;hideCombatWarning();updateHUD();
}
function cycleTarget(step=1){
 if(modalKind)return;
 const candidates=enemies.filter(e=>isAliveTarget(e)&&targetDistance(e)<=TARGET_RANGE)
   .sort((a,b)=>targetDistance(a)-targetDistance(b)||a.index-b.index);
 if(!candidates.length){combatWarning('Нет доступных целей',true);return}
 const current=candidates.indexOf(selected);
 const next=current<0?candidates[0]:candidates[(current+step+candidates.length)%candidates.length];
 setTarget(next);
}
function tryAutoSwing(){
 if(!autoAttack||modalKind||stompElapsed>=0||attackElapsed>=0||attackCooldown>0)return false;
 if(!isAliveTarget(selected)){autoAttack=false;selected=null;swingTarget=null;updateHUD();return false}
 const fail=meleeFailure(selected);
 if(fail){combatWarning(fail);return false}
 attackElapsed=0;attackCooldown=SWING_PERIOD;attackLanded=false;swingTarget=selected;
 hideCombatWarning();return true;
}
function attack(){
 if(modalKind)return;
 if(autoAttack){autoAttack=false;hideCombatWarning();updateHUD();return}
 if(!isAliveTarget(selected)){
  const e=nearestEnemy(TARGET_RANGE);
  if(!e){combatWarning('Нет цели',true);return}
  setTarget(e);
 }
 autoAttack=true;
 const fail=meleeFailure(selected);
 if(fail)combatWarning(fail,true);else tryAutoSwing();
 updateHUD();
}
function damageEnemy(e,amount){
 if(!isAliveTarget(e))return;
 lastCombatAt=clock;
 e.hp-=amount;e.aggro=true;e.hit=.22;
 if(e.hp<=0){
  e.hp=0;e.dead=CORPSE_DURATION;e.corpseAge=0;e.aggro=false;
  e.loot=e.boss?[{id:'giantFeather',qty:1},...rollCorpseLoot()]:rollCorpseLoot();
  e.root.visible=true;e.shadow.visible=true;
  e.lootMarker.visible=e.loot.length>0;
  e.lootMarker.position.set(e.root.position.x,heightAt(e.root.position.x,e.root.position.z)+1.35,e.root.position.z);
  state.gold+=e.boss?12:4;experience(e.boss?70:22);
  if(e.boss&&state.quest===10){
   state.quest=11;msg('Грозоклюв повержен! Вернись к наставнику.');
  }
  if(state.quest===1&&!e.boss){
   state.kills=Math.min(3,state.kills+1);
   if(state.kills===3){state.quest=2;msg('Обряд силы: вернись к наставнику')}
  }
  if(selected===e){
   selected=null;autoAttack=false;swingTarget=null;attackElapsed=-1;attackCooldown=0;hideCombatWarning();
  }
  save();
 }
 updateHUD();
}
function stomp(){if(modalKind||stompCooldown>0||attackElapsed>=0)return;stompElapsed=0;stompCooldown=8;stompLanded=false}
$('attack').addEventListener('pointerdown',e=>{e.preventDefault();attack()});$('stomp').addEventListener('pointerdown',e=>{e.preventDefault();stomp()});
// Native click covers keyboard activation without doubling pointer attacks.
for(const [id,fn] of [['attack',attack],['stomp',stomp]])$(id).addEventListener('click',e=>{if(e.detail===0)fn()});
// iPhone multi-touch: the target button must work while another pointer
// owns the movement joystick. Native click may be suppressed by Safari then.
function bindImmediateButton(id,action){
 const button=$(id);
 let lastPointerActivation=-1000;
 button.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  lastPointerActivation=performance.now();
  action();
 });
 // Some Safari builds synthesize detail=0 clicks after a touch. Ignore those
 // for a short grace period, but retain keyboard/accessibility activation.
 button.addEventListener('click',e=>{
  if(e.detail===0&&performance.now()-lastPointerActivation>450)action();
 });
}
bindImmediateButton('targetNext',()=>cycleTarget());
bindImmediateButton('targetClear',clearTarget);
$('heal').addEventListener('click',()=>heal());$('interact').addEventListener('click',interact);$('bag').addEventListener('click',bag);$('pause').addEventListener('click',pause);
const questLines=[
 ['Первые шаги','Поговорите с наставником у большого тотема.'],
 ['Обряд силы','Победите обычных долгоногов: 0 / 3'],
 ['Обряд силы','Вернитесь к наставнику за наградой.'],
 ['Голос предков','Поговорите с наставником.'],
 ['Голос предков','Найдите перо возле восточного тотема.'],
 ['Голос предков','Отнесите перо наставнику.'],
 ['Следы исполина','Поговорите с наставником, чтобы начать разведку.'],
 ['Следы исполина','Разведайте дальнее пастбище по юго-восточной тропе.'],
 ['Следы исполина','Разведка завершена. Вернитесь к наставнику.'],
 ['Грозоклюв, вожак стада','Поговорите с наставником о финальной охоте.'],
 ['Грозоклюв, вожак стада','Следуйте по красному пунктиру и убейте Грозоклюва (0 / 1).'],
 ['Грозоклюв, вожак стада','Грозоклюв повержен! Вернитесь к наставнику.'],
 ['Все испытания пройдены','Вы завершили цепочку из пяти заданий.']
];
let lastMarker='';
function updateHUD(){const max=120+(state.level-1)*20;$('levelBadge').textContent=state.level;$('hpText').textContent=Math.ceil(state.hp)+' / '+max;$('hpFill').style.width=state.hp/max*100+'%';$('xpFill').style.width=Math.min(100,state.xp/xpNeed()*100)+'%';$('xpText').textContent='Опыт '+state.xp+' / '+xpNeed();$('potionCount').textContent='Настой · '+state.potions;$('rageText').textContent=inCombat()?'В бою':state.hp<max?'Восстановление':'Готов к бою';$('qtitle').textContent=questLines[state.quest][0];$('qtext').textContent=state.quest===1?'Равнинные долгоноги: '+state.kills+' / 3':questLines[state.quest][1];
 const camp=Math.hypot(state.x+3,state.z-3)<23;$('area').textContent=camp?'Лагерь Нараче':'Плато Красного Облака';$('mapLabel').textContent=camp?'Лагерь Нараче':'Мулгор';
 const questNumber=state.quest===0?1:state.quest<=2?2:state.quest<=5?3:state.quest<=8?4:5;
 $('quest-progress').textContent=state.quest===12?'Цепочка · 5 / 5 ✓':'Цепочка · '+questNumber+' / 5';
 const guide=$('questGuidance');
 guide.hidden=state.quest!==7&&state.quest!==10;
 if(state.quest===7)guide.textContent='Разведка: идите на юго-восток по дороге.';
 if(state.quest===10)guide.textContent='Красный пунктир ведёт к Грозоклюву · 108 HP';
 bossGuide.visible=state.quest===10;
 const target=nearTarget();$('interact').hidden=Boolean(modalKind)||!target;if(target)$('interact').innerHTML=target.kind==='corpse'?'Обыскать <kbd>E</kbd>':target.kind==='relic'?'Взять перо <kbd>E</kbd>':'Поговорить <kbd>E</kbd>';
 const valid=isAliveTarget(selected);
 $('targetFrame').hidden=!valid;$('zoneTitle').hidden=Boolean(valid);
 $('attack').classList.toggle('auto-attacking',autoAttack);
 $('attack').setAttribute('aria-pressed',String(autoAttack));
 $('attackLabel').textContent=autoAttack?'Стоп':'Автоатака';
 $('targetNext').classList.toggle('target-selected',valid);
 if(valid){
  const dist=targetDistance(selected),problem=meleeFailure(selected);
  $('targetName').textContent=selected.name+(selected.boss?' · Элитный':' · 1');
  $('targetFill').style.width=Math.max(0,selected.hp/selected.maxHp*100)+'%';
  $('targetHp').textContent=Math.ceil(selected.hp)+' / '+selected.maxHp;
  $('targetDistance').textContent='Дистанция: '+dist.toFixed(1).replace('.',',')+' м · удар до '+MELEE_RANGE.toFixed(1).replace('.',',')+' м';
  const status=autoAttack?(problem?'Автоатака: '+problem.toLowerCase():'Автоатака включена'):(problem||'В зоне удара');
  $('targetStatus').textContent=status;
  $('targetStatus').className=problem?(problem.includes('далеко')?'target-far':'target-back'):(autoAttack?'target-active':'target-ready');
 }
 const marker=[0,3,6,9].includes(state.quest)?'!':[2,5,8,11].includes(state.quest)?'?':'·';questMarker.visible=state.quest!==12;if(marker!==lastMarker){lastMarker=marker;const c=questMarker.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 72px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#3a2c19';ctx.fillStyle=marker==='·'?'#b4b395':'#ffe180';ctx.strokeText(marker,256,48);ctx.fillText(marker,256,48);questMarker.material.map.needsUpdate=true}relic.visible=state.quest===4;relicShadow.visible=relic.visible;
}
const minimap=$('minimap'),mapCtx=minimap.getContext('2d');
function drawMap(){const c=mapCtx,s=240,k=4.1;c.clearRect(0,0,s,s);c.fillStyle='#788252';c.fillRect(0,0,s,s);c.save();c.translate(s/2,s/2);c.fillStyle='#6d774b';for(let i=0;i<8;i++){c.beginPath();c.ellipse(Math.sin(i*1.6)*90,Math.cos(i*1.6)*90,38,17,i,0,TAU);c.fill()}c.translate(-state.x*k,-state.z*k);c.strokeStyle='#c0ae71';c.lineWidth=7;c.lineCap='round';for(const route of routes){c.beginPath();route.forEach(([x,z],i)=>i?c.lineTo(x*k,z*k):c.moveTo(x*k,z*k));c.stroke()}
 if(state.quest===10){
  c.save();c.setLineDash([7,5]);c.lineWidth=3;c.strokeStyle='#e8443e';c.beginPath();
  bossWaypoints.forEach(([x,z],i)=>i?c.lineTo(x*k,z*k):c.moveTo(x*k,z*k));c.stroke();c.restore();
 }
 if(state.quest===7){
  c.fillStyle='#fff0a9';c.beginPath();c.arc(SCOUT_X*k,SCOUT_Z*k,5,0,TAU);c.fill();
 }
 for(const p of mapLandmarks){c.fillStyle=p.color;c.beginPath();c.arc(p.x*k,p.z*k,Math.max(3,p.r*k),0,TAU);c.fill();c.strokeStyle='#4e4e30';c.lineWidth=1;c.stroke()}c.fillStyle='#4f8d85';c.beginPath();c.ellipse(26*k,29*k,6*k,3*k,0,0,TAU);c.fill();for(const e of enemies){if(e.dead<=0){
  c.fillStyle=e.boss?'#d33f39':e.aggro?'#b94f35':'#d8c073';
  c.beginPath();c.arc(e.root.position.x*k,e.root.position.z*k,e.boss?5:2.5,0,TAU);c.fill();
  if(e.boss&&state.quest===10){c.strokeStyle='#ffe4b5';c.lineWidth=1.5;c.stroke()}
 }else if(isLootableCorpse(e)){c.fillStyle='#ffe6a0';c.beginPath();c.arc(e.root.position.x*k,e.root.position.z*k,3.8,0,TAU);c.fill()}}if(state.quest<12){c.fillStyle='#fff397';c.font='bold 19px Georgia';c.textAlign='center';c.fillText([2,5,8,11].includes(state.quest)?'?':'!',-1.5*k,-5*k-5)}if(state.quest===4){c.fillStyle='#a6ffeb';c.beginPath();c.arc(35*k,-11.8*k,5,0,TAU);c.fill()}c.restore();c.save();c.translate(120,120);c.rotate(-hero.root.rotation.y);c.fillStyle='#fff1b5';c.strokeStyle='#463723';c.lineWidth=2;c.beginPath();c.moveTo(0,10);c.lineTo(-6,-7);c.lineTo(0,-3);c.lineTo(6,-7);c.closePath();c.fill();c.stroke();c.restore()}
function movement(dt){
 // Classic-style controls: vertical stick walks along the hero's own heading,
 // horizontal stick continuously ROTATES the hero while held.
 // Both axes can be used simultaneously for walking arcs.
 const ax=joy.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
 const az=joy.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 const turnInput=clamp(ax,-1,1),forwardInput=clamp(-az,-1,1);
 const turnSpeed=2.45; // radians/second; not a target angle
 let turn=0;
 if(Math.abs(turnInput)>.04){
  turn=-turnInput*turnSpeed*dt;
  const nextYaw=hero.root.rotation.y+turn;
  hero.root.rotation.y=Math.atan2(Math.sin(nextYaw),Math.cos(nextYaw));
  state.yaw=hero.root.rotation.y;
 }
 const speed=stompElapsed>=0?0:4.05;
 const forwardSpeed=forwardInput*speed;
 const dx=Math.sin(hero.root.rotation.y)*forwardSpeed;
 const dz=Math.cos(hero.root.rotation.y)*forwardSpeed;
 if(Math.abs(forwardInput)<.04||speed===0){
  // No drift when rotating on the spot or after releasing the stick.
  velocityX=velocityZ=0;
 }else{
  velocityX=THREE.MathUtils.damp(velocityX,dx,10,dt);
  velocityZ=THREE.MathUtils.damp(velocityZ,dz,10,dt);
 }
 const prevX=state.x,prevZ=state.z,nx=state.x+velocityX*dt,nz=state.z+velocityZ*dt;
 if(clearAt(nx,nz)){state.x=nx;state.z=nz}
 else if(clearAt(nx,state.z)){state.x=nx;velocityZ=0}
 else if(clearAt(state.x,nz)){state.z=nz;velocityX=0}
 else velocityX=velocityZ=0;
 const travelled=Math.hypot(state.x-prevX,state.z-prevZ);
 if(travelled>.00005)hero.phase=(hero.phase+travelled/2.67)%1;
 hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);
 animateTauren(hero,clock,dt,clamp(travelled/(dt*4.05||1),0,1),attackElapsed>=0?attackElapsed/.8:-1,stompElapsed>=0?stompElapsed/.75:-1,turn);
}
function revive(){lastCombatAt=clock;state.hp=120+(state.level-1)*20;state.x=initial.x;state.z=initial.z;selected=null;autoAttack=false;swingTarget=null;hideCombatWarning();attackElapsed=stompElapsed=-1;attackCooldown=0;for(const e of enemies)e.aggro=false;clearInput();hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);save();msg('Духи вернули тебя к костру. Твой путь продолжается.',3600)}
function updateEnemy(e,dt){
 if(e.dead>0){
  if(e.boss&&e.nameTag)e.nameTag.visible=false;
  e.dead=Math.max(0,e.dead-dt);e.corpseAge+=dt;
  const fall=smooth(0,CORPSE_FALL_TIME,e.corpseAge);
  // Tilt the whole bird onto the ground instead of instantly hiding it.
  e.root.rotation.z=-1.34*fall;
  e.root.position.y=heightAt(e.root.position.x,e.root.position.z)+.13*fall;
  e.legs[0].rotation.x=-.55*fall;
  e.legs[1].rotation.x=.3*fall;
  if(e.lootMarker.visible){
   e.lootMarker.position.set(e.root.position.x,heightAt(e.root.position.x,e.root.position.z)+1.1+Math.sin(clock*3.6)*.13,e.root.position.z);
  }
  if(e.dead<=0){
   e.dead=0;e.corpseAge=0;e.hp=e.maxHp;e.loot=[];
   e.lootMarker.visible=false;e.root.visible=e.shadow.visible=true;if(e.boss&&e.nameTag)e.nameTag.visible=true;
   e.aggro=false;e.stunned=0;e.attackCd=0;e.hit=0;
   e.root.rotation.z=0;e.root.scale.setScalar(e.baseScale||1);
   e.legs[0].rotation.x=e.legs[1].rotation.x=0;
   e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ);
   e.shadow.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ)+.055,e.spawnZ);
  }
  return;
 }
 e.hit=Math.max(0,e.hit-dt);e.stunned=Math.max(0,e.stunned-dt);e.attackCd=Math.max(0,e.attackCd-dt);e.roamTime+=dt;const p=e.root.position,dist=Math.hypot(state.x-p.x,state.z-p.z),home=Math.hypot(state.x-e.spawnX,state.z-e.spawnZ);
 if(e.aggro&&(home>19||dist>22)){e.aggro=false;e.hp=e.maxHp}
 let tx=e.spawnX+Math.sin(e.roamTime*.18+e.index)*2.2,tz=e.spawnZ+Math.cos(e.roamTime*.14+e.index)*2.2,speed=.42;
 if(e.aggro){tx=state.x;tz=state.z;speed=e.boss?1.75:2.1}
 const d=Math.hypot(tx-p.x,tz-p.z),oldX=p.x,oldZ=p.z;
 if(d>(e.aggro?(e.boss?2.75:1.75):.25)&&e.stunned===0){const dx=(tx-p.x)/d*speed*dt,dz=(tz-p.z)/d*speed*dt;if(clearAt(p.x+dx,p.z+dz,.36)){p.x+=dx;p.z+=dz}else if(clearAt(p.x+dx,p.z,.36))p.x+=dx;else if(clearAt(p.x,p.z+dz,.36))p.z+=dz;const goal=Math.atan2(dx,dz);e.root.rotation.y+=Math.atan2(Math.sin(goal-e.root.rotation.y),Math.cos(goal-e.root.rotation.y))*(1-Math.exp(-dt*6))}
 if(e.aggro&&dist<(e.boss?3:2.1)&&e.attackCd===0&&e.stunned===0){lastCombatAt=clock;state.hp-=e.boss?14:9;e.attackCd=e.boss?1.8:1.5;if(state.hp<=0)revive()}
 if(e.boss&&e.nameTag){e.nameTag.visible=true;e.nameTag.position.set(p.x,heightAt(p.x,p.z)+4.65,p.z)}
  const moved=Math.hypot(p.x-oldX,p.z-oldZ);e.phase+=moved*4;p.y=heightAt(p.x,p.z);const stride=Math.sin(e.phase),power=Math.min(1,moved/(dt||1));e.legs[0].rotation.x=stride*.48*power;e.legs[1].rotation.x=-stride*.48*power;e.body.position.y=1.23+Math.abs(stride)*.025*power;e.body.rotation.x=e.attackCd>1.2?Math.sin((1.5-e.attackCd)/.3*Math.PI)*.2:0;e.body.rotation.z=e.stunned>0?Math.sin(clock*8)*.08:0;
 e.shadow.position.set(p.x,p.y+.055,p.z);
}
// After leaving combat, health gradually returns without consuming potions.
const HEALTH_REGEN_DELAY=5,HEALTH_REGEN_RATE=3;
function inCombat(){
 return clock-lastCombatAt<HEALTH_REGEN_DELAY||enemies.some(e=>e.dead<=0&&e.aggro);
}
function updateHealthRegen(dt){
 if(inCombat()||dt<=0)return;
 const max=120+(state.level-1)*20;
 if(state.hp<max)state.hp=Math.min(max,state.hp+HEALTH_REGEN_RATE*dt);
}
const camFocus=new THREE.Vector3(state.x,heightAt(state.x,state.z)+2.15,state.z),camTarget=new THREE.Vector3(),camDirection=new THREE.Vector3(),camRay=new THREE.Raycaster();
function animateCamera(dt){
 // Follow only the yaw behind the character. Manual orbit remains available.
 if(cameraFollow){
  cameraFollowCooldown=Math.max(0,cameraFollowCooldown-dt);
  if(!modalKind&&look.id===null&&cameraFollowCooldown<=0){
   const behindYaw=hero.root.rotation.y+Math.PI;
   const yawDifference=Math.atan2(Math.sin(behindYaw-cameraYaw),Math.cos(behindYaw-cameraYaw));
   cameraYaw+=yawDifference*(1-Math.exp(-dt*3.8));
  }
 }
 camTarget.set(state.x,heightAt(state.x,state.z)+2.15,state.z);camFocus.lerp(camTarget,1-Math.exp(-dt*12));camDirection.set(Math.sin(cameraYaw)*Math.cos(cameraPitch),Math.sin(cameraPitch),Math.cos(cameraYaw)*Math.cos(cameraPitch));
 camRay.set(camFocus,camDirection);camRay.far=cameraDistance;let distance=cameraDistance;const hits=camRay.intersectObjects(cameraBlockers,false);if(hits.length)distance=Math.min(distance,Math.max(1.15,hits[0].distance-.35));
 for(let d=1.1;d<distance;d+=.55){const x=camFocus.x+camDirection.x*d,z=camFocus.z+camDirection.z*d,y=camFocus.y+camDirection.y*d;if(y<heightAt(x,z)+.5){distance=Math.max(1.1,d-.55);break}}
 actualCameraDistance=distance<actualCameraDistance?distance:THREE.MathUtils.damp(actualCameraDistance,distance,8,dt);camera.position.copy(camFocus).addScaledVector(camDirection,actualCameraDistance);camera.position.y=Math.max(camera.position.y,heightAt(camera.position.x,camera.position.z)+.4);camera.lookAt(camFocus);
 sun.position.set(state.x-30,48,state.z+22);sun.target.position.set(state.x,0,state.z);sun.target.updateMatrixWorld();
}
const attackOverlay=$('attack').querySelector('.cooldown'),stompOverlay=$('stomp').querySelector('.cooldown');
function update(dt){clock+=dt;saveClock+=dt;hudClock+=dt;attackCooldown=Math.max(0,attackCooldown-dt);stompCooldown=Math.max(0,stompCooldown-dt);
 if(attackElapsed>=0){
  attackElapsed+=dt;
  if(attackElapsed>=.34&&!attackLanded){
   attackLanded=true;
   if(isAliveTarget(swingTarget)&&!meleeFailure(swingTarget))damageEnemy(swingTarget,18+(state.level-1)*3);
  }
  if(attackElapsed>=.8){attackElapsed=-1;swingTarget=null}
 }
 if(stompElapsed>=0){stompElapsed+=dt;if(stompElapsed>=.36&&!stompLanded){stompLanded=true;shockAge=0;stompRing.position.set(state.x,heightAt(state.x,state.z)+.08,state.z);for(const e of enemies)if(e.dead<=0&&Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)<4.5){e.stunned=2.5;damageEnemy(e,6)}}if(stompElapsed>=.75)stompElapsed=-1}
 movement(dt);
 if(state.quest===7&&Math.hypot(state.x-SCOUT_X,state.z-SCOUT_Z)<5.2){
  state.quest=8;save();msg('Следы исполина найдены! Вернись к наставнику.');
 }
 enemies.forEach(e=>updateEnemy(e,dt));updateHealthRegen(dt);if(autoAttack)tryAutoSwing();animateTauren(mentor,clock+.7,dt);animateTauren(trader,clock+2.4,dt);
 fire.scale.set(1+Math.sin(clock*7)*.035,1+Math.sin(clock*9)*.1,1);questMarker.position.set(-1.5,heightAt(-1.5,-5)+5.18+Math.sin(clock*2)*.09,-5);relic.rotation.y=clock*.45;relic.position.y=heightAt(35,-11.8)+1.3+Math.sin(clock*2)*.1;relicShadow.position.set(35,heightAt(35,-11.8)+.06,-11.8);
 selection.visible=isAliveTarget(selected);
 if(selection.visible){
  selection.position.set(selected.root.position.x,heightAt(selected.root.position.x,selected.root.position.z)+.06,selected.root.position.z);
  selection.material.color.setHex(meleeFailure(selected)?0xd97456:0xe9db84);
  selection.material.opacity=autoAttack?.96:.79;selection.scale.setScalar(selected.boss?1.65:1);
 }
 shockAge+=dt;stompRing.visible=shockAge<.6;if(stompRing.visible){stompRing.scale.setScalar(1+shockAge*7);stompRing.material.opacity=(1-shockAge/.6)*.7}
 attackOverlay.style.transform='scaleY('+clamp(attackCooldown/SWING_PERIOD,0,1)+')';stompOverlay.style.transform='scaleY('+clamp(stompCooldown/8,0,1)+')';$('rageFill').style.width=(1-clamp(attackCooldown/SWING_PERIOD,0,1))*100+'%';
 if(hudClock>.12){hudClock=0;updateHUD();drawMap()}if(saveClock>6){saveClock=0;save()}
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));clearInput()});
let last=performance.now();function frame(t){const dt=Math.min((t-last)/1000,.05);last=t;if(!document.hidden){if(!modalKind)update(dt);animateCamera(dt);renderer.render(scene,camera)}requestAnimationFrame(frame)}
update(0);updateHUD();drawMap();animateCamera(1);renderer.render(scene,camera);requestAnimationFrame(frame);$('loader').remove();
if(state.quest===0)msg('Мулгор. Поговори с наставником у большого тотема.',4400);
}catch(error){const text=$('loadText');if(text)text.textContent='Ошибка запуска: '+String(error.message||error);throw error}
