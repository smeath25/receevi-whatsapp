# CLAUDE.md - Receevi WhatsApp Platform

## Project Overview
**Receevi** is an open-source WhatsApp Business API webhook receiver platform built with Next.js 14, TypeScript, and Supabase. It provides a web interface similar to WhatsApp Web for managing business communications through the WhatsApp Cloud API.

## Architecture
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Backend**: Next.js API routes, Supabase Edge Functions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **UI Components**: Radix UI with Tailwind CSS
- **State Management**: React Context, TanStack React Query

## Key Features
- Contact management with WhatsApp-like interface
- Real-time message handling (text, images, videos, documents)
- Bulk message broadcasting with templates
- User role management (Admin/Agent)
- Message status tracking (sent, delivered, read, failed)
- WhatsApp Cloud API integration
- Webhook verification and processing

## Project Structure

### Core Directories
- `app/` - Next.js 14 App Router structure
  - `(authorized)/` - Protected routes requiring authentication
  - `api/` - API routes for message sending
  - `webhook/` - WhatsApp webhook handlers
- `lib/` - Core business logic and utilities
  - `repositories/` - Data access layer with repository pattern
  - `supabase/` - Supabase client configurations
- `components/` - Reusable UI components
- `types/` - TypeScript type definitions
- `supabase/` - Database migrations and Edge Functions

### Key Files
- `app/webhook/route.ts` - Main webhook handler for WhatsApp events
- `lib/repositories/*/` - Repository pattern implementations
- `middleware.ts` - Supabase session management
- `supabase/migrations/` - Database schema definitions

## Development Commands
```bash
# Development
npm run dev

# Build (Vercel compatible)
npm run build

# Production
npm run start

# Linting
npm run lint

# Vercel deployment
vercel --prod
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
Key tables:
- `contacts` - WhatsApp contacts with profile information
- `messages` - Message history with media support
- `broadcast` - Bulk message campaigns
- `message_templates` - WhatsApp message templates
- `user_roles` - User permission management

## API Endpoints
- `GET/POST /webhook` - WhatsApp webhook receiver
- `POST /api/sendMessage` - Send messages via WhatsApp API
- Supabase Edge Functions for background processing

## Testing
No specific test framework configured. Manual testing recommended through:
1. WhatsApp message sending/receiving
2. UI interaction testing
3. Webhook endpoint testing

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
- Next.js 14 - React framework
- Supabase - Backend-as-a-Service
- Radix UI - Accessible component primitives
- TanStack Query - Data fetching and caching
- Tailwind CSS - Styling framework
- React Hook Form + Zod - Form handling and validation

## Development Notes
- Repository pattern used for data access abstraction
- Real-time features implemented via Supabase subscriptions
- Webhook security enforced via signature verification
- Media files handled through Supabase storage
- Role-based access control implemented
- **Vercel Compatibility**: All features tested and verified to work on Vercel serverless platform
- WhatsApp API calls work correctly from Vercel serverless functions
- Database connections properly handled via Supabase connection pooling

## Current Status
✅ Core messaging functionality  
✅ Contact management  
✅ User authentication  
✅ Bulk broadcasting  
✅ Enhanced contact segmentation with advanced filtering  
✅ Message scheduling with background processing  
✅ WhatsApp template fetching from API (real-time)  
✅ Vercel deployment ready and tested  
⚠️ In active development - see FEATURE_ROADMAP.md for upcoming features

## Support
- GitHub Issues: https://github.com/receevi/receevi/issues
- Community Discussion: https://github.com/receevi/receevi/discussions