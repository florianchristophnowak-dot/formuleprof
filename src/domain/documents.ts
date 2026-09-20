/**
 * Unterlagen und Formulare.
 *
 * Die Vorlage kennt Formularsätze je Terminart (etwa Niederschrift und
 * Formblatt zur Lehrprobe). Daraus entstehen Vorschläge, die in den eigenen
 * Bestand übernommen werden können. Gepflegt wird der Bestand ausschliesslich
 * von Hand – es wird nichts automatisch als vorhanden angenommen.
 */
import { daysBetween } from './dates';
import { effectiveStart } from './schedule';
import type {
  DocumentRecord,
  DocumentStatus,
  FormDefinition,
  FormSet,
  IsoDate,
  MilestoneInstance,
  TrainingTemplate,
} from './types';

/** Ein Formular, das zu einem Termin der eigenen Strecke gehört. */
export interface FormSuggestion {
  id: string;
  formSetId: string;
  formSetTitle: string;
  code?: string;
  title: string;
  responsible?: string;
  note?: string;
  milestoneId: string;
  milestoneTitle: string;
  milestoneStart: IsoDate;
  source?: string;
}

export interface DocumentSummary {
  total: number;
  byStatus: Record<DocumentStatus, number>;
  /** Offene Unterlagen (noch nicht vorhanden oder abgegeben). */
  open: DocumentRecord[];
  /** Vorschläge aus den Formularsätzen, die noch nicht erfasst sind. */
  suggestions: FormSuggestion[];
  /** Vorschläge zu Terminen innerhalb des Betrachtungszeitraums. */
  upcomingSuggestions: FormSuggestion[];
}

export const OPEN_STATUSES: DocumentStatus[] = ['benötigt', 'in Arbeit'];

/** Formularsätze, die zu einem Meilenstein der eigenen Strecke gehören. */
export function formSetsForMilestone(template: TrainingTemplate | null, milestone: MilestoneInstance): FormSet[] {
  return (template?.formSets ?? []).filter((set) => appliesToMilestone(set, milestone));
}

function appliesToMilestone(set: FormSet, milestone: MilestoneInstance): boolean {
  if (!set.categories.includes(milestone.category)) return false;
  if (set.milestoneIds && set.milestoneIds.length > 0) return set.milestoneIds.includes(milestone.definitionId);
  return true;
}

function suggestionId(milestoneId: string, form: FormDefinition): string {
  return `${milestoneId}::${form.code ?? form.title}`;
}

function matchesRecord(record: DocumentRecord, milestoneId: string, form: FormDefinition): boolean {
  if (record.milestoneId !== milestoneId) return false;
  if (form.code && record.code) return record.code === form.code;
  return record.title === form.title;
}

/** Alle Formulare, die zu den Terminen der Strecke gehören. */
export function collectFormSuggestions(
  template: TrainingTemplate | null,
  milestones: MilestoneInstance[],
): FormSuggestion[] {
  if (!template?.formSets || template.formSets.length === 0) return [];
  const suggestions: FormSuggestion[] = [];

  for (const milestone of milestones) {
    if (milestone.status === 'entfällt') continue;
    for (const set of template.formSets) {
      if (!appliesToMilestone(set, milestone)) continue;
      for (const form of set.forms) {
        suggestions.push({
          id: suggestionId(milestone.id, form),
          formSetId: set.id,
          formSetTitle: set.title,
          code: form.code,
          title: form.title,
          responsible: form.responsible,
          note: form.note,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          milestoneStart: effectiveStart(milestone),
          source: set.source,
        });
      }
    }
  }

  return suggestions.sort((a, b) =>
    a.milestoneStart < b.milestoneStart ? -1 : a.milestoneStart > b.milestoneStart ? 1 : a.id < b.id ? -1 : 1,
  );
}

export function summarizeDocuments(
  template: TrainingTemplate | null,
  milestones: MilestoneInstance[],
  documents: DocumentRecord[],
  todayIso: IsoDate,
  horizonDays = 60,
): DocumentSummary {
  const byStatus: Record<DocumentStatus, number> = {
    benötigt: 0,
    'in Arbeit': 0,
    vorhanden: 0,
    abgegeben: 0,
  };
  for (const document of documents) byStatus[document.status] += 1;

  const suggestions = collectFormSuggestions(template, milestones).filter(
    (suggestion) => !documents.some((record) => matchesRecord(record, suggestion.milestoneId, suggestion)),
  );

  return {
    total: documents.length,
    byStatus,
    open: documents
      .filter((document) => OPEN_STATUSES.includes(document.status))
      .sort((a, b) => (a.date ?? '9999-12-31').localeCompare(b.date ?? '9999-12-31')),
    suggestions,
    upcomingSuggestions: suggestions.filter((suggestion) => {
      const days = daysBetween(todayIso, suggestion.milestoneStart);
      return days >= -14 && days <= horizonDays;
    }),
  };
}

/** Erzeugt einen Eintrag aus einem Vorschlag. */
export function documentFromSuggestion(
  suggestion: FormSuggestion,
  status: DocumentStatus = 'benötigt',
  now: Date = new Date(),
): DocumentRecord {
  return {
    id: `unterlage-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: suggestion.title,
    code: suggestion.code,
    milestoneId: suggestion.milestoneId,
    formSetId: suggestion.formSetId,
    status,
    responsible: suggestion.responsible,
    note: suggestion.note,
    updatedAt: now.toISOString(),
  };
}
