# FormuleProf

**Dein persönlicher Wegweiser durch den Vorbereitungsdienst**

FormuleProf zeigt Lehramtsanwärterinnen und Lehramtsanwärtern ihren individuellen Weg
durch den Vorbereitungsdienst als übersichtliche Strecke – „deine Linie“ – und ist
zugleich ein **persönlicher Wegweiser, der über die gesamte Ausbildung hinweg weiter
befüllt wird**. Die Rennstreckenmetapher dient ausschliesslich der Orientierung: Es gibt
**keine Ranglisten, keine Spielpunkte, keine Geschwindigkeitsanzeigen und keinen
Vergleich zwischen Personen**.

Die App beantwortet täglich vier Fragen:

1. Wo befinde ich mich gerade?
2. Was ist jetzt wirklich wichtig?
3. Was kommt als Nächstes?
4. Welche absehbare Herausforderung sollte ich frühzeitig vorbereiten?

Dazu kommt eine fünfte, die den Wegweiser trägt: **Was gehört als Nächstes in meinen
Bestand?** Denn aus den eigenen Einträgen entstehen Struktur und Priorisierung: Wer
Unterrichtseinsatz, Ausbildungsstunden, Unterlagen und Prüfungstermine festhält,
bekommt dazu passende Hinweise – und hat beim Ausbildungsgespräch die Belege beisammen.

## Der Wegweiser

Unter **Wegweiser** liegen sieben Bereiche, die Schritt für Schritt wachsen:

| Bereich | Inhalt |
| --- | --- |
| **Unterrichtseinsatz** | Wochenstunden für Hospitation (H), angeleiteten (aU) und selbstständigen Unterricht (sU), abgeglichen mit den Soll-Korridoren der Vorlage. Ferienwochen zählen nicht als Unterrichtswochen. |
| **Ausbildungsstunden** | Nachweis der Veranstaltungen am Studienseminar in Stunden à 60 Minuten mit Vergleich zum Mindestumfang und zum zeitlichen Ausbildungsanteil. |
| **Unterlagen** | Formulare und Unterlagen je Termin. Die Vorlage schlägt aus ihren Formularsätzen vor, übernommen wird nur, was ausgewählt wird. |
| **Ansprechpersonen** | Fachleitungen, Ausbildungslehrkräfte, Mentorin oder Mentor, Schulleitung, Seminarleitung, Regionalstelle, Schulamt, Prüfungsamt, Personalrat. |
| **Prüfungsfahrplan** | Ablaufform und die beiden Prüfungstage. Daraus berechnet FormuleProf Themenbekanntgabe, Abgabe der Entwürfe und den letzten Unterrichtstag – Werktage ohne Samstage. |
| **Notenübersicht** | Eigene Punktzahlen und die Gesamtpunktzahl nach der Gewichtung der Vorlage, mit Rundungsregel und Hinweis auf das Nichtbestehen. |
| **Rahmen und Quellen** | Zuständigkeiten, Dauer, Unterrichtsverpflichtung, Lehrproben, Beurteilungen, Prüfungsablauf, Wiederholung – jeweils mit Quellenangabe. |

Der Stand jedes Bereichs erscheint im Cockpit unter „Was gehört in deinen Wegweiser?“.
Aus den Einträgen entstehen zusätzliche Hinweise in der Vorschau auf Herausforderungen,
etwa bei Abweichungen vom Soll-Korridor, bei einem lückenhaften Stundennachweis, bei
fehlenden Unterlagen zu einem anstehenden Termin oder vor einer Prüfungsfrist.

Auf der **Strecke** lassen sich jederzeit **eigene Termine** aufnehmen – etwa eine
Zusatzhospitation oder ein vereinbartes Gespräch. Sie bleiben bei jeder Neuberechnung
und auch bei einem Wechsel der Vorlage unverändert erhalten.

Die **Druckansicht** fasst Strecke, Unterrichtseinsatz, Ausbildungsstunden, Unterlagen
und Prüfungsfahrplan zusammen – als Vorbereitung für Ausbildungsgespräche. Reflexionen
sind nie enthalten, die Notenübersicht nur auf ausdrücklichen Wunsch.

## Zweck und Grundsätze

- **Vollständig lokal.** Kein Benutzerkonto, kein Backend, keine Cloud, keine externe KI.
  Alle Angaben liegen in der IndexedDB des Browsers auf dem eigenen Gerät.
- **Offlinefähig.** Nach dem ersten Aufruf funktioniert die App ohne Netzverbindung und
  lässt sich als PWA installieren.
- **Barrierearm.** Vollständig per Tastatur bedienbar, helle und dunkle Darstellung,
  ausreichende Kontraste, Beachtung von `prefers-reduced-motion`.
- **Deutsche Formate.** Datums- und Zahlenangaben durchgehend im deutschen Format.
- **Privat.** Reflexionen aus dem Boxenstopp bleiben lokal und sind nie Teil eines
  automatischen Exports.

## Installation

Voraussetzung ist Node.js ab Version 20.

```bash
npm install
```

## Start im Entwicklungsmodus

```bash
npm run dev
```

Die App ist anschliessend unter der angezeigten Adresse erreichbar (Standard:
`http://localhost:5173`). Der Service Worker ist im Entwicklungsmodus bewusst
deaktiviert.

## Produktionsbuild

```bash
npm run build      # Typprüfung, Build und Erzeugung des Service Workers
npm run preview    # Ergebnis lokal ausliefern
```

Der Build erzeugt `dist/`. Ein anschliessender Schritt schreibt `dist/sw.js` mit der
Liste aller Dateien, die für den Offlinebetrieb lokal vorgehalten werden.

Weitere Skripte:

```bash
npm test           # Automatisierte Tests (Vitest)
npm run typecheck  # Nur Typprüfung
npm run icons      # App-Symbole neu erzeugen
```

## Lokale Datenspeicherung

Alle Daten liegen in der IndexedDB-Datenbank `formuleprof` mit den Bereichen
`meta` (Profil, Einstellungen, Prüfungsfahrplan und Notenübersicht), `templates`,
`milestones`, `goals`, `reflections`, `unterrichtswochen`, `ausbildungsstunden`,
`unterlagen` und `kontakte`. Der Zugriff erfolgt ausschliesslich über die Serviceschicht
(`src/data/storage.ts` und `src/data/repository.ts`); die Oberfläche greift nie direkt
auf den Speicher zu.

Die Daten bleiben nach dem Schliessen des Browsers erhalten. Werden die
Websitedaten des Browsers gelöscht, gehen sie verloren – dafür gibt es die Sicherung.

## Sicherung und Wiederherstellung

Unter **Einstellungen → Sicherung und Wiederherstellung**:

- **Sicherung herunterladen** erzeugt eine versionierte JSON-Datei
  (`formuleprof-sicherung-JJJJ-MM-TT.json`) mit Profil, Vorlagen, Meilensteinen,
  Entwicklungszielen, allen Bereichen des Wegweisers und den Einstellungen.
  Sicherungen der Schemaversion 1 lassen sich weiterhin einlesen; die Bereiche des
  Wegweisers werden dann leer angelegt.
- **Persönliche Reflexionen** werden nur mitgesichert, wenn die entsprechende Option
  ausdrücklich aktiviert wurde. Standardmässig bleiben sie ausgeschlossen.
- **Sicherung einlesen** prüft Schema und Version, warnt vor dem Überschreiben und
  verlangt eine bewusste Auswahl zwischen *Ersetzen* und *Zusammenführen*.

Zusätzlich stehen bereit:

- **Streckendatei exportieren / einlesen** – ein stabiles Austauschformat, das für die
  spätere Verbindung mit der App „Carnet de formation“ vorbereitet ist. Es enthält
  Vorlagen-ID und -Version, Jahrgang, Beginn, Dauer, Ausbildungsform sowie offizielle und
  individuell vereinbarte Termine. Der Austausch erfolgt ausschliesslich über Dateien;
  eine Netzwerk- oder Cloudverbindung besteht nicht.
- **`.ics`-Export** einzelner Termine oder aller Meilensteine für den eigenen Kalender.
- **Druckansicht** (`#/druck`) als PDF-freundliche Übersicht der gesamten Strecke.

## Bearbeitung von Ausbildungsvorlagen

Der **Streckenbaukasten** richtet sich an Fachleitungen. Dort lassen sich anlegen und
ändern:

- Bezeichnung, Version und Gültigkeitsstand, zum Beispiel
  „Thüringen – Gymnasium – Stand August 2026“,
- unterstützte Ausbildungsdauern, Schularten und Quellen,
- Ausbildungsphasen (Etappen) mit Zeitanteilen und Roadbook-Inhalten,
- die Vorgaben für den Wegweiser: Soll-Korridore der Unterrichtsverpflichtung,
  Mindestumfang der Ausbildungsstunden, Fristen der Staatsprüfung, Gewichtung der
  Gesamtnote und Rahmenangaben mit Quellen,
- Meilensteine mit Terminregel, Zeitfenster, Vorlaufzeit, Voraussetzungen,
  Abhängigkeiten, Checklisten, Hilfetexten, Quellen und bedingter Gültigkeit,
- die Regeln für die Vorschau auf Herausforderungen.

Vorlagen lassen sich kopieren, exportieren und importieren. Da Etappen und Termine über
Anteile der Gesamtdauer definiert werden, passt sich eine Vorlage automatisch an
unterschiedliche Ausbildungsdauern an (etwa 12, 18 oder 24 Monate).

### Terminregeln

| Regel | Bedeutung |
| --- | --- |
| `absolut` | Fester Kalendertermin, optional mit Zeitfenster |
| `relativ` | Abstand zu Ausbildungsbeginn, Ausbildungsende, einer Phase oder einem anderen Meilenstein |
| `zeitfenster` | Frei definierbares Fenster zwischen zwei Bezugspunkten |
| `drittel` | Zuordnung zu einem Ausbildungsdrittel |
| `phase` | Gesamtes Fenster einer Ausbildungsphase |

Manuell eingetragene Termine gelten als feste Angabe und werden bei einer Neuberechnung
**nicht** verändert. Termine, die auf einen solchen Meilenstein aufbauen, verschieben
sich dagegen automatisch mit.

## Hinweis zu den mitgelieferten Vorlagen

> Die mitgelieferten Vorlagen sind **Beispielmaterial**. Sie bilden einen typischen Ablauf
> ab und dienen der Orientierung. Sie stellen **keine amtliche Wiedergabe und keine
> rechtlich verbindliche Vorgabe** dar. Verbindlich sind ausschliesslich die jeweils
> geltenden Ordnungen des Bundeslandes sowie die Absprachen mit Studienseminar und Schule.

Die Vorlage „Thüringen – Gymnasium und Regelschule“ ist an der ThürAZStPLVO, den Hinweisen
des Landesprüfungsamtes (Fassung vom 01.08.2016) und den Angaben des Staatlichen
Studienseminars ausgerichtet. Sie enthält unter anderem die fünf Abschnitte der
Unterrichtsverpflichtung (H/aU/sU, Summe rund 15 Wochenstunden), den Mindestumfang der
Ausbildungsstunden (200 Stunden bei 18 Monaten, 300 bei 24 Monaten), die Formularsätze zu
benoteter Lehrprobe und Staatsprüfung, die Werktagsfristen für die Themenbekanntgabe
(10 beziehungsweise 5 Werktage) und die Gewichtung der Gesamtnote.

Nicht abgebildet sind die Standardisierten Leistungsbilder und die aktuellen
Ausbildungscurricula; sie sind beim Studienseminar zu erfragen.

Mitgelieferte Vorlagen werden bei einem Versionswechsel der App aktualisiert. Eigene
Kopien – im Streckenbaukasten über **Vorlage kopieren** – bleiben davon unberührt; für
eigene Anpassungen ist dieser Weg vorgesehen.

## Projektstruktur

```
src/
  domain/     Fachlogik: Typen, Terminberechnung, Priorisierung, Herausforderungen,
              Unterrichtseinsatz, Ausbildungsstunden, Prüfungsfristen, Noten,
              Unterlagen, Stand des Wegweisers
  data/       Speicherschicht (IndexedDB), Repository, mitgelieferte Vorlagen
  io/         Import, Export, Streckenaustausch, ICS
  state/      Anwendungszustand (React-Kontext)
  ui/         Oberfläche: Ansichten (inkl. Wegweiser-Bereiche), Komponenten,
              Onboarding, Router
  test/       Automatisierte Tests
scripts/      Erzeugung der App-Symbole und des Service Workers
```

Datumsberechnungen finden ausschliesslich in `src/domain/dates.ts` und
`src/domain/schedule.ts` statt und nutzen `date-fns`. Oberflächenkomponenten rechnen
nicht selbst mit Datumsangaben.

## Lizenz

MIT – siehe [LICENSE](LICENSE).

---

FormuleProf · Version 0.2.0 · © Florian Nowak
