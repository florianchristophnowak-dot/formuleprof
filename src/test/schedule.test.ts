import { describe, expect, it } from 'vitest';
import {
  buildSchedule,
  createScheduleContext,
  effectiveStart,
  resolveDateRule,
  resolveMilestoneRange,
  setManualDate,
} from '../domain/schedule';
import { dateAtFraction, trainingEndDate, trainingMonth } from '../domain/dates';
import { FIXED_NOW, testProfile, testTemplate } from './factories';
import type { MilestoneInstance } from '../domain/types';

function byDefinition(milestones: MilestoneInstance[], id: string): MilestoneInstance {
  const found = milestones.find((m) => m.definitionId === id);
  if (!found) throw new Error(`Meilenstein fehlt: ${id}`);
  return found;
}

describe('Ausbildungsdauern', () => {
  it('berechnet das Ausbildungsende für 12, 18 und 24 Monate', () => {
    expect(trainingEndDate('2026-02-01', 12)).toBe('2027-01-31');
    expect(trainingEndDate('2026-02-01', 18)).toBe('2027-07-31');
    expect(trainingEndDate('2026-02-01', 24)).toBe('2028-01-31');
  });

  it('bestimmt den laufenden Ausbildungsmonat', () => {
    expect(trainingMonth('2026-02-01', '2026-02-01')).toBe(1);
    expect(trainingMonth('2026-02-01', '2026-02-28')).toBe(1);
    expect(trainingMonth('2026-02-01', '2026-03-01')).toBe(2);
    expect(trainingMonth('2026-02-01', '2026-09-04')).toBe(8);
  });

  it('skaliert Anteile mit der Ausbildungsdauer', () => {
    // Die Hälfte einer 12-monatigen Ausbildung liegt deutlich früher als bei 24 Monaten.
    expect(dateAtFraction('2026-02-01', 12, 0.5)).toBe('2026-08-02');
    expect(dateAtFraction('2026-02-01', 24, 0.5)).toBe('2027-02-01');
    expect(dateAtFraction('2026-02-01', 18, 0)).toBe('2026-02-01');
    expect(dateAtFraction('2026-02-01', 18, 1)).toBe('2027-07-31');
  });

  it('erzeugt für unterschiedliche Dauern unterschiedlich lange Strecken', () => {
    const template = testTemplate();
    const short = buildSchedule(template, testProfile({ durationMonths: 12 }), { now: FIXED_NOW });
    const long = buildSchedule(template, testProfile({ durationMonths: 24 }), { now: FIXED_NOW });

    const shortExam = byDefinition(short.milestones, 'pruefung-unterricht');
    const longExam = byDefinition(long.milestones, 'pruefung-unterricht');
    expect(shortExam.computedStart < longExam.computedStart).toBe(true);

    // Bedingte Meilensteine entfallen bei verkürzter Ausbildung.
    expect(short.milestones.some((m) => m.definitionId === 'ub5')).toBe(false);
    expect(long.milestones.some((m) => m.definitionId === 'ub5')).toBe(true);
  });
});

describe('Terminregeln', () => {
  const template = testTemplate();
  const profile = testProfile();
  const context = createScheduleContext(template, profile);

  it('löst absolute Termine auf', () => {
    expect(resolveDateRule({ kind: 'absolut', date: '2026-05-12' }, context)).toEqual({
      start: '2026-05-12',
      end: '2026-05-12',
      isWindow: false,
    });
  });

  it('löst Termine relativ zum Ausbildungsbeginn auf', () => {
    const range = resolveDateRule(
      { kind: 'relativ', anchor: { type: 'start' }, offset: { amount: 6, unit: 'Wochen' } },
      context,
    );
    expect(range.start).toBe('2026-03-15');
  });

  it('löst Zeitfenster statt exakter Tage auf', () => {
    const range = resolveDateRule(
      {
        kind: 'zeitfenster',
        from: { anchor: { type: 'start' }, offset: { amount: 1, unit: 'Monate' } },
        to: { anchor: { type: 'start' }, offset: { amount: 3, unit: 'Monate' } },
      },
      context,
    );
    expect(range).toEqual({ start: '2026-03-01', end: '2026-05-01', isWindow: true });
  });

  it('löst Ausbildungsdrittel auf', () => {
    const range = resolveDateRule({ kind: 'drittel', third: 2 }, context);
    expect(range.isWindow).toBe(true);
    expect(range.start).toBe(dateAtFraction('2026-02-01', 18, 1 / 3));
    expect(range.end).toBe(dateAtFraction('2026-02-01', 18, 2 / 3));
  });

  it('löst Termine relativ zu einem anderen Meilenstein auf', () => {
    const exam = resolveMilestoneRange('pruefung-unterricht', context);
    const colloquium = resolveMilestoneRange('pruefung-kolloquium', context);
    const registration = resolveMilestoneRange('anmeldung-pruefung', context);

    const examDate = new Date(`${exam.start}T00:00:00`);
    const colloquiumDate = new Date(`${colloquium.start}T00:00:00`);
    const registrationDate = new Date(`${registration.start}T00:00:00`);

    expect((colloquiumDate.getTime() - examDate.getTime()) / 86400000).toBe(7);
    expect((examDate.getTime() - registrationDate.getTime()) / 86400000).toBe(90);
  });

  it('erkennt zirkuläre Abhängigkeiten', () => {
    const broken = testTemplate();
    broken.milestones = [
      {
        ...broken.milestones[0]!,
        id: 'a',
        dateRule: { kind: 'relativ', anchor: { type: 'milestone', milestoneId: 'b' }, offset: { amount: 1, unit: 'Tage' } },
      },
      {
        ...broken.milestones[0]!,
        id: 'b',
        dateRule: { kind: 'relativ', anchor: { type: 'milestone', milestoneId: 'a' }, offset: { amount: 1, unit: 'Tage' } },
      },
    ];
    const brokenContext = createScheduleContext(broken, profile);
    expect(() => resolveMilestoneRange('a', brokenContext)).toThrowError(/Zirkuläre/);
  });
});

describe('Neuberechnung', () => {
  const template = testTemplate();

  it('lässt manuell eingetragene Termine unverändert und passt abhängige Termine an', () => {
    const profile = testProfile();
    const initial = buildSchedule(template, profile, { now: FIXED_NOW });

    const manualDate = '2026-06-15';
    const withManual = initial.milestones.map((m) =>
      m.definitionId === 'ub2' ? { ...m, manualStart: manualDate } : m,
    );

    // Beginn verschiebt sich um einen Monat nach hinten.
    const shiftedProfile = testProfile({ startDate: '2026-03-01' });
    const recalculated = buildSchedule(template, shiftedProfile, { existing: withManual, now: FIXED_NOW });

    const ub2 = recalculated.milestones.find((m) => m.definitionId === 'ub2');
    expect(ub2?.manualStart).toBe(manualDate);
    expect(effectiveStart(ub2!)).toBe(manualDate);
    expect(recalculated.keptManual).toContain(ub2?.id);

    const ub1Before = initial.milestones.find((m) => m.definitionId === 'ub1');
    const ub1After = recalculated.milestones.find((m) => m.definitionId === 'ub1');
    expect(ub1After?.computedStart).not.toBe(ub1Before?.computedStart);
    expect(recalculated.changed.some((c) => c.id === ub1After?.id)).toBe(true);
  });

  it('verschiebt abhängige Termine, wenn ein zentraler Meilenstein verschoben wird', () => {
    const profile = testProfile();
    const initial = buildSchedule(template, profile, { now: FIXED_NOW });
    const exam = byDefinition(initial.milestones, 'pruefung-unterricht');
    const colloquiumBefore = byDefinition(initial.milestones, 'pruefung-kolloquium');
    const paperBefore = byDefinition(initial.milestones, 'schriftliche-arbeit');

    const newExamDate = '2027-06-01';
    const result = setManualDate(template, profile, initial.milestones, exam.id, newExamDate, undefined, FIXED_NOW);

    const examAfter = byDefinition(result.milestones, 'pruefung-unterricht');
    const colloquiumAfter = byDefinition(result.milestones, 'pruefung-kolloquium');
    const paperAfter = byDefinition(result.milestones, 'schriftliche-arbeit');

    expect(effectiveStart(examAfter)).toBe(newExamDate);
    expect(examAfter.status).toBe('verschoben');
    expect(colloquiumAfter.computedStart).toBe('2027-06-08');
    expect(paperAfter.computedStart).toBe('2027-04-27');
    expect(colloquiumAfter.computedStart).not.toBe(colloquiumBefore.computedStart);
    expect(paperAfter.computedStart).not.toBe(paperBefore.computedStart);
  });

  it('erhält persönliche Angaben bei der Neuberechnung', () => {
    const profile = testProfile();
    const initial = buildSchedule(template, profile, { now: FIXED_NOW });
    const edited = initial.milestones.map((m) =>
      m.definitionId === 'ub1'
        ? {
            ...m,
            notes: 'Schwerpunkt: Redeanteile',
            status: 'in Arbeit' as const,
            checklist: m.checklist.map((item, index) => (index === 0 ? { ...item, done: true } : item)),
          }
        : m,
    );

    const recalculated = buildSchedule(template, testProfile({ durationMonths: 24 }), {
      existing: edited,
      now: FIXED_NOW,
    });
    const ub1 = byDefinition(recalculated.milestones, 'ub1');
    expect(ub1.notes).toBe('Schwerpunkt: Redeanteile');
    expect(ub1.status).toBe('in Arbeit');
    expect(ub1.checklist[0]?.done).toBe(true);
  });
});

describe('Etappen', () => {
  const template = testTemplate();
  const profile = testProfile();

  it('bildet lückenlose, überschneidungsfreie Etappenfenster', async () => {
    const { phaseBoundaries } = await import('../domain/schedule');
    const boundaries = phaseBoundaries(template.phases, profile.startDate, profile.durationMonths);

    expect(boundaries[0]?.start).toBe(profile.startDate);
    expect(boundaries[boundaries.length - 1]?.end).toBe('2027-07-31');

    for (let index = 1; index < boundaries.length; index += 1) {
      const previous = boundaries[index - 1]!;
      const current = boundaries[index]!;
      expect(previous.end < current.start).toBe(true);
      const gap = new Date(current.start).getTime() - new Date(previous.end).getTime();
      expect(gap).toBe(86400000);
    }
  });

  it('ordnet jeden Meilenstein genau einer Etappe zu', async () => {
    const { buildSchedule: build, groupByPhase } = await import('../domain/schedule');
    const schedule = build(template, profile, { now: FIXED_NOW });
    const groups = groupByPhase(
      template.phases,
      profile.startDate,
      profile.durationMonths,
      schedule.milestones,
    );

    const assigned = [...groups.values()].flat();
    expect(assigned).toHaveLength(schedule.milestones.length);
    expect(new Set(assigned.map((m) => m.id)).size).toBe(schedule.milestones.length);
  });
});

describe('Wechsel der Ausbildungsvorlage', () => {
  it('übernimmt persönliche Angaben und entfernt Termine ohne Entsprechung', () => {
    const first = testTemplate('demo-thueringen-gymnasium');
    const profile = testProfile();

    const initial = buildSchedule(first, profile, { now: FIXED_NOW });
    const edited = initial.milestones.map((m) =>
      m.definitionId === 'ub1' ? { ...m, notes: 'Schwerpunkt Redeanteile', status: 'erledigt' as const } : m,
    );

    // Zweite Vorlage ohne die Lehrproben, dafür mit eigener Kennung.
    const second = testTemplate('demo-grundschule');
    second.milestones = second.milestones.filter((m) => !m.id.startsWith('lehrprobe'));
    second.milestones = second.milestones.map((m) =>
      m.prerequisites.some((p) => p.startsWith('lehrprobe'))
        ? { ...m, prerequisites: m.prerequisites.filter((p) => !p.startsWith('lehrprobe')) }
        : m,
    );

    const switched = buildSchedule(second, testProfile({ templateId: second.id }), {
      existing: edited,
      now: FIXED_NOW,
    });

    expect(switched.milestones.every((m) => m.templateId === second.id)).toBe(true);
    expect(switched.milestones.some((m) => m.definitionId.startsWith('lehrprobe'))).toBe(false);
    expect(new Set(switched.milestones.map((m) => m.id)).size).toBe(switched.milestones.length);

    const ub1 = switched.milestones.find((m) => m.definitionId === 'ub1');
    expect(ub1?.notes).toBe('Schwerpunkt Redeanteile');
    expect(ub1?.status).toBe('erledigt');
    expect(ub1?.id).toBe(`${second.id}::ub1`);
  });

  it('behält individuell vereinbarte Termine ohne Entsprechung in der neuen Vorlage', () => {
    const first = testTemplate('demo-thueringen-gymnasium');
    const profile = testProfile();
    const initial = buildSchedule(first, profile, { now: FIXED_NOW });

    const vereinbart: MilestoneInstance = {
      ...initial.milestones[0]!,
      id: 'fachleitung::sondertermin',
      definitionId: 'sondertermin',
      templateId: 'fachleitung',
      title: 'Individuell vereinbarter Termin',
      agreed: true,
      manualStart: '2026-10-01',
      manualEnd: '2026-10-01',
      prerequisites: [],
    };

    const result = buildSchedule(first, profile, {
      existing: [...initial.milestones, vereinbart],
      now: FIXED_NOW,
    });

    const kept = result.milestones.find((m) => m.definitionId === 'sondertermin');
    expect(kept).toBeDefined();
    expect(kept?.agreed).toBe(true);
    expect(effectiveStart(kept!)).toBe('2026-10-01');
  });
});
