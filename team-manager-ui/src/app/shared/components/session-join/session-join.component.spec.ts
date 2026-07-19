import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SessionJoinComponent } from './session-join.component';

// The QR library is an async, canvas-touching dependency — mock it so the spec pins this
// component's own behaviour (regenerate-on-url-change, copy-the-link) rather than the encoder.
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR') },
}));

describe('SessionJoinComponent', () => {
  let fixture: ComponentFixture<SessionJoinComponent>;
  let comp: SessionJoinComponent;
  let ref: ComponentRef<SessionJoinComponent>;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    TestBed.configureTestingModule({
      imports: [SessionJoinComponent],
      providers: [{ provide: MatSnackBar, useValue: { open: vi.fn() } }],
    });
    fixture = TestBed.createComponent(SessionJoinComponent);
    comp = fixture.componentInstance;
    ref = fixture.componentRef;
  });

  it('generates a QR when a url is set', async () => {
    ref.setInput('url', 'https://app/join/abc');
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    expect(comp.qrDataUrl()).toBe('data:image/png;base64,QR');
  });

  it('clears the QR when the url goes null', async () => {
    ref.setInput('url', 'https://app/join/abc');
    fixture.detectChanges();
    await Promise.resolve();
    ref.setInput('url', null);
    fixture.detectChanges();
    expect(comp.qrDataUrl()).toBeNull();
  });

  it('copies the join link (the URL, not the friendly code) and flags copied', async () => {
    ref.setInput('url', 'https://app/join/abc');
    ref.setInput('code', 'crisp-gecko');
    fixture.detectChanges();

    comp.copyLink();
    expect(writeText).toHaveBeenCalledWith('https://app/join/abc');
    await Promise.resolve();
    expect(comp.copied()).toBe(true);
  });
});
