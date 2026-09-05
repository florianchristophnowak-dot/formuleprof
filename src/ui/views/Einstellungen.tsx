/**
 * Einstellungen – Profil ändern, Darstellung wählen, Sicherung, Import,
 * Export und Datenschutzhinweise.
 */
import { useRef, useState } from 'react';
import {
  CalendarDays,
  Download,
  FileJson,
  Palette,
  RefreshCw,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { Card, Notice, downloadFile } from '../components/common';
import { useApp } from '../../state/AppContext';
import {
  buildBackup,
  exportFileName,
  parseBackup,
  toJsonString,
} from '../../io/exportImport';
import type { ImportMode } from '../../io/exportImport';
import { buildRouteExport, parseRouteFile } from '../../io/routeExchange';
import { buildIcs, icsFileName } from '../../io/ics';
import { formatDate, formatNumber, trainingEndDate } from '../../domain/dates';
import {
  FEDERAL_STATES,
  SCHOOL_TYPES,
  TRAINING_FORMS,
} from '../../domain/types';
import type { AppSnapshot, FederalState, SchoolType, ThemePreference, TrainingForm } from '../../domain/types';

export function Einstellungen() {
  const app = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<AppSnapshot | null>(null);
  const [subjectsDraft, setSubjectsDraft] = useState(app.profile?.subjects.join(', ') ?? '');
  const fileInput = useRef<HTMLInputElement>(null);

  const profile = app.profile;

  const applyImport = async (mode: ImportMode) => {
    if (!pendingImport) return;
    await app.importSnapshot(pendingImport, mode);
    setPendingImport(null);
    setMessage(
      mode === 'ersetzen'
        ? 'Die Daten wurden vollständig ersetzt.'
        : 'Die Daten wurden mit dem vorhandenen Bestand zusammengeführt.',
    );
  };

  const readBackup = async (file: File) => {
    try {
      setPendingImport(parseBackup(await file.text()));
      setError(null);
      setMessage(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Datei konnte nicht gelesen werden.');
    }
  };

  const readRoute = async (file: File) => {
    try {
      const route = parseRouteFile(await file.text());
      await app.importRoute(route);
      setError(null);
      setMessage(
        `Die Streckendatei wurde übernommen: Beginn ${formatDate(route.startDate)}, ${formatNumber(
          route.durationMonths,
        )} Monate, ${route.officialMilestones.length} offizielle Termine.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Streckendatei konnte nicht gelesen werden.');
    }
  };

  return (
    <div className="stapel">
      <div>
        <h1>Einstellungen</h1>
        <p className="gedaempft">
          Alle Angaben lassen sich jederzeit ändern. Änderungen an Beginn, Dauer oder Terminen berechnen
          abhängige Termine neu; eigene Termine bleiben unverändert.
        </p>
      </div>

      {message && <Notice tone="erfolg">{message}</Notice>}
      {error && <Notice tone="fehler">{error}</Notice>}

      {profile && (
        <Card title="Ausbildungsangaben" icon={<UserRound size={18} aria-hidden="true" />}>
          <div className="raster">
            <div className="feld">
              <label htmlFor="e-name">Name oder Bezeichnung (optional)</label>
              <input
                id="e-name"
                type="text"
                value={profile.displayName ?? ''}
                onChange={(event) => app.updateProfile({ displayName: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="e-beginn">Ausbildungsbeginn</label>
              <input
                id="e-beginn"
                type="date"
                value={profile.startDate}
                onChange={(event) => event.target.value && app.updateProfile({ startDate: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="e-dauer">Ausbildungsdauer in Monaten</label>
              <select
                id="e-dauer"
                value={profile.durationMonths}
                onChange={(event) => app.updateProfile({ durationMonths: Number(event.target.value) })}
              >
                {[12, 18, 24, 36].map((months) => (
                  <option key={months} value={months}>
                    {months} Monate
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="e-land">Bundesland</label>
              <select
                id="e-land"
                value={profile.federalState}
                onChange={(event) => app.updateProfile({ federalState: event.target.value as FederalState })}
              >
                {FEDERAL_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="e-schulart">Schulart</label>
              <select
                id="e-schulart"
                value={profile.schoolType}
                onChange={(event) => app.updateProfile({ schoolType: event.target.value as SchoolType })}
              >
                {SCHOOL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="e-form">Ausbildungsform</label>
              <select
                id="e-form"
                value={profile.trainingForm}
                onChange={(event) => app.updateProfile({ trainingForm: event.target.value as TrainingForm })}
              >
                {TRAINING_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="e-faecher">Fächer</label>
              <span className="feld__hinweis">Mehrere Fächer durch Komma trennen.</span>
              <input
                id="e-faecher"
                type="text"
                value={subjectsDraft}
                onChange={(event) => setSubjectsDraft(event.target.value)}
                onBlur={() =>
                  app.updateProfile({
                    subjects: subjectsDraft
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div className="feld">
              <label htmlFor="e-vorlage">Ausbildungsvorlage</label>
              <select
                id="e-vorlage"
                value={profile.templateId}
                onChange={(event) => app.updateProfile({ templateId: event.target.value })}
              >
                {app.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="klein gedaempft">
            Ausbildungsende: {formatDate(trainingEndDate(profile.startDate, profile.durationMonths))}
            {profile.cohortCode ? ` · Jahrgangscode: ${profile.cohortCode}` : ''}
          </p>

          <button type="button" className="knopf knopf--klein" onClick={() => app.recalculate()}>
            <RefreshCw size={15} aria-hidden="true" /> Strecke neu berechnen
          </button>

          {app.lastRecalculation && app.lastRecalculation.changed.length > 0 && (
            <Notice>
              {formatNumber(app.lastRecalculation.changed.length)} Termine wurden neu berechnet.{' '}
              {app.lastRecalculation.keptManual > 0 &&
                `${formatNumber(app.lastRecalculation.keptManual)} eigene Termine sind unverändert geblieben.`}
              <ul className="klein" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {app.lastRecalculation.changed.slice(0, 5).map((change) => (
                  <li key={change.id}>
                    {change.title}: {formatDate(change.from)} → {formatDate(change.to)}
                  </li>
                ))}
              </ul>
            </Notice>
          )}
        </Card>
      )}

      <Card title="Darstellung" icon={<Palette size={18} aria-hidden="true" />}>
        <fieldset className="feldgruppe" style={{ marginBottom: 0 }}>
          <legend>Helle oder dunkle Darstellung</legend>
          {(['system', 'hell', 'dunkel'] as ThemePreference[]).map((theme) => (
            <label className="wahl" key={theme}>
              <input
                type="radio"
                name="darstellung"
                checked={app.settings.theme === theme}
                onChange={() => app.saveSettings({ theme })}
              />
              <span>
                {theme === 'system' ? 'Wie im Betriebssystem eingestellt' : theme === 'hell' ? 'Hell' : 'Dunkel'}
              </span>
            </label>
          ))}
        </fieldset>
        <label className="wahl">
          <input
            type="checkbox"
            checked={app.settings.suggestPitStops}
            onChange={(event) => app.saveSettings({ suggestPitStops: event.target.checked })}
          />
          <span>Nach Unterrichtsbesuchen, Lehrproben und Gesprächen einen Boxenstopp vorschlagen</span>
        </label>
      </Card>

      <Card title="Sicherung und Wiederherstellung" icon={<FileJson size={18} aria-hidden="true" />}>
        <p className="klein gedaempft">
          Die Sicherung ist eine versionierte JSON-Datei und bleibt auf deinem Gerät. Persönliche Reflexionen
          werden nur mitgesichert, wenn du dies ausdrücklich auswählst.
        </p>
        <label className="wahl">
          <input
            type="checkbox"
            checked={app.settings.includeReflectionsInBackup}
            onChange={(event) => app.saveSettings({ includeReflectionsInBackup: event.target.checked })}
          />
          <span>Persönliche Reflexionen aus dem Boxenstopp in die Sicherung aufnehmen</span>
        </label>

        <div className="reihe" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="knopf knopf--primaer"
            onClick={() => {
              downloadFile(
                exportFileName('sicherung'),
                toJsonString(
                  buildBackup(
                    {
                      profile: app.profile,
                      templates: app.templates,
                      milestones: app.milestones,
                      goals: app.goals,
                      reflections: app.reflections,
                      settings: app.settings,
                    },
                    { includeReflections: app.settings.includeReflectionsInBackup },
                  ),
                ),
                'application/json',
              );
              void app.saveSettings({ lastBackupAt: new Date().toISOString() });
              setMessage('Die Sicherung wurde erstellt.');
            }}
          >
            <Download size={16} aria-hidden="true" /> Sicherung herunterladen
          </button>

          <label className="knopf" style={{ cursor: 'pointer' }}>
            <Upload size={16} aria-hidden="true" /> Sicherung einlesen
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="nur-lesbar"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readBackup(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>

        {app.settings.lastBackupAt && (
          <p className="klein gedaempft" style={{ marginTop: 8 }}>
            Letzte Sicherung: {formatDate(app.settings.lastBackupAt.slice(0, 10))}
          </p>
        )}

        {pendingImport && (
          <div className="fehler" role="alertdialog" aria-label="Import bestätigen" style={{ marginTop: 12 }}>
            <p>
              <strong>Achtung: vorhandene Daten werden verändert.</strong>
            </p>
            <p className="klein">
              Die Datei enthält {formatNumber(pendingImport.templates.length)} Vorlagen,{' '}
              {formatNumber(pendingImport.milestones.length)} Meilensteine und{' '}
              {formatNumber(pendingImport.reflections.length)} Reflexionen. Bitte wähle bewusst aus, wie
              vorgegangen werden soll.
            </p>
            <div className="reihe">
              <button type="button" className="knopf knopf--gefahr" onClick={() => applyImport('ersetzen')}>
                Vorhandene Daten ersetzen
              </button>
              <button type="button" className="knopf" onClick={() => applyImport('zusammenfuehren')}>
                Mit vorhandenen Daten zusammenführen
              </button>
              <button type="button" className="knopf knopf--schlicht" onClick={() => setPendingImport(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Austausch mit anderen Anwendungen" icon={<CalendarDays size={18} aria-hidden="true" />}>
        <p className="klein gedaempft">
          Die Streckendatei ist ein stabiles, versioniertes Austauschformat – vorbereitet für die spätere
          Verbindung mit der App „Carnet de formation“. Der Austausch erfolgt ausschliesslich über Dateien;
          es besteht keine Netzwerk- oder Cloudverbindung. Persönliche Reflexionen sind nie enthalten.
        </p>
        <div className="reihe">
          {profile && app.activeTemplate && (
            <button
              type="button"
              className="knopf knopf--klein"
              onClick={() =>
                downloadFile(
                  exportFileName('strecke'),
                  toJsonString(buildRouteExport(profile, app.activeTemplate!, app.milestones)),
                  'application/json',
                )
              }
            >
              <Download size={15} aria-hidden="true" /> Streckendatei exportieren
            </button>
          )}
          <label className="knopf knopf--klein" style={{ cursor: 'pointer' }}>
            <Upload size={15} aria-hidden="true" /> Streckendatei der Fachleitung einlesen
            <input
              type="file"
              accept="application/json,.json"
              className="nur-lesbar"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readRoute(file);
                event.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            className="knopf knopf--klein"
            onClick={() => downloadFile(icsFileName(), buildIcs(app.milestones), 'text/calendar')}
          >
            <Download size={15} aria-hidden="true" /> Alle Termine als .ics
          </button>
        </div>
      </Card>

      <Card title="Daten löschen">
        <p className="klein gedaempft">
          Alle Angaben liegen ausschliesslich lokal in diesem Browser (IndexedDB). Beim Löschen gehen sie
          unwiderruflich verloren; erstelle vorher eine Sicherung.
        </p>
        <button
          type="button"
          className="knopf knopf--gefahr"
          onClick={() => {
            if (
              window.confirm(
                'Sollen wirklich alle lokalen Daten gelöscht werden? Profil, Strecke und Reflexionen gehen dabei verloren.',
              )
            ) {
              void app.resetAll();
              window.location.hash = '#/onboarding';
            }
          }}
        >
          <Trash2 size={16} aria-hidden="true" /> Alle lokalen Daten löschen
        </button>
      </Card>
    </div>
  );
}
