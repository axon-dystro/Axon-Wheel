import {ID,SCHEMA,clone,emptyRecord,requireThat,validateWheel} from "../core/model.js";
import {migrateConfig} from "../core/presentation.js";

export function assertAuthority() {
  requireThat(game.user.isGM && game.users.activeGM?.id === game.user.id,"GM","Nur der aktive zuständige GM darf diesen Vorgang ausführen.");
}
export function wheelDocuments() {
  // World settings are writable by GMs. A player-created JournalEntry with forged flags is NOT a wheel.
  const ids=game.settings.get(ID,"registry")?.ids ?? [];
  return ids.map(id=>game.journal.get(id)).filter(j=>j?.getFlag(ID,"kind")==="wheel");
}
export function documentFor(id) { return wheelDocuments().find(j=>j.getFlag(ID,"wheelId")===id); }
export function readDocument(doc) {
  requireThat(doc,"MISSING","Rad wurde nicht gefunden.");
  const r = JSON.parse(doc.getFlag(ID,"record"));
  if([1,2].includes(r.schema)){r.config=migrateConfig(r.config);r.schema=SCHEMA;}
  requireThat(r.schema === SCHEMA,"SCHEMA","Neuere oder unbekannte Datenversion. Keine Änderung vorgenommen.");
  return r;
}
export async function load(id) { return clone(readDocument(documentFor(id))); }
export async function save(record) {
  assertAuthority();
  const doc = documentFor(record.config.id);
  requireThat(doc,"MISSING","Rad wurde gelöscht.");
  record.state.revision += 1;
  const data = JSON.stringify(record);
  requireThat(data.length < 4000000,"SIZE","Radprotokoll zu groß. Exportieren und Rad kopieren.");
  // A JSON string is one scalar flag: deleted nested keys cannot survive Foundry's object merge.
  await doc.update({name:`Axon Wheel · ${record.config.name}`,[`flags.${ID}.record`]:data});
}
export async function createWheel(config) {
  assertAuthority(); validateWheel(config);
  requireThat(!documentFor(config.id),"CONFIG","Rad-ID existiert bereits.");
  const doc=await foundry.documents.JournalEntry.create({name:`Axon Wheel · ${config.name}`,ownership:{default:0},
    flags:{[ID]:{kind:"wheel",wheelId:config.id,record:JSON.stringify(emptyRecord(config))}}});
  const ids=game.settings.get(ID,"registry").ids;
  try {await game.settings.set(ID,"registry",{ids:[...ids,doc.id]});}
  catch(error) {await doc.delete();throw error;}
  return doc;
}
