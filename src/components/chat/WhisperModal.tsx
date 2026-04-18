import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  useToast
} from '@chakra-ui/react';
import { supabase } from '../../lib/supabase';

interface WhisperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  targetUser: { id: string; name: string };
  roomId: string;
}

export default function WhisperModal({ isOpen, onClose, currentUser, targetUser, roomId }: WhisperModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSend = async () => {
    if (!content.trim()) return;

    setIsLoading(true);

    const payload = {
      room_id: roomId,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar_url,
      content: content.trim(),
      message_type: 'text' as const,
      media_url: null,
      reply_to_id: null,
      reply_preview: null,
      is_whisper: true,
      whisper_to_id: targetUser.id,
      whisper_to_name: targetUser.name,
    };

    const { error } = await supabase.from('chat_messages').insert([payload]);

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error sending whisper',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setContent('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Whisper to @{targetUser.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>Message (only they will see it)</FormLabel>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your secret message..."
              rows={4}
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="purple" mr={3} onClick={handleSend} isLoading={isLoading}>
            Send Whisper
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
