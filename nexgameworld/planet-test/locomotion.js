// Cosmetic locomotion only. Never modifies world position, collision or combat.
export const STRIDE_METRES=1.55/.58; // Distance travelled during the stance portion of one gait cycle.
const TAU=Math.PI*2;
const finite=Number.isFinite;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

export function advanceStridePhase(phase,metres){
 const initial=finite(phase)?((phase%TAU)+TAU)%TAU:0;
 if(!finite(metres)||metres<=0)return initial;
 // A teleport/correction must not spin the character's feet multiple times.
 return (initial+Math.min(metres,STRIDE_METRES)*TAU/STRIDE_METRES)%TAU;
}

export function movementStrength(metres,dt,walkSpeed){
 if(!finite(metres)||!finite(dt)||!finite(walkSpeed)||dt<=0||walkSpeed<=0)return 0;
 return clamp(metres/(dt*walkSpeed),0,1);
}

export function turnStrength(previousHeading,nextHeading,dt){
 if(!finite(previousHeading)||!finite(nextHeading)||!finite(dt)||dt<=0)return 0;
 const difference=Math.atan2(Math.sin(nextHeading-previousHeading),Math.cos(nextHeading-previousHeading));
 return clamp(difference/(dt*5),-1,1);
}
