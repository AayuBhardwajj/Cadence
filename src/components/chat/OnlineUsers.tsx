import React, { useEffect } from 'react';
import { Box, Flex, Text, VStack, Avatar, Badge } from '@chakra-ui/react';
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
      id: currentUser.id,
      username: currentUser.name,
      avatar_url: currentUser.avatar_url
    });

    return () => {
      untrack();
    };
  }, [currentUser, trackPresence, untrack]);

  return (
    <Flex direction="column" h="100%">
      <Box p={4} borderBottom="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
        <Text fontSize="md" fontWeight="bold">Online Users ({onlineUsers.length})</Text>
      </Box>

      <VStack flex={1} overflowY="auto" align="stretch" spacing={2} p={4}>
        {onlineUsers.map((user) => (
          <Flex
            key={user.id}
            align="center"
            p={2}
            cursor={user.id !== currentUser.id ? 'pointer' : 'default'}
            borderRadius="md"
            _hover={{ bg: user.id !== currentUser.id ? 'gray.100' : 'transparent', _dark: { bg: user.id !== currentUser.id ? 'whiteAlpha.200' : 'transparent' } }}
            onClick={() => {
              if (user.id !== currentUser.id) onStartDM(user);
            }}
          >
            <Box position="relative">
              <Avatar size="sm" src={user.avatar_url || undefined} name={user.username} />
              <Box
                position="absolute"
                bottom="0"
                right="0"
                bg="green.500"
                w="12px"
                h="12px"
                borderRadius="full"
                border="2px solid white"
                _dark={{ border: '2px solid gray.900' }}
              />
            </Box>
            <Text ml={3} fontSize="sm" fontWeight="medium" isTruncated>
              {user.username}
            </Text>
          </Flex>
        ))}
      </VStack>
    </Flex>
  );
}
