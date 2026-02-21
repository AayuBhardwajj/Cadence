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

    const topicData: Record<string, { prompt: string, text: string }> = {
        'workplace': {
            prompt: `An ideal workplace is more than just a physical space. It reflects values like collaboration, respect, productivity, and innovation. Describe the environment, culture, leadership style, and tools that help you perform at your best.`,
            text: `An ideal workplace, in my opinion, is a balanced environment where productivity and personal well-being coexist harmoniously. It is not defined solely by infrastructure or salary, but by culture, communication, and clarity of purpose. A truly productive workplace fosters collaboration, creativity, and continuous learning.

First and foremost, I value a workplace that promotes mutual respect and psychological safety. Employees should feel comfortable expressing ideas, asking questions, and even making mistakes without fear of humiliation. As the saying goes, “A smooth sea never made a skilled sailor.” Growth requires experimentation, and experimentation sometimes includes failure.

Secondly, leadership plays a crucial role. A good leader listens actively, communicates transparently, and sets realistic expectations. Clear communication prevents confusion and conflict. After all, clear communication creates confident collaboration. In contrast, poor communication produces procrastination and frustration.

The physical environment also influences productivity. Natural lighting, organized workspaces, and minimal distractions enhance concentration. A cluttered desk can create a cluttered mind. I prefer structured systems where priorities are defined and deadlines are reasonable.

Technology integration is equally important. Efficient tools, fast systems, and secure platforms enable seamless workflow. However, excessive meetings and unnecessary notifications reduce deep focus. Productive professionals prioritize purposeful performance over pointless pressure.

Work-life balance cannot be ignored. Burnout diminishes creativity and motivation. Flexible schedules, remote options, and understanding management contribute to long-term sustainability.

Let me include a short articulation exercise:
“Busy brains build better businesses.”
“Professional people perform productive projects precisely.”
“Creative colleagues collaborate carefully and confidently.”

In conclusion, my ideal workplace is respectful, technologically equipped, growth-oriented, and emotionally intelligent. It supports ambition without sacrificing well-being. A productive workplace is not just where we work — it is where we evolve.`
        },
        'tech': {
            prompt: `Technology has transformed communication, relationships, education, and work. Discuss how digital tools influence daily interactions, both positively and negatively.`,
            text: `Technology has revolutionized the way we communicate in everyday life. From instant messaging to virtual meetings, digital platforms have eliminated geographical barriers. Communication that once required days now happens in seconds.

In earlier times, letters were handwritten and phone calls were scheduled. Today, we send texts, voice notes, and video messages effortlessly. While this convenience increases efficiency, it also raises concerns about attention span and emotional depth.

Social platforms encourage constant connectivity. Notifications, updates, and real-time responses create an environment of immediacy. However, constant connectivity can reduce concentration. Sometimes, silent reflection strengthens stronger social skills.

Technology also enhances professional communication. Emails, collaborative platforms, and cloud storage streamline productivity. Remote work has become possible because of reliable digital infrastructure. Virtual meetings save travel time and expand global opportunities.

Yet, technology has introduced challenges. Misinterpretation of tone in text messages often leads to misunderstanding. Overdependence on screens reduces face-to-face interactions. The phrase “digital distance diminishes direct dialogue” reflects this reality.

Consider this articulation practice:
“Swift software systems simplify sophisticated solutions.”
“Tiny technical tweaks transform total teamwork.”
“Smart screens silently shape society.”

On a positive note, technology supports education through online courses, digital libraries, and interactive learning. It democratizes knowledge and empowers individuals worldwide.

In conclusion, technology is neither entirely beneficial nor entirely harmful. Its impact depends on how responsibly we use it. Balanced usage, mindful communication, and digital discipline are essential for maintaining meaningful human connections.`
        },
        'social': {
            prompt: `Social media influences friendships, relationships, identity, and self-expression. Discuss its advantages, psychological impact, and long-term consequences.`,
            text: `Social media has dramatically reshaped modern relationships. Platforms designed for connection have become powerful tools for communication, branding, and influence. They allow people to share experiences instantly and interact across continents.

On the positive side, social media strengthens long-distance relationships. Friends and families remain connected through posts, calls, and shared memories. Communities form around common interests, creating belonging and support networks.

However, excessive usage can lead to comparison and insecurity. Highlight reels often replace reality. Constant scrolling stimulates short-term satisfaction but reduces sustained attention. The pursuit of validation sometimes replaces genuine interaction.

Algorithms influence perception. Content personalization shapes opinions and behaviors subtly. This raises concerns about misinformation and echo chambers. Responsible digital literacy is essential.

Healthy boundaries are necessary. Scheduled screen breaks improve mental clarity. Meaningful conversations require mindful presence.

Practice articulation with these lines:
“Social sites spread stories swiftly.”
“People post pictures portraying polished personalities.”
“Real relationships require real respect.”

In conclusion, social media is a powerful instrument. Used wisely, it connects and empowers. Used excessively, it distracts and distorts. The responsibility lies with the user to maintain balance and authenticity.`
        },
        'language': {
            prompt: `Learning multiple languages improves communication, cultural awareness, and career opportunities in a globalized world.`,
            text: `In today’s interconnected world, learning multiple languages is an invaluable skill. Language is not merely a communication tool; it is a gateway to culture, perspective, and opportunity.

Multilingual individuals demonstrate cognitive flexibility and enhanced problem-solving skills. Research suggests that switching between languages strengthens memory and concentration. It also improves listening skills and pronunciation awareness.

Language learning builds cultural empathy. When we understand another language, we understand humor, emotion, and nuance more deeply. It promotes global collaboration and reduces prejudice.

Professionally, multilingualism increases employability. Global companies value candidates who can communicate across borders. Negotiation, networking, and leadership become more effective with linguistic versatility.

However, mastering pronunciation requires consistent practice. Clarity, confidence, and cadence matter significantly in spoken language.

Try these articulation drills:
“Lively linguists learn languages logically.”
“Proper pronunciation prevents persistent problems.”
“Global growth grows gradually.”

In conclusion, language learning is an investment in personal and professional growth. It strengthens the brain, broadens the mind, and bridges borders. In a globalized era, multilingualism is not just an advantage — it is a powerful asset.`
        },
        'custom': {
            prompt: 'Please speak on a topic of your choice. You may describe a recent experience, a book you read, or a project you are working on.',
            text: `Communication is the bridge between confusion and clarity. When we take the time to articulate our thoughts precisely and listen actively to others, we build stronger relationships and solve complex problems more effectively. Every conversation is an opportunity to learn something new and connect on a deeper level.`
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
                                <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'blue.600' }}>Topic Overview</Tab>
                                <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'blue.600' }}>Reading Passage</Tab>
                            </TabList>
                            <TabPanels flex={1} overflowY="auto" overflowX="hidden">
                                <TabPanel h="full" p={0}>
                                    <Box p={8} bg="whiteAlpha.50" rounded="2xl" border="1px dashed" borderColor="whiteAlpha.200" minH="full" display="flex" alignItems="center" justifyContent="center">
                                        <Text fontSize="3xl" lineHeight="1.8" fontFamily="sans-serif" textAlign="center" fontWeight="bold">
                                            {currentTopic.prompt}
                                        </Text>
                                    </Box>
                                </TabPanel>
                                <TabPanel h="full" p={0}>
                                    <Box p={8} bg="whiteAlpha.50" rounded="2xl" border="1px dashed" borderColor="whiteAlpha.200" minH="full" display="flex" alignItems="center" justifyContent="center">
                                        <Text fontSize="2xl" lineHeight="1.8" fontFamily="sans-serif" textAlign="left" whiteSpace="pre-wrap">
                                            {currentTopic.text}
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
