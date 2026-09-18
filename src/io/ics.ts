/**
 * Erzeugung von `.ics`-Dateien für einzelne Termine oder die gesamte Strecke.
 * Termine werden als ganztägige Ereignisse geschrieben.
 */
import { addByUnit, fromIso, toIso } from '../domain/dates';
import { effectiveEnd, effectiveStart } from '../domain/schedule';
import { APP_NAME, APP_VERSION } from '../domain/types';
import type { ExamDeadline, MilestoneInstance } from '../domain/types';

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function compactDate(date: string): string {
  return date.replace(/-/g, '');
}

/** Faltet zu lange Zeilen gemäss RFC 5545. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    parts.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  if (rest.length > 0) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

export function buildIcs(milestones: MilestoneInstance[], now: Date = new Date()): string {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME}//${APP_VERSION}//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const milestone of milestones) {
    const start = effectiveStart(milestone);
    // DTEND ist bei ganztägigen Terminen exklusiv.
    const end = toIso(addByUnit(fromIso(effectiveEnd(milestone)), 1, 'Tage'));
    const description = [milestone.description, milestone.help, milestone.source]
      .filter((part) => part && part.trim().length > 0)
      .join('\n\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${milestone.id}@formuleprof.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(start)}`,
      `DTEND;VALUE=DATE:${compactDate(end)}`,
      fold(`SUMMARY:${escapeText(milestone.title)}`),
      fold(`DESCRIPTION:${escapeText(description)}`),
      fold(`CATEGORIES:${escapeText(milestone.category)}`),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

/** Fristen des Prüfungsfahrplans als Kalendereinträge. */
export function buildDeadlineIcs(deadlines: ExamDeadline[], now: Date = new Date()): string {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME}//${APP_VERSION}//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const deadline of deadlines) {
    const end = toIso(addByUnit(fromIso(deadline.date), 1, 'Tage'));
    const description = [
      deadline.description,
      deadline.time ? `Uhrzeit: ${deadline.time}` : '',
      deadline.source,
    ]
      .filter((part) => part && part.trim().length > 0)
      .join('\n\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:frist-${deadline.id}@formuleprof.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(deadline.date)}`,
      `DTEND;VALUE=DATE:${compactDate(end)}`,
      fold(`SUMMARY:${escapeText(deadline.title)}`),
      fold(`DESCRIPTION:${escapeText(description)}`),
      'CATEGORIES:Prüfung',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function icsFileName(milestone?: MilestoneInstance): string {
  if (!milestone) return 'formuleprof-strecke.ics';
  const slug = milestone.title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `formuleprof-${slug || 'termin'}.ics`;
}
