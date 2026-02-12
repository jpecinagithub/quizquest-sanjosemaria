
export enum Screen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS',
  CLASSIFICATION = 'CLASSIFICATION',
  ADMIN = 'ADMIN',
  QUIZ = 'QUIZ',
  RESULTS = 'RESULTS'
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface Subject {
  id: string;
  name: string;
  imageUrl?: string;
  description: string;
  quizCount: number;
  progress: number;
}

export interface QuizState {
  subject: Subject;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answers: number[];
  startTime: number;
  endTime?: number;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  profile_pic?: string | null;
  total_xp: number;
  is_admin?: boolean;
}
