// A bounded cosmetic pool: damage is exclusively acknowledged by the server.
export function createHunterProjectiles(THREE,scene){
 const pool=Array.from({length:8},()=>{const mesh=new THREE.Mesh(new THREE.ConeGeometry(.055,.8,5),new THREE.MeshBasicMaterial({color:0xe9cf8e}));mesh.visible=false;scene.add(mesh);return {mesh,from:new THREE.Vector3(),to:new THREE.Vector3(),age:1};});let cursor=0;
 const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3();
 return {fire(from,to,id){const fx=pool[cursor++%pool.length];fx.from.copy(from).addScaledVector(dir.copy(from).normalize(),1.7);fx.to.copy(to).addScaledVector(dir.copy(to).normalize(),1.4);fx.age=0;fx.mesh.visible=true;fx.mesh.material.color.set(id==='arcaneShot'?0xbd8aff:id==='concussiveShot'?0x7bd8ec:0xebd292);fx.mesh.quaternion.setFromUnitVectors(up,dir.copy(fx.to).sub(fx.from).normalize());},update(dt){for(const fx of pool){if(!fx.mesh.visible)continue;fx.age+=dt;if(fx.age>=.22){fx.mesh.visible=false;continue;}fx.mesh.position.lerpVectors(fx.from,fx.to,fx.age/.22);}},clear(){for(const fx of pool)fx.mesh.visible=false;}};
}
