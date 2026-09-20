/**
 * Unterlagen und Formulare. Die Vorlage schlägt anhand ihrer Formularsätze
 * vor, was zu einem Termin gehört; übernommen wird nur, was ausgewählt wird.
 */
import { useMemo, useState } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, Notice } from '../../components/common';
import { useApp } from '../../../state/AppContext';
import { formatDate, formatNumber } from '../../../domain/dates';
import { documentFromSuggestion, summarizeDocuments } from '../../../domain/documents';
import { effectiveStart } from '../../../domain/schedule';
import { DOCUMENT_STATUSES } from '../../../domain/types';
import type { DocumentRecord, DocumentStatus } from '../../../domain/types';

interface Draft {
  id: string | null;
  title: string;
  code: string;
  milestoneId: string;
  status: DocumentStatus;
  date: string;
  responsible: string;
  note: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  code: '',
  milestoneId: '',
  status: 'benötigt',
  date: '',
  responsible: '',
  note: '',
};

export function UnterlagenPanel() {
  const app = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(
    () => summarizeDocuments(app.activeTemplate, app.milestones, app.documents, app.today),
    [app.activeTemplate, app.milestones, app.documents, app.today],
  );

  const milestones = useMemo(
    () => [...app.milestones].sort((a, b) => (effectiveStart(a) < effectiveStart(b) ? -1 : 1)),
    [app.milestones],
  );

  const sorted = useMemo(
    () =>
      [...app.documents].sort((a, b) => {
        const order: Record<DocumentStatus, number> = { benötigt: 0, 'in Arbeit': 1, vorhanden: 2, abgegeben: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.title.localeCompare(b.title, 'de');
      }),
    [app.documents],
  );

  const save = async () => {
    if (!draft.title.trim()) return;
    const record: DocumentRecord = {
      id: draft.id ?? `unterlage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title: draft.title.trim(),
      code: draft.code.trim() || undefined,
      milestoneId: draft.milestoneId || undefined,
      status: draft.status,
      date: draft.date || undefined,
      responsible: draft.responsible.trim() || undefined,
      note: draft.note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    await app.saveDocument(record);
    setDraft(EMPTY_DRAFT);
    setMessage(`„${record.title}“ wurde gespeichert.`);
  };

  const titleOf = (milestoneId?: string) =>
    milestoneId ? (app.milestones.find((m) => m.id === milestoneId)?.title ?? 'Termin nicht gefunden') : null;

  return (
    <div className="stapel">
      {message && <Notice tone="erfolg">{message}</Notice>}

      {summary.suggestions.length > 0 && (
        <Card title="Vorschläge aus der Vorlage" icon={<FileText size={18} aria-hidden="true" />} variant="akzent">
          <p className="klein gedaempft">
            Diese Formulare gehören laut Vorlage zu Terminen deiner Strecke und sind noch nicht in deinem Bestand.
            Übernimm nur, was für dich zutrifft.
          </p>
          <ul className="stapel stapel--eng" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {summary.suggestions.slice(0, 12).map((suggestion) => (
              <li key={suggestion.id} className="vorschlag">
                <div>
                  <strong>
                    {suggestion.code ? `${suggestion.code} – ` : ''}
                    {suggestion.title}
                  </strong>
                  <span className="klein gedaempft">
                    {' '}
                    · {suggestion.milestoneTitle} ({formatDate(suggestion.milestoneStart)})
                  </span>
                  {suggestion.responsible && (
                    <p className="klein gedaempft" style={{ margin: 0 }}>
                      Zuständig: {suggestion.responsible}
                    </p>
                  )}
                  {suggestion.note && (
                    <p className="klein" style={{ margin: 0 }}>
                      {suggestion.note}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="knopf knopf--klein"
                  onClick={async () => {
                    await app.saveDocument(documentFromSuggestion(suggestion));
                    setMessage(`„${suggestion.title}“ wurde übernommen.`);
                  }}
                >
                  <Plus size={13} aria-hidden="true" /> Übernehmen
                </button>
              </li>
            ))}
          </ul>
          {summary.suggestions.length > 12 && (
            <p className="klein gedaempft">
              Weitere {formatNumber(summary.suggestions.length - 12)} Vorschläge erscheinen, sobald die zugehörigen
              Termine näher rücken.
            </p>
          )}
        </Card>
      )}

      <Card title={draft.id ? 'Unterlage ändern' : 'Unterlage aufnehmen'}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="raster">
            <div className="feld">
              <label htmlFor="unterlage-titel">Bezeichnung</label>
              <input
                id="unterlage-titel"
                type="text"
                value={draft.title}
                placeholder="z. B. Niederschrift der Lehrprobe"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                required
              />
            </div>
            <div className="feld">
              <label htmlFor="unterlage-kennung">Formularkennung (optional)</label>
              <input
                id="unterlage-kennung"
                type="text"
                value={draft.code}
                placeholder="z. B. F220"
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="unterlage-status">Stand</label>
              <select
                id="unterlage-status"
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as DocumentStatus })}
              >
                {DOCUMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="unterlage-datum">Datum (optional)</label>
              <input
                id="unterlage-datum"
                type="date"
                value={draft.date}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="unterlage-termin">Bezug zu einem Termin (optional)</label>
              <select
                id="unterlage-termin"
                value={draft.milestoneId}
                onChange={(event) => setDraft({ ...draft, milestoneId: event.target.value })}
              >
                <option value="">Ohne Bezug</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title} ({formatDate(effectiveStart(milestone))})
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="unterlage-zustaendig">Zuständig (optional)</label>
              <input
                id="unterlage-zustaendig"
                type="text"
                value={draft.responsible}
                onChange={(event) => setDraft({ ...draft, responsible: event.target.value })}
              />
            </div>
          </div>
          <div className="feld">
            <label htmlFor="unterlage-notiz">Notiz (optional)</label>
            <input
              id="unterlage-notiz"
              type="text"
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </div>
          <div className="reihe">
            <button type="submit" className="knopf knopf--primaer">
              <Plus size={15} aria-hidden="true" /> {draft.id ? 'Änderung speichern' : 'Unterlage aufnehmen'}
            </button>
            {draft.id && (
              <button type="button" className="knopf" onClick={() => setDraft(EMPTY_DRAFT)}>
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card
        title={`Eigener Bestand (${formatNumber(summary.total)})`}
        actions={
          summary.total > 0 ? (
            <span className="klein gedaempft">
              {formatNumber(summary.byStatus['abgegeben'])} abgegeben ·{' '}
              {formatNumber(summary.byStatus['vorhanden'])} vorhanden ·{' '}
              {formatNumber(summary.byStatus['benötigt'] + summary.byStatus['in Arbeit'])} offen
            </span>
          ) : null
        }
      >
        {sorted.length === 0 ? (
          <p className="klein gedaempft">Noch keine Unterlage erfasst.</p>
        ) : (
          <div className="tabelle__rollbereich">
            <table className="tabelle">
              <caption className="nur-lesbar">Unterlagen und Formulare</caption>
              <thead>
                <tr>
                  <th scope="col">Unterlage</th>
                  <th scope="col">Bezug</th>
                  <th scope="col">Stand</th>
                  <th scope="col">Datum</th>
                  <th scope="col">
                    <span className="nur-lesbar">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>
                        {record.code ? `${record.code} – ` : ''}
                        {record.title}
                      </strong>
                      {record.responsible && (
                        <span className="klein gedaempft"> · zuständig: {record.responsible}</span>
                      )}
                      {record.note && <p className="klein" style={{ margin: '2px 0 0' }}>{record.note}</p>}
                    </td>
                    <td className="klein">{titleOf(record.milestoneId) ?? '–'}</td>
                    <td>
                      <label className="nur-lesbar" htmlFor={`stand-${record.id}`}>
                        Stand von {record.title}
                      </label>
                      <select
                        id={`stand-${record.id}`}
                        value={record.status}
                        onChange={(event) =>
                          app.saveDocument({ ...record, status: event.target.value as DocumentStatus })
                        }
                      >
                        {DOCUMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{record.date ? formatDate(record.date) : '–'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="knopf knopf--klein knopf--schlicht"
                        onClick={() => {
                          setDraft({
                            id: record.id,
                            title: record.title,
                            code: record.code ?? '',
                            milestoneId: record.milestoneId ?? '',
                            status: record.status,
                            date: record.date ?? '',
                            responsible: record.responsible ?? '',
                            note: record.note ?? '',
                          });
                          setMessage(null);
                          document.getElementById('unterlage-titel')?.focus();
                        }}
                      >
                        <Pencil size={13} aria-hidden="true" /> Ändern
                      </button>
                      <button
                        type="button"
                        className="knopf knopf--klein knopf--schlicht"
                        onClick={() => app.removeDocument(record.id)}
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
      </Card>
    </div>
  );
}
