import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Textarea, useToast
} from '@chakra-ui/react';
import { supabase } from '../../lib/supabase';

interface WhisperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  targetUser: { id: string; name: string };
  roomId: string;
}

const inputStyle = {
  bg: "whiteAlpha.50",
  border: "1px solid",
  borderColor: "whiteAlpha.200",
  color: "white",
  _placeholder: { color: "whiteAlpha.400" },
  _focus: { borderColor: "purple.400", boxShadow: "0 0 0 1px purple.400" },
  borderRadius: "xl"
};

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
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent bg="gray.900" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl">
        <ModalHeader color="white">Whisper to @{targetUser.name}</ModalHeader>
        <ModalCloseButton color="whiteAlpha.600" />
        <ModalBody pb={6}>
          <FormControl>
            <FormLabel color="whiteAlpha.600" fontSize="sm">Message (only they will see it)</FormLabel>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your secret message..."
              rows={4}
              {...inputStyle}
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="purple" mr={3} onClick={handleSend} isLoading={isLoading} borderRadius="xl">
            Send Whisper
          </Button>
          <Button onClick={onClose} variant="ghost" color="whiteAlpha.600" _hover={{ bg: "whiteAlpha.100", color: "white" }} borderRadius="xl">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
