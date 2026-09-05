/** Hilfsfunktionen für die Tests. */
import { createDemoTemplates } from '../data/demoTemplates';
import type { TrainingProfile, TrainingTemplate } from '../domain/types';

export const FIXED_NOW = new Date('2026-09-04T08:00:00.000Z');

export function testTemplate(id = 'demo-thueringen-gymnasium'): TrainingTemplate {
  const template = createDemoTemplates().find((t) => t.id === id);
  if (!template) throw new Error(`Testvorlage fehlt: ${id}`);
  return template;
}

export function testProfile(overrides: Partial<TrainingProfile> = {}): TrainingProfile {
  return {
    id: 'profil',
    displayName: 'Testperson',
    startDate: '2026-02-01',
    durationMonths: 18,
    federalState: 'Thüringen',
    schoolType: 'Gymnasium',
    trainingForm: 'regulär',
    subjects: ['Deutsch', 'Geschichte'],
    cohortCode: '02-26-18',
    templateId: 'demo-thueringen-gymnasium',
    onboardingCompleted: true,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
    ...overrides,
  };
}
