import { useState, useEffect } from "react";
import { Box, Button, useToast, Heading, VStack, Text, SimpleGrid, Badge, HStack, Container } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { PreRecordingSetup } from "../components/assessment/PreRecordingSetup";
import { RecordingInterface } from "../components/assessment/RecordingInterface";
import { ProcessingScreen } from "../components/assessment/ProcessingScreen";
import { uploadVideoForAnalysis, AnalysisResult } from "../services/api";
import { supabase } from "../lib/supabase";
import { AuroraBackground } from "../components/arcenity/AuroraBackground";
import { GlassmorphicCard } from "../components/arcenity/GlassmorphicCard";

// Results Component (Simple version for now, to complete the flow)
const ResultsView = ({ result, onRetry }: { result: AnalysisResult; onRetry: () => void }) => (
    <Container maxW="4xl" py={20}>
        <GlassmorphicCard intensity="strong" p={10}>
            <VStack spacing={8} align="stretch">
                <HStack justify="space-between" align="center">
                    <Heading size="lg">Assessment Results</Heading>
                    <Badge colorScheme={result.overall_score >= 80 ? "green" : "orange"} fontSize="md" p={2} rounded="md">
                        {result.overall_score >= 80 ? "Excellent" : "Good Attempt"}
                    </Badge>
                </HStack>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    <Box p={4} bg="whiteAlpha.100" rounded="xl" border="1px solid white">
                        <Text color="gray.500" fontSize="sm">Overall Score</Text>
                        <Heading size="xl" color="blue.500">{result.overall_score}/100</Heading>
                    </Box>
                    <Box p={4} bg="whiteAlpha.100" rounded="xl" border="1px solid white">
                        <Text color="gray.500" fontSize="sm">WPM</Text>
                        <Heading size="xl" color="green.500">{result.breakdown.wpm}</Heading>
                    </Box>
                    <Box p={4} bg="whiteAlpha.100" rounded="xl" border="1px solid white">
                        <Text color="gray.500" fontSize="sm">Fillers</Text>
                        <Heading size="xl" color="purple.500">{result.breakdown.fillers}</Heading>
                    </Box>
                </SimpleGrid>

                <Box p={6} bg="blue.50" rounded="xl" color="black">
                    <Heading size="sm" mb={2}>Feedback</Heading>
                    <Text>{result.feedback}</Text>
                </Box>

                <HStack justify="center">
                    <Button onClick={onRetry}>Try Again</Button>
                    <Button colorScheme="blue" onClick={() => window.location.href = '/dashboard'}>Dashboard</Button>
                </HStack>
            </VStack>
        </GlassmorphicCard>
    </Container>
);

export function Assessment() {
    const [step, setStep] = useState<'intro' | 'setup' | 'recording' | 'processing' | 'results'>('intro');
    const [blob, setBlob] = useState<Blob | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [userName, setUserName] = useState("User");
    const toast = useToast();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user?.user_metadata?.full_name) {
                setUserName(data.user.user_metadata.full_name);
            }
        });
    }, []);

    const handleRecordingComplete = (recordedBlob: Blob) => {
        setBlob(recordedBlob);
        setStep('processing');
        // Start upload immediately in background or wait for processing screen?
        // The ProcessingScreen has a mock timer, but we should realistically sync it.
        // For this UX, we let the orbital system play while we upload.
        handleUpload(recordedBlob);
    };

    const handleUpload = async (file: Blob) => {
        try {
            const res = await uploadVideoForAnalysis(file);

            // Save to DB
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase.from('assessments').insert({
                    user_id: session.user.id,
                    overall_score: res.overall_score,
                    wpm: res.breakdown.wpm,
                    eye_contact_score: res.breakdown.eye_contact,
                    filler_word_count: res.breakdown.fillers,
                    feedback: res.feedback,
                    transcription: res.transcription,
                });
            }
            setResult(res);
            // We don't advance step immediately; ProcessingScreen calls onComplete
        } catch (err) {
            console.error(err);
            toast({ title: "Analysis Failed", status: "error" });
            setStep('setup');
        }
    };

    return (
        <Box h="100vh" w="full" overflow="hidden" position="relative" bg="black">
            <AnimatePresence mode="wait">
                {step === 'intro' && (
                    <AuroraBackground key="intro">
                        <Container centerContent h="100vh" justifyContent="center">
                            <VStack spacing={8}>
                                <Heading size="2xl">Ready to Improve?</Heading>
                                <Button size="lg" colorScheme="blue" onClick={() => setStep('setup')}>
                                    Start New Assessment
                                </Button>
                            </VStack>
                        </Container>
                    </AuroraBackground>
                )}

                {step === 'setup' && (
                    <PreRecordingSetup key="setup" onReady={() => setStep('recording')} />
                )}

                {step === 'recording' && (
                    <RecordingInterface
                        key="recording"
                        userName={userName}
                        onRecordingComplete={handleRecordingComplete}
                        onCancel={() => setStep('setup')}
                    />
                )}

                {step === 'processing' && (
                    <ProcessingScreen key="processing" onComplete={() => step === 'processing' && result && setStep('results')} />
                )}

                {step === 'results' && result && (
                    <Box key="results" h="100vh" bgGradient="linear(to-b, #0a0e27, #1a0b2e)" overflow="auto">
                        <ResultsView result={result} onRetry={() => setStep('setup')} />
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
}
