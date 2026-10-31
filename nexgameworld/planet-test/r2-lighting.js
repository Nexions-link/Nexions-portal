// NGW R2-03: performance-bounded coherent daylight, forest depth and fog.
// Pure parameters: existing lights, fog and renderer only. No lights,
// shadow passes, meshes, external textures or changed game/camera state.
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));
const finite=(v,otherwise)=>Number.isFinite(v)?v:otherwise;

/**
 * Forest shade and fog blend are already eased by the gameplay renderer;
 * this profile only controls the current THREE lights and fog. All presets
 * retain the same shadow map resolutions and scheduling.
 */
export function r2LightingProfile({shade=0,forest=0,exposure=1.14,
 fogNear=105,fogFar=290,quality='balanced'}={}){
 const shadow=clamp(shade),depth=clamp(forest);
 const e=clamp(finite(exposure,1.14),.85,1.4);
 const near=Math.max(20,finite(fogNear,105));
 const far=Math.max(near+40,finite(fogFar,290));
 const isHigh=quality==='high';
 // Warm sun grazes the crowns; cool fill maintains readable characters.
 const sun=2.46*(1-.22*shadow);
 const hemi=1.92*(1-.18*shadow);
 const fill=.66*(1+.06*shadow);
 // The background changes before the near ground: strong air perspective
 // without turning the entire route into a grey opaque curtain.
 const depthNear=near*(1-.52*depth-.035*shadow);
 const depthFar=far*(1-.56*depth-.06*shadow);
 const boundedNear=Math.max(19,depthNear);
 const boundedFar=Math.max(boundedNear+54,depthFar);
 return {
  sun,hemi,fill,
  exposure:e*(.985-.032*shadow),
  fogNear:boundedNear,
  fogFar:boundedFar,
  // Keep palettes and sky/fog consistent instead of independently shifting.
  fogBlend:clamp(depth*(.73+.13*shadow)),
  skyBlend:clamp(depth*(.62+.12*shadow)),
  sunWarmth:clamp(.08+.60*depth+.10*shadow),
  fillCoolness:clamp(.17+.64*depth),
  groundCoolness:clamp(.09+.54*depth),
  // Distant silhouettes fade faster on balanced than high, not on near NPCs.
  detailDepth:isHigh?.94:1,
  shadowNormalBias:isHigh?.027:.032
 };
}

export function r2AtmosphereBudget(quality='balanced',preview=false){
 if(preview)return {haze:0,beams:0,motes:0};
 if(quality==='economy')return {haze:9,beams:0,motes:0};
 if(quality==='high')return {haze:56,beams:18,motes:192};
 return {haze:30,beams:9,motes:90};
}
