/**
 * Fachliche Speicherschicht: liest und schreibt den vollständigen
 * Anwendungszustand über einen `StorageAdapter`.
 */
import { createDemoTemplates } from './demoTemplates';
import type { StorageAdapter } from './storage';
import type {
  AppSettings,
  AppSnapshot,
  DevelopmentGoal,
  MilestoneInstance,
  ReflectionEntry,
  TrainingProfile,
  TrainingTemplate,
} from '../domain/types';

const PROFILE_KEY = 'profil';
const SETTINGS_KEY = 'einstellungen';
const SEED_KEY = 'demodaten-geladen';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  includeReflectionsInBackup: false,
  suggestPitStops: true,
};

export class Repository {
  constructor(private readonly storage: StorageAdapter) {}

  /** Legt beim ersten Start die Demovorlagen an. */
  async ensureSeeded(): Promise<void> {
    const seeded = await this.storage.get<boolean>('meta', SEED_KEY);
    if (seeded) return;
    const templates = createDemoTemplates();
    await this.storage.putMany(
      'templates',
      templates.map((t) => [t.id, t] as [string, TrainingTemplate]),
    );
    await this.storage.put('meta', SEED_KEY, true);
  }

  async loadSnapshot(): Promise<AppSnapshot> {
    const [profile, templates, milestones, goals, reflections, settings] = await Promise.all([
      this.storage.get<TrainingProfile>('meta', PROFILE_KEY),
      this.storage.getAll<TrainingTemplate>('templates'),
      this.storage.getAll<MilestoneInstance>('milestones'),
      this.storage.getAll<DevelopmentGoal>('goals'),
      this.storage.getAll<ReflectionEntry>('reflections'),
      this.storage.get<AppSettings>('meta', SETTINGS_KEY),
    ]);

    return {
      profile: profile ?? null,
      templates: templates.sort((a, b) => a.title.localeCompare(b.title, 'de')),
      milestones,
      goals,
      reflections,
      settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
    };
  }

  async saveProfile(profile: TrainingProfile): Promise<void> {
    await this.storage.put('meta', PROFILE_KEY, profile);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.storage.put('meta', SETTINGS_KEY, settings);
  }

  async saveTemplate(template: TrainingTemplate): Promise<void> {
    await this.storage.put('templates', template.id, template);
  }

  async removeTemplate(id: string): Promise<void> {
    await this.storage.remove('templates', id);
  }

  async saveMilestones(milestones: MilestoneInstance[]): Promise<void> {
    await this.storage.replaceAll(
      'milestones',
      milestones.map((m) => [m.id, m] as [string, MilestoneInstance]),
    );
  }

  async saveMilestone(milestone: MilestoneInstance): Promise<void> {
    await this.storage.put('milestones', milestone.id, milestone);
  }

  async saveGoals(goals: DevelopmentGoal[]): Promise<void> {
    await this.storage.replaceAll(
      'goals',
      goals.map((g) => [g.id, g] as [string, DevelopmentGoal]),
    );
  }

  async saveReflection(entry: ReflectionEntry): Promise<void> {
    await this.storage.put('reflections', entry.id, entry);
  }

  async removeReflection(id: string): Promise<void> {
    await this.storage.remove('reflections', id);
  }

  /** Ersetzt den gesamten Datenbestand (Import „Ersetzen“). */
  async replaceAll(snapshot: AppSnapshot): Promise<void> {
    await this.storage.clearAll();
    if (snapshot.profile) await this.storage.put('meta', PROFILE_KEY, snapshot.profile);
    await this.storage.put('meta', SETTINGS_KEY, snapshot.settings);
    await this.storage.put('meta', SEED_KEY, true);
    await this.storage.putMany('templates', snapshot.templates.map((t) => [t.id, t] as [string, TrainingTemplate]));
    await this.storage.putMany('milestones', snapshot.milestones.map((m) => [m.id, m] as [string, MilestoneInstance]));
    await this.storage.putMany('goals', snapshot.goals.map((g) => [g.id, g] as [string, DevelopmentGoal]));
    await this.storage.putMany(
      'reflections',
      snapshot.reflections.map((r) => [r.id, r] as [string, ReflectionEntry]),
    );
  }

  async clearAll(): Promise<void> {
    await this.storage.clearAll();
  }
}
