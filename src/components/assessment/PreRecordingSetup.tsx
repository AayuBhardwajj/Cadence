import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, VStack, HStack, Button, Icon, SimpleGrid, Badge, useToast, Flex } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Mic, Sun, Volume2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const GlassPanel = motion(Box);
const FloatingCard = motion(HStack);

interface PreRecordingSetupProps {
    onReady: () => void;
}

export const PreRecordingSetup: React.FC<PreRecordingSetupProps> = ({ onReady }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [checks, setChecks] = useState({
        camera: 'pending', // pending, granted, denied
        mic: 'pending',
        lighting: 'pending', // pending, good, poor
        noise: 'pending', // pending, quiet, noisy
    });
    const [audioLevel, setAudioLevel] = useState(0);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setChecks(prev => ({ ...prev, camera: 'granted', mic: 'granted' }));

            // Audio Analysis
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(mediaStream);
            microphone.connect(analyser);
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkAudio = () => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                setAudioLevel(average);

                // Simple noise check (if average > 30 constantly it's noisy)
                if (average > 50) setChecks(prev => ({ ...prev, noise: 'noisy' }));
                else setChecks(prev => ({ ...prev, noise: 'quiet' }));

                requestAnimationFrame(checkAudio);
            };
            checkAudio();

            // Lighting Check (Periodic)
            setInterval(checkLighting, 1000);

        } catch (err) {
            console.error(err);
            setChecks(prev => ({ ...prev, camera: 'denied', mic: 'denied' }));
        }
    };

    const checkLighting = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0, 32, 32); // Small sample
        const imageData = ctx.getImageData(0, 0, 32, 32);
        let brightnessSum = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            brightnessSum += (r + g + b) / 3;
        }
        const avgBrightness = brightnessSum / (32 * 32);

        if (avgBrightness < 50) setChecks(prev => ({ ...prev, lighting: 'poor' })); // Dark
        else if (avgBrightness > 200) setChecks(prev => ({ ...prev, lighting: 'poor' })); // Too bright
        else setChecks(prev => ({ ...prev, lighting: 'good' }));
    };

    const isReady = Object.values(checks).every(c => c === 'granted' || c === 'good' || c === 'quiet');

    return (
        <Flex
            position="fixed" top={0} left={0} w="full" h="100vh"
            bgGradient="linear(to-b, #0a0e27, #1a0b2e)"
            align="center" justify="center" zIndex={20}
        >
            {/* Background Grid & Particles (Simplified) */}
            <Box position="absolute" inset={0} opacity={0.1}
                backgroundImage="radial-gradient(#ffffff 1px, transparent 1px)"
                backgroundSize="50px 50px"
            />

            <GlassPanel
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                w={{ base: "95%", md: "900px" }}
                h={{ base: "auto", md: "600px" }}
                borderRadius="3xl"
                bg="rgba(255, 255, 255, 0.05)"
                backdropFilter="blur(20px)"
                border="1px solid rgba(255, 255, 255, 0.1)"
                boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
                overflow="hidden"
                display="flex"
                flexDirection={{ base: "column", md: "row" }}
            >
                {/* Left Side: Camera Preview */}
                <Box w={{ base: "100%", md: "45%" }} p={6} position="relative" display="flex" flexDirection="column" justifyContent="center">
                    <Box
                        borderRadius="2xl" overflow="hidden"
                        border="2px solid" borderColor={checks.camera === 'granted' ? "teal.300" : "gray.600"}
                        boxShadow={checks.camera === 'granted' ? "0 0 20px rgba(100, 255, 218, 0.3)" : "none"}
                        position="relative"
                        h="300px" bg="black"
                    >
                        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.1) contrast(1.05)' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} width={32} height={32} />

                        {/* Mock Face Overlay (Simulated) */}
                        {checks.camera === 'granted' && (
                            <Box position="absolute" inset={0} pointerEvents="none" display="flex" alignItems="center" justifyContent="center">
                                <Box w="150px" h="200px" border="1px dashed rgba(0,255,100,0.3)" borderRadius="50%" opacity={0.5} />
                            </Box>
                        )}
                    </Box>
                    <Text textAlign="center" mt={4} color="green.300" fontSize="sm" fontWeight="bold" opacity={checks.camera === 'granted' ? 1 : 0}>
                        Face Detected ✅
                    </Text>
                </Box>

                {/* Right Side: Checklist */}
                <Box w={{ base: "100%", md: "55%" }} p={8} bg="rgba(0,0,0,0.2)">
                    <VStack align="stretch" spacing={6}>
                        <Box>
                            <Text fontSize="2xl" fontWeight="bold" color="white" mb={1}>
                                Let's Set Up Your Recording 🎥
                            </Text>
                            <Text fontSize="sm" color="whiteAlpha.700">
                                Ensure your environment is ready for the best results.
                            </Text>
                        </Box>

                        <VStack spacing={3} align="stretch">
                            {/* Check Cards */}
                            {[
                                { id: 'camera', icon: Video, label: 'Camera Access', status: checks.camera === 'granted' },
                                {
                                    id: 'mic', icon: Mic, label: 'Microphone Access', status: checks.mic === 'granted', extra: (
                                        <HStack spacing={1} h="4px" w="100px" mt={2}>
                                            {[...Array(5)].map((_, i) => (
                                                <Box key={i} flex={1} bg={audioLevel > i * 10 ? "green.400" : "whiteAlpha.200"} borderRadius="full" h="100%" />
                                            ))}
                                        </HStack>
                                    )
                                },
                                { id: 'light', icon: Sun, label: 'Lighting Quality', status: checks.lighting === 'good' },
                                { id: 'noise', icon: Volume2, label: 'Noise Level', status: checks.noise === 'quiet' },
                            ].map((item, i) => (
                                <FloatingCard
                                    key={item.id}
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 * i }}
                                    p={3} rounded="xl"
                                    bg={item.status ? "rgba(0, 255, 100, 0.1)" : "rgba(255, 255, 255, 0.05)"}
                                    border="1px solid" borderColor={item.status ? "green.500" : "whiteAlpha.200"}
                                    align="center"
                                >
                                    <Icon as={item.icon} color={item.status ? "green.300" : "gray.400"} boxSize={5} />
                                    <Box flex={1}>
                                        <Text fontSize="sm" fontWeight="bold" color="white">{item.label}</Text>
                                        {item.extra}
                                    </Box>
                                    {item.status ? <CheckCircle size={18} color="#4ade80" /> : <XCircle size={18} color="#f87171" />}
                                </FloatingCard>
                            ))}
                        </VStack>

                        <Button
                            size="lg"
                            w="full"
                            h="60px"
                            bgGradient="linear(to-r, teal.400, blue.500)"
                            _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
                            rounded="full"
                            fontSize="lg"
                            onClick={onReady}
                        // isDisabled={!isReady} // Optional: enforce checks
                        >
                            I'm Ready - Start Recording
                        </Button>
                    </VStack>
                </Box>
            </GlassPanel>
        </Flex>
    );
};
