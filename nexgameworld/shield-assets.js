// NexGame S001/S002: choose GLB by rarity, without inventing models per item.
// Model geometry and physical handling are independent of item stats.
export const SHIELD_MODELS=Object.freeze({
 round:Object.freeze({id:'round',path:'./assets/shields/nexgame_round_shield_poor.glb',scale:.92}),
 kite:Object.freeze({id:'kite',path:'./assets/shields/nexgame_kite_shield_quality.glb',scale:.84})
});
export function shieldModelForRarity(rarity){
 return rarity==='uncommon'||rarity==='rare'?'kite':'round';
}
// GLTFLoader clones share materials by default: isolate only the colored inlay
// materials on each actor. Ordinary wood, metal, bone, emblem stay unchanged.
const coloredMeshes=new WeakSet();
export function styleShieldGlb(THREE,model,rarity){
 if(!model?.traverse)return false;
 const rare=rarity==='rare';
 let touched=false;
 model.traverse(obj=>{
  if(!obj.isMesh)return;
  const name=(obj.name||'').toLowerCase();
  if(!/emerald|glow/.test(name))return;
  if(!coloredMeshes.has(obj)){
   obj.material=obj.material.clone();
   coloredMeshes.add(obj);
  }
  const material=obj.material;
  if(material.color)material.color.setHex(rare?(name==='glow'?0x75c8ff:0x397fce):(name==='glow'?0x64eb95:0x2d9f67));
  if(material.emissive){
   material.emissive.setHex(rare?0x16385a:0x103d20);
   material.emissiveIntensity=rare?.23:.09;
  }
  touched=true;
 });
 return touched;
}
