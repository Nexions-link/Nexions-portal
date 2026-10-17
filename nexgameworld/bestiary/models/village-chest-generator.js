// NexGameWorld chest generator source; run in a JS environment where TextEncoder may be unavailable.
// Generated GLB is committed alongside this reproducible geometry recipe.
function generateChestGLB(){
  const P={
    wood:[142,81,40],woodAlt:[169,100,49],woodLight:[189,116,61],woodDark:[79,49,31],
    inner:[105,64,39],iron:[77,76,73],ironLight:[116,110,101],ironDark:[53,54,53],
    bronze:[174,122,64],gold:[224,165,82],goldLight:[244,194,106],
    blue:[37,62,99],blueLight:[57,88,123],keyhole:[22,18,15]
  };
  const keys=Object.keys(P),g={body:{},lid:{}};
  const pivot=[0,1.15,-.695];let triCount=0;let materialTris={};
  const clamp=x=>Math.min(255,Math.max(0,Math.round(x)));
  function v(section,p){return section==="lid"?[p[0]-pivot[0],p[1]-pivot[1],p[2]-pivot[2]]:p;}
  function tri(s,m,a,b,c,shade=1){
    if(!g[s][m])g[s][m]={pos:[],norm:[],col:[]};
    const d=g[s][m],A=v(s,a),B=v(s,b),C=v(s,c);
    let ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2],vx=C[0]-A[0],vy=C[1]-A[1],vz=C[2]-A[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;
    const co=P[m].map(t=>clamp(t*shade));
    for(const p of [A,B,C]){d.pos.push(...p);d.norm.push(nx/l,ny/l,nz/l);d.col.push(...co,255);}
    triCount++;materialTris[m]=(materialTris[m]||0)+1;
  }
  function quad(s,m,a,b,c,d,shade=1){tri(s,m,a,b,c,shade);tri(s,m,a,c,d,shade);}
  function box(s,m,x,y,z,w,h,d,shade=1){
    let x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
    quad(s,m,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],shade);
    quad(s,m,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],shade*.85);
    quad(s,m,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],shade*.83);
    quad(s,m,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],shade*.91);
    quad(s,m,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],shade*1.1);
    quad(s,m,[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],shade*.67);
  }
  function prismXY(s,m,pts,z0,z1,shade=1){
    const cc=[pts.reduce((a,p)=>a+p[0],0)/pts.length,pts.reduce((a,p)=>a+p[1],0)/pts.length];
    for(let i=0;i<pts.length;i++){
      const j=(i+1)%pts.length,p=pts[i],q=pts[j];
      tri(s,m,[cc[0],cc[1],z1],[p[0],p[1],z1],[q[0],q[1],z1],shade);
      tri(s,m,[cc[0],cc[1],z0],[q[0],q[1],z0],[p[0],p[1],z0],shade*.74);
      quad(s,m,[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1],shade*.8);
    }
  }
  function bar(s,m,a,b,w,h,shade=1){
    const dy=b[1]-a[1],dz=b[2]-a[2],ll=Math.hypot(dy,dz)||1,ny=-dz/ll,nz=dy/ll;
    const p=(c,x,n)=>[c[0]+x,c[1]+ny*n,c[2]+nz*n],ww=w*.5,hh=h*.5;
    const A=p(a,-ww,-hh),B=p(a,ww,-hh),C=p(a,ww,hh),D=p(a,-ww,hh);
    const E=p(b,-ww,-hh),F=p(b,ww,-hh),G=p(b,ww,hh),H=p(b,-ww,hh);
    quad(s,m,A,B,F,E,shade*.9);quad(s,m,D,H,G,C,shade*1.08);
    quad(s,m,A,E,H,D,shade*.82);quad(s,m,B,C,G,F,shade*.83);
    quad(s,m,A,D,C,B,shade);quad(s,m,E,F,G,H,shade);
  }
  function orb(s,m,c,rx,ry,rz,shade=1){
    let rings=5,sectors=10;
    for(let j=0;j<rings;j++){
      let t0=Math.PI*j/rings,t1=Math.PI*(j+1)/rings;
      for(let i=0;i<sectors;i++){
        let p0=2*Math.PI*i/sectors,p1=2*Math.PI*(i+1)/sectors;
        const pt=(t,p)=>[c[0]+rx*Math.sin(t)*Math.cos(p),c[1]+ry*Math.cos(t),c[2]+rz*Math.sin(t)*Math.sin(p)];
        const a=pt(t0,p0),b=pt(t0,p1),c1=pt(t1,p1),d=pt(t1,p0);
        tri(s,m,a,b,c1,shade);tri(s,m,a,c1,d,shade);
      }
    }
  }
  function ringOnSide(x,y,z){
    const r=.175,t=.035,steps=20,thick=8;
    for(let i=0;i<steps;i++)for(let j=0;j<thick;j++){
      const f=(a,b)=>[x+t*Math.cos(b),y+(r+t*Math.sin(b))*Math.sin(a),z+(r+t*Math.sin(b))*Math.cos(a)];
      const a=i/steps*2*Math.PI,b=(i+1)/steps*2*Math.PI,c=j/thick*2*Math.PI,d=(j+1)/thick*2*Math.PI;
      quad("body","bronze",f(a,c),f(b,c),f(b,d),f(a,d),.94+(j%3)*.03);
    }
  }
  // Shell cavity. These walls remain separate from the lid for use as a storage prop.
  box("body","woodDark",0,.19,0,2.23,.15,1.33);
  box("body","inner",0,.266,0,2.02,.015,1.10);
  const levels=[.36,.57,.78,.99];
  for(let k=0;k<4;k++){
    const y=levels[k],wood=k%2?"wood":"woodAlt";
    box("body",wood,0,y,.632,2.22,.185,.145,.94+(k%3)*.045);
    box("body",wood,0,y,-.632,2.22,.185,.145,.86+(k%3)*.04);
    for(const side of [-1,1])box("body",k%2?"woodAlt":"wood",side*1.048,y,0,.15,.187,1.16,.88+k*.025);
    // Carved lines and joins on front panel, intentionally understated.
    for(let j=0;j<5;j++){
      const x=-.91+j*.41+(k%2)*.08;
      box("body",j%2?"woodLight":"woodDark",x,y+.025+(j%2)*.037,.715,.22+(j%3)*.07,.009,.006,j%2?.86:.67);
    }
  }
  // Interior walls, visually recessed.
  box("body","inner",0,.70,.553,1.93,.86,.022,.87);
  box("body","inner",0,.70,-.553,1.93,.86,.022,.77);
  for(const side of [-1,1])box("body","inner",side*.951,.70,0,.023,.86,1.05,.88);
  // Four feet and armored vertical supports.
  for(const x of [-1.047,1.047])for(const z of [-.63,.63]){
    box("body","ironDark",x,.18,z,.32,.36,.34);
    box("body","iron",x,.18,z,.292,.29,.32,1.01);
    box("body","ironLight",x,.30,z+Math.sign(z)*.018,.275,.045,.32,.9);
    box("body","iron",x,.77,z,.18,.86,.19,.96);
    box("body","ironLight",x,1.105,z,.26,.22,.26);
    orb("body","bronze",[x,.19,z+Math.sign(z)*.17],.064,.065,.028);
    orb("body","gold",[x,1.095,z+Math.sign(z)*.14],.059,.06,.024);
  }
  for(const y of [.275,1.105]){
    box("body","iron",0,y,.713,2.18,.105,.11);
    box("body","iron",0,y,-.713,2.18,.105,.11,.83);
    for(const x of [-1.05,1.05])box("body","iron",x,y,0,.11,.112,1.43,.91);
    for(const x of [-.80,-.40,.40,.80]){
      orb("body","bronze",[x,y,.776],.04,.039,.026);
    }
  }
  // Upper rolled rim with a raised metal edge.
  box("body","ironLight",0,1.165,.67,2.05,.064,.10,.84);
  box("body","ironLight",0,1.165,-.67,2.05,.064,.10,.75);
  for(const x of [-1.08,1.08])box("body","ironLight",x,1.165,0,.08,.064,1.28,.78);
  // Front hanging blue heraldic panel and custom geometric insignia.
  prismXY("body","ironDark",[[-.19,.94],[.19,.94],[.19,.42],[0,.30],[-.19,.42]],.728,.748,.85);
  prismXY("body","blue",[[-.14,.90],[.14,.90],[.14,.445],[0,.35],[-.14,.445]],.750,.757);
  prismXY("body","gold",[[0,.78],[.09,.66],[0,.55],[-.09,.66]],.759,.773);
  prismXY("body","blueLight",[[0,.73],[.045,.66],[0,.59],[-.045,.66]],.775,.78);
  // Metal lock escutcheon and angular keyhole.
  prismXY("body","ironLight",[[-.22,1.11],[.22,1.11],[.22,.83],[.13,.73],[-.13,.73],[-.22,.83]],.767,.811);
  prismXY("body","bronze",[[-.16,1.065],[.16,1.065],[.16,.855],[.10,.80],[-.10,.80],[-.16,.855]],.812,.820);
  prismXY("body","keyhole",[[-.027,.97],[.025,.97],[.045,.948],[.025,.914],[.027,.86],[-.026,.86],[-.025,.914],[-.043,.947]],.822,.829);
  orb("body","gold",[-.153,.99,.831],.024,.023,.013);
  orb("body","gold",[.153,.99,.831],.024,.023,.013);
  // Riveted lifting rings, one on either side of the trunk.
  for(const side of [-1,1]){
    box("body","ironDark",side*1.148,.76,0,.06,.29,.34);
    box("body","ironLight",side*1.190,.76,0,.045,.205,.24);
    ringOnSide(side*1.240,.615,0);
    orb("body","bronze",[side*1.226,.78,0],.025,.05,.055);
  }
  // Back hinges, including pin / hinge rod.
  for(const x of [-.71,.71]){
    box("body","ironDark",x,1.19,-.72,.24,.20,.11);
    orb("body","bronze",[x,1.19,-.787],.07,.06,.040);
  }
  // Lid is a single independently animatable scene graph branch.
  const R=.79,D=.695,baseline=Math.sqrt(R*R-D*D);
  const arch=z=>1.159+Math.sqrt(Math.max(0,R*R-z*z))-baseline;
  const segs=26;
  for(let i=0;i<segs;i++){
    let z0=-D+2*D*i/segs,z1=-D+2*D*(i+1)/segs;
    const y0=arch(z0),y1=arch(z1),sh=.92+((i*7)%6)*.018;
    quad("lid",i%4===0?"woodAlt":"wood",[-1.055,y0,z0],[1.055,y0,z0],[1.055,y1,z1],[-1.055,y1,z1],sh);
    quad("lid","inner",[-1.048,y0-.105,z0],[1.048,y0-.105,z0],[1.048,y1-.105,z1],[-1.048,y1-.105,z1],.81);
    if(i%5===0&&i>0){
      const z=z0,y=y0+.007;
      bar("lid","woodDark",[0,y,z],[0,y+.005,z+.009],2.08,.019,.73);
    }
    // Thin edge on either side gives the curved wooden end caps actual thickness.
    quad("lid","woodDark",[-1.054,y0,z0],[-1.054,y1,z1],[-1.054,y1-.105,z1],[-1.054,y0-.105,z0],.8);
    quad("lid","woodDark",[1.054,y0,z0],[1.054,y1,z1],[1.054,y1-.105,z1],[1.054,y0-.105,z0],.8);
  }
  // Curved wooden side end-caps, dark inner planking, and armored edge.
  for(const side of [-1,1]){
    const x=side*1.055;
    for(let i=0;i<segs;i++){
      let z0=-D+2*D*i/segs,z1=-D+2*D*(i+1)/segs;
      const mid=arch(0);
      tri("lid",i%4?"wood":"woodAlt",[x,1.16,0],[x,arch(z0),z0],[x,arch(z1),z1],.81);
      if(i%5===0)bar("lid","iron",[side*1.087,arch(z0)+.018,z0],[side*1.087,arch(z1)+.018,z1],.095,.08,.93);
      else bar("lid","iron",[side*1.087,arch(z0)+.018,z0],[side*1.087,arch(z1)+.018,z1],.098,.075,.92);
    }
    box("lid","iron",x,1.175,0,.10,.09,1.38,.8);
    orb("lid","bronze",[side*1.145,1.19,D],.042,.043,.027);
  }
  // Two wide reinforcing hoops across the domed lid, plus two thin hoops.
  for(const x of [-.89,-.50,.50,.89]){
    const w=Math.abs(x)>.7?.17:.105;
    for(let i=0;i<segs;i++){
      const z0=-D+2*D*i/segs,z1=-D+2*D*(i+1)/segs;
      bar("lid",Math.abs(x)>.7?"iron":"ironLight",[x,arch(z0)+.05,z0],[x,arch(z1)+.05,z1],w,.088,.93);
    }
    for(const z of [-.52,-.20,.20,.52]){
      orb("lid","bronze",[x,arch(z)+.108,z],.038,.025,.036);
    }
  }
  // Delicate carved streaks run with the grain across the lid.
  for(let i=0;i<18;i++){
    let z=-.58+i*.066, y=arch(z)+.016;
    if(i%6===0)continue;
    bar("lid",i%3?"woodDark":"woodLight",[-.31+(i%4)*.15,y,z],[.17+(i%3)*.16,y+.002,z+.015],.013,.008,.58);
  }
  // Front edge, upper latch, central gem.
  box("lid","iron",0,1.20,D,2.19,.12,.14,.95);
  box("lid","iron",0,1.20,-D,2.19,.12,.12,.82);
  prismXY("lid","ironDark",[[-.192,1.30],[.192,1.30],[.192,1.06],[0,1.00],[-.192,1.06]],.755,.782);
  prismXY("lid","bronze",[[-.145,1.29],[.145,1.29],[.145,1.10],[0,1.054],[-.145,1.10]],.785,.800);
  prismXY("lid","gold",[[0,1.38],[.11,1.265],[0,1.145],[-.11,1.265]],.801,.834);
  prismXY("lid","goldLight",[[0,1.34],[.066,1.265],[0,1.19],[-.066,1.265]],.836,.846);
  for(const x of [-1.05,1.05]){
    orb("lid","gold",[x,1.215,.79],.048,.049,.019);
  }
  // Front/back lower visual lid seam.
  box("lid","ironDark",0,1.112,D,2.1,.033,.07,.87);
  // Palette: literal PBR materials, with per-vertex tint preserving painterly variation.
  const materials=keys.map(k=>({name:k,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:["iron","ironLight","ironDark","bronze","gold","goldLight"].includes(k)?.56:.04,roughnessFactor:["iron","ironLight","bronze","gold"].includes(k)?.53:.91},doubleSided:true}));
  const chunks=[],views=[],accessors=[],meshes=[];
  let cursor=0;
  function data(bytes,target){
    const pad=(4-cursor%4)%4;
    if(pad){chunks.push(new Uint8Array(pad));cursor+=pad;}
    const off=cursor;chunks.push(bytes);cursor+=bytes.length;
    views.push({buffer:0,byteOffset:off,byteLength:bytes.length,target});
    return views.length-1;
  }
  function attribute(values,componentType,type,normalized=false){
    let arr;
    if(componentType===5126){arr=new Float32Array(values);}
    else{arr=new Uint8Array(values);}
    const ix=data(new Uint8Array(arr.buffer),34962);
    const ac={bufferView:ix,componentType,count:values.length/(type==="VEC4"?4:type==="VEC3"?3:1),type};
    if(normalized)ac.normalized=true;
    if(componentType===5126&&type==="VEC3"&&arr.length){
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<values.length;i+=3)for(let j=0;j<3;j++){min[j]=Math.min(min[j],values[i+j]);max[j]=Math.max(max[j],values[i+j]);}
      ac.min=min;ac.max=max;
    }
    accessors.push(ac);return accessors.length-1;
  }
  for(const s of ["body","lid"]){
    const primitives=[];
    for(const m of keys){
      const group=g[s][m];if(!group||!group.pos.length)continue;
      primitives.push({attributes:{POSITION:attribute(group.pos,5126,"VEC3"),NORMAL:attribute(group.norm,5126,"VEC3"),COLOR_0:attribute(group.col,5121,"VEC4",true)},material:keys.indexOf(m),mode:4});
    }
    meshes.push({name:s==="body"?"ChestBody_Mesh":"ChestLid_Mesh",primitives});
  }
  const nodes=[{name:"Chest_Root",children:[1,2]},{name:"Chest_Body",mesh:0},{name:"Lid_Hinge",translation:pivot,children:[3]},{name:"Chest_Lid",mesh:1}];
  const animations=[];
  function anim(name,angles,times){
    const rot=[];
    for(const angle of angles)rot.push(Math.sin(angle*.5),0,0,Math.cos(angle*.5));
    const inputArray=new Float32Array(times),outputArray=new Float32Array(rot);
    const inputView=data(new Uint8Array(inputArray.buffer),34962),outputView=data(new Uint8Array(outputArray.buffer),34962);
    const inputIndex=accessors.push({bufferView:inputView,componentType:5126,count:times.length,type:"SCALAR",min:[Math.min(...times)],max:[Math.max(...times)]})-1;
    const outputIndex=accessors.push({bufferView:outputView,componentType:5126,count:angles.length,type:"VEC4"})-1;
    animations.push({name,samplers:[{input:inputIndex,output:outputIndex,interpolation:"LINEAR"}],channels:[{sampler:0,target:{node:2,path:"rotation"}}]});
  }
  anim("Idle",[0,0],[0,.5]);
  anim("Open",[0,-.3,-1.65],[0,.34,1.15]);
  anim("Close",[-1.65,-1.35,0],[0,.31,1.15]);
  const bin=new Uint8Array(cursor+((4-cursor%4)%4));let off=0;
  for(const chunk of chunks){const pad=(4-off%4)%4;off+=pad;bin.set(chunk,off);off+=chunk.length;}
  const doc={asset:{version:"2.0",generator:"NexGameWorld Chest v0.1"},scene:0,scenes:[{nodes:[0]}],nodes,meshes,materials,accessors,bufferViews:views,buffers:[{byteLength:bin.length}],animations,extras:{assetId:"village-chest",license:"Original NexGameWorld asset",hingeNode:"Lid_Hinge",collisionProxy:{box:[2.31,1.25,1.45]}}};
  const jsonString=JSON.stringify(doc);const js=new Uint8Array(jsonString.length+((4-jsonString.length%4)%4));
  for(let i=0;i<jsonString.length;i++)js[i]=jsonString.charCodeAt(i);
  js.fill(32,jsonString.length);
  const length=12+8+js.length+8+bin.length,out=new Uint8Array(length),view=new DataView(out.buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,length,true);
  view.setUint32(12,js.length,true);view.setUint32(16,0x4e4f534a,true);out.set(js,20);
  const bo=20+js.length;view.setUint32(bo,bin.length,true);view.setUint32(bo+4,0x004e4942,true);out.set(bin,bo+8);
  return {bytes:out,triCount,materialTris,doc};
}
