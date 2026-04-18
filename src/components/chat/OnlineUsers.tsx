import React, { useEffect } from 'react';
import { Box, Flex, Text, VStack, Avatar } from '@chakra-ui/react';
import { usePresence } from '../../hooks/usePresence';

interface OnlineUsersProps {
  currentUser: {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
  };
  onStartDM: (user: any) => void;
}

export default function OnlineUsers({ currentUser, onStartDM }: OnlineUsersProps) {
  const { trackPresence, onlineUsers, untrack } = usePresence();

  useEffect(() => {
    trackPresence({
      user_id: currentUser.id,
      username: currentUser.name,
      avatar_url: currentUser.avatar_url
    });

    return () => {
      untrack();
    };
  }, [currentUser, trackPresence, untrack]);

  return (
    <Flex direction="column" h="100%" p={4}>
      <Text 
        fontSize="xs" 
        fontWeight="bold" 
        color="whiteAlpha.400" 
        textTransform="uppercase" 
        letterSpacing="wider" 
        mb={3}
      >
        Online Now ({onlineUsers.length})
      </Text>

      <VStack flex={1} overflowY="auto" align="stretch" spacing={1}
        sx={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.200", borderRadius: "full" }
        }}
      >
        {onlineUsers.map((user) => (
          <Flex
            key={user.user_id}
            align="center"
            p={2}
            borderRadius="xl"
            cursor={user.user_id !== currentUser.id ? 'pointer' : 'default'}
            _hover={user.user_id !== currentUser.id ? { bg: "whiteAlpha.100" } : {}}
            onClick={() => {
              if (user.user_id !== currentUser.id) onStartDM(user);
            }}
            transition="all 0.2s"
          >
            <Box position="relative">
              <Avatar size="sm" src={user.avatar_url || undefined} name={user.username} />
              <Box
                position="absolute"
                bottom="0"
                right="0"
                bg="green.400"
                w="8px"
                h="8px"
                borderRadius="full"
              />
            </Box>
            <Text ml={3} fontSize="sm" fontWeight="bold" color="white" isTruncated>
              {user.username}
            </Text>
          </Flex>
        ))}
      </VStack>
    </Flex>
  );
}
