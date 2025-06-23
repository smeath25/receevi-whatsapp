# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**Receevi** is an enterprise-grade open-source WhatsApp Business API platform built with Next.js 14, TypeScript, and Supabase. It provides a comprehensive web interface similar to WhatsApp Web for managing business communications through the WhatsApp Cloud API, featuring advanced scheduling, quick replies, and bulk messaging capabilities.

## Architecture
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Backend**: Next.js API routes, Supabase Edge Functions
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with JWT tokens
- **UI Components**: Radix UI with Tailwind CSS
- **State Management**: React Context, TanStack React Query
- **Deployment**: Vercel-optimized with serverless functions

## Key Features

### Core Messaging
- **Real-time WhatsApp Chat Interface**: WhatsApp Web-like experience with live updates
- **Multi-media Support**: Text, images, videos, documents, voice messages
- **Message Status Tracking**: Real-time status updates (sent → delivered → read → failed)
- **Template Messages**: WhatsApp Business API template integration with real-time fetching
- **Webhook Processing**: Secure WhatsApp webhook handling with signature verification

### Advanced Contact Management
- **Enhanced Contact Filtering**: Advanced search by name, tags, activity status, date ranges
- **Contact Segmentation**: Smart lists and saved filters for targeted messaging
- **Bulk Import/Export**: CSV-based contact management with validation
- **Contact Tagging**: Flexible categorization and organization system
- **Contact Assignment**: Agent-specific contact routing and management

### Quick Replies System ✨ NEW
- **Predefined Templates**: Ready-to-use response templates for common inquiries
- **Category Organization**: Structured templates (Greetings, Courtesy, Information, etc.)
- **Global vs Personal**: Shared organizational templates and personal collections
- **API Integration**: Full CRUD operations via `/api/quick-replies` endpoints

### Message Scheduling ✨ NEW
- **Future Message Delivery**: Schedule messages for specific times and dates
- **Template Scheduling**: Support for WhatsApp Business templates
- **Media Scheduling**: Schedule images, videos, documents for future delivery
- **Retry Logic**: Automatic retry mechanism with intelligent failure handling
- **Background Processing**: Supabase Edge Function for reliable message delivery

### User & Role Management
- **Multi-role Support**: Granular Admin and Agent role permissions
- **Profile Management**: User profiles with metadata and preferences
- **Authentication Flow**: Secure login/logout with session management
- **Permission-based Access**: Role-based route protection and feature access

### Bulk Operations
- **Bulk Broadcasting**: Campaign management with recipient targeting
- **Campaign Scheduling**: Schedule bulk messages for future delivery
- **Status Tracking**: Real-time campaign progress and delivery status
- **Contact Segmentation**: Advanced filtering for targeted campaigns

## Project Structure

### Core Directories
```
/app/(authorized)/(panel)/          # Protected routes with authentication
├── bulk-send/                      # Bulk messaging & broadcasting interface
├── chats/[wa_id]/                  # Individual chat interface with real-time messaging
├── contacts/                       # Advanced contact management with filtering
├── quick-replies/                  # ✨ NEW: Quick reply template management
├── scheduled-messages/             # ✨ NEW: Message scheduling interface
└── users/                          # User & role management dashboard

/app/api/                           # API routes
├── sendMessage/                    # Core WhatsApp message sending
├── quick-replies/                  # ✨ NEW: Quick reply CRUD operations
├── scheduleMessage/                # ✨ NEW: Message scheduling endpoint  
├── whatsapp-templates/             # Template fetching from WhatsApp API
└── check-broadcast-status/         # Campaign status checking

/lib/repositories/                  # Repository pattern data access
├── broadcast/                      # Bulk message handling
├── contacts/                       # Contact data operations
├── message-template/               # WhatsApp template management
├── quick-replies/                  # ✨ NEW: Quick reply data access
└── scheduled-messages/             # ✨ NEW: Scheduling data operations

/supabase/functions/                # Edge Functions for background processing
├── bulk-send/                      # Bulk message processing
├── process-scheduled-messages/     # ✨ NEW: Scheduled message processor
├── sync-message-templates/         # Template synchronization
└── insert-bulk-contacts/           # Bulk contact import processing
```

### Key Files
- `app/webhook/route.ts` - WhatsApp webhook handler with signature verification
- `lib/repositories/*/` - Repository pattern implementations with TypeScript
- `middleware.ts` - Supabase session management and route protection
- `supabase/migrations/` - Database schema with RLS policies

## Development Commands

### Frontend Development
```bash
# Development server
npm run dev

# Build (Vercel compatible)
npm run build

# Production server
npm run start

# Linting
npm run lint

# Vercel deployment
vercel --prod
```

### Supabase Development Workflow
```bash
# Initial setup (one-time)
supabase login
supabase link --project-ref <Reference-Id>

# Database operations
supabase db push                    # Push schema changes to remote
supabase db reset                   # Reset local database
supabase gen types typescript --local > types/supabase.ts

# Edge Functions
supabase functions deploy           # Deploy all functions
supabase functions deploy bulk-send # Deploy specific function

# Local development stack
supabase start                      # Start local Supabase (ports 54321-54326)
supabase stop                       # Stop local stack
```

### Essential Development Scripts
```bash
# Create admin user (requires SUPABASE_SERVICE_ROLE env var)
./create-first-user.sh

# Test authentication fixes
node test-auth-fix.js
```

## Environment Variables Required
- `JWT_SECRET_KEY` - JWT signing secret
- `WEBHOOK_VERIFY_TOKEN` - WhatsApp webhook verification
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp Cloud API token
- `FACEBOOK_APP_SECRET` - Facebook app secret
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE` - Supabase service role key
- `WHATSAPP_API_PHONE_NUMBER_ID` - WhatsApp phone number ID
- `WHATSAPP_BUSINESS_ACCOUNT_ID` - WhatsApp Business Account ID

## Database Schema

### Core Tables
```sql
contacts                    # WhatsApp contacts with enhanced profiles
├── wa_id (PK)             # WhatsApp ID (primary key)
├── profile_name           # Contact display name
├── tags                   # Contact categorization tags
├── unread_count           # Unread message tracking
├── last_message_at        # Last activity timestamp
├── assigned_to            # Agent assignment
└── metadata (jsonb)       # Flexible contact data

messages                   # Comprehensive message history
├── id (PK)                # Message unique identifier
├── chat_id               # Contact reference (wa_id)
├── message (jsonb)       # Full message content and metadata
├── wam_id                # WhatsApp message ID
├── media_url             # Media attachment URLs
├── message_status        # Status tracking (sent/delivered/read/failed)
└── timestamp             # Message creation time

quick_replies ✨ NEW       # Response template system
├── id (PK)               # Template unique identifier
├── title                 # Template display name
├── content               # Template message content
├── category              # Organization category
├── is_global             # Global vs personal template
├── created_by            # User who created template
└── created_at            # Template creation timestamp

scheduled_messages ✨ NEW  # Message scheduling system
├── id (PK)               # Schedule unique identifier
├── to                    # Recipient WhatsApp ID
├── message_content       # Text message content
├── template_data (jsonb) # Template message data
├── media_url             # Optional media attachment
├── scheduled_at          # Delivery timestamp
├── status                # pending/sent/failed/cancelled
├── retry_count           # Failure retry attempts
├── created_by            # User who scheduled message
└── error_message         # Failure details

broadcast                 # Bulk messaging campaigns
├── id (PK)               # Campaign identifier
├── name                  # Campaign name
├── message_content       # Broadcast message
├── template_data (jsonb) # Template configuration
├── recipient_list        # Target contact list
├── scheduled_at          # Optional scheduling
├── status                # Campaign status tracking
└── created_by            # Campaign creator

message_templates         # WhatsApp Business templates  
├── id (PK)               # Template identifier
├── name                  # Template name
├── language              # Template language code
├── status                # Template approval status
├── components (jsonb)    # Template structure
└── last_synced           # Last API sync timestamp

user_roles               # User access control
├── user_id (PK)         # User identifier
├── role                 # admin/agent role
├── permissions (jsonb)  # Granular permissions
└── metadata (jsonb)     # User profile data
```

## API Endpoints

### Core Messaging APIs
- `GET/POST /webhook` - WhatsApp webhook receiver with signature verification
- `POST /api/sendMessage` - Send individual WhatsApp messages (text, media, templates)
- `GET /api/whatsapp-templates` - Fetch available WhatsApp Business templates
- `POST /api/check-broadcast-status` - Check bulk campaign delivery status

### ✨ NEW: Quick Replies APIs
- `GET /api/quick-replies` - Fetch user's quick reply templates
- `POST /api/quick-replies` - Create new quick reply template
- `PUT /api/quick-replies/[id]` - Update existing template
- `DELETE /api/quick-replies/[id]` - Delete template

### ✨ NEW: Scheduling APIs  
- `POST /api/scheduleMessage` - Schedule message for future delivery
- `GET /api/scheduled-messages` - List scheduled messages
- `PUT /api/scheduled-messages/[id]` - Update scheduled message
- `DELETE /api/scheduled-messages/[id]` - Cancel scheduled message

### Contact Management APIs
- `GET /api/contacts/[wa_id]` - Fetch individual contact data
- `POST /api/contacts/bulk-import` - Bulk contact import via CSV
- `PUT /api/contacts/[wa_id]` - Update contact information

### Supabase Edge Functions
- `bulk-send` - Process bulk message campaigns with retry logic
- `process-scheduled-messages` - Execute scheduled messages (runs every minute)
- `sync-message-templates` - Synchronize templates from WhatsApp API
- `insert-bulk-contacts` - Process bulk contact imports
- `update-unread-count` - Maintain message count accuracy

## Testing & Debugging

### Testing Approach
No automated test framework configured. Manual testing workflow:
1. **WhatsApp Integration Testing**: Send/receive messages to test webhook processing
2. **UI Flow Testing**: Test user interface interactions through browser
3. **Webhook Testing**: Use WhatsApp Developer Console to trigger webhook events
4. **Edge Function Testing**: Test via Supabase Functions dashboard or local calls

### Debugging Utilities
```bash
# Test authentication fixes
node test-auth-fix.js

# Debug API endpoints
curl -X POST http://localhost:3000/api/sendMessage \
  -H "Content-Type: application/json" \
  -d '{"to":"1234567890","text":"test"}'

# Check Supabase Edge Function logs
supabase functions logs <function-name>
```

### Common Debugging Patterns
- **Webhook Issues**: Check WhatsApp Developer Console webhook logs
- **Database Issues**: Use Supabase Dashboard SQL Editor for direct queries
- **Edge Function Issues**: Check function logs via Supabase CLI or dashboard
- **Authentication Issues**: Verify JWT tokens and RLS policies in Supabase

## Deployment
- **Vercel**: Primary deployment platform (verified compatible)
- **Supabase**: Database and Edge Functions hosting
- **Docker**: Available via Dockerfile for containerized deployment

### Vercel Deployment Notes
- ✅ Next.js 14 App Router fully supported
- ✅ API routes work correctly on Vercel serverless functions
- ✅ Static generation and ISR (Incremental Static Regeneration) compatible
- ✅ Environment variables configured via Vercel dashboard
- ✅ Automatic deployments from Git repository
- ⚠️ Webhook endpoints require proper domain configuration
- ⚠️ Supabase Edge Functions work independently of Vercel deployment

## Key Dependencies

### Core Framework
```json
{
  "next": "^14.0.2",                     // Next.js 14 with App Router
  "react": "^18.0.0",                    // React 18 with concurrent features
  "typescript": "^5.0.0",                // TypeScript for type safety
}
```

### Backend & Database
```json
{
  "@supabase/supabase-js": "^2.45.4",    // Supabase client with Edge Functions
  "@supabase/ssr": "^0.4.0",             // Server-side rendering support
  "jose": "^5.1.0",                      // JWT token handling
}
```

### State Management & Data Fetching
```json
{
  "@tanstack/react-query": "^5.8.1",     // Advanced data fetching and caching
  "@tanstack/react-query-devtools": "^5.8.1", // Development tools
}
```

### UI & Styling
```json
{
  "@radix-ui/react-*": "latest",         // Accessible component primitives
  "tailwindcss": "^3.3.5",               // Utility-first CSS framework
  "tailwindcss-animate": "^1.0.7",       // Animation utilities
  "lucide-react": "^0.396.0",            // Modern icon library
  "class-variance-authority": "^0.7.0",  // Component styling variants
}
```

### Form Handling & Validation
```json
{
  "react-hook-form": "^7.48.2",          // Performant form library
  "@hookform/resolvers": "^3.3.2",       // Form validation resolvers
  "zod": "^3.22.4",                      // Schema validation and TypeScript inference
}
```

### Utilities & Date Handling
```json
{
  "date-fns": "^4.1.0",                  // Comprehensive date utility library
  "clsx": "^2.0.0",                      // Conditional className utility
  "tailwind-merge": "^2.0.0",            // Tailwind class merging
}
```

## Development Notes & Architecture Patterns

### Core Architectural Patterns
- **Repository Pattern**: All data access abstracted through repositories in `/lib/repositories/`
  - Browser vs Server factory pattern for client/server-side instantiation
  - Supabase implementation with TypeScript interfaces for data consistency
- **Real-time Features**: Implemented via Supabase subscriptions (see TanStack Query integration)
- **Authentication Flow**: JWT tokens + Supabase Auth with Row Level Security (RLS)
- **Webhook Security**: SHA256 signature verification for WhatsApp webhooks in `app/webhook/route.ts`
- **Media Handling**: Supabase storage buckets with secure URL generation

### Key Development Principles
- **Environment-aware Architecture**: Browser/Server factory pattern ensures proper client instantiation
- **Type Safety**: Comprehensive TypeScript types generated from Supabase schema
- **Permission-based Access**: Role-based route protection via middleware.ts
- **Background Processing**: Edge Functions handle scheduled messages, bulk operations
- **Vercel Compatibility**: All features tested and verified to work on Vercel serverless platform

### Critical Files for Understanding Architecture
- `middleware.ts` - Session management and route protection
- `lib/repositories/*/` - Data access layer with repository pattern
- `app/webhook/route.ts` - WhatsApp webhook handler with signature verification
- `supabase/functions/` - Background processing Edge Functions
- `app/(authorized)/(panel)/layout.tsx` - Protected route wrapper

### Component Architecture & UI Patterns
- **Layout Structure**: App Router with grouped routes `(authorized)/(panel)/`
- **State Management**: React Context + TanStack Query for server state
- **UI Components**: Radix UI primitives with custom styling via Tailwind
- **Form Handling**: React Hook Form + Zod validation (see contacts/bulk-send forms)
- **Real-time Updates**: Supabase subscriptions integrated with React Query
- **Component Patterns**:
  - Client components suffixed with `Client` (e.g., `ChatContactsClient.tsx`)
  - Server components for initial data fetching
  - Context providers for shared state (e.g., `CurrentContactContext.tsx`)
  - Custom hooks for data fetching (e.g., `useContactList.ts`)

### Data Flow Architecture
1. **User Action** → Form submission/UI interaction
2. **Client Component** → React Hook Form with Zod validation
3. **API Route** → Next.js API handler in `/app/api/*`
4. **Repository Layer** → Abstract data access via repository pattern
5. **Supabase** → Database operations with RLS enforcement
6. **Real-time Updates** → Supabase subscriptions → React Query cache updates

## Current Status & Recent Updates

### ✅ Completed Features
- **Core messaging functionality** - Real-time WhatsApp chat interface
- **Advanced contact management** - Enhanced filtering and segmentation
- **User authentication & roles** - Multi-role support with permissions
- **Bulk broadcasting** - Campaign management with status tracking
- **✨ Quick Replies System** - Template-based response management
- **✨ Message Scheduling** - Future message delivery with retry logic
- **WhatsApp template integration** - Real-time template fetching from API
- **File upload & media handling** - Enhanced media processing capabilities
- **Bulk contact operations** - Improved CSV import with validation
- **Vercel deployment optimization** - Production-ready serverless deployment

### 🔄 Recent Improvements (Last 5 Commits)
1. **Vercel Bulk Import Fix** (`5f0d48d`) - Resolved build issues for production deployment
2. **Bulk Contact Management** (`d02d316`) - Enhanced contact import functionality  
3. **Quick Replies & Broadcasting** (`ff1d9bf`) - Added template system and improved broadcasting
4. **Bulk Campaign Error Handling** (`d96f7d5`) - Better error reporting and retry logic
5. **Bulk Send Optimization** (`a7f265c`) - Performance improvements for large campaigns

### ⚠️ In Active Development
- Advanced analytics and reporting dashboard
- Multi-language template support
- Enhanced webhook processing
- API rate limiting and optimization
- See FEATURE_ROADMAP.md for comprehensive upcoming features

## Support
- GitHub Issues: https://github.com/receevi/receevi/issues
- Community Discussion: https://github.com/receevi/receevi/discussions