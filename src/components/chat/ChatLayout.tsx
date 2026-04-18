import React, { useState } from 'react';
import { Flex } from '@chakra-ui/react';
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
    <Flex h="100%" w="100%" bg="white" _dark={{ bg: 'gray.900' }}>
      <Flex direction="column" w="260px" shrink={0} borderRight="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
        <RoomList
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          currentUser={currentUser}
        />
      </Flex>

      <Flex direction="column" flex={1} position="relative" minW={0}>
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
          <Flex flex={1} align="center" justify="center" color="gray.500">
            Select a room to start chatting
          </Flex>
        )}
      </Flex>

      <Flex direction="column" w="220px" shrink={0} borderLeft="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
        <OnlineUsers
          currentUser={currentUser}
          onStartDM={handleStartDM}
        />
      </Flex>

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
