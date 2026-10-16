// Single source of creature drops for NexGameWorld's spherical game and Atlas.
// Initial probabilities are original NexGameWorld balance, not WoW drop rates.
import {ITEM_CATALOG,GEAR_LOOT} from '../items.js';
export const CREATURE_LOOT_TABLES=Object.freeze({
 dolgonog:{
  name:'Равнинный долгоног',
  materials:[
   {id:'feather',chance:.72,min:1,max:1},
   {id:'beak',chance:.22,min:1,max:1},
   {id:'down',chance:.16,min:1,max:2},
   {id:'charm',chance:.02,min:1,max:1}
  ],
  equipment:{poor:.06,uncommon:.01}
 },
 stormbeak:{
  name:'Грозоклюв',
  materials:[
   {id:'giantFeather',chance:1,min:1,max:1},
   {id:'feather',chance:.85,min:1,max:2},
   {id:'beak',chance:.65,min:1,max:1},
   {id:'down',chance:.50,min:1,max:2},
   {id:'charm',chance:.12,min:1,max:1}
  ],
  equipment:{poor:.18,uncommon:.06}
 }
});
// Boar is presently Atlas-only; do not invent a drop table until it joins the game.
const unitRoll=rng=>{
 const n=Number(rng());
 if(!Number.isFinite(n))throw Error('Invalid NexGameWorld loot random result');
 return Math.max(0,Math.min(1-Number.EPSILON,n));
};
export function rollCreatureLoot(creatureId,rng=Math.random){
 const table=CREATURE_LOOT_TABLES[creatureId];
 if(!table)throw Error('No NexGameWorld loot table for '+creatureId);
 const result=[];
 for(const row of table.materials){
  if(unitRoll(rng)>=row.chance)continue;
  const qty=row.min+(row.max>row.min?Math.floor(unitRoll(rng)*(row.max-row.min+1)):0);
  result.push({id:row.id,qty});
 }
 // One exclusive equipment tier roll; then one random item in that pool.
 const roll=unitRoll(rng);
 const grade=roll<table.equipment.uncommon?'uncommon':
  roll<table.equipment.uncommon+table.equipment.poor?'poor':null;
 if(grade){
  const pool=GEAR_LOOT[grade];
  let id=pool[Math.floor(unitRoll(rng)*pool.length)];
  if(id==='scalpingStrength'&&unitRoll(rng)<.5)id='scalpingStamina';
  result.push({id,qty:1});
 }
 return result;
}
// Exact marginal item percentages shown in the Atlas.
export function getCreatureLootRows(creatureId){
 const table=CREATURE_LOOT_TABLES[creatureId];
 if(!table)return [];
 const rows=table.materials.map(row=>({...row,group:'materials'}));
 for(const grade of ['poor','uncommon']){
  const pool=GEAR_LOOT[grade],chance=table.equipment[grade]/pool.length;
  for(const id of pool){
   if(id==='scalpingStrength'){
    rows.push({id:'scalpingStrength',chance:chance/2,min:1,max:1,group:'equipment'});
    rows.push({id:'scalpingStamina',chance:chance/2,min:1,max:1,group:'equipment'});
   }else rows.push({id,chance,min:1,max:1,group:'equipment'});
  }
 }
 return rows;
}
export function validateCreatureLootTables(tables=CREATURE_LOOT_TABLES){
 const errors=[];
 for(const [creatureId,table] of Object.entries(tables)){
  if(!Array.isArray(table.materials))errors.push(creatureId+': missing materials');
  const seen=new Set();
  for(const row of table.materials||[]){
   if(!ITEM_CATALOG[row.id])errors.push(creatureId+': unknown item '+row.id);
   if(seen.has(row.id))errors.push(creatureId+': duplicate item '+row.id);
   seen.add(row.id);
   if(!Number.isFinite(row.chance)||row.chance<0||row.chance>1)errors.push(creatureId+': invalid chance '+row.id);
   if(!Number.isInteger(row.min)||!Number.isInteger(row.max)||row.min<1||
    row.max<row.min||row.max>20)errors.push(creatureId+': invalid quantity '+row.id);
  }
  let total=0;
  for(const grade of ['poor','uncommon']){
   const chance=table.equipment?.[grade];
   if(!Number.isFinite(chance)||chance<0||chance>1)errors.push(creatureId+': invalid equipment chance '+grade);
   else total+=chance;
   for(const id of GEAR_LOOT[grade])if(!ITEM_CATALOG[id])errors.push(creatureId+': unknown gear '+id);
  }
  if(total>1+1e-10)errors.push(creatureId+': equipment odds exceed 100%');
 }
 return errors;
}
