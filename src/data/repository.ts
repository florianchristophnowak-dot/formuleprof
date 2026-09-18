/**
 * Fachliche Speicherschicht: liest und schreibt den vollständigen
 * Anwendungszustand über einen `StorageAdapter`.
 */
import { createDemoTemplates } from './demoTemplates';
import type { StorageAdapter } from './storage';
import type {
  AppSettings,
  AppSnapshot,
  ContactEntry,
  DevelopmentGoal,
  DocumentRecord,
  ExamPlan,
  GradeRecord,
  MilestoneInstance,
  ReflectionEntry,
  SeminarRecord,
  TeachingWeekEntry,
  TrainingProfile,
  TrainingTemplate,
} from '../domain/types';

const PROFILE_KEY = 'profil';
const SETTINGS_KEY = 'einstellungen';
const SEED_KEY = 'demodaten-geladen';
const EXAM_PLAN_KEY = 'pruefungsplan';
const GRADES_KEY = 'noten';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  includeReflectionsInBackup: false,
  suggestPitStops: true,
  printGrades: false,
};

export class Repository {
  constructor(private readonly storage: StorageAdapter) {}

  /**
   * Legt beim ersten Start die Demovorlagen an. Bei einem Versionswechsel
   * werden die mitgelieferten Vorlagen aktualisiert – eigene Kopien bleiben
   * unverändert, da sie nicht als Demovorlage gekennzeichnet sind.
   */
  async ensureSeeded(): Promise<void> {
    const shipped = createDemoTemplates();
    const seeded = await this.storage.get<boolean>('meta', SEED_KEY);

    if (!seeded) {
      await this.storage.putMany(
        'templates',
        shipped.map((t) => [t.id, t] as [string, TrainingTemplate]),
      );
      await this.storage.put('meta', SEED_KEY, true);
      return;
    }

    const stored = await this.storage.getAll<TrainingTemplate>('templates');
    const byId = new Map(stored.map((t) => [t.id, t]));
    const outdated = shipped.filter((template) => {
      const existing = byId.get(template.id);
      if (!existing) return true;
      return existing.demo === true && existing.version !== template.version;
    });
    if (outdated.length > 0) {
      await this.storage.putMany(
        'templates',
        outdated.map((t) => [t.id, t] as [string, TrainingTemplate]),
      );
    }
  }

  async loadSnapshot(): Promise<AppSnapshot> {
    const [
      profile,
      templates,
      milestones,
      goals,
      reflections,
      teachingWeeks,
      seminarRecords,
      documents,
      contacts,
      examPlan,
      grades,
      settings,
    ] = await Promise.all([
      this.storage.get<TrainingProfile>('meta', PROFILE_KEY),
      this.storage.getAll<TrainingTemplate>('templates'),
      this.storage.getAll<MilestoneInstance>('milestones'),
      this.storage.getAll<DevelopmentGoal>('goals'),
      this.storage.getAll<ReflectionEntry>('reflections'),
      this.storage.getAll<TeachingWeekEntry>('unterrichtswochen'),
      this.storage.getAll<SeminarRecord>('ausbildungsstunden'),
      this.storage.getAll<DocumentRecord>('unterlagen'),
      this.storage.getAll<ContactEntry>('kontakte'),
      this.storage.get<ExamPlan>('meta', EXAM_PLAN_KEY),
      this.storage.get<GradeRecord>('meta', GRADES_KEY),
      this.storage.get<AppSettings>('meta', SETTINGS_KEY),
    ]);

    return {
      profile: profile ?? null,
      templates: templates.sort((a, b) => a.title.localeCompare(b.title, 'de')),
      milestones,
      goals,
      reflections,
      teachingWeeks: teachingWeeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
      seminarRecords: seminarRecords.sort((a, b) => a.date.localeCompare(b.date)),
      documents,
      contacts,
      examPlan: examPlan ?? null,
      grades: grades ?? null,
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

  /* --------------------------- Wegweiser --------------------------- */

  async saveTeachingWeek(entry: TeachingWeekEntry): Promise<void> {
    await this.storage.put('unterrichtswochen', entry.id, entry);
  }

  async removeTeachingWeek(id: string): Promise<void> {
    await this.storage.remove('unterrichtswochen', id);
  }

  async saveSeminarRecord(record: SeminarRecord): Promise<void> {
    await this.storage.put('ausbildungsstunden', record.id, record);
  }

  async removeSeminarRecord(id: string): Promise<void> {
    await this.storage.remove('ausbildungsstunden', id);
  }

  async saveDocument(record: DocumentRecord): Promise<void> {
    await this.storage.put('unterlagen', record.id, record);
  }

  async removeDocument(id: string): Promise<void> {
    await this.storage.remove('unterlagen', id);
  }

  async saveContact(entry: ContactEntry): Promise<void> {
    await this.storage.put('kontakte', entry.id, entry);
  }

  async removeContact(id: string): Promise<void> {
    await this.storage.remove('kontakte', id);
  }

  async saveExamPlan(plan: ExamPlan): Promise<void> {
    await this.storage.put('meta', EXAM_PLAN_KEY, plan);
  }

  async saveGrades(record: GradeRecord): Promise<void> {
    await this.storage.put('meta', GRADES_KEY, record);
  }

  /** Ersetzt den gesamten Datenbestand (Import „Ersetzen“). */
  async replaceAll(snapshot: AppSnapshot): Promise<void> {
    await this.storage.clearAll();
    if (snapshot.profile) await this.storage.put('meta', PROFILE_KEY, snapshot.profile);
    await this.storage.put('meta', SETTINGS_KEY, snapshot.settings);
    await this.storage.put('meta', SEED_KEY, true);
    if (snapshot.examPlan) await this.storage.put('meta', EXAM_PLAN_KEY, snapshot.examPlan);
    if (snapshot.grades) await this.storage.put('meta', GRADES_KEY, snapshot.grades);
    await this.storage.putMany('templates', snapshot.templates.map((t) => [t.id, t] as [string, TrainingTemplate]));
    await this.storage.putMany('milestones', snapshot.milestones.map((m) => [m.id, m] as [string, MilestoneInstance]));
    await this.storage.putMany('goals', snapshot.goals.map((g) => [g.id, g] as [string, DevelopmentGoal]));
    await this.storage.putMany(
      'reflections',
      snapshot.reflections.map((r) => [r.id, r] as [string, ReflectionEntry]),
    );
    await this.storage.putMany(
      'unterrichtswochen',
      snapshot.teachingWeeks.map((entry) => [entry.id, entry] as [string, TeachingWeekEntry]),
    );
    await this.storage.putMany(
      'ausbildungsstunden',
      snapshot.seminarRecords.map((record) => [record.id, record] as [string, SeminarRecord]),
    );
    await this.storage.putMany(
      'unterlagen',
      snapshot.documents.map((record) => [record.id, record] as [string, DocumentRecord]),
    );
    await this.storage.putMany(
      'kontakte',
      snapshot.contacts.map((entry) => [entry.id, entry] as [string, ContactEntry]),
    );
  }

  async clearAll(): Promise<void> {
    await this.storage.clearAll();
  }
}
