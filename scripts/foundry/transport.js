import {ID,escapeHTML,requireThat,uid} from "../core/model.js";
import {resultHTML} from "./actions.js";

/** Foundry document events carry a server-provided creator userId; payload sender IDs are never trusted. */
export class Transport {
  constructor() { this.pending = new Map(); this.onPacket = ()=>{}; this.engine = null; }
  gmIds() { return game.users.filter(u=>u.isGM).map(u=>u.id); }
  async create(packet,recipients,content) {
    return foundry.documents.ChatMessage.create({author:game.user.id,content,whisper:[...new Set(recipients)],
      flags:{[ID]:{packet:JSON.stringify(packet)}}});
  }
  find(eventId) {
    return game.messages.find(m=>{
      if (!m.author?.isGM || !game.users.get(m._stats?.lastModifiedBy)?.isGM) return false;
      try {return JSON.parse(m.getFlag(ID,"packet") ?? "null")?.eventId === eventId;} catch {return false;}
    });
  }
  async once(packet,recipients,content) {
    return this.find(packet.eventId) ?? this.create(packet,recipients,content);
  }
  async request(request) {
    requireThat(game.users.activeGM,"GM","Für Axon Wheel muss ein GM verbunden sein.");
    const nonce = uid();
    const promise = new Promise((resolve,reject)=>{
      const timer = setTimeout(()=>{
        this.pending.delete(nonce);
        reject(new Error("Die GM-Antwort steht aus. Vor einer weiteren Drehung den GM-Verlauf prüfen lassen."));
      },90000);
      this.pending.set(nonce,{resolve,reject,timer});
    });
    try {
      await this.create({type:"request",nonce,...request},this.gmIds(),
        `<div class="aw-chat"><small>✦ Axon Wheel · ${request.op === "spin" ? "Drehung angefragt" : "Rad öffnen"}</small></div>`);
    } catch(error) {
      const pending = this.pending.get(nonce);
      if (pending) {clearTimeout(pending.timer);this.pending.delete(nonce);pending.reject(error);}
    }
    return promise;
  }
  async handle(message,options,userId) {
    const raw = message.getFlag(ID,"packet");
    if (typeof raw !== "string" || raw.length > 200000) return;
    let packet;
    try {packet = JSON.parse(raw);} catch {return;}
    if (!packet || typeof packet !== "object") return;
    const sender = game.users.get(userId);
    if (!sender) return;
    if (packet.type === "request") {
      if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
      if (typeof packet.nonce !== "string" || packet.nonce.length > 64) return;
      const recipients = [...this.gmIds(),userId];
      try {
        const result = await this.engine.request({op:packet.op,wheelId:packet.wheelId,
          placementId:packet.placementId,tokenUuid:packet.tokenUuid},userId,message.id);
        await this.once({type:"reply",nonce:packet.nonce,eventId:`reply-${message.id}`,requestId:message.id,result},
          recipients,`<div class="aw-chat"><small>✦ ${result.op === "preview" ? "Rad bereit" : "Drehung verarbeitet"}</small></div>`);
      } catch(error) {
        console.error("Axon Wheel | Anfrage",error);
        await this.once({type:"reply",nonce:packet.nonce,eventId:`reply-${message.id}`,requestId:message.id,
          error:String(error.message ?? error).slice(0,1000)},recipients,
        `<div class="aw-chat aw-error">✦ ${escapeHTML(error.message ?? error)}</div>`);
      }
      return;
    }
    // Neither user-controlled flags nor the message's editable author field confer authority.
    if (!sender.isGM) return;
    if (packet.type === "reply") {
      const pending = this.pending.get(packet.nonce);
      if (pending) {
        clearTimeout(pending.timer); this.pending.delete(packet.nonce);
        if (packet.error) pending.reject(new Error(packet.error)); else pending.resolve(packet.result);
      }
    }
    await this.onPacket(packet,message);
  }
  async animation(spin) {
    const message = await this.once({type:"animation",eventId:`animation-${spin.id}`,spinId:spin.id,
      userId:spin.userId,tokenUuid:spin.tokenUuid,placementId:spin.placementId,
      view:spin.view,segmentId:spin.segment.id},[...this.gmIds(),spin.userId],
      `<div class="aw-chat">✦ ${escapeHTML(spin.view.name)} · Das Rad dreht sich …</div>`);
    await this.fx(spin,"start");
    return message.timestamp;
  }
  async result(spin) {
    await this.once({type:"result",eventId:`result-${spin.id}`,spinId:spin.id,userId:spin.userId,
      view:spin.resultView ?? spin.view,segmentId:spin.segment.id,label:spin.segment.label,delivery:spin.delivery},
    [...this.gmIds(),spin.userId],resultHTML(spin));
    await this.fx(spin,"result");
    await this.fx(spin,"finish");
  }
  async fx(spin,phase) {
    for (const action of spin.actions.filter(a=>a.phase === phase && !["macro","effect"].includes(a.type))) {
      if (!action.audience.length) continue; // Empty whisper arrays are public in Foundry.
      const value = action.value.replaceAll("{winner}",game.users.get(spin.userId)?.name ?? "Gewinner")
        .replaceAll("{prize}",spin.segment.label).replaceAll("{wheel}",spin.view.name);
      await this.once({type:"fx",eventId:`fx-${spin.id}-${action.key}`,phase,action:{type:action.type,
        value,color:action.color,duration:action.duration,volume:action.volume,tokenUuids:action.tokenUuids}},
      action.audience,`<div class="aw-chat">${action.type === "chat" ? escapeHTML(value) : `<small>✦ ${escapeHTML(spin.view.name)} · ${escapeHTML(action.type)}</small>`}</div>`);
    }
  }
  async notice(spin,text) {
    await this.once({type:"notice",eventId:`notice-${spin.id}-${spin.delivery}`,spinId:spin.id,
      userId:spin.userId,delivery:spin.delivery,text},[...this.gmIds(),spin.userId],
      `<div class="aw-chat">✦ ${escapeHTML(text)}</div>`);
  }
}
