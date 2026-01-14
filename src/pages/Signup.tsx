import { useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Checkbox,
  Link,
  FormErrorMessage,
  FormHelperText,
  HStack,
  Icon,
  Progress,
  Tooltip,
  IconButton,
  InputGroup,
  InputRightElement,
  Button as ChakraButton
} from "@chakra-ui/react";
import { Button } from "../components/ui/button";
import { InfoIcon, ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { supabase } from "../lib/supabase";
import { useToast } from "@chakra-ui/react";

interface FormData {
  username: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  nativeLanguage: string;
  primaryGoal: string;
  englishProficiency: string;
  region: string;
  phoneNumber: string;
  referralCode: string;
  termsAccepted: boolean;
}

type FormErrors = {
  [K in keyof FormData]?: string;
};

function getPasswordStrength(password: string): {
  strength: number;
  label: string;
  color: string;
} {
  if (password.length === 0) {
    return { strength: 0, label: "", color: "gray" };
  }
  if (password.length < 8) {
    return { strength: 25, label: "Too short", color: "red" };
  }
  let strength = 25;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 15;
  if (/[^a-zA-Z\d]/.test(password)) strength += 10;

  if (strength < 50) return { strength, label: "Weak", color: "red" };
  if (strength < 75) return { strength, label: "Fair", color: "orange" };
  if (strength < 90) return { strength, label: "Good", color: "blue" };
  return { strength, label: "Strong", color: "green" };
}

export function SignupPage({
  onSwitchToLogin,
  onSignupSuccess
}: {
  onSwitchToLogin: () => void;
  onSignupSuccess: (username: string) => void;
}) {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    nativeLanguage: "",
    primaryGoal: "",
    englishProficiency: "",
    region: "",
    phoneNumber: "",
    referralCode: "",
    termsAccepted: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const validateField = (name: keyof FormData, value: string | boolean): string | undefined => {
    switch (name) {
      case "username":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Username is required";
        }
        if (typeof value === "string" && value.length < 3) {
          return "Username must be at least 3 characters";
        }
        break;
      case "fullName":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Full name is required";
        }
        break;
      case "email":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Email is required";
        }
        if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Please enter a valid email address";
        }
        break;
      case "password":
        if (!value || (typeof value === "string" && value.length < 8)) {
          return "Password must be at least 8 characters";
        }
        break;
      case "confirmPassword":
        if (!value || (typeof value === "string" && value !== formData.password)) {
          return "Passwords do not match";
        }
        break;
      case "age":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Age is required";
        }
        const ageNum = typeof value === "string" ? parseInt(value, 10) : 0;
        if (isNaN(ageNum) || ageNum < 13) {
          return "You must be 13 or older to use this platform";
        }
        break;
      case "nativeLanguage":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Native language is required";
        }
        break;
      case "primaryGoal":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Please select your primary goal";
        }
        break;
      case "englishProficiency":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Please select your English proficiency level";
        }
        break;
      case "region":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Region/Location is required";
        }
        break;
      case "termsAccepted":
        if (!value) {
          return "You must accept the Terms of Service and Privacy Policy";
        }
        break;
    }
    return undefined;
  };

  const handleChange = (name: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    // Validate all required fields
    (Object.keys(formData) as Array<keyof FormData>).forEach((key) => {
      if (key !== "phoneNumber" && key !== "referralCode") {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create profile entry (if not handled by trigger)
        // Some setups use a DB trigger to create profiles automatically. 
        // We'll attempt an upsert just in case, or let it fail if trigger exists.
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: formData.username,
            full_name: formData.fullName,
            native_languages: [formData.nativeLanguage],
            learning_motivation: [formData.primaryGoal],
            location_country: formData.region,
          });

        if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors if trigger already created it
          console.error('Profile creation error:', profileError);
        }
      }

      setIsSubmitting(false);
      setShowSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        onSignupSuccess(formData.username || formData.fullName || "User");
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsSubmitting(false);
    }
  };


  if (showSuccess) {
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
            textAlign="center"
          >
            <Stack spacing={4}>
              <Text fontSize="4xl">✅</Text>
              <Heading size="lg" color="green.600">
                Account Created Successfully!
              </Heading>
              <Text color="gray.600">
                Redirecting to your dashboard...
              </Text>
            </Stack>
          </Box>
        </Container>
      </Box>
    );
  }

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
      <Container maxW="2xl" position="relative" zIndex={1}>
        <Box
          bg="white"
          borderRadius="2xl"
          boxShadow="2xl"
          borderWidth="1px"
          borderColor="gray.100"
          p={{ base: 6, md: 8 }}
          maxH="90vh"
          overflowY="auto"
        >
          <Stack spacing={6}>
            <Stack spacing={1} textAlign="center">
              <Heading size="lg">Create an account</Heading>
              <Text fontSize="sm" color="gray.600">
                Start your journey to better communication
              </Text>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack spacing={5}>
                {/* Username */}
                <FormControl isInvalid={!!errors.username} isRequired>
                  <FormLabel fontSize="sm">
                    <HStack spacing={1}>
                      <Text>Username</Text>
                      <Text fontSize="xs" color="gray.500">(Unique identifier)</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    type="text"
                    placeholder="johndoe"
                    size="md"
                    borderRadius="lg"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    onBlur={() => {
                      const error = validateField("username", formData.username);
                      setErrors((prev) => ({ ...prev, username: error }));
                    }}
                  />
                  <FormErrorMessage>{errors.username}</FormErrorMessage>
                </FormControl>

                {/* Full Name */}
                <FormControl isInvalid={!!errors.fullName} isRequired>
                  <FormLabel fontSize="sm">Full Name</FormLabel>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    size="md"
                    borderRadius="lg"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    onBlur={() => {
                      const error = validateField("fullName", formData.fullName);
                      setErrors((prev) => ({ ...prev, fullName: error }));
                    }}
                  />
                  <FormErrorMessage>{errors.fullName}</FormErrorMessage>
                </FormControl>

                {/* Email */}
                <FormControl isInvalid={!!errors.email} isRequired>
                  <FormLabel fontSize="sm">Email Address</FormLabel>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    size="md"
                    borderRadius="lg"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => {
                      const error = validateField("email", formData.email);
                      setErrors((prev) => ({ ...prev, email: error }));
                    }}
                  />
                  <FormHelperText fontSize="xs">
                    For account verification and communication
                  </FormHelperText>
                  <FormErrorMessage>{errors.email}</FormErrorMessage>
                </FormControl>

                {/* Password */}
                <FormControl isInvalid={!!errors.password} isRequired>
                  <FormLabel fontSize="sm">Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      size="md"
                      borderRadius="lg"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      onBlur={() => {
                        const error = validateField("password", formData.password);
                        setErrors((prev) => ({ ...prev, password: error }));
                      }}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  {formData.password && (
                    <Stack spacing={1} mt={2}>
                      <Progress
                        value={passwordStrength.strength}
                        colorScheme={passwordStrength.color}
                        size="sm"
                        borderRadius="full"
                      />
                      <FormHelperText fontSize="xs" color={passwordStrength.color + ".600"}>
                        {passwordStrength.label}
                      </FormHelperText>
                    </Stack>
                  )}
                  <FormHelperText fontSize="xs">
                    Minimum 8 characters
                  </FormHelperText>
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                {/* Confirm Password */}
                <FormControl isInvalid={!!errors.confirmPassword} isRequired>
                  <FormLabel fontSize="sm">Confirm Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      size="md"
                      borderRadius="lg"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      onBlur={() => {
                        const error = validateField("confirmPassword", formData.confirmPassword);
                        setErrors((prev) => ({ ...prev, confirmPassword: error }));
                      }}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                </FormControl>

                {/* Age */}
                <FormControl isInvalid={!!errors.age} isRequired>
                  <FormLabel fontSize="sm">Age</FormLabel>
                  <Input
                    type="number"
                    placeholder="25"
                    size="md"
                    borderRadius="lg"
                    min={13}
                    value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    onBlur={() => {
                      const error = validateField("age", formData.age);
                      setErrors((prev) => ({ ...prev, age: error }));
                    }}
                  />
                  <FormHelperText fontSize="xs">
                    Must be 13+ for child safety compliance
                  </FormHelperText>
                  <FormErrorMessage>{errors.age}</FormErrorMessage>
                </FormControl>

                {/* Native Language */}
                <FormControl isInvalid={!!errors.nativeLanguage} isRequired>
                  <FormLabel fontSize="sm">
                    <HStack spacing={2}>
                      <Text>Native Language</Text>
                      <Tooltip
                        label="This helps us provide personalized accent analysis and pronunciation guidance tailored to your language background."
                        fontSize="xs"
                      >
                        <Icon as={InfoIcon} color="gray.400" boxSize={3} cursor="help" />
                      </Tooltip>
                    </HStack>
                  </FormLabel>
                  <Select
                    placeholder="Select your native language"
                    size="md"
                    borderRadius="lg"
                    value={formData.nativeLanguage}
                    onChange={(e) => handleChange("nativeLanguage", e.target.value)}
                    onBlur={() => {
                      const error = validateField("nativeLanguage", formData.nativeLanguage);
                      setErrors((prev) => ({ ...prev, nativeLanguage: error }));
                    }}
                  >
                    <option value="Hindi">Hindi</option>
                    <option value="Punjabi">Punjabi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="English">English</option>
                    <option value="Other">Other</option>
                  </Select>
                  <FormErrorMessage>{errors.nativeLanguage}</FormErrorMessage>
                </FormControl>

                {/* Primary Goal */}
                <FormControl isInvalid={!!errors.primaryGoal} isRequired>
                  <FormLabel fontSize="sm">Primary Goal</FormLabel>
                  <Select
                    placeholder="Select your primary goal"
                    size="md"
                    borderRadius="lg"
                    value={formData.primaryGoal}
                    onChange={(e) => handleChange("primaryGoal", e.target.value)}
                    onBlur={() => {
                      const error = validateField("primaryGoal", formData.primaryGoal);
                      setErrors((prev) => ({ ...prev, primaryGoal: error }));
                    }}
                  >
                    <option value="stuttering">Improve stuttering/stammering</option>
                    <option value="accent">Reduce accent interference</option>
                    <option value="word-retrieval">Improve word retrieval/fluency</option>
                    <option value="pronunciation">Improve pronunciation</option>
                    <option value="general">General communication improvement</option>
                    <option value="all">All of the above</option>
                  </Select>
                  <FormErrorMessage>{errors.primaryGoal}</FormErrorMessage>
                </FormControl>

                {/* English Proficiency */}
                <FormControl isInvalid={!!errors.englishProficiency} isRequired>
                  <FormLabel fontSize="sm">Current English Proficiency</FormLabel>
                  <Select
                    placeholder="Select your level"
                    size="md"
                    borderRadius="lg"
                    value={formData.englishProficiency}
                    onChange={(e) => handleChange("englishProficiency", e.target.value)}
                    onBlur={() => {
                      const error = validateField("englishProficiency", formData.englishProficiency);
                      setErrors((prev) => ({ ...prev, englishProficiency: error }));
                    }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                  <FormErrorMessage>{errors.englishProficiency}</FormErrorMessage>
                </FormControl>

                {/* Region/Location */}
                <FormControl isInvalid={!!errors.region} isRequired>
                  <FormLabel fontSize="sm">Region/Location</FormLabel>
                  <Input
                    type="text"
                    placeholder="Mumbai, Maharashtra"
                    size="md"
                    borderRadius="lg"
                    value={formData.region}
                    onChange={(e) => handleChange("region", e.target.value)}
                    onBlur={() => {
                      const error = validateField("region", formData.region);
                      setErrors((prev) => ({ ...prev, region: error }));
                    }}
                  />
                  <FormHelperText fontSize="xs">
                    City/State (helps with accent analysis context)
                  </FormHelperText>
                  <FormErrorMessage>{errors.region}</FormErrorMessage>
                </FormControl>

                {/* Phone Number (Optional) */}
                <FormControl>
                  <FormLabel fontSize="sm">Phone Number (Optional)</FormLabel>
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    size="md"
                    borderRadius="lg"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  />
                  <FormHelperText fontSize="xs">
                    For future SMS notifications
                  </FormHelperText>
                </FormControl>

                {/* Referral Code (Optional) */}
                <FormControl>
                  <FormLabel fontSize="sm">Referral Code (Optional)</FormLabel>
                  <Input
                    type="text"
                    placeholder="ABC123"
                    size="md"
                    borderRadius="lg"
                    value={formData.referralCode}
                    onChange={(e) => handleChange("referralCode", e.target.value)}
                  />
                </FormControl>

                {/* Terms and Conditions */}
                <FormControl isInvalid={!!errors.termsAccepted} isRequired>
                  <Checkbox
                    size="sm"
                    colorScheme="blue"
                    isChecked={formData.termsAccepted}
                    onChange={(e) => {
                      handleChange("termsAccepted", e.target.checked);
                      if (errors.termsAccepted) {
                        setErrors((prev) => ({ ...prev, termsAccepted: undefined }));
                      }
                    }}
                  >
                    <Text fontSize="sm">
                      I agree to the{" "}
                      <Link color="blue.500" fontWeight="medium">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link color="blue.500" fontWeight="medium">
                        Privacy Policy
                      </Link>
                    </Text>
                  </Checkbox>
                  {errors.termsAccepted && (
                    <FormErrorMessage mt={1}>{errors.termsAccepted}</FormErrorMessage>
                  )}
                </FormControl>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="md"
                  w="full"
                  isLoading={isSubmitting}
                  loadingText="Creating account..."
                >
                  Create Account
                </Button>

                {/* Google Sign Up */}
                <ChakraButton
                  variant="outline"
                  size="md"
                  w="full"
                  borderRadius="full"
                  leftIcon={<Text>🔵</Text>}
                >
                  Sign up with Google
                </ChakraButton>

                {/* Login Link */}
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  Already have an account?{" "}
                  <Link
                    color="blue.500"
                    fontWeight="medium"
                    onClick={(e) => {
                      e.preventDefault();
                      onSwitchToLogin();
                    }}
                  >
                    Log in
                  </Link>
                </Text>
              </Stack>
            </form>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

