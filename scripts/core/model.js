export const ID = "arcane-wheels";
import {THEMES,balanceChances,chanceTotal} from "./presentation.js";
export const SCHEMA = 3;
export const PALETTE = ["#a653eb", "#f59a36", "#35c4ba", "#dc63b4", "#7483ed", "#86c75d"];
export const clone = value => structuredClone(value);
export const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export class WheelError extends Error {
  constructor(code, message) { super(message); this.name = "WheelError"; this.code = code; }
}
export function requireThat(condition, code, message) {
  if (!condition) throw new WheelError(code, message);
}
export function uid() {
  // getRandomValues also works on ordinary HTTP Foundry hosts; randomUUID requires a secure context.
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
export function defaultAction(id = uid()) {
  return {id, type:"confetti", phase:"result", target:"winner", userIds:[], radius:10,
    duration:2500, value:"", color:"#bd82ff", volume:0.6};
}
export function defaultSegment(id = uid(), index = 0) {
  return {id, label:`Gewinn ${index + 1}`, chance:0, stock:null, color:THEMES[index % THEMES.length].color,theme:THEMES[index % THEMES.length].id,image:"",
    showChance:false, showStock:false, textDirection:"inherit", fontSize:null,
    enabled:true, itemUuid:"", delivery:"display", actions:[]};
}
export function defaultWheel(id = uid()) {
  return {schema:SCHEMA, id, name:"Magical Halloween", enabled:true, design:"magical-halloween",
    description:"Ein magisches Rad voller Möglichkeiten.", duration:6000, showOdds:false, showStock:false,
    appearance:{textDirection:"radial",fontSize:38,dim:65,glow:true,decorations:true},
    rules:{userIds:[], range:5, cost:{amount:0, path:"system.currency.gp", label:"Goldstücke"},
      maxSpins:0, cooldown:0, identity:"actor", limitScope:"wheel", limitResetSeconds:0},
    stockResetSeconds:0, placements:[], actions:[],
    segments:balanceChances(["Kürbiszauber", "Geistergruß", "Fledermausnacht", "Mondlicht", "Hexenkerzen", "Süßer Spuk"].map((label,i)=>({...defaultSegment(uid(),i),label,chance:1})))};
}
export function emptyState() { return {pools:{}, limits:{}, spins:[], revision:0}; }
export function emptyRecord(config = defaultWheel()) { return {schema:SCHEMA, config, state:emptyState()}; }
const isId = x => typeof x === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(x) && !["__proto__","constructor","prototype"].includes(x);
const finite = (x,min,max) => typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
const text = (x,max) => typeof x === "string" && x.length <= max;
const integer = (x,min,max) => Number.isSafeInteger(x) && x >= min && x <= max;
const unique = a => new Set(a).size === a.length;
export function safeAssetPath(path) {
  return typeof path === "string" && path.length <= 2048 && !/[<>"'\\\x00-\x1f]/.test(path)
    && !/^(?:javascript|data|vbscript|file):/i.test(path) && !path.startsWith("//");
}
export function validateAction(a) {
  requireThat(a && isId(a.id), "CONFIG", "FX-ID fehlt oder ist ungültig.");
  requireThat(["chat","sound","confetti","glow","macro","effect"].includes(a.type),"CONFIG","Unbekannte FX-Aktion.");
  requireThat(["start","result","finish"].includes(a.phase),"CONFIG","Ungültiger FX-Zeitpunkt.");
  requireThat(["winner","players","all","gm","radius"].includes(a.target),"CONFIG","Ungültiges FX-Ziel.");
  requireThat(Array.isArray(a.userIds) && a.userIds.length <= 100 && a.userIds.every(isId),"CONFIG","Ungültige FX-Spielerliste.");
  requireThat(finite(a.radius,0,100000) && integer(a.duration,100,30000) && finite(a.volume,0,1),"CONFIG","Ungültige FX-Dauer, Lautstärke oder Reichweite.");
  requireThat(/^#[0-9a-f]{6}$/i.test(a.color) && text(a.value,4000),"CONFIG","Ungültige FX-Farbe oder Inhalt.");
  if (a.type === "sound") requireThat(!!a.value && safeAssetPath(a.value),"CONFIG","Ungültiger Audiopfad.");
  if (["macro","effect"].includes(a.type)) requireThat(!!a.value && text(a.value,512),"CONFIG","FX benötigt eine Dokument-UUID.");
}
export function validateWheel(w) {
  requireThat(w && w.schema === SCHEMA && isId(w.id),"CONFIG","Nicht unterstütztes Radformat.");
  requireThat(text(w.name,120) && w.name.trim() && text(w.description,4000),"CONFIG","Name oder Beschreibung ungültig.");
  requireThat(typeof w.enabled === "boolean" && typeof w.showOdds === "boolean" && w.design === "magical-halloween","CONFIG","Ungültiges Design oder Sichtbarkeitsfeld.");
  requireThat(integer(w.duration,1000,30000) && integer(w.stockResetSeconds,0,31536000),"CONFIG","Ungültige Animations- oder Resetdauer.");
  const a=w.appearance;
  requireThat(a && ["radial","horizontal","vertical"].includes(a.textDirection) && integer(a.fontSize,8,96) && integer(a.dim,0,90) && typeof a.glow==="boolean" && typeof a.decorations==="boolean" && typeof w.showStock==="boolean","CONFIG","Ungültige Schrift- oder Kulisseneinstellungen.");
  const r = w.rules;
  requireThat(r && Array.isArray(r.userIds) && r.userIds.length <= 100 && r.userIds.every(isId),"CONFIG","Ungültige Zugriffsliste.");
  requireThat(finite(r.range,0,100000) && integer(r.maxSpins,0,1000000) && integer(r.cooldown,0,31536000),"CONFIG","Ungültige Reichweite oder Limits.");
  requireThat(["actor","user"].includes(r.identity) && ["wheel","placement"].includes(r.limitScope) && integer(r.limitResetSeconds,0,31536000),"CONFIG","Ungültiger Limitbereich oder Reset.");
  requireThat(r.cost && finite(r.cost.amount,0,1e9) && text(r.cost.label,120),"CONFIG","Ungültige Kosten.");
  requireThat(/^system(?:\.[a-zA-Z0-9_]+)+$/.test(r.cost.path) && !r.cost.path.split(".").some(k=>["__proto__","constructor","prototype"].includes(k)),"CONFIG","Kostenpfad muss ein numerisches system-Feld sein.");
  requireThat(Array.isArray(w.segments) && w.segments.length >= 2 && w.segments.length <= 100 && unique(w.segments.map(s=>s.id)),"CONFIG","Erforderlich: 2–100 Segmente mit eindeutigen IDs.");
  for (const s of w.segments) {
    requireThat(isId(s.id) && text(s.label,160) && s.label.trim() && finite(s.chance,0,100) && Math.abs(s.chance*100-Math.round(s.chance*100))<1e-6,"CONFIG","Gewinnchance muss zwischen 0 und 100 % liegen, mit höchstens zwei Nachkommastellen.");
    requireThat(THEMES.some(t=>t.id===s.theme) || s.theme==="custom","CONFIG","Unbekanntes Segment-Theme.");
    requireThat(text(s.image,2048) && (!s.image || safeAssetPath(s.image)) && (s.theme!=="custom" || !!s.image),"CONFIG","Für das eigene Bild muss eine gültige Bilddatei ausgewählt sein.");
    requireThat(typeof s.showChance==="boolean" && typeof s.showStock==="boolean" && ["inherit","radial","horizontal","vertical"].includes(s.textDirection) && (s.fontSize===null || integer(s.fontSize,8,96)),"CONFIG","Ungültige Segmentbeschriftung oder Anzeigeoption.");
    requireThat(s.stock === null || integer(s.stock,0,1000000),"CONFIG","Vorrat muss leer (unbegrenzt) oder eine ganze Zahl sein.");
    requireThat(typeof s.enabled === "boolean" && /^#[0-9a-f]{6}$/i.test(s.color),"CONFIG","Ungültige Segmentfarbe oder Aktivierung.");
    requireThat(text(s.itemUuid,512) && ["display","automatic","confirm"].includes(s.delivery),"CONFIG","Ungültige Gegenstandsvergabe.");
    requireThat(s.delivery === "display" || !!s.itemUuid,"CONFIG","Automatische oder bestätigte Vergabe benötigt eine Item-UUID.");
    requireThat(Array.isArray(s.actions) && s.actions.length <= 40 && unique(s.actions.map(a=>a.id)),"CONFIG","Ungültige Segment-FX.");
    s.actions.forEach(validateAction);
  }
  requireThat(chanceTotal(w.segments)===100,"CHANCES",`Die Gewinnchancen der aktiven Segmente müssen zusammen 100 % ergeben (aktuell ${chanceTotal(w.segments).toFixed(2)} %).`);
  requireThat(w.segments.some(s=>s.enabled && s.chance > 0 && s.stock !== 0),"CONFIG","Mindestens ein Segment muss gewinnbar sein.");
  requireThat(Array.isArray(w.actions) && w.actions.length <= 40 && unique(w.actions.map(a=>a.id)),"CONFIG","Ungültige Rad-FX."); w.actions.forEach(validateAction);
  requireThat(Array.isArray(w.placements) && w.placements.length <= 100 && unique(w.placements.map(p=>p.id)),"CONFIG","Ungültige Platzierungen.");
  for (const p of w.placements) {
    requireThat(isId(p.id) && p.id!=="shared" && isId(p.sceneId) && isId(p.documentId) && typeof p.enabled === "boolean" && text(p.name,120),"CONFIG","Ungültige Platzierung.");
    requireThat(["tile","token","zone"].includes(p.kind) && ["own","shared"].includes(p.pool),"CONFIG","Ungültige Platzierungsart oder Vorratswahl.");
  }
  requireThat(JSON.stringify(w).length < 500000,"CONFIG","Radkonfiguration zu groß.");
  return w;
}
export function publicWheel(w, pool) {
  const eligible = eligibleSegments(w, pool);
  const total = eligible.reduce((n,s)=>n+s.chance,0);
  return {id:w.id, name:w.name, description:w.description, duration:w.duration, design:w.design,appearance:clone(w.appearance),
    cost:{amount:w.rules.cost.amount,label:w.rules.cost.label},
    segments:w.segments.filter(s=>s.enabled).map(s=>({id:s.id,label:s.label,color:s.color,theme:s.theme,image:s.image,
      textDirection:s.textDirection==="inherit" ? w.appearance.textDirection : s.textDirection,fontSize:s.fontSize ?? w.appearance.fontSize,
      ...(s.showStock ? {remaining:s.stock===null ? null : pool?.remaining[s.id] ?? s.stock} : {}),
      available:eligible.some(e=>e.id===s.id), ...(s.showChance ? {chance:eligible.some(e=>e.id===s.id) ? s.chance/total : 0} : {})}))};
}
export function poolKey(placement) { return placement.pool === "shared" ? "shared" : placement.id; }
export function getPool(state, wheel, placement, worldTime) {
  const key = poolKey(placement);
  const previous = state.pools[key];
  const elapsed = previous && worldTime - previous.resetAt;
  if (!previous || (wheel.stockResetSeconds > 0 && elapsed >= wheel.stockResetSeconds)) {
    state.pools[key] = {resetAt:worldTime, remaining:{}};
  }
  const pool = state.pools[key];
  for (const s of wheel.segments) {
    if (!(s.id in pool.remaining)) pool.remaining[s.id] = s.stock;
    // Unlimited is a configuration property, never a depleted finite balance.
    if (s.stock === null) pool.remaining[s.id] = null;
  }
  return pool;
}
export function eligibleSegments(wheel, pool) {
  return wheel.segments.filter(s => s.enabled && s.chance > 0 && (s.stock === null || (pool?.remaining[s.id] ?? s.stock) > 0));
}
export function chooseSegment(segments, random) {
  requireThat(segments.length > 0,"EMPTY","Alle Gewinne sind ausgeschöpft.");
  requireThat(finite(random,0,1) && random < 1,"RNG","Ungültiger Zufallswert.");
  const weight=s=>s.chance ?? s.weight;
  const total = segments.reduce((n,s)=>n+weight(s),0);
  requireThat(total > 0 && Number.isFinite(total),"RNG","Keine gültigen Gewichte.");
  let cursor = random * total;
  for (const s of segments) { cursor -= weight(s); if (cursor < 0) return s; }
  return segments.at(-1);
}
export function limitKey(wheel, placement, userId, actorUuid) {
  return `${wheel.rules.limitScope === "placement" ? placement.id : "wheel"}:${wheel.rules.identity === "user" ? userId : actorUuid}`;
}
export function getLimit(state, wheel, placement, userId, actorUuid, worldTime) {
  const key = limitKey(wheel,placement,userId,actorUuid);
  const prev = state.limits[key];
  if (!prev || (wheel.rules.limitResetSeconds > 0 && worldTime - prev.resetAt >= wheel.rules.limitResetSeconds)) {
    state.limits[key] = {count:0,lastAt:null,resetAt:worldTime};
  }
  return state.limits[key];
}
export function checkLimit(wheel, limit, realTime) {
  requireThat(!wheel.rules.maxSpins || limit.count < wheel.rules.maxSpins,"LIMIT",`Du hast bereits ${limit.count} Mal gedreht. Erlaubt sind ${wheel.rules.maxSpins} Drehung(en) pro ${wheel.rules.identity === "user" ? "Person" : "Charakter"}.`);
  requireThat(limit.lastAt === null || realTime - limit.lastAt >= wheel.rules.cooldown * 1000,"COOLDOWN",`Bitte warte noch ${Math.max(0,Math.ceil((limit.lastAt + wheel.rules.cooldown * 1000 - realTime)/1000))} Sekunden, bis du wieder drehen kannst.`);
}
export function distance(a,b,grid) {
  requireThat(grid.size > 0 && grid.distance > 0,"SCENE","Ungültiger Szenenmaßstab.");
  return Math.hypot((a.x-b.x)*grid.distance/grid.size,(a.y-b.y)*grid.distance/grid.size,(a.elevation ?? 0)-(b.elevation ?? 0));
}
export function spinAngle(index, count, jitter = 0.5) {
  // Canvas sectors start at 12 o'clock; rotation puts chosen sector beneath the top pointer.
  return 360 * 6 + ((360 - (index + 0.15 + jitter * 0.7) * 360 / count) % 360);
}
export class SerialQueue {
  #tail = Promise.resolve();
  run(task) { const result = this.#tail.then(task); this.#tail = result.catch(()=>{}); return result; }
}
