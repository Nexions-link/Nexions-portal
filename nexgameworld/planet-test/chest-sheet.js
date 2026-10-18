// Preserve server slot indexes and require an explicit transfer after selection.
export function createChestSheet({items,qualityColors,move,notify}){
 let tab='chest',selected=null,pending=null;
 function reset(){tab='chest';selected=null;pending=null;}
 function result(event){if(event?.requestId===pending)pending=null;selected=null;}
 function render(body,snapshot,{connected=true,syncing=false}={}){
  const slots=snapshot?.slots,bag=snapshot?.inventory||[];
  const tabs=document.createElement('div');tabs.className='chest-tabs';tabs.setAttribute('role','tablist');
  for(const [key,label,rows,total] of [['chest','Сундук',slots,18],['bag','Рюкзак',bag,bag.length||12]]){
   const button=document.createElement('button');button.type='button';button.setAttribute('role','tab');
   button.setAttribute('aria-selected',String(tab===key));button.setAttribute('aria-controls','chestItems');
   button.textContent=label+' · '+(rows?rows.filter(Boolean).length:'…')+'/'+total;
   button.addEventListener('click',()=>{tab=key;selected=null;body.replaceChildren();render(body,snapshot,{connected,syncing});});tabs.append(button);
  }
  body.append(tabs);
  const grid=document.createElement('div');grid.id='chestItems';grid.className='inventory-grid chest-sheet-grid';
  grid.setAttribute('role','tabpanel');grid.setAttribute('aria-label',tab==='chest'?'Содержимое сундука':'Содержимое рюкзака');
  const detail=document.createElement('div');detail.className='chest-selection';detail.setAttribute('aria-live','polite');
  const rows=tab==='chest'?slots:bag;
  detail.textContent=!connected?'Нет связи с сервером. Открой сундук после подключения.':!slots?(syncing?'Синхронизируем положение с сервером…':'Получаем содержимое сундука…'):pending?'Перемещаем предмет…':'Выбери предмет, чтобы посмотреть и перенести.';
  for(let i=0;i<(tab==='chest'?18:bag.length||12);i++){
   const item=rows?.[i],def=items[item?.id];
   const cell=document.createElement('button');cell.type='button';cell.className='inventory-slot '+(item?'occupied':'empty');
   cell.disabled=!item||!connected||!slots||!!pending;
   cell.setAttribute('aria-label',item?(def?.name||item.id)+' ×'+item.qty:'Пустая ячейка '+(i+1));
   if(item){
    cell.style.setProperty('--item-quality-color',qualityColors[def?.rarity]?.color||'#e6d2aa');
    const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=def?.icon||'📦';
    const count=document.createElement('span');count.className='slot-count';count.textContent=item.qty>1?item.qty:'';
    cell.append(icon,count);
    cell.addEventListener('click',()=>{
     selected={tab,index:i,id:item.id,qty:item.qty};
     for(const child of grid.children)child.classList.remove('selected');cell.classList.add('selected');detail.replaceChildren();
     const text=document.createElement('div'),name=document.createElement('strong'),description=document.createElement('small');
     name.textContent=(def?.name||item.id)+' ×'+item.qty;name.style.color=qualityColors[def?.rarity]?.color||'#e6d2aa';
     description.textContent=def?.quest?'Предмет задания нельзя положить в общий сундук.':def?.description||'Переносится вся стопка.';text.append(name,description);
     const action=document.createElement('button');action.type='button';action.textContent=tab==='chest'?'Забрать':'Положить';action.disabled=tab==='bag'&&(!def||!!def.quest);
     action.addEventListener('click',()=>{
      if(pending||!selected||selected.tab!==tab)return;
      const current=rows?.[selected.index];if(!current||current.id!==selected.id||current.qty!==selected.qty)return;
      const requestId=crypto.randomUUID();
      if(move(tab==='chest'?'withdraw':'deposit',selected.index,requestId)===false){notify('Нет связи с сервером');return;}
      pending=requestId;selected=null;body.replaceChildren();render(body,snapshot,{connected,syncing});
     });detail.append(text,action);
    });
   }else cell.textContent='·';grid.append(cell);
  }
  body.append(grid,detail);
 }
 return {render,reset,result};
}
