/**
 * Notenübersicht. Eigene Punktzahlen, daraus die Gesamtpunktzahl nach der
 * Gewichtung der Vorlage. Kein Vergleich mit anderen Personen; verbindlich ist
 * allein die Festsetzung durch das Prüfungsamt.
 */
import { useMemo } from 'react';
import { GraduationCap, Info } from 'lucide-react';
import { Card, Notice } from '../../components/common';
import { useApp } from '../../../state/AppContext';
import { formatNumber } from '../../../domain/dates';
import {
  MAX_POINTS,
  computeFinalGrade,
  createGradeRecord,
  formatPoints,
  pointsToGradeLabel,
} from '../../../domain/grades';
import type { ExamPartResult, GradeRecord } from '../../../domain/types';

type PartGroup = 'teachingSamples' | 'practical' | 'oral';

export function NotenPanel() {
  const app = useApp();
  const model = app.activeTemplate?.gradeModel;
  const record = app.grades;

  const calculation = useMemo(() => computeFinalGrade(record, model), [record, model]);

  /** Legt die Felder beim ersten Eintrag an und führt den Stand fort. */
  const withRecord = (change: (base: GradeRecord) => GradeRecord) =>
    app.saveGrades((current) => change(current ?? createGradeRecord(app.profile?.subjects ?? [])));

  const toPoints = (raw: string): number | undefined => {
    if (raw === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const setPoints = (group: PartGroup, id: string, raw: string) =>
    withRecord((base) => ({
      ...base,
      [group]: base[group].map((part) => (part.id === id ? { ...part, points: toPoints(raw) } : part)),
    }));

  const setPreliminary = (raw: string) => withRecord((base) => ({ ...base, preliminary: toPoints(raw) }));

  const setNote = (value: string) => withRecord((base) => ({ ...base, note: value }));

  const groups: { key: PartGroup; title: string; hint: string; parts: ExamPartResult[] }[] = [
    {
      key: 'teachingSamples',
      title: 'Benotete Lehrproben',
      hint: 'Sie gehen über die Beurteilungen in die Vornote ein und werden nicht gesondert gewichtet.',
      parts: record?.teachingSamples ?? [],
    },
    {
      key: 'practical',
      title: 'Praktische Prüfungslehrproben',
      hint: model ? `Der Durchschnitt zählt ${formatNumber(model.practicalWeight)}-fach.` : '',
      parts: record?.practical ?? [],
    },
    {
      key: 'oral',
      title: 'Mündliche Teilprüfungen',
      hint: model ? `Jede Teilprüfung zählt ${formatNumber(model.oralWeight)}-fach.` : '',
      parts: record?.oral ?? [],
    },
  ];

  return (
    <div className="stapel">
      <Card title="Punktzahlen erfassen" icon={<GraduationCap size={18} aria-hidden="true" />} variant="primaer">
        <p className="klein gedaempft">
          Eingetragen werden Punktzahlen von 0 bis {formatNumber(MAX_POINTS)}. Die Übersicht dient dir selbst –
          sie ist kein Vergleich und keine amtliche Berechnung.
        </p>

        <div className="feld" style={{ maxWidth: 260 }}>
          <label htmlFor="noten-vornote">
            Vornote in Punkten
            {model ? ` (${formatNumber(model.preliminaryWeight)}-fache Gewichtung)` : ''}
          </label>
          <input
            id="noten-vornote"
            type="number"
            min={0}
            max={MAX_POINTS}
            step={1}
            inputMode="numeric"
            value={record?.preliminary ?? ''}
            onChange={(event) => setPreliminary(event.target.value)}
          />
          {record?.preliminary !== undefined && (
            <span className="klein gedaempft">{pointsToGradeLabel(record.preliminary)}</span>
          )}
        </div>

        {!record && (
          <p className="klein gedaempft">
            Die Felder für Lehrproben und Prüfungsteile werden angelegt, sobald du den ersten Wert eintragst.
          </p>
        )}

        {groups.map((group) =>
          group.parts.length === 0 ? null : (
            <fieldset className="feldgruppe" key={group.key}>
              <legend>{group.title}</legend>
              {group.hint && <p className="klein gedaempft" style={{ marginTop: 0 }}>{group.hint}</p>}
              <div className="raster">
                {group.parts.map((part) => (
                  <div className="feld" key={part.id}>
                    <label htmlFor={`noten-${part.id}`}>{part.label}</label>
                    <input
                      id={`noten-${part.id}`}
                      type="number"
                      min={0}
                      max={MAX_POINTS}
                      step={1}
                      inputMode="numeric"
                      value={part.points ?? ''}
                      onChange={(event) => setPoints(group.key, part.id, event.target.value)}
                    />
                    {part.points !== undefined && (
                      <span className="klein gedaempft">{pointsToGradeLabel(part.points)}</span>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
          ),
        )}

        <div className="feld">
          <label htmlFor="noten-notiz">Notiz (optional)</label>
          <textarea
            id="noten-notiz"
            value={record?.note ?? ''}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </Card>

      <Card title="Berechnung der Gesamtnote">
        {!model ? (
          <p className="klein gedaempft">Für diese Vorlage ist keine Gewichtung hinterlegt.</p>
        ) : (
          <>
            <p className="klein gedaempft">
              {model.title}: Vornote {formatNumber(model.preliminaryWeight)}-fach, Durchschnitt der praktischen
              Prüfungslehrproben {formatNumber(model.practicalWeight)}-fach, jede mündliche Teilprüfung{' '}
              {formatNumber(model.oralWeight)}-fach, geteilt durch {formatNumber(model.divisor)}. Zwischenwerte bis
              0,5 werden zur schlechteren, ab {model.roundUpFrom.toLocaleString('de-DE')} zur besseren Punktzahl
              gerundet.
            </p>

            {calculation.complete ? (
              <>
                <p className="countdown" style={{ marginBottom: 0 }}>
                  {formatNumber(calculation.points ?? 0)} Punkte
                </p>
                <p style={{ marginTop: 0 }}>
                  Notenstufe: <strong>{calculation.gradeLabel}</strong>
                </p>
                <dl className="zusammenfassung">
                  <dt>Rechenweg</dt>
                  <dd className="klein">
                    Vornote {formatPoints(calculation.preliminary ?? 0)} × {formatNumber(model.preliminaryWeight)} +
                    Durchschnitt der Prüfungslehrproben {formatPoints(calculation.practicalAverage ?? 0)} ×{' '}
                    {formatNumber(model.practicalWeight)} + mündliche Teilprüfungen{' '}
                    {calculation.oralPoints.map((value) => formatPoints(value)).join(' + ')} ={' '}
                    {formatPoints(calculation.weightedSum ?? 0)}; geteilt durch {formatNumber(model.divisor)} ergibt{' '}
                    {formatPoints(calculation.raw ?? 0)}.
                  </dd>
                </dl>
              </>
            ) : (
              <>
                <p>Die Gesamtpunktzahl wird berechnet, sobald alle Angaben vorliegen.</p>
                <ul className="klein" style={{ paddingLeft: 18 }}>
                  {calculation.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {calculation.practicalAverage !== null && (
                  <p className="klein gedaempft">
                    Bisheriger Durchschnitt der Prüfungslehrproben: {formatPoints(calculation.practicalAverage)}{' '}
                    Punkte.
                  </p>
                )}
              </>
            )}

            {calculation.failures.length > 0 && (
              <Notice tone="fehler">
                <strong>Hinweis zum Bestehen:</strong>
                <ul className="klein" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {calculation.failures.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="klein" style={{ marginBottom: 0 }}>
                  Bei „ungenügend“ in einer Prüfungslehrprobe oder Teilprüfung ist die Prüfung nicht bestanden. Eine
                  einmalige Wiederholung ist möglich.
                </p>
              </Notice>
            )}

            <p className="klein gedaempft">
              <Info size={13} aria-hidden="true" /> Die Zuordnung von Punktzahlen zu Notenstufen folgt dem üblichen
              Punkteschema. Verbindlich ist die Festsetzung durch das Prüfungsamt.
              {model.source ? ` Quelle: ${model.source}` : ''}
            </p>
          </>
        )}
      </Card>

      <Notice>
        Punktzahlen bleiben auf diesem Gerät. Sie sind Teil der Sicherung, erscheinen aber nicht in der
        Streckendatei und nur auf ausdrücklichen Wunsch in der Druckansicht.
      </Notice>
    </div>
  );
}
