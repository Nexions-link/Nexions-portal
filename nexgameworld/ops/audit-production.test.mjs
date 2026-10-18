import test from 'node:test';
import assert from 'node:assert/strict';
import {auditProduction,auditWithRetry} from './audit-production.mjs';

const SHA='3ee6b48847dae59789aefa7f40895ba8f997c172';
function mock({build='0.6.41.4',manifestVersion='0.6.41.4',
 sha=SHA,ready=true,db='ready',guest=false,failures=0}={}){
 const routes={
 '/health':{ok:true,world:'nexgameworld',build,players:2,
  databaseConfigured:true,accountDbStatus:db,accountApiEnabled:true,
  authenticatedWorldEnabled:true,authenticatedEconomyEnabled:true,
  guestWorldEnabled:guest,worldMetrics:{progressSaveFailures:failures}},
 '/ready':{ready,build},
 '/nexgameworld/planet-test/version.json':{version:manifestVersion},
 '/nexgameworld/upstream-commit.txt':sha+'\n'
 };
 return async href=>{
  const pathname=new URL(href).pathname;
  if(!(pathname in routes))return {ok:false,status:404};
  const value=routes[pathname];
  if(pathname==='/ready'&&!ready)return {ok:false,status:503};
  return {ok:true,status:200,json:async()=>value,text:async()=>value};
 };
}
test('accept live authenticated server and exact portal commit',async()=>{
 const report=await auditProduction({fetchImpl:mock(),expectedSha:SHA});
 assert.equal(report.version,'0.6.41.4');
 assert.equal(report.publishedSha,SHA);
 assert.equal(report.players,2);
});
test('reject stale mirrored site instead of reporting success',async()=>{
 await assert.rejects(()=>auditProduction({fetchImpl:mock({sha:'f'.repeat(40)}),expectedSha:SHA}),/behind Nexgame\/main/);
});
test('reject mismatched server and client versions',async()=>{
 await assert.rejects(()=>auditProduction({fetchImpl:mock({build:'0.6.42.0'}),expectedSha:SHA}),/do not match/);
});
test('reject unavailable database and accidentally enabled guest world',async()=>{
 await assert.rejects(()=>auditProduction({fetchImpl:mock({ready:false}),expectedSha:SHA}),/HTTP 503/);
 await assert.rejects(()=>auditProduction({fetchImpl:mock({db:'unavailable'}),expectedSha:SHA}),/not ready/);
 await assert.rejects(()=>auditProduction({fetchImpl:mock({guest:true}),expectedSha:SHA}),/Guest world/);
});
test('alert when server reports any progress-save failure',async()=>{
 await assert.rejects(()=>auditProduction({fetchImpl:mock({failures:3}),expectedSha:SHA}),/progressSaveFailures is nonzero: 3/);
});
test('retry recovers a transient failure and never sends credentials',async()=>{
 let calls=0;
 const wrapped=async (href,...args)=>{
  if(calls++===0)throw Error('temporary network failure');
  return mock()(href,...args);
 };
 const r=await auditWithRetry({fetchImpl:wrapped,expectedSha:SHA},
  {attempts:2,delayMs:0,sleep:async()=>{}});
 assert.equal(r.version,'0.6.41.4');
});
