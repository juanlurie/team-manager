import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { RetroBoardStore } from './retro-board.store';
import { RetroBoardService } from '../../../core/services/retro-board.service';
import { SquadService } from '../../../core/services/squad.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AuthService } from '../../../core/auth/auth.service';

/** Minimal session graph — only the fields the pure computeds read; cast to bypass the full type. */
function session(over: Record<string, unknown> = {}): any {
  return {
    id: 's1', status: 'live', phase: 'checkin', isFacilitator: true,
    participants: [], columns: [], notes: [], checkinQuestions: [], feedbackPrompts: [], actions: [],
    ...over,
  };
}

describe('RetroBoardStore', () => {
  let store: RetroBoardStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RetroBoardStore,
        { provide: RetroBoardService, useValue: {} },
        { provide: SquadService, useValue: {} },
        { provide: TeamMemberService, useValue: {} },
        { provide: WebSocketService, useValue: {} },
        { provide: AuthService, useValue: { me: { id: 'me-1' } } },
        { provide: Router, useValue: {} },
      ],
    });
    store = TestBed.inject(RetroBoardStore);
  });

  describe('mainView', () => {
    it('is precapture while open', () => {
      store.session.set(session({ status: 'open', phase: 'capture' }));
      expect(store.mainView()).toBe('precapture');
    });
    it('is summary once closed, regardless of phase', () => {
      store.session.set(session({ status: 'closed', phase: 'discuss' }));
      expect(store.mainView()).toBe('summary');
    });
    it('follows the phase while live', () => {
      store.session.set(session({ status: 'live', phase: 'vote' }));
      expect(store.mainView()).toBe('vote');
    });
  });

  describe('visibleSteps', () => {
    it('shows the full flow to a facilitator', () => {
      store.session.set(session({ isFacilitator: true }));   // viewAs defaults to facilitator
      expect(store.visibleSteps().length).toBe(store.phases.length);
    });
    it('trims setup/reflect/summary for a participant', () => {
      store.session.set(session({ isFacilitator: false }));
      expect(store.visibleSteps().map(s => s.key)).toEqual(['checkin', 'capture', 'introduce', 'vote', 'discuss']);
    });
  });

  describe('stepDone', () => {
    it('marks steps before the current phase done, by full-flow position', () => {
      store.session.set(session({ phase: 'vote' }));   // vote is index 4
      expect(store.stepDone('checkin')).toBeTrue();
      expect(store.stepDone('vote')).toBeFalse();      // the current step is not "done"
      expect(store.stepDone('discuss')).toBeFalse();
    });
  });

  describe('responded meters count non-facilitator participants (M6)', () => {
    beforeEach(() => {
      store.session.set(session({
        participants: [
          { role: 'facilitator', responded: {} },
          { role: 'participant', responded: { checkin: true } },
          { role: 'participant', responded: { checkin: false } },
        ],
      }));
    });
    it('excludes the facilitator from the total', () => {
      expect(store.respondedTotal()).toBe(2);
    });
    it('counts only participants who responded to the phase', () => {
      expect(store.respondedFor('checkin')).toBe(1);
      expect(store.respondedFor('vote')).toBe(0);
    });
  });

  describe('extractJoinCode', () => {
    const extract = (raw: string) => (store as unknown as { extractJoinCode(r: string): string }).extractJoinCode(raw);
    it('returns a bare code unchanged', () => {
      expect(extract('crisp-gecko')).toBe('crisp-gecko');
    });
    it('pulls the code out of a pasted share link', () => {
      expect(extract('https://app.example/pulse/retro-board/brave-otter')).toBe('brave-otter');
    });
    it('strips a query string on a pasted link', () => {
      expect(extract('/pulse/retro-board/keen-quokka?ref=x')).toBe('keen-quokka');
    });
    it('trims surrounding whitespace', () => {
      expect(extract('  spaced  ')).toBe('spaced');
    });
  });
});
