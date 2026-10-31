// Visible, accessible online handshake indicator. No simulated percentages:
 // each stage comes from the authoritative WebSocket connection lifecycle.
export function connectionView(status,{delayed=false}={}){
 const states={
  connecting:{title:'Подключение к серверу',detail:'Устанавливаем соединение с игровым миром…',stage:'Соединение · шаг 1 из 3',busy:true},
  authorizing:{title:'Проверяем вход',detail:'Сервер получил запрос. Проверяем игровую сессию…',stage:'Авторизация · шаг 2 из 3',busy:true},
  syncing:{title:'Загружаем персонажа',detail:'Сверяем сохранение, координаты и состояние персонажа…',stage:'Синхронизация · шаг 3 из 3',busy:true},
  reconnecting:{title:'Восстанавливаем связь',detail:'Соединение прервалось. Движение временно недоступно, выполняется повторное подключение.',stage:'Переподключение к серверу',busy:true},
  offline:{title:'Сервер недоступен',detail:'Не удалось подключиться к игровому миру. Проверьте интернет и повторите попытку.',stage:'Соединение не установлено',busy:false,action:'reload',actionLabel:'Перезагрузить игру'},
  auth_required:{title:'Требуется повторный вход',detail:'Игровая сессия завершилась. Войдите в аккаунт и выберите персонажа.',stage:'Авторизация отклонена',busy:false,action:'login',actionLabel:'К выбору персонажа'},
  incompatible:{title:'Версии не совпадают',detail:'Версия игры отличается от версии сервера. Обновите страницу для загрузки актуальной сборки.',stage:'Необходима новая версия',busy:false,action:'reload',actionLabel:'Перезагрузить игру'}
 };
 const base=states[status]||states.offline;
 if(delayed&&base.busy)return {...base,
  detail:'Подключение занимает больше обычного. Сервер может отвечать медленно. Можно подождать или перезагрузить игру.',
  action:'reload',actionLabel:'Перезагрузить игру'};
 return base;
}
export function createConnectionIndicator({root,documentRef=globalThis.document,delayMs=12000,
 schedule=(callback,ms)=>setTimeout(callback,ms),unschedule=handle=>clearTimeout(handle),
 onReload=()=>globalThis.location?.reload?.(),
 onLogin=()=>globalThis.location?.assign?.('/nexgameworld/account.html')}={}){
 if(!root)return {setStatus(){},destroy(){}};
 const panel=documentRef.createElement('div');panel.className='ngw-connection-panel';
 const spinner=documentRef.createElement('div');spinner.className='ngw-connection-spinner';
 spinner.setAttribute('aria-hidden','true');
 const title=documentRef.createElement('strong');title.className='ngw-connection-title';
 const detail=documentRef.createElement('p');detail.className='ngw-connection-detail';
 const stage=documentRef.createElement('small');stage.className='ngw-connection-stage';
 const action=documentRef.createElement('button');action.className='ngw-connection-action';
 action.type='button';
 panel.append(spinner,title,stage,detail,action);
 root.replaceChildren(panel);
 let current='offline',timer=null,delayed=false,destroyed=false;
 const cancelTimer=()=>{if(timer!==null){unschedule(timer);timer=null}};
 function render(){
  if(destroyed)return;
  const view=connectionView(current,{delayed});
  root.dataset.status=current;
  root.hidden=current==='online';
  if(root.hidden)return;
  title.textContent=view.title;stage.textContent=view.stage;detail.textContent=view.detail;
  spinner.hidden=!view.busy;
  action.hidden=!view.action;
  action.textContent=view.actionLabel||'';
  action.dataset.action=view.action||'';
 }
 action.addEventListener('click',()=>{
  if(action.dataset.action==='login')onLogin();
  else if(action.dataset.action==='reload')onReload();
 });
 function setStatus(status){
  if(destroyed)return;
  const wasOnline=current==='online';
  current=status;
  if(status==='online'){
   cancelTimer();delayed=false;render();return;
  }
  if(wasOnline){cancelTimer();delayed=false}
  if(['connecting','authorizing','syncing','reconnecting'].includes(status)&&timer===null&&!delayed){
   timer=schedule(()=>{timer=null;delayed=true;render()},delayMs);
  }else if(!['connecting','authorizing','syncing','reconnecting'].includes(status)){
   cancelTimer();delayed=false;
  }
  render();
 }
 root.hidden=true;current='online';
 return {setStatus,destroy(){destroyed=true;cancelTimer();root.hidden=true;root.replaceChildren()}};
}
