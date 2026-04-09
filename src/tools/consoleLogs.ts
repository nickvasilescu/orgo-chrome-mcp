import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerConsoleLogsTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_console",
    'Read browser console messages (console.log, console.error, etc.) from Chrome. Messages are buffered since the bridge started. Use pattern to filter by regex. Use onlyErrors: true to see only errors.',
    {
      pattern: z.string().optional().describe("Regex pattern to filter messages (e.g., 'error|warning', 'MyApp')"),
      onlyErrors: z.boolean().optional().describe("Only return error/exception messages (default: false)"),
      limit: z.number().optional().describe("Max messages to return (default: 100)"),
      clear: z.boolean().optional().describe("Clear the buffer after reading (default: false)"),
    },
    async (args) => {
      const result = await bridge.call("/console", args) as { messages: unknown[] };
      if (!result.messages || result.messages.length === 0) {
        return { content: [{ type: "text", text: "No console messages found." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(result.messages, null, 2) }] };
    }
  );
}
