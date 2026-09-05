/**
 * Zentrale Datentypen von FormuleProf.
 *
 * Die Typen sind bewusst frei von UI- und Speicherdetails. Berechnungen
 * (Termine, Priorisierung, Herausforderungen) arbeiten ausschliesslich auf
 * diesen Strukturen.
 */

/** Datum im Format `yyyy-MM-dd` (lokale Kalenderdaten, keine Zeitzonen). */
export type IsoDate = string;
/** Zeitstempel im ISO-8601-Format inklusive Uhrzeit. */
export type IsoDateTime = string;

export const SCHEMA_VERSION = 1;
export const APP_VERSION = '0.1.0';
export const APP_NAME = 'FormuleProf';
export const APP_SUBTITLE = 'Dein persönlicher Weg durch den Vorbereitungsdienst';

/* ------------------------------------------------------------------ */
/* Stammdaten                                                          */
/* ------------------------------------------------------------------ */

export const FEDERAL_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
] as const;
export type FederalState = (typeof FEDERAL_STATES)[number];

export const SCHOOL_TYPES = [
  'Grundschule',
  'Regelschule',
  'Gemeinschaftsschule',
  'Gesamtschule',
  'Gymnasium',
  'Berufsbildende Schule',
  'Förderschule',
] as const;
export type SchoolType = (typeof SCHOOL_TYPES)[number];

export const TRAINING_FORMS = [
  'regulär',
  'verkürzt',
  'Teilzeit',
  'Seiteneinstieg',
  'Nachqualifizierung',
] as const;
export type TrainingForm = (typeof TRAINING_FORMS)[number];

export const MILESTONE_CATEGORIES = [
  'Orientierung',
  'Unterricht',
  'Unterrichtsbesuch',
  'Ausbildungsgespräch',
  'Lehrprobe',
  'Beurteilung',
  'Prüfung',
  'Seminar',
  'Organisation',
] as const;
export type MilestoneCategory = (typeof MILESTONE_CATEGORIES)[number];

export const MILESTONE_STATUSES = [
  'offen',
  'in Arbeit',
  'erledigt',
  'verschoben',
  'entfällt',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/** Abgeleiteter Streckenzustand – nur für die Darstellung. */
export type TrackState =
  | 'abgeschlossen'
  | 'aktuell'
  | 'als Nächstes'
  | 'später'
  | 'überfällig'
  | 'verschoben'
  | 'entfällt';

/* ------------------------------------------------------------------ */
/* Terminregeln                                                        */
/* ------------------------------------------------------------------ */

export type DateUnit = 'Tage' | 'Wochen' | 'Monate';

/** Bezugspunkt einer relativen Terminregel. */
export type DateAnchor =
  /** Ausbildungsbeginn. */
  | { type: 'start' }
  /** Ausbildungsende. */
  | { type: 'end' }
  /** Ein anderer Meilenstein (Abhängigkeit). */
  | { type: 'milestone'; milestoneId: string; edge?: 'start' | 'end' }
  /** Beginn oder Ende einer Ausbildungsphase. */
  | { type: 'phase'; phaseId: string; edge: 'start' | 'end' }
  /** Anteil der Gesamtdauer, z. B. 1/3 für das erste Ausbildungsdrittel. */
  | { type: 'fraction'; value: number };

export interface DateOffset {
  amount: number;
  unit: DateUnit;
}

/**
 * Terminregel eines Meilensteins. Jede Regel wird zu einem Zeitraum
 * (`start`/`end`) aufgelöst; bei Punktterminen sind beide Werte gleich.
 */
export type DateRule =
  /** Fester Kalendertermin, optional mit Zeitfenster. */
  | { kind: 'absolut'; date: IsoDate; endDate?: IsoDate }
  /** Relativ zu einem Bezugspunkt (Beginn, Ende, Phase, anderer Meilenstein). */
  | { kind: 'relativ'; anchor: DateAnchor; offset: DateOffset; windowDays?: number }
  /** Frei definierbares Zeitfenster zwischen zwei Bezugspunkten. */
  | {
      kind: 'zeitfenster';
      from: { anchor: DateAnchor; offset: DateOffset };
      to: { anchor: DateAnchor; offset: DateOffset };
    }
  /** Zuordnung zu einem Ausbildungsdrittel (1–3). */
  | { kind: 'drittel'; third: 1 | 2 | 3 }
  /** Zuordnung zu einer Ausbildungsphase (gesamtes Phasenfenster). */
  | { kind: 'phase'; phaseId: string };

/** Bedingte Gültigkeit eines Meilensteins. */
export interface MilestoneConditions {
  schoolTypes?: SchoolType[];
  trainingForms?: TrainingForm[];
  federalStates?: FederalState[];
  minDurationMonths?: number;
  maxDurationMonths?: number;
  minSubjects?: number;
}

/* ------------------------------------------------------------------ */
/* Vorlage, Phasen, Meilensteindefinitionen                            */
/* ------------------------------------------------------------------ */

export interface ChecklistItemDefinition {
  id: string;
  label: string;
}

export interface TrainingPhase {
  id: string;
  title: string;
  /** Kurzbeschreibung der Etappe. */
  summary: string;
  /** Anteil der Gesamtdauer, ab dem die Phase beginnt (0–1). */
  fromFraction: number;
  /** Anteil der Gesamtdauer, an dem die Phase endet (0–1). */
  toFraction: number;
  /** Anspruchsvolle Passage – auf der Strecke als Kurve dargestellt. */
  demanding?: boolean;
  roadbook: RoadbookEntry;
}

/** Handlungsorientierte Informationen einer Etappe (Roadbook). */
export interface RoadbookEntry {
  /** Was wird erwartet? */
  expectations: string[];
  /** Was sollte vorbereitet werden? */
  preparation: string[];
  /** Welche Unterlagen werden benötigt? */
  documents: string[];
  /** Welche typischen Unsicherheiten können auftreten? */
  uncertainties: string[];
  /** Wer kann unterstützen? */
  support: string[];
  /** Welche Erfahrungen aus vorherigen Etappen sind relevant? */
  carryOver: string[];
}

export interface MilestoneDefinition {
  id: string;
  title: string;
  /** Kurzbeschreibung. */
  description: string;
  category: MilestoneCategory;
  /** Zugeordnete Ausbildungsphase. */
  phaseId: string;
  dateRule: DateRule;
  /** Frühester zulässiger Zeitpunkt (Begrenzung der Regelauflösung). */
  earliest?: DateRule;
  /** Spätester zulässiger Zeitpunkt (Begrenzung der Regelauflösung). */
  latest?: DateRule;
  /** Empfohlener Vorlauf in Tagen. */
  leadTimeDays: number;
  /** IDs von Meilensteinen, die zuvor erledigt sein sollten. */
  prerequisites: string[];
  checklist: ChecklistItemDefinition[];
  /** Hilfetext / Hinweise. */
  help: string;
  /** Optionale Quellenangabe. */
  source?: string;
  conditions?: MilestoneConditions;
  /** Verbindlicher Termin (Pflichttermin) oder empfohlener Schritt. */
  mandatory: boolean;
  /** Grosser Termin – relevant für die Überschneidungserkennung. */
  major?: boolean;
  /** Sortierschlüssel für deterministische Reihenfolge bei gleichem Datum. */
  order: number;
}

export interface TrainingTemplate {
  id: string;
  /** Sichtbare Bezeichnung, z. B. „Thüringen – Gymnasium – Stand August 2026“. */
  title: string;
  version: string;
  /** Gültigkeitsstand als Klartext. */
  validAsOf: string;
  federalState?: FederalState;
  schoolTypes: SchoolType[];
  /** Unterstützte Ausbildungsdauern in Monaten. */
  durations: number[];
  /** Kennzeichnung als unverbindliches Demomaterial. */
  demo: boolean;
  source?: string;
  notes?: string;
  phases: TrainingPhase[];
  milestones: MilestoneDefinition[];
  challengeRules: ChallengeRule[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/* ------------------------------------------------------------------ */
/* Persönliche Daten                                                   */
/* ------------------------------------------------------------------ */

export interface TrainingProfile {
  id: 'profil';
  /** Frei wählbare Bezeichnung, optional. */
  displayName?: string;
  startDate: IsoDate;
  durationMonths: number;
  federalState: FederalState;
  schoolType: SchoolType;
  trainingForm: TrainingForm;
  subjects: string[];
  /** Jahrgangscode, sofern verwendet (z. B. `02-26-18`). */
  cohortCode?: string;
  templateId: string;
  onboardingCompleted: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ChecklistItemState {
  id: string;
  label: string;
  done: boolean;
}

/**
 * Persönliche Ausprägung eines Meilensteins auf der eigenen Strecke.
 * Enthält berechnete Termine sowie alle vom Nutzer gepflegten Angaben.
 */
export interface MilestoneInstance {
  id: string;
  definitionId: string;
  templateId: string;
  title: string;
  description: string;
  category: MilestoneCategory;
  phaseId: string;
  /** Berechneter Beginn des Termins bzw. Zeitfensters. */
  computedStart: IsoDate;
  /** Berechnetes Ende des Termins bzw. Zeitfensters. */
  computedEnd: IsoDate;
  isWindow: boolean;
  /** Manuell gesetzter absoluter Termin – wird nie automatisch überschrieben. */
  manualStart?: IsoDate;
  manualEnd?: IsoDate;
  /** Ursprünglicher Termin vor einer Verschiebung. */
  previousStart?: IsoDate;
  leadTimeDays: number;
  prerequisites: string[];
  status: MilestoneStatus;
  notes: string;
  checklist: ChecklistItemState[];
  help: string;
  source?: string;
  mandatory: boolean;
  major: boolean;
  order: number;
  /** Beobachtungsschwerpunkt, vor allem bei Unterrichtsbesuchen. */
  observationFocus?: string;
  /** Von einer Fachleitung übernommener, individuell vereinbarter Termin. */
  agreed?: boolean;
  updatedAt: IsoDateTime;
}

export interface DevelopmentGoal {
  id: string;
  title: string;
  description: string;
  createdAt: IsoDateTime;
  /** Zeitpunkt der letzten Reflexion zu diesem Ziel. */
  lastReviewedAt?: IsoDateTime;
  active: boolean;
  achievedAt?: IsoDateTime;
}

export const REFLECTION_QUESTIONS = [
  { id: 'sicher', label: 'Was gelingt mir inzwischen sicher?' },
  { id: 'arbeit', label: 'Woran arbeite ich aktuell?' },
  { id: 'erprobung', label: 'Was möchte ich in der nächsten Stunde erproben?' },
  { id: 'rueckmeldung', label: 'Welche Rückmeldung war besonders hilfreich?' },
  { id: 'schritt', label: 'Welcher nächste kleine Schritt ist realistisch?' },
  { id: 'unterstuetzung', label: 'Welche Unterstützung benötige ich?' },
] as const;

export type ReflectionQuestionId = (typeof REFLECTION_QUESTIONS)[number]['id'];

/** Privater Eintrag im Boxenstopp. Verlässt das Gerät nur auf ausdrücklichen Wunsch. */
export interface ReflectionEntry {
  id: string;
  createdAt: IsoDateTime;
  date: IsoDate;
  /** Bezug zu einem Meilenstein, sofern der Boxenstopp vorgeschlagen wurde. */
  milestoneId?: string;
  goalId?: string;
  answers: Partial<Record<ReflectionQuestionId, string>>;
  /** Dokumentierte Erprobung einer Rückmeldung. */
  triedOut: boolean;
}

/* ------------------------------------------------------------------ */
/* Herausforderungen                                                   */
/* ------------------------------------------------------------------ */

export type ChallengeRuleKind =
  | 'terminhaeufung'
  | 'vorarbeitOffen'
  | 'beobachtungsschwerpunktFehlt'
  | 'zielNichtReflektiert'
  | 'rueckmeldungOhneErprobung'
  | 'pruefungsvorbereitungKollision'
  | 'vorlaufVerkuerzt'
  | 'voraussetzungOffen';

/** Regelbasierte, lokal ausgewertete Vorschau auf mögliche Herausforderungen. */
export interface ChallengeRule {
  id: string;
  kind: ChallengeRuleKind;
  title: string;
  enabled: boolean;
  /** Betrachtungszeitraum in Tagen. */
  horizonDays: number;
  /** Regelabhängige Parameter, z. B. Abstand in Tagen. */
  params?: Record<string, number>;
}

export interface ChallengeHint {
  id: string;
  ruleId: string;
  kind: ChallengeRuleKind;
  /** „Mögliche Herausforderung“. */
  challenge: string;
  /** „Warum du das siehst“. */
  why: string;
  /** „Empfohlene Reaktion“. */
  action: string;
  relatedMilestoneIds: string[];
  /** Frühester betroffener Termin – nur zur stabilen Sortierung. */
  anchorDate?: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Einstellungen und Austauschformate                                  */
/* ------------------------------------------------------------------ */

export type ThemePreference = 'system' | 'hell' | 'dunkel';

export interface AppSettings {
  theme: ThemePreference;
  /** Reflexionen in die Sicherung aufnehmen (standardmässig aus). */
  includeReflectionsInBackup: boolean;
  /** Vorschlag eines Boxenstopps nach Terminen aktivieren. */
  suggestPitStops: boolean;
  lastBackupAt?: IsoDateTime;
}

export interface AppSnapshot {
  profile: TrainingProfile | null;
  templates: TrainingTemplate[];
  milestones: MilestoneInstance[];
  goals: DevelopmentGoal[];
  reflections: ReflectionEntry[];
  settings: AppSettings;
}

export type ExportKind = 'sicherung' | 'vorlage' | 'strecke';

/** Versionierter Container aller Export-Dateien. */
export interface ExportEnvelope<T> {
  app: 'FormuleProf';
  schemaVersion: number;
  appVersion: string;
  kind: ExportKind;
  exportedAt: IsoDateTime;
  data: T;
}

export interface BackupPayload {
  profile: TrainingProfile | null;
  templates: TrainingTemplate[];
  milestones: MilestoneInstance[];
  goals: DevelopmentGoal[];
  reflections: ReflectionEntry[];
  settings: AppSettings;
}

/**
 * Austauschformat für Streckendateien – vorbereitet für den späteren
 * Austausch mit der App „Carnet de formation“. Es findet ausdrücklich keine
 * Netzwerk- oder Cloudverbindung statt; der Austausch erfolgt über Dateien.
 */
export interface RouteExport {
  templateId: string;
  templateTitle: string;
  templateVersion: string;
  cohort?: string;
  startDate: IsoDate;
  durationMonths: number;
  trainingForm: TrainingForm;
  federalState?: FederalState;
  schoolType?: SchoolType;
  subjects?: string[];
  /** Offizielle Meilensteine der Vorlage. */
  officialMilestones: RouteMilestone[];
  /** Individuell vereinbarte Termine. */
  agreedMilestones: RouteMilestone[];
}

export interface RouteMilestone {
  id: string;
  title: string;
  description?: string;
  category: MilestoneCategory;
  phaseId?: string;
  start: IsoDate;
  end?: IsoDate;
  leadTimeDays?: number;
  mandatory?: boolean;
  major?: boolean;
  prerequisites?: string[];
  source?: string;
}
