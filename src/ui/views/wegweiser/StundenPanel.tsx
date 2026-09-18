/**
 * Ausbildungsstunden am Studienseminar: Nachweis der Veranstaltungen in
 * Stunden à 60 Minuten mit Abgleich gegen den Mindestumfang der Vorlage.
 */
import { useMemo, useState } from 'react';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, Notice, ProgressBar } from '../../components/common';
import { useApp } from '../../../state/AppContext';
import { formatDate, formatNumber } from '../../../domain/dates';
import { summarizeSeminarHours } from '../../../domain/seminarHours';
import { SEMINAR_KINDS } from '../../../domain/types';
import type { SeminarKind, SeminarRecord } from '../../../domain/types';

interface Draft {
  id: string | null;
  date: string;
  kind: SeminarKind;
  title: string;
  subject: string;
  hours: string;
  place: string;
  note: string;
}

function emptyDraft(today: string): Draft {
  return { id: null, date: today, kind: 'Fachseminar', title: '', subject: '', hours: '', place: '', note: '' };
}

function formatHours(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

export function StundenPanel() {
  const app = useApp();
  const profile = app.profile!;
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(app.today));
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(
    () =>
      summarizeSeminarHours(
        app.seminarRecords,
        app.activeTemplate?.seminarRequirements,
        profile,
        app.today,
      ),
    [app.seminarRecords, app.activeTemplate, profile, app.today],
  );

  const sorted = useMemo(
    () => [...app.seminarRecords].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [app.seminarRecords],
  );

  const save = async () => {
    const hours = Number(draft.hours.replace(',', '.'));
    if (!draft.title.trim() || !Number.isFinite(hours) || hours <= 0) return;
    const record: SeminarRecord = {
      id: draft.id ?? `stunden-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      date: draft.date,
      kind: draft.kind,
      title: draft.title.trim(),
      subject: draft.subject.trim() || undefined,
      hours,
      place: draft.place.trim() || undefined,
      note: draft.note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    await app.saveSeminarRecord(record);
    setDraft(emptyDraft(app.today));
    setMessage(`„${record.title}“ wurde mit ${formatHours(record.hours)} Stunden gespeichert.`);
  };

  return (
    <div className="stapel">
      {message && <Notice tone="erfolg">{message}</Notice>}

      <Card title="Stand des Nachweises" icon={<ClipboardList size={18} aria-hidden="true" />} variant="primaer">
        {summary.required === null ? (
          <p className="klein gedaempft">
            Für diese Vorlage ist kein Mindestumfang hinterlegt. Erfasste Stunden insgesamt:{' '}
            {formatHours(summary.total)}.
          </p>
        ) : (
          <>
            <ProgressBar
              label="Erfasste Ausbildungsstunden"
              value={summary.fraction}
              description={`${formatHours(summary.total)} von mindestens ${formatNumber(
                summary.required,
              )} Stunden à 60 Minuten. Dem bisherigen Ausbildungszeitraum entspräche ein Umfang von etwa ${formatNumber(
                summary.expectedByNow ?? 0,
              )} Stunden.`}
            />
            {summary.behindBy > 0 && (
              <p className="klein warnhinweis">
                Gegenüber dem zeitlichen Anteil fehlen {formatHours(summary.behindBy)} Stunden. Prüfe, ob
                Veranstaltungen noch nachzutragen sind.
              </p>
            )}
            {summary.remaining !== null && summary.remaining > 0 && (
              <p className="klein gedaempft">Bis zum Mindestumfang fehlen {formatHours(summary.remaining)} Stunden.</p>
            )}
          </>
        )}
        {summary.byKind.length > 0 && (
          <ul className="klein" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            {summary.byKind.map((entry) => (
              <li key={entry.kind}>
                {entry.kind}: {formatHours(entry.hours)} Stunden ({formatNumber(entry.count)} Termine)
              </li>
            ))}
          </ul>
        )}
        {summary.bySubject.length > 0 && (
          <p className="klein gedaempft" style={{ marginTop: 8 }}>
            Nach Fach:{' '}
            {summary.bySubject.map((entry) => `${entry.subject} ${formatHours(entry.hours)} Stunden`).join(' · ')}
          </p>
        )}
      </Card>

      <Card title={draft.id ? 'Veranstaltung ändern' : 'Veranstaltung erfassen'}>
        <p className="klein gedaempft">
          Einführungsveranstaltungen, Allgemeines Seminar, Fachseminare, Lehrprobenauswertungen, Hospitationen,
          Beratungsgespräche und Projekte zählen zum Nachweis.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="raster">
            <div className="feld">
              <label htmlFor="stunden-datum">Datum</label>
              <input
                id="stunden-datum"
                type="date"
                value={draft.date}
                onChange={(event) => event.target.value && setDraft({ ...draft, date: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="stunden-art">Art</label>
              <select
                id="stunden-art"
                value={draft.kind}
                onChange={(event) => setDraft({ ...draft, kind: event.target.value as SeminarKind })}
              >
                {SEMINAR_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="stunden-umfang">Umfang in Stunden (60 Minuten)</label>
              <input
                id="stunden-umfang"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                inputMode="decimal"
                value={draft.hours}
                onChange={(event) => setDraft({ ...draft, hours: event.target.value })}
                required
              />
            </div>
            <div className="feld">
              <label htmlFor="stunden-fach">Fach (optional)</label>
              <input
                id="stunden-fach"
                type="text"
                list="stunden-faecher"
                value={draft.subject}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
              />
              <datalist id="stunden-faecher">
                {profile.subjects.map((subject) => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="feld">
            <label htmlFor="stunden-titel">Bezeichnung</label>
            <input
              id="stunden-titel"
              type="text"
              value={draft.title}
              placeholder="z. B. Fachseminar Deutsch: Leistungsbewertung"
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              required
            />
          </div>
          <div className="raster">
            <div className="feld">
              <label htmlFor="stunden-ort">Ort (optional)</label>
              <input
                id="stunden-ort"
                type="text"
                value={draft.place}
                placeholder="z. B. Regionalstelle Gera"
                onChange={(event) => setDraft({ ...draft, place: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="stunden-notiz">Notiz (optional)</label>
              <input
                id="stunden-notiz"
                type="text"
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
            </div>
          </div>
          <div className="reihe">
            <button type="submit" className="knopf knopf--primaer">
              <Plus size={15} aria-hidden="true" /> {draft.id ? 'Änderung speichern' : 'Veranstaltung speichern'}
            </button>
            {draft.id && (
              <button type="button" className="knopf" onClick={() => setDraft(emptyDraft(app.today))}>
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title={`Erfasste Veranstaltungen (${formatNumber(summary.count)})`}>
        {sorted.length === 0 ? (
          <p className="klein gedaempft">Noch keine Veranstaltung erfasst.</p>
        ) : (
          <div className="tabelle__rollbereich">
            <table className="tabelle">
              <caption className="nur-lesbar">Nachweis der Ausbildungsstunden</caption>
              <thead>
                <tr>
                  <th scope="col">Datum</th>
                  <th scope="col">Art</th>
                  <th scope="col">Bezeichnung</th>
                  <th scope="col">Stunden</th>
                  <th scope="col">
                    <span className="nur-lesbar">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((record) => (
                  <tr key={record.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(record.date)}</td>
                    <td>{record.kind}</td>
                    <td>
                      <strong>{record.title}</strong>
                      {record.subject && <span className="klein gedaempft"> · {record.subject}</span>}
                      {record.place && <span className="klein gedaempft"> · {record.place}</span>}
                      {record.note && <p className="klein" style={{ margin: '2px 0 0' }}>{record.note}</p>}
                    </td>
                    <td>{formatHours(record.hours)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="knopf knopf--klein knopf--schlicht"
                        onClick={() => {
                          setDraft({
                            id: record.id,
                            date: record.date,
                            kind: record.kind,
                            title: record.title,
                            subject: record.subject ?? '',
                            hours: String(record.hours),
                            place: record.place ?? '',
                            note: record.note ?? '',
                          });
                          setMessage(null);
                          document.getElementById('stunden-datum')?.focus();
                        }}
                      >
                        <Pencil size={13} aria-hidden="true" /> Ändern
                      </button>
                      <button
                        type="button"
                        className="knopf knopf--klein knopf--schlicht"
                        onClick={() => app.removeSeminarRecord(record.id)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        <span className="nur-lesbar">„{record.title}“ löschen</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {summary.daysSinceLast !== null && summary.daysSinceLast > 30 && (
          <p className="klein gedaempft" style={{ marginTop: 8 }}>
            Der letzte Eintrag liegt {formatNumber(summary.daysSinceLast)} Tage zurück.
          </p>
        )}
      </Card>
    </div>
  );
}
