import React, { useEffect, useState } from 'react';
import { Box, Text, VStack, HStack, Flex } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessingScreenProps {
    onComplete: () => void;
}

const steps = [
    "Analyzing pronunciation patterns...",
    "Detecting accent characteristics...",
    "Measuring speech fluency...",
    "Identifying problem sounds...",
    "Comparing with native speakers...",
    "Generating personalized recommendations...",
    "Finalizing your report..."
];

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= steps.length - 1) {
                    clearInterval(interval);
                    setTimeout(onComplete, 1000); // Finish after last step
                    return prev;
                }
                return prev + 1;
            });
        }, 2000); // 2 seconds per step

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <Flex
            position="fixed" top={0} left={0} w="full" h="100vh"
            bgGradient="radial(circle at center, #1a202c 0%, #000000 100%)"
            align="center" justify="center" zIndex={20}
            overflow="hidden"
            direction="column"
        >
            {/* Visual Center - Orbital System */}
            <Box position="relative" w="300px" h="300px" display="flex" alignItems="center" justifyContent="center">
                {/* Core */}
                <Box
                    position="absolute"
                    w="80px" h="80px"
                    bgGradient="radial(white, blue.500)"
                    rounded="full"
                    boxShadow="0 0 50px rgba(66, 153, 225, 0.6)"
                    animation="pulse 2s infinite"
                />

                {/* Orbit 1 */}
                <motion.div
                    style={{ position: 'absolute', width: '200px', height: '200px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '50%' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                    <Box w="20px" h="20px" bg="blue.400" rounded="full" position="absolute" top="-10px" left="50%" boxShadow="0 0 20px blue" />
                </motion.div>

                {/* Orbit 2 */}
                <motion.div
                    style={{ position: 'absolute', width: '280px', height: '280px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '50%' }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                    <Box w="15px" h="15px" bg="purple.400" rounded="full" position="absolute" bottom="-7px" left="50%" boxShadow="0 0 20px purple" />
                </motion.div>
            </Box>

            {/* Messages */}
            <VStack mt={12} spacing={4}>
                <Text fontSize="xl" fontWeight="bold" color="white">
                    AI Analysis in Progress
                </Text>
                <Box h="30px" overflow="hidden" position="relative">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Text color="blue.200" fontSize="lg">
                                {steps[currentStep]}
                            </Text>
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </VStack>

            {/* Loading Bar */}
            <Box w="60%" maxW="600px" h="4px" bg="gray.800" mt={10} rounded="full" overflow="hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: steps.length * 2, ease: "linear" }}
                    style={{ height: "100%", background: "linear-gradient(90deg, #00d4aa, #3b82f6)" }}
                />
            </Box>
        </Flex>
    );
};
