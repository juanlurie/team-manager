export interface AiPrompt {
  id?: string;
  key: string;
  label: string;
  systemPrompt: string;
  userMessageTemplate: string;
  enabled: boolean;
  connectionId: string;
  connectionName?: string | null;
  // Optional per-prompt model override; blank = use the connection's default model.
  model?: string | null;
}

export interface TestAiPromptResult {
  success: boolean;
  extractedText: string | null;
  error: string | null;
}

export interface AiPromptKeyMeta {
  value: string;
  label: string;
  vars: Record<string, string>;
  // Pre-fills the System Prompt field when this key is first picked and the field is still
  // empty (see ai-prompts.component.ts onKeyChange) -- a working starting point for keys whose
  // expected JSON response shape isn't obvious to guess from the var names alone.
  systemPromptSuggestion?: string;
}

// The known AI use cases this app currently has -- matches the Key values the backing
// generator services (QuizQuestionGeneratorService, WordleWordGeneratorService, etc.) look up by.
export const AI_PROMPT_KEYS: AiPromptKeyMeta[] = [
  { value: 'GenerateQuizQuestion', label: 'Generate Quiz Question', vars: { topic: '', angle: '', recentTopics: '', difficulty: '' } },
  { value: 'GenerateWordleWord', label: 'Generate Wordle Word', vars: { wordLength: '', recentWords: '' } },
  { value: 'GenerateJoke', label: 'Generate Joke', vars: { jokeType: '', seed: '' } },
  { value: 'AiChatWinStory', label: 'AI Chat — Win Story', vars: { nominee: '', title: '', description: '', theme: '' } },
  { value: 'AnalyzeTimesheetQuality', label: 'Analyze Timesheet Quality', vars: { timesheetData: '', memberName: '', start: '', end: '' } },
  {
    value: 'AnalyseRetroCards', label: 'Retro — Sentiment & Themes Analysis',
    vars: { wellCards: '', betterCards: '', actionCards: '' },
    // Shown as a starter in the System Prompt field when this key is first picked (see
    // ai-prompts.component.ts onKeyChange) -- the actual celebratory tone / JSON shape is
    // authored here by an admin, not hardcoded in the backend.
    systemPromptSuggestion:
      'You are analysing a team retrospective board. Read the cards below and respond with ONLY a ' +
      'single valid JSON object, no other text, in this exact shape:\n' +
      '{"sentiment":"Positive|Mixed|Concerned|Negative","sentimentSummary":"one upbeat sentence",' +
      '"celebrations":["a specific win worth reading aloud to the team", "..."],' +
      '"wellThemes":["short topic tag", "..."],"betterThemes":["short topic tag", "..."],' +
      '"actionThemes":["short topic tag", "..."],"keyInsights":["one sentence", "..."],' +
      '"suggestedActions":["one concrete next step", "..."]}\n' +
      'Bias the tone toward celebration: lead with what the team should be proud of, and only ' +
      'raise concerns in a constructive, forward-looking way. Keep every list to at most 5 items.',
  },
  {
    value: 'GroupRetroCards', label: 'Retro — Group Similar Cards',
    vars: { cards: '' },
    systemPromptSuggestion:
      'You are clustering similar sticky notes from a team retrospective board. Each input line is ' +
      '"id|column|text". Group cards that express the same underlying point, even if worded ' +
      'differently, regardless of which column they are in. Respond with ONLY a single valid JSON ' +
      'array, no other text, in this exact shape:\n' +
      '[{"label":"short name for the group","cardIds":["<id>","<id>"]}]\n' +
      'Only include groups of 2 or more cards. Omit cards that do not clearly belong with another card.',
  },
];
