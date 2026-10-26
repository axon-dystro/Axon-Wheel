import {ID,clone,uid,defaultWheel,defaultSegment,defaultAction,publicWheel,validateWheel,requireThat} from "../core/model.js";
import {TEXT_DIRECTIONS} from "../core/labels.js";
import {THEMES,themeImage,chanceTotal,percentages,allocateRemaining,migrateConfig,currencyChoices} from "../core/presentation.js";
import {assertAuthority,wheelDocuments,readDocument,load,createWheel,documentFor} from "../foundry/store.js";
import {addPlacement,removePlacement} from "../foundry/placements.js";
import {ArcaneApplication,e,field,checkbox,select,area,userChoices,capture,downloadJSON} from "./base.js";
import {drawWheel,loadThemeImages} from "./wheel.js";
const TABS=[["manager","Übersicht"],["segments","Segmente"],["design","Design"],["rules","Spielregeln"],["placements","Platzierungen"],["operation","Betrieb"],["advanced","Erweitert"]];
const deliveries=[["display","Nur Gewinn anzeigen"],["automatic","Automatisch ins Inventar"],["confirm","GM-Bestätigung"]];
const actionTypes=[["confetti","Magischer Sternenregen"],["glow","Token leuchten lassen"],["sound","Audio abspielen"],["chat","Chat-Nachricht"],["effect","ActiveEffect kopieren"],["macro","GM-Makro ausführen"]];
const targets=[["winner","Nur Gewinner"],["players","Bestimmte Spieler"],["all","Alle verbundenen Spieler / Szenentokens"],["gm","Nur GMs"],["radius","Tokens im Radius um die Platzierung"]];
export class WheelManager extends ArcaneApplication {
  static DEFAULT_OPTIONS={id:"arcane-wheels-manager",classes:["arcane-wheels","aw-manager"],window:{title:"Axon Wheel"},position:{width:1120,height:850}};
  constructor(engine) {super();this.engine=engine;this.tab="manager";this.record=null;this.draft=null;this.revision=0;this.dirty=false;}
  async choose(id) {
    if(this.dirty && !await foundry.applications.api.DialogV2.confirm({window:{title:"Ungespeicherter Entwurf"},content:"Entwurf verwerfen?"})) return;
    this.record=await load(id);this.draft=clone(this.record.config);this.revision=this.record.state.revision;this.dirty=false;
    await this.render({force:true});
  }
  readForm() {
    if(!this.draft||!this.element)return;capture(this.element,this.draft);
    this.draft.showOdds=this.draft.segments.every(s=>s.showChance);
    this.draft.showStock=this.draft.segments.every(s=>s.showStock);
    const currency=this.element.querySelector("[data-currency]");
    if(currency){const choice=currencyChoices().find(c=>c.path===currency.value);if(choice)this.draft.rules.cost={...this.draft.rules.cost,path:choice.path,label:choice.label};}
  }
  async html() {
    requireThat(game.user.isGM,"GM","Nur für Spielleiter.");
    const wheels=wheelDocuments().map(d=>{try{return readDocument(d);}catch{return null;}}).filter(Boolean);
    return `<header class="aw-manager-header"><div><div class="aw-eyebrow">re-Quested / Foundry VTT</div><h1>Axon Wheel<span class="aw-brand-dot">.</span></h1><small>Deine Räder. Deine Regeln.</small></div>
      <div class="aw-toolbar"><button type="button" class="aw-primary" data-cmd="new">Neues Rad</button><button type="button" data-cmd="reload">Neu laden</button></div></header>
      <nav class="aw-tabs">${TABS.map(([id,label])=>`<button type="button" data-tab="${id}" class="${this.tab===id ? "active" : ""}">${label}</button>`).join("")}</nav>
      <div class="aw-workspace"><aside class="aw-wheel-list"><div class="aw-library-heading">RADBIBLIOTHEK <span>${wheels.length}</span></div>${wheels.map(r=>`<button type="button" data-wheel="${e(r.config.id)}" class="${r.config.id===this.draft?.id ? "active" : ""}"><b>${e(r.config.name)}</b><small>${r.config.enabled ? "Aktiv" : "Pausiert"} · ${r.config.placements.length} Platzierungen</small></button>`).join("") || '<p class="aw-library-empty">Deine Räder erscheinen hier. Starte mit „Neues Rad“.</p>'}</aside>
      <main class="aw-editor"><div class="aw-editor-heading"><span>${e(this.draft?.name ?? "Willkommen")}</span><span>${e(TABS.find(([id])=>id===this.tab)?.[1] ?? "")}</span></div>${this.draft ? this.panel() : `<div class="aw-empty"><div class="aw-empty-mark" aria-hidden="true">AW</div><h2>Ein Rad. Unendlich viele Möglichkeiten.</h2><p>Erstelle ein Rad, lege Gewinne fest und platziere es in der Szene.</p><p class="aw-muted">Ob Schätze, kleine Belohnungen oder große Überraschungen: Du bestimmst, was auf dem Spiel steht.</p><button type="button" class="aw-primary" data-cmd="new">Erstes Rad erstellen</button></div>`}</main></div>
      ${this.draft ? `<footer class="aw-footer"><span class="aw-draft-status">${this.dirty ? "Ungespeicherter Entwurf" : `Gespeichert · Revision ${this.revision}`}</span><button type="button" data-cmd="validate">Prüfen</button><button type="button" class="aw-primary" data-cmd="save">Änderungen speichern</button></footer>` : ""}`;
  }
  panel() {
    const w=this.draft;
    if(this.tab==="manager") return `<h2>${e(w.name)}</h2><p>${e(w.description)}</p><div class="aw-stats"><div><b>${w.segments.length}</b> Segmente</div><div><b>${w.placements.length}</b> Platzierungen</div><div><b>${this.record.state.spins.length}</b> Drehungen</div></div>
      <p>Lege für jeden Gewinn die Chance direkt in Prozent fest. Alle aktiven Segmente ergeben zusammen 100 %. Ist ein Gewinnvorrat aufgebraucht, verteilen sich seine Chancen anteilig auf die verbleibenden Gewinne.</p>
      <div class="aw-toolbar"><button type="button" data-cmd="clone">Rad kopieren</button><button type="button" data-cmd="export">Protokoll und Konfiguration exportieren</button><button type="button" data-cmd="import">Konfiguration importieren</button></div>
      <p class="aw-muted">Zur Bedienung: Spieler wählen ihren Charakter-Token und klicken mit der rechten Maustaste auf den verknüpften NPC oder das Rad-Tile. Ein GM muss verbunden sein.</p>`;
    if(this.tab==="segments") {
      const total=chanceTotal(w.segments);
      return `<div class="aw-section-heading"><h2>Gewinnsegmente</h2><button type="button" data-cmd="add-segment">Segment</button></div><div class="aw-chance-summary"><strong data-chance-total>${total.toLocaleString("de-DE")} / 100 %</strong><span data-chance-help>${total===100 ? "Chancen vollständig verteilt" : "Zum Speichern müssen alle aktiven Segmente zusammen 100 % ergeben."}</span><button type="button" data-cmd="equal-chances">Alle gleich verteilen</button></div><p class="aw-muted">Jedes Segment bekommt sein eigenes Motiv. Gewinnchance direkt eingeben, z. B. 25 für 25 %. Vorrat leer = unbegrenzt.</p>${w.segments.map((s,i)=>`<section class="aw-card aw-segment" data-index="${i}"><header><span draggable="true" class="aw-drag" data-drag-segment="${i}" title="Segment verschieben">⠿</span><span class="aw-segment-number">${String(i+1).padStart(2,"0")}</span><b>${e(s.label)}</b><button type="button" data-cmd="remove-segment" data-index="${i}" title="Segment löschen">×</button></header><div class="aw-segment-body"><img class="aw-theme-preview" src="${e(themeImage(s))}" alt="Segmentmotiv"><div class="aw-form-grid">
      ${field("Gewinnname",`segments.${i}.label`,s.label)}${field("Gewinnchance (%)",`segments.${i}.chance`,s.chance,"number",`min="0" max="100" step="0.01" data-chance-index="${i}"`)}
      ${select("Halloween-Motiv",`segments.${i}.theme`,s.theme,[...THEMES.map(t=>[t.id,t.label]),["custom","Eigenes Bild"]])}
      ${field("Vorrat (leer = unbegrenzt)",`segments.${i}.stock`,s.stock,"number",'min="0" step="1" data-nullable="true"')}
      ${field("Gegenstand (UUID oder aus dem Verzeichnis hierher ziehen)",`segments.${i}.itemUuid`,s.itemUuid,"text",'data-item-drop="true" placeholder="Item.… oder Compendium.…"')}${select("Gegenstandsvergabe",`segments.${i}.delivery`,s.delivery,deliveries)}
      ${checkbox("Segment aktiv",`segments.${i}.enabled`,s.enabled)}${checkbox("Gewinnchance im Rad anzeigen",`segments.${i}.showChance`,s.showChance)}${checkbox("Restvorrat im Rad anzeigen",`segments.${i}.showStock`,s.showStock)}<button type="button" data-cmd="balance-rest" data-index="${i}">Diese Chance behalten · übrige ausgleichen</button>
      ${s.theme==="custom" ? `${field("Bilddatei",`segments.${i}.image`,s.image)}<button type="button" data-cmd="pick-image" data-index="${i}">Bild auswählen / hochladen</button>` : ""}</div></div><details><summary>Effekte bei diesem Gewinn (${s.actions.length})</summary>${this.actions(s.actions,`segments.${i}.actions`)}<button type="button" data-cmd="add-action" data-path-target="segments.${i}.actions">Gewinn-Effekt</button></details></section>`).join("")}`;
    }
    if(this.tab==="design") return `<h2>Design und Darstellung</h2><p>Dein Rad schwebt über der Karte: mit weiß leuchtenden Geistern, einem magischen Lichtschein und Kürbissen bei Kerzenlicht.</p><div class="aw-form-grid">${field("Radname","name",w.name)}${field("Drehdauer (Millisekunden)","duration",w.duration,"number",'min="1000" max="30000" step="100"')}${area("Beschreibung","description",w.description)}${checkbox("Chancen bei allen Segmenten anzeigen","showOdds",w.showOdds)}${checkbox("Restvorrat bei allen Segmenten anzeigen","showStock",w.showStock)}${checkbox("Rad aktiv","enabled",w.enabled)}</div>
      <section class="aw-card"><h3>Kulisse und Beleuchtung</h3><div class="aw-form-grid">${field("Hintergrund abdunkeln (0–90 %)","appearance.dim",w.appearance.dim,"number",'min="0" max="90" step="1"')}${checkbox("Magischen Lichtschein einschalten","appearance.glow",w.appearance.glow)}${checkbox("Kürbisse und Kerzen einblenden","appearance.decorations",w.appearance.decorations)}</div><p class="aw-muted">Wirkt nur beim Spieler mit geöffnetem Rad. Die Szenenbeleuchtung bleibt gespeichert wie zuvor; beim Schließen verschwindet die Kulisse.</p></section>
      <section class="aw-card"><h3>Beschriftung</h3><div class="aw-form-grid">${select("Standard-Textausrichtung","appearance.textDirection",w.appearance.textDirection,TEXT_DIRECTIONS)}${field("Standard-Schriftgröße","appearance.fontSize",w.appearance.fontSize,"number",'min="8" max="96" step="1"')}</div><p class="aw-muted">Schriftgröße bezogen auf das Rad mit 1024 Pixeln. Namen werden umgebrochen und bei Bedarf verkleinert, damit sie im Segment bleiben. Links nach rechts und oben nach unten beziehen sich auf die Ausgangslage vor der Drehung. Die Beschriftung dreht sich mit dem Rad.</p>
      ${w.segments.map((s,i)=>`<div class="aw-label-settings"><b>${i+1}. ${e(s.label)}</b><div class="aw-form-grid">${select("Textausrichtung",`segments.${i}.textDirection`,s.textDirection,[["inherit","Wie Standard"],...TEXT_DIRECTIONS])}${field("Eigene Schriftgröße (leer = Standard)",`segments.${i}.fontSize`,s.fontSize,"number",'min="8" max="96" step="1" data-nullable="true"')}${checkbox("Gewinnchance im Rad anzeigen",`segments.${i}.showChance`,s.showChance)}${checkbox("Restvorrat im Rad anzeigen",`segments.${i}.showStock`,s.showStock)}</div></div>`).join("")}</section>
      <div class="aw-design-preview"><canvas width="1024" height="1024"></canvas><div><h3>Vorschau deines Rads</h3><p>Schrift, Ausrichtung und Anzeigeoptionen werden hier direkt aktualisiert. Die Vorschau zeigt den konfigurierten Anfangsvorrat; im Spiel erscheint der tatsächlich verbleibende Vorrat des verwendeten Rads.</p><p>Bei unbegrenztem Vorrat erscheint ∞. Ist ein Gewinn aufgebraucht, werden die eingeblendeten Chancen für die nächste Drehung neu berechnet.</p></div></div>
      <div class="aw-section-heading"><h3>Vorgefertigte Motive</h3><button type="button" data-cmd="theme-mix">Halloween-Mix auf alle Segmente</button></div><div class="aw-theme-gallery">${THEMES.map(t=>`<button type="button" data-cmd="theme-all" data-theme="${t.id}" title="${e(t.label)} auf alle Segmente anwenden"><img src="modules/${ID}/assets/themes/${t.id}.svg" alt=""><span>${e(t.label)}</span></button>`).join("")}</div><p class="aw-muted">Ein Motiv für alle Segmente übernehmen oder unter „Segmente“ jedes Motiv und eigene Bilder einzeln wählen.</p>`;
    if(this.tab==="rules") return `<h2>Spielregeln</h2><p>Lege fest, wer spielen darf, was eine Drehung kostet und wie oft gespielt werden kann.</p><div class="aw-form-grid">
      ${checkbox("Rad aktiv","enabled",w.enabled)}${field("Interaktionsreichweite (Szeneneinheiten)","rules.range",w.rules.range,"number",'min="0" step="any"')}
      ${field("Kosten pro Drehung (0 = kostenlos)","rules.cost.amount",w.rules.cost.amount,"number",'min="0" step="1"')}<label class="aw-field"><span>Währung für die Drehkosten</span><select data-currency>${currencyChoices().map(c=>`<option value="${c.path}" ${c.path===w.rules.cost.path ? "selected" : ""}>${e(c.label)}</option>`).join("")}<option value="custom" ${currencyChoices().some(c=>c.path===w.rules.cost.path)?"":"selected"}>Eigene Währung (unter Erweitert)</option></select></label>
      ${field("Maximale Drehungen (0 = unbegrenzt)","rules.maxSpins",w.rules.maxSpins,"number",'min="0" step="1"')}${field("Wartezeit bis zur nächsten Drehung (Sekunden)","rules.cooldown",w.rules.cooldown,"number",'min="0" step="1"')}
      ${select("Drehungen zählen pro","rules.identity",w.rules.identity,[["actor","Charakter (Actor)"],["user","Spieleraccount"]])}${select("Mehrere Platzierungen zusammen zählen?","rules.limitScope",w.rules.limitScope,[["wheel","Ja · alle Kopien dieses Rads zusammen"],["placement","Nein · jede Platzierung zählt separat"]])}
      ${field("Drehlimits erneuern nach Weltzeit-Sekunden (0 = manuell)","rules.limitResetSeconds",w.rules.limitResetSeconds,"number",'min="0" step="1"')}${field("Vorräte auffüllen nach Weltzeit-Sekunden (0 = manuell)","stockResetSeconds",w.stockResetSeconds,"number",'min="0" step="1"')}${userChoices("rules.userIds",w.rules.userIds)}</div>
      <div class="aw-help"><b>So wirken diese Regeln</b><p>Wartezeit 60: Derselbe Charakter bzw. Spieler muss nach einer Drehung eine echte Minute warten. 0 bedeutet keine Wartezeit.</p><p>Beispiel Drehlimit 3: „zusammen zählen“ erlaubt insgesamt 3 Drehungen an allen Kopien; „separat“ erlaubt 3 an jeder einzelnen Platzierung.</p><p>Ein Token auf dem Rad hat Abstand 0. Gemessen wird horizontal zwischen den sichtbaren Flächen, ohne zusätzliche Höhenentfernung oder Wandprüfung. Kosten werden in der gewählten Münzsorte abgebucht, ohne automatisches Wechselgeld.</p><p>Keine Spieler ausgewählt = alle dürfen spielen.</p></div>`;
    if(this.tab==="placements") return `<div class="aw-section-heading"><h2>Szenenplatzierungen</h2><button type="button" data-cmd="place">Platzieren</button></div><p>Jede Platzierung wählt ihren eigenen oder den gemeinsamen Gewinnvorrat. Bestände eines gemeinsamen Pools gelten szenenübergreifend für dieses Rad.</p>
      ${w.placements.map((p,i)=>`<section class="aw-card"><header><span class="aw-kind">${p.kind==="token" ? "NPC-Token" : p.kind==="zone" ? "Bestehende Zonen-Tile" : "Rad-Tile"}</span><b>${e(p.name)}</b><button type="button" data-cmd="remove-placement" data-id="${e(p.id)}">Entfernen</button></header><div class="aw-form-grid">${field("Name",`placements.${i}.name`,p.name)}${select("Gewinnvorrat",`placements.${i}.pool`,p.pool,[["shared","Gemeinsam für dieses Rad"],["own","Eigener Vorrat"]])}${checkbox("Platzierung aktiv",`placements.${i}.enabled`,p.enabled)}</div><small>Szene: ${e(game.scenes.get(p.sceneId)?.name ?? "fehlt")} · ${e(this.placementName(p))}</small><div class="aw-toolbar"><button type="button" data-cmd="locate-placement" data-id="${e(p.id)}">In Szene zeigen</button><button type="button" data-cmd="reset-placement" data-id="${e(p.id)}">Diesen Vorrat auffüllen</button></div></section>`).join("") || "Noch keine Platzierung."}
      <p class="aw-muted">Beim Platzieren zwischen Rad-Tile und vorhandenem NPC-Token wählen. Ein NPC muss vorher in der Szene stehen; das Rad wird mit ihm verknüpft. Zusätzliche Zonen-Tiles werden nicht mehr neu angeboten; vorhandene bleiben erhalten.</p>`;
    if(this.tab==="operation") {
      const spins=[...this.record.state.spins].reverse();
      return `<h2>Betrieb und Vergabe</h2><div class="aw-toolbar"><button type="button" data-cmd="reset-stock">Alle Vorräte auffüllen</button><button type="button" data-cmd="reset-limits">Alle Limits zurücksetzen</button><button type="button" data-cmd="export">Audit exportieren</button></div>
      <h3>Aktuelle Vorräte</h3>${Object.entries(this.record.state.pools).map(([id,p])=>`<p><b>${e(id === "shared" ? "Gemeinsamer Vorrat" : w.placements.find(x=>x.id===id)?.name ?? id)}</b>: ${w.segments.map(s=>`${e(s.label)}: ${p.remaining[s.id] ?? "∞"}`).join(" · ")}</p>`).join("") || "Noch keine Drehung; Anfangsvorräte gelten."}
      <h3>Verlauf (${spins.length})</h3>${spins.slice(0,100).map(s=>`<section class="aw-card"><header><b>${e(s.segment.label)}</b><small>${e(new Date(s.at).toLocaleString())}</small><code>${e(s.status)}</code></header><p>${e(game.users.get(s.userId)?.name ?? s.userId)} · ${e(s.actorUuid)} · ${e(s.delivery)} · Kosten ${e(s.cost.amount)} ${e(s.cost.label)}</p>${s.error ? `<p class="aw-error">${e(s.error)}</p>` : ""}
      ${s.status==="awaiting" ? `<button type="button" data-cmd="approve" data-id="${e(s.id)}">Gegenstand vergeben</button><button type="button" data-cmd="deny" data-id="${e(s.id)}">Vergabe ablehnen</button>` : !["complete","failed"].includes(s.status) ? `<button type="button" data-cmd="resume" data-id="${e(s.id)}">Geprüft fortsetzen</button><button type="button" data-cmd="close-failure" data-id="${e(s.id)}">Fehler nach Prüfung abschließen</button>` : ""}
      ${s.resolution ? `<p class="aw-muted">Prüfnotiz: ${e(s.resolution.reason)}</p>` : ""}
      ${s.actions.filter(a=>a.type==="macro" && s.actionStates[a.key]==="running").map(a=>`<button type="button" data-cmd="resolve-macro" data-id="${e(s.id)}" data-key="${e(a.key)}">Makro nach Prüfung als erledigt markieren</button>`).join("")}<small>Anfrage ${e(s.id)}</small></section>`).join("") || "Noch keine Drehungen."}<p class="aw-muted">Anzeige: letzte 100 Einträge. Der Export enthält das vollständige Protokoll. Unterbrochene Vorgänge blockieren neue Drehungen; Kosten, Items und Effekte werden bei Fortsetzung anhand ihrer Markierungen geprüft.</p>`;
    }
    return `<h2>Erweitert</h2><details><summary>Optionale Effekte bei jeder Drehung (${w.actions.length})</summary><p>Diese Effekte laufen unabhängig davon, welches Segment gewinnt. Beispiel: ein Startton bei jeder Drehung. Für einen Effekt nur bei einem bestimmten Gewinn verwende „Segmente“. Dieser Bereich kann leer bleiben.</p>${this.actions(w.actions,"actions")}<button type="button" data-cmd="add-action" data-path-target="actions">Allgemeinen Effekt</button></details><details><summary>Eigene Währung / technische Anbindung</summary><p>Bei D&D5e genügen die Münzsorten unter Spielregeln. Nur für eigene Ressourcen oder andere Systeme müssen diese Werte angepasst werden.</p><div class="aw-form-grid">${field("Angezeigter Währungsname","rules.cost.label",w.rules.cost.label)}${field("Numerisches Charakter-Datenfeld","rules.cost.path",w.rules.cost.path)}</div></details><details><summary>Konfiguration als JSON bearbeiten</summary><p>Änderungen werden vor dem Speichern validiert.</p>
      <textarea class="aw-json" spellcheck="false">${e(JSON.stringify(w,null,2))}</textarea><button type="button" data-cmd="apply-json">JSON in Entwurf übernehmen</button></details>
      <div class="aw-toolbar"><button type="button" data-cmd="export">Vollständigen Audit exportieren</button><button type="button" data-cmd="import">Radkonfiguration importieren</button><button type="button" class="aw-danger" data-cmd="delete">Rad löschen</button></div>
      <p class="aw-muted">Zielplattform: Foundry VTT 14.367 mit D&D5e 6.0.6.</p>`;
  }
  actions(actions,path) {
    return actions.map((a,i)=>`<section class="aw-action"><header><b>Effekt ${i+1}</b><button type="button" data-cmd="remove-action" data-path-target="${e(path)}" data-index="${i}">×</button></header><div class="aw-form-grid">
      ${select("Aktion",`${path}.${i}.type`,a.type,actionTypes)}${select("Zeitpunkt",`${path}.${i}.phase`,a.phase,[["start","Start"],["result","Ergebnis"],["finish","Abschluss"]])}
      ${select("Ziel dieser Aktion",`${path}.${i}.target`,a.target,targets)}${userChoices(`${path}.${i}.userIds`,a.userIds)}
      ${field("Radius (Szeneneinheiten)",`${path}.${i}.radius`,a.radius,"number",'min="0" step="any"')}${field("Dauer (ms)",`${path}.${i}.duration`,a.duration,"number",'min="100" max="30000"')}
      ${field("Farbe",`${path}.${i}.color`,a.color,"color")}${field("Lautstärke (0–1)",`${path}.${i}.volume`,a.volume,"number",'min="0" max="1" step="0.05"')}
      ${area("Text / Audiopfad / Macro- oder ActiveEffect-UUID",`${path}.${i}.value`,a.value)}</div></section>`).join("");
  }
  async bind() {
    for(const b of this.element.querySelectorAll("[data-tab]")) b.addEventListener("click",()=>this.guard(async()=>{this.readForm();this.tab=b.dataset.tab;await this.render({force:true});}));
    for(const b of this.element.querySelectorAll("[data-wheel]")) b.addEventListener("click",()=>this.guard(()=>this.choose(b.dataset.wheel)));
    for(const b of this.element.querySelectorAll("[data-cmd]")) b.addEventListener("click",()=>this.guard(()=>this.command(b.dataset.cmd,b.dataset)));
    for(const input of this.element.querySelectorAll("[data-path],.aw-json")) input.addEventListener("input",()=>{this.dirty=true;this.element.querySelector(".aw-draft-status").textContent="Ungespeicherter Entwurf";});
    for(const input of this.element.querySelectorAll("[data-path], [data-currency]"))input.addEventListener("input",()=>{
      this.readForm();
      const path=input.dataset.path;
      if(path==="showOdds" || path==="showStock"){
        const key=path==="showOdds" ? "showChance" : "showStock";
        for(const segment of this.draft.segments)segment[key]=input.checked;
        for(const el of this.element.querySelectorAll(`[data-path$=".${key}"]`))el.checked=input.checked;
      }
      this.draft.showOdds=this.draft.segments.every(s=>s.showChance);this.draft.showStock=this.draft.segments.every(s=>s.showStock);
      for(const key of ["showOdds","showStock"]){const el=this.element.querySelector(`[data-path="${key}"]`);if(el)el.checked=this.draft[key];}
      clearTimeout(this.previewTimer);this.previewTimer=setTimeout(()=>{void this.guard(()=>this._afterThemeRender());},120);
      this.markDirty();const total=chanceTotal(this.draft.segments),counter=this.element.querySelector("[data-chance-total]"),hint=this.element.querySelector("[data-chance-help]");
      if(counter)counter.textContent=`${total.toLocaleString("de-DE")} / 100 %`;
      if(hint)hint.textContent=total===100 ? "Chancen vollständig verteilt" : total<100 ? `Noch ${(100-total).toLocaleString("de-DE",{maximumFractionDigits:2})} % zu verteilen` : `${(total-100).toLocaleString("de-DE",{maximumFractionDigits:2})} % zu viel vergeben`;
    });
    for(const input of this.element.querySelectorAll('select[data-path$=".theme"]'))input.addEventListener("change",()=>this.guard(async()=>{
      this.readForm();const index=Number(input.dataset.path.split(".")[1]),s=this.draft.segments[index],theme=THEMES.find(t=>t.id===s.theme);
      if(theme)s.color=theme.color;this.markDirty();await this.render({force:true});
    }));
    for(const handle of this.element.querySelectorAll("[data-drag-segment]")) handle.addEventListener("dragstart",event=>{event.dataTransfer.setData("application/arcane-wheel-segment",handle.dataset.dragSegment);});
    for(const card of this.element.querySelectorAll(".aw-segment")) {
      card.addEventListener("dragover",event=>event.preventDefault());
      card.addEventListener("drop",event=>this.guard(async()=>{
        const source=event.dataTransfer.getData("application/arcane-wheel-segment");if(source==="") return;
        event.preventDefault();this.readForm();const [segment]=this.draft.segments.splice(Number(source),1);this.draft.segments.splice(Number(card.dataset.index),0,segment);this.dirty=true;await this.render({force:true});
      }));
    }
    for(const input of this.element.querySelectorAll("[data-item-drop]")) {
      input.addEventListener("dragover",event=>event.preventDefault());
      input.addEventListener("drop",event=>this.guard(async()=>{
        event.preventDefault();event.stopPropagation();const data=JSON.parse(event.dataTransfer.getData("text/plain"));
        const item=await fromUuid(data.uuid);requireThat(item?.documentName==="Item","ITEM","Bitte einen Gegenstand hierher ziehen.");
        input.value=item.uuid;input.dispatchEvent(new Event("input",{bubbles:true}));
      }));
    }
    await this._afterThemeRender();
  }
  async _afterThemeRender(){const canvas=this.element?.querySelector("canvas");if(canvas){const art=await loadThemeImages(this.draft.segments);if(canvas.isConnected)drawWheel(canvas,publicWheel(this.draft).segments,art);}}
  markDirty(){this.dirty=true;const status=this.element?.querySelector(".aw-draft-status");if(status)status.textContent="Ungespeicherter Entwurf";}
  placementName(p){const scene=game.scenes.get(p.sceneId),doc=p.kind==="token" ? scene?.tokens.get(p.documentId) : scene?.tiles.get(p.documentId);return doc ? p.kind==="token" ? `NPC: ${doc.name}` : `Tile ${doc.id}` : "Verknüpftes Objekt fehlt";}
  atPath(path) {return path.split(".").reduce((o,k)=>o[k],this.draft);}
  async save() {
    this.readForm();validateWheel(this.draft);
    this.record=await this.engine.edit(this.draft.id,this.draft,this.revision);
    // Public markers contain labels only; the GM-only definition remains authoritative.
    for(const p of this.record.config.placements) {
      const scene=game.scenes.get(p.sceneId),doc=p.kind==="token" ? scene?.tokens.get(p.documentId) : scene?.tiles.get(p.documentId);
      if(doc?.getFlag(ID,"placement")?.placementId===p.id) await doc.setFlag(ID,"placement",{wheelId:this.draft.id,placementId:p.id,kind:p.kind,name:p.name});
    }
    this.revision=this.record.state.revision;this.draft=clone(this.record.config);this.dirty=false;
    await this.render({force:true});
  }
  async fresh() {if(this.draft){this.record=await load(this.draft.id);this.draft=clone(this.record.config);this.revision=this.record.state.revision;}this.dirty=false;await this.render({force:true});}
  async savedRequired() {requireThat(!this.dirty,"DRAFT","Den Entwurf zuerst speichern oder neu laden.");}
  async command(cmd,data) {
    if(cmd==="reload") {if(this.dirty && !await this.confirm("Entwurf verwerfen und gespeicherten Stand laden?")) return;return this.fresh();}
    if(cmd==="new") {
      if(this.dirty && !await this.confirm("Ungespeicherten Entwurf verwerfen?")) return;
      const w=defaultWheel();await this.engine.queue.run(()=>createWheel(w));this.dirty=false;return this.choose(w.id);
    }
    if(cmd==="save") return this.save();
    if(cmd==="apply-json") {const w=migrateConfig(JSON.parse(this.element.querySelector(".aw-json").value));validateWheel(w);requireThat(w.id===this.draft.id,"CONFIG","Rad-ID darf nicht geändert werden.");this.draft=w;this.dirty=true;return this.render({force:true});}
    this.readForm();
    if(cmd==="equal-chances"){const active=this.draft.segments.filter(s=>s.enabled),values=percentages(active.map(()=>1));active.forEach((s,i)=>{s.chance=values[i];});this.markDirty();return this.render({force:true});}
    if(cmd==="balance-rest"){allocateRemaining(this.draft.segments,Number(data.index));this.markDirty();return this.render({force:true});}
    if(cmd==="theme-all" || cmd==="theme-mix"){
      for(const [i,s] of this.draft.segments.entries()){const t=cmd==="theme-mix" ? THEMES[i%THEMES.length] : THEMES.find(t=>t.id===data.theme);if(t){s.theme=t.id;s.color=t.color;}}
      this.markDirty();return this.render({force:true});
    }
    if(cmd==="pick-image"){
      const segment=this.draft.segments[Number(data.index)],wheelId=this.draft.id,segmentId=segment.id;
      const picker=new foundry.applications.apps.FilePicker({type:"image",current:segment.image,callback:path=>this.guard(async()=>{
        requireThat(this.draft?.id===wheelId,"DRAFT","Die Radauswahl wurde inzwischen geändert. Bitte das Bild beim gewünschten Rad erneut auswählen.");
        const s=this.draft.segments.find(s=>s.id===segmentId);requireThat(s,"DRAFT","Das Segment wurde inzwischen entfernt.");
        s.image=path;s.theme="custom";this.markDirty();await this.render({force:true});
      })});return picker.render({force:true});
    }
    if(cmd==="validate") {validateWheel(this.draft);this.element.querySelector(".aw-draft-status").textContent="Konfiguration geprüft · gültig. Dokument-UUIDs werden vor der Drehung geprüft.";return;}
    if(cmd==="add-segment") {this.draft.segments.push(defaultSegment(uid(),this.draft.segments.length));this.dirty=true;return this.render({force:true});}
    if(cmd==="remove-segment") {this.draft.segments.splice(Number(data.index),1);this.dirty=true;return this.render({force:true});}
    if(cmd==="add-action") {this.atPath(data.pathTarget).push(defaultAction());this.dirty=true;return this.render({force:true});}
    if(cmd==="remove-action") {this.atPath(data.pathTarget).splice(Number(data.index),1);this.dirty=true;return this.render({force:true});}
    if(cmd==="export") return downloadJSON(`arcane-wheels-${this.draft.id}-audit.json`,await load(this.draft.id));
    if(cmd==="import") return this.importConfig();
    if(cmd==="clone") {
      const w=clone(this.draft);w.id=uid();w.name+=" · Kopie";w.placements=[];
      await this.engine.queue.run(()=>createWheel(w));this.dirty=false;return this.choose(w.id);
    }
    if(cmd==="place" && this.dirty)await this.save();
    await this.savedRequired();assertAuthority();
    const id=this.draft.id;
    if(cmd==="place") {
      requireThat(canvas.scene,"SCENE","Zuerst eine Szene öffnen.");
      const selected=canvas.tokens.controlled.length===1 ? canvas.tokens.controlled[0].document.id : "";
      const tokens=canvas.scene.tokens.filter(t=>t.actor&&!t.getFlag(ID,"placement"));
      const options=await foundry.applications.api.DialogV2.input({window:{title:"Axon Wheel platzieren"},ok:{label:"Platzieren"},content:`<label>Name<input name="name" value="${e(this.draft.name)}"></label><label>Was möchtest du platzieren?<select name="kind"><option value="tile">Rad-Tile neu erstellen</option><option value="token">Vorhandenen NPC-Token mit dem Rad verknüpfen</option></select></label><label>NPC-Token (nur bei NPC-Verknüpfung)<select name="tokenId">${tokens.length ? tokens.map(t=>`<option value="${e(t.id)}" ${t.id===selected?"selected":""}>${e(t.name)} · ${e(t.actor.type)}</option>`).join("") : '<option value="">Kein unverknüpfter Token in dieser Szene</option>'}</select></label><label>Gewinnvorrat dieser Platzierung<select name="pool"><option value="shared">Gemeinsam mit allen gemeinsamen Kopien dieses Rads</option><option value="own">Eigener Vorrat nur für diese Platzierung</option></select></label><label>Tile-Durchmesser in Kästchen (nur Rad-Tile)<input type="number" name="size" value="3" min="0.1" step="any"></label><label>Tile-Höhe (nur Rad-Tile)<input name="elevation" type="number" value="0" step="any"></label><p>Ein Rad-Tile wird neu in der Bildschirmmitte erstellt. Bei NPCs wird kein neuer Charakter erzeugt: Wähle einen bereits in der Szene stehenden Token. Die Verknüpfung wird sofort gespeichert.</p>`});
      if(options) await addPlacement(this.engine,id,options);return this.fresh();
    }
    if(cmd==="remove-placement") {if(await this.confirm("Diese Platzierung entfernen? Das Modul-Tile wird gelöscht; NPC-Tokens bleiben bestehen.")) await removePlacement(this.engine,id,data.id);return this.fresh();}
    if(cmd==="locate-placement"){
      const p=this.draft.placements.find(p=>p.id===data.id),scene=game.scenes.get(p.sceneId);requireThat(scene,"SCENE","Szene wurde entfernt.");
      if(canvas.scene?.id!==scene.id)await scene.view();const doc=p.kind==="token" ? scene.tokens.get(p.documentId) : scene.tiles.get(p.documentId);requireThat(doc,"PLACEMENT","Das verknüpfte Objekt wurde entfernt.");
      const {centerFor}=await import("../foundry/context.js");await canvas.animatePan({...centerFor(doc),duration:350});return;
    }
    if(cmd==="reset-stock" || cmd==="reset-placement") {if(await this.confirm("Gewinnvorrat auffüllen? Ein gemeinsamer Vorrat betrifft alle angeschlossenen Platzierungen.")) await this.engine.reset(id,"stock",data.id);return this.fresh();}
    if(cmd==="reset-limits") {if(await this.confirm("Drehlimits und Abklingzeiten dieses Rads für alle Spieler zurücksetzen?")) await this.engine.reset(id,"limits");return this.fresh();}
    if(cmd==="approve") {await this.engine.approve(id,data.id);return this.fresh();}
    if(cmd==="deny") {if(await this.confirm("Gegenstandsvergabe ablehnen? Kosten und verbrauchter Gewinnvorrat bleiben protokolliert.")) await this.engine.deny(id,data.id);return this.fresh();}
    if(cmd==="resume") {await this.engine.resume(id,data.id);return this.fresh();}
    if(cmd==="close-failure") {
      const decision=await foundry.applications.api.DialogV2.input({window:{title:"Unterbrochene Drehung abschließen"},content:`<p>Zuerst Actor, Zahlung, Items und Makrofolgen prüfen. Der Vorgang wird geschlossen; es erfolgt keine automatische Erstattung und keine Freigabe des reservierten Gewinns. Etwaige Korrekturen muss der GM bewusst vornehmen.</p><label>Prüfnotiz<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label>`});
      if(decision) await this.engine.closeFailure(id,data.id,decision.reason);return this.fresh();
    }
    if(cmd==="resolve-macro") {if(await this.confirm("Makroergebnis geprüft? Es wird bei der Fortsetzung nicht erneut ausgeführt.")) await this.engine.resolveMacro(id,data.id,data.key);return this.fresh();}
    if(cmd==="delete") {
      if(!await this.confirm("Dieses Rad samt Audit endgültig löschen? Vorher exportieren. Platzierungen müssen zuerst entfernt werden.")) return;
      await this.engine.queue.run(async()=>{
        const r=await load(id);requireThat(!r.config.placements.length,"PLACEMENT","Zuerst alle Platzierungen entfernen.");
        requireThat(r.state.spins.every(s=>["complete","failed"].includes(s.status)),"RECOVERY","Zuerst offene Drehungen und Vergaben klären.");
        const doc=documentFor(id);await doc.delete();
        await game.settings.set(ID,"registry",{ids:game.settings.get(ID,"registry").ids.filter(x=>x!==doc.id)});
      });this.record=null;this.draft=null;return this.render({force:true});
    }
  }
  async _onClose(options){clearTimeout(this.previewTimer);await super._onClose(options);}
  confirm(content) {return foundry.applications.api.DialogV2.confirm({window:{title:"Axon Wheel"},content});}
  async importConfig() {
    const input=document.createElement("input");input.type="file";input.accept=".json,application/json";
    input.addEventListener("change",()=>this.guard(async()=>{
      const file=input.files[0];if(!file) return;requireThat(file.size<5000000,"SIZE","Datei ist zu groß.");
      const data=JSON.parse(await file.text()),w=migrateConfig(data.config ?? data);
      w.id=uid();w.placements=[];validateWheel(w);
      await this.engine.queue.run(()=>createWheel(w));this.dirty=false;await this.choose(w.id);
    }));input.click();
  }
}
