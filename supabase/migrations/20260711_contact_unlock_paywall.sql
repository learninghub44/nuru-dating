-- Adds the "pay to unlock contact & continue on WhatsApp" feature
-- (the afrointroductions-style model): in-app messaging stays free and
-- unlimited once matched, but revealing a match's WhatsApp number so the
-- conversation can move off-platform is a paid unlock.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- profiles' RLS policy is row-level only ("USING (true)" for any authenticated
-- user) — it does not scope columns. So this number must never be fetched by
-- a `select('*')` (or an explicit whatsapp_number column) on ANOTHER user's
-- profile from client code; discover/page.tsx and chat/[userId]/page.tsx
-- allowlist columns for exactly this reason. The only legitimate reads are:
-- (a) a user loading their own profile (app/profile/page.tsx), and
-- (b) the service-role admin client in /api/conversations/unlock-contact,
--     which only returns it after spend_credits succeeds.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_unlock_cost INTEGER DEFAULT 50;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_unlocked_at TIMESTAMP WITH TIME ZONE;

-- Belt-and-braces on top of the code-discipline note above: this
-- SECURITY DEFINER function is the one client-callable (authenticated role)
-- path to read a match's WhatsApp number. It re-checks membership and the
-- unlock flag itself, so even a user calling Supabase directly from
-- devtools — bypassing app code entirely — can't read the number early.
CREATE OR REPLACE FUNCTION get_unlocked_whatsapp(p_conversation_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_other_id UUID;
  v_number TEXT;
BEGIN
  SELECT
    CASE WHEN m.user1_id = auth.uid() THEN m.user2_id ELSE m.user1_id END
  INTO v_other_id
  FROM conversations c
  JOIN matches m ON m.id = c.match_id
  WHERE c.id = p_conversation_id
    AND c.contact_unlocked = TRUE
    AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid());

  IF v_other_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT whatsapp_number INTO v_number FROM profiles WHERE id = v_other_id;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION get_unlocked_whatsapp(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_unlocked_whatsapp(UUID) TO authenticated;
