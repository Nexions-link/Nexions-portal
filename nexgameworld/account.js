const API='https://nexgame-world.onrender.com/api/ngw';
const $=id=>document.getElementById(id);
const views=['login','register','recoveryCodes','recover','characters'];
let token=sessionStorage.getItem('ngw-alpha-session')||'',codes=[];
let pendingDelete=null;
const deleteDialog=$('deleteDialog');
function openDeleteDialog(character){
 pendingDelete={id:character.id,nickname:character.nickname};
 $('deleteHeroName').textContent=character.nickname;
 $('deleteConfirmName').value='';
 $('confirmDelete').disabled=true;
 $('cancelDelete').disabled=false;
 $('deleteError').textContent='';
 $('deleteError').hidden=true;
 deleteDialog.showModal();
 $('deleteConfirmName').focus();
}
function closeDeleteDialog(){
 if(deleteDialog.open)deleteDialog.close();
 pendingDelete=null;
}
$('cancelDelete').addEventListener('click',closeDeleteDialog);
deleteDialog.addEventListener('close',()=>{pendingDelete=null;});
$('deleteConfirmName').addEventListener('input',()=>{
 $('confirmDelete').disabled=!pendingDelete||$('deleteConfirmName').value!==pendingDelete.nickname;
});
$('deleteHeroForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const target=pendingDelete;
 if(!target||$('deleteConfirmName').value!==target.nickname)return;
 const action=$('confirmDelete');
 action.disabled=true;$('cancelDelete').disabled=true;
 try{
  await api('/characters/'+encodeURIComponent(target.id),{
   method:'DELETE',body:{confirmNickname:target.nickname},authorized:true
  });
  closeDeleteDialog();
  await loadCharacters();
  feedback('Персонаж «'+target.nickname+'» удалён. Слот для нового героя свободен.');
 }catch(error){
  $('deleteError').textContent=error.message||'Не удалось удалить персонажа';
  $('deleteError').hidden=false;
 }finally{
  $('cancelDelete').disabled=false;
  $('confirmDelete').disabled=!pendingDelete||
   $('deleteConfirmName').value!==pendingDelete.nickname;
 }
});

function show(view){maskPasswords();for(const id of views)$(id).hidden=id!==view;feedback('');}
function feedback(text,error=false){$('feedback').hidden=!text;$('feedback').textContent=text;$('feedback').dataset.error=String(error);}
function maskPasswords(){for(const field of document.querySelectorAll('.password-control input'))field.type='password';for(const toggle of document.querySelectorAll('.toggle-password')){toggle.textContent='Показать';toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Показать пароль')}}
function clearPasswords(){for(const el of document.querySelectorAll('.password-control input'))el.value='';maskPasswords();}
async function api(path,{method='GET',body=null,authorized=false}={}){
 const headers={'Accept':'application/json'};
 if(body!==null)headers['Content-Type']='application/json';
 if(authorized&&token)headers.Authorization='Bearer '+token;
 const response=await fetch(API+path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:'no-store'});
 let data;try{data=await response.json()}catch{data={error:'Ответ сервера недоступен'}}
 if(!response.ok)throw Error(data.error||'Ошибка запроса');
 return data;
}
async function submit(event,action){
 event.preventDefault();
 const button=event.currentTarget.querySelector('button[type=submit]');
 if(button)button.disabled=true;
 try{await action(new FormData(event.currentTarget));}
 catch(error){feedback(error.message||'Не удалось подключиться к серверу',true)}
 finally{if(button)button.disabled=false;clearPasswords()}
}
document.querySelectorAll('.toggle-password').forEach(button=>button.addEventListener('click',()=>{
 const field=$(button.dataset.showPassword);
 if(!field)return;
 const visible=field.type==='password';
 field.type=visible?'text':'password';
 button.textContent=visible?'Скрыть':'Показать';
 button.setAttribute('aria-label',visible?'Скрыть пароль':'Показать пароль');
 button.setAttribute('aria-pressed',String(visible));
}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
$('registerForm').addEventListener('submit',event=>submit(event,async form=>{
 const username=String(form.get('username')),password=String(form.get('password'));
 if(password!==$('registerPass2').value)throw Error('Пароли не совпадают');
 const result=await api('/register',{method:'POST',body:{username,password}});
 codes=result.recoveryCodes||[];
 $('codes').replaceChildren(...codes.map(code=>{const li=document.createElement('li');li.textContent=code;return li}));
 $('codesSaved').checked=false;$('codesContinue').disabled=true;
 show('recoveryCodes');
}));
$('copyCodes').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(codes.join('\n'));feedback('Коды скопированы. Сохраните их в надёжном месте.')}catch{feedback('Скопируйте коды вручную.',true)}});
$('codesSaved').addEventListener('change',()=>{$('codesContinue').disabled=!$('codesSaved').checked});
$('codesContinue').addEventListener('click',()=>{codes=[];$('codes').replaceChildren();show('login');feedback('Аккаунт создан. Теперь войдите.')});
$('loginForm').addEventListener('submit',event=>submit(event,async form=>{
 const data=await api('/login',{method:'POST',body:{username:String(form.get('username')),password:String(form.get('password'))}});
 token=data.token;sessionStorage.setItem('ngw-alpha-session',token);
 $('accountName').textContent=data.account.username;await loadCharacters();show('characters');
}));
$('recoverForm').addEventListener('submit',event=>submit(event,async form=>{
 await api('/recover',{method:'POST',body:{username:String(form.get('username')),recoveryCode:String(form.get('recoveryCode')).trim(),newPassword:String(form.get('newPassword'))}});
 show('login');feedback('Пароль изменён. Войдите с новым паролем.');
}));
async function loadCharacters(){
 const data=await api('/characters',{authorized:true});
 const container=$('characterList');container.replaceChildren();
 for(const character of data.characters||[]){
  const card=document.createElement('div');card.className='hero';
  const desc=document.createElement('div');
  const title=document.createElement('strong');title.textContent=character.nickname;
  const detail=document.createElement('p');detail.className='hint';detail.textContent='Воин · уровень '+character.level;
  desc.append(title,detail);
  const button=document.createElement('button');button.type='button';button.textContent='Выбрать';
  button.addEventListener('click',()=>{
   // Never add the session token to the URL. The same-origin game iframe
   // reads it from sessionStorage and the server rechecks hero ownership.
   sessionStorage.setItem('ngw-selected-character',character.id);
   location.assign('/nexgameworld/?account-play=1');
  });
  const remove=document.createElement('button');
  remove.type='button';remove.className='delete-hero';remove.textContent='Удалить';
  remove.setAttribute('aria-label','Удалить персонажа '+character.nickname);
  remove.addEventListener('click',()=>openDeleteDialog(character));
  const actions=document.createElement('div');actions.className='hero-actions';
  actions.append(button,remove);
  card.append(desc,actions);container.append(card);
 }
 $('characterForm').hidden=(data.characters||[]).length>=data.slots;
}
$('characterForm').addEventListener('submit',event=>submit(event,async form=>{
 await api('/characters',{method:'POST',authorized:true,body:{nickname:String(form.get('nickname'))}});
 $('heroName').value='';await loadCharacters();
}));
$('openPasswordChange').addEventListener('click',()=>{
 $('passwordChangeForm').hidden=false;
 $('openPasswordChange').hidden=true;
 $('currentAccountPassword').focus();
});
$('cancelPasswordChange').addEventListener('click',()=>{
 $('passwordChangeForm').reset();
 $('passwordChangeForm').hidden=true;
 $('openPasswordChange').hidden=false;
 maskPasswords();
});
$('passwordChangeForm').addEventListener('submit',event=>submit(event,async form=>{
 const currentPassword=String(form.get('currentPassword'));
 const newPassword=String(form.get('newPassword'));
 if(newPassword!==$('repeatAccountPassword').value)
  throw Error('Новые пароли не совпадают');
 await api('/password',{method:'POST',authorized:true,body:{currentPassword,newPassword}});
 token='';sessionStorage.removeItem('ngw-alpha-session');
 $('passwordChangeForm').reset();
 $('passwordChangeForm').hidden=true;
 $('openPasswordChange').hidden=false;
 show('login');
 feedback('Пароль изменён. Все предыдущие сессии завершены. Войдите с новым паролем.');
}));
$('logout').addEventListener('click',async()=>{
 try{await api('/logout',{method:'POST',body:{},authorized:true})}catch{}
 token='';sessionStorage.removeItem('ngw-alpha-session');sessionStorage.removeItem('ngw-selected-character');show('login');
});
if(token){api('/me',{authorized:true}).then(data=>{
 $('accountName').textContent=data.username;return loadCharacters();
}).then(()=>show('characters')).catch(()=>{token='';sessionStorage.removeItem('ngw-alpha-session');show('login')})}
