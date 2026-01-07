import { Box, Heading, Text, VStack, HStack, SimpleGrid, Icon } from "@chakra-ui/react";
import { GlassmorphicCard } from "./GlassmorphicCard";

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface FeatureSectionProps {
  title: string;
  subtitle?: string;
  features: Feature[];
  columns?: { base?: number; md?: number; lg?: number };
}

export function FeatureSection({
  title,
  subtitle,
  features,
  columns = { base: 1, md: 2, lg: 3 }
}: FeatureSectionProps) {
  return (
    <Box py={12} px={4}>
      <VStack spacing={4} mb={8} textAlign="center">
        <Heading size="xl" fontWeight="700" bgGradient="linear(to-r, #2196F3, #9C27B0, #4CAF50)" bgClip="text">
          {title}
        </Heading>
        {subtitle && (
          <Text fontSize="lg" color="gray.600" maxW="2xl">
            {subtitle}
          </Text>
        )}
      </VStack>
      <SimpleGrid columns={columns} spacing={6}>
        {features.map((feature, index) => (
          <GlassmorphicCard
            key={index}
            intensity="medium"
            p={6}
            _hover={{
              transform: "translateY(-4px) scale(1.02)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
              transition: "all 0.3s ease"
            }}
            borderLeftWidth="4px"
            borderLeftColor={feature.color}
          >
            <VStack align="flex-start" spacing={3}>
              <HStack spacing={3}>
                <Box
                  fontSize="2xl"
                  p={3}
                  borderRadius="lg"
                  bg={`linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`}
                >
                  {feature.icon}
                </Box>
                <Heading size="md" fontWeight="600">
                  {feature.title}
                </Heading>
              </HStack>
              <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                {feature.description}
              </Text>
            </VStack>
          </GlassmorphicCard>
        ))}
      </SimpleGrid>
    </Box>
  );
}

