import { GuestRetroTimerComponent } from './guest-retro-timer.component';

// The guest timer parses the same liveStateJson the facilitator's controls write and counts it down
// locally. These cover the shapes it has to read: a running countdown, a paused (frozen) timer, an
// already-expired one, and "no timer set" (self-hides).

describe('GuestRetroTimerComponent', () => {
  let comp: GuestRetroTimerComponent;

  beforeEach(() => { comp = new GuestRetroTimerComponent(); });
  afterEach(() => comp.ngOnDestroy());   // clear the 1s interval

  it('hides itself when there is no timer', () => {
    comp.liveStateJson = null;
    expect(comp.active()).toBe(false);
    comp.liveStateJson = '{}';
    expect(comp.active()).toBe(false);   // no seconds → nothing to show
  });

  it('shows a paused timer with its frozen remaining and no countdown', () => {
    comp.liveStateJson = JSON.stringify({ paused: true, seconds: 90 });
    expect(comp.active()).toBe(true);
    expect(comp.paused()).toBe(true);
    expect(comp.remaining()).toBe(90);
  });

  it('counts a running timer down from startedAt', () => {
    comp.liveStateJson = JSON.stringify({ startedAt: new Date(Date.now() - 10_000).toISOString(), seconds: 60 });
    expect(comp.active()).toBe(true);
    expect(comp.paused()).toBe(false);
    expect(comp.remaining()!).toBeGreaterThanOrEqual(49);
    expect(comp.remaining()!).toBeLessThanOrEqual(51);   // ~50s left, allowing a little slack
  });

  it('floors an expired timer at zero rather than going negative', () => {
    comp.liveStateJson = JSON.stringify({ startedAt: new Date(Date.now() - 100_000).toISOString(), seconds: 60 });
    expect(comp.remaining()).toBe(0);
  });

  it('formats m:ss', () => {
    expect(comp.fmt(0)).toBe('0:00');
    expect(comp.fmt(9)).toBe('0:09');
    expect(comp.fmt(75)).toBe('1:15');
  });
});
