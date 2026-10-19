// Physical desktop keyboard input is isolated from iPhone pointer/joystick controls.
// KeyboardEvent.code keeps WASD working with Cyrillic and other OS layouts.
const DIRECTIONS = new Map([
 ['KeyW','up'], ['ArrowUp','up'],
 ['KeyS','down'], ['ArrowDown','down'],
 ['KeyA','left'], ['ArrowLeft','left'],
 ['KeyD','right'], ['ArrowRight','right']
]);
const FALLBACK = new Map([
 ['w','KeyW'], ['s','KeyS'], ['a','KeyA'], ['d','KeyD'],
 ['arrowup','ArrowUp'], ['arrowdown','ArrowDown'],
 ['arrowleft','ArrowLeft'], ['arrowright','ArrowRight']
]);
const getCode = event => DIRECTIONS.has(event.code)
 ? event.code : FALLBACK.get(String(event.key||'').toLowerCase())||null;

export function isEditableTarget(target) {
 if(!target)return false;
 if(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName||''))return true;
 return !!target.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]');
}

export function createKeyboardMovement(win,doc,{isGameActive=()=>true}={}) {
 const down=new Set();
 const clear=()=>down.clear();
 const active=()=>!doc.hidden&&isGameActive();
 win.addEventListener('keydown',event=>{
  const code=getCode(event);
  if(!code)return;
  // Never intercept browser shortcuts, account login, in-game chat or modals.
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  if(!active()||isEditableTarget(event.target)||isEditableTarget(doc.activeElement)){
   clear();return;
  }
  event.preventDefault();
  down.add(code);
 });
 win.addEventListener('keyup',event=>{
  const code=getCode(event);
  if(code&&down.delete(code)&&active())event.preventDefault();
 });
 win.addEventListener('blur',clear);
 win.addEventListener('pagehide',clear);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear()});
 doc.addEventListener('focusin',event=>{if(isEditableTarget(event.target))clear()});
 const held=direction=>[...down].some(code=>DIRECTIONS.get(code)===direction);
 return {
  read(){
   if(!active()){clear();return {x:0,y:0};}
   // Match the existing joystick coordinate system: up = negative Y.
   return {x:Number(held('right'))-Number(held('left')),
    y:Number(held('down'))-Number(held('up'))};
  },
  clear
 };
}
