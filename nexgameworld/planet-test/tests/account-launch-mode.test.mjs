import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('ordinary game launches require a selected account; public preview stays isolated',()=>{
 const code=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(code,/const accountMode=!isPortalPreview;/);
 assert.match(code,/if\(accountMode&&!accountLaunch\)/);
 assert.match(code,/url:accountMode\?AUTH_WORLD_URL:undefined/);
});
