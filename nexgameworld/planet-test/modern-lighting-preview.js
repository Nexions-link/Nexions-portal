// Optional lighting-only A/B preview. No changes to geometry or game logic.
export const MODERN_GFX_QUERY='gfx-modern';
export function modernPreviewEnabled(search=''){
  try{return new URLSearchParams(search).get(MODERN_GFX_QUERY)==='1';}
  catch{return false;}
}
export function modernLightingValues(base,shade=0,enabled=false){
  if(!enabled)return {...base};
  const s=Math.max(0,Math.min(1,Number.isFinite(shade)?shade:0));
  return {
    hemi:base.hemi*(.87-.06*s),
    sun:base.sun*(1.11+.07*s),
    fill:base.fill*(.94-.08*s),
    exposure:base.exposure*(.965-.015*s)
  };
}
