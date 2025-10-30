# Lark Bitable MCP Server

Focused MCP server providing **only** Lark Bitable (Base) operations through Claude Code.

## 🎯 Features

**15 Essential Bitable Tools:**

### App Management (3 tools)
- `bitable_create_app` - Create new Bitable app
- `bitable_get_app` - Get app details
- `bitable_list_apps` - List all accessible apps

### Table Operations (4 tools)
- `bitable_create_table` - Create new table
- `bitable_list_tables` - List tables in app
- `bitable_get_table` - Get table details
- `bitable_delete_table` - Delete table

### Field Management (3 tools)
- `bitable_list_fields` - List table fields
- `bitable_create_field` - Create new field
- `bitable_update_field` - Update field properties

### Record Operations (5 tools)
- `bitable_create_record` - Create single record
- `bitable_batch_create_records` - Create up to 500 records
- `bitable_search_records` - Search/filter records
- `bitable_update_record` - Update single record
- `bitable_batch_update_records` - Update up to 500 records

## 🚀 Quick Start

### Manual Installation (Claude Code)

**For Claude Code users who want to use this MCP server before it's published to the registry:**

1. **Open your Claude Code MCP configuration file:**
   ```bash
   # On macOS/Linux
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json

   # Or edit directly
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Add the server configuration:**
   ```json
   {
     "mcpServers": {
       "lark-bitable": {
         "url": "https://lark-bitable-mcp.hypelive.workers.dev/mcp",
         "transport": {
           "type": "http"
         },
         "headers": {
           "Authorization": "Bearer YOUR_AUTH_TOKEN_HERE"
         }
       }
     }
   }
   ```

3. **Get your authentication token:**
   Contact the server administrator for the `MCP_AUTH_SECRET` token.

4. **Restart Claude Code** to load the new configuration.

5. **Verify installation:**
   ```bash
   # In Claude Code, ask:
   "List available MCP tools"

   # You should see 15 Bitable tools available
   ```

**Alternative: Using MCP Inspector for testing:**
```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Test the server
mcp-inspector https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  --header "Authorization: Bearer YOUR_AUTH_TOKEN_HERE"
```

### Installation (Self-Hosting)

```bash
cd INFRASTRUCTURE/cloudflare/cloudflare-workers/production/lark-bitable-mcp
npm install
```

### Configuration

#### Option 1: Cloudflare Workers (Remote - Recommended)

**Deploy to Cloudflare Workers:**
```bash
npm run cf:deploy
```

**Set authentication secret:**
```bash
echo "your-secret-token" | wrangler secret put MCP_AUTH_SECRET
```

**Health check:**
```bash
curl https://lark-bitable-mcp.hypelive.workers.dev/health
```

**Expected response:**
```json
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

**Test MCP protocol:**
```bash
# Get authentication token
TOKEN="your-secret-token"

# Test initialize
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List available tools
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call a tool (example: list apps)
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"bitable_list_apps","arguments":{}}}'
```

#### Option 2: stdio Mode (Local)

Add to Claude Code's MCP settings (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lark-bitable": {
      "command": "node",
      "args": [
        "/absolute/path/to/lark-bitable-mcp/src/index.ts"
      ]
    }
  }
}
```

#### Option 2: HTTP/SSE Mode (Remote Streaming)

**Start the server:**
```bash
MCP_TRANSPORT=sse PORT=3000 npm start
```

**Add to Claude Code's MCP settings:**
```json
{
  "mcpServers": {
    "lark-bitable-remote": {
      "command": "node",
      "args": [
        "/absolute/path/to/lark-bitable-mcp/src/index.ts"
      ],
      "env": {
        "MCP_TRANSPORT": "sse",
        "PORT": "3000"
      }
    }
  }
}
```

**Or connect remotely:**
```json
{
  "mcpServers": {
    "lark-bitable-remote": {
      "url": "http://your-server:3000/sse"
    }
  }
}
```

### Verify Installation

```bash
# stdio mode
claude mcp list

# HTTP mode - check health
curl http://localhost:3000/health

# HTTP mode - test SSE connection
curl -N http://localhost:3000/sse
```

You should see:
```
lark-bitable: 15 tools
```

## 📖 Usage Examples

### Create App & Table
```typescript
// Create new Bitable app
bitable_create_app({
  name: "Project Tracker",
  folder_token: "fldXXX..." // optional
})

// Create table
bitable_create_table({
  app_token: "bascnXXX...",
  table_name: "Tasks",
  fields: [
    { field_name: "Task Name", type: 1 },
    { field_name: "Status", type: 3 },
    { field_name: "Due Date", type: 5 }
  ]
})
```

### Record Operations
```typescript
// Create single record
bitable_create_record({
  app_token: "bascnXXX...",
  table_id: "tblXXX...",
  fields: {
    "Task Name": "Fix bug",
    "Status": "In Progress",
    "Due Date": 1735689600000
  }
})

// Search records with filters
bitable_search_records({
  app_token: "bascnXXX...",
  table_id: "tblXXX...",
  filter: {
    conjunction: "and",
    conditions: [
      {
        field_name: "Status",
        operator: "is",
        value: ["In Progress"]
      }
    ]
  },
  page_size: 100
})

// Batch update
bitable_batch_update_records({
  app_token: "bascnXXX...",
  table_id: "tblXXX...",
  records: [
    {
      record_id: "recXXX...",
      fields: { "Status": "Done" }
    }
  ]
})
```

## 🏗️ Architecture

```
User Request
    ↓
Claude Code (MCP Client)
    ↓
lark-bitable-mcp (This Server)
    ↓
larksuite-hype-server.hypelive.workers.dev (Gateway)
    ↓
Lark Open Platform API
```

## 🔧 Gateway Endpoints

All tools proxy through: `https://larksuite-hype-server.hypelive.workers.dev`

### Example Mappings:
- `bitable_create_app` → `POST /bitable/apps`
- `bitable_search_records` → `POST /bitable/:app_token/:table_id/records/search`
- `bitable_list_fields` → `GET /bitable/:app_token/:table_id/fields`

## 📊 Field Types Reference

| Type | Number | Description |
|------|--------|-------------|
| Text | 1 | Multi-line text |
| Number | 2 | Numeric value |
| Single Select | 3 | Single choice |
| Multi Select | 4 | Multiple choices |
| DateTime | 5 | Date/time |
| Checkbox | 7 | Boolean |
| User | 11 | Person field |
| Phone | 13 | Phone number |
| URL | 15 | Link |
| Attachment | 17 | File upload |
| Link | 18 | One-way link |
| Formula | 20 | Calculated field |
| DuplexLink | 21 | Two-way link |
| Location | 22 | Geographic location |

## 🆚 Comparison

### lark-bitable-mcp (This Server)
- ✅ 15 focused Bitable tools
- ✅ Fast initialization
- ✅ Clear purpose
- ✅ Easy to understand
- ✅ Works with Cloudflare Workers
- ✅ Streamable HTTP transport (JSON-RPC 2.0)

### larksuite-mcp-wrapper (Old)
- ❌ 65+ mixed tools
- ❌ Slower initialization
- ❌ Multiple features mixed
- ❌ Harder to navigate

## ⚠️ Known Limitations

### SSE Transport Not Available on Cloudflare Workers
The Server-Sent Events (SSE) transport (`/sse` endpoint) is currently non-functional when deployed to Cloudflare Workers due to platform limitations.

**Recommended approach:**
- Use the **Streamable HTTP transport** (`/mcp` endpoint) which is fully functional and tested
- The `/mcp` endpoint supports standard JSON-RPC 2.0 protocol
- All 15 Bitable tools work correctly via the `/mcp` endpoint

**For local development:**
- The stdio mode works perfectly for local development with Claude Code
- No HTTP server needed for stdio mode

**SSE Status:**
- The `/sse` endpoint exists in the code but returns Cloudflare error 1101
- This is a known limitation of the MCP SDK's SSEServerTransport in Cloudflare Workers environment
- The Streamable HTTP transport is the recommended production solution

## 🐛 Troubleshooting

### "Unknown tool" error
The tool name might be wrong. List available tools:
```bash
# In Claude Code
list available MCP tools
```

### Gateway timeout
The Lark gateway might be slow. Check status:
```bash
curl https://larksuite-hype-server.hypelive.workers.dev/health
```

### Authentication errors
Verify your gateway has valid Lark credentials:
```bash
curl https://larksuite-hype-server.hypelive.workers.dev/bitable/apps
```

## 📝 Development

### Add New Tool

1. Add tool definition in `tools` array
2. Add endpoint mapping in `toolEndpointMap`
3. Update README.md
4. Test with Claude Code

### Test Locally

```bash
npm run dev
# In another terminal:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/index.ts
```

## 🔗 Related

- [Lark Open Platform Docs](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/search)
- [MCP Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Gateway Server](https://github.com/your-org/larksuite-hype-server)

## 📄 License

MIT
