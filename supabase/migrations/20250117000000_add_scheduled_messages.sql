-- Create scheduled_messages table
create table "public"."scheduled_messages" (
    "id" uuid default gen_random_uuid() primary key,
    "to" numeric not null,
    "message_content" text,
    "message_type" text not null check (message_type in ('text', 'template', 'image', 'video', 'document')),
    "file_data" jsonb, -- For storing file information
    "template_data" jsonb, -- For storing template request data
    "scheduled_at" timestamp with time zone not null,
    "status" text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid references auth.users(id),
    "sent_at" timestamp with time zone,
    "wam_id" text, -- WhatsApp message ID when sent
    "error_message" text,
    "retry_count" integer default 0,
    "max_retries" integer default 3
);

-- Enable row level security
alter table "public"."scheduled_messages" enable row level security;

-- Create index for efficient querying
create index scheduled_messages_scheduled_at_status_idx on public.scheduled_messages(scheduled_at, status) where status = 'pending';
create index scheduled_messages_to_idx on public.scheduled_messages(to);
create index scheduled_messages_created_by_idx on public.scheduled_messages(created_by);

-- Create RLS policies
create policy "Users can view their own scheduled messages"
on "public"."scheduled_messages"
as permissive
for select
to authenticated
using (created_by = auth.uid());

create policy "Users can insert their own scheduled messages"
on "public"."scheduled_messages"
as permissive
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Users can update their own scheduled messages"
on "public"."scheduled_messages"
as permissive
for update
to authenticated
using (created_by = auth.uid());

create policy "Users can delete their own scheduled messages"
on "public"."scheduled_messages"
as permissive
for delete
to authenticated
using (created_by = auth.uid());

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_scheduled_messages_updated_at
    before update on scheduled_messages
    for each row
    execute function update_updated_at_column();

-- Function to get pending scheduled messages
create or replace function get_pending_scheduled_messages(limit_count integer default 100)
returns table (
    id uuid,
    to numeric,
    message_content text,
    message_type text,
    file_data jsonb,
    template_data jsonb,
    scheduled_at timestamp with time zone,
    created_by uuid,
    retry_count integer
) 
language sql
security definer
as $$
    select 
        sm.id,
        sm.to,
        sm.message_content,
        sm.message_type,
        sm.file_data,
        sm.template_data,
        sm.scheduled_at,
        sm.created_by,
        sm.retry_count
    from scheduled_messages sm
    where sm.status = 'pending' 
    and sm.scheduled_at <= now()
    and sm.retry_count < sm.max_retries
    order by sm.scheduled_at asc
    limit limit_count;
$$;

-- Function to mark message as sent
create or replace function mark_scheduled_message_sent(message_id uuid, whatsapp_message_id text)
returns void
language sql
security definer
as $$
    update scheduled_messages 
    set 
        status = 'sent',
        sent_at = now(),
        wam_id = whatsapp_message_id,
        updated_at = now()
    where id = message_id;
$$;

-- Function to mark message as failed
create or replace function mark_scheduled_message_failed(message_id uuid, error_msg text)
returns void
language sql
security definer
as $$
    update scheduled_messages 
    set 
        status = case 
            when retry_count + 1 >= max_retries then 'failed'
            else 'pending'
        end,
        retry_count = retry_count + 1,
        error_message = error_msg,
        updated_at = now()
    where id = message_id;
$$;