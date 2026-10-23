// Original low-poly wolf: lightweight mobile quadruped with procedural gait.
export function createForestWolfVisual(THREE,variant=0){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const mat=hex=>new THREE.MeshStandardMaterial({color:hex,roughness:1,flatShading:true});
 const fur=mat(variant%2?'#59574d':'#4b524e'),mane=mat('#383d35'),light=mat('#a69c86'),
  black=mat('#252723'),iris=mat('#b6a07e'),shade=mat('#697168'),inner=mat('#86756c'),teeth=mat('#d8cfb5');
 const sph=new THREE.IcosahedronGeometry(1,1);
 function part(parent,geo,color,x,y,z,sx=1,sy=1,sz=1){
  const o=new THREE.Mesh(geo,color);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
 }
 part(body,sph,fur,0,1.12,0,.59,.53,1.04);
 part(body,sph,mane,0,1.3,.42,.61,.66,.58);
 // Layered shoulders, haunches and throat suggest thick fur without textures.
 for(const side of [-1,1]){
  part(body,sph,fur,side*.39,1.05,-.63,.27,.42,.40);
  part(body,sph,mane,side*.40,1.30,.39,.24,.37,.36);
  for(let i=0;i<4;i++){
   const tuft=part(body,new THREE.ConeGeometry(.14-i*.014,.38,5),i%2?fur:mane,side*(.38+i*.035),1.12-i*.10,.62-i*.19);
   tuft.rotation.x=Math.PI*.55;tuft.rotation.z=side*.23;
  }
 }
 part(body,sph,shade,0,1.52,-.12,.35,.18,.65);
 const head=new THREE.Group();head.position.set(0,1.48,.79);body.add(head);
 part(head,sph,fur,0,0,.23,.45,.38,.50);
 part(head,sph,light,0,-.18,.65,.26,.20,.40);
 part(head,sph,black,0,-.17,.96,.15,.11,.16);
 part(head,sph,light,0,-.34,.58,.23,.12,.35);
 for(const side of [-1,1]){
  part(head,sph,mane,side*.32,-.08,.35,.20,.23,.36);
  part(head,sph,black,side*.38,.11,.56,.095,.075,.060);
  part(head,sph,teeth,side*.20,-.30,.81,.04,.09,.05);
 }
 const ears=[];
 for(const s of [-1,1]){
  const ear=part(head,new THREE.ConeGeometry(.18,.55,6),mane,s*.29,.42,.12);
  ear.rotation.z=-s*.12;ears.push(ear);
  part(head,new THREE.ConeGeometry(.095,.32,5),inner,s*.29,.43,.205).rotation.z=-s*.12;
  part(head,sph,iris,s*.37,.10,.51,.062,.053,.055);
 }
 const legs=[];
 for(const side of [-1,1])for(const z of [-1,1]){
  const l=part(body,new THREE.CylinderGeometry(.13,.17,.77,6),fur,side*.40,.47,z*.67);
  part(body,sph,mane,side*.40,.10,z*.73,.22,.14,.29);legs.push(l);
 }
 const tailPivot=new THREE.Group();tailPivot.position.set(0,1.31,-1.12);body.add(tailPivot);
 const tail=part(tailPivot,new THREE.ConeGeometry(.25,1.06,7),fur,0,0,-.35);
 tail.rotation.x=-1.13;
 part(tailPivot,sph,mane,0,.13,-.74,.23,.23,.30);
 function animate(time,distance=0,attack=0,howl=0,hit=0){
  const moving=Math.min(1,Math.max(0,distance*2.5)),idle=1-moving;
  const phase=time*7.3+variant,threat=attack>0;
  const sprint=Math.min(1,Math.max(0,distance*1.3));
  // Small idle breaths, listening movements and ear twitches make a still
  // wolf readable in the undergrowth without changing its hitbox or position.
  body.scale.y=1+.014*Math.sin(time*1.9+variant)*idle;
  for(let i=0;i<legs.length;i++){
   const stride=Math.sin(phase*(1+.35*sprint)+(i===0||i===3?0:Math.PI));
   legs[i].rotation.x=stride*(.35+.18*sprint)*moving;
  }
  // Visible warning: neck/head tilt upward, ears flare, howl before attack.
  const voice=Math.min(1,Math.max(0,howl));
  head.rotation.x=voice?-.62*voice:threat?-.20:.07*Math.sin(time*.8+variant);
  head.position.y=voice?1.48+.16*voice:1.48;
  head.rotation.z=hit>0?.085*Math.sin(time*19+variant):0;
  head.rotation.y=threat?0:Math.sin(time*.67+variant*.9)*.11*idle;
  for(let i=0;i<ears.length;i++){
   const side=i===0?-1:1;
   ears[i].rotation.z=-side*.12+Math.sin(time*2.1+variant+i*1.7)*.035*idle;
  }
  body.position.y=Math.sin(phase*2)*(.045+.025*sprint)*moving+.08*voice;
  body.rotation.x=-.035*sprint*Math.sin(phase*2)*moving;
  tailPivot.rotation.z=Math.sin(time*1.9+variant)*(threat?.06:.15);
  tailPivot.rotation.x=.08*Math.sin(time*1.1+variant);
 }
 return {root,animate};
}
