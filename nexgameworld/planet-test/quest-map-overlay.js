// Draw only the player's explicitly tracked active objective. All positions
// are known spawn territories, not real-time enemy/resource detections.
export function paintTrackedQuestOnMinimap(ctx,map,scale,viewport=null){
 if(!ctx||!map||!Number.isFinite(scale)||scale<=0)return;
 // Older pinned quests render underneath the newest so sword targets stay
 // legible even if a gathering territory overlaps their spawn positions.
 for(const other of [...(map.overlays||[])].reverse())
  paintTrackedQuestOnMinimap(ctx,{...other,overlays:[]},scale,viewport);
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
  }else if(map.kind==='targets'||map.kind==='waypoint'||map.kind==='landmarks'){
   for(const point of map.points||[]){
    if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))continue;
    let x=point.x*scale,z=point.z*scale;
    const landmark=map.kind==='landmarks';
    if(landmark&&Number.isFinite(viewport?.center?.x)&&Number.isFinite(viewport?.center?.z)&&Number.isFinite(viewport?.size)){
     const cx=viewport.center.x*scale,cz=viewport.center.z*scale;
     const half=viewport.size/2-14,dx=x-cx,dz=z-cz;
     const rotation=Number.isFinite(viewport.rotation)?viewport.rotation:0;
     const screenX=dx*Math.cos(rotation)+dz*Math.sin(rotation);
     const screenZ=dx*Math.sin(rotation)-dz*Math.cos(rotation);
     if(Math.hypot(screenX,screenZ)>half){
      const factor=half/Math.hypot(screenX,screenZ);
      x=cx+dx*factor;z=cz+dz*factor;
      const angle=Math.atan2(dz,dx);
      ctx.save();ctx.translate(x,z);ctx.rotate(angle);
      ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-6);ctx.lineTo(-2,0);
      ctx.lineTo(-5,6);ctx.closePath();
      ctx.fillStyle='#ffe7a1';ctx.strokeStyle='#30291c';ctx.lineWidth=1.6;
      ctx.fill();ctx.stroke();ctx.restore();
      continue;
     }
    }
    const enemy=map.kind==='targets';
    if(landmark){
     ctx.beginPath();ctx.arc(x-2,z-2,4,0,2*Math.PI);
     ctx.fillStyle='rgba(46,38,25,.9)';ctx.fill();
     ctx.strokeStyle='#ffe7a1';ctx.lineWidth=2;ctx.stroke();
     ctx.beginPath();ctx.moveTo(x+1,z+1);ctx.lineTo(x+6,z+6);
     ctx.strokeStyle='#ffe7a1';ctx.lineWidth=2.7;ctx.stroke();
     continue;
    }
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

/** Fixed-location NPCs and the forest scout camp on the tangent minimap.
 * Places are only drawn within the minimap; quest arrows remain unambiguous.
 */
export function paintMinimapPlaces(ctx,viewport,places=[]){
 if(!ctx||!viewport||!Number.isFinite(viewport.scale)||!Number.isFinite(viewport.size))return;
 const {center,size,scale}=viewport;
 if(!Number.isFinite(center?.x)||!Number.isFinite(center?.z))return;
 const edge=size/2-12;
 ctx.save();
 try{
  for(const point of places){
   if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))continue;
   const x=(point.x-center.x)*scale,z=(point.z-center.z)*scale;
   if(Math.abs(x)>edge||Math.abs(z)>edge)continue;
   ctx.save();ctx.translate(point.x*scale,point.z*scale);
   ctx.beginPath();ctx.arc(0,0,point.kind==='camp'?7:6,0,Math.PI*2);
   ctx.fillStyle=point.kind==='camp'?'#514632':'#233e40';
   ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#f6e2aa';ctx.stroke();
   ctx.fillStyle='#ffe7b3';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.font='bold 11px system-ui,sans-serif';
   ctx.fillText(point.kind==='camp'?'⌂':'●',0,0);
   ctx.restore();
  }
 }finally{ctx.restore();}
}
