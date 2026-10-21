// Stable asynchronous equipment lifecycle. A new progress snapshot that does
// not actually change an item must not tear down or reload its visible GLB.
// Load the replacement first, then swap it in a single synchronous render tick.
export function createEquipmentVisualSwitcher({load,swap,clear,onError=()=>{}}){
 const slots=new Map();
 function get(slot){
  if(!slots.has(slot))slots.set(slot,{desired:undefined,displayed:null,pending:false,revision:0});
  return slots.get(slot);
 }
 async function update(slot,key,spec=null){
  const current=get(slot);
  if(current.desired===key&&(current.pending||current.displayed===key))return false;
  const revision=++current.revision;
  current.desired=key;
  current.pending=key!==null;
  if(key===null){
   if(current.displayed!==null)clear(slot);
   current.displayed=null;
   return true;
  }
  try{
   const gltf=await load(spec);
   if(current.revision!==revision)return false;
   swap(slot,gltf,spec);
   current.displayed=key;
   current.pending=false;
   return true;
  }catch(err){
   if(current.revision===revision){
    current.pending=false;
    // Allow retry after a genuine load failure while retaining the old mesh.
    current.desired=undefined;
    onError(slot,err);
   }
   return false;
  }
 }
 return {update};
}
