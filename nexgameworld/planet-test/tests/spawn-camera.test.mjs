import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIRST_SPAWN_CAMERA,isFirstCharacterSpawn} from '../spawn-camera.js';

const fresh=()=>({
 level:1,experience:0,revision:'0',positionNormal:[0,0,1]
});

test('a freshly created online hero gets the showcase camera, not a returning hero',()=>{
 const first=fresh();
 assert.equal(isFirstCharacterSpawn(first),true);
 assert.deepEqual(first.positionNormal,[0,0,1],'camera cannot move the server-owned hero');
 assert.equal(isFirstCharacterSpawn({...first,revision:'1'}),false);
 assert.equal(isFirstCharacterSpawn({...first,experience:1}),false);
 assert.equal(isFirstCharacterSpawn({...first,level:2}),false);
 assert.equal(isFirstCharacterSpawn({...first,positionNormal:[.01,0,.99995]}),false);
 assert.equal(isFirstCharacterSpawn(null),false);
});

test('initial view looks west to the longhouse with the building slightly right of center',()=>{
 const {heading,pitch,zoom,follow}=FIRST_SPAWN_CAMERA;
 const forward={x:Math.cos(heading),z:Math.sin(heading)};
 const house={x:-27,z:-2};
 assert.ok(forward.x*house.x+forward.z*house.z>25);
 const screenRight=-forward.z*house.x+forward.x*house.z;
 assert.ok(screenRight>3&&screenRight<10,'longhouse must remain right of the player');
 assert.ok(pitch>.3&&pitch<.6);
 assert.ok(zoom>=24&&zoom<=33);
 assert.equal(follow,false,'new character must not rotate the framing automatically');
});

test('game initializes first-spawn camera without replacing ordinary controls',()=>{
 const code=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(code,/firstSpawnCamera=isFirstCharacterSpawn\(accountProfile\)\?FIRST_SPAWN_CAMERA:null/);
 assert.match(code,/cameraHeading:previousWorld\?\.cameraHeading\?\?firstSpawnCamera\?\.heading\?\?0/);
 assert.match(code,/cameraPitch:previousWorld\?\.cameraPitch\?\?firstSpawnCamera\?\.pitch/);
 assert.match(code,/zoom:previousWorld\?\.zoom\?\?firstSpawnCamera\?\.zoom/);
 assert.match(code,/state\.cameraHeading -= \(e\.clientX - last\.x\) \* \.007/);
 assert.match(code,/camera\.lookAt\(cameraLookTarget\)/);
});
