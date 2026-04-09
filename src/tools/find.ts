import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerFindTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_find",
    'Find elements on the page by text content or purpose (e.g., "search bar", "login button", "product title containing organic"). Returns up to 20 matches with refs usable by click/form_input.',
    { query: z.string().describe("What to find (e.g., 'search bar', 'login button', 'submit')") },
    async ({ query }) => {
      const result = await bridge.call("/find", { query }) as { elements: unknown[] };
      if (!result.elements || result.elements.length === 0) {
        return { content: [{ type: "text", text: `No elements found matching "${query}"` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(result.elements, null, 2) }] };
    }
  );
}
