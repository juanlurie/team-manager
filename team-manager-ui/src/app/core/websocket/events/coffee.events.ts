import { WsEvent } from '../websocket.service';

export const COFFEE_EVENT_TYPES = [
  'coffee_run_created',
  'coffee_run_status_changed',
  'coffee_order_placed',
  'coffee_order_updated',
  'coffee_order_deleted',
  'coffee_item_availability_changed',
  'coffee_menu_updated',
] as const;

export type CoffeeEvent = WsEvent<(typeof COFFEE_EVENT_TYPES)[number]>;
