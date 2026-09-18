/**
 * Streckenbaukasten – Administrationsbereich für Fachleitungen.
 * Hier lassen sich Ausbildungsvorlagen mit Phasen, Meilensteinen,
 * Terminregeln, Bedingungen, Checklisten und Herausforderungen pflegen.
 */
import { useMemo, useState } from 'react';
import { Copy, Download, Plus, Save, Trash2, Upload, Wrench } from 'lucide-react';
import { Card, Notice, downloadFile } from '../components/common';
import { WegweiserEditor } from './baukasten/WegweiserEditor';
import { useApp } from '../../state/AppContext';
import { buildTemplateExport, exportFileName, parseTemplateFile, toJsonString } from '../../io/exportImport';
import { DEFAULT_CHALLENGE_RULES } from '../../domain/challenges';
import {
  MILESTONE_CATEGORIES,
  SCHOOL_TYPES,
  TRAINING_FORMS,
} from '../../domain/types';
import type {
  ChallengeRule,
  DateRule,
  MilestoneDefinition,
  SchoolType,
  TrainingForm,
  TrainingPhase,
  TrainingTemplate,
} from '../../domain/types';

const DATE_RULE_KINDS: { value: DateRule['kind']; label: string }[] = [
  { value: 'absolut', label: 'Absolutes Datum' },
  { value: 'relativ', label: 'Relativ zu einem Bezugspunkt' },
  { value: 'zeitfenster', label: 'Frei definierbares Zeitfenster' },
  { value: 'drittel', label: 'Ausbildungsdrittel' },
  { value: 'phase', label: 'Gesamte Ausbildungsphase' },
];

export function Streckenbaukasten() {
  const app = useApp();
  const [selectedId, setSelectedId] = useState<string>(app.templates[0]?.id ?? '');
  const [draft, setDraft] = useState<TrainingTemplate | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => app.templates.find((t) => t.id === selectedId) ?? app.templates[0] ?? null,
    [app.templates, selectedId],
  );
  const template = draft ?? selected;

  const edit = (patch: Partial<TrainingTemplate>) => {
    if (!template) return;
    setDraft({ ...template, ...patch });
    setMessage(null);
  };

  const save = async () => {
    if (!draft) return;
    await app.saveTemplate(draft);
    setDraft(null);
    setSelectedId(draft.id);
    setMessage('Die Vorlage wurde gespeichert. Betroffene Strecken wurden neu berechnet.');
  };

  const duplicate = async () => {
    if (!template) return;
    const copy: TrainingTemplate = {
      ...structuredClone(template),
      id: `${template.id}-kopie-${Date.now().toString(36)}`,
      title: `${template.title} (Kopie)`,
      demo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await app.saveTemplate(copy);
    setSelectedId(copy.id);
    setDraft(null);
    setMessage('Die Vorlage wurde kopiert. Die Kopie kann frei bearbeitet werden.');
  };

  const importTemplate = async (file: File) => {
    try {
      const imported = parseTemplateFile(await file.text());
      await app.saveTemplate(imported);
      setSelectedId(imported.id);
      setError(null);
      setMessage(`Die Vorlage „${imported.title}“ wurde übernommen.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Datei konnte nicht gelesen werden.');
    }
  };

  if (!template) {
    return (
      <div className="stapel">
        <h1>Streckenbaukasten</h1>
        <p>Es ist noch keine Vorlage vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="stapel">
      <div>
        <h1>Streckenbaukasten</h1>
        <p className="gedaempft">
          Ausbildungsvorlagen anlegen und bearbeiten. Jede Vorlage trägt eine sichtbare Bezeichnung und eine
          Versionsangabe.
        </p>
      </div>

      {message && <Notice tone="erfolg">{message}</Notice>}
      {error && <Notice tone="fehler">{error}</Notice>}

      <Card title="Vorlage auswählen" icon={<Wrench size={18} aria-hidden="true" />}>
        <div className="feld">
          <label htmlFor="vorlagenauswahl">Vorlage</label>
          <select
            id="vorlagenauswahl"
            value={template.id}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setDraft(null);
              setMessage(null);
            }}
          >
            {app.templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.version}
              </option>
            ))}
          </select>
        </div>
        <div className="reihe">
          <button type="button" className="knopf knopf--klein" onClick={duplicate}>
            <Copy size={15} aria-hidden="true" /> Vorlage kopieren
          </button>
          <button
            type="button"
            className="knopf knopf--klein"
            onClick={() =>
              downloadFile(
                exportFileName('vorlage'),
                toJsonString(buildTemplateExport(template)),
                'application/json',
              )
            }
          >
            <Download size={15} aria-hidden="true" /> Vorlage exportieren
          </button>
          <label className="knopf knopf--klein" style={{ cursor: 'pointer' }}>
            <Upload size={15} aria-hidden="true" /> Vorlage importieren
            <input
              type="file"
              accept="application/json,.json"
              className="nur-lesbar"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importTemplate(file);
                event.target.value = '';
              }}
            />
          </label>
          {app.profile?.templateId !== template.id && (
            <button
              type="button"
              className="knopf knopf--klein knopf--gefahr"
              onClick={() => {
                if (window.confirm(`Die Vorlage „${template.title}“ endgültig löschen?`)) {
                  void app.removeTemplate(template.id);
                  setDraft(null);
                  setSelectedId(app.templates.find((t) => t.id !== template.id)?.id ?? '');
                }
              }}
            >
              <Trash2 size={15} aria-hidden="true" /> Löschen
            </button>
          )}
        </div>
        {template.demo && (
          <Notice>
            Mitgelieferte Beispielvorlage. Die Inhalte sind Demodaten und keine rechtlich verbindliche Vorgabe.
            Für eigene Anpassungen empfiehlt sich eine Kopie.
          </Notice>
        )}
      </Card>

      <Card title="Bezeichnung und Gültigkeit">
        <div className="raster">
          <div className="feld">
            <label htmlFor="vorlage-titel">Sichtbare Bezeichnung</label>
            <span className="feld__hinweis">Beispiel: „Thüringen – Gymnasium – Stand August 2026“</span>
            <input
              id="vorlage-titel"
              type="text"
              value={template.title}
              onChange={(event) => edit({ title: event.target.value })}
            />
          </div>
          <div className="feld">
            <label htmlFor="vorlage-version">Version</label>
            <input
              id="vorlage-version"
              type="text"
              value={template.version}
              onChange={(event) => edit({ version: event.target.value })}
            />
          </div>
          <div className="feld">
            <label htmlFor="vorlage-stand">Gültigkeitsstand</label>
            <input
              id="vorlage-stand"
              type="text"
              value={template.validAsOf}
              onChange={(event) => edit({ validAsOf: event.target.value })}
            />
          </div>
          <div className="feld">
            <label htmlFor="vorlage-dauern">Ausbildungsdauern in Monaten</label>
            <span className="feld__hinweis">Mehrere Angaben durch Komma trennen, z. B. 12, 18, 24</span>
            <input
              id="vorlage-dauern"
              type="text"
              value={template.durations.join(', ')}
              onChange={(event) =>
                edit({
                  durations: event.target.value
                    .split(',')
                    .map((value) => Number(value.trim()))
                    .filter((value) => Number.isFinite(value) && value > 0),
                })
              }
            />
          </div>
        </div>
        <div className="feld">
          <label htmlFor="vorlage-quelle">Quelle und Hinweis</label>
          <textarea
            id="vorlage-quelle"
            value={template.source ?? ''}
            onChange={(event) => edit({ source: event.target.value })}
          />
        </div>
        <fieldset className="feldgruppe">
          <legend>Schularten</legend>
          {SCHOOL_TYPES.map((type) => (
            <label className="wahl" key={type}>
              <input
                type="checkbox"
                checked={template.schoolTypes.includes(type)}
                onChange={(event) =>
                  edit({
                    schoolTypes: event.target.checked
                      ? [...template.schoolTypes, type]
                      : template.schoolTypes.filter((item) => item !== type),
                  })
                }
              />
              <span>{type}</span>
            </label>
          ))}
        </fieldset>
      </Card>

      <PhaseEditor template={template} onChange={edit} />
      <MilestoneEditor template={template} onChange={edit} />
      <WegweiserEditor template={template} onChange={edit} />
      <ChallengeRuleEditor template={template} onChange={edit} />

      <div className="reihe">
        <button type="button" className="knopf knopf--primaer" onClick={save} disabled={!draft}>
          <Save size={16} aria-hidden="true" /> Änderungen speichern
        </button>
        {draft && (
          <button type="button" className="knopf" onClick={() => setDraft(null)}>
            Verwerfen
          </button>
        )}
        {draft && <span className="klein gedaempft">Es liegen ungespeicherte Änderungen vor.</span>}
      </div>
    </div>
  );
}

/* ------------------------------ Phasen ------------------------------- */

function PhaseEditor({
  template,
  onChange,
}: {
  template: TrainingTemplate;
  onChange: (patch: Partial<TrainingTemplate>) => void;
}) {
  const update = (id: string, patch: Partial<TrainingPhase>) =>
    onChange({ phases: template.phases.map((phase) => (phase.id === id ? { ...phase, ...patch } : phase)) });

  const add = () => {
    const id = `phase-${Date.now().toString(36)}`;
    onChange({
      phases: [
        ...template.phases,
        {
          id,
          title: 'Neue Etappe',
          summary: '',
          fromFraction: 0,
          toFraction: 0.1,
          demanding: false,
          roadbook: {
            expectations: [],
            preparation: [],
            documents: [],
            uncertainties: [],
            support: [],
            carryOver: [],
          },
        },
      ],
    });
  };

  return (
    <Card
      title={`Ausbildungsphasen (${template.phases.length})`}
      actions={
        <button type="button" className="knopf knopf--klein" onClick={add}>
          <Plus size={14} aria-hidden="true" /> Etappe
        </button>
      }
    >
      <p className="klein gedaempft">
        Die Anteile geben an, wo eine Etappe innerhalb der Gesamtdauer liegt. Dadurch passt sich die Strecke
        automatisch an unterschiedliche Ausbildungsdauern an.
      </p>
      <div className="tabelle__rollbereich">
        <table className="tabelle">
          <caption className="nur-lesbar">Ausbildungsphasen der Vorlage</caption>
          <thead>
            <tr>
              <th scope="col">Titel</th>
              <th scope="col">Kurzbeschreibung</th>
              <th scope="col">von (0–1)</th>
              <th scope="col">bis (0–1)</th>
              <th scope="col">Kurve</th>
              <th scope="col">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {template.phases.map((phase) => (
              <tr key={phase.id}>
                <td>
                  <label className="nur-lesbar" htmlFor={`phase-titel-${phase.id}`}>
                    Titel der Etappe
                  </label>
                  <input
                    id={`phase-titel-${phase.id}`}
                    type="text"
                    value={phase.title}
                    onChange={(event) => update(phase.id, { title: event.target.value })}
                  />
                </td>
                <td>
                  <label className="nur-lesbar" htmlFor={`phase-text-${phase.id}`}>
                    Kurzbeschreibung
                  </label>
                  <input
                    id={`phase-text-${phase.id}`}
                    type="text"
                    value={phase.summary}
                    onChange={(event) => update(phase.id, { summary: event.target.value })}
                  />
                </td>
                <td>
                  <label className="nur-lesbar" htmlFor={`phase-von-${phase.id}`}>
                    Beginn als Anteil
                  </label>
                  <input
                    id={`phase-von-${phase.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={phase.fromFraction}
                    onChange={(event) => update(phase.id, { fromFraction: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <label className="nur-lesbar" htmlFor={`phase-bis-${phase.id}`}>
                    Ende als Anteil
                  </label>
                  <input
                    id={`phase-bis-${phase.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={phase.toFraction}
                    onChange={(event) => update(phase.id, { toFraction: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <label className="wahl">
                    <input
                      type="checkbox"
                      checked={Boolean(phase.demanding)}
                      onChange={(event) => update(phase.id, { demanding: event.target.checked })}
                    />
                    <span className="nur-lesbar">Anspruchsvolle Passage</span>
                  </label>
                </td>
                <td>
                  <button
                    type="button"
                    className="knopf knopf--klein knopf--gefahr"
                    onClick={() => onChange({ phases: template.phases.filter((p) => p.id !== phase.id) })}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span className="nur-lesbar">Etappe {phase.title} löschen</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* --------------------------- Meilensteine ---------------------------- */

function MilestoneEditor({
  template,
  onChange,
}: {
  template: TrainingTemplate;
  onChange: (patch: Partial<TrainingTemplate>) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<MilestoneDefinition>) =>
    onChange({
      milestones: template.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, ...patch } : milestone,
      ),
    });

  const add = () => {
    const id = `meilenstein-${Date.now().toString(36)}`;
    const phaseId = template.phases[0]?.id ?? 'start';
    onChange({
      milestones: [
        ...template.milestones,
        {
          id,
          title: 'Neuer Meilenstein',
          description: '',
          category: 'Organisation',
          phaseId,
          dateRule: { kind: 'relativ', anchor: { type: 'start' }, offset: { amount: 30, unit: 'Tage' } },
          leadTimeDays: 14,
          prerequisites: [],
          checklist: [],
          help: '',
          mandatory: false,
          major: false,
          order: (template.milestones.length + 1) * 10,
        },
      ],
    });
    setOpenId(id);
  };

  return (
    <Card
      title={`Meilensteine (${template.milestones.length})`}
      actions={
        <button type="button" className="knopf knopf--klein" onClick={add}>
          <Plus size={14} aria-hidden="true" /> Meilenstein
        </button>
      }
    >
      {[...template.milestones]
        .sort((a, b) => a.order - b.order)
        .map((milestone) => (
          <details
            className="klapp"
            key={milestone.id}
            open={openId === milestone.id}
            onToggle={(event) => {
              if ((event.currentTarget as HTMLDetailsElement).open) setOpenId(milestone.id);
            }}
          >
            <summary>
              {milestone.title}
              <span className="klein gedaempft" style={{ marginLeft: 'auto' }}>
                {milestone.category} · {ruleLabel(milestone.dateRule)}
              </span>
            </summary>
            <div className="klapp__inhalt">
              <div className="raster">
                <div className="feld">
                  <label htmlFor={`ms-titel-${milestone.id}`}>Titel</label>
                  <input
                    id={`ms-titel-${milestone.id}`}
                    type="text"
                    value={milestone.title}
                    onChange={(event) => update(milestone.id, { title: event.target.value })}
                  />
                </div>
                <div className="feld">
                  <label htmlFor={`ms-kategorie-${milestone.id}`}>Kategorie</label>
                  <select
                    id={`ms-kategorie-${milestone.id}`}
                    value={milestone.category}
                    onChange={(event) =>
                      update(milestone.id, { category: event.target.value as MilestoneDefinition['category'] })
                    }
                  >
                    {MILESTONE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="feld">
                  <label htmlFor={`ms-phase-${milestone.id}`}>Ausbildungsphase</label>
                  <select
                    id={`ms-phase-${milestone.id}`}
                    value={milestone.phaseId}
                    onChange={(event) => update(milestone.id, { phaseId: event.target.value })}
                  >
                    {template.phases.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="feld">
                  <label htmlFor={`ms-vorlauf-${milestone.id}`}>Empfohlener Vorlauf in Tagen</label>
                  <input
                    id={`ms-vorlauf-${milestone.id}`}
                    type="number"
                    min="0"
                    value={milestone.leadTimeDays}
                    onChange={(event) => update(milestone.id, { leadTimeDays: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="feld">
                <label htmlFor={`ms-text-${milestone.id}`}>Kurzbeschreibung</label>
                <input
                  id={`ms-text-${milestone.id}`}
                  type="text"
                  value={milestone.description}
                  onChange={(event) => update(milestone.id, { description: event.target.value })}
                />
              </div>

              <DateRuleEditor
                milestone={milestone}
                template={template}
                onChange={(dateRule) => update(milestone.id, { dateRule })}
              />

              <div className="feld">
                <label htmlFor={`ms-hilfe-${milestone.id}`}>Hilfetext</label>
                <textarea
                  id={`ms-hilfe-${milestone.id}`}
                  value={milestone.help}
                  onChange={(event) => update(milestone.id, { help: event.target.value })}
                />
              </div>

              <div className="feld">
                <label htmlFor={`ms-quelle-${milestone.id}`}>Quellenangabe (optional)</label>
                <input
                  id={`ms-quelle-${milestone.id}`}
                  type="text"
                  value={milestone.source ?? ''}
                  onChange={(event) => update(milestone.id, { source: event.target.value })}
                />
              </div>

              <div className="feld">
                <label htmlFor={`ms-checkliste-${milestone.id}`}>Checkliste</label>
                <span className="feld__hinweis">Ein Punkt je Zeile.</span>
                <textarea
                  id={`ms-checkliste-${milestone.id}`}
                  value={milestone.checklist.map((item) => item.label).join('\n')}
                  onChange={(event) =>
                    update(milestone.id, {
                      checklist: event.target.value
                        .split('\n')
                        .map((label) => label.trim())
                        .filter(Boolean)
                        .map((label, index) => ({ id: `${milestone.id}-c${index + 1}`, label })),
                    })
                  }
                />
              </div>

              <div className="feld">
                <label htmlFor={`ms-voraussetzung-${milestone.id}`}>Voraussetzungen</label>
                <span className="feld__hinweis">
                  Mehrfachauswahl mit Strg beziehungsweise Befehlstaste möglich.
                </span>
                <select
                  id={`ms-voraussetzung-${milestone.id}`}
                  multiple
                  size={4}
                  value={milestone.prerequisites}
                  onChange={(event) =>
                    update(milestone.id, {
                      prerequisites: [...event.target.selectedOptions].map((option) => option.value),
                    })
                  }
                >
                  {template.milestones
                    .filter((other) => other.id !== milestone.id)
                    .map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.title}
                      </option>
                    ))}
                </select>
              </div>

              <fieldset className="feldgruppe">
                <legend>Bedingte Gültigkeit</legend>
                <div className="raster">
                  <div className="feld">
                    <label htmlFor={`ms-mindauer-${milestone.id}`}>Mindestdauer in Monaten</label>
                    <input
                      id={`ms-mindauer-${milestone.id}`}
                      type="number"
                      min="0"
                      value={milestone.conditions?.minDurationMonths ?? ''}
                      onChange={(event) =>
                        update(milestone.id, {
                          conditions: {
                            ...milestone.conditions,
                            minDurationMonths: event.target.value ? Number(event.target.value) : undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="feld">
                    <label htmlFor={`ms-maxdauer-${milestone.id}`}>Höchstdauer in Monaten</label>
                    <input
                      id={`ms-maxdauer-${milestone.id}`}
                      type="number"
                      min="0"
                      value={milestone.conditions?.maxDurationMonths ?? ''}
                      onChange={(event) =>
                        update(milestone.id, {
                          conditions: {
                            ...milestone.conditions,
                            maxDurationMonths: event.target.value ? Number(event.target.value) : undefined,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <ConditionList
                  legend="Nur für diese Schularten"
                  options={SCHOOL_TYPES}
                  selected={milestone.conditions?.schoolTypes ?? []}
                  onChange={(schoolTypes) =>
                    update(milestone.id, {
                      conditions: {
                        ...milestone.conditions,
                        schoolTypes: schoolTypes.length > 0 ? (schoolTypes as SchoolType[]) : undefined,
                      },
                    })
                  }
                />
                <ConditionList
                  legend="Nur für diese Ausbildungsformen"
                  options={TRAINING_FORMS}
                  selected={milestone.conditions?.trainingForms ?? []}
                  onChange={(trainingForms) =>
                    update(milestone.id, {
                      conditions: {
                        ...milestone.conditions,
                        trainingForms: trainingForms.length > 0 ? (trainingForms as TrainingForm[]) : undefined,
                      },
                    })
                  }
                />
              </fieldset>

              <div className="reihe">
                <label className="wahl">
                  <input
                    type="checkbox"
                    checked={milestone.mandatory}
                    onChange={(event) => update(milestone.id, { mandatory: event.target.checked })}
                  />
                  <span>Verbindlicher Termin</span>
                </label>
                <label className="wahl">
                  <input
                    type="checkbox"
                    checked={Boolean(milestone.major)}
                    onChange={(event) => update(milestone.id, { major: event.target.checked })}
                  />
                  <span>Grosser Termin (für die Überschneidungserkennung)</span>
                </label>
                <button
                  type="button"
                  className="knopf knopf--klein knopf--gefahr"
                  onClick={() =>
                    onChange({ milestones: template.milestones.filter((m) => m.id !== milestone.id) })
                  }
                >
                  <Trash2 size={14} aria-hidden="true" /> Meilenstein löschen
                </button>
              </div>
            </div>
          </details>
        ))}
    </Card>
  );
}

function ConditionList({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="feldgruppe" style={{ marginBottom: 8 }}>
      <legend className="klein">{legend}</legend>
      <div className="reihe">
        {options.map((option) => (
          <label className="wahl" key={option} style={{ paddingRight: 10 }}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked ? [...selected, option] : selected.filter((item) => item !== option),
                )
              }
            />
            <span className="klein">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DateRuleEditor({
  milestone,
  template,
  onChange,
}: {
  milestone: MilestoneDefinition;
  template: TrainingTemplate;
  onChange: (rule: DateRule) => void;
}) {
  const rule = milestone.dateRule;
  const id = milestone.id;

  const switchKind = (kind: DateRule['kind']) => {
    const phaseId = template.phases[0]?.id ?? 'start';
    switch (kind) {
      case 'absolut':
        onChange({ kind: 'absolut', date: new Date().toISOString().slice(0, 10) });
        break;
      case 'relativ':
        onChange({ kind: 'relativ', anchor: { type: 'start' }, offset: { amount: 30, unit: 'Tage' } });
        break;
      case 'zeitfenster':
        onChange({
          kind: 'zeitfenster',
          from: { anchor: { type: 'start' }, offset: { amount: 0, unit: 'Tage' } },
          to: { anchor: { type: 'start' }, offset: { amount: 60, unit: 'Tage' } },
        });
        break;
      case 'drittel':
        onChange({ kind: 'drittel', third: 1 });
        break;
      case 'phase':
        onChange({ kind: 'phase', phaseId });
        break;
    }
  };

  return (
    <fieldset className="feldgruppe">
      <legend>Terminregel</legend>
      <div className="feld">
        <label htmlFor={`regel-art-${id}`}>Art der Regel</label>
        <select
          id={`regel-art-${id}`}
          value={rule.kind}
          onChange={(event) => switchKind(event.target.value as DateRule['kind'])}
        >
          {DATE_RULE_KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {rule.kind === 'absolut' && (
        <div className="raster">
          <div className="feld">
            <label htmlFor={`regel-datum-${id}`}>Datum</label>
            <input
              id={`regel-datum-${id}`}
              type="date"
              value={rule.date}
              onChange={(event) => onChange({ ...rule, date: event.target.value })}
            />
          </div>
          <div className="feld">
            <label htmlFor={`regel-datum-ende-${id}`}>Ende des Zeitfensters (optional)</label>
            <input
              id={`regel-datum-ende-${id}`}
              type="date"
              value={rule.endDate ?? ''}
              onChange={(event) => onChange({ ...rule, endDate: event.target.value || undefined })}
            />
          </div>
        </div>
      )}

      {rule.kind === 'relativ' && (
        <div className="raster">
          <div className="feld">
            <label htmlFor={`regel-bezug-${id}`}>Bezugspunkt</label>
            <select
              id={`regel-bezug-${id}`}
              value={anchorValue(rule.anchor)}
              onChange={(event) => onChange({ ...rule, anchor: parseAnchor(event.target.value) })}
            >
              <option value="start">Ausbildungsbeginn</option>
              <option value="end">Ausbildungsende</option>
              <option value="fraction:0.3333">Ende des ersten Drittels</option>
              <option value="fraction:0.6667">Ende des zweiten Drittels</option>
              {template.phases.map((phase) => (
                <option key={phase.id} value={`phase:${phase.id}`}>
                  Beginn der Etappe „{phase.title}“
                </option>
              ))}
              {template.milestones
                .filter((other) => other.id !== id)
                .map((other) => (
                  <option key={other.id} value={`milestone:${other.id}`}>
                    Meilenstein „{other.title}“
                  </option>
                ))}
            </select>
          </div>
          <div className="feld">
            <label htmlFor={`regel-abstand-${id}`}>Abstand</label>
            <input
              id={`regel-abstand-${id}`}
              type="number"
              value={rule.offset.amount}
              onChange={(event) =>
                onChange({ ...rule, offset: { ...rule.offset, amount: Number(event.target.value) } })
              }
            />
          </div>
          <div className="feld">
            <label htmlFor={`regel-einheit-${id}`}>Einheit</label>
            <select
              id={`regel-einheit-${id}`}
              value={rule.offset.unit}
              onChange={(event) =>
                onChange({
                  ...rule,
                  offset: { ...rule.offset, unit: event.target.value as 'Tage' | 'Wochen' | 'Monate' },
                })
              }
            >
              <option value="Tage">Tage</option>
              <option value="Wochen">Wochen</option>
              <option value="Monate">Monate</option>
            </select>
          </div>
          <div className="feld">
            <label htmlFor={`regel-fenster-${id}`}>Zeitfenster in Tagen (0 = fester Tag)</label>
            <input
              id={`regel-fenster-${id}`}
              type="number"
              min="0"
              value={rule.windowDays ?? 0}
              onChange={(event) => onChange({ ...rule, windowDays: Number(event.target.value) || undefined })}
            />
          </div>
        </div>
      )}

      {rule.kind === 'zeitfenster' && (
        <div className="raster">
          <div className="feld">
            <label htmlFor={`regel-von-${id}`}>Beginn: Abstand zum Ausbildungsbeginn (Tage)</label>
            <input
              id={`regel-von-${id}`}
              type="number"
              value={rule.from.offset.amount}
              onChange={(event) =>
                onChange({
                  ...rule,
                  from: { anchor: rule.from.anchor, offset: { amount: Number(event.target.value), unit: 'Tage' } },
                })
              }
            />
          </div>
          <div className="feld">
            <label htmlFor={`regel-bis-${id}`}>Ende: Abstand zum Ausbildungsbeginn (Tage)</label>
            <input
              id={`regel-bis-${id}`}
              type="number"
              value={rule.to.offset.amount}
              onChange={(event) =>
                onChange({
                  ...rule,
                  to: { anchor: rule.to.anchor, offset: { amount: Number(event.target.value), unit: 'Tage' } },
                })
              }
            />
          </div>
        </div>
      )}

      {rule.kind === 'drittel' && (
        <div className="feld">
          <label htmlFor={`regel-drittel-${id}`}>Ausbildungsdrittel</label>
          <select
            id={`regel-drittel-${id}`}
            value={rule.third}
            onChange={(event) => onChange({ kind: 'drittel', third: Number(event.target.value) as 1 | 2 | 3 })}
          >
            <option value={1}>Erstes Drittel</option>
            <option value={2}>Zweites Drittel</option>
            <option value={3}>Drittes Drittel</option>
          </select>
        </div>
      )}

      {rule.kind === 'phase' && (
        <div className="feld">
          <label htmlFor={`regel-phase-${id}`}>Ausbildungsphase</label>
          <select
            id={`regel-phase-${id}`}
            value={rule.phaseId}
            onChange={(event) => onChange({ kind: 'phase', phaseId: event.target.value })}
          >
            {template.phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </fieldset>
  );
}

function anchorValue(anchor: Extract<DateRule, { kind: 'relativ' }>['anchor']): string {
  switch (anchor.type) {
    case 'start':
      return 'start';
    case 'end':
      return 'end';
    case 'fraction':
      return `fraction:${anchor.value}`;
    case 'phase':
      return `phase:${anchor.phaseId}`;
    case 'milestone':
      return `milestone:${anchor.milestoneId}`;
  }
}

function parseAnchor(value: string): Extract<DateRule, { kind: 'relativ' }>['anchor'] {
  if (value === 'start') return { type: 'start' };
  if (value === 'end') return { type: 'end' };
  const [kind, rest] = value.split(':');
  if (kind === 'fraction') return { type: 'fraction', value: Number(rest) };
  if (kind === 'phase') return { type: 'phase', phaseId: rest ?? '', edge: 'start' };
  return { type: 'milestone', milestoneId: rest ?? '' };
}

function ruleLabel(rule: DateRule): string {
  switch (rule.kind) {
    case 'absolut':
      return 'absolutes Datum';
    case 'relativ':
      return 'relativer Termin';
    case 'zeitfenster':
      return 'Zeitfenster';
    case 'drittel':
      return `${rule.third}. Ausbildungsdrittel`;
    case 'phase':
      return 'Phasenfenster';
  }
}

/* ------------------------- Herausforderungen ------------------------- */

function ChallengeRuleEditor({
  template,
  onChange,
}: {
  template: TrainingTemplate;
  onChange: (patch: Partial<TrainingTemplate>) => void;
}) {
  const update = (id: string, patch: Partial<ChallengeRule>) =>
    onChange({
      challengeRules: template.challengeRules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    });

  const restore = () => onChange({ challengeRules: structuredClone(DEFAULT_CHALLENGE_RULES) });

  return (
    <Card
      title="Herausforderungen"
      actions={
        <button type="button" className="knopf knopf--klein" onClick={restore}>
          Standardregeln wiederherstellen
        </button>
      }
    >
      <p className="klein gedaempft">
        Die Vorschau arbeitet ausschliesslich mit diesen Regeln. Es werden keine Wahrscheinlichkeiten berechnet
        und keine Bewertungen vorgenommen.
      </p>
      {template.challengeRules.map((rule) => (
        <div key={rule.id} className="karte" style={{ marginBottom: 10 }}>
          <label className="wahl">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(event) => update(rule.id, { enabled: event.target.checked })}
            />
            <span>
              <strong>{rule.title}</strong>
              <br />
              <span className="klein gedaempft">Kennung: {rule.kind}</span>
            </span>
          </label>
          <div className="raster">
            <div className="feld">
              <label htmlFor={`regel-horizont-${rule.id}`}>Betrachtungszeitraum in Tagen</label>
              <input
                id={`regel-horizont-${rule.id}`}
                type="number"
                min="0"
                value={rule.horizonDays}
                onChange={(event) => update(rule.id, { horizonDays: Number(event.target.value) })}
              />
            </div>
            {rule.params &&
              Object.entries(rule.params).map(([key, value]) => (
                <div className="feld" key={key}>
                  <label htmlFor={`regel-${rule.id}-${key}`}>{key}</label>
                  <input
                    id={`regel-${rule.id}-${key}`}
                    type="number"
                    value={value}
                    onChange={(event) =>
                      update(rule.id, { params: { ...rule.params, [key]: Number(event.target.value) } })
                    }
                  />
                </div>
              ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
