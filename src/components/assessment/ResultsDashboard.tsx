import React, { useState } from 'react';
import {
    Box, VStack, HStack, Heading, Text, SimpleGrid, Progress,
    Badge, Icon, Button, Divider, Center, Modal, ModalOverlay,
    ModalContent, ModalBody, ModalCloseButton, useDisclosure, Stack
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
    Award, TrendingUp, Zap, MessageSquare, CheckCircle2,
    AlertCircle, Lock, LayoutDashboard, Share2, Download, FileText
} from 'lucide-react';
import { AnalysisResult } from '../../services/api';
import { AssessmentReport } from './AssessmentReport';

interface ResultsDashboardProps {
    result: AnalysisResult;
    onRetry: () => void;
    userName: string;
    sessionId: string;
}

const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <VStack align="stretch" spacing={2} w="full">
        <HStack justify="space-between">
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.600">
                {label}
            </Text>
            <Text fontSize="sm" fontWeight="bold" color={color}>{value}/100</Text>
        </HStack>
        <Box h="2" bg="whiteAlpha.100" rounded="full" overflow="hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ height: '100%', background: color, borderRadius: 'full' }}
            />
        </Box>
    </VStack>
);

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, onRetry, userName, sessionId }) => {
    const { breakdown } = result;
    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <Box
            w="full"
            maxW={{ base: "100%", lg: "5xl" }}
            mx="auto"
            py={{ base: 6, md: 12 }}
            px={{ base: 4, sm: 6, md: 8 }}
        >
            <VStack spacing={10} align="stretch">
                {/* Header Scorecard */}
                {result.api_error && (
                    <Box p={4} bg="orange.400/10" border="1px solid" borderColor="orange.400/20" rounded="2xl" mb={2}>
                        <HStack spacing={3}>
                            <Icon as={AlertCircle} color="orange.400" />
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" color="orange.200" fontSize="sm">AI Insights Throttled</Text>
                                <Text fontSize="xs" color="whiteAlpha.600">
                                    Our advanced AI is currently experiencing high demand. We've provided a report based on our core heuristic engine.
                                </Text>
                            </VStack>
                        </HStack>
                    </Box>
                )}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
                    <Box
                        gridColumn={{ md: "span 2" }}
                        p={8} bg="whiteAlpha.50" rounded="3xl"
                        border="1px solid" borderColor="whiteAlpha.100"
                        backdropFilter="blur(10px)"
                    >
                        <HStack spacing={8}>
                            <Box position="relative">
                                {/* Radial Chart Placeholder / Simple circle for now */}
                                <Center
                                    w={{ base: "120px", md: "160px", lg: "160px" }}
                                    h={{ base: "120px", md: "160px", lg: "160px" }}
                                    rounded="full"
                                    border="8px solid" borderColor="blue.500"
                                    boxShadow="0 0 30px rgba(66, 153, 225, 0.3)"
                                >
                                    <VStack spacing={0}>
                                        <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="black">{result.overall_score}</Text>
                                        <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.600">OVERALL</Text>
                                    </VStack>
                                </Center>
                            </Box>
                            <VStack align="start" spacing={4}>
                                <Badge colorScheme="blue" variant="subtle" px={3} py={1} rounded="lg" fontSize="xs">
                                    CEFR LEVEL: {result.cefr_level}
                                </Badge>
                                <Heading size="lg">Assessment Snapshot</Heading>
                                <Text color="whiteAlpha.700" fontSize="sm">
                                    {result.feedback}
                                </Text>
                            </VStack>
                        </HStack>
                    </Box>

                    <VStack
                        p={8} bg="blue.500" rounded="3xl"
                        align="center" justify="center" spacing={4}
                        color="white"
                    >
                        <Icon as={TrendingUp} w={10} h={10} />
                        <VStack spacing={0}>
                            <Text fontSize="2xl" fontWeight="black">Better than 60%</Text>
                            <Text fontSize="xs" fontWeight="bold" opacity={0.8}>of users at your level</Text>
                        </VStack>
                    </VStack>
                </SimpleGrid>

                {/* Performance Breakdown */}
                <VStack
                    p={8} bg="whiteAlpha.50" rounded="3xl"
                    border="1px solid" borderColor="whiteAlpha.100"
                    align="stretch" spacing={8}
                >
                    <Heading size="md" display="flex" alignItems="center" gap={2}>
                        <TrendingUp size={20} /> Performance Breakdown
                    </Heading>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={12} spacingY={8}>
                        <MetricBar label="Fluency" value={breakdown.fluency} color="#4299E1" />
                        <MetricBar label="Pronunciation" value={breakdown.pronunciation} color="#9F7AEA" />
                        <MetricBar label="Grammar" value={breakdown.grammar} color="#48BB78" />
                        <MetricBar label="Vocabulary" value={breakdown.vocabulary} color="#ECC94B" />
                        <MetricBar label="Clarity" value={breakdown.clarity} color="#F56565" />
                        <MetricBar label="Confidence" value={breakdown.confidence} color="#ED64A1" />
                    </SimpleGrid>
                </VStack>

                {/* Strengths & Focus Areas */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                    <VStack
                        p={8} bg="emerald.500/10" rounded="3xl"
                        border="1px solid" borderColor="emerald.500/20"
                        align="stretch" spacing={6}
                    >
                        <Heading size="sm" color="emerald.400" display="flex" alignItems="center" gap={2}>
                            <CheckCircle2 size={18} /> Top Strengths
                        </Heading>
                        <VStack align="stretch" spacing={3}>
                            {result.strengths.map((s, i) => (
                                <HStack key={i} spacing={3}>
                                    <Icon as={Zap} w={3} h={3} color="emerald.400" />
                                    <Text fontSize="sm" color="whiteAlpha.800">{s}</Text>
                                </HStack>
                            ))}
                        </VStack>
                    </VStack>

                    <VStack
                        p={8} bg="orange.500/10" rounded="3xl"
                        border="1px solid" borderColor="orange.500/20"
                        align="stretch" spacing={6}
                    >
                        <Heading size="sm" color="orange.400" display="flex" alignItems="center" gap={2}>
                            <AlertCircle size={18} /> Focus Areas
                        </Heading>
                        <VStack align="stretch" spacing={3}>
                            {result.focus_areas.map((f, i) => (
                                <HStack key={i} spacing={3}>
                                    <Icon as={AlertCircle} w={3} h={3} color="orange.400" />
                                    <Text fontSize="sm" color="whiteAlpha.800">{f}</Text>
                                </HStack>
                            ))}
                        </VStack>
                    </VStack>
                </SimpleGrid>

                {/* PRO Features Preview (Locked) */}
                <Box
                    p={8} bg="whiteAlpha.50" rounded="3xl"
                    border="1px solid" borderColor="whiteAlpha.100"
                    position="relative" overflow="hidden"
                >
                    <VStack spacing={6} filter="blur(4px)" pointerEvents="none" opacity={0.4}>
                        <Heading size="md">Detailed Word-by-Word Analysis</Heading>
                        <Text>Your pronunciation of 'th' sounds in 'the' and 'through' was slightly muffled...</Text>
                        <Divider borderColor="whiteAlpha.100" />
                        <Heading size="md">Audio Playback Highlights</Heading>
                        <Box h="100px" bg="whiteAlpha.100" rounded="xl" w="full" />
                    </VStack>

                    <Center position="absolute" inset={0} bg="blackAlpha.600" backdropFilter="blur(2px)">
                        <VStack spacing={4}>
                            <Icon as={Lock} w={8} h={8} color="blue.400" />
                            <Heading size="md">Unlock PRO Insights</Heading>
                            <Text fontSize="sm" color="whiteAlpha.600" textAlign="center">
                                Get word-by-word corrections, audio highlights, and a 30-day improvement plan.
                            </Text>
                            <Button colorScheme="blue" rounded="full" px={10}>
                                Upgrade for $9.99/mo
                            </Button>
                        </VStack>
                    </Center>
                </Box>

                {/* Footer Actions */}
                <Stack
                    direction={{ base: "column", sm: "row" }}
                    justify={{ base: "stretch", sm: "space-between" }}
                    align={{ base: "stretch", sm: "center" }}
                    spacing={{ base: 3, sm: 4 }}
                    pt={4}
                >
                    <Button
                        variant="ghost"
                        leftIcon={<LayoutDashboard size={18} />}
                        onClick={() => window.location.href = '/dashboard'}
                        w={{ base: "100%", sm: "auto" }}
                    >
                        Back to Dashboard
                    </Button>
                    <Stack
                        direction={{ base: "column", sm: "row" }}
                        spacing={{ base: 3, sm: 4 }}
                        w={{ base: "100%", sm: "auto" }}
                    >
                        <Button
                            colorScheme="blue"
                            variant="solid"
                            leftIcon={<FileText size={18} />}
                            onClick={onOpen}
                            boxShadow="0 4px 14px 0 rgba(66, 153, 223, 0.39)"
                            w={{ base: "100%", sm: "auto" }}
                        >
                            View Full Performance Report
                        </Button>
                        <Button variant="outline" leftIcon={<Share2 size={18} />} w={{ base: "100%", sm: "auto" }}>Share</Button>
                        <Button colorScheme="blue" onClick={onRetry} w={{ base: "100%", sm: "auto" }}>New Assessment</Button>
                    </Stack>
                </Stack>
            </VStack>

            {/* Performance Report Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="full">
                <ModalOverlay backdropFilter="blur(10px)" bg="gray.900/40" />
                <ModalContent bg="gray.50" boxShadow="none" m={0} rounded={0}>
                    <ModalCloseButton color="gray.600" zIndex={10} bg="white" rounded="full" mt={4} mr={4} />
                    <ModalBody p={0} overflowY="auto">
                        <AssessmentReport
                            userName={userName}
                            sessionId={sessionId}
                            result={result}
                            onClose={onClose}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
};
