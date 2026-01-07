import { Card, CardBody, Heading, Text, HStack, Avatar } from "@chakra-ui/react";

interface RelatableCardProps {
  title: string;
  description: string;
  persona: string;
}

/**
 * Arcenity-style \"relatable\" persona card.
 * Think of it as a narrative slice of a real user with soft, friendly visuals.
 */
export function RelatableCard({ title, description, persona }: RelatableCardProps) {
  return (
    <Card
      bg="white"
      borderRadius="2xl"
      boxShadow="md"
      borderWidth="1px"
      borderColor="gray.100"
      _hover={{ boxShadow: "lg", transform: "translateY(-2px)" }}
      transition="all 0.2s ease-out"
    >
      <CardBody>
        <HStack spacing={4} mb={3}>
          <Avatar name={persona} bg="blue.100" color="blue.700" />
          <Heading size="md">{title}</Heading>
        </HStack>
        <Text fontSize="sm" color="gray.600">
          {description}
        </Text>
      </CardBody>
    </Card>
  );
}


