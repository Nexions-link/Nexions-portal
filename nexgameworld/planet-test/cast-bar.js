// Presentation for real gathering and summon casts. Timers and completion stay
// with their existing gameplay controllers; a full bar never grants anything.
import {itemArtwork} from './inventory-art.js';

export const CAST_HOTBAR_GAP=20;
export function castBarBottom(viewportHeight,hotbarTop){
 if(!Number.isFinite(viewportHeight)||viewportHeight<=0||
    !Number.isFinite(hotbarTop)||hotbarTop<0||hotbarTop>viewportHeight)return null;
 return viewportHeight-hotbarTop+CAST_HOTBAR_GAP;
}

const wolfArtwork='<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" fill="#18262c"/><path d="M7 10 25 18 38 16 57 9 52 34 49 49 33 59 16 48 12 32Z" fill="#8c998c" stroke="#d6d3af" stroke-width="2"/><path d="m12 16 11 8-8 8m37-17-11 9 8 8" fill="#b9bf9f"/><path d="m16 33 12 4-7 5m28-9-12 4 7 5" fill="#1a2b2d"/><path d="m18 34 9 3m19-3-9 3" stroke="#e3ce78" stroke-width="2"/><path d="m32 33-8 16 8 8 9-8Z" fill="#c7c8aa"/><path d="m26 46 6-3 6 3-6 6Z" fill="#14232a"/><path d="M32 52v5" stroke="#304346" stroke-width="2"/></svg>';
const paintedIcons=new WeakMap();
const positionedFrames=new WeakMap();
const UTILITY_CLEARANCE_PROPERTY='--ngw-cast-utility-bottom';

function syncUtilityClearance(document){
 const style=document?.documentElement?.style;
 if(!style?.setProperty)return;
 let clearance=null;
 for(const id of ['gatherCast','mountCast']){
  const frame=document.getElementById(id);
  if(!frame||frame.hidden)continue;
  const bottom=Number.parseFloat(frame.style.bottom);
  const height=frame.getBoundingClientRect?.().height||frame.offsetHeight||34;
  if(Number.isFinite(bottom)&&Number.isFinite(height))
   clearance=Math.max(clearance||0,bottom+height+8);
 }
 if(clearance!==null)style.setProperty(UTILITY_CLEARANCE_PROPERTY,clearance+'px');
 else style.removeProperty?.(UTILITY_CLEARANCE_PROPERTY);
}

export function positionCastBar(document,id){
 const frame=document?.getElementById(id),bar=document?.getElementById('actionsBar');
 if(!frame||frame.hidden||!bar?.getBoundingClientRect)return;
 const height=document.defaultView?.innerHeight||document.documentElement?.clientHeight;
 const bottom=castBarBottom(height,bar.getBoundingClientRect().top);
 if(bottom!==null){
  frame.style.bottom=bottom+'px';
  positionedFrames.set(frame,{width:document?.defaultView?.innerWidth,height});
  syncUtilityClearance(document);
 }
}

export function paintCastBar(document,id,{progress=0,label,timeText='',icon,waiting=false}={}){
 const frame=document?.getElementById(id);
 if(!frame)return;
 const percent=Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):0;
 const phase=waiting?'waiting':'casting';
 const wasHidden=frame.hidden;
 frame.hidden=false;
 frame.setAttribute('data-cast-state',phase);
 frame.setAttribute('data-cast-spark',!waiting&&percent>0&&percent<100?'visible':'hidden');
 frame.setAttribute('aria-valuenow',String(Math.round(percent)));
 const title=document.getElementById(id+'Label');
 if(title&&typeof label==='string')title.textContent=label;
 const time=document.getElementById(id+'Time');
 if(time)time.textContent=timeText;
 frame.setAttribute('aria-valuetext',[(typeof label==='string'?label:title?.textContent)||'',timeText].filter(Boolean).join(' · '));
 const fill=document.getElementById(id+'Fill');
 if(fill)fill.style.width=percent.toFixed(1)+'%';
 const iconNode=document.getElementById(id+'Icon');
 if(iconNode&&icon&&paintedIcons.get(iconNode)!==icon){
  iconNode.innerHTML=icon==='forestWolf'?wolfArtwork:itemArtwork(icon);
  paintedIcons.set(iconNode,icon);
 }
 const layout=positionedFrames.get(frame),view=document?.defaultView;
 const height=view?.innerHeight||document?.documentElement?.clientHeight;
 if(wasHidden||!layout||layout.width!==view?.innerWidth||layout.height!==height)
  positionCastBar(document,id);
}

export function hideCastBar(document,id){
 const frame=document?.getElementById(id);
 if(!frame)return;
 frame.hidden=true;
 frame.setAttribute('data-cast-state','idle');
 frame.setAttribute('data-cast-spark','hidden');
 frame.setAttribute('aria-valuenow','0');
 frame.setAttribute('aria-valuetext','');
 const fill=document.getElementById(id+'Fill');
 if(fill)fill.style.width='0%';
 syncUtilityClearance(document);
}
