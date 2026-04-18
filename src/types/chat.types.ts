export interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string;
  is_public: boolean;
  created_at: string;
}

export type MessageType = 'text' | 'image' | 'gif' | 'voice';

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  reply_to_id: string | null;
  reply_preview: string | null;
  is_whisper: boolean;
  whisper_to_id: string | null;
  whisper_to_name: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ChatMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  mentioner_id: string;
  room_id: string;
  is_read: boolean;
  created_at: string;
}

export interface DMConversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  created_at: string;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  reply_to_id: string | null;
  reply_preview: string | null;
  read_at: string | null;
  created_at: string;
}

export interface OnlineUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface MentionPayload {
  id: string;
  name: string;
}

export interface TypingPayload {
  user_id: string;
  username: string;
}
