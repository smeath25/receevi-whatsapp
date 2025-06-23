-- Add scheduled_at field to broadcast table for campaign scheduling
ALTER TABLE "public"."broadcast" 
ADD COLUMN "scheduled_at" timestamp with time zone;

-- Add status field to broadcast table to track scheduled vs immediate campaigns
ALTER TABLE "public"."broadcast" 
ADD COLUMN "status" text NOT NULL DEFAULT 'immediate' 
CHECK (status IN ('immediate', 'scheduled', 'processing', 'completed', 'cancelled', 'failed'));

-- Create index for efficient querying of scheduled broadcasts
CREATE INDEX broadcast_scheduled_at_status_idx 
ON public.broadcast(scheduled_at, status) 
WHERE status = 'scheduled';

-- Function to get pending scheduled broadcasts
CREATE OR REPLACE FUNCTION get_pending_scheduled_broadcasts(limit_count integer DEFAULT 50)
RETURNS TABLE (
    id uuid,
    name text,
    template_name text,
    language text,
    contact_tags text[],
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone
) 
LANGUAGE sql
SECURITY definer
AS $$
    SELECT 
        b.id,
        b.name,
        b.template_name,
        b.language,
        b.contact_tags,
        b.scheduled_at,
        b.created_at
    FROM broadcast b
    WHERE b.status = 'scheduled' 
    AND b.scheduled_at <= now()
    ORDER BY b.scheduled_at ASC
    LIMIT limit_count;
$$;

-- Function to mark broadcast as processing
CREATE OR REPLACE FUNCTION mark_broadcast_processing(broadcast_id uuid)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
    UPDATE broadcast 
    SET status = 'processing'
    WHERE id = broadcast_id AND status = 'scheduled';
$$;

-- Function to mark broadcast as completed
CREATE OR REPLACE FUNCTION mark_broadcast_completed(broadcast_id uuid)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
    UPDATE broadcast 
    SET status = 'completed'
    WHERE id = broadcast_id AND status = 'processing';
$$;

-- Function to mark broadcast as failed
CREATE OR REPLACE FUNCTION mark_broadcast_failed(broadcast_id uuid, error_msg text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
    UPDATE broadcast 
    SET status = 'failed'
    WHERE id = broadcast_id AND status IN ('scheduled', 'processing');
$$;