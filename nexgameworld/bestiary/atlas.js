import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// A unique URL per visit prevents Safari from keeping a stale catalog.
const atlasRevision=String(Date.now());
const {ATLAS_CATEGORIES,ATLAS_ENTRIES,filterAtlasEntries}=await import('./atlas-catalog.js?refresh='+atlasRevision);
const {CREATURE_LOOT_TABLES,getCreatureLootRows}=await import('../planet-test/loot-tables.js?refresh='+atlasRevision);
const {ITEM_CATALOG}=await import('../items.js?refresh='+atlasRevision);
const $=id=>document.getElementById(id);
const canvas=$('viewerCanvas'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.01,200);
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'default'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
const ambient=new THREE.HemisphereLight(0xffeed8,0x405c50,2.2);scene.add(ambient);
const light=new THREE.DirectionalLight(0xffffff,2.6);light.position.set(5,9,6);scene.add(light);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;
// iOS Safari: reserve touches that start on the 3D canvas for orbit and pinch.
// Prevent the outer page from taking over a gesture after the first movement.
canvas.style.touchAction='none';
for(const type of ['touchstart','touchmove']){
 canvas.addEventListener(type,event=>{if(event.cancelable)event.preventDefault()},{passive:false});
}
let category='all',activeId='dolgonog',current=null,mixer=null,actions={},currentAction=null,loadId=0;
const loader=new GLTFLoader(),clock=new THREE.Clock(),center=new THREE.Vector3();let radius=2;
function resetView(){
 // The original camera distance clipped tall models on narrow mobile canvases.
 // Fit to the smaller visible dimension with a margin, preserving free orbit/pinch zoom.
 const aspect=Math.max(.65,canvas.clientWidth/Math.max(1,canvas.clientHeight));
 const halfFov=THREE.MathUtils.degToRad(camera.fov)*.5;
 const distance=Math.max(radius*1.9,radius*.88/(Math.tan(halfFov)*Math.min(1,aspect)));
 camera.position.copy(center).add(new THREE.Vector3(.43,.24,.87).normalize().multiplyScalar(distance));
 controls.target.copy(center);
 controls.update();
}
$('resetView').onclick=resetView;
function paintCategories(){
 $('categories').replaceChildren();
 for(const c of [{id:'all',name:'Вся коллекция',icon:'▦'},...ATLAS_CATEGORIES]){
  const button=document.createElement('button');button.className='category'+(category===c.id?' active':'');
  const count=c.id==='all'?ATLAS_ENTRIES.length:ATLAS_ENTRIES.filter(e=>e.category===c.id).length;
  button.innerHTML='<span></span><strong></strong><span class="count"></span>';
  button.children[0].textContent=c.icon;button.children[1].textContent=c.name;button.children[2].textContent=count;
  button.onclick=()=>{category=c.id;paintCategories();paintEntries()};
  $('categories').append(button);
 }
}
function paintEntries(){
 const entries=filterAtlasEntries(category,$('search').value),host=$('entries');host.replaceChildren();$('counter').textContent=entries.length+' / '+ATLAS_ENTRIES.length;
 if(!entries.length){const p=document.createElement('p');p.className='empty';p.textContent='В этой категории пока нет записей. Коллекция будет пополняться.';host.append(p);return}
 for(const entry of entries){const b=document.createElement('button');b.className='entry'+(activeId===entry.id?' active':'');
  b.innerHTML='<span class="glyph"></span><span><strong></strong><small></small></span>';
  b.querySelector('.glyph').textContent=entry.category==='creatures'?'◈':'⚒';
  b.querySelector('strong').textContent=entry.name;b.querySelector('small').textContent=entry.number+' · v'+entry.version;
  b.onclick=()=>selectEntry(entry.id);host.append(b)}
}
$('search').addEventListener('input',paintEntries);
function paintCreatureLoot(entry){
 const panel=$('lootPanel'),host=$('lootItems'),hint=$('lootHint');
 panel.hidden=entry.category!=='creatures';host.replaceChildren();
 if(panel.hidden)return;
 const table=CREATURE_LOOT_TABLES[entry.id];
 if(!table){
  hint.textContent='Для этого существа таблица добычи ещё не назначена. Модель пока находится только в атласе.';
  return;
 }
 hint.textContent='Эти же шансы используются в игре NexGameWorld. Материалы разыгрываются независимо и могут выпадать вместе; снаряжение — не более одного предмета за убийство.';
 const all=getCreatureLootRows(entry.id);
 function renderRow(row){
  const item=ITEM_CATALOG[row.id],node=document.createElement('div');
  node.className='creature-loot-row';node.dataset.rarity=item?.rarity||'common';
  const icon=document.createElement('span');icon.className='loot-icon';icon.textContent=item?.icon||'◇';
  const body=document.createElement('span');body.className='loot-name';
  const title=document.createElement('strong');title.textContent=item?.name||row.id;
  const sub=document.createElement('small');
  sub.textContent='Кол-во: '+(row.min===row.max?row.min:row.min+'–'+row.max)+' · '+(item?.quality||'Обычный');
  body.append(title,sub);
  const chance=document.createElement('strong');chance.className='loot-chance';
  chance.textContent=(row.chance*100).toLocaleString('ru-RU',{maximumFractionDigits:2})+'%';
  node.append(icon,body,chance);return node;
 }
 for(const row of all.filter(r=>r.group==='materials'))host.append(renderRow(row));
 const gear=all.filter(r=>r.group==='equipment');
 if(gear.length){
  const details=document.createElement('details');details.className='loot-equipment';
  const summary=document.createElement('summary');summary.textContent='Случайное снаряжение · '+gear.length+' предметов';
  details.append(summary);
  for(const row of gear)details.append(renderRow(row));
  host.append(details);
 }
}
function setAnimation(name){
 if(!actions[name])return;
 if(currentAction&&currentAction!==actions[name])currentAction.fadeOut(.2);
 currentAction=actions[name];currentAction.reset().fadeIn(.2).play();
 for(const b of $('animations').querySelectorAll('button'))b.classList.toggle('active',b.dataset.clip===name);
}
async function selectEntry(id){
 const entry=ATLAS_ENTRIES.find(e=>e.id===id);if(!entry)return;activeId=id;paintEntries();
 $('entryNumber').textContent='№ '+entry.number;$('entryVersion').textContent='ОРИГИНАЛ · v'+entry.version;
 $('entryName').textContent=entry.name;$('entrySubtitle').textContent=entry.subtitle;
 $('entryDescription').textContent=entry.description;
 paintCreatureLoot(entry);
 $('facts').replaceChildren();for(const [key,value] of entry.facts){const el=document.createElement('div');el.className='fact';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=key;b.textContent=value;el.append(a,b);$('facts').append(el)}
 $('modelStatus').textContent='ЗАГРУЗКА МОДЕЛИ';$('animationPanel').hidden=true;
 // Keep the original lighting for all other Atlas assets.
 ambient.intensity=entry.id==='wild-boar'?1.35:2.2;
 light.intensity=entry.id==='wild-boar'?1.55:2.6;
 $('palettePanel').hidden=true;$('palettePanel').replaceChildren();
 const request=++loadId;
 try{
  // Bypass browser and intermediary caches for GLB assets, including unchanged v0.1 filenames.
  const assetUrl=new URL(entry.asset,document.baseURI);
  assetUrl.searchParams.set('atlas_refresh',atlasRevision);
  const response=await fetch(assetUrl.href,{cache:'no-store'});
  if(!response.ok)throw new Error('GLB HTTP '+response.status+': '+entry.asset);
  const glbBytes=await response.arrayBuffer();
  const gltf=await loader.parseAsync(glbBytes,new URL('.',assetUrl).href);
  if(request!==loadId)return;
  if(current){scene.remove(current);current.traverse(o=>{if(o.isMesh){/* shared GLB loader cache may reuse textures; avoid disposal */}})}
  current=gltf.scene;
  // The exported axe's local up direction is inverted; align it for display.
  if(entry.id==='tauren-axe')current.rotation.x+=Math.PI;
  if(entry.previewScale)current.scale.setScalar(entry.previewScale);
  scene.add(current);
  const bounds=new THREE.Box3().setFromObject(current);bounds.getCenter(center);const size=bounds.getSize(new THREE.Vector3());radius=Math.max(size.length()*.68,.9);
  controls.minDistance=radius*.6;controls.maxDistance=radius*5;resetView();
  mixer=gltf.animations.length?new THREE.AnimationMixer(current):null;actions={};currentAction=null;
  $('animations').replaceChildren();
  for(const clip of gltf.animations){const action=mixer.clipAction(clip);actions[clip.name]=action;const b=document.createElement('button');b.textContent=clip.name;b.dataset.clip=clip.name;b.onclick=()=>setAnimation(clip.name);$('animations').append(b)}
  $('animationPanel').hidden=!gltf.animations.length;
  if(gltf.animations.length)setAnimation(gltf.animations.find(c=>c.name==='Idle')?.name||gltf.animations[0].name);
  if(entry.id==='wild-boar'){
   const {mountBoarPaletteEditor}=await import('./atlas-palette-editor.js?refresh='+atlasRevision);
   if(request!==loadId)return;
   await mountBoarPaletteEditor({host:$('palettePanel'),model:current,glbBuffer:glbBytes,revision:atlasRevision,isCurrent:()=>request===loadId});
  }
  if(request===loadId)$('modelStatus').textContent='GLB · 3D АКТИВНА';
 }catch(error){if(request===loadId){$('modelStatus').textContent='ОШИБКА ЗАГРУЗКИ';console.error(error)}}
}
function render(){requestAnimationFrame(render);const w=canvas.clientWidth,h=canvas.clientHeight;if(w>0&&h>0){const d=renderer.getPixelRatio();if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}const dt=Math.min(clock.getDelta(),.06);mixer?.update(dt);controls.update();renderer.render(scene,camera)}
paintCategories();paintEntries();selectEntry(new URLSearchParams(location.search).get('item')||'dolgonog');render();
