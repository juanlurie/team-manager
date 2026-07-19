import { fmtDuration, parseDuration } from './time-format';

describe('time-format', () => {
  describe('fmtDuration', () => {
    it('formats seconds as m:ss, padding only the seconds', () => {
      expect(fmtDuration(0)).toBe('0:00');
      expect(fmtDuration(9)).toBe('0:09');
      expect(fmtDuration(90)).toBe('1:30');
      expect(fmtDuration(3600)).toBe('60:00');
    });
    it('does NOT zero-pad minutes (retro.component.formatTime does — it is not a caller)', () => {
      expect(fmtDuration(90)).toBe('1:30');
      expect(fmtDuration(90)).not.toBe('01:30');
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
});
