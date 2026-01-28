import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dumbbell,
    Search,
    Filter,
    Lock,
    Play,
    CheckCircle2,
    Zap,
    Star,
    Plus,
    TrendingUp,
    Timer,
    Target,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { cn } from "../lib/utils";
import { useTier } from "../lib/TierContext";
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";
import { FullAssessmentCard } from "../components/assessment/FullAssessmentCard";
import { Navbar } from "../components/navigation/Navbar";
import { getRecommendations, Recommendation, SpeechProfile } from '../services/api';
import { supabase } from '../lib/supabase';
import { useToast, Spinner, Box, Heading, Text, VStack, HStack, Badge, Progress, SimpleGrid } from '@chakra-ui/react';

export function ExercisesPage({ username = "Alex" }: { username?: string }) {
    const { tier } = useTier();
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<SpeechProfile | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const toast = useToast();

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const data = await getRecommendations(user.id);
                setProfile(data.profile);
                setRecommendations(data.recommendations);
            } catch (err) {
                console.error("Failed to load recommendations:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const staticExercises = [
        { id: 's1', title: "TH Sound Basics", category: "pronunciation", difficulty: "Beginner", duration: "5 min", locked: false },
        { id: 's2', title: "Breathing Techniques", category: "fluency", difficulty: "Beginner", duration: "10 min", locked: false },
        { id: 's3', title: "Simple Word Practice", category: "vocabulary", difficulty: "Beginner", duration: "5 min", locked: false },
    ];

    if (loading) return (
        <DashboardBackground>
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="xl" color="blue.400" thickness="4px" />
            </div>
        </DashboardBackground>
    );

    return (
        <DashboardBackground>
            <div className="flex flex-col min-h-screen">
                <Navbar username={username} />
                <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">

                    {/* Adaptive Header Section */}
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/50">
                                        <Dumbbell className="w-5 h-5 text-white" />
                                    </div>
                                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">
                                        {profile ? "Your Practice Plan" : "Exercise Library"}
                                    </h1>
                                </div>
                                <p className="text-white/40 font-medium ml-12">
                                    {profile
                                        ? `Adaptive plan based on your ${profile.learning_pace} learning pace`
                                        : "Targeted training for peak communication performance"}
                                </p>
                            </div>

                            {profile && (
                                <HStack spacing={4} bg="whiteAlpha.50" p={2} rounded="2xl" border="1px solid" borderColor="whiteAlpha.100">
                                    <VStack align="start" spacing={0} px={2}>
                                        <Text fontSize="10px" fontWeight="black" color="whiteAlpha.400" textTransform="uppercase">Current Level</Text>
                                        <Text fontSize="sm" fontWeight="black" color="blue.400">B2 - UPPER INTERMEDIATE</Text>
                                    </VStack>
                                    <Box h="30px" w="1px" bg="whiteAlpha.200" />
                                    <VStack align="start" spacing={0} px={2}>
                                        <Text fontSize="10px" fontWeight="black" color="whiteAlpha.400" textTransform="uppercase">Recommended</Text>
                                        <Text fontSize="sm" fontWeight="black" color="emerald.400">10 MINS / DAY</Text>
                                    </VStack>
                                </HStack>
                            )}
                        </div>

                        {/* Profile Summary & Progress */}
                        {profile && (
                            <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
                                <EnhancedCard className="lg:col-span-2 bg-gradient-to-br from-blue-600/10 to-transparent">
                                    <VStack align="stretch" spacing={6}>
                                        <HStack justify="space-between">
                                            <HStack spacing={3}>
                                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <Text fontWeight="black" color="white" fontSize="sm" textTransform="uppercase" letterSpacing="widest">Skill Performance</Text>
                                            </HStack>
                                            <Badge colorScheme="blue" variant="subtle" rounded="md">Weekly Update</Badge>
                                        </HStack>

                                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                                            {Object.entries(profile.current_scores).map(([metric, score]) => (
                                                <VStack key={metric} align="stretch" spacing={2}>
                                                    <HStack justify="space-between">
                                                        <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.600" textTransform="capitalize">{metric.replace('_score', '')}</Text>
                                                        <Text fontSize="xs" fontWeight="black" color="white">{score}%</Text>
                                                    </HStack>
                                                    <Progress value={score} size="xs" colorScheme={score > 70 ? "emerald" : score > 50 ? "blue" : "orange"} bg="whiteAlpha.100" rounded="full" />
                                                </VStack>
                                            ))}
                                        </SimpleGrid>
                                    </VStack>
                                </EnhancedCard>

                                <EnhancedCard className="bg-gradient-to-br from-purple-600/10 to-transparent flex flex-col justify-between">
                                    <VStack align="stretch" spacing={4}>
                                        <HStack spacing={3}>
                                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                                <Target className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <Text fontWeight="black" color="white" fontSize="sm" textTransform="uppercase" letterSpacing="widest">Focus Areas</Text>
                                        </HStack>
                                        <VStack align="start" spacing={2} pt={2}>
                                            <Badge colorScheme="purple" variant="solid" px={3} py={1} rounded="lg">{profile.weakness_priority_1}</Badge>
                                            <Badge colorScheme="purple" variant="subtle" px={3} py={1} rounded="lg">{profile.weakness_priority_2}</Badge>
                                            <Badge colorScheme="purple" variant="outline" px={3} py={1} rounded="lg">{profile.weakness_priority_3}</Badge>
                                        </VStack>
                                    </VStack>
                                    <Box pt={6}>
                                        <Text fontSize="10px" color="whiteAlpha.400" fontWeight="bold" fontStyle="italic">
                                            "You're improving fastest in Fluency. Keep it up!"
                                        </Text>
                                    </Box>
                                </EnhancedCard>
                            </SimpleGrid>
                        )}
                    </div>

                    {/* Personalized Recommendations */}
                    {recommendations.length > 0 && (
                        <div className="space-y-6">
                            <HStack spacing={3}>
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Recommended For You</h2>
                            </HStack>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {recommendations.map((rec, idx) => (
                                    <motion.div
                                        key={rec.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        whileHover={{ y: -5 }}
                                        className="relative group"
                                    >
                                        <EnhancedCard className={cn(
                                            "h-full border-t-4 transition-all duration-300",
                                            idx === 0 ? "border-t-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-t-blue-500"
                                        )}>
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-start">
                                                    <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", idx === 0 ? "bg-amber-500/20" : "bg-blue-500/20")}>
                                                        <Play className={cn("w-5 h-5", idx === 0 ? "text-amber-400" : "text-blue-400")} />
                                                    </div>
                                                    {idx === 0 && (
                                                        <Badge colorScheme="amber" variant="solid" rounded="md" fontSize="10px">START HERE</Badge>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-black text-white leading-tight">{rec.template.title}</h3>
                                                    <p className="text-xs text-white/40 font-medium">
                                                        {rec.personalization_context.why}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 pt-2">
                                                    <Badge colorScheme="whiteAlpha" variant="subtle" rounded="md" fontSize="9px" px={2}>{rec.template.skill_category}</Badge>
                                                    <Badge colorScheme="blue" variant="subtle" rounded="md" fontSize="9px" px={2}>{rec.template.difficulty_level}</Badge>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                    <HStack spacing={1}>
                                                        <Timer size={12} className="text-white/20" />
                                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{rec.template.estimated_duration_minutes}m</span>
                                                    </HStack>
                                                    <button className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors">Begin →</button>
                                                </div>
                                            </div>
                                        </EnhancedCard>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Standard Library */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Full Library</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {staticExercises.map(ex => (
                                <EnhancedCard key={ex.id} className="opacity-60 hover:opacity-100 transition-opacity">
                                    <HStack justify="space-between">
                                        <VStack align="start" spacing={1}>
                                            <Text fontSize="sm" fontWeight="black" color="white">{ex.title}</Text>
                                            <Text fontSize="10px" color="whiteAlpha.400">{ex.category} • {ex.difficulty}</Text>
                                        </VStack>
                                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                            <Play size={16} className="text-white/40" />
                                        </button>
                                    </HStack>
                                </EnhancedCard>
                            ))}
                        </div>
                    </div>

                    {/* Featured Section (Always visible for assessment) */}
                    {!profile && (
                        <div className="w-full">
                            <FullAssessmentCard />
                        </div>
                    )}

                </div>
            </div>
        </DashboardBackground>
    );
}
