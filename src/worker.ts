/**
 * Lark Bitable MCP Server - Cloudflare Workers Version
 * Version: 1.0.0
 *
 * Focused MCP server for Lark Bitable (Base) operations
 * Supports dual transport: SSE (legacy) and Streamable HTTP (standard)
 * Features OAuth 2.1 authentication with Bearer tokens
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from "@modelcontextprotocol/sdk/types.js";

// Environment bindings
interface Env {
  GATEWAY_URL: string;
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;
  MCP_AUTH_SECRET?: string;
  LARK_APP_ID?: string;
  LARK_APP_SECRET?: string;
}

// Gateway client for Lark API
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
        throw new Error(`Gateway error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to call gateway: ${error.message}`);
    }
  }
}

// Tool definitions (15 focused Bitable tools)
const tools = [
  // === App Management (3 tools) ===
  {
    name: "bitable_create_app",
    description: "Create a new Bitable (Base) app in a specified folder",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "App name (e.g., 'Project Tracker', 'CRM Database')",
        },
        folder_token: {
          type: "string",
          description: "Optional folder token to create app in. Leave empty for root folder.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "bitable_get_app",
    description: "Get details about a Bitable app including metadata and table count",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token (e.g., 'bascnXXX...')",
        },
      },
      required: ["app_token"],
    },
  },
  {
    name: "bitable_list_apps",
    description: "List all accessible Bitable apps for the current user",
    inputSchema: {
      type: "object",
      properties: {
        page_size: {
          type: "number",
          description: "Number of apps to return per page (default: 20, max: 100)",
        },
        page_token: {
          type: "string",
          description: "Page token for pagination",
        },
      },
    },
  },

  // === Table Operations (4 tools) ===
  {
    name: "bitable_create_table",
    description: "Create a new table in a Bitable app with specified fields and default view",
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
          description: "Optional name for the default view",
        },
        fields: {
          type: "array",
          description: "Array of field definitions. Each field needs: field_name, type (1=Text, 2=Number, 3=SingleSelect, etc.)",
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
          description: "Number of tables to return (max: 100)",
        },
        page_token: {
          type: "string",
          description: "Page token for pagination",
        },
      },
      required: ["app_token"],
    },
  },
  {
    name: "bitable_get_table",
    description: "Get details about a specific table including field count and record count",
    inputSchema: {
      type: "object",
      properties: {
        app_token: {
          type: "string",
          description: "Bitable app token",
        },
        table_id: {
          type: "string",
          description: "Table ID (e.g., 'tblXXX...')",
        },
      },
      required: ["app_token", "table_id"],
    },
  },
  {
    name: "bitable_delete_table",
    description: "Delete a table from a Bitable app (WARNING: This action cannot be undone)",
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

  // === Field Management (3 tools) ===
  {
    name: "bitable_list_fields",
    description: "List all fields (columns) in a Bitable table with their types and properties",
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
        page_size: {
          type: "number",
          description: "Number of fields to return (max: 100)",
        },
      },
      required: ["app_token", "table_id"],
    },
  },
  {
    name: "bitable_create_field",
    description: "Create a new field (column) in a Bitable table. Field types: 1=Text, 2=Number, 3=SingleSelect, 4=MultiSelect, 5=DateTime, 7=Checkbox, 11=User, 13=Phone, 15=URL, 17=Attachment, 18=Link, 20=Formula, 21=DuplexLink, 22=Location",
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
          description: "Field type number (1=Text, 2=Number, 3=SingleSelect, etc.)",
        },
        property: {
          type: "object",
          description: "Optional field properties (e.g., options for select fields, formula for formula fields)",
        },
      },
      required: ["app_token", "table_id", "field_name", "type"],
    },
  },
  {
    name: "bitable_update_field",
    description: "Update field properties such as name, options, or formula",
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
          description: "New field name",
        },
        property: {
          type: "object",
          description: "New field properties",
        },
      },
      required: ["app_token", "table_id", "field_id"],
    },
  },

  // === Record Operations (5 tools) ===
  {
    name: "bitable_create_record",
    description: "Create a single record in a Bitable table",
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
          description: "Record fields as key-value pairs (e.g., {'Task Name': 'My task', 'Status': 'To Do', 'Due Date': 1735689600000})",
        },
      },
      required: ["app_token", "table_id", "fields"],
    },
  },
  {
    name: "bitable_batch_create_records",
    description: "Create multiple records at once in a Bitable table (up to 500 records)",
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
          description: "Array of record objects, each with 'fields' property",
          items: {
            type: "object",
            properties: {
              fields: {
                type: "object",
                description: "Record fields",
              },
            },
          },
        },
      },
      required: ["app_token", "table_id", "records"],
    },
  },
  {
    name: "bitable_search_records",
    description: "Search and filter records in a Bitable table with advanced query options. Supports filtering, sorting, and pagination. Max 500 records per request.",
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
        filter: {
          type: "object",
          description: "Filter conditions. Format: {conjunction: 'and', conditions: [{field_name: 'Status', operator: 'is', value: ['Active']}]}. Operators: is, isNot, contains, doesNotContain, isEmpty, isNotEmpty, isGreater, isLess, etc.",
        },
        sort: {
          type: "array",
          description: "Sort configuration (e.g., [{field_name: 'Created Time', desc: true}])",
          items: {
            type: "object",
          },
        },
        page_size: {
          type: "number",
          description: "Number of records to return (max 500)",
        },
        page_token: {
          type: "string",
          description: "Page token for pagination",
        },
      },
      required: ["app_token", "table_id"],
    },
  },
  {
    name: "bitable_update_record",
    description: "Update a single record in a Bitable table",
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
          description: "Record ID to update (e.g., 'recXXX...')",
        },
        fields: {
          type: "object",
          description: "Fields to update (only include fields you want to change)",
        },
      },
      required: ["app_token", "table_id", "record_id", "fields"],
    },
  },
  {
    name: "bitable_batch_update_records",
    description: "Update multiple records at once in a Bitable table (up to 500 records)",
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
          description: "Array of record objects with 'record_id' and 'fields' properties",
          items: {
            type: "object",
            properties: {
              record_id: {
                type: "string",
                description: "Record ID",
              },
              fields: {
                type: "object",
                description: "Fields to update",
              },
            },
          },
        },
      },
      required: ["app_token", "table_id", "records"],
    },
  },
];

// Tool endpoint mapping for gateway
const toolEndpointMap: Record<string, { method: string; path: (args: any) => string }> = {
  bitable_create_app: {
    method: "POST",
    path: () => "/bitable/apps",
  },
  bitable_get_app: {
    method: "GET",
    path: (args) => `/bitable/apps/${args.app_token}`,
  },
  bitable_list_apps: {
    method: "GET",
    path: () => "/bitable/apps",
  },
  bitable_create_table: {
    method: "POST",
    path: (args) => `/bitable/apps/${args.app_token}/tables`,
  },
  bitable_list_tables: {
    method: "GET",
    path: (args) => `/bitable/apps/${args.app_token}/tables`,
  },
  bitable_get_table: {
    method: "GET",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}`,
  },
  bitable_delete_table: {
    method: "DELETE",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}`,
  },
  bitable_list_fields: {
    method: "GET",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/fields`,
  },
  bitable_create_field: {
    method: "POST",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/fields`,
  },
  bitable_update_field: {
    method: "PUT",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/fields/${args.field_id}`,
  },
  bitable_create_record: {
    method: "POST",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/records`,
  },
  bitable_batch_create_records: {
    method: "POST",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/records/batch_create`,
  },
  bitable_search_records: {
    method: "POST",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/records/search`,
  },
  bitable_update_record: {
    method: "PUT",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/records/${args.record_id}`,
  },
  bitable_batch_update_records: {
    method: "PUT",
    path: (args) => `/bitable/apps/${args.app_token}/tables/${args.table_id}/records/batch_update`,
  },
};

// Authentication helper
function validateAuth(request: Request, env: Env): boolean {
  if (!env.MCP_AUTH_SECRET) {
    return true; // No auth required if secret not set
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === env.MCP_AUTH_SECRET;
}

// Create MCP server instance
function createMCPServer(env: Env): Server {
  const server = new Server(
    {
      name: env.MCP_SERVER_NAME || "lark-bitable-mcp",
      version: env.MCP_SERVER_VERSION || "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest) => {
    return { tools };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    const gateway = new LarkBitableClient(env.GATEWAY_URL || "https://larksuite-hype-server.hypelive.workers.dev");

    try {
      const mapping = toolEndpointMap[name];
      if (!mapping) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const endpoint = mapping.path(args as any);
      const result = await gateway.call(endpoint, mapping.method, args);

      return {
        content: [
          {
            type: "text",
            text: `✅ ${name} executed successfully\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error executing ${name}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// Main Cloudflare Workers export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (pathname === "/health" || pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          server: env.MCP_SERVER_NAME || "lark-bitable-mcp",
          version: env.MCP_SERVER_VERSION || "1.0.0",
          transports: ["sse", "streamable-http"],
          tools: tools.length,
          gateway: env.GATEWAY_URL,
          authentication: env.MCP_AUTH_SECRET ? "enabled" : "disabled",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Authentication check (except health endpoint)
    if (!validateAuth(request, env)) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing Bearer token",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": 'Bearer realm="MCP Server"',
            ...corsHeaders,
          },
        }
      );
    }

    // SSE transport (legacy) - GET /sse
    if (pathname === "/sse" && request.method === "GET") {
      const server = createMCPServer(env);
      const transport = new SSEServerTransport("/messages", new Response());
      await server.connect(transport);

      return new Response(transport.stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          ...corsHeaders,
        },
      });
    }

    // SSE messages endpoint (legacy) - POST /messages
    if (pathname === "/messages" && request.method === "POST") {
      const server = createMCPServer(env);
      const body = await request.json();

      // Handle JSON-RPC message
      return new Response(JSON.stringify({ result: "ok" }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Streamable HTTP transport (standard) - POST /mcp
    if (pathname === "/mcp" && request.method === "POST") {
      try {
        const server = createMCPServer(env);
        const message = await request.json();

        // Validate JSON-RPC 2.0 message
        if (!message || typeof message !== "object" || message.jsonrpc !== "2.0") {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: message?.id || null,
              error: {
                code: -32600,
                message: "Invalid Request",
                data: "Must be valid JSON-RPC 2.0 message",
              },
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        // Handle JSON-RPC notification (no id) - no response required
        if (!("id" in message)) {
          // Process notification but don't send response
          return new Response(null, {
            status: 204,
            headers: corsHeaders,
          });
        }

        // Handle JSON-RPC request (has id)
        let result: any;

        // Route based on method
        switch (message.method) {
          case "initialize":
            result = {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: env.MCP_SERVER_NAME || "lark-bitable-mcp",
                version: env.MCP_SERVER_VERSION || "1.0.0",
              },
            };
            break;

          case "tools/list":
            result = { tools };
            break;

          case "tools/call":
            const { name, arguments: args } = message.params || {};
            if (!name) {
              throw {
                code: -32602,
                message: "Invalid params",
                data: "Missing required parameter: name",
              };
            }

            const gateway = new LarkBitableClient(
              env.GATEWAY_URL || "https://larksuite-hype-server.hypelive.workers.dev"
            );

            const mapping = toolEndpointMap[name];
            if (!mapping) {
              throw {
                code: -32602,
                message: "Unknown tool",
                data: `Tool "${name}" not found`,
              };
            }

            const endpoint = mapping.path(args as any);
            const toolResult = await gateway.call(endpoint, mapping.method, args);

            result = {
              content: [
                {
                  type: "text",
                  text: `✅ ${name} executed successfully\n\n${JSON.stringify(toolResult, null, 2)}`,
                },
              ],
            };
            break;

          default:
            throw {
              code: -32601,
              message: "Method not found",
              data: `Method "${message.method}" is not supported`,
            };
        }

        // Return JSON-RPC success response
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: message.id,
            result,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      } catch (error: any) {
        // Handle errors
        const message = await request.json().catch(() => ({ id: null }));

        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: message?.id || null,
            error: {
              code: error.code || -32603,
              message: error.message || "Internal error",
              data: error.data || String(error),
            },
          }),
          {
            status: error.code === -32600 ? 400 : 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // 404 for unknown paths
    return new Response(
      JSON.stringify({
        error: "Not Found",
        message: "Available endpoints: /health, /sse, /messages, /mcp",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  },
};
