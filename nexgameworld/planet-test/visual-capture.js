// NGW-ART-REMASTER-001 G-02: local-only screenshots of the actual WebGL scene.
// No account data, player coordinates, credentials, WebSocket events or uploads.
// Captures are produced on demand using an isolated render target, preserving the
// normal renderer and camera configuration (including preserveDrawingBuffer=false).
export const VISUAL_CAPTURE_DB='ngw-art-compare-v1';
export const VISUAL_CAPTURE_MAX_EDGE=1280;
export const VISUAL_CAPTURE_SLOTS=Object.freeze(['baseline','current']);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const quant=(n,d=5)=>Number(n.toFixed(d));

export function snapshotDimensions(width,height,maxEdge=VISUAL_CAPTURE_MAX_EDGE){
 if(!finite(width)||!finite(height)||width<1||height<1||
  !finite(maxEdge)||maxEdge<16)throw new RangeError('Invalid capture dimensions');
 const scale=Math.min(1,maxEdge/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function makeVisualSnapshotMeta({version,view,quality,normal,position,focus,
 fov,screenWidth,screenHeight,pixelRatio,stats=null,now=new Date()}={}){
 if(!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(String(version))||
  !view?.id||!['economy','balanced','high'].includes(quality)||
  !Array.isArray(normal)||!Array.isArray(position)||!Array.isArray(focus)||
  ![...normal,...position,...focus,fov,screenWidth,screenHeight,pixelRatio].every(finite)||
  normal.length!==3||position.length!==3||focus.length!==3||
  screenWidth<=0||screenHeight<=0||fov<=1||pixelRatio<=0)throw new RangeError('Invalid art snapshot metadata');
 return Object.freeze({
  schema:1,version:String(version),reference:'R1',
  viewId:view.id,location:view.zone,viewLabel:view.label,quality,
  camera:Object.freeze({normal:normal.map(n=>quant(n)),position:position.map(n=>quant(n)),
   focus:focus.map(n=>quant(n)),fov:quant(fov,2)}),
  screen:Object.freeze({width:Math.round(screenWidth),height:Math.round(screenHeight),
   pixelRatio:quant(pixelRatio,3)}),
  fps:stats&&finite(stats.fps)?quant(stats.fps,1):null,
  p95Ms:stats&&finite(stats.p95Ms)?quant(stats.p95Ms,1):null,
  timestamp:now.toISOString()
 });
}
export function compareVisualSnapshotMeta(a,b){
 if(!a||!b)return ['Сначала сохраните оба снимка'];
 const warnings=[];
 if(a.viewId!==b.viewId)warnings.push('Разные контрольные ракурсы');
 if(a.quality!==b.quality)warnings.push('Разные пресеты графики');
 if(a.screen?.width!==b.screen?.width||a.screen?.height!==b.screen?.height)
  warnings.push('Разные размеры экрана — изображения могут не совпадать по перспективе');
 if(a.camera?.fov!==b.camera?.fov)warnings.push('Разный угол обзора');
 if(a.camera?.normal&&b.camera?.normal&&
  a.camera.normal.some((x,i)=>Math.abs(x-b.camera.normal[i])>0.0001))
  warnings.push('Изменена контрольная позиция');
 return warnings;
}
export function captureVisualWebGLFrame(THREE,renderer,scene,camera,{maxEdge=VISUAL_CAPTURE_MAX_EDGE,
 documentRef=globalThis.document}={}){
 if(!THREE?.WebGLRenderTarget||!renderer?.getDrawingBufferSize||
  !documentRef?.createElement)throw new Error('WebGL screenshot capture unavailable');
 const drawing=renderer.getDrawingBufferSize(new THREE.Vector2());
 const {width,height}=snapshotDimensions(drawing.x,drawing.y,maxEdge);
 const target=new THREE.WebGLRenderTarget(width,height,{
  format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,
  stencilBuffer:false
 });
 target.texture.colorSpace=THREE.SRGBColorSpace;
 const previous=renderer.getRenderTarget();
 const raw=new Uint8Array(width*height*4);
 try{
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene,camera);
  renderer.readRenderTargetPixels(target,0,0,width,height,raw);
 }finally{
  renderer.setRenderTarget(previous);
  target.dispose();
 }
 const canvas=documentRef.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:false});
 if(!ctx)throw new Error('2D screenshot canvas unavailable');
 const image=ctx.createImageData(width,height),rowSize=width*4;
 for(let y=0;y<height;y++){
  const from=(height-1-y)*rowSize;
  image.data.set(raw.subarray(from,from+rowSize),y*rowSize);
 }
 ctx.putImageData(image,0,0);
 return new Promise((resolve,reject)=>{
  try{
   canvas.toBlob(blob=>blob?resolve({blob,width,height}):
    reject(new Error('PNG export rejected by browser')),'image/png');
  }catch(error){reject(error);}
 });
}
export function createVisualCaptureStore({factory=globalThis.indexedDB}={}){
 const storeName='captures';
 if(!factory?.open)throw new Error('IndexedDB недоступна: снимки не сохраняются между версиями');
 let dbPromise=null;
 const db=()=>{
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
   let request;
   try{request=factory.open(VISUAL_CAPTURE_DB,1)}catch(e){reject(e);return;}
   request.onupgradeneeded=()=>{
    if(!request.result.objectStoreNames.contains(storeName))
     request.result.createObjectStore(storeName,{keyPath:'key'});
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||new Error('IndexedDB failed'));
  }).catch(error=>{dbPromise=null;throw error;});
  return dbPromise;
 };
 const key=(id,slot)=>{
  if(!/^[a-z0-9-]{1,40}$/.test(String(id))||
   !VISUAL_CAPTURE_SLOTS.includes(slot))throw new RangeError('Invalid screenshot slot');
  return id+'::'+slot;
 };
 async function transact(id,slot,method,value){
  const database=await db();
  return new Promise((resolve,reject)=>{
   let result;
   const transaction=database.transaction(storeName,method==='get'?'readonly':'readwrite');
   const store=transaction.objectStore(storeName);
   let req;
   try{
    req=method==='put'?store.put({...value,key:key(id,slot)}):
     method==='delete'?store.delete(key(id,slot)):store.get(key(id,slot));
   }catch(error){reject(error);return;}
   req.onsuccess=()=>{result=req.result};
   transaction.oncomplete=()=>resolve(result);
   transaction.onerror=()=>reject(transaction.error||new Error('IndexedDB transaction failed'));
   transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction aborted'));
  });
 }
 return {
  get:(id,slot)=>transact(id,slot,'get'),
  put:(id,slot,value)=>{
   if(!value?.blob||!value?.metadata||!value.width||!value.height)
    throw new TypeError('Missing screenshot payload');
   return transact(id,slot,'put',value);
  },
  remove:(id,slot)=>transact(id,slot,'delete')
 };
}
