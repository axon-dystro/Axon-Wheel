# Alpha 5 Hotfix (24.10.2026)

88 Tests bestehen. Die Rechtsklick-Regression bildet nun eine PIXI-Anwendung mit view und ohne canvas ab; zusätzlich contextmenu ohne vorangegangenes pointerup und die Vermeidung doppelter Öffnungen. Kein Live-Test auf Foundry 14.367. Beim nächsten Test Charakter-Token auswählen und verknüpften NPC oder Rad-Tile rechts anklicken.

# Alpha 4 Ergänzung (24.10.2026)

88 automatisierte Tests bestehen. Neue Regressionen prüfen Rechtsklick-Zielwahl, ignorierten Linksklick und Rechtsziehbewegung, Listener-Abbau, Wartezeit mit Sekundenaufrundung, Person-/Charakterlimit und autoritativen Cooldown im Ergebnis. Shift+W ist nicht registriert.

Live-Abnahme weiterhin erforderlich: Spieler ohne NPC-Besitz klickt NPC und Tile bei aktiver Token-Ebene rechts an; Abfrage öffnet ausschließlich dieses Rad; normale Rechtsklick-Funktionen außerhalb der Platzierung bleiben erhalten. Anschließend Einmal-Limit und 80-Sekunden-Wartezeit testen. Easter Eggs anklicken und per Enter auslösen. Verwaltung bei verschiedenen Fenstergrößen prüfen.

# Tests und Abnahme

Vorheriger Teststand: 23.10.2026 (Alpha 3). Die Ergänzung oben beschreibt Alpha 4.

## Automatisierbar in dieser Umgebung

`npm run check` prüft Manifest, Versionsgleichheit, eingebundene Dateien, lokale Importe, JSON und JavaScript-Syntax. `npm test` verwendet Nodes eingebauten Test-Runner ohne Paketinstallation.

Die Tests führen das echte Modell, die echte Engine, Adapterfunktionen und den tatsächlichen Moduleinstieg aus. Foundry-Dokumente und die Clientregistrierung werden dafür durch kontrollierte Verträge ersetzt; sie sind **keine echte Foundry-Welt**.

Abgedeckt sind:

- Defaultdesign, drei Vergabemodi, Standardziel Gewinner und zulässiges Schema.
- Gewichtsgrenzen, ungültige/negative Werte, identische IDs, Prototype-Pfade und ungültige Dateipfade.
- Eigene/gemeinsame Vorräte, Erschöpfung, Weltzeitreset und unabhängige Limitresets.
- Exakte Grenzen der gewichteten Auswahl und korrekte Zielposition des Radzeigers.
- Gleichzeitige Anfragen auf den letzten Gewinn sowie Ablauf alter Warteschlangenanfragen vor Reservierung.
- Vorschau ohne Zahlung/Reservierung und Abweisung fremder Tokens vor Mutation.
- Automatische Vergabe, ausstehende GM-Vergabe, Bestätigung und Ablehnung.
- Verlust einer Bestätigung nach Reservierung, Zahlung, Item-Erstellung, Animation und Ergebnisnachricht.
- Zahlungsabzug und Markierung im selben tatsächlichen Adapteraufruf; erneuter Aufruf ohne zweite Belastung.
- Item- und ActiveEffect-Idempotenz nach verlorenem Erstellungsergebnis.
- Unklares Makroergebnis, manuelle Klärung und Lifecycle-Reihenfolge.
- Änderungen am Bestand und Versionskonflikte zwischen Editor und Drehung.
- Actorbesitz, Szenenzugehörigkeit, Höhe, Radiusziele und Deduplication verknüpfter Actors.
- Gefälschte Payload-Identität, gefälschte GM-Ergebnisse und Spielerjournale außerhalb der GM-Registry.
- Vermeidung versehentlich öffentlicher FX-Nachrichten bei leerer Empfängerliste.
- V14-Einstellungen, GM-Menü, korrekte Modifier-Schreibweise und öffentliche API.
- Manueller Abschluss eines Fehlers mit Prüfnotiz ohne geratenen Refund.

Das Buildwerkzeug erstellt ein deterministisches ZIP, prüft dessen Integrität und Paketstruktur und schreibt SHA-256-Prüfsummen.

## Nicht durchgeführt

Keine lizenzierte Foundry-V14-Installation beziehungsweise laufende Welt war hier zugänglich. Deshalb wurden keine echten Foundry-Datenbanken oder Multiplayer-Verbindungen verändert und kein Live-Erfolg behauptet.

Ein zusätzlicher Browserlauf wurde versucht. Playwright war verfügbar, Chromium jedoch nicht installiert. Der Browserdownload lieferte statt eines ZIP nur eine gesperrte HTML-Antwort. Es wurde deshalb **keine visuelle Browserabnahme** durchgeführt. Die Oberfläche ist implementiert, ihre native Darstellung bleibt Teil des folgenden Abnahmeplans.

## Live-Abnahme vor Verwendung in einer Kampagne

Zunächst eine separate Testwelt/Backup verwenden. Ein GM- und mindestens ein Spielerclient mit unterschiedlichen Accounts verbinden. Nicht denselben GM-Account doppelt zur Steuerung öffnen.

| Test | Vorgehen | Erwartung |
|---|---|---|
| Installation | ZIP korrekt nach Data/modules entpacken, Modul aktivieren, Konsole öffnen | Modul wird erkannt; keine Import-/Manifestfehler |
| Editor | GM-Menü und Strg+Umschalt+W; alle sieben Bereiche öffnen | Native V2-Fenster, zugängliche Formulare, keine Layoutblockade |
| Persistenz | Neues Rad konfigurieren, Welt neu starten | Rad, Segmente, Regeln und Platzierungen erhalten |
| Rad-Tile | Platzieren, verschieben, skalieren; Spieler eigenen Token auswählen | Öffnen per Rechtsklick und Bestätigung; Linksklick / Shift+W ohne Wirkung |
| NPC | NPC auswählen, Platzierung anlegen, NPC bewegen | Öffnungspunkt folgt NPC; NPC bleibt nach Entfernen erhalten |
| Zone | Spieler von außen nach innen bewegen | Fenster öffnet; keine automatische Drehung |
| Zugriff | Fremden Token, andere Szene, verborgenen Token/Tile und zu großen Abstand verwenden | Ablehnung vor Reservierung/Zahlung |
| Multi-Level | Rad und Spieler auf verschiedene V14-Levels/Höhen setzen | Zulässige Distanz und tatsächliche Sichtbarkeit prüfen; unpassende Anzeige dokumentieren |
| Prozentchancen | Zwei Segmente: 0 % und 100 %; anschließend 25 % / 75 % | Summe 100 % erforderlich; 0-%-Segment gewinnt nie; Zeiger und Ergebnisanzeige stimmen überein |
| Vorräte | Einzelgewinn stock=1; zwei Spieler zeitnah drehen lassen | Einmaliger Verbrauch; zweite Anfrage lehnt ab oder zieht einen anderen verfügbaren Gewinn |
| Pools | Zwei gemeinsame und eine eigene Platzierung in zwei Szenen | Gemeinsame teilen Bestand; eigene ist unabhängig |
| Anzeigen | Item-UUID setzen, Vergabe=display | Gewinn erscheint, Inventar bleibt gleich |
| Automatisch | Testitem per Drag&Drop hinzufügen; automatische Vergabe | Ein Item-Datensatz mit ursprünglicher Menge im richtigen Actor; auch unlinked/Synthetic Actor prüfen |
| Bestätigung | Vergabe=confirm; GM-Editor neu laden | Persistenter Vergabewunsch; Genehmigung einmal; Ablehnung ohne automatische Erstattung |
| Kosten | 2 Einheiten auf numerischem Testwährungsfeld; Kontostand vorher/nachher vergleichen | Genau 2 abgezogen; mangels Guthaben kein Gewinnverbrauch |
| Cooldown/Limits | 10 Sekunden und max.2; Identität Actor/Account testen | Passende Ablehnung; Modus pro Rad/Platzierung korrekt |
| Reset | Bestände und Limits getrennt manuell zurücksetzen; Weltzeit gezielt erhöhen | Nur konfigurierte Daten zurückgesetzt; keine unerwartete Realzeit-Rücksetzung |
| FX-Ziele | Jede FX einmal Gewinner, bestimmter Spieler und Radius | Nur adressierte Clients/Tokens betroffen |
| Audio | Bekannte OGG-Datei setzen; einen Client stumm schalten | Ton nur auf ungestummten adressierten Clients; Browser-Audiofreigabe beachten |
| Bewegung | Bewegungen reduzieren einschalten | Kein Sternenregen/Leuchten, Rad zeigt Ergebnis ohne Rotation |
| ActiveEffect | Geeigneten Systemeffekt konfigurieren, zwei verknüpfte Tokens im Radius | Ein Effekt je Actor; konkrete Systemwirkung prüfen |
| Makro | Einfaches vertrauenswürdiges Testmakro mit Ziel-Logging | GM-Ausführung einmal zum richtigen Zeitpunkt, UUID-Ziele korrekt |
| Wiederaufnahme | GM während Drehung schließen, später neu anmelden | Offener Vorgang im Betrieb; keine zweite Zahlung/Item-Kopie bei Fortsetzung |
| GM-Wechsel | Zwei unterschiedliche GMs, bisherigen aktiven GM abmelden | Neuer zuständiger GM kann nach Prüfung fortsetzen; kein paralleler Actorzugriff |
| Export/Import | Audit exportieren, als neue Konfiguration importieren | Konfiguration vorhanden, neue ID, keine alten Platzierungen/Belastungen |
| Paket | ZIP-Prüfsumme vergleichen | Identische SHA-256-Summe |

Erst nach dieser Abnahme kann ein konkreter Foundry-Build als `compatibility.verified` eingetragen werden. Die Version soll dann passend angehoben und das Paket neu gebaut werden.


## Zusätzliche Abnahme Alpha 2

- Zielkonfiguration der Vertragstests: Foundry 14.367 und D&D5e 6.0.6; die Währungsvorlage des offiziellen D&D5e-Releases wurde zusätzlich gelesen.
- Regressionen: Flächenabstand 0 bei Überlappung/auf dem Tile, gedrehte Flächen, Entfernung außerhalb der Reichweite, unveränderte Interaktion bei anderer Token-Höhe, direkte Prozentwerte und exakte 100-%-Rundung, feste Chance plus Ausgleich des Rests.
- Migration: alte relative Verteilungen werden übernommen; Vorräte, Limits, historische Spins und offene Vergaben bleiben unverändert.
- Oberfläche: Werkzeugleisten-Record und GM-Sichtbarkeit getestet; sichtbare Segment-/Regeltexte sowie Theme-Asset-Dateien geprüft.
- Die tatsächliche `drawWheel`-Funktion wurde mit den sechs SVG-Dateien über einen nativen Canvas-Renderer ausgeführt und das gerenderte Bild visuell geprüft. Das ist keine Browser-/Foundry-Live-Abnahme.
- Zusätzlich in der Testwelt prüfen: linkes Rad-Symbol, freie Vollbildanzeige ohne Rahmen, Escape und Zoom, Bilderauswahl inklusive echtem Datei-Upload, benannte NPC-Auswahl, „In Szene zeigen“, Erhalt existierender Räder nach Update.


## Zusätzliche Abnahme Alpha 3

Automatisiert: 85 Tests bestanden. Hinzugekommen sind geometrische Textbegrenzung für alle drei Richtungen und unterschiedliche Segmentzahlen, frei gewählte Schriftgrößen, versteckte und eingeblendete Metadaten einschließlich 0/∞, Schema-2-Migration mit unveränderten Vorräten/Limits/Altvergaben, neue Editorfelder, wiederholtes Werkzeugleisten-Öffnen sowie stumme Routinekarten bei weiterhin sichtbaren ausdrücklichen Chat-Effekten. Die Engine prüft getrennte Projektionen vor und nach dem Bestandsverbrauch.

Die echte Canvas-Zeichenfunktion wurde erneut mit dem nativen Canvas-Renderer und den lokalen SVGs ausgeführt und das Ergebnis visuell geprüft. Die Kürbis-/Kerzendekoration wurde dabei korrigiert. Ein zusammengesetztes Bild diente nur der internen Gestaltungskontrolle; es ist kein Foundry-Screenshot und keine Browserabnahme.

In Foundry 14.367 / D&D5e 6.0.6 zusätzlich prüfen:

1. Vorhandene Alpha-2-Welt öffnen: IDs, Token-/Tile-Verknüpfungen, Restbestände, Limits und offene Vergaben erhalten.
2. Linkes Rad-Symbol öffnen, Fenster schließen, mindestens dreimal wiederholen; auch den Spielerweg und einen abgewiesenen Öffnungsversuch prüfen.
3. Design: horizontale und vertikale Schrift setzen, einzelne Größen z. B. 24/48/64 vergleichen; lange Wörter und reduzierte Radgröße prüfen.
4. Ein Segment mit 20 % und Vorrat 5 konfigurieren. Chance und Restmenge einzeln ein-/ausschalten, speichern und wieder öffnen. Rad und Gewinnliste müssen dieselben freigegebenen Werte zeigen.
5. Nach Gewinn dieses Segments `Noch 4`; nach dem letzten Exemplar `Noch 0`, 0 % und Verfügbarkeit aus. Andere verfügbare Chancen passen sich an. Ein unbegrenztes Segment zeigt ∞.
6. Sammelschalter unter Design: alle ein/aus; danach ein einzelnes Segment abweichend schalten. Vorschau folgt, Änderungen bleiben nach Tabwechsel erhalten.
7. Spieler A öffnet Rad: nur bei A ist die Kulisse dunkler. Spieler B bleibt unverändert. Nach Schließen ist As Ansicht wieder wie zuvor. Dimmer 0 schaltet die Abdunklung vollständig aus; Szenenwerte bleiben gleich.
8. Routinekarten und blaue Erfolgshinweise fehlen. Ein bewusst angelegter Chat-Effekt erscheint für sein konfiguriertes Ziel. Alte Routinekarten sind nach Client-Neuladen ebenfalls verborgen.
9. Kleine Bildschirmhöhe, Hotbar, vergrößertes Rad, Escape, Fokus, Ton aus und Bewegungsreduktion prüfen.

Visuelle Browser-Abnahme hier nicht ausgeführt: Browser-Binary fehlt; Downloadversuch lieferte kein gültiges Archiv. Die neue Verwaltungsdarstellung muss daher zusätzlich in Foundry visuell geprüft werden.
