import { useState, useEffect } from "react";
import { Box, Button, useToast, Heading, VStack, Text, SimpleGrid, Badge, HStack, Container } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { PreRecordingSetup } from "../components/assessment/PreRecordingSetup";
import { RecordingInterface } from "../components/assessment/RecordingInterface";
import { ProcessingScreen } from "../components/assessment/ProcessingScreen";
import { TopicSelection } from "../components/assessment/TopicSelection";
import { ResultsDashboard } from "../components/assessment/ResultsDashboard";
import {
    checkEligibility,
    startAssessment,
    uploadFullAssessment,
    AnalysisResult,
    EligibilityResponse
} from "../services/api";
import { supabase } from "../lib/supabase";
import { AuroraBackground } from "../components/arcenity/AuroraBackground";
import { GlassmorphicCard } from "../components/arcenity/GlassmorphicCard";
import { Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Center } from "@chakra-ui/react";

// Eligibility View
const EligibilityView = ({ eligibility, onBack }: { eligibility: EligibilityResponse, onBack: () => void }) => {
    const nextAvailable = eligibility.next_available_at ? new Date(eligibility.next_available_at) : null;
    const now = new Date();
    const diffMs = nextAvailable ? nextAvailable.getTime() - now.getTime() : 0;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return (
        <Container maxW="2xl" centerContent py={20}>
            <GlassmorphicCard intensity="strong" p={10}>
                <VStack spacing={8} textAlign="center">
                    <Box p={4} bg="orange.400/10" rounded="full">
                        <Clock size={40} color="#ED8936" />
                    </Box>
                    <VStack spacing={2}>
                        <Heading size="lg">Assessment on Cooldown</Heading>
                        <Text color="whiteAlpha.600">
                            Free users can take one Full Assessment every 24 hours.
                        </Text>
                    </VStack>

                    <Box p={6} bg="whiteAlpha.50" rounded="2xl" border="1px solid" borderColor="whiteAlpha.100" w="full">
                        <VStack spacing={1}>
                            <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.400" textTransform="uppercase">Next available in</Text>
                            <Heading size="xl" color="orange.400">
                                {diffHours}h {diffMins}m
                            </Heading>
                        </VStack>
                    </Box>

                    <VStack spacing={4} w="full">
                        <Button w="full" variant="outline" onClick={onBack}>
                            Back to Intro
                        </Button>
                        <Button w="full" colorScheme="blue" leftIcon={<ArrowRight size={18} />} onClick={() => window.location.href = '/exercises'}>
                            Try Quick Practice
                        </Button>
                    </VStack>

                    <HStack spacing={2} p={4} bg="blue.500/10" rounded="xl" border="1px solid" borderColor="blue.500/20">
                        <AlertTriangle size={16} color="#4299E1" />
                        <Text fontSize="xs" color="blue.300" fontWeight="bold">
                            Upgrade to PRO for unlimited assessments
                        </Text>
                    </HStack>
                </VStack>
            </GlassmorphicCard>
        </Container>
    );
};

export function Assessment() {
    type Step = 'intro' | 'eligibility-check' | 'not-eligible' | 'topic-selection' | 'setup' | 'recording' | 'processing' | 'results';
    const [step, setStep] = useState<Step>('intro');
    const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [topicId, setTopicId] = useState<string>('custom');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('intermediate');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [userName, setUserName] = useState("User");
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUserId(data.user.id);
                if (data.user.user_metadata?.full_name) {
                    setUserName(data.user.user_metadata.full_name);
                }
            }
        });
    }, []);

    const handleStartClick = async () => {
        if (!userId) {
            toast({ title: "Please login first", status: "warning" });
            return;
        }
        setStep('eligibility-check');
        try {
            const res = await checkEligibility(userId);
            setEligibility(res);
            if (res.can_assess) {
                const { sessionId } = await startAssessment(userId);
                setSessionId(sessionId);
                setStep('topic-selection');
            } else {
                setStep('not-eligible');
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Connection Error", status: "error" });
            setStep('intro');
        }
    };

    const handleTopicSelect = (id: string, difficulty: string) => {
        setTopicId(id);
        setSelectedDifficulty(difficulty);
        setStep('setup');
    };

    const handleRecordingComplete = (recordedBlob: Blob) => {
        setStep('processing');
        handleUpload(recordedBlob);
    };

    const handleUpload = async (file: Blob) => {
        if (!userId || !sessionId) return;
        try {
            const res = await uploadFullAssessment(file, userId, sessionId, topicId, 300); // 300s target
            setResult(res.results);
            // Result is now handled via ProcessingScreen timer
        } catch (err) {
            console.error(err);
            toast({ title: "Analysis Failed", status: "error" });
            setStep('topic-selection');
        }
    };

    return (
        <Box
            h="100vh" w="full" overflow="hidden"
            position="relative" bg="black"
        >
            <AnimatePresence mode="wait">
                {step === 'intro' && (
                    <AuroraBackground key="intro">
                        <Container centerContent h="100vh" justifyContent="center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <VStack spacing={8} textAlign="center">
                                    <VStack spacing={4}>
                                        <Heading size="3xl" color="white" fontWeight="black" letterSpacing="tight">
                                            FULL ASSESSMENT
                                        </Heading>
                                        <Text color="whiteAlpha.600" fontSize="xl" maxW="md">
                                            Test your speaking, fluency, and grammar in a comprehensive 5-minute session.
                                        </Text>
                                    </VStack>
                                    <Button
                                        size="lg"
                                        colorScheme="blue"
                                        h="70px" px={10} rounded="full" fontSize="xl"
                                        onClick={handleStartClick}
                                        boxShadow="0 0 20px rgba(66, 153, 225, 0.4)"
                                        _hover={{ transform: 'translateY(-2px)', boxShadow: '0 0 30px rgba(66, 153, 225, 0.6)' }}
                                    >
                                        Start My Daily Assessment
                                    </Button>
                                    <Text color="whiteAlpha.400" fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="widest">
                                        Free: 1 session per 24 hours
                                    </Text>
                                </VStack>
                            </motion.div>
                        </Container>
                    </AuroraBackground>
                )}

                {step === 'eligibility-check' && (
                    <AuroraBackground key="checking">
                        <Center h="100vh">
                            <VStack spacing={6}>
                                <Box className="loader" /> {/* Assuming a loader CSS exists or handled by Aurora */}
                                <Text color="white" fontWeight="bold">Validating session...</Text>
                            </VStack>
                        </Center>
                    </AuroraBackground>
                )}

                {step === 'not-eligible' && eligibility && (
                    <Box key="not-eligible" bg="black" minH="100vh">
                        <EligibilityView eligibility={eligibility} onBack={() => setStep('intro')} />
                    </Box>
                )}

                {step === 'topic-selection' && (
                    <Box
                        key="topics"
                        minH="100vh"
                        bg="#050a1f"
                        overflowY="auto"
                        py={{ base: 6, md: 10 }}
                        px={{ base: 0, md: 4 }}
                    >
                        <TopicSelection onSelect={handleTopicSelect} />
                    </Box>
                )}

                {step === 'setup' && (
                    <PreRecordingSetup key="setup" onReady={() => setStep('recording')} />
                )}

                {step === 'recording' && (
                    <RecordingInterface
                        key="recording"
                        userName={userName}
                        topicId={topicId}
                        difficulty={selectedDifficulty}
                        onRecordingComplete={handleRecordingComplete}
                        onCancel={() => setStep('topic-selection')}
                    />
                )}

                {step === 'processing' && (
                    <ProcessingScreen key="processing" onComplete={() => result && setStep('results')} />
                )}

                {step === 'results' && result && (
                    <Box key="results" h="100vh" bgGradient="linear(to-b, #0a0e27, #1a0b2e)" overflow="auto">
                        <ResultsDashboard
                            result={result}
                            onRetry={() => setStep('intro')}
                            userName={userName}
                            sessionId={sessionId || 'CADENCE-AI-SESSION'}
                        />
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
}
