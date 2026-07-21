import { WsEvent } from '../websocket.service';

// Wordle broadcasts a family of `wordle_*` events; the consumer refreshes on any of them rather
// than switching on specific ones, so match by prefix and keep the type open under that namespace.
export const WORDLE_EVENT_MATCH = 'wordle_';

export type WordleEvent = WsEvent<`wordle_${string}`>;
