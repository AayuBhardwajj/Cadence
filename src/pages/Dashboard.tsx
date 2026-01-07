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

// Retro color palette
const retroColors = {
  cream: "#F5F5DC",
  beige: "#E8E4D4",
  burntOrange: "#CC5500",
  teal: "#008B8B",
  purple: "#9370DB",
  brown: "#8B4513",
  darkBrown: "#3E2723",
  yellow: "#FFD700",
  green: "#228B22"
};

function RetroCard({
  title,
  icon,
  children,
  accentColor = retroColors.teal,
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
      bg={retroColors.cream}
      borderRadius="xl"
      boxShadow="lg"
      borderWidth="3px"
      borderColor={accentColor}
      borderTopWidth="6px"
      _hover={{
        transform: "translateY(-4px)",
        boxShadow: "xl",
        transition: "all 0.3s ease"
      }}
      position="relative"
      overflow="hidden"
      {...props}
    >
      {title && (
        <CardHeader
          bg={`linear-gradient(90deg, ${accentColor}15, ${accentColor}05)`}
          borderBottomWidth="2px"
          borderBottomColor={accentColor}
          py={3}
        >
          <HStack spacing={2}>
            {icon && <Text fontSize="lg">{icon}</Text>}
            <Heading size="sm" fontFamily="mono" color={retroColors.darkBrown}>
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
      bg={`linear-gradient(135deg, ${color}20, ${color}10)`}
      borderRadius="full"
      px={4}
      py={2}
      borderWidth="2px"
      borderColor={color}
      textAlign="center"
    >
      <Text fontSize="xs" color={retroColors.brown} fontWeight="bold">
        {label}
      </Text>
      <HStack spacing={1} justify="center">
        <Text fontSize="lg" fontFamily="mono" fontWeight="bold" color={retroColors.darkBrown}>
          {value}
        </Text>
        {change && (
          <Text fontSize="xs" color={retroColors.green} fontWeight="bold">
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
    <VStack align="stretch" spacing={2} p={3} bg={retroColors.beige} borderRadius="md">
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="medium" color={retroColors.darkBrown}>
          {title}
        </Text>
        <Text fontSize="xs" fontFamily="mono" color={retroColors.brown}>
          {progress}%
        </Text>
      </HStack>
      <Progress
        value={progress}
        colorScheme="custom"
        bg={retroColors.beige}
        borderRadius="full"
        height="8px"
        sx={{
          "& > div": {
            background: `linear-gradient(90deg, ${color}, ${color}CC)`
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
      bg={`linear-gradient(135deg, ${color}15, ${color}05)`}
      borderRadius="lg"
      p={4}
      borderWidth="2px"
      borderColor={color}
      transform="rotate(-1deg)"
      _hover={{ transform: "rotate(0deg) scale(1.02)", transition: "all 0.2s" }}
    >
      <Text fontSize="sm" fontWeight="bold" color={retroColors.darkBrown} mb={2}>
        {title}
      </Text>
      <Text fontSize="xs" color={retroColors.brown} mb={3}>
        {metric}
      </Text>
      <Button
        size="xs"
        bg={color}
        color="white"
        borderRadius="full"
        _hover={{ bg: color, transform: "scale(1.05)" }}
        fontFamily="mono"
      >
        Practice Now
      </Button>
    </Box>
  );
}

export function Dashboard({ username = "User" }: { username?: string }) {
  const bgColor = useColorModeValue(retroColors.cream, retroColors.darkBrown);

  return (
    <Box
      minH="100vh"
      bg={`linear-gradient(135deg, ${retroColors.cream}, ${retroColors.beige})`}
      position="relative"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(139, 69, 19, 0.03) 2px,
          rgba(139, 69, 19, 0.03) 4px
        )`,
        pointerEvents: "none",
        opacity: 0.5
      }}
    >
      {/* Header */}
      <Box
        bg={retroColors.cream}
        borderBottomWidth="4px"
        borderBottomColor={retroColors.burntOrange}
        py={3}
        px={6}
        position="sticky"
        top={0}
        zIndex={100}
        boxShadow="md"
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Heading
              size="lg"
              fontFamily="mono"
              color={retroColors.darkBrown}
              letterSpacing="2px"
            >
              🎤 FLUENTLY
            </Heading>
          </HStack>
          <HStack spacing={4}>
            <HStack
              spacing={2}
              px={3}
              py={1}
              borderRadius="full"
              bg={retroColors.beige}
              borderWidth="2px"
              borderColor={retroColors.burntOrange}
            >
              <Text fontSize="sm" fontFamily="mono">Home</Text>
              <Text fontSize="sm" fontFamily="mono" color={retroColors.brown}>Practice</Text>
              <Text fontSize="sm" fontFamily="mono" color={retroColors.brown}>Progress</Text>
              <Text fontSize="sm" fontFamily="mono" color={retroColors.brown}>Exercises</Text>
              <Text fontSize="sm" fontFamily="mono" color={retroColors.brown}>Settings</Text>
            </HStack>
            <IconButton
              aria-label="Notifications"
              icon={<BellIcon />}
              variant="ghost"
              borderRadius="full"
              borderWidth="2px"
              borderColor={retroColors.teal}
            />
            <Avatar
              name={username}
              size="sm"
              borderWidth="3px"
              borderColor={retroColors.purple}
              borderRadius="md"
            />
          </HStack>
        </Flex>
      </Box>

      <Container maxW="7xl" py={8} position="relative" zIndex={1}>
        {/* Hero Welcome Section */}
        <Box
          bg={`linear-gradient(135deg, ${retroColors.beige}, ${retroColors.cream})`}
          borderRadius="2xl"
          p={6}
          mb={6}
          borderWidth="3px"
          borderColor={retroColors.teal}
          position="relative"
          _before={{
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B4513' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            opacity: 0.3,
            borderRadius: "2xl"
          }}
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            gap={4}
          >
            <VStack align="flex-start" spacing={2}>
              <Heading size="xl" fontFamily="mono" color={retroColors.darkBrown}>
                Welcome back, {username}! 👋
              </Heading>
              <Box
                bg="white"
                borderRadius="xl"
                px={4}
                py={2}
                borderWidth="2px"
                borderColor={retroColors.purple}
                position="relative"
                _before={{
                  content: '""',
                  position: "absolute",
                  left: "-8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 0,
                  height: 0,
                  borderTop: "8px solid transparent",
                  borderBottom: "8px solid transparent",
                  borderRight: `8px solid ${retroColors.purple}`
                }}
              >
                <Text fontSize="sm" color={retroColors.brown} fontStyle="italic">
                  "Practice makes progress, not perfection. Keep going! 💪"
                </Text>
              </Box>
            </VStack>
            <HStack spacing={4}>
              <Box
                bg={retroColors.darkBrown}
                color={retroColors.yellow}
                px={4}
                py={2}
                borderRadius="lg"
                borderWidth="2px"
                borderColor={retroColors.burntOrange}
                fontFamily="mono"
                fontSize="lg"
                fontWeight="bold"
              >
                🔥 7 Day Streak
              </Box>
              <Button
                size="lg"
                bg={retroColors.burntOrange}
                color="white"
                borderRadius="xl"
                px={8}
                py={6}
                fontFamily="mono"
                fontSize="lg"
                fontWeight="bold"
                boxShadow="0 4px 0 rgba(0,0,0,0.2)"
                _hover={{
                  transform: "translateY(2px)",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.2)"
                }}
                _active={{
                  transform: "translateY(4px)",
                  boxShadow: "none"
                }}
              >
                START NEW SESSION
              </Button>
            </HStack>
          </Flex>
        </Box>

        {/* Modular Card Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {/* Module 1: Today's Quick Stats */}
          <RetroCard title="Today's Performance 📊" accentColor={retroColors.teal}>
            <VStack spacing={4} align="stretch">
              <StatPill label="Fluency Score" value="78/100" change="+5" color={retroColors.teal} />
              <StatPill label="Practice Time" value="12 min" color={retroColors.burntOrange} />
              <StatPill label="Sessions" value="2" color={retroColors.purple} />
              <Box mt={2}>
                <Text fontSize="xs" color={retroColors.brown} mb={2} fontFamily="mono">
                  Progress Gauge
                </Text>
                <Box
                  w="100%"
                  h="60px"
                  bg={retroColors.beige}
                  borderRadius="full"
                  borderWidth="3px"
                  borderColor={retroColors.teal}
                  position="relative"
                  overflow="hidden"
                >
                  <Box
                    w="78%"
                    h="100%"
                    bg={`linear-gradient(90deg, ${retroColors.teal}, ${retroColors.green})`}
                    borderRadius="full"
                  />
                  <Text
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    fontFamily="mono"
                    fontWeight="bold"
                    color={retroColors.darkBrown}
                  >
                    78%
                  </Text>
                </Box>
              </Box>
            </VStack>
          </RetroCard>

          {/* Module 2: Your Progress Journey */}
          <RetroCard
            title="30-Day Progress 📈"
            accentColor={retroColors.burntOrange}
            gridColumn={{ base: 1, md: "span 2", lg: "span 1" }}
          >
            <Box
              bg="white"
              p={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={retroColors.brown}
              position="relative"
              _before={{
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                  linear-gradient(rgba(139, 69, 19, 0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(139, 69, 19, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
                opacity: 0.5,
                borderRadius: "lg"
              }}
            >
              <VStack spacing={3} align="stretch">
                <HStack spacing={2} flexWrap="wrap">
                  <Badge bg={retroColors.burntOrange} color="white" px={2} py={1} borderRadius="md">
                    Fluency
                  </Badge>
                  <Badge bg={retroColors.teal} color="white" px={2} py={1} borderRadius="md">
                    Accent
                  </Badge>
                  <Badge bg={retroColors.purple} color="white" px={2} py={1} borderRadius="md">
                    Vocabulary
                  </Badge>
                </HStack>
                <Box h="200px" position="relative">
                  <Text
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    fontFamily="mono"
                    fontSize="sm"
                    color={retroColors.brown}
                  >
                    📊 Graph visualization
                    <br />
                    (30-day trend lines)
                  </Text>
                </Box>
              </VStack>
            </Box>
          </RetroCard>

          {/* Module 3: Active Challenges */}
          <RetroCard title="Your Missions 🎯" accentColor={retroColors.purple}>
            <VStack spacing={3} align="stretch">
              <ChallengeItem
                title="Master the 'th' sound"
                progress={60}
                color={retroColors.teal}
              />
              <ChallengeItem
                title="Reduce filler words to <3/min"
                progress={40}
                color={retroColors.burntOrange}
              />
              <ChallengeItem
                title="Practice 5 days in a row"
                progress={80}
                color={retroColors.purple}
              />
            </VStack>
          </RetroCard>

          {/* Module 4: Recent Sessions */}
          <RetroCard
            title="Recent Practice Sessions 🎙️"
            accentColor={retroColors.teal}
            gridColumn={{ base: 1, md: "span 2" }}
          >
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={retroColors.beige}>
                    <Th fontFamily="mono" color={retroColors.darkBrown}>Date</Th>
                    <Th fontFamily="mono" color={retroColors.darkBrown}>Duration</Th>
                    <Th fontFamily="mono" color={retroColors.darkBrown}>Fluency</Th>
                    <Th fontFamily="mono" color={retroColors.darkBrown}>Action</Th>
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
                      bg={idx % 2 === 0 ? retroColors.cream : retroColors.beige}
                      _hover={{ bg: retroColors.yellow + "20", transform: "translateX(4px)" }}
                      transition="all 0.2s"
                    >
                      <Td fontFamily="mono" color={retroColors.brown}>{session.date}</Td>
                      <Td fontFamily="mono" color={retroColors.brown}>{session.duration}</Td>
                      <Td fontFamily="mono" color={retroColors.darkBrown} fontWeight="bold">
                        {session.fluency}
                      </Td>
                      <Td>
                        <Button
                          size="xs"
                          bg={retroColors.teal}
                          color="white"
                          borderRadius="full"
                          fontFamily="mono"
                        >
                          View Report
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </RetroCard>

          {/* Module 5: Problem Areas Focus */}
          <RetroCard title="Areas Needing Attention ⚠️" accentColor={retroColors.burntOrange}>
            <VStack spacing={3} align="stretch">
              <ProblemAreaCard
                title="TH Sound"
                metric="Mispronounced 8/12 times"
                color={retroColors.teal}
              />
              <ProblemAreaCard
                title="Word Pauses"
                metric="Average 2.3 sec pauses"
                color={retroColors.burntOrange}
              />
              <ProblemAreaCard
                title="Filler Words"
                metric="18 'um/uh' per session"
                color={retroColors.purple}
              />
            </VStack>
          </RetroCard>

          {/* Module 6: Personalized Tip */}
          <RetroCard title="Coach's Tip of the Day 💡" accentColor={retroColors.green}>
            <Box
              bg={retroColors.darkBrown}
              color={retroColors.green}
              p={4}
              borderRadius="lg"
              fontFamily="mono"
              fontSize="sm"
              borderWidth="2px"
              borderColor={retroColors.green}
              position="relative"
              _before={{
                content: '""',
                position: "absolute",
                bottom: "8px",
                right: "8px",
                width: "8px",
                height: "16px",
                bg: retroColors.green,
                animation: "blink 1s infinite"
              }}
              sx={{
                "@keyframes blink": {
                  "0%, 50%": { opacity: 1 },
                  "51%, 100%": { opacity: 0 }
                }
              }}
            >
              <Text mb={2}>
                Your 'v/w' confusion improved 30% this week! Keep practicing words like 'very',
                'wave', and 'vowel'. Try saying them 10 times before your next session.
              </Text>
              <Button
                size="xs"
                bg={retroColors.green}
                color={retroColors.darkBrown}
                borderRadius="full"
                fontFamily="mono"
                mt={2}
              >
                Next Tip
              </Button>
            </Box>
          </RetroCard>

          {/* Module 7: Recommended Practice */}
          <RetroCard
            title="Suggested for You 🎯"
            accentColor={retroColors.purple}
            gridColumn={{ base: 1, md: "span 2" }}
          >
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {[
                { title: "TH Sound Drills", duration: "5 min", level: "Beginner", color: retroColors.teal },
                { title: "Word Association Game", duration: "10 min", level: "Intermediate", color: retroColors.burntOrange },
                { title: "Job Interview Simulation", duration: "15 min", level: "Advanced", color: retroColors.purple }
              ].map((exercise, idx) => (
                <Box
                  key={idx}
                  bg={`linear-gradient(135deg, ${exercise.color}15, ${exercise.color}05)`}
                  borderRadius="lg"
                  p={4}
                  borderWidth="2px"
                  borderColor={exercise.color}
                >
                  <Text fontSize="sm" fontWeight="bold" color={retroColors.darkBrown} mb={2}>
                    {exercise.title}
                  </Text>
                  <HStack spacing={2} mb={3}>
                    <Badge bg={exercise.color} color="white" fontSize="xs">
                      {exercise.duration}
                    </Badge>
                    <Badge bg={retroColors.beige} color={retroColors.brown} fontSize="xs">
                      {exercise.level}
                    </Badge>
                  </HStack>
                  <Button
                    size="sm"
                    bg={exercise.color}
                    color="white"
                    w="full"
                    borderRadius="full"
                    fontFamily="mono"
                  >
                    Start
                  </Button>
                </Box>
              ))}
            </SimpleGrid>
          </RetroCard>

          {/* Module 8: Community Highlights */}
          <RetroCard title="Community Corner 🌟" accentColor={retroColors.yellow}>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" fontFamily="mono" color={retroColors.darkBrown} fontWeight="bold">
                Top Improvers This Week
              </Text>
              {[
                { user: "User_A2X", improvement: "25%", rank: 1 },
                { user: "User_B7Y", improvement: "22%", rank: 2 },
                { user: "User_C9Z", improvement: "20%", rank: 3 }
              ].map((item) => (
                <HStack
                  key={item.rank}
                  bg={retroColors.beige}
                  p={2}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={retroColors.brown}
                >
                  <Text fontSize="lg">
                    {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}
                  </Text>
                  <Text fontSize="sm" fontFamily="mono" color={retroColors.darkBrown} flex={1}>
                    {item.user}
                  </Text>
                  <Text fontSize="xs" fontFamily="mono" color={retroColors.green} fontWeight="bold">
                    +{item.improvement}
                  </Text>
                </HStack>
              ))}
              <Box
                bg={`linear-gradient(135deg, ${retroColors.purple}20, ${retroColors.teal}20)`}
                p={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor={retroColors.purple}
                mt={2}
              >
                <Text fontSize="sm" fontFamily="mono" color={retroColors.darkBrown} textAlign="center">
                  You're in top 30% of active users! 🎉
                </Text>
              </Box>
            </VStack>
          </RetroCard>

          {/* Module 9: Motivation Meter */}
          <RetroCard title="Keep Going! 💪" accentColor={retroColors.green}>
            <VStack spacing={3}>
              <Box
                w="100%"
                h="120px"
                bg={`linear-gradient(135deg, ${retroColors.green}20, ${retroColors.teal}20, ${retroColors.purple}20, ${retroColors.burntOrange}20)`}
                borderRadius="xl"
                borderWidth="3px"
                borderColor={retroColors.green}
                position="relative"
                overflow="hidden"
              >
                <Box
                  w="80%"
                  h="100%"
                  bg={`linear-gradient(90deg, ${retroColors.green}, ${retroColors.teal})`}
                  borderRadius="xl"
                  position="relative"
                >
                  <Text
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    fontFamily="mono"
                    fontWeight="bold"
                    color={retroColors.darkBrown}
                    fontSize="lg"
                  >
                    80%
                  </Text>
                </Box>
              </Box>
              <Text fontSize="sm" color={retroColors.brown} textAlign="center" fontFamily="mono">
                You're 80% toward your weekly goal!
              </Text>
              <Text fontSize="xs" color={retroColors.darkBrown} textAlign="center">
                Practice 1 more session to unlock 'Bronze Speaker' badge 🏅
              </Text>
            </VStack>
          </RetroCard>
        </SimpleGrid>
      </Container>

      {/* Footer */}
      <Box
        bg={retroColors.darkBrown}
        color={retroColors.cream}
        py={4}
        px={6}
        mt={8}
        borderTopWidth="4px"
        borderTopColor={retroColors.burntOrange}
      >
        <Flex
          justify="space-between"
          align="center"
          direction={{ base: "column", md: "row" }}
          gap={4}
        >
          <HStack spacing={4} flexWrap="wrap" justify="center">
            <Link fontSize="sm" fontFamily="mono" color={retroColors.cream}>
              Help Center
            </Link>
            <Text fontSize="sm" color={retroColors.brown}>|</Text>
            <Link fontSize="sm" fontFamily="mono" color={retroColors.cream}>
              Feedback
            </Link>
            <Text fontSize="sm" color={retroColors.brown}>|</Text>
            <Link fontSize="sm" fontFamily="mono" color={retroColors.cream}>
              Report a Bug
            </Link>
            <Text fontSize="sm" color={retroColors.brown}>|</Text>
            <Link fontSize="sm" fontFamily="mono" color={retroColors.cream}>
              Share with Friends
            </Link>
          </HStack>
          <Text fontSize="lg">👋</Text>
        </Flex>
      </Box>
    </Box>
  );
}

