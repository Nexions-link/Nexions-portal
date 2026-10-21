// Original low-poly wolf: lightweight mobile quadruped with procedural gait.
export function createForestWolfVisual(THREE,variant=0){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const mat=hex=>new THREE.MeshStandardMaterial({color:hex,roughness:1,flatShading:true});
 const fur=mat(variant%2?'#59574d':'#4b524e'),mane=mat('#383d35'),light=mat('#a69c86'),
  black=mat('#252723'),iris=mat('#b6a07e');
 const sph=new THREE.IcosahedronGeometry(1,1);
 function part(parent,geo,color,x,y,z,sx=1,sy=1,sz=1){
  const o=new THREE.Mesh(geo,color);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
 }
 part(body,sph,fur,0,1.12,0,.59,.53,1.04);
 part(body,sph,mane,0,1.3,.42,.61,.66,.58);
 const head=new THREE.Group();head.position.set(0,1.48,.79);body.add(head);
 part(head,sph,fur,0,0,.23,.45,.38,.50);
 part(head,sph,light,0,-.18,.65,.26,.20,.40);
 part(head,sph,black,0,-.17,.96,.15,.11,.16);
 const ears=[];
 for(const s of [-1,1]){
  const ear=part(head,new THREE.ConeGeometry(.18,.55,6),mane,s*.29,.42,.12);
  ear.rotation.z=-s*.12;ears.push(ear);
  part(head,sph,iris,s*.37,.10,.51,.062,.053,.055);
 }
 const legs=[];
 for(const side of [-1,1])for(const z of [-1,1]){
  const l=part(body,new THREE.CylinderGeometry(.13,.17,.77,6),fur,side*.40,.47,z*.67);
  part(body,sph,mane,side*.40,.10,z*.73,.22,.14,.29);legs.push(l);
 }
 const tail=part(body,new THREE.ConeGeometry(.25,1.06,7),fur,0,1.31,-1.12);
 tail.rotation.x=-1.13;
 function animate(time,distance=0,attack=0){
  const moving=Math.min(1,Math.max(0,distance*2.5)),idle=1-moving;
  const phase=time*7.3+variant,threat=attack>0;
  // Small idle breaths, listening movements and ear twitches make a still
  // wolf readable in the undergrowth without changing its hitbox or position.
  body.scale.y=1+.014*Math.sin(time*1.9+variant)*idle;
  for(let i=0;i<legs.length;i++)legs[i].rotation.x=Math.sin(phase+(i===0||i===3?0:Math.PI))*.43*moving;
  head.rotation.x=threat?-.20:.07*Math.sin(time*.8+variant);
  head.rotation.y=threat?0:Math.sin(time*.67+variant*.9)*.11*idle;
  for(let i=0;i<ears.length;i++){
   const side=i===0?-1:1;
   ears[i].rotation.z=-side*.12+Math.sin(time*2.1+variant+i*1.7)*.035*idle;
  }
  body.position.y=Math.sin(phase*2)*.07*moving;
  tail.rotation.z=Math.sin(time*1.9+variant)*(threat?.06:.15);
 }
 return {root,animate};
}
