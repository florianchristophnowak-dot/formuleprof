/**
 * Prüfungsfahrplan: eigene Angaben zu den beiden Prüfungstagen. Daraus
 * berechnet FormuleProf Themenbekanntgabe, Abgabe der Entwürfe und den
 * letzten Unterrichtstag.
 */
import { useMemo } from 'react';
import { CalendarClock, Download, Info } from 'lucide-react';
import { Card, Notice, downloadFile } from '../../components/common';
import { useApp } from '../../../state/AppContext';
import { formatCountdown, formatDate, formatNumber } from '../../../domain/dates';
import { modeLabel, summarizeExamPlan } from '../../../domain/examDeadlines';
import { daysUntilDeadline } from '../../../domain/examDeadlines';
import { buildDeadlineIcs } from '../../../io/ics';
import { EXAM_MODES } from '../../../domain/types';
import type { ExamMode } from '../../../domain/types';

export function PruefungPanel() {
  const app = useApp();
  const model = app.activeTemplate?.examDeadlines;
  const plan = app.examPlan;

  const summary = useMemo(() => summarizeExamPlan(plan, model, app.today), [plan, model, app.today]);

  return (
    <div className="stapel">
      <Card title="Ablauf und Prüfungstage" icon={<CalendarClock size={18} aria-hidden="true" />} variant="primaer">
        <p className="klein gedaempft">
          Die Prüfung findet an zwei Prüfungstagen statt. Trage die Ablaufform aus deiner Ladung ein – davon
          hängt ab, wie viele Werktage vorher die Themen bekannt gegeben werden.
        </p>
        <fieldset className="feldgruppe">
          <legend>Ablaufform</legend>
          {EXAM_MODES.map((mode) => (
            <label className="wahl" key={mode}>
              <input
                type="radio"
                name="pruefungsmodus"
                checked={plan?.mode === mode}
                onChange={() => app.saveExamPlan({ mode })}
              />
              <span>
                {modeLabel(mode)}
                {model && (
                  <span className="klein gedaempft">
                    {' '}
                    · Themenbekanntgabe {formatNumber(model.announcementWorkdays[mode as ExamMode])} Werktage vorher
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="raster">
          <div className="feld">
            <label htmlFor="pruefung-tag1">Erster Prüfungstag</label>
            <input
              id="pruefung-tag1"
              type="date"
              value={plan?.firstDay ?? ''}
              onChange={(event) => app.saveExamPlan({ firstDay: event.target.value || undefined })}
            />
          </div>
          <div className="feld">
            <label htmlFor="pruefung-tag1-text">Inhalt des ersten Tages (optional)</label>
            <input
              id="pruefung-tag1-text"
              type="text"
              value={plan?.firstDayLabel ?? ''}
              placeholder="z. B. Prüfungslehrproben Deutsch und Geschichte"
              onChange={(event) => app.saveExamPlan({ firstDayLabel: event.target.value })}
            />
          </div>
          <div className="feld">
            <label htmlFor="pruefung-tag2">Zweiter Prüfungstag</label>
            <input
              id="pruefung-tag2"
              type="date"
              value={plan?.secondDay ?? ''}
              onChange={(event) => app.saveExamPlan({ secondDay: event.target.value || undefined })}
            />
          </div>
          <div className="feld">
            <label htmlFor="pruefung-tag2-text">Inhalt des zweiten Tages (optional)</label>
            <input
              id="pruefung-tag2-text"
              type="text"
              value={plan?.secondDayLabel ?? ''}
              placeholder="z. B. mündliche Prüfung"
              onChange={(event) => app.saveExamPlan({ secondDayLabel: event.target.value })}
            />
          </div>
        </div>

        <label className="wahl">
          <input
            type="checkbox"
            checked={Boolean(plan?.releaseRequested)}
            onChange={(event) => app.saveExamPlan({ releaseRequested: event.target.checked })}
          />
          <span>Freistellung vom Unterricht für den letzten Unterrichtstag ist beantragt</span>
        </label>

        <div className="feld">
          <label htmlFor="pruefung-notiz">Notizen zur Prüfung (optional)</label>
          <textarea
            id="pruefung-notiz"
            value={plan?.note ?? ''}
            onChange={(event) => app.saveExamPlan({ note: event.target.value })}
          />
        </div>
      </Card>

      {summary.missing.length > 0 && (
        <Notice>
          <strong>Noch offen:</strong>
          <ul className="klein" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {summary.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Notice>
      )}

      <Card
        title="Berechnete Fristen"
        actions={
          summary.deadlines.length > 0 ? (
            <button
              type="button"
              className="knopf knopf--klein"
              onClick={() =>
                downloadFile('formuleprof-pruefungsfristen.ics', buildDeadlineIcs(summary.deadlines), 'text/calendar')
              }
            >
              <Download size={14} aria-hidden="true" /> Fristen als .ics
            </button>
          ) : null
        }
      >
        {summary.deadlines.length === 0 ? (
          <p className="klein gedaempft">
            Sobald Ablaufform und Prüfungstage eingetragen sind, erscheinen hier die Fristen.
          </p>
        ) : (
          <div className="tabelle__rollbereich">
            <table className="tabelle">
              <caption className="nur-lesbar">Fristen der Staatsprüfung</caption>
              <thead>
                <tr>
                  <th scope="col">Datum</th>
                  <th scope="col">Frist</th>
                  <th scope="col">Erläuterung</th>
                </tr>
              </thead>
              <tbody>
                {summary.deadlines.map((deadline) => {
                  const days = daysUntilDeadline(deadline, app.today);
                  return (
                    <tr key={deadline.id} className={days < 0 ? 'tabelle__zeile--vergangen' : undefined}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(deadline.date)}
                        {deadline.time && <span className="klein gedaempft"> bis {deadline.time} Uhr</span>}
                        <br />
                        <span className="klein gedaempft">{formatCountdown(days)}</span>
                      </td>
                      <th scope="row">{deadline.title}</th>
                      <td className="klein">{deadline.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {model && (
          <p className="klein gedaempft" style={{ marginTop: 10 }}>
            <Info size={13} aria-hidden="true" /> Samstage zählen nicht als Werktage.
            {model.draftFormat ? ` ${model.draftFormat}` : ''}
            {model.source ? ` Quelle: ${model.source}` : ''}
          </p>
        )}
        <p className="klein gedaempft">
          Die Fristen sind berechnet und nicht gespeichert. Verbindlich sind die Mitteilungen des Prüfungsamts.
        </p>
      </Card>
    </div>
  );
}
