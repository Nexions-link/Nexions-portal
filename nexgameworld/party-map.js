// NexGame Alpha 0.3.5.27 — pure minimap projection for remote party members.
// Coordinates are world x/z; return relative minimap x/y in pixels.
export function projectPartyMember(memberX,memberZ,playerX,playerZ,scale=4.1,radius=105){
 if(![memberX,memberZ,playerX,playerZ,scale,radius].every(Number.isFinite)||
  scale<=0||radius<=0)return null;
 const dx=(memberX-playerX)*scale,dy=(memberZ-playerZ)*scale;
 const distance=Math.hypot(dx,dy);
 const edge=distance>radius;
 const factor=edge?radius/distance:1;
 return {x:dx*factor,y:dy*factor,edge};
}
