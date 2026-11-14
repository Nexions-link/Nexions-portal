// Original orc mesh on the same articulated rig as the native hero.
// Shared rig means terrain feet, mounts, weapons and remote animation stay aligned.
export function createOrc(THREE,scene){
 const root=new THREE.Group();scene.add(root);
 const group=(parent,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
 const mat=(color,roughness=.88)=>new THREE.MeshStandardMaterial({color,roughness});
 const skin=mat(0x66804a),light=mat(0x7e9256),dark=mat(0x314332),leather=mat(0x47352c),trim=mat(0x9f7545),iron=mat(0x535c58,.5),ivory=mat(0xead9a4),hair=mat(0x1a2320),eye=mat(0xdca34b),black=mat(0x111512);
 const sphere=new THREE.SphereGeometry(1,18,12);
 const ell=(p,m,x,y,z,sx,sy,sz)=>{const o=new THREE.Mesh(sphere,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const cone=(p,m,x,y,z,r,h)=>{const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,12),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;};
 const body=group(root,0,1.4),chest=group(body),neck=group(chest,0,1.02,.25),head=group(neck),tail=group(body),braids=[];
 ell(chest,skin,0,.56,0,.78,.85,.43);ell(chest,skin,0,1,-.08,.94,.44,.42);
 for(const s of [-1,1]){ell(chest,light,s*.36,.78,.34,.36,.27,.14);ell(chest,skin,s*.22,.28,.36,.23,.33,.12);}
 ell(head,skin,0,.22,0,.43,.55,.35);ell(head,light,0,-.13,.15,.43,.29,.33);
 ell(head,dark,0,-.18,.435,.30,.035,.035);ell(head,skin,0,.11,.34,.14,.20,.15);
 for(const s of [-1,1]){
  ell(head,dark,s*.205,.26,.30,.16,.11,.09);ell(head,ivory,s*.20,.25,.37,.10,.052,.025);ell(head,eye,s*.19,.25,.395,.047,.05,.016);ell(head,black,s*.19,.25,.411,.021,.038,.009);
  ell(head,skin,s*.21,.355,.35,.22,.085,.10).rotation.z=s*.22;
  const ear=cone(head,skin,s*.50,.28,0,.14,.40);ear.rotation.z=-s*1.0;
  const tusk=cone(head,ivory,s*.245,-.025,.45,.075,.33);tusk.rotation.z=-s*.20;tusk.rotation.x=.16;
 }
 for(let i=0;i<7;i++)ell(head,hair,0,.63-i*.025,-.23+i*.075,.12,.16,.12);
 const knot=group(head,0,.58,-.27);ell(knot,hair,0,.04,0,.16,.17,.17);braids.push(knot);
 ell(body,leather,0,-.12,0,.62,.28,.43);ell(body,trim,0,-.03,.40,.19,.13,.04);
 for(const s of [-1,1])ell(body,leather,s*.22,-.40,.22,.28,.36,.24);
 const arms=[],legs=[];
 for(const s of [-1,1]){
  const shoulder=group(chest,s*.86,.96,0),elbow=group(shoulder,s*.13,-.69,.015),hand=group(elbow,s*.025,-.69,.035);
  ell(shoulder,skin,s*.04,-.19,0,.36,.48,.33);ell(elbow,skin,0,-.28,0,.28,.42,.26);ell(elbow,leather,0,-.55,0,.29,.15,.27);
  ell(hand,skin,0,-.1,.015,.26,.24,.22);for(let i=0;i<4;i++)ell(hand,skin,(i-1.5)*.105,-.26,.055,.065,.14,.10);
  ell(hand,skin,-s*.22,-.07,.13,.10,.16,.10);arms.push({shoulder,elbow,hand});
  ell(shoulder,iron,s*.03,.06,-.02,.41,.20,.38);for(let i=0;i<3;i++)cone(shoulder,ivory,s*(.04+i*.1),.28,-.15+i*.13,.055,.25);
  const hip=group(root,s*.38,1.4),knee=group(hip,0,-.72),foot=group(knee,0,-.68);
  ell(hip,leather,0,-.29,0,.28,.46,.28);ell(knee,skin,0,-.23,0,.22,.35,.22);ell(knee,leather,0,-.50,0,.23,.23,.23);ell(foot,leather,0,-.04,.13,.25,.18,.38);
  legs.push({hip,knee,foot,sign:s});
 }
 root.userData.raceId='orc';
 return {root,body,chest,neck,head,tail,braids,arms,legs,visualDetails:null,anatomy:null};
}
export function equipBowVisual(THREE,actor){
 if(actor.root.userData.hunterBow)return actor.root.userData.hunterBow;
 const bow=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:0x84532c,roughness:.65}),metal=new THREE.MeshStandardMaterial({color:0xc4ad6c,metalness:.45,roughness:.4});
 // The recurved tips leave room for the holding hand's opposed thumb.
 const points=[[-.15,-.86,0],[.22,-.55,0],[.30,0,0],[.22,.55,0],[-.15,.86,0]].map(p=>new THREE.Vector3(...p));
 const limb=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.045,7,false),wood);bow.add(limb);
 const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([points[0],points[4]]),new THREE.LineBasicMaterial({color:0xe5d7b7}));string.name='bow-string';bow.add(string);
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.24,10),metal);grip.name='bow-grip';grip.position.x=.30;bow.add(grip);
 // Face the string toward the other (drawing) hand, while keeping the
 // handle centered in the shared palm position (0,-.10,.015).
 bow.rotation.set(Math.PI/2,0,Math.PI);
 bow.position.set(.30,-.10,.015);bow.visible=false;
 actor.arms[0].hand.add(bow);actor.root.userData.hunterBow=bow;
 return bow;
}
export function equipHunterVisual(THREE,actor){
 actor.root.userData.classId='hunter';
 equipBowVisual(THREE,actor);
 if(actor.root.userData.hunterQuiver)return;
 const wood=new THREE.MeshStandardMaterial({color:0x84532c,roughness:.65}),metal=new THREE.MeshStandardMaterial({color:0xc4ad6c,metalness:.45,roughness:.4});
 const quiver=new THREE.Mesh(new THREE.CylinderGeometry(.18,.14,.83,12),wood);quiver.position.set(.48,.55,-.48);quiver.rotation.z=-.3;actor.chest.add(quiver);
 actor.root.userData.hunterQuiver=quiver;
 for(let i=0;i<4;i++){const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.60,5),metal);shaft.position.set(.38+i*.07,1.07,-.49);shaft.rotation.z=-.3;actor.chest.add(shaft);}
}
