import { WsEvent } from '../websocket.service';

export const QUIZ_GAME_EVENT_TYPES = [
  'quiz_game_session_created',
  'quiz_game_participant_joined',
  'quiz_game_started',
  'quiz_game_answer_submitted',
  'quiz_game_question_revealed',
  'quiz_game_next_question',
  'quiz_game_completed',
] as const;

export type QuizGameEvent = WsEvent<(typeof QUIZ_GAME_EVENT_TYPES)[number]>;
