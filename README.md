# Axon´s Glücksrad

Von **re-quested Studio**. Konfigurierbare Glücksräder für deine Foundry-Welt.

Installierbares Foundry-VTT-Modul für **Foundry 14**, Version **0.5.0-alpha.8**. Zielumgebung: **Foundry 14.367 mit D&D5e 6.0.6**.

Das Modul enthält eine echte GM-geprüfte Auslosung mit persistenten Beständen, Actor-Zahlungen, Item-Vergabe und FX. Es benötigt weder socketlib noch Sequencer und installiert keine externen Laufzeitabhängigkeiten. Das erste Design ist **Magical Halloween**: kräftige Farben, leuchtende Runen und freundliche Geister.

**Teststand:** automatisierte Kern-, Adapter- und Registrierungstests bestehen. Eine lizenzierte, laufende Foundry-V14-Welt stand bei der Entwicklung nicht zur Verfügung. Die native Darstellung, Netzwerkabläufe mit zwei echten Clients und Spielsystembesonderheiten sind deshalb noch in einer Testwelt abzunehmen. Es ist bewusst eine Alpha; im Manifest wird keine erfolgte Live-Verifikation behauptet.

## Installation

In Foundry unter **Add-on-Module → Modul installieren → Manifest-URL** einfügen:

```text
https://raw.githubusercontent.com/axon-dystro/Axon-Wheel/main/module.json
```

Danach in der Welt **Axon´s Glücksrad** aktivieren. Als GM links das Rad-Symbol → **Räder verwalten** öffnen, alternativ **Strg+Umschalt+W**.

| Feld | Wert |
|---|---|
| Name | Axon´s Glücksrad |
| Publisher / Autor | re-quested Studio |
| Version | 0.5.0-alpha.8 |
| Paket-ID | arcane-wheels |
| Projektseite | https://github.com/axon-dystro/Axon-Wheel |
| Manifest für Updates | https://raw.githubusercontent.com/axon-dystro/Axon-Wheel/main/module.json |
| Manifest dieser Version | https://github.com/axon-dystro/Axon-Wheel/releases/download/v0.5.0-alpha.8/module.json |
| Download | https://github.com/axon-dystro/Axon-Wheel/releases/download/v0.5.0-alpha.8/axon-wheel-0.5.0-alpha.8.zip |
| README | https://github.com/axon-dystro/Axon-Wheel/blob/main/README.md |

Die interne Paket-ID bleibt aus Kompatibilitätsgründen `arcane-wheels`. Sie hält vorhandene Räder, Vorräte, Platzierungen und Einstellungen zugeordnet. Der Modulordner muss deshalb ebenfalls exakt `arcane-wheels` heißen.

### Manuelle Installation und Fehler „Invalid module“

Der Modulordner muss exakt `arcane-wheels` heißen. Die Datei muss direkt unter `Data/modules/arcane-wheels/module.json` liegen. Die Ordnernamen `Axon-Wheel`, `Axon-Wheel-main` und `Axon-Wheel-Asset-Free-main` sind für die Installation ungültig.

Foundry vollständig beenden. Eine Sicherung der Welt und der betroffenen Modulordner anlegen. Nur die gewünschte Variante in `Data/modules/arcane-wheels` ablegen; die andere Variante außerhalb von `Data/modules` aufbewahren. Bei einer zusätzlichen Unterebene den Ordner verwenden, der unmittelbar `module.json`, `scripts` und `styles` enthält. Anschließend Foundry neu starten.

Die ID in `module.json` bleibt `arcane-wheels`. Original und Asset-Free sind alternative Installationen mit derselben ID, keine zwei parallel ladbaren Module. Zum manuellen Herunterladen das versionierte Release-Paket verwenden, nicht GitHubs „Source code“-ZIP. Manifest-Installation und automatische Updates benötigen öffentlich erreichbare Dateien; private GitHub-Links funktionieren dafür ohne zusätzliche Authentifizierung nicht.

## Oberfläche in Alpha 6

Anthrazit, helle Typografie und ein dezenter Korall-Akzent. Radbibliothek, Navigation und Entwurfsstatus sind klar getrennt. Formulare passen sich der Fensterbreite an; Segmentkarten zeigen ihre Nummer, ihr Motiv und gut lesbare Felder. Die Spieloberfläche behält das Magical-Halloween-Rad. Spiellogik und Rechtsklick-Hotfix stammen aus Alpha 5.

## Änderungen nach dem ersten Praxistest

- Name in der Oberfläche: **Axon´s Glücksrad**. Interne Modul-ID und Speicherorte bleiben `arcane-wheels`, damit vorhandene Daten weiter zugeordnet werden.
- Großes, transparentes Rad direkt über der Karte, ohne Fensterrahmen oder Hintergrundkasten. Schließen über Kreuz/Escape; Radgröße über +/−.
- Sechs vorgefertigte Halloween-Bildmotive pro Segment: Kürbisse, Geister, Fledermäuse, Mondmagie, Kerzen und Spinnweben. Unter „Eigenes Bild“ öffnet „Bild auswählen / hochladen“ Foundrys echte Dateiauswahl inklusive Upload.
- Prozentchancen direkt bearbeiten; kein sichtbares Gewicht-Feld. Erschöpfte Gewinne werden weiterhin aus der aktuellen Auslosung entfernt; verbleibende Chancen werden entsprechend anteilig umgerechnet.
- Die linke Werkzeugleiste besitzt einen eigenen Rad-Eintrag. Platzierungen zeigen Art, Szene und verknüpften Token-/Tile-Namen; „In Szene zeigen“ zentriert darauf.
- Kosten-, Wartezeit- und Limittexte sind erklärt. Allgemeine Effekte wurden aus der Hauptnavigation entfernt und unter Erweitert zusammengefasst.
- Die vom Nutzer ausdrücklich bestätigte Zielumgebung ist Foundry **14.367**, D&D5e **6.0.6**. Die D&D5e-Währungsstruktur wurde am offiziellen Release-Quellcode geprüft.

### Update einer vorhandenen Installation

Modulordner `Data/modules/arcane-wheels` durch den neuen Ordner ersetzen, Foundry neu laden und alle GM-/Spielerclients mit Strg+F5 aktualisieren. **Vorhandene Räder nicht neu anlegen.** Definitionen aus Alpha 1 und 2 werden beim Laden in das aktuelle Format übernommen. Vorhandene Prozentwerte und Motive bleiben bestehen; alte relative Gewichte werden nur bei Alpha 1 umgerechnet. Die bisherige globale Chancenanzeige wird auf alle Segmente übertragen. Platzierungs-IDs, eigene/gemeinsame Vorräte, Limits, Verlauf und offene Gegenstandsvergaben bleiben bestehen. Die Migration wird mit der nächsten Änderung/Drehung gespeichert. Laufende historische Vorgänge behalten ihren eingefrorenen Gewinnkontext.

## Mini-Update Alpha 3

- Unter **Design → Beschriftung** Standardausrichtung und Standardgröße einstellen. Je Segment sind eigene Größen und „Links nach rechts“, „Oben nach unten (gedreht)“ oder „Entlang des Segments“ möglich. Lange Namen werden umgebrochen und passend verkleinert; die Textzeichnung wird zusätzlich am Segment begrenzt. Bei sehr vielen schmalen Segmenten bleibt die vollständige Namensliste unter „Gewinne ansehen“ verfügbar.
- **Gewinnchance im Rad anzeigen** und **Restvorrat im Rad anzeigen** sind je Segment unabhängig schaltbar, unter Segmente sowie Design. Die beiden Schalter für alle Segmente sind Sammelschalter; einzelne Ausnahmen bleiben danach einzeln änderbar.
- Das Rad und die Gewinnliste zeigen nur freigegebene Angaben: z. B. `20 %`, `Noch 5` oder `Vorrat ∞`. Nach einer Drehung werden Restmengen und die Chancen für die nächste Drehung aktualisiert.
- **Design → Kulisse und Beleuchtung:** lokale Abdunklung (0–90 %, Standard 65 %), Lichtschein und Kürbis-/Kerzendekoration. Beim Schließen verschwinden diese Elemente; es wird kein Szenendokument und kein Licht geändert. Geister erhalten einen weißen Schimmer.
- Das linke Rad-Symbol lässt sich mehrfach verwenden, auch nach dem Schließen. Es kehrt nach dem Öffnen zur Token-Auswahl zurück; der Tooltip trägt den ausgeschriebenen Modulnamen.
- Routinekarten werden im Chat verborgen, ebenso bisherige Protokollkarten nach erneutem Laden. Der authentifizierte Flüster-Dokumenttransport bleibt intern für Antworten und Wiederaufnahme erhalten. Explizit konfigurierte Chat-Effekte bleiben sichtbar. Erfolgsmeldungen erscheinen im Rad beziehungsweise im Editor statt als blaue Foundry-Informationen. Echte Fehler bleiben erkennbar.

## Erstes Rad

1. **Neues Rad**: sechs sofort spielbare Anzeigegewinne werden erstellt.
2. Unter **Segmente** Namen, Gewinnchancen in Prozent, Bildmotive und Vorräte festlegen. Die aktiven Segmente ergeben zusammen genau 100 %. Mit „Diese Chance behalten · übrige ausgleichen“ lässt sich eine feste Chance beibehalten und der Rest auf die anderen Gewinne verteilen. Leerer Vorrat bedeutet unbegrenzt. Für reale Gegenstände ein Item aus dem Verzeichnis oder Kompendium auf die Item-UUID ziehen.
3. **Pro Segment** genau eine Vergabeart wählen: nur anzeigen, automatisch ins Gewinnerinventar oder auf GM-Bestätigung warten. Ein Gewinn kopiert einen Item-Datensatz mitsamt dessen konfigurierter Menge und Effekten; bestehende Stapel werden nicht zusammengeführt.
4. Unter **Spielregeln** bei Bedarf Kosten und Limits einstellen. Vorgaben: kostenlos und ohne Drehlimit. In D&D5e kann die Münzsorte direkt als Gold-, Silber-, Kupfer-, Elektrum- oder Platinstücke ausgewählt werden. Technische Datenfelder sind nur für eigene Ressourcen unter „Erweitert“ nötig.
5. Unter **Platzierungen → Platzieren** ein neues Rad-Tile oder einen vorhandenen Token aus der Szenenliste wählen. Ein gültiger Entwurf wird zuvor gespeichert. Die NPC-Option erzeugt keinen neuen Actor: Sie verknüpft den ausgewählten, bereits in der Szene vorhandenen Token. Neue separate Zonen-Tiles werden nicht mehr angeboten; vorhandene bleiben kompatibel. Eigener/gemeinsamer Gewinnvorrat wird für **jede Platzierung separat** gewählt.
6. Tile/Zone erscheinen in der Bildschirmmitte und können mit Foundrys Tile-Werkzeug verschoben und skaliert werden. Bei NPC-Platzierungen bewegt sich der Interaktionspunkt mit dem Token.

Spieler und GMs wählen einen eigenen Charakter-Token und klicken mit der rechten Maustaste auf genau das gewünschte Rad-Tile oder den verknüpften NPC. Nach der Bestätigung öffnet sich dieses Rad. Erreichte Drehlimits oder die verbleibende Wartezeit werden stattdessen direkt erklärt. Linksklick, Alt+Klick, Umschalt+W und automatisches Öffnen beim Zoneneintritt sind deaktiviert. Ein verbundener GM ist für Vorschau und Drehung erforderlich.

## FX

Jeder Gewinn hat unter **Segmente** seine eigenen Effekte. Optionale allgemeine Effekte, die bei jeder Drehung laufen sollen (z. B. ein Startton), befinden sich unter **Erweitert**. Jede Aktion hat einen eigenen Zeitpunkt und ein eigenes Ziel. Vorgabe ist **nur Gewinner**. Weitere Ziele: ausgewählte Spieler, alle verbundenen Spieler/Szenentokens, GMs oder Tokens innerhalb eines konfigurierten Radius um die Platzierung.

Verfügbar sind Sternenregen, Tokenleuchten, Audiowiedergabe, Chatnachrichten, Kopieren eines ActiveEffects und Ausführen eines ausdrücklich konfigurierten GM-Makros. Ohne gültige benötigte Dokument-UUID wird eine Drehung vor dem Bezahlen abgelehnt.

- **Start:** vor der Radanimation.
- **Ergebnis:** nach Stillstand, zusammen mit Vergabe und Ergebnisanzeige.
- **Abschluss:** nach Übermittlung des Ergebnisses.

Chattext unterstützt `{winner}`, `{prize}` und `{wheel}`. Text wird als Text behandelt, nicht als ausführbares HTML. Spieler können Ton und Bewegung in ihren eigenen Moduleinstellungen reduzieren. Der Systemwunsch `prefers-reduced-motion` wird ebenfalls respektiert.

Makros laufen einmal als GM. Sie erhalten `actor` (Gewinner), `token` (Gewinnertoken) und `arcaneWheels` mit `spin`, `actorUuids`, `tokenUuids`, `userIds`. Zielauswahl ist damit explizit verfügbar; ein beliebiges Fremdmakro muss diese Parameter selbst verwenden. Makros sind für vertrauenswürdige GM-Automation gedacht.

## Betrieb

Unter **Betrieb** befinden sich aktuelle Vorräte, das Drehprotokoll, GM-Vergaben, Reset und Wiederaufnahme unterbrochener Vorgänge. **Neu laden** aktualisiert den gespeicherten Stand. Ein älterer Editorentwurf überschreibt keine zwischenzeitlichen Drehungen: dann erscheint ein Versionskonflikt.

Bestandsreset und Limitreset sind getrennt. Zeitgesteuerte Resets verwenden Foundrys Weltzeit; Abklingzeiten verwenden reale Sekunden. Gemeinsame Vorräte können mehrere Szenen desselben Rads verbinden. Die Gesamtzahl erlaubter Drehungen kann unabhängig vom Vorratsmodus radweit oder je Platzierung zählen.

Bei einer Unterbrechung bleibt die Reservierung erhalten. Der GM prüft den Verlauf und setzt den Vorgang fort. Zahlungen und erstellte Items/ActiveEffects tragen Vergabemarkierungen, damit eine verloren gegangene Antwort keine doppelte Aktion auslöst. Ein Makro mit unklarem Ergebnis wird **nicht** automatisch wiederholt. Der GM muss es prüfen und als erledigt markieren. Ein nicht wiederherstellbarer Vorgang kann mit Prüfnotiz abgeschlossen werden; dabei wird keine Erstattung geraten und kein Gewinn automatisch freigegeben.

## Entwicklungsstand und Grenzen

- Die vier verbindlich abrufbaren Konzeptentscheidungen sind umgesetzt. Der vollständige Wortlaut von V0.5 konnte nicht abgerufen werden. [Anforderungsabgleich](docs/requirements.md) trennt belegte Entscheidungen von technischen Festlegungen und fehlenden Details.
- Die Interaktionsreichweite wird horizontal zwischen den sichtbaren Flächen gemessen. Ein Token auf einem Rad-Tile hat Abstand 0; Höhenwerte werden dabei nicht zusätzlich eingerechnet. Wände werden nicht geprüft. FX-Radien bleiben eine eigene Zielauswahl. Die Anzeige des Rads verwendet gleich große Sektoren; die Auslosung verwendet die konfigurierten Prozentchancen.
- Ein zuständiger GM wird über `game.users.activeGM` gewählt. Dieselbe GM-Anmeldung darf für dieses Modul nicht gleichzeitig in mehreren steuernden Browserfenstern aktiv sein. Es gibt ohne Servererweiterung keine globale Datenbanktransaktion über Journal, Actor und Chat.
- Actorbesitzer können in Foundry ihre eigenen Daten bearbeiten. Das Modul ist kein Schutz gegen Spieler, die ihre eigene Währung oder ihre Vergabemarkierungen außerhalb des Moduls absichtlich verändern. Moduljournale nicht an Spieler zur Bearbeitung freigeben. „Chancen ausblenden“ ist eine UI-Einstellung, keine kryptografische Geheimhaltung von Weltdateien.
- Ein Rad protokolliert höchstens 2.000 Drehungen und höchstens 4 MB Daten. Danach exportieren und eine Radkopie verwenden. Historie und Vergabemarkierungen werden nicht heimlich gelöscht. Eine Kopie beginnt mit neuen Limits und frischen Beständen.
- Audit-Export enthält Konfiguration und Verlauf. Der Import übernimmt bewusst nur die Konfiguration als **neues** Rad ohne Platzierungen oder alte Zahlungsstände. Ein vollständiges Weltbackup erfolgt weiterhin mit Foundry.
- UI-Texte sind deutsch, auch als Ersatztexte bei englischer Foundry-Sprache. Andere Systeme können die grundlegende Item-Vergabe verwenden; Kosten und ActiveEffects müssen zu ihrem Datenmodell passen. Die tatsächliche Systemkompatibilität ist Teil der Abnahme.

## Entwicklung

Node 22+ und Python 3.10+ genügen; kein `npm install` erforderlich.

```sh
npm run check
npm test
git add . && git commit -m "Describe changes"
npm run build
```

Der Build erzeugt `dist/axon-wheel-0.5.0-alpha.8.zip`, `dist/module.json` und SHA-256-Prüfsummen. Das Installationsarchiv enthält nur die Laufzeitdateien und die Dokumentation. Quellcode, Tests und Werkzeuge liegen im Repository. Der Release-Workflow prüft und paketiert den Stand vor der Veröffentlichung.

- [Technische Spezifikation](docs/technical-spec.md)
- [Anforderungsabgleich](docs/requirements.md)
- [Tests und Live-Abnahme](docs/testing.md)
- [Changelog](CHANGELOG.md)

Öffentliche Makro-API:

```js
game.modules.get("arcane-wheels").api.openManager(); // GM
await game.modules.get("arcane-wheels").api.openPlacement("PLATZIERUNGS_ID");
```

Die Spiellogik vertraut keinen vom Spieler gelieferten Ergebnissen, Preisen, Gewichten, FX oder Actor-IDs. Spieleranfragen enthalten nur Vorgangsart, Rad-/Platzierungs-ID und Token-UUID.
