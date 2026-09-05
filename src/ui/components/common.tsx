/** Wiederverwendbare, barrierearme Grundbausteine der Oberfläche. */
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { formatPercent } from '../../domain/dates';
import type { TrackState } from '../../domain/types';

export function Card({
  title,
  icon,
  actions,
  variant,
  children,
  as: Element = 'section',
}: {
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: 'primaer' | 'akzent';
  children: ReactNode;
  as?: 'section' | 'article' | 'div';
}) {
  const className = ['karte', variant ? `karte--${variant}` : ''].filter(Boolean).join(' ');
  return (
    <Element className={className}>
      {title && (
        <div className="karte__kopf">
          {icon}
          <h2>{title}</h2>
          {actions && <div style={{ marginLeft: 'auto' }}>{actions}</div>}
        </div>
      )}
      {children}
    </Element>
  );
}

export function ProgressBar({
  label,
  value,
  description,
  tone = 'primaer',
}: {
  label: string;
  value: number;
  description?: string;
  tone?: 'primaer' | 'akzent' | 'gedaempft';
}) {
  const percent = Math.min(Math.max(value, 0), 1);
  const toneClass =
    tone === 'akzent' ? 'fortschritt__wert--akzent' : tone === 'gedaempft' ? 'fortschritt__wert--gedaempft' : '';
  return (
    <div className="fortschritt">
      <div className="fortschritt__kopf">
        <span>{label}</span>
        <span aria-hidden="true">{formatPercent(percent)}</span>
      </div>
      <div
        className="fortschritt__balken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent * 100)}
        aria-label={`${label}: ${formatPercent(percent)}`}
      >
        <div className={`fortschritt__wert ${toneClass}`} style={{ width: `${percent * 100}%` }} />
      </div>
      {description && <p className="klein gedaempft" style={{ margin: '4px 0 0' }}>{description}</p>}
    </div>
  );
}

const STATE_CLASS: Record<TrackState, string> = {
  abgeschlossen: 'marke--abgeschlossen',
  aktuell: 'marke--aktuell',
  'als Nächstes': 'marke--naechstes',
  später: 'marke--spaeter',
  überfällig: 'marke--ueberfaellig',
  verschoben: 'marke--verschoben',
  entfällt: 'marke--entfaellt',
};

export function StateBadge({ state }: { state: TrackState }) {
  return <span className={`marke ${STATE_CLASS[state]}`}>{state}</span>;
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="marke">{children}</span>;
}

/** Modaler Dialog mit Fokusfalle, Escape-Bedienung und Rücksprung des Fokus. */
export function Dialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusable = node?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = [
        ...node.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => !element.hasAttribute('disabled'));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="dialog-hintergrund nicht-drucken"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
        <div className="dialog__kopf">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="knopf knopf--schlicht knopf--klein" onClick={onClose}>
            <X size={16} aria-hidden="true" /> Schliessen
          </button>
        </div>
        {children}
        {footer && <div className="reihe" style={{ marginTop: 16 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Collapsible({
  summary,
  children,
  defaultOpen = false,
  icon,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
}) {
  return (
    <details className="klapp" open={defaultOpen}>
      <summary>
        {icon}
        {summary}
      </summary>
      <div className="klapp__inhalt">{children}</div>
    </details>
  );
}

export function Field({
  label,
  hint,
  children,
  id,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <span className="feld__hinweis" id={`${id}-hinweis`}>
          {hint}
        </span>
      )}
      {children}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'fehler' | 'erfolg'; children: ReactNode }) {
  const className = tone === 'fehler' ? 'fehler' : tone === 'erfolg' ? 'erfolg' : 'karte karte--primaer';
  return (
    <div className={className} role={tone === 'fehler' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

/** Löst einen Download aus, ohne dass Daten das Gerät verlassen. */
export function downloadFile(name: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
