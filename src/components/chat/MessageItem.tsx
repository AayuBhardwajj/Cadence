import React from 'react';
import { Box, Flex, Text, Avatar, IconButton, HStack, Tooltip, Image, useDisclosure } from '@chakra-ui/react';
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
  const isWhisper = message.is_whisper;

  const renderContent = () => {
    if (message.deleted_at) {
      return (
        <Text color="whiteAlpha.400" fontStyle="italic" fontSize="sm">
          This message was deleted
        </Text>
      );
    }

    if (message.message_type === 'image' || message.message_type === 'gif') {
      return (
        <Image
          src={message.media_url || ''}
          maxH="200px"
          borderRadius="xl"
          cursor="pointer"
          onClick={() => window.open(message.media_url || '', '_blank')}
          transition="transform 0.2s"
          _hover={{ transform: "scale(1.02)" }}
        />
      );
    }

    if (message.message_type === 'voice') {
      return <audio controls src={message.media_url || ''} style={{ height: '36px', filter: 'invert(1) hue-rotate(180deg)' }} />;
    }

    // Parse mentions in text
    const parts = message.content.split(/(@\w+)/g);
    return (
      <Text fontSize="sm" color="white" whiteSpace="pre-wrap" wordBreak="break-word" lineHeight="tall">
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <Text as="span" key={i} color="purple.400" fontWeight="bold">
                {part}
              </Text>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </Text>
    );
  };

  return (
    <Flex 
      direction="column" 
      w="100%" 
      align={isMine ? 'flex-end' : 'flex-start'} 
      mb={2} 
      _hover={{ '.msg-actions': { opacity: 1 } }}
    >
      {message.reply_preview && !message.deleted_at && (
        <Flex align="center" mb={1} ml={isMine ? 0 : 10} mr={isMine ? 10 : 0} opacity={0.6}>
          <Text fontSize="xs" color="whiteAlpha.600" isTruncated maxW="200px">
            Replying to: {message.reply_preview}
          </Text>
        </Flex>
      )}

      <Flex direction={isMine ? 'row-reverse' : 'row'} align="flex-end" maxW="85%">
        <Avatar 
          size="xs" 
          src={message.sender_avatar || undefined} 
          name={message.sender_name} 
          mb={1}
          ml={isMine ? 2 : 0}
          mr={isMine ? 0 : 2}
        />
        
        <Box 
          p={3}
          borderRadius="2xl"
          bg={isWhisper ? "purple.900" : (isMine ? "purple.500" : "whiteAlpha.100")}
          border={isWhisper ? "1px solid" : "none"}
          borderColor={isWhisper ? "purple.500" : "transparent"}
          borderBottomRightRadius={isMine ? "xs" : "2xl"}
          borderBottomLeftRadius={!isMine ? "xs" : "2xl"}
          position="relative"
          boxShadow="lg"
        >
          {!isMine && (
            <Text fontWeight="black" fontSize="xs" color="purple.400" mb={1} letterSpacing="tight">
              {message.sender_name}
            </Text>
          )}

          {isWhisper && !message.deleted_at && (
            <Text fontSize="2xs" fontStyle="italic" color="purple.200" mb={1} textTransform="uppercase">
              (Whisper to @{message.whisper_to_name})
            </Text>
          )}

          {renderContent()}

          <Text 
            fontSize="2xs" 
            color={isMine ? "whiteAlpha.700" : "whiteAlpha.500"} 
            mt={1} 
            textAlign={isMine ? "right" : "left"}
          >
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Box>

        {!message.deleted_at && (
          <HStack 
            className="msg-actions" 
            opacity={0} 
            transition="opacity 0.2s" 
            spacing={1} 
            mx={2}
            bg="whiteAlpha.100"
            backdropFilter="blur(5px)"
            borderRadius="lg"
            p={1}
            alignSelf="center"
          >
            <Tooltip label="Reply">
              <IconButton
                aria-label="Reply"
                icon={<Reply size={14} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.600"
                _hover={{ color: "white", bg: "whiteAlpha.100" }}
                onClick={() => onReply(message)}
              />
            </Tooltip>
            
            {!isMine && (
              <Tooltip label="Whisper">
                <IconButton
                  aria-label="Whisper"
                  icon={<MessageSquareDashed size={14} />}
                  size="xs"
                  variant="ghost"
                  color="whiteAlpha.600"
                  _hover={{ color: "white", bg: "whiteAlpha.100" }}
                  onClick={onOpen}
                />
              </Tooltip>
            )}

            {isMine && (
              <Tooltip label="Delete">
                <IconButton
                  aria-label="Delete"
                  icon={<Trash2 size={14} />}
                  size="xs"
                  variant="ghost"
                  color="red.400"
                  _hover={{ bg: "red.400", color: "white" }}
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
