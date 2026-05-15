import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, retry, timer } from 'rxjs';
import { AuthService } from './auth/auth.service';

export interface WsMessage {
  type: 'vote_cast' | 'vote_removed' | 'voting_opened' | 'voting_closed';
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private _messages$ = new BehaviorSubject<WsMessage | null>(null);
  private _connected$ = new BehaviorSubject<boolean>(false);

  messages$ = this._messages$.asObservable();
  connected$ = this._connected$.asObservable();

  constructor(private auth: AuthService) {}

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
      // Reconnect after 3 seconds
      timer(3000).subscribe(() => this.connect());
    };

    this.ws.onerror = () => {
      this._connected$.next(false);
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
