import { WsEvent } from '../websocket.service';

// Real-time multiplayer board games each broadcast a single `*_update` event carrying the new
// shared game state; the consumer refreshes on it and reads the room id from the payload.
export const DOTS_AND_BOXES_EVENT_TYPES = ['dots_boxes_update'] as const;
export type DotsAndBoxesEvent = WsEvent<(typeof DOTS_AND_BOXES_EVENT_TYPES)[number]>;

export const GAME_2048_EVENT_TYPES = ['game_2048_update'] as const;
export type Game2048Event = WsEvent<(typeof GAME_2048_EVENT_TYPES)[number]>;

export const GAME_THREES_EVENT_TYPES = ['game_threes_update'] as const;
export type GameThreesEvent = WsEvent<(typeof GAME_THREES_EVENT_TYPES)[number]>;

export const GAME_ULTIMATE_TTT_EVENT_TYPES = ['game_ultimate_ttt_update'] as const;
export type GameUltimateTttEvent = WsEvent<(typeof GAME_ULTIMATE_TTT_EVENT_TYPES)[number]>;

export const CONNECTIONS_EVENT_TYPES = ['connections_update'] as const;
export type ConnectionsEvent = WsEvent<(typeof CONNECTIONS_EVENT_TYPES)[number]>;
