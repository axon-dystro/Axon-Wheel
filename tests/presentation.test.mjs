import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultWheel,validateWheel,emptyRecord} from "../scripts/core/model.js";
import {THEMES,percentages,allocateRemaining,migrateConfig,chanceTotal,currencyChoices} from "../scripts/core/presentation.js";
import {rectangle,polygonDistance} from "../scripts/core/geometry.js";
import {readDocument} from "../scripts/foundry/store.js";

test("percentages sum to exactly 100 with six and one hundred segments",()=>{
  for(const count of [2,3,6,37,100]){const p=percentages(Array(count).fill(1));assert.equal(p.reduce((n,x)=>n+Math.round(x*100),0),10000);}
  assert.deepEqual(percentages([1,3,6]),[10,30,60]);assert.deepEqual(percentages([]),[]);
});
test("direct chance stays fixed while remaining chances are distributed",()=>{
  const w=defaultWheel();w.segments[0].chance=50;allocateRemaining(w.segments,0);
  assert.equal(w.segments[0].chance,50);assert.equal(chanceTotal(w.segments),100);assert.ok(w.segments.slice(1).every(s=>s.chance===10));
  w.segments[0].chance=100;allocateRemaining(w.segments,0);assert.ok(w.segments.slice(1).every(s=>s.chance===0));
});
test("saving rejects incomplete or overallocated direct percentages",()=>{
  const w=defaultWheel();w.segments[0].chance=1;assert.throws(()=>validateWheel(w),/100 %/);
  w.segments[0].chance=99;assert.throws(()=>validateWheel(w),/100 %/);
});
test("alpha.1 migration preserves wheel identities, rules, placements and stock history",()=>{
  const old=defaultWheel("old-wheel");old.schema=1;
  old.segments.forEach((s,i)=>{delete s.chance;delete s.theme;delete s.image;s.weight=i===0?3:1;});
  old.rules.maxSpins=5;old.placements=[{id:"p1",sceneId:"s1",documentId:"d1",name:"NPC",kind:"token",pool:"own",enabled:true}];
  const migrated=migrateConfig(old);validateWheel(migrated);
  assert.equal(migrated.id,old.id);assert.deepEqual(migrated.rules,old.rules);assert.deepEqual(migrated.placements,old.placements);
  assert.equal(migrated.segments[0].chance,37.5);assert.equal(chanceTotal(migrated.segments),100);
  assert.ok(migrated.segments.every(s=>!('weight' in s)&&THEMES.some(t=>t.id===s.theme)));
  assert.equal(old.schema,1);assert.ok('weight' in old.segments[0]);
});
test("token touching, overlapping or standing on a large tile is at distance zero",()=>{
  const wheel=rectangle(100,100,600,600);
  for(const token of [rectangle(300,300,100,100),rectangle(0,150,100,100),rectangle(50,200,100,100)])assert.equal(polygonDistance(token,wheel),0);
  assert.equal(polygonDistance(rectangle(0,0,100,100),rectangle(200,0,100,100)),100);
});
test("loading an old record retains existing stocks, pending awards and spin history",()=>{
  const config=defaultWheel("existing");config.schema=1;config.segments.forEach(s=>{s.weight=s.chance;delete s.chance;delete s.theme;delete s.image;});
  const record=emptyRecord(config);record.schema=1;record.state.pools={shared:{resetAt:90,remaining:{prize:2}}};
  record.state.spins=[{id:"existing-spin",status:"awaiting",delivery:"pending",segment:{itemUuid:"Item.old"}}];
  const result=readDocument({getFlag:()=>JSON.stringify(record)});assert.equal(result.schema,3);assert.equal(result.config.schema,3);
  assert.deepEqual(result.state,record.state);assert.equal(result.config.id,"existing");
});
test("rotated footprints include crossing edges even without enclosed corners",()=>{
  assert.equal(polygonDistance(rectangle(-100,-10,200,20),rectangle(-10,-100,20,200)),0);
  assert.equal(polygonDistance(rectangle(20,20,40,40),rectangle(0,0,100,100,45)),0);
  assert.ok(polygonDistance(rectangle(-300,0,10,10),rectangle(0,0,100,100,45))>0);
});
test("custom image paths are validated and every built-in motif is packaged",async()=>{
  const w=defaultWheel();w.segments[0].theme="custom";assert.throws(()=>validateWheel(w),/Bilddatei/);
  w.segments[0].image="worlds/test/pumpkin.webp";validateWheel(w);
  w.segments[0].image="javascript:bad";assert.throws(()=>validateWheel(w),/Bilddatei/);
  for(const t of THEMES){const svg=await readFile(`assets/themes/${t.id}.svg`,'utf8');assert.match(svg,/<svg/);assert.match(svg,/viewBox="0 0 512 512"/);assert.doesNotMatch(svg,/<script/);}
});
test("D&D5e currency menu maps visible coin names to numeric fields",()=>{
  globalThis.game={system:{id:"dnd5e",version:"6.0.6"}};const coins=currencyChoices();assert.equal(coins.length,5);
  assert.deepEqual(coins.find(c=>c.label==="Goldstücke"),{label:"Goldstücke",path:"system.currency.gp"});
});
test("editor shows direct percentages, themes and understandable rule labels",async()=>{
  globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
  globalThis.game={system:{id:"dnd5e",version:"6.0.6"},users:[],scenes:{get:()=>null}};
  const {WheelManager}=await import('../scripts/ui/manager.js');const m=new WheelManager({});m.draft=defaultWheel();m.record=emptyRecord(m.draft);
  m.tab="segments";let html=m.panel();assert.match(html,/Gewinnchance \(%\)/);assert.match(html,/Halloween-Motiv/);assert.doesNotMatch(html,/>Gewicht</);
  m.tab="rules";html=m.panel();assert.match(html,/Goldstücke/);assert.match(html,/Wartezeit bis zur nächsten Drehung/);assert.doesNotMatch(html,/Numerisches Actor-Feld|GM-konfigurierte/);
  m.tab="advanced";assert.match(m.panel(),/Optionale Effekte bei jeder Drehung/);
});

test("alpha.2 upgrade preserves all state and applies old chance visibility to individual segments",()=>{
 const w=defaultWheel("kept");w.schema=2;w.showOdds=true;delete w.appearance;delete w.showStock;
 for(const s of w.segments)for(const key of ["showChance","showStock","textDirection","fontSize"])delete s[key];
 const r=emptyRecord(w);r.schema=2;r.state={revision:81,pools:{shared:{resetAt:2,remaining:{s1:4}}},limits:{x:{count:3,lastAt:1,resetAt:0}},spins:[{id:"pending-old",status:"awaiting",segment:{id:"s1"},view:{id:"kept"}}]};
 const upgraded=readDocument({getFlag:()=>JSON.stringify(r)});
 assert.equal(upgraded.schema,3);validateWheel(upgraded.config);assert.deepEqual(upgraded.state,r.state);
 assert.ok(upgraded.config.segments.every(s=>s.showChance && !s.showStock && s.fontSize===null));
 assert.deepEqual(migrateConfig(upgraded.config),upgraded.config);
});

test("Design exposes global and per-prize typography with independent chance and stock checkboxes",async()=>{
 globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
 const {WheelManager}=await import('../scripts/ui/manager.js');const m=new WheelManager({});m.draft=defaultWheel();m.record=emptyRecord(m.draft);m.tab="design";
 const html=m.panel();assert.match(html,/Standard-Textausrichtung/);assert.match(html,/Oben nach unten/);assert.match(html,/segments\.0\.fontSize/);assert.match(html,/segments\.0\.showStock/);assert.match(html,/appearance\.dim/);
 assert.equal(WheelManager.DEFAULT_OPTIONS.window.title,"Axon Wheel");
});
