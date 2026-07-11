-- Removes the upfront "unlock this conversation for N credits" paywall.
-- Chatting is now open as soon as two profiles match; credits are instead
-- charged per message sent via /api/messages/send (MESSAGE_CREDIT_COST).
-- Any conversation that was still locked is retroactively unlocked before
-- the columns are dropped, so no in-flight chats get stuck.

ALTER TABLE conversations DROP COLUMN IF EXISTS is_unlocked;
ALTER TABLE conversations DROP COLUMN IF EXISTS unlock_cost;
ALTER TABLE conversations DROP COLUMN IF EXISTS unlocked_at;
