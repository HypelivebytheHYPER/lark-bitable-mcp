/**
 * Lark Bitable MCP Server
 * Version: 1.0.0
 *
 * Focused MCP server for Lark Bitable (Base) operations only
 * Gateway: https://larksuite-hype-server.hypelive.workers.dev
 *
 * Tools (15 core Bitable operations):
 * - App management (3 tools)
 * - Table operations (4 tools)
 * - Field management (3 tools)
 * - Record CRUD (5 tools)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import http from "http";

// Gateway client
class LarkBitableClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async call(endpoint: string, method: string = "POST", body?: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gateway error (${response.status}): ${errorText}`
        );
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to call gateway: ${error.message}`);
    }
  }
}

// MCP Server setup
const server = new Server(
  {
    name: "lark-bitable",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Focused Bitable tool definitions
const tools = [
  // ============ APP MANAGEMENT (3 tools) ============
  {
    name: "bitable_create_app",
    description: "Create a new Bitable (Base) app in a folder",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the new Bitable app",
        },
        folder_token: {
          type: "string",
          description: "Folder token where to create the app (optional, empty for root)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "bitable_get_app",
    description: "Get details about a specific Bitable app",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
      },
      required: ["app_token"],
    },
  },
  {
    name: "bitable_list_apps",
    description: "List all Bitable apps accessible to the user",
    inputSchema: {
      type: "object",
      properties: {
        page_size: {
          type: "number",
          description: "Number of apps per page (default: 100, max: 500)",
        },
        page_token: {
          type: "string",
          description: "Token for pagination (from previous response)",
        },
      },
    },
  },

  // ============ TABLE OPERATIONS (4 tools) ============
  {
    name: "bitable_create_table",
    description: "Create a new table in a Bitable app",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_name: {
          type: "string",
          description: "Name for the new table",
        },
        default_view_name: {
          type: "string",
          description: "Name for the default view (optional)",
        },
        fields: {
          type: "array",
          description: "Initial fields configuration (optional)",
          items: {
            type: "object",
            properties: {
              field_name: { type: "string" },
              type: { type: "number" },
            },
          },
        },
      },
      required: ["app_token", "table_name"],
    },
  },
  {
    name: "bitable_list_tables",
    description: "List all tables in a Bitable app",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        page_size: {
          type: "number",
          description: "Number of tables per page",
        },
        page_token: {
          type: "string",
          description: "Token for pagination",
        },
      },
      required: ["app_token"],
    },
  },
  {
    name: "bitable_get_table",
    description: "Get details about a specific table",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
      },
      required: ["app_token", "table_id"],
    },
  },
  {
    name: "bitable_delete_table",
    description: "Delete a table from a Bitable app",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID to delete",
        },
      },
      required: ["app_token", "table_id"],
    },
  },

  // ============ FIELD MANAGEMENT (3 tools) ============
  {
    name: "bitable_list_fields",
    description: "List all fields in a table",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        view_id: {
          type: "string",
          description: "View ID (optional)",
        },
        page_size: {
          type: "number",
          description: "Number of fields per page",
        },
        page_token: {
          type: "string",
          description: "Token for pagination",
        },
      },
      required: ["app_token", "table_id"],
    },
  },
  {
    name: "bitable_create_field",
    description: "Create a new field in a table",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        field_name: {
          type: "string",
          description: "Name for the new field",
        },
        type: {
          type: "number",
          description: "Field type (1=Text, 2=Number, 3=SingleSelect, 4=MultiSelect, 5=DateTime, etc.)",
        },
        property: {
          type: "object",
          description: "Field properties configuration",
        },
      },
      required: ["app_token", "table_id", "field_name", "type"],
    },
  },
  {
    name: "bitable_update_field",
    description: "Update an existing field in a table",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        field_id: {
          type: "string",
          description: "Field ID to update",
        },
        field_name: {
          type: "string",
          description: "New field name (optional)",
        },
        property: {
          type: "object",
          description: "Updated field properties (optional)",
        },
      },
      required: ["app_token", "table_id", "field_id"],
    },
  },

  // ============ RECORD OPERATIONS (5 tools) ============
  {
    name: "bitable_create_record",
    description: "Create a new record in a table",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        fields: {
          type: "object",
          description: "Record fields as key-value pairs",
        },
      },
      required: ["app_token", "table_id", "fields"],
    },
  },
  {
    name: "bitable_batch_create_records",
    description: "Create multiple records at once (up to 500)",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        records: {
          type: "array",
          description: "Array of records to create",
          items: {
            type: "object",
            properties: {
              fields: { type: "object" },
            },
          },
        },
      },
      required: ["app_token", "table_id", "records"],
    },
  },
  {
    name: "bitable_search_records",
    description: "Search/query records in a table with filters and sorting",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        view_id: {
          type: "string",
          description: "View ID (optional)",
        },
        filter: {
          type: "object",
          description: "Filter conditions",
          properties: {
            conjunction: {
              type: "string",
              enum: ["and", "or"],
            },
            conditions: {
              type: "array",
            },
          },
        },
        sort: {
          type: "array",
          description: "Sort configuration",
        },
        field_names: {
          type: "array",
          description: "Specific fields to return",
          items: { type: "string" },
        },
        page_size: {
          type: "number",
          description: "Number of records per page (max: 500)",
        },
        page_token: {
          type: "string",
          description: "Token for pagination",
        },
      },
      required: ["app_token", "table_id"],
    },
  },
  {
    name: "bitable_update_record",
    description: "Update an existing record",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        record_id: {
          type: "string",
          description: "Record ID to update",
        },
        fields: {
          type: "object",
          description: "Fields to update",
        },
      },
      required: ["app_token", "table_id", "record_id", "fields"],
    },
  },
  {
    name: "bitable_batch_update_records",
    description: "Update multiple records at once (up to 500)",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID",
        },
        records: {
          type: "array",
          description: "Array of records to update",
          items: {
            type: "object",
            properties: {
              record_id: { type: "string" },
              fields: { type: "object" },
            },
          },
        },
      },
      required: ["app_token", "table_id", "records"],
    },
  },
];

// Initialize gateway client
const gatewayUrl = "https://larksuite-hype-server.hypelive.workers.dev";
const client = new LarkBitableClient(gatewayUrl);

// Map tool names to gateway endpoints
const toolEndpointMap: Record<string, { endpoint: string; method: string }> = {
  // Apps
  bitable_create_app: { endpoint: "/bitable/apps", method: "POST" },
  bitable_get_app: { endpoint: "/bitable/apps/:app_token", method: "GET" },
  bitable_list_apps: { endpoint: "/bitable/apps", method: "GET" },

  // Tables
  bitable_create_table: { endpoint: "/bitable/:app_token/tables", method: "POST" },
  bitable_list_tables: { endpoint: "/bitable/:app_token/tables", method: "GET" },
  bitable_get_table: { endpoint: "/bitable/:app_token/tables/:table_id", method: "GET" },
  bitable_delete_table: { endpoint: "/bitable/:app_token/tables/:table_id", method: "DELETE" },

  // Fields
  bitable_list_fields: { endpoint: "/bitable/:app_token/:table_id/fields", method: "GET" },
  bitable_create_field: { endpoint: "/bitable/:app_token/:table_id/fields", method: "POST" },
  bitable_update_field: { endpoint: "/bitable/:app_token/:table_id/fields/:field_id", method: "PATCH" },

  // Records
  bitable_create_record: { endpoint: "/bitable/:app_token/:table_id/records", method: "POST" },
  bitable_batch_create_records: { endpoint: "/bitable/:app_token/:table_id/records/batch_create", method: "POST" },
  bitable_search_records: { endpoint: "/bitable/:app_token/:table_id/records/search", method: "POST" },
  bitable_update_record: { endpoint: "/bitable/:app_token/:table_id/records/:record_id", method: "PATCH" },
  bitable_batch_update_records: { endpoint: "/bitable/:app_token/:table_id/records/batch_update", method: "POST" },
};

// Helper to replace path parameters
function buildEndpoint(template: string, params: any): string {
  let endpoint = template;
  const pathParams = ["app_token", "table_id", "field_id", "record_id"];

  for (const param of pathParams) {
    if (params[param]) {
      endpoint = endpoint.replace(`:${param}`, params[param]);
    }
  }

  return endpoint;
}

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name: toolName, arguments: args } = request.params;

  try {
    const toolConfig = toolEndpointMap[toolName];
    if (!toolConfig) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const endpoint = buildEndpoint(toolConfig.endpoint, args || {});
    const method = toolConfig.method;

    // Prepare body (exclude path params)
    const body = { ...args };
    ["app_token", "table_id", "field_id", "record_id"].forEach(
      (param) => delete body[param]
    );

    const result = await client.call(
      endpoint,
      method,
      Object.keys(body).length > 0 ? body : undefined
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server with dual transport support
async function main() {
  const mode = process.env.MCP_TRANSPORT || "stdio";

  if (mode === "http" || mode === "sse") {
    // HTTP/SSE mode for remote streaming
    const port = parseInt(process.env.PORT || "3000", 10);

    const httpServer = http.createServer(async (req, res) => {
      if (req.method === "GET" && req.url === "/health") {
        // Health check endpoint
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "healthy",
          server: "lark-bitable-mcp",
          version: "1.0.0",
          transport: "sse",
          tools: tools.length,
        }));
        return;
      }

      if (req.method === "GET" && req.url === "/sse") {
        // SSE endpoint for MCP streaming
        console.error(`SSE connection from ${req.socket.remoteAddress}`);

        const transport = new SSEServerTransport("/messages", res);
        await server.connect(transport);

        // Handle client disconnect
        req.on("close", () => {
          console.error("SSE client disconnected");
        });

        return;
      }

      if (req.method === "POST" && req.url === "/messages") {
        // POST endpoint for MCP messages
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const message = JSON.parse(body);
            // Handle MCP message through SSE transport
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ received: true }));
          } catch (error: any) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: error.message }));
          }
        });

        return;
      }

      // 404 for other paths
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    httpServer.listen(port, () => {
      console.error(`Lark Bitable MCP server running on http://localhost:${port}`);
      console.error(`SSE endpoint: http://localhost:${port}/sse`);
      console.error(`Health check: http://localhost:${port}/health`);
    });
  } else {
    // stdio mode (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Lark Bitable MCP server running on stdio");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
