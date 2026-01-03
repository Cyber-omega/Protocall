
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
  duration?: string; // Formatted string like "12:45"
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
