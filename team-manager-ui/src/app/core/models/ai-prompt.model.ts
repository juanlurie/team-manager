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
  // Pre-fill the System Prompt / User Message Template fields when this key is first picked and
  // the field is still empty (see ai-prompts.component.ts onKeyChange) -- a working starting
  // point for every key, not just the ones whose expected response shape is hard to guess. An
  // admin is still free to edit or replace either field after picking; this only fills a blank.
  systemPromptSuggestion?: string;
  userMessageSuggestion?: string;
}

// The known AI use cases this app currently has -- matches the Key values the backing
// generator services (QuizQuestionGeneratorService, WordleWordGeneratorService, etc.) look up by.
export const AI_PROMPT_KEYS: AiPromptKeyMeta[] = [
  {
    value: 'GenerateQuizQuestion', label: 'Generate Quiz Question',
    vars: { topic: '', angle: '', recentTopics: '', difficulty: '' },
    systemPromptSuggestion:
      'You write trivia questions for a team quiz game. Respond with ONLY a single valid JSON ' +
      'object, no other text, in this exact shape:\n' +
      '{"question":"the question text","options":["A","B","C","D"],"correctIndex":0}\n' +
      'Exactly 4 options, correctIndex is the 0-based index of the correct one. Keep the question ' +
      'unambiguous and the wrong options plausible, not silly.',
    userMessageSuggestion:
      'Write a {difficulty} trivia question about {topic}, angle: {angle}. ' +
      'Do not repeat any of these recent topics: {recentTopics}',
  },
  {
    value: 'GenerateWordleWord', label: 'Generate Wordle Word',
    vars: { wordLength: '', recentWords: '' },
    systemPromptSuggestion:
      'You pick secret words for a Wordle-style game. Respond with ONLY a single valid JSON ' +
      'object, no other text, in this exact shape:\n' +
      '{"word":"apple"}\n' +
      'The word must be common enough for a general audience to guess, all lowercase letters, no ' +
      'proper nouns, no plurals ending in a rare letter combo.',
    userMessageSuggestion:
      'Pick a {wordLength}-letter English word. Do not repeat any of these recent words: {recentWords}',
  },
  {
    value: 'GenerateJoke', label: 'Generate Joke',
    vars: { jokeType: '', seed: '' },
    systemPromptSuggestion:
      'You tell short, work-appropriate jokes for a team chat. Respond with ONLY the joke text, ' +
      'no preamble, no quotes around it, no explanation.',
    userMessageSuggestion: 'Tell a joke. Type/theme: {jokeType} (seed {seed}, use it to vary phrasing/topic)',
  },
  {
    value: 'AiChatWinStory', label: 'AI Chat — Win Story',
    vars: { nominee: '', title: '', description: '', theme: '' },
    systemPromptSuggestion:
      'You write short, fun "hero saga" style short stories celebrating a team member\'s weekly ' +
      'win, styled around a given theme. Respond with ONLY the story text, no preamble, 3-5 short ' +
      'paragraphs, playful tone, no markdown headers.',
    userMessageSuggestion:
      'Nominee: {nominee}\nWin title: {title}\nDescription: {description}\nTheme: {theme}\n' +
      'Write their win as a short story in that theme.',
  },
  {
    value: 'AnalyzeTimesheetQuality', label: 'Analyze Timesheet Quality',
    vars: { timesheetData: '', memberName: '', start: '', end: '' },
    systemPromptSuggestion:
      'You review timesheet entries for quality and completeness (missing days, vague ' +
      'descriptions, unusually short/long entries). Respond with ONLY a short plain-text analysis, ' +
      '3-6 sentences, specific and constructive, no markdown, no JSON.',
    userMessageSuggestion: 'Review {memberName}\'s timesheet from {start} to {end}:\n{timesheetData}',
  },
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
    userMessageSuggestion:
      'Went well:\n{wellCards}\n\nCould be better:\n{betterCards}\n\nAction items:\n{actionCards}',
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
    userMessageSuggestion: 'Cards:\n{cards}',
  },
];
