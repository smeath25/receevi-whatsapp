-- Fix existing broadcast_contact records that have reply_counted = true but replied_at is NULL
-- This SQL script should be run in your Supabase SQL Editor to fix historical data

UPDATE broadcast_contact 
SET replied_at = COALESCE(
    -- Try to get the timestamp from the most recent message from this contact
    (SELECT messages.created_at 
     FROM messages 
     WHERE messages.chat_id = broadcast_contact.contact_id 
       AND messages.is_received = true 
       AND messages.created_at > broadcast_contact.created_at
     ORDER BY messages.created_at DESC 
     LIMIT 1),
    -- Fallback: use a timestamp shortly after the broadcast was sent
    broadcast_contact.sent_at + INTERVAL '5 minutes'
)
WHERE reply_counted = true 
  AND replied_at IS NULL;

-- Check the results
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN reply_counted = true AND replied_at IS NOT NULL THEN 1 END) as fixed_replies,
    COUNT(CASE WHEN reply_counted = true AND replied_at IS NULL THEN 1 END) as still_null_replies
FROM broadcast_contact;