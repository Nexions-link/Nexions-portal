// NGW-ART-REMASTER-001 / G-04: optional visual layers and safe fallback.
// Deliberately independent from player state, camera, quests and networking.
export const ART_MODE_KEY='nexgameworld-art-mode-v1';
export const ART_MODES=Object.freeze({enhanced:'enhanced',base:'base'});
const validMode=value=>value===ART_MODES.base?ART_MODES.base:ART_MODES.enhanced;
export function readArtMode(storage,preview=false){
 if(preview)return ART_MODES.base;
 try{return validMode(storage?.getItem(ART_MODE_KEY));}catch{return ART_MODES.enhanced}
}
export function createArtSafetyController({scene,storage=null,preview=false,onChange=()=>{},logger=console}={}){
 if(!scene?.children||!scene?.remove)throw new TypeError('Visual controller requires a THREE.Scene');
 const layers=new Map();
 let mode=readArtMode(storage,preview),lastFault=null,contextLost=false;
 const save=()=>{try{storage?.setItem(ART_MODE_KEY,mode)}catch{}};
 const notify=()=>onChange({mode,lastFault,contextLost});
 function collectNew(before){
  return scene.children.filter(child=>!before.has(child));
 }
 function hideAll(){
  for(const row of layers.values())for(const object of row.objects){
   if(!row.wasHidden.has(object))row.wasHidden.set(object,object.visible);
   object.visible=false;
  }
 }
 function restoreAll(){
  for(const row of layers.values())for(const object of row.objects){
   if(row.wasHidden.has(object)){
    object.visible=row.wasHidden.get(object);
    row.wasHidden.delete(object);
   }
  }
 }
 function fail(stage,error){
  lastFault={stage,message:String(error?.message||error).slice(0,240)};
  mode=ART_MODES.base;save();hideAll();
  logger?.warn?.('NexGameWorld visual fallback:',stage,lastFault.message);
  notify();
 }
 function register(name,factory){
  if(typeof name!=='string'||!name||typeof factory!=='function'||layers.has(name))
   throw new TypeError('Invalid or duplicate art layer');
  layers.set(name,{factory,handle:null,objects:[],wasHidden:new Map()});
 }
 function build(name,row){
  if(row.handle)return true;
  const before=new Set(scene.children);
  try{
   const handle=row.factory();
   if(!handle||typeof handle.setQuality!=='function')
    throw new Error('Visual layer must implement setQuality');
   row.handle=handle;
   row.objects=collectNew(before);
   return true;
  }catch(error){
   // A partially built visual layer is detached. Never remove existing
   // ground, hero, shadow camera or server-owned objects.
   for(const object of collectNew(before))scene.remove(object);
   fail('asset:'+name,error);
   return false;
  }
 }
 function update(preset,previewMode=false){
  if(mode===ART_MODES.base||contextLost||previewMode){
   hideAll();notify();return false;
  }
  restoreAll();
  for(const [name,row] of layers){
   if(!build(name,row))return false;
   const before=new Set(scene.children);
   try{
    row.handle.setQuality(preset,false);
    for(const object of collectNew(before))if(!row.objects.includes(object))row.objects.push(object);
   }catch(error){
    for(const object of collectNew(before))scene.remove(object);
    fail('quality:'+name,error);
    return false;
   }
  }
  notify();return true;
 }
 function setMode(next,preset){
  if(preview)return mode;
  mode=validMode(next);
  if(mode===ART_MODES.enhanced)lastFault=null;
  save();
  update(preset);
  return mode;
 }
 function animate(name,...args){
  if(mode!==ART_MODES.enhanced||contextLost)return;
  const row=layers.get(name);
  if(!row?.handle?.animate)return;
  try{row.handle.animate(...args)}catch(error){fail('animation:'+name,error)}
 }
 function renderError(error){fail('render',error)}
 function onContextLost(){
  contextLost=true;fail('webglcontextlost',new Error('Контекст WebGL потерян'));
 }
 function onContextRestored(){contextLost=false;notify()}
 return {register,update,setMode,animate,renderError,onContextLost,onContextRestored,
  get mode(){return mode},get fault(){return lastFault},
  get isContextLost(){return contextLost},get layerCount(){return layers.size}};
}
