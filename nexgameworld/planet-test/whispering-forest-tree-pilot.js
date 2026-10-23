// NexGameWorld NGW-ART-TREES-001 / T3 first controlled in-world sculptures.
// Replaces ONLY the client visuals for three deterministic existing forest trees.
// The server's forest layout and all collision cylinders remain untouched.
import {createAncientPine,ancientPineTrunkRadius}
 from './tree-library-ancient-pine.js?v=5';
import {createForestLibraryTree,forestTrunkRadius}
 from './tree-library-forest-types.js?v=6';
import {enableTreeInstanceCulling,simplifyForestBarkShading,
 createForestShadowSilhouette,configurePilotTreeRender}
 from './forest-tree-render-optimization.js?v=1';

const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const FOREST_PILOT_SPECIES=Object.freeze([
 'tree_pine_ancient','tree_oak_whispering','tree_dead_sentinel'
]);
export const FOREST_PILOT_LONGITUDES=Object.freeze([.43,.62,.99]);
export const forestTreeKey=p=>p.lon.toFixed(9)+':'+p.lat.toFixed(9);

// Pure selection: only EXISTING trunks, off the trail, far from camp/quests.
// Repeated seed and data order produce exactly the same anchor coordinates.
// Targets span the approach road so real players can inspect in-game.
export function selectForestPilotTrees(layout,trailLatitude,{
 species=FOREST_PILOT_SPECIES,longitudes=FOREST_PILOT_LONGITUDES
}={}){
 if(!layout?.trees||typeof trailLatitude!=='function')throw new TypeError('Invalid forest layout');
 const used=new Set();
 return species.map((id,i)=>{
  const lon=longitudes[i],targetLat=trailLatitude(lon)+(i%2?.085:-.085);
  const possible=layout.trees.filter(p=>!used.has(forestTreeKey(p)) &&
    p.lon>.27&&p.lon<1.28&&
    Math.abs(p.lat-trailLatitude(p.lon))*261>10.5+p.radius&&
    Math.abs(p.lon-lon)<.21);
  const score=p=>{
   const delta=(p.lon-lon)*Math.cos(targetLat)*261;
   const side=(p.lat-targetLat)*261;
   return Math.hypot(delta,side)+Math.abs(p.radius-1.6)*.7;
  };
  possible.sort((a,b)=>score(a)-score(b));
  const found=possible[0];
  if(!found)throw new Error('Missing existing forest pilot anchor '+id);
  used.add(forestTreeKey(found));
  return Object.freeze({id,site:found,index:i});
 });
}

export function forestTrunkFitScale(id,seed,tree,masterHeight){
 if(!(tree?.radius>0)||!(masterHeight>0))throw new RangeError('Invalid trunk scale');
 // Preserve server cylinder: no new invisible blockers in the trail.
 // Model roots are cosmetic traversable ground detail outside the solid trunk.
 let maximum=0;
 for(let i=0;i<96;i++){
  const a=i*TAU/96;
  const r=id==='tree_pine_ancient'?
   ancientPineTrunkRadius(0,a,seed):
   forestTrunkRadius(id,0,a,seed);
  maximum=Math.max(maximum,r);
 }
 return {horizontal:(tree.radius*.78)/maximum*.985,
  vertical:tree.height/masterHeight,
  existingBlockerRadius:tree.radius*.78,
  masterBaseRadius:maximum};
}

export function createWhisperingForestTreePilot(THREE,{
 scene,layout,radius,heightAt,trailLatitude
}={}){
 const sites=selectForestPilotTrees(layout,trailLatitude),
  replaced=new Set(),models=[],up=new THREE.Vector3(0,1,0),tmp=new THREE.Vector3();
 for(const {site,id,index} of sites){
  // The visual preview cannot break the existing game. If art construction
  // fails (e.g. lost WebGL resources), leave original tree visible.
  let asset=null;
  try{
   const seed=17+index*53+(site.tint*137|0);
   const n=new THREE.Vector3(Math.cos(site.lat)*Math.sin(site.lon),
    Math.sin(site.lat),Math.cos(site.lat)*Math.cos(site.lon));
   const base=radius+heightAt(n);
   const q=new THREE.Quaternion().setFromUnitVectors(up,n);
   q.multiply(new THREE.Quaternion().setFromAxisAngle(up,site.yaw));
   const masterHeight=id==='tree_pine_ancient'?28:
    ({tree_oak_whispering:25,tree_dead_sentinel:20})[id];
   const fit=forestTrunkFitScale(id,seed,site,masterHeight);
   const basePoint=n.clone().multiplyScalar(base);
   const groundHeight=(x,z)=>{
    tmp.set(x*fit.horizontal,0,z*fit.horizontal).applyQuaternion(q)
     .addScaledVector(n,radius).normalize();
    const nearby=tmp.clone().multiplyScalar(radius+heightAt(tmp));
    return (nearby.sub(basePoint)).dot(n)/fit.vertical;
   };
   asset=id==='tree_pine_ancient'?
    createAncientPine(THREE,{seed,mapSize:512,groundHeight}):
    createForestLibraryTree(THREE,{id,seed,mapSize:512,groundHeight});
   if(asset.metadata.height!==masterHeight)throw Error('Tree catalog scale mismatch');
   asset.group.position.copy(n).multiplyScalar(base);
   asset.group.quaternion.copy(q);
   asset.group.scale.set(fit.horizontal,fit.vertical,fit.horizontal);
   asset.group.name='NGW T3 forest pilot '+id+' existing trunk '+forestTreeKey(site);
   asset.group.userData.forestPilot=true;
   asset.group.userData.originalColliderRadius=fit.existingBlockerRadius;
   asset.group.userData.modelBaseRadius=fit.masterBaseRadius*fit.horizontal;
   // Preserve all master triangles and leaf instances, but stop submitting
   // canopy tiers hidden outside the camera frustum.
   const culledInstances=enableTreeInstanceCulling(asset.group);
   // Master geometry already contains all bark grooves; a normal map plus
   // a duplicate bump pass wastes fragment work on a close-up tree.
   const savedFragmentPasses=simplifyForestBarkShading(asset.group);
   // Shadows use one cheap silhouette instead of re-rasterizing the entire
   // sculpted bough/root surface. No new collision or visible proxy.
   const shadow=createForestShadowSilhouette(THREE,{id,height:masterHeight});
   asset.group.add(shadow);
   asset.group.userData.rendererOptimizations={
    culledInstances,savedFragmentPasses,shadowProxyTriangles:shadow.userData.triangleCount
   };
   configurePilotTreeRender(asset.group,{quality:'balanced'});
   scene.add(asset.group);
   models.push(asset);
   replaced.add(forestTreeKey(site));
  }catch(error){
   asset?.dispose();
   // Failure is local to this cosmetic tree, never a player/session failure.
   console.warn('NexGameWorld forest art pilot fallback',id,error);
  }
 }
 return {sites,models,replaced,
  setQuality(quality,portal=false){
   for(const model of models){
    model.group.visible=!portal;
    configurePilotTreeRender(model.group,{quality,portal});
   }
  },
  dispose(){for(const m of models){
   m.group.traverse(o=>{
    if(o.userData.cosmeticShadow){o.geometry.dispose();o.material.dispose();}
   });
   m.dispose();
  }},
  get count(){return models.length;}
 };
}
