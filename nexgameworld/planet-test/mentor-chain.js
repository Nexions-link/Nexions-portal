// PT 0.5.0 — isolated port of original NexGame Narache mentor quest chain.
// Numbers, texts, rewards and conditions match the main game's quest states 0..12.
export const BOSS_POSITION={x:39,z:47};
export const SCOUT_POSITION={x:12,z:37};
export const RELIC_POSITION={x:35,z:-11.8};
export const BOSS_GUIDE_POINTS=[[0,9],[1,24],[12,37],[32,43],[BOSS_POSITION.x,BOSS_POSITION.z]];
export const QUEST_LINES=[
 ['Первые шаги','Поговорите с наставником у большого тотема.'],
 ['Обряд силы','Победите трёх обычных долгоногов.'],
 ['Обряд силы','Вернитесь к наставнику за наградой.'],
 ['Голос предков','Поговорите с наставником.'],
 ['Голос предков','Найдите перо возле восточного тотема.'],
 ['Голос предков','Отнесите перо наставнику.'],
 ['Следы исполина','Поговорите с наставником, чтобы начать разведку.'],
 ['Следы исполина','Разведайте дальнее пастбище по юго-восточной тропе.'],
 ['Следы исполина','Разведка завершена. Вернитесь к наставнику.'],
 ['Грозоклюв, вожак стада','Поговорите с наставником о финальной охоте.'],
 ['Грозоклюв, вожак стада','Следуйте по красному пунктиру и победите Грозоклюва.'],
 ['Грозоклюв, вожак стада','Грозоклюв повержен! Вернитесь к наставнику.'],
 ['Все испытания пройдены','Вы завершили цепочку из пяти заданий.']
];
export const QUEST_JOURNAL=[
 {title:'Первые шаги',description:'Познакомься с наставником Каменный Рог у большого тотема лагеря Нараче.',objective:'Поговорить с наставником.',reward:''},
 {title:'Обряд силы',description:'Докажи, что готов защищать родные равнины.',objective:'Победить трёх равнинных долгоногов.',reward:'25 монет · 80 опыта'},
 {title:'Голос предков',description:'У древнего тотема на востоке лежит перо предков.',objective:'Найти перо и принести наставнику.',reward:'40 монет · 110 опыта'},
 {title:'Следы исполина',description:'На дальних пастбищах замечены огромные птичьи следы.',objective:'Разведать дальний участок юго-восточной тропы.',reward:'50 монет · 95 опыта'},
 {title:'Грозоклюв, вожак стада',description:'Громадный долгоног угрожает пастбищам.',objective:'Победить Грозоклюва и вернуться.',reward:'90 монет · 190 опыта'}
];
export function migrateMentorQuest(oldQuest){
 if(Number.isInteger(oldQuest)&&oldQuest>=0&&oldQuest<=12)return oldQuest;
 // PT 0.4.0 used a single 3-kill quest. Keep active and turn-in progress.
 // Completed legacy trial starts after that trial, not at an invented final quest.
 return ({available:0,active:1,ready:2,completed:3})[oldQuest]??0;
}
export function mentorGlyph(q){
 if(q===12)return '';
 if([0,3,6,9].includes(q))return '!';
 if([2,5,8,11].includes(q))return '?';
 return '·';
}
export function mentorChainNumber(q){
 return q===12?5:q===0?1:q<=2?2:q<=5?3:q<=8?4:5;
}
export function mentorJournalRows(state){
 const q=state.quest,result=[],completeAt=[1,3,6,9,12],offeredAt=[0,-1,3,6,9],
 startedAt=[-1,1,4,7,10];
 for(let i=0;i<QUEST_JOURNAL.length;i++){
  const status=q>=completeAt[i]?'completed':q===offeredAt[i]?'available':
   startedAt[i]>=0&&q>=startedAt[i]&&q<completeAt[i]?'current':null;
  if(!status)continue;
  let progress=status==='completed'?'Завершено и сдано наставнику.':
   status==='available'?'Доступно у наставника.':'Выполняется.';
  if(status==='current'){
   if(i===1)progress=q===2?'3 / 3 · Можно сдавать.':'Долгоноги: '+state.kills+' / 3';
   if(i===2)progress=q===5?'Перо найдено · Вернись к наставнику.':'Перо: 0 / 1';
   if(i===3)progress=q===8?'Разведка завершена · Вернись в лагерь.':'Дойди до развилки (12, 37)';
   if(i===4)progress=q===11?'Грозоклюв повержен · Вернись к наставнику.':'Грозоклюв: 0 / 1';
  }
  result.push({id:i,chain:'Испытания Нараче',status,progress,...QUEST_JOURNAL[i]});
 }
 return result;
}
export function createMentorChain({state,persist,levelCheck,closeWindow,draw,msg}){
 const setQuest=(q)=>{state.quest=q;persist();closeWindow();draw();};
 const award=(q,gold,xp,message)=>{
  state.gold+=gold;state.xp+=xp;state.quest=q;
  levelCheck();persist();closeWindow();draw();msg(message);
 };
 const option=(name,cb)=>[[name,cb]];
 function render(line){
  const q=state.quest;
  if(q===0)line('Первые шаги','Приветствую тебя, молодой воин. Это первое из пяти испытаний. Победи трёх долгоногов на дороге.',
   option('Принять: Обряд силы (2/5)',()=>{state.kills=0;setQuest(1)}));
  else if(q===1)line('Обряд силы','Победи трёх обычных долгоногов. Прогресс: '+state.kills+' / 3');
  else if(q===2)line('Обряд силы завершён','Ты доказал силу. Впереди испытание уважения к предкам.',
   option('Получить 25 монет и 80 опыта',()=>award(3,25,80,'Обряд силы пройден — 2/5')));
  else if(q===3)line('Голос предков','Найди сияющее перо у древнего тотема на востоке, координаты (35, -11,8).',
   option('Принять: Голос предков (3/5)',()=>setQuest(4)));
  else if(q===4)line('Голос предков','Иди к восточному тотему и нажми «Взять перо» возле сияющего предмета.');
  else if(q===5)line('Земля помнит','Ты сохранил память предков. Теперь на пастбищах замечены огромные следы.',
   option('Отдать перо: 40 монет и 110 опыта',()=>award(6,40,110,'Голос предков завершён — 3/5')));
  else if(q===6)line('Следы исполина','Найди каменную развилку на дальнем юго-восточном пастбище (12, 37).',
   option('Принять: Следы исполина (4/5)',()=>setQuest(7)));
  else if(q===7)line('Следы исполина','Следуй по юго-восточной дороге, доберись до каменной развилки и возвращайся.');
  else if(q===8)line('Донесение разведчика','Местоположение огромной птицы теперь известно.',
   option('Получить 50 монет и 95 опыта',()=>award(9,50,95,'Следы исполина завершены — 4/5')));
  else if(q===9)line('Грозоклюв: вожак стада','На дальнем пастбище появился гигантский долгоног (108 HP). Красный пунктир приведёт к нему.',
   option('Принять: Победить Грозоклюва (5/5)',()=>setQuest(10)));
  else if(q===10)line('Грозоклюв: вожак стада','Следуй по красному пунктиру по юго-восточной дороге и победи исполина (108 HP).');
  else if(q===11)line('Испытания завершены','Грозоклюв повержен. Ты защитил лагерь Нараче!',
   option('Получить 90 монет и 190 опыта',()=>award(12,90,190,'Все пять испытаний завершены!')));
  else line('Хранитель Мулгора','Все пять испытаний пройдены. Продолжай путешествие и изучение мира!');
 }
 return {
  render,
  killed(mob){
   if(mob.boss&&state.quest===10){state.quest=11;persist();msg('Грозоклюв повержен! Вернись к наставнику.');return;}
   if(!mob.boss&&state.quest===1){
    state.kills=Math.min(3,state.kills+1);
    if(state.kills===3){state.quest=2;msg('Обряд силы завершён · вернись к наставнику');}
    persist();
   }
  },
  pickedRelic(){
   if(state.quest!==4)return false;
   state.quest=5;persist();msg('Перо предков найдено · вернись к наставнику');draw();return true;
  },
  discoveredScout(){
   if(state.quest!==7)return false;
   state.quest=8;persist();msg('Дальний участок разведан · вернись к наставнику');draw();return true;
  }
 };
}
