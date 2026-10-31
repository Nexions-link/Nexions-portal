// Same-origin alpha account launch. Session tokens remain in sessionStorage,
// never in URLs, query strings, referrers or published HTML.
const SESSION_KEY='ngw-alpha-session',CHARACTER_KEY='ngw-selected-character';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
export const ACCOUNT_API='https://api.nexions.ru/api/ngw';
export const AUTH_WORLD_URL='wss://api.nexions.ru/ws/nexgameworld/auth';
export function getAccountLaunch(storage){
 try{
  const sessionToken=storage.getItem(SESSION_KEY);
  const characterId=storage.getItem(CHARACTER_KEY);
  if(!TOKEN.test(sessionToken||'')||!UUID.test(characterId||''))return null;
  return {sessionToken,characterId};
 }catch{return null}
}
export function getAuthenticatedProfile(data){
 const row=data?.character;
 if(!row||typeof row.id!=='string'||!UUID.test(row.id)||
    typeof row.nickname!=='string'||row.nickname.length>24||
    ![87,174,261].includes(row.worldRadius)||
    !Array.isArray(row.positionNormal)||row.positionNormal.length!==3||
    !row.positionNormal.every(v=>typeof v==='number'&&Number.isFinite(v))||
    Math.abs(Math.hypot(...row.positionNormal)-1)>.01||
    typeof row.heading!=='number'||!Number.isFinite(row.heading)||
    !Number.isInteger(row.level)||row.level<1||row.level>60)
  throw Error('Данные персонажа недоступны или повреждены');
 return row;
}
export async function fetchAuthenticatedProfile({sessionToken,characterId},fetcher=fetch){
 const response=await fetcher(ACCOUNT_API+'/characters/'+characterId,{
  method:'GET',mode:'cors',cache:'no-store',
  headers:{Authorization:'Bearer '+sessionToken}
 });
 if(!response.ok)throw Error(response.status===401||response.status===404?
  'Сессия завершена или персонаж удалён. Войдите снова.':
  'Сервер персонажей временно недоступен ('+response.status+')');
 const character=getAuthenticatedProfile(await response.json());
 if(character.id.toLowerCase()!==characterId.toLowerCase())
  throw Error('Сервер вернул другого персонажа');
 return character;
}
