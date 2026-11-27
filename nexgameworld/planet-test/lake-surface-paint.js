// Original, baked lake pigments. Only the existing vertex colours and 256px
// glint canvas use these helpers; there is no work in the animation loop.
const clamp01=value=>Math.max(0,Math.min(1,value));
const smooth=(lo,hi,value)=>{
 const t=clamp01((value-lo)/(hi-lo));return t*t*(3-2*t);
};
// Three's colour attributes contain linear light, unlike a painted sRGB hex.
const pigment=hex=>[0,2,4].map(offset=>{
 const value=parseInt(hex.slice(offset,offset+2),16)/255;
 return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
});
const blend=(a,b,amount)=>a.map((value,i)=>value+(b[i]-value)*clamp01(amount));
// Texture-only scatter; never consume the world's seeded prop generator.
const scatter=index=>{
 let value=Math.imul(index^0x68bc21eb,0x45d9f3b);
 value=Math.imul(value^(value>>>16),0x45d9f3b);
 return ((value^(value>>>16))>>>0)/4294967296;
};
const DRY=Object.freeze(pigment('b4a179'));
const WET=Object.freeze(pigment('6c7b67'));
const SILT=Object.freeze(pigment('958c69'));
const DEEP=Object.freeze(pigment('4c8193'));
const MID=Object.freeze(pigment('83b6b4'));
const SHALLOW=Object.freeze(pigment('d4ebce'));
const SUNLIT=Object.freeze(pigment('e4dfba'));

export function lakeSurfaceColor(kind,radius,angle=0){
 // Integer angular frequencies meet at the existing duplicated seam. The
 // centre is entirely radial so its 91 coincident vertices have one colour.
 const broad=.58*Math.sin(angle*3+.7)+.27*Math.cos(angle*5-1.1)+
  .15*Math.sin(angle*9+.3);
 if(kind==='shore'){
  // Preserve the old outer sand tint exactly: this layer has no alpha fade,
  // and its last two rings must still meet the untouched meadow naturally.
  if(radius>=1.17)return [...DRY];
  const wetEdge=1-smooth(.985,1.145,radius);
  const mottled=clamp01(.46+broad*.26+.14*Math.sin(angle*11-radius*23));
  const damp=blend(WET,SILT,mottled);
  return blend(DRY,damp,wetEdge*(.90+broad*.10));
 }
 if(kind!=='water')throw new TypeError('Unknown lake surface: '+kind);
 const r=clamp01(radius);
 const variation=smooth(.16,.72,r)*broad;
 const depth=clamp01(r+variation*.045);
 const body=blend(DEEP,MID,smooth(.18,.78,depth));
 const shallows=blend(body,SHALLOW,smooth(.67,.992,depth));
 // A little ochre reflects the silt beneath walkable shallows. It is broad
 // pigment, rather than a new glint/foam layer or transparent vertex alpha.
 return blend(shallows,SUNLIT,smooth(.79,.992,r)*(.10+.09*broad));
}

export function paintLakeRipples(context,size=256){
 context.clearRect(0,0,size,size);
 // Keep the original 65 strokes. Copies crossing a tile edge are subpaths
 // of the same stroke, so RepeatWrapping has no clipped bright/dark seams.
 for(let i=0;i<65;i++){
  const x=scatter(i*2+1)*size,y=scatter(i*2+2)*size;
  const halfWidth=5+(i%7)*1.8,height=1.05+(i%4)*.35;
  const tilt=-.11+Math.sin(i*2.3)*.035;
  const width=.75+(i%3)*.28;
  const reach=halfWidth+height+width*2;
  const shiftsX=[0],shiftsY=[0];
  if(x-reach<0)shiftsX.push(size);
  if(x+reach>size)shiftsX.push(-size);
  if(y-reach<0)shiftsY.push(size);
  if(y+reach>size)shiftsY.push(-size);
  context.beginPath();
  for(const dx of shiftsX)for(const dy of shiftsY){
   const cx=x+dx,cy=y+dy;
   context.moveTo(cx-halfWidth,cy-halfWidth*tilt);
   context.bezierCurveTo(cx-halfWidth*.65,cy-height-halfWidth*tilt*.5,
    cx-halfWidth*.28,cy-height*.72,cx,cy-height*.55);
   context.bezierCurveTo(cx+halfWidth*.25,cy-height*.52,
    cx+halfWidth*.68,cy+height*.25+halfWidth*tilt*.5,
    cx+halfWidth,cy+halfWidth*tilt);
  }
  context.strokeStyle=i%4===0?'rgba(255,247,213,.27)':
   i%3===0?'rgba(222,247,238,.19)':'rgba(239,255,247,.14)';
  context.lineWidth=width;context.stroke();
 }
}
