/** Druck- beziehungsweise PDF-freundliche Ansicht der gesamten Strecke. */
import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { effectiveEnd, effectiveStart, groupByPhase, phaseBoundaries, trackStateOf } from '../../domain/schedule';
import { formatDate, formatNumber, formatRange, trainingEndDate } from '../../domain/dates';
import { APP_NAME, APP_SUBTITLE, APP_VERSION } from '../../domain/types';

export function Druckansicht() {
  const app = useApp();
  const profile = app.profile;
  const template = app.activeTemplate;

  const groups = useMemo(() => {
    if (!template || !profile) return [];
    const grouped = groupByPhase(template.phases, profile.startDate, profile.durationMonths, app.milestones);
    return phaseBoundaries(template.phases, profile.startDate, profile.durationMonths).map((boundary) => ({
      phase: boundary.phase,
      start: boundary.start,
      end: boundary.end,
      milestones: grouped.get(boundary.phase.id) ?? [],
    }));
  }, [template, profile, app.milestones]);

  if (!profile || !template) return null;

  return (
    <div className="stapel">
      <div className="reihe nicht-drucken">
        <h1 style={{ marginRight: 'auto' }}>Druckansicht</h1>
        <button type="button" className="knopf knopf--primaer" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Drucken oder als PDF sichern
        </button>
      </div>

      <div className="druckansicht">
        <h1 style={{ marginBottom: 2 }}>
          {APP_NAME} – Deine Linie
        </h1>
        <p className="gedaempft" style={{ marginTop: 0 }}>
          {APP_SUBTITLE}
        </p>

        <table className="tabelle" style={{ marginBottom: 20 }}>
          <caption className="nur-lesbar">Ausbildungsangaben</caption>
          <tbody>
            <tr>
              <th scope="row">Bezeichnung</th>
              <td>{profile.displayName || 'ohne Angabe'}</td>
              <th scope="row">Bundesland</th>
              <td>{profile.federalState}</td>
            </tr>
            <tr>
              <th scope="row">Ausbildungsbeginn</th>
              <td>{formatDate(profile.startDate)}</td>
              <th scope="row">Schulart</th>
              <td>{profile.schoolType}</td>
            </tr>
            <tr>
              <th scope="row">Ausbildungsende</th>
              <td>{formatDate(trainingEndDate(profile.startDate, profile.durationMonths))}</td>
              <th scope="row">Ausbildungsform</th>
              <td>{profile.trainingForm}</td>
            </tr>
            <tr>
              <th scope="row">Dauer</th>
              <td>{formatNumber(profile.durationMonths)} Monate</td>
              <th scope="row">Fächer</th>
              <td>{profile.subjects.join(', ') || 'ohne Angabe'}</td>
            </tr>
          </tbody>
        </table>

        {groups.map((group) => (
          <section key={group.phase.id}>
            <h2>
              {group.phase.title} <span className="klein gedaempft">({formatRange(group.start, group.end)})</span>
            </h2>
            <p className="klein">{group.phase.summary}</p>
            {group.milestones.length === 0 ? (
              <p className="klein gedaempft">Kein Meilenstein in dieser Etappe.</p>
            ) : (
              <table className="tabelle">
                <caption className="nur-lesbar">Meilensteine der Etappe {group.phase.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Termin</th>
                    <th scope="col">Meilenstein</th>
                    <th scope="col">Kategorie</th>
                    <th scope="col">Vorlauf</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.milestones.map((milestone) => (
                    <tr key={milestone.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatRange(effectiveStart(milestone), effectiveEnd(milestone))}
                      </td>
                      <td>
                        <strong>{milestone.title}</strong>
                        <br />
                        <span className="klein">{milestone.description}</span>
                      </td>
                      <td>{milestone.category}</td>
                      <td>{formatNumber(milestone.leadTimeDays)} Tage</td>
                      <td>{trackStateOf(milestone, app.today)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        <p className="klein gedaempft" style={{ marginTop: 24 }}>
          Grundlage: {template.title} ({template.version}, {template.validAsOf}).
          {template.demo &&
            ' Die mitgelieferten Inhalte sind Demodaten und stellen keine rechtlich verbindliche Vorgabe dar.'}
          <br />
          {APP_NAME} · Version {APP_VERSION} · © Florian Nowak · Erstellt am {formatDate(app.today)}
        </p>
        <p className="klein gedaempft">
          Persönliche Reflexionen aus dem Boxenstopp sind in dieser Ansicht bewusst nicht enthalten.
        </p>
      </div>
    </div>
  );
}
