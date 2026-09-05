import { describe, expect, it } from 'vitest';
import { cohortCodeWarning, formatCohortCode, parseCohortCode, requireCohortCode } from '../domain/cohortCode';

describe('Jahrgangscode', () => {
  it('liest 02-26-18 als Februar 2026 mit 18 Monaten Dauer', () => {
    const result = parseCohortCode('02-26-18');
    expect(result).not.toBeNull();
    expect(result?.month).toBe(2);
    expect(result?.year).toBe(2026);
    expect(result?.durationMonths).toBe(18);
    expect(result?.startDate).toBe('2026-02-01');
  });

  it('akzeptiert Varianten mit Punkt, Schrägstrich und Leerzeichen', () => {
    expect(parseCohortCode('08/25/24')?.startDate).toBe('2025-08-01');
    expect(parseCohortCode(' 8 - 25 - 12 ')?.durationMonths).toBe(12);
    expect(parseCohortCode('02.2026.18')?.year).toBe(2026);
  });

  it('weist unsinnige Codes zurück', () => {
    expect(parseCohortCode('13-26-18')).toBeNull();
    expect(parseCohortCode('02-26')).toBeNull();
    expect(parseCohortCode('Hallo')).toBeNull();
    expect(parseCohortCode('02-26-99')).toBeNull();
  });

  it('wirft eine verständliche Fehlermeldung', () => {
    expect(() => requireCohortCode('abc')).toThrowError(/Jahrgangscode/);
  });

  it('weist auf ungewöhnliche Ausbildungsdauern hin', () => {
    expect(cohortCodeWarning(requireCohortCode('02-26-18'))).toBeNull();
    expect(cohortCodeWarning(requireCohortCode('02-26-13'))).toMatch(/ungewöhnlich/);
  });

  it('formatiert einen Code zurück', () => {
    expect(formatCohortCode(2, 2026, 18)).toBe('02-26-18');
  });
});
