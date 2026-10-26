import {ID,uid,requireThat} from "../core/model.js";
import {assertAuthority,load} from "./store.js";
import {placementDocument} from "./context.js";

export async function addPlacement(engine,wheelId,options) {
  return engine.queue.run(async()=>{
    assertAuthority();requireThat(canvas.scene,"SCENE","Zuerst eine Szene öffnen.");
    const record=await load(wheelId);
    const p={id:uid(),name:options.name || record.config.name,sceneId:canvas.scene.id,
      kind:options.kind,pool:options.pool,enabled:true,documentId:""};
    const marker={wheelId,placementId:p.id,kind:p.kind,name:p.name};
    let doc,created=false;
    if(p.kind === "token") {
      doc=canvas.scene.tokens.get(options.tokenId);
      requireThat(doc?.actor,"TOKEN","Wähle im Platzierungsdialog einen vorhandenen Token. Zuerst einen NPC erstellen und in die Szene ziehen, falls noch keiner vorhanden ist.");
      requireThat(!doc.getFlag(ID,"placement"),"PLACEMENT","Dieser Token ist bereits einem Rad zugeordnet.");
      await doc.setFlag(ID,"placement",marker);
    } else {
      const size=Number(options.size),elevation=Number(options.elevation);
      requireThat(Number.isFinite(size) && size>0 && size<=100000 && Number.isFinite(elevation),"CONFIG","Ungültige Größe oder Höhe.");
      const pixels=p.kind === "zone" ? size*2*canvas.scene.grid.size/canvas.scene.grid.distance : size*canvas.scene.grid.size;
      const {x,y}=canvas.stage.pivot;
      [doc]=await canvas.scene.createEmbeddedDocuments("Tile",[{x:x-pixels/2,y:y-pixels/2,width:pixels,height:pixels,
        elevation,rotation:0,hidden:false,locked:false,
        texture:{src:`modules/${ID}/assets/${p.kind === "zone" ? "zone" : "wheel"}.svg`},
        flags:{[ID]:{placement:marker}}}]);
      created=true;
    }
    p.documentId=doc.id;record.config.placements.push(p);
    try {await engine.p.save(record);}
    catch(error) {
      if(created) await doc.delete(); else await doc.unsetFlag(ID,"placement");
      throw error;
    }
    return p;
  });
}
export async function removePlacement(engine,wheelId,placementId) {
  return engine.queue.run(async()=>{
    assertAuthority();const r=await load(wheelId),p=r.config.placements.find(p=>p.id===placementId);
    requireThat(p,"PLACEMENT","Platzierung fehlt.");
    requireThat(!r.state.spins.some(s=>s.placementId===placementId && !["complete","failed"].includes(s.status)),"RECOVERY","Zuerst offene Vergaben dieser Platzierung klären.");
    const doc=placementDocument(p);
    if(doc?.getFlag(ID,"placement")?.placementId===p.id) {
      if(p.kind === "token") await doc.unsetFlag(ID,"placement");else await doc.delete();
    }
    r.config.placements=r.config.placements.filter(x=>x.id!==placementId);await engine.p.save(r);
  });
}
