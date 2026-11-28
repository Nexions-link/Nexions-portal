// Original painted pigments for the elder's lodge. Bake once into its two
// existing 64px maps before material isolation and the first GPU upload.
const TAU=Math.PI*2;
const wrap=value=>value-Math.floor(value);
const distance=(value,centre)=>wrap(value-centre+.5)-.5;
const clamp=value=>Math.max(0,Math.min(255,Math.round(value)));
const bell=value=>Math.exp(-value*value);

export function hearthSurfacePixel(kind,u,v){
 if(!Number.isFinite(u)||!Number.isFinite(v))throw new TypeError('Invalid hearth map coordinates');
 u=wrap(u);v=wrap(v);
 if(kind==='wood'){
  // Long fibres bend around two sparse, elongated knots. All distances and
  // waves wrap, including the knots, so the unchanged 2x repeat has no seam.
  let bend=0,knot=0;
  for(const [cx,cy,rx,ry] of [[.29,.34,.075,.19],[.79,.82,.055,.135]]){
   const dx=distance(u,cx),dy=distance(v,cy);
   const radius=Math.hypot(dx/rx,dy/ry);
   const envelope=bell(radius*.72);
   bend+=dx/rx*envelope*.12;
   knot+=Math.sin(radius*10-1.4)*envelope*8-
    bell(radius*3.1)*24;
  }
  const flow=u+bend+.018*Math.sin(TAU*v)+.009*Math.sin(TAU*(2*v+u));
  const broad=Math.sin(TAU*(2*u+.12*Math.sin(TAU*v)))*8;
  const grain=Math.cos(TAU*(7*flow+.08*Math.sin(TAU*3*v)));
  const split=bell((grain-1)*9)*18;
  const lip=bell((Math.cos(TAU*(7*flow-.055))-1)*8)*7;
  const fibres=Math.sin(TAU*(19*u+v))*2.1+
   Math.sin(TAU*(27*u-2*v))*1.2;
  const tone=233+broad-split+lip+knot+fibres;
  return [clamp(tone+3),clamp(tone),clamp(tone-5),255];
 }
 if(kind==='hide'){
  // Wide gathered folds and their soft light-facing lips remain readable at
  // the stock phone distance. Fine fibres stay subordinate to those masses.
  const sag=.026*Math.sin(TAU*v)+.011*Math.sin(TAU*(2*v+u));
  let folds=0;
  for(const [centre,width,strength] of [[.16,.047,25],[.51,.033,19],[.83,.057,22]]){
   const dx=distance(u+sag,centre);
   const gathered=.71+.29*Math.cos(TAU*(v+centre));
   folds+=(-bell(dx/width)*strength+
    bell((dx-width*.95)/(width*.62))*8)*gathered;
  }
  const leather=Math.sin(TAU*(u+v))*.58+
   Math.cos(TAU*(2*u-v))*.29+Math.sin(TAU*(3*u+2*v))*.13;
  const crease=bell(distance(v+.018*Math.sin(TAU*3*u),.66)/.024)*
   (2.5+2*Math.sin(TAU*u));
  const fibres=Math.sin(TAU*(17*u+3*v))*.85+
   Math.cos(TAU*(11*u-13*v))*.55;
  const tone=239+folds+leather*7-crease+fibres;
  return [clamp(tone+2),clamp(tone),clamp(tone-4),255];
 }
 throw new TypeError('Unknown hearth surface: '+kind);
}

export function buildHearthSurfacePixels(kind,size=64){
 if(!Number.isInteger(size)||size<1)throw new RangeError('Invalid hearth map size');
 const pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  pixels.set(hearthSurfacePixel(kind,(x+.5)/size,(y+.5)/size),(y*size+x)*4);
 }
 return pixels;
}

export function applyHearthSurfacePaint(longhouse){
 const maps=new Map();
 for(const group of [longhouse.floor,longhouse.walls,longhouse.roof]){
  group.traverse(mesh=>{
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    const map=material?.map;
    if(map?.isDataTexture&&/^hearth-house-(wood|hide)-grain$/.test(map.name))
     maps.set(map.name,map);
   }
  });
 }
 for(const kind of ['wood','hide']){
  const map=maps.get('hearth-house-'+kind+'-grain');
  if(!map||map.image.width!==64||map.image.height!==64||
   map.image.data?.length!==64*64*4)throw new Error('Missing original hearth '+kind+' map');
  // Keep the DataTexture, image and pixel-buffer identities. The temporary
  // paint array is released after set(); there is no runtime paint cache.
  map.image.data.set(buildHearthSurfacePixels(kind));
  map.needsUpdate=true;
 }
 const hide=maps.get('hearth-house-hide-grain');
 const facade=longhouse.accents.getObjectByName('hearth-house-hide-wall-panels');
 facade.material.map=hide;
 facade.material.needsUpdate=true;
 longhouse.roof.traverse(mesh=>{
  if(mesh.name!=='hearth-house-hide-gable')return;
  mesh.material.map=hide;
  mesh.material.needsUpdate=true;
  // ShapeGeometry starts with metre-space UVs. Normalize only that existing
  // attribute; keep its three positions, one triangle and normal unchanged.
  const {position,uv}=mesh.geometry.attributes;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let i=0;i<position.count;i++){
   minX=Math.min(minX,position.getX(i));maxX=Math.max(maxX,position.getX(i));
   minY=Math.min(minY,position.getY(i));maxY=Math.max(maxY,position.getY(i));
  }
  for(let i=0;i<uv.count;i++)uv.setXY(i,
   (position.getX(i)-minX)/(maxX-minX),
   (position.getY(i)-minY)/(maxY-minY));
  uv.needsUpdate=true;
 });
}
