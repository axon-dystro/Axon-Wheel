## 0.5.0-alpha.9 — 28.10.2026

- Neues Paket der Originalfassung mit Halloween-Grafiken und drei unterschiedlichen Geisterdialogen.
- Aktualisierte Installationsanleitung: Ordner und technische Modul-ID müssen arcane-wheels heißen.
- Versionierter Download und Manifest auf Alpha 9 aktualisiert.
- Keine Änderung an Klickverhalten oder Spiellogik; vollständige Live-Abnahme weiterhin ausstehend.

## 0.5.0-alpha.8 — 28.10.2026

- Drei unterschiedliche Geister: „Buuuh!“, „Habt ihr PandaMaru gesehen …?“ und ein Werbegeist.
- Werbeadresse re-quested.de steht vollständig und ohne Zeilenumbruch unter dem Satz.
- Sprechblasenbreite und Randabstand berücksichtigen die tatsächliche Größe.

## 0.5.0-alpha.7 — 28.10.2026

- Axon´s Glücksrad; created by re-quested Studio.
- Verwaltung mit neuer Markenleiste, Radkarten, responsiven Formularen und umbrechender Navigation.
- Verwaltungsstile im Hauptstylesheet gebündelt, damit keine zweite CSS-Datei fehlen kann.
- Geister-Sprechblasen: „Hol dein eigenes Modul auf re-quested.de“.
- Spiellogik und gespeicherte Daten bleiben kompatibel.

## 0.5.0-alpha.6 — 26.10.2026

- Name: **Axon Wheel – re-Quested Glücksrad**, Autor / Publisher **re-Quested / Axon**.
- Verwaltung neu gestaltet: Anthrazit, helle Typografie, Korall-Akzent, Radbibliothek, klare Navigation und strukturierte Segmentkarten.
- Responsive Felder und schmale Fenster, sichtbarer Entwurfsstatus und Speicherbereich; Manager-Stile isoliert vom Spieler-Rad.
- Spiellogik, Datenformat, Modul-ID und Rechtsklick-Hotfix bleiben kompatibel mit Alpha 5.
- GitHub-Manifest, versioniertes Downloadpaket und Release-Workflow ergänzt.
- Weiterhin Alpha: keine vollständige Live-Abnahme in einer lizenzierten Foundry-Welt.

## 0.5.0-alpha.5 — 24.10.2026

- Rechtsklick-Hotfix: PIXI-Zeichenfläche über view, canvas oder #board anbinden; fehlende Fläche erzeugt eine nachvollziehbare Konsolenmeldung.
- Kontextmenü-Ereignis öffnet die Radabfrage auch ohne pointerup. Doppelte Öffnung bei kombiniertem pointerup/contextmenu wird unterdrückt.
- Wiederanbindung bei Szenenwechsel und Bereitschaft; Regressionstest deckt view ohne canvas, Kontextmenü ohne Pointer-Ereignisse und Listener-Abbau ab.
- 88 automatisierte Tests; Bestätigung in Foundry 14.367 weiterhin ausstehend.

## 0.5.0-alpha.4 — 24.10.2026

- Verwaltung: neutrale Anthrazit-/Graupalette mit dezenten Goldakzenten nach Bildreferenz, größere Felder, responsive Formularraster, umbrechende Beschriftungen und Buttons.
- Öffnen ausschließlich gezielt über Rechtsklick auf Rad-Tile oder verknüpften NPC mit Bestätigung. Entfernt: Spieler-Hotkey Shift+W, nächstes Rad, Linksklick und automatischer Zoneneintritt. GM-Verwaltung bleibt erreichbar.
- Vorabfrage zeigt Drehlimit pro Person/Charakter und verbleibende Sekunden. Countdown im geöffneten Rad; GM prüft jede Drehung weiterhin verbindlich.
- Anklickbare, auch per Tastatur bedienbare Geister und Kürbisse mit Sprechblasen; kleiner Geist: Made by Axon · Discord: @AxonCS.
- Fix: Ergebnisansicht übernimmt Beginn der neuen Wartezeit korrekt.
- 88 automatisierte Tests; kein Live-Nachweis für Foundry 14.367 / D&D5e 6.0.6.

# Changelog


## 0.5.0-alpha.3 — 23.10.2026

- Sichtbarer Modulname überall auf **Axon´s Glücksrad** korrigiert; interne IDs und vorhandene Weltdaten bleiben zugeordnet.
- Je Segment einstellbare Schriftgröße und Ausrichtung: radial, horizontal oder von oben nach unten gedreht. Automatischer Umbruch und gemessene Schriftverkleinerung halten Namen und Metadaten im Segment.
- Chancen und verbleibende Gewinne einzeln im Rad sowie in der Gewinnliste einblendbar; Sammelschalter und Live-Vorschau unter Design. Nach Verbrauch werden Bestand und nächste Gewinnchancen aktualisiert.
- Lokal gedimmter Hintergrund mit einstellbarer Stärke, Lichtschein, weißem Geisterleuchten und Kürbis-/Kerzenkulisse. Keine Änderung an Szenenlicht, Tokens oder AmbientLights.
- Wiederholtes Öffnen über das linke Rad-Symbol repariert; ausgeschriebener Tooltip statt AW.Title sowie deutsche Ersatztexte bei englischer Foundry-Sprache.
- Routinekarten im Chat verborgen; explizite Chat-Effekte bleiben sichtbar. Blaue Erfolgshinweise durch Anzeige im Rad/Editor ersetzt.
- Schema-3-Migration übernimmt bestehende Chance-Sichtbarkeit und erhält Laufzeitdaten einschließlich offener Altvergaben.
- Eine Installations-ZIP enthält Laufzeitdateien und Git-Quellstand. 85 automatisierte Tests; Canvas-/SVG-Darstellung zusätzlich visuell geprüft. Foundry-Liveabnahme weiterhin offen.

## 0.5.0-alpha.2 — 23.10.2026

- Zielumgebung präzisiert: Foundry 14.367 mit D&D5e 6.0.6; damaliger sichtbarer Produktname Aktionsglücksrad.
- Direkter eigener Zugang in der linken Werkzeugleiste.
- Interaktionsreichweite auf horizontalen Flächenabstand geändert; direkt auf einem Rad-Tile ist der Abstand 0. Fehlermeldungen nennen gemessenen und erlaubten Abstand.
- Direkte Prozentchancen statt sichtbarer Gewichte; exakte 100-%-Validierung, Gleichverteilung und Ausgleich unter Beibehaltung eines Segmentwerts.
- Sechs originale illustrierte Halloween-Motive sowie eigene Segmentbilder über Foundrys Dateiauswahl/Upload.
- Große transparente Anzeige direkt über der Karte mit schwebenden Geistern, frei stehendem Drehknopf, Escape und Zoom; Sternenregen beibehalten.
- Verständliche D&D5e-Münzauswahl und Erklärungen zu Wartezeit und gemeinsamen/separaten Limits; technische Anbindung und allgemeine Effekte unter Erweitert.
- Eindeutige Platzierungsarten, NPC-Auswahl aus vorhandenen Szenentokens und „In Szene zeigen“. Neue Zone-Option entfernt, existierende Zonen bleiben lesbar.
- Schema-1-Migration zu Schema 2 mit Beibehaltung von Rad-/Platzierungs-IDs, Vorräten, Limits, Audit und offenen Vergaben.

## 0.5.0-alpha.1 — 23.10.2026

- Erstimplementierung für Foundry V14 mit nativem ApplicationV2-GM-Editor und Spielerfenster.
- Magical Halloween als erstes und einziges Standarddesign: frei konfigurierbare Segmentfarben, Runen und freundlicher Geist.
- Gewichtete GM-Auslosung mit endlichen/unendlichen Beständen, eigenen/gemeinsamen Vorräten pro Platzierung und getrennten Reset-/Limitregeln.
- Drei Gegenstandsmodi je Segment: Anzeige, automatische Actor-Item-Kopie und persistente GM-Bestätigung.
- Pro Aktion individuelle Ziele für Rad- und Gewinn-FX; Chat, Audio, Sternenregen, Tokenleuchten, ActiveEffects und GM-Makros.
- Native Rad-/Zonen-Tiles und NPC-Token-Verknüpfungen; Klick, konfigurierbare Tastenkürzel und Zoneneintritt.
- Authentifizierte Dokumentereignisse, GM-Registry, serverseitig zugeordnete Erstelleridentität und GM-seitige Besitz-/Reichweitenprüfung.
- Persistente Reservierungen, Zahlungs-/Vergabemarkierungen, Audit und Wiederaufnahme einschließlich manueller Makroklärung.
- Import/Kopie/Export, Versionskonflikte statt stiller Überschreibungen und dokumentierte Fehlerabwicklung.
- Automatisierte Kern-/Adapter-/Starttests, Manifest-/Syntax-/Ressourcenprüfung, reproduzierbares ZIP und GitHub-Actions-Workflow.
- Quellenlage und nicht abrufbare Konzeptdetails ausdrücklich dokumentiert. Native Foundry-/Multiplayer-/Browserabnahme noch offen; keine behauptete Live-Verifikation.
