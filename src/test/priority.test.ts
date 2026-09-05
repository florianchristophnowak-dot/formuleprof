import { describe, expect, it } from 'vitest';
import { MAX_NEXT_STEPS, selectNextSteps } from '../domain/priority';
import { buildSchedule } from '../domain/schedule';
import { FIXED_NOW, testProfile, testTemplate } from './factories';
import type { MilestoneInstance } from '../domain/types';

const template = testTemplate();
const profile = testProfile();
const schedule = buildSchedule(template, profile, { now: FIXED_NOW });
const TODAY = '2026-09-04';

describe('Auswahl der aktuellen Handlungsschritte', () => {
  it('hebt höchstens drei Schritte hervor', () => {
    const steps = selectNextSteps(schedule.milestones, TODAY);
    expect(steps.length).toBeLessThanOrEqual(MAX_NEXT_STEPS);
    expect(steps.length).toBe(3);
  });

  it('nennt für jeden Schritt nachvollziehbare Gründe', () => {
    const steps = selectNextSteps(schedule.milestones, TODAY);
    for (const step of steps) {
      expect(step.reasons.length).toBeGreaterThan(0);
      expect(step.reasons.every((reason) => reason.trim().length > 0)).toBe(true);
    }
  });

  it('stellt überfällige Punkte an die erste Stelle', () => {
    // Alles Zurückliegende ist erledigt, nur ein Termin bleibt offen und überfällig.
    const withOverdue = schedule.milestones.map((m) => {
      if (m.definitionId === 'elternabend') {
        return { ...m, manualStart: '2026-07-01', manualEnd: '2026-07-01' };
      }
      return m.computedEnd < TODAY ? { ...m, status: 'erledigt' as const } : m;
    });
    const steps = selectNextSteps(withOverdue, TODAY);
    expect(steps[0]?.milestone.definitionId).toBe('elternabend');
    expect(steps[0]?.daysUntil).toBeLessThan(0);
    expect(steps[0]?.reasons[0]).toMatch(/noch nicht abgeschlossen/);
  });

  it('ordnet mehrere überfällige Punkte nach ihrem Termin', () => {
    const steps = selectNextSteps(schedule.milestones, TODAY);
    const overdue = steps.filter((step) => step.daysUntil < 0);
    const sorted = [...overdue].sort((a, b) =>
      a.milestone.computedEnd < b.milestone.computedEnd ? -1 : 1,
    );
    expect(overdue.map((s) => s.milestone.id)).toEqual(sorted.map((s) => s.milestone.id));
  });

  it('lässt erledigte und entfallene Schritte aus', () => {
    const done: MilestoneInstance[] = schedule.milestones.map((m) => ({ ...m, status: 'erledigt' }));
    expect(selectNextSteps(done, TODAY)).toHaveLength(0);
  });

  it('liefert bei gleicher Ausgangslage stets dieselbe Reihenfolge', () => {
    const first = selectNextSteps(schedule.milestones, TODAY).map((s) => s.milestone.id);
    const shuffled = [...schedule.milestones].reverse();
    const second = selectNextSteps(shuffled, TODAY).map((s) => s.milestone.id);
    expect(second).toEqual(first);
  });

  it('weist auf offene Voraussetzungen hin', () => {
    const steps = selectNextSteps(schedule.milestones, '2027-01-10');
    const blocked = steps.find((step) => step.blockedBy.length > 0);
    if (blocked) {
      expect(blocked.reasons.some((reason) => reason.startsWith('Voraussetzung noch offen'))).toBe(true);
    }
    expect(steps.length).toBeLessThanOrEqual(MAX_NEXT_STEPS);
  });
});
