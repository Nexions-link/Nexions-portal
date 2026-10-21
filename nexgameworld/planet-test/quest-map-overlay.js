// Draw only the player's explicitly tracked active objective. All positions
// are known spawn territories, not real-time enemy/resource detections.
export function paintTrackedQuestOnMinimap(ctx,map,scale){
 if(!ctx||!map||!Number.isFinite(scale)||scale<=0)return;
 ctx.save();
 try{
  if(map.kind==='area'){
   const center=map.center;
   if(!Number.isFinite(center?.x)||!Number.isFinite(center?.z))return;
   const rx=Math.max(0,map.radiusX)*scale,rz=Math.max(0,map.radiusZ)*scale;
   ctx.beginPath();
   ctx.ellipse(center.x*scale,center.z*scale,rx,rz,0,0,2*Math.PI);
   ctx.fillStyle='rgba(221,192,111,.19)';ctx.fill();
   ctx.strokeStyle='rgba(255,222,153,.91)';ctx.lineWidth=2;
   ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);
   // A small centre symbol indicates that the highlighted outline is searchable.
   ctx.strokeStyle='#fff0bf';ctx.lineWidth=2;ctx.beginPath();
   ctx.moveTo(center.x*scale-3,center.z*scale);ctx.lineTo(center.x*scale+3,center.z*scale);
   ctx.moveTo(center.x*scale,center.z*scale-3);ctx.lineTo(center.x*scale,center.z*scale+3);
   ctx.stroke();
  }else if(map.kind==='targets'){
   for(const point of map.points||[]){
    if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))continue;
    const x=point.x*scale,z=point.z*scale;
    ctx.beginPath();ctx.arc(x,z,4,0,2*Math.PI);
    ctx.fillStyle='#c3523b';ctx.fill();
    ctx.lineWidth=1.4;ctx.strokeStyle='#ffedc2';ctx.stroke();
    // Static spawn location: a compact marker, not a live target indication.
    ctx.beginPath();ctx.moveTo(x-2,z-2);ctx.lineTo(x+2,z+2);
    ctx.moveTo(x+2,z-2);ctx.lineTo(x-2,z+2);
    ctx.lineWidth=1;ctx.strokeStyle='#fff2da';ctx.stroke();
   }
  }
 }finally{ctx.restore();}
}
