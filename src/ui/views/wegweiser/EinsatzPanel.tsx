/**
 * Unterrichtseinsatz je Woche: Hospitation (H), angeleiteter Unterricht (aU)
 * und selbstständiger Unterricht (sU) im Abgleich mit den Soll-Korridoren der
 * Vorlage.
 */
import { useMemo, useState } from 'react';
import { Info, Pencil, Plus, Timer, Trash2 } from 'lucide-react';
import { Card, Notice } from '../../components/common';
import { useApp } from '../../../state/AppContext';
import { formatDate, formatNumber, mondayOf } from '../../../domain/dates';
import { stageText, summarizeTeachingLoad, teachingWeekId } from '../../../domain/teachingLoad';
import type { TeachingWeekEntry } from '../../../domain/types';

interface Draft {
  weekStart: string;
  hospitation: string;
  guided: string;
  independent: string;
  noSchool: boolean;
  note: string;
}

function emptyDraft(weekStart: string): Draft {
  return { weekStart, hospitation: '', guided: '', independent: '', noSchool: false, note: '' };
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function EinsatzPanel() {
  const app = useApp();
  const profile = app.profile!;
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(mondayOf(app.today)));
  const [message, setMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const summary = useMemo(
    () => summarizeTeachingLoad(app.activeTemplate?.teachingLoad, profile, app.teachingWeeks, app.today),
    [app.activeTemplate, profile, app.teachingWeeks, app.today],
  );

  const model = app.activeTemplate?.teachingLoad ?? null;
  const rows = useMemo(() => [...summary.rows].reverse(), [summary.rows]);
  const visibleRows = showAll ? rows : rows.slice(0, 12);

  const save = async () => {
    const week = mondayOf(draft.weekStart);
    const entry: TeachingWeekEntry = {
      id: teachingWeekId(week),
      weekStart: week,
      hospitation: draft.noSchool ? 0 : toNumber(draft.hospitation),
      guided: draft.noSchool ? 0 : toNumber(draft.guided),
      independent: draft.noSchool ? 0 : toNumber(draft.independent),
      noSchool: draft.noSchool,
      note: draft.note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    await app.saveTeachingWeek(entry);
    setDraft(emptyDraft(mondayOf(app.today)));
    setMessage(`Die Woche ab ${formatDate(week)} wurde gespeichert.`);
  };

  const edit = (entry: TeachingWeekEntry) => {
    setDraft({
      weekStart: entry.weekStart,
      hospitation: String(entry.hospitation),
      guided: String(entry.guided),
      independent: String(entry.independent),
      noSchool: Boolean(entry.noSchool),
      note: entry.note ?? '',
    });
    setMessage(null);
    document.getElementById('einsatz-woche')?.focus();
  };

  return (
    <div className="stapel">
      {!summary.applies && summary.reason && <Notice>{summary.reason}</Notice>}
      {message && <Notice tone="erfolg">{message}</Notice>}

      <Card title="Woche erfassen" icon={<Timer size={18} aria-hidden="true" />} variant="primaer">
        <p className="klein gedaempft">
          Trage die Wochenstunden ein, die tatsächlich auf Hospitation, angeleiteten und selbstständigen
          Unterricht entfallen. Unterrichtsfreie Wochen markierst du als Ferienwoche – sie zählen nicht als
          Unterrichtswoche.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="raster">
            <div className="feld">
              <label htmlFor="einsatz-woche">Woche (Montag)</label>
              <input
                id="einsatz-woche"
                type="date"
                value={draft.weekStart}
                onChange={(event) => event.target.value && setDraft({ ...draft, weekStart: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="einsatz-h">Hospitation (H)</label>
              <input
                id="einsatz-h"
                type="number"
                min={0}
                max={40}
                step={0.5}
                inputMode="decimal"
                value={draft.hospitation}
                disabled={draft.noSchool}
                onChange={(event) => setDraft({ ...draft, hospitation: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="einsatz-au">Angeleiteter Unterricht (aU)</label>
              <input
                id="einsatz-au"
                type="number"
                min={0}
                max={40}
                step={0.5}
                inputMode="decimal"
                value={draft.guided}
                disabled={draft.noSchool}
                onChange={(event) => setDraft({ ...draft, guided: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="einsatz-su">Selbstständiger Unterricht (sU)</label>
              <input
                id="einsatz-su"
                type="number"
                min={0}
                max={40}
                step={0.5}
                inputMode="decimal"
                value={draft.independent}
                disabled={draft.noSchool}
                onChange={(event) => setDraft({ ...draft, independent: event.target.value })}
              />
            </div>
          </div>
          <label className="wahl">
            <input
              type="checkbox"
              checked={draft.noSchool}
              onChange={(event) => setDraft({ ...draft, noSchool: event.target.checked })}
            />
            <span>Ferien oder unterrichtsfreie Woche</span>
          </label>
          <div className="feld">
            <label htmlFor="einsatz-notiz">Notiz (optional)</label>
            <input
              id="einsatz-notiz"
              type="text"
              value={draft.note}
              placeholder="z. B. Vertretung, Projektwoche, Krankheit"
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </div>
          <button type="submit" className="knopf knopf--primaer">
            <Plus size={15} aria-hidden="true" /> Woche speichern
          </button>
        </form>
      </Card>

      {model && summary.applies && (
        <Card title="Soll-Korridore der Vorlage">
          <p className="klein gedaempft">
            {model.title} · Richtwert {formatNumber(model.weeklyTotal)} Wochenstunden insgesamt.
          </p>
          <div className="tabelle__rollbereich">
            <table className="tabelle">
              <caption className="nur-lesbar">Soll-Korridore der Unterrichtsverpflichtung</caption>
              <thead>
                <tr>
                  <th scope="col">Abschnitt</th>
                  <th scope="col">Korridor</th>
                </tr>
              </thead>
              <tbody>
                {model.stages.map((stage) => (
                  <tr
                    key={stage.id}
                    className={summary.currentRow?.stage?.id === stage.id ? 'tabelle__zeile--aktuell' : undefined}
                  >
                    <th scope="row">
                      {stage.title}
                      {summary.currentRow?.stage?.id === stage.id && (
                        <span className="marke marke--aktuell" style={{ marginLeft: 6 }}>
                          aktuell
                        </span>
                      )}
                    </th>
                    <td>
                      {stageText(stage)}
                      {stage.note && <span className="klein gedaempft"> · {stage.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {model.note && (
            <p className="klein gedaempft" style={{ marginTop: 8 }}>
              <Info size={13} aria-hidden="true" /> {model.note}
            </p>
          )}
          {model.source && <p className="klein gedaempft">Quelle: {model.source}</p>}
        </Card>
      )}

      {summary.halfYears.length > 0 && (
        <Card title="Selbstständiger Unterricht je Halbjahr">
          <ul className="stapel stapel--eng" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {summary.halfYears.map((half) => (
              <li key={half.halfYear}>
                <strong>{formatNumber(half.halfYear)}. Ausbildungshalbjahr:</strong>{' '}
                <span className="klein">
                  Durchschnitt {half.averageIndependent.toLocaleString('de-DE', { maximumFractionDigits: 1 })}{' '}
                  Wochenstunden, Höchstwert {formatNumber(half.maxIndependent)} · {formatNumber(half.weeks)} Wochen
                  erfasst
                </span>
                {half.deviations.map((deviation) => (
                  <p className="klein warnhinweis" key={deviation}>
                    {deviation}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <p className="klein gedaempft" style={{ marginTop: 8 }}>
            Ein Ausbildungshalbjahr wird mit sechs Monaten ab Ausbildungsbeginn angesetzt.
          </p>
        </Card>
      )}

      <Card
        title={`Erfasste Wochen (${formatNumber(summary.weeksWithEntry)})`}
        actions={
          summary.weeksWithoutEntry > 0 ? (
            <span className="klein gedaempft">{formatNumber(summary.weeksWithoutEntry)} Wochen ohne Eintrag</span>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <p className="klein gedaempft">Noch keine Woche erfasst.</p>
        ) : (
          <div className="tabelle__rollbereich">
            <table className="tabelle">
              <caption className="nur-lesbar">Unterrichtseinsatz je Woche</caption>
              <thead>
                <tr>
                  <th scope="col">Woche</th>
                  <th scope="col">UW</th>
                  <th scope="col">H</th>
                  <th scope="col">aU</th>
                  <th scope="col">sU</th>
                  <th scope="col">Summe</th>
                  <th scope="col">Korridor und Abweichung</th>
                  <th scope="col">
                    <span className="nur-lesbar">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.weekStart} className={row.isCurrent ? 'tabelle__zeile--aktuell' : undefined}>
                    <th scope="row" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(row.weekStart)}
                      {row.isCurrent && <span className="klein gedaempft"> (laufend)</span>}
                    </th>
                    <td>{row.teachingWeek === null ? '–' : formatNumber(row.teachingWeek)}</td>
                    <td>{row.entry ? formatNumber(row.entry.hospitation) : '–'}</td>
                    <td>{row.entry ? formatNumber(row.entry.guided) : '–'}</td>
                    <td>{row.entry ? formatNumber(row.entry.independent) : '–'}</td>
                    <td>{row.entry ? formatNumber(row.total) : '–'}</td>
                    <td>
                      {row.entry?.noSchool ? (
                        <span className="klein gedaempft">Ferien oder unterrichtsfrei</span>
                      ) : (
                        <>
                          {row.stage && <span className="klein gedaempft">{row.stage.title}</span>}
                          {row.deviations.map((deviation) => (
                            <p className="klein warnhinweis" key={deviation} style={{ margin: '4px 0 0' }}>
                              {deviation}
                            </p>
                          ))}
                          {row.entry?.note && <p className="klein" style={{ margin: '4px 0 0' }}>{row.entry.note}</p>}
                        </>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {row.entry ? (
                        <>
                          <button
                            type="button"
                            className="knopf knopf--klein knopf--schlicht"
                            onClick={() => edit(row.entry!)}
                          >
                            <Pencil size={13} aria-hidden="true" /> Ändern
                          </button>
                          <button
                            type="button"
                            className="knopf knopf--klein knopf--schlicht"
                            onClick={() => app.removeTeachingWeek(row.entry!.id)}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                            <span className="nur-lesbar">Eintrag der Woche {formatDate(row.weekStart)} löschen</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="knopf knopf--klein knopf--schlicht"
                          onClick={() => {
                            setDraft(emptyDraft(row.weekStart));
                            document.getElementById('einsatz-woche')?.focus();
                          }}
                        >
                          <Plus size={13} aria-hidden="true" /> Erfassen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 12 && (
          <button type="button" className="knopf knopf--klein" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Nur die letzten zwölf Wochen zeigen' : `Alle ${formatNumber(rows.length)} Wochen zeigen`}
          </button>
        )}
        <p className="klein gedaempft" style={{ marginTop: 8 }}>
          UW = Unterrichtswoche. Summen: Hospitation {formatNumber(summary.totals.hospitation)}, angeleiteter
          Unterricht {formatNumber(summary.totals.guided)}, selbstständiger Unterricht{' '}
          {formatNumber(summary.totals.independent)} Wochenstunden.
        </p>
      </Card>
    </div>
  );
}
