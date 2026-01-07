import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { LoginPage } from "./pages/Login";
import { SignupPage } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("User");

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };

  const handleSignupSuccess = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };

  if (isAuthenticated) {
    return <Dashboard username={username} />;
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {isLogin ? (
        <LoginPage
          onSwitchToSignup={() => setIsLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : (
        <SignupPage
          onSwitchToLogin={() => setIsLogin(true)}
          onSignupSuccess={handleSignupSuccess}
        />
      )}
    </Box>
  );
}



