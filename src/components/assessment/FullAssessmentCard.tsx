import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Heading, Text, Icon, Badge, Button, useToast, Spinner } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Mic, Timer, Sparkles, TrendingUp, ArrowRight, Lock, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkEligibility, EligibilityResponse } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { EnhancedCard } from '../dashboard/EnhancedCard';
import { cn } from '../../lib/utils';

export const FullAssessmentCard = () => {
    const navigate = useNavigate();

    const handleStart = () => {
        console.log("FullAssessmentCard: Navigating to /assessment...");
        navigate('/assessment');
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative cursor-pointer"
            onClick={handleStart}
        >
            <EnhancedCard className="relative overflow-hidden group min-h-[200px] p-8 bg-gradient-to-br from-blue-600/20 via-slate-900/40 to-transparent border-blue-500/30">
                {/* Background Sparkles */}
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Sparkles className="w-24 h-24 text-blue-400" />
                </div>

                <VStack align="stretch" spacing={6} h="full">
                    <HStack justify="space-between" align="start">
                        <VStack align="start" spacing={1}>
                            <Badge colorScheme="blue" variant="solid" px={3} py={1} rounded="lg" fontSize="xs" fontWeight="black">
                                FEATURED
                            </Badge>
                            <Heading size="lg" color="white" fontWeight="black" letterSpacing="tight" mt={2}>
                                FULL ASSESSMENT
                            </Heading>
                        </VStack>
                        <Box p={4} bg="blue.500/20" rounded="2xl" color="blue.400">
                            <Mic size={32} />
                        </Box>
                    </HStack>

                    <HStack justify="space-between" align="center">
                        <Text color="whiteAlpha.600" fontSize="sm" maxW="lg">
                            Comprehensive 5-minute speech analysis covering 6 core metrics and CEFR level estimation.
                        </Text>

                        <Button
                            variant="solid"
                            colorScheme="blue"
                            rounded="xl"
                            h="50px"
                            px={8}
                            fontSize="xs"
                            fontWeight="black"
                            textTransform="uppercase"
                            letterSpacing="widest"
                            rightIcon={<ArrowRight size={18} />}
                            display={{ base: "none", md: "flex" }}
                        >
                            Start Now
                        </Button>
                    </HStack>

                    <HStack spacing={6} pt={2}>
                        <HStack spacing={2} color="emerald.400">
                            <Icon as={Timer} w={4} h={4} />
                            <Text fontSize="xs" fontWeight="black" textTransform="uppercase" letterSpacing="widest">5 MINS</Text>
                        </HStack>
                        <HStack spacing={2} color="purple.400">
                            <Icon as={TrendingUp} w={4} h={4} />
                            <Text fontSize="xs" fontWeight="black" textTransform="uppercase" letterSpacing="widest">CEFR SCORING</Text>
                        </HStack>
                    </HStack>
                </VStack>
            </EnhancedCard>
        </motion.div>
    );
};
