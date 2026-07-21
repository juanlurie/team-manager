import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { RetroBoardStore, PHASES } from './retro-board.store';
import { RetroBoardService } from '../../../core/services/retro-board.service';
import { SquadService } from '../../../core/services/squad.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AuthService } from '../../../core/auth/auth.service';

/** Minimal session graph — only the fields the pure computeds read; cast to bypass the full type.
 *  `enabledPhases` defaults to the whole flow: visibleSteps filters PHASES by it, so omitting it
 *  makes every step invisible. Tests that care about auto-skip should override it. */
function session(over: Record<string, unknown> = {}): any {
  return {
    id: 's1', status: 'live', phase: 'checkin', isFacilitator: true,
    enabledPhases: PHASES.map(p => p.key),
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
      expect(store.stepDone('checkin')).toBe(true);
      expect(store.stepDone('vote')).toBe(false);      // the current step is not "done"
      expect(store.stepDone('discuss')).toBe(false);
    });
  });

  // The original M6 rule excluded facilitators from the total. That was REVERTED deliberately: a
  // solo admin's meter read 0/0. `respondents` is now every participant — don't "fix" this back.
  describe('responded meters count every participant, facilitator included', () => {
    beforeEach(() => {
      store.session.set(session({
        participants: [
          { role: 'facilitator', responded: {} },
          { role: 'participant', responded: { checkin: true } },
          { role: 'participant', responded: { checkin: false } },
        ],
      }));
    });
    it('counts the facilitator in the total', () => {
      expect(store.respondedTotal()).toBe(3);
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

  describe('canManageHost (Phase 3 host delegation)', () => {
    const roster = () => store.session()!.participants;

    it('a facilitator can manage a non-creator member, but not the creator or a guest', () => {
      store.session.set(session({
        createdByMemberId: 'creator', isFacilitator: true,
        participants: [
          { id: '1', memberId: 'creator', role: 'facilitator', name: 'Creator' },
          { id: '2', memberId: 'm2', role: 'participant', name: 'Member' },
          { id: '3', memberId: null, isGuest: true, role: 'participant', name: 'Guest' },
        ],
      }));
      const [creator, member, guest] = roster();
      expect(store.canManageHost(creator)).toBe(false);   // creator is the un-removable default host
      expect(store.canManageHost(member)).toBe(true);
      expect(store.canManageHost(guest)).toBe(false);      // guests have no member id and can't host
    });

    it('a non-facilitator can manage nobody', () => {
      store.session.set(session({
        createdByMemberId: 'creator', isFacilitator: false,
        participants: [{ id: '2', memberId: 'm2', role: 'participant', name: 'Member' }],
      }));
      expect(store.canManageHost(roster()[0])).toBe(false);
    });
  });
});
