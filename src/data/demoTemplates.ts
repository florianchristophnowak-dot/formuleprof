/**
 * Mitgelieferte Beispielvorlagen.
 *
 * WICHTIG: Alle Inhalte sind ausdrücklich Demodaten. Sie bilden einen
 * typischen Ablauf ab, sind aber keine rechtlich verbindliche Vorgabe.
 * Verbindlich sind ausschliesslich die jeweils geltenden Ordnungen des
 * Bundeslandes sowie die Absprachen mit dem Studienseminar.
 */
import { DEFAULT_CHALLENGE_RULES } from '../domain/challenges';
import type {
  ExamDeadlineModel,
  FederalState,
  FormSet,
  FrameworkNote,
  GradeModel,
  MilestoneDefinition,
  RoadbookEntry,
  SchoolType,
  SeminarRequirement,
  TeachingLoadModel,
  TrainingPhase,
  TrainingTemplate,
} from '../domain/types';

const DEMO_NOTE =
  'Demodaten: Beispielhafter Ablauf zur Orientierung. Keine rechtlich verbindliche Vorgabe – bitte mit den Vorgaben des Studienseminars abgleichen.';

const THUERINGEN_NOTE =
  'Beispielvorlage auf Grundlage der ThürAZStPLVO, der Hinweise des Landesprüfungsamtes (Fassung vom 01.08.2016) und der Angaben des Studienseminars. Keine amtliche Wiedergabe und keine rechtlich verbindliche Vorgabe – verbindlich sind die geltenden Ordnungen sowie die Absprachen mit Studienseminar und Schule.';

const CREATED_AT = '2026-08-01T00:00:00.000Z';

function phase(
  id: string,
  title: string,
  summary: string,
  fromFraction: number,
  toFraction: number,
  demanding: boolean,
  roadbook: TrainingPhase['roadbook'],
): TrainingPhase {
  return { id, title, summary, fromFraction, toFraction, demanding, roadbook };
}

export const DEMO_PHASES: TrainingPhase[] = [
  phase(
    'start',
    'Start und Orientierung',
    'Ankommen an Schule und Studienseminar, Rollen und Zuständigkeiten klären.',
    0,
    0.07,
    false,
    {
      expectations: [
        'Du lernst Schule, Ausbildungslehrkräfte und Studienseminar kennen.',
        'Du verschaffst dir einen Überblick über Stundenplan und Ausbildungsunterricht.',
      ],
      preparation: [
        'Unterlagen für den Dienstantritt zusammenstellen.',
        'Erste Hospitationen im eigenen Fach verabreden.',
      ],
      documents: ['Einstellungsunterlagen', 'Stundenplan', 'Schulordnung und Hausordnung'],
      uncertainties: [
        'Unklarheit darüber, wer wofür zuständig ist.',
        'Unsicherheit, wie viel Eigenverantwortung bereits erwartet wird.',
      ],
      support: ['Mentorin oder Mentor an der Schule', 'Fachleitung', 'Ausbildungslehrkräfte'],
      carryOver: ['Erfahrungen aus Praktika des Studiums.'],
    },
  ),
  phase(
    'praxis',
    'Einstieg in die Unterrichtspraxis',
    'Erste eigene Stunden unter Anleitung, erster Unterrichtsbesuch.',
    0.07,
    0.2,
    false,
    {
      expectations: [
        'Du planst und hältst eigene Stunden unter Begleitung.',
        'Du bereitest den ersten Unterrichtsbesuch schriftlich vor.',
      ],
      preparation: [
        'Aufbau eines eigenen Planungsformats für Stunden.',
        'Lerngruppe und Lernausgangslage systematisch beschreiben.',
      ],
      documents: ['Unterrichtsentwurf', 'Sitzplan', 'Materialien und Arbeitsblätter'],
      uncertainties: [
        'Der Umfang eines Unterrichtsentwurfs ist unklar.',
        'Zeitplanung der Stunde wird über- oder unterschätzt.',
      ],
      support: ['Fachleitung', 'Ausbildungslehrkraft', 'Mitanwärterinnen und Mitanwärter'],
      carryOver: ['Beobachtungen aus den Hospitationen der Startphase.'],
    },
  ),
  phase(
    'eigenverantwortung',
    'Zunehmende Eigenverantwortung',
    'Eigenverantwortlicher Unterricht, erste Ausbildungsgespräche.',
    0.2,
    0.38,
    false,
    {
      expectations: [
        'Du unterrichtest eigenverantwortlich und übernimmst Leistungsbewertung.',
        'Du führst ein erstes Ausbildungsgespräch über deinen Entwicklungsstand.',
      ],
      preparation: [
        'Übersicht über Lernstände und Bewertungsgrundlagen anlegen.',
        'Eigene Entwicklungsziele formulieren.',
      ],
      documents: ['Notenübersicht', 'Kompetenzraster', 'Protokolle der Unterrichtsbesuche'],
      uncertainties: [
        'Umgang mit Leistungsbewertung und Elternkommunikation.',
        'Balance zwischen Vorbereitung und Belastung.',
      ],
      support: ['Fachleitung', 'Klassenleitung', 'Beratungslehrkraft'],
      carryOver: ['Rückmeldungen aus dem ersten Unterrichtsbesuch.'],
    },
  ),
  phase(
    'unterrichtsbesuche',
    'Unterrichtsbesuche',
    'Dichte Folge von Besuchen mit gezielten Beobachtungsschwerpunkten.',
    0.38,
    0.55,
    true,
    {
      expectations: [
        'Du setzt vereinbarte Entwicklungsschwerpunkte sichtbar um.',
        'Du reflektierst deine Stunden strukturiert und begründet.',
      ],
      preparation: [
        'Beobachtungsschwerpunkt je Besuch vorab abstimmen.',
        'Entwürfe rechtzeitig fertigstellen und gegenlesen lassen.',
      ],
      documents: ['Unterrichtsentwürfe', 'Reihenplanung', 'Rückmeldebögen'],
      uncertainties: [
        'Mehrere Besuche liegen dicht beieinander.',
        'Widersprüchlich wirkende Rückmeldungen verschiedener Personen.',
      ],
      support: ['Fachleitungen beider Fächer', 'Ausbildungslehrkräfte'],
      carryOver: ['Konkrete Entwicklungsaufträge aus den vorherigen Besuchen.'],
    },
  ),
  phase(
    'ausbildungsgespraeche',
    'Ausbildungsgespräche',
    'Standortbestimmung mit Schule und Studienseminar.',
    0.55,
    0.64,
    false,
    {
      expectations: [
        'Du beschreibst deinen Entwicklungsstand selbst und belegst ihn mit Beispielen.',
        'Ihr vereinbart nachvollziehbare nächste Schritte.',
      ],
      preparation: [
        'Eigene Einschätzung stichpunktartig vorbereiten.',
        'Belege aus Unterricht und Reflexionen auswählen.',
      ],
      documents: ['Ausbildungsplan', 'Bisherige Rückmeldungen', 'Eigene Zielformulierung'],
      uncertainties: [
        'Unsicherheit, wie offen eigene Schwierigkeiten angesprochen werden können.',
        'Unklare Erwartungen an das Gespräch.',
      ],
      support: ['Fachleitung', 'Schulleitung', 'Personalrat'],
      carryOver: ['Notizen aus den Boxenstopps der vergangenen Wochen.'],
    },
  ),
  phase(
    'lehrprobe',
    'Benotete Lehrprobe',
    'Bewertete Unterrichtsstunden mit erhöhter Vorbereitungstiefe.',
    0.64,
    0.74,
    true,
    {
      expectations: [
        'Du zeigst eine in sich stimmige, begründete Unterrichtsstunde.',
        'Du legst einen ausführlichen schriftlichen Entwurf vor.',
      ],
      preparation: [
        'Thema und Lerngruppe frühzeitig festlegen.',
        'Entwurf mehrfach überarbeiten und Zeitpuffer einplanen.',
      ],
      documents: ['Ausführlicher Unterrichtsentwurf', 'Materialien', 'Sitzplan und Lerngruppenbeschreibung'],
      uncertainties: [
        'Hoher Anspruch an den Entwurf bei begrenzter Zeit.',
        'Sorge vor unvorhergesehenen Situationen in der Stunde.',
      ],
      support: ['Fachleitung', 'Ausbildungslehrkraft', 'Lerngruppe der Mitanwärterinnen und Mitanwärter'],
      carryOver: ['Bewährte Routinen und Rückmeldungen aus den Unterrichtsbesuchen.'],
    },
  ),
  phase(
    'beurteilung',
    'Beurteilungsphase',
    'Beurteilungen durch Schule und Studienseminar.',
    0.74,
    0.83,
    false,
    {
      expectations: [
        'Deine Leistungen werden zusammenfassend beurteilt.',
        'Du klärst offene Fragen zur Prüfungszulassung.',
      ],
      preparation: [
        'Vollständigkeit der Unterlagen prüfen.',
        'Termine für Beurteilungsgespräche abstimmen.',
      ],
      documents: ['Beurteilungsentwürfe', 'Nachweise über Unterrichtsbesuche', 'Anmeldeformulare'],
      uncertainties: [
        'Unsicherheit über den Zeitpunkt der Beurteilung.',
        'Fragen zur Gewichtung der einzelnen Teile.',
      ],
      support: ['Schulleitung', 'Fachleitungen', 'Prüfungsamt'],
      carryOver: ['Dokumentierte Entwicklung aus der gesamten Ausbildungszeit.'],
    },
  ),
  phase(
    'pruefungsvorbereitung',
    'Prüfungsvorbereitung',
    'Strukturierte Vorbereitung auf die Staatsprüfung.',
    0.83,
    0.92,
    true,
    {
      expectations: [
        'Du bereitest Prüfungsunterricht und Kolloquium planvoll vor.',
        'Du gibst geforderte Arbeiten fristgerecht ab.',
      ],
      preparation: [
        'Arbeitsplan mit festen Zeitfenstern anlegen.',
        'Prüfungsthemen und Schwerpunkte eingrenzen.',
      ],
      documents: ['Schriftliche Arbeit oder Portfolio', 'Themenübersicht', 'Prüfungsanmeldung'],
      uncertainties: [
        'Mehrere Aufgaben laufen parallel.',
        'Unklarheit über Formalia der Abgabe.',
      ],
      support: ['Fachleitungen', 'Prüfungsamt', 'Mitanwärterinnen und Mitanwärter'],
      carryOver: ['Erprobte Planungsroutinen aus den Lehrproben.'],
    },
  ),
  phase(
    'staatspruefung',
    'Staatsprüfung',
    'Prüfungsunterricht und Kolloquium.',
    0.92,
    0.98,
    true,
    {
      expectations: [
        'Du zeigst deine Unterrichtskompetenz in der Prüfungssituation.',
        'Du begründest deine Entscheidungen im Kolloquium.',
      ],
      preparation: [
        'Ablauf und Ort der Prüfung klären.',
        'Materialien vollständig und mehrfach gesichert bereitlegen.',
      ],
      documents: ['Prüfungsentwürfe', 'Ausweisdokument', 'Materialien für die Prüfungsstunde'],
      uncertainties: ['Nervosität am Prüfungstag.', 'Unvorhergesehene Änderungen in der Lerngruppe.'],
      support: ['Fachleitungen', 'Schulleitung', 'Prüfungsvorsitz'],
      carryOver: ['Alle Rückmeldungen und Routinen der bisherigen Ausbildung.'],
    },
  ),
  phase(
    'abschluss',
    'Abschluss',
    'Abschluss des Vorbereitungsdienstes und Übergang in den Beruf.',
    0.98,
    1,
    false,
    {
      expectations: ['Du erhältst dein Zeugnis.', 'Du klärst den Übergang in den Schuldienst.'],
      preparation: ['Bewerbungsunterlagen aktualisieren.', 'Materialien und Unterlagen archivieren.'],
      documents: ['Zeugnis', 'Bewerbungsunterlagen', 'Nachweise über Fortbildungen'],
      uncertainties: ['Unsicherheit über den weiteren beruflichen Weg.'],
      support: ['Schulamt', 'Schulleitung', 'Personalrat'],
      carryOver: ['Die eigene dokumentierte Entwicklung als Grundlage für Bewerbungen.'],
    },
  ),
];

interface MilestoneSeed extends Omit<MilestoneDefinition, 'checklist'> {
  checklist: string[];
}

function milestone(seed: MilestoneSeed): MilestoneDefinition {
  return {
    ...seed,
    checklist: seed.checklist.map((label, index) => ({ id: `${seed.id}-c${index + 1}`, label })),
  };
}

export const DEMO_MILESTONES: MilestoneDefinition[] = [
  milestone({
    id: 'dienstantritt',
    title: 'Dienstantritt',
    description: 'Offizieller Beginn des Vorbereitungsdienstes an der Ausbildungsschule.',
    category: 'Organisation',
    phaseId: 'start',
    dateRule: { kind: 'relativ', anchor: { type: 'start' }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 7,
    prerequisites: [],
    checklist: ['Unterlagen vollständig', 'Zugänge und Schlüssel erhalten', 'Ansprechpersonen notiert'],
    help: 'Kläre am ersten Tag, wer deine Mentorin oder dein Mentor ist und wie der Ausbildungsunterricht organisiert wird.',
    source: DEMO_NOTE,
    mandatory: true,
    major: false,
    order: 10,
  }),
  milestone({
    id: 'einfuehrung-seminar',
    title: 'Einführungsveranstaltung am Studienseminar',
    description: 'Erste Veranstaltung des Studienseminars mit Überblick über die Ausbildung.',
    category: 'Seminar',
    phaseId: 'start',
    dateRule: {
      kind: 'relativ',
      anchor: { type: 'start' },
      offset: { amount: 7, unit: 'Tage' },
      windowDays: 7,
    },
    leadTimeDays: 3,
    prerequisites: ['dienstantritt'],
    checklist: ['Ausbildungsplan erhalten', 'Seminartermine im Kalender eingetragen'],
    help: 'Notiere dir die verbindlichen Seminartermine direkt und trage sie in deine Strecke ein.',
    mandatory: true,
    major: false,
    order: 20,
  }),
  milestone({
    id: 'hospitationen',
    title: 'Hospitationsphase',
    description: 'Unterricht erfahrener Lehrkräfte beobachten und auswerten.',
    category: 'Unterricht',
    phaseId: 'start',
    dateRule: {
      kind: 'zeitfenster',
      from: { anchor: { type: 'start' }, offset: { amount: 2, unit: 'Tage' } },
      to: { anchor: { type: 'fraction', value: 0.07 }, offset: { amount: 0, unit: 'Tage' } },
    },
    leadTimeDays: 0,
    prerequisites: [],
    checklist: ['Beobachtungsbogen angelegt', 'Mindestens fünf Stunden hospitiert'],
    help: 'Hospitiere gezielt mit einer Leitfrage statt allgemein – das erleichtert die spätere Auswertung.',
    mandatory: false,
    major: false,
    order: 30,
  }),
  milestone({
    id: 'stundenplan',
    title: 'Ausbildungsunterricht und Stundenplan klären',
    description: 'Verbindliche Absprache über Lerngruppen, Fächer und Stundenumfang.',
    category: 'Organisation',
    phaseId: 'start',
    dateRule: { kind: 'relativ', anchor: { type: 'start' }, offset: { amount: 10, unit: 'Tage' } },
    leadTimeDays: 5,
    prerequisites: ['dienstantritt'],
    checklist: ['Lerngruppen festgelegt', 'Ausbildungslehrkräfte benannt', 'Stundenumfang geprüft'],
    help: 'Halte die Absprachen schriftlich fest; sie sind Grundlage für die spätere Planung deiner Besuche.',
    mandatory: true,
    major: false,
    order: 40,
  }),
  milestone({
    id: 'erste-stunden',
    title: 'Erste eigene Unterrichtsstunden',
    description: 'Eigene Stunden im begleiteten Ausbildungsunterricht.',
    category: 'Unterricht',
    phaseId: 'praxis',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.08 }, offset: { amount: 0, unit: 'Tage' }, windowDays: 21 },
    leadTimeDays: 7,
    prerequisites: ['stundenplan'],
    checklist: ['Erste Stunde geplant', 'Rückmeldung eingeholt', 'Planungsformat angelegt'],
    help: 'Ein einheitliches Planungsformat spart später bei jedem Unterrichtsbesuch Zeit.',
    mandatory: false,
    major: false,
    order: 50,
  }),
  milestone({
    id: 'ub1',
    title: 'Unterrichtsbesuch 1',
    description: 'Erster begleiteter Unterrichtsbesuch mit Nachbesprechung.',
    category: 'Unterrichtsbesuch',
    phaseId: 'praxis',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.13 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 14,
    prerequisites: ['erste-stunden'],
    checklist: [
      'Termin mit der Fachleitung abgestimmt',
      'Beobachtungsschwerpunkt vereinbart',
      'Unterrichtsentwurf abgegeben',
      'Material vorbereitet',
    ],
    help: 'Der erste Besuch dient der Orientierung. Ein klar benannter Schwerpunkt macht die Rückmeldung nutzbar.',
    source: DEMO_NOTE,
    mandatory: true,
    major: true,
    order: 60,
  }),
  milestone({
    id: 'seminarbeitrag',
    title: 'Eigener Beitrag im Fachseminar',
    description: 'Vorstellung eines fachdidaktischen Themas im Seminar.',
    category: 'Seminar',
    phaseId: 'praxis',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.17 }, offset: { amount: 0, unit: 'Tage' }, windowDays: 14 },
    leadTimeDays: 10,
    prerequisites: [],
    checklist: ['Thema abgestimmt', 'Material erstellt'],
    help: 'Wähle ein Thema, das dich in deinem aktuellen Entwicklungsziel weiterbringt.',
    mandatory: false,
    major: false,
    order: 70,
  }),
  milestone({
    id: 'eigenverantwortlicher-unterricht',
    title: 'Beginn des eigenverantwortlichen Unterrichts',
    description: 'Übernahme eigener Lerngruppen in eigener Verantwortung.',
    category: 'Unterricht',
    phaseId: 'eigenverantwortung',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.2 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 21,
    prerequisites: ['ub1'],
    checklist: ['Lerngruppen übernommen', 'Leistungsbewertung geklärt', 'Elterninformation vorbereitet'],
    help: 'Kläre vor dem Start, wie Leistungsbewertung und Elternkommunikation an deiner Schule geregelt sind.',
    conditions: { minDurationMonths: 12 },
    source: DEMO_NOTE,
    mandatory: true,
    major: true,
    order: 80,
  }),
  milestone({
    id: 'ag1',
    title: 'Ausbildungsgespräch 1',
    description: 'Erstes strukturiertes Gespräch über den Ausbildungsstand.',
    category: 'Ausbildungsgespräch',
    phaseId: 'eigenverantwortung',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.25 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 10,
    prerequisites: ['ub1'],
    checklist: ['Eigene Einschätzung notiert', 'Entwicklungsziel formuliert', 'Vereinbarungen festgehalten'],
    help: 'Bereite zwei bis drei konkrete Beispiele aus deinem Unterricht vor.',
    mandatory: true,
    major: false,
    order: 90,
  }),
  milestone({
    id: 'ub2',
    title: 'Unterrichtsbesuch 2',
    description: 'Zweiter Unterrichtsbesuch mit vereinbartem Schwerpunkt.',
    category: 'Unterrichtsbesuch',
    phaseId: 'eigenverantwortung',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.31 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 14,
    prerequisites: ['ub1'],
    checklist: ['Beobachtungsschwerpunkt vereinbart', 'Entwurf abgegeben', 'Rückmeldung ausgewertet'],
    help: 'Greife den Entwicklungsauftrag aus dem ersten Besuch sichtbar auf.',
    mandatory: true,
    major: true,
    order: 100,
  }),
  milestone({
    id: 'elternabend',
    title: 'Mitwirkung an einem Elternabend',
    description: 'Teilnahme oder eigener Beitrag bei einem Elternabend.',
    category: 'Organisation',
    phaseId: 'eigenverantwortung',
    dateRule: {
      kind: 'zeitfenster',
      from: { anchor: { type: 'fraction', value: 0.22 }, offset: { amount: 0, unit: 'Tage' } },
      to: { anchor: { type: 'fraction', value: 0.36 }, offset: { amount: 0, unit: 'Tage' } },
    },
    leadTimeDays: 7,
    prerequisites: [],
    checklist: ['Termin erfragt', 'Rolle abgesprochen'],
    help: 'Auch eine beobachtende Teilnahme ist wertvoll – halte sie kurz schriftlich fest.',
    mandatory: false,
    major: false,
    order: 110,
  }),
  milestone({
    id: 'ub3',
    title: 'Unterrichtsbesuch 3',
    description: 'Dritter Unterrichtsbesuch, häufig im zweiten Fach.',
    category: 'Unterrichtsbesuch',
    phaseId: 'unterrichtsbesuche',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.41 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 14,
    prerequisites: ['ub2'],
    checklist: ['Beobachtungsschwerpunkt vereinbart', 'Entwurf abgegeben', 'Reihenplanung ergänzt'],
    help: 'Achte darauf, dass beide Fächer über die Ausbildung hinweg ausgewogen vertreten sind.',
    mandatory: true,
    major: true,
    order: 120,
  }),
  milestone({
    id: 'kollegiale-hospitation',
    title: 'Kollegiale Hospitation',
    description: 'Gegenseitiger Unterrichtsbesuch mit Mitanwärterinnen und Mitanwärtern.',
    category: 'Unterricht',
    phaseId: 'unterrichtsbesuche',
    dateRule: { kind: 'phase', phaseId: 'unterrichtsbesuche' },
    leadTimeDays: 7,
    prerequisites: [],
    checklist: ['Termin verabredet', 'Beobachtungsauftrag formuliert', 'Auswertung notiert'],
    help: 'Kollegiale Rückmeldungen sind vertraulich und dienen ausschliesslich deiner Entwicklung.',
    mandatory: false,
    major: false,
    order: 130,
  }),
  milestone({
    id: 'ub4',
    title: 'Unterrichtsbesuch 4',
    description: 'Vierter Unterrichtsbesuch mit erhöhtem Anspruch an die Reflexion.',
    category: 'Unterrichtsbesuch',
    phaseId: 'unterrichtsbesuche',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.5 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 14,
    prerequisites: ['ub3'],
    checklist: ['Beobachtungsschwerpunkt vereinbart', 'Entwurf abgegeben'],
    help: 'Formuliere in der Nachbesprechung selbst, woran du weiterarbeiten möchtest.',
    conditions: { minDurationMonths: 18 },
    mandatory: true,
    major: true,
    order: 140,
  }),
  milestone({
    id: 'ag2',
    title: 'Ausbildungsgespräch 2',
    description: 'Zwischenbilanz mit Fachleitung und Schule.',
    category: 'Ausbildungsgespräch',
    phaseId: 'ausbildungsgespraeche',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.57 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 10,
    prerequisites: ['ag1'],
    checklist: ['Entwicklungsstand beschrieben', 'Neue Vereinbarungen notiert'],
    help: 'Nimm deine Notizen aus dem Boxenstopp mit – sie machen deine Entwicklung sichtbar.',
    mandatory: true,
    major: false,
    order: 150,
  }),
  milestone({
    id: 'zwischengespraech-schulleitung',
    title: 'Gespräch mit der Schulleitung',
    description: 'Standortbestimmung im Hinblick auf die Beurteilung.',
    category: 'Ausbildungsgespräch',
    phaseId: 'ausbildungsgespraeche',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.61 }, offset: { amount: 0, unit: 'Tage' }, windowDays: 14 },
    leadTimeDays: 10,
    prerequisites: [],
    checklist: ['Termin vereinbart', 'Eigene Fragen notiert'],
    help: 'Frage aktiv nach, welche Aspekte für die schulische Beurteilung besonders relevant sind.',
    mandatory: false,
    major: false,
    order: 160,
  }),
  milestone({
    id: 'ub5',
    title: 'Unterrichtsbesuch 5',
    description: 'Letzter regulärer Unterrichtsbesuch vor den Lehrproben.',
    category: 'Unterrichtsbesuch',
    phaseId: 'ausbildungsgespraeche',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.63 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 14,
    prerequisites: ['ub4'],
    checklist: ['Beobachtungsschwerpunkt vereinbart', 'Entwurf abgegeben'],
    help: 'Nutze diesen Besuch als Generalprobe für das Format der Lehrprobe.',
    conditions: { minDurationMonths: 18 },
    mandatory: true,
    major: true,
    order: 170,
  }),
  milestone({
    id: 'lehrprobe1',
    title: 'Benotete Lehrprobe im ersten Fach',
    description: 'Bewertete Unterrichtsstunde mit ausführlichem schriftlichem Entwurf.',
    category: 'Lehrprobe',
    phaseId: 'lehrprobe',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.68 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 28,
    prerequisites: ['ub3'],
    checklist: [
      'Thema und Lerngruppe festgelegt',
      'Reihenplanung erstellt',
      'Entwurf fristgerecht abgegeben',
      'Material und Technik geprüft',
    ],
    help: 'Plane den Entwurf rückwärts vom Abgabetermin und halte einen Puffer von mindestens drei Tagen frei.',
    source: DEMO_NOTE,
    mandatory: true,
    major: true,
    order: 180,
  }),
  milestone({
    id: 'lehrprobe2',
    title: 'Benotete Lehrprobe im zweiten Fach',
    description: 'Zweite bewertete Unterrichtsstunde, abhängig von der ersten Lehrprobe.',
    category: 'Lehrprobe',
    phaseId: 'lehrprobe',
    dateRule: {
      kind: 'relativ',
      anchor: { type: 'milestone', milestoneId: 'lehrprobe1' },
      offset: { amount: 21, unit: 'Tage' },
    },
    leadTimeDays: 28,
    prerequisites: ['lehrprobe1'],
    checklist: ['Thema festgelegt', 'Entwurf abgegeben', 'Material geprüft'],
    help: 'Der Termin richtet sich nach der ersten Lehrprobe. Verschiebt sich diese, wandert auch dieser Termin mit.',
    conditions: { minSubjects: 2 },
    mandatory: true,
    major: true,
    order: 190,
  }),
  milestone({
    id: 'anmeldung-pruefung',
    title: 'Anmeldung zur Staatsprüfung',
    description: 'Fristgerechte Anmeldung beim zuständigen Prüfungsamt.',
    category: 'Organisation',
    phaseId: 'beurteilung',
    dateRule: {
      kind: 'relativ',
      anchor: { type: 'milestone', milestoneId: 'pruefung-unterricht' },
      offset: { amount: -90, unit: 'Tage' },
    },
    leadTimeDays: 21,
    prerequisites: [],
    checklist: ['Formular ausgefüllt', 'Nachweise beigefügt', 'Abgabe bestätigt'],
    help: 'Die Anmeldung ist an Fristen gebunden. Der Termin berechnet sich aus dem Prüfungstermin.',
    source: DEMO_NOTE,
    mandatory: true,
    major: false,
    order: 200,
  }),
  milestone({
    id: 'beurteilung-schulleitung',
    title: 'Beurteilung durch die Schulleitung',
    description: 'Zusammenfassende dienstliche Beurteilung der schulischen Leistungen.',
    category: 'Beurteilung',
    phaseId: 'beurteilung',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.78 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 21,
    prerequisites: ['lehrprobe1'],
    checklist: ['Unterlagen vollständig', 'Gesprächstermin vereinbart'],
    help: 'Frage frühzeitig, welche Nachweise die Schulleitung für die Beurteilung benötigt.',
    mandatory: true,
    major: true,
    order: 210,
  }),
  milestone({
    id: 'beurteilung-seminar',
    title: 'Beurteilung durch die Fachleitungen',
    description: 'Beurteilung der Ausbildungsleistungen durch das Studienseminar.',
    category: 'Beurteilung',
    phaseId: 'beurteilung',
    dateRule: {
      kind: 'relativ',
      anchor: { type: 'milestone', milestoneId: 'beurteilung-schulleitung' },
      offset: { amount: 14, unit: 'Tage' },
    },
    leadTimeDays: 14,
    prerequisites: ['beurteilung-schulleitung'],
    checklist: ['Nachweise über Besuche vollständig', 'Rückmeldung besprochen'],
    help: 'Bitte um eine mündliche Erläuterung, wenn Formulierungen unklar bleiben.',
    mandatory: true,
    major: true,
    order: 220,
  }),
  milestone({
    id: 'schriftliche-arbeit',
    title: 'Abgabe der schriftlichen Arbeit',
    description: 'Abgabe der Prüfungsarbeit beziehungsweise des Portfolios.',
    category: 'Prüfung',
    phaseId: 'pruefungsvorbereitung',
    dateRule: {
      kind: 'relativ',
      anchor: { type: 'milestone', milestoneId: 'pruefung-unterricht' },
      offset: { amount: -35, unit: 'Tage' },
    },
    leadTimeDays: 56,
    prerequisites: [],
    checklist: ['Thema abgestimmt', 'Gliederung erstellt', 'Rohfassung fertig', 'Abgabe bestätigt'],
    help: 'Beginne früh mit einer Rohfassung; die letzten Wochen werden durch Prüfungstermine knapp.',
    source: DEMO_NOTE,
    mandatory: true,
    major: true,
    order: 230,
  }),
  milestone({
    id: 'pruefungsvorbereitung',
    title: 'Strukturierte Prüfungsvorbereitung',
    description: 'Fester Zeitraum für die Vorbereitung auf Prüfungsunterricht und Kolloquium.',
    category: 'Prüfung',
    phaseId: 'pruefungsvorbereitung',
    dateRule: { kind: 'phase', phaseId: 'pruefungsvorbereitung' },
    leadTimeDays: 0,
    prerequisites: [],
    checklist: ['Arbeitsplan erstellt', 'Themenübersicht angelegt', 'Lerngruppe für die Prüfung geklärt'],
    help: 'Zwei feste Vorbereitungsfenster pro Woche sind wirksamer als unregelmässige lange Blöcke.',
    mandatory: false,
    major: false,
    order: 240,
  }),
  milestone({
    id: 'pruefung-unterricht',
    title: 'Prüfungsunterricht',
    description: 'Unterrichtsstunden im Rahmen der Staatsprüfung.',
    category: 'Prüfung',
    phaseId: 'staatspruefung',
    dateRule: { kind: 'relativ', anchor: { type: 'fraction', value: 0.94 }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 42,
    prerequisites: ['lehrprobe1', 'beurteilung-schulleitung'],
    checklist: [
      'Termin und Ort bestätigt',
      'Entwürfe fertiggestellt',
      'Material doppelt gesichert',
      'Ablauf mit der Lerngruppe geklärt',
    ],
    help: 'Dieser Termin ist der Bezugspunkt für Anmeldung und schriftliche Arbeit. Wird er verschoben, wandern diese mit.',
    source: DEMO_NOTE,
    mandatory: true,
    major: true,
    order: 250,
  }),
  milestone({
    id: 'pruefung-kolloquium',
    title: 'Kolloquium',
    description: 'Mündlicher Prüfungsteil im Anschluss an den Prüfungsunterricht.',
    category: 'Prüfung',
    phaseId: 'staatspruefung',
    dateRule: {
      kind: 'relativ',
      anchor: { type: 'milestone', milestoneId: 'pruefung-unterricht' },
      offset: { amount: 7, unit: 'Tage' },
    },
    leadTimeDays: 42,
    prerequisites: ['pruefung-unterricht'],
    checklist: ['Schwerpunktthemen vorbereitet', 'Beispiele aus dem Unterricht ausgewählt'],
    help: 'Konkrete Beispiele aus dem eigenen Unterricht tragen im Kolloquium weiter als reine Theorie.',
    mandatory: true,
    major: true,
    order: 260,
  }),
  milestone({
    id: 'zeugnis',
    title: 'Zeugnisübergabe und Abschluss',
    description: 'Abschluss des Vorbereitungsdienstes.',
    category: 'Organisation',
    phaseId: 'abschluss',
    dateRule: { kind: 'relativ', anchor: { type: 'end' }, offset: { amount: 0, unit: 'Tage' } },
    leadTimeDays: 7,
    prerequisites: ['pruefung-kolloquium'],
    checklist: ['Unterlagen abgeholt', 'Zugänge zurückgegeben'],
    help: 'Sichere dir Kopien aller Beurteilungen und Nachweise für spätere Bewerbungen.',
    mandatory: true,
    major: false,
    order: 270,
  }),
  milestone({
    id: 'bewerbung',
    title: 'Bewerbung für den Schuldienst',
    description: 'Vorbereitung des Übergangs in den Schuldienst.',
    category: 'Organisation',
    phaseId: 'abschluss',
    dateRule: {
      kind: 'zeitfenster',
      from: { anchor: { type: 'fraction', value: 0.85 }, offset: { amount: 0, unit: 'Tage' } },
      to: { anchor: { type: 'end' }, offset: { amount: 0, unit: 'Tage' } },
    },
    leadTimeDays: 21,
    prerequisites: [],
    checklist: ['Bewerbungsfristen geprüft', 'Unterlagen aktualisiert'],
    help: 'Bewerbungsfristen der Länder liegen häufig vor dem Ende des Vorbereitungsdienstes.',
    mandatory: false,
    major: false,
    order: 280,
  }),
];


/* ==================================================================== */
/* Thüringen: Angaben aus Verordnung, Hinweisen und Studienseminar        */
/* ==================================================================== */

const QUELLE_VO =
  'ThürAZStPLVO – Thüringer Verordnung über die Ausbildung und die Zweite Staatsprüfung für die Lehrämter; Stand der letzten Änderung vom 24.05.2024. Keine amtliche Wiedergabe.';
const QUELLE_HINWEISE =
  'Hinweise des Thüringer Landesprüfungsamtes für Lehrämter, Fassung vom 01.08.2016. Eine neuere Fassung liegt nicht vor.';
const QUELLE_SEMINAR =
  'Staatliches Studienseminar für Lehrerausbildung mit Sitz in Erfurt und den Regionalstellen Gera, Nordhausen, Eisenach und Meiningen.';
const QUELLE_MERKBLATT =
  'Merkblatt zum Vorbereitungsdienst, Stand 5. Januar 2026; Onlinebewerbung unter vorbereitungsdienst.tmbwk.de.';
const QUELLE_GEW =
  'Broschüre „Zweite Phase Lehrerbildung“ (GEW Thüringen in Kooperation mit dem Studienseminar Erfurt).';

/**
 * Soll-Korridore der Unterrichtsverpflichtung in Wochenstunden.
 * H = Hospitation, aU = angeleiteter Unterricht, sU = selbstständiger
 * Unterricht. Die Summe liegt bei etwa 15 Wochenstunden.
 */
export const THUERINGEN_TEACHING_LOAD: TeachingLoadModel = {
  title: 'Unterrichtsverpflichtung – Soll-Korridore je Ausbildungsabschnitt',
  weeklyTotal: 15,
  independentAveragePerHalfYear: 8,
  independentPeak: 12,
  // Seiteneinstieg und Nachqualifizierung folgen eigenen Regelungen.
  trainingForms: ['regulär', 'verkürzt', 'Teilzeit'],
  note:
    'Bei Teilzeit verringern sich die Werte im Verhältnis zum Teilzeitanteil. Nach bestandener Prüfung ist selbstständiger Unterricht bis zu 15 Wochenstunden möglich.',
  source: QUELLE_VO,
  stages: [
    {
      id: 'ul-1',
      title: 'Bis zur 3. Unterrichtswoche',
      fromWeek: 1,
      hospitation: { min: 15, max: 15 },
      note: 'Zunächst ausschliesslich Hospitation – mindestens 15 Wochenstunden.',
    },
    {
      id: 'ul-2',
      title: '4. bis 6. Unterrichtswoche',
      fromWeek: 4,
      hospitation: { min: 9, max: 11 },
      guided: { min: 4, max: 6 },
      note: 'Einstieg in den angeleiteten Unterricht.',
    },
    {
      id: 'ul-3',
      title: '7. bis etwa 15. Unterrichtswoche',
      fromWeek: 7,
      hospitation: { min: 7, max: 9 },
      combined: { min: 6, max: 8 },
      independentMax: 4,
      note: 'Die Beauftragung mit selbstständigem Unterricht erfolgt in der Regel nach sechs Unterrichtswochen.',
    },
    {
      id: 'ul-4',
      title: 'Ab der 15. Unterrichtswoche bis zum Ende des ersten Ausbildungshalbjahres',
      fromWeek: 15,
      hospitation: { min: 3, max: 7 },
      combined: { min: 8, max: 12 },
      independentMax: 6,
    },
    {
      id: 'ul-5',
      title: 'Ab dem zweiten Ausbildungshalbjahr',
      fromHalfYear: 2,
      hospitation: { min: 1, max: 3 },
      combined: { min: 12, max: 14 },
      independentAverage: 8,
      note: 'Selbstständiger Unterricht im Durchschnitt bis zu 8 Wochenstunden je Halbjahr, zeitweise bis zu 12.',
    },
  ],
};

/** Mindestumfang der Ausbildungsstunden à 60 Minuten am Studienseminar. */
export const THUERINGEN_SEMINAR_REQUIREMENTS: SeminarRequirement[] = [
  { durationMonths: 18, hours: 200 },
  { durationMonths: 24, hours: 300 },
];

/**
 * Formularsätze. Die Kennungen entsprechen den gebräuchlichen Formblättern;
 * Bezeichnung und Verwendung sind mit dem Studienseminar beziehungsweise dem
 * Prüfungsamt abzugleichen.
 */
export const THUERINGEN_FORM_SETS: FormSet[] = [
  {
    id: 'satz-blp',
    title: 'Benotete Lehrprobe (BLP)',
    categories: ['Lehrprobe'],
    source: QUELLE_VO,
    forms: [
      {
        title: 'Schriftlicher Unterrichtsentwurf',
        responsible: 'Lehramtsanwärterin oder Lehramtsanwärter',
        note: 'Thema im Einvernehmen mit der Fachleitung.',
      },
      {
        title: 'Niederschrift der Lehrprobe',
        responsible: 'Fachleitung',
        note: 'Wird von der Fachleitung angefertigt; eine Kopie ist auszuhändigen.',
      },
      {
        code: 'F010',
        title: 'Formblatt F010',
        responsible: 'Fachleitung',
        note: 'Gehört zum Satz der benoteten Lehrprobe. Verwendung beim Studienseminar prüfen.',
      },
    ],
  },
  {
    id: 'satz-plp',
    title: 'Praktische Prüfungslehrprobe (PLP)',
    categories: ['Prüfung'],
    milestoneIds: ['pruefung-unterricht'],
    source: QUELLE_HINWEISE,
    forms: [
      {
        title: 'Entwurf mit Hilfsmittelverzeichnis und Eigenständigkeitsversicherung',
        responsible: 'Lehramtsanwärterin oder Lehramtsanwärter',
        note: 'Abgabe am Vormittag des letzten Werktags vor dem Prüfungstag, laut Hinweisen bis 12 Uhr.',
      },
      { code: 'F220', title: 'Formblatt F220', note: 'Formularsatz der praktischen Prüfungslehrprobe.' },
      { code: 'F225', title: 'Formblatt F225', note: 'Formularsatz der praktischen Prüfungslehrprobe.' },
      { code: 'F230', title: 'Formblatt F230', note: 'Formularsatz der praktischen Prüfungslehrprobe.' },
    ],
  },
  {
    id: 'satz-muendlich',
    title: 'Mündliche Prüfung',
    categories: ['Prüfung'],
    milestoneIds: ['pruefung-kolloquium'],
    source: QUELLE_HINWEISE,
    forms: [
      { code: 'F250', title: 'Formblatt F250', note: 'Formular zur mündlichen Prüfung.' },
      {
        title: 'Präsentation der eigenen Kompetenzentwicklung',
        responsible: 'Lehramtsanwärterin oder Lehramtsanwärter',
      },
    ],
  },
];

/** Fristenregeln der Staatsprüfung. */
export const THUERINGEN_EXAM_DEADLINES: ExamDeadlineModel = {
  title: 'Fristen der Staatsprüfung',
  // Beide Prüfungslehrproben an einem Tag: 10 Werktage; getrennter Ablauf: 5 Werktage.
  announcementWorkdays: { zusammen: 10, getrennt: 5 },
  saturdaysCount: false,
  draftDeadlineTime: '12:00',
  draftFormat:
    'Umfang 8 bis 12 Seiten, Arial 12, 1,5-zeilig, Blocksatz, mit Hilfsmittelverzeichnis und Eigenständigkeitsversicherung. Eine verspätete Abgabe führt zur Wiederholung.',
  source: QUELLE_HINWEISE,
};

/** Gewichtung der Gesamtnote. */
export const THUERINGEN_GRADE_MODEL: GradeModel = {
  title: 'Gesamtnote der Zweiten Staatsprüfung',
  preliminaryWeight: 5,
  practicalWeight: 3,
  oralWeight: 1,
  divisor: 10,
  roundUpFrom: 0.6,
  source: QUELLE_VO,
};

/** Rahmenangaben zum Nachlesen. */
export const THUERINGEN_FRAMEWORK: FrameworkNote[] = [
  {
    id: 'rahmen-dienstverhaeltnis',
    label: 'Dienstverhältnis und Teilzeit',
    text: 'Der Vorbereitungsdienst wird im Beamtenverhältnis auf Widerruf geleistet. Teilzeit ist auf Antrag zur Hälfte, zu zwei Dritteln oder zu drei Vierteln möglich; der Vorbereitungsdienst verlängert sich dann angemessen.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-faecher',
    label: 'Ausbildungsfächer',
    text: 'Ausgebildet wird in zwei Fächern. Ein Doppelfach Kunst oder Musik zählt als ein Ausbildungsfach.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-dauer',
    label: 'Dauer',
    text: 'Vorgesehen sind 24 Monate für Regelschule, Gymnasium, berufsbildende Schulen und Förderpädagogik sowie 18 Monate für die Grundschule. Für Absolventinnen und Absolventen der Universitäten Erfurt und Jena verkürzt sich der Vorbereitungsdienst wegen der schulpraktischen Studienanteile um sechs Monate.',
    source: QUELLE_MERKBLATT,
  },
  {
    id: 'rahmen-seminar',
    label: 'Studienseminar und Regionalstellen',
    text: 'Es besteht ein Staatliches Studienseminar für Lehrerausbildung mit Sitz in Erfurt und den Regionalstellen Gera, Nordhausen, Eisenach und Meiningen. Das Studienseminar Gera ist seit dem 25.07.2023 aufgelöst. Seminar- und Schultage sind über die Regionalstellen für die jeweiligen Schularten vereinheitlicht.',
    source: QUELLE_SEMINAR,
  },
  {
    id: 'rahmen-zustaendigkeiten',
    label: 'Zuständigkeiten',
    text: 'Die Dienstaufsicht liegt beim Schulamt, Dienstvorgesetzter ist die Schulleiterin oder der Schulleiter, die Fachaufsicht hat das zuständige Studienseminar. Fachleitungen stehen im Dienst des Studienseminars und sind an eine Schule abgeordnet.',
    source: QUELLE_GEW,
  },
  {
    id: 'rahmen-ausbildungsstunden',
    label: 'Ausbildungsstunden am Seminar',
    text: 'Vorgesehen sind mindestens 300 Ausbildungsstunden à 60 Minuten bei 24 Monaten und mindestens 200 Stunden bei 18 Monaten – Einführungsveranstaltungen, Allgemeines Seminar, Fachseminare, Lehrprobenauswertungen, Hospitationen, Beratungsgespräche und Projekte. Diese Veranstaltungen haben Vorrang vor jeder anderen Tätigkeit.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-unterricht',
    label: 'Ausbildungsunterricht',
    text: 'Der Ausbildungsunterricht umfasst bis zu 15 Wochenstunden. Selbstständiger Unterricht ist im Durchschnitt bis zu 8 Wochenstunden je Halbjahr vorgesehen, zeitweise bis zu 12 und nach bestandener Prüfung bis zu 15 Wochenstunden. Die Beauftragung mit selbstständigem Unterricht erfolgt in der Regel nach sechs Unterrichtswochen.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-lehrproben',
    label: 'Benotete Lehrproben',
    text: 'Je Ausbildungsfach findet eine benotete Lehrprobe an der Ausbildungsschule statt; eine davon in der gymnasialen Oberstufe, in der Regel im Kurssystem. Das Thema wird im Einvernehmen mit der Fachleitung festgelegt, ein schriftlicher Entwurf gehört dazu. Die Note setzt die Seminarleitung nach Anhörung und auf Grundlage der Notenvorschläge fest; die Niederschrift fertigt die Fachleitung an, eine Kopie ist auszuhändigen.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-beurteilung',
    label: 'Beurteilungen und Vornote',
    text: 'Bis zum Ende der ersten Hälfte des Vorbereitungsdienstes findet ein Gespräch zum Ausbildungsstand statt. Vor der ersten Prüfung beurteilen Fachleitungen und Schulleitung mit Notenvorschlag; daraus setzt die Seminarleitung die Vornote fest. Sie ist spätestens 14 Tage vor der letzten Prüfung zu eröffnen.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-staatspruefung',
    label: 'Ablauf der Staatsprüfung',
    text: 'Die Prüfung findet an zwei Prüfungstagen statt: entweder beide praktischen Prüfungslehrproben an einem Tag und die mündliche Prüfung am anderen Tag, oder je eine Prüfungslehrprobe mit der zugehörigen Teilprüfung pro Tag. Die Themen werden im ersten Fall 10 Werktage, im zweiten Fall 5 Werktage vorher bekannt gegeben; Samstage zählen nicht als Werktage. Die mündliche Prüfung besteht aus zwei Teilprüfungen von je 30 Minuten mit Präsentation der Kompetenzentwicklung und anschliessendem Gespräch; Schulrechtsgrundlagen sind als Hilfsmittel zulässig.',
    source: QUELLE_HINWEISE,
  },
  {
    id: 'rahmen-gesamtnote',
    label: 'Gesamtnote',
    text: 'Die Vornote zählt fünffach, der Durchschnitt der praktischen Prüfungslehrproben dreifach, die beiden mündlichen Teilprüfungen je einfach; die Summe wird durch zehn geteilt. Zwischenwerte bis 0,5 werden zur schlechteren, ab 0,6 zur besseren Punktzahl gerundet. Nicht bestanden ist die Prüfung unter anderem bei „ungenügend“ in einer Prüfungslehrprobe oder Teilprüfung.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-wiederholung',
    label: 'Wiederholung und Akteneinsicht',
    text: 'Die Prüfung kann einmal wiederholt werden; der Vorbereitungsdienst verlängert sich in der Regel um höchstens zwölf Monate. Akteneinsicht ist innerhalb eines Jahres einmalig und für höchstens fünf Stunden möglich.',
    source: QUELLE_VO,
  },
  {
    id: 'rahmen-einstellung',
    label: 'Einstellung und Zeugnis',
    text: 'Seit August 2024 gibt es keine vier festen Einstellungstermine mehr, sondern Einstellungsepochen von Februar bis Dezember mit Terminen im etwa zweiwöchigen Rhythmus. Zuständig ist das Ministerium für Bildung, Wissenschaft und Kultur (Referat 3 8). Zum Zeugnis kann nach § 32 seit dem 01.08.2024 zusätzlich ein digitales Zeugnis ausgestellt werden; § 20 zum Prüfungsausschuss gilt in der Fassung ab dem 01.01.2025.',
    source: QUELLE_MERKBLATT,
  },
  {
    id: 'rahmen-offen',
    label: 'Was hier nicht abgebildet ist',
    text: 'Nicht enthalten sind die Standardisierten Leistungsbilder für die praktische und die mündliche Prüfung sowie die aktuellen Ausbildungscurricula. Sie sind beim Studienseminar zu erfragen. Die Hinweise des Landesprüfungsamtes liegen nur in der Fassung vom 01.08.2016 vor.',
    source: QUELLE_HINWEISE,
  },
];

/* --------------------- Meilensteine für Thüringen --------------------- */

type MilestonePatch = Partial<Omit<MilestoneDefinition, 'checklist'>> & { checklist?: string[] };

/**
 * Übernimmt die allgemeinen Meilensteine und schärft sie für Thüringen:
 * Bezeichnungen, Terminregeln und Hinweise folgen der Verordnung und den
 * Hinweisen des Landesprüfungsamtes.
 */
function thueringenMilestones(): MilestoneDefinition[] {
  const patches: Record<string, MilestonePatch> = {
    'einfuehrung-seminar': {
      description:
        'Einführungsveranstaltung des Studienseminars mit Überblick über Ausbildung, Seminartag und Regionalstelle.',
      checklist: ['Ausbildungsplan erhalten', 'Seminartermine im Kalender eingetragen', 'Regionalstelle und Seminartag notiert'],
      help: 'Die Veranstaltungen des Studienseminars haben Vorrang vor jeder anderen Tätigkeit. Trage die Termine früh ein und halte den Umfang in Stunden im Wegweiser fest.',
      source: QUELLE_VO,
    },
    hospitationen: {
      title: 'Hospitationsphase (Soll: Hospitation 15 Wochenstunden)',
      description: 'Bis zur dritten Unterrichtswoche besteht der Ausbildungsunterricht aus Hospitation.',
      category: 'Hospitation',
      dateRule: {
        kind: 'zeitfenster',
        from: { anchor: { type: 'start' }, offset: { amount: 0, unit: 'Tage' } },
        to: { anchor: { type: 'start' }, offset: { amount: 3, unit: 'Wochen' } },
      },
      checklist: ['Beobachtungsbogen angelegt', 'Hospitationen in beiden Fächern', 'Wochenstunden im Wegweiser erfasst'],
      help: 'Vorgesehen sind in dieser Zeit rund 15 Wochenstunden Hospitation. Halte den Einsatz wochenweise im Wegweiser fest – daraus ergibt sich der Abgleich mit dem Soll-Korridor.',
      source: QUELLE_VO,
    },
    stundenplan: {
      title: 'Ausbildungsplan und Stundenplan abstimmen',
      checklist: [
        'Lerngruppen festgelegt',
        'Ausbildungslehrkräfte benannt',
        'Ausbildungsunterricht auf höchstens 15 Wochenstunden geprüft',
      ],
      help: 'Der Ausbildungsunterricht umfasst bis zu 15 Wochenstunden. Halte die Absprachen schriftlich fest; sie sind Grundlage für die Planung aller Besuche.',
      source: QUELLE_VO,
    },
    'erste-stunden': {
      title: 'Einstieg in den angeleiteten Unterricht',
      description: 'Ab der vierten Unterrichtswoche kommen 4 bis 6 Wochenstunden angeleiteter Unterricht hinzu.',
      dateRule: {
        kind: 'relativ',
        anchor: { type: 'start' },
        offset: { amount: 3, unit: 'Wochen' },
        windowDays: 21,
      },
      checklist: ['Erste Stunde geplant', 'Rückmeldung eingeholt', 'Planungsformat angelegt'],
      help: 'Der Anteil der Hospitation sinkt in dieser Zeit auf 9 bis 11 Wochenstunden. Ein einheitliches Planungsformat spart später bei jedem Unterrichtsbesuch Zeit.',
      source: QUELLE_VO,
    },
    'eigenverantwortlicher-unterricht': {
      title: 'Beauftragung mit selbstständigem Unterricht',
      description: 'Übernahme eigener Lerngruppen in eigener Verantwortung – in der Regel nach sechs Unterrichtswochen.',
      dateRule: { kind: 'relativ', anchor: { type: 'start' }, offset: { amount: 6, unit: 'Wochen' } },
      checklist: [
        'Beauftragung liegt vor',
        'Lerngruppen und Stundenumfang festgehalten',
        'Leistungsbewertung geklärt',
        'Elterninformation vorbereitet',
      ],
      help: 'Die Beauftragung erfolgt in der Regel nach sechs Unterrichtswochen. Selbstständiger Unterricht ist zunächst bis zu 4 Wochenstunden vorgesehen, später im Durchschnitt bis zu 8 je Halbjahr.',
      source: QUELLE_VO,
    },
    ag1: { title: 'Erstes Ausbildungsgespräch' },
    ag2: { title: 'Zweites Ausbildungsgespräch' },
    lehrprobe1: {
      title: 'Benotete Lehrprobe im ersten Ausbildungsfach',
      description: 'Bewertete Unterrichtsstunde an der Ausbildungsschule mit schriftlichem Entwurf.',
      checklist: [
        'Thema im Einvernehmen mit der Fachleitung festgelegt',
        'Reihenplanung erstellt',
        'Entwurf fristgerecht abgegeben',
        'Material und Technik geprüft',
        'Niederschrift als Kopie erhalten',
      ],
      help: 'Je Ausbildungsfach findet eine benotete Lehrprobe statt. Das Thema wird im Einvernehmen mit der Fachleitung festgelegt; die Note setzt die Seminarleitung nach Anhörung und auf Grundlage der Notenvorschläge fest. Die Niederschrift fertigt die Fachleitung an, eine Kopie ist auszuhändigen.',
      source: QUELLE_VO,
    },
    lehrprobe2: {
      title: 'Benotete Lehrprobe im zweiten Ausbildungsfach',
      description: 'Zweite bewertete Unterrichtsstunde; eine der beiden Lehrproben liegt in der gymnasialen Oberstufe.',
      checklist: [
        'Thema im Einvernehmen mit der Fachleitung festgelegt',
        'Lerngruppe der gymnasialen Oberstufe geklärt',
        'Entwurf fristgerecht abgegeben',
        'Niederschrift als Kopie erhalten',
      ],
      help: 'Eine der beiden benoteten Lehrproben findet in der gymnasialen Oberstufe statt, in der Regel im Kurssystem. Der Termin richtet sich nach der ersten Lehrprobe: verschiebt sich diese, wandert dieser Termin mit.',
      source: QUELLE_VO,
    },
    'anmeldung-pruefung': {
      help: 'Die Zulassung zur Staatsprüfung ist an Fristen gebunden; der Termin berechnet sich aus dem ersten Prüfungstag. Kläre früh, welche Nachweise das Prüfungsamt verlangt.',
      source: QUELLE_HINWEISE,
    },
    'beurteilung-schulleitung': {
      title: 'Beurteilung durch die Schulleitung (mit Notenvorschlag)',
      help: 'Vor der ersten Prüfung beurteilt die Schulleitung die schulischen Leistungen mit einem Notenvorschlag. Frage frühzeitig, welche Nachweise dafür benötigt werden – der Wegweiser liefert Einsatz, Stunden und Unterlagen auf einen Blick.',
      source: QUELLE_VO,
    },
    'beurteilung-seminar': {
      title: 'Beurteilungen der Fachleitungen (mit Notenvorschlag)',
      help: 'Die Fachleitungen beurteilen die Ausbildungsleistungen mit Notenvorschlag. Aus beiden Beurteilungen setzt die Seminarleitung die Vornote fest.',
      source: QUELLE_VO,
    },
    pruefungsvorbereitung: {
      help: 'Zwei feste Vorbereitungsfenster pro Woche sind wirksamer als unregelmässige lange Blöcke. Trage Ablaufform und Prüfungstage im Wegweiser ein, dann berechnet FormuleProf Themenbekanntgabe und Abgabe der Entwürfe.',
    },
    'pruefung-unterricht': {
      title: 'Erster Prüfungstag: praktische Prüfungslehrproben',
      description: 'Prüfungsunterricht im Rahmen der Staatsprüfung an einem der beiden Prüfungstage.',
      checklist: [
        'Ladung und Ablaufform geprüft',
        'Prüfungstage im Wegweiser eingetragen',
        'Entwürfe fertiggestellt',
        'Material doppelt gesichert',
        'Ablauf mit der Lerngruppe geklärt',
      ],
      help: 'Die Prüfung findet an zwei Prüfungstagen statt: entweder beide Prüfungslehrproben an einem Tag und die mündliche Prüfung am anderen, oder je eine Prüfungslehrprobe mit der zugehörigen Teilprüfung pro Tag. Dieser Termin ist Bezugspunkt für Anmeldung, Themenbekanntgabe und Abgabe der Entwürfe.',
      source: QUELLE_HINWEISE,
    },
    'pruefung-kolloquium': {
      title: 'Zweiter Prüfungstag: mündliche Prüfung',
      description: 'Zwei Teilprüfungen von je 30 Minuten mit Präsentation der Kompetenzentwicklung und Gespräch.',
      checklist: [
        'Präsentation der Kompetenzentwicklung vorbereitet',
        'Beispiele aus dem eigenen Unterricht ausgewählt',
        'Schulrechtsgrundlagen bereitgelegt',
      ],
      help: 'Die mündliche Prüfung besteht aus zwei Teilprüfungen von je 30 Minuten: Präsentation der eigenen Kompetenzentwicklung und anschliessendes Gespräch. Schulrechtsgrundlagen sind als Hilfsmittel zulässig. Der berechnete Termin ist ein Platzhalter – die genauen Tage ergeben sich aus der Ladung.',
      source: QUELLE_HINWEISE,
    },
    zeugnis: {
      help: 'Zum Zeugnis kann zusätzlich ein digitales Zeugnis ausgestellt werden. Sichere dir Kopien aller Beurteilungen und Nachweise für spätere Bewerbungen.',
      source: QUELLE_MERKBLATT,
    },
    bewerbung: {
      help: 'Die Einstellung erfolgt in Epochen von Februar bis Dezember mit Terminen im etwa zweiwöchigen Rhythmus. Die Bewerbung läuft online; zuständig ist das Ministerium für Bildung, Wissenschaft und Kultur.',
      source: QUELLE_MERKBLATT,
    },
  };

  // In Thüringen gehört keine schriftliche Hausarbeit zur Staatsprüfung;
  // schriftlich sind die Entwürfe zu den Prüfungslehrproben.
  const removed = new Set(['schriftliche-arbeit']);

  const additions: MilestoneDefinition[] = [
    milestone({
      id: 'zusatzhospitation',
      title: 'Zusatzhospitation',
      description: 'Zusätzlicher Besuch auf eigenen Wunsch oder auf Anregung der Fachleitung.',
      category: 'Hospitation',
      phaseId: 'unterrichtsbesuche',
      dateRule: { kind: 'phase', phaseId: 'unterrichtsbesuche' },
      leadTimeDays: 7,
      prerequisites: [],
      checklist: ['Termin verabredet', 'Beobachtungsauftrag formuliert'],
      help: 'Eine Zusatzhospitation ist kein Nachteil, sondern eine Gelegenheit für gezielte Rückmeldung. Halte sie im Wegweiser fest.',
      mandatory: false,
      major: false,
      order: 135,
    }),
    milestone({
      id: 'gespraech-ausbildungsstand',
      title: 'Gespräch zum Ausbildungsstand',
      description: 'Standortbestimmung bis zum Ende der ersten Hälfte des Vorbereitungsdienstes.',
      category: 'Ausbildungsgespräch',
      phaseId: 'unterrichtsbesuche',
      dateRule: {
        kind: 'zeitfenster',
        from: { anchor: { type: 'fraction', value: 0.4 }, offset: { amount: 0, unit: 'Tage' } },
        to: { anchor: { type: 'fraction', value: 0.5 }, offset: { amount: 0, unit: 'Tage' } },
      },
      latest: { kind: 'relativ', anchor: { type: 'fraction', value: 0.5 }, offset: { amount: 0, unit: 'Tage' } },
      leadTimeDays: 14,
      prerequisites: ['ub1'],
      checklist: [
        'Eigene Einschätzung vorbereitet',
        'Unterrichtseinsatz und Ausbildungsstunden zusammengestellt',
        'Vereinbarungen festgehalten',
      ],
      help: 'Das Gespräch findet bis zum Ende der ersten Hälfte des Vorbereitungsdienstes statt. Der Wegweiser liefert dafür Belege: Unterrichtseinsatz, Ausbildungsstunden, Rückmeldungen und Entwicklungsziele.',
      source: QUELLE_VO,
      mandatory: true,
      major: true,
      order: 145,
    }),
    milestone({
      id: 'stundennachweis',
      title: 'Nachweis der Ausbildungsstunden prüfen',
      description: 'Zwischenstand der Ausbildungsstunden am Studienseminar abgleichen.',
      category: 'Organisation',
      phaseId: 'ausbildungsgespraeche',
      dateRule: {
        kind: 'zeitfenster',
        from: { anchor: { type: 'fraction', value: 0.45 }, offset: { amount: 0, unit: 'Tage' } },
        to: { anchor: { type: 'fraction', value: 0.6 }, offset: { amount: 0, unit: 'Tage' } },
      },
      leadTimeDays: 7,
      prerequisites: [],
      checklist: ['Veranstaltungen vollständig erfasst', 'Fehlende Nachweise erfragt'],
      help: 'Vorgesehen sind mindestens 200 Stunden bei 18 Monaten und 300 Stunden bei 24 Monaten. Ein Zwischenblick zur Halbzeit zeigt früh, ob etwas fehlt.',
      source: QUELLE_VO,
      mandatory: false,
      major: false,
      order: 155,
    }),
    milestone({
      id: 'themenbekanntgabe',
      title: 'Themenbekanntgabe für die Prüfungslehrproben',
      description: 'Bekanntgabe der Themen vor dem Prüfungstag – 10 beziehungsweise 5 Werktage vorher.',
      category: 'Prüfung',
      phaseId: 'pruefungsvorbereitung',
      dateRule: {
        kind: 'relativ',
        anchor: { type: 'milestone', milestoneId: 'pruefung-unterricht' },
        offset: { amount: -14, unit: 'Tage' },
      },
      leadTimeDays: 7,
      prerequisites: [],
      checklist: ['Themen notiert', 'Lerngruppen und Räume geklärt'],
      help: 'Liegen beide Prüfungslehrproben an einem Tag, werden die Themen 10 Werktage vorher bekannt gegeben, bei getrenntem Ablauf 5 Werktage; Samstage zählen nicht. Der genaue Tag ergibt sich aus dem Prüfungsfahrplan im Wegweiser – dieser Termin ist nur ein Näherungswert.',
      source: QUELLE_HINWEISE,
      mandatory: true,
      major: false,
      order: 232,
    }),
    milestone({
      id: 'entwuerfe-pruefung',
      title: 'Abgabe der Entwürfe für die Prüfungslehrproben',
      description: 'Schriftliche Entwürfe am letzten Werktag vor dem Prüfungstag.',
      category: 'Prüfung',
      phaseId: 'pruefungsvorbereitung',
      dateRule: {
        kind: 'relativ',
        anchor: { type: 'milestone', milestoneId: 'pruefung-unterricht' },
        offset: { amount: -1, unit: 'Tage' },
      },
      leadTimeDays: 14,
      prerequisites: ['themenbekanntgabe'],
      checklist: [
        'Entwürfe fertiggestellt',
        'Hilfsmittelverzeichnis beigefügt',
        'Eigenständigkeitsversicherung unterschrieben',
        'Abgabe bestätigt',
        'Freistellung für den Vortag beantragt',
      ],
      help: 'Die Entwürfe sind am Vormittag des letzten Werktags vor dem Prüfungstag abzugeben, laut Hinweisen bis 12 Uhr. Umfang 8 bis 12 Seiten, Arial 12, 1,5-zeilig, Blocksatz, mit Hilfsmittelverzeichnis und Eigenständigkeitsversicherung. Eine verspätete Abgabe führt zur Wiederholung. Für den letzten Unterrichtstag ist eine Freistellung auf Antrag möglich.',
      source: QUELLE_HINWEISE,
      mandatory: true,
      major: true,
      order: 236,
    }),
    milestone({
      id: 'vornote',
      title: 'Eröffnung der Vornote',
      description: 'Festsetzung und Eröffnung der Vornote aus den Beurteilungen.',
      category: 'Beurteilung',
      phaseId: 'pruefungsvorbereitung',
      dateRule: {
        kind: 'relativ',
        anchor: { type: 'milestone', milestoneId: 'pruefung-kolloquium' },
        offset: { amount: -14, unit: 'Tage' },
      },
      leadTimeDays: 7,
      prerequisites: ['beurteilung-schulleitung', 'beurteilung-seminar'],
      checklist: ['Vornote eröffnet', 'Punktzahl im Wegweiser eingetragen'],
      help: 'Die Vornote wird aus den Beurteilungen von Fachleitungen und Schulleitung festgesetzt und spätestens 14 Tage vor der letzten Prüfung eröffnet. Sie zählt in der Gesamtnote fünffach.',
      source: QUELLE_VO,
      mandatory: true,
      major: false,
      order: 245,
    }),
  ];

  const base = structuredClone(DEMO_MILESTONES)
    .filter((definition) => !removed.has(definition.id))
    .map((definition) => {
      const patch = patches[definition.id];
      if (!patch) return definition;
      const { checklist, ...rest } = patch;
      return {
        ...definition,
        ...rest,
        checklist: checklist
          ? checklist.map((label, index) => ({ id: `${definition.id}-c${index + 1}`, label }))
          : definition.checklist,
      };
    });

  return [...base, ...additions].sort((a, b) => a.order - b.order);
}

/** Etappen mit Thüringer Ergänzungen im Roadbook. */
function thueringenPhases(): TrainingPhase[] {
  const additions: Record<string, Partial<Record<keyof RoadbookEntry, string[]>>> = {
    start: {
      expectations: ['Der Ausbildungsunterricht besteht zunächst aus Hospitation im Umfang von rund 15 Wochenstunden.'],
      support: ['Regionalstelle des Studienseminars (Erfurt, Gera, Nordhausen, Eisenach oder Meiningen)'],
      documents: ['Ausbildungsplan des Studienseminars'],
    },
    praxis: {
      expectations: ['Ab der vierten Unterrichtswoche kommen 4 bis 6 Wochenstunden angeleiteter Unterricht hinzu.'],
    },
    eigenverantwortung: {
      expectations: ['Die Beauftragung mit selbstständigem Unterricht erfolgt in der Regel nach sechs Unterrichtswochen.'],
    },
    ausbildungsgespraeche: {
      expectations: ['Bis zum Ende der ersten Hälfte des Vorbereitungsdienstes findet ein Gespräch zum Ausbildungsstand statt.'],
    },
    lehrprobe: {
      expectations: ['Eine der beiden benoteten Lehrproben findet in der gymnasialen Oberstufe statt, in der Regel im Kurssystem.'],
      documents: ['Niederschrift der Lehrprobe (Kopie)', 'Formblatt F010'],
    },
    beurteilung: {
      expectations: ['Fachleitungen und Schulleitung beurteilen mit Notenvorschlag; daraus wird die Vornote festgesetzt.'],
    },
    pruefungsvorbereitung: {
      expectations: [
        'Die Themen der Prüfungslehrproben werden 10 beziehungsweise 5 Werktage vor dem Prüfungstag bekannt gegeben.',
      ],
      documents: [
        'Entwürfe mit Hilfsmittelverzeichnis und Eigenständigkeitsversicherung',
        'Formblätter F220, F225 und F230',
      ],
    },
    staatspruefung: {
      expectations: ['Die mündliche Prüfung besteht aus zwei Teilprüfungen von je 30 Minuten.'],
      documents: ['Formblatt F250', 'Schulrechtsgrundlagen als zulässiges Hilfsmittel'],
    },
    abschluss: {
      documents: ['Zeugnis, auf Wunsch zusätzlich als digitales Zeugnis'],
    },
  };

  return structuredClone(DEMO_PHASES).map((phase) => {
    const addition = additions[phase.id];
    if (!addition) return phase;
    const roadbook = { ...phase.roadbook };
    for (const [key, values] of Object.entries(addition) as [keyof RoadbookEntry, string[]][]) {
      roadbook[key] = [...roadbook[key], ...values];
    }
    return { ...phase, roadbook };
  });
}

interface TemplateSeed {
  id: string;
  title: string;
  federalState?: FederalState;
  schoolTypes: SchoolType[];
  durations: number[];
  notes: string;
  validAsOf?: string;
  phases?: TrainingPhase[];
  milestones?: MilestoneDefinition[];
  teachingLoad?: TeachingLoadModel;
  seminarRequirements?: SeminarRequirement[];
  formSets?: FormSet[];
  examDeadlines?: ExamDeadlineModel;
  gradeModel?: GradeModel;
  framework?: FrameworkNote[];
  source?: string;
}

/** Version der mitgelieferten Vorlagen – steuert deren Aktualisierung. */
export const DEMO_TEMPLATE_VERSION = '0.2.0-demo';

function buildTemplate(seed: TemplateSeed): TrainingTemplate {
  return {
    id: seed.id,
    title: seed.title,
    version: DEMO_TEMPLATE_VERSION,
    validAsOf: seed.validAsOf ?? 'Stand September 2026',
    federalState: seed.federalState,
    schoolTypes: seed.schoolTypes,
    durations: seed.durations,
    demo: true,
    source: seed.source ?? DEMO_NOTE,
    notes: seed.notes,
    phases: seed.phases ?? structuredClone(DEMO_PHASES),
    milestones: seed.milestones ?? structuredClone(DEMO_MILESTONES),
    challengeRules: structuredClone(DEFAULT_CHALLENGE_RULES),
    teachingLoad: seed.teachingLoad,
    seminarRequirements: seed.seminarRequirements,
    formSets: seed.formSets,
    examDeadlines: seed.examDeadlines,
    gradeModel: seed.gradeModel,
    framework: seed.framework,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

/** Alle mitgelieferten Vorlagen. */
export function createDemoTemplates(): TrainingTemplate[] {
  return [
    buildTemplate({
      id: 'demo-thueringen-gymnasium',
      title: 'Thüringen – Gymnasium und Regelschule – Stand September 2026 (Beispielvorlage)',
      federalState: 'Thüringen',
      schoolTypes: ['Gymnasium', 'Gesamtschule', 'Gemeinschaftsschule', 'Regelschule'],
      durations: [12, 18, 24],
      notes: THUERINGEN_NOTE,
      source: `${QUELLE_VO} ${QUELLE_HINWEISE}`,
      phases: thueringenPhases(),
      milestones: thueringenMilestones(),
      teachingLoad: structuredClone(THUERINGEN_TEACHING_LOAD),
      seminarRequirements: structuredClone(THUERINGEN_SEMINAR_REQUIREMENTS),
      formSets: structuredClone(THUERINGEN_FORM_SETS),
      examDeadlines: structuredClone(THUERINGEN_EXAM_DEADLINES),
      gradeModel: structuredClone(THUERINGEN_GRADE_MODEL),
      framework: structuredClone(THUERINGEN_FRAMEWORK),
    }),
    buildTemplate({
      id: 'demo-grundschule',
      title: 'Allgemein – Grundschule und Förderschule – Stand September 2026 (Demodaten)',
      schoolTypes: ['Grundschule', 'Förderschule'],
      durations: [12, 18, 24],
      notes: DEMO_NOTE,
    }),
    buildTemplate({
      id: 'demo-allgemein',
      title: 'Allgemein – alle Schularten – Stand September 2026 (Demodaten)',
      schoolTypes: [
        'Grundschule',
        'Regelschule',
        'Gemeinschaftsschule',
        'Gesamtschule',
        'Gymnasium',
        'Berufsbildende Schule',
        'Förderschule',
      ],
      durations: [12, 18, 24, 36],
      notes: DEMO_NOTE,
    }),
  ];
}

/** Wählt eine passende Vorlage anhand von Bundesland, Schulart und Dauer. */
export function suggestTemplateId(
  templates: TrainingTemplate[],
  federalState: string,
  schoolType: SchoolType,
  durationMonths: number,
): string {
  const score = (t: TrainingTemplate): number => {
    let value = 0;
    if (t.federalState === federalState) value += 4;
    if (t.schoolTypes.includes(schoolType)) value += 2;
    if (t.durations.includes(durationMonths)) value += 1;
    return value;
  };
  const sorted = [...templates].sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1));
  return sorted[0]?.id ?? 'demo-allgemein';
}

export { DEMO_NOTE };
