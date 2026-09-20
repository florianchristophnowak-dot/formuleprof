/**
 * Nachweis der Ausbildungsstunden am Studienseminar.
 *
 * Die Vorlage nennt den Mindestumfang in Stunden à 60 Minuten je
 * Ausbildungsdauer. Hier werden die selbst erfassten Veranstaltungen
 * zusammengezählt und dem zeitlichen Ausbildungsfortschritt gegenübergestellt.
 */
import { daysBetween, fractionOfDate } from './dates';
import type { IsoDate, SeminarKind, SeminarRecord, SeminarRequirement, TrainingProfile } from './types';

export interface SeminarSummary {
  /** Erfasste Stunden insgesamt. */
  total: number;
  /** Mindestumfang laut Vorlage, sofern hinterlegt. */
  required: number | null;
  /** Anteil der erfassten Stunden am Mindestumfang (0–1). */
  fraction: number;
  /** Zeitlich anteiliger Erwartungswert – kein Soll, nur ein Vergleichswert. */
  expectedByNow: number | null;
  /** Fehlende Stunden gegenüber dem anteiligen Vergleichswert. */
  behindBy: number;
  /** Noch fehlende Stunden bis zum Mindestumfang. */
  remaining: number | null;
  byKind: { kind: SeminarKind; hours: number; count: number }[];
  bySubject: { subject: string; hours: number }[];
  count: number;
  lastDate: IsoDate | null;
  daysSinceLast: number | null;
}

/**
 * Mindestumfang für eine Ausbildungsdauer. Liegt kein genauer Wert vor, wird
 * zwischen den nächstgelegenen Angaben linear interpoliert beziehungsweise
 * anteilig hochgerechnet.
 */
export function requiredSeminarHours(
  requirements: SeminarRequirement[] | undefined,
  durationMonths: number,
): number | null {
  if (!requirements || requirements.length === 0) return null;
  const sorted = [...requirements].sort((a, b) => a.durationMonths - b.durationMonths);

  const exact = sorted.find((entry) => entry.durationMonths === durationMonths);
  if (exact) return exact.hours;

  const below = [...sorted].reverse().find((entry) => entry.durationMonths < durationMonths);
  const above = sorted.find((entry) => entry.durationMonths > durationMonths);

  if (below && above) {
    const span = above.durationMonths - below.durationMonths;
    const share = (durationMonths - below.durationMonths) / span;
    return Math.round(below.hours + (above.hours - below.hours) * share);
  }

  const reference = below ?? above;
  if (!reference || reference.durationMonths === 0) return null;
  return Math.round((reference.hours / reference.durationMonths) * durationMonths);
}

export function summarizeSeminarHours(
  records: SeminarRecord[],
  requirements: SeminarRequirement[] | undefined,
  profile: TrainingProfile,
  todayIso: IsoDate,
): SeminarSummary {
  const total = records.reduce((sum, record) => sum + record.hours, 0);
  const required = requiredSeminarHours(requirements, profile.durationMonths);

  const kinds = new Map<SeminarKind, { hours: number; count: number }>();
  for (const record of records) {
    const current = kinds.get(record.kind) ?? { hours: 0, count: 0 };
    kinds.set(record.kind, { hours: current.hours + record.hours, count: current.count + 1 });
  }

  const subjects = new Map<string, number>();
  for (const record of records) {
    const subject = record.subject?.trim();
    if (!subject) continue;
    subjects.set(subject, (subjects.get(subject) ?? 0) + record.hours);
  }

  const timeFraction = fractionOfDate(profile.startDate, profile.durationMonths, todayIso);
  const expectedByNow = required === null ? null : Math.round(required * timeFraction);
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const lastDate = sorted[sorted.length - 1]?.date ?? null;

  return {
    total,
    required,
    fraction: required && required > 0 ? Math.min(total / required, 1) : 0,
    expectedByNow,
    behindBy: expectedByNow === null ? 0 : Math.max(expectedByNow - total, 0),
    remaining: required === null ? null : Math.max(required - total, 0),
    byKind: [...kinds.entries()]
      .map(([kind, value]) => ({ kind, hours: value.hours, count: value.count }))
      .sort((a, b) => b.hours - a.hours),
    bySubject: [...subjects.entries()]
      .map(([subject, hours]) => ({ subject, hours }))
      .sort((a, b) => b.hours - a.hours),
    count: records.length,
    lastDate,
    daysSinceLast: lastDate ? daysBetween(lastDate, todayIso) : null,
  };
}
