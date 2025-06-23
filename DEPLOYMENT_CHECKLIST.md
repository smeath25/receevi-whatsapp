# 🚀 Scheduled Campaigns Deployment Checklist

## ✅ Manual Deployment Steps

### 1. **Database Migration** (REQUIRED)
Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Add scheduled_at field to broadcast table for campaign scheduling
ALTER TABLE "public"."broadcast" 
ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;

-- Add status field to broadcast table to track scheduled vs immediate campaigns
ALTER TABLE "public"."broadcast" 
ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'immediate';

-- Add check constraint for status field (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'broadcast_status_check'
    ) THEN
        ALTER TABLE "public"."broadcast" 
        ADD CONSTRAINT broadcast_status_check 
        CHECK (status IN ('immediate', 'scheduled', 'processing', 'completed', 'cancelled', 'failed'));
    END IF;
END $$;

-- Create index for efficient querying of scheduled broadcasts
CREATE INDEX IF NOT EXISTS broadcast_scheduled_at_status_idx 
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
```

### 2. **Deploy Edge Function** (REQUIRED)
1. Go to **Supabase Dashboard → Edge Functions**
2. Click **Create a new function**
3. Name: `process-scheduled-broadcasts`
4. Copy this standalone code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Constants
const PROCESSING_LIMIT = 1000
const PARALLEL_BATCH_COUNT = 3

// Create Supabase client
function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

async function markContactsForSend(supabase: any, broadcastId: string, tags: string[]) {
  let from = 0
  let lastFetchedCount;
  let scheduledCount = 0;
  const batches = []
  
  do {
    const batchId = crypto.randomUUID()
    const to = from + PROCESSING_LIMIT - 1
    console.log(`BroadcastId: ${broadcastId} - Analyzing contacts to send message ${from} ${to}...`)
    
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: true })
      .overlaps('tags', tags)
      .range(from, to)
    
    if (error) throw error
    
    if (!contacts || contacts.length === 0) {
      console.log(`BroadcastId: ${broadcastId} - No more contacts found for tags: ${tags.join(', ')}`)
      break
    }
    
    const broadcastContacts = contacts.map((item: any) => {
      return {
        broadcast_id: broadcastId,
        contact_id: item.wa_id,
        batch_id: batchId
      }
    })
    
    const { error: errorContactInsert } = await supabase
      .from('broadcast_contact')
      .insert(broadcastContacts)
    if (errorContactInsert) throw errorContactInsert
    
    batches.push(batchId)
    
    const { error: errorBatchInsert } = await supabase
      .from('broadcast_batch')
      .insert([{
        id: batchId,
        broadcast_id: broadcastId,
        scheduled_count: contacts.length
      }])
    if (errorBatchInsert) throw errorBatchInsert
    
    scheduledCount += contacts.length
    lastFetchedCount = contacts.length
    from = to + 1
  } while (lastFetchedCount === PROCESSING_LIMIT)
  
  return { scheduledCount, batches }
}

async function processScheduledBroadcast(supabase: any, broadcast: any) {
  console.log(`Processing scheduled broadcast: ${broadcast.id} - ${broadcast.name}`)
  
  try {
    // Mark broadcast as processing
    const { error: updateError } = await supabase
      .from('broadcast')
      .update({ status: 'processing' })
      .eq('id', broadcast.id)
      .eq('status', 'scheduled')
    
    if (updateError) {
      console.error('Error updating broadcast status to processing:', updateError)
      return false
    }
    
    // Mark contacts for send
    const contactsMarkedForSent = await markContactsForSend(
      supabase, 
      broadcast.id, 
      broadcast.contact_tags
    )
    
    console.log(`BroadcastId: ${broadcast.id} - ${contactsMarkedForSent.scheduledCount} contacts marked for send`)
    
    if (contactsMarkedForSent.scheduledCount === 0) {
      console.log(`No contacts found for broadcast ${broadcast.id}`)
      // Mark as failed due to no contacts
      await supabase
        .from('broadcast')
        .update({ status: 'failed' })
        .eq('id', broadcast.id)
      return false
    }
    
    // Update scheduled count
    const { error: errorUpdateBroadcastSC } = await supabase
      .from('broadcast')
      .update({ scheduled_count: contactsMarkedForSent.scheduledCount })
      .eq('id', broadcast.id)
    
    if (errorUpdateBroadcastSC) {
      console.error('Error updating broadcast scheduled count:', errorUpdateBroadcastSC)
      return false
    }
    
    // Get message template
    const templateResponse = await fetch(
      `https://graph.facebook.com/v17.0/${Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')}/message_templates?name=${encodeURIComponent(broadcast.template_name)}&status=APPROVED`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`
        }
      }
    )
    
    if (!templateResponse.ok) {
      console.error('Failed to fetch message template:', templateResponse.status)
      await supabase
        .from('broadcast')
        .update({ status: 'failed' })
        .eq('id', broadcast.id)
      return false
    }
    
    const templateData = await templateResponse.json()
    const template = templateData.data.find((t: any) => 
      t.name === broadcast.template_name && 
      t.language === broadcast.language && 
      t.status === 'APPROVED'
    )
    
    if (!template) {
      console.error('Template not found or not approved:', broadcast.template_name, broadcast.language)
      await supabase
        .from('broadcast')
        .update({ status: 'failed' })
        .eq('id', broadcast.id)
      return false
    }
    
    // Start batch processing workers
    const workerCount = Math.min(PARALLEL_BATCH_COUNT, contactsMarkedForSent.batches.length)
    for (let i = 0; i < workerCount; i++) {
      // Don't await these calls - they should run in background
      supabase.functions.invoke('send-message-batch', {
        body: {
          broadcast: broadcast,
          messageTemplate: template
        }
      }).catch((workerError: any) => {
        console.error(`Error invoking worker ${i}:`, workerError)
      })
    }
    
    console.log(`Started ${workerCount} workers for broadcast ${broadcast.id}`)
    return true
    
  } catch (error) {
    console.error('Error processing scheduled broadcast:', error)
    
    // Mark as failed
    await supabase
      .from('broadcast')
      .update({ status: 'failed' })
      .eq('id', broadcast.id)
    
    return false
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()
    
    // Get pending scheduled broadcasts
    const { data: scheduledBroadcasts, error } = await supabase
      .from('broadcast')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10) // Process up to 10 broadcasts at a time
    
    if (error) {
      console.error('Error fetching scheduled broadcasts:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scheduled broadcasts' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }
    
    if (!scheduledBroadcasts || scheduledBroadcasts.length === 0) {
      console.log('No scheduled broadcasts found')
      return new Response(
        JSON.stringify({ message: 'No scheduled broadcasts to process' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }
    
    console.log(`Found ${scheduledBroadcasts.length} scheduled broadcasts to process`)
    
    // Process each scheduled broadcast
    const results = []
    for (const broadcast of scheduledBroadcasts) {
      const success = await processScheduledBroadcast(supabase, broadcast)
      results.push({
        broadcastId: broadcast.id,
        name: broadcast.name,
        success: success
      })
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`Processed ${results.length} broadcasts, ${successCount} successful`)
    
    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} scheduled broadcasts`,
        results: results,
        successCount: successCount
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
    
  } catch (error) {
    console.error('Error in process-scheduled-broadcasts:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
  }
})
```

5. Click **Deploy function**

### 3. **Environment Variables Check** (REQUIRED)
Make sure these are set in **Supabase → Settings → Environment variables**:
- ✅ `WHATSAPP_BUSINESS_ACCOUNT_ID`
- ✅ `WHATSAPP_ACCESS_TOKEN`

### 4. **Deploy Frontend** (REQUIRED)
Run your normal deployment process:
```bash
npm run build
# Deploy to Vercel/your hosting platform
```

## 🧪 Testing Guide

### Test 1: Create a Scheduled Campaign
1. Go to `/bulk-send/new-broadcast`
2. Fill in campaign details
3. Check "Schedule this campaign for later"
4. Set date/time 2 minutes in the future
5. Submit campaign
6. Verify campaign appears in database with `status = 'scheduled'`

### Test 2: Manual Processing
1. Go to `/scheduled-campaigns`
2. Click "Process Now" button
3. Check Edge Function logs in Supabase
4. Verify campaign status changes to `processing` then `completed`

### Test 3: Automatic Processing (Optional)
Set up a cron job or periodic trigger to call:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-scheduled-broadcasts \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 🔍 Verification Steps

### Database Verification
```sql
-- Check if columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'broadcast' 
AND column_name IN ('scheduled_at', 'status');

-- Check existing broadcasts have status
SELECT id, name, status, scheduled_at, created_at 
FROM broadcast 
ORDER BY created_at DESC 
LIMIT 5;
```

### Edge Function Verification
- Check function appears in **Supabase → Edge Functions**
- Test invoke manually from dashboard
- Check logs for any errors

### Frontend Verification
- `/bulk-send/new-broadcast` shows scheduling option
- `/scheduled-campaigns` page loads without errors
- `/bulk-send` shows status badges correctly

## 🚨 Troubleshooting

### Database Issues
- **Error**: Column already exists → Use `IF NOT EXISTS` in SQL
- **Error**: Constraint violation → Check existing data in broadcast table

### Edge Function Issues  
- **Error**: Function not found → Redeploy the function
- **Error**: Missing env vars → Check WhatsApp environment variables
- **Error**: Template not found → Verify WhatsApp template is approved

### Frontend Issues
- **Error**: Type errors → Update `lib/database.types.ts` with new fields
- **Error**: Import errors → Check all new component imports

## ✅ Success Criteria

- ✅ Database migration applied without errors
- ✅ Edge function deployed and appears in dashboard  
- ✅ Frontend builds successfully (`npm run build`)
- ✅ Can create scheduled campaigns
- ✅ Scheduled campaigns appear in `/scheduled-campaigns`
- ✅ Manual processing works ("Process Now" button)
- ✅ Status badges display correctly in campaign lists

## 🎯 Post-Deployment

### Set Up Automation (Optional)
Configure a cron job to run every minute:
```bash
# Add to your server's crontab
* * * * * curl -X POST https://your-project.supabase.co/functions/v1/process-scheduled-broadcasts -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Monitor Usage
- Check Edge Function logs regularly
- Monitor campaign success rates
- Set up alerts for failed campaigns

Your scheduled campaigns feature is now ready! 🚀