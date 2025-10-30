# n8n Cloud Setup Guide for lark-bitable-mcp

Complete guide for connecting lark-bitable-mcp to n8n Cloud MCP Client Tool node.

## Prerequisites

- n8n Cloud account with workspace access
- Your workspace URL: `https://modcho.app.n8n.cloud/workflow`
- MCP_AUTH_SECRET token (get from admin or Cloudflare Workers secrets)
- lark-bitable-mcp deployed at: `https://lark-bitable-mcp.hypelive.workers.dev`

## Step 1: Verify MCP Server Health

Before configuring n8n, verify the server is running:

```bash
curl https://lark-bitable-mcp.hypelive.workers.dev/health
```

**Expected Response:**
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

## Step 2: Get Authentication Token

The MCP_AUTH_SECRET is stored in Cloudflare Workers secrets. To retrieve or set it:

```bash
# View current secret (will only show if you have access)
wrangler secret list --name lark-bitable-mcp

# Set new secret if needed
echo "your-secret-token" | wrangler secret put MCP_AUTH_SECRET --name lark-bitable-mcp
```

**Store your token securely** - you'll need it for n8n configuration.

## Step 3: Test MCP Protocol Connection

Verify the MCP endpoint works with your token:

```bash
TOKEN="your-secret-token"

# Test initialize
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"capabilities":{}}}'

# List available tools
curl -X POST https://lark-bitable-mcp.hypelive.workers.dev/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

**Expected tools/list Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {"name": "bitable_create_app", "description": "Create a new Bitable app", ...},
      {"name": "bitable_list_apps", "description": "List all accessible Bitable apps", ...},
      {"name": "bitable_get_app", "description": "Get app details", ...},
      {"name": "bitable_create_table", "description": "Create new table in app", ...},
      {"name": "bitable_list_tables", "description": "List all tables in app", ...},
      {"name": "bitable_get_table", "description": "Get table details", ...},
      {"name": "bitable_delete_table", "description": "Delete a table", ...},
      {"name": "bitable_list_fields", "description": "List all fields in table", ...},
      {"name": "bitable_create_field", "description": "Create new field in table", ...},
      {"name": "bitable_update_field", "description": "Update field properties", ...},
      {"name": "bitable_create_record", "description": "Create a single record", ...},
      {"name": "bitable_batch_create_records", "description": "Create up to 500 records", ...},
      {"name": "bitable_search_records", "description": "Search/filter records", ...},
      {"name": "bitable_update_record", "description": "Update a single record", ...},
      {"name": "bitable_batch_update_records", "description": "Update up to 500 records", ...}
    ]
  }
}
```

## Step 4: Configure n8n Cloud MCP Client Tool Node

### 4.1 Create New Workflow

1. Go to your n8n Cloud: `https://modcho.app.n8n.cloud/workflow`
2. Click **"+ New workflow"**
3. Name it: **"Test Lark Bitable MCP"**

### 4.2 Add MCP Client Tool Node

1. Click **"+"** to add a node
2. Search for **"MCP Client Tool"**
3. Select **"MCP Client Tool"** (should show version 1.2)
4. The node will be added to your canvas

### 4.3 Configure MCP Connection

In the MCP Client Tool node settings:

**Connection Settings:**
- **Transport Type**: `HTTP Streamable`
- **URL**: `https://lark-bitable-mcp.hypelive.workers.dev/mcp`
- **Authentication**: `Bearer Token`
- **Token**: `<your-MCP_AUTH_SECRET>`

**Advanced Settings (optional):**
- **Timeout**: `30000` (30 seconds)
- **Retry**: `3`

### 4.4 Test Connection

1. Click **"Test Connection"** button
2. You should see: ✅ **"Connection successful"**
3. If successful, the **"Tool"** dropdown will populate with all 15 tools

**Common Connection Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Wrong token | Verify MCP_AUTH_SECRET token |
| `404 Not Found` | Wrong URL | Check endpoint URL matches deployment |
| `Timeout` | Network issue | Check Cloudflare Workers status |
| `Invalid JSON-RPC` | Wrong protocol | Ensure using HTTP Streamable (not SSE) |

## Step 5: Test Workflow Examples

### Test 1: List All Accessible Bitable Apps

**Workflow Configuration:**

1. Add **Manual Trigger** node (or Schedule Trigger)
2. Add **MCP Client Tool** node
3. Configure MCP Client Tool:
   - **Tool**: `bitable_list_apps`
   - **Arguments**: `{}` (empty JSON object)
4. Add **Code** node (optional - to format output)
5. Connect nodes: `Manual Trigger` → `MCP Client Tool` → `Code`

**Expected Response:**
```json
{
  "apps": [
    {
      "app_token": "bascnXXX...",
      "name": "Project Tracker",
      "folder_token": "fldXXX...",
      "url": "https://bytedance.larkoffice.com/base/...",
      "is_advanced": false
    }
  ],
  "has_more": false,
  "page_token": null
}
```

### Test 2: Create New Bitable App

**Workflow Configuration:**

1. Add **Manual Trigger** node
2. Add **MCP Client Tool** node
3. Configure MCP Client Tool:
   - **Tool**: `bitable_create_app`
   - **Arguments**:
     ```json
     {
       "name": "Test App from n8n",
       "folder_token": ""
     }
     ```
4. Add **Set** node to extract app_token
5. Add **HTTP Request** node to verify app created

**Expected Response:**
```json
{
  "app_token": "bascn1234567890",
  "name": "Test App from n8n",
  "folder_token": "",
  "url": "https://bytedance.larkoffice.com/base/bascn1234567890",
  "is_advanced": false
}
```

### Test 3: Create Table with Fields

**Workflow Configuration:**

1. Add **Manual Trigger** node
2. Add **MCP Client Tool** node (bitable_create_app)
3. Add **MCP Client Tool** node (bitable_create_table)
4. Configure second MCP node:
   - **Tool**: `bitable_create_table`
   - **Arguments**:
     ```json
     {
       "app_token": "{{ $node['MCP Client Tool'].json.app_token }}",
       "table_name": "Tasks",
       "fields": [
         {
           "field_name": "Task Name",
           "type": 1
         },
         {
           "field_name": "Status",
           "type": 3,
           "property": {
             "options": [
               {"name": "To Do"},
               {"name": "In Progress"},
               {"name": "Done"}
             ]
           }
         },
         {
           "field_name": "Due Date",
           "type": 5
         }
       ]
     }
     ```

**Field Type Reference:**
- `1` = Text (multi-line)
- `2` = Number
- `3` = Single Select
- `4` = Multi Select
- `5` = DateTime
- `7` = Checkbox
- `11` = User
- `13` = Phone
- `15` = URL

**Expected Response:**
```json
{
  "table_id": "tblXXX...",
  "name": "Tasks",
  "revision": 1
}
```

### Test 4: Create and Search Records

**Workflow Configuration:**

1. **Manual Trigger** node
2. **MCP Client Tool** (bitable_create_record) - Create 3 records
3. **MCP Client Tool** (bitable_search_records) - Search with filter
4. **Code** node - Format results

**Create Record Arguments:**
```json
{
  "app_token": "bascnXXX...",
  "table_id": "tblXXX...",
  "fields": {
    "Task Name": "Fix homepage bug",
    "Status": "In Progress",
    "Due Date": 1735689600000
  }
}
```

**Search Records Arguments:**
```json
{
  "app_token": "bascnXXX...",
  "table_id": "tblXXX...",
  "filter": {
    "conjunction": "and",
    "conditions": [
      {
        "field_name": "Status",
        "operator": "is",
        "value": ["In Progress"]
      }
    ]
  },
  "page_size": 100
}
```

### Test 5: Batch Update Records

**Workflow Configuration:**

1. **MCP Client Tool** (bitable_search_records) - Get records
2. **Code** node - Transform to update format
3. **MCP Client Tool** (bitable_batch_update_records) - Update all

**Batch Update Arguments:**
```json
{
  "app_token": "bascnXXX...",
  "table_id": "tblXXX...",
  "records": [
    {
      "record_id": "recXXX1...",
      "fields": {"Status": "Done"}
    },
    {
      "record_id": "recXXX2...",
      "fields": {"Status": "Done"}
    }
  ]
}
```

## Step 6: Production Workflow Example

### Complete Task Management Workflow

**Workflow Flow:**
```
Schedule Trigger (daily 9am)
  ↓
MCP: List Tables (get task table)
  ↓
MCP: Search Records (get overdue tasks)
  ↓
Code: Format notification message
  ↓
Slack/Email: Send notification
  ↓
MCP: Batch Update Records (mark as notified)
```

**Benefits:**
- Automated task tracking
- No manual Lark API calls needed
- Unified workflow in n8n
- All 15 Bitable operations available

## Step 7: Verify All 15 Tools

Create a comprehensive test workflow that calls each tool:

### App Management (3 tools)
1. ✅ `bitable_create_app` - Create test app
2. ✅ `bitable_list_apps` - Verify app appears
3. ✅ `bitable_get_app` - Get app details

### Table Operations (4 tools)
4. ✅ `bitable_create_table` - Create test table
5. ✅ `bitable_list_tables` - Verify table appears
6. ✅ `bitable_get_table` - Get table details
7. ✅ `bitable_delete_table` - Clean up test table

### Field Management (3 tools)
8. ✅ `bitable_list_fields` - List table fields
9. ✅ `bitable_create_field` - Add new field
10. ✅ `bitable_update_field` - Modify field properties

### Record Operations (5 tools)
11. ✅ `bitable_create_record` - Create single record
12. ✅ `bitable_batch_create_records` - Create 10 records
13. ✅ `bitable_search_records` - Search with filters
14. ✅ `bitable_update_record` - Update single record
15. ✅ `bitable_batch_update_records` - Update multiple records

## Troubleshooting

### Issue: "Tool not found"
**Cause**: Tool name mismatch or connection not initialized
**Solution**:
1. Disconnect and reconnect MCP Client Tool
2. Verify tool name matches exactly (case-sensitive)
3. Check tools/list response for correct tool names

### Issue: "Gateway timeout"
**Cause**: Lark API slow response or network issue
**Solution**:
1. Increase timeout to 60 seconds
2. Check gateway health: `curl https://larksuite-hype-server.hypelive.workers.dev/health`
3. Verify Cloudflare Workers status

### Issue: "Invalid app_token or table_id"
**Cause**: Wrong token format or deleted resource
**Solution**:
1. Verify tokens start with correct prefix:
   - app_token: `bascn...`
   - table_id: `tbl...`
   - record_id: `rec...`
2. Use bitable_list_apps to get valid app_token
3. Use bitable_list_tables to get valid table_id

### Issue: "Field type error"
**Cause**: Wrong field type number or missing required properties
**Solution**:
1. Check Field Types Reference (above)
2. For Single/Multi Select (type 3/4), include `property.options`
3. For DateTime (type 5), use millisecond timestamps

### Issue: "Authentication failed"
**Cause**: Token expired or gateway credentials invalid
**Solution**:
1. Verify MCP_AUTH_SECRET in n8n matches Cloudflare secret
2. Check gateway has valid Lark app credentials
3. Test gateway directly: `curl https://larksuite-hype-server.hypelive.workers.dev/bitable/apps`

## Best Practices

1. **Error Handling**: Always add error handling nodes after MCP calls
2. **Rate Limiting**: Lark API has rate limits - add delays between batch operations
3. **Pagination**: For search_records, handle `has_more` and `page_token`
4. **Token Storage**: Store app_token/table_id in n8n variables, not hardcoded
5. **Logging**: Add logging nodes to track MCP tool execution
6. **Testing**: Test in n8n Cloud test environment before production
7. **Cleanup**: Delete test apps/tables after testing to avoid clutter

## Performance Considerations

- **Batch Operations**: Use `batch_create_records` (up to 500) instead of multiple single creates
- **Field Selection**: Specify only needed fields in search_records to reduce response size
- **Caching**: Cache app_token/table_id lookups in workflow variables
- **Parallel Execution**: Use n8n's parallel execution for independent MCP calls
- **Timeouts**: Set appropriate timeouts based on operation:
  - Simple queries: 10 seconds
  - Batch operations: 30 seconds
  - Large searches: 60 seconds

## Next Steps

1. ✅ Test connection with Manual Trigger workflow
2. ✅ Create basic CRUD workflow (Create, Read, Update, Delete)
3. ✅ Test all 15 tools systematically
4. ✅ Build production automation workflow
5. 🔄 Apply to MCP Protocol Foundation registry
6. 🔄 Share workflow templates with team

## Resources

- **MCP Server Health**: https://lark-bitable-mcp.hypelive.workers.dev/health
- **MCP Endpoint**: https://lark-bitable-mcp.hypelive.workers.dev/mcp
- **Gateway**: https://larksuite-hype-server.hypelive.workers.dev
- **Lark API Docs**: https://open.feishu.cn/document/server-docs/docs/bitable-v1
- **n8n Cloud**: https://modcho.app.n8n.cloud/workflow
- **MCP Protocol Spec**: https://spec.modelcontextprotocol.io/

## Support

For issues with:
- **MCP Server**: Check `/Users/mdch/INFRASTRUCTURE/cloudflare/cloudflare-workers/production/lark-bitable-mcp/README.md`
- **n8n Configuration**: Visit n8n documentation or community forum
- **Lark API**: Refer to Lark Open Platform documentation

---

**Version**: 1.0.0
**Last Updated**: 2025-01-31
**Status**: Ready for n8n Cloud testing
