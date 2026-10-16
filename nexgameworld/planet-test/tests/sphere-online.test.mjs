import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpherePlayer,greatCircleDistance} from '../sphere-online.js';

test('spherical avatars reject invalid normals, wrong world radius and malformed IDs',()=>{
 const base={id:'hero-1',name:'Странник',radius:261,normal:[0,0,1],heading:0,moving:true};
 assert.equal(validateSpherePlayer(base,261),true);
 assert.equal(validateSpherePlayer({...base,radius:87},261),false);
 assert.equal(validateSpherePlayer({...base,normal:[20,0,0]},261),false);
 assert.equal(validateSpherePlayer({...base,normal:[NaN,0,1]},261),false);
 assert.equal(validateSpherePlayer({...base,moving:'yes'},261),false);
});
test('geodesic peer distance uses arc length instead of flat-world coordinates',()=>{
 assert.equal(greatCircleDistance([0,0,1],[0,0,1],261),0);
 assert.ok(Math.abs(greatCircleDistance([0,0,1],[1,0,0],261)-261*Math.PI/2)<1e-8);
 assert.equal(greatCircleDistance([0,0,1],[2,0,0],261),Infinity);
});
