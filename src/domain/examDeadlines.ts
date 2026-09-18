/**
 * Fristen der Staatsprüfung.
 *
 * Aus den beiden Prüfungstagen und der gewählten Ablaufform ergeben sich
 * Themenbekanntgabe, Abgabe der Entwürfe und der letzte Unterrichtstag. Die
 * Fristen werden berechnet und nicht gespeichert; verbindlich sind die
 * Mitteilungen des Prüfungsamts.
 */
import { daysBetween, formatDate, formatNumber, previousWorkday, workdaysBefore } from './dates';
import type { ExamDeadline, ExamDeadlineModel, ExamMode, ExamPlan, IsoDate } from './types';

export interface ExamDay {
  /** Erster oder zweiter Prüfungstag. */
  index: 1 | 2;
  date: IsoDate;
  label: string;
  /** Wird an diesem Tag Prüfungsunterricht gehalten? */
  practical: boolean;
}

export interface ExamScheduleSummary {
  mode: ExamMode | null;
  days: ExamDay[];
  deadlines: ExamDeadline[];
  /** Nächste Frist ab heute. */
  nextDeadline: ExamDeadline | null;
  /** Bereits verstrichene Fristen. */
  passedDeadlines: ExamDeadline[];
  /** Angaben, die für die Berechnung noch fehlen. */
  missing: string[];
}

export function modeLabel(mode: ExamMode): string {
  return mode === 'zusammen'
    ? 'Beide Prüfungslehrproben an einem Tag, die mündliche Prüfung am anderen Tag'
    : 'Je eine Prüfungslehrprobe mit der zugehörigen Teilprüfung pro Tag';
}

/** Prüfungstage aus dem eigenen Plan – ohne Bewertung der Reihenfolge. */
export function examDays(plan: ExamPlan | null): ExamDay[] {
  if (!plan || !plan.mode) return [];
  const days: ExamDay[] = [];
  if (plan.firstDay) {
    days.push({
      index: 1,
      date: plan.firstDay,
      label: plan.firstDayLabel?.trim() || (plan.mode === 'zusammen' ? 'Beide Prüfungslehrproben' : 'Erste Prüfungslehrprobe mit Teilprüfung'),
      practical: true,
    });
  }
  if (plan.secondDay) {
    days.push({
      index: 2,
      date: plan.secondDay,
      label:
        plan.secondDayLabel?.trim() ||
        (plan.mode === 'zusammen' ? 'Mündliche Prüfung (zwei Teilprüfungen)' : 'Zweite Prüfungslehrprobe mit Teilprüfung'),
      practical: plan.mode === 'getrennt',
    });
  }
  return days;
}

/**
 * Berechnet die Fristen zu den Prüfungstagen. Für jeden Tag mit
 * Prüfungsunterricht entstehen Themenbekanntgabe, Entwurfsabgabe und der
 * letzte Unterrichtstag.
 */
export function computeExamDeadlines(plan: ExamPlan | null, model: ExamDeadlineModel | undefined): ExamDeadline[] {
  if (!plan || !plan.mode || !model) return [];
  const workdays = model.announcementWorkdays[plan.mode];
  const deadlines: ExamDeadline[] = [];

  for (const day of examDays(plan)) {
    if (!day.practical) continue;

    const announcement = workdaysBefore(day.date, workdays, model.saturdaysCount);
    deadlines.push({
      id: `themenbekanntgabe-${day.index}`,
      title: `Themenbekanntgabe für den ${formatNumber(day.index)}. Prüfungstag`,
      date: announcement,
      description: `${formatNumber(workdays)} Werktage vor dem Prüfungstag am ${formatDate(day.date)}.${
        model.saturdaysCount ? '' : ' Samstage zählen dabei nicht als Werktage.'
      }`,
      referenceDate: day.date,
      source: model.source,
    });

    const draftDay = previousWorkday(day.date, model.saturdaysCount);
    deadlines.push({
      id: `entwurf-${day.index}`,
      title: `Abgabe der Entwürfe für den ${formatNumber(day.index)}. Prüfungstag`,
      date: draftDay,
      time: model.draftDeadlineTime,
      description: [
        `Am letzten Werktag vor dem Prüfungstag${model.draftDeadlineTime ? `, bis ${model.draftDeadlineTime} Uhr` : ''}.`,
        model.draftFormat,
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      referenceDate: day.date,
      source: model.source,
    });

    deadlines.push({
      id: `freistellung-${day.index}`,
      title: `Freistellung vom Unterricht für den ${formatNumber(day.index)}. Prüfungstag`,
      date: draftDay,
      description:
        'Für den letzten Unterrichtstag vor der Prüfung ist eine Freistellung auf Antrag möglich. Der Antrag ist frühzeitig zu stellen.',
      referenceDate: day.date,
      source: model.source,
    });
  }

  return deadlines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

/** Was fehlt noch, damit die Fristen berechnet werden können? */
export function examPlanGaps(plan: ExamPlan | null, model: ExamDeadlineModel | undefined): string[] {
  const missing: string[] = [];
  if (!model) missing.push('Die gewählte Vorlage enthält keine Fristenregeln für die Staatsprüfung.');
  if (!plan || !plan.mode) missing.push('Die Ablaufform der Staatsprüfung ist noch nicht ausgewählt.');
  if (!plan?.firstDay) missing.push('Der erste Prüfungstag ist noch nicht eingetragen.');
  if (!plan?.secondDay) missing.push('Der zweite Prüfungstag ist noch nicht eingetragen.');
  return missing;
}

export function summarizeExamPlan(
  plan: ExamPlan | null,
  model: ExamDeadlineModel | undefined,
  todayIso: IsoDate,
): ExamScheduleSummary {
  const deadlines = computeExamDeadlines(plan, model);
  const upcoming = deadlines.filter((deadline) => deadline.date >= todayIso);
  return {
    mode: plan?.mode ?? null,
    days: examDays(plan),
    deadlines,
    nextDeadline: upcoming[0] ?? null,
    passedDeadlines: deadlines.filter((deadline) => deadline.date < todayIso),
    missing: examPlanGaps(plan, model),
  };
}

/** Tage bis zu einer Frist – für Countdown-Anzeigen. */
export function daysUntilDeadline(deadline: ExamDeadline, todayIso: IsoDate): number {
  return daysBetween(todayIso, deadline.date);
}
