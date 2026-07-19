import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { SharedCountdownComponent } from './shared-countdown.component';

/**
 * The two behaviours worth pinning: server-clock skew correction (the reason this primitive
 * exists over a naive endsAt - Date.now()) and fire-once expiry. Fake timers drive both.
 */
describe('SharedCountdownComponent', () => {
  const BASE = new Date('2026-01-01T00:00:00.000Z').getTime();
  let fixture: ComponentFixture<SharedCountdownComponent>;
  let comp: SharedCountdownComponent;
  let ref: ComponentRef<SharedCountdownComponent>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
    TestBed.configureTestingModule({ imports: [SharedCountdownComponent] });
    fixture = TestBed.createComponent(SharedCountdownComponent);
    comp = fixture.componentInstance;
    ref = fixture.componentRef;
  });

  afterEach(() => vi.useRealTimers());

  it('renders the idle dash and null remaining with no deadline', () => {
    fixture.detectChanges();
    expect(comp.remaining()).toBeNull();
    expect(comp.display()).toBe('—');
  });

  it('formats the remaining time as m:ss', () => {
    ref.setInput('endsAt', new Date(BASE + 90_000).toISOString());
    fixture.detectChanges();
    expect(comp.remaining()).toBe(90_000);
    expect(comp.display()).toBe('1:30');
  });

  it('clamps a past deadline to zero', () => {
    ref.setInput('endsAt', new Date(BASE - 5_000).toISOString());
    fixture.detectChanges();
    expect(comp.remaining()).toBe(0);
    expect(comp.display()).toBe('0:00');
  });

  it('corrects for client clock skew using serverNow', () => {
    // The server's clock reads 30s ahead of this client's. The deadline is 60s out by the
    // server's clock; a naive endsAt - localNow would read 90s. Correction must yield 60s.
    const serverNow = BASE + 30_000;
    const endsAt = serverNow + 60_000;
    ref.setInput('endsAt', new Date(endsAt).toISOString());
    ref.setInput('serverNow', new Date(serverNow).toISOString());
    fixture.detectChanges();
    expect(comp.remaining()).toBe(60_000);
  });

  it('drives the warning and urgent states off the thresholds', () => {
    ref.setInput('endsAt', new Date(BASE + 20_000).toISOString());
    fixture.detectChanges();
    expect(comp.isWarning()).toBe(true);   // 20s: < warnAt(30) and >= urgentAt(10)
    expect(comp.isUrgent()).toBe(false);

    ref.setInput('endsAt', new Date(BASE + 5_000).toISOString());
    fixture.detectChanges();
    expect(comp.isWarning()).toBe(false);  // 5s: < urgentAt(10)
    expect(comp.isUrgent()).toBe(true);
  });

  it('emits expired exactly once when the clock reaches zero', () => {
    let fired = 0;
    ref.setInput('endsAt', new Date(BASE + 2_000).toISOString());
    fixture.detectChanges();
    comp.expired.subscribe(() => fired++);

    vi.setSystemTime(BASE + 3_000);
    vi.advanceTimersByTime(3_000); // three 1s ticks, all past the deadline
    expect(fired).toBe(1);
  });

  it('re-arms expiry for a fresh deadline', () => {
    let fired = 0;
    ref.setInput('endsAt', new Date(BASE + 1_000).toISOString());
    fixture.detectChanges();
    comp.expired.subscribe(() => fired++);

    vi.setSystemTime(BASE + 2_000);
    vi.advanceTimersByTime(1_000);
    expect(fired).toBe(1);

    // A new future deadline should let expiry fire again once it too elapses.
    ref.setInput('endsAt', new Date(BASE + 5_000).toISOString());
    vi.advanceTimersByTime(1_000);          // remaining > 0 → re-arm
    vi.setSystemTime(BASE + 6_000);
    vi.advanceTimersByTime(1_000);
    expect(fired).toBe(2);
  });
});
