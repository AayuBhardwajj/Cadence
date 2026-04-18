import React from 'react';
import { Box, Flex, Text, Avatar, IconButton, HStack, Tooltip, Image, Tag, useDisclosure } from '@chakra-ui/react';
import { Reply, MessageSquareDashed, Trash2 } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';
import WhisperModal from './WhisperModal';

interface MessageItemProps {
  message: ChatMessage;
  currentUser: any;
  onReply: (msg: ChatMessage) => void;
  onDelete: (id: string) => void;
}

export default function MessageItem({ message, currentUser, onReply, onDelete }: MessageItemProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMine = message.sender_id === currentUser.id;

  const renderContent = () => {
    if (message.deleted_at) {
      return (
        <Text color="gray.400" fontStyle="italic" fontSize="sm">
          This message was deleted
        </Text>
      );
    }

    if (message.message_type === 'image' || message.message_type === 'gif') {
      return (
        <Image
          src={message.media_url || ''}
          maxH="200px"
          borderRadius="md"
          cursor="pointer"
          onClick={() => window.open(message.media_url || '', '_blank')}
        />
      );
    }

    if (message.message_type === 'voice') {
      return <audio controls src={message.media_url || ''} style={{ height: '40px' }} />;
    }

    // Parse mentions in text
    const parts = message.content.split(/(@\w+)/g);
    return (
      <Text fontSize="md" whiteSpace="pre-wrap" wordBreak="break-word">
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <Tag key={i} size="sm" colorScheme="blue" borderRadius="full" px={2} py={0.5} mr={1}>
                {part}
              </Tag>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </Text>
    );
  };

  const isWhisper = message.is_whisper;

  return (
    <Flex direction="column" w="100%" mb={4} _hover={{ '.msg-actions': { opacity: 1 } }}>
      {message.reply_preview && !message.deleted_at && (
        <Box ml={12} pl={2} mb={1} borderLeft="2px solid" borderColor="gray.300" _dark={{ borderColor: 'gray.600' }}>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            Replying to: {message.reply_preview}
          </Text>
        </Box>
      )}

      <Flex 
        align="flex-start" 
        bg={isWhisper ? 'purple.50' : 'transparent'} 
        _dark={{ bg: isWhisper ? 'purple.900' : 'transparent' }}
        p={isWhisper ? 2 : 0} 
        borderRadius="md"
      >
        <Avatar size="sm" src={message.sender_avatar || undefined} name={message.sender_name} mr={3} mt={1} />
        
        <Box flex={1} minW={0}>
          <Flex align="baseline" mb={1}>
            <Text fontWeight="bold" fontSize="sm" mr={2}>
              {message.sender_name}
            </Text>
            <Text fontSize="xs" color="gray.400">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Flex>

          {isWhisper && !message.deleted_at && (
            <Text fontSize="xs" fontStyle="italic" color="purple.500" mb={1}>
              (Whisper to @{message.whisper_to_name}):
            </Text>
          )}

          {renderContent()}
        </Box>

        {!message.deleted_at && (
          <HStack 
            className="msg-actions" 
            opacity={0} 
            transition="opacity 0.2s" 
            spacing={1} 
            ml={2}
            bg="white"
            _dark={{ bg: 'gray.800' }}
            boxShadow="sm"
            borderRadius="md"
            p={1}
          >
            <Tooltip label="Reply">
              <IconButton
                aria-label="Reply"
                icon={<Box as={Reply} width="16px" height="16px" />}
                size="xs"
                variant="ghost"
                onClick={() => onReply(message)}
              />
            </Tooltip>
            
            {!isMine && (
              <Tooltip label="Whisper">
                <IconButton
                  aria-label="Whisper"
                  icon={<Box as={MessageSquareDashed} width="16px" height="16px" />}
                  size="xs"
                  variant="ghost"
                  onClick={onOpen}
                />
              </Tooltip>
            )}

            {isMine && (
              <Tooltip label="Delete">
                <IconButton
                  aria-label="Delete"
                  icon={<Box as={Trash2} width="16px" height="16px" />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => onDelete(message.id)}
                />
              </Tooltip>
            )}
          </HStack>
        )}
      </Flex>

      {!isMine && !message.deleted_at && (
        <WhisperModal
          isOpen={isOpen}
          onClose={onClose}
          currentUser={currentUser}
          targetUser={{ id: message.sender_id, name: message.sender_name }}
          roomId={message.room_id}
        />
      )}
    </Flex>
  );
}
