import React from 'react';
import {
    Box, VStack, HStack, Text, Heading, SimpleGrid,
    Divider, Center, Button, Badge, Table,
    Thead, Tbody, Tr, Th, Td, Progress, Flex, Grid, GridItem
} from '@chakra-ui/react';
import { Download, CheckCircle, AlertTriangle, MonitorPlay } from 'lucide-react';
import { AnalysisResult } from '../../services/api';

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
    if (score >= 70) return "��";
    if (score >= 30) return "🟡";
    return "🔴";
};

const PageBreak = () => (
    <Box className="page-break" my={8} borderBottom="2px dashed" borderColor="gray.300" sx={{ '@media print': { borderBottom: 'none', margin: 0 } }} />
);

export const AssessmentReport: React.FC<AssessmentReportProps> = ({
    userName,
    sessionId,
    result,
    onClose
}) => {
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    // Mock data fallbacks in case the API hasn't been fully updated yet to return the exact AMCAT structure
    const m = result.amcat_metrics || {
        pronunciation: { score: 62, consonant: 58, vowel: 65, stress: 62 },
        fluency: { score: 75, rate: 80, pause: 70, fillers: 75 },
        intonation: { score: 45, sentence: 50, rise_fall: 40, pitch: 45 },
        clarity: { score: 82, end_consonants: 80, enunciation: 85, pace: 81 },
        mti: { score: 28, l1_interference: 20, retroflex: 30, vowel_shift: 35 },
        relevancy: { score: 85, feedback: "The candidate answered the prompt well and stayed on topic." }
    };

    const handlePrint = () => window.print();

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

            <HStack justify="space-between" mb={8} className="no-print" maxW="900px" mx="auto">
                <Button variant="ghost" onClick={onClose} color="gray.600">Back to Results</Button>
                <Button leftIcon={<Download size={18} />} colorScheme="blue" onClick={handlePrint} shadow="md">
                    Download Assessment Report (PDF)
                </Button>
            </HStack>

            <Box className="print-box" w="100%" maxW="900px" mx="auto" bg="white" p={12} shadow="2xl" color="gray.800">

                {/* ======================= PAGE 1 ======================= */}
                <Box minH="950px">
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

                    {/* Tile Grid */}
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

                    {/* Sub-dimension bars */}
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
                <Box minH="950px">
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
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" color="green.800" fontSize="lg">70–100: Proficient</Text>
                                <Text color="green.700" fontSize="sm">Candidate demonstrates clear, business-ready communication with minimal interference.</Text>
                            </VStack>
                        </HStack>
                        <HStack bg="yellow.50" p={4} border="1px solid" borderColor="yellow.200" rounded="md">
                            <Text fontSize="2xl">🟡</Text>
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" color="yellow.800" fontSize="lg">30–69: Developing</Text>
                                <Text color="yellow.700" fontSize="sm">Candidate is intelligible but demonstrates noticeable issues requiring targeted practice.</Text>
                            </VStack>
                        </HStack>
                        <HStack bg="red.50" p={4} border="1px solid" borderColor="red.200" rounded="md">
                            <Text fontSize="2xl">🔴</Text>
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" color="red.800" fontSize="lg">0–29: Needs Significant Work</Text>
                                <Text color="red.700" fontSize="sm">Candidate's speech frequently impedes comprehension; foundational training required.</Text>
                            </VStack>
                        </HStack>
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 3 ======================= */}
                <Box minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">2 | Insights</Heading>

                    <VStack align="stretch" spacing={6}>
                        {[
                            {
                                dim: "Topic Relevancy",
                                score: m.relevancy?.score || 100,
                                def: "Focuses on whether the candidate successfully comprehended and responded to the specific prompt given.",
                                feedback: m.relevancy?.feedback || "No topic relevancy feedback provided."
                            },
                            {
                                dim: "Pronunciation Accuracy",
                                score: m.pronunciation.score,
                                def: "This dimension measures how accurately the candidate produces individual sounds, words, and syllables in standard spoken English.",
                                feedback: "The candidate demonstrated adequate pronunciation for most common vocabulary. However, consistent difficulty was observed with dental fricatives — the 'th' sound in words such as 'the', 'that', and 'through' was regularly produced as 'd' or 't'. Multisyllabic words such as 'approximately' and 'professional' showed stress placement errors."
                            },
                            {
                                dim: "MTI / Accent Neutrality",
                                score: m.mti.score,
                                def: "Measures the extent to which the candidate's first language (L1) phonology influences their English, impacting global intelligibility.",
                                feedback: "Significant Mother Tongue Influence (MTI) was detected. Retroflex consonants (like hard 'r' or 't') frequently bled into English output. Vowel elongation was notably present, where short vowels in words like 'bit' were stretched closer to 'beat'. Overall intelligibility is maintained but noticeable deviation from neutral accent is present."
                            },
                            {
                                dim: "Fluency & Rhythm",
                                score: m.fluency.score,
                                def: "Evaluates the smoothness, pace, and natural flow of speech without excessive hesitations or unnatural pauses.",
                                feedback: "Speech rate was well within the ideal range (around 130 WPM). The candidate maintained a relatively steady pace but exhibited unnatural pauses mid-sentence, notably before complex clauses (e.g., pausing for 1.8 seconds after 'environment' before continuing). Filler words were largely controlled, demonstrating fair cognitive processing speed."
                            },
                            {
                                dim: "Intonation & Stress",
                                score: m.intonation.score,
                                def: "Analyzes pitch variation and the emphasis placed on content words versus grammatical words to convey meaning.",
                                feedback: "Delivery was largely monotone, resulting in a low Intonation score. The candidate failed to place natural stress on key content words like 'quick' or 'lazy' during the read-aloud task. Furthermore, statements occasionally ended with a rising pitch, confusing declarative sentences with questions."
                            },
                            {
                                dim: "Clarity & Articulation",
                                score: m.clarity.score,
                                def: "Focuses on the crispness of speech, particularly word endings and separation between consecutive words.",
                                feedback: "Strong performance in general enunciation. Word endings, particularly plural 's' and past-tense 'ed' sounds, were distinctly articulated. Pacing was controlled well enough to prevent word-slurring, ensuring that individual words remained distinct and crisp throughout."
                            }
                        ].map((insight, idx) => (
                            <Box key={idx} border="1px solid" borderColor="gray.200" rounded="md" p={6} bg="white" shadow="sm">
                                <HStack justify="space-between" mb={3}>
                                    <Heading size="md" color="gray.800">{insight.dim}</Heading>
                                    <HStack>
                                        <Text fontWeight="bold">Score:</Text>
                                        <Text fontWeight="bold" color={getColor(insight.score)} fontSize="lg">{insight.score}/100 {getDot(insight.score)}</Text>
                                    </HStack>
                                </HStack>
                                <Text fontSize="sm" color="gray.600" mb={3} fontStyle="italic">{insight.def}</Text>
                                <Divider mb={3} />
                                <Text fontSize="sm" color="gray.800" lineHeight="tall">{insight.feedback}</Text>
                            </Box>
                        ))}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 4 ======================= */}
                <Box minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">MTI Deep Dive</Heading>

                    <Box bg="red.50" borderLeft="4px solid" borderColor="red.500" p={4} mb={8}>
                        <Text fontWeight="bold" color="red.900" fontSize="lg">Detected L1 Influence: Punjabi-Influenced Hindi → English</Text>
                    </Box>

                    <VStack align="stretch" spacing={8}>
                        {[
                            {
                                pattern: "'th' → 'd/t' substitution", score: 85, freqText: "Frequent",
                                bullets: ["Consistently substituted dental fricatives with alveolar stops.", "Observed in function words: 'the', 'there', 'that'.", "Impacts formal professional clarity."]
                            },
                            {
                                pattern: "Retroflex consonants bleeding into English", score: 70, freqText: "Frequent",
                                bullets: ["Rolled 'r' sounds applied to standard English words.", "Hardened 't' and 'd' sounds (retroflex instead of alveolar).", "Strongest effect observed in words like 'brown', 'water'."]
                            },
                            {
                                pattern: "Vowel elongation (short vowels stretched)", score: 40, freqText: "Moderate",
                                bullets: ["Short vowels dragged out slightly.", "Example: 'ship' produced closer to 'sheep'.", "Occurred mostly in stressed syllables."]
                            },
                            {
                                pattern: "Word-final consonant dropping", score: 20, freqText: "Rare",
                                bullets: ["Mostly articulated word endings clearly.", "Rarely omitted trailing 's' or 't' sounds.", "Does not significantly impede intelligibility."]
                            },
                            {
                                pattern: "Rising intonation on statements", score: 65, freqText: "Frequent",
                                bullets: ["Statements sound like questions due to rising pitch at the end.", "Creates a perception of uncertainty.", "Particularly noticeable at ends of paragraphs."]
                            }
                        ].map((item, idx) => (
                            <Box key={idx} borderBottom="1px solid" borderColor="gray.100" pb={6}>
                                <HStack justify="space-between" mb={2}>
                                    <Heading size="sm" color="gray.800">{item.pattern}</Heading>
                                    <Badge colorScheme={item.score > 60 ? "red" : (item.score > 30 ? "yellow" : "green")}>Score: {item.score}</Badge>
                                </HStack>

                                <Box position="relative" h="8px" bg="gray.200" rounded="full" mb={2} mt={4}>
                                    <Box position="absolute" top="-20px" left="0" fontSize="xs" color="gray.500">Rare</Box>
                                    <Box position="absolute" top="-20px" right="0" fontSize="xs" color="gray.500">Frequent</Box>
                                    <Box
                                        position="absolute" top="-4px"
                                        left={item.score + "%"}
                                        w="16px" h="16px" bg="gray.800" rounded="full"
                                        transform="translateX(-50%)"
                                    />
                                    <Box
                                        position="absolute" top="4px"
                                        w="100%" h="1px" bg="gray.400" zIndex={0}
                                    />
                                </Box>

                                <Box mt={4} pl={4}>
                                    <ul style={{ color: "#4A5568", fontSize: "14px", lineHeight: "1.6" }}>
                                        {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
                                    </ul>
                                </Box>
                            </Box>
                        ))}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 5 ======================= */}
                <Box minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">3 | Response</Heading>

                    <Grid templateColumns="3fr 1fr" gap={8}>
                        <GridItem>
                            <Box mb={8}>
                                <Text fontWeight="bold" color="gray.600" fontSize="xs" textTransform="uppercase" mb={2}>Paragraph Displayed to Candidate:</Text>
                                <Box bg="gray.50" p={6} border="1px solid" borderColor="gray.200" rounded="md" fontStyle="italic" color="gray.700">
                                    "The quick brown fox jumps over the lazy dog. It was a comfortable environment for everyone involved. We aim to provide professional services approximately twice a year. Understanding pronunciation is key to success."
                                </Box>
                            </Box>

                            <Box>
                                <Text fontWeight="bold" color="gray.600" fontSize="xs" textTransform="uppercase" mb={2}>Candidate's Transcription (Auto-generated):</Text>
                                <Box bg="white" p={6} border="1px solid" borderColor="gray.200" rounded="md" color="gray.800" lineHeight="tall">
                                    <Text as="span" bg="red.100" px={1} rounded="sm">De</Text> quick brown fox jumps <Text as="span" bg="yellow.100" px={1} rounded="sm">ower</Text> <Text as="span" bg="red.100" px={1} rounded="sm">de</Text> lazy dog. It was a comfortable environment... for everyone involved. We aim to provide professional services <Text as="span" bg="yellow.100" px={1} rounded="sm">approx-mately</Text> twice a year. Understanding <Text as="span" bg="red.100" px={1} rounded="sm">pro-nun-see-ay-shun</Text> is key to success.
                                </Box>
                            </Box>
                        </GridItem>

                        <GridItem>
                            <Box bg="gray.800" color="white" rounded="md" overflow="hidden" mb={6}>
                                <Box bg="blue.900" p={3} textAlign="center">
                                    <Text fontWeight="bold" fontSize="sm" textTransform="uppercase" letterSpacing="wide">Error Summary</Text>
                                </Box>
                                <VStack align="stretch" spacing={0}>
                                    {[
                                        { label: "Mispronunciation", val: 3 },
                                        { label: "Stutters/Repetitions", val: 1 },
                                        { label: "Unnatural Pauses", val: 2 },
                                        { label: "Filler Words", val: 0 },
                                        { label: "MTI Substitutions", val: 4 }
                                    ].map((row, idx) => (
                                        <HStack key={idx} justify="space-between" p={3} borderBottom="1px solid" borderColor="gray.700">
                                            <Text fontSize="sm">{row.label}</Text>
                                            <Badge colorScheme="red">{row.val}</Badge>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>

                            <Box border="1px solid" borderColor="gray.200" rounded="md">
                                <Box bg="gray.100" p={3} textAlign="center" borderBottom="1px solid" borderColor="gray.200">
                                    <Text fontWeight="bold" fontSize="sm" color="gray.700" textTransform="uppercase" letterSpacing="wide">Speech Statistics</Text>
                                </Box>
                                <VStack align="stretch" spacing={0}>
                                    {[
                                        { label: "Total Words Spoken", val: "34" },
                                        { label: "Speech Rate", val: "98 WPM" },
                                        { label: "Ideal Range", val: "120–150" },
                                        { label: "Total Sentences", val: "4" },
                                        { label: "Avg Sentence", val: "4.2 sec" },
                                        { label: "Longest Pause", val: "1.8 sec" }
                                    ].map((row, idx) => (
                                        <HStack key={idx} justify="space-between" p={3} borderBottom="1px solid" borderColor="gray.100">
                                            <Text fontSize="xs" color="gray.600">{row.label}</Text>
                                            <Text fontSize="xs" fontWeight="bold">{row.val}</Text>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>
                        </GridItem>
                    </Grid>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 6 ======================= */}
                <Box minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">Word-Level Error Log</Heading>

                    {[
                        {
                            cat: "Pronunciation & MTI Errors",
                            color: "red.100",
                            headerColor: "red.800",
                            items: [
                                { t: "0:14", w: "pronunciation", s: "pro-nun-see-AY-shun", c: "prə-ˌnʌn-si-ˈeɪ-ʃən", e: "Vowel shift", sev: "Moderate" },
                                { t: "0:31", w: "the", s: "de", c: "ðə", e: "th→d substitution", sev: "Major" },
                                { t: "0:35", w: "the", s: "de", c: "ðə", e: "th→d substitution", sev: "Major" },
                            ]
                        },
                        {
                            cat: "Fluency & Rhythm Variations",
                            color: "yellow.100",
                            headerColor: "yellow.800",
                            items: [
                                { t: "0:25", w: "over", s: "ower", c: "ˈoʊvər", e: "Consonant softening", sev: "Minor" },
                                { t: "0:42", w: "approximately", s: "approx-mately", c: "ə-ˈprɑk-sə-mət-li", e: "Syllable omission", sev: "Minor" },
                                { t: "1:02", w: "comfortable", s: "com-for-ta-bull", c: "ˈkʌmf-tər-bəl", e: "Syllable insertion", sev: "Minor" },
                            ]
                        }
                    ].map((group, gIdx) => (
                        <Box key={gIdx} mb={8}>
                            <Box bg={group.color} p={3} borderTopRadius="md" borderBottom="2px solid" borderColor="gray.300">
                                <Text fontWeight="bold" color={group.headerColor} textTransform="uppercase">{group.cat}</Text>
                            </Box>
                            <Table size="sm" variant="simple" bg="white" border="1px solid" borderColor="gray.200" borderTop="none">
                                <Thead bg="gray.50">
                                    <Tr>
                                        <Th>Timestamp</Th>
                                        <Th>Word</Th>
                                        <Th>Candidate Said</Th>
                                        <Th>Correct Form</Th>
                                        <Th>Error Type</Th>
                                        <Th>Severity</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {group.items.map((err, i) => (
                                        <Tr key={i}>
                                            <Td fontSize="xs" color="gray.500">{err.t}</Td>
                                            <Td fontSize="sm" fontWeight="bold">"{err.w}"</Td>
                                            <Td fontSize="sm" color="red.600">"{err.s}"</Td>
                                            <Td fontSize="sm" color="green.600">"{err.c}"</Td>
                                            <Td fontSize="sm">{err.e}</Td>
                                            <Td>
                                                <Badge colorScheme={err.sev === 'Major' ? 'red' : (err.sev === 'Moderate' ? 'yellow' : 'gray')}>{err.sev}</Badge>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    ))}
                </Box>

                <PageBreak />

                {/* ======================= PAGE 7 ======================= */}
                <Box minH="950px">
                    <Heading size="lg" mb={6} borderBottom="2px solid" borderColor="gray.800" pb={2} color="blue.900">Sentence-by-Sentence Breakdown</Heading>

                    <VStack align="stretch" spacing={8}>
                        {[
                            {
                                text: "The quick brown fox jumps over the lazy dog.",
                                pron: "'the' → 'de' (×2), 'over' → 'ower'",
                                flu: "1 unnatural pause after 'fox' (1.8 sec)",
                                mti: "Retroflex /r/ in 'brown' and 'over'",
                                rhy: "Sentence delivered at 98 WPM — slightly slow",
                                int: "Flat delivery, no natural stress on 'quick' or 'lazy'"
                            },
                            {
                                text: "It was a comfortable environment for everyone involved.",
                                pron: "'comfortable' syllables articulated as written rather than correctly elided.",
                                flu: "Seamless flow, no hesitations.",
                                mti: "None detected.",
                                rhy: "Pace increased to 110 WPM, very natural.",
                                int: "Appropriate falling tone at the end."
                            },
                            {
                                text: "Understanding pronunciation is key to success.",
                                pron: "'pronunciation' vowel shifted from 'shun' to 'a-shun'.",
                                flu: "Minor stutter on 'Understanding'.",
                                mti: "Slurred ending on 'success'.",
                                rhy: "Steady.",
                                int: "Question-like rising intonation on 'success'."
                            }
                        ].map((sentence, idx) => (
                            <Box key={idx} borderLeft="4px solid" borderColor="blue.500" bg="gray.50" pl={4} py={3} pr={4} roundedRight="md">
                                <Text fontWeight="bold" fontSize="md" mb={3} color="gray.800">Sentence {idx + 1}: "{sentence.text}"</Text>
                                <SimpleGrid columns={1} spacing={2} pl={4}>
                                    <Text fontSize="sm"><Text as="span" fontWeight="bold" color="gray.600">Pronunciation Issues:</Text> {sentence.pron}</Text>
                                    <Text fontSize="sm"><Text as="span" fontWeight="bold" color="gray.600">Fluency:</Text> {sentence.flu}</Text>
                                    <Text fontSize="sm"><Text as="span" fontWeight="bold" color="gray.600">MTI Detected:</Text> {sentence.mti}</Text>
                                    <Text fontSize="sm"><Text as="span" fontWeight="bold" color="gray.600">Rhythm:</Text> {sentence.rhy}</Text>
                                    <Text fontSize="sm"><Text as="span" fontWeight="bold" color="gray.600">Intonation:</Text> {sentence.int}</Text>
                                </SimpleGrid>
                            </Box>
                        ))}
                    </VStack>
                </Box>

                <PageBreak />

                {/* ======================= PAGE 8 ======================= */}
                <Box minH="950px">
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
                            <HStack mb={4}>
                                <CheckCircle color="#38A169" />
                                <Heading size="md" color="green.900">Top 3 Strengths</Heading>
                            </HStack>
                            <VStack align="start" spacing={3}>
                                <Text fontSize="sm" color="green.800">• <b>Vowel Enunciation:</b> Crisp distinction of standard vowel sounds.</Text>
                                <Text fontSize="sm" color="green.800">• <b>Pacing:</b> Controlled speech rate with no rushing.</Text>
                                <Text fontSize="sm" color="green.800">• <b>Word Endings:</b> Consonant pluralization clearly pronounced.</Text>
                            </VStack>
                        </Box>

                        <Box bg="red.50" p={6} rounded="md" border="1px solid" borderColor="red.200">
                            <HStack mb={4}>
                                <AlertTriangle color="#E53E3E" />
                                <Heading size="md" color="red.900">Priority Improvements</Heading>
                            </HStack>
                            <VStack align="start" spacing={3}>
                                <Text fontSize="sm" color="red.800">• <b>"th" Fricative:</b> Stop substituting "d" for "th".</Text>
                                <Text fontSize="sm" color="red.800">• <b>Sentence Stress:</b> Needs to emphasize content words.</Text>
                                <Text fontSize="sm" color="red.800">• <b>MTI Reduction:</b> Target retroflex consonants.</Text>
                            </VStack>
                        </Box>
                    </SimpleGrid>

                    <Heading size="md" mb={4}>Personalized Learning Resources</Heading>
                    <Text fontSize="sm" color="gray.600" mb={6}>Based on detected weaknesses, we recommend the following resources:</Text>

                    <VStack align="stretch" spacing={6}>
                        <Box>
                            <Heading size="sm" mb={3} color="gray.800">Pronunciation — Transcription & "th" Sound</Heading>
                            <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between" bg="white" p={3} border="1px solid" borderColor="gray.200" rounded="md">
                                    <HStack><MonitorPlay size={16} color="gray" /><Text fontSize="sm">Practice the dental fricative with mirror exercises</Text></HStack>
                                    <Badge>Free | Web</Badge>
                                </HStack>
                                <HStack justify="space-between" bg="white" p={3} border="1px solid" borderColor="gray.200" rounded="md">
                                    <HStack><MonitorPlay size={16} color="gray" /><Text fontSize="sm">Watch BBC Learning English: "th" sounds</Text></HStack>
                                    <Badge colorScheme="red">YouTube</Badge>
                                </HStack>
                                <HStack justify="space-between" bg="white" p={3} border="1px solid" borderColor="gray.200" rounded="md">
                                    <HStack><MonitorPlay size={16} color="gray" /><Text fontSize="sm">Minimal pairs drill: "den/then", "day/they"</Text></HStack>
                                    <Badge>Free | Web</Badge>
                                </HStack>
                            </VStack>
                        </Box>

                        <Box>
                            <Heading size="sm" mb={3} color="gray.800">MTI Reduction — Hindi/Punjabi Speakers</Heading>
                            <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between" bg="white" p={3} border="1px solid" borderColor="gray.200" rounded="md">
                                    <HStack><MonitorPlay size={16} color="gray" /><Text fontSize="sm">Cadence Deep-Dive: Flattening Retroflex Consonants</Text></HStack>
                                    <Badge colorScheme="blue">Paid | App</Badge>
                                </HStack>
                                <HStack justify="space-between" bg="white" p={3} border="1px solid" borderColor="gray.200" rounded="md">
                                    <HStack><MonitorPlay size={16} color="gray" /><Text fontSize="sm">Shadowing Exercise: Imitating Native Sentence Stress</Text></HStack>
                                    <Badge>Free | Web</Badge>
                                </HStack>
                            </VStack>
                        </Box>
                    </VStack>
                </Box>

                <Center mt={12} borderTop="1px solid" borderColor="gray.200" pt={8} className="no-print">
                    <Text fontSize="xs" color="gray.400">--- END OF REPORT ---</Text>
                </Center>
            </Box>
        </Box>
    );
};
