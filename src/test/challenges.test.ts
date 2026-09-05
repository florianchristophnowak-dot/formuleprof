import { describe, expect, it } from 'vitest';
import { DEFAULT_CHALLENGE_RULES, detectChallenges } from '../domain/challenges';
import { buildSchedule } from '../domain/schedule';
import { FIXED_NOW, testProfile, testTemplate } from './factories';
import type { DevelopmentGoal, MilestoneInstance, ReflectionEntry } from '../domain/types';

const template = testTemplate();
const profile = testProfile();
const TODAY = '2026-09-04';

function baseMilestones(): MilestoneInstance[] {
  return buildSchedule(template, profile, { now: FIXED_NOW }).milestones;
}

describe('Vorschau auf Herausforderungen', () => {
  it('erkennt zwei grosse Termine innerhalb von 21 Tagen', () => {
    const milestones = baseMilestones().map((m) => {
      if (m.definitionId === 'ub3') return { ...m, manualStart: '2026-09-20', manualEnd: '2026-09-20' };
      if (m.definitionId === 'lehrprobe1') return { ...m, manualStart: '2026-09-29', manualEnd: '2026-09-29' };
      return m;
    });

    const hints = detectChallenges({
      milestones,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'terminhaeufung'),
    });

    expect(hints).toHaveLength(1);
    const hint = hints[0]!;
    expect(hint.challenge).toBe('Mehrere Anforderungen überschneiden sich.');
    expect(hint.why).toMatch(/9 Tage auseinander/);
    expect(hint.action.length).toBeGreaterThan(0);
    expect(hint.relatedMilestoneIds).toHaveLength(2);
  });

  it('meldet keine Häufung, wenn die Termine weiter auseinanderliegen', () => {
    const milestones = baseMilestones().map((m) => {
      if (m.definitionId === 'ub3') return { ...m, manualStart: '2026-09-20', manualEnd: '2026-09-20' };
      if (m.definitionId === 'lehrprobe1') return { ...m, manualStart: '2026-11-20', manualEnd: '2026-11-20' };
      return m;
    });
    const otherMajor = milestones.filter(
      (m) => (m.major || m.mandatory) && m.status === 'offen' && m.computedStart >= TODAY,
    );
    expect(otherMajor.length).toBeGreaterThan(0);

    const hints = detectChallenges({
      milestones: milestones.filter((m) => ['ub3', 'lehrprobe1'].includes(m.definitionId)),
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'terminhaeufung'),
    });
    expect(hints).toHaveLength(0);
  });

  it('meldet fehlende Beobachtungsschwerpunkte bei Unterrichtsbesuchen', () => {
    const milestones = baseMilestones().map((m) =>
      m.definitionId === 'ub3' ? { ...m, manualStart: '2026-09-20', manualEnd: '2026-09-20' } : m,
    );
    const hints = detectChallenges({
      milestones,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'beobachtungsschwerpunktFehlt'),
    });
    expect(hints.some((h) => h.relatedMilestoneIds.some((id) => id.endsWith('ub3')))).toBe(true);

    const withFocus = milestones.map((m) =>
      m.definitionId === 'ub3' ? { ...m, observationFocus: 'Redeanteile der Lernenden' } : m,
    );
    const afterHints = detectChallenges({
      milestones: withFocus,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'beobachtungsschwerpunktFehlt'),
    });
    expect(afterHints.some((h) => h.relatedMilestoneIds.some((id) => id.endsWith('ub3')))).toBe(false);
  });

  it('erinnert an ein länger nicht reflektiertes Entwicklungsziel', () => {
    const goal: DevelopmentGoal = {
      id: 'ziel-1',
      title: 'Klare Arbeitsaufträge formulieren',
      description: '',
      createdAt: '2026-05-01T10:00:00.000Z',
      lastReviewedAt: '2026-06-01T10:00:00.000Z',
      active: true,
    };
    const hints = detectChallenges({
      milestones: [],
      goals: [goal],
      reflections: [],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'zielNichtReflektiert'),
    });
    expect(hints).toHaveLength(1);
    expect(hints[0]?.why).toMatch(/01\.06\.2026/);
  });

  it('erinnert an die Erprobung einer Rückmeldung', () => {
    const reflection: ReflectionEntry = {
      id: 'r1',
      createdAt: '2026-07-01T10:00:00.000Z',
      date: '2026-07-01',
      answers: { rueckmeldung: 'Mehr Wartezeit nach Impulsen lassen.' },
      triedOut: false,
    };
    const hints = detectChallenges({
      milestones: [],
      goals: [],
      reflections: [reflection],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'rueckmeldungOhneErprobung'),
    });
    expect(hints).toHaveLength(1);
    expect(hints[0]?.action).toMatch(/ausprobierst/);

    const withTrial = detectChallenges({
      milestones: [],
      goals: [],
      reflections: [reflection, { ...reflection, id: 'r2', date: '2026-07-20', triedOut: true }],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'rueckmeldungOhneErprobung'),
    });
    expect(withTrial).toHaveLength(0);
  });

  it('meldet einen verkürzten Vorlauf nach einer Verschiebung', () => {
    const milestones = baseMilestones().map((m) =>
      m.definitionId === 'lehrprobe1'
        ? { ...m, previousStart: '2026-12-01', manualStart: '2026-09-25', manualEnd: '2026-09-25' }
        : m,
    );
    const hints = detectChallenges({
      milestones,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'vorlaufVerkuerzt'),
    });
    expect(hints).toHaveLength(1);
    expect(hints[0]?.why).toMatch(/statt am 01\.12\.2026/);
  });

  it('liefert zu jedem Hinweis drei Bestandteile ohne Wahrscheinlichkeitswerte', () => {
    const hints = detectChallenges({
      milestones: baseMilestones(),
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules: DEFAULT_CHALLENGE_RULES,
    });
    expect(hints.length).toBeGreaterThan(0);
    for (const hint of hints) {
      expect(hint.challenge.length).toBeGreaterThan(0);
      expect(hint.why.length).toBeGreaterThan(0);
      expect(hint.action.length).toBeGreaterThan(0);
      expect(`${hint.challenge} ${hint.why} ${hint.action}`).not.toMatch(/\d+\s?%|Wahrscheinlichkeit|Risiko/);
    }
  });
});
