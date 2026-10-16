import * as THREE from 'three';
import {CREATURES,DRAFT_KEY,normalizeCreatureParams,humanBytes} from './catalog.js';
import {DEFAULT_DOLGONOG,createDolgonog,countTriangles,disposeDolgonog} from './dolgonog.js';
import {isDolgonogRig,applyOriginalDolgonogEdits} from './original-edits.js';

const $=id=>document.getElementById(id);
const entry=CREATURES[0];
let model=null,source='procedural',imported=null,mixer=null,playing='idle',clock=0;
const draftKey=()=>DRAFT_KEY+'-v0.1';
let currentLoad=0;
let params={...DEFAULT_DOLGONOG},dirty=false,rendered=false;
const canvas=$('viewerCanvas'),wrap=$('canvasWrap'),msg=$('fileFeedback');
const search=$('creatureSearch');
const list=$('creatureList');
const notify=(message,error=false)=>{msg.textContent=message;msg.style.color=error?'#e8a993':'#aebfa6'};
function paintCatalog(filter=''){
 list.replaceChildren();
 const items=CREATURES.filter(c=>[c.name,c.subtitle,c.category].join(' ').toLowerCase().includes(filter.trim().toLowerCase()));
 if(!items.length){const empty=document.createElement('p');empty.className='search-empty';empty.textContent='Существо не найдено';list.append(empty);return}
 for(const creature of items){
  const button=document.createElement('button');button.className='creature-entry';button.type='button';button.setAttribute('aria-current','page');
  button.innerHTML='<span class="mini-image">✦</span><span><strong></strong><small></small></span><span class="chosen">›</span>';
  button.querySelector('strong').textContent=creature.name;
  button.querySelector('small').textContent='№ '+creature.number+' · v'+creature.version;
  button.addEventListener('click',()=>{window.scrollTo({top:0,behavior:'smooth'});});
  list.append(button);
 }
}
paintCatalog();search.addEventListener('input',e=>paintCatalog(e.target.value));
$('creatureTitle').textContent=entry.name;
$('creatureCategory').textContent=entry.subtitle.toUpperCase();
$('creatureDescription').textContent=entry.description;
$('factHabitat').textContent=entry.habitat;
$('factVersion').textContent='v'+entry.version+' · мастерская';
$('currentVersion').textContent='ПРОТОТИП · v'+entry.version;
const tagHost=$('creatureTags');
for(const tag of entry.tags){const node=document.createElement('span');node.textContent=tag;tagHost.appendChild(node)}
try{params=normalizeCreatureParams(JSON.parse(localStorage.getItem(draftKey())),DEFAULT_DOLGONOG)}catch(e){}
function syncInputs(){
 document.querySelectorAll('[data-scalar]').forEach(input=>{
  const key=input.dataset.scalar;input.value=String(params[key]);$(key+'Value').value=Math.round(params[key]*100)+'%';
 });
 document.querySelectorAll('[data-color]').forEach(input=>{input.value=params[input.dataset.color]});
 $('draftStatus').textContent=dirty?'НЕСОХРАНЁННЫЕ ПРАВКИ':'ЛОКАЛЬНЫЙ ЧЕРНОВИК';
}
syncInputs();
const scene=new THREE.Scene();
// Preserve the CSS radial backdrop through a transparent WebGL canvas.
scene.background=null;
const camera=new THREE.PerspectiveCamera(37,1,.1,80);
let renderer;
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'default'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.26;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
}catch(error){
 $('loadingState').textContent='3D не удалось запустить. Проверь WebGL и обнови страницу.';
 throw error;
}
scene.add(new THREE.HemisphereLight(0xd9eacf,0x41352c,2.3));
const light=new THREE.DirectionalLight(0xffe2ab,3.3);light.position.set(-4,8,6);light.castShadow=true;
light.shadow.mapSize.set(1024,1024);
Object.assign(light.shadow.camera,{left:-5,right:5,top:7,bottom:-5,near:.1,far:25});
light.shadow.bias=-.0008;light.shadow.normalBias=.03;
scene.add(light);
const rim=new THREE.DirectionalLight(0xa3c7b4,1.7);rim.position.set(5,4,-5);scene.add(rim);
const ground=new THREE.Mesh(new THREE.CircleGeometry(4.4,64),new THREE.MeshStandardMaterial({
 color:'#344436',roughness:1
}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.032;ground.receiveShadow=true;scene.add(ground);
const stoneMaterial=new THREE.MeshStandardMaterial({color:'#879080',roughness:1,flatShading:true});
for(let i=0;i<12;i++){
 const t=i/12*Math.PI*2,r=3.15+(i%3)*.25;
 const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.22+(i%4)*.05,0),stoneMaterial);
 stone.position.set(Math.cos(t)*r,.06,Math.sin(t)*r);
 stone.rotation.set(.2*i,.45*i,.12*i);stone.scale.y=.3;stone.castShadow=true;stone.receiveShadow=true;
 scene.add(stone);
}
const grid=new THREE.GridHelper(9,18,0x9aa895,0x6d806e);
grid.position.y=-.014;grid.material.transparent=true;grid.material.opacity=.18;grid.visible=true;scene.add(grid);
let orbit={yaw:.58,pitch:.19,distance:8.2},touches=new Map(),lastPinch=0;
function fitView(){
 camera.aspect=Math.max(1,wrap.clientWidth)/Math.max(1,wrap.clientHeight);
 camera.updateProjectionMatrix();
 renderer.setSize(Math.max(1,wrap.clientWidth),Math.max(1,wrap.clientHeight),false);
}
function placeCamera(){
 const horizontal=Math.cos(orbit.pitch)*orbit.distance;
 camera.position.set(Math.sin(orbit.yaw)*horizontal,1.78+Math.sin(orbit.pitch)*orbit.distance,Math.cos(orbit.yaw)*horizontal);
 camera.lookAt(0,1.75,0);
}
function resetView(){
 orbit={yaw:.58,pitch:.19,distance:8.2};placeCamera();
}
function showSource(){
 const official=source==='glb'&&imported?.origin==='official';
 const local=source==='glb'&&imported?.origin==='local';
 $('viewerSource').textContent=official?'ОРИГИНАЛ · GLB v0.1':
  local?'ЗАГРУЖЕННЫЙ GLB · ЛОКАЛЬНО':'РЕЗЕРВНАЯ РЕКОНСТРУКЦИЯ';
 $('factSource').textContent=official?'Авторский GLB из чата «Работа»':
  local?'Локальный файл GLB':'Резервная процедурная модель';
 $('triangleCount').textContent=model?countTriangles(model.root).toLocaleString('ru-RU')+' треуг.':'—';
 $('animationCount').textContent=source==='glb'?(imported?.animations.length??0)+' (GLB)':3;
 $('currentVersion').textContent=official?'ОРИГИНАЛ · v0.1':local?'ЛОКАЛЬНЫЙ GLB':'РЕЗЕРВНАЯ МОДЕЛЬ';
 $('factVersion').textContent='v0.1 · '+(official?'авторский GLB':'мастерская');
 const locked=source==='glb'&&!imported?.editable;
 document.querySelectorAll('[data-scalar],[data-color]').forEach(el=>{el.disabled=locked});
 $('saveDraft').disabled=locked;
 $('copySettings').disabled=locked;
 $('draftStatus').textContent=locked?'НЕПОДДЕРЖИВАЕМЫЙ РИГ':dirty?'НЕСОХРАНЁННЫЕ ПРАВКИ':'ЛОКАЛЬНЫЙ ЧЕРНОВИК';
}
function removeModel(){
 if(!model)return;
 if(mixer){mixer.stopAllAction();mixer.uncacheRoot(imported?.scene||model.root);}
 scene.remove(model.root);
 if(source==='procedural')disposeDolgonog(model.root);
 else{
  const geometries=new Set(),materials=new Set();
  model.root.traverse(o=>{
   if(o.geometry)geometries.add(o.geometry);
   if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
  });
  for(const g of geometries)g.dispose();
  for(const m of materials)m.dispose();
 }
 model=null;mixer=null;
}
function installProcedural(){
 removeModel();source='procedural';imported=null;
 model=createDolgonog(THREE,params);scene.add(model.root);
 showSource();
}
async function installGlb(buffer,{origin='official',filename='dolgonog-v0.1.glb',token}={}){
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const parsed=await new GLTFLoader().parseAsync(buffer,'');
 if(!parsed.scene)throw Error('В файле GLB отсутствует 3D-сцена');
 const wrapper=new THREE.Group();wrapper.name='bestiary-glb-root';
 wrapper.add(parsed.scene);
 const box=new THREE.Box3().setFromObject(parsed.scene);
 const size=new THREE.Vector3(),centre=new THREE.Vector3();
 box.getSize(size);box.getCenter(centre);
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('Неверный размер модели');
 const scale=3.7/Math.max(size.y,size.x*.8,size.z*.8,.1);
 parsed.scene.position.set(-centre.x,-box.min.y,-centre.z);
 wrapper.scale.setScalar(scale);
 const editable=isDolgonogRig(parsed.scene);
 if(token!==undefined&&token!==currentLoad)return null;
 removeModel();
 source='glb';imported={scene:parsed.scene,animations:parsed.animations,origin,filename,editable};
 model={root:wrapper};scene.add(wrapper);
 if(editable)applyOriginalDolgonogEdits(THREE,parsed.scene,params);
 mixer=parsed.animations.length?new THREE.AnimationMixer(parsed.scene):null;
 showSource();playAnimation(playing);
 return {editable,animations:parsed.animations.length,triangles:countTriangles(wrapper)};
}
async function loadOfficialGlb(){
 const run=++currentLoad;
 try{
  const url='./models/dolgonog-v0.1.glb?v=0.1.2';
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const buffer=await response.arrayBuffer();
  if(run!==currentLoad)return;
  if(buffer.byteLength<20||new DataView(buffer).getUint32(0,true)!==0x46546c67)
   throw Error('Неверный заголовок GLB');
  const result=await installGlb(buffer,{origin:'official',token:run});
  if(!result)return;
  notify('Оригинальный долгоног загружен: '+humanBytes(buffer.byteLength)+
   ', '+result.triangles.toLocaleString('ru-RU')+' треугольников и '+
   result.animations+' анимации. Черновик можно редактировать.');
 }catch(error){
  console.error('Could not load official GLB:',error);
  notify('Исходный GLB пока недоступен; показана резервная модель.',true);
 }finally{$('loadingState').hidden=true}
}
function playAnimation(animation){
 playing=animation;
 document.querySelectorAll('.anim').forEach(b=>{
  const active=b.dataset.animation===animation;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
 });
 if(source!=='glb'||!mixer||!imported)return;
 const patterns={idle:/idle|wait|stand|ожидан/i,walk:/walk|run|ход|бег/i,attack:/attack|peck|hit|удар/i};
 const clip=imported.animations.find(a=>patterns[animation].test(a.name))||
  imported.animations[['idle','walk','attack'].indexOf(animation)];
 mixer.stopAllAction();
 if(clip)mixer.clipAction(clip).reset().fadeIn(.15).play();
 else notify('В этом GLB нет анимации «'+{idle:'Ожидание',walk:'Ходьба',attack:'Атака'}[animation]+'».');
}
document.querySelectorAll('.anim').forEach(b=>b.addEventListener('click',()=>playAnimation(b.dataset.animation)));
$('toggleGrid').addEventListener('click',()=>{
 grid.visible=!grid.visible;$('toggleGrid').setAttribute('aria-pressed',String(grid.visible));
});
$('resetView').addEventListener('click',resetView);
function updateDraft(){
 dirty=true;syncInputs();
 if(source==='glb'&&imported?.editable)applyOriginalDolgonogEdits(THREE,imported.scene,params);
 else if(source==='procedural')installProcedural();
}
document.querySelectorAll('[data-scalar]').forEach(input=>input.addEventListener('input',()=>{
 if(source==='glb'&&!imported?.editable)return;
 params[input.dataset.scalar]=Number(input.value);updateDraft();
}));
document.querySelectorAll('[data-color]').forEach(input=>input.addEventListener('input',()=>{
 if(source==='glb'&&!imported?.editable)return;
 params[input.dataset.color]=input.value;updateDraft();
}));
$('saveDraft').addEventListener('click',()=>{
 if(source==='glb'&&!imported?.editable)return;
 try{localStorage.setItem(draftKey(),JSON.stringify(params));dirty=false;syncInputs();notify('Черновик долгонога сохранён в этом браузере.')}
 catch(error){notify('Сохранение недоступно. Проверь разрешения браузера.',true)}
});
$('resetDraft').addEventListener('click',()=>{
 params={...DEFAULT_DOLGONOG};dirty=false;try{localStorage.removeItem(draftKey())}catch(e){}
 if(source==='glb'&&imported?.editable)applyOriginalDolgonogEdits(THREE,imported.scene,params);
 else if(source==='procedural')installProcedural();
 syncInputs();showSource();playAnimation('idle');
 notify('Сброшены правки. Исходная модель долгонога сохранена.');
});
$('copySettings').addEventListener('click',async()=>{
 const json=JSON.stringify({id:entry.id,version:'0.1',params},null,2);
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(json);
  else{
   const text=document.createElement('textarea');text.value=json;document.body.append(text);text.select();
   if(!document.execCommand('copy'))throw new Error('copy failed');text.remove();
  }
  notify('Параметры скопированы. Пришли их в чат для сохранения версии в GitHub.');
 }catch(e){notify('Автоматическое копирование недоступно. Выбери «Сохранить черновик».',true)}
});
function handlePointerDown(e){
 e.preventDefault();
 canvas.setPointerCapture(e.pointerId);
 touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touches.size===2)lastPinch=distanceOfTouches();
}
function distanceOfTouches(){
 const p=[...touches.values()];
 return p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;
}
canvas.addEventListener('pointerdown',handlePointerDown);
canvas.addEventListener('pointermove',e=>{
 if(!touches.has(e.pointerId))return;
 e.preventDefault();const prev=touches.get(e.pointerId);
 const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
 touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touches.size===1){
  orbit.yaw-=dx*.009;
  orbit.pitch=Math.max(-.25,Math.min(.74,orbit.pitch+dy*.006));
 }else if(touches.size===2){
  const next=distanceOfTouches();
  if(lastPinch>0&&next>0)orbit.distance=Math.max(5.3,Math.min(15,orbit.distance*lastPinch/next));
  lastPinch=next;
 }
});
const stopTouch=e=>{touches.delete(e.pointerId);lastPinch=touches.size===2?distanceOfTouches():0;
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
};
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,stopTouch);
canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.distance=Math.max(5.3,Math.min(15,orbit.distance*Math.exp(e.deltaY*.001)))},{passive:false});
function frame(t){
 const seconds=t*.001,dt=Math.min(seconds-clock,.05);clock=seconds;
 if(model&&source==='procedural')model.update(seconds,playing);
 if(mixer)mixer.update(Math.max(0,dt));
 placeCamera();
 renderer.render(scene,camera);
 requestAnimationFrame(frame);
}
const observer=new ResizeObserver(fitView);observer.observe(wrap);
window.addEventListener('resize',fitView);
installProcedural();playAnimation('idle');fitView();resetView();
requestAnimationFrame(frame);loadOfficialGlb();
// Local GLB import does not write the repository or access an external upload server.
$('glbUpload').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 if(!/\.glb$/i.test(file.name)){notify('Поддерживаются файлы .glb.',true);return}
 if(file.size>25*1024*1024){notify('GLB больше 25 МБ. Для iPhone нужен более лёгкий файл.',true);return}
 notify('Читаем '+file.name+'…');
 try{
  const result=await installGlb(await file.arrayBuffer(),{origin:'local',filename:file.name});
  notify('GLB «'+file.name+'» открыт: '+humanBytes(file.size)+'. '+
   (result.editable?'Поддерживается редактирование долгонога.':'Риг отличается, доступен только просмотр.')+
   ' Файл загружен локально, репозиторий не изменён.');
 }catch(error){console.error('GLB import:',error);
  notify('Ошибка при чтении GLB. Предыдущая модель сохранена.',true);
 }
 event.target.value='';
});
$('exportGlb').addEventListener('click',async()=>{
 if(!model)return;
 const button=$('exportGlb');button.disabled=true;notify('Создаём GLB…');
 try{
  const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  const result=await new GLTFExporter().parseAsync(model.root,{binary:true,onlyVisible:true,animations:source==='glb'?(imported?.animations||[]):[]});
  const blob=new Blob([result],{type:'model/gltf-binary'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=source==='glb'?'dolgonog-edited-v0.1.glb':'dolgonog-reconstruction-v0.1.glb';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  notify(source==='glb'?'Экспортирован GLB с правками и исходными анимациями.':'Экспортирована резервная модель без анимаций.');
 }catch(error){console.error(error);notify('Экспорт GLB не удался на этом устройстве.',true)}
 finally{button.disabled=false}
});
