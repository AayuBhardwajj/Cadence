import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  HStack,
  VStack,
  Button,
  Avatar,
  Badge,
  Progress,
  IconButton,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Image,
  Link
} from "@chakra-ui/react";
import { BellIcon } from "@chakra-ui/icons";
import { AuroraBackground } from "../components/arcenity/AuroraBackground";
import { GlassmorphicCard } from "../components/arcenity/GlassmorphicCard";
import { FeatureSection } from "../components/arcenity/FeatureSection";

// Medical/Healthcare color palette
const medicalColors = {
  white: "#FFFFFF",
  lightGray: "#F8F9FA",
  softBlue: "#E3F2FD",
  medicalBlue: "#2196F3",
  deepBlue: "#1565C0",
  medicalGreen: "#4CAF50",
  lightGreen: "#E8F5E9",
  accentBlue: "#42A5F5",
  textPrimary: "#212121",
  textSecondary: "#757575",
  borderLight: "#E0E0E0",
  success: "#66BB6A",
  warning: "#FFA726",
  info: "#42A5F5"
};

function MedicalCard({
  title,
  icon,
  children,
  accentColor = medicalColors.medicalBlue,
  ...props
}: {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  accentColor?: string;
  [key: string]: any;
}) {
  return (
    <Card
      bg={medicalColors.white}
      borderRadius="lg"
      boxShadow="0 2px 8px rgba(0,0,0,0.08)"
      borderWidth="1px"
      borderColor={medicalColors.borderLight}
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        transition: "all 0.2s ease"
      }}
      position="relative"
      overflow="hidden"
      {...props}
    >
      {title && (
        <CardHeader
          bg={medicalColors.lightGray}
          borderBottomWidth="1px"
          borderBottomColor={medicalColors.borderLight}
          py={3}
          px={4}
        >
          <HStack spacing={2}>
            {icon && <Text fontSize="lg">{icon}</Text>}
            <Heading size="sm" color={medicalColors.textPrimary} fontWeight="600">
              {title}
            </Heading>
          </HStack>
        </CardHeader>
      )}
      <CardBody p={4}>{children}</CardBody>
    </Card>
  );
}

function StatPill({ label, value, change, color }: {
  label: string;
  value: string;
  change?: string;
  color: string;
}) {
  return (
    <Box
      bg={`linear-gradient(135deg, ${color}15, ${color}08)`}
      borderRadius="lg"
      px={4}
      py={3}
      borderWidth="1px"
      borderColor={`${color}30`}
      borderLeftWidth="4px"
      borderLeftColor={color}
    >
      <Text fontSize="xs" color={medicalColors.textSecondary} fontWeight="500" mb={1}>
        {label}
      </Text>
      <HStack spacing={2} align="baseline">
        <Text fontSize="xl" fontWeight="700" color={medicalColors.textPrimary}>
          {value}
        </Text>
        {change && (
          <Text fontSize="xs" color={medicalColors.success} fontWeight="600">
            {change}
          </Text>
        )}
      </HStack>
    </Box>
  );
}

function ChallengeItem({ title, progress, color }: {
  title: string;
  progress: number;
  color: string;
}) {
  return (
    <VStack align="stretch" spacing={2} p={3} bg={medicalColors.lightGray} borderRadius="md">
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="500" color={medicalColors.textPrimary}>
          {title}
        </Text>
        <Text fontSize="sm" fontWeight="600" color={color}>
          {progress}%
        </Text>
      </HStack>
      <Progress
        value={progress}
        colorScheme="blue"
        bg={medicalColors.borderLight}
        borderRadius="full"
        height="6px"
        sx={{
          "& > div": {
            background: `linear-gradient(90deg, ${color}, ${color}DD)`
          }
        }}
      />
    </VStack>
  );
}

function ProblemAreaCard({ title, metric, color }: {
  title: string;
  metric: string;
  color: string;
}) {
  return (
    <Box
      bg={`linear-gradient(135deg, ${color}10, ${color}05)`}
      borderRadius="lg"
      p={4}
      borderWidth="1px"
      borderColor={`${color}30`}
      borderLeftWidth="4px"
      borderLeftColor={color}
      transition="all 0.2s"
      _hover={{ 
        bg: `${color}15`,
        transform: "translateX(4px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}
    >
      <Text fontSize="sm" fontWeight="600" color={medicalColors.textPrimary} mb={2}>
        {title}
      </Text>
      <Text fontSize="xs" color={medicalColors.textSecondary} mb={3}>
        {metric}
      </Text>
      <Button
        size="sm"
        bg={color}
        color="white"
        borderRadius="md"
        _hover={{ bg: color, opacity: 0.9 }}
        fontWeight="500"
        fontSize="xs"
      >
        Practice Now
      </Button>
    </Box>
  );
}

export function Dashboard({ username = "User" }: { username?: string }) {
  const features = [
    {
      icon: "🎯",
      title: "AI-Powered Analysis",
      description: "Advanced speech analysis using multi-modal AI to detect stuttering, accent issues, and word retrieval problems.",
      color: medicalColors.medicalBlue
    },
    {
      icon: "📊",
      title: "Real-Time Feedback",
      description: "Get instant feedback on your pronunciation, fluency, and vocabulary during practice sessions.",
      color: medicalColors.medicalGreen
    },
    {
      icon: "📈",
      title: "Progress Tracking",
      description: "Track your improvement over time with detailed analytics and personalized insights.",
      color: medicalColors.accentBlue
    },
    {
      icon: "🎓",
      title: "Personalized Exercises",
      description: "Practice modules tailored to your specific needs and learning goals.",
      color: "#9C27B0"
    },
    {
      icon: "💬",
      title: "Community Support",
      description: "Connect with others on similar journeys and share your progress.",
      color: medicalColors.warning
    },
    {
      icon: "🏆",
      title: "Achievement System",
      description: "Unlock badges and milestones as you progress in your communication journey.",
      color: medicalColors.success
    }
  ];

  return (
    <AuroraBackground variant="mixed" minH="100vh" bg={medicalColors.lightGray}>
      {/* Header */}
      <Box
        bg="rgba(255, 255, 255, 0.9)"
        backdropFilter="blur(10px)"
        WebkitBackdropFilter="blur(10px)"
        borderBottomWidth="1px"
        borderBottomColor="rgba(224, 224, 224, 0.5)"
        py={4}
        px={6}
        position="sticky"
        top={0}
        zIndex={100}
        boxShadow="0 1px 3px rgba(0,0,0,0.05)"
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Heading
              size="lg"
              color={medicalColors.medicalBlue}
              fontWeight="700"
              letterSpacing="-0.5px"
            >
              🎤 Fluently
            </Heading>
          </HStack>
          <HStack spacing={4}>
            <HStack
              spacing={1}
              px={2}
              py={1}
              borderRadius="md"
            >
              <Button variant="ghost" size="sm" colorScheme="blue" fontWeight="500">Home</Button>
              <Button variant="ghost" size="sm" color={medicalColors.textSecondary}>Practice</Button>
              <Button variant="ghost" size="sm" color={medicalColors.textSecondary}>Progress</Button>
              <Button variant="ghost" size="sm" color={medicalColors.textSecondary}>Exercises</Button>
              <Button variant="ghost" size="sm" color={medicalColors.textSecondary}>Settings</Button>
            </HStack>
            <IconButton
              aria-label="Notifications"
              icon={<BellIcon />}
              variant="ghost"
              borderRadius="md"
              color={medicalColors.textSecondary}
            />
            <Avatar
              name={username}
              size="sm"
              bg={medicalColors.medicalBlue}
              color="white"
            />
          </HStack>
        </Flex>
      </Box>

      <Container maxW="7xl" py={8}>
        {/* Hero Welcome Section */}
        <GlassmorphicCard
          intensity="medium"
          p={8}
          mb={6}
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            gap={6}
          >
            <VStack align="flex-start" spacing={3}>
              <Heading size="xl" color={medicalColors.textPrimary} fontWeight="700">
                Welcome back, {username}! 👋
              </Heading>
              <Box
                bg={medicalColors.white}
                borderRadius="lg"
                px={5}
                py={3}
                borderWidth="1px"
                borderColor={medicalColors.borderLight}
                boxShadow="0 1px 3px rgba(0,0,0,0.05)"
              >
                <Text fontSize="sm" color={medicalColors.textSecondary} fontStyle="italic">
                  "Practice makes progress, not perfection. Keep going! 💪"
                </Text>
              </Box>
            </VStack>
            <HStack spacing={4}>
              <Box
                bg={medicalColors.medicalBlue}
                color="white"
                px={5}
                py={2}
                borderRadius="lg"
                fontWeight="600"
                fontSize="sm"
                boxShadow="0 2px 4px rgba(33,150,243,0.3)"
              >
                🔥 7 Day Streak
              </Box>
              <Button
                size="lg"
                bg={medicalColors.medicalBlue}
                color="white"
                borderRadius="lg"
                px={8}
                py={6}
                fontWeight="600"
                fontSize="md"
                boxShadow="0 4px 12px rgba(33,150,243,0.3)"
                _hover={{
                  bg: medicalColors.deepBlue,
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 16px rgba(33,150,243,0.4)"
                }}
                _active={{
                  transform: "translateY(0)"
                }}
              >
                Start New Session
              </Button>
            </HStack>
          </Flex>
        </GlassmorphicCard>

        {/* Modular Card Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {/* Module 1: Today's Quick Stats */}
          <GlassmorphicCard intensity="medium" p={4}>
            <VStack align="stretch" spacing={3} mb={3}>
              <HStack spacing={2}>
                <Text fontSize="lg">📊</Text>
                <Heading size="sm" color={medicalColors.textPrimary} fontWeight="600">
                  Today's Performance
                </Heading>
              </HStack>
            </VStack>
            <VStack spacing={4} align="stretch">
              <StatPill 
                label="Fluency Score" 
                value="78/100" 
                change="+5" 
                color={medicalColors.medicalBlue} 
              />
              <StatPill 
                label="Practice Time" 
                value="12 min" 
                color={medicalColors.medicalGreen} 
              />
              <StatPill 
                label="Sessions" 
                value="2" 
                color={medicalColors.accentBlue} 
              />
              <Box mt={2}>
                <Text fontSize="xs" color={medicalColors.textSecondary} mb={2} fontWeight="500">
                  Progress Gauge
                </Text>
                <Box
                  w="100%"
                  h="60px"
                  bg={medicalColors.lightGray}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={medicalColors.borderLight}
                  position="relative"
                  overflow="hidden"
                >
                  <Box
                    w="78%"
                    h="100%"
                    bg={`linear-gradient(90deg, ${medicalColors.medicalBlue}, ${medicalColors.accentBlue})`}
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text
                      fontFamily="system-ui"
                      fontWeight="700"
                      color="white"
                      fontSize="lg"
                    >
                      78%
                    </Text>
                  </Box>
                </Box>
              </Box>
            </VStack>
          </GlassmorphicCard>

          {/* Module 2: Your Progress Journey */}
          <MedicalCard
            title="30-Day Progress 📈"
            accentColor={medicalColors.medicalGreen}
            gridColumn={{ base: 1, md: "span 2", lg: "span 1" }}
          >
            <Box
              bg={medicalColors.white}
              p={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={medicalColors.borderLight}
            >
              <VStack spacing={4} align="stretch">
                <HStack spacing={2} flexWrap="wrap">
                  <Badge 
                    bg={`${medicalColors.medicalBlue}15`} 
                    color={medicalColors.medicalBlue} 
                    px={3} 
                    py={1} 
                    borderRadius="md"
                    fontWeight="500"
                  >
                    Fluency
                  </Badge>
                  <Badge 
                    bg={`${medicalColors.medicalGreen}15`} 
                    color={medicalColors.medicalGreen} 
                    px={3} 
                    py={1} 
                    borderRadius="md"
                    fontWeight="500"
                  >
                    Accent
                  </Badge>
                  <Badge 
                    bg={`${medicalColors.accentBlue}15`} 
                    color={medicalColors.accentBlue} 
                    px={3} 
                    py={1} 
                    borderRadius="md"
                    fontWeight="500"
                  >
                    Vocabulary
                  </Badge>
                </HStack>
                <Box 
                  h="200px" 
                  bg={medicalColors.lightGray}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={medicalColors.borderLight}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <VStack spacing={2}>
                    <Text fontFamily="system-ui" fontSize="lg" color={medicalColors.textSecondary}>
                      📊
                    </Text>
                    <Text fontFamily="system-ui" fontSize="sm" color={medicalColors.textSecondary}>
                      Graph visualization (30-day trend lines)
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </MedicalCard>

          {/* Module 3: Active Challenges */}
          <GlassmorphicCard intensity="medium" p={4}>
            <VStack align="stretch" spacing={3} mb={3}>
              <HStack spacing={2}>
                <Text fontSize="lg">🎯</Text>
                <Heading size="sm" color={medicalColors.textPrimary} fontWeight="600">
                  Your Missions
                </Heading>
              </HStack>
            </VStack>
            <VStack spacing={3} align="stretch">
              <ChallengeItem
                title="Master the 'th' sound"
                progress={60}
                color={medicalColors.medicalBlue}
              />
              <ChallengeItem
                title="Reduce filler words to <3/min"
                progress={40}
                color={medicalColors.medicalGreen}
              />
              <ChallengeItem
                title="Practice 5 days in a row"
                progress={80}
                color={medicalColors.accentBlue}
              />
            </VStack>
          </GlassmorphicCard>

          {/* Module 4: Recent Sessions */}
          <MedicalCard
            title="Recent Practice Sessions 🎙️"
            accentColor={medicalColors.medicalBlue}
            gridColumn={{ base: 1, md: "span 2" }}
          >
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={medicalColors.lightGray}>
                    <Th color={medicalColors.textPrimary} fontWeight="600" fontSize="xs">Date</Th>
                    <Th color={medicalColors.textPrimary} fontWeight="600" fontSize="xs">Duration</Th>
                    <Th color={medicalColors.textPrimary} fontWeight="600" fontSize="xs">Fluency</Th>
                    <Th color={medicalColors.textPrimary} fontWeight="600" fontSize="xs">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {[
                    { date: "Jan 7, 2026", duration: "5 min", fluency: "82/100" },
                    { date: "Jan 6, 2026", duration: "8 min", fluency: "77/100" },
                    { date: "Jan 5, 2026", duration: "6 min", fluency: "75/100" }
                  ].map((session, idx) => (
                    <Tr
                      key={idx}
                      bg={idx % 2 === 0 ? medicalColors.white : medicalColors.lightGray}
                      _hover={{ bg: medicalColors.softBlue }}
                      transition="all 0.2s"
                    >
                      <Td color={medicalColors.textSecondary} fontSize="sm">{session.date}</Td>
                      <Td color={medicalColors.textSecondary} fontSize="sm">{session.duration}</Td>
                      <Td color={medicalColors.textPrimary} fontWeight="600" fontSize="sm">
                        {session.fluency}
                      </Td>
                      <Td>
                        <Button
                          size="xs"
                          bg={medicalColors.medicalBlue}
                          color="white"
                          borderRadius="md"
                          fontWeight="500"
                          _hover={{ bg: medicalColors.deepBlue }}
                        >
                          View Report
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </MedicalCard>

          {/* Module 5: Problem Areas Focus */}
          <MedicalCard title="Areas Needing Attention ⚠️" accentColor={medicalColors.warning}>
            <VStack spacing={3} align="stretch">
              <ProblemAreaCard
                title="TH Sound"
                metric="Mispronounced 8/12 times"
                color={medicalColors.medicalBlue}
              />
              <ProblemAreaCard
                title="Word Pauses"
                metric="Average 2.3 sec pauses"
                color={medicalColors.warning}
              />
              <ProblemAreaCard
                title="Filler Words"
                metric="18 'um/uh' per session"
                color={medicalColors.accentBlue}
              />
            </VStack>
          </MedicalCard>

          {/* Module 6: Personalized Tip */}
          <MedicalCard title="Coach's Tip of the Day 💡" accentColor={medicalColors.info}>
            <Box
              bg={medicalColors.lightGray}
              color={medicalColors.textPrimary}
              p={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={medicalColors.borderLight}
              borderLeftWidth="4px"
              borderLeftColor={medicalColors.info}
            >
              <Text fontSize="sm" mb={3} lineHeight="1.6" color={medicalColors.textPrimary}>
                Your 'v/w' confusion improved 30% this week! Keep practicing words like 'very',
                'wave', and 'vowel'. Try saying them 10 times before your next session.
              </Text>
              <Button
                size="sm"
                bg={medicalColors.info}
                color="white"
                borderRadius="md"
                fontWeight="500"
                _hover={{ bg: medicalColors.medicalBlue }}
              >
                Next Tip
              </Button>
            </Box>
          </MedicalCard>

          {/* Module 7: Recommended Practice */}
          <MedicalCard
            title="Suggested for You 🎯"
            accentColor={medicalColors.medicalGreen}
            gridColumn={{ base: 1, md: "span 2" }}
          >
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {[
                { title: "TH Sound Drills", duration: "5 min", level: "Beginner", color: medicalColors.medicalBlue },
                { title: "Word Association Game", duration: "10 min", level: "Intermediate", color: medicalColors.medicalGreen },
                { title: "Job Interview Simulation", duration: "15 min", level: "Advanced", color: medicalColors.accentBlue }
              ].map((exercise, idx) => (
                <Box
                  key={idx}
                  bg={`linear-gradient(135deg, ${exercise.color}10, ${exercise.color}05)`}
                  borderRadius="lg"
                  p={4}
                  borderWidth="1px"
                  borderColor={`${exercise.color}30`}
                  borderLeftWidth="4px"
                  borderLeftColor={exercise.color}
                >
                  <Text fontSize="sm" fontWeight="600" color={medicalColors.textPrimary} mb={2}>
                    {exercise.title}
                  </Text>
                  <HStack spacing={2} mb={3}>
                    <Badge 
                      bg={`${exercise.color}15`} 
                      color={exercise.color} 
                      fontSize="xs"
                      fontWeight="500"
                    >
                      {exercise.duration}
                    </Badge>
                    <Badge 
                      bg={medicalColors.lightGray} 
                      color={medicalColors.textSecondary} 
                      fontSize="xs"
                      fontWeight="500"
                    >
                      {exercise.level}
                    </Badge>
                  </HStack>
                  <Button
                    size="sm"
                    bg={exercise.color}
                    color="white"
                    w="full"
                    borderRadius="md"
                    fontWeight="500"
                    _hover={{ bg: exercise.color, opacity: 0.9 }}
                  >
                    Start
                  </Button>
                </Box>
              ))}
            </SimpleGrid>
          </MedicalCard>

          {/* Module 8: Community Highlights */}
          <MedicalCard title="Community Corner 🌟" accentColor={medicalColors.accentBlue}>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" fontWeight="600" color={medicalColors.textPrimary}>
                Top Improvers This Week
              </Text>
              {[
                { user: "User_A2X", improvement: "25%", rank: 1 },
                { user: "User_B7Y", improvement: "22%", rank: 2 },
                { user: "User_C9Z", improvement: "20%", rank: 3 }
              ].map((item) => (
                <HStack
                  key={item.rank}
                  bg={medicalColors.lightGray}
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={medicalColors.borderLight}
                >
                  <Text fontSize="lg">
                    {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}
                  </Text>
                  <Text fontSize="sm" fontWeight="500" color={medicalColors.textPrimary} flex={1}>
                    {item.user}
                  </Text>
                  <Text fontSize="sm" fontWeight="600" color={medicalColors.success}>
                    +{item.improvement}
                  </Text>
                </HStack>
              ))}
              <Box
                bg={`linear-gradient(135deg, ${medicalColors.medicalBlue}10, ${medicalColors.medicalGreen}10)`}
                p={3}
                borderRadius="md"
                borderWidth="1px"
                borderColor={medicalColors.borderLight}
                borderLeftWidth="4px"
                borderLeftColor={medicalColors.medicalBlue}
                mt={2}
              >
                <Text fontSize="sm" fontWeight="500" color={medicalColors.textPrimary} textAlign="center">
                  You're in top 30% of active users! 🎉
                </Text>
              </Box>
            </VStack>
          </MedicalCard>

          {/* Module 9: Motivation Meter */}
          <MedicalCard title="Keep Going! 💪" accentColor={medicalColors.success}>
            <VStack spacing={3}>
              <Box
                w="100%"
                h="120px"
                bg={medicalColors.lightGray}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={medicalColors.borderLight}
                position="relative"
                overflow="hidden"
              >
                <Box
                  w="80%"
                  h="100%"
                  bg={`linear-gradient(90deg, ${medicalColors.medicalGreen}, ${medicalColors.success})`}
                  borderRadius="lg"
                  position="relative"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text
                    fontWeight="700"
                    color="white"
                    fontSize="xl"
                  >
                    80%
                  </Text>
                </Box>
              </Box>
              <Text fontSize="sm" color={medicalColors.textSecondary} textAlign="center" fontWeight="500">
                You're 80% toward your weekly goal!
              </Text>
              <Text fontSize="xs" color={medicalColors.textPrimary} textAlign="center">
                Practice 1 more session to unlock 'Bronze Speaker' badge 🏅
              </Text>
            </VStack>
          </MedicalCard>
        </SimpleGrid>

        {/* Feature Section */}
        <Box mt={12}>
          <FeatureSection
            title="Why Choose Fluently?"
            subtitle="Comprehensive speech improvement tools powered by advanced AI technology"
            features={features}
            columns={{ base: 1, md: 2, lg: 3 }}
          />
        </Box>
      </Container>

      {/* Footer */}
      <Box
        bg="rgba(255, 255, 255, 0.8)"
        backdropFilter="blur(10px)"
        WebkitBackdropFilter="blur(10px)"
        color={medicalColors.textSecondary}
        py={6}
        px={6}
        mt={8}
        borderTopWidth="1px"
        borderTopColor="rgba(224, 224, 224, 0.5)"
      >
        <Flex
          justify="space-between"
          align="center"
          direction={{ base: "column", md: "row" }}
          gap={4}
        >
          <HStack spacing={4} flexWrap="wrap" justify="center">
            <Link fontSize="sm" color={medicalColors.medicalBlue} fontWeight="500" _hover={{ textDecoration: "underline" }}>
              Help Center
            </Link>
            <Text fontSize="sm" color={medicalColors.borderLight}>|</Text>
            <Link fontSize="sm" color={medicalColors.medicalBlue} fontWeight="500" _hover={{ textDecoration: "underline" }}>
              Feedback
            </Link>
            <Text fontSize="sm" color={medicalColors.borderLight}>|</Text>
            <Link fontSize="sm" color={medicalColors.medicalBlue} fontWeight="500" _hover={{ textDecoration: "underline" }}>
              Report a Bug
            </Link>
            <Text fontSize="sm" color={medicalColors.borderLight}>|</Text>
            <Link fontSize="sm" color={medicalColors.medicalBlue} fontWeight="500" _hover={{ textDecoration: "underline" }}>
              Share with Friends
            </Link>
          </HStack>
          <Text fontSize="sm" color={medicalColors.textSecondary}>👋</Text>
        </Flex>
      </Box>
    </AuroraBackground>
  );
}
