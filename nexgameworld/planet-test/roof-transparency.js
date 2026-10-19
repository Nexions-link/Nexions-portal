// Visual-only roof fade: clone roof materials to avoid affecting solid walls
// and shared village shingles. Shadow caster geometry remains untouched.
export function createRoofTransparency(roof,{indoorOpacity=.12,fadeSpeed=9}={}){
 if(!roof?.traverse)throw Error('Roof group is required');
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
 roof.traverse(mesh=>{
  if(!mesh.isMesh)return;
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
  get materialCount(){return materials.length;}
 };
}
