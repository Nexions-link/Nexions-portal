// Cosmetic proximity cues for quest resources in NexGameWorld PT.
// Works from spherical surface distance; never affects gather ranges or quest state.
export const RESOURCE_VISUAL_COLORS=Object.freeze({
  1:Object.freeze({rim:0xd5bf79,glint:0xffe7a4}), // meadow flowers
  2:Object.freeze({rim:0xb9bf73,glint:0xf0e9a9}), // sunny roots
  3:Object.freeze({rim:0xb8a5df,glint:0xe3d9ff})  // moon mushrooms
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function resourceProximityCue(distance,detail=.68){
 const d=Number(distance);
 const q=Number.isFinite(detail)?clamp(detail,0,1):.68;
 if(!Number.isFinite(d)||d>=14)return {ringOpacity:0,glintCount:0,sparkScale:0,sparkVisible:false};
 const near=clamp((9-Math.max(0,d))/9,0,1);
 const ringOpacity=near>0 ? (.04+.22*near*near) : 0;
 return {
  ringOpacity,
  glintCount:d<=8&&q>=.30?(q>=.85?2:1):0,
  sparkScale:(d<=10 ? .85+.32*clamp((10-d)/10,0,1):.75),
  sparkVisible:q>=.25&&d<=12
 };
}
