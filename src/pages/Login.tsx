import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Link
} from "@chakra-ui/react";
import { Button } from "../components/ui/button";

export function LoginPage() {
  return (
    <Box
      minH="100vh"
      position="relative"
      overflow="hidden"
      bgGradient="linear(to-br, #e0f2fe, #eef2ff)"
      _before={{
        content: '""',
        position: "absolute",
        top: "-10%",
        left: "10%",
        width: "220px",
        height: "220px",
        bg: "rgba(59,130,246,0.25)",
        filter: "blur(90px)",
        borderRadius: "50%"
      }}
      _after={{
        content: '""',
        position: "absolute",
        bottom: "-12%",
        right: "6%",
        width: "240px",
        height: "240px",
        bg: "rgba(124,58,237,0.22)",
        filter: "blur(100px)",
        borderRadius: "50%"
      }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 4, md: 6 }}
      py={{ base: 10, md: 14 }}
    >
      <Container maxW="md" position="relative" zIndex={1}>
        <Box
          bg="white"
          borderRadius="2xl"
          boxShadow="2xl"
          borderWidth="1px"
          borderColor="gray.100"
          p={{ base: 6, md: 8 }}
        >
          <Stack spacing={6}>
            <Stack spacing={1} textAlign="center">
              <Heading size="lg">Log in</Heading>
              <Text fontSize="sm" color="gray.600">
                Continue your practice journey.
              </Text>
            </Stack>

            <Stack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Email</FormLabel>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  size="md"
                  borderRadius="lg"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Password</FormLabel>
                <Input
                  type="password"
                  placeholder="••••••••"
                  size="md"
                  borderRadius="lg"
                />
              </FormControl>
              <Checkbox size="sm" colorScheme="blue">
                Remember me
              </Checkbox>
              <Button size="md" w="full">
                Continue
              </Button>
            </Stack>

            <Text fontSize="xs" color="gray.500" textAlign="center">
              Forgot password?{" "}
              <Link color="blue.500" fontWeight="medium">
                Reset it
              </Link>
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              New to Fluently?{" "}
              <Link color="blue.500" fontWeight="medium">
                Create an account
              </Link>
            </Text>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}


