// Procedural fragment shading, no texture downloads, colliders or new geometry.
// Applies only to the forest sector on the main spherical terrain material.
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
export const forestTrailLat=lon=>-.035+.015*Math.sin((lon-.145)*4)+
 .012*Math.sin(Math.max(0,lon-.51)*8.5)+.011*Math.exp(-Math.pow((lon-.40)/.072,2));
export const forestGroundMask=(lon,lat)=>smooth(.16,.32,lon)*
 (1-smooth(1.40,1.56,lon))*(1-smooth(.31,.47,Math.abs(lat+.035)));
function hash(x,z){
 let h=Math.imul(x,374761393)^Math.imul(z,668265263);
 h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
}
export function terrainNoise(x,z){
 const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);
 return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+
 (hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;
}
export function forestGroundWeights(lon,lat,radius=261){
 const mask=forestGroundMask(lon,lat);
 const x=lon*radius*Math.cos(lat),z=lat*radius;
 const broad=terrainNoise(x*.043,z*.043),patch=terrainNoise(x*.18+14,z*.18-27);
 const shade=terrainNoise(x*.025-39,z*.025+11);
 const moist=smooth(.31,.74,shade*.62+broad*.38);
 const soil=smooth(.37,.69,broad*.42+patch*.38+(1-shade)*.20);
 const moss=smooth(.36,.78,moist*.59+shade*.41)*(1-soil*.5);
 const leaves=smooth(.31,.76,patch*.64+(1-broad)*.36);
 const fringe=terrainNoise(x*.56+3,z*.56+7);
 const trail=1-smooth(2.4,6.7,Math.abs(lat-forestTrailLat(lon))*radius+(fringe-.5)*1.45);
 return {mask,soil,moss,leaves,trail,moist};
}
const VERTEX_DECL='varying vec3 vNgwTerrainDirection;';
const FRAGMENT_DECL=String.raw`
varying vec3 vNgwTerrainDirection;
uniform float uNgwTerrainRadius;
uniform float uNgwTerrainDetail;
float ngwTerrainHash(vec2 p){
 vec3 q=fract(vec3(p.xyx)*.1031);
 q+=dot(q,q.yzx+33.33);
 return fract((q.x+q.y)*q.z);
}
float ngwTerrainNoise(vec2 p){
 vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
 return mix(mix(ngwTerrainHash(i),ngwTerrainHash(i+vec2(1.,0.)),u.x),
 mix(ngwTerrainHash(i+vec2(0.,1.)),ngwTerrainHash(i+vec2(1.,1.)),u.x),u.y);
}
float ngwTrailLat(float lon){
 return -.035+.015*sin((lon-.145)*4.)+
 .012*sin(max(0.,lon-.51)*8.5)+.011*exp(-pow((lon-.40)/.072,2.));
}
`;
const FRAGMENT_PAINT=String.raw`
vec3 ngwDirection=normalize(vNgwTerrainDirection);
float ngwLon=atan(ngwDirection.x,ngwDirection.z);
float ngwLat=asin(clamp(ngwDirection.y,-1.,1.));
float ngwMask=smoothstep(.16,.32,ngwLon)*
 (1.-smoothstep(1.40,1.56,ngwLon))*
 (1.-smoothstep(.31,.47,abs(ngwLat+.035)));
if(ngwMask>.001){
 vec2 metres=vec2(ngwLon*cos(ngwLat),ngwLat)*uNgwTerrainRadius;
 float broad=ngwTerrainNoise(metres*.043);
 float patch=ngwTerrainNoise(metres*.18+vec2(14.,-27.));
 float shade=ngwTerrainNoise(metres*.025+vec2(-39.,11.));
 float moist=smoothstep(.31,.74,shade*.62+broad*.38);
 float soil=smoothstep(.37,.69,broad*.42+patch*.38+(1.-shade)*.20);
 float moss=smoothstep(.36,.78,moist*.59+shade*.41)*(1.-soil*.5);
 float leaves=smoothstep(.31,.76,patch*.64+(1.-broad)*.36);
 vec3 grass=vec3(.17,.232,.091);
 vec3 earth=vec3(.184,.104,.058);
 vec3 mossColor=vec3(.079,.114,.053);
 vec3 litter=vec3(.232,.137,.066);
 vec3 surface=mix(grass,earth,.16+.66*soil);
 surface=mix(surface,mossColor,.56*moss);
 surface=mix(surface,litter,.31*leaves*(1.-moss*.4));
 float dist=abs(ngwLat-ngwTrailLat(ngwLon))*uNgwTerrainRadius;
 float path=1.-smoothstep(2.4,6.7,dist+
 (ngwTerrainNoise(metres*.56+vec2(3.,7.))-.5)*1.45);
 surface=mix(surface,vec3(.289,.194,.110),path*.93);
 float grain=ngwTerrainNoise(metres*1.31+vec2(7.,23.))-.5;
 if(uNgwTerrainDetail>.9){
  grain=grain*.7+(ngwTerrainNoise(metres*3.8+vec2(19.,5.))-.5)*.30;
 }
 surface*=1.+grain*(.16+.12*uNgwTerrainDetail);
 diffuseColor.rgb=mix(diffuseColor.rgb,surface,ngwMask*.96);
}
`;
export function installForestGroundShader(material,{radius=261,quality='balanced'}={}){
 if(!material)throw TypeError('Material is required');
 const planetRadius={value:radius},detail={value:quality==='economy'?.55:quality==='high'?1.3:1};
 const prior=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  if(typeof prior==='function')prior(shader);
  for(const [type,source,token] of [
   ['vertex',shader.vertexShader,'#include <common>'],
   ['vertex',shader.vertexShader,'#include <begin_vertex>'],
   ['fragment',shader.fragmentShader,'#include <common>'],
   ['fragment',shader.fragmentShader,'#include <color_fragment>']]){
   if(!source.includes(token))throw Error('Missing ground '+type+' token: '+token);
  }
  shader.uniforms.uNgwTerrainRadius=planetRadius;
  shader.uniforms.uNgwTerrainDetail=detail;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
   '#include <common>\n'+VERTEX_DECL).replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvNgwTerrainDirection=normalize(position);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
   '#include <common>\n'+FRAGMENT_DECL).replace('#include <color_fragment>',
   '#include <color_fragment>\n'+FRAGMENT_PAINT);
 };
 material.customProgramCacheKey=()=> 'ngw-ground-surface-v1';
 material.needsUpdate=true;
 return {setQuality(q){detail.value=q==='economy'?.55:q==='high'?1.3:1},
  setRadius(value){if(Number.isFinite(value)&&value>0)planetRadius.value=value},
  get detail(){return detail.value}};
}
