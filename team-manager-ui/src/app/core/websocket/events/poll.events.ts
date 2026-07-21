import { WsEvent } from '../websocket.service';

// Poll room events. The `as const` list is the single source of truth for both the runtime
// matcher passed to `roomEvents()` and the compile-time discriminated union below.
export const POLL_EVENT_TYPES = [
  'poll_created',
  'poll_vote_cast',
  'poll_closed',
  'poll_deleted',
  'poll_settings_updated',
] as const;

export type PollEvent = WsEvent<(typeof POLL_EVENT_TYPES)[number]>;
