import { WsEvent } from '../websocket.service';

export const PROCESS_FLOW_EVENT_TYPES = [
  'process_flow_node_added',
  'process_flow_node_moved',
  'process_flow_node_resized',
  'process_flow_node_color_changed',
  'process_flow_node_shape_changed',
  'process_flow_node_text_updated',
  'process_flow_node_deleted',
  'process_flow_edge_added',
  'process_flow_edge_deleted',
  'process_flow_edge_reshaped',
  'process_flow_edge_endpoints_changed',
  'process_flow_edge_color_changed',
] as const;

export type ProcessFlowEvent = WsEvent<(typeof PROCESS_FLOW_EVENT_TYPES)[number]>;
