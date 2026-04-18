import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, Spinner, Center, Flex } from '@chakra-ui/react';
import { useChat } from '../../hooks/useChat';
import { ChatMessage } from '../../types/chat.types';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  roomId: string;
  currentUser: any;
  onReply: (msg: ChatMessage) => void;
}

export default function MessageList({ roomId, currentUser, onReply }: MessageListProps) {
  const { fetchMessages, subscribeToRoom, deleteMessage } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    const load = async () => {
      const data = await fetchMessages(roomId);
      if (isMounted) {
        setMessages(data);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    load();

    const unsubscribe = subscribeToRoom(roomId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomId, fetchMessages, subscribeToRoom]);

  const handleDelete = async (id: string) => {
    await deleteMessage(id);
    setMessages((prev) => prev.map((msg) => msg.id === id ? { ...msg, deleted_at: new Date().toISOString() } : msg));
  };

  if (loading) {
    return (
      <Center flex={1}>
        <Spinner color="purple.500" />
      </Center>
    );
  }

  return (
    <Flex direction="column" flex={1} minH={0} overflow="hidden">
      <Box 
        flex={1} 
        overflowY="auto" 
        p={4}
        sx={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.200", borderRadius: "full" }
        }}
      >
        <VStack spacing={4} align="stretch" pb={2}>
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={handleDelete}
            />
          ))}
          <div ref={bottomRef} />
        </VStack>
      </Box>
      <Box px={4}>
        <TypingIndicator roomId={roomId} currentUserId={currentUser.id} />
      </Box>
    </Flex>
  );
}
