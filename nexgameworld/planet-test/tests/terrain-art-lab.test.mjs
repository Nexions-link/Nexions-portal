import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {ART_LAB,artLabNormal,artLabBiomeHeight,artLabHeight,
 artLabWorldPoint,artLabPathZ,artLabMaterialWeights,artLabSurfaceQuality,
 artLabGroundDetails} from '../terrain-art-lab.js';
import {ART_MATERIALS,artLabTileLayout,createArtLabTextures}
 from '../terrain-art-materials.js';

test('P2.4.1 art laboratory is a remote isolated sector of the existing planet',()=>{
 assert.ok(ART_LAB.lon>2.2&&ART_LAB.lon<2.7);
 assert.ok(ART_LAB.lat>.1);
 assert.equal(ART_LAB.radius,261);
 assert.ok(ART_LAB.halfSize>=15);
 assert.equal(ART_LAB.treeSites.length,5);
 const center=artLabNormal(0,0),len=Math.hypot(...center);
 assert.ok(Math.abs(len-1)<1e-12);
 const [x,y,z]=artLabWorldPoint(0,0,.2);
 assert.ok(Math.abs(Math.hypot(x,y,z)-(261+artLabHeight(0,0)+.2))<1e-8);
 assert.ok(Number.isFinite(artLabBiomeHeight(center)));
 const along=artLabNormal(5,0),other=artLabNormal(0,5);
 assert.ok(Math.abs(Math.hypot(...along)-1)<1e-12);
 assert.ok(Math.abs(Math.hypot(...other)-1)<1e-12);
 assert.notDeepEqual(center,along);
 assert.notDeepEqual(center,other);
});

test('five original material families mix smoothly and have recognizable natural zones',()=>{
 assert.deepEqual(ART_LAB.materialNames,ART_MATERIALS.map(m=>m.name));
 assert.deepEqual(ART_MATERIALS.map(m=>m.id),['meadow','loam','moss','litter','trail']);
 assert.equal(artLabTileLayout().length,5);
 for(let x=-15;x<16;x+=2.5)for(let z=-15;z<16;z+=2.5){
  const weights=artLabMaterialWeights(x,z);
  assert.equal(weights.length,5);
  assert.ok(weights.every(w=>Number.isFinite(w)&&w>=0&&w<=1));
  assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12);
  const w2=artLabMaterialWeights(x+.03,z+.03);
  assert.ok(weights.every((w,i)=>Math.abs(w-w2[i])<.12));
 }
 const grass=artLabMaterialWeights(-10,8);
 const forest=artLabMaterialWeights(9,8);
 assert.ok(grass[0]>forest[0]);
 assert.ok(forest[1]+forest[2]+forest[3]>grass[1]+grass[2]+grass[3]);
 const track=artLabMaterialWeights(0,artLabPathZ(0));
 assert.ok(track[4]>.5);
});

test('decorative layout is deterministic and avoids the walking trail',()=>{
 const a=artLabGroundDetails(),b=artLabGroundDetails();
 assert.deepEqual(a,b);
 assert.ok(a.grasses.length>50);
 assert.ok(a.leaves.length>50);
 for(const point of [...a.grasses,...a.leaves,...a.pebbles]){
  assert.ok(Math.abs(point.x)<16&&Math.abs(point.z)<16);
  assert.ok(point.size>.4);
  assert.ok(artLabMaterialWeights(point.x,point.z)[4]<=.32);
  assert.ok(ART_LAB.treeSites.every(([x,z])=>Math.hypot(point.x-x,point.z-z)>=1.8));
 }
 assert.ok(artLabSurfaceQuality('high').atlas>artLabSurfaceQuality('balanced').atlas);
 assert.ok(artLabSurfaceQuality('balanced').atlas>artLabSurfaceQuality('economy').atlas);
});

test('P2.4 uses five own painted atlas layers with original roughness and normal maps',()=>{
 const fake={
  createElement(){let g;
   return {width:0,height:0,getContext(){
    if(!g){
     let background=[115,111,75],color='#746f49';
     const context={globalAlpha:1,lineWidth:1,save(){},restore(){},
      translate(){},rotate(){},beginPath(){},ellipse(){},fill(){},stroke(){},
      moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},closePath(){},
      fillRect(){if(color?.startsWith('#')&&color.length===7)
       background=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16))},
      getImageData(){const data=new Uint8ClampedArray(256*256*4);
       for(let k=0;k<data.length;k+=4){data[k]=background[0];
        data[k+1]=background[1];data[k+2]=background[2];data[k+3]=255}
       return {data}}
     };
     Object.defineProperty(context,'fillStyle',{get(){return color},set(v){color=v}});
     g=context;
    }
    return g
   }}
  }
 };
 const atlas=createArtLabTextures(THREE,{size:512,documentRef:fake});
 assert.equal(atlas.atlasSize,512);
 assert.ok(atlas.map.isDataTexture);
 assert.ok(atlas.normalMap.isDataTexture);
 assert.ok(atlas.roughnessMap.isDataTexture);
 assert.equal(atlas.materials.length,5);
 const p=atlas.map.image.data;
 assert.equal(p.length,512*512*4);
 assert.ok(p.every(Number.isFinite));
 assert.ok(new Set(Array.from({length:70},(_,i)=>p[(i*512*7+i*3)*4])).size>5);
 assert.equal(atlas.normalMap.image.data[3],255);
 atlas.dispose();
 assert.throws(()=>createArtLabTextures(THREE,{size:200,documentRef:fake}),RangeError);
});

test('lab access is standalone and does not alter the authenticated hero or start zone',()=>{
 const html=readFileSync(new URL('../terrain-art-lab.html',import.meta.url),'utf8');
 const viewer=readFileSync(new URL('../terrain-art-lab-view.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const physics=readFileSync(new URL('../sphere-physics.js',import.meta.url),'utf8');
 assert.match(main,/id="openArtLab"/);
 assert.match(main,/href="\/nexgameworld\/planet-test\/terrain-art-lab.html"/);
 for(const id of ['labViewport','quality','compare','materials','fps','stick'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/import\('\.\/terrain-art-lab-view\.js\?v=6'\)/);
 assert.match(viewer,/ART_LAB\.treeSites/);
 assert.match(viewer,/createArtLabTextures/);
 assert.doesNotMatch(viewer,/createSphericalPresence|setCharacterPosition|fetch\(|WebSocket|accountLaunch/);
 assert.doesNotMatch(world,/terrain-art-lab|artLabMaterialWeights/);
 assert.doesNotMatch(physics,/terrain-art-lab|ART_LAB/);
});
