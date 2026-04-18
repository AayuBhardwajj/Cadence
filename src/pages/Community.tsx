import React, { useEffect, useState } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import { supabase } from "../lib/supabase";
import ChatLayout from "../components/chat/ChatLayout";

export const CommunityPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <Center bg="white" _dark={{ bg: 'gray.900' }} h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (!currentUser) {
    return (
      <Center bg="white" _dark={{ bg: 'gray.900' }} h="100vh">
        Please log in to stream community chat.
      </Center>
    );
  }

  return (
    <Box h="100vh" w="100%" overflow="hidden">
      <ChatLayout currentUser={currentUser} />
    </Box>
  );
};
