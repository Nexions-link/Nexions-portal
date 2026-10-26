// Rendering-only camera aim damping. Never modifies server-owned transforms.
// Keeps the view steady when proximity/collision corrections arrive.
export const CAMERA_AIM_RATE=12;
export function settleCameraLook(target,desired,dt,{snap=false,rate=CAMERA_AIM_RATE}={}){
 if(snap)return target.copy(desired);
 const seconds=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
 const alpha=1-Math.exp(-seconds*rate);
 return target.lerp(desired,alpha);
}
