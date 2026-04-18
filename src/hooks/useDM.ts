import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DMConversation, DMMessage } from '../types/chat.types';

export const useDM = () => {
  const getOrCreateConversation = useCallback(async (userId: string, targetId: string) => {
    // Query if exists
    const { data: existingData, error } = await supabase
      .from('dm_conversations')
      .select('*')
      .or(`and(participant_a.eq.${userId},participant_b.eq.${targetId}),and(participant_a.eq.${targetId},participant_b.eq.${userId})`)
      .maybeSingle();

    if (existingData) return existingData as DMConversation;

    // Insert new
    const { data: newConv, error: createError } = await supabase
      .from('dm_conversations')
      .insert([{ participant_a: userId, participant_b: targetId }])
      .select()
      .single();

    if (createError) throw createError;
    return newConv as DMConversation;
  }, []);

  const fetchDMMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from('dm_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) console.error(error);
    return (data as DMMessage[]) || [];
  }, []);

  const sendDMMessage = useCallback(async (payload: Omit<DMMessage, 'id' | 'created_at' | 'read_at'>) => {
    const { error, data } = await supabase.from('dm_messages').insert([payload]).select().single();
    if (error) console.error(error);
    if (!error) {
      await supabase.from('dm_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', payload.conversation_id);
    }
    return data;
  }, []);

  const markAsRead = useCallback(async (conversationId: string, currentUserId: string) => {
    await supabase
      .from('dm_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .is('read_at', null);
  }, []);

  const subscribeToDM = useCallback((conversationId: string, onMessage: (msg: DMMessage) => void) => {
    const channel = supabase.channel(`dm:${conversationId}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onMessage(payload.new as DMMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { getOrCreateConversation, fetchDMMessages, sendDMMessage, markAsRead, subscribeToDM };
};
