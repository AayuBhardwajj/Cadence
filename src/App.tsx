import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  SimpleGrid,
  Tag,
  TagLabel,
  useBreakpointValue,
  VStack
} from "@chakra-ui/react";
import * as Tabs from "@radix-ui/react-tabs";
import { Player } from "@lottiefiles/react-lottie-player";
import { Button } from "./components/ui/button";
import { RelatableCard } from "./components/arcenity/RelatableCard";

const heroAnimationSrc =
  "https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json";

function Hero() {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box bgGradient="linear(to-b, white, blue.50)" py={{ base: 10, md: 20 }}>
      <Container maxW="6xl">
        <Flex
          direction={{ base: "column", md: "row" }}
          align="center"
          gap={{ base: 10, md: 16 }}
        >
          <Stack spacing={6} flex="1">
            <Tag
              size="lg"
              borderRadius="full"
              bg="blue.50"
              color="blue.700"
              alignSelf="flex-start"
            >
              <TagLabel>Cadence · Design your rhythm</TagLabel>
            </Tag>
            <Heading
              as="h1"
              size={useBreakpointValue({ base: "2xl", md: "3xl" })}
              lineHeight="short"
            >
              Light-weight rituals for
              <br />
              teams who hate heavy process.
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="lg">
              Craft weekly cadences, standups, and retros that actually feel
              human. Borrow patterns from teams that ship fast without burning
              out.
            </Text>
            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              <Button size="lg">Start a cadence</Button>
              <Button size="lg" variant="outline">
                View sample rituals
              </Button>
            </Stack>
            <Text fontSize="sm" color="gray.500">
              No logins to start. Just pick a template and share a link with
              your team.
            </Text>
          </Stack>

          <Box flex="1" w="full">
            <Player
              autoplay
              loop
              controls={false}
              src={heroAnimationSrc}
              style={{
                height: isMobile ? "260px" : "360px",
                width: "100%"
              }}
            />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: "Ritual templates",
      description:
        "Borrow cadences from high-performing teams: weekly kickoffs, async standups, and lightweight retros."
    },
    {
      title: "People-first prompts",
      description:
        "Lottiefiles-style micro-animations keep things playful while prompts keep conversations grounded."
    },
    {
      title: "Signal over noise",
      description:
        "Each cadence ends with a tiny summary: what changed, what matters, and what we’re trying next."
    },
    {
      title: "No heavy tooling",
      description:
        "Your cadence lives on a simple page: drop the link into Slack, Notion, or your existing tools."
    }
  ];

  return (
    <Box py={{ base: 12, md: 16 }}>
      <Container maxW="6xl">
        <Stack spacing={6} mb={8} textAlign="center">
          <Heading size="lg">Built for the way modern teams actually work</Heading>
          <Text color="gray.600" maxW="2xl" mx="auto">
            A calm, bright surface where everyone can see the rhythm of the week
            — without adding another dashboard to check.
          </Text>
        </Stack>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {features.map((feature) => (
            <Box
              key={feature.title}
              bg="white"
              borderRadius="2xl"
              p={6}
              boxShadow="sm"
              borderWidth="1px"
              borderColor="gray.100"
            >
              <Heading size="md" mb={3}>
                {feature.title}
              </Heading>
              <Text color="gray.600" fontSize="sm">
                {feature.description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

function PersonasTabs() {
  return (
    <Box bg="white" py={{ base: 12, md: 16 }}>
      <Container maxW="6xl">
        <Stack spacing={6} mb={6} textAlign="center">
          <Heading size="lg">Relatable cadences for real teams</Heading>
          <Text color="gray.600" maxW="2xl" mx="auto">
            Inspired by Arcenity-style personas — see how different teams use
            simple rituals to stay in sync.
          </Text>
        </Stack>

        <Tabs.Root defaultValue="product">
          <Stack
            direction={{ base: "column", md: "row" }}
            spacing={8}
            align="flex-start"
          >
            <Tabs.List
              aria-label="Team personas"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                minWidth: "220px"
              }}
            >
              <Tabs.Trigger
                value="product"
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "9999px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Product trios
              </Tabs.Trigger>
              <Tabs.Trigger
                value="remote"
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "9999px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Fully remote squads
              </Tabs.Trigger>
              <Tabs.Trigger
                value="founders"
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "9999px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Early-stage founders
              </Tabs.Trigger>
            </Tabs.List>

            <Box flex="1">
              <Tabs.Content value="product">
                <RelatableCard
                  title="The 30-min Monday runway"
                  persona="Product trios"
                  description="PM, design, and engineering spend 30 minutes aligning on impact for the week — what’s in motion, what’s blocked, and what success would look like by Friday."
                />
              </Tabs.Content>
              <Tabs.Content value="remote">
                <RelatableCard
                  title="Async standups that don't suck"
                  persona="Remote squads"
                  description="Each teammate drops a short check-in with a mood slider and a GIF. The cadence auto-summarizes themes so your live meetings can stay focused."
                />
              </Tabs.Content>
              <Tabs.Content value="founders">
                <RelatableCard
                  title="Friday founder retro"
                  persona="Founding teams"
                  description="Three prompts, fifteen minutes: what moved the needle, where we felt drag, and one tiny experiment for next week."
                />
              </Tabs.Content>
            </Box>
          </Stack>
        </Tabs.Root>
      </Container>
    </Box>
  );
}

function Footer() {
  return (
    <Box borderTopWidth="1px" borderColor="gray.200" bg="white" py={6} mt={8}>
      <Container maxW="6xl">
        <Flex
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap={3}
        >
          <Text fontSize="sm" color="gray.500">
            © {new Date().getFullYear()} Cadence. Designed for calm, high-signal
            teams.
          </Text>
          <Stack direction="row" spacing={4}>
            <Text fontSize="sm" color="gray.500">
              Product
            </Text>
            <Text fontSize="sm" color="gray.500">
              Ritual Library
            </Text>
            <Text fontSize="sm" color="gray.500">
              Contact
            </Text>
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <Box minH="100vh" bg="gray.50">
      <VStack spacing={0} align="stretch">
        <Hero />
        <FeatureGrid />
        <PersonasTabs />
        <Footer />
      </VStack>
    </Box>
  );
}


