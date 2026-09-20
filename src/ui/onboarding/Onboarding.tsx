/**
 * Schrittweises Onboarding mit Fortschrittsanzeige.
 *
 * Am Ende steht eine verständliche Zusammenfassung unter der Überschrift
 * „So wurde deine Strecke berechnet“. Alle Angaben lassen sich später in den
 * Einstellungen ändern.
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Flag, Info } from 'lucide-react';
import { Card, Notice } from '../components/common';
import { useApp } from '../../state/AppContext';
import { cohortCodeWarning, parseCohortCode } from '../../domain/cohortCode';
import { buildSchedule, effectiveStart, milestoneApplies } from '../../domain/schedule';
import { dateAtFraction, formatDate, formatNumber, trainingEndDate } from '../../domain/dates';
import { suggestTemplateId } from '../../data/demoTemplates';
import {
  APP_NAME,
  APP_SUBTITLE,
  FEDERAL_STATES,
  SCHOOL_TYPES,
  TRAINING_FORMS,
} from '../../domain/types';
import type {
  ContactEntry,
  DevelopmentGoal,
  FederalState,
  SchoolType,
  TrainingForm,
  TrainingProfile,
} from '../../domain/types';
import type { Route } from '../router';

const STEPS = [
  'Willkommen',
  'Beginn und Dauer',
  'Rahmen',
  'Fächer',
  'Bekannte Termine',
  'Erledigtes',
  'Entwicklungsziel',
  'Wegweiser',
  'Zusammenfassung',
] as const;

interface Draft {
  displayName: string;
  cohortCode: string;
  startDate: string;
  durationMonths: number;
  federalState: FederalState;
  schoolType: SchoolType;
  trainingForm: TrainingForm;
  subjects: string;
  templateId: string;
  knownDates: Record<string, string>;
  completed: Record<string, boolean>;
  goalTitle: string;
  goalDescription: string;
  /** Fachleitungen je Ausbildungsfach – erster Eintrag im Wegweiser. */
  leaders: Record<string, string>;
  mentor: string;
}

export function Onboarding({ navigate }: { navigate: (route: Route) => void }) {
  const app = useApp();
  const [step, setStep] = useState(0);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [codeWarning, setCodeWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<Draft>(() => ({
    displayName: '',
    cohortCode: '',
    startDate: new Date().toISOString().slice(0, 10),
    durationMonths: 18,
    federalState: 'Thüringen',
    schoolType: 'Gymnasium',
    trainingForm: 'regulär',
    subjects: '',
    templateId: '',
    knownDates: {},
    completed: {},
    goalTitle: '',
    goalDescription: '',
    leaders: {},
    mentor: '',
  }));

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const templateId = useMemo(
    () =>
      draft.templateId ||
      suggestTemplateId(app.templates, draft.federalState, draft.schoolType, draft.durationMonths),
    [draft.templateId, draft.federalState, draft.schoolType, draft.durationMonths, app.templates],
  );

  const template = app.templates.find((t) => t.id === templateId) ?? null;

  const profileDraft = useMemo<TrainingProfile>(
    () => ({
      id: 'profil',
      displayName: draft.displayName.trim() || undefined,
      startDate: draft.startDate,
      durationMonths: draft.durationMonths,
      federalState: draft.federalState,
      schoolType: draft.schoolType,
      trainingForm: draft.trainingForm,
      subjects: draft.subjects
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      cohortCode: draft.cohortCode.trim() || undefined,
      templateId,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [draft, templateId],
  );

  /** Vorschau der Strecke – Grundlage für Terminabfrage und Zusammenfassung. */
  const preview = useMemo(() => {
    if (!template) return null;
    return buildSchedule(template, profileDraft);
  }, [template, profileDraft]);

  const datedMilestones = useMemo(() => {
    if (!template) return [];
    return template.milestones
      .filter((definition) => milestoneApplies(definition, profileDraft))
      .filter((definition) =>
        ['Unterrichtsbesuch', 'Ausbildungsgespräch', 'Lehrprobe', 'Beurteilung', 'Prüfung'].includes(
          definition.category,
        ),
      )
      .sort((a, b) => a.order - b.order);
  }, [template, profileDraft]);

  const readCode = () => {
    const parsed = parseCohortCode(draft.cohortCode);
    if (!parsed) {
      setCodeMessage(null);
      setCodeWarning(
        'Der Jahrgangscode konnte nicht gelesen werden. Erwartet wird ein Muster wie 02-26-18 (Monat–Jahr–Dauer).',
      );
      return;
    }
    set({ startDate: parsed.startDate, durationMonths: parsed.durationMonths });
    setCodeWarning(cohortCodeWarning(parsed));
    setCodeMessage(
      `Gelesen: Beginn im ${new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
        new Date(parsed.year, parsed.month - 1, 1),
      )}, Ausbildungsdauer ${formatNumber(parsed.durationMonths)} Monate. Bitte prüfe und korrigiere die Angaben unten, bevor du fortfährst.`,
    );
  };

  const finish = async () => {
    if (!template || !preview) return;
    setSaving(true);

    const milestones = preview.milestones.map((milestone) => {
      const manual = draft.knownDates[milestone.definitionId];
      const done = draft.completed[milestone.definitionId];
      return {
        ...milestone,
        manualStart: manual || undefined,
        manualEnd: manual || undefined,
        status: done ? ('erledigt' as const) : milestone.status,
      };
    });

    // Die manuell erfassten Termine wirken sich auf abhängige Termine aus.
    const recalculated = buildSchedule(template, profileDraft, { existing: milestones });

    const now = new Date().toISOString();
    const contacts: ContactEntry[] = [
      ...Object.entries(draft.leaders)
        .filter(([, name]) => name.trim().length > 0)
        .map(([subject, name], index) => ({
          id: `kontakt-fachleitung-${index + 1}`,
          name: name.trim(),
          role: 'Fachleitung' as const,
          subject,
          updatedAt: now,
        })),
      ...(draft.mentor.trim()
        ? [
            {
              id: 'kontakt-mentor',
              name: draft.mentor.trim(),
              role: 'Mentorin oder Mentor' as const,
              updatedAt: now,
            },
          ]
        : []),
    ];

    await app.importSnapshot(
      {
        profile: profileDraft,
        templates: app.templates,
        milestones: recalculated.milestones,
        goals: draft.goalTitle.trim()
          ? [
              {
                id: `ziel-${Date.now().toString(36)}`,
                title: draft.goalTitle.trim(),
                description: draft.goalDescription.trim(),
                createdAt: now,
                active: true,
              } satisfies DevelopmentGoal,
            ]
          : app.goals,
        reflections: app.reflections,
        teachingWeeks: app.teachingWeeks,
        seminarRecords: app.seminarRecords,
        documents: app.documents,
        contacts: contacts.length > 0 ? contacts : app.contacts,
        examPlan: app.examPlan,
        grades: app.grades,
        settings: app.settings,
      },
      'ersetzen',
    );
    setSaving(false);
    navigate('cockpit');
  };

  const canContinue = step !== 1 || Boolean(draft.startDate);

  return (
    <div className="onboarding stapel">
      <div>
        <h1>
          {APP_NAME} einrichten
        </h1>
        <p className="gedaempft">{APP_SUBTITLE}</p>
      </div>

      <div>
        <div className="schrittanzeige" role="presentation">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={[
                'schrittanzeige__punkt',
                index < step ? 'schrittanzeige__punkt--erledigt' : '',
                index === step ? 'schrittanzeige__punkt--aktuell' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>
        <p className="klein gedaempft" role="status">
          Schritt {formatNumber(step + 1)} von {formatNumber(STEPS.length)}: {STEPS[step]}
        </p>
      </div>

      <Card>
        {step === 0 && (
          <>
            <h2>Willkommen</h2>
            <p>
              {APP_NAME} zeigt dir deinen persönlichen Weg durch den Vorbereitungsdienst als übersichtliche
              Strecke. Die Darstellung dient ausschliesslich der Orientierung: Es gibt keine Ranglisten, keine
              Punkte und keinen Vergleich mit anderen Personen.
            </p>
            <p>
              Alle Angaben bleiben auf diesem Gerät. Es werden keine Daten übertragen, es ist kein Konto nötig
              und die App funktioniert vollständig offline.
            </p>
            <div className="feld">
              <label htmlFor="ob-name">Name oder frei wählbare Bezeichnung (optional)</label>
              <input
                id="ob-name"
                type="text"
                value={draft.displayName}
                placeholder="z. B. Jahrgang Februar 2026"
                onChange={(event) => set({ displayName: event.target.value })}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Ausbildungsbeginn und Dauer</h2>
            <div className="feld">
              <label htmlFor="ob-code">Jahrgangscode (optional)</label>
              <span className="feld__hinweis" id="ob-code-hinweis">
                Beispiel: 02-26-18 bedeutet Beginn im Februar 2026 und 18 Monate Ausbildungsdauer.
              </span>
              <div className="reihe">
                <input
                  id="ob-code"
                  type="text"
                  aria-describedby="ob-code-hinweis"
                  value={draft.cohortCode}
                  placeholder="02-26-18"
                  onChange={(event) => set({ cohortCode: event.target.value })}
                  style={{ maxWidth: 200 }}
                />
                <button type="button" className="knopf knopf--klein" onClick={readCode}>
                  Code auswerten
                </button>
              </div>
            </div>

            {codeMessage && (
              <Notice tone="erfolg">
                <Info size={15} aria-hidden="true" /> {codeMessage}
              </Notice>
            )}
            {codeWarning && <Notice tone="fehler">{codeWarning}</Notice>}

            <div className="raster" style={{ marginTop: 12 }}>
              <div className="feld">
                <label htmlFor="ob-beginn">Ausbildungsbeginn</label>
                <input
                  id="ob-beginn"
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => set({ startDate: event.target.value })}
                  required
                />
              </div>
              <div className="feld">
                <label htmlFor="ob-dauer">Ausbildungsdauer</label>
                <select
                  id="ob-dauer"
                  value={draft.durationMonths}
                  onChange={(event) => set({ durationMonths: Number(event.target.value) })}
                >
                  {[12, 18, 24, 36].map((months) => (
                    <option key={months} value={months}>
                      {months} Monate
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="klein gedaempft">
              Daraus ergibt sich ein Ausbildungsende am{' '}
              {formatDate(trainingEndDate(draft.startDate, draft.durationMonths))}.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Bundesland, Schulart und Ausbildungsform</h2>
            <div className="raster">
              <div className="feld">
                <label htmlFor="ob-land">Bundesland</label>
                <select
                  id="ob-land"
                  value={draft.federalState}
                  onChange={(event) => set({ federalState: event.target.value as FederalState, templateId: '' })}
                >
                  {FEDERAL_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div className="feld">
                <label htmlFor="ob-schulart">Schulart</label>
                <select
                  id="ob-schulart"
                  value={draft.schoolType}
                  onChange={(event) => set({ schoolType: event.target.value as SchoolType, templateId: '' })}
                >
                  {SCHOOL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="feld">
                <label htmlFor="ob-form">Ausbildungsform</label>
                <select
                  id="ob-form"
                  value={draft.trainingForm}
                  onChange={(event) => set({ trainingForm: event.target.value as TrainingForm })}
                >
                  {TRAINING_FORMS.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </div>
              <div className="feld">
                <label htmlFor="ob-vorlage">Ausbildungsvorlage</label>
                <span className="feld__hinweis">Vorgeschlagen anhand von Bundesland und Schulart.</span>
                <select
                  id="ob-vorlage"
                  value={templateId}
                  onChange={(event) => set({ templateId: event.target.value })}
                >
                  {app.templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {template?.demo && (
              <Notice>
                Die mitgelieferten Vorlagen sind ausdrücklich Demodaten. Sie bilden einen typischen Ablauf ab
                und sind keine rechtlich verbindliche Vorgabe.
              </Notice>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2>Fächer</h2>
            <div className="feld">
              <label htmlFor="ob-faecher">Deine Fächer</label>
              <span className="feld__hinweis">Mehrere Fächer durch Komma trennen, z. B. Deutsch, Geschichte.</span>
              <input
                id="ob-faecher"
                type="text"
                value={draft.subjects}
                onChange={(event) => set({ subjects: event.target.value })}
              />
            </div>
            <p className="klein gedaempft">
              Die Fächerzahl beeinflusst einzelne Meilensteine, etwa die zweite benotete Lehrprobe.
            </p>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Bereits bekannte Termine</h2>
            <p className="klein gedaempft">
              Trage nur ein, was dir bereits bekannt ist. Alles Übrige berechnet {APP_NAME} aus der Vorlage.
              Eingetragene Termine bleiben bei späteren Neuberechnungen unverändert.
            </p>
            {datedMilestones.map((definition) => {
              const computed = preview?.milestones.find((m) => m.definitionId === definition.id);
              return (
                <div className="feld" key={definition.id}>
                  <label htmlFor={`ob-termin-${definition.id}`}>{definition.title}</label>
                  <span className="feld__hinweis">
                    {definition.category}
                    {computed ? ` · berechnet: ${formatDate(effectiveStart(computed))}` : ''}
                  </span>
                  <input
                    id={`ob-termin-${definition.id}`}
                    type="date"
                    value={draft.knownDates[definition.id] ?? ''}
                    onChange={(event) =>
                      set({ knownDates: { ...draft.knownDates, [definition.id]: event.target.value } })
                    }
                  />
                </div>
              );
            })}
          </>
        )}

        {step === 5 && (
          <>
            <h2>Bereits absolvierte Meilensteine</h2>
            <p className="klein gedaempft">
              Setze Haken bei allem, was schon hinter dir liegt. Das beeinflusst ausschliesslich deine
              Übersicht – es findet keine Bewertung statt.
            </p>
            {(preview?.milestones ?? []).map((milestone) => (
              <label className="wahl" key={milestone.definitionId}>
                <input
                  type="checkbox"
                  checked={Boolean(draft.completed[milestone.definitionId])}
                  onChange={(event) =>
                    set({ completed: { ...draft.completed, [milestone.definitionId]: event.target.checked } })
                  }
                />
                <span>
                  {milestone.title}
                  <span className="klein gedaempft"> · {formatDate(effectiveStart(milestone))}</span>
                </span>
              </label>
            ))}
          </>
        )}

        {step === 6 && (
          <>
            <h2>Aktuelles persönliches Entwicklungsziel</h2>
            <p className="klein gedaempft">
              Ein Ziel hilft dabei, Rückmeldungen und Boxenstopps miteinander zu verbinden. Du kannst das Feld
              auch frei lassen und später ergänzen.
            </p>
            <div className="feld">
              <label htmlFor="ob-ziel">Entwicklungsziel</label>
              <input
                id="ob-ziel"
                type="text"
                value={draft.goalTitle}
                placeholder="z. B. Arbeitsaufträge klar und knapp formulieren"
                onChange={(event) => set({ goalTitle: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="ob-ziel-text">Woran merkst du, dass es gelingt?</label>
              <textarea
                id="ob-ziel-text"
                value={draft.goalDescription}
                onChange={(event) => set({ goalDescription: event.target.value })}
              />
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h2>Dein Wegweiser</h2>
            <p>
              {APP_NAME} ist nicht nur ein Terminplan: Du füllst den Wegweiser im Verlauf der Ausbildung
              weiter. Dort sammeln sich dein Unterrichtseinsatz je Woche, die Ausbildungsstunden am
              Studienseminar, Unterlagen und Formulare, Ansprechpersonen, der Prüfungsfahrplan und deine
              Notenübersicht.
            </p>
            <p className="klein gedaempft">
              Daraus entstehen die Hinweise im Cockpit – und beim Ausbildungsgespräch hast du deine Belege
              beisammen. Du kannst jetzt schon anfangen oder alles später ergänzen.
            </p>
            {profileDraft.subjects.length > 0 ? (
              profileDraft.subjects.map((subject) => (
                <div className="feld" key={subject}>
                  <label htmlFor={`ob-fachleitung-${subject}`}>Fachleitung {subject} (optional)</label>
                  <input
                    id={`ob-fachleitung-${subject}`}
                    type="text"
                    value={draft.leaders[subject] ?? ''}
                    onChange={(event) => set({ leaders: { ...draft.leaders, [subject]: event.target.value } })}
                  />
                </div>
              ))
            ) : (
              <p className="klein gedaempft">
                Sobald deine Fächer eingetragen sind, kannst du hier die Fachleitungen ergänzen.
              </p>
            )}
            <div className="feld">
              <label htmlFor="ob-mentor">Mentorin oder Mentor an der Schule (optional)</label>
              <input
                id="ob-mentor"
                type="text"
                value={draft.mentor}
                onChange={(event) => set({ mentor: event.target.value })}
              />
            </div>
          </>
        )}

        {step === 8 && preview && template && (
          <>
            <h2>So wurde deine Strecke berechnet</h2>
            <dl className="zusammenfassung">
              <dt>Ausbildungszeitraum</dt>
              <dd>
                {formatDate(draft.startDate)} bis {formatDate(trainingEndDate(draft.startDate, draft.durationMonths))} (
                {formatNumber(draft.durationMonths)} Monate)
                {draft.cohortCode ? ` – gelesen aus dem Jahrgangscode ${draft.cohortCode}` : ''}
              </dd>

              <dt>Verwendete Vorlage</dt>
              <dd>
                {template.title} · Version {template.version} · {template.validAsOf}
                {template.demo && ' · Demodaten ohne rechtliche Verbindlichkeit'}
              </dd>

              <dt>Etappen</dt>
              <dd>
                {formatNumber(template.phases.length)} Etappen, verteilt über die Gesamtdauer. Beispiel: Die
                Etappe „{template.phases[0]?.title}“ beginnt am {formatDate(draft.startDate)}, die Etappe „
                {template.phases[template.phases.length - 1]?.title}“ endet am{' '}
                {formatDate(dateAtFraction(draft.startDate, draft.durationMonths, 1))}.
              </dd>

              <dt>Meilensteine</dt>
              <dd>
                {formatNumber(preview.milestones.length)} Meilensteine gelten für deine Angaben.
                {template.milestones.length !== preview.milestones.length &&
                  ` ${formatNumber(
                    template.milestones.length - preview.milestones.length,
                  )} Meilensteine entfallen wegen Schulart, Dauer oder Ausbildungsform.`}
              </dd>

              <dt>Eigene Termine</dt>
              <dd>
                {Object.values(draft.knownDates).filter(Boolean).length === 0
                  ? 'Keine eigenen Termine eingetragen – alle Termine stammen aus der Vorlage.'
                  : `${formatNumber(
                      Object.values(draft.knownDates).filter(Boolean).length,
                    )} eingetragene Termine gelten als feste Angabe und werden bei Neuberechnungen nicht verändert. Termine, die darauf aufbauen, verschieben sich automatisch mit.`}
              </dd>

              <dt>Bereits erledigt</dt>
              <dd>
                {formatNumber(Object.values(draft.completed).filter(Boolean).length)} Meilensteine sind als
                abgeschlossen markiert.
              </dd>

              <dt>Entwicklungsziel</dt>
              <dd>{draft.goalTitle.trim() || 'Noch kein Ziel festgelegt.'}</dd>

              <dt>Wegweiser</dt>
              <dd>
                {template.teachingLoad
                  ? `Soll-Korridore für den Unterrichtseinsatz sind hinterlegt (${formatNumber(
                      template.teachingLoad.stages.length,
                    )} Abschnitte).`
                  : 'Für diese Vorlage sind keine Soll-Korridore hinterlegt.'}
                {template.seminarRequirements && template.seminarRequirements.length > 0
                  ? ' Der Mindestumfang der Ausbildungsstunden ist hinterlegt.'
                  : ''}
              </dd>
            </dl>

            <Notice>
              <Flag size={15} aria-hidden="true" /> Alle Angaben lassen sich später in den Einstellungen ändern.
              Änderungen an Beginn, Dauer oder Prüfungsterminen berechnen abhängige Termine automatisch neu.
            </Notice>
          </>
        )}
      </Card>

      <div className="reihe">
        <button
          type="button"
          className="knopf"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          disabled={step === 0}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Zurück
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="knopf knopf--primaer"
            onClick={() => setStep((current) => Math.min(current + 1, STEPS.length - 1))}
            disabled={!canContinue}
          >
            Weiter <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="knopf knopf--primaer" onClick={finish} disabled={saving}>
            <Check size={16} aria-hidden="true" /> Strecke anlegen
          </button>
        )}
        <span className="klein gedaempft" style={{ marginLeft: 'auto' }}>
          Angaben lassen sich jederzeit ändern.
        </span>
      </div>
    </div>
  );
}
