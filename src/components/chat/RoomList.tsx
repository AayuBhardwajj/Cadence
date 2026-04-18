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
    <Flex direction="column" h="100%">
      <Box p={4} borderBottom="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
        <Text fontSize="lg" fontWeight="bold">Community</Text>
      </Box>

      <VStack flex={1} overflowY="auto" align="stretch" spacing={1} p={2}>
        {rooms.map((room) => (
          <Box
            key={room.id}
            px={3}
            py={2}
            cursor="pointer"
            borderRadius="md"
            bg={selectedRoomId === room.id ? 'blue.50' : 'transparent'}
            _dark={{ bg: selectedRoomId === room.id ? 'teal.900' : 'transparent' }}
            color={selectedRoomId === room.id ? 'blue.600' : 'inherit'}
            _hover={{ bg: selectedRoomId === room.id ? undefined : 'gray.100', _dark: { bg: 'whiteAlpha.200' } }}
            onClick={() => onSelectRoom(room.id)}
          >
            <Flex align="center">
              <Box as={Hash} width="16px" height="16px" mr={2} opacity={0.6} />
              <Box>
                <Text fontWeight="medium" fontSize="sm">{room.name}</Text>
                {room.description && (
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>{room.description}</Text>
                )}
              </Box>
            </Flex>
          </Box>
        ))}
      </VStack>

      <Box p={4} borderTop="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
        <Button w="100%" colorScheme="blue" variant="outline" size="sm" onClick={onOpen}>
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
