// NexGameWorld: visual XP gain, with no game-state ownership.
// The online client calls this only after authoritative saved progress arrives.
export function createXpFeedback({document,layer,maxVisible=3}){
 if(!document||!layer)throw Error('xp_feedback_layer_missing');
 function show(amount,{levelUp=false}={}){
  if(!Number.isFinite(amount)||amount<0)return null;
  const gained=Math.round(amount);
  const item=document.createElement('div');
  item.className='ngw-xp-popup '+(gained?'ngw-xp-positive':'ngw-xp-gray');
  item.textContent=gained?'+ '+gained+' опыта':'0 опыта';
  if(levelUp&&gained)item.textContent+=' · Новый уровень!';
  item.setAttribute('role','status');
  item.setAttribute('aria-label',item.textContent);
  item.addEventListener('animationend',()=>{
   if(typeof item.remove==='function')item.remove();
   else layer.replaceChildren(...Array.from(layer.children).filter(child=>child!==item));
  });
  const previous=Array.from(layer.children);
  if(previous.length>=maxVisible)layer.replaceChildren(...previous.slice(1-maxVisible));
  layer.append(item);
  return item;
 }
 return {show};
}
