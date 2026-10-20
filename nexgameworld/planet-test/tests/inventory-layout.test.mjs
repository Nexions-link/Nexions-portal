import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const html=readFileSync(fileURLToPath(new URL('../index.html',import.meta.url)),'utf8');
const a=html.indexOf('<style id="ngw-floating-bag-v1">');
const b=html.indexOf('</style>',a);
const css=html.slice(a,b);
test('compact inventory has fluid four-column cells without fixed widths',()=>{
 assert.ok(a>=0&&b>a);
 assert.match(css,/#panel\.inventory-modal \.inventory-grid\s*\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/s);
 assert.doesNotMatch(css,/grid-template-columns:repeat\(4,40px\)/);
 assert.match(css,/#panel\.inventory-modal \.inventory-slot\s*\{[^}]*width:100%!important/s);
});
test('item details are separately scrollable and tightly typeset',()=>{
 assert.match(css,/#panel\.inventory-modal #mbody\s*\{[^}]*overflow:hidden!important/s);
 assert.match(css,/#panel\.inventory-modal \.inventory-detail\s*\{[^}]*overflow-y:auto/s);
 assert.match(css,/#panel\.inventory-modal \.inventory-detail p\s*\{[^}]*font:11px\/1\.35/s);
 assert.match(css,/#panel\.inventory-modal \.ngw-gear-compare\s*\{[^}]*padding:6px!important/s);
});
test('inventory remains floating, without modal screen resizing',()=>{
 assert.match(css,/#modal:has\(#panel\.inventory-modal\):not\(\[hidden\]\)/);
 assert.match(css,/#modal #panel\.inventory-modal\s*\{[^}]*position:fixed!important/s);
});

test('bag header owns drag area; close button is pinned inside the sheet',()=>{
 assert.match(css,/#panel\.inventory-modal #mtitle\s*\{[^}]*width:calc\(100% - 31px\)!important/s);
 assert.match(css,/#panel\.inventory-modal #mtitle::after\s*\{[^}]*content:"⋮⋮"/s);
 assert.match(css,/#panel\.inventory-modal #modalClose\s*\{[^}]*position:absolute!important/s);
 assert.match(css,/#panel\.inventory-modal #modalClose\s*\{[^}]*width:27px!important/s);
 assert.match(html,/const key='ngw-bag-position-v2'/);
 assert.match(html,/drag\.centerX\+e\.clientX-drag\.startX/);
});
