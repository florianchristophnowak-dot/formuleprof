/**
 * Terminberechnung: Aus einer Vorlage (`TrainingTemplate`) und einem Profil
 * (`TrainingProfile`) entsteht die persönliche Strecke aus `MilestoneInstance`.
 *
 * Grundregeln:
 *  - Terminregeln werden rekursiv aufgelöst (Abhängigkeiten zwischen
 *    Meilensteinen eingeschlossen, mit Zykluserkennung).
 *  - Manuell gesetzte absolute Termine bleiben bei einer Neuberechnung
 *    unverändert; abhängige Termine folgen ihnen automatisch.
 */
import {
  addOffset,
  clampIso,
  dateAtFraction,
  daysBetween,
  fromIso,
  toIso,
  trainingEndDate,
} from './dates';
import type {
  DateAnchor,
  DateRule,
  IsoDate,
  MilestoneDefinition,
  MilestoneInstance,
  TrainingPhase,
  TrainingProfile,
  TrainingTemplate,
} from './types';

export interface ResolvedRange {
  start: IsoDate;
  end: IsoDate;
  isWindow: boolean;
}

export interface ScheduleContext {
  startDate: IsoDate;
  durationMonths: number;
  endDate: IsoDate;
  phases: TrainingPhase[];
  definitions: Map<string, MilestoneDefinition>;
  /** Manuell gesetzte Termine je Definition – haben Vorrang. */
  manualDates: Map<string, { start: IsoDate; end?: IsoDate }>;
}

export function createScheduleContext(
  template: TrainingTemplate,
  profile: Pick<TrainingProfile, 'startDate' | 'durationMonths'>,
  manualDates: Map<string, { start: IsoDate; end?: IsoDate }> = new Map(),
): ScheduleContext {
  return {
    startDate: profile.startDate,
    durationMonths: profile.durationMonths,
    endDate: trainingEndDate(profile.startDate, profile.durationMonths),
    phases: template.phases,
    definitions: new Map(template.milestones.map((m) => [m.id, m])),
    manualDates,
  };
}

/* --------------------------- Phasenfenster --------------------------- */

export interface PhaseBoundary {
  phase: TrainingPhase;
  start: IsoDate;
  end: IsoDate;
}

/**
 * Berechnet die Zeitfenster aller Etappen. Aneinandergrenzende Etappen
 * überschneiden sich nicht: Eine Etappe endet am Tag vor dem Beginn der
 * nächsten. Dadurch gehört jeder Termin zu genau einer Etappe.
 */
export function phaseBoundaries(
  phases: TrainingPhase[],
  startDate: IsoDate,
  durationMonths: number,
): PhaseBoundary[] {
  const sorted = [...phases].sort((a, b) => a.fromFraction - b.fromFraction);
  const trainingEnd = trainingEndDate(startDate, durationMonths);

  return sorted.map((phase, index) => {
    const start = dateAtFraction(startDate, durationMonths, phase.fromFraction);
    const ownEnd = dateAtFraction(startDate, durationMonths, phase.toFraction);
    const next = sorted[index + 1];
    let end = ownEnd;
    if (next) {
      const nextStart = dateAtFraction(startDate, durationMonths, next.fromFraction);
      if (nextStart <= ownEnd) end = toIso(addOffset(fromIso(nextStart), { amount: -1, unit: 'Tage' }));
    } else if (end < trainingEnd) {
      end = trainingEnd;
    }
    return { phase, start, end: end < start ? start : end };
  });
}

export function phaseRange(context: ScheduleContext, phaseId: string): ResolvedRange {
  const boundary = phaseBoundaries(context.phases, context.startDate, context.durationMonths).find(
    (item) => item.phase.id === phaseId,
  );
  if (!boundary) {
    throw new Error(`Unbekannte Ausbildungsphase: ${phaseId}`);
  }
  return { start: boundary.start, end: boundary.end, isWindow: true };
}

/** Phase, in die ein Datum fällt. */
export function phaseAtDate(
  phases: TrainingPhase[],
  startDate: IsoDate,
  durationMonths: number,
  date: IsoDate,
): TrainingPhase | null {
  const boundaries = phaseBoundaries(phases, startDate, durationMonths);
  if (boundaries.length === 0) return null;
  const first = boundaries[0]!;
  const last = boundaries[boundaries.length - 1]!;
  if (date < first.start) return first.phase;
  for (const boundary of boundaries) {
    if (date >= boundary.start && date <= boundary.end) return boundary.phase;
  }
  return last.phase;
}

/**
 * Ordnet jeden Meilenstein genau einer Etappe zu.
 */
export function groupByPhase(
  phases: TrainingPhase[],
  startDate: IsoDate,
  durationMonths: number,
  milestones: MilestoneInstance[],
): Map<string, MilestoneInstance[]> {
  const groups = new Map<string, MilestoneInstance[]>();
  for (const phase of phases) groups.set(phase.id, []);
  for (const milestone of [...milestones].sort(compareMilestones)) {
    const phase = phaseAtDate(phases, startDate, durationMonths, effectiveStart(milestone));
    if (!phase) continue;
    groups.get(phase.id)?.push(milestone);
  }
  return groups;
}

/* -------------------------- Regelauflösung --------------------------- */

function resolveAnchor(
  anchor: DateAnchor,
  context: ScheduleContext,
  visiting: Set<string>,
  cache: Map<string, ResolvedRange>,
): IsoDate {
  switch (anchor.type) {
    case 'start':
      return context.startDate;
    case 'end':
      return context.endDate;
    case 'fraction':
      return dateAtFraction(context.startDate, context.durationMonths, anchor.value);
    case 'phase': {
      const range = phaseRange(context, anchor.phaseId);
      return anchor.edge === 'end' ? range.end : range.start;
    }
    case 'milestone': {
      const range = resolveMilestoneRange(anchor.milestoneId, context, visiting, cache);
      return anchor.edge === 'end' ? range.end : range.start;
    }
  }
}

/** Löst eine Terminregel zu einem Zeitraum auf. */
export function resolveDateRule(
  rule: DateRule,
  context: ScheduleContext,
  visiting: Set<string> = new Set(),
  cache: Map<string, ResolvedRange> = new Map(),
): ResolvedRange {
  switch (rule.kind) {
    case 'absolut':
      return {
        start: rule.date,
        end: rule.endDate ?? rule.date,
        isWindow: Boolean(rule.endDate && rule.endDate !== rule.date),
      };
    case 'relativ': {
      const base = resolveAnchor(rule.anchor, context, visiting, cache);
      const start = toIso(addOffset(fromIso(base), rule.offset));
      const windowDays = rule.windowDays ?? 0;
      const end = windowDays > 0 ? toIso(addOffset(fromIso(start), { amount: windowDays, unit: 'Tage' })) : start;
      return { start, end, isWindow: windowDays > 0 };
    }
    case 'zeitfenster': {
      const fromBase = resolveAnchor(rule.from.anchor, context, visiting, cache);
      const toBase = resolveAnchor(rule.to.anchor, context, visiting, cache);
      const start = toIso(addOffset(fromIso(fromBase), rule.from.offset));
      const end = toIso(addOffset(fromIso(toBase), rule.to.offset));
      return { start, end: end < start ? start : end, isWindow: true };
    }
    case 'drittel': {
      const from = (rule.third - 1) / 3;
      const to = rule.third / 3;
      return {
        start: dateAtFraction(context.startDate, context.durationMonths, from),
        end: dateAtFraction(context.startDate, context.durationMonths, to),
        isWindow: true,
      };
    }
    case 'phase':
      return phaseRange(context, rule.phaseId);
  }
}

/**
 * Termin eines Meilensteins. Manuelle Termine haben Vorrang und wirken damit
 * auch auf alle abhängigen Meilensteine.
 */
export function resolveMilestoneRange(
  definitionId: string,
  context: ScheduleContext,
  visiting: Set<string> = new Set(),
  cache: Map<string, ResolvedRange> = new Map(),
): ResolvedRange {
  const cached = cache.get(definitionId);
  if (cached) return cached;

  if (visiting.has(definitionId)) {
    throw new Error(`Zirkuläre Terminabhängigkeit bei Meilenstein „${definitionId}“.`);
  }

  const manual = context.manualDates.get(definitionId);
  if (manual) {
    const range: ResolvedRange = {
      start: manual.start,
      end: manual.end ?? manual.start,
      isWindow: Boolean(manual.end && manual.end !== manual.start),
    };
    cache.set(definitionId, range);
    return range;
  }

  const definition = context.definitions.get(definitionId);
  if (!definition) {
    throw new Error(`Unbekannter Meilenstein: ${definitionId}`);
  }

  visiting.add(definitionId);
  let range = resolveDateRule(definition.dateRule, context, visiting, cache);

  if (definition.earliest) {
    const min = resolveDateRule(definition.earliest, context, visiting, cache).start;
    range = shiftIntoBounds(range, min, undefined);
  }
  if (definition.latest) {
    const max = resolveDateRule(definition.latest, context, visiting, cache).end;
    range = shiftIntoBounds(range, undefined, max);
  }
  visiting.delete(definitionId);

  cache.set(definitionId, range);
  return range;
}

/** Verschiebt einen Zeitraum in die zulässigen Grenzen, ohne ihn zu stauchen. */
function shiftIntoBounds(range: ResolvedRange, min?: IsoDate, max?: IsoDate): ResolvedRange {
  const length = daysBetween(range.start, range.end);
  let start = clampIso(range.start, min, max);
  if (max && start > max) start = max;
  let end = toIso(addOffset(fromIso(start), { amount: length, unit: 'Tage' }));
  if (max && end > max) end = max;
  if (end < start) end = start;
  return { start, end, isWindow: range.isWindow };
}

/* ------------------------ Bedingte Gültigkeit ------------------------ */

/** Prüft, ob ein Meilenstein für das Profil überhaupt gilt. */
export function milestoneApplies(definition: MilestoneDefinition, profile: TrainingProfile): boolean {
  const c = definition.conditions;
  if (!c) return true;
  if (c.schoolTypes && !c.schoolTypes.includes(profile.schoolType)) return false;
  if (c.trainingForms && !c.trainingForms.includes(profile.trainingForm)) return false;
  if (c.federalStates && !c.federalStates.includes(profile.federalState)) return false;
  if (c.minDurationMonths !== undefined && profile.durationMonths < c.minDurationMonths) return false;
  if (c.maxDurationMonths !== undefined && profile.durationMonths > c.maxDurationMonths) return false;
  if (c.minSubjects !== undefined && profile.subjects.length < c.minSubjects) return false;
  return true;
}

/* ------------------------- Streckenerzeugung ------------------------- */

function instanceId(templateId: string, definitionId: string): string {
  return `${templateId}::${definitionId}`;
}

function nowIso(now: Date): string {
  return now.toISOString();
}

/** Erzeugt eine Instanz aus einer Definition. */
function createInstance(
  definition: MilestoneDefinition,
  template: TrainingTemplate,
  range: ResolvedRange,
  now: Date,
): MilestoneInstance {
  return {
    id: instanceId(template.id, definition.id),
    definitionId: definition.id,
    templateId: template.id,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    phaseId: definition.phaseId,
    computedStart: range.start,
    computedEnd: range.end,
    isWindow: range.isWindow,
    leadTimeDays: definition.leadTimeDays,
    prerequisites: [...definition.prerequisites],
    status: 'offen',
    notes: '',
    checklist: definition.checklist.map((item) => ({ id: item.id, label: item.label, done: false })),
    help: definition.help,
    source: definition.source,
    mandatory: definition.mandatory,
    major: definition.major ?? false,
    order: definition.order,
    updatedAt: nowIso(now),
  };
}

export interface BuildScheduleOptions {
  /** Bereits vorhandene Instanzen – persönliche Angaben bleiben erhalten. */
  existing?: MilestoneInstance[];
  now?: Date;
}

export interface BuildScheduleResult {
  milestones: MilestoneInstance[];
  /** Instanzen, deren berechneter Termin sich geändert hat. */
  changed: { id: string; title: string; from: IsoDate; to: IsoDate }[];
  /** Instanzen mit manuellem Termin, die unverändert geblieben sind. */
  keptManual: string[];
  /** Instanzen, die wegen geänderter Bedingungen entfallen sind. */
  removed: string[];
}

/**
 * Baut die persönliche Strecke neu auf bzw. berechnet sie nach einer Änderung
 * von Beginn, Dauer oder Terminen neu.
 */
export function buildSchedule(
  template: TrainingTemplate,
  profile: TrainingProfile,
  options: BuildScheduleOptions = {},
): BuildScheduleResult {
  const now = options.now ?? new Date();
  const existing = options.existing ?? [];
  const existingById = new Map(existing.map((m) => [m.definitionId, m]));

  const manualDates = new Map<string, { start: IsoDate; end?: IsoDate }>();
  for (const item of existing) {
    if (item.manualStart) {
      manualDates.set(item.definitionId, { start: item.manualStart, end: item.manualEnd });
    }
  }

  const context = createScheduleContext(template, profile, manualDates);
  const cache = new Map<string, ResolvedRange>();

  const applicable = template.milestones.filter((definition) => milestoneApplies(definition, profile));
  const milestones: MilestoneInstance[] = [];
  const changed: BuildScheduleResult['changed'] = [];
  const keptManual: string[] = [];

  for (const definition of applicable) {
    const range = resolveMilestoneRange(definition.id, context, new Set(), cache);
    const previous = existingById.get(definition.id);

    if (!previous) {
      milestones.push(createInstance(definition, template, range, now));
      continue;
    }

    // Definition kann sich im Streckenbaukasten geändert haben – Texte und
    // Regeln übernehmen, persönliche Angaben erhalten. Beim Wechsel der Vorlage
    // wandern Notizen, Status und eigene Termine mit an die neue Kennung.
    const merged: MilestoneInstance = {
      ...previous,
      id: instanceId(template.id, definition.id),
      templateId: template.id,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      phaseId: definition.phaseId,
      leadTimeDays: definition.leadTimeDays,
      prerequisites: [...definition.prerequisites],
      help: definition.help,
      source: definition.source,
      mandatory: definition.mandatory,
      major: definition.major ?? false,
      order: definition.order,
      checklist: mergeChecklist(definition, previous),
      computedStart: range.start,
      computedEnd: range.end,
      isWindow: range.isWindow,
    };

    if (previous.manualStart) {
      keptManual.push(previous.id);
    } else if (previous.computedStart !== range.start) {
      changed.push({
        id: previous.id,
        title: definition.title,
        from: previous.computedStart,
        to: range.start,
      });
      merged.updatedAt = nowIso(now);
    }

    milestones.push(merged);
  }

  const applicableIds = new Set(applicable.map((d) => d.id));
  const removed = existing
    .filter((m) => !applicableIds.has(m.definitionId))
    .filter((m) => m.templateId === template.id || !m.agreed)
    .map((m) => m.id);

  // Individuell vereinbarte Termine ohne Entsprechung in der Vorlage bleiben
  // erhalten; alle übrigen Termine einer abgewählten Vorlage entfallen.
  const foreign = existing.filter(
    (m) => m.templateId !== template.id && m.agreed && !applicableIds.has(m.definitionId),
  );
  milestones.push(...foreign);

  milestones.sort(compareMilestones);
  return { milestones, changed, keptManual, removed };
}

/** Übernimmt erledigte Häkchen einer bestehenden Checkliste. */
function mergeChecklist(definition: MilestoneDefinition, previous: MilestoneInstance) {
  const done = new Map(previous.checklist.map((item) => [item.id, item.done]));
  return definition.checklist.map((item) => ({
    id: item.id,
    label: item.label,
    done: done.get(item.id) ?? false,
  }));
}

/** Der tatsächlich geltende Terminbeginn (manuell schlägt berechnet). */
export function effectiveStart(milestone: MilestoneInstance): IsoDate {
  return milestone.manualStart ?? milestone.computedStart;
}

export function effectiveEnd(milestone: MilestoneInstance): IsoDate {
  if (milestone.manualStart) return milestone.manualEnd ?? milestone.manualStart;
  return milestone.computedEnd;
}

export function compareMilestones(a: MilestoneInstance, b: MilestoneInstance): number {
  const sa = effectiveStart(a);
  const sb = effectiveStart(b);
  if (sa !== sb) return sa < sb ? -1 : 1;
  if (a.order !== b.order) return a.order - b.order;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Setzt einen manuellen Termin und berechnet die abhängigen Termine neu.
 * Der manuelle Termin selbst bleibt danach unangetastet.
 */
export function setManualDate(
  template: TrainingTemplate,
  profile: TrainingProfile,
  milestones: MilestoneInstance[],
  instanceId: string,
  start: IsoDate | null,
  end?: IsoDate,
  now: Date = new Date(),
): BuildScheduleResult {
  const updated = milestones.map((m) => {
    if (m.id !== instanceId) return m;
    if (start === null) {
      const { manualStart: _s, manualEnd: _e, ...rest } = m;
      return { ...rest, updatedAt: now.toISOString() } as MilestoneInstance;
    }
    const previousEffective = effectiveStart(m);
    return {
      ...m,
      manualStart: start,
      manualEnd: end,
      previousStart: previousEffective !== start ? previousEffective : m.previousStart,
      status: previousEffective !== start && m.status === 'offen' ? 'verschoben' : m.status,
      updatedAt: now.toISOString(),
    } as MilestoneInstance;
  });

  return buildSchedule(template, profile, { existing: updated, now });
}

/** Streckenzustand eines Meilensteins für die Darstellung. */
export function trackStateOf(
  milestone: MilestoneInstance,
  todayIso: IsoDate,
  nextMilestoneId?: string,
): import('./types').TrackState {
  if (milestone.status === 'erledigt') return 'abgeschlossen';
  if (milestone.status === 'entfällt') return 'entfällt';
  const start = effectiveStart(milestone);
  const end = effectiveEnd(milestone);
  if (end < todayIso) return 'überfällig';
  if (milestone.status === 'verschoben') return 'verschoben';
  if (todayIso >= start && todayIso <= end) return 'aktuell';
  if (milestone.id === nextMilestoneId) return 'als Nächstes';
  return 'später';
}
