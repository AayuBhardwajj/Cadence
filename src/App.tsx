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

// Layouts
import { SettingsLayout } from "./layouts/SettingsLayout";

// Pages
import { ProfilePage } from "./pages/profile/ProfilePage";
import { AnalyticsPage } from "./pages/profile/AnalyticsPage";
import { AchievementsPage } from "./pages/profile/AchievementsPage";
// HistoryPage removed
import { AccountSettings } from "./pages/settings/AccountSettings";
import { GoalsSettings } from "./pages/settings/GoalsSettings";
import { BillingSettings } from "./pages/settings/BillingSettings";
import { NotificationSettings } from "./pages/settings/NotificationSettings";
import { LanguageSettings } from "./pages/settings/LanguageSettings";
import { AppearanceSettings } from "./pages/settings/AppearanceSettings";
import { DevicesSettings } from "./pages/settings/DevicesSettings";
import { PrivacySettings } from "./pages/settings/PrivacySettings";
import { HelpPage } from "./pages/help/HelpPage";
import { PracticePage } from "./pages/Practice";
import { ProgressPage } from "./pages/Progress";
import { ExercisesPage } from "./pages/Exercises";
import { CommunityPage } from "./pages/Community";



import { ProfileProvider } from "./lib/ProfileContext";
import { AccessibilityProvider } from "./lib/AccessibilityContext";
import { NotificationsProvider } from "./lib/NotificationsContext";
import { ThemeProvider } from "./lib/ThemeContext";
import { LanguageProvider } from "./lib/LanguageContext"; // Assuming this is also needed for the render tree

// ...

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (


    <ProfileProvider>
      <NotificationsProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <Router>
                {session ? (
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/pre-recording" element={<PreRecording />} />
                    <Route path="/practice" element={<PracticePage />} />
                    <Route path="/progress" element={<ProgressPage />} />
                    <Route path="/exercises" element={<ExercisesPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Settings & Profile Routes */}
                    <Route element={<SettingsLayout />}>

                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/achievements" element={<AchievementsPage />} />

                      <Route path="/help" element={<HelpPage />} />

                      <Route path="/settings">
                        <Route path="account" element={<AccountSettings />} />
                        <Route path="goals" element={<GoalsSettings />} />
                        <Route path="billing" element={<BillingSettings />} />
                        <Route path="notifications" element={<NotificationSettings />} />
                        <Route path="language" element={<LanguageSettings />} />
                        <Route path="appearance" element={<AppearanceSettings />} />
                        <Route path="devices" element={<DevicesSettings />} />
                        <Route path="privacy" element={<PrivacySettings />} />
                      </Route>
                    </Route>

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
                            onLoginSuccess={() => { }}
                          />
                        ) : (
                          <SignupPage
                            onSwitchToLogin={() => setIsLogin(true)}
                            onSignupSuccess={() => { }}
                          />
                        )
                      } />
                    </Routes>
                  </Box>
                )}
              </Router>
            </AccessibilityProvider>
          </LanguageProvider>
        </ThemeProvider>
      </NotificationsProvider>
    </ProfileProvider>


  );
}

