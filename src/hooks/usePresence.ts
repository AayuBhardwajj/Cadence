import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { OnlineUser } from '../types/chat.types';
import { RealtimeChannel } from '@supabase/supabase-js';

export const usePresence = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const trackPresence = useCallback(async (user: { id: string; username: string; avatar_url: string | null }) => {
    const presChannel = supabase.channel('presence:global');

    presChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presChannel.presenceState();
        const users: OnlineUser[] = [];
        for (const id in newState) {
          const presences = newState[id] as any[];
          if (presences.length > 0) {
            users.push(presences[0] as OnlineUser);
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presChannel.track(user);
        }
      });

    setChannel(presChannel);
  }, []);

  const untrack = useCallback(async () => {
    if (channel) {
      await channel.untrack();
      await supabase.removeChannel(channel);
      setChannel(null);
    }
  }, [channel]);

  return { trackPresence, onlineUsers, untrack };
};
