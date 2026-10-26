import test from "node:test";
import assert from "node:assert/strict";
import {ID,defaultWheel,defaultAction,clone,emptyRecord,SerialQueue} from "../scripts/core/model.js";
import {addPlacement} from "../scripts/foundry/placements.js";
import {charge,grant,checkFunds} from "../scripts/foundry/rewards.js";
import {authorize} from "../scripts/foundry/context.js";
import {targetContext,executeAction} from "../scripts/foundry/actions.js";
import {Transport} from "../scripts/foundry/transport.js";
import {wheelDocuments} from "../scripts/foundry/store.js";

const prop=(object,path)=>path.split(".").reduce((v,k)=>v?.[k],object);
function setProp(object,path,value) {const keys=path.split(".");let o=object;for(const key of keys.slice(0,-1)) o=o[key]??=( {} );o[keys.at(-1)]=value;}
function actor() {
  const a={documentName:"Actor",uuid:"Actor.a",system:{currency:{gp:10}},flags:{},items:[],effects:[],writes:0,creates:0,
    testUserPermission:u=>u.id==="u1",getFlag(scope,key){return this.flags[scope]?.[key];},
    async update(data){for(const [path,value] of Object.entries(data))setProp(this,path,value);this.writes++;if(this.failAfterWrite){this.failAfterWrite=false;throw new Error("Lost acknowledgement");}},
    async createEmbeddedDocuments(kind,data){this.creates++;const collection=kind==="Item"?this.items:this.effects;
      const created=data.map(d=>({...clone(d),getFlag(scope,key){return this.flags[scope]?.[key];}}));collection.push(...created);
      if(this.failAfterCreate){this.failAfterCreate=false;throw new Error("Lost acknowledgement");}return created;}};
  return a;
}
function setup() {
  const a=actor(),scene={id:"scene1",grid:{size:100,distance:5}};
  const user={id:"u1",active:true,isGM:false,viewedScene:"scene1"},gm={id:"g1",active:true,isGM:true};
  const users=[user,gm];users.get=id=>users.find(u=>u.id===id);users.activeGM=gm;
  const token={documentName:"Token",id:"t1",uuid:"Scene.scene1.Token.t1",actor:a,parent:scene,x:0,y:0,width:1,height:1,elevation:0,hidden:false};
  const marker={wheelId:"wheel1",placementId:"p1"};
  const tile={documentName:"Tile",id:"tile1",parent:scene,x:100,y:0,width:100,height:100,elevation:0,hidden:false,getFlag:()=>marker};
  scene.tokens=[token];scene.tokens.get=id=>scene.tokens.find(t=>t.id===id);scene.tiles=[tile];scene.tiles.get=id=>scene.tiles.find(t=>t.id===id);
  const docs=new Map([[token.uuid,token],[a.uuid,a],["Item.i1",{documentName:"Item",toObject:()=>({_id:"i1",name:"Potion",system:{quantity:3},flags:{},effects:[]})}]]);
  globalThis.fromUuid=async uuid=>docs.get(uuid);
  globalThis.game={user:gm,users,scenes:{get:id=>id===scene.id?scene:null},messages:[],settings:{get:()=>({ids:[]})},journal:{get:()=>null}};
  globalThis.foundry={utils:{getProperty:prop},documents:{ChatMessage:{create:async data=>data}}};
  return {a,scene,user,gm,token,tile,marker,docs,context:{actor:a,actorUuid:a.uuid,user,token,scene},placement:{id:"p1",sceneId:scene.id,kind:"tile",documentId:"tile1"}};
}
test("real charge adapter does not charge twice after lost actor acknowledgement",async()=>{
  const {a,context}=setup(),cost={amount:3,path:"system.currency.gp"};a.failAfterWrite=true;
  await assert.rejects(charge(context,cost,"spin1"));await charge(context,cost,"spin1");
  assert.equal(a.system.currency.gp,7);assert.equal(a.writes,1);assert.equal(a.getFlag(ID,"charges").spin1.amount,3);
});
test("charge adapter rejects nonnumeric fields and insufficient funds",async()=>{
  const {a,context}=setup();await assert.rejects(checkFunds(context,{amount:11,path:"system.currency.gp"}),/genügend/);
  a.system.currency.gp="10";await assert.rejects(checkFunds(context,{amount:1,path:"system.currency.gp"}),/numerisches/);assert.equal(a.writes,0);
});
test("real grant adapter recognizes item created before a lost acknowledgement",async()=>{
  const {a,context}=setup();a.failAfterCreate=true;await assert.rejects(grant(context,"Item.i1","spin1"));
  await grant(context,"Item.i1","spin1");assert.equal(a.items.length,1);assert.equal(a.creates,1);
  assert.equal(a.items[0].system.quantity,3);assert.equal(a.items[0]._id,undefined);
});
test("grant refuses non-Item UUID without modifying actor",async()=>{
  const {a,context}=setup();await assert.rejects(grant(context,"Actor.a","spin1"),/Item/);assert.equal(a.creates,0);
});
test("authorization uses real token ownership, scene, hidden status and horizontal footprint range",async()=>{
  const s=setup(),w=defaultWheel("wheel1");assert.equal((await authorize(w,s.placement,"u1",s.token.uuid)).actorUuid,"Actor.a");
  s.token.elevation=100;assert.ok(await authorize(w,s.placement,"u1",s.token.uuid));s.token.elevation=0;
  s.token.x=500;await assert.rejects(authorize(w,s.placement,"u1",s.token.uuid),/weit/);s.token.x=0;
  s.token.hidden=true;await assert.rejects(authorize(w,s.placement,"u1",s.token.uuid),/Besitzer/);s.token.hidden=false;
  s.a.testUserPermission=()=>false;await assert.rejects(authorize(w,s.placement,"u1",s.token.uuid),/Besitzer/);
});
test("authorization rejects disabled provenance and user allowlist bypass",async()=>{
  const s=setup(),w=defaultWheel("wheel1");s.marker.wheelId="different";await assert.rejects(authorize(w,s.placement,"u1",s.token.uuid),/verbunden/);
  s.marker.wheelId="wheel1";w.rules.userIds=["other"];await assert.rejects(authorize(w,s.placement,"u1",s.token.uuid),/Zugriff/);
});
test("radius FX include all matching tokens but deduplicate actor mutations",async()=>{
  const s=setup();s.scene.tokens.push({...s.token,id:"t2",uuid:"Scene.scene1.Token.t2",x:150});
  const action={...defaultAction(),target:"radius",radius:10};const targets=targetContext(action,s.context,s.placement);
  assert.equal(targets.tokenUuids.length,2);assert.equal(targets.actorUuids.length,1);assert.deepEqual(targets.audience,["u1","g1"]);
});
test("ActiveEffect adapter remains idempotent after lost acknowledgement",async()=>{
  const s=setup();s.docs.set("Effect.e",{documentName:"ActiveEffect",toObject:()=>({_id:"e",name:"Glow",flags:{},changes:[]})});
  const action={...defaultAction(),type:"effect",value:"Effect.e",actorUuids:["Actor.a"],key:"effect1"};
  s.a.failAfterCreate=true;await assert.rejects(executeAction(action,s.context,{id:"spin1"}));await executeAction(action,s.context,{id:"spin1"});
  assert.equal(s.a.effects.length,1);assert.equal(s.a.creates,1);
});
test("transport uses hook userId and ignores forged payload sender",async()=>{
  setup();const transport=new Transport();let seen;
  transport.engine={request:async(req,userId,id)=>{seen={req,userId,id};return {op:"preview"};}};
  transport.once=async()=>{};
  const packet={type:"request",nonce:"abc",op:"preview",wheelId:"wheel1",placementId:"p1",tokenUuid:"x",userId:"g1"};
  await transport.handle({id:"msg1",getFlag:()=>JSON.stringify(packet)}, {},"u1");
  assert.equal(seen.userId,"u1");assert.equal(seen.req.userId,undefined);
});
test("transport rejects player-authored forged result/FX even if author metadata says GM",async()=>{
  setup();const t=new Transport();let called=0;t.onPacket=async()=>called++;
  await t.handle({author:{isGM:true},getFlag:()=>JSON.stringify({type:"fx",action:{type:"macro"}})}, {},"u1");assert.equal(called,0);
  await t.handle({getFlag:()=>JSON.stringify({type:"notice"})}, {},"g1");assert.equal(called,1);
});
test("empty FX audience does not accidentally become a public whisper",async()=>{
  setup();const t=new Transport();let called=0;t.once=async()=>called++;
  await t.fx({id:"s",actions:[{type:"chat",phase:"result",audience:[],key:"a",value:"secret"}]},"result");assert.equal(called,0);
});
test("unregistered player-created journal flags cannot register a wheel",()=>{
  setup();const forged={id:"bad",getFlag:()=>"wheel"};game.journal={get:()=>forged};
  assert.deepEqual(wheelDocuments(),[]);
});
test("persisted event lookup uses V14 author and lastModifiedBy metadata",()=>{
  setup();const t=new Transport();
  const forged={author:{isGM:true},_stats:{lastModifiedBy:"u1"},getFlag:()=>JSON.stringify({eventId:"e"})};
  const real={author:{isGM:true},_stats:{lastModifiedBy:"g1"},getFlag:()=>JSON.stringify({eventId:"e"})};
  game.messages=[forged,real];assert.equal(t.find("e"),real);assert.equal(t.find("missing"),undefined);
});
test("NPC placement links the explicitly selected existing token without creating another actor",async()=>{
  const s=setup(),record=emptyRecord(defaultWheel("wheel1"));let saved,marker;
  const journal={getFlag:(scope,key)=>({kind:"wheel",wheelId:"wheel1",record:JSON.stringify(record)})[key]};
  game.settings.get=()=>({ids:["j1"]});game.journal.get=()=>journal;
  s.token.getFlag=()=>undefined;s.token.setFlag=async(scope,key,value)=>{marker=value;};
  globalThis.canvas={scene:s.scene,tokens:{controlled:[]}};
  const engine={queue:new SerialQueue(),p:{save:async r=>{saved=r;}}};
  const p=await addPlacement(engine,"wheel1",{kind:"token",tokenId:s.token.id,pool:"own",name:"Geisterhändler"});
  assert.equal(p.documentId,s.token.id);assert.equal(p.kind,"token");assert.equal(saved.config.placements.length,1);assert.equal(marker.placementId,p.id);
  assert.equal(s.scene.tokens.length,1);assert.equal(s.a.creates,0);
  await assert.rejects(addPlacement(engine,"wheel1",{kind:"token",tokenId:"missing",pool:"own",name:"Fehlt"}),/vorhandenen Token/);
});

test("routine transport cards are invisible, explicit chat effects and normal chat remain visible",async()=>{
 const {hideTransportMessage}=await import('../scripts/foundry/chat.js');
 for(const type of ["request","reply","animation","result","notice","fx"]){
  const html={hidden:false,setAttribute(){},classList:{add(){}}};hideTransportMessage({getFlag:()=>JSON.stringify({type,action:{type:"confetti"}})},html);assert.equal(html.hidden,true);
 }
 for(const packet of [null,{type:"fx",action:{type:"chat"}},{type:"other"}]){
  const html={hidden:false};hideTransportMessage({getFlag:()=>packet?JSON.stringify(packet):undefined},html);assert.equal(html.hidden,false);
 }
});

test("result transport uses the post-reservation view while legacy spins keep their old snapshot",async()=>{
 setup();const t=new Transport(),packets=[];t.once=async p=>{packets.push(p);};
 const spin={id:"spin",userId:"u1",segment:{id:"s",label:"Gold"},view:{name:"Old",id:"w",segments:[]},resultView:{name:"New",id:"w",segments:[{id:"s",remaining:4}]},delivery:"display",actions:[]};
 await t.result(spin);assert.deepEqual(packets[0].view,spin.resultView);
 delete spin.resultView;await t.result(spin);assert.equal(packets[1].view.name,"Old");
});
