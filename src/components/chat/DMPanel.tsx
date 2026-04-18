import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Flex, IconButton, Text, Avatar, Textarea, HStack, Tooltip, useToast, VStack, Spinner, Center, Image,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton
} from '@chakra-ui/react';
import { Send, Image as ImageIcon } from 'lucide-react';
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
    <Drawer isOpen={true} placement="right" onClose={onClose} size="sm">
      <DrawerOverlay backdropFilter="blur(5px)" />
      <DrawerContent bg="gray.900" borderLeft="1px solid" borderColor="whiteAlpha.100">
        <DrawerCloseButton color="whiteAlpha.600" />
        <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.100" p={4}>
          <Flex align="center">
            <Avatar size="sm" src={targetUser.avatar_url || targetUser.avatar} name={targetUser.name || targetUser.username} mr={3} />
            <Box>
              <Text fontSize="md" fontWeight="bold" color="white">{targetUser.name || targetUser.username}</Text>
              <Text fontSize="2xs" color="green.400" fontWeight="bold">Online</Text>
            </Box>
          </Flex>
        </DrawerHeader>

        <DrawerBody p={0} display="flex" flexDirection="column">
          <Box flex={1} overflowY="auto" p={4} 
            sx={{
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.200", borderRadius: "full" }
            }}
          >
            {loading ? (
              <Center h="100%">
                <Spinner color="purple.500" />
              </Center>
            ) : (
              <VStack spacing={4} align="stretch">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id;
                  return (
                    <Flex key={msg.id} justify={isMine ? 'flex-end' : 'flex-start'}>
                      <Box 
                        maxW="85%" 
                        bg={isMine ? 'purple.500' : 'whiteAlpha.100'} 
                        color="white"
                        borderRadius="2xl"
                        borderBottomRightRadius={isMine ? "xs" : "2xl"}
                        borderBottomLeftRadius={!isMine ? "xs" : "2xl"}
                        p={3}
                        boxShadow="md"
                      >
                        {msg.message_type === 'image' ? (
                          <Image src={msg.media_url!} maxH="150px" borderRadius="xl" cursor="pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
                        ) : (
                          <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">{msg.content}</Text>
                        )}
                        <Text fontSize="2xs" opacity={0.5} mt={1} textAlign={isMine ? 'right' : 'left'}>
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

          <Box p={4} borderTopWidth="1px" borderColor="whiteAlpha.100">
            <Flex align="flex-end" gap={2}>
              <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleImageUpload} />
              
              <Tooltip label="Image">
                <IconButton 
                  aria-label="Image" 
                  icon={<ImageIcon size={20} />} 
                  size="sm" 
                  variant="ghost" 
                  color="whiteAlpha.600"
                  _hover={{ color: "white", bg: "whiteAlpha.100" }}
                  onClick={() => fileInputRef.current?.click()} 
                  isLoading={isUploading} 
                />
              </Tooltip>

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type a DM..."
                rows={1}
                maxRows={4}
                resize="none"
                flex={1}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="xl"
                color="white"
                _placeholder={{ color: "whiteAlpha.400" }}
                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px purple.400" }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <IconButton 
                aria-label="Send" 
                icon={<Send size={20} />} 
                size="sm" 
                colorScheme="purple" 
                borderRadius="xl"
                onClick={handleSend} 
                isDisabled={!content.trim()} 
              />
            </Flex>
          </Box>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
