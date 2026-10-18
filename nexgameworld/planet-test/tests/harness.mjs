import * as THREE from 'three';
import {createCanvas} from '@napi-rs/canvas';
import {createOfflineRpg} from '../offline-rpg.js';
import {createTauren,localToNormal,normalToLocal,initStartZoneMath} from '../start-zone.js';
import {sphereFacingYaw} from '../mob-facing.js';
import {DEFAULT_HOTBAR} from '../../hotbar.js';
import {TRAINING_DUMMY} from '../../training.js';

// A small DOM adapter runs the actual RPG and its button handlers in Node.
// This is a logic integration test; it does not claim a WebGL/Safari render.
class Element {
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.style={setProperty(k,v){this[k]=v}};
  this.dataset={};this.hidden=false;this.textContent='';this.className='';this.events={};this.attributes={};
  const tokens=()=>new Set(this.className.split(' ').filter(Boolean));
  this.classList={add:(...v)=>{this.className=[...new Set([...tokens(),...v])].join(' ')},
   remove:(...v)=>{this.className=[...tokens()].filter(t=>!v.includes(t)).join(' ')},
   toggle:(v,force)=>{const next=force??!tokens().has(v);this.classList[next?'add':'remove'](v);return next}};
 }
 append(...children){this.children.push(...children)}
 appendChild(child){this.append(child);return child}
 replaceChildren(...children){this.children=[...children]}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
 click(){for(const fn of this.events.click||[])fn({target:this})}
 setAttribute(k,v){this.attributes[k]=String(v)}
 querySelector(selector){return descendants(this).find(el=>el.className.split(' ').includes(selector.slice(1)))||null}
 getBoundingClientRect(){return {left:0,top:0,width:844,height:390}}
}
export function descendants(el){return el.children.flatMap(c=>[c,...descendants(c)])}
export function installDom(){
 const nodes=new Map(),writes=[];
 globalThis.document={documentElement:{clientWidth:844,clientHeight:390},
  createElement:tag=>tag==='canvas'?Object.assign(createCanvas(64,64),new Element(tag)):new Element(tag),
  // Real SVG elements expose a read-only SVGAnimatedString className, unlike
  // HTML elements. Model that difference so Safari-only crashes fail tests.
  createElementNS:(_namespace,tag)=>{
   const node=new Element(tag);
   if(tag==='svg'){
    const classes=new Set(),animated={baseVal:''};
    Object.defineProperty(node,'className',{get(){return animated;},
     set(){throw new TypeError('SVG.className is a read-only SVGAnimatedString');}});
    node.classList={
     add:(...names)=>{names.forEach(name=>classes.add(name));animated.baseVal=[...classes].join(' ');},
     remove:(...names)=>{names.forEach(name=>classes.delete(name));animated.baseVal=[...classes].join(' ');},
     contains:name=>classes.has(name)
    };
   }
   return node;
  },
  getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)},addEventListener(){}};
 const storage=new Map();
 globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{writes.push(key);storage.set(key,value)}};
 document.getElementById('modal').hidden=true;
 return {nodes,writes};
}
export function harness({x=TRAINING_DUMMY.x,z=TRAINING_DUMMY.z-3,save={},authenticatedProfile=null}={}){
 const dom=installDom();
 localStorage.setItem('nexgame-planet-test-offline-rpg-v1',JSON.stringify({level:10,xp:0,gold:30,hp:90,resource:50,
  inventory:[{id:'wornAxe',qty:1}],equipment:{},hotbar:DEFAULT_HOTBAR,...save}));
 initStartZoneMath(THREE);
 const scene=new THREE.Scene(),hero=createTauren(THREE,scene),normal=new THREE.Vector3();
 const camera=new THREE.PerspectiveCamera(60,844/390,.1,2000),canvas=new Element('canvas');
 function position(px,pz,look={x:TRAINING_DUMMY.x,z:TRAINING_DUMMY.z}){
  normal.copy(localToNormal(px,pz,261));hero.root.position.copy(normal).multiplyScalar(261);
  const yaw=sphereFacingYaw(THREE,normal,localToNormal(look.x,look.z,261));
  hero.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal)
   .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw||0));
  hero.root.updateMatrixWorld(true);
  const viewForward=new THREE.Vector3(0,0,1).applyQuaternion(hero.root.quaternion);
  camera.position.copy(hero.root.position).addScaledVector(viewForward,-10).addScaledVector(normal,6);
  camera.up.copy(normal);camera.lookAt(hero.root.position.clone().addScaledVector(normal,1.5));
  camera.updateMatrixWorld(true);
 }
 position(x,z);
 const rpg=createOfflineRpg({THREE,scene,hero,makeTauren:opts=>createTauren(THREE,scene,opts),playerNormal:()=>normal,
  getRadius:()=>261,toNormal:localToNormal,toLocal:normalToLocal,heightAt:()=>0,camera,canvas,authenticatedProfile});
 const get=id=>document.getElementById(id);
 function selectDummy(){rpg.targetNearest();if(get('targetName').textContent!==TRAINING_DUMMY.name)throw Error('Dummy not selected')}
 function equip(id){
  get('bag').click();
  const index=rpg.state.inventory.findIndex(i=>i.id===id);
  const cells=descendants(get('mbody')).filter(e=>e.className.split(' ').includes('inventory-slot'));
  cells[index].click();
  descendants(get('mbody')).find(e=>e.textContent==='Надеть').click();
  get('modalClose').click();
 }
 return {...dom,rpg,scene,hero,camera,get,position,selectDummy,equip};
}
