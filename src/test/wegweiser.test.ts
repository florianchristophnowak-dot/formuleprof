import { describe, expect, it } from 'vitest';
import {
  buildTeachingWeekRows,
  entryTotal,
  evaluateWeek,
  stageForWeek,
  stageText,
  summarizeTeachingLoad,
  teachingLoadApplies,
  teachingWeekId,
} from '../domain/teachingLoad';
import { requiredSeminarHours, summarizeSeminarHours } from '../domain/seminarHours';
import { computeExamDeadlines, examPlanGaps, summarizeExamPlan } from '../domain/examDeadlines';
import { computeFinalGrade, createGradeRecord, pointsToGradeLabel, roundPoints } from '../domain/grades';
import { collectFormSuggestions, documentFromSuggestion, summarizeDocuments } from '../domain/documents';
import { buildGuideOverview } from '../domain/guide';
import { buildSchedule } from '../domain/schedule';
import { halfYearOfDate, isWorkday, mondayOf, previousWorkday, workdaysBefore } from '../domain/dates';
import { FIXED_NOW, testProfile, testTemplate } from './factories';
import type { ExamPlan, GradeRecord, SeminarRecord, TeachingWeekEntry } from '../domain/types';

const template = testTemplate();
const profile = testProfile(); // Beginn 01.02.2026, 18 Monate, Thüringen, Gymnasium

function week(weekStart: string, hospitation: number, guided: number, independent: number, noSchool = false): TeachingWeekEntry {
  return {
    id: teachingWeekId(weekStart),
    weekStart: mondayOf(weekStart),
    hospitation,
    guided,
    independent,
    noSchool,
    updatedAt: FIXED_NOW.toISOString(),
  };
}

describe('Unterrichtseinsatz und Soll-Korridore', () => {
  const model = template.teachingLoad!;

  it('hinterlegt die fünf Abschnitte der Unterrichtsverpflichtung', () => {
    expect(model.stages).toHaveLength(5);
    expect(model.weeklyTotal).toBe(15);
    expect(stageText(model.stages[0]!)).toContain('H 15');
    expect(stageText(model.stages[1]!)).toContain('aU 4–6');
    expect(stageText(model.stages[4]!)).toContain('⌀ 8 sU');
  });

  it('ordnet Unterrichtswochen und Halbjahre dem richtigen Abschnitt zu', () => {
    expect(stageForWeek(model, 1, 1)?.id).toBe('ul-1');
    expect(stageForWeek(model, 3, 1)?.id).toBe('ul-1');
    expect(stageForWeek(model, 4, 1)?.id).toBe('ul-2');
    expect(stageForWeek(model, 7, 1)?.id).toBe('ul-3');
    expect(stageForWeek(model, 15, 1)?.id).toBe('ul-4');
    // Ab dem zweiten Ausbildungshalbjahr gilt der letzte Abschnitt.
    expect(stageForWeek(model, 20, 2)?.id).toBe('ul-5');
  });

  it('gilt nicht für Seiteneinstieg und Nachqualifizierung', () => {
    expect(teachingLoadApplies(model, profile).applies).toBe(true);
    const lateral = teachingLoadApplies(model, testProfile({ trainingForm: 'Seiteneinstieg' }));
    expect(lateral.applies).toBe(false);
    expect(lateral.reason).toMatch(/Seiteneinstieg/);
  });

  it('nennt Abweichungen vom Korridor im Klartext', () => {
    const stage = model.stages[1]!; // 4. bis 6. Woche: H 9–11, aU 4–6
    expect(evaluateWeek(week('2026-02-23', 10, 5, 0), stage, model)).toEqual([]);

    const deviations = evaluateWeek(week('2026-02-23', 4, 11, 0), stage, model);
    expect(deviations.some((text) => text.includes('Hospitation'))).toBe(true);
    expect(deviations.some((text) => text.includes('Angeleiteter Unterricht'))).toBe(true);
  });

  it('meldet eine Überschreitung des Richtwerts von 15 Wochenstunden', () => {
    const entry = week('2026-02-23', 10, 6, 2);
    expect(entryTotal(entry)).toBe(18);
    const deviations = evaluateWeek(entry, model.stages[1]!, model);
    expect(deviations.some((text) => text.includes('Richtwert'))).toBe(true);
  });

  it('zählt Ferienwochen nicht als Unterrichtswochen', () => {
    const entries = [
      week('2026-02-02', 15, 0, 0),
      week('2026-02-09', 0, 0, 0, true),
      week('2026-02-16', 15, 0, 0),
    ];
    const rows = buildTeachingWeekRows(model, profile, entries, '2026-02-20');
    expect(rows.map((row) => row.teachingWeek)).toEqual([1, null, 2]);
    expect(rows[1]?.deviations).toEqual([]);
  });

  it('fasst Durchschnitt und Höchstwert des selbstständigen Unterrichts je Halbjahr zusammen', () => {
    // Zweites Ausbildungshalbjahr beginnt am 01.08.2026.
    expect(halfYearOfDate('2026-02-01', '2026-07-31')).toBe(1);
    expect(halfYearOfDate('2026-02-01', '2026-08-03')).toBe(2);

    const entries = [week('2026-08-03', 2, 4, 13), week('2026-08-10', 2, 4, 11)];
    const summary = summarizeTeachingLoad(model, profile, entries, '2026-08-17');
    const second = summary.halfYears.find((half) => half.halfYear === 2);
    expect(second?.weeks).toBe(2);
    expect(second?.maxIndependent).toBe(13);
    expect(second?.deviations.some((text) => text.includes('Durchschnitt'))).toBe(true);
    expect(second?.deviations.some((text) => text.includes('zeitweise'))).toBe(true);
  });

  it('zählt vergangene Wochen ohne Eintrag', () => {
    const summary = summarizeTeachingLoad(model, profile, [week('2026-02-02', 15, 0, 0)], '2026-03-04');
    expect(summary.weeksWithEntry).toBe(1);
    expect(summary.weeksWithoutEntry).toBeGreaterThan(0);
    expect(summary.lastEntry?.weekStart).toBe('2026-02-02');
  });
});

describe('Ausbildungsstunden', () => {
  it('kennt den Mindestumfang je Ausbildungsdauer', () => {
    const requirements = template.seminarRequirements!;
    expect(requiredSeminarHours(requirements, 18)).toBe(200);
    expect(requiredSeminarHours(requirements, 24)).toBe(300);
    // Zwischenwerte werden interpoliert, kürzere Dauern anteilig gerechnet.
    expect(requiredSeminarHours(requirements, 21)).toBe(250);
    expect(requiredSeminarHours(requirements, 12)).toBe(133);
    expect(requiredSeminarHours(undefined, 18)).toBeNull();
  });

  it('vergleicht erfasste Stunden mit dem zeitlichen Anteil', () => {
    const records: SeminarRecord[] = [
      { id: 's1', date: '2026-02-10', kind: 'Einführungsveranstaltung', title: 'Einführung', hours: 8, updatedAt: '' },
      { id: 's2', date: '2026-03-10', kind: 'Fachseminar', title: 'Fachseminar Deutsch', subject: 'Deutsch', hours: 4, updatedAt: '' },
      { id: 's3', date: '2026-04-10', kind: 'Allgemeines Seminar', title: 'Allgemeines Seminar', hours: 6, updatedAt: '' },
    ];
    const summary = summarizeSeminarHours(records, template.seminarRequirements, profile, '2026-09-04');

    expect(summary.total).toBe(18);
    expect(summary.required).toBe(200);
    expect(summary.count).toBe(3);
    expect(summary.expectedByNow).toBeGreaterThan(18);
    expect(summary.behindBy).toBe((summary.expectedByNow ?? 0) - 18);
    expect(summary.remaining).toBe(182);
    expect(summary.byKind[0]?.kind).toBe('Einführungsveranstaltung');
    expect(summary.bySubject).toEqual([{ subject: 'Deutsch', hours: 4 }]);
  });
});

describe('Fristen der Staatsprüfung', () => {
  const model = template.examDeadlines!;

  it('zählt Werktage ohne Samstage und Sonntage', () => {
    expect(isWorkday('2026-09-18')).toBe(true); // Freitag
    expect(isWorkday('2026-09-19')).toBe(false); // Samstag
    expect(isWorkday('2026-09-20')).toBe(false); // Sonntag
    expect(previousWorkday('2026-09-21')).toBe('2026-09-18');
    // Zehn Werktage vor Montag, dem 15.06.2026, ist Montag, der 01.06.2026.
    expect(workdaysBefore('2026-06-15', 10)).toBe('2026-06-01');
    expect(workdaysBefore('2026-06-15', 5)).toBe('2026-06-08');
  });

  it('berechnet Themenbekanntgabe und Entwurfsabgabe bei beiden Lehrproben an einem Tag', () => {
    const plan: ExamPlan = {
      id: 'pruefungsplan',
      mode: 'zusammen',
      firstDay: '2027-06-15',
      secondDay: '2027-06-22',
      updatedAt: '',
    };
    const deadlines = computeExamDeadlines(plan, model);
    const announcement = deadlines.find((d) => d.id === 'themenbekanntgabe-1');
    const draft = deadlines.find((d) => d.id === 'entwurf-1');

    expect(announcement?.date).toBe(workdaysBefore('2027-06-15', 10));
    expect(draft?.date).toBe(previousWorkday('2027-06-15'));
    expect(draft?.time).toBe('12:00');
    expect(draft?.description).toMatch(/8 bis 12 Seiten/);
    // Der zweite Tag ist die mündliche Prüfung – ohne Entwurf.
    expect(deadlines.some((d) => d.id === 'entwurf-2')).toBe(false);
  });

  it('berechnet bei getrenntem Ablauf für jeden Tag eigene Fristen', () => {
    const plan: ExamPlan = {
      id: 'pruefungsplan',
      mode: 'getrennt',
      firstDay: '2027-06-15',
      secondDay: '2027-06-17',
      updatedAt: '',
    };
    const deadlines = computeExamDeadlines(plan, model);
    expect(deadlines.filter((d) => d.id.startsWith('themenbekanntgabe'))).toHaveLength(2);
    expect(deadlines.find((d) => d.id === 'themenbekanntgabe-2')?.date).toBe(workdaysBefore('2027-06-17', 5));
    expect(deadlines.find((d) => d.id === 'freistellung-2')?.date).toBe(previousWorkday('2027-06-17'));
  });

  it('nennt fehlende Angaben und die nächste Frist', () => {
    expect(examPlanGaps(null, model)).toHaveLength(3);
    const summary = summarizeExamPlan(
      { id: 'pruefungsplan', mode: 'zusammen', firstDay: '2027-06-15', secondDay: '2027-06-22', updatedAt: '' },
      model,
      '2027-06-01',
    );
    expect(summary.missing).toHaveLength(0);
    expect(summary.nextDeadline?.id).toBe('themenbekanntgabe-1');
    expect(summary.days).toHaveLength(2);
  });
});

describe('Gesamtnote', () => {
  const model = template.gradeModel!;

  it('rundet Zwischenwerte bis 0,5 zur schlechteren und ab 0,6 zur besseren Punktzahl', () => {
    expect(roundPoints(11.5, 0.6)).toBe(11);
    expect(roundPoints(11.6, 0.6)).toBe(12);
    expect(roundPoints(11.4, 0.6)).toBe(11);
    expect(roundPoints(15.9, 0.6)).toBe(15);
    expect(roundPoints(-1, 0.6)).toBe(0);
  });

  it('gewichtet Vornote fünffach, Prüfungslehrproben dreifach und die Teilprüfungen einfach', () => {
    const record: GradeRecord = {
      id: 'noten',
      preliminary: 12,
      teachingSamples: [],
      practical: [
        { id: 'plp-1', label: 'Prüfungslehrprobe Deutsch', points: 11 },
        { id: 'plp-2', label: 'Prüfungslehrprobe Geschichte', points: 13 },
      ],
      oral: [
        { id: 'muendlich-1', label: 'Erste Teilprüfung', points: 10 },
        { id: 'muendlich-2', label: 'Zweite Teilprüfung', points: 14 },
      ],
      updatedAt: '',
    };
    const result = computeFinalGrade(record, model);

    // 12 × 5 + 12 × 3 + 10 + 14 = 120; geteilt durch 10 ergibt 12,0 Punkte.
    expect(result.practicalAverage).toBe(12);
    expect(result.weightedSum).toBe(120);
    expect(result.raw).toBe(12);
    expect(result.points).toBe(12);
    expect(result.gradeLabel).toBe('gut');
    expect(result.complete).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('benennt fehlende Angaben und erkennt ein „ungenügend“', () => {
    const record = createGradeRecord(['Deutsch', 'Geschichte']);
    const incomplete = computeFinalGrade(record, model);
    expect(incomplete.complete).toBe(false);
    expect(incomplete.expectedOralCount).toBe(2);
    expect(incomplete.missing.length).toBeGreaterThan(0);

    const failed = computeFinalGrade(
      { ...record, practical: record.practical.map((part, index) => ({ ...part, points: index === 0 ? 0 : 9 })) },
      model,
    );
    expect(failed.failures[0]).toMatch(/ungenügend/);
  });

  it('ordnet Punktzahlen den Notenstufen zu', () => {
    expect(pointsToGradeLabel(15)).toBe('sehr gut');
    expect(pointsToGradeLabel(10)).toBe('gut');
    expect(pointsToGradeLabel(7)).toBe('befriedigend');
    expect(pointsToGradeLabel(4)).toBe('ausreichend');
    expect(pointsToGradeLabel(1)).toBe('mangelhaft');
    expect(pointsToGradeLabel(0)).toBe('ungenügend');
  });
});

describe('Unterlagen', () => {
  const milestones = buildSchedule(template, profile, { now: FIXED_NOW }).milestones;

  it('schlägt die Formularsätze der Vorlage zum passenden Termin vor', () => {
    const suggestions = collectFormSuggestions(template, milestones);
    const lehrprobe = milestones.find((m) => m.definitionId === 'lehrprobe1')!;
    const forLehrprobe = suggestions.filter((s) => s.milestoneId === lehrprobe.id);
    expect(forLehrprobe.map((s) => s.code)).toContain('F010');

    // Der Satz zur Prüfungslehrprobe hängt nur am Prüfungsunterricht.
    const plp = suggestions.filter((s) => s.code === 'F220');
    expect(plp).toHaveLength(1);
    expect(plp[0]?.milestoneTitle).toMatch(/Prüfungslehrproben/);
    // Das Formular zur mündlichen Prüfung gehört zum zweiten Prüfungstag.
    const oral = suggestions.find((s) => s.code === 'F250');
    expect(oral?.milestoneTitle).toMatch(/mündliche Prüfung/);
  });

  it('blendet übernommene Vorschläge aus und zählt offene Unterlagen', () => {
    const suggestions = collectFormSuggestions(template, milestones);
    const first = suggestions[0]!;
    const record = documentFromSuggestion(first, 'benötigt', FIXED_NOW);

    const summary = summarizeDocuments(template, milestones, [record], '2026-09-04');
    expect(summary.total).toBe(1);
    expect(summary.byStatus['benötigt']).toBe(1);
    expect(summary.open).toHaveLength(1);
    expect(summary.suggestions.some((s) => s.id === first.id)).toBe(false);
    expect(summary.suggestions.length).toBe(suggestions.length - 1);
  });
});

describe('Stand des Wegweisers', () => {
  it('nennt für jeden Bereich Stand und nächsten Schritt', () => {
    const milestones = buildSchedule(template, profile, { now: FIXED_NOW }).milestones;
    const areas = buildGuideOverview({
      profile,
      template,
      milestones,
      teachingWeeks: [],
      seminarRecords: [],
      documents: [],
      contacts: [],
      examPlan: null,
      grades: null,
      goals: [],
      reflections: [],
      todayIso: '2026-09-04',
    });

    expect(areas.map((area) => area.id)).toEqual([
      'einsatz',
      'stunden',
      'unterlagen',
      'kontakte',
      'pruefung',
      'noten',
      'entwicklung',
    ]);
    // Ohne Einträge gibt es in jedem Bereich einen nächsten Schritt.
    expect(areas.every((area) => area.next !== null)).toBe(true);
    expect(areas.every((area) => area.started === false)).toBe(true);

    const filled = buildGuideOverview({
      profile,
      template,
      milestones,
      teachingWeeks: [week('2026-08-31', 3, 6, 6)],
      seminarRecords: [
        { id: 's1', date: '2026-09-01', kind: 'Fachseminar', title: 'Fachseminar', hours: 4, updatedAt: '' },
      ],
      documents: [],
      contacts: [{ id: 'k1', name: 'Fachleitung Deutsch', role: 'Fachleitung', updatedAt: '' }],
      examPlan: null,
      grades: null,
      goals: [],
      reflections: [],
      todayIso: '2026-09-04',
    });
    expect(filled.find((area) => area.id === 'einsatz')?.started).toBe(true);
    expect(filled.find((area) => area.id === 'kontakte')?.next).toBeNull();
  });
});
