/**
 * Minimaler Router auf Basis von Hash-Adressen. Ohne zusätzliche
 * Abhängigkeit und dadurch auch beim Öffnen aus dem Dateisystem nutzbar.
 */
import { useCallback, useEffect, useState } from 'react';

export const ROUTES = [
  'cockpit',
  'strecke',
  'wegweiser',
  'roadbook',
  'boxenstopp',
  'baukasten',
  'einstellungen',
  'druck',
  'onboarding',
] as const;

export type Route = (typeof ROUTES)[number];

function readHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return (ROUTES as readonly string[]).includes(raw) ? (raw as Route) : 'cockpit';
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => readHash());

  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = `#/${next}`;
  }, []);

  return [route, navigate];
}

export function href(route: Route): string {
  return `#/${route}`;
}

/** Adresse mit einem einzelnen Parameter, z. B. `#/wegweiser?bereich=stunden`. */
export function hrefWithParam(route: Route, key: string, value: string): string {
  return `#/${route}?${key}=${encodeURIComponent(value)}`;
}

/** Liest einen Parameter aus der aktuellen Adresse. */
export function readParam(key: string): string | null {
  const raw = window.location.hash.split('?')[1] ?? '';
  const value = new URLSearchParams(raw).get(key);
  return value && value.length > 0 ? value : null;
}
