// Sphere-only corpse lifetime and safe, opt-in looting.
// Opening/closing the body never grants items or changes its disappearance timer.
export const CORPSE_DURATION_SECONDS=30;
export const NORMAL_MOB_RESPAWN_SECONDS=30;

// Timer starts only once the death animation has settled. Looting does not reset it.
export function advanceCorpseTimer(corpse,dt){
 if(!corpse?.corpse||corpse.dying)return false;
 corpse.corpseAge=(corpse.corpseAge||0)+Math.max(0,Number.isFinite(dt)?dt:0);
 return corpse.corpseAge>=CORPSE_DURATION_SECONDS;
}

// Respawn starts only after the body has disappeared, never after collecting loot.
export function advanceRespawnTimer(mob,dt){
 if(!mob?.root||mob.root.visible||mob.corpse)return false;
 mob.respawn=Math.max(0,(mob.respawn||0)-Math.max(0,Number.isFinite(dt)?dt:0));
 return mob.respawn<=0;
}

export function corpseRowCapacity(inventory,row,stackLimit,slotCount=12){
 if(!Array.isArray(inventory)||!row||typeof row.id!=='string'||
  !Number.isInteger(row.qty)||row.qty<1||typeof stackLimit!=='function')return 0;
 const cap=Math.max(1,Math.floor(Number(stackLimit(row.id))||1));
 const existing=inventory.reduce((sum,slot)=>
  sum+(slot?.id===row.id?Math.max(0,cap-(slot.qty||0)):0),0);
 const empty=Math.max(0,Math.floor(slotCount)-inventory.length);
 return existing+empty*cap;
}
export function canStoreCorpseRow(inventory,row,stackLimit,slotCount=12){
 return corpseRowCapacity(inventory,row,stackLimit,slotCount)>=row?.qty&&
  Number.isInteger(row.qty)&&row.qty>0;
}
export function takeCorpseRow(corpse,index,{inventory,stackLimit,store,slotCount=12}={}){
 if(!corpse?.corpse||corpse.dying||!corpse.root?.visible||!Array.isArray(corpse.loot)||
  !Number.isInteger(index)||index<0||index>=corpse.loot.length)
  return {ok:false,reason:'unavailable'};
 const row=corpse.loot[index];
 const available=corpseRowCapacity(inventory,row,stackLimit,slotCount);
 if(!available)return {ok:false,reason:'full'};
 // Keep any uncollected remainder inside the same corpse row; never duplicate items.
 const qty=Math.min(row.qty,available);
 if(typeof store!=='function'||store(row.id,qty)!==true)
  return {ok:false,reason:'full'};
 const item={id:row.id,qty},partial=qty<row.qty;
 if(qty===row.qty)corpse.loot.splice(index,1);
 else row.qty-=qty;
 return {ok:true,item,partial,remaining:corpse.loot.length};
}
export function takeAllCorpseRows(corpse,services){
 if(!corpse?.corpse||corpse.dying||!corpse.root?.visible||!Array.isArray(corpse.loot))
  return {taken:[],remaining:0};
 const taken=[];
 // Reverse traversal preserves indexes when a row is fully collected.
 for(let i=corpse.loot.length-1;i>=0;i--){
  const outcome=takeCorpseRow(corpse,i,services);
  if(outcome.ok)taken.push(outcome.item);
 }
 return {taken,remaining:corpse.loot.length};
}
