# SharePoint Implementation - Quick Checklist
**Date**: 2025-11-24 | **LibreChat**: v0.8.1-rc1

---

## ✅ PHASE 0: PREPARATION (COMPLETED)
- [x] OBO flow config added to `.env`
- [x] Debug logging enabled
- [x] Monitoring script created
- [x] Implementation guide created

---

## 📋 PHASE 1: AZURE PORTAL (15 min)
**URL**: https://portal.azure.com → App registrations → LibreChat

### 1.1 Token Configuration
- [ ] Add optional claim → ID token → **email** ⭐
- [ ] Add optional claim → ID token → **preferred_username**
- [ ] Check: ✓ Turn on Microsoft Graph email permission

### 1.2 Expose an API
- [ ] Set Application ID URI: `api://4aaebb3f-b0c8-469c-bfd1-bbe5cd513e78`

### 1.3 API Permissions
- [ ] Verify all 7 permissions granted:
  - Microsoft Graph: openid, profile, email, offline_access, User.Read, Files.Read.All
  - SharePoint: AllSites.Read
- [ ] Grant admin consent if needed

### 1.4 Authentication
- [ ] Verify: Platform = Web (not SPA)
- [ ] Verify: Redirect URI = `https://chat.civiqs.ai/oauth/openid/callback`
- [ ] Verify: ID tokens = Enabled

---

## ⚙️ PHASE 2: .ENV UPDATE (5 min)

```bash
nano /home/danielv/LibreChat/.env
```

### Change Lines
- Line 320: `OPENID_REUSE_TOKENS=false` → `OPENID_REUSE_TOKENS=true`
- Line 337: `ENABLE_SHAREPOINT_FILEPICKER=false` → `ENABLE_SHAREPOINT_FILEPICKER=true`

### Restart
```bash
cd /home/danielv/LibreChat
docker compose up -d api
```

---

## 🗄️ PHASE 3: DATABASE CLEANUP (2 min)

```bash
# Clear sessions
docker exec chat-mongodb mongosh LibreChat --eval "db.sessions.deleteMany({})"

# Clear refresh tokens
docker exec chat-mongodb mongosh LibreChat --eval 'db.users.updateMany({}, {$set: {refreshToken: []}})'
```

---

## 🧪 PHASE 4: TESTING (15 min)

### 4.1 Start Monitoring
```bash
cd /home/danielv/LibreChat
./monitor-sharepoint-tokens.sh
```

### 4.2 Browser Test
1. [ ] Open: `https://chat.civiqs.ai`
2. [ ] F12 → Clear site data
3. [ ] Login met CiviQs
4. [ ] Watch monitoring: Should show 1-2 token requests only

### 4.3 SharePoint Test
1. [ ] New conversation
2. [ ] Click: 📎 Attach → SharePoint
3. [ ] Watch monitoring: Should show OBO flow
4. [ ] Verify: Files visible

### 4.4 5-Minute Monitor
- [ ] Keep monitoring running
- [ ] Navigate conversations
- [ ] Refresh page
- [ ] Use SharePoint picker again
- [ ] Press Ctrl+C to see summary

**SUCCESS**: Average interval > 60 seconds, no errors
**FAILURE**: Average interval < 10 seconds, multiple errors

---

## ✅ SUCCESS CHECKLIST
- [ ] Login works without token loop
- [ ] Monitoring shows < 3 token requests in 5 min
- [ ] SharePoint picker opens
- [ ] Files visible and selectable
- [ ] No 500 errors in browser console

---

## 🔧 IF FAILS
See: `/home/danielv/LibreChat/SHAREPOINT-IMPLEMENTATION-GUIDE.md` → Phase 5

**Quick rollback**:
```bash
nano /home/danielv/LibreChat/.env
# Set both to false, restart API
```

---

## 📝 AFTER SUCCESS
Disable debug logging:
```bash
nano /home/danielv/LibreChat/.env
DEBUG_OPENID=false
DEBUG_OPENID_REQUESTS=false
docker compose up -d api
```

---

**Full Guide**: `SHAREPOINT-IMPLEMENTATION-GUIDE.md`
**Analysis**: `/tmp/sharepoint_analysis.md`
**Monitoring**: `./monitor-sharepoint-tokens.sh`
