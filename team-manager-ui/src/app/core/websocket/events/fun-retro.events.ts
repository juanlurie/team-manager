import { WsEvent } from '../websocket.service';

// Fun Hub retro (features/fun/retro).
export const FUN_RETRO_EVENT_TYPES = [
  'fun_retro_card_added',
  'fun_retro_phase_changed',
  'fun_retro_revealed',
  'fun_retro_voted',
  'fun_retro_reacted',
  'fun_retro_analysed',
  'fun_retro_card_moved',
  'fun_retro_card_color_changed',
  'fun_retro_card_grouped',
  'fun_retro_card_text_updated',
  'fun_retro_timer_updated',
  'fun_retro_settings_updated',
  'fun_retro_icebreaker_answered',
  'fun_retro_presence',
  'fun_retro_comment_added',
  'fun_retro_comment_deleted',
  'fun_retro_token_added',
  'fun_retro_token_moved',
  'fun_retro_token_deleted',
  'fun_retro_token_resized',
] as const;

export type FunRetroEvent = WsEvent<(typeof FUN_RETRO_EVENT_TYPES)[number]>;
