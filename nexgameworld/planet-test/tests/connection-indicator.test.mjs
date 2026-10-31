import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {connectionView,createConnectionIndicator} from '../connection-indicator.js';
import {createSphericalPresence} from '../sphere-online.js';

function node(){
 return {children:[],dataset:{},hidden:false,textContent:'',className:'',
  attributes:{},listeners:{},
  setAttribute(key,value){this.attributes[key]=value},
  append(...children){this.children.push(...children)},
  replaceChildren(...children){this.children=[...children]},
  addEventListener(name,fn){this.listeners[name]=fn},
  click(){this.listeners.click?.()}
 };
}
test('connection overlay is visible and describes genuine handshake stages without fake progress percent',()=>{
 const root=node(),timers=[],actions=[],indicator=createConnectionIndicator({
  root,documentRef:{createElement:()=>node()},
  schedule:callback=>{const token={callback};timers.push(token);return token},
  unschedule:token=>{token.cancelled=true},
  onReload:()=>actions.push('reload'),onLogin:()=>actions.push('login')
 });
 try{
  indicator.setStatus('connecting');
  assert.equal(root.hidden,false);
  assert.equal(root.dataset.status,'connecting');
  const [spinner,title,stage,detail,button]=root.children[0].children;
  assert.equal(spinner.hidden,false);
  assert.match(title.textContent,/Подключение/);
  assert.match(stage.textContent,/1 из 3/);
  assert.equal(button.hidden,true);
  indicator.setStatus('authorizing');
  assert.match(stage.textContent,/2 из 3/);
  indicator.setStatus('syncing');
  assert.match(stage.textContent,/3 из 3/);
  assert.equal(timers.length,1,'one delay clock for all three stages');
  timers[0].callback();
  assert.equal(button.hidden,false,'long wait must offer a recovery action');
  assert.match(detail.textContent,/больше обычного/);
  button.click();assert.deepEqual(actions,['reload']);
  indicator.setStatus('online');
  assert.equal(root.hidden,true,'never block movement after trusted welcome');
  indicator.setStatus('reconnecting');
  assert.equal(root.hidden,false);
  assert.match(title.textContent,/Восстанавливаем связь/);
  indicator.setStatus('auth_required');
  assert.equal(spinner.hidden,true);
  assert.match(button.textContent,/выбору персонажа/);
  button.click();assert.deepEqual(actions,['reload','login']);
  indicator.setStatus('incompatible');
  button.click();assert.deepEqual(actions,['reload','login','reload']);
  indicator.destroy();assert.equal(root.hidden,true);
 }finally{indicator.destroy()}
});
test('unknown and offline statuses remain explicit instead of a motionless game',()=>{
 assert.equal(connectionView('offline').busy,false);
 assert.equal(connectionView('offline').action,'reload');
 assert.equal(connectionView('connecting').busy,true);
 assert.equal(connectionView('syncing').busy,true);
 assert.equal(connectionView('connecting',{delayed:true}).action,'reload');
});
test('authenticated WebSocket stages connect, authorize, sync and unlock movement only at trusted welcome',()=>{
 const old={WebSocket:globalThis.WebSocket,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
 const states=[];let socket,interval;
 class FakeSocket{
  static CONNECTING=0;static OPEN=1;static CLOSING=2;
  constructor(){socket=this;this.sent=[];this.readyState=1}
  send(raw){this.sent.push(JSON.parse(raw))}
  close(code=1000){this.readyState=3;this.onclose?.({code})}
 }
 globalThis.WebSocket=FakeSocket;globalThis.setInterval=fn=>{interval=fn;return 1};globalThis.clearInterval=()=>{};
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene:new THREE.Scene(),onStatus:value=>states.push(value),
   auth:{sessionToken:'session',characterId:'hero'},getPosition:()=>({
    normal:[0,0,1],radius:261,heading:0,moving:false
   })});
  assert.deepEqual(states,['connecting']);
  assert.equal(presence.connected,false);
  socket.onopen();
  assert.deepEqual(states,['connecting','authorizing']);
  assert.equal(socket.sent[0].type,'authJoin');
  assert.equal(presence.connected,false,'socket open alone never enables moving');
  socket.onmessage({data:JSON.stringify({type:'welcome',protocol:2,
   world:'nexgameworld',radius:261,id:'hero',authenticated:true,
   progress:{revision:1,level:1,positionNormal:[0,0,1],heading:0},
   players:[],onlineCount:1})});
  assert.deepEqual(states,['connecting','authorizing','syncing','online']);
  assert.equal(presence.connected,true,'movement enabled after trusted progress sync');
  interval();
  assert.ok(socket.sent.some(row=>row.type==='move'));
 }finally{presence?.close();Object.assign(globalThis,old)}
});
