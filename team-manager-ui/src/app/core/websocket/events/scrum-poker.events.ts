import { WsEvent } from '../websocket.service';

export const SCRUM_POKER_EVENT_TYPES = [
  'scrum_poker_session_created',
  'scrum_poker_vote_cast',
  'scrum_poker_votes_revealed',
  'scrum_poker_session_reset',
  'scrum_poker_session_deleted',
] as const;

export type ScrumPokerEvent = WsEvent<(typeof SCRUM_POKER_EVENT_TYPES)[number]>;
