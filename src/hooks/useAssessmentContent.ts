import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';

export interface AssessmentPackage {
  passageId?: string;
  topicPrompt: string;
  readingPassage: string;
  targetWords?: Array<{
    wordCode: string;
    word: string;
    issueType: string;
    bucket: string;
    charStart: number;
    charEnd: number;
  }>;
  articulationExercises?: string[];
  vocabularyChallenge?: { word: string; definition: string; example: string }[];
  followUpQuestions?: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | string;
  source?: 'pool' | 'fallback';
}

function toCamelCasePackage(raw: any): AssessmentPackage {
  return {
    passageId: raw.passage_id,
    topicPrompt: raw.topic_prompt || 'Please speak clearly on the given topic.',
    readingPassage: raw.passage_text || raw.reading_passage || '',
    targetWords: (raw.target_words || []).map((w: any) => ({
      wordCode: w.word_code,
      word: w.word,
      issueType: w.issue_type,
      bucket: w.bucket,
      charStart: w.char_start,
      charEnd: w.char_end,
    })),
    articulationExercises: raw.articulation_exercises || [],
    vocabularyChallenge: raw.vocabulary_challenge || [],
    followUpQuestions: raw.follow_up_questions || [],
    difficultyLevel: raw.difficulty || raw.difficulty_level || 'intermediate',
    source: raw.source,
  };
}

export function useAssessmentContent(topic: string, difficulty: string, sessionId?: string | null) {
  return useQuery({
    queryKey: ['assessment-content', topic, difficulty, sessionId],
    queryFn: () =>
      apiClient.post<any>('/api/passages/generate', {
        topic,
        difficulty,
        sessionId,
      }).then(toCamelCasePackage),
    staleTime: 1000 * 60 * 30, // 30 minutes — don't regenerate mid-session
    enabled: Boolean(topic && difficulty),
  });
}

