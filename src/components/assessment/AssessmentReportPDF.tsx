import React from 'react';
import {
    Document, Page, Text, View, StyleSheet, Font
} from '@react-pdf/renderer';
import { AnalysisResult } from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssessmentReportPDFProps {
    userName: string;
    sessionId: string;
    result: AnalysisResult;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scoreColor = (score: number) => {
    if (score >= 70) return '#276749'; // green
    if (score >= 30) return '#975A16'; // yellow
    return '#9B2C2C';                  // red
};

const scoreBg = (score: number) => {
    if (score >= 70) return '#F0FFF4';
    if (score >= 30) return '#FFFFF0';
    return '#FFF5F5';
};

const scoreDot = (score: number) => {
    if (score >= 70) return '● ';
    if (score >= 30) return '● ';
    return '● ';
};

const scoreDotColor = (score: number) => {
    if (score >= 70) return '#38A169';
    if (score >= 30) return '#D69E2E';
    return '#E53E3E';
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#1A202C',
        paddingTop: 36,
        paddingBottom: 48,
        paddingHorizontal: 40,
        backgroundColor: '#FFFFFF',
    },

    // Header
    reportHeader: {
        borderBottomWidth: 3,
        borderBottomColor: '#1A202C',
        paddingBottom: 8,
        marginBottom: 16,
    },
    reportTitle: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#1A202C',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    headerSub: { fontSize: 8, color: '#4A5568' },

    // Section heading
    sectionHeading: {
        fontSize: 13,
        fontFamily: 'Helvetica-Bold',
        color: '#1A365D',
        borderBottomWidth: 2,
        borderBottomColor: '#1A202C',
        paddingBottom: 4,
        marginBottom: 12,
    },
    subHeading: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#2D3748',
        marginBottom: 6,
    },

    // Grid helpers
    row: { flexDirection: 'row' },
    col2: { flex: 1 },
    gap4: { marginRight: 8 },
    gap8: { marginRight: 16 },

    // Candidate info grid
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#F7FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    infoCell: { width: '48%', marginBottom: 6 },
    infoLabel: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#718096',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1A202C' },

    // Score tiles
    tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    tile: {
        width: '31%',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        padding: 8,
        backgroundColor: '#FFFFFF',
    },
    tileName: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#4A5568', marginBottom: 6, minHeight: 22 },
    tileScore: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
    tileScoreSuffix: { fontSize: 8, color: '#718096' },
    tileDot: { fontSize: 10, marginTop: 2 },

    // Sub-dimension bars
    dimSection: { marginBottom: 12 },
    dimHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    dimLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#2D3748' },
    dimScore: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    dimSubRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: '#E2E8F0',
        marginBottom: 2,
    },
    dimSubLabel: { fontSize: 7.5, color: '#718096' },
    dimSubVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#4A5568' },

    // Progress bar
    barBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginTop: 2 },
    barFill: { height: 4, borderRadius: 2 },

    // Insight cards
    insightCard: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        padding: 10,
        backgroundColor: '#FFFFFF',
        marginBottom: 10,
    },
    insightHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    insightDim: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1A202C' },
    insightDef: { fontSize: 7.5, color: '#718096', fontStyle: 'italic', marginBottom: 4 },
    divider: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginVertical: 4 },
    insightFeedback: { fontSize: 8, color: '#2D3748', lineHeight: 1.5 },

    // MTI
    mtiAccentBox: {
        backgroundColor: '#FFF5F5',
        borderLeftWidth: 4,
        borderLeftColor: '#FC8181',
        padding: 8,
        marginBottom: 14,
    },
    mtiAccentText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#742A2A' },
    mtiPattern: { borderBottomWidth: 1, borderBottomColor: '#EDF2F7', paddingBottom: 10, marginBottom: 10 },
    mtiPatternHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    mtiPatternName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#2D3748' },
    badge: { fontSize: 7, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
    bulletText: { fontSize: 7.5, color: '#4A5568', marginBottom: 2, paddingLeft: 8 },

    // Transcript
    transcriptLabel: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#718096',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    transcriptBox: {
        backgroundColor: '#F7FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 3,
        padding: 8,
        marginBottom: 10,
    },
    transcriptText: { fontSize: 8, color: '#4A5568', lineHeight: 1.5, fontStyle: 'italic' },
    transcriptUserText: { fontSize: 8, color: '#2D3748', lineHeight: 1.5 },

    // Error/stats sidebar tables
    darkTable: {
        backgroundColor: '#2D3748',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    darkTableHeader: {
        backgroundColor: '#1A365D',
        padding: 6,
        alignItems: 'center',
    },
    darkTableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
    darkTableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '5 8',
        borderBottomWidth: 1,
        borderBottomColor: '#4A5568',
    },
    darkTableLabel: { fontSize: 7.5, color: '#E2E8F0' },
    darkTableVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FC8181' },
    lightTable: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    lightTableHeader: {
        backgroundColor: '#F7FAFC',
        padding: 6,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    lightTableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#4A5568', textTransform: 'uppercase', letterSpacing: 0.5 },
    lightTableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '5 8',
        borderBottomWidth: 1,
        borderBottomColor: '#F7FAFC',
    },
    lightTableLabel: { fontSize: 7, color: '#718096' },
    lightTableVal: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#2D3748' },

    // Error log table
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#F7FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        padding: '5 4',
    },
    tableHeaderCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#4A5568', flex: 1 },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EDF2F7',
        padding: '4 4',
    },
    tableCell: { fontSize: 7, color: '#4A5568', flex: 1 },

    // Sentence breakdown
    sentenceCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#4299E1',
        backgroundColor: '#F7FAFC',
        paddingLeft: 10,
        paddingRight: 8,
        paddingVertical: 8,
        borderRadius: 2,
        marginBottom: 10,
    },
    sentenceText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1A202C', marginBottom: 6 },
    sentenceDetailRow: { flexDirection: 'row', marginBottom: 2 },
    sentenceDetailLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#718096', width: 110 },
    sentenceDetailVal: { fontSize: 7.5, color: '#4A5568', flex: 1 },

    // Summary
    summaryScoreBox: {
        backgroundColor: '#EBF8FF',
        borderWidth: 1,
        borderColor: '#BEE3F8',
        borderRadius: 4,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryScoreLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#2B6CB0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    summaryScoreVal: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#1A365D' },
    summaryScoreSuffix: { fontSize: 11, color: '#718096' },
    summaryDivider: { width: 2, height: 50, backgroundColor: '#BEE3F8', marginHorizontal: 30 },
    strengthsBox: {
        flex: 1,
        backgroundColor: '#F0FFF4',
        borderWidth: 1,
        borderColor: '#C6F6D5',
        borderRadius: 4,
        padding: 10,
        marginRight: 8,
    },
    improvementsBox: {
        flex: 1,
        backgroundColor: '#FFF5F5',
        borderWidth: 1,
        borderColor: '#FED7D7',
        borderRadius: 4,
        padding: 10,
    },
    strengthsTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#276749', marginBottom: 6 },
    improvementsTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#9B2C2C', marginBottom: 6 },
    bulletItem: { fontSize: 7.5, color: '#2D3748', marginBottom: 3, lineHeight: 1.4 },

    // Learning resources
    resourceArea: { marginBottom: 12 },
    resourceAreaTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#2D3748', marginBottom: 5 },
    resourceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 3,
        padding: '5 8',
        marginBottom: 3,
        backgroundColor: '#FFFFFF',
    },
    resourceTitle: { fontSize: 7.5, color: '#4A5568', flex: 1 },
    resourceBadge: {
        fontSize: 6.5,
        fontFamily: 'Helvetica-Bold',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
        backgroundColor: '#FEB2B2',
        color: '#742A2A',
    },

    // Plan
    weekCard: {
        backgroundColor: '#EBF8FF',
        borderWidth: 1,
        borderColor: '#BEE3F8',
        borderRadius: 4,
        padding: 12,
        marginBottom: 14,
    },
    weekBadge: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        backgroundColor: '#4299E1',
        color: '#FFFFFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    weekFocus: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1A365D', marginBottom: 2 },
    weekMins: { fontSize: 7.5, color: '#2B6CB0', marginBottom: 6 },
    weekExerciseBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#BEE3F8',
        borderRadius: 3,
        padding: 8,
    },
    weekExerciseLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#718096', textTransform: 'uppercase', marginBottom: 2 },
    weekExerciseText: { fontSize: 8, color: '#2D3748', lineHeight: 1.5 },

    // Practice exercises
    exerciseCard: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        padding: 10,
        marginBottom: 10,
    },
    exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    exerciseTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#2D3748', flex: 1 },
    exerciseDuration: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#C05621', backgroundColor: '#FEEBC8', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
    exerciseDesc: { fontSize: 8, color: '#4A5568', lineHeight: 1.5 },
    nextTopicBox: {
        backgroundColor: '#2D3748',
        borderRadius: 4,
        padding: 12,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextTopicLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#F6AD55', marginBottom: 2 },
    nextTopicText: { fontSize: 9, color: '#FFFFFF', fontStyle: 'italic' },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 16,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 6,
    },
    footerText: { fontSize: 7, color: '#A0AEC0' },

    // CEFR badge inline
    cefrBadge: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#2B6CB0',
        backgroundColor: '#EBF8FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },

    // Interpretation cards
    interpCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        marginBottom: 8,
    },
    interpDot: { fontSize: 14, marginRight: 10, marginTop: -2 },
    interpTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    interpDesc: { fontSize: 7.5, lineHeight: 1.5 },
});

// ─── Reusable sub-components ─────────────────────────────────────────────────

const PageFooter = ({ pageNum, total }: { pageNum: number; total: number }) => (
    <View style={s.footer} fixed>
        <Text style={s.footerText}>CADENCE SPEECH ASSESSMENT REPORT — CONFIDENTIAL</Text>
        <Text style={s.footerText}>Page {pageNum} of {total}</Text>
    </View>
);

const SectionHeading = ({ children }: { children: string }) => (
    <Text style={s.sectionHeading}>{children}</Text>
);

const DimBlock = ({ label, score, subs }: { label: string; score: number; subs: { label: string; val: number }[] }) => (
    <View style={s.dimSection}>
        <View style={s.dimHeader}>
            <Text style={s.dimLabel}>{label}</Text>
            <Text style={[s.dimScore, { color: scoreColor(score) }]}>{score}/100</Text>
        </View>
        <View style={[s.barBg, { marginBottom: 4 }]}>
            <View style={[s.barFill, { width: `${score}%`, backgroundColor: scoreColor(score) }]} />
        </View>
        {subs.map((sub, i) => (
            <View key={i} style={s.dimSubRow}>
                <Text style={s.dimSubLabel}>{sub.label}</Text>
                <Text style={s.dimSubVal}>{sub.val}/100</Text>
            </View>
        ))}
    </View>
);

// ─── Main PDF Document ───────────────────────────────────────────────────────

export const AssessmentReportPDF: React.FC<AssessmentReportPDFProps> = ({ userName, sessionId, result }) => {
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const TOTAL_PAGES = 10;

    const m = result.amcat_metrics || {
        pronunciation: { score: 0, consonant: 0, vowel: 0, stress: 0 },
        fluency: { score: 0, rate: 0, pause: 0, fillers: 0 },
        intonation: { score: 0, sentence: 0, rise_fall: 0, pitch: 0 },
        clarity: { score: 0, end_consonants: 0, enunciation: 0, pace: 0 },
        mti: { score: 0, l1_interference: 0, retroflex: 0, vowel_shift: 0 },
        relevancy: { score: 0, feedback: '' }
    };
    const insights = result.amcat_insights || [];
    const mti_deep_dive = result.amcat_mti_deep_dive || { detected_accent: 'None detected', patterns: [] };
    const transcript = result.amcat_transcript || {
        reference_text: '', user_text: '', error_words: [],
        stats: { total_words: 0, speech_rate_wpm: 0, ideal_wpm_range: '130-150', total_sentences: 0, avg_sentence_duration: 0, longest_pause: 0, filler_count: 0 },
        error_summary: { mispronunciation: 0, stutters: 0, unnatural_pauses: 0, filler_words: 0, mti_substitutions: 0 }
    };
    const error_log = result.amcat_error_log || [];
    const sentences = result.amcat_sentences || [];
    const summary = result.amcat_summary || { top_strengths: [], top_improvements: [], learning_resources: [] };
    const improvement_plan = (result as any).improvement_plan || {};
    const practice_exercises = (result as any).practice_exercises || [];

    const tiles = [
        { name: 'Topic Relevancy', score: m.relevancy?.score || 100 },
        { name: 'Pronunciation Accuracy', score: m.pronunciation.score },
        { name: 'MTI / Accent Neutrality', score: m.mti.score },
        { name: 'Fluency & Rhythm', score: m.fluency.score },
        { name: 'Intonation & Stress', score: m.intonation.score },
        { name: 'Clarity & Articulation', score: m.clarity.score },
    ];

    return (
        <Document title={`${userName} — Cadence Assessment Report`} author="Cadence">

            {/* ══════════════════════ PAGE 1: Score Dashboard ══════════════════════ */}
            <Page size="A4" style={s.page}>
                {/* Header */}
                <View style={s.reportHeader}>
                    <Text style={s.reportTitle}>Cadence Speech Assessment Report</Text>
                    <View style={s.headerRow}>
                        <Text style={s.headerSub}>Confidential Candidate Analysis</Text>
                        <Text style={s.headerSub}>Date: {today}</Text>
                    </View>
                </View>

                {/* Candidate Info */}
                <View style={s.infoGrid}>
                    <View style={s.infoCell}>
                        <Text style={s.infoLabel}>Candidate Name</Text>
                        <Text style={s.infoValue}>{userName}</Text>
                    </View>
                    <View style={s.infoCell}>
                        <Text style={s.infoLabel}>Test ID</Text>
                        <Text style={s.infoValue}>{sessionId.split('-')[0].toUpperCase()}</Text>
                    </View>
                    <View style={s.infoCell}>
                        <Text style={s.infoLabel}>Email</Text>
                        <Text style={[s.infoValue, { fontFamily: 'Helvetica', fontSize: 9 }]}>candidate@example.com</Text>
                    </View>
                    <View style={s.infoCell}>
                        <Text style={s.infoLabel}>CEFR Level</Text>
                        <Text style={s.cefrBadge}>{result.cefr_level || 'B2'}</Text>
                    </View>
                </View>

                {/* Score tiles */}
                <Text style={s.subHeading}>Score Dashboard</Text>
                <View style={s.tilesRow}>
                    {tiles.map(tile => (
                        <View key={tile.name} style={s.tile}>
                            <Text style={s.tileName}>{tile.name}</Text>
                            <View style={s.row}>
                                <Text style={[s.tileScore, { color: scoreColor(tile.score) }]}>{tile.score}</Text>
                                <Text style={s.tileScoreSuffix}>/100</Text>
                            </View>
                            <Text style={[s.tileDot, { color: scoreDotColor(tile.score) }]}>{scoreDot(tile.score)}</Text>
                        </View>
                    ))}
                </View>

                {/* Sub-dimension bars */}
                <Text style={s.subHeading}>Detailed Sub-Dimensions</Text>
                <View style={s.row}>
                    <View style={[s.col2, s.gap8]}>
                        <DimBlock label="Pronunciation Accuracy" score={m.pronunciation.score} subs={[
                            { label: 'Consonant Accuracy', val: m.pronunciation.consonant },
                            { label: 'Vowel Accuracy', val: m.pronunciation.vowel },
                            { label: 'Word Stress', val: m.pronunciation.stress },
                        ]} />
                        <DimBlock label="Fluency & Rhythm" score={m.fluency.score} subs={[
                            { label: 'Speech Rate (WPM)', val: m.fluency.rate },
                            { label: 'Pause Pattern', val: m.fluency.pause },
                            { label: 'Filler Word Control', val: m.fluency.fillers },
                        ]} />
                        <DimBlock label="MTI / Accent Neutrality" score={m.mti.score} subs={[
                            { label: 'L1 Phoneme Substitution', val: m.mti.l1_interference },
                            { label: 'Retroflex Influence', val: m.mti.retroflex },
                            { label: 'Vowel Shift Frequency', val: m.mti.vowel_shift },
                        ]} />
                    </View>
                    <View style={s.col2}>
                        <DimBlock label="Intonation & Stress" score={m.intonation.score} subs={[
                            { label: 'Sentence Stress', val: m.intonation.sentence },
                            { label: 'Rise/Fall Patterns', val: m.intonation.rise_fall },
                            { label: 'Pitch Variation', val: m.intonation.pitch },
                        ]} />
                        <DimBlock label="Clarity & Articulation" score={m.clarity.score} subs={[
                            { label: 'Consonant Endings', val: m.clarity.end_consonants },
                            { label: 'Vowel Enunciation', val: m.clarity.enunciation },
                            { label: 'Pace Control', val: m.clarity.pace },
                        ]} />
                    </View>
                </View>

                <PageFooter pageNum={1} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 2: Introduction ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>1 | Introduction</SectionHeading>

                <View style={[s.transcriptBox, { marginBottom: 16 }]}>
                    <Text style={s.subHeading}>About This Report</Text>
                    <Text style={{ fontSize: 8.5, color: '#4A5568', lineHeight: 1.6 }}>
                        This report provides a detailed phonetic and fluency analysis of the candidate's spoken English.
                        The candidate was assessed through a read-aloud task in which standardized paragraphs were displayed on screen.
                        Analysis was performed across five core dimensions of spoken English quality.
                    </Text>
                </View>

                <Text style={s.subHeading}>Score Interpretation</Text>
                <Text style={{ fontSize: 8, color: '#718096', marginBottom: 8 }}>All scores are on a scale of 0–100.</Text>

                <View style={[s.interpCard, { backgroundColor: '#F0FFF4', borderColor: '#C6F6D5' }]}>
                    <Text style={[s.interpDot, { color: '#38A169' }]}>●</Text>
                    <View>
                        <Text style={[s.interpTitle, { color: '#276749' }]}>70–100: Proficient</Text>
                        <Text style={[s.interpDesc, { color: '#276749' }]}>Candidate demonstrates clear, business-ready communication with minimal interference.</Text>
                    </View>
                </View>
                <View style={[s.interpCard, { backgroundColor: '#FFFFF0', borderColor: '#FAF089' }]}>
                    <Text style={[s.interpDot, { color: '#D69E2E' }]}>●</Text>
                    <View>
                        <Text style={[s.interpTitle, { color: '#975A16' }]}>30–69: Developing</Text>
                        <Text style={[s.interpDesc, { color: '#975A16' }]}>Candidate is intelligible but demonstrates noticeable issues requiring targeted practice.</Text>
                    </View>
                </View>
                <View style={[s.interpCard, { backgroundColor: '#FFF5F5', borderColor: '#FED7D7' }]}>
                    <Text style={[s.interpDot, { color: '#E53E3E' }]}>●</Text>
                    <View>
                        <Text style={[s.interpTitle, { color: '#9B2C2C' }]}>0–29: Needs Significant Work</Text>
                        <Text style={[s.interpDesc, { color: '#9B2C2C' }]}>Candidate's speech frequently impedes comprehension; foundational training required.</Text>
                    </View>
                </View>

                <PageFooter pageNum={2} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 3: Insights ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>2 | Insights</SectionHeading>

                {insights.length > 0 ? insights.map((insight: any, idx: number) => (
                    <View key={idx} style={s.insightCard}>
                        <View style={s.insightHeader}>
                            <Text style={s.insightDim}>{insight.dimension}</Text>
                            <Text style={[s.dimScore, { color: scoreColor(insight.score) }]}>
                                {insight.score}/100
                            </Text>
                        </View>
                        <Text style={s.insightDef}>{insight.definition}</Text>
                        <View style={s.divider} />
                        <Text style={s.insightFeedback}>{insight.feedback}</Text>
                    </View>
                )) : (
                    <Text style={{ fontSize: 8, color: '#A0AEC0', fontStyle: 'italic' }}>
                        Detailed insights are currently being generated or unavailable for this session.
                    </Text>
                )}

                <PageFooter pageNum={3} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 4: MTI Deep Dive ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>MTI Deep Dive</SectionHeading>

                <View style={s.mtiAccentBox}>
                    <Text style={s.mtiAccentText}>
                        Detected L1 Influence: {mti_deep_dive.detected_accent || 'No obvious accent detected'}
                    </Text>
                </View>

                {mti_deep_dive.patterns.length > 0 ? mti_deep_dive.patterns.map((item: any, idx: number) => (
                    <View key={idx} style={s.mtiPattern}>
                        <View style={s.mtiPatternHeader}>
                            <Text style={s.mtiPatternName}>{item.pattern}</Text>
                            <Text style={[s.badge, {
                                backgroundColor: item.score > 60 ? '#FED7D7' : item.score > 30 ? '#FEFCBF' : '#C6F6D5',
                                color: item.score > 60 ? '#742A2A' : item.score > 30 ? '#744210' : '#276749',
                            }]}>
                                Score: {item.score}
                            </Text>
                        </View>

                        {/* Simple score bar */}
                        <View style={s.barBg}>
                            <View style={[s.barFill, { width: `${item.score}%`, backgroundColor: item.score > 60 ? '#FC8181' : item.score > 30 ? '#F6E05E' : '#68D391' }]} />
                        </View>

                        {item.behaviors?.map((b: string, i: number) => (
                            <Text key={i} style={s.bulletText}>• {b}</Text>
                        ))}
                    </View>
                )) : (
                    <Text style={{ fontSize: 8, color: '#A0AEC0', fontStyle: 'italic' }}>
                        No specific MTI patterns detected.
                    </Text>
                )}

                <PageFooter pageNum={4} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 5: Response / Transcript ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>3 | Response</SectionHeading>

                <View style={s.row}>
                    {/* Left col — transcripts */}
                    <View style={[s.col2, s.gap8]}>
                        <Text style={s.transcriptLabel}>Paragraph Displayed to Candidate:</Text>
                        <View style={s.transcriptBox}>
                            <Text style={s.transcriptText}>
                                "{transcript.reference_text || 'Reference text unavailable.'}"
                            </Text>
                        </View>

                        <Text style={s.transcriptLabel}>Candidate's Transcription (Auto-generated):</Text>
                        <View style={[s.transcriptBox, { backgroundColor: '#FFFFFF' }]}>
                            <Text style={s.transcriptUserText}>
                                {transcript.user_text || 'Transcription unavailable.'}
                            </Text>
                        </View>
                    </View>

                    {/* Right col — error summary + stats */}
                    <View style={{ width: 140 }}>
                        <View style={s.darkTable}>
                            <View style={s.darkTableHeader}>
                                <Text style={s.darkTableHeaderText}>Error Summary</Text>
                            </View>
                            {[
                                { label: 'Mispronunciation', val: transcript.error_summary?.mispronunciation || 0 },
                                { label: 'Stutters/Repetitions', val: transcript.error_summary?.stutters || 0 },
                                { label: 'Unnatural Pauses', val: transcript.error_summary?.unnatural_pauses || 0 },
                                { label: 'Filler Words', val: transcript.error_summary?.filler_words || 0 },
                                { label: 'MTI Substitutions', val: transcript.error_summary?.mti_substitutions || 0 },
                            ].map((row, i) => (
                                <View key={i} style={s.darkTableRow}>
                                    <Text style={s.darkTableLabel}>{row.label}</Text>
                                    <Text style={s.darkTableVal}>{row.val}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={s.lightTable}>
                            <View style={s.lightTableHeader}>
                                <Text style={s.lightTableHeaderText}>Speech Statistics</Text>
                            </View>
                            {[
                                { label: 'Total Words', val: String(transcript.stats?.total_words || 'N/A') },
                                { label: 'Speech Rate', val: `${transcript.stats?.speech_rate_wpm || 'N/A'} WPM` },
                                { label: 'Ideal Range', val: transcript.stats?.ideal_wpm_range || '130-150' },
                                { label: 'Total Sentences', val: String(transcript.stats?.total_sentences || 'N/A') },
                                { label: 'Avg Sentence', val: `${transcript.stats?.avg_sentence_duration || 'N/A'} sec` },
                                { label: 'Longest Pause', val: `${transcript.stats?.longest_pause || 'N/A'} sec` },
                            ].map((row, i) => (
                                <View key={i} style={s.lightTableRow}>
                                    <Text style={s.lightTableLabel}>{row.label}</Text>
                                    <Text style={s.lightTableVal}>{row.val}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                <PageFooter pageNum={5} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 6: Error Log ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>Word-Level Error Log</SectionHeading>

                {error_log.length === 0 ? (
                    <Text style={{ fontSize: 8, color: '#A0AEC0', fontStyle: 'italic' }}>
                        No specific word-level errors were heavily detected.
                    </Text>
                ) : (
                    <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={s.tableHeaderRow}>
                            {['Timestamp', 'Word', 'Said As', 'Correct IPA', 'Error Type', 'Severity'].map(h => (
                                <Text key={h} style={s.tableHeaderCell}>{h}</Text>
                            ))}
                        </View>
                        {error_log.map((err: any, i: number) => (
                            <View key={i} style={[s.tableRow, { backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F7FAFC' }]}>
                                <Text style={[s.tableCell, { color: '#A0AEC0' }]}>{err.timestamp}</Text>
                                <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold' }]}>"{err.word}"</Text>
                                <Text style={[s.tableCell, { color: '#E53E3E' }]}>"{err.said_as}"</Text>
                                <Text style={[s.tableCell, { color: '#38A169' }]}>"{err.correct_ipa}"</Text>
                                <Text style={s.tableCell}>{err.error_type} ({err.category})</Text>
                                <Text style={[s.tableCell, {
                                    color: err.severity === 'major' ? '#E53E3E' : err.severity === 'moderate' ? '#D69E2E' : '#718096',
                                    fontFamily: 'Helvetica-Bold',
                                }]}>{err.severity}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <PageFooter pageNum={6} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 7: Sentence Breakdown ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>Sentence-by-Sentence Breakdown</SectionHeading>

                {sentences.length > 0 ? sentences.map((sentence: any, idx: number) => (
                    <View key={idx} style={s.sentenceCard}>
                        <Text style={s.sentenceText}>Sentence {idx + 1}: "{sentence.text}"</Text>
                        {[
                            { label: 'Pronunciation Issues:', val: sentence.pronunciation_issues },
                            { label: 'Fluency:', val: sentence.fluency },
                            { label: 'MTI Detected:', val: sentence.mti_detected },
                            { label: 'Rhythm:', val: sentence.rhythm },
                            { label: 'Intonation:', val: sentence.intonation },
                        ].map((row, i) => (
                            <View key={i} style={s.sentenceDetailRow}>
                                <Text style={s.sentenceDetailLabel}>{row.label}</Text>
                                <Text style={s.sentenceDetailVal}>{row.val}</Text>
                            </View>
                        ))}
                    </View>
                )) : (
                    <Text style={{ fontSize: 8, color: '#A0AEC0', fontStyle: 'italic' }}>
                        Sentence-level analysis is not available for this session.
                    </Text>
                )}

                <PageFooter pageNum={7} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 8: Summary + Learning Resources ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>4 | Learning Resources</SectionHeading>

                {/* Score summary banner */}
                <View style={s.summaryScoreBox}>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={s.summaryScoreLabel}>Overall Speech Score</Text>
                        <View style={s.row}>
                            <Text style={s.summaryScoreVal}>{result.overall_score || 58}</Text>
                            <Text style={s.summaryScoreSuffix}>/100</Text>
                        </View>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={s.summaryScoreLabel}>CEFR Speaking Level</Text>
                        <Text style={s.summaryScoreVal}>{result.cefr_level || 'B1'}</Text>
                    </View>
                </View>

                {/* Strengths + Improvements */}
                <View style={[s.row, { marginBottom: 14 }]}>
                    <View style={s.strengthsBox}>
                        <Text style={s.strengthsTitle}>✓  Top Strengths</Text>
                        {summary.top_strengths?.length > 0
                            ? summary.top_strengths.map((str: string, i: number) => (
                                <Text key={i} style={s.bulletItem}>• {str}</Text>
                            ))
                            : <Text style={s.bulletItem}>No defined strengths collected.</Text>
                        }
                    </View>
                    <View style={s.improvementsBox}>
                        <Text style={s.improvementsTitle}>!  Priority Improvements</Text>
                        {summary.top_improvements?.length > 0
                            ? summary.top_improvements.map((imp: string, i: number) => (
                                <Text key={i} style={s.bulletItem}>• {imp}</Text>
                            ))
                            : <Text style={s.bulletItem}>No priority improvements derived.</Text>
                        }
                    </View>
                </View>

                {/* Learning resources */}
                <Text style={s.subHeading}>Personalized Learning Resources</Text>
                <Text style={{ fontSize: 7.5, color: '#718096', marginBottom: 8 }}>
                    Based on detected weaknesses, we recommend the following resources:
                </Text>

                {summary.learning_resources?.length > 0
                    ? summary.learning_resources.map((res: any, idx: number) => (
                        <View key={idx} style={s.resourceArea}>
                            <Text style={s.resourceAreaTitle}>{res.area}</Text>
                            {res.items?.map((item: any, i: number) => (
                                <View key={i} style={s.resourceItem}>
                                    <Text style={s.resourceTitle}>▶  {item.title}</Text>
                                    <Text style={[s.resourceBadge, {
                                        backgroundColor: item.type === 'YouTube' ? '#FEB2B2' : item.type === 'Paid | App' ? '#BEE3F8' : '#E2E8F0',
                                        color: item.type === 'YouTube' ? '#742A2A' : item.type === 'Paid | App' ? '#1A365D' : '#4A5568',
                                    }]}>{item.type}</Text>
                                </View>
                            ))}
                        </View>
                    ))
                    : <Text style={{ fontSize: 8, color: '#A0AEC0', fontStyle: 'italic' }}>No specific learning resources matched yet.</Text>
                }

                <PageFooter pageNum={8} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 9: 3-Week Plan ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>5 | 3-Week Improvement Plan</SectionHeading>
                <Text style={{ fontSize: 8, color: '#718096', marginBottom: 14 }}>
                    This structured plan is designed to address your specific weaknesses identified during this assessment.
                </Text>

                {Object.keys(improvement_plan).length > 0
                    ? Object.entries(improvement_plan).map(([week, data]: [string, any]) => (
                        <View key={week} style={s.weekCard}>
                            <Text style={s.weekBadge}>{week.replace('_', ' ').toUpperCase()}</Text>
                            <Text style={s.weekFocus}>Focus: {data.focus}</Text>
                            <Text style={s.weekMins}>{data.daily_minutes} mins / day</Text>
                            <View style={s.weekExerciseBox}>
                                <Text style={s.weekExerciseLabel}>Daily Exercise:</Text>
                                <Text style={s.weekExerciseText}>{data.exercise}</Text>
                            </View>
                        </View>
                    ))
                    : <Text style={{ fontSize: 8, color: '#A0AEC0', fontStyle: 'italic' }}>
                        Personalized plan unavailable. Please wait for the daily quota to reset.
                    </Text>
                }

                <PageFooter pageNum={9} total={TOTAL_PAGES} />
            </Page>

            {/* ══════════════════════ PAGE 10: Practice Exercises ══════════════════════ */}
            <Page size="A4" style={s.page}>
                <SectionHeading>6 | Recommended Practice</SectionHeading>
                <Text style={{ fontSize: 8, color: '#718096', marginBottom: 14 }}>
                    Immediate actions you can take to see improvement in your communication clarity and flow.
                </Text>

                {practice_exercises.length > 0
                    ? practice_exercises.map((ex: any, idx: number) => (
                        <View key={idx} style={s.exerciseCard}>
                            <View style={s.exerciseHeader}>
                                <Text style={s.exerciseTitle}>{ex.title}</Text>
                                <Text style={s.exerciseDuration}>{ex.duration_minutes} MINS</Text>
                            </View>
                            <Text style={s.exerciseDesc}>{ex.description}</Text>
                        </View>
                    ))
                    : <Text style={{ fontSize: 8, color: '#A0AEC0', fontStyle: 'italic' }}>
                        No practice exercises suggested for this session.
                    </Text>
                }

                <View style={s.nextTopicBox}>
                    <View>
                        <Text style={s.nextTopicLabel}>▲  Suggested Next Topic</Text>
                        <Text style={s.nextTopicText}>
                            "{(result as any).next_topic_suggestion || 'Public Speaking Basics'}"
                        </Text>
                    </View>
                </View>

                <PageFooter pageNum={10} total={TOTAL_PAGES} />
            </Page>

        </Document>
    );
};