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
    const toast = useToast();
    const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        const fetchEligibility = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const res = await checkEligibility(user.id);
                setEligibility(res);

                if (!res.can_assess && res.next_available_at) {
                    updateCountdown(res.next_available_at);
                }
            } catch (err) {
                console.error("Eligibility check failed:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEligibility();
    }, []);

    const updateCountdown = (nextAt: string) => {
        const target = new Date(nextAt).getTime();
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                clearInterval(interval);
                setTimeRemaining('');
                setEligibility(prev => prev ? { ...prev, can_assess: true } : null);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeRemaining(`${h}h ${m}m ${s}s`);
        }, 1000);

        return () => clearInterval(interval);
    };

    const handleStart = () => {
        if (!eligibility?.can_assess) {
            toast({
                title: "Assessment on Cooldown",
                description: `Next available in ${timeRemaining}`,
                status: "info",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        navigate('/assessment');
    };

    if (loading) return (
        <EnhancedCard className="h-[280px] flex items-center justify-center border-blue-500/20 bg-slate-900/40">
            <Spinner color="blue.400" size="xl" thickness="4px" />
        </EnhancedCard>
    );

    const canAssess = eligibility?.can_assess;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative"
        >
            <EnhancedCard className={cn(
                "relative overflow-hidden group min-h-[280px] p-8",
                canAssess
                    ? "bg-gradient-to-br from-blue-600/20 via-slate-900/40 to-transparent border-blue-500/30"
                    : "bg-slate-900/40 border-white/5 opacity-80"
            )}>
                {/* Background Sparkles */}
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Sparkles className="w-24 h-24 text-blue-400" />
                </div>

                <VStack align="stretch" spacing={6} h="full">
                    <HStack justify="space-between" align="start">
                        <VStack align="start" spacing={1}>
                            <HStack>
                                <Badge colorScheme="blue" variant="solid" px={3} py={1} rounded="lg" fontSize="xs" fontWeight="black">
                                    FEATURED
                                </Badge>
                                {!canAssess && (
                                    <Badge colorScheme="orange" variant="subtle" px={3} py={1} rounded="lg" fontSize="xs" fontWeight="black" display="flex" alignItems="center" gap={1}>
                                        <Clock size={12} /> COOLDOWN
                                    </Badge>
                                )}
                            </HStack>
                            <Heading size="lg" color="white" fontWeight="black" letterSpacing="tight" mt={2}>
                                FULL ASSESSMENT
                            </Heading>
                        </VStack>
                        <Box p={4} bg={canAssess ? "blue.500/20" : "whiteAlpha.100"} rounded="2xl" color={canAssess ? "blue.400" : "whiteAlpha.400"}>
                            <Mic size={32} />
                        </Box>
                    </HStack>

                    <Text color="whiteAlpha.600" fontSize="sm" maxW="lg">
                        Test your speaking across 6 core metrics including fluency, grammar, and pronunciation in a comprehensive 5-minute session.
                    </Text>

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

                    <Box pt={4}>
                        <Button
                            onClick={handleStart}
                            w="full"
                            h="60px"
                            variant={canAssess ? "solid" : "outline"}
                            colorScheme={canAssess ? "blue" : "whiteAlpha"}
                            isDisabled={!canAssess && !timeRemaining}
                            rounded="2xl"
                            fontSize="sm"
                            fontWeight="black"
                            textTransform="uppercase"
                            letterSpacing="widest"
                            rightIcon={canAssess ? <ArrowRight size={18} /> : <Lock size={18} />}
                            _hover={canAssess ? { transform: 'scale(1.02)', boxShadow: '0 0 20px rgba(66, 153, 225, 0.4)' } : {}}
                        >
                            {canAssess ? "Start Assessment" : `Available in ${timeRemaining || '...'}`}
                        </Button>
                    </Box>
                </VStack>
            </EnhancedCard>
        </motion.div>
    );
};
