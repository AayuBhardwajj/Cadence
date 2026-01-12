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
  Divider,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  useColorMode,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Icon
} from "@chakra-ui/react";
import { BellIcon, MoonIcon, SunIcon, ChevronDownIcon, SettingsIcon } from "@chakra-ui/icons";
import { FiUser, FiLogOut } from "react-icons/fi";
import { AuroraBackground } from "../components/arcenity/AuroraBackground";
import { GlassmorphicCard } from "../components/arcenity/GlassmorphicCard";
import { FeatureSection } from "../components/arcenity/FeatureSection";

// Medical/Healthcare color palette
// Medical/Healthcare color palette hook
function useMedicalColors() {
  return {
    white: useColorModeValue("#FFFFFF", "rgba(26, 32, 44, 0.4)"),
    lightGray: useColorModeValue("#F8F9FA", "rgba(45, 55, 72, 0.3)"),
    softBlue: useColorModeValue("#E3F2FD", "rgba(42, 67, 101, 0.3)"),
    medicalBlue: useColorModeValue("#2196F3", "#90CDF4"),
    deepBlue: useColorModeValue("#1565C0", "#63B3ED"),
    medicalGreen: useColorModeValue("#4CAF50", "#68D391"),
    lightGreen: useColorModeValue("#E8F5E9", "#2F855A"),
    accentBlue: useColorModeValue("#42A5F5", "#63B3ED"),
    textPrimary: useColorModeValue("#212121", "#F7FAFC"),
    textSecondary: useColorModeValue("#757575", "#A0AEC0"),
    borderLight: useColorModeValue("#E0E0E0", "rgba(255, 255, 255, 0.1)"),
    success: useColorModeValue("#66BB6A", "#68D391"),
    warning: useColorModeValue("#FFA726", "#F6AD55"),
    info: useColorModeValue("#42A5F5", "#63B3ED")
  };
}

// Fallback for default props
const defaultMedicalColors = {
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
  accentColor = defaultMedicalColors.medicalBlue,
  ...props
}: {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  accentColor?: string;
  [key: string]: any;
}) {
  const medicalColors = useMedicalColors();
  return (
    <GlassmorphicCard
      intensity="medium"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={medicalColors.borderLight}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        transform: "translateY(-4px)",
        boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
      }}
      position="relative"
      overflow="hidden"
      p={0}
      {...props}
    >
      {title && (
        <Box
          bg={useColorModeValue("rgba(248, 249, 250, 0.6)", "rgba(45, 55, 72, 0.4)")}
          borderBottomWidth="1px"
          borderBottomColor={medicalColors.borderLight}
          py={3}
          px={4}
          backdropFilter="blur(5px)"
        >
          <HStack spacing={2}>
            {icon && <Text fontSize="lg">{icon}</Text>}
            <Heading size="sm" color={medicalColors.textPrimary} fontWeight="600">
              {title}
            </Heading>
          </HStack>
        </Box>
      )}
      <Box p={4}>{children}</Box>
    </GlassmorphicCard>
  );
}

function StatPill({ label, value, change, color }: {
  label: string;
  value: string;
  change?: string;
  color: string;
}) {
  const medicalColors = useMedicalColors();
  return (
    <GlassmorphicCard
      intensity="light"
      borderRadius="lg"
      px={4}
      py={3}
      borderWidth="1px"
      borderColor={`${color}30`}
      borderLeftWidth="4px"
      borderLeftColor={color}
      bg={`linear-gradient(135deg, ${color}10, ${color}05)`}
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
    </GlassmorphicCard>
  );
}

function ChallengeItem({ title, progress, color }: {
  title: string;
  progress: number;
  color: string;
}) {
  const medicalColors = useMedicalColors();
  return (
    <GlassmorphicCard
      intensity="light"
      bg={useColorModeValue("rgba(240, 244, 248, 0.4)", "rgba(45, 55, 72, 0.3)")}
      borderRadius="md"
      p={3}
    >
      <VStack align="stretch" spacing={2}>
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
    </GlassmorphicCard>
  );
}

function ProblemAreaCard({ title, metric, color }: {
  title: string;
  metric: string;
  color: string;
}) {
  const medicalColors = useMedicalColors();
  return (
    <GlassmorphicCard
      intensity="light"
      borderRadius="lg"
      p={4}
      borderWidth="1px"
      borderColor={`${color}30`}
      borderLeftWidth="4px"
      borderLeftColor={color}
      bg={`linear-gradient(135deg, ${color}10, ${color}05)`}
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
    </GlassmorphicCard>
  );
}

import { supabase } from "../lib/supabase";

export function Dashboard({ username = "User" }: { username?: string }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const medicalColors = useMedicalColors();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

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
    <AuroraBackground variant="mixed" minH="100vh">
      {/* Header */}
      <Box
        bg={useColorModeValue("rgba(255, 255, 255, 0.8)", "rgba(10, 15, 30, 0.8)")}
        backdropFilter="blur(15px)"
        sx={{ WebkitBackdropFilter: "blur(15px)" }}
        borderBottomWidth="1px"
        borderBottomColor={medicalColors.borderLight}
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
            <IconButton
              aria-label="Toggle Dark Mode"
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              borderRadius="md"
              color={medicalColors.textSecondary}
            />
            <Menu>
              <MenuButton
                as={Button}
                variant="ghost"
                p={0}
                borderRadius="full"
                _hover={{ bg: "transparent" }}
              >
                <HStack spacing={2}>
                  <Avatar
                    name={username}
                    size="sm"
                    bg={medicalColors.medicalBlue}
                    color="white"
                  />
                  <ChevronDownIcon color={medicalColors.textSecondary} />
                </HStack>
              </MenuButton>
              <MenuList
                bg={useColorModeValue("white", "gray.800")}
                borderColor={medicalColors.borderLight}
                boxShadow="xl"
                backdropFilter="blur(15px)"
                sx={{ WebkitBackdropFilter: "blur(15px)" }}
              >
                <MenuItem icon={<Icon as={FiUser} />} fontWeight="500">
                  View Profile
                </MenuItem>
                <MenuItem icon={<SettingsIcon />} fontWeight="500">
                  Account Settings
                </MenuItem>
                <MenuItem icon={<Text as="span" fontSize="md">💳</Text>} fontWeight="500">
                  Billing & Plans
                </MenuItem>
                <MenuItem icon={<Badge colorScheme="purple">Pro</Badge>} fontWeight="500">
                  Subscription
                </MenuItem>
                <MenuItem icon={<Text as="span" fontSize="md">🙋‍♂️</Text>} fontWeight="500">
                  Support & Help
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<Icon as={FiLogOut} />}
                  onClick={handleLogout}
                  color="red.500"
                  fontWeight="600"
                >
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>

      <Container maxW="8xl" py={6}>
        <SimpleGrid columns={{ base: 1, lg: 12 }} spacing={6}>
          {/* Left Column: Stats & Missions (3 cols) */}
          <Box gridColumn={{ base: "span 1", lg: "span 3" }}>
            <VStack spacing={6} align="stretch">
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
                </VStack>
              </GlassmorphicCard>

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
                    title="Reduce filler words"
                    progress={40}
                    color={medicalColors.medicalGreen}
                  />
                  <ChallengeItem
                    title="5 Day Streak"
                    progress={80}
                    color={medicalColors.accentBlue}
                  />
                </VStack>
              </GlassmorphicCard>
            </VStack>
          </Box>

          {/* Center Column: Welcome & Assessment (6 cols) */}
          <Box gridColumn={{ base: "span 1", lg: "span 6" }}>
            <VStack spacing={6} align="stretch">
              {/* Hero Welcome Section - Enhanced */}
              <GlassmorphicCard
                intensity="strong"
                p={8}
                position="relative"
                overflow="hidden"
                bgGradient={useColorModeValue(
                  "linear(to-br, whiteAlpha.900, whiteAlpha.600)",
                  "linear(to-br, blackAlpha.600, blackAlpha.300)"
                )}
              >
                <VStack spacing={8} align="center" textAlign="center">
                  <VStack spacing={2}>
                    <Heading size="xl" color={medicalColors.medicalBlue} fontWeight="800" letterSpacing="-1px">
                      Welcome back, {username}!
                    </Heading>
                    <Text fontSize="lg" color={medicalColors.textSecondary} maxW="md">
                      "Practice makes progress, not perfection. Keep going! 💪"
                    </Text>
                  </VStack>

                  <Divider borderColor="gray.200" />

                  {/* Main Action Area */}
                  <Box
                    p={2}
                    borderRadius="full"
                    bgGradient={`linear(to-r, ${medicalColors.medicalBlue}, ${medicalColors.accentBlue})`}
                    boxShadow="0 10px 30px rgba(33,150,243,0.3)"
                    transition="transform 0.2s"
                    _hover={{ transform: "scale(1.02)" }}
                  >
                    <Button
                      as={Link}
                      href="/pre-recording"
                      size="lg"
                      w="full"
                      h="64px"
                      bg="white"
                      color={medicalColors.medicalBlue}
                      borderRadius="full"
                      fontSize="xl"
                      fontWeight="bold"
                      leftIcon={<Text fontSize="2xl">🎤</Text>}
                      _hover={{ bg: "gray.50" }}
                    >
                      Start New Assessment
                    </Button>
                  </Box>

                  <HStack spacing={8} pt={2}>
                    <VStack spacing={0}>
                      <Text fontSize="2xl" fontWeight="800" color={medicalColors.textPrimary}>7</Text>
                      <Text fontSize="xs" color={medicalColors.textSecondary} fontWeight="600" textTransform="uppercase">Day Streak 🔥</Text>
                    </VStack>
                    <Box w="1px" h="40px" bg="gray.200" />
                    <VStack spacing={0}>
                      <Text fontSize="2xl" fontWeight="800" color={medicalColors.textPrimary}>82%</Text>
                      <Text fontSize="xs" color={medicalColors.textSecondary} fontWeight="600" textTransform="uppercase"> Avg. Fluency 📈</Text>
                    </VStack>
                  </HStack>
                </VStack>
              </GlassmorphicCard>

              {/* Module 4: Recent Sessions Feed */}
              <MedicalCard
                title="Recent Activity"
                accentColor={medicalColors.medicalBlue}
              >
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr bg={medicalColors.lightGray}>
                        <Th>Date</Th>
                        <Th>Score</Th>
                        <Th>Report</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {[
                        { date: "Jan 7", fluency: "82/100" },
                        { date: "Jan 6", fluency: "77/100" },
                        { date: "Jan 5", fluency: "75/100" }
                      ].map((session, idx) => (
                        <Tr key={idx} _hover={{ bg: medicalColors.softBlue }}>
                          <Td fontWeight="500">{session.date}</Td>
                          <Td color={medicalColors.medicalBlue} fontWeight="bold">{session.fluency}</Td>
                          <Td>
                            <Button size="xs" colorScheme="blue" variant="ghost">View</Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </MedicalCard>

              {/* Feature Section Preview */}
              <FeatureSection
                title=""
                subtitle="Explore more tools"
                features={features.slice(0, 3)}
                columns={{ base: 1, md: 3 }}
              />

            </VStack>
          </Box>

          {/* Right Column: Progress & Community (3 cols) */}
          <Box gridColumn={{ base: "span 1", lg: "span 3" }}>
            <VStack spacing={6} align="stretch">

              {/* Module 9: Motivation Meter */}
              <MedicalCard title="Weekly Goal 🏃‍♂️" accentColor={medicalColors.success}>
                <VStack spacing={4}>
                  <Box position="relative" w="120px" h="120px">
                    <Progress
                      value={80}
                      size="lg"
                      w="100%"
                      borderRadius="full"
                      colorScheme="green"
                      sx={{ "& > div": { transition: "all 0.5s ease" } }}
                    />
                    {/* Simple circular progress simulation for now */}
                    <Flex
                      position="absolute" top="0" left="0" right="0" bottom="0"
                      align="center" justify="center" direction="column"
                      bg={medicalColors.lightGreen} borderRadius="full" m={2}
                    >
                      <Text fontSize="2xl" fontWeight="800" color={medicalColors.medicalGreen}>80%</Text>
                    </Flex>
                  </Box>
                  <Text fontSize="xs" textAlign="center" color={medicalColors.textSecondary}>
                    Practice 1 more session to reach goal!
                  </Text>
                </VStack>
              </MedicalCard>

              {/* Module 6: Tip of the Day */}
              <Box
                bg={medicalColors.info}
                p={4}
                borderRadius="lg"
                color="white"
                boxShadow="lg"
              >
                <HStack mb={2}>
                  <Text fontSize="xl">💡</Text>
                  <Text fontWeight="bold">Tip of the Day</Text>
                </HStack>
                <Text fontSize="sm" lineHeight="1.5" opacity={0.9}>
                  Your 'v/w' confusion improved. Try saying 'very', 'wave', and 'vowel' 10 times today.
                </Text>
              </Box>

              {/* Module 8: Community */}
              <MedicalCard title="Top Improvers 🏆" accentColor={medicalColors.warning}>
                <VStack spacing={3} align="stretch">
                  {[
                    { user: "User_A2X", val: "+25%" },
                    { user: "User_B7Y", val: "+22%" },
                    { user: "User_C9Z", val: "+20%" }
                  ].map((item, i) => (
                    <HStack key={i} justify="space-between" p={2} bg={medicalColors.lightGray} borderRadius="md">
                      <Text fontSize="sm" fontWeight="500">{item.user}</Text>
                      <Text fontSize="sm" fontWeight="bold" color={medicalColors.success}>{item.val}</Text>
                    </HStack>
                  ))}
                  <Text fontSize="xs" color="gray.500" textAlign="center" pt={2}>
                    You are in the top 30%!
                  </Text>
                </VStack>
              </MedicalCard>

            </VStack>
          </Box>

        </SimpleGrid>
      </Container>

      {/* Footer */}
      <Box
        bg={useColorModeValue("rgba(255, 255, 255, 0.8)", "rgba(26, 32, 44, 0.8)")}
        backdropFilter="blur(10px)"
        sx={{ WebkitBackdropFilter: "blur(10px)" }}
        color={medicalColors.textSecondary}
        py={6}
        px={6}
        mt={8}
        borderTopWidth="1px"
        borderTopColor={medicalColors.borderLight}
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
