import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { timer } from 'rxjs';

export interface WsMessage {
  type: 'vote_cast' | 'vote_removed' | 'voting_opened' | 'voting_closed' | 'sudden_death_started' | 'nomination_created' | 'nomination_updated' | 'nomination_deleted' | 'retro_action_created' | 'retro_action_updated' | 'retro_action_deleted';
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private _messages$ = new BehaviorSubject<WsMessage | null>(null);
  private _connected$ = new BehaviorSubject<boolean>(false);
  private reconnectTimer: any;

  messages$ = this._messages$.asObservable();
  connected$ = this._connected$.asObservable();

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this._connected$.next(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        this._messages$.next(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._connected$.next(false);
      this.ws = null;
      // Reconnect after 3 seconds
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this._connected$.next(false);
    };
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
