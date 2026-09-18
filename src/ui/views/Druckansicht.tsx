/** Druck- beziehungsweise PDF-freundliche Ansicht der gesamten Strecke. */
import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { effectiveEnd, effectiveStart, groupByPhase, phaseBoundaries, trackStateOf } from '../../domain/schedule';
import { formatDate, formatNumber, formatRange, trainingEndDate } from '../../domain/dates';
import { summarizeTeachingLoad } from '../../domain/teachingLoad';
import { summarizeSeminarHours } from '../../domain/seminarHours';
import { summarizeExamPlan } from '../../domain/examDeadlines';
import { computeFinalGrade, formatPoints } from '../../domain/grades';
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

  const load = useMemo(
    () =>
      profile ? summarizeTeachingLoad(template?.teachingLoad, profile, app.teachingWeeks, app.today) : null,
    [profile, template, app.teachingWeeks, app.today],
  );

  const seminar = useMemo(
    () =>
      profile
        ? summarizeSeminarHours(app.seminarRecords, template?.seminarRequirements, profile, app.today)
        : null,
    [profile, template, app.seminarRecords, app.today],
  );

  const exam = useMemo(
    () => summarizeExamPlan(app.examPlan, template?.examDeadlines, app.today),
    [app.examPlan, template, app.today],
  );

  const grades = useMemo(() => computeFinalGrade(app.grades, template?.gradeModel), [app.grades, template]);

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

        {/* Wegweiser: Belege für Ausbildungsgespräche und Beurteilungen. */}
        <h2>Unterrichtseinsatz</h2>
        {load && load.weeksWithEntry > 0 ? (
          <>
            <p className="klein">
              {formatNumber(load.weeksWithEntry)} erfasste Wochen. Summen über den erfassten Zeitraum:
              Hospitation {formatNumber(load.totals.hospitation)}, angeleiteter Unterricht{' '}
              {formatNumber(load.totals.guided)}, selbstständiger Unterricht{' '}
              {formatNumber(load.totals.independent)} Wochenstunden.
              {load.currentRow?.stage ? ` Aktueller Abschnitt: ${load.currentRow.stage.title}.` : ''}
            </p>
            {load.halfYears.length > 0 && (
              <table className="tabelle">
                <caption className="nur-lesbar">Selbstständiger Unterricht je Halbjahr</caption>
                <thead>
                  <tr>
                    <th scope="col">Ausbildungshalbjahr</th>
                    <th scope="col">Erfasste Wochen</th>
                    <th scope="col">Selbstständiger Unterricht im Durchschnitt</th>
                    <th scope="col">Höchstwert</th>
                  </tr>
                </thead>
                <tbody>
                  {load.halfYears.map((half) => (
                    <tr key={half.halfYear}>
                      <th scope="row">{formatNumber(half.halfYear)}. Halbjahr</th>
                      <td>{formatNumber(half.weeks)}</td>
                      <td>{half.averageIndependent.toLocaleString('de-DE', { maximumFractionDigits: 1 })}</td>
                      <td>{formatNumber(half.maxIndependent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="klein gedaempft">Noch keine Wochen erfasst.</p>
        )}

        <h2>Ausbildungsstunden am Studienseminar</h2>
        {seminar && seminar.count > 0 ? (
          <>
            <p className="klein">
              {seminar.total.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Stunden aus{' '}
              {formatNumber(seminar.count)} Veranstaltungen
              {seminar.required ? ` von mindestens ${formatNumber(seminar.required)} Stunden` : ''}.
            </p>
            <table className="tabelle">
              <caption className="nur-lesbar">Ausbildungsstunden nach Art</caption>
              <thead>
                <tr>
                  <th scope="col">Art</th>
                  <th scope="col">Termine</th>
                  <th scope="col">Stunden</th>
                </tr>
              </thead>
              <tbody>
                {seminar.byKind.map((entry) => (
                  <tr key={entry.kind}>
                    <th scope="row">{entry.kind}</th>
                    <td>{formatNumber(entry.count)}</td>
                    <td>{entry.hours.toLocaleString('de-DE', { maximumFractionDigits: 1 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="klein gedaempft">Noch keine Veranstaltungen erfasst.</p>
        )}

        {app.documents.length > 0 && (
          <>
            <h2>Unterlagen</h2>
            <table className="tabelle">
              <caption className="nur-lesbar">Unterlagen und Formulare</caption>
              <thead>
                <tr>
                  <th scope="col">Unterlage</th>
                  <th scope="col">Stand</th>
                  <th scope="col">Datum</th>
                </tr>
              </thead>
              <tbody>
                {app.documents.map((record) => (
                  <tr key={record.id}>
                    <th scope="row">
                      {record.code ? `${record.code} – ` : ''}
                      {record.title}
                    </th>
                    <td>{record.status}</td>
                    <td>{record.date ? formatDate(record.date) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {exam.deadlines.length > 0 && (
          <>
            <h2>Prüfungsfahrplan</h2>
            <table className="tabelle">
              <caption className="nur-lesbar">Fristen der Staatsprüfung</caption>
              <thead>
                <tr>
                  <th scope="col">Datum</th>
                  <th scope="col">Frist</th>
                </tr>
              </thead>
              <tbody>
                {exam.deadlines.map((deadline) => (
                  <tr key={deadline.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(deadline.date)}
                      {deadline.time ? ` bis ${deadline.time} Uhr` : ''}
                    </td>
                    <th scope="row">{deadline.title}</th>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {app.settings.printGrades && grades.complete && (
          <>
            <h2>Notenübersicht</h2>
            <p className="klein">
              Gesamtpunktzahl {formatNumber(grades.points ?? 0)} Punkte ({grades.gradeLabel}), ungerundet{' '}
              {formatPoints(grades.raw ?? 0)}. Verbindlich ist die Festsetzung durch das Prüfungsamt.
            </p>
          </>
        )}

        <p className="klein gedaempft" style={{ marginTop: 24 }}>
          Grundlage: {template.title} ({template.version}, {template.validAsOf}).
          {template.demo &&
            ' Die mitgelieferten Inhalte sind Demodaten und stellen keine rechtlich verbindliche Vorgabe dar.'}
          <br />
          {APP_NAME} · Version {APP_VERSION} · © Florian Nowak · Erstellt am {formatDate(app.today)}
        </p>
        <p className="klein gedaempft">
          Persönliche Reflexionen aus dem Boxenstopp sind in dieser Ansicht bewusst nicht enthalten.
          {app.settings.printGrades
            ? ' Die Notenübersicht ist enthalten, weil du das in den Einstellungen ausgewählt hast.'
            : ' Die Notenübersicht ist nicht enthalten; sie lässt sich in den Einstellungen ausdrücklich hinzunehmen.'}
        </p>
      </div>
    </div>
  );
}
