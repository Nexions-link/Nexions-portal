// UI for C002 only. Edits are local until the user exports and publishes the GLB.
export async function mountBoarPaletteEditor({host,model,glbBuffer,revision,isCurrent}){
 const {
  BOAR_PALETTE_PARTS,BOAR_PALETTE_DEFAULTS,BOAR_PALETTE_STORAGE,
  normalizeBoarPalette,boarRGB,boarRemapChannel,recolorBoarGLB
 }=await import('./atlas-palette.js?refresh='+revision);
 if(!isCurrent())return;
 const palettesByPart=new Map();
 model.traverse(object=>{
  if(!object.isMesh)return;
  const part=object.name.match(/^NexBoar_(.+)$/)?.[1];
  if(!part || !Object.hasOwn(BOAR_PALETTE_DEFAULTS,part))return;
  const attr=object.geometry.getAttribute('color');
  if(!attr||attr.itemSize<3)return;
  const list=palettesByPart.get(part)||[];
  list.push({attr,original:attr.array.slice(),scale:attr.array instanceof Uint8Array?1:255});
  palettesByPart.set(part,list);
 });
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem(BOAR_PALETTE_STORAGE)||'null')}catch(error){console.warn('Atlas palette storage unavailable',error)}
 let palette=normalizeBoarPalette(saved?.palette);
 const active=()=>isCurrent()&&host.isConnected;
 const ui=(tag,className,textValue)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(textValue!==undefined)element.textContent=textValue;
  return element;
 };
 function applyPart(part){
  const source=palettesByPart.get(part)||[];
  for(const item of source){
   const array=item.attr.array;
   for(let i=0;i<item.attr.count;i++)for(let c=0;c<3;c++){
    const index=i*item.attr.itemSize+c;
    const byte=item.original[index]*item.scale;
    array[index]=boarRemapChannel(byte,part,c,palette[part])/item.scale;
   }
   item.attr.needsUpdate=true;
  }
 }
 function applyAll(){for(const part of BOAR_PALETTE_PARTS)applyPart(part.id)}
 host.replaceChildren();
 const heading=ui('div','palette-header');
 heading.append(ui('h3','', 'Редактор цвета · C002'));
 const intro=ui('p','palette-hint','Цвета нанесены прямо на вершины GLB. Изменяй каждую часть — результат сразу виден в 3D. Анимации продолжают работать.');
 host.append(heading,intro);
 const groups=new Map(),controls=new Map();
 for(const p of BOAR_PALETTE_PARTS){
  let group=groups.get(p.group);
  if(!group){
   group=ui('details','palette-group');
   group.open=groups.size===0;
   const summary=ui('summary','',p.group);
   const contents=ui('div','palette-grid');
   group.append(summary,contents);
   host.append(group);
   groups.set(p.group,group);
  }
  const row=ui('div','palette-row');
  const label=ui('span','palette-name',p.name);
  const picker=ui('input','palette-picker');
  picker.type='color';picker.value=palette[p.id];picker.setAttribute('aria-label','Цвет: '+p.name);
  const hex=ui('input','palette-hex');
  hex.type='text';hex.maxLength=7;hex.value=palette[p.id];hex.spellcheck=false;
  hex.autocomplete='off';hex.inputMode='text';hex.setAttribute('aria-label','HEX: '+p.name);
  const mutate=value=>{
   if(!/^#[\da-fA-F]{6}$/.test(value))return;
   palette[p.id]=value.toLowerCase();
   picker.value=palette[p.id];hex.value=palette[p.id];
   applyPart(p.id);
   message.textContent='Изменения ещё не сохранены';
  };
  picker.addEventListener('input',()=>mutate(picker.value));
  hex.addEventListener('change',()=>{if(/^#[\da-fA-F]{6}$/.test(hex.value))mutate(hex.value);else hex.value=palette[p.id]});
  row.append(label,picker,hex);
  group.lastChild.append(row);
  controls.set(p.id,{picker,hex});
 }
 const bar=ui('div','palette-actions');
 const save=ui('button','palette-primary','Сохранить палитру');
 const reset=ui('button','','Вернуть эталон');
 const exportJSON=ui('button','','Скачать JSON');
 const exportGLB=ui('button','','Скачать GLB');
 for(const btn of [save,reset,exportJSON,exportGLB]){btn.type='button';bar.append(btn)}
 const message=ui('p','palette-message',saved?'Загружена сохранённая палитра':'Эталонная палитра · 0.1');
 const footnote=ui('p','palette-note','«Сохранить» сохраняет цвета на этом устройстве в Safari/браузере. Для передачи палитры и использования на других устройствах скачай JSON или GLB. Изменения не отправляются автоматически в GitHub.');
 host.append(bar,message,footnote);
 const notify=(s)=>{message.textContent=s};
 const download=(blob,filename)=>{
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 save.addEventListener('click',()=>{
  try{
   localStorage.setItem(BOAR_PALETTE_STORAGE,JSON.stringify({palette,version:'0.1'}));
   notify('Палитра сохранена на этом устройстве');
  }catch(error){notify('Не удалось сохранить в браузере — скачай JSON');console.error(error)}
 });
 reset.addEventListener('click',()=>{
  palette={...BOAR_PALETTE_DEFAULTS};
  for(const part of BOAR_PALETTE_PARTS){
   const c=controls.get(part.id);c.picker.value=palette[part.id];c.hex.value=palette[part.id];
  }
  applyAll();
  try{localStorage.removeItem(BOAR_PALETTE_STORAGE)}catch(error){console.warn(error)}
  notify('Восстановлена эталонная палитра 0.1');
 });
 exportJSON.addEventListener('click',()=>{
  download(new Blob([JSON.stringify({creature:'C002',version:'0.1',palette},null,2)],{type:'application/json'}),'nexgame-boar-C002-palette.json');
  notify('Файл палитры JSON подготовлен');
 });
 exportGLB.addEventListener('click',()=>{
  try{
   const bytes=recolorBoarGLB(glbBuffer,palette);
   download(new Blob([bytes],{type:'model/gltf-binary'}),'wild-boar-v0.1.glb');
   notify('GLB с цветами и анимациями сохранён в загрузки');
  }catch(error){notify('Ошибка экспорта GLB');console.error(error)}
 });
 host.hidden=false;
 applyAll();
}
