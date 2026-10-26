import {ID,requireThat,clone} from "../core/model.js";

export function numericBalance(actor,path) {
  const balance = foundry.utils.getProperty(actor,path);
  requireThat(typeof balance === "number" && Number.isFinite(balance),"CURRENCY",`Kostenfeld „${path}“ ist kein numerisches Actor-Feld. Der GM muss den Systemadapter konfigurieren.`);
  return balance;
}
export async function checkFunds(context,cost) {
  if (!cost.amount) return;
  requireThat(numericBalance(context.actor,cost.path) >= cost.amount,"FUNDS","Nicht genügend Währung.");
}
export async function charge(context,cost,spinId) {
  if (!cost.amount) return;
  const actor = context.actor;
  const marker = actor.getFlag(ID,"charges")?.[spinId];
  if (marker) {
    requireThat(marker.amount === cost.amount && marker.path === cost.path,"CHARGE","Zahlungsmarkierung stimmt nicht überein.");
    return;
  }
  await checkFunds(context,cost);
  const after = Number((numericBalance(actor,cost.path) - cost.amount).toFixed(8));
  // Payment and idempotency marker are a SINGLE Actor update, also for synthetic actors.
  await actor.update({[cost.path]:after,[`flags.${ID}.charges.${spinId}`]:{amount:cost.amount,path:cost.path}});
}
export async function validateItem(uuid) {
  const item = await fromUuid(uuid);
  requireThat(item?.documentName === "Item","ITEM","Gegenstands-UUID verweist nicht auf einen verfügbaren Item-Datensatz.");
  return item;
}
export async function grant(context,uuid,spinId) {
  const existing = context.actor.items.find(i=>i.getFlag(ID,"award")===spinId);
  if (existing) return existing;
  const item = await validateItem(uuid);
  const data = clone(item.toObject());
  delete data._id; delete data.folder; delete data.ownership; delete data._stats;
  data.flags ??= {}; data.flags[ID] = {...data.flags[ID],award:spinId};
  const [created] = await context.actor.createEmbeddedDocuments("Item",[data]);
  requireThat(created,"ITEM","Das Spielsystem hat die Gegenstandserstellung abgelehnt.");
  return created;
}
