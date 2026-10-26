import test from "node:test";
import assert from "node:assert/strict";
import {defaultWheel,defaultAction,validateWheel,chooseSegment,emptyState,getPool,publicWheel,
  distance,spinAngle,safeAssetPath,escapeHTML,uid} from "../scripts/core/model.js";
test("valid default wheel uses binding product choices",()=>{
  const w=validateWheel(defaultWheel());assert.equal(w.design,"magical-halloween");
  assert.ok(w.segments.every(s=>s.delivery==="display"));assert.equal(defaultAction().target,"winner");
  assert.equal(w.rules.cost.amount,0);assert.equal(w.rules.maxSpins,0);
});
for(const [name,change] of [
  ["negative weight",w=>w.segments[0].chance=-1],
  ["NaN weight",w=>w.segments[0].chance=NaN],
  ["infinite weight",w=>w.segments[0].chance=Infinity],
  ["fractional stock",w=>w.segments[0].stock=1.2],
  ["duplicate IDs",w=>w.segments[1].id=w.segments[0].id],
  ["prototype ID",w=>w.segments[0].id="__proto__"],
  ["unsafe currency path",w=>w.rules.cost.path="system.__proto__.x"],
  ["empty item for automatic",w=>w.segments[0].delivery="automatic"],
  ["empty item for confirmation",w=>w.segments[0].delivery="confirm"],
  ["all unplayable",w=>w.segments.forEach(s=>s.chance=0)],
  ["unsafe sound",w=>w.actions=[{...defaultAction(),type:"sound",value:"javascript:alert(1)"}]],
  ["future schema",w=>w.schema=999],
  ["unknown action",w=>w.actions=[{...defaultAction(),type:"fake"}]],
]) test(`validation rejects ${name}`,()=>{const w=defaultWheel();change(w);assert.throws(()=>validateWheel(w));});
test("weighted boundaries obey exact weight intervals",()=>{
  const segments=[{id:"a",weight:1},{id:"b",weight:3},{id:"c",weight:6}];
  for(const [random,expected] of [[0,"a"],[.099999,"a"],[.1,"b"],[.399999,"b"],[.4,"c"],[.999999,"c"]]) assert.equal(chooseSegment(segments,random).id,expected);
  assert.throws(()=>chooseSegment(segments,1));assert.throws(()=>chooseSegment([],0));
});
test("shared/own pools and world-time resets remain independent",()=>{
  const w=defaultWheel(),s=emptyState(),p={id:"p",pool:"shared"};w.stockResetSeconds=30;w.segments[0].stock=2;
  const a=getPool(s,w,p,100);a.remaining[w.segments[0].id]=0;
  assert.equal(getPool(s,w,{id:"p2",pool:"shared"},110).remaining[w.segments[0].id],0);
  assert.equal(getPool(s,w,{id:"p3",pool:"own"},110).remaining[w.segments[0].id],2);
  assert.equal(getPool(s,w,p,129).remaining[w.segments[0].id],0);
  assert.equal(getPool(s,w,p,130).remaining[w.segments[0].id],2);
});
test("public projection hides weights, inventory UUIDs, actions and depleted odds",()=>{
  const w=defaultWheel();w.segments[0].itemUuid="Item.secret";w.segments[0].chance=100;w.segments[0].stock=1;
  const s=emptyState(),p=getPool(s,w,{id:"p",pool:"own"},0);p.remaining[w.segments[0].id]=0;
  let view=publicWheel(w,p);assert.equal(view.segments[0].available,false);
  assert.ok(!JSON.stringify(view).includes("Item.secret"));assert.ok(!("weight" in view.segments[0]));assert.ok(!("chance" in view.segments[1]));
  w.showOdds=true;w.segments.forEach(s=>s.showChance=true);view=publicWheel(w,p);assert.equal(view.segments[0].chance,0);
  assert.ok(Math.abs(view.segments.reduce((n,s)=>n+s.chance,0)-1)<1e-12);
});
test("spin pointer always lands inside authoritative winning sector",()=>{
  for(const count of [2,3,6,13,100]) for(let i=0;i<count;i++) {
    const angle=spinAngle(i,count),atPointer=((360-angle%360)%360)/360*count;
    assert.equal(Math.floor(atPointer),i);
  }
});
test("range includes scene scale and elevation",()=>{
  assert.equal(distance({x:0,y:0,elevation:0},{x:300,y:400,elevation:0},{size:100,distance:5}),25);
  assert.equal(distance({x:0,y:0,elevation:0},{x:0,y:0,elevation:10},{size:100,distance:5}),10);
});
test("output escapes text and rejects executable asset schemes",()=>{
  assert.equal(escapeHTML('<script>"&'),"&lt;script&gt;&quot;&amp;");
  for(const path of ["javascript:a","data:a","file:a","//evil/x","a\" onclick=bad"]) assert.equal(safeAssetPath(path),false);
  assert.equal(safeAssetPath("worlds/test/audio/spin.ogg"),true);
});
test("IDs work on HTTP hosts without crypto.randomUUID",()=>{
  const original=crypto.randomUUID;
  try {crypto.randomUUID=undefined;assert.match(uid(),/^[0-9a-f]{32}$/);assert.notEqual(uid(),uid());}
  finally {crypto.randomUUID=original;}
});

test("individual label settings expose only opted-in chance and live pool stock",()=>{
 const w=defaultWheel();w.segments[0].showChance=true;w.segments[0].showStock=true;w.segments[0].stock=5;
 w.segments[0].textDirection="vertical";w.segments[0].fontSize=62;w.appearance.textDirection="horizontal";
 const pool={remaining:{[w.segments[0].id]:3}},view=publicWheel(w,pool);
 assert.equal(view.segments[0].remaining,3);assert.ok(view.segments[0].chance>0);
 assert.equal(view.segments[0].fontSize,62);assert.equal(view.segments[0].textDirection,"vertical");
 assert.equal(view.segments[1].textDirection,"horizontal");assert.equal(view.segments[1].fontSize,38);
 assert.ok(!('chance' in view.segments[1]));assert.ok(!('remaining' in view.segments[1]));
 w.segments[0].stock=null;assert.equal(publicWheel(w,pool).segments[0].remaining,null);
 pool.remaining[w.segments[0].id]=0;w.segments[0].stock=5;assert.equal(publicWheel(w,pool).segments[0].remaining,0);
});
test("unsafe typography and lighting values are rejected before persisting",()=>{
 for(const change of [w=>w.appearance.dim=101,w=>w.appearance.fontSize=0,w=>w.segments[0].fontSize=-1,w=>w.segments[0].textDirection="bad",w=>w.segments[0].showChance="true"]){
  const w=defaultWheel();change(w);assert.throws(()=>validateWheel(w));
 }
});
