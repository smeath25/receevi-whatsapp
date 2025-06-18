# Supabase Edge Function Authentication Fix

## Problem Summary

Your Supabase Edge Functions were failing with "Auth session missing!" error when trying to authenticate users, even though the JWT tokens were being passed correctly and worked everywhere else in your application.

## Root Cause

The issue was in how the Supabase client was being created in Edge Functions. The code was using `SUPABASE_SERVICE_ROLE_KEY` while also passing user JWT tokens in the Authorization header, which creates a conflict:

- **Service Role Keys**: Bypass Row Level Security (RLS) and authentication entirely
- **User JWT Tokens**: Require proper authentication and respect RLS policies
- **The Conflict**: You can't mix both approaches - using a service role key with a user token causes authentication to fail

## The Fix

### Before (Broken)
```typescript
// supabase/functions/_shared/client.ts
export function createSupabaseClient(authorizationHeader: string) {
    return createClient<Database>(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // ❌ Wrong key
        { global: { headers: { Authorization: authorizationHeader } } }
    )
}
```

### After (Fixed)
```typescript
// supabase/functions/_shared/client.ts
export function createSupabaseClient(authorizationHeader: string) {
    // For user authentication, use the anon key, not the service role key
    // The service role key bypasses RLS and authentication, which conflicts with user JWT tokens
    const supabaseKey = authorizationHeader ? 
        Deno.env.get('SUPABASE_ANON_KEY') ?? '' : 
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    return createClient<Database>(
        Deno.env.get('SUPABASE_URL') ?? '',
        supabaseKey,
        { 
            global: { 
                headers: authorizationHeader ? { Authorization: authorizationHeader } : {} 
            } 
        }
    )
}
```

## Files Modified

1. **`supabase/functions/_shared/client.ts`** - Main fix
2. **`supabase/functions/bulk-send/index.ts`** - Uses the fixed client
3. **`supabase/functions/setup/index.ts`** - Fixed authentication
4. **`supabase/functions/sync-message-templates/index.ts`** - Fixed authentication

## How It Works

1. **When a user JWT token is provided**: Use `SUPABASE_ANON_KEY` + Authorization header
   - This respects RLS policies
   - Properly authenticates the user
   - Allows user-specific operations

2. **When no user token is provided**: Use `SUPABASE_SERVICE_ROLE_KEY`
   - For background jobs that need admin privileges
   - Bypasses RLS for system operations

## Deployment Instructions

1. **Deploy the updated functions**:
   ```bash
   npx supabase functions deploy bulk-send
   npx supabase functions deploy setup
   npx supabase functions deploy sync-message-templates
   ```

2. **Test the fix**:
   - Use the provided `test-auth-fix.js` script
   - Or test through your application's bulk send feature

## Why This Fixes the Issue

- **Before**: Service role key + user token = authentication conflict
- **After**: Anon key + user token = proper authentication

The anon key allows the Supabase client to properly validate user JWT tokens and respect Row Level Security policies, while the service role key is reserved for operations that need admin privileges.

## Verification

After deployment, your bulk send functionality should work without the "Auth session missing!" error. The Edge Functions will now properly authenticate users and respect your database's Row Level Security policies.

## Additional Notes

- The `process-scheduled-messages` function was left unchanged as it's a background job that correctly uses service role privileges
- All environment variables remain the same
- No changes needed to client-side code
- RLS policies will now be properly enforced in Edge Functions 