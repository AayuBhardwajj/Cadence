import {
    Box,
    Container,
    Heading,
    Text,
    VStack,
    HStack,
    Button,
    Progress,
    useColorModeValue,
    Flex,
    Icon,
    Circle,
    SimpleGrid,
    Badge,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { AuroraBackground } from "../components/arcenity/AuroraBackground";
import { GlassmorphicCard } from "../components/arcenity/GlassmorphicCard";
import { FloatingOrb } from "../components/animations/FloatingElements";
import { uploadVideoForAnalysis, AnalysisResult } from "../services/api";
import { supabase } from "../lib/supabase";
import { useTier } from "../lib/TierContext";
import { Lock, Crown } from 'lucide-react';

// --- Types ---
type AssessmentState = "instructions" | "recording" | "processing" | "results";

// --- Components ---

const RecordingVisualizer = () => {
    return (
        <HStack spacing={1} h="60px" align="center" justify="center">
            {[...Array(20)].map((_, i) => (
                <Box
                    key={i}
                    w="4px"
                    h="20px"
                    bg="blue.400"
                    borderRadius="full"
                    sx={{
                        animation: `wave 1s infinite ${i * 0.1}s ease-in-out`,
                        "@keyframes wave": {
                            "0%, 100%": { height: "20px", opacity: 0.5 },
                            "50%": { height: "50px", opacity: 1 },
                        },
                    }}
                />
            ))}
        </HStack>
    );
};

export function Assessment() {
    const { tier } = useTier();
    const [state, setState] = useState<AssessmentState>("instructions");
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds for recording
    const [processingProgress, setProcessingProgress] = useState(0);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Timer logic for recording state
    useEffect(() => {
        let interval: any;
        if (state === "recording" && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && state === "recording") {
            stopRecording();
        }
        return () => clearInterval(interval);
    }, [state, timeLeft]);

    // Setup Camera on Mount (if needed) or when entering recording state
    // For now, we assume permission is handled in startRecording

    // Process Video and Upload
    const processVideo = async () => {
        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: "video/webm" });

        try {
            // Fake progress for UX
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                if (progress > 90) clearInterval(progressInterval);
                setProcessingProgress(Math.min(progress, 90));
            }, 500);

            const result = await uploadVideoForAnalysis(blob);

            // Save to Supabase
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { error: dbError } = await supabase
                    .from('assessments')
                    .insert({
                        user_id: session.user.id,
                        overall_score: result.overall_score,
                        wpm: result.breakdown.wpm,
                        eye_contact_score: result.breakdown.eye_contact,
                        filler_word_count: result.breakdown.fillers,
                        feedback: result.feedback,
                        transcription: result.transcription,
                        // video_url: result.video_url // Handle if available
                    });

                if (dbError) {
                    console.error("Error saving assessment:", dbError);
                }
            }

            clearInterval(progressInterval);
            setProcessingProgress(100);
            setAnalysisResult(result);
            setState("results");
        } catch (err: any) {
            setError("Analysis failed. Please try again.");
            setState("instructions"); // Go back to start on error
            alert("Failed to analyze video: " + err.message);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // Connect stream to video element for preview (optional)
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
            // Daily limit check for FREE users
            if (tier === 'FREE') {
                const { data: assessments } = await supabase
                    .from('assessments')
                    .select('created_at')
                    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

                if (assessments && assessments.length >= 1) {
                    setError("Daily assessment limit reached. Upgrade to Pro for unlimited sessions.");
                    return;
                }
            }

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks to turn off camera light
                stream.getTracks().forEach(track => track.stop());
                processVideo();
            };

            mediaRecorder.start();
            setState("recording");
            setTimeLeft(60);
            setError(null);
        } catch (err) {
            console.error("Error accessing media devices", err);
            alert("Could not access camera/microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setState("processing");
        }
    };

    // Removed Mock processing logic since we are using real API now



    const resetAssessment = () => {
        setState("instructions");
        setTimeLeft(60);
        setProcessingProgress(0);
        setAnalysisResult(null);
        chunksRef.current = [];
    };

    return (
        <AuroraBackground variant="mixed" minH="100vh">
            <Box position="absolute" top={0} left={0} w="full" h="full" overflow="hidden" pointerEvents="none">
                <FloatingOrb top="10%" left="5%" boxSize="100px" bg="blue.200" opacity={0.3} xRange={20} yRange={30} />
                <FloatingOrb bottom="15%" right="10%" boxSize="150px" bg="purple.200" opacity={0.2} xRange={30} yRange={40} delay={1} />
            </Box>
            <Container maxW="4xl" py={20} position="relative" zIndex={10}>
                <VStack spacing={8} align="stretch">
                    {/* Header */}
                    <VStack spacing={2} textAlign="center">
                        <Heading size="2xl" color="gray.800" fontWeight="800">
                            Speech Assessment
                        </Heading>
                        <Text fontSize="lg" color="gray.600">
                            Analyze your communication skills with our advanced AI
                        </Text>
                    </VStack>

                    {/* Main Content Card */}
                    <GlassmorphicCard intensity="strong" p={10} minH="400px">
                        {state === "instructions" && (
                            <VStack spacing={8} align="center" justify="center" h="100%">
                                <Circle size="80px" bg="blue.50" color="blue.500">
                                    <Text fontSize="4xl">🎙️</Text>
                                </Circle>
                                <VStack spacing={4} textAlign="center" maxW="md">
                                    <Heading size="md">Ready to begin?</Heading>
                                    <Text color="gray.600">
                                        You will have 60 seconds to introduce yourself and describe your perfect weekend.
                                        Speak naturally and clearly.
                                    </Text>
                                </VStack>
                                <Button
                                    size="lg"
                                    colorScheme="blue"
                                    onClick={startRecording}
                                    rounded="full"
                                    px={12}
                                    boxShadow="lg"
                                    isDisabled={tier === 'FREE' && error !== null}
                                    _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
                                >
                                    Start Recording
                                </Button>
                                {error && (
                                    <VStack spacing={4} mt={4} p={6} bg="amber.50" rounded="2xl" border="1px" borderColor="amber.200">
                                        <HStack color="amber.600">
                                            <Lock size={18} />
                                            <Text fontWeight="bold" fontSize="sm">Daily limit reached</Text>
                                        </HStack>
                                        <Text fontSize="xs" color="gray.600">Want to continue practicing today? Pro users get unlimited assessments.</Text>
                                        <Button size="sm" colorScheme="amber" leftIcon={<Crown size={14} />}>
                                            Upgrade Now
                                        </Button>
                                    </VStack>
                                )}
                            </VStack>
                        )}

                        {state === "recording" && (
                            <VStack spacing={8} align="center" justify="center" h="100%">
                                <Text fontSize="sm" fontWeight="bold" color="red.500" letterSpacing="widest">
                                    RECORDING IN PROGRESS
                                </Text>
                                <Heading size="3xl" fontFamily="monospace">
                                    00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                                </Heading>
                                <RecordingVisualizer />
                                <Text color="gray.500" fontSize="sm">
                                    Topic: Introduce yourself and describe your perfect weekend.
                                </Text>
                                <Button
                                    colorScheme="red"
                                    variant="outline"
                                    onClick={stopRecording}
                                    rounded="full"
                                    px={8}
                                >
                                    Stop Recording
                                </Button>
                            </VStack>
                        )}

                        {state === "processing" && (
                            <VStack spacing={8} align="center" justify="center" h="100%">
                                <Heading size="md" color="blue.600">
                                    Analyzing Audio...
                                </Heading>
                                <Box w="full" maxW="md">
                                    <Progress
                                        value={processingProgress}
                                        size="sm"
                                        colorScheme="blue"
                                        rounded="full"
                                        isAnimated
                                        hasStripe
                                    />
                                </Box>
                                <Text color="gray.500" fontSize="sm">
                                    Calculating fluency, checking pronunciation, and analyzing sentiment.
                                </Text>
                            </VStack>
                        )}

                        {state === "results" && analysisResult && (
                            <VStack spacing={8} align="stretch">
                                <HStack justify="space-between" align="center">
                                    <Heading size="lg">Assessment Results</Heading>
                                    <Badge colorScheme="green" fontSize="md" p={2} rounded="md">
                                        {analysisResult.overall_score >= 80 ? "Excellent" : analysisResult.overall_score >= 60 ? "Good" : "Needs Improvement"}
                                    </Badge>
                                </HStack>

                                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                                    <Box p={4} bg="whiteAlpha.500" rounded="xl" border="1px" borderColor="whiteAlpha.300">
                                        <Text color="gray.500" fontSize="sm">Overall Score</Text>
                                        <Heading size="xl" color="blue.500">{analysisResult.overall_score}/100</Heading>
                                    </Box>
                                    <Box p={4} bg="whiteAlpha.500" rounded="xl" border="1px" borderColor="whiteAlpha.300">
                                        <Text color="gray.500" fontSize="sm">WPM (Pace)</Text>
                                        <Heading size="xl" color="green.500">{analysisResult.breakdown.wpm}</Heading>
                                    </Box>
                                    <Box p={4} bg="whiteAlpha.500" rounded="xl" border="1px" borderColor="whiteAlpha.300">
                                        <Text color="gray.500" fontSize="sm">Eye Contact</Text>
                                        <Heading size="xl" color="purple.500">{analysisResult.breakdown.eye_contact}%</Heading>
                                    </Box>
                                </SimpleGrid>

                                <VStack align="start" spacing={3} bg="blue.50" p={6} rounded="xl">
                                    <Heading size="sm" color="blue.700">AI Feedback</Heading>
                                    <Text color="gray.700">
                                        {analysisResult.feedback}
                                    </Text>
                                    <Text fontSize="sm" color="gray.500">
                                        Filler Words Used: {analysisResult.breakdown.fillers}
                                    </Text>
                                </VStack>

                                <HStack justify="center" pt={4}>
                                    <Button onClick={resetAssessment} variant="ghost">
                                        Try Again
                                    </Button>
                                    <Button colorScheme="blue" onClick={() => window.location.href = '/dashboard'}>
                                        Go to Dashboard
                                    </Button>
                                </HStack>
                            </VStack>
                        )}
                    </GlassmorphicCard>
                </VStack>
            </Container>
        </AuroraBackground>
    );
}
