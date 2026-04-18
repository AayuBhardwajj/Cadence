import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Flex, IconButton, Textarea, HStack, Text, Tooltip, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Input, SimpleGrid, Image, useToast
} from '@chakra-ui/react';
import { Smile, Image as ImageIcon, Film, Mic, Send, X, Square } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../../lib/supabase';
import { useChat } from '../../hooks/useChat';

interface MessageInputProps {
  roomId: string;
  currentUser: any;
  replyTo: { id: string; content: string; senderName: string } | null;
  onClearReply: () => void;
}

export default function MessageInput({ roomId, currentUser, replyTo, onClearReply }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useChat();
  const toast = useToast();
  
  const { isOpen: isGiphyOpen, onOpen: onGiphyOpen, onClose: onGiphyClose } = useDisclosure();
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);

  // Debounced typing broadcast
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleType = (val: string) => {
    setContent(val);
    const channel = supabase.channel(`room:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUser.id, username: currentUser.name }
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: currentUser.id }
      });
    }, 1500);
  };

  const handleSend = async () => {
    if (!content.trim()) return;

    const payload = {
      room_id: roomId,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar_url,
      content: content.trim(),
      message_type: 'text' as const,
      media_url: null,
      reply_to_id: replyTo ? replyTo.id : null,
      reply_preview: replyTo ? replyTo.content : null,
      is_whisper: false,
      whisper_to_id: null,
      whisper_to_name: null,
    };

    try {
      await sendMessage(payload);
      setContent('');
      onClearReply();
      setShowEmoji(false);
      
      const channel = supabase.channel(`room:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: currentUser.id }
      });
    } catch (e: any) {
      toast({ title: 'Error sending message', description: e.message, status: 'error' });
    }
  };

  const uploadMedia = async (file: Blob | File, ext: string) => {
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('chat-media').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const url = await uploadMedia(file, ext);
      await sendMessage({
        room_id: roomId,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar_url,
        content: '',
        message_type: 'image',
        media_url: url,
        reply_to_id: replyTo ? replyTo.id : null,
        reply_preview: replyTo ? replyTo.content : null,
        is_whisper: false,
        whisper_to_id: null,
        whisper_to_name: null,
      });
      onClearReply();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, status: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const searchGifs = async () => {
    if (!gifQuery.trim()) return;
    try {
      const key = import.meta.env.VITE_GIPHY_API_KEY;
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(gifQuery)}&limit=12`);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    try {
      await sendMessage({
        room_id: roomId,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar_url,
        content: '',
        message_type: 'gif',
        media_url: gifUrl,
        reply_to_id: replyTo ? replyTo.id : null,
        reply_preview: replyTo ? replyTo.content : null,
        is_whisper: false,
        whisper_to_id: null,
        whisper_to_name: null,
      });
      onGiphyClose();
      setGifQuery('');
      setGifs([]);
      onClearReply();
    } catch (e: any) {
      toast({ title: 'Error sending gif', description: e.message, status: 'error' });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsUploading(true);
        try {
          const url = await uploadMedia(audioBlob, 'webm');
          await sendMessage({
            room_id: roomId,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_avatar: currentUser.avatar_url,
            content: '',
            message_type: 'voice',
            media_url: url,
            reply_to_id: replyTo ? replyTo.id : null,
            reply_preview: replyTo ? replyTo.content : null,
            is_whisper: false,
            whisper_to_id: null,
            whisper_to_name: null,
          });
          onClearReply();
        } catch (e: any) {
          toast({ title: 'Voice upload failed', description: e.message, status: 'error' });
        } finally {
          setIsUploading(false);
          stream.getTracks().forEach(t => t.stop());
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      toast({ title: 'Microphone error', description: 'Could not access microphone', status: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <Box p={4} borderTop="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }} position="relative">
      {replyTo && (
        <Flex p={2} bg="gray.100" _dark={{ bg: 'gray.700' }} borderRadius="md" mb={2} align="center" justify="space-between">
          <Box>
            <Text fontSize="xs" fontWeight="bold">Replying to {replyTo.senderName}</Text>
            <Text fontSize="sm" noOfLines={1}>{replyTo.content}</Text>
          </Box>
          <IconButton aria-label="Cancel reply" icon={<Box as={X} width="16px" height="16px" />} size="xs" variant="ghost" onClick={onClearReply} />
        </Flex>
      )}

      {showEmoji && (
        <Box position="absolute" bottom="100%" left="4" mb={2} zIndex={10}>
          <EmojiPicker onEmojiClick={(em) => setContent(c => c + em.emoji)} />
        </Box>
      )}

      <Flex align="flex-end" gap={2}>
        <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleImageUpload} />
        
        <HStack spacing={1} pb={1}>
          <Tooltip label="Emoji">
            <IconButton aria-label="Emoji" icon={<Box as={Smile} width="20px" height="20px" />} size="sm" variant="ghost" onClick={() => setShowEmoji(!showEmoji)} />
          </Tooltip>
          <Tooltip label="Image">
            <IconButton aria-label="Image" icon={<Box as={ImageIcon} width="20px" height="20px" />} size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} isLoading={isUploading} />
          </Tooltip>
          <Tooltip label="GIF">
            <IconButton aria-label="GIF" icon={<Box as={Film} width="20px" height="20px" />} size="sm" variant="ghost" onClick={onGiphyOpen} />
          </Tooltip>
        </HStack>

        <Textarea
          value={content}
          onChange={(e) => handleType(e.target.value)}
          placeholder="Type a message..."
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

        <HStack spacing={1} pb={1}>
          {content.trim() ? (
            <Tooltip label="Send">
              <IconButton aria-label="Send" icon={<Box as={Send} width="20px" height="20px" />} size="sm" colorScheme="blue" onClick={handleSend} />
            </Tooltip>
          ) : (
            <Tooltip label={isRecording ? "Stop Recording" : "Hold to Record"}>
              <IconButton
                aria-label="Voice"
                icon={isRecording ? <Box as={Square} width="20px" height="20px" fill="white" /> : <Box as={Mic} width="20px" height="20px" />}
                size="sm"
                colorScheme={isRecording ? "red" : "gray"}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
              />
            </Tooltip>
          )}
        </HStack>
      </Flex>

      <Modal isOpen={isGiphyOpen} onClose={onGiphyClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Search GIFs</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Flex gap={2} mb={4}>
              <Input
                placeholder="Search Giphy..."
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
              />
              <Button onClick={searchGifs}>Search</Button>
            </Flex>
            <SimpleGrid columns={3} spacing={2}>
              {gifs.map((g) => (
                <Image
                  key={g.id}
                  src={g.images.fixed_height_small.url}
                  cursor="pointer"
                  onClick={() => handleSendGif(g.images.downsized.url)}
                  borderRadius="md"
                  _hover={{ opacity: 0.8 }}
                />
              ))}
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
