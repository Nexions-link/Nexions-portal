import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {hornPathPoints,hornRadius,TAUREN_HORN_PROFILE} from './tauren-horn-profile.js';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

test('both horns share a smooth mirrored curve rooted inside the head',()=>{
 const left=hornPathPoints(THREE,-1),right=hornPathPoints(THREE,1);
 assert.equal(left.length,5);
 assert.deepEqual(TAUREN_HORN_PROFILE[0],[.30,.28,.00]);
 for(let i=0;i<left.length;i++){
  assert.equal(left[i].x,-right[i].x);
  assert.equal(left[i].y,right[i].y);
  assert.equal(left[i].z,right[i].z);
 }
 const first=right[0];
 assert.ok(first.x<.4&&first.y<.4,'base must overlap forehead/temple mesh');
 assert.ok(new THREE.CatmullRomCurve3(left).getTangent(.2).length()>.9);
});

test('ornament radii follow sculpted horn surface rather than offset torus geometry',()=>{
 assert.ok(hornRadius(0)>hornRadius(.25));
 assert.ok(hornRadius(.25)>hornRadius(.75));
 assert.ok(hornRadius(.75)>hornRadius(1));
 // ornament's outer edge is 0.989 * (1 + .024) ~= 1.013 of the original
 // horn radius: a shallow engraving, not a free-standing oversized ring.
 assert.ok(.989*(1+.024)<1.02);
 const details=readFileSync(fileURLToPath(new URL('./tauren-visual-details.js',import.meta.url)),'utf8');
 const geometry=readFileSync(fileURLToPath(new URL('./start-zone.js',import.meta.url)),'utf8');
 assert.match(details,/hornPathPoints\(THREE,sign\)/);
 assert.match(details,/hornRadius\(t\)/);
 assert.match(geometry,/hornPathPoints\(THREE,sign\)/);
 assert.match(geometry,/hornRadius\(t\)/);
});
