import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerNetworkRequestsTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_network",
    "Read HTTP network requests (XHR, Fetch, documents, etc.) from Chrome. Requests are buffered since the bridge started. Use urlPattern to filter by URL substring.",
    {
      urlPattern: z.string().optional().describe("URL substring to filter requests (e.g., '/api/', 'example.com')"),
      limit: z.number().optional().describe("Max requests to return (default: 100)"),
      clear: z.boolean().optional().describe("Clear the buffer after reading (default: false)"),
    },
    async (args) => {
      const result = await bridge.call("/network", args) as { requests: unknown[] };
      if (!result.requests || result.requests.length === 0) {
        return { content: [{ type: "text", text: "No network requests captured." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(result.requests, null, 2) }] };
    }
  );
}
