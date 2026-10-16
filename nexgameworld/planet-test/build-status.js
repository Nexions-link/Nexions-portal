// Version display for the isolated spherical NexGame prototype.
// The BUILD version is embedded in the HTML that loaded the running game.
// The latest release is read independently from version.json with cache bypass.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root=$('planetBuildWidget');
  if(!root)return;
  const running=root.dataset.build;
  const trigger=$('planetVersionBadge');
  const panel=$('planetBuildPanel');
  const loadedText=$('planetBuildLoaded');
  const publishedText=$('planetBuildPublished');
  const notes=$('planetBuildNotes');
  const refresh=$('planetBuildRefresh');
  const checkButton=$('planetBuildCheck');
  const newTag=$('planetBuildNew');
  const live=$('planetBuildLive');
  const statusLine=$('planetBuildStatusLine');
  let checking=false, lastPublished=null;
  loadedText.textContent='Запущена: PT '+running;
  function parseVersion(value){
    return String(value||'').split('.').map(n=>parseInt(n,10)||0);
  }
  function compareVersions(a,b){
    const aa=parseVersion(a),bb=parseVersion(b);
    for(let i=0;i<Math.max(aa.length,bb.length);i++){
      if((aa[i]||0)!==(bb[i]||0))return Math.sign((aa[i]||0)-(bb[i]||0));
    }
    return 0;
  }
  function renderNotes(release){
    notes.replaceChildren();
    const entries=Array.isArray(release?.changes)?release.changes:[];
    for(const entry of entries.slice(0,8)){
      const li=document.createElement('li');
      li.textContent=String(entry);
      notes.append(li);
    }
  }
  function setAvailable(latest){
    newTag.hidden=false;
    newTag.textContent='Есть PT '+latest;
    refresh.hidden=false;
    refresh.textContent='Обновить игру до PT '+latest;
    publishedText.textContent='На сайте: PT '+latest;
    statusLine.textContent='В этой вкладке старая версия. Обнови страницу после завершения публикации.';
    live.textContent='Доступна новая версия PT '+latest;
    root.classList.add('planet-update-ready');
  }
  function setCurrent(release){
    newTag.hidden=true;
    refresh.hidden=true;
    root.classList.remove('planet-update-ready');
    publishedText.textContent='На сайте: PT '+release.version;
    statusLine.textContent='Актуальная опубликованная сборка загружена.';
    live.textContent='Сборка PT '+running+' актуальна.';
  }
  async function check(){
    if(checking)return;
    checking=true;
    checkButton.disabled=true;
    publishedText.textContent='Проверяем версию на сайте…';
    try {
      // A unique GET bypasses stale Safari and edge-cache entries, while the
      // visible page URL stays /Nexgame/planet-test/ with no version query.
      const response=await fetch('./version.json?_='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const release=await response.json();
      if(typeof release.version!=='string'||!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(release.version))throw new Error('Некорректная версия');
      lastPublished=release;
      renderNotes(release);
      const relation=compareVersions(release.version,running);
      if(relation>0)setAvailable(release.version);
      else if(relation===0)setCurrent(release);
      else {
        newTag.hidden=true;refresh.hidden=true;root.classList.remove('planet-update-ready');
        publishedText.textContent='На сайте: PT '+release.version;
        statusLine.textContent='Данные публикации ещё обновляются. Проверка будет повторена.';
      }
    } catch(error) {
      publishedText.textContent='Не удалось проверить опубликованную версию.';
      statusLine.textContent='Попробуй ещё раз при наличии подключения.';
      console.warn('Planet Test version check:',error);
    } finally {
      checking=false;checkButton.disabled=false;
    }
  }
  trigger.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    trigger.setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden)void check();
  });
  $('planetBuildClose').addEventListener('click',()=>{
    panel.hidden=true;trigger.setAttribute('aria-expanded','false');
  });
  checkButton.addEventListener('click',()=>void check());
  refresh.addEventListener('click',()=>window.location.reload());
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!panel.hidden){
      panel.hidden=true;trigger.setAttribute('aria-expanded','false');
    }
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)void check();
  });
  window.addEventListener('pageshow',()=>void check());
  window.setInterval(()=>{if(!document.hidden)void check();},60000);
  void check();
})();
