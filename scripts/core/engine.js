import {clone, requireThat, validateWheel, publicWheel, getPool, eligibleSegments, chooseSegment,
  getLimit, checkLimit, SerialQueue} from "./model.js";

/** All mutations use this one queue, including administration. Ports isolate Foundry APIs. */
export class WheelEngine {
  constructor(ports) { this.p = ports; this.queue = new SerialQueue(); }
  request(request, authenticatedUserId, requestId) {
    const enqueuedAt=this.p.now();
    return this.queue.run(async () => {
      this.p.assertAuthority();
      requireThat(this.p.now()-enqueuedAt<=45000,"QUEUE","Anfrage war zu lange in der Warteschlange. Es wurde keine Drehung reserviert.");
      requireThat(request && ["preview","spin"].includes(request.op),"REQUEST","Ungültige Anfrage.");
      requireThat(typeof requestId === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(requestId),"REQUEST","Ungültige Anfrage-ID.");
      const record = await this.p.load(request.wheelId);
      validateWheel(record.config);
      const wheel = record.config;
      const placement = wheel.placements.find(p=>p.id===request.placementId);
      requireThat(placement && placement.enabled && wheel.enabled,"DISABLED","Dieses Rad ist nicht verfügbar.");
      const context = await this.p.authorize(wheel,placement,authenticatedUserId,request.tokenUuid);
      const old = record.state.spins.find(s=>s.id===requestId);
      if (old) return {duplicate:true,spinId:old.id};
      const pool = getPool(record.state,wheel,placement,this.p.worldTime());
      const limit = getLimit(record.state,wheel,placement,authenticatedUserId,context.actorUuid,this.p.worldTime());
      const view = publicWheel(wheel,pool);
      view.limit = {identity:wheel.rules.identity,count:limit.count,max:wheel.rules.maxSpins,cooldown:wheel.rules.cooldown,
        readyAt:limit.lastAt === null ? 0 : limit.lastAt + wheel.rules.cooldown*1000};
      if (request.op === "preview") return {op:"preview",view,placementId:placement.id,tokenUuid:request.tokenUuid};
      requireThat(!record.state.spins.some(s=>!["complete","awaiting","failed"].includes(s.status)),"RECOVERY","Eine unterbrochene Drehung muss zuerst im GM-Betrieb geprüft werden.");
      requireThat(record.state.spins.length < 2000,"HISTORY","Protokoll voll: exportieren und eine neue Radkopie verwenden.");
      checkLimit(wheel,limit,this.p.now());
      await this.p.checkFunds(context,wheel.rules.cost);
      const selected = chooseSegment(eligibleSegments(wheel,pool),this.p.random());
      if (selected.itemUuid && selected.delivery !== "display") await this.p.validateItem(selected.itemUuid);
      const actions = [...wheel.actions.map(a=>({...clone(a),key:`wheel-${a.id}`})),
        ...selected.actions.map(a=>({...clone(a),key:`segment-${a.id}`}))];
      // Resolve audience/actors and validate GM effects before any inventory or currency change.
      const preparedActions = [];
      for (const action of actions) preparedActions.push(await this.p.prepareAction(action,context,placement));
      const spin = {id:requestId,userId:authenticatedUserId,actorUuid:context.actorUuid,tokenUuid:request.tokenUuid,
        placementId:placement.id,at:this.p.now(),worldTime:this.p.worldTime(),status:"reserved",
        cost:clone(wheel.rules.cost),segment:clone(selected),view,actions:preparedActions,actionStates:{},
        charged:false,delivery:"none",animationAt:null,resultSent:false,error:""};
      if (selected.stock !== null) pool.remaining[selected.id] -= 1;
      limit.count += 1; limit.lastAt = spin.at;
      spin.view.limit.count=limit.count;spin.view.limit.readyAt=spin.at+wheel.rules.cooldown*1000;
      // The animation uses the draw probabilities. After the draw, expose the next stock/chance state.
      spin.resultView=publicWheel(wheel,pool);spin.resultView.limit=clone(spin.view.limit);
      record.state.spins.push(spin);
      await this.p.save(record); // Durable reservation BEFORE payment, item or FX operations.
      await this.#complete(record,spin,context);
      return {op:"spin",spinId:spin.id};
    });
  }
  async #complete(record,spin,context) {
    try {
      this.p.assertAuthority();
      if (!spin.charged) {
        await this.p.charge(context,spin.cost,spin.id);
        spin.charged = true; spin.status = "awarding"; await this.p.save(record);
      }
      await this.#runActions(record,spin,context,"start");
      if (spin.animationAt === null) {
        spin.animationAt = await this.p.animation(spin);
        spin.status = "animating"; await this.p.save(record);
      }
      await this.p.waitUntil(spin.animationAt + spin.view.duration);
      this.p.assertAuthority();
      if (spin.segment.delivery === "automatic" && spin.delivery !== "granted") {
        await this.p.grant(context,spin.segment.itemUuid,spin.id);
        spin.delivery = "granted"; await this.p.save(record);
      } else if (spin.segment.delivery === "confirm" && spin.delivery === "none") {
        spin.delivery = "pending"; await this.p.save(record);
      } else if (spin.segment.delivery === "display") spin.delivery = "display";
      spin.status = "effects";
      await this.#runActions(record,spin,context,"result");
      if (!spin.resultSent) {
        await this.p.result(spin);
        spin.resultSent = true;
      }
      await this.#runActions(record,spin,context,"finish");
      spin.status = spin.delivery === "pending" ? "awaiting" : "complete";
      spin.error = ""; await this.p.save(record);
    } catch (error) {
      spin.error = String(error.message ?? error).slice(0,1000);
      // Keep the transaction blocked. Never guess whether a timed-out document write succeeded.
      await this.p.save(record);
      throw error;
    }
  }
  async #runActions(record,spin,context,phase) {
    for (const action of spin.actions.filter(a=>a.phase === phase && ["macro","effect"].includes(a.type))) {
      this.p.assertAuthority();
      const status = spin.actionStates[action.key];
      if (status === "done" || status === "skipped") continue;
      requireThat(status !== "running" || action.type === "effect","FX_UNCERTAIN","Makroausführung unklar: im GM-Betrieb prüfen und als erledigt markieren.");
      spin.actionStates[action.key] = "running"; await this.p.save(record);
      await this.p.executeAction(action,context,spin);
      spin.actionStates[action.key] = "done"; await this.p.save(record);
    }
  }
  resume(wheelId,spinId) {
    return this.queue.run(async()=>{
      this.p.assertAuthority(); const r = await this.p.load(wheelId);
      const spin = r.state.spins.find(s=>s.id===spinId);
      requireThat(spin && !["complete","failed"].includes(spin.status),"SPIN","Keine offene Drehung.");
      const context = await this.p.contextForSpin(spin);
      await this.#complete(r,spin,context);
    });
  }
  approve(wheelId,spinId) {
    return this.queue.run(async()=>{
      this.p.assertAuthority(); const r = await this.p.load(wheelId);
      const spin = r.state.spins.find(s=>s.id===spinId);
      requireThat(spin?.status === "awaiting" && spin.delivery === "pending","SPIN","Keine ausstehende GM-Vergabe.");
      const context = await this.p.contextForSpin(spin);
      await this.p.grant(context,spin.segment.itemUuid,spin.id);
      spin.delivery = "granted"; spin.status = "complete"; await this.p.save(r);
      await this.p.notice(spin,"Der Gegenstand wurde vom GM vergeben.");
    });
  }
  deny(wheelId,spinId) {
    return this.queue.run(async()=>{
      this.p.assertAuthority(); const r = await this.p.load(wheelId);
      const s = r.state.spins.find(s=>s.id===spinId);
      requireThat(s?.status === "awaiting" && s.delivery === "pending","SPIN","Keine ausstehende GM-Vergabe.");
      s.delivery = "denied"; s.status = "complete"; await this.p.save(r);
      await this.p.notice(s,"Der GM hat die Gegenstandsvergabe abgelehnt.");
    });
  }
  resolveMacro(wheelId,spinId,actionKey) {
    return this.queue.run(async()=>{
      this.p.assertAuthority(); const r = await this.p.load(wheelId);
      const s = r.state.spins.find(s=>s.id===spinId);
      requireThat(s?.actionStates[actionKey] === "running" && s.actions.some(a=>a.key===actionKey && a.type==="macro"),"SPIN","Kein unklarer Makrostatus.");
      s.actionStates[actionKey] = "skipped"; await this.p.save(r);
    });
  }
  closeFailure(wheelId,spinId,reason) {
    return this.queue.run(async()=>{
      this.p.assertAuthority();
      requireThat(typeof reason === "string" && reason.trim().length >= 5 && reason.length <= 1000,"REASON","Eine konkrete Prüfnotiz ist erforderlich.");
      const r=await this.p.load(wheelId),s=r.state.spins.find(s=>s.id===spinId);
      requireThat(s && !["complete","awaiting","failed"].includes(s.status),"SPIN","Keine unterbrochene Drehung.");
      s.status="failed";s.resolution={at:this.p.now(),reason:reason.trim()};
      await this.p.save(r);
      await this.p.notice(s,"Der GM hat die unterbrochene Drehung nach Prüfung abgeschlossen. Details stehen im GM-Protokoll.");
    });
  }
  edit(wheelId,config,expectedRevision) {
    return this.queue.run(async()=>{
      this.p.assertAuthority(); validateWheel(config); const r = await this.p.load(wheelId);
      requireThat(r.config.id === config.id,"CONFIG","Rad-ID darf nicht geändert werden.");
      requireThat(r.state.revision === expectedRevision,"CONFLICT","Das Rad wurde inzwischen geändert. Neu laden und Änderungen erneut anwenden.");
      requireThat(!r.state.spins.some(s=>!["complete","awaiting","failed"].includes(s.status)),"RECOVERY","Zuerst die offene Drehung klären.");
      // Finite/unlimited transitions and changed capacities start a fresh balance for that segment.
      for (const s of config.segments) {
        const previous = r.config.segments.find(x=>x.id===s.id);
        if (previous?.stock !== s.stock) for (const pool of Object.values(r.state.pools)) pool.remaining[s.id] = s.stock;
      }
      r.config = clone(config); await this.p.save(r); return r;
    });
  }
  reset(wheelId,kind,placementId = null) {
    return this.queue.run(async()=>{
      this.p.assertAuthority(); const r = await this.p.load(wheelId);
      requireThat(!r.state.spins.some(s=>!["complete","awaiting","failed"].includes(s.status)),"RECOVERY","Reset erst nach Klärung offener Drehungen.");
      requireThat(["stock","limits"].includes(kind),"REQUEST","Ungültiger Reset.");
      if (kind === "stock") {
        if (placementId) {
          const p = r.config.placements.find(x=>x.id===placementId);
          requireThat(p,"CONFIG","Platzierung nicht gefunden.");
          delete r.state.pools[p.pool === "shared" ? "shared" : p.id];
        } else r.state.pools = {};
      } else r.state.limits = {};
      await this.p.save(r);
    });
  }
}
