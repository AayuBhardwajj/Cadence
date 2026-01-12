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
  Link,
  Icon,
  useToast
} from "@chakra-ui/react";
import { Button } from "../components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaXTwitter } from "react-icons/fa6";
import { supabase } from "../lib/supabase";
import { useState } from "react";

export function LoginPage({
  onSwitchToSignup,
  onLoginSuccess
}: {
  onSwitchToSignup: () => void;
  onLoginSuccess: (username: string) => void;
}) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const toast = useToast();

  const handleSocialLogin = async (provider: 'google' | 'twitter') => {
    try {
      setLoadingProvider(provider);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setLoadingProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as any)[0].value;
    const password = (e.target as any)[1].value;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // App.tsx listener will handle redirection
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

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
        bg: "radial-gradient(circle at center, rgba(244,114,182,0.45), rgba(59,130,246,0.15))",
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
        bg: "radial-gradient(circle at center, rgba(244,114,182,0.35), rgba(129,140,248,0.2))",
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

            <form onSubmit={handleSubmit}>
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
                <Button type="submit" size="md" w="full">
                  Continue
                </Button>
              </Stack>
            </form>

            <Stack spacing={3}>
              <Text fontSize="xs" color="gray.500" textAlign="center" position="relative">
                <Box as="span" bg="white" px={2} position="relative" zIndex={1}>
                  Or continue with
                </Box>
                <Box
                  position="absolute"
                  top="50%"
                  left="0"
                  right="0"
                  height="1px"
                  bg="gray.200"
                  zIndex={0}
                />
              </Text>

              <Button
                size="md"
                w="full"
                variant="outline"
                leftIcon={<Icon as={FcGoogle} fontSize="xl" />}
                onClick={() => handleSocialLogin('google')}
                isLoading={loadingProvider === 'google'}
              >
                Google
              </Button>
              <Button
                size="md"
                w="full"
                variant="outline"
                leftIcon={<Icon as={FaXTwitter} fontSize="xl" />}
                onClick={() => handleSocialLogin('twitter')}
                isLoading={loadingProvider === 'twitter'}
              >
                X (Twitter)
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
              <Link
                color="blue.500"
                fontWeight="medium"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToSignup();
                }}
                cursor="pointer"
              >
                Create an account
              </Link>
            </Text>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}


