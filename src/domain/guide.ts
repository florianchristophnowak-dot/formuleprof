/**
 * Überblick über den eigenen Wegweiser.
 *
 * Der Wegweiser wächst über die Ausbildung hinweg: Unterrichtseinsatz,
 * Ausbildungsstunden, Unterlagen, Ansprechpersonen, Prüfungsfahrplan, Noten
 * und die eigene Entwicklung. Diese Übersicht sagt je Bereich, was schon
 * erfasst ist und was als Nächstes ergänzt werden kann.
 */
import { formatDate, formatNumber } from './dates';
import { summarizeDocuments } from './documents';
import { computeFinalGrade } from './grades';
import { summarizeSeminarHours } from './seminarHours';
import { summarizeTeachingLoad } from './teachingLoad';
import { summarizeExamPlan } from './examDeadlines';
import type {
  ContactEntry,
  DevelopmentGoal,
  DocumentRecord,
  ExamPlan,
  GradeRecord,
  IsoDate,
  MilestoneInstance,
  ReflectionEntry,
  SeminarRecord,
  TeachingWeekEntry,
  TrainingProfile,
  TrainingTemplate,
} from './types';

export const GUIDE_AREAS = [
  'einsatz',
  'stunden',
  'unterlagen',
  'kontakte',
  'pruefung',
  'noten',
  'entwicklung',
] as const;
export type GuideAreaId = (typeof GUIDE_AREAS)[number];

export interface GuideArea {
  id: GuideAreaId;
  title: string;
  /** Kurzer Stand in Klartext. */
  status: string;
  /** Nächster sinnvoller Schritt – oder `null`, wenn nichts ansteht. */
  next: string | null;
  /** Wurde der Bereich schon begonnen? */
  started: boolean;
  /** Anzahl der Einträge im Bereich. */
  count: number;
}

export interface GuideInput {
  profile: TrainingProfile;
  template: TrainingTemplate | null;
  milestones: MilestoneInstance[];
  teachingWeeks: TeachingWeekEntry[];
  seminarRecords: SeminarRecord[];
  documents: DocumentRecord[];
  contacts: ContactEntry[];
  examPlan: ExamPlan | null;
  grades: GradeRecord | null;
  goals: DevelopmentGoal[];
  reflections: ReflectionEntry[];
  todayIso: IsoDate;
}

function hoursText(value: number): string {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Stunden`;
}

export function buildGuideOverview(input: GuideInput): GuideArea[] {
  const { profile, template, todayIso } = input;

  const load = summarizeTeachingLoad(template?.teachingLoad, profile, input.teachingWeeks, todayIso);
  const seminar = summarizeSeminarHours(input.seminarRecords, template?.seminarRequirements, profile, todayIso);
  const documents = summarizeDocuments(template, input.milestones, input.documents, todayIso);
  const exam = summarizeExamPlan(input.examPlan, template?.examDeadlines, todayIso);
  const grades = computeFinalGrade(input.grades, template?.gradeModel);
  const activeGoal = input.goals.find((goal) => goal.active) ?? null;

  const areas: GuideArea[] = [];

  /* Unterrichtseinsatz */
  if (load.applies) {
    areas.push({
      id: 'einsatz',
      title: 'Unterrichtseinsatz',
      status:
        load.weeksWithEntry === 0
          ? 'Noch keine Woche erfasst.'
          : `${formatNumber(load.weeksWithEntry)} Wochen erfasst${
              load.currentRow?.stage ? ` · aktuelle Etappe: ${load.currentRow.stage.title}` : ''
            }.`,
      next:
        load.weeksWithEntry === 0
          ? 'Trage die Wochenstunden der laufenden Woche ein (Hospitation, angeleiteter und selbstständiger Unterricht).'
          : !load.currentRow?.entry
            ? 'Die laufende Woche ist noch nicht erfasst.'
            : load.deviatingRows.length > 0
              ? `${formatNumber(load.deviatingRows.length)} Wochen weichen vom Soll-Korridor ab – das lohnt ein Gespräch mit der Fachleitung.`
              : null,
      started: load.weeksWithEntry > 0,
      count: load.weeksWithEntry,
    });
  } else {
    areas.push({
      id: 'einsatz',
      title: 'Unterrichtseinsatz',
      status: load.reason ?? 'Für diese Ausbildungsform sind keine Korridore hinterlegt.',
      next:
        input.teachingWeeks.length === 0
          ? 'Der Einsatz lässt sich trotzdem wochenweise festhalten – ohne Abgleich mit einem Korridor.'
          : null,
      started: input.teachingWeeks.length > 0,
      count: input.teachingWeeks.length,
    });
  }

  /* Ausbildungsstunden */
  areas.push({
    id: 'stunden',
    title: 'Ausbildungsstunden',
    status:
      seminar.count === 0
        ? 'Noch keine Veranstaltung erfasst.'
        : `${hoursText(seminar.total)} aus ${formatNumber(seminar.count)} Veranstaltungen${
            seminar.required ? ` von mindestens ${formatNumber(seminar.required)} Stunden` : ''
          }.`,
    next:
      seminar.count === 0
        ? 'Halte Seminartage, Fachseminare und Beratungsgespräche mit ihrem Umfang fest.'
        : seminar.behindBy > 0
          ? `Gegenüber dem zeitlichen Anteil fehlen ${hoursText(seminar.behindBy)} – prüfe, ob Veranstaltungen noch nachzutragen sind.`
          : null,
    started: seminar.count > 0,
    count: seminar.count,
  });

  /* Unterlagen */
  const openDocuments = documents.byStatus['benötigt'] + documents.byStatus['in Arbeit'];
  areas.push({
    id: 'unterlagen',
    title: 'Unterlagen und Formulare',
    status:
      documents.total === 0
        ? 'Noch keine Unterlage erfasst.'
        : `${formatNumber(documents.total)} Unterlagen erfasst, davon ${formatNumber(openDocuments)} offen.`,
    next:
      documents.upcomingSuggestions.length > 0
        ? `Für anstehende Termine sind ${formatNumber(
            documents.upcomingSuggestions.length,
          )} Formulare aus der Vorlage noch nicht in deinem Bestand.`
        : documents.total === 0
          ? 'Halte fest, welche Unterlagen und Formulare du für die nächsten Termine brauchst – die Vorlage macht dazu Vorschläge.'
          : openDocuments > 0
            ? 'Prüfe die offenen Unterlagen und halte fest, was abgegeben ist.'
            : null,
    started: documents.total > 0,
    count: documents.total,
  });

  /* Kontakte */
  areas.push({
    id: 'kontakte',
    title: 'Ansprechpersonen',
    status:
      input.contacts.length === 0
        ? 'Noch keine Ansprechperson erfasst.'
        : `${formatNumber(input.contacts.length)} Einträge.`,
    next:
      input.contacts.length === 0
        ? 'Trage Fachleitungen, Mentorin oder Mentor und Schulleitung ein – das erspart späteres Suchen.'
        : input.contacts.every((contact) => contact.role !== 'Fachleitung')
          ? 'Für die Fachleitungen ist noch kein Eintrag vorhanden.'
          : null,
    started: input.contacts.length > 0,
    count: input.contacts.length,
  });

  /* Prüfungsfahrplan */
  areas.push({
    id: 'pruefung',
    title: 'Prüfungsfahrplan',
    status:
      exam.days.length === 0
        ? 'Prüfungstage noch nicht eingetragen.'
        : `${formatNumber(exam.days.length)} Prüfungstage · ${formatNumber(exam.deadlines.length)} berechnete Fristen${
            exam.nextDeadline ? ` · nächste Frist am ${formatDate(exam.nextDeadline.date)}` : ''
          }.`,
    next: exam.missing[0] ?? null,
    started: exam.days.length > 0,
    count: exam.days.length,
  });

  /* Noten */
  areas.push({
    id: 'noten',
    title: 'Notenübersicht',
    status: grades.complete
      ? `Gesamtpunktzahl ${formatNumber(grades.points ?? 0)} Punkte (${grades.gradeLabel}).`
      : input.grades
        ? 'Einzelne Punktzahlen erfasst.'
        : 'Noch keine Punktzahlen erfasst.',
    next: grades.complete ? null : (grades.missing[0] ?? null),
    started: Boolean(input.grades),
    count: input.grades ? [...input.grades.practical, ...input.grades.oral, ...input.grades.teachingSamples].filter((part) => part.points !== undefined).length : 0,
  });

  /* Entwicklung */
  areas.push({
    id: 'entwicklung',
    title: 'Entwicklung und Boxenstopps',
    status:
      input.reflections.length === 0
        ? 'Noch kein Boxenstopp festgehalten.'
        : `${formatNumber(input.reflections.length)} Boxenstopps${activeGoal ? ` · Ziel: ${activeGoal.title}` : ''}.`,
    next: activeGoal
      ? input.reflections.length === 0
        ? 'Halte im Boxenstopp einen ersten kurzen Rückblick fest.'
        : null
      : 'Lege ein aktuelles Entwicklungsziel fest.',
    started: input.reflections.length > 0 || Boolean(activeGoal),
    count: input.reflections.length,
  });

  return areas;
}
