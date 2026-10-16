// Palette editor data for Atlas creature C002. RGB matches the original approved concept mesh.
// These are vertex-color RGB values (not PBR albedo textures). Keep the mob version at 0.1.
export const BOAR_PALETTE_STORAGE='nexgame-atlas-boar-palette-0.1';
export const BOAR_PALETTE_PARTS=Object.freeze([
 {id:'hide',name:'Шкура · корпус',group:'Шкура и морда',color:'#6b412a'},
 {id:'shoulder',name:'Плечи и загривок',group:'Шкура и морда',color:'#5b3526'},
 {id:'belly',name:'Живот',group:'Шкура и морда',color:'#503124'},
 {id:'head',name:'Голова и щёки',group:'Шкура и морда',color:'#774c2f'},
 {id:'muzzle',name:'Вытянутая морда',group:'Шкура и морда',color:'#8b5b4a'},
 {id:'nose',name:'Пятачок',group:'Шкура и морда',color:'#a47064'},
 {id:'nostril',name:'Ноздри и рот',group:'Шкура и морда',color:'#36231f'},
 {id:'fur',name:'Тёмная щетина',group:'Шерсть и уши',color:'#41271f'},
 {id:'fur_light',name:'Светлые пряди',group:'Шерсть и уши',color:'#603a29'},
 {id:'ear',name:'Внешняя часть ушей',group:'Шерсть и уши',color:'#6f4230'},
 {id:'inner_ear',name:'Внутренняя часть ушей',group:'Шерсть и уши',color:'#8b5856'},
 {id:'tail',name:'Хвост',group:'Шерсть и уши',color:'#503225'},
 {id:'eyelid',name:'Веки и брови',group:'Глаза и детали',color:'#422920'},
 {id:'eye',name:'Зрачки и глаз',group:'Глаза и детали',color:'#1d1310'},
 {id:'iris',name:'Янтарная радужка',group:'Глаза и детали',color:'#bd7f37'},
 {id:'eyeshine',name:'Блик глаза',group:'Глаза и детали',color:'#fde2b9'},
 {id:'ivory',name:'Основные клыки',group:'Глаза и детали',color:'#e9d09c'},
 {id:'ivory_shadow',name:'Основания клыков',group:'Глаза и детали',color:'#be9d71'},
 {id:'hooves',name:'Раздвоенные копыта',group:'Глаза и детали',color:'#322c2a'},
 {id:'hoof_band',name:'Венчик копыта',group:'Глаза и детали',color:'#53453b'},
 {id:'scar',name:'Шрамы',group:'Глаза и детали',color:'#a37351'}
]);
export const BOAR_PALETTE_DEFAULTS=Object.freeze(Object.fromEntries(BOAR_PALETTE_PARTS.map(p=>[p.id,p.color])));
export function normalizeBoarPalette(input){
 const out={...BOAR_PALETTE_DEFAULTS};
 if(!input || typeof input!=='object')return out;
 for(const part of BOAR_PALETTE_PARTS){
  const v=input[part.id];
  if(typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v))out[part.id]=v.toLowerCase();
 }
 return out;
}
export function boarRGB(hex){
 if(typeof hex!=='string'||!/^#[0-9a-fA-F]{6}$/.test(hex))return null;
 return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
}
// Produces a recolored copy without losing vertex shading. Both previews and GLB export use this.
export function boarRemapChannel(original,partId,channel,hex){
 const base=boarRGB(BOAR_PALETTE_DEFAULTS[partId]);
 const desired=boarRGB(hex);
 if(!base||!desired||channel<0||channel>2)return original;
 return Math.max(0,Math.min(255,Math.round(original*desired[channel]/Math.max(1,base[channel]))));
}
// This writes only byte COLOR_0 attributes. Geometry, UVs, GLB chunks, and animations stay byte-for-byte intact.
export function recolorBoarGLB(arrayBuffer,palette){
 const input=new Uint8Array(arrayBuffer);
 const bytes=input.slice();
 const dv=new DataView(bytes.buffer);
 if(bytes.byteLength<28||dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==bytes.byteLength)throw new Error('Неверный формат GLB');
 let pos=12,json=null,binaryStart=null;
 while(pos<bytes.byteLength){
  if(pos+8>bytes.byteLength)throw new Error('Повреждён GLB');
  const size=dv.getUint32(pos,true),type=dv.getUint32(pos+4,true);
  const offset=pos+8;
  if(offset+size>bytes.byteLength)throw new Error('Повреждена длина секции GLB');
  if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(bytes.subarray(offset,offset+size)));
  if(type===0x004e4942)binaryStart=offset;
  pos=offset+size;
 }
 if(!json || binaryStart===null)throw new Error('Нет данных модели');
 const colors=normalizeBoarPalette(palette);
 let edited=0;
 for(const mesh of json.meshes||[]){
  const part=(mesh.name||'').replace(/^NexBoar_/,'');
  if(!Object.hasOwn(BOAR_PALETTE_DEFAULTS,part))continue;
  for(const primitive of mesh.primitives||[]){
   const idx=primitive.attributes?.COLOR_0;
   if(idx===undefined)continue;
   const a=json.accessors[idx],v=json.bufferViews[a.bufferView];
   if(a.componentType!==5121||a.type!=='VEC4'||!a.normalized)throw new Error('Неподдерживаемый формат цветов '+part);
   const stride=v.byteStride||4;
   const at=binaryStart+(v.byteOffset||0)+(a.byteOffset||0);
   if(at+(a.count-1)*stride+4>bytes.byteLength)throw new Error('Цвета за пределами GLB');
   for(let i=0;i<a.count;i++)for(let channel=0;channel<3;channel++){
    const k=at+i*stride+channel;
    bytes[k]=boarRemapChannel(input[k],part,channel,colors[part]);
   }
   edited+=a.count;
  }
 }
 if(!edited)throw new Error('Не найдены цвета кабана');
 return bytes;
}
