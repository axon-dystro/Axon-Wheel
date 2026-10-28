import {discoverPlacements,selectedToken,centerFor} from "./context.js";

function insideDocument(point,doc,kind) {
  const c=centerFor(doc),dx=point.x-c.x,dy=point.y-c.y;
  if(kind === "zone") return Math.hypot(dx,dy)<=Math.min(doc.width,doc.height)/2;
  const rotation=-(doc.rotation ?? 0)*Math.PI/180;
  const x=dx*Math.cos(rotation)-dy*Math.sin(rotation),y=dx*Math.sin(rotation)+dy*Math.cos(rotation);
  const width=doc.documentName === "Token" ? doc.width*doc.parent.grid.size : doc.width;
  const height=doc.documentName === "Token" ? doc.height*doc.parent.grid.size : doc.height;
  return Math.abs(x)<=width/2 && Math.abs(y)<=height/2;
}
export function installInteraction(open) {
  let surface=null,down=null,lastOpen=null;
  const launch=(hit)=>{if(lastOpen?.id===hit.placementId && Date.now()-lastOpen.at<600)return;lastOpen={id:hit.placementId,at:Date.now()};void open(hit,selectedToken());};
  const hitAt=event=>{
    if(!canvas.ready || !canvas.stage || !surface)return null;
    const rect=surface.getBoundingClientRect();
    const point=canvas.stage.toLocal({x:(event.clientX-rect.left)*canvas.app.screen.width/rect.width,
      y:(event.clientY-rect.top)*canvas.app.screen.height/rect.height});
    return discoverPlacements().filter(p=>!p.document.hidden && p.document.object?.visible!==false && insideDocument(point,p.document,p.kind))
      .sort((a,b)=>(a.kind==="token" ? -1 : 0)-(b.kind==="token" ? -1 : 0)||(b.document.sort??0)-(a.document.sort??0))[0];
  };
  const onDown=event=>{
    if(event.button!==2)return;
    const hit=hitAt(event);if(!hit)return;
    down={hit,x:event.clientX,y:event.clientY};event.stopImmediatePropagation();event.preventDefault();
  };
  const onUp=event=>{
    if(event.button!==2 || !down)return;
    const previous=down;down=null;event.stopImmediatePropagation();event.preventDefault();
    const hit=hitAt(event);
    if(hit?.placementId===previous.hit.placementId && Math.hypot(event.clientX-previous.x,event.clientY-previous.y)<8)
      launch(hit);
  };
  const onContext=event=>{
    const hit=hitAt(event);if(!hit)return;
    event.preventDefault();event.stopImmediatePropagation();
    // Browsers can emit contextmenu before pointerup, or without pointerup at all.
    if(!down || Math.hypot(event.clientX-down.x,event.clientY-down.y)<8)launch(hit);
    down=null;
  };
  function detach(){if(surface){surface.removeEventListener("pointerdown",onDown,true);surface.removeEventListener("pointerup",onUp,true);surface.removeEventListener("contextmenu",onContext,true);}surface=null;down=null;}
  Hooks.on("canvasTearDown",detach);
  function attach(){
    detach();
    // Foundry's PIXI Application exposes the renderer surface as view; newer PIXI uses canvas.
    surface=canvas.app?.view ?? canvas.app?.canvas ?? globalThis.document?.getElementById("board");
    if(!surface?.addEventListener){console.error("Axon´s Glücksrad | Zeichenfläche für Rechtsklick nicht gefunden.");return;}
    surface.addEventListener("pointerdown",onDown,true);surface.addEventListener("pointerup",onUp,true);surface.addEventListener("contextmenu",onContext,true);
  }
  Hooks.on("canvasReady",attach);
  Hooks.once("ready",()=>{if(canvas.ready)attach();});
}
