// Isolated Planet Test progress reset. No other NexGame saves or graphics
// preferences must be erased when restarting the local RPG quest chains.
export const OFFLINE_RPG_SAVE_KEY='nexgame-planet-test-offline-rpg-v1';
export function clearOfflineProgress(storage,{preview=false}={}){
 if(preview||!storage||typeof storage.removeItem!=='function')return false;
 try {
  storage.removeItem(OFFLINE_RPG_SAVE_KEY);
  return true;
 }catch{return false;}
}
