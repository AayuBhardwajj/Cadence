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

const inputStyle = {
  bg: "whiteAlpha.50",
  border: "1px solid",
  borderColor: "whiteAlpha.200",
  color: "white",
  _placeholder: { color: "whiteAlpha.400" },
  _focus: { borderColor: "purple.400", boxShadow: "0 0 0 1px purple.400" },
  borderRadius: "xl"
};

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
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent as="form" onSubmit={handleSubmit} bg="gray.900" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl">
        <ModalHeader color="white">Create New Room</ModalHeader>
        <ModalCloseButton color="whiteAlpha.600" />
        <ModalBody pb={6}>
          <FormControl isRequired>
            <FormLabel color="whiteAlpha.600" fontSize="sm">Room Name</FormLabel>
            <Input 
              placeholder="e.g. general, announcements" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              {...inputStyle}
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel color="whiteAlpha.600" fontSize="sm">Description</FormLabel>
            <Textarea 
              placeholder="Optional description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              {...inputStyle}
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="purple" mr={3} type="submit" isLoading={isLoading} borderRadius="xl">
            Create Room
          </Button>
          <Button onClick={onClose} variant="ghost" color="whiteAlpha.600" _hover={{ bg: "whiteAlpha.100", color: "white" }} borderRadius="xl">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
