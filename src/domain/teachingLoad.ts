/**
 * Unterrichtseinsatz und Soll-Korridore der Unterrichtsverpflichtung.
 *
 * Die Vorlage beschreibt je Etappe, wie viele Wochenstunden auf Hospitation
 * (H), angeleiteten Unterricht (aU) und selbstständigen Unterricht (sU)
 * entfallen sollen. Hier wird der selbst eingetragene Einsatz einer Woche
 * gegen diesen Korridor gestellt.
 *
 * Es findet keine Bewertung statt: Ein Hinweis nennt die Abweichung und den
 * Korridor, aus dem sie sich ergibt – nicht mehr.
 */
import {
  addDaysIso,
  daysBetween,
  formatNumber,
  halfYearOfDate,
  isWorkday,
  mondayOf,
  trainingEndDate,
} from './dates';
import type {
  HourRange,
  IsoDate,
  TeachingLoadModel,
  TeachingLoadStage,
  TeachingWeekEntry,
  TrainingProfile,
} from './types';

/** Zeile der Einsatzübersicht – eine Woche der Ausbildung. */
export interface TeachingWeekRow {
  weekStart: IsoDate;
  weekEnd: IsoDate;
  /** Nummer der Unterrichtswoche; `null` bei unterrichtsfreien Wochen. */
  teachingWeek: number | null;
  /** Ausbildungshalbjahr, in dem die Woche liegt. */
  halfYear: number;
  entry: TeachingWeekEntry | null;
  stage: TeachingLoadStage | null;
  /** Summe der eingetragenen Wochenstunden. */
  total: number;
  /** Abweichungen vom Korridor in Klartext. */
  deviations: string[];
  isCurrent: boolean;
  isFuture: boolean;
}

export interface HalfYearSummary {
  halfYear: number;
  /** Wochen mit Eintrag, die als Unterrichtswochen gelten. */
  weeks: number;
  averageIndependent: number;
  maxIndependent: number;
  /** Überschreitungen der Durchschnitts- beziehungsweise Höchstwerte. */
  deviations: string[];
}

export interface TeachingLoadSummary {
  /** Gilt das Modell für dieses Profil? */
  applies: boolean;
  /** Begründung, falls es nicht gilt. */
  reason: string | null;
  model: TeachingLoadModel | null;
  rows: TeachingWeekRow[];
  currentRow: TeachingWeekRow | null;
  /** Vergangene Unterrichtswochen ohne Eintrag. */
  weeksWithoutEntry: number;
  lastEntry: TeachingWeekEntry | null;
  /** Wochen mit Eintrag insgesamt. */
  weeksWithEntry: number;
  totals: { hospitation: number; guided: number; independent: number };
  halfYears: HalfYearSummary[];
  /** Zeilen mit Abweichung vom Korridor (nur Wochen mit Eintrag). */
  deviatingRows: TeachingWeekRow[];
}

export function teachingWeekId(weekStart: IsoDate): string {
  return `woche-${mondayOf(weekStart)}`;
}

/**
 * Montag der ersten Unterrichtswoche. Fällt der Ausbildungsbeginn auf einen
 * Samstag oder Sonntag, beginnt die Zählung mit der folgenden Woche.
 */
export function firstTeachingWeekStart(startDate: IsoDate): IsoDate {
  if (isWorkday(startDate)) return mondayOf(startDate);
  return mondayOf(addDaysIso(startDate, 2));
}

export function entryTotal(entry: TeachingWeekEntry): number {
  return entry.hospitation + entry.guided + entry.independent;
}

function rangeText(range: HourRange): string {
  return range.min === range.max ? formatNumber(range.min) : `${formatNumber(range.min)}–${formatNumber(range.max)}`;
}

/** Sichtbare Beschreibung eines Korridors, z. B. für Tabellen und Hinweise. */
export function stageText(stage: TeachingLoadStage): string {
  const parts = [`H ${rangeText(stage.hospitation)}`];
  if (stage.guided) parts.push(`aU ${rangeText(stage.guided)}`);
  if (stage.combined) parts.push(`aU+sU ${rangeText(stage.combined)}`);
  if (stage.independentMax !== undefined) parts.push(`davon bis ${formatNumber(stage.independentMax)} sU`);
  if (stage.independentAverage !== undefined) parts.push(`⌀ ${formatNumber(stage.independentAverage)} sU`);
  return parts.join(' · ');
}

/**
 * Gilt das Korridormodell für dieses Profil? Die Korridore beschreiben den
 * regulären Vorbereitungsdienst; Seiteneinstieg und Nachqualifizierung
 * folgen anderen Regelungen.
 */
export function teachingLoadApplies(
  model: TeachingLoadModel | undefined | null,
  profile: TrainingProfile,
): { applies: boolean; reason: string | null } {
  if (!model) {
    return { applies: false, reason: 'Die gewählte Vorlage enthält keine Soll-Korridore für den Unterrichtseinsatz.' };
  }
  if (model.trainingForms && !model.trainingForms.includes(profile.trainingForm)) {
    return {
      applies: false,
      reason: `Die Korridore gelten laut Vorlage nur für ${model.trainingForms.join(', ')}. Für die Ausbildungsform „${profile.trainingForm}“ ist der Einsatz mit dem Studienseminar abzustimmen.`,
    };
  }
  return { applies: true, reason: null };
}

/**
 * Korridor einer Unterrichtswoche. Es gilt jeweils die letzte Etappe, deren
 * Bedingungen erfüllt sind – so löst „ab dem zweiten Ausbildungshalbjahr“
 * die wochenbezogene Etappe ab.
 */
export function stageForWeek(
  model: TeachingLoadModel,
  teachingWeek: number,
  halfYear: number,
): TeachingLoadStage | null {
  let match: TeachingLoadStage | null = null;
  for (const stage of model.stages) {
    const weekOk = stage.fromWeek === undefined || teachingWeek >= stage.fromWeek;
    const halfYearOk = stage.fromHalfYear === undefined || halfYear >= stage.fromHalfYear;
    if (weekOk && halfYearOk) match = stage;
  }
  return match;
}

/** Abweichungen einer Woche von ihrem Korridor. */
export function evaluateWeek(
  entry: TeachingWeekEntry,
  stage: TeachingLoadStage | null,
  model: TeachingLoadModel,
): string[] {
  if (!stage || entry.noSchool) return [];
  const deviations: string[] = [];
  const combined = entry.guided + entry.independent;

  if (entry.hospitation < stage.hospitation.min) {
    deviations.push(
      `Hospitation ${formatNumber(entry.hospitation)} Wochenstunden – vorgesehen sind ${rangeText(stage.hospitation)}.`,
    );
  } else if (entry.hospitation > stage.hospitation.max) {
    deviations.push(
      `Hospitation ${formatNumber(entry.hospitation)} Wochenstunden liegt über dem Korridor ${rangeText(stage.hospitation)}.`,
    );
  }

  if (stage.guided) {
    if (entry.guided < stage.guided.min || entry.guided > stage.guided.max) {
      deviations.push(
        `Angeleiteter Unterricht ${formatNumber(entry.guided)} Wochenstunden – vorgesehen sind ${rangeText(stage.guided)}.`,
      );
    }
  }

  if (stage.combined) {
    if (combined < stage.combined.min || combined > stage.combined.max) {
      deviations.push(
        `Angeleiteter und selbstständiger Unterricht zusammen ${formatNumber(combined)} Wochenstunden – vorgesehen sind ${rangeText(stage.combined)}.`,
      );
    }
  }

  if (stage.independentMax !== undefined && entry.independent > stage.independentMax) {
    deviations.push(
      `Selbstständiger Unterricht ${formatNumber(entry.independent)} Wochenstunden – vorgesehen sind in dieser Etappe bis zu ${formatNumber(stage.independentMax)}.`,
    );
  }

  const total = entryTotal(entry);
  if (total > model.weeklyTotal) {
    deviations.push(
      `Der Ausbildungsunterricht umfasst ${formatNumber(total)} Wochenstunden und liegt über dem Richtwert von ${formatNumber(model.weeklyTotal)}.`,
    );
  }

  return deviations;
}

/**
 * Baut die Wochenübersicht vom Ausbildungsbeginn bis zur laufenden Woche auf
 * und zählt die Unterrichtswochen. Als unterrichtsfrei markierte Wochen
 * (Ferien) erhöhen die Zählung nicht.
 */
export function buildTeachingWeekRows(
  model: TeachingLoadModel,
  profile: TrainingProfile,
  entries: TeachingWeekEntry[],
  todayIso: IsoDate,
): TeachingWeekRow[] {
  const byWeek = new Map(entries.map((entry) => [mondayOf(entry.weekStart), entry]));
  const firstWeek = firstTeachingWeekStart(profile.startDate);
  const currentWeek = mondayOf(todayIso);
  const lastTrainingWeek = mondayOf(trainingEndDate(profile.startDate, profile.durationMonths));

  // Bis zur laufenden Woche, mindestens aber bis zur letzten erfassten Woche.
  const latestEntry = [...byWeek.keys()].sort().pop();
  let lastWeek = currentWeek > lastTrainingWeek ? lastTrainingWeek : currentWeek;
  if (latestEntry && latestEntry > lastWeek) lastWeek = latestEntry;
  if (lastWeek < firstWeek) lastWeek = firstWeek;

  const rows: TeachingWeekRow[] = [];
  let teachingWeek = 0;
  for (let week = firstWeek; week <= lastWeek; week = addDaysIso(week, 7)) {
    const entry = byWeek.get(week) ?? null;
    const noSchool = Boolean(entry?.noSchool);
    if (!noSchool) teachingWeek += 1;
    const halfYear = halfYearOfDate(profile.startDate, week);
    const stage = noSchool ? null : stageForWeek(model, teachingWeek, halfYear);
    rows.push({
      weekStart: week,
      weekEnd: addDaysIso(week, 6),
      teachingWeek: noSchool ? null : teachingWeek,
      halfYear,
      entry,
      stage,
      total: entry ? entryTotal(entry) : 0,
      deviations: entry ? evaluateWeek(entry, stage, model) : [],
      isCurrent: week === currentWeek,
      isFuture: week > currentWeek,
    });
  }
  return rows;
}

function summarizeHalfYears(rows: TeachingWeekRow[], model: TeachingLoadModel): HalfYearSummary[] {
  const groups = new Map<number, TeachingWeekRow[]>();
  for (const row of rows) {
    if (!row.entry || row.entry.noSchool) continue;
    const list = groups.get(row.halfYear) ?? [];
    list.push(row);
    groups.set(row.halfYear, list);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([halfYear, list]) => {
      const values = list.map((row) => row.entry?.independent ?? 0);
      const sum = values.reduce((total, value) => total + value, 0);
      const average = values.length > 0 ? sum / values.length : 0;
      const max = values.reduce((highest, value) => Math.max(highest, value), 0);
      const deviations: string[] = [];
      if (model.independentAveragePerHalfYear !== undefined && average > model.independentAveragePerHalfYear) {
        deviations.push(
          `Der Durchschnitt des selbstständigen Unterrichts liegt bei ${average.toLocaleString('de-DE', {
            maximumFractionDigits: 1,
          })} Wochenstunden – vorgesehen sind im Durchschnitt bis zu ${formatNumber(
            model.independentAveragePerHalfYear,
          )}.`,
        );
      }
      if (model.independentPeak !== undefined && max > model.independentPeak) {
        deviations.push(
          `In einer Woche sind ${formatNumber(max)} Wochenstunden selbstständiger Unterricht erfasst – zeitweise vorgesehen sind bis zu ${formatNumber(
            model.independentPeak,
          )}.`,
        );
      }
      return { halfYear, weeks: list.length, averageIndependent: average, maxIndependent: max, deviations };
    });
}

/** Gesamtauswertung des Unterrichtseinsatzes. */
export function summarizeTeachingLoad(
  model: TeachingLoadModel | undefined | null,
  profile: TrainingProfile,
  entries: TeachingWeekEntry[],
  todayIso: IsoDate,
): TeachingLoadSummary {
  const { applies, reason } = teachingLoadApplies(model, profile);
  const empty: TeachingLoadSummary = {
    applies,
    reason,
    model: model ?? null,
    rows: [],
    currentRow: null,
    weeksWithoutEntry: 0,
    lastEntry: null,
    weeksWithEntry: entries.length,
    totals: { hospitation: 0, guided: 0, independent: 0 },
    halfYears: [],
    deviatingRows: [],
  };
  if (!model || !applies) return empty;

  const rows = buildTeachingWeekRows(model, profile, entries, todayIso);
  const withEntry = rows.filter((row) => row.entry);
  const totals = withEntry.reduce(
    (sum, row) => ({
      hospitation: sum.hospitation + (row.entry?.hospitation ?? 0),
      guided: sum.guided + (row.entry?.guided ?? 0),
      independent: sum.independent + (row.entry?.independent ?? 0),
    }),
    { hospitation: 0, guided: 0, independent: 0 },
  );

  const sortedEntries = [...entries].sort((a, b) => (mondayOf(a.weekStart) < mondayOf(b.weekStart) ? -1 : 1));

  return {
    applies: true,
    reason: null,
    model,
    rows,
    currentRow: rows.find((row) => row.isCurrent) ?? null,
    weeksWithoutEntry: rows.filter((row) => !row.entry && !row.isFuture && !row.isCurrent).length,
    lastEntry: sortedEntries[sortedEntries.length - 1] ?? null,
    weeksWithEntry: withEntry.length,
    totals,
    halfYears: summarizeHalfYears(rows, model),
    deviatingRows: withEntry.filter((row) => row.deviations.length > 0),
  };
}

/** Tage seit dem letzten Eintrag – Grundlage für den Hinweis im Cockpit. */
export function daysSinceLastEntry(summary: TeachingLoadSummary, todayIso: IsoDate): number | null {
  if (!summary.lastEntry) return null;
  return daysBetween(mondayOf(summary.lastEntry.weekStart), todayIso);
}
