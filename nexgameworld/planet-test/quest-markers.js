// NexGameWorld PT: three-dimensional quest punctuation for spherical NPCs.
// Geometric depth and dark silhouette keep quest status readable against sky,
// grass and tent fabric. This module never changes quest logic or NPC targeting.
export const QUEST_MARKER_VISUALS=Object.freeze({
 available:Object.freeze({glyph:'!',color:0xedc756,edge:0x644c30,glow:.12}),
 ready:Object.freeze({glyph:'?',color:0xf1d16d,edge:0x644c30,glow:.11}),
 active:Object.freeze({glyph:'?',color:0xb0a17e,edge:0x514937,glow:.018})
});
export const markerStateFromGlyph=glyph=>glyph==='!'?'available':glyph==='?'?'ready':glyph==='·'?'active':null;

function exclamationShape(THREE){
 const shape=new THREE.Shape();
 shape.moveTo(-.115,.61);
 shape.quadraticCurveTo(-.158,.61,-.154,.56);
 shape.lineTo(-.077,-.135);
 shape.quadraticCurveTo(-.070,-.179,-.026,-.179);
 shape.lineTo(.026,-.179);
 shape.quadraticCurveTo(.070,-.179,.077,-.135);
 shape.lineTo(.154,.56);
 shape.quadraticCurveTo(.158,.61,.115,.61);
 shape.closePath();
 return shape;
}
function makeHaloTexture(THREE,document){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d');
 const grad=ctx.createRadialGradient(48,48,8,48,48,47);
 grad.addColorStop(0,'rgba(245,207,118,.31)');
 grad.addColorStop(.35,'rgba(235,183,79,.12)');
 grad.addColorStop(.72,'rgba(226,164,70,.035)');
 grad.addColorStop(1,'rgba(255,185,7,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,96,96);
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;
 return map;
}
export function createQuestMarkerFactory(THREE,{document,camera}){
 const haloMap=makeHaloTexture(THREE,document);
 const markers=[];
 const darkCache=new Map(),lightCache=new Map();
 const mat=(hex,dark)=>{
  const cache=dark?darkCache:lightCache;
  if(!cache.has(hex))cache.set(hex,new THREE.MeshBasicMaterial({
   color:hex,toneMapped:false,depthTest:true,depthWrite:true,side:THREE.DoubleSide
  }));
  return cache.get(hex);
 };
 const faceConfig={depth:.058,bevelEnabled:true,bevelSegments:3,steps:1,
  bevelSize:.019,bevelThickness:.014,curveSegments:16};
 function addMesh(parent,geometry,material,x=0,y=0,z=0){
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);mesh.castShadow=false;mesh.receiveShadow=false;
  // Quest punctuation must never steal taps intended for the NPC.
  mesh.raycast=()=>{};
  parent.add(mesh);return mesh;
 }
 function addBall(parent,x,y,z,radius,material){
  const b=addMesh(parent,new THREE.SphereGeometry(radius,12,8),material,x,y,z);
  b.scale.z=.75;return b;
 }
 function addSymbol(root,glyph,style){
  const edge=mat(style.edge,true),gold=mat(style.color,false);
  if(glyph==='!'){
   const shape=exclamationShape(THREE);
   const geom=new THREE.ExtrudeGeometry(shape,faceConfig);
   const outline=addMesh(root,geom,edge,0,0,-.056);
   outline.scale.set(1.16,1.10,1.05);
   addMesh(root,geom,gold,0,0,.038);
   addBall(root,0,-.42,-.042,.144,edge);
   addBall(root,0,-.42,.045,.112,gold);
  }else{
   const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.215,.32,0),new THREE.Vector3(-.19,.49,0),
    new THREE.Vector3(-.035,.59,0),new THREE.Vector3(.145,.54,0),
    new THREE.Vector3(.215,.38,0),new THREE.Vector3(.158,.24,0),
    new THREE.Vector3(.04,.10,0),new THREE.Vector3(.025,-.105,0)
   ],false,'centripetal');
   addMesh(root,new THREE.TubeGeometry(curve,26,.139,10,false),edge,0,0,-.038);
   addMesh(root,new THREE.TubeGeometry(curve,26,.103,10,false),gold,0,0,.034);
   addBall(root,.025,-.42,-.041,.142,edge);
   addBall(root,.025,-.42,.041,.108,gold);
  }
 }
 function create(glyph,height=5.48){
  const state=markerStateFromGlyph(glyph);
  if(!state)throw Error('Unsupported quest marker: '+glyph);
  const config=QUEST_MARKER_VISUALS[state];
  const marker=new THREE.Group();
  marker.name='nexgameworld-quest-'+state;
  // Keep the indicator close to the NPC's head, not high above the village.
  const visualHeight=height-.17;
  marker.position.y=visualHeight;
  marker.userData.questMarker=true;
  marker.userData.glyph=glyph; // Existing gameplay uses this exact token.
  marker.userData.questState=state;
  marker.userData.baseHeight=visualHeight;
  marker.userData.phase=markers.length*1.57;
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({
   map:haloMap,transparent:true,opacity:config.glow,
   color:0xffd236,depthWrite:false,depthTest:true,
   blending:THREE.AdditiveBlending,toneMapped:false
  }));
  halo.position.set(0,.08,-.15);
  halo.scale.set(1.28,1.45,1);
  halo.raycast=()=>{};
  halo.name='quest-soft-halo';
  marker.add(halo);
  addSymbol(marker,config.glyph,config);
  marker.scale.setScalar(.80);
  marker.visible=false;
  markers.push({marker,halo,config});
  return marker;
 }
 const tempRotation=new THREE.Quaternion(),tempPoint=new THREE.Vector3();
 function update(time=0,detail=.68){
  const t=Number.isFinite(time)?time:0;
  const quality=Math.max(0,Math.min(1,Number(detail)||0));
  camera.updateMatrixWorld();
  for(const {marker,halo,config} of markers){
   if(!marker.visible||!marker.parent)continue;
   marker.parent.updateWorldMatrix(true,false);
   // Real meshes face the camera, even when NPC local Y points radially outward.
   marker.parent.getWorldQuaternion(tempRotation);
   marker.quaternion.copy(tempRotation.invert()).multiply(camera.quaternion);
   const phase=t*1.3+marker.userData.phase;
   marker.position.y=marker.userData.baseHeight+Math.sin(phase)*.040;
   // No large-distance enlargement: this is a subtle NPC interaction cue.
   const distance=camera.position.distanceTo(marker.getWorldPosition(tempPoint));
   const distantBoost=1+THREE.MathUtils.clamp((distance-18)/38,0,.12);
   marker.scale.setScalar(.80*distantBoost*(1+.013*Math.sin(phase)));
   halo.material.opacity=quality<.35?0:config.glow*(.90+.10*Math.sin(t*1.8+marker.userData.phase));
  }
 }
 function dispose(){
  for(const {marker,halo} of markers){
   for(const obj of marker.children)if(obj.isMesh)obj.geometry.dispose();
   halo.material.dispose();
   marker.removeFromParent();
  }
  haloMap.dispose();
  markers.length=0;
 }
 return {create,update,dispose,markers};
}
