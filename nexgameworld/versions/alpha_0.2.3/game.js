// NexGame 3D · Alpha 0.2.3 — a small, procedural Mulgore-inspired starting zone.
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
function makePlainstrider(x,z,index){const root=group(scene,x,heightAt(x,z),z),body=group(root,0,1.23,0),brown=material(index%2?0x826649:0x917044),plume=material(0xa77944),legs=[];ell(body,brown,0,.1,0,.58,.49,.8);ell(body,plume,0,.18,-.4,.53,.35,.47);rod(body,brown,[0,.25,.5],[0,.92,.82],.18,.13);ell(body,brown,0,.97,.85,.25,.29,.27);ell(body,M.gold,0,.89,1.12,.15,.1,.28);for(const s of [-1,1]){ell(body,M.black,s*.19,1.02,.99,.045,.045,.03);const wing=ell(body,plume,s*.46,.12,-.05,.14,.35,.6);wing.rotation.x=.2;const leg=group(root,s*.24,1.1,.06);rod(leg,M.hideDark,[0,0,0],[0,-.93,0],.055);box(leg,M.wood,0,-1,.14,.18,.12,.38);legs.push(leg)}for(let i=0;i<3;i++){const f=ell(body,plume,(i-1)*.16,.98,.63,.055,.42,.11);f.rotation.x=-.2}fuse(root);return{root,body,legs,shadow:contactShadow(1.7),spawnX:x,spawnZ:z,hp:54,maxHp:54,dead:0,hit:0,aggro:false,stunned:0,attackCd:0,phase:index,roamTime:rand()*8,index}}
const enemies=[[-9,-23],[1,-28],[13,-22],[21,-33],[-22,-35],[-28,29],[15,36],[34,13]].map(([x,z],i)=>makePlainstrider(x,z,i));
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
const initial={x:0,z:10,yaw:Math.PI,hp:120,level:1,xp:0,gold:0,potions:2,quest:0,kills:0,relic:false};let state={...initial};
try{const saved=JSON.parse(localStorage.getItem(saveKey));if(saved&&typeof saved==='object')for(const k of Object.keys(initial))if(typeof saved[k]===typeof initial[k]&&(typeof saved[k]!=='number'||Number.isFinite(saved[k])))state[k]=saved[k]}catch(e){}
state.level=clamp(Math.floor(state.level),1,60);state.quest=clamp(Math.floor(state.quest),0,6);state.kills=clamp(Math.floor(state.kills),0,3);state.potions=clamp(Math.floor(state.potions),0,99);state.gold=clamp(Math.floor(state.gold),0,99999);state.xp=Math.max(0,state.xp);state.hp=clamp(state.hp,1,120+(state.level-1)*20);if(!clearAt(state.x,state.z)){state.x=initial.x;state.z=initial.z}
hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;
const save=()=>{try{localStorage.setItem(saveKey,JSON.stringify(state))}catch(e){}};
const keys=new Set(),joy={x:0,y:0,id:null},look={id:null,x:0,y:0,startX:0,startY:0},stick=$('stick'),nub=$('nub');
let modalKind=null,selected=null,attackElapsed=-1,attackCooldown=0,attackLanded=false,stompElapsed=-1,stompCooldown=0,stompLanded=false,shockAge=9,clock=0,saveClock=0,hudClock=0,velocityX=0,velocityZ=0;
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
canvas.addEventListener('pointerdown',e=>{if(modalKind||look.id!==null||(e.pointerType==='touch'&&e.clientX<innerWidth*.35))return;look.id=e.pointerId;look.x=look.startX=e.clientX;look.y=look.startY=e.clientY;cameraFollowCooldown=.85;canvas.setPointerCapture(e.pointerId);if(document.activeElement===cameraSlider)cameraSlider.blur()});
canvas.addEventListener('pointermove',e=>{if(look.id!==e.pointerId)return;cameraYaw-=(e.clientX-look.x)*.007;cameraPitch=clamp(cameraPitch+(e.clientY-look.y)*.0045,.1,1.05);look.x=e.clientX;look.y=e.clientY;cameraFollowCooldown=.85});
canvas.addEventListener('pointerup',e=>{if(look.id!==e.pointerId)return;if(Math.hypot(e.clientX-look.startX,e.clientY-look.startY)<7){pickRay.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);const alive=enemies.filter(e=>e.dead<=0),hits=pickRay.intersectObjects(alive.map(e=>e.root),true);if(hits.length){let o=hits[0].object;while(o.parent&&o.parent!==scene)o=o.parent;selected=alive.find(e=>e.root===o)||null;updateHUD()}}look.id=null;cameraFollowCooldown=Math.max(cameraFollowCooldown,.85)});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(look.id===e.pointerId){look.id=null;cameraFollowCooldown=Math.max(cameraFollowCooldown,.85)}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{if(!modalKind)setCameraDistance(cameraDistance+Math.sign(e.deltaY)*.5)},{passive:true});
addEventListener('blur',clearInput);addEventListener('pagehide',()=>{clearInput();save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();save()}});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape'){e.preventDefault();if(modalKind)closeDialog();else pause();return}if(e.target===cameraSlider)return;if(e.target instanceof HTMLButtonElement&&(k===' '||k==='enter'))return;if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab'].includes(k))e.preventDefault();if(modalKind)return;if(['1',' ','2','3','e','i','tab'].includes(k)){if(e.repeat)return;if(k==='1'||k===' ')attack();if(k==='2')stomp();if(k==='3')heal();if(k==='e')interact();if(k==='i')bag();if(k==='tab'){selected=nearestEnemy(18);updateHUD()}return}keys.add(k)});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
let toastTimer;
function msg(text,duration=2600){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),duration)}
function openDialog(title,sub,lines,kind='dialog'){clearInput();modalKind=kind;$('mtitle').textContent=title;$('msub').textContent=sub;$('mbody').replaceChildren();$('choices').replaceChildren();for(const line of lines){const p=document.createElement('p');p.textContent=line;$('mbody').appendChild(p)}$('modal').hidden=false;$('interact').hidden=true}
function choice(label,fn,type=''){const button=document.createElement('button');button.className='choice '+type;button.textContent=label;button.addEventListener('click',fn);$('choices').appendChild(button)}
function closeDialog(){modalKind=null;$('modal').hidden=true;clearInput();if(document.activeElement instanceof HTMLButtonElement)document.activeElement.blur();save();updateHUD()}
function pause(){if(modalKind==='pause'){closeDialog();return}openDialog('У костра','NEXGAME · МУЛГОР · ALPHA 0.2.3',['Мир поставлен на паузу. Твой путь начинается на равнинах Мулгора.','Передвижение — WASD или джойстик. Вращай камеру по свободной части экрана. Джойстик вверх/вниз — идти; влево/вправо — непрерывно поворачиваться. Приближение — ползунок или колёсико мыши.','1 / пробел — удар топором. 2 — громовая поступь. 3 — лечебный настой. E — разговор.','Автоследование камеры включается в меню управления; угол по вертикали сохраняется.'], 'pause');choice('Продолжить путь',closeDialog);choice('Начать заново',()=>{openDialog('Начать новый путь?','СБРОС ПРОГРЕССА',['Будут сброшены задания, уровень и предметы этой версии Мулгора.']);choice('Сбросить прогресс',resetWorld,'danger');choice('Вернуться',pause,'alt')},'alt')}
function resetWorld(){state={...initial};for(const e of enemies){e.hp=e.maxHp;e.dead=0;e.hit=0;e.aggro=false;e.stunned=0;e.attackCd=0;e.root.visible=true;e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ)}hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;hero.phase=hero.walk=0;attackElapsed=stompElapsed=-1;attackCooldown=stompCooldown=0;selected=null;shockAge=9;cameraYaw=0;cameraPitch=.29;cameraFollowCooldown=0;closeDialog();msg('Новый путь начинается в лагере Нараче')}
function nearTarget(){for(const n of npcs)if(Math.hypot(state.x-n.x,state.z-n.z)<3.5)return{kind:'npc',npc:n};if(state.quest===4&&Math.hypot(state.x-35,state.z+11.8)<3.1)return{kind:'relic'};return null}
function interact(){if(modalKind)return;const target=nearTarget();if(!target){msg('Подойди к жителю или предмету ближе');return}if(target.kind==='relic'){state.quest=5;state.relic=true;save();updateHUD();msg('Получено перо предков');return}if(target.npc.type==='mentor')mentorTalk();else traderTalk()}
function xpNeed(){return 100+(state.level-1)*50}
function experience(n){state.xp+=n;while(state.xp>=xpNeed()){state.xp-=xpNeed();state.level++;state.hp=120+(state.level-1)*20;msg('Новый уровень: '+state.level+'!')}}
function mentorTalk(){const q=state.quest;
 if(q===0){openDialog('Первые шаги','НАСТАВНИК КАМЕННЫЙ РОГ',['Почувствуй землю под копытами, молодой воин. Здесь начинается твой путь.','За лагерем пасутся равнинные долгоноги. Победи трёх и покажи, что готов защищать свой народ.','Награда: 25 монет и 80 опыта.']);choice('Принять — Обряд силы',()=>{state.quest=1;state.kills=0;closeDialog();msg('Задание принято: Обряд силы')});choice('Я вернусь позже',closeDialog,'alt')}
 else if(q===1){openDialog('Обряд силы','НАСТАВНИК КАМЕННЫЙ РОГ',['Твоя цель — равнинные долгоноги за лагерем. Не нападай на всё стадо сразу.','Побеждено: '+state.kills+' из 3.']);choice('Продолжить охоту',closeDialog)}
 else if(q===2){openDialog('Обряд силы завершён','НАСТАВНИК КАМЕННЫЙ РОГ',['Хорошая работа. Но сила — только начало пути. Мудрость приходит к тем, кто умеет слушать.']);choice('Получить 25 монет и 80 опыта',()=>{state.quest=3;state.gold+=25;experience(80);closeDialog();msg('Обряд силы пройден')})}
 else if(q===3){openDialog('Голос предков','НАСТАВНИК КАМЕННЫЙ РОГ',['К востоку стоит старый тотем. Пройди по тропе и принеси лежащее перед ним перо предков.','Не торопись. Посмотри на землю, которую однажды будешь защищать.','Награда: 40 монет и 110 опыта.']);choice('Принять — Голос предков',()=>{state.quest=4;closeDialog();msg('Найди тотем к востоку от лагеря')});choice('Позже',closeDialog,'alt')}
 else if(q===4){openDialog('Голос предков','НАСТАВНИК КАМЕННЫЙ РОГ',['Иди на восток по тропе. Перо ждёт тебя у высокого тотема с бирюзовыми крыльями.']);choice('Я найду его',closeDialog)}
 else if(q===5){openDialog('Земля помнит','НАСТАВНИК КАМЕННЫЙ РОГ',['Ты услышал голос долины. Пусть это будет первым из многих путешествий.']);choice('Отдать перо: 40 монет и 110 опыта',()=>{state.quest=6;state.relic=false;state.gold+=40;experience(110);closeDialog();msg('Первые испытания Мулгора пройдены')})}
 else{openDialog('Путь продолжается','НАСТАВНИК КАМЕННЫЙ РОГ',['Ты прошёл первые испытания. Исследуй долину, тренируйся и возвращайся к костру. Впереди ещё много дорог.']);choice('До встречи',closeDialog)}
}
function traderTalk(){openDialog('Травница Тихая Заря','ПРИПАСЫ ЛАГЕРЯ',['Настой луговых трав восстанавливает 55 здоровья. Цена — 10 монет.','В твоём кошеле: '+state.gold+' монет.']);choice('Купить настой — 10 монет',()=>{if(state.gold<10){msg('Недостаточно монет');return}state.gold-=10;state.potions++;closeDialog();msg('Лечебный настой добавлен в рюкзак')});choice('До встречи',closeDialog,'alt')}
function bag(){if(modalKind==='bag'){closeDialog();return}openDialog('Рюкзак странника','ТАУРЕН · ВОИН · УРОВЕНЬ '+state.level,['Походный топор — оружие молодого воина.','Кожаный пояс и накидка — начальное снаряжение.',state.relic?'Перо предков — предмет задания.':'Лечебных настоев: '+state.potions+'.','Монет: '+state.gold+'.'],'bag');choice('Выпить лечебный настой',()=>{if(heal(true))closeDialog()});choice('Закрыть рюкзак',closeDialog,'alt')}
function heal(fromBag=false){if(modalKind&&!fromBag)return false;if(state.potions<=0){msg('Лечебные настои закончились');return false}const max=120+(state.level-1)*20;if(state.hp>=max){msg('Здоровье уже полное');return false}state.hp=Math.min(max,state.hp+55);state.potions--;save();updateHUD();msg('Луговые травы восстановили здоровье');return true}
function nearestEnemy(range){let best=null,dist=range;for(const e of enemies){if(e.dead>0)continue;const d=Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z);if(d<dist){dist=d;best=e}}return best}
function attack(){if(modalKind||attackCooldown>0||stompElapsed>=0)return;attackElapsed=0;attackCooldown=.86;attackLanded=false;if(!selected||selected.dead>0||Math.hypot(state.x-selected.root.position.x,state.z-selected.root.position.z)>3.3)selected=nearestEnemy(3.3);if(selected){hero.root.rotation.y=Math.atan2(selected.root.position.x-state.x,selected.root.position.z-state.z);state.yaw=hero.root.rotation.y}updateHUD()}
function damageEnemy(e,amount){if(e.dead>0)return;e.hp-=amount;e.aggro=true;e.hit=.2;if(e.hp<=0){e.hp=0;e.dead=23;e.aggro=false;e.root.visible=false;e.shadow.visible=false;state.gold+=4;experience(22);if(state.quest===1){state.kills=Math.min(3,state.kills+1);if(state.kills===3){state.quest=2;msg('Обряд силы: вернись к наставнику')}}if(selected===e)selected=null;save()}updateHUD()}
function stomp(){if(modalKind||stompCooldown>0||attackElapsed>=0)return;stompElapsed=0;stompCooldown=8;stompLanded=false}
$('attack').addEventListener('pointerdown',e=>{e.preventDefault();attack()});$('stomp').addEventListener('pointerdown',e=>{e.preventDefault();stomp()});
// Native click covers keyboard activation without doubling pointer attacks.
for(const [id,fn] of [['attack',attack],['stomp',stomp]])$(id).addEventListener('click',e=>{if(e.detail===0)fn()});
$('heal').addEventListener('click',()=>heal());$('interact').addEventListener('click',interact);$('bag').addEventListener('click',bag);$('pause').addEventListener('click',pause);
const questLines=[['Первые шаги','Поговорите с наставником\nу большого тотема.'],['Обряд силы','Равнинные долгоноги: 0 / 3'],['Обряд силы','Вернитесь к наставнику.'],['Следующее испытание','Поговорите с наставником.'],['Голос предков','Найдите перо у восточного тотема.'],['Голос предков','Отнесите перо наставнику.'],['Дороги Мулгора','Первые испытания пройдены.\nИсследуйте долину.']];
let lastMarker='';
function updateHUD(){const max=120+(state.level-1)*20;$('levelBadge').textContent=state.level;$('hpText').textContent=Math.ceil(state.hp)+' / '+max;$('hpFill').style.width=state.hp/max*100+'%';$('xpFill').style.width=Math.min(100,state.xp/xpNeed()*100)+'%';$('xpText').textContent='Опыт '+state.xp+' / '+xpNeed();$('potionCount').textContent='Настой · '+state.potions;$('qtitle').textContent=questLines[state.quest][0];$('qtext').textContent=state.quest===1?'Равнинные долгоноги: '+state.kills+' / 3':questLines[state.quest][1];
 const camp=Math.hypot(state.x+3,state.z-3)<23;$('area').textContent=camp?'Лагерь Нараче':'Плато Красного Облака';$('mapLabel').textContent=camp?'Лагерь Нараче':'Мулгор';
 const target=nearTarget();$('interact').hidden=Boolean(modalKind)||!target;if(target)$('interact').innerHTML=target.kind==='relic'?'Взять перо <kbd>E</kbd>':'Поговорить <kbd>E</kbd>';
 const valid=selected&&selected.dead<=0;$('targetFrame').hidden=!valid;$('zoneTitle').hidden=Boolean(valid);if(valid){$('targetName').textContent='Равнинный долгоног · 1';$('targetFill').style.width=selected.hp/selected.maxHp*100+'%';$('targetHp').textContent=Math.ceil(selected.hp)+' / '+selected.maxHp}
 const marker=state.quest===0||state.quest===3?'!':state.quest===2||state.quest===5?'?':'·';questMarker.visible=state.quest!==6;if(marker!==lastMarker){lastMarker=marker;const c=questMarker.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 72px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#3a2c19';ctx.fillStyle=marker==='·'?'#b4b395':'#ffe180';ctx.strokeText(marker,256,48);ctx.fillText(marker,256,48);questMarker.material.map.needsUpdate=true}relic.visible=state.quest===4;relicShadow.visible=relic.visible;
}
const minimap=$('minimap'),mapCtx=minimap.getContext('2d');
function drawMap(){const c=mapCtx,s=240,k=4.1;c.clearRect(0,0,s,s);c.fillStyle='#788252';c.fillRect(0,0,s,s);c.save();c.translate(s/2,s/2);c.fillStyle='#6d774b';for(let i=0;i<8;i++){c.beginPath();c.ellipse(Math.sin(i*1.6)*90,Math.cos(i*1.6)*90,38,17,i,0,TAU);c.fill()}c.translate(-state.x*k,-state.z*k);c.strokeStyle='#c0ae71';c.lineWidth=7;c.lineCap='round';for(const route of routes){c.beginPath();route.forEach(([x,z],i)=>i?c.lineTo(x*k,z*k):c.moveTo(x*k,z*k));c.stroke()}for(const p of mapLandmarks){c.fillStyle=p.color;c.beginPath();c.arc(p.x*k,p.z*k,Math.max(3,p.r*k),0,TAU);c.fill();c.strokeStyle='#4e4e30';c.lineWidth=1;c.stroke()}c.fillStyle='#4f8d85';c.beginPath();c.ellipse(26*k,29*k,6*k,3*k,0,0,TAU);c.fill();for(const e of enemies)if(e.dead<=0){c.fillStyle=e.aggro?'#b94f35':'#d8c073';c.beginPath();c.arc(e.root.position.x*k,e.root.position.z*k,2.5,0,TAU);c.fill()}if(state.quest<6){c.fillStyle='#fff397';c.font='bold 19px Georgia';c.textAlign='center';c.fillText(state.quest===2||state.quest===5?'?':'!',-1.5*k,-5*k-5)}if(state.quest===4){c.fillStyle='#a6ffeb';c.beginPath();c.arc(35*k,-11.8*k,5,0,TAU);c.fill()}c.restore();c.save();c.translate(120,120);c.rotate(-hero.root.rotation.y);c.fillStyle='#fff1b5';c.strokeStyle='#463723';c.lineWidth=2;c.beginPath();c.moveTo(0,10);c.lineTo(-6,-7);c.lineTo(0,-3);c.lineTo(6,-7);c.closePath();c.fill();c.stroke();c.restore()}
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
function revive(){state.hp=120+(state.level-1)*20;state.x=initial.x;state.z=initial.z;selected=null;attackElapsed=stompElapsed=-1;attackCooldown=0;for(const e of enemies)e.aggro=false;clearInput();hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);save();msg('Духи вернули тебя к костру. Твой путь продолжается.',3600)}
function updateEnemy(e,dt){if(e.dead>0){e.dead-=dt;if(e.dead<=0){e.dead=0;e.hp=e.maxHp;e.root.visible=e.shadow.visible=true;e.aggro=false;e.stunned=0;e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ)}return}
 e.hit=Math.max(0,e.hit-dt);e.stunned=Math.max(0,e.stunned-dt);e.attackCd=Math.max(0,e.attackCd-dt);e.roamTime+=dt;const p=e.root.position,dist=Math.hypot(state.x-p.x,state.z-p.z),home=Math.hypot(state.x-e.spawnX,state.z-e.spawnZ);
 if(e.aggro&&(home>19||dist>22)){e.aggro=false;e.hp=e.maxHp}
 let tx=e.spawnX+Math.sin(e.roamTime*.18+e.index)*2.2,tz=e.spawnZ+Math.cos(e.roamTime*.14+e.index)*2.2,speed=.42;
 if(e.aggro){tx=state.x;tz=state.z;speed=2.1}
 const d=Math.hypot(tx-p.x,tz-p.z),oldX=p.x,oldZ=p.z;
 if(d>(e.aggro?1.75:.25)&&e.stunned===0){const dx=(tx-p.x)/d*speed*dt,dz=(tz-p.z)/d*speed*dt;if(clearAt(p.x+dx,p.z+dz,.36)){p.x+=dx;p.z+=dz}else if(clearAt(p.x+dx,p.z,.36))p.x+=dx;else if(clearAt(p.x,p.z+dz,.36))p.z+=dz;const goal=Math.atan2(dx,dz);e.root.rotation.y+=Math.atan2(Math.sin(goal-e.root.rotation.y),Math.cos(goal-e.root.rotation.y))*(1-Math.exp(-dt*6))}
 if(e.aggro&&dist<2.1&&e.attackCd===0&&e.stunned===0){state.hp-=9;e.attackCd=1.5;if(state.hp<=0)revive()}
 const moved=Math.hypot(p.x-oldX,p.z-oldZ);e.phase+=moved*4;p.y=heightAt(p.x,p.z);const stride=Math.sin(e.phase),power=Math.min(1,moved/(dt||1));e.legs[0].rotation.x=stride*.48*power;e.legs[1].rotation.x=-stride*.48*power;e.body.position.y=1.23+Math.abs(stride)*.025*power;e.body.rotation.x=e.attackCd>1.2?Math.sin((1.5-e.attackCd)/.3*Math.PI)*.2:0;e.body.rotation.z=e.stunned>0?Math.sin(clock*8)*.08:0;
 e.shadow.position.set(p.x,p.y+.055,p.z);
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
 if(attackElapsed>=0){attackElapsed+=dt;if(attackElapsed>=.34&&!attackLanded){attackLanded=true;if(selected&&selected.dead<=0&&Math.hypot(state.x-selected.root.position.x,state.z-selected.root.position.z)<3.4)damageEnemy(selected,18+(state.level-1)*3)}if(attackElapsed>=.8)attackElapsed=-1}
 if(stompElapsed>=0){stompElapsed+=dt;if(stompElapsed>=.36&&!stompLanded){stompLanded=true;shockAge=0;stompRing.position.set(state.x,heightAt(state.x,state.z)+.08,state.z);for(const e of enemies)if(e.dead<=0&&Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)<4.5){e.stunned=2.5;damageEnemy(e,6)}}if(stompElapsed>=.75)stompElapsed=-1}
 movement(dt);enemies.forEach(e=>updateEnemy(e,dt));animateTauren(mentor,clock+.7,dt);animateTauren(trader,clock+2.4,dt);
 fire.scale.set(1+Math.sin(clock*7)*.035,1+Math.sin(clock*9)*.1,1);questMarker.position.set(-1.5,heightAt(-1.5,-5)+5.18+Math.sin(clock*2)*.09,-5);relic.rotation.y=clock*.45;relic.position.y=heightAt(35,-11.8)+1.3+Math.sin(clock*2)*.1;relicShadow.position.set(35,heightAt(35,-11.8)+.06,-11.8);
 selection.visible=Boolean(selected&&selected.dead<=0);if(selection.visible)selection.position.set(selected.root.position.x,heightAt(selected.root.position.x,selected.root.position.z)+.06,selected.root.position.z);
 shockAge+=dt;stompRing.visible=shockAge<.6;if(stompRing.visible){stompRing.scale.setScalar(1+shockAge*7);stompRing.material.opacity=(1-shockAge/.6)*.7}
 attackOverlay.style.transform='scaleY('+clamp(attackCooldown/.86,0,1)+')';stompOverlay.style.transform='scaleY('+clamp(stompCooldown/8,0,1)+')';$('rageFill').style.width=(1-clamp(attackCooldown/.86,0,1))*100+'%';
 if(hudClock>.12){hudClock=0;updateHUD();drawMap()}if(saveClock>6){saveClock=0;save()}
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));clearInput()});
let last=performance.now();function frame(t){const dt=Math.min((t-last)/1000,.05);last=t;if(!document.hidden){if(!modalKind)update(dt);animateCamera(dt);renderer.render(scene,camera)}requestAnimationFrame(frame)}
update(0);updateHUD();drawMap();animateCamera(1);renderer.render(scene,camera);requestAnimationFrame(frame);$('loader').remove();
if(state.quest===0)msg('Мулгор. Поговори с наставником у большого тотема.',4400);
}catch(error){const text=$('loadText');if(text)text.textContent='Ошибка запуска: '+String(error.message||error);throw error}
