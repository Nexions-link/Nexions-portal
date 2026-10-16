// PT 0.5.0 — original Narache relic, scout landmark and crimson boss route,
// projected to spherical tangent planes. The guide is one instanced draw call.
import {BOSS_GUIDE_POINTS,RELIC_POSITION,SCOUT_POSITION} from './mentor-chain.js?v=1';
import {sphereFacingYaw} from './mob-facing.js?v=1';
export function createMentorWorld({THREE,parent,place,getRadius,toNormal,heightAt}){
 const yAxis=new THREE.Vector3(0,1,0),tempA=new THREE.Vector3(),tempB=new THREE.Vector3();
 const gold=new THREE.MeshStandardMaterial({color:0xdcc893,metalness:.32,roughness:.46});
 const teal=new THREE.MeshStandardMaterial({color:0x75c7b1,metalness:.25,roughness:.46,emissive:0x1b6558,emissiveIntensity:.38});
 const plume=new THREE.MeshStandardMaterial({color:0x7fdac8,roughness:.55,emissive:0x358e80,emissiveIntensity:.45,side:THREE.DoubleSide});
 const rock=new THREE.MeshStandardMaterial({color:0x79776b,roughness:1});
 const glow=new THREE.MeshBasicMaterial({color:0x7fe6d3,transparent:true,opacity:.46,depthWrite:false});
 const mk=(parent,geom,mat,x,y,z)=>{
  const mesh=new THREE.Mesh(geom,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 };
 const relic=new THREE.Group();relic.name='narache-ancestor-feather';parent.add(relic);
 mk(relic,new THREE.CylinderGeometry(.038,.058,1.15,7),gold,0,.76,0).rotation.z=-.16;
 const vanes=new THREE.Group();vanes.position.set(.12,1.23,0);relic.add(vanes);
 const vane=new THREE.SphereGeometry(1,14,10);
 const left=mk(vanes,vane,plume,-.14,0,0);left.scale.set(.13,.46,.055);left.rotation.z=-.32;
 const right=mk(vanes,vane,plume,.12,.04,0);right.scale.set(.14,.43,.055);right.rotation.z=.33;
 const core=mk(vanes,vane,gold,0,.02,.03);core.scale.set(.03,.49,.035);
 const aura=mk(relic,new THREE.SphereGeometry(1,12,8),glow,0,.8,0);aura.scale.set(.5,.84,.5);
 const relicEntity={kind:'relic',name:'Перо предков',x:RELIC_POSITION.x,z:RELIC_POSITION.z,yaw:0,root:relic};
 place(relicEntity);
 // A recognizable stone cairn marks the scout endpoint. Original map
 // coordinates are preserved, but all shapes have local radial-up Y.
 const scout=new THREE.Group();scout.name='narache-scout-rocks';parent.add(scout);
 const stones=[[0,0,.55,.45,.55],[-.65,-.12,.5,.38,.42],[.55,.05,.38,.55,.32],[.07,-.55,.36,.3,.5]];
 for(const [x,z,sx,sy,sz] of stones){
  const b=mk(scout,new THREE.DodecahedronGeometry(1,0),rock,x,sy*.65,z);
  b.scale.set(sx,sy,sz);b.rotation.y=(x+z)*2;
 }
 mk(scout,new THREE.ConeGeometry(.28,.96,5),teal,.05,1.04,.03).rotation.y=.27;
 const scoutEntity={kind:'scout',name:'Каменная развилка',x:SCOUT_POSITION.x,z:SCOUT_POSITION.z,yaw:0,root:scout};
 place(scoutEntity);
 // Spawn one double-sided instanced mesh for the route so mobile draw calls
 // do not scale with the number of dashes.
 const dashes=[];
 for(let k=0;k<BOSS_GUIDE_POINTS.length-1;k++){
  const [ax,az]=BOSS_GUIDE_POINTS[k],[bx,bz]=BOSS_GUIDE_POINTS[k+1];
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
  for(let t=.8;t<len-.2;t+=2.15){
   const x=ax+dx*t/len,z=az+dz*t/len;
   const ahead=[x+dx/len,z+dz/len];
   dashes.push({x,z,ahead});
  }
 }
 const markerGeom=new THREE.BoxGeometry(.3,.055,1.0);
 const markerMat=new THREE.MeshBasicMaterial({color:0xd43835,transparent:true,opacity:.91,depthWrite:false,side:THREE.DoubleSide});
 const guide=new THREE.InstancedMesh(markerGeom,markerMat,dashes.length);
 guide.name='narache-crimson-quest-guide';
 guide.frustumCulled=false;guide.count=dashes.length;guide.visible=false;
 parent.add(guide);
 const obj=new THREE.Object3D(),tangent=new THREE.Quaternion(),twist=new THREE.Quaternion();
 function rebuild(){
  const radius=getRadius();
  for(let i=0;i<dashes.length;i++){
   const dash=dashes[i],normal=toNormal(dash.x,dash.z,radius);
   const next=toNormal(...dash.ahead,radius);
   const yaw=sphereFacingYaw(THREE,normal,next)??0;
   obj.position.copy(normal).multiplyScalar(radius+heightAt(normal)+.18);
   tangent.setFromUnitVectors(yAxis,normal);
   twist.setFromAxisAngle(yAxis,yaw);
   obj.quaternion.copy(tangent).multiply(twist);
   obj.scale.set(1,1,1);obj.updateMatrix();guide.setMatrixAt(i,obj.matrix);
  }
  guide.instanceMatrix.needsUpdate=true;
 }
 function update(state,time){
  const quest=state.quest;
  guide.visible=quest===10;
  relic.visible=quest===4;
  scout.visible=quest===7||quest===8;
  if(relic.visible){
   const b=.5+.5*Math.sin(time*2.3);
   aura.material.opacity=.22+b*.22;
   vanes.rotation.y=Math.sin(time*1.2)*.17;
   relic.rotation.y=Math.sin(time*.65)*.08;
  }
  if(guide.visible)markerMat.opacity=.83+.11*Math.sin(time*2.2);
 }
 rebuild();
 return {relic:relicEntity,scout:scoutEntity,guide,rebuild,update};
}
