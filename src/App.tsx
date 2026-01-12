import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { LoginPage } from "./pages/Login";
import { SignupPage } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { Welcome } from "./pages/Welcome";
import { Assessment } from "./pages/Assessment";
import { PreRecording } from "./pages/PreRecording";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState("User");

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) setUsername(session.user.email.split('@')[0]);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) setUsername(session.user.email.split('@')[0]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (user: string) => {
    // For manual non-supabase login (legacy fallback or if we keep the mock)
    // But ideally we rely on Supabase session.
    // For now, allow manual override if session is missing but we want to test "mock" flow?
    // Actually, let's strictly use session if possible, but the Login page currently calls this with "User".
    // We'll keep the session check as the primary source of truth.
  };

  return (
    <Router>
      {session ? (
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/pre-recording" element={<PreRecording />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/dashboard" element={<Dashboard username={username} />} />

          {/* Add Login/Signup as accessible routes too for testing */}
          <Route path="/login" element={<LoginPage onSwitchToSignup={() => { }} onLoginSuccess={() => { }} />} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      ) : (
        <Box minH="100vh" bg="gray.50">
          <Routes>
            {/* Allow direct access to login/signup via URL if needed, or toggle */}
            <Route path="*" element={
              isLogin ? (
                <LoginPage
                  onSwitchToSignup={() => setIsLogin(false)}
                  onLoginSuccess={(u) => { setUsername(u); }}
                />
              ) : (
                <SignupPage
                  onSwitchToLogin={() => setIsLogin(true)}
                  onSignupSuccess={(u) => { setUsername(u); }}
                />
              )
            } />
          </Routes>
        </Box>
      )}
    </Router>
  );
}
