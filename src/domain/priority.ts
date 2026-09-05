/**
 * Priorisierung der aktuellen Handlungsschritte.
 *
 * Die Auswahl ist deterministisch und für Nutzerinnen und Nutzer
 * nachvollziehbar: Jeder Schritt nennt die Gründe, die zu seiner Auswahl
 * geführt haben. Es werden höchstens drei Schritte hervorgehoben.
 */
import { daysBetween } from './dates';
import { effectiveEnd, effectiveStart } from './schedule';
import type { IsoDate, MilestoneInstance } from './types';

export const MAX_NEXT_STEPS = 3;

export interface NextStep {
  milestone: MilestoneInstance;
  /** Tage bis zum Termin (negativ = überfällig). */
  daysUntil: number;
  /** Tage bis zum empfohlenen Vorbereitungsbeginn. */
  daysUntilPreparation: number;
  /** Nachvollziehbare Begründungen der Einstufung. */
  reasons: string[];
  /** Noch offene Voraussetzungen. */
  blockedBy: MilestoneInstance[];
  /** Interner Rang (kleiner = dringlicher) – nur zur Sortierung. */
  rank: number;
}

interface Scored extends NextStep {
  sortKey: string;
}

/**
 * Bestimmt die aktuellen Handlungsschritte.
 *
 * Reihenfolge der Kriterien:
 *  1. überfällige Termine,
 *  2. Termine, deren empfohlener Vorlauf bereits begonnen hat,
 *  3. Voraussetzungen, die andere Meilensteine blockieren,
 *  4. Bearbeitungsstatus (angefangene Schritte vor unberührten),
 *  5. Fälligkeit, danach Sortierschlüssel der Vorlage.
 */
export function selectNextSteps(
  milestones: MilestoneInstance[],
  todayIso: IsoDate,
  limit: number = MAX_NEXT_STEPS,
): NextStep[] {
  const byDefinitionId = new Map(milestones.map((m) => [m.definitionId, m]));
  const open = milestones.filter((m) => m.status !== 'erledigt' && m.status !== 'entfällt');

  // Meilensteine, die als Voraussetzung anderer offener Schritte dienen.
  const blocking = new Set<string>();
  for (const milestone of open) {
    for (const prerequisiteId of milestone.prerequisites) {
      const prerequisite = byDefinitionId.get(prerequisiteId);
      if (prerequisite && prerequisite.status !== 'erledigt' && prerequisite.status !== 'entfällt') {
        blocking.add(prerequisite.id);
      }
    }
  }

  const scored: Scored[] = open.map((milestone) => {
    const due = effectiveEnd(milestone);
    const start = effectiveStart(milestone);
    const daysUntil = daysBetween(todayIso, due);
    const daysUntilPreparation = daysBetween(todayIso, start) - milestone.leadTimeDays;

    const reasons: string[] = [];
    let rank = 500;

    if (daysUntil < 0) {
      rank = 0;
      reasons.push(`Termin lag am ${formatShort(due)} und ist noch nicht abgeschlossen.`);
    } else if (daysUntil === 0) {
      rank = 5;
      reasons.push('Der Termin ist heute.');
    } else if (daysUntilPreparation <= 0) {
      rank = 100;
      reasons.push(
        `Der empfohlene Vorlauf von ${milestone.leadTimeDays} Tagen hat begonnen (Termin am ${formatShort(start)}).`,
      );
    } else if (daysUntilPreparation <= 14) {
      rank = 200;
      reasons.push(`Die Vorbereitung beginnt in ${daysUntilPreparation} Tagen.`);
    } else {
      rank = 400;
      reasons.push(`Termin am ${formatShort(start)} – aktuell nicht dringlich.`);
    }

    if (milestone.mandatory) {
      rank -= 20;
      reasons.push('Verbindlicher Termin.');
    }

    const blockedBy = milestone.prerequisites
      .map((id) => byDefinitionId.get(id))
      .filter((m): m is MilestoneInstance => Boolean(m))
      .filter((m) => m.status !== 'erledigt' && m.status !== 'entfällt');

    if (blockedBy.length > 0) {
      rank += 30;
      reasons.push(`Voraussetzung noch offen: ${blockedBy.map((m) => m.title).join(', ')}.`);
    }

    if (blocking.has(milestone.id)) {
      rank -= 40;
      reasons.push('Dieser Schritt ist Voraussetzung für weitere Meilensteine.');
    }

    if (milestone.status === 'in Arbeit') {
      rank -= 15;
      reasons.push('Bereits in Arbeit.');
    } else if (milestone.status === 'verschoben') {
      reasons.push('Termin wurde verschoben.');
    }

    const doneItems = milestone.checklist.filter((item) => item.done).length;
    if (milestone.checklist.length > 0 && doneItems === 0 && daysUntilPreparation <= 0) {
      rank -= 10;
      reasons.push('Die Checkliste ist noch unbearbeitet.');
    }

    return {
      milestone,
      daysUntil,
      daysUntilPreparation,
      reasons,
      blockedBy,
      rank,
      sortKey: `${String(rank).padStart(5, '0')}|${effectiveStart(milestone)}|${String(milestone.order).padStart(5, '0')}|${milestone.id}`,
    };
  });

  scored.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));

  return scored.slice(0, Math.max(limit, 0)).map(({ sortKey: _sortKey, ...step }) => step);
}

function formatShort(date: IsoDate): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}
