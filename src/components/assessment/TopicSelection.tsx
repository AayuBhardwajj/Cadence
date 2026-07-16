import React from 'react';
import { Box, VStack, Heading, Text, SimpleGrid, Button, HStack, useColorModeValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const AVAILABLE_TOPICS = [
  { id: 'workplace', label: 'Workplace Communication', icon: '💼', description: 'Professional settings, meetings, presentations' },
  { id: 'technology', label: 'Technology', icon: '💻', description: 'Tech concepts, digital tools, innovation' },
  { id: 'social', label: 'Social Situations', icon: '🗣️', description: 'Everyday conversations, storytelling, opinions' },
  { id: 'academic', label: 'Academic English', icon: '📚', description: 'Formal language, arguments, research topics' },
  { id: 'interview', label: 'Job Interview', icon: '🎯', description: 'Interview questions, self-introduction, career goals' },
];

const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Simple vocabulary, short prompts' },
  { id: 'intermediate', label: 'Intermediate', description: 'Moderate complexity, structured responses' },
  { id: 'advanced', label: 'Advanced', description: 'Complex topics, extended responses' },
];

interface TopicSelectionProps {
  onSelect: (topicId: string, difficulty: string) => void;
}

export const TopicSelection: React.FC<TopicSelectionProps> = ({ onSelect }) => {
    const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('intermediate');

    const handleStart = () => {
        if (selectedTopic) {
            onSelect(selectedTopic, selectedDifficulty);
        }
    };

    return (
        <Box
            px={{ base: 4, sm: 6, md: 10, lg: 16 }}
            py={{ base: 6, md: 10 }}
            maxW={{ base: "100%", lg: "1100px" }}
            mx="auto"
        >
        <VStack spacing={10} w="full">
            <VStack spacing={3} textAlign="center">
                <Heading
                    fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
                    bgGradient="linear(to-r, blue.400, purple.500)"
                    bgClip="text"
                >
                    Choose Your Topic
                </Heading>
                <Text color="whiteAlpha.700" fontSize={{ base: "md", md: "lg" }}>
                    Select a topic and difficulty level for your assessment
                </Text>
            </VStack>

            {/* 1. Topic Grid */}
            <SimpleGrid
                columns={{ base: 1, sm: 2, md: 2, lg: 3 }}
                spacing={{ base: 3, md: 4, lg: 5 }}
                w="100%"
            >
                {AVAILABLE_TOPICS.map((topic) => {
                    const isSelected = selectedTopic === topic.id;
                    return (
                        <motion.div
                            key={topic.id}
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Box
                                minH={{ base: "80px", md: "auto" }}
                                p={{ base: 4, md: 5 }}
                                bg={isSelected ? "whiteAlpha.150" : "whiteAlpha.50"}
                                border="1px solid"
                                borderColor={isSelected ? "blue.400" : "whiteAlpha.100"}
                                rounded="2xl"
                                cursor="pointer"
                                onClick={() => setSelectedTopic(topic.id)}
                                transition="all 0.3s"
                                boxShadow={isSelected ? "0 0 20px -5px rgba(66, 153, 225, 0.6)" : "none"}
                                _hover={{
                                    bg: "whiteAlpha.100",
                                    borderColor: isSelected ? "blue.400" : "blue.300",
                                    boxShadow: isSelected ? "0 0 20px -5px rgba(66, 153, 225, 0.6)" : "0 0 20px -5px rgba(66, 153, 225, 0.3)"
                                }}
                            >
                                <VStack align="start" spacing={4}>
                                    <Box p={3} bg="whiteAlpha.100" rounded="xl" fontSize="2xl">
                                        {topic.icon}
                                    </Box>
                                    <VStack align="start" spacing={1}>
                                        <Heading size="md" color="white">{topic.label}</Heading>
                                        <Text color="whiteAlpha.600" fontSize="sm">{topic.description}</Text>
                                    </VStack>
                                </VStack>
                            </Box>
                        </motion.div>
                    );
                })}
            </SimpleGrid>

            {/* 2. Difficulty Selector */}
            <VStack spacing={4} w="full" align="start" pt={6}>
                <Heading size="md" color="white">Select Difficulty Level</Heading>
                <SimpleGrid
                    columns={{ base: 1, sm: 1, md: 3 }}
                    spacing={{ base: 2, md: 4 }}
                    w="100%"
                >
                    {DIFFICULTY_LEVELS.map((level) => {
                        const isSelected = selectedDifficulty === level.id;
                        return (
                            <Box
                                key={level.id}
                                w={{ base: "100%", md: "auto" }}
                                p={4}
                                bg={isSelected ? "whiteAlpha.150" : "whiteAlpha.50"}
                                border="1px solid"
                                borderColor={isSelected ? "purple.400" : "whiteAlpha.100"}
                                rounded="xl"
                                cursor="pointer"
                                onClick={() => setSelectedDifficulty(level.id)}
                                transition="all 0.2s"
                                _hover={{
                                    bg: "whiteAlpha.100",
                                    borderColor: isSelected ? "purple.400" : "purple.300",
                                }}
                            >
                                <VStack align="start" spacing={1}>
                                    <Text fontWeight="bold" color="white">{level.label}</Text>
                                    <Text color="whiteAlpha.600" fontSize="xs">{level.description}</Text>
                                </VStack>
                            </Box>
                        );
                    })}
                </SimpleGrid>
            </VStack>

            {/* 3. Start Button */}
            <Button
                size="lg"
                colorScheme="blue"
                rounded="full"
                onClick={handleStart}
                px={12}
                w={{ base: "100%", sm: "auto" }}
                isDisabled={!selectedTopic}
                leftIcon={<Sparkles size={18} />}
                boxShadow={selectedTopic ? "0 0 20px rgba(66, 153, 225, 0.4)" : "none"}
                _hover={selectedTopic ? { transform: 'translateY(-2px)', boxShadow: '0 0 30px rgba(66, 153, 225, 0.6)' } : {}}
            >
                Start Assessment
            </Button>
        </VStack>
        </Box>
    );
};
