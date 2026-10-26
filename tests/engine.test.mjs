import test from "node:test";
import assert from "node:assert/strict";
import {fixture,send} from "./helpers.mjs";
import {defaultAction,clone} from "../scripts/core/model.js";

test("preview neither charges nor persists a stock reservation",async()=>{
  const f=fixture(),before=f.record();const result=await send(f,"preview");
  assert.equal(result.op,"preview");assert.deepEqual(f.record(),before);assert.equal(f.charges.size,0);
});
test("display-only wins finish without inventory changes",async()=>{
  const f=fixture();await send(f);assert.equal(f.items.size,0);
  assert.equal(f.record().state.spins[0].status,"complete");assert.equal(f.record().state.spins[0].delivery,"display");
});
test("automatic item is granted only after animation completes",async()=>{
  const f=fixture(w=>{w.segments[0].itemUuid="Item.i1";w.segments[0].delivery="automatic";});await send(f);
  assert.equal(f.items.size,1);assert.ok(f.events.indexOf("grant")>f.events.indexOf("wait"));
});
test("confirmation persists across restart; only a GM approval grants",async()=>{
  const f=fixture(w=>{w.segments[0].itemUuid="Item.i1";w.segments[0].delivery="confirm";});await send(f);
  assert.equal(f.items.size,0);assert.equal(f.record().state.spins[0].status,"awaiting");
  await f.engine.approve("wheel1","req1");assert.equal(f.items.size,1);assert.equal(f.record().state.spins[0].delivery,"granted");
  await assert.rejects(f.engine.approve("wheel1","req1"));assert.equal(f.items.size,1);
});
test("denial records the decision without restoring consumed stock or refunding",async()=>{
  const f=fixture(w=>{w.segments[0].itemUuid="Item.i1";w.segments[0].delivery="confirm";w.segments[0].stock=1;});
  await send(f);await f.engine.deny("wheel1","req1");assert.equal(f.items.size,0);
  assert.equal(f.record().state.spins[0].delivery,"denied");assert.equal(f.record().state.pools.shared.remaining.s1,0);
});
test("simultaneous requests cannot consume the last prize twice",async()=>{
  const f=fixture(w=>{w.segments[0].stock=1;w.segments[1].enabled=false;});
  const results=await Promise.allSettled([send(f,"spin","a"),send(f,"spin","b")]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(f.record().state.pools.shared.remaining.s1,0);assert.equal(f.charges.size,1);
});
test("duplicate document request never charges, reserves, or awards again",async()=>{
  const f=fixture(w=>{w.segments[0].stock=2;});await send(f);const before=f.record();
  assert.equal((await send(f)).duplicate,true);assert.deepEqual(f.record(),before);assert.equal(f.charges.size,1);
});
test("own stock and shared stock obey per-placement choice",async()=>{
  const f=fixture(w=>{w.segments[0].stock=1;w.segments[1].enabled=false;
    w.placements.push({...w.placements[0],id:"p2",pool:"own"});w.placements.push({...w.placements[0],id:"p3"});});
  await send(f);await send(f,"spin","b","p2");await assert.rejects(send(f,"spin","c","p3"),/ausgeschöpft/);
  assert.equal(f.record().state.spins.length,2);
});
for(const [failure,expected] of [["funds","Injected"],["authorize","Injected"],["itemValidate","Injected"]]) {
  test(`rejection at ${failure} happens before reservation or payment`,async()=>{
    const f=fixture(w=>{w.segments[0].delivery="automatic";w.segments[0].itemUuid="Item.i1";});
    f.fail(failure);await assert.rejects(send(f),new RegExp(expected));assert.equal(f.record().state.spins.length,0);assert.equal(f.charges.size,0);
  });
}
test("foreign token cannot be used to request rewards",async()=>{
  const f=fixture(),r=f.request();r.request.tokenUuid="Scene.other.Token.foreign";
  await assert.rejects(f.engine.request(r.request,r.userId,r.id),/owned/);assert.equal(f.charges.size,0);
});
for(const failure of ["chargeAfter","grantAfter","animationAfter","resultAfter"]) {
  test(`recover after ${failure} reuses durable operation identities`,async()=>{
    const f=fixture(w=>{w.segments[0].itemUuid="Item.i1";w.segments[0].delivery="automatic";w.segments[0].stock=2;});
    f.fail(failure);await assert.rejects(send(f));
    await assert.rejects(send(f,"spin","req2"),/unterbrochene/);
    await f.engine.resume("wheel1","req1");
    assert.equal(f.charges.size,1);assert.equal(f.items.size,1);assert.equal(f.animations.size,1);assert.equal(f.results.size,1);
    assert.equal(f.record().state.spins[0].status,"complete");assert.equal(f.record().state.pools.shared.remaining.s1,1);
  });
}
test("uncertain macro blocks replay until explicitly resolved",async()=>{
  const f=fixture(w=>{w.actions=[{...defaultAction("m1"),type:"macro",value:"Macro.m1"}];});
  f.fail("actionAfter");await assert.rejects(send(f));
  await assert.rejects(f.engine.resume("wheel1","req1"),/Makroausführung unklar/);
  assert.equal(f.events.filter(x=>x==="action:result").length,1);
  await f.engine.resolveMacro("wheel1","req1","wheel-m1");await f.engine.resume("wheel1","req1");
  assert.equal(f.events.filter(x=>x==="action:result").length,1);assert.equal(f.record().state.spins[0].status,"complete");
});
test("GM document actions honor start, result, finish lifecycle",async()=>{
  const f=fixture(w=>{w.actions=["start","result","finish"].map(phase=>({...defaultAction(phase),type:"effect",value:"Actor.a.ActiveEffect.e",phase}));});
  await send(f);assert.ok(f.events.indexOf("action:start")<f.events.indexOf("animation"));
  assert.ok(f.events.indexOf("action:result")>f.events.indexOf("wait"));assert.ok(f.events.indexOf("action:finish")>f.events.indexOf("result"));
});
test("real cooldown and per-account spin limits are enforced",async()=>{
  const f=fixture(w=>{w.rules.cooldown=5;w.rules.maxSpins=2;w.rules.identity="user";});
  await send(f);await assert.rejects(send(f,"spin","b"),/warte noch 4 Sekunden/);f.advance(5000);
  await send(f,"spin","c");f.advance(5000);await assert.rejects(send(f,"spin","d"),/Erlaubt sind 2 Drehung/);
});
test("world time resets stock and configured limits",async()=>{
  const f=fixture(w=>{w.segments[0].stock=1;w.segments[1].enabled=false;w.stockResetSeconds=60;w.rules.maxSpins=1;w.rules.limitResetSeconds=60;});
  await send(f);f.advance(60000);await send(f,"spin","b");assert.equal(f.record().state.spins.length,2);
});
test("manual stock reset does not silently reset limits",async()=>{
  const f=fixture(w=>{w.rules.maxSpins=1;});await send(f);await f.engine.reset("wheel1","stock");
  await assert.rejects(send(f,"spin","b"),/Erlaubt sind 1 Drehung/);await f.engine.reset("wheel1","limits");await send(f,"spin","c");
});
test("stale editor revision is rejected instead of losing intervening spins",async()=>{
  const f=fixture(),old=f.record();await send(f);old.config.name="Stale";
  await assert.rejects(f.engine.edit("wheel1",old.config,0),/inzwischen geändert/);assert.equal(f.record().state.spins.length,1);
});
test("changed finite capacity updates the live segment pool",async()=>{
  const f=fixture(w=>{w.segments[0].stock=3;});await send(f);const r=f.record();r.config.segments[0].stock=7;
  await f.engine.edit("wheel1",r.config,r.state.revision);assert.equal(f.record().state.pools.shared.remaining.s1,7);
});
test("authority failure prevents all mutations",async()=>{
  const f=fixture();f.fail("authority");await assert.rejects(send(f));assert.equal(f.record().state.spins.length,0);
});
test("manual failure resolution records review and never guesses a refund",async()=>{
  const f=fixture(w=>{w.segments[0].stock=2;});f.fail("chargeAfter");await assert.rejects(send(f));
  await assert.rejects(f.engine.closeFailure("wheel1","req1",""),/Prüfnotiz/);
  await f.engine.closeFailure("wheel1","req1","Zahlung geprüft, manuell ausgeglichen.");
  const s=f.record().state.spins[0];assert.equal(s.status,"failed");assert.match(s.resolution.reason,/geprüft/);
  assert.equal(f.record().state.pools.shared.remaining.s1,1);await assert.rejects(f.engine.resume("wheel1","req1"));
  await send(f,"spin","req2");
});
test("old queued requests expire before charging",async()=>{
  const f=fixture();f.ports.waitUntil=async()=>f.advance(60000);
  const results=await Promise.allSettled([send(f,"spin","req1"),send(f,"spin","req2")]);
  assert.equal(results[0].status,"fulfilled");assert.equal(results[1].status,"rejected");
  assert.match(results[1].reason.message,/Warteschlange/);assert.equal(f.charges.size,1);
});
test("a lost reservation acknowledgement is recoverable without repeating selection",async()=>{
  const f=fixture(w=>{w.segments[0].stock=1;});f.fail("saveAfter");await assert.rejects(send(f));
  assert.equal(f.charges.size,0);assert.equal(f.record().state.spins[0].status,"reserved");
  await f.engine.resume("wheel1","req1");assert.equal(f.charges.size,1);assert.equal(f.record().state.pools.shared.remaining.s1,0);
});

test("animation snapshots draw odds; result snapshot shows remaining stock and next draw odds",async()=>{
 const f=fixture(w=>{w.segments[0].stock=1;w.segments.forEach(s=>{s.showChance=true;s.showStock=true;});});
 await send(f);const spin=f.record().state.spins[0];
 assert.equal(spin.view.segments[0].remaining,1);assert.equal(spin.view.segments[0].chance,.5);
 assert.equal(spin.resultView.segments[0].remaining,0);assert.equal(spin.resultView.segments[0].chance,0);
 assert.equal(spin.resultView.segments[1].chance,1);assert.equal(spin.resultView.limit.count,1);
 assert.equal(f.record().state.pools.shared.remaining.s1,0);
});
