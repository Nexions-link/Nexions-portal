// Test-only spherical copies of the main NexGame gathering resources.
// Quest locations and timings mirror game.js (main), but all objects remain
// in this independent offline scene and do not write to the production save.
import {lakeRadius} from './start-zone.js?v=33';
import {RESOURCE_VISUAL_COLORS,resourceProximityCue} from './gather-visibility.js?v=1';
import {LONGHOUSE,HOUSE_CHEST} from './hearth-house.js?v=6';
import {createChestMotion} from '../bestiary/chest-preview-motion.js?v=1';

export const GATHER_QUESTS=[
 null,
 {title:'Цветы равнин',item:'meadowFlower',count:4,gold:12,xp:35,
  hint:'Соберите луговые цветы вокруг лагеря.',intro:'Собери четыре луговых цветка для моего целебного настоя.',
  locations:[[-12,10],[-2,17],[5,20],[12,16],[-17,19],[15,24],[-7,27]]},
 {title:'Солнечные корни',item:'sunRoot',count:3,gold:20,xp:55,
  hint:'Найдите солнечные корни на дальних пастбищах.',intro:'Теперь мне нужны три солнечных корня, которые растут за лагерем.',
  locations:[[6,29],[13,31],[21,25],[27,19],[-12,29],[0,36]]},
 {title:'Лунные грибы',item:'moonMushroom',count:2,gold:35,xp:90,
  hint:'Ищите лунные грибы у прохладных камней.',intro:'Последний ингредиент — два лунных гриба среди прохладных камней.',
  locations:[[16,-22],[25,-23],[32,-31],[26,-9],[38,-27]]}
];
export const GATHER_INTERACT_RANGE=2.8;
export const GATHER_CAST_SECONDS=1.5;
export const GATHER_RESPAWN_SECONDS=32;
export const OFFLINE_CHEST=Object.freeze({...HOUSE_CHEST,slots:18});
export function createGatherWorld({THREE,parent,place}){
  const yAxis=new THREE.Vector3(0,1,0);
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.92,...extra});
  const mats={stem:material('#6b914d'),leaf:material('#83a75e'),
    petal:material('#f7db9f',{emissive:'#58401d',emissiveIntensity:.18}),
    core:material('#f0ca67',{emissive:'#815422',emissiveIntensity:.22}),
    root:material('#ceb480'),rootLeaf:material('#a7c673',{emissive:'#33481f',emissiveIntensity:.13}),
    // Moon mushrooms: warm brown caps and a lighter ochre edge, visually distinct from wildflowers
    // against the green and gold wildflowers on the spherical terrain.
    mushroomCap:material('#78502c',{emissive:'#38200c',emissiveIntensity:.12}),
    mushroomRim:material('#b18a56'),bone:material('#e0d3b8'),
    spark:new THREE.MeshBasicMaterial({color:'#f7e4b0',toneMapped:false})
  };
  const nodes=[];
  // The spherical lake has real depth. Nudge shore-side resources onto solid
  // ground if their original flat-map coordinates land under the water surface.
  function onDryGround(x,z){
    let tries=0;
    while(lakeRadius(x,z)<1.23 && tries++<30){
      const dx=x-30,dz=z-26,length=Math.max(.1,Math.hypot(dx,dz));
      x+=dx/length;z+=dz/length;
    }
    return [x,z];
  }
  function obj(group,shape,mat,x,y,z,sx=1,sy=1,sz=1){
    const mesh=new THREE.Mesh(shape,mat);mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh;
  }
  const sph=new THREE.SphereGeometry(1,9,7);
  // The dome geometry reads as a mushroom cap, not a pointed wildflower.
  const mushroomDome=new THREE.SphereGeometry(1,14,9,0,Math.PI*2,0,Math.PI/2);
  const cyl=new THREE.CylinderGeometry(1,1,1,7);
  // Just a few live quest resources exist at once. Reuse geometry between
  // them; their individually adjustable rim opacity is the only unique material.
  const rimGeometry=new THREE.TorusGeometry(1,.025,5,32);
  const glintGeometry=new THREE.IcosahedronGeometry(1,0);
  let visualQuality=.68;
  const glintMaterials=new Map();
  for(let stage=1;stage<=3;stage++){
    glintMaterials.set(stage,new THREE.MeshBasicMaterial({
      color:RESOURCE_VISUAL_COLORS[stage].glint,depthWrite:false,toneMapped:false
    }));
  }
  for(let stage=1;stage<=3;stage++){
    GATHER_QUESTS[stage].locations.forEach(([baseX,baseZ],index)=>{
      const [x,z]=onDryGround(baseX,baseZ);
      const group=new THREE.Group();group.name='gather-'+stage+'-'+index;parent.add(group);
      if(stage===1){
        obj(group,cyl,mats.stem,0,.20,0,.035,.4,.035);
        obj(group,sph,mats.core,0,.46,0,.165,.13,.165);
        for(let i=0;i<6;i++){
          const angle=i*2*Math.PI/6;
          obj(group,sph,mats.petal,Math.sin(angle)*.29,.46,Math.cos(angle)*.29,.205,.085,.15);
        }
        obj(group,sph,mats.leaf,-.21,.17,0,.27,.075,.14);
      } else if(stage===2){
        obj(group,sph,mats.root,-.19,.17,-.11,.27,.21,.25);
        obj(group,sph,mats.root,.15,.15,.09,.25,.20,.24);
        for(let i=-1;i<=1;i++){
          const leaf=obj(group,sph,mats.rootLeaf,.18*i,.50,.06*i,.145,.34,.095);
          leaf.rotation.z=i*.44;
        }
        obj(group,sph,mats.core,0,.66,.03,.11,.075,.09);
      } else {
        // Two slightly larger moon mushrooms. Pale stalks and a fine
        // mauve underside separate their dark domes from ordinary flowers.
        for(const [cx,cz,h,r] of [[-.17,-.1,.41,.40],[.29,.15,.29,.31]]){
          const stalk=obj(group,cyl,mats.bone,cx,h/2,cz,.085,h,.085);
          stalk.name='quest-moon-mushroom-stalk';
          const under=obj(group,cyl,mats.mushroomRim,cx,h+.016,cz,r*.94,.055,r*.94);
          under.name='quest-moon-mushroom-brim';
          const cap=obj(group,mushroomDome,mats.mushroomCap,cx,h+.04,cz,r,r*.57,r);
          cap.name='quest-moon-mushroom-dark-cap';
        }
      }
      // Earth-hugging rim, not a floating quest beacon: it only lights up
      // within 9 metres of a currently gatherable resource.
      const rim=new THREE.Mesh(rimGeometry,new THREE.MeshBasicMaterial({
        color:RESOURCE_VISUAL_COLORS[stage].rim,
        transparent:true,opacity:0,depthWrite:false,depthTest:true,toneMapped:false
      }));
      rim.name='quest-resource-soft-rim';
      rim.rotation.x=-Math.PI/2;rim.position.y=.11;
      rim.scale.setScalar(stage===1?.47:stage===2?.50:.53);
      rim.visible=false;rim.raycast=()=>{};group.add(rim);
      const glints=[];
      for(let i=0;i<2;i++){
        const glint=new THREE.Mesh(glintGeometry,glintMaterials.get(stage));
        glint.name='quest-resource-glint';glint.scale.setScalar(.045);
        glint.visible=false;glint.raycast=()=>{};group.add(glint);glints.push(glint);
      }
      const spark=obj(group,sph,mats.spark,0,.98,0,.072,.072,.072);
      spark.raycast=()=>{};
      const node={kind:'gather',name:({1:'Луговой цветок',2:'Солнечный корень',3:'Лунный гриб'})[stage],
        id:stage+'-'+index,stage,index,x,z,yaw:0,root:group,spark,rim,glints,item:GATHER_QUESTS[stage].item,
        pending:false,readyAt:0};
      group.visible=false;nodes.push(node);place(node);
    });
  }
  // The approved GLB is the only visible chest model.
  const chest=new THREE.Group();chest.name='hearth-house-shared-chest';parent.add(chest);
  const chestEntity={kind:'chest',name:'Общий сундук',
   x:OFFLINE_CHEST.x,z:OFFLINE_CHEST.z,yaw:LONGHOUSE.yaw,root:chest};
  place(chestEntity);
  let chestIsOpen=false,chestMotion=null;
  function setChestOpen(value){
   chestIsOpen=!!value;
   chestMotion?.select(chestIsOpen?'Open':'Close');
  }
  function installChestModel(model,{openAngle=-1.65,duration=1.15}={}){
   const hinge=model?.getObjectByName('Lid_Hinge');
   if(!hinge||!Number.isFinite(openAngle))return false;
   model.name='atlas-village-chest-v0.1';
   model.traverse(child=>{
    if(child.isMesh){child.castShadow=false;child.receiveShadow=true;}
   });
   chest.add(model);
   chestMotion=createChestMotion(hinge,{openAngle,duration});
   if(chestIsOpen)chestMotion.select('Open');
   return true;
  }
  return {nodes,chest:chestEntity,setChestOpen,installChestModel,
    updateChestMotion(dt){chestMotion?.update(dt);},
    setVisualQuality(value){visualQuality=Number.isFinite(value)?Math.max(0,Math.min(1,value)):.68;},
    update(clock,isAvailable,getDistance){
      for(const node of nodes){
        node.root.visible=!!isAvailable(node,clock);
        if(!node.root.visible)continue;
        const distance=typeof getDistance==='function'?getDistance(node):Infinity;
        const cue=resourceProximityCue(distance,visualQuality);
        node.rim.material.opacity=cue.ringOpacity*(.9+.1*Math.sin(clock*2.1+node.index));
        node.rim.visible=node.rim.material.opacity>.006;
        node.spark.visible=cue.sparkVisible;
        if(node.spark.visible){
          node.spark.position.y=.98+.065*Math.sin(clock*2.35+node.index);
          node.spark.scale.setScalar(.072*cue.sparkScale*(1+.06*Math.sin(clock*2.8+node.index)));
        }
        for(let i=0;i<node.glints.length;i++){
          const glint=node.glints[i];
          glint.visible=i<cue.glintCount;
          if(!glint.visible)continue;
          const phase=clock*1.0+node.index*1.43+i*Math.PI;
          glint.position.set(.29*Math.cos(phase),.78+.08*Math.sin(clock*1.8+i),.29*Math.sin(phase));
          glint.scale.setScalar(.038+.006*Math.sin(clock*2+i));
        }
      }
    }
  };
}
