import test from 'node:test';
import assert from 'node:assert/strict';
import {paintCastBar,hideCastBar,castBarBottom} from '../cast-bar.js';

function fixture(){
 const nodes={};
 for(const id of ['gatherCast','gatherCastLabel','gatherCastTime','gatherCastFill','gatherCastIcon'])
  nodes[id]={hidden:true,textContent:'',innerHTML:'',style:{},attributes:{},setAttribute(name,value){this.attributes[name]=value}};
 let measures=0,barTop=750;
 nodes.actionsBar={getBoundingClientRect(){measures++;return {top:barTop}}};
 const values={};
 const document={getElementById:id=>nodes[id]||null,defaultView:{innerWidth:390,innerHeight:844},
  documentElement:{style:{setProperty(name,value){values[name]=value},removeProperty(name){delete values[name]},getPropertyValue:name=>values[name]}}};
 return {document,nodes,measurements:()=>measures,resize(width,height,top){document.defaultView.innerWidth=width;document.defaultView.innerHeight=height;barTop=top}};
}

test('full real cast can wait for server without being hidden or declaring completion',()=>{
 const f=fixture(),root=f.nodes.gatherCast;
 paintCastBar(f.document,'gatherCast',{progress:0,label:'Сбор: Луговой цветок',timeText:'1,5 с',icon:'meadowFlower'});
 paintCastBar(f.document,'gatherCast',{progress:100,timeText:'Подтверждение…',waiting:true});
 assert.equal(root.hidden,false);
 assert.equal(root.attributes['data-cast-state'],'waiting');
 assert.equal(root.attributes['data-cast-spark'],'hidden');
 assert.equal(root.attributes['aria-valuenow'],'100');
 assert.equal(root.attributes['aria-valuetext'],'Сбор: Луговой цветок · Подтверждение…');
 assert.equal(f.nodes.gatherCastFill.style.width,'100.0%');
});

test('new cast resets old wait state and changes art without retaining a stale name',()=>{
 const f=fixture(),root=f.nodes.gatherCast;
 paintCastBar(f.document,'gatherCast',{progress:100,label:'Сбор: Луговой цветок',icon:'meadowFlower',waiting:true});
 const flower=f.nodes.gatherCastIcon.innerHTML;
 paintCastBar(f.document,'gatherCast',{progress:0,label:'Сбор: Кинжал разбойника',timeText:'1,5 с',icon:'banditDagger'});
 assert.equal(root.attributes['data-cast-state'],'casting');
 assert.equal(root.attributes['data-cast-spark'],'hidden');
 assert.equal(root.attributes['aria-valuenow'],'0');
 assert.equal(f.nodes.gatherCastFill.style.width,'0.0%');
 assert.notEqual(f.nodes.gatherCastIcon.innerHTML,flower);
 paintCastBar(f.document,'gatherCast',{progress:50,timeText:'0,8 с'});
 assert.equal(root.attributes['data-cast-spark'],'visible');
 assert.equal(root.attributes['aria-valuetext'],'Сбор: Кинжал разбойника · 0,8 с');
});

test('cancellation clears accessible progress and the next start returns to zero',()=>{
 const f=fixture(),root=f.nodes.gatherCast;
 paintCastBar(f.document,'gatherCast',{progress:70,label:'Сбор',timeText:'0,5 с'});
 hideCastBar(f.document,'gatherCast');
 assert.equal(root.hidden,true);
 assert.equal(root.attributes['data-cast-state'],'idle');
 assert.equal(root.attributes['aria-valuenow'],'0');
 assert.equal(root.attributes['aria-valuetext'],'');
 assert.equal(f.nodes.gatherCastFill.style.width,'0%');
 paintCastBar(f.document,'gatherCast',{progress:0,label:'Сбор',timeText:'1,5 с'});
 assert.equal(root.hidden,false);
 assert.equal(root.attributes['data-cast-state'],'casting');
 assert.equal(root.attributes['aria-valuenow'],'0');
});

test('gather frame follows viewport changes while progress painting avoids layout each frame',()=>{
 const f=fixture(),root=f.nodes.gatherCast;
 paintCastBar(f.document,'gatherCast',{progress:0});
 assert.equal(root.style.bottom,'114px');
 paintCastBar(f.document,'gatherCast',{progress:50});
 assert.equal(f.measurements(),1,'no repeated layout measurement during a normal cast');
 f.resize(844,390,305);
 paintCastBar(f.document,'gatherCast',{progress:55});
 assert.equal(root.style.bottom,'105px');
 assert.equal(305-(390-parseFloat(root.style.bottom)),20);
 assert.equal(f.measurements(),2);
});

test('invalid geometry and progress are contained without missing-element failures',()=>{
 assert.equal(castBarBottom(0,100),null);
 assert.equal(castBarBottom(844,-1),null);
 assert.equal(castBarBottom(844,900),null);
 const f=fixture();
 for(const progress of [NaN,Infinity,-50,250]){
  paintCastBar(f.document,'gatherCast',{progress});
  const n=Number(f.nodes.gatherCast.attributes['aria-valuenow']);
  assert.ok(n>=0&&n<=100);
 }
 assert.doesNotThrow(()=>paintCastBar(f.document,'missing',{progress:50}));
 assert.doesNotThrow(()=>hideCastBar(f.document,'missing'));
});

test('default utility clearance is measured above cast and remains until both casts close',()=>{
 const f=fixture(),style=f.document.documentElement.style;
 f.nodes.gatherCast.getBoundingClientRect=()=>({height:34});
 paintCastBar(f.document,'gatherCast',{progress:30});
 assert.equal(style.getPropertyValue('--ngw-cast-utility-bottom'),'156px');
 f.nodes.mountCast={hidden:false,style:{bottom:'120px'},getBoundingClientRect:()=>({height:36}),setAttribute(){}};
 hideCastBar(f.document,'gatherCast');
 assert.equal(style.getPropertyValue('--ngw-cast-utility-bottom'),'164px');
 hideCastBar(f.document,'mountCast');
 assert.equal(style.getPropertyValue('--ngw-cast-utility-bottom'),undefined);
});
