import {forestTrailLatitude,forestLocalPoint,FOREST_CAMP} from './whispering-forest.js';
export const EXPEDITION_LEVEL=4;
export const EXPEDITION_REWARD=Object.freeze({xp:280,gold:45});
export const EXPEDITION_MENTOR=Object.freeze({x:-1.5,z:-5,range:4.7});
export const EXPEDITION_SCOUT=Object.freeze({...forestLocalPoint(FOREST_CAMP.lon,FOREST_CAMP.lat),range:4.7});
export const EXPEDITION_SITES=Object.freeze([
 {lon:.98,lat:forestTrailLatitude(.98)+.105,title:'Шепчущий камень'},
 {lon:1.115,lat:forestTrailLatitude(1.115)-.094,title:'Корни великана'},
 {lon:1.285,lat:forestTrailLatitude(1.285)+.093,title:'Забытый дозор'}
].map((p,index)=>Object.freeze({...p,...forestLocalPoint(p.lon,p.lat),index,range:4.2})));
export const defaultExpedition=()=>({stage:0,visited:[false,false,false]});
export function readExpedition(q){
 if(!q||!Number.isInteger(q.stage)||q.stage<0||q.stage>4||
  !Array.isArray(q.visited)||q.visited.length!==3||q.visited.some(v=>typeof v!=='boolean'))
  return defaultExpedition();
 return {stage:q.stage,visited:[...q.visited]};
}
export function expeditionNextPoint(raw){
 const q=readExpedition(raw);
 if(q.stage===1||q.stage===3)return EXPEDITION_SCOUT;
 if(q.stage===2)return EXPEDITION_SITES.find(p=>!q.visited[p.index])||EXPEDITION_SCOUT;
 return EXPEDITION_MENTOR;
}
export function expeditionJournal(raw,level){
 const q=readExpedition(raw);
 const titles=['Зов горизонта','За последним холмом','Три лесных ориентира',
 'Донесение разведчика','Путь открыт'];
 return {id:'expedition',title:titles[q.stage],
  status:q.stage===0?(level>=EXPEDITION_LEVEL?'available':'locked'):q.stage===4?'completed':'current',
  progress:q.stage===1?'Найти лагерь разведчиков':
   q.stage===2?'Исследовано '+q.visited.filter(Boolean).length+' / 3':
   q.stage===3?'Вернуться к разведчику':q.stage===4?'Маршрут открыт':'Доступно у Каменного Рога',
  objective:q.stage===2?'Исследовать три ориентира в Шепчущем лесу':
   q.stage===1?'Добраться до лесной стоянки':'Исследовать земли за пределами долины'};
}