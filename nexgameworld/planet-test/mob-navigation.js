// Lightweight local-chart navigation for spherical-world wildlife.
// Position is the same geodesic (x,z) chart as camp collisions; rendering
// reprojects onto the sphere separately. This module never changes aggro,
// damage, respawn timers or hero movement.
export const MOB_NAV_CELL=1.35;
const NEIGHBOURS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const distance=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
const finite=(...xs)=>xs.every(Number.isFinite);

export function mobSegmentClear(ax,az,bx,bz,canWalk,spacing=.45){
 if(!finite(ax,az,bx,bz)||typeof canWalk!=='function')return false;
 const d=distance(ax,az,bx,bz);
 if(d<1e-8)return !!canWalk(bx,bz);
 const count=Math.max(1,Math.ceil(d/spacing));
 for(let j=1;j<=count;j++){
  const t=j/count;
  if(!canWalk(ax+(bx-ax)*t,az+(bz-az)*t))return false;
 }
 return true;
}
const priority=(a,b)=>a.f-b.f||a.h-b.h;
function push(open,item){
 open.push(item);
 let n=open.length-1;
 while(n>0){
  const parent=(n-1)>>1;
  if(priority(open[parent],item)<=0)break;
  open[n]=open[parent];n=parent;
 }
 open[n]=item;
}
function pop(open){
 const first=open[0],last=open.pop();
 if(open.length){
  let n=0;
  while(n*2+1<open.length){
   const left=n*2+1,right=left+1;
   const child=right<open.length&&priority(open[right],open[left])<0?right:left;
   if(priority(open[child],last)>=0)break;
   open[n]=open[child];n=child;
  }
  open[n]=last;
 }
 return first;
}

export function findMobRoute(fromX,fromZ,goalX,goalZ,canWalk,{
 cell=MOB_NAV_CELL,maxVisits=850
}={}){
 if(!finite(fromX,fromZ,goalX,goalZ)||typeof canWalk!=='function')return null;
 if(!canWalk(goalX,goalZ))return null;
 if(mobSegmentClear(fromX,fromZ,goalX,goalZ,canWalk))
  return [{x:goalX,z:goalZ}];
 const direct=distance(fromX,fromZ,goalX,goalZ);
 // Small search around each encounter, not a planet-wide pathfinding grid.
 const span=Math.ceil(Math.max(20,Math.min(42,direct+13))/cell);
 const nodes=new Map(),open=[];
 const key=(i,j)=>i+','+j;
 const first={i:0,j:0,x:fromX,z:fromZ,g:0,h:direct,f:direct,parent:null,closed:false};
 nodes.set(key(0,0),first);push(open,first);
 let visited=0;
 while(open.length&&visited++<maxVisits){
  const current=pop(open);
  // Superseded queue entries must not replace the cheapest route to a cell.
  if(current.closed||nodes.get(key(current.i,current.j))!==current)continue;
  current.closed=true;
  if(distance(current.x,current.z,goalX,goalZ)<=cell*1.5&&
    mobSegmentClear(current.x,current.z,goalX,goalZ,canWalk)){
   const route=[{x:goalX,z:goalZ}];
   for(let n=current;n?.parent;n=n.parent)route.push({x:n.x,z:n.z});
   route.reverse();
   // Shortcut on clear sight lines: fewer turns, smooth mobile movement.
   const smooth=[],points=[{x:fromX,z:fromZ},...route];
   let from=0;
   while(from<points.length-1){
    let next=points.length-1;
    while(next>from+1&&!mobSegmentClear(points[from].x,points[from].z,points[next].x,points[next].z,canWalk))next--;
    smooth.push(points[next]);from=next;
   }
   return smooth;
  }
  for(const [di,dj] of NEIGHBOURS){
   const i=current.i+di,j=current.j+dj;
   if(Math.abs(i)>span||Math.abs(j)>span)continue;
   const x=fromX+i*cell,z=fromZ+j*cell,k=key(i,j);
   const previous=nodes.get(k);
   if(previous?.closed)continue;
   if(!mobSegmentClear(current.x,current.z,x,z,canWalk))continue;
   const g=current.g+cell*Math.hypot(di,dj);
   if(previous&&g>=previous.g-1e-9)continue;
   const h=distance(x,z,goalX,goalZ);
   // A fresh queue entry avoids mutating heap priorities in place.
   const node={i,j,x,z,g,h,f:g+h,parent:current,closed:false};
   nodes.set(k,node);push(open,node);
  }
 }
 return null;
}

export function moveMobToward(mob,{goalX,goalZ,speed,dt,mode,canWalk,detour=true}){
 if(!mob||!finite(mob.x,mob.z,goalX,goalZ,speed,dt)||dt<=0||speed<=0)
  return {moved:0,blocked:false};
 const nav=mob.navigation??(mob.navigation={mode:null,route:[],retry:0,goalX:NaN,goalZ:NaN});
 const changed=nav.mode!==mode;
 const drift=distance(goalX,goalZ,nav.goalX,nav.goalZ);
 if(changed||drift>3){
  nav.mode=mode;nav.route=[];nav.retry=0;nav.goalX=goalX;nav.goalZ=goalZ;
 }
 nav.retry=Math.max(0,nav.retry-dt);
 // Once a waypoint is reached, advance to the next without standing still.
 while(nav.route.length&&distance(mob.x,mob.z,nav.route[0].x,nav.route[0].z)<.38)
  nav.route.shift();
 let next=nav.route[0]||{x:goalX,z:goalZ};
 let length=distance(mob.x,mob.z,next.x,next.z);
 if(length<1e-7)return {moved:0,blocked:false};
 let amount=Math.min(length,speed*dt),nx=mob.x+(next.x-mob.x)*amount/length,nz=mob.z+(next.z-mob.z)*amount/length;
 if(!mobSegmentClear(mob.x,mob.z,nx,nz,canWalk)){
  nav.route=[];
  if(detour&&nav.retry<=0){
   nav.route=findMobRoute(mob.x,mob.z,goalX,goalZ,canWalk)||[];
   nav.retry=1.2;
  }
  next=nav.route[0]||{x:goalX,z:goalZ};
  length=distance(mob.x,mob.z,next.x,next.z);
  if(length<1e-7)return {moved:0,blocked:true};
  amount=Math.min(length,speed*dt);
  nx=mob.x+(next.x-mob.x)*amount/length;
  nz=mob.z+(next.z-mob.z)*amount/length;
  if(!mobSegmentClear(mob.x,mob.z,nx,nz,canWalk))
   return {moved:0,blocked:true};
 }
 mob.x=nx;mob.z=nz;
 return {moved:amount,blocked:false};
}
