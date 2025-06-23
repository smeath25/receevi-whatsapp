# Scheduled Campaigns Feature Guide

This guide explains how to use the new scheduled campaigns feature in Receevi.

## ✨ New Features Added

### 1. **Campaign Scheduling**
- Schedule WhatsApp broadcast campaigns for future delivery
- Date/time picker with timezone support
- Validation to prevent scheduling in the past

### 2. **Scheduled Campaign Management**
- Dedicated page to view all scheduled campaigns
- Real-time status tracking (Scheduled → Processing → Completed/Failed)
- Manual trigger for processing due campaigns
- Cancel scheduled campaigns (if still pending)

### 3. **Enhanced Campaign Status**
- Status badges on all campaign lists
- Clear distinction between immediate and scheduled campaigns
- Processing status updates

## 🚀 How to Use

### Creating a Scheduled Campaign

1. **Go to Bulk Send**: Navigate to `/bulk-send/new-broadcast`
2. **Fill Campaign Details**: Name, template, language, and tags
3. **Enable Scheduling**: Check "Schedule this campaign for later"
4. **Set Date/Time**: Choose when the campaign should be sent
5. **Create Campaign**: Click submit to schedule

### Managing Scheduled Campaigns

1. **View Scheduled Campaigns**: Go to `/scheduled-campaigns`
2. **Process Due Campaigns**: Click "Process Now" to trigger manual processing
3. **Monitor Status**: Watch campaigns progress through states
4. **View Details**: Click campaign names to see recipient details

### Campaign States

- **Scheduled**: Campaign is waiting for scheduled time
- **Processing**: Campaign is currently being sent
- **Completed**: All messages have been processed
- **Failed**: Campaign failed due to an error
- **Cancelled**: Campaign was manually cancelled

## 🛠️ Technical Implementation

### Database Changes
- Added `scheduled_at` and `status` fields to `broadcast` table
- New migration: `20250623000000_add_scheduled_at_to_broadcast.sql`

### New Components
- `SchedulingSection.tsx` - Date/time picker for scheduling
- `ScheduledCampaignsClient.tsx` - Management interface
- `/scheduled-campaigns` page for campaign management

### Backend Processing
- `process-scheduled-broadcasts` Edge Function runs periodically
- Manual trigger via `/api/process-scheduled-campaigns`
- Proper status transitions and error handling

### API Updates
- Enhanced `bulkSend()` function to handle scheduling
- Updated bulk-send Edge Function for scheduled campaigns
- New repository methods for scheduled campaign queries

## 📅 Automated Processing

### Automatic Processing
The system can process scheduled campaigns automatically using:
- Supabase Edge Function: `process-scheduled-broadcasts`
- Can be triggered via cron job or manual API call
- Processes campaigns when their scheduled time arrives

### Manual Processing
- Use the "Process Now" button in `/scheduled-campaigns`
- Useful for testing or immediate processing of due campaigns
- API endpoint: `POST /api/process-scheduled-campaigns`

## 🔒 Security & Validation

### Input Validation
- Scheduled date must be in the future
- All existing campaign validations apply
- User authentication required for all operations

### Status Management
- Atomic status updates prevent race conditions
- Failed campaigns are properly marked and logged
- Retry logic for temporary failures

## 📱 User Experience

### Immediate vs Scheduled
- **Immediate Campaigns**: Process immediately (existing behavior)
- **Scheduled Campaigns**: Stored and processed at scheduled time
- Clear visual indicators for campaign type

### Real-time Updates
- Status badges show current campaign state
- Timestamps show scheduled vs created times
- Progress tracking for active campaigns

## 🎯 Use Cases

### Perfect for:
- **Marketing Campaigns**: Schedule promotional messages for optimal timing
- **Announcements**: Time-sensitive announcements for specific dates
- **Global Audiences**: Schedule for different timezone audiences
- **Event Reminders**: Automated reminders before events
- **Follow-up Messages**: Scheduled follow-ups after purchases

### Example Workflows:
1. **Holiday Promotion**: Schedule Christmas offers for December 25th
2. **Event Reminders**: Schedule conference reminders 1 day before
3. **Weekly Updates**: Schedule weekly newsletters every Monday
4. **Time Zone Marketing**: Schedule campaigns for different regions

## 🔧 Administration

### Monitoring
- View all campaigns (immediate + scheduled) in `/bulk-send`
- Dedicated scheduled campaigns view in `/scheduled-campaigns`
- Status tracking and error reporting

### Maintenance
- Manual processing trigger for troubleshooting
- Clear status transitions for debugging
- Comprehensive logging for audit trails

This scheduled campaigns feature enhances Receevi's bulk messaging capabilities by providing precise timing control and better campaign management workflows.