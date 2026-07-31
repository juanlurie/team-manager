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

  // Votes are spent on a topic, so that's what the store's vote API takes.
  const topic = () => store.topicsFor('c1')[0];

  it('stops at the total budget however fast you click', () => {
    store.session.set(voting({ votesPerUser: 3 }));
    for (let i = 0; i < 10; i++) store.vote(topic());
    expect(addVote).toHaveBeenCalledTimes(3);          // not 10 — the surplus never leaves the client
    expect(store.votesLeft()).toBe(0);
    expect(store.canVoteOn(topic())).toBe(false);
  });

  it('stops at 3 votes on a single topic even with budget to spare', () => {
    store.session.set(voting({ votesPerUser: 9 }));
    for (let i = 0; i < 10; i++) store.vote(topic());
    expect(addVote).toHaveBeenCalledTimes(3);
    expect(topic().myVoteCount).toBe(3);
  });

  it('never unvotes below zero', () => {
    store.session.set(voting({ votesPerUser: 3, myVotesUsed: 1, notes: [note({ myVoteCount: 1, voteCount: 1 })] }));
    store.unvote(topic());
    store.unvote(topic());
    expect(removeVote).toHaveBeenCalledTimes(1);
    expect(topic().myVoteCount).toBe(0);
  });

  it('refuses to vote at all outside the Vote phase', () => {
    store.session.set(voting({ phase: 'discuss' }));
    store.vote(topic());
    expect(addVote).not.toHaveBeenCalled();
  });

  // Merging exists so an idea gets ONE budget instead of one per wording of it. The client has to
  // agree with the server here, or the buttons stay enabled and every extra click 409s.
  it('spends the per-topic cap across a whole merged group, not per note', () => {
    store.session.set(voting({
      votesPerUser: 20,
      notes: [
        note({ id: 'n1', groupId: 'n1', groupLabel: 'Deploys' }),   // anchor
        note({ id: 'n2', groupId: 'n1' }),
        note({ id: 'n3', groupId: 'n1' }),
      ],
    }));
    expect(topic().isGroup).toBe(true);
    expect(topic().notes.length).toBe(3);

    for (let i = 0; i < 10; i++) store.vote(topic());
    expect(addVote).toHaveBeenCalledTimes(3);          // three for the group, not three per note
    expect(topic().myVoteCount).toBe(3);
    // Every vote is addressed to the anchor, which is what the server records them against.
    expect(addVote.mock.calls.every((c: unknown[]) => c[1] === 'n1')).toBe(true);
  });

  it('counts votes cast before a merge toward the group total', () => {
    store.session.set(voting({
      votesPerUser: 20,
      notes: [
        note({ id: 'n1', groupId: 'n1', myVoteCount: 1, voteCount: 2 }),
        note({ id: 'n2', groupId: 'n1', myVoteCount: 2, voteCount: 3 }),
      ],
    }));
    expect(topic().voteCount).toBe(5);                 // summed across the group
    expect(topic().myVoteCount).toBe(3);
    store.vote(topic());
    expect(addVote).not.toHaveBeenCalled();            // already at the cap — nothing was reset by merging
  });
});

describe('RetroBoardStore — topics', () => {
  let store: RetroBoardStore;

  const note = (over: Record<string, unknown> = {}): any =>
    ({ id: 'n', columnId: 'c1', myVoteCount: 0, voteCount: 0, groupId: null, groupLabel: null, comments: [], ...over });

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

  it('turns loose notes into one topic each and merged notes into one topic per group', () => {
    store.session.set(session({
      notes: [
        note({ id: 'a', groupId: 'a', groupLabel: 'Deploys' }),
        note({ id: 'b', groupId: 'a' }),
        note({ id: 'c' }),
        note({ id: 'd', columnId: 'c2' }),
      ],
    }));
    const c1 = store.topicsFor('c1');
    expect(c1.length).toBe(2);
    expect(c1[0]).toMatchObject({ id: 'a', isGroup: true, label: 'Deploys' });
    expect(c1[0].notes.map((n: any) => n.id)).toEqual(['a', 'b']);   // anchor first
    expect(c1[1]).toMatchObject({ id: 'c', isGroup: false, label: null });
    expect(store.topicsFor('c2').length).toBe(1);
  });

  it('names an unlabelled group after its anchor note', () => {
    store.session.set(session({
      notes: [note({ id: 'a', groupId: 'a', text: 'Deploys keep failing' }), note({ id: 'b', groupId: 'a', text: 'Pipeline is flaky' })],
    }));
    expect(store.topicTitle(store.topicsFor('c1')[0])).toBe('Deploys keep failing');
  });

  it('ranks Discuss by the combined votes of each topic', () => {
    store.session.set(session({
      notes: [
        note({ id: 'a', groupId: 'a', voteCount: 2 }),
        note({ id: 'b', groupId: 'a', voteCount: 2 }),   // group total 4
        note({ id: 'c', voteCount: 3 }),                  // beats either member, loses to the group
      ],
    }));
    expect(store.topicsByVotes().map(t => t.id)).toEqual(['a', 'c']);
  });

  describe('canGroup', () => {
    it('is open to a facilitator from Introduce through Discuss', () => {
      for (const phase of ['introduce', 'vote', 'discuss']) {
        store.session.set(session({ phase, isFacilitator: true }));
        expect(store.canGroup()).toBe(true);
      }
      for (const phase of ['checkin', 'capture', 'reflect']) {
        store.session.set(session({ phase, isFacilitator: true }));
        expect(store.canGroup()).toBe(false);
      }
    });

    it('is closed to a participant — merging changes what everyone votes on', () => {
      store.session.set(session({ phase: 'vote', isFacilitator: false }));
      expect(store.canGroup()).toBe(false);
    });
  });

  describe('canDropOn', () => {
    beforeEach(() => {
      store.session.set(session({
        phase: 'vote', isFacilitator: true,
        notes: [
          note({ id: 'a', groupId: 'a' }), note({ id: 'b', groupId: 'a' }),
          note({ id: 'c' }), note({ id: 'd', columnId: 'c2' }),
        ],
      }));
    });
    const byId = (id: string) => store.session()!.notes.find((n: any) => n.id === id)!;

    it('refuses a drop on itself, on its own group, or across columns', () => {
      store.dragNoteId.set('a');
      expect(store.canDropOn(byId('a'))).toBe(false);   // itself
      expect(store.canDropOn(byId('b'))).toBe(false);   // already the same group
      expect(store.canDropOn(byId('d'))).toBe(false);   // different column
      expect(store.canDropOn(byId('c'))).toBe(true);
    });

    it('refuses every drop when grouping isn\'t available', () => {
      store.session.update((s: any) => ({ ...s, phase: 'capture' }));
      store.dragNoteId.set('a');
      expect(store.canDropOn(byId('c'))).toBe(false);
    });
  });
});

describe('RetroBoardStore — action ↔ note links', () => {
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
    store.session.set(session({
      notes: [
        { id: 'a', columnId: 'c1', text: 'Deploys keep failing', groupId: 'a', groupLabel: null, voteCount: 0, myVoteCount: 0, comments: [] },
        { id: 'b', columnId: 'c1', text: 'Pipeline is flaky', groupId: 'a', voteCount: 0, myVoteCount: 0, comments: [] },
      ],
      actions: [
        { id: 'x1', title: 'Fix the pipeline', sourceNoteId: 'b', assigneeMemberIds: [] },
        { id: 'x2', title: 'Book a workshop', sourceNoteId: null, assigneeMemberIds: [] },
        { id: 'x3', title: 'Orphan', sourceNoteId: 'deleted-note', assigneeMemberIds: [] },
      ],
    }) as any);
  });

  it('resolves the note an action came from', () => {
    const [fromNote, manual, orphan] = store.session()!.actions;
    expect(store.sourceNoteOf(fromNote)?.text).toBe('Pipeline is flaky');
    expect(store.sourceNoteOf(manual)).toBeNull();      // added by hand, not from a note
    expect(store.sourceNoteOf(orphan)).toBeNull();      // its note was deleted
  });

  it('rolls a member note\'s actions up to the topic', () => {
    const t = store.topicsFor('c1')[0];
    expect(store.actionsFromTopic(t).map(a => a.id)).toEqual(['x1']);
    expect(store.actionsFromNote('a')).toEqual([]);
    expect(store.actionsFromNote('b').map(a => a.id)).toEqual(['x1']);
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
