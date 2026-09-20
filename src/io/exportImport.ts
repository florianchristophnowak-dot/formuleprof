/**
 * Import und Export. Alle Dateien sind versioniert und werden beim Import
 * gegen Schema und Version geprüft.
 *
 * Private Reflexionen sind niemals Teil eines automatischen Exports. Sie
 * werden nur mitgesichert, wenn dies ausdrücklich ausgewählt wurde.
 */
import { APP_VERSION, SCHEMA_VERSION } from '../domain/types';
import type {
  AppSettings,
  AppSnapshot,
  BackupPayload,
  ContactEntry,
  DevelopmentGoal,
  DocumentRecord,
  ExamPlan,
  ExportEnvelope,
  ExportKind,
  GradeRecord,
  MilestoneInstance,
  ReflectionEntry,
  SeminarRecord,
  TeachingWeekEntry,
  TrainingProfile,
  TrainingTemplate,
} from '../domain/types';
import { DEFAULT_SETTINGS } from '../data/repository';

/**
 * Leere Bereiche des Wegweisers. Sicherungen älterer Schemaversionen kennen
 * diese Bereiche nicht; sie werden dann leer angelegt.
 */
export const EMPTY_REGISTERS = {
  teachingWeeks: [] as TeachingWeekEntry[],
  seminarRecords: [] as SeminarRecord[],
  documents: [] as DocumentRecord[],
  contacts: [] as ContactEntry[],
  examPlan: null as ExamPlan | null,
  grades: null as GradeRecord | null,
};

export class ImportError extends Error {}

export type ImportMode = 'ersetzen' | 'zusammenfuehren';

function envelope<T>(kind: ExportKind, data: T, now: Date): ExportEnvelope<T> {
  return {
    app: 'FormuleProf',
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    kind,
    exportedAt: now.toISOString(),
    data,
  };
}

/**
 * Vollständige Sicherung: Profil, Vorlagen, Strecke und alle Bereiche des
 * Wegweisers. Reflexionen nur bei ausdrücklicher Zustimmung.
 */
export function buildBackup(
  snapshot: AppSnapshot,
  options: { includeReflections: boolean },
  now: Date = new Date(),
): ExportEnvelope<BackupPayload> {
  return envelope<BackupPayload>(
    'sicherung',
    {
      profile: snapshot.profile,
      templates: snapshot.templates,
      milestones: snapshot.milestones,
      goals: snapshot.goals,
      reflections: options.includeReflections ? snapshot.reflections : [],
      teachingWeeks: snapshot.teachingWeeks,
      seminarRecords: snapshot.seminarRecords,
      documents: snapshot.documents,
      contacts: snapshot.contacts,
      examPlan: snapshot.examPlan,
      grades: snapshot.grades,
      settings: snapshot.settings,
    },
    now,
  );
}

export function buildTemplateExport(
  template: TrainingTemplate,
  now: Date = new Date(),
): ExportEnvelope<TrainingTemplate> {
  return envelope('vorlage', template, now);
}

/* ----------------------------- Prüfungen ----------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Prüft Hülle, App-Kennung, Schemaversion und Art der Datei. */
export function parseEnvelope<T>(raw: string, expected?: ExportKind): ExportEnvelope<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ImportError('Die Datei enthält kein gültiges JSON.');
  }
  if (!isRecord(parsed)) throw new ImportError('Die Datei hat nicht die erwartete Struktur.');
  if (parsed.app !== 'FormuleProf') {
    throw new ImportError('Die Datei stammt nicht aus FormuleProf.');
  }
  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== 'number') {
    throw new ImportError('In der Datei fehlt die Angabe zur Schemaversion.');
  }
  if (schemaVersion > SCHEMA_VERSION) {
    throw new ImportError(
      `Die Datei wurde mit einer neueren Version erstellt (Schema ${schemaVersion}, unterstützt wird ${SCHEMA_VERSION}). Bitte aktualisiere FormuleProf.`,
    );
  }
  const kind = parsed.kind;
  if (typeof kind !== 'string') throw new ImportError('In der Datei fehlt die Angabe zur Art des Exports.');
  if (expected && kind !== expected) {
    throw new ImportError(`Erwartet wurde eine Datei der Art „${expected}“, gefunden wurde „${kind}“.`);
  }
  if (!('data' in parsed)) throw new ImportError('Die Datei enthält keine Daten.');
  return parsed as unknown as ExportEnvelope<T>;
}

function requireArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) throw new ImportError(`Der Abschnitt „${label}“ fehlt oder ist fehlerhaft.`);
  return value as T[];
}

/** Liest eine Sicherungsdatei und stellt einen vollständigen Zustand her. */
export function parseBackup(raw: string): AppSnapshot {
  const parsed = parseEnvelope<BackupPayload>(raw, 'sicherung');
  const data = parsed.data;
  if (!isRecord(data)) throw new ImportError('Die Sicherung enthält keine auswertbaren Daten.');

  const templates = requireArray<TrainingTemplate>(data.templates, 'Vorlagen');
  const milestones = requireArray<MilestoneInstance>(data.milestones, 'Meilensteine');
  const goals = requireArray<DevelopmentGoal>(data.goals, 'Entwicklungsziele');
  const reflections = requireArray<ReflectionEntry>(data.reflections ?? [], 'Reflexionen');

  const profile = (data.profile ?? null) as TrainingProfile | null;
  if (profile !== null && !isRecord(profile)) throw new ImportError('Das Profil ist fehlerhaft.');
  if (profile && (typeof profile.startDate !== 'string' || typeof profile.durationMonths !== 'number')) {
    throw new ImportError('Im Profil fehlen Ausbildungsbeginn oder Ausbildungsdauer.');
  }

  for (const template of templates) {
    if (!template?.id || !Array.isArray(template.milestones) || !Array.isArray(template.phases)) {
      throw new ImportError('Mindestens eine Vorlage ist unvollständig.');
    }
  }

  return {
    profile,
    templates,
    milestones,
    goals,
    reflections,
    // Bereiche des Wegweisers – in Sicherungen der Schemaversion 1 nicht enthalten.
    teachingWeeks: requireArray<TeachingWeekEntry>(data.teachingWeeks ?? [], 'Unterrichtseinsatz'),
    seminarRecords: requireArray<SeminarRecord>(data.seminarRecords ?? [], 'Ausbildungsstunden'),
    documents: requireArray<DocumentRecord>(data.documents ?? [], 'Unterlagen'),
    contacts: requireArray<ContactEntry>(data.contacts ?? [], 'Ansprechpersonen'),
    examPlan: (data.examPlan ?? null) as ExamPlan | null,
    grades: (data.grades ?? null) as GradeRecord | null,
    settings: { ...DEFAULT_SETTINGS, ...((data.settings ?? {}) as Partial<AppSettings>) },
  };
}

export function parseTemplateFile(raw: string): TrainingTemplate {
  const parsed = parseEnvelope<TrainingTemplate>(raw, 'vorlage');
  const template = parsed.data;
  if (!isRecord(template) || !template.id || !Array.isArray(template.phases) || !Array.isArray(template.milestones)) {
    throw new ImportError('Die Vorlagendatei ist unvollständig.');
  }
  return template;
}

/**
 * Führt einen importierten Zustand mit dem vorhandenen zusammen.
 * Bei gleicher ID gewinnt der importierte Eintrag.
 */
export function mergeSnapshots(current: AppSnapshot, imported: AppSnapshot): AppSnapshot {
  const mergeById = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const map = new Map(a.map((item) => [item.id, item]));
    for (const item of b) map.set(item.id, item);
    return [...map.values()];
  };

  return {
    profile: imported.profile ?? current.profile,
    templates: mergeById(current.templates, imported.templates),
    milestones: mergeById(current.milestones, imported.milestones),
    goals: mergeById(current.goals, imported.goals),
    reflections: mergeById(current.reflections, imported.reflections),
    teachingWeeks: mergeById(current.teachingWeeks, imported.teachingWeeks),
    seminarRecords: mergeById(current.seminarRecords, imported.seminarRecords),
    documents: mergeById(current.documents, imported.documents),
    contacts: mergeById(current.contacts, imported.contacts),
    examPlan: imported.examPlan ?? current.examPlan,
    grades: imported.grades ?? current.grades,
    settings: { ...current.settings, ...imported.settings },
  };
}

/** Dateiname mit Datum, z. B. `formuleprof-sicherung-2026-09-04.json`. */
export function exportFileName(kind: ExportKind, now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return `formuleprof-${kind}-${date}.json`;
}

export function toJsonString(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
