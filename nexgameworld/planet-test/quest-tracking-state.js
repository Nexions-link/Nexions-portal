// UI-only tracking choice; quest acceptance and rewards stay server-owned.
import {acceptedQuestIds} from './starter-quest-guidance.js';
export function createQuestTracking({state,storage,key}){
 let accepted=new Set(acceptedQuestIds(state)),selected=null;
 const save=()=>{try{storage?.setItem(key,selected||'')}catch{}};
 let savedBefore=false;
 try{
  const prior=storage?.getItem(key);
  savedBefore=prior!==null&&prior!==undefined;
  if(prior&&accepted.has(prior))selected=prior;
 }catch{}
 // On first use an already active quest is visible, but an explicit
 // previous opt-out is respected until the next newly accepted quest.
 if(!savedBefore&&accepted.size){selected=[...accepted].at(-1);save();}
 function sync(){
  const current=acceptedQuestIds(state);
  const fresh=current.filter(id=>!accepted.has(id));
  accepted=new Set(current);
  if(fresh.length){selected=fresh.at(-1);save();}
  else if(selected&&!accepted.has(selected)){selected=null;save();}
  return selected;
 }
 function select(id){sync();selected=id&&accepted.has(id)?id:null;save();return selected;}
 return {sync,select,get selectedId(){return selected}};
}
