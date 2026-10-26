import test from 'node:test';
import assert from 'node:assert/strict';
import {availability} from '../scripts/core/availability.js';
import {installInteraction} from '../scripts/foundry/interaction.js';
import {fixture} from './helpers.mjs';
test('availability reports exact ceiling seconds, identity and exhausted prizes',()=>{
 const view={segments:[{available:true}],limit:{count:0,max:1,readyAt:80001}};
 assert.match(availability(view,1).text,/80 Sekunden/);assert.equal(availability(view,80001).allowed,true);
 view.limit.count=1;view.limit.identity='user';assert.match(availability(view,90000).text,/Person/);
 view.limit.max=0;view.segments[0].available=false;assert.equal(availability(view,90000).allowed,false);
});
test('result and next preview carry authoritative cooldown after a completed spin',async()=>{
 const f=fixture(w=>{w.rules.cooldown=80;});
 await f.engine.request({op:'spin',wheelId:'wheel1',placementId:'p1',tokenUuid:'Scene.scene1.Token.t1'},'u1','spin1');
 const spin=f.record().state.spins[0];assert.equal(spin.resultView.limit.readyAt,spin.at+80000);
 assert.equal(availability(spin.resultView,spin.at+1000).allowed,false);
});
test('right click chooses the hit tile, ignores left click and drag, detaches listeners',()=>{
 const hooks=new Map(),listeners=new Map();let opened=[];
 globalThis.Hooks={on:(n,f)=>hooks.set(n,f),once:(n,f)=>hooks.set(n,f)};globalThis.game={user:{isGM:false}};
 const marker={wheelId:'w',placementId:'p',kind:'tile'};
 const tile={x:100,y:100,width:100,height:100,documentName:'Tile',getFlag:()=>marker,object:{visible:true}};
 const token={document:{uuid:'Token.own'},actor:{testUserPermission:()=>true}};
 const surface={getBoundingClientRect:()=>({left:0,top:0,width:1000,height:1000}),addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 globalThis.canvas={ready:true,scene:{tiles:[tile],tokens:[]},tokens:{controlled:[token]},stage:{toLocal:p=>p},app:{view:surface,screen:{width:1000,height:1000}}};
 installInteraction((p,t)=>opened.push([p.placementId,t.uuid]));hooks.get('canvasReady')();
 const event=(button,x=150)=>({button,clientX:x,clientY:150,preventDefault(){},stopImmediatePropagation(){}});
 listeners.get('pointerdown')(event(0));listeners.get('pointerup')(event(0));assert.equal(opened.length,0);
 listeners.get('pointerdown')(event(2));listeners.get('pointerup')(event(2));assert.deepEqual(opened,[['p','Token.own']]);
 listeners.get('pointerdown')(event(2));listeners.get('pointerup')(event(2,170));assert.equal(opened.length,1);
 listeners.get('contextmenu')(event(2));assert.equal(opened.length,1);
 marker.placementId='p2';listeners.get('contextmenu')(event(2));assert.equal(opened.length,2);assert.deepEqual(opened[1],['p2','Token.own']);
 hooks.get('canvasReady')();assert.equal(listeners.size,3);
 hooks.get('canvasTearDown')();assert.equal(listeners.size,0);
});
