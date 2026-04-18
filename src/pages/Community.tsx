import React, { useEffect, useState } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import { supabase } from "../lib/supabase";
import ChatLayout from "../components/chat/ChatLayout";
import { DashboardBackground } from '../components/dashboard/DashboardBackground';
import { Navbar } from '../components/navigation/Navbar';
import { useProfile } from '../lib/ProfileContext';

export const CommunityPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { displayName } = useProfile();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
        });
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <DashboardBackground>
        <Center h="100vh">
          <Spinner size="xl" color="purple.500" />
        </Center>
      </DashboardBackground>
    );
  }

  if (!currentUser) {
    return (
      <DashboardBackground>
        <div className="flex flex-col min-h-screen">
          <Navbar username={displayName} />
          <Center flexGrow={1}>
            <Box p={8} bg="whiteAlpha.50" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(10px)">
              Please log in to join the community chat.
            </Box>
          </Center>
        </div>
      </DashboardBackground>
    );
  }

  return (
    <DashboardBackground>
      <div className="flex flex-col min-h-screen">
        <Navbar username={displayName} />
        <main className="flex-grow flex flex-col max-w-[1400px] mx-auto w-full px-6 py-6">
          <div className="flex-grow flex min-h-0">
            <ChatLayout currentUser={currentUser} />
          </div>
        </main>
      </div>
    </DashboardBackground>
  );
};
