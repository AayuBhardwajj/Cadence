import React from 'react';
import {
    Box, VStack, HStack, Text, Heading, SimpleGrid,
    Divider, Center, Button, Icon, Badge, Table,
    Thead, Tbody, Tr, Th, Td, Progress, List, ListItem, ListIcon
} from '@chakra-ui/react';
import {
    Download, Globe, ShieldCheck, User, Calendar,
    FileText, Award, BarChart3, Target,
    CheckCircle2, AlertCircle, Info, Mic2, MessageSquare,
    Zap, Volume2, Activity, Edit3
} from 'lucide-react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { AnalysisResult } from '../../services/api';

interface AssessmentReportProps {
    userName: string;
    sessionId: string;
    result: AnalysisResult;
    onClose?: () => void;
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({
    userName,
    sessionId,
    result,
    onClose
}) => {
    const today = new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const { deep_analysis } = result;

    const radarData = [
        { subject: 'Fluency', A: result.breakdown.fluency, fullMark: 100 },
        { subject: 'Pronunciation', A: result.breakdown.pronunciation, fullMark: 100 },
        { subject: 'Grammar', A: result.breakdown.grammar, fullMark: 100 },
        { subject: 'Vocabulary', A: result.breakdown.vocabulary, fullMark: 100 },
        { subject: 'Clarity', A: result.breakdown.clarity, fullMark: 100 },
        { subject: 'Confidence', A: result.breakdown.confidence, fullMark: 100 },
    ];

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box className="report-container" p={8} bg="gray.50" minH="100vh">
            {/* Control Bar */}
            <HStack justify="space-between" mb={8} className="no-print" maxW="1000px" mx="auto">
                <Button variant="ghost" onClick={onClose} color="gray.600">
                    Back to Results
                </Button>
                <Button
                    leftIcon={<Download size={18} />}
                    colorScheme="blue"
                    onClick={handlePrint}
                    rounded="xl"
                    px={10}
                    boxShadow="lg"
                >
                    Download Speech Report (PDF)
                </Button>
            </HStack>

            {/* The Report Page */}
            <Box
                id="report-content"
                w="1000px"
                minH="1414px"
                mx="auto"
                bg="white"
                color="slate.900"
                position="relative"
                boxShadow="2xl"
                p="50px"
                sx={{
                    '@media print': {
                        margin: '0',
                        boxShadow: 'none',
                        width: '100%',
                        height: 'auto',
                    }
                }}
            >
                {/* Formal Header */}
                <HStack justify="space-between" borderBottom="3px solid" borderColor="blue.800" pb={6} mb={8}>
                    <VStack align="start" spacing={0}>
                        <HStack spacing={3} mb={1}>
                            <Box bg="blue.800" p={2} rounded="md">
                                <Globe size={28} color="white" />
                            </Box>
                            <VStack align="start" spacing={0}>
                                <Heading size="lg" color="blue.800" letterSpacing="tight" fontWeight="900">
                                    CADENCE AI
                                </Heading>
                                <Text fontSize="xs" fontWeight="bold" color="blue.600" textTransform="uppercase" letterSpacing="2px">
                                    Speech & Communication Audit
                                </Text>
                            </VStack>
                        </HStack>
                    </VStack>
                    <VStack align="end" spacing={1}>
                        <Badge colorScheme="blue" variant="subtle" px={3} py={1} rounded="md">
                            CONFIDENTIAL ANALYSIS
                        </Badge>
                        <Text fontSize="10px" fontWeight="bold" color="gray.400">SESSION: {sessionId.substring(0, 18).toUpperCase()}</Text>
                        <Text fontSize="10px" fontWeight="bold" color="gray.400">ISSUED: {today}</Text>
                    </VStack>
                </HStack>

                {/* Candidate Summary */}
                <SimpleGrid columns={3} spacing={10} mb={12} bg="gray.50" p={8} rounded="2xl" border="1px solid" borderColor="gray.100">
                    <VStack align="start" spacing={1}>
                        <Text fontSize="xs" fontWeight="black" color="gray.500" textTransform="uppercase">Speaker</Text>
                        <Heading size="md" color="slate.800">{userName}</Heading>
                    </VStack>
                    <VStack align="start" spacing={1}>
                        <Text fontSize="xs" fontWeight="black" color="gray.500" textTransform="uppercase">Overall Proficiency</Text>
                        <HStack spacing={3}>
                            <Text fontSize="2xl" fontWeight="900" color="blue.700">{result.overall_score}</Text>
                            <Badge colorScheme="blue" variant="solid" px={3} py={1} rounded="lg">CEFR: {result.cefr_level}</Badge>
                        </HStack>
                    </VStack>
                    <VStack align="start" spacing={1}>
                        <Text fontSize="xs" fontWeight="black" color="gray.500" textTransform="uppercase">Assessment Focus</Text>
                        <Text fontSize="md" fontWeight="bold">Linguistic & Vocal Quality</Text>
                    </VStack>
                </SimpleGrid>

                {/* Primary Analysis: Chakra & Metrics */}
                <SimpleGrid columns={12} spacing={12} mb={14}>
                    <Box gridColumn="span 5">
                        <VStack align="start" spacing={6}>
                            <Heading size="sm" display="flex" alignItems="center" gap={2} color="blue.800">
                                <Activity size={18} /> Performance Chakra
                            </Heading>
                            <Box h="320px" w="full" position="relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#4a5568' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="Score"
                                            dataKey="A"
                                            stroke="#2c5282"
                                            fill="#2c5282"
                                            fillOpacity={0.5}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </Box>
                        </VStack>
                    </Box>

                    <Box gridColumn="span 7">
                        <Heading size="sm" display="flex" alignItems="center" gap={2} mb={6} color="blue.800">
                            <BarChart3 size={18} /> Module Proficiency Breakdown
                        </Heading>
                        <VStack align="stretch" spacing={6}>
                            {radarData.map(metric => (
                                <Box key={metric.subject}>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wide">
                                            {metric.subject}
                                        </Text>
                                        <Text fontSize="sm" fontWeight="900" color="blue.700">{metric.A}%</Text>
                                    </HStack>
                                    <Progress value={metric.A} size="sm" colorScheme="blue" rounded="full" bg="gray.100" />
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                </SimpleGrid>

                {/* Deep Speech Insights (New Sections) */}
                <VStack align="stretch" spacing={10} mb={12}>
                    <Box borderLeft="4px solid" borderColor="blue.500" pl={6}>
                        <Heading size="md" mb={3}>Speech Clarity & Fluency</Heading>
                        <Text fontSize="sm" color="gray.700" lineHeight="tall">
                            {deep_analysis?.clarity_fluency || "Analyzing the smoothness and articulation of your delivery..."}
                        </Text>
                    </Box>

                    <SimpleGrid columns={2} spacing={10}>
                        <VStack align="stretch" spacing={4} bg="blue.50" p={6} rounded="xl">
                            <Heading size="sm" color="blue.800" display="flex" alignItems="center" gap={2}>
                                <Volume2 size={18} /> Confidence & Tone
                            </Heading>
                            <Text fontSize="xs" color="blue.900" lineHeight="tall">
                                {deep_analysis?.confidence_tone || "Evaluating vocal variety, steadiness, and emotional resonance."}
                            </Text>
                        </VStack>

                        <VStack align="stretch" spacing={4} bg="purple.50" p={6} rounded="xl">
                            <Heading size="sm" color="purple.800" display="flex" alignItems="center" gap={2}>
                                <Mic2 size={18} /> Pronunciation Details
                            </Heading>
                            <VStack align="start" spacing={3}>
                                <Box>
                                    <Text fontSize="10px" fontWeight="black" color="purple.600" textTransform="uppercase">Mispronounced Words</Text>
                                    <HStack wrap="wrap" mt={1}>
                                        {deep_analysis?.pronunciation_details.mispronounced_words.map(w => (
                                            <Badge key={w} colorScheme="purple" variant="outline" size="sm">{w}</Badge>
                                        )) || <Text fontSize="xs">Observing phoneme accuracy...</Text>}
                                    </HStack>
                                </Box>
                                <Box>
                                    <Text fontSize="10px" fontWeight="black" color="purple.600" textTransform="uppercase">Target Sounds</Text>
                                    <Text fontSize="xs" color="purple.900">
                                        {deep_analysis?.pronunciation_details.struggled_sounds.join(", ") || "Identifying phonetic clusters for improvement."}
                                    </Text>
                                </Box>
                            </VStack>
                        </VStack>
                    </SimpleGrid>

                    <Box borderLeft="4px solid" borderColor="green.500" pl={6}>
                        <Heading size="md" mb={3}>Pacing & Control</Heading>
                        <Text fontSize="sm" color="gray.700" lineHeight="tall">
                            {deep_analysis?.pacing_control || "Analyzing your use of pauses, filler words, and rhythmic consistency."}
                        </Text>
                    </Box>

                    <Box borderLeft="4px solid" borderColor="orange.500" pl={6}>
                        <Heading size="md" mb={3}>Grammar & Vocabulary Usage</Heading>
                        <Text fontSize="sm" color="gray.700" lineHeight="tall">
                            {deep_analysis?.grammar_vocabulary || "Evaluating your lexicon choices and structural accuracy."}
                        </Text>
                    </Box>
                </VStack>

                {/* Action Plan Section */}
                <Box mb={12} border="2px solid" borderColor="blue.100" p={8} rounded="2xl">
                    <Heading size="md" mb={6} display="flex" alignItems="center" gap={3} color="blue.800">
                        <Zap size={22} fill="#2c5282" /> Actionable Improvement Plan
                    </Heading>
                    <VStack align="stretch" spacing={8}>
                        {deep_analysis?.action_plan.map((item, idx) => (
                            <Box key={idx}>
                                <HStack mb={2}>
                                    <Badge colorScheme="blue" variant="solid" px={2}>AREA {idx + 1}</Badge>
                                    <Text fontWeight="black" fontSize="sm" color="blue.900">{item.weakness}</Text>
                                </HStack>
                                <Text fontSize="xs" bg="gray.50" p={3} rounded="md" borderLeft="3px solid" borderColor="gray.300" fontStyle="italic" mb={3}>
                                    " {item.example} "
                                </Text>
                                <HStack align="start" spacing={3}>
                                    <Icon as={Award} color="green.500" mt={1} />
                                    <Text fontSize="xs" color="gray.700">
                                        <Text as="span" fontWeight="bold" color="green.700">TIP: </Text>
                                        {item.tip}
                                    </Text>
                                </HStack>
                            </Box>
                        )) || (
                                <Center py={10}>
                                    <VStack>
                                        <Info size={30} color="#e2e8f0" />
                                        <Text color="gray.400" fontSize="sm">AI is drafting your personalized roadmap...</Text>
                                    </VStack>
                                </Center>
                            )}
                    </VStack>
                </Box>

                {/* Footer Disclaimer */}
                <Center mt={10} flexDirection="column" borderTop="1px solid" borderColor="gray.100" pt={8}>
                    <HStack spacing={2} mb={4}>
                        <ShieldCheck size={20} color="#2c5282" />
                        <Text fontSize="10px" fontWeight="black" color="blue.800" textTransform="uppercase" letterSpacing="2px">
                            Verified AI Linguistic Audit
                        </Text>
                    </HStack>
                    <Text fontSize="8px" color="gray.400" textAlign="center" maxW="500px">
                        This report is an automated linguistic analysis generated by the Cadence AI Engine. It evaluates communication proficiency through acoustic and textual data patterns and is intended for self-improvement and educational purposes only.
                    </Text>
                </Center>
            </Box>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .report-container { padding: 0 !important; background: white !important; }
                    #report-content { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; padding: 40px !important; }
                }
            `}} />
        </Box>
    );
};
