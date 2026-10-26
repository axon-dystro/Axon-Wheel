import {ID,requireThat,distance,clone,escapeHTML} from "../core/model.js";
import {centerFor,gridFor,placementDocument} from "./context.js";

export function targetContext(action,context,placement) {
  const users = game.users.filter(u=>u.active);
  let audience = [context.user.id], tokens = context.token ? [context.token] : [];
  if (action.target === "players") {
    audience = users.filter(u=>action.userIds.includes(u.id)).map(u=>u.id);
    tokens = context.scene.tokens.filter(t=>!t.hidden && t.actor && users.some(u=>audience.includes(u.id) && !u.isGM && t.actor.testUserPermission(u,"OWNER")));
  } else if (action.target === "all") {
    audience = users.map(u=>u.id); tokens = context.scene.tokens.filter(t=>!t.hidden && t.actor);
  } else if (action.target === "gm") {
    audience = users.filter(u=>u.isGM).map(u=>u.id); tokens = [];
  } else if (action.target === "radius") {
    const origin = centerFor(placementDocument(placement));
    tokens = context.scene.tokens.filter(t=>!t.hidden && t.actor && distance(centerFor(t),origin,gridFor(context.scene)) <= action.radius);
    audience = users.filter(u=>u.isGM || tokens.some(t=>t.actor.testUserPermission(u,"OWNER"))).map(u=>u.id);
  }
  const actorUuids = [...new Set(tokens.map(t=>t.actor.uuid))];
  return {audience,tokenUuids:tokens.map(t=>t.uuid),actorUuids};
}
export async function prepareAction(action,context,placement) {
  if (action.type === "macro") {
    const macro = await fromUuid(action.value);
    requireThat(macro?.documentName === "Macro" && macro.canExecute,"MACRO","FX-Makro fehlt oder darf vom GM nicht ausgeführt werden.");
  }
  if (action.type === "effect") {
    const effect = await fromUuid(action.value);
    requireThat(effect?.documentName === "ActiveEffect","EFFECT","FX-UUID muss auf einen ActiveEffect verweisen.");
  }
  return {...clone(action),...targetContext(action,context,placement)};
}
export async function executeAction(action,context,spin) {
  if (action.type === "macro") {
    const macro = await fromUuid(action.value);
    requireThat(macro?.documentName === "Macro" && macro.canExecute,"MACRO","Makro nicht ausführbar.");
    await macro.execute({actor:context.actor,token:context.token?.object,arcaneWheels:{spin:clone(spin),
      actorUuids:action.actorUuids,tokenUuids:action.tokenUuids,userIds:action.audience}});
  } else if (action.type === "effect") {
    const effect = await fromUuid(action.value);
    requireThat(effect?.documentName === "ActiveEffect","EFFECT","Effekt nicht verfügbar.");
    const stamp = `${spin.id}:${action.key}`;
    for (const uuid of action.actorUuids) {
      const actor = await fromUuid(uuid);
      requireThat(actor?.documentName === "Actor","EFFECT","FX-Zielactor wurde entfernt.");
      if (actor.effects.some(e=>e.getFlag(ID,"action")===stamp)) continue;
      const data = clone(effect.toObject()); delete data._id; delete data._stats;
      data.flags ??= {}; data.flags[ID] = {...data.flags[ID],action:stamp};
      await actor.createEmbeddedDocuments("ActiveEffect",[data]);
    }
  }
}
export function readableDelivery(delivery) {
  return ({granted:"Gegenstand vergeben",pending:"Gegenstand wartet auf GM-Bestätigung",display:"Gewinn wird nur angezeigt",denied:"Vergabe abgelehnt"})[delivery] ?? delivery;
}
export function resultHTML(spin) {
  return `<div class="aw-chat"><strong>✦ ${escapeHTML(spin.view.name)}</strong><p>Gewinn: <b>${escapeHTML(spin.segment.label)}</b></p><small>${escapeHTML(readableDelivery(spin.delivery))}</small></div>`;
}
