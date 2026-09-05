/**
 * Fortschrittsberechnung. Bewusst getrennt in drei Dimensionen, damit ein
 * hoher Zeitanteil nicht wie eine Leistungsbewertung wirkt.
 */
import { daysBetween, fractionOfDate, trainingEndDate, trainingMonth } from './dates';
import { effectiveEnd, effectiveStart, phaseAtDate } from './schedule';
import type {
  DevelopmentGoal,
  IsoDate,
  MilestoneInstance,
  ReflectionEntry,
  TrainingPhase,
  TrainingProfile,
  TrainingTemplate,
} from './types';

export interface TrainingProgress {
  /** Zeitlicher Ausbildungsfortschritt (0–1). */
  timeFraction: number;
  currentMonth: number;
  totalMonths: number;
  startDate: IsoDate;
  endDate: IsoDate;
  daysRemaining: number;
  currentPhase: TrainingPhase | null;
  /** Erledigte Meilensteine – ausdrücklich getrennt vom Zeitfortschritt. */
  milestonesDone: number;
  milestonesRelevant: number;
  milestoneFraction: number;
  /** Persönliche Entwicklung: dokumentierte Reflexionen und Ziele. */
  reflectionCount: number;
  reflectionsLast30Days: number;
  activeGoal: DevelopmentGoal | null;
  goalReviewedDaysAgo: number | null;
}

export function computeProgress(
  profile: TrainingProfile,
  template: TrainingTemplate | null,
  milestones: MilestoneInstance[],
  goals: DevelopmentGoal[],
  reflections: ReflectionEntry[],
  todayIso: IsoDate,
): TrainingProgress {
  const endDate = trainingEndDate(profile.startDate, profile.durationMonths);
  const relevant = milestones.filter((m) => m.status !== 'entfällt');
  const done = relevant.filter((m) => m.status === 'erledigt').length;

  const activeGoal = goals.find((g) => g.active) ?? null;
  const goalReviewedDaysAgo =
    activeGoal?.lastReviewedAt != null
      ? daysBetween(activeGoal.lastReviewedAt.slice(0, 10), todayIso)
      : activeGoal
        ? daysBetween(activeGoal.createdAt.slice(0, 10), todayIso)
        : null;

  const reflectionsLast30Days = reflections.filter((r) => daysBetween(r.date, todayIso) <= 30).length;

  return {
    timeFraction: fractionOfDate(profile.startDate, profile.durationMonths, todayIso),
    currentMonth: Math.min(trainingMonth(profile.startDate, todayIso), profile.durationMonths),
    totalMonths: profile.durationMonths,
    startDate: profile.startDate,
    endDate,
    daysRemaining: Math.max(daysBetween(todayIso, endDate), 0),
    currentPhase: template
      ? phaseAtDate(template.phases, profile.startDate, profile.durationMonths, todayIso)
      : null,
    milestonesDone: done,
    milestonesRelevant: relevant.length,
    milestoneFraction: relevant.length > 0 ? done / relevant.length : 0,
    reflectionCount: reflections.length,
    reflectionsLast30Days,
    activeGoal,
    goalReviewedDaysAgo,
  };
}

/** Nächster verbindlicher Meilenstein (Pflichttermin) ab heute. */
export function nextMandatoryMilestone(
  milestones: MilestoneInstance[],
  todayIso: IsoDate,
): MilestoneInstance | null {
  const upcoming = milestones
    .filter((m) => m.mandatory && m.status !== 'erledigt' && m.status !== 'entfällt')
    .filter((m) => effectiveEnd(m) >= todayIso)
    .sort((a, b) => (effectiveStart(a) < effectiveStart(b) ? -1 : effectiveStart(a) > effectiveStart(b) ? 1 : a.order - b.order));
  return upcoming[0] ?? null;
}

/** Überfällige oder ungeklärte Punkte. */
export function openIssues(milestones: MilestoneInstance[], todayIso: IsoDate): MilestoneInstance[] {
  return milestones
    .filter((m) => m.status !== 'erledigt' && m.status !== 'entfällt')
    .filter((m) => effectiveEnd(m) < todayIso)
    .sort((a, b) => (effectiveEnd(a) < effectiveEnd(b) ? -1 : 1));
}
