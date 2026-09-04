// DEAD CODE (2026-09-04 UI Audit): RelatableCard.tsx is confirmed dead code with 0 imports across the project.
// Commented out per Cadence dead-code preservation convention rather than deleted.
// Reference: ai/ARCHITECTURE.md § Component Structure (arcenity directory audit).

/*
import { Card, CardBody, Heading, Text, HStack, Avatar } from "@chakra-ui/react";

interface RelatableCardProps {
  title: string;
  description: string;
  persona: string;
}

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
*/
