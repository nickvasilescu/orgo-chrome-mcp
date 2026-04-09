import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerTabTools(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_tabs",
    "List all open Chrome tabs in the Orgo VM. Returns tab IDs, titles, and URLs.",
    {},
    async () => {
      const result = await bridge.call("/tabs");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "orgo_chrome_new_tab",
    "Open a new tab in Chrome. Optionally provide a URL to navigate to.",
    { url: z.string().optional().describe("URL to open in the new tab (default: about:blank)") },
    async (args) => {
      const result = await bridge.call("/new_tab", { url: args.url });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "orgo_chrome_switch_tab",
    "Switch to a different Chrome tab by its target ID (from orgo_chrome_tabs).",
    { targetId: z.string().describe("Target ID of the tab to switch to") },
    async ({ targetId }) => {
      const result = await bridge.call("/switch_tab", { targetId });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}
