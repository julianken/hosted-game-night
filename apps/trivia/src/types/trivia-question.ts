export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
  source?: string;
  externalId?: string;
}
