/**
 * Zentrale Datumshilfen. Alle Datumsberechnungen der App laufen über dieses
 * Modul bzw. über `schedule.ts` – UI-Komponenten rechnen nicht selbst.
 */
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import { de } from 'date-fns/locale';
import type { DateOffset, DateUnit, IsoDate } from './types';

export const ISO_DATE = 'yyyy-MM-dd';

/** Wandelt ein `yyyy-MM-dd`-Datum in ein lokales `Date` (Tagesbeginn). */
export function fromIso(date: IsoDate): Date {
  const parsed = parseISO(date);
  if (!isValid(parsed)) throw new Error(`Ungültiges Datum: ${date}`);
  return startOfDay(parsed);
}

export function toIso(date: Date): IsoDate {
  return format(date, ISO_DATE);
}

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
}

export function today(now: Date = new Date()): IsoDate {
  return toIso(startOfDay(now));
}

export function addOffset(date: Date, offset: DateOffset): Date {
  return addByUnit(date, offset.amount, offset.unit);
}

export function addByUnit(date: Date, amount: number, unit: DateUnit): Date {
  switch (unit) {
    case 'Tage':
      return addDays(date, amount);
    case 'Wochen':
      return addWeeks(date, amount);
    case 'Monate':
      return addMonths(date, amount);
  }
}

/** Ausbildungsende: Beginn + Dauer in Monaten, minus einen Tag. */
export function trainingEndDate(startDate: IsoDate, durationMonths: number): IsoDate {
  return toIso(addDays(addMonths(fromIso(startDate), durationMonths), -1));
}

/** Gesamtdauer der Ausbildung in Kalendertagen (inklusive erstem Tag). */
export function trainingLengthInDays(startDate: IsoDate, durationMonths: number): number {
  return differenceInCalendarDays(fromIso(trainingEndDate(startDate, durationMonths)), fromIso(startDate)) + 1;
}

/**
 * Datum an einem Anteil der Gesamtdauer, z. B. 1/3 für das Ende des ersten
 * Ausbildungsdrittels.
 */
export function dateAtFraction(startDate: IsoDate, durationMonths: number, fraction: number): IsoDate {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const days = trainingLengthInDays(startDate, durationMonths) - 1;
  return toIso(addDays(fromIso(startDate), Math.round(days * clamped)));
}

/** Anteil (0–1), den ein Datum innerhalb der Ausbildung einnimmt. */
export function fractionOfDate(startDate: IsoDate, durationMonths: number, date: IsoDate): number {
  const days = trainingLengthInDays(startDate, durationMonths) - 1;
  if (days <= 0) return 0;
  const elapsed = differenceInCalendarDays(fromIso(date), fromIso(startDate));
  return Math.min(Math.max(elapsed / days, 0), 1);
}

/** Ausbildungsmonat, in dem sich ein Datum befindet (1-basiert). */
export function trainingMonth(startDate: IsoDate, date: IsoDate): number {
  const start = fromIso(startDate);
  const current = fromIso(date);
  if (current < start) return 0;
  let months = differenceInCalendarMonths(current, start);
  if (current.getDate() < start.getDate()) months -= 1;
  return months + 1;
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return differenceInCalendarDays(fromIso(to), fromIso(from));
}

export function clampIso(date: IsoDate, min?: IsoDate, max?: IsoDate): IsoDate {
  let result = date;
  if (min && result < min) result = min;
  if (max && result > max) result = max;
  return result;
}

/* ---------------------------- Formatierung ---------------------------- */

const numberFormat = new Intl.NumberFormat('de-DE');
const percentFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatPercent(fraction: number): string {
  return `${percentFormat.format(Math.round(fraction * 100))} %`;
}

/** Deutsches Datumsformat, z. B. „14.02.2026“. */
export function formatDate(date: IsoDate): string {
  return format(fromIso(date), 'dd.MM.yyyy', { locale: de });
}

/** Ausführliches deutsches Datum, z. B. „Samstag, 14. Februar 2026“. */
export function formatDateLong(date: IsoDate): string {
  return format(fromIso(date), 'EEEE, d. MMMM yyyy', { locale: de });
}

export function formatMonthYear(date: IsoDate): string {
  return format(fromIso(date), 'MMMM yyyy', { locale: de });
}

/** Termin oder Zeitfenster als lesbarer Text. */
export function formatRange(start: IsoDate, end: IsoDate): string {
  if (start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Countdown in Tagen als deutscher Text. */
export function formatCountdown(days: number): string {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'gestern';
  if (days > 1) return `in ${formatNumber(days)} Tagen`;
  return `vor ${formatNumber(Math.abs(days))} Tagen`;
}
