# SharePoint Integration Implementation Guide
**Status**: Ready to implement - All preparation complete
**Date**: November 24, 2024
**LibreChat Version**: v0.8.1-rc1

---

## ✅ PREPARATION COMPLETE

### Phase 0: Completed ✓
- [x] Root cause analysis completed
- [x] On-Behalf-Of Flow configuration added to `.env`
- [x] Debug logging enabled in `.env`
- [x] Graph scopes configured
- [x] Monitoring script created: `monitor-sharepoint-tokens.sh`
- [x] SharePoint settings marked as ready to enable

---

## 📋 PHASE 1: AZURE PORTAL CONFIGURATION
**⏱️ Estimated Time**: 15-20 minuten
**Status**: ⏸️ PENDING - Requires user action in Azure Portal

### Step 1.1: Add Email Claim to ID Token ⭐ KRITISCH
1. Open Azure Portal: https://portal.azure.com
2. Navigate to: **Azure Entra ID** → **App registrations**
3. Find app: **LibreChat** (Client ID: `4aaebb3f-b0c8-469c-bfd1-bbe5cd513e78`)
4. Click: **Token configuration** (left menu)
5. Click: **Add optional claim**
6. Select token type: **ID**
7. Select claims:
   - [x] **email** ⭐ REQUIRED
   - [x] **preferred_username** (recommended)
   - [x] **upn** (recommended)
8. Check: ✓ **Turn on the Microsoft Graph email permission**
9. Click: **Add**
10. Verify: Claims now visible in "Token configuration" overview

**Expected Result**:
- Email claim added to ID token
- Microsoft Graph `email` permission automatically added to API permissions
- Green checkmark in Token configuration

---

### Step 1.2: Configure Application ID URI ⭐ KRITISCH
1. In same app registration, click: **Expose an API** (left menu)
2. Click: **Add** next to "Application ID URI"
3. Enter URI: `api://4aaebb3f-b0c8-469c-bfd1-bbe5cd513e78`
4. Click: **Save**

**Expected Result**:
- Application ID URI set to: `api://4aaebb3f-b0c8-469c-bfd1-bbe5cd513e78`
- This matches `OPENID_AUDIENCE` in `.env`

---

### Step 1.3: Verify API Permissions
1. Click: **API permissions** (left menu)
2. Verify the following **Delegated** permissions are present:

**Microsoft Graph:**
- [x] openid
- [x] profile
- [x] email
- [x] offline_access
- [x] User.Read
- [x] Files.Read.All

**SharePoint:**
- [x] AllSites.Read

3. Check status column: All should show **"Granted for [Tenant Name]"**
4. If any show "Not granted":
   - Click: **Grant admin consent for [Tenant]**
   - Confirm: Yes

**Expected Result**:
- All 7 permissions present
- All showing green checkmark with "Granted" status
- No yellow warning icons

---

### Step 1.4: Verify Authentication Platform
1. Click: **Authentication** (left menu)
2. Verify **Web** platform configured (not SPA)
3. Verify Redirect URI: `https://chat.civiqs.ai/oauth/openid/callback`
4. Check settings:
   - [x] **ID tokens** (used with hybrid flows) = ENABLED
   - [ ] **Access tokens** (used for implicit flows) = DISABLED
   - [ ] **Allow public client flows** = NO

**Expected Result**:
- Platform type: Web
- Redirect URI matches exactly
- ID tokens enabled, access tokens disabled

---

### Step 1.5: Verify Client Secret
1. Click: **Certificates & secrets** (left menu)
2. Check secret expiration date
3. Verify only ONE active secret present
4. Confirm secret value in `.env` is the **Value** (not Secret ID)

**Current Secret in .env**: `<AZURE_CLIENT_SECRET>`
- Format: Correct (starts with `~`)
- Type: Value (not ID)

**Expected Result**:
- Secret not expired
- Secret format correct
- Only one active secret

---

## ⚙️ PHASE 2: LIBRECHAT CONFIGURATION
**⏱️ Estimated Time**: 5 minuten
**Status**: ✅ READY - Configuration prepared, awaiting Phase 1 completion

### Step 2.1: Verify OBO Flow Configuration Added
Check `.env` file contains (already added):

```bash
# On-Behalf-Of Flow Configuration
OPENID_AUDIENCE=api://4aaebb3f-b0c8-469c-bfd1-bbe5cd513e78
OPENID_ON_BEHALF_FLOW_FOR_USERINFO_REQUIRED=true
OPENID_ON_BEHALF_FLOW_USERINFO_SCOPE=https://graph.microsoft.com/.default

# Debug Logging
DEBUG_OPENID=true
DEBUG_OPENID_REQUESTS=true

# Graph Scopes
OPENID_GRAPH_SCOPES=User.Read Files.Read.All
```

**Status**: ✅ Already added to `.env`

---

### Step 2.2: Enable SharePoint Integration
After Phase 1 is complete, edit `.env`:

```bash
# Change from false to true:
OPENID_REUSE_TOKENS=true
ENABLE_SHAREPOINT_FILEPICKER=true
```

**Command to edit**:
```bash
nano /home/danielv/LibreChat/.env
```

Change lines:
- Line 320: `OPENID_REUSE_TOKENS=false` → `OPENID_REUSE_TOKENS=true`
- Line 337: `ENABLE_SHAREPOINT_FILEPICKER=false` → `ENABLE_SHAREPOINT_FILEPICKER=true`

---

### Step 2.3: Restart LibreChat API
```bash
cd /home/danielv/LibreChat
docker compose up -d api
```

**Expected Output**:
```
[+] Running 1/1
 ✔ Container LibreChat  Started
```

---

## 🗄️ PHASE 3: DATABASE CLEANUP
**⏱️ Estimated Time**: 2 minuten
**Status**: ✅ READY - Commands prepared

### Step 3.1: Clear All Sessions
This removes old session state that may cause conflicts:

```bash
docker exec chat-mongodb mongosh LibreChat --eval "db.sessions.deleteMany({})"
```

**Expected Output**:
```javascript
{ acknowledged: true, deletedCount: N }
```

---

### Step 3.2: Clear User Refresh Tokens
This removes old refresh tokens:

```bash
docker exec chat-mongodb mongosh LibreChat --eval 'db.users.updateMany({}, {$set: {refreshToken: []}})'
```

**Expected Output**:
```javascript
{
  acknowledged: true,
  matchedCount: N,
  modifiedCount: N
}
```

---

### Step 3.3: Verify User Email
Confirm email field present in user document:

```bash
docker exec chat-mongodb mongosh LibreChat --eval 'db.users.findOne({email: "daniel.verloop@civiqs.nl"}, {name: 1, email: 1, provider: 1, openidId: 1})'
```

**Expected Output**:
```javascript
{
  _id: ObjectId('...'),
  name: 'Daniel Verloop',
  email: 'daniel.verloop@civiqs.nl',
  provider: 'openid',
  openidId: '...'
}
```

---

## 🧪 PHASE 4: TESTING PROTOCOL
**⏱️ Estimated Time**: 15-20 minuten
**Status**: ⏸️ PENDING - Awaits Phase 1-3 completion

### Step 4.1: Start Monitoring Script
Open a second terminal window:

```bash
cd /home/danielv/LibreChat
./monitor-sharepoint-tokens.sh
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════════════╗
║         SharePoint Token Refresh Monitor - v1.0               ║
║         Real-time OAuth Token Request Tracking                ║
╚════════════════════════════════════════════════════════════════╝

⏱️  Monitoring started at HH:MM:SS
📊 Press Ctrl+C to stop and see summary

┌─────────┬────────────────────────────────────────────────────────────┐
│  Time   │  Event Type                                                │
├─────────┼────────────────────────────────────────────────────────────┤
```

---

### Step 4.2: Clear Browser State
1. Open browser (Chrome/Edge)
2. Navigate to: `https://chat.civiqs.ai`
3. Press: **F12** (Developer Tools)
4. Right-click refresh button → **Empty Cache and Hard Reload**
5. Click: **Application** tab → **Storage** → **Clear site data**
6. Close Developer Tools

---

### Step 4.3: Fresh Login Test
1. Navigate to: `https://chat.civiqs.ai`
2. Click: **"Login met CiviQs"**
3. Complete Azure authentication
4. **Watch monitoring script** for token requests

**Expected Monitoring Output (HEALTHY)**:
```
│ 20:10:15 │ 🔑 Token request #1 (first)                │
│ 20:10:17 │ ✅ Login successful                         │
│ 20:10:17 │ 🎫 Graph API token acquired                 │
```

**Red Flag Patterns (UNHEALTHY)**:
```
│ 20:10:15 │ 🔑 Token request #1 (first)                │
│ 20:10:18 │ 🚨 Token request #2 (+3s) CRITICAL!        │  ← BAD
│ 20:10:22 │ 🚨 Token request #3 (+4s) CRITICAL!        │  ← BAD
```

---

### Step 4.4: SharePoint File Picker Test
After successful login:

1. Start a new conversation
2. Click: **📎 Attach** button (paperclip icon)
3. Click: **SharePoint** option
4. **Watch monitoring script** - should show:
   ```
   │ 20:11:30 │ 🔄 OBO flow initiated                      │
   │ 20:11:31 │ 🎫 Graph API token acquired                │
   │ 20:11:32 │ 📁 SharePoint access attempt               │
   ```
5. Verify: SharePoint file browser opens
6. Browse: Should see your SharePoint files

**Red Flag Patterns**:
- Multiple token requests within 10 seconds
- Error messages in monitoring script
- 500 errors in browser console
- File picker doesn't open or shows error

---

### Step 4.5: Monitor for 5 Minutes
Keep monitoring script running and:
1. Navigate between conversations
2. Refresh page
3. Upload a file
4. Use SharePoint picker again

**Expected Pattern**:
- No additional token requests
- Or: Token requests > 60 seconds apart (normal refresh)

---

### Step 4.6: Review Monitoring Summary
After 5 minutes, press **Ctrl+C** in monitoring terminal:

**Expected Summary (SUCCESS)**:
```
╔════════════════════════════════════════════════════════════════╗
║                    MONITORING SUMMARY                          ║
╚════════════════════════════════════════════════════════════════╝

📊 Statistics:
   Duration: 300 seconds
   Token requests: 2-3
   Errors: 0
   Average interval: 150 seconds

🎯 Diagnosis:
   ✅ HEALTHY: Normal token refresh pattern
   Tokens requested every ~150 seconds
```

**Failure Pattern**:
```
   Duration: 300 seconds
   Token requests: 50+
   Errors: 15+
   Average interval: 4 seconds

   ❌ CRITICAL: Token refresh loop detected!
```

---

## 🔧 PHASE 5: TROUBLESHOOTING
**Status**: ⏸️ Use only if Phase 4 shows problems

### Scenario A: Token Refresh Loop Persists
**Symptoms**:
- Token requests every 3-5 seconds
- 500 errors in browser console
- File picker doesn't open

**Diagnosis Steps**:

1. **Check Email Claim in Token**:
   ```bash
   # Enable verbose OpenID debugging
   docker logs LibreChat -f --tail 100 | grep -i "email\|claim\|userinfo"
   ```

   Look for:
   - ✅ `"email": "daniel.verloop@civiqs.nl"` in token
   - ❌ `email claim missing` or `undefined`

2. **Check OBO Flow Execution**:
   ```bash
   docker logs LibreChat -f --tail 100 | grep -i "behalf\|obo\|exchange"
   ```

   Look for:
   - ✅ `"On-Behalf-Of flow initiated"`
   - ✅ `"Token exchange successful"`
   - ❌ `"OBO flow failed"` or `"exchange error"`

3. **Check Application ID URI**:
   ```bash
   docker logs LibreChat -f --tail 100 | grep -i "audience\|invalid_grant"
   ```

   Look for:
   - ❌ `"invalid_grant: AADSTS70000"` → Application ID URI mismatch
   - ❌ `"invalid_audience"` → OPENID_AUDIENCE incorrect

**Fixes**:
- If email missing: Return to Phase 1.1, re-add email claim, logout/login
- If OBO fails: Verify `OPENID_ON_BEHALF_FLOW_USERINFO_SCOPE` is exact
- If audience error: Verify Application ID URI matches `OPENID_AUDIENCE`

---

### Scenario B: SharePoint Picker Opens But No Files
**Symptoms**:
- No token refresh loop
- Picker opens successfully
- Shows "No files found" or loading spinner forever

**Diagnosis Steps**:

1. **Check SharePoint Permissions**:
   ```bash
   docker logs LibreChat -f --tail 100 | grep -i "sharepoint\|graph\|403\|401"
   ```

   Look for:
   - ❌ `"403 Forbidden"` → Missing AllSites.Read permission
   - ❌ `"401 Unauthorized"` → Token not valid for SharePoint

2. **Check SharePoint Scope**:
   Verify in `.env`:
   ```bash
   grep SHAREPOINT_PICKER /home/danielv/LibreChat/.env
   ```

   Should show:
   ```
   SHAREPOINT_PICKER_SHAREPOINT_SCOPE=https://tappstr.sharepoint.com/AllSites.Read
   SHAREPOINT_PICKER_GRAPH_SCOPE=Files.Read.All
   ```

**Fixes**:
- If 403: Return to Phase 1.3, grant SharePoint AllSites.Read, re-consent
- If scope wrong: Fix .env, restart API

---

### Scenario C: Login Fails Completely
**Symptoms**:
- Can't login at all
- "Invalid state parameter" error
- "Failed to fetch user info"

**Diagnosis Steps**:

1. **Check Session Secret**:
   ```bash
   docker exec LibreChat printenv | grep OPENID_SESSION_SECRET
   ```

   Should return: `OPENID_SESSION_SECRET=9a7c8e6f4b2d1a3e5f7c9b1d3e5a7c9f1b3d5e7a9c1b3d5e7a9c1b3d5e7a9c1b`

2. **Check Callback URL**:
   ```bash
   docker logs LibreChat -f --tail 100 | grep -i "callback\|redirect"
   ```

**Fixes**:
- If session secret empty: Check `.env` file, restart API
- If callback URL mismatch: Verify Azure Portal redirect URI exact match

---

### Scenario D: Need to Rollback
If SharePoint cannot be fixed and production needs to be stable:

```bash
# Disable SharePoint
nano /home/danielv/LibreChat/.env

# Change:
OPENID_REUSE_TOKENS=false
ENABLE_SHAREPOINT_FILEPICKER=false

# Restart
docker compose up -d api

# Clean database
docker exec chat-mongodb mongosh LibreChat --eval "db.sessions.deleteMany({})"
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Success
- [x] Email claim visible in Azure Token Configuration
- [x] Application ID URI set to `api://[client-id]`
- [x] All 7 API permissions granted with green checkmarks

### Phase 2 Success
- [x] `.env` contains all OBO flow variables
- [x] Debug logging enabled
- [x] SharePoint variables set to `true`
- [x] API container restarted successfully

### Phase 3 Success
- [x] Sessions collection cleared
- [x] User refresh tokens array cleared
- [x] User email field present in database

### Phase 4 Success
- [x] Login completes without token loop
- [x] Monitoring script shows < 3 token requests in 5 minutes
- [x] SharePoint file picker opens successfully
- [x] Files visible in picker
- [x] File can be selected and attached to conversation

### Overall Success
✅ **SharePoint integration working without token refresh loop**

---

## 📝 DISABLE DEBUG LOGGING (After Success)

Once SharePoint is working, disable debug logging to reduce log volume:

```bash
nano /home/danielv/LibreChat/.env
```

Change:
```bash
DEBUG_OPENID=false
DEBUG_OPENID_REQUESTS=false
```

Restart:
```bash
docker compose up -d api
```

---

## 📚 QUICK REFERENCE

### Useful Commands
```bash
# View recent logs
docker logs LibreChat --tail 100 -f

# Check what's running on container
docker exec LibreChat printenv | grep OPENID

# Query database
docker exec chat-mongodb mongosh LibreChat --eval "db.users.countDocuments()"

# Restart API only
docker compose up -d api

# Full restart
docker compose restart
```

### Configuration Files
- Main config: `/home/danielv/LibreChat/.env`
- App config: `/home/danielv/LibreChat/librechat.yaml`
- Docker setup: `/home/danielv/LibreChat/docker-compose.override.yml`
- This guide: `/home/danielv/LibreChat/SHAREPOINT-IMPLEMENTATION-GUIDE.md`
- Analysis: `/tmp/sharepoint_analysis.md`

### Monitoring Script
```bash
cd /home/danielv/LibreChat
./monitor-sharepoint-tokens.sh
```

---

## ✅ CURRENT STATUS

- [x] Phase 0: Preparation complete
- [ ] Phase 1: Azure Portal configuration (USER ACTION REQUIRED)
- [x] Phase 2: LibreChat configuration prepared
- [x] Phase 3: Database cleanup commands prepared
- [x] Phase 4: Testing protocol documented
- [x] Phase 5: Troubleshooting scenarios documented

**Next Action**: Complete Phase 1 in Azure Portal, then proceed with Phase 2-4.

---

**Last Updated**: 2025-11-24 20:30 UTC
**Created By**: Claude Code
**For**: Daniel Verloop - CiviQs LibreChat
