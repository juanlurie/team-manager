import { WsEvent } from '../websocket.service';

// App-wide access-request notifications (admin toast + the not-registered waiting screen).
export const ACCESS_REQUEST_EVENT_TYPES = [
  'access_request_submitted',
  'access_request_approved',
] as const;

export type AccessRequestEvent = WsEvent<(typeof ACCESS_REQUEST_EVENT_TYPES)[number]>;
