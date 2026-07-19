import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { OAuthService } from 'angular-oauth2-oidc';

// One raw event envelope on the shared socket. `TType`/`TData` let each feature declare its own
// discriminated union of the events it actually cares about (see core/websocket/events/*), so a
// consumer works with a stream narrowed to its own room instead of the app-wide god-union that
// used to live here. The wire shape is unchanged.
export interface WsEvent<TType extends string = string, TData = Record<string, unknown>> {
  type: TType;
  data: TData;
  // Monotonic per-server sequence stamped on every broadcast. Lets consumers discard a message
  // they've already applied (e.g. an event also captured by a post-reconnect snapshot) or a stale
  // straggler. Optional: not every historical producer/path sets it.
  seq?: number;
}

// The untyped envelope, for the raw firehose (`messages$`) and the few genuinely cross-feature
// consumers. Feature code should prefer `roomEvents<FeatureEvent>(prefix)` instead.
export type WsMessage = WsEvent;

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

  // Typed, feature-scoped view of the shared socket. Give it the event-name prefix(es) that
  // namespace a feature (e.g. 'poll_', or ['wow_', 'hype_meter_tapped']) and the discriminated
  // union it produces; you get a non-null stream of only that feature's events, with `type`
  // narrowing on the union. Replaces the per-consumer `messages$.pipe(filter(m => m && m.type
  // .startsWith(...)))` boilerplate. Room-id disambiguation (e.g. data['sessionId'] === myId)
  // stays in the consumer, since it's usually conditional feature logic. See docs/session-platform.md.
  roomEvents<T extends WsEvent>(match: string | readonly string[]): Observable<T> {
    const prefixes = typeof match === 'string' ? [match] : match;
    return this._messages$.pipe(
      filter((m): m is WsMessage => m !== null && prefixes.some(p => m.type.startsWith(p))),
      map(m => m as unknown as T),
    );
  }

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
