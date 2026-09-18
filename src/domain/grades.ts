/**
 * Notenübersicht und Gesamtnote.
 *
 * Die Berechnung folgt der Gewichtung, die in der Vorlage hinterlegt ist.
 * Sie dient ausschliesslich der eigenen Übersicht: Verbindlich ist allein
 * die Festsetzung durch das Prüfungsamt. Es findet kein Vergleich mit
 * anderen Personen statt.
 */
import type { ExamPartResult, GradeModel, GradeRecord } from './types';

/** Punktzahlen des Prüfungsrechts (0 bis 15 Punkte). */
export const MAX_POINTS = 15;

export interface GradeCalculation {
  model: GradeModel | null;
  preliminary: number | null;
  practicalAverage: number | null;
  oralPoints: number[];
  /** Erwartete Anzahl mündlicher Teilprüfungen laut Gewichtung. */
  expectedOralCount: number;
  /** Summe der gewichteten Punktzahlen. */
  weightedSum: number | null;
  /** Ungerundetes Ergebnis. */
  raw: number | null;
  /** Gerundete Gesamtpunktzahl. */
  points: number | null;
  /** Notenstufe zur gerundeten Punktzahl. */
  gradeLabel: string | null;
  /** Noch fehlende Angaben. */
  missing: string[];
  /** Feststellungen, die nach der Verordnung zum Nichtbestehen führen. */
  failures: string[];
  /** Sind alle für die Berechnung nötigen Angaben vorhanden? */
  complete: boolean;
}

/** Notenstufe einer Punktzahl nach dem üblichen Punkteschema. */
export function pointsToGradeLabel(points: number): string {
  if (points >= 13) return 'sehr gut';
  if (points >= 10) return 'gut';
  if (points >= 7) return 'befriedigend';
  if (points >= 4) return 'ausreichend';
  if (points >= 1) return 'mangelhaft';
  return 'ungenügend';
}

/**
 * Rundung der Gesamtpunktzahl: Zwischenwerte bis zur Grenze werden zur
 * schlechteren, ab der Grenze zur besseren Punktzahl gerundet.
 */
export function roundPoints(value: number, roundUpFrom = 0.6): number {
  const base = Math.floor(value);
  // Auf vier Stellen gerundet, damit 11,6 nicht als 11,599… gelesen wird.
  const fraction = Number((value - base).toFixed(4));
  const rounded = fraction >= roundUpFrom ? base + 1 : base;
  return Math.min(Math.max(rounded, 0), MAX_POINTS);
}

export function isValidPoints(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_POINTS;
}

function partPoints(parts: ExamPartResult[]): number[] {
  return parts.map((part) => part.points).filter(isValidPoints);
}

export function createGradeRecord(subjects: string[], now: Date = new Date()): GradeRecord {
  const fachnamen = subjects.length > 0 ? subjects : ['erstes Fach', 'zweites Fach'];
  return {
    id: 'noten',
    teachingSamples: fachnamen.map((subject, index) => ({
      id: `blp-${index + 1}`,
      label: `Benotete Lehrprobe ${subject}`,
    })),
    practical: fachnamen.map((subject, index) => ({
      id: `plp-${index + 1}`,
      label: `Prüfungslehrprobe ${subject}`,
    })),
    oral: [
      { id: 'muendlich-1', label: 'Erste mündliche Teilprüfung' },
      { id: 'muendlich-2', label: 'Zweite mündliche Teilprüfung' },
    ],
    updatedAt: now.toISOString(),
  };
}

/** Berechnet die Gesamtpunktzahl nach der Gewichtung der Vorlage. */
export function computeFinalGrade(
  record: GradeRecord | null,
  model: GradeModel | undefined | null,
): GradeCalculation {
  const expectedOralCount = model
    ? Math.max(Math.round((model.divisor - model.preliminaryWeight - model.practicalWeight) / model.oralWeight), 0)
    : 2;

  const empty: GradeCalculation = {
    model: model ?? null,
    preliminary: null,
    practicalAverage: null,
    oralPoints: [],
    expectedOralCount,
    weightedSum: null,
    raw: null,
    points: null,
    gradeLabel: null,
    missing: [],
    failures: [],
    complete: false,
  };

  if (!model) {
    return { ...empty, missing: ['Die gewählte Vorlage enthält keine Gewichtung für die Gesamtnote.'] };
  }
  if (!record) {
    return { ...empty, missing: ['Es sind noch keine Punktzahlen eingetragen.'] };
  }

  const preliminary = isValidPoints(record.preliminary) ? record.preliminary : null;
  const practical = partPoints(record.practical);
  const oral = partPoints(record.oral);
  const practicalAverage =
    practical.length > 0 ? practical.reduce((sum, value) => sum + value, 0) / practical.length : null;

  const missing: string[] = [];
  if (preliminary === null) missing.push('Die Vornote ist noch nicht eingetragen.');
  if (practical.length < record.practical.length) {
    missing.push('Es fehlen Punktzahlen für mindestens eine Prüfungslehrprobe.');
  }
  if (oral.length < expectedOralCount) {
    missing.push(
      `Es fehlen Punktzahlen für ${expectedOralCount - oral.length} von ${expectedOralCount} mündlichen Teilprüfungen.`,
    );
  }

  const failures: string[] = [];
  for (const part of [...record.practical, ...record.oral]) {
    if (part.points === 0) failures.push(`${part.label}: 0 Punkte (ungenügend).`);
  }

  const complete = preliminary !== null && practicalAverage !== null && oral.length === expectedOralCount;
  if (!complete) {
    return {
      ...empty,
      preliminary,
      practicalAverage,
      oralPoints: oral,
      missing,
      failures,
    };
  }

  const weightedSum =
    preliminary * model.preliminaryWeight +
    practicalAverage * model.practicalWeight +
    oral.reduce((sum, value) => sum + value * model.oralWeight, 0);
  const raw = weightedSum / model.divisor;
  const points = roundPoints(raw, model.roundUpFrom);

  return {
    model,
    preliminary,
    practicalAverage,
    oralPoints: oral,
    expectedOralCount,
    weightedSum,
    raw,
    points,
    gradeLabel: pointsToGradeLabel(points),
    missing,
    failures,
    complete: true,
  };
}

/** Formatiert eine Punktzahl mit höchstens zwei Nachkommastellen. */
export function formatPoints(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}
