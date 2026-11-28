// Stabilize the existing directional shadow map; no new map or render pass.
// The regular THREE shadow update still owns its frustum and sampler matrix.
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);

export function createStableShadowProjection(THREE,sun){
 if(!sun?.isDirectionalLight||!sun.shadow?.camera?.isOrthographicCamera)
  throw new TypeError('Directional orthographic shadow required');
 const lightPoint=new THREE.Vector3(),targetPoint=new THREE.Vector3(),origin=new THREE.Vector3();
 const camera=sun.shadow.camera;
 // THREE creates its public view descriptor on the first setViewOffset call.
 // Allocate it during setup, keeping exactly the original base projection.
 if(!camera.view){
  camera.setViewOffset(1,1,0,0,1,1);
  camera.clearViewOffset();
 }
 function update(enabled=true){
  if(!enabled)return false;
  const shadow=sun.shadow,c=shadow.camera,width=shadow.mapSize.x,height=shadow.mapSize.y;
  if(c!==camera||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
   !finitePoint(sun.position)||!finitePoint(sun.target?.position)||!finitePoint(c.up)||
   !Number.isFinite(c.up.lengthSq())||c.up.lengthSq()<1e-12||
   !Number.isFinite(c.left)||!Number.isFinite(c.right)||!Number.isFinite(c.top)||!Number.isFinite(c.bottom)||
   !Number.isFinite(c.near)||!Number.isFinite(c.far)||!Number.isFinite(c.zoom)||c.zoom<=0||
   c.right<=c.left||c.top<=c.bottom||c.far<=c.near||!finitePoint(c.scale)||
   c.scale.x===0||c.scale.y===0||c.scale.z===0||c.parent)return false;
  sun.getWorldPosition(lightPoint);sun.target.getWorldPosition(targetPoint);
  const distance=lightPoint.distanceToSquared(targetPoint);
  if(!finitePoint(lightPoint)||!finitePoint(targetPoint)||!Number.isFinite(distance)||distance<1e-12)return false;
  // Reject extreme finite values before touching the owned shadow projection.
  // Normal game coordinates are only a few hundred metres from the origin.
  const sx=2*c.zoom/(c.right-c.left),sy=2*c.zoom/(c.top-c.bottom),sz=2/(c.far-c.near);
  const halfWidth=(c.right-c.left)/(2*c.zoom),halfHeight=(c.top-c.bottom)/(2*c.zoom);
  const centreX=(c.left+c.right)/2,centreY=(c.top+c.bottom)/2;
  const extent=Math.max(Math.abs(c.left),Math.abs(c.right),Math.abs(c.top),Math.abs(c.bottom),Math.abs(c.near),Math.abs(c.far));
  const pointExtent=Math.max(Math.abs(lightPoint.x),Math.abs(lightPoint.y),Math.abs(lightPoint.z),
   Math.abs(targetPoint.x),Math.abs(targetPoint.y),Math.abs(targetPoint.z));
  const inverseScale=Math.max(Math.abs(1/c.scale.x),Math.abs(1/c.scale.y),Math.abs(1/c.scale.z));
  const budget=(pointExtent+extent+1)*Math.max(sx,sy,sz)*inverseScale*Math.max(width,height)*16;
  if(!(sx>0&&sy>0&&sz>0)||!Number.isFinite(budget)||
   !Number.isFinite(halfWidth)||!Number.isFinite(halfHeight)||
   !Number.isFinite(centreX)||!Number.isFinite(centreY)||
   centreX+halfWidth<=centreX-halfWidth||centreY+halfHeight<=centreY-halfHeight)return false;
  // Match LightShadow.updateMatrices' public camera pose before calculating
  // the shift. The sun and its target, hence diffuse lighting, never move.
  c.clearViewOffset();
  c.position.copy(lightPoint);c.lookAt(targetPoint);c.updateMatrixWorld();
  origin.set(0,0,0).project(c);
  const pixelX=(origin.x*.5+.5)*width,pixelY=(origin.y*.5+.5)*height;
  const dx=Math.round(pixelX)-pixelX,dy=Math.round(pixelY)-pixelY;
  c.setViewOffset(width,height,-dx,dy,width,height);
  return true;
 }
 return {update};
}
