import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { OnlineUser } from '../types/chat.types';
import { RealtimeChannel } from '@supabase/supabase-js';

export const usePresence = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const trackPresence = useCallback(async (user: { user_id: string; username: string; avatar_url: string | null }) => {
    const presChannel = supabase.channel('presence:global');

    presChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presChannel.presenceState<{ user_id: string; username: string; avatar_url: string | null }>();
        const allEntries = Object.values(state).flat();
        
        // Deduplicate by user_id — keep only the first entry per user
        const seen = new Set<string>();
        const unique = allEntries.filter(entry => {
          if (seen.has(entry.user_id)) return false;
          seen.add(entry.user_id);
          return true;
        });
        
        setOnlineUsers(unique);
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
