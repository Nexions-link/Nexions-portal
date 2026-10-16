// Touch-friendly interface for the globally shared 18-slot Hearth House chest.
// Server owns its slots and authorizes transfers; client only renders ACKed data.
export function createSharedChestPanel({
 getWorld,getInventory,setInventory,openDialog,getModal,notify,items,stackLimit
}){
 let supported=false,slots=Array(18).fill(null),revision=-1,pending=null;
 const copy=item=>item?{id:item.id,qty:item.qty}:null;
 const okay=item=>item==null||(typeof item.id==='string'&&Object.hasOwn(items,item.id)&&
  Number.isInteger(item.qty)&&item.qty>=1&&item.qty<=stackLimit(item.id));
 const snapshot=data=>Array.isArray(data)&&data.length===18&&data.every(okay);
 const title=(label)=>{const node=document.createElement('div');node.className='chest-section-title';node.textContent=label;return node};
 function grid(contents,source){
  const holder=document.createElement('div');holder.className='inventory-grid chest-grid';
  for(let index=0;index<contents.length;index++){
   const item=contents[index],def=item?items[item.id]:null,quest=!!def?.quest;
   const button=document.createElement('button');button.type='button';
   button.className='inventory-slot'+(item?' occupied':' empty');
   button.disabled=pending!==null||revision<0||(source==='bag'&&quest);
   button.setAttribute('aria-label',item?(source==='bag'?'Положить ':'Забрать ')+def.name+', '+item.qty+' шт.':'Пустая ячейка '+(index+1));
   if(def){
    button.dataset.rarity=def.rarity;
    const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=def.icon;
    const count=document.createElement('span');count.className='slot-count';count.textContent=item.qty>1?String(item.qty):'';
    const caption=document.createElement('span');caption.className='slot-item-name';caption.textContent=def.name;
    button.append(icon,count,caption);
    if(!quest)button.addEventListener('click',()=>move(source==='bag'?'deposit':'withdraw',index));
   }else{
    const empty=document.createElement('span');empty.className='slot-empty-mark';empty.textContent='·';button.appendChild(empty);
   }
   holder.appendChild(button);
  }
  return holder;
 }
 function render(){
  if(getModal()!=='sharedChest')return;
  const parent=document.getElementById('mbody');parent.replaceChildren();
  const help=document.createElement('p');help.className='chest-help';
  help.textContent=!supported?'Сервер общего сундука недоступен.':
   pending?'Перемещаем предмет…':revision<0?'Получаем содержимое сервера…':
   'Коснись предмета в рюкзаке, чтобы положить его в сундук, или предмета в сундуке, чтобы забрать.';
  parent.appendChild(help);
  parent.appendChild(title('ОБЩИЙ СУНДУК · '+slots.filter(Boolean).length+' / 18'));
  parent.appendChild(grid(slots,'chest'));
  const bag=getInventory();
  parent.appendChild(title('ТВОЙ РЮКЗАК · '+bag.filter(Boolean).length+' / '+bag.length));
  parent.appendChild(grid(bag,'bag'));
  const note=document.createElement('p');note.className='chest-note';
  note.textContent='Переносятся целые стопки предметов. Предметы заданий передавать нельзя. Содержимое зависит от сохранности серверных данных.';
  parent.appendChild(note);
 }
 function open(){
  const world=getWorld();
  if(!supported||!world?.connected()){notify('Сервер общего сундука пока недоступен',4000);return}
  slots=Array(18).fill(null);revision=-1;
  openDialog('Общий сундук','ДОМ ОЧАГА · 18 ЯЧЕЕК · ДОСТУПЕН ВСЕМ ИГРОКАМ');
  render();
  if(!world.openChest(getInventory().map(copy)))notify('Нет связи с сервером',3000);
 }
 function move(action,index){
  if(pending||revision<0||!supported)return;
  const requestId=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  if(!getWorld()?.moveChest(action,index,requestId)){notify('Нет связи с сервером');return}
  pending=requestId;render();
 }
 function updateState(data){
  if(!data){supported=false;revision=-1;pending=null;render();return}
  if(!snapshot(data.slots)||!Number.isSafeInteger(data.revision)||data.revision<revision)return;
  slots=data.slots.map(copy);revision=data.revision;render();
 }
 function updateResult(data){
  if(!data)return;
  if(!data.ok){
   if(data.requestId===pending)pending=null;
   if(data.reason)notify(String(data.reason).slice(0,100),3800);
   render();return;
  }
  if(!pending||pending!==data.requestId)return;
  const previous=getInventory(),next=data.inventory;
  if(!Array.isArray(next)||next.length!==previous.length||!next.every(okay)){
   notify('Ошибка синхронизации рюкзака, перезайди в игру',4000);return;
  }
  setInventory(next.map(copy));pending=null;
  updateState(data);
  if(data.item?.id&&items[data.item.id])
   notify((data.action==='deposit'?'Положено: ':'Забрано: ')+items[data.item.id].name);
 }
 return {
  ready:(value)=>{supported=!!value;render()},
  open,close:()=>{getWorld()?.closeChest()},
  state:updateState,result:updateResult
 };
}
