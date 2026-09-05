/**
 * Anwendungszustand. Bündelt Laden, Speichern und alle fachlichen Aktionen.
 * Die Oberfläche greift ausschliesslich über diesen Kontext auf Daten zu.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_SETTINGS, Repository } from '../data/repository';
import { createStorageAdapter } from '../data/storage';
import { buildSchedule, setManualDate } from '../domain/schedule';
import { today as todayIso } from '../domain/dates';
import { mergeSnapshots } from '../io/exportImport';
import type { ImportMode } from '../io/exportImport';
import { routeToMilestones } from '../io/routeExchange';
import type {
  AppSettings,
  AppSnapshot,
  DevelopmentGoal,
  IsoDate,
  MilestoneInstance,
  ReflectionEntry,
  RouteExport,
  TrainingProfile,
  TrainingTemplate,
} from '../domain/types';

export interface RecalculationInfo {
  changed: { id: string; title: string; from: IsoDate; to: IsoDate }[];
  keptManual: number;
}

interface AppContextValue extends AppSnapshot {
  status: 'laden' | 'bereit' | 'fehler';
  error: string | null;
  today: IsoDate;
  activeTemplate: TrainingTemplate | null;
  lastRecalculation: RecalculationInfo | null;
  clearRecalculation: () => void;
  saveProfile: (profile: TrainingProfile) => Promise<void>;
  updateProfile: (patch: Partial<TrainingProfile>) => Promise<void>;
  updateMilestone: (id: string, patch: Partial<MilestoneInstance>) => Promise<void>;
  changeMilestoneDate: (id: string, start: IsoDate | null, end?: IsoDate) => Promise<void>;
  recalculate: () => Promise<void>;
  saveGoals: (goals: DevelopmentGoal[]) => Promise<void>;
  addReflection: (entry: ReflectionEntry) => Promise<void>;
  removeReflection: (id: string) => Promise<void>;
  saveTemplate: (template: TrainingTemplate) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  importSnapshot: (snapshot: AppSnapshot, mode: ImportMode) => Promise<void>;
  importRoute: (route: RouteExport) => Promise<void>;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY: AppSnapshot = {
  profile: null,
  templates: [],
  milestones: [],
  goals: [],
  reflections: [],
  settings: DEFAULT_SETTINGS,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const repositoryRef = useRef<Repository>();
  if (!repositoryRef.current) {
    repositoryRef.current = new Repository(createStorageAdapter());
  }
  const repository = repositoryRef.current;

  const [snapshot, setSnapshot] = useState<AppSnapshot>(EMPTY);
  const [status, setStatus] = useState<'laden' | 'bereit' | 'fehler'>('laden');
  const [error, setError] = useState<string | null>(null);
  const [lastRecalculation, setLastRecalculation] = useState<RecalculationInfo | null>(null);
  const today = useMemo(() => todayIso(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await repository.ensureSeeded();
        const loaded = await repository.loadSnapshot();
        if (!cancelled) {
          setSnapshot(loaded);
          setStatus('bereit');
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Die lokalen Daten konnten nicht geladen werden.');
          setStatus('fehler');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const activeTemplate = useMemo(() => {
    if (!snapshot.profile) return null;
    return snapshot.templates.find((t) => t.id === snapshot.profile?.templateId) ?? null;
  }, [snapshot.profile, snapshot.templates]);

  /** Berechnet die Strecke neu und speichert das Ergebnis. */
  const rebuild = useCallback(
    async (profile: TrainingProfile, templates: TrainingTemplate[], milestones: MilestoneInstance[]) => {
      const template = templates.find((t) => t.id === profile.templateId);
      if (!template) return milestones;
      const result = buildSchedule(template, profile, { existing: milestones });
      await repository.saveMilestones(result.milestones);
      setLastRecalculation({ changed: result.changed, keptManual: result.keptManual.length });
      return result.milestones;
    },
    [repository],
  );

  const saveProfile = useCallback(
    async (profile: TrainingProfile) => {
      await repository.saveProfile(profile);
      const milestones = await rebuild(profile, snapshot.templates, snapshot.milestones);
      setSnapshot((current) => ({ ...current, profile, milestones }));
    },
    [repository, rebuild, snapshot.templates, snapshot.milestones],
  );

  const updateProfile = useCallback(
    async (patch: Partial<TrainingProfile>) => {
      if (!snapshot.profile) return;
      const profile: TrainingProfile = {
        ...snapshot.profile,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await saveProfile(profile);
    },
    [snapshot.profile, saveProfile],
  );

  const updateMilestone = useCallback(
    async (id: string, patch: Partial<MilestoneInstance>) => {
      const updated = snapshot.milestones.map((m) =>
        m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m,
      );
      const changed = updated.find((m) => m.id === id);
      if (changed) await repository.saveMilestone(changed);
      setSnapshot((current) => ({ ...current, milestones: updated }));
    },
    [repository, snapshot.milestones],
  );

  const changeMilestoneDate = useCallback(
    async (id: string, start: IsoDate | null, end?: IsoDate) => {
      if (!snapshot.profile || !activeTemplate) return;
      const result = setManualDate(activeTemplate, snapshot.profile, snapshot.milestones, id, start, end);
      await repository.saveMilestones(result.milestones);
      setLastRecalculation({ changed: result.changed, keptManual: result.keptManual.length });
      setSnapshot((current) => ({ ...current, milestones: result.milestones }));
    },
    [repository, snapshot.profile, snapshot.milestones, activeTemplate],
  );

  const recalculate = useCallback(async () => {
    if (!snapshot.profile) return;
    const milestones = await rebuild(snapshot.profile, snapshot.templates, snapshot.milestones);
    setSnapshot((current) => ({ ...current, milestones }));
  }, [rebuild, snapshot.profile, snapshot.templates, snapshot.milestones]);

  const saveGoals = useCallback(
    async (goals: DevelopmentGoal[]) => {
      await repository.saveGoals(goals);
      setSnapshot((current) => ({ ...current, goals }));
    },
    [repository],
  );

  const addReflection = useCallback(
    async (entry: ReflectionEntry) => {
      await repository.saveReflection(entry);
      setSnapshot((current) => ({
        ...current,
        reflections: [...current.reflections.filter((r) => r.id !== entry.id), entry],
      }));
    },
    [repository],
  );

  const removeReflection = useCallback(
    async (id: string) => {
      await repository.removeReflection(id);
      setSnapshot((current) => ({ ...current, reflections: current.reflections.filter((r) => r.id !== id) }));
    },
    [repository],
  );

  const saveTemplate = useCallback(
    async (template: TrainingTemplate) => {
      const stored: TrainingTemplate = { ...template, updatedAt: new Date().toISOString() };
      await repository.saveTemplate(stored);
      const templates = [...snapshot.templates.filter((t) => t.id !== stored.id), stored].sort((a, b) =>
        a.title.localeCompare(b.title, 'de'),
      );
      let milestones = snapshot.milestones;
      if (snapshot.profile?.templateId === stored.id) {
        milestones = await rebuild(snapshot.profile, templates, milestones);
      }
      setSnapshot((current) => ({ ...current, templates, milestones }));
    },
    [repository, rebuild, snapshot.templates, snapshot.milestones, snapshot.profile],
  );

  const removeTemplate = useCallback(
    async (id: string) => {
      await repository.removeTemplate(id);
      setSnapshot((current) => ({ ...current, templates: current.templates.filter((t) => t.id !== id) }));
    },
    [repository],
  );

  const saveSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const settings = { ...snapshot.settings, ...patch };
      await repository.saveSettings(settings);
      setSnapshot((current) => ({ ...current, settings }));
    },
    [repository, snapshot.settings],
  );

  const importSnapshot = useCallback(
    async (imported: AppSnapshot, mode: ImportMode) => {
      const next = mode === 'ersetzen' ? imported : mergeSnapshots(snapshot, imported);
      await repository.replaceAll(next);
      setSnapshot(next);
    },
    [repository, snapshot],
  );

  const importRoute = useCallback(
    async (route: RouteExport) => {
      if (!snapshot.profile) return;
      const templateId = snapshot.templates.some((t) => t.id === route.templateId)
        ? route.templateId
        : snapshot.profile.templateId;
      const imported = routeToMilestones(route, templateId);
      const byId = new Map(snapshot.milestones.map((m) => [m.id, m]));
      for (const item of imported) {
        const existing = byId.get(item.id);
        byId.set(item.id, existing ? { ...existing, ...item, notes: existing.notes, status: existing.status } : item);
      }
      const milestones = [...byId.values()];
      const profile: TrainingProfile = {
        ...snapshot.profile,
        startDate: route.startDate,
        durationMonths: route.durationMonths,
        trainingForm: route.trainingForm,
        cohortCode: route.cohort ?? snapshot.profile.cohortCode,
        templateId,
        updatedAt: new Date().toISOString(),
      };
      await repository.saveProfile(profile);
      await repository.saveMilestones(milestones);
      setSnapshot((current) => ({ ...current, profile, milestones }));
    },
    [repository, snapshot.profile, snapshot.templates, snapshot.milestones],
  );

  const resetAll = useCallback(async () => {
    await repository.clearAll();
    await repository.ensureSeeded();
    const loaded = await repository.loadSnapshot();
    setSnapshot(loaded);
  }, [repository]);

  const value: AppContextValue = {
    ...snapshot,
    status,
    error,
    today,
    activeTemplate,
    lastRecalculation,
    clearRecalculation: () => setLastRecalculation(null),
    saveProfile,
    updateProfile,
    updateMilestone,
    changeMilestoneDate,
    recalculate,
    saveGoals,
    addReflection,
    removeReflection,
    saveTemplate,
    removeTemplate,
    saveSettings,
    importSnapshot,
    importRoute,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp muss innerhalb von AppProvider verwendet werden.');
  return context;
}
