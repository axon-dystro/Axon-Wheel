import {ID,SerialQueue,requireThat} from "./core/model.js";
import {WheelEngine} from "./core/engine.js";
import * as store from "./foundry/store.js";
import {authorize,contextForSpin} from "./foundry/context.js";
import {checkFunds,charge,grant,validateItem} from "./foundry/rewards.js";
import {prepareAction,executeAction} from "./foundry/actions.js";
import {hideTransportMessage} from "./foundry/chat.js";
import {Transport} from "./foundry/transport.js";
import {installInteraction} from "./foundry/interaction.js";
import {WheelManager} from "./ui/manager.js";
import {PlayerWheel} from "./ui/wheel.js";
import {availability} from "./core/availability.js";
import {showFX} from "./ui/fx.js";

const transport=new Transport();
const engine=new WheelEngine({...store,authorize,contextForSpin,checkFunds,charge,grant,validateItem,
  prepareAction,executeAction,worldTime:()=>game.time.worldTime,now:()=>Date.now(),
  random:()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;},
  waitUntil:async timestamp=>{
    const delay=Math.min(30000,Math.max(0,timestamp-Date.now()));
    if(delay) await new Promise(resolve=>setTimeout(resolve,delay));
  },
  animation:spin=>transport.animation(spin),result:spin=>transport.result(spin),notice:(spin,text)=>transport.notice(spin,text)});
transport.engine=engine;
let player=null,manager=null,opening=false;
const packets=new SerialQueue();
const seenFX=new Set();

async function openPlacement(placement,token) {
  if(opening || player?.busy) return;
  opening=true;
  try {
    requireThat(token,"TOKEN","Genau einen eigenen Token auswählen.");
    const result=await transport.request({op:"preview",wheelId:placement.wheelId,placementId:placement.placementId,tokenUuid:token.uuid});
    const state=availability(result.view);
    const question=state.allowed ? (placement.kind==="token" ? "Hey, ich habe hier ein Glücksrad. Möchtest du mal daran drehen?" : state.text) : state.text;
    const accepted=await foundry.applications.api.DialogV2.confirm({window:{title:"Axon Wheel"},content:`<p>${question}</p>`,yes:{label:state.allowed ? "Ja, Rad öffnen" : "Verstanden"},no:{label:"Schließen"}});
    if(!state.allowed || !accepted)return;
    if(player) await player.close();
    player=new PlayerWheel({view:result.view,placementId:placement.placementId,tokenUuid:token.uuid,transport});
    await player.render({force:true});
  } catch(error) {ui.notifications.warn(error.message ?? String(error));}
  finally {opening=false;}
}
installInteraction(openPlacement);
async function openManager() {
  if(!game.user.isGM) return;
  if(player?.rendered)await player.close();
  manager ??= new WheelManager(engine);await manager.render({force:true});
}
Hooks.on("getSceneControlButtons",controls=>{
  controls.arcaneWheels={name:"arcaneWheels",title:"Axon Wheel",icon:"fa-solid fa-dharmachakra",
    order:Math.max(0,...Object.values(controls).map(c=>c.order ?? 0))+1,visible:game.user.isGM,
    activeTool:"manage",
    onChange:(_event,active)=>{if(active)return (async()=>{
      try{await openManager();}
      catch(error){console.error("Axon Wheel | Öffnen",error);ui.notifications.error(error.message);}
      finally{if(ui.controls.control?.name==="arcaneWheels")await ui.controls.activate({control:"tokens",tool:"select"});}
    })();},
    tools:{manage:{name:"manage",title:"Räder verwalten",icon:"fa-solid fa-sliders",order:0,button:true,visible:game.user.isGM,onChange:()=>openManager()}}};
});
transport.onPacket=(packet,message)=>packets.run(async()=>{
  if(packet.type==="fx") {
    if(seenFX.has(packet.eventId) || Date.now()-message.timestamp>30000) return;
    seenFX.add(packet.eventId);
    if(seenFX.size>2000) seenFX.delete(seenFX.values().next().value);
    await showFX(packet.action);return;
  }
  if(packet.userId!==game.user.id) return;
  if(packet.type==="animation") {
    if(!player || !player.rendered || player.view.id!==packet.view.id) {
      if(player) await player.close();
      player=new PlayerWheel({view:packet.view,placementId:packet.placementId,tokenUuid:packet.tokenUuid,transport});
    }
    await player.play(packet,message.timestamp);
  } else if(packet.type==="result") {
    if(player?.view.id===packet.view.id && player.rendered) await player.result(packet);
  } else if(packet.type==="notice") {
    if(player?.rendered)player.setStatus(packet.text);
  }
});

Hooks.once("init",()=>{
  if(game.release.generation!==14) {ui.notifications.error("Axon Wheel benötigt Foundry V14.");return;}
  game.settings.register(ID,"registry",{scope:"world",config:false,type:Object,default:{ids:[]}});
  game.settings.register(ID,"reducedMotion",{name:"AW.ReducedMotion",hint:"AW.ReducedMotionHint",scope:"client",config:true,type:Boolean,default:false});
  game.settings.register(ID,"mute",{name:"AW.Mute",hint:"AW.MuteHint",scope:"client",config:true,type:Boolean,default:false});
  game.settings.registerMenu(ID,"manager",{name:"AW.Manager",label:"AW.OpenManager",hint:"AW.ManagerHint",icon:"fa-solid fa-dharmachakra",type:class extends WheelManager {constructor(){super(engine);}},restricted:true});
  game.keybindings.register(ID,"manager",{name:"AW.Manager",editable:[{key:"KeyW",modifiers:["Control","Shift"]}],restricted:true,onDown:()=>{openManager();return true;}});
  game.modules.get(ID).api=Object.freeze({openManager,
    openPlacement:async(placementId)=>{
      const {discoverPlacements,selectedToken}=await import("./foundry/context.js");
      const p=discoverPlacements().find(p=>p.placementId===placementId);
      requireThat(p,"PLACEMENT","Platzierung in dieser Szene nicht gefunden.");return openPlacement(p,selectedToken());
    }});
});
Hooks.on("renderChatMessageHTML",hideTransportMessage);
Hooks.on("createChatMessage",(message,options,userId)=>{void transport.handle(message,options,userId).catch(error=>console.error("Axon Wheel | Dokumentereignis",error));});
Hooks.once("ready",()=>{
  if(game.user.isGM && game.users.activeGM?.id===game.user.id) {
    const interrupted=store.wheelDocuments().some(doc=>{try{return store.readDocument(doc).state.spins.some(s=>!["complete","awaiting","failed"].includes(s.status));}catch{return false;}});
    if(interrupted) ui.notifications.warn("Axon Wheel: Unterbrochene Drehung gefunden. Im GM-Editor unter Betrieb prüfen.");
  }
});
