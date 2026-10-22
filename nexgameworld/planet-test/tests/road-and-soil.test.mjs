import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareLandscapeRoutes,landscapeGroundPixel} from '../../landscape.js';
import {ROUTES,FOREST_ROAD_CONNECTOR,normalToLocal,START_RADIUS}
 from '../start-zone.js';
import {forestTrailLatitude,forestLocalPoint,forestColliders,
 forestDistance,FOREST_CAMP} from '../whispering-forest.js';
import {forestRoadProfile,forestGroundPixel,buildForestGroundPixels}
 from '../forest-ground-texture.js';
import {roadsideBudget,roadsideLayout,roadsideTuftData} from '../roadside-details.js';

test('entrance road meets spherical forest route and does not stop abruptly',()=>{
 const last=FOREST_ROAD_CONNECTOR.at(-1);
 assert.ok(last[0]>90);
 assert.ok(FOREST_ROAD_CONNECTOR.length>=12);
 const first=FOREST_ROAD_CONNECTOR[0];
 assert.ok(Math.hypot(first[0]-38,first[1]+9)<7);
 for(let i=0;i<FOREST_ROAD_CONNECTOR.length;i++){
  const lon=.164+i*.018,exact=forestLocalPoint(lon,forestTrailLatitude(lon),START_RADIUS);
  assert.ok(Math.hypot(FOREST_ROAD_CONNECTOR[i][0]-exact.x,FOREST_ROAD_CONNECTOR[i][1]-exact.z)<1e-7);
 }
 assert.ok(ROUTES[1].length>14);
});
test('start zone soil is richly coloured and its road has soft, worn edges',()=>{
 const route=prepareLandscapeRoutes(ROUTES[1].slice(0,-1).map((p,i)=>({
  ax:p[0],az:p[1],bx:ROUTES[1][i+1][0],bz:ROUTES[1][i+1][1],width:3.25
 })));
 const center=landscapeGroundPixel(31,-3.2,route),edge=landscapeGroundPixel(31,6.5,route);
 assert.equal(center[3],255);assert.equal(edge[3],255);
 assert.ok(center[0]>center[2]);
 assert.notDeepEqual(center,edge);
 const variants=new Set();
 for(let x=-35;x<54;x+=3)for(let z=-35;z<50;z+=5){
  variants.add(landscapeGroundPixel(x,z,route).slice(0,3).join(','));
 }
 assert.ok(variants.size>150);
 assert.ok(route.every(p=>Number.isFinite(p.length2)&&p.length2>0));
});
test('forest road is worn at the centre but fades organically into woodland',()=>{
 const lon=.73,lat=forestTrailLatitude(lon),road=forestRoadProfile(lon,lat);
 const verge=forestRoadProfile(lon,lat+3/261),wood=forestRoadProfile(lon,lat+10/261);
 assert.ok(road.wear>.90);
 assert.ok(road.wear>verge.wear);
 assert.equal(wood.wear,0);
 const pixels=[forestGroundPixel(lon,lat),
  forestGroundPixel(lon,lat+3/261),forestGroundPixel(lon,lat+10/261)];
 assert.ok(pixels.every(p=>p.length===4&&p[3]===255));
 assert.notDeepEqual(pixels[0],pixels[2]);
 assert.ok(pixels[0][0]>pixels[0][2]);
});
test('full world remains opaque with a baked texture, never a fragment shader',()=>{
 const data=buildForestGroundPixels(96,48);
 for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);
 const scene=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.doesNotMatch(scene,/name='forest-expedition-trail'/);
 assert.match(world,/groundMaterial=new THREE.MeshStandardMaterial/);
 assert.match(world,/transparent:false,depthWrite:true,side:THREE.FrontSide/);
 assert.doesNotMatch(world,/installForestGroundShader\(/);
});
test('roadside decorations are deterministic and preserve all old blockers',()=>{
 const before=forestColliders(),a=roadsideLayout(ROUTES[1]);
 assert.deepEqual(a,roadsideLayout(ROUTES[1]));
 assert.ok(a.stones.length>80);
 assert.ok(a.tufts.length>50);
 for(const row of [...a.stones,...a.tufts]){
  assert.ok(row.size>0&&row.distance>=2.6&&row.distance<5.55);
  if(row.coord==='forest')assert.ok(forestDistance(row.lon,row.lat,
   FOREST_CAMP.lon,FOREST_CAMP.lat)>15);
 }
 assert.deepEqual(forestColliders(),before);
 const blades=roadsideTuftData();
 assert.equal(blades.positions.length,blades.colors.length);
 assert.ok(blades.positions.every(Number.isFinite));
 assert.deepEqual(roadsideBudget('economy'),{stones:65,tufts:40});
 assert.ok(roadsideBudget('high').stones>roadsideBudget().stones);
});
