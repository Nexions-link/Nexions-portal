// Snapshot the actual camera frustum for one button press. Check visible model
// meshes rather than labels/sprites, so an offscreen body cannot be selected
// just because its overhead name reaches into the frame.
export function createCameraTargetFilter(THREE,camera){
 camera.updateWorldMatrix(true,false);
 const projection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 const frustum=new THREE.Frustum().setFromProjectionMatrix(projection);
 const box=new THREE.Box3();
 return entity=>{
  const root=entity?.root;
  if(!root?.visible)return false;
  root.updateWorldMatrix(true,true);
  let visible=false;
  root.traverseVisible(object=>{
   if(visible||object===entity.contactShadow||!object.isMesh||!object.geometry||object.material?.visible===false)return;
   const geometry=object.geometry;
   if(!geometry.boundingBox)geometry.computeBoundingBox();
   if(!geometry.boundingBox)return;
   box.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
   if(frustum.intersectsBox(box))visible=true;
  });
  return visible;
 };
}
