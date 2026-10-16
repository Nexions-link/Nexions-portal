// Server-authoritative mob positions may exceed the local 23 m combat leash.
// The leash is gameplay logic, not a reason to discard the entire network roster.
export const MOB_SNAPSHOT_WORLD_BOUND=80;
export function collectSharedMobTargets(snapshot,enemies){
 const targets=new Map(),rejected={id:0,position:0,outsideWorld:0,duplicate:0};
 if(!Array.isArray(snapshot))return {targets,rejected};
 for(const row of snapshot){
  const id=row?.id;
  if(!Number.isInteger(id)||id<0||id>=enemies.length||
     !enemies[id]||enemies[id].trainingDummy){rejected.id++;continue;}
  if(!Number.isFinite(row.x)||!Number.isFinite(row.z)){rejected.position++;continue;}
  if(Math.abs(row.x)>MOB_SNAPSHOT_WORLD_BOUND||
     Math.abs(row.z)>MOB_SNAPSHOT_WORLD_BOUND){rejected.outsideWorld++;continue;}
  if(targets.has(id)){rejected.duplicate++;continue;}
  const mob=enemies[id];
  targets.set(id,{
   x:row.x,z:row.z,
   yaw:Number.isFinite(row.yaw)?row.yaw:(mob.root?.rotation?.y||0),
   phase:Number.isFinite(row.phase)?row.phase:null,
   hp:row.hp,maxHp:row.maxHp,life:row.life,dead:row.dead,
   aggroId:row.aggroId,stunned:row.stunned,attackSeq:row.attackSeq,
   returning:row.returning
  });
 }
 return {targets,rejected};
}
export function mobSnapshotErrorLabel(rejected,received,expected){
 const details=[];
 if(rejected.id)details.push('ID:'+rejected.id);
 if(rejected.position)details.push('координаты:'+rejected.position);
 if(rejected.outsideWorld)details.push('вне карты:'+rejected.outsideWorld);
 if(rejected.duplicate)details.push('дубли:'+rejected.duplicate);
 return received+'/'+expected+' (ошибка'+(details.length?': '+details.join(', '):': неполные данные')+')';
}
