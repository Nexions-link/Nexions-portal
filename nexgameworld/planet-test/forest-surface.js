// A local, finely triangulated forest surface, like the starter-zone patch.
// Native THREE materials only. No physics, networking or shader replacement.
import {FOREST_SURFACE,forestSurfacePoint,forestSurfaceCoverage} from './forest-surface-profile.js?v=1';
import {forestGroundPixel,forestRoadProfile} from './forest-ground-texture.js?v=5';
import {WORLD_ART_PALETTE as ART} from './world-art-style.js?v=1';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance} from './whispering-forest.js?v=28';
import {createGlobeSurfaceSampler} from './terrain-seam.js?v=1';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function forestSurfacePixel(lon,lat){
 const base=forestGroundPixel(lon,lat),road=forestRoadProfile(lon,lat);
 const x=lon*261*Math.cos(lat),z=lat*261;
 const patch=.5+.5*Math.sin(x*.083+Math.sin(z*.067)*1.7);
 let free=smooth(FOREST_CAMP.clearingRadius,FOREST_CAMP.clearingRadius+8,
  forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat));
 for(const site of FOREST_SITE_CLEARINGS)free=Math.min(free,smooth(site.radius,site.radius+5,
  forestDistance(lon,lat,site.lon,site.lat)));
 const cover=(1-road.wear)*free*(.40+.48*patch);
 let h=Math.imul(Math.floor(x*5),374761393)^Math.imul(Math.floor(z*5),668265263);
 h=Math.imul(h^(h>>>13),1274126177);
 const grain=((h>>>0)/4294967295-.5)*12;
 // A moss/short-turf foundation joins the original warm soil. Exposed humus,
 // dry clearings and the exact existing path remain visibly distinct.
 const turf=ART.terrain.forestShade;
 return [...base.slice(0,3).map((c,i)=>Math.round(c*(1-cover)+(turf[i]+grain)*cover)),255];
}
export function forestSurfacePixels(width=FOREST_SURFACE.textureWidth,height=FOREST_SURFACE.textureHeight){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<4||height<4||width>2048||height>1024)
  throw new RangeError('Invalid forest surface texture dimensions');
 const data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=forestSurfacePoint((x+.5)/width,1-(y+.5)/height);
  data.set(forestSurfacePixel(p.lon,p.lat),(y*width+x)*4);
 }
 return data;
}
export function forestSurfaceGeometry(THREE,{radius,heightAt,globeGeometry,
 columns=FOREST_SURFACE.columns,rows=FOREST_SURFACE.rows}){
 if(!Number.isFinite(radius)||radius<=0||typeof heightAt!=='function'||
  !Number.isInteger(columns)||columns<2||!Number.isInteger(rows)||rows<2)
  throw new RangeError('Invalid forest surface geometry');
 const sampler=globeGeometry?createGlobeSurfaceSampler(THREE,globeGeometry):null;
 const positions=[],colors=[],uv=[],index=[],n=new THREE.Vector3();
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
  const u=x/columns,v=y/rows,p=forestSurfacePoint(u,v);
  const alpha=forestSurfaceCoverage(p.lon,p.lat,radius);
  n.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),Math.cos(p.lat)*Math.cos(p.lon));
  const physics=radius+heightAt(n);
  const globe=alpha<1?(sampler?.sample(n)??physics):physics;
  // Boundary vertices coincide with the actual background triangles, while
  // the core follows the same surface height sampler as actors and props.
  const r=(globe+.018)*(1-alpha)+(physics+.035)*alpha;
  positions.push(n.x*r,n.y*r,n.z*r);colors.push(1,1,1,alpha);uv.push(u,v);
  if(x<columns&&y<rows){const a=y*(columns+1)+x,b=a+columns+1;
   index.push(a,a+1,b,b,a+1,b+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(index);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
export function createForestSurface(THREE,{scene,radius,heightAt,globeGeometry,
 textureWidth=FOREST_SURFACE.textureWidth,textureHeight=FOREST_SURFACE.textureHeight}){
 let geometry,map,material,mesh;
 const clones=new Map();
 try{
  geometry=forestSurfaceGeometry(THREE,{radius,heightAt,globeGeometry});
  map=new THREE.DataTexture(forestSurfacePixels(textureWidth,textureHeight),textureWidth,textureHeight,THREE.RGBAFormat);
  map.name=`NGW local forest soil and trail, ${textureWidth}x${textureHeight}`;
  map.colorSpace=THREE.SRGBColorSpace;map.flipY=true;map.generateMipmaps=true;
  map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
  map.anisotropy=4;map.needsUpdate=true;
  material=new THREE.MeshStandardMaterial({map,vertexColors:true,roughness:1,
   side:THREE.FrontSide,transparent:true,alphaTest:.008,depthWrite:true,
   polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  mesh=new THREE.Mesh(geometry,material);mesh.name='forest-detailed-terrain-no-collision';
  mesh.raycast=()=>{};mesh.castShadow=false;mesh.receiveShadow=true;
  scene.add(mesh);
 }catch(error){geometry?.dispose();map?.dispose();material?.dispose();throw error;}
 function tiled(source,key){
  const previous=clones.get(key);
  if(previous&&previous.source===source)return previous.texture;
  previous?.texture.dispose();clones.delete(key);
  if(!source)return null;
  const texture=source.clone();
  // Same four-metre grain scale used on the starter meadow. Clones own
  // their repeat; never mutate the maps already used by the starter zone.
  texture.repeat.set((FOREST_SURFACE.lonMax-FOREST_SURFACE.lonMin)*radius/4,
   FOREST_SURFACE.halfWidth*2*radius/4);
  texture.needsUpdate=true;clones.set(key,{source,texture});return texture;
 }
 function setSurfaceMaps(detail,preset='balanced'){
  const active=preset!=='economy';
  material.normalMap=tiled(active?detail?.normalGlobe:null,'normal');
  material.roughnessMap=tiled(active?detail?.roughnessGlobe:null,'roughness');
  material.bumpMap=tiled(active&&!material.normalMap?detail?.reliefGlobe:null,'bump');
  material.normalScale.set(preset==='high'?.40:.22,preset==='high'?.40:.22);
  material.bumpScale=preset==='high'?.052:.024;material.needsUpdate=true;
 }
 function setQuality(preset='balanced',preview=false){
  mesh.visible=!preview;mesh.receiveShadow=!preview&&preset!=='economy';
 }
 return {setQuality,setSurfaceMaps,mesh,material,decorativeOnly:true,drawCalls:1};
}
