import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types/chat.types';

export const useChat = () => {
  const fetchMessages = useCallback(async (roomId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(60);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return data as ChatMessage[];
  }, []);

  const parseMentions = useCallback((content: string): string[] => {
    const mentions: string[] = [];
    const regex = /@(\w+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }, []);

  const sendMessage = useCallback(async (payload: Omit<ChatMessage, 'id' | 'created_at' | 'deleted_at'>) => {
    const { error, data } = await supabase
      .from('chat_messages')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    const mentions = parseMentions(payload.content);
    if (mentions.length > 0 && data) {
      const messageId = data.id;
      for (const username of mentions) {
        // Attempting to match username in profiles. Since username might be name or a dedicated field:
        // We'll search full_name ILIKE or similar. Assuming there's a profiles table with a username.
        const { data: userData } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', username)
          .maybeSingle();

        if (userData) {
          await supabase.from('chat_mentions').insert([{
            message_id: messageId,
            mentioned_user_id: userData.id,
            mentioner_id: payload.sender_id,
            room_id: payload.room_id,
            is_read: false
          }]);
        }
      }
    }
    return data;
  }, [parseMentions]);

  const deleteMessage = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);

  const subscribeToRoom = useCallback((roomId: string, onMessage: (msg: ChatMessage) => void) => {
    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { fetchMessages, sendMessage, deleteMessage, subscribeToRoom, parseMentions };
};
