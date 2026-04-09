import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerNavigateTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_navigate",
    "Navigate to a URL in Chrome, or go back/forward in history. Provide a URL, or 'back'/'forward' for history navigation.",
    { url: z.string().describe("URL to navigate to, or 'back'/'forward' for history") },
    async ({ url }) => {
      const result = await bridge.call("/navigate", { url });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
