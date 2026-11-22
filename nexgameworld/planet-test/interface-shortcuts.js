// WoW's familiar panel keys, retaining NexGame's existing aliases.
// M/N keep their established mount controls; no camera/navigation rebinding.
const PANELS=Object.freeze({b:'bag',i:'bag',p:'spellbook',c:'character',
 o:'party',g:'party',l:'quests',j:'quests',n:'mounts'});
export function interfaceShortcut(event={}){
 if(event.defaultPrevented||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return null;
 const target=event.target;
 if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(target?.tagName||''))return null;
 const physical=/^Key[A-Z]$/.test(event.code||'')?event.code.slice(3).toLowerCase():null;
 return PANELS[physical||String(event.key||'').toLowerCase()]||null;
}
