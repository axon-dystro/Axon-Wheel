import {ID,requireThat,distance} from "../core/model.js";
import {rectangle,polygonDistance} from "../core/geometry.js";

export function gridFor(scene) {
  return {size:scene.grid.size,distance:scene.grid.distance};
}
export function centerFor(doc) {
  if(doc.documentName === "Token" && typeof doc.getCenterPoint === "function") return doc.getCenterPoint();
  if (doc.documentName === "Token") return {
    x:doc.x + doc.width * doc.parent.grid.size/2,y:doc.y + doc.height * doc.parent.grid.size/2,
    elevation:doc.elevation ?? 0};
  return {x:doc.x+doc.width/2,y:doc.y+doc.height/2,elevation:doc.elevation ?? 0};
}
export function footprint(doc) {
  const token=doc.documentName === "Token",scale=token ? doc.parent.grid.size : 1;
  return rectangle(doc.x,doc.y,doc.width*scale,doc.height*scale,token ? 0 : doc.rotation ?? 0);
}
export function interactionDistance(token,object) {
  return polygonDistance(footprint(token),footprint(object))*token.parent.grid.distance/token.parent.grid.size;
}
export function placementDocument(placement) {
  const scene = game.scenes.get(placement.sceneId);
  return placement.kind === "token" ? scene?.tokens.get(placement.documentId) : scene?.tiles.get(placement.documentId);
}
export async function authorize(wheel,placement,userId,tokenUuid) {
  const user = game.users.get(userId);
  requireThat(user?.active,"USER","Spieler ist nicht verbunden.");
  requireThat(user.isGM || !wheel.rules.userIds.length || wheel.rules.userIds.includes(userId),"ACCESS","Du hast keinen Zugriff auf dieses Rad.");
  requireThat(typeof tokenUuid === "string" && tokenUuid.length <= 256,"TOKEN","Wähle einen eigenen Token aus.");
  const token = await fromUuid(tokenUuid);
  requireThat(token?.documentName === "Token" && token.parent?.id === placement.sceneId && token.actor,"TOKEN","Token und Rad müssen in derselben Szene sein.");
  requireThat(user.isGM || user.viewedScene === placement.sceneId,"SCENE","Das Rad ist nicht in deiner betrachteten Szene.");
  requireThat(user.isGM || (!token.hidden && token.actor.testUserPermission(user,"OWNER")),"OWNER","Du musst Besitzer dieses Tokens sein.");
  const object = placementDocument(placement);
  requireThat(object && !object.hidden,"PLACEMENT","Die Platzierung fehlt oder ist verborgen.");
  const marker = object.getFlag(ID,"placement");
  requireThat(marker?.wheelId === wheel.id && marker.placementId === placement.id,"PLACEMENT","Platzierung ist nicht mehr mit diesem Rad verbunden.");
  const d = interactionDistance(token,object);
  const zoneRadius = placement.kind === "zone" ? Math.min(object.width,object.height)/2*token.parent.grid.distance/token.parent.grid.size : 0;
  const allowed=placement.kind === "zone" ? zoneRadius : wheel.rules.range;
  const measured=placement.kind === "zone" ? distance({...centerFor(token),elevation:0},{...centerFor(object),elevation:0},gridFor(token.parent)) : d;
  requireThat(measured <= allowed + 1e-6,"RANGE",`Dein Token ist zu weit vom Rad entfernt: ${measured.toLocaleString("de-DE",{maximumFractionDigits:2})} ${token.parent.grid.units || "Szeneneinheiten"}, erlaubt ${allowed}. Gemessen wird zur sichtbaren Fläche.`);
  return {user,token,actor:token.actor,actorUuid:token.actor.uuid,scene:token.parent};
}
export async function contextForSpin(spin) {
  const actor = await fromUuid(spin.actorUuid);
  requireThat(actor?.documentName === "Actor","ACTOR","Gewinner-Actor fehlt. Vor der Wiederaufnahme wiederherstellen.");
  const token = await fromUuid(spin.tokenUuid);
  return {actor,actorUuid:actor.uuid,token,user:game.users.get(spin.userId),scene:token?.parent};
}
export function ownTokens(scene = canvas.scene) {
  return scene?.tokens.filter(t=>t.actor && !t.hidden && t.actor.testUserPermission(game.user,"OWNER")) ?? [];
}
export function selectedToken() {
  const controlled = canvas.tokens?.controlled.filter(t=>t.actor?.testUserPermission(game.user,"OWNER")) ?? [];
  if (controlled.length === 1) return controlled[0].document;
  const own = ownTokens();
  return own.length === 1 ? own[0] : null;
}
export function discoverPlacements() {
  if (!canvas.scene) return [];
  return [...canvas.scene.tiles,...canvas.scene.tokens].filter(d=>!d.hidden && d.getFlag(ID,"placement"))
    .map(d=>({...d.getFlag(ID,"placement"),document:d}));
}
