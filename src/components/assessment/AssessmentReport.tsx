import React from 'react';
import {
    Box, VStack, HStack, Text, Heading, SimpleGrid,
    Divider, Center, Button, Badge, Table,
    Thead, Tbody, Tr, Th, Td, Flex, Grid, GridItem
} from '@chakra-ui/react';
import { Download, CheckCircle, AlertTriangle, MonitorPlay } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { AnalysisResult } from '../../services/api';
import { AssessmentReportPDF } from './AssessmentReportPDF';

interface AssessmentReportProps {
    userName: string;
    sessionId: string;
    result: AnalysisResult;
    onClose?: () => void;
}

const getColor = (score: number) => {
    if (score >= 70) return "green.500";
    if (score >= 30) return "yellow.500";
    return "red.500";
};

const getDot = (score: number) => {
    if (score >= 70) return "🟢";
    if (score >= 30) return "🟡";
    return "🔴";
};

const PageBreak = () => (
    <Box className="page-break" my={8} borderBottom="2px dashed" borderColor="gray.300" />
);

export const AssessmentReport: React.FC<AssessmentReportProps> = ({
    userName,
    sessionId,
    result,
    onClose
}) => {
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    const m = result.amcat_metrics || {
        pronunciation: { score: 0, consonant: 0, vowel: 0, stress: 0 },
        fluency: { score: 0, rate: 0, pause: 0, fillers: 0 },
        intonation: { score: 0, sentence: 0, rise_fall: 0, pitch: 0 },
        clarity: { score: 0, end_consonants: 0, enunciation: 0, pace: 0 },
        mti: { score: 0, l1_interference: 0, retroflex: 0, vowel_shift: 0 },
        relevancy: { score: 0, feedback: "No topic relevancy feedback provided." }
    };
    const insights = result.amcat_insights || [];
    const mti_deep_dive = result.amcat_mti_deep_dive || { detected_accent: "None detected", patterns: [] };
    const transcript = result.amcat_transcript || {
        reference_text: "", user_text: "", error_words: [],
        stats: { total_words: 0, speech_rate_wpm: 0, ideal_wpm_range: "130-150", total_sentences: 0, avg_sentence_duration: 0, longest_pause: 0, filler_count: 0 },
        error_summary: { mispronunciation: 0, stutters: 0, unnatural_pauses: 0, filler_words: 0, mti_substitutions: 0 }
    };
    const error_log = result.amcat_error_log || [];
    const sentences = result.amcat_sentences || [];
    const summary = result.amcat_summary || { top_strengths: [], top_improvements: [], learning_resources: [] };

    const pdfFileName = `${userName.replace(/\s+/g, '_')}_Assessment_Report.pdf`;

    return (
        <Box className="report-container" p={8} bg="gray.100" minH="100vh">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4; margin: 15mm; }
                    html, body, #root, .chakra-layout, [data-reactroot], div[style*="overflow: auto"] { 
                        height: auto !important; 
                        min-height: auto !important;
                        overflow: visible !important; 
                        background: white !important;
                    }
                    .no-print { display: none !important; }
                    .report-container { padding: 0 !important; background: white !important; }
                    .page-break { page-break-after: always; clear: both; }
                    .print-box { box-shadow: none !important; padding: 0 !important; }
                }
            `}} />

            {/* ── Top action bar ── */}
            <HStack justify="space-between" mb={8} className="no-print" maxW="900px" mx="auto">
                <Button variant="ghost" onClick={onClose} color="gray.600">Back to Results</Button>

                <PDFDownloadLink
                    document={
                        <AssessmentReportPDF
                            userName={userName}
                            sessionId={sessionId}
                            result={result}
                        />
                    }
                    fileName={pdfFileName}
                >
                    {({ loading }) => (
                        <Button
                            leftIcon={<Download size={18} />}
                            colorScheme="blue"
                            shadow="md"
                            isLoading={loading}
                            loadingText="Preparing PDF…"
                        >
                            Download Assessment Report (PDF)
                        </Button>
                    )}
                </PDFDownloadLink>
            </HStack>

            {/* ── On-screen preview (unchanged UI) ── */}
            <Box id="assessment-report-content" className="print-box" w="100%" maxW="900px" mx="auto" bg="white" p={12} shadow="2xl" color="gray.800">

                {/* ======================= PAGE 1 ======================= */}
                <Box className="pdf-page" minH="950px">
                    <VStack align="stretch" spacing={2} mb={8} borderBottom="4px solid" borderColor="gray.800" pb={4}>
                        <Heading size="xl" textTransform="uppercase" color="gray.800">CADENCE SPEECH ASSESSMENT REPORT</Heading>
                        <HStack justify="space-between">
                            <Text fontSize="md" fontWeight="bold">Confidential Candidate Analysis</Text>
                            <Text fontSize="md">Date: {today}</Text>
                        </HStack>
                    </VStack>

                    <SimpleGrid columns={2} spacing={8} mb={10} bg="gray.50" p={6} rounded="md" border="1px solid" borderColor="gray.200">
                        <VStack align="start" spacing={1}>
                            <Text fontSize="sm" color="gray.500" fontWeight="bold" textTransform="uppercase">Candidate Name</Text>
                            <Heading size="md" color="gray.800">{userName}</Heading>
                        </VStack>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="sm" color="gray.500" fontWeight="bold" textTransform="uppercase">Test ID</Text>
                            <Text fontSize="lg" fontWeight="bold">{sessionId.split('-')[0].toUpperCase()}</Text>
                        </VStack>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="sm" color="gray.500" fontWeight="bold" textTransform="uppercase">Email</Text>
                            <Text fontSize="md">candidate@example.com</Text>
                        </VStack>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="sm" color="gray.500" fontWeight="bold" textTransform="uppercase">Phone</Text>
                            <Text fontSize="md">+1 (555) 000-0000</Text>
                        </VStack>
                    </SimpleGrid>

                    <HStack justify="space-between" mb={6}>
                        <Heading size="lg">Score Dashboard</Heading>
                        <HStack>
                            <Text fontWeight="bold" fontSize="lg">CEFR Level:</Text>
                            <Badge colorScheme="blue" fontSize="lg" px={3} py={1}>{result.cefr_level || 'B2'}</Badge>
                        </HStack>
                    </HStack>

                    <SimpleGrid columns={3} spacing={4} mb={10}>
                        {[
                            { name: "Topic Relevancy", score: m.relevancy?.score || 100 },
                            { name: "Pronunciation Accuracy", score: m.pronunciation.score },
                            { name: "MTI / Accent Neutrality", score: m.mti.score },
                            { name: "Fluency & Rhythm", score: m.fluency.score },
                            { name: "Intonation & Stress", score: m.intonation.score },
                            { name: "Clarity & Articulation", score: m.clarity.score }
                        ].map(dim => (
                            <Box key={dim.name} p={5} bg="white" border="1px solid" borderColor="gray.200" rounded="md" shadow="sm">
                                <Text fontSize="sm" fontWeight="bold" color="gray.600" mb={3} h="40px">{dim.name}</Text>
                                <HStack justify="space-between">
                                    <Heading size="lg" color={getColor(dim.score)}>{dim.score}<Text as="span" fontSize="sm" color="gray.500">/100</Text></Heading>
                                    <Text fontSize="2xl">{getDot(dim.score)}</Text>
                                </HStack>
                            </Box>
                        ))}
                    </SimpleGrid>

                    <Box>
                        <Heading size="md" mb={6} borderBottom="2px solid" borderColor="gray.100" pb={2}>Detailed Sub-Dimensions</Heading>
                        <SimpleGrid columns={2} spacing={10}>
                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <HStack justify="space-between" mb={1}><Text fontWeight="bold">Pronunciation Accuracy</Text><Text fontWeight="bold" color={getColor(m.pronunciation.score)}>{m.pronunciation.score}/100</Text></HStack>
                                    <VStack align="stretch" pl={3} borderLeft="2px solid" borderColor="gray.200" spacing={1}>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Consonant Accuracy</Text><Text fontSize="sm" fontWeight="bold">{m.pronunciation.consonant}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Vowel Accuracy</Text><Text fontSize="sm" fontWeight="bold">{m.pronunciation.vowel}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Word Stress Accuracy</Text><Text fontSize="sm" fontWeight="bold">{m.pronunciation.stress}/100</Text></HStack>
                                    </VStack>
                                </Box>
                                <Box>
                                    <HStack justify="space-between" mb={1}><Text fontWeight="bold">Fluency & Rhythm</Text><Text fontWeight="bold" color={getColor(m.fluency.score)}>{m.fluency.score}/100</Text></HStack>
                                    <VStack align="stretch" pl={3} borderLeft="2px solid" borderColor="gray.200" spacing={1}>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Speech Rate (WPM)</Text><Text fontSize="sm" fontWeight="bold">{m.fluency.rate}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Pause Pattern</Text><Text fontSize="sm" fontWeight="bold">{m.fluency.pause}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Filler Word Control</Text><Text fontSize="sm" fontWeight="bold">{m.fluency.fillers}/100</Text></HStack>
                                    </VStack>
                                </Box>
                                <Box>
                                    <HStack justify="space-between" mb={1}><Text fontWeight="bold">MTI / Accent Neutrality</Text><Text fontWeight="bold" color={getColor(m.mti.score)}>{m.mti.score}/100</Text></HStack>
                                    <VStack align="stretch" pl={3} borderLeft="2px solid" borderColor="gray.200" spacing={1}>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">L1 Phoneme Substitution</Text><Text fontSize="sm" fontWeight="bold">{m.mti.l1_interference}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Retroflex Influence</Text><Text fontSize="sm" fontWeight="bold">{m.mti.retroflex}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Vowel Shift Frequency</Text><Text fontSize="sm" fontWeight="bold">{m.mti.vowel_shift}/100</Text></HStack>
                                    </VStack>
                                </Box>
                            </VStack>

                            <VStack align="stretch" spacing={4}>
                                <Box>
                                    <HStack justify="space-between" mb={1}><Text fontWeight="bold">Intonation & Stress</Text><Text fontWeight="bold" color={getColor(m.intonation.score)}>{m.intonation.score}/100</Text></HStack>
                                    <VStack align="stretch" pl={3} borderLeft="2px solid" borderColor="gray.200" spacing={1}>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Sentence Stress</Text><Text fontSize="sm" fontWeight="bold">{m.intonation.sentence}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Rise/Fall Patterns</Text><Text fontSize="sm" fontWeight="bold">{m.intonation.rise_fall}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Pitch Variation</Text><Text fontSize="sm" fontWeight="bold">{m.intonation.pitch}/100</Text></HStack>
                                    </VStack>
                                </Box>
                                <Box>
                                    <HStack justify="space-between" mb={1}><Text fontWeight="bold">Clarity & Articulation</Text><Text fontWeight="bold" color={getColor(m.clarity.score)}>{m.clarity.score}/100</Text></HStack>
                                    <VStack align="stretch" pl={3} borderLeft="2px solid" borderColor="gray.200" spacing={1}>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Consonant Endings</Text><Text fontSize="sm" fontWeight="bold">{m.clarity.end_consonants}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Vowel Enunciation</Text><Text fontSize="sm" fontWeight="bold">{m.clarity.enunciation}/100</Text></HStack>
                                        <HStack justify="space-between"><Text fontSize="sm" color="gray.600">Pace Control</Text><Text fontSize="sm" fontWeight="bold">{m.clarity.pace}/100</Text></HStack>
                                    </VStack>
                                </Box>
                            </VStack>
                        </SimpleGrid>
                    </Box>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 2 ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">1 | Introduction</Heading>
                    <Box bg="gray.50" p={8} rounded="md" border="1px solid" borderColor="gray.200" mb={8}>
                        <Heading size="md" mb={4}>About This Report</Heading>
                        <Text fontSize="md" color="gray.700" lineHeight="tall">
                            This report provides a detailed phonetic and fluency analysis of the candidate's spoken English.
                            The candidate was assessed through a read-aloud task in which standardized paragraphs were displayed on screen.
                            Analysis was performed across five core dimensions of spoken English quality.
                        </Text>
                    </Box>
                    <Heading size="md" mb={4}>Score Interpretation</Heading>
                    <Text mb={4} color="gray.600">All scores are on a scale of 0–100.</Text>
                    <VStack align="stretch" spacing={4}>
                        <HStack bg="green.50" p={4} border="1px solid" borderColor="green.200" rounded="md">
                            <Text fontSize="2xl">🟢</Text>
                            <VStack align="start" spacing={0}><Text fontWeight="bold" color="green.800" fontSize="lg">70–100: Proficient</Text><Text color="green.700" fontSize="sm">Candidate demonstrates clear, business-ready communication with minimal interference.</Text></VStack>
                        </HStack>
                        <HStack bg="yellow.50" p={4} border="1px solid" borderColor="yellow.200" rounded="md">
                            <Text fontSize="2xl">🟡</Text>
                            <VStack align="start" spacing={0}><Text fontWeight="bold" color="yellow.800" fontSize="lg">30–69: Developing</Text><Text color="yellow.700" fontSize="sm">Candidate is intelligible but demonstrates noticeable issues requiring targeted practice.</Text></VStack>
                        </HStack>
                        <HStack bg="red.50" p={4} border="1px solid" borderColor="red.200" rounded="md">
                            <Text fontSize="2xl">🔴</Text>
                            <VStack align="start" spacing={0}><Text fontWeight="bold" color="red.800" fontSize="lg">0–29: Needs Significant Work</Text><Text color="red.700" fontSize="sm">Candidate's speech frequently impedes comprehension; foundational training required.</Text></VStack>
                        </HStack>
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 3: Insights ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">2 | Insights</Heading>
                    <VStack align="stretch" spacing={6}>
                        {insights.length > 0 ? insights.map((insight: any, idx: number) => (
                            <Box key={idx} border="1px solid" borderColor="gray.200" rounded="md" p={6} bg="white" shadow="sm">
                                <HStack justify="space-between" mb={3}>
                                    <Heading size="md" color="gray.800">{insight.dimension}</Heading>
                                    <Text fontWeight="bold" color={getColor(insight.score)} fontSize="lg">{insight.score}/100 {getDot(insight.score)}</Text>
                                </HStack>
                                <Text fontSize="sm" color="gray.600" mb={3} fontStyle="italic">{insight.definition}</Text>
                                <Divider mb={3} />
                                <Text fontSize="sm" color="gray.800" lineHeight="tall">{insight.feedback}</Text>
                            </Box>
                        )) : <Text color="gray.500" fontStyle="italic">Detailed insights are currently being generated or unavailable for this session.</Text>}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 4: MTI ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">MTI Deep Dive</Heading>
                    <Box bg="red.50" borderLeft="4px solid" borderColor="red.500" p={4} mb={8}>
                        <Text fontWeight="bold" color="red.900" fontSize="lg">Detected L1 Influence: {mti_deep_dive.detected_accent || "No obvious accent detected"}</Text>
                    </Box>
                    <VStack align="stretch" spacing={8}>
                        {mti_deep_dive.patterns.length > 0 ? mti_deep_dive.patterns.map((item: any, idx: number) => (
                            <Box key={idx} borderBottom="1px solid" borderColor="gray.100" pb={6}>
                                <HStack justify="space-between" mb={4}>
                                    <Heading size="sm">{item.pattern}</Heading>
                                    <Badge colorScheme={item.score > 60 ? "red" : item.score > 30 ? "yellow" : "green"}>Score: {item.score}</Badge>
                                </HStack>
                                <Box position="relative" h="8px" bg="gray.200" rounded="full" mb={2}>
                                    <Box position="absolute" top="-20px" left="0" fontSize="xs" color="gray.500">Rare</Box>
                                    <Box position="absolute" top="-20px" right="0" fontSize="xs" color="gray.500">Frequent</Box>
                                    <Box position="absolute" top="-4px" left={item.score + "%"} w="16px" h="16px" bg="gray.800" rounded="full" transform="translateX(-50%)" />
                                </Box>
                                <Box mt={4} pl={4}>
                                    <ul style={{ color: "#4A5568", fontSize: "14px", lineHeight: "1.6" }}>
                                        {item.behaviors?.map((b: string, i: number) => <li key={i}>{b}</li>)}
                                    </ul>
                                </Box>
                            </Box>
                        )) : <Text color="gray.500" fontStyle="italic">No specific MTI patterns detected.</Text>}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 5: Response ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">3 | Response</Heading>
                    <Grid templateColumns="3fr 1fr" gap={8}>
                        <GridItem>
                            <Box mb={8}>
                                <Text fontWeight="bold" color="gray.600" fontSize="xs" textTransform="uppercase" mb={2}>Paragraph Displayed to Candidate:</Text>
                                <Box bg="gray.50" p={6} border="1px solid" borderColor="gray.200" rounded="md" fontStyle="italic" color="gray.700">"{transcript.reference_text || 'Reference text unavailable.'}"</Box>
                            </Box>
                            <Box>
                                <Text fontWeight="bold" color="gray.600" fontSize="xs" textTransform="uppercase" mb={2}>Candidate's Transcription (Auto-generated):</Text>
                                <Box bg="white" p={6} border="1px solid" borderColor="gray.200" rounded="md" color="gray.800" lineHeight="tall">{transcript.user_text || 'Transcription unavailable.'}</Box>
                            </Box>
                        </GridItem>
                        <GridItem>
                            <Box bg="gray.800" color="white" rounded="md" overflow="hidden" mb={6}>
                                <Box bg="blue.900" p={3} textAlign="center"><Text fontWeight="bold" fontSize="sm" textTransform="uppercase">Error Summary</Text></Box>
                                <VStack align="stretch" spacing={0}>
                                    {[
                                        { label: "Mispronunciation", val: transcript.error_summary?.mispronunciation || 0 },
                                        { label: "Stutters/Repetitions", val: transcript.error_summary?.stutters || 0 },
                                        { label: "Unnatural Pauses", val: transcript.error_summary?.unnatural_pauses || 0 },
                                        { label: "Filler Words", val: transcript.error_summary?.filler_words || 0 },
                                        { label: "MTI Substitutions", val: transcript.error_summary?.mti_substitutions || 0 }
                                    ].map((row, idx) => (
                                        <HStack key={idx} justify="space-between" p={3} borderBottom="1px solid" borderColor="gray.700">
                                            <Text fontSize="sm">{row.label}</Text>
                                            <Badge colorScheme="red">{row.val}</Badge>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>
                            <Box border="1px solid" borderColor="gray.200" rounded="md">
                                <Box bg="gray.100" p={3} textAlign="center" borderBottom="1px solid" borderColor="gray.200"><Text fontWeight="bold" fontSize="sm" color="gray.700" textTransform="uppercase">Speech Statistics</Text></Box>
                                <VStack align="stretch" spacing={0}>
                                    {[
                                        { label: "Total Words Spoken", val: transcript.stats?.total_words || "N/A" },
                                        { label: "Speech Rate", val: (transcript.stats?.speech_rate_wpm || "N/A") + " WPM" },
                                        { label: "Ideal Range", val: transcript.stats?.ideal_wpm_range || "130-150" },
                                        { label: "Total Sentences", val: transcript.stats?.total_sentences || "N/A" },
                                        { label: "Avg Sentence Length", val: (transcript.stats?.avg_sentence_duration || "N/A") + " sec" },
                                        { label: "Longest Pause", val: (transcript.stats?.longest_pause || "N/A") + " sec" }
                                    ].map((row, idx) => (
                                        <HStack key={idx} justify="space-between" p={3} borderBottom="1px solid" borderColor="gray.100">
                                            <Text fontSize="xs" color="gray.600">{row.label}</Text>
                                            <Text fontSize="xs" fontWeight="bold">{String(row.val)}</Text>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>
                        </GridItem>
                    </Grid>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 6: Error Log ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">Word-Level Error Log</Heading>
                    {error_log.length === 0
                        ? <Text color="gray.500" fontStyle="italic">No specific word-level errors were heavily detected.</Text>
                        : (
                            <Table size="sm" variant="simple" bg="white" border="1px solid" borderColor="gray.200">
                                <Thead bg="gray.50">
                                    <Tr><Th>Timestamp</Th><Th>Word</Th><Th>Candidate Said</Th><Th>Correct Form</Th><Th>Error Type</Th><Th>Severity</Th></Tr>
                                </Thead>
                                <Tbody>
                                    {error_log.map((err: any, i: number) => (
                                        <Tr key={i}>
                                            <Td fontSize="xs" color="gray.500">{err.timestamp}</Td>
                                            <Td fontSize="sm" fontWeight="bold">"{err.word}"</Td>
                                            <Td fontSize="sm" color="red.600">"{err.said_as}"</Td>
                                            <Td fontSize="sm" color="green.600">"{err.correct_ipa}"</Td>
                                            <Td fontSize="sm">{err.error_type} ({err.category})</Td>
                                            <Td><Badge colorScheme={err.severity === 'major' ? 'red' : err.severity === 'moderate' ? 'yellow' : 'gray'}>{err.severity}</Badge></Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        )}
                </Box>

                <PageBreak />

                {/* ======================= PAGE 7: Sentence Breakdown ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">Sentence-by-Sentence Breakdown</Heading>
                    <VStack align="stretch" spacing={8}>
                        {sentences.length > 0 ? sentences.map((sentence: any, idx: number) => (
                            <Box key={idx} borderLeft="4px solid" borderColor="blue.500" bg="gray.50" pl={4} py={3} pr={4} roundedRight="md">
                                <Text fontWeight="bold" fontSize="md" mb={3} color="gray.800">Sentence {idx + 1}: "{sentence.text}"</Text>
                                <SimpleGrid columns={1} spacing={2} pl={4}>
                                    {[
                                        { label: "Pronunciation Issues", val: sentence.pronunciation_issues },
                                        { label: "Fluency", val: sentence.fluency },
                                        { label: "MTI Detected", val: sentence.mti_detected },
                                        { label: "Rhythm", val: sentence.rhythm },
                                        { label: "Intonation", val: sentence.intonation },
                                    ].map((row, i) => (
                                        <Text key={i} fontSize="sm">
                                            <Text as="span" fontWeight="bold" color="gray.600">{row.label}: </Text>{row.val}
                                        </Text>
                                    ))}
                                </SimpleGrid>
                            </Box>
                        )) : <Text color="gray.500" fontStyle="italic">Sentence-level analysis is not available for this session.</Text>}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 8: Learning Resources ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">4 | Learning Resources</Heading>
                    <HStack mb={8} justify="center" spacing={10} bg="blue.50" p={6} rounded="md" border="1px solid" borderColor="blue.100">
                        <VStack>
                            <Text fontSize="sm" fontWeight="bold" textTransform="uppercase" color="blue.600">Overall Speech Score</Text>
                            <Heading size="2xl" color="blue.900">{result.overall_score || 58}<Text as="span" fontSize="lg" color="gray.500">/100</Text></Heading>
                        </VStack>
                        <Box h="60px" w="2px" bg="blue.200" />
                        <VStack>
                            <Text fontSize="sm" fontWeight="bold" textTransform="uppercase" color="blue.600">CEFR Speaking Level</Text>
                            <Heading size="2xl" color="blue.900">{result.cefr_level || 'B1'}</Heading>
                        </VStack>
                    </HStack>
                    <SimpleGrid columns={2} spacing={8} mb={10}>
                        <Box bg="green.50" p={6} rounded="md" border="1px solid" borderColor="green.200">
                            <HStack mb={4}><CheckCircle color="#38A169" /><Heading size="md" color="green.900">Top Strengths</Heading></HStack>
                            <VStack align="start" spacing={3}>
                                {summary.top_strengths?.map((str: string, i: number) => <Text key={i} fontSize="sm" color="green.800">• {str}</Text>)
                                    || <Text fontSize="sm" color="green.800">No defined strengths collected.</Text>}
                            </VStack>
                        </Box>
                        <Box bg="red.50" p={6} rounded="md" border="1px solid" borderColor="red.200">
                            <HStack mb={4}><AlertTriangle color="#E53E3E" /><Heading size="md" color="red.900">Priority Improvements</Heading></HStack>
                            <VStack align="start" spacing={3}>
                                {summary.top_improvements?.map((imp: string, i: number) => <Text key={i} fontSize="sm" color="red.800">• {imp}</Text>)
                                    || <Text fontSize="sm" color="red.800">No priority improvements derived.</Text>}
                            </VStack>
                        </Box>
                    </SimpleGrid>
                    <Heading size="md" mb={4}>Personalized Learning Resources</Heading>
                    <VStack align="stretch" spacing={6}>
                        {summary.learning_resources?.map((res: any, idx: number) => (
                            <Box key={idx}>
                                <Heading size="sm" mb={3}>{res.area}</Heading>
                                <VStack align="stretch" spacing={2}>
                                    {res.items?.map((item: any, i: number) => (
                                        <HStack key={i} justify="space-between" bg="white" p={3} border="1px solid" borderColor="gray.200" rounded="md">
                                            <HStack><MonitorPlay size={16} color="gray" /><Text fontSize="sm">{item.title}</Text></HStack>
                                            <Badge colorScheme={item.type === 'YouTube' ? 'red' : item.type === 'Paid | App' ? 'blue' : undefined}>{item.type}</Badge>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>
                        )) || <Text color="gray.500" fontStyle="italic">No specific learning resources matched yet.</Text>}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 9: 3-Week Plan ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">5 | 3-Week Improvement Plan</Heading>
                    <Text mb={8} color="gray.600">This structured plan is designed to address your specific weaknesses identified during this assessment.</Text>
                    <VStack align="stretch" spacing={8}>
                        {(result as any).improvement_plan ? Object.entries((result as any).improvement_plan).map(([week, data]: [string, any]) => (
                            <Box key={week} p={6} bg="blue.50" rounded="md" border="1px solid" borderColor="blue.100" position="relative">
                                <Badge colorScheme="blue" position="absolute" top="-10px" left="20px" px={4} py={1} rounded="full" shadow="sm">{week.replace('_', ' ').toUpperCase()}</Badge>
                                <HStack justify="space-between" mb={4} mt={2}>
                                    <Heading size="md" color="blue.900">Focus: {data.focus}</Heading>
                                    <Badge colorScheme="purple">{data.daily_minutes} mins / day</Badge>
                                </HStack>
                                <Box bg="white" p={4} rounded="sm" border="1px solid" borderColor="blue.100">
                                    <Text fontWeight="bold" fontSize="sm" mb={1} color="gray.500">Daily Exercise:</Text>
                                    <Text color="gray.800">{data.exercise}</Text>
                                </Box>
                            </Box>
                        )) : <Text color="gray.500" fontStyle="italic">Personalized plan unavailable. Please wait for the daily quota to reset.</Text>}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 10: Practice ======================= */}
                <Box className="pdf-page" minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">6 | Recommended Practice</Heading>
                    <Text mb={8} color="gray.600">Immediate actions you can take to see improvement in your communication clarity and flow.</Text>
                    <SimpleGrid columns={1} spacing={6}>
                        {(result as any).practice_exercises?.map((ex: any, idx: number) => (
                            <Box key={idx} p={6} border="1px solid" borderColor="gray.200" rounded="lg" shadow="sm">
                                <HStack justify="space-between" mb={4}>
                                    <HStack spacing={3}>
                                        <Box bg="blue.100" p={2} rounded="full" color="blue.600"><MonitorPlay size={24} /></Box>
                                        <Heading size="md" color="gray.800">{ex.title}</Heading>
                                    </HStack>
                                    <Badge variant="subtle" colorScheme="orange" px={3} py={1} rounded="md">{ex.duration_minutes} MINS</Badge>
                                </HStack>
                                <Text color="gray.700" lineHeight="tall" pl={12}>{ex.description}</Text>
                            </Box>
                        )) || <Text color="gray.500" fontStyle="italic">No practice exercises suggested for this session.</Text>}
                    </SimpleGrid>
                    <Box mt={12} p={6} bg="gray.800" color="white" rounded="lg">
                        <HStack spacing={4}>
                            <AlertTriangle color="#F6AD55" />
                            <Box>
                                <Text fontWeight="bold">Suggested Next Topic:</Text>
                                <Text fontSize="lg" fontStyle="italic">"{(result as any).next_topic_suggestion || "Public Speaking Basics"}"</Text>
                            </Box>
                        </HStack>
                    </Box>
                </Box>

                <Center mt={12} borderTop="1px solid" borderColor="gray.200" pt={8} className="no-print">
                    <Text fontSize="xs" color="gray.400">--- END OF REPORT ---</Text>
                </Center>
            </Box>
        </Box>
    );
};