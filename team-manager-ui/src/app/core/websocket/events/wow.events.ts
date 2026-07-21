import { WsEvent } from '../websocket.service';

// Win of the Week (features/win-of-the-week + features/guest-wow). WoW predates the `wow_`
// namespace, so its voting/nomination events are bare literals; list them all explicitly.
// `presence_changed` is a shared presence event WoW also listens to.
export const WOW_EVENT_TYPES = [
  'vote_cast',
  'vote_removed',
  'voting_opened',
  'voting_closed',
  'sudden_death_started',
  'nominations_reopened',
  'nomination_created',
  'nomination_updated',
  'nomination_deleted',
  'win_story_ready',
  'hype_meter_tapped',
  'reaction_sent',
  'presence_changed',
  'wow_timer_started',
  'wow_timer_stopped',
  'wow_hype_battle_started',
  'wow_hype_battle_ended',
  'wow_quiz_started',
  'wow_quiz_answer_submitted',
  'wow_quiz_revealed',
  'wow_quiz_stopped',
] as const;

export type WowEvent = WsEvent<(typeof WOW_EVENT_TYPES)[number]>;
