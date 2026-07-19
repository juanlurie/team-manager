// fmtDuration/parseDuration moved to core/utils/time-format.ts — covered by time-format.spec.ts.
// This file keeps the retro-local helpers. One case stays here: the re-export must keep working,
// because the store reaches them via `import * as F from './retro-format'`.
import { fmtDuration, parseDuration, shortName, initials, avatarTint, avatarInk, ratioPct } from './retro-format';

describe('retro-format', () => {
  describe('clock re-exports', () => {
    it('still surfaces fmtDuration/parseDuration for the store F.* delegates', () => {
      expect(fmtDuration(90)).toBe('1:30');
      expect(parseDuration('1:30')).toBe(90);
    });
  });

  describe('shortName / initials', () => {
    it('takes the first word / up to two initials', () => {
      expect(shortName('Lea Müller')).toBe('Lea');
      expect(initials('Lea Müller')).toBe('LM');
      expect(initials('Cher')).toBe('C');
    });
    it('handles empty input safely', () => {
      expect(shortName('')).toBe('—');
      expect(initials('')).toBe('?');
    });
  });

  describe('avatar colours', () => {
    it('are deterministic for a given id', () => {
      expect(avatarTint('abc')).toBe(avatarTint('abc'));
      expect(avatarInk('abc')).toBe(avatarInk('abc'));
    });
    it('produce valid hsl strings', () => {
      expect(avatarTint('member-1')).toMatch(/^hsl\(\d{1,3} 45% 22%\)$/);
      expect(avatarInk('member-1')).toMatch(/^hsl\(\d{1,3} 70% 70%\)$/);
    });
  });

  describe('ratioPct', () => {
    it('returns the value share of the better/same/worse total', () => {
      expect(ratioPct(1, { better: 1, same: 1, worse: 2 })).toBe(25);
      expect(ratioPct(3, { better: 3, same: 0, worse: 1 })).toBe(75);
    });
    it('returns 0 when the total is 0 (no divide-by-zero)', () => {
      expect(ratioPct(0, { better: 0, same: 0, worse: 0 })).toBe(0);
    });
  });
});
