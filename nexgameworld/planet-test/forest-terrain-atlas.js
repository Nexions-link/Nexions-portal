// Local woodland UVs: ~15cm texels, comparable to the village's 190m/1280px.
// Partition existing triangles; no overlapping surface, added collider or shader.
export const FOREST_ATLAS={west:.28,east:1.54,south:-.40,north:.36,width:2048,height:1536};
export function forestAtlasUV(lon,lat){
 const b=FOREST_ATLAS;
 return [(lon-b.west)/(b.east-b.west),(lat-b.south)/(b.north-b.south)];
}
export function partitionForestTerrain(THREE,geometry){
 const p=geometry.attributes.position,uv=[],inside=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y,z);
  const [u,v]=forestAtlasUV(Math.atan2(x,z),Math.asin(y/r));
  uv.push(u,v);inside.push(u>=0&&u<=1&&v>=0&&v<=1);
 }
 const outside=[],forest=[],index=geometry.index;
 for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  (inside[a]&&inside[b]&&inside[c]?forest:outside).push(a,b,c);
 }
 geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex([...outside,...forest]);
 geometry.clearGroups();
 geometry.addGroup(0,outside.length,0);
 geometry.addGroup(outside.length,forest.length,1);
 return {forestTriangles:forest.length/3,totalTriangles:index.count/3};
}
export function createForestTerrainAtlas(THREE,{geometry,material,renderer}){
 const local=material.clone();
 const stats=partitionForestTerrain(THREE,geometry);
 let ready=false,enabled=true,relief=null,sourceRelief=null;
 const texture=new THREE.TextureLoader().load(
  new URL('./assets/terrain/forest-ground-v78.webp',import.meta.url).href,
  ()=>{ready=true;applyMap();},undefined,
  ()=>{console.warn('Forest atlas unavailable: original opaque ground retained');});
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.channel=1;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 texture.name='Whispering Forest local soil and road atlas';
 function applyMap(){
  local.map=ready&&enabled?texture:material.map;
  local.needsUpdate=true;
 }
 function sync(quality='balanced',portal=false){
  const next=!portal&&quality!=='economy';
  if(next!==enabled){enabled=next;applyMap();}
  // Same 4m soil relief as the village; remap repeat to the LOCAL atlas UVs.
  const source=material.bumpMap;
  if(source!==sourceRelief){
   relief?.dispose();sourceRelief=source;relief=source?.clone()||null;
   if(relief){
    relief.channel=1;
    relief.repeat.set(source.repeat.x*(FOREST_ATLAS.east-FOREST_ATLAS.west)/(2*Math.PI),
     source.repeat.y*(FOREST_ATLAS.north-FOREST_ATLAS.south)/Math.PI);
    relief.needsUpdate=true;
   }
  }
  const bump=ready&&enabled?relief:source;
  if(local.bumpMap!==bump){local.bumpMap=bump;local.needsUpdate=true;}
  local.bumpScale=material.bumpScale;
  // Normal/roughness maps retain globe UV0, independent of albedo UV1.
  if(local.normalMap!==material.normalMap||local.roughnessMap!==material.roughnessMap){
   local.normalMap=material.normalMap;local.roughnessMap=material.roughnessMap;local.needsUpdate=true;
  }
  local.normalScale.copy(material.normalScale);
 }
 return {material:local,sync,stats};
}
