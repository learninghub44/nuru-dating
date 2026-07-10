-- =============================================================================
-- Nuru Dating — Security & Feature Migration
-- Run this after supabase/schema.sql
-- Adds: RLS policies for every table, an atomic wallet-crediting RPC,
-- automatic wallet creation, notification triggers, rate limiting table,
-- and a couple of schema fixes discovered while building the backend.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema fixes
-- -----------------------------------------------------------------------------

-- AI dating-coach conversations aren't tied to a specific companion.
ALTER TABLE ai_messages ALTER COLUMN ai_companion_id DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- Rate limiting (used by lib/rate-limit.ts — durable across edge isolates)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No client policies: only the service-role key (which bypasses RLS) touches this table.

-- -----------------------------------------------------------------------------
-- Atomic credit spending, used by /api/conversations/unlock. Prevents the
-- double-spend / race-condition risk of a client reading balance then
-- writing balance - cost in two separate round trips.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION spend_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_reference_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_wallet_id UUID;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet_id, 'spend', p_amount, p_description, p_reference_id);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Helper: is the current user an admin?
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = check_user_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- Auto-create a wallet whenever a profile is created (removes the need for
-- insecure client-side "create wallet if missing" logic).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_profile_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile_wallet();

-- -----------------------------------------------------------------------------
-- Atomic wallet crediting, used by /api/payments/verify and the Paystack
-- webhook. SECURITY DEFINER + row lock means concurrent calls for the same
-- payment (e.g. client verify racing the webhook) can't double-credit.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION credit_wallet_for_payment(
  p_user_id UUID,
  p_payment_id UUID,
  p_credits INTEGER,
  p_description TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_status TEXT;
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Lock the payment row so a concurrent call sees the updated status.
  SELECT status INTO v_status FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_status = 'completed' THEN
    -- Already credited — return current balance idempotently.
    SELECT balance INTO v_new_balance FROM wallets WHERE user_id = p_user_id;
    RETURN v_new_balance;
  END IF;

  UPDATE payments
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_payment_id;

  INSERT INTO wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets
  SET balance = balance + p_credits, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet_id, 'purchase', p_credits, p_description, p_payment_id);

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'payment',
    'Payment successful',
    p_credits || ' credits have been added to your wallet.',
    jsonb_build_object('payment_id', p_payment_id, 'credits', p_credits)
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Notification triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_on_match()
RETURNS TRIGGER AS $$
DECLARE
  v_user1_name TEXT;
  v_user2_name TEXT;
BEGIN
  SELECT full_name INTO v_user1_name FROM profiles WHERE id = NEW.user1_id;
  SELECT full_name INTO v_user2_name FROM profiles WHERE id = NEW.user2_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES
    (NEW.user1_id, 'match', 'New match!', 'You matched with ' || COALESCE(v_user2_name, 'someone new') || '.',
      jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user2_id)),
    (NEW.user2_id, 'match', 'New match!', 'You matched with ' || COALESCE(v_user1_name, 'someone new') || '.',
      jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user1_id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_created_notify ON matches;
CREATE TRIGGER on_match_created_notify
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION notify_on_match();

CREATE OR REPLACE FUNCTION notify_on_super_like()
RETURNS TRIGGER AS $$
DECLARE
  v_liker_name TEXT;
BEGIN
  IF NEW.is_super_like THEN
    SELECT full_name INTO v_liker_name FROM profiles WHERE id = NEW.liker_id;

    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.liked_id,
      'like',
      'Someone super liked you!',
      COALESCE(v_liker_name, 'Someone') || ' sent you a super like.',
      jsonb_build_object('liker_id', NEW.liker_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_super_like_notify ON likes;
CREATE TRIGGER on_super_like_notify
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_super_like();

CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_match RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT m.user1_id, m.user2_id INTO v_match
  FROM conversations c
  JOIN matches m ON m.id = c.match_id
  WHERE c.id = NEW.conversation_id;

  IF v_match.user1_id = NEW.sender_id THEN
    v_recipient_id := v_match.user2_id;
  ELSE
    v_recipient_id := v_match.user1_id;
  END IF;

  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'message',
    'New message from ' || COALESCE(v_sender_name, 'a match'),
    LEFT(NEW.content, 120),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
  );

  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created_notify ON messages;
CREATE TRIGGER on_message_created_notify
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- profiles: readable by any authenticated user (discovery), writable only by owner.
CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- likes: users manage their own outgoing likes; a user can also see likes
-- directed at them (needed for "who liked me" — the app layer decides
-- whether to reveal identities behind a paywall).
CREATE POLICY "likes_select_involved" ON likes
  FOR SELECT TO authenticated USING (liker_id = auth.uid() OR liked_id = auth.uid());
CREATE POLICY "likes_insert_own" ON likes
  FOR INSERT TO authenticated WITH CHECK (liker_id = auth.uid());
CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE TO authenticated USING (liker_id = auth.uid());

-- matches: only visible to, and only insertable by, participants — and only
-- when a mutual like already exists (prevents fabricating matches).
CREATE POLICY "matches_select_involved" ON matches
  FOR SELECT TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "matches_insert_mutual_like" ON matches
  FOR INSERT TO authenticated WITH CHECK (
    (user1_id = auth.uid() OR user2_id = auth.uid())
    AND EXISTS (SELECT 1 FROM likes WHERE liker_id = user1_id AND liked_id = user2_id)
    AND EXISTS (SELECT 1 FROM likes WHERE liker_id = user2_id AND liked_id = user1_id)
  );

-- conversations: visible/updatable only by the two matched users.
CREATE POLICY "conversations_select_involved" ON conversations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = conversations.match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );
CREATE POLICY "conversations_update_involved" ON conversations
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = conversations.match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- messages: visible/insertable only by participants of the parent conversation.
CREATE POLICY "messages_select_involved" ON messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- notifications: users can only read/mark-read their own; created by triggers
-- or the service role, never inserted directly by clients.
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- wallets: read-only to the owner. Balance changes only happen through
-- credit_wallet_for_payment (payments) or service-role spend endpoints.
CREATE POLICY "wallets_select_own" ON wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- wallet_transactions: read-only to the owning wallet's user.
CREATE POLICY "wallet_transactions_select_own" ON wallet_transactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM wallets w WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid())
  );

-- payments: read-only to the owner. Rows are created/updated only via the
-- service-role client in /api/payments/*.
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ai_companions: any authenticated user can browse active companions.
CREATE POLICY "ai_companions_select_active" ON ai_companions
  FOR SELECT TO authenticated USING (is_active = true);

-- ai_messages: users manage only their own conversation history.
CREATE POLICY "ai_messages_select_own" ON ai_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ai_messages_insert_own" ON ai_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- reports: users can file reports and see their own; admins review via the
-- service-role client in the admin dashboard.
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "reports_insert_own" ON reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- blocks: fully owner-managed.
CREATE POLICY "blocks_select_own" ON blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "blocks_insert_own" ON blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "blocks_delete_own" ON blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- admins: a user may check whether *they* are an admin; nothing else is
-- exposed client-side. Admin dashboard aggregate queries use the service role.
CREATE POLICY "admins_select_own" ON admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- analytics / settings: no client policies at all — service role only.
