// Client-side presentation only. Never alters server-authoritative quest state.
import {acceptedQuestIds} from './starter-quest-guidance.js?v=8';
export const MAX_TRACKED_QUESTS=3;
export function createQuestTracking({state,storage,key}){
 let accepted=new Set(acceptedQuestIds(state)),tracked=[];
 const valid=id=>typeof id==='string'&&accepted.has(id);
 const save=()=>{try{storage?.setItem(key,JSON.stringify(tracked))}catch{}};
 let savedBefore=false;
 try{
  const prior=storage?.getItem(key);
  savedBefore=prior!==null&&prior!==undefined;
  if(savedBefore){
   // Migrate v1: one bare quest ID or empty string. v2: bounded ordered IDs.
   let saved;
   try{saved=JSON.parse(prior)}catch{saved=prior}
   const ids=Array.isArray(saved)?saved:typeof saved==='string'&&saved?[saved]:[];
   tracked=[...new Set(ids.filter(valid))].slice(0,MAX_TRACKED_QUESTS);
  }
 }catch{}
 if(!savedBefore&&accepted.size){
  tracked=[...accepted].reverse().slice(0,MAX_TRACKED_QUESTS);
  save();
 }
 function sync(){
  const current=acceptedQuestIds(state),fresh=current.filter(id=>!accepted.has(id));
  accepted=new Set(current);
  // Completed, handed-in and replaced quests must never remain pinned.
  const before=tracked.join('|');
  tracked=tracked.filter(id=>accepted.has(id));
  // Every newly accepted quest is automatically added; the fourth replaces
  // the oldest tracked entry, not the character's accepted quest.
  for(const id of fresh)tracked=[id,...tracked.filter(x=>x!==id)].slice(0,MAX_TRACKED_QUESTS);
  if(tracked.join('|')!==before)save();
  return tracked[0]||null;
 }
 function toggle(id){
  sync();
  if(!valid(id))return false;
  if(tracked.includes(id))tracked=tracked.filter(x=>x!==id);
  else tracked=[id,...tracked].slice(0,MAX_TRACKED_QUESTS);
  save();return true;
 }
 // Compatibility for clients that explicitly choose a single pinned quest.
 function select(id){
  sync();tracked=valid(id)?[id]:[];save();return tracked[0]||null;
 }
 return {sync,toggle,select,get selectedId(){return tracked[0]||null},
  get trackedIds(){return [...tracked]}};
}
