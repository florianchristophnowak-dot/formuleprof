/**
 * Baukasten: Vorgaben für den Wegweiser – Soll-Korridore der
 * Unterrichtsverpflichtung, Mindestumfang der Ausbildungsstunden, Fristen der
 * Staatsprüfung, Gewichtung der Gesamtnote und Rahmenangaben.
 */
import { Plus, Trash2 } from 'lucide-react';
import { Card, Collapsible } from '../../components/common';
import { formatNumber } from '../../../domain/dates';
import { EXAM_MODES } from '../../../domain/types';
import type {
  ExamMode,
  FrameworkNote,
  HourRange,
  SeminarRequirement,
  TeachingLoadStage,
  TrainingTemplate,
} from '../../../domain/types';

export function WegweiserEditor({
  template,
  onChange,
}: {
  template: TrainingTemplate;
  onChange: (patch: Partial<TrainingTemplate>) => void;
}) {
  const load = template.teachingLoad;
  const requirements = template.seminarRequirements ?? [];
  const deadlines = template.examDeadlines;
  const grades = template.gradeModel;
  const framework = template.framework ?? [];

  const updateStage = (id: string, patch: Partial<TeachingLoadStage>) => {
    if (!load) return;
    onChange({
      teachingLoad: {
        ...load,
        stages: load.stages.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
      },
    });
  };

  /** Zwei Zahlenfelder für einen Korridor „von … bis …“. */
  const rangeFields = (stage: TeachingLoadStage, key: 'hospitation' | 'guided' | 'combined', label: string) => {
    const range: HourRange | undefined = stage[key];
    const setRange = (next: { min: number; max: number } | undefined) =>
      updateStage(stage.id, { [key]: next } as Partial<TeachingLoadStage>);
    return (
      <div className="reihe" key={`${stage.id}-${key}`}>
        <span className="klein" style={{ minWidth: 200 }}>
          {label}
        </span>
        <label className="nur-lesbar" htmlFor={`${stage.id}-${key}-min`}>
          {label} von
        </label>
        <input
          id={`${stage.id}-${key}-min`}
          type="number"
          min={0}
          max={40}
          step={0.5}
          style={{ maxWidth: 90 }}
          value={range?.min ?? ''}
          onChange={(event) =>
            setRange(
              event.target.value === '' && key !== 'hospitation'
                ? undefined
                : { min: Number(event.target.value), max: range?.max ?? Number(event.target.value) },
            )
          }
        />
        <label className="nur-lesbar" htmlFor={`${stage.id}-${key}-max`}>
          {label} bis
        </label>
        <input
          id={`${stage.id}-${key}-max`}
          type="number"
          min={0}
          max={40}
          step={0.5}
          style={{ maxWidth: 90 }}
          value={range?.max ?? ''}
          onChange={(event) =>
            setRange(
              event.target.value === '' && key !== 'hospitation'
                ? undefined
                : { min: range?.min ?? Number(event.target.value), max: Number(event.target.value) },
            )
          }
        />
      </div>
    );
  };

  return (
    <Card title="Vorgaben für den Wegweiser">
      <p className="klein gedaempft">
        Diese Angaben steuern den Abgleich im Wegweiser: Korridore des Unterrichtseinsatzes, Mindestumfang der
        Ausbildungsstunden, Fristen der Staatsprüfung, Gewichtung der Gesamtnote und die Rahmenangaben zum
        Nachlesen.
      </p>

      <Collapsible summary={`Unterrichtsverpflichtung (${formatNumber(load?.stages.length ?? 0)} Abschnitte)`}>
        {!load ? (
          <div className="stapel stapel--eng">
            <p className="klein gedaempft">Für diese Vorlage sind keine Korridore hinterlegt.</p>
            <button
              type="button"
              className="knopf knopf--klein"
              onClick={() =>
                onChange({
                  teachingLoad: {
                    title: 'Unterrichtsverpflichtung',
                    weeklyTotal: 15,
                    stages: [
                      {
                        id: `abschnitt-${Date.now().toString(36)}`,
                        title: 'Erster Abschnitt',
                        fromWeek: 1,
                        hospitation: { min: 15, max: 15 },
                      },
                    ],
                  },
                })
              }
            >
              <Plus size={14} aria-hidden="true" /> Korridore anlegen
            </button>
          </div>
        ) : (
          <div className="stapel stapel--eng">
            <div className="raster">
              <div className="feld">
                <label htmlFor="ul-titel">Bezeichnung</label>
                <input
                  id="ul-titel"
                  type="text"
                  value={load.title}
                  onChange={(event) => onChange({ teachingLoad: { ...load, title: event.target.value } })}
                />
              </div>
              <div className="feld">
                <label htmlFor="ul-summe">Richtwert Wochenstunden insgesamt</label>
                <input
                  id="ul-summe"
                  type="number"
                  min={1}
                  max={40}
                  value={load.weeklyTotal}
                  onChange={(event) =>
                    onChange({ teachingLoad: { ...load, weeklyTotal: Number(event.target.value) } })
                  }
                />
              </div>
              <div className="feld">
                <label htmlFor="ul-durchschnitt">Selbstständiger Unterricht im Durchschnitt je Halbjahr</label>
                <input
                  id="ul-durchschnitt"
                  type="number"
                  min={0}
                  max={40}
                  value={load.independentAveragePerHalfYear ?? ''}
                  onChange={(event) =>
                    onChange({
                      teachingLoad: {
                        ...load,
                        independentAveragePerHalfYear:
                          event.target.value === '' ? undefined : Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="feld">
                <label htmlFor="ul-spitze">Zeitweise höchstens</label>
                <input
                  id="ul-spitze"
                  type="number"
                  min={0}
                  max={40}
                  value={load.independentPeak ?? ''}
                  onChange={(event) =>
                    onChange({
                      teachingLoad: {
                        ...load,
                        independentPeak: event.target.value === '' ? undefined : Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>

            {load.stages.map((stage) => (
              <fieldset className="feldgruppe" key={stage.id}>
                <legend>{stage.title}</legend>
                <div className="raster">
                  <div className="feld">
                    <label htmlFor={`${stage.id}-titel`}>Bezeichnung</label>
                    <input
                      id={`${stage.id}-titel`}
                      type="text"
                      value={stage.title}
                      onChange={(event) => updateStage(stage.id, { title: event.target.value })}
                    />
                  </div>
                  <div className="feld">
                    <label htmlFor={`${stage.id}-woche`}>Ab Unterrichtswoche</label>
                    <input
                      id={`${stage.id}-woche`}
                      type="number"
                      min={1}
                      max={104}
                      value={stage.fromWeek ?? ''}
                      onChange={(event) =>
                        updateStage(stage.id, {
                          fromWeek: event.target.value === '' ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="feld">
                    <label htmlFor={`${stage.id}-halbjahr`}>Ab Ausbildungshalbjahr</label>
                    <input
                      id={`${stage.id}-halbjahr`}
                      type="number"
                      min={1}
                      max={6}
                      value={stage.fromHalfYear ?? ''}
                      onChange={(event) =>
                        updateStage(stage.id, {
                          fromHalfYear: event.target.value === '' ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                {rangeFields(stage, 'hospitation', 'Hospitation (H)')}
                {rangeFields(stage, 'guided', 'Angeleiteter Unterricht (aU)')}
                {rangeFields(stage, 'combined', 'Angeleitet und selbstständig (aU+sU)')}
                <div className="reihe">
                  <div className="feld" style={{ maxWidth: 200 }}>
                    <label htmlFor={`${stage.id}-su-max`}>davon höchstens sU</label>
                    <input
                      id={`${stage.id}-su-max`}
                      type="number"
                      min={0}
                      max={40}
                      value={stage.independentMax ?? ''}
                      onChange={(event) =>
                        updateStage(stage.id, {
                          independentMax: event.target.value === '' ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="feld" style={{ maxWidth: 200 }}>
                    <label htmlFor={`${stage.id}-su-mittel`}>sU im Durchschnitt</label>
                    <input
                      id={`${stage.id}-su-mittel`}
                      type="number"
                      min={0}
                      max={40}
                      value={stage.independentAverage ?? ''}
                      onChange={(event) =>
                        updateStage(stage.id, {
                          independentAverage: event.target.value === '' ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="feld">
                  <label htmlFor={`${stage.id}-hinweis`}>Hinweis</label>
                  <input
                    id={`${stage.id}-hinweis`}
                    type="text"
                    value={stage.note ?? ''}
                    onChange={(event) => updateStage(stage.id, { note: event.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="knopf knopf--klein knopf--gefahr"
                  onClick={() =>
                    onChange({
                      teachingLoad: { ...load, stages: load.stages.filter((item) => item.id !== stage.id) },
                    })
                  }
                >
                  <Trash2 size={13} aria-hidden="true" /> Abschnitt entfernen
                </button>
              </fieldset>
            ))}

            <button
              type="button"
              className="knopf knopf--klein"
              onClick={() =>
                onChange({
                  teachingLoad: {
                    ...load,
                    stages: [
                      ...load.stages,
                      {
                        id: `abschnitt-${Date.now().toString(36)}`,
                        title: 'Neuer Abschnitt',
                        fromWeek: (load.stages[load.stages.length - 1]?.fromWeek ?? 0) + 1,
                        hospitation: { min: 0, max: 15 },
                      },
                    ],
                  },
                })
              }
            >
              <Plus size={14} aria-hidden="true" /> Abschnitt hinzufügen
            </button>
          </div>
        )}
      </Collapsible>

      <Collapsible summary={`Mindestumfang der Ausbildungsstunden (${formatNumber(requirements.length)})`}>
        <div className="stapel stapel--eng">
          {requirements.map((requirement, index) => (
            <div className="reihe" key={`anforderung-${index}`}>
              <div className="feld" style={{ maxWidth: 160 }}>
                <label htmlFor={`stunden-dauer-${index}`}>Dauer in Monaten</label>
                <input
                  id={`stunden-dauer-${index}`}
                  type="number"
                  min={1}
                  max={48}
                  value={requirement.durationMonths}
                  onChange={(event) =>
                    onChange({
                      seminarRequirements: requirements.map((item, position) =>
                        position === index ? { ...item, durationMonths: Number(event.target.value) } : item,
                      ),
                    })
                  }
                />
              </div>
              <div className="feld" style={{ maxWidth: 160 }}>
                <label htmlFor={`stunden-umfang-${index}`}>Stunden</label>
                <input
                  id={`stunden-umfang-${index}`}
                  type="number"
                  min={1}
                  max={2000}
                  value={requirement.hours}
                  onChange={(event) =>
                    onChange({
                      seminarRequirements: requirements.map((item, position) =>
                        position === index ? { ...item, hours: Number(event.target.value) } : item,
                      ),
                    })
                  }
                />
              </div>
              <button
                type="button"
                className="knopf knopf--klein knopf--schlicht"
                onClick={() =>
                  onChange({ seminarRequirements: requirements.filter((_, position) => position !== index) })
                }
              >
                <Trash2 size={13} aria-hidden="true" />
                <span className="nur-lesbar">Angabe entfernen</span>
              </button>
            </div>
          ))}
          <button
            type="button"
            className="knopf knopf--klein"
            onClick={() =>
              onChange({
                seminarRequirements: [
                  ...requirements,
                  { durationMonths: 18, hours: 200 } satisfies SeminarRequirement,
                ],
              })
            }
          >
            <Plus size={14} aria-hidden="true" /> Angabe hinzufügen
          </button>
        </div>
      </Collapsible>

      <Collapsible summary="Fristen der Staatsprüfung">
        {!deadlines ? (
          <button
            type="button"
            className="knopf knopf--klein"
            onClick={() =>
              onChange({
                examDeadlines: {
                  title: 'Fristen der Staatsprüfung',
                  announcementWorkdays: { zusammen: 10, getrennt: 5 },
                  saturdaysCount: false,
                  draftDeadlineTime: '12:00',
                },
              })
            }
          >
            <Plus size={14} aria-hidden="true" /> Fristenregeln anlegen
          </button>
        ) : (
          <div className="stapel stapel--eng">
            <div className="raster">
              {EXAM_MODES.map((mode) => (
                <div className="feld" key={mode}>
                  <label htmlFor={`frist-${mode}`}>
                    Werktage vorher · {mode === 'zusammen' ? 'beide Lehrproben an einem Tag' : 'getrennter Ablauf'}
                  </label>
                  <input
                    id={`frist-${mode}`}
                    type="number"
                    min={0}
                    max={60}
                    value={deadlines.announcementWorkdays[mode as ExamMode]}
                    onChange={(event) =>
                      onChange({
                        examDeadlines: {
                          ...deadlines,
                          announcementWorkdays: {
                            ...deadlines.announcementWorkdays,
                            [mode]: Number(event.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
              ))}
              <div className="feld">
                <label htmlFor="frist-uhrzeit">Abgabe bis (Uhrzeit)</label>
                <input
                  id="frist-uhrzeit"
                  type="text"
                  value={deadlines.draftDeadlineTime ?? ''}
                  onChange={(event) =>
                    onChange({ examDeadlines: { ...deadlines, draftDeadlineTime: event.target.value } })
                  }
                />
              </div>
            </div>
            <label className="wahl">
              <input
                type="checkbox"
                checked={deadlines.saturdaysCount}
                onChange={(event) =>
                  onChange({ examDeadlines: { ...deadlines, saturdaysCount: event.target.checked } })
                }
              />
              <span>Samstage zählen als Werktage</span>
            </label>
            <div className="feld">
              <label htmlFor="frist-format">Formale Anforderungen an den Entwurf</label>
              <textarea
                id="frist-format"
                value={deadlines.draftFormat ?? ''}
                onChange={(event) => onChange({ examDeadlines: { ...deadlines, draftFormat: event.target.value } })}
              />
            </div>
          </div>
        )}
      </Collapsible>

      <Collapsible summary="Gewichtung der Gesamtnote">
        {!grades ? (
          <button
            type="button"
            className="knopf knopf--klein"
            onClick={() =>
              onChange({
                gradeModel: {
                  title: 'Gesamtnote',
                  preliminaryWeight: 5,
                  practicalWeight: 3,
                  oralWeight: 1,
                  divisor: 10,
                  roundUpFrom: 0.6,
                },
              })
            }
          >
            <Plus size={14} aria-hidden="true" /> Gewichtung anlegen
          </button>
        ) : (
          <div className="raster">
            <div className="feld">
              <label htmlFor="note-vornote">Gewicht der Vornote</label>
              <input
                id="note-vornote"
                type="number"
                min={0}
                max={20}
                value={grades.preliminaryWeight}
                onChange={(event) =>
                  onChange({ gradeModel: { ...grades, preliminaryWeight: Number(event.target.value) } })
                }
              />
            </div>
            <div className="feld">
              <label htmlFor="note-plp">Gewicht der Prüfungslehrproben</label>
              <input
                id="note-plp"
                type="number"
                min={0}
                max={20}
                value={grades.practicalWeight}
                onChange={(event) =>
                  onChange({ gradeModel: { ...grades, practicalWeight: Number(event.target.value) } })
                }
              />
            </div>
            <div className="feld">
              <label htmlFor="note-muendlich">Gewicht je Teilprüfung</label>
              <input
                id="note-muendlich"
                type="number"
                min={0}
                max={20}
                value={grades.oralWeight}
                onChange={(event) => onChange({ gradeModel: { ...grades, oralWeight: Number(event.target.value) } })}
              />
            </div>
            <div className="feld">
              <label htmlFor="note-teiler">Teiler</label>
              <input
                id="note-teiler"
                type="number"
                min={1}
                max={40}
                value={grades.divisor}
                onChange={(event) => onChange({ gradeModel: { ...grades, divisor: Number(event.target.value) } })}
              />
            </div>
            <div className="feld">
              <label htmlFor="note-rundung">Aufrunden ab Dezimalanteil</label>
              <input
                id="note-rundung"
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={grades.roundUpFrom}
                onChange={(event) => onChange({ gradeModel: { ...grades, roundUpFrom: Number(event.target.value) } })}
              />
            </div>
          </div>
        )}
      </Collapsible>

      <Collapsible summary={`Rahmenangaben (${formatNumber(framework.length)})`}>
        <div className="stapel stapel--eng">
          {framework.map((note, index) => (
            <fieldset className="feldgruppe" key={note.id}>
              <legend>{note.label || 'Ohne Bezeichnung'}</legend>
              <div className="feld">
                <label htmlFor={`rahmen-label-${note.id}`}>Bezeichnung</label>
                <input
                  id={`rahmen-label-${note.id}`}
                  type="text"
                  value={note.label}
                  onChange={(event) =>
                    onChange({
                      framework: framework.map((item, position) =>
                        position === index ? { ...item, label: event.target.value } : item,
                      ),
                    })
                  }
                />
              </div>
              <div className="feld">
                <label htmlFor={`rahmen-text-${note.id}`}>Text</label>
                <textarea
                  id={`rahmen-text-${note.id}`}
                  value={note.text}
                  onChange={(event) =>
                    onChange({
                      framework: framework.map((item, position) =>
                        position === index ? { ...item, text: event.target.value } : item,
                      ),
                    })
                  }
                />
              </div>
              <div className="feld">
                <label htmlFor={`rahmen-quelle-${note.id}`}>Quelle</label>
                <input
                  id={`rahmen-quelle-${note.id}`}
                  type="text"
                  value={note.source ?? ''}
                  onChange={(event) =>
                    onChange({
                      framework: framework.map((item, position) =>
                        position === index ? { ...item, source: event.target.value } : item,
                      ),
                    })
                  }
                />
              </div>
              <button
                type="button"
                className="knopf knopf--klein knopf--gefahr"
                onClick={() => onChange({ framework: framework.filter((_, position) => position !== index) })}
              >
                <Trash2 size={13} aria-hidden="true" /> Angabe entfernen
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="knopf knopf--klein"
            onClick={() =>
              onChange({
                framework: [
                  ...framework,
                  { id: `rahmen-${Date.now().toString(36)}`, label: 'Neue Rahmenangabe', text: '' } satisfies FrameworkNote,
                ],
              })
            }
          >
            <Plus size={14} aria-hidden="true" /> Rahmenangabe hinzufügen
          </button>
        </div>
      </Collapsible>

      <Collapsible summary={`Formularsätze (${formatNumber(template.formSets?.length ?? 0)})`}>
        {!template.formSets || template.formSets.length === 0 ? (
          <p className="klein gedaempft">Für diese Vorlage sind keine Formularsätze hinterlegt.</p>
        ) : (
          <>
            <ul>
              {template.formSets.map((set) => (
                <li key={set.id}>
                  <strong>{set.title}</strong>
                  <span className="klein gedaempft"> · {set.categories.join(', ')}</span>
                  <ul className="klein">
                    {set.forms.map((form) => (
                      <li key={`${set.id}-${form.code ?? form.title}`}>
                        {form.code ? `${form.code} – ` : ''}
                        {form.title}
                        {form.responsible ? ` (${form.responsible})` : ''}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="klein gedaempft">
              Formularsätze lassen sich derzeit nur über die exportierte Vorlagendatei ändern.
            </p>
          </>
        )}
      </Collapsible>
    </Card>
  );
}
