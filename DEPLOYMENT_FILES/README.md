# Edge Function Deployment Guide

## Missing Function: insert-bulk-contacts

The bulk contacts import feature requires the `insert-bulk-contacts` Edge Function to be deployed to Supabase.

### Quick Deploy via Supabase Dashboard

1. **Go to your Supabase project**
   - Visit: https://supabase.com/dashboard/projects
   - Select your project: `uxjgqoqotbzofamkohxj`

2. **Navigate to Edge Functions**
   - Click on "Edge Functions" in the sidebar
   - Click "Create a new function"

3. **Create the function**
   - **Function name**: `insert-bulk-contacts`
   - **Copy the entire code** from `DEPLOYMENT_FILES/INSERT_BULK_CONTACTS_STANDALONE.ts`
   - Click "Create function" or "Deploy"

### Alternative: CLI Deployment (if Docker is available)

```bash
# Make sure Docker Desktop is running first
supabase functions deploy insert-bulk-contacts
```

## What this function does:

✅ **CSV Import Processing**: Parses uploaded CSV files with contact data  
✅ **Contact Creation**: Creates contacts with phone numbers and names  
✅ **Tag Management**: Automatically creates and assigns tags to contacts  
✅ **Duplicate Handling**: Skips duplicate phone numbers gracefully  
✅ **Error Handling**: Comprehensive validation and error reporting  
✅ **Statistics**: Returns detailed import statistics  

## Expected CSV Format:

```csv
Name,Number (with country code),Tags (Comma separated)
John Doe,+1234567890,"Customer, VIP"
Jane Smith,+9876543210,"Lead, Sales"
Bob Johnson,+5555123456,Customer
```

## Environment Variables Required:

The function automatically uses these environment variables from your Supabase project:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Once Deployed:

- Bulk contact import will work in the Contacts page
- Users can upload CSV files to import multiple contacts
- Tags will be created automatically
- Comprehensive error messages for invalid data
- Download sample CSV functionality will work

## Verification:

After deployment, check:
1. Go to Contacts page in the app
2. Click "Add Bulk Contacts via CSV"
3. The dialog should open without errors
4. Download sample CSV should work
5. Upload a CSV file should process successfully