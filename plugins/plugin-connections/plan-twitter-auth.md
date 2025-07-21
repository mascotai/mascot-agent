# Twitter Authentication and Service Restart Implementation Plan

## Overview
Implement automatic Twitter service restart and runtime settings update after OAuth authentication completion. Currently, OAuth flow stores credentials in database but doesn't activate Twitter functionality until manual restart.

## Current State Analysis

### OAuth Callback Flow (Partially Working)
- ✅ OAuth callback receives tokens from Twitter
- ✅ Exchanges temporary credentials for permanent access tokens  
- ✅ Stores credentials in database via `authService.storeCredentials()`
- ❌ **Missing**: Update runtime settings with new credentials
- ❌ **Missing**: Restart/notify Twitter service about new credentials

### Runtime Settings Update (Only at Startup)
- ✅ Plugin initialization reads saved credentials from database
- ✅ Updates runtime settings via `runtime.setSetting()` during startup
- ❌ **Missing**: Real-time runtime settings update after OAuth completion

### Required Environment Variables/Settings
The Twitter service expects these runtime settings:
- `TWITTER_API_KEY` (consumer key)
- `TWITTER_API_SECRET_KEY` (consumer secret)  
- `TWITTER_ACCESS_TOKEN` (user access token)
- `TWITTER_ACCESS_TOKEN_SECRET` (user access token secret)

## Implementation Plan

### Step 1: Create Twitter Service Management Utilities
Create helper functions in the connections plugin to:
- Access Twitter service via `runtime.getService("twitter")`
- Stop Twitter service using existing `twitterService.stop()` method
- Restart Twitter service using `TwitterService.start(runtime)` static method
- Handle cases where Twitter service is not currently running

### Step 2: Update OAuth Callback Route  
Modify the Twitter callback handler in `routes.ts` to:
- Store credentials in database (already working)
- **Add**: Update runtime settings with new credentials using `runtime.setSetting()`
- **Add**: Restart Twitter service to pick up new credentials
- **Add**: Proper error handling and logging for the complete flow

### Step 3: Create Reusable Credential Update Function
Create a utility function that can:
- Accept Twitter credentials (API key, secret, access token, access token secret)
- Update all four required runtime settings
- Optionally restart Twitter service
- Be called from both plugin initialization and OAuth callback

### Step 4: Add Service Restart Logic
Implement Twitter service restart mechanism:
- Get reference to current Twitter service
- Gracefully stop existing service if running
- Start new Twitter service instance (reads fresh runtime settings)
- Handle errors and provide fallback behavior

### Step 5: Testing and Validation
- Test complete OAuth flow: connect → authenticate → automatic service activation
- Verify Twitter posting/interaction works immediately after OAuth
- Test edge cases: service not running, credential update failures
- Add logging to track service state changes

## Files to Modify
- `/plugins/plugin-connections/src/routes.ts` - Update OAuth callback
- `/plugins/plugin-connections/src/services/auth.service.ts` - Add utility functions  
- Create new file: `/plugins/plugin-connections/plan-twitter-auth.md` - Save this plan

## Success Criteria
- OAuth completion automatically enables Twitter functionality
- No manual restart required after credential updates
- Twitter service uses new credentials immediately
- Proper error handling and logging throughout the flow

## Discovery Service Note
The "discovery" mentioned in research refers to the `TwitterDiscoveryClient` - one of the sub-clients within the Twitter service that handles content discovery and autonomous growth features. When we restart the Twitter service, all sub-clients (post, interaction, timeline, discovery) get restarted together.