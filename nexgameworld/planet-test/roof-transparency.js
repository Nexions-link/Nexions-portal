// Cosmetic fade for the house envelope. Each structure clones its materials
// once, protecting shared scenery, floor, lights and gameplay state.
export function createSurfaceTransparency(group,{
 indoorOpacity=.12,fadeSpeed=9,shouldFade=()=>true
}={}){
 if(!group?.traverse)throw Error('Surface group is required');
 const targetAlpha=Math.max(.04,Math.min(.6,Number(indoorOpacity)||.12));
 const speed=Math.max(.01,Number(fadeSpeed)||9);
 const copies=new Map(),materials=[];
 function isolate(source){
  if(!source?.clone)return source;
  if(copies.has(source))return copies.get(source);
  const clone=source.clone();
  copies.set(source,clone);
  materials.push({mat:clone,baseOpacity:source.opacity,
   baseTransparent:source.transparent,baseDepthWrite:source.depthWrite});
  return clone;
 }
 let meshCount=0;
 group.traverse(mesh=>{
  if(!mesh.isMesh||!shouldFade(mesh))return;
  meshCount++;
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(isolate):isolate(mesh.material);
 });
 let opacity=1;
 function apply(){
  const faded=opacity<.999;
  for(const item of materials){
   const mat=item.mat;
   const transparent=item.baseTransparent||faded;
   const depthWrite=item.baseDepthWrite&&!faded;
   if(mat.transparent!==transparent||mat.depthWrite!==depthWrite){
    mat.transparent=transparent;mat.depthWrite=depthWrite;mat.needsUpdate=true;
   }
   mat.opacity=item.baseOpacity*opacity;
  }
 }
 return {
  setProgress(progress){
   const t=Math.max(0,Math.min(1,Number(progress)||0));
   const next=1-(1-targetAlpha)*t;
   if(Math.abs(opacity-next)<1e-8)return opacity;
   opacity=next;apply();return opacity;
  },
  update(inside,dt=1/60){
   const target=inside?targetAlpha:1;
   if(opacity===target)return opacity;
   const delta=Math.max(0,Math.min(.25,Number(dt)||0));
   opacity+=(target-opacity)*(1-Math.exp(-speed*delta));
   if(Math.abs(target-opacity)<.001)opacity=target;
   apply();
   return opacity;
  },
  get opacity(){return opacity;},
  get materialCount(){return materials.length;},
  get meshCount(){return meshCount;}
 };
}
// Backwards-compatible roof controller for the existing game and tests.
export const createRoofTransparency=createSurfaceTransparency;
