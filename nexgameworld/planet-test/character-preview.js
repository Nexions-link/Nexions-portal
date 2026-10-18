// Interactive portrait view of the CURRENT player mesh (including equipment).
// One extra WebGL context is used only while the character window is visible.
export function createCharacterPreview({THREE,heroRoot}){
 let host=null,renderer=null,world=null,avatar=null,camera=null,angle=-.25,acc=0,disabled=false,stand=null;
 const warm=0xf9dfa9;
 function release(){
  if(avatar){avatar.removeFromParent();avatar=null;}
  if(stand){stand.removeFromParent();stand.geometry.dispose();stand.material.dispose();stand=null;}
  if(renderer){
   renderer.dispose();
   renderer.forceContextLoss?.();
   renderer.domElement.remove?.();
   renderer=null;
  }
  world=null;camera=null;host=null;acc=0;
 }
 function refresh(){
  if(!world)return;
  if(avatar)avatar.removeFromParent();
  // Clone geometry/texture references but NOT the live actor's world transform.
  // Shared source resources belong to the game and must never be disposed here.
  avatar=heroRoot.clone(true);
  avatar.position.set(0,0,0);
  avatar.quaternion.identity();
  avatar.scale.set(1,1,1);
  const bounds=new THREE.Box3().setFromObject(avatar);
  const size=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)return;
  avatar.position.sub(center);
  world.add(avatar);
  // A low carved stone pedestal replaces the flat, transparent preview void.
  // Its materials are unique to the inspector and can be safely disposed.
  if(stand)stand.removeFromParent();
  if(stand){stand.geometry.dispose();stand.material.dispose();}
  stand=new THREE.Mesh(new THREE.CylinderGeometry(.84,.93,.11,32),
   new THREE.MeshStandardMaterial({color:0x5b5440,roughness:.94,metalness:.05}));
  stand.position.set(0,-size.y/2-.06,0);stand.receiveShadow=false;world.add(stand);
  const rect=host.getBoundingClientRect();
  const w=Math.max(1,rect.width||320),h=Math.max(1,rect.height||350);
  const verticalFov=camera.fov*Math.PI/180;
  const horizontalFov=2*Math.atan(Math.tan(verticalFov/2)*w/h);
  // Keep the silhouette between the side sockets; the canvas itself spans
  // the entire panel to avoid a tiny cropped 3D viewport on mobile.
  const radius=Math.max(size.y/(2*Math.tan(verticalFov/2))*.96,
   size.x/(2*Math.tan(horizontalFov/2)*.91),3.7);
  camera.position.set(0,size.y*.025,radius);
  camera.lookAt(0,0,0);
  avatar.rotation.y=angle;
 }
 function mount(container,gesture){
  if(disabled)return;
  if(host!==container){
   release();
   host=container;
   if(typeof window==='undefined'||!(window.WebGLRenderingContext||window.WebGL2RenderingContext)){
    container.dataset.preview='unsupported';return;
   }
   try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.18;
    renderer.shadowMap.enabled=false;
    renderer.domElement.setAttribute('aria-hidden','true');
    container.append(renderer.domElement);
    world=new THREE.Scene();
    world.add(new THREE.HemisphereLight(0xffeed0,0x625047,2.3));
    const key=new THREE.DirectionalLight(warm,2.9);key.position.set(-3,7,8);world.add(key);
    const rim=new THREE.DirectionalLight(0x96b6a6,1.6);rim.position.set(4,4,-6);world.add(rim);
    camera=new THREE.PerspectiveCamera(38,1,.1,100);
    refresh();
   }catch(error){
    // No GPU context in low-memory Safari: equipment still works normally.
    console.warn('Character 3D inspection unavailable:',error);
    release();container.dataset.preview='unsupported';host=container;
   }
  }
  if(gesture){
   let active=null,lastX=0;
   gesture.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false)return;
    active=event.pointerId;lastX=event.clientX;
    gesture.setPointerCapture?.(active);event.preventDefault?.();
   });
   gesture.addEventListener('pointermove',event=>{
    if(active!==event.pointerId)return;
    const dx=event.clientX-lastX;lastX=event.clientX;
    angle+=dx*.012;
    if(avatar)avatar.rotation.y=angle;
    event.preventDefault?.();
   });
   const done=event=>{if(event.pointerId===active)active=null;};
   gesture.addEventListener('pointerup',done);
   gesture.addEventListener('pointercancel',done);
   gesture.addEventListener('lostpointercapture',done);
   gesture.addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    angle+=(event.key==='ArrowLeft'?-.22:.22);
    if(avatar)avatar.rotation.y=angle;
    event.preventDefault?.();
   });
  }
 }
 function rotate(delta=null){
  angle=delta===null?0:angle+delta;
  if(avatar)avatar.rotation.y=angle;
  acc=1; // Render on the very next animation frame.
 }
 function tick(dt){
  if(!renderer||!host||!avatar||!camera)return;
  acc+=Math.min(.1,Math.max(0,dt));
  if(acc<1/24)return;
  acc=0;
  const bounds=host.getBoundingClientRect();
  const w=Math.max(1,Math.floor(bounds.width||320)),h=Math.max(1,Math.floor(bounds.height||350));
  if(renderer.domElement.width!==Math.floor(w*renderer.getPixelRatio())||
     renderer.domElement.height!==Math.floor(h*renderer.getPixelRatio())){
   renderer.setSize(w,h,false);
   camera.aspect=w/h;camera.updateProjectionMatrix();
   // Adjust the silhouette if Safari resizes the portrait during browsing.
   refresh();
  }
  renderer.render(world,camera);
 }
 return {mount,refresh,tick,release,rotate};
}
