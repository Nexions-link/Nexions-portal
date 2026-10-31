// Split static, world-sized instance batches into independently culled cells.
// Preserve every instance, material, colour and quality-prefix selection.
export function forestBatchEligible(mesh){
 if(!mesh?.isInstancedMesh||mesh.userData.ngwSpatialChunk||
  !/^(forest-|painterly-|g13-)/.test(mesh.name)||mesh.instanceMatrix.count<128)return false;
 const triangles=(mesh.geometry.index?.count??mesh.geometry.attributes.position?.count??0)/3;
 return triangles*mesh.instanceMatrix.count>=40000;
}
export const FOREST_PLANT_DISTANCE=Object.freeze({economy:36,balanced:64,high:90});
export function forestCellOccluded(camera,centre,radius,planetRadius=261){
 const occluder=Math.max(0,planetRadius-12),cameraDistance=camera.length();
 if(cameraDistance<=occluder||occluder<=0)return false;
 const distance=camera.distanceTo(centre);
 if(distance<=radius||distance-radius<=Math.sqrt(cameraDistance*cameraDistance-occluder*occluder))return false;
 const sinCone=occluder/cameraDistance,sinBound=radius/distance;
 if(sinBound>=sinCone)return false;
 const cosLimit=Math.sqrt(1-sinCone*sinCone)*Math.sqrt(1-sinBound*sinBound)+sinCone*sinBound;
 const cosine=(cameraDistance*cameraDistance-camera.dot(centre))/(cameraDistance*distance);
 return cosine>cosLimit+1e-6;
}
const isSmallPlant=source=>/^(painterly-|forest-(grass-|saplings-|shrubs|deep-bracken|cinematic-|buttress-roots)|g13-root-moss)/.test(source.name)&&!source.castShadow;
export function createForestSpatialBatches(THREE,{scene,cellSize=32,planetRadius=261,logger=console}={}){
 if(!scene||!Number.isFinite(cellSize)||cellSize<=0)throw new TypeError('Invalid spatial batch configuration');
 const entries=new Map(),failed=new WeakSet();
 const matrix=new THREE.Matrix4(),colour=new THREE.Color(),worldSphere=new THREE.Sphere(),cameraPosition=new THREE.Vector3();
 function restore(row){
  row.source.layers.mask=row.mask;
  for(const {mesh} of row.cells){row.source.remove(mesh);mesh.dispose();}
 }
 function build(source){
  const bins=new Map(),cells=[],mask=source.layers.mask;
  try{
   for(let i=0;i<source.instanceMatrix.count;i++){
    source.getMatrixAt(i,matrix);const e=matrix.elements;
    const key=[e[12],e[13],e[14]].map(x=>Math.floor(x/cellSize)).join(',');
    if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);
   }
   for(const [key,indices] of bins){
    const mesh=new THREE.InstancedMesh(source.geometry,source.material,indices.length);
    mesh.name=source.name+' / cell '+key;mesh.layers.mask=mask;
    mesh.userData.ngwSpatialChunk=true;mesh.raycast=()=>{};
    mesh.frustumCulled=true;
    mesh.customDepthMaterial=source.customDepthMaterial;
    mesh.customDistanceMaterial=source.customDistanceMaterial;
    mesh.renderOrder=source.renderOrder;
    cells.push({mesh,indices});
    for(let j=0;j<indices.length;j++){
     source.getMatrixAt(indices[j],matrix);mesh.setMatrixAt(j,matrix);
     if(source.instanceColor){source.getColorAt(indices[j],colour);mesh.setColorAt(j,colour);}
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();
   }
   for(const {mesh} of cells)source.add(mesh);
   // Layers mask the original draw only. Three.js still traverses its children
   // in both beauty and shadow passes; source.visible continues to hide all.
   source.layers.disableAll();
   return {source,cells,mask,matrixVersion:source.instanceMatrix.version,
    colourVersion:source.instanceColor?.version,count:null,cast:null,receive:null};
  }catch(error){
   for(const {mesh} of cells){source.remove(mesh);mesh.dispose();}
   source.layers.mask=mask;throw error;
  }
 }
 function synchronise(row){
  const {source}=row;
  if(row.count===source.count&&row.cast===source.castShadow&&row.receive===source.receiveShadow)return;
  for(const {mesh,indices} of row.cells){
   // Each cell retains original instance order, so a binary search gives
   // exactly the same first-N density as the unpartitioned quality preset.
   let lo=0,hi=indices.length;
   while(lo<hi){const mid=(lo+hi)>>1;if(indices[mid]<source.count)lo=mid+1;else hi=mid;}
   mesh.count=lo;mesh.visible=lo>0;
   mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;
  }
  row.count=source.count;row.cast=source.castShadow;row.receive=source.receiveShadow;
 }
 function update(camera=null,quality='balanced'){
  if(camera)camera.getWorldPosition(cameraPosition);
  // All supported forest/painterly batches are direct scene children. Avoid
  // traversing the newly-created cell hierarchy on every simulation frame.
  for(const source of scene.children){
   if(failed.has(source)||!forestBatchEligible(source))continue;
   let row=entries.get(source);
   try{
    if(row&&(row.matrixVersion!==source.instanceMatrix.version||
     row.colourVersion!==source.instanceColor?.version)){
     restore(row);entries.delete(source);row=null;
    }
    if(!row){row=build(source);entries.set(source,row);}
    synchronise(row);
    source.updateWorldMatrix(true,false);
    const range=isSmallPlant(source)?(FOREST_PLANT_DISTANCE[quality]??64):Infinity;
    for(const {mesh} of row.cells){
     if(!camera){mesh.geometry=source.geometry;mesh.visible=mesh.count>0;continue;}
     worldSphere.copy(mesh.boundingSphere).applyMatrix4(source.matrixWorld);
     const distance=cameraPosition.distanceTo(worldSphere.center)-worldSphere.radius;
     const distant=source.geometry.userData.ngwDistantGeometry;
     mesh.geometry=distant&&distance>(quality==='high'?28:quality==='economy'?12:18)?distant:source.geometry;
     mesh.visible=mesh.count>0&&distance<=range&&
      !forestCellOccluded(cameraPosition,worldSphere.center,worldSphere.radius,planetRadius);
    }
   }catch(error){
    if(row){restore(row);entries.delete(source);}
    failed.add(source);logger?.warn?.('Forest spatial batching fallback',source.name,error);
   }
  }
 }
 function dispose(){for(const row of entries.values())restore(row);entries.clear();}
 return {update,dispose,get batchCount(){return entries.size},
  get cellCount(){let n=0;for(const row of entries.values())n+=row.cells.length;return n;}};
}
