/**
 * Austauschformat für Streckendateien.
 *
 * Vorbereitet für den späteren Austausch mit der App „Carnet de formation“.
 * Der Austausch erfolgt ausschliesslich über Dateien – es besteht keinerlei
 * Netzwerk- oder Cloudverbindung. Private Reflexionen sind nicht Teil des
 * Formats.
 */
import { APP_VERSION, SCHEMA_VERSION } from '../domain/types';
import type {
  ExportEnvelope,
  MilestoneInstance,
  RouteExport,
  RouteMilestone,
  TrainingProfile,
  TrainingTemplate,
} from '../domain/types';
import { effectiveEnd, effectiveStart } from '../domain/schedule';
import { ImportError, parseEnvelope } from './exportImport';
import { formatCohortCode } from '../domain/cohortCode';
import { fromIso } from '../domain/dates';

function toRouteMilestone(milestone: MilestoneInstance): RouteMilestone {
  const start = effectiveStart(milestone);
  const end = effectiveEnd(milestone);
  return {
    id: milestone.definitionId,
    title: milestone.title,
    description: milestone.description,
    category: milestone.category,
    phaseId: milestone.phaseId,
    start,
    end: end !== start ? end : undefined,
    leadTimeDays: milestone.leadTimeDays,
    mandatory: milestone.mandatory,
    major: milestone.major,
    prerequisites: milestone.prerequisites,
    source: milestone.source,
  };
}

/** Erzeugt eine Streckendatei aus Profil, Vorlage und persönlichen Terminen. */
export function buildRouteExport(
  profile: TrainingProfile,
  template: TrainingTemplate,
  milestones: MilestoneInstance[],
  now: Date = new Date(),
): ExportEnvelope<RouteExport> {
  const start = fromIso(profile.startDate);
  const official = milestones.filter((m) => !m.agreed && m.templateId === template.id);
  const agreed = milestones.filter((m) => m.agreed || m.templateId !== template.id);

  const data: RouteExport = {
    templateId: template.id,
    templateTitle: template.title,
    templateVersion: template.version,
    cohort:
      profile.cohortCode ??
      formatCohortCode(start.getMonth() + 1, start.getFullYear(), profile.durationMonths),
    startDate: profile.startDate,
    durationMonths: profile.durationMonths,
    trainingForm: profile.trainingForm,
    federalState: profile.federalState,
    schoolType: profile.schoolType,
    subjects: profile.subjects,
    officialMilestones: official.map(toRouteMilestone),
    agreedMilestones: agreed.map(toRouteMilestone),
  };

  return {
    app: 'FormuleProf',
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    kind: 'strecke',
    exportedAt: now.toISOString(),
    data,
  };
}

/** Liest eine von der Fachleitung vorbereitete Streckendatei. */
export function parseRouteFile(raw: string): RouteExport {
  const parsed = parseEnvelope<RouteExport>(raw, 'strecke');
  const route = parsed.data;
  if (!route || typeof route !== 'object') throw new ImportError('Die Streckendatei ist leer.');
  if (typeof route.startDate !== 'string' || typeof route.durationMonths !== 'number') {
    throw new ImportError('In der Streckendatei fehlen Beginn oder Dauer.');
  }
  if (!Array.isArray(route.officialMilestones)) {
    throw new ImportError('In der Streckendatei fehlen die offiziellen Meilensteine.');
  }
  if (route.agreedMilestones && !Array.isArray(route.agreedMilestones)) {
    throw new ImportError('Die individuell vereinbarten Termine sind fehlerhaft.');
  }
  return route;
}

/**
 * Wandelt eine Streckendatei in persönliche Meilensteine um. Die enthaltenen
 * Termine gelten als verbindlich vereinbart und werden daher als manuelle
 * Termine übernommen.
 */
export function routeToMilestones(route: RouteExport, templateId: string, now: Date = new Date()): MilestoneInstance[] {
  const all = [
    ...route.officialMilestones.map((m) => ({ milestone: m, agreed: false })),
    ...(route.agreedMilestones ?? []).map((m) => ({ milestone: m, agreed: true })),
  ];

  return all.map(({ milestone, agreed }, index) => ({
    id: `${templateId}::${milestone.id}`,
    definitionId: milestone.id,
    templateId,
    title: milestone.title,
    description: milestone.description ?? '',
    category: milestone.category,
    phaseId: milestone.phaseId ?? 'start',
    computedStart: milestone.start,
    computedEnd: milestone.end ?? milestone.start,
    isWindow: Boolean(milestone.end && milestone.end !== milestone.start),
    manualStart: milestone.start,
    manualEnd: milestone.end,
    leadTimeDays: milestone.leadTimeDays ?? 14,
    prerequisites: milestone.prerequisites ?? [],
    status: 'offen',
    notes: '',
    checklist: [],
    help: '',
    source: milestone.source,
    mandatory: milestone.mandatory ?? true,
    major: milestone.major ?? false,
    order: (index + 1) * 10,
    agreed,
    updatedAt: now.toISOString(),
  }));
}
