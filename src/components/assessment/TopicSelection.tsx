import React from 'react';
import { Box, VStack, Heading, Text, SimpleGrid, Icon, Button, useColorModeValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Briefcase, Cpu, MessageSquare, Globe, Sparkles } from 'lucide-react';

const TOPICS = [
    {
        id: 'workplace',
        title: 'Ideal Workplace',
        description: 'Describe your ideal workplace and what makes it productive for you.',
        icon: Briefcase,
        color: 'blue.400'
    },
    {
        id: 'tech',
        title: 'Technology & Life',
        description: 'How has technology changed the way we communicate in daily life?',
        icon: Cpu,
        color: 'purple.400'
    },
    {
        id: 'social',
        title: 'Social Media',
        description: 'Discuss the impact of social media on modern relationships.',
        icon: MessageSquare,
        color: 'pink.400'
    },
    {
        id: 'language',
        title: 'Language Learning',
        description: 'The importance of learning multiple languages in a globalized world.',
        icon: Globe,
        color: 'emerald.400'
    }
];

interface TopicSelectionProps {
    onSelect: (topicId: string, customPrompt?: string) => void;
}

export const TopicSelection: React.FC<TopicSelectionProps> = ({ onSelect }) => {
    return (
        <VStack spacing={10} w="full" maxW="4xl" mx="auto" py={10}>
            <VStack spacing={3} textAlign="center">
                <Heading size="xl" bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text">
                    Choose Your Topic
                </Heading>
                <Text color="whiteAlpha.700" fontSize="lg">
                    Select a topic to discuss for your 5-minute assessment
                </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
                {TOPICS.map((topic) => (
                    <motion.div
                        key={topic.id}
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Box
                            p={6}
                            bg="whiteAlpha.50"
                            border="1px solid"
                            borderColor="whiteAlpha.100"
                            rounded="2xl"
                            cursor="pointer"
                            onClick={() => onSelect(topic.id)}
                            transition="all 0.3s"
                            _hover={{
                                bg: "whiteAlpha.100",
                                borderColor: topic.color,
                                boxShadow: `0 0 20px -5px ${topic.color}`
                            }}
                        >
                            <VStack align="start" spacing={4}>
                                <Box p={3} bg={`${topic.color.split('.')[0]}.400/10`} rounded="xl">
                                    <Icon as={topic.icon} w={6} h={6} color={topic.color} />
                                </Box>
                                <VStack align="start" spacing={1}>
                                    <Heading size="md" color="white">{topic.title}</Heading>
                                    <Text color="whiteAlpha.600" fontSize="sm">{topic.description}</Text>
                                </VStack>
                            </VStack>
                        </Box>
                    </motion.div>
                ))}
            </SimpleGrid>

            <Button
                variant="outline"
                size="lg"
                leftIcon={<Sparkles size={18} />}
                colorScheme="blue"
                rounded="full"
                onClick={() => onSelect('custom')}
                px={10}
            >
                Use Custom Prompt
            </Button>
        </VStack>
    );
};
