import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';

export interface WsMessage {
  type: 'vote_cast' | 'vote_removed' | 'voting_opened' | 'voting_closed' | 'sudden_death_started' | 'nominations_reopened' | 'nomination_created' | 'nomination_updated' | 'nomination_deleted' | 'retro_action_created' | 'retro_action_updated' | 'retro_action_deleted' | 'retro_card_added' | 'retro_card_deleted' | 'retro_voted' | 'retro_phase_changed' | 'retro_timer_updated' | 'retro_reaction_toggled' | 'retro_icebreaker_answered' | 'presence_changed' | 'scrum_poker_session_created' | 'scrum_poker_vote_cast' | 'scrum_poker_votes_revealed' | 'scrum_poker_session_reset' | 'scrum_poker_session_deleted' | 'timesheet_entry_created' | 'timesheet_entry_updated' | 'timesheet_entry_deleted' | 'win_story_ready' | 'joke_generated' | 'hype_meter_tapped' | 'reaction_sent' | 'wow_timer_started' | 'wow_timer_stopped' | 'wow_hype_battle_started' | 'wow_hype_battle_ended' | 'wow_quiz_started' | 'wow_quiz_answer_submitted' | 'wow_quiz_revealed' | 'wow_quiz_stopped' | 'poll_created' | 'poll_vote_cast' | 'poll_closed' | 'poll_deleted' | 'poll_settings_updated' | 'quiz_game_session_created' | 'quiz_game_participant_joined' | 'quiz_game_started' | 'quiz_game_answer_submitted' | 'quiz_game_question_revealed' | 'quiz_game_next_question' | 'quiz_game_completed' | 'access_request_submitted' | 'access_request_approved' | 'fun_retro_card_added' | 'fun_retro_phase_changed' | 'fun_retro_revealed' | 'fun_retro_voted' | 'fun_retro_reacted' | 'fun_retro_analysed' | 'fun_retro_card_moved' | 'fun_retro_card_color_changed' | 'fun_retro_card_grouped' | 'fun_retro_card_text_updated' | 'fun_retro_timer_updated' | 'fun_retro_settings_updated' | 'fun_retro_icebreaker_answered' | 'fun_retro_presence' | 'fun_retro_comment_added' | 'fun_retro_comment_deleted' | 'fun_retro_token_added' | 'fun_retro_token_moved' | 'fun_retro_token_deleted' | 'fun_retro_token_resized' | 'dots_boxes_update' | 'game_2048_update' | 'game_threes_update' | 'game_ultimate_ttt_update' | 'connections_update' | 'process_flow_node_added' | 'process_flow_node_moved' | 'process_flow_node_resized' | 'process_flow_node_color_changed' | 'process_flow_node_shape_changed' | 'process_flow_node_text_updated' | 'process_flow_node_deleted' | 'process_flow_edge_added' | 'process_flow_edge_deleted' | 'process_flow_edge_reshaped' | 'process_flow_edge_endpoints_changed' | 'process_flow_edge_color_changed' | 'personal_map_node_added' | 'personal_map_node_moved' | 'personal_map_node_resized' | 'personal_map_node_color_changed' | 'personal_map_node_text_updated' | 'personal_map_node_deleted'
    | 'rb_phase_changed' | 'rb_settings_updated' | 'rb_revealed' | 'rb_live_state' | 'rb_note_added' | 'rb_note_updated' | 'rb_note_deleted' | 'rb_voted' | 'rb_checkin_changed' | 'rb_checkin_responded' | 'rb_action_changed' | 'rb_columns_changed' | 'rb_participant_changed' | 'rb_progress_updated' | 'rb_summary_ready' | 'rb_feedback_changed' | 'rb_feedback_responded' | 'rb_lifecycle_changed' | 'rb_session_deleted';
  data: Record<string, unknown>;
  // Monotonic per-server sequence stamped on every broadcast. Lets consumers discard a message
  // they've already applied (e.g. an event also captured by a post-reconnect snapshot) or a stale
  // straggler. Optional: not every historical producer/path sets it.
  seq?: number;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private oauth = inject(OAuthService);
  private ws: WebSocket | null = null;
  private _messages$ = new BehaviorSubject<WsMessage | null>(null);
  private _connected$ = new BehaviorSubject<boolean>(false);
  private reconnectTimer: any;

  // Heartbeat: a TCP connection can die (laptop sleep, wifi drop, NAT/proxy idle timeout)
  // without the browser ever firing onclose -- the socket sits in a "zombie" state where
  // readyState still reads OPEN but no bytes will ever flow again. That silently freezes all
  // real-time updates until something else forces a reconnect. We defend against it by pinging
  // the server on an interval and expecting a pong (or any inbound traffic) back within a
  // bounded window; if the window lapses we treat the socket as dead and force a reconnect.
  private static readonly PING_INTERVAL_MS = 25_000;
  private static readonly PONG_TIMEOUT_MS = 10_000;
  private pingTimer: any;
  private pongTimer: any;

  messages$ = this._messages$.asObservable();
  connected$ = this._connected$.asObservable();

  constructor() {
    // A backgrounded/inactive tab has setInterval throttled by the browser (Chrome clamps it to
    // roughly once a minute, sometimes longer) -- the 25s ping schedule below barely runs, so a
    // socket that actually died while the tab was hidden (laptop slept, wifi dropped) can sit
    // undetected far longer than PONG_TIMEOUT_MS once the tab comes back. That's a real symptom:
    // someone leaves a retro tab open, another participant's card lands on a zombie socket and
    // never appears until something else forces a resync. Probe immediately on resume instead of
    // waiting for the throttled interval to eventually get around to it.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.checkConnectionOnResume();
    });
  }

  private checkConnectionOnResume(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.connect(); // not open (or never was) -- let the normal connect/reconnect path handle it
      return;
    }
    this.probe();
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = this.oauth.getIdToken();
    const url = token
      ? `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`
      : `${protocol}//${host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this._connected$.next(true);
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      // Any inbound byte proves the socket is alive -- clear the outstanding liveness deadline
      // (a pong satisfies it, but so does any real broadcast that happens to arrive first).
      this.clearPongTimer();
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return; // Ignore malformed messages
      }
      // Heartbeat replies are internal plumbing -- don't surface them to feature subscribers.
      if ((msg as { type?: string }).type === 'pong') return;
      this._messages$.next(msg);
    };

    this.ws.onclose = () => {
      this._connected$.next(false);
      this.stopHeartbeat();
      this.ws = null;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this._connected$.next(false);
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => this.probe(), WebSocketService.PING_INTERVAL_MS);
  }

  // Sends one ping and arms the zombie-detection deadline. Called on the regular interval, and
  // also immediately on tab-resume (see constructor) so a dead socket doesn't wait out the rest
  // of a throttled-background interval before detection kicks in.
  private probe(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'ping' }));
    // Expect *some* inbound traffic before the deadline; otherwise the socket is a zombie.
    this.clearPongTimer();
    this.pongTimer = setTimeout(() => this.forceReconnect(), WebSocketService.PONG_TIMEOUT_MS);
  }

  private stopHeartbeat(): void {
    clearInterval(this.pingTimer);
    this.pingTimer = undefined;
    this.clearPongTimer();
  }

  private clearPongTimer(): void {
    clearTimeout(this.pongTimer);
    this.pongTimer = undefined;
  }

  // Tear the zombie socket down explicitly. Closing a socket whose peer is already gone still
  // fires onclose synchronously enough to kick the normal 3s reconnect path; null the handlers
  // first so the dead socket can't emit a late spurious event after we've moved on.
  private forceReconnect(): void {
    this.stopHeartbeat();
    const dead = this.ws;
    this.ws = null;
    if (dead) {
      dead.onopen = dead.onmessage = dead.onclose = dead.onerror = null;
      try { dead.close(); } catch { /* already closing */ }
    }
    this._connected$.next(false);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 1000);
  }

  send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Session-platform primitive: subscribe/unsubscribe this connection to a generic room by its
  // namespaced key (e.g. "poll:{id}"). The server fans out to the room via BroadcastToRoomAsync.
  // Re-send joinRoom after every reconnect -- room membership lives only in the server's in-memory
  // connection state, so a dropped socket forgets it. See docs/session-platform.md.
  joinRoom(room: string, displayName?: string): void {
    this.send(displayName === undefined ? { type: 'join_room', room } : { type: 'join_room', room, displayName });
  }

  leaveRoom(room: string): void {
    this.send({ type: 'leave_room', room });
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }
}
