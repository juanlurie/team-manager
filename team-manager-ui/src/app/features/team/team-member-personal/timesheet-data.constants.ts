export const TIMESHEET_PROJECTS = [
  'Interim Project Work',
  'Training',
  'Meetings and Reviews',
  'Social Events',
  'Entelect Maintenance',
  'Remote Culture',
  'Entelect Software Recruitment',
  'People Training',
  'R - Standard Bank BCB - OB4B Backbase Features',
];

export const CATEGORIES_BY_PROJECT: Record<string, string[]> = {
  'Interim Project Work': ['Software Development', 'Analysis', 'Bounty Board', 'TFO Meetings'],
  'Training': [
    'External Conference Attendance', 'External Conference Presentation',
    'User Group Attendance', 'User Group Presentation',
    'Forum Attendance', 'Forum Presentation',
    'External Training Attendance', 'DOJO Attendance', 'Internal Training Preparation',
    'DOJO Presentation', 'External Training Preparation',
    'DevDay Attendance', 'DevDay Presentation', 'Thought Leadership',
    'DevCamp (LearnToCode) Attendance', 'DevCamp Presentation',
    'External Training Presentation', 'DevCamp (NewLanguage) Attendance',
    'Interim Training Attendance', 'Job Shadow Assistance',
    'Coffee & Code Attendance', 'Coffee & Code Presentation',
    'Streaming Party Presentation', 'Streaming Party Attendance',
    'Self-study', 'Awareness Training Attendance',
    'Beer & Tech Attendance', 'Beer & Tech Presentation',
    'Bootcamp Attendance', 'Bootcamp Presentation', 'Salesforce Bootcamp Attendance',
  ],
  'Meetings and Reviews': [
    'Review Attendance', 'Review Facilitation', 'Online Review Capture',
    'One On One Attendance', 'One On One Facilitation', 'Client Interview',
    'Entelect Knowledge Sharing Meeting', 'Team Lead Inductions',
    'New Employee Induction', 'Client Interview Preparation',
    'Team Lead Breakaway', 'Existing Employee Induction',
    'Project Lead Programme', 'Entelect Flights',
  ],
  'Social Events': [
    'Team Lunch Attendance', 'Team Building Attendance',
    'Social Club Attendance', 'Year End Function Attendance', 'Community Contribution',
  ],
  'Entelect Maintenance': ['PC Maintenance'],
  'Remote Culture': [
    'Movie Debate', 'Dad Joke Penalty Shootout', 'Team Chat Roulette', 'Other',
    'Pet Hour', "It's Wednesday My Dudes", 'Build a Burger', 'Where in the World',
    'Guess the Movie Poster', 'TikTok/Short Clip of the Day', 'Chess Tournament',
    'Learn to Draw', 'Watercooler Chat', 'Sit in the Sun and Chat', 'Zoom HeadsUp!',
    'Virtual Charades', 'Your [*Object*] Exciting Story', 'Share a Song',
    'Have you Ever', 'Word at a Time Story', 'Riddle Time Trial', 'Talent Show',
    'Gartic Phone', 'Lip Sync Battle', 'Hidden Talent Show', 'Random Trivia',
  ],
  'Entelect Software Recruitment': ['Interviews', 'Candidate Search', 'Administration', 'General', 'Graduate Initiatives'],
  'People Training': [
    'H4x0r', '1337', 'Career Accelerator Programme',
    'ElevateHER Leadership Programme', 'Craft Project Lead Programme',
    'Project Lead Programme', 'Graduate Initiative', 'H4x0r Attendance',
  ],
  'R - Standard Bank BCB - OB4B Backbase Features': ['Analysis & Design', 'Development', 'Meetings'],
};

export const DESCRIPTION_PRESETS = [
  'Stand up', 'Code review', 'Sprint planning', 'Retrospective',
  'Sprint review', 'Pair programming', 'Documentation', 'Bug investigation',
];

export const WORKED_FROM_OPTIONS = ['Home', 'Entelect', 'Client'];
export const SENTIMENT_OPTIONS = ['Happy', 'Neutral', 'Sad'];
export const TIME_PRESETS_MINUTES = [15, 30, 60, 120, 240, 480];

export const QUICK_COMBOS = [
  { label: 'Dev', project: 'Interim Project Work', category: 'Software Development' },
  { label: 'Analysis', project: 'Interim Project Work', category: 'Analysis' },
  { label: '1:1', project: 'Meetings and Reviews', category: 'One On One Facilitation' },
  { label: 'Training', project: 'Training', category: 'Self-study' },
  { label: 'Remote', project: 'Remote Culture', category: 'Other' },
];

export interface ActivityCombo {
  label: string;
  project: string;
  category: string;
  color: string;
  bg: string;
}

export const ACTIVITY_COMBOS: ActivityCombo[] = [
  { label: 'Dev',      project: 'Interim Project Work',  category: 'Software Development',    color: '#82aaff', bg: 'rgba(130,170,255,0.15)' },
  { label: 'Analysis', project: 'Interim Project Work',  category: 'Analysis',                color: '#4caf50', bg: 'rgba(76,175,80,0.13)' },
  { label: '1:1',      project: 'Meetings and Reviews',  category: 'One On One Facilitation', color: '#ff9800', bg: 'rgba(255,152,0,0.14)' },
  { label: 'Training', project: 'Training',              category: 'Self-study',              color: '#ce93d8', bg: 'rgba(206,147,216,0.14)' },
  { label: 'Remote',   project: 'Remote Culture',        category: 'Other',                   color: '#4dd0e1', bg: 'rgba(77,208,225,0.13)' },
  { label: 'Review',   project: 'Meetings and Reviews',  category: 'Review Attendance',       color: '#ffb74d', bg: 'rgba(255,183,77,0.14)' },
];

export const DURATION_CHIPS = ['15m', '30m', '45m', '1h', '2h', '4h', '8h'];

export const DURATION_CHIP_MINUTES: Record<string, number> = {
  '15m': 15, '30m': 30, '45m': 45, '1h': 60, '2h': 120, '4h': 240, '8h': 480,
};

export function minutesToDurationLabel(total: number): string {
  if (!total) return '—';
  const h = Math.floor(total / 60), m = total % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

export const PUBLIC_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-03-23', // Human Rights Day observed
  '2026-04-03', // Good Friday
  '2026-04-06', // Family Day
  '2026-04-27', // Freedom Day
  '2026-05-01', // Workers' Day
  '2026-06-16', // Youth Day
  '2026-08-10', // National Women's Day observed
  '2026-09-24', // Heritage Day
  '2026-12-16', // Day of Reconciliation
  '2026-12-25', // Christmas Day
  '2026-12-28', // Day of Goodwill observed
];
