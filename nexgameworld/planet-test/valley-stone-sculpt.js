// Original painted sandstone for the existing four static valley batches.
// No new topology, material, texture, draw pass, collider or frame animation.
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const names=Object.freeze({base:'valley-mesa-base',cap:'valley-mesa-cap',grass:'valley-mesa-grass',boulders:'valley-boulders'});

export function valleyStoneVertex(kind,x,y,z,normal={x:0,y:0,z:0}){
 if(!Object.hasOwn(names,kind)||![x,y,z,normal.x,normal.y,normal.z].every(Number.isFinite))
  throw new RangeError('Invalid valley stone vertex');
 const radius=Math.hypot(x,z),angle=Math.atan2(x,z),top=clamp(y+.5);
 const fold=.5+.5*Math.sin(angle*3+.47)*Math.cos(angle*2-.73);
 const fracture=.5+.5*Math.sin(angle*5+.82+y*3.1);
 let r=radius,turn=angle;
 if(radius>1e-7){
  if(kind==='base'){
   // The old upper octagon (.8 radius) could recede inside the .85 collider.
   // A broad irregular scarp keeps every face outside that circle, while
   // remaining inside the original overall unit-radius stone envelope.
   r=y>0?.955+.044*fold:.982+.017*fold;
   turn+=.018*Math.sin(angle*3+.6)*(y>0?1:-.45);
  }else if(kind==='cap'){
   r=radius*(1.012+.055*fold);
  }else if(kind==='grass'){
   r=radius*(1.012+.043*fold);
  }else{
   // Expand unevenly instead of shrinking a boulder into its unchanged
   // collider. Preserve y and angular positions, including duplicated faces.
   r=Math.min(1,radius*(1.025+.05*fold));
  }
 }
 const position=radius<1e-7?[x,y,z]:[Math.sin(turn)*r,y,Math.cos(turn)*r];
 const face=clamp(.5+.5*(normal.x*.7+normal.z*.3));
 const warm=clamp(.24+.62*fold+.14*face),cool=clamp(1-warm+.10*Math.sin(angle*2-.3));
 const cavity=fracture*(.18+.30*(1-top))+(normal.y<-.5?.18:0);
 let color;
 if(kind==='grass')color=[.57+.24*top+.08*warm,.66+.28*top-.07*cavity,.43+.19*cool+.08*top];
 else if(kind==='cap')color=[.86+.12*warm-.08*cavity,.83+.12*cool-.08*cavity,.76+.20*cool-.10*warm-.06*cavity];
 else color=[.72+.24*warm+.05*top-.10*cavity,.77+.14*cool+.04*top-.10*cavity,.80+.18*cool-.18*warm-.07*cavity];
 return {position,color:color.map(v=>clamp(v))};
}

// Clone the source so callers and tests can retain the exact legacy geometry.
// Side/cap duplicate coordinates are sculpted by value, never by vertex index.
export function sculptValleyStoneGeometry(THREE,source,kind){
 if(!Object.hasOwn(names,kind))throw new RangeError('Unknown valley stone kind');
 const geometry=source.clone(),position=geometry.attributes.position;
 const normal=source.attributes.normal,colors=[];
 for(let i=0;i<position.count;i++){
  const result=valleyStoneVertex(kind,position.getX(i),position.getY(i),position.getZ(i),{
   x:normal.getX(i),y:normal.getY(i),z:normal.getZ(i)
  });
  position.setXYZ(i,...result.position);colors.push(...result.color);
 }
 geometry.name=names[kind];
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 position.needsUpdate=true;geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}

export function createValleyStoneGeometry(THREE,kind){
 let source;
 if(kind==='base')source=new THREE.CylinderGeometry(.8,1,1,8);
 else if(kind==='cap')source=new THREE.CylinderGeometry(.82,.85,1,8);
 else if(kind==='grass')source=new THREE.CylinderGeometry(.76,.82,1,8);
 else if(kind==='boulders')source=new THREE.DodecahedronGeometry(1,0);
 else throw new RangeError('Unknown valley stone kind');
 const geometry=sculptValleyStoneGeometry(THREE,source,kind);
 source.dispose();return geometry;
}
