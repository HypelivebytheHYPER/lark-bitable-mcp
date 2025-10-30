# MCP Foundation Registry Submission Guide

Complete guide for submitting lark-bitable-mcp to the Model Context Protocol Foundation registry.

## Prerequisites

✅ **Completed**:
- [x] server.json manifest created and verified
- [x] Production deployment at https://lark-bitable-mcp.hypelive.workers.dev
- [x] Health endpoint returning expected response
- [x] All 15 tools tested and functional
- [x] n8n Cloud integration guide (N8N_CLOUD_SETUP.md)
- [x] Comprehensive README.md

🔐 **Required**:
- [ ] GitHub account with access to https://github.com/modcho/lark-bitable-mcp
- [ ] GitHub Personal Access Token (for namespace authentication)
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager

## Step 1: Install mcp-publisher CLI

The mcp-publisher CLI tool is used to submit servers to the MCP Foundation registry.

```bash
# Global installation (recommended)
npm install -g @modelcontextprotocol/publisher

# Or use npx (no installation)
npx @modelcontextprotocol/publisher --help
```

**Verify installation:**
```bash
mcp-publisher --version
```

## Step 2: Prepare GitHub Authentication

Since lark-bitable-mcp uses the `io.github.modcho` namespace, GitHub authentication is required during submission.

### 2.1 Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Token name: `mcp-publisher-auth`
3. Expiration: 90 days (or custom)
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:user` (Read user profile data)
5. Click **"Generate token"**
6. **Copy the token immediately** (it won't be shown again)

### 2.2 Store Token Securely

```bash
# Option 1: Environment variable (temporary)
export GITHUB_TOKEN="ghp_your_token_here"

# Option 2: Add to shell profile (persistent)
echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.zshrc
source ~/.zshrc

# Verify token is set
echo $GITHUB_TOKEN
```

**Security Note**: Never commit GitHub tokens to git repositories. Add to `.gitignore`:
```bash
echo ".env" >> .gitignore
echo "*.token" >> .gitignore
```

## Step 3: Verify server.json Configuration

Before submission, verify the manifest is valid:

```bash
cd /Users/mdch/INFRASTRUCTURE/cloudflare/cloudflare-workers/production/lark-bitable-mcp

# Validate JSON syntax
cat server.json | jq '.'

# Check required fields
jq '{name, version, packages, license}' server.json
```

**Expected output:**
```json
{
  "name": "io.github.modcho/lark-bitable-mcp",
  "version": "1.0.0",
  "packages": [...],
  "license": "MIT"
}
```

**Critical Checklist**:
- [x] `name` follows format: `io.github.modcho/lark-bitable-mcp`
- [x] `version` is semantic versioning (1.0.0)
- [x] `packages` array contains remote package with http-streamable transport
- [x] `repository.url` points to valid GitHub repo
- [x] `homepage` URL is accessible
- [x] `license` is specified (MIT)
- [x] `capabilities.tools` documents all 15 tools

## Step 4: Test Health Endpoint

Before submitting, verify the production deployment is healthy:

```bash
# Test health endpoint
curl https://lark-bitable-mcp.hypelive.workers.dev/health

# Expected response
{
  "status": "healthy",
  "server": "lark-bitable-mcp",
  "version": "1.0.0",
  "transports": ["sse", "streamable-http"],
  "tools": 15,
  "gateway": "https://larksuite-hype-server.hypelive.workers.dev",
  "authentication": "enabled"
}
```

**Test MCP endpoint with authentication:**
```bash
TOKEN="your-mcp-auth-secret"

# Test initialize
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# Test tools/list
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

**All tests must pass** before proceeding to submission.

## Step 5: Initialize Submission

Navigate to the project directory and initialize the publisher:

```bash
cd /Users/mdch/INFRASTRUCTURE/cloudflare/cloudflare-workers/production/lark-bitable-mcp

# Initialize publisher (creates .mcp directory)
mcp-publisher init
```

**Interactive prompts:**
1. **Server manifest location**: `./server.json` (press Enter)
2. **Namespace authentication**: Automatically detects `io.github.*` and requests GitHub auth
3. **GitHub token**: Will use `$GITHUB_TOKEN` environment variable

**Expected output:**
```
✓ Found server.json manifest
✓ Namespace: io.github.modcho/lark-bitable-mcp
✓ Detected GitHub namespace (requires authentication)
✓ GitHub authentication successful
✓ Initialized .mcp directory
```

## Step 6: Configure Publisher

Review and configure publisher settings:

```bash
# View publisher configuration
cat .mcp/config.json
```

**Expected configuration:**
```json
{
  "manifest": "./server.json",
  "namespace": "io.github.modcho",
  "serverName": "lark-bitable-mcp",
  "version": "1.0.0",
  "authentication": {
    "provider": "github",
    "verified": true
  }
}
```

**Note**: The `.mcp` directory is local and should NOT be committed to git:
```bash
echo ".mcp/" >> .gitignore
```

## Step 7: Validate Before Publishing

Run validation checks before actual submission:

```bash
# Dry-run validation
mcp-publisher validate

# Check for common issues
mcp-publisher lint
```

**Common Validation Checks**:
- ✅ server.json schema compliance
- ✅ Package type configuration validity
- ✅ Transport type support
- ✅ Authentication configuration
- ✅ URL accessibility (health endpoint)
- ✅ GitHub repository existence
- ✅ License specification

**If validation fails**, review error messages and fix server.json before proceeding.

## Step 8: Publish to Registry

Once validation passes, submit to the MCP Foundation registry:

```bash
# Publish (requires GitHub token in environment)
mcp-publisher publish

# With explicit token
GITHUB_TOKEN="ghp_your_token" mcp-publisher publish
```

**Interactive confirmation prompts:**
1. **Server name**: `io.github.modcho/lark-bitable-mcp`
2. **Version**: `1.0.0`
3. **Package type**: `remote`
4. **Endpoint**: `https://lark-bitable-mcp.hypelive.workers.dev/mcp`
5. **Confirm submission**: `yes`

**Expected output:**
```
✓ Validating server.json
✓ Authenticating with GitHub
✓ Checking namespace ownership
✓ Testing health endpoint
✓ Testing MCP protocol endpoint
✓ Submitting to MCP Foundation registry
✓ Submission successful!

Registry URL: https://registry.modelcontextprotocol.io/server/io.github.modcho/lark-bitable-mcp
```

## Step 9: Verify Registry Listing

After successful submission, verify the server appears in the registry:

### 9.1 Web Interface

Visit: https://registry.modelcontextprotocol.io/server/io.github.modcho/lark-bitable-mcp

**Expected page elements:**
- Server title: "Lark Bitable MCP Server"
- Description: "Focused MCP server providing 15 essential Lark Bitable (Base) operations..."
- Package type: "Remote (Hosted)"
- Transport: "HTTP Streamable"
- Authentication: "Bearer Token"
- Tools: 15 listed in categories
- Installation instructions for n8n Cloud and Claude Code
- Links to documentation (README, N8N_CLOUD_SETUP.md)
- GitHub repository link

### 9.2 API Verification

```bash
# Search registry for your server
curl https://registry.modelcontextprotocol.io/api/servers/search?q=lark-bitable-mcp

# Get server details
curl https://registry.modelcontextprotocol.io/api/servers/io.github.modcho/lark-bitable-mcp
```

**Expected JSON response:**
```json
{
  "name": "io.github.modcho/lark-bitable-mcp",
  "version": "1.0.0",
  "title": "Lark Bitable MCP Server",
  "description": "Focused MCP server providing 15 essential Lark Bitable (Base) operations...",
  "packages": [...],
  "capabilities": {
    "tools": {
      "count": 15,
      "categories": [...]
    }
  },
  "registryUrl": "https://registry.modelcontextprotocol.io/server/io.github.modcho/lark-bitable-mcp",
  "publishedAt": "2025-01-31T...",
  "downloads": 0,
  "verified": true
}
```

### 9.3 Test Discovery in MCP Clients

**Claude Code Discovery:**
```bash
# Search for server in Claude Code
claude mcp search lark-bitable

# Expected output
Found servers:
  - io.github.modcho/lark-bitable-mcp (v1.0.0)
    Focused MCP server for Lark Bitable operations
    15 tools | Remote | HTTP Streamable
```

**n8n Cloud Discovery:**
- Open n8n Cloud: https://modcho.app.n8n.cloud/workflow
- Add new MCP Client Tool node
- Search: "lark-bitable-mcp"
- Server should appear in registry search results

## Step 10: Update Documentation

After successful registry submission, update project documentation:

### 10.1 Update README.md

Add registry badge and installation instructions:

```markdown
# Lark Bitable MCP Server

[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-Listed-blue)](https://registry.modelcontextprotocol.io/server/io.github.modcho/lark-bitable-mcp)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://github.com/modcho/lark-bitable-mcp)

## 🚀 Quick Install

### From MCP Registry (Recommended)

**Claude Code:**
```bash
claude mcp install io.github.modcho/lark-bitable-mcp
```

**n8n Cloud:**
1. Add MCP Client Tool node
2. Search registry for "lark-bitable-mcp"
3. Configure authentication with MCP_AUTH_SECRET
```

### 10.2 Create GitHub Release

Tag the release matching registry version:

```bash
git tag -a v1.0.0 -m "Initial MCP Registry release"
git push origin v1.0.0
```

**GitHub Release Notes** (create at https://github.com/modcho/lark-bitable-mcp/releases/new):

```markdown
# v1.0.0 - Initial MCP Registry Release

## 🎉 Now Available on MCP Foundation Registry

lark-bitable-mcp is now officially listed on the Model Context Protocol Foundation registry!

**Registry URL**: https://registry.modelcontextprotocol.io/server/io.github.modcho/lark-bitable-mcp

## Features

- 15 essential Lark Bitable (Base) operations
- Remote deployment on Cloudflare Workers
- HTTP Streamable transport (JSON-RPC 2.0)
- n8n Cloud integration with comprehensive setup guide
- Claude Code compatible

## Installation

**From MCP Registry:**
```bash
claude mcp install io.github.modcho/lark-bitable-mcp
```

**Direct Connection:**
- URL: https://lark-bitable-mcp.hypelive.workers.dev/mcp
- Transport: HTTP Streamable
- Auth: Bearer token (contact admin for MCP_AUTH_SECRET)

## Documentation

- [README.md](./README.md) - Complete server documentation
- [N8N_CLOUD_SETUP.md](./N8N_CLOUD_SETUP.md) - n8n Cloud integration guide
- [server.json](./server.json) - MCP registry manifest

## Tools Included

**App Management (3)**: create_app, get_app, list_apps
**Table Operations (4)**: create_table, list_tables, get_table, delete_table
**Field Management (3)**: list_fields, create_field, update_field
**Record Operations (5)**: create_record, batch_create_records, search_records, update_record, batch_update_records

## What's Next

- Community feedback and improvements
- Additional Lark integrations (Docs, Calendar)
- Performance optimizations
- Extended n8n workflow templates
```

### 10.3 Update server.json for Future Releases

For future updates, increment version and republish:

```bash
# Update version in server.json
jq '.version = "1.0.1"' server.json > server.json.tmp && mv server.json.tmp server.json

# Republish to registry
mcp-publisher publish
```

## Troubleshooting

### Issue: "GitHub authentication failed"

**Cause**: Invalid or expired GitHub token

**Solution**:
```bash
# Regenerate token at https://github.com/settings/tokens/new
export GITHUB_TOKEN="ghp_new_token_here"

# Test token
curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user

# Re-authenticate
mcp-publisher auth github
```

### Issue: "Namespace not available"

**Cause**: Namespace `io.github.modcho` requires ownership verification

**Solution**:
1. Verify you have admin access to https://github.com/modcho/lark-bitable-mcp
2. Ensure repository is public
3. Token must have `repo` scope
4. Repository name must match server name in namespace

### Issue: "Health endpoint unreachable"

**Cause**: Registry cannot access https://lark-bitable-mcp.hypelive.workers.dev/health

**Solution**:
```bash
# Test endpoint accessibility
curl -I https://lark-bitable-mcp.hypelive.workers.dev/health

# Check Cloudflare Workers deployment
wrangler deployments list

# Verify DNS resolution
dig lark-bitable-mcp.hypelive.workers.dev

# Check for IP restrictions or rate limiting
curl -v https://lark-bitable-mcp.hypelive.workers.dev/health
```

### Issue: "MCP protocol validation failed"

**Cause**: MCP endpoint not responding correctly to JSON-RPC requests

**Solution**:
```bash
# Test MCP endpoint directly
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# Check for proper JSON-RPC 2.0 response format
# Expected: {"jsonrpc":"2.0","id":1,"result":{...}}

# Review worker logs
wrangler tail
```

### Issue: "Server already exists in registry"

**Cause**: Attempting to republish same version

**Solution**:
```bash
# Increment version in server.json
# Then republish
mcp-publisher publish
```

## Post-Submission Checklist

After successful registry submission:

- [ ] ✅ Verify registry listing at https://registry.modelcontextprotocol.io/server/io.github.modcho/lark-bitable-mcp
- [ ] ✅ Test discovery in Claude Code: `claude mcp search lark-bitable`
- [ ] ✅ Test discovery in n8n Cloud MCP Client Tool
- [ ] ✅ Update README.md with registry badge and installation instructions
- [ ] ✅ Create GitHub release v1.0.0
- [ ] ✅ Share registry listing on social media / Lark communities
- [ ] 📢 Announce in MCP Protocol community Discord/forums
- [ ] 📊 Monitor downloads and usage metrics from registry
- [ ] 🔄 Plan for future updates and version releases

## Monitoring and Maintenance

### Registry Analytics

Check server analytics from registry:

```bash
# Get download statistics
curl https://registry.modelcontextprotocol.io/api/servers/io.github.modcho/lark-bitable-mcp/stats
```

### Deployment Health

Monitor production health endpoint:

```bash
# Set up health check cron (example: check every 5 minutes)
*/5 * * * * curl -s https://lark-bitable-mcp.hypelive.workers.dev/health | jq '.status' || echo "Health check failed"

# Monitor with Cloudflare Analytics
# Visit: https://dash.cloudflare.com/workers/lark-bitable-mcp
```

### Community Engagement

- **Issues**: Monitor https://github.com/modcho/lark-bitable-mcp/issues
- **Discussions**: Engage with users in GitHub Discussions
- **Registry Reviews**: Check registry for user feedback and ratings

## Next Steps

1. ✅ Complete submission to MCP Foundation registry
2. 📊 Monitor initial adoption and user feedback
3. 🔄 Iterate based on community needs
4. 📚 Create video tutorials for n8n Cloud integration
5. 🌐 Translate documentation to Chinese (Lark/Feishu primary market)
6. 🚀 Plan version 2.0 features (view operations, collaboration features)

## Resources

- **MCP Registry**: https://registry.modelcontextprotocol.io
- **MCP Publisher CLI**: https://github.com/modelcontextprotocol/publisher
- **MCP Protocol Spec**: https://spec.modelcontextprotocol.io
- **Publishing Guide**: https://modelcontextprotocol.io/docs/publishing
- **GitHub Tokens**: https://github.com/settings/tokens
- **Cloudflare Workers**: https://dash.cloudflare.com/workers
- **n8n Cloud**: https://modcho.app.n8n.cloud/workflow

## Support

For submission issues:
- **MCP Registry Support**: registry@modelcontextprotocol.io
- **GitHub Issues**: https://github.com/modcho/lark-bitable-mcp/issues
- **Community Forum**: https://community.modelcontextprotocol.io

---

**Version**: 1.0.0
**Last Updated**: 2025-01-31
**Status**: Ready for registry submission
**Submission Target**: MCP Foundation Registry
