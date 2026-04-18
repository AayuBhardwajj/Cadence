import React, { useEffect, useState } from 'react';
import { Box, Button, Flex, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { supabase } from '../../lib/supabase';
import { ChatRoom } from '../../types/chat.types';
import CreateRoomModal from './CreateRoomModal';
import { Hash } from 'lucide-react';

interface RoomListProps {
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  currentUser: any;
}

export default function RoomList({ selectedRoomId, onSelectRoom, currentUser }: RoomListProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRooms(data as ChatRoom[]);
      if (data.length > 0 && !selectedRoomId) {
        onSelectRoom(data[0].id);
      }
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms, selectedRoomId, onSelectRoom]);

  const handleCreated = (roomId: string) => {
    fetchRooms();
    onSelectRoom(roomId);
  };

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
        Rooms
      </Text>

      <VStack flex={1} overflowY="auto" align="stretch" spacing={1}
        sx={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.200", borderRadius: "full" }
        }}
      >
        {rooms.map((room) => {
          const isActive = selectedRoomId === room.id;
          return (
            <Flex
              key={room.id}
              px={3}
              py={2}
              cursor="pointer"
              borderRadius="xl"
              bg={isActive ? 'purple.500' : 'transparent'}
              color={isActive ? 'white' : 'whiteAlpha.600'}
              _hover={isActive ? {} : { bg: "whiteAlpha.100", color: "white" }}
              onClick={() => onSelectRoom(room.id)}
              align="center"
              transition="all 0.2s"
            >
              <Box as={Hash} width="16px" height="16px" mr={2} opacity={isActive ? 1 : 0.6} />
              <Box minW={0}>
                <Text fontWeight="bold" fontSize="sm" isTruncated>{room.name}</Text>
                {room.description && (
                  <Text fontSize="xs" color={isActive ? "whiteAlpha.800" : "whiteAlpha.400"} isTruncated>
                    {room.description}
                  </Text>
                )}
              </Box>
            </Flex>
          );
        })}
      </VStack>

      <Box mt={4}>
        <Button 
          w="100%" 
          colorScheme="purple" 
          size="sm" 
          onClick={onOpen}
          borderRadius="xl"
        >
          Create Room
        </Button>
      </Box>

      <CreateRoomModal
        isOpen={isOpen}
        onClose={onClose}
        currentUser={currentUser}
        onCreated={handleCreated}
      />
    </Flex>
  );
}
