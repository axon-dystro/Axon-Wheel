import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWheel,validateWheel} from '../scripts/core/model.js';
globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
const {WheelManager}=await import('../scripts/ui/manager.js');
function input(path,type,value){return {dataset:{path,...(type==='number'?{nullable:'true'}:{})},type,value:type==='checkbox'?'':String(value??''),checked:!!value,events:[],addEventListener(event,cb){if(event==='input')this.events.push(cb);},fire(){for(const cb of this.events)cb();}};}
test('real editor input handlers apply bulk settings and preserve individual exceptions and font inheritance',async()=>{
 const m=new WheelManager({});m.draft=defaultWheel();const status={textContent:''};
 const all=[input('showOdds','checkbox',false),input('showStock','checkbox',false),input('segments.0.fontSize','number',null)];
 for(let i=0;i<6;i++){all.push(input(`segments.${i}.showChance`,'checkbox',false));all.push(input(`segments.${i}.showStock`,'checkbox',false));}
 m.element={querySelectorAll(selector){
   if(selector==='[data-path],.aw-json'||selector==='[data-path], [data-currency]'||selector==='[data-path]')return all;
   const suffix=selector.match(/^\[data-path\$="(.*)"\]$/);return suffix?all.filter(el=>el.dataset.path.endsWith(suffix[1])):[];
 },querySelector(selector){if(selector==='.aw-draft-status')return status;const path=selector.match(/^\[data-path="(.*)"\]$/);return path?all.find(el=>el.dataset.path===path[1])??null:null;}};
 m._afterThemeRender=async()=>{};await m.bind();
 const byPath=path=>all.find(el=>el.dataset.path===path);
 const globalChance=byPath('showOdds');globalChance.checked=true;globalChance.fire();
 assert.ok(m.draft.segments.every(s=>s.showChance));assert.ok(all.filter(el=>el.dataset.path.endsWith('.showChance')).every(el=>el.checked));
 const exception=byPath('segments.0.showChance');exception.checked=false;exception.fire();
 assert.equal(m.draft.segments[0].showChance,false);assert.ok(m.draft.segments.slice(1).every(s=>s.showChance));assert.equal(globalChance.checked,false);
 const stock=byPath('segments.0.showStock');stock.checked=true;stock.fire();assert.equal(m.draft.segments[0].showStock,true);assert.equal(m.draft.segments[1].showStock,false);
 const font=byPath('segments.0.fontSize');font.value='64';font.fire();assert.equal(m.draft.segments[0].fontSize,64);
 font.value='';font.fire();assert.equal(m.draft.segments[0].fontSize,null);
 m.readForm();validateWheel(m.draft);assert.equal(m.draft.segments[0].showChance,false);assert.equal(m.draft.segments[0].showStock,true);
 clearTimeout(m.previewTimer);
});
