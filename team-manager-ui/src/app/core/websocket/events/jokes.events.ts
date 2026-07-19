import { WsEvent } from '../websocket.service';

export const JOKES_EVENT_TYPES = ['joke_generated'] as const;

export type JokesEvent = WsEvent<(typeof JOKES_EVENT_TYPES)[number]>;
