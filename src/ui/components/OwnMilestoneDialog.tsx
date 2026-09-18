/**
 * Eigenen Termin aufnehmen. Solche Termine stammen nicht aus der Vorlage und
 * bleiben bei jeder Neuberechnung unverändert.
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from './common';
import { useApp } from '../../state/AppContext';
import { createCustomMilestone } from '../../domain/schedule';
import { MILESTONE_CATEGORIES } from '../../domain/types';
import type { MilestoneCategory } from '../../domain/types';

export function OwnMilestoneDialog({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MilestoneCategory>('Unterrichtsbesuch');
  const [start, setStart] = useState(app.today);
  const [end, setEnd] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('14');
  const [mandatory, setMandatory] = useState(true);
  const [agreed, setAgreed] = useState(true);

  const save = async () => {
    if (!title.trim() || !app.profile) return;
    const lead = Number(leadTimeDays);
    await app.addMilestone(
      createCustomMilestone({
        title: title.trim(),
        description: description.trim(),
        category,
        start,
        end: end || undefined,
        leadTimeDays: Number.isFinite(lead) && lead >= 0 ? lead : 7,
        mandatory,
        agreed,
        templateId: app.profile.templateId,
      }),
    );
    onClose();
  };

  return (
    <Dialog title="Eigenen Termin aufnehmen" onClose={onClose}>
      <p className="klein gedaempft">
        Für Termine, die mit Fachleitung oder Schule vereinbart sind und nicht aus der Vorlage stammen – etwa
        eine Zusatzhospitation, ein Gespräch oder ein Seminartermin.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="feld">
          <label htmlFor="eigen-titel">Bezeichnung</label>
          <input
            id="eigen-titel"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="raster">
          <div className="feld">
            <label htmlFor="eigen-art">Terminart</label>
            <select
              id="eigen-art"
              value={category}
              onChange={(event) => setCategory(event.target.value as MilestoneCategory)}
            >
              {MILESTONE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="feld">
            <label htmlFor="eigen-beginn">Termin</label>
            <input
              id="eigen-beginn"
              type="date"
              value={start}
              onChange={(event) => event.target.value && setStart(event.target.value)}
              required
            />
          </div>
          <div className="feld">
            <label htmlFor="eigen-ende">Ende des Zeitfensters (optional)</label>
            <input id="eigen-ende" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
          <div className="feld">
            <label htmlFor="eigen-vorlauf">Empfohlener Vorlauf in Tagen</label>
            <input
              id="eigen-vorlauf"
              type="number"
              min={0}
              max={180}
              value={leadTimeDays}
              onChange={(event) => setLeadTimeDays(event.target.value)}
            />
          </div>
        </div>
        <div className="feld">
          <label htmlFor="eigen-beschreibung">Beschreibung (optional)</label>
          <textarea
            id="eigen-beschreibung"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <label className="wahl">
          <input type="checkbox" checked={mandatory} onChange={(event) => setMandatory(event.target.checked)} />
          <span>Verbindlicher Termin</span>
        </label>
        <label className="wahl">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>Mit Fachleitung oder Schule vereinbart</span>
        </label>
        <button type="submit" className="knopf knopf--primaer" style={{ marginTop: 12 }} disabled={!title.trim()}>
          <Plus size={15} aria-hidden="true" /> Termin aufnehmen
        </button>
      </form>
    </Dialog>
  );
}
