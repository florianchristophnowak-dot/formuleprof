/**
 * Wegweiser – der persönliche Bestand, der über die Ausbildung hinweg wächst.
 *
 * Sieben Bereiche: Unterrichtseinsatz, Ausbildungsstunden, Unterlagen,
 * Ansprechpersonen, Prüfungsfahrplan, Notenübersicht und Rahmen. Alle
 * Angaben bleiben lokal auf diesem Gerät.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  CalendarClock,
  ClipboardList,
  Compass,
  FileText,
  GraduationCap,
  Timer,
  Users,
} from 'lucide-react';
import { Card, Notice } from '../components/common';
import { useApp } from '../../state/AppContext';
import { buildGuideOverview } from '../../domain/guide';
import { readParam } from '../router';
import { EinsatzPanel } from './wegweiser/EinsatzPanel';
import { StundenPanel } from './wegweiser/StundenPanel';
import { UnterlagenPanel } from './wegweiser/UnterlagenPanel';
import { KontaktePanel } from './wegweiser/KontaktePanel';
import { PruefungPanel } from './wegweiser/PruefungPanel';
import { NotenPanel } from './wegweiser/NotenPanel';
import { RahmenPanel } from './wegweiser/RahmenPanel';

const TABS = [
  { id: 'einsatz', label: 'Unterrichtseinsatz', icon: Timer },
  { id: 'stunden', label: 'Ausbildungsstunden', icon: ClipboardList },
  { id: 'unterlagen', label: 'Unterlagen', icon: FileText },
  { id: 'kontakte', label: 'Ansprechpersonen', icon: Users },
  { id: 'pruefung', label: 'Prüfungsfahrplan', icon: CalendarClock },
  { id: 'noten', label: 'Notenübersicht', icon: GraduationCap },
  { id: 'rahmen', label: 'Rahmen und Quellen', icon: BookMarked },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function Wegweiser() {
  const app = useApp();
  const initial = readParam('bereich');
  const [tab, setTab] = useState<TabId>(isTabId(initial) ? initial : 'einsatz');

  // Aufruf aus dem Cockpit mit Bereichsangabe.
  useEffect(() => {
    const onChange = () => {
      const requested = readParam('bereich');
      if (isTabId(requested)) setTab(requested);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const overview = useMemo(() => {
    if (!app.profile) return [];
    return buildGuideOverview({
      profile: app.profile,
      template: app.activeTemplate,
      milestones: app.milestones,
      teachingWeeks: app.teachingWeeks,
      seminarRecords: app.seminarRecords,
      documents: app.documents,
      contacts: app.contacts,
      examPlan: app.examPlan,
      grades: app.grades,
      goals: app.goals,
      reflections: app.reflections,
      todayIso: app.today,
    });
  }, [
    app.profile,
    app.activeTemplate,
    app.milestones,
    app.teachingWeeks,
    app.seminarRecords,
    app.documents,
    app.contacts,
    app.examPlan,
    app.grades,
    app.goals,
    app.reflections,
    app.today,
  ]);

  if (!app.profile) return null;

  const openCount = overview.filter((area) => area.next !== null).length;

  return (
    <div className="stapel">
      <div>
        <h1>Wegweiser</h1>
        <p className="gedaempft">
          Dein Bestand für die gesamte Ausbildung: Einsatz, Stunden, Unterlagen, Ansprechpersonen, Prüfung und
          Noten. Du füllst ihn Schritt für Schritt – daraus entstehen die Hinweise im Cockpit und die Belege
          für Ausbildungsgespräche.
        </p>
      </div>

      <Card title="Stand deines Wegweisers" icon={<Compass size={18} aria-hidden="true" />} variant="primaer">
        <p className="klein gedaempft">
          {openCount === 0
            ? 'In allen Bereichen ist der Bestand aktuell.'
            : `In ${openCount} von ${overview.length} Bereichen lässt sich etwas ergänzen.`}
        </p>
        <ul className="wegweiser__stand">
          {overview.map((area) => (
            <li key={area.id}>
              <span className={`wegweiser__punkt ${area.started ? 'wegweiser__punkt--begonnen' : ''}`} aria-hidden="true" />
              <span>
                <strong>{area.title}</strong>
                <span className="klein gedaempft"> · {area.status}</span>
                {area.next && <span className="klein wegweiser__naechstes">{area.next}</span>}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="reiter" role="tablist" aria-label="Bereiche des Wegweisers">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`reiter-${id}`}
            aria-selected={tab === id}
            aria-controls={`bereich-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={`reiter__knopf ${tab === id ? 'reiter__knopf--aktiv' : ''}`}
            onClick={() => setTab(id)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
              event.preventDefault();
              const index = TABS.findIndex((item) => item.id === tab);
              const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
              const target = TABS[(next + TABS.length) % TABS.length];
              if (target) {
                setTab(target.id);
                document.getElementById(`reiter-${target.id}`)?.focus();
              }
            }}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`bereich-${tab}`} aria-labelledby={`reiter-${tab}`} tabIndex={-1}>
        {tab === 'einsatz' && <EinsatzPanel />}
        {tab === 'stunden' && <StundenPanel />}
        {tab === 'unterlagen' && <UnterlagenPanel />}
        {tab === 'kontakte' && <KontaktePanel />}
        {tab === 'pruefung' && <PruefungPanel />}
        {tab === 'noten' && <NotenPanel />}
        {tab === 'rahmen' && <RahmenPanel />}
      </div>

      <Notice>
        Alle Angaben des Wegweisers liegen ausschliesslich auf diesem Gerät und sind Teil der Sicherung. In der
        Streckendatei für die Fachleitung sind sie nicht enthalten.
      </Notice>
    </div>
  );
}
