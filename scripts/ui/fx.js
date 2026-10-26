import {ID} from "../core/model.js";
export async function showFX(action) {
  const reduced = game.settings.get(ID,"reducedMotion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(action.type === "sound") {
    if(game.settings.get(ID,"mute")) return;
    try {await foundry.audio.AudioHelper.play({src:action.value,volume:action.volume,loop:false,autoplay:true},false);}
    catch(error) {console.warn("Axon Wheel | Audiowiedergabe fehlgeschlagen",error);ui.notifications.warn("Axon Wheel: Audiodatei konnte nicht abgespielt werden.");}
    return;
  }
  if(action.type === "chat") return; // The authoritative whispered ChatMessage IS this action.
  if(reduced) return;
  const layer=document.createElement("div");layer.className="aw-fx";layer.setAttribute("aria-hidden","true");document.body.append(layer);
  if(action.type === "confetti") {
    for(let i=0;i<42;i++) {
      const particle=document.createElement("span");particle.textContent=["✦","✧","◆","☽"][i%4];
      particle.style.cssText=`left:${Math.random()*100}%;color:${action.color};font-size:${12+Math.random()*22}px;animation-duration:${action.duration}ms;animation-delay:${Math.random()*350}ms;`;
      layer.append(particle);
    }
    setTimeout(()=>layer.remove(),action.duration+500);
  } else if(action.type === "glow") {
    const tokens=[];
    for(const uuid of action.tokenUuids) {
      const token=await fromUuid(uuid);
      if(token?.parent?.id!==canvas.scene?.id || !token.object?.visible) continue;
      const halo=document.createElement("i");halo.className="aw-halo";halo.style.borderColor=action.color;halo.style.boxShadow=`0 0 22px ${action.color}`;
      layer.append(halo);tokens.push({token,halo});
    }
    const until=performance.now()+action.duration;
    const tick=()=>{
      if(!layer.isConnected || performance.now()>=until) {layer.remove();return;}
      for(const {token,halo} of tokens) {
        if(!token.object || !canvas.ready || token.parent.id!==canvas.scene?.id) {halo.hidden=true;continue;}
        const point=canvas.stage.toGlobal(token.object.center),rect=canvas.app.view.getBoundingClientRect();
        const width=token.object.w*canvas.stage.scale.x,height=token.object.h*canvas.stage.scale.y;
        halo.style.left=`${rect.left+point.x}px`;halo.style.top=`${rect.top+point.y}px`;
        halo.style.width=`${width+14}px`;halo.style.height=`${height+14}px`;
      }
      requestAnimationFrame(tick);
    };tick();
  } else layer.remove();
}
