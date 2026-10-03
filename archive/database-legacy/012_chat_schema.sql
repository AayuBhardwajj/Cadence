-- ============================================================
-- CADENCE CHAT SCHEMA
-- ============================================================

-- Public rooms (user-created)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(60) UNIQUE NOT NULL,
  description  TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the global default room
INSERT INTO chat_rooms (name, slug, description, is_public)
VALUES ('Global Lounge', 'global', 'Main public room for all Cadence users', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Public messages + whispers (same table, separated by flag)
CREATE TABLE IF NOT EXISTS chat_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name    TEXT NOT NULL,
  sender_avatar  TEXT,
  content        TEXT,
  message_type   VARCHAR(20) DEFAULT 'text'
                   CHECK (message_type IN ('text','image','gif','voice')),
  media_url      TEXT,
  reply_to_id    UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  reply_preview  TEXT,
  is_whisper     BOOLEAN DEFAULT FALSE,
  whisper_to_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  whisper_to_name TEXT,
  deleted_at     TIMESTAMPTZ DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT whisper_needs_target CHECK (
    NOT is_whisper OR whisper_to_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_room
  ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_whisper
  ON chat_messages(sender_id, whisper_to_id)
  WHERE is_whisper = TRUE;

-- @mentions
CREATE TABLE IF NOT EXISTS chat_mentions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id        UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioner_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id           UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  is_read           BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- DM conversations
CREATE TABLE IF NOT EXISTS dm_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_b    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_message_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_a, participant_b),
  CONSTRAINT no_self_dm CHECK (participant_a <> participant_b)
);

-- DM messages
CREATE TABLE IF NOT EXISTS dm_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES dm_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name       TEXT NOT NULL,
  sender_avatar     TEXT,
  content           TEXT,
  message_type      VARCHAR(20) DEFAULT 'text'
                      CHECK (message_type IN ('text','image','gif','voice')),
  media_url         TEXT,
  reply_to_id       UUID REFERENCES dm_messages(id) ON DELETE SET NULL,
  reply_preview     TEXT,
  read_at           TIMESTAMPTZ DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conv
  ON dm_messages(conversation_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- Rooms: anyone authenticated can read; authenticated users can create
CREATE POLICY "rooms_select" ON chat_rooms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rooms_insert" ON chat_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Messages: public messages visible to all; whispers only to sender + target
CREATE POLICY "messages_select" ON chat_messages FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    is_whisper = FALSE
    OR sender_id = auth.uid()
    OR whisper_to_id = auth.uid()
  )
);
CREATE POLICY "messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_soft_delete" ON chat_messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Mentions: only the mentioned user + mentioner can read
CREATE POLICY "mentions_select" ON chat_mentions FOR SELECT USING (
  auth.uid() = mentioned_user_id OR auth.uid() = mentioner_id
);
CREATE POLICY "mentions_insert" ON chat_mentions FOR INSERT
  WITH CHECK (auth.uid() = mentioner_id);
CREATE POLICY "mentions_update" ON chat_mentions FOR UPDATE
  USING (auth.uid() = mentioned_user_id);

-- DM conversations: only participants
CREATE POLICY "dm_conv_select" ON dm_conversations FOR SELECT USING (
  auth.uid() = participant_a OR auth.uid() = participant_b
);
CREATE POLICY "dm_conv_insert" ON dm_conversations FOR INSERT WITH CHECK (
  auth.uid() = participant_a OR auth.uid() = participant_b
);

-- DM messages: only conversation participants
CREATE POLICY "dm_msg_select" ON dm_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM dm_conversations c
    WHERE c.id = conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  )
);
CREATE POLICY "dm_msg_insert" ON dm_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM dm_conversations c
    WHERE c.id = conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  )
);

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;