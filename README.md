# FormuleProf

**Dein persönlicher Weg durch den Vorbereitungsdienst**

FormuleProf zeigt Lehramtsanwärterinnen und Lehramtsanwärtern ihren individuellen Weg
durch den Vorbereitungsdienst als übersichtliche Strecke – „deine Linie“. Die
Rennstreckenmetapher dient ausschliesslich der Orientierung: Es gibt **keine Ranglisten,
keine Punkte, keine Geschwindigkeitsanzeigen und keinen Vergleich zwischen Personen**.

Die App beantwortet täglich vier Fragen:

1. Wo befinde ich mich gerade?
2. Was ist jetzt wirklich wichtig?
3. Was kommt als Nächstes?
4. Welche absehbare Herausforderung sollte ich frühzeitig vorbereiten?

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
`meta` (Profil und Einstellungen), `templates`, `milestones`, `goals` und
`reflections`. Der Zugriff erfolgt ausschliesslich über die Serviceschicht
(`src/data/storage.ts` und `src/data/repository.ts`); die Oberfläche greift nie direkt
auf den Speicher zu.

Die Daten bleiben nach dem Schliessen des Browsers erhalten. Werden die
Websitedaten des Browsers gelöscht, gehen sie verloren – dafür gibt es die Sicherung.

## Sicherung und Wiederherstellung

Unter **Einstellungen → Sicherung und Wiederherstellung**:

- **Sicherung herunterladen** erzeugt eine versionierte JSON-Datei
  (`formuleprof-sicherung-JJJJ-MM-TT.json`) mit Profil, Vorlagen, Meilensteinen,
  Entwicklungszielen und Einstellungen.
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

## Hinweis zu den Demodaten

> Die mitgelieferten Vorlagen sind ausdrücklich **Demodaten**. Sie bilden einen typischen
> Ablauf ab und dienen der Orientierung. Sie stellen **keine rechtlich verbindliche
> Vorgabe** dar. Verbindlich sind ausschliesslich die jeweils geltenden Ordnungen des
> Bundeslandes sowie die Absprachen mit Studienseminar und Schule.

## Projektstruktur

```
src/
  domain/     Fachlogik: Typen, Terminberechnung, Priorisierung, Herausforderungen
  data/       Speicherschicht (IndexedDB), Repository, Demovorlagen
  io/         Import, Export, Streckenaustausch, ICS
  state/      Anwendungszustand (React-Kontext)
  ui/         Oberfläche: Ansichten, Komponenten, Onboarding, Router
  test/       Automatisierte Tests
scripts/      Erzeugung der App-Symbole und des Service Workers
```

Datumsberechnungen finden ausschliesslich in `src/domain/dates.ts` und
`src/domain/schedule.ts` statt und nutzen `date-fns`. Oberflächenkomponenten rechnen
nicht selbst mit Datumsangaben.

## Lizenz

MIT – siehe [LICENSE](LICENSE).

---

FormuleProf · Version 0.1.0 · © Florian Nowak
