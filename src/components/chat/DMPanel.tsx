import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Flex, IconButton, Text, Avatar, Textarea, HStack, Tooltip, useToast, VStack, Spinner, Center, Image
} from '@chakra-ui/react';
import { X as CloseIcon, Send, Image as ImageIcon } from 'lucide-react';
import { useDM } from '../../hooks/useDM';
import { DMMessage } from '../../types/chat.types';
import { supabase } from '../../lib/supabase';

interface DMPanelProps {
  currentUser: any;
  targetUser: any;
  onClose: () => void;
}

export default function DMPanel({ currentUser, targetUser, onClose }: DMPanelProps) {
  const { getOrCreateConversation, fetchDMMessages, sendDMMessage, subscribeToDM, markAsRead } = useDM();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void;

    const init = async () => {
      setLoading(true);
      try {
        const conv = await getOrCreateConversation(currentUser.id, targetUser.id);
        if (isMounted) {
          setConversationId(conv.id);
          const msgs = await fetchDMMessages(conv.id);
          setMessages(msgs);
          await markAsRead(conv.id, currentUser.id);

          unsubscribe = subscribeToDM(conv.id, (newMsg) => {
            setMessages((prev) => {
              if (prev.some((m: DMMessage) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            if (newMsg.sender_id !== currentUser.id) {
              markAsRead(conv.id, currentUser.id);
            }
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser.id, targetUser.id, getOrCreateConversation, fetchDMMessages, markAsRead, subscribeToDM]);

  const handleSend = async () => {
    if (!content.trim() || !conversationId) return;
    
    try {
      await sendDMMessage({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar_url,
        content: content.trim(),
        message_type: 'text',
        media_url: null,
        reply_to_id: null,
        reply_preview: null
      });
      setContent('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, status: 'error' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${currentUser.id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('chat-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(data.path);

      await sendDMMessage({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar_url,
        content: '',
        message_type: 'image',
        media_url: publicUrl,
        reply_to_id: null,
        reply_preview: null
      });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, status: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Flex direction="column" w="360px" shrink={0} borderLeft="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }} bg="white" _dark={{ bg: 'gray.900' }}>
      <Flex p={4} align="center" borderBottom="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }} justify="space-between">
        <Flex align="center">
          <Avatar size="sm" src={targetUser.avatar_url || targetUser.avatar} name={targetUser.name || targetUser.username} mr={3} />
          <Text fontWeight="bold">{targetUser.name || targetUser.username}</Text>
        </Flex>
        <IconButton aria-label="Close DM" icon={<Box as={CloseIcon} width="20px" height="20px" />} size="sm" variant="ghost" onClick={onClose} />
      </Flex>

      <Box flex={1} overflowY="auto" p={4}>
        {loading ? (
          <Center h="100%">
            <Spinner color="blue.500" />
          </Center>
        ) : (
          <VStack spacing={4} align="stretch">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUser.id;
              return (
                <Flex key={msg.id} justify={isMine ? 'flex-end' : 'flex-start'}>
                  <Box 
                    maxW="80%" 
                    bg={isMine ? 'blue.500' : 'gray.100'} 
                    _dark={{ bg: isMine ? 'blue.600' : 'gray.700' }}
                    color={isMine ? 'white' : 'inherit'}
                    borderRadius="lg" 
                    p={3}
                  >
                    {msg.message_type === 'image' ? (
                      <Image src={msg.media_url!} maxH="150px" borderRadius="md" cursor="pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
                    ) : (
                      <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">{msg.content}</Text>
                    )}
                    <Text fontSize="xs" opacity={0.7} mt={1} textAlign={isMine ? 'right' : 'left'}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Box>
                </Flex>
              );
            })}
            <Box ref={bottomRef} />
          </VStack>
        )}
      </Box>

      <Flex p={4} borderTop="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }} align="flex-end" gap={2}>
        <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleImageUpload} />
        
        <Tooltip label="Image">
          <IconButton aria-label="Image" icon={<Box as={ImageIcon} width="20px" height="20px" />} size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} isLoading={isUploading} />
        </Tooltip>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a DM..."
          rows={1}
          maxRows={4}
          resize="none"
          flex={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <Tooltip label="Send">
          <IconButton aria-label="Send" icon={<Box as={Send} width="20px" height="20px" />} size="sm" colorScheme="blue" onClick={handleSend} isDisabled={!content.trim()} />
        </Tooltip>
      </Flex>
    </Flex>
  );
}
