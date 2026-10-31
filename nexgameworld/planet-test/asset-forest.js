// Real third-party, CC0 forest asset pack for NexGameWorld.
// Kay Lousberg / KayKit Forest Nature Pack (GLB assembled by Station-Sciences).
// Geometries and the actual embedded atlas texture are loaded locally.
// One InstancedMesh per model variation, with quality-scaled counts.
import {GLTFLoader} from './vendor/GLTFLoader.js?v=160';
import {forestAssetLayout} from './asset-forest-layout.js?v=1';

export const FOREST_ASSET_URL=new URL('./assets/kaykit-forest-atlas.glb',import.meta.url).href;
const MODEL_VARIANTS=Object.freeze({
 trees:['Tree_1_A_Color1','Tree_1_C_Color1','Tree_3_A_Color1',
        'Tree_3_C_Color1','Tree_4_A_Color1','Tree_4_C_Color1'],
 bushes:['Bush_1_E_Color1','Bush_3_B_Color1'],
 rocks:['Rock_1_D_Color1','Rock_1_J_Color1','Rock_2_C_Color1',
        'Rock_2_G_Color1','Rock_3_E_Color1'],
 grass:['Grass_2_D_Color1']
});
const QUALITY_MULTIPLIERS=Object.freeze({
 economy:{trees:.3,bushes:.30,rocks:.30,grass:.25},
 balanced:{trees:.75,bushes:.7,rocks:.70,grass:.65},
 high:{trees:1,bushes:1,rocks:1,grass:1}
});
function sphereNormal(THREE,x,z,radius,target){
 const d=Math.hypot(x,z),angle=d/radius,k=d>1e-8?Math.sin(angle)/d:0;
 return target.set(x*k,z*k,Math.cos(angle));
}
export async function createAssetForest(THREE,{
 scene,radius,heightAt,anchors=[],accept=()=>true,
 loader=new GLTFLoader()
}={}){
 if(!scene||!Number.isFinite(radius)||typeof heightAt!=='function')
  throw new TypeError('Invalid asset forest configuration');
 const gltf=await loader.loadAsync(FOREST_ASSET_URL);
 const byName=new Map();
 gltf.scene.traverse(obj=>{if(obj.isMesh)byName.set(obj.name,obj);});
 const plan=forestAssetLayout({anchors,accept});
 const rows=[],up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 const align=new THREE.Quaternion(),rotation=new THREE.Quaternion();
 const dummy=new THREE.Object3D();
 const positionsByModel=new Map();
 for(const [kind,models] of Object.entries(MODEL_VARIANTS))
  for(const point of plan[kind]){
   const name=models[point.variant%models.length];
   if(!positionsByModel.has(name))positionsByModel.set(name,{kind,points:[]});
   positionsByModel.get(name).points.push(point);
  }
 try{
  for(const [name,{kind,points}] of positionsByModel){
   const source=byName.get(name);
   if(!source?.geometry||!source.material)
    throw new Error('GLB missing required model '+name);
   const geometry=source.geometry;
   if(!geometry.boundingBox)geometry.computeBoundingBox();
   const size=Math.max(.25,geometry.boundingBox.max.y-geometry.boundingBox.min.y);
   const mesh=new THREE.InstancedMesh(geometry,source.material,points.length);
   mesh.name='ngw-asset-'+name;mesh.userData.ngwAssetForest=true;
   mesh.frustumCulled=true;mesh.receiveShadow=kind==='rocks'||kind==='trees';
   for(let i=0;i<points.length;i++){
    const p=points[i],n=sphereNormal(THREE,p.x,p.z,radius,normal);
    const desiredHeight=kind==='trees'?(p.anchored?7.6:7.8)*p.scale:
      kind==='bushes'?1.15*p.scale:
      kind==='rocks'?1.15*p.scale:.60*p.scale;
    const scale=desiredHeight/size;
    dummy.position.copy(n).multiplyScalar(radius+heightAt(n)+.055);
    dummy.quaternion.copy(align.setFromUnitVectors(up,n))
      .multiply(rotation.setFromAxisAngle(up,p.angle));
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
   mesh.computeBoundingSphere();
   scene.add(mesh);
   rows.push({mesh,kind,points,mandatory:kind==='trees'?
     points.filter(p=>p.anchored).length:0});
  }
 }catch(error){
  for(const row of rows)scene.remove(row.mesh);
  throw error;
 }
 let shown=false,preset='balanced';
 function updateVisibility(){
  for(const row of rows){
   const rate=QUALITY_MULTIPLIERS[preset][row.kind];
   row.mesh.count=Math.max(row.mandatory,Math.floor(row.points.length*rate));
   row.mesh.visible=shown&&row.mesh.count>0;
   // Reserve heavy shadow rendering for higher quality. Main village trees
   // retain their geometry even in economy mode.
   row.mesh.castShadow=shown&&row.kind==='trees'&&preset!=='economy';
  }
 }
 function setQuality(value){
  preset=Object.hasOwn(QUALITY_MULTIPLIERS,value)?value:'balanced';
  updateVisibility();
 }
 function setVisible(value){shown=!!value;updateVisibility();}
 function dispose(){for(const row of rows){scene.remove(row.mesh);row.mesh.dispose();}}
 updateVisibility();
 return {
  setQuality,setVisible,dispose,
  counts:Object.freeze(Object.fromEntries(Object.entries(plan).map(([k,v])=>[k,v.length]))),
  get visible(){return shown},
  get drawBatches(){return rows.length}
 };
}
