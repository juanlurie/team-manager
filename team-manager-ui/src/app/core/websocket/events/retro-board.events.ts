import { WsEvent } from '../websocket.service';

// Retro board (features/fun/retro-board) -- the `rb_*` namespace.
export const RETRO_BOARD_EVENT_TYPES = [
  'rb_phase_changed',
  'rb_settings_updated',
  'rb_revealed',
  'rb_live_state',
  'rb_note_added',
  'rb_note_updated',
  'rb_note_deleted',
  'rb_voted',
  'rb_checkin_changed',
  'rb_checkin_responded',
  'rb_action_changed',
  'rb_columns_changed',
  'rb_participant_changed',
  'rb_progress_updated',
  'rb_summary_ready',
  'rb_feedback_changed',
  'rb_feedback_responded',
  'rb_lifecycle_changed',
  'rb_session_deleted',
] as const;

export type RetroBoardEvent = WsEvent<(typeof RETRO_BOARD_EVENT_TYPES)[number]>;
