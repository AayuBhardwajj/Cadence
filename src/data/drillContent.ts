export interface DrillPhrase {
    id: string;
    bucket: 'th_sound' | 'v_w_mix';
    targetText: string;
    focusWords: string[];
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface BucketInfo {
    id: 'th_sound' | 'v_w_mix';
    title: string;
    description: string;
    tip: string;
}

export const DRILL_BUCKETS: Record<string, BucketInfo> = {
    th_sound: {
        id: 'th_sound',
        title: 'TH Sound Mastery',
        description: 'Practice voiced and unvoiced "th" phonemes without replacing them with "t" or "d".',
        tip: 'Place the tip of your tongue between your teeth and let the air flow gently.'
    },
    v_w_mix: {
        id: 'v_w_mix',
        title: 'V vs W Distinction',
        description: 'Clear differentiation between "V" (lip-to-teeth) and "W" (rounded lips).',
        tip: 'For V, touch top teeth to bottom lip. For W, round your lips like saying "oo".'
    }
};

export const STATIC_DRILL_PHRASES: DrillPhrase[] = [
    // ── TH SOUND ─────────────────────────────────────────────────────────────
    {
        id: 'th-1',
        bucket: 'th_sound',
        targetText: 'Three thin thieves thought through thirty things',
        focusWords: ['three', 'thin', 'thieves', 'thought', 'through', 'thirty', 'things'],
        difficulty: 'medium'
    },
    {
        id: 'th-2',
        bucket: 'th_sound',
        targetText: 'I think that the third author wrote with great depth',
        focusWords: ['think', 'that', 'the', 'third', 'author', 'with', 'depth'],
        difficulty: 'easy'
    },
    {
        id: 'th-3',
        bucket: 'th_sound',
        targetText: 'They thought they could thrive through the thermal weather',
        focusWords: ['they', 'thought', 'thrive', 'through', 'thermal', 'weather'],
        difficulty: 'medium'
    },
    {
        id: 'th-4',
        bucket: 'th_sound',
        targetText: 'The author thanked his mother and brother with warmth',
        focusWords: ['author', 'thanked', 'mother', 'brother', 'with', 'warmth'],
        difficulty: 'easy'
    },
    {
        id: 'th-5',
        bucket: 'th_sound',
        targetText: 'Thirty thousand thoughtful thinkers walked the path together',
        focusWords: ['thirty', 'thousand', 'thoughtful', 'thinkers', 'path', 'together'],
        difficulty: 'hard'
    },

    // ── V vs W MIX ───────────────────────────────────────────────────────────
    {
        id: 'vw-1',
        bucket: 'v_w_mix',
        targetText: 'Victor viewed very warm winter waves with wonder',
        focusWords: ['victor', 'viewed', 'very', 'warm', 'winter', 'waves', 'wonder'],
        difficulty: 'medium'
    },
    {
        id: 'vw-2',
        bucket: 'v_w_mix',
        targetText: 'We visited the vast valley with vital water',
        focusWords: ['we', 'visited', 'vast', 'valley', 'vital', 'water'],
        difficulty: 'easy'
    },
    {
        id: 'vw-3',
        bucket: 'v_w_mix',
        targetText: 'The wise wizard washed the vintage velvet vest',
        focusWords: ['wise', 'wizard', 'washed', 'vintage', 'velvet', 'vest'],
        difficulty: 'medium'
    },
    {
        id: 'vw-4',
        bucket: 'v_w_mix',
        targetText: 'Vivid voices whispered welcome across the western valley',
        focusWords: ['vivid', 'voices', 'whispered', 'welcome', 'western', 'valley'],
        difficulty: 'hard'
    },
    {
        id: 'vw-5',
        bucket: 'v_w_mix',
        targetText: 'Every traveler will value fresh white wine and warm water',
        focusWords: ['every', 'traveler', 'will', 'value', 'white', 'wine', 'warm', 'water'],
        difficulty: 'medium'
    }
];
