import {clone,defaultWheel,emptyRecord,requireThat} from "../scripts/core/model.js";
import {balanceChances} from "../scripts/core/presentation.js";
import {WheelEngine} from "../scripts/core/engine.js";
export function fixture(change = ()=>{}) {
  const config=defaultWheel("wheel1");
  config.duration=1000;config.placements=[{id:"p1",sceneId:"scene1",documentId:"tile1",name:"Test",kind:"tile",pool:"shared",enabled:true}];
  config.segments=config.segments.slice(0,2);config.segments[0].id="s1";config.segments[1].id="s2";
  change(config);balanceChances(config.segments);
  let persisted=emptyRecord(config),time=100000,world=1000;
  const charges=new Set(),items=new Set(),effects=new Set(),results=new Set(),animations=new Map(),events=[];
  const failures=new Map();
  const trip=(key)=>{if(failures.has(key)){const error=failures.get(key);failures.delete(key);throw new Error(error);}};
  const context={user:{id:"u1"},actorUuid:"Actor.a1",actor:{uuid:"Actor.a1"}};
  const ports={assertAuthority:()=>trip("authority"),load:async()=>clone(persisted),
    save:async r=>{trip("saveBefore");r.state.revision++;persisted=clone(r);trip("saveAfter");},
    authorize:async (w,p,u,token)=>{events.push("authorize");trip("authorize");requireThat(token==="Scene.scene1.Token.t1","OWNER","Not owned");return {...context,user:{id:u}};},
    contextForSpin:async()=>context,worldTime:()=>world,now:()=>time,random:()=>0,
    checkFunds:async()=>trip("funds"),validateItem:async()=>trip("itemValidate"),prepareAction:async a=>a,
    charge:async (c,cost,id)=>{trip("chargeBefore");charges.add(id);events.push("charge");trip("chargeAfter");},
    grant:async(c,uuid,id)=>{trip("grantBefore");items.add(id);events.push("grant");trip("grantAfter");},
    animation:async s=>{events.push("animation");if(!animations.has(s.id))animations.set(s.id,time);trip("animationAfter");return animations.get(s.id);},
    waitUntil:async at=>{time=Math.max(time,at);events.push("wait");},
    executeAction:async(a,c,s)=>{events.push(`action:${a.phase}`);effects.add(`${s.id}:${a.key}`);trip("actionAfter");},
    result:async s=>{results.add(s.id);events.push("result");trip("resultAfter");},notice:async()=>events.push("notice")};
  return {engine:new WheelEngine(ports),ports,record:()=>clone(persisted),charges,items,effects,results,animations,events,
    fail:(key,error="Injected failure")=>failures.set(key,error),advance:(ms,seconds=ms/1000)=>{time+=ms;world+=seconds;},
    request:(op="spin",id="req1",placementId="p1",userId="u1")=>({request:{op,wheelId:"wheel1",placementId,tokenUuid:"Scene.scene1.Token.t1"},id,userId})};
}
export function send(f,op="spin",id="req1",placementId="p1",userId="u1") {const r=f.request(op,id,placementId,userId);return f.engine.request(r.request,r.userId,r.id);}
