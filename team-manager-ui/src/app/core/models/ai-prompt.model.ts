export interface AiPrompt {
  id?: string;
  key: string;
  label: string;
  systemPrompt: string;
  userMessageTemplate: string;
  enabled: boolean;
  connectionId: string;
  connectionName?: string | null;
}

export interface TestAiPromptResult {
  success: boolean;
  extractedText: string | null;
  error: string | null;
}

// The 5 known AI use cases this app currently has -- matches the Key values the backing
// generator services (QuizQuestionGeneratorService, WordleWordGeneratorService, etc.) look up by.
export const AI_PROMPT_KEYS = [
  { value: 'GenerateQuizQuestion', label: 'Generate Quiz Question', vars: { topic: '', angle: '', recentTopics: '', difficulty: '' } },
  { value: 'GenerateWordleWord', label: 'Generate Wordle Word', vars: { wordLength: '', recentWords: '' } },
  { value: 'GenerateJoke', label: 'Generate Joke', vars: { jokeType: '', seed: '' } },
  { value: 'AiChatWinStory', label: 'AI Chat — Win Story', vars: { nominee: '', title: '', description: '' } },
  { value: 'AnalyzeTimesheetQuality', label: 'Analyze Timesheet Quality', vars: { timesheetData: '', memberName: '', start: '', end: '' } },
] as const;
