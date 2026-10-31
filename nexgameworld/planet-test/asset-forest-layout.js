// Deterministic positions for licensed visual-only forest assets.
// Nothing in this module changes navigation, collisions or server state.
const TAU=Math.PI*2;
function seeded(seed){
 let state=seed>>>0;
 return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
}
export const ASSET_SCENERY_CAPS=Object.freeze({
 trees:35,bushes:74,rocks:68,grass:108
});
export function forestAssetLayout({anchors=[],accept=()=>true,seed=570531}={}){
 const rand=seeded(seed);
 const result={trees:[],bushes:[],rocks:[],grass:[]};
 // Exact original village tree positions, grouped first so all quality modes
 // preserve the replacement of the original nine procedural village trees.
 for(let i=0;i<anchors.length;i++){
  const [x,z,scale]=anchors[i];
  result.trees.push(Object.freeze({x,z,scale,angle:(i*.77)%TAU,anchored:true,variant:i%6}));
 }
 const caps=ASSET_SCENERY_CAPS;
 for(let attempt=0;attempt<18000;attempt++){
  if(Object.keys(caps).every(key=>result[key].length>=caps[key]))break;
  const x=(rand()-.5)*133,z=(rand()-.5)*133;
  const dist=Math.hypot(x,z);
  if(dist>65||dist<17||!accept(x,z))continue;
  const choice=rand(),kind=choice<.24?'trees':choice<.53?'bushes':
    choice<.76?'rocks':'grass';
  if(result[kind].length>=caps[kind])continue;
  if(kind==='trees'&&result.trees.some(p=>Math.hypot(x-p.x,z-p.z)<6.8))continue;
  if(kind==='bushes'&&result.trees.some(p=>Math.hypot(x-p.x,z-p.z)<1.5))continue;
  if(kind==='rocks'&&result.trees.some(p=>Math.hypot(x-p.x,z-p.z)<1.9))continue;
  result[kind].push(Object.freeze({
   x,z,angle:rand()*TAU,scale:kind==='trees'?.82+rand()*.48:
    kind==='rocks'?.75+rand()*1.1:kind==='bushes'?.8+rand()*.65:.65+rand()*.65,
   variant:Math.floor(rand()*(kind==='trees'?6:kind==='rocks'?5:kind==='bushes'?2:1))
  }));
 }
 return Object.freeze(Object.fromEntries(Object.entries(result).map(([key,rows])=>[key,Object.freeze(rows)])));
}
