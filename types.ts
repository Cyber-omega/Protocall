
export enum InterviewStatus {
  IDLE = 'IDLE',
  SETUP = 'SETUP',
  INTERVIEWING = 'INTERVIEWING',
  COMPLETED = 'COMPLETED'
}

export interface InterviewSessionConfig {
  role: string;
  company?: string;
  difficulty: 'Junior' | 'Mid-Level' | 'Senior' | 'Lead';
  focus: string[];
}

export interface UserStats {
  totalSessions: number;
  currentStreak: number;
  lastSessionDate: string | null;
  scoreHistory: number[];
  averageScore: number;
}

export interface InterviewAnalysis {
  overallScore: number;
  clarity: number;
  confidence: number;
  communication: number;
  technicalKnowledge: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  transcript: string;
  duration?: string; 
}

export interface TranscriptionTurn {
  role: 'user' | 'interviewer';
  text: string;
}

export interface AppState {
  theme: 'light' | 'dark';
  status: InterviewStatus;
  config: InterviewSessionConfig | null;
  analysis: InterviewAnalysis | null;
  history: TranscriptionTurn[];
  stats: UserStats;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
