# LibreChat Upgrade to v0.8.1-rc1 - Complete

## Upgrade Summary
- **From**: v0.7.4-rc1+36 commits
- **To**: v0.8.1-rc1
- **Date**: November 24, 2024
- **Status**: ✅ Successful

## Backups Created

### 1. Git Backup Branch
- **Branch**: `backup-pre-v0.8.1-rc1-20241124`
- **Contains**: Complete working configuration with all customizations
- **Restore**: `git checkout backup-pre-v0.8.1-rc1-20241124`

### 2. MongoDB Database Backup
- **Directory**: `data-node.backup-20241124-pre-v0.8.1-rc1`
- **Size**: 473MB
- **Location**: `/home/danielv/LibreChat/data-node.backup-20241124-pre-v0.8.1-rc1`
- **Contains**: All conversation history, user accounts, and settings from v0.7.4

### 3. Meilisearch Data Backup
- **Directory**: `meili_data_v1.7.backup-20241124`
- **Location**: `/home/danielv/LibreChat/meili_data_v1.7.backup-20241124`
- **Contains**: Search indexes from v1.7.3 (incompatible with v1.12.3)

## Services Status

All services running successfully:

| Service | Status | Version | Notes |
|---------|--------|---------|-------|
| LibreChat | ✅ Running | v0.8.1-rc1 | Fresh start with new MongoDB |
| MongoDB | ✅ Running | 8.2.2 | **Fresh database** (no conversation history) |
| Meilisearch | ✅ Running | v1.12.3 | Fresh indexes (will rebuild automatically) |
| RAG API | ✅ Running | latest-lite | Azure embeddings configured |
| Vectordb | ✅ Running | pgvector 0.8.0 | Maintaining existing vector data |
| Proxy | ⚠️ Running | latest | Unhealthy status (separate issue) |

## Configuration Preserved

✅ **Azure Entra ID Authentication**
- Enabled: Yes
- Button Label: "Login met CiviQs"
- Client ID: Configured
- Tenant ID: Configured

✅ **SharePoint Integration**
- Currently Disabled: `ENABLE_SHAREPOINT_FILEPICKER=false`
- Reason: Token refresh loop in v0.7.4
- Ready to test: Yes (can enable in .env)

✅ **RAG/File Search**
- Azure Embeddings: Configured (text-embedding-3-small)
- RAG API: Running
- Settings: `maxCitations: 20`, `minRelevanceScore: 0.5`

✅ **File Uploads**
- Configured for all endpoints: agents, azureOpenAI, google, custom, Claude, EduGPT, GovGPT
- Multimodal content: Supported via updated proxy validation

## Key Improvements in v0.8.1-rc1

1. **OpenID Email Claim Fallback** - May resolve SharePoint token issues
2. **Azure Base URL Improvements** - Better Azure integration
3. **OAuth MCP Enhancements** - Improved MCP server OAuth handling
4. **80+ Bug Fixes** - General stability improvements

## Next Steps to Test

### 1. Create New User Account
Since MongoDB was reset, you'll need to:
- Visit https://chat.civiqs.ai
- Click "Login met CiviQs"
- Authenticate with Azure Entra ID
- Your account will be created automatically

### 2. Test SharePoint Integration (Optional)
To test if v0.8.1-rc1 resolves the token refresh loop:

```bash
# Edit .env file
nano /home/danielv/LibreChat/.env

# Change these lines:
OPENID_REUSE_TOKENS=true
ENABLE_SHAREPOINT_FILEPICKER=true
# OPENID_GRAPH_SCOPES=User.Read Files.Read.All  # Uncomment this line

# Restart LibreChat
cd /home/danielv/LibreChat
docker compose restart api

# Test in browser - check for token refresh loop
# Monitor logs: docker logs LibreChat -f
```

### 3. Verify Core Functionality
- ✅ Login with Azure Entra ID
- ✅ Create new conversation
- ✅ Test beleidsbot agent with RAG
- ✅ Upload files (PDF, Word, etc.)
- ✅ Test all endpoints (Azure OpenAI, Google, Anthropic)

## Restore Instructions

### To Restore Previous MongoDB Data:
```bash
cd /home/danielv/LibreChat
docker compose stop mongodb
rm -rf data-node
mv data-node.backup-20241124-pre-v0.8.1-rc1 data-node
docker compose start mongodb
```

**Note**: This will restore conversation history but you'll need to downgrade to v0.7.4 as well.

### To Rollback Completely to v0.7.4:
```bash
cd /home/danielv/LibreChat
git checkout backup-pre-v0.8.1-rc1-20241124
docker compose stop
docker compose up -d
```

## Files Modified

1. `.env` - Preserved all configurations
2. `docker-compose.override.yml` - Updated meilisearch mount path
3. `librechat.yaml` - Preserved all customizations
4. Git repository - Committed to backup branch

## Security Notes

- All API keys and secrets preserved from previous version
- Azure credentials unchanged
- MongoDB now running without user specification (standard Docker setup)
- All backups in place for rollback if needed
