/**
 * Cockpit – die Startseite. Beantwortet täglich vier Fragen:
 * Wo stehe ich? Was ist jetzt wichtig? Was kommt als Nächstes?
 * Welche Herausforderung sollte ich früh vorbereiten?
 */
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Compass,
  Flag,
  Gauge,
  MapPin,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { Card, ProgressBar, StateBadge } from '../components/common';
import { MilestoneDialog } from '../components/MilestoneDialog';
import { useApp } from '../../state/AppContext';
import { computeProgress, nextMandatoryMilestone, openIssues } from '../../domain/progress';
import { selectNextSteps } from '../../domain/priority';
import { detectChallenges } from '../../domain/challenges';
import { buildGuideOverview } from '../../domain/guide';
import { effectiveEnd, effectiveStart, trackStateOf } from '../../domain/schedule';
import { daysBetween, formatCountdown, formatDate, formatNumber, formatRange } from '../../domain/dates';
import type { ChallengeHint, MilestoneInstance } from '../../domain/types';
import { href, hrefWithParam } from '../router';
import type { Route } from '../router';

export function Cockpit({ navigate }: { navigate: (route: Route) => void }) {
  const app = useApp();
  const [selected, setSelected] = useState<MilestoneInstance | null>(null);

  const progress = useMemo(
    () => (app.profile ? computeProgress(app.profile, app.activeTemplate, app.milestones, app.goals, app.reflections, app.today) : null),
    [app.profile, app.activeTemplate, app.milestones, app.goals, app.reflections, app.today],
  );

  const steps = useMemo(() => selectNextSteps(app.milestones, app.today), [app.milestones, app.today]);
  const nextMandatory = useMemo(() => nextMandatoryMilestone(app.milestones, app.today), [app.milestones, app.today]);
  const issues = useMemo(() => openIssues(app.milestones, app.today), [app.milestones, app.today]);
  const challenges = useMemo(
    () =>
      detectChallenges({
        milestones: app.milestones,
        goals: app.goals,
        reflections: app.reflections,
        todayIso: app.today,
        rules: app.activeTemplate?.challengeRules ?? [],
        profile: app.profile,
        template: app.activeTemplate,
        teachingWeeks: app.teachingWeeks,
        seminarRecords: app.seminarRecords,
        documents: app.documents,
        examPlan: app.examPlan,
      }),
    [
      app.milestones,
      app.goals,
      app.reflections,
      app.today,
      app.activeTemplate,
      app.profile,
      app.teachingWeeks,
      app.seminarRecords,
      app.documents,
      app.examPlan,
    ],
  );

  /** Stand des Wegweisers – was lässt sich sinnvoll ergänzen? */
  const guide = useMemo(() => {
    if (!app.profile) return [];
    return buildGuideOverview({
      profile: app.profile,
      template: app.activeTemplate,
      milestones: app.milestones,
      teachingWeeks: app.teachingWeeks,
      seminarRecords: app.seminarRecords,
      documents: app.documents,
      contacts: app.contacts,
      examPlan: app.examPlan,
      grades: app.grades,
      goals: app.goals,
      reflections: app.reflections,
      todayIso: app.today,
    });
  }, [
    app.profile,
    app.activeTemplate,
    app.milestones,
    app.teachingWeeks,
    app.seminarRecords,
    app.documents,
    app.contacts,
    app.examPlan,
    app.grades,
    app.goals,
    app.reflections,
    app.today,
  ]);

  if (!app.profile || !progress) return null;

  const upcomingChallenge = challenges[0] ?? null;

  return (
    <div className="stapel">
      <div>
        <h1>
          Cockpit
          {app.profile.displayName ? ` – ${app.profile.displayName}` : ''}
        </h1>
        <p className="gedaempft">
          Stand: {formatDate(app.today)} · {app.activeTemplate?.title ?? 'Keine Vorlage zugeordnet'}
        </p>
      </div>

      <div className="cockpit__leitfragen">
        {/* Frage 1: Wo befinde ich mich gerade? */}
        <Card variant="primaer">
          <p className="leitfrage__titel">Wo stehe ich gerade?</p>
          <h2 style={{ marginBottom: 4 }}>
            <MapPin size={18} aria-hidden="true" /> Monat {formatNumber(progress.currentMonth)} von{' '}
            {formatNumber(progress.totalMonths)}
          </h2>
          <p className="klein gedaempft">
            Etappe: {progress.currentPhase?.title ?? 'Noch nicht begonnen'}
          </p>
          <div className="stapel stapel--eng" style={{ marginTop: 12 }}>
            <ProgressBar
              label="Zeitlicher Ausbildungsfortschritt"
              value={progress.timeFraction}
              description={`Noch ${formatNumber(progress.daysRemaining)} Tage bis zum ${formatDate(progress.endDate)}. Der Zeitanteil sagt nichts über deine Leistung aus.`}
            />
            <ProgressBar
              label="Erledigte Meilensteine"
              value={progress.milestoneFraction}
              tone="gedaempft"
              description={`${formatNumber(progress.milestonesDone)} von ${formatNumber(progress.milestonesRelevant)} Meilensteinen abgeschlossen.`}
            />
            {/* Die persönliche Entwicklung wird bewusst ohne Prozentwert dargestellt. */}
            <div>
              <p className="fortschritt__kopf" style={{ margin: 0 }}>
                <span>Persönliche Entwicklung</span>
              </p>
              <p className="klein gedaempft" style={{ margin: 0 }}>
                {formatNumber(progress.reflectionCount)} Boxenstopps insgesamt, davon{' '}
                {formatNumber(progress.reflectionsLast30Days)} in den letzten 30 Tagen. Entwicklung lässt sich
                nicht in Prozent messen – die Zahlen zeigen nur, wie oft du zurückgeblickt hast.
              </p>
            </div>
          </div>
        </Card>

        {/* Frage 3: Was kommt als Nächstes? */}
        <Card variant="primaer">
          <p className="leitfrage__titel">Was kommt als Nächstes?</p>
          {nextMandatory ? (
            <>
              <h2 style={{ marginBottom: 4 }}>
                <Flag size={18} aria-hidden="true" /> {nextMandatory.title}
              </h2>
              <p className="countdown">{formatCountdown(daysBetween(app.today, effectiveStart(nextMandatory)))}</p>
              <p className="klein gedaempft">
                {formatRange(effectiveStart(nextMandatory), effectiveEnd(nextMandatory))} ·{' '}
                {nextMandatory.category}
              </p>
              <div className="reihe" style={{ marginTop: 10 }}>
                <StateBadge state={trackStateOf(nextMandatory, app.today, nextMandatory.id)} />
                <button
                  type="button"
                  className="knopf knopf--klein"
                  onClick={() => setSelected(nextMandatory)}
                >
                  Details öffnen
                </button>
              </div>
            </>
          ) : (
            <p>Aktuell ist kein verbindlicher Termin offen.</p>
          )}

          {progress.activeGoal ? (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--rahmen)' }}>
              <p className="leitfrage__titel">Aktuelles Entwicklungsziel</p>
              <p style={{ margin: 0 }}>
                <Target size={16} aria-hidden="true" /> {progress.activeGoal.title}
              </p>
              <p className="klein gedaempft" style={{ margin: '4px 0 0' }}>
                {progress.activeGoal.lastReviewedAt
                  ? `Zuletzt vor ${formatNumber(progress.goalReviewedDaysAgo ?? 0)} Tagen reflektiert.`
                  : 'Noch nicht im Boxenstopp reflektiert.'}
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--rahmen)' }}>
              <p className="leitfrage__titel">Aktuelles Entwicklungsziel</p>
              <p className="klein">Noch kein Ziel festgelegt.</p>
              <button type="button" className="knopf knopf--klein" onClick={() => navigate('boxenstopp')}>
                Ziel im Boxenstopp festlegen <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Frage 2: Was ist jetzt wirklich wichtig? */}
      <Card
        title="Was ist jetzt wirklich wichtig?"
        icon={<Gauge size={18} aria-hidden="true" />}
        variant="primaer"
      >
        <p className="klein gedaempft">
          Höchstens drei Schritte – ausgewählt nach Fälligkeit, notwendigem Vorlauf, Voraussetzungen und
          Bearbeitungsstand.
        </p>
        {steps.length === 0 ? (
          <p>Aktuell sind keine offenen Schritte hinterlegt.</p>
        ) : (
          <ol className="stapel stapel--eng" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {steps.map((step, index) => (
              <li
                key={step.milestone.id}
                className={`schritt ${step.daysUntil < 0 ? 'schritt--ueberfaellig' : ''}`}
              >
                <div className="reihe">
                  <span className="schritt__nummer" aria-hidden="true">
                    {index + 1}
                  </span>
                  <strong style={{ flex: 1 }}>{step.milestone.title}</strong>
                  <StateBadge state={trackStateOf(step.milestone, app.today)} />
                </div>
                <p className="klein gedaempft" style={{ margin: '6px 0 0' }}>
                  <CalendarClock size={13} aria-hidden="true" />{' '}
                  {formatRange(effectiveStart(step.milestone), effectiveEnd(step.milestone))} ·{' '}
                  {formatCountdown(step.daysUntil)}
                </p>
                <ul className="begruendung">
                  {step.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="knopf knopf--klein"
                  style={{ marginTop: 8 }}
                  onClick={() => setSelected(step.milestone)}
                >
                  Öffnen
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Frage 4: Welche Herausforderung sollte ich früh vorbereiten? */}
      <Card
        title="Was solltest du frühzeitig vorbereiten?"
        icon={<TriangleAlert size={18} aria-hidden="true" />}
        variant="akzent"
        actions={
          challenges.length > 1 ? (
            <span className="klein gedaempft">{formatNumber(challenges.length)} Hinweise</span>
          ) : null
        }
      >
        {upcomingChallenge ? (
          <div className="stapel stapel--eng">
            {challenges.slice(0, 3).map((hint) => (
              <ChallengeHintBlock hint={hint} key={hint.id} />
            ))}
            {challenges.length > 3 && (
              <details className="klapp">
                <summary>Weitere {formatNumber(challenges.length - 3)} Hinweise anzeigen</summary>
                <div className="klapp__inhalt stapel stapel--eng">
                  {challenges.slice(3).map((hint) => (
                    <ChallengeHintBlock hint={hint} key={hint.id} />
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <p>Aktuell sind keine Häufungen oder offenen Vorarbeiten erkennbar.</p>
        )}
      </Card>

      {/* Der Wegweiser wächst mit: was gehört als Nächstes hinein? */}
      <Card
        title="Was gehört in deinen Wegweiser?"
        icon={<Compass size={18} aria-hidden="true" />}
        actions={
          <a className="knopf knopf--klein" href={href('wegweiser')}>
            Wegweiser öffnen
          </a>
        }
      >
        {guide.filter((area) => area.next).length === 0 ? (
          <p className="klein">
            In allen Bereichen ist der Bestand aktuell. Der Wegweiser hält deinen Unterrichtseinsatz, die
            Ausbildungsstunden, Unterlagen, Ansprechpersonen, den Prüfungsfahrplan und die Notenübersicht
            zusammen.
          </p>
        ) : (
          <ul className="stapel stapel--eng" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {guide
              .filter((area) => area.next)
              .slice(0, 4)
              .map((area) => (
                <li key={area.id}>
                  <a className="wegweiser__verweis" href={hrefWithParam('wegweiser', 'bereich', area.id)}>
                    <strong>{area.title}</strong>
                    <span className="klein">{area.next}</span>
                    <span className="klein gedaempft">{area.status}</span>
                  </a>
                </li>
              ))}
          </ul>
        )}
      </Card>

      {issues.length > 0 && (
        <Card title="Überfällig oder ungeklärt" icon={<AlertTriangle size={18} aria-hidden="true" />}>
          <ul className="stapel stapel--eng" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {issues.slice(0, 5).map((milestone) => (
              <li key={milestone.id} className="reihe">
                <button
                  type="button"
                  className="knopf knopf--schlicht knopf--klein"
                  onClick={() => setSelected(milestone)}
                >
                  {milestone.title}
                </button>
                <span className="klein gedaempft">
                  fällig am {formatDate(effectiveEnd(milestone))} ·{' '}
                  {formatCountdown(daysBetween(app.today, effectiveEnd(milestone)))}
                </span>
              </li>
            ))}
          </ul>
          {issues.length > 5 && (
            <p className="klein gedaempft" style={{ marginTop: 8 }}>
              Weitere {formatNumber(issues.length - 5)} Punkte findest du auf der Strecke.
            </p>
          )}
        </Card>
      )}

      {selected && (
        <MilestoneDialog
          milestone={app.milestones.find((m) => m.id === selected.id) ?? selected}
          onClose={() => setSelected(null)}
          onSuggestPitStop={(milestone) => {
            setSelected(null);
            window.sessionStorage.setItem('formuleprof:boxenstopp-vorschlag', milestone.id);
            navigate('boxenstopp');
          }}
        />
      )}
    </div>
  );
}

/** Ein Hinweis besteht immer aus denselben drei Teilen. */
function ChallengeHintBlock({ hint }: { hint: ChallengeHint }) {
  return (
    <dl className="herausforderung">
      <dt>Mögliche Herausforderung</dt>
      <dd>{hint.challenge}</dd>
      <dt>Warum du das siehst</dt>
      <dd>{hint.why}</dd>
      <dt>Empfohlene Reaktion</dt>
      <dd>{hint.action}</dd>
    </dl>
  );
}
