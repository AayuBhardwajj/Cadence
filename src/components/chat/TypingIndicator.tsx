import React, { useEffect, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { supabase } from '../../lib/supabase';
import { TypingPayload } from '../../types/chat.types';

interface TypingIndicatorProps {
  roomId: string;
  currentUserId: string;
}

export default function TypingIndicator({ roomId, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, username } = payload.payload as TypingPayload;
        if (user_id !== currentUserId) {
          setTypingUsers((prev) => ({ ...prev, [user_id]: username }));
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        const { user_id } = payload.payload as TypingPayload;
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[user_id];
          return newState;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  const names = Object.values(typingUsers);
  
  if (names.length === 0) return null;

  let text = '';
  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else {
    text = `Several people are typing...`;
  }

  return (
    <Box mt={2} pl={10}>
      <Text fontSize="xs" color="gray.400" fontStyle="italic">
        {text}
      </Text>
    </Box>
  );
}
