// Pure 2D geometry for walkable buildings; no renderer or browser dependency.
// Three.js Y rotation: +Z rotates toward +X.
export function localToWorld2D(lx,lz,x,z,yaw=0){
 const c=Math.cos(yaw),s=Math.sin(yaw);
 return {x:x+lx*c+lz*s,z:z-lx*s+lz*c};
}
export function worldToLocal2D(px,pz,x,z,yaw=0){
 const dx=px-x,dz=pz-z,c=Math.cos(yaw),s=Math.sin(yaw);
 return {x:dx*c-dz*s,z:dx*s+dz*c};
}
export function isInsideRect(x,z,rect,margin=0){
 const p=worldToLocal2D(x,z,rect.x,rect.z,rect.yaw||0);
 return Math.abs(p.x)<rect.w/2+margin&&Math.abs(p.z)<rect.d/2+margin;
}
// Exact circle-versus-oriented-rectangle test (no oversized corner padding).
export function circleHitsRect(x,z,r,rect){
 const p=worldToLocal2D(x,z,rect.x,rect.z,rect.yaw||0);
 const dx=Math.max(Math.abs(p.x)-rect.w/2,0);
 const dz=Math.max(Math.abs(p.z)-rect.d/2,0);
 return dx*dx+dz*dz<r*r;
}
// Five floor-level pieces leave the front door physically open.
export function buildingWallColliders({x,z,width,depth,doorWidth,wallThickness,rotation=0,height=4}){
 if(!(width>doorWidth+wallThickness*2&&depth>wallThickness*2&&doorWidth>0))throw new RangeError('Invalid walkable building dimensions');
 const hw=width/2,hd=depth/2,t=wallThickness,side=(width-doorWidth)/2;
 const at=(lx,lz,w,d)=>{
  const point=localToWorld2D(lx,lz,x,z,rotation);
  return {...point,w,d,yaw:rotation,height};
 };
 return [
  at(-hw+t/2,0,t,depth),at(hw-t/2,0,t,depth),
  at(0,-hd+t/2,width,t),
  at(-doorWidth/2-side/2,hd-t/2,side,t),
  at(doorWidth/2+side/2,hd-t/2,side,t)
 ];
}
