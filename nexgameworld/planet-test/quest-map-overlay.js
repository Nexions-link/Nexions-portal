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
  }else if(map.kind==='targets'||map.kind==='waypoint'){
   for(const point of map.points||[]){
    if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))continue;
    const x=point.x*scale,z=point.z*scale;
    const enemy=map.kind==='targets';
    ctx.beginPath();ctx.arc(x,z,enemy?9:6,0,2*Math.PI);
    ctx.fillStyle=enemy?'rgba(63,29,23,.91)':'rgba(71,64,38,.87)';ctx.fill();
    ctx.lineWidth=1.2;ctx.strokeStyle=enemy?'#e2b08b':'#f0dc9a';ctx.stroke();
    if(enemy){
     // Crossed sword icon denotes the habitat, not an active live monster.
     ctx.font='bold 19px "Apple Color Emoji","Segoe UI Symbol",sans-serif';
     ctx.textAlign='center';ctx.textBaseline='middle';
     ctx.fillStyle='#fff0cf';ctx.fillText('⚔',x,z+1);
    }else{
     // Quest-giver and exploration objectives use a neutral diamond.
     ctx.beginPath();ctx.moveTo(x,z-3);ctx.lineTo(x+3,z);
     ctx.lineTo(x,z+3);ctx.lineTo(x-3,z);ctx.closePath();
     ctx.fillStyle='#ffe0a0';ctx.fill();
    }
   }
  }
 }finally{ctx.restore();}
}
