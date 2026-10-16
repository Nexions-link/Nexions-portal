// Item-quality visuals, shared by every inventory surface and existing 3D gear.
// This module never changes item statistics, attack timers or model geometry.
export const QUALITY_VISUALS=Object.freeze({
 poor:Object.freeze({rank:0,color:'#a4a7ac',marker:0xadb0b5,glow:0,materialTint:0x747981}),
 common:Object.freeze({rank:1,color:'#efe6d5',marker:0xf0d8a9,glow:0,materialTint:0xffffff}),
 uncommon:Object.freeze({rank:2,color:'#72df81',marker:0x69db81,glow:.08,materialTint:0x65b87a}),
 rare:Object.freeze({rank:3,color:'#79bcff',marker:0x73bcff,glow:.17,materialTint:0x5fa5e5})
});
export function itemRarity(rarity){
 return Object.prototype.hasOwnProperty.call(QUALITY_VISUALS,rarity)?rarity:'common';
}
export function highestLootRarity(items,catalog){
 let strongest='common',rank=-1;
 for(const item of items||[]){
  const name=itemRarity(catalog?.[item?.id]?.rarity);
  const value=QUALITY_VISUALS[name].rank;
  if(value>rank){strongest=name;rank=value}
 }
 return strongest;
}
// The clone(true) Three.js method shares material instances by default.
// Cache per actual mesh, not in Object3D.userData (which clone(true) copies),
// to avoid permanently dyeing the hero, inspection view and other players alike.
const meshMaterials=new WeakMap();
const applied=new WeakMap();
export function applyWeaponQuality(THREE,root,kind,rarity){
 const weapon=root?.getObjectByName?.('gear-'+kind);
 if(!weapon||!weapon.traverse)return false;
 const tier=itemRarity(rarity);
 if(applied.get(weapon)===tier)return false;
 const profile=QUALITY_VISUALS[tier],accentColor=new THREE.Color(profile.materialTint);
 let index=0;
 weapon.traverse(obj=>{
  if(!obj.isMesh||!obj.material)return;
  let record=meshMaterials.get(obj);
  if(!record){
   const single=!Array.isArray(obj.material);
   const original=single?[obj.material]:obj.material;
   const materials=original.map(m=>m.clone());
   record={materials,bases:materials.map(m=>({
    color:m.color?.clone(),emissive:m.emissive?.clone(),
    intensity:m.emissiveIntensity,roughness:m.roughness,metalness:m.metalness
   }))};
   meshMaterials.set(obj,record);
   obj.material=single?materials[0]:materials;
  }
  for(let j=0;j<record.materials.length;j++){
   const m=record.materials[j],base=record.bases[j];
   const accented=/guard|rune|gem|inlay|pommel|binding|grip|hilt|rivet|head|ornament|cross/i.test((obj.name||'')+' '+(m.name||''))||index%5===0;
   if(base.color&&m.color){
    m.color.copy(base.color);
    if(tier==='poor')m.color.lerp(accentColor,.16);
    else if(tier==='uncommon'||tier==='rare')
     m.color.lerp(accentColor,accented?(tier==='rare'?.30:.22):.045);
   }
   if(base.emissive&&m.emissive){
    m.emissive.copy(base.emissive);
    if((tier==='uncommon'||tier==='rare')&&accented)
     m.emissive.lerp(accentColor,tier==='rare'?.72:.52);
    m.emissiveIntensity=(accented&&profile.glow>0)
     ?Math.min(.22,Math.max(profile.glow,(Number.isFinite(base.intensity)?base.intensity:1)*profile.glow))
     :base.intensity;
   }
   if(typeof base.roughness==='number')
    m.roughness=Math.max(.17,Math.min(1,base.roughness+(tier==='poor'?.15:tier==='rare'?-.08:0)));
   if(typeof base.metalness==='number')
    m.metalness=Math.min(1,base.metalness+(tier==='rare'?.07:0));
  }
  index++;
 });
 applied.set(weapon,tier);
 return true;
}

// The shield is a real visible model and needs its own quality handling.
// Each actor owns its materials; the original shared Three.js materials,
// geometries, grips and combat statistics are NEVER modified.
const shieldApplied=new WeakMap();
const shieldMeshMaterials=new WeakMap();
const shieldOwnedDecorations=new WeakSet();
const pristineMaterials=new WeakMap();
const SHIELD_FACE={
 poor:0x596166, common:0xc4a273,uncommon:0x236743,rare:0x265f9c
};
const SHIELD_RIM={
 poor:0x6b7073,common:0xbc975f,uncommon:0x7bcd99,rare:0x8ac6ed
};
function pristineSnapshot(material){
 let snap=pristineMaterials.get(material);
 if(!snap){
  snap={color:material.color?.clone(),emissive:material.emissive?.clone(),
   intensity:material.emissiveIntensity,roughness:material.roughness,metalness:material.metalness};
  pristineMaterials.set(material,snap);
 }
 return snap;
}
function recolorShieldPart(THREE,mesh,tier){
 let record=shieldMeshMaterials.get(mesh);
 if(!record){
  const single=!Array.isArray(mesh.material);
  const originals=single?[mesh.material]:mesh.material;
  const materials=originals.map(material=>{
   const copy=material.clone();
   pristineMaterials.set(copy,pristineSnapshot(material));
   return copy;
  });
  record={materials,bases:materials.map(m=>pristineSnapshot(m))};
  shieldMeshMaterials.set(mesh,record);
  mesh.material=single?materials[0]:materials;
 }
 const role=mesh.name;
 const target=new THREE.Color(role==='shield-face'?SHIELD_FACE[tier]:SHIELD_RIM[tier]);
 const strength=role==='shield-face'?(tier==='uncommon'?.8:tier==='rare'?.85:tier==='poor'?.68:0)
  :(tier==='uncommon'?.58:tier==='rare'?.68:tier==='poor'?.53:0);
 for(let index=0;index<record.materials.length;index++){
  const material=record.materials[index],base=record.bases[index];
  if(material.color&&base.color){
   material.color.copy(base.color);
   if(strength)material.color.lerp(target,strength);
  }
  if(material.emissive&&base.emissive){
   material.emissive.copy(base.emissive);
   if(tier==='uncommon'||tier==='rare')material.emissive.lerp(target,tier==='rare'?.52:.36);
   material.emissiveIntensity=tier==='uncommon'?.065:tier==='rare'?.12:base.intensity;
  }
  if(typeof base.roughness==='number')
   material.roughness=Math.max(.2,Math.min(1,base.roughness+(tier==='poor'?.23:tier==='rare'?-.09:0)));
  if(typeof base.metalness==='number')
   material.metalness=Math.min(1,base.metalness+(tier==='rare'?.08:0));
 }
}
// The insignia is built once per shield, not per equipment swap. It is broad
// enough to read on the small iPhone model and visible from both sides.
function ensureShieldInsignia(THREE,shield){
 let root=shield.getObjectByName('shield-quality-insignia');
 if(root)return root;
 root=new THREE.Group();root.name='shield-quality-insignia';shield.add(root);
 const outer=new THREE.Shape();
 outer.moveTo(0,.42);outer.lineTo(-.23,.20);outer.lineTo(-.17,-.25);
 outer.lineTo(0,-.42);outer.lineTo(.17,-.25);outer.lineTo(.23,.20);outer.closePath();
 const central=new THREE.Shape();
 central.moveTo(0,.28);central.lineTo(-.095,.08);central.lineTo(0,-.20);
 central.lineTo(.095,.08);central.closePath();
 const outline=new THREE.ShapeGeometry(outer);
 const core=new THREE.ShapeGeometry(central);
 for(const side of [-1,1]){
  const backing=new THREE.Mesh(outline,new THREE.MeshStandardMaterial({
   name:'Shield colored enamel',color:0x43985b,roughness:.32,metalness:.45,
   side:THREE.DoubleSide,emissive:0x000000,emissiveIntensity:.09
  }));
  backing.name='shield-enamel';backing.position.z=side>0?.205:-.165;root.add(backing);
  const symbol=new THREE.Mesh(core,new THREE.MeshStandardMaterial({
   name:'Shield gilded crest',color:0xd6c788,roughness:.3,metalness:.7,
   side:THREE.DoubleSide,emissive:0x000000,emissiveIntensity:.05
  }));
  symbol.name='shield-insignia-core';symbol.position.z=side>0?.214:-.174;root.add(symbol);
 }
 root.visible=false;
 return root;
}
export function applyShieldQuality(THREE,actorRoot,rarity){
 const shield=actorRoot?.getObjectByName?.('gear-shield');
 if(!shield?.traverse)return false;
 const tier=itemRarity(rarity);
 if(shieldApplied.get(shield)===tier)return false;
 shield.traverse(obj=>{
  if(obj.isMesh&&obj.material&&['shield-face','shield-rim','shield-boss'].includes(obj.name))
   recolorShieldPart(THREE,obj,tier);
 });
 const insignia=ensureShieldInsignia(THREE,shield);
 const show=tier==='uncommon'||tier==='rare';
 insignia.visible=show;
 if(show){
  for(const mesh of insignia.children){
   const core=mesh.name==='shield-insignia-core';
   // Clone shared material if this group came from a character preview clone.
   if(!shieldOwnedDecorations.has(mesh)){
    mesh.material=mesh.material.clone();
    shieldOwnedDecorations.add(mesh);
   }
   mesh.material.color.setHex(tier==='rare'?(core?0xaedcfd:0x337cc8):(core?0xe3dba0:0x319563));
   mesh.material.emissive.setHex(tier==='rare'?0x2763ac:0x1b6a38);
   mesh.material.emissiveIntensity=tier==='rare'?.18:.095;
  }
 }
 shieldApplied.set(shield,tier);
 return true;
}
