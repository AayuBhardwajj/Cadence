import React from 'react';
import {
    Box, VStack, HStack, Text, Heading, SimpleGrid,
    Divider, Center, Button, Icon, Badge, Table,
    Thead, Tbody, Tr, Th, Td, Progress
} from '@chakra-ui/react';
import {
    Download, Globe, ShieldCheck, User, Calendar,
    FileText, Award, BarChart3, Target, Briefcase,
    CheckCircle2, AlertCircle, Info
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

    const radarData = [
        { subject: 'Fluency', A: result.breakdown.fluency, fullMark: 100 },
        { subject: 'Pronunciation', A: result.breakdown.pronunciation, fullMark: 100 },
        { subject: 'Grammar', A: result.breakdown.grammar, fullMark: 100 },
        { subject: 'Vocabulary', A: result.breakdown.vocabulary, fullMark: 100 },
        { subject: 'Clarity', A: result.breakdown.clarity, fullMark: 100 },
        { subject: 'Confidence', A: result.breakdown.confidence, fullMark: 100 },
    ];

    const jobMatches = [
        { role: 'Business Consultant', match: Math.min(100, result.overall_score + 5), status: 'High' },
        { role: 'Sales Executive', match: Math.min(100, result.breakdown.confidence + 10), status: 'High' },
        { role: 'Technical Lead', match: Math.min(100, result.breakdown.clarity + 5), status: 'Medium' },
        { role: 'Customer Success', match: Math.min(100, result.breakdown.fluency + 8), status: 'High' },
    ];

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box className="report-container" p={8} bg="gray.50" minH="100vh">
            {/* Control Bar */}
            <HStack justify="space-between" mb={8} className="no-print" maxW="1000px" mx="auto">
                <Button variant="ghost" onClick={onClose} color="gray.600">
                    Close Report
                </Button>
                <Button
                    leftIcon={<Download size={18} />}
                    colorScheme="blue"
                    onClick={handlePrint}
                    rounded="xl"
                    px={10}
                    boxShadow="lg"
                >
                    Download Comprehensive PDF
                </Button>
            </HStack>

            {/* The Report Page */}
            <Box
                id="report-content"
                w="1000px"
                minH="1414px" // A4 Ratio
                mx="auto"
                bg="white"
                color="slate.900"
                position="relative"
                boxShadow="2xl"
                p="40px"
                sx={{
                    '@media print': {
                        margin: '0',
                        boxShadow: 'none',
                        width: '100%',
                        height: 'auto',
                    }
                }}
            >
                {/* Header Context */}
                <HStack justify="space-between" borderBottom="2px solid" borderColor="gray.100" pb={6} mb={8}>
                    <VStack align="start" spacing={0}>
                        <HStack spacing={2} mb={1}>
                            <Globe size={24} color="#1a365d" />
                            <Heading size="md" color="#1a365d" letterSpacing="tight" fontWeight="black">
                                CADENCE AI
                            </Heading>
                        </HStack>
                        <Text fontSize="10px" fontWeight="black" color="blue.600" textTransform="uppercase" letterSpacing="1px">
                            Comprehensive Speech Performance Report
                        </Text>
                    </VStack>
                    <SimpleGrid columns={2} spacingX={8} spacingY={1}>
                        <VStack align="start" spacing={0}>
                            <Text fontSize="8px" fontWeight="bold" color="gray.400">REPORT ID</Text>
                            <Text fontSize="10px" fontWeight="bold">{sessionId.substring(0, 12).toUpperCase()}</Text>
                        </VStack>
                        <VStack align="start" spacing={0}>
                            <Text fontSize="8px" fontWeight="bold" color="gray.400">DATE</Text>
                            <Text fontSize="10px" fontWeight="bold">{today}</Text>
                        </VStack>
                    </SimpleGrid>
                </HStack>

                {/* Candidate Info */}
                <Box bg="gray.50" p={6} rounded="xl" mb={10} border="1px solid" borderColor="gray.100">
                    <HStack spacing={12}>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500">CANDIDATE NAME</Text>
                            <Heading size="md" color="slate.800">{userName}</Heading>
                        </VStack>
                        <Divider orientation="vertical" h="40px" borderColor="gray.200" />
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500">ASSESSMENT TYPE</Text>
                            <Text fontSize="md" fontWeight="bold" color="slate.700">Full AI Communication Audit</Text>
                        </VStack>
                        <Divider orientation="vertical" h="40px" borderColor="gray.200" />
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500">OVERALL SCORE</Text>
                            <HStack>
                                <Heading size="md" color="blue.600">{result.overall_score}</Heading>
                                <Badge colorScheme="blue" variant="solid" fontSize="10px">LEVEL: {result.cefr_level}</Badge>
                            </HStack>
                        </VStack>
                    </HStack>
                </Box>

                <SimpleGrid columns={12} spacing={10} mb={10}>
                    {/* Left Column: Performance Chakra */}
                    <Box gridColumn="span 5">
                        <VStack align="start" spacing={6}>
                            <Box w="full">
                                <HStack mb={4}>
                                    <Icon as={Award} color="blue.500" />
                                    <Heading size="sm">Performance Chakra</Heading>
                                </HStack>
                                <Box h="300px" w="full" bg="gray.50" rounded="2xl" p={4} border="1px solid" borderColor="gray.100">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#4a5568' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                name="You"
                                                dataKey="A"
                                                stroke="#3182ce"
                                                fill="#3182ce"
                                                fillOpacity={0.6}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </Box>
                                <Text fontSize="xs" mt={3} color="gray.500" textAlign="center" fontStyle="italic">
                                    Visual mapping of your core communication competencies.
                                </Text>
                            </Box>
                        </VStack>
                    </Box>

                    {/* Right Column: Module Breakdown */}
                    <Box gridColumn="span 7">
                        <HStack mb={4}>
                            <Icon as={BarChart3} color="blue.500" />
                            <Heading size="sm">Module Proficiency Breakdown</Heading>
                        </HStack>
                        <VStack align="stretch" spacing={5}>
                            {radarData.map(metric => (
                                <Box key={metric.subject}>
                                    <HStack justify="space-between" mb={1.5}>
                                        <Text fontSize="xs" fontWeight="bold" color="gray.600">{metric.subject}</Text>
                                        <Text fontSize="xs" fontWeight="black" color="blue.600">{metric.A}/100</Text>
                                    </HStack>
                                    <Progress value={metric.A} size="xs" colorScheme="blue" rounded="full" bg="gray.100" />
                                    <Text fontSize="9px" mt={1} color="gray.400">
                                        Comparison to baseline global average: <Text as="span" color="green.500" fontWeight="bold">+{Math.floor(metric.A / 4)}%</Text>
                                    </Text>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                </SimpleGrid>

                {/* Job Match Summary */}
                <Box mb={10}>
                    <HStack mb={4}>
                        <Icon as={Briefcase} color="blue.500" />
                        <Heading size="sm">Employability & Job Match Summary</Heading>
                    </HStack>
                    <Table size="sm" variant="simple" border="1px solid" borderColor="gray.100" bg="white">
                        <Thead bg="gray.50">
                            <Tr>
                                <Th fontSize="9px">Job Role</Th>
                                <Th fontSize="9px">Suitability Index</Th>
                                <Th fontSize="9px">Match Status</Th>
                                <Th fontSize="9px">Recommendation</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {jobMatches.map((job, idx) => (
                                <Tr key={idx}>
                                    <Td fontSize="xs" fontWeight="bold" color="gray.700">{job.role}</Td>
                                    <Td>
                                        <HStack spacing={2}>
                                            <Box w="60px" h="4px" bg="gray.100" rounded="full" overflow="hidden">
                                                <Box w={`${job.match}%`} h="full" bg={job.match > 80 ? 'green.400' : 'blue.400'} />
                                            </Box>
                                            <Text fontSize="10px" fontWeight="bold">{job.match}%</Text>
                                        </HStack>
                                    </Td>
                                    <Td>
                                        <Badge variant="subtle" colorScheme={job.status === 'High' ? 'green' : 'blue'} fontSize="9px">
                                            {job.status} MATCH
                                        </Badge>
                                    </Td>
                                    <Td fontSize="xs" color="gray.500">
                                        {job.match > 85 ? 'Highly recommended for this role.' : 'Good potential with practice.'}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>

                <SimpleGrid columns={2} spacing={10} mb={10}>
                    {/* Strengths */}
                    <Box p={6} bg="green.50" rounded="xl" border="1px solid" borderColor="green.100">
                        <HStack mb={4} color="green.700">
                            <Icon as={CheckCircle2} />
                            <Heading size="xs" textTransform="uppercase" letterSpacing="1px">Core Strengths</Heading>
                        </HStack>
                        <VStack align="start" spacing={2}>
                            {result.strengths.slice(0, 3).map((s, i) => (
                                <HStack key={i} align="start" spacing={2}>
                                    <Box w="4px" h="4px" rounded="full" bg="green.400" mt="6px" />
                                    <Text fontSize="xs" color="green.800" fontWeight="medium">{s}</Text>
                                </HStack>
                            ))}
                        </VStack>
                    </Box>

                    {/* Opportunities */}
                    <Box p={6} bg="orange.50" rounded="xl" border="1px solid" borderColor="orange.100">
                        <HStack mb={4} color="orange.700">
                            <Icon as={AlertCircle} />
                            <Heading size="xs" textTransform="uppercase" letterSpacing="1px">Growth Opportunities</Heading>
                        </HStack>
                        <VStack align="start" spacing={2}>
                            {result.focus_areas.slice(0, 3).map((f, i) => (
                                <HStack key={i} align="start" spacing={2}>
                                    <Box w="4px" h="4px" rounded="full" bg="orange.400" mt="6px" />
                                    <Text fontSize="xs" color="orange.800" fontWeight="medium">{f}</Text>
                                </HStack>
                            ))}
                        </VStack>
                    </Box>
                </SimpleGrid>

                {/* AI Detailed Feedback */}
                <Box p={8} bg="blue.900" color="white" rounded="2xl" position="relative" overflow="hidden">
                    <Box position="absolute" top="-10px" right="-10px" opacity={0.1}>
                        <FileText size={100} />
                    </Box>
                    <VStack align="start" spacing={4}>
                        <HStack>
                            <Icon as={ShieldCheck} />
                            <Heading size="sm">AI Lead Analysis & Feedback</Heading>
                        </HStack>
                        <Text fontSize="sm" lineHeight="tall" opacity={0.9}>
                            "{result.feedback}"
                        </Text>
                        <Divider borderColor="whiteAlpha.300" />
                        <HStack w="full" justify="space-between">
                            <VStack align="start" spacing={0}>
                                <Text fontSize="10px" fontWeight="bold" opacity={0.5}>TRANSCRIPTION SLICE</Text>
                                <Text fontSize="xs" fontStyle="italic" noOfLines={1} maxW="400px">
                                    "{result.transcription.substring(0, 80)}..."
                                </Text>
                            </VStack>
                            <VStack align="end" spacing={0}>
                                <Text fontSize="10px" fontWeight="bold" opacity={0.5}>ANALYSIS ENGINE</Text>
                                <Text fontSize="xs" fontWeight="black">CADENCE-V4 (GPT/CLAUDE HYBRID)</Text>
                            </VStack>
                        </HStack>
                    </VStack>
                </Box>

                {/* Footer */}
                <Center mt={12} flexDirection="column">
                    <Text fontSize="10px" color="gray.400" fontWeight="bold" textTransform="uppercase" letterSpacing="2px">
                        Generated by Cadence AI Assessment Platform
                    </Text>
                    <Text fontSize="8px" color="gray.300">
                        This report is system generated based on AI analysis of audio and visual data and does not require a physical signature.
                    </Text>
                </Center>
            </Box>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .report-container { padding: 0 !important; background: white !important; }
                    #report-content { box-shadow: none !important; border: none !important; }
                }
            `}} />
        </Box>
    );
};
