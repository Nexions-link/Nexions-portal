// NGW-ART-REMASTER-001 / G-05
// Sample the ACTUAL coarse triangulated globe directly under the high-detail
// meadow tile, rather than an ideal analytic sphere. No colliders or camera edits.
export const SEAM_INNER_RADIUS=82;
export const SEAM_ALPHA_START=83.6;
export const SEAM_ALPHA_END=89.1;
export const SEAM_MESH_EXTENT=92;
export const SEAM_MESH_GRID=136;
const clamp=v=>Math.max(0,Math.min(1,v));
export const seamEase=(a,b,x)=>{
 const t=clamp((x-a)/(b-a));return t*t*(3-2*t);
};
export const seamAlpha=distance=>1-seamEase(SEAM_ALPHA_START,SEAM_ALPHA_END,distance);
export const seamRadius=(physicsRadius,globeRadius,distance)=>{
 if(!Number.isFinite(physicsRadius)||!Number.isFinite(distance))
  throw new RangeError('Invalid terrain radius');
 const globe=Number.isFinite(globeRadius)&&globeRadius>0?globeRadius:physicsRadius;
 return physicsRadius+.12+(globe+.028-(physicsRadius+.12))*seamEase(SEAM_INNER_RADIUS,86,distance);
};
// THREE.SphereGeometry uses phi from -X towards +Z; the two triangles in
// a quad may use different diagonal edges. Face-to-cell mapping is derived
// from geometry.index, not from guessed interpolation.
export function createGlobeSurfaceSampler(THREE,geometry,{widthSegments=180,heightSegments=112}={}){
 const index=geometry?.index,pos=geometry?.attributes?.position;
 if(!index||!pos||!THREE?.Ray||widthSegments<3||heightSegments<2)
  throw new TypeError('Expected a triangulated THREE.SphereGeometry');
 const cells=new Map(),stride=widthSegments+1;
 for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  const cx=[a%stride,b%stride,c%stride],cy=[Math.floor(a/stride),Math.floor(b/stride),Math.floor(c/stride)];
  const x=Math.min(...cx),y=Math.min(...cy);
  if(x<0||x>=widthSegments||y<0||y>=heightSegments)continue;
  const key=y*widthSegments+x,items=cells.get(key)||[];
  items.push([a,b,c]);cells.set(key,items);
 }
 const zero=new THREE.Vector3(0,0,0),ray=new THREE.Ray(zero,new THREE.Vector3(0,0,1));
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();
 return {
  sample(normal){
   if(!normal||!Number.isFinite(normal.x)||!Number.isFinite(normal.y)||!Number.isFinite(normal.z))
    return null;
   const phi=(Math.atan2(normal.z,-normal.x)+Math.PI*2)%(Math.PI*2),
    theta=Math.acos(Math.max(-1,Math.min(1,normal.y)));
   const ix=Math.min(widthSegments-1,Math.floor(phi/(Math.PI*2)*widthSegments)),
    iy=Math.min(heightSegments-1,Math.floor(theta/Math.PI*heightSegments));
   ray.direction.copy(normal).normalize();
   let best=Infinity;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const yy=iy+dy;if(yy<0||yy>=heightSegments)continue;
    const xx=(ix+dx+widthSegments)%widthSegments;
    for(const tri of cells.get(yy*widthSegments+xx)||[]){
     a.fromBufferAttribute(pos,tri[0]);
     b.fromBufferAttribute(pos,tri[1]);
     c.fromBufferAttribute(pos,tri[2]);
     const where=ray.intersectTriangle(a,b,c,false,hit);
     if(where){
      const r=where.length();
      if(r>0&&r<best)best=r;
     }
    }
   }
   return Number.isFinite(best)?best:null;
  }
 };
}
