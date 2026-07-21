import { WsEvent } from '../websocket.service';

// Sprint retro (features/sprints/sprint-retro + the retro-actions view on the dashboard). Distinct
// from the Fun Hub retro, whose events are all `fun_retro_*` -- matching `retro_` here never
// collides with `fun_retro_` because that starts with `fun_`.
export const RETRO_EVENT_TYPES = [
  'retro_card_added',
  'retro_card_deleted',
  'retro_voted',
  'retro_phase_changed',
  'retro_timer_updated',
  'retro_reaction_toggled',
  'retro_icebreaker_answered',
  'retro_action_created',
  'retro_action_updated',
  'retro_action_deleted',
] as const;

export type RetroEvent = WsEvent<(typeof RETRO_EVENT_TYPES)[number]>;
