import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {snapshotDimensions,makeVisualSnapshotMeta,compareVisualSnapshotMeta,
 captureVisualWebGLFrame,createVisualCaptureStore,VISUAL_CAPTURE_MAX_EDGE,
 VISUAL_CAPTURE_SLOTS,VISUAL_CAPTURE_DB} from '../visual-capture.js';
import {VISUAL_REFERENCE_VIEWS} from '../reference-viewpoints.js';

const view=VISUAL_REFERENCE_VIEWS[2];
const original=()=>makeVisualSnapshotMeta({
 version:'0.6.45.28',view,quality:'high',normal:[.25,-.04,.968],
 position:[16,10,264],focus:[20,-1,261],fov:58,
 screenWidth:390,screenHeight:844,pixelRatio:1.65,
 stats:{fps:59.7,p95Ms:17.33},now:new Date('2026-10-30T14:00:00Z')
});

test('capture format scales down only, never stretches a real portrait viewport',()=>{
 assert.equal(VISUAL_CAPTURE_MAX_EDGE,1280);
 assert.deepEqual(snapshotDimensions(1170,2532),{width:591,height:1280});
 assert.deepEqual(snapshotDimensions(300,400),{width:300,height:400});
 assert.throws(()=>snapshotDimensions(0,400),RangeError);
 assert.throws(()=>snapshotDimensions(100,Infinity),RangeError);
 assert.deepEqual([...VISUAL_CAPTURE_SLOTS],['baseline','current']);
});
test('private metadata records real view/version/preset/camera/FPS/viewport, not player account',()=>{
 const row=original();
 assert.equal(row.schema,1);assert.equal(row.version,'0.6.45.28');
 assert.equal(row.reference,'R1');assert.equal(row.viewId,'trail');
 assert.equal(row.location,view.zone);assert.equal(row.quality,'high');
 assert.equal(row.screen.width,390);assert.equal(row.screen.height,844);
 assert.equal(row.fps,59.7);assert.equal(row.p95Ms,17.3);
 assert.equal(row.camera.fov,58);
 assert.ok(!JSON.stringify(row).match(/account|token|password|characterId/));
 assert.ok(Object.isFrozen(row));
 assert.throws(()=>makeVisualSnapshotMeta({...row,version:'invalid'}),RangeError);
});
test('baseline versus current warnings are factual, without fictitious similarity scores',()=>{
 const a=original();
 assert.deepEqual(compareVisualSnapshotMeta(a,original()),[]);
 const b={...original(),quality:'economy',
  screen:{...a.screen,width:420},camera:{...a.camera,fov:55,
   normal:[.6,-.04,.968]},viewId:'entrance'};
 const warnings=compareVisualSnapshotMeta(a,b);
 assert.equal(warnings.length,5);
 assert.ok(warnings.some(v=>v.includes('пресеты')));
 assert.ok(warnings.some(v=>v.includes('камер')||v.includes('обзора')));
 assert.deepEqual(compareVisualSnapshotMeta(a,null),['Сначала сохраните оба снимка']);
});
test('WebGL screenshot reads real render target, flips rows and restores renderer',async()=>{
 const operations=[];
 class FakeRenderTarget{
  constructor(w,h){this.width=w;this.height=h;this.texture={};this.disposed=false;operations.push('create');}
  dispose(){this.disposed=true;operations.push('dispose');}
 }
 const fakeThree={WebGLRenderTarget:FakeRenderTarget,RGBAFormat:1,UnsignedByteType:2,SRGBColorSpace:'srgb',
  Vector2:class{constructor(){this.x=0;this.y=0}}};
 const sentinel={name:'original-render-target'};
 const renderer={
  current:sentinel,
  getDrawingBufferSize(vec){vec.x=2;vec.y=2;return vec;},
  getRenderTarget(){return this.current},
  setRenderTarget(t){this.current=t;operations.push(t===sentinel?'restore':'set')},
  clear(){operations.push('clear')},
  render(){operations.push('render')},
  readRenderTargetPixels(target,x,y,w,h,buffer){
   assert.equal(w,2);assert.equal(h,2);assert.equal(target.texture.colorSpace,'srgb');
   // WebGL bottom row red, upper row blue. Canvas output flips vertically.
   buffer.set([255,0,0,255,255,0,0,255,0,0,255,255,0,0,255,255]);
   operations.push('pixels');
  }
 };
 let savedPixels;
 const canvas={
  width:0,height:0,
  getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
   putImageData:img=>{savedPixels=img.data.slice()}};},
  toBlob(callback){callback(new Blob(['png'],{type:'image/png'}))}
 };
 const result=await captureVisualWebGLFrame(fakeThree,renderer,{},{},
  {documentRef:{createElement:()=>canvas}});
 assert.equal(result.width,2);assert.equal(result.height,2);
 assert.equal(result.blob.type,'image/png');
 assert.deepEqual([...savedPixels.slice(0,4)],[0,0,255,255]);
 assert.deepEqual([...savedPixels.slice(8,12)],[255,0,0,255]);
 assert.equal(renderer.current,sentinel);
 assert.ok(operations.indexOf('restore')<operations.indexOf('dispose'));
});
test('screenshot storage is local IndexedDB only, with no forced navigation/network',()=>{
 assert.equal(VISUAL_CAPTURE_DB,'ngw-art-compare-v1');
 assert.throws(()=>createVisualCaptureStore({factory:null}),/IndexedDB/);
 const src=readFileSync(new URL('../visual-capture.js',import.meta.url),'utf8');
 const executable=src.split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
 assert.doesNotMatch(executable,/XMLHttpRequest|WebSocket|sendBeacon|localStorage\.setItem|fetch\(/);
 assert.match(src,/indexedDB|factory\.open/);
});

test('two separate game loads share persistent before/after captures per camera',async()=>{
 const saved=new Map();
 const db={
  objectStoreNames:{contains:()=>true},
  transaction(){
   const tx={};
   tx.objectStore=()=>({
    get:key=>{
     const req={};
     queueMicrotask(()=>{req.result=saved.get(key);req.onsuccess?.();tx.oncomplete?.();});
     return req;
    },
    put:value=>{
     const req={};
     queueMicrotask(()=>{saved.set(value.key,value);req.result=value.key;
      req.onsuccess?.();tx.oncomplete?.();});
     return req;
    },
    delete:key=>{
     const req={};
     queueMicrotask(()=>{saved.delete(key);req.onsuccess?.();tx.oncomplete?.();});
     return req;
    }
   });
   return tx;
  }
 };
 const factory={open:()=>{
  const request={result:db};
  queueMicrotask(()=>request.onsuccess?.());
  return request;
 }};
 const before=createVisualCaptureStore({factory});
 const metadata=original();
 const blob=new Blob(['png'],{type:'image/png'});
 await before.put('trail','baseline',{blob,width:390,height:844,metadata});
 const after=createVisualCaptureStore({factory});
 assert.equal((await after.get('trail','baseline')).metadata.version,'0.6.45.28');
 await after.put('trail','current',{blob,width:390,height:844,
  metadata:{...metadata,version:'0.6.45.29'}});
 assert.equal((await before.get('trail','current')).metadata.version,'0.6.45.29');
 assert.equal(await after.get('wolves','baseline'),undefined);
 await after.remove('trail','current');
 assert.equal(await before.get('trail','current'),undefined);
 await assert.rejects(before.get('bad id','baseline'),RangeError);
});

test('real game supplies capture metadata and compares only reproducible G-01 frames',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const src=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 for(const id of ['referenceCaptureBaseline','referenceCaptureCurrent',
  'referenceCaptureCompare','referenceCompareOverlay','referenceCompareRange',
  'referenceCompareExit','referenceCompareBase','referenceCompareCurrent'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/#referenceCompareOverlay\[hidden\]/);
 assert.match(src,/referencePose\?.normal\|\|state.normal/);
 assert.match(src,/makeVisualSnapshotMeta\(/);
 assert.match(src,/captureVisualWebGLFrame\(THREE,renderer,scene,camera\)/);
 assert.match(src,/if\(pendingVisualShot&&!webglContextFailed&&!artSafety\.isContextLost\)/);
 assert.match(src,/referenceCompareRange/);
 assert.doesNotMatch(src,/state\.normal\.copy\(referencePose/);
});
