import { Box, Flex, Heading, Text, VStack, Icon, HStack, Spinner, Grid, GridItem } from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingOrb, GlassCard, PulseGlow } from "../components/animations/FloatingElements";
import { Button } from "@chakra-ui/react";
import { motion } from "framer-motion";

// Icons for Checklist
const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="#48BB78" width="24px" height="24px">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
);
const CameraIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
); // Using user icon as placeholder for camera self-view

const MicIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
);

const MotionBox = motion(Box);

export const PreRecording = () => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [permissions, setPermissions] = useState({
        camera: false,
        mic: false,
    });
    const [checks, setChecks] = useState({
        lighting: "checking", // checking, good, bad
        noise: "checking", // checking, good, bad
    });

    const requestPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setPermissions({ camera: true, mic: true });

            // Simulate environment checks
            setTimeout(() => setChecks(prev => ({ ...prev, lighting: "good" })), 1500);
            setTimeout(() => setChecks(prev => ({ ...prev, noise: "good" })), 2500);

        } catch (err) {
            console.error("Error accessing media devices:", err);
            // Handle error state appropriately in real app
        }
    };

    useEffect(() => {
        requestPermissions();
        return () => {
            // Cleanup stream on unmount
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const allReady = permissions.camera && permissions.mic && checks.lighting === "good" && checks.noise === "good";

    return (
        <Flex
            minH="100vh"
            bg="gray.900"
            bgGradient="radial(circle at top right, #2c003e, #000)"
            align="center"
            justify="center"
            position="relative"
            overflow="hidden"
            p={4}
        >
            {/* Holographic Grid Background (Simple CSS implementation) */}
            <Box
                position="absolute"
                top={0} left={0} right={0} bottom={0}
                opacity={0.15}
                backgroundImage="linear-gradient(#4a148c 1px, transparent 1px), linear-gradient(90deg, #4a148c 1px, transparent 1px)"
                backgroundSize="40px 40px"
                pointerEvents="none"
            />

            <GlassCard w="100%" maxW="6xl" height="80vh" display="flex" flexDirection="column" p={0} overflow="hidden">
                <Grid templateColumns={{ base: "1fr", md: "1fr 350px" }} height="100%">
                    {/* Left: Video Preview Area */}
                    <GridItem position="relative" bg="black" display="flex" alignItems="center" justifyContent="center">
                        <Box position="relative" width="100%" height="100%">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                            />

                            {/* Face Mesh Overlay (Visual Fluff) */}
                            {permissions.camera && (
                                <Box
                                    position="absolute" top="0" left="0" right="0" bottom="0"
                                    border="2px solid rgba(0, 255, 128, 0.3)"
                                    boxShadow="inset 0 0 50px rgba(0, 255, 128, 0.2)"
                                    pointerEvents="none"
                                />
                            )}

                            {!permissions.camera && (
                                <Flex direction="column" align="center" justify="center" height="100%" color="whiteAlpha.600">
                                    <Spinner size="xl" mb={4} />
                                    <Text>Accessing Camera...</Text>
                                </Flex>
                            )}
                        </Box>
                    </GridItem>

                    {/* Right: Checklist & Controls */}
                    <GridItem bg="rgba(0,0,0,0.3)" p={8} display="flex" flexDirection="column" justifyContent="center">
                        <VStack align="stretch" spacing={6}>
                            <Heading size="md" color="white" mb={2}>Setup Checklist</Heading>

                            <ChecklistItem
                                label="Camera Access"
                                status={permissions.camera ? "done" : "loading"}
                                icon={<Icon as={CameraIcon} />}
                            />
                            <ChecklistItem
                                label="Microphone Ready"
                                status={permissions.mic ? "done" : "loading"}
                                icon={<Icon as={MicIcon} />}
                            />
                            <ChecklistItem
                                label="Lighting Check"
                                status={checks.lighting === "good" ? "done" : checks.lighting === "checking" ? "loading" : "error"}
                                subText="Ensure your face is clearly visible"
                            />
                            <ChecklistItem
                                label="Noise Check"
                                status={checks.noise === "good" ? "done" : checks.noise === "checking" ? "loading" : "error"}
                                subText="Find a quiet environment"
                            />

                            <Box pt={8}>
                                <PulseGlow>
                                    <Button
                                        size="lg"
                                        w="full"
                                        colorScheme="green"
                                        bgGradient={allReady ? "linear(to-r, green.400, teal.500)" : "linear(to-r, gray.600, gray.700)"}
                                        isDisabled={!allReady}
                                        _hover={allReady ? {
                                            transform: "translateY(-2px)",
                                            boxShadow: "0 5px 15px rgba(72, 187, 120, 0.4)"
                                        } : {}}
                                        onClick={() => navigate("/assessment")}
                                    >
                                        {allReady ? "I'm Ready - Start Assessment" : "Checking System..."}
                                    </Button>
                                </PulseGlow>
                            </Box>
                        </VStack>
                    </GridItem>
                </Grid>
            </GlassCard>
        </Flex>
    );
};

const ChecklistItem = ({ label, status, subText, icon }: { label: string, status: string, subText?: string, icon?: React.ReactNode }) => {
    return (
        <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            p={3}
            bg={status === "done" ? "rgba(72, 187, 120, 0.1)" : "rgba(255,255,255,0.05)"}
            borderRadius="lg"
            borderLeft="4px solid"
            borderColor={status === "done" ? "green.400" : status === "error" ? "red.400" : "blue.400"}
        >
            <HStack justify="space-between">
                <HStack>
                    {icon && <Box color={status === "done" ? "green.400" : "whiteAlpha.700"}>{icon}</Box>}
                    <VStack align="start" spacing={0}>
                        <Text color="white" fontWeight="medium">{label}</Text>
                        {subText && <Text fontSize="xs" color="whiteAlpha.600">{subText}</Text>}
                    </VStack>
                </HStack>
                {status === "done" && <Icon as={CheckIcon} />}
                {status === "loading" && <Spinner size="sm" color="blue.400" />}
            </HStack>
        </MotionBox>
    )
}
