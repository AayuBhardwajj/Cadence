import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, VStack, HStack, Button, Flex, Progress, IconButton, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { StopCircle, RefreshCw, UploadCloud, PlayCircle, PauseCircle } from 'lucide-react';

interface RecordingInterfaceProps {
    onRecordingComplete: (blob: Blob) => void;
    onCancel: () => void;
    userName?: string;
    topicId?: string;
}

export const RecordingInterface: React.FC<RecordingInterfaceProps> = ({
    onRecordingComplete,
    onCancel,
    userName = "User",
    topicId = "custom"
}) => {
    const isFullAssessment = topicId !== 'default'; // Assume 'default' is the old paragraph mode
    const MAX_TIME = isFullAssessment ? 300 : 60;
    const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'completed' | 'paused'>('idle');
    const [timeLeft, setTimeLeft] = useState(MAX_TIME);
    const [countdown, setCountdown] = useState(3);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    // Initial Setup
    useEffect(() => {
        let activeStream: MediaStream | null = null;
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                activeStream = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            }).catch(console.error);

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Countdown Logic
    useEffect(() => {
        if (recordingState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                startRecording();
            }
        }
    }, [recordingState, countdown]);

    // Timer Logic
    useEffect(() => {
        if (recordingState === 'recording' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && recordingState === 'recording') {
            stopRecording();
        }
    }, [recordingState, timeLeft]);

    const startRecording = async () => {
        setTimeLeft(60);
        setRecordingState('recording');
        const stream = videoRef.current?.srcObject as MediaStream;
        if (!stream) return;

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        chunksRef.current = [];
        recorder.ondataavailable = e => chunksRef.current.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setRecordedBlob(blob);
            setRecordingState('completed');
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleStartClick = () => {
        setRecordingState('countdown');
    };

    const handleSubmit = () => {
        if (recordedBlob) onRecordingComplete(recordedBlob);
    };

    const topicData: Record<string, { prompt: string, text: string, twister: string }> = {
        'workplace': {
            prompt: 'Describe your ideal workplace and what makes it productive for you. Talk about the physical environment, culture, and tools.',
            text: `My ideal workplace is one that fosters collaboration while respecting the need for focused, uninterrupted work. A comfortable environment, equipped with ergonomic furniture and natural lighting, significantly contributes to overall productivity and well-being. Open communication channels and supportive leadership are essential for a thriving team culture.`,
            twister: `A proper copper coffee pot is placed properly in the peaceful productivity pod.`
        },
        'tech': {
            prompt: 'How has technology changed the way we communicate in daily life? Discuss both positive and negative impacts.',
            text: `Technology has revolutionized daily communication, making it instantaneous and globally accessible. While smartphones and social networks keep us connected across vast distances, they also introduce challenges like digital fatigue and reduced face-to-face interactions. Balancing screen time with genuine in-person connections is a modern necessity.`,
            twister: `Seventy-seven benevolent elephants sent digital telegrams through the telecommunication tether.`
        },
        'social': {
            prompt: 'Discuss the impact of social media on modern relationships. How has it changed how we make and maintain connections?',
            text: `Social media profoundly impacts modern relationships by altering how we form and maintain connections. It allows us to easily stay in touch with distant friends and family, yet it can also create unrealistic expectations through curated portrayals of life. Navigating this digital landscape requires intentionality and a focus on authentic interactions.`,
            twister: `She sells social media strategies by the seamlessly scrolling silver screen.`
        },
        'language': {
            prompt: 'The importance of learning multiple languages in a globalized world. Why should someone learn a new language today?',
            text: `In our increasingly interconnected world, learning multiple languages is an invaluable asset. Bilingualism not only enhances cognitive abilities and cultural empathy but also opens doors to diverse career opportunities and global networking. It bridges cultural divides, fostering mutual understanding and collaboration across international borders.`,
            twister: `Lively language learners literally love learning lovely linguistic lessons locally.`
        },
        'custom': {
            prompt: 'Please speak on a topic of your choice. You may describe a recent experience, a book you read, or a project you are working on.',
            text: `Communication is the bridge between confusion and clarity. When we take the time to articulate our thoughts precisely and listen actively to others, we build stronger relationships and solve complex problems more effectively. Every conversation is an opportunity to learn something new and connect on a deeper level.`,
            twister: `Unique New York, you know you need unique New York correctly communicated.`
        }
    };

    const currentTopic = topicData[topicId] || topicData['custom'];

    // For standard reading (not full assessment)
    const paragraph = `My name is ${userName}. Communication skills are very important in the modern workplace. When we work with others, we need to express our thoughts clearly and listen carefully. The weather today feels wonderful with warmth and sunshine. I believe regular practice, along with the right techniques, can help anyone improve their speaking abilities. Whether you're preparing for an interview, presentation, or simply want to feel more confident, dedication and consistency make all the difference. Remember, every small step forward brings you closer to your goals.`;

    return (
        <Flex
            position="fixed" top={0} left={0} w="full" h="100vh"
            bg="#050a1f"
            color="white"
            align="center" justify="center"
            zIndex={20}
        >
            {/* Countdown Overlay */}
            {recordingState === 'countdown' && (
                <Box position="absolute" inset={0} bg="blackAlpha.800" zIndex={30} display="flex" alignItems="center" justifyContent="center">
                    <motion.div
                        key={countdown}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                    >
                        <Text fontSize="9xl" fontWeight="bold" color="white">{countdown}</Text>
                    </motion.div>
                </Box>
            )}

            <HStack w="95%" maxW="1400px" h="90%" spacing={8}>

                {/* Left Panel: Video Feed */}
                <VStack w="35%" h="full" spacing={6}>
                    <Box
                        w="full" flex={1}
                        bg="black" rounded="2xl" overflow="hidden"
                        border="3px solid"
                        borderColor={recordingState === 'recording' ? "red.500" : (recordingState === 'completed' ? "green.500" : "gray.700")}
                        boxShadow="0 20px 60px rgba(0,0,0,0.6)"
                        position="relative"
                    >
                        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                        {recordingState === 'recording' && (
                            <HStack position="absolute" top={4} right={4} bg="blackAlpha.600" p={2} rounded="full">
                                <Box w="10px" h="10px" bg="red.500" rounded="full" animation="pulse 1s infinite" />
                                <Text fontSize="xs" fontWeight="bold" color="red.200">REC</Text>
                            </HStack>
                        )}
                    </Box>

                    {/* Controls */}
                    <Box w="full" h="100px" display="flex" alignItems="center" justifyContent="center">
                        {recordingState === 'idle' && (
                            <Button size="lg" h="70px" w="full" colorScheme="teal" rounded="full" fontSize="xl" onClick={handleStartClick}>
                                START READING NOW
                            </Button>
                        )}
                        {recordingState === 'recording' && (
                            <VStack>
                                <Text fontSize="4xl" fontFamily="monospace" fontWeight="bold" color={timeLeft < 10 ? "red.400" : "white"}>
                                    {timeLeft === 0 ? "00:00" : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                                </Text>
                                <Button colorScheme="red" leftIcon={<StopCircle />} onClick={stopRecording} rounded="full" px={8}>
                                    Finish Recording
                                </Button>
                                <Text fontSize="xs" color="whiteAlpha.400">Aim for at least 2:00 for a better score</Text>
                            </VStack>
                        )}
                        {recordingState === 'completed' && (
                            <HStack spacing={4}>
                                <Button variant="outline" leftIcon={<RefreshCw />} onClick={() => setRecordingState('idle')}>Retry</Button>
                                <Button colorScheme="blue" size="lg" leftIcon={<UploadCloud />} onClick={handleSubmit}>
                                    Analyze My Speech
                                </Button>
                            </HStack>
                        )}
                    </Box>
                </VStack>

                {/* Right Panel: Reading */}
                <Box
                    w="65%" h="full"
                    bg="rgba(255, 255, 255, 0.03)"
                    backdropFilter="blur(15px)"
                    border="1px solid rgba(255, 255, 255, 0.08)"
                    rounded="2xl" p={10}
                    position="relative"
                    display="flex"
                    flexDirection="column"
                >
                    {!isFullAssessment ? (
                        <>
                            <Text fontSize="sm" textTransform="uppercase" letterSpacing="widest" opacity={0.7} mb={6}>
                                Read the following paragraph aloud
                            </Text>
                            <Box
                                p={8} bg="whiteAlpha.50" rounded="2xl" border="1px dashed" borderColor="whiteAlpha.200"
                                flex={1} display="flex" alignItems="center" justifyContent="center"
                            >
                                <Text fontSize="3xl" lineHeight="1.8" fontFamily="sans-serif" textAlign="center" fontWeight="bold">
                                    {paragraph}
                                </Text>
                            </Box>
                        </>
                    ) : (
                        <Tabs variant="soft-rounded" colorScheme="blue" flex={1} display="flex" flexDirection="column">
                            <TabList mb={4}>
                                <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'blue.600' }}>Topic Prompt</Tab>
                                <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'blue.600' }}>Reading Passage</Tab>
                                <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'blue.600' }}>Tongue Twisters</Tab>
                            </TabList>
                            <TabPanels flex={1}>
                                <TabPanel h="full" p={0}>
                                    <Box p={8} bg="whiteAlpha.50" rounded="2xl" border="1px dashed" borderColor="whiteAlpha.200" h="full" display="flex" alignItems="center" justifyContent="center">
                                        <Text fontSize="4xl" lineHeight="1.8" fontFamily="sans-serif" textAlign="center" fontWeight="bold">
                                            {currentTopic.prompt}
                                        </Text>
                                    </Box>
                                </TabPanel>
                                <TabPanel h="full" p={0}>
                                    <Box p={8} bg="whiteAlpha.50" rounded="2xl" border="1px dashed" borderColor="whiteAlpha.200" h="full" display="flex" alignItems="center" justifyContent="center">
                                        <Text fontSize="3xl" lineHeight="1.8" fontFamily="sans-serif" textAlign="center">
                                            {currentTopic.text}
                                        </Text>
                                    </Box>
                                </TabPanel>
                                <TabPanel h="full" p={0}>
                                    <Box p={8} bg="whiteAlpha.50" rounded="2xl" border="1px dashed" borderColor="whiteAlpha.200" h="full" display="flex" flexDir="column" alignItems="center" justifyContent="center">
                                        <Text fontSize="sm" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="widest" mb={8}>
                                            Warm up your articulation
                                        </Text>
                                        <Text fontSize="4xl" lineHeight="1.8" fontFamily="serif" textAlign="center" fontStyle="italic" color="blue.200" fontWeight="bold">
                                            "{currentTopic.twister}"
                                        </Text>
                                    </Box>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    )}

                    {/* Hints */}
                    {isFullAssessment && (
                        <VStack mt={6} align="start" spacing={4} color="whiteAlpha.500">
                            <Text fontSize="xs" fontWeight="bold">TIPS FOR A HIGH SCORE:</Text>
                            <HStack spacing={6}>
                                <Text fontSize="xs">• Speak continuously and clearly</Text>
                                <Text fontSize="xs">• Use the tabs above if you run out of things to say</Text>
                                <Text fontSize="xs">• Maintain a steady pace</Text>
                            </HStack>
                        </VStack>
                    )}

                    {/* Progress Bar */}
                    <Box mt={10}>
                        <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm">Session Progress</Text>
                            <Text fontSize="sm">{Math.floor((MAX_TIME - timeLeft) / 60)}:{(MAX_TIME - timeLeft) % 60}</Text>
                        </HStack>
                        <Progress value={(MAX_TIME - timeLeft) / MAX_TIME * 100} size="sm" colorScheme="blue" rounded="full" />
                    </Box>
                </Box>
            </HStack>
        </Flex>
    );
};
