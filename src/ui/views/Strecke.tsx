/**
 * Strecke – der gesamte Vorbereitungsdienst als Rennstrecke.
 *
 * Auf dem Desktop waagerecht als Streckenband, auf kleinen Displays als
 * eigenständige, senkrechte Etappenansicht (keine verkleinerte Kopie).
 */
import { useMemo, useState } from 'react';
import { CircleDot, Flag, FlagTriangleRight, Plus, Printer, Route as RouteIcon } from 'lucide-react';
import { Card, StateBadge } from '../components/common';
import { MilestoneDialog } from '../components/MilestoneDialog';
import { OwnMilestoneDialog } from '../components/OwnMilestoneDialog';
import { useApp } from '../../state/AppContext';
import { effectiveEnd, effectiveStart, groupByPhase, phaseAtDate, phaseBoundaries, trackStateOf } from '../../domain/schedule';
import { formatDate, formatNumber, formatRange, trainingEndDate } from '../../domain/dates';
import { nextMandatoryMilestone } from '../../domain/progress';
import type { MilestoneInstance, TrackState, TrainingPhase } from '../../domain/types';
import type { Route } from '../router';

interface PhaseGroup {
  phase: TrainingPhase;
  start: string;
  end: string;
  milestones: MilestoneInstance[];
  isCurrent: boolean;
}

export function Strecke({ navigate }: { navigate: (route: Route) => void }) {
  const app = useApp();
  const [selected, setSelected] = useState<MilestoneInstance | null>(null);
  const [addingOwn, setAddingOwn] = useState(false);
  const [filter, setFilter] = useState<'alle' | 'offen' | 'verbindlich' | 'eigene'>('alle');

  const template = app.activeTemplate;
  const profile = app.profile;

  const nextId = useMemo(
    () => nextMandatoryMilestone(app.milestones, app.today)?.id,
    [app.milestones, app.today],
  );

  const groups = useMemo<PhaseGroup[]>(() => {
    if (!template || !profile) return [];
    const currentPhase = phaseAtDate(template.phases, profile.startDate, profile.durationMonths, app.today);
    const grouped = groupByPhase(template.phases, profile.startDate, profile.durationMonths, app.milestones);

    return phaseBoundaries(template.phases, profile.startDate, profile.durationMonths).map((boundary) => ({
      phase: boundary.phase,
      start: boundary.start,
      end: boundary.end,
      isCurrent: currentPhase?.id === boundary.phase.id,
      milestones: grouped.get(boundary.phase.id) ?? [],
    }));
  }, [template, profile, app.milestones, app.today]);

  const visible = (milestone: MilestoneInstance): boolean => {
    if (filter === 'offen') return milestone.status !== 'erledigt' && milestone.status !== 'entfällt';
    if (filter === 'verbindlich') return milestone.mandatory;
    if (filter === 'eigene') return milestone.custom === true || milestone.agreed === true;
    return true;
  };

  const nowPercent = useMemo(() => {
    if (!profile) return 0;
    const total = groups.length;
    if (total === 0) return 0;
    const index = groups.findIndex((group) => app.today >= group.start && app.today <= group.end);
    if (index < 0) return app.today < groups[0]!.start ? 0 : 100;
    const group = groups[index]!;
    const span = new Date(group.end).getTime() - new Date(group.start).getTime();
    const inner = span > 0 ? (new Date(app.today).getTime() - new Date(group.start).getTime()) / span : 0;
    return ((index + inner) / total) * 100;
  }, [groups, app.today, profile]);

  if (!template || !profile) return null;

  return (
    <div className="stapel">
      <div className="reihe">
        <div style={{ marginRight: 'auto' }}>
          <h1>Deine Linie</h1>
          <p className="gedaempft">
            {formatDate(profile.startDate)} bis {formatDate(trainingEndDate(profile.startDate, profile.durationMonths))} ·{' '}
            {formatNumber(profile.durationMonths)} Monate · {template.title}
          </p>
        </div>
        <button type="button" className="knopf knopf--klein nicht-drucken" onClick={() => setAddingOwn(true)}>
          <Plus size={15} aria-hidden="true" /> Eigenen Termin
        </button>
        <button type="button" className="knopf knopf--klein nicht-drucken" onClick={() => navigate('druck')}>
          <Printer size={15} aria-hidden="true" /> Druckansicht
        </button>
      </div>

      <fieldset className="feldgruppe nicht-drucken" style={{ marginBottom: 0 }}>
        <legend>Anzeige</legend>
        <div className="reihe">
          {(['alle', 'offen', 'verbindlich', 'eigene'] as const).map((option) => (
            <label className="wahl" key={option} style={{ paddingRight: 12 }}>
              <input
                type="radio"
                name="streckenfilter"
                value={option}
                checked={filter === option}
                onChange={() => setFilter(option)}
              />
              <span>
                {option === 'alle'
                  ? 'Alle Meilensteine'
                  : option === 'offen'
                    ? 'Nur offene'
                    : option === 'verbindlich'
                      ? 'Nur verbindliche'
                      : 'Nur eigene und vereinbarte'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Waagerechte Streckendarstellung – nur auf grossen Displays */}
      <section className="strecke strecke__horizontal" aria-label="Streckenband">
        <div className="strecke__band">
          <div className="strecke__spur" style={{ position: 'relative' }}>
            {groups.map((group) => (
              <div
                key={group.phase.id}
                className={[
                  'etappe',
                  group.phase.demanding ? 'etappe--kurve' : '',
                  group.isCurrent ? 'etappe--aktuell' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <p className="etappe__titel">{group.phase.title}</p>
                <p className="etappe__zeit">
                  {formatDate(group.start)}
                  <br />
                  {formatDate(group.end)}
                </p>
                <div className="etappe__flaggen">
                  {group.milestones.filter(visible).map((milestone) => {
                    const state = trackStateOf(milestone, app.today, nextId);
                    return (
                      <button
                        key={milestone.id}
                        type="button"
                        className={`flagge ${flagClass(state)}`}
                        onClick={() => setSelected(milestone)}
                        aria-label={`${milestone.title}, ${formatRange(effectiveStart(milestone), effectiveEnd(milestone))}, ${state}`}
                        title={`${milestone.title} – ${formatDate(effectiveStart(milestone))}`}
                      >
                        {milestone.mandatory ? (
                          <Flag size={14} aria-hidden="true" />
                        ) : (
                          <CircleDot size={14} aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div
              className="jetzt-markierung"
              style={{ left: `${nowPercent}%` }}
              aria-hidden="true"
            >
              <span className="jetzt-markierung__text">heute</span>
            </div>
          </div>
        </div>
        <p className="klein gedaempft" style={{ marginTop: 10, marginBottom: 0 }}>
          <FlagTriangleRight size={13} aria-hidden="true" /> Schraffierte Abschnitte kennzeichnen anspruchsvolle
          Passagen. Flaggen stehen für verbindliche Termine, Kreise für empfohlene Schritte.
        </p>
      </section>

      {/*
        Senkrechte Etappenansicht: auf kleinen Displays die Hauptdarstellung,
        auf dem Desktop die ergänzende Liste unterhalb des Streckenbands.
        Sie wird bewusst nur einmal erzeugt – keine verkleinerte Kopie.
      */}
      <Card title="Etappen im Überblick" icon={<RouteIcon size={18} aria-hidden="true" />}>
        <div className="strecke__vertikal">
          {groups.map((group) => (
            <PhaseCard
              key={group.phase.id}
              group={group}
              today={app.today}
              nextId={nextId}
              filter={visible}
              onSelect={setSelected}
            />
          ))}
        </div>
      </Card>

      {addingOwn && <OwnMilestoneDialog onClose={() => setAddingOwn(false)} />}

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

function PhaseCard({
  group,
  today,
  nextId,
  filter,
  onSelect,
}: {
  group: PhaseGroup;
  today: string;
  nextId?: string;
  filter: (milestone: MilestoneInstance) => boolean;
  onSelect: (milestone: MilestoneInstance) => void;
}) {
  const milestones = group.milestones.filter(filter);
  return (
    <article
      className={[
        'etappe-karte',
        group.isCurrent ? 'etappe-karte--aktuell' : '',
        group.phase.demanding ? 'etappe-karte--kurve' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="reihe">
        <h3 style={{ marginRight: 'auto', marginBottom: 0 }}>{group.phase.title}</h3>
        {group.isCurrent && <span className="marke marke--aktuell">aktuelle Etappe</span>}
        {group.phase.demanding && <span className="marke">anspruchsvolle Passage</span>}
      </div>
      <p className="klein gedaempft" style={{ margin: '4px 0 8px' }}>
        {formatRange(group.start, group.end)} · {group.phase.summary}
      </p>
      {milestones.length === 0 ? (
        <p className="klein gedaempft" style={{ margin: 0 }}>
          In dieser Etappe ist derzeit kein Meilenstein eingeplant.
        </p>
      ) : (
        milestones.map((milestone) => {
          const state = trackStateOf(milestone, today, nextId);
          return (
            <button
              key={milestone.id}
              type="button"
              className="meilenstein-zeile"
              onClick={() => onSelect(milestone)}
            >
              <span className={`meilenstein-zeile__symbol ${flagClass(state)}`} aria-hidden="true">
                {milestone.mandatory ? <Flag size={15} /> : <CircleDot size={15} />}
              </span>
              <span className="meilenstein-zeile__text">
                <span className="meilenstein-zeile__titel">{milestone.title}</span>
                <span className="klein gedaempft">
                  {formatRange(effectiveStart(milestone), effectiveEnd(milestone))} · {milestone.category}
                </span>
              </span>
              <StateBadge state={state} />
            </button>
          );
        })
      )}
    </article>
  );
}

function flagClass(state: TrackState): string {
  switch (state) {
    case 'abgeschlossen':
      return 'flagge--abgeschlossen';
    case 'aktuell':
      return 'flagge--aktuell';
    case 'als Nächstes':
      return 'flagge--naechstes';
    case 'überfällig':
      return 'flagge--ueberfaellig';
    case 'verschoben':
      return 'flagge--verschoben';
    default:
      return '';
  }
}
