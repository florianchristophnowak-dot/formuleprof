/**
 * Roadbook – kurze, handlungsorientierte Informationen zu jeder Etappe.
 * Ausführliche Inhalte sind aufklappbar, um Textwände zu vermeiden.
 */
import { useMemo, useState } from 'react';
import { BookOpen, ClipboardList, FileText, HelpCircle, Lightbulb, Users } from 'lucide-react';
import { Card, Collapsible } from '../components/common';
import { useApp } from '../../state/AppContext';
import { phaseAtDate, phaseBoundaries } from '../../domain/schedule';
import { formatRange } from '../../domain/dates';
import type { RoadbookEntry } from '../../domain/types';

const SECTIONS: { key: keyof RoadbookEntry; title: string; icon: JSX.Element }[] = [
  { key: 'expectations', title: 'Was wird erwartet?', icon: <ClipboardList size={16} aria-hidden="true" /> },
  { key: 'preparation', title: 'Was sollte vorbereitet werden?', icon: <Lightbulb size={16} aria-hidden="true" /> },
  { key: 'documents', title: 'Welche Unterlagen werden benötigt?', icon: <FileText size={16} aria-hidden="true" /> },
  { key: 'uncertainties', title: 'Typische Unsicherheiten', icon: <HelpCircle size={16} aria-hidden="true" /> },
  { key: 'support', title: 'Wer kann unterstützen?', icon: <Users size={16} aria-hidden="true" /> },
  { key: 'carryOver', title: 'Was aus vorherigen Etappen hilft', icon: <BookOpen size={16} aria-hidden="true" /> },
];

export function Roadbook() {
  const app = useApp();
  const [query, setQuery] = useState('');

  const currentPhaseId = useMemo(() => {
    if (!app.activeTemplate || !app.profile) return null;
    return phaseAtDate(
      app.activeTemplate.phases,
      app.profile.startDate,
      app.profile.durationMonths,
      app.today,
    )?.id ?? null;
  }, [app.activeTemplate, app.profile, app.today]);

  if (!app.activeTemplate || !app.profile) return null;
  const template = app.activeTemplate;
  const profile = app.profile;

  const boundaries = phaseBoundaries(template.phases, profile.startDate, profile.durationMonths);
  const phases = boundaries
    .map((boundary) => boundary.phase)
    .filter((phase) => {
      if (!query.trim()) return true;
      const haystack = [
        phase.title,
        phase.summary,
        ...Object.values(phase.roadbook).flat(),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });

  return (
    <div className="stapel">
      <div>
        <h1>Roadbook</h1>
        <p className="gedaempft">
          Kurzinformationen zu jeder Etappe. Ausführliche Hinweise lassen sich bei Bedarf aufklappen.
        </p>
      </div>

      <div className="feld nicht-drucken" style={{ maxWidth: 420 }}>
        <label htmlFor="roadbook-suche">Etappen durchsuchen</label>
        <input
          id="roadbook-suche"
          type="search"
          value={query}
          placeholder="z. B. Lehrprobe, Unterlagen, Beurteilung"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {phases.length === 0 && <p>Keine Etappe passt zur Suche.</p>}

      {phases.map((phase) => {
        const boundary = boundaries.find((item) => item.phase.id === phase.id);
        const start = boundary?.start ?? profile.startDate;
        const end = boundary?.end ?? profile.startDate;
        const milestones = app.milestones.filter((m) => m.phaseId === phase.id);
        return (
          <Card
            key={phase.id}
            as="article"
            variant={currentPhaseId === phase.id ? 'primaer' : undefined}
          >
            <div className="reihe">
              <h2 style={{ marginRight: 'auto', marginBottom: 0 }}>{phase.title}</h2>
              {currentPhaseId === phase.id && <span className="marke marke--aktuell">aktuelle Etappe</span>}
              {phase.demanding && <span className="marke">anspruchsvolle Passage</span>}
            </div>
            <p className="klein gedaempft" style={{ margin: '4px 0 12px' }}>
              {formatRange(start, end)} · {phase.summary}
            </p>

            {SECTIONS.map((section) => {
              const items = phase.roadbook[section.key];
              if (!items || items.length === 0) return null;
              return (
                <Collapsible
                  key={section.key}
                  summary={section.title}
                  icon={section.icon}
                  defaultOpen={section.key === 'expectations' && currentPhaseId === phase.id}
                >
                  <ul>
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Collapsible>
              );
            })}

            {milestones.length > 0 && (
              <Collapsible summary={`Meilensteine dieser Etappe (${milestones.length})`}>
                <ul>
                  {milestones.map((milestone) => (
                    <li key={milestone.id}>
                      <strong>{milestone.title}</strong> – {milestone.description}
                    </li>
                  ))}
                </ul>
              </Collapsible>
            )}
          </Card>
        );
      })}

      <p className="klein gedaempft">
        Grundlage ist die Vorlage „{template.title}“ ({template.version}, {template.validAsOf}).
        {template.demo && ' Es handelt sich um Demodaten ohne rechtliche Verbindlichkeit.'}
      </p>
    </div>
  );
}
