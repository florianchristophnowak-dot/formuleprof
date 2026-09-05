/**
 * Vorschau auf mögliche Herausforderungen.
 *
 * Vollständig regelbasiert und lokal: keine KI, keine psychologische
 * Bewertung, keine Wahrscheinlichkeitswerte. Jeder Hinweis besteht aus
 * „Mögliche Herausforderung“, „Warum du das siehst“ und „Empfohlene Reaktion“.
 */
import { daysBetween, formatDate, formatNumber } from './dates';
import { effectiveEnd, effectiveStart } from './schedule';
import type {
  ChallengeHint,
  ChallengeRule,
  DevelopmentGoal,
  IsoDate,
  MilestoneInstance,
  ReflectionEntry,
} from './types';

export interface ChallengeInput {
  milestones: MilestoneInstance[];
  goals: DevelopmentGoal[];
  reflections: ReflectionEntry[];
  todayIso: IsoDate;
  rules: ChallengeRule[];
}

/** Standardregeln, die jeder Vorlage mitgegeben werden. */
export const DEFAULT_CHALLENGE_RULES: ChallengeRule[] = [
  {
    id: 'regel-terminhaeufung',
    kind: 'terminhaeufung',
    title: 'Mehrere grössere Termine liegen dicht beieinander',
    enabled: true,
    horizonDays: 90,
    params: { abstandTage: 21 },
  },
  {
    id: 'regel-vorarbeit',
    kind: 'vorarbeitOffen',
    title: 'Notwendige Vorarbeit ist noch nicht begonnen',
    enabled: true,
    horizonDays: 60,
  },
  {
    id: 'regel-beobachtungsschwerpunkt',
    kind: 'beobachtungsschwerpunktFehlt',
    title: 'Unterrichtsbesuch ohne Beobachtungsschwerpunkt',
    enabled: true,
    horizonDays: 45,
  },
  {
    id: 'regel-entwicklungsziel',
    kind: 'zielNichtReflektiert',
    title: 'Entwicklungsziel längere Zeit nicht reflektiert',
    enabled: true,
    horizonDays: 0,
    params: { tage: 42 },
  },
  {
    id: 'regel-erprobung',
    kind: 'rueckmeldungOhneErprobung',
    title: 'Rückmeldung ohne dokumentierte Erprobung',
    enabled: true,
    horizonDays: 0,
    params: { tage: 21 },
  },
  {
    id: 'regel-pruefungsvorbereitung',
    kind: 'pruefungsvorbereitungKollision',
    title: 'Prüfungsvorbereitung überschneidet sich mit weiteren Terminen',
    enabled: true,
    horizonDays: 120,
  },
  {
    id: 'regel-vorlauf',
    kind: 'vorlaufVerkuerzt',
    title: 'Terminverschiebung verkürzt den vorgesehenen Vorlauf',
    enabled: true,
    horizonDays: 120,
  },
  {
    id: 'regel-voraussetzung',
    kind: 'voraussetzungOffen',
    title: 'Voraussetzung eines Meilensteins ist noch offen',
    enabled: true,
    horizonDays: 60,
  },
];

/** Wertet alle aktiven Regeln aus und liefert unterstützend formulierte Hinweise. */
export function detectChallenges(input: ChallengeInput): ChallengeHint[] {
  const hints: ChallengeHint[] = [];
  for (const rule of input.rules) {
    if (!rule.enabled) continue;
    switch (rule.kind) {
      case 'terminhaeufung':
        hints.push(...ruleClustering(rule, input));
        break;
      case 'vorarbeitOffen':
        hints.push(...rulePreparationNotStarted(rule, input));
        break;
      case 'beobachtungsschwerpunktFehlt':
        hints.push(...ruleObservationFocus(rule, input));
        break;
      case 'zielNichtReflektiert':
        hints.push(...ruleGoalNotReviewed(rule, input));
        break;
      case 'rueckmeldungOhneErprobung':
        hints.push(...ruleFeedbackWithoutTrial(rule, input));
        break;
      case 'pruefungsvorbereitungKollision':
        hints.push(...ruleExamCollision(rule, input));
        break;
      case 'vorlaufVerkuerzt':
        hints.push(...ruleLeadTimeShortened(rule, input));
        break;
      case 'voraussetzungOffen':
        hints.push(...rulePrerequisiteOpen(rule, input));
        break;
    }
  }

  hints.sort((a, b) => {
    const da = a.anchorDate ?? '9999-12-31';
    const db = b.anchorDate ?? '9999-12-31';
    if (da !== db) return da < db ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return hints;
}

/* ------------------------------ Hilfen ------------------------------- */

function upcoming(input: ChallengeInput, horizonDays: number): MilestoneInstance[] {
  return input.milestones
    .filter((m) => m.status !== 'erledigt' && m.status !== 'entfällt')
    .filter((m) => {
      const days = daysBetween(input.todayIso, effectiveStart(m));
      return days >= 0 && days <= horizonDays;
    })
    .sort((a, b) => (effectiveStart(a) < effectiveStart(b) ? -1 : 1));
}

/* ------------------------------ Regeln ------------------------------- */

/** Zwei oder mehr grössere Termine innerhalb eines Zeitraums (Standard 21 Tage). */
function ruleClustering(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  const spanDays = rule.params?.abstandTage ?? 21;
  const major = upcoming(input, rule.horizonDays).filter((m) => m.major || m.mandatory);
  const hints: ChallengeHint[] = [];
  const used = new Set<string>();

  for (let i = 0; i < major.length; i += 1) {
    const first = major[i]!;
    if (used.has(first.id)) continue;
    const group = [first];
    for (let j = i + 1; j < major.length; j += 1) {
      const next = major[j]!;
      if (daysBetween(effectiveStart(first), effectiveStart(next)) <= spanDays) {
        group.push(next);
      } else {
        break;
      }
    }
    if (group.length < 2) continue;
    group.forEach((m) => used.add(m.id));

    const last = group[group.length - 1]!;
    const distance = daysBetween(effectiveStart(first), effectiveStart(last));
    hints.push({
      id: `${rule.id}:${first.id}`,
      ruleId: rule.id,
      kind: rule.kind,
      challenge: 'Mehrere Anforderungen überschneiden sich.',
      why: `${group.map((m) => m.title).join(' und ')} liegen ${formatNumber(distance)} Tage auseinander (${formatDate(
        effectiveStart(first),
      )} bis ${formatDate(effectiveStart(last))}).`,
      action:
        'Reserviere zwei feste Vorbereitungsfenster und kläre frühzeitig, welche Unterlagen für beide Termine benötigt werden.',
      relatedMilestoneIds: group.map((m) => m.id),
      anchorDate: effectiveStart(first),
    });
  }
  return hints;
}

/** Vorlaufzeit läuft, Checkliste und Status sind aber noch unberührt. */
function rulePreparationNotStarted(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  return upcoming(input, rule.horizonDays)
    .filter((m) => m.leadTimeDays > 0)
    .filter((m) => daysBetween(input.todayIso, effectiveStart(m)) <= m.leadTimeDays)
    .filter((m) => m.status === 'offen' && m.checklist.every((item) => !item.done))
    .filter((m) => m.checklist.length > 0)
    .map((m) => ({
      id: `${rule.id}:${m.id}`,
      ruleId: rule.id,
      kind: rule.kind,
      challenge: 'Die Vorbereitung hat noch nicht sichtbar begonnen.',
      why: `Für „${m.title}“ am ${formatDate(effectiveStart(m))} ist ein Vorlauf von ${formatNumber(
        m.leadTimeDays,
      )} Tagen vorgesehen; die Checkliste ist noch unbearbeitet.`,
      action: 'Nimm dir einen ersten kurzen Arbeitsblock vor und hake den ersten Punkt der Checkliste ab.',
      relatedMilestoneIds: [m.id],
      anchorDate: effectiveStart(m),
    }));
}

/** Unterrichtsbesuch ohne eingetragenen Beobachtungsschwerpunkt. */
function ruleObservationFocus(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  return upcoming(input, rule.horizonDays)
    .filter((m) => m.category === 'Unterrichtsbesuch' || m.category === 'Lehrprobe')
    .filter((m) => !m.observationFocus || m.observationFocus.trim().length === 0)
    .map((m) => ({
      id: `${rule.id}:${m.id}`,
      ruleId: rule.id,
      kind: rule.kind,
      challenge: 'Für den Besuch ist noch kein Beobachtungsschwerpunkt festgelegt.',
      why: `„${m.title}“ am ${formatDate(effectiveStart(m))} hat kein Feld „Beobachtungsschwerpunkt“ gefüllt.`,
      action:
        'Lege einen Schwerpunkt fest, der zu deinem Entwicklungsziel passt, und stimme ihn mit deiner Fachleitung ab.',
      relatedMilestoneIds: [m.id],
      anchorDate: effectiveStart(m),
    }));
}

/** Entwicklungsziel seit längerer Zeit nicht reflektiert. */
function ruleGoalNotReviewed(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  const limit = rule.params?.tage ?? 42;
  const goal = input.goals.find((g) => g.active);
  if (!goal) return [];
  const reference = (goal.lastReviewedAt ?? goal.createdAt).slice(0, 10);
  const days = daysBetween(reference, input.todayIso);
  if (days < limit) return [];
  return [
    {
      id: `${rule.id}:${goal.id}`,
      ruleId: rule.id,
      kind: rule.kind,
      challenge: 'Dein Entwicklungsziel ist länger nicht in den Blick genommen worden.',
      why: `Das Ziel „${goal.title}“ wurde zuletzt am ${formatDate(reference)} reflektiert, also vor ${formatNumber(
        days,
      )} Tagen.`,
      action: 'Halte im Boxenstopp in wenigen Sätzen fest, was inzwischen gelingt und welcher kleine Schritt als Nächstes realistisch ist.',
      relatedMilestoneIds: [],
      anchorDate: reference,
    },
  ];
}

/** Hilfreiche Rückmeldung notiert, aber noch keine Erprobung dokumentiert. */
function ruleFeedbackWithoutTrial(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  const limit = rule.params?.tage ?? 21;
  const withFeedback = input.reflections
    .filter((r) => (r.answers.rueckmeldung ?? '').trim().length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = withFeedback[0];
  if (!latest) return [];
  const trialLater = input.reflections.some((r) => r.triedOut && r.date >= latest.date);
  const days = daysBetween(latest.date, input.todayIso);
  if (trialLater || days < limit) return [];
  return [
    {
      id: `${rule.id}:${latest.id}`,
      ruleId: rule.id,
      kind: rule.kind,
      challenge: 'Eine Rückmeldung wartet noch auf die Erprobung.',
      why: `Am ${formatDate(latest.date)} hast du eine hilfreiche Rückmeldung festgehalten; seither ist keine Erprobung dokumentiert.`,
      action: 'Wähle eine konkrete Stunde aus, in der du die Rückmeldung ausprobierst, und notiere anschliessend kurz deine Beobachtung.',
      relatedMilestoneIds: [],
      anchorDate: latest.date,
    },
  ];
}

/** Prüfungstermine überschneiden sich mit anderen Terminen. */
function ruleExamCollision(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  const exams = upcoming(input, rule.horizonDays).filter(
    (m) => m.category === 'Prüfung' && (m.major || m.mandatory),
  );
  const hints: ChallengeHint[] = [];
  for (const exam of exams) {
    const prepStart = shiftDays(effectiveStart(exam), -Math.max(exam.leadTimeDays, 14));
    const overlapping = input.milestones.filter(
      (m) =>
        m.id !== exam.id &&
        m.status !== 'erledigt' &&
        m.status !== 'entfällt' &&
        m.category !== 'Prüfung' &&
        (m.major || m.mandatory) &&
        effectiveEnd(m) >= prepStart &&
        effectiveStart(m) <= effectiveEnd(exam),
    );
    if (overlapping.length === 0) continue;
    hints.push({
      id: `${rule.id}:${exam.id}`,
      ruleId: rule.id,
      kind: rule.kind,
      challenge: 'Die Prüfungsvorbereitung trifft auf weitere Termine.',
      why: `Im Vorbereitungszeitraum von „${exam.title}“ (ab ${formatDate(prepStart)}) liegen zusätzlich: ${overlapping
        .map((m) => m.title)
        .join(', ')}.`,
      action: 'Lege fest, welche Aufgabe zuerst bearbeitet wird, und sprich mögliche Verschiebungen frühzeitig an.',
      relatedMilestoneIds: [exam.id, ...overlapping.map((m) => m.id)],
      anchorDate: prepStart,
    });
  }
  return hints;
}

/** Eine Verschiebung hat den verbleibenden Vorlauf verkürzt. */
function ruleLeadTimeShortened(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  return input.milestones
    .filter((m) => m.status !== 'erledigt' && m.status !== 'entfällt')
    .filter((m) => Boolean(m.previousStart))
    .filter((m) => effectiveStart(m) < (m.previousStart as string))
    .filter((m) => daysBetween(input.todayIso, effectiveStart(m)) <= rule.horizonDays)
    .map((m) => {
      const remaining = daysBetween(input.todayIso, effectiveStart(m));
      return {
        id: `${rule.id}:${m.id}`,
        ruleId: rule.id,
        kind: rule.kind,
        challenge: 'Ein vorgezogener Termin verkürzt den Vorlauf.',
        why: `„${m.title}“ liegt jetzt am ${formatDate(effectiveStart(m))} statt am ${formatDate(
          m.previousStart as string,
        )}; vorgesehen sind ${formatNumber(m.leadTimeDays)} Tage Vorlauf, verbleibend sind ${formatNumber(
          Math.max(remaining, 0),
        )} Tage.`,
        action: 'Prüfe, welche Vorbereitungsschritte sich zusammenfassen lassen, und kläre offene Punkte direkt mit der Fachleitung.',
        relatedMilestoneIds: [m.id],
        anchorDate: effectiveStart(m),
      };
    })
    .filter((hint) => hint.relatedMilestoneIds.length > 0);
}

/** Voraussetzung eines anstehenden Meilensteins ist noch nicht erfüllt. */
function rulePrerequisiteOpen(rule: ChallengeRule, input: ChallengeInput): ChallengeHint[] {
  const byDefinitionId = new Map(input.milestones.map((m) => [m.definitionId, m]));
  return upcoming(input, rule.horizonDays)
    .map((m) => {
      const open = m.prerequisites
        .map((id) => byDefinitionId.get(id))
        .filter((p): p is MilestoneInstance => Boolean(p))
        .filter((p) => p.status !== 'erledigt' && p.status !== 'entfällt');
      return { milestone: m, open };
    })
    .filter((entry) => entry.open.length > 0)
    .map(({ milestone, open }) => ({
      id: `${rule.id}:${milestone.id}`,
      ruleId: rule.id,
      kind: rule.kind,
      challenge: 'Ein anstehender Schritt setzt etwas voraus, das noch offen ist.',
      why: `Für „${milestone.title}“ am ${formatDate(effectiveStart(milestone))} ist ${open
        .map((p) => `„${p.title}“`)
        .join(' und ')} als Voraussetzung hinterlegt.`,
      action: 'Bring zuerst die Voraussetzung zum Abschluss oder halte fest, warum sie in deinem Fall entfällt.',
      relatedMilestoneIds: [milestone.id, ...open.map((p) => p.id)],
      anchorDate: effectiveStart(milestone),
    }));
}

function shiftDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
