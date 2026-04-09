import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerJavaScriptTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_evaluate",
    "Execute JavaScript in the Chrome page context. Returns the result of the last expression. Do NOT use 'return' — just write the expression to evaluate.",
    {
      expression: z.string().describe("JavaScript to execute in the page context"),
      awaitPromise: z.boolean().optional().describe("Await the result if it's a Promise (default: false)"),
    },
    async (args) => {
      const result = await bridge.call("/evaluate", args);
      const data = result as { result?: unknown; error?: string };
      if (data.error) {
        return { content: [{ type: "text", text: `Error: ${data.error}` }] };
      }
      const value = typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2);
      return { content: [{ type: "text", text: value }] };
    }
  );
}
