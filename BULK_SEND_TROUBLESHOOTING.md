# Bulk Send Troubleshooting Guide

## Common Error Messages and Solutions

### "Edge Function returned a non-2xx status code"

This error indicates the bulk-send edge function encountered an issue. The function now provides detailed error messages:

#### Possible Causes:

1. **Missing Required Fields**
   - Error: "Missing required fields: name, messageTemplate, and language are required"
   - Solution: Ensure all form fields are filled

2. **No Tags Selected**  
   - Error: "At least one contact tag must be selected"
   - Solution: Select at least one tag from the dropdown

3. **No Contacts Found**
   - Error: "No contacts found with the selected tags: [tag names]"
   - Solution: Import contacts with these tags or select different tags

4. **WhatsApp Template Issues**
   - Error: "No template found with name: [template] and language: [language]"
   - Solution: Refresh templates from WhatsApp or check template approval status

5. **Environment Configuration**
   - Error: "WHATSAPP_BUSINESS_ACCOUNT_ID environment variable is not set"
   - Solution: Verify Supabase Edge Function environment variables

6. **Authentication Issues**
   - Error: "User authentication failed"
   - Solution: Log out and log back in

## Debugging Steps

1. **Check Form Data**
   - Verify all required fields are filled
   - Ensure tags are selected from dropdown
   - Confirm template and language are selected

2. **Verify Tag Data**
   - Go to Contacts page and confirm contacts have the selected tags
   - Use "Create Sample Tags" if no tags exist

3. **Check Template Status**
   - Use "Refresh from WhatsApp" button in template selection
   - Verify template is approved in WhatsApp Business Manager

4. **Review Edge Function Logs**
   - Check Supabase Dashboard → Edge Functions → bulk-send → Logs
   - Look for specific error messages and details

## Success Response Format

When successful, the bulk-send function returns:
```json
{
  "success": true,
  "message": "Bulk send initiated successfully",
  "broadcastId": "uuid",
  "contactsScheduled": 25,
  "workersStarted": 3
}
```

## Environment Variables Required

For Supabase Edge Functions:
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ACCESS_TOKEN`

## Contact the Development Team

If issues persist, provide:
1. Exact error message
2. Form data used (name, template, language, tags)
3. Number of contacts with selected tags
4. Edge function logs from Supabase Dashboard