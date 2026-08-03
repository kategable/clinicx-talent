export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
}

export interface OnboardingResponse {
  message: string;
  step:
    | 'greeting'
    | 'identity'
    | 'location'
    | 'role'
    | 'experience'
    | 'skills'
    | 'availability'
    | 'complete';
  /** Fields to persist from the user's answer, merged into existing details. */
  profileUpdates?: Record<string, string>;
}
