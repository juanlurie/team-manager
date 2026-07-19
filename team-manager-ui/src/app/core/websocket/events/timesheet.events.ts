import { WsEvent } from '../websocket.service';

export const TIMESHEET_EVENT_TYPES = [
  'timesheet_entry_created',
  'timesheet_entry_updated',
  'timesheet_entry_deleted',
] as const;

export type TimesheetEvent = WsEvent<(typeof TIMESHEET_EVENT_TYPES)[number]>;
