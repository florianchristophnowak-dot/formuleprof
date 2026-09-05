/**
 * Auswertung von Jahrgangscodes wie `02-26-18`:
 * Beginn im Februar 2026, Ausbildungsdauer 18 Monate.
 */
import { toIso } from './dates';
import type { IsoDate } from './types';

export interface CohortCodeResult {
  code: string;
  /** Monat des Ausbildungsbeginns (1–12). */
  month: number;
  /** Vierstelliges Jahr des Ausbildungsbeginns. */
  year: number;
  durationMonths: number;
  /** Erster Tag des Beginnmonats. */
  startDate: IsoDate;
}

export class CohortCodeError extends Error {}

const PATTERN = /^(\d{1,2})\s*[-/.]\s*(\d{2}|\d{4})\s*[-/.]\s*(\d{1,2})$/;
const ALLOWED_DURATIONS = [6, 12, 18, 24, 36];

/**
 * Liest einen Jahrgangscode. Gibt `null` zurück, wenn der Code nicht dem
 * erwarteten Muster entspricht.
 */
export function parseCohortCode(input: string): CohortCodeResult | null {
  const trimmed = input.trim();
  const match = PATTERN.exec(trimmed);
  if (!match) return null;

  const month = Number(match[1]);
  const rawYear = match[2] as string;
  const durationMonths = Number(match[3]);

  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 48) return null;

  const year = rawYear.length === 4 ? Number(rawYear) : 2000 + Number(rawYear);
  if (year < 2000 || year > 2099) return null;

  return {
    code: trimmed,
    month,
    year,
    durationMonths,
    startDate: toIso(new Date(year, month - 1, 1)),
  };
}

/** Wie `parseCohortCode`, wirft aber einen Fehler mit deutscher Meldung. */
export function requireCohortCode(input: string): CohortCodeResult {
  const result = parseCohortCode(input);
  if (!result) {
    throw new CohortCodeError(
      'Der Jahrgangscode konnte nicht gelesen werden. Erwartet wird ein Muster wie 02-26-18 (Monat–Jahr–Dauer).',
    );
  }
  return result;
}

/** Hinweis, wenn die Dauer ungewöhnlich ist – blockiert die Eingabe nicht. */
export function cohortCodeWarning(result: CohortCodeResult): string | null {
  if (!ALLOWED_DURATIONS.includes(result.durationMonths)) {
    return `Die gelesene Ausbildungsdauer von ${result.durationMonths} Monaten ist ungewöhnlich. Bitte prüfe die Angabe.`;
  }
  return null;
}

export function formatCohortCode(month: number, year: number, durationMonths: number): string {
  const mm = String(month).padStart(2, '0');
  const yy = String(year % 100).padStart(2, '0');
  const dd = String(durationMonths).padStart(2, '0');
  return `${mm}-${yy}-${dd}`;
}
