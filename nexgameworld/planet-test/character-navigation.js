// Return to the account's character list without logging out.
// The account page uses the existing session to load saved heroes and creation slots.
export const CHARACTER_SELECTION_PATH='/nexgameworld/account.html';
export const ACTIVE_CHARACTER_KEY='ngw-selected-character';
export function goToCharacterSelection(storage,navigation,path=CHARACTER_SELECTION_PATH){
 // Only detach the currently selected hero. Never erase auth/session token.
 try{storage?.removeItem(ACTIVE_CHARACTER_KEY)}catch{}
 navigation?.assign?.(path);
 return path;
}
