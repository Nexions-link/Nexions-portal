// NGW-ART-REMASTER-001 / G-01: reproducible, non-authoritative art-review cameras.
// Only the THREE camera may use these poses. Never mutate the server-owned hero.
import {forestTrailLatitude} from './whispering-forest.js?v=22';

export const VISUAL_REFERENCE_ID='R1';
export const VISUAL_REFERENCE_RATIO=864/1536;
const PI=Math.PI;
const base=Object.freeze([
 {id:'start',label:'01 · Стартовый лагерь',zone:'Степь Рассвета',
  local:[17,5],heading:.21,pitch:.60,zoom:20,eyeLift:2.3,
  baseline:'Разреженные группы травы и светлый лагерь, отдельный материал земли.',
  target:'Тёплая почва с живой растительностью, многослойные деревья, сочные тени и плавная дорога.',
  check:'Грунт и тропа · растения у края дороги · объём древесины · свет'},
 {id:'entrance',label:'02 · Вход в Шепчущий лес',zone:'Граница двух локаций',
  lon:.265,lat:forestTrailLatitude(.265),heading:.08,pitch:.63,zoom:20,eyeLift:2.3,
  baseline:'Две разные поверхности земли и разные схемы распределения растений.',
  target:'Непрерывная охристая тропинка без границы двух типов земли, одинаково подробные травы и кроны.',
  check:'Непрерывность дороги · отсутствие шва · плотность травы · цвет'},
 {id:'trail',label:'03 · Тропа Шепчущего леса',zone:'Шепчущий лес',
  lon:.72,lat:forestTrailLatitude(.72),heading:.18,pitch:.67,zoom:21,eyeLift:2.35,
  baseline:'Процедурные кроны, общий ствол, декоративные цветы и лесная подстилка.',
  target:'Многоярусные хвойные лапы справа, объёмные светлые лиственные кроны, фактурная кора, полянки цветов.',
  check:'Силуэты деревьев · хвойные лапы · кора · папоротники · грибы'},
 {id:'wolves',label:'04 · Волчьи владения',zone:'Шепчущий лес, район волчьих стай',
  lon:1.08,lat:forestTrailLatitude(1.08)+.15,heading:-.22,pitch:.55,zoom:21,eyeLift:2.4,
  baseline:'Тёмный лес с волками, существующая процедурная флора.',
  target:'Глубокий лес с выразительными световыми просветами, мшистыми корнями и густым подлеском; видимые волки.',
  check:'Глубина планов · тени · детали корней · читаемость волков'}
]);
export const VISUAL_REFERENCE_VIEWS=Object.freeze(base.map(row=>
 Object.freeze({...row,local:row.local?Object.freeze(row.local):undefined})));
export function getVisualReferenceView(id){
 return VISUAL_REFERENCE_VIEWS.find(view=>view.id===id)||null;
}
export function referenceNormal(view,radius=261){
 if(!view||!Number.isFinite(radius)||radius<=0)throw new RangeError('Bad reference view/radius');
 if(view.local){
  const [x,z]=view.local,d=Math.hypot(x,z),k=d>1e-10?Math.sin(d/radius)/d:0;
  return [x*k,z*k,Math.cos(d/radius)];
 }
 return [Math.cos(view.lat)*Math.sin(view.lon),Math.sin(view.lat),
  Math.cos(view.lat)*Math.cos(view.lon)];
}
// Same tangent frame and FOV as the active spherical game camera.
// Render-only; no player position, navigation, accounts or map state are touched.
export function referenceViewPose(THREE,view,{radius=261,heightAt=()=>0}={}){
 if(!getVisualReferenceView(view?.id))throw new RangeError('Unknown reference view');
 if(!Number.isFinite(view.zoom)||!Number.isFinite(view.pitch)||!Number.isFinite(view.heading))
  throw new RangeError('Invalid camera settings');
 const normal=new THREE.Vector3(...referenceNormal(view,radius)).normalize();
 const lon=Math.atan2(normal.x,normal.z);
 const east=new THREE.Vector3(Math.cos(lon),0,-Math.sin(lon));
 const north=new THREE.Vector3().crossVectors(normal,east).normalize();
 const forward=east.multiplyScalar(Math.cos(view.heading))
  .addScaledVector(north,Math.sin(view.heading)).normalize();
 const focus=normal.clone().multiplyScalar(radius+heightAt(normal)+view.eyeLift);
 const position=focus.clone().addScaledVector(forward,-view.zoom*Math.cos(view.pitch))
  .addScaledVector(normal,view.zoom*Math.sin(view.pitch)+1.1);
 const sampledNormal=position.clone().normalize();
 const minimum=radius+heightAt(sampledNormal)+1.0;
 if(position.length()<minimum)position.copy(sampledNormal.multiplyScalar(minimum));
 return {normal,focus,position,heading:view.heading,pitch:view.pitch,zoom:view.zoom,
  fov:58,aspect:VISUAL_REFERENCE_RATIO};
}
