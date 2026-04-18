import React, { useState } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import RoomList from './RoomList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import OnlineUsers from './OnlineUsers';
import DMPanel from './DMPanel';

interface ChatLayoutProps {
  currentUser: {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
  };
}

const glassStyle = {
  bg: "whiteAlpha.50",
  borderRadius: "2xl",
  border: "1px solid",
  borderColor: "whiteAlpha.100",
  backdropFilter: "blur(10px)",
};

const scrollbarStyle = {
  sx: {
    "&::-webkit-scrollbar": { width: "4px" },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.200", borderRadius: "full" }
  }
};

export default function ChatLayout({ currentUser }: ChatLayoutProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(null);
  const [activeDMUser, setActiveDMUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

  const handleStartDM = (user: any) => {
    if (user.id === currentUser.id) return;
    setActiveDMUserId(user.id);
    setActiveDMUser(user);
  };

  return (
    <Flex h="100%" w="100%" gap={4} minH="0" overflow="hidden">
      {/* Left: Room list */}
      <Box w="240px" flexShrink={0} {...glassStyle} overflowY="auto" {...scrollbarStyle}>
        <RoomList
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          currentUser={currentUser}
        />
      </Box>

      {/* Center: Messages */}
      <Flex direction="column" flex={1} minW={0} overflow="hidden" {...glassStyle}>
        {selectedRoomId ? (
          <>
            <MessageList
              roomId={selectedRoomId}
              currentUser={currentUser}
              onReply={(msg: any) => setReplyTo({ id: msg.id, content: msg.content, senderName: msg.sender_name })}
            />
            <MessageInput
              roomId={selectedRoomId}
              currentUser={currentUser}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
            />
          </>
        ) : (
          <Flex flex={1} align="center" justify="center" color="whiteAlpha.400">
            Select a room to start chatting
          </Flex>
        )}
      </Flex>

      {/* Right: Online users */}
      <Box w="200px" flexShrink={0} {...glassStyle} overflowY="auto" {...scrollbarStyle}>
        <OnlineUsers
          currentUser={currentUser}
          onStartDM={handleStartDM}
        />
      </Box>

      {activeDMUserId && activeDMUser && (
        <DMPanel
          currentUser={currentUser}
          targetUser={activeDMUser}
          onClose={() => {
            setActiveDMUserId(null);
            setActiveDMUser(null);
          }}
        />
      )}
    </Flex>
  );
}
