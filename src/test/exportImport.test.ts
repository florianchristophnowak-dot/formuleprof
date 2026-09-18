import { describe, expect, it } from 'vitest';
import {
  buildBackup,
  buildTemplateExport,
  ImportError,
  mergeSnapshots,
  parseBackup,
  parseEnvelope,
  parseTemplateFile,
  toJsonString,
} from '../io/exportImport';
import { buildRouteExport, parseRouteFile, routeToMilestones } from '../io/routeExchange';
import { buildIcs } from '../io/ics';
import { buildSchedule } from '../domain/schedule';
import { MemoryStorageAdapter } from '../data/storage';
import { DEFAULT_SETTINGS, Repository } from '../data/repository';
import { FIXED_NOW, testProfile, testTemplate } from './factories';
import type { AppSnapshot, ReflectionEntry } from '../domain/types';

const template = testTemplate();
const profile = testProfile();

function snapshot(): AppSnapshot {
  const schedule = buildSchedule(template, profile, { now: FIXED_NOW });
  const reflection: ReflectionEntry = {
    id: 'r1',
    createdAt: FIXED_NOW.toISOString(),
    date: '2026-09-01',
    answers: { sicher: 'Stundeneinstiege', arbeit: 'Arbeitsaufträge' },
    triedOut: true,
  };
  return {
    profile,
    templates: [template],
    milestones: schedule.milestones.map((m) =>
      m.definitionId === 'ub1' ? { ...m, notes: 'Notiz', status: 'in Arbeit' } : m,
    ),
    goals: [
      {
        id: 'ziel-1',
        title: 'Klare Arbeitsaufträge',
        description: 'Aufträge in maximal zwei Sätzen.',
        createdAt: FIXED_NOW.toISOString(),
        active: true,
      },
    ],
    reflections: [reflection],
    teachingWeeks: [
      {
        id: 'woche-2026-08-31',
        weekStart: '2026-08-31',
        hospitation: 7,
        guided: 4,
        independent: 4,
        updatedAt: FIXED_NOW.toISOString(),
      },
    ],
    seminarRecords: [
      {
        id: 'stunden-1',
        date: '2026-09-02',
        kind: 'Fachseminar',
        title: 'Fachseminar Deutsch',
        hours: 4,
        updatedAt: FIXED_NOW.toISOString(),
      },
    ],
    documents: [
      {
        id: 'unterlage-1',
        title: 'Niederschrift der Lehrprobe',
        status: 'benötigt',
        updatedAt: FIXED_NOW.toISOString(),
      },
    ],
    contacts: [
      {
        id: 'kontakt-1',
        name: 'Fachleitung Deutsch',
        role: 'Fachleitung',
        subject: 'Deutsch',
        updatedAt: FIXED_NOW.toISOString(),
      },
    ],
    examPlan: {
      id: 'pruefungsplan',
      mode: 'zusammen',
      firstDay: '2027-06-01',
      secondDay: '2027-06-08',
      updatedAt: FIXED_NOW.toISOString(),
    },
    grades: {
      id: 'noten',
      preliminary: 12,
      teachingSamples: [],
      practical: [{ id: 'plp-1', label: 'Prüfungslehrprobe Deutsch', points: 11 }],
      oral: [],
      updatedAt: FIXED_NOW.toISOString(),
    },
    settings: { ...DEFAULT_SETTINGS, includeReflectionsInBackup: true },
  };
}

describe('Sicherung und Wiederherstellung', () => {
  it('exportiert und importiert ohne Datenverlust', () => {
    const original = snapshot();
    const json = toJsonString(buildBackup(original, { includeReflections: true }, FIXED_NOW));
    const restored = parseBackup(json);

    expect(restored.profile).toEqual(original.profile);
    expect(restored.templates).toEqual(original.templates);
    expect(restored.milestones).toEqual(original.milestones);
    expect(restored.goals).toEqual(original.goals);
    expect(restored.reflections).toEqual(original.reflections);
    expect(restored.teachingWeeks).toEqual(original.teachingWeeks);
    expect(restored.seminarRecords).toEqual(original.seminarRecords);
    expect(restored.documents).toEqual(original.documents);
    expect(restored.contacts).toEqual(original.contacts);
    expect(restored.examPlan).toEqual(original.examPlan);
    expect(restored.grades).toEqual(original.grades);
    expect(restored.settings).toEqual(original.settings);
  });

  it('liest Sicherungen der Schemaversion 1 und legt die Bereiche des Wegweisers leer an', () => {
    const original = snapshot();
    const backup = buildBackup(original, { includeReflections: false }, FIXED_NOW);
    // Sicherung einer früheren Version: ohne die Bereiche des Wegweisers.
    const {
      teachingWeeks: _w,
      seminarRecords: _s,
      documents: _d,
      contacts: _k,
      examPlan: _p,
      grades: _n,
      ...alt
    } = backup.data;
    const restored = parseBackup(
      toJsonString({ ...backup, schemaVersion: 1, appVersion: '0.1.0', data: alt }),
    );

    expect(restored.teachingWeeks).toEqual([]);
    expect(restored.seminarRecords).toEqual([]);
    expect(restored.documents).toEqual([]);
    expect(restored.contacts).toEqual([]);
    expect(restored.examPlan).toBeNull();
    expect(restored.grades).toBeNull();
    expect(restored.milestones).toHaveLength(original.milestones.length);
  });

  it('schliesst Reflexionen aus, wenn sie nicht ausdrücklich einbezogen werden', () => {
    const original = snapshot();
    const json = toJsonString(buildBackup(original, { includeReflections: false }, FIXED_NOW));
    expect(json).not.toContain('Stundeneinstiege');
    expect(parseBackup(json).reflections).toHaveLength(0);
  });

  it('schreibt Version und Art in die Datei', () => {
    const backup = buildBackup(snapshot(), { includeReflections: false }, FIXED_NOW);
    expect(backup.app).toBe('FormuleProf');
    expect(backup.schemaVersion).toBe(2);
    expect(backup.appVersion).toBe('0.2.0');
    expect(backup.kind).toBe('sicherung');
  });

  it('weist fremde und zu neue Dateien mit verständlicher Meldung zurück', () => {
    expect(() => parseBackup('kein json')).toThrowError(ImportError);
    expect(() => parseBackup(JSON.stringify({ app: 'AndereApp' }))).toThrowError(/nicht aus FormuleProf/);
    expect(() =>
      parseBackup(JSON.stringify({ app: 'FormuleProf', schemaVersion: 99, kind: 'sicherung', data: {} })),
    ).toThrowError(/neueren Version/);
    expect(() =>
      parseEnvelope(JSON.stringify({ app: 'FormuleProf', schemaVersion: 1, kind: 'vorlage', data: {} }), 'sicherung'),
    ).toThrowError(/Erwartet wurde/);
  });

  it('führt zwei Datenbestände zusammen', () => {
    const current = snapshot();
    const incoming: AppSnapshot = {
      ...current,
      goals: [
        { id: 'ziel-2', title: 'Feedbackkultur', description: '', createdAt: FIXED_NOW.toISOString(), active: false },
      ],
      reflections: [],
    };
    const merged = mergeSnapshots(current, incoming);
    expect(merged.goals.map((g) => g.id).sort()).toEqual(['ziel-1', 'ziel-2']);
    expect(merged.reflections).toHaveLength(1);
  });

  it('exportiert und importiert eine Ausbildungsvorlage', () => {
    const json = toJsonString(buildTemplateExport(template, FIXED_NOW));
    const restored = parseTemplateFile(json);
    expect(restored).toEqual(template);
    expect(restored.demo).toBe(true);
  });
});

describe('Streckendatei (Austausch mit Carnet de formation)', () => {
  it('enthält Vorlagenangaben, Jahrgang, Beginn, Dauer und Termine', () => {
    const schedule = buildSchedule(template, profile, { now: FIXED_NOW });
    const milestones = schedule.milestones.map((m) =>
      m.definitionId === 'ub1' ? { ...m, agreed: true, manualStart: '2026-04-20' } : m,
    );
    const exported = buildRouteExport(profile, template, milestones, FIXED_NOW);

    expect(exported.kind).toBe('strecke');
    expect(exported.data.templateId).toBe(template.id);
    expect(exported.data.templateVersion).toBe(template.version);
    expect(exported.data.cohort).toBe('02-26-18');
    expect(exported.data.startDate).toBe('2026-02-01');
    expect(exported.data.durationMonths).toBe(18);
    expect(exported.data.trainingForm).toBe('regulär');
    expect(exported.data.agreedMilestones).toHaveLength(1);
    expect(exported.data.officialMilestones.length).toBeGreaterThan(10);
  });

  it('enthält keine privaten Reflexionen', () => {
    const schedule = buildSchedule(template, profile, { now: FIXED_NOW });
    const json = toJsonString(buildRouteExport(profile, template, schedule.milestones, FIXED_NOW));
    // Das Format kennt keine Felder für persönliche Reflexionen.
    expect(json).not.toContain('"reflections"');
    expect(json).not.toContain('"answers"');
    expect(json).not.toContain('"triedOut"');
    expect(json).not.toContain('"grades"');
    expect(json).not.toContain('"teachingWeeks"');
    expect(json).not.toContain('"seminarRecords"');
    const keys = Object.keys(JSON.parse(json).data);
    expect(keys).not.toContain('reflections');
    expect(keys).not.toContain('grades');
    expect(keys).not.toContain('teachingWeeks');
  });

  it('liest eine Streckendatei und übernimmt Termine als vereinbart', () => {
    const schedule = buildSchedule(template, profile, { now: FIXED_NOW });
    const json = toJsonString(buildRouteExport(profile, template, schedule.milestones, FIXED_NOW));
    const route = parseRouteFile(json);
    const milestones = routeToMilestones(route, template.id, FIXED_NOW);

    expect(milestones.length).toBe(schedule.milestones.length);
    const ub1 = milestones.find((m) => m.definitionId === 'ub1');
    const originalUb1 = schedule.milestones.find((m) => m.definitionId === 'ub1');
    expect(ub1?.manualStart).toBe(originalUb1?.computedStart);
  });

  it('weist unvollständige Streckendateien zurück', () => {
    expect(() =>
      parseRouteFile(JSON.stringify({ app: 'FormuleProf', schemaVersion: 1, kind: 'strecke', data: {} })),
    ).toThrowError(/Beginn oder Dauer/);
  });
});

describe('Kalenderexport', () => {
  it('erzeugt gültige ganztägige Einträge', () => {
    const schedule = buildSchedule(template, profile, { now: FIXED_NOW });
    const ics = buildIcs(schedule.milestones.slice(0, 3), FIXED_NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
  });
});

describe('Lokale Speicherung', () => {
  it('behält die Daten über einen Neustart hinweg', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new Repository(storage);
    await repository.ensureSeeded();

    const data = snapshot();
    await repository.saveProfile(data.profile!);
    await repository.saveMilestones(data.milestones);
    await repository.saveGoals(data.goals);
    await repository.saveReflection(data.reflections[0]!);
    await repository.saveTeachingWeek(data.teachingWeeks[0]!);
    await repository.saveSeminarRecord(data.seminarRecords[0]!);
    await repository.saveDocument(data.documents[0]!);
    await repository.saveContact(data.contacts[0]!);
    await repository.saveExamPlan(data.examPlan!);
    await repository.saveGrades(data.grades!);
    await repository.saveSettings(data.settings);

    // Neue Repository-Instanz simuliert einen Neustart der App.
    const restored = await new Repository(storage).loadSnapshot();
    expect(restored.profile?.startDate).toBe('2026-02-01');
    expect(restored.milestones).toHaveLength(data.milestones.length);
    expect(restored.goals).toHaveLength(1);
    expect(restored.reflections).toHaveLength(1);
    expect(restored.teachingWeeks).toHaveLength(1);
    expect(restored.seminarRecords).toHaveLength(1);
    expect(restored.documents).toHaveLength(1);
    expect(restored.contacts).toHaveLength(1);
    expect(restored.examPlan?.mode).toBe('zusammen');
    expect(restored.grades?.preliminary).toBe(12);
    expect(restored.templates.length).toBeGreaterThan(0);
  });

  it('ersetzt den Bestand vollständig beim Import „Ersetzen“', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new Repository(storage);
    await repository.ensureSeeded();
    await repository.replaceAll({ ...snapshot(), templates: [template], reflections: [] });

    const restored = await repository.loadSnapshot();
    expect(restored.templates).toHaveLength(1);
    expect(restored.reflections).toHaveLength(0);
  });
});
