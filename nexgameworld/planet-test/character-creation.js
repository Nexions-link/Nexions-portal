import * as THREE from './vendor/three.module.js';
import {createTauren} from './start-zone.js?v=64604';
import {animateSphericalTauren} from './tauren-animation.js?v=64604';
export function mountCharacterCreation(form){
 const host=form.querySelector('.creation-stage'),race=form.elements.raceId,klass=form.elements.classId;
 let renderer,scene,actor,camera,angle=-.24,last=0;
 const describe=()=>{
  form.querySelector('.creation-race-description').textContent=race.value==='orc'?'Орки — могучие воины с зелёной кожей, тяжёлой челюстью и клыками.':'Таурены — рослые хранители равнин с рогами и густой гривой.';
  form.querySelector('.creation-class-description').textContent=klass.value==='hunter'?'Лук • Мана • Дальний бой\nАвтовыстрел, чародейский и оглушающий выстрелы с первого уровня. Залп — с 4-го, прицельный выстрел — с 8-го.':'Оружие • Ярость • Ближний бой\nРубящий удар и громовая поступь с первого уровня. Рывок — с 8-го.';
  form.querySelector('.creation-title').textContent=(race.value==='orc'?'Орк':'Таурен')+' · '+(klass.value==='hunter'?'Охотник':'Воин');
 };
 const build=()=>{
  describe();if(!scene)return;
  if(actor){actor.root.removeFromParent();actor.root.traverse(o=>{if(o.geometry&&!o.geometry.userData?.actorShared)o.geometry.dispose();if(o.material)for(const m of [o.material].flat())m.dispose();});}
  actor=createTauren(THREE,scene,{raceId:race.value,classId:klass.value,player:true});
  // Creation previews the hunter's starting equipment before a profile exists.
  if(actor.root.userData.hunterBow)actor.root.userData.hunterBow.visible=true;
  actor.root.rotation.y=angle;
 };
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  host.prepend(renderer.domElement);scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffe2b5,0x183434,2.6));
  const sun=new THREE.DirectionalLight(0xffd5a0,3.5);sun.position.set(-4,7,5);scene.add(sun);
  const rim=new THREE.DirectionalLight(0x6fd6b7,3);rim.position.set(3,5,-4);scene.add(rim);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.75,1.95,.24,48),new THREE.MeshStandardMaterial({color:0x3f4b43,roughness:.9}));pedestal.position.y=-.22;scene.add(pedestal);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.78,.025,6,64),new THREE.MeshBasicMaterial({color:0xb49657}));ring.rotation.x=Math.PI/2;ring.position.y=-.09;scene.add(ring);
  camera=new THREE.PerspectiveCamera(37,1,.1,60);
  build();
  let down=null;
  host.addEventListener('pointerdown',e=>{down=e.clientX;host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(down===null)return;angle+=(e.clientX-down)*.012;down=e.clientX;});
  host.addEventListener('pointerup',()=>down=null);host.addEventListener('pointercancel',()=>down=null);
  host.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){angle+=e.key==='ArrowLeft'?-.2:.2;e.preventDefault();}});
  renderer.setAnimationLoop(time=>{
   if(!form.checkVisibility()||document.hidden){last=time;return;}
   const dt=Math.min(.05,(time-last)/1000);last=time;
   const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
   if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);camera.aspect=w/h;
   camera.position.set(0,2.1,Math.max(6.9,3.8/camera.aspect));camera.lookAt(0,1.65,0);camera.updateProjectionMatrix();
   animateSphericalTauren(actor,{dt,time:time/1000,
    weaponKind:klass.value==='hunter'?'bow':'none'});actor.root.rotation.y=angle;
   renderer.render(scene,camera);
  });
 }catch(error){host.dataset.failed='true';host.querySelector('.creation-gesture').textContent='3D-просмотр недоступен. Выберите расу и класс ниже.';describe();}
 form.addEventListener('change',e=>{if(e.target.name==='raceId'||e.target.name==='classId')build();});
 return {refresh:build};
}
