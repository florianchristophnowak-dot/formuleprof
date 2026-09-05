/**
 * Boxenstopp – privater Reflexionsbereich.
 *
 * Alle Einträge bleiben ausschliesslich auf diesem Gerät und werden nicht
 * automatisch exportiert.
 */
import { useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Target, Trash2, Wrench } from 'lucide-react';
import { Card, Notice } from '../components/common';
import { useApp } from '../../state/AppContext';
import { effectiveStart } from '../../domain/schedule';
import { daysBetween, formatDate, formatNumber, today as todayIso } from '../../domain/dates';
import { isReflectionRelevant } from '../components/MilestoneDialog';
import { REFLECTION_QUESTIONS } from '../../domain/types';
import type { DevelopmentGoal, ReflectionEntry, ReflectionQuestionId } from '../../domain/types';

const SUGGESTION_KEY = 'formuleprof:boxenstopp-vorschlag';

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Boxenstopp() {
  const app = useApp();
  const [answers, setAnswers] = useState<Partial<Record<ReflectionQuestionId, string>>>({});
  const [triedOut, setTriedOut] = useState(false);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [goalDescription, setGoalDescription] = useState('');

  useEffect(() => {
    const suggested = window.sessionStorage.getItem(SUGGESTION_KEY);
    if (suggested) {
      setMilestoneId(suggested);
      window.sessionStorage.removeItem(SUGGESTION_KEY);
    }
  }, []);

  const activeGoal = app.goals.find((g) => g.active) ?? null;

  /** Termine, nach denen ein freiwilliger Boxenstopp angeboten wird. */
  const suggestions = useMemo(() => {
    if (!app.settings.suggestPitStops) return [];
    const reflected = new Set(app.reflections.map((r) => r.milestoneId).filter(Boolean));
    return app.milestones
      .filter(isReflectionRelevant)
      .filter((m) => m.status === 'erledigt' || effectiveStart(m) < app.today)
      .filter((m) => !reflected.has(m.id))
      .filter((m) => daysBetween(effectiveStart(m), app.today) <= 45)
      .sort((a, b) => (effectiveStart(a) < effectiveStart(b) ? 1 : -1))
      .slice(0, 3);
  }, [app.milestones, app.reflections, app.today, app.settings.suggestPitStops]);

  const sortedReflections = useMemo(
    () => [...app.reflections].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [app.reflections],
  );

  const hasContent = Object.values(answers).some((value) => (value ?? '').trim().length > 0);

  const save = async () => {
    const entry: ReflectionEntry = {
      id: createId('reflexion'),
      createdAt: new Date().toISOString(),
      date: todayIso(),
      milestoneId: milestoneId || undefined,
      goalId: activeGoal?.id,
      answers,
      triedOut,
    };
    await app.addReflection(entry);
    if (activeGoal) {
      await app.saveGoals(
        app.goals.map((goal) =>
          goal.id === activeGoal.id ? { ...goal, lastReviewedAt: entry.createdAt } : goal,
        ),
      );
    }
    setAnswers({});
    setTriedOut(false);
    setMilestoneId('');
    setSaved(true);
  };

  const addGoal = async () => {
    if (!goalDraft.trim()) return;
    const goal: DevelopmentGoal = {
      id: createId('ziel'),
      title: goalDraft.trim(),
      description: goalDescription.trim(),
      createdAt: new Date().toISOString(),
      active: true,
    };
    await app.saveGoals([...app.goals.map((g) => ({ ...g, active: false })), goal]);
    setGoalDraft('');
    setGoalDescription('');
  };

  return (
    <div className="stapel">
      <div>
        <h1>Boxenstopp</h1>
        <p className="gedaempft">
          <Lock size={14} aria-hidden="true" /> Dein privater Bereich für Reflexion. Diese Einträge bleiben auf
          diesem Gerät und sind nicht Teil eines automatischen Exports.
        </p>
      </div>

      {suggestions.length > 0 && (
        <Card title="Vorschlag für einen Boxenstopp" icon={<Wrench size={18} aria-hidden="true" />} variant="akzent">
          <p className="klein gedaempft">
            Nach Unterrichtsbesuchen, Lehrproben und Ausbildungsgesprächen lohnt sich ein kurzer Rückblick. Der
            Boxenstopp ist freiwillig.
          </p>
          <ul className="stapel stapel--eng" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {suggestions.map((milestone) => (
              <li key={milestone.id} className="reihe">
                <button
                  type="button"
                  className="knopf knopf--klein"
                  onClick={() => {
                    setMilestoneId(milestone.id);
                    document.getElementById('boxenstopp-formular')?.scrollIntoView({ block: 'start' });
                    document.getElementById(`frage-${REFLECTION_QUESTIONS[0].id}`)?.focus();
                  }}
                >
                  Boxenstopp zu „{milestone.title}“
                </button>
                <span className="klein gedaempft">{formatDate(effectiveStart(milestone))}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Aktuelles Entwicklungsziel" icon={<Target size={18} aria-hidden="true" />} variant="primaer">
        {activeGoal ? (
          <>
            <p style={{ marginBottom: 4 }}>
              <strong>{activeGoal.title}</strong>
            </p>
            {activeGoal.description && <p className="klein">{activeGoal.description}</p>}
            <p className="klein gedaempft">
              Angelegt am {formatDate(activeGoal.createdAt.slice(0, 10))}
              {activeGoal.lastReviewedAt
                ? ` · zuletzt reflektiert am ${formatDate(activeGoal.lastReviewedAt.slice(0, 10))}`
                : ' · noch nicht reflektiert'}
            </p>
            <button
              type="button"
              className="knopf knopf--klein"
              onClick={() =>
                app.saveGoals(
                  app.goals.map((goal) =>
                    goal.id === activeGoal.id
                      ? { ...goal, active: false, achievedAt: new Date().toISOString() }
                      : goal,
                  ),
                )
              }
            >
              Ziel abschliessen
            </button>
          </>
        ) : (
          <>
            <div className="feld">
              <label htmlFor="ziel-titel">Neues Entwicklungsziel</label>
              <input
                id="ziel-titel"
                type="text"
                value={goalDraft}
                placeholder="z. B. Arbeitsaufträge klar und knapp formulieren"
                onChange={(event) => setGoalDraft(event.target.value)}
              />
            </div>
            <div className="feld">
              <label htmlFor="ziel-beschreibung">Woran merkst du, dass es gelingt?</label>
              <textarea
                id="ziel-beschreibung"
                value={goalDescription}
                onChange={(event) => setGoalDescription(event.target.value)}
              />
            </div>
            <button type="button" className="knopf knopf--primaer" onClick={addGoal} disabled={!goalDraft.trim()}>
              <Plus size={15} aria-hidden="true" /> Ziel übernehmen
            </button>
          </>
        )}
      </Card>

      <Card title="Neuer Boxenstopp">
        <form
          id="boxenstopp-formular"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="feld">
            <label htmlFor="boxenstopp-bezug">Bezug (optional)</label>
            <select
              id="boxenstopp-bezug"
              value={milestoneId}
              onChange={(event) => setMilestoneId(event.target.value)}
            >
              <option value="">Ohne Bezug zu einem Termin</option>
              {app.milestones
                .filter(isReflectionRelevant)
                .map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title} ({formatDate(effectiveStart(milestone))})
                  </option>
                ))}
            </select>
          </div>

          {REFLECTION_QUESTIONS.map((question) => (
            <div className="feld" key={question.id}>
              <label htmlFor={`frage-${question.id}`}>{question.label}</label>
              <textarea
                id={`frage-${question.id}`}
                value={answers[question.id] ?? ''}
                onChange={(event) => {
                  setSaved(false);
                  setAnswers((current) => ({ ...current, [question.id]: event.target.value }));
                }}
              />
            </div>
          ))}

          <label className="wahl">
            <input type="checkbox" checked={triedOut} onChange={(event) => setTriedOut(event.target.checked)} />
            <span>Ich habe eine Rückmeldung inzwischen im Unterricht erprobt.</span>
          </label>

          <div className="reihe" style={{ marginTop: 12 }}>
            <button type="submit" className="knopf knopf--primaer" disabled={!hasContent}>
              Boxenstopp speichern
            </button>
            {saved && <span className="erfolg klein" role="status">Der Boxenstopp wurde lokal gespeichert.</span>}
          </div>
        </form>
      </Card>

      <Card title={`Bisherige Boxenstopps (${formatNumber(sortedReflections.length)})`}>
        {sortedReflections.length === 0 ? (
          <p className="klein gedaempft">Noch keine Einträge vorhanden.</p>
        ) : (
          <div className="stapel stapel--eng">
            {sortedReflections.slice(0, 20).map((entry) => (
              <details className="klapp" key={entry.id}>
                <summary>
                  {formatDate(entry.date)}
                  {entry.milestoneId
                    ? ` · ${app.milestones.find((m) => m.id === entry.milestoneId)?.title ?? 'Termin'}`
                    : ''}
                  {entry.triedOut ? ' · Erprobung dokumentiert' : ''}
                </summary>
                <div className="klapp__inhalt">
                  <dl className="zusammenfassung">
                    {REFLECTION_QUESTIONS.filter((q) => (entry.answers[q.id] ?? '').trim().length > 0).map((q) => (
                      <div key={q.id}>
                        <dt>{q.label}</dt>
                        <dd>{entry.answers[q.id]}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    type="button"
                    className="knopf knopf--klein knopf--gefahr"
                    onClick={() => app.removeReflection(entry.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Eintrag löschen
                  </button>
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>

      <Notice>
        Reflexionen werden nur mitgesichert, wenn du das in den Einstellungen ausdrücklich auswählst. In der
        Streckendatei für den Austausch mit anderen Anwendungen sind sie nie enthalten.
      </Notice>
    </div>
  );
}
