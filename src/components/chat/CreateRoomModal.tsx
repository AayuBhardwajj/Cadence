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
  Input,
  Textarea,
  useToast
} from '@chakra-ui/react';
import { supabase } from '../../lib/supabase';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onCreated: (roomId: string) => void;
}

export default function CreateRoomModal({ isOpen, onClose, currentUser, onCreated }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const { data, error } = await supabase
      .from('chat_rooms')
      .insert([
        {
          name: name.trim(),
          description: description.trim() || null,
          slug,
          created_by: currentUser.id,
          is_public: true
        }
      ])
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error creating room',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (data) {
      setName('');
      setDescription('');
      onCreated(data.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Create New Room</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isRequired>
            <FormLabel>Room Name</FormLabel>
            <Input 
              placeholder="e.g. general, announcements" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel>Description</FormLabel>
            <Textarea 
              placeholder="Optional description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} type="submit" isLoading={isLoading}>
            Create
          </Button>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
