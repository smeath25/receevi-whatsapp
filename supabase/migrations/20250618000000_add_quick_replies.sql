-- Add quick_replies table for predefined response templates
create table "public"."quick_replies" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" text not null,
    "category" text,
    "created_by" uuid references auth.users(id),
    "is_global" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);

-- Enable RLS
alter table "public"."quick_replies" enable row level security;

-- Create primary key
CREATE UNIQUE INDEX quick_replies_pkey ON public.quick_replies USING btree (id);
alter table "public"."quick_replies" add constraint "quick_replies_pkey" PRIMARY KEY using index "quick_replies_pkey";

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_quick_replies_updated
    BEFORE UPDATE ON public.quick_replies
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS policies
create policy "Enable read access for authenticated users"
on "public"."quick_replies"
as permissive
for select
to authenticated
using (is_global = true OR created_by = auth.uid());

create policy "Enable insert for authenticated users"
on "public"."quick_replies"
as permissive
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Enable update for creators"
on "public"."quick_replies"
as permissive
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "Enable delete for creators"
on "public"."quick_replies"
as permissive
for delete
to authenticated
using (created_by = auth.uid());

-- Add some default quick replies
INSERT INTO public.quick_replies (title, content, category, is_global) VALUES
('Greeting', 'Hello! How can I help you today?', 'Greetings', true),
('Thank You', 'Thank you for contacting us. We appreciate your message.', 'Courtesy', true),
('Business Hours', 'Our business hours are Monday to Friday, 9 AM to 6 PM. We will respond to your message during these hours.', 'Information', true),
('More Information', 'Could you please provide more details about your inquiry?', 'Questions', true),
('Confirm Receipt', 'I have received your message and will get back to you shortly.', 'Acknowledgment', true),
('Closing', 'Thank you for choosing our services. Have a great day!', 'Courtesy', true);