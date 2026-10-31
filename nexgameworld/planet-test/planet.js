import * as THREE from 'three';
import {screenMoveVector,turnTowardsAngle} from '../movement-controls.js?v=0.3.7.0';
import {readPlanetView,writePlanetView} from './world-save.js?v=3';
import {cameraObstruction,createCameraProbe,isInLonghouse,canWalkCamp} from './sphere-physics.js?v=17';
import {settleCameraLook} from './camera-look-smoothing.js?v=1';
import {createFrameProfiler,selectFrameScene} from './frame-performance.js?v=1';
import {createShadowRefreshBudget} from './render-budget.js?v=2';
import {createForestSpatialBatches} from './forest-spatial-batches.js?v=1';
import {paintTrackedQuestOnMinimap,paintMinimapPlaces} from './quest-map-overlay.js?v=5';
import {QUEST_GIVERS,trackedQuestMap} from './starter-quest-guidance.js?v=8';
import {EXPEDITION_SCOUT,EXPEDITION_SITES,readExpedition} from './expedition-quest.js?v=1';
import {sphericalSlideStep} from './sphere-slide.js?v=1';
import {forestTrailLatitude,forestLocalPoint,FOREST_ENTRANCE_LONGITUDE,FOREST_TRAIL_END} from './whispering-forest.js?v=28';
import {createWhisperingForest,forestMoodAt} from './whispering-forest.js?v=28';




import {createForestGroundTexture,forestTextureMask} from './forest-ground-texture.js?v=5';



import {WORLD_ART_PALETTE as ART} from './world-art-style.js?v=1';
import {forestSurfaceRecess,forestBackgroundIndices} from './forest-surface-profile.js?v=2';

import {createArtSafetyController} from './art-safety.js?v=1';
import {createG11AmbientTrunkGeometry} from './trunk-silhouette-g11.js?v=1';
import {VISUAL_REFERENCE_VIEWS,getVisualReferenceView,referenceViewPose} from './reference-viewpoints.js?v=1';
import {captureVisualWebGLFrame,createVisualCaptureStore,makeVisualSnapshotMeta,compareVisualSnapshotMeta} from './visual-capture.js?v=1';

import {createForestLightPools,forestCanopyShadeAt,forestLightResponse} from './forest-lighting.js?v=3';
import {modernPreviewEnabled,modernLightingValues} from './modern-lighting-preview.js?v=1';
import {installTouchButtons,installSurfaceZoomGuard,createPointerJoystick} from './touch-input.js?v=2';
import {installDraggableHudButton,SPELLBOOK_POSITION_KEY,MOUNT_POSITION_KEY} from './target-button-drag.js?v=3';
import {createKeyboardMovement,isEditableTarget} from './keyboard-movement.js?v=1';
import {createOfflineRpg} from './offline-rpg.js?v=160';
import {createSphericalPresence} from './sphere-online.js?v=28';
import {syncForestWolfMount} from './mount-visual.js?v=4';
import {createMountControls} from './mount-controls.js?v=3';
import {getAccountLaunch,fetchAuthenticatedProfile,AUTH_WORLD_URL} from './account-session.js?v=2';
import {animateSphericalTauren} from './tauren-animation.js?v=12';
import {advanceStridePhase,movementStrength,turnStrength} from './locomotion.js?v=1';
import {sampleChargeMotion,chargeTravelHeading,easeChargeHeading} from './charge-motion.js?v=1';
import {sampleSphericalFooting} from './foot-placement.js?v=2';
import {GRAPHICS_PRESETS,resolveGraphicsPreset,effectivePixelRatio,graphicsDensity} from './graphics-quality.js?v=3';
import {START_RADIUS,ROUTES,LAKE,normalToLocal,startHeightAt,startColorAt,lakeRadius,canWadeAtLocal,createStartZone,createTauren,initStartZoneMath,startVisualRouteSegments} from './start-zone.js?v=56';
initStartZoneMath(THREE);

// Optional visuals must never prevent core world modules from loading. A
// missing or corrupted remaster module is reported and activates base art.
const optionalArtImports=await Promise.allSettled([
 import('./forest-atmosphere.js?v=1'),
 import('./forest-floor.js?v=2'),
 import('./forest-ground-life.js?v=3'),
 import('./forest-understory.js?v=4'),
 import('./surface-microdetail.js?v=2'),
 import('./soil-scatter.js?v=2'),
 import('./roadside-details.js?v=2'),
 import('./painterly-biome.js?v=5'),
 import('./forest-ecology.js?v=6'),
 import('./road-verge.js?v=1'),
 import('./ground-stones-g10.js?v=1'),
 import('./forest-surface.js?v=2')
]);
const optionalArtCreators=Object.fromEntries([
 ['createForestAtmosphere',optionalArtImports[0].status==='fulfilled'?
  optionalArtImports[0].value.createForestAtmosphere:null],
 ['createForestFloor',optionalArtImports[1].status==='fulfilled'?
  optionalArtImports[1].value.createForestFloor:null],
 ['createForestGroundLife',optionalArtImports[2].status==='fulfilled'?
  optionalArtImports[2].value.createForestGroundLife:null],
 ['createForestUnderstory',optionalArtImports[3].status==='fulfilled'?
  optionalArtImports[3].value.createForestUnderstory:null],
 ['createSurfaceMicrodetail',optionalArtImports[4].status==='fulfilled'?
  optionalArtImports[4].value.createSurfaceMicrodetail:null],
 ['createSoilScatter',optionalArtImports[5].status==='fulfilled'?
  optionalArtImports[5].value.createSoilScatter:null],
 ['createRoadsideDetails',optionalArtImports[6].status==='fulfilled'?
  optionalArtImports[6].value.createRoadsideDetails:null],
 ['createPainterlyBiome',optionalArtImports[7].status==='fulfilled'?
  optionalArtImports[7].value.createPainterlyBiome:null],
 ['createForestEcology',optionalArtImports[8].status==='fulfilled'?
  optionalArtImports[8].value.createForestEcology:null],
 ['createRoadVerge',optionalArtImports[9].status==='fulfilled'?
  optionalArtImports[9].value.createRoadVerge:null],
 ['createG10GroundStones',optionalArtImports[10].status==='fulfilled'?
  optionalArtImports[10].value.createG10GroundStones:null],
 ['createForestSurface',optionalArtImports[11].status==='fulfilled'?
  optionalArtImports[11].value.createForestSurface:null]
]);
const missingArtModules=["createForestAtmosphere","createForestFloor","createForestGroundLife","createForestUnderstory","createSurfaceMicrodetail","createSoilScatter","createRoadsideDetails","createPainterlyBiome","createForestEcology","createRoadVerge","createG10GroundStones","createForestSurface"].filter(name=>!optionalArtCreators[name]);
const createForestAtmosphere=optionalArtCreators.createForestAtmosphere;
const createForestFloor=optionalArtCreators.createForestFloor;
const createForestGroundLife=optionalArtCreators.createForestGroundLife;
const createForestUnderstory=optionalArtCreators.createForestUnderstory;
const createSurfaceMicrodetail=optionalArtCreators.createSurfaceMicrodetail;
const createSoilScatter=optionalArtCreators.createSoilScatter;
const createRoadsideDetails=optionalArtCreators.createRoadsideDetails;
const createPainterlyBiome=optionalArtCreators.createPainterlyBiome;
const createForestEcology=optionalArtCreators.createForestEcology;
const createRoadVerge=optionalArtCreators.createRoadVerge;
const createG10GroundStones=optionalArtCreators.createG10GroundStones;
const createForestSurface=optionalArtCreators.createForestSurface;


// Independent pointer streams for joystick, UI buttons and camera gestures.
// Safari's double-tap protection applies only to the 3D surface.
const planetViewport=document.getElementById('viewport');
installTouchButtons(document);
installDraggableHudButton(document.getElementById('targetNext'));
installDraggableHudButton(document.getElementById('spellbookButton'),{storageKey:SPELLBOOK_POSITION_KEY});
const mountButtonDrag=installDraggableHudButton(document.getElementById('mountButton'),{storageKey:MOUNT_POSITION_KEY});
installSurfaceZoomGuard(document,planetViewport);
planetViewport.addEventListener('selectstart',event=>event.preventDefault());
planetViewport.addEventListener('contextmenu',event=>event.preventDefault());

// NexGameWorld uses isolated spherical WebSockets for player presence; RPG combat stays local.
const isPortalPreview = new URLSearchParams(location.search).get('portal-preview') === '1';
const modernGraphicsPreview=!isPortalPreview&&modernPreviewEnabled(location.search);
const accountMode=!isPortalPreview;
const accountLaunch=accountMode?getAccountLaunch(sessionStorage):null;
if(accountMode&&!accountLaunch){
 location.replace('/nexgameworld/account.html');
 throw Error('Сначала войдите в аккаунт и выберите персонажа');
}
const accountProfile=accountMode?await fetchAuthenticatedProfile(accountLaunch):null;
const BASE_RADIUS = START_RADIUS;
const AVAILABLE_RADII = [BASE_RADIUS];
const previousWorld=(isPortalPreview||accountMode)?null:readPlanetView(localStorage,AVAILABLE_RADII);
// Online size belongs to the server; local settings cannot resize the world.
const R = accountProfile?.worldRadius??BASE_RADIUS;
const WALK_SPEED = 4.05;
const TAU = Math.PI * 2;
const NAMES = ['Степь Рассвета', 'Шепчущий лес', 'Янтарные пустоши', 'Каменные высоты'];
const LABELS = ['ЛУГА И ПЕРВЫЙ ЛАГЕРЬ', 'ДРЕВНИЕ ДЕРЕВЬЯ', 'ПЕСКИ И УТЁСЫ', 'ГОРЫ И ХОЛОДНЫЕ ВЕТРА'];
const COLORS = [new THREE.Color('#86a969'), new THREE.Color('#4d825d'), new THREE.Color('#bc9a5e'), new THREE.Color('#849088')];
const $ = id => document.getElementById(id);
const viewport = $('viewport');
const progressEl = $('progress');
const distanceEl = $('distance');
const zoneName = $('zoneName');
const zoneLabel = $('zoneLabel');
const loading = $('loading');
const failure = $('failure');
const clamp = THREE.MathUtils.clamp;
const yAxis = new THREE.Vector3(0, 1, 0);
const v = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 562143;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = x => (x % TAU + TAU) % TAU;
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const unitAt = (lon, lat) => v(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
function localToNormalAt(x,z,r){
  const d=Math.hypot(x,z);
  if(d<1e-7)return v(0,0,1);
  const angle=d/r,scale=Math.sin(angle)/d;
  return v(x*scale,z*scale,Math.cos(angle));
}
function sectorIndex(lon) { return Math.floor(wrap(lon + Math.PI / 4) / (Math.PI / 2)) % 4; }
function biomeWeights(lon) {
  const w = [];
  for (let i = 0; i < 4; i++) {
    const d = angleDelta(lon, i * Math.PI / 2);
    w.push(Math.exp(-Math.pow(d / .80, 4)));
  }
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / sum);
}
function baseHeightAt(n) {
  const lon = Math.atan2(n.x, n.z);
  const b = biomeWeights(lon);
  const undulations = Math.sin(n.x * 21 + n.z * 7) * Math.cos(n.y * 27 - n.z * 18) * .58
    + Math.sin(n.z * 14 + n.y * 11) * .68;
  const ridge = Math.pow(Math.abs(Math.sin(n.x * 28 + n.z * 13) * Math.cos(n.y * 12 + n.x * 5)), 1.6);
  const mountain = b[3] * (ridge * 8.5 + 1.2 * Math.sin(n.z * 8));
  const dunes = b[2] * (1.5 * Math.cos(n.x * 23 + n.z * 18) + .5);
  const ice = smooth(.78, .94, Math.abs(n.y)) * 2.5;
  return undulations + mountain + dunes + ice;
}
function heightAt(n) {
  const local=normalToLocal(n,R),blend=1-smooth(68,85,local.d);
  if(blend<=0)return baseHeightAt(n);
  return baseHeightAt(n)*(1-blend)+startHeightAt(local.x,local.z)*blend;
}
// The dense starting-zone tile covers the fine shoreline and paths;
// recess the coarse background sphere under it to prevent z-fighting.
let forestSurfaceActive=false;
function backgroundHeightAt(n) {
  const local=normalToLocal(n,R);
  const forestDepth=forestSurfaceActive?forestSurfaceRecess(
   Math.atan2(n.x,n.z),Math.asin(clamp(n.y,-1,1)),R):0;
  return heightAt(n)-(1-smooth(70,85,local.d))*3.4-forestDepth;
}
function colorAt(n, h) {
  const weights = biomeWeights(Math.atan2(n.x, n.z));
  const color = new THREE.Color(0x000000);
  for (let i = 0; i < 4; i++) { color.r += COLORS[i].r * weights[i]; color.g += COLORS[i].g * weights[i]; color.b += COLORS[i].b * weights[i]; }
  const grain = Math.sin(n.x * 101 + n.z * 67) * Math.cos(n.y * 91 - n.x * 54) * .055;
  color.offsetHSL(0, 0, grain - Math.max(0, h) * .002);
  const polar = smooth(.78, .98, Math.abs(n.y));
  if (polar > 0) color.lerp(new THREE.Color('#e5e5d6'), polar);
  const local=normalToLocal(n,R),mix=1-smooth(69,85,local.d);
  if(mix>0){const rgb=startColorAt(local.x,local.z);color.lerp(new THREE.Color(rgb[0],rgb[1],rgb[2]),mix);}
  return color;
}

try {
  const scene = new THREE.Scene();
  const forestSpatial=createForestSpatialBatches(THREE,{scene,planetRadius:R});
  const skyDay = new THREE.Color(ART.light.sky);
  const skyNight = new THREE.Color('#101c32');
  scene.background = skyDay;
  // Improved near/far clipping for mobile depth buffer precision.
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .48, 1300);
  function updateCameraClipping() {
    camera.near = state.orbit ? 1.5 : .48;
    camera.far = state.orbit ? Math.max(1700, R * 7) : Math.max(1050, R * 3.8);
    camera.updateProjectionMatrix();
  }
  const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'default'});
  renderer.setPixelRatio(effectivePixelRatio('balanced',window.devicePixelRatio||1,isPortalPreview));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  viewport.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  const skyFill=new THREE.HemisphereLight(ART.light.ambientSky,ART.light.ambientGround,1.95);
  scene.add(skyFill);
  const sun = new THREE.DirectionalLight(ART.light.sun,2.50);
  sun.position.set(130, 225, 155);
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#b4dbe9', .62);
  fill.position.set(-100, -40, -150);
  scene.add(fill);
  // Near-camera shadows only: never render a whole-planet shadow pass.
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // Never render an unchanged shadow pass solely because the camera drew.
  renderer.shadowMap.autoUpdate=false;
  const shadowBudget=createShadowRefreshBudget();
  const localFog=new THREE.Fog(skyDay,105,290);
  const forestFogColor=new THREE.Color('#809b88');
  const forestAmbientColor=new THREE.Color('#bfd6c4');
  const modernAmbientTint=new THREE.Color('#a7bace');
  const forestSkyColor=new THREE.Color('#a3beb1');
  const blendedForestSky=new THREE.Color();
  sun.shadow.camera.left=-31;sun.shadow.camera.right=31;
  sun.shadow.camera.top=31;sun.shadow.camera.bottom=-31;
  sun.shadow.camera.near=1;sun.shadow.camera.far=120;
  sun.shadow.bias=-.00035;sun.shadow.normalBias=.035;
  sun.shadow.camera.updateProjectionMatrix();

  // Build a genuine closed triangulated sphere, rather than a flat wrapping map.
  const groundGeo = new THREE.SphereGeometry(R, 180, 112);
  const completeGroundIndex=groundGeo.index;
  let coveredGroundIndex=null;
  const pos = groundGeo.attributes.position;
  const colorData = new Float32Array(pos.count * 3);
  const groundDirections = new Float32Array(pos.count * 3);
  // One baked texture on the existing opaque globe, never a replacement shader.
  const groundTexture=isPortalPreview?null:createForestGroundTexture(THREE);
  const n0 = new THREE.Vector3();
  const neutralForest=new THREE.Color('#ffffff');
  for (let i = 0; i < pos.count; i++) {
    n0.fromBufferAttribute(pos, i).normalize();
    groundDirections.set([n0.x, n0.y, n0.z], i * 3);
    const h = heightAt(n0), backgroundElevation=backgroundHeightAt(n0);
    pos.setXYZ(i, n0.x * (R + backgroundElevation), n0.y * (R + backgroundElevation), n0.z * (R + backgroundElevation));
    const c = colorAt(n0, h);
    if(groundTexture){
      const lon=Math.atan2(n0.x,n0.z),lat=Math.asin(clamp(n0.y,-1,1));
      c.lerp(neutralForest,forestTextureMask(lon,lat));
    }
    colorData[i * 3] = c.r; colorData[i * 3 + 1] = c.g; colorData[i * 3 + 2] = c.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
  groundGeo.computeVertexNormals();
  // Guaranteed opaque stock Three.js ground material. Never allow a failed custom
  // fragment shader to make the planet vanish on mobile Safari.
  const groundMaterial=new THREE.MeshStandardMaterial({map:groundTexture,vertexColors:true,roughness:1,
    flatShading:false,transparent:false,depthWrite:true,side:THREE.FrontSide});
  const ground=new THREE.Mesh(groundGeo,groundMaterial);
  scene.add(ground);
  // Reposition vertex data from immutable unit directions, so switching size
  // never accumulates distortion or scales terrain elevation in metres.
  function reshapeGround() {
    for (let i = 0; i < pos.count; i++) {
      const j = i * 3;
      n0.set(groundDirections[j], groundDirections[j+1], groundDirections[j+2]);
      const elevation = backgroundHeightAt(n0), distance = R + elevation;
      pos.setXYZ(i, n0.x * distance, n0.y * distance, n0.z * distance);
    }
    pos.needsUpdate = true;
    groundGeo.computeVertexNormals();
    groundGeo.attributes.normal.needsUpdate = true;
    groundGeo.computeBoundingSphere();
    groundGeo.computeBoundingBox();
  }
  function updateGroundCoverage(covered){
    if(covered&&!coveredGroundIndex)
      coveredGroundIndex=new THREE.BufferAttribute(forestBackgroundIndices(groundGeo,R),1);
    const index=covered?coveredGroundIndex:completeGroundIndex;
    if(groundGeo.index!==index){groundGeo.setIndex(index);groundGeo.computeVertexNormals();}
  }
  // Atmosphere is intentionally subtle; it only appears in orbital view.
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(BASE_RADIUS + 12, 60, 36),
    new THREE.MeshBasicMaterial({color: '#bde9eb', side: THREE.BackSide, transparent: true, opacity: .10, depthWrite: false})
  );
  scene.add(atmosphere);
  atmosphere.visible = false;

  const starsGeo = new THREE.BufferGeometry();
  const starPoints = [];
  for (let i = 0; i < 480; i++) {
    const z = random() * 2 - 1;
    const a = random() * TAU;
    const r = Math.sqrt(1 - z * z);
    starPoints.push(Math.cos(a) * r * 650, Math.sin(a) * r * 650, z * 650);
  }
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3));
  const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({color: '#fff8de', size: 1.9, sizeAttenuation: false, transparent: true, opacity: .8}));
  scene.add(stars);
  stars.visible = false;

  const trunkData = [], foliageData = [], pineData = [], rockData = [], cactusData = [], flowerData = [];
  const chance = p => random() < p;
  for (let i = 0; i < 1020; i++) {
    const lon = random() * TAU;
    const lat = (random() - .5) * 1.48;
    const b = sectorIndex(lon);
    // Keep the starting village clear.
    if (Math.abs(angleDelta(lon, 0)) < .13 && Math.abs(lat) < .12) continue;
    // The new tall forest replaces small placeholder trees in this corridor.
    if (lon>.18&&lon<1.52&&Math.abs(lat-(-.02))<.46) continue;
    const scale = .7 + random() * .8;
    const p = {lon, lat, scale, spin: random() * TAU, tint: random()};
    if (b === 0 && chance(.23) || b === 1 && chance(.83) || b === 3 && chance(.38)) {
      trunkData.push(p);
      (b === 3 || b === 1 && chance(.65) ? pineData : foliageData).push(p);
    } else if (b === 2 && chance(.42)) cactusData.push(p);
    else if (chance(.52)) rockData.push(p);
    else flowerData.push(p);
  }
  // Keep the same instance geometry and scale across planet sizes.
  const instanceLayers = [];
  function instances(points, geo, material, centerY, dimensions, tintFn) {
    if (!points.length) return null;
    const mesh = new THREE.InstancedMesh(geo, material, points.length);
    const matrix = new THREE.Object3D();
    const q = new THREE.Quaternion();
    for (let i = 0; i < points.length; i++) {
      const p = points[i], normal = unitAt(p.lon, p.lat);
      const alt = R + heightAt(normal);
      matrix.position.copy(normal).multiplyScalar(alt + centerY * p.scale);
      q.setFromUnitVectors(yAxis, normal);
      matrix.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(yAxis, p.spin));
      matrix.scale.set(dimensions[0] * p.scale, dimensions[1] * p.scale, dimensions[2] * p.scale);
      matrix.updateMatrix();
      mesh.setMatrixAt(i, matrix.matrix);
      if (tintFn) mesh.setColorAt(i, new THREE.Color(tintFn(p)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false; // Globe wraps: avoid incorrect culling of an entire instanced forest.
    scene.add(mesh);
    instanceLayers.push({mesh, points, centerY, dimensions});
    return mesh;
  }
  function relocateInstances() {
    const matrix = new THREE.Object3D();
    const q = new THREE.Quaternion(), spin = new THREE.Quaternion();
    for (const layer of instanceLayers) {
      const {mesh,points,centerY,dimensions} = layer;
      for (let i=0; i<points.length; i++) {
        const p=points[i], normal=unitAt(p.lon,p.lat);
        matrix.position.copy(normal).multiplyScalar(R+heightAt(normal)+centerY*p.scale);
        q.setFromUnitVectors(yAxis,normal);
        matrix.quaternion.copy(q).multiply(spin.setFromAxisAngle(yAxis,p.spin));
        const local=normalToLocal(normal,R);
        if(local.d<84)matrix.scale.setScalar(.00001);
        else matrix.scale.set(dimensions[0]*p.scale,dimensions[1]*p.scale,dimensions[2]*p.scale);
        matrix.updateMatrix();
        mesh.setMatrixAt(i,matrix.matrix);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
  }
  instances(trunkData, createG11AmbientTrunkGeometry(THREE), new THREE.MeshStandardMaterial({color: '#80674a', roughness: 1, vertexColors: true}), .78, [1, 1, 1]);
  instances(foliageData, new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, flatShading: true}), 2.46, [1.55, 1.65, 1.55], p => p.tint > .6 ? '#89a65b' : '#5e934c');
  instances(pineData, new THREE.ConeGeometry(1.1, 3.5, 7), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, flatShading: true}), 2.38, [1, 1, 1], p => p.tint > .5 ? '#3e6f56' : '#57876a');
  instances(rockData, new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, flatShading: true}), .50, [.7, .48, .8], p => p.tint > .5 ? '#a8a28e' : '#8b8772');
  instances(cactusData, new THREE.CylinderGeometry(.33, .45, 2.5, 7), new THREE.MeshStandardMaterial({color: '#427761', roughness: 1}), 1.25, [1, 1, 1]);
  instances(flowerData, new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, flatShading: true}), .18, [.34, .32, .34], p => p.tint > .6 ? '#e7ca76' : '#acc485');

  // Camera preferences belong to the device, never to the server's hero position.
  const cameraStorageKey='nexgameworld-camera-preferences-v1';
  const cameraSettings=(()=>{
   try{
    const row=JSON.parse(localStorage.getItem(cameraStorageKey)||'null');
    return row&&Number.isFinite(row.zoom)&&row.zoom>=6&&row.zoom<=44&&
     typeof row.follow==='boolean'?row:null;
   }catch{return null;}
  })();
  // Detailed native camp, lake and authentic procedural Tauren are isolated in start-zone.js.
  const startZone=createStartZone(THREE,scene,()=>R,heightAt,{globeGeometry:groundGeo});
  // Core scene, blocking trees and game systems are never detached.
  const whisperingForest=createWhisperingForest(THREE,{scene,radius:R,heightAt});
  const artSafety=createArtSafetyController({
    scene,storage:localStorage,preview:isPortalPreview,
    onChange:({mode,lastFault,contextLost})=>{
      const toggle=$('artRemasterToggle'),help=$('artRemasterStatus');
      if(toggle)toggle.checked=mode==='enhanced';
      if(help)help.textContent=contextLost?'Контекст WebGL потерян. Ожидаем восстановления.':
       lastFault?'Безопасная графика включена: '+lastFault.stage+'. Включить ремастер повторно можно вручную.':
       mode==='enhanced'?'Ремастер включён. При ошибке графический слой отключится.':
       'Базовая графика: дополнительные декоративные слои выключены.';
    }
  });
  const ART_SCENE_ARGS={scene,radius:R,heightAt};
  if(missingArtModules.length){
    artSafety.renderError(new Error('Модули оформления не загрузились: '+missingArtModules.join(', ')));
  }
  artSafety.register('roadside',()=>createRoadsideDetails(THREE,{...ART_SCENE_ARGS,startRoute:ROUTES[1]}));
  artSafety.register('road-verge',()=>createRoadVerge(THREE,{
    ...ART_SCENE_ARGS,startSegments:startVisualRouteSegments(),lakeRadius
  }));
  artSafety.register('ground-stones-g10',()=>createG10GroundStones(THREE,{
    ...ART_SCENE_ARGS,startSegments:startVisualRouteSegments(),lakeRadius
  }));
  artSafety.register('forest-surface',()=>{
    forestSurfaceActive=true;reshapeGround();
    try{return createForestSurface(THREE,{...ART_SCENE_ARGS,globeGeometry:groundGeo});}
    catch(error){forestSurfaceActive=false;reshapeGround();throw error;}
  });
  artSafety.register('ecology',()=>createForestEcology(THREE,ART_SCENE_ARGS));
  artSafety.register('light-pools',()=>createForestLightPools(THREE,ART_SCENE_ARGS));
  artSafety.register('atmosphere',()=>createForestAtmosphere(THREE,ART_SCENE_ARGS));
  artSafety.register('forest-floor',()=>createForestFloor(THREE,ART_SCENE_ARGS));
  artSafety.register('ground-life',()=>createForestGroundLife(THREE,ART_SCENE_ARGS));
  artSafety.register('understory',()=>createForestUnderstory(THREE,ART_SCENE_ARGS));
  artSafety.register('painterly',()=>createPainterlyBiome(THREE,ART_SCENE_ARGS));
  artSafety.register('microdetail',()=>createSurfaceMicrodetail(THREE,ART_SCENE_ARGS),
    {when:preset=>preset!=='economy'});
  artSafety.register('soil-scatter',()=>createSoilScatter(THREE,ART_SCENE_ARGS),
    {when:preset=>preset!=='economy'});
  relocateInstances();
  const hero=createTauren(THREE,scene,{player:true});
  const actor=hero.root;
  const state = {
    normal:accountProfile?new THREE.Vector3(...accountProfile.positionNormal):previousWorld?new THREE.Vector3(...previousWorld.normal):unitAt(0,0),
    lonUnwrapped:previousWorld?.lonUnwrapped??0,meters:previousWorld?.meters??0,
    heading:accountProfile?.heading??previousWorld?.heading??0,cameraHeading:previousWorld?.cameraHeading??0,
    cameraPitch:previousWorld?.cameraPitch??.36,zoom:previousWorld?.zoom??cameraSettings?.zoom??13,
    cameraFollow:previousWorld?.cameraFollow??cameraSettings?.follow??false,
    orbit:false,orbitAngle:previousWorld?.orbitAngle??.45,
    orbitElevation:previousWorld?.orbitElevation??.34,
    orbitDistance:previousWorld?.orbitDistance??3.22,legCycle:0
  };
  // A multi-turn heading from a previous save still represents the same pose.
  state.heading=angleDelta(state.heading,0);
  const saveCameraSettings=()=>{
   if(isPortalPreview)return;
   try{localStorage.setItem(cameraStorageKey,JSON.stringify({zoom:state.zoom,follow:state.cameraFollow}))}catch{}
  };
  const saveWorld=()=>{
   if(isPortalPreview)return false;
   saveCameraSettings();
   return accountMode?false:writePlanetView(localStorage,state,R);
  };
  // Independent of existing save data and the multiplayer-disabled prototype.
  const graphicsStorageKey='nexgameworld-graphics-quality-v1';
  const fpsStorageKey='nexgameworld-show-fps-v1';
  function readPreference(key,fallback){try{return localStorage.getItem(key)??fallback}catch{return fallback}}
  function storePreference(key,value){try{localStorage.setItem(key,value)}catch{}}
  const graphicsSelect=$('graphicsQuality'),qualityHelp=$('qualityHelp');
  const fpsToggle=$('showFps'),fpsCounter=$('fpsCounter');
  const fpsCopy=$('copyFpsReport'),fpsReset=$('resetFpsReport'),fpsHelp=$('fpsHelp');
  const frameProfiler=createFrameProfiler();
  // Graphics settings belong exclusively to the menu; renderModal owns visibility.
  let qualityName=resolveGraphicsPreset(readPreference(graphicsStorageKey,'balanced'));
  if(isPortalPreview)qualityName='economy';
  let shadowActive=false;
  let combatQualitySink=null;
  function applyGraphicsQuality(){
    const profile=GRAPHICS_PRESETS[qualityName];
    const artEnabled=artSafety.update(qualityName,isPortalPreview);
    const forestSurface=artSafety.getLayer('forest-surface');
    const wantForestSurface=!!(artEnabled&&forestSurface);
    if(forestSurfaceActive!==wantForestSurface){
      forestSurfaceActive=wantForestSurface;reshapeGround();
    }
    updateGroundCoverage(wantForestSurface);
    const enabled=!isPortalPreview&&!state.orbit&&profile.shadowSize>0;
    renderer.setPixelRatio(effectivePixelRatio(qualityName,window.devicePixelRatio||1,isPortalPreview));
    renderer.toneMappingExposure=profile.exposure;
    if(sun.shadow.mapSize.x!==(profile.shadowSize||256)){
      sun.shadow.mapSize.set(profile.shadowSize||256,profile.shadowSize||256);
      if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
    }
    sun.castShadow=enabled;
    renderer.shadowMap.enabled=enabled;
    ground.receiveShadow=enabled;
    shadowBudget.reset();
    shadowActive=enabled;
    scene.fog=state.orbit||isPortalPreview?null:localFog;
    localFog.near=profile.fogNear;localFog.far=profile.fogFar;
    const sceneryDensity=graphicsDensity(qualityName);
    // The portal shows the latest village art without costly shadows or high DPR.
    if(isPortalPreview)sceneryDensity.detail=.68;
    const detail=artEnabled&&!isPortalPreview&&qualityName!=='economy'?
     artSafety.getLayer('microdetail'):null;
    forestSurface?.setSurfaceMaps(detail,qualityName);
    startZone.setGraphics({...sceneryDensity,waterColor:profile.waterColor,
     shadows:enabled,portal:isPortalPreview,
     microBump:detail?.reliefVillage||null,
     microNormal:detail?.normalVillage||null,
     microRoughness:detail?.roughnessVillage||null});
    // Use actual PBR maps on the existing opaque globe. A failed optional
    // layer leaves native low-cost bump and the core sphere intact.
    const normal=detail?.normalGlobe||null;
    const roughness=detail?.roughnessGlobe||null;
    const relief=!normal&&artEnabled&&!isPortalPreview&&qualityName!=='economy'?
     (detail?.reliefGlobe||groundTexture):null;
    if(groundMaterial.bumpMap!==relief||groundMaterial.normalMap!==normal||
       groundMaterial.roughnessMap!==roughness){
     groundMaterial.bumpMap=relief;
     groundMaterial.normalMap=normal;
     groundMaterial.roughnessMap=roughness;
     groundMaterial.needsUpdate=true;
    }
    groundMaterial.normalScale.set(qualityName==='high'?.40:.22,
     qualityName==='high'?.40:.22);
    groundMaterial.bumpScale=qualityName==='high'?.074:.043;
    whisperingForest.setQuality(qualityName,isPortalPreview);
    // Optional scenery presets are protected by artSafety.update above.
    hero.visualDetails?.setQuality(isPortalPreview?.68:profile.detail);
    combatQualitySink?.(isPortalPreview?.15:profile.detail);
    if(qualityHelp)qualityHelp.textContent=
      qualityName==='economy'?'Разреженная растительность, простая вода и без теней.':
      qualityName==='high'?'Самая плотная растительность, чёткая картинка, тени 1024 px.':
      'Умеренная растительность, мягкие тени 512 px и улучшенное озеро.';
    if(graphicsSelect)graphicsSelect.value=qualityName;
  }
  graphicsSelect?.addEventListener('change',()=>{
    qualityName=resolveGraphicsPreset(graphicsSelect.value);
    storePreference(graphicsStorageKey,qualityName);
    applyGraphicsQuality();
  });
  $('artRemasterToggle')?.addEventListener('change',event=>{
    artSafety.setMode(event.target.checked?'enhanced':'base',qualityName);
    applyGraphicsQuality();
  });
  if(fpsToggle&&fpsCounter){
    fpsToggle.checked=readPreference(fpsStorageKey,'false')==='true';
    fpsCounter.hidden=!fpsToggle.checked;
    fpsToggle.addEventListener('change',()=>{
      fpsCounter.hidden=!fpsToggle.checked;
      frameProfiler.reset();
      fpsCounter.textContent='FPS —';
      storePreference(fpsStorageKey,String(fpsToggle.checked));
    });
  }
  fpsCopy?.addEventListener('click',async()=>{
    const version=$('planetBuildWidget')?.dataset.build||'unknown';
    const report=frameProfiler.report({version,quality:qualityName});
    try{
      await navigator.clipboard.writeText(report);
      if(fpsHelp)fpsHelp.textContent='Показатели скопированы. Можно вставить их в чат.';
    }catch{
      if(fpsHelp)fpsHelp.textContent='Буфер обмена недоступен в этом браузере.';
    }
  });
  fpsReset?.addEventListener('click',()=>{
    frameProfiler.reset();
    if(fpsCounter)fpsCounter.textContent='FPS —';
    if(fpsHelp)fpsHelp.textContent='Замеры сброшены. Проверь камеру, бой и вход в дом.';
  });
  applyGraphicsQuality();
  let saveClock=0;
  const rpg=createOfflineRpg({THREE,scene,hero,makeTauren:options=>createTauren(THREE,scene,options),playerNormal:()=>state.normal,
   getRadius:()=>R,toNormal:(x,z,r)=>localToNormalAt(x,z,r),
   toLocal:normalToLocal,heightAt,camera,canvas,preview:isPortalPreview,
   authenticatedProfile:accountProfile});
  combatQualitySink=rpg.setVisualQuality;
  combatQualitySink(isPortalPreview?.15:GRAPHICS_PRESETS[qualityName].detail);
  let presenceMoving=false,chargeMotion=null,chargeRecovery=0,chargeLandingCorrection=null;
  let pendingNetworkRotation=null;
  const applyNetworkRotation=dt=>{
    if(!pendingNetworkRotation||chargeMotion)return;
    const radians=2*Math.acos(clamp(pendingNetworkRotation.w,-1,1));
    if(radians<1e-6){pendingNetworkRotation=null;return;}
    // At most 3.5 metres per second of correction, instead of teleporting
    // the scene backwards in one frame on a busy iPhone.
    const ratio=Math.min(1,Math.max(0,dt)*9,
      Math.max(0,dt)*3.5/Math.max(1e-6,radians*R));
    if(ratio<=0)return;
    const portion=new THREE.Quaternion().slerp(pendingNetworkRotation,ratio);
    const oldLon=Math.atan2(state.normal.x,state.normal.z);
    state.normal.applyQuaternion(portion).normalize();
    state.lonUnwrapped+=angleDelta(Math.atan2(state.normal.x,state.normal.z),oldLon);
    pendingNetworkRotation.premultiply(portion.invert());
    if(ratio>=1)pendingNetworkRotation=null;
  };
   let mountState='foot';
  function applyChargeLandingCorrection(event){
   if(!Array.isArray(event?.normal)||event.normal.length!==3||
      !event.normal.every(Number.isFinite))return;
   const latest=new THREE.Vector3(...event.normal);
   if(latest.lengthSq()<.9||latest.lengthSq()>1.1)return;
   const oldLon=Math.atan2(state.normal.x,state.normal.z);
   state.normal.copy(latest).normalize();
   state.lonUnwrapped+=angleDelta(Math.atan2(state.normal.x,state.normal.z),oldLon);
   if(Number.isFinite(event.heading))state.heading=angleDelta(event.heading,0);
   updateActor();
  }
  const connectionBanner=$('connectionBanner');
  const mountControls=createMountControls({document,
   onSummon:()=>onlinePresence?.summonMount(),
   onDismount:()=>onlinePresence?.dismount(),
   onNotice:message=>rpg.onPartyNotice({message})
  });
  mountControls.setLevel(accountProfile?.level??1);
  // The mount button begins hidden on iPhone: restore with its visible size.
  if(!document.getElementById('mountButton')?.hidden)mountButtonDrag?.restore();
  rpg.setMountControls(mountControls);
  const onlinePresence=isPortalPreview?null:createSphericalPresence({
    THREE,scene,
    createAvatar:options=>createTauren(THREE,scene,options),
    animateAvatar:animateSphericalTauren,
    getPosition:()=>({normal:state.normal.toArray(),heading:state.heading,radius:R,moving:presenceMoving}),
    getCharacter:()=>accountMode?{}:rpg.networkCharacter(),
    getBattlefuryPose:()=>rpg.getBattlefuryPose(),
    auth:accountLaunch,url:accountMode?AUTH_WORLD_URL:undefined,
    getRadius:()=>R,heightAt,
    onPlayers:rows=>rpg.onOnlinePlayers(rows),
    onMobs:rows=>rpg.onMobSnapshot(rows),
    onVitals:msg=>rpg.onVitals(msg),
    onCombat:(msg,selfId)=>rpg.onCombatEvent(msg,selfId),
    onKillCredit:msg=>rpg.onKillCredit(msg),
    onVerifiedProgress:(progress,source)=>{
      rpg.applyServerProgress(progress,source);
      mountControls.setLevel(progress?.level);
      if(!document.getElementById('mountButton')?.hidden)mountButtonDrag?.restore();
     },
     onMountChange:mount=>{
      mountState=mount.mountState==='riding'?'riding':'foot';
      mountControls.setMount(mount);
      rpg.refreshMountCollection();
     },
     onMountCast:event=>{mountControls.beginCast(event);rpg.refreshMountCollection();},
     onMountRejected:reason=>{mountControls.reject(reason);rpg.refreshMountCollection();},
    onChargeAccepted:message=>{
      if(!rpg.onChargeAccepted(message)||!Array.isArray(message.normal)||
         message.normal.length!==3||!message.normal.every(Number.isFinite))return;
      chargeLandingCorrection=null;
      chargeMotion={from:state.normal.clone(),to:new THREE.Vector3(...message.normal).normalize(),
       heading:message.heading,duration:Math.max(.1,Math.min(1,Number(message.durationMs||550)/1000)),
       elapsed:0,previousFraction:0,distance:0};
      chargeMotion.distance=chargeMotion.from.angleTo(chargeMotion.to)*R;
      chargeRecovery=0;
    },
    onChargeLanded:event=>{
      // The target can drift during the dash; apply the short, validated
      // authoritative correction after the local charge pose finishes.
      if(chargeMotion)chargeLandingCorrection=event;
      else applyChargeLandingCorrection(event);
    },
    onPositionCorrection:correction=>{
      if(chargeMotion)return;
      if(!Array.isArray(correction?.normal)||correction.normal.length!==3||
         !correction.normal.every(Number.isFinite))return;
      const target=new THREE.Vector3(...correction.normal).normalize();
      const distance=state.normal.angleTo(target)*R;
      // Collision, login resync and extreme divergence must remain instant.
      // Delayed snapshot/speed adjustments are softened, not ignored.
      const immediate=['resync','collision','position_out_of_range'].includes(correction.reason)||
        distance>9;
      if(immediate){
        pendingNetworkRotation=null;
        const oldLon=Math.atan2(state.normal.x,state.normal.z);
        state.normal.copy(target);
        state.lonUnwrapped+=angleDelta(Math.atan2(state.normal.x,state.normal.z),oldLon);
        if(Number.isFinite(correction.heading))state.heading=angleDelta(correction.heading,0);
        updateActor();
      }else if(distance>.06){
        pendingNetworkRotation=new THREE.Quaternion().setFromUnitVectors(state.normal,target);
      }
    },
    onEconomyResult:event=>rpg.onEconomyResult(event),
    onAuthRejected:reason=>rpg.onPartyNotice({message:reason}),
    onMobAttack:msg=>rpg.onMobAttack(msg),
     onMobStrike:(msg,selfId)=>rpg.onMobStrike(msg,selfId),
    onMobTelegraph:msg=>rpg.onMobTelegraph(msg),
    onRespawn:msg=>rpg.onNetworkRespawn(msg),
    onPartyState:msg=>rpg.onPartyState(msg),
    onPartyInvite:msg=>rpg.onPartyInvite(msg),
    onPartyNotice:msg=>rpg.onPartyNotice(msg),
    onChat:msg=>rpg.onChat(msg),
    onChatRejected:msg=>rpg.onPartyNotice({message:msg.reason}),
    onChestState:msg=>rpg.onChestState(msg),
    onChestStatus:msg=>rpg.onChestStatus(msg),
    onChestResult:msg=>rpg.onChestResult(msg),
    onCombatRejected:msg=>rpg.onChargeRejected(msg),
    onDisconnect:()=>{
      chargeMotion=null;chargeRecovery=0;chargeLandingCorrection=null;presenceMoving=false;mountState='foot';
      mountControls.setConnected(false);
      rpg.refreshMountCollection();
      rpg.onNetworkDisconnect();
      rpg.onPartyState({groupId:null,leaderId:null,members:[]});
    },
    onStatus:(value,count)=>{
      const mountOnline=value==='online';
      if(mountControls.connected!==mountOnline){
       mountControls.setConnected(mountOnline);
       rpg.refreshMountCollection();
      }
      const element=$('onlineStatus');
      if(element)element.textContent=value==='online'?'В мире: '+count+' игрок'+(count===1?'':count>=2&&count<=4?'а':'ов'):
        value==='connecting'?'Подключение к миру…':
        value==='syncing'?'Загружаем сохранение…':
        value==='reconnecting'?'Переподключение…':
        value==='auth_required'?'Требуется повторный вход':
        value==='incompatible'?'Версия сервера не совпадает':'Нет связи с сервером';
      if(!accountMode||!connectionBanner)return;
      const notice={
        connecting:'Подключаемся к игровому миру…',
        reconnecting:'Связь потеряна. Переподключаемся; действия приостановлены.',
        offline:'Сервер недоступен. Прогресс защищён; ждём подключения.',
        syncing:'Соединение есть. Сверяем сохранение персонажа…',
        auth_required:'Сессия истекла. Выбери персонажа повторно.',
        incompatible:'Версия клиента и сервера не совпадает. Перезагрузи игру.'
      };
      connectionBanner.hidden=value==='online';
      connectionBanner.textContent=notice[value]||notice.offline;
      connectionBanner.dataset.status=value;
    }
  });
  rpg.setMultiplayer(onlinePresence);
  window.addEventListener('pagehide',()=>{mountControls.dispose();onlinePresence?.close();});
  let prevHeading = 0;
  // Initialize before restoring orbital view or entering landing-page preview.
  let cameraSnap = true,windowOffset=0,chestCameraOffset=null;
  let referenceView=null,referencePose=null,referenceRestoreOrbit=false;
  const cameraGoal = new THREE.Vector3();
  const cameraProbe=createCameraProbe(THREE);
  const cameraRadial=new THREE.Vector3(),cameraCandidate=new THREE.Vector3();
  const cameraOffsetDirection=new THREE.Vector3(),cameraToHero=new THREE.Vector3();
  const actorForward=new THREE.Vector3();
  const cameraWorldRadius=()=>R;
  const focus = new THREE.Vector3();
  // Rendering-only smoothed look target. Authoritative player position is
  // never interpolated here; network corrections cannot snap the whole view.
  const cameraLookTarget=new THREE.Vector3();
  let hasCameraLookTarget=false,lastLookOrbit=null;
  const camForward = new THREE.Vector3();
  const tangentEast = new THREE.Vector3();
  const tangentNorth = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const right = new THREE.Vector3();
  const travel = new THREE.Vector3();
  const orientation = new THREE.Matrix4();
  function tangentBasis(normal) {
    const longitude = Math.atan2(normal.x, normal.z);
    tangentEast.set(Math.cos(longitude), 0, -Math.sin(longitude)).normalize();
    tangentNorth.crossVectors(normal, tangentEast).normalize();
  }
  function updateActor() {
    const normal = state.normal;
    tangentBasis(normal);
    const position = R + heightAt(normal);
    actor.position.copy(normal).multiplyScalar(position + .06);
    const fwd = actorForward.copy(tangentEast).multiplyScalar(Math.cos(state.heading))
      .addScaledVector(tangentNorth, Math.sin(state.heading)).normalize();
    // Tauren's face is model-local +Z; keep it facing the travel direction.
    right.crossVectors(normal, fwd).normalize();
    orientation.makeBasis(right, normal, fwd);
    actor.quaternion.setFromRotationMatrix(orientation);
  }
  function doReset() {
    state.normal.copy(unitAt(0, 0));
    state.lonUnwrapped = 0; state.meters = 0; state.heading = 0; state.cameraHeading = 0;
    state.cameraPitch = .36; state.legCycle = 0;
    updateActor(); updateHUD(true);saveWorld();
  }
  function updateHUD(force = false) {
    const completed = Math.floor(Math.abs(state.lonUnwrapped) / TAU);
    const percent = Math.floor((Math.abs(state.lonUnwrapped) / TAU - completed) * 100);
    progressEl.textContent = (completed > 0 && percent === 0 ? 100 : percent) + '%';
    distanceEl.textContent = Math.round(state.meters) + ' м · оборотов: ' + completed;
    const b=sectorIndex(Math.atan2(state.normal.x,state.normal.z));
    const local=normalToLocal(state.normal,R),inStartingZone=local.d<74;
    const forestName=forestMoodAt(Math.atan2(state.normal.x,state.normal.z),Math.asin(clamp(state.normal.y,-1,1)))>.35;
    const currentName=inStartingZone?'Стартовая зона NexGameWorld':forestName?'Шепчущий лес':NAMES[b];
    if(force||zoneName.textContent!==currentName){zoneName.textContent=currentName;zoneLabel.textContent=inStartingZone?'ЛАГЕРЬ · ОЗЕРО ТИХИХ ВОД':forestName?'ДРЕВНИЕ ДЕРЕВЬЯ · ЛЕСНАЯ ТРОПА':LABELS[b];$('area').textContent=inStartingZone?'Лагерь Нараче':currentName;}
    drawGlobe();
  }

  const joystick=createPointerJoystick($('stick'),$('nub'));
  const releaseStick=()=>joystick.release();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseStick()});

  // Desktop-only keypresses feed the existing camera-relative joystick path.
  // Touch listeners, stick state and iPhone gestures remain unchanged.
  const keyboard=createKeyboardMovement(window,document,{isGameActive:()=> $('modal')?.hidden!==false});
  window.addEventListener('keydown', e => {
    if(isEditableTarget(e.target)||isEditableTarget(document.activeElement)||
       e.altKey||e.ctrlKey||e.metaKey)return;
    const k=String(e.key||'').toLowerCase();
    if(k==='m'&&!e.repeat&&$('modal')?.hidden){e.preventDefault();mountControls.activate();return;}
    if(/^[1-8]$/.test(k)&&!e.repeat&&$('modal')?.hidden){
      e.preventDefault();rpg.handleSlotKey(k);
    }
  });
  window.addEventListener('blur', releaseStick);

  const touches = new Map();
  let followCooldown=0;
  let lastPinch = 0;
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    // Return focus from chat/UI to the 3D game on a desktop mouse click.
    // Never force focus on touch screens (iPhone/Safari).
    if(e.pointerType==='mouse'){canvas.tabIndex=0;canvas.focus({preventScroll:true})}
    canvas.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, {x:e.clientX,y:e.clientY});
    lastPinch = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    e.preventDefault();
    if(referencePose){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});return;}
    const last = touches.get(e.pointerId);
    if (touches.size === 1) {
      if (state.orbit) {
        // Horizontal orbit is intentionally reversed to match perceived globe motion.
        // Keep the vertical drag direction unchanged, as requested.
        const dragX=e.clientX-last.x, dragY=e.clientY-last.y;
        state.orbitAngle -= dragX * .006;
        state.orbitElevation = clamp(state.orbitElevation + dragY * .0045, -1.12, 1.12);
      } else {
        state.cameraHeading -= (e.clientX - last.x) * .007;
        state.cameraPitch = clamp(state.cameraPitch + (e.clientY - last.y) * .005, -.15, 1.22);
        if(Math.hypot(e.clientX-last.x,e.clientY-last.y)>.8)followCooldown=2.6;
      }
    }
    touches.set(e.pointerId, {x:e.clientX,y:e.clientY});
    if (touches.size === 2) {
      const p = [...touches.values()];
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (lastPinch) {
        if (state.orbit) state.orbitDistance = clamp(state.orbitDistance * lastPinch / Math.max(d, 2), 1.6, 5.5);
        else state.zoom = clamp(state.zoom * lastPinch / Math.max(d, 2), 6, 44);
      }
      lastPinch = d;
      updateZoomLabel();
    }
  });
  function untrack(e) { touches.delete(e.pointerId); lastPinch = 0; saveWorld(); }
  canvas.addEventListener('pointerup', untrack);
  canvas.addEventListener('pointercancel', untrack);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if(referencePose)return;
    if (state.orbit) state.orbitDistance = clamp(state.orbitDistance + e.deltaY * .002, 1.6, 5.5);
    else {state.zoom = clamp(state.zoom + e.deltaY * .015, 6, 44); updateZoomLabel();}
    saveWorld();
  }, {passive:false});
  const minimapToggle = $('minimapFrame');
  function togglePlanetView() {
    if(referenceView){
      referenceView=null;referencePose=null;referenceRestoreOrbit=false;
      const bar=$('referenceViewBar');if(bar)bar.hidden=true;
      const shield=$('referenceViewSurface');if(shield)shield.hidden=true;
      hasCameraLookTarget=false;
    }
    state.orbit = !state.orbit;
    stars.visible = state.orbit;
    atmosphere.visible = state.orbit;
    scene.background = state.orbit ? skyNight : skyDay;
    applyGraphicsQuality();
    // Mini-map is the single on-screen button for switching world views.
    minimapToggle.setAttribute('aria-pressed', String(state.orbit));
    minimapToggle.setAttribute('aria-label', state.orbit ?
      'Вернуться к персонажу — нажать миникарту' : 'Открыть всю планету — нажать миникарту');
    minimapToggle.title = state.orbit ? 'Вернуться к персонажу' : 'Вся планета';
    updateCameraClipping();
    cameraSnap = true;
    saveWorld();
  }
  minimapToggle.addEventListener('click', togglePlanetView);
  minimapToggle.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    togglePlanetView();
  });
  const cameraDistanceInput=$('cameraDistance'),cameraDistanceValue=$('cameraDistanceValue');
  const cameraFollowSwitch=$('cameraFollow');
  if(cameraFollowSwitch){
   cameraFollowSwitch.checked=state.cameraFollow;
   cameraFollowSwitch.addEventListener('change',()=>{
    state.cameraFollow=!!cameraFollowSwitch.checked;
    followCooldown=state.cameraFollow?1:0;
    saveWorld();
   });
  }
  function updateZoomLabel(){
    if(cameraDistanceInput)cameraDistanceInput.value=String(state.zoom);
    if(cameraDistanceValue)cameraDistanceValue.textContent=state.zoom.toFixed(1).replace('.',',')+' м';
  }
  if(cameraDistanceInput){cameraDistanceInput.min='6';cameraDistanceInput.max='44';}
  cameraDistanceInput?.addEventListener('input',e=>{
    state.zoom=clamp(Number(e.target.value)||13,6,44);
    updateZoomLabel();saveWorld();
  });
  updateZoomLabel();
  const referenceSelect=$('referenceViewSelect'),referenceBar=$('referenceViewBar');
  const referenceTitle=$('referenceViewTitle'),referenceDetails=$('referenceViewDetails');
  const referenceChecklist=$('referenceViewChecklist'),referenceMetrics=$('referenceViewMetrics');
  if(referenceSelect){
    for(const view of VISUAL_REFERENCE_VIEWS){
      const option=document.createElement('option');
      option.value=view.id;option.textContent=view.label;
      referenceSelect.appendChild(option);
    }
  }
  function activateReferenceView(id){
    if(isPortalPreview)return;
    const view=getVisualReferenceView(id);
    if(!view)return;
    if(!referenceView){
      referenceRestoreOrbit=state.orbit;
      if(state.orbit)togglePlanetView();
    }
    referenceView=view;
    referencePose=referenceViewPose(THREE,view,{radius:R,heightAt});
    if(referenceSelect)referenceSelect.value=view.id;
    if(referenceTitle)referenceTitle.textContent='R1 · '+view.label+' · '+view.zone;
    if(referenceDetails)referenceDetails.textContent='Было: '+view.baseline+' Цель: '+view.target;
    if(referenceChecklist)referenceChecklist.textContent=view.check;
    if(referenceMetrics){
      referenceMetrics.textContent='Нормаль '+referencePose.normal.toArray().map(v=>v.toFixed(4)).join(', ')+
       ' · курс '+view.heading.toFixed(2)+' рад · наклон '+view.pitch.toFixed(2)+
       ' рад · дистанция '+view.zoom+' м · FOV 58°';
    }
    if(referenceBar)referenceBar.hidden=false;
    const shield=$('referenceViewSurface');if(shield)shield.hidden=false;
    cameraSnap=true;hasCameraLookTarget=false;
    shadowBudget.reset();
    $('modalClose')?.click();
  }
  function leaveReferenceView(){
    if(!referenceView)return;
    referenceView=null;referencePose=null;
    if(referenceBar)referenceBar.hidden=true;
    const shield=$('referenceViewSurface');if(shield)shield.hidden=true;
    cameraSnap=true;hasCameraLookTarget=false;
    shadowBudget.reset();
    const restore=referenceRestoreOrbit;
    referenceRestoreOrbit=false;
    if(restore&&!state.orbit)togglePlanetView();
  }
  function cycleReferenceView(delta){
    const index=VISUAL_REFERENCE_VIEWS.findIndex(v=>v.id===referenceView?.id);
    const count=VISUAL_REFERENCE_VIEWS.length;
    activateReferenceView(VISUAL_REFERENCE_VIEWS[(index+delta+count)%count].id);
  }
  $('referenceViewEnter')?.addEventListener('click',()=>
    activateReferenceView(referenceSelect?.value||VISUAL_REFERENCE_VIEWS[0].id));
  $('referenceViewPrev')?.addEventListener('click',()=>cycleReferenceView(-1));
  $('referenceViewNext')?.addEventListener('click',()=>cycleReferenceView(1));
  $('referenceViewExit')?.addEventListener('click',leaveReferenceView);
  // G-02: voluntary local snapshots of the REAL Three.js scene. Never send
  // images or camera coordinates to the game server or change player state.
  let pendingVisualShot=null,visualShotBusy=false,visualUrls=[];
  let visualStore=null;
  const snapshotStatus=$('referenceCaptureStatus');
  const snapshotButtons=[$('referenceCaptureBaseline'),$('referenceCaptureCurrent')];
  function reportSnapshotStatus(message){
    if(snapshotStatus)snapshotStatus.textContent=message;
  }
  function getVisualStore(){
    if(!visualStore)visualStore=createVisualCaptureStore();
    return visualStore;
  }
  function captureShot(slot){
    if(visualShotBusy||!referencePose||!referenceView||isPortalPreview)return;
    visualShotBusy=true;
    for(const button of snapshotButtons)if(button)button.disabled=true;
    reportSnapshotStatus('Снимаем реальный кадр игрового мира…');
    // Consumed during the next rendered animation frame (no blank WebGL buffer).
    pendingVisualShot={slot,view:referenceView,pose:referencePose};
  }
  $('referenceCaptureBaseline')?.addEventListener('click',()=>captureShot('baseline'));
  $('referenceCaptureCurrent')?.addEventListener('click',()=>captureShot('current'));
  const visualCompare=$('referenceCompareOverlay'),visualSlider=$('referenceCompareRange');
  function closeVisualCompare(){
    if(visualCompare)visualCompare.hidden=true;
    for(const url of visualUrls)URL.revokeObjectURL(url);
    visualUrls=[];
    for(const id of ['referenceCompareBase','referenceCompareCurrent']){
      const img=$(id);if(img)img.removeAttribute('src');
    }
  }
  $('referenceCompareExit')?.addEventListener('click',closeVisualCompare);
  const setVisualSplit=()=>{
    const percent=Number(visualSlider?.value??50);
    if($('referenceCompareCurrent'))$('referenceCompareCurrent').style.clipPath=
      'inset(0 '+(100-percent)+'% 0 0)';
    if($('referenceCompareDivider'))$('referenceCompareDivider').style.left=percent+'%';
  };
  visualSlider?.addEventListener('input',setVisualSplit);
  const snapshotDescription=(label,row)=>{
    const m=row.metadata,location=m.location||'—';
    return label+' · Alpha '+m.version+'\n'+location+
      '\nГрафика: '+m.quality+' · '+m.screen.width+' × '+m.screen.height+
      ' · DPR '+m.screen.pixelRatio+'\nКамера: FOV '+m.camera.fov+'°'+
      '\nFPS: '+(m.fps??'—')+' · P95: '+(m.p95Ms??'—')+' мс'+
      '\n'+m.timestamp;
  };
  async function openVisualCompare(){
    if(!referenceView||visualShotBusy)return;
    try{
      const store=getVisualStore(),id=referenceView.id;
      const [baseline,current]=await Promise.all([store.get(id,'baseline'),store.get(id,'current')]);
      if(!baseline||!current){
        reportSnapshotStatus('Для сравнения сначала снимите «До» и «После» этого ракурса.');
        return;
      }
      closeVisualCompare();
      const a=URL.createObjectURL(baseline.blob),b=URL.createObjectURL(current.blob);
      visualUrls=[a,b];
      $('referenceCompareBase').src=a;$('referenceCompareCurrent').src=b;
      const photos=$('referenceComparePhotos');
      if(photos)photos.style.aspectRatio=baseline.width+'/'+baseline.height;
      const warnings=compareVisualSnapshotMeta(baseline.metadata,current.metadata);
      if(photos)photos.style.borderColor=warnings.length?'#d59469':'#a3916c';
      $('referenceCompareWarnings').textContent=warnings.length?
       'Параметры отличаются: '+warnings.join('; '):
       'Ракурс и условия сравнения совпадают. Изображения — реальный рендер WebGL, без HUD.';
      $('referenceCompareBaseInfo').textContent=snapshotDescription('ДО',baseline);
      $('referenceCompareCurrentInfo').textContent=snapshotDescription('ПОСЛЕ',current);
      $('referenceCompareTitle').textContent='G-02 · '+referenceView.label+' · сравнение';
      if(visualSlider)visualSlider.value='50';
      setVisualSplit();
      if(visualCompare)visualCompare.hidden=false;
    }catch(error){
      reportSnapshotStatus('Сравнение недоступно: '+(error?.message||String(error)));
    }
  }
  $('referenceCaptureCompare')?.addEventListener('click',openVisualCompare);
  async function performVisualShot(request){
    try{
      if(!referencePose||referenceView?.id!==request.view.id)
        throw new Error('Ракурс изменился до создания снимка');
      const stats=frameProfiler.stats('world');
      const metadata=makeVisualSnapshotMeta({
        version:$('planetBuildWidget')?.dataset.build||'unknown',
        view:request.view,quality:qualityName,
        normal:request.pose.normal.toArray(),
        position:camera.position.toArray(),focus:request.pose.focus.toArray(),
        fov:camera.fov,screenWidth:innerWidth,screenHeight:innerHeight,
        pixelRatio:renderer.getPixelRatio(),stats
      });
      const shot=await captureVisualWebGLFrame(THREE,renderer,scene,camera);
      await getVisualStore().put(request.view.id,request.slot,{
        blob:shot.blob,width:shot.width,height:shot.height,metadata
      });
      reportSnapshotStatus('Сохранён '+(request.slot==='baseline'?'кадр «До»':'кадр «После»')+
       ': Alpha '+metadata.version+' · '+shot.width+' × '+shot.height+'. Хранится только на устройстве.');
    }catch(error){
      reportSnapshotStatus('Не удалось сохранить: '+(error?.message||String(error)));
    }finally{
      visualShotBusy=false;
      for(const button of snapshotButtons)if(button)button.disabled=false;
    }
  }
  const footer = $('footer');
  function updateWorldMetrics() {
    const length = TAU * R;
    const totalSeconds = Math.round(length / WALK_SPEED);
    const duration = Math.floor(totalSeconds / 60) + ':' + String(totalSeconds % 60).padStart(2,'0');
    updateCameraClipping();
    footer.textContent = 'Радиус ' + R + ' м · окружность ' + Math.round(length) + ' м · без переходов';
    $('instruction').querySelector('div').textContent = 'Джойстик — двигаться · свайп — камера · Экватор: ' + duration;
  }
  rpg.onRespawn(()=>{doReset();cameraSnap=true;});
  rpg.onResetProgress(()=>{
    // Return to the camp after resetting quests, without changing graphics,
    // zoom, follow-camera preference, or the server-defined planet size.
    state.orbit=false;
    doReset();
    cameraSnap=true;
  });
  updateWorldMetrics();
  // Atmosphere geometry is created at BASE_RADIUS, so scale it even when
  // a larger saved radius is restored without a resize event.
  atmosphere.scale.setScalar((R+12)/(BASE_RADIUS+12));
  if(previousWorld?.orbit)togglePlanetView();
  if(isPortalPreview){
    state.orbitDistance=2.45;
    // Village centre: longhouse, four tents and campfire occupy roughly
    // x=-8, z=2 in the real starting-zone coordinates.
    // Aim the orbital camera along that exact surface normal so the village
    // is centred on the visible globe when the homepage first opens.
    const villageNormal=localToNormalAt(-8,2,R);
    state.orbitAngle=Math.atan2(villageNormal.x,villageNormal.z);
    state.orbitElevation=Math.asin(villageNormal.y);
    togglePlanetView(); // Show the actual current planet in orbital view.
    // The landing page overlays gesture capture and forwards deltas. Ignore
    // messages from other origins. Nothing here touches the game's saves.
    window.addEventListener('message',event=>{
      if(event.source!==window.parent||event.origin!=='https://nexions.ru')return;
      const input=event.data;
      if(!input||input.type!=='nexgameworld-globe'||!state.orbit)return;
      if(input.action==='drag'){
        const dx=Number(input.dx),dy=Number(input.dy);
        if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
        state.orbitAngle-=clamp(dx,-120,120)*.006;
        state.orbitElevation=clamp(state.orbitElevation+clamp(dy,-120,120)*.0045,-1.12,1.12);
      }else if(input.action==='zoom'){
        const ratio=Number(input.ratio);
        if(Number.isFinite(ratio)&&ratio>.65&&ratio<1.5)
          state.orbitDistance=clamp(state.orbitDistance*ratio,1.85,5.5);
      }
    });
  }
  saveWorld();
  stars.scale.setScalar(Math.max(1, R / BASE_RADIUS * 1.7));

  // Original NexGame mini-map frame/canvas, now mapped to tangent metres on the sphere.
  const nativeMap=$('minimap'),nativeCtx=nativeMap.getContext('2d');
  // Re-use static roads on every rendered frame instead of rebuilding them.
  const minimapForestRoute=Array.from({length:61},(_,i)=>{
    const lon=FOREST_ENTRANCE_LONGITUDE+(FOREST_TRAIL_END-FOREST_ENTRANCE_LONGITUDE)*i/60;
    const pt=forestLocalPoint(lon,forestTrailLatitude(lon),R);
    return [pt.x,pt.z];
  });
  function drawNativeMinimap(){
    if(!nativeCtx)return;
    const ctx=nativeCtx,size=240,scale=3.8;
    const center=normalToLocal(state.normal,R);
    ctx.clearRect(0,0,size,size);
    ctx.fillStyle='#263c31';ctx.fillRect(0,0,size,size);
    // Follow current simulated heading exactly; the animation loop already
    // smooths character turns, so filtering again causes visible map lag.
    const minimapRotation=state.heading-Math.PI/2;
    const compassAngle=minimapRotation-Math.PI/2;
    ctx.save();
    ctx.beginPath();ctx.arc(size/2,size/2,size/2-3,0,TAU);ctx.clip();
    ctx.translate(size/2,size/2);
    ctx.rotate(minimapRotation);
    ctx.scale(1,-1); // World north (+z) must point to screen north, not down.
    ctx.fillStyle='#798755';ctx.fillRect(-size*10,-size*10,size*20,size*20);
    ctx.translate(-center.x*scale,-center.z*scale);
    ctx.fillStyle='#59734c';
    ctx.beginPath();ctx.ellipse(30*scale,26*scale,17.2*scale,12.5*scale,0,0,TAU);ctx.fill();
    ctx.fillStyle='#6098a5';
    ctx.beginPath();ctx.ellipse(30*scale,26*scale,16.4*scale,11.7*scale,0,0,TAU);ctx.fill();
    // Paths are rendered in two strokes to stay legible on grass and forest.
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const route of [...ROUTES,minimapForestRoute]){
      ctx.beginPath();route.forEach(([x,z],i)=>i?ctx.lineTo(x*scale,z*scale):ctx.moveTo(x*scale,z*scale));
      ctx.strokeStyle='#423d2d';ctx.lineWidth=15;ctx.stroke();
      ctx.strokeStyle='#d5bd86';ctx.lineWidth=9;ctx.stroke();
      ctx.strokeStyle='rgba(255,240,194,.45)';ctx.lineWidth=2;ctx.stroke();
    }
    // Quest overlays only exist for the chosen, accepted and enabled task.
    // The yellow NPC exclamation marks remain in the 3D world instead.
    const questState=rpg.state;
    let trackedMap=rpg.getQuestMapState();
    const expedition=readExpedition(questState.expedition);
    // Preserve exploration guidance even when a previously saved tracking
    // selection was cleared in an older client release.
    if(expedition.stage===2){
      const hasLandmarks=trackedMap?.kind==='landmarks'||trackedMap?.overlays?.some(m=>m.kind==='landmarks');
      if(!hasLandmarks){
        const landmarks=trackedQuestMap('expedition',questState);
        if(landmarks)trackedMap=trackedMap?{...trackedMap,overlays:[...(trackedMap.overlays||[]),landmarks]}:landmarks;
      }
    }
    paintTrackedQuestOnMinimap(ctx,trackedMap,scale,{center,size,rotation:minimapRotation});
    paintMinimapPlaces(ctx,{center,size,scale},[
      {kind:'npc',...QUEST_GIVERS.mentor},
      {kind:'npc',...QUEST_GIVERS.herbalist},
      {kind:'npc',...QUEST_GIVERS.bandit},
      {kind:'npc',...EXPEDITION_SCOUT},
      {kind:'camp',...EXPEDITION_SCOUT}
    ]);
    ctx.fillStyle='#8d6541';ctx.fillRect(-37*scale,-12*scale,20*scale,21*scale);
    ctx.restore();
    ctx.save();ctx.translate(size/2,size/2);
    ctx.fillStyle='#fff0bd';ctx.strokeStyle='#342916';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(7,8);ctx.lineTo(0,4);ctx.lineTo(-7,8);ctx.closePath();
    ctx.fill();ctx.stroke();
    const nx=Math.cos(compassAngle)*(size/2-17),ny=Math.sin(compassAngle)*(size/2-17);
    ctx.beginPath();ctx.arc(nx,ny,10,0,TAU);
    ctx.fillStyle='#272f26';ctx.fill();ctx.strokeStyle='#e9d5a1';ctx.stroke();
    ctx.font='bold 12px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#ffe2a0';ctx.fillText('С',nx,ny+.5);
    ctx.restore();
    $('mapLabel').textContent=center.d<82?'Лагерь Нараче':'Сферический мир';
  }
  const globeCanvas = $('miniglobe');
  const gctx = globeCanvas.getContext('2d');
  function drawGlobe() {
    if (!gctx) return;
    const c = gctx, s = globeCanvas.width, center = s/2, radius = 87;
    c.clearRect(0,0,s,s);
    c.save(); c.translate(center,center);
    c.fillStyle='rgba(15,40,44,.72)'; c.beginPath();c.arc(0,0,107,0,TAU);c.fill();
    const arcColors = ['#86ae79','#367b60','#d1ac6b','#8493a0'];
    for (let i=0;i<4;i++) {
      c.beginPath();c.moveTo(0,0);
      c.arc(0,0,radius,i*Math.PI/2-Math.PI/4,i*Math.PI/2+Math.PI/4);
      c.closePath();c.fillStyle=arcColors[i];c.fill();
    }
    c.strokeStyle='#f6e7b6';c.lineWidth=2;c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();
    c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=1;
    c.beginPath();c.ellipse(0,0,80,28,0,0,TAU);c.stroke();
    const lon = Math.atan2(state.normal.x,state.normal.z);
    const x = radius*.84*Math.cos(lon), y = radius*.84*Math.sin(lon);
    c.fillStyle='#fff7e7';c.strokeStyle='#29413f';c.lineWidth=4;
    c.beginPath();c.arc(x,y,8,0,TAU);c.fill();c.stroke();
    c.fillStyle='#fae4a3';c.font='bold 15px system-ui';c.textAlign='center';
    c.fillText('N',0,-92);
    c.restore();
  }

  const windowFocus=new THREE.Vector3();let hasWindowFocus=false;
  const clock = new THREE.Clock();
  let elapsed = 0, uiClock = 0, introClock = 0, forestFogBlend=0, forestShadeBlend=0;
  let webglContextFailed=false;
  const gfxFailure=$('graphicsFailure'),gfxFailureText=$('graphicsFailureText');
  function showGraphicsFailure(message,error){
    if(gfxFailureText)gfxFailureText.textContent=message;
    if(gfxFailure)gfxFailure.hidden=false;
    if(error)console.error('NexGameWorld graphics failure',error);
  }
  $('graphicsReload')?.addEventListener('click',()=>{
    artSafety.setMode('base',qualityName);
    location.reload();
  });
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    artSafety.onContextLost();
    webglContextFailed=true;
    showGraphicsFailure('WebGL временно недоступен. При восстановлении игра продолжится в базовой графике.');
  },false);
  canvas.addEventListener('webglcontextrestored',()=>{
    artSafety.onContextRestored();
    webglContextFailed=false;
    try{
      applyGraphicsQuality();
      shadowBudget.reset();
      if(gfxFailure)gfxFailure.hidden=true;
    }catch(error){
      webglContextFailed=true;
      showGraphicsFailure('Не удалось восстановить графику. Перезагрузите игру.',error);
    }
  },false);
  let fpsSeconds=0,fpsFrames=0;
  function animate() {
    requestAnimationFrame(animate);
    const measureFrames=!!fpsCounter&&(!fpsCounter.hidden||!!referencePose)&&!document.hidden;
    const frameStart=measureFrames?performance.now():0;
    const rawDt=clock.getDelta();
    const dt = Math.min(rawDt, .05);
    elapsed += dt; uiClock += dt; introClock += dt;
    // A gradual forest microclimate: darker distant silhouettes, not a jump cut.
    const lightingNormal=referencePose?.normal||state.normal;
    const forestLongitude=Math.atan2(lightingNormal.x,lightingNormal.z);
    const forestLatitude=Math.asin(clamp(lightingNormal.y,-1,1));
    const desiredForestFog=isPortalPreview?0:forestMoodAt(forestLongitude,forestLatitude);
    forestFogBlend+=(desiredForestFog-forestFogBlend)*Math.min(1,dt*1.3);
    const desiredShade=isPortalPreview?0:forestCanopyShadeAt(forestLongitude,forestLatitude);
    forestShadeBlend+=(desiredShade-forestShadeBlend)*Math.min(1,dt*1.15);
    const fogProfile=GRAPHICS_PRESETS[qualityName];
    // Shade follows the traveller, not the whole globe. A clearing gradually
    // restores daylight; combat silhouettes remain legible at every preset.
    const localLight=modernLightingValues(
      forestLightResponse(forestShadeBlend,fogProfile.exposure),forestShadeBlend,modernGraphicsPreview);
    skyFill.intensity=localLight.hemi;
    skyFill.color.set(ART.light.ambientSky).lerp(forestAmbientColor,forestShadeBlend*.65);
    if(modernGraphicsPreview)skyFill.color.lerp(modernAmbientTint,.16);
    sun.intensity=localLight.sun;
    if(modernGraphicsPreview)sun.color.set('#ffdfa5');
    else sun.color.set(ART.light.sun);
    fill.intensity=localLight.fill;
    if(modernGraphicsPreview)fill.color.set('#9bc8ed');
    else fill.color.set('#b4dbe9');
    renderer.toneMappingExposure=localLight.exposure;
    localFog.near=fogProfile.fogNear*(1-.18*forestFogBlend-.08*forestShadeBlend);
    localFog.far=fogProfile.fogFar*(1-.42*forestFogBlend-.11*forestShadeBlend);
    localFog.color.copy(skyDay).lerp(forestFogColor,forestFogBlend*(.58+.1*forestShadeBlend));
    if(!state.orbit&&!isPortalPreview)
     scene.background=blendedForestSky.copy(skyDay).lerp(forestSkyColor,
      forestFogBlend*(.62+.09*forestShadeBlend));
    if(measureFrames&&rawDt>0&&rawDt<=.25){
      fpsFrames++;fpsSeconds+=rawDt;
    }else{fpsSeconds=0;fpsFrames=0;}
    if (introClock > 7) $('instruction').style.opacity = '0';

    const desktop=keyboard.read();
    let horizontal = joystick.x + desktop.x;
    let forward = -joystick.y - desktop.y;
    if(referencePose){horizontal=0;forward=0;}
    // The same deadzone, analog strength and camera-relative stick used by NexGame.
    // The spherical tangent basis maps flat X -> East and flat Z -> -North.
    const input=screenMoveVector(horizontal, -forward, state.cameraHeading-Math.PI/2);
    mountControls.cancelForMovement(input.strength>.11||!!chargeMotion);
    if(input.strength>.11&&!chargeMotion)rpg.cancelAutoApproach();
    const previousHeading=state.heading;
    let travelled=0,chargePose=null;
    const waitingForServer=accountMode&&!onlinePresence?.connected;
    let power=state.orbit||rpg.movementLocked||chargeMotion||waitingForServer?0:input.strength;
    // Preserve manual camera-relative controls, but when idle allow the same
    // short-range auto-approach to a combat target as in the original NexGame.
    const approach=!referencePose&&!waitingForServer&&power<.11&&!state.orbit&&!chargeMotion?rpg.getApproachTarget():null;
    if(approach)power=1;
    if(chargeMotion){
      const motion=chargeMotion;
      motion.elapsed+=dt;
      const frame=sampleChargeMotion(motion.elapsed,motion.duration);
      travelled=Math.max(0,(frame.distanceFraction-motion.previousFraction)*motion.distance);
      motion.previousFraction=frame.distanceFraction;
      const oldLon=Math.atan2(state.normal.x,state.normal.z);
      // Follow the exact server-verified great circle, without a frame-one snap.
      state.normal.lerpVectors(motion.from,motion.to,frame.distanceFraction).normalize();
      state.lonUnwrapped+=angleDelta(Math.atan2(state.normal.x,state.normal.z),oldLon);
      const desired=chargeTravelHeading(state.normal.toArray(),motion.to.toArray());
      if(desired!==null)state.heading=easeChargeHeading(state.heading,desired,dt);
      else if(Number.isFinite(motion.heading))
       state.heading=easeChargeHeading(state.heading,motion.heading,dt);
      chargePose={drive:frame.drive,landing:frame.landing};
      if(frame.finished){
       state.normal.copy(motion.to);
       if(Number.isFinite(motion.heading))state.heading=angleDelta(motion.heading,0);
       chargeMotion=null;chargeRecovery=.15;
       if(chargeLandingCorrection){
        applyChargeLandingCorrection(chargeLandingCorrection);
        chargeLandingCorrection=null;
       }
      }
    }else if (power > 0) {
      tangentBasis(state.normal);
      if(approach){
        const desired=localToNormalAt(approach.x,approach.z,R);
        travel.copy(desired).addScaledVector(state.normal,-desired.dot(state.normal)).normalize();
      }else{
        travel.copy(tangentEast).multiplyScalar(input.x)
          .addScaledVector(tangentNorth,-input.z).normalize();
      }
      const newHeading = Math.atan2(travel.dot(tangentNorth),travel.dot(tangentEast));
      const turn = angleDelta(newHeading,state.heading);
      state.heading = angleDelta(state.heading + turn * Math.min(1, dt * 11),0);
      prevHeading = newHeading;
      axis.crossVectors(state.normal,travel).normalize();
      const currentLocal=approach?normalToLocal(state.normal,R):null;
      const remaining=approach?Math.hypot(approach.x-currentLocal.x,approach.z-currentLocal.z):Infinity;
      const step = Math.max(0,Math.min(WALK_SPEED*(mountState==='riding'?1.6:1)*dt*power,remaining-3.2));
      const move=sphericalSlideStep({
        THREE,normal:state.normal,travel,step,radius:R,toLocal:normalToLocal,
        // Match the authoritative collision radius (mount .62m / foot .42m).
        // Otherwise a wolf clips a tight edge locally, the server rejects it,
        // and the resulting position correction shakes the whole view.
        canStep:(x,z,d)=>(d>=82||canWadeAtLocal(x,z))&&
          canWalkCamp(x,z,mountState==='riding'?.62:.42,R)&&rpg.canMoveTo(x,z)
      });
      if(move.travelled<=0){
        if(approach)rpg.stopAutoApproach();
        power=0;
      }else{
        travelled=move.travelled;
        const oldLon=Math.atan2(state.normal.x,state.normal.z);
        state.normal.copy(move.normal);
        const newLon=Math.atan2(state.normal.x,state.normal.z);
        state.lonUnwrapped+=angleDelta(newLon,oldLon);
        state.meters+=move.travelled;
      }
    }
    // Only real travel advances the gait; held movement at a wall does not.
    // Charge distance can be 30 m in half a second: cap cosmetic hoof
    // cadence to sprint speed rather than animating an impossible blur.
    state.legCycle=advanceStridePhase(state.legCycle,
     chargePose?Math.min(travelled,dt*8.2):travelled);
    if(!chargeMotion&&chargeRecovery>0){
      chargeRecovery=Math.max(0,chargeRecovery-dt);
      if(!chargePose)chargePose={drive:0,landing:chargeRecovery/.15*.52};
    }
    const poseWalk=chargePose?Math.max(chargePose.drive,.2):movementStrength(travelled,dt,
     WALK_SPEED*(mountState==='riding'?1.6:1));
    const poseTurn=turnStrength(previousHeading,state.heading,dt);
    followCooldown=Math.max(0,followCooldown-dt);
    // Spherical analogue of native followCameraYaw: tangent heading is the
    // camera's view-forward, not the eye-backward yaw of the flat implementation.
    // Follow only after controls are released; never overwrite vertical pitch.
    if(state.cameraFollow&&!state.orbit&&!chargePose&&power<.11&&touches.size===0&&followCooldown<=0)
     state.cameraHeading=turnTowardsAngle(state.cameraHeading,state.heading,dt,3.8);
    presenceMoving=poseWalk>.11;
    applyNetworkRotation(dt);
    updateActor();
    onlinePresence?.tick(dt,elapsed);
    mountControls.tick();
    startZone.animate(elapsed);
    whisperingForest.animate(elapsed);
    artSafety.animate('ecology',elapsed);
    artSafety.animate('atmosphere',elapsed,state.orbit?0:forestFogBlend);
    rpg.update(dt);
    // Single native pose pass after gathering/combat state has updated.
    // No second subsystem may reset the hip, knee, torso or arm angles.
    const terrainFeet=sampleSphericalFooting({
      THREE,normal:state.normal,quaternion:actor.quaternion,radius:R,heightAt,
      phase:state.legCycle,walk:hero.root.userData.walkBlend??poseWalk
    });
    animateSphericalTauren(hero,{
      dt,time:elapsed,walk:poseWalk,turn:poseTurn,phase:state.legCycle,
      terrainFeet,charge:chargePose,...rpg.getAnimationState()
    });
    syncForestWolfMount(THREE,hero,{riding:mountState==='riding',time:elapsed,travelled,heading:state.heading});

    const windowView=rpg.getWindowView();
    if(referencePose){
      focus.copy(referencePose.focus);
      cameraGoal.copy(referencePose.position);
      camera.up.copy(referencePose.normal);
    }else if (state.orbit) {
      const r = R * state.orbitDistance;
      const horizontalRadius = r * Math.cos(state.orbitElevation);
      cameraGoal.set(Math.sin(state.orbitAngle) * horizontalRadius,
        Math.sin(state.orbitElevation) * r,
        Math.cos(state.orbitAngle) * horizontalRadius);
      camera.up.set(0,1,0);
      focus.set(0,0,0);
    } else {
      tangentBasis(state.normal);
      camForward.copy(tangentEast).multiplyScalar(Math.cos(state.cameraHeading)).addScaledVector(tangentNorth,Math.sin(state.cameraHeading));
      const h = R + heightAt(state.normal);
      focus.copy(state.normal).multiplyScalar(h+2.3);
      cameraGoal.copy(focus).addScaledVector(camForward,-state.zoom*Math.cos(state.cameraPitch));
      cameraGoal.addScaledVector(state.normal,state.zoom*Math.sin(state.cameraPitch)+1.1);
      const minRadius = R + heightAt(cameraRadial.copy(cameraGoal).normalize()) + 1.0;
      if (cameraGoal.length() < minRadius) cameraGoal.normalize().multiplyScalar(minRadius);
      camera.up.copy(state.normal);
    }
    const cameraPlayerLocal=!state.orbit?normalToLocal(state.normal,R):null;
    if(windowView?.focus&&!state.orbit&&!referencePose){
      // View the lid from beside the player rather than through their back.
      focus.copy(windowView.focus);
      if(chestCameraOffset===null){
        const towardPlayer=cameraToHero.copy(hero.root.position).sub(focus);
        const base=Math.atan2(towardPlayer.dot(tangentNorth),towardPlayer.dot(tangentEast));
        let bestAngle=base+1.15,bestClearance=-1;
        // The chest is centered by the far wall: choose a clear side for a wide shot.
        for(const offset of [1.15,-1.15,1.6,-1.6,.8,-.8]){
          const angle=base+offset;
          const direction=cameraOffsetDirection.copy(tangentEast).multiplyScalar(Math.cos(angle)).addScaledVector(tangentNorth,Math.sin(angle));
          const desired=cameraCandidate.copy(focus).addScaledVector(direction,9).addScaledVector(state.normal,4.2);
          const hit=cameraObstruction(THREE,{start:focus,desired,getRadius:cameraWorldRadius,toLocal:normalToLocal,heightAt,heroLocal:cameraPlayerLocal,clearance:.82},cameraProbe);
          const clearance=(hit||desired).distanceToSquared(focus);
          if(clearance>bestClearance){bestClearance=clearance;bestAngle=angle;}
        }
        chestCameraOffset=bestAngle-state.cameraHeading;
      }
      const angle=state.cameraHeading+chestCameraOffset;
      camForward.copy(tangentEast).multiplyScalar(Math.cos(angle)).addScaledVector(tangentNorth,Math.sin(angle));
      cameraGoal.copy(focus).addScaledVector(camForward,9).addScaledVector(state.normal,4.2);
    }else chestCameraOffset=null;
    if(!state.orbit){
      startZone.updateInteriorView(cameraPlayerLocal.x,cameraPlayerLocal.z,dt);
      if(!referencePose){
      const hit=cameraObstruction(THREE,{
       start:focus,desired:cameraGoal,getRadius:cameraWorldRadius,toLocal:normalToLocal,
       heightAt,heroLocal:cameraPlayerLocal,clearance:.82
      },cameraProbe);
      if(hit)cameraGoal.copy(hit);
      }
    }
    if(referencePose){camera.position.copy(cameraGoal);cameraSnap=false;}
    else if (cameraSnap) {camera.position.copy(cameraGoal);cameraSnap=false;}
    else camera.position.lerp(cameraGoal,1-Math.exp(-dt * (state.orbit&&touches.size===1?24:8.5)));
    if(!state.orbit&&!referencePose){
      // A lerp can sweep a safe target through a tent, building or cliff.
      // Validate the *actual* camera, not merely its target.
      const sweptHit=cameraObstruction(THREE,{
       start:focus,desired:camera.position,getRadius:cameraWorldRadius,
       toLocal:normalToLocal,heightAt,heroLocal:cameraPlayerLocal,clearance:.8
      },cameraProbe);
      if(sweptHit)camera.position.copy(sweptHit);
      const n=cameraRadial.copy(camera.position).normalize();
      const min=R+heightAt(n)+.8;
      if(camera.position.length()<min)camera.position.copy(n.multiplyScalar(min));
    }
    // Lift the scene above the sheet without changing saved camera settings.
    windowOffset+=(((referencePose?0:windowView?.height)||0)/2-windowOffset)*(1-Math.exp(-dt*10));
    if(windowView?.focus&&!referencePose){
      if(!hasWindowFocus)windowFocus.copy(focus);
      windowFocus.lerp(windowView.focus,1-Math.exp(-dt*8));hasWindowFocus=true;
    }else if(hasWindowFocus){
      windowFocus.lerp(focus,1-Math.exp(-dt*10));
      if(windowFocus.distanceToSquared(focus)<.0001)hasWindowFocus=false;
    }
    if(windowOffset>.1)camera.setViewOffset(innerWidth,innerHeight,0,windowOffset,innerWidth,innerHeight);
    else if(camera.view?.enabled)camera.clearViewOffset();
    // Camera and avatar must react differently to server corrections.
    // Smooth only the look-at target; keep network position, collision tests
    // and the 3D hero transform entirely authoritative and immediate.
    const desiredLook=referencePose?referencePose.focus:hasWindowFocus?windowFocus:focus;
    const snapLook=!hasCameraLookTarget||lastLookOrbit!==state.orbit;
    settleCameraLook(cameraLookTarget,desiredLook,dt,{snap:snapLook});
    hasCameraLookTarget=true;lastLookOrbit=state.orbit;
    camera.lookAt(cameraLookTarget);
    rpg.updateQuestMarkers();
    const redrawShadows=shadowBudget.next(rawDt,{enabled:shadowActive,quality:qualityName});
    renderer.shadowMap.needsUpdate=redrawShadows;
    if(redrawShadows){
      // Keep the 62-metre shadow frustum centred around the active character.
      const shadowNormal=referencePose?.normal||state.normal;
      const shadowFocus=referencePose?.focus||actor.position;
      tangentBasis(shadowNormal);
      sun.target.position.copy(shadowFocus);
      sun.position.copy(shadowFocus).addScaledVector(shadowNormal,44)
        .addScaledVector(tangentEast,27).addScaledVector(tangentNorth,20);
      sun.target.updateMatrixWorld();
    }
    drawNativeMinimap();
    if(!isPortalPreview)forestSpatial.update(camera,qualityName);
    if(!webglContextFailed&&!artSafety.isContextLost){
      try{renderer.render(scene,camera)}
      catch(renderError){
        artSafety.renderError(renderError);
        try{
          applyGraphicsQuality();
          renderer.render(scene,camera);
        }catch(baseError){
          webglContextFailed=true;
          showGraphicsFailure('Не удалось восстановить рендер. Перезагрузите игру в безопасном режиме.',baseError);
        }
      }
    }
    if(pendingVisualShot&&!webglContextFailed&&!artSafety.isContextLost){
      const shot=pendingVisualShot;pendingVisualShot=null;
      // Call synchronously after the real frame; WebGL target is restored by
      // captureVisualWebGLFrame before the next animation frame.
      void performVisualShot(shot);
    }
    if(measureFrames){
      const sceneName=selectFrameScene({orbit:state.orbit,combat:rpg.combatActive,
       house:!!cameraPlayerLocal&&isInLonghouse(cameraPlayerLocal.x,cameraPlayerLocal.z),
       dragging:touches.size>0});
      frameProfiler.record(rawDt*1000,performance.now()-frameStart,
       sceneName,renderer.info.render.calls);
      if(fpsSeconds>=.7){
       const row=frameProfiler.stats(sceneName);
       fpsCounter.textContent='FPS '+Math.round(fpsFrames/fpsSeconds)+
        (row?' · P95 '+Math.round(row.p95Ms)+' мс · '+row.slowFrames+' лаг. · '+
         ({world:'Мир',camera:'Камера',combat:'Бой',house:'Дом'}[sceneName]):'');
       fpsFrames=0;fpsSeconds=0;
      }
    }
    saveClock+=dt;
    if(saveClock>=.8){saveClock=0;saveWorld();}
    if (uiClock > .12) {uiClock = 0;updateHUD();}
  }
  function resize() {
    const w = innerWidth,h = innerHeight;
    renderer.setSize(w,h,false);
    camera.aspect = w/h;camera.updateProjectionMatrix();
  }
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){saveWorld();fpsSeconds=0;fpsFrames=0;}
    clock.getDelta();
  });
  window.addEventListener('pagehide',saveWorld);
  updateActor();
  updateHUD(true);
  animate();
  loading.classList.add('is-done');
} catch (error) {
  loading.classList.add('is-done');
  failure.textContent = 'Не удалось запустить прототип: ' + (error && error.message || String(error));
  console.error(error);
}
