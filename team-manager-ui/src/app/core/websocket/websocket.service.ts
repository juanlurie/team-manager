import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';

export interface WsMessage {
  type: 'vote_cast' | 'vote_removed' | 'voting_opened' | 'voting_closed' | 'sudden_death_started' | 'nominations_reopened' | 'nomination_created' | 'nomination_updated' | 'nomination_deleted' | 'retro_action_created' | 'retro_action_updated' | 'retro_action_deleted' | 'retro_card_added' | 'retro_card_deleted' | 'retro_voted' | 'retro_phase_changed' | 'retro_timer_updated' | 'retro_reaction_toggled' | 'retro_icebreaker_answered' | 'presence_changed' | 'scrum_poker_session_created' | 'scrum_poker_vote_cast' | 'scrum_poker_votes_revealed' | 'scrum_poker_session_reset' | 'scrum_poker_session_deleted' | 'timesheet_entry_created' | 'timesheet_entry_updated' | 'timesheet_entry_deleted' | 'win_story_ready' | 'joke_generated' | 'hype_meter_tapped' | 'reaction_sent' | 'wow_timer_started' | 'wow_timer_stopped' | 'wow_hype_battle_started' | 'wow_hype_battle_ended' | 'wow_quiz_started' | 'wow_quiz_answer_submitted' | 'wow_quiz_revealed' | 'wow_quiz_stopped' | 'poll_created' | 'poll_vote_cast' | 'poll_closed' | 'poll_deleted' | 'poll_settings_updated' | 'quiz_game_session_created' | 'quiz_game_participant_joined' | 'quiz_game_started' | 'quiz_game_answer_submitted' | 'quiz_game_question_revealed' | 'quiz_game_next_question' | 'quiz_game_completed' | 'access_request_submitted' | 'access_request_approved' | 'fun_retro_card_added' | 'fun_retro_phase_changed' | 'fun_retro_revealed' | 'fun_retro_voted' | 'fun_retro_reacted' | 'fun_retro_analysed' | 'fun_retro_card_moved' | 'fun_retro_card_color_changed' | 'fun_retro_card_grouped' | 'fun_retro_card_text_updated' | 'fun_retro_timer_updated' | 'fun_retro_settings_updated' | 'fun_retro_icebreaker_answered' | 'fun_retro_presence' | 'dots_boxes_update' | 'game_2048_update' | 'game_threes_update' | 'game_ultimate_ttt_update';
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private oauth = inject(OAuthService);
  private ws: WebSocket | null = null;
  private _messages$ = new BehaviorSubject<WsMessage | null>(null);
  private _connected$ = new BehaviorSubject<boolean>(false);
  private reconnectTimer: any;

  messages$ = this._messages$.asObservable();
  connected$ = this._connected$.asObservable();

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
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this._connected$.next(false);
    };
  }

  send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
