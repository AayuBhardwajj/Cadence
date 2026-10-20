import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper to simulate course progress percentage calculation
function calculateProgress(completedLessons: number, totalLessons: number): number {
    if (totalLessons <= 0) return 0;
    return Math.round((completedLessons / totalLessons) * 100);
}

// Helper to simulate sentence repetition word overlap matching
function calculateWordOverlap(target: string, response: string): { isMatch: boolean; score: number; feedback: string } {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const cleanTarget = normalize(target);
    const cleanResponse = normalize(response);

    if (cleanTarget === cleanResponse) {
        return {
            isMatch: true,
            score: 100,
            feedback: 'Flawless repetition! You captured the full sentence cadence, syllable stress, and thought boundaries.'
        };
    }

    const targetWords = cleanTarget.split(' ');
    const responseWords = cleanResponse.split(' ');
    let matches = 0;
    for (const tw of targetWords) {
        if (responseWords.includes(tw)) {
            matches++;
        }
    }

    const similarity = targetWords.length > 0 ? matches / targetWords.length : 0;
    if (similarity >= 0.75) {
        return {
            isMatch: true,
            score: 85,
            feedback: 'Strong attempt! You maintained the core thought group structure with minor pronunciation or omission variance.'
        };
    }

    return {
        isMatch: false,
        score: 45,
        feedback: 'Good effort, but several key words were missed or altered.'
    };
}

describe('Cadence Course & Learning Pipeline Frontend Tests', () => {
    describe('Course Progress & Metric Calculations', () => {
        it('calculates 0% progress when no lessons are completed', () => {
            assert.equal(calculateProgress(0, 5), 0);
            assert.equal(calculateProgress(0, 0), 0);
        });

        it('calculates correct completion percentages', () => {
            assert.equal(calculateProgress(1, 4), 25);
            assert.equal(calculateProgress(2, 4), 50);
            assert.equal(calculateProgress(3, 4), 75);
            assert.equal(calculateProgress(4, 4), 100);
        });

        it('rounds floating progress percentages appropriately', () => {
            assert.equal(calculateProgress(1, 3), 33);
            assert.equal(calculateProgress(2, 3), 67);
        });
    });

    describe('Interactive Exercise Evaluation Rules', () => {
        const targetPrompt = 'Good afternoon everyone, and thank you for joining our project kickoff.';

        it('awards 100 score for exact sentence repetition', () => {
            const evalResult = calculateWordOverlap(targetPrompt, 'Good afternoon everyone, and thank you for joining our project kickoff.');
            assert.equal(evalResult.isMatch, true);
            assert.equal(evalResult.score, 100);
            assert.match(evalResult.feedback, /Flawless/);
        });

        it('handles case-insensitivity and punctuation differences in repetition', () => {
            const evalResult = calculateWordOverlap(targetPrompt, 'good afternoon everyone and thank you for joining our project kickoff');
            assert.equal(evalResult.isMatch, true);
            assert.equal(evalResult.score, 100);
        });

        it('awards partial score (85) for 75%+ word similarity', () => {
            const evalResult = calculateWordOverlap(targetPrompt, 'Good afternoon everyone, thank you for joining our project meeting.');
            assert.equal(evalResult.isMatch, true);
            assert.equal(evalResult.score, 85);
            assert.match(evalResult.feedback, /Strong attempt/);
        });

        it('rejects attempt with low overlap (< 75%)', () => {
            const evalResult = calculateWordOverlap(targetPrompt, 'Hello guys, welcome to the talk.');
            assert.equal(evalResult.isMatch, false);
            assert.equal(evalResult.score, 45);
        });
    });

    describe('Report-to-Learning Navigation & URL Parameter Resolution', () => {
        it('resolves courseId parameter from query string', () => {
            const params = new URLSearchParams('?courseId=40000000-0000-0000-0000-000000000001');
            assert.equal(params.get('courseId'), '40000000-0000-0000-0000-000000000001');
            assert.equal(params.get('lessonId'), null);
        });

        it('resolves combined courseId and lessonId parameters', () => {
            const params = new URLSearchParams('?courseId=40000000-0000-0000-0000-000000000001&lessonId=60000000-0000-0000-0000-000000000001');
            assert.equal(params.get('courseId'), '40000000-0000-0000-0000-000000000001');
            assert.equal(params.get('lessonId'), '60000000-0000-0000-0000-000000000001');
        });
    });
});
