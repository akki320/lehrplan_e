# Schulinterner Lehrplan Englisch – Pflege-Website

Eine schlanke, werkzeugfreie Website für die Fachkonferenz Englisch, um die
schulinternen Lehrpläne übersichtlich darzustellen und zentral zu pflegen.

- **`index.html`** – öffentliche Übersichtsseite: aufklappbare Elemente für
  die allgemeinen Informationen (Rahmenbedingungen, fachdidaktische
  Grundsätze, Leistungsbewertung, Lehr-/Lernmittel, fachübergreifende
  Fragen, Qualitätssicherung) sowie für den Lehrplan jeder einzelnen
  Jahrgangsstufe mit ihren Unterrichtsvorhaben. Rein lesend, mit Such-/
  Filterfunktion und Druckansicht.
- **`admin.html`** – geschützter Bereich zum Bearbeiten aller Inhalte
  (Passwortschutz), inkl. Anlegen/Löschen/Verschieben von Jahrgangsstufen,
  Unterrichtsvorhaben und allgemeinen Informationsblöcken.

Die mitgelieferten Beispielinhalte stammen aus der offiziellen
Muster-Vorlage des Schulministeriums NRW für einen schulinternen Lehrplan
Englisch (Gymnasium G9, Fassung 31.01.2020, fiktives „Schiller-Gymnasium“)
und dienen nur als Startpunkt. Sie sollten im geschützten Bereich durch die
eigenen Inhalte der Fachkonferenz ersetzt werden.

## Nutzung

1. `index.html` direkt im Browser öffnen **oder** über GitHub Pages
   bereitstellen (Repository-Einstellungen → Pages → passenden Branch/Ordner
   wählen). Für den Login im geschützten Bereich wird ein http(s)-Kontext
   benötigt (siehe „Sicherheit“ unten) – GitHub Pages erfüllt das.
2. Über den Link „🔒 Geschützter Bereich“ gelangen Mitglieder der
   Fachkonferenz zur Bearbeitungsoberfläche.
3. **Voreingestelltes Passwort:** `englisch2026` – bitte nach dem ersten
   Login sofort unter „Allgemeine Angaben“ ändern.

## Inhalte bearbeiten

Im geschützten Bereich gibt es drei Bereiche in der linken Navigation:

- **Allgemeine Angaben** – Schulname, Fach, Schulform, Stand, Verantwortliche
  der Fachgruppe sowie Passwort ändern.
- **Allgemeine Informationen** – die sechs Info-Abschnitte der öffentlichen
  Seite; hinzufügen, umbenennen, umsortieren, löschen.
- **Jahrgangsstufen** – je Jahrgangsstufe die Liste der Unterrichtsvorhaben
  (Titel, Kürzel, Zeitbedarf, Kompetenzschwerpunkte, fachliche
  Konkretisierungen, Hinweise/Absprachen); Jahrgangsstufen und
  Unterrichtsvorhaben lassen sich hinzufügen, umsortieren und löschen.

Textfelder mit „Bearbeiten/Vorschau“-Reitern verstehen ein sehr einfaches
Formatierungsschema (kein HTML):

| Eingabe | Ergebnis |
|---|---|
| Leerzeile | neuer Absatz |
| `- Text` | Aufzählungspunkt |
| `### Text` | Zwischenüberschrift |
| `> Text` | hervorgehobener Hinweis |
| `**Text**` | **fett** |
| `*Text*` | *kursiv* |
| `\| Spalte 1 \| Spalte 2 \|` | Tabellenzeile (erste Zeile = Kopfzeile) |

Alle Eingaben werden beim Anzeigen automatisch escaped – es kann also kein
eigenes HTML/JavaScript eingeschleust werden, auch nicht versehentlich.

Änderungen werden laufend **lokal im Browser** gespeichert (`localStorage`),
damit beim Bearbeiten nichts verloren geht.

## Veröffentlichen

Diese Seite läuft komplett ohne Server/Datenbank (nur HTML/JS, z. B. über
GitHub Pages). Damit Änderungen aus dem geschützten Bereich für **alle**
Besucher:innen sichtbar werden, müssen sie einmal veröffentlicht werden:

1. Im geschützten Bereich oben rechts auf **„Daten exportieren“** klicken.
   Das lädt eine Datei `default-data.js` herunter.
2. Diese Datei die gleichnamige Datei im Repository-Hauptverzeichnis
   ersetzen lassen.
3. Änderung committen und pushen (bzw. im GitHub-Webinterface hochladen).
   Sobald die Seite (z. B. über GitHub Pages) neu ausgeliefert wird, sehen
   alle Besucher:innen die aktualisierten Inhalte.

Über **„Daten importieren“** lässt sich umgekehrt eine zuvor exportierte
`default-data.js`-Datei (oder reines JSON im gleichen Format) wieder in den
Editor laden – praktisch, um z. B. nach einem `git pull` mit dem aktuellen
Stand weiterzuarbeiten oder um zwischen Geräten zu wechseln.

**„Zurücksetzen“** verwirft alle lokal im Browser gespeicherten Änderungen
und stellt die zuletzt veröffentlichten/mitgelieferten Beispieldaten wieder
her.

## Sicherheit des geschützten Bereichs

Der Passwortschutz ist ein einfacher, rein clientseitiger Zugriffsschutz
(SHA-256-Hash-Vergleich per Web-Crypto-API) – er verhindert versehentliches
oder unbefugtes Bearbeiten am eigenen Gerät, ersetzt aber **kein** echtes
Server-Login. Da der Quellcode der Seite öffentlich einsehbar ist, sollte
er nicht als Schutz für wirklich vertrauliche Informationen verstanden
werden. Für ein internes Schul-Tool zur gemeinsamen Pflege eines an sich
einsehbaren Dokuments ist das ein angemessener, pragmatischer Kompromiss.
Web Crypto benötigt einen sicheren Kontext (http**s** oder z. B. GitHub
Pages) – beim Öffnen der Datei direkt vom Dateisystem (`file://`) kann der
Login je nach Browser fehlschlagen.

## Technik

- Reines HTML/CSS/JavaScript, keine Build-Tools, keine Abhängigkeiten von
  externen Diensten oder CDNs.
- `markdown.js` – kleiner, XSS-sicherer Renderer für das oben beschriebene
  Formatierungsschema (wird von öffentlicher Seite und Admin-Vorschau
  gemeinsam genutzt).
- `store.js` – gemeinsame Datenhaltung (laden/speichern/export/import,
  Passwort-Hashing) für beide Seiten.
- `default-data.js` – mitgelieferte Beispieldaten; wird beim Veröffentlichen
  ersetzt (siehe oben).
- `public.js` / `admin.js` – Rendering- und Interaktionslogik der jeweiligen
  Seite.
- Responsives Layout (Desktop/Tablet/Smartphone), Tastaturbedienbarkeit,
  Druckansicht, `noindex`-Metatag auf beiden Seiten.

## Hinweis zur Erstellung

Die mitgelieferten Beispielinhalte basieren auf der von der hochgeladenen
Word-Datei bereitgestellten offiziellen NRW-Musterhandreichung für einen
schulinternen Lehrplan Englisch. Struktur, Design und Programmierung der
Website wurden mit Unterstützung eines KI-Sprachmodells (Claude, Anthropic)
erstellt; die inhaltliche und didaktische Verantwortung für die
tatsächlichen schulinternen Lehrpläne liegt bei der Fachkonferenz.
