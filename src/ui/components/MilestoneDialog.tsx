/** Detailansicht eines Meilensteins mit allen persönlichen Angaben. */
import { useMemo, useState } from 'react';
import { CalendarDays, Download, FileText, Info, Link2, ListChecks, NotebookPen, Plus, Target, Trash2 } from 'lucide-react';
import { Dialog, StateBadge, downloadFile } from './common';
import { useApp } from '../../state/AppContext';
import { effectiveEnd, effectiveStart, trackStateOf } from '../../domain/schedule';
import { daysBetween, formatCountdown, formatDate, formatRange } from '../../domain/dates';
import { collectFormSuggestions, documentFromSuggestion } from '../../domain/documents';
import { buildIcs, icsFileName } from '../../io/ics';
import { hrefWithParam } from '../router';
import type { MilestoneInstance, MilestoneStatus } from '../../domain/types';
import { MILESTONE_STATUSES } from '../../domain/types';

export function MilestoneDialog({
  milestone,
  onClose,
  onSuggestPitStop,
}: {
  milestone: MilestoneInstance;
  onClose: () => void;
  onSuggestPitStop?: (milestone: MilestoneInstance) => void;
}) {
  const app = useApp();
  const { today, milestones, updateMilestone, changeMilestoneDate } = app;
  const [dateDraft, setDateDraft] = useState(effectiveStart(milestone));
  const [dateInfo, setDateInfo] = useState<string | null>(null);

  const start = effectiveStart(milestone);
  const end = effectiveEnd(milestone);
  const state = trackStateOf(milestone, today);
  const days = daysBetween(today, start);
  const prerequisites = milestone.prerequisites
    .map((id) => milestones.find((m) => m.definitionId === id))
    .filter((m): m is MilestoneInstance => Boolean(m));

  const setStatus = async (status: MilestoneStatus) => {
    await updateMilestone(milestone.id, { status });
    if (status === 'erledigt' && onSuggestPitStop && isReflectionRelevant(milestone)) {
      onSuggestPitStop(milestone);
    }
  };

  const applyDate = async () => {
    await changeMilestoneDate(milestone.id, dateDraft);
    setDateInfo(
      'Der Termin wurde als eigener Termin gespeichert. Abhängige Termine wurden neu berechnet, dieser Termin bleibt unverändert.',
    );
  };

  const resetDate = async () => {
    await changeMilestoneDate(milestone.id, null);
    setDateInfo('Der Termin folgt wieder der Terminregel der Vorlage.');
  };

  // Unterlagen dieses Termins: eigener Bestand und Vorschläge der Vorlage.
  const documents = useMemo(
    () => app.documents.filter((record) => record.milestoneId === milestone.id),
    [app.documents, milestone.id],
  );
  const suggestions = useMemo(
    () =>
      collectFormSuggestions(app.activeTemplate, [milestone]).filter(
        (suggestion) =>
          !documents.some((record) =>
            suggestion.code && record.code ? record.code === suggestion.code : record.title === suggestion.title,
          ),
      ),
    [app.activeTemplate, milestone, documents],
  );

  return (
    <Dialog title={milestone.title} onClose={onClose}>
      <div className="reihe" style={{ marginBottom: 12 }}>
        <StateBadge state={state} />
        <span className="marke">{milestone.category}</span>
        {milestone.mandatory && <span className="marke">verbindlich</span>}
        {milestone.manualStart && <span className="marke">eigener Termin</span>}
        {milestone.agreed && <span className="marke">vereinbart</span>}
        {milestone.custom && <span className="marke">selbst angelegt</span>}
      </div>

      <p>{milestone.description}</p>

      <dl className="zusammenfassung">
        <dt>
          <CalendarDays size={14} aria-hidden="true" /> {milestone.isWindow ? 'Zeitfenster' : 'Termin'}
        </dt>
        <dd>
          {formatRange(start, end)} <span className="gedaempft">({formatCountdown(days)})</span>
        </dd>

        <dt>Bedeutung</dt>
        <dd>{milestone.help || 'Keine weiteren Hinweise hinterlegt.'}</dd>

        <dt>Empfohlener Vorlauf</dt>
        <dd>
          {milestone.leadTimeDays} Tage – Vorbereitung ab{' '}
          {formatDate(shift(start, -milestone.leadTimeDays))}
        </dd>

        <dt>
          <Link2 size={14} aria-hidden="true" /> Voraussetzungen
        </dt>
        <dd>
          {prerequisites.length === 0
            ? 'Keine'
            : prerequisites.map((p) => `${p.title} (${p.status})`).join(', ')}
        </dd>

        {milestone.previousStart && (
          <>
            <dt>Streckenänderung</dt>
            <dd>Ursprünglich geplant für den {formatDate(milestone.previousStart)}.</dd>
          </>
        )}

        {milestone.source && (
          <>
            <dt>Quelle</dt>
            <dd className="klein gedaempft">{milestone.source}</dd>
          </>
        )}
      </dl>

      <fieldset className="feldgruppe">
        <legend>
          <ListChecks size={14} aria-hidden="true" /> Checkliste
        </legend>
        {milestone.checklist.length === 0 && <p className="klein gedaempft">Keine Checkliste hinterlegt.</p>}
        {milestone.checklist.map((item) => (
          <label className="wahl" key={item.id}>
            <input
              type="checkbox"
              checked={item.done}
              onChange={(event) =>
                updateMilestone(milestone.id, {
                  checklist: milestone.checklist.map((entry) =>
                    entry.id === item.id ? { ...entry, done: event.target.checked } : entry,
                  ),
                })
              }
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="feld">
        <label htmlFor={`status-${milestone.id}`}>Status</label>
        <select
          id={`status-${milestone.id}`}
          value={milestone.status}
          onChange={(event) => setStatus(event.target.value as MilestoneStatus)}
        >
          {MILESTONE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {(milestone.category === 'Unterrichtsbesuch' || milestone.category === 'Lehrprobe') && (
        <div className="feld">
          <label htmlFor={`schwerpunkt-${milestone.id}`}>
            <Target size={14} aria-hidden="true" /> Beobachtungsschwerpunkt
          </label>
          <span className="feld__hinweis" id={`schwerpunkt-${milestone.id}-hinweis`}>
            Woran soll bei diesem Besuch besonders geschaut werden?
          </span>
          <input
            id={`schwerpunkt-${milestone.id}`}
            aria-describedby={`schwerpunkt-${milestone.id}-hinweis`}
            type="text"
            value={milestone.observationFocus ?? ''}
            onChange={(event) => updateMilestone(milestone.id, { observationFocus: event.target.value })}
          />
        </div>
      )}

      {(documents.length > 0 || suggestions.length > 0) && (
        <fieldset className="feldgruppe">
          <legend>
            <FileText size={14} aria-hidden="true" /> Unterlagen
          </legend>
          {documents.length > 0 && (
            <ul className="klein" style={{ margin: '0 0 8px', paddingLeft: 18 }}>
              {documents.map((record) => (
                <li key={record.id}>
                  {record.code ? `${record.code} – ` : ''}
                  {record.title} · {record.status}
                </li>
              ))}
            </ul>
          )}
          {suggestions.map((suggestion) => (
            <div className="reihe" key={suggestion.id} style={{ marginBottom: 6 }}>
              <span className="klein" style={{ flex: 1 }}>
                {suggestion.code ? `${suggestion.code} – ` : ''}
                {suggestion.title}
                {suggestion.responsible ? ` (${suggestion.responsible})` : ''}
              </span>
              <button
                type="button"
                className="knopf knopf--klein"
                onClick={() => app.saveDocument(documentFromSuggestion(suggestion))}
              >
                <Plus size={13} aria-hidden="true" /> In den Wegweiser
              </button>
            </div>
          ))}
          <a className="klein" href={hrefWithParam('wegweiser', 'bereich', 'unterlagen')}>
            Alle Unterlagen im Wegweiser
          </a>
        </fieldset>
      )}

      <div className="feld">
        <label htmlFor={`notiz-${milestone.id}`}>
          <NotebookPen size={14} aria-hidden="true" /> Persönliche Notizen
        </label>
        <textarea
          id={`notiz-${milestone.id}`}
          value={milestone.notes}
          onChange={(event) => updateMilestone(milestone.id, { notes: event.target.value })}
        />
      </div>

      <fieldset className="feldgruppe">
        <legend>Termin anpassen</legend>
        <p className="klein gedaempft">
          Ein eigener Termin wird bei späteren Neuberechnungen nicht mehr verändert. Termine, die auf diesen
          Meilenstein aufbauen, werden automatisch angepasst.
        </p>
        <div className="reihe">
          <label className="nur-lesbar" htmlFor={`termin-${milestone.id}`}>
            Eigener Termin
          </label>
          <input
            id={`termin-${milestone.id}`}
            type="date"
            value={dateDraft}
            onChange={(event) => setDateDraft(event.target.value)}
            style={{ maxWidth: 200 }}
          />
          <button type="button" className="knopf knopf--primaer knopf--klein" onClick={applyDate}>
            Termin übernehmen
          </button>
          {milestone.manualStart && (
            <button type="button" className="knopf knopf--klein" onClick={resetDate}>
              Auf Vorlage zurücksetzen
            </button>
          )}
        </div>
        {dateInfo && (
          <p className="klein" role="status" style={{ marginTop: 8 }}>
            <Info size={13} aria-hidden="true" /> {dateInfo}
          </p>
        )}
      </fieldset>

      <div className="reihe">
        <button
          type="button"
          className="knopf knopf--klein"
          onClick={() => downloadFile(icsFileName(milestone), buildIcs([milestone]), 'text/calendar')}
        >
          <Download size={15} aria-hidden="true" /> Termin als .ics sichern
        </button>
        {onSuggestPitStop && isReflectionRelevant(milestone) && (
          <button type="button" className="knopf knopf--klein" onClick={() => onSuggestPitStop(milestone)}>
            Boxenstopp zu diesem Termin
          </button>
        )}
        {milestone.custom && (
          <button
            type="button"
            className="knopf knopf--klein knopf--gefahr"
            onClick={async () => {
              if (window.confirm(`Den selbst angelegten Termin „${milestone.title}“ löschen?`)) {
                await app.removeMilestone(milestone.id);
                onClose();
              }
            }}
          >
            <Trash2 size={14} aria-hidden="true" /> Eigenen Termin löschen
          </button>
        )}
      </div>
    </Dialog>
  );
}

/** Nach diesen Terminen wird ein freiwilliger Boxenstopp vorgeschlagen. */
export function isReflectionRelevant(milestone: MilestoneInstance): boolean {
  return (
    milestone.category === 'Unterrichtsbesuch' ||
    milestone.category === 'Lehrprobe' ||
    milestone.category === 'Ausbildungsgespräch'
  );
}

function shift(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
