/**
 * Rahmen und Quellen: nachlesbare Angaben zu Zuständigkeiten, Dauer,
 * Ausbildungsunterricht, Prüfung und Wiederholung – jeweils mit Quelle.
 */
import { BookMarked, Info } from 'lucide-react';
import { Card, Collapsible, Notice } from '../../components/common';
import { useApp } from '../../../state/AppContext';
import { formatNumber } from '../../../domain/dates';
import { stageText } from '../../../domain/teachingLoad';

export function RahmenPanel() {
  const app = useApp();
  const template = app.activeTemplate;
  const framework = template?.framework ?? [];

  return (
    <div className="stapel">
      <Card title="Rahmen der Ausbildung" icon={<BookMarked size={18} aria-hidden="true" />} variant="primaer">
        {framework.length === 0 ? (
          <p className="klein gedaempft">
            Für die Vorlage „{template?.title ?? 'ohne Vorlage'}“ sind keine Rahmenangaben hinterlegt. Im
            Streckenbaukasten lassen sie sich ergänzen.
          </p>
        ) : (
          <>
            <p className="klein gedaempft">
              Grundlage ist die Vorlage „{template?.title}“ ({template?.version}, {template?.validAsOf}).
            </p>
            {framework.map((note) => (
              <Collapsible key={note.id} summary={note.label}>
                <p style={{ marginTop: 0 }}>{note.text}</p>
                {note.source && <p className="klein gedaempft" style={{ marginBottom: 0 }}>Quelle: {note.source}</p>}
              </Collapsible>
            ))}
          </>
        )}
      </Card>

      {template?.teachingLoad && (
        <Card title="Unterrichtsverpflichtung im Überblick">
          <div className="tabelle__rollbereich">
            <table className="tabelle">
              <caption className="nur-lesbar">Soll-Korridore der Unterrichtsverpflichtung</caption>
              <thead>
                <tr>
                  <th scope="col">Abschnitt</th>
                  <th scope="col">Wochenstunden</th>
                </tr>
              </thead>
              <tbody>
                {template.teachingLoad.stages.map((stage) => (
                  <tr key={stage.id}>
                    <th scope="row">{stage.title}</th>
                    <td>{stageText(stage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="klein gedaempft" style={{ marginTop: 8 }}>
            H = Hospitation, aU = angeleiteter Unterricht, sU = selbstständiger Unterricht. Richtwert insgesamt:{' '}
            {formatNumber(template.teachingLoad.weeklyTotal)} Wochenstunden.
            {template.teachingLoad.note ? ` ${template.teachingLoad.note}` : ''}
          </p>
        </Card>
      )}

      {template?.seminarRequirements && template.seminarRequirements.length > 0 && (
        <Card title="Mindestumfang der Ausbildungsstunden">
          <ul>
            {[...template.seminarRequirements]
              .sort((a, b) => a.durationMonths - b.durationMonths)
              .map((requirement) => (
                <li key={requirement.durationMonths}>
                  {formatNumber(requirement.durationMonths)} Monate Vorbereitungsdienst: mindestens{' '}
                  {formatNumber(requirement.hours)} Stunden à 60 Minuten
                </li>
              ))}
          </ul>
          <p className="klein gedaempft">
            Die Veranstaltungen des Studienseminars haben Vorrang vor jeder anderen Tätigkeit.
          </p>
        </Card>
      )}

      {template?.formSets && template.formSets.length > 0 && (
        <Card title="Formularsätze der Vorlage">
          {template.formSets.map((set) => (
            <Collapsible key={set.id} summary={set.title}>
              <ul>
                {set.forms.map((form) => (
                  <li key={`${set.id}-${form.code ?? form.title}`}>
                    <strong>
                      {form.code ? `${form.code} – ` : ''}
                      {form.title}
                    </strong>
                    {form.responsible && <span className="klein gedaempft"> · zuständig: {form.responsible}</span>}
                    {form.note && <p className="klein" style={{ margin: '2px 0 0' }}>{form.note}</p>}
                  </li>
                ))}
              </ul>
              {set.source && <p className="klein gedaempft">Quelle: {set.source}</p>}
            </Collapsible>
          ))}
        </Card>
      )}

      <Notice>
        <Info size={15} aria-hidden="true" /> Die Angaben sind eine Lesehilfe und keine amtliche Wiedergabe.
        Verbindlich sind die jeweils geltenden Ordnungen sowie die Absprachen mit Studienseminar und Schule.
        {template?.demo ? ' Diese Vorlage ist als Beispielvorlage gekennzeichnet.' : ''}
      </Notice>
    </div>
  );
}
