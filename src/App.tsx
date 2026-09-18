/** Anwendungsgerüst: Navigation, Themenwahl und Seitenauswahl. */
import { useEffect } from 'react';
import { BookOpen, Compass, Gauge, Route as RouteIcon, Settings, Waypoints, Wrench } from 'lucide-react';
import { useApp } from './state/AppContext';
import { href, useRoute } from './ui/router';
import type { Route } from './ui/router';
import { Cockpit } from './ui/views/Cockpit';
import { Strecke } from './ui/views/Strecke';
import { Wegweiser } from './ui/views/Wegweiser';
import { Roadbook } from './ui/views/Roadbook';
import { Boxenstopp } from './ui/views/Boxenstopp';
import { Streckenbaukasten } from './ui/views/Streckenbaukasten';
import { Einstellungen } from './ui/views/Einstellungen';
import { Druckansicht } from './ui/views/Druckansicht';
import { Onboarding } from './ui/onboarding/Onboarding';
import { APP_NAME, APP_SUBTITLE, APP_VERSION } from './domain/types';

/**
 * Die kompakten Beschriftungen enthalten bedingte Trennstriche (weiche
 * Trennzeichen). Dadurch bricht die untere Navigationsleiste auf schmalen
 * Displays an sinnvollen Stellen um.
 */
const NAVIGATION: { route: Route; label: string; shortLabel: string; icon: typeof Gauge }[] = [
  { route: 'cockpit', label: 'Cockpit', shortLabel: 'Cock\u00ADpit', icon: Gauge },
  { route: 'strecke', label: 'Strecke', shortLabel: 'Stre\u00ADcke', icon: RouteIcon },
  { route: 'wegweiser', label: 'Wegweiser', shortLabel: 'Weg\u00ADweiser', icon: Compass },
  { route: 'roadbook', label: 'Roadbook', shortLabel: 'Road\u00ADbook', icon: BookOpen },
  { route: 'boxenstopp', label: 'Boxenstopp', shortLabel: 'Boxen\u00ADstopp', icon: Waypoints },
  { route: 'baukasten', label: 'Baukasten', shortLabel: 'Bau\u00ADkasten', icon: Wrench },
  { route: 'einstellungen', label: 'Einstellungen', shortLabel: 'Einstel\u00ADlungen', icon: Settings },
];

export function App() {
  const app = useApp();
  const [route, navigate] = useRoute();

  // Gewählte Darstellung auf das Dokument anwenden.
  useEffect(() => {
    const root = document.documentElement;
    if (app.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', app.settings.theme);
  }, [app.settings.theme]);

  useEffect(() => {
    document.title = `${APP_NAME} – ${APP_SUBTITLE}`;
  }, []);

  // Ohne abgeschlossenes Onboarding führt jeder Weg zunächst dorthin.
  const needsOnboarding = app.status === 'bereit' && !app.profile?.onboardingCompleted;

  useEffect(() => {
    if (needsOnboarding && route !== 'onboarding') navigate('onboarding');
  }, [needsOnboarding, route, navigate]);

  return (
    <div className="app">
      <a className="sprungmarke" href="#hauptinhalt">
        Zum Hauptinhalt springen
      </a>

      <header className="kopfzeile">
        <div className="kopfzeile__inhalt">
          <div className="kopfzeile__marke">
            <span className="kopfzeile__logo" aria-hidden="true">
              FP
            </span>
            <div>
              <p className="kopfzeile__titel">{APP_NAME}</p>
              <p className="kopfzeile__untertitel">{APP_SUBTITLE}</p>
            </div>
          </div>
          {!needsOnboarding && (
            <nav className="hauptnavigation" aria-label="Hauptnavigation">
              <ul className="hauptnavigation__liste">
                {NAVIGATION.map(({ route: target, label, icon: Icon }) => (
                  <li key={target}>
                    <a
                      className="hauptnavigation__link"
                      href={href(target)}
                      aria-current={route === target ? 'page' : undefined}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>

      <main className="inhalt" id="hauptinhalt" tabIndex={-1}>
        {app.status === 'laden' && <p role="status">Lokale Daten werden geladen …</p>}
        {app.status === 'fehler' && (
          <div className="fehler" role="alert">
            <h1>Die lokalen Daten konnten nicht geladen werden</h1>
            <p>{app.error}</p>
            <p className="klein">
              Möglicherweise ist die Speicherung im privaten Modus des Browsers eingeschränkt. Die App lässt sich
              dennoch verwenden, Angaben gehen dann aber beim Schliessen verloren.
            </p>
          </div>
        )}
        {app.status === 'bereit' && (
          <>
            {route === 'onboarding' && <Onboarding navigate={navigate} />}
            {!needsOnboarding && route === 'cockpit' && <Cockpit navigate={navigate} />}
            {!needsOnboarding && route === 'strecke' && <Strecke navigate={navigate} />}
            {!needsOnboarding && route === 'wegweiser' && <Wegweiser />}
            {!needsOnboarding && route === 'roadbook' && <Roadbook />}
            {!needsOnboarding && route === 'boxenstopp' && <Boxenstopp />}
            {!needsOnboarding && route === 'baukasten' && <Streckenbaukasten />}
            {!needsOnboarding && route === 'einstellungen' && <Einstellungen />}
            {!needsOnboarding && route === 'druck' && <Druckansicht />}
          </>
        )}
      </main>

      <footer className="fusszeile">
        <p style={{ margin: 0 }}>
          {APP_NAME} · Version {APP_VERSION} · © Florian Nowak
        </p>
        <p className="klein fusszeile-bildschirm" style={{ margin: '4px 0 0' }}>
          Alle Daten bleiben lokal auf diesem Gerät. Mitgelieferte Inhalte sind Demodaten und keine rechtlich
          verbindliche Vorgabe.
        </p>
      </footer>

      {!needsOnboarding && app.status === 'bereit' && (
        <nav className="tableiste nicht-drucken" aria-label="Hauptnavigation (kompakt)">
          {NAVIGATION.map(({ route: target, label, shortLabel, icon: Icon }) => (
            <a
              key={target}
              className="tableiste__link"
              href={href(target)}
              aria-current={route === target ? 'page' : undefined}
              aria-label={label}
            >
              <Icon size={18} aria-hidden="true" />
              <span aria-hidden="true">{shortLabel}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
