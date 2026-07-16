import { fmtDuration, parseDuration, shortName, initials, avatarTint, avatarInk, ratioPct } from './retro-format';

describe('retro-format', () => {
  describe('fmtDuration', () => {
    it('formats seconds as m:ss with zero-padding', () => {
      expect(fmtDuration(0)).toBe('0:00');
      expect(fmtDuration(9)).toBe('0:09');
      expect(fmtDuration(90)).toBe('1:30');
      expect(fmtDuration(3600)).toBe('60:00');
    });
    it('clamps negatives to 0', () => {
      expect(fmtDuration(-5)).toBe('0:00');
    });
  });

  describe('parseDuration', () => {
    it('parses m:ss back to seconds', () => {
      expect(parseDuration('1:30')).toBe(90);
      expect(parseDuration('0:09')).toBe(9);
      expect(parseDuration('8:00')).toBe(480);
    });
    it('treats a bare number as minutes', () => {
      expect(parseDuration('2')).toBe(120);
    });
    it('tolerates blanks and garbage', () => {
      expect(parseDuration('')).toBe(0);
      expect(parseDuration('abc')).toBe(0);
    });
    it('round-trips with fmtDuration', () => {
      expect(parseDuration(fmtDuration(275))).toBe(275);
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
