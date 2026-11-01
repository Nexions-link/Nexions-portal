// Framing preset for the first login of a newly created online character.
// Camera-only: no changes to server-owned spawn coordinates or avatar heading.
// At the origin the longhouse is west (-27, -2); look slightly north of west
// so the house appears right of the hero, as in the supplied iPhone reference.
export const FIRST_SPAWN_CAMERA=Object.freeze({
 heading:2.99, pitch:0.44, zoom:27, follow:false
});

export function isFirstCharacterSpawn(profile){
 if(!profile||profile.level!==1||Number(profile.experience)!==0||
    (profile.revision!==0&&profile.revision!=='0'))return false;
 const normal=profile.positionNormal;
 return Array.isArray(normal)&&normal.length===3&&
   normal.every(Number.isFinite)&&
   Math.abs(normal[0])<1e-6&&Math.abs(normal[1])<1e-6&&
   Math.abs(normal[2]-1)<1e-6;
}
