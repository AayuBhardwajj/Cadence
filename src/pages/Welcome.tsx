import { Box, Flex, Heading, Text, VStack, Icon, HStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FloatingOrb, GlassCard, PulseGlow } from "../components/animations/FloatingElements";
import { Button } from "@chakra-ui/react";

// Icons
const MicIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
);

const SpeechIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
);

const BrainIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
);

const MotionButton = motion(Button);

export const Welcome = () => {
    const navigate = useNavigate();
    // Change navigation to Pre-Recording setup
    const startAssessment = () => navigate("/pre-recording");

    return (
        <Flex
            minH="100vh"
            bgGradient="linear(to-b, #1a0b2e, #4a148c)"
            align="center"
            justify="center"
            position="relative"
            overflow="hidden"
        >
            {/* Background Ambience */}
            <Box position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
                {/* Floating Ambient Particles (Simulated with Orbs) */}
                <FloatingOrb
                    position="absolute"
                    top="10%"
                    left="5%"
                    width="100px"
                    height="100px"
                    borderRadius="full"
                    bg="rgba(255, 255, 255, 0.05)"
                    filter="blur(40px)"
                    duration={8}
                />
                <FloatingOrb
                    position="absolute"
                    bottom="20%"
                    right="10%"
                    width="200px"
                    height="200px"
                    borderRadius="full"
                    bg="rgba(100, 200, 255, 0.05)"
                    filter="blur(50px)"
                    duration={12}
                    delay={2}
                />
            </Box>

            {/* Main Content Card */}
            <GlassCard
                p={{ base: 8, md: 12 }}
                maxW="2xl"
                w="90%"
                textAlign="center"
                position="relative"
                zIndex={10}
            >
                <VStack spacing={8}>
                    {/* Header */}
                    <VStack spacing={2}>
                        <FloatingOrb yRange={5} duration={3}>
                            <Heading
                                size="2xl"
                                color="white"
                                textShadow="0 0 20px rgba(255,255,255,0.4)"
                                letterSpacing="wide"
                            >
                                Welcome to Fluently
                            </Heading>
                        </FloatingOrb>
                        <Text color="whiteAlpha.800" fontSize="xl">
                            Let's discover your unique speaking style
                        </Text>
                    </VStack>

                    {/* Floating Feature Badges */}
                    <HStack spacing={{ base: 4, md: 10 }} justify="center" py={6} flexWrap="wrap">
                        <VStack>
                            <FloatingOrb
                                bg="linear-gradient(135deg, #FF0080 0%, #7928CA 100%)"
                                p={4}
                                borderRadius="full"
                                boxShadow="0 0 20px rgba(255,0,128,0.4)"
                                xRange={5}
                                yRange={10}
                            >
                                <Icon as={MicIcon} w={8} h={8} color="white" />
                            </FloatingOrb>
                            <Text color="white" fontSize="sm" fontWeight="bold">Fluency</Text>
                        </VStack>

                        <VStack mt={-4}> {/* Staggered height */}
                            <FloatingOrb
                                bg="linear-gradient(135deg, #007CF0 0%, #00DFD8 100%)"
                                p={4}
                                borderRadius="full"
                                boxShadow="0 0 20px rgba(0,223,216,0.4)"
                                duration={5}
                                yRange={15}
                            >
                                <Icon as={SpeechIcon} w={8} h={8} color="white" />
                            </FloatingOrb>
                            <Text color="white" fontSize="sm" fontWeight="bold">Pronunciation</Text>
                        </VStack>

                        <VStack>
                            <FloatingOrb
                                bg="linear-gradient(135deg, #7928CA 0%, #FF0080 100%)" // Reversed gradient
                                p={4}
                                borderRadius="full"
                                boxShadow="0 0 20px rgba(121,40,202,0.4)"
                                duration={4.5}
                                delay={1}
                            >
                                <Icon as={BrainIcon} w={8} h={8} color="white" />
                            </FloatingOrb>
                            <Text color="white" fontSize="sm" fontWeight="bold">Word Retrieval</Text>
                        </VStack>
                    </HStack>

                    {/* Call to Action */}
                    <Box>
                        <Text color="whiteAlpha.700" fontSize="md" mb={6}>
                            We'll analyze your speech in just 5 minutes
                        </Text>

                        <PulseGlow>
                            <MotionButton
                                size="lg"
                                height="60px"
                                px={12}
                                fontSize="xl"
                                bgGradient="linear(to-r, cyan.400, blue.500)"
                                color="white"
                                borderRadius="full"
                                _hover={{
                                    bgGradient: "linear(to-r, cyan.300, blue.400)",
                                    transform: "translateY(-4px) scale(1.05)",
                                    boxShadow: "0 10px 30px rgba(0, 200, 255, 0.4)",
                                }}
                                _active={{ transform: "scale(0.98)" }}
                                onClick={startAssessment}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Start My Assessment
                            </MotionButton>
                        </PulseGlow>

                        <Text
                            mt={4}
                            fontSize="xs"
                            color="whiteAlpha.500"
                            letterSpacing="widest"
                            textTransform="uppercase"
                        >
                            Private & Encrypted • No Pressure
                        </Text>
                    </Box>
                </VStack>
            </GlassCard>
        </Flex>
    );
};
