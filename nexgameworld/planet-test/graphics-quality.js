// NexGameWorld spherical graphics presets. All distances and prop placements
// remain untouched; only rendering density, lighting and detail are changed.
export const GRAPHICS_PRESETS=Object.freeze({
 economy:Object.freeze({
  label:'Экономичное',dpr:.9,grass:.38,flowers:.40,shrubs:.4,pebbles:.35,
  reeds:.45,waterShimmer:.10,waterColor:0x5896a4,shadowSize:0,detail:.15,
  exposure:1.17,fogNear:65,fogFar:170
 }),
 balanced:Object.freeze({
  label:'Сбалансированное',dpr:1.3,grass:.78,flowers:.80,shrubs:.8,pebbles:.72,
  reeds:.82,waterShimmer:.30,waterColor:0x64b1b6,shadowSize:512,detail:.68,
  exposure:1.14,fogNear:105,fogFar:290
 }),
 high:Object.freeze({
  label:'Высокое',dpr:1.65,grass:1,flowers:1,shrubs:1,pebbles:1,
  reeds:1,waterShimmer:.40,waterColor:0x68b5bd,shadowSize:1024,detail:1,
  exposure:1.13,fogNear:145,fogFar:390
 })
});
export function resolveGraphicsPreset(value){
 return Object.hasOwn(GRAPHICS_PRESETS,value)?value:'balanced';
}
export function effectivePixelRatio(preset,deviceRatio=1,isPreview=false){
 const ratio=Number.isFinite(deviceRatio)?Math.max(.5,deviceRatio):1;
 return Math.min(ratio,isPreview?1:GRAPHICS_PRESETS[resolveGraphicsPreset(preset)].dpr);
}
export function graphicsDensity(preset){
 const p=GRAPHICS_PRESETS[resolveGraphicsPreset(preset)];
 return {grass:p.grass,flowers:p.flowers,shrubs:p.shrubs,pebbles:p.pebbles,reeds:p.reeds,shimmer:p.waterShimmer,detail:p.detail};
}
