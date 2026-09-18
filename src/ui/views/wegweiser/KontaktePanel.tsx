/**
 * Ansprechpersonen und Zuständigkeiten. Wer ist wofür zuständig – und wie
 * erreichbar? Alle Angaben bleiben lokal.
 */
import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Card, Notice } from '../../components/common';
import { useApp } from '../../../state/AppContext';
import { formatNumber } from '../../../domain/dates';
import { CONTACT_ROLES } from '../../../domain/types';
import type { ContactEntry, ContactRole } from '../../../domain/types';

interface Draft {
  id: string | null;
  name: string;
  role: ContactRole;
  subject: string;
  email: string;
  phone: string;
  note: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  name: '',
  role: 'Fachleitung',
  subject: '',
  email: '',
  phone: '',
  note: '',
};

export function KontaktePanel() {
  const app = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<ContactRole, ContactEntry[]>();
    for (const role of CONTACT_ROLES) {
      const entries = app.contacts.filter((contact) => contact.role === role);
      if (entries.length > 0) groups.set(role, entries.sort((a, b) => a.name.localeCompare(b.name, 'de')));
    }
    return [...groups.entries()];
  }, [app.contacts]);

  const save = async () => {
    if (!draft.name.trim()) return;
    const entry: ContactEntry = {
      id: draft.id ?? `kontakt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: draft.name.trim(),
      role: draft.role,
      subject: draft.subject.trim() || undefined,
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      note: draft.note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    await app.saveContact(entry);
    setDraft(EMPTY_DRAFT);
    setMessage(`„${entry.name}“ wurde gespeichert.`);
  };

  return (
    <div className="stapel">
      {message && <Notice tone="erfolg">{message}</Notice>}

      <Card title="Zuständigkeiten" icon={<Users size={18} aria-hidden="true" />} variant="primaer">
        <p className="klein gedaempft">
          Trage ein, wer dich begleitet: Fachleitungen, Ausbildungslehrkräfte, Mentorin oder Mentor,
          Schulleitung, Seminarleitung, Regionalstelle, Schulamt, Prüfungsamt und Personalrat. Welche Stelle
          welche Aufgabe hat, steht im Bereich „Rahmen und Quellen“.
        </p>
      </Card>

      <Card title={draft.id ? 'Eintrag ändern' : 'Ansprechperson aufnehmen'}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="raster">
            <div className="feld">
              <label htmlFor="kontakt-name">Name oder Stelle</label>
              <input
                id="kontakt-name"
                type="text"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                required
              />
            </div>
            <div className="feld">
              <label htmlFor="kontakt-rolle">Zuständigkeit</label>
              <select
                id="kontakt-rolle"
                value={draft.role}
                onChange={(event) => setDraft({ ...draft, role: event.target.value as ContactRole })}
              >
                {CONTACT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="kontakt-fach">Fach (optional)</label>
              <input
                id="kontakt-fach"
                type="text"
                list="kontakt-faecher"
                value={draft.subject}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
              />
              <datalist id="kontakt-faecher">
                {(app.profile?.subjects ?? []).map((subject) => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
            </div>
            <div className="feld">
              <label htmlFor="kontakt-mail">E-Mail (optional)</label>
              <input
                id="kontakt-mail"
                type="text"
                inputMode="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </div>
            <div className="feld">
              <label htmlFor="kontakt-telefon">Telefon (optional)</label>
              <input
                id="kontakt-telefon"
                type="text"
                inputMode="tel"
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </div>
          </div>
          <div className="feld">
            <label htmlFor="kontakt-notiz">Notiz (optional)</label>
            <input
              id="kontakt-notiz"
              type="text"
              value={draft.note}
              placeholder="z. B. Sprechzeiten, Schultag an der Schule"
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </div>
          <div className="reihe">
            <button type="submit" className="knopf knopf--primaer">
              <Plus size={15} aria-hidden="true" /> {draft.id ? 'Änderung speichern' : 'Eintrag speichern'}
            </button>
            {draft.id && (
              <button type="button" className="knopf" onClick={() => setDraft(EMPTY_DRAFT)}>
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title={`Erfasste Ansprechpersonen (${formatNumber(app.contacts.length)})`}>
        {grouped.length === 0 ? (
          <p className="klein gedaempft">Noch kein Eintrag vorhanden.</p>
        ) : (
          grouped.map(([role, entries]) => (
            <section key={role} style={{ marginBottom: 12 }}>
              <h3 style={{ marginBottom: 6 }}>{role}</h3>
              <ul className="stapel stapel--eng" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {entries.map((contact) => (
                  <li key={contact.id} className="vorschlag">
                    <div>
                      <strong>{contact.name}</strong>
                      {contact.subject && <span className="klein gedaempft"> · {contact.subject}</span>}
                      {(contact.email || contact.phone) && (
                        <p className="klein" style={{ margin: '2px 0 0' }}>
                          {[contact.email, contact.phone].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {contact.note && (
                        <p className="klein gedaempft" style={{ margin: '2px 0 0' }}>
                          {contact.note}
                        </p>
                      )}
                    </div>
                    <div className="reihe">
                      <button
                        type="button"
                        className="knopf knopf--klein knopf--schlicht"
                        onClick={() => {
                          setDraft({
                            id: contact.id,
                            name: contact.name,
                            role: contact.role,
                            subject: contact.subject ?? '',
                            email: contact.email ?? '',
                            phone: contact.phone ?? '',
                            note: contact.note ?? '',
                          });
                          setMessage(null);
                          document.getElementById('kontakt-name')?.focus();
                        }}
                      >
                        <Pencil size={13} aria-hidden="true" /> Ändern
                      </button>
                      <button
                        type="button"
                        className="knopf knopf--klein knopf--schlicht"
                        onClick={() => app.removeContact(contact.id)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        <span className="nur-lesbar">„{contact.name}“ löschen</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </Card>
    </div>
  );
}
