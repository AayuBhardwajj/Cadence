import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';

export interface AssessmentPackage {
  topicPrompt: string;
  readingPassage: string;
  articulationExercises: string[];
  vocabularyChallenge: { word: string; definition: string; example: string }[];
  followUpQuestions: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
}

export function useAssessmentContent(topic: string, difficulty: string) {
  return useQuery({
    queryKey: ['assessment-content', topic, difficulty],
    queryFn: () =>
      apiClient.post<AssessmentPackage>('/api/assessments/generate-content', {
        topic,
        difficulty,
      }),
    staleTime: 1000 * 60 * 30, // 30 minutes — don't regenerate mid-session
    enabled: Boolean(topic && difficulty),
  });
}
