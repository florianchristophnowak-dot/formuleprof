import { describe, expect, it } from 'vitest';
import { DEFAULT_CHALLENGE_RULES, detectChallenges } from '../domain/challenges';
import { buildSchedule } from '../domain/schedule';
import { FIXED_NOW, testProfile, testTemplate } from './factories';
import { teachingWeekId } from '../domain/teachingLoad';
import { mondayOf } from '../domain/dates';
import type {
  DevelopmentGoal,
  DocumentRecord,
  ExamPlan,
  MilestoneInstance,
  ReflectionEntry,
  SeminarRecord,
  TeachingWeekEntry,
} from '../domain/types';

const template = testTemplate();
const profile = testProfile();
const TODAY = '2026-09-04';

function baseMilestones(): MilestoneInstance[] {
  return buildSchedule(template, profile, { now: FIXED_NOW }).milestones;
}

describe('Vorschau auf Herausforderungen', () => {
  it('erkennt zwei grosse Termine innerhalb von 21 Tagen', () => {
    const milestones = baseMilestones()
      .map((m) => {
        if (m.definitionId === 'ub3') return { ...m, manualStart: '2026-09-20', manualEnd: '2026-09-20' };
        if (m.definitionId === 'lehrprobe1') return { ...m, manualStart: '2026-09-29', manualEnd: '2026-09-29' };
        return m;
      })
      // Nur die beiden betrachteten Termine, damit der Abstand eindeutig ist.
      .filter((m) => ['ub3', 'lehrprobe1'].includes(m.definitionId));

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

  it('meldet fehlende Angaben zum Unterrichtseinsatz', () => {
    const rules = DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'unterrichtseinsatzFehlt');

    const withoutEntries = detectChallenges({
      milestones: [],
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      teachingWeeks: [],
    });
    expect(withoutEntries).toHaveLength(1);
    expect(withoutEntries[0]?.action).toMatch(/Wochenstunden/);

    // Ohne Profil bleibt die Regel still.
    expect(detectChallenges({ milestones: [], goals: [], reflections: [], todayIso: TODAY, rules })).toHaveLength(0);
  });

  it('meldet Abweichungen vom Soll-Korridor des Unterrichtseinsatzes', () => {
    const rules = DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'unterrichtseinsatzAbweichung');
    // Woche im zweiten Ausbildungshalbjahr: vorgesehen sind H 1–3 und aU+sU 12–14.
    const week = (weekStart: string, hospitation: number, guided: number, independent: number): TeachingWeekEntry => ({
      id: teachingWeekId(weekStart),
      weekStart: mondayOf(weekStart),
      hospitation,
      guided,
      independent,
      updatedAt: FIXED_NOW.toISOString(),
    });

    const inCorridor = detectChallenges({
      milestones: [],
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      teachingWeeks: [week('2026-08-31', 2, 4, 8)],
    });
    expect(inCorridor).toHaveLength(0);

    const deviating = detectChallenges({
      milestones: [],
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      teachingWeeks: [week('2026-08-31', 9, 2, 13)],
    });
    expect(deviating.length).toBeGreaterThan(0);
    expect(deviating[0]?.why).toMatch(/Hospitation/);
  });

  it('meldet einen Rückstand beim Nachweis der Ausbildungsstunden', () => {
    const rules = DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'ausbildungsstundenRueckstand');
    const record = (id: string, hours: number): SeminarRecord => ({
      id,
      date: '2026-03-02',
      kind: 'Fachseminar',
      title: `Fachseminar ${id}`,
      hours,
      updatedAt: FIXED_NOW.toISOString(),
    });

    const behind = detectChallenges({
      milestones: [],
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      seminarRecords: [record('s1', 10)],
    });
    expect(behind).toHaveLength(1);
    expect(behind[0]?.why).toMatch(/mindestens 200 Stunden/);

    // Mit ausreichend erfassten Stunden entfällt der Hinweis.
    const complete = detectChallenges({
      milestones: [],
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      seminarRecords: [record('s1', 120)],
    });
    expect(complete).toHaveLength(0);
  });

  it('meldet fehlende Unterlagen zu einem anstehenden Termin', () => {
    const rules = DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'unterlagenOffen');
    const milestones = baseMilestones().map((m) =>
      m.definitionId === 'lehrprobe1' ? { ...m, manualStart: '2026-09-25', manualEnd: '2026-09-25' } : m,
    );

    const hints = detectChallenges({
      milestones,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      documents: [],
    });
    const forLehrprobe = hints.find((hint) => hint.why.includes('Lehrprobe'));
    expect(forLehrprobe?.why).toMatch(/F010/);

    // Übernommene Unterlagen verschwinden aus dem Hinweis.
    const lehrprobe = milestones.find((m) => m.definitionId === 'lehrprobe1')!;
    const documents: DocumentRecord[] = [
      { id: 'u1', title: 'Formblatt F010', code: 'F010', milestoneId: lehrprobe.id, status: 'vorhanden', updatedAt: '' },
    ];
    const after = detectChallenges({
      milestones,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      documents,
    });
    expect(after.find((hint) => hint.why.includes('Lehrprobe'))?.why).not.toMatch(/F010/);
  });

  it('erinnert an den Prüfungsfahrplan und an bevorstehende Fristen', () => {
    const rules = DEFAULT_CHALLENGE_RULES.filter((r) => r.kind === 'pruefungsplanUnvollstaendig');
    const milestones = baseMilestones().map((m) =>
      m.definitionId === 'pruefung-unterricht' ? { ...m, manualStart: '2026-11-02', manualEnd: '2026-11-02' } : m,
    );

    const withoutPlan = detectChallenges({
      milestones,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      examPlan: null,
    });
    expect(withoutPlan).toHaveLength(1);
    expect(withoutPlan[0]?.why).toMatch(/Ablaufform/);

    // Mit vollständigem Plan bleibt nur der Hinweis auf eine nahe Frist.
    const plan: ExamPlan = {
      id: 'pruefungsplan',
      mode: 'zusammen',
      firstDay: '2026-09-21',
      secondDay: '2026-09-28',
      updatedAt: '',
    };
    const withPlan = detectChallenges({
      milestones,
      goals: [],
      reflections: [],
      todayIso: TODAY,
      rules,
      profile,
      template,
      examPlan: plan,
    });
    expect(withPlan).toHaveLength(1);
    expect(withPlan[0]?.challenge).toMatch(/Frist/);
    expect(withPlan[0]?.why).toMatch(/Themenbekanntgabe/);
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
