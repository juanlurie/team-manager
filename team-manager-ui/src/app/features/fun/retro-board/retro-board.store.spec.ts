import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { RetroBoardStore, PHASES } from './retro-board.store';
import { RetroBoardService } from '../../../core/services/retro-board.service';
import { SquadService } from '../../../core/services/squad.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { RetroBoardEvent } from '../../../core/websocket/events/retro-board.events';
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
      expect(extract('https://app.example/pulse/retro/board/brave-otter')).toBe('brave-otter');
    });
    it('still accepts a legacy /pulse/retro-board link', () => {
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

  // The step of the retro decides what anyone can contribute. These read the SHARED phase, not the
  // viewer's local one, and mirror RetroBoardService.CanAddNotes/CanVote/CanComment — a participant
  // who walks their Freeform view back to Capture must still see an inert composer, because the
  // server will reject the write.
  describe('phase gating', () => {
    const at = (phase: string, over: Record<string, unknown> = {}) =>
      store.session.set(session({ phase, isFacilitator: false, ...over }));

    it('allows notes during pre-capture and Capture only', () => {
      at('capture', { status: 'open' });
      expect(store.canAddNotes()).toBe(true);
      at('capture');
      expect(store.canAddNotes()).toBe(true);
      for (const p of ['checkin', 'introduce', 'vote', 'discuss', 'reflect']) {
        at(p);
        expect(store.canAddNotes()).toBe(false);
      }
    });

    it('allows voting during Vote only', () => {
      at('vote');
      expect(store.canVote()).toBe(true);
      for (const p of ['capture', 'introduce', 'discuss']) {
        at(p);
        expect(store.canVote()).toBe(false);
      }
      at('vote', { status: 'open' });          // votes aren't open before the session goes live
      expect(store.canVote()).toBe(false);
    });

    it('allows comments across Capture, Introduce and Discuss', () => {
      for (const p of ['capture', 'introduce', 'discuss']) {
        at(p);
        expect(store.canComment()).toBe(true);
      }
      at('vote');
      expect(store.canComment()).toBe(false);
    });

    // The reported bug: a guest (and anyone else) could still add notes and vote in Discuss.
    it('blocks both notes and votes in Discuss', () => {
      at('discuss');
      expect(store.canAddNotes()).toBe(false);
      expect(store.canVote()).toBe(false);
    });

    // The host still needs to capture something said mid-discussion; voting has no such exemption,
    // since an out-of-phase vote skews the tally the team is reading.
    it('exempts the facilitator for notes but never for votes', () => {
      store.session.set(session({ phase: 'discuss', isFacilitator: true }));
      expect(store.canAddNotes()).toBe(true);
      expect(store.canVote()).toBe(false);
    });

    it('closes everything once the retro is closed', () => {
      store.session.set(session({ status: 'closed', phase: 'capture', isFacilitator: true }));
      expect(store.canAddNotes()).toBe(false);
      expect(store.canVote()).toBe(false);
      expect(store.canComment()).toBe(false);
    });
  });

  describe('canRemove', () => {
    it('lets a facilitator remove others, but not the creator or themselves', () => {
      store.session.set(session({
        createdByMemberId: 'creator', isFacilitator: true,
        participants: [
          { id: '1', memberId: 'creator', role: 'facilitator', name: 'Creator' },
          { id: '2', memberId: 'me-1', role: 'facilitator', name: 'Me' },
          { id: '3', memberId: 'm3', role: 'participant', name: 'Member' },
          { id: '4', memberId: null, isGuest: true, role: 'participant', name: 'Guest' },
        ],
      }));
      const [creator, me, member, guest] = store.session()!.participants;
      expect(store.canRemove(creator)).toBe(false);
      expect(store.canRemove(me)).toBe(false);
      expect(store.canRemove(member)).toBe(true);
      expect(store.canRemove(guest)).toBe(true);    // guests are removable too
    });

    it('a non-facilitator can remove nobody', () => {
      store.session.set(session({
        createdByMemberId: 'creator', isFacilitator: false,
        participants: [{ id: '3', memberId: 'm3', role: 'participant', name: 'Member' }],
      }));
      expect(store.canRemove(store.session()!.participants[0])).toBe(false);
    });
  });
});

// Clicking + faster than the round trip used to fire one request per click: every click read the
// same stale `myVotesUsed` (the refetch is debounced 150ms), so the surplus reached the server and
// came back as a 409 the user saw as "An unexpected error occurred". The budget is now spent against
// local state that already counts the in-flight clicks, so the extra clicks are simply no-ops.
describe('RetroBoardStore — vote spend is capped locally', () => {
  let store: RetroBoardStore;
  let addVote: ReturnType<typeof vi.fn>;
  let removeVote: ReturnType<typeof vi.fn>;

  const note = (over: Record<string, unknown> = {}): any => ({ id: 'n1', columnId: 'c1', myVoteCount: 0, voteCount: 0, ...over });
  const voting = (over: Record<string, unknown> = {}): any => ({
    id: 's1', status: 'live', phase: 'vote', isFacilitator: false,
    votesPerUser: 3, myVotesUsed: 0, enabledPhases: PHASES.map(p => p.key),
    participants: [], columns: [], notes: [note()], checkinQuestions: [], feedbackPrompts: [], actions: [],
    ...over,
  });

  beforeEach(() => {
    addVote = vi.fn(() => new Subject<void>());        // never completes: the request stays "in flight"
    removeVote = vi.fn(() => new Subject<void>());
    TestBed.configureTestingModule({
      providers: [
        RetroBoardStore,
        { provide: RetroBoardService, useValue: { addVote, removeVote } },
        { provide: SquadService, useValue: {} },
        { provide: TeamMemberService, useValue: {} },
        { provide: WebSocketService, useValue: {} },
        { provide: AuthService, useValue: { me: { id: 'me-1' } } },
        { provide: Router, useValue: {} },
      ],
    });
    store = TestBed.inject(RetroBoardStore);
  });

  const currentNote = () => store.session()!.notes[0];

  it('stops at the total budget however fast you click', () => {
    store.session.set(voting({ votesPerUser: 3 }));
    for (let i = 0; i < 10; i++) store.vote(currentNote());
    expect(addVote).toHaveBeenCalledTimes(3);          // not 10 — the surplus never leaves the client
    expect(store.votesLeft()).toBe(0);
    expect(store.canVoteOn(currentNote())).toBe(false);
  });

  it('stops at 3 votes on a single note even with budget to spare', () => {
    store.session.set(voting({ votesPerUser: 9 }));
    for (let i = 0; i < 10; i++) store.vote(currentNote());
    expect(addVote).toHaveBeenCalledTimes(3);
    expect(currentNote().myVoteCount).toBe(3);
  });

  it('never unvotes below zero', () => {
    store.session.set(voting({ votesPerUser: 3, myVotesUsed: 1, notes: [note({ myVoteCount: 1, voteCount: 1 })] }));
    store.unvote(currentNote());
    store.unvote(currentNote());
    expect(removeVote).toHaveBeenCalledTimes(1);
    expect(currentNote().myVoteCount).toBe(0);
  });

  it('refuses to vote at all outside the Vote phase', () => {
    store.session.set(voting({ phase: 'discuss' }));
    store.vote(currentNote());
    expect(addVote).not.toHaveBeenCalled();
  });
});

// The real-time contract that makes a live session update for a passive participant: the client must
// (re)join the server-side retro room on every socket (re)connect, because room membership lives only
// in the server's in-memory connection state and is forgotten on any drop. A one-shot join after the
// HTTP load — the old behavior — raced the handshake and never recovered from a reconnect, which is
// exactly why a participant only saw the facilitator's changes after taking an action themselves.
describe('RetroBoardStore — live-session WebSocket (re)join', () => {
  let store: RetroBoardStore;
  let ws: { connect: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn>; connected$: BehaviorSubject<boolean>; roomEvents: ReturnType<typeof vi.fn> };
  let events$: Subject<RetroBoardEvent>;
  let getSessionResponse: ReturnType<typeof vi.fn>;

  const live = (over: Record<string, unknown> = {}): any => ({
    id: 's1', slug: 's1', status: 'live', phase: 'checkin', isFacilitator: true,
    votesPerUser: 6, allowAnonymous: true, allowGuestJoin: true,
    stepDurations: {}, phaseConfig: {}, enabledPhases: [],
    participants: [], columns: [], notes: [], checkinQuestions: [], feedbackPrompts: [], actions: [],
    ...over,
  });

  const joinRetroCalls = () => ws.send.mock.calls.filter((c: unknown[]) => (c[0] as { type?: string })?.type === 'join_retro');

  beforeEach(() => {
    events$ = new Subject<RetroBoardEvent>();
    ws = {
      connect: vi.fn(),
      send: vi.fn(),
      connected$: new BehaviorSubject<boolean>(false),
      roomEvents: vi.fn(() => events$),
    };
    getSessionResponse = vi.fn(() => of(new HttpResponse({ body: live() })));

    TestBed.configureTestingModule({
      providers: [
        RetroBoardStore,
        { provide: RetroBoardService, useValue: { join: vi.fn(() => of(live())), getSessionResponse, getLobbySessions: vi.fn(() => of([])) } },
        { provide: SquadService, useValue: { getAll: () => of([]) } },
        { provide: TeamMemberService, useValue: { getAll: () => of([]) } },
        { provide: WebSocketService, useValue: ws },
        { provide: AuthService, useValue: { me: { firstName: 'A', lastName: 'B' } } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    store = TestBed.inject(RetroBoardStore);
  });

  it('connects and joins the retro room, then re-joins on every reconnect', () => {
    store.init('s1');

    // The HTTP load resolved synchronously (mock), so the board is open and the first join was sent.
    expect(ws.connect).toHaveBeenCalled();
    expect(joinRetroCalls().length).toBe(1);
    expect(joinRetroCalls()[0][0]).toMatchObject({ type: 'join_retro', sessionId: 's1' });

    // Socket comes up → re-join (covers the initial open racing the HTTP load).
    ws.connected$.next(true);
    expect(joinRetroCalls().length).toBe(2);

    // Drop + reconnect → re-join again. Without this a passive participant goes silent after any blip.
    ws.connected$.next(false);
    ws.connected$.next(true);
    expect(joinRetroCalls().length).toBe(3);
  });

  it('does not join any room while sitting in the lobby (no open session)', () => {
    store.init(null);            // lobby, no board loaded
    ws.connected$.next(true);
    ws.connected$.next(false);
    ws.connected$.next(true);
    expect(joinRetroCalls().length).toBe(0);
  });
});
