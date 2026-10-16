// Pure camera-relative left-stick controls. Independent of browser and Three.js.
export const STICK_DEADZONE=.12;
export function screenMoveVector(x,y,cameraYaw,deadzone=STICK_DEADZONE){
 const length=Math.hypot(x,y);
 if(!Number.isFinite(length)||!Number.isFinite(cameraYaw)||length<=deadzone)return {x:0,z:0,strength:0,heading:null};
 const strength=Math.min(1,(Math.min(length,1)-deadzone)/(1-deadzone));
 const right=x/length,forward=-y/length;
 const dx=Math.cos(cameraYaw)*right-Math.sin(cameraYaw)*forward;
 const dz=-Math.sin(cameraYaw)*right-Math.cos(cameraYaw)*forward;
 return {x:dx,z:dz,strength,heading:Math.atan2(dx,dz)};
}
export function turnTowardsAngle(current,target,dt,rate=12){
 if(!Number.isFinite(target)||dt<=0)return current;
 const diff=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+diff*(1-Math.exp(-rate*dt));
}

/**
 * Automatic behind-the-hero camera orbit must not compete with camera-relative
 * joystick steering. Keep the orbit fixed while the player is moving or
 * explicitly looking around; recenter smoothly once controls are released.
 * Disabled follow mode always returns its input angle unchanged.
 */
export function followCameraYaw(cameraYaw,heroYaw,dt,{enabled=false,manual=false,orbiting=false,cooldown=0}={}){
 if(!enabled||manual||orbiting||cooldown>0||dt<=0)return cameraYaw;
 const target=heroYaw+Math.PI;
 const result=turnTowardsAngle(cameraYaw,target,dt,3.8);
 return Math.atan2(Math.sin(result),Math.cos(result));
}
