import { WsEvent } from '../websocket.service';

export const PERSONAL_MAP_EVENT_TYPES = [
  'personal_map_node_added',
  'personal_map_node_moved',
  'personal_map_node_resized',
  'personal_map_node_color_changed',
  'personal_map_node_text_updated',
  'personal_map_node_deleted',
] as const;

export type PersonalMapEvent = WsEvent<(typeof PERSONAL_MAP_EVENT_TYPES)[number]>;
