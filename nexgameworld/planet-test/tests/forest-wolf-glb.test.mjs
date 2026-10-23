import test from 'node:test';
import assert from 'node:assert/strict';
import {selectForestWolfLOD,FOREST_WOLF_GLB,FOREST_WOLF_REQUIRED_CLIPS,
 FOREST_WOLF_SWITCH,validateForestWolfAssets} from '../forest-wolf-glb.js';
test('wolf LOD uses hysteresis and never swaps to distant while fighting',()=>{
 assert.equal(selectForestWolfLOD(0),'near');
 assert.equal(selectForestWolfLOD(35,'near'),'near');
 assert.equal(selectForestWolfLOD(36,'near'),'far');
 assert.equal(selectForestWolfLOD(33,'far'),'far');
 assert.equal(selectForestWolfLOD(28,'far'),'near');
 assert.equal(selectForestWolfLOD(100,'far',true),'near');
 assert.equal(selectForestWolfLOD(NaN,'far'),'near');
 assert.ok(FOREST_WOLF_SWITCH.farAt>FOREST_WOLF_SWITCH.nearAt);
});
test('wolf models are shared and the near one needs all combat clips',()=>{
 assert.match(FOREST_WOLF_GLB.near,/forest-wolf-v1\.glb/);
 assert.match(FOREST_WOLF_GLB.far,/forest-wolf-far-v1\.glb/);
 assert.deepEqual([...FOREST_WOLF_REQUIRED_CLIPS],['Idle','Walk','Run','Attack','Hurt','Death']);
 const near={scene:{getObjectByName:n=>n==='Head'||n==='FL_Upper'},animations:FOREST_WOLF_REQUIRED_CLIPS.map(name=>({name}))};
 const far={scene:{}};
 assert.equal(validateForestWolfAssets(near,far),true);
 assert.equal(validateForestWolfAssets({...near,animations:[]},far),false);
});
