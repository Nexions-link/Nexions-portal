import test from 'node:test';
import assert from 'node:assert/strict';
import {createXpFeedback} from '../xp-feedback.js';
const fake=()=>{
 const make=()=>({children:[],className:'',textContent:'',attributes:{},listeners:{},
  append(child){this.children.push(child)},
  replaceChildren(...children){this.children=children},
  setAttribute(name,value){this.attributes[name]=value},
  addEventListener(type,fn){this.listeners[type]=fn}});
 const layer=make(),document={createElement:make};
 return {layer,document};
};
test('new XP awards animate upward with bounded simultaneous popups',()=>{
 const {layer,document}=fake(),xp=createXpFeedback({document,layer,maxVisible:3});
 assert.equal(xp.show(22).textContent,'+ 22 опыта');
 xp.show(26);xp.show(70);xp.show(0);
 assert.equal(layer.children.length,3);
 assert.equal(layer.children[0].textContent,'+ 26 опыта');
 assert.equal(layer.children[2].textContent,'0 опыта');
 assert.equal(layer.children[2].attributes['aria-label'],'0 опыта');
 layer.children[2].listeners.animationend();
 assert.equal(layer.children.length,2);
 assert.equal(xp.show(-1),null);
});
